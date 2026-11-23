// Кладёт сборку в папку демо, которую раздаёт GitHub Pages. SLUG задаёт папку, DIST папку сборки.
import { cpSync, rmSync } from 'node:fs'
const dest = '../' + (process.env.SLUG || 'repetitor-klimova')
rmSync(dest, { recursive: true, force: true })
cpSync(process.env.DIST || 'dist', dest, { recursive: true })
console.log('placed -> ' + dest)
