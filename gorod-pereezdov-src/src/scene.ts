import * as T from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { createTruck } from './truckModel'
import { ROUTE, type RoutePhase } from './route'

export type { RoutePhase }

export function mountScene(host: HTMLDivElement, {
  onReady, onPhase, onUnavailable, onTick,
}: {
  onReady: () => void
  onPhase: (phase: RoutePhase) => void
  onUnavailable: () => void
  onTick?: (progress: number) => void
}) {
  const renderer = new T.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))
  renderer.setClearColor(0, 0)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = T.PCFSoftShadowMap
  renderer.toneMapping = T.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.1
  const canvas = renderer.domElement
  const outgoingFrame = document.createElement('canvas')
  outgoingFrame.className = 'truck-loop-frame'
  const outgoingContext = outgoingFrame.getContext('2d')
  host.append(canvas, outgoingFrame)

  const scene = new T.Scene()
  const camera = new T.OrthographicCamera()
  const model = new T.Group()
  scene.add(model)

  const fill = new T.HemisphereLight(0xfff5e1, 0x8c7866, 2.5)
  const sun = new T.DirectionalLight(0xfff0d4, 2.9)
  sun.position.set(-4, 9, 4)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 8, bottom: -8, near: 0.2, far: 28 })
  sun.shadow.normalBias = 0.04
  sun.shadow.bias = -0.00025
  const rim = new T.DirectionalLight(0xd5e8db, 1.35)
  rim.position.set(4, 4, -5)
  scene.add(fill, sun, rim)

  const material = (color: number, roughness = 0.68, metalness = 0) =>
    new T.MeshStandardMaterial({ color, roughness, metalness })
  const cream = material(0xe8e5cb)
  const green = material(0x315b48, 0.5)
  const edge = material(0x263c32)
  const dark = material(0x263e38)
  const glass = material(0x34564d, 0.27, 0.23)
  const glint = material(0x6d9d86, 0.35)
  const asphalt = material(0x516b5c)
  const roadEdge = material(0xb1ba9a)
  const lane = material(0xd8e2c5)
  const kraft = material(0xb47e45)
  const kraftLight = material(0xd39b56)
  const tape = material(0xf0cd88)
  const brick = material(0xb88b6b)
  const mortar = material(0xd2bca0)
  const stone = material(0xd7d9bd)
  const pine = material(0x547552)
  const windowGlow = new T.MeshStandardMaterial({ color: 0xcaa56f, emissive: 0xffad40, emissiveIntensity: 0.07 })
  const routeLight = new T.MeshBasicMaterial({ color: 0xd1ed83, toneMapped: false })

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

  const platform = box(model, roadEdge, 0, -0.32, 0, 14.2, 0.56, 5.55, 0.25)
  platform.castShadow = false
  const shadowTexture = document.createElement('canvas')
  shadowTexture.width = shadowTexture.height = 128
  const shadowPen = shadowTexture.getContext('2d')!
  const shadowFade = shadowPen.createRadialGradient(64, 64, 5, 64, 64, 64)
  shadowFade.addColorStop(0, 'rgba(46, 63, 44, .23)')
  shadowFade.addColorStop(.55, 'rgba(46, 63, 44, .14)')
  shadowFade.addColorStop(1, 'rgba(46, 63, 44, 0)')
  shadowPen.fillStyle = shadowFade
  shadowPen.fillRect(0, 0, 128, 128)
  const shadowMap = new T.CanvasTexture(shadowTexture)
  const shadow = mesh(model, new T.PlaneGeometry(18, 8.5),
    new T.MeshBasicMaterial({ map: shadowMap, transparent: true, depthWrite: false, toneMapped: false }), 0.2, -0.64, 0.35)
  shadow.rotation.x = -Math.PI / 2
  shadow.castShadow = shadow.receiveShadow = false
  box(model, stone, 0, 0.03, -1.55, 13.9, 0.1, 2.03, 0.045)
  box(model, stone, 0, 0.018, 2.42, 13.9, 0.078, 0.46, 0.04)
  box(model, asphalt, 0, -0.062, 0, 14.18, 0.105, 5.52, 0.07).castShadow = false
  box(model, lane, 0, 0.005, -0.39, 13.68, 0.022, 0.06, 0.008).castShadow = false
  for (let x = -5.42; x <= 5.43; x += 0.61) {
    box(model, lane, x, 0.006, 1.98, 0.28, 0.02, 0.044, 0.008).castShadow = false
  }
  // Дверь нового дома: к ней ведёт линия маршрута и туда заносят коробки.
  const door = { x: 4.08, y: 0.23, z: -0.62 }
  const routeLength = door.x + 5.45
  const guide = new T.Group()
  guide.position.set(-5.45, 0.026, 1.98)
  model.add(guide)
  box(guide, routeLight, routeLength / 2, 0, 0, routeLength, 0.025, 0.065, 0.012).castShadow = false
  for (const x of [-5.45, door.x]) {
    mesh(model, new T.CylinderGeometry(0.31, 0.31, 0.065, 20), edge, x, 0.032, 1.98)
    mesh(model, new T.CylinderGeometry(0.17, 0.17, 0.043, 18), x < 0 ? routeLight : tape, x, 0.084, 1.98).castShadow = false
  }

  const origin = new T.Group()
  origin.position.set(-4.62, 0.06, -1.56)
  model.add(origin)
  box(origin, stone, 0, 0.09, 0, 2.75, 0.16, 1.97, 0.09)
  box(origin, brick, 0, 1.16, 0, 2.12, 2.17, 1.52, 0.065)
  box(origin, mortar, 0, 2.29, 0, 2.3, 0.16, 1.66, 0.05)
  box(origin, edge, 0, 2.4, 0, 2.13, 0.08, 1.46, 0.035)
  for (const y of [0.95, 1.57]) {
    box(origin, mortar, 0, y, 0, 2.14, 0.035, 1.54, 0.012)
  }
  for (const y of [1.22, 1.86]) {
    for (const x of [-0.61, 0, 0.61]) {
      box(origin, mortar, x, y, 0.779, 0.38, 0.4, 0.06, 0.023)
      box(origin, glass, x, y, 0.819, 0.28, 0.3, 0.041, 0.016)
      box(origin, glint, x, y, 0.848, 0.021, 0.28, 0.014, 0.005)
    }
  }
  box(origin, dark, 0, 0.46, 0.785, 0.38, 0.67, 0.07, 0.024)
  box(origin, mortar, 0, 0.81, 0.8, 0.5, 0.07, 0.23, 0.03)

  const destination = new T.Group()
  destination.position.set(4.69, 0.06, -1.58)
  model.add(destination)
  box(destination, stone, 0, 0.09, 0, 2.84, 0.16, 2.02, 0.09)
  box(destination, cream, 0, 1.02, 0, 2.25, 1.82, 1.51, 0.06)
  const roof = new T.Shape()
  roof.moveTo(-1.28, 1.85)
  roof.lineTo(0, 2.62)
  roof.lineTo(1.28, 1.85)
  roof.closePath()
  mesh(destination, new T.ExtrudeGeometry(roof, { depth: 1.72, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.045, bevelSegments: 2 }), green, 0, 0, -0.86)
  box(destination, mortar, 0.61, 2.24, -0.43, 0.24, 0.51, 0.27, 0.025)
  box(destination, edge, -0.61, 0.58, 0.78, 0.45, 0.85, 0.07, 0.025)
  for (const [x, y, w, h] of [[0.35, 0.95, 0.87, 0.6], [0, 2.065, 0.35, 0.25]]) {
    const z = y > 2 ? 0.92 : 0.8
    box(destination, edge, x, y, z, w, h, 0.065, 0.025)
    box(destination, windowGlow, x, y, z + 0.045, w - 0.09, h - 0.09, 0.036, 0.015)
    box(destination, edge, x, y, z + 0.065, 0.036, h - 0.08, 0.016, 0.005)
  }

  for (const [x, z, height] of [[-6.47, -1.57, 1.35], [-2.94, -1.91, 1.13], [3.1, -1.87, 1.25], [6.48, -1.51, 1.53]]) {
    mesh(model, new T.CylinderGeometry(0.065, 0.09, height * 0.48, 9), kraft, x, height * 0.24, z)
    mesh(model, new T.IcosahedronGeometry(height * 0.39, 1), pine, x, height * 0.75, z)
  }

  const { truck, doors, wheels, decal } = createTruck(renderer.capabilities.getMaxAnisotropy(), () => requestFrame())
  const truckScale = 0.79
  const startX = -2.67
  // Машина встаёт кабиной к углу дома, чтобы дверь дома было видно.
  const stop = 1.15
  const distance = stop - startX
  const truckLane = 0.75
  truck.scale.setScalar(truckScale)
  model.add(truck)

  function parcel(x: number, z: number, size: number, surface: T.Material) {
    const group = new T.Group()
    model.add(group)
    box(group, surface, 0, size * 0.45, 0, size, size * 0.9, size * 0.87, 0.026)
    box(group, tape, 0, size * 0.9, 0, size * 0.21, 0.012, size * 0.87, 0.004)
    box(group, tape, 0, size * 0.77, size * 0.44, size * 0.21, size * 0.27, 0.01, 0.004)
    box(group, cream, size * 0.29, size * 0.31, size * 0.44, size * 0.18, size * 0.17, 0.009, 0.002)
    return { group, x, z }
  }

  const parcels = [
    parcel(-5.92, 0.8, 0.58, kraft),
    parcel(-6.2, 1.47, 0.49, kraftLight),
    parcel(-5.55, 1.63, 0.39, kraft),
  ]

  // Разгрузка: из кузова назад, вдоль ближнего края дороги к дому, на крыльцо и в дверь.
  const walkLane = 1.9
  const unloadLegs = [
    { x: stop - 3.25, y: 0, z: truckLane, ms: 360, lift: 0.36, hops: 1, scale: 1 },
    { x: stop - 3.25, y: 0, z: walkLane, ms: 240, lift: 0.08, hops: 1, scale: 1 },
    { x: door.x, y: 0, z: walkLane, ms: 820, lift: 0.1, hops: 5, scale: 1 },
    { x: door.x, y: 0, z: 0.05, ms: 380, lift: 0.1, hops: 2, scale: 0.85 },
    { x: door.x, y: door.y, z: door.z, ms: 180, lift: 0.18, hops: 1, scale: 0.62 },
    { x: door.x, y: door.y, z: -1.05, ms: 260, lift: 0, hops: 0, scale: 0.62 },
  ]
  const unloadTotal = unloadLegs.reduce((sum, leg) => sum + leg.ms, 0)
  const unloadGap = 330

  function carry(group: T.Group, index: number, time: number) {
    let t = time - (ROUTE.arrive + 520) - index * unloadGap
    if (t <= 0) return false
    if (t >= unloadTotal) {
      group.visible = false
      return true
    }
    let x = stop - 1.91, y = 0.74, z = truckLane + 0.15, size = 1
    for (const leg of unloadLegs) {
      if (t > leg.ms) {
        t -= leg.ms
        x = leg.x; y = leg.y; z = leg.z; size = leg.scale
        continue
      }
      const u = t / leg.ms
      const e = leg.hops > 1 ? u : T.MathUtils.smootherstep(u, 0, 1)
      group.visible = true
      group.position.set(T.MathUtils.lerp(x, leg.x, e),
        T.MathUtils.lerp(y, leg.y, e) + Math.abs(Math.sin(u * Math.PI * Math.max(1, leg.hops))) * leg.lift,
        T.MathUtils.lerp(z, leg.z, e))
      group.scale.setScalar(T.MathUtils.lerp(size, leg.scale, e))
      group.rotation.y = 0
      return true
    }
    return true
  }

  const { depart, arrive, unloaded, duration } = ROUTE
  const cycle = duration + 500
  const dissolve = 320
  const preference = matchMedia('(prefers-reduced-motion: reduce)')
  let frame = 0
  let elapsed = 0
  let lastTime = 0
  let visible = false
  let ready = false
  let lost = false
  let playing = true
  let dissolving = false
  let phase: RoutePhase | undefined
  // Лёгкий наклон сцены за курсором мыши.
  const aim = { x: 0, y: 0 }
  const tilt = { x: 0, y: 0 }

  function paint(time: number, still: boolean) {
    const nextPhase = still ? 'still' : time < depart ? 'packing' : time < arrive ? 'driving' : 'unloading'
    if (phase !== nextPhase) {
      phase = nextPhase
      onPhase(phase)
    }

    const travel = T.MathUtils.smootherstep(time, depart, arrive)
    const truckX = startX + distance * travel
    truck.position.set(truckX, 0, truckLane)
    const load = T.MathUtils.smoothstep(time, 1090, depart)
    const open = still ? 0 : T.MathUtils.smoothstep(time, arrive + 60, arrive + 520) - T.MathUtils.smoothstep(time, unloaded - 100, unloaded + 350)
    doors.forEach(({ hinge, side }) => { hinge.rotation.y = side * 1.4 * (1 - load + open) })
    wheels.forEach(wheel => { wheel.rotation.z = -distance * travel / (truckScale * 0.43) })
    parcels.forEach(({ group, x, z }, index) => {
      if (!still && carry(group, index, time)) return
      const packed = T.MathUtils.smoothstep(time, 190 + index * 148, 820 + index * 118)
      group.visible = packed < 1
      group.scale.setScalar(1)
      group.position.set(T.MathUtils.lerp(x, -4.58, packed), Math.min(0.74, packed * 1.08), T.MathUtils.lerp(z, truckLane + 0.15, packed))
      group.rotation.y = packed * 0.2 - 0.12
    })
    guide.scale.x = 0.055 + travel * 0.945
    windowGlow.emissiveIntensity = 0.08 + 0.95 * T.MathUtils.smoothstep(time, unloaded - 600, unloaded + 300)
    const follow = still ? 0 : (travel - 0.5) * 0.52
    model.rotation.y = tilt.x * 0.075
    camera.position.set(4.55 + follow, 7.1 - tilt.y * 0.9, 12.8)
    camera.lookAt(follow, 0.84, 0)
    renderer.render(scene, camera)
    onTick?.(still ? 0 : time / duration)
    if (!ready) {
      ready = true
      onReady()
    }
  }

  function render(time: number) {
    frame = 0
    tilt.x += (aim.x - tilt.x) * 0.08
    tilt.y += (aim.y - tilt.y) * 0.08
    const settling = Math.abs(aim.x - tilt.x) + Math.abs(aim.y - tilt.y) > 0.002
    if (preference.matches) {
      paint(3400, true)
      return
    }
    if (playing && lastTime) elapsed += Math.min(75, time - lastTime)
    lastTime = playing ? time : 0
    if (elapsed >= cycle) {
      if (outgoingContext) {
        paint(duration, false)
        outgoingFrame.width = canvas.width
        outgoingFrame.height = canvas.height
        outgoingContext.drawImage(canvas, 0, 0)
        dissolving = true
      }
      elapsed -= cycle
    }
    paint(Math.min(duration, elapsed), false)
    if (dissolving) {
      outgoingFrame.style.opacity = String(1 - T.MathUtils.smoothstep(elapsed, 0, dissolve))
      dissolving = elapsed < dissolve
    }
    if (playing || settling) requestFrame()
  }

  function requestFrame() {
    if (!frame && visible && !lost && !document.hidden) frame = requestAnimationFrame(render)
  }

  function suspend() {
    cancelAnimationFrame(frame)
    frame = 0
    lastTime = 0
  }

  function onPreferenceChange() {
    suspend()
    dissolving = false
    outgoingFrame.style.opacity = '0'
    requestFrame()
  }

  function resize() {
    const { clientWidth: width, clientHeight: height } = host
    if (!width || !height) return
    const aspect = width / height
    const halfHeight = Math.max(3.65, 8.05 / aspect)
    camera.left = -halfHeight * aspect
    camera.right = halfHeight * aspect
    camera.top = halfHeight
    camera.bottom = -halfHeight
    camera.near = 0.1
    camera.far = 50
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
    requestFrame()
  }

  const stage = host.parentElement ?? host
  function onPointer(event: PointerEvent) {
    if (event.pointerType !== 'mouse' || preference.matches) return
    const rect = stage.getBoundingClientRect()
    aim.x = T.MathUtils.clamp((event.clientX - rect.left) / rect.width * 2 - 1, -1, 1)
    aim.y = T.MathUtils.clamp((event.clientY - rect.top) / rect.height * 2 - 1, -1, 1)
    requestFrame()
  }
  function onLeave() {
    aim.x = aim.y = 0
    requestFrame()
  }

  function onVisibilityChange() {
    if (document.hidden) suspend()
    else requestFrame()
  }

  const resizeObserver = new ResizeObserver(resize)
  const visibility = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting && entry.intersectionRatio >= 0.2
    if (!visible) suspend()
    else requestFrame()
  }, { threshold: 0.2 })
  function contextLost(event: Event) {
    event.preventDefault()
    lost = true
    suspend()
    onUnavailable()
  }

  resizeObserver.observe(host)
  visibility.observe(host)
  document.addEventListener('visibilitychange', onVisibilityChange)
  preference.addEventListener('change', onPreferenceChange)
  canvas.addEventListener('webglcontextlost', contextLost)
  stage.addEventListener('pointermove', onPointer)
  stage.addEventListener('pointerleave', onLeave)
  resize()

  return {
    setPlaying(value: boolean) {
      playing = value
      suspend()
      if (playing) requestFrame()
    },
    seek(time: number) {
      elapsed = T.MathUtils.clamp(time, 0, duration)
      lastTime = 0
      dissolving = false
      outgoingFrame.style.opacity = '0'
      suspend()
      if (!preference.matches) paint(elapsed, false)
      requestFrame()
    },
    destroy() {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      visibility.disconnect()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      preference.removeEventListener('change', onPreferenceChange)
      canvas.removeEventListener('webglcontextlost', contextLost)
      stage.removeEventListener('pointermove', onPointer)
      stage.removeEventListener('pointerleave', onLeave)
      const geometries = new Set<T.BufferGeometry>()
      const materials = new Set<T.Material>()
      scene.traverse(object => {
        if (object instanceof T.Mesh) {
          geometries.add(object.geometry)
          materials.add(object.material as T.Material)
        }
      })
      geometries.forEach(geometry => geometry.dispose())
      materials.forEach(surface => surface.dispose())
      decal.dispose()
      shadowMap.dispose()
      sun.shadow.map?.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      canvas.remove()
      outgoingFrame.remove()
    },
  }
}
