// Кладёт сборку в папку демо, которую раздаёт GitHub Pages
import { cpSync, rmSync } from 'node:fs'
rmSync('../klining-blik', { recursive: true, force: true })
cpSync('dist', '../klining-blik', { recursive: true })
console.log('placed -> ../klining-blik')
