import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { BASE, NAME, PHOTO_ALT, WA, ZONES, img, zone as findZone, type Zone, type ZoneId } from '../data'
import type { View } from '../three/House3D'
import { Icon } from './Icon'
import { useLightbox } from './Lightbox'

const House3D = lazy(() => import('../three/House3D'))

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

const VIEWS: { v: View; label: string }[] = [
  { v: 'outside', label: 'Двор' },
  { v: 0, label: '1 этаж' },
  { v: 1, label: '2 этаж' },
]

const GROUPS: { title: string; where: Zone['where'] }[] = [
  { title: 'Первый этаж', where: 0 },
  { title: 'Второй этаж', where: 1 },
  { title: 'Двор', where: 'yard' },
]

const ASK_PHOTOS = `Здравствуйте. Смотрю «${NAME}» на сайте. Пришлите, пожалуйста, фото комнат и сколько там спальных мест.`

export function Rooms() {
  const stage = useRef<HTMLDivElement>(null)
  const drag = useRef(0)
  const labels = useRef<HTMLDivElement>(null)
  const pointer = useRef<{ x: number; w: number } | null>(null)
  const [mode, setMode] = useState<'poster' | 'live'>('poster')
  const [ready, setReady] = useState(false)
  const [settled, setSettled] = useState(false)
  const [active, setActive] = useState(false)
  const [still, setStill] = useState(false)
  const [view, setView] = useState<View>('outside')
  const [picked, setPicked] = useState<ZoneId | null>('hall')
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    setStill(matchMedia('(prefers-reduced-motion: reduce)').matches)
    const el = stage.current as HTMLDivElement
    const vis = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { threshold: 0.02 })
    vis.observe(el)
    if (!canRun3D()) return () => vis.disconnect()
    const near = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        near.disconnect()
        const go = () => setMode('live')
        if (document.readyState === 'complete') ('requestIdleCallback' in window ? requestIdleCallback(go, { timeout: 1200 }) : setTimeout(go, 200))
        else addEventListener('load', () => setTimeout(go, 150), { once: true })
      },
      { rootMargin: '500px' },
    )
    near.observe(el)
    return () => {
      vis.disconnect()
      near.disconnect()
    }
  }, [])

  const pick = (id: ZoneId) => {
    const z = findZone(id) as Zone
    setTouched(true)
    setPicked(id)
    // Терраса видна и со двора, и с первого этажа: этаж не переключаем, если уже внутри.
    if (z.where === 'yard') setView('outside')
    else if (!(id === 'terrace' && view === 'outside')) setView(z.where)
  }

  const changeView = (v: View) => {
    setTouched(true)
    setView(v)
    const z = findZone(picked)
    // На этаже всегда открыта какая-то комната с фото: если выбранная не отсюда, берём первую на этаже.
    if (v !== 'outside' && (!z || (z.where !== v && !(z.id === 'terrace' && v === 0)))) setPicked(ZONES.find((x) => x.where === v)?.id ?? null)
  }

  const release = () => {
    pointer.current = null
    drag.current = 0
  }

  const z = findZone(picked)

  return (
    <section className="rooms" id="dom" aria-labelledby="rooms-h">
      <div className="wrap">
        <div className="sec-head">
          <h2 id="rooms-h">Загляните в дом, прежде чем бронировать</h2>
          <p className="lead">Покрутите дом, откройте этаж и нажмите на комнату или место во дворе. Появятся настоящие фото и что там есть.</p>
        </div>

        <div className="rooms-grid">
          <div className="stage-col">
            <div
              ref={stage}
              className={'stage' + (ready ? ' ready' : '') + (settled ? ' settled' : '') + (view !== 'outside' ? ' inside' : '')}
              onPointerDown={(e) => {
                pointer.current = { x: e.clientX, w: e.currentTarget.clientWidth }
              }}
              onPointerMove={(e) => {
                if (pointer.current) drag.current = Math.max(-0.9, Math.min(0.9, ((e.clientX - pointer.current.x) / pointer.current.w) * 2.2))
              }}
              onPointerUp={release}
              onPointerLeave={release}
              onPointerCancel={release}
            >
              <img className="poster" src={`${BASE}img/house.webp`} alt="Объёмная схема дома с гаражом, террасой и мангальной зоной" width={1400} height={1050} loading="lazy" />
              {mode === 'live' && (
                <Guard onFail={() => setMode('poster')}>
                  <Suspense fallback={null}>
                    <House3D
                      view={view}
                      picked={picked}
                      onPick={pick}
                      onOpen={() => changeView(0)}
                      drag={drag}
                      active={active}
                      still={still}
                      onReady={() => setReady(true)}
                      onSettled={() => setSettled(true)}
                      onLost={() => {
                        setReady(false)
                        setMode('poster')
                      }}
                      labels={labels}
                    />
                  </Suspense>
                </Guard>
              )}
              <div className="stage-labels" ref={labels} />
              <div className="stage-ui">
                <div className="seg" role="tablist" aria-label="Что показать">
                  {VIEWS.map(({ v, label }) => (
                    <button key={String(v)} type="button" role="tab" aria-selected={view === v} className={view === v ? 'on' : ''} onClick={() => changeView(v)}>
                      {label}
                    </button>
                  ))}
                </div>
                {mode === 'live' && ready && !touched && <p className="stage-hint">Нажмите на дом, чтобы заглянуть внутрь</p>}
              </div>
              {mode === 'live' && !ready && <div className="stage-loading" aria-hidden="true" />}
            </div>
            <p className="stage-note">Схема примерная, по фото и отзывам гостей. Планировку и спальные места уточните у хозяев.</p>
          </div>

          <div className="zone-col">
            <div className="zone-groups">
              {GROUPS.map((g) => (
                <div className="zg" key={g.title}>
                  <p className="zg-t">{g.title}</p>
                  <div className="zg-list">
                    {ZONES.filter((x) => x.where === g.where).map((x) => (
                      <button key={x.id} type="button" className={'zchip' + (picked === x.id ? ' on' : '')} aria-pressed={picked === x.id} onClick={() => pick(x.id)}>
                        <b>{ZONES.indexOf(x) + 1}</b>
                        {x.short}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {z && <ZoneCard z={z} key={z.id} />}
          </div>
        </div>
      </div>
    </section>
  )
}

function ZoneCard({ z }: { z: Zone }) {
  const lb = useLightbox()
  return (
    <div className="zcard zcard-in">
      {z.photos.length > 0 ? (
        <div className="zphotos">
          {z.photos.map((p, i) => (
            <button key={p} type="button" className="zph" onClick={() => lb(z.photos, i)} aria-label={`Открыть фото: ${PHOTO_ALT[p]}`}>
              <img src={img(p, true)} alt={PHOTO_ALT[p]} loading="lazy" width={640} height={480} />
            </button>
          ))}
        </div>
      ) : (
        <div className="zph-empty">
          <p>Фото комнат пока нет на сайте</p>
          <a className="btn btn-line" href={`${WA}?text=${encodeURIComponent(ASK_PHOTOS)}`} target="_blank" rel="noopener">
            <Icon name="wa" />
            Попросить фото комнат в WhatsApp
          </a>
        </div>
      )}
      <h3>{z.name}</h3>
      <p className="ztext">{z.text}</p>
      <ul className="zfacts">
        {z.facts.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      <a className="btn btn-amber btn-wide" href="#bron">
        Выбрать даты
      </a>
    </div>
  )
}
