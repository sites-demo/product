import { useEffect, useRef } from 'react'

// Лампа детейлера над чёрным капотом. Слева краска до полировки: вокруг блика лампы видны круговые
// царапины от мойки. Справа после полировки: блик чёткий, царапин нет. Лампу водят пальцем или мышью.
type Scratch = { x: number; y: number; a: number; len: number; bend: number; s: number }

function makeScratches(n: number) {
  let seed = 7
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  const out: Scratch[] = []
  for (let i = 0; i < n; i++) out.push({ x: rnd(), y: rnd(), a: rnd() * Math.PI, len: 0.012 + rnd() * 0.03, bend: (rnd() - 0.5) * 0.6, s: 0.35 + rnd() * 0.65 })
  return out
}

export function SwirlLight({ paint = '#0b0c0e', beforeLabel = 'До полировки', afterLabel = 'После полировки' }: { paint?: string; beforeLabel?: string; afterLabel?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const g = c.getContext('2d')!
    const scratches = makeScratches(3200)
    let lx = 0.32, ly = 0.45, raf = 0, user = false, t0 = performance.now()
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches

    const draw = () => {
      raf = 0
      const r = c.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const W = Math.max(1, Math.round(r.width * dpr)), H = Math.max(1, Math.round(r.height * dpr))
      if (c.width !== W || c.height !== H) { c.width = W; c.height = H }
      const S = Math.min(W, H), X = lx * W, Y = ly * H, mid = W / 2
      g.fillStyle = paint
      g.fillRect(0, 0, W, H)
      // Общий отсвет лака и лёгкий градиент по капоту.
      const sky = g.createLinearGradient(0, 0, 0, H)
      sky.addColorStop(0, 'rgba(255,255,255,0.05)')
      sky.addColorStop(1, 'rgba(255,255,255,0)')
      g.fillStyle = sky
      g.fillRect(0, 0, W, H)

      // До полировки: мутный ореол и царапины по кругу вокруг лампы.
      g.save()
      g.beginPath(); g.rect(0, 0, mid, H); g.clip()
      const haze = g.createRadialGradient(X, Y, 0, X, Y, S * 0.42)
      haze.addColorStop(0, 'rgba(255,255,255,0.32)')
      haze.addColorStop(0.3, 'rgba(255,255,255,0.1)')
      haze.addColorStop(1, 'rgba(255,255,255,0)')
      g.fillStyle = haze
      g.fillRect(0, 0, mid, H)
      g.lineCap = 'round'
      g.lineWidth = Math.max(1, 0.9 * dpr)
      const R = S * 0.5
      for (const k of scratches) {
        const px = k.x * W, py = k.y * H
        if (px > mid + 30) continue
        const dx = px - X, dy = py - Y, d = Math.hypot(dx, dy)
        if (d > R || d < S * 0.025) continue
        // Блестит только та царапина, что идёт поперёк луча от лампы.
        const tang = Math.atan2(dy, dx) + Math.PI / 2
        const align = Math.abs(Math.cos(k.a - tang)) ** 10
        const fall = (1 - d / R) ** 1.6
        const alpha = align * fall * k.s * 0.9
        if (alpha < 0.03) continue
        const L = k.len * S, ca = Math.cos(tang), sa = Math.sin(tang)
        g.strokeStyle = `rgba(255,255,255,${alpha.toFixed(3)})`
        g.beginPath()
        g.moveTo(px - ca * L / 2, py - sa * L / 2)
        g.quadraticCurveTo(px + (dx / d) * k.bend * L * 0.4, py + (dy / d) * k.bend * L * 0.4, px + ca * L / 2, py + sa * L / 2)
        g.stroke()
      }
      // Сам блик лампы на мутном лаке размыт.
      g.filter = `blur(${Math.round(6 * dpr)}px)`
      g.fillStyle = 'rgba(255,255,255,0.75)'
      g.beginPath(); g.arc(X, Y, S * 0.045, 0, Math.PI * 2); g.fill()
      g.filter = 'none'
      g.restore()

      // После полировки: чистый блик с ровным краем, вокруг почти чёрный глубокий лак.
      g.save()
      g.beginPath(); g.rect(mid, 0, W - mid, H); g.clip()
      const glow = g.createRadialGradient(X, Y, 0, X, Y, S * 0.2)
      glow.addColorStop(0, 'rgba(255,255,255,0.12)')
      glow.addColorStop(1, 'rgba(255,255,255,0)')
      g.fillStyle = glow
      g.fillRect(mid, 0, W - mid, H)
      g.fillStyle = '#ffffff'
      g.beginPath(); g.arc(X, Y, S * 0.04, 0, Math.PI * 2); g.fill()
      g.strokeStyle = 'rgba(255,255,255,0.35)'
      g.lineWidth = 1.5 * dpr
      g.beginPath(); g.arc(X, Y, S * 0.058, 0, Math.PI * 2); g.stroke()
      g.restore()

      g.fillStyle = 'rgba(255,255,255,0.5)'
      g.fillRect(mid - dpr / 2, 0, dpr, H)
    }
    const ask = () => { if (!raf) raf = requestAnimationFrame(draw) }

    // Пока человек не трогает, лампа медленно ходит туда и обратно через границу.
    let idle = 0
    const wander = (now: number) => {
      idle = 0
      if (user) return
      const t = (now - t0) / 1000
      lx = 0.5 + Math.sin(t * 0.45) * 0.3
      ly = 0.48 + Math.sin(t * 0.9) * 0.12
      draw()
      if (vis) idle = requestAnimationFrame(wander)
    }
    let vis = false
    const io = new IntersectionObserver(([e]) => {
      vis = e.isIntersecting
      if (vis && !user && !still && !idle) idle = requestAnimationFrame(wander)
      if (vis) ask()
    })
    io.observe(c)
    const move = (e: PointerEvent) => {
      const r = c.getBoundingClientRect()
      user = true
      lx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
      ly = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
      ask()
    }
    c.addEventListener('pointermove', move)
    c.addEventListener('pointerdown', move)
    const ro = new ResizeObserver(ask)
    ro.observe(c)
    ask()
    return () => { cancelAnimationFrame(raf); cancelAnimationFrame(idle); io.disconnect(); ro.disconnect(); c.removeEventListener('pointermove', move); c.removeEventListener('pointerdown', move) }
  }, [paint])
  return <div className="swirl">
    <canvas ref={ref} role="img" aria-label="Лампа над капотом: слева круговые царапины до полировки, справа чистый блик после" />
    <span className="swirl-l">{beforeLabel}</span>
    <span className="swirl-r">{afterLabel}</span>
  </div>
}
