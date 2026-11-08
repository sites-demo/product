import { useEffect, useRef, useState } from 'react'
import type { HeadPart, HeadlightScene } from '../../three/headlight'
import type { Site } from '../../types'
import { Poster } from '../../ui/Poster'

export type PartInfo = { part: HeadPart; title: string; text: string; price?: string }

/** Фара в 3D: в первом экране стекло мутнеет и проясняется, в разделе ниже фара разбирается на детали. */
export function HeadlightView({ site, mode, parts, clearDefault = false }: { site: Site; mode: 'hero' | 'explode'; parts?: PartInfo[]; clearDefault?: boolean }) {
  const accent = site.theme.accent
  const poster = mode === 'hero' && !!site.posters?.includes('headlight')
  const host = useRef<HTMLDivElement>(null)
  const scene = useRef<HeadlightScene | null>(null)
  const [ready, setReady] = useState(false)
  const [clear, setClear] = useState(clearDefault)
  const [open, setOpen] = useState(mode === 'explode')
  const [active, setActive] = useState<HeadPart | null>(null)
  const [touched, setTouched] = useState(false)

  // Первый экран сам показывает разницу: мутное стекло и после полировки, пока человек не нажмёт сам.
  useEffect(() => {
    if (mode !== 'hero' || touched || !ready || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setClear(v => !v), 2800)
    return () => clearInterval(id)
  }, [mode, touched, ready])

  useEffect(() => {
    const el = host.current
    if (!el) return
    let dead = false
    let s: HeadlightScene | undefined
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      import('../../three/headlight').then(({ createHeadlightScene }) => {
        if (dead) return
        try { s = createHeadlightScene(el, { accent, glow: mode === 'hero' }); scene.current = s; setReady(true) } catch { /* без 3D остаются тексты */ }
      })
    }, { rootMargin: '400px 0px' })
    io.observe(el)
    return () => { dead = true; io.disconnect(); s?.destroy(); scene.current = null }
  }, [accent])

  useEffect(() => {
    const s = scene.current
    if (!s) return
    s.setClear(clear)
    s.setExplode(open ? 1 : 0)
    s.setActive(active)
  }, [clear, open, active, ready])

  if (mode === 'hero') return <div className="hl-hero">
    <div className={'hl-canvas' + (poster ? ' has-poster' : '') + (ready ? ' ready' : '')} ref={host} role="img" aria-label={clear ? 'Фара после полировки: стекло прозрачное' : 'Фара до полировки: стекло мутное и жёлтое'}><Poster site={site} name="headlight" /></div>
    <div className="seg hl-toggle" role="group" aria-label="Состояние стекла">
      <button type="button" aria-pressed={!clear} onClick={() => { setTouched(true); setClear(false) }}>Мутное стекло</button>
      <button type="button" aria-pressed={clear} onClick={() => { setTouched(true); setClear(true) }}>После полировки</button>
    </div>
  </div>

  return <div className="hl-explode">
    <div className="hl-stage">
      <div className={ready ? 'hl-canvas ready' : 'hl-canvas'} ref={host} role="img" aria-label="Фара в разборе: стекло, линзы, маска и корпус" />
      <button type="button" className="btn btn-ghost btn-sm hl-open" onClick={() => setOpen(v => !v)}>{open ? 'Собрать фару' : 'Разобрать фару'}</button>
    </div>
    <ul className="hl-parts">
      {parts?.map(p => <li key={p.part + p.title}>
        <button type="button" aria-pressed={active === p.part} onMouseEnter={() => setActive(p.part)} onFocus={() => setActive(p.part)} onClick={() => { setActive(p.part); setOpen(true) }}>
          <b>{p.title}</b>
          <span>{p.text}</span>
          {p.price && <em>{p.price}</em>}
        </button>
      </li>)}
    </ul>
  </div>
}
