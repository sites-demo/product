import { useEffect, useRef } from 'react'

// Поверх фото первого экрана: зимой идёт снег, летом в тёплом свете плавают пылинки.
type P = { x: number; y: number; r: number; v: number; d: number; ph: number }

export function SeasonSky({ season }: { season: 'winter' | 'summer' }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const g = c.getContext('2d')!
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches
    let W = 1, H = 1, dpr = 1, raf = 0, vis = true, last = performance.now()
    let ps: P[] = []
    let seed = 11
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    const make = () => {
      const area = (W * H) / (dpr * dpr)
      const n = season === 'winter' ? Math.round(Math.min(260, area / 3200)) : Math.round(Math.min(70, area / 14000))
      ps = Array.from({ length: n }, () => {
        const d = rnd()
        return { x: rnd() * W, y: rnd() * H, r: (season === 'winter' ? 0.8 + d * 2.6 : 0.6 + d * 1.6) * dpr, v: (season === 'winter' ? 18 + d * 46 : 4 + d * 8) * dpr, d, ph: rnd() * Math.PI * 2 }
      })
    }
    const fit = () => {
      const r = c.getBoundingClientRect()
      dpr = Math.min(2, window.devicePixelRatio || 1)
      W = Math.max(1, Math.round(r.width * dpr)); H = Math.max(1, Math.round(r.height * dpr))
      c.width = W; c.height = H
      make()
      draw(0)
    }
    const draw = (dt: number) => {
      g.clearRect(0, 0, W, H)
      const t = performance.now() / 1000
      for (const p of ps) {
        if (season === 'winter') {
          p.y += p.v * dt
          p.x += Math.sin(t * 0.8 + p.ph) * 12 * dpr * dt * (0.4 + p.d)
          if (p.y > H + 6) { p.y = -6; p.x = Math.random() * W }
          g.fillStyle = `rgba(255,255,255,${(0.35 + p.d * 0.55).toFixed(2)})`
        } else {
          p.y -= p.v * dt
          p.x += Math.sin(t * 0.3 + p.ph) * 6 * dpr * dt
          if (p.y < -6) { p.y = H + 6; p.x = Math.random() * W }
          const tw = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.3 + p.ph))
          g.fillStyle = `rgba(255,226,170,${(tw * (0.4 + p.d * 0.6)).toFixed(2)})`
        }
        g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill()
      }
    }
    const frame = (now: number) => {
      raf = 0
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      draw(dt)
      if (vis && !still) raf = requestAnimationFrame(frame)
    }
    const io = new IntersectionObserver(([e]) => {
      vis = e.isIntersecting && !document.hidden
      if (vis && !still && !raf) { last = performance.now(); raf = requestAnimationFrame(frame) }
    })
    io.observe(c)
    const ro = new ResizeObserver(fit)
    ro.observe(c)
    fit()
    return () => { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect() }
  }, [season])
  return <canvas ref={ref} className={`sky sky-${season}`} aria-hidden="true" />
}
