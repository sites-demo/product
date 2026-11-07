import { defineConfig } from 'vite'
import content from './src/site-content.json'

export default defineConfig({
  base: './',
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
