// Фото хозяев из карточки 2ГИС: подрезаем край с отметкой площадки, делаем webp большой и маленький.
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
const src = process.argv[2]
const out = new URL('../public/img/p/', import.meta.url).pathname
for (const f of readdirSync(src).filter((x) => x.endsWith('.jpg'))) {
  const im = sharp(join(src, f))
  const { width: w, height: h } = await im.metadata()
  const cw = Math.round(w * 0.95), ch = Math.round(h * 0.94)
  const base = sharp(join(src, f)).rotate().extract({ left: 0, top: 0, width: cw, height: ch })
  const id = f.replace('.jpg', '')
  await base.clone().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toFile(join(out, id + '.webp'))
  await base.clone().resize({ width: 640, height: 640, fit: 'inside' }).webp({ quality: 72 }).toFile(join(out, id + '-s.webp'))
}
console.log('ok')
