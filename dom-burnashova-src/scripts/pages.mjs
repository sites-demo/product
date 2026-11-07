// Скриншоты страницы экран за экраном (ленивые картинки успевают загрузиться): node scripts/pages.mjs [имя]
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { launchChromium, serve } from './lib.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'shots', process.argv[2] || 'pages')
mkdirSync(out, { recursive: true })
const site = await serve(join(root, 'dist'))
const browser = await launchChromium()
for (const [w, h, mobile] of [
  [390, 844, true],
  [1440, 900, false],
]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.route(/open-meteo/, (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ current: { temperature_2m: -34.4 } }) }))
  await page.route(/yandex\.ru/, (r) => r.fulfill({ contentType: 'text/html; charset=utf-8', body: '<body style="margin:0;background:#dfe6ec;font:16px sans-serif;display:grid;place-items:center;height:100vh">Яндекс Карта</body>' }))
  await page.goto(site.url + '?no3d', { waitUntil: 'load' })
  const H = await page.evaluate(() => document.documentElement.scrollHeight)
  const parts = []
  for (let y = 0, i = 0; y < H; y += h, i++) {
    await page.evaluate((y) => scrollTo(0, y), y)
    await page.waitForTimeout(450)
    parts.push(await page.screenshot())
  }
  // Склеиваем по 3 экрана в один файл, чтобы было удобно смотреть.
  for (let k = 0; k < parts.length; k += 3) {
    const group = parts.slice(k, k + 3)
    await sharp({ create: { width: w * group.length + 8 * (group.length - 1), height: h, channels: 3, background: '#fff' } })
      .composite(group.map((b, j) => ({ input: b, left: j * (w + 8), top: 0 })))
      .png()
      .toFile(join(out, `${w}-${String(k / 3).padStart(2, '0')}.png`))
  }
  await ctx.close()
}
await browser.close()
site.close()
console.log(out)
