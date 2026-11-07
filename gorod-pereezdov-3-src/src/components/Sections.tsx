import { useState } from 'react'
import { CITIES, COMPARE, FAQ, HOURLY, NAME, OFFICE, OFFICE_HOURS, PACKING_NOTE, PHONE, RATES, RATING, REVIEWS, SERVICES, STEPS, TEL, TG, TRUCKS, YANDEX_REVIEWS, img } from '../data'
import { useMove, type Mode } from '../move'
import { Icon } from './Icon'

const toKuzov = () => document.getElementById('kuzov')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

// Строка связи после прайса и после услуг: человек дочитал цены и сразу может позвонить.
function Reach() {
  return (
    <div className="reach">
      <a className="btn btn-main" href={TEL}>
        <Icon name="phone" />
        Позвонить
      </a>
      <a className="btn btn-line" href={TG} target="_blank" rel="noopener">
        <Icon name="tg" />
        Написать в Telegram
      </a>
      <p className="reach-t">
        <a href={TEL}>{PHONE}</a>
        <span>{OFFICE_HOURS}</span>
      </p>
    </div>
  )
}

export function Prices() {
  const { mode, setMode } = useMove()
  return (
    <section className="prices dark" id="ceny" aria-labelledby="ceny-h">
      <div className="wrap">
        <div className="sec-head">
          <h2 id="ceny-h">Сколько стоит переезд квартиры</h2>
          <p className="lead">Стартовые цены из нашего прайса. Они не всегда равны часам, умноженным на 3 300 ₽, поэтому сумму для вашего переезда назовём заранее, когда узнаем объём вещей, этаж и лифт. Платите за фактические часы.</p>
        </div>
        <div className="pr-grid">
          <div className="pr-hour">
            <p className="pr-hour-what">{HOURLY.what}</p>
            <p className="pr-hour-num">
              {HOURLY.price.replace(' ₽', '')}
              <small>₽ в час</small>
            </p>
            <p className="pr-hour-note">Платите за фактические часы. За этажи отдельно не берём, оплата после работы.</p>
          </div>
          <div className="pr-table" role="table" aria-label="Цены на переезд квартиры">
            <div className="pr-row pr-th" role="row">
              <span role="columnheader">Квартира</span>
              <span role="columnheader">Машина</span>
              <span role="columnheader">Бригада и время</span>
              <span role="columnheader">Цена</span>
            </div>
            {TRUCKS.map((t, i) => (
              <button
                key={t.id}
                type="button"
                role="row"
                className={'pr-row' + (mode === i + 1 ? ' on' : '')}
                onClick={() => {
                  setMode((i + 1) as Mode)
                  toKuzov()
                }}
                aria-label={`${t.rooms}: показать в кузове`}
              >
                <span role="cell" className="pr-rooms">
                  {t.rooms}
                </span>
                <span role="cell">{t.id} м³</span>
                <span role="cell">
                  {t.crew}, {t.hours}
                </span>
                <span role="cell" className="pr-price">
                  {t.price}
                </span>
              </button>
            ))}
            <p className="pr-tip">Нажмите на строку, и кузов наверху покажет, как поместятся вещи.</p>
          </div>
        </div>
        <div className="rates">
          <h3>Почасовые тарифы</h3>
          <ul>
            {RATES.map((r) => (
              <li key={r.name}>
                <span>
                  {r.name}
                  <small>{r.note}</small>
                </span>
                <b>{r.price}</b>
              </li>
            ))}
          </ul>
          <p className="rates-note">{PACKING_NOTE} Цены ориентировочные, итог согласуем до начала работы.</p>
        </div>
        <Reach />
      </div>
    </section>
  )
}

export function Services() {
  return (
    <section className="services rule" id="uslugi" aria-labelledby="uslugi-h">
      <div className="wrap">
        <div className="sec-head">
          <h2 id="uslugi-h">Не только квартиры</h2>
          <p className="lead">Работаем в Нижнем Новгороде, по области и по всей России.</p>
        </div>
        <ul className="svc">
          {SERVICES.map((s) => (
            <li key={s.title}>
              <div className="svc-t">
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
              <p className="svc-p">
                <b>{s.price}</b>
                {s.note && <small>{s.note}</small>}
              </p>
            </li>
          ))}
        </ul>
        <Reach />
      </div>
    </section>
  )
}

export function Compare() {
  return (
    <section className="compare rule" aria-labelledby="cmp-h">
      <div className="wrap">
        <div className="sec-head">
          <h2 id="cmp-h">Чем мы отличаемся от частника по объявлению</h2>
          <p className="lead">В отзывах на Яндексе не раз писали, что заплатили ровно столько, сколько назвали по телефону.</p>
        </div>
        <div className="cmp" role="table" aria-label="Сравнение">
          <div className="cmp-row cmp-th" role="row">
            <span role="columnheader" />
            <span role="columnheader" className="cmp-us">
              {NAME}
            </span>
            <span role="columnheader">Частник по объявлению</span>
          </div>
          {COMPARE.map((r) => (
            <div className="cmp-row" role="row" key={r.k}>
              <span role="rowheader" className="cmp-k">
                {r.k}
              </span>
              <span role="cell" className="cmp-us" data-who={NAME}>
                {r.a}
              </span>
              <span role="cell" className="cmp-them" data-who="Частник по объявлению">
                {r.b}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function Office() {
  return (
    <section className="office rule" id="ofis" aria-labelledby="ofis-h">
      <div className="wrap office-grid">
        <figure className="office-pic">
          <img src={img('packing.webp')} alt="Сотрудник упаковывает мебель в стрейч-плёнку" width={1200} height={900} loading="lazy" />
          <figcaption>Мебель перед переездом оборачиваем плёнкой</figcaption>
        </figure>
        <div className="office-txt">
          <h2 id="ofis-h">Переезд офиса без простоя</h2>
          <p className="lead">Перевозим офисы, склады, мастерские и оборудование. Планируем так, чтобы в понедельник все сели за свои столы.</p>
          <ul className="office-list">
            {OFFICE.map((o) => (
              <li key={o.b}>
                <b>{o.b}</b> {o.t}
              </li>
            ))}
          </ul>
          <div className="office-case">
            <p>
              <b>Офис 1 200 м² перевезли за два дня:</b> мебель и технику обернули плёнкой, документы сложили в коробки, рабочие места разобрали и собрали. <span className="mute">Из отзыва Екатерины на Яндекс Картах.</span>
            </p>
          </div>
          <div className="office-cta">
            <a className="btn btn-main" href={TEL}>
              <Icon name="phone" />
              Обсудить переезд офиса
            </a>
            <p className="mute">От 9 600 ₽ за офис на 1–3 рабочих места с разборкой и упаковкой.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

// Карта европейской части России: долгота и широта в координаты рисунка.
const px = (lon: number) => (lon - 28) * 26
const py = (lat: number) => (61.2 - lat) * 52
const NN = { x: px(44.0), y: py(56.33) }
const MSK = { x: px(37.62), y: py(55.75) }
const SPB = { x: px(30.32), y: py(59.94) }
// Подписи соседних городов: с какой стороны от точки, чтобы не наезжать на маршрут.
const OTHER = [
  { n: 'Владимир', lon: 40.4, lat: 56.13, side: 'down' },
  { n: 'Ярославль', lon: 39.9, lat: 57.63, side: 'right' },
  { n: 'Тверь', lon: 35.9, lat: 56.86, side: 'left' },
  { n: 'Казань', lon: 49.12, lat: 55.79, side: 'down' },
]
const ROUTE = `M${NN.x} ${NN.y} Q ${(NN.x + MSK.x) / 2} ${NN.y - 34} ${MSK.x} ${MSK.y} Q ${MSK.x - 70} ${(MSK.y + SPB.y) / 2 - 10} ${SPB.x} ${SPB.y}`

export function Intercity() {
  return (
    <section className="city" id="mezhgorod" aria-labelledby="city-h">
      <div className="wrap city-grid">
        <div className="city-txt">
          <h2 id="city-h">В другой город</h2>
          <p className="lead">Упакуем, загрузим, довезём и разгрузим на месте. Цена до Москвы и Петербурга уже с упаковкой.</p>
          <ul className="city-list">
            {CITIES.map((c) => (
              <li key={c.name}>
                <span>
                  {c.name}
                  <small>{c.note}</small>
                </span>
                <b>{c.price}</b>
              </li>
            ))}
          </ul>
          <a className="btn btn-line" href={TG} target="_blank" rel="noopener">
            <Icon name="tg" />
            Спросить про свой город
          </a>
        </div>
        <figure className="map" aria-label="Маршруты из Нижнего Новгорода в Москву и Петербург">
          <svg viewBox="0 0 600 360" role="img" aria-hidden="true">
            {OTHER.map((o) => (
              <g key={o.n} className="map-other">
                <circle cx={px(o.lon)} cy={py(o.lat)} r="3" />
                <text
                  x={px(o.lon) + (o.side === 'right' ? 9 : o.side === 'left' ? -9 : 0)}
                  y={py(o.lat) + (o.side === 'down' ? 20 : 4)}
                  textAnchor={o.side === 'left' ? 'end' : o.side === 'down' ? 'middle' : 'start'}
                >
                  {o.n}
                </text>
              </g>
            ))}
            <path className="map-route" d={ROUTE} id="route" />
            <path className="map-route-go" d={ROUTE} pathLength={1} />
            <g className="map-city">
              <circle cx={MSK.x} cy={MSK.y} r="6" />
              <text x={MSK.x - 12} y={MSK.y + 28} textAnchor="middle">
                Москва
              </text>
              <text className="map-price" x={MSK.x - 12} y={MSK.y + 48} textAnchor="middle">
                от 29 900 ₽
              </text>
            </g>
            <g className="map-city">
              <circle cx={SPB.x} cy={SPB.y} r="6" />
              <text x={SPB.x + 14} y={SPB.y - 14}>
                Санкт-Петербург
              </text>
              <text className="map-price" x={SPB.x + 14} y={SPB.y + 6}>
                от 59 000 ₽
              </text>
            </g>
            <g className="map-home">
              <circle cx={NN.x} cy={NN.y} r="9" />
              <circle cx={NN.x} cy={NN.y} r="3.5" className="dot" />
              <text x={NN.x + 4} y={NN.y - 20} textAnchor="middle">
                Нижний Новгород
              </text>
            </g>
          </svg>
        </figure>
      </div>
    </section>
  )
}

export function Reviews() {
  return (
    <section className="revs rule" id="otzyvy" aria-labelledby="otzyvy-h">
      <div className="wrap">
        <div className="revs-head">
          <div className="sec-head">
            <h2 id="otzyvy-h">Что пишут о нас на Яндексе</h2>
            <p className="lead">Пересказали коротко несколько отзывов. Полные тексты на Яндекс Картах.</p>
          </div>
          <a className="revs-score" href={YANDEX_REVIEWS} target="_blank" rel="noopener">
            <b>{RATING.value}</b>
            <span>
              <span className="stars" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Icon key={i} name="star" />
                ))}
              </span>
              {RATING.ratings}, {RATING.reviews}
              <u>Все отзывы на Яндекс Картах</u>
            </span>
          </a>
        </div>
        <ul className="revs-list">
          {REVIEWS.map((r) => (
            <li key={r.title}>
              <h3>{r.title}</h3>
              <p>{r.text}</p>
              <p className="revs-who">
                <b>{r.name}</b>
                <span>{r.meta}</span>
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function Steps() {
  return (
    <section className="steps rule" aria-labelledby="steps-h">
      <div className="wrap">
        <div className="sec-head">
          <h2 id="steps-h">От звонка до новоселья</h2>
          <p className="lead">Если хватает фото, приезжать на оценку не нужно.</p>
        </div>
        <ol className="steps-list">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="steps-n">{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section className="faq rule" id="voprosy" aria-labelledby="faq-h">
      <div className="wrap faq-grid">
        <div className="sec-head">
          <h2 id="faq-h">Частые вопросы</h2>
          <p className="lead">
            Не нашли ответ? Позвоните, расскажем: <a href={TEL}>+7 (831) 231-06-95</a>
          </p>
        </div>
        <div className="faq-list">
          {FAQ.map((f, i) => (
            <div key={f.q} className={'qa' + (open === i ? ' open' : '')}>
              <h3>
                <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
                  {f.q}
                  <Icon name="plus" />
                </button>
              </h3>
              <div className="qa-a" hidden={open !== i}>
                <p>{f.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
