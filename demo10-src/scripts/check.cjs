// Проверка телефонов и компьютера: node scripts/check.cjs <slug>
// Ширины 320–430 и 768–1440, шрифт ×1 и ×1.3 (крупный шрифт Android), ничего не шире экрана, нет ошибок в консоли.
const { createServer } = require('node:http')
const { createReadStream, existsSync, statSync } = require('node:fs')
const { extname, join, resolve } = require('node:path')
const { chromium } = require('playwright')

const slug = process.argv[2]
const dir = resolve(__dirname, '..', 'dist', slug)
const BASE = `/${slug}/`
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' }

const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  if (!path.startsWith(BASE)) return res.writeHead(404).end()
  let file = join(dir, path.slice(BASE.length))
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html')
  if (!existsSync(file)) return res.writeHead(404).end()
  res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' })
  createReadStream(file).pipe(res)
})

server.listen(0, '127.0.0.1', async () => {
  const url = `http://127.0.0.1:${server.address().port}${BASE}`
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
  let bad = 0
  for (const w of [320, 360, 390, 412, 430, 768, 1024, 1440]) for (const scale of [1, 1.3]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, isMobile: w < 760, hasTouch: w < 760, reducedMotion: 'reduce' })
    const page = await ctx.newPage()
    const errs = []
    page.on('pageerror', e => errs.push(e.message))
    page.on('console', m => m.type() === 'error' && !/Failed to load resource|WebGL|GPU stall|swiftshader/i.test(m.text()) && errs.push(m.text().slice(0, 160)))
    await page.route(/yandex|2gis/, r => r.fulfill({ contentType: 'text/html', body: 'map' }))
    await page.goto(url, { waitUntil: 'load' })
    await page.waitForTimeout(500)
    await page.evaluate(() => document.querySelectorAll('details').forEach(d => { d.open = true }))
    if (scale !== 1) await page.evaluate(k => {
      const els = [...document.querySelectorAll('body *')]
      const sizes = els.map(e => parseFloat(getComputedStyle(e).fontSize))
      els.forEach((e, i) => { e.style.fontSize = sizes[i] * k + 'px' })
    }, scale)
    await page.waitForTimeout(150)
    const res = await page.evaluate(() => {
      const W = innerWidth, over = []
      for (const e of document.querySelectorAll('body *')) {
        const r = e.getBoundingClientRect()
        // Внутренности SVG не считаем: видна только область самого svg, её и проверяем.
        if (!r.width || e.ownerSVGElement || getComputedStyle(e).position === 'fixed' || e.closest('canvas, iframe, dialog, .viewer, .room-strip, .gallery-strip')) continue
        if (r.right > W + 1 || r.left < -1) over.push(`${e.tagName.toLowerCase()}.${e.className}`.slice(0, 50) + ` ${Math.round(r.left)}..${Math.round(r.right)}`)
      }
      return { sw: document.documentElement.scrollWidth, W, over: over.slice(0, 5) }
    })
    // Сценарий кузовного: выбрать деталь списком и вид повреждения, проверить текст в ссылке.
    let flow = ''
    if (await page.locator('.parts-group button').count()) {
      await page.locator('.parts-group button').first().click()
      await page.locator('.kinds button').nth(2).click()
      const href = await page.locator('.send a').first().getAttribute('href')
      const msg = decodeURIComponent((href.split('text=')[1] || ''))
      if (!/Что повреждено: передний бампер/.test(msg) || !/вмятина/.test(msg)) flow = 'текст заявки: ' + msg.slice(0, 120)
      if (/[—!]/.test(msg)) flow += ' в заявке тире или восклицание'
    }
    const ok = res.sw <= res.W && !res.over.length && !errs.length && !flow
    if (!ok) bad++
    console.log(`${ok ? 'OK ' : 'BAD'} ${w}px ×${scale}`, res.sw > res.W ? `scrollWidth ${res.sw}` : '', res.over.join(' | '), errs.join(' | '), flow)
    await ctx.close()
  }
  await browser.close()
  server.close()
  process.exit(bad ? 1 : 0)
})
