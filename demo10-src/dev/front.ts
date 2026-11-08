import { createCarScene } from '../src/three/carScene'
const q = new URLSearchParams(location.search)
const s = createCarScene(document.getElementById('a')!, { type: (q.get('type') ?? 'sedan') as any, paint: q.get('paint') ?? '#1f3d78', accent: '#e4572e', yaw: Number(q.get('yaw') ?? -1.2), autoRotate: false })
const m = s.car.materials
if (q.get('dbg')) { m.trim.color.set('#ff0000'); m.trim.envMapIntensity = 0; m.trim.clearcoat = 0 }
s.camera.position.multiplyScalar(Number(q.get('zoom') ?? 0.6)); s.camera.position.y = Number(q.get('y') ?? 1.0); s.camera.lookAt(2, 0.5, 0); s.render()
;(window as any).__ready = true
if (q.get('ds')) { s.car.group.traverse((o: any) => { if (o.isMesh) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach((mm: any) => { mm.side = 2; mm.needsUpdate = true }) } }); s.render() }
if (q.get('noov')) { s.car.group.traverse((o: any) => { if (o.isMesh && o.renderOrder === 2) o.visible = false }); s.render() }
if (q.get('nopaint')) { s.car.group.traverse((o: any) => { if (o.isMesh && o.renderOrder !== 2 && o.userData.part === 'bumperF') o.visible = false }); s.render() }
if (q.get('only')) { s.car.group.traverse((o: any) => { if (o.isMesh) o.visible = o.userData.part === q.get('only') && o.renderOrder !== 2; if (o.isMesh && o.visible) { o.material = new (o.material.constructor)({ color: '#3366cc', wireframe: !!q.get('wf'), side: 2 }) } }); s.render() }
