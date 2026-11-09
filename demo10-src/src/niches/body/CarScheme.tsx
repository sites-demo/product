import type { PointerEvent } from 'react'
import {
  SIDE_BODY, SIDE_PANELS, SIDE_MIRROR, SIDE_GLASS, SIDE_LIGHTS, SIDE_HANDLES, WHEELS,
  TOP_BODY, TOP_PANELS, TOP_MIRRORS, TOP_GLASS, TOP_LIGHTS, sidePanelId, isDarkPaint, type PanelId,
} from '../../ui/car2d'

type Props = {
  paint: string
  mark: string
  marked: PanelId[]
  hover: PanelId | null
  onPick: (p: PanelId) => void
  onHover: (p: PanelId | null) => void
}

/**
 * Схема кузова как в бланке осмотра: левый бок, вид сверху и правый бок.
 * Каждый вид такой, каким машину видно, если обойти её вокруг.
 */
export function CarScheme({ paint, mark, marked, hover, onPick, onHover }: Props) {
  const dark = isDarkPaint(paint)
  const line = dark ? 'rgba(255,255,255,.55)' : 'rgba(20,24,30,.62)'
  const glass = dark ? '#3a4652' : '#a9b8c6'
  const light = dark ? '#6b7178' : '#e9edf1'
  const fill = (p: PanelId) => marked.includes(p) ? mark : hover === p ? `color-mix(in srgb, ${mark} 35%, ${paint})` : paint
  const enter = (p: PanelId) => (e: PointerEvent) => { if (e.pointerType === 'mouse') onHover(p) }
  const panel = (p: PanelId, d: string, clip?: string, key?: string) =>
    <path key={key ?? p + d.length} d={d} style={{ fill: fill(p) }} stroke={line} strokeWidth={1.2} vectorEffect="non-scaling-stroke" strokeLinejoin="round"
      clipPath={clip ? `url(#${clip})` : undefined} className="cs-part" data-part={p}
      onClick={() => onPick(p)} onPointerEnter={enter(p)} onPointerLeave={() => onHover(null)} />
  const deco = { stroke: line, strokeWidth: 1, vectorEffect: 'non-scaling-stroke' as const, pointerEvents: 'none' as const }

  const side = (s: 'L' | 'R') => <svg className="cs" viewBox="-6 -4 440 166" aria-hidden="true">
    <defs><clipPath id={'cs-side-' + s} clipPathUnits="userSpaceOnUse"><path d={SIDE_BODY} /></clipPath></defs>
    <g transform={s === 'R' ? 'matrix(-1 0 0 1 428 0)' : undefined}>
      <path d={SIDE_BODY} fill={paint} stroke="none" />
      {SIDE_PANELS.map(({ part, d }) => panel(sidePanelId(part, s), d, 'cs-side-' + s, s + part))}
      {SIDE_GLASS.map(d => <path key={d} d={d} fill={glass} {...deco} />)}
      {SIDE_LIGHTS.map(d => <path key={d} d={d} fill={light} {...deco} />)}
      {SIDE_HANDLES.map(d => <path key={d} d={d} fill={line} stroke="none" pointerEvents="none" />)}
      <path d={SIDE_BODY} fill="none" stroke={line} strokeWidth={1.4} vectorEffect="non-scaling-stroke" pointerEvents="none" />
      {panel(s === 'L' ? 'mirrorL' : 'mirrorR', SIDE_MIRROR, undefined, s + 'mirror')}
      {WHEELS.map(x => <g key={x} pointerEvents="none">
        <circle cx={x} cy={120} r={28} fill="#24282d" />
        <circle cx={x} cy={120} r={17} fill="#b9bfc6" />
        <circle cx={x} cy={120} r={5} fill="#5b6168" />
      </g>)}
    </g>
  </svg>

  // Вид сверху повёрнут передом влево, как и левый бок: левый борт машины оказывается снизу.
  const top = <svg className="cs" viewBox="-6 -20 440 210" aria-hidden="true">
    <defs><clipPath id="cs-top" clipPathUnits="userSpaceOnUse"><path d={TOP_BODY} /></clipPath></defs>
    <g transform="matrix(0 -1 1 0 0 170)">
      <path d={TOP_BODY} fill={paint} stroke="none" />
      {TOP_PANELS.map(({ id, d }) => panel(id, d, 'cs-top'))}
      {TOP_GLASS.map(d => <path key={d} d={d} fill={glass} {...deco} />)}
      {TOP_LIGHTS.map(d => <path key={d} d={d} fill={light} {...deco} />)}
      <path d={TOP_BODY} fill="none" stroke={line} strokeWidth={1.4} vectorEffect="non-scaling-stroke" pointerEvents="none" />
      {TOP_MIRRORS.map(({ id, d }) => panel(id, d))}
    </g>
  </svg>

  return <div className="cs-views" role="img" aria-label="Схема машины: левый бок, вид сверху и правый бок. Нажмите на деталь, где повреждение.">
    <figure><figcaption>Левый бок</figcaption>{side('L')}</figure>
    <figure><figcaption>Сверху</figcaption>{top}</figure>
    <figure><figcaption>Правый бок</figcaption>{side('R')}</figure>
  </div>
}
