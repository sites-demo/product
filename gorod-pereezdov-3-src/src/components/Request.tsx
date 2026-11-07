import { useEffect, useRef, useState } from 'react'
import { ADDRESS, MANAGERS, MOVES_HOURS, NAME, OFFICE_HOURS, PHONE, TEL, TG, TG_USER, YANDEX, YANDEX_MAP, img } from '../data'
import { cargoText, copyAndOpen, HELLO, useMove } from '../move'
import { Icon } from './Icon'

const LIFTS = ['Лифт есть', 'Грузовой лифт', 'Без лифта']

type Place = { addr: string; floor: string; lift: string }

function PlaceFields({ id, title, v, set, hint }: { id: string; title: string; v: Place; set: (p: Place) => void; hint: string }) {
  return (
    <fieldset className="place">
      <legend>{title}</legend>
      <label className="fld fld-addr">
        <span>Адрес или район</span>
        <input id={id} value={v.addr} onChange={(e) => set({ ...v, addr: e.target.value })} placeholder={hint} autoComplete="off" />
      </label>
      <div className="place-row">
        <label className="fld fld-floor">
          <span>Этаж</span>
          <input inputMode="numeric" value={v.floor} onChange={(e) => set({ ...v, floor: e.target.value.replace(/[^\d]/g, '').slice(0, 2) })} />
        </label>
        <div className="seg" role="radiogroup" aria-label={`${title}: лифт`}>
          {LIFTS.map((l) => (
            <button key={l} type="button" role="radio" aria-checked={v.lift === l} className={v.lift === l ? 'on' : ''} onClick={() => set({ ...v, lift: v.lift === l ? '' : l })}>
              {l}
            </button>
          ))}
        </div>
      </div>
    </fieldset>
  )
}

const placeLine = (p: Place) => [p.addr.trim(), p.floor && `${p.floor} этаж`, p.lift && p.lift.toLowerCase()].filter(Boolean).join(', ')

const fmtDate = (s: string) => {
  if (!s) return ''
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' })
}

export function Request() {
  const { mode, counts, est } = useMove()
  const [from, setFrom] = useState<Place>({ addr: '', floor: '', lift: '' })
  const [to, setTo] = useState<Place>({ addr: '', floor: '', lift: '' })
  const [date, setDate] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState(false)
  const timer = useRef<number>(0)
  useEffect(() => () => clearTimeout(timer.current), [])

  const cargo = cargoText(mode, counts, est)
  const lines = [
    HELLO,
    cargo && `Что везём: ${cargo}`,
    placeLine(from) && `Откуда: ${placeLine(from)}`,
    placeLine(to) && `Куда: ${placeLine(to)}`,
    date && `Когда: ${fmtDate(date)}`,
    note.trim() && `Ещё: ${note.trim()}`,
    (name.trim() || phone.trim()) && `Контакт: ${[name.trim(), phone.trim()].filter(Boolean).join(', ')}`,
  ].filter(Boolean) as string[]
  const text = lines.join('\n')

  const send = async () => {
    await copyAndOpen(text)
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(false), 6000)
  }

  return (
    <section className="req dark" id="zayavka" aria-labelledby="req-h">
      <div className="wrap">
        <div className="sec-head">
          <h2 id="req-h">Отправьте расчёт менеджеру</h2>
          <p className="lead">Заполните, что знаете. Менеджер ответит в Telegram и назовёт цену, а фото вещей можно приложить прямо в чате.</p>
        </div>
        <div className="req-grid">
          <form className="req-form" onSubmit={(e) => e.preventDefault()}>
            <div className="cargo">
              <span>Что везём</span>
              <p>{cargo || 'Кузов пустой. Выберите квартиру или добавьте вещи наверху.'}</p>
              <a href="#kuzov">Изменить в кузове</a>
            </div>
            <PlaceFields id="from" title="Откуда" v={from} set={setFrom} hint="Например, Автозаводский район" />
            <PlaceFields id="to" title="Куда" v={to} set={setTo} hint="Например, ул. Белинского" />
            <div className="req-row">
              <label className="fld">
                <span>Дата переезда</span>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
              <label className="fld">
                <span>Имя</span>
                <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" placeholder="Как к вам обращаться" />
              </label>
              <label className="fld">
                <span>Телефон</span>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="+7" />
              </label>
            </div>
            <label className="fld">
              <span>Что ещё важно</span>
              <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Пианино, хрупкая посуда, нужна упаковка, узкая лестница" />
            </label>
          </form>

          <aside className="req-msg" aria-label="Текст заявки">
            <p className="req-to">
              Сообщение менеджеру Алексею в Telegram, @{TG_USER}
            </p>
            <div className="bubble">
              {lines.map((l, i) => (
                <p key={i}>{l}</p>
              ))}
            </div>
            <button type="button" className="btn btn-main btn-wide" onClick={send}>
              <Icon name="tg" />
              Скопировать и открыть Telegram
            </button>
            <p className={'req-hint' + (copied ? ' ok' : '')} aria-live="polite">
              {copied ? 'Текст скопирован. Вставьте его в чат и приложите фото вещей.' : 'Текст скопируется сам, останется вставить его в чат.'}
            </p>
            <a className="btn btn-ghost btn-wide" href={TEL}>
              <Icon name="phone" />
              Или позвоните: {PHONE}
            </a>
            <p className="req-who">{MANAGERS}</p>
          </aside>
        </div>
      </div>
    </section>
  )
}

export function Contacts() {
  return (
    <section className="contacts rule" id="kontakty" aria-labelledby="kont-h">
      <div className="wrap ct-grid">
        <div className="ct-txt">
          <h2 id="kont-h">Контакты</h2>
          <a className="ct-phone" href={TEL}>
            {PHONE}
          </a>
          <ul className="ct-list">
            <li>
              <Icon name="clock" />
              <span>
                {OFFICE_HOURS}
                <small>{MOVES_HOURS}</small>
              </span>
            </li>
            <li>
              <Icon name="pin" />
              <span>
                Нижний Новгород, {ADDRESS}
                <small>
                  <a href={YANDEX} target="_blank" rel="noopener">
                    Открыть на Яндекс Картах
                  </a>
                </small>
              </span>
            </li>
            <li>
              <Icon name="tg" />
              <span>
                <a href={TG} target="_blank" rel="noopener">
                  @{TG_USER}
                </a>
                <small>Telegram менеджера Алексея, можно прислать фото вещей</small>
              </span>
            </li>
          </ul>
        </div>
        <div className="ct-map">
          <iframe src={YANDEX_MAP} title={`${NAME} на Яндекс Картах`} loading="lazy" allowFullScreen />
        </div>
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="ftr">
      <div className="wrap">
        <div className="ftr-grid">
          <div className="ftr-brand">
            <img src={img('logo-light.png')} alt="Moving town" width={642} height={137} loading="lazy" />
            <p>Переезды в Нижнем Новгороде, по области и по России.</p>
          </div>
          <nav className="ftr-col" aria-label="Разделы внизу страницы">
            <a href="#kuzov">Расчёт машины</a>
            <a href="#ceny">Цены</a>
            <a href="#uslugi">Услуги</a>
            <a href="#otzyvy">Отзывы</a>
            <a href="#zayavka">Заявка</a>
          </nav>
          <div className="ftr-col">
            <a className="ftr-big" href={TEL}>
              {PHONE}
            </a>
            <a href={TG} target="_blank" rel="noopener">
              Telegram @{TG_USER}
            </a>
            <span>{OFFICE_HOURS}</span>
            <span>{MOVES_HOURS}</span>
          </div>
          <div className="ftr-col">
            <span>Нижний Новгород, {ADDRESS}</span>
            <a href={YANDEX} target="_blank" rel="noopener">
              Открыть на Яндекс Картах
            </a>
          </div>
        </div>
        <p className="ftr-note">Цены на сайте взяты из прайса и ориентировочные. Сумму для вашего переезда называет менеджер до начала работы.</p>
      </div>
    </footer>
  )
}

export function BottomBar() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const top = document.getElementById('kuzov')
    const req = document.getElementById('zayavka')
    let pastTop = false
    let atReq = false
    const upd = () => setShow(pastTop && !atReq)
    const a = new IntersectionObserver(([e]) => {
      pastTop = !e.isIntersecting && e.boundingClientRect.top < 0
      upd()
    })
    const b = new IntersectionObserver(([e]) => {
      atReq = e.isIntersecting
      upd()
    })
    if (top) a.observe(top)
    if (req) b.observe(req)
    return () => {
      a.disconnect()
      b.disconnect()
    }
  }, [])
  return (
    <div className={'bbar' + (show ? ' show' : '')} aria-hidden={!show}>
      <a className="btn btn-main" href={TEL} tabIndex={show ? 0 : -1}>
        <Icon name="phone" />
        Позвонить
      </a>
      <a className="btn btn-line" href={TG} target="_blank" rel="noopener" tabIndex={show ? 0 : -1}>
        <Icon name="tg" />
        Telegram
      </a>
    </div>
  )
}
