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

const white = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.25 });
const ink = new THREE.MeshStandardMaterial({ color: '#1d1f24', roughness: 0.35 });
const glove = new THREE.MeshStandardMaterial({ color: '#fffdf7', roughness: 0.5 });
const cheek = new THREE.MeshBasicMaterial({ color: '#ff8a7a', transparent: true, opacity: 0.55, depthWrite: false });

const sphere = new THREE.SphereGeometry(1, 32, 20);
const disc = new THREE.CircleGeometry(1, 24);
const smile = new THREE.TorusGeometry(1, 0.16, 10, 28, Math.PI);
const brow = new THREE.CapsuleGeometry(0.18, 1, 4, 10);

const armCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(-0.12, 0, 0.02),
  new THREE.Vector3(-0.24, 0, -0.02),
  new THREE.Vector3(-0.32, 0, 0.02),
]);
const armTube = new THREE.TubeGeometry(armCurve, 24, 0.028, 10, false);

export type Signals = { mood: Mood; waveAt: number; waveSide: 0 | 1 | -1; tapAt: number };

export function Eyes({ face, signals }: { face: Face; signals: React.MutableRefObject<Signals> }) {
  const camera = useThree((s) => s.camera);
  const group = useRef<THREE.Group>(null!);
  const eyes = useRef<THREE.Group[]>([]);
  const pupils = useRef<THREE.Group[]>([]);
  const brows = useRef<THREE.Mesh[]>([]);
  const mouth = useRef<THREE.Mesh>(null);
  const blink = useRef({ next: performance.now() + 1500 + Math.random() * 2500, until: 0 });
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const r = face.size;
  const gap = r * 1.45;
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
    const closed = now < b.until;

    group.current.worldToLocal(tmp.copy(camera.position)).normalize();
    eyes.current.forEach((e, i) => {
      if (!e) return;
      const open = closed ? 0.12 : joy ? 0.55 : surprised ? 1.18 : 1;
      e.scale.y += (open - e.scale.y) * 0.45;
      const p = pupils.current[i];
      p.position.set(tmp.x * r * 0.42, tmp.y * r * 0.42, r * 0.62);
      p.scale.setScalar(surprised ? 0.38 : 0.5);
    });
    brows.current.forEach((m, i) => {
      if (!m) return;
      const side = i === 0 ? 1 : -1;
      const target = s.mood === 'sad' ? -0.45 * side : surprised ? 0.2 * side : 0.12 * side;
      m.rotation.z += (target - m.rotation.z) * 0.2;
      m.position.y = r * (surprised ? 1.55 : 1.32);
    });
    if (mouth.current) {
      const sad = s.mood === 'sad';
      mouth.current.rotation.z += ((sad ? 0 : Math.PI) - mouth.current.rotation.z) * 0.2;
      const k = joy ? 1.35 : surprised ? 0.7 : 1;
      mouth.current.scale.setScalar(r * 0.55 * k);
      mouth.current.position.y = -r * (sad ? 1.75 : 1.25);
    }
  });

  return (
    <group ref={group} position={face.pos} quaternion={quat}>
      {[-1, 1].map((side, i) => (
        <group key={side} position={[side * gap / 2, 0, 0]}>
          <group ref={(el) => { if (el) eyes.current[i] = el; }}>
            <mesh geometry={sphere} material={white} scale={[r, r, r * 0.55]} />
            <group ref={(el) => { if (el) pupils.current[i] = el; }}>
              <mesh geometry={sphere} material={ink} scale={[r, r, r * 0.4]} />
              <mesh geometry={sphere} material={white} position={[r * 0.18, r * 0.2, r * 0.22]} scale={r * 0.16} />
            </group>
          </group>
          <mesh ref={(el) => { if (el) brows.current[i] = el; }} geometry={brow} material={ink}
            position={[0, r * 1.32, r * 0.2]} rotation={[0, 0, Math.PI / 2]} scale={[r * 0.55, r * 0.5, r * 0.4]} />
          {face.mouth !== false ? (
            <mesh geometry={disc} material={cheek} position={[side * r * 1.05, -r * 1.15, r * 0.12]} scale={r * 0.42} />
          ) : null}
        </group>
      ))}
      {face.mouth !== false ? (
        <mesh ref={mouth} geometry={smile} material={ink} position={[0, -r * 1.25, r * 0.15]} rotation={[0, 0, Math.PI]} scale={r * 0.55} />
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
          <group position={[-0.34, 0, 0.02]}>
            <mesh geometry={sphere} material={glove} scale={[0.058, 0.05, 0.062]} castShadow />
            <mesh geometry={sphere} material={glove} position={[0.01, 0.04, 0.03]} scale={0.024} />
            <mesh geometry={sphere} material={glove} position={[0.045, 0, 0]} scale={[0.02, 0.045, 0.045]} />
          </group>
        </group>
      </group>
    </group>
  );
}
