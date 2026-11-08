// Настоящая модель машины вместо самодельной: Car Concept из образцов Khronos
// (Eric Chadwick, Darmstadt Graphics Group, CC BY 4.0, по модели Unity Fan, CC0).
// Логотипы Khronos из модели убраны, текстуры сжаты: scripts/car-model.md.
// Здесь модель разворачивается носом по +X, правым бортом по +Z, колёсами на пол,
// а кузов режется на детали (капот, крылья, двери...), чтобы их можно было выбирать и подсвечивать.
import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import carUrl from '../assets/car.glb?url'

/** Тип кузова из данных сайта. Модель одна, поле осталось ради совместимости данных. */
export type BodyType = 'sedan' | 'hatch' | 'crossover'

export type PanelId =
  | 'bumperF' | 'bumperR' | 'hood' | 'trunk' | 'roof'
  | 'fenderFL' | 'fenderFR' | 'doorFL' | 'doorFR' | 'doorRL' | 'doorRR'
  | 'quarterRL' | 'quarterRR' | 'sillL' | 'sillR' | 'mirrorL' | 'mirrorR'

export type CarShape = { L: number; W: number; H: number; wheelR: number; wheelBase: number }

export type Car = {
  group: THREE.Group
  panels: Map<PanelId, THREE.Mesh[]>
  pickables: THREE.Object3D[]
  /** Колёса по порядку: переднее левое, переднее правое, заднее левое, заднее правое. Центр группы в оси колеса. */
  wheels: THREE.Object3D[]
  shape: CarShape
  /** Лак всех деталей кузова. */
  paint: THREE.MeshPhysicalMaterial[]
  glass: THREE.MeshPhysicalMaterial[]
  /** Все остальные материалы кузова и салона (не колёса). */
  body: THREE.Material[]
  interior: THREE.Object3D[]
  dispose: () => void
}

let asset: Promise<GLTF> | null = null
export function loadCarAsset() {
  asset ??= new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(carUrl)
  return asset
}

type Side = 'L' | 'R'
const sideOf = (z: number): Side => (z > 0 ? 'R' : 'L')

function panelByName(path: string, side: Side): PanelId | null {
  if (/Mirror/.test(path)) return side === 'R' ? 'mirrorR' : 'mirrorL'
  if (/BodyDoor[LR]/.test(path)) return side === 'R' ? 'doorFR' : 'doorFL'
  if (/BodyRoofPanel/.test(path)) return 'roof'
  if (/BodyHoodTopgrill/.test(path)) return 'hood'
  return null
}

type Frame = { halfL: number; halfW: number; doorX0: number; doorX1: number; frontAxle: number }

// Деталь по положению треугольника: границы как на настоящей машине, только без зазоров.
function panelByPlace(c: THREE.Vector3, n: THREE.Vector3, f: Frame): PanelId {
  const s = sideOf(c.z)
  const az = Math.abs(c.z)
  if (c.x > f.doorX1 - 0.02) {
    // Нос: ниже фар бампер, выше капот.
    const nose = c.x > f.halfL - 0.12 || (c.x > f.halfL - 0.36 && n.x > 0.35)
    if (nose && az < f.halfW * 0.8) return c.y < 0.56 ? 'bumperF' : 'hood'
    if (c.y < 0.36 && c.x > f.frontAxle + 0.42) return 'bumperF'
    if (az < f.halfW * 0.45 || (n.y > 0.45 && az < f.halfW * 0.64)) return 'hood'
    return s === 'R' ? 'fenderFR' : 'fenderFL'
  }
  if (c.x < f.doorX0 + 0.02) {
    // Корма: внизу бампер, сверху и на заднем торце крышка багажника.
    const tail = c.x < -f.halfL + 0.1 || (c.x < -f.halfL + 0.36 && n.x < -0.35)
    if ((tail && c.y < 0.6) || (c.y < 0.36 && c.x < -f.halfL + 0.5)) return 'bumperR'
    if (c.y >= 0.6 && ((az < f.halfW * 0.45 && c.x < f.doorX0 - 0.35) || (az < f.halfW * 0.74 && (tail || (n.y > 0.4 && c.x < f.doorX0 - 0.35))))) return 'trunk'
    return s === 'R' ? 'quarterRR' : 'quarterRL'
  }
  if (c.y > 1.02) return 'roof'
  if (c.y < 0.42) return s === 'R' ? 'sillR' : 'sillL'
  if (c.x > (f.doorX0 + f.doorX1) / 2) return s === 'R' ? 'fenderFR' : 'fenderFL'
  return s === 'R' ? 'quarterRR' : 'quarterRL'
}

const pathOf = (o: THREE.Object3D) => {
  const names: string[] = []
  for (let p: THREE.Object3D | null = o; p; p = p.parent) if (p.name) names.push(p.name)
  return names.join('/')
}

export async function loadCar(paint: string): Promise<Car> {
  const gltf = await loadCarAsset()
  const src = gltf.scene.clone(true)
  const group = new THREE.Group()
  const orient = new THREE.Group()
  orient.rotation.y = Math.PI / 2 // нос модели смотрит по +Z, у нас по +X
  orient.add(src)
  group.add(orient)

  // Свои копии материалов: сцена может их менять (прозрачный кузов на стенде).
  const copies = new Map<THREE.Material, THREE.Material>()
  const own: THREE.Material[] = []
  const meshes: THREE.Mesh[] = []
  src.traverse(o => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    meshes.push(m)
    const mat = m.material as THREE.Material
    let c = copies.get(mat)
    if (!c) { c = mat.clone(); copies.set(mat, c); own.push(c) }
    m.material = c
  })
  // Салон в модели красный: делаем графитовым, чтобы не спорил с цветами сайтов.
  for (const m of own) if (/^Interior 3/.test(m.name)) (m as THREE.MeshStandardMaterial).color.set('#2b2d31')
  // Стекло без прохода света сквозь сцену: на телефоне это вдвое дешевле, а на вид то же.
  const glass: THREE.MeshPhysicalMaterial[] = []
  for (const m of own) {
    const p = m as THREE.MeshPhysicalMaterial
    if (p.isMeshPhysicalMaterial && p.transmission > 0) {
      p.transmission = 0
      p.transparent = true
      p.opacity = 0.32
      p.color.set('#20262c')
      p.roughness = 0.04
      p.metalness = 0
      p.depthWrite = false
      glass.push(p)
    }
  }

  group.updateMatrixWorld(true)
  const box = (o: THREE.Object3D) => new THREE.Box3().setFromObject(o)

  // Передние колёса в модели вывернуты. Ищем угол, при котором шина самая узкая поперёк машины, и выпрямляем.
  const wheelNames = ['WheelFrontL', 'WheelFrontR', 'WheelRearL', 'WheelRearR']
  const wheelNodes = wheelNames.map(n => src.getObjectByName(n)!)
  const v = new THREE.Vector3()
  const steer = wheelNodes.map(w => {
    const pts: THREE.Vector3[] = []
    w.traverse(o => {
      const m = o as THREE.Mesh
      if (!m.isMesh || !/Tire/.test((m.material as THREE.Material).name)) return
      const pos = m.geometry.attributes.position
      for (let i = 0; i < pos.count; i += 2) pts.push(v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld).clone())
    })
    const c = box(w).getCenter(new THREE.Vector3())
    let best = 0, bestW = Infinity
    for (let a = -0.7; a <= 0.7; a += 0.005) {
      const ca = Math.cos(a), sa = Math.sin(a)
      let lo = Infinity, hi = -Infinity
      for (const p of pts) {
        const z = -(p.x - c.x) * sa + (p.z - c.z) * ca
        if (z < lo) lo = z
        if (z > hi) hi = z
      }
      if (hi - lo < bestW) { bestW = hi - lo; best = a }
    }
    return best
  })

  // Пол под колёсами, середина по длине и ширине.
  const tires = new THREE.Box3()
  for (const w of wheelNodes) tires.union(box(w))
  const all = box(src)
  const cx = (all.min.x + all.max.x) / 2, cz = (all.min.z + all.max.z) / 2
  orient.position.set(-cx, -tires.min.y, -cz)
  group.updateMatrixWorld(true)

  const wheels: THREE.Object3D[] = []
  wheelNodes.forEach((w, i) => {
    const c = box(w).getCenter(new THREE.Vector3())
    const holder = new THREE.Group()
    holder.position.copy(c)
    group.add(holder)
    const fix = new THREE.Group()
    holder.add(fix)
    holder.updateMatrixWorld(true)
    fix.attach(w)
    fix.rotation.y = Math.abs(steer[i]) > 0.02 ? steer[i] : 0
    wheels.push(holder)
  })
  // После выпрямления колёса чуть иначе стоят на полу: поднимем всё на разницу.
  group.updateMatrixWorld(true)
  const wb = new THREE.Box3()
  for (const w of wheels) wb.union(box(w))
  if (Math.abs(wb.min.y) > 0.002) {
    orient.position.y -= wb.min.y
    for (const w of wheels) w.position.y -= wb.min.y
    group.updateMatrixWorld(true)
  }

  // Размеры кузова.
  const doorBox = new THREE.Box3()
  for (const n of ['BodyDoorLColor1', 'BodyDoorRColor1']) { const d = src.getObjectByName(n); if (d) doorBox.union(box(d)) }
  const bodyBox = new THREE.Box3()
  for (const n of ['BodyHood', 'BodyRearPanelsColor1', 'BodyPanelsColor2']) { const d = src.getObjectByName(n); if (d) bodyBox.union(box(d)) }
  const wc = wheels.map(w => w.position)
  const frame: Frame = {
    halfL: Math.max(bodyBox.max.x, -bodyBox.min.x),
    halfW: Math.max(bodyBox.max.z, -bodyBox.min.z),
    doorX0: doorBox.min.x, doorX1: doorBox.max.x,
    frontAxle: (wc[0].x + wc[1].x) / 2,
  }
  const tireBox = box(wheels[2])
  const shape: CarShape = {
    L: bodyBox.max.x - bodyBox.min.x,
    W: bodyBox.max.z - bodyBox.min.z,
    H: all.max.y - all.min.y,
    wheelR: (tireBox.max.y - tireBox.min.y) / 2,
    wheelBase: (wc[0].x + wc[1].x) / 2 - (wc[2].x + wc[3].x) / 2,
  }

  // Лак: один образец, у каждой детали своя копия, чтобы подсвечивать по отдельности.
  const template = (own.find(m => m.name === 'Paint 1 Carmine') ?? own.find(m => /^Paint/.test(m.name))) as THREE.MeshPhysicalMaterial
  const base = template.clone()
  base.color.set(paint)
  base.side = THREE.DoubleSide
  base.normalScale.multiplyScalar(0.4) // металлик помельче: крупное зерно на телефоне выглядит грязью
  const panels = new Map<PanelId, THREE.Mesh[]>()
  const panelMat = new Map<PanelId, THREE.MeshPhysicalMaterial>()
  const pickables: THREE.Object3D[] = []
  const made: THREE.BufferGeometry[] = []
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c3 = new THREE.Vector3(), cen = new THREE.Vector3(), nrm = new THREE.Vector3()
  const toCar = new THREE.Matrix4(), nm = new THREE.Matrix3()
  const tmp = new THREE.Vector3()

  for (const m of meshes) {
    if (!/^Paint/.test((m.material as THREE.Material).name)) continue
    toCar.copy(m.matrixWorld)
    nm.getNormalMatrix(toCar)
    const g = m.geometry
    const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv
    const idx = g.index
    const tri = idx ? idx.count / 3 : pos.count / 3
    const path = pathOf(m)
    const buckets = new Map<PanelId, { p: number[]; n: number[]; t: number[] }>()
    for (let t = 0; t < tri; t++) {
      const i0 = idx ? idx.getX(t * 3) : t * 3, i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1, i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2
      a.fromBufferAttribute(pos, i0).applyMatrix4(toCar)
      b.fromBufferAttribute(pos, i1).applyMatrix4(toCar)
      c3.fromBufferAttribute(pos, i2).applyMatrix4(toCar)
      cen.copy(a).add(b).add(c3).multiplyScalar(1 / 3)
      nrm.subVectors(c3, b).cross(tmp.subVectors(a, b)).normalize()
      // Нормаль наружу: от середины машины.
      if (nrm.dot(tmp.set(cen.x * 0.3, cen.y - 0.6, cen.z)) < 0) nrm.negate()
      const id = panelByName(path, sideOf(cen.z)) ?? panelByPlace(cen, nrm, frame)
      let bk = buckets.get(id)
      if (!bk) { bk = { p: [], n: [], t: [] }; buckets.set(id, bk) }
      for (const [i, p] of [[i0, a], [i1, b], [i2, c3]] as const) {
        bk.p.push(p.x, p.y, p.z)
        if (nor) { tmp.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize(); bk.n.push(tmp.x, tmp.y, tmp.z) }
        if (uv) bk.t.push(uv.getX(i), uv.getY(i))
      }
    }
    for (const [id, bk] of buckets) {
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.Float32BufferAttribute(bk.p, 3))
      if (bk.n.length) geo.setAttribute('normal', new THREE.Float32BufferAttribute(bk.n, 3))
      else geo.computeVertexNormals()
      if (bk.t.length) geo.setAttribute('uv', new THREE.Float32BufferAttribute(bk.t, 2))
      made.push(geo)
      let mat = panelMat.get(id)
      if (!mat) { mat = base.clone(); panelMat.set(id, mat) }
      const piece = new THREE.Mesh(geo, mat)
      piece.userData.panel = id
      group.add(piece)
      pickables.push(piece)
      const list = panels.get(id) ?? []
      list.push(piece)
      panels.set(id, list)
    }
    m.visible = false
  }
  // Стекло ловит касание первым: нажатие на окно не выберет дверь с другой стороны.
  for (const m of meshes) if (glass.includes(m.material as THREE.MeshPhysicalMaterial)) pickables.push(m)

  const interior: THREE.Object3D[] = []
  src.traverse(o => { if (/^Interior|^Engine/.test(o.name)) interior.push(o) })
  const wheelMats = new Set<THREE.Material>()
  for (const w of wheels) w.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) wheelMats.add(m.material as THREE.Material) })

  return {
    group, panels, pickables, wheels, shape,
    paint: [...panelMat.values()],
    glass,
    body: own.filter(m => !wheelMats.has(m) && !/^Paint/.test(m.name)),
    interior,
    dispose: () => {
      for (const g of made) g.dispose()
      for (const m of own) m.dispose()
      for (const m of panelMat.values()) m.dispose()
      base.dispose()
    },
  }
}
