import type { Site } from '../types'
import { mapSrc, telHref, tgHref, waHref } from './links'
import { Icon } from './Icon'
import { RatingLine } from './RatingLine'

export function Contacts({ site, title = 'Как нас найти' }: { site: Site; title?: string }) {
  const map = mapSrc(site)
  return <section className="section contacts" id="contacts">
    <div className="wrap contacts-in">
      <div className="contacts-text">
        <h2>{title}</h2>
        <dl className="contact-list">
          <div><dt><Icon name="pin" /> Адрес</dt><dd>{site.city}, {site.address}{site.addressNote && <small>{site.addressNote}</small>}</dd></div>
          <div><dt><Icon name="clock" /> Часы работы</dt><dd>{site.hours}</dd></div>
          <div><dt><Icon name="phone" /> Телефон</dt><dd>{site.phones.map(p => <a key={p.tel} href={telHref(p.tel)}>{p.display}{p.note && <small>{p.note}</small>}</a>)}</dd></div>
        </dl>
        <div className="contact-btns">
          {site.whatsapp && <a className="btn btn-accent" href={waHref(site.whatsapp)} target="_blank" rel="noopener noreferrer"><Icon name="wa" />WhatsApp</a>}
          {site.telegram && <a className="btn btn-ghost" href={tgHref(site.telegram)} target="_blank" rel="noopener noreferrer"><Icon name="tg" />Telegram</a>}
          {site.vk && <a className="btn btn-ghost" href={site.vk} target="_blank" rel="noopener noreferrer"><Icon name="vk" />ВКонтакте</a>}
        </div>
        <RatingLine site={site} />
      </div>
      {map && <div className="map"><iframe src={map} title={`${site.name} на карте`} loading="lazy" allowFullScreen /></div>}
    </div>
  </section>
}
