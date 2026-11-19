import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  base: '/peretyazhka-obnovka/',
  plugins: [react()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      input: { main: resolve(__dirname, 'index.html'), cabinet: resolve(__dirname, 'cabinet/index.html') },
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react';
          if (/node_modules\/three\//.test(id)) return 'three';
          return 'vendor-3d';
        },
      },
    },
  },
})
