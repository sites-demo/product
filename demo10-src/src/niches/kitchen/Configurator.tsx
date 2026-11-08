import { useEffect, useMemo, useRef, useState } from 'react'
import type { Site } from '../../types'
import type { KitchenConfig, KitchenScene, Layout } from '../../three/kitchen'
import { handoff, telHref } from '../../ui/links'
import { Icon } from '../../ui/Icon'
import { Poster } from '../../ui/Poster'

const LAYOUTS: [Layout, string][] = [['straight', 'Прямая'], ['corner', 'Угловая'], ['u', 'П-образная'], ['island', 'С островом']]
const fmt = (m: number) => m.toFixed(1).replace('.', ',') + ' м'

export function kitchenText(c: KitchenConfig, names: { facade: string; counter: string }) {
  const layout = LAYOUTS.find(l => l[0] === c.layout)![1].toLowerCase()
  const size = c.layout === 'corner' || c.layout === 'u' ? `${fmt(c.a)} и ${fmt(c.b)}` : fmt(c.a)
  return [
    'Здравствуйте. Хочу рассчитать кухню.',
    `Планировка: ${layout}, ${size}.`,
    `Фасады: ${names.facade.toLowerCase()}.`,
    `Столешница: ${names.counter.toLowerCase()}.`,
    `Верхние шкафы: ${c.uppers ? 'да' : 'нет'}. Ручки: ${c.handles === 'gola' ? 'скрытые' : 'обычные'}.`,
    'Пришлю размеры и фото помещения.',
  ].join('\n')
}

export function Configurator({ site }: { site: Site }) {
  const k = site.kitchen!
  const host = useRef<HTMLDivElement>(null)
  const scene = useRef<KitchenScene | null>(null)
  const [state, setState] = useState<'wait' | 'ready' | 'fail'>('wait')
  const [layout, setLayout] = useState<Layout>('corner')
  const [a, setA] = useState(3.2)
  const [b, setB] = useState(2.2)
  const [fi, setFi] = useState(0)
  const [ci, setCi] = useState(0)
  const [uppers, setUppers] = useState(true)
  const [handles, setHandles] = useState<'gola' | 'bar'>('gola')
  const [copied, setCopied] = useState(false)

  const config = useMemo<KitchenConfig>(() => ({
    layout, a, b, uppers, handles,
    facade: { hex: k.facades[fi].hex, finish: k.facades[fi].finish },
    counter: { hex: k.counters[ci].hex, kind: k.counters[ci].kind },
  }), [layout, a, b, fi, ci, uppers, handles, k])

  useEffect(() => {
    const el = host.current
    if (!el) return
    let dead = false
    let s: KitchenScene | undefined
    import('../../three/kitchen').then(({ createKitchenScene }) => {
      if (dead) return
      try {
        s = createKitchenScene(el, config)
        scene.current = s
        setState('ready')
      } catch { setState('fail') }
    }, () => setState('fail'))
    return () => { dead = true; s?.destroy(); scene.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Перестраиваем сцену не на каждый шаг ползунка, а когда пользователь остановился.
  useEffect(() => {
    const t = setTimeout(() => scene.current?.set(config), 60)
    return () => clearTimeout(t)
  }, [config])

  const text = kitchenText(config, { facade: k.facades[fi].name, counter: k.counters[ci].name })
  const send = handoff(site, text)
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2500) } catch { /* без буфера откроется чат */ }
  }
  const twoWalls = layout === 'corner' || layout === 'u'

  return <div className="cfg">
    <div className={'cfg-stage cfg-' + state}>
      <div className={'cfg-canvas' + (site.posters?.includes('kitchen') ? ' has-poster' : '') + (state === 'ready' ? ' ready' : '')} ref={host} role="img" aria-label="Кухня в 3D: меняется вместе с выбором справа. Её можно повернуть пальцем."><Poster site={site} name="kitchen" /></div>
      {state === 'fail' && <p className="cfg-fail">Объёмная модель не открылась на этом устройстве, но выбор ниже всё равно попадёт в сообщение.</p>}
    </div>
    <form className="cfg-panel" onSubmit={e => e.preventDefault()}>
      <fieldset>
        <legend>Планировка</legend>
        <div className="opts">{LAYOUTS.map(([id, label]) => <button key={id} type="button" aria-pressed={layout === id} onClick={() => setLayout(id)}>{label}</button>)}</div>
      </fieldset>
      <label className="range">
        <span>{twoWalls ? 'Длина основной стены' : 'Длина кухни'}<b>{fmt(a)}</b></span>
        <input type="range" min={1.8} max={4.6} step={0.1} value={a} onChange={e => setA(Number(e.target.value))} />
      </label>
      {twoWalls && <label className="range">
        <span>{layout === 'u' ? 'Длина боковых стен' : 'Длина боковой стены'}<b>{fmt(b)}</b></span>
        <input type="range" min={1.4} max={3.4} step={0.1} value={b} onChange={e => setB(Number(e.target.value))} />
      </label>}
      <fieldset>
        <legend>Фасады <span>{k.facades[fi].name}</span></legend>
        <div className="sw">{k.facades.map((f, i) => <button key={f.name} type="button" aria-pressed={fi === i} aria-label={f.name} title={f.name}
          className={f.finish === 'wood' ? 'wood' : ''} style={{ background: f.hex }} onClick={() => setFi(i)} />)}</div>
      </fieldset>
      <fieldset>
        <legend>Столешница <span>{k.counters[ci].name}</span></legend>
        <div className="sw">{k.counters.map((c, i) => <button key={c.name} type="button" aria-pressed={ci === i} aria-label={c.name} title={c.name}
          className={c.kind} style={{ background: c.hex }} onClick={() => setCi(i)} />)}</div>
      </fieldset>
      <div className="opts two">
        <button type="button" aria-pressed={uppers} onClick={() => setUppers(v => !v)}>{uppers ? 'Верхние шкафы есть' : 'Без верхних шкафов'}</button>
        <button type="button" aria-pressed={handles === 'gola'} onClick={() => setHandles(h => h === 'gola' ? 'bar' : 'gola')}>{handles === 'gola' ? 'Скрытые ручки' : 'Обычные ручки'}</button>
      </div>
      <div className="send">
        <a className="btn btn-accent" href={send.href} target="_blank" rel="noopener noreferrer" onClick={() => { if (send.copy) void copy() }}>
          <Icon name={site.whatsapp ? 'wa' : 'tg'} />{site.whatsapp ? 'Отправить проект в WhatsApp' : send.label}
        </a>
        <button type="button" className="btn btn-ghost" onClick={copy}><Icon name="copy" />{copied ? 'Текст скопирован' : 'Скопировать текст'}</button>
      </div>
      <p className="send-note">Это набросок, а не расчёт. {k.who ?? 'Дизайнер'} посмотрит размеры и фото помещения и назовёт цену. Можно позвонить: <a href={telHref(site.phones[0].tel)}>{site.phones[0].display}</a></p>
    </form>
  </div>
}
