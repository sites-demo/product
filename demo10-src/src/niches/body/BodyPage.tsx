import type { Site } from '../../types'
import { Header } from '../../ui/Header'
import { Footer } from '../../ui/Footer'
import { Contacts } from '../../ui/Contacts'
import { BeforeAfter, Services, Facts, Prices, Works, Praise } from '../../ui/Sections'
import { MobileBar } from '../../ui/MobileBar'
import { RatingLine } from '../../ui/RatingLine'
import { DamagePicker } from './DamagePicker'
import { RepairSteps } from './RepairSteps'
import './body.css'

const NAV: [string, string][] = [['#estimate', 'Оценка по фото'], ['#repair', 'Как идёт ремонт'], ['#services', 'Услуги'], ['#works', 'Фото'], ['#contacts', 'Контакты']]

export function BodyPage({ site }: { site: Site }) {
  const nav = site.beforeAfter?.length ? NAV.map(n => n[0] === '#repair' ? ['#before-after', 'До и после'] as [string, string] : n) : NAV
  return <>
    <Header site={site} nav={nav} />
    <main>
      <section className="est" id="estimate" data-hero>
        <div className="wrap">
          <div className="est-head">
            <h1>{site.hero.title}</h1>
            <p className="lead">{site.hero.lead}</p>
            <RatingLine site={site} />
          </div>
          <DamagePicker site={site} />
        </div>
      </section>

      <section className="section repair-sec" id="repair">
        <div className="wrap">
          <div className="section-head">
            <h2>Что происходит с деталью в ремонте</h2>
            <p>Пять этапов на примере двери. Прокрутите ниже, дверь в кадре будет меняться вместе с текстом.</p>
          </div>
          <RepairSteps paint="#2c4a6e" />
        </div>
      </section>

      <BeforeAfter site={site} />
      <Prices site={site} />
      <Services site={site} />
      <Facts site={site} />
      <Works site={site} title="Фото из сервиса" />
      <Praise site={site} />
      <Contacts site={site} />
    </main>
    <Footer site={site} nav={nav} />
    <MobileBar site={site} action="Оценить ремонт по фото" href="#estimate" />
  </>
}
