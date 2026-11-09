import type { Site } from '../../types'
import { Header } from '../../ui/Header'
import { Footer } from '../../ui/Footer'
import { Contacts } from '../../ui/Contacts'
import { MobileBar } from '../../ui/MobileBar'
import { RatingLine } from '../../ui/RatingLine'
import { Facts, Praise, Works } from '../../ui/Sections'
import { asset, telHref } from '../../ui/links'
import { OrderBuilder } from './OrderBuilder'
import { SwirlLight } from './SwirlLight'
import '../body/body.css'
import './detailing.css'

/** Первый кадр: их настоящий бокс. Первое фото сайта стоит здесь, в галерее его уже нет. */
function Studio({ site }: { site: Site }) {
  const ph = site.photos[0]
  if (!ph) return null
  return <figure className="dstudio">
    <img src={asset(ph.src)} alt={ph.alt} width={ph.w} height={ph.h} decoding="async" fetchPriority="high" />
  </figure>
}

export function DetailingPage({ site }: { site: Site }) {
  const nav: [string, string][] = [['#order', 'Услуги и цены'], ...(site.detailing?.polish ? [['#polish', 'Полировка'] as [string, string]] : []), ['#works', 'Фото'], ['#contacts', 'Контакты']]
  return <>
    <Header site={site} nav={nav} />
    <main>
      <section className="dh" data-hero>
        <div className="wrap">
          <div className="est-head">
            <h1>{site.hero.title}</h1>
            <p className="lead">{site.hero.lead}</p>
            <RatingLine site={site} />
          </div>
          <div className="dh-btns">
            <a className="btn btn-accent" href="#order">Выбрать услуги</a>
            <a className="btn btn-ghost" href={telHref(site.phones[0].tel)}>{site.phones[0].display}</a>
          </div>
          <Studio site={site} />
        </div>
      </section>

      <section className="section" id="order">
        <div className="wrap">
          <div className="section-head">
            <h2>Выберите, что сделать с машиной</h2>
            <p>{site.servicesNote ?? 'Цены из нашего прайса. Отметьте услуги, и готовый список уйдёт мастеру в чат.'}</p>
          </div>
          <OrderBuilder site={site} />
        </div>
      </section>

      {site.detailing?.polish && <section className="section polish-sec" id="polish">
        <div className="wrap">
          <div className="section-head">
            <h2>Что убирает полировка</h2>
            <p>Под ярким светом на тёмной краске видны круговые царапины от мойки щётками и тряпками. Проведите пальцем по капоту: слева лак до полировки, справа после.</p>
          </div>
          <SwirlLight paint={site.detailing.paint} />
        </div>
      </section>}

      <Facts site={site} />
      <Works site={site} title="Фото из студии" skip={1} />
      <Praise site={site} />
      <Contacts site={site} />
    </main>
    <Footer site={site} nav={nav} />
    <MobileBar site={site} action="Выбрать услуги" href="#order" />
  </>
}
