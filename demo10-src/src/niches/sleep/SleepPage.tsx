import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { Site, Photo } from '../../types'
import { Header } from '../../ui/Header'
import { Footer } from '../../ui/Footer'
import { Contacts } from '../../ui/Contacts'
import { MobileBar } from '../../ui/MobileBar'
import { RatingLine } from '../../ui/RatingLine'
import { Icon } from '../../ui/Icon'
import { asset, telHref, waHref } from '../../ui/links'
import { catalog, media } from '../../sites/nord-west/data'
import './sleep.css'

const NAV: [string, string][] = [['#size', 'По размеру'], ['#catalog', 'Каталог'], ['#factory', 'Фабрика'], ['#shop', 'Магазин'], ['#contacts', 'Контакты']]
const ROUTE = 'https://2gis.ru/kurgan/firm/1407903164567445'

const Img = ({ p, eager, className, sizes }: { p: Photo; eager?: boolean; className?: string; sizes?: string }) =>
  <img className={className} src={asset(p.src)} alt={p.alt} width={p.w} height={p.h} sizes={sizes} decoding="async" loading={eager ? undefined : 'lazy'} fetchPriority={eager ? 'high' : undefined} />

/** Любое фото на странице открывается на весь экран, листается внутри своей группы. */
type Zoom = (list: Photo[], i: number) => void
const ZoomCtx = createContext<Zoom>(() => {})

function Viewer({ state, close }: { state: { list: Photo[]; i: number } | null; close: () => void }) {
  const dlg = useRef<HTMLDialogElement>(null)
  const strip = useRef<HTMLDivElement>(null)
  const [cur, setCur] = useState(0)
  useEffect(() => {
    const d = dlg.current
    if (!d) return
    if (!state) { if (d.open) d.close(); return }
    if (!d.open) d.showModal()
    setCur(state.i)
    requestAnimationFrame(() => strip.current?.scrollTo({ left: strip.current.clientWidth * state.i, behavior: 'instant' as ScrollBehavior }))
  }, [state])
  const go = (dir: number) => {
    const s = strip.current
    if (!s || !state) return
    const n = Math.max(0, Math.min(state.list.length - 1, cur + dir))
    s.scrollTo({ left: s.clientWidth * n, behavior: 'smooth' })
  }
  const onScroll = () => { const s = strip.current; if (s) setCur(Math.round(s.scrollLeft / s.clientWidth)) }
  return <dialog ref={dlg} className="viewer nw-viewer" onClose={close} onClick={e => { if (e.target === e.currentTarget) close() }}
    onKeyDown={e => { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1) }}>
    <button type="button" className="viewer-close" onClick={close} aria-label="Закрыть"><Icon name="close" size={22} /></button>
    <div className="viewer-strip" ref={strip} onScroll={onScroll}>
      {state?.list.map(p => <figure key={p.src} onClick={e => { if (e.target === e.currentTarget) close() }}><img src={asset(p.src)} alt={p.alt} /><figcaption>{p.alt}</figcaption></figure>)}
    </div>
    {state && state.list.length > 1 && <>
      <button type="button" className="nw-vnav prev" onClick={() => go(-1)} disabled={cur === 0} aria-label="Предыдущее фото">‹</button>
      <button type="button" className="nw-vnav next" onClick={() => go(1)} disabled={cur === state.list.length - 1} aria-label="Следующее фото">›</button>
      <span className="nw-vcount">{cur + 1} из {state.list.length}</span>
    </>}
  </dialog>
}

/** Фото, которое можно открыть крупно. */
function ZImg({ list, i, className, caption }: { list: Photo[]; i: number; className?: string; caption?: string }) {
  const zoom = useContext(ZoomCtx)
  const p = list[i]
  return <figure className={'tile nw-z ' + (className ?? '')}>
    <button type="button" onClick={() => zoom(list, i)} aria-label={`Открыть фото крупно: ${p.alt}`}><Img p={p} /></button>
    {caption && <figcaption>{caption}</figcaption>}
  </figure>
}

/** Плавное появление блоков при прокрутке. Заранее, чтобы при быстрой прокрутке не было пустых мест. */
function useReveal() {
  useEffect(() => {
    const els = [...document.querySelectorAll('.reveal')]
    if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return }
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } }), { rootMargin: '0px 0px 15% 0px' })
    els.forEach(e => io.observe(e))
    return () => io.disconnect()
  }, [])
}

function Hero({ site }: { site: Site }) {
  return <section className="nw-hero" data-hero>
    <Img p={media.hero} eager className="nw-hero-img" sizes="100vw" />
    <div className="nw-hero-shade" />
    <div className="wrap nw-hero-in">
      <p className="nw-kicker">Фабрика комфорта · {site.city}</p>
      <h1>{site.hero.title}</h1>
      <p className="nw-lead">{site.hero.lead}</p>
      <RatingLine site={site} className="nw-hero-rating" />
      <div className="nw-hero-btns">
        <a className="btn btn-accent" href="#size">Узнать цену по размеру</a>
        <a className="btn nw-btn-light" href="#shop">Приехать в магазин</a>
      </div>
    </div>
  </section>
}

function Facts({ site }: { site: Site }) {
  return <section className="nw-facts">
    <div className="wrap nw-facts-in">
      {site.facts.map((f, i) => <div key={f.title} className="nw-fact reveal" style={{ transitionDelay: `${i * 90}ms` }}>
        <span className="nw-fact-n">0{i + 1}</span><b>{f.title}</b><p>{f.text}</p>
      </div>)}
    </div>
  </section>
}

const PRESETS: [string, number, number][] = [['Детский', 70, 160], ['Односпальный', 90, 200], ['Полуторный', 120, 200], ['Двуспальный', 160, 200], ['Большой', 180, 200]]
type Kind = 'spring' | 'foam'
const KIND: Record<Kind, string> = { spring: 'пружинный', foam: 'беспружинный' }
type Feel = 'soft' | 'mid' | 'firm'
const FEEL: Record<Feel, string> = { soft: 'помягче', mid: 'средней жёсткости', firm: 'пожёстче' }

function Num({ label, value, min, max, set }: { label: string; value: number; min: number; max: number; set: (n: number) => void }) {
  const clamp = (n: number) => Math.max(min, Math.min(max, Math.round(n)))
  return <div className="nw-num">
    <div className="nw-num-top">
      <span>{label}</span>
      <div className="nw-step">
        <button type="button" onClick={() => set(clamp(value - 1))} aria-label={`${label}: меньше на 1 см`}>−</button>
        <label><input type="number" inputMode="numeric" min={min} max={max} value={value} aria-label={`${label}, см`}
          onChange={e => { const n = +e.target.value; if (n) set(Math.min(max, n)) }} onBlur={e => set(clamp(+e.target.value || min))} /> см</label>
        <button type="button" onClick={() => set(clamp(value + 1))} aria-label={`${label}: больше на 1 см`}>+</button>
      </div>
    </div>
    <input type="range" min={min} max={max} step={1} value={value} onChange={e => set(+e.target.value)} aria-label={label} />
  </div>
}

/** Матрас по своим меркам: размер до сантиметра, живой чертёж и готовый текст заявки. */
function SizeBuilder({ site }: { site: Site }) {
  const [w, setW] = useState(160)
  const [l, setL] = useState(200)
  const [kind, setKind] = useState<Kind>('spring')
  const [feel, setFeel] = useState<Feel>('mid')
  const preset = PRESETS.find(p => p[1] === w && p[2] === l)?.[0]
  const text = [
    'Здравствуйте. Хочу заказать матрас.',
    `Размер: ${w} × ${l} см${preset ? '' : ' (нестандартный)'}.`,
    `Тип: ${KIND[kind]}, ${FEEL[feel]}.`,
    'Сколько будет стоить и какие сроки?',
  ].join('\n')
  // Чертёж в масштабе: 1 см = 1 единица, поле 240 × 270.
  const bx = (240 - w) / 2, by = 30 + (220 - l) / 2
  const people = w >= 140 ? 2 : 1
  return <section className="section nw-size" id="size">
    <div className="wrap">
      <div className="section-head reveal">
        <p className="nw-over">Под вашу кровать</p>
        <h2>Матрас точно по размеру, даже нестандартному</h2>
        <p>Укажите размер до сантиметра и тип. Заявка уйдёт в WhatsApp уже с размерами, в ответ назовём цену и срок.</p>
      </div>
      <div className="nw-size-grid reveal">
        <div className="nw-draw tile" aria-hidden="true">
          <svg viewBox="0 0 240 270" className="nw-svg">
            <defs>
              <pattern id="quilt" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <path d="M0 7h14M7 0v14" stroke="currentColor" strokeOpacity=".09" strokeWidth="1" />
              </pattern>
            </defs>
            <rect x={bx - 6} y={by - 14} width={w + 12} height={l + 20} rx="6" className="nw-frame" />
            <rect x={bx - 6} y={by - 22} width={w + 12} height="14" rx="5" className="nw-head" />
            <g className="nw-mat" style={{ transform: `translate(${bx}px, ${by}px)` }}>
              <rect width={w} height={l} rx="9" className="nw-mat-top" />
              <rect width={w} height={l} rx="9" fill="url(#quilt)" />
              {Array.from({ length: people }).map((_, i) => {
                const cx = people === 2 ? w * (i ? 0.73 : 0.27) : w / 2
                return <rect key={i} x={cx - Math.min(26, w / 4.4)} y="10" width={Math.min(52, w / 2.2)} height="26" rx="9" className="nw-pillow" />
              })}
            </g>
            <g className="nw-dim">
              <line x1={bx} x2={bx + w} y1={by + l + 18} y2={by + l + 18} />
              <text x={120} y={by + l + 34} textAnchor="middle">{w} см</text>
              <line x1={bx + w + 16} x2={bx + w + 16} y1={by} y2={by + l} />
              <text x={bx + w + 22} y={by + l / 2} className="nw-dim-v" transform={`rotate(90 ${bx + w + 22} ${by + l / 2})`} textAnchor="middle">{l} см</text>
            </g>
          </svg>
        </div>
        <div className="nw-form">
          <div className="nw-presets" role="group" aria-label="Готовые размеры">
            {PRESETS.map(([n, pw, pl]) => <button key={n} type="button" aria-pressed={preset === n} onClick={() => { setW(pw); setL(pl) }}>
              <b>{n}</b><span>{pw}×{pl}</span>
            </button>)}
          </div>
          <Num label="Ширина" value={w} min={50} max={220} set={setW} />
          <Num label="Длина" value={l} min={100} max={220} set={setL} />
          <div className="nw-row">
            <span className="nw-lab">Тип</span>
            <div className="seg nw-seg" role="group" aria-label="Тип матраса">
              {(Object.keys(KIND) as Kind[]).map(k => <button key={k} type="button" aria-pressed={k === kind} onClick={() => setKind(k)}>{k === 'spring' ? 'Пружинный' : 'Беспружинный'}</button>)}
            </div>
          </div>
          <div className="nw-row">
            <span className="nw-lab">Жёсткость</span>
            <div className="seg nw-seg" role="group" aria-label="Жёсткость">
              {(Object.keys(FEEL) as Feel[]).map(k => <button key={k} type="button" aria-pressed={k === feel} onClick={() => setFeel(k)}>{k === 'soft' ? 'Мягче' : k === 'mid' ? 'Средняя' : 'Жёстче'}</button>)}
            </div>
          </div>
          <div className="nw-msg-wrap">
            <span className="nw-msg-cap">Текст вашего сообщения</span>
            <pre className="nw-msg">{text}</pre>
          </div>
          <a className="btn btn-accent nw-send" href={waHref(site.whatsapp!, text)} target="_blank" rel="noopener noreferrer"><Icon name="wa" />Узнать цену в WhatsApp</a>
          <a className="nw-call" href={telHref(site.phones[0].tel)}><Icon name="phone" size={18} />Или позвоните: {site.phones[0].display}</a>
          <p className="nw-hint">Как снять мерки: измерьте кровать изнутри по ширине и длине, в двух местах. Если цифры разные, берите меньшую. Если не уверены, позвоните: подскажем.</p>
        </div>
      </div>
    </div>
  </section>
}

const STEPS = [
  { t: 'Снимите мерки', d: 'Ширину и длину кровати изнутри. Или приезжайте в магазин и прилягте на образцы.' },
  { t: 'Напишите нам', d: 'Размер, тип и жёсткость. В ответ назовём цену и срок изготовления.' },
  { t: 'Шьём на фабрике', d: 'Матрас делают под ваш размер здесь же, в Кургане. Бывало, что и за сутки.' },
  { t: 'Забираете', d: 'Самовывоз с фабрики или доставка. Оплата картой, наличными, по QR-коду или частями.' },
]

function Order() {
  return <section className="section nw-order" id="order">
    <div className="wrap">
      <div className="section-head reveal">
        <p className="nw-over">Как заказать</p>
        <h2>Четыре шага до нового матраса</h2>
      </div>
      <ol className="nw-steps">
        {STEPS.map((s, i) => <li key={s.t} className="reveal" style={{ transitionDelay: `${i * 80}ms` }}>
          <span className="nw-step-n">{i + 1}</span>
          <b>{s.t}</b>
          <p>{s.d}</p>
        </li>)}
      </ol>
    </div>
  </section>
}

type Layer = { id: string; name: string; text: string; h: number; cls: string }
const LAYERS: Record<Kind, Layer[]> = {
  spring: [
    { id: 'cover', name: 'Стёганый чехол', text: 'Ткань простёгана с наполнителем на своей стегальной машине. Мягкий верх и воздух между слоями.', h: 22, cls: 'l-cover' },
    { id: 'soft', name: 'Мягкий слой', text: 'Поролон или ортофайбер: отвечает за первое ощущение, когда ложитесь.', h: 22, cls: 'l-soft' },
    { id: 'coco', name: 'Кокосовая плита', text: 'В моделях с кокосом: добавляет жёсткости и хорошо пропускает воздух.', h: 18, cls: 'l-coco' },
    { id: 'springs', name: 'Пружинный блок', text: 'Собирается на нашей линии. Держит спину и распределяет вес.', h: 56, cls: 'l-springs' },
    { id: 'base', name: 'Основа', text: 'Плотный слой под блоком, на нём держится вся конструкция.', h: 18, cls: 'l-base' },
  ],
  foam: [
    { id: 'cover', name: 'Стёганый чехол', text: 'Ткань простёгана с наполнителем на своей стегальной машине.', h: 22, cls: 'l-cover' },
    { id: 'soft', name: 'Ортофайбер', text: 'Упругое волокно сверху: мягко, но без провала.', h: 22, cls: 'l-soft' },
    { id: 'coco', name: 'Кокосовая плита', text: 'В моделях с кокосом: для тех, кто любит пожёстче.', h: 18, cls: 'l-coco' },
    { id: 'foam', name: 'Монолит ППУ', text: 'Цельный блок поролона без пружин. Тихий, не скрипит, подходит детям.', h: 58, cls: 'l-foam' },
  ],
}

/** Матрас в разрезе: слои раздвигаются, по каждому можно нажать. */
function Inside() {
  const [kind, setKind] = useState<Kind>('spring')
  const [open, setOpen] = useState(false)
  const [sel, setSel] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const layers = LAYERS[kind]
  const cur = layers[Math.min(sel, layers.length - 1)]
  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) { setOpen(true); return }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOpen(true); io.disconnect() } }, { threshold: 0.4 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const stack = useMemo(() => {
    let y = 0
    return layers.map((L, i) => { const r = { ...L, y: y + (open ? i * 16 : 0) }; y += L.h; return r })
  }, [layers, open])
  const total = stack[stack.length - 1].y + stack[stack.length - 1].h
  return <section className="section nw-inside" id="inside">
    <div className="wrap nw-inside-grid">
      <div className="nw-inside-text reveal">
        <p className="nw-over">Что внутри</p>
        <h2>Матрас в разрезе</h2>
        <p className="nw-p">Мы сами собираем пружинные блоки, режем поролон и стегаем чехлы. Нажмите на слой, чтобы узнать, зачем он нужен.</p>
        <div className="seg nw-seg nw-kind" role="group" aria-label="Тип матраса">
          <button type="button" aria-pressed={kind === 'spring'} onClick={() => { setKind('spring'); setSel(0) }}>Пружинный</button>
          <button type="button" aria-pressed={kind === 'foam'} onClick={() => { setKind('foam'); setSel(0) }}>Беспружинный</button>
        </div>
      </div>
      <div className="nw-cut" ref={ref}>
        <svg viewBox={`-6 -10 446 ${total + 30}`} className="nw-cut-svg" role="group" aria-label="Слои матраса">
          <defs>
            <pattern id="coco" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 6 L6 0" stroke="#5b3f25" strokeOpacity=".5" /></pattern>
          </defs>
          {stack.map((L, i) => <g key={kind + L.id} className={'nw-l ' + L.cls + (i === sel ? ' on' : '')} style={{ transform: `translateY(${L.y}px)` }}
            onClick={() => setSel(i)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel(i) } }} tabIndex={0} role="button" aria-label={L.name} aria-pressed={i === sel}>
            <rect x="-6" y="-7" width="446" height={L.h + 14} fill="transparent" />
            <rect x="0" y="0" width="300" height={L.h} rx={i === 0 ? 8 : 3} className="nw-l-body" />
            {L.id === 'springs' && Array.from({ length: 13 }).map((_, k) => <path key={k} className="nw-coil" d={`M${12 + k * 22.5} 4 q8 6 0 12 q-8 6 0 12 q8 6 0 12 q-8 6 0 12`} />)}
            {L.id === 'coco' && <rect x="0" y="0" width="300" height={L.h} fill="url(#coco)" />}
            {L.id === 'cover' && <path className="nw-stitch" d={`M10 ${L.h / 2} H290`} />}
            <text x="312" y={L.h / 2 + 5} className="nw-l-name">{L.name}</text>
          </g>)}
        </svg>
        <div className="nw-layer-card" aria-live="polite">
          <b>{cur.name}</b>
          <p>{cur.text}</p>
        </div>
      </div>
    </div>
  </section>
}

const askText = (name: string) => `Здравствуйте. Интересует: ${name}. Сколько стоит и есть ли в наличии?`

function Catalog({ site }: { site: Site }) {
  const [id, setId] = useState(catalog[0].id)
  const c = catalog.find(x => x.id === id)!
  return <section className="section nw-cat" id="catalog">
    <div className="wrap">
      <div className="section-head reveal">
        <p className="nw-over">Каталог</p>
        <h2>От матраса до наволочки</h2>
        <p>Матрасы и бельё NordWest шьём сами. Подушки MemorySleep, часть полотенец и покрывал привозим от проверенных фабрик.</p>
      </div>
      <div className="nw-tabs" role="group" aria-label="Разделы каталога">
        {catalog.map(x => <button key={x.id} type="button" aria-pressed={x.id === id} onClick={() => setId(x.id)}>{x.title}</button>)}
      </div>
      <div className="nw-cat-body" key={c.id}>
        <div className="nw-cat-photos">
          {c.photos.map((_, i) => <ZImg key={c.photos[i].src} list={c.photos} i={i} className={'nw-cp nw-cp' + i} />)}
        </div>
        <div className="nw-cat-text">
          <h3>{c.title}</h3>
          <p className="muted">{c.text}</p>
          <ul className="nw-items">
            {c.items.map(it => <li key={it.name}>
              <a href={waHref(site.whatsapp!, askText(it.name))} target="_blank" rel="noopener noreferrer">
                <span>{it.name}</span>
                {it.price ? <b>{it.price}</b> : <em>Узнать цену</em>}
              </a>
            </li>)}
          </ul>
          {c.note && <p className="nw-note">{c.note}</p>}
        </div>
      </div>
    </div>
  </section>
}

function Factory() {
  const f = media.factory
  return <section className="section nw-factory" id="factory">
    <div className="wrap">
      <div className="nw-factory-head reveal">
        <div>
          <p className="nw-over">Фабрика</p>
          <h2>Матрасы делаем сами</h2>
        </div>
        <p>Пружинные блоки, раскрой поролона и стёжка чехлов: всё в Кургане, на нашем оборудовании. Поэтому можем сшить матрас под любой размер и не ждать поставку из другого города.</p>
      </div>
      <div className="nw-factory-grid">
        <ZImg list={f} i={0} className="reveal nw-f0" caption="Сборка пружинных блоков" />
        <ZImg list={f} i={1} className="reveal nw-f1" caption="Стёжка чехлов" />
        <ZImg list={f} i={2} className="reveal nw-f2" caption="Раскрой поролона" />
      </div>
    </div>
  </section>
}

function Shop({ site }: { site: Site }) {
  const top = [media.hall, media.front, media.screen]
  return <section className="section nw-shop" id="shop">
    <div className="wrap">
      <div className="nw-shop-grid">
        <ZImg list={top} i={0} className="nw-shop-big reveal" />
        <div className="nw-shop-text reveal">
          <p className="nw-over">Магазин при фабрике</p>
          <h2>Приезжайте полежать</h2>
          <p className="nw-p">На каждом матрасе и подушке можно полежать, прежде чем выбрать. Консультант расскажет про жёсткость и наполнители и не будет навязывать дорогое.</p>
          <ul className="nw-ticks">
            <li><Icon name="pin" size={18} /><span>{site.address}, склад 32, первый этаж</span></li>
            <li><Icon name="clock" size={18} /><span>{site.hours}, без выходных</span></li>
            <li><Icon name="star" size={18} /><span>Карта, наличные, QR-код, перевод, «Плати частями»</span></li>
            <li><Icon name="phone" size={18} /><span>Доставка, опт и розница</span></li>
          </ul>
          <a className="btn btn-ghost" href={ROUTE} target="_blank" rel="noopener noreferrer"><Icon name="pin" size={18} />Построить маршрут в 2ГИС</a>
          <div className="nw-shop-photos">
            <ZImg list={top} i={1} />
            <ZImg list={top} i={2} />
          </div>
        </div>
      </div>
      <div className="nw-hall">
        <h3 className="reveal">Как у нас в зале</h3>
        <div className="nw-hall-grid">
          {site.photos.map((p, i) => <ZImg key={p.src} list={site.photos} i={i} className={'nw-h' + i} />)}
        </div>
      </div>
    </div>
  </section>
}

function Praise({ site }: { site: Site }) {
  const r = site.ratings[0]
  return <section className="section nw-praise">
    <div className="wrap nw-praise-in">
      <div className="reveal">
        <p className="nw-over">Отзывы</p>
        <h2>Что чаще всего пишут покупатели</h2>
        <RatingLine site={site} />
        <p className="muted nw-p">Пересказали своими словами отзывы на картах. Целиком их можно прочитать в 2ГИС.</p>
        <a className="btn btn-ghost nw-rev-btn" href={r.url + '/tab/reviews'} target="_blank" rel="noopener noreferrer">Читать отзывы в 2ГИС</a>
      </div>
      <ul className="nw-quotes">
        {site.praise!.map((t, i) => <li key={t} className="reveal" style={{ transitionDelay: `${i * 70}ms` }}><Icon name="star" size={18} fill />{t}</li>)}
      </ul>
    </div>
  </section>
}

export function SleepPage({ site }: { site: Site }) {
  useReveal()
  const [view, setView] = useState<{ list: Photo[]; i: number } | null>(null)
  return <ZoomCtx.Provider value={(list, i) => setView({ list, i })}>
    <Header site={site} nav={NAV} />
    <main>
      <Hero site={site} />
      <Facts site={site} />
      <SizeBuilder site={site} />
      <Order />
      <Praise site={site} />
      <Catalog site={site} />
      <Inside />
      <Factory />
      <Shop site={site} />
      <Contacts site={site} title="Как добраться" />
    </main>
    <Footer site={site} nav={NAV} />
    <MobileBar site={site} action="Узнать цену по размеру" href="#size" />
    <Viewer state={view} close={() => setView(null)} />
  </ZoomCtx.Provider>
}
