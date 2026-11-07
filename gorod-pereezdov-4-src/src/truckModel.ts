import * as T from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

export function createTruck(anisotropy: number) {
  const truck = new T.Group()
  const material = (color: number, roughness = 0.68, metalness = 0) =>
    new T.MeshStandardMaterial({ color, roughness, metalness })
  const cream = material(0xe8e5cb)
  const pale = material(0xf3efdc)
  const lime = material(0xb9d752)
  const green = material(0x2e654c, 0.5)
  const edge = material(0x263c32)
  const rubber = material(0x171e1a)
  const dark = material(0x263e38)
  const glass = material(0x34564d, 0.27, 0.23)
  const glint = material(0x6d9d86, 0.35)
  const metal = material(0x8b9b86, 0.36, 0.4)
  const light = material(0xffedbe)
  const red = material(0xbb6140)

  function mesh(parent: T.Object3D, geometry: T.BufferGeometry, surface: T.Material, x: number, y: number, z: number) {
    const shape = new T.Mesh(geometry, surface)
    shape.position.set(x, y, z)
    shape.castShadow = shape.receiveShadow = true
    parent.add(shape)
    return shape
  }

  function box(parent: T.Object3D, surface: T.Material, x: number, y: number, z: number, w: number, h: number, d: number, bevel = 0.035) {
    const geometry = bevel ? new RoundedBoxGeometry(w, h, d, 2, bevel) : new T.BoxGeometry(w, h, d)
    return mesh(parent, geometry, surface, x, y, z)
  }
  box(truck, dark, 0.1, 0.58, 0, 5.9, 0.36, 1.59, 0.09)
  box(truck, edge, -0.28, 0.47, 0, 4.55, 0.24, 1.22)
  box(truck, lime, -0.73, 0.83, 0, 3.8, 0.28, 1.898, 0.045)
  box(truck, pale, -0.73, 2.72, 0, 3.78, 0.12, 1.88, 0.035)
  box(truck, cream, 1.14, 1.77, 0, 0.095, 1.87, 1.86, 0.039)
  const doors = [-1, 1].map(side => {
    box(truck, cream, -0.73, 1.76, side * 0.892, 3.81, 1.87, 0.098, 0.045)
    const hinge = new T.Group()
    hinge.position.set(-2.65, 0, side * 0.9)
    truck.add(hinge)
    box(hinge, pale, -0.065, 1.78, -side * 0.447, 0.105, 1.82, 0.89, 0.04)
    box(hinge, dark, -0.123, 1.51, -side * 0.74, 0.033, 0.29, 0.055, 0.015)
    return { hinge, side }
  })

  const cab = new T.Shape()
  cab.moveTo(1.29, 0.6)
  cab.lineTo(3.04, 0.6)
  cab.lineTo(3.04, 1.18)
  cab.lineTo(2.78, 1.35)
  cab.lineTo(2.35, 2.12)
  cab.lineTo(1.39, 2.12)
  cab.lineTo(1.29, 1.99)
  cab.closePath()
  const cabGeo = new T.ExtrudeGeometry(cab, { depth: 1.6, bevelEnabled: true, bevelSegments: 3, bevelSize: 0.057, bevelThickness: 0.055, steps: 1 })
  mesh(truck, cabGeo, green, 0, 0, -0.8)
  box(truck, lime, 1.83, 2.16, 0, 0.77, 0.12, 1.49, 0.055)
  const windscreen = box(truck, glass, 2.61, 1.77, 0, 0.065, 0.74, 1.44, 0.035)
  windscreen.rotation.z = 0.51
  box(truck, glint, 2.638, 1.82, 0, 0.055, 0.52, 0.045).rotation.z = 0.51
  for (const z of [-0.864, 0.864]) {
    const window = new T.Shape()
    window.moveTo(1.5, 1.43)
    window.lineTo(2.57, 1.43)
    window.lineTo(2.24, 1.995)
    window.lineTo(1.5, 1.995)
    window.closePath()
    mesh(truck, new T.ExtrudeGeometry(window, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.009, bevelSize: 0.015, bevelSegments: 2 }), glass, 0, 0, z - 0.01)
    box(truck, glint, 1.58, 1.73, z * 1.027, 0.038, 0.44, 0.021)
    box(truck, edge, 1.57, 1.28, z * 1.014, 0.26, 0.065, 0.035)
    box(truck, edge, 2.49, 1.51, z * 1.17, 0.15, 0.1, 0.32)
    box(truck, dark, 2.48, 1.59, z * 1.36, 0.15, 0.33, 0.13, 0.06)
    box(truck, red, -2.75, 0.67, z * 0.95, 0.12, 0.17, 0.22)
  }
  box(truck, edge, 3.11, 0.66, 0, 0.17, 0.23, 1.76, 0.06)
  box(truck, dark, 3.109, 0.99, 0, 0.07, 0.3, 0.88)
  for (let y = 0.9; y <= 1.09; y += 0.065) box(truck, metal, 3.15, y, 0, 0.03, 0.014, 0.78, 0)
  for (const z of [-0.64, 0.64]) box(truck, light, 3.105, 1.05, z, 0.1, 0.22, 0.31, 0.05)
  box(truck, pale, 3.215, 0.67, 0, 0.035, 0.1, 0.36)

  const wheels: T.Group[] = []
  for (const x of [-1.76, 2.19]) {
    for (const side of [-1, 1]) {
      const wheel = new T.Group()
      wheel.position.set(x, 0.43, side * 0.9)
      wheels.push(wheel)
      truck.add(wheel)
      mesh(wheel, new T.CylinderGeometry(0.43, 0.43, 0.28, 28), rubber, 0, 0, 0).rotation.x = Math.PI / 2
      mesh(wheel, new T.CylinderGeometry(0.245, 0.245, 0.04, 20), metal, 0, 0, side * 0.153).rotation.x = Math.PI / 2
      mesh(wheel, new T.CylinderGeometry(0.105, 0.105, 0.07, 16), dark, 0, 0, side * 0.18).rotation.x = Math.PI / 2
      for (const angle of [0, 2.094, 4.189]) {
        mesh(wheel, new T.CylinderGeometry(0.025, 0.025, 0.023, 6), dark,
          0.167 * Math.cos(angle), 0.167 * Math.sin(angle), side * 0.184).rotation.x = Math.PI / 2
      }
    }
  }

  const sign = document.createElement('canvas')
  sign.width = 768
  sign.height = 290
  const pen = sign.getContext('2d')!
  pen.fillStyle = '#183e31'
  pen.beginPath()
  pen.roundRect(28, 69, 142, 142, 32)
  pen.fill()
  pen.strokeStyle = '#d5ed91'
  pen.lineWidth = 12
  pen.lineCap = 'round'
  pen.lineJoin = 'round'
  pen.beginPath()
  pen.moveTo(57, 169)
  pen.lineTo(57, 113)
  pen.lineTo(87, 140)
  pen.lineTo(112, 113)
  pen.lineTo(141, 113)
  pen.moveTo(126, 113)
  pen.lineTo(126, 169)
  pen.stroke()
  pen.font = '800 89px Arial, sans-serif'
  pen.fillText('MOVING', 198, 136)
  pen.fillText('TOWN', 198, 223)
  pen.font = '700 24px Arial, sans-serif'
  pen.fillText('ПЕРЕЕЗДЫ ПО РОССИИ', 201, 268)
  const decal = new T.CanvasTexture(sign)
  decal.colorSpace = T.SRGBColorSpace
  decal.anisotropy = Math.min(anisotropy, 4)
  const ink = new T.MeshBasicMaterial({ map: decal, transparent: true, depthWrite: false })
  for (const side of [-1, 1]) {
    const logo = mesh(truck, new T.PlaneGeometry(3.25, 1.23), ink, -0.7, 1.83, side * 0.944)
    logo.rotation.y = side < 0 ? Math.PI : 0
    logo.castShadow = logo.receiveShadow = false
  }


  return { truck, doors, wheels, decal }
}
