import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { BASE, HANDLE_ANCHOR, HOTSPOTS, PHONE, TEL, type PartId } from '../data'

const Valve3D = lazy(() => import('../three/Valve3D'))

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

function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

// Сцену включаем сами только там, где она не будет тормозить. Иначе остаётся постер той же модели.
function canAutoStart() {
  const q = new URLSearchParams(location.search)
  if (q.has('3d')) return true
  if (q.has('no3d') || matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string }
    deviceMemory?: number
  }
  if (nav.connection?.saveData || /2g|3g/.test(nav.connection?.effectiveType || '')) return false
  if (nav.deviceMemory && nav.deviceMemory <= 2) return false
  try {
    const c = document.createElement('canvas')
    const opts = { failIfMajorPerformanceCaveat: true }
    return !!(c.getContext('webgl2', opts) || c.getContext('webgl', opts))
  } catch {
    return false
  }
}

const css = (x: number, y: number) => ({ '--x': x, '--y': y }) as React.CSSProperties

export function WaterNode() {
  const stage = useRef<HTMLDivElement>(null)
  const overlay = useRef<HTMLDivElement>(null)
  const drag = useRef(0)
  const pointer = useRef<{ x: number; w: number } | null>(null)
  const meshPicked = useRef(false)
  const [mode, setMode] = useState<'poster' | 'offer' | 'live'>('poster')
  const [requested, setRequested] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [ready, setReady] = useState(false)
  const [settled, setSettled] = useState(false)
  const [active, setActive] = useState(false)
  const [closed, setClosed] = useState(false)
  const [pressed, setPressed] = useState(false)
  const [part, setPart] = useState<PartId | null>(null)

  useEffect(() => {
    const el = stage.current as HTMLDivElement
    const visible = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { threshold: 0.05 })
    visible.observe(el)
    if (!hasWebGL()) return () => visible.disconnect()
    if (!canAutoStart()) {
      setMode('offer')
      return () => visible.disconnect()
    }
    let started = false
    const start = () => {
      if (!started) {
        started = true
        setMode('live')
      }
    }
    const near = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        near.disconnect()
        const idle = () => ('requestIdleCallback' in window ? requestIdleCallback(start, { timeout: 1500 }) : setTimeout(start, 300))
        if (document.readyState === 'complete') idle()
        else addEventListener('load', idle, { once: true })
      },
      { rootMargin: '150px' },
    )
    near.observe(el)
    return () => {
      visible.disconnect()
      near.disconnect()
    }
  }, [])

  const toggleValve = () => {
    setClosed((v) => !v)
    setPressed(true)
  }

  // Контекст потерян, сцена не загрузилась или телефон не тянет: возвращаемся к постеру в исходном состоянии.
  const dropToPoster = (chunkFailed = false) => {
    setReady(false)
    setSettled(false)
    setClosed(false)
    setPressed(false)
    setPart(null)
    setRequested(false)
    setLoadFailed(chunkFailed)
    setMode('offer')
  }

  const release = () => {
    pointer.current = null
    drag.current = 0
  }

  const liveReady = mode === 'live' && ready
  const loading = mode === 'live' && !ready && requested
  const showHint = mode === 'live' && settled && !pressed

  return (
    <div className="node">
      <div
        className={'stage' + (ready ? ' ready' : '') + (settled ? ' settled' : '')}
        ref={stage}
        onPointerDown={(e) => {
          pointer.current = { x: e.clientX, w: e.currentTarget.clientWidth }
        }}
        onPointerMove={(e) => {
          if (pointer.current) {
            drag.current = Math.max(-0.6, Math.min(0.6, ((e.clientX - pointer.current.x) / pointer.current.w) * 1.6))
          }
        }}
        onPointerUp={release}
        onPointerLeave={release}
        onPointerCancel={release}
        onClick={(e) => {
          if (meshPicked.current) {
            meshPicked.current = false
            return
          }
          if (!(e.target as Element).closest('.hot')) setPart(null)
        }}
      >
        <img className="poster" src={`${BASE}img/node.webp`} alt="Узел ввода воды: фильтр, шаровые краны, счётчик" width={1200} height={900} fetchPriority="high" />
        {mode === 'live' && (
          <Guard onFail={() => dropToPoster(true)}>
            <Suspense fallback={null}>
              <Valve3D
                closed={closed}
                hinting={showHint}
                onToggle={toggleValve}
                onPick={(id: PartId) => {
                  meshPicked.current = true
                  setPart((p) => (p === id ? null : id))
                }}
                drag={drag}
                active={active}
                overlay={overlay}
                onReady={() => setReady(true)}
                onSettled={() => setSettled(true)}
                onLost={() => dropToPoster()}
              />
            </Suspense>
          </Guard>
        )}
        <div
          className="hots"
          ref={overlay}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setPart(null)
          }}
        >
          {HOTSPOTS.map((h) => (
            <div key={h.id} className={`hot ${h.side}` + (part === h.id ? ' on' : '')} data-part={h.id} style={css(h.x, h.y)}>
              <button type="button" aria-label={h.label} onClick={() => setPart((p) => (p === h.id ? null : h.id))}>
                <i aria-hidden="true" />
              </button>
              <span className="hot-label" aria-hidden="true">
                {h.label}
              </span>
            </div>
          ))}
          {mode === 'live' && (
            <div className={'hint' + (showHint ? ' on' : '')} data-part="handle" style={css(HANDLE_ANCHOR.x, HANDLE_ANCHOR.y)} aria-hidden="true">
              <span>Нажмите на ручку: так перекрывают воду</span>
            </div>
          )}
        </div>
      </div>
      <div className="node-bar">
        {(liveReady || loading || mode === 'offer') && (
          <button
            type="button"
            className={'valve-btn' + (closed ? ' on' : '')}
            aria-busy={loading || undefined}
            onClick={() => {
              if (liveReady) toggleValve()
              else if (mode === 'offer') {
                // Отказ lazy-импорта React запоминает, поэтому повтор идёт через загрузку страницы.
                if (loadFailed) location.assign(location.pathname + '?3d=1')
                else {
                  setRequested(true)
                  setMode('live')
                }
              }
            }}
          >
            {liveReady ? (
              <>
                <i aria-hidden="true" />
                {closed ? 'Открыть воду' : 'Как перекрыть воду'}
              </>
            ) : loading ? (
              'Загружаю 3D…'
            ) : (
              'Показать в 3D'
            )}
          </button>
        )}
        <p aria-live="polite">
          {closed ? (
            <>
              Ручка поперёк трубы: так перекрывают воду. Если кран не перекрывается или течёт дальше, звоните: <a href={TEL}>{PHONE}</a>
            </>
          ) : (
            'Течёт? Поверните красную ручку на вводе поперёк трубы и звоните мастеру.'
          )}
        </p>
      </div>
    </div>
  )
}
