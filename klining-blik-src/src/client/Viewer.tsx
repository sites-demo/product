import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, OrbitControls, RoundedBox } from '@react-three/drei';
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useConfig, type Item } from './config';
import { Eyes, Hand, type Arm, type Face, type Signals } from './Mascot';

type Room = { x: number; z: number; w: number; d: number; kind: string };
type V3 = [number, number, number];

const H = 0.42;
const T = 0.035;

const PLANS: Room[][] = [
  [
    { x: 0, z: 0, w: 1.5, d: 1.6, kind: 'bed' },
    { x: 1.5, z: 0, w: 1.0, d: 1.0, kind: 'kitchen' },
    { x: 1.5, z: 1.0, w: 1.0, d: 0.6, kind: 'bath' },
  ],
  [
    { x: 0, z: 0, w: 1.4, d: 1.7, kind: 'living' },
    { x: 1.4, z: 0, w: 1.1, d: 1.0, kind: 'kitchen' },
    { x: 1.4, z: 1.0, w: 0.6, d: 0.7, kind: 'bath' },
    { x: 2.0, z: 1.0, w: 0.5, d: 0.7, kind: 'hall' },
  ],
  [
    { x: 0, z: 0, w: 1.4, d: 1.2, kind: 'living' },
    { x: 1.4, z: 0, w: 1.2, d: 1.2, kind: 'bed' },
    { x: 0, z: 1.2, w: 1.0, d: 0.9, kind: 'kitchen' },
    { x: 1.0, z: 1.2, w: 0.9, d: 0.9, kind: 'hall' },
    { x: 1.9, z: 1.2, w: 0.7, d: 0.9, kind: 'bath' },
  ],
  [
    { x: 0, z: 0, w: 1.4, d: 1.2, kind: 'living' },
    { x: 1.4, z: 0, w: 1.2, d: 1.2, kind: 'bed' },
    { x: 2.6, z: 0, w: 1.0, d: 1.2, kind: 'kids' },
    { x: 0, z: 1.2, w: 1.1, d: 0.9, kind: 'kitchen' },
    { x: 1.1, z: 1.2, w: 1.5, d: 0.9, kind: 'hall' },
    { x: 2.6, z: 1.2, w: 1.0, d: 0.9, kind: 'bath' },
  ],
  [
    { x: 0, z: 0, w: 1.4, d: 1.2, kind: 'living' },
    { x: 1.4, z: 0, w: 1.2, d: 1.2, kind: 'bed' },
    { x: 2.6, z: 0, w: 1.0, d: 1.2, kind: 'kids' },
    { x: 0, z: 1.2, w: 1.1, d: 1.0, kind: 'kitchen' },
    { x: 1.1, z: 1.2, w: 0.9, d: 1.0, kind: 'hall' },
    { x: 2.0, z: 1.2, w: 0.9, d: 1.0, kind: 'bed' },
    { x: 2.9, z: 1.2, w: 0.7, d: 1.0, kind: 'bath' },
  ],
];

export function plan(it: Item): Room[] {
  const rooms = PLANS[it.rooms].map((r) => ({ ...r }));
  if (it.baths > 1) {
    const hall = rooms.find((r) => r.kind === 'hall');
    if (hall && hall.w >= 0.8) {
      hall.w -= 0.45;
      rooms.push({ x: hall.x + hall.w, z: hall.z, w: 0.45, d: hall.d, kind: 'wc' });
    } else {
      const bath = rooms.find((r) => r.kind === 'bath')!;
      bath.w /= 2;
      rooms.push({ x: bath.x + bath.w, z: bath.z, w: bath.w, d: bath.d, kind: 'wc' });
    }
  }
  if (it.balcony) rooms.push({ x: -0.42, z: 0.12, w: 0.42, d: Math.min(1.1, rooms[0].d - 0.24), kind: 'balcony' });
  return rooms;
}

const C = {
  wall: '#f7f2ea', cap: '#d8ccbb', wood: '#c99a6e', woodLight: '#e4c7a0', white: '#f6f3ee', sofa: '#8fb3a3', sofaLight: '#a9c6b8',
  blanket: '#eaa58a', lilac: '#b9a6f5', rug: '#ead3ac', dark: '#3a3d46', plant: '#5fa86c', pot: '#d9825b', metal: '#c3c8cf',
  glass: '#bfe1f3', water: '#9fd6ec', yellow: '#f2c14e', coral: '#ef7d6a', mint: '#bfe3d0',
};

const matCache = new Map<string, THREE.MeshStandardMaterial>();
function mat(c: string, rough = 0.78) {
  const k = c + rough;
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: rough }));
  return matCache.get(k)!;
}

function floorTexture(kind: string) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const tile = kind === 'bath' || kind === 'wc';
  const stone = kind === 'kitchen' || kind === 'hall' || kind === 'balcony';
  if (tile || stone) {
    g.fillStyle = tile ? '#dfe9ee' : kind === 'balcony' ? '#d6d2cb' : '#eadfce';
    g.fillRect(0, 0, 128, 128);
    g.strokeStyle = tile ? '#c7d6de' : '#d6c8b2';
    g.lineWidth = 2;
    const n = tile ? 4 : 2;
    for (let i = 0; i <= n; i++) {
      const p = (i * 128) / n;
      g.beginPath(); g.moveTo(p, 0); g.lineTo(p, 128); g.moveTo(0, p); g.lineTo(128, p); g.stroke();
    }
  } else {
    const tones = ['#d9b48a', '#d3ab7f', '#ddb990', '#cfa577'];
    for (let i = 0; i < 8; i++) {
      g.fillStyle = tones[i % 4];
      g.fillRect(0, i * 16, 128, 16);
      g.fillStyle = 'rgba(110, 70, 30, .25)';
      g.fillRect(0, i * 16 + 15, 128, 1);
      g.fillRect(((i * 53) % 100) + 14, i * 16, 1, 16);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

const floorCache = new Map<string, THREE.Texture>();
function floorMat(kind: string, w: number, d: number) {
  const key = kind === 'living' || kind === 'bed' || kind === 'kids' ? 'wood' : kind;
  if (!floorCache.has(key)) floorCache.set(key, floorTexture(kind));
  const t = floorCache.get(key)!.clone();
  const s = key === 'wood' ? 2.2 : 3;
  t.repeat.set(w * s, d * s);
  t.needsUpdate = true;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 });
}

function Floor({ r }: { r: Room }) {
  const m = useMemo(() => floorMat(r.kind, r.w, r.d), [r.kind, r.w, r.d]);
  useEffect(() => () => m.dispose(), [m]);
  return (
    <mesh position={[r.w / 2, -0.02, r.d / 2]} material={m} receiveShadow userData={{ floor: true }}>
      <boxGeometry args={[r.w, 0.04, r.d]} />
    </mesh>
  );
}

function B({ p, s, c, r = 0.012, rough }: { p: V3; s: V3; c: string; r?: number; rough?: number }) {
  const rr = Math.max(0.001, Math.min(r, ...s.map((v) => v / 2 - 0.001)));
  return <RoundedBox args={s} radius={rr} smoothness={2} position={[p[0], p[1] + s[1] / 2, p[2]]} material={mat(c, rough)} castShadow receiveShadow />;
}

function Cyl({ p, r, h, c, rough }: { p: V3; r: number; h: number; c: string; rough?: number }) {
  return (
    <mesh position={[p[0], p[1] + h / 2, p[2]]} material={mat(c, rough)} castShadow receiveShadow>
      <cylinderGeometry args={[r, r, h, 24]} />
    </mesh>
  );
}

function Ball({ p, r, c, s = [1, 1, 1] }: { p: V3; r: number; c: string; s?: V3 }) {
  return (
    <mesh position={p} scale={s.map((v) => v * r) as V3} material={mat(c)} castShadow>
      <sphereGeometry args={[1, 20, 14]} />
    </mesh>
  );
}

function Wall({ a, b, h = H }: { a: [number, number]; b: [number, number]; h?: number }) {
  const along = a[1] === b[1];
  const len = Math.abs(along ? b[0] - a[0] : b[1] - a[1]) + T;
  const cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2;
  const size: V3 = along ? [len, h, T] : [T, h, len];
  return (
    <group position={[cx, 0, cz]}>
      <mesh position={[0, h / 2, 0]} material={mat(C.wall, 0.9)} castShadow receiveShadow>
        <boxGeometry args={size} />
      </mesh>
      <mesh position={[0, h + 0.004, 0]} material={mat(C.cap, 0.9)}>
        <boxGeometry args={[size[0] + 0.002, 0.008, size[2] + 0.002]} />
      </mesh>
    </group>
  );
}

function Window({ at, side, w }: { at: number; side: 'top' | 'left'; w: number }) {
  const frame = mat('#ffffff', 0.5);
  const glass = useMemo(() => new THREE.MeshStandardMaterial({ color: C.glass, roughness: 0.08, metalness: 0.1, emissive: '#9fd0ea', emissiveIntensity: 0.25 }), []);
  const inner = (
    <group>
      <mesh position={[0, 0.25, 0]} material={frame}><boxGeometry args={[w + 0.03, 0.26, 0.012]} /></mesh>
      <mesh position={[0, 0.25, 0.008]} material={glass}><boxGeometry args={[w - 0.02, 0.21, 0.004]} /></mesh>
      <mesh position={[0, 0.25, 0.012]} material={frame}><boxGeometry args={[0.012, 0.21, 0.004]} /></mesh>
      <mesh position={[0, 0.115, 0.03]} material={frame}><boxGeometry args={[w + 0.06, 0.012, 0.06]} /></mesh>
    </group>
  );
  return side === 'top'
    ? <group position={[at, 0, T / 2]}>{inner}</group>
    : <group position={[T / 2, 0, at]} rotation={[0, Math.PI / 2, 0]}>{inner}</group>;
}

function Plant({ p, k = 1 }: { p: V3; k?: number }) {
  return (
    <group position={p} scale={k}>
      <Cyl p={[0, 0, 0]} r={0.045} h={0.07} c={C.pot} />
      <Ball p={[0, 0.13, 0]} r={0.075} c={C.plant} />
      <Ball p={[0.03, 0.2, 0.01]} r={0.05} c="#6fbb7b" />
    </group>
  );
}

function Living({ w, d }: { w: number; d: number }) {
  const sw = Math.min(0.9, w - 0.4), cx = w / 2 + 0.06;
  return (
    <>
      <B p={[cx, 0.02, 0.2]} s={[sw, 0.1, 0.28]} c={C.sofa} r={0.025} />
      <B p={[cx, 0.02, 0.075]} s={[sw, 0.25, 0.07]} c={C.sofa} r={0.025} />
      <B p={[cx - sw / 2 + 0.035, 0.02, 0.2]} s={[0.07, 0.17, 0.28]} c={C.sofa} r={0.025} />
      <B p={[cx + sw / 2 - 0.035, 0.02, 0.2]} s={[0.07, 0.17, 0.28]} c={C.sofa} r={0.025} />
      <B p={[cx - sw / 4 + 0.018, 0.12, 0.22]} s={[sw / 2 - 0.08, 0.04, 0.22]} c={C.sofaLight} r={0.018} />
      <B p={[cx + sw / 4 - 0.018, 0.12, 0.22]} s={[sw / 2 - 0.08, 0.04, 0.22]} c={C.sofaLight} r={0.018} />
      <B p={[cx - sw / 2 + 0.13, 0.16, 0.13]} s={[0.13, 0.11, 0.04]} c={C.yellow} r={0.018} />
      <B p={[cx, 0, d * 0.6]} s={[Math.min(0.9, w - 0.4), 0.006, d * 0.38]} c={C.rug} r={0.003} />
      <B p={[cx, 0, d * 0.58]} s={[0.36, 0.08, 0.2]} c={C.wood} r={0.012} />
      <B p={[0.09, 0, d * 0.6]} s={[0.12, 0.09, Math.min(0.48, d * 0.4)]} c={C.white} />
      <B p={[0.07, 0.11, d * 0.6]} s={[0.015, 0.2, Math.min(0.42, d * 0.35)]} c={C.dark} r={0.005} rough={0.3} />
      <Plant p={[w - 0.1, 0, 0.1]} />
    </>
  );
}

function Bed({ w, d }: { w: number; d: number }) {
  const bw = Math.min(0.62, w - 0.34), bl = Math.min(0.8, d - 0.3), cx = w / 2;
  return (
    <>
      <B p={[cx, 0, 0.04 + bl / 2]} s={[bw, 0.09, bl]} c={C.woodLight} r={0.015} />
      <B p={[cx, 0, 0.055]} s={[bw + 0.02, 0.26, 0.035]} c={C.wood} r={0.012} />
      <B p={[cx, 0.09, 0.06 + bl / 2]} s={[bw - 0.04, 0.05, bl - 0.06]} c={C.white} r={0.02} />
      <B p={[cx, 0.13, 0.04 + bl * 0.64]} s={[bw - 0.01, 0.03, bl * 0.62]} c={C.blanket} r={0.014} />
      <B p={[cx - bw / 4 + 0.01, 0.135, 0.15]} s={[bw / 2 - 0.07, 0.045, 0.11]} c={C.white} r={0.02} />
      <B p={[cx + bw / 4 - 0.01, 0.135, 0.15]} s={[bw / 2 - 0.07, 0.045, 0.11]} c={C.white} r={0.02} />
      {w - bw > 0.4 ? (
        <>
          <B p={[cx - bw / 2 - 0.1, 0, 0.1]} s={[0.13, 0.12, 0.12]} c={C.wood} />
          <B p={[cx + bw / 2 + 0.1, 0, 0.1]} s={[0.13, 0.12, 0.12]} c={C.wood} />
        </>
      ) : null}
      {d - bl > 0.32 ? <B p={[cx, 0, 0.04 + bl + 0.13]} s={[bw * 0.9, 0.006, 0.18]} c={C.lilac} r={0.003} /> : null}
      {w > 1.1 ? <B p={[0.1, 0, d - 0.32]} s={[0.15, 0.38, 0.42]} c={C.white} r={0.01} /> : null}
    </>
  );
}

function Kids({ w, d }: { w: number; d: number }) {
  return (
    <>
      <B p={[0.21, 0, 0.42]} s={[0.32, 0.08, 0.64]} c={C.yellow} r={0.015} />
      <B p={[0.21, 0.08, 0.43]} s={[0.29, 0.04, 0.6]} c={C.white} r={0.015} />
      <B p={[0.21, 0.11, 0.5]} s={[0.31, 0.025, 0.44]} c={C.lilac} r={0.01} />
      <B p={[0.21, 0.115, 0.17]} s={[0.2, 0.04, 0.1]} c={C.white} r={0.018} />
      <B p={[w - 0.14, 0, 0.12]} s={[0.18, 0.12, 0.14]} c={C.coral} r={0.015} />
      <B p={[w * 0.55, 0, 0.1]} s={[0.26, 0.16, 0.13]} c={C.white} />
      <Cyl p={[w * 0.62, 0, d * 0.68]} r={0.24} h={0.006} c={C.mint} />
      <Ball p={[w * 0.68, 0.04, d * 0.7]} r={0.04} c={C.yellow} />
      <B p={[w * 0.5, 0, d * 0.62]} s={[0.07, 0.07, 0.07]} c="#7b9fe8" r={0.01} />
    </>
  );
}

function Kitchen({ w, d }: { w: number; d: number }) {
  const cw = w - 0.3, x0 = 0.04, stove = x0 + cw * 0.3, sink = x0 + cw * 0.66;
  const tx = w * 0.32, tz = d * 0.58;
  return (
    <>
      <B p={[x0 + cw / 2, 0, 0.11]} s={[cw, 0.2, 0.18]} c={C.white} r={0.008} />
      <B p={[x0 + cw / 2, 0.2, 0.11]} s={[cw + 0.01, 0.02, 0.19]} c={C.woodLight} r={0.004} />
      <B p={[stove, 0.22, 0.11]} s={[0.16, 0.006, 0.14]} c={C.dark} r={0.002} rough={0.3} />
      <B p={[stove, 0.04, 0.203]} s={[0.15, 0.11, 0.006]} c={C.dark} r={0.002} rough={0.25} />
      <B p={[sink, 0.214, 0.11]} s={[0.13, 0.01, 0.11]} c={C.metal} r={0.004} rough={0.3} />
      <B p={[stove, 0.29, 0.08]} s={[0.17, 0.035, 0.12]} c={C.metal} r={0.006} rough={0.35} />
      <B p={[w - 0.13, 0, 0.12]} s={[0.2, 0.4, 0.18]} c="#eef1f4" r={0.02} rough={0.4} />
      <B p={[w - 0.2, 0.18, 0.215]} s={[0.01, 0.1, 0.012]} c={C.metal} r={0.004} />
      <B p={[w - 0.13, 0.4, 0.12]} s={[0.14, 0.07, 0.11]} c="#e4e7ea" r={0.01} />
      <B p={[w - 0.15, 0.41, 0.177]} s={[0.08, 0.05, 0.004]} c={C.dark} r={0.002} rough={0.3} />
      <Cyl p={[tx, 0, tz]} r={0.016} h={0.15} c={C.wood} />
      <Cyl p={[tx, 0.15, tz]} r={0.14} h={0.016} c={C.woodLight} />
      {[-1, 1].map((s) => (
        <group key={s} position={[tx + s * 0.2, 0, tz]}>
          <B p={[0, 0, 0]} s={[0.08, 0.09, 0.08]} c={C.wood} r={0.008} />
          <B p={[s * 0.035, 0.09, 0]} s={[0.012, 0.1, 0.08]} c={C.wood} r={0.004} />
        </group>
      ))}
    </>
  );
}

function Bath({ w, d }: { w: number; d: number }) {
  const tw = Math.min(0.56, w - 0.12);
  const water = useMemo(() => new THREE.MeshStandardMaterial({ color: C.water, roughness: 0.05, metalness: 0.1 }), []);
  return (
    <>
      <B p={[0.04 + tw / 2, 0, 0.14]} s={[tw, 0.14, 0.23]} c="#ffffff" r={0.03} rough={0.3} />
      <mesh position={[0.04 + tw / 2, 0.142, 0.14]} rotation={[-Math.PI / 2, 0, 0]} material={water}>
        <planeGeometry args={[tw - 0.06, 0.17]} />
      </mesh>
      {w - tw > 0.25 ? (
        <>
          <B p={[w - 0.11, 0, 0.1]} s={[0.15, 0.14, 0.13]} c={C.white} />
          <B p={[w - 0.11, 0.14, 0.1]} s={[0.13, 0.025, 0.11]} c="#ffffff" r={0.01} rough={0.3} />
          <B p={[w - 0.11, 0.2, 0.025]} s={[0.12, 0.16, 0.01]} c={C.glass} r={0.004} rough={0.1} />
        </>
      ) : null}
      <B p={[0.08, 0, d * 0.62]} s={[0.07, 0.14, 0.13]} c="#ffffff" r={0.015} rough={0.3} />
      <Cyl p={[0.15, 0, d * 0.62]} r={0.045} h={0.08} c="#ffffff" rough={0.3} />
      {d > 0.75 ? (
        <group position={[w - 0.11, 0, d - 0.12]}>
          <B p={[0, 0, 0]} s={[0.15, 0.17, 0.15]} c={C.white} r={0.015} />
          <mesh position={[0, 0.085, 0.077]} rotation={[Math.PI / 2, 0, 0]} material={mat(C.dark, 0.25)}>
            <cylinderGeometry args={[0.045, 0.045, 0.006, 24]} />
          </mesh>
        </group>
      ) : null}
    </>
  );
}

function Wc({ w, d }: { w: number; d: number }) {
  return (
    <>
      <B p={[w / 2, 0, 0.07]} s={[0.13, 0.14, 0.07]} c="#ffffff" r={0.015} rough={0.3} />
      <Cyl p={[w / 2, 0, 0.15]} r={0.045} h={0.08} c="#ffffff" rough={0.3} />
      <B p={[w - 0.08, 0, d - 0.14]} s={[0.1, 0.13, 0.1]} c={C.white} />
    </>
  );
}

function Hall({ w, d }: { w: number; d: number }) {
  return (
    <>
      <B p={[0.1, 0, d / 2 - 0.05]} s={[0.16, 0.38, Math.min(0.5, d - 0.3)]} c={C.woodLight} r={0.01} />
      <B p={[w * 0.6, 0.12, 0.024]} s={[0.14, 0.22, 0.01]} c={C.glass} r={0.004} rough={0.1} />
      <B p={[w * 0.6, 0, d - 0.14]} s={[Math.min(0.26, w - 0.25), 0.006, 0.16]} c="#b48a68" r={0.003} />
      <B p={[w * 0.5, 0, d - 0.3]} s={[0.035, 0.025, 0.07]} c={C.dark} r={0.008} />
      <B p={[w * 0.5 + 0.045, 0, d - 0.3]} s={[0.035, 0.025, 0.07]} c={C.dark} r={0.008} />
    </>
  );
}

function Balcony({ w, d }: { w: number; d: number }) {
  const glass = useMemo(() => new THREE.MeshStandardMaterial({ color: '#cfeaf6', roughness: 0.05, transparent: true, opacity: 0.45 }), []);
  const rail = (a: [number, number], b: [number, number], k: string) => {
    const along = a[1] === b[1];
    const len = Math.abs(along ? b[0] - a[0] : b[1] - a[1]);
    const cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2;
    const sz = (h: number, t = 0.025): V3 => (along ? [len, h, t] : [t, h, len]);
    return (
      <group key={k} position={[cx, 0, cz]}>
        <mesh position={[0, 0.07, 0]} material={mat(C.wall, 0.9)} castShadow><boxGeometry args={sz(0.14, 0.03)} /></mesh>
        <mesh position={[0, 0.21, 0]} material={glass}><boxGeometry args={sz(0.14, 0.006)} /></mesh>
        <mesh position={[0, 0.285, 0]} material={mat('#ffffff', 0.5)}><boxGeometry args={sz(0.012, 0.03)} /></mesh>
      </group>
    );
  };
  return (
    <>
      {rail([0, 0], [w, 0], 't')}
      {rail([0, 0], [0, d], 'l')}
      {rail([0, d], [w, d], 'b')}
      <Plant p={[0.1, 0, 0.12]} k={0.85} />
      <Plant p={[0.1, 0, d - 0.12]} k={0.7} />
      <B p={[w * 0.55, 0, d * 0.5]} s={[0.1, 0.08, 0.1]} c={C.wood} r={0.01} />
    </>
  );
}

const FURNISH: Record<string, (p: { w: number; d: number }) => React.ReactElement> = {
  living: Living, bed: Bed, kids: Kids, kitchen: Kitchen, bath: Bath, wc: Wc, hall: Hall, balcony: Balcony,
};

function rnd(seed: number) {
  let s = seed * 9301 + 49297;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

const stainMat = new THREE.MeshBasicMaterial({ color: '#5e4529', transparent: true, opacity: 0.45, depthWrite: false });
const hazeMat = new THREE.MeshBasicMaterial({ color: '#7d7466', transparent: true, opacity: 0.22, depthWrite: false });
const CLOTHES = ['#7b9fe8', '#ef7d6a', '#f2c14e', '#ffffff'];
const dustMat = new THREE.MeshStandardMaterial({ color: '#8a8378', roughness: 1 });
const plasterMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false });
const paintMat = new THREE.MeshBasicMaterial({ color: '#c9c2b6', transparent: true, opacity: 0.8, depthWrite: false });
const disc = new THREE.CircleGeometry(1, 20);
const blob = new THREE.IcosahedronGeometry(1, 1);

function Mess({ r, index, remont }: { r: Room; index: number; remont: boolean }) {
  const items = useMemo(() => {
    const g = rnd(index + 3);
    const at = (): [number, number] => [0.12 + g() * (r.w - 0.24), 0.12 + g() * (r.d - 0.24)];
    const soft = r.kind === 'living' || r.kind === 'bed' || r.kind === 'kids';
    return {
      stains: Array.from({ length: 5 }, () => ({ p: at(), s: 0.05 + g() * 0.08, k: 0.5 + g() * 0.5, a: g() * 3 })),
      dust: Array.from({ length: 6 }, () => ({ p: at(), s: 0.026 + g() * 0.022 })),
      clothes: soft ? Array.from({ length: 2 }, (_, i) => ({ p: at(), a: g() * 3, c: CLOTHES[(index + i) % 4] })) : [],
      paper: Array.from({ length: 2 }, () => ({ p: at(), s: 0.022 + g() * 0.01 })),
    };
  }, [r.w, r.d, index]);
  return (
    <group userData={{ tag: 'dirt' }}>
      <mesh position={[r.w / 2, 0.002, r.d / 2]} rotation={[-Math.PI / 2, 0, 0]} material={remont ? plasterMat : hazeMat}>
        <planeGeometry args={[r.w - 0.02, r.d - 0.02]} />
      </mesh>
      {items.stains.map((s, i) => (
        <mesh key={'s' + i} geometry={disc} material={remont ? paintMat : stainMat} position={[s.p[0], 0.004, s.p[1]]} rotation={[-Math.PI / 2, 0, s.a]} scale={[s.s, s.s * s.k, 1]} />
      ))}
      {items.dust.map((s, i) => (
        <mesh key={'d' + i} geometry={blob} material={dustMat} position={[s.p[0], s.s * 0.5, s.p[1]]} scale={[s.s, s.s * 0.7, s.s]} />
      ))}
      {items.clothes.map((c, i) => (
        <group key={'c' + i} position={[c.p[0], 0, c.p[1]]} rotation={[0, c.a, 0]}>
          <B p={[0, 0, 0]} s={[0.12, 0.014, 0.08]} c={c.c} r={0.006} />
          <B p={[0.03, 0.012, 0.01]} s={[0.06, 0.012, 0.05]} c={c.c} r={0.005} />
        </group>
      ))}
      {items.paper.map((s, i) => (
        <mesh key={'p' + i} geometry={blob} material={mat('#f4f1ea', 0.9)} position={[s.p[0], s.s * 0.8, s.p[1]]} scale={s.s} />
      ))}
      {remont && (r.kind === 'living' || r.kind === 'hall') ? (
        <group position={[r.w * 0.3, 0, r.d * 0.8]}>
          <Cyl p={[0, 0, 0]} r={0.05} h={0.09} c="#ffffff" />
          <Cyl p={[0, 0.09, 0]} r={0.046} h={0.004} c="#8ab6e8" />
          <B p={[0.12, 0, 0.02]} s={[0.14, 0.03, 0.05]} c={C.yellow} r={0.012} />
        </group>
      ) : null}
    </group>
  );
}

function starTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, rr = i % 2 ? 7 : 31;
    g.lineTo(32 + Math.cos(a) * rr, 32 + Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
  return new THREE.CanvasTexture(c);
}
let starTex: THREE.Texture | null = null;

function Sparkles({ spots }: { spots: V3[] }) {
  const group = useRef<THREE.Group>(null!);
  const mats = useMemo(() => {
    starTex ||= starTexture();
    return spots.map(() => new THREE.SpriteMaterial({ map: starTex, color: '#fffbea', transparent: true, depthWrite: false, opacity: 0 }));
  }, [spots]);
  useFrame(() => {
    const now = performance.now() / 1000;
    group.current.children.forEach((o, i) => {
      const t = (now * 0.6 + i * 0.37) % 1;
      const v = Math.sin(t * Math.PI);
      (o as THREE.Sprite).material.opacity = v * 0.95;
      o.scale.setScalar(0.04 + v * 0.07);
    });
  });
  return (
    <group ref={group} userData={{ tag: 'dirt' }}>
      {spots.map((p, i) => <sprite key={i} position={p} material={mats[i]} />)}
    </group>
  );
}

function spot(r: Room): [number, number] {
  const k: Record<string, [number, number]> = {
    living: [0.88, 0.45], bed: [0.88, 0.55], kids: [0.8, 0.5], kitchen: [0.66, 0.85], bath: [0.48, 0.74],
    wc: [0.5, 0.72], hall: [0.62, 0.58], balcony: [0.5, 0.48],
  };
  const [a, b] = k[r.kind] || [0.5, 0.5];
  return [r.x + r.w * a, r.z + r.d * b];
}

const bottleGeo = (() => {
  const pts = [[0, 0], [0.1, 0], [0.118, 0.018], [0.122, 0.06], [0.122, 0.33], [0.112, 0.39], [0.08, 0.44], [0.056, 0.48], [0.056, 0.52], [0, 0.52]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const g = new THREE.LatheGeometry(pts, 40);
  g.rotateX(Math.PI / 2);
  return g;
})();
const bottleMat = new THREE.MeshPhysicalMaterial({ color: '#8f72f2', roughness: 0.22, clearcoat: 0.6, clearcoatRoughness: 0.2 });
const labelMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 });
const headMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35 });
const triggerMat = new THREE.MeshStandardMaterial({ color: '#ffd23f', roughness: 0.5 });

const FACE: Face = { pos: [0, 0.118, 0.3], normal: [0, 1, 0], size: 0.07 };
const ARMS: Arm[] = [
  { pos: [-0.112, 0, 0.22], side: -1, size: 0.62 },
  { pos: [0.112, 0, 0.22], side: 1, size: 0.62 },
];

function Bottle({ target, signals, scale }: { target: [number, number]; signals: React.MutableRefObject<Signals>; scale: number }) {
  const outer = useRef<THREE.Group>(null!);
  const body = useRef<THREE.Group>(null!);
  const camera = useThree((s) => s.camera);
  const hop = useRef({ from: new THREE.Vector2(...target), to: new THREE.Vector2(...target), at: -1e9 });
  const v = useMemo(() => new THREE.Vector3(), []);
  const mounted = useRef(false);

  useEffect(() => {
    const h = hop.current;
    const o = outer.current;
    if (!mounted.current) { mounted.current = true; o.position.set(target[0], 0, target[1]); h.to.set(...target); return; }
    h.from.set(o.position.x, o.position.z);
    h.to.set(...target);
    h.at = h.from.distanceTo(h.to) > 0.01 ? performance.now() : -1e9;
    if (h.at < 0) o.position.set(target[0], 0, target[1]);
  }, [target[0], target[1]]);

  const first = useRef(true);

  useFrame((_, dt) => {
    const now = performance.now();
    const h = hop.current;
    const o = outer.current;
    const t = Math.min(1, (now - h.at) / 760);
    if (t < 1) {
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      o.position.set(h.from.x + (h.to.x - h.from.x) * e, Math.sin(t * Math.PI) * 0.32, h.from.y + (h.to.y - h.from.y) * e);
    } else {
      o.position.set(h.to.x, 0, h.to.y);
    }
    const land = t >= 1 ? Math.max(0, 1 - (now - h.at - 760) / 260) : 0;
    const joy = signals.current.mood === 'joy';
    const bounce = joy ? Math.abs(Math.sin(now / 160)) * 0.05 : 0;
    const sq = 1 - Math.sin(land * Math.PI) * 0.14 + Math.sin(now / 520) * 0.012;
    body.current.scale.set(1 / Math.sqrt(sq), 1 / Math.sqrt(sq), sq);
    body.current.position.y = bounce;
    o.getWorldPosition(v);
    const want = Math.atan2(camera.position.x - v.x, camera.position.z - v.z) + Math.PI;
    let dy = want - o.rotation.y;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    o.rotation.y += dy * Math.min(1, first.current ? 1 : dt * 5);
    first.current = false;
  });

  return (
    <group ref={outer} scale={scale} userData={{ tag: 'bottle' }}>
      <group ref={body}>
        <group rotation={[-Math.PI / 2, 0, 0]}>
          <mesh geometry={bottleGeo} material={bottleMat} castShadow />
          <mesh position={[0, 0, 0.14]} rotation={[Math.PI / 2, 0, 0]} material={labelMat}>
            <cylinderGeometry args={[0.124, 0.124, 0.1, 40, 1, true]} />
          </mesh>
          <mesh position={[0, 0.11, 0.14]} rotation={[0, 0, 0]} material={triggerMat} scale={[0.03, 0.018, 0.03]}>
            <sphereGeometry args={[1, 16, 12]} />
          </mesh>
          <mesh position={[0, 0, 0.545]} rotation={[Math.PI / 2, 0, 0]} material={headMat}>
            <cylinderGeometry args={[0.062, 0.062, 0.05, 28]} />
          </mesh>
          <RoundedBox args={[0.085, 0.2, 0.08]} radius={0.025} smoothness={3} position={[0, 0.045, 0.61]} material={headMat} castShadow />
          <mesh position={[0, 0.15, 0.61]} rotation={[0, 0, 0]} material={triggerMat}>
            <cylinderGeometry args={[0.018, 0.022, 0.025, 16]} />
          </mesh>
          <RoundedBox args={[0.04, 0.03, 0.09]} radius={0.012} smoothness={2} position={[0, 0.1, 0.53]} rotation={[0.35, 0, 0]} material={triggerMat} />
          <group userData={{ tag: 'face' }}><Eyes face={FACE} signals={signals} /></group>
          {ARMS.map((a, i) => <group key={i} userData={{ tag: 'hand' }}><Hand arm={a} signals={signals} index={i} /></group>)}
        </group>
      </group>
    </group>
  );
}

export function Flat({ it, before, signals, goto, onFit, onPick, sparkle = true }: {
  it: Item;
  before?: boolean;
  signals: React.MutableRefObject<Signals>;
  goto?: string;
  onFit?: (box: THREE.Box3) => void;
  onPick?: (tag: string) => void;
  sparkle?: boolean;
}) {
  const group = useRef<THREE.Group>(null!);
  const pop = useRef(0);
  const rooms = useMemo(() => plan(it), [it.rooms, it.baths, it.balcony]);
  const shape = [it.rooms, it.baths, it.balcony].join('|');

  const bounds = useMemo(() => {
    const x0 = Math.min(...rooms.map((r) => r.x)), x1 = Math.max(...rooms.map((r) => r.x + r.w));
    const z0 = Math.min(...rooms.map((r) => r.z)), z1 = Math.max(...rooms.map((r) => r.z + r.d));
    return { cx: (x0 + x1) / 2, cz: (z0 + z1) / 2 };
  }, [rooms]);

  const target = useMemo(() => {
    const r = rooms.find((x) => x.kind === goto) || rooms.find((x) => x.kind === 'hall') || rooms[rooms.length > 3 ? 3 : 0];
    return spot(r);
  }, [rooms, goto]);

  const windows = useMemo(() => {
    const out: { room: number; side: 'top' | 'left'; at: number; w: number }[] = [];
    rooms.forEach((r, i) => {
      if (r.kind === 'balcony' || r.kind === 'hall' || r.kind === 'wc' || r.kind === 'bath') return;
      const ww = Math.min(0.42, r.w * 0.36);
      if (r.z === 0) out.push({ room: i, side: 'top', at: r.kind === 'kitchen' ? r.w * 0.42 : r.w / 2 + (r.kind === 'living' ? 0.06 : 0), w: ww });
      else if (r.x === 0 && !(it.balcony && i === 0)) out.push({ room: i, side: 'left', at: r.d * 0.45, w: Math.min(0.42, r.d * 0.36) });
    });
    return out;
  }, [rooms, it.balcony]);

  const sparks = useMemo(() => {
    const g = rnd(7);
    const pts: V3[] = [];
    rooms.forEach((r) => {
      for (let n = 0; n < 2; n++) pts.push([r.x + 0.15 + g() * (r.w - 0.3), 0.08 + g() * 0.25, r.z + 0.15 + g() * (r.d - 0.3)]);
    });
    if (it.windows) windows.forEach((wn) => {
      const r = rooms[wn.room];
      for (let n = 0; n < 2; n++) {
        const off = (g() - 0.5) * wn.w;
        pts.push(wn.side === 'top' ? [r.x + wn.at + off, 0.2 + g() * 0.1, r.z + 0.05] : [r.x + 0.05, 0.2 + g() * 0.1, r.z + wn.at + off]);
      }
    });
    return pts;
  }, [rooms, windows, it.windows]);

  useLayoutEffect(() => {
    const g = group.current;
    g.traverse((o: any) => {
      if (!o.isMesh && !o.isSprite) return;
      let p = o.parent;
      while (p && !p.userData.tag) p = p.parent;
      const tag = p?.userData.tag;
      if (tag && (!o.userData.tag || o.userData.inherited)) { o.userData.tag = tag; o.userData.inherited = true; }
    });
  });

  useEffect(() => { pop.current = performance.now(); }, [shape]);
  useEffect(() => {
    if (!onFit) return;
    const g = group.current;
    g.updateWorldMatrix(true, true);
    const box = new THREE.Box3();
    g.traverse((o: any) => { if (o.isMesh && o.userData.floor) box.expandByObject(o); });
    box.max.y = H;
    onFit(box);
  }, [shape]);

  useFrame(() => {
    const t = Math.min(1, (performance.now() - pop.current) / 520);
    const e = 1 - Math.pow(1 - t, 3);
    group.current.scale.setScalar(0.92 + 0.08 * e + Math.sin(t * Math.PI) * 0.02);
  });

  const scale = 1.15;

  return (
    <group
      ref={group}
      onClick={(e) => {
        if (!onPick || e.delta > 6) return;
        e.stopPropagation();
        let o: THREE.Object3D | null = e.object;
        while (o && (!o.userData.tag || o.userData.inherited)) o = o.parent;
        onPick(o?.userData.tag || 'living');
      }}
    >
      <group position={[-bounds.cx, 0, -bounds.cz]}>
        {rooms.map((r, i) => {
          const Furnish = FURNISH[r.kind];
          const tall = r.kind !== 'balcony';
          return (
            <group key={shape + i} position={[r.x, 0, r.z]} userData={{ tag: r.kind }}>
              <Floor r={r} />
              {tall ? (
                <>
                  <Wall a={[0, 0]} b={[r.w, 0]} />
                  <Wall a={[0, 0]} b={[0, r.d]} />
                  <Wall a={[0, r.d]} b={[r.w, r.d]} h={0.035} />
                  <Wall a={[r.w, 0]} b={[r.w, r.d]} h={0.035} />
                </>
              ) : null}
              <Furnish w={r.w} d={r.d} />
              {before ? <Mess r={r} index={i} remont={it.kind === 'remont'} /> : null}
            </group>
          );
        })}
        {windows.map((wn, i) => {
          const r = rooms[wn.room];
          return (
            <group key={shape + 'w' + i} position={[r.x, 0, r.z]} userData={{ tag: r.kind }}>
              <Window at={wn.at} side={wn.side} w={wn.w} />
            </group>
          );
        })}
        {sparkle && !before ? <Sparkles spots={sparks} /> : null}
        <Bottle target={target} signals={signals} scale={scale} />
      </group>
    </group>
  );
}

export function Furniture({ it, signals, onFit }: { type?: string; it: Item; signals: React.MutableRefObject<Signals>; onFit?: (box: THREE.Box3) => void }) {
  return <Flat it={it} signals={signals} onFit={onFit} sparkle={false} goto="hall" />;
}

function Rig({ fit }: { fit: { target: THREE.Vector3; dist: number } }) {
  const controls = useThree((s) => s.controls) as any;
  const camera = useThree((s) => s.camera);
  useFrame(() => {
    if (!controls) return;
    controls.target.lerp(fit.target, 0.08);
    const off = camera.position.clone().sub(controls.target);
    off.setLength(off.length() + (fit.dist - off.length()) * 0.08);
    camera.position.copy(controls.target).add(off);
  });
  return null;
}

function useSignals() {
  const it = useConfig((s) => s.items.flat);
  const before = useConfig((s) => s.before);
  const pulse = useConfig((s) => s.pulse);
  const picked = useConfig((s) => s.picked);
  const goto = useConfig((s) => s.goto);
  const signals = useRef<Signals>({ mood: 'happy', waveAt: performance.now() + 300, waveSide: 0, tapAt: 0 });
  const s = signals.current;
  s.mood = before ? 'sad' : 'happy';

  useEffect(() => { if (pulse.at) { s.waveAt = performance.now(); s.waveSide = 0; } }, [pulse.at]);
  useEffect(() => { if (picked.at) { s.tapAt = performance.now(); s.waveAt = performance.now(); s.waveSide = 0; } }, [picked.at]);
  useFrame(() => {
    const now = performance.now();
    if (now - s.waveAt > 9000) { s.waveAt = now; s.waveSide = Math.random() > 0.5 ? 1 : -1; }
  });
  return { signals, it, before, goto: goto.room };
}

function Scene({ onTouch }: { onTouch: () => void }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const { signals, it, before, goto } = useSignals();
  const pick = useConfig((s) => s.pick);
  const fit = useMemo(() => ({ target: new THREE.Vector3(0, 0.1, 0), dist: 6 }), []);
  const box = useRef<THREE.Box3 | null>(null);

  const refit = () => {
    if (!box.current) return;
    const s = box.current.getSize(new THREE.Vector3());
    const c = box.current.getCenter(new THREE.Vector3());
    const v = THREE.MathUtils.degToRad(camera.fov) / 2;
    const h = Math.atan(Math.tan(v) * (size.width / size.height));
    const wide = Math.hypot(s.x, s.z);
    fit.dist = Math.max(wide / 2 / Math.tan(h), (s.z * 0.8) / 2 / Math.tan(v)) * 1.08 + 0.45;
    fit.target.set(c.x, 0.05, c.z + 0.05);
  };
  useEffect(refit, [size.width, size.height]);

  return (
    <>
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={2.2} position={[0, 4, 1]} rotation-x={Math.PI / 2} scale={[6, 4, 1]} />
        <Lightformer form="rect" intensity={1.1} position={[-4, 1.5, 2]} rotation-y={Math.PI / 2} scale={[4, 2, 1]} color="#fff3e2" />
        <Lightformer form="rect" intensity={0.8} position={[4, 1, -1]} rotation-y={-Math.PI / 2} scale={[4, 2, 1]} />
        <Lightformer form="circle" intensity={1.4} position={[2, 2.5, 4]} scale={1.5} color="#fff8ee" />
      </Environment>
      <hemisphereLight args={['#fffaf2', '#d8cab4', 0.45]} />
      <directionalLight position={[2, 5, 3]} intensity={1.3} color="#fff4e6" castShadow
        shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004}
        shadow-camera-left={-3} shadow-camera-right={3} shadow-camera-top={3} shadow-camera-bottom={-3} />
      <Flat it={it} before={before} signals={signals} goto={goto} onPick={pick} onFit={(b) => { box.current = b; refit(); }} />
      <ContactShadows position={[0, -0.045, 0]} opacity={0.4} scale={8} blur={2.4} far={1} resolution={512} color="#3b2f22" />
      <OrbitControls makeDefault enablePan={false} enableDamping dampingFactor={0.08}
        minPolarAngle={0.35} maxPolarAngle={1.15} minAzimuthAngle={-0.7} maxAzimuthAngle={1.25} minDistance={2} maxDistance={14} rotateSpeed={0.8}
        onStart={onTouch} />
      <Rig fit={fit} />
    </>
  );
}

export default function Viewer({ onTouch, paused }: { onTouch: () => void; paused?: boolean }) {
  return (
    <Canvas
      shadows
      frameloop={paused ? 'never' : 'always'}
      dpr={[1, 2]}
      camera={{ fov: 30, position: [2.4, 4.2, 4.6], near: 0.05, far: 60 }}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.AgXToneMapping, toneMappingExposure: 1.1 }}
    >
      <Suspense fallback={null}>
        <Scene onTouch={onTouch} />
      </Suspense>
    </Canvas>
  );
}
