import { useEffect, useRef, useState } from 'react'
import type { Site } from '../../types'
import type { AlignScene } from '../../three/alignScene'
import { Poster } from '../../ui/Poster'

/** Развал-схождение в 3D: колёса до регулировки и после. Пока человек не нажал, сцена сама переключается. */
export function AlignStage({ site }: { site: Site }) {
  const host = useRef<HTMLDivElement>(null)
  const scene = useRef<AlignScene | null>(null)
  const [ready, setReady] = useState(false)
  const [after, setAfter] = useState(false)
  const [touched, setTouched] = useState(false)
  useEffect(() => {
    const el = host.current
    if (!el) return
    let dead = false, s: AlignScene | undefined
    import('../../three/alignScene')
      .then(({ createAlignScene }) => (dead ? undefined : createAlignScene(el, { paint: '#c9ced4', accent: site.theme.accent })))
      .then(made => {
        if (!made) return
        if (dead) { made.destroy(); return }
        s = made; scene.current = made; setReady(true)
      })
      .catch(() => { /* остаётся снимок */ })
    return () => { dead = true; s?.destroy(); scene.current = null }
  }, [site])
  useEffect(() => { scene.current?.set(after ? 1 : 0) }, [after, ready])
  useEffect(() => {
    if (touched || !ready || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setAfter(v => !v), 2600)
    return () => clearInterval(id)
  }, [touched, ready])
  const pick = (v: boolean) => { setTouched(true); setAfter(v) }
  return <div className="stage align-stage">
    <div className={'stage-canvas' + (site.posters?.includes('align') ? ' has-poster' : '') + (ready ? ' ready' : '')} ref={host} role="img" aria-label={after ? 'Колёса после регулировки: смотрят ровно вперёд' : 'Колёса до регулировки: смотрят в разные стороны'}><Poster site={site} name="align" /></div>
    <p className="stage-hint">Лучи показывают, куда смотрит каждое колесо. Наклон нарочно увеличен, чтобы его было видно</p>
    <div className="stage-tools">
      <div className="seg" role="group" aria-label="Колёса">
        <button type="button" aria-pressed={!after} onClick={() => pick(false)}>До регулировки</button>
        <button type="button" aria-pressed={after} onClick={() => pick(true)}>После</button>
      </div>
    </div>
  </div>
}
