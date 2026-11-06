// Рендерит App в HTML и вставляет в dist/index.html. Запускается после vite build и vite build --ssr.
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const htmlPath = join(root, 'dist/index.html')
const { render } = await import(pathToFileURL(join(root, 'dist-ssr/entry-server.js')).href)

let app = render()
const template = readFileSync(htmlPath, 'utf8')
if (!template.includes('<!--app-->')) throw new Error('В dist/index.html нет метки <!--app-->')

// React 19 кладёт preload для картинок первого экрана перед разметкой. В #root им делать нечего, поднимаем в head.
const hoisted = []
app = app.replace(/^(<link [^>]*\/?>)+/, (links) => {
  hoisted.push(links)
  return ''
})

const html = template.replace('<!--app-->', () => app).replace('</head>', () => `${hoisted.join('')}\n</head>`)

for (const must of ['095 042 66 21', 'tel:+380950426621', 'от 800 грн', 'Рита Кац', 'Саша Коротких', 'Ингулецкий']) {
  if (!html.includes(must)) throw new Error(`В пререндере нет: ${must}`)
}

writeFileSync(htmlPath, html)
rmSync(join(root, 'dist-ssr'), { recursive: true, force: true })
console.log(`Пререндер: ${(app.length / 1024).toFixed(1)} кБ разметки в dist/index.html`)
