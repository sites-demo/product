import { useState } from 'react'
import type { Site } from '../../types'
import { Header } from '../../ui/Header'
import { Footer } from '../../ui/Footer'
import { Contacts } from '../../ui/Contacts'
import { MobileBar } from '../../ui/MobileBar'
import { RatingLine } from '../../ui/RatingLine'
import { Icon } from '../../ui/Icon'
import { Facts, Praise, Prices, Services, Works } from '../../ui/Sections'
import { handoff, telHref } from '../../ui/links'
import { HeadlightView } from './HeadlightView'
import { BeamTest } from './BeamTest'
import '../body/body.css'
import './headlight.css'

const NAV: [string, string][] = [['#ask', 'Узнать цену'], ['#beam', 'Как светит'], ['#inside', 'Что внутри фары'], ['#services', 'Услуги'], ['#works', 'Фото'], ['#contacts', 'Контакты']]

export function headlightText(model: string, issues: string[]) {
  return [
    'Здравствуйте. Хочу узнать цену по фарам.',
    `Машина: ${model.trim() || 'напишу марку и год'}.`,
    issues.length ? `Что не так: ${issues.join(', ').toLowerCase()}.` : 'Что не так: опишу и пришлю фото.',
    'Сейчас пришлю фото фар.',
  ].join('\n')
}

function Ask({ site }: { site: Site }) {
  const [model, setModel] = useState('')
  const [issues, setIssues] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const text = headlightText(model, issues)
  const send = handoff(site, text)
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2500) } catch { /* без буфера обмена */ }
  }
  const toggle = (s: string) => setIssues(v => v.includes(s) ? v.filter(x => x !== s) : [...v, s])
  return <div className="picker hl-ask" id="ask">
    <h2 className="picker-title">Узнать цену по фото</h2>
    <fieldset className="kinds">
      <legend>Что не так с фарами</legend>
      <div>{site.headlight?.issues.map(s => <button key={s} type="button" aria-pressed={issues.includes(s)} onClick={() => toggle(s)}>{s}</button>)}</div>
    </fieldset>
    <label className="model">Марка, модель и год
      <input value={model} onChange={e => setModel(e.target.value)} placeholder="Например, Kia Rio 2017" autoComplete="off" />
    </label>
    <div className="send">
      <a className="btn btn-accent" href={send.href} target="_blank" rel="noopener noreferrer" onClick={() => { if (send.copy) void copy() }}>
        <Icon name={send.icon} />{send.label}
      </a>
      <button type="button" className="btn btn-ghost" onClick={copy}><Icon name="copy" />{copied ? 'Текст скопирован' : 'Скопировать текст'}</button>
    </div>
    <p className="send-note">{send.intro} Добавьте фото фар днём и включённых вечером, мастер посмотрит и назовёт цену. Можно позвонить: <a href={telHref(site.phones[0].tel)}>{site.phones[0].display}</a></p>
  </div>
}

export function HeadlightPage({ site }: { site: Site }) {
  const nav = NAV.filter(([id]) => id !== '#works' || site.photos.length > 1)
  return <>
    <Header site={site} nav={nav} />
    <main>
      <section className="est hl-top" data-hero>
        <div className="wrap">
          <div className="est-head">
            <h1>{site.hero.title}</h1>
            <p className="lead">{site.hero.lead}</p>
            <RatingLine site={site} />
          </div>
          <div className="est-grid">
            <HeadlightView site={site} mode="hero" />
            <Ask site={site} />
          </div>
        </div>
      </section>

      <section className="section beam-sec" id="beam">
        <div className="wrap">
          <div className="section-head">
            <h2>Как фара светит на дорогу</h2>
            <p>Мутное стекло и старый отражатель рассеивают свет, и он уходит в глаза встречным. Линза даёт ровную границу: дорога видна дальше, встречных не слепит. Двигайте ползунок.</p>
          </div>
          <BeamTest />
        </div>
      </section>

      {site.headlight?.parts.length ? <section className="section inside-sec" id="inside">
        <div className="wrap">
          <div className="section-head">
            <h2>Что внутри фары и что с этим делаем</h2>
            <p>Нажмите на деталь, чтобы увидеть её в фаре.</p>
          </div>
          <HeadlightView site={site} mode="explode" parts={site.headlight.parts} clearDefault />
        </div>
      </section> : null}

      <Services site={site} />
      <Prices site={site} />
      <Facts site={site} />
      <Works site={site} title="Фото из мастерской" />
      <Praise site={site} />
      <Contacts site={site} />
    </main>
    <Footer site={site} nav={nav} />
    <MobileBar site={site} action="Узнать цену по фото" href="#ask" />
  </>
}
