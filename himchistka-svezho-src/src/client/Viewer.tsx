import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, OrbitControls, useGLTF } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useConfig, type Item } from './config';
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

function Furniture({ onFit }: { onFit: (box: THREE.Box3) => void }) {
  const it = useConfig((s) => s.items[s.type]);
  const type = useConfig((s) => s.type);
  const pick = useConfig((s) => s.pick);
  const geos = useParts();
  const group = useRef<THREE.Group>(null!);
  const pop = useRef(0);

  const mats = useMemo(() => {
    const fabric = it.fabric ?? 'velour';
    const [mattress, band] = mattressMaterials();
    return {
      fabric: fabricMaterial(fabric, COLORS[it.color ?? 0].hex),
      pillow: fabricMaterial('velour', (it.color ?? 0) === 3 ? '#5b5e5f' : '#e6dccb'),
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

  useEffect(() => { pop.current = performance.now(); }, [type]);
  useEffect(() => {
    const g = group.current;
    const k = g.scale.x;
    g.scale.setScalar(1);
    g.updateWorldMatrix(true, true);
    onFit(new THREE.Box3().setFromObject(g));
    g.scale.setScalar(k);
  }, [parts, type, it.w, it.l]);

  useFrame(() => {
    const t = Math.min(1, (performance.now() - pop.current) / 520);
    const e = 1 - Math.pow(1 - t, 3);
    group.current.scale.setScalar(0.86 + 0.14 * e + Math.sin(t * Math.PI) * 0.03);
  });

  return (
    <group rotation={[0, Math.PI, 0]}>
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <group
        ref={group}
        onClick={(e) => {
          if (e.delta > 6) return;
          e.stopPropagation();
          pick(e.object.userData.tag);
        }}
      >
        {type === 'carpet'
          ? <Carpet it={it} />
          : parts.map((p, i) => <Piece key={type + i + p.geo} p={p} index={i} geo={geos[p.geo]} mat={mats[p.mat]} />)}
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

function Scene({ onTouch }: { onTouch: () => void }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const type = useConfig((s) => s.type);
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
      <Furniture onFit={(b) => { box.current = b; refit(); }} />
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

export default function Viewer({ onTouch }: { onTouch: () => void }) {
  return (
    <Canvas
      shadows
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
