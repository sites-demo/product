import { createDoorScene } from '../src/three/doorRepair'
const q = new URLSearchParams(location.search)
;(async () => {
  const s = await createDoorScene(document.getElementById('a')!, { paint: q.get('paint') ?? '#2c4a6e' })
  s.setStage(Number(q.get('s') ?? 0))
  setTimeout(() => { (window as any).__ready = true }, 2500)
})()
