import { createCarScene } from '../src/three/carScene'
const q = new URLSearchParams(location.search)
const yaw = Number(q.get('yaw') ?? -0.7)
const s1 = createCarScene(document.getElementById('a')!, { type: 'sedan', paint: '#d9dde2', accent: '#e4572e', yaw, autoRotate: false })
createCarScene(document.getElementById('b')!, { type: 'hatch', paint: '#2b4c7e', accent: '#f2b705', yaw: yaw + 1.2, autoRotate: false })
createCarScene(document.getElementById('c')!, { type: 'crossover', paint: '#8a1c1c', accent: '#14a3c7', yaw: yaw + 2.6, autoRotate: false })
const s4 = createCarScene(document.getElementById('d')!, { type: 'sedan', paint: '#1d2228', accent: '#3fa7ff', dark: true, yaw: yaw + 3.6, autoRotate: false })
s1.setMarked(['doorFR', 'bumperF'])
s4.setMarked(['hood'])
;(window as any).__ready = true
