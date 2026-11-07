// Постеры 3D-сцен (видны, пока грузится WebGL) и картинка для соцсетей. Запуск после npm run build:
// node scripts/posters.mjs, потом снова npm run build, чтобы картинки попали в dist.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { launch3D, serve } from './lib.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pub = join(root, 'public')
const site = await serve(join(root, 'dist'))
const browser = await launch3D()
const isolate = (selector, w, h) => `html,body,:root{background:transparent!important}
  body *{visibility:hidden!important}
  ${selector},${selector} *{visibility:visible!important}
  ${selector}::before,${selector} .poster{display:none!important}
  ${selector}{position:fixed!important;left:0!important;top:0!important;width:${w}px!important;height:${h}px!important;aspect-ratio:auto!important;z-index:9999!important;margin:0!important}`

async function shot(page, selector, w, h) {
  await page.addStyleTag({ content: isolate(selector, w, h) })
  await page.waitForTimeout(2500)
  return page.screenshot({ clip: { x: 0, y: 0, width: w, height: h }, omitBackground: true })
}

// Первый экран: кадр, с которого начинается анимация, чтобы постер сменялся сценой без скачка.
{
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 })
  await page.route(/yandex/, r => r.fulfill({ contentType: 'text/html', body: '' }))
  await page.goto(site.url, { waitUntil: 'load' })
  await page.waitForSelector('.route-step[aria-pressed]', { timeout: 60000 })
  await page.locator('.route-control').click()
  await page.locator('.route-step', { hasText: 'Погрузка' }).click()
  const png = await shot(page, '.truck-viewport', 1190, 700)
  await sharp(png).resize(700, 412).webp({ quality: 84, alphaQuality: 90 }).toFile(join(pub, 'media/truck-poster.webp'))
  await page.close()
}

// Машина в расчёте.
{
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 })
  await page.route(/yandex/, r => r.fulfill({ contentType: 'text/html', body: '' }))
  await page.goto(site.url + '#calc', { waitUntil: 'load' })
  await page.waitForSelector('.preview-desktop .preview-canvas.ready', { timeout: 60000 })
  const png = await shot(page, '.preview-desktop .preview-viewport', 960, 540)
  await sharp(png).resize(480, 270).webp({ quality: 84, alphaQuality: 90 }).toFile(join(pub, 'media/cargo-poster.webp'))
  await page.close()
}

// Картинка для соцсетей: логотип, заголовок и сцена.
{
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' })
  await page.route(/yandex/, r => r.fulfill({ contentType: 'text/html', body: '' }))
  await page.goto(site.url, { waitUntil: 'load' })
  await page.waitForSelector('.truck-canvas.ready', { timeout: 60000 })
  const scene = await sharp(await shot(page, '.truck-viewport', 1190, 700)).trim().resize({ width: 700 }).png().toBuffer()
  const b64 = (file, type) => `data:${type};base64,${readFileSync(file).toString('base64')}`
  const og = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
  await og.setContent(`<!doctype html><html><head><style>
    @font-face{font-family:Onest;src:url(${b64(join(pub, 'media/onest-cyrillic.woff2'), 'font/woff2')}) format('woff2');font-weight:100 900;unicode-range:U+0400-045F}
    @font-face{font-family:Onest;src:url(${b64(join(pub, 'media/onest-latin.woff2'), 'font/woff2')}) format('woff2');font-weight:100 900;unicode-range:U+0000-00FF,U+2000-206F}
    *{margin:0;box-sizing:border-box}
    body{width:1200px;height:630px;background:#f7f7ee;font-family:Onest;color:#172c24;position:relative;overflow:hidden}
    .logo{position:absolute;left:64px;top:60px;height:62px}
    h1{position:absolute;left:64px;top:180px;font-size:84px;line-height:1;font-weight:800;letter-spacing:-.045em}
    h1 span{display:block;color:#204e3d;font-size:.87em;font-weight:780;margin-top:6px}
    p{position:absolute;left:64px;top:385px;width:430px;font-size:24px;line-height:1.45;color:#4e6156}
    .meta{position:absolute;left:64px;bottom:56px;font-size:22px;font-weight:650}
    .scene{position:absolute;right:20px;top:120px;width:640px}
  </style></head><body>
    <img class="logo" src="${b64(join(pub, 'logo.png'), 'image/png')}">
    <h1>Переезд.<span>Всё по плану.</span></h1>
    <p>Упакуем, перевезём и соберём мебель. Цену согласуем до переезда.</p>
    <div class="meta">5,0 на Яндекс Картах · +7 (831) 231-06-95</div>
    <img class="scene" src="data:image/png;base64,${scene.toString('base64')}">
  </body></html>`)
  await og.waitForTimeout(800)
  await sharp(await og.screenshot()).jpeg({ quality: 86 }).toFile(join(pub, 'og.jpg'))
}

await browser.close()
site.close()
console.log('Постеры и og.jpg обновлены')
