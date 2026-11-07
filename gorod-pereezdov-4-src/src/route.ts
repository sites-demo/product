// Общая шкала времени для сцены в первом экране и подписи под ней (мс).
export const ROUTE = { depart: 1450, arrive: 5200, unloaded: 6900, duration: 7600 }
export type RoutePhase = 'still' | 'packing' | 'driving' | 'unloading'
export const ROUTE_STEPS: { id: Exclude<RoutePhase, 'still'>; label: string; from: number; to: number }[] = [
  { id: 'packing', label: 'Погрузка', from: 0, to: ROUTE.depart },
  { id: 'driving', label: 'В пути', from: ROUTE.depart, to: ROUTE.arrive },
  { id: 'unloading', label: 'Разгрузка', from: ROUTE.arrive, to: ROUTE.duration },
]
