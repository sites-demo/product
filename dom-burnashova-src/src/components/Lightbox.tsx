import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { PHOTO_ALT, img } from '../data'
import { Icon } from './Icon'

type Open = (list: string[], index: number) => void
const Ctx = createContext<Open>(() => {})
export const useLightbox = () => useContext(Ctx)

export function LightboxProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ list: string[]; i: number } | null>(null)
  const open = useCallback<Open>((list, i) => setState({ list, i }), [])
  return (
    <Ctx.Provider value={open}>
      {children}
      {state && <Lightbox list={state.list} start={state.i} onClose={() => setState(null)} />}
    </Ctx.Provider>
  )
}

function Lightbox({ list, start, onClose }: { list: string[]; start: number; onClose: () => void }) {
  const [i, setI] = useState(start)
  const touch = useRef<number | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const n = list.length
  const go = useCallback((d: number) => setI((x) => (x + d + n) % n), [n])

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    addEventListener('keydown', key)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    box.current?.focus()
    return () => {
      removeEventListener('keydown', key)
      document.body.style.overflow = prev
    }
  }, [go, onClose])

  const id = list[i]
  return (
    <div
      className="lb"
      role="dialog"
      aria-modal="true"
      aria-label="Фото дома"
      tabIndex={-1}
      ref={box}
      onClick={onClose}
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current === null) return
        const dx = e.changedTouches[0].clientX - touch.current
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
        touch.current = null
      }}
    >
      <figure onClick={(e) => e.stopPropagation()}>
        <img key={id} src={img(id)} alt={PHOTO_ALT[id] || 'Фото дома'} />
        <figcaption>
          <span>{PHOTO_ALT[id]}</span>
          <span className="lb-n">
            {i + 1} из {n}
          </span>
        </figcaption>
      </figure>
      {n > 1 && (
        <>
          <button type="button" className="lb-b lb-prev" onClick={(e) => (e.stopPropagation(), go(-1))} aria-label="Предыдущее фото">
            <Icon name="chev" />
          </button>
          <button type="button" className="lb-b lb-next" onClick={(e) => (e.stopPropagation(), go(1))} aria-label="Следующее фото">
            <Icon name="chev" />
          </button>
        </>
      )}
      <button type="button" className="lb-b lb-x" onClick={onClose} aria-label="Закрыть">
        <Icon name="close" />
      </button>
    </div>
  )
}
