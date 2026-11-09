import { useMemo, useState } from 'react'
import type { Site } from '../../types'
import type { PanelId } from '../../ui/car2d'
import { handoff, telHref } from '../../ui/links'
import { Icon } from '../../ui/Icon'
import { CarScheme } from './CarScheme'

const NAMES: Record<PanelId, string> = {
  bumperF: 'Передний бампер', bumperR: 'Задний бампер', hood: 'Капот', trunk: 'Крышка багажника', roof: 'Крыша',
  fenderFL: 'Переднее левое крыло', fenderFR: 'Переднее правое крыло',
  doorFL: 'Передняя левая дверь', doorFR: 'Передняя правая дверь',
  doorRL: 'Задняя левая дверь', doorRR: 'Задняя правая дверь',
  quarterRL: 'Заднее левое крыло', quarterRR: 'Заднее правое крыло',
  sillL: 'Левый порог', sillR: 'Правый порог', mirrorL: 'Левое зеркало', mirrorR: 'Правое зеркало',
}
const partName = (p: PanelId) => NAMES[p]

const GROUPS: [string, PanelId[]][] = [
  ['Спереди', ['bumperF', 'hood', 'fenderFL', 'fenderFR']],
  ['Слева', ['doorFL', 'doorRL', 'quarterRL', 'sillL', 'mirrorL']],
  ['Справа', ['doorFR', 'doorRR', 'quarterRR', 'sillR', 'mirrorR']],
  ['Сзади и сверху', ['bumperR', 'trunk', 'roof']],
]

const KINDS = ['Царапина', 'Скол', 'Вмятина', 'Трещина', 'После ДТП', 'Ржавчина']

const PAINTS = [
  { name: 'белый', hex: '#eceef0' }, { name: 'серебристый', hex: '#a9afb6' }, { name: 'серый', hex: '#5b6067' },
  { name: 'чёрный', hex: '#17191c' }, { name: 'красный', hex: '#9c171c' }, { name: 'синий', hex: '#1f3d78' },
]

// Цвет отметки: акцент сайта, если он не сливается с цветом машины.
function markColor(accent: string, paint: string) {
  const rgb = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
  const a = rgb(accent), b = rgb(paint)
  const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
  return d < 140 ? '#ffb21a' : accent
}

export function damageText(o: { model: string; paint: string; parts: PanelId[]; kinds: string[] }) {
  const lines = ['Здравствуйте. Хочу узнать цену кузовного ремонта.']
  lines.push(o.model.trim() ? `Машина: ${o.model.trim()}, цвет ${o.paint}.` : `Цвет машины: ${o.paint}.`)
  lines.push(o.parts.length ? `Что повреждено: ${o.parts.map(p => partName(p).toLowerCase()).join(', ')}.` : 'Что повреждено: покажу на фото.')
  if (o.kinds.length) lines.push(`Что случилось: ${o.kinds.map(k => k.toLowerCase()).join(', ')}.`)
  lines.push('Сейчас пришлю фото.')
  return lines.join('\n')
}

export function DamagePicker({ site, paintDefault = 1 }: { site: Site; paintDefault?: number }) {
  const [parts, setParts] = useState<PanelId[]>([])
  const [kinds, setKinds] = useState<string[]>([])
  const [paint, setPaint] = useState(PAINTS[paintDefault])
  const [model, setModel] = useState('')
  const [hover, setHover] = useState<PanelId | null>(null)
  const [copied, setCopied] = useState(false)

  const toggle = (p: PanelId) => setParts(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])

  const text = useMemo(() => damageText({ model, paint: paint.name, parts, kinds }), [model, paint, parts, kinds])
  const send = handoff(site, text)
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2500) } catch { /* без буфера обмена просто откроется чат */ }
  }

  return <div className="est-grid">
    <div className="stage stage-scheme">
      <p className="stage-hint" aria-live="polite">{hover ? partName(hover) : 'Нажмите на деталь, где повреждение. Можно несколько'}</p>
      <div className="scheme">
        <CarScheme paint={paint.hex} mark={markColor(site.theme.accent, paint.hex)} marked={parts} hover={hover} onPick={toggle} onHover={setHover} />
      </div>
      <div className="stage-tools">
        <div className="swatches" role="group" aria-label="Цвет машины">
          {PAINTS.map(c => <button key={c.hex} type="button" aria-pressed={paint.hex === c.hex} title={c.name} aria-label={`Цвет ${c.name}`} style={{ background: c.hex }} onClick={() => setPaint(c)} />)}
        </div>
      </div>
    </div>

    <form className="picker" onSubmit={e => e.preventDefault()}>
      <h2 className="picker-title">Что повреждено</h2>
      {parts.length ? <ul className="picked">
        {parts.map(p => <li key={p}><button type="button" onClick={() => toggle(p)} aria-label={`Убрать: ${partName(p)}`}>{partName(p)}<Icon name="close" size={16} /></button></li>)}
      </ul> : <p className="picked-empty">Нажмите на деталь на схеме или выберите списком. Можно несколько.</p>}

      <details className="parts">
        <summary>Выбрать деталь списком</summary>
        {GROUPS.map(([g, ids]) => <div key={g} className="parts-group">
          <p>{g}</p>
          <div>{ids.map(p => <button key={p} type="button" aria-pressed={parts.includes(p)} onClick={() => toggle(p)}>{partName(p)}</button>)}</div>
        </div>)}
      </details>

      <fieldset className="kinds">
        <legend>Что случилось</legend>
        <div>{KINDS.map(k => <button key={k} type="button" aria-pressed={kinds.includes(k)}
          onClick={() => setKinds(v => v.includes(k) ? v.filter(x => x !== k) : [...v, k])}>{k}</button>)}</div>
      </fieldset>

      <label className="model">
        <span>Марка и модель</span>
        <input value={model} onChange={e => setModel(e.target.value)} placeholder="Например, Kia Rio 2017" autoComplete="off" enterKeyHint="done" />
      </label>

      <div className="send">
        <a className="btn btn-accent" href={send.href} target="_blank" rel="noopener noreferrer" onClick={() => { if (send.copy) void copy() }}>
          <Icon name={send.icon} />{send.label}
        </a>
        <button type="button" className="btn btn-ghost" onClick={copy}><Icon name="copy" />{copied ? 'Текст скопирован' : 'Скопировать текст'}</button>
      </div>
      <p className="send-note">{send.intro} Добавьте 2 или 3 фото повреждения, мастер посмотрит и назовёт цену. Удобнее голосом: <a href={telHref(site.phones[0].tel)}>{site.phones[0].display}</a></p>
    </form>
  </div>
}
