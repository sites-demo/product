// Отражения детейлинг-бокса: над машиной соты из светодиодных трубок, по бокам вертикальные полосы.
// Сцена нужна только для карты окружения, в кадре её не видно.
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export function hexStudio() {
  const scene = new THREE.Scene()
  const room = new THREE.Mesh(new THREE.BoxGeometry(18, 9, 18), new THREE.MeshBasicMaterial({ color: '#07080a', side: THREE.BackSide }))
  room.position.y = 3.5
  scene.add(room)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), new THREE.MeshBasicMaterial({ color: '#16181b' }))
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -0.99
  scene.add(floor)

  // Соты: каждая ячейка из шести трубок, соседние ячейки делят рёбра.
  const R = 0.62, bar = 0.05, parts: THREE.BufferGeometry[] = []
  const seen = new Set<string>()
  const key = (a: THREE.Vector2, b: THREE.Vector2) => {
    const p = [a, b].map(v => `${v.x.toFixed(2)},${v.y.toFixed(2)}`).sort()
    return p.join('|')
  }
  for (let q = -11; q <= 11; q++) {
    for (let r = -9; r <= 9; r++) {
      const cx = R * 1.5 * q, cz = R * Math.sqrt(3) * (r + (q & 1 ? 0.5 : 0))
      if (Math.abs(cx) > 8.4 || Math.abs(cz) > 8.4) continue
      for (let k = 0; k < 6; k++) {
        const a = new THREE.Vector2(cx + R * Math.cos(k * Math.PI / 3), cz + R * Math.sin(k * Math.PI / 3))
        const b = new THREE.Vector2(cx + R * Math.cos((k + 1) * Math.PI / 3), cz + R * Math.sin((k + 1) * Math.PI / 3))
        const id = key(a, b)
        if (seen.has(id)) continue
        seen.add(id)
        const len = a.distanceTo(b) - bar * 0.6
        const g = new THREE.BoxGeometry(len, bar, bar)
        g.rotateY(-Math.atan2(b.y - a.y, b.x - a.x))
        g.translate((a.x + b.x) / 2, 0, (a.y + b.y) / 2)
        parts.push(g)
      }
    }
  }
  const hex = new THREE.Mesh(mergeGeometries(parts), new THREE.MeshBasicMaterial({ color: new THREE.Color(5.5, 5.6, 6) }))
  hex.position.y = 4.2
  scene.add(hex)
  for (const g of parts) g.dispose()

  // Вертикальные полосы на стенах дают длинные блики на боках.
  const stripMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 3.3, 3.6) })
  for (const side of [-1, 1]) {
    for (let i = -3; i <= 3; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.4, 0.06), stripMat)
      s.position.set(side * 8.9, 1.8, i * 1.4)
      scene.add(s)
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.4, 0.06), stripMat)
      f.position.set(i * 1.4, 1.8, side * 8.9)
      scene.add(f)
    }
  }
  return scene
}
