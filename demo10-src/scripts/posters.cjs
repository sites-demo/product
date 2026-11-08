// Снимки 3D-сцен для заглушек и картинка для ссылок: node scripts/posters.cjs <slug>
// Сначала собрать сайт (dist/<slug>). Снимки ложатся в src/sites/<slug>/public/posters и og.jpg, потом собрать ещё раз.
const { createServer } = require('node:http')
const { createReadStream, existsSync, statSync, mkdirSync, writeFileSync } = require('node:fs')
const { extname, join, resolve } = require('node:path')
const { execFileSync } = require('node:child_process')
const { chromium } = require('playwright')

const slug = process.argv[2]
const root = resolve(__dirname, '..')
const dir = join(root, 'dist', slug)
const out = join(root, 'src', 'sites', slug, 'public')
const BASE = `/${slug}/`
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' }
const SCENES = [['align', '.align-stage .stage-canvas'], ['car', '.est .stage:not(.align-stage) .stage-canvas'], ['headlight', '.hl-hero .hl-canvas'], ['studio', '.dstudio-canvas'], ['kitchen', '.cfg-canvas']]
const HIDE = '.stage-hint,.stage-tools,.hl-toggle,.stage-wait,.poster,.mbar{visibility:hidden!important} *{transition:none!important}'

const toWebp = (png, file, q = 80) => {
  const tmp = file + '.png'
  writeFileSync(tmp, png)
  execFileSync('python3', ['-I', '-c', 'import sys;from PIL import Image;im=Image.open(sys.argv[1]).convert("RGB");im.save(sys.argv[2],quality=int(sys.argv[3]),method=6);import os;os.remove(sys.argv[1])', tmp, file, String(q)])
}

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
  mkdirSync(join(out, 'posters'), { recursive: true })
  const found = new Set()
  for (const v of [{ suffix: '', width: 1440, height: 900, scale: 1.5, mobile: false }, { suffix: '-m', width: 390, height: 844, scale: 2, mobile: true }]) {
    const ctx = await browser.newContext({ viewport: { width: v.width, height: v.height }, deviceScaleFactor: v.scale, isMobile: v.mobile, hasTouch: v.mobile, reducedMotion: 'reduce' })
    const page = await ctx.newPage()
    await page.route(/yandex|2gis/, r => r.fulfill({ contentType: 'text/html', body: '' }))
    await page.goto(url, { waitUntil: 'load' })
    await page.addStyleTag({ content: HIDE })
    for (const [name, sel] of SCENES) {
      const el = await page.$(sel)
      if (!el) continue
      await el.scrollIntoViewIfNeeded()
      try { await page.waitForSelector(sel + '.ready', { timeout: 60000 }) } catch { console.log(`${name}: сцена не загрузилась`); continue }
      await page.waitForTimeout(2500)
      toWebp(await el.screenshot(), join(out, 'posters', `${name}${v.suffix}.webp`))
      found.add(name)
      console.log(`${name}${v.suffix}.webp`)
    }
    await ctx.close()
  }
  // Картинка для превью ссылки в мессенджерах: верх страницы 1200×630.
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.route(/yandex|2gis/, r => r.fulfill({ contentType: 'text/html', body: '' }))
  await page.goto(url, { waitUntil: 'load' })
  await page.addStyleTag({ content: HIDE })
  await page.waitForTimeout(6000)
  await page.screenshot({ path: join(out, 'og.jpg'), type: 'jpeg', quality: 82 })
  console.log('og.jpg')
  await browser.close()
  server.close()
  console.log(`Сцены со снимками: ${[...found].join(', ') || 'нет'}. Впишите их в posters у сайта.`)
})
