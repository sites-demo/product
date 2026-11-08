// Машина из кода: кузов собран из настоящих деталей (бамперы, капот, крылья, двери, пороги, крыша),
// каждая деталь — свой меш, по ним можно тыкать. Ось x смотрит вперёд, y вверх, z вправо.
import * as THREE from 'three'

export type BodyType = 'sedan' | 'hatch' | 'crossover'

export type PanelId =
  | 'bumperF' | 'bumperR' | 'hood' | 'trunk' | 'roof'
  | 'fenderFL' | 'fenderFR' | 'doorFL' | 'doorFR' | 'doorRL' | 'doorRR'
  | 'quarterRL' | 'quarterRR' | 'sillL' | 'sillR' | 'mirrorL' | 'mirrorR'

type Part = PanelId | 'glass' | 'under' | 'headlight' | 'taillight' | 'grille'

type Shape = {
  L: number; W: number; clearance: number; wheelR: number; wheelBase: number
  belt: number; roof: number; hoodFront: number; deckRear: number
  aX: number; roofFront: number; roofRear: number; cX: number; tumble: number
}

const SHAPES: Record<BodyType, Shape> = {
  sedan: { L: 4.72, W: 1.84, clearance: 0.16, wheelR: 0.345, wheelBase: 2.8, belt: 1.0, roof: 1.45, hoodFront: 0.8, deckRear: 1.0, aX: 0.48, roofFront: -0.32, roofRear: -1.25, cX: -1.84, tumble: 0.15 },
  hatch: { L: 4.3, W: 1.8, clearance: 0.16, wheelR: 0.335, wheelBase: 2.66, belt: 1.0, roof: 1.47, hoodFront: 0.8, deckRear: 1.0, aX: 0.44, roofFront: -0.3, roofRear: -1.66, cX: -1.98, tumble: 0.15 },
  crossover: { L: 4.55, W: 1.86, clearance: 0.21, wheelR: 0.37, wheelBase: 2.72, belt: 1.1, roof: 1.68, hoodFront: 0.94, deckRear: 1.1, aX: 0.56, roofFront: -0.18, roofRear: -1.86, cX: -2.12, tumble: 0.13 },
}

export const PANEL_NAMES: Record<PanelId, string> = {
  bumperF: 'Передний бампер', bumperR: 'Задний бампер', hood: 'Капот', trunk: 'Крышка багажника', roof: 'Крыша',
  fenderFL: 'Переднее левое крыло', fenderFR: 'Переднее правое крыло',
  doorFL: 'Передняя левая дверь', doorFR: 'Передняя правая дверь',
  doorRL: 'Задняя левая дверь', doorRR: 'Задняя правая дверь',
  quarterRL: 'Заднее левое крыло', quarterRR: 'Заднее правое крыло',
  sillL: 'Левый порог', sillR: 'Правый порог', mirrorL: 'Левое зеркало', mirrorR: 'Правое зеркало',
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const spow = (v: number, p: number) => Math.sign(v) * Math.abs(v) ** p

export type CarMaterials = {
  paint: THREE.MeshPhysicalMaterial
  glass: THREE.MeshPhysicalMaterial
  dark: THREE.MeshStandardMaterial
  trim: THREE.MeshPhysicalMaterial
  chrome: THREE.MeshStandardMaterial
  head: THREE.MeshPhysicalMaterial
  tail: THREE.MeshPhysicalMaterial
  tire: THREE.MeshStandardMaterial
  rim: THREE.MeshStandardMaterial
  seam: THREE.LineBasicMaterial
}

export function carMaterials(paint: string): CarMaterials {
  return {
    paint: new THREE.MeshPhysicalMaterial({ color: paint, metalness: 0.25, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.06 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#0d1217', metalness: 0.1, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.03 }),
    dark: new THREE.MeshStandardMaterial({ color: '#16191d', roughness: 0.7, metalness: 0.1 }),
    chrome: new THREE.MeshStandardMaterial({ color: '#c9cdd2', roughness: 0.18, metalness: 1 }),
    head: new THREE.MeshPhysicalMaterial({ color: '#f4f8ff', roughness: 0.15, metalness: 0, emissive: '#eaf3ff', emissiveIntensity: 0.9 }),
    tail: new THREE.MeshPhysicalMaterial({ color: '#7a0a10', roughness: 0.12, metalness: 0.1, clearcoat: 1, emissive: '#e3121e', emissiveIntensity: 0.55 }),
    trim: new THREE.MeshPhysicalMaterial({ color: '#0b0c0e', roughness: 0.5, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.25, envMapIntensity: 0.55 }),
    tire: new THREE.MeshStandardMaterial({ color: '#151618', roughness: 0.95, metalness: 0, envMapIntensity: 0.3 }),
    rim: new THREE.MeshStandardMaterial({ color: '#a7adb4', roughness: 0.3, metalness: 0.9 }),
    seam: new THREE.LineBasicMaterial({ color: '#0b0d10', transparent: true, opacity: 0.55 }),
  }
}

type Grid = { pos: Float32Array; nu: number; nv: number }

const PAINTED = new Set<Part>(['bumperF', 'bumperR', 'hood', 'trunk', 'roof', 'fenderFL', 'fenderFR', 'doorFL', 'doorFR', 'doorRL', 'doorRR', 'quarterRL', 'quarterRR', 'sillL', 'sillR'])

function computeNormals(g: Grid, closedV: boolean): Float32Array {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(g.pos, 3))
  geo.setIndex(quadIndex(g.nu, g.nv, closedV, () => true))
  geo.computeVertexNormals()
  return (geo.getAttribute('normal') as THREE.BufferAttribute).array as Float32Array
}

function quadIndex(nu: number, nv: number, closedV: boolean, keep: (i: number, j: number) => boolean) {
  const idx: number[] = []
  const vmax = closedV ? nv : nv - 1
  for (let i = 0; i < nu - 1; i++) for (let j = 0; j < vmax; j++) {
    if (!keep(i, j)) continue
    const j2 = (j + 1) % nv
    const a = i * nv + j, b = (i + 1) * nv + j, c = (i + 1) * nv + j2, d = i * nv + j2
    idx.push(a, b, d, b, c, d)
  }
  return idx
}

// Разбирает сетку на детали: каждая клетка получает свою деталь, из клеток собираются меши,
// а на стыках разных деталей рисуются тёмные швы.
function splitGrid(g: Grid, closedV: boolean, label: (i: number, j: number, c: THREE.Vector3, n: THREE.Vector3) => Part | null, given?: Float32Array) {
  const normals = given ?? computeNormals(g, closedV)
  const { nu, nv, pos } = g
  // Развёртка: u вдоль кузова, v по кругу сечения. По ней рисуются фары и решётки.
  const uvs = new Float32Array(nu * nv * 2)
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { uvs[(i * nv + j) * 2] = i / (nu - 1); uvs[(i * nv + j) * 2 + 1] = j / nv }
  const vmax = closedV ? nv : nv - 1
  const parts: (Part | null)[] = new Array((nu - 1) * vmax)
  const c = new THREE.Vector3(), n = new THREE.Vector3(), t = new THREE.Vector3()
  for (let i = 0; i < nu - 1; i++) for (let j = 0; j < vmax; j++) {
    const j2 = (j + 1) % nv
    c.set(0, 0, 0); n.set(0, 0, 0)
    for (const k of [i * nv + j, (i + 1) * nv + j, (i + 1) * nv + j2, i * nv + j2]) {
      c.add(t.fromArray(pos, k * 3)); n.add(t.fromArray(normals, k * 3))
    }
    c.multiplyScalar(0.25); n.normalize()
    parts[i * vmax + j] = label(i, j, c, n)
  }
  const byPart = new Map<Part, number[]>()
  parts.forEach((p, q) => { if (p) { if (!byPart.has(p)) byPart.set(p, []); byPart.get(p)!.push(q) } })
  const geos = new Map<Part, THREE.BufferGeometry>()
  for (const [p, qs] of byPart) {
    const idx: number[] = []
    for (const q of qs) {
      const i = Math.floor(q / vmax), j = q % vmax, j2 = (j + 1) % nv
      const a = i * nv + j, b = (i + 1) * nv + j, cc = (i + 1) * nv + j2, d = i * nv + j2
      idx.push(a, b, d, b, cc, d)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
    geo.setIndex(idx)
    geos.set(p, compact(geo))
  }
  // Швы: ребро между клетками разных деталей.
  const seam: number[] = []
  const push = (k1: number, k2: number) => {
    for (const k of [k1, k2]) seam.push(pos[k * 3] + normals[k * 3] * 0.002, pos[k * 3 + 1] + normals[k * 3 + 1] * 0.002, pos[k * 3 + 2] + normals[k * 3 + 2] * 0.002)
  }
  const at = (i: number, j: number) => (i < 0 || i >= nu - 1 ? null : parts[i * vmax + ((j + vmax) % vmax)])
  for (let i = 0; i < nu - 1; i++) for (let j = 0; j < vmax; j++) {
    const p = parts[i * vmax + j]
    if (!p) continue
    if (!PAINTED.has(p)) continue
    const right = at(i + 1, j)
    if (right && right !== p && PAINTED.has(right)) push((i + 1) * nv + j, (i + 1) * nv + ((j + 1) % nv))
    if (closedV || j + 1 < vmax) {
      const up = at(i, j + 1)
      if (up && up !== p && PAINTED.has(up)) push(i * nv + ((j + 1) % nv), (i + 1) * nv + ((j + 1) % nv))
    }
  }
  return { geos, seam }
}


// Скруглённый прямоугольник: расстояние со знаком до границы, в метрах.
function roundBox(px: number, py: number, bx: number, by: number, r: number) {
  const qx = Math.abs(px) - bx + r, qy = Math.abs(py) - by + r
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r
}
const cover = (d: number) => Math.min(1, Math.max(0, 0.5 - d / 0.004))

// Маска деталей по развёртке сетки: для каждого текселя берём точку и нормаль кузова и спрашиваем fn.
function featureMask(g: Grid & { nor: Float32Array }, fn: (c: THREE.Vector3, n: THREE.Vector3, out: number[]) => void) {
  const W = 1536, H = 512
  const data = new Uint8Array(W * H * 4)
  const c = new THREE.Vector3(), n = new THREE.Vector3(), out = [0, 0, 0]
  const { pos, nor, nu, nv } = g
  for (let px = 0; px < W; px++) {
    const fi = ((px + 0.5) / W) * (nu - 1)
    const i0 = Math.min(nu - 2, Math.floor(fi)), di = fi - i0
    for (let py = 0; py < H; py++) {
      const fj = ((py + 0.5) / H) * nv
      const j0 = Math.floor(fj) % nv, j1 = (j0 + 1) % nv, dj = fj - Math.floor(fj)
      const a = (i0 * nv + j0) * 3, b = ((i0 + 1) * nv + j0) * 3, cc = ((i0 + 1) * nv + j1) * 3, d = (i0 * nv + j1) * 3
      const w0 = (1 - di) * (1 - dj), w1 = di * (1 - dj), w2 = di * dj, w3 = (1 - di) * dj
      c.set(
        pos[a] * w0 + pos[b] * w1 + pos[cc] * w2 + pos[d] * w3,
        pos[a + 1] * w0 + pos[b + 1] * w1 + pos[cc + 1] * w2 + pos[d + 1] * w3,
        pos[a + 2] * w0 + pos[b + 2] * w1 + pos[cc + 2] * w2 + pos[d + 2] * w3)
      n.set(
        nor[a] * w0 + nor[b] * w1 + nor[cc] * w2 + nor[d] * w3,
        nor[a + 1] * w0 + nor[b + 1] * w1 + nor[cc + 1] * w2 + nor[d + 1] * w3,
        nor[a + 2] * w0 + nor[b + 2] * w1 + nor[cc + 2] * w2 + nor[d + 2] * w3).normalize()
      fn(c, n, out)
      const k = (py * W + px) * 4
      data[k] = out[0] * 255; data[k + 1] = out[1] * 255; data[k + 2] = out[2] * 255; data[k + 3] = 255
    }
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat)
  tex.wrapT = THREE.RepeatWrapping
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.generateMipmaps = true
  tex.anisotropy = 4
  tex.needsUpdate = true
  return tex
}

// Оставляет в геометрии только используемые вершины.
function compact(geo: THREE.BufferGeometry) {
  const index = geo.getIndex()!.array
  const pos = geo.getAttribute('position').array, nor = geo.getAttribute('normal').array
  const uvA = geo.getAttribute('uv')?.array
  const map = new Map<number, number>(), p: number[] = [], n: number[] = [], uv: number[] = [], idx: number[] = []
  for (const v of index) {
    let k = map.get(v)
    if (k === undefined) {
      k = map.size; map.set(v, k)
      p.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]); n.push(nor[v * 3], nor[v * 3 + 1], nor[v * 3 + 2])
      if (uvA) uv.push(uvA[v * 2], uvA[v * 2 + 1])
    }
    idx.push(k)
  }
  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.Float32BufferAttribute(p, 3))
  out.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3))
  if (uvA) out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  out.setIndex(idx)
  return out
}

export type Car = {
  group: THREE.Group
  panels: Map<PanelId, THREE.Mesh[]>
  pickables: THREE.Object3D[]
  wheels: THREE.Object3D[]
  shape: Shape
  materials: CarMaterials
  dispose: () => void
}

export function buildCar(type: BodyType, mats: CarMaterials): Car {
  const S = SHAPES[type]
  const half = S.L / 2, hw = S.W / 2
  const axF = S.wheelBase / 2, axR = -S.wheelBase / 2
  const arch = S.wheelR + 0.075
  const group = new THREE.Group()
  const panels = new Map<PanelId, THREE.Mesh[]>()
  const pickables: THREE.Object3D[] = []

  // Профиль сбоку: верх нижней части кузова (капот, линия окон, багажник) и низ.
  const top = (x: number) => {
    if (x >= S.aX) {
      const t = (x - S.aX) / (half - S.aX)
      return lerp(S.belt - 0.03, S.hoodFront, t ** 1.6) - 0.05 * Math.sin(Math.PI * t) * 0
    }
    if (x <= S.cX) {
      const t = (S.cX - x) / (S.cX + half)
      return lerp(S.belt, S.deckRear, t) - (type === 'sedan' ? 0 : 0.04 * t)
    }
    return S.belt
  }
  const bottom = (x: number) => S.clearance + 0.1 * smooth(axF + 0.25, half, x) + 0.13 * smooth(-axR + 0.2, half, -x)
  const width = (x: number) => {
    const t = x / half
    const p = x > 0 ? 7 : 9
    return hw * (1 - Math.min(1, Math.abs(t)) ** p) ** (1 / p)
  }
  const endH = (x: number) => {
    const t = Math.abs(x / half)
    const p = x > 0 ? 7 : 8
    return (1 - Math.min(1, t) ** p) ** (1 / p)
  }

  // Нижняя часть кузова: замкнутое сечение-суперэллипс вдоль длины.
  const NU = 170, NV = 104
  const pos = new Float32Array(NU * NV * 3)
  // Сечения по длине: тело кузова от кормы до носа, а на концах кольца сходятся к центру,
  // чтобы нос и корма были закрыты гладкой «крышкой», а не дырой.
  const K = 16
  const M = NU - 2 * K
  const endAt = (sign: number) => {
    // Где высота торца падает до 60 %: дальше начинается крышка.
    const p = sign > 0 ? 7 : 8
    const t = (1 - 0.6 ** p) ** (1 / p)
    return half * (1 - t)
  }
  const eF = endAt(1), eR = endAt(-1)
  const cols: { x: number; a: number; mid: number; b: number }[] = []
  for (let i = 0; i < M; i++) {
    const u = i / (M - 1)
    const x = -half + eR + (S.L - eF - eR) * (0.5 - 0.5 * Math.cos(Math.PI * u))
    const yt = top(x), yb = bottom(x)
    cols.push({ x, a: Math.max(width(x), 0.004), mid: (yt + yb) / 2, b: Math.max(((yt - yb) / 2) * endH(x), 0.004) })
  }
  const capF: typeof cols = [], capR: typeof cols = []
  for (let k = 1; k <= K; k++) {
    const sc = Math.cos((Math.PI / 2) * (k / K)), bulge = 1 - sc * sc
    const f = cols[M - 1], r = cols[0]
    capF.push({ x: f.x + eF * bulge, a: Math.max(f.a * sc, 0.002), mid: f.mid, b: Math.max(f.b * sc, 0.002) })
    capR.unshift({ x: r.x - eR * bulge, a: Math.max(r.a * sc, 0.002), mid: r.mid, b: Math.max(r.b * sc, 0.002) })
  }
  const all = [...capR, ...cols, ...capF]
  for (let i = 0; i < NU; i++) {
    const { x, a, mid, b } = all[i]
    for (let j = 0; j < NV; j++) {
      const th = (2 * Math.PI * j) / NV
      const cz = spow(Math.cos(th), 2 / 6.5), sy = spow(Math.sin(th), 2 / 5)
      let y = mid + b * sy
      let z = a * cz
      // завал боковины наверху и лёгкая «талия» по линии ручек
      const up = Math.max(0, (y - (mid + b * 0.35)) / (b * 0.65 + 1e-6))
      z *= 1 - 0.07 * up * up
      z *= 1 + 0.012 * Math.exp(-(((y - (S.belt - 0.13)) / 0.035) ** 2)) - 0.02 * smooth(S.clearance + 0.25, S.clearance, y)
      const k = (i * NV + j) * 3
      pos[k] = x; pos[k + 1] = y; pos[k + 2] = z
    }
  }
  const wheelXs = [axF, axR]
  // Арки колёс: вершины боковины внутри круга сдвигаются на его край, верх — по дуге, низ — по вертикали.
  const lowerNormals = computeNormals({ pos, nu: NU, nv: NV }, true)
  for (let k = 0; k < NU * NV; k++) {
    if (Math.abs(lowerNormals[k * 3 + 2]) < 0.45) continue
    const x = pos[k * 3], y = pos[k * 3 + 1]
    for (const wx of wheelXs) {
      const dx = x - wx, dy = y - S.wheelR
      if (dy >= 0) {
        const d = Math.hypot(dx, dy)
        if (d < arch) { pos[k * 3] = wx + (dx / (d || 1)) * arch; pos[k * 3 + 1] = S.wheelR + (dy / (d || 1)) * arch }
      } else if (Math.abs(dx) < arch) {
        pos[k * 3] = wx + Math.sign(dx || 1) * arch
      }
    }
  }
  const inArch = (c: THREE.Vector3) => wheelXs.some(wx => Math.abs(c.x - wx) < arch - 0.01 && (c.y < S.wheelR || Math.hypot(c.x - wx, c.y - S.wheelR) < arch - 0.01)) && Math.abs(c.z) > hw * 0.5
  const doorF = axF - arch - 0.02, doorB = (S.roofFront + S.roofRear) / 2 + 0.05, doorR = axR + arch + 0.02
  const frontBump = half - 0.4, rearBump = -half + 0.38
  const lower = splitGrid({ pos, nu: NU, nv: NV }, true, (i, j, c) => {
    if (inArch(c)) return null
    const side: 'L' | 'R' = c.z > 0 ? 'R' : 'L'
    // Капот и крышка багажника: верхняя полоса сечения. Граница идёт по линии сетки, поэтому ровная.
    const th = (2 * Math.PI * (j + 0.5)) / NV
    const topBand = Math.abs(th - Math.PI / 2) < 0.8
    if (c.x > frontBump) return topBand && i < NU - K - 1 ? 'hood' : 'bumperF'
    if (c.x < rearBump) return topBand && i > K ? 'trunk' : 'bumperR'
    if (topBand) {
      if (c.x > S.aX - 0.02) return 'hood'
      if (c.x < S.cX + 0.02) return 'trunk'
    }
    if (c.y < S.clearance + 0.14 && c.x < doorF && c.x > doorR) return side === 'L' ? 'sillL' : 'sillR'
    if (c.x >= doorF) return side === 'L' ? 'fenderFL' : 'fenderFR'
    if (c.x >= doorB) return side === 'L' ? 'doorFL' : 'doorFR'
    if (c.x >= doorR) return side === 'L' ? 'doorRL' : 'doorRR'
    return side === 'L' ? 'quarterRL' : 'quarterRR'
  }, lowerNormals)

  // Салон: стёкла, стойки и крыша над линией окон.
  const roofAt = (x: number) => {
    if (x >= S.roofFront) return lerp(S.roof, S.belt, smooth(S.roofFront, S.aX, x) ** 0.85)
    if (x <= S.roofRear) return lerp(S.roof, S.belt, smooth(S.roofRear, S.cX, x) ** (type === 'sedan' ? 0.9 : 0.6))
    const m = (S.roofFront + S.roofRear) / 2, span = (S.roofFront - S.roofRear) / 2
    return S.roof + 0.025 * (1 - ((x - m) / span) ** 2)
  }
  const CU = 120, CV = 44
  const cpos = new Float32Array(CU * CV * 3)
  for (let i = 0; i < CU; i++) {
    const u = i / (CU - 1)
    const x = S.cX + (S.aX - S.cX) * u
    const a0 = width(x) * 0.93, h = Math.max(roofAt(x) - S.belt + 0.03, 0.002)
    const aTop = a0 - S.tumble
    for (let j = 0; j < CV; j++) {
      const th = Math.PI * (j / (CV - 1)) // 0 — левый низ, π — правый низ
      const sn = Math.sin(th), co = Math.cos(th)
      const y = S.belt - 0.03 + h * spow(sn, 2 / 4.2)
      const aw = lerp(a0, aTop, Math.min(1, Math.max(0, (y - S.belt) / Math.max(S.roof - S.belt, 0.01))) ** 1.1)
      const z = aw * spow(co, 2 / 5)
      const k = (i * CV + j) * 3
      cpos[k] = x; cpos[k + 1] = y; cpos[k + 2] = z
    }
  }
  // Стойки и рамки чёрные, крыша в цвет кузова: так выглядит большинство современных машин.
  const cabin = splitGrid({ pos: cpos, nu: CU, nv: CV }, false, (_i, _j, c, n) => {
    const aTop = width(c.x) * 0.93 - S.tumble
    if (n.y > 0.55 && c.x < S.roofFront - 0.06 && c.x > S.roofRear + 0.08 && Math.abs(c.z) < aTop - 0.02) return 'roof'
    return 'glass'
  })

  const matFor = (p: Part): THREE.Material => {
    if (p === 'glass') return mats.glass
    if (p === 'under' || p === 'grille') return mats.dark
    return mats.paint
  }
  const pickFor = (p: Part): PanelId | null => {
    if (p === 'headlight' || p === 'grille') return 'bumperF'
    if (p === 'taillight') return 'bumperR'
    if (p === 'glass' || p === 'under') return null
    return p
  }
  const add = (p: Part, geo: THREE.BufferGeometry) => {
    const id = pickFor(p)
    const mesh = new THREE.Mesh(geo, id && p !== 'headlight' && p !== 'grille' && p !== 'taillight' ? mats.paint.clone() : matFor(p))
    mesh.userData.panel = id
    mesh.userData.part = p
    group.add(mesh)
    if (id) {
      pickables.push(mesh)
      if (!panels.has(id)) panels.set(id, [])
      if (p !== 'headlight' && p !== 'grille' && p !== 'taillight') panels.get(id)!.push(mesh)
    }
  }
  for (const [p, g] of lower.geos) add(p, g)
  for (const [p, g] of cabin.geos) add(p, g)

  // Фары, решётки, фонари и тёмный низ рисуются маской по развёртке кузова:
  // так у них гладкие края, а не ступеньки клеток сетки.
  const mask = featureMask({ pos, nor: lowerNormals, nu: NU, nv: NV }, (c, n, out) => {
    const x = c.x, az = Math.abs(c.z), yt = top(x), yb = bottom(x)
    let dark = 0, head = 0, tail = 0
    dark = Math.max(dark, smooth(-0.42, -0.62, n.y))
    if (x > half - 0.5 && n.x > -0.35) {
      const fade = smooth(half - 0.5, half - 0.42, x)
      // Фара: вытянутая, внешний край выше и заходит на крыло.
      const t = Math.min(1, Math.max(0, (az - hw * 0.46) / (hw * 0.56)))
      const cy = yt - 0.072 + 0.022 * t
      const dh = roundBox(az - hw * 0.77, c.y - cy, hw * 0.31, 0.03 - 0.006 * t, 0.018)
      dark = Math.max(dark, cover(dh) * fade)
      const drl = roundBox(az - hw * 0.77, c.y - (cy + 0.014 - 0.002 * t), hw * 0.27, 0.0055, 0.0055)
      head = Math.max(head, cover(drl) * fade)
      if (n.x > 0.35) {
        const g1 = roundBox(c.z, c.y - (yt - 0.08), hw * 0.38, 0.03, 0.02)
        const g2 = roundBox(c.z, c.y - (yb + 0.13), hw * 0.62, 0.062, 0.035)
        dark = Math.max(dark, cover(g1) * smooth(0.35, 0.5, n.x), cover(g2) * smooth(0.35, 0.5, n.x))
      }
    }
    if (x < -half + 0.48 && n.x < 0.35) {
      const fade = smooth(-half + 0.48, -half + 0.4, x)
      const cy = yt - 0.078
      const dt = roundBox(az - hw * 0.69, c.y - cy, hw * 0.33, 0.03, 0.014)
      const bar = roundBox(c.z, c.y - cy, hw * 0.5, 0.006, 0.006)
      tail = Math.max(tail, cover(dt) * fade, cover(bar) * fade * smooth(-0.3, -0.6, n.x))
      if (n.x < -0.5) dark = Math.max(dark, smooth(yb + 0.1, yb + 0.08, c.y) * smooth(-0.5, -0.65, n.x))
    }
    out[0] = dark; out[1] = head; out[2] = tail
  })
  const overlay = (ch: 'r' | 'g' | 'b', mat: THREE.MeshPhysicalMaterial) => {
    mat.alphaMap = mask
    mat.transparent = true
    mat.depthWrite = false
    mat.polygonOffset = true
    mat.polygonOffsetFactor = -2
    mat.polygonOffsetUnits = -2
    mat.onBeforeCompile = sh => {
      // Полоса, где развёртка замыкается по кругу, даёт скачок координат: там маску не рисуем.
      sh.fragmentShader = sh.fragmentShader.replace('#include <alphamap_fragment>', `if (fwidth(vAlphaMapUv.y) > 0.25) discard;
diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).${ch};`)
    }
    mat.customProgramCacheKey = () => 'mask-' + ch
    return mat
  }
  const overDark = overlay('r', mats.trim)
  const overHead = overlay('g', mats.head)
  const overTail = overlay('b', mats.tail)
  for (const [p, g] of lower.geos) {
    const box = (g.computeBoundingBox(), g.boundingBox!)
    const layers: THREE.Material[] = [overDark]
    if (box.max.x > half - 0.5) layers.push(overHead)
    if (box.min.x < -half + 0.5) layers.push(overTail)
    for (const m of layers) {
      const o = new THREE.Mesh(g, m)
      o.renderOrder = 2
      o.userData.part = p
      group.add(o)
    }
  }
  // Если у одной детали два меша (дверь снизу и рамка окна), у них должен быть один материал.
  for (const meshes of panels.values()) for (const m of meshes) m.material = meshes[0].material
  const seamGeo = new THREE.BufferGeometry()
  seamGeo.setAttribute('position', new THREE.Float32BufferAttribute([...lower.seam, ...cabin.seam], 3))
  group.add(new THREE.LineSegments(seamGeo, mats.seam))

  // Подкрылки: тёмные полукольца в арках.
  for (const wx of wheelXs) for (const sz of [-1, 1]) {
    const liner = new THREE.Mesh(new THREE.CylinderGeometry(arch - 0.005, arch - 0.005, 0.34, 32, 1, true, Math.PI / 2 - 0.15, Math.PI + 0.3), mats.dark)
    liner.material.side = THREE.DoubleSide
    liner.rotation.x = Math.PI / 2
    liner.position.set(wx, S.wheelR, sz * (hw - 0.2))
    group.add(liner)
  }

  // Зеркала.
  for (const sz of [-1, 1]) {
    const mg = new THREE.SphereGeometry(1, 20, 12)
    mg.scale(0.11, 0.06, 0.085)
    const mirror = new THREE.Mesh(mg, mats.paint)
    const mx = S.aX - 0.1
    mirror.position.set(mx, S.belt + 0.075, sz * (width(mx) * 0.93 + 0.085))
    const id: PanelId = sz > 0 ? 'mirrorR' : 'mirrorL'
    mirror.material = mats.paint.clone()
    mirror.userData.panel = id
    group.add(mirror)
    pickables.push(mirror)
    panels.set(id, [mirror])
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.08), mats.dark)
    arm.position.set(mx + 0.02, S.belt + 0.05, sz * (width(mx) * 0.93 + 0.02))
    group.add(arm)
  }

  // Колёса: шина, диск с пятью спицами, тормозной диск.
  const wheels: THREE.Object3D[] = []
  const tireProfile: THREE.Vector2[] = []
  const R = S.wheelR, rr = R * 0.72, tw = 0.235
  for (let k = 0; k <= 16; k++) {
    const t = k / 16, ang = -Math.PI / 2 + Math.PI * t
    tireProfile.push(new THREE.Vector2(rr + (R - rr) * (0.5 + 0.5 * Math.cos(ang)) ** 0.35 * 1, (tw / 2) * Math.sin(ang)))
  }
  const tireGeo = new THREE.LatheGeometry(tireProfile, 48)
  tireGeo.rotateX(Math.PI / 2)
  const rimShape = new THREE.Shape()
  rimShape.absarc(0, 0, rr * 0.98, 0, Math.PI * 2, false)
  for (let s = 0; s < 5; s++) {
    const a0 = (s / 5) * Math.PI * 2 + 0.24, a1 = ((s + 1) / 5) * Math.PI * 2 - 0.24
    const hole = new THREE.Path()
    hole.absarc(0, 0, rr * 0.82, a0, a1, false)
    hole.absarc(0, 0, rr * 0.32, a1 - 0.12, a0 + 0.12, true)
    rimShape.holes.push(hole)
  }
  const rimGeo = new THREE.ExtrudeGeometry(rimShape, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 2, curveSegments: 40 })
  const discGeo = new THREE.CylinderGeometry(rr * 0.78, rr * 0.78, 0.03, 40)
  discGeo.rotateX(Math.PI / 2)
  const hubGeo = new THREE.CylinderGeometry(rr * 0.2, rr * 0.22, 0.05, 24)
  hubGeo.rotateX(Math.PI / 2)
  for (const wx of wheelXs) for (const sz of [-1, 1]) {
    const w = new THREE.Group()
    w.add(new THREE.Mesh(tireGeo, mats.tire))
    const rim = new THREE.Mesh(rimGeo, mats.rim)
    rim.position.z = sz > 0 ? tw / 2 - 0.06 : -(tw / 2 - 0.06)
    if (sz < 0) rim.rotation.y = Math.PI
    w.add(rim)
    const disc = new THREE.Mesh(discGeo, mats.chrome)
    disc.position.z = sz * 0.02
    w.add(disc)
    const hub = new THREE.Mesh(hubGeo, mats.rim)
    hub.position.z = sz * (tw / 2 - 0.03)
    w.add(hub)
    w.position.set(wx, R, sz * (hw - 0.17))
    group.add(w)
    wheels.push(w)
  }

  return {
    group, panels, pickables, wheels, shape: S, materials: mats,
    dispose: () => {
      group.traverse(o => {
        const m = o as THREE.Mesh
        if (m.geometry) m.geometry.dispose()
      })
      mask.dispose()
    },
  }
}
