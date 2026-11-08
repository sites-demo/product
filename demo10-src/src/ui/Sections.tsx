import type { Site } from '../types'
import { Gallery } from './Gallery'
import { RatingLine } from './RatingLine'

export function Services({ site, title = 'Услуги' }: { site: Site; title?: string }) {
  if (!site.services.length) return null
  const groups = [...new Set(site.services.map(s => s.group ?? ''))]
  return <section className="section" id="services">
    <div className="wrap">
      <div className="section-head"><h2>{title}</h2>{site.servicesNote && <p>{site.servicesNote}</p>}</div>
      <div className="svc-groups">
        {groups.map(g => <div key={g} className="svc-group">
          {g && <h3>{g}</h3>}
          <ul className="svc">
            {site.services.filter(s => (s.group ?? '') === g).map(s => <li key={s.title}>
              <div><b>{s.title}</b>{s.text && <p>{s.text}</p>}</div>
              {s.price && <span className="svc-price">{s.price}</span>}
            </li>)}
          </ul>
        </div>)}
      </div>
    </div>
  </section>
}

export function Prices({ site, title = 'Цены' }: { site: Site; title?: string }) {
  if (!site.prices?.length) return null
  return <section className="section" id="prices">
    <div className="wrap">
      <div className="section-head"><h2>{title}</h2>{site.pricesNote && <p>{site.pricesNote}</p>}</div>
      <ul className="price-grid">
        {site.prices.map(p => <li key={p.title}><b>{p.title}</b>{p.text && <p>{p.text}</p>}<span>{p.price}</span></li>)}
      </ul>
    </div>
  </section>
}

export function Steps({ site, title = 'Как проходит заказ' }: { site: Site; title?: string }) {
  if (!site.steps?.length) return null
  return <section className="section" id="steps">
    <div className="wrap">
      <div className="section-head"><h2>{title}</h2></div>
      <ol className="steps">{site.steps.map((s, i) => <li key={s.title}><span className="step-n">Шаг {i + 1}</span><h3>{s.title}</h3><p>{s.text}</p></li>)}</ol>
    </div>
  </section>
}

export function Facts({ site }: { site: Site }) {
  if (!site.facts.length) return null
  return <section className="section facts-sec">
    <div className="wrap facts">{site.facts.map(f => <div key={f.title} className="fact"><h3>{f.title}</h3><p>{f.text}</p></div>)}</div>
  </section>
}

export function Praise({ site }: { site: Site }) {
  if (!site.praise?.length) return null
  return <section className="section praise-sec" id="reviews">
    <div className="wrap praise-in">
      <div className="section-head"><h2>За что хвалят в отзывах</h2><RatingLine site={site} /></div>
      <ul className="praise">{site.praise.map(p => <li key={p}>{p}</li>)}</ul>
    </div>
  </section>
}

export function Works({ site, title, id = 'works', skip = 0 }: { site: Site; title: string; id?: string; skip?: number }) {
  const photos = site.photos.slice(skip)
  if (!photos.length) return null
  return <section className="section" id={id}>
    <div className="wrap">
      <div className="section-head"><h2>{title}</h2></div>
      <Gallery photos={photos} />
    </div>
  </section>
}
