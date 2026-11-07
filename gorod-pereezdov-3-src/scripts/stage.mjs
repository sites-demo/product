// Крупные кадры 3D-кузова: node scripts/stage.mjs <папка>
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { launch3D, serve } from './lib.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'shots', process.argv[2] || 'stage')
mkdirSync(out, { recursive: true })
const site = await serve(join(root, 'dist'))
const browser = await launch3D()
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.log('pageerror', e.message))
  await page.route(/yandex\.ru/, (r) => r.abort())
  await page.goto(site.url + '?3d=1', { waitUntil: 'load' })
  await page.waitForSelector('.stage.ready', { timeout: 120000 })
  const tabs = page.locator('.pk-tabs button')
  for (let i = 0; i < 5; i++) {
    await tabs.nth(i).click()
    await page.waitForTimeout(1500)
    await page.locator('.packer').screenshot({ path: join(out, `${w}-tab${i + 1}.png`) })
  }
  await ctx.close()
}
await browser.close()
site.close()
