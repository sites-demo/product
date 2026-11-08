import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { Site } from '../../types'
import { Header } from '../../ui/Header'
import { Footer } from '../../ui/Footer'
import { Contacts } from '../../ui/Contacts'
import { MobileBar } from '../../ui/MobileBar'
import { RatingLine } from '../../ui/RatingLine'
import { Facts, Praise, Works } from '../../ui/Sections'
import { telHref } from '../../ui/links'
import { OrderBuilder } from './OrderBuilder'
import { Poster } from '../../ui/Poster'
import '../body/body.css'
import './detailing.css'

const SwirlLight = lazy(() => import('./SwirlLight').then(m => ({ default: m.SwirlLight })))

/** Машина в боксе с сотами над ней. Грузим 3D только в браузере и только когда сцена рядом с экраном. */
function Studio({ site }: { site: Site }) {
  const host = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const el = host.current
    if (!el) return
    let dead = false, destroy: (() => void) | undefined
    import('../../three/carScene').then(({ createCarScene }) => {
      if (dead) return
      try {
        const s = createCarScene(el, { type: site.car?.type ?? 'sedan', paint: site.detailing?.paint ?? '#0c0d10', accent: site.theme.accent, dark: true, studio: 'hex', yaw: -0.8 })
        destroy = s.destroy
        setReady(true)
      } catch { /* без 3D остаётся фон */ }
    })
    return () => { dead = true; destroy?.() }
  }, [site])
  return <div className="dstudio">
    <div className={'dstudio-canvas' + (site.posters?.includes('studio') ? ' has-poster' : '') + (ready ? ' ready' : '')} ref={host} role="img" aria-label="Чёрная машина в боксе под светом сот"><Poster site={site} name="studio" /></div>
    <p className="stage-hint">Потяните, чтобы повернуть машину</p>
  </div>
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
          <Suspense fallback={<div className="swirl" />}><SwirlLight paint={site.detailing.paint} /></Suspense>
        </div>
      </section>}

      <Facts site={site} />
      <Works site={site} title="Фото из студии" />
      <Praise site={site} />
      <Contacts site={site} />
    </main>
    <Footer site={site} nav={nav} />
    <MobileBar site={site} action="Выбрать услуги" href="#order" />
  </>
}
