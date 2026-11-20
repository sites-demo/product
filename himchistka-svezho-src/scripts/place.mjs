// Кладёт сборку в папку демо, которую раздаёт GitHub Pages.
// SLUG задаёт папку (по умолчанию himchistka-svezho), VITE_CUTE=1 значит милый вариант.
import { cpSync, rmSync } from 'node:fs'
const slug = process.env.SLUG || 'himchistka-svezho'
const cute = process.env.VITE_CUTE === '1'
const dest = '../' + slug
rmSync(dest, { recursive: true, force: true })
cpSync('dist', dest, { recursive: true })
// лишняя модель другого варианта не нужна
if (cute) { rmSync(dest + '/assets/parts_hd.glb', { force: true }); rmSync(dest + '/draco', { recursive: true, force: true }) }
else rmSync(dest + '/assets/parts.glb', { force: true })
console.log('placed -> ' + dest)
