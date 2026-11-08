import { createCarScene } from '../src/three/carScene'
const q = new URLSearchParams(location.search)
const yaw = Number(q.get('yaw') ?? -0.7)
const el = (id: string) => document.getElementById(id)!
;(async () => {
  const s1 = await createCarScene(el('a'), { type: 'sedan', paint: '#a9afb6', accent: '#e4572e', yaw, autoRotate: false })
  await createCarScene(el('b'), { type: 'sedan', paint: '#eceef0', accent: '#f2b705', yaw: yaw + 1.2, autoRotate: false })
  const s3 = await createCarScene(el('c'), { type: 'sedan', paint: '#9c171c', accent: '#14a3c7', yaw: yaw + 2.6, autoRotate: false })
  const s4 = await createCarScene(el('d'), { type: 'sedan', paint: '#1d2228', accent: '#3fa7ff', dark: true, yaw: yaw + 3.6, autoRotate: false })
  s1.setMarked(['doorFR', 'bumperF', 'fenderFR'])
  s3.setMarked(['quarterRL', 'trunk', 'bumperR'])
  s4.setMarked(['hood', 'roof', 'sillL', 'mirrorL'])
  ;(window as any).__ready = true
})()
