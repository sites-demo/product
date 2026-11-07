// Скриншоты страницы экран за экраном: node scripts/shots.mjs <папка> [3d]
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { launch3D, serve } from './lib.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'shots', process.argv[2] || 'p')
const with3d = process.argv[3] !== 'no3d'
mkdirSync(out, { recursive: true })
const site = await serve(join(root, 'dist'))
const browser = await launch3D()
const sizes = (process.env.SIZES || '1440x900,390x844').split(',').map((s) => s.split('x').map(Number))
for (const [w, h] of sizes) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.log('pageerror', e.message))
  page.on('console', (m) => m.type() === 'error' && console.log('console', m.text()))
  await page.route(/yandex\.ru/, (r) => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: '<body style="margin:0;background:#dfe3da;display:grid;place-items:center;height:100vh;font:16px sans-serif;color:#667">Яндекс Карта</body>' }))
  await page.goto(site.url + (with3d ? '?3d=1' : '?no3d=1'), { waitUntil: 'load' })
  if (with3d) await page.waitForSelector('.stage.ready', { timeout: 120000 }).catch(() => console.log('3d not ready'))
  await page.waitForTimeout(with3d ? 2500 : 500)
  const H = await page.evaluate(() => document.documentElement.scrollHeight)
  const shots = []
  for (let y = 0, i = 0; y < H; y += h, i++) {
    await page.evaluate((y) => window.scrollTo(0, y), y)
    await page.waitForTimeout(350)
    shots.push(await page.screenshot())
  }
  // По три экрана в одну картинку, слева направо.
  for (let i = 0; i < shots.length; i += 3) {
    const group = shots.slice(i, i + 3)
    const img = sharp({ create: { width: w * 3 + 40, height: h, channels: 3, background: '#888' } }).composite(group.map((b, k) => ({ input: b, left: k * (w + 20), top: 0 })))
    await img.png().toFile(join(out, `${w}-${String(i / 3).padStart(2, '0')}.png`))
  }
  console.log(w, 'height', H, 'screens', shots.length)
  await ctx.close()
}
await browser.close()
site.close()
