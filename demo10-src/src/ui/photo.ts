import type { Photo } from '../types'

/** Фото сайта из public/photos: размеры берём из dims.json, его пишет scripts/photos.py. */
export const photoSet = (dims: Record<string, number[]>) => (id: string, alt: string): Photo => {
  const d = dims[id] ?? [1600, 1200]
  return { src: `photos/${id}.webp`, alt, w: d[0], h: d[1] }
}
