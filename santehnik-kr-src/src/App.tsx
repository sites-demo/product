import { useEffect, useRef, useState } from 'react'
import { AREAS, BASE, MAPS_URL, PHONE, PHOTOS, PLANNED, REVIEWS, TEL, URGENT, VIBER } from './data'
import { Lightbox } from './components/Lightbox'
import { PhoneIcon } from './components/PhoneIcon'
import { PriceRow } from './components/PriceRow'
import { WaterNode } from './components/WaterNode'

export function App() {
  const heroCta = useRef<HTMLAnchorElement>(null)
  const finalBlock = useRef<HTMLElement>(null)
  const [barOn, setBarOn] = useState(false)
  const [photo, setPhoto] = useState<number | null>(null)

  useEffect(() => {
    const seen = { hero: true, final: false }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.target === heroCta.current) seen.hero = e.isIntersecting
        else seen.final = e.isIntersecting
      })
      setBarOn(!seen.hero && !seen.final)
    })
    io.observe(heroCta.current as Element)
    io.observe(finalBlock.current as Element)
    return () => io.disconnect()
  }, [])

  return (
    <>
      <header className="top">
        <div className="wrap">
          <a className="brand" href="#top">
            Сантехник <span>Кривой Рог</span>
          </a>
          <nav aria-label="Разделы">
            <a href="#prices">Цены</a>
            <a href="#works">Работы</a>
            <a href="#reviews">Отзывы</a>
            <a href="#contacts">Контакты</a>
          </nav>
          <a className="tp" href={TEL}>
            {PHONE}
          </a>
        </div>
      </header>

      <main>
        <section className="hero" id="top">
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <h1>Сантехник на вызов в&nbsp;Кривом Роге</h1>
              <p className="lead">
                Частный мастер без посредников. <b>Срочный вызов от&nbsp;800&nbsp;грн.</b>
              </p>
              <a className="btn btn-call big" href={TEL} ref={heroCta}>
                <PhoneIcon />
                <span className="big-t">
                  <span className="big-l">Позвонить мастеру</span> <b>{PHONE}</b>
                </span>
              </a>
              <a className="btn btn-ghost" href={VIBER}>
                Написать в Viber
              </a>
              <p className="note">Сумму согласуете с мастером до начала работ. В&nbsp;Google Картах: круглосуточно, про выезд ночью мастер скажет по телефону.</p>
              <figure className="hq">
                <blockquote>«Позвонила в восемь, в полдевятого сантехник был уже у меня»</blockquote>
                <figcaption>Рита Кац, отзыв клиента</figcaption>
              </figure>
            </div>
            <WaterNode />
          </div>
        </section>

        <section className="prices" id="prices">
          <div className="wrap split">
            <div className="side">
              <h2>Что случилось?</h2>
              <p>Выберите, что случилось, и звоните прямо из строки. Цены «от», итог зависит от работы и материалов.</p>
              <a className="btn btn-call side-call" href={TEL}>
                <PhoneIcon />
                {PHONE}
              </a>
            </div>
            <div>
              <h3 className="grp urgent">Срочно</h3>
              {URGENT.map((it, i) => (
                <PriceRow key={it.t} it={it} startOpen={i === 0} />
              ))}
              <h3 className="grp">Плановые работы</h3>
              {PLANNED.map((it) => (
                <PriceRow key={it.t} it={it} />
              ))}
              <p className="small">При звонке спросите про стоимость выезда, гарантию и выезд ночью.</p>
            </div>
          </div>
        </section>

        <section className="works" id="works">
          <div className="wrap">
            <h2>Работы мастера</h2>
            <div className="gal">
              {PHOTOS.map((p, i) => (
                <figure className={p.c} key={p.f}>
                  <button type="button" onClick={() => setPhoto(i)} aria-label={`Открыть фото: ${p.t}`}>
                    <img src={`${BASE}img/${p.f}.webp`} alt={`${p.t}. ${p.s}`} width={p.w} height={p.h} loading="lazy" decoding="async" />
                  </button>
                  <figcaption>
                    <b>{p.t}</b> {p.s}
                  </figcaption>
                </figure>
              ))}
              <div className="gal-cta">
                <h3>Нужна похожая работа?</h3>
                <p>Опишите задачу по телефону, сумму согласуете с мастером до начала работ.</p>
                <a className="btn btn-call" href={TEL}>
                  <PhoneIcon />
                  {PHONE}
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="how">
          <div className="wrap split">
            <div className="side">
              <h2>Как вызвать мастера</h2>
            </div>
            <div>
              <ol className="steps">
                <li>
                  <span>
                    <b>Позвоните</b> <a href={TEL}>{PHONE}</a> и опишите, что случилось.
                  </span>
                </li>
                <li>
                  <span>
                    <b>Назовите район.</b> Мастер уточнит материалы и время приезда.
                  </span>
                </li>
                <li>
                  <span>
                    <b>Согласуйте сумму</b> до начала работ.
                  </span>
                </li>
              </ol>
              <h3 className="grp">Районы выезда</h3>
              <ul className="areas">
                {AREAS.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
              <p className="small">Выезд по вашему адресу мастер уточнит при звонке.</p>
            </div>
          </div>
        </section>

        <section className="reviews" id="reviews">
          <div className="wrap">
            <h2>Отзывы</h2>
            <div className="rv">
              {REVIEWS.map((r) => (
                <figure key={r.a}>
                  <blockquote>«{r.q}»</blockquote>
                  <figcaption>{r.a}</figcaption>
                </figure>
              ))}
            </div>
            <a className="more" href={MAPS_URL} target="_blank" rel="noopener">
              Все отзывы в Google Картах
            </a>
          </div>
        </section>

        <section className="final" id="contacts" ref={finalBlock}>
          <div className="wrap">
            <h2>Течёт или засор? Позвоните мастеру</h2>
            <a className="bignum" href={TEL}>
              {PHONE}
            </a>
            <div className="fa">
              <a className="btn btn-light" href={TEL}>
                <PhoneIcon />
                Позвонить мастеру
              </a>
              <a className="btn btn-ghost inv" href={VIBER}>
                Написать в Viber
              </a>
            </div>
            <p className="k">В&nbsp;Google Картах: круглосуточно. Про выезд ночью мастер скажет по телефону.</p>
            <dl>
              <div>
                <dt>Адрес</dt>
                <dd>
                  <a href={MAPS_URL} target="_blank" rel="noopener">
                    ул. Катерининская, 3, Кривой Рог
                  </a>
                </dd>
              </div>
              <div>
                <dt>Почта</dt>
                <dd>
                  <a href="mailto:elsant.kr@gmail.com">elsant.kr@gmail.com</a>
                </dd>
              </div>
            </dl>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <span>Сантехник, Кривой Рог</span>
          <span>
            Сайт сделан в студии «Стожар» · <a href="https://www.studio-sait.ru/">studio-sait.ru</a>
          </span>
        </div>
      </footer>

      <div className={'bar' + (barOn ? ' on' : '')}>
        <a className="btn btn-call" href={TEL} tabIndex={barOn ? undefined : -1}>
          <PhoneIcon />
          Позвонить мастеру
        </a>
        <a className="btn btn-ghost" href={VIBER} tabIndex={barOn ? undefined : -1}>
          Viber
        </a>
      </div>

      <Lightbox photos={PHOTOS} index={photo} onIndex={setPhoto} />
    </>
  )
}
