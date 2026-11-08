// Кухня-конфигуратор: планировка, длина стен, цвет фасадов и столешницы.
// Всё строится из простых коробок, но с зазорами между фасадами, тенями и подсветкой под шкафами.
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

export type Layout = 'straight' | 'corner' | 'u' | 'island'
export type Finish = 'matte' | 'gloss' | 'wood'
export type CounterKind = 'stone' | 'dark' | 'concrete' | 'wood'

export type KitchenConfig = {
  layout: Layout
  /** Длина основной стены, м. */
  a: number
  /** Длина боковой стены (угловая и П-образная), м. */
  b: number
  facade: { hex: string; finish: Finish }
  counter: { hex: string; kind: CounterKind }
  uppers: boolean
  handles: 'gola' | 'bar'
}

/** Сборка по шагам: 0 пустая стена, 1 корпуса, 2 фасады, 3 столешница и техника, 4 подсветка. */
export type KitchenScene = { set: (c: KitchenConfig) => void; setStage: (n: number) => void; destroy: () => void }

const DEPTH = 0.6, PLINTH = 0.1, BASE_H = 0.72, TOP_T = 0.038
const COUNTER_Y = PLINTH + BASE_H
const UP_Y = 1.42, UP_H = 0.72, UP_D = 0.33
const TALL_H = 2.14
const GAP = 0.003

function canvasTex(draw: (g: CanvasRenderingContext2D, s: number) => void, size = 512, repeat = 1) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  draw(c.getContext('2d')!, size)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(repeat, repeat)
  t.anisotropy = 4
  return t
}

// Простое псевдослучайное число: одинаковый рисунок при каждой загрузке.
function rng(seed: number) {
  let s = seed
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
}

function woodTexture(hex: string) {
  return canvasTex((g, s) => {
    const base = new THREE.Color(hex)
    g.fillStyle = '#' + base.getHexString()
    g.fillRect(0, 0, s, s)
    const r = rng(7)
    for (let i = 0; i < 140; i++) {
      const x = r() * s, w = 0.6 + r() * 2.4
      const dark = r() < 0.6
      g.strokeStyle = dark ? `rgba(60,35,15,${0.05 + r() * 0.12})` : `rgba(255,240,215,${0.04 + r() * 0.08})`
      g.lineWidth = w
      g.beginPath()
      for (let y = 0; y <= s; y += 16) g.lineTo(x + Math.sin(y * 0.015 + i) * (3 + r() * 6), y)
      g.stroke()
    }
  })
}

function stoneTexture(hex: string, kind: CounterKind) {
  return canvasTex((g, s) => {
    const base = new THREE.Color(hex)
    g.fillStyle = '#' + base.getHexString()
    g.fillRect(0, 0, s, s)
    const r = rng(kind === 'stone' ? 11 : kind === 'dark' ? 5 : 3)
    if (kind === 'stone') {
      // Тонкие серые прожилки, как у кварцевого камня.
      for (let i = 0; i < 9; i++) {
        g.strokeStyle = `rgba(120,120,125,${0.08 + r() * 0.16})`
        g.lineWidth = 0.6 + r() * 1.8
        g.beginPath()
        let x = r() * s, y = r() * s
        g.moveTo(x, y)
        for (let k = 0; k < 6; k++) { x += (r() - 0.3) * 160; y += (r() - 0.5) * 90; g.lineTo(x, y) }
        g.stroke()
      }
    } else {
      const n = kind === 'dark' ? 2600 : 5200
      for (let i = 0; i < n; i++) {
        const v = kind === 'dark' ? 120 + r() * 120 : 90 + r() * 90
        g.fillStyle = `rgba(${v},${v},${v},${kind === 'dark' ? 0.35 : 0.12})`
        const d = kind === 'dark' ? 1 + r() * 1.6 : 1 + r() * 3
        g.fillRect(r() * s, r() * s, d, d)
      }
    }
  })
}

function glowTexture() {
  const c = document.createElement('canvas')
  c.width = 4; c.height = 128
  const g = c.getContext('2d')!
  const grd = g.createLinearGradient(0, 0, 0, 128)
  grd.addColorStop(0, 'rgba(255,214,160,0.55)')
  grd.addColorStop(0.35, 'rgba(255,214,160,0.18)')
  grd.addColorStop(1, 'rgba(255,214,160,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 4, 128)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function floorTexture() {
  return canvasTex((g, s) => {
    const r = rng(19)
    const rows = 8
    for (let i = 0; i < rows; i++) {
      for (let k = -1; k < 3; k++) {
        const off = (i % 2) * 0.5
        const v = 196 + r() * 12
        g.fillStyle = `rgb(${v},${v - 20},${v - 44})`
        g.fillRect(((k + off) * s) / 2, (i * s) / rows, s / 2, s / rows)
        g.fillStyle = 'rgba(80,55,30,0.18)'
        g.fillRect(((k + off) * s) / 2, (i * s) / rows, 1.5, s / rows)
      }
      g.fillStyle = 'rgba(80,55,30,0.2)'
      g.fillRect(0, (i * s) / rows, s, 1.5)
    }
  }, 512, 4)
}

type Mats = Record<'facade' | 'carcass' | 'inner' | 'glow' | 'counter' | 'plinth' | 'handle' | 'steel' | 'black' | 'led' | 'wall' | 'floor' | 'splash', THREE.Material>

export function createKitchenScene(host: HTMLElement, first: KitchenConfig, o: { onReady?: () => void; stage?: number } = {}): KitchenScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  host.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = env
  scene.environmentIntensity = 0.42

  const sun = new THREE.DirectionalLight('#fff1de', 2.8)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  sun.shadow.radius = 6
  sun.shadow.bias = -0.0004
  sun.shadow.normalBias = 0.02
  scene.add(sun, sun.target)
  scene.add(new THREE.HemisphereLight('#ffffff', '#b9a68f', 0.32))

  const floorTex = floorTexture()
  const fixed = {
    carcass: new THREE.MeshStandardMaterial({ color: '#d9d6d0', roughness: 0.8 }),
    plinth: new THREE.MeshStandardMaterial({ color: '#2a2b2d', roughness: 0.7 }),
    handle: new THREE.MeshStandardMaterial({ color: '#b9bec4', roughness: 0.25, metalness: 1 }),
    steel: new THREE.MeshStandardMaterial({ color: '#c7cbd0', roughness: 0.22, metalness: 1 }),
    black: new THREE.MeshPhysicalMaterial({ color: '#0d0e10', roughness: 0.12, clearcoat: 1 }),
    led: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.0, 1.7) }),
    // Пустой корпус без фасада: видна внутренность, она темнее кромок.
    inner: new THREE.MeshStandardMaterial({ color: '#b8b0a4', roughness: 0.9 }),
    // Тёплое пятно от ленты на фартуке.
    glow: new THREE.MeshBasicMaterial({ map: glowTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    wall: new THREE.MeshStandardMaterial({ color: '#e4dfd7', roughness: 0.95 }),
    floor: new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.75 }),
  }
  let mats: Mats | null = null
  let dynamic: THREE.Material[] = []
  let dynTex: THREE.Texture[] = []

  const makeMats = (c: KitchenConfig): Mats => {
    for (const m of dynamic) m.dispose()
    for (const t of dynTex) t.dispose()
    dynamic = []; dynTex = []
    const f = c.facade
    let facade: THREE.Material
    if (f.finish === 'wood') {
      const t = woodTexture(f.hex); dynTex.push(t)
      facade = new THREE.MeshStandardMaterial({ map: t, roughness: 0.62 })
    } else {
      facade = new THREE.MeshPhysicalMaterial({
        color: f.hex, roughness: f.finish === 'gloss' ? 0.12 : 0.55,
        clearcoat: f.finish === 'gloss' ? 1 : 0, clearcoatRoughness: 0.08,
      })
    }
    const k = c.counter
    const ct = k.kind === 'wood' ? woodTexture(k.hex) : stoneTexture(k.hex, k.kind)
    dynTex.push(ct)
    const counter = new THREE.MeshPhysicalMaterial({ map: ct, roughness: k.kind === 'wood' ? 0.55 : k.kind === 'concrete' ? 0.7 : 0.25, clearcoat: k.kind === 'stone' || k.kind === 'dark' ? 0.6 : 0 })
    const splash = counter.clone()
    dynamic.push(facade, counter, splash)
    return { ...fixed, facade, counter, splash }
  }

  let kitchen = new THREE.Group()
  scene.add(kitchen)
  const geos: THREE.BufferGeometry[] = []
  const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D, shadow = true) => {
    const g = new THREE.BoxGeometry(w, h, d)
    geos.push(g)
    const mesh = new THREE.Mesh(g, m)
    mesh.position.set(x, y, z)
    mesh.castShadow = shadow
    mesh.receiveShadow = true
    mesh.userData.layer = layerOf(m)
    parent.add(mesh)
    return mesh
  }
  // К какому шагу сборки относится деталь: по её материалу.
  const layerOf = (m: THREE.Material) => {
    if (!mats) return 0
    if (m === mats.carcass || m === mats.plinth || m === mats.inner) return 1
    if (m === mats.facade || m === mats.handle) return 2
    if (m === mats.counter || m === mats.splash || m === mats.steel || m === mats.black) return 3
    if (m === mats.led || m === mats.glow) return 4
    return 0
  }

  type Kind = 'doors' | 'drawers' | 'sink' | 'hob' | 'tall'
  // Раскладка модулей по стене: колонна у края, мойка и варочная панель в середине.
  const plan = (len: number, main: boolean, withTall: boolean): { kind: Kind; w: number }[] => {
    const usable = withTall ? len - 0.6 : len
    const n = Math.max(1, Math.round(usable / 0.6))
    const w = usable / n
    const kinds: Kind[] = Array.from({ length: n }, (_, i) => (i % 2 ? 'drawers' : 'doors'))
    if (main && n >= 3) { kinds[Math.floor(n / 2) - 1] = 'sink'; kinds[Math.min(n - 1, Math.floor(n / 2) + 1)] = 'hob' }
    else if (main && n >= 1) kinds[0] = 'sink'
    const out = kinds.map(kind => ({ kind, w }))
    if (withTall) out.push({ kind: 'tall', w: 0.6 })
    return out
  }

  const facadePanels = (parent: THREE.Object3D, m: Mats, c: KitchenConfig, x0: number, w: number, y0: number, h: number, z: number, rows: number[], cols: number) => {
    // rows: доли высоты сверху вниз; cols: сколько дверей по ширине.
    let y = y0 + h
    for (const part of rows) {
      const ph = h * part
      for (let k = 0; k < cols; k++) {
        const pw = w / cols
        const cx = x0 + pw * (k + 0.5), cy = y - ph / 2
        box(pw - GAP * 2, ph - GAP * 2, 0.018, m.facade, cx, cy, z + 0.009, parent)
        if (c.handles === 'bar') {
          const vertical = rows.length === 1 && ph > 0.5
          if (vertical) box(0.012, Math.min(0.3, ph * 0.4), 0.02, m.handle, cols > 1 ? (k === 0 ? x0 + pw - 0.05 : x0 + pw * k + 0.05) : x0 + pw - 0.05, cy + ph * 0.18, z + 0.03, parent, false)
          else box(Math.min(0.32, pw * 0.5), 0.012, 0.02, m.handle, cx, y - 0.05, z + 0.03, parent, false)
        }
      }
      y -= ph
    }
  }

  const buildRun = (len: number, main: boolean, withTall: boolean, c: KitchenConfig, m: Mats) => {
    const g = new THREE.Group()
    const mods = plan(len, main, withTall)
    let x = 0
    for (const mod of mods) {
      const { w, kind } = mod
      if (kind === 'tall') {
        box(w, TALL_H - PLINTH, DEPTH - 0.02, m.carcass, x + w / 2, PLINTH + (TALL_H - PLINTH) / 2, (DEPTH - 0.02) / 2, g)
        box(w - 0.01, PLINTH, DEPTH - 0.08, m.plinth, x + w / 2, PLINTH / 2, (DEPTH - 0.08) / 2, g)
        box(w - 0.036, TALL_H - PLINTH - 0.036, 0.004, m.inner, x + w / 2, PLINTH + (TALL_H - PLINTH) / 2, DEPTH - 0.019, g, false)
        facadePanels(g, m, c, x, w, PLINTH, TALL_H - PLINTH, DEPTH - 0.02, [0.3, 0.7], 1)
        x += w
        continue
      }
      box(w, BASE_H, DEPTH - 0.02, m.carcass, x + w / 2, PLINTH + BASE_H / 2, (DEPTH - 0.02) / 2, g)
      box(w, PLINTH, DEPTH - 0.08, m.plinth, x + w / 2, PLINTH / 2, (DEPTH - 0.08) / 2, g)
      box(w - 0.036, BASE_H - 0.036, 0.004, m.inner, x + w / 2, PLINTH + BASE_H / 2, DEPTH - 0.019, g, false)
      const golaH = c.handles === 'gola' ? 0.035 : 0
      const fh = BASE_H - golaH
      const rows = kind === 'drawers' ? [0.25, 0.375, 0.375] : kind === 'hob' ? [0.5, 0.5] : [1]
      facadePanels(g, m, c, x, w, PLINTH, fh, DEPTH - 0.02, rows, kind === 'doors' || kind === 'sink' ? (w > 0.5 ? 2 : 1) : 1)
      if (c.handles === 'gola') box(w, golaH, 0.02, m.plinth, x + w / 2, PLINTH + BASE_H - golaH / 2, DEPTH - 0.05, g, false)
      if (kind === 'sink') {
        const sink = box(Math.min(0.5, w - 0.12), 0.012, 0.4, m.steel, x + w / 2, COUNTER_Y + TOP_T + 0.001, DEPTH / 2 + 0.02, g, false)
        sink.scale.y = 0.6
        const tap = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.012, 10, 24, Math.PI), m.steel)
        geos.push(tap.geometry)
        tap.position.set(x + w / 2, COUNTER_Y + TOP_T + 0.2, 0.12)
        tap.castShadow = true
        tap.userData.layer = 3
        g.add(tap)
        box(0.024, 0.2, 0.024, m.steel, x + w / 2 - 0.11, COUNTER_Y + TOP_T + 0.1, 0.12, g)
      }
      if (kind === 'hob') {
        box(Math.min(0.56, w - 0.04), 0.006, 0.5, m.black, x + w / 2, COUNTER_Y + TOP_T + 0.003, DEPTH / 2, g, false)
        if (c.uppers) box(Math.min(0.6, w), 0.1, 0.36, m.facade, x + w / 2, UP_Y + UP_H - 0.05, 0.18, g)
      }
      if (c.uppers && kind !== 'hob') {
        box(w, UP_H, UP_D, m.carcass, x + w / 2, UP_Y + UP_H / 2, UP_D / 2, g)
        box(w - 0.036, UP_H - 0.036, 0.004, m.inner, x + w / 2, UP_Y + UP_H / 2, UP_D + 0.001, g, false)
        facadePanels(g, m, c, x, w, UP_Y, UP_H, UP_D, [1], w > 0.5 ? 2 : 1)
        box(w - 0.04, 0.008, 0.02, m.led, x + w / 2, UP_Y - 0.006, UP_D - 0.06, g, false)
      }
      x += w
    }
    // Столешница одним куском над нижними шкафами, с небольшим свесом.
    const topLen = withTall ? len - 0.6 : len
    box(topLen, TOP_T, DEPTH + 0.02, m.counter, topLen / 2, COUNTER_Y + TOP_T / 2, (DEPTH + 0.02) / 2, g)
    if (c.uppers) {
      box(topLen, UP_Y - COUNTER_Y - TOP_T, 0.012, m.splash, topLen / 2, (UP_Y + COUNTER_Y + TOP_T) / 2, 0.006, g, false)
      const gh = 0.34
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(topLen - 0.04, gh), m.glow)
      geos.push(glow.geometry)
      glow.position.set(topLen / 2, UP_Y - gh / 2, 0.0135)
      glow.userData.layer = 4
      g.add(glow)
    }
    return g
  }

  let bounds = new THREE.Box3()
  const build = (c: KitchenConfig) => {
    scene.remove(kitchen)
    for (const g of geos) g.dispose()
    geos.length = 0
    mats = makeMats(c)
    kitchen = new THREE.Group()
    const a = c.a, b = c.b
    const main = buildRun(a, true, c.layout !== 'u' && a >= 2.4, c, mats)
    kitchen.add(main)
    if (c.layout === 'corner' || c.layout === 'u') {
      const left = buildRun(b - DEPTH, false, false, c, mats)
      left.rotation.y = Math.PI / 2
      left.position.set(0, 0, b)
      kitchen.add(left)
    }
    if (c.layout === 'u') {
      const right = buildRun(b - DEPTH, false, false, c, mats)
      right.rotation.y = -Math.PI / 2
      right.position.set(a, 0, DEPTH)
      kitchen.add(right)
    }
    if (c.layout === 'island') {
      const len = Math.min(2.4, Math.max(1.2, a * 0.55))
      const isl = new THREE.Group()
      box(len, BASE_H, 0.9, mats.carcass, 0, PLINTH + BASE_H / 2, 0, isl)
      box(len - 0.02, PLINTH, 0.8, mats.plinth, 0, PLINTH / 2, 0, isl)
      const front = new THREE.Group()
      facadePanels(front, mats, c, -len / 2, len, PLINTH, BASE_H - (c.handles === 'gola' ? 0.035 : 0), 0.45, [0.25, 0.375, 0.375], Math.max(1, Math.round(len / 0.6)))
      isl.add(front)
      box(len + 0.06, TOP_T, 1.0, mats.counter, 0, COUNTER_Y + TOP_T / 2, 0.02, isl)
      isl.position.set(a / 2, 0, DEPTH + 1.15 + 0.45)
      kitchen.add(isl)
    }
    // Стены и пол.
    const W = Math.max(a, 2) + 3, D = Math.max(b, 3) + 3
    floorTex.repeat.set((W + 4) / 1.6, (D + 4) / 1.6)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W + 4, D + 4), mats.floor)
    geos.push(floor.geometry)
    floor.rotation.x = -Math.PI / 2
    floor.position.set(a / 2, 0, D / 2 - 1)
    floor.receiveShadow = true
    kitchen.add(floor)
    const back = box(W + 4, 2.7, 0.05, mats.wall, a / 2, 1.35, -0.025, kitchen, false)
    back.castShadow = false
    // Боковые стены короткие: заканчиваются сразу за шкафами и не закрывают кухню от камеры.
    if (c.layout === 'corner' || c.layout === 'u') {
      const lw = box(0.05, 2.7, b + 0.25, mats.wall, -0.025, 1.35, (b + 0.25) / 2, kitchen, false)
      lw.castShadow = false
    }
    if (c.layout === 'u') {
      const rw = box(0.05, 2.7, b + 0.25, mats.wall, a + 0.025, 1.35, (b + 0.25) / 2, kitchen, false)
      rw.castShadow = false
    }
    goalYaw = yaw = c.layout === 'corner' ? 0.38 : c.layout === 'u' ? 0.08 : -0.3
    scene.add(kitchen)
    pieces = []
    kitchen.updateMatrixWorld(true)
    kitchen.traverse(obj => {
      const L = obj.userData.layer as number | undefined
      if (!L || !(obj as THREE.Mesh).isMesh) return
      // Фасады подлетают спереди (в своей системе координат перед шкафов смотрит в +z), остальное опускается сверху.
      const dir = L === 2 ? new THREE.Vector3(0, 0, 0.35) : new THREE.Vector3(0, 0.45, 0)
      pieces.push({ obj, layer: L, base: obj.position.clone(), dir })
    })
    applyStage()
    bounds = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(a, TALL_H, c.layout === 'island' ? DEPTH + 2.1 : c.layout === 'straight' ? DEPTH : b))
    sun.position.set(a * 0.25 - 2, 4.5, 5)
    sun.target.position.set(a / 2, 0.6, 0.8)
    const sc = sun.shadow.camera as THREE.OrthographicCamera
    const span = Math.max(a, b) * 0.8 + 1.5
    sc.left = -span; sc.right = span; sc.top = span; sc.bottom = -span; sc.near = 0.5; sc.far = 16
    sc.updateProjectionMatrix()
    fit()
  }

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60)
  let yaw = -0.35, goalYaw = yaw
  const target = new THREE.Vector3()
  let dist = 5
  function fit() {
    const r = host.getBoundingClientRect()
    const w = Math.max(1, r.width), h = Math.max(1, r.height)
    renderer.setSize(w, h, false)
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    camera.aspect = w / h
    const size = new THREE.Vector3(), centre = new THREE.Vector3()
    bounds.getSize(size); bounds.getCenter(centre)
    target.set(centre.x, 1.0, centre.z * 0.7)
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const needW = Math.max(size.x, size.z * 0.8) * 0.56 + 0.25, needH = 1.25
    dist = Math.max(needH / t, needW / (t * camera.aspect)) + Math.max(size.z, 0.6) * 0.35
    camera.updateProjectionMatrix()
    req()
  }
  const place = () => {
    const pitch = 0.32
    camera.position.set(
      target.x + Math.sin(yaw) * Math.cos(pitch) * dist,
      target.y + Math.sin(pitch) * dist,
      target.z + Math.cos(yaw) * Math.cos(pitch) * dist)
    camera.lookAt(target)
  }

  // Поворот пальцем в пределах, чтобы не уйти за стену.
  let drag = false, lastX = 0
  const el = renderer.domElement
  el.style.touchAction = 'pan-y'
  el.addEventListener('pointerdown', e => { drag = true; lastX = e.clientX; el.setPointerCapture(e.pointerId) })
  el.addEventListener('pointermove', e => {
    if (!drag) return
    goalYaw = Math.max(-0.95, Math.min(0.95, goalYaw - (e.clientX - lastX) * 0.006))
    lastX = e.clientX
    req()
  })
  el.addEventListener('pointerup', () => { drag = false })
  el.addEventListener('pointercancel', () => { drag = false })

  // Шаги сборки: у каждого слоя своя доля появления от 0 до 1.
  let pieces: { obj: THREE.Object3D; layer: number; base: THREE.Vector3; dir: THREE.Vector3 }[] = []
  let stage = o.stage ?? 4
  const shown = [1, 1, 1, 1, 1].map((_, i) => (i <= stage ? 1 : 0))
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches
  const applyStage = () => {
    for (const p of pieces) {
      const t = shown[p.layer]
      const e = 1 - (1 - t) * (1 - t) * (1 - t)
      p.obj.visible = t > 0.01
      p.obj.position.copy(p.base).addScaledVector(p.dir, 1 - e)
    }
    // Когда включается подсветка, общий свет приглушается, чтобы ленты было видно.
    if (o.stage !== undefined) sun.intensity = 2.8 - 1.2 * shown[4]
  }
  const stepStage = () => {
    let busy = false
    for (let i = 1; i <= 4; i++) {
      const goal = i <= stage ? 1 : 0
      if (still) shown[i] = goal
      else if (Math.abs(shown[i] - goal) > 0.002) { shown[i] += (goal - shown[i]) * 0.12; busy = true }
      else shown[i] = goal
    }
    applyStage()
    return busy
  }

  let raf = 0, visible = true
  const frame = () => {
    raf = 0
    yaw += (goalYaw - yaw) * 0.14
    const building = stepStage()
    place()
    renderer.render(scene, camera)
    if ((building || Math.abs(goalYaw - yaw) > 0.0005) && visible) req()
  }
  function req() { if (!raf && visible) raf = requestAnimationFrame(frame) }
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) req() })
  io.observe(host)
  const ro = new ResizeObserver(fit)
  ro.observe(host)

  build(first)
  frame()
  o.onReady?.()

  return {
    set: c => { build(c); req() },
    setStage: n => { stage = Math.max(0, Math.min(4, n)); req() },
    destroy: () => {
      cancelAnimationFrame(raf)
      io.disconnect(); ro.disconnect()
      for (const g of geos) g.dispose()
      fixed.glow.map?.dispose()
      for (const m of [...dynamic, ...Object.values(fixed)]) m.dispose()
      for (const t of dynTex) t.dispose()
      floorTex.dispose(); env.dispose(); pmrem.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
