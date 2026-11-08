import { useMemo, useState } from 'react'
import type { Site } from '../../types'
import { Icon } from '../../ui/Icon'
import { handoff, plural, telHref } from '../../ui/links'

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const human = (s: string) => new Date(s + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })

export function bookingText(o: { from: string; to: string; adults: number; kids: number; room: string }) {
  const nights = Math.round((new Date(o.to + 'T12:00:00').getTime() - new Date(o.from + 'T12:00:00').getTime()) / 864e5)
  const lines = ['Здравствуйте. Хочу забронировать номер.']
  if (o.from && o.to && nights > 0) lines.push(`Заезд ${human(o.from)}, выезд ${human(o.to)}, ${nights} ${plural(nights, 'ночь', 'ночи', 'ночей')}.`)
  else lines.push('Даты: подскажу.')
  lines.push(`Гостей: ${o.adults} ${plural(o.adults, 'взрослый', 'взрослых', 'взрослых')}${o.kids ? `, ${o.kids} ${plural(o.kids, 'ребёнок', 'ребёнка', 'детей')}` : ''}.`)
  lines.push(o.room ? `Номер: ${o.room}.` : 'Номер: помогите подобрать.')
  lines.push('Есть ли места и сколько будет стоить?')
  return lines.join('\n')
}

function Counter({ label, value, min, set }: { label: string; value: number; min: number; set: (n: number) => void }) {
  return <div className="cnt">
    <span>{label}</span>
    <div>
      <button type="button" onClick={() => set(Math.max(min, value - 1))} disabled={value <= min} aria-label={`${label}: меньше`}>−</button>
      <output aria-live="polite">{value}</output>
      <button type="button" onClick={() => set(Math.min(12, value + 1))} aria-label={`${label}: больше`}>+</button>
    </div>
  </div>
}

/** Панель брони: даты, гости и номер уходят готовым текстом в WhatsApp. Наличие мест не обещаем. */
export function Booking({ site }: { site: Site }) {
  const today = useMemo(() => new Date(), [])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [adults, setAdults] = useState(2)
  const [kids, setKids] = useState(0)
  const [room, setRoom] = useState('')
  const text = bookingText({ from, to, adults, kids, room })
  const send = handoff(site, text)
  const copy = async () => { try { await navigator.clipboard.writeText(text) } catch { /* без буфера обмена */ } }
  const min = iso(today)
  const minTo = from ? iso(new Date(new Date(from + 'T12:00:00').getTime() + 864e5)) : min
  return <form className="book" id="book" onSubmit={e => e.preventDefault()}>
    <div className="book-dates">
      <label>Заезд<input type="date" value={from} min={min} onChange={e => { setFrom(e.target.value); if (to && e.target.value >= to) setTo('') }} /></label>
      <label>Выезд<input type="date" value={to} min={minTo} onChange={e => setTo(e.target.value)} /></label>
    </div>
    <div className="book-guests">
      <Counter label="Взрослые" value={adults} min={1} set={setAdults} />
      <Counter label="Дети" value={kids} min={0} set={setKids} />
    </div>
    <label className="book-room">Номер
      <select value={room} onChange={e => setRoom(e.target.value)}>
        <option value="">Помогите подобрать</option>
        {site.hotel?.rooms.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
      </select>
    </label>
    <a className="btn btn-accent book-send" href={send.href} target="_blank" rel="noopener noreferrer" onClick={() => { if (send.copy) void copy() }}>
      <Icon name={site.whatsapp ? 'wa' : 'tg'} />Узнать про свободные номера
    </a>
    <p className="book-note">Администратор ответит, есть ли места на эти даты, и назовёт цену. Или позвоните: <a href={telHref(site.phones[0].tel)}>{site.phones[0].display}</a></p>
  </form>
}
