import * as THREE from 'three'

function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Зернистость вспененной изоляции: бесшовный шум превращается в карту нормалей.
export function foamNormalMap(size = 256) {
  const rnd = seeded(11)
  const height = new Float32Array(size * size)
  const smooth = (t: number) => t * t * (3 - 2 * t)
  for (const [cells, amp] of [
    [6, 0.45],
    [14, 0.7],
    [32, 1],
    [64, 0.8],
  ] as const) {
    const lattice = new Float32Array(cells * cells)
    for (let i = 0; i < lattice.length; i++) lattice[i] = rnd()
    for (let y = 0; y < size; y++) {
      const gy = (y / size) * cells
      const y0 = Math.floor(gy)
      const ty = smooth(gy - y0)
      for (let x = 0; x < size; x++) {
        const gx = (x / size) * cells
        const x0 = Math.floor(gx)
        const tx = smooth(gx - x0)
        const a = lattice[y0 * cells + x0]
        const b = lattice[y0 * cells + ((x0 + 1) % cells)]
        const c = lattice[((y0 + 1) % cells) * cells + x0]
        const d = lattice[((y0 + 1) % cells) * cells + ((x0 + 1) % cells)]
        height[y * size + x] += (a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty) * amp
      }
    }
  }
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
  const img = ctx.createImageData(size, size)
  const at = (x: number, y: number) => height[((y + size) % size) * size + ((x + size) % size)]
  const strength = 2.2
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (at(x - 1, y) - at(x + 1, y)) * strength
      const ny = (at(x, y - 1) - at(x, y + 1)) * strength
      const len = Math.hypot(nx, ny, 1)
      const k = (y * size + x) * 4
      img.data[k] = ((nx / len) * 0.5 + 0.5) * 255
      img.data[k + 1] = ((ny / len) * 0.5 + 0.5) * 255
      img.data[k + 2] = ((1 / len) * 0.5 + 0.5) * 255
      img.data[k + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.NoColorSpace
  tex.anisotropy = 4
  return tex
}

// Струи в прозрачном участке трубы: полосы вдоль оси, смещением карты вода течёт.
export function waterStreaks() {
  const rnd = seeded(5)
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 256
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
  ctx.fillStyle = '#6FA3C4'
  ctx.fillRect(0, 0, 128, 256)
  for (let i = 0; i < 90; i++) {
    const x = rnd() * 128
    const y = rnd() * 256
    const len = 26 + rnd() * 90
    ctx.strokeStyle = `rgba(226,242,252,${0.12 + rnd() * 0.42})`
    ctx.lineWidth = 0.8 + rnd() * 1.8
    for (const shift of [0, -256, 256]) {
      ctx.beginPath()
      ctx.moveTo(x, y + shift)
      ctx.lineTo(x + (rnd() - 0.5) * 3, y + len + shift)
      ctx.stroke()
    }
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function dialFace() {
  const s = 512
  const c = s / 2
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = s
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
  ctx.fillStyle = '#F7F5EF'
  ctx.fillRect(0, 0, s, s)
  ctx.strokeStyle = '#1D2124'
  for (let i = 0; i < 50; i++) {
    const a = (i / 50) * Math.PI * 2
    const major = i % 5 === 0
    ctx.lineWidth = major ? 5 : 2.4
    const inner = major ? 208 : 222
    ctx.beginPath()
    ctx.moveTo(c + Math.cos(a) * inner, c + Math.sin(a) * inner)
    ctx.lineTo(c + Math.cos(a) * 240, c + Math.sin(a) * 240)
    ctx.stroke()
  }
  ctx.fillStyle = '#1D2124'
  ctx.fillRect(c - 118, 118, 236, 66)
  ctx.fillStyle = '#F7F5EF'
  ctx.font = '700 50px ui-monospace, Menlo, Consolas, monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('00127', c, 153)
  ctx.fillStyle = '#5F625E'
  ctx.font = '600 30px Arial, sans-serif'
  ctx.fillText('м³', c, 214)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}
