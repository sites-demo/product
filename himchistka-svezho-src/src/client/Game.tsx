import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Furniture } from './Viewer';
import type { Item } from './config';
import type { Signals } from './Mascot';
import { Icon } from '../ui/icons';

type Pt = [number, number];
type Spot = { x: number; y: number; rx: number; ry: number };
type Scan = { pts: Pt[]; faces: Spot[]; mask: HTMLCanvasElement };

const NAMES: Record<string, string> = { sofa: 'диван', armchair: 'кресло', chair: 'стулья', mattress: 'матрас', carpet: 'ковёр' };

function Stage({ item, signals, onScan }: { item: Item; signals: React.MutableRefObject<Signals>; onScan: (s: Scan) => void }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const { scene, gl, size } = useThree();
  const box = useRef<THREE.Box3 | null>(null);
  const shadow = useRef<THREE.Group>(null);
  const phase = useRef({ at: 0, done: false });
  const clean = useMemo(() => ({ ...item, stains: false, odor: false, fur: false }), [item]);

  const place = () => {
    const b = box.current;
    if (!b || phase.current.done) return;
    const top = item.type === 'carpet';
    const c = b.getCenter(new THREE.Vector3());
    const look = new THREE.Vector3(c.x, top ? 0 : c.y * 0.8, c.z);
    const dir = new THREE.Vector3(top ? 0.1 : 0.42, top ? 1.5 : 0.5, 1).normalize();
    const pad = top ? 0.05 : 0.32;
    const corners: THREE.Vector3[] = [];
    for (const x of [b.min.x - pad, b.max.x + pad]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) corners.push(new THREE.Vector3(x, y, z));
    camera.aspect = size.width / size.height;
    camera.updateProjectionMatrix();
    let lo = 0.5, hi = 30;
    for (let i = 0; i < 24; i++) {
      const d = (lo + hi) / 2;
      camera.position.copy(look).addScaledVector(dir, d);
      camera.lookAt(look);
      camera.updateMatrixWorld();
      const fits = corners.every((v) => { const p = v.clone().project(camera); return Math.abs(p.x) < 0.92 && p.y < 0.62 && p.y > -0.9; });
      if (fits) hi = d; else lo = d;
    }
    camera.position.copy(look).addScaledVector(dir, hi);
    camera.lookAt(look);
    camera.updateMatrixWorld();
    phase.current = { at: performance.now(), done: false };
  };
  useEffect(place, [size.width, size.height]);

  useFrame(() => {
    const p = phase.current;
    if (p.done || !p.at || performance.now() - p.at < 700) return;
    p.done = true;

    const meshes: THREE.Object3D[] = [];
    const hands: THREE.Object3D[] = [];
    const faces: Spot[] = [];
    scene.traverse((o: any) => {
      const tag = o.userData.tag;
      if (o.isMesh && tag && tag !== 'dirt') meshes.push(o);
      if (tag === 'hand') hands.push(o);
      if (tag === 'face') {
        const fb = new THREE.Box3().setFromObject(o);
        if (fb.isEmpty()) return;
        const pts = [fb.min, fb.max, new THREE.Vector3(fb.min.x, fb.max.y, fb.min.z), new THREE.Vector3(fb.max.x, fb.min.y, fb.max.z)]
          .map((v) => v.clone().project(camera));
        const xs = pts.map((v) => (v.x + 1) / 2 * size.width), ys = pts.map((v) => (1 - v.y) / 2 * size.height);
        const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
        faces.push({ x: (x0 + x1) / 2, y: (y0 + y1) / 2, rx: (x1 - x0) / 2 + 10, ry: (y1 - y0) / 2 + 10 });
      }
    });

    const ray = new THREE.Raycaster();
    const pts: Pt[] = [];
    const cols = 24, rows = 20;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const x = (i + 0.5) / cols, y = (j + 0.5) / rows;
      ray.setFromCamera(new THREE.Vector2(x * 2 - 1, -(y * 2 - 1)), camera);
      const hit = ray.intersectObjects(meshes, false)[0];
      if (hit && hit.object.userData.tag !== 'leg') pts.push([x * size.width, y * size.height]);
    }

    hands.forEach((o) => (o.visible = false));
    if (shadow.current) shadow.current.visible = false;
    gl.render(scene, camera);
    const mask = document.createElement('canvas');
    mask.width = gl.domElement.width;
    mask.height = gl.domElement.height;
    mask.getContext('2d')!.drawImage(gl.domElement, 0, 0);
    hands.forEach((o) => (o.visible = true));
    if (shadow.current) shadow.current.visible = true;

    onScan({ pts, faces, mask });
  });

  return (
    <>
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={2.2} position={[0, 4, 1]} rotation-x={Math.PI / 2} scale={[6, 4, 1]} />
        <Lightformer form="rect" intensity={1.1} position={[-4, 1.5, 2]} rotation-y={Math.PI / 2} scale={[4, 2, 1]} color="#fff3e2" />
        <Lightformer form="circle" intensity={1.4} position={[2, 2.5, 4]} scale={1.5} color="#fff8ee" />
      </Environment>
      <hemisphereLight args={['#fffaf2', '#d8cab4', 0.5]} />
      <directionalLight position={[2.5, 4.5, 3]} intensity={1.4} color="#fff4e6" />
      <Furniture type={item.type} it={clean} signals={signals} onFit={(b) => { box.current = b; place(); }} />
      <group ref={shadow}>
        <ContactShadows position={[0, 0.001, 0]} opacity={0.35} scale={7} blur={2.6} far={1.4} resolution={256} color="#3b2f22" />
      </group>
    </>
  );
}

function paintDirt(c: HTMLCanvasElement, scan: Scan) {
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  const k = c.width / c.clientWidth;
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  ctx.save();
  ctx.scale(k, k);
  for (const [x, y] of scan.pts) {
    const r = 30 + rnd() * 12;
    const g = ctx.createRadialGradient(x, y, 2, x, y, r);
    g.addColorStop(0, 'rgba(128, 108, 78, .5)');
    g.addColorStop(1, 'rgba(128, 108, 78, 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  }
  for (const [x, y] of scan.pts.filter(() => rnd() < 0.1)) {
    const r = 12 + rnd() * 16;
    for (let n = 0; n < 4; n++) {
      const ox = x + (rnd() - 0.5) * r, oy = y + (rnd() - 0.5) * r * 0.7, rr = r * (0.45 + rnd() * 0.55);
      const g = ctx.createRadialGradient(ox, oy, 1, ox, oy, rr);
      g.addColorStop(0, 'rgba(96, 62, 30, .8)');
      g.addColorStop(0.7, 'rgba(110, 74, 38, .55)');
      g.addColorStop(1, 'rgba(110, 74, 38, 0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(ox, oy, rr, 0, 7); ctx.fill();
    }
  }
  ctx.strokeStyle = 'rgba(70, 58, 44, .5)';
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  for (const [x, y] of scan.pts.filter(() => rnd() < 0.35)) {
    for (let n = 0; n < 3; n++) {
      const a = rnd() * Math.PI, l = 5 + rnd() * 7, ox = x + (rnd() - 0.5) * 20, oy = y + (rnd() - 0.5) * 20;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.quadraticCurveTo(ox + Math.cos(a) * l * 0.6 + 2, oy + Math.sin(a) * l * 0.6, ox + Math.cos(a) * l, oy + Math.sin(a) * l); ctx.stroke();
    }
  }
  ctx.restore();

  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(scan.mask, 0, 0, c.width, c.height);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.save();
  ctx.scale(k, k);
  for (const f of scan.faces) {
    const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 1);
    g.addColorStop(0.6, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.scale(f.rx, f.ry);
    ctx.translate(-f.x, -f.y);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(f.x, f.y, 1, 0, 7); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  ctx.globalCompositeOperation = 'source-over';
}

function dirty(c: HTMLCanvasElement) {
  const d = c.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 3; i < d.length; i += 16) if (d[i] > 36) n++;
  return n;
}

const LINES: [number, string][] = [
  [0, 'Ой, я весь в пыли. Потрите меня пальцем'],
  [25, 'Хи-хи, щекотно! Ещё'],
  [55, 'Уже дышится легче'],
  [80, 'Почти как новый, чуть-чуть осталось'],
];

export default function Game({ item, reward, onWin, onClose }: { item: Item; reward: string; onWin: () => void; onClose: () => void }) {
  const signals = useRef<Signals>({ mood: 'sad', waveAt: performance.now() + 800, waveSide: 0, tapAt: 0 });
  const wrap = useRef<HTMLDivElement>(null);
  const dirt = useRef<HTMLCanvasElement>(null);
  const foamHost = useRef<HTMLDivElement>(null);
  const start = useRef(1);
  const last = useRef<Pt | null>(null);
  const checked = useRef(0);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [touched, setTouched] = useState(false);
  const [won, setWon] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const onScan = (scan: Scan) => {
    const c = dirt.current;
    if (!c) return;
    const k = Math.min(devicePixelRatio, 1.5);
    c.width = Math.round(c.clientWidth * k);
    c.height = Math.round(c.clientHeight * k);
    paintDirt(c, scan);
    start.current = dirty(c) || 1;
    setReady(true);
  };

  const measure = () => {
    const c = dirt.current;
    if (!c || won || !ready) return;
    const p = Math.max(0, Math.min(100, Math.round((1 - dirty(c) / start.current) * 100)));
    setProgress(p);
    signals.current.mood = p >= 55 ? 'happy' : 'sad';
    if (p >= 92) {
      c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
      setProgress(100);
      setWon(true);
      signals.current.mood = 'joy';
      onWin();
    }
  };

  const foam = (x: number, y: number) => {
    const host = foamHost.current;
    if (!host) return;
    const b = document.createElement('i');
    const s = 8 + Math.random() * 14;
    b.style.cssText = `left:${x - s / 2}px;top:${y - s / 2}px;width:${s}px;height:${s}px;--dx:${Math.round((Math.random() - 0.5) * 50)}px`;
    host.appendChild(b);
    setTimeout(() => b.remove(), 900);
  };

  const scrub = (x: number, y: number) => {
    const c = dirt.current;
    if (!c || won || !ready) return;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    const k = c.width / c.clientWidth;
    const [px, py] = last.current || [x + 0.1, y];
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round';
    ctx.lineWidth = 44 * k;
    ctx.beginPath();
    ctx.moveTo(px * k, py * k);
    ctx.lineTo(x * k, y * k);
    ctx.stroke();
    ctx.restore();
    last.current = [x, y];
    if (!touched) setTouched(true);
    if (Math.random() < 0.3) foam(x, y);
    const now = performance.now();
    if (now - signals.current.tapAt > 1800 && Math.random() < 0.04) signals.current.tapAt = now;
    if (now - checked.current > 180) { checked.current = now; measure(); }
  };

  const at = (e: React.PointerEvent): Pt => {
    const r = wrap.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };

  const line = won ? 'Блестит! Так же будет у вас дома' : [...LINES].reverse().find(([p]) => progress >= p)![1];

  const confetti = useMemo(() => Array.from({ length: 40 }, (_, i) => ({
    left: (i * 37) % 100,
    delay: (i % 8) * 0.08,
    color: ['#22705c', '#e9dcc2', '#ffffff', '#c8a46a', '#8fb3a3'][i % 5],
    rot: (i * 47) % 360,
  })), []);

  return (
    <div className="sheet game" role="dialog" aria-modal="true" aria-labelledby="game-title">
      <header className="sheet-top">
        <button className="icon-btn" onClick={onClose} aria-label="Закрыть"><Icon name="close" /></button>
        <h2 id="game-title">Почистите {NAMES[item.type]}</h2>
      </header>
      <div className="game-body">
        <div className="game-meter" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Чистота">
          <i style={{ width: Math.max(progress, 4) + '%' }} />
          <span>{progress}%</span>
        </div>
        <div className="game-stage" ref={wrap}>
          <div className="say" key={line}>{line}</div>
          <Canvas dpr={[1, 2]} camera={{ fov: 30, position: [0, 1.5, 4], near: 0.05, far: 50 }}
            gl={{ antialias: true, alpha: true, toneMapping: THREE.AgXToneMapping, toneMappingExposure: 1.1 }}>
            <Suspense fallback={null}>
              <Stage item={item} signals={signals} onScan={onScan} />
            </Suspense>
          </Canvas>
          <canvas
            ref={dirt}
            className={'game-dirt' + (ready ? ' on' : '')}
            onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); last.current = null; scrub(...at(e)); }}
            onPointerMove={(e) => { if (e.buttons || e.pointerType === 'touch') scrub(...at(e)); }}
            onPointerUp={() => { last.current = null; measure(); }}
            onPointerCancel={() => { last.current = null; measure(); }}
          />
          <div className="game-foam" ref={foamHost} aria-hidden />
          {!ready ? <div className="stage-loading">Пачкаем мебель</div> : null}
          {ready && !touched ? <div className="game-hint" aria-hidden><span /></div> : null}
          {won ? (
            <div className="confetti" aria-hidden>
              {confetti.map((c, i) => <i key={i} style={{ left: c.left + '%', animationDelay: c.delay + 's', background: c.color, rotate: c.rot + 'deg' }} />)}
            </div>
          ) : null}
        </div>
        {won ? (
          <div className="reward">
            {reward ? <><small>Ваш подарок</small><b>{reward}</b><p>Мастер уже видит его в заявке.</p></> : <b>Спасибо, что поиграли!</b>}
            <button className="btn primary wide big" onClick={onClose}>Готово</button>
          </div>
        ) : (
          <p className="fine center">Водите пальцем по мебели, пока не заблестит</p>
        )}
      </div>
    </div>
  );
}
