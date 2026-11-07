import { useEffect, useState, type ReactNode } from 'react'
import { Icon } from './Icon'
import { Truck } from './Truck'
import { Callback, Request } from './Request'
import { mapUrl, media, photoUrl, telegramLink, telephone, useSiteContent } from './content'

const sections = [['#calc', 'Расчёт'], ['#services', 'Услуги'], ['#prices', 'Цены'], ['#contacts', 'Контакты']]
const factIcons = ['shield', 'doc', 'wallet', 'clock']

function Brand({ light }: { light?: boolean }) {
  return <a className={light ? 'brand brand-light' : 'brand'} href="#top" aria-label="Moving Town, на главную">
    <span className="brand-mark"><svg viewBox="0 0 36 36" width="33" height="33" fill="none" aria-hidden="true">
      <path d="M7 25V12l8 7 7-7h8m-4 0v13" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg></span>
    <span>MOVING<span className="brand-space"> </span>TOWN<small>ГОРОД ПЕРЕЕЗДОВ</small></span>
  </a>
}

function SectionHead({ label, title, children }: { label: string; title: string; children?: ReactNode }) {
  return <div className="section-head" data-reveal>
    <p className="eyebrow">{label}</p>
    <div><h2>{title}</h2>{children && <p>{children}</p>}</div>
  </div>
}

function QuoteLink({ children = 'Узнать цену', topic, select }: { children?: ReactNode; topic: string; select: (value: string) => void }) {
  return <a className="inline-link" href="#order" onClick={() => select(topic)}>{children}<Icon name="upRight" size={17} /></a>
}

export function App() {
  const { site, preview } = useSiteContent()
  const [menu, setMenu] = useState(false)
  const [topic, setTopic] = useState('')
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
            <a className="button primary" href="#calc">{hero.button} <Icon name="arrow" size={20} /></a>
            <a className="hero-telegram" href={telegram} target="_blank" rel="noopener noreferrer"><Icon name="send" size={18} /> Telegram</a>
          </div>
          <div className="hero-meta">
            <a href={reviews} target="_blank" rel="noopener noreferrer"><Icon name="star" size={17} /><strong>{rating.value}</strong> на Яндекс Картах <Icon name="upRight" size={14} /></a>
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
          <SectionHead label="Расчёт по фото" title="Рассчитайте свой переезд">
            Расскажите, что перевозим и куда. Если есть фото вещей, приложите их к заявке в Telegram.
          </SectionHead>
          <Request site={site} staticPreview={preview} />
          {promo.on && <div className="promo" id="promo"><div className="promo-label">−{promo.pct}%</div>
            <div><h3>{promo.title} {promo.pct}%</h3><p>{promo.text}</p></div>
            <QuoteLink topic={`Скидка ${promo.pct}% за заявку с сайта`} select={setTopic}>{promo.button}</QuoteLink>
          </div>}
        </div>
      </section>

      <section className="section wrap" id="services">
        <SectionHead label="Услуги" title={site.services.title}>{site.services.lead}</SectionHead>
        <div className="services-grid" data-reveal>
          {site.serviceList.map((service, index) => <article className="service" key={index}>
            <span className="service-icon"><Icon name={service.icon} size={24} /></span>
            <div className="service-copy"><h3>{service.title}</h3><p>{service.text}</p></div>
            <div className="service-bottom"><div><strong>{service.price}</strong>{service.note && <small>{service.note}</small>}</div>
              <a href="#order" onClick={() => setTopic(service.title)} aria-label={`Узнать цену: ${service.title}`}><Icon name="upRight" size={21} /></a>
            </div>
          </article>)}
        </div>
      </section>

      <section className="dark-band section" id="prices">
        <div className="wrap">
          <SectionHead label="Стоимость" title={site.prices.title}>{site.prices.lead}</SectionHead>
          <div className="prices-layout" data-reveal>
            <div className="price-feature">
              <Icon name="truck" size={30} /><span>{hero.tileLabel}</span>
              <strong>{hero.tilePrice} <small>₽/ч</small></strong>
              <p>{hero.tileNote}</p>
              <a className="button lime" href="#calc">Рассчитать по фото <Icon name="arrow" size={18} /></a>
            </div>
            <div className="price-rows">
              {site.rooms.map((room, index) => <article key={index} className="price-row">
                <div><h3>{room.name}</h3><span>{room.car} · {room.hours} · {room.crew}</span></div>
                <strong>{room.price}</strong>
                <a aria-label={`Узнать точную цену: ${room.name}`} href="#order" onClick={() => setTopic('Переезд, ' + room.name)}><Icon name="upRight" size={19} /></a>
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
          <SectionHead label="Как всё проходит" title={site.steps.title}>{site.steps.lead}</SectionHead>
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
            <p className="eyebrow">Организациям</p>
            <h2>{site.biz.title}</h2><p>{site.biz.lead}</p>
            <ul>{site.bizList.map((item, index) => <li key={index}><Icon name="check" size={17} /><span><strong>{item.title}</strong> {item.text}</span></li>)}</ul>
            <a className="button primary" href="#order" onClick={() => setTopic('Офисный переезд')}>{site.biz.button} <Icon name="arrow" size={18} /></a>
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
          <SectionHead label="Отзывы" title={site.reviews.title}>{site.reviews.lead}</SectionHead>
          <div className="review-strip"><div><Icon name="star" size={23} /><strong>{rating.value}</strong> <span>на Яндекс Картах</span></div>
            <a className="inline-link" href={reviews} target="_blank" rel="noopener noreferrer">Все отзывы <Icon name="upRight" size={18} /></a>
          </div>
          <div className="review-grid" data-reveal>{site.reviewList.map((review, index) => <article className="review" key={index}>
            <div className="stars" role="img" aria-label="5 из 5">{Array.from({ length: 5 }, (_, i) => <Icon key={i} name="star" size={15} />)}</div>
            <h3>{review.title.replace(' → ', ' — ')}</h3><p>{review.text}</p>
            <div className="review-author"><strong>{review.name}</strong><small>{review.meta}</small></div>
          </article>)}</div>
        </div>
      </section>

      <section className="section wrap faq-section" id="faq">
        <SectionHead label="Вопросы" title={site.faq.title}>{site.faq.lead}</SectionHead>
        <div className="faq-list" data-reveal>{site.faqList.map((item, index) => <details key={index}>
          <summary><span>{item.q}</span><Icon name="plus" size={21} /></summary><p>{item.a}</p>
        </details>)}</div>
      </section>

      <section className="section dark-band" id="order">
        <div className="wrap order-layout">
          <div>
            <p className="eyebrow">Связаться</p>
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

      <section className="wrap contact-section" id="contacts">
        <div><p className="eyebrow">Контакты</p><h2>{contacts.name}</h2></div>
        <div><strong>{contacts.address}</strong><span>{contacts.moves}</span></div>
        <a className="button secondary" href={mapUrl} target="_blank" rel="noopener noreferrer">Открыть на карте <Icon name="upRight" size={18} /></a>
      </section>
    </main>

    <footer className="footer"><div className="wrap footer-inner"><Brand light />
      <span>Переезды в Нижнем Новгороде и по России</span>
      <a className="admin-link" href={media('admin/')}>Вход для администратора</a>
    </div></footer>
    <nav className="mobile-bar" aria-label="Быстрые действия">
      <a className="button secondary" href={tel} aria-label="Позвонить"><Icon name="phone" size={20} /></a>
      <a className="button primary" href="#calc">Рассчитать переезд <Icon name="arrow" size={18} /></a>
    </nav>
  </>
}
