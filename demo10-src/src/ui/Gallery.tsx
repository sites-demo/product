import { useEffect, useRef, useState } from 'react'
import type { Photo } from '../types'
import { asset } from './links'
import { Icon } from './Icon'

/** Сетка фото. По нажатию открывается просмотр на весь экран с листанием пальцем. */
export function Gallery({ photos, limit = 9 }: { photos: Photo[]; limit?: number }) {
  const [open, setOpen] = useState<number | null>(null)
  const [all, setAll] = useState(false)
  const dlg = useRef<HTMLDialogElement>(null)
  const strip = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const d = dlg.current
    if (!d) return
    if (open === null) { if (d.open) d.close(); return }
    if (!d.open) d.showModal()
    const s = strip.current
    if (s) s.scrollTo({ left: s.clientWidth * open, behavior: 'instant' as ScrollBehavior })
  }, [open])
  const shown = all ? photos : photos.slice(0, limit)
  return <>
    <div className="gallery">
      {shown.map((p, i) => <button key={p.src} type="button" className={'g-item' + (p.w > p.h * 1.2 ? ' wide' : '')} onClick={() => setOpen(i)} aria-label={`Открыть фото: ${p.alt}`}>
        <img src={asset(p.src)} alt={p.alt} width={p.w} height={p.h} loading="lazy" decoding="async" />
      </button>)}
    </div>
    {photos.length > limit && !all && <button type="button" className="btn btn-ghost more" onClick={() => setAll(true)}>Показать все фото ({photos.length})</button>}
    <dialog ref={dlg} className="viewer" onClose={() => setOpen(null)} onClick={e => { if (e.target === e.currentTarget) setOpen(null) }}>
      <button type="button" className="viewer-close" onClick={() => setOpen(null)} aria-label="Закрыть"><Icon name="close" size={22} /></button>
      <div className="viewer-strip" ref={strip}>
        {open !== null && photos.map(p => <figure key={p.src}><img src={asset(p.src)} alt={p.alt} /><figcaption>{p.alt}</figcaption></figure>)}
      </div>
    </dialog>
  </>
}
