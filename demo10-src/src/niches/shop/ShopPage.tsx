import { useEffect, useState } from 'react'
import type { Site } from '../../types'
import { Icon } from '../../ui/Icon'
import { MobileBar } from '../../ui/MobileBar'
import { asset, telHref, tgHref, waHref } from '../../ui/links'
import './shop.css'

type Shop = NonNullable<Site['shop']>
type Model = Shop['models'][number]

export const glovesText = (brand: string, m: Model, oz: string) => [
  `Здравствуйте. Хочу заказать перчатки ${brand}.`,
  `Модель: ${m.name.toLowerCase()}, ${m.closure}.`,
  `Вес: ${oz}.`,
  'Как оплатить и получить?',
].join('\n')

const gearText = (brand: string, title: string) => `Здравствуйте. Хочу заказать ${brand}: ${title.toLowerCase()}.\nЕсть в наличии?`

/** Две кнопки заказа: WhatsApp с готовым текстом, Telegram (текст копируется). */
function OrderButtons({ site, text, main = 'Заказать в WhatsApp' }: { site: Site; text: string; main?: string }) {
  const [copied, setCopied] = useState(false)
  const tg = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 3000) } catch { /* без буфера обмена */ }
  }
  return <div className="ord-btns">
    {site.whatsapp && <a className="btn btn-accent" href={waHref(site.whatsapp, text)} target="_blank" rel="noopener noreferrer"><Icon name="wa" size={19} />{main}</a>}
    {site.telegram && <a className="btn btn-ghost" href={tgHref(site.telegram)} target="_blank" rel="noopener noreferrer" onClick={tg}><Icon name="tg" size={19} />{copied ? 'Текст скопирован' : 'Telegram'}</a>}
  </div>
}

function Price({ price, old }: { price: string; old?: string }) {
  return <p className="price"><b>{price}</b>{old && <s>{old}</s>}</p>
}

function Header({ site, nav }: { site: Site; nav: [string, string][] }) {
  const phone = site.phones[0]
  return <header className="hdr shop-hdr" id="top">
    <div className="wrap hdr-in">
      <a className="brand" href="#top" aria-label={`${site.name}, в начало страницы`}>
        {site.logo ? <img src={asset(site.logo.src)} alt="" width={site.logo.w} height={site.logo.h} style={site.logo.height ? { height: site.logo.height } : undefined} /> : <span className="brand-name">{site.name}</span>}
      </a>
      <nav className="hdr-nav" aria-label="Разделы">{nav.map(([h, l]) => <a key={h} href={h}>{l}</a>)}</nav>
      <div className="hdr-act">
        <a className="hdr-tel" href={telHref(phone.tel)}><Icon name="phone" size={18} /><span>{phone.display}</span></a>
        {site.whatsapp && <a className="btn btn-sm btn-accent hdr-msg" href={waHref(site.whatsapp)} target="_blank" rel="noopener noreferrer"><Icon name="wa" size={18} /><span>Заказать</span></a>}
      </div>
    </div>
  </header>
}

function Gloves({ site, shop }: { site: Site; shop: Shop }) {
  const [id, setId] = useState(shop.models[0].id)
  const m = shop.models.find(x => x.id === id) ?? shop.models[0]
  const [oz, setOz] = useState(m.weights.includes('12 oz') ? '12 oz' : m.weights[0])
  const [ph, setPh] = useState(0)
  useEffect(() => { setPh(0); setOz(w => m.weights.includes(w) ? w : (m.weights.includes('12 oz') ? '12 oz' : m.weights[0])) }, [id])
  const photo = m.photos[Math.min(ph, m.photos.length - 1)]
  return <div className="gl">
    <div className="gl-view">
      <figure className="gl-main">
        <img key={photo.src} src={asset(photo.src)} alt={photo.alt} width={photo.w} height={photo.h} decoding="async" />
      </figure>
      {m.photos.length > 1 && <div className="gl-thumbs" role="group" aria-label="Фото модели">
        {m.photos.map((p, i) => <button key={p.src} type="button" aria-pressed={i === ph} onClick={() => setPh(i)} aria-label={`Фото ${i + 1}`}>
          <img src={asset(p.src)} alt="" width={p.w} height={p.h} loading="lazy" decoding="async" />
        </button>)}
      </div>}
    </div>
    <div className="gl-card">
      <p className="gl-step">Цвет</p>
      <div className="gl-colors" role="group" aria-label="Цвет перчаток">
        {shop.models.map(x => <button key={x.id} type="button" aria-pressed={x.id === m.id} onClick={() => setId(x.id)} title={x.name}>
          <span className="dot" style={{ background: `linear-gradient(135deg, ${x.colors[0]} 50%, ${x.colors[1] ?? x.colors[0]} 50%)` }} />
          <span>{x.short}</span>
        </button>)}
      </div>
      <h3 className="gl-name">{m.name}</h3>
      <p className="muted">{m.closure[0].toUpperCase() + m.closure.slice(1)}{m.note ? `. ${m.note}` : ''}</p>
      <p className="gl-step">Вес</p>
      <div className="seg" role="group" aria-label="Вес перчаток">
        {m.weights.map(w => <button key={w} type="button" aria-pressed={w === oz} onClick={() => setOz(w)}>{w}</button>)}
      </div>
      {shop.weights && <a className="gl-help" href="#weight">Какой вес выбрать</a>}
      <Price price={m.price} old={m.old} />
      <OrderButtons site={site} text={glovesText(shop.brand, m, oz)} />
      <p className="gl-note muted">Откроется чат с готовым сообщением: модель и вес уже вписаны.</p>
    </div>
  </div>
}

export function ShopPage({ site }: { site: Site }) {
  const shop = site.shop!
  const hero = site.photos[0]
  const nav: [string, string][] = [['#gloves', 'Перчатки'], ...(shop.weights ? [['#weight', 'Какой вес'] as [string, string]] : []), ['#gear', 'Экипировка'], ['#clubs', 'Где примерить'], ['#contacts', 'Контакты']]
  const first = shop.models[0]
  return <>
    <Header site={site} nav={nav} />
    <main>
      <section className="sh-hero" data-hero>
        <img className="sh-hero-img" src={asset(hero.src)} alt={hero.alt} width={hero.w} height={hero.h} fetchPriority="high" decoding="async" />
        <div className="wrap sh-hero-in">
          <h1>{site.hero.title}</h1>
          <p className="lead">{site.hero.lead}</p>
          <div className="sh-hero-row">
            <Price price={first.price} old={first.old} />
            <a className="btn btn-accent" href="#gloves">Выбрать перчатки</a>
          </div>
        </div>
      </section>

      <section className="sh-strip" aria-label="Коротко">
        <div className="wrap sh-strip-in">
          {site.facts.map(f => <div key={f.title}><b>{f.title}</b><span>{f.text}</span></div>)}
        </div>
      </section>

      <section className="section" id="gloves">
        <div className="wrap">
          <div className="section-head">
            <h2>Перчатки</h2>
            <p>Выберите цвет и вес. Заказ уйдёт нам в чат, ответим и подскажем по размеру.</p>
          </div>
          <Gloves site={site} shop={shop} />
        </div>
      </section>

      {shop.weights && <section className="section sh-weight" id="weight">
        <div className="wrap">
          <div className="section-head">
            <h2>Какой вес выбрать</h2>
            {shop.weightsNote && <p>{shop.weightsNote}</p>}
          </div>
          <ul className="wt">
            {shop.weights.map(w => <li key={w.oz}><b>{w.oz}</b><p>{w.text}</p></li>)}
          </ul>
        </div>
      </section>}

      <section className="section" id="gear">
        <div className="wrap">
          <div className="section-head">
            <h2>Экипировка для зала и тренера</h2>
          </div>
          <ul className="gear">
            {shop.gear.map(g => <li key={g.id}>
              {g.photo && <figure><img src={asset(g.photo.src)} alt={g.photo.alt} width={g.photo.w} height={g.photo.h} loading="lazy" decoding="async" /></figure>}
              <div className="gear-body">
                <h3>{g.title}</h3>
                <p className="muted">{g.text}</p>
                {g.options && <p className="gear-opt">{g.options.join(' · ')}</p>}
                <Price price={g.price} old={g.old} />
                <OrderButtons site={site} text={gearText(shop.brand, g.title)} main="Заказать" />
              </div>
            </li>)}
          </ul>
        </div>
      </section>

      {site.photos.length > 2 && <section className="sh-wall" aria-label="Фото">
        {site.photos.slice(1, 7).map(p => <figure key={p.src}><img src={asset(p.src)} alt={p.alt} width={p.w} height={p.h} loading="lazy" decoding="async" /></figure>)}
      </section>}

      <section className="section" id="clubs">
        <div className="wrap">
          <div className="section-head">
            <h2>Где примерить и купить вживую</h2>
            <p>Наши перчатки продаются в боксёрских клубах. Можно прийти на тренировку и надеть их до покупки.</p>
          </div>
          <div className="clubs">
            {shop.clubs.map(c => <div key={c.area}>
              <h3>{c.area}</h3>
              <ul>{c.items.map(i => <li key={i.name + (i.place ?? '')}><b>{i.name}</b>{i.place && <span className="muted">{i.place}</span>}</li>)}</ul>
            </div>)}
          </div>
        </div>
      </section>

      <section className="section sh-about">
        <div className="wrap">
          <div className="facts">
            {shop.about.map(a => <div className="fact" key={a.title}><h3>{a.title}</h3><p>{a.text}</p></div>)}
          </div>
        </div>
      </section>

      <section className="section sh-contacts" id="contacts">
        <div className="wrap">
          <h2>Заказать или спросить про размер</h2>
          <p className="muted sh-c-lead">Отвечаем в WhatsApp и Telegram. Можно позвонить или написать на почту.</p>
          <div className="contact-btns">
            {site.whatsapp && <a className="btn btn-accent" href={waHref(site.whatsapp)} target="_blank" rel="noopener noreferrer"><Icon name="wa" />WhatsApp</a>}
            {site.telegram && <a className="btn btn-ghost" href={tgHref(site.telegram)} target="_blank" rel="noopener noreferrer"><Icon name="tg" />Telegram</a>}
            <a className="btn btn-ghost" href={telHref(site.phones[0].tel)}><Icon name="phone" />{site.phones[0].display}</a>
          </div>
          {site.email && <p><a href={`mailto:${site.email}`}>{site.email}</a></p>}
        </div>
      </section>
    </main>
    <footer className="ftr">
      <div className="wrap sh-ftr">
        {site.logo ? <img src={asset(site.logo.src)} alt={site.name} width={site.logo.w} height={site.logo.h} className="sh-ftr-logo" /> : <b>{site.name}</b>}
        <p>{site.kind}</p>
        {shop.owner && <p>{shop.owner}</p>}
      </div>
    </footer>
    <MobileBar site={site} action="Выбрать перчатки" href="#gloves" />
  </>
}
