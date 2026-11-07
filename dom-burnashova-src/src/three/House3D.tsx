import { createContext, memo, useContext, useEffect, useMemo, useRef, type RefObject } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Environment, Html, Lightformer, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { COMMON, HOUSE, ZONES, type Furniture, type Zone, type ZoneId } from '../data'

const { damp, degToRad } = THREE.MathUtils

export type View = 'outside' | 0 | 1

// Дом по фото хозяев: два этажа из бруса цвета мёда, тёмная металлическая крыша с фронтоном,
// гирлянды по карнизам, гараж слева, тёплая терраса и мангальная зона справа.
const W = HOUSE.w
const D = HOUSE.d
const FH = HOUSE.floorH
const BASE_H = 0.35
const SLAB = 0.22
const WALL_T = 0.22
const CUT = 0.95
const ROOF_H = 2.6
const OVER = 0.5

const C = {
  wood: '#C9894A',
  woodDark: '#A86C35',
  trim: '#6E4223',
  roof: '#2E3846',
  snow: '#F3F6FA',
  ground: '#E4EAF1',
  base: '#8E8A84',
  floor: '#C59C70',
  floorPick: '#F2B45E',
  wallIn: '#F1ECE3',
  clay: '#EDE7DD',
  furn: '#B98C60',
  white: '#F4F1EA',
  blue: '#2D4C8C',
  violet: '#7B3E7A',
  cream: '#EADFC6',
  glass: '#FFC981',
  bulb: '#FFD08A',
  fence: '#6B3F22',
  spruce: '#2C3E36',
}

const wx = (x: number) => x - W / 2
const wz = (z: number) => D / 2 - z
const floorY = (f: number) => BASE_H + f * FH

type Anim = { inside: number; open: number; lift: number }
type Mats = ReturnType<typeof useMats>

function planks(lines: number, dark = 0.32) {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 256
  const g = c.getContext('2d') as CanvasRenderingContext2D
  g.fillStyle = '#fff'
  g.fillRect(0, 0, 64, 256)
  const step = 256 / lines
  for (let i = 0; i < lines; i++) {
    const y = i * step
    const grad = g.createLinearGradient(0, y, 0, y + step)
    grad.addColorStop(0, 'rgba(255,255,255,0.12)')
    grad.addColorStop(0.85, 'rgba(0,0,0,0.06)')
    grad.addColorStop(1, `rgba(0,0,0,${dark})`)
    g.fillStyle = grad
    g.fillRect(0, y, 64, step)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = 4
  return t
}

function useMats() {
  return useMemo(() => {
    const std = (color: string, roughness = 0.85, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
      new THREE.MeshStandardMaterial({ color, roughness, ...extra })
    const beam = planks(15)
    const slat = planks(7, 0.6)
    return {
      wood: std(C.wood, 0.75, { map: beam }),
      woodSide: std(C.woodDark, 0.8, { map: beam }),
      trim: std(C.trim, 0.7),
      roof: std(C.roof, 0.55, { metalness: 0.2 }),
      snow: std(C.snow, 0.95),
      ground: std(C.ground, 1),
      base: std(C.base, 0.95),
      slab: std('#D9D2C6', 0.9),
      wallIn: std(C.wallIn, 0.9),
      clay: std(C.clay, 0.75),
      furn: std(C.furn, 0.6),
      white: std(C.white, 0.35),
      blue: std(C.blue, 0.9),
      violet: std(C.violet, 0.9),
      cream: std(C.cream, 0.5),
      dark: std('#26292D', 0.5),
      metal: std('#B9BEC3', 0.35, { metalness: 0.6 }),
      fence: std(C.fence, 0.8, { map: slat }),
      fencePlain: std(C.fence, 0.85),
      brick: std('#9A4E3A', 0.9),
      spruce: std(C.spruce, 0.95),
      trunk: std('#4A3A2E', 0.95),
      door: std('#4A2D1A', 0.6),
      garageDoor: std('#7F868E', 0.5, { map: planks(22, 0.35) }),
      wicker: std('#9C6A3A', 0.9),
      car: std('#7E8A96', 0.35, { metalness: 0.4 }),
      carGlass: std('#1E2A36', 0.15),
      glass: new THREE.MeshStandardMaterial({ color: C.glass, emissive: C.glass, emissiveIntensity: 1.5, roughness: 0.4, transparent: true }),
      glassDim: new THREE.MeshStandardMaterial({ color: '#C98F55', emissive: '#C98F55', emissiveIntensity: 0.5, roughness: 0.4, transparent: true }),
      pane: new THREE.MeshStandardMaterial({ color: '#FFE2B5', emissive: '#FFC27A', emissiveIntensity: 0.9, transparent: true, opacity: 0.55, roughness: 0.2 }),
      bulb: new THREE.MeshBasicMaterial({ color: C.bulb, toneMapped: false }),
      lamp: new THREE.MeshStandardMaterial({ color: '#FFD9A0', emissive: '#FFC27A', emissiveIntensity: 3 }),
      fire: new THREE.MeshBasicMaterial({ color: '#FF8A2A', toneMapped: false }),
    }
  }, [])
}

const SH = { castShadow: true, receiveShadow: true }

// ---------- Гирлянда: тёплые лампочки по линиям и короткие «сосульки» ----------

type Seg = [THREE.Vector3, THREE.Vector3]
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

function Garland({ segs, m, icicles = true }: { segs: Seg[]; m: Mats; icicles?: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const pts = useMemo(() => {
    const out: THREE.Vector3[] = []
    for (const [a, b] of segs) {
      const n = Math.max(2, Math.round(a.distanceTo(b) / 0.16))
      const flat = Math.abs(a.y - b.y) < 0.05
      for (let i = 0; i <= n; i++) {
        const p = a.clone().lerp(b, i / n)
        out.push(p)
        if (icicles && flat && i % 2 === 0) {
          const len = 1 + ((i * 7) % 4)
          for (let k = 1; k <= len; k++) out.push(p.clone().add(v(0, -0.11 * k, 0)))
        }
      }
    }
    return out
  }, [segs, icicles])
  useEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const o = new THREE.Object3D()
    pts.forEach((p, i) => {
      o.position.copy(p)
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [pts])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, pts.length]} material={m.bulb} frustumCulled={false}>
      <sphereGeometry args={[0.035, 6, 6]} />
    </instancedMesh>
  )
}

// ---------- Мебель ----------

function Bed({ x, z, w, m, color }: { x: number; z: number; w: number; m: Mats; color: THREE.Material }) {
  return (
    <group position={[x, 0, z]}>
      <mesh {...SH} position={[0, 0.16, 0]} material={m.furn}>
        <boxGeometry args={[w + 0.08, 0.3, 2.06]} />
      </mesh>
      <mesh {...SH} position={[0, 0.45, -1.02]} material={m.furn}>
        <boxGeometry args={[w + 0.08, 0.9, 0.08]} />
      </mesh>
      <RoundedBox {...SH} args={[w, 0.22, 1.96]} radius={0.06} position={[0, 0.41, 0.02]} material={m.clay} />
      <RoundedBox {...SH} args={[w + 0.04, 0.08, 1.25]} radius={0.035} position={[0, 0.54, 0.38]} material={color} />
      {(w > 1.2 ? [-w / 4, w / 4] : [0]).map((px) => (
        <RoundedBox key={px} {...SH} args={[w > 1.2 ? w / 2 - 0.12 : w - 0.16, 0.12, 0.38]} radius={0.05} position={[px, 0.58, -0.72]} material={m.clay} />
      ))}
    </group>
  )
}

function Chair({ x, z, rot, mat }: { x: number; z: number; rot: number; mat: THREE.Material }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <RoundedBox castShadow args={[0.46, 0.12, 0.46]} radius={0.05} position={[0, 0.46, 0]} material={mat} />
      <RoundedBox castShadow args={[0.46, 0.55, 0.1]} radius={0.05} position={[0, 0.78, -0.2]} material={mat} />
    </group>
  )
}

function Furn({ kind, w, d, m }: { kind: Furniture; w: number; d: number; m: Mats }) {
  const back = -d + 0.14
  switch (kind) {
    case 'longtable': {
      // Длинный белый стол на всю гостиную и синие с фиолетовыми стулья, как на фото.
      const L = Math.min(4.6, w - 1.4)
      const cx = w / 2 + 0.3
      const cz = -d / 2 - 0.2
      const n = 6
      return (
        <group>
          <mesh {...SH} position={[cx, 0.76, cz]} material={m.white}>
            <boxGeometry args={[L, 0.06, 1.0]} />
          </mesh>
          {[-L / 2 + 0.2, L / 2 - 0.2].map((px) => (
            <mesh key={px} castShadow position={[cx + px, 0.37, cz]} material={m.dark}>
              <boxGeometry args={[0.06, 0.74, 0.8]} />
            </mesh>
          ))}
          {Array.from({ length: n }, (_, i) => {
            const px = cx - L / 2 + 0.4 + (i * (L - 0.8)) / (n - 1)
            return [
              <Chair key={'a' + i} x={px} z={cz + 0.78} rot={Math.PI} mat={i % 2 ? m.violet : m.blue} />,
              <Chair key={'b' + i} x={px} z={cz - 0.78} rot={0} mat={i % 2 ? m.blue : m.violet} />,
            ]
          })}
          {/* Камин с телевизором у левой стены */}
          <mesh {...SH} position={[0.45, 0.55, cz]} material={m.cream}>
            <boxGeometry args={[0.45, 1.1, 1.5]} />
          </mesh>
          <mesh position={[0.69, 0.45, cz]} material={m.fire}>
            <boxGeometry args={[0.02, 0.35, 0.8]} />
          </mesh>
          <mesh castShadow position={[0.36, 1.75, cz]} material={m.dark}>
            <boxGeometry args={[0.06, 0.7, 1.25]} />
          </mesh>
          {/* Диван у окна */}
          <group position={[1.8, 0, -0.8]}>
            <RoundedBox {...SH} args={[2.2, 0.42, 0.85]} radius={0.08} position={[0, 0.24, 0]} material={m.clay} />
            <RoundedBox {...SH} args={[2.2, 0.5, 0.22]} radius={0.08} position={[0, 0.55, 0.32]} material={m.clay} />
          </group>
        </group>
      )
    }
    case 'kitchen':
      return (
        <group>
          <mesh {...SH} position={[w / 2, 0.45, back + 0.32]} material={m.cream}>
            <boxGeometry args={[w - 0.5, 0.9, 0.62]} />
          </mesh>
          <mesh {...SH} position={[w / 2, 0.92, back + 0.32]} material={m.white}>
            <boxGeometry args={[w - 0.46, 0.05, 0.66]} />
          </mesh>
          <mesh {...SH} position={[w / 2, 1.85, back + 0.2]} material={m.cream}>
            <boxGeometry args={[w - 0.5, 0.7, 0.36]} />
          </mesh>
          <mesh {...SH} position={[0.6, 0.95, -d / 2]} material={m.metal}>
            <boxGeometry args={[0.7, 1.9, 0.7]} />
          </mesh>
          <mesh {...SH} position={[w / 2 + 0.4, 0.74, -1.2]} material={m.white}>
            <boxGeometry args={[1.2, 0.05, 0.8]} />
          </mesh>
          <Chair x={w / 2 + 0.4} z={-0.55} rot={Math.PI} mat={m.furn} />
        </group>
      )
    case 'double':
      return (
        <group>
          <Bed x={w / 2} z={back + 1.1} w={1.6} m={m} color={m.blue} />
          {[w / 2 - 1.15, w / 2 + 1.15].map((px) => (
            <mesh key={px} {...SH} position={[px, 0.25, back + 0.3]} material={m.furn}>
              <boxGeometry args={[0.45, 0.5, 0.4]} />
            </mesh>
          ))}
          <mesh {...SH} position={[0.5, 1.0, -0.85]} material={m.clay}>
            <boxGeometry args={[0.6, 2.0, 1.1]} />
          </mesh>
        </group>
      )
    case 'twin':
      return (
        <group>
          <Bed x={w / 2 - 0.7} z={back + 1.1} w={0.9} m={m} color={m.violet} />
          <Bed x={w / 2 + 0.7} z={back + 1.1} w={0.9} m={m} color={m.violet} />
        </group>
      )
    case 'stairs':
      return (
        <group position={[w - 1.0, 0, -d + 0.5]}>
          {Array.from({ length: 11 }, (_, i) => (
            <mesh key={i} {...SH} position={[0, 0.12 + i * 0.25, i * 0.27]} material={m.furn}>
              <boxGeometry args={[1.0, 0.24, 0.28]} />
            </mesh>
          ))}
        </group>
      )
    case 'bath':
      return (
        <group>
          <mesh {...SH} position={[0.7, 0.05, back + 0.6]} material={m.clay}>
            <boxGeometry args={[1.0, 0.1, 1.0]} />
          </mesh>
          <RoundedBox {...SH} args={[0.4, 0.42, 0.6]} radius={0.12} position={[w - 0.55, 0.21, back + 0.45]} material={m.clay} />
          <mesh {...SH} position={[w - 0.55, 0.82, -d / 2 + 0.6]} material={m.clay}>
            <boxGeometry args={[0.45, 0.14, 0.5]} />
          </mesh>
        </group>
      )
    case 'wicker':
      return (
        <group>
          {[w / 2 - 0.7, w / 2 + 0.7].map((px) => (
            <group key={px} position={[px, 0, -d / 2]}>
              <RoundedBox castShadow args={[0.7, 0.45, 0.7]} radius={0.15} position={[0, 0.3, 0]} material={m.wicker} />
              <RoundedBox castShadow args={[0.7, 0.55, 0.15]} radius={0.07} position={[0, 0.7, -0.28]} material={m.wicker} />
            </group>
          ))}
          <mesh castShadow position={[w / 2, 0.5, -d / 2 + 0.2]} material={m.pane}>
            <cylinderGeometry args={[0.3, 0.3, 0.04, 20]} />
          </mesh>
        </group>
      )
    default:
      return null
  }
}

// ---------- Окна ----------

function Window({ m, position, w, h = 1.25, rot = 0, lit }: { m: Mats; position: [number, number, number]; w: number; h?: number; rot?: number; lit: boolean }) {
  return (
    <group position={position} rotation={[0, rot, 0]}>
      <mesh position={[0, 0, 0.02]} material={m.trim}>
        <boxGeometry args={[w + 0.2, h + 0.2, 0.07]} />
      </mesh>
      <mesh position={[0, 0, 0.065]} material={lit ? m.glass : m.glassDim}>
        <planeGeometry args={[w, h]} />
      </mesh>
      <mesh position={[0, 0, 0.075]} material={m.trim}>
        <boxGeometry args={[0.05, h, 0.02]} />
      </mesh>
      <mesh position={[0, -h / 2 - 0.12, 0.1]} material={m.snow}>
        <boxGeometry args={[w + 0.32, 0.06, 0.16]} />
      </mesh>
    </group>
  )
}

// ---------- Метка зоны ----------

// Метки кладём в отдельный слой над холстом (portal), иначе drei выбирает контейнер по-разному
// для первой и следующих меток и первая теряется. И не размонтируем, а прячем классом.
const LabelLayer = createContext<RefObject<HTMLDivElement | null> | undefined>(undefined)

function Label({ zone, picked, onPick, position, show }: { zone: Zone; picked: boolean; onPick: (id: ZoneId) => void; position: [number, number, number]; show: boolean }) {
  return (
    <Html position={position} center zIndexRange={[20, 0]} className={'h-label-wrap' + (show ? '' : ' off')} portal={useContext(LabelLayer) as RefObject<HTMLElement>}>
      <button type="button" className={'h-label' + (picked ? ' on' : '') + (zone.where === 'yard' ? '' : ' num')} onClick={() => onPick(zone.id)} tabIndex={show ? 0 : -1} aria-hidden={!show}>
        <b>{ZONES.indexOf(zone) + 1}</b>
        <span>{zone.short}</span>
      </button>
    </Html>
  )
}

const hover = {
  onPointerOver: (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    document.body.style.cursor = 'pointer'
  },
  onPointerOut: () => {
    document.body.style.cursor = ''
  },
}

// ---------- Комната внутри дома ----------

type ZoneProps = { zone: Zone; m: Mats; picked: boolean; onPick: (id: ZoneId) => void; label: boolean }

const ZoneBox = memo(function ZoneBox({ zone, m, picked, onPick, label }: ZoneProps) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: C.floor, roughness: 0.75 }), [])
  const base = useMemo(() => new THREE.Color(C.floor), [])
  const hi = useMemo(() => new THREE.Color(C.floorPick), [])
  const glowOn = useMemo(() => new THREE.Color('#6A3608'), [])
  const glowOff = useMemo(() => new THREE.Color('#000000'), [])
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-8 * dt)
    mat.color.lerp(picked ? hi : base, k)
    mat.emissive.lerp(picked ? glowOn : glowOff, k)
  })
  return (
    <group position={[wx(zone.x), 0, wz(zone.z)]}>
      <mesh
        receiveShadow
        position={[zone.w / 2, 0.01, -zone.d / 2]}
        material={mat}
        onClick={(e) => {
          e.stopPropagation()
          onPick(zone.id)
        }}
        {...hover}
      >
        <boxGeometry args={[zone.w - 0.1, 0.03, zone.d - 0.1]} />
      </mesh>
      {zone.furniture.map((f) => (
        <Furn key={f} kind={f} w={zone.w} d={zone.d} m={m} />
      ))}
      {picked && <pointLight position={[zone.w / 2, 1.8, -zone.d / 2]} color="#FFC27A" intensity={6} distance={6} decay={1.6} />}
      {ZONES.includes(zone) && <Label show={label} zone={zone} picked={picked} onPick={onPick} position={[zone.w / 2, 1.6, -zone.d / 2]} />}
    </group>
  )
})

// ---------- Этаж ----------

function Partitions({ floor, m }: { floor: 0 | 1; m: Mats }) {
  const rects = [...ZONES.filter((z) => z.where === floor && z.id !== 'terrace'), ...COMMON.filter((c) => c.floor === floor)]
  const walls: { x: number; z: number; w: number; d: number }[] = []
  const seen = new Set<string>()
  for (const r of rects) {
    const z0 = r.z < 0.01 ? WALL_T : r.z
    const z1 = r.z + r.d > D - 0.01 ? D - WALL_T : r.z + r.d
    const x0 = r.x < 0.01 ? WALL_T : r.x
    const x1 = r.x + r.w > W - 0.01 ? W - WALL_T : r.x + r.w
    const kv = `v${(r.x + r.w).toFixed(2)}:${r.z}`
    if (r.x + r.w < W - 0.01 && !seen.has(kv)) {
      seen.add(kv)
      walls.push({ x: r.x + r.w, z: (z0 + z1) / 2, w: 0.1, d: z1 - z0 })
    }
    const kh = `h${(r.z + r.d).toFixed(2)}:${r.x}`
    if (r.z + r.d < D - 0.01 && !seen.has(kh)) {
      seen.add(kh)
      walls.push({ x: (x0 + x1) / 2, z: r.z + r.d, w: x1 - x0, d: 0.1 })
    }
  }
  return (
    <>
      {walls.map((wl, i) => (
        <mesh key={i} {...SH} position={[wx(wl.x), FH / 2, wz(wl.z)]} material={m.wallIn}>
          <boxGeometry args={[wl.w, FH, wl.d]} />
        </mesh>
      ))}
    </>
  )
}

type FloorProps = { floor: 0 | 1; m: Mats; anim: RefObject<Anim>; picked: ZoneId | null; onPick: (id: ZoneId) => void; labels: boolean }

function Floor({ floor, m, anim, picked, onPick, labels }: FloorProps) {
  const shell = useRef<THREE.Group>(null)
  const wins = useRef<THREE.Group>(null)
  useFrame(() => {
    const a = anim.current
    if (shell.current) shell.current.scale.y = 1 - a.inside * (1 - CUT / FH)
    if (wins.current) wins.current.visible = a.inside < 0.4
  })
  const zones = ZONES.filter((z) => z.where === floor && z.id !== 'terrace')
  const front = floor === 0 ? [1.4, 3.8, 5.6] : [1.8, 5.2, 8.4]
  const side = floor === 0 ? [1.6, 3.6, 6.6] : [1.6, 3.6, 6.4]
  return (
    <group position={[0, floorY(floor), 0]}>
      <mesh {...SH} position={[0, -SLAB / 2, 0]} material={m.slab}>
        <boxGeometry args={[W + 0.1, SLAB, D + 0.1]} />
      </mesh>
      <group ref={shell}>
        <mesh {...SH} position={[0, FH / 2, D / 2 - WALL_T / 2]} material={m.wood}>
          <boxGeometry args={[W, FH, WALL_T]} />
        </mesh>
        <mesh {...SH} position={[0, FH / 2, -D / 2 + WALL_T / 2]} material={m.wood}>
          <boxGeometry args={[W, FH, WALL_T]} />
        </mesh>
        <mesh {...SH} position={[-W / 2 + WALL_T / 2, FH / 2, 0]} material={m.woodSide}>
          <boxGeometry args={[WALL_T, FH, D]} />
        </mesh>
        <mesh {...SH} position={[W / 2 - WALL_T / 2, FH / 2, 0]} material={m.woodSide}>
          <boxGeometry args={[WALL_T, FH, D]} />
        </mesh>
        {[-1, 1].flatMap((sx) =>
          [-1, 1].map((sz) => (
            <mesh key={`${sx}${sz}`} castShadow position={[(sx * W) / 2, FH / 2, (sz * D) / 2]} material={m.trim}>
              <boxGeometry args={[0.3, FH, 0.3]} />
            </mesh>
          )),
        )}
        <Partitions floor={floor} m={m} />
      </group>
      <group ref={wins}>
        {front.map((x, i) => (
          <Window key={'f' + i} m={m} position={[wx(x), 1.5, D / 2 + 0.01]} w={floor === 0 && i < 2 ? 1.5 : 1.05} lit={(i + floor) % 3 !== 1} />
        ))}
        {side.map((z, i) => (
          <Window key={'r' + i} m={m} position={[W / 2 + 0.01, 1.5, wz(z)]} w={0.95} rot={Math.PI / 2} lit={(i + floor) % 2 === 0} />
        ))}
        {side.map((z, i) => (
          <Window key={'l' + i} m={m} position={[-W / 2 - 0.01, 1.5, wz(z)]} w={0.95} rot={-Math.PI / 2} lit={(i + floor) % 2 === 1} />
        ))}
        {floor === 0 && (
          <group position={[wx(7.8), 0, D / 2 + 0.02]}>
            <mesh castShadow position={[0, 1.08, 0.04]} material={m.door}>
              <boxGeometry args={[1.0, 2.15, 0.08]} />
            </mesh>
            <mesh position={[0.36, 1.05, 0.1]} material={m.metal}>
              <boxGeometry args={[0.04, 0.2, 0.04]} />
            </mesh>
          </group>
        )}
      </group>
      {zones.map((z) => (
        <ZoneBox key={z.id} zone={z} m={m} picked={picked === z.id} onPick={onPick} label={labels} />
      ))}
      {COMMON.filter((c) => c.floor === floor).map((c) => (
        <group key={c.name} position={[wx(c.x), 0, wz(c.z)]}>
          <mesh receiveShadow position={[c.w / 2, 0.01, -c.d / 2]} material={m.slab}>
            <boxGeometry args={[c.w - 0.1, 0.02, c.d - 0.1]} />
          </mesh>
          {c.kind && <Furn kind={c.kind} w={c.w} d={c.d} m={m} />}
        </group>
      ))}
    </group>
  )
}

// ---------- Крыша ----------

function gableGeo(span: number, h: number) {
  const s = new THREE.Shape()
  s.moveTo(-span / 2, 0)
  s.lineTo(span / 2, 0)
  s.lineTo(0, h)
  s.closePath()
  return new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: false })
}

// Двускатная крыша с коньком вдоль оси X локальной системы; фронтоны на торцах.
function GableRoof({ len, span, h, m }: { len: number; span: number; h: number; m: Mats }) {
  const slope = Math.atan2(h, span / 2 + OVER)
  const side = Math.hypot(h, span / 2 + OVER)
  const geo = useMemo(() => gableGeo(span, h), [span, h])
  return (
    <group>
      {[1, -1].map((s) => (
        <group key={s} position={[0, h / 2, (s * (span / 2 + OVER)) / 2]} rotation={[s * slope, 0, 0]}>
          <mesh {...SH} material={m.roof}>
            <boxGeometry args={[len + OVER * 2, 0.14, side]} />
          </mesh>
          <mesh castShadow position={[0, 0.12, 0]} material={m.snow}>
            <boxGeometry args={[len + OVER * 2 - 0.15, 0.1, side - 0.25]} />
          </mesh>
        </group>
      ))}
      {[len / 2 - 0.1, -len / 2 - 0.1].map((x) => (
        <mesh key={x} {...SH} geometry={geo} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={m.wood} />
      ))}
    </group>
  )
}

const DX = wx(7.4)
const DZ = D / 2 - 0.3

function Roof({ m, anim }: { m: Mats; anim: RefObject<Anim> }) {
  const g = useRef<THREE.Group>(null)
  useFrame(() => {
    const a = anim.current
    if (!g.current) return
    g.current.position.y = a.open * 8 + a.lift * 3
    g.current.visible = a.open < 0.97
  })
  const y0 = floorY(2)
  const fx = wx(3)
  const fh = ROOF_H * 0.92
  const segs = useMemo<Seg[]>(() => {
    const e = D / 2 + OVER * 0.9
    const L = W / 2 + OVER * 0.8
    // Скаты: лампочки по нижней кромке кровли, чуть снаружи
    const rx = W / 2 + OVER + 0.04
    const rz = D / 2 + OVER
    const cz = D / 2 + 0.4 + OVER + 0.04
    const cs = 4.2 / 2 + OVER
    const out: Seg[] = [
      // Карниз по фасаду и задней стене
      [v(-L, y0 - 0.06, e), v(fx - 2.5, y0 - 0.06, e)],
      [v(fx + 2.5, y0 - 0.06, e), v(L, y0 - 0.06, e)],
      [v(-L, y0 - 0.06, -e), v(L, y0 - 0.06, -e)],
      // Фронтоны по бокам
      [v(rx, y0 - 0.12, rz), v(rx, y0 + ROOF_H - 0.12, 0)],
      [v(rx, y0 + ROOF_H - 0.12, 0), v(rx, y0 - 0.12, -rz)],
      [v(-rx, y0 - 0.12, rz), v(-rx, y0 + ROOF_H - 0.12, 0)],
      [v(-rx, y0 + ROOF_H - 0.12, 0), v(-rx, y0 - 0.12, -rz)],
      // Фронтон над гостиной
      [v(fx - cs, y0 - 0.12, cz), v(fx, y0 + fh - 0.12, cz)],
      [v(fx, y0 + fh - 0.12, cz), v(fx + cs, y0 - 0.12, cz)],
      [v(fx - 2.4, y0 - 0.06, D / 2 + 0.6), v(fx + 2.4, y0 - 0.06, D / 2 + 0.6)],
      // Мансардное окно справа, как на фото 06
      [v(DX - 1.35, y0 + 0.98, DZ + OVER + 0.04), v(DX, y0 + 1.78, DZ + OVER + 0.04)],
      [v(DX, y0 + 1.78, DZ + OVER + 0.04), v(DX + 1.35, y0 + 0.98, DZ + OVER + 0.04)],
    ]
    return out
  }, [y0, fx, fh])
  return (
    <group ref={g}>
      <group position={[0, y0, 0]}>
        <GableRoof len={W} span={D} h={ROOF_H} m={m} />
        <group position={[fx, 0, D / 2 - 1.1]} rotation={[0, Math.PI / 2, 0]}>
          <GableRoof len={3} span={4.2} h={fh} m={m} />
        </group>
        <Window m={m} position={[fx, 0.85, D / 2 + 0.53]} w={0.9} h={0.95} lit />
        <group position={[DX, 0, 0]}>
          <mesh {...SH} position={[0, 0.55, DZ - 1.15]} material={m.wood}>
            <boxGeometry args={[1.7, 1.1, 2.3]} />
          </mesh>
          <group position={[0, 1.1, DZ - 1.2]} rotation={[0, Math.PI / 2, 0]}>
            <GableRoof len={2.4} span={1.7} h={0.8} m={m} />
          </group>
          <Window m={m} position={[0, 0.56, DZ + 0.0]} w={0.7} h={0.7} lit />
        </group>
        <Window m={m} position={[W / 2 + 0.1, 0.9, 0]} w={0.8} h={0.9} rot={Math.PI / 2} lit={false} />
      </group>
      <Garland segs={segs} m={m} />
    </group>
  )
}

// ---------- Гараж, терраса, мангальная зона, беседка ----------

function Car({ m }: { m: Mats }) {
  return (
    <group>
      <RoundedBox {...SH} args={[1.8, 0.62, 4.3]} radius={0.16} position={[0, 0.55, 0]} material={m.car} />
      <RoundedBox {...SH} args={[1.6, 0.52, 2.3]} radius={0.16} position={[0, 1.08, -0.25]} material={m.car} />
      <mesh position={[0, 1.1, 0.93]} rotation={[-0.5, 0, 0]} material={m.carGlass}>
        <boxGeometry args={[1.45, 0.42, 0.04]} />
      </mesh>
      {[-0.82, 0.82].flatMap((x) =>
        [-1.35, 1.35].map((zz) => (
          <mesh key={`${x}${zz}`} position={[x, 0.32, zz]} rotation={[0, 0, Math.PI / 2]} material={m.dark}>
            <cylinderGeometry args={[0.32, 0.32, 0.22, 14]} />
          </mesh>
        )),
      )}
    </group>
  )
}

function Garage({ m, anim, picked, onPick, label }: { m: Mats; anim: RefObject<Anim>; picked: boolean; onPick: (id: ZoneId) => void; label: boolean }) {
  const z = ZONES.find((x) => x.id === 'garage') as Zone
  const shell = useRef<THREE.Group>(null)
  const top = useRef<THREE.Group>(null)
  useFrame(() => {
    const a = anim.current
    if (shell.current) shell.current.scale.y = 1 - a.inside * 0.6
    if (top.current) {
      top.current.position.y = a.open * 8
      top.current.visible = a.open < 0.97
    }
  })
  const gw = z.w
  const gd = z.d
  // На фото 27 и 43 гараж высокий, с крутым фронтоном к проезду
  const h = 3.6
  const rh = 2.6
  const x0 = wx(z.x) + gw / 2
  const z0 = wz(z.z) - gd / 2
  const segs = useMemo<Seg[]>(() => {
    const zf = z0 + gd / 2 + OVER + 0.04
    const e = gw / 2 + OVER
    return [
      [v(x0 - e, h - 0.12, zf), v(x0, h + rh - 0.12, zf)],
      [v(x0, h + rh - 0.12, zf), v(x0 + e, h - 0.12, zf)],
      [v(x0 - e + 0.1, h - 0.08, z0 + gd / 2 + OVER * 0.8), v(x0 - e + 0.1, h - 0.08, z0 - gd / 2 - OVER * 0.8)],
    ]
  }, [x0, z0, gd, gw])
  const pick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onPick('garage')
  }
  const T = 0.18
  return (
    <group>
      <group position={[x0, 0, z0]}>
        <mesh receiveShadow position={[0, 0.03, 0]} material={m.slab} onClick={pick} {...hover}>
          <boxGeometry args={[gw - 0.1, 0.06, gd - 0.1]} />
        </mesh>
        <group ref={shell}>
          {(
            [
              [gw, T, 0, -gd / 2 + T / 2],
              [T, gd, -gw / 2 + T / 2, 0],
              [T, gd, gw / 2 - T / 2, 0],
              [(gw - 2.7) / 2, T, -gw / 2 + (gw - 2.7) / 4, gd / 2 - T / 2],
              [(gw - 2.7) / 2, T, gw / 2 - (gw - 2.7) / 4, gd / 2 - T / 2],
              [2.7, T, 0, gd / 2 - T / 2, 2.8],
            ] as const
          ).map(([w, d, x, zz, y0 = 0], i) => (
            <mesh key={i} {...SH} position={[x, y0 + (h - y0) / 2, zz]} material={m.wood} onClick={pick} {...hover}>
              <boxGeometry args={[w, h - y0, d]} />
            </mesh>
          ))}
          <mesh position={[0, 1.4, gd / 2 + 0.01]} material={m.garageDoor} onClick={pick} {...hover}>
            <boxGeometry args={[2.7, 2.8, 0.06]} />
          </mesh>
        </group>
        <group position={[0, 0, -0.2]}>
          <Car m={m} />
        </group>
        <group ref={top}>
          <group position={[0, h, 0]} rotation={[0, Math.PI / 2, 0]}>
            <GableRoof len={gd} span={gw} h={rh} m={m} />
          </group>
          <Garland segs={segs.map(([a, b]) => [a.clone().sub(v(x0, 0, z0)), b.clone().sub(v(x0, 0, z0))] as Seg)} m={m} />
        </group>
        {picked && <pointLight position={[0, 3.4, gd / 2 + 1.5]} color="#FFC27A" intensity={12} distance={7} />}
      </group>
      <Label show={label} zone={z} picked={picked} onPick={onPick} position={[x0, h + rh + 0.9, z0]} />
    </group>
  )
}

function Terrace({ m, anim, picked, onPick, label }: { m: Mats; anim: RefObject<Anim>; picked: boolean; onPick: (id: ZoneId) => void; label: boolean }) {
  const z = ZONES.find((x) => x.id === 'terrace') as Zone
  const shell = useRef<THREE.Group>(null)
  const top = useRef<THREE.Group>(null)
  useFrame(() => {
    const a = anim.current
    if (shell.current) shell.current.scale.y = 1 - a.inside * 0.62
    if (top.current) {
      top.current.position.y = a.open * 8
      top.current.visible = a.open < 0.97
    }
  })
  const h = 2.5
  const local = useMemo(() => ({ ...z, x: W / 2, z: D / 2 }), [z])
  return (
    <group position={[wx(z.x), BASE_H, wz(z.z)]}>
      <mesh {...SH} position={[z.w / 2, -0.14, -z.d / 2]} material={m.furn}>
        <boxGeometry args={[z.w, 0.24, z.d]} />
      </mesh>
      <ZoneBox zone={local} m={m} picked={picked} onPick={onPick} label={false} />
      <group ref={shell}>
        {(
          [
            [z.w, 0.06, z.w / 2, -0.03],
            [0.06, z.d, z.w - 0.03, -z.d / 2],
            [z.w, 0.06, z.w / 2, -z.d + 0.03],
          ] as const
        ).map(([w, d, x, zz], i) => (
          <group key={i}>
            <mesh castShadow position={[x, 0.45, zz]} material={m.wood}>
              <boxGeometry args={[w + 0.02, 0.9, d + 0.02]} />
            </mesh>
            <mesh position={[x, 1.65, zz]} material={m.pane}>
              <boxGeometry args={[w, 1.5, d]} />
            </mesh>
          </group>
        ))}
        {[0.05, z.w - 0.05].flatMap((x) =>
          [-0.05, -z.d + 0.05].map((zz) => (
            <mesh key={`${x}${zz}`} castShadow position={[x, h / 2, zz]} material={m.trim}>
              <boxGeometry args={[0.12, h, 0.12]} />
            </mesh>
          )),
        )}
      </group>
      <group ref={top}>
        <mesh {...SH} position={[z.w / 2, h + 0.05, -z.d / 2]} rotation={[0, 0, -0.12]} material={m.roof}>
          <boxGeometry args={[z.w + 0.5, 0.12, z.d + 0.5]} />
        </mesh>
        <mesh castShadow position={[z.w / 2, h + 0.16, -z.d / 2]} rotation={[0, 0, -0.12]} material={m.snow}>
          <boxGeometry args={[z.w + 0.4, 0.08, z.d + 0.4]} />
        </mesh>
      </group>
      <pointLight position={[z.w / 2, 1.8, -z.d / 2]} color="#FFC27A" intensity={picked ? 8 : 4} distance={5} decay={1.6} />
      <Label show={label} zone={z} picked={picked} onPick={onPick} position={[z.w / 2, h + 0.9, -z.d / 2]} />
    </group>
  )
}

function Fence({ m, from, to, h = 1.8 }: { m: Mats; from: [number, number]; to: [number, number]; h?: number }) {
  const dx = to[0] - from[0]
  const dz = to[1] - from[1]
  const len = Math.hypot(dx, dz)
  const ang = Math.atan2(dz, dx)
  return (
    <mesh {...SH} position={[(from[0] + to[0]) / 2, h / 2, (from[1] + to[1]) / 2]} rotation={[0, -ang, 0]} material={m.fence}>
      <boxGeometry args={[len, h, 0.08]} />
    </mesh>
  )
}

function YardPick({ zone, picked, onPick, m }: { zone: Zone; picked: boolean; onPick: (id: ZoneId) => void; m: Mats }) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#D3D9E0', roughness: 0.9 }), [])
  const base = useMemo(() => new THREE.Color('#D3D9E0'), [])
  const hi = useMemo(() => new THREE.Color('#F2C27E'), [])
  useFrame((_, dt) => mat.color.lerp(picked ? hi : base, 1 - Math.exp(-8 * dt)))
  void m
  return (
    <mesh
      receiveShadow
      position={[zone.w / 2, 0.025, -zone.d / 2]}
      material={mat}
      onClick={(e) => {
        e.stopPropagation()
        onPick(zone.id)
      }}
      {...hover}
    >
      <boxGeometry args={[zone.w, 0.05, zone.d]} />
    </mesh>
  )
}

function Grill({ m, picked, onPick, label }: { m: Mats; picked: boolean; onPick: (id: ZoneId) => void; label: boolean }) {
  const z = ZONES.find((x) => x.id === 'grill') as Zone
  const lamps: [number, number][] = [
    [0.2, -0.2],
    [z.w - 0.2, -0.2],
    [z.w - 0.2, -z.d + 0.2],
  ]
  return (
    <group position={[wx(z.x), 0, wz(z.z)]}>
      <YardPick zone={z} picked={picked} onPick={onPick} m={m} />
      <Fence m={m} from={[0, -0.04]} to={[z.w, -0.04]} />
      <Fence m={m} from={[z.w, 0]} to={[z.w, -z.d]} />
      <group position={[z.w - 1.3, 0, -0.65]}>
        <mesh castShadow position={[0, 0.85, 0]} material={m.dark}>
          <boxGeometry args={[1.0, 0.3, 0.4]} />
        </mesh>
        <mesh position={[0, 1.02, 0]} material={m.fire}>
          <boxGeometry args={[0.85, 0.04, 0.3]} />
        </mesh>
        {[-0.4, 0.4].map((dx) => (
          <mesh key={dx} castShadow position={[dx, 0.35, 0]} material={m.dark}>
            <boxGeometry args={[0.04, 0.7, 0.36]} />
          </mesh>
        ))}
        <pointLight position={[0, 1.4, 0.3]} color="#FF8A3A" intensity={4} distance={3.5} />
      </group>
      <group position={[0.9, 0, -0.75]}>
        <mesh castShadow position={[0, 0.4, 0]} material={m.dark}>
          <cylinderGeometry args={[0.3, 0.26, 0.6, 16]} />
        </mesh>
        <mesh position={[0, 0.71, 0]} material={m.fire}>
          <cylinderGeometry args={[0.24, 0.24, 0.03, 16]} />
        </mesh>
      </group>
      {(
        [
          [z.w / 2 - 0.4, -z.d / 2 - 0.2],
          [z.w / 2 + 1.0, -z.d + 1.0],
        ] as const
      ).map(([x, zz], i) => (
        <group key={i} position={[x, 0, zz]}>
          <mesh castShadow position={[0, 0.74, 0]} material={m.fencePlain}>
            <boxGeometry args={[1.5, 0.06, 0.7]} />
          </mesh>
          {[-0.62, 0.62].map((dz) => (
            <mesh key={dz} castShadow position={[0, 0.42, dz]} material={m.fencePlain}>
              <boxGeometry args={[1.5, 0.06, 0.3]} />
            </mesh>
          ))}
          <mesh castShadow position={[0, 0.37, 0]} material={m.fencePlain}>
            <boxGeometry args={[0.08, 0.74, 0.5]} />
          </mesh>
        </group>
      ))}
      {lamps.map(([x, zz], i) => (
        <group key={i} position={[x, 0, zz]}>
          <mesh castShadow position={[0, 1.1, 0]} material={m.dark}>
            <cylinderGeometry args={[0.03, 0.03, 2.2, 6]} />
          </mesh>
          <mesh position={[0, 2.25, 0]} material={m.lamp}>
            <sphereGeometry args={[0.12, 12, 12]} />
          </mesh>
        </group>
      ))}
      <pointLight position={[z.w / 2, 2.4, -z.d / 2]} color="#FFB060" intensity={picked ? 16 : 8} distance={8} decay={1.5} />
      <Label show={label} zone={z} picked={picked} onPick={onPick} position={[z.w / 2, 1.7, -z.d / 2 - 0.4]} />
    </group>
  )
}

function Gazebo({ m, picked, onPick, label }: { m: Mats; picked: boolean; onPick: (id: ZoneId) => void; label: boolean }) {
  const z = ZONES.find((x) => x.id === 'gazebo') as Zone
  const s = z.w
  return (
    <group position={[wx(z.x), 0, wz(z.z)]}>
      <YardPick zone={z} picked={picked} onPick={onPick} m={m} />
      <group position={[s / 2, 0, -s / 2]}>
        <mesh {...SH} position={[0, 0.15, 0]} material={m.furn}>
          <boxGeometry args={[s - 0.4, 0.3, s - 0.4]} />
        </mesh>
        {[-1, 1].flatMap((a) =>
          [-1, 1].map((b) => (
            <mesh key={`${a}${b}`} castShadow position={[(a * (s - 0.6)) / 2, 1.45, (b * (s - 0.6)) / 2]} material={m.trim}>
              <boxGeometry args={[0.14, 2.3, 0.14]} />
            </mesh>
          )),
        )}
        {[Math.PI / 2, Math.PI, -Math.PI / 2].map((r) => (
          <mesh key={r} castShadow position={[Math.sin(r) * (s / 2 - 0.3), 0.75, Math.cos(r) * (s / 2 - 0.3)]} rotation={[0, r, 0]} material={m.fencePlain}>
            <boxGeometry args={[s - 0.7, 0.6, 0.06]} />
          </mesh>
        ))}
        <mesh castShadow position={[0, 3.25, 0]} rotation={[0, Math.PI / 4, 0]} material={m.roof}>
          <coneGeometry args={[s * 0.78, 1.4, 4]} />
        </mesh>
        <mesh position={[0, 3.34, 0]} rotation={[0, Math.PI / 4, 0]} scale={[0.95, 0.9, 0.95]} material={m.snow}>
          <coneGeometry args={[s * 0.76, 1.3, 4]} />
        </mesh>
        <mesh castShadow position={[0, 0.76, 0]} material={m.fencePlain}>
          <boxGeometry args={[1.6, 0.06, 0.8]} />
        </mesh>
        <pointLight position={[0, 2.2, 0]} color="#FFC27A" intensity={picked ? 10 : 3} distance={5} />
      </group>
      <Label show={label} zone={z} picked={picked} onPick={onPick} position={[s / 2, 4.5, -s / 2]} />
    </group>
  )
}

function Ground({ m, anim }: { m: Mats; anim: RefObject<Anim> }) {
  const canopy = useRef<THREE.Mesh>(null)
  const trees = useRef<THREE.Group>(null)
  useFrame(() => {
    if (canopy.current) canopy.current.visible = anim.current.open < 0.3
    if (trees.current) trees.current.visible = anim.current.open < 0.5
  })
  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} material={m.ground}>
        <circleGeometry args={[30, 72]} />
      </mesh>
      <mesh {...SH} position={[0, BASE_H / 2 - 0.05, 0]} material={m.base}>
        <boxGeometry args={[W + 0.2, BASE_H, D + 0.2]} />
      </mesh>
      <group position={[wx(7.8), 0, D / 2 + 0.7]}>
        <mesh {...SH} position={[0, BASE_H - 0.05, 0]} material={m.furn}>
          <boxGeometry args={[1.8, 0.1, 1.2]} />
        </mesh>
        <mesh {...SH} position={[0, 0.12, 0.8]} material={m.furn}>
          <boxGeometry args={[1.6, 0.08, 0.4]} />
        </mesh>
        <mesh ref={canopy} castShadow position={[0, 2.95, -0.2]} rotation={[0.25, 0, 0]} material={m.roof}>
          <boxGeometry args={[2.0, 0.08, 1.4]} />
        </mesh>
        <pointLight position={[0, 2.5, 0.5]} color="#FFB56B" intensity={5} distance={5} decay={1.5} />
      </group>
      {/* Забор участка из профлиста с кирпичными столбами, как на фото с улицы */}
      <Fence m={m} from={[-15, 12.5]} to={[15, 12.5]} h={1.3} />
      <Fence m={m} from={[-15, 12.5]} to={[-15, -7]} h={1.9} />
      <Fence m={m} from={[15, 12.5]} to={[15, -7]} h={1.9} />
      {[-15, -7.5, 0, 7.5, 15].map((x) => (
        <mesh key={x} castShadow position={[x, 1.05, 12.5]} material={m.brick}>
          <boxGeometry args={[0.45, 2.1, 0.45]} />
        </mesh>
      ))}
      <group ref={trees}>
        <Spruce m={m} position={[-12, 0, -4.5]} s={1.2} />
        <Spruce m={m} position={[12.4, 0, -4]} s={1.0} />
        <Birch m={m} position={[12.6, 0, 3.5]} />
      </group>
    </group>
  )
}

function Spruce({ m, position, s }: { m: Mats; position: [number, number, number]; s: number }) {
  return (
    <group position={position} scale={s}>
      <mesh castShadow position={[0, 0.5, 0]} material={m.trunk}>
        <cylinderGeometry args={[0.12, 0.16, 1, 8]} />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <group key={i} position={[0, 1.1 + i * 0.95, 0]}>
          <mesh castShadow material={m.spruce}>
            <coneGeometry args={[1.5 - i * 0.32, 1.7, 9]} />
          </mesh>
          <mesh position={[0, 0.25, 0]} scale={[0.8, 0.5, 0.8]} material={m.snow}>
            <coneGeometry args={[1.5 - i * 0.32, 1.0, 9]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Birch({ m, position }: { m: Mats; position: [number, number, number] }) {
  const branches = [
    [0.6, 2.2, 0.5],
    [-0.5, 2.8, -0.6],
    [0.4, 3.4, -0.5],
    [-0.4, 3.9, 0.4],
  ]
  return (
    <group position={position}>
      <mesh castShadow position={[0, 2.2, 0]} material={m.clay}>
        <cylinderGeometry args={[0.07, 0.12, 4.4, 8]} />
      </mesh>
      {branches.map(([x, y, z], i) => (
        <mesh key={i} castShadow position={[x / 2, y + 0.3, z / 2]} rotation={[z, 0, -x]} material={m.clay}>
          <cylinderGeometry args={[0.02, 0.04, 1.3, 5]} />
        </mesh>
      ))}
    </group>
  )
}

function Snowfall({ still }: { still: boolean }) {
  const N = 600
  const ref = useRef<THREE.Points>(null)
  const { positions, speed } = useMemo(() => {
    const positions = new Float32Array(N * 3)
    const speed = new Float32Array(N)
    for (let i = 0; i < N; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40
      positions[i * 3 + 1] = Math.random() * 16
      positions[i * 3 + 2] = (Math.random() - 0.5) * 34
      speed[i] = 0.35 + Math.random() * 0.5
    }
    return { positions, speed }
  }, [])
  useFrame((state, dt) => {
    if (still || !ref.current) return
    const p = ref.current.geometry.attributes.position as THREE.BufferAttribute
    const t = state.clock.elapsedTime
    const step = Math.min(dt, 0.05)
    for (let i = 0; i < N; i++) {
      let y = p.getY(i) - speed[i] * step
      if (y < 0) y += 16
      p.setY(i, y)
      p.setX(i, p.getX(i) + Math.sin(t * 0.6 + i) * 0.0025)
    }
    p.needsUpdate = true
  })
  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#FFFFFF" size={0.07} sizeAttenuation transparent opacity={0.8} depthWrite={false} />
    </points>
  )
}

// ---------- Камера ----------

type RigProps = { view: View; picked: ZoneId | null; anim: RefObject<Anim>; drag: RefObject<number>; still: boolean; onReady: () => void; onSettled: () => void }

function zoneCenter(z: Zone) {
  if (z.where === 'yard') return v(wx(z.x + z.w / 2), 1.4, wz(z.z + z.d / 2))
  return v(wx(z.x + z.w / 2), floorY(z.where) + 0.6, wz(z.z + z.d / 2))
}

function Rig({ view, picked, anim, drag, still, onReady, onSettled }: RigProps) {
  const { camera, size } = useThree()
  const look = useRef(v(0, 3, 0))
  const az = useRef(degToRad(26))
  const frames = useRef(0)
  const settled = useRef(false)
  const zone = ZONES.find((z) => z.id === picked) || null
  useEffect(() => {
    settled.current = false
  }, [view, picked])

  useFrame((state, dt) => {
    const step = still ? 1 : Math.min(dt, 0.05)
    const a = anim.current
    const inside = view === 'outside' ? 0 : 1
    a.inside = still ? inside : damp(a.inside, inside, 4, step)
    a.open = still ? inside : damp(a.open, inside, 3, step)
    a.lift = still ? (view === 0 ? 1 : 0) : damp(a.lift, view === 0 ? 1 : 0, 3.4, step)

    const t = state.clock.elapsedTime
    const yardZone = zone && zone.where === 'yard'
    const sway = view === 'outside' && !zone && !still ? Math.sin(t * 0.16) * 0.1 : 0
    az.current = damp(az.current, degToRad(view === 'outside' ? 24 : 16) + sway + (drag.current || 0), 3, step)

    const elev = degToRad(view === 'outside' ? (yardZone ? 28 : 22) : 50)
    const aspect = size.width / size.height
    const hfov = 2 * Math.atan(Math.tan(degToRad(15)) * aspect)
    const need = view === 'outside' ? (yardZone ? 6.5 : aspect < 1 ? 14 : 16) : zone ? (aspect < 1 ? 9.2 : 11) : aspect < 1 ? 10 : 12.5
    let dist = need / Math.tan(hfov / 2)
    dist = Math.max(dist, view === 'outside' ? (yardZone ? 20 : 34) : 24)

    const tgt = yardZone && zone ? zoneCenter(zone) : view === 'outside' ? v(aspect < 1 ? -4.4 : -2.2, 2.4, 2.6) : v(0.2, floorY(view) + 0.6, 0.8)
    if (zone && !yardZone && view !== 'outside') tgt.lerp(zoneCenter(zone), 0.4)
    look.current.set(damp(look.current.x, tgt.x, 3.2, step), damp(look.current.y, tgt.y, 3.2, step), damp(look.current.z, tgt.z, 3.2, step))

    const pos = v(Math.sin(az.current) * Math.cos(elev) * dist, Math.sin(elev) * dist, Math.cos(az.current) * Math.cos(elev) * dist).add(look.current)
    if (still) camera.position.copy(pos)
    else camera.position.lerp(pos, 1 - Math.exp(-3 * step))
    camera.lookAt(look.current)

    frames.current++
    if (frames.current === 3) onReady()
    if (!settled.current && camera.position.distanceTo(pos) < 0.05 && Math.abs(a.inside - inside) < 0.01) {
      settled.current = true
      onSettled()
    }
  })
  return null
}

function Lights({ anim }: { anim: RefObject<Anim> }) {
  const hemi = useRef<THREE.HemisphereLight>(null)
  const moon = useRef<THREE.DirectionalLight>(null)
  const warm = useRef<THREE.AmbientLight>(null)
  useFrame(() => {
    const i = anim.current.inside
    if (hemi.current) hemi.current.intensity = 0.6 + i * 0.6
    if (moon.current) moon.current.intensity = 0.8 + i * 1.0
    if (warm.current) warm.current.intensity = i * 0.55
  })
  return (
    <>
      <hemisphereLight ref={hemi} args={['#9DB6D3', '#1A2533', 0.6]} />
      <ambientLight ref={warm} color="#FFD7A8" intensity={0} />
      <directionalLight
        ref={moon}
        color="#C9DAF0"
        position={[-10, 18, 12]}
        intensity={0.8}
        castShadow
        shadow-mapSize={[1536, 1536]}
        shadow-bias={-0.0004}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-camera-near={1}
        shadow-camera-far={60}
      />
    </>
  )
}

type Props = {
  view: View
  picked: ZoneId | null
  onPick: (id: ZoneId) => void
  onOpen: () => void
  drag: RefObject<number>
  active: boolean
  still: boolean
  onReady: () => void
  onSettled: () => void
  onLost: () => void
  labels: RefObject<HTMLDivElement | null>
}

function World({ view, picked, onPick, onOpen, drag, still, onReady, onSettled }: Omit<Props, 'active' | 'onLost' | 'labels'>) {
  const m = useMats()
  const anim = useRef<Anim>({ inside: 0, open: 0, lift: 0 })
  const upper = useRef<THREE.Group>(null)
  useFrame(() => {
    const a = anim.current
    if (upper.current) {
      upper.current.position.y = a.lift * 7
      upper.current.visible = a.lift < 0.97
    }
  })
  const inside = view !== 'outside'
  return (
    <>
      <Rig view={view} picked={picked} anim={anim} drag={drag} still={still} onReady={onReady} onSettled={onSettled} />
      <Lights anim={anim} />
      <fog attach="fog" args={['#0F1B28', 45, 100]} />
      <Environment resolution={64} frames={1}>
        <Lightformer intensity={0.6} color="#9DB6D3" position={[0, 6, 6]} scale={[10, 4, 1]} />
        <Lightformer intensity={0.4} color="#FFC27A" position={[-6, 2, -4]} scale={[4, 4, 1]} />
      </Environment>
      <group
        onClick={(e) => {
          if (!inside) {
            e.stopPropagation()
            onOpen()
          }
        }}
        {...(inside ? {} : hover)}
      >
        <Floor floor={0} m={m} anim={anim} picked={picked} onPick={onPick} labels={view === 0} />
        <group ref={upper}>
          <Floor floor={1} m={m} anim={anim} picked={picked} onPick={onPick} labels={view === 1} />
        </group>
        <Roof m={m} anim={anim} />
      </group>
      <Terrace m={m} anim={anim} picked={picked === 'terrace'} onPick={onPick} label={view === 0} />
      <Garage m={m} anim={anim} picked={picked === 'garage'} onPick={onPick} label={view === 'outside'} />
      <Grill m={m} picked={picked === 'grill'} onPick={onPick} label={view === 'outside'} />
      <Gazebo m={m} picked={picked === 'gazebo'} onPick={onPick} label={view === 'outside'} />
      <Ground m={m} anim={anim} />
      <Snowfall still={still} />
    </>
  )
}

export default function House3D({ active, onLost, labels, ...rest }: Props) {
  return (
    <Canvas
      className="cv"
      frameloop={active ? 'always' : 'never'}
      dpr={[1, 1.75]}
      shadows
      resize={{ scroll: false }}
      camera={{ fov: 30, near: 0.5, far: 160, position: [14, 8, 30] }}
      gl={{ antialias: true, alpha: true, powerPreference: 'default' }}
      style={{ touchAction: 'pan-y' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.05
        gl.domElement.style.touchAction = 'pan-y'
        gl.domElement.addEventListener('webglcontextlost', onLost)
      }}
    >
      <LabelLayer.Provider value={labels}>
        <World {...rest} />
      </LabelLayer.Provider>
    </Canvas>
  )
}
