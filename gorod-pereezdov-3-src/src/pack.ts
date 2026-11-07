import { HOURLY, ITEMS, PRESETS, TRUCKS, type Counts, type Item, type ItemId, type Truck } from './data'

// Раскладка вещей в кузове для 3D. Кузов делим на клетки по 10 см и храним высоту в каждой клетке.
// Вещи ставим «стенкой» от кабины к дверям: сначала самые высокие и тяжёлые, потом остальное, коробки в конце.
// x идёт вдоль кузова от кабины, z поперёк от дальней стенки, y вверх.

export type Placed = { key: string; id: ItemId; x: number; y: number; z: number; l: number; w: number; h: number; n: number }

const CELL = 0.1
const byId = Object.fromEntries(ITEMS.map((i) => [i.id, i])) as Record<ItemId, Item>
const ORDER: ItemId[] = ['wardrobe', 'fridge', 'bed', 'sofa', 'washer', 'dresser', 'desk', 'table', 'armchair', 'tv', 'chair', 'box']

export function pack(counts: Counts, size: [number, number, number]) {
  const [L, W, H] = size
  const nx = Math.round(L / CELL)
  const nz = Math.round(W / CELL)
  const hm = new Float32Array(nx * nz)
  const placed: Placed[] = []
  let failed = 0

  for (const id of ORDER) {
    const item = byId[id]
    const count = counts[id] ?? 0
    for (let n = 0; n < count; n++) {
      const spot = find(item, hm, nx, nz, H)
      if (!spot) {
        failed++
        continue
      }
      const { x, z, a, b, top } = spot
      for (let i = x; i < x + a; i++) for (let j = z; j < z + b; j++) hm[i * nz + j] = top + item.dim[2]
      placed.push({ key: `${id}-${n}`, id, n, x: (x + a / 2) * CELL, z: (z + b / 2) * CELL, y: top, l: a * CELL, w: b * CELL, h: item.dim[2] })
    }
  }
  return { placed, failed }
}

function find(item: Item, hm: Float32Array, nx: number, nz: number, H: number) {
  const [l, w, h] = item.dim
  const turns: [number, number][] = [
    [Math.ceil(l / CELL - 1e-6), Math.ceil(w / CELL - 1e-6)],
    [Math.ceil(w / CELL - 1e-6), Math.ceil(l / CELL - 1e-6)],
  ]
  for (let x = 0; x < nx; x++) {
    let best: { x: number; z: number; a: number; b: number; top: number } | null = null
    for (const [a, b] of turns) {
      if (x + a > nx || b > nz) continue
      for (let z = 0; z + b <= nz; z++) {
        let hi = 0
        let lo = Infinity
        for (let i = x; i < x + a; i++) {
          for (let j = z; j < z + b; j++) {
            const v = hm[i * nz + j]
            if (v > hi) hi = v
            if (v < lo) lo = v
          }
        }
        if (item.floor && hi > 0) continue
        if (hi - lo > 0.05) continue
        if (hi + h > H + 1e-6) continue
        if (!best || hi < best.top - 1e-6) best = { x, z, a, b, top: hi }
      }
    }
    if (best) return best
  }
  return null
}

export const spaceOf = (counts: Counts) => ITEMS.reduce((s, i) => s + (counts[i.id] ?? 0) * i.space, 0)
export const countOf = (counts: Counts) => ITEMS.reduce((s, i) => s + (counts[i.id] ?? 0), 0)

export type Estimate = {
  truck: Truck
  space: number
  placed: Placed[]
  failed: number
  kind: 'empty' | 'small' | 'truck' | 'over'
}

// Машину подбираем по прайсу: самая маленькая, куда вещи помещаются и по объёму, и по раскладке.
export function estimate(counts: Counts, preset: number | null): Estimate {
  const space = spaceOf(counts)
  if (preset) {
    const truck = TRUCKS[preset - 1]
    return { truck, space, ...pack(counts, truck.size), kind: 'truck' }
  }
  if (countOf(counts) === 0) return { truck: TRUCKS[0], space, placed: [], failed: 0, kind: 'empty' }
  for (const truck of TRUCKS) {
    if (space > truck.id) continue
    const r = pack(counts, truck.size)
    if (r.failed === 0) return { truck, space, ...r, kind: space < 4 ? 'small' : 'truck' }
  }
  const truck = TRUCKS[TRUCKS.length - 1]
  return { truck, space, ...pack(counts, truck.size), kind: 'over' }
}

export const presetCounts = (id: number) => ({ ...(PRESETS.find((p) => p.id === id)?.counts ?? {}) })

export const fmtM3 = (v: number) => (v < 10 ? v.toFixed(1).replace('.', ',') : String(Math.round(v)))

export function summary(e: Estimate) {
  if (e.kind === 'empty') return { head: 'Добавьте вещи', line: 'Кузов покажет, сколько места они займут.' }
  if (e.kind === 'small') return { head: 'Хватит почасового тарифа', line: `${HOURLY.what}, минимальный заказ 3 часа` }
  if (e.kind === 'over') return { head: 'Больше 36 м³', line: 'Скорее всего, нужна вторая машина или второй рейс. Посчитаем по фото.' }
  return { head: `Машина ${e.truck.id} м³`, line: `${e.truck.crew}, ${e.truck.hours}` }
}
