import * as THREE from 'three'
import { loadCar } from '../src/three/carModel'
;(async () => {
  const car = await loadCar('#ffffff')
  const out: string[] = []
  for (const [id, ms] of car.panels) {
    const b = new THREE.Box3(); let tris = 0
    for (const m of ms) { b.expandByObject(m); tris += m.geometry.attributes.position.count / 3 }
    const f = (v: THREE.Vector3) => v.toArray().map(x => x.toFixed(2)).join(',')
    out.push(`${id.padEnd(10)} ${String(tris).padStart(6)}  min ${f(b.min)}  max ${f(b.max)}`)
  }
  out.push('shape ' + JSON.stringify(car.shape))
  out.push('wheels ' + car.wheels.map(w => w.position.toArray().map(x => x.toFixed(2)).join(',') + ' fix=' + w.children[0].rotation.y.toFixed(3)).join(' | '))
  ;(window as any).__out = out.join('\n')
  ;(window as any).__ready = true
})()
