import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

// Каждое демо собирается отдельно: SITE=avgust-omsk npm run build.
// @site указывает на модуль сайта: его данные, нужный шрифт и страницу ниши.
export default defineConfig(({ isSsrBuild }) => {
  const slug = process.env.SITE || 'avgust-omsk'
  return {
    base: `/${slug}/`,
    publicDir: r(`src/sites/${slug}/public`),
    resolve: { alias: { '@site': r(`src/sites/${slug}/index.ts`) } },
    build: {
      outDir: r(isSsrBuild ? `dist-ssr/${slug}` : `dist/${slug}`),
      emptyOutDir: true,
      assetsInlineLimit: 0,
    },
    server: { port: 5199, host: '127.0.0.1' },
  }
})
