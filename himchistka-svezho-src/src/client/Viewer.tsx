import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, OrbitControls, useGLTF } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useConfig, type Item, type ItemType } from './config';
import { Eyes, Hand, type Arm, type Face, type Signals } from './Mascot';
import { COLORS } from '../lib/colors';
import { fabricMaterial, rugTexture, woodMaterial, metalMaterial, plinthMaterial, mattressMaterials } from './materials';

const W = 0.64;
const GLB = import.meta.env.BASE_URL + 'assets/parts.glb';

type Part = {
  geo: string;
  mat: string;
  pos: [number, number, number];
  rot?: [number, number, number];
  scale?: [number, number, number];
  tag: string;
};

function sofaParts(it: Item, n: number): Part[] {
  const out: Part[] = [];
  const corner = !!it.corner && n > 1;
  const inner = n * W + (corner ? W : 0);
  const x0 = -inner / 2;
  const armW = { round: 0.22, square: 0.15, low: 0.2, none: 0 }[it.arm];

  out.push({ geo: 'base' + n, mat: 'fabric', pos: [x0 + (n * W) / 2, 0, 0], tag: 'frame' });
  out.push({ geo: 'backframe' + n, mat: 'fabric', pos: [x0 + (n * W) / 2, 0, 0], tag: 'frame' });
  for (let i = 0; i < n; i++) {
    const x = x0 + (i + 0.5) * W;
    out.push({ geo: 'seat', mat: 'fabric', pos: [x, 0, 0], tag: 'seat' });
    out.push({ geo: 'back', mat: 'fabric', pos: [x, 0, 0], tag: 'seat' });
  }
  const cx = x0 + n * W + W / 2;
  if (corner) {
    out.push({ geo: 'chaise_base', mat: 'fabric', pos: [cx, 0, 0], tag: 'frame' });
    out.push({ geo: 'chaise_seat', mat: 'fabric', pos: [cx, 0, 0], tag: 'seat' });
    out.push({ geo: 'backframe1', mat: 'fabric', pos: [cx, 0, 0], tag: 'frame' });
    out.push({ geo: 'back', mat: 'fabric', pos: [cx, 0, 0], tag: 'seat' });
  }
  if (armW) {
    out.push({ geo: 'arm_' + it.arm, mat: 'fabric', pos: [x0 - armW / 2, 0, 0], tag: 'arm' });
    out.push({
      geo: 'arm_' + it.arm, mat: 'fabric', tag: 'arm',
      pos: [x0 + inner + armW / 2, corner ? 0.35 : 0, 0],
      scale: [1, corner ? 1.6 / 0.9 : 1, 1],
    });
  }

  const L = x0 - armW;
  const R = x0 + inner + armW;
  if (it.legs === 'plinth') {
    out.push({ geo: 'leg_plinth', mat: 'plinth', pos: [(L + R) / 2, 0, 0], scale: [R - L - 0.12, 1, 1], tag: 'leg' });
    if (corner) out.push({ geo: 'leg_plinth', mat: 'plinth', pos: [cx + armW / 2, 0.75, 0], scale: [W + armW - 0.12, 0.9, 1], tag: 'leg' });
  } else {
    const geo = it.legs === 'wood' ? 'leg_wood' : 'leg_metal';
    const mat = it.legs === 'wood' ? 'wood' : 'metal';
    const pts: [number, number][] = [[L + 0.07, -0.37], [L + 0.07, 0.37], [R - 0.07, -0.37], [R - 0.07, corner ? 1.08 : 0.37]];
    if (corner) pts.push([x0 + n * W - 0.05, 1.08]);
    if (n >= 3 && !corner) pts.push([0, 0.37], [0, -0.37]);
    pts.forEach(([x, y]) => out.push({ geo, mat, pos: [x, y, 0], tag: 'leg' }));
  }

  if (it.pillows) {
    const right = x0 + inner - (corner ? W : 0);
    const xs = [x0 + 0.32];
    if (it.pillows >= 2) xs.push(right - 0.32);
    if (it.pillows === 4) xs.push(x0 + 0.62, right - 0.62);
    xs.forEach((x, i) => out.push({
      geo: 'pillow', mat: 'pillow', tag: 'pillow',
      pos: [x, 0.05 + (i > 1 ? 0.06 : 0), 0.68 - (i > 1 ? 0.03 : 0)],
      rot: [-0.32, (i % 2 ? -1 : 1) * 0.1, (i % 2 ? 1 : -1) * 0.12],
    }));
  }
  return out;
}

function chairParts(it: Item): Part[] {
  const out: Part[] = [];
  const shown = Math.min(it.count, 4);
  for (let i = 0; i < shown; i++) {
    const x = (i - (shown - 1) / 2) * 0.62;
    out.push({ geo: 'chair_frame', mat: 'wood', pos: [x, 0, 0], tag: 'leg' });
    out.push({ geo: 'chair_seat', mat: 'fabric', pos: [x, 0, 0], tag: 'seat' });
    out.push({ geo: 'chair_back', mat: it.back ? 'fabric' : 'wood', pos: [x, 0, 0], tag: 'arm' });
  }
  return out;
}

function mattressParts(it: Item): Part[] {
  const sx = Number(it.size) / 160;
  return [
    { geo: 'mattress', mat: 'mattress', pos: [0, 0, 0.02], scale: [sx, 1, 1], tag: 'seat' },
    { geo: 'mattress_band', mat: 'band', pos: [0, 0, 0.02], scale: [sx, 1, 1], tag: 'frame' },
  ];
}

function unpacked(src: THREE.BufferGeometry) {
  const geo = new THREE.BufferGeometry();
  for (const [name, attr] of Object.entries(src.attributes)) {
    const a = attr as THREE.BufferAttribute;
    const out = new Float32Array(a.count * a.itemSize);
    for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) out[i * a.itemSize + k] = a.getComponent(i, k);
    geo.setAttribute(name, new THREE.BufferAttribute(out, a.itemSize));
  }
  if (src.index) geo.setIndex(src.index.clone());
  return geo;
}

function useParts() {
  const { scene } = useGLTF(GLB, false, true);
  return useMemo(() => {
    scene.updateMatrixWorld(true);
    const toZUp = new THREE.Matrix4().makeRotationX(Math.PI / 2);
    const map: Record<string, THREE.BufferGeometry> = {};
    scene.traverse((o: any) => {
      if (o.isMesh) map[o.name] = unpacked(o.geometry).applyMatrix4(o.matrixWorld).applyMatrix4(toZUp);
    });
    return map;
  }, [scene]);
}

function Piece({ p, geo, mat, index }: { p: Part; geo: THREE.BufferGeometry; mat: THREE.Material; index: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  const pulse = useConfig((s) => s.pulse);
  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    const rot = p.rot || [0, 0, 0];
    const hit = pulse.tag === 'all' || pulse.tag === p.tag;
    const t = hit ? (performance.now() - pulse.at - index * 45) / 750 : 2;
    if (t > 0 && t < 1) {
      const env = Math.sin(t * Math.PI);
      if (pulse.tag === 'all') {
        m.scale.set(p.scale?.[0] ?? 1, p.scale?.[1] ?? 1, (p.scale?.[2] ?? 1) * (1 + env * 0.03));
      } else {
        const wob = Math.sin(t * Math.PI * 4) * (1 - t) * 0.07;
        m.position.set(p.pos[0], p.pos[1], p.pos[2] + env * 0.07);
        m.rotation.set(rot[0] + wob * 0.4, rot[1] + wob, rot[2]);
      }
    } else {
      m.position.set(...p.pos);
      m.rotation.set(...rot);
      m.scale.set(...(p.scale || [1, 1, 1]));
    }
  });
  return (
    <mesh ref={ref} geometry={geo} material={mat} position={p.pos} rotation={p.rot || [0, 0, 0]} scale={p.scale || [1, 1, 1]}
      castShadow receiveShadow userData={{ tag: p.tag }} />
  );
}

function Carpet({ it }: { it: Item }) {
  const h = it.pile === 'long' ? 0.035 : 0.014;
  const color = COLORS[it.color].hex;
  const mats = useMemo(() => {
    const top = new THREE.MeshStandardMaterial({ map: rugTexture(color, it.pile), roughness: 1 });
    const side = new THREE.MeshStandardMaterial({ color, roughness: 1 });
    return [side, side, side, side, top, side];
  }, [color, it.pile]);
  useEffect(() => () => mats.forEach((m) => m.dispose()), [mats]);
  return (
    <mesh position={[0, 0, h / 2]} material={mats} castShadow receiveShadow userData={{ tag: 'seat' }}>
      <boxGeometry args={[it.w, it.l, h]} />
    </mesh>
  );
}


const ARM_W: Record<string, number> = { round: 0.22, square: 0.15, low: 0.2, none: 0 };
const ARM_TOP: Record<string, number> = { round: 0.7, square: 0.66, low: 0.5, none: 0.34 };

type Character = { faces: Face[]; arms: Arm[]; spots: [number, number][]; top: number };

function backFace(x: number, z: number, size: number): Face {
  return { pos: [x, 3, z], size };
}

function placeFaces(g: THREE.Group, faces: Face[]): Face[] {
  const targets: THREE.Object3D[] = [];
  g.traverse((o: any) => { if (o.isMesh && o.userData.tag && o.userData.tag !== 'dirt' && o.userData.tag !== 'pillow') targets.push(o); });
  const inv = g.matrixWorld.clone().invert();
  const ray = new THREE.Raycaster();
  const cast = (from: THREE.Vector3, dir: THREE.Vector3) => {
    ray.set(from.clone().applyMatrix4(g.matrixWorld), dir.clone().transformDirection(g.matrixWorld));
    const hit = ray.intersectObjects(targets, false)[0];
    if (!hit || !hit.face) return null;
    return {
      p: hit.point.clone().applyMatrix4(inv),
      n: hit.face.normal.clone().transformDirection(hit.object.matrixWorld).transformDirection(inv),
    };
  };
  return faces.map((f) => {
    const spread = f.size * 1.6;
    const hits = [-spread, 0, spread]
      .map((dx) => f.up
        ? cast(new THREE.Vector3(f.pos[0] + dx, f.pos[1], 3), new THREE.Vector3(0, 0, -1))
        : cast(new THREE.Vector3(f.pos[0] + dx, 3, f.pos[2]), new THREE.Vector3(0, -1, 0)))
      .filter(Boolean) as { p: THREE.Vector3; n: THREE.Vector3 }[];
    if (!hits.length) return f;
    const out = f.up ? Math.max(...hits.map((h) => h.p.z)) : Math.max(...hits.map((h) => h.p.y));
    const n = hits.reduce((a, h) => a.add(h.n), new THREE.Vector3()).add(f.up ? new THREE.Vector3(0, 0, 2) : new THREE.Vector3(0, 2, 0)).normalize();
    if (f.tilt) n.add(new THREE.Vector3(0, f.tilt, 0)).normalize();
    const p = new THREE.Vector3(f.pos[0], f.up ? f.pos[1] : out, f.up ? out : f.pos[2]).addScaledVector(n, f.size * 0.15);
    if (f.tilt) p.z += f.size * 1.5 * n.y;
    return { ...f, pos: p.toArray() as [number, number, number], normal: n.toArray() as [number, number, number] };
  });
}

function character(type: ItemType, it: Item): Character {
  if (type === 'sofa' || type === 'armchair') {
    const n = type === 'armchair' ? 1 : it.seats;
    const corner = type === 'sofa' && !!it.corner;
    const inner = n * W + (corner ? W : 0);
    const x0 = -inner / 2;
    const armW = ARM_W[it.arm];
    const shoulder = ARM_TOP[it.arm] - (it.arm === 'none' ? 0.08 : 0.14);
    const size = type === 'armchair' ? 0.8 : 0.9;
    const spots: [number, number][] = [];
    for (let i = 0; i < n; i++) spots.push([x0 + (i + 0.5) * W + (i % 2 ? 0.1 : -0.12), 0.12 + (i % 3) * 0.06]);
    if (corner) spots.push([x0 + n * W + W / 2, 0.7]);
    return {
      faces: [backFace(x0 + (n * W) / 2, 0.77, type === 'armchair' ? 0.16 : 0.18)],
      arms: [
        { pos: [x0 - armW + 0.02, 0.05, shoulder], side: -1, size },
        { pos: [x0 + inner + armW - 0.02, corner ? 0.5 : 0.05, shoulder], side: 1, size },
      ],
      spots,
      top: 0.95,
    };
  }
  if (type === 'chair') {
    const shown = Math.min(it.count, 4);
    const faces: Face[] = [];
    const arms: Arm[] = [];
    const spots: [number, number][] = [];
    for (let i = 0; i < shown; i++) {
      const x = (i - (shown - 1) / 2) * 0.62;
      faces.push(backFace(x, 0.83, 0.095));
      arms.push({ pos: [x - 0.21, -0.2, 0.66], side: -1, size: 0.6 }, { pos: [x + 0.21, -0.2, 0.66], side: 1, size: 0.6 });
      spots.push([x + 0.05, 0.06]);
    }
    return { faces, arms, spots, top: 1.0 };
  }
  if (type === 'mattress') {
    const hw = 0.8 * (Number(it.size) / 160);
    return {
      faces: [{ pos: [0, 0.62, 0], size: 0.16, up: true, tilt: 0.55 }],
      arms: [
        { pos: [-hw, 0.55, 0.15], side: -1, size: 1.1 },
        { pos: [hw, 0.55, 0.15], side: 1, size: 1.1 },
      ],
      spots: [[-hw * 0.4, 0.3], [hw * 0.35, -0.2], [0.05, 0.6], [-hw * 0.2, -0.6]],
      top: 0.3,
    };
  }
  const h = it.pile === 'long' ? 0.035 : 0.014;
  return {
    faces: [{ pos: [0, it.l / 2 - 0.4, 0], size: 0.22, up: true, tilt: 0.7 }],
    arms: [
      { pos: [-it.w / 2, it.l / 2 - 0.45, h], side: -1, size: 1.2 },
      { pos: [it.w / 2, it.l / 2 - 0.45, h], side: 1, size: 1.2 },
    ],
    spots: [[-it.w * 0.25, 0], [it.w * 0.2, -it.l * 0.2], [it.w * 0.1, it.l * 0.12], [-it.w * 0.15, -it.l * 0.32]],
    top: 0.1,
  };
}

function stainTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const blob = (x: number, y: number, r: number, a: number) => {
    const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
    g.addColorStop(0, `rgba(96, 62, 30, ${a})`);
    g.addColorStop(0.7, `rgba(110, 72, 36, ${a * 0.8})`);
    g.addColorStop(1, 'rgba(110, 72, 36, 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  };
  blob(64, 64, 46, 0.55);
  blob(84, 52, 26, 0.45);
  blob(46, 80, 22, 0.4);
  blob(96, 88, 10, 0.5);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const stainMat = new THREE.MeshBasicMaterial({ map: stainTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
const stainGeo = new THREE.PlaneGeometry(1, 1);
const hairMat = new THREE.MeshStandardMaterial({ color: '#d9d2c6', roughness: 0.9 });
const hair = new THREE.CapsuleGeometry(0.0025, 0.035, 2, 4);
const stinkGeo = (() => {
  const pts = Array.from({ length: 12 }, (_, i) => new THREE.Vector3(Math.sin(i * 0.9) * 0.04, 0, i * 0.025));
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.009, 6, false);
})();

type Hit = { p: THREE.Vector3; n: THREE.Vector3 };

function Dirt({ host, ch, it, version }: { host: React.RefObject<THREE.Group>; ch: Character; it: Item; version: string }) {
  const [hits, setHits] = useState<Hit[]>([]);
  const stink = useRef<THREE.Group>(null);
  const stinkMats = useMemo(() => [0, 1, 2].map(() => new THREE.MeshBasicMaterial({ color: '#8fcf5a', transparent: true, opacity: 0 })), []);

  useEffect(() => {
    const g = host.current;
    if (!g) return;
    const k = g.scale.x;
    g.scale.setScalar(1);
    g.updateWorldMatrix(true, true);
    const targets: THREE.Object3D[] = [];
    g.traverse((o: any) => { if (o.isMesh && o.userData.tag && o.userData.tag !== 'face' && o.userData.tag !== 'dirt') targets.push(o); });
    const ray = new THREE.Raycaster();
    const inv = g.matrixWorld.clone().invert();
    const out: Hit[] = [];
    for (const [x, y] of ch.spots) {
      const o = new THREE.Vector3(x, y, 3).applyMatrix4(g.matrixWorld);
      const d = new THREE.Vector3(0, 0, -1).transformDirection(g.matrixWorld);
      ray.set(o, d);
      const hit = ray.intersectObjects(targets, false)[0];
      if (!hit || !hit.face) continue;
      const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).transformDirection(inv);
      out.push({ p: hit.point.clone().applyMatrix4(inv), n });
    }
    g.scale.setScalar(k);
    setHits(out);
  }, [version]);

  useFrame(() => {
    if (!stink.current) return;
    const now = performance.now() / 1000;
    stink.current.children.forEach((c, i) => {
      const t = (now * 0.45 + i / 3) % 1;
      c.position.z = ch.top + t * 0.35;
      stinkMats[i].opacity = Math.sin(t * Math.PI) * 0.85;
    });
  });

  const q = (n: THREE.Vector3) => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);

  return (
    <group>
      {it.stains ? hits.map((h, i) => (
        <mesh key={'s' + i} geometry={stainGeo} material={stainMat} position={h.p.clone().addScaledVector(h.n, 0.004)}
          quaternion={q(h.n).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), i * 1.7))}
          scale={0.2 + (i % 3) * 0.04} userData={{ tag: 'dirt' }} />
      )) : null}
      {it.fur ? hits.map((h, i) => (
        <group key={'f' + i} position={h.p.clone().addScaledVector(h.n, 0.006).add(new THREE.Vector3(i % 2 ? -0.13 : 0.13, -0.08, 0))} quaternion={q(h.n)}>
          {Array.from({ length: 9 }, (_, j) => (
            <mesh key={j} geometry={hair} material={hairMat}
              position={[Math.cos(j * 2.4 + i) * 0.09 * ((j % 3) + 1) / 3, Math.sin(j * 2.4 + i) * 0.09 * ((j % 3) + 1) / 3, 0]}
              rotation={[0, Math.PI / 2, j * 1.3 + i]} />
          ))}
        </group>
      )) : null}
      {it.odor ? (
        <group ref={stink}>
          {[-0.25, 0, 0.25].map((x, i) => <mesh key={i} geometry={stinkGeo} material={stinkMats[i]} position={[x, 0.05, ch.top]} />)}
        </group>
      ) : null}
    </group>
  );
}

export function Furniture({ type, it, signals, onFit, onPick }: {
  type: ItemType;
  it: Item;
  signals: React.MutableRefObject<Signals>;
  onFit?: (box: THREE.Box3) => void;
  onPick?: (tag: string) => void;
}) {
  const geos = useParts();
  const group = useRef<THREE.Group>(null!);
  const pop = useRef(0);

  const mats = useMemo(() => {
    const fabric = it.fabric ?? 'velour';
    const [mattress, band] = mattressMaterials();
    return {
      fabric: fabricMaterial(fabric, COLORS[it.color ?? 0].hex),
      pillow: fabricMaterial('velour', (it.color ?? 0) === 3 ? '#5b5e5f' : '#f3e6cf'),
      wood: woodMaterial, metal: metalMaterial, plinth: plinthMaterial, mattress, band,
    } as Record<string, THREE.Material>;
  }, [it.fabric, it.color]);

  const parts = useMemo(() => {
    if (type === 'sofa') return sofaParts(it, it.seats);
    if (type === 'armchair') return sofaParts({ ...it, corner: false }, 1);
    if (type === 'chair') return chairParts(it);
    if (type === 'mattress') return mattressParts(it);
    return [];
  }, [type, it]);

  const ch = useMemo(() => character(type, it), [type, it]);
  const shape = [type, it.seats, it.corner, it.arm, it.legs, it.pillows, it.count, it.size, it.w, it.l, it.pile].join('|');
  const [faces, setFaces] = useState<Face[]>([]);

  useEffect(() => {
    const g = group.current;
    const k = g.scale.x;
    g.scale.setScalar(1);
    g.updateWorldMatrix(true, true);
    setFaces(placeFaces(g, ch.faces));
    g.scale.setScalar(k);
  }, [shape]);

  useEffect(() => { pop.current = performance.now(); }, [type]);
  useEffect(() => {
    if (!onFit) return;
    const g = group.current;
    const k = g.scale.x;
    g.scale.setScalar(1);
    g.updateWorldMatrix(true, true);
    const box = new THREE.Box3();
    g.traverse((o: any) => { if (o.isMesh && o.userData.tag && o.userData.tag !== 'face') box.expandByObject(o); });
    onFit(box);
    g.scale.setScalar(k);
  }, [shape]);

  useFrame(() => {
    const now = performance.now();
    const t = Math.min(1, (now - pop.current) / 520);
    const e = 1 - Math.pow(1 - t, 3);
    const breathe = 1 + Math.sin(now / 650) * 0.008;
    const base = 0.86 + 0.14 * e + Math.sin(t * Math.PI) * 0.03;
    group.current.scale.set(base * (2 - breathe), base * (2 - breathe), base * breathe);
  });

  return (
    <group rotation={[0, Math.PI, 0]}>
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <group
          ref={group}
          onClick={(e) => {
            if (!onPick || e.delta > 6) return;
            e.stopPropagation();
            let o: THREE.Object3D | null = e.object;
            while (o && !o.userData.tag) o = o.parent;
            onPick(o?.userData.tag || 'frame');
          }}
        >
          {type === 'carpet'
            ? <Carpet it={it} />
            : parts.map((p, i) => <Piece key={type + i + p.geo} p={p} index={i} geo={geos[p.geo]} mat={mats[p.mat]} />)}
          <Dirt host={group} ch={ch} it={it} version={shape} />
          {faces.map((f, i) => <group key={shape + 'face' + i} userData={{ tag: 'face' }}><Eyes face={f} signals={signals} /></group>)}
          {ch.arms.map((a, i) => <group key={'arm' + i} userData={{ tag: 'hand' }}><Hand arm={a} signals={signals} index={i} /></group>)}
        </group>
      </group>
    </group>
  );
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
  const type = useConfig((s) => s.type);
  const it = useConfig((s) => s.items[s.type]);
  const pulse = useConfig((s) => s.pulse);
  const picked = useConfig((s) => s.picked);
  const signals = useRef<Signals>({ mood: 'happy', waveAt: performance.now() + 300, waveSide: 0, tapAt: 0 });
  const s = signals.current;
  s.mood = it.stains || it.odor || it.fur ? 'sad' : 'happy';

  useEffect(() => { s.waveAt = performance.now() + 250; s.waveSide = 0; }, [type]);
  useEffect(() => { if (pulse.at && pulse.tag !== 'all') { s.waveAt = performance.now(); s.waveSide = 0; } }, [pulse.at]);
  useEffect(() => { if (picked.at) { s.tapAt = performance.now(); s.waveAt = performance.now(); s.waveSide = 0; } }, [picked.at]);
  useFrame(() => {
    const now = performance.now();
    if (now - s.waveAt > 9000) { s.waveAt = now; s.waveSide = Math.random() > 0.5 ? 1 : -1; }
  });
  return { signals, type, it };
}

function Scene({ onTouch }: { onTouch: () => void }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const { signals, type, it } = useSignals();
  const pick = useConfig((s) => s.pick);
  const fit = useMemo(() => ({ target: new THREE.Vector3(0, 0.4, 0), dist: 4 }), []);
  const box = useRef<THREE.Box3 | null>(null);
  const idle = useRef<any>(null);
  const controls = useRef<any>(null);

  const refit = () => {
    if (!box.current) return;
    const s = box.current.getSize(new THREE.Vector3());
    const c = box.current.getCenter(new THREE.Vector3());
    const v = THREE.MathUtils.degToRad(camera.fov) / 2;
    const h = Math.atan(Math.tan(v) * (size.width / size.height));
    const wide = Math.hypot(s.x, s.z);
    const d = Math.max(wide / 2 / Math.tan(h), s.y / 2 / Math.tan(v)) + wide / 2;
    fit.dist = d * (type === 'carpet' ? 0.8 : type === 'sofa' ? 0.88 : 1);
    fit.target.set(c.x, type === 'carpet' ? 0 : c.y * 0.85, c.z);
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
      <directionalLight position={[2.5, 4.5, 3]} intensity={1.4} color="#fff4e6" castShadow
        shadow-mapSize={[1024, 1024]} shadow-bias={-0.0005}
        shadow-camera-left={-3} shadow-camera-right={3} shadow-camera-top={3} shadow-camera-bottom={-3} />
      <Furniture type={type} it={it} signals={signals} onPick={pick} onFit={(b) => { box.current = b; refit(); }} />
      <ContactShadows position={[0, 0.001, 0]} opacity={0.42} scale={7} blur={2.6} far={1.4} resolution={512} color="#3b2f22" />
      <OrbitControls ref={controls} makeDefault enablePan={false} enableDamping dampingFactor={0.08}
        minPolarAngle={0.5} maxPolarAngle={1.45} minDistance={1.2} maxDistance={9}
        autoRotate autoRotateSpeed={0.55} rotateSpeed={0.8}
        onStart={() => { onTouch(); clearTimeout(idle.current); if (controls.current) controls.current.autoRotate = false; }}
        onEnd={() => { idle.current = setTimeout(() => controls.current && (controls.current.autoRotate = true), 6000); }} />
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
      camera={{ fov: 30, position: [2.6, 1.6, 3.8], near: 0.05, far: 50 }}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.AgXToneMapping, toneMappingExposure: 1.1 }}
    >
      <Suspense fallback={null}>
        <Scene onTouch={onTouch} />
      </Suspense>
    </Canvas>
  );
}

useGLTF.preload(GLB, false, true);
