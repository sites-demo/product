import type { Site } from '../types'
import { asset } from './links'

/** Снимок 3D-сцены: виден сразу, пока грузится three.js, и остаётся, если 3D не открылось. */
export function Poster({ site, name }: { site: Site; name: string }) {
  if (!site.posters?.includes(name)) return null
  return <picture className="poster" aria-hidden="true">
    <source media="(max-width: 759px)" srcSet={asset(`posters/${name}-m.webp`)} />
    <img src={asset(`posters/${name}.webp`)} alt="" decoding="async" fetchPriority="high" />
  </picture>
}
