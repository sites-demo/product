import * as THREE from 'three';
import { HD } from '../lib/variant';

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
  velour: () => canvasTexture(256, (ctx, s) => { flat(ctx, s); grain(ctx, s, 60); }, 9),
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
export const bump = (k: string) => (cache[k] ||= bumps[k]());

let mottle: THREE.Texture | null = null;
function tone() {
  if (mottle) return mottle;
  mottle = canvasTexture(256, (ctx, s) => {
    flat(ctx, s, '#f4f4f4');
    for (let i = 0; i < 70; i++) {
      const x = Math.random() * s, y = Math.random() * s, r = 18 + Math.random() * 46;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const v = Math.random() > 0.5 ? '255,255,255' : '205,205,205';
      g.addColorStop(0, `rgba(${v},${HD ? 0.16 : 0.35})`);
      g.addColorStop(1, `rgba(${v},0)`);
      ctx.fillStyle = g;
      for (const ox of [-s, 0, s]) for (const oy of [-s, 0, s]) { ctx.save(); ctx.translate(ox, oy); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.restore(); }
    }
  }, 2);
  mottle.colorSpace = THREE.SRGBColorSpace;
  return mottle;
}

export function fabricMaterial(fabric: string, hex: string): THREE.Material {
  const color = new THREE.Color(hex);
  const tint = (k: number) => color.clone().lerp(new THREE.Color('#ffffff'), k);
  const base = { color, map: tone(), bumpMap: bump(fabric), vertexColors: HD };
  switch (fabric) {
    case 'velour':
      return new THREE.MeshPhysicalMaterial({ ...base, roughness: 0.92, sheen: 1, sheenRoughness: 0.4, sheenColor: tint(0.5), bumpScale: 0.9 });
    case 'rogozhka':
      return new THREE.MeshStandardMaterial({ ...base, roughness: 0.95, bumpScale: 1.6 });
    case 'micro':
      return new THREE.MeshPhysicalMaterial({ ...base, roughness: 0.8, sheen: 0.4, sheenRoughness: 0.7, sheenColor: tint(0.3), bumpScale: 0.3 });
    default:
      return new THREE.MeshPhysicalMaterial({ ...base, roughness: 0.42, clearcoat: 0.25, clearcoatRoughness: 0.5, bumpScale: 0.5 });
  }
}

function woodGrain() {
  const t = canvasTexture(512, (ctx, s) => {
    flat(ctx, s, '#a8794f');
    for (let i = 0; i < 140; i++) {
      const x = Math.random() * s, w = 0.6 + Math.random() * 2.6, a = 0.08 + Math.random() * 0.22;
      ctx.strokeStyle = Math.random() > 0.3 ? `rgba(70,40,20,${a})` : `rgba(235,200,160,${a * 0.7})`;
      ctx.lineWidth = w;
      ctx.beginPath();
      for (let y = -10; y <= s + 10; y += 16) {
        const xx = x + Math.sin(y / 70 + i) * 4 + Math.sin(y / 23 + i * 3) * 1.2;
        if (y < 0) ctx.moveTo(xx, y); else ctx.lineTo(xx, y);
      }
      ctx.stroke();
    }
  }, 1);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export const woodMaterial = HD
  ? new THREE.MeshPhysicalMaterial({ color: '#c9a07a', map: woodGrain(), roughness: 0.48, clearcoat: 0.35, clearcoatRoughness: 0.35, vertexColors: true })
  : new THREE.MeshStandardMaterial({ color: '#8a5b38', roughness: 0.55 });
export const metalMaterial = new THREE.MeshStandardMaterial({ color: '#2b2b2b', roughness: 0.35, metalness: 0.8, vertexColors: HD });
export const plinthMaterial = new THREE.MeshStandardMaterial({ color: '#2f2d2b', roughness: 0.8, vertexColors: HD });
export const brassMaterial = new THREE.MeshStandardMaterial({ color: '#d8b77e', roughness: 0.32, metalness: 0.85, envMapIntensity: 1.6, vertexColors: HD });

// стёжка матраса: ромбы строчкой поверх тонкой ткани
function quilt() {
  return canvasTexture(512, (ctx, s) => {
    flat(ctx, s, '#9a9a9a');
    grain(ctx, s, 26);
    ctx.strokeStyle = 'rgba(30,30,30,.9)';
    ctx.lineWidth = 3;
    ctx.setLineDash([9, 5]);
    for (let k = -s; k <= s * 2; k += s / 4) {
      ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k + s, s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(k, s); ctx.lineTo(k + s, 0); ctx.stroke();
    }
  }, 0.4);
}

let mattress: THREE.Material[] | null = null;
export function mattressMaterials() {
  return (mattress ||= [
    new THREE.MeshPhysicalMaterial({ color: '#f1ede6', roughness: 0.9, sheen: 0.6, sheenColor: new THREE.Color('#ffffff'), bumpMap: HD ? quilt() : bump('rogozhka'), bumpScale: HD ? 2.4 : 0.6, vertexColors: HD }),
    new THREE.MeshStandardMaterial({ color: '#6c7c86', roughness: 0.8, bumpMap: bump('micro'), vertexColors: HD }),
  ]);
}

// ковёр с медальоном, бордюром и мелким узором поля, неровный тон «абраш»
function rugTextureHD(hex: string, pile: string) {
  const s = 1024;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d')!;
  const base = new THREE.Color(hex);
  const mix = (k: number, to = '#f3ede2') => '#' + base.clone().lerp(new THREE.Color(to), k).getHexString();
  const field = mix(0.62), cream = mix(0.82), mid = mix(0.3), deep = '#' + base.clone().multiplyScalar(0.62).getHexString();
  const ink = '#' + base.clone().multiplyScalar(0.38).getHexString();
  flat(ctx, s, field);
  const diamond = (x: number, y: number, rx: number, ry: number, fill: string) => {
    ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(x, y - ry); ctx.lineTo(x + rx, y); ctx.lineTo(x, y + ry); ctx.lineTo(x - rx, y); ctx.closePath(); ctx.fill();
  };
  const star = (x: number, y: number, r: number, fill: string) => {
    ctx.fillStyle = fill; ctx.beginPath();
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill();
  };
  // поле: мелкий повторяющийся узор
  const step = s / 14;
  for (let y = step * 1.5; y < s - step; y += step) for (let x = step * 1.5; x < s - step; x += step) {
    const odd = Math.round((x + y) / step) % 2;
    if (odd) star(x, y, step * 0.16, mid); else diamond(x, y, step * 0.1, step * 0.14, deep);
  }
  // медальон
  const m = s / 2;
  diamond(m, m, s * 0.24, s * 0.3, ink);
  diamond(m, m, s * 0.225, s * 0.285, hex);
  diamond(m, m, s * 0.17, s * 0.22, cream);
  for (let i = 0; i < 8; i++) {
    ctx.save(); ctx.translate(m, m); ctx.rotate((i / 8) * Math.PI * 2);
    ctx.fillStyle = i % 2 ? deep : hex; ctx.beginPath(); ctx.ellipse(0, -s * 0.075, s * 0.022, s * 0.06, 0, 0, 7); ctx.fill();
    ctx.restore();
  }
  star(m, m, s * 0.05, ink);
  ctx.fillStyle = cream; ctx.beginPath(); ctx.arc(m, m, s * 0.016, 0, 7); ctx.fill();
  for (const sy of [-1, 1]) { diamond(m, m + sy * s * 0.34, s * 0.05, s * 0.05, hex); diamond(m, m + sy * s * 0.34, s * 0.025, s * 0.025, cream); }
  // угловые четверти медальона
  const b = s * 0.13;
  for (const [cx, cy] of [[b, b], [s - b, b], [b, s - b], [s - b, s - b]]) {
    ctx.save(); ctx.beginPath(); ctx.rect(b, b, s - 2 * b, s - 2 * b); ctx.clip();
    diamond(cx, cy, s * 0.15, s * 0.15, hex); diamond(cx, cy, s * 0.11, s * 0.11, cream); diamond(cx, cy, s * 0.06, s * 0.06, deep);
    ctx.restore();
  }
  // бордюр: широкая полоса с бегущим узором и тонкие охранные полосы
  const band = s * 0.085, o = s * 0.03;
  ctx.fillStyle = hex; ctx.fillRect(o, o, s - 2 * o, band); ctx.fillRect(o, s - o - band, s - 2 * o, band);
  ctx.fillRect(o, o, band, s - 2 * o); ctx.fillRect(s - o - band, o, band, s - 2 * o);
  const run = (n: number, at: (t: number) => [number, number]) => {
    for (let i = 0; i <= n; i++) { const [x, y] = at(i / n); if (i % 2) star(x, y, band * 0.26, cream); else diamond(x, y, band * 0.2, band * 0.3, deep); }
  };
  const bc = o + band / 2;
  run(22, (t) => [bc + t * (s - 2 * bc), bc]); run(22, (t) => [bc + t * (s - 2 * bc), s - bc]);
  run(22, (t) => [bc, bc + t * (s - 2 * bc)]); run(22, (t) => [s - bc, bc + t * (s - 2 * bc)]);
  ctx.lineWidth = s * 0.006;
  for (const [k, col] of [[o - s * 0.008, deep], [o + band + s * 0.008, ink], [o + band + s * 0.022, mid]] as [number, string][]) {
    ctx.strokeStyle = col; ctx.strokeRect(k, k, s - 2 * k, s - 2 * k);
  }
  // абраш и ворс
  const img = ctx.getImageData(0, 0, s, s);
  const d = img.data;
  const amp = pile === 'long' ? 30 : 16;
  for (let y = 0; y < s; y++) {
    const ab = Math.sin(y / 37) * 4 + Math.sin(y / 11.3) * 2;
    for (let x = 0; x < s; x++) {
      const i = (y * s + x) * 4;
      const n = (Math.random() - 0.5) * amp + ab;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function rugTexture(hex: string, pile: string) {
  if (HD) return rugTextureHD(hex, pile);
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
