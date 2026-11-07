// Кладёт собранный dist в папку сайта dom-burnashova рядом с исходниками.
import { cpSync, existsSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const target = join(root, '..', 'dom-burnashova')
if (!existsSync(join(dist, 'index.html'))) throw new Error('Сначала npm run build')
if (readFileSync(join(dist, 'index.html'), 'utf8').includes('<!--app-->')) throw new Error('В dist нет пререндера')
rmSync(target, { recursive: true, force: true })
cpSync(dist, target, { recursive: true })
console.log('Билд лежит в', target)
