import { useState } from 'react'
import { MAX, PHONE, TEL, TG, WA } from '../data'
import { PURPOSES, dayLabel, guestsText, nightsText, useBooking } from '../booking'
import { Calendar } from './Calendar'
import { Icon } from './Icon'

export function Stepper({ label, value, min, max, onChange, hint }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void; hint?: string }) {
  return (
    <div className="step">
      <span className="step-l">
        {label}
        {hint && <small>{hint}</small>}
      </span>
      <span className="step-c">
        <button type="button" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={`${label}: меньше`}>
          <Icon name="minus" />
        </button>
        <output aria-live="polite">{value}</output>
        <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`${label}: больше`}>
          <Icon name="plus" />
        </button>
      </span>
    </div>
  )
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const t = document.createElement('textarea')
    t.value = text
    t.style.position = 'fixed'
    t.style.opacity = '0'
    document.body.appendChild(t)
    t.select()
    const ok = document.execCommand('copy')
    t.remove()
    return ok
  }
}

export function Booking() {
  const b = useBooking()
  const [copied, setCopied] = useState(false)
  const msg = b.message()

  const sendTg = async () => {
    const ok = await copy(msg)
    setCopied(ok)
    window.open(TG, '_blank', 'noopener')
  }

  return (
    <section className="booking" id="bron" aria-labelledby="bron-h">
      <div className="wrap">
        <div className="sec-head">
          <h2 id="bron-h">Заявка на дом за минуту</h2>
          <p className="lead">Выберите даты и сколько вас. Текст заявки соберётся сам, останется отправить его хозяевам в WhatsApp или Telegram. Они ответят, свободен ли дом, и назовут цену.</p>
        </div>

        <div className="bk-grid">
          <div className="bk-main">
            <div className="bk-block">
              <h3 className="bk-t">Даты
              </h3>
              <Calendar checkIn={b.checkIn} checkOut={b.checkOut} onChange={b.setDates} />
            </div>
            <div className="bk-block">
              <h3 className="bk-t">Гости
              </h3>
              <div className="steps">
                <Stepper label="Взрослые" hint={b.adults ? undefined : 'Сколько вас?'} value={b.adults} min={0} max={30} onChange={b.setAdults} />
                <Stepper label="Дети" hint="до 14 лет" value={b.kids} min={0} max={15} onChange={b.setKids} />
              </div>
            </div>
            <div className="bk-block">
              <h3 className="bk-t">Повод и пожелания
              </h3>
              <div className="pchips" role="group" aria-label="Повод">
                {PURPOSES.map((p) => (
                  <button key={p} type="button" className={'chip' + (b.purpose === p ? ' chip-on' : '')} aria-pressed={b.purpose === p} onClick={() => b.setPurpose(b.purpose === p ? null : p)}>
                    {p}
                  </button>
                ))}
              </div>
              <label className="check">
                <input type="checkbox" checked={b.garage} onChange={(e) => b.setGarage(e.target.checked)} />
                <span>Приедем на машине, нужен тёплый гараж</span>
              </label>
              <label className="note">
                <span>Время прилёта и пожелания</span>
                <textarea rows={2} value={b.note} onChange={(e) => b.setNote(e.target.value)} placeholder="Например: прилетаем в 3 ночи, будем на двух машинах" maxLength={400} />
              </label>
            </div>
          </div>

          <aside className="bk-sum" id="zayavka" aria-label="Ваша заявка">
            <h3 className="bk-sum-h">Ваша заявка</h3>
            <dl>
              <div>
                <dt>Заезд</dt>
                <dd>{b.checkIn ? dayLabel(b.checkIn) : 'Не выбран'}</dd>
              </div>
              <div>
                <dt>Выезд</dt>
                <dd>{b.checkOut ? dayLabel(b.checkOut) : 'Не выбран'}</dd>
              </div>
              <div>
                <dt>Гости</dt>
                <dd>{guestsText(b.adults, b.kids)}</dd>
              </div>
              <div>
                <dt>Что снимаете</dt>
                <dd>Весь дом</dd>
              </div>
            </dl>
            <div className="bk-total">
              <span>{b.nights ? nightsText(b.nights) : 'Даты не выбраны'}</span>
              <b>Цену хозяева назовут в ответ</b>
            </div>
            <a className="btn btn-amber btn-wide" href={`${WA}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener">
              <Icon name="wa" />
              Отправить в WhatsApp
            </a>
            <button type="button" className="btn btn-line btn-wide" onClick={sendTg}>
              <Icon name="tg" />
              Отправить в Telegram
            </button>
            <p className={copied ? 'ok' : 'hint'}>{copied ? 'Текст заявки скопирован. Вставьте его в чат Telegram.' : 'Для Telegram текст заявки скопируется, останется вставить его в чат.'}</p>
            <a className="max-line" href={MAX} target="_blank" rel="noopener">
              Хозяева есть и в MAX
            </a>
            <a className="call-line" href={TEL}>
              Или позвоните: <b>{PHONE}</b>
            </a>
            <details className="bk-preview">
              <summary>Посмотреть текст заявки</summary>
              <pre>{msg}</pre>
            </details>
          </aside>
        </div>
      </div>
    </section>
  )
}
