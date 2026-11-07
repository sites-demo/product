import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { HOURLY, ITEMS, PRESETS, img } from '../data'
import { cargoText, copyAndOpen, HELLO, useMove, type Mode } from '../move'
import { fmtM3, summary } from '../pack'
import { Icon } from './Icon'

const Truck3D = lazy(() => import('../three/Truck3D'))

class Guard extends Component<{ onFail: () => void; children: ReactNode }, { bad: boolean }> {
  state = { bad: false }
  static getDerivedStateFromError() {
    return { bad: true }
  }
  componentDidCatch() {
    this.props.onFail()
  }
  render() {
    return this.state.bad ? null : this.props.children
  }
}

function canRun3D() {
  const q = new URLSearchParams(location.search)
  if (q.has('3d')) return true
  if (q.has('no3d')) return false
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number }
  if (nav.connection?.saveData) return false
  if (nav.deviceMemory && nav.deviceMemory <= 2) return false
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

const TABS: { m: Mode; label: string; short: string }[] = [...PRESETS.map((p) => ({ m: p.id as Mode, label: p.label, short: p.short })), { m: 'own', label: 'Свой список', short: 'Свой список' }]

export function Packer() {
  const { mode, setMode, counts, setCount, clear, est } = useMove()
  const stage = useRef<HTMLDivElement>(null)
  const drag = useRef(0)
  const wake = useRef<(() => void) | null>(null)
  const pointer = useRef<{ x: number; w: number; lim: number } | null>(null)
  const [live, setLive] = useState(false)
  const [ready, setReady] = useState(false)
  const [active, setActive] = useState(true)
  const [still, setStill] = useState(false)
  const [copied, setCopied] = useState(false)
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])

  useEffect(() => {
    setStill(matchMedia('(prefers-reduced-motion: reduce)').matches)
    const el = stage.current as HTMLDivElement
    const vis = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { threshold: 0.02 })
    vis.observe(el)
    if (!canRun3D()) return () => vis.disconnect()
    const go = () => setLive(true)
    if (document.readyState === 'complete') setTimeout(go, 60)
    else addEventListener('load', () => setTimeout(go, 60), { once: true })
    return () => vis.disconnect()
  }, [])

  const s = summary(est)
  const truck = est.truck
  const fill = est.kind === 'over' ? 100 : Math.min(100, Math.round((est.space / truck.id) * 100))
  const cargo = cargoText(mode, counts, est)
  const send = async () => {
    await copyAndOpen([HELLO, cargo && `Что везём: ${cargo}`].filter(Boolean).join('\n'))
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(false), 6000)
  }
  const release = () => {
    pointer.current = null
    drag.current = 0
    wake.current?.()
  }

  return (
    <div className="packer" id="kuzov">
      <div className="pk-head">
        <h2 className="pk-h">Какая машина вам нужна</h2>
        <p className="pk-sub">Выберите квартиру или соберите свой список, вещи сами встанут в кузов.</p>
      </div>

      <div className="pk-tabs" role="tablist" aria-label="Что перевозим">
        {TABS.map((t) => (
          <button key={String(t.m)} type="button" role="tab" aria-selected={mode === t.m} className={mode === t.m ? 'on' : ''} onClick={() => setMode(t.m)}>
            <span className="long">{t.label}</span>
            <span className="short">{t.short}</span>
          </button>
        ))}
      </div>

      <div
        ref={stage}
        className={'stage' + (ready ? ' ready' : '')}
        onPointerDown={(e) => {
          // Пальцем крутим меньше, чтобы кузов не уходил боком при прокрутке страницы.
          pointer.current = { x: e.clientX, w: e.currentTarget.clientWidth, lim: e.pointerType === 'touch' ? 0.3 : 0.5 }
        }}
        onPointerMove={(e) => {
          if (!pointer.current) return
          const { x, w, lim } = pointer.current
          drag.current = Math.max(-lim, Math.min(lim, ((e.clientX - x) / w) * 1.6))
          wake.current?.()
        }}
        onPointerUp={release}
        onPointerLeave={release}
        onPointerCancel={release}
      >
        <img className="poster" src={img('truck.webp')} alt="Кузов машины в разрезе, внутри стоят мебель и коробки" width={1400} height={900} fetchPriority="high" />
        {live && (
          <Guard onFail={() => setLive(false)}>
            <Suspense fallback={null}>
              <Truck3D
                placed={est.placed}
                size={truck.size}
                drag={drag}
                wake={wake}
                active={active}
                still={still}
                onReady={() => setReady(true)}
                onLost={() => {
                  setReady(false)
                  setLive(false)
                }}
              />
            </Suspense>
          </Guard>
        )}
      </div>

      {mode === 'own' && (
        <div className="own">
          <ul className="own-list">
            {ITEMS.map((i) => {
              const n = counts[i.id] ?? 0
              return (
                <li key={i.id} className={n ? 'has' : ''}>
                  <span className="own-n">{i.id === 'box' ? 'Коробки' : i.name}</span>
                  <span className="stepper">
                    <button type="button" aria-label={`Убрать: ${i.name}`} disabled={n === 0} onClick={() => setCount(i.id, n - (i.id === 'box' && n >= 10 ? 5 : 1))}>
                      <Icon name="minus" />
                    </button>
                    <output>{n}</output>
                    <button type="button" aria-label={`Добавить: ${i.name}`} disabled={n >= i.max} onClick={() => setCount(i.id, n + (i.id === 'box' && n >= 5 ? 5 : 1))}>
                      <Icon name="plus" />
                    </button>
                  </span>
                </li>
              )
            })}
          </ul>
          <button type="button" className="own-clear" onClick={clear}>
            Очистить кузов
          </button>
        </div>
      )}

      <div className="pk-result">
        <div className="readout" aria-live="polite">
          <b>{s.head}</b>
          <span>{s.line}</span>
        </div>
        {est.kind === 'truck' && (
          <p className="price">
            <span>По прайсу</span>
            <b>{truck.price}</b>
          </p>
        )}
        {est.kind === 'small' && (
          <p className="price">
            <span>В час</span>
            <b>{HOURLY.price}</b>
          </p>
        )}
        {est.kind === 'over' && <p className="price price-ask">Цену назовём по фото</p>}
        <div className="meter" hidden={est.kind === 'empty'}>
          <div className={'bar' + (est.kind === 'over' ? ' over' : '')}>
            <i style={{ width: `${fill}%` }} />
          </div>
          <p className="meter-line">
            <span>
              Вещи займут около <b>{fmtM3(est.space)} м³</b>
              {est.kind !== 'empty' && est.kind !== 'over' && <> из {truck.id}</>}
            </span>
            {est.kind === 'over' && <span className="meter-over">Не помещается</span>}
          </p>
        </div>
        <div className="pk-send">
          <button type="button" className="btn btn-main" onClick={send} disabled={est.kind === 'empty'}>
            <Icon name="tg" />
            Скопировать расчёт и открыть Telegram
          </button>
          <p className={'pk-hint' + (copied ? ' ok' : '')} aria-live="polite">
            {copied ? 'Текст скопирован, вставьте его в чат.' : 'Останется вставить текст в чат.'}{' '}
            <a href="#zayavka">Добавить адреса и дату</a>
          </p>
        </div>
      </div>
      <p className="pk-note">Для 1–4 комнат в кузове типичный набор вещей, свой соберите во вкладке «Свой список». Объём примерный, этаж и лифт здесь не учтены. Сумму назовёт менеджер, а если вещей окажется больше, сначала согласует это с вами.</p>
    </div>
  )
}
