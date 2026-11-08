import type { Site } from '../types'
import { fmtNum, plural } from './links'
import { Icon } from './Icon'

/** Оценки одной строкой со ссылками на карточки. Без карточки-плашки и без звёздочек у каждого отзыва. */
export function RatingLine({ site, className = '' }: { site: Site; className?: string }) {
  if (!site.ratings.length) return null
  return <p className={'rating-line ' + className}>
    {site.ratings.map((r, i) => <a key={i} href={r.url} target="_blank" rel="noopener noreferrer">
      <Icon name="star" size={16} fill /><b>{r.value}</b>
      <span>{r.source}, {fmtNum(r.count)} {r.unit ?? plural(r.count, 'отзыв', 'отзыва', 'отзывов')}</span>
    </a>)}
  </p>
}
