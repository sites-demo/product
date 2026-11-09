/**
 * Плоский чертёж седана для схем: вид сбоку и вид сверху.
 * Размеры в условных единицах, 1 единица = 1 см: длина 428, ширина 170, высота 150.
 * Вид сбоку: x от переднего бампера (0) назад, y сверху вниз (0 = крыша, 150 = земля), машина смотрит влево.
 * Вид сверху: u поперёк (0 = левый бок), v от переднего бампера (0) назад.
 */

export type PanelId =
  | 'bumperF' | 'bumperR' | 'hood' | 'trunk' | 'roof'
  | 'fenderFL' | 'fenderFR' | 'doorFL' | 'doorFR' | 'doorRL' | 'doorRR'
  | 'quarterRL' | 'quarterRR' | 'sillL' | 'sillR' | 'mirrorL' | 'mirrorR'

/** Контур кузова сбоку, с вырезами под колёса. */
export const SIDE_BODY = 'M8,128 C2,126 0,116 0,106 C0,96 0,90 2,88 C4,80 6,76 10,74 C50,66 100,60 126,57 C150,40 172,14 188,6 C220,0 262,0 292,6 C310,16 330,32 346,44 C370,46 396,47 412,48 C422,52 426,58 427,64 C429,80 428,100 425,116 C423,122 420,126 414,126 L364,124 A36,36 0 1 0 292,124 L290,133 L118,133 L116,124 A36,36 0 1 0 44,124 Z'

/** Детали сбоку для одного борта. Порядок важен: следующая лежит поверх предыдущей. */
export const SIDE_PANELS: { part: 'fender' | 'doorF' | 'doorR' | 'quarter' | 'roof' | 'bumperF' | 'bumperR' | 'sill'; d: string }[] = [
  { part: 'fender', d: 'M-10,-10 H134 V160 H-10 Z' },
  { part: 'doorF', d: 'M134,-10 H238 V160 H134 Z' },
  { part: 'doorR', d: 'M238,-10 H306 V160 H238 Z' },
  { part: 'quarter', d: 'M306,-10 H440 V160 H306 Z' },
  { part: 'roof', d: 'M170,-10 H310 V20 C290,12 256,9 240,9 C222,9 196,12 176,20 Z' },
  { part: 'bumperF', d: 'M-10,84 L4,86 C20,90 36,93 50,96 L50,160 L-10,160 Z' },
  { part: 'bumperR', d: 'M366,98 C384,96 404,92 428,88 L440,88 L440,160 L366,160 Z' },
  { part: 'sill', d: 'M116,126 H292 V160 H116 Z' },
]

/** Зеркало сбоку торчит за контур, поэтому без обрезки. */
export const SIDE_MIRROR = 'M134,55 L152,52 L156,41 C150,38 142,38 138,40 L134,45 Z'

export const SIDE_GLASS = [
  'M146,54 L236,54 L236,16 C222,15 206,15 194,17 Z',
  'M242,54 L300,54 C296,40 290,26 282,17 C268,15 256,15 242,16 Z',
  'M126,57 C150,40 172,14 188,6 L193,10 C178,22 160,40 146,54 Z',
  'M292,6 C310,16 330,32 346,44 L338,46 C324,36 310,24 296,12 Z',
]
export const SIDE_LIGHTS = [
  'M4,84 C14,82 30,80 42,79 L46,72 C34,72 18,73 8,76 Z',
  'M410,50 L426,62 L427,74 L412,66 Z',
]
export const SIDE_HANDLES = ['M214,66 h12 v3 h-12 Z', 'M282,66 h11 v3 h-11 Z']
export const WHEELS = [80, 328]

/** Вид сверху. */
export const TOP_BODY = 'M22,14 C50,2 120,2 148,14 C160,20 166,34 168,52 L170,110 L170,330 C170,370 168,396 164,408 C158,422 130,428 85,428 C40,428 12,422 6,408 C2,396 0,370 0,330 L0,110 L2,52 C4,34 10,20 22,14 Z'

export const TOP_PANELS: { id: PanelId; d: string }[] = [
  { id: 'fenderFL', d: 'M-10,-10 H85 V134 H-10 Z' },
  { id: 'fenderFR', d: 'M85,-10 H180 V134 H85 Z' },
  { id: 'doorFL', d: 'M-10,134 H85 V238 H-10 Z' },
  { id: 'doorFR', d: 'M85,134 H180 V238 H85 Z' },
  { id: 'doorRL', d: 'M-10,238 H85 V306 H-10 Z' },
  { id: 'doorRR', d: 'M85,238 H180 V306 H85 Z' },
  { id: 'quarterRL', d: 'M-10,306 H85 V440 H-10 Z' },
  { id: 'quarterRR', d: 'M85,306 H180 V440 H85 Z' },
  { id: 'hood', d: 'M20,40 C50,26 120,26 150,40 L152,128 C120,124 50,124 18,128 Z' },
  { id: 'roof', d: 'M30,188 C60,184 110,184 140,188 L142,290 C110,294 60,294 28,290 Z' },
  { id: 'trunk', d: 'M22,346 C60,350 110,350 148,346 L150,398 C110,404 60,404 20,398 Z' },
  { id: 'bumperF', d: 'M-10,-10 H180 V48 C130,22 40,22 -10,48 Z' },
  { id: 'bumperR', d: 'M-10,380 C40,404 130,404 180,380 V440 H-10 Z' },
]
export const TOP_MIRRORS: { id: PanelId; d: string }[] = [
  { id: 'mirrorL', d: 'M4,140 L-12,143 C-15,148 -15,154 -12,158 L4,158 Z' },
  { id: 'mirrorR', d: 'M166,140 L182,143 C185,148 185,154 182,158 L166,158 Z' },
]
export const TOP_GLASS = [
  'M18,130 C50,126 120,126 152,130 L140,188 C110,184 60,184 30,188 Z',
  'M28,290 C60,294 110,294 142,290 L148,346 C110,350 60,350 22,346 Z',
]
export const TOP_LIGHTS: string[] = []

/** Деталь бока в id детали с нужной стороны. */
export function sidePanelId(part: (typeof SIDE_PANELS)[number]['part'], side: 'L' | 'R'): PanelId {
  switch (part) {
    case 'fender': return side === 'L' ? 'fenderFL' : 'fenderFR'
    case 'doorF': return side === 'L' ? 'doorFL' : 'doorFR'
    case 'doorR': return side === 'L' ? 'doorRL' : 'doorRR'
    case 'quarter': return side === 'L' ? 'quarterRL' : 'quarterRR'
    case 'sill': return side === 'L' ? 'sillL' : 'sillR'
    default: return part
  }
}

/** Светлая или тёмная краска: от этого зависят цвета линий и стёкол. */
export function isDarkPaint(hex: string) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.42
}
