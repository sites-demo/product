// Скриншоты для разбора: node scripts/shots.mjs [имя] [view=outside|0|1] [room]
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { launch3D, serve } from './lib.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const tag = process.argv[2] || 'v'
const out = join(root, 'shots', tag)
mkdirSync(out, { recursive: true })
const site = await serve(join(root, 'dist'))
const browser = await launch3D()

for (const [w, h, mobile] of [
  [390, 844, true],
  [1440, 900, false],
]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, reducedMotion: process.env.MOTION ? 'no-preference' : 'reduce' })
  const page = await ctx.newPage()
  const errs = []
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
  page.on('pageerror', (e) => errs.push('pageerror ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 6).join(' | ')))
  await page.route(/open-meteo/, (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ current: { temperature_2m: -34.4 } }) }))
  await page.route(/yandex\.ru/, (r) => r.fulfill({ contentType: 'text/html; charset=utf-8', body: '<body style="margin:0;background:#dfe6ec;font:16px sans-serif;display:grid;place-items:center;height:100vh">Яндекс Карта</body>' }))
  await page.goto(site.url + '?3d=1', { waitUntil: 'load' })
  await page.waitForTimeout(600)
  await page.screenshot({ path: join(out, `${w}-0-first.png`) })
  await page.screenshot({ path: join(out, `${w}-full.png`), fullPage: true })
  await page.locator('#dom').scrollIntoViewIfNeeded()
  await page.waitForSelector('.stage.ready', { timeout: 120000 })
  await page.waitForTimeout(2500)
  await page.locator('.stage').screenshot({ path: join(out, `${w}-1-outside.png`) })
  await page.locator('.seg button').nth(1).click()
  await page.waitForTimeout(3500)
  await page.locator('.stage').screenshot({ path: join(out, `${w}-2-floor1.png`) })
  await page.locator('.zchip').nth(0).click()
  await page.waitForTimeout(3000)
  await page.locator('.rooms').screenshot({ path: join(out, `${w}-3-hall.png`) })
  await page.locator('.zchip').nth(5).click()
  await page.waitForTimeout(3500)
  await page.locator('.stage').screenshot({ path: join(out, `${w}-4-floor2.png`) })
  await page.locator('.zchip').nth(9).click()
  await page.waitForTimeout(3500)
  await page.locator('.rooms').screenshot({ path: join(out, `${w}-5-grill.png`) })
  console.log(w, 'errors:', errs.slice(0, 5))
  await ctx.close()
}
await browser.close()
site.close()
console.log(out)
