import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { NAME } from './data'

export type Day = string // YYYY-MM-DD

const pad = (n: number) => String(n).padStart(2, '0')
export const toDay = (d: Date): Day => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const fromDay = (s: Day) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const addDays = (s: Day, n: number) => {
  const d = fromDay(s)
  d.setDate(d.getDate() + n)
  return toDay(d)
}
export const nightsBetween = (a: Day, b: Day) => Math.round((fromDay(b).getTime() - fromDay(a).getTime()) / 86400000)

const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
const WEEK_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']

export const dayLabel = (s: Day) => {
  const d = fromDay(s)
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}, ${WEEK_SHORT[d.getDay()]}`
}
export const dayShort = (s: Day) => {
  const d = fromDay(s)
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()].slice(0, 3)}`
}

export function plural(n: number, one: string, few: string, many: string) {
  const a = Math.abs(n) % 100
  const b = a % 10
  if (a > 10 && a < 20) return many
  if (b > 1 && b < 5) return few
  if (b === 1) return one
  return many
}
export const nightsText = (n: number) => `${n} ${plural(n, 'ночь', 'ночи', 'ночей')}`
export const guestsText = (adults: number, kids: number) => {
  const k = `${kids} ${plural(kids, 'ребёнок', 'ребёнка', 'детей')}`
  if (!adults) return kids ? k : 'Не указано'
  const a = `${adults} ${plural(adults, 'взрослый', 'взрослых', 'взрослых')}`
  return kids ? `${a}, ${k}` : a
}

export const PURPOSES = ['Отдых с семьёй', 'День рождения', 'Новый год', 'Командировка', 'Встреча друзей'] as const
export type Purpose = (typeof PURPOSES)[number]

type State = {
  checkIn: Day | null
  checkOut: Day | null
  adults: number
  kids: number
  purpose: Purpose | null
  garage: boolean
  note: string
}

type Booking = State & {
  setDates: (a: Day | null, b: Day | null) => void
  setAdults: (n: number) => void
  setKids: (n: number) => void
  setPurpose: (p: Purpose | null) => void
  setGarage: (v: boolean) => void
  setNote: (v: string) => void
  nights: number
  guests: number
  message: () => string
}

const Ctx = createContext<Booking | null>(null)

export function BookingProvider({ children }: { children: ReactNode }) {
  const [s, set] = useState<State>({ checkIn: null, checkOut: null, adults: 0, kids: 0, purpose: null, garage: false, note: '' })
  const value = useMemo<Booking>(() => {
    const nights = s.checkIn && s.checkOut ? nightsBetween(s.checkIn, s.checkOut) : 0
    const guests = s.adults + s.kids
    return {
      ...s,
      nights,
      guests,
      setDates: (checkIn, checkOut) => set((p) => ({ ...p, checkIn, checkOut })),
      setAdults: (adults) => set((p) => ({ ...p, adults })),
      setKids: (kids) => set((p) => ({ ...p, kids })),
      setPurpose: (purpose) => set((p) => ({ ...p, purpose })),
      setGarage: (garage) => set((p) => ({ ...p, garage })),
      setNote: (note) => set((p) => ({ ...p, note })),
      message: () => {
        const lines = [`Здравствуйте. Хочу снять «${NAME}» целиком.`]
        if (s.checkIn && s.checkOut) lines.push(`Даты: с ${dayLabel(s.checkIn)} по ${dayLabel(s.checkOut)}, ${nightsText(nights)}.`)
        else lines.push('Даты: пока не выбрал(а), подскажите свободные.')
        if (guests) lines.push(`Нас: ${guestsText(s.adults, s.kids)}. Хватит ли спальных мест на ${guests} ${plural(guests, 'человека', 'человек', 'человек')}?`)
        if (s.purpose) lines.push(`Повод: ${s.purpose.toLowerCase()}.`)
        if (s.garage) lines.push('Нужно место в гараже для машины.')
        if (s.note.trim()) lines.push(`Время приезда и пожелания: ${s.note.trim()}`)
        lines.push(s.checkIn && s.checkOut ? 'Дом свободен на эти даты и сколько будет стоить?' : 'Сколько будет стоить?')
        return lines.join('\n')
      },
    }
  }, [s])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useBooking() {
  const b = useContext(Ctx)
  if (!b) throw new Error('useBooking вне BookingProvider')
  return b
}
