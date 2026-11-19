// Кладёт сборку в папку демо, которую раздаёт GitHub Pages
import { cpSync, rmSync } from 'node:fs'
rmSync('../himchistka-svezho', { recursive: true, force: true })
cpSync('dist', '../himchistka-svezho', { recursive: true })
console.log('placed -> ../himchistka-svezho')
