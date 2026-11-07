import { useEffect, useRef, useState } from 'react'
import { ADDRESS, BUS, CITY, DISTRICT, GALLERY, GIS_REVIEWS, GIS_URL, HOURS, LAT, LON, MARKS, MAX, NAME, PHONE, PHOTO_ALT, PRAISE, RATING, REVIEWS, ROUTES, TEL, TG, WA, img } from '../data'
import { addDays, plural, toDay, useBooking } from '../booking'
import { Icon } from './Icon'
import { useLightbox } from './Lightbox'

export function Top() {
  return (
    <div className="top">
      <div className="wrap top-in">
        <a className="logo" href="#top" aria-label={`${NAME}, наверх`}>
          <svg viewBox="0 0 32 32" aria-hidden="true" className="logo-m">
            <path d="M4 16 16 6l12 10" />
            <path d="M7.5 14v12h17V14" />
            <path d="M12 9.5 16 6l4 3.5" className="logo-g" />
            <rect x="13.5" y="17" width="5" height="5" rx="0.6" className="logo-w" />
          </svg>
          <span>
            <b>{NAME}</b>
            <small>Дом целиком · {CITY}</small>
          </span>
        </a>
        <nav className="nav" aria-label="Разделы">
          <a href="#dom">Дом</a>
          <a href="#foto">Фото</a>
          <a href="#bron">Бронь</a>
          <a href="#doroga">Как добраться</a>
          <a href="#voprosy">Вопросы</a>
        </nav>
        <a className="top-tel" href={TEL}>
          {PHONE}
        </a>
        <a className="btn btn-amber btn-sm" href="#bron">
          Выбрать даты
        </a>
      </div>
    </div>
  )
}

export function Gallery() {
  const [tab, setTab] = useState(GALLERY[1].id)
  const lb = useLightbox()
  const g = GALLERY.find((x) => x.id === tab) || GALLERY[0]
  return (
    <section className="gal" id="foto" aria-labelledby="gal-h">
      <div className="wrap">
        <div className="sec-head gal-head">
          <div>
            <p className="eyebrow">Фото хозяев</p>
            <h2 id="gal-h">Как выглядит дом</h2>
          </div>
          <div className="tabs" role="tablist" aria-label="Что показать">
            {GALLERY.map((x) => (
              <button key={x.id} type="button" role="tab" aria-selected={tab === x.id} className={'chip' + (tab === x.id ? ' chip-on' : '')} onClick={() => setTab(x.id)}>
                {x.label}
                <span className="chip-n">{x.photos.length}</span>
              </button>
            ))}
          </div>
        </div>
        <div className={'grid-ph n' + Math.min(g.photos.length, 5)}>
          {g.photos.slice(0, 5).map((p, i) => (
            <button key={p} type="button" className="gp" onClick={() => lb(g.photos, i)} aria-label={`Открыть фото: ${PHOTO_ALT[p]}`}>
              <img src={img(p, i !== 0)} alt={PHOTO_ALT[p]} loading="lazy" />
              {i === 4 && g.photos.length > 5 && <span className="gp-more">Ещё {g.photos.length - 5}</span>}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

export function NewYear() {
  const b = useBooking()
  const lb = useLightbox()
  const photos = ['34', '08', '35']
  const pick = () => {
    const now = new Date()
    const y = now.getMonth() === 0 && now.getDate() < 3 ? now.getFullYear() - 1 : now.getFullYear()
    const start = toDay(new Date(y, 11, 31))
    b.setDates(start, addDays(start, 2))
    b.setPurpose('Новый год')
    document.getElementById('zayavka')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  return (
    <section className="ny" aria-labelledby="ny-h">
      <div className="wrap ny-grid">
        <div className="ny-txt">
          <p className="eyebrow eyebrow-light">Праздники</p>
          <h2 id="ny-h">Новый год большой компанией</h2>
          <p className="lead lead-light">Ёлка, камин, длинный стол на всю гостиную и гирлянда на доме. Так дом выглядел в прошлые праздники, на фото хозяев. Даты на Новый год лучше занять заранее.</p>
          <button type="button" className="btn btn-amber" onClick={pick}>
            Заявка на 31 декабря
          </button>
          <p className="ny-hint">С 31 декабря на 2 ночи, даты можно поменять</p>
        </div>
        <div className="ny-ph">
          {photos.map((p, i) => (
            <button key={p} type="button" className={'nyp nyp' + i} onClick={() => lb(photos, i)} aria-label={`Открыть фото: ${PHOTO_ALT[p]}`}>
              <img src={img(p, i !== 0)} alt={PHOTO_ALT[p]} loading="lazy" />
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

export function Way() {
  const box = useRef<HTMLDivElement>(null)
  const [show, setShow] = useState(false)
  useEffect(() => {
    const el = box.current as HTMLDivElement
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShow(true)
          io.disconnect()
        }
      },
      { rootMargin: '300px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const pt = `${LON},${LAT}`
  return (
    <section className="way" id="doroga" aria-labelledby="way-h">
      <div className="wrap way-grid">
        <div>
          <p className="eyebrow">Как добраться</p>
          <h2 id="way-h">{ADDRESS[0].toUpperCase() + ADDRESS.slice(1)}</h2>
          <p className="way-sub">
            {CITY}, {DISTRICT}. В черте города, при этом гости в отзывах отмечают тишину.
          </p>
          <ul className="way-list">
            {ROUTES.map((r) => (
              <li key={r.from}>
                <Icon name={r.from.startsWith('Аэро') ? 'plane' : 'car'} />
                <span>
                  <b>{r.from}</b>
                  {r.km} км, около {r.min} минут на машине
                </span>
              </li>
            ))}
            <li>
              <Icon name="route" />
              <span>
                <b>Остановка «{BUS.stop}»</b>
                {BUS.m} метров, {BUS.walk} минуты пешком
              </span>
            </li>
            <li>
              <Icon name="clock" />
              <span>
                <b>Хозяева на связи</b>
                Каждый день {HOURS}. Прилетаете ночью? Напишите заранее, договоритесь о заселении.
              </span>
            </li>
          </ul>
          <div className="way-btns">
            <a className="btn btn-dark" href={`https://yandex.ru/maps/?rtext=~${LAT},${LON}&rtt=auto`} target="_blank" rel="noopener">
              <Icon name="route" />
              Маршрут в Яндекс Картах
            </a>
            <a className="btn btn-line" href={GIS_URL} target="_blank" rel="noopener">
              <Icon name="pin" />
              Открыть в 2ГИС
            </a>
          </div>
        </div>
        <div className="map" ref={box}>
          {show ? (
            <iframe title={`${NAME} на Яндекс Картах`} src={`https://yandex.ru/map-widget/v1/?ll=${pt}&pt=${pt},pm2rdl&z=15`} loading="lazy" allowFullScreen />
          ) : (
            <div className="map-ph">Карта загружается</div>
          )}
        </div>
      </div>
    </section>
  )
}

export function Reviews() {
  return (
    <section className="revs" aria-labelledby="revs-h">
      <div className="wrap revs-in">
        <div className="revs-score">
          <b>{RATING}</b>
          <span className="stars" aria-hidden="true">
            {Array.from({ length: 5 }, (_, i) => (
              <Icon key={i} name="star" className="ic ic-star" />
            ))}
          </span>
          <span>
            Оценка в 2ГИС, {MARKS} {plural(MARKS, 'оценка', 'оценки', 'оценок')} и {REVIEWS} {plural(REVIEWS, 'отзыв', 'отзыва', 'отзывов')}
          </span>
          <a className="btn btn-line" href={GIS_REVIEWS} target="_blank" rel="noopener">
            Читать отзывы на 2ГИС
          </a>
        </div>
        <div className="revs-txt">
          <p className="eyebrow">Отзывы гостей</p>
          <h2 id="revs-h">Что гости пишут о доме</h2>
          <p className="lead">Пересказали своими словами, о чём чаще всего пишут в отзывах. Гости пишут, что многие приезжают повторно. Сами отзывы с именами открыты в карточке 2ГИС.</p>
          <ul className="praise">
            {PRAISE.map((p) => (
              <li key={p}>
                <Icon name="check" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Дом сдаётся целиком или по комнатам?',
    a: 'Целиком: дом, двор, мангальная зона, беседка и гараж. Гости в отзывах хвалят приватность.',
  },
  {
    q: 'Сколько человек поместится?',
    a: 'Точного числа мест на сайте пока нет. Гости пишут, что спальных мест много: комната внизу и три наверху. Напишите в заявке, сколько вас, и хозяева скажут, как разместиться.',
  },
  {
    q: 'Как забронировать и нужна ли предоплата?',
    a: 'Выберите даты в блоке «Бронь» и отправьте заявку в WhatsApp или Telegram, можно и позвонить. Условия брони и оплаты хозяева напишут в ответ.',
  },
  {
    q: 'Можно заселиться ночью?',
    a: 'Рейсы в Якутск часто прилетают ночью. Впишите время прилёта в заявку, в поле «Время прилёта и пожелания», и договоритесь о заселении заранее.',
  },
  {
    q: 'Что есть в доме?',
    a: 'Кухня с холодильником, плитой и посудой, гостиная со столом на всю компанию, камин и телевизор, тёплая терраса. Гости пишут, что есть постельное бельё, пледы, чай и шампунь. Точный список уточните у хозяев.',
  },
  {
    q: 'Где оставить машину?',
    a: 'Есть тёплый гараж, гости пишут, что ворота автоматические. Ещё машины встают во дворе. Отметьте в заявке, что нужен гараж.',
  },
]

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section className="faq" id="voprosy" aria-labelledby="faq-h">
      <div className="wrap faq-grid">
        <div>
          <p className="eyebrow">Вопросы</p>
          <h2 id="faq-h">Коротко о главном</h2>
          <p className="lead">Не нашли ответ? Напишите или позвоните, хозяева на связи каждый день {HOURS}.</p>
        </div>
        <div className="acc">
          {FAQ.map((f, i) => (
            <div className={'acc-i' + (open === i ? ' open' : '')} key={f.q}>
              <h3>
                <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
                  {f.q}
                  <Icon name="chev" />
                </button>
              </h3>
              <div className="acc-b">
                <p>{f.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function Final() {
  return (
    <section className="final" aria-labelledby="final-h">
      <div className="wrap final-in">
        <div>
          <h2 id="final-h">Ждём вас в Якутске</h2>
          <p className="lead lead-light">Напишите, где вам удобнее, или позвоните. Хозяева на связи каждый день {HOURS}.</p>
        </div>
        <div className="final-btns">
          <a className="btn btn-amber" href="#bron">
            Выбрать даты
          </a>
          <a className="btn btn-ghost" href={WA} target="_blank" rel="noopener">
            <Icon name="wa" />
            WhatsApp
          </a>
          <a className="btn btn-ghost" href={TG} target="_blank" rel="noopener">
            <Icon name="tg" />
            Telegram
          </a>
          <a className="btn btn-ghost" href={MAX} target="_blank" rel="noopener">
            MAX
          </a>
          <a className="btn btn-ghost" href={TEL}>
            <Icon name="phone" />
            {PHONE}
          </a>
        </div>
      </div>
      <footer className="wrap foot">
        <span>
          © {NAME}, {CITY}, {ADDRESS}
        </span>
        <span>Здесь будут ИНН и политика обработки данных</span>
      </footer>
    </section>
  )
}

export function BottomBar() {
  const b = useBooking()
  const [show, setShow] = useState(false)
  const [atForm, setAtForm] = useState(false)
  useEffect(() => {
    const on = () => setShow(scrollY > 520)
    on()
    addEventListener('scroll', on, { passive: true })
    const form = document.getElementById('bron')
    const io = new IntersectionObserver(([e]) => setAtForm(e.isIntersecting), { rootMargin: '0px 0px -30% 0px' })
    if (form) io.observe(form)
    return () => {
      removeEventListener('scroll', on)
      io.disconnect()
    }
  }, [])
  const ready = !!(b.checkIn && b.checkOut)
  return (
    <div className={'bbar' + (show && !atForm ? ' show' : '')}>
      <a href={TEL} className="bb-i" aria-label={`Позвонить ${PHONE}`}>
        <Icon name="phone" />
        <span>Позвонить</span>
      </a>
      <a href={`${WA}?text=${encodeURIComponent(b.message())}`} className="bb-i" target="_blank" rel="noopener" aria-label="Написать в WhatsApp">
        <Icon name="wa" />
        <span>WhatsApp</span>
      </a>
      <a href={ready ? '#zayavka' : '#bron'} className="bb-go">
        {ready ? 'Отправить заявку' : 'Выбрать даты'}
      </a>
    </div>
  )
}
