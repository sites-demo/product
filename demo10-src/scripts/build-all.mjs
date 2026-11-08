// Собирает демо: node scripts/build-all.mjs [slug ...]. Без аргументов собирает все, кроме папок с «_».
import { execSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const want = process.argv.slice(2)
const slugs = want.length ? want : readdirSync(join(root, 'src/sites')).filter(s => !s.startsWith('_'))
const run = (cmd, env = {}) => execSync(cmd, { stdio: 'inherit', cwd: root, env: { ...process.env, ...env } })

run('npx tsc --noEmit')
for (const slug of slugs) {
  console.log(`\n=== ${slug}`)
  run('npx vite build --logLevel warn', { SITE: slug })
  run('npx vite build --ssr src/entry-server.tsx --logLevel warn', { SITE: slug })
  run(`node scripts/prerender.mjs ${slug}`)
}
