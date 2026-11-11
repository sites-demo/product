import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Собирается прямо в папку сайта: npm run build -> ../vpn-miniapp
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { outDir: '../vpn-miniapp', emptyOutDir: true },
})
