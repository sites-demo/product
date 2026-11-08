import { createDoorScene } from '../src/three/doorRepair'
const q = new URLSearchParams(location.search)
const s = createDoorScene(document.getElementById('a')!, { paint: q.get('paint') ?? '#2c4a6e' })
const st = Number(q.get('s') ?? 0)
s.setStage(st)
setTimeout(() => { (window as any).__ready = true }, 2500)
