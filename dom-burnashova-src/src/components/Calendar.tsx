import { useEffect, useState } from 'react'
import { addDays, dayLabel, fromDay, nightsText, nightsBetween, toDay, type Day } from '../booking'

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
const WEEK = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

type Props = {
  checkIn: Day | null
  checkOut: Day | null
  onChange: (a: Day | null, b: Day | null) => void
  months?: 1 | 2
}

function monthDays(year: number, month: number) {
  const first = new Date(year, month, 1)
  const lead = (first.getDay() + 6) % 7
  const count = new Date(year, month + 1, 0).getDate()
  const cells: (Day | null)[] = Array(lead).fill(null)
  for (let d = 1; d <= count; d++) cells.push(toDay(new Date(year, month, d)))
  return cells
}

// Выбор дат: первое нажатие заезд, второе выезд. Прошедшие дни недоступны.
export function Calendar({ checkIn, checkOut, onChange, months = 2 }: Props) {
  const [today, setToday] = useState<Day | null>(null)
  const [view, setView] = useState<{ y: number; m: number } | null>(null)
  const [hover, setHover] = useState<Day | null>(null)

  useEffect(() => {
    const t = new Date()
    setToday(toDay(t))
    const base = checkIn ? fromDay(checkIn) : t
    setView({ y: base.getFullYear(), m: base.getMonth() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!today || !view) return <div className="cal cal-skeleton" aria-hidden="true" />

  const shift = (n: number) => {
    const d = new Date(view.y, view.m + n, 1)
    setView({ y: d.getFullYear(), m: d.getMonth() })
  }
  const minView = fromDay(today)
  const canBack = view.y > minView.getFullYear() || view.m > minView.getMonth()

  const pick = (d: Day) => {
    if (!checkIn || checkOut || d <= checkIn) onChange(d, null)
    else onChange(checkIn, d)
  }

  const end = checkOut || (checkIn && hover && hover > checkIn ? hover : null)
  const list = Array.from({ length: months }, (_, i) => {
    const d = new Date(view.y, view.m + i, 1)
    return { y: d.getFullYear(), m: d.getMonth() }
  })

  return (
    <div className={'cal cal-' + months}>
      <div className="cal-head">
        <button type="button" className="cal-nav" onClick={() => shift(-1)} disabled={!canBack} aria-label="Предыдущий месяц">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <p className="cal-status" aria-live="polite">
          {!checkIn && 'Выберите дату заезда'}
          {checkIn && !checkOut && 'Теперь дату выезда'}
          {checkIn && checkOut && `С ${dayLabel(checkIn)} по ${dayLabel(checkOut)}, ${nightsText(nightsBetween(checkIn, checkOut))}`}
        </p>
        <button type="button" className="cal-nav" onClick={() => shift(1)} aria-label="Следующий месяц">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
      <div className="cal-months">
        {list.map(({ y, m }) => (
          <div className="cal-month" key={`${y}-${m}`}>
            <p className="cal-title">
              {MONTHS[m]} {y}
            </p>
            <div className="cal-grid" role="grid" onMouseLeave={() => setHover(null)}>
              {WEEK.map((w) => (
                <span className="cal-w" key={w}>
                  {w}
                </span>
              ))}
              {monthDays(y, m).map((d, i) => {
                if (!d) return <span key={'e' + i} />
                const past = d < today
                const isIn = d === checkIn
                const isOut = d === end
                const inRange = !!(checkIn && end && d > checkIn && d < end)
                const cls = ['cal-d']
                if (isIn) cls.push('is-in')
                if (isOut) cls.push('is-out')
                if (inRange) cls.push('in-range')
                if (checkIn && end && (isIn || isOut)) cls.push('has-range')
                if (d === today) cls.push('today')
                return (
                  <button
                    type="button"
                    key={d}
                    className={cls.join(' ')}
                    disabled={past}
                    onClick={() => pick(d)}
                    onMouseEnter={() => setHover(d)}
                    aria-pressed={isIn || isOut}
                    aria-label={dayLabel(d)}
                  >
                    {fromDay(d).getDate()}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="cal-quick">
        <button type="button" className="chip" onClick={() => onChange(today, addDays(today, 1))}>
          Сегодня на ночь
        </button>
        <button type="button" className="chip" onClick={() => onChange(addDays(today, 1), addDays(today, 2))}>
          Завтра на ночь
        </button>
        {checkIn && (
          <button type="button" className="chip chip-ghost" onClick={() => onChange(null, null)}>
            Сбросить даты
          </button>
        )}
      </div>
    </div>
  )
}
