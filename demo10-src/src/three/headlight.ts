// Фара в разборе: корпус, маска, две линзы, ходовые огни и стекло.
// Стекло бывает мутным и жёлтым или прозрачным после полировки. Детали разлетаются по оси.
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

export type HeadPart = 'glass' | 'lens' | 'mask' | 'housing'

export type HeadlightScene = {
  setExplode: (t: number) => void
  setClear: (clear: boolean) => void
  setActive: (p: HeadPart | null) => void
  destroy: () => void
}

function outline(scale = 1) {
  // Вытянутая фара: внешний край выше и острее, как у современных машин.
  const s = new THREE.Shape()
  const p = (x: number, y: number) => [x * scale, y * scale] as const
  s.moveTo(...p(-0.36, 0.05))
  s.quadraticCurveTo(...p(-0.37, 0.1), ...p(-0.3, 0.105))
  s.lineTo(...p(0.26, 0.135))
  s.quadraticCurveTo(...p(0.4, 0.14), ...p(0.39, 0.03))
  s.quadraticCurveTo(...p(0.37, -0.11), ...p(0.22, -0.115))
  s.lineTo(...p(-0.28, -0.1))
  s.quadraticCurveTo(...p(-0.37, -0.095), ...p(-0.36, 0.05))
  return s
}

const bulge = (x: number, y: number) => 0.045 * Math.max(0, 1 - (x / 0.42) ** 2) * Math.max(0, 1 - (y / 0.16) ** 2)

// Мягкое пятно света для свечения линз: белый центр, прозрачный край.
function glowTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  r.addColorStop(0, 'rgba(255,255,255,1)')
  r.addColorStop(0.18, 'rgba(255,255,255,.85)')
  r.addColorStop(0.45, 'rgba(255,255,255,.22)')
  r.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = r
  g.fillRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export function createHeadlightScene(host: HTMLElement, o: { accent: string; glow?: boolean; onReady?: () => void }): HeadlightScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.outputColorSpace = THREE.SRGBColorSpace
  host.appendChild(renderer.domElement)
  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  const env = pmrem.fromScene(new RoomEnvironment(), 0.03).texture
  scene.environment = env
  scene.environmentIntensity = 0.9
  const key = new THREE.DirectionalLight('#ffffff', 1.4)
  key.position.set(2, 3, 4)
  scene.add(key)

  const accent = new THREE.Color(o.accent)
  const m = {
    housing: new THREE.MeshStandardMaterial({ color: '#202327', roughness: 0.62 }),
    mask: new THREE.MeshStandardMaterial({ color: '#2b2f35', roughness: 0.32, metalness: 0.75 }),
    chrome: new THREE.MeshStandardMaterial({ color: '#d5d9de', roughness: 0.1, metalness: 1 }),
    barrel: new THREE.MeshStandardMaterial({ color: '#111214', roughness: 0.45, metalness: 0.4 }),
    lens: new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0, metalness: 0, transmission: 1, thickness: 0.04, ior: 1.5, clearcoat: 1 }),
    drl: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.6, 3) }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#d9b36b', roughness: 0.5, transparent: true, opacity: 0.78, clearcoat: 0.2, side: THREE.DoubleSide, depthWrite: false }),
    fin: new THREE.MeshStandardMaterial({ color: '#8d939a', roughness: 0.35, metalness: 0.9 }),
  }
  const geos: THREE.BufferGeometry[] = []
  const add = <T extends THREE.BufferGeometry>(g: T) => { geos.push(g); return g }

  const root = new THREE.Group()
  scene.add(root)
  const glowMap = o.glow ? glowTexture() : null
  const glows: THREE.Sprite[] = []
  const groups: Record<HeadPart, THREE.Group> = { housing: new THREE.Group(), mask: new THREE.Group(), lens: new THREE.Group(), glass: new THREE.Group() }
  for (const g of Object.values(groups)) root.add(g)

  // Корпус.
  const hg = add(new THREE.ExtrudeGeometry(outline(), { depth: 0.2, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 24 }))
  const housing = new THREE.Mesh(hg, m.housing)
  housing.position.z = -0.25
  groups.housing.add(housing)
  const plug = new THREE.Mesh(add(new THREE.CylinderGeometry(0.035, 0.035, 0.06, 20)), m.housing)
  plug.rotation.x = Math.PI / 2
  plug.position.set(0.18, 0, -0.29)
  groups.housing.add(plug)

  // Маска с вырезами под линзы.
  const lensX = [-0.13, 0.12]
  const maskShape = outline(0.94)
  for (const x of lensX) { const h = new THREE.Path(); h.absarc(x, 0.005, 0.07, 0, Math.PI * 2, true); maskShape.holes.push(h) }
  const mask = new THREE.Mesh(add(new THREE.ExtrudeGeometry(maskShape, { depth: 0.012, bevelEnabled: false, curveSegments: 32 })), m.mask)
  mask.position.z = -0.045
  groups.mask.add(mask)
  // Ходовые огни: тонкая трубка вдоль верхнего края маски.
  const drlCurve = new THREE.CatmullRomCurve3([[-0.32, 0.07], [-0.2, 0.09], [0.1, 0.105], [0.28, 0.11], [0.35, 0.05], [0.33, -0.05]].map(([x, y]) => new THREE.Vector3(x, y, -0.03)))
  const drl = new THREE.Mesh(add(new THREE.TubeGeometry(drlCurve, 60, 0.008, 8)), m.drl)
  groups.mask.add(drl)

  // Линзы: ствол, хромированное кольцо, стекло линзы и радиатор сзади.
  for (const x of lensX) {
    const u = new THREE.Group()
    u.position.set(x, 0.005, 0)
    const barrel = new THREE.Mesh(add(new THREE.CylinderGeometry(0.062, 0.058, 0.11, 32)), m.barrel)
    barrel.rotation.x = Math.PI / 2
    barrel.position.z = -0.09
    const ring = new THREE.Mesh(add(new THREE.TorusGeometry(0.064, 0.007, 12, 40)), m.chrome)
    ring.position.z = -0.032
    const glass = new THREE.Mesh(add(new THREE.SphereGeometry(0.075, 40, 20, 0, Math.PI * 2, 0, 0.95)), m.lens)
    glass.rotation.x = Math.PI / 2
    glass.position.z = -0.085
    const inner = new THREE.Mesh(add(new THREE.CircleGeometry(0.05, 32)), m.chrome)
    inner.position.z = -0.1
    u.add(barrel, ring, glass, inner)
    for (let k = 0; k < 7; k++) {
      const fin = new THREE.Mesh(add(new THREE.BoxGeometry(0.004, 0.11, 0.06)), m.fin)
      fin.position.set(-0.045 + k * 0.015, 0, -0.18)
      u.add(fin)
    }
    groups.lens.add(u)
    if (o.glow) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, color: '#ffffff', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }))
      sp.position.set(x, 0.005, 0.03)
      sp.renderOrder = 3
      glows.push(sp)
      root.add(sp)
    }
  }

  // Стекло фары: выпуклое, по контуру корпуса.
  // Плотная сетка, обрезанная по контуру фары: так стекло можно сделать выпуклым.
  const glassGeo = add(new THREE.PlaneGeometry(0.8, 0.3, 60, 24))
  const shapePts = outline(1.01).getPoints(80)
  const inside = (x: number, y: number) => {
    let c = false
    for (let i = 0, j = shapePts.length - 1; i < shapePts.length; j = i++) {
      const a = shapePts[i], b = shapePts[j]
      if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) c = !c
    }
    return c
  }
  const p2 = glassGeo.attributes.position as THREE.BufferAttribute
  // Точки снаружи контура прижимаем к контуру: край стекла получается гладким, без зубцов.
  const nearest = (x: number, y: number) => {
    let bx = x, by = y, bd = Infinity
    for (let i = 0, j = shapePts.length - 1; i < shapePts.length; j = i++) {
      const a = shapePts[j], b = shapePts[i]
      const vx = b.x - a.x, vy = b.y - a.y
      const t = Math.max(0, Math.min(1, ((x - a.x) * vx + (y - a.y) * vy) / (vx * vx + vy * vy || 1)))
      const px = a.x + vx * t, py = a.y + vy * t, d = (px - x) ** 2 + (py - y) ** 2
      if (d < bd) { bd = d; bx = px; by = py }
    }
    return [bx, by]
  }
  for (let i = 0; i < p2.count; i++) {
    let x = p2.getX(i), y = p2.getY(i)
    if (!inside(x, y)) { [x, y] = nearest(x, y); p2.setXY(i, x, y) }
    p2.setZ(i, bulge(x, y))
  }
  glassGeo.computeVertexNormals()
  const cover = new THREE.Mesh(glassGeo, m.glass)
  cover.position.z = 0.0
  cover.renderOrder = 2
  groups.glass.add(cover)

  root.rotation.set(0.12, -0.55, 0)

  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 20)
  const fit = () => {
    const r = host.getBoundingClientRect()
    const w = Math.max(1, r.width), h = Math.max(1, r.height)
    renderer.setSize(w, h, false)
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    camera.aspect = w / h
    const t = Math.tan(THREE.MathUtils.degToRad(15))
    const d = Math.max(0.32 / t, 0.52 / (t * camera.aspect))
    camera.position.set(0.1, 0.12, d)
    camera.lookAt(0.02, 0, -0.08)
    camera.updateProjectionMatrix()
    req()
  }

  let explode = 0, goalExplode = 0, clear = 0, goalClear = 0
  let active: HeadPart | null = null
  const tint = new THREE.Color('#cfa458'), white = new THREE.Color('#ffffff')
  const apply = () => {
    groups.glass.position.z = 0.36 * explode
    groups.lens.position.z = 0.19 * explode
    groups.mask.position.z = 0.09 * explode
    groups.housing.position.z = -0.04 * explode
    m.glass.color.copy(tint).lerp(white, clear)
    m.glass.roughness = 0.7 * (1 - clear) + 0.02
    m.glass.opacity = 0.6 * (1 - clear) + 0.16
    m.glass.clearcoat = 0.2 + 0.8 * clear
    // Мутное стекло рассеивает свет: пятно большое, тусклое и жёлтое. Прозрачное: яркая точка без ореола.
    for (const sp of glows) {
      const k = 0.36 - 0.2 * clear
      sp.scale.set(k, k, 1)
      const mat = sp.material
      mat.color.setRGB(1, 0.78 + 0.22 * clear, 0.45 + 0.55 * clear)
      mat.opacity = 0.42 + 0.58 * clear
    }
    m.drl.color.setRGB(1.1 + 1.3 * clear, 1 + 1.6 * clear, 0.7 + 2.3 * clear)
    for (const [k, g] of Object.entries(groups)) {
      g.traverse(x => {
        const mesh = x as THREE.Mesh
        if (!mesh.isMesh) return
        const mm = mesh.material as THREE.MeshStandardMaterial
        if (!('emissive' in mm) || mm === m.lens) return
        mm.emissive.copy(k === active ? accent : new THREE.Color(0)).multiplyScalar(k === active ? 0.35 : 0)
      })
    }
  }

  // Поворот пальцем.
  let drag = false, lastX = 0, lastY = 0, yaw = -0.55, pitch = 0.12
  const el = renderer.domElement
  el.style.touchAction = 'pan-y'
  el.addEventListener('pointerdown', e => { drag = true; lastX = e.clientX; lastY = e.clientY; el.setPointerCapture(e.pointerId) })
  el.addEventListener('pointermove', e => {
    if (!drag) return
    yaw = Math.max(-1.3, Math.min(0.9, yaw + (e.clientX - lastX) * 0.008))
    pitch = Math.max(-0.4, Math.min(0.6, pitch + (e.clientY - lastY) * 0.004))
    lastX = e.clientX; lastY = e.clientY
    req()
  })
  el.addEventListener('pointerup', () => { drag = false })

  let raf = 0, visible = true
  const frame = () => {
    raf = 0
    explode += (goalExplode - explode) * 0.12
    clear += (goalClear - clear) * 0.12
    root.rotation.set(pitch, yaw, 0)
    apply()
    renderer.render(scene, camera)
    if (visible && (Math.abs(goalExplode - explode) > 0.001 || Math.abs(goalClear - clear) > 0.001)) req()
  }
  function req() { if (!raf && visible) raf = requestAnimationFrame(frame) }
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) req() })
  io.observe(host)
  const ro = new ResizeObserver(fit)
  ro.observe(host)
  fit()
  frame()
  o.onReady?.()

  return {
    setExplode: t => { goalExplode = t; req() },
    setClear: c => { goalClear = c ? 1 : 0; req() },
    setActive: p => { active = p; req() },
    destroy: () => {
      cancelAnimationFrame(raf)
      io.disconnect(); ro.disconnect()
      for (const g of geos) g.dispose()
      for (const mm of Object.values(m)) mm.dispose()
      for (const sp of glows) sp.material.dispose()
      glowMap?.dispose()
      env.dispose(); pmrem.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
