import { createCarScene } from '../src/three/carScene'
const q = new URLSearchParams(location.search)
const type = (q.get('type') ?? 'sedan') as any
const paint = q.get('paint') ?? '#c9ced4'
const views = [0, -Math.PI / 2, -0.75, Math.PI - 0.6]
const ids = ['a', 'b', 'c', 'd']
views.forEach((y, i) => {
  const s = createCarScene(document.getElementById(ids[i])!, { type, paint, accent: '#e4572e', yaw: y, autoRotate: false })
  if (i === 3) { s.camera.position.set(0.01, 9, 0.01); s.camera.lookAt(0, 0, 0); s.render() }
})
;(window as any).__ready = true
