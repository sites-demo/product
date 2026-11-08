import { createCarScene } from '../src/three/carScene'
const q = new URLSearchParams(location.search)
const type = (q.get('type') ?? 'sedan') as any
const paint = q.get('paint') ?? '#0d0f12'
createCarScene(document.getElementById('a')!, { type, paint, accent: '#e4572e', dark: true, studio: 'hex', yaw: -0.75, autoRotate: false })
createCarScene(document.getElementById('b')!, { type: 'crossover', paint: '#f1f2f4', accent: '#e4572e', dark: true, studio: 'hex', yaw: 0.6, autoRotate: false })
;(window as any).__ready = true
