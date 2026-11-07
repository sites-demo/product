import { FACTS, HOURLY, HOURS_LINE, PHONE, RATING, TEL, TG, YANDEX_REVIEWS, img } from '../data'
import { Icon } from './Icon'
import { Packer } from './Packer'

export function Header() {
  return (
    <header className="hdr">
      <div className="wrap hdr-in">
        <a className="logo" href="#top" aria-label="Moving town, на главную">
          <img src={img('logo.png')} alt="Moving town. Двигаемся к лучшему" width={642} height={137} />
        </a>
        <nav className="nav" aria-label="Разделы">
          <a href="#kuzov">Расчёт</a>
          <a href="#ceny">Цены</a>
          <a href="#uslugi">Услуги</a>
          <a href="#otzyvy">Отзывы</a>
          <a href="#kontakty">Контакты</a>
        </nav>
        <div className="hdr-cta">
          <a className="hdr-tg" href={TG} target="_blank" rel="noopener" aria-label="Написать в Telegram">
            <Icon name="tg" />
          </a>
          <a className="hdr-phone" href={TEL}>
            <Icon name="phone" />
            <span>{PHONE}</span>
          </a>
        </div>
      </div>
    </header>
  )
}

export function Hero() {
  return (
    <section className="hero" id="top">
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <p className="hero-where">Переезды в Нижнем Новгороде, по области и по России</p>
          <h1>Примерную цену назовём до приезда машины</h1>
          <p className="hero-lead">
            <b>
              {HOURLY.what}: {HOURLY.price.replace(/ /g, '\u00a0')} {HOURLY.unit}.
            </b>{' '}
            Упакуем, перевезём и соберём мебель, этажи отдельно не считаем. Платите после работы за фактические часы.
          </p>
          <div className="hero-cta">
            <a className="btn btn-main" href={TEL}>
              <Icon name="phone" />
              Позвонить
            </a>
            <a className="btn btn-line" href={TG} target="_blank" rel="noopener">
              <Icon name="tg" />
              Telegram
            </a>
          </div>
          <a className="hero-rate" href={YANDEX_REVIEWS} target="_blank" rel="noopener">
            <span className="stars" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <Icon key={i} name="star" />
              ))}
            </span>
            <span>
              <b>{RATING.value}</b> на Яндекс Картах, {RATING.ratings}
            </span>
          </a>
          <p className="hero-hours">{HOURS_LINE}</p>
        </div>
        <Packer />
      </div>
      <div className="wrap">
        <ul className="facts">
          {FACTS.map((f) => (
            <li key={f.b}>
              <b>{f.b}</b> {f.t}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
