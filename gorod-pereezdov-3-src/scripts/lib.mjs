// Общее для скриптов: статический сервер как на GitHub Pages и запуск браузера.
import { createServer } from 'node:http'
import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { homedir } from 'node:os'
import { chromium, webkit } from 'playwright'

export const BASE = '/gorod-pereezdov-3/'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
}

export function serve(dir, port = 0) {
  const root = resolve(dir)
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    if (!path.startsWith(BASE)) {
      res.writeHead(404).end('not found')
      return
    }
    let file = join(root, path.slice(BASE.length))
    if (!file.startsWith(root)) {
      res.writeHead(403).end()
      return
    }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html')
    if (!existsSync(file)) {
      res.writeHead(404).end('not found')
      return
    }
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' })
    createReadStream(file).pipe(res)
  })
  return new Promise((ok) => {
    server.listen(port, '127.0.0.1', () => {
      ok({ url: `http://127.0.0.1:${server.address().port}${BASE}`, close: () => server.close() })
    })
  })
}

const CACHE = process.env.PLAYWRIGHT_BROWSERS_PATH || join(homedir(), 'Library/Caches/ms-playwright')

// Версия Playwright может ждать другую ревизию браузера, чем лежит в кеше: тогда берём самую свежую из кеша.
function fromCache(prefix, tail) {
  if (!existsSync(CACHE)) return undefined
  const dirs = readdirSync(CACHE)
    .filter((d) => d.startsWith(prefix + '-'))
    .sort((a, b) => Number(b.split('-').pop()) - Number(a.split('-').pop()))
  for (const d of dirs) {
    const p = join(CACHE, d, ...tail)
    if (existsSync(p)) return p
  }
  return undefined
}

function chromePath() {
  if (existsSync(chromium.executablePath())) return undefined
  return (
    fromCache('chromium', ['chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing']) ||
    fromCache('chromium', ['chrome-mac', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'])
  )
}

export const SWIFTSHADER = ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl']

export const launchChromium = (args = []) => chromium.launch({ headless: true, executablePath: chromePath(), args })

export const launch3D = () => launchChromium(SWIFTSHADER)

export function launchWebkit() {
  const custom = existsSync(webkit.executablePath()) ? undefined : fromCache('webkit', ['pw_run.sh'])
  return webkit.launch({ headless: true, executablePath: custom })
}
