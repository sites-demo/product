// Скриншоты для разбора: первый экран и все секции на 375 и 1440.
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { launch3D, serve } from './lib.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'shots/court')
mkdirSync(out, { recursive: true })
const site = await serve(join(root, 'dist'))
const browser = await launch3D()

for (const [w, h, dsf, mobile] of [
  [375, 812, 2, true],
  [1440, 900, 1, false],
]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf, isMobile: mobile, hasTouch: mobile })
  const page = await ctx.newPage()
  await page.goto(site.url + '?3d=1', { waitUntil: 'load' })
  await page.waitForSelector('.stage.ready', { timeout: 180000 })
  await page.locator('.stage').scrollIntoViewIfNeeded()
  await page.waitForSelector('.stage.settled', { timeout: 180000 })
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
  await page.waitForTimeout(500)
  await page.screenshot({ path: join(out, `${w}-1-first-screen.png`) })
  await page.locator('.hero').screenshot({ path: join(out, `${w}-2-hero-full.png`) })

  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * 0.7) {
      scrollTo({ top: y, behavior: 'instant' })
      await new Promise((r) => setTimeout(r, 90))
    }
    scrollTo({ top: 0, behavior: 'instant' })
  })
  await page.locator('.row', { hasText: 'Замена труб' }).locator('.row-h').click()
  await page.waitForTimeout(450)
  for (const [name, sel] of [
    ['3-prices', '.prices'],
    ['4-works', '.works'],
    ['5-how', '.how'],
    ['6-reviews', '.reviews'],
    ['7-final-footer', '.final'],
  ]) {
    await page.locator(sel).screenshot({ path: join(out, `${w}-${name}.png`) })
  }
  await page.locator('.gal button').nth(2).click()
  await page.waitForTimeout(400)
  await page.screenshot({ path: join(out, `${w}-8-lightbox.png`) })
  await ctx.close()
}
await browser.close()
site.close()
console.log(out)
