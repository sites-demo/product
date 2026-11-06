// Снимает живую 3D-сцену из dist и пересобирает public/img/node.webp и public/img/og.jpg.
// После него нужен ещё один npm run build, чтобы новые картинки попали в dist.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { launch3D, serve } from './lib.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const img = join(root, 'public/img')
const out = join(root, 'shots')
mkdirSync(out, { recursive: true })

const site = await serve(join(root, 'dist'))
const browser = await launch3D()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.75 })
const page = await ctx.newPage()
await page.goto(site.url + '?3d=1', { waitUntil: 'load' })
await page.waitForSelector('.stage.settled', { timeout: 180000 })
await page.waitForTimeout(700)

const anchors = await page.evaluate(() =>
  Object.fromEntries([...document.querySelectorAll('[data-part]')].map((e) => [e.dataset.part, [e.style.getPropertyValue('--x'), e.style.getPropertyValue('--y')]])),
)
writeFileSync(join(root, 'src/anchors.json'), JSON.stringify(anchors) + '\n')
console.log('Точки на постере:', JSON.stringify(anchors))

await page.addStyleTag({ content: '.hots,.node-bar{display:none!important}' })
await page.addStyleTag({ content: 'html,body,.hero,.stage{background:transparent!important}.poster{display:none!important}' })
const modelPng = await page.locator('.stage').screenshot({ omitBackground: true })
// Постер с прозрачным фоном: цвет страницы показывается сквозь него, шва не будет.
await sharp(modelPng).resize(1200, 900, { fit: 'cover' }).webp({ quality: 86, alphaQuality: 80, effort: 6 }).toFile(join(img, 'node.webp'))

const fontUrl = (name) => `${site.url}fonts/${name}.woff2`
const ogHtml = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>
@font-face{font-family:'Geologica';font-weight:300 800;src:url(${fontUrl('geologica-cyrillic')}) format('woff2');unicode-range:U+0400-045F}
@font-face{font-family:'Geologica';font-weight:300 800;src:url(${fontUrl('geologica-latin')}) format('woff2');unicode-range:U+0000-00FF}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1200px;height:630px;background:#ECE8E1;color:#1D2124;overflow:hidden}
body{font-family:'Geologica',Arial,sans-serif;position:relative}
.model{position:absolute;left:478px;top:42px;width:722px;height:auto}
.text{position:absolute;left:64px;top:64px;bottom:60px;width:396px;display:flex;flex-direction:column;justify-content:space-between}
h1{font-size:72px;line-height:1.02;font-weight:650;letter-spacing:-.02em}
p{font-size:48px;line-height:1;font-weight:650;letter-spacing:-.01em;color:#24467A;padding-top:26px;border-top:2px solid #CFC8BC;white-space:nowrap}
</style></head><body>
<img class="model" src="data:image/png;base64,${modelPng.toString('base64')}" alt="">
<div class="text"><h1>Сантехник<br>на вызов<br>в Кривом<br>Роге</h1><p>095 042 66 21</p></div>
</body></html>`

const og = await ctx.newPage()
await og.setViewportSize({ width: 1200, height: 630 })
await og.route(site.url + '__og', (route) => route.fulfill({ contentType: 'text/html; charset=utf-8', body: ogHtml }))
await og.goto(site.url + '__og', { waitUntil: 'load' })
await og.evaluate(() => document.fonts.ready)
const ogPng = await og.screenshot()
await sharp(ogPng).resize(1200, 630).jpeg({ quality: 86, mozjpeg: true }).toFile(join(img, 'og.jpg'))

await browser.close()
site.close()
const size = (f) => (readFileSync(join(img, f)).length / 1024).toFixed(1)
console.log(`node.webp ${size('node.webp')} кБ, og.jpg ${size('og.jpg')} кБ`)
