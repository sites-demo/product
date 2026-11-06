// Проверки перед сдачей. Запуск: node scripts/check.mjs [папка], по умолчанию dist.
import { existsSync, readFileSync, mkdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import sharp from 'sharp'
import { launch3D, launchChromium, launchWebkit, serve } from './lib.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dir = resolve(process.argv[2] || join(root, 'dist'))
const out = join(root, 'shots')
mkdirSync(out, { recursive: true })

const results = []
const pass = (name, detail = '') => results.push({ ok: true, name, detail })
const fail = (name, detail = '') => results.push({ ok: false, name, detail })
const expect = (cond, name, detail = '') => (cond ? pass(name, detail) : fail(name, detail))

const WIDTHS = [320, 360, 375, 412, 768, 1440]
const site = await serve(dir)
const url = site.url

function watch(page, bag) {
  page.on('console', (m) => {
    if (m.type() === 'error') bag.console.push(m.text())
  })
  page.on('pageerror', (e) => bag.console.push('pageerror: ' + e.message))
  page.on('response', (r) => {
    if (r.status() >= 400) bag.http.push(`${r.status()} ${r.url()}`)
  })
}

const newBag = () => ({ console: [], http: [] })

const scrollThrough = (page) =>
  page.evaluate(async () => {
    const step = innerHeight * 0.8
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      scrollTo({ top: y, behavior: 'instant' })
      await new Promise((r) => setTimeout(r, 60))
    }
    scrollTo({ top: 0, behavior: 'instant' })
  })

const overflow = (page, width) =>
  page.evaluate((width) => {
    const bad = []
    const doc = document.documentElement
    if (doc.scrollWidth > width) bad.push(`страница ${doc.scrollWidth} > ${width}`)
    for (const el of document.querySelectorAll('body *')) {
      if (el.closest('.stage, .lb, svg')) continue
      const cs = getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden') continue
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height) continue
      if (r.right > width + 0.5 || r.left < -0.5) bad.push(`${el.tagName}.${el.className} ${Math.round(r.left)}..${Math.round(r.right)}`)
    }
    return bad.slice(0, 6)
  }, width)

const smallTargets = (page) =>
  page.evaluate(() => {
    const bad = []
    for (const el of document.querySelectorAll('a[href], button, input, summary')) {
      if (el.closest('.lb') && !el.closest('.lb[open]')) continue
      const cs = getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden') continue
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height) continue
      if (r.width < 44 || r.height < 44) bad.push(`${el.tagName}.${el.className} «${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24)}» ${Math.round(r.width)}×${Math.round(r.height)}`)
    }
    return bad
  })

const openAllRows = (page) =>
  page.evaluate(async () => {
    document.querySelectorAll('.row-h').forEach((b) => {
      if (b.getAttribute('aria-expanded') === 'false') b.click()
    })
    await new Promise((r) => setTimeout(r, 450))
  })

// Ширины, шрифт 150 %, тап-зоны, консоль, ответы, шапка
{
  const browser = await launchChromium()
  for (const width of WIDTHS) {
    for (const font of [100, 150]) {
      const mobile = width <= 412
      const ctx = await browser.newContext({ viewport: { width, height: mobile ? 760 : 900 }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 })
      const page = await ctx.newPage()
      const bag = newBag()
      watch(page, bag)
      await page.goto(url + '?no3d=1', { waitUntil: 'load' })
      if (font === 150) await page.addStyleTag({ content: 'html{font-size:150%}' })
      await page.waitForTimeout(150)
      const tag = `${width} px, шрифт ${font} %`

      const header = await page.evaluate(() => {
        const box = document.querySelector('.top .wrap').getBoundingClientRect()
        const brand = document.querySelector('.brand').getBoundingClientRect()
        const tel = document.querySelector('.tp').getBoundingClientRect()
        const fs = parseFloat(getComputedStyle(document.querySelector('.brand')).fontSize)
        return { h: box.height, gap: tel.left - brand.right, lines: brand.height / fs }
      })
      expect(header.gap >= 6 && header.h < 80, `Шапка в одну строку: ${tag}`, `зазор ${Math.round(header.gap)} px, высота ${Math.round(header.h)} px`)

      await openAllRows(page)
      await scrollThrough(page)
      const over = await overflow(page, width)
      expect(!over.length, `Без горизонтальной прокрутки: ${tag}`, over.join('; '))
      const small = await smallTargets(page)
      expect(!small.length, `Тап-зоны от 44 px: ${tag}`, small.join('; '))

      await page.locator('.gal button').first().click()
      await page.waitForTimeout(250)
      const lbFits = await page.evaluate((width) => {
        const bad = []
        document.querySelectorAll('.lb-x, .lb-nav, .lb-shot img, .lb-cap').forEach((el) => {
          const r = el.getBoundingClientRect()
          if (r.left < -0.5 || r.right > width + 0.5 || r.top < -0.5 || r.bottom > innerHeight + 0.5) bad.push(`${el.className} ${Math.round(r.left)},${Math.round(r.top)}-${Math.round(r.right)},${Math.round(r.bottom)}`)
        })
        return bad
      }, width)
      expect(!lbFits.length, `Лайтбокс помещается: ${tag}`, lbFits.join('; '))
      await page.keyboard.press('Escape')

      expect(!bag.console.length, `Консоль без ошибок: ${tag}`, bag.console.slice(0, 3).join(' | '))
      expect(!bag.http.length, `Нет ответов 4xx: ${tag}`, bag.http.slice(0, 3).join(' | '))
      await ctx.close()
    }
  }

  // Бюджет стартового JS
  const html = readFileSync(join(dir, 'index.html'), 'utf8')
  const files = [...html.matchAll(/(?:src|href)="\/santehnik-kr\/(assets\/[^"]+\.js)"/g)].map((m) => m[1])
  const startBytes = files.reduce((sum, f) => sum + gzipSync(readFileSync(join(dir, f))).length, 0)
  expect(startBytes <= 80 * 1024, 'Стартовый JS до 80 кБ gzip', `${(startBytes / 1024).toFixed(1)} кБ: ${files.join(', ')}`)
  const hasThree = files.some((f) => readFileSync(join(dir, f), 'utf8').includes('WebGLRenderer'))
  expect(!hasThree && !html.includes('Valve3D'), 'three нет в стартовых файлах')

  // Без JS
  for (const width of [375, 1440]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, javaScriptEnabled: false })
    const page = await ctx.newPage()
    await page.goto(url, { waitUntil: 'load' })
    const text = await page.locator('body').innerText()
    const need = ['095 042 66 21', 'от 800 грн', 'от 1 500 грн', 'от 250 грн/м', 'от 2 000 грн', 'по задаче', 'Срочный вызов', 'Рита Кац', 'Татьяна Гавриленко', 'Тамара Ларина', 'Юлия Санина', 'Саша Коротких', 'Ингулецкий', 'Катерининская', 'Демонтаж старого стояка', 'гарантию']
    const missing = need.filter((s) => !text.includes(s))
    expect(!missing.length, `Без JS виден весь текст: ${width} px`, missing.join(', '))
    expect((await page.locator('a[href="tel:+380950426621"]').first().isVisible()) && (await page.locator('.stage .poster').isVisible()), `Без JS видны телефон и постер: ${width} px`)
    expect(!(await page.locator('.hots').isVisible()), `Без JS нет мёртвых точек на модели: ${width} px`)
    await page.screenshot({ path: join(out, `nojs-${width}.png`) })
    await ctx.close()
  }

  // Гидрация в продакшен-сборке: тот же DOM, без ошибок
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    const bag = newBag()
    watch(page, bag)
    await page.addInitScript(() => {
      const mo = new MutationObserver(() => {
        const h = document.querySelector('h1')
        if (h && !window.__ssrH1) {
          window.__ssrH1 = h
          window.__ssrHtml = document.getElementById('root').firstElementChild?.tagName
          mo.disconnect()
        }
      })
      mo.observe(document, { childList: true, subtree: true })
    })
    await page.goto(url + '?no3d=1', { waitUntil: 'load' })
    await page.waitForTimeout(400)
    const same = await page.evaluate(() => {
      const h = document.querySelector('h1')
      return { same: window.__ssrH1 === h, attached: Object.keys(h).some((k) => k.startsWith('__reactFiber')) }
    })
    expect(same.same && same.attached, 'Гидрация подхватила пререндер, DOM не пересоздан', JSON.stringify(same))
    expect(!bag.console.length, 'Гидрация без ошибок', bag.console.join(' | '))
    await ctx.close()
  }

  // Анимации и reduced-motion
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    await page.goto(url + '?no3d=1', { waitUntil: 'load' })
    expect((await page.locator('.row').first().locator('.row-h').getAttribute('aria-expanded')) === 'true', 'Первая срочная строка открыта при загрузке')
    const row = page.locator('.row').nth(1)
    const before = await page.evaluate(() => getComputedStyle(document.querySelector('.rb-wrap')).transitionProperty)
    expect(before.includes('grid-template-rows'), 'Строка прайса раскрывается через grid-template-rows', before)
    await row.locator('.row-h').click()
    await page.waitForTimeout(90)
    const mid = await row.locator('.rb-wrap').evaluate((e) => e.getBoundingClientRect().height)
    await page.waitForTimeout(400)
    const end = await row.locator('.rb-wrap').evaluate((e) => e.getBoundingClientRect().height)
    expect(mid > 0 && mid < end, 'Раскрытие идёт плавно', `через 90 мс ${Math.round(mid)} px, в конце ${Math.round(end)} px`)

    const pipes = page.locator('.row', { hasText: 'Замена труб' })
    await pipes.locator('.row-h').click()
    await page.waitForTimeout(350)
    await pipes.locator('input[type=range]').fill('20')
    await page.waitForTimeout(350)
    const sum20 = await pipes.locator('.calc-sum span').innerText()
    await pipes.getByRole('button', { name: 'На метр больше' }).click()
    await page.waitForTimeout(350)
    const sum21 = await pipes.locator('.calc-sum span').innerText()
    const draft = await pipes.locator('a.btn-ghost').getAttribute('href')
    expect(sum20.replace(/\s/g, '') === '5000' && sum21.replace(/\s/g, '') === '5250', 'Калькулятор пересчитывает', `20 м: ${sum20}, 21 м: ${sum21}`)
    expect(decodeURIComponent(draft).includes('21 м'), 'Метры попадают в сообщение для Viber', decodeURIComponent(draft).slice(-60))
    await ctx.close()

    const quiet = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
    const q = await quiet.newPage()
    const requests = []
    q.on('request', (r) => requests.push(r.url()))
    await q.goto(url, { waitUntil: 'load' })
    await q.waitForTimeout(1800)
    const off = await q.evaluate(() => ({
      row: getComputedStyle(document.querySelector('.rb-wrap')).transitionDuration,
      gal: getComputedStyle(document.querySelector('.gal img')).transitionDuration,
      smooth: getComputedStyle(document.documentElement).scrollBehavior,
    }))
    expect(/^0s/.test(off.row) && /^0s/.test(off.gal) && off.smooth === 'auto', 'prefers-reduced-motion отключает анимации', JSON.stringify(off))
    expect(!requests.some((r) => r.includes('Valve3D')), 'reduced-motion: остаётся постер, three не грузится')
    await quiet.close()
  }

  // Лайтбокс на телефоне
  {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 760 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
    const page = await ctx.newPage()
    await page.goto(url + '?no3d=1', { waitUntil: 'load' })
    const cap = () => page.locator('.lb-cap b').innerText()
    const isOpen = () => page.evaluate(() => document.querySelector('.lb').open)
    await page.locator('.gal button').first().click()
    await page.waitForTimeout(250)
    expect(await isOpen(), 'Лайтбокс: открывается')
    const a = await cap()
    await page.screenshot({ path: join(out, 'lightbox-375.png') })
    await page.locator('.lb-nav.next').tap()
    await page.waitForTimeout(250)
    const b = await cap()
    await page.locator('.lb-nav.prev').tap()
    await page.waitForTimeout(250)
    expect(b !== a && (await cap()) === a, 'Лайтбокс: стрелки «пред.» и «след.»', `${a} → ${b} → ${a}`)

    const cdp = await ctx.newCDPSession(page)
    const swipe = async (x0, x1, y = 300) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y }] })
      for (let i = 1; i <= 6; i++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + ((x1 - x0) * i) / 6, y }] })
        await page.waitForTimeout(16)
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await page.waitForTimeout(300)
    }
    await swipe(310, 70)
    const c = await cap()
    expect(c === b && (await isOpen()), 'Лайтбокс: свайп влево листает вперёд', `${a} → ${c}`)
    await swipe(70, 310)
    expect((await cap()) === a && (await isOpen()), 'Лайтбокс: свайп вправо листает назад')

    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(200)
    expect((await cap()) === b, 'Лайтбокс: стрелка с клавиатуры')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(150)
    expect(!(await isOpen()), 'Лайтбокс: закрытие по Esc')

    await page.locator('.gal button').first().click()
    await page.waitForTimeout(250)
    const spot = await page.evaluate(() => {
      const r = document.querySelector('.lb-shot img').getBoundingClientRect()
      return { imgTop: r.top, imgCx: r.left + r.width / 2 }
    })
    await page.touchscreen.tap(spot.imgCx, spot.imgTop + 20)
    await page.waitForTimeout(150)
    expect(await isOpen(), 'Лайтбокс: тап по фото не закрывает')
    await page.touchscreen.tap(30, Math.max(30, spot.imgTop - 30))
    await page.waitForTimeout(150)
    expect(!(await isOpen()), 'Лайтбокс: закрытие по тапу на фон')
    await ctx.close()
  }
  await browser.close()
}

// 3D через swiftshader
{
  const browser = await launch3D()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 3 })
  const page = await ctx.newPage()
  const bag = newBag()
  watch(page, bag)
  await page.addInitScript(() => {
    window.__draws = 0
    for (const proto of [WebGL2RenderingContext.prototype, WebGLRenderingContext.prototype]) {
      for (const fn of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
        const orig = proto[fn]
        if (orig) {
          proto[fn] = function (...a) {
            window.__draws++
            return orig.apply(this, a)
          }
        }
      }
    }
  })
  const times = {}
  page.on('request', (r) => {
    if (r.url().includes('Valve3D') && !times.chunk) times.chunk = Date.now()
  })
  await page.goto(url + '?3d=1', { waitUntil: 'load' })
  times.load = Date.now()
  await page.waitForSelector('.stage.ready', { timeout: 180000 })
  pass('3D рендерится со swiftshader и ?3d=1')
  expect(times.chunk >= times.load - 50, 'Чанк three грузится лениво, после load', `разница ${times.chunk - times.load} мс`)
  await page.waitForSelector('.stage.settled', { timeout: 180000 })
  await page.waitForTimeout(600)

  const shot = await page.locator('.stage').screenshot({ path: join(out, '3d-open.png') })
  const stats = await sharp(shot).stats()
  expect(stats.channels.some((c) => c.stdev > 12), 'Канвас не пустой', `stdev ${stats.channels.map((c) => c.stdev.toFixed(1)).join('/')}`)

  const dpr = await page.evaluate(() => {
    const c = document.querySelector('.stage canvas')
    return c.width / c.getBoundingClientRect().width
  })
  expect(dpr <= 1.751, 'dpr не больше 1,75 при экране 3x', dpr.toFixed(2))

  const touch = await page.evaluate(() => ({
    stage: getComputedStyle(document.querySelector('.stage')).touchAction,
    canvas: getComputedStyle(document.querySelector('.stage canvas')).touchAction,
    wrap: getComputedStyle(document.querySelector('.stage .cv')).touchAction,
  }))
  expect(touch.stage === 'pan-y' && touch.canvas === 'pan-y', 'touch-action: pan-y на сцене', JSON.stringify(touch))

  const hintOn = await page.locator('.hint.on').count()
  expect(hintOn === 1, 'Подсказка у ручки видна до первого нажатия')

  // Подпись с клавиатуры
  const filterBtn = page.locator('.hot[data-part=filter] button')
  await filterBtn.focus()
  await page.keyboard.press('Enter')
  await page.waitForTimeout(250)
  expect((await page.locator('.hot[data-part=filter] .hot-label').isVisible()) && (await page.locator('.hot.on[data-part=filter]').count()) === 1, 'Подпись открывается с клавиатуры')
  await page.locator('.stage').screenshot({ path: join(out, '3d-label.png') })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(250)
  expect((await page.locator('.hot.on').count()) === 0, 'Подпись закрывается по Esc')

  // Тапы по подписям
  for (const [part, label] of [['valve', 'Кран на вводе'], ['filter', 'Фильтр'], ['meter', 'Счётчик']]) {
    await page.locator(`.hot[data-part=${part}] button`).click()
    await page.waitForTimeout(200)
    const box = await page.locator(`.hot[data-part=${part}] .hot-label`).evaluate((e) => {
      const r = e.getBoundingClientRect()
      const s = document.querySelector('.stage').getBoundingClientRect()
      return { text: e.textContent, inside: r.left >= s.left && r.right <= s.right && r.bottom <= s.bottom }
    })
    expect(box.text === label && box.inside, `Подпись «${label}» внутри сцены`)
    await page.locator(`.hot[data-part=${part}] button`).click()
  }

  // Нажатие прямо на красную ручку
  const handle = await page.evaluate(() => {
    const s = document.querySelector('.stage').getBoundingClientRect()
    const h = document.querySelector('.hint')
    return { x: s.left + (parseFloat(h.style.getPropertyValue('--x')) / 100) * s.width, y: s.top + (parseFloat(h.style.getPropertyValue('--y')) / 100) * s.height }
  })
  await page.mouse.move(handle.x, handle.y)
  await page.waitForTimeout(150)
  await page.mouse.click(handle.x, handle.y)
  await page.waitForTimeout(300)
  expect((await page.locator('.valve-btn').innerText()).includes('Открыть воду'), 'Клик по ручке перекрывает воду')
  expect((await page.locator('.hint.on').count()) === 0, 'Подсказка исчезает после первого нажатия')
  await page.waitForTimeout(2600)
  await page.locator('.stage').screenshot({ path: join(out, '3d-closed.png') })
  await page.locator('.valve-btn').click()
  await page.waitForTimeout(300)
  expect((await page.locator('.valve-btn').innerText()).includes('Как перекрыть воду'), 'Кнопка снова открывает воду')
  await page.evaluate(() => {
    const c = document.querySelector('.stage canvas')
    c.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()
  })
  await page.waitForTimeout(500)
  const lost = await page.evaluate(() => ({
    poster: getComputedStyle(document.querySelector('.poster')).opacity,
    canvas: !!document.querySelector('.stage canvas'),
    hint: !!document.querySelector('.hint'),
    btn: document.querySelector('.valve-btn')?.textContent,
  }))
  expect(lost.poster !== '0' && !lost.canvas && !lost.hint && lost.btn === 'Показать в 3D', 'Потеря WebGL: честный возврат к постеру', JSON.stringify(lost))
  await page.locator('.valve-btn').click()
  await page.waitForSelector('.stage.ready', { timeout: 180000 })
  pass('Сцена включается снова после потери контекста')

  // Пауза вне экрана
  await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }))
  await page.waitForTimeout(500)
  const d0 = await page.evaluate(() => window.__draws)
  await page.waitForTimeout(900)
  const d1 = await page.evaluate(() => window.__draws)
  expect(d0 === d1, 'frameloop на паузе вне экрана', `кадров за 0,9 с: ${d1 - d0} вызовов`)
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
  await page.waitForTimeout(900)
  const d2 = await page.evaluate(() => window.__draws)
  expect(d2 > d1, 'Сцена оживает при возврате', `${d2 - d1} вызовов`)
  expect(!bag.console.length, '3D: консоль без ошибок', bag.console.slice(0, 3).join(' | '))
  expect(!bag.http.length, '3D: нет ответов 4xx', bag.http.join(' | '))
  await ctx.close()

  // Скролл пальцем по модели
  const phone = await browser.newContext({ viewport: { width: 375, height: 760 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
  const p = await phone.newPage()
  await p.goto(url + '?3d=1', { waitUntil: 'load' })
  await p.waitForSelector('.stage.ready', { timeout: 180000 })
  await p.locator('.stage').scrollIntoViewIfNeeded()
  await p.waitForTimeout(400)
  const box = await p.locator('.stage').boundingBox()
  const y0 = await p.evaluate(() => scrollY)
  const cdp = await phone.newCDPSession(p)
  await cdp.send('Input.synthesizeScrollGesture', { x: box.x + box.width / 2, y: box.y + box.height / 2, yDistance: -220, gestureSourceType: 'touch', speed: 800 })
  await p.waitForTimeout(400)
  const y1 = await p.evaluate(() => scrollY)
  expect(y1 > y0 + 100, 'Страница скроллится пальцем по модели', `scrollY ${Math.round(y0)} → ${Math.round(y1)}`)
  await phone.close()
  await browser.close()
}

// Картинки
{
  const og = await sharp(join(dir, 'img/og.jpg')).metadata()
  expect(og.width === 1200 && og.height === 630, 'og.jpg 1200×630', `${og.width}×${og.height}`)
  const node = await sharp(join(dir, 'img/node.webp')).metadata()
  expect(node.width === 1200 && node.height === 900, 'node.webp 1200×900', `${node.width}×${node.height}`)
}

// Несовпадения гидрации в режиме разработки React: он называет каждое расхождение
{
  const env = { ...process.env, NODE_ENV: 'development' }
  const build = spawnSync('npx', ['vite', 'build', '--mode', 'development', '--outDir', 'dist-dev', '--minify', 'false'], { cwd: root, env, encoding: 'utf8' })
  const ssr = spawnSync('npx', ['vite', 'build', '--mode', 'development', '--ssr', 'src/entry-server.tsx', '--outDir', 'dist-dev-ssr', '--minify', 'false'], { cwd: root, env, encoding: 'utf8' })
  if (build.status || ssr.status || !existsSync(join(root, 'dist-dev/index.html'))) {
    fail('Сборка для проверки гидрации', (build.stderr + ssr.stderr).slice(-400))
  } else {
    const made = spawnSync(
      'node',
      [
        '--input-type=module',
        '-e',
        `import {readFileSync,writeFileSync} from 'node:fs';
         const {render}=await import('file://'+process.cwd()+'/dist-dev-ssr/entry-server.js');
         const h=readFileSync('dist-dev/index.html','utf8');
         writeFileSync('dist-dev/index.html',h.replace('<!--app-->',()=>render().replace(/^(<link [^>]*\\/?>)+/,'')));`,
      ],
      { cwd: root, env, encoding: 'utf8' },
    )
    if (made.status) fail('Пререндер для проверки гидрации', made.stderr.slice(-400))
    else {
      const dev = await serve(join(root, 'dist-dev'))
      const browser = await launchChromium()
      for (const width of [375, 1440]) {
        const ctx = await browser.newContext({ viewport: { width, height: 800 } })
        const page = await ctx.newPage()
        const logs = []
        page.on('console', (m) => {
          if (['error', 'warning'].includes(m.type())) logs.push(m.text())
        })
        await page.goto(dev.url + '?no3d=1', { waitUntil: 'load' })
        await page.waitForTimeout(600)
        const hydration = logs.filter((l) => /hydrat|did not match|mismatch|server rendered/i.test(l))
        expect(!hydration.length, `Отладочный React: нет несовпадений гидрации, ${width} px`, hydration.join(' | ').slice(0, 500))
        await ctx.close()
      }
      await browser.close()
      dev.close()
    }
  }
  spawnSync('rm', ['-rf', join(root, 'dist-dev'), join(root, 'dist-dev-ssr')])
}

// Safari-движок: основной браузер на айфонах
try {
  const browser = await launchWebkit()
  for (const width of [375, 1440]) {
    const ctx = await browser.newContext({ viewport: { width, height: 800 } })
    const page = await ctx.newPage()
    const bag = newBag()
    watch(page, bag)
    await page.goto(url + '?no3d=1', { waitUntil: 'load' })
    await openAllRows(page)
    await scrollThrough(page)
    const over = await overflow(page, width)
    expect(!over.length, `WebKit: без прокрутки вбок, ${width} px`, over.join('; '))
    await page.locator('.gal button').first().click()
    await page.waitForTimeout(250)
    const open = await page.evaluate(() => document.querySelector('.lb').open)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(150)
    const closed = await page.evaluate(() => !document.querySelector('.lb').open)
    expect(open && closed, `WebKit: лайтбокс и Esc, ${width} px`)
    expect(!bag.console.length && !bag.http.length, `WebKit: без ошибок, ${width} px`, [...bag.console, ...bag.http].slice(0, 3).join(' | '))
    await ctx.close()
  }
  await browser.close()
} catch (e) {
  fail('WebKit не запустился', String(e.message).slice(0, 200))
}

site.close()

const failed = results.filter((r) => !r.ok)
const grouped = results.filter((r) => r.ok && r.detail)
console.log(`\nПройдено ${results.length - failed.length} из ${results.length}`)
for (const r of grouped.filter((x) => !/px, шрифт/.test(x.name))) console.log(`  ok  ${r.name}: ${r.detail}`)
if (failed.length) {
  console.log('\nНе прошло:')
  for (const r of failed) console.log(`  ✗ ${r.name}${r.detail ? ': ' + r.detail : ''}`)
  process.exitCode = 1
}
