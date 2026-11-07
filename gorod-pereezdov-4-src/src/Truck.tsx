import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'
import { media } from './content'
import type { RoutePhase } from './scene'

const phaseLabels: Record<RoutePhase, string> = {
  still: 'От погрузки до нового дома',
  packing: 'Загружаем коробки',
  driving: 'Едем к новому дому',
  arrived: 'Приехали',
}

export function Truck({ preview }: { preview: boolean }) {
  const host = useRef<HTMLDivElement>(null)
  const controls = useRef<ReturnType<typeof import('./scene').mountScene> | null>(null)
  const [ready, setReady] = useState(false)
  const [phase, setPhase] = useState<RoutePhase>('still')
  const [playing, setPlaying] = useState(true)

  useEffect(() => {
    if (preview || !host.current || !('IntersectionObserver' in window)) return
    const element = host.current
    let active = true
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      void import('./scene').then(({ mountScene }) => {
        if (!active) return
        controls.current = mountScene(element, {
          onReady: () => setReady(true),
          onPhase: setPhase,
          onUnavailable: () => { setReady(false); setPhase('still') },
        })
      }).catch(() => setReady(false))
    }, { rootMargin: '80px' })
    observer.observe(element)
    return () => {
      active = false
      observer.disconnect()
      controls.current?.destroy()
      controls.current = null
    }
  }, [preview])

  return <figure className="truck-stage" data-phase={phase}>
    <div className="truck-viewport" aria-hidden="true">
      <img src={media('media/truck-poster.webp')} alt="" width="700" height="412" fetchPriority="high" className={ready ? 'poster covered' : 'poster'} />
      <div ref={host} className={ready ? 'truck-canvas ready' : 'truck-canvas'} />
    </div>
    <figcaption className="stage-bottom">
      <span className="stage-caption"><Icon name="route" size={18} /> {phaseLabels[phase]}</span>
      {ready && phase !== 'still' && (
        <button type="button" className="route-control" onClick={() => {
          controls.current?.setPlaying(!playing)
          setPlaying(!playing)
        }} aria-label={playing ? 'Поставить анимацию на паузу' : 'Продолжить анимацию'}>
          <Icon name={playing ? 'pause' : 'play'} size={18} /> {playing ? 'Пауза' : 'Продолжить'}
        </button>
      )}
    </figcaption>
  </figure>
}
