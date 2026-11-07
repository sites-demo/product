import { useEffect, useRef, useState } from 'react'
import { GIS_URL, HOURS, MARKS, NAME, PHOTO_ALT, RATING, img } from '../data'
import { dayShort, guestsText, nightsText, plural, useBooking } from '../booking'
import { fmtT, useTemperature } from '../weather'
import { Calendar } from './Calendar'
import { Stepper } from './Booking'
import { Icon } from './Icon'

function useNarrow() {
  const [n, setN] = useState(false)
  useEffect(() => {
    const mq = matchMedia('(max-width: 759px)')
    const on = () => setN(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return n
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', key)
    ref.current?.focus()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      removeEventListener('keydown', key)
      document.body.style.overflow = prev
    }
  }, [onClose])
  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-h">
          <b>{title}</b>
          <button type="button" className="x" onClick={onClose} aria-label="Закрыть">
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Hero() {
  const b = useBooking()
  const t = useTemperature()
  const narrow = useNarrow()
  const [sheet, setSheet] = useState<null | 'dates' | 'guests'>(null)

  const go = () => {
    if (!b.checkIn || !b.checkOut) return setSheet('dates')
    document.getElementById('zayavka')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <header className="hero" id="top">
      <div className="wrap hero-grid">
        <div className="hero-txt">
          <h1>
            {NAME}
          </h1>
          <p className="hero-lead">Гостевой дом в Якутске целиком для вашей компании: два этажа, гостиная с длинным столом, кухня, гараж, мангал и беседка.</p>
          <ul className="hero-facts">
            <li>
              <a href={GIS_URL} target="_blank" rel="noopener">
                <Icon name="star" className="ic ic-star" />
                <b>{RATING}</b> в 2ГИС, {MARKS} {plural(MARKS, 'оценка', 'оценки', 'оценок')}
              </a>
            </li>
            <li>
              <Icon name="clock" />
              На связи {HOURS}
            </li>
          </ul>
        </div>
        <figure className="hero-pic">
          <img src={img('06')} alt={PHOTO_ALT['06']} width={1216} height={902} fetchPriority="high" />
          {t !== null && (
            <figcaption className="temp">
              <span>Сейчас в Якутске</span>
              <b>{fmtT(t)}</b>
              {t < 0 && <span>В доме тепло</span>}
            </figcaption>
          )}
        </figure>
        <div className="qbar" role="group" aria-label="Быстрый подбор">
          <button type="button" className="qf" onClick={() => setSheet('dates')}>
            <Icon name="calendar" />
            <span>
              <small>Заезд</small>
              <b className={b.checkIn ? '' : 'empty'}>{b.checkIn ? dayShort(b.checkIn) : 'Выбрать'}</b>
            </span>
          </button>
          <button type="button" className="qf" onClick={() => setSheet('dates')}>
            <Icon name="calendar" />
            <span>
              <small>Выезд</small>
              <b className={b.checkOut ? '' : 'empty'}>{b.checkOut ? dayShort(b.checkOut) : 'Выбрать'}</b>
            </span>
          </button>
          <button type="button" className="qf" onClick={() => setSheet('guests')}>
            <Icon name="guests" />
            <span>
              <small>Гости</small>
              <b className={b.adults + b.kids ? '' : 'empty'}>{b.adults + b.kids ? guestsText(b.adults, b.kids) : 'Сколько вас?'}</b>
            </span>
          </button>
          <button type="button" className="btn btn-amber qgo" onClick={go}>
            {b.nights ? `Заявка на ${nightsText(b.nights)}` : 'Выбрать даты'}
          </button>
        </div>
      </div>

      {sheet === 'dates' && (
        <Sheet title="Даты поездки" onClose={() => setSheet(null)}>
          <Calendar checkIn={b.checkIn} checkOut={b.checkOut} onChange={b.setDates} months={narrow ? 1 : 2} />
          <button type="button" className="btn btn-amber btn-wide" disabled={!b.checkOut} onClick={() => setSheet(null)}>
            {b.nights ? `Готово, ${nightsText(b.nights)}` : 'Выберите обе даты'}
          </button>
        </Sheet>
      )}
      {sheet === 'guests' && (
        <Sheet title="Кто едет" onClose={() => setSheet(null)}>
          <div className="steps">
            <Stepper label="Взрослые" hint={b.adults ? undefined : 'Сколько вас?'} value={b.adults} min={0} max={30} onChange={b.setAdults} />
            <Stepper label="Дети" hint="до 14 лет" value={b.kids} min={0} max={15} onChange={b.setKids} />
          </div>
          <button type="button" className="btn btn-amber btn-wide" onClick={() => setSheet(null)}>
            Готово
          </button>
        </Sheet>
      )}
    </header>
  )
}
