import * as THREE from 'three';

function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void, repeat: number) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d')!, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 4;
  return t;
}

function grain(ctx: CanvasRenderingContext2D, s: number, amp: number) {
  const img = ctx.getImageData(0, 0, s, s);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = d[i] + (Math.random() - 0.5) * amp;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
}

const flat = (ctx: CanvasRenderingContext2D, s: number, c = '#808080') => { ctx.fillStyle = c; ctx.fillRect(0, 0, s, s); };

const bumps: Record<string, () => THREE.Texture> = {
  rogozhka: () => canvasTexture(256, (ctx, s) => {
    flat(ctx, s);
    const step = 8;
    for (let y = 0; y < s; y += step) for (let x = 0; x < s; x += step) {
      const odd = ((x + y) / step) % 2;
      const g = ctx.createLinearGradient(x, y, odd ? x + step : x, odd ? y : y + step);
      g.addColorStop(0, '#5a5a5a'); g.addColorStop(0.5, '#c8c8c8'); g.addColorStop(1, '#5a5a5a');
      ctx.fillStyle = g;
      ctx.fillRect(x + 0.5, y + 0.5, step - 1, step - 1);
    }
    grain(ctx, s, 30);
  }, 10),
  velour: () => canvasTexture(256, (ctx, s) => { flat(ctx, s); grain(ctx, s, 40); }, 14),
  micro: () => canvasTexture(128, (ctx, s) => { flat(ctx, s); grain(ctx, s, 14); }, 12),
  leather: () => canvasTexture(256, (ctx, s) => {
    flat(ctx, s, '#9a9a9a');
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = `rgba(40,40,40,${Math.random() * 0.25})`;
      ctx.beginPath();
      ctx.arc(Math.random() * s, Math.random() * s, 1 + Math.random() * 3, 0, 7);
      ctx.fill();
    }
    grain(ctx, s, 10);
  }, 8),
};
const cache: Record<string, THREE.Texture> = {};
const bump = (k: string) => (cache[k] ||= bumps[k]());

export function fabricMaterial(fabric: string, hex: string): THREE.Material {
  const color = new THREE.Color(hex);
  const tint = (k: number) => color.clone().lerp(new THREE.Color('#ffffff'), k);
  const base = { color, bumpMap: bump(fabric) };
  switch (fabric) {
    case 'velour':
      return new THREE.MeshPhysicalMaterial({ ...base, roughness: 0.92, sheen: 1, sheenRoughness: 0.45, sheenColor: tint(0.45), bumpScale: 0.4 });
    case 'rogozhka':
      return new THREE.MeshStandardMaterial({ ...base, roughness: 0.95, bumpScale: 1.6 });
    case 'micro':
      return new THREE.MeshPhysicalMaterial({ ...base, roughness: 0.8, sheen: 0.4, sheenRoughness: 0.7, sheenColor: tint(0.3), bumpScale: 0.3 });
    default:
      return new THREE.MeshPhysicalMaterial({ ...base, roughness: 0.42, clearcoat: 0.25, clearcoatRoughness: 0.5, bumpScale: 0.5 });
  }
}

export const woodMaterial = new THREE.MeshStandardMaterial({ color: '#8a5b38', roughness: 0.55 });
export const metalMaterial = new THREE.MeshStandardMaterial({ color: '#2b2b2b', roughness: 0.35, metalness: 0.8 });
export const plinthMaterial = new THREE.MeshStandardMaterial({ color: '#2f2d2b', roughness: 0.8 });

let mattress: THREE.Material[] | null = null;
export function mattressMaterials() {
  return (mattress ||= [
    new THREE.MeshPhysicalMaterial({ color: '#f1ede6', roughness: 0.9, sheen: 0.6, sheenColor: new THREE.Color('#ffffff'), bumpMap: bump('rogozhka'), bumpScale: 0.6 }),
    new THREE.MeshStandardMaterial({ color: '#6c7c86', roughness: 0.8, bumpMap: bump('micro') }),
  ]);
}

export function rugTexture(hex: string, pile: string) {
  const s = 512;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d')!;
  const base = new THREE.Color(hex);
  const light = '#' + base.clone().lerp(new THREE.Color('#f3ede2'), 0.6).getHexString();
  const dark = '#' + base.clone().multiplyScalar(0.7).getHexString();
  flat(ctx, s, light);
  ctx.strokeStyle = hex; ctx.lineWidth = 22; ctx.strokeRect(26, 26, s - 52, s - 52);
  ctx.strokeStyle = dark; ctx.lineWidth = 5; ctx.strokeRect(58, 58, s - 116, s - 116);
  ctx.fillStyle = hex;
  for (let y = 110; y < s - 100; y += 72) for (let x = 110; x < s - 100; x += 72) {
    ctx.save(); ctx.translate(x + 18, y + 18); ctx.rotate(Math.PI / 4); ctx.fillRect(-11, -11, 22, 22); ctx.restore();
  }
  const img = ctx.getImageData(0, 0, s, s);
  const d = img.data;
  const amp = pile === 'long' ? 36 : 18;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * amp;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
