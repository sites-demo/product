// Постер 3D-кузова (показывается, пока грузится сцена, и там, где 3D нет) и картинка для соцсетей.
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { launch3D, serve } from './lib.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const site = await serve(join(root, 'dist'))
const browser = await launch3D()
const page = await browser.newPage({ viewport: { width: 1400, height: 910 }, deviceScaleFactor: 1, reducedMotion: 'reduce' })
await page.route(/yandex\.ru/, (r) => r.abort())
await page.goto(site.url + '?3d=1', { waitUntil: 'load' })
await page.addStyleTag({ content: `.stage{position:fixed!important;inset:0!important;z-index:999;aspect-ratio:auto!important;width:100vw!important;height:100vh!important;margin:0!important;background:#F2F0E9}.stage .poster,.bbar{display:none!important}` })
await page.waitForSelector('.stage.ready', { timeout: 120000 })
await page.waitForTimeout(2500)
const png = await page.screenshot()
await sharp(png).webp({ quality: 80 }).toFile(join(root, 'public/img/truck.webp'))
// Картинка для соцсетей: фургон на фоне, слева название.
const truck = await sharp(await sharp(png).trim({ background: '#F2F0E9', threshold: 12 }).toBuffer()).resize({ width: 640 }).toBuffer()
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#F2F0E9"/>
<text x="64" y="262" font-family="Geologica, Golos Text, sans-serif" font-weight="600" font-size="50" fill="#141B17" letter-spacing="-2">Примерную цену</text>
<text x="64" y="322" font-family="Geologica, Golos Text, sans-serif" font-weight="600" font-size="50" fill="#141B17" letter-spacing="-2">назовём заранее</text>
<text x="64" y="378" font-family="Golos Text, sans-serif" font-size="26" fill="#5B635D">Moving town, Нижний Новгород</text></svg>`
await sharp(Buffer.from(svg)).composite([{ input: truck, left: 520, top: 150 }]).jpeg({ quality: 85 }).toFile(join(root, 'public/img/og.jpg'))
await browser.close()
site.close()
console.log('ok')
