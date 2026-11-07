import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { ITEMS, PRESETS, TG, type Counts, type ItemId } from './data'
import { estimate, fmtM3, presetCounts, type Estimate } from './pack'

// Общий расчёт переезда: его меняет кузов на первом экране, а заявка внизу берёт из него «Что везём».
export type Mode = 1 | 2 | 3 | 4 | 'own'

type Move = {
  mode: Mode
  setMode: (m: Mode) => void
  counts: Counts
  setCount: (id: ItemId, n: number) => void
  clear: () => void
  est: Estimate
  touched: boolean
}

const Ctx = createContext<Move | null>(null)

export function MoveProvider({ children }: { children: ReactNode }) {
  const [mode, setModeRaw] = useState<Mode>(2)
  const [own, setOwn] = useState<Counts>(() => presetCounts(2))
  const [ownEdited, setOwnEdited] = useState(false)
  const [touched, setTouched] = useState(false)

  const setMode = (m: Mode) => {
    setTouched(true)
    // Свой список начинаем с того набора, который сейчас в кузове, чтобы не набирать всё с нуля.
    if (m === 'own' && mode !== 'own' && !ownEdited) setOwn(presetCounts(mode))
    setModeRaw(m)
  }
  const setCount = (id: ItemId, n: number) => {
    const item = ITEMS.find((i) => i.id === id)
    const max = item?.max ?? 99
    setTouched(true)
    setOwnEdited(true)
    if (mode !== 'own') {
      setOwn({ ...presetCounts(mode), [id]: Math.max(0, Math.min(max, n)) })
      setModeRaw('own')
      return
    }
    setOwn((o) => ({ ...o, [id]: Math.max(0, Math.min(max, n)) }))
  }
  const clear = () => {
    setTouched(true)
    setOwnEdited(true)
    setOwn({})
    setModeRaw('own')
  }

  const counts = mode === 'own' ? own : presetCounts(mode)
  const est = useMemo(() => estimate(counts, mode === 'own' ? null : mode), [counts, mode])

  return <Ctx.Provider value={{ mode, setMode, counts, setCount, clear, est, touched }}>{children}</Ctx.Provider>
}

export function useMove() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useMove вне MoveProvider')
  return v
}

// Строка «Что везём» для заявки. Везде пишем, что это прикидка сайта, а не расчёт менеджера.
export function cargoText(mode: Mode, counts: Counts, est: Estimate) {
  const space = `вещей около ${fmtM3(est.space)} м³`
  const truck = `машина ${est.truck.id} м³, по прайсу ${est.truck.price}`
  const calc =
    est.kind === 'over'
      ? `${space}, больше одной машины`
      : est.kind === 'small'
        ? `${space}, почасовой тариф`
        : mode === 'own'
          ? `${space}, ${truck}`
          : `типичный набор, ${truck}`
  if (mode !== 'own') return `Квартира, ${PRESETS[mode - 1].label} (прикидка на сайте: ${calc})`
  const list = ITEMS.filter((i) => (counts[i.id] ?? 0) > 0).map((i) => {
    const n = counts[i.id] ?? 0
    return n === 1 ? i.name.toLowerCase() : `${i.many.toLowerCase()} ${n}`
  })
  if (!list.length) return ''
  const text = list.join(', ')
  return `${text[0].toUpperCase()}${text.slice(1)} (прикидка на сайте: ${calc})`
}

// Копирует текст и открывает чат с менеджером. Telegram не умеет подставлять текст в чат с человеком,
// поэтому человек вставляет его сам, а мы честно об этом пишем рядом с кнопкой.
export async function copyAndOpen(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const t = document.createElement('textarea')
    t.value = text
    document.body.appendChild(t)
    t.select()
    document.execCommand('copy')
    t.remove()
  }
  window.open(TG, '_blank', 'noopener')
}

export const HELLO = 'Здравствуйте. Хочу рассчитать переезд.'
