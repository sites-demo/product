import * as THREE from 'three'

// Точка профиля: радиус, высота и радиус скругления этого угла (фаска).
export type P = [r: number, y: number, c?: number]

const v2 = (p: P) => new THREE.Vector2(p[0], p[1])

export function roundProfile(pts: P[], steps = 4): THREE.Vector2[] {
  const out: THREE.Vector2[] = []
  pts.forEach((p, i) => {
    const c = p[2] ?? 0
    if (!c || i === 0 || i === pts.length - 1) {
      out.push(v2(p))
      return
    }
    const here = v2(p)
    const toPrev = v2(pts[i - 1]).sub(here)
    const toNext = v2(pts[i + 1]).sub(here)
    const cut = Math.min(c, toPrev.length() * 0.49, toNext.length() * 0.49)
    const a = here.clone().addScaledVector(toPrev.normalize(), cut)
    const b = here.clone().addScaledVector(toNext.normalize(), cut)
    const bez = new THREE.QuadraticBezierCurve(a, here, b)
    for (let s = 0; s <= steps; s++) out.push(bez.getPoint(s / steps))
  })
  return out
}

export const lathe = (pts: P[], seg = 48) => new THREE.LatheGeometry(roundProfile(pts), seg)

// Резьба на патрубке: зубцы прямо в профиле токарной детали.
export function threads(r: number, y0: number, y1: number, turns: number, depth = 0.007): P[] {
  const out: P[] = []
  const pitch = (y1 - y0) / turns
  for (let i = 0; i < turns; i++) {
    out.push([r, y0 + pitch * i], [r - depth, y0 + pitch * (i + 0.5)])
  }
  out.push([r, y1])
  return out
}

type RibOptions = {
  count: number
  perRib: number
  depth: number
  rib: (phase: number) => number
  mask: (y: number) => number
  rows?: number
}

// Тело вращения, у которого рёбра или рифление выдавлены в самой геометрии.
export function ribbedLathe(pts: P[], o: RibOptions) {
  const base = roundProfile(pts, 5)
  const profile: THREE.Vector2[] = []
  const rowStep = o.rows ?? 0.03
  base.forEach((p, i) => {
    profile.push(p)
    const next = base[i + 1]
    if (!next) return
    const n = Math.floor(p.distanceTo(next) / rowStep)
    for (let k = 1; k < n; k++) profile.push(p.clone().lerp(next, k / n))
  })
  const seg = o.count * o.perRib
  const rows = profile.length
  const pos = new Float32Array(seg * rows * 3)
  profile.forEach((p, j) => {
    const edge = p.x < 0.01 ? 0 : o.mask(p.y)
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2
      const phase = ((i / seg) * o.count) % 1
      const r = p.x + o.depth * o.rib(phase) * edge
      const k = (j * seg + i) * 3
      pos[k] = r * Math.sin(a)
      pos[k + 1] = p.y
      pos[k + 2] = r * Math.cos(a)
    }
  })
  const index: number[] = []
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < seg; i++) {
      const a = j * seg + i
      const b = j * seg + ((i + 1) % seg)
      const c = (j + 1) * seg + ((i + 1) % seg)
      const d = (j + 1) * seg + i
      index.push(a, b, d, c, d, b)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setIndex(index)
  g.computeVertexNormals()
  return g
}

const extrudeOf = (shape: THREE.Shape, depth: number, bevel: number, segments = 3, curve = 16) => {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.001, depth - bevel * 2),
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelOffset: -bevel,
    bevelSegments: segments,
    curveSegments: curve,
  })
  g.center()
  return g
}

// Шестигранник с фаской, ось вдоль Y. across — размер под ключ.
export function hexNut(across: number, height: number, bevel = 0.018) {
  const r = across / Math.sqrt(3)
  const s = new THREE.Shape()
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    const x = Math.cos(a) * r
    const y = Math.sin(a) * r
    if (i) s.lineTo(x, y)
    else s.moveTo(x, y)
  }
  s.closePath()
  const g = extrudeOf(s, height, bevel, 2)
  g.rotateX(Math.PI / 2)
  return g
}

// Ручка-бабочка шарового крана, лежит в плоскости XZ.
export function butterflyHandle() {
  const s = new THREE.Shape()
  s.moveTo(-0.06, 0.05)
  s.bezierCurveTo(-0.15, 0.135, -0.31, 0.12, -0.322, 0)
  s.bezierCurveTo(-0.31, -0.12, -0.15, -0.135, -0.06, -0.05)
  s.lineTo(0.06, -0.05)
  s.bezierCurveTo(0.15, -0.135, 0.31, -0.12, 0.322, 0)
  s.bezierCurveTo(0.31, 0.12, 0.15, 0.135, 0.06, 0.05)
  s.closePath()
  const g = extrudeOf(s, 0.076, 0.016, 4, 24)
  g.rotateX(Math.PI / 2)
  return g
}

// Вертушка счётчика, плоскость XY.
export function vaneStar(blades = 6, outer = 0.082, inner = 0.016) {
  const s = new THREE.Shape()
  for (let i = 0; i < blades * 2; i++) {
    const a = (i / (blades * 2)) * Math.PI * 2
    const r = i % 2 ? inner : outer
    const x = Math.cos(a) * r
    const y = Math.sin(a) * r
    if (i) s.lineTo(x, y)
    else s.moveTo(x, y)
  }
  s.closePath()
  return extrudeOf(s, 0.012, 0.003, 1)
}

// Стрелка направления потока на голове фильтра, плоскость XY.
export function flowArrow() {
  const s = new THREE.Shape()
  s.moveTo(-0.15, 0.016)
  s.lineTo(0.08, 0.016)
  s.lineTo(0.08, 0.052)
  s.lineTo(0.15, 0)
  s.lineTo(0.08, -0.052)
  s.lineTo(0.08, -0.016)
  s.lineTo(-0.15, -0.016)
  s.closePath()
  return extrudeOf(s, 0.014, 0.005, 2)
}
