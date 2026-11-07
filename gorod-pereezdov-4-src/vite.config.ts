import { defineConfig } from 'vite'
import content from './src/site-content.json'

export default defineConfig({
  base: '/gorod-pereezdov-4/',
  plugins: [{
    name: 'moving-town-content',
    transformIndexHtml() {
      return [{
        tag: 'script',
        attrs: { type: 'application/json', id: 'mt-data' },
        children: JSON.stringify(content).replaceAll('<', '\\u003c'),
        injectTo: 'head',
      }]
    },
  }],
})
