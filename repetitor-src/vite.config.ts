import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  base: `/${process.env.SLUG || 'repetitor-klimova'}/`,
  plugins: [react()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    rollupOptions: {
      input: { main: resolve(__dirname, 'index.html'), cabinet: resolve(__dirname, 'cabinet/index.html') },
    },
  },
})
