// Кладёт сборку в папку демо, которую раздаёт GitHub Pages
import { cpSync, rmSync } from 'node:fs'
rmSync('../peretyazhka-obnovka', { recursive: true, force: true })
cpSync('dist', '../peretyazhka-obnovka', { recursive: true })
console.log('placed -> ../peretyazhka-obnovka')
