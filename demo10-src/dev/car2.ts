// Все детали по очереди: каждая своим цветом, чтобы проверить границы.
import { createCarScene } from '../src/three/carScene'
const el = (id: string) => document.getElementById(id)!
;(async () => {
  const yaws = [-0.6, 0.6, 2.5, 3.7]
  const ids = ['a', 'b', 'c', 'd']
  for (let i = 0; i < 4; i++) {
    const s = await createCarScene(el(ids[i]), { type: 'sedan', paint: '#eceef0', accent: '#e4572e', yaw: yaws[i], autoRotate: false })
    const pal = ['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#008080', '#9a6324', '#800000', '#000075', '#808000', '#ffd8b1']
    let k = 0
    for (const [, meshes] of s.car.panels) { const m = meshes[0].material as any; m.color.set(pal[k++ % pal.length]) }
    s.render()
  }
  ;(window as any).__ready = true
})()
