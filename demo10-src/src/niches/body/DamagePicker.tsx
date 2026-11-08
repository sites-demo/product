import { useEffect, useMemo, useRef, useState } from 'react'
import type { Site } from '../../types'
import type { BodyType, PanelId } from '../../three/car'
import type { CarScene } from '../../three/carScene'
import { handoff, telHref } from '../../ui/links'
import { Poster } from '../../ui/Poster'
import { Icon } from '../../ui/Icon'

const NAMES: Record<PanelId, string> = {
  bumperF: 'Передний бампер', bumperR: 'Задний бампер', hood: 'Капот', trunk: 'Крышка багажника', roof: 'Крыша',
  fenderFL: 'Переднее левое крыло', fenderFR: 'Переднее правое крыло',
  doorFL: 'Передняя левая дверь', doorFR: 'Передняя правая дверь',
  doorRL: 'Задняя левая дверь', doorRR: 'Задняя правая дверь',
  quarterRL: 'Заднее левое крыло', quarterRR: 'Заднее правое крыло',
  sillL: 'Левый порог', sillR: 'Правый порог', mirrorL: 'Левое зеркало', mirrorR: 'Правое зеркало',
}
const partName = (p: PanelId, body: BodyType) => (p === 'trunk' && body !== 'sedan' ? 'Дверь багажника' : NAMES[p])

// Куда повернуть машину, чтобы выбранная деталь была видна.
const VIEW: Record<PanelId, number> = {
  bumperF: -1.15, hood: -1.0, fenderFR: -0.45, doorFR: -0.1, doorRR: 0.15, quarterRR: 0.5, sillR: 0, mirrorR: -0.5,
  bumperR: 2.0, trunk: 2.1, quarterRL: 2.6, doorRL: 3.0, doorFL: 3.3, fenderFL: 3.6, sillL: Math.PI, mirrorL: 3.6, roof: -0.7,
}

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

const BODIES: [BodyType, string][] = [['sedan', 'Седан'], ['hatch', 'Хэтчбек'], ['crossover', 'Кроссовер']]

// Цвет отметки: акцент сайта, если он не сливается с цветом машины.
function markColor(accent: string, paint: string) {
  const rgb = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
  const a = rgb(accent), b = rgb(paint)
  const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
  return d < 140 ? '#ffb21a' : accent
}

export function damageText(o: { model: string; body: BodyType; paint: string; parts: PanelId[]; kinds: string[] }) {
  const body = BODIES.find(b => b[0] === o.body)![1].toLowerCase()
  const lines = ['Здравствуйте. Хочу узнать цену кузовного ремонта.']
  lines.push(`Машина: ${o.model.trim() || body}, цвет ${o.paint}.`)
  lines.push(o.parts.length ? `Что повреждено: ${o.parts.map(p => partName(p, o.body).toLowerCase()).join(', ')}.` : 'Что повреждено: покажу на фото.')
  if (o.kinds.length) lines.push(`Что случилось: ${o.kinds.map(k => k.toLowerCase()).join(', ')}.`)
  lines.push('Сейчас пришлю фото.')
  return lines.join('\n')
}

export function DamagePicker({ site, paintDefault = 1 }: { site: Site; paintDefault?: number }) {
  const host = useRef<HTMLDivElement>(null)
  const scene = useRef<CarScene | null>(null)
  const [state, setState] = useState<'wait' | 'ready' | 'fail'>('wait')
  const [parts, setParts] = useState<PanelId[]>([])
  const [kinds, setKinds] = useState<string[]>([])
  const [body, setBody] = useState<BodyType>(site.car?.type ?? 'sedan')
  const [paint, setPaint] = useState(PAINTS[paintDefault])
  const [model, setModel] = useState('')
  const [hover, setHover] = useState<PanelId | null>(null)
  const [copied, setCopied] = useState(false)
  const last = useRef<PanelId | null>(null)

  const toggle = (p: PanelId) => setParts(prev => {
    if (prev.includes(p)) return prev.filter(x => x !== p)
    last.current = p
    return [...prev, p]
  })

  // 3D грузится отдельно, страница при этом уже работает: список деталей есть и без него.
  useEffect(() => {
    let dead = false
    let s: CarScene | undefined
    const el = host.current
    if (!el) return
    import('../../three/carScene').then(({ createCarScene }) => {
      if (dead) return
      try {
        s = createCarScene(el, {
          type: body, paint: paint.hex, accent: markColor(site.theme.accent, paint.hex),
          dark: site.theme.dark, onPick: toggle, onHover: setHover,
        })
        scene.current = s
        s.setMarked(parts)
        setState('ready')
      } catch {
        setState('fail')
      }
    }, () => setState('fail'))
    return () => { dead = true; s?.destroy(); scene.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body])

  useEffect(() => {
    const s = scene.current
    if (!s) return
    s.setMarked(parts)
    if (last.current && parts.includes(last.current)) { s.flash(last.current); last.current = null }
  }, [parts, state])

  useEffect(() => {
    scene.current?.setPaint(paint.hex)
  }, [paint])

  const pickFromList = (p: PanelId) => {
    toggle(p)
    scene.current?.turnTo(VIEW[p])
  }

  const text = useMemo(() => damageText({ model, body, paint: paint.name, parts, kinds }), [model, body, paint, parts, kinds])
  const send = handoff(site, text)
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2500) } catch { /* без буфера обмена просто откроется чат */ }
  }

  return <div className="est-grid">
    <div className={'stage stage-' + state}>
      <div className={'stage-canvas' + (site.posters?.includes('car') ? ' has-poster' : '') + (state === 'ready' ? ' ready' : '')} ref={host} aria-label="Машина в 3D. Покрутите её и нажмите на деталь, где повреждение. Детали можно выбрать и списком ниже." role="img"><Poster site={site} name="car" /></div>
      {state === 'wait' && !site.posters?.includes('car') && <div className="stage-wait" aria-hidden="true"><span /></div>}
      <p className="stage-hint" aria-live="polite">{state === 'fail'
        ? 'Объёмная модель не открылась на этом устройстве. Выберите детали списком.'
        : hover ? partName(hover, body) : 'Покрутите машину и нажмите на деталь, где повреждение'}</p>
      <div className="stage-tools">
        <div className="seg" role="group" aria-label="Кузов">
          {BODIES.map(([id, label]) => <button key={id} type="button" aria-pressed={body === id} onClick={() => setBody(id)}>{label}</button>)}
        </div>
        <div className="swatches" role="group" aria-label="Цвет машины">
          {PAINTS.map(c => <button key={c.hex} type="button" aria-pressed={paint.hex === c.hex} title={c.name} aria-label={`Цвет ${c.name}`} style={{ background: c.hex }} onClick={() => setPaint(c)} />)}
        </div>
      </div>
    </div>

    <form className="picker" onSubmit={e => e.preventDefault()}>
      <h2 className="picker-title">Что повреждено</h2>
      {parts.length ? <ul className="picked">
        {parts.map(p => <li key={p}><button type="button" onClick={() => toggle(p)} aria-label={`Убрать: ${partName(p, body)}`}>{partName(p, body)}<Icon name="close" size={16} /></button></li>)}
      </ul> : <p className="picked-empty">Нажмите на деталь на машине или выберите списком. Можно несколько.</p>}

      <details className="parts">
        <summary>Выбрать деталь списком</summary>
        {GROUPS.map(([g, ids]) => <div key={g} className="parts-group">
          <p>{g}</p>
          <div>{ids.map(p => <button key={p} type="button" aria-pressed={parts.includes(p)} onClick={() => pickFromList(p)}>{partName(p, body)}</button>)}</div>
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
          <Icon name={site.whatsapp ? 'wa' : 'tg'} />{send.label}
        </a>
        <button type="button" className="btn btn-ghost" onClick={copy}><Icon name="copy" />{copied ? 'Текст скопирован' : 'Скопировать текст'}</button>
      </div>
      <p className="send-note">Откроется чат с готовым текстом. Добавьте 2 или 3 фото повреждения, мастер посмотрит и назовёт цену. Удобнее голосом: <a href={telHref(site.phones[0].tel)}>{site.phones[0].display}</a></p>
    </form>
  </div>
}
