// Проверка телефонов: ширины 320–430 и крупный шрифт Android (×1.3), ничего не шире экрана,
// все шаги расчёта открываются, ошибок в консоли и гидрации нет.
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { launchChromium, serve } from './lib.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const site = await serve(join(root, 'dist'))
const browser = await launchChromium()
let bad = 0

async function overflow(page) {
  return page.evaluate(() => {
    const W = innerWidth
    const over = []
    for (const e of document.querySelectorAll('body *')) {
      const r = e.getBoundingClientRect()
      if (!r.width || getComputedStyle(e).position === 'fixed') continue
      if (e.closest('canvas, iframe')) continue
      if (r.right > W + 1 || r.left < -1) over.push(`${e.tagName.toLowerCase()}.${e.className}`.slice(0, 60) + ` ${Math.round(r.left)}..${Math.round(r.right)}`)
    }
    return { sw: document.documentElement.scrollWidth, W, over: over.slice(0, 6) }
  })
}

for (const w of [320, 360, 390, 412, 430, 768, 1024, 1440]) {
  for (const scale of [1, 1.3]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, isMobile: w < 760, hasTouch: w < 760 })
    const page = await ctx.newPage()
    const errs = []
    page.on('pageerror', e => errs.push(e.message))
    page.on('console', m => m.type() === 'error' && !/Failed to load resource|WebGL|GPU stall/.test(m.text()) && errs.push(m.text().slice(0, 160)))
    await page.route(/yandex/, r => r.fulfill({ contentType: 'text/html', body: 'map' }))
    await page.goto(site.url, { waitUntil: 'load' })
    await page.waitForTimeout(400)
    await page.evaluate(() => document.querySelectorAll('details').forEach(d => { d.open = true }))
    if (scale !== 1)
      await page.evaluate(k => {
        const els = [...document.querySelectorAll('body *')]
        const sizes = els.map(e => parseFloat(getComputedStyle(e).fontSize))
        els.forEach((e, i) => { e.style.fontSize = sizes[i] * k + 'px' })
      }, scale)
    const found = []
    // Проходим все шаги расчёта и смотрим каждый.
    for (let step = 0; step < 6; step++) {
      await page.waitForTimeout(120)
      const res = await overflow(page)
      if (res.sw > res.W || res.over.length) found.push(`шаг ${step + 1}: ${res.sw} ${res.over.join(' | ')}`)
      if (step < 5) await page.locator('.form-nav button[type=submit]').click()
    }
    await page.locator('.contact-fields input[type=tel]').fill('+7 900 123-45-67')
    await page.locator('.form-nav button[type=submit]').click()
    await page.waitForTimeout(150)
    const handoff = await page.locator('.handoff textarea').inputValue()
    if (!handoff.startsWith('Здравствуйте. Хочу рассчитать переезд.')) found.push('нет текста заявки')
    const res = await overflow(page)
    if (res.sw > res.W || res.over.length) found.push(`заявка: ${res.sw} ${res.over.join(' | ')}`)
    const ok = !found.length && !errs.length
    if (!ok) bad++
    console.log(`${ok ? 'OK ' : 'BAD'} ${w}px ×${scale}`, found.length ? found : '', errs.length ? errs : '')
    await ctx.close()
  }
}
await browser.close()
site.close()
process.exit(bad ? 1 : 0)
