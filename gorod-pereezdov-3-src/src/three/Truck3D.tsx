import { memo, useEffect, useMemo, useRef, type MutableRefObject, type ReactElement, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, RoundedBox } from '@react-three/drei'
import { RoundedBoxGeometry } from 'three-stdlib'
import * as THREE from 'three'
import { img } from '../data'
import type { Placed } from '../pack'

const { damp } = THREE.MathUtils

// Кузов в разрезе: ближняя стенка и крыша сняты, задние двери открыты, видно, как стоят вещи.
// Передняя стенка кузова стоит в x = 0, дальняя в z = 0, пол кузова на высоте DECK. Кузов растёт к дверям и к нам.
const DECK = 0.98
const WALL = 0.06
const R = 0.09
const CAB_L = 1.75

const C = {
  body: '#EEEFEA',
  inner: '#E1E3DE',
  slat: '#9A9E98',
  deck: '#5E4B3A',
  frame: '#2A2F2C',
  cab: '#2B7A3F',
  cabDark: '#22633A',
  glass: '#1C2A2E',
  tyre: '#24282A',
  hub: '#B9BDB8',
  light: '#FFF6DC',
  box: ['#C69B6A', '#BF9161', '#CCA373', '#B98B5C'],
  tape: '#E2C796',
  label: '#F7F4EC',
  wood: '#B88B5F',
  woodDark: '#8E6440',
  white: '#F4F3EF',
  steel: '#8F9693',
  sofa: '#8E9C8F',
  chair: '#A9794E',
  mattress: '#EEE8DC',
  film: '#FFFFFF',
}

type Props = {
  placed: Placed[]
  size: [number, number, number]
  drag: MutableRefObject<number>
  wake: MutableRefObject<(() => void) | null>
  active: boolean
  still: boolean
  onReady: () => void
  onLost: () => void
}

function planks() {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 64
  const g = c.getContext('2d') as CanvasRenderingContext2D
  g.fillStyle = '#fff'
  g.fillRect(0, 0, 256, 64)
  for (let i = 0; i < 4; i++) {
    g.fillStyle = `rgba(120,80,40,${0.04 + (i % 2) * 0.04})`
    g.fillRect(0, i * 16, 256, 16)
    g.fillStyle = 'rgba(80,50,20,0.22)'
    g.fillRect(0, i * 16 + 15, 256, 1)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = 4
  return t
}

function useMats() {
  return useMemo(() => {
    const std = (color: string, roughness = 0.8, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra })
    const deckMap = planks()
    deckMap.repeat.set(3, 6)
    return {
      body: std(C.body, 0.55),
      inner: std(C.inner, 0.9),
      slat: std(C.slat, 0.8),
      deck: std(C.deck, 0.85, { map: deckMap }),
      frame: std(C.frame, 0.6, { metalness: 0.3 }),
      cab: new THREE.MeshPhysicalMaterial({ color: C.cab, roughness: 0.38, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.16 }),
      cabDark: std(C.cabDark, 0.5),
      glass: std(C.glass, 0.1, { metalness: 0.6, side: THREE.DoubleSide }),
      tyre: std(C.tyre, 0.9),
      hub: std(C.hub, 0.35, { metalness: 0.6 }),
      light: std(C.light, 0.3, { emissive: new THREE.Color('#FFE7A8'), emissiveIntensity: 0.25 }),
      boxes: C.box.map((c) => std(c, 0.92)),
      tape: std(C.tape, 0.45),
      label: std(C.label, 0.9),
      wood: std(C.wood, 0.7),
      woodDark: std(C.woodDark, 0.7),
      white: std(C.white, 0.35),
      steel: std(C.steel, 0.4, { metalness: 0.5 }),
      sofa: std(C.sofa, 0.95),
      chair: std(C.chair, 0.7),
      mattress: std(C.mattress, 0.95),
      dark: std('#2B2F2E', 0.5),
      film: new THREE.MeshStandardMaterial({ color: C.film, roughness: 0.12, metalness: 0, transparent: true, opacity: 0.22, depthWrite: false }),
    }
  }, [])
}
type Mats = ReturnType<typeof useMats>

// ——— Вещи ———

function Film({ l, w, h }: { l: number; w: number; h: number }) {
  const m = useContext3D()
  return (
    <mesh material={m.film} position={[0, h / 2, 0]} renderOrder={2}>
      <boxGeometry args={[l + 0.03, h + 0.02, w + 0.03]} />
    </mesh>
  )
}

const BOX_GEO = new RoundedBoxGeometry(0.585, 0.39, 0.385, 2, 0.018)

function Box({ l, w, h, n }: { l: number; w: number; h: number; n: number }) {
  const m = useContext3D()
  const mat = m.boxes[n % m.boxes.length]
  const tag = n % 3 === 0
  return (
    <group>
      <mesh geometry={BOX_GEO} material={mat} position={[0, h / 2, 0]} castShadow receiveShadow />
      <mesh material={m.tape} position={[0, h + 0.002, 0]}>
        <boxGeometry args={[l + 0.004, 0.004, 0.07]} />
      </mesh>
      <mesh material={m.tape} position={[l / 2 + 0.002, h - 0.06, 0]}>
        <boxGeometry args={[0.004, 0.12, 0.07]} />
      </mesh>
      {tag && (
        <mesh material={m.label} position={[0, h * 0.55, w / 2 + 0.002]}>
          <boxGeometry args={[0.16, 0.1, 0.004]} />
        </mesh>
      )}
    </group>
  )
}

function Sofa({ l, w, h }: { l: number; w: number; h: number }) {
  const m = useContext3D()
  const arm = 0.18
  return (
    <group>
      <mesh material={m.sofa} position={[0, 0.22, 0.05]} castShadow receiveShadow>
        <boxGeometry args={[l - 0.02, 0.4, w - 0.1]} />
      </mesh>
      <RoundedBox args={[l - 2 * arm, 0.14, w - 0.34]} radius={0.05} position={[0, 0.48, 0.1]} material={m.sofa} castShadow />
      <RoundedBox args={[l - 0.02, h - 0.02, 0.24]} radius={0.06} position={[0, (h - 0.02) / 2, -w / 2 + 0.12]} material={m.sofa} castShadow />
      {[-1, 1].map((s) => (
        <RoundedBox key={s} args={[arm, 0.62, w - 0.02]} radius={0.05} position={[s * (l / 2 - arm / 2), 0.31, 0]} material={m.sofa} castShadow />
      ))}
      <Film l={l} w={w} h={h} />
    </group>
  )
}

function Armchair({ l, w, h }: { l: number; w: number; h: number }) {
  return <Sofa l={l} w={w} h={h} />
}

function Mattress({ l, w, h }: { l: number; w: number; h: number }) {
  const m = useContext3D()
  return (
    <group>
      <RoundedBox args={[l - 0.04, h - 0.02, w - 0.06]} radius={0.08} position={[0, h / 2, 0]} material={m.mattress} castShadow receiveShadow />
      <Film l={l} w={w} h={h} />
    </group>
  )
}

function Wardrobe({ l, w, h }: { l: number; w: number; h: number }) {
  const m = useContext3D()
  return (
    <group>
      <mesh material={m.wood} position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[l - 0.02, h - 0.01, w - 0.02]} />
      </mesh>
      <mesh material={m.woodDark} position={[0, h / 2, w / 2 - 0.005]}>
        <boxGeometry args={[0.012, h - 0.12, 0.02]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} material={m.steel} position={[s * 0.06, h * 0.52, w / 2]}>
          <boxGeometry args={[0.018, 0.22, 0.03]} />
        </mesh>
      ))}
      <Film l={l} w={w} h={h} />
    </group>
  )
}

function Fridge({ l, w, h }: { l: number; w: number; h: number }) {
  const m = useContext3D()
  return (
    <group>
      <RoundedBox args={[l - 0.02, h - 0.01, w - 0.02]} radius={0.04} position={[0, h / 2, 0]} material={m.white} castShadow receiveShadow />
      <mesh material={m.steel} position={[0, h * 0.64, w / 2 - 0.005]}>
        <boxGeometry args={[l - 0.06, 0.008, 0.012]} />
      </mesh>
      <mesh material={m.steel} position={[l / 2 - 0.08, h * 0.8, w / 2 + 0.005]}>
        <boxGeometry args={[0.02, 0.3, 0.03]} />
      </mesh>
      <mesh material={m.steel} position={[l / 2 - 0.08, h * 0.45, w / 2 + 0.005]}>
        <boxGeometry args={[0.02, 0.24, 0.03]} />
      </mesh>
    </group>
  )
}

function Washer({ l, w, h }: { l: number; w: number; h: number }) {
  const m = useContext3D()
  return (
    <group>
      <RoundedBox args={[l - 0.02, h - 0.01, w - 0.02]} radius={0.03} position={[0, h / 2, 0]} material={m.white} castShadow receiveShadow />
      <mesh material={m.steel} position={[0, h * 0.45, w / 2 - 0.005]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.03, 28]} />
      </mesh>
      <mesh material={m.glass} position={[0, h * 0.45, w / 2 + 0.006]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.02, 28]} />
      </mesh>
      <mesh material={m.dark} position={[0, h - 0.07, w / 2 - 0.005]}>
        <boxGeometry args={[l - 0.1, 0.06, 0.02]} />
      </mesh>
    </group>
  )
}

function Dresser({ l, w, h }: { l: number; w: number; h: number }) {
  const m = useContext3D()
  return (
    <group>
      <mesh material={m.wood} position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[l - 0.02, h - 0.01, w - 0.02]} />
      </mesh>
      {[0.25, 0.5, 0.75].map((k) => (
        <mesh key={k} material={m.woodDark} position={[0, h * k, w / 2 - 0.005]}>
          <boxGeometry args={[l - 0.08, 0.012, 0.02]} />
        </mesh>
      ))}
      <Film l={l} w={w} h={h} />
    </group>
  )
}

function Table({ l, w, h, desk }: { l: number; w: number; h: number; desk?: boolean }) {
  const m = useContext3D()
  const t = 0.04
  const legs: [number, number][] = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]
  return (
    <group>
      <mesh material={desk ? m.white : m.wood} position={[0, h - t / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[l - 0.02, t, w - 0.02]} />
      </mesh>
      {desk
        ? [-1, 1].map((s) => (
            <mesh key={s} material={m.white} position={[s * (l / 2 - 0.03), (h - t) / 2, 0]} castShadow>
              <boxGeometry args={[0.03, h - t, w - 0.06]} />
            </mesh>
          ))
        : legs.map(([a, b]) => (
            <mesh key={`${a}${b}`} material={m.woodDark} position={[a * (l / 2 - 0.07), (h - t) / 2, b * (w / 2 - 0.07)]} castShadow>
              <boxGeometry args={[0.05, h - t, 0.05]} />
            </mesh>
          ))}
    </group>
  )
}

function Chair({ l, w, h }: { l: number; w: number; h: number }) {
  const m = useContext3D()
  const seat = 0.46
  return (
    <group>
      <mesh material={m.chair} position={[0, seat, 0]} castShadow>
        <boxGeometry args={[l - 0.04, 0.04, w - 0.04]} />
      </mesh>
      <mesh material={m.chair} position={[0, (seat + h) / 2 + 0.02, -w / 2 + 0.04]} castShadow>
        <boxGeometry args={[l - 0.04, h - seat - 0.04, 0.03]} />
      </mesh>
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([a, b]) => (
        <mesh key={`${a}${b}`} material={m.woodDark} position={[a * (l / 2 - 0.05), seat / 2, b * (w / 2 - 0.05)]}>
          <boxGeometry args={[0.03, seat, 0.03]} />
        </mesh>
      ))}
    </group>
  )
}

function Tv({ l, w, h, n }: { l: number; w: number; h: number; n: number }) {
  const m = useContext3D()
  return (
    <group>
      <mesh material={m.boxes[(n + 1) % m.boxes.length]} position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[l - 0.02, h - 0.01, w - 0.02]} />
      </mesh>
      <mesh material={m.dark} position={[0, h / 2, w / 2 - 0.005]}>
        <boxGeometry args={[l * 0.62, h * 0.48, 0.012]} />
      </mesh>
    </group>
  )
}

const MODELS = {
  box: Box,
  sofa: Sofa,
  armchair: Armchair,
  bed: Mattress,
  wardrobe: Wardrobe,
  fridge: Fridge,
  washer: Washer,
  dresser: Dresser,
  table: Table,
  desk: (p: { l: number; w: number; h: number }) => <Table {...p} desk />,
  chair: Chair,
  tv: Tv,
} as const

// Глобальные материалы без контекста React: сцена одна, так проще и быстрее.
let MATS: Mats | null = null
const useContext3D = () => MATS as Mats

const DIMS: Record<string, [number, number, number]> = {
  box: [0.6, 0.4, 0.4],
  sofa: [2.0, 0.92, 0.86],
  bed: [2.0, 0.3, 1.6],
  wardrobe: [1.0, 0.6, 2.0],
  fridge: [0.62, 0.66, 1.8],
  washer: [0.6, 0.6, 0.85],
  dresser: [0.9, 0.48, 0.86],
  armchair: [0.86, 0.86, 0.9],
  table: [1.2, 0.8, 0.76],
  desk: [1.1, 0.6, 0.76],
  chair: [0.45, 0.45, 0.9],
  tv: [1.15, 0.16, 0.72],
}

const Thing = memo(function Thing({ p, order, still }: { p: Placed; order: number; still: boolean }) {
  const ref = useRef<THREE.Group>(null)
  const born = useRef<number | null>(null)
  const [dl, dw] = DIMS[p.id]
  // Если вещь развёрнута поперёк, рисуем её повёрнутой на 90°.
  const turned = Math.abs(p.l - Math.ceil(dw * 10 - 1e-6) / 10) < 0.01 && Math.abs(dl - dw) > 0.01
  const l = turned ? dw : dl
  const w = turned ? dl : dw
  const Model = MODELS[p.id] as (q: { l: number; w: number; h: number; n: number }) => ReactElement

  useFrame((state, dt) => {
    const g = ref.current
    if (!g) return
    const t = state.clock.elapsedTime
    if (born.current === null) {
      born.current = t + (still ? 0 : order * 0.022)
      g.position.set(p.x, DECK + p.y + (still ? 0 : 2.4), p.z)
      g.visible = still
    }
    if (t < born.current) {
      state.invalidate()
      return
    }
    g.visible = true
    const y = DECK + p.y
    if (still) {
      g.position.set(p.x, y, p.z)
      return
    }
    const off = Math.abs(g.position.x - p.x) + Math.abs(g.position.z - p.z) + Math.abs(g.position.y - y)
    if (off < 0.0005) return
    g.position.x = damp(g.position.x, p.x, 9, dt)
    g.position.z = damp(g.position.z, p.z, 9, dt)
    g.position.y = damp(g.position.y, y, 11, dt)
    state.invalidate()
  })

  return (
    <group ref={ref} rotation={[0, turned ? Math.PI / 2 : 0, 0]}>
      <Model l={l} w={w} h={p.h} n={p.n} />
    </group>
  )
})

// ——— Машина ———

function Wheel({ x, z, m }: { x: number; z: number; m: Mats }) {
  return (
    <group position={[x, 0.42, z]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh material={m.tyre} castShadow>
        <cylinderGeometry args={[0.42, 0.42, 0.3, 32]} />
      </mesh>
      <mesh material={m.hub} position={[0, 0.152, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.01, 24]} />
      </mesh>
      <mesh material={m.hub} position={[0, -0.152, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.01, 24]} />
      </mesh>
    </group>
  )
}

function useMark() {
  return useMemo(() => {
    const t = new THREE.TextureLoader().load(img('mark-white.png'))
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    return t
  }, [])
}

function TruckBody({ size, m }: { size: [number, number, number]; m: Mats }) {
  const cur = useRef<[number, number, number]>([...size])
  const g = {
    deck: useRef<THREE.Mesh>(null),
    front: useRef<THREE.Mesh>(null),
    far: useRef<THREE.Mesh>(null),
    farOut: useRef<THREE.Mesh>(null),
    slats: useRef<THREE.Group>(null),
    rails: useRef<THREE.Group>(null),
    doors: useRef<THREE.Group>(null),
    chassis: useRef<THREE.Mesh>(null),
    rear: useRef<THREE.Group>(null),
    cab: useRef<THREE.Group>(null),
    bumper: useRef<THREE.Mesh>(null),
  }
  const mark = useMark()

  useFrame((state, dt) => {
    const c = cur.current
    let moving = false
    for (let i = 0; i < 3; i++) {
      c[i] = damp(c[i], size[i], 7, dt)
      if (Math.abs(c[i] - size[i]) > 0.0005) moving = true
    }
    if (moving) state.invalidate()
    const [L, W, H] = c
    const deck = g.deck.current
    if (deck) {
      deck.scale.set(L + WALL * 2, 1, W + WALL * 2)
      deck.position.set(L / 2, DECK - 0.05, W / 2)
    }
    if (g.front.current) {
      g.front.current.scale.set(WALL, H + 0.1, W + WALL * 2)
      g.front.current.position.set(-WALL / 2, DECK + (H + 0.1) / 2 - 0.1, W / 2)
    }
    if (g.far.current) {
      g.far.current.scale.set(L + WALL * 2, H + 0.1, WALL)
      g.far.current.position.set(L / 2, DECK + (H + 0.1) / 2 - 0.1, -WALL / 2)
    }
    if (g.slats.current) {
      g.slats.current.scale.set(L, 1, 1)
      g.slats.current.position.set(L / 2, DECK, 0.012)
    }
    if (g.rails.current) {
      const r = g.rails.current.children as THREE.Mesh[]
      // Верхний брус по дальней стенке, поперечина над кабиной, стойка у дверей и нижний брус с нашей стороны.
      r[0].scale.set(L + WALL * 2, R, R)
      r[0].position.set(L / 2, DECK + H + 0.03, -WALL / 2)
      r[1].scale.set(R, R, W + WALL * 2)
      r[1].position.set(-WALL / 2, DECK + H + 0.03, W / 2)
      r[2].scale.set(R, R, W + WALL * 2)
      r[2].position.set(L + WALL / 2, DECK + H + 0.03, W / 2)
      r[3].scale.set(R, H + 0.06, R)
      r[3].position.set(L + WALL / 2, DECK + H / 2, -WALL / 2)
      r[4].scale.set(R, H + 0.06, R)
      r[4].position.set(L + WALL / 2, DECK + H / 2, W + WALL / 2)
      r[5].scale.set(L + WALL * 2, R, R)
      r[5].position.set(L / 2, DECK + 0.02, W + WALL / 2)
      r[6].scale.set(R, H + 0.06, R)
      r[6].position.set(-WALL / 2, DECK + H / 2, W + WALL / 2)
    }
    if (g.doors.current) {
      const d = g.doors.current.children as THREE.Group[]
      d[0].position.set(L + WALL, DECK - 0.02, -WALL - 0.06)
      d[0].scale.set(1, H + 0.04, W / 2 + WALL)
    }
    if (g.chassis.current) {
      g.chassis.current.scale.set(L + CAB_L + 0.4, 0.22, W * 0.62)
      g.chassis.current.position.set((L - CAB_L) / 2 - 0.1, 0.72, W / 2)
    }
    if (g.rear.current) {
      g.rear.current.position.set(L * 0.72, 0, W / 2)
      const k = g.rear.current.children as THREE.Object3D[]
      k[0].position.z = -W / 2 + 0.12
      k[1].position.z = W / 2 - 0.12
    }
    if (g.cab.current) g.cab.current.position.set(-CAB_L / 2 - 0.12, 0, W / 2)
    if (g.bumper.current) {
      g.bumper.current.scale.set(0.14, 0.16, W * 0.96)
      g.bumper.current.position.set(L + 0.12, 0.88, W / 2)
    }
  })

  const unit = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  const doorGeo = useMemo(() => {
    const geo = new THREE.BoxGeometry(0.05, 1, 1)
    geo.translate(0, 0.5, 0.5)
    return geo
  }, [])

  return (
    <group>
      <mesh ref={g.deck} material={m.deck} scale={[0.1, 1, 0.1]} receiveShadow>
        <boxGeometry args={[1, 0.1, 1]} />
      </mesh>
      <mesh ref={g.front} geometry={unit} material={m.inner} scale={[WALL, 1, 1]} receiveShadow castShadow />
      <mesh ref={g.far} geometry={unit} material={m.inner} receiveShadow castShadow scale={[1, 1, WALL]} />
      <group ref={g.slats}>
        {[0.55, 1.15, 1.7].map((y) => (
          <mesh key={y} geometry={unit} material={m.slat} position={[0, y, 0]} scale={[1, 0.09, 0.02]} receiveShadow />
        ))}
      </group>
      <group ref={g.rails}>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <mesh key={i} geometry={unit} material={m.body} scale={[0.09, 0.09, 0.09]} castShadow />
        ))}
      </group>
      {/* Распахнутые задние двери */}
      <group ref={g.doors}>
        <group rotation={[0, Math.PI * 1.5, 0]}>
          <mesh geometry={doorGeo} material={m.body} castShadow />
        </group>
      </group>
      <mesh ref={g.chassis} geometry={unit} material={m.frame} scale={[1, 0.22, 1]} castShadow />
      <mesh ref={g.bumper} geometry={unit} material={m.frame} scale={[0.14, 0.16, 1]} />
      <group ref={g.rear}>
        <Wheel x={0} z={0} m={m} />
        <Wheel x={0} z={0} m={m} />
      </group>
      <Cab m={m} mark={mark} cw={Math.max(1.95, size[1] - 0.05)} top={DECK + size[2] - 0.06} groupRef={g.cab} />
    </group>
  )
}

function Cab({ m, mark, cw, top, groupRef }: { m: Mats; mark: THREE.Texture; cw: number; top: number; groupRef: RefObject<THREE.Group | null> }) {
  const f = -CAB_L / 2
  const b = CAB_L / 2
  const depth = cw - 0.1
  const geo = useMemo(() => {
    // Профиль кабины сбоку: наклонное лобовое стекло, скруглённый край крыши, короткий капот.
    const sh = new THREE.Shape()
    sh.moveTo(b, 0.6)
    sh.lineTo(b, 2.3)
    sh.lineTo(f + 0.5, 2.3)
    sh.quadraticCurveTo(f + 0.38, 2.3, f + 0.34, 2.18)
    sh.lineTo(f + 0.06, 1.42)
    sh.quadraticCurveTo(f + 0.02, 1.34, f, 1.28)
    sh.lineTo(f, 0.6)
    sh.closePath()
    const body = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3, curveSegments: 8 })
    body.translate(0, 0, -depth / 2)
    const w = new THREE.Shape()
    w.moveTo(f + 0.23, 1.62)
    w.lineTo(b - 0.62, 1.62)
    w.lineTo(b - 0.62, 2.13)
    w.lineTo(f + 0.41, 2.13)
    w.closePath()
    const side = new THREE.ShapeGeometry(w)
    // Обтекатель над кабиной до верха кузова.
    const fr = new THREE.Shape()
    fr.moveTo(f + 0.5, 2.3)
    fr.lineTo(b + 0.1, 2.3)
    fr.lineTo(b + 0.1, top)
    fr.lineTo(b - 0.3, top)
    fr.closePath()
    const fair = new THREE.ExtrudeGeometry(fr, { depth: depth - 0.06, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2 })
    fair.translate(0, 0, -(depth - 0.06) / 2)
    return { body, side, fair }
  }, [cw, top])
  const tilt = -Math.atan2(0.28, 0.76)
  return (
    <group ref={groupRef}>
      <mesh geometry={geo.body} material={m.cab} castShadow receiveShadow />
      <mesh geometry={geo.fair} material={m.cab} castShadow />
      <mesh material={m.glass} position={[f + 0.17, 1.8, 0]} rotation={[0, 0, tilt]}>
        <boxGeometry args={[0.03, 0.74, depth - 0.12]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={geo.side} material={m.glass} position={[0, 0, s * (depth / 2 + 0.053)]} />
      ))}
      {/* Знак компании на двери */}
      <mesh position={[0.18, 1.2, depth / 2 + 0.056]}>
        <planeGeometry args={[0.56, 0.34]} />
        <meshBasicMaterial map={mark} transparent toneMapped={false} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} material={m.light} position={[f - 0.04, 0.98, s * (depth / 2 - 0.16)]}>
          <boxGeometry args={[0.04, 0.13, 0.32]} />
        </mesh>
      ))}
      <mesh material={m.cabDark} position={[f - 0.035, 1.02, 0]}>
        <boxGeometry args={[0.03, 0.22, depth * 0.42]} />
      </mesh>
      <mesh material={m.frame} position={[f - 0.08, 0.66, 0]}>
        <boxGeometry args={[0.16, 0.22, cw + 0.04]} />
      </mesh>
      <Wheel x={-0.12} z={-cw / 2 + 0.14} m={m} />
      <Wheel x={-0.12} z={cw / 2 - 0.14} m={m} />
      {[-1, 1].map((s) => (
        <mesh key={s} material={m.frame} position={[f + 0.18, 1.95, s * (cw / 2 + 0.13)]}>
          <boxGeometry args={[0.05, 0.28, 0.1]} />
        </mesh>
      ))}
    </group>
  )
}

// ——— Камера ———

function Rig({ size, drag, still }: { size: [number, number, number]; drag: MutableRefObject<number>; still: boolean }) {
  const { camera, size: view } = useThree()
  const v = useMemo(
    () => ({ look: new THREE.Vector3(), fwd: new THREE.Vector3(), right: new THREE.Vector3(), up: new THREE.Vector3(), p: new THREE.Vector3(), Y: new THREE.Vector3(0, 1, 0) }),
    [],
  )
  const az = useRef(0)
  const fit = useRef(0)
  const cur = useRef<[number, number, number]>([...size])
  useFrame((state, dt) => {
    const c = cur.current
    for (let i = 0; i < 3; i++) c[i] = still ? size[i] : damp(c[i], size[i], 7, dt)
    const [L, W, H] = c
    const aspect = view.width / Math.max(1, view.height)
    const prevAz = az.current
    az.current = still ? drag.current : damp(az.current, drag.current, 5, dt)
    // На узком экране смотрим сильнее со стороны дверей и сверху: машина короче в кадре, кузов виден глубже.
    const narrow = aspect < 1.25
    const base = narrow ? 0.6 : 0.34
    const a = base + az.current
    const el = narrow ? 0.6 : 0.48
    const x0 = -CAB_L - 0.35
    const x1 = L + 0.3
    const top = DECK + H + 0.1
    v.look.set((x0 + x1) / 2, top * 0.46, W / 2)
    // Расстояние считаем для исходного ракурса, чтобы при повороте пальцем машина не отъезжала.
    v.fwd.set(-Math.sin(base) * Math.cos(el), -Math.sin(el), -Math.cos(base) * Math.cos(el)).normalize()
    v.right.crossVectors(v.fwd, v.Y).normalize()
    v.up.crossVectors(v.right, v.fwd).normalize()
    // Отходим ровно настолько, чтобы все углы машины попали в кадр с запасом.
    const tanV = Math.tan(THREE.MathUtils.degToRad(12))
    const tanH = tanV * aspect
    const m = 0.95
    let need = 0
    for (const x of [x0, x1])
      for (const y of [0, top])
        for (const z of [-0.05, W + 0.05]) {
          v.p.set(x, y, z).sub(v.look)
          const f = v.p.dot(v.fwd)
          need = Math.max(need, Math.abs(v.p.dot(v.right)) / (tanH * m) - f, Math.abs(v.p.dot(v.up)) / (tanV * m) - f)
        }
    const prevFit = fit.current
    fit.current = still || !fit.current ? need : damp(fit.current, need, 4, dt)
    if (Math.abs(prevAz - az.current) > 0.0003 || Math.abs(prevFit - fit.current) > 0.002) state.invalidate()
    const d = fit.current
    v.fwd.set(-Math.sin(a) * Math.cos(el), -Math.sin(el), -Math.cos(a) * Math.cos(el)).normalize()
    camera.position.copy(v.look).addScaledVector(v.fwd, -d)
    camera.lookAt(v.look)
  })
  return null
}

function Scene({ placed, size, drag, wake, still, onReady, soft }: Omit<Props, 'active' | 'onLost'> & { soft: boolean }) {
  const m = useMats()
  MATS = m
  const done = useRef(false)
  const invalidate = useThree((st) => st.invalidate)
  useEffect(() => {
    wake.current = () => invalidate()
    return () => void (wake.current = null)
  }, [invalidate, wake])
  useFrame(() => {
    if (!done.current) {
      done.current = true
      requestAnimationFrame(() => onReady())
    }
  })
  return (
    <>
      <hemisphereLight args={['#FFFFFF', '#B9B4A6', 0.55]} />
      <directionalLight
        position={[-4, 9, 7]}
        intensity={2.3}
        color="#FFF3E0"
        castShadow={soft}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-6}
        shadow-camera-right={9}
        shadow-camera-top={6}
        shadow-camera-bottom={-4}
        shadow-camera-near={1}
        shadow-camera-far={30}
      />
      <Environment resolution={64} frames={1}>
        <Lightformer intensity={0.8} color="#FFFFFF" position={[0, 6, 6]} scale={[12, 4, 1]} />
        <Lightformer intensity={2} color="#FFFFFF" position={[0, 3, -6]} scale={[10, 0.6, 1]} />
        <Lightformer intensity={1.4} color="#FFFFFF" position={[-2, 3.2, 7]} scale={[10, 0.5, 1]} />
        <Lightformer intensity={0.5} color="#FFE2B8" position={[-6, 2, -4]} scale={[4, 4, 1]} />
      </Environment>
      <TruckBody size={size} m={m} />
      {placed.map((p, i) => (
        <Thing key={p.key} p={p} order={i} still={still} />
      ))}
      <ContactShadows position={[size[0] / 2 - 0.6, 0.001, size[1] / 2]} scale={[size[0] + CAB_L + 4, size[1] + 3]} opacity={0.6} blur={2} far={1.2} resolution={256} color="#2E2A22" />
      <Rig size={size} drag={drag} still={still} />
    </>
  )
}

export default function Truck3D({ active, onLost, ...rest }: Props) {
  useEffect(() => () => void (MATS = null), [])
  // На телефоне без теней от солнца и с меньшим разрешением: так кузов не греет телефон.
  const soft = useMemo(() => typeof window === 'undefined' || window.innerWidth >= 700, [])
  return (
    <Canvas
      className="cv"
      frameloop={active ? 'demand' : 'never'}
      dpr={soft ? [1, 1.75] : [1, 1.5]}
      shadows={soft}
      resize={{ scroll: false }}
      camera={{ fov: 24, near: 0.3, far: 160, position: [6, 6, 12] }}
      gl={{ antialias: true, alpha: true, powerPreference: 'default' }}
      style={{ touchAction: 'pan-y' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.08
        gl.shadowMap.type = THREE.PCFSoftShadowMap
        gl.domElement.style.touchAction = 'pan-y'
        gl.domElement.addEventListener('webglcontextlost', onLost)
      }}
    >
      <Scene {...rest} soft={soft} />
    </Canvas>
  )
}
