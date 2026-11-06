import { memo, useEffect, useMemo, useRef, type RefObject } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Environment, Lightformer, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import type { PartId } from '../data'
import { butterflyHandle, flowArrow, hexNut, lathe, ribbedLathe, threads, vaneStar, type P } from './geometry'
import { dialFace, foamNormalMap, waterStreaks } from './textures'

const { damp, degToRad, smoothstep } = THREE.MathUtils

// Раскладка узла. Вода идёт слева направо: кран, смотровой участок, спуск в фильтр, подъём, кран, счётчик.
const MAIN = 1.42
const PORT = 0.79
const XV = 0.92
const BEND = 0.16
const R = 0.105
const VALVE_IN = -2
const VALVE_OUT = 1.42
const METER = 2.12
const GLASS_FROM = -1.58
const GLASS_TO = -1.14
const WALL = -0.62

const END_L = -2.92
const FOAM_TO = -2.78
const END_R = 2.82
const FOAM_R = 0.172

const CENTER_Y = 0.125
const HALF_W = 3.02
const HALF_H = 1.75
const RESTING_TURN = -0.3
const CENTER_SHIFT = -0.19
const CAMERA_FOV = 22
const CAMERA_LIFT = 9
const INTRO_SECONDS = 1.2

const SHADE = { castShadow: true, receiveShadow: true }
const X_AXIS: [number, number, number] = [0, 0, -Math.PI / 2]
const Z_AXIS: [number, number, number] = [Math.PI / 2, 0, 0]

function useMaterials() {
  const m = useMemo(() => {
    const foam = foamNormalMap()
    foam.repeat.set(3, 3)
    return {
      foamMap: foam,
      pp: new THREE.MeshPhysicalMaterial({ color: '#F3F1EA', roughness: 0.36, clearcoat: 0.35, clearcoatRoughness: 0.32 }),
      foam: new THREE.MeshStandardMaterial({ color: '#28508F', roughness: 0.94, normalMap: foam, normalScale: new THREE.Vector2(0.85, 0.85) }),
      brass: new THREE.MeshStandardMaterial({ color: '#D2B272', metalness: 1, roughness: 0.24 }),
      zinc: new THREE.MeshStandardMaterial({ color: '#C9CDD1', metalness: 1, roughness: 0.38 }),
      red: new THREE.MeshPhysicalMaterial({ color: '#B23A2E', roughness: 0.34, clearcoat: 0.7, clearcoatRoughness: 0.2 }),
      bowl: new THREE.MeshPhysicalMaterial({ color: '#24467A', roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.08 }),
      vane: new THREE.MeshStandardMaterial({ color: '#24467A', roughness: 0.4 }),
      black: new THREE.MeshPhysicalMaterial({ color: '#17191B', roughness: 0.46, clearcoat: 0.25, clearcoatRoughness: 0.5 }),
      head: new THREE.MeshPhysicalMaterial({ color: '#F3F1EA', roughness: 0.33, clearcoat: 0.45, clearcoatRoughness: 0.28 }),
      glassBack: new THREE.MeshPhysicalMaterial({ color: '#E6F0F6', roughness: 0.06, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.BackSide }),
      glassFront: new THREE.MeshPhysicalMaterial({ color: '#F4F9FC', roughness: 0.04, transparent: true, opacity: 0.16, depthWrite: false, envMapIntensity: 1.8 }),
      dome: new THREE.MeshPhysicalMaterial({ color: '#FFFFFF', roughness: 0.04, transparent: true, opacity: 0.12, depthWrite: false, envMapIntensity: 1.8 }),
      bubble: new THREE.MeshStandardMaterial({ color: '#F1F8FD', roughness: 0.12, transparent: true, opacity: 0.92, depthWrite: false }),
    }
  }, [])
  useEffect(
    () => () => {
      Object.values(m).forEach((x) => x.dispose())
    },
    [m],
  )
  return m
}
type Materials = ReturnType<typeof useMaterials>

const FOAM_ROUND = Math.PI * 2 * FOAM_R
const FOAM_LEN = VALVE_IN - 0.43 - FOAM_TO
const STUB_LEN = 0.16
const BORE = 0.078

// Зерно изоляции одного размера на всех деталях: развёртка в единицах окружности рукава.
function scaleUv<T extends THREE.BufferGeometry>(geo: T, su: number, sv: number) {
  const uv = geo.getAttribute('uv')
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv)
  return geo
}

function useGeometries() {
  return useMemo(() => {
    const socket: P[] = [
      [0, -0.062],
      [0.128, -0.062, 0.012],
      [0.142, -0.046, 0.012],
      [0.142, 0.046, 0.012],
      [0.128, 0.062, 0.012],
      [0, 0.062],
    ]
    const valveBody: P[] = [
      [0, -0.3],
      [0.096, -0.3],
      ...threads(0.106, -0.292, -0.242, 4),
      [0.118, -0.236, 0.004],
      [0.118, -0.16],
      [0.13, -0.15, 0.01],
      [0.13, -0.116, 0.012],
      [0.176, -0.078, 0.05],
      [0.176, 0.078, 0.05],
      [0.13, 0.116, 0.012],
      [0.13, 0.15, 0.01],
      [0.118, 0.16],
      [0.118, 0.236, 0.004],
      ...threads(0.106, 0.242, 0.292, 4),
      [0.096, 0.3],
      [0, 0.3],
    ]
    const stem: P[] = [
      [0, 0.12],
      [0.066, 0.12],
      [0.066, 0.178, 0.008],
      [0.046, 0.19, 0.006],
      [0.046, 0.262],
      [0, 0.262],
    ]
    const meterBody: P[] = [
      [0, -0.34],
      [0.096, -0.34],
      ...threads(0.106, -0.332, -0.292, 3),
      [0.118, -0.286, 0.004],
      [0.118, -0.244],
      [0.134, -0.232, 0.012],
      [0.134, 0.232, 0.012],
      [0.118, 0.244],
      [0.118, 0.286, 0.004],
      ...threads(0.106, 0.292, 0.332, 3),
      [0.096, 0.34],
      [0, 0.34],
    ]
    const meterCase: P[] = [
      [0, -0.11],
      [0.232, -0.11, 0.02],
      [0.25, -0.07, 0.02],
      [0.25, 0.12, 0.012],
      [0.232, 0.15, 0.014],
      [0.206, 0.146, 0.006],
      [0.206, 0.124],
      [0, 0.124],
    ]
    const dome: P[] = [
      [0.21, 0.124],
      [0.208, 0.148, 0.01],
      [0.14, 0.186, 0.05],
      [0, 0.196],
    ]
    const foamSleeve: P[] = [
      [0.105, 0],
      [0.158, 0],
      [FOAM_R, 0.018, 0.012],
      ...Array.from({ length: 11 }, (_, i): P => [FOAM_R, 0.05 + i * 0.025]),
      [FOAM_R, FOAM_LEN - 0.018, 0.012],
      [0.158, FOAM_LEN],
      [0.105, FOAM_LEN],
    ]
    const bowl: P[] = [
      [0, -1.5],
      [0.34, -1.5, 0.03],
      [0.53, -1.45, 0.09],
      [0.6, -1.25, 0.13],
      [0.605, 0.08, 0.03],
      [0.575, 0.2, 0.03],
      [0.575, 0.27],
    ]
    const cap: P[] = [
      [0.52, 0.2],
      [0.65, 0.22, 0.016],
      [0.665, 0.25, 0.012],
      [0.665, 0.47, 0.012],
      [0.63, 0.53, 0.024],
      [0.5, 0.56, 0.024],
      [0.34, 0.57],
      [0, 0.57],
    ]
    const stub: P[] = [
      [R, 0],
      [R, STUB_LEN - 0.014],
      [R - 0.012, STUB_LEN, 0.004],
      [BORE, STUB_LEN, 0.004],
      [BORE, STUB_LEN - 0.1],
    ]
    const neck: P[] = [
      [0, 0.52],
      [0.4, 0.52],
      [0.4, 0.62],
      [0, 0.62],
    ]
    const port: P[] = [
      [0, -0.09],
      [0.14, -0.09],
      [0.15, -0.03, 0.012],
      [0.15, 0.03, 0.012],
      [0.118, 0.05, 0.008],
      [0.118, 0.09],
      [0, 0.09],
    ]
    const bleed: P[] = [
      [0, 0],
      [0.058, 0],
      [0.058, 0.02, 0.006],
      [0.04, 0.03, 0.006],
      [0.04, 0.058, 0.01],
      [0, 0.058],
    ]
    const washer: P[] = [
      [0, 0],
      [0.058, 0],
      [0.058, 0.012, 0.004],
      [0, 0.012],
    ]
    return {
      socket: lathe(socket, 40),
      valveBody: lathe(valveBody, 48),
      stem: lathe(stem, 28),
      nut: hexNut(0.31, 0.09),
      nutLong: hexNut(0.31, 0.12, 0.02),
      handle: butterflyHandle(),
      handleNut: hexNut(0.062, 0.03, 0.005),
      meterBody: lathe(meterBody, 48),
      meterCase: lathe(meterCase, 64),
      dome: lathe(dome, 48),
      vane: vaneStar(),
      foamSleeve: scaleUv(lathe(foamSleeve, 40), 1, FOAM_LEN / FOAM_ROUND),
      stub: lathe(stub, 40),
      bore: new THREE.CircleGeometry(BORE, 32),
      elbow: new THREE.TorusGeometry(BEND, R * 1.16, 20, 28, Math.PI / 2),
      bowl: ribbedLathe(bowl, {
        count: 12,
        perRib: 18,
        depth: 0.034,
        rows: 0.05,
        rib: (p) => 1 - smoothstep(Math.abs(p - 0.5), 0.05, 0.11),
        mask: (y) => smoothstep(y, -1.42, -1.24) * (1 - smoothstep(y, 0.0, 0.1)),
      }),
      cap: ribbedLathe(cap, {
        count: 64,
        perRib: 6,
        depth: -0.016,
        rows: 0.022,
        rib: (p) => 0.5 + 0.5 * Math.cos(p * Math.PI * 2),
        mask: (y) => smoothstep(y, 0.26, 0.29) * (1 - smoothstep(y, 0.44, 0.47)),
      }),
      neck: lathe(neck, 40),
      port: lathe(port, 40),
      bleed: lathe(bleed, 24),
      washer: lathe(washer, 24),
      boltHead: hexNut(0.074, 0.036, 0.006),
      arrow: flowArrow(),
      dial: new THREE.CircleGeometry(0.206, 64),
      tie: new THREE.TorusGeometry(FOAM_R + 0.003, 0.005, 8, 48),
    }
  }, [])
}
type Geometries = ReturnType<typeof useGeometries>

function Pipe({ a, b, r = R, mat }: { a: [number, number]; b: [number, number]; r?: number; mat: THREE.Material }) {
  const { pos, rot, len } = useMemo(() => {
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    return {
      pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0] as [number, number, number],
      rot: [0, 0, Math.atan2(dy, dx) - Math.PI / 2] as [number, number, number],
      len: Math.hypot(dx, dy),
    }
  }, [a, b])
  return (
    <mesh position={pos} rotation={rot} material={mat} {...SHADE}>
      <cylinderGeometry args={[r, r, len, 32, 1, true]} />
    </mesh>
  )
}

function Fittings({ m, g }: { m: Materials; g: Geometries }) {
  const corners: { c: [number, number]; rz: number; sockets: [number, number, boolean][] }[] = [
    { c: [-XV - BEND, MAIN - BEND], rz: 0, sockets: [[-XV - BEND, MAIN, true], [-XV, MAIN - BEND, false]] },
    { c: [-XV + BEND, PORT + BEND], rz: Math.PI, sockets: [[-XV, PORT + BEND, false], [-XV + BEND, PORT, true]] },
    { c: [XV - BEND, PORT + BEND], rz: -Math.PI / 2, sockets: [[XV - BEND, PORT, true], [XV, PORT + BEND, false]] },
    { c: [XV + BEND, MAIN - BEND], rz: Math.PI / 2, sockets: [[XV, MAIN - BEND, false], [XV + BEND, MAIN, true]] },
  ]
  return (
    <>
      {corners.map(({ c, rz, sockets }) => (
        <group key={c.join()}>
          <mesh position={[c[0], c[1], 0]} rotation={[0, 0, rz]} geometry={g.elbow} material={m.pp} {...SHADE} />
          {sockets.map(([x, y, horizontal]) => (
            <mesh key={`${x},${y}`} position={[x, y, 0]} rotation={horizontal ? X_AXIS : undefined} geometry={g.socket} material={m.pp} {...SHADE} />
          ))}
        </group>
      ))}
      {/* Вертикальные спуски и короткие патрубки к голове фильтра */}
      <Pipe a={[-XV, MAIN - BEND]} b={[-XV, PORT + BEND]} mat={m.pp} />
      <Pipe a={[XV, MAIN - BEND]} b={[XV, PORT + BEND]} mat={m.pp} />
      {/* Магистраль заканчивается чистым срезом с открытым торцом, как на каталожном рендере */}
      <Pipe a={[FOAM_TO, MAIN]} b={[VALVE_IN - 0.3, MAIN]} mat={m.pp} />
      <Pipe a={[METER + 0.34, MAIN]} b={[END_R - STUB_LEN, MAIN]} mat={m.pp} />
      {[VALVE_IN - 0.37, GLASS_FROM - 0.05, GLASS_TO + 0.05, METER + 0.44].map((x) => (
        <mesh key={x} position={[x, MAIN, 0]} rotation={X_AXIS} geometry={g.socket} material={m.pp} {...SHADE} />
      ))}
      <mesh position={[VALVE_IN - 0.43, MAIN, 0]} rotation={[0, 0, Math.PI / 2]} geometry={g.foamSleeve} material={m.foam} {...SHADE} />
      <mesh position={[FOAM_TO + 0.14, MAIN, 0]} rotation={[0, Math.PI / 2, 0]} geometry={g.tie} material={m.pp} />
      {[
        { x: END_L + STUB_LEN, rz: Math.PI / 2, ry: -Math.PI / 2, tip: END_L + 0.09 },
        { x: END_R - STUB_LEN, rz: -Math.PI / 2, ry: Math.PI / 2, tip: END_R - 0.09 },
      ].map((end) => (
        <group key={end.x}>
          <mesh position={[end.x, MAIN, 0]} rotation={[0, 0, end.rz]} geometry={g.stub} material={m.pp} {...SHADE} />
          <mesh position={[end.tip, MAIN, 0]} rotation={[0, end.ry, 0]} geometry={g.bore} material={m.black} />
        </group>
      ))}
    </>
  )
}

const CALM = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

function BallValve({ x, m, g, angle, hinting }: { x: number; m: Materials; g: Geometries; angle?: RefObject<number>; hinting?: boolean }) {
  const lever = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!lever.current || !angle) return
    // До первого нажатия ручка раз в три секунды чуть качнётся: мягкая подсказка, что её можно повернуть.
    const beat = clock.elapsedTime % 3
    const nudge = hinting && !CALM && beat < 0.8 ? Math.sin((beat / 0.8) * Math.PI * 2) * degToRad(7) : 0
    lever.current.rotation.y = angle.current + nudge
  })
  return (
    <group position={[x, MAIN, 0]}>
      <mesh rotation={X_AXIS} geometry={g.valveBody} material={m.brass} {...SHADE} />
      {[-0.2, 0.2].map((s) => (
        <mesh key={s} position={[s, 0, 0]} rotation={X_AXIS} geometry={g.nut} material={m.brass} {...SHADE} />
      ))}
      <mesh geometry={g.stem} material={m.brass} {...SHADE} />
      <group ref={lever} position={[0, 0.272, 0]}>
        <mesh geometry={g.handle} material={m.red} {...SHADE} />
        <mesh position={[0, 0.05, 0]} geometry={g.handleNut} material={m.zinc} />
      </group>
    </group>
  )
}

function Meter({ m, g, flow }: { m: Materials; g: Geometries; flow: RefObject<number> }) {
  const vane = useRef<THREE.Mesh>(null)
  const face = useMemo(dialFace, [])
  useEffect(() => () => face.dispose(), [face])
  useFrame((_, dt) => {
    if (vane.current) vane.current.rotation.z -= flow.current * Math.min(dt, 0.1) * 9
  })
  return (
    <group position={[METER, MAIN, 0]}>
      <mesh rotation={X_AXIS} geometry={g.meterBody} material={m.brass} {...SHADE} />
      {[-0.34, 0.34].map((s) => (
        <mesh key={s} position={[s, 0, 0]} rotation={X_AXIS} geometry={g.nutLong} material={m.brass} {...SHADE} />
      ))}
      {/* Корпус циферблата вынесен вперёд, чтобы проточная часть не проходила сквозь шкалу */}
      <group position={[0, 0, 0.07]}>
        <mesh rotation={Z_AXIS} geometry={g.meterCase} material={m.brass} {...SHADE} />
        <mesh position={[0, 0, 0.1245]} geometry={g.dial}>
          <meshStandardMaterial map={face} roughness={0.5} />
        </mesh>
        <mesh ref={vane} position={[0, -0.075, 0.134]} geometry={g.vane} material={m.vane} />
        <mesh rotation={Z_AXIS} geometry={g.dome} material={m.dome} renderOrder={3} />
      </group>
    </group>
  )
}

function Filter({ m, g }: { m: Materials; g: Geometries }) {
  return (
    <group>
      <mesh geometry={g.bowl} material={m.bowl} {...SHADE} />
      <mesh geometry={g.cap} material={m.black} {...SHADE} />
      <mesh geometry={g.neck} material={m.black} {...SHADE} />
      {/* Голова из двух уступов: корпус и крышка, фаски ловят свет */}
      <RoundedBox args={[0.94, 0.31, 0.62]} radius={0.06} smoothness={5} position={[0, PORT - 0.055, 0]} material={m.head} {...SHADE} />
      <RoundedBox args={[0.82, 0.17, 0.5]} radius={0.05} smoothness={5} position={[0, PORT + 0.125, 0]} material={m.head} {...SHADE} />
      <mesh position={[0, PORT - 0.055, 0.311]} geometry={g.arrow} material={m.head} castShadow />
      <mesh position={[0.26, PORT + 0.208, 0.08]} geometry={g.bleed} material={m.zinc} castShadow />
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 0.55, PORT, 0]} rotation={side < 0 ? [0, 0, Math.PI / 2] : X_AXIS} geometry={g.port} material={m.head} {...SHADE} />
          <mesh position={[side * 0.665, PORT, 0]} rotation={X_AXIS} geometry={g.nut} material={m.brass} {...SHADE} />
        </group>
      ))}
      {/* Кронштейн на стене: пластина выше головы, четыре болта, как на фото мастера */}
      <RoundedBox args={[0.92, 0.82, 0.03]} radius={0.012} smoothness={3} position={[0, 1.13, WALL + 0.018]} material={m.zinc} {...SHADE} />
      <RoundedBox args={[0.44, 0.18, 0.34]} radius={0.016} smoothness={3} position={[0, 0.78, -0.44]} material={m.zinc} {...SHADE} />
      {[
        [-0.34, 1.42],
        [0.34, 1.42],
        [-0.34, 1.14],
        [0.34, 1.14],
      ].map(([x, y]) => (
        <group key={`${x},${y}`} position={[x, y, WALL + 0.033]}>
          <mesh rotation={Z_AXIS} geometry={g.washer} material={m.zinc} castShadow />
          <mesh position={[0, 0, 0.03]} rotation={Z_AXIS} geometry={g.boltHead} material={m.zinc} castShadow />
        </group>
      ))}
    </group>
  )
}

// Смотровой участок: при перекрытии струи замирают, пузырьки всплывают к верхней стенке и останавливаются.
const BUBBLES = 10
const WATER_R = 0.102

function SightGlass({ m, flow }: { m: Materials; flow: RefObject<number> }) {
  const streaks = useMemo(waterStreaks, [])
  useEffect(() => () => streaks.dispose(), [streaks])
  const water = useMemo(
    () => new THREE.MeshStandardMaterial({ map: streaks, roughness: 0.12, transparent: true, opacity: 0.82, depthWrite: false }),
    [streaks],
  )
  useEffect(() => () => water.dispose(), [water])
  const dots = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const travel = useRef(0)
  const len = GLASS_TO - GLASS_FROM
  const seeds = useMemo(
    () =>
      Array.from({ length: BUBBLES }, (_, i) => {
        const a = i * 2.399
        const rr = Math.sqrt((i + 0.5) / BUBBLES) * WATER_R * 0.8
        const y = Math.sin(a) * rr
        const z = Math.cos(a) * rr
        return { o: i / BUBBLES, y, z, speed: 0.75 + ((i * 37) % 10) / 22, size: 0.6 + ((i * 13) % 7) / 5, wob: 1 + (i % 3), rest: Math.sqrt(Math.max(0, WATER_R * WATER_R * 0.8 - z * z)) }
      }),
    [],
  )
  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    const f = flow.current
    travel.current += dt * f * 0.85
    streaks.offset.y -= dt * f * 1.5
    const inst = dots.current
    if (!inst) return
    const t = clock.elapsedTime
    seeds.forEach((b, i) => {
      const u = (b.o + travel.current * b.speed) % 1
      const wob = Math.sin(t * 5 * b.wob + b.o * 40) * 0.008 * f
      const y = b.y + wob + (b.rest - b.y) * smoothstep(1 - f, 0.05, 0.85)
      dummy.position.set(-len / 2 + u * len, y, b.z)
      dummy.scale.setScalar(b.size)
      dummy.updateMatrix()
      inst.setMatrixAt(i, dummy.matrix)
    })
    inst.instanceMatrix.needsUpdate = true
  })
  return (
    <group position={[(GLASS_FROM + GLASS_TO) / 2, MAIN, 0]}>
      <mesh rotation={X_AXIS} material={m.glassBack} renderOrder={0}>
        <cylinderGeometry args={[0.122, 0.122, len, 40, 1, true]} />
      </mesh>
      <mesh rotation={X_AXIS} material={water} renderOrder={1}>
        <cylinderGeometry args={[WATER_R, WATER_R, len, 32, 1, true]} />
      </mesh>
      <instancedMesh ref={dots} args={[undefined, undefined, BUBBLES]} material={m.bubble} renderOrder={2} frustumCulled={false}>
        <sphereGeometry args={[0.011, 10, 8]} />
      </instancedMesh>
      <mesh rotation={X_AXIS} material={m.glassFront} renderOrder={3}>
        <cylinderGeometry args={[0.122, 0.122, len, 40, 1, true]} />
      </mesh>
    </group>
  )
}

type HitProps = { position: [number, number, number]; size: [number, number, number]; onHit: () => void }

// Невидимые зоны нажатия: на телефоне мелкие детали иначе меньше 44 пикселей.
function Hit({ position, size, onHit }: HitProps) {
  return (
    <mesh
      position={position}
      visible={false}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation()
        if (e.delta < 8) onHit()
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = ''
      }}
    >
      <boxGeometry args={size} />
    </mesh>
  )
}

const ANCHORS: Record<string, [number, number, number]> = {
  valve: [VALVE_IN, MAIN - 0.21, 0.12],
  filter: [0, -0.5, 0],
  meter: [METER, MAIN - 0.3, 0.2],
  handle: [VALVE_IN, MAIN + 0.3, 0],
}

function Assembly(props: Pick<Props, 'closed' | 'hinting' | 'onToggle' | 'onPick' | 'drag' | 'overlay'>) {
  const { closed, hinting, onToggle, onPick, drag, overlay } = props
  const m = useMaterials()
  const g = useGeometries()
  const root = useRef<THREE.Group>(null)
  const angle = useRef(0)
  const flow = useRef(1)
  const point = useMemo(() => new THREE.Vector3(), [])
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const last = useRef({ turn: 1e9, angle: 1e9 })
  const marks = useRef<{ el: HTMLElement; a: [number, number, number]; x: string; y: string }[]>([])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    angle.current = damp(angle.current, closed ? Math.PI / 2 : 0, 8, dt)
    // Проток зависит от положения шара и гаснет с инерцией, а не обрывается сразу.
    const opening = Math.cos(angle.current) ** 2
    flow.current = damp(flow.current, opening, closed ? 1.5 : 2.6, dt)
    if (flow.current < 0.002 && closed) flow.current = 0
    const group = root.current
    if (!group) return
    group.rotation.y = damp(group.rotation.y, RESTING_TURN + drag.current, 5, dt)
    // Карта теней пересчитывается, только пока что-то движется: в покое это половина работы кадра.
    if (Math.abs(group.rotation.y - last.current.turn) > 1e-4 || Math.abs(angle.current - last.current.angle) > 1e-4) {
      gl.shadowMap.needsUpdate = true
      last.current = { turn: group.rotation.y, angle: angle.current }
    }
    const host = overlay.current
    if (!host) return
    if (marks.current.length !== host.querySelectorAll('[data-part]').length) {
      marks.current = [...host.querySelectorAll<HTMLElement>('[data-part]')].map((el) => ({ el, a: ANCHORS[el.dataset.part as string], x: '', y: '' }))
    }
    group.updateWorldMatrix(true, false)
    for (const mark of marks.current) {
      point.set(mark.a[0], mark.a[1], mark.a[2]).applyMatrix4(group.matrixWorld).project(camera)
      const x = ((point.x + 1) * 50).toFixed(2)
      const y = ((1 - point.y) * 50).toFixed(2)
      if (x !== mark.x) {
        mark.x = x
        mark.el.style.setProperty('--x', x)
      }
      if (y !== mark.y) {
        mark.y = y
        mark.el.style.setProperty('--y', y)
      }
    }
  })

  return (
    <group ref={root} position={[CENTER_SHIFT, 0, 0]} rotation={[0, RESTING_TURN, 0]}>
      <Fittings m={m} g={g} />
      <BallValve x={VALVE_IN} m={m} g={g} angle={angle} hinting={hinting} />
      <Pipe a={[VALVE_IN + 0.3, MAIN]} b={[GLASS_FROM, MAIN]} mat={m.pp} />
      <SightGlass m={m} flow={flow} />
      <Filter m={m} g={g} />
      <BallValve x={VALVE_OUT} m={m} g={g} />
      <Meter m={m} g={g} flow={flow} />
      <Hit position={[VALVE_IN, MAIN + 0.18, 0]} size={[0.95, 0.85, 0.7]} onHit={onToggle} />
      <Hit position={[0, -0.35, 0.1]} size={[1.36, 2.5, 1.24]} onHit={() => onPick('filter')} />
      <Hit position={[METER, MAIN, 0.1]} size={[0.8, 0.8, 0.6]} onHit={() => onPick('meter')} />
      <WallShadow />
    </group>
  )
}

// Мягкая тень на стене: силуэт узла снимается один раз со стороны стены и размывается.
// ContactShadows из drei работает только в горизонтальной плоскости, поэтому здесь свой проход.
const SHADOW_W = 13
const SHADOW_H = 9.5
const SHADOW_DEPTH = 1.5
const BLUR_STEPS = [0.9, 1.5, 0.9]

function WallShadow() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const cam = useRef<THREE.OrthographicCamera>(null)
  const plane = useRef<THREE.Mesh>(null)
  const done = useRef(false)
  const kit = useMemo(() => {
    const options = { depthBuffer: true, generateMipmaps: false }
    const a = new THREE.WebGLRenderTarget(512, 374, options)
    const b = new THREE.WebGLRenderTarget(512, 374, options)
    const silhouette = new THREE.ShaderMaterial({
      uniforms: { depth: { value: SHADOW_DEPTH }, toWall: { value: new THREE.Matrix4() } },
      vertexShader: `uniform mat4 toWall;
        varying float vD;
        void main() {
          vec4 p = vec4(position, 1.0);
          #ifdef USE_INSTANCING
            p = instanceMatrix * p;
          #endif
          vec4 world = modelMatrix * p;
          vD = (toWall * world).z;
          gl_Position = projectionMatrix * viewMatrix * world;
        }`,
      fragmentShader: `uniform float depth;
        varying float vD;
        void main() {
          float v = 1.0 - clamp(vD / depth, 0.0, 1.0);
          gl_FragColor = vec4(v, v, v, 1.0);
        }`,
    })
    const blur = new THREE.ShaderMaterial({
      uniforms: { map: { value: null }, step: { value: new THREE.Vector2() } },
      depthTest: false,
      depthWrite: false,
      vertexShader: `varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }`,
      fragmentShader: `uniform sampler2D map;
        uniform vec2 step;
        varying vec2 vUv;
        void main() {
          vec4 c = texture2D(map, vUv) * 0.227;
          c += (texture2D(map, vUv + step * 1.385) + texture2D(map, vUv - step * 1.385)) * 0.316;
          c += (texture2D(map, vUv + step * 3.231) + texture2D(map, vUv - step * 3.231)) * 0.07;
          gl_FragColor = c;
        }`,
    })
    const quadScene = new THREE.Scene()
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blur)
    quad.frustumCulled = false
    quadScene.add(quad)
    return { a, b, silhouette, blur, quadScene, quad, quadCam: new THREE.Camera() }
  }, [])
  useEffect(
    () => () => {
      kit.a.dispose()
      kit.b.dispose()
      kit.silhouette.dispose()
      kit.blur.dispose()
      kit.quad.geometry.dispose()
    },
    [kit],
  )
  useFrame(() => {
    if (done.current || !cam.current || !plane.current) return
    done.current = true
    plane.current.visible = false
    plane.current.parent?.updateWorldMatrix(true, false)
    kit.silhouette.uniforms.toWall.value.copy((plane.current.parent as THREE.Object3D).matrixWorld).invert()
    const saved = scene.overrideMaterial
    scene.overrideMaterial = kit.silhouette
    gl.setRenderTarget(kit.a)
    gl.clear()
    gl.render(scene, cam.current)
    scene.overrideMaterial = saved
    let source = kit.a
    let target = kit.b
    BLUR_STEPS.forEach((size) => {
      for (const axis of [0, 1]) {
        kit.blur.uniforms.map.value = source.texture
        kit.blur.uniforms.step.value.set(axis === 0 ? size / 512 : 0, axis === 1 ? size / 374 : 0)
        gl.setRenderTarget(target)
        gl.render(kit.quadScene, kit.quadCam)
        ;[source, target] = [target, source]
      }
    })
    gl.setRenderTarget(null)
    const mat = plane.current.material as THREE.MeshBasicMaterial
    mat.alphaMap = source.texture
    mat.needsUpdate = true
    plane.current.visible = true
  })
  return (
    <group position={[0, 0, WALL]}>
      {/* Камера смотрит от стены и чуть наискось: чем дальше деталь от стены, тем сильнее сдвинута её тень */}
      <orthographicCamera ref={cam} args={[-SHADOW_W / 2, SHADOW_W / 2, SHADOW_H / 2, -SHADOW_H / 2, 0, SHADOW_DEPTH]} rotation={[-0.3, Math.PI + 0.26, 0]} />
      <mesh ref={plane} scale={[-1, 1, 1]} visible={false}>
        <planeGeometry args={[SHADOW_W, SHADOW_H]} />
        <meshBasicMaterial color="#2B2620" transparent opacity={0.3} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

let introPlayed = false

// Если телефон не тянет: сначала снижаем чёткость, потом возвращаемся к постеру. С ?3d=1 сцена не отключается.
const FORCED = typeof location !== 'undefined' && new URLSearchParams(location.search).has('3d')
const SLOW_FPS = 22

function Rig({ onSettled, onReady, onSlow }: { onSettled: () => void; onReady: () => void; onSlow: () => void }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const size = useThree((s) => s.size)
  const setDpr = useThree((s) => s.setDpr)
  const pace = useRef({ frames: 0, time: 0, strikes: 0 })
  const progress = useRef(introPlayed || matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 0)
  const frames = useRef(0)
  const settled = useRef(false)

  useFrame((_, dt) => {
    frames.current++
    if (frames.current === 2) onReady()
    if (frames.current < 2) dt = 0
    if (progress.current < 1) progress.current = Math.min(1, progress.current + Math.min(dt, 0.1) / INTRO_SECONDS)
    if (progress.current === 1 && !settled.current) {
      settled.current = true
      introPlayed = true
      onSettled()
    }
    if (settled.current && !FORCED) {
      const p = pace.current
      if (dt > 0.5) {
        p.frames = 0
        p.time = 0
      } else {
        p.frames++
        p.time += dt
        if (p.time >= 2.5) {
          if (p.frames / p.time < SLOW_FPS) {
            p.strikes++
            if (p.strikes === 1) setDpr(1)
            else onSlow()
          }
          p.frames = 0
          p.time = 0
        }
      }
    }
    const k = (1 - progress.current) ** 3
    const tan = Math.tan(degToRad(camera.fov / 2))
    const fit = Math.max(HALF_H / tan, HALF_W / (tan * (size.width / size.height)))
    const dist = fit * (1 + 0.14 * k)
    const az = 0.22 * k
    const el = degToRad(CAMERA_LIFT) + 0.08 * k
    camera.position.set(Math.sin(az) * Math.cos(el) * dist, CENTER_Y + Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist)
    camera.lookAt(0, CENTER_Y, 0)
  })
  return null
}

// Студия только из световых панелей Lightformer, никаких внешних HDR. Считается один раз и не зависит от состояния крана.
const Studio = memo(function Studio() {
  return (
    <Environment resolution={512} frames={1}>
      <color attach="background" args={['#B9B4AB']} />
      <Lightformer form="rect" intensity={3.2} position={[0, 6, 3]} scale={[12, 5, 1]} />
      <Lightformer form="rect" intensity={3.4} position={[-7, 1.5, 4]} scale={[1.4, 8, 1]} />
      <Lightformer form="rect" intensity={2.2} position={[7, 1, 4]} scale={[1.2, 8, 1]} />
      <Lightformer form="rect" intensity={1.4} position={[0, -5, 4]} scale={[12, 2, 1]} color="#F2E8DC" />
      <Lightformer form="rect" intensity={1.1} position={[0, 1, 9]} scale={[8, 3, 1]} />
      {/* Узкие полосы дают длинные блики на латуни и колбе */}
      <Lightformer form="rect" intensity={7} position={[-4.6, 0.5, 7]} scale={[0.4, 8, 1]} />
      <Lightformer form="rect" intensity={6} position={[4.2, 0.5, 7]} scale={[0.4, 8, 1]} />
      {/* Тёмные карточки дают металлу контрастные отражения */}
      <Lightformer form="rect" intensity={1} color="#101214" position={[-3.2, 0, 6]} scale={[1.4, 9, 1]} />
      <Lightformer form="rect" intensity={1} color="#101214" position={[3.4, 0, 6]} scale={[1.4, 9, 1]} />
    </Environment>
  )
})

type Props = {
  closed: boolean
  hinting: boolean
  onToggle: () => void
  onPick: (id: PartId) => void
  drag: RefObject<number>
  active: boolean
  overlay: RefObject<HTMLDivElement | null>
  onReady: () => void
  onSettled: () => void
  onLost: () => void
}

export default function Valve3D({ closed, hinting, onToggle, onPick, drag, active, overlay, onReady, onSettled, onLost }: Props) {
  return (
    <Canvas
      className="cv"
      frameloop={active ? 'always' : 'never'}
      dpr={[1, 1.75]}
      shadows
      resize={{ scroll: false }}
      camera={{ fov: CAMERA_FOV, near: 0.5, far: 80, position: [0, 1, 14] }}
      gl={{ antialias: true, alpha: true, powerPreference: 'default' }}
      style={{ touchAction: 'pan-y' }}
      aria-hidden="true"
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NeutralToneMapping
        gl.toneMappingExposure = 1
        gl.domElement.style.touchAction = 'pan-y'
        gl.shadowMap.autoUpdate = false
        gl.shadowMap.needsUpdate = true
        gl.domElement.addEventListener('webglcontextlost', onLost)
      }}
    >
      <Rig onSettled={onSettled} onReady={onReady} onSlow={onLost} />
      <directionalLight
        position={[-3.4, 5.2, 6]}
        intensity={1.25}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0003}
        shadow-normalBias={0.018}
        shadow-camera-left={-4.2}
        shadow-camera-right={4.2}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
        shadow-camera-near={1}
        shadow-camera-far={18}
      />
      <Studio />
      <Assembly closed={closed} hinting={hinting} onToggle={onToggle} onPick={onPick} drag={drag} overlay={overlay} />
    </Canvas>
  )
}
