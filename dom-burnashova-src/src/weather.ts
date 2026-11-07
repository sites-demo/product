import { useEffect, useState } from 'react'
import { LAT, LON } from './data'

// Текущая температура в Якутске с open-meteo. Нет ответа: просто не показываем.
let cache: Promise<number | null> | null = null

function load(): Promise<number | null> {
  if (!cache) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m&timezone=Asia%2FYakutsk`
    cache = fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const t = j?.current?.temperature_2m
        return typeof t === 'number' ? Math.round(t) : null
      })
      .catch(() => null)
  }
  return cache
}

export function useTemperature() {
  const [t, setT] = useState<number | null>(null)
  useEffect(() => {
    let alive = true
    const q = new URLSearchParams(location.search).get('t')
    if (q !== null && !Number.isNaN(Number(q))) {
      setT(Number(q))
      return
    }
    load().then((v) => alive && setT(v))
    return () => {
      alive = false
    }
  }, [])
  return t
}

export const fmtT = (t: number) => (t > 0 ? `+${t}` : t < 0 ? `−${Math.abs(t)}` : '0') + '°'
