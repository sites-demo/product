import { createHeadlightScene } from '../src/three/headlight'
createHeadlightScene(document.getElementById('a')!, { accent: '#ff7a1a' })
const b = createHeadlightScene(document.getElementById('b')!, { accent: '#ff7a1a' }); b.setClear(true)
const c = createHeadlightScene(document.getElementById('c')!, { accent: '#ff7a1a' }); c.setExplode(1); c.setClear(true); c.setActive('lens')
setTimeout(() => { (window as any).__ready = true }, 1500)
