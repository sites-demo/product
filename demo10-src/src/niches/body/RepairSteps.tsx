import { useEffect, useRef, useState } from 'react'
import type { DoorScene } from '../../three/doorRepair'

export const STEPS = [
  { title: 'Вмятина и царапины', text: 'Так деталь выглядит до ремонта. Полосы света в лаке гнутся там, где металл продавлен: по ним мастер и видит границы вмятины.' },
  { title: 'Рихтовка', text: 'Краску снимают до металла и вытягивают его на место. Поверхность снова ровная, остаётся только подготовить её под покраску.' },
  { title: 'Грунт', text: 'Место ремонта шлифуют и покрывают грунтом. Он защищает металл и даёт краске ровную основу.' },
  { title: 'Покраска', text: 'Деталь красят в цвет машины и покрывают лаком. Пока лак не отполирован, он выглядит матовым.' },
  { title: 'Полировка', text: 'После сушки лак полируют. Полосы света идут по двери ровно, как по остальному кузову.' },
]

/** Дверь в 3D проходит этапы ремонта по мере прокрутки. Без WebGL остаются тексты этапов. */
export function RepairSteps({ paint }: { paint: string }) {
  const host = useRef<HTMLDivElement>(null)
  const scene = useRef<DoorScene | null>(null)
  const [active, setActive] = useState(0)
  const [ready, setReady] = useState(false)
  const steps = useRef<(HTMLLIElement | null)[]>([])

  useEffect(() => {
    const el = host.current
    if (!el) return
    let dead = false
    let s: DoorScene | undefined
    // Сцену создаём, только когда раздел подъезжает к экрану.
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      import('../../three/doorRepair').then(({ createDoorScene }) => {
        if (dead) return
        try {
          s = createDoorScene(el, { paint, onReady: () => setReady(true) })
          scene.current = s
        } catch { /* остаются тексты */ }
      })
    }, { rootMargin: '600px 0px' })
    io.observe(el)
    return () => { dead = true; io.disconnect(); s?.destroy(); scene.current = null }
  }, [paint])

  useEffect(() => {
    const io = new IntersectionObserver(es => {
      for (const e of es) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i))
    }, { rootMargin: '-48% 0px -48% 0px' })
    steps.current.forEach(s => s && io.observe(s))
    return () => io.disconnect()
  }, [])

  useEffect(() => { scene.current?.setStage(active) }, [active, ready])

  return <div className="repair">
    <div className="repair-stage">
      <div className={ready ? 'repair-canvas ready' : 'repair-canvas'} ref={host} role="img" aria-label={`Дверь машины, этап: ${STEPS[active].title}`} />
      <ol className="repair-dots" aria-hidden="true">{STEPS.map((s, i) => <li key={s.title} className={i === active ? 'on' : i < active ? 'done' : ''}>{s.title}</li>)}</ol>
    </div>
    <ol className="repair-steps">
      {STEPS.map((s, i) => <li key={s.title} data-i={i} ref={el => { steps.current[i] = el }} className={i === active ? 'on' : ''}>
        <span className="repair-n">Этап {i + 1}</span>
        <h3>{s.title}</h3>
        <p>{s.text}</p>
      </li>)}
    </ol>
  </div>
}
