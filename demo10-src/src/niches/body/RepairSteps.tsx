import { useEffect, useRef, useState } from 'react'
import { SIDE_BODY, SIDE_GLASS, SIDE_HANDLES, SIDE_MIRROR, WHEELS } from '../../ui/car2d'

export const STEPS = [
  { title: 'Вмятина и царапины', text: 'Так деталь выглядит до ремонта. Полосы света в лаке гнутся там, где металл продавлен: по ним мастер и видит границы вмятины.' },
  { title: 'Рихтовка', text: 'Краску снимают до металла и вытягивают его на место. Поверхность снова ровная, остаётся только подготовить её под покраску.' },
  { title: 'Грунт', text: 'Место ремонта шлифуют и покрывают грунтом. Он защищает металл и даёт краске ровную основу.' },
  { title: 'Покраска', text: 'Деталь красят в цвет машины и покрывают лаком. Пока лак не отполирован, он выглядит матовым.' },
  { title: 'Полировка', text: 'После сушки лак полируют. Полосы света идут по двери ровно, как по остальному кузову.' },
]

// Вмятина на передней двери, координаты чертежа сбоку.
const DX = 192, DY = 92
const STRAIGHT = ['M100,68 H270', 'M100,86 H270', 'M100,108 H270']
const BENT = [
  'M100,68 H170 C180,68 186,72 192,72 C198,72 204,68 214,68 H270',
  'M100,86 H166 C176,86 182,96 192,97 C202,98 206,86 218,86 H270',
  'M100,108 H170 C180,108 186,103 193,103 C200,103 206,108 216,108 H270',
]
const WIDTH = [2.6, 4.5, 2.6]

/** Дверь по этапам ремонта, плоский рисунок. Слои просто проявляются по очереди. */
export function Door({ stage, paint }: { stage: number; paint: string }) {
  const on = (v: boolean) => ({ opacity: v ? 1 : 0 })
  const line = 'rgba(255,255,255,.4)'
  const thin = { stroke: line, strokeWidth: 1, vectorEffect: 'non-scaling-stroke' as const }
  const stripes = (paths: string[], o: number, blur?: boolean) => <g style={{ opacity: o }} filter={blur ? 'url(#rd-soft)' : undefined}>
    {paths.map((d, i) => <path key={d} d={d} fill="none" stroke="#eaf1f8" strokeWidth={WIDTH[i]} strokeLinecap="round" />)}
  </g>
  return <svg viewBox="112 2 150 136" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <defs>
      <clipPath id="rd-body" clipPathUnits="userSpaceOnUse"><path d={SIDE_BODY} /></clipPath>
      <clipPath id="rd-door" clipPathUnits="userSpaceOnUse"><path d="M134,-10 H238 V126 H134 Z" /></clipPath>
      <radialGradient id="rd-shadow"><stop offset="0" stopColor="#000" stopOpacity=".55" /><stop offset="1" stopColor="#000" stopOpacity="0" /></radialGradient>
      <radialGradient id="rd-glint"><stop offset="0" stopColor="#fff" stopOpacity=".32" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
      <radialGradient id="rd-metal"><stop offset="0" stopColor="#dfe3e7" /><stop offset=".55" stopColor="#aeb4ba" /><stop offset=".8" stopColor="#8f969d" stopOpacity=".9" /><stop offset="1" stopColor="#8f969d" stopOpacity="0" /></radialGradient>
      <radialGradient id="rd-primer"><stop offset="0" stopColor="#80858a" /><stop offset=".74" stopColor="#7a7f84" /><stop offset="1" stopColor="#7a7f84" stopOpacity="0" /></radialGradient>
      <filter id="rd-soft" x="-10%" y="-40%" width="120%" height="180%"><feGaussianBlur stdDeviation="3.2" /></filter>
    </defs>
    <g clipPath="url(#rd-body)">
      <path d={SIDE_BODY} fill={paint} />
      <g opacity=".55">{stripes(STRAIGHT, 0.5)}</g>
      <g clipPath="url(#rd-door)">
        <rect x="100" y="0" width="170" height="140" fill={paint} />
        <g className="rd-layer" style={on(stage === 0)}>{stripes(BENT, 0.85)}</g>
        <g className="rd-layer" style={on(stage === 1 || stage === 2 || stage === 4)}>{stripes(STRAIGHT, stage === 4 ? 0.85 : 0.6)}</g>
        <g className="rd-layer" style={on(stage === 3)}>{stripes(STRAIGHT, 0.4, true)}</g>
        <g className="rd-layer" style={on(stage === 0)}>
          <ellipse cx={DX - 4} cy={DY - 3} rx="17" ry="12" fill="url(#rd-shadow)" />
          <ellipse cx={DX + 6} cy={DY + 5} rx="11" ry="7" fill="url(#rd-glint)" />
          <path d="M172,80 L206,73 M176,99 L214,90 M168,90 L186,87" stroke="#dfe6ee" strokeWidth="1" strokeLinecap="round" opacity=".75" />
        </g>
        <g className="rd-layer" style={on(stage === 1)}>
          <ellipse cx={DX} cy={DY - 3} rx="30" ry="20" fill="url(#rd-metal)" />
          <path d="M170,86 L214,80 M168,94 L216,88 M172,101 L210,96" stroke="#fff" strokeWidth=".6" opacity=".45" />
        </g>
        <g className="rd-layer" style={on(stage === 2)}><ellipse cx={DX} cy={DY - 3} rx="36" ry="24" fill="url(#rd-primer)" /></g>
      </g>
      {SIDE_GLASS.map(d => <path key={d} d={d} fill="#1d2731" {...thin} />)}
      {SIDE_HANDLES.map(d => <path key={d} d={d} fill="rgba(0,0,0,.45)" />)}
      <path d="M134,-10 V160 M238,-10 V160 M116,126 H292" fill="none" {...thin} />
    </g>
    <path d={SIDE_BODY} fill="none" {...thin} />
    <path d={SIDE_MIRROR} fill={paint} {...thin} />
    {WHEELS.map(x => <g key={x}><circle cx={x} cy={120} r={28} fill="#16181b" /><circle cx={x} cy={120} r={17} fill="#7e858c" /></g>)}
  </svg>
}

/** Дверь проходит этапы ремонта по мере прокрутки. */
export function RepairSteps({ paint }: { paint: string }) {
  const [active, setActive] = useState(0)
  const steps = useRef<(HTMLLIElement | null)[]>([])

  useEffect(() => {
    const io = new IntersectionObserver(es => {
      for (const e of es) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i))
    }, { rootMargin: '-48% 0px -48% 0px' })
    steps.current.forEach(s => s && io.observe(s))
    return () => io.disconnect()
  }, [])

  return <div className="repair">
    <div className="repair-stage">
      <div className="repair-canvas ready" role="img" aria-label={`Дверь машины, этап: ${STEPS[active].title}`}><Door stage={active} paint={paint} /></div>
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
