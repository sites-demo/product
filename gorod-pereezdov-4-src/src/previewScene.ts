import * as T from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { createTruck } from './truckModel'

export type PreviewModel =
  | { kind: 'cargo'; boxes: number; size: number }
  | { kind: 'building'; floor: number; lift: string; destination: boolean }

export function mountPreviewScene(host: HTMLDivElement, onReady: (ready: boolean) => void) {
  const renderer = new T.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.4))
  renderer.toneMapping = T.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.13
  host.append(renderer.domElement)

  const scene = new T.Scene()
  const camera = new T.OrthographicCamera(0, 0, 0, 0, 0.1, 30)
  camera.position.set(5.3, 3.75, 8.9)

  const sky = new T.HemisphereLight(0xfff5e5, 0x87917c, 2.45)
  const sun = new T.DirectionalLight(0xffefdc, 3.25)
  sun.position.set(-4, 7, 5)
  const bounce = new T.DirectionalLight(0xdde8db, 0.85)
  bounce.position.set(5, 3, -4)
  scene.add(sky, sun, bounce)

  const surface = (color: number) => new T.MeshStandardMaterial({ color, roughness: 0.78 })
  const pine = surface(0x2c5645)
  const deepPine = surface(0x19332a)
  const cream = surface(0xe8e8d7)
  const paving = surface(0xb6bfab)
  const brick = surface(0xb88b6b)
  const sage = surface(0x718f75)
  const gold = surface(0xcc985d)
  const cardboard = surface(0xb88248)
  const tape = surface(0xe9c592)
  const rail = surface(0x9cae91)
  const liftPanel = surface(0xc7dbac)
  const glass = surface(0x466257)
  const litWindow = new T.Color(0xf0c477)
  const windowGlow = new T.Color(0xf1bd59)
  const markerInk = new T.MeshBasicMaterial({ color: 0xc5e17e })

  function part(parent: T.Object3D, geometry: T.BufferGeometry, material: T.Material, x: number, y: number, z: number) {
    const mesh = new T.Mesh(geometry, material)
    mesh.position.set(x, y, z)
    parent.add(mesh)
    return mesh
  }

  function box(parent: T.Object3D, material: T.Material, x: number, y: number, z: number, w: number, h: number, d: number, radius = 0.03) {
    return part(parent, new RoundedBoxGeometry(w, h, d, 2, radius), material, x, y, z)
  }

  function ground(parent: T.Group, width: number, depth: number) {
    box(parent, paving, 0, -0.12, 0, width, 0.21, depth, 0.065)
    box(parent, cream, 0, -0.012, 0, width - 0.05, 0.06, depth - 0.05, 0.025)
  }

  const cargo = new T.Group()
  scene.add(cargo)
  ground(cargo, 6.4, 3.05)
  const { truck, decal } = createTruck(renderer.capabilities.getMaxAnisotropy())
  truck.position.set(0.1, 0.035, -0.43)
  cargo.add(truck)

  const boxPositions = [
    [-2.24, 0, 0.93], [-1.68, 0, 1], [-2.04, 0, 1.37],
    [-1.12, 0, 1.07], [-0.59, 0, 1.2], [-1.72, 0, 1.41],
    [-2.24, 0.39, 0.93], [-1.68, 0.39, 1], [-1.12, 0.39, 1.07],
  ]
  const parcels = boxPositions.map(([x, y, z], index) => {
    const parcel = new T.Group()
    parcel.position.set(x, y + 0.026, z)
    parcel.rotation.y = index % 2 ? -0.065 : 0.05
    cargo.add(parcel)
    box(parcel, index % 2 ? gold : cardboard, 0, 0.19, 0, 0.48, 0.38, 0.35)
    box(parcel, tape, 0, 0.386, 0, 0.095, 0.012, 0.34, 0.004)
    box(parcel, tape, 0, 0.336, 0.178, 0.095, 0.12, 0.012, 0.004)
    return parcel
  })

  const building = new T.Group()
  scene.add(building)
  ground(building, 3.75, 2.05)
  const facade = box(building, brick, -0.31, 1.41, -0.13, 2.29, 2.79, 1.12, 0.06)
  box(building, cream, -0.31, 2.83, -0.13, 2.44, 0.15, 1.25)
  box(building, pine, -0.31, 2.934, -0.13, 2.26, 0.075, 1.14)
  const floorY = (index: number) => 0.39 + index * 0.51
  const levels = Array.from({ length: 5 }, (_, index) => {
    const y = floorY(index)
    const windows = glass.clone()
    box(building, cream, -0.31, y + 0.245, 0.43, 2.28, 0.029, 0.085, 0.011)
    for (const x of [-0.99, -0.31, 0.37]) {
      box(building, cream, x, y, 0.446, 0.35, 0.31, 0.075, 0.019)
      box(building, windows, x, y, 0.494, 0.265, 0.225, 0.034, 0.012)
      box(building, deepPine, x, y, 0.517, 0.024, 0.224, 0.018, 0.005)
    }
    return windows
  })
  const floorMarker = new T.Group()
  floorMarker.position.y = floorY(0)
  building.add(floorMarker)
  box(floorMarker, markerInk, -1.62, 0, 0.59, 0.5, 0.035, 0.022, 0.008)
  const badgeCanvas = document.createElement('canvas')
  badgeCanvas.width = 192
  badgeCanvas.height = 152
  const badgeContext = badgeCanvas.getContext('2d')!
  const badgeTexture = new T.CanvasTexture(badgeCanvas)
  badgeTexture.colorSpace = T.SRGBColorSpace
  const badgeMaterial = new T.SpriteMaterial({ map: badgeTexture, depthTest: false, toneMapped: false })
  const badge = new T.Sprite(badgeMaterial)
  badge.position.set(-1.99, 0, 0.64)
  badge.scale.set(0.78, 0.62, 1)
  badge.renderOrder = 2
  floorMarker.add(badge)

  function setBadge(floor: number) {
    badgeContext.clearRect(0, 0, 192, 152)
    badgeContext.beginPath()
    badgeContext.roundRect(5, 5, 182, 142, 24)
    badgeContext.fillStyle = '#d5ed91'
    badgeContext.fill()
    badgeContext.fillStyle = '#172c24'
    badgeContext.textAlign = 'center'
    badgeContext.font = '800 74px Arial, sans-serif'
    badgeContext.fillText(String(floor), 96, 85)
    badgeContext.font = '700 28px Arial, sans-serif'
    badgeContext.fillText('ЭТАЖ', 96, 123)
    badgeTexture.needsUpdate = true
  }
  const elevator = new T.Group()
  elevator.position.set(0.833, 0, 0)
  building.add(elevator)
  // The shaft shares the building's side wall; its front stays open in the cutaway.
  box(elevator, pine, 0.3, 1.42, -0.33, 0.6, 2.75, 0.08)
  box(elevator, cream, 0.31, 2.82, 0, 0.65, 0.12, 0.75)
  box(elevator, pine, 0.3, 2.91, 0, 0.58, 0.07, 0.65)
  box(elevator, paving, 0.3, 0.09, 0, 0.62, 0.15, 0.72)
  for (const x of [0.03, 0.57]) {
    box(elevator, rail, x, 1.42, 0.36, 0.055, 2.72, 0.065, 0.013)
  }
  const liftCab = new T.Group()
  elevator.add(liftCab)
  box(liftCab, pine, 0, 0, 0, 0.46, 0.36, 0.47, 0.026)
  box(liftCab, liftPanel, 0, 0, 0.246, 0.39, 0.29, 0.032, 0.015)
  box(liftCab, pine, 0, 0, 0.264, 0.017, 0.26, 0.014, 0.003)
  liftCab.position.set(0.3, 0.39, 0.05)
  box(building, sage, 1.44, 0.12, -0.64, 0.38, 0.19, 0.3, 0.07)

  const preference = matchMedia('(prefers-reduced-motion: reduce)')
  let model: PreviewModel | undefined
  let liftStart = 0
  let liftTarget = 0
  let addedFrom = 0
  let transitionStart = 0
  let frame = 0
  let ready = false
  let lost = false

  function draw(time: number) {
    frame = 0
    if (!model || lost) return
    const progress = preference.matches ? 1 : T.MathUtils.smoothstep(time - transitionStart, 0, 280)
    if (model.kind === 'cargo') {
      const boxes = model.boxes
      parcels.forEach((parcel, index) => {
        parcel.visible = index < boxes
        parcel.scale.setScalar(index < addedFrom ? 1 : T.MathUtils.lerp(0.76, 1, progress))
      })
    } else {
      const position = T.MathUtils.lerp(liftStart, liftTarget, progress)
      liftCab.position.y = floorMarker.position.y = position
      levels.forEach((windows, index) => {
        const intensity = 1 - T.MathUtils.smoothstep(Math.abs(position - floorY(index)), 0, 0.51)
        windows.color.copy(glass.color).lerp(litWindow, intensity)
        windows.emissive.copy(windowGlow)
        windows.emissiveIntensity = intensity * 0.65
      })
    }
    renderer.render(scene, camera)
    if (!ready) {
      ready = true
      onReady(true)
    }
    if (progress < 1) schedule()
  }

  function schedule() {
    if (!frame && !lost) frame = requestAnimationFrame(draw)
  }

  function resize() {
    const { clientWidth: width, clientHeight: height } = host
    if (!width || !height) return
    const aspect = width / height
    const halfWidth = model?.kind === 'building' ? 2.36 : 3.62
    const halfHeight = Math.max(2.04, halfWidth / aspect)
    camera.left = -halfHeight * aspect
    camera.right = halfHeight * aspect
    camera.top = halfHeight
    camera.bottom = -halfHeight
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
    schedule()
  }

  const observer = new ResizeObserver(resize)
  observer.observe(host)
  resize()
  function contextLost(event: Event) {
    event.preventDefault()
    lost = true
    onReady(false)
  }
  renderer.domElement.addEventListener('webglcontextlost', contextLost)

  return {
    update(next: PreviewModel) {
      const previous = model
      if (next.kind === 'cargo' && previous?.kind === 'cargo' && next.boxes === previous.boxes && next.size === previous.size) return
      if (next.kind === 'building' && previous?.kind === 'building' &&
          next.floor === previous.floor && next.lift === previous.lift && next.destination === previous.destination) return
      model = next
      if (next.kind === 'building') camera.lookAt(-0.25, 1.36, 0)
      else camera.lookAt(0, 1.19, 0)
      transitionStart = performance.now()
      cargo.visible = next.kind === 'cargo'
      building.visible = next.kind === 'building'
      if (next.kind === 'cargo') {
        truck.scale.set(0.9 + next.size * 0.026, 0.9, 0.9)
        addedFrom = previous?.kind === 'cargo' ? previous.boxes : next.boxes
      } else {
        const selected = (next.floor - 1) % 5
        facade.material = next.destination ? sage : brick
        setBadge(next.floor)
        elevator.visible = next.lift !== 'Нет'
        liftCab.scale.x = next.lift === 'Грузовой' ? 1.1 : 0.88
        liftTarget = floorY(selected)
        const sameGroup = previous?.kind === 'building' &&
          Math.floor((previous.floor - 1) / 5) === Math.floor((next.floor - 1) / 5)
        liftStart = sameGroup ? floorMarker.position.y : liftTarget
      }
      if (previous?.kind !== next.kind) resize()
      else schedule()
    },
    destroy() {
      cancelAnimationFrame(frame)
      observer.disconnect()
      renderer.domElement.removeEventListener('webglcontextlost', contextLost)
      const materials = new Set<T.Material>([brick, sage, glass, badgeMaterial])
      scene.traverse(object => {
        if (object instanceof T.Mesh) {
          object.geometry.dispose()
          materials.add(object.material as T.Material)
        }
      })
      materials.forEach(material => material.dispose())
      badgeTexture.dispose()
      decal.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    },
  }
}
