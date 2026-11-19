import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

export type Mood = 'happy' | 'sad' | 'surprised' | 'joy';

export type Face = {
  pos: [number, number, number];
  normal?: [number, number, number];
  size: number;
  mouth?: boolean;
  up?: boolean;
  tilt?: number;
};

export type Arm = {
  pos: [number, number, number];
  side: 1 | -1;
  size: number;
};

export type Signals = { mood: Mood; waveAt: number; waveSide: 0 | 1 | -1; tapAt: number };

const white = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.25 });
const ink = new THREE.MeshStandardMaterial({ color: '#1d1f24', roughness: 0.2 });
const mouthMat = new THREE.MeshStandardMaterial({ color: '#5a1f22', roughness: 0.5 });
const tongue = new THREE.MeshStandardMaterial({ color: '#ff7a6b', roughness: 0.5 });
const sponge = new THREE.MeshStandardMaterial({ color: '#ffd23f', roughness: 0.85 });
const scrub = new THREE.MeshStandardMaterial({ color: '#12a899', roughness: 0.9 });
const cheek = new THREE.MeshBasicMaterial({ color: '#ff8a7a', transparent: true, opacity: 0.55, depthWrite: false });

const sphere = new THREE.SphereGeometry(1, 32, 20);
const disc = new THREE.CircleGeometry(1, 24);
const halfDisc = new THREE.CircleGeometry(1, 24, Math.PI, Math.PI);
const arc = new THREE.TorusGeometry(1, 0.2, 10, 28, Math.PI);
const brow = new THREE.CapsuleGeometry(0.18, 1, 4, 10);

const armCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(-0.12, 0, 0.02),
  new THREE.Vector3(-0.24, 0, -0.02),
  new THREE.Vector3(-0.32, 0, 0.02),
]);
const armTube = new THREE.TubeGeometry(armCurve, 24, 0.028, 10, false);

export function Eyes({ face, signals }: { face: Face; signals: React.MutableRefObject<Signals> }) {
  const camera = useThree((s) => s.camera);
  const group = useRef<THREE.Group>(null!);
  const beads = useRef<THREE.Group[]>([]);
  const arcs = useRef<THREE.Mesh[]>([]);
  const brows = useRef<THREE.Mesh[]>([]);
  const mouth = useRef<THREE.Group>(null);
  const blink = useRef({ next: performance.now() + 1500 + Math.random() * 2500, until: 0 });
  const look = useMemo(() => new THREE.Vector3(), []);
  const r = face.size;
  const low = face.up ? r * 0.3 : 0;
  const quat = useMemo(() => {
    const z = new THREE.Vector3(...(face.normal || (face.up ? [0, 0, 1] : [0, 1, 0]))).normalize();
    const ref = face.up ? new THREE.Vector3(0, -1, 0) : new THREE.Vector3(0, 0, 1);
    const y = ref.sub(z.clone().multiplyScalar(ref.dot(z))).normalize();
    const x = new THREE.Vector3().crossVectors(y, z);
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  }, [face.up, face.normal?.join()]);

  useFrame(() => {
    const now = performance.now();
    const b = blink.current;
    if (now > b.next) { b.until = now + 130; b.next = now + 2200 + Math.random() * 3500; }
    const s = signals.current;
    const surprised = s.mood === 'surprised' || now - s.tapAt < 700;
    const joy = s.mood === 'joy';
    const sad = s.mood === 'sad';
    group.current.worldToLocal(look.copy(camera.position)).normalize();

    beads.current.forEach((e, i) => {
      if (!e) return;
      e.visible = !joy;
      const open = now < b.until ? 0.1 : surprised ? 1.2 : 1;
      e.scale.y += (open - e.scale.y) * 0.45;
      e.position.x = (i ? 1 : -1) * r * 0.78 + look.x * r * 0.12;
      e.position.y = look.y * r * 0.1;
    });
    arcs.current.forEach((m) => m && (m.visible = joy));
    brows.current.forEach((m, i) => {
      if (!m) return;
      const side = i ? -1 : 1;
      m.visible = sad || surprised;
      const tilt = sad ? 0.5 * side : -0.2 * side;
      m.rotation.z += (Math.PI / 2 + tilt - m.rotation.z) * 0.2;
      m.position.y = r * (surprised ? 0.95 : 0.8);
    });
    if (mouth.current) {
      mouth.current.rotation.z += ((sad ? Math.PI : 0) - mouth.current.rotation.z) * 0.2;
      mouth.current.position.y = -r * (sad ? 0.75 : 0.5) - low;
      const k = joy ? 1.45 : surprised ? 1.25 : sad ? 0.75 : 1;
      mouth.current.scale.setScalar(mouth.current.scale.x + (r * 0.42 * k - mouth.current.scale.x) * 0.3);
    }
  });

  return (
    <group ref={group} position={face.pos} quaternion={quat}>
      {[-1, 1].map((side, i) => (
        <group key={side}>
          <group ref={(el) => { if (el) beads.current[i] = el; }}>
            <mesh geometry={sphere} material={ink} scale={[r * 0.4, r * 0.56, r * 0.3]} />
            <mesh geometry={sphere} material={white} position={[r * 0.13, r * 0.22, r * 0.22]} scale={r * 0.13} />
            <mesh geometry={sphere} material={white} position={[-r * 0.1, -r * 0.2, r * 0.22]} scale={r * 0.06} />
          </group>
          <mesh ref={(el) => { if (el) arcs.current[i] = el; }} geometry={arc} material={ink}
            position={[side * r * 0.78, -r * 0.1, r * 0.06]} scale={[r * 0.34, r * 0.34, r * 0.5]} visible={false} />
          <mesh ref={(el) => { if (el) brows.current[i] = el; }} geometry={brow} material={ink}
            position={[side * r * 0.82, r * 0.8, r * 0.1]} rotation={[0, 0, Math.PI / 2]} scale={[r * 0.4, r * 0.36, r * 0.3]} visible={false} />
          {face.mouth !== false ? <mesh geometry={disc} material={cheek} position={[side * r * 1.45, -r * 0.55 - low, r * 0.08]} scale={r * 0.38} /> : null}
        </group>
      ))}
      {face.mouth !== false ? (
        <group ref={mouth} position={[0, -r * 0.5, r * 0.12]} scale={r * 0.42}>
          <mesh geometry={halfDisc} material={mouthMat} />
          <mesh geometry={halfDisc} material={tongue} position={[0, -0.45, 0.01]} scale={0.5} />
        </group>
      ) : null}
    </group>
  );
}

export function Hand({ arm, signals, index }: { arm: Arm; signals: React.MutableRefObject<Signals>; index: number }) {
  const pivot = useRef<THREE.Group>(null!);
  const seed = useMemo(() => Math.random() * 10, []);

  useFrame(() => {
    const now = performance.now();
    const s = signals.current;
    const t = (now - s.waveAt) / 1600;
    const mine = s.waveSide === 0 || s.waveSide === arm.side;
    const idle = Math.sin(now / 900 + seed) * 0.08;
    let angle = 0.35 + idle;
    let roll = 0;
    if (mine && t >= 0 && t < 1) {
      const lift = Math.sin(Math.min(1, t * 3) * Math.PI / 2) * (t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1);
      angle = 0.35 + idle + lift * 0.9 + Math.sin(now / 70) * 0.4 * lift;
      roll = Math.sin(now / 70) * 0.2 * lift;
    }
    if (s.mood === 'joy') angle = 1.15 + Math.sin(now / 90 + index) * 0.35;
    pivot.current.rotation.y = angle;
    pivot.current.rotation.x = roll;
  });

  return (
    <group position={arm.pos} rotation={[0, 0, arm.side === -1 ? 0 : Math.PI]}>
      <group scale={arm.size}>
        <group ref={pivot}>
          <mesh geometry={armTube} material={ink} castShadow />
          <group position={[-0.35, 0, 0.02]}>
            <mesh geometry={sphere} material={sponge} scale={[0.064, 0.052, 0.058]} castShadow />
            <mesh geometry={sphere} material={sponge} position={[0.012, 0.042, 0.028]} scale={0.025} />
            <mesh geometry={sphere} material={scrub} position={[0.05, 0, 0]} scale={[0.02, 0.046, 0.046]} />
          </group>
        </group>
      </group>
    </group>
  );
}
