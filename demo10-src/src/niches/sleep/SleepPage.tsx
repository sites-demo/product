import { useEffect, useMemo, useRef, useState } from 'react'
import type { Site, Photo } from '../../types'
import { Header } from '../../ui/Header'
import { Footer } from '../../ui/Footer'
import { Contacts } from '../../ui/Contacts'
import { MobileBar } from '../../ui/MobileBar'
import { RatingLine } from '../../ui/RatingLine'
import { Gallery } from '../../ui/Gallery'
import { Icon } from '../../ui/Icon'
import { asset, waHref } from '../../ui/links'
import { catalog, media } from '../../sites/nord-west/data'
import './sleep.css'

const NAV: [string, string][] = [['#size', 'Матрас по размеру'], ['#inside', 'Что внутри'], ['#catalog', 'Каталог'], ['#factory', 'Фабрика'], ['#shop', 'Магазин'], ['#contacts', 'Контакты']]

const Img = ({ p, eager, className, sizes }: { p: Photo; eager?: boolean; className?: string; sizes?: string }) =>
  <img className={className} src={asset(p.src)} alt={p.alt} width={p.w} height={p.h} sizes={sizes} decoding="async" loading={eager ? undefined : 'lazy'} fetchPriority={eager ? 'high' : undefined} />

/** Плавное появление блоков при прокрутке. */
function useReveal() {
  useEffect(() => {
    const els = [...document.querySelectorAll('.reveal')]
    if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return }
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } }), { rootMargin: '0px 0px -8% 0px' })
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
      <div className="nw-hero-btns">
        <a className="btn btn-accent" href="#size">Рассчитать матрас по размеру</a>
        <a className="btn nw-btn-light" href="#shop">Приехать в магазин</a>
      </div>
      <RatingLine site={site} className="nw-hero-rating" />
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

/** Матрас по своим меркам: ползунки размера, живой чертёж и готовый текст заявки. */
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
    'Сколько будет стоить и когда можно забрать?',
  ].join('\n')
  // Чертёж: кровать в масштабе 1 см = 1 px внутри поля 220 × 230.
  const bx = (240 - w) / 2, by = 30
  const people = w >= 140 ? 2 : 1
  return <section className="section nw-size" id="size">
    <div className="wrap">
      <div className="section-head reveal">
        <p className="nw-over">Под вашу кровать</p>
        <h2>Матрас точно по размеру, даже нестандартному</h2>
        <p>Выберите размер и тип, мы посчитаем цену. Заявка уйдёт в WhatsApp уже с размерами.</p>
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
            </g>
          </svg>
          <span className="nw-len">{l} см</span>
        </div>
        <div className="nw-form">
          <div className="nw-presets" role="group" aria-label="Готовые размеры">
            {PRESETS.map(([n, pw, pl]) => <button key={n} type="button" aria-pressed={preset === n} onClick={() => { setW(pw); setL(pl) }}>
              <b>{n}</b><span>{pw}×{pl}</span>
            </button>)}
          </div>
          <label className="nw-range">
            <span>Ширина <b>{w} см</b></span>
            <input type="range" min={60} max={200} step={5} value={w} onChange={e => setW(+e.target.value)} />
          </label>
          <label className="nw-range">
            <span>Длина <b>{l} см</b></span>
            <input type="range" min={150} max={220} step={5} value={l} onChange={e => setL(+e.target.value)} />
          </label>
          <div className="nw-row">
            <span className="nw-lab">Тип</span>
            <div className="seg" role="group" aria-label="Тип матраса">
              {(Object.keys(KIND) as Kind[]).map(k => <button key={k} type="button" aria-pressed={k === kind} onClick={() => setKind(k)}>{k === 'spring' ? 'Пружинный' : 'Беспружинный'}</button>)}
            </div>
          </div>
          <div className="nw-row">
            <span className="nw-lab">Жёсткость</span>
            <div className="seg" role="group" aria-label="Жёсткость">
              {(Object.keys(FEEL) as Feel[]).map(k => <button key={k} type="button" aria-pressed={k === feel} onClick={() => setFeel(k)}>{k === 'soft' ? 'Мягче' : k === 'mid' ? 'Средняя' : 'Жёстче'}</button>)}
            </div>
          </div>
          <pre className="nw-msg">{text}</pre>
          <a className="btn btn-accent nw-send" href={waHref(site.whatsapp!, text)} target="_blank" rel="noopener noreferrer"><Icon name="wa" />Узнать цену в WhatsApp</a>
          <p className="nw-hint">Как снять мерки: измерьте кровать изнутри по ширине и длине, в двух местах. Если цифры разные, берите меньшую. Не уверены, позвоните, подскажем.</p>
        </div>
      </div>
    </div>
  </section>
}

type Layer = { id: string; name: string; text: string; h: number; cls: string }
const LAYERS: Record<Kind, Layer[]> = {
  spring: [
    { id: 'cover', name: 'Стёганый чехол', text: 'Ткань простёгана с наполнителем на своей стегальной машине. Мягкий верх и воздух между слоями.', h: 16, cls: 'l-cover' },
    { id: 'soft', name: 'Мягкий слой', text: 'Поролон или ортофайбер: отвечает за первое ощущение, когда ложитесь.', h: 18, cls: 'l-soft' },
    { id: 'coco', name: 'Кокосовая плита', text: 'В моделях с кокосом: добавляет жёсткости и хорошо пропускает воздух.', h: 10, cls: 'l-coco' },
    { id: 'springs', name: 'Пружинный блок', text: 'Собирается на нашей линии. Держит спину и распределяет вес.', h: 56, cls: 'l-springs' },
    { id: 'base', name: 'Основа', text: 'Плотный слой под блоком, на нём держится вся конструкция.', h: 12, cls: 'l-base' },
  ],
  foam: [
    { id: 'cover', name: 'Стёганый чехол', text: 'Ткань простёгана с наполнителем на своей стегальной машине.', h: 16, cls: 'l-cover' },
    { id: 'soft', name: 'Ортофайбер', text: 'Упругое волокно сверху: мягко, но без провала.', h: 16, cls: 'l-soft' },
    { id: 'coco', name: 'Кокосовая плита', text: 'В моделях с кокосом: для тех, кто любит пожёстче.', h: 12, cls: 'l-coco' },
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
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOpen(true); io.disconnect() } }, { threshold: 0.45 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const stack = useMemo(() => {
    let y = 0
    return layers.map((L, i) => { const r = { ...L, y: y + (open ? i * 14 : 0) }; y += L.h; return r })
  }, [layers, open])
  const total = stack[stack.length - 1].y + stack[stack.length - 1].h
  return <section className="section nw-inside" id="inside">
    <div className="wrap nw-inside-grid">
      <div className="reveal">
        <p className="nw-over">Что внутри</p>
        <h2>Матрас в разрезе</h2>
        <p className="nw-p">Мы сами собираем пружинные блоки, режем поролон и стегаем чехлы. Нажмите на слой, чтобы узнать, зачем он нужен.</p>
        <div className="seg nw-kind" role="group" aria-label="Тип матраса">
          <button type="button" aria-pressed={kind === 'spring'} onClick={() => { setKind('spring'); setSel(0) }}>Пружинный</button>
          <button type="button" aria-pressed={kind === 'foam'} onClick={() => { setKind('foam'); setSel(0) }}>Беспружинный</button>
        </div>
        <div className="nw-layer-card" aria-live="polite">
          <b>{cur.name}</b>
          <p>{cur.text}</p>
        </div>
      </div>
      <div className="nw-cut" ref={ref}>
        <svg viewBox={`-6 -10 446 ${total + 30}`} className="nw-cut-svg" role="group" aria-label="Слои матраса">
          {stack.map((L, i) => <g key={kind + L.id} className={'nw-l ' + L.cls + (i === sel ? ' on' : '')} style={{ transform: `translateY(${L.y}px)` }}
            onClick={() => setSel(i)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel(i) } }} tabIndex={0} role="button" aria-label={L.name} aria-pressed={i === sel}>
            <rect x="0" y="0" width="300" height={L.h} rx={i === 0 ? 8 : 3} className="nw-l-body" />
            {L.id === 'springs' && Array.from({ length: 13 }).map((_, k) => <path key={k} className="nw-coil" d={`M${12 + k * 22.5} 4 q8 6 0 12 q-8 6 0 12 q8 6 0 12 q-8 6 0 12`} />)}
            {L.id === 'coco' && <rect x="0" y="0" width="300" height={L.h} fill="url(#coco)" />}
            {L.id === 'cover' && <path className="nw-stitch" d={`M10 ${L.h / 2} H290`} />}
            <text x="312" y={L.h / 2 + 5} className="nw-l-name">{L.name}</text>
          </g>)}
          <defs>
            <pattern id="coco" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 6 L6 0" stroke="#5b3f25" strokeOpacity=".5" /></pattern>
          </defs>
        </svg>
      </div>
    </div>
  </section>
}

function Catalog() {
  const [id, setId] = useState(catalog[0].id)
  const c = catalog.find(x => x.id === id)!
  return <section className="section nw-cat" id="catalog">
    <div className="wrap">
      <div className="section-head reveal">
        <p className="nw-over">Каталог</p>
        <h2>Всё для сна в одном магазине</h2>
        <p>От матраса до наволочки. Матрасы, подушки и бельё NordWest шьём сами, часть полотенец и покрывал привозим из Турции.</p>
      </div>
      <div className="nw-tabs" role="tablist" aria-label="Разделы каталога">
        {catalog.map(x => <button key={x.id} role="tab" type="button" aria-selected={x.id === id} onClick={() => setId(x.id)}>{x.title}</button>)}
      </div>
      <div className="nw-cat-body" role="tabpanel" key={c.id}>
        <div className="nw-cat-photos">
          {c.photos.map((p, i) => <figure key={p.src} className={'tile nw-cp nw-cp' + i}><Img p={p} /></figure>)}
        </div>
        <div className="nw-cat-text">
          <h3>{c.title}</h3>
          <p className="muted">{c.text}</p>
          <ul className="nw-items">
            {c.items.map(it => <li key={it.name}><span>{it.name}</span>{it.price && <b>{it.price}</b>}</li>)}
          </ul>
          {c.note && <p className="nw-note">{c.note}</p>}
        </div>
      </div>
    </div>
  </section>
}

function Factory() {
  const [a, b, c, d] = media.factory
  return <section className="section nw-factory" id="factory">
    <div className="wrap">
      <div className="nw-factory-head reveal">
        <div>
          <p className="nw-over">Фабрика</p>
          <h2>Не перекупщики. Делаем сами</h2>
        </div>
        <p>Пружинные блоки, раскрой поролона и стёжка чехлов: всё в Кургане, на нашем оборудовании. Поэтому можем сшить матрас под любой размер и не ждать поставку из другого города.</p>
      </div>
      <div className="nw-factory-grid">
        <figure className="tile reveal nw-f0"><Img p={a} /><figcaption>Сборка пружинных блоков</figcaption></figure>
        <figure className="tile reveal nw-f1"><Img p={b} /><figcaption>Стёжка чехлов</figcaption></figure>
        <figure className="tile reveal nw-f2"><Img p={c} /><figcaption>Раскрой поролона</figcaption></figure>
        <figure className="tile reveal nw-f3"><Img p={d} /><figcaption>Своё оборудование</figcaption></figure>
      </div>
    </div>
  </section>
}

function Shop({ site }: { site: Site }) {
  return <section className="section nw-shop" id="shop">
    <div className="wrap nw-shop-grid">
      <figure className="tile nw-shop-big reveal"><Img p={media.hall} /></figure>
      <div className="nw-shop-text reveal">
        <p className="nw-over">Магазин при фабрике</p>
        <h2>Приезжайте полежать</h2>
        <p className="nw-p">На каждом матрасе и подушке можно полежать, прежде чем выбрать. Консультант расскажет про жёсткость и наполнители и не будет навязывать дорогое.</p>
        <ul className="nw-ticks">
          <li><Icon name="pin" size={18} />{site.address}, склад 32, первый этаж</li>
          <li><Icon name="clock" size={18} />{site.hours}, без выходных</li>
          <li><Icon name="star" size={18} />Карта, наличные, QR-код, перевод, «Плати частями»</li>
          <li><Icon name="phone" size={18} />Доставка, опт и розница</li>
        </ul>
        <div className="nw-shop-photos">
          <figure className="tile"><Img p={media.front} /></figure>
          <figure className="tile"><Img p={media.screen} /></figure>
        </div>
      </div>
    </div>
  </section>
}

function Praise({ site }: { site: Site }) {
  return <section className="section nw-praise">
    <div className="wrap nw-praise-in">
      <div className="reveal">
        <p className="nw-over">Отзывы</p>
        <h2>За что нас хвалят</h2>
        <RatingLine site={site} />
        <p className="muted nw-p">Пересказали своими словами, что чаще всего пишут покупатели на картах.</p>
      </div>
      <ul className="nw-quotes">
        {site.praise!.map((t, i) => <li key={t} className="reveal" style={{ transitionDelay: `${i * 70}ms` }}>{t}</li>)}
      </ul>
    </div>
  </section>
}

export function SleepPage({ site }: { site: Site }) {
  useReveal()
  return <>
    <Header site={site} nav={NAV} />
    <main>
      <Hero site={site} />
      <Facts site={site} />
      <SizeBuilder site={site} />
      <Inside />
      <Catalog />
      <Factory />
      <Shop site={site} />
      <section className="section nw-gal">
        <div className="wrap">
          <div className="section-head reveal"><h2>Как у нас в зале</h2><p>Тысячи комплектов, подушек и полотенец. Лучше один раз увидеть.</p></div>
          <Gallery photos={site.photos} limit={6} />
        </div>
      </section>
      <Praise site={site} />
      <Contacts site={site} title="Как добраться" />
    </main>
    <Footer site={site} nav={NAV} />
    <MobileBar site={site} action="Рассчитать матрас" href="#size" />
  </>
}
