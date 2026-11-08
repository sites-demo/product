// Стенд развал-схождения: машина сверху полупрозрачная, колёса настоящие, от каждого колеса на пол идёт луч.
// До регулировки передние колёса смотрят врозь и завалены, лучи красные. После колёса ровные, лучи зелёные.
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { loadCar, type BodyType } from './carModel'

export type AlignScene = { set: (t: number) => void; destroy: () => void }

// Наклоны до регулировки нарочно крупные, чтобы их было видно глазом. Это картинка, а не замер.
const TOE = [0.07, -0.05, 0.025, -0.02]
const CAMBER = [0.06, 0.0, 0.0, 0.03]

export async function createAlignScene(host: HTMLElement, o: { type?: BodyType; paint: string; accent: string; onReady?: () => void }): Promise<AlignScene> {
  const car = await loadCar(o.paint)
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.outputColorSpace = THREE.SRGBColorSpace
  host.appendChild(renderer.domElement)
  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = env
  const key = new THREE.DirectionalLight('#ffffff', 1.4)
  key.position.set(2, 6, 3)
  scene.add(key)

  // Кузов как стекло: видно колёса и лучи сквозь него. Салон на стенде не нужен.
  for (const m of [...car.paint, ...car.glass, ...car.body] as THREE.MeshStandardMaterial[]) {
    m.transparent = true
    m.opacity = car.paint.includes(m as THREE.MeshPhysicalMaterial) ? 0.16 : 0.08
    m.depthWrite = false
  }
  for (const o of car.interior) o.visible = false
  scene.add(car.group)

  // Пол стенда и разметка.
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 8), new THREE.MeshStandardMaterial({ color: '#e9ecef', roughness: 0.9 }))
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -0.001
  scene.add(floor)
  const grid = new THREE.GridHelper(12, 24, '#c9cfd6', '#d9dee3')
  grid.position.y = 0.001
  scene.add(grid)

  // Луч из каждого колеса вперёд по направлению качения.
  const bad = new THREE.Color('#e5483b'), good = new THREE.Color('#1fa36b')
  const beams = car.wheels.map((w, i) => {
    const front = i < 2
    const len = front ? 2.2 : 1.6
    const g = new THREE.PlaneGeometry(len, 0.035)
    g.translate(len / 2 * (front ? 1 : -1), 0, 0)
    g.rotateX(-Math.PI / 2)
    const m = new THREE.MeshBasicMaterial({ color: bad.clone(), transparent: true, opacity: 0.9, depthWrite: false })
    const beam = new THREE.Mesh(g, m)
    beam.position.set(w.position.x, 0.004, w.position.z)
    scene.add(beam)
    // Опорная линия: куда колесо должно смотреть.
    const ref = new THREE.Mesh(g.clone(), new THREE.MeshBasicMaterial({ color: '#9aa3ad', transparent: true, opacity: 0.45, depthWrite: false }))
    ref.position.copy(beam.position).setY(0.003)
    scene.add(ref)
    return { beam, ref, m }
  })

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60)
  const fit = () => {
    const r = host.getBoundingClientRect()
    const w = Math.max(1, r.width), h = Math.max(1, r.height)
    renderer.setSize(w, h, false)
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    camera.aspect = w / h
    const span = car.shape.L * 0.62 + 1.4
    const dist = Math.max(span / Math.tan(THREE.MathUtils.degToRad(15)) / Math.min(camera.aspect, 1.4), 8.5)
    camera.position.set(dist * 0.6, dist * 0.74, dist * 0.3)
    camera.lookAt(0.5, 0, 0)
    camera.updateProjectionMatrix()
    req()
  }

  let t = 0, goal = 0
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches
  const apply = () => {
    car.wheels.forEach((w, i) => {
      const k = 1 - t
      w.rotation.set(0, 0, 0)
      w.rotateY(TOE[i] * k)
      w.rotateX(CAMBER[i] * k * (w.position.z > 0 ? 1 : -1))
      const b = beams[i]
      b.beam.rotation.y = TOE[i] * k
      b.m.color.copy(bad).lerp(good, t)
    })
  }
  let raf = 0, visible = true
  const frame = () => {
    raf = 0
    if (still) t = goal
    else t += (goal - t) * 0.08
    apply()
    renderer.render(scene, camera)
    if (Math.abs(goal - t) > 0.001 && visible) req()
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
    set: v => { goal = Math.max(0, Math.min(1, v)); req() },
    destroy: () => {
      cancelAnimationFrame(raf)
      io.disconnect(); ro.disconnect()
      car.dispose()
      env.dispose(); pmrem.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
