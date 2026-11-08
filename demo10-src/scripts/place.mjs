// Копирует собранные демо в корень репозитория, откуда их раздаёт GitHub Pages.
import { cpSync, existsSync, readdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const repo = join(root, '..')
const want = process.argv.slice(2)
const slugs = want.length ? want : readdirSync(join(root, 'dist'))
for (const slug of slugs) {
  const from = join(root, 'dist', slug)
  if (!existsSync(join(from, 'index.html'))) throw new Error(`${slug} не собран`)
  const to = join(repo, slug)
  rmSync(to, { recursive: true, force: true })
  cpSync(from, to, { recursive: true })
  console.log(`${slug} -> ${to}`)
}
