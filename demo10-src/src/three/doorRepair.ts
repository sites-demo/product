// Дверь крупным планом в малярном боксе: полосы света отражаются в лаке.
// По вмятине полосы гнутся, после ремонта снова идут ровно. Этап задаётся числом 0..4.
import * as THREE from 'three'

export type DoorScene = { setStage: (s: number) => void; destroy: () => void }

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// Поверхность боковины: выпуклость, изгиб по длине, ребро и завал над ним.
function surf(x: number, y: number) {
  const t = (y - 0.6) / 0.48
  let z = 0.05 * (1 - t * t)
  z -= 0.07 * (x / 1.5) ** 2
  z += 0.004 * Math.exp(-(((y - 0.84) / 0.012) ** 2))
  if (y > 0.84) z -= (y - 0.84) * 0.16
  return z
}

const DENT = new THREE.Vector2(-0.12, 0.7)
const DENT_R = 0.15
const DENT_DEPTH = 0.02

// Комната с полосами света, как в покрасочной камере: из неё строится отражение.
function boothEnvironment(renderer: THREE.WebGLRenderer) {
  const room = new THREE.Scene()
  const walls = new THREE.Mesh(new THREE.BoxGeometry(14, 8, 14), new THREE.MeshBasicMaterial({ color: '#2a2d32', side: THREE.BackSide }))
  walls.position.y = 2.5
  room.add(walls)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshBasicMaterial({ color: '#4a4d53' }))
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -1.49
  room.add(floor)
  const lamp = new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 5, 5.2) })
  // Полосы на стене напротив двери и над ней.
  for (let y = -0.9; y < 3.2; y += 0.34) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(11, 0.06, 0.05), lamp)
    bar.position.set(0, y, 6.9)
    room.add(bar)
  }
  for (const z of [-2.5, 0, 2.5]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(11, 0.05, 0.22), lamp)
    bar.position.set(0, 6.4, z)
    room.add(bar)
  }
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.57, 0.6) }))
  ceil.rotation.x = Math.PI / 2
  ceil.position.y = 6.45
  room.add(ceil)
  const soft = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.4, 1.5) }))
  soft.position.set(-5.5, 2.4, 3)
  soft.rotation.y = Math.PI / 2
  room.add(soft)
  const pmrem = new THREE.PMREMGenerator(renderer)
  const tex = pmrem.fromScene(room, 0).texture
  pmrem.dispose()
  room.traverse(o => { if ((o as THREE.Mesh).geometry) (o as THREE.Mesh).geometry.dispose() })
  return tex
}

function panelGeometry(x0: number, x1: number, y0: number, y1: number, nx: number, ny: number) {
  const g = new THREE.PlaneGeometry(x1 - x0, y1 - y0, nx, ny)
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, 0)
  const p = g.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < p.count; i++) p.setZ(i, surf(p.getX(i), p.getY(i)))
  g.computeVertexNormals()
  return g
}

export function createDoorScene(host: HTMLElement, o: { paint: string; onReady?: () => void }): DoorScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.outputColorSpace = THREE.SRGBColorSpace
  host.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const env = boothEnvironment(renderer)
  scene.environment = env

  const paint = new THREE.MeshPhysicalMaterial({ color: o.paint, metalness: 0.45, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.02 })
  const sidePaint = paint.clone()
  const black = new THREE.MeshStandardMaterial({ color: '#0b0c0e', roughness: 0.6 })
  const glass = new THREE.MeshPhysicalMaterial({ color: '#0a0d10', metalness: 0, roughness: 0.04, clearcoat: 1 })
  const chrome = new THREE.MeshStandardMaterial({ color: '#d7dbe0', metalness: 1, roughness: 0.12 })

  // Этап работ передаётся в шейдер двери: металл, грунт, матовая краска, царапины.
  const u = {
    uMetal: { value: 0 }, uPrimer: { value: 0 }, uMatte: { value: 0 }, uScratch: { value: 1 },
    uDent: { value: DENT.clone() },
  }
  paint.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u)
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObj;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;')
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vObj;
uniform float uMetal, uPrimer, uMatte, uScratch;
uniform vec2 uDent;
float seg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
float scratches(vec2 p) {
  vec2 q = p - uDent;
  float d = 1.0;
  d = min(d, seg(q, vec2(-0.21, 0.07), vec2(0.17, 0.115)));
  d = min(d, seg(q, vec2(-0.16, 0.03), vec2(0.2, 0.072)));
  d = min(d, seg(q, vec2(-0.05, -0.02), vec2(0.26, 0.02)));
  d = min(d, seg(q, vec2(0.02, 0.14), vec2(0.3, 0.16)));
  d = min(d, seg(q, vec2(-0.12, -0.06), vec2(0.06, -0.045)));
  return 1.0 - smoothstep(0.0012, 0.0032, d);
}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
vec2 q = (vObj.xy - uDent) * vec2(1.0, 1.45);
float dd = length(q);
float ang = atan(q.y, q.x);
float n1 = fract(sin(dot(floor(vObj.xy * 900.0), vec2(12.9898, 78.233))) * 43758.5453);
// Зачистка: голый металл, вокруг кольца старого грунта и краски, как после шлифовки.
float inMetal = 1.0 - smoothstep(0.135, 0.145, dd);
float ring1 = (1.0 - smoothstep(0.16, 0.168, dd)) * (1.0 - inMetal);
float ring2 = (1.0 - smoothstep(0.18, 0.19, dd)) * (1.0 - inMetal) * (1.0 - ring1);
float sanded = (1.0 - smoothstep(0.2, 0.24, dd + 0.01 * sin(ang * 7.0)));
float mMetal = inMetal * uMetal;
float edge = 0.26 + 0.005 * sin(ang * 3.0 + 1.3) + 0.003 * sin(ang * 7.0);
float mPrimer = (1.0 - smoothstep(edge - 0.035, edge, dd)) * uPrimer;
float mSand = sanded * uMetal;
float mMatte = uMatte;
float mScr = scratches(vObj.xy) * uScratch;
vec3 c = diffuseColor.rgb;
c = mix(c, vec3(0.78, 0.79, 0.8), mScr);
c = mix(c, c * 1.35 + 0.04, mSand * (1.0 - ring1) * (1.0 - inMetal));
c = mix(c, vec3(0.38, 0.39, 0.38), ring1 * uMetal);
c = mix(c, vec3(0.66, 0.68, 0.7) * (0.92 + 0.12 * n1), mMetal);
c = mix(c, vec3(0.47, 0.48, 0.47) * (0.97 + 0.05 * n1), mPrimer);
diffuseColor.rgb = c;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = mix(roughnessFactor, 0.62, mScr);
roughnessFactor = mix(roughnessFactor, 0.6, mSand);
roughnessFactor = mix(roughnessFactor, 0.28 + 0.2 * n1, mMetal);
roughnessFactor = mix(roughnessFactor, 0.9, mPrimer);
roughnessFactor = mix(roughnessFactor, 0.55, mMatte * (1.0 - mPrimer));`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
metalnessFactor = mix(metalnessFactor, 1.0, mMetal);
metalnessFactor = mix(metalnessFactor, 0.0, max(mPrimer, mScr));`)
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
material.clearcoat *= 1.0 - max(max(mSand, mPrimer), max(mMatte, mScr));`)
  }

  const group = new THREE.Group()
  scene.add(group)
  const GAP = 0.006
  const door = new THREE.Mesh(panelGeometry(-0.56 + GAP, 0.56 - GAP, 0.27, 0.985, 340, 220), paint)
  const fender = new THREE.Mesh(panelGeometry(-1.6, -0.56 - GAP, 0.27, 0.985, 90, 80), sidePaint)
  const rear = new THREE.Mesh(panelGeometry(0.56 + GAP, 1.7, 0.27, 0.985, 90, 80), sidePaint)
  const sill = new THREE.Mesh(panelGeometry(-1.6, 1.7, 0.16, 0.27 - GAP, 60, 6), sidePaint)
  group.add(door, fender, rear, sill)
  // Тёмная подложка: в щелях между деталями видно чёрное.
  const back = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.0), black)
  back.position.set(0.05, 0.57, -0.06)
  group.add(back)
  // Стекло, уплотнитель и стойка над дверью.
  const win = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 0.42), glass)
  win.position.set(0.05, 1.2, -0.02)
  win.rotation.x = -0.32
  const seal = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.02, 0.04), black)
  seal.position.set(0.05, 0.995, -0.005)
  const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.44, 0.03), black)
  pillar.position.set(0.56, 1.2, -0.01)
  pillar.rotation.x = -0.32
  group.add(win, seal, pillar)
  const handle = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.12, 6, 16), chrome)
  handle.rotation.z = Math.PI / 2
  handle.position.set(0.3, 0.8, surf(0.3, 0.8) + 0.014)
  handle.scale.set(1, 1, 0.55)
  group.add(handle)

  // Вмятина: меняем точки двери рядом с центром и считаем нормали по самой поверхности.
  const pos = door.geometry.attributes.position as THREE.BufferAttribute
  const nor = door.geometry.attributes.normal as THREE.BufferAttribute
  const near: number[] = []
  for (let i = 0; i < pos.count; i++) {
    const dx = pos.getX(i) - DENT.x, dy = pos.getY(i) - DENT.y
    if (dx * dx + dy * dy < (DENT_R * 3) ** 2) near.push(i)
  }
  const height = (x: number, y: number, depth: number) => {
    const dx = (x - DENT.x) / DENT_R, dy = (y - DENT.y) / (DENT_R * 0.55)
    // Вытянутая вмятина с заломом по линии удара.
    const crease = 0.4 * Math.exp(-(dy * dy) / 0.05) * Math.exp(-(dx * dx) / 0.9)
    return surf(x, y) - depth * (Math.exp(-(dx * dx + dy * dy)) + crease)
  }
  let lastDepth = -1
  const setDent = (depth: number) => {
    if (Math.abs(depth - lastDepth) < 1e-5) return
    lastDepth = depth
    const e = 0.002
    for (const i of near) {
      const x = pos.getX(i), y = pos.getY(i)
      pos.setZ(i, height(x, y, depth))
      const zx = (height(x + e, y, depth) - height(x - e, y, depth)) / (2 * e)
      const zy = (height(x, y + e, depth) - height(x, y - e, depth)) / (2 * e)
      const l = Math.hypot(zx, zy, 1)
      nor.setXYZ(i, -zx / l, -zy / l, 1 / l)
    }
    pos.needsUpdate = true
    nor.needsUpdate = true
  }

  const camera = new THREE.PerspectiveCamera(24, 1, 0.05, 30)
  const look = new THREE.Vector3(-0.02, 0.6, 0)
  let base = new THREE.Vector3()
  const fit = () => {
    const r = host.getBoundingClientRect()
    const w = Math.max(1, r.width), h = Math.max(1, r.height)
    renderer.setSize(w, h, false)
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    camera.aspect = w / h
    // Дверь целиком в кадре: на узком экране отодвигаемся дальше.
    const halfW = 0.68, halfH = 0.42
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const dist = Math.max(halfH / t, halfW / (t * camera.aspect)) * 1.05
    base = new THREE.Vector3(0.62, 0.86, dist).normalize().multiplyScalar(dist)
    base.y = 0.6 + dist * 0.12
    camera.updateProjectionMatrix()
    req()
  }

  let target = 0, stage = 0, raf = 0, visible = true, t0 = performance.now()
  const apply = () => {
    const s = stage
    setDent(DENT_DEPTH * (1 - smooth(0.25, 1, s)))
    u.uScratch.value = 1 - smooth(0.2, 0.8, s)
    u.uMetal.value = smooth(0.3, 0.9, s) * (1 - smooth(1.3, 1.9, s))
    u.uPrimer.value = smooth(1.3, 1.9, s) * (1 - smooth(2.3, 2.9, s))
    u.uMatte.value = smooth(2.3, 2.9, s) * (1 - smooth(3.2, 3.95, s))
  }
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches
  const frame = (now: number) => {
    raf = 0
    const d = target - stage
    stage += Math.abs(d) < 0.002 ? d : d * 0.09
    apply()
    // Камера чуть плывёт: полосы света скользят по лаку, как при осмотре в боксе.
    const k = still ? 0 : (now - t0) / 1000
    camera.position.set(base.x + Math.sin(k * 0.35) * 0.08, base.y + Math.sin(k * 0.23) * 0.03, base.z)
    camera.lookAt(look)
    renderer.render(scene, camera)
    if (visible && (!still || Math.abs(target - stage) > 0.001)) req()
  }
  function req() { if (!raf && visible) raf = requestAnimationFrame(frame) }

  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting && !document.hidden; if (visible) req() })
  io.observe(host)
  const onVis = () => { visible = !document.hidden; if (visible) req() }
  document.addEventListener('visibilitychange', onVis)
  const ro = new ResizeObserver(fit)
  ro.observe(host)
  fit()
  apply()
  renderer.render(scene, camera)
  o.onReady?.()

  return {
    setStage: s => { target = s; req() },
    destroy: () => {
      cancelAnimationFrame(raf)
      io.disconnect(); ro.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      scene.traverse(m => { const g = (m as THREE.Mesh).geometry; if (g) g.dispose() })
      for (const m of [paint, sidePaint, black, glass, chrome]) m.dispose()
      env.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
