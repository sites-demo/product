import { useState } from 'react'
import type { Site } from '../../types'
import { Icon } from '../../ui/Icon'
import { fmtNum, handoff, telHref } from '../../ui/links'

/** «от 1 500 ₽» → {n: 1500, from: true}. Цены без числа не складываем. */
export function parsePrice(p?: string) {
  if (!p) return null
  const m = p.replace(/ | /g, ' ').match(/^(от\s*)?(\d[\d ]*)\s*₽$/)
  return m ? { n: Number(m[2].replace(/ /g, '')), from: !!m[1] } : null
}

export function orderText(model: string, picked: string[]) {
  return [
    'Здравствуйте. Хочу записаться.',
    `Машина: ${model.trim() || 'напишу марку и модель'}.`,
    picked.length ? `Что нужно: ${picked.join(', ').toLowerCase()}.` : 'Что нужно: подскажите, что подойдёт.',
    'Когда можно приехать?',
  ].join('\n')
}

export function OrderBuilder({ site }: { site: Site }) {
  const [picked, setPicked] = useState<string[]>([])
  const [model, setModel] = useState('')
  const [copied, setCopied] = useState(false)
  const groups = [...new Set(site.services.map(s => s.group ?? ''))]
  const chosen = site.services.filter(s => picked.includes(s.title))
  const prices = chosen.map(s => parsePrice(s.price))
  const total = chosen.length && prices.every(Boolean) ? prices.reduce((a, p) => a + p!.n, 0) : null
  const from = prices.some(p => p?.from)
  const text = orderText(model, picked)
  const send = handoff(site, text)
  const toggle = (t: string) => setPicked(v => v.includes(t) ? v.filter(x => x !== t) : [...v, t])
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2500) } catch { /* без буфера обмена */ }
  }
  return <div className="order">
    <div className="order-list">
      {groups.map(g => <div key={g} className="order-group">
        {g && <h3>{g}</h3>}
        <ul>
          {site.services.filter(s => (s.group ?? '') === g).map(s => <li key={s.title}>
            <button type="button" aria-pressed={picked.includes(s.title)} onClick={() => toggle(s.title)}>
              <span className="order-box" aria-hidden="true" />
              <span className="order-name"><b>{s.title}</b>{s.text && <small>{s.text}</small>}</span>
              {s.price && <span className="order-price">{s.price}</span>}
            </button>
          </li>)}
        </ul>
      </div>)}
    </div>
    <aside className="picker order-side">
      <h3 className="picker-title">Ваш заказ</h3>
      {chosen.length ? <ul className="order-picked">{chosen.map(s => <li key={s.title}><span>{s.title}</span>{s.price && <span>{s.price}</span>}</li>)}</ul>
        : <p className="picked-empty">Выберите услуги в списке.</p>}
      {total !== null && <p className="order-total">По прайсу {from ? 'от ' : ''}{fmtNum(total)} ₽</p>}
      <label className="model">Марка и модель
        <input value={model} onChange={e => setModel(e.target.value)} placeholder="Например, Toyota Camry" autoComplete="off" />
      </label>
      <div className="send">
        <a className="btn btn-accent" href={send.href} target="_blank" rel="noopener noreferrer" onClick={() => { if (send.copy) void copy() }}>
          <Icon name={site.whatsapp ? 'wa' : 'tg'} />{send.label}
        </a>
        <button type="button" className="btn btn-ghost" onClick={copy}><Icon name="copy" />{copied ? 'Текст скопирован' : 'Скопировать текст'}</button>
      </div>
      <p className="send-note">Цена зависит от размера машины и того, насколько она грязная. Мастер уточнит и подскажет свободное время. Можно позвонить: <a href={telHref(site.phones[0].tel)}>{site.phones[0].display}</a></p>
    </aside>
  </div>
}
