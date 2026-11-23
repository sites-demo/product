// Кладёт сборку в папку демо, которую раздаёт GitHub Pages. SLUG задаёт папку.
import { cpSync, rmSync } from 'node:fs'
const dest = '../' + (process.env.SLUG || 'repetitor-klimova')
rmSync(dest, { recursive: true, force: true })
cpSync('dist', dest, { recursive: true })
console.log('placed -> ' + dest)
