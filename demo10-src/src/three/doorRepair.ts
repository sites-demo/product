// Дверь настоящей модели крупным планом в малярном боксе: полосы света отражаются в лаке.
// По вмятине полосы гнутся, после ремонта снова идут ровно. Этап задаётся числом 0..4.
import * as THREE from 'three'
import { loadCar } from './carModel'

export type DoorScene = { setStage: (s: number) => void; destroy: () => void }

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

const DENT = new THREE.Vector2(-0.16, 0.64)
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

export async function createDoorScene(host: HTMLElement, o: { paint: string; onReady?: () => void }): Promise<DoorScene> {
  const car = await loadCar(o.paint)
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.outputColorSpace = THREE.SRGBColorSpace
  host.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const env = boothEnvironment(renderer)
  scene.environment = env
  scene.add(car.group)
  // Без «металлика» в лаке: в боксе полосы света должны идти чисто, иначе зерно спорит с вмятиной.
  for (const m of car.paint) { m.roughness = 0.3; m.clearcoatRoughness = 0.02; m.normalMap = null; m.needsUpdate = true }

  // Правая передняя дверь: на ней показываем этапы. Вмятина рисуется в шейдере через нормаль,
  // поэтому полосы света гнутся плавно, даже где сетка модели крупная.
  const doorMeshes = car.panels.get('doorFR') ?? []
  const paint = doorMeshes[0].material as THREE.MeshPhysicalMaterial
  paint.normalMap = null
  const u = {
    uMetal: { value: 0 }, uPrimer: { value: 0 }, uMatte: { value: 0 }, uScratch: { value: 1 },
    uDent: { value: DENT.clone() }, uDepth: { value: DENT_DEPTH }, uR: { value: DENT_R },
    uNM: { value: new THREE.Matrix3() },
  }
  paint.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u)
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObj;\nvarying vec3 vObjN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;\nvObjN = normal;')
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vObj;
varying vec3 vObjN;
uniform float uMetal, uPrimer, uMatte, uScratch, uDepth, uR;
uniform vec2 uDent;
uniform mat3 uNM;
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
}
// Глубина вмятины: вытянутая ямка с заломом по линии удара.
float dentH(vec2 p) {
  float dx = (p.x - uDent.x) / uR, dy = (p.y - uDent.y) / (uR * 0.55);
  float crease = 0.4 * exp(-(dy * dy) / 0.05) * exp(-(dx * dx) / 0.9);
  return -uDepth * (exp(-(dx * dx + dy * dy)) + crease);
}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
if (uDepth > 0.0001) {
  float e = 0.002;
  float hx = (dentH(vObj.xy + vec2(e, 0.0)) - dentH(vObj.xy - vec2(e, 0.0))) / (2.0 * e);
  float hy = (dentH(vObj.xy + vec2(0.0, e)) - dentH(vObj.xy - vec2(0.0, e))) / (2.0 * e);
  vec3 nObj = normalize(normalize(vObjN) + vec3(-hx, -hy, 0.0));
  normal = normalize(uNM * nObj);
  #ifdef DOUBLE_SIDED
    normal *= faceDirection;
  #endif
}`)
      .replace('#include <clearcoat_normal_fragment_maps>', `#include <clearcoat_normal_fragment_maps>
clearcoatNormal = normal;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
vec2 q = (vObj.xy - uDent) * vec2(1.0, 1.45);
float dd = length(q);
float ang = atan(q.y, q.x);
float n1 = fract(sin(dot(floor(vObj.xy * 900.0), vec2(12.9898, 78.233))) * 43758.5453);
// Зачистка: голый металл, вокруг кольца старого грунта и краски, как после шлифовки.
float inMetal = 1.0 - smoothstep(0.135, 0.145, dd);
float ring1 = (1.0 - smoothstep(0.16, 0.168, dd)) * (1.0 - inMetal);
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
  paint.needsUpdate = true

  // Где дверь: смотрим на неё сбоку, чуть спереди и сверху.
  const doorBox = new THREE.Box3()
  for (const m of doorMeshes) doorBox.expandByObject(m)
  const look = doorBox.getCenter(new THREE.Vector3())
  look.y = Math.min(look.y, 0.72)
  const camera = new THREE.PerspectiveCamera(24, 1, 0.05, 30)
  let base = new THREE.Vector3()
  const fit = () => {
    const r = host.getBoundingClientRect()
    const w = Math.max(1, r.width), h = Math.max(1, r.height)
    renderer.setSize(w, h, false)
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    camera.aspect = w / h
    // Дверь целиком в кадре: на узком экране отодвигаемся дальше.
    const halfW = (doorBox.max.x - doorBox.min.x) / 2 + 0.08, halfH = 0.5
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const dist = Math.max(halfH / t, halfW / (t * camera.aspect)) * 1.05
    base = new THREE.Vector3(look.x + dist * 0.42, look.y + dist * 0.14, look.z + dist * 0.9)
    camera.updateProjectionMatrix()
    req()
  }

  let target = 0, stage = 0, raf = 0, visible = true
  const t0 = performance.now()
  const apply = () => {
    const s = stage
    u.uDepth.value = DENT_DEPTH * (1 - smooth(0.25, 1, s))
    u.uScratch.value = 1 - smooth(0.2, 0.8, s)
    u.uMetal.value = smooth(0.3, 0.9, s) * (1 - smooth(1.3, 1.9, s))
    u.uPrimer.value = smooth(1.3, 1.9, s) * (1 - smooth(2.3, 2.9, s))
    u.uMatte.value = smooth(2.3, 2.9, s) * (1 - smooth(3.2, 3.95, s))
  }
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches
  const mv = new THREE.Matrix4()
  const frame = (now: number) => {
    raf = 0
    const d = target - stage
    stage += still || Math.abs(d) < 0.002 ? d : d * 0.09
    apply()
    // Камера чуть плывёт: полосы света скользят по лаку, как при осмотре в боксе.
    const k = still ? 0 : (now - t0) / 1000
    camera.position.set(base.x + Math.sin(k * 0.35) * 0.1, base.y + Math.sin(k * 0.23) * 0.03, base.z)
    camera.lookAt(look)
    camera.updateMatrixWorld()
    mv.multiplyMatrices(camera.matrixWorldInverse, doorMeshes[0].matrixWorld)
    u.uNM.value.getNormalMatrix(mv)
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
  scene.updateMatrixWorld(true)
  fit()
  apply()
  frame(performance.now())
  o.onReady?.()

  return {
    setStage: s => { target = s; req() },
    destroy: () => {
      cancelAnimationFrame(raf)
      io.disconnect(); ro.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      car.dispose()
      env.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
