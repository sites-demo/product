// Рендерит постер 3D-дома (заглушка, пока сцена грузится): public/img/house.webp. И og.jpg из фото фасада.
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { launch3D, serve } from './lib.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const site = await serve(join(root, 'dist'))
const browser = await launch3D()
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1050 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()
await page.route(/open-meteo|yandex/, (r) => r.abort())
await page.goto(site.url + '?3d=1', { waitUntil: 'load' })
await page.addStyleTag({
  content: `.stage{position:fixed!important;inset:0!important;z-index:999;border-radius:0!important;aspect-ratio:auto!important;width:100vw!important;height:100vh!important;margin:0!important}.stage-ui,.stage-loading,.poster,.stage-labels{display:none!important}.bbar{display:none!important}`,
})
await page.locator('#dom').scrollIntoViewIfNeeded()
await page.waitForSelector('.stage.ready', { timeout: 120000 })
await page.waitForTimeout(5000)
const png = await page.screenshot()
await sharp(png).webp({ quality: 78 }).toFile(join(root, 'public/img/house.webp'))
await sharp(join(root, 'public/img/p/06.webp')).resize(1200, 630, { fit: 'cover', position: 'centre' }).jpeg({ quality: 84 }).toFile(join(root, 'public/img/og.jpg'))
await browser.close()
site.close()
console.log('ok')
