import { useEffect, useRef, useState } from 'react'
import type { Site } from '../../types'
import { TOP_BODY, TOP_GLASS, TOP_MIRRORS } from '../../ui/car2d'

// Куда смотрит каждое колесо до регулировки, в градусах. Нарочно больше, чем бывает, чтобы было видно.
const BEFORE = { FL: -7, FR: -3, RL: 2.5, RR: -1.5 }
const WHEELS: { id: keyof typeof BEFORE; u: number; v: number }[] = [
  { id: 'FL', u: 12, v: 80 }, { id: 'FR', u: 158, v: 80 }, { id: 'RL', u: 12, v: 328 }, { id: 'RR', u: 158, v: 328 },
]
const FRONT = -150 // докуда тянутся лучи вперёд

/** Развал-схождение на плоской схеме: вид сверху, колёса до регулировки и после. Пока человек не нажал, схема сама переключается. */
export function AlignStage({ site }: { site: Site }) {
  const [after, setAfter] = useState(false)
  const [touched, setTouched] = useState(false)
  const [t, setT] = useState(0) // 0 = до, 1 = после
  const raf = useRef(0)

  useEffect(() => {
    const target = after ? 1 : 0
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setT(target); return }
    const start = performance.now()
    let from = 0
    setT(v => { from = v; return v })
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / 900)
      const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2
      setT(from + (target - from) * e)
      if (k < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
  }, [after])

  useEffect(() => {
    if (touched || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setAfter(v => !v), 2800)
    return () => clearInterval(id)
  }, [touched])

  const pick = (v: boolean) => { setTouched(true); setAfter(v) }
  const ok = t > 0.98
  const accent = site.theme.accent

  return <div className="stage align-stage">
    <p className="stage-hint">Лучи показывают, куда смотрит каждое колесо. Наклон нарочно увеличен, чтобы его было видно</p>
    <div className="align-draw" role="img" aria-label={after ? 'Колёса после регулировки: смотрят ровно вперёд' : 'Колёса до регулировки: смотрят в разные стороны'}>
      <svg viewBox="-14 -40 596 250" aria-hidden="true">
        <defs><clipPath id="al-body" clipPathUnits="userSpaceOnUse"><path d={TOP_BODY} /></clipPath></defs>
        {/* Вид сверху, передом вправо: левый борт сверху. */}
        <g transform="matrix(0 1 -1 0 428 0)">
          {WHEELS.map(w => <line key={'g' + w.id} x1={w.u} y1={w.v} x2={w.u} y2={FRONT} stroke="#9aa2ab" strokeWidth="1" strokeDasharray="4 5" vectorEffect="non-scaling-stroke" />)}
          <path d={TOP_BODY} fill="#ffffff" fillOpacity=".55" stroke="#7d868f" strokeWidth="1.3" vectorEffect="non-scaling-stroke" />
          {TOP_GLASS.map(d => <path key={d} d={d} fill="#b9c6d2" fillOpacity=".55" stroke="#7d868f" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
          {TOP_MIRRORS.map(m => <path key={m.id} d={m.d} fill="#ffffff" fillOpacity=".55" stroke="#7d868f" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
          <path d="M12,80 H158 M12,328 H158" stroke="#7d868f" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          {WHEELS.map(w => {
            const a = BEFORE[w.id] * (1 - t)
            return <g key={w.id} transform={`translate(${w.u} ${w.v}) rotate(${a})`}>
              <line x1="0" y1="0" x2="0" y2={FRONT - w.v} stroke={ok ? '#1f9d55' : accent} strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
              <rect x="-9" y="-30" width="18" height="60" rx="5" fill="#25292e" />
              <rect x="-4" y="-18" width="8" height="36" rx="2" fill="#5d646b" />
            </g>
          })}
        </g>
      </svg>
    </div>
    <div className="stage-tools">
      <div className="seg" role="group" aria-label="Колёса">
        <button type="button" aria-pressed={!after} onClick={() => pick(false)}>До регулировки</button>
        <button type="button" aria-pressed={after} onClick={() => pick(true)}>После</button>
      </div>
    </div>
  </div>
}
