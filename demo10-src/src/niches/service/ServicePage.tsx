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
import { AlignStage } from './AlignStage'
import '../body/body.css'

export function serviceText(model: string, picked: string[]) {
  return [
    'Здравствуйте.',
    `Машина: ${model.trim() || 'напишу марку и год'}.`,
    picked.length ? `Что беспокоит: ${picked.join(', ').toLowerCase()}.` : 'Что беспокоит: опишу в сообщении.',
    'Когда можно приехать?',
  ].join('\n')
}

function Ask({ site }: { site: Site }) {
  const [model, setModel] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const text = serviceText(model, picked)
  const send = handoff(site, text)
  const copy = async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2500) } catch { /* без буфера обмена */ } }
  const toggle = (s: string) => setPicked(v => v.includes(s) ? v.filter(x => x !== s) : [...v, s])
  return <div className="picker" id="ask">
    <h2 className="picker-title">Что беспокоит</h2>
    <fieldset className="kinds">
      <legend>Отметьте, что заметили</legend>
      <div>{site.service?.symptoms.map(s => <button key={s} type="button" aria-pressed={picked.includes(s)} onClick={() => toggle(s)}>{s}</button>)}</div>
    </fieldset>
    <label className="model">Марка, модель и год
      <input value={model} onChange={e => setModel(e.target.value)} placeholder="Например, Toyota RAV4 2016" autoComplete="off" />
    </label>
    <div className="send">
      <a className="btn btn-accent" href={send.href} target="_blank" rel="noopener noreferrer" onClick={() => { if (send.copy) void copy() }}>
        <Icon name={send.icon} />{send.label}
      </a>
      <button type="button" className="btn btn-ghost" onClick={copy}><Icon name="copy" />{copied ? 'Текст скопирован' : 'Скопировать текст'}</button>
    </div>
    <p className="send-note">{send.intro} Мастер подскажет, что проверить, и назовёт время. Можно позвонить: <a href={telHref(site.phones[0].tel)}>{site.phones[0].display}</a></p>
  </div>
}

export function ServicePage({ site }: { site: Site }) {
  const nav: [string, string][] = [['#ask', 'Записаться'], ['#prices', 'Цены'], ['#services', 'Услуги'], ['#works', 'Фото'], ['#contacts', 'Контакты']]
  return <>
    <Header site={site} nav={nav} />
    <main>
      <section className="est" data-hero>
        <div className="wrap">
          <div className="est-head">
            <h1>{site.hero.title}</h1>
            <p className="lead">{site.hero.lead}</p>
            <RatingLine site={site} />
          </div>
          <div className="est-grid">
            <AlignStage site={site} />
            <Ask site={site} />
          </div>
        </div>
      </section>
      <Prices site={site} />
      <Services site={site} />
      <Facts site={site} />
      <Works site={site} title="Фото из сервиса" />
      <Praise site={site} />
      <Contacts site={site} />
    </main>
    <Footer site={site} nav={nav} />
    <MobileBar site={site} action="Записаться" href="#ask" />
  </>
}
