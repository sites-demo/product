// Проверка телефонов: ширины 320–430 и крупный шрифт Android (×1.3), ничего не шире экрана, ошибок в консоли нет.
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { launchChromium, serve } from './lib.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const site = await serve(join(root, 'dist'))
const browser = await launchChromium()
let bad = 0
for (const w of [320, 360, 390, 412, 430, 768, 1024, 1440]) {
  for (const scale of [1, 1.3]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, isMobile: w < 760, hasTouch: w < 760 })
    const page = await ctx.newPage()
    const errs = []
    page.on('pageerror', (e) => errs.push(e.message))
    page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errs.push(m.text()))
    await page.route(/yandex/, (r) => r.fulfill({ contentType: 'text/html', body: 'map' }))
    await page.goto(site.url + '?no3d', { waitUntil: 'load' })
    await page.waitForTimeout(300)
    // Открываем «Свой список», чтобы проверить и кнопки с вещами.
    await page.locator('.pk-tabs button').last().click()
    // Раскрываем все аккордеоны и карточки, чтобы проверить и их содержимое.
    await page.evaluate(() => document.querySelectorAll('.qa-a').forEach((e) => e.removeAttribute('hidden')))
    if (scale !== 1)
      await page.evaluate((k) => {
        const els = [...document.querySelectorAll('body *')]
        const sizes = els.map((e) => parseFloat(getComputedStyle(e).fontSize))
        els.forEach((e, i) => (e.style.fontSize = sizes[i] * k + 'px'))
      }, scale)
    await page.waitForTimeout(200)
    const res = await page.evaluate(() => {
      const W = innerWidth
      const over = []
      for (const e of document.querySelectorAll('body *')) {
        const r = e.getBoundingClientRect()
        if (!r.width || getComputedStyle(e).position === 'fixed') continue
        if (e.closest('.pk-tabs, .stage canvas')) continue
        if (r.right > W + 1 || r.left < -1) over.push(`${e.tagName.toLowerCase()}.${e.className}`.slice(0, 60) + ` ${Math.round(r.left)}..${Math.round(r.right)}`)
      }
      return { sw: document.documentElement.scrollWidth, W, over: over.slice(0, 6) }
    })
    const ok = res.sw <= res.W && !res.over.length && !errs.length
    if (!ok) bad++
    console.log(`${ok ? 'OK ' : 'BAD'} ${w}px ×${scale} scrollWidth=${res.sw}`, res.over.length ? res.over : '', errs.length ? errs : '')
    await ctx.close()
  }
}
await browser.close()
site.close()
process.exit(bad ? 1 : 0)
