import { createAlignScene } from '../src/three/alignScene'
;(async () => {
  await createAlignScene(document.getElementById('a')!, { paint: '#c9ced4', accent: '#d7261e' })
  const b = await createAlignScene(document.getElementById('b')!, { paint: '#c9ced4', accent: '#d7261e' })
  b.set(1)
  setTimeout(() => { (window as any).__ready = true }, 1500)
})()
