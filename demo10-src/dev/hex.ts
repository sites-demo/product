import { createCarScene } from '../src/three/carScene'
const q = new URLSearchParams(location.search)
const paint = q.get('paint') ?? '#0d0f12'
;(async () => {
  await createCarScene(document.getElementById('a')!, { type: 'sedan', paint, accent: '#e4572e', dark: true, studio: 'hex', yaw: -0.75, autoRotate: false })
  await createCarScene(document.getElementById('b')!, { type: 'sedan', paint: '#f1f2f4', accent: '#e4572e', dark: true, studio: 'hex', yaw: 0.6, autoRotate: false })
  ;(window as any).__ready = true
})()
