import * as THREE from 'three'
import { buildCar, carMaterials } from '../src/three/car'
const car = buildCar('sedan', carMaterials('#888'))
const S = car.shape
const half = S.L / 2
const out: string[] = []
car.group.traverse((o: any) => {
  if (!o.isMesh || o.renderOrder === 2) return
  const g = o.geometry as THREE.BufferGeometry
  const p = g.attributes.position, n = g.attributes.normal, idx = g.index
  if (!idx || !n) return
  let cnt = 0, inv = 0
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), fn = new THREE.Vector3(), vn = new THREE.Vector3()
  for (let t = 0; t < idx.count; t += 3) {
    a.fromBufferAttribute(p, idx.getX(t)); b.fromBufferAttribute(p, idx.getX(t + 1)); c.fromBufferAttribute(p, idx.getX(t + 2))
    const cx = (a.x + b.x + c.x) / 3, cy = (a.y + b.y + c.y) / 3, cz = (a.z + b.z + c.z) / 3
    if (cx < half - 0.25 || Math.abs(cz) > 0.5 || cy > 0.5) continue
    cnt++
    fn.subVectors(b, a).cross(c.clone().sub(a)).normalize()
    vn.fromBufferAttribute(n, idx.getX(t))
    if (fn.dot(vn) < 0) inv++
  }
  if (cnt) out.push(`${o.userData.part}: ${cnt} tris, ${inv} inverted`)
})
// Ищем, есть ли вообще точки сетки в зоне воздухозаборника
document.body.textContent = out.join('\n') + `\nhalf ${half}`
;(window as any).__ready = true
