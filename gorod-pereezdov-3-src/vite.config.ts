import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ isSsrBuild }) => ({
  base: '/gorod-pereezdov-3/',
  plugins: [react()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1200,
    rollupOptions: isSsrBuild ? {} : { output: { manualChunks: { react: ['react', 'react-dom', 'react-dom/client'] } } },
  },
}))
