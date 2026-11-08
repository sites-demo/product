// Сцена с машиной: студийный свет, тень на полу, вращение пальцем, выбор детали касанием.
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { hexStudio } from './hexStudio'
import { loadCar, type BodyType, type Car, type PanelId } from './carModel'

export type CarSceneOptions = {
  type: BodyType
  paint: string
  accent: string
  dark?: boolean
  /** Свет в отражениях: обычная студия или соты детейлинг-бокса. */
  studio?: 'room' | 'hex'
  /** Начальный поворот машины, радианы. */
  yaw?: number
  autoRotate?: boolean
  onPick?: (panel: PanelId) => void
  onHover?: (panel: PanelId | null) => void
  onFrame?: (time: number) => void
}

export type CarScene = {
  car: Car
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  setMarked: (panels: Iterable<PanelId>) => void
  flash: (panel: PanelId) => void
  turnTo: (yaw: number) => void
  render: () => void
  requestFrame: () => void
  setPaint: (paint: string) => void
  destroy: () => void
}

export function shadowTexture(dark: boolean) {
  const c = document.createElement('canvas')
  c.width = 256; c.height = 256
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(128, 128, 2, 128, 128, 127)
  const a = dark ? 0.9 : 0.55
  grad.addColorStop(0, `rgba(0,0,0,${a})`)
  grad.addColorStop(0.35, `rgba(0,0,0,${a * 0.7})`)
  grad.addColorStop(0.7, `rgba(0,0,0,${a * 0.18})`)
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 256, 256)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export async function createCarScene(host: HTMLElement, o: CarSceneOptions): Promise<CarScene> {
  const car = await loadCar(o.paint)
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = o.dark ? 1.05 : 1.0
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.domElement.style.touchAction = 'pan-y'
  host.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  const env = pmrem.fromScene(o.studio === 'hex' ? hexStudio() : new RoomEnvironment(), o.studio === 'hex' ? 0.025 : 0.04).texture
  scene.environment = env
  scene.environmentIntensity = o.studio === 'hex' ? 1 : o.dark ? 0.75 : 1

  const key = new THREE.DirectionalLight('#ffffff', o.dark ? 1.6 : 1.2)
  key.position.set(3, 6, 4)
  scene.add(key)
  const rim = new THREE.DirectionalLight(o.dark ? '#9fc2ff' : '#ffffff', o.dark ? 1.2 : 0.4)
  rim.position.set(-5, 3, -4)
  scene.add(rim)

  if (o.studio === 'hex') {
    // Под сотами чуть матовее лак: отражение мягче и дороже.
    for (const m of car.paint) { m.roughness = 0.36; m.clearcoatRoughness = 0.15; m.normalMap = null }
  }
  const turntable = new THREE.Group()
  turntable.add(car.group)
  scene.add(turntable)

  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(car.shape.L * 1.3, car.shape.W * 1.75), new THREE.MeshBasicMaterial({ map: shadowTexture(!!o.dark), transparent: true, depthWrite: false }))
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = 0.002
  turntable.add(shadow)

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 60)
  const target = new THREE.Vector3(0, car.shape.H * 0.42, 0)

  let width = 1, height = 1
  const fit = () => {
    const r = host.getBoundingClientRect()
    width = Math.max(1, r.width); height = Math.max(1, r.height)
    renderer.setSize(width, height, false)
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    camera.aspect = width / height
    // Машина целиком влезает и в узкий телефон, и в широкий экран.
    const need = car.shape.L * 0.54 + 0.25
    const dist = Math.max(need / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.min(camera.aspect, 1.6), 6.4)
    camera.position.set(0, 2.1, dist).applyAxisAngle(new THREE.Vector3(0, 1, 0), 0)
    camera.position.y = 1.55 + dist * 0.16
    camera.lookAt(target)
    camera.updateProjectionMatrix()
    requestFrame()
  }

  // Поворот: палец или мышь тянут вбок, отпущенная машина ещё немного докручивается.
  let yaw = o.yaw ?? -0.7, vel = 0, dragging = false, lastX = 0, downX = 0, downY = 0, moved = false
  let goal: number | null = null
  let auto = o.autoRotate !== false
  let touched = false
  const el = renderer.domElement
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2()
  const pick = (cx: number, cy: number): PanelId | null => {
    const r = el.getBoundingClientRect()
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1)
    ray.setFromCamera(ndc, camera)
    const hit = ray.intersectObjects(car.pickables, false)[0]
    return (hit?.object.userData.panel as PanelId) ?? null
  }
  el.addEventListener('pointerdown', e => {
    dragging = true; moved = false; lastX = downX = e.clientX; downY = e.clientY; vel = 0; goal = null
    touched = true; auto = false
    el.setPointerCapture(e.pointerId)
  })
  el.addEventListener('pointermove', e => {
    if (dragging) {
      const dx = e.clientX - lastX
      lastX = e.clientX
      if (Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 6) moved = true
      if (moved) { yaw += dx * 0.011; vel = dx * 0.011; requestFrame() }
    } else if (e.pointerType === 'mouse' && o.onHover) {
      const p = pick(e.clientX, e.clientY)
      el.style.cursor = p ? 'pointer' : 'grab'
      setHover(p)
    }
  })
  const up = (e: PointerEvent) => {
    if (!dragging) return
    dragging = false
    if (!moved) {
      const p = pick(e.clientX, e.clientY)
      if (p) o.onPick?.(p)
    }
    requestFrame()
  }
  el.addEventListener('pointerup', up)
  el.addEventListener('pointercancel', () => { dragging = false })

  let hover: PanelId | null = null
  const setHover = (p: PanelId | null) => {
    if (p === hover) return
    hover = p
    o.onHover?.(p)
    paintPanels()
  }

  const accent = new THREE.Color(o.accent)
  let base = new THREE.Color(o.paint)
  let marked = new Set<PanelId>()
  const flashes = new Map<PanelId, number>()
  const paintPanels = () => {
    const now = performance.now()
    for (const [id, meshes] of car.panels) {
      const m = meshes[0].material as THREE.MeshPhysicalMaterial
      const f = flashes.get(id)
      const pulse = f ? Math.max(0, 1 - (now - f) / 900) : 0
      if (marked.has(id)) {
        m.color.copy(accent)
        m.emissive.copy(accent).multiplyScalar(0.18 + 0.35 * pulse)
      } else {
        m.color.copy(base)
        m.emissive.setRGB(0, 0, 0)
        if (id === hover) m.emissive.copy(accent).multiplyScalar(0.22)
        if (pulse) m.emissive.copy(accent).multiplyScalar(0.4 * pulse)
      }
      if (f && !pulse) flashes.delete(id)
    }
    requestFrame()
  }

  let raf = 0, visible = true, last = performance.now()
  const frame = (now: number) => {
    raf = 0
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    let busy = false
    if (!dragging) {
      if (goal !== null) {
        const d = Math.atan2(Math.sin(goal - yaw), Math.cos(goal - yaw))
        yaw += d * Math.min(1, dt * 5)
        if (Math.abs(d) < 0.002) goal = null
        busy = true
      } else if (Math.abs(vel) > 0.0004) {
        yaw += vel; vel *= 0.92; busy = true
      } else if (auto && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        yaw += dt * 0.22; busy = true
      }
    }
    if (flashes.size) { paintPanels(); busy = true }
    turntable.rotation.y = yaw
    o.onFrame?.(now)
    renderer.render(scene, camera)
    if (busy && visible) requestFrame()
  }
  function requestFrame() {
    if (!raf && visible) { last = Math.min(last, performance.now()); raf = requestAnimationFrame(frame) }
  }

  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting && !document.hidden
    if (visible) { last = performance.now(); requestFrame() }
  })
  io.observe(host)
  const onVis = () => { visible = !document.hidden; if (visible) { last = performance.now(); requestFrame() } }
  document.addEventListener('visibilitychange', onVis)
  const ro = new ResizeObserver(fit)
  ro.observe(host)
  fit()
  paintPanels()

  return {
    car, scene, camera,
    setMarked: ps => { marked = new Set(ps); paintPanels() },
    flash: p => { flashes.set(p, performance.now()); paintPanels() },
    turnTo: y => { goal = y; auto = false; touched = true; requestFrame() },
    render: () => renderer.render(scene, camera),
    requestFrame,
    setPaint: p => { base = new THREE.Color(p); paintPanels() },
    destroy: () => {
      cancelAnimationFrame(raf)
      io.disconnect(); ro.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      car.dispose()
      env.dispose(); pmrem.dispose()
      renderer.dispose()
      renderer.domElement.remove()
      void touched
    },
  }
}
