import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { BASE, type Photo } from '../data'

type Props = {
  photos: Photo[]
  index: number | null
  onIndex: (i: number | null) => void
}

const SWIPE_DISTANCE = 56
const SWIPE_SPEED = 0.45

export function Lightbox({ photos, index, onIndex }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const shot = useRef<HTMLDivElement>(null)
  const gesture = useRef<{ x: number; y: number; t: number; id: number; swiping: boolean } | null>(null)
  const swiped = useRef(false)
  const [dir, setDir] = useState(1)

  const go = (step: number) => {
    if (index === null) return
    setDir(step)
    onIndex((index + step + photos.length) % photos.length)
  }

  useEffect(() => {
    const el = dialog.current
    if (!el) return
    if (index !== null && !el.open) el.showModal?.()
    if (index === null && el.open) el.close()
  }, [index])

  // Соседние фото подгружаем заранее, чтобы свайп не показывал пустоту.
  useEffect(() => {
    if (index === null) return
    for (const step of [-1, 1]) {
      const p = photos[(index + step + photos.length) % photos.length]
      new Image().src = `${BASE}img/${p.f}.webp`
    }
  }, [index, photos])

  const release = (node: HTMLDivElement) => {
    node.style.transition = ''
    node.style.transform = ''
    node.style.opacity = ''
  }

  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest('button')) return
    swiped.current = false
    gesture.current = { x: e.clientX, y: e.clientY, t: e.timeStamp, id: e.pointerId, swiping: false }
  }

  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    const g = gesture.current
    const node = shot.current
    if (!g || !node || e.pointerId !== g.id) return
    const dx = e.clientX - g.x
    if (!g.swiping) {
      if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(e.clientY - g.y)) return
      g.swiping = true
      swiped.current = true
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    node.style.transition = 'none'
    node.style.transform = `translateX(${dx}px)`
    node.style.opacity = String(Math.max(0.5, 1 - Math.abs(dx) / 700))
  }

  const onUp = (e: RPointerEvent<HTMLDivElement>) => {
    const g = gesture.current
    const node = shot.current
    gesture.current = null
    if (!g || !node || !g.swiping) return
    const dx = e.clientX - g.x
    const speed = Math.abs(dx) / Math.max(1, e.timeStamp - g.t)
    release(node)
    if (e.type === 'pointerup' && (Math.abs(dx) > SWIPE_DISTANCE || speed > SWIPE_SPEED)) go(dx < 0 ? 1 : -1)
  }

  const photo = index === null ? null : photos[index]

  return (
    <dialog
      ref={dialog}
      className="lb"
      aria-label="Фото работ"
      onClose={() => onIndex(null)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') go(1)
        if (e.key === 'ArrowLeft') go(-1)
      }}
      onClick={(e) => {
        // Закрываем по тапу мимо фото, подписи и кнопок. Конец свайпа тапом не считается.
        if (swiped.current) {
          swiped.current = false
          return
        }
        if (!(e.target as Element).closest('img, figcaption, button')) onIndex(null)
      }}
    >
      {photo && (
        <>
          <button type="button" className="lb-x" onClick={() => onIndex(null)} aria-label="Закрыть">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <div className="lb-stage" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
            <div className="lb-shot" ref={shot}>
              <img
                key={photo.f}
                className={dir > 0 ? 'in-next' : 'in-prev'}
                src={`${BASE}img/${photo.f}.webp`}
                alt={`${photo.t}. ${photo.s}`}
                width={photo.w}
                height={photo.h}
                draggable={false}
              />
            </div>
          </div>
          <div className="lb-bar">
            <button type="button" className="lb-nav prev" onClick={() => go(-1)} aria-label="Предыдущее фото">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
            <figure className="lb-cap">
              <figcaption>
                <b>{photo.t}</b> {photo.s}
              </figcaption>
              <span className="lb-n" aria-live="polite">
                {(index as number) + 1} из {photos.length}
              </span>
            </figure>
            <button type="button" className="lb-nav next" onClick={() => go(1)} aria-label="Следующее фото">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </>
      )}
    </dialog>
  )
}
