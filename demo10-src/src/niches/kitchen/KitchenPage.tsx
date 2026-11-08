import type { Site } from '../../types'
import { Header } from '../../ui/Header'
import { Footer } from '../../ui/Footer'
import { Contacts } from '../../ui/Contacts'
import { MobileBar } from '../../ui/MobileBar'
import { RatingLine } from '../../ui/RatingLine'
import { Facts, Praise, Prices, Services, Works } from '../../ui/Sections'
import { asset, telHref } from '../../ui/links'
import { Configurator } from './Configurator'
import { Assembly } from './Assembly'
import '../body/body.css'
import './kitchen.css'

const NAV: [string, string][] = [['#project', 'Собрать кухню'], ['#works', 'Наши кухни'], ['#prices', 'Цены'], ['#steps', 'Как заказать'], ['#contacts', 'Контакты']]

export function KitchenPage({ site }: { site: Site }) {
  const hero = site.photos[0]
  const nav = NAV.filter(([id]) => id !== '#prices' || site.prices?.length).filter(([id]) => id !== '#steps' || site.steps?.length)
  return <>
    <Header site={site} nav={nav} />
    <main>
      <section className="kh" data-hero>
        <div className="wrap kh-in">
          <div className="kh-text">
            <h1>{site.hero.title}</h1>
            <p className="lead">{site.hero.lead}</p>
            <div className="kh-btns">
              <a className="btn btn-accent" href="#project">Собрать свою кухню</a>
              <a className="btn btn-ghost" href={telHref(site.phones[0].tel)}>{site.phones[0].display}</a>
            </div>
            <RatingLine site={site} />
          </div>
          {hero && <figure className="kh-photo">
            <img src={asset(hero.src)} alt={hero.alt} width={hero.w} height={hero.h} fetchPriority="high" />
          </figure>}
        </div>
      </section>

      <section className="section cfg-sec" id="project">
        <div className="wrap">
          <div className="section-head">
            <h2>Соберите кухню и отправьте проект</h2>
            <p>Выберите планировку, размеры и цвета. Кухня справа меняется сразу, а готовое описание уйдёт в чат одним нажатием.</p>
          </div>
          <Configurator site={site} />
        </div>
      </section>

      <Works site={site} title="Кухни, которые мы сделали" skip={1} />
      <Prices site={site} />
      <Assembly site={site} />
      <Services site={site} title="Что ещё делаем" />
      <Facts site={site} />
      <Praise site={site} />
      <Contacts site={site} title="Приходите в салон" />
    </main>
    <Footer site={site} nav={nav} />
    <MobileBar site={site} action="Собрать кухню" href="#project" />
  </>
}
