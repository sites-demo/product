import { useEffect, useState } from 'react'
import type { Site } from '../../types'
import { Header } from '../../ui/Header'
import { Footer } from '../../ui/Footer'
import { Contacts } from '../../ui/Contacts'
import { MobileBar } from '../../ui/MobileBar'
import { RatingLine } from '../../ui/RatingLine'
import { Praise, Works } from '../../ui/Sections'
import { asset } from '../../ui/links'
import { SeasonSky } from './SeasonSky'
import { Booking } from './Booking'
import './hotel.css'

type Season = 'winter' | 'summer'
const NAMES: Record<Season, string> = { winter: 'Зима', summer: 'Лето' }

export function HotelPage({ site }: { site: Site }) {
  const h = site.hotel!
  const [season, setSeason] = useState<Season>(h.season ?? 'winter')
  // После загрузки показываем тот сезон, что сейчас за окном: с ноября по март зима.
  useEffect(() => { const m = new Date().getMonth(); setSeason(m >= 10 || m <= 2 ? 'winter' : 'summer') }, [])
  const photo = h.seasons[season]
  const nav: [string, string][] = [['#rooms', 'Номера'], ['#season', 'Чем заняться'], ...h.features.map(f => [`#${f.id}`, f.title] as [string, string]), ['#contacts', 'Как добраться']]
  return <>
    <Header site={site} nav={nav.slice(0, 5)} />
    <main>
      <section className={`hh hh-${season}`} data-hero>
        <div className="hh-hero">
          <div className="hh-media">
            {(['winter', 'summer'] as Season[]).map(s => <img key={s} className={s === season ? 'on' : ''} src={asset(h.seasons[s].src)} alt={h.seasons[s].alt} width={h.seasons[s].w} height={h.seasons[s].h} fetchPriority={s === season ? 'high' : 'low'} />)}
            <SeasonSky season={season} />
          </div>
          <div className="wrap hh-text">
            <div className="seg hh-seg" role="group" aria-label="Сезон">
              {(['winter', 'summer'] as Season[]).map(s => <button key={s} type="button" aria-pressed={s === season} onClick={() => setSeason(s)}>{NAMES[s]}</button>)}
            </div>
            <h1>{site.hero.title}</h1>
            <p className="lead">{site.hero.lead}</p>
            <RatingLine site={site} className="hh-rating" />
          </div>
        </div>
        <div className="hh-book"><Booking site={site} /></div>
        <span className="sr-only" aria-live="polite">{photo.alt}</span>
      </section>

      <section className="section" id="rooms">
        <div className="wrap">
          <div className="section-head"><h2>Номера</h2>{h.roomsNote && <p>{h.roomsNote}</p>}</div>
          {h.rooms.some(r => r.photo) ? <ul className="rooms">
            {h.rooms.map(r => <li key={r.name}>
              {r.photo && <img src={asset(r.photo.src)} alt={r.photo.alt} width={r.photo.w} height={r.photo.h} loading="lazy" decoding="async" />}
              <div className="room-text">
                <h3>{r.name}</h3>
                {r.text && <p>{r.text}</p>}
                {r.price && <b>{r.price}</b>}
              </div>
            </li>)}
          </ul> : <>
            <ul className="room-list">{h.rooms.map(r => <li key={r.name}><h3>{r.name}</h3>{r.text && <p>{r.text}</p>}</li>)}</ul>
            {h.roomPhotos?.length ? <div className="room-strip">{h.roomPhotos.map(p => <img key={p.src} src={asset(p.src)} alt={p.alt} width={p.w} height={p.h} loading="lazy" decoding="async" />)}</div> : null}
          </>}
        </div>
      </section>

      <section className="section season-sec" id="season">
        <div className="wrap season-in">
          <div className="section-head">
            <h2>{season === 'winter' ? 'Чем заняться зимой' : 'Чем заняться летом'}</h2>
            <div className="seg" role="group" aria-label="Сезон">
              {(['winter', 'summer'] as Season[]).map(s => <button key={s} type="button" aria-pressed={s === season} onClick={() => setSeason(s)}>{NAMES[s]}</button>)}
            </div>
          </div>
          <ul className="acts">{h.activities[season].map(a => <li key={a}>{a}</li>)}</ul>
        </div>
      </section>

      {h.features.map((f, i) => <section key={f.id} className={'section feat' + (i % 2 ? ' feat-rev' : '')} id={f.id}>
        <div className="wrap feat-in">
          {f.photo && <img src={asset(f.photo.src)} alt={f.photo.alt} width={f.photo.w} height={f.photo.h} loading="lazy" decoding="async" />}
          <div><h2>{f.title}</h2><p>{f.text}</p></div>
        </div>
      </section>)}

      {h.offers?.length ? <section className="section offers-sec" id="offers">
        <div className="wrap">
          <div className="section-head"><h2>Сейчас действует</h2></div>
          <ul className="offers">{h.offers.map(o => <li key={o.title}><h3>{o.title}</h3><p>{o.text}</p></li>)}</ul>
        </div>
      </section> : null}

      <Works site={site} title="Фото" />
      <Praise site={site} />
      <Contacts site={site} title="Как добраться" />
    </main>
    <Footer site={site} nav={nav.slice(0, 5)} />
    <MobileBar site={site} action="Забронировать" href="#book" />
  </>
}
