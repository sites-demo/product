import { useEffect, useRef, useState } from 'react'

// Свет фар на стене: слева мутная фара с рассеянным жёлтым пятном, справа линза с чёткой границей
// и подъёмом правой части, чтобы не слепить встречных. Ползунок сдвигает границу между ними.
function draw(c: HTMLCanvasElement, split: number) {
  const r = c.getBoundingClientRect()
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const W = Math.max(1, Math.round(r.width * dpr)), H = Math.max(1, Math.round(r.height * dpr))
  if (c.width !== W || c.height !== H) { c.width = W; c.height = H }
  const g = c.getContext('2d')!
  const y0 = H * 0.48, cx = W * 0.5
  const wall = () => {
    g.fillStyle = '#17191c'
    g.fillRect(0, 0, W, H)
    g.strokeStyle = 'rgba(255,255,255,0.05)'
    g.lineWidth = 1
    const step = Math.round(36 * dpr)
    for (let x = step; x < W; x += step) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke() }
    for (let y = step; y < H; y += step) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke() }
  }
  const before = () => {
    wall()
    g.save()
    g.filter = `blur(${Math.round(18 * dpr)}px)`
    for (const [x, s] of [[cx - W * 0.16, 1], [cx + W * 0.16, 0.9]] as const) {
      const grd = g.createRadialGradient(x, y0 + H * 0.06, 0, x, y0 + H * 0.06, W * 0.3 * s)
      grd.addColorStop(0, 'rgba(255,214,140,0.62)')
      grd.addColorStop(0.45, 'rgba(240,190,110,0.28)')
      grd.addColorStop(1, 'rgba(240,190,110,0)')
      g.fillStyle = grd
      g.fillRect(0, 0, W, H)
    }
    // Свет уходит вверх, в глаза встречным.
    const up = g.createRadialGradient(cx, y0 - H * 0.12, 0, cx, y0 - H * 0.12, W * 0.42)
    up.addColorStop(0, 'rgba(255,220,150,0.2)')
    up.addColorStop(1, 'rgba(255,220,150,0)')
    g.fillStyle = up
    g.fillRect(0, 0, W, H)
    g.restore()
  }
  const after = () => {
    wall()
    // Граница света: ровная слева, справа поднимается под 15 градусов, чтобы светить на обочину.
    const kink = cx + W * 0.03, rise = Math.tan((15 * Math.PI) / 180) * W * 0.16
    const cut = new Path2D()
    cut.moveTo(-10, y0)
    cut.lineTo(kink, y0)
    cut.lineTo(kink + W * 0.16, y0 - rise)
    cut.lineTo(W + 10, y0 - rise)
    cut.lineTo(W + 10, H + 10)
    cut.lineTo(-10, H + 10)
    cut.closePath()
    g.save()
    g.clip(cut)
    const spot = (x: number, y: number, rx: number, ry: number, stops: [number, string][]) => {
      g.save()
      g.translate(x, y)
      g.scale(rx / ry, 1)
      const grd = g.createRadialGradient(0, 0, 0, 0, 0, ry)
      for (const [o, c] of stops) grd.addColorStop(o, c)
      g.fillStyle = grd
      g.fillRect(-W, -H, W * 3, H * 3)
      g.restore()
    }
    // Широкое поле света на дорогу и яркое пятно под самой границей.
    spot(kink, y0 + H * 0.02, W * 0.62, H * 0.5, [[0, 'rgba(205,220,250,0.55)'], [0.55, 'rgba(180,200,240,0.18)'], [1, 'rgba(180,200,240,0)']])
    spot(kink - W * 0.02, y0 + H * 0.035, W * 0.22, H * 0.11, [[0, 'rgba(255,255,255,0.95)'], [0.5, 'rgba(235,242,255,0.55)'], [1, 'rgba(235,242,255,0)']])
    spot(kink + W * 0.13, y0 - rise * 0.4, W * 0.16, H * 0.08, [[0, 'rgba(240,246,255,0.55)'], [1, 'rgba(240,246,255,0)']])
    g.restore()
    // Над границей почти темно: встречный водитель видит только фару.
    g.strokeStyle = 'rgba(235,242,255,0.5)'
    g.lineWidth = 1.2 * dpr
    g.stroke(new Path2D(`M-10 ${y0} L${kink} ${y0} L${kink + W * 0.16} ${y0 - rise} L${W + 10} ${y0 - rise}`))
  }
  g.save()
  g.beginPath(); g.rect(0, 0, W * split, H); g.clip()
  before()
  g.restore()
  g.save()
  g.beginPath(); g.rect(W * split, 0, W * (1 - split), H); g.clip()
  after()
  g.restore()
  g.fillStyle = 'rgba(255,255,255,0.85)'
  g.fillRect(W * split - dpr, 0, 2 * dpr, H)
}

export function BeamTest({ beforeLabel = 'Мутная фара', afterLabel = 'Линза' }: { beforeLabel?: string; afterLabel?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [split, setSplit] = useState(0.5)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    draw(c, split)
    const ro = new ResizeObserver(() => draw(c, split))
    ro.observe(c)
    return () => ro.disconnect()
  }, [split])
  return <div className="beam">
    <canvas ref={ref} aria-hidden="true" />
    <span className="beam-l">{beforeLabel}</span>
    <span className="beam-r">{afterLabel}</span>
    <input type="range" min={0.04} max={0.96} step={0.01} value={split} onChange={e => setSplit(Number(e.target.value))} aria-label="Граница между старой фарой и линзой" />
  </div>
}
