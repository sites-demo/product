import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Icon } from './Icon'
import { media } from './content'
import { ROUTE, ROUTE_STEPS, type RoutePhase } from './route'

export function Truck({ preview }: { preview: boolean }) {
  const host = useRef<HTMLDivElement>(null)
  const steps = useRef<HTMLDivElement>(null)
  const controls = useRef<ReturnType<typeof import('./scene').mountScene> | null>(null)
  const [ready, setReady] = useState(false)
  const [phase, setPhase] = useState<RoutePhase>('still')
  const [playing, setPlaying] = useState(true)
  const live = ready && phase !== 'still'

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
          // Полоски под сценой заполняются вместе с анимацией, без перерисовки React.
          onTick: progress => steps.current?.style.setProperty('--t', progress.toFixed(4)),
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
      <div ref={steps} className={live ? 'route-steps live' : 'route-steps'} role={live ? 'group' : undefined} aria-label={live ? 'Этапы переезда' : undefined}>
        {ROUTE_STEPS.map(step => {
          const style = { '--a': step.from / ROUTE.duration, '--k': ROUTE.duration / (step.to - step.from) } as CSSProperties
          const inner = <><span className="route-track"><span className="route-fill" style={style} /></span>{step.label}</>
          return live
            ? <button key={step.id} type="button" className="route-step" aria-pressed={phase === step.id}
                onClick={() => controls.current?.seek(step.from + (step.id === 'packing' ? 0 : 120))}>{inner}</button>
            : <span key={step.id} className="route-step">{inner}</span>
        })}
      </div>
      {live && (
        <button type="button" className="route-control" onClick={() => {
          controls.current?.setPlaying(!playing)
          setPlaying(!playing)
        }} aria-label={playing ? 'Поставить анимацию на паузу' : 'Продолжить анимацию'}>
          <Icon name={playing ? 'pause' : 'play'} size={16} /> {playing ? 'Пауза' : 'Продолжить'}
        </button>
      )}
    </figcaption>
  </figure>
}
