import { useEffect, useRef, useState } from 'react'
import { media } from './content'
import type { PreviewModel } from './previewScene'

type PreviewData =
  | { kind: 'load'; type: string; volume?: string; rooms: number | null; note: string }
  | { kind: 'address'; destination: boolean; floor: number; lift: string }

function previewModel(data: PreviewData): PreviewModel {
  if (data.kind === 'address') {
    return { kind: 'building', floor: data.floor, lift: data.lift, destination: data.destination }
  }
  return { kind: 'cargo', boxes: data.rooms === null ? 3 : Math.min(9, 4 + data.rooms * 2), size: data.rooms ?? 0 }
}

export function MovePreview({ data, mobile = false, staticPreview }: { data: PreviewData; mobile?: boolean; staticPreview: boolean }) {
  const host = useRef<HTMLDivElement>(null)
  const controls = useRef<ReturnType<typeof import('./previewScene').mountPreviewScene> | null>(null)
  const current = useRef(data)
  const [ready, setReady] = useState(false)
  const address = data.kind === 'address'
  const label = address ? (data.destination ? 'Новый адрес' : 'Откуда забираем') : 'Машина и вещи'
  const value = address ? `${data.floor}-й этаж` : data.volume ? `Кузов ${data.volume}` : data.type
  const firstFloor = address ? data.floor - (data.floor - 1) % 5 : 1
  const detail = address
    ? (data.lift === 'Нет' ? 'Без лифта' : `${data.lift} лифт`)
    : data.note

  useEffect(() => {
    current.current = data
    controls.current?.update(previewModel(data))
  }, [data])

  useEffect(() => {
    if (!host.current || staticPreview || !('IntersectionObserver' in window)) return
    const element = host.current
    let active = true
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      void import('./previewScene').then(({ mountPreviewScene }) => {
        if (!active) return
        controls.current = mountPreviewScene(element, setReady)
        controls.current.update(previewModel(current.current))
      }).catch(() => setReady(false))
    }, { rootMargin: '140px' })
    observer.observe(element)
    return () => {
      active = false
      observer.disconnect()
      controls.current?.destroy()
      controls.current = null
    }
  }, [staticPreview])

  return <div className={mobile ? 'move-preview preview-mobile' : 'move-preview preview-desktop'} aria-hidden="true">
    <div className="preview-label">{label}{address && ready && firstFloor > 1 && <span>Этажи {firstFloor}–{firstFloor + 4}</span>}</div>
    <div className={address ? 'preview-viewport preview-building' : 'preview-viewport'}>
      <img src={media(address ? 'media/floor-poster.webp' : 'media/cargo-poster.webp')} width="480" height="270" alt="" loading="lazy"
        className={ready ? 'poster covered' : 'poster'} />
      <div ref={host} className={ready ? 'preview-canvas ready' : 'preview-canvas'} />
    </div>
    <div className="preview-detail">
      <strong className={address && ready ? 'sr-only' : undefined}>{value}</strong><span>{detail}</span>
    </div>
  </div>
}
