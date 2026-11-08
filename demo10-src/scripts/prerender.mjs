// Вставляет готовую разметку и заголовки страницы в dist/<slug>/index.html.
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const slug = process.argv[2]
const dist = join(root, 'dist', slug)
const ssr = join(root, 'dist-ssr', slug)
const { render, site } = await import(pathToFileURL(join(ssr, 'entry-server.js')).href)

const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
const url = `https://www.studio-sait.ru/${slug}/`
const head = [
  `<title>${esc(site.title)}</title>`,
  `<meta name="description" content="${esc(site.description)}">`,
  `<meta name="theme-color" content="${esc(site.theme.bg)}">`,
  `<meta property="og:type" content="website">`,
  `<meta property="og:title" content="${esc(site.title)}">`,
  `<meta property="og:description" content="${esc(site.description)}">`,
  `<meta property="og:url" content="${url}">`,
  existsSync(join(dist, 'og.jpg')) ? `<meta property="og:image" content="${url}og.jpg">` : '',
  existsSync(join(dist, 'favicon.png')) ? `<link rel="icon" href="./favicon.png" type="image/png">` : '',
  `<style>html{background:${site.theme.bg}}</style>`,
].filter(Boolean).join('\n    ')

const htmlPath = join(dist, 'index.html')
let html = readFileSync(htmlPath, 'utf8')
for (const mark of ['<!--app-->', '<!--head-->']) if (!html.includes(mark)) throw new Error(`Нет метки ${mark}`)
const app = render()
html = html.replace('<!--head-->', () => head).replace('<!--app-->', () => app)

// Правила текстов: без длинных тире, восклицаний, стрелок и заглушек.
const text = app.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ')
const bad = [['—', 'длинное тире'], ['!', 'восклицательный знак'], ['→', 'стрелка'], ['↗', 'стрелка'], ['←', 'стрелка'], ['TODO', 'заглушка'], ['undefined', 'undefined'], ['NaN', 'NaN']]
const found = bad.filter(([s]) => text.includes(s) || site.title.includes(s) || site.description.includes(s))
if (found.length) throw new Error(`${slug}: в тексте ${found.map(f => f[1]).join(', ')}`)

writeFileSync(htmlPath, html)
rmSync(ssr, { recursive: true, force: true })
console.log(`${slug}: пререндер ${(app.length / 1024).toFixed(1)} кБ`)
