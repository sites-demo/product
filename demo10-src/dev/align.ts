import { createAlignScene } from '../src/three/alignScene'
createAlignScene(document.getElementById('a')!, { type: 'crossover', paint: '#c9ced4', accent: '#d7261e' })
const b = createAlignScene(document.getElementById('b')!, { type: 'crossover', paint: '#c9ced4', accent: '#d7261e' })
b.set(1)
;(window as any).__ready = true
