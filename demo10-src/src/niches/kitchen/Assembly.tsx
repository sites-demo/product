import { useEffect, useRef, useState } from 'react'
import type { Site } from '../../types'
import type { KitchenScene } from '../../three/kitchen'

/** Кухня собирается при прокрутке: стена, корпуса, фасады, столешница, подсветка. Подписи берём из шагов самой компании. */
export function Assembly({ site }: { site: Site }) {
  const steps = site.steps ?? []
  const k = site.kitchen!
  const host = useRef<HTMLDivElement>(null)
  const scene = useRef<KitchenScene | null>(null)
  const [active, setActive] = useState(0)
  const [ready, setReady] = useState(false)
  const items = useRef<(HTMLLIElement | null)[]>([])
  const stageOf = (i: number) => Math.round(((i + 1) / steps.length) * 4)

  useEffect(() => {
    const el = host.current
    if (!el) return
    let dead = false
    let s: KitchenScene | undefined
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      import('../../three/kitchen').then(({ createKitchenScene }) => {
        if (dead) return
        try {
          const f = k.facades[0], c = k.counters[0]
          s = createKitchenScene(el, { layout: 'straight', a: 3.4, b: 2.2, uppers: true, handles: 'gola', facade: { hex: f.hex, finish: f.finish }, counter: { hex: c.hex, kind: c.kind } }, { stage: 0, onReady: () => setReady(true) })
          scene.current = s
        } catch { /* остаются тексты шагов */ }
      })
    }, { rootMargin: '600px 0px' })
    io.observe(el)
    return () => { dead = true; io.disconnect(); s?.destroy(); scene.current = null }
  }, [k])

  useEffect(() => {
    const io = new IntersectionObserver(es => {
      for (const e of es) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i))
    }, { rootMargin: '-48% 0px -48% 0px' })
    items.current.forEach(s => s && io.observe(s))
    return () => io.disconnect()
  }, [])

  useEffect(() => { scene.current?.setStage(stageOf(active)) }, [active, ready])

  if (!steps.length) return null
  return <section className="section asm-sec" id="steps">
    <div className="wrap">
      <div className="section-head">
        <h2>Как появляется ваша кухня</h2>
        <p>От замера до последней ленты подсветки. Прокрутите вниз.</p>
      </div>
      <div className="repair asm">
        <div className="repair-stage asm-stage">
          <div className={ready ? 'repair-canvas asm-canvas ready' : 'repair-canvas asm-canvas'} ref={host} role="img" aria-label={`Кухня, шаг: ${steps[active].title}`} />
          <ol className="repair-dots" aria-hidden="true">{steps.map((s, i) => <li key={s.title} className={i === active ? 'on' : i < active ? 'done' : ''}>{s.title}</li>)}</ol>
        </div>
        <ol className="repair-steps">
          {steps.map((s, i) => <li key={s.title} data-i={i} ref={el => { items.current[i] = el }} className={i === active ? 'on' : ''}>
            <span className="repair-n">Шаг {i + 1}</span>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
          </li>)}
        </ol>
      </div>
    </div>
  </section>
}
