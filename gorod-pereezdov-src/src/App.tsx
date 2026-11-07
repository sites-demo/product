import { useEffect, useState, type ReactNode } from 'react'
import { Icon } from './Icon'
import { Truck } from './Truck'
import { Callback, Request, type Preset } from './Request'
import { mapUrl, media, photoUrl, telegramLink, telephone, useSiteContent } from './content'

const sections = [['#calc', 'Расчёт'], ['#services', 'Услуги'], ['#prices', 'Цены'], ['#contacts', 'Контакты']]
const footerLinks = [['#calc', 'Расчёт переезда'], ['#services', 'Услуги'], ['#prices', 'Цены'], ['#reviews', 'Отзывы'], ['#faq', 'Вопросы']]
const mapWidget = 'https://yandex.ru/map-widget/v1/?oid=52265900654&ol=biz&z=16'
const factIcons = ['shield', 'doc', 'wallet', 'clock']

function Brand({ light }: { light?: boolean }) {
  return <a className={light ? 'brand brand-light' : 'brand'} href="#top" aria-label="Moving town, на главную">
    <img src={media(light ? 'logo-light.png' : 'logo.png')} alt="" width="642" height="137" />
  </a>
}

function SectionHead({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="section-head" data-reveal>
    <h2>{title}</h2>{children && <p>{children}</p>}
  </div>
}

function QuoteLink({ children = 'Узнать цену', topic, select }: { children?: ReactNode; topic: string; select: (value: string) => void }) {
  return <a className="inline-link" href="#order" onClick={() => select(topic)}>{children}</a>
}

export function App() {
  const { site, preview } = useSiteContent()
  const [menu, setMenu] = useState(false)
  const [topic, setTopic] = useState('')
  const [preset, setPreset] = useState<Preset>()
  const [barAway, setBarAway] = useState(false)
  const { hero, contacts, promo, rating } = site
  const tel = telephone(contacts.phone)
  const telegram = telegramLink(contacts.telegram)
  const reviews = mapUrl + 'reviews/'
  const callbackKey = topic || 'general'

  useEffect(() => {
    if (preview || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('revealed')
        observer.unobserve(entry.target)
      }
    }, { threshold: 0.15 })
    document.querySelectorAll('[data-reveal]').forEach(element => observer.observe(element))
    return () => observer.disconnect()
  }, [preview])

  // Нижняя панель на телефоне не нужна, пока человек в расчёте или в форме звонка: там свои кнопки.
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return
    const inside = new Set<Element>()
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.isIntersecting ? inside.add(entry.target) : inside.delete(entry.target))
      setBarAway(inside.size > 0)
    }, { rootMargin: '0px 0px -25% 0px' })
    ;['calc', 'order'].forEach(id => { const section = document.getElementById(id); if (section) observer.observe(section) })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (menu) document.querySelector<HTMLAnchorElement>(".main-nav a")?.focus()
  }, [menu])

  useEffect(() => {
    const id = location.hash.slice(1)
    if (id) document.getElementById(id)?.scrollIntoView({ behavior: 'instant' })
  }, [])

  return <>
    <a className="skip-link" href="#main">К содержанию</a>
    <header className="header" id="top">
      <div className="wrap header-inner">
        <Brand />
        <nav aria-label="Основное меню" id="main-nav" className={menu ? 'main-nav open' : 'main-nav'}
          onKeyDown={event => { if (event.key === 'Escape') { setMenu(false); document.getElementById('menu-toggle')?.focus() } }}>
          {sections.map(([id, label]) => <a key={id} href={id} onClick={() => setMenu(false)}>{label}</a>)}
        </nav>
        <a className="header-phone" href={tel} aria-label={`Позвонить: ${contacts.phone}`}><Icon name="phone" size={17} /> <span>{contacts.phone}</span></a>
        <button type="button" className="menu-toggle" id="menu-toggle" aria-label={menu ? 'Закрыть меню' : 'Открыть меню'}
          aria-expanded={menu} aria-controls="main-nav" onClick={() => setMenu(!menu)}><Icon name={menu ? 'close' : 'menu'} /></button>
      </div>
    </header>

    <main id="main">
      <section className="hero wrap" aria-labelledby="hero-title">
        <div className="hero-copy">
          <div className="hero-location"><Icon name="pin" size={18} /> {hero.city}</div>
          <h1 id="hero-title">{hero.title}<br /><em>{hero.accent}</em></h1>
          <p className="hero-description">{hero.sub}</p>
          <div className="hero-actions">
            <a className="button primary" href="#calc">{hero.button}</a>
            <a className="hero-telegram" href={telegram} target="_blank" rel="noopener noreferrer"><Icon name="send" size={18} /> Telegram</a>
          </div>
          <div className="hero-meta">
            <a href={reviews} target="_blank" rel="noopener noreferrer"><Icon name="star" size={17} /><strong>{rating.value}</strong> на Яндекс Картах</a>
            <span>{hero.point}</span>
          </div>
        </div>
        <Truck preview={preview} />
      </section>

      <div className="wrap fact-wrap" id="facts">
        <ul className="facts" aria-label="Условия переезда">
          {site.facts.map((fact, index) => <li key={index}><span className="fact-icon"><Icon name={factIcons[index % factIcons.length]} size={23} /></span>
            <div><strong>{fact.title}</strong><span>{fact.text}</span></div>
          </li>)}
        </ul>
      </div>

      <section className="section calc-section" id="calc">
        <div className="wrap">
          <SectionHead title="Рассчитайте свой переезд">
            Расскажите, что перевозим и куда. Если есть фото вещей, приложите их к заявке в Telegram.
          </SectionHead>
          <Request site={site} staticPreview={preview} preset={preset} />
          {promo.on && <div className="promo" id="promo"><div className="promo-label">−{promo.pct}%</div>
            <div><h3>{promo.title} {promo.pct}%</h3><p>{promo.text}</p></div>
            <QuoteLink topic={`Скидка ${promo.pct}% за заявку с сайта`} select={setTopic}>{promo.button}</QuoteLink>
          </div>}
        </div>
      </section>

      <section className="section wrap" id="services">
        <SectionHead title={site.services.title}>{site.services.lead}</SectionHead>
        <div className="services-grid" data-reveal>
          {site.serviceList.map((service, index) => <article className="service" key={index}>
            <span className="service-icon"><Icon name={service.icon} size={24} /></span>
            <div className="service-copy"><h3><a href="#order" onClick={() => setTopic(service.title)}>{service.title}</a></h3><p>{service.text}</p></div>
            <div className="service-bottom"><strong>{service.price}</strong>{service.note && <small>{service.note}</small>}</div>
          </article>)}
        </div>
      </section>

      <section className="dark-band section" id="prices">
        <div className="wrap">
          <SectionHead title={site.prices.title}>{site.prices.lead}</SectionHead>
          <div className="prices-layout" data-reveal>
            <div className="price-feature">
              <Icon name="truck" size={30} /><span>{hero.tileLabel}</span>
              <strong>{hero.tilePrice} <small>₽/ч</small></strong>
              <p>{hero.tileNote}</p>
              <a className="button lime" href="#calc">Рассчитать по фото</a>
            </div>
            <div className="price-rows">
              {site.rooms.map((room, index) => <article key={index} className="price-row">
                <div><h3><a href="#calc" onClick={() => setPreset({ rooms: index, n: Date.now() })}>{room.name}</a></h3><span>{room.car} · {room.hours} · {room.crew}</span></div>
                <strong>{room.price}</strong>
                <span className="price-go">Рассчитать</span>
              </article>)}
            </div>
          </div>
          <details className="rate-details"><summary>{site.prices.ratesTitle}<Icon name="plus" size={21} /></summary>
            <div className="rate-columns">
              <dl>{site.rates.map((rate, index) => <div key={index}><dt>{rate.name}{rate.note && <small>{rate.note}</small>}</dt><dd>{rate.price}</dd></div>)}</dl>
              <div><h3>{site.prices.incTitle}</h3><ul>{site.includes.map((item, index) => <li key={index}>{item.text}</li>)}</ul></div>
            </div>
            <p>{site.prices.note}</p>
          </details>
        </div>
      </section>

      <section className="section tinted" id="steps">
        <div className="wrap">
          <SectionHead title={site.steps.title}>{site.steps.lead}</SectionHead>
          <ol className="timeline" data-reveal>
            {site.stepList.map((item, index) => <li key={index}><span className="timeline-number">{index + 1}</span>
              <h3>{item.title}</h3><p>{item.text}</p>
            </li>)}
          </ol>
          <details className="conditions" id="why">
            <summary>Условия переезда <Icon name="plus" size={20} /></summary>
            <dl>{site.compareRows.map((item, index) => <div key={index}><dt>{item.k}</dt><dd>{item.a}</dd></div>)}</dl>
          </details>
        </div>
      </section>

      <section className="section wrap" id="business">
        <div className="business-grid">
          <div className="business-photo" data-reveal>
            <img src={photoUrl(hero.photo1, 'media/hero-m.webp')} alt="Упаковка мебели перед переездом" width="720" height="540" loading="lazy" />
            <span><Icon name="box" size={18} /> {hero.cap1}</span>
          </div>
          <div className="business-copy" data-reveal>
            <h2>{site.biz.title}</h2><p>{site.biz.lead}</p>
            <ul>{site.bizList.map((item, index) => <li key={index}><strong>{item.title}</strong> {item.text}</li>)}</ul>
            <a className="button primary" href="#order" onClick={() => setTopic('Офисный переезд')}>{site.biz.button}</a>
          </div>
        </div>
        <div className="business-case">
          <img src={photoUrl(hero.photo2, 'photo-loading.webp')} alt="Погрузка мебели в машину" width="640" height="480" loading="lazy" />
          <div><strong>{site.biz.statValue} {site.biz.statUnit}</strong><h3>{site.biz.statCaption}</h3><p>{site.biz.statText}</p></div>
          <dl>{site.bizMini.map((item, index) => <div key={index}><dt>{item.value}</dt><dd>{item.label}</dd></div>)}</dl>
        </div>
      </section>

      <section className="section tinted" id="reviews">
        <div className="wrap">
          <SectionHead title={site.reviews.title}>{site.reviews.lead}</SectionHead>
          <div className="review-strip"><div><Icon name="star" size={23} /><strong>{rating.value}</strong> <span>на Яндекс Картах</span></div>
            <a className="inline-link" href={reviews} target="_blank" rel="noopener noreferrer">Все отзывы на Яндекс Картах</a>
          </div>
          <div className="review-grid" data-reveal>{site.reviewList.map((review, index) => <article className="review" key={index}>
            <h3>{review.title.replace(' → ', ' — ')}</h3><p>{review.text}</p>
            <div className="review-author"><strong>{review.name}</strong><small>{review.meta}</small></div>
          </article>)}</div>
        </div>
      </section>

      <section className="section wrap faq-section" id="faq">
        <SectionHead title={site.faq.title}>{site.faq.lead}</SectionHead>
        <div className="faq-list" data-reveal>{site.faqList.map((item, index) => <details key={index}>
          <summary><span>{item.q}</span><Icon name="plus" size={21} /></summary><p>{item.a}</p>
        </details>)}</div>
      </section>

      <section className="section dark-band" id="order">
        <div className="wrap order-layout">
          <div>
            <h2>{site.order.title}</h2>
            <a className="big-phone" href={tel}>{contacts.phone}</a>
            <p>Ежедневно с {contacts.from} до {contacts.to}.</p>
            <div className="order-actions"><a className="button lime" href={tel}><Icon name="phone" size={18} /> Позвонить</a>
              <a className="button on-dark" href={telegram} target="_blank" rel="noopener noreferrer"><Icon name="send" size={18} /> Написать в Telegram</a>
            </div>
            <p className="team-line">{site.teamText.title}</p>
          </div>
          <Callback key={callbackKey} site={site} topic={topic} clearTopic={() => setTopic('')} />
        </div>
      </section>

      <section className="section contact-section" id="contacts">
        <div className="wrap contact-grid">
          <div className="contact-copy">
            <h2>{contacts.name}</h2>
            <dl>
              <div><dt>Офис</dt><dd>{contacts.address}<span>Ежедневно с {contacts.from} до {contacts.to}</span></dd></div>
              <div><dt>Переезды</dt><dd>{contacts.moves}</dd></div>
              <div><dt>Телефон</dt><dd><a href={tel}>{contacts.phone}</a></dd></div>
              <div><dt>Telegram</dt><dd><a href={telegram} target="_blank" rel="noopener noreferrer">@{contacts.telegram.replace(/^@/, '')}</a></dd></div>
            </dl>
            <a className="button secondary" href={mapUrl} target="_blank" rel="noopener noreferrer">Открыть в Яндекс Картах</a>
          </div>
          <div className="contact-map">
            <iframe src={mapWidget} title={`Moving town на карте: ${contacts.address}`} loading="lazy" />
          </div>
        </div>
      </section>
    </main>

    <footer className="footer"><div className="wrap">
      <div className="footer-top">
        <div className="footer-brand"><Brand light /><p>Переезды в Нижнем Новгороде и по России</p></div>
        <nav aria-label="Разделы сайта"><ul>{footerLinks.map(([id, label]) => <li key={id}><a href={id}>{label}</a></li>)}</ul></nav>
        <div className="footer-contacts">
          <a href={tel}>{contacts.phone}</a>
          <a href={telegram} target="_blank" rel="noopener noreferrer">Telegram</a>
          <span>{contacts.address}</span>
        </div>
      </div>
      <div className="footer-bottom">
        <span>{contacts.name}</span>
        <a className="admin-link" href={media('admin/')}>Вход для администратора</a>
      </div>
    </div></footer>
    <nav className={barAway ? 'mobile-bar away' : 'mobile-bar'} aria-label="Быстрые действия" inert={barAway}>
      <a className="button secondary" href={tel} aria-label="Позвонить"><Icon name="phone" size={20} /></a>
      <a className="button primary" href="#calc">Рассчитать переезд</a>
    </nav>
  </>
}
