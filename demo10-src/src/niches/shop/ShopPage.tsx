import { useState } from 'react'
import type { Site } from '../../types'
import { Icon } from '../../ui/Icon'
import { MobileBar } from '../../ui/MobileBar'
import { asset, telHref, tgHref, waHref } from '../../ui/links'
import './shop.css'

type Shop = NonNullable<Site['shop']>
type Model = Shop['models'][number]
type Photo = Site['photos'][number]

export const glovesText = (brand: string, m: Model, oz: string) => [
  `Здравствуйте. Хочу заказать перчатки ${brand}.`,
  `Модель: ${m.name.toLowerCase()}, ${m.closure}.`,
  `Вес: ${oz}.`,
  'Как оплатить и получить?',
].join('\n')

const gearText = (brand: string, title: string) => `Здравствуйте. Хочу заказать ${brand}: ${title.toLowerCase()}.\nЕсть в наличии?`
const CLOSURE: Record<string, string> = { 'на липучке': 'Липучка', 'на шнуровке': 'Шнуровка' }
const defaultOz = (m: Model) => (m.weights.includes('12 oz') ? '12 oz' : m.weights[0])

const Img = ({ p, eager, className }: { p: Photo; eager?: boolean; className?: string }) =>
  <img className={className} src={asset(p.src)} alt={p.alt} width={p.w} height={p.h} decoding="async" loading={eager ? undefined : 'lazy'} fetchPriority={eager ? 'high' : undefined} />

function Header({ site, nav }: { site: Site; nav: [string, string][] }) {
  return <header className="hdr gs-hdr" id="top">
    <div className="wrap hdr-in">
      <a className="brand" href="#top" aria-label={`${site.name}, в начало страницы`}>
        {site.logo && <img src={asset(site.logo.src)} alt="" width={site.logo.w} height={site.logo.h} style={{ height: site.logo.height }} />}
      </a>
      <nav className="hdr-nav" aria-label="Разделы">{nav.map(([h, l]) => <a key={h} href={h}>{l}</a>)}</nav>
      <div className="hdr-act">
        <a className="hdr-tel" href={telHref(site.phones[0].tel)}><Icon name="phone" size={18} /><span>{site.phones[0].display}</span></a>
        {site.whatsapp && <a className="btn btn-sm gs-btn hdr-msg" href={waHref(site.whatsapp)} target="_blank" rel="noopener noreferrer"><Icon name="wa" size={18} /><span>Заказать</span></a>}
      </div>
    </div>
  </header>
}

/** Выбор перчаток: цвет, вес, фото. Заказ уходит в WhatsApp уже с моделью и весом. */
function Gloves({ site, shop }: { site: Site; shop: Shop }) {
  const [m, setM] = useState(shop.models[0])
  const [oz, setOz] = useState(defaultOz(shop.models[0]))
  const [ph, setPh] = useState(0)
  const [copied, setCopied] = useState(false)
  const pick = (x: Model) => { setM(x); setPh(0); setOz(w => (x.weights.includes(w) ? w : defaultOz(x))) }
  const photo = m.photos[Math.min(ph, m.photos.length - 1)]
  // Застёжка отдельно от цвета: иначе чёрно-белые на липучке и на шнуровке выглядят одинаковыми кружками.
  const closures = [...new Set(shop.models.map(x => x.closure))]
  const colors = shop.models.filter(x => x.closure === m.closure)
  const text = glovesText(shop.brand, m, oz)
  const copy = async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 3000) } catch { /* без буфера обмена */ } }
  return <div className="gl">
    <div className="gl-view">
      <figure className="gl-main tile"><Img key={photo.src} p={photo} /></figure>
      <div className="gl-thumbs" role="group" aria-label="Фото модели">
        {m.photos.map((p, i) => <button key={p.src} type="button" className="tile" aria-pressed={i === ph} onClick={() => setPh(i)} aria-label={`Фото ${i + 1}`}>
          <img src={asset(p.src)} alt="" width={p.w} height={p.h} loading="lazy" decoding="async" />
        </button>)}
      </div>
    </div>
    <div className="gl-card">
      <h3 className="gl-name">{m.name}</h3>
      <p className="gl-sub">{m.note}</p>
      {closures.length > 1 && <div className="gl-row">
        <span className="gl-label">Застёжка</span>
        <div className="gl-oz" role="group" aria-label="Застёжка">
          {closures.map(c => <button key={c} type="button" aria-pressed={c === m.closure} onClick={() => pick(shop.models.find(x => x.closure === c)!)}>{CLOSURE[c] ?? c}</button>)}
        </div>
      </div>}
      <div className="gl-row">
        <span className="gl-label">Цвет</span>
        <div className="gl-colors" role="group" aria-label="Цвет перчаток">
          {colors.map(x => <button key={x.id} type="button" aria-pressed={x.id === m.id} onClick={() => pick(x)} aria-label={x.name} title={x.name}
            style={{ background: `linear-gradient(135deg, ${x.colors[0]} 50%, ${x.colors[1] ?? x.colors[0]} 50%)` }} />)}
        </div>
      </div>
      <div className="gl-row">
        <span className="gl-label">Вес</span>
        <div className="gl-oz" role="group" aria-label="Вес перчаток">
          {m.weights.map(w => <button key={w} type="button" aria-pressed={w === oz} onClick={() => setOz(w)}>{w}</button>)}
        </div>
      </div>
      {shop.weights && <details className="gl-help">
        <summary>Как подобрать вес</summary>
        <table><tbody>{shop.weights.map(w => <tr key={w.oz}><th>{w.oz}</th><td>{w.text}</td></tr>)}</tbody></table>
        {shop.weightsNote && <p>{shop.weightsNote}</p>}
      </details>}
      <p className="gs-price">{m.price}</p>
      {site.whatsapp && <a className="btn gs-btn gl-buy" href={waHref(site.whatsapp, text)} target="_blank" rel="noopener noreferrer"><Icon name="wa" size={19} />Заказать в WhatsApp</a>}
      {site.telegram && <a className="gl-alt" href={tgHref(site.telegram)} target="_blank" rel="noopener noreferrer" onClick={copy}>
        {copied ? 'Текст заказа скопирован, вставьте его в чат' : 'Или напишите в Telegram'}
      </a>}
    </div>
  </div>
}

export function ShopPage({ site }: { site: Site }) {
  const shop = site.shop!
  const [hero, band] = site.photos
  const nav: [string, string][] = [['#gloves', 'Перчатки'], ['#gear', 'Экипировка'], ['#brand', 'О бренде'], ['#contacts', 'Контакты']]
  return <>
    <Header site={site} nav={nav} />
    <main>
      <section className="gs-hero" data-hero>
        <Img p={hero} eager className="gs-hero-img" />
        <div className="wrap gs-hero-in">
          <h1>{site.hero.title}</h1>
          <p className="gs-lead">{site.hero.lead}</p>
          <div className="gs-hero-act">
            <a className="btn gs-btn" href="#gloves">Выбрать перчатки</a>
            <a className="gs-link" href="#gear">Шлем, бинты, лапы</a>
          </div>
          <ul className="gs-facts">{site.facts.map(f => <li key={f.title}>{f.title}</li>)}</ul>
        </div>
      </section>

      <section className="gs-sec" id="gloves">
        <div className="wrap">
          <h2 className="gs-h2">Перчатки</h2>
          <Gloves site={site} shop={shop} />
        </div>
      </section>

      <section className="gs-sec gs-gear-sec" id="gear">
        <div className="wrap">
          <h2 className="gs-h2">Для зала и тренера</h2>
          <ul className="gear">
            {shop.gear.map(g => <li key={g.id}>
              {g.photo && <figure className="tile"><Img p={g.photo} /></figure>}
              <h3>{g.title}</h3>
              <p className="gear-text">{g.text}</p>
              {g.options && <p className="gear-opt">{g.options.join(', ')}</p>}
              <div className="gear-foot">
                <span className="gs-price">{g.price}</span>
                {site.whatsapp && <a className="btn btn-sm gs-btn-line" href={waHref(site.whatsapp, gearText(shop.brand, g.title))} target="_blank" rel="noopener noreferrer">Заказать</a>}
              </div>
            </li>)}
          </ul>
        </div>
      </section>

      <section className="gs-brand" id="brand">
        {band && <Img p={band} className="gs-brand-img" />}
        <div className="wrap gs-brand-in">
          <blockquote>{shop.quote}</blockquote>
          <div className="gs-about">
            {shop.about.map(a => <div key={a.title}><h3>{a.title}</h3><p>{a.text}</p></div>)}
          </div>
        </div>
      </section>

      <section className="gs-sec" id="clubs">
        <div className="wrap gs-clubs">
          <div>
            <h2 className="gs-h2">Примерить в клубе</h2>
            <p className="gs-muted">Перчатки GRATO SPORT есть в залах. Можно прийти на тренировку и надеть их до покупки.</p>
          </div>
          <div className="gs-club-list">
            {shop.clubs.map(c => <div key={c.area}>
              <h3>{c.area}</h3>
              <ul>{c.items.map(i => <li key={i.name}><b>{i.name}</b>{i.place && <span>{i.place}</span>}</li>)}</ul>
            </div>)}
          </div>
        </div>
      </section>

      <section className="gs-sec gs-contacts" id="contacts">
        <div className="wrap">
          <h2 className="gs-h2">Заказ и вопросы по размеру</h2>
          <p className="gs-muted gs-c-lead">Отвечаем в WhatsApp и Telegram. Отправляем по Москве, Петербургу и всей России.</p>
          <div className="gs-c-btns">
            {site.whatsapp && <a className="btn gs-btn" href={waHref(site.whatsapp)} target="_blank" rel="noopener noreferrer"><Icon name="wa" />WhatsApp</a>}
            {site.telegram && <a className="btn gs-btn-line" href={tgHref(site.telegram)} target="_blank" rel="noopener noreferrer"><Icon name="tg" />Telegram</a>}
          </div>
          <p className="gs-c-line"><a href={telHref(site.phones[0].tel)}>{site.phones[0].display}</a>{site.email && <a href={`mailto:${site.email}`}>{site.email}</a>}</p>
        </div>
      </section>
    </main>
    <footer className="gs-ftr">
      <div className="wrap gs-ftr-in">
        {site.logo && <img src={asset(site.logo.src)} alt={site.name} width={site.logo.w} height={site.logo.h} />}
        <p>{site.kind}{shop.owner ? `. ${shop.owner}` : ''}</p>
      </div>
    </footer>
    <MobileBar site={site} action="Выбрать перчатки" href="#gloves" />
  </>
}
