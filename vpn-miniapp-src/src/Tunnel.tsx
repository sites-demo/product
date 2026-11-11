import { useEffect, useRef } from 'react'

// Фон главного экрана: точки летят по кругу навстречу, как в тоннеле.
// mode: idle - медленно и тускло, boost - короткий разгон после оплаты.
export function Tunnel({ energy }: { energy: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const energyRef = useRef(energy)
  energyRef.current = energy

  useEffect(() => {
    const c = ref.current!
    const ctx = c.getContext('2d')!
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    let w = 0, h = 0, raf = 0, speed = 0.004
    const dpr = Math.min(devicePixelRatio || 1, 2)
    const N = 520
    const pts = Array.from({ length: N }, () => ({ a: Math.random() * Math.PI * 2, z: Math.random(), r: 0.75 + Math.random() * 0.5 }))

    const resize = () => {
      w = c.clientWidth; h = c.clientHeight
      c.width = w * dpr; c.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(c)

    const frame = () => {
      const target = 0.0025 + energyRef.current * 0.02
      speed += (target - speed) * 0.04
      ctx.clearRect(0, 0, w, h)
      const cx = w / 2, cy = h * 0.46, R = Math.max(w, h) * 0.9
      for (const p of pts) {
        p.z -= reduce ? 0 : speed
        if (p.z <= 0.02) { p.z = 1; p.a = Math.random() * Math.PI * 2 }
        const k = 1 / (p.z * 6 + 0.4)
        const dist = R * (k * 0.16 * p.r + 0.09)
        const x = cx + Math.cos(p.a) * dist
        const y = cy + Math.sin(p.a) * dist * 0.92
        const near = 1 - p.z
        // у центра точек почти нет, чтобы цифра читалась
        const hole = Math.min(1, Math.max(0, (dist - 95) / 60))
        const alpha = Math.min(1, near * near * 1.6) * (0.35 + energyRef.current * 0.5) * hole
        if (alpha < 0.02) continue
        const size = 0.6 + near * 1.9
        ctx.fillStyle = `rgba(${130 + near * 60 | 0},${134 + near * 50 | 0},255,${alpha})`
        ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill()
      }
      raf = requestAnimationFrame(frame)
    }
    frame()
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [])

  return <canvas ref={ref} className="tunnel" aria-hidden />
}
