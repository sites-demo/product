import { useEffect, useState } from 'react'
import { fmtT, useTemperature } from '../weather'
import { Icon } from './Icon'

type Band = { from: number; title: string; wear: string[]; tips: string[] }

// Советы по погоде в Якутске. От самого холодного к тёплому.
const BANDS: Band[] = [
  {
    from: -60,
    title: 'Сильный мороз, ниже −45°',
    wear: ['Шуба или длинный пуховик', 'Меховая шапка и шарф на лицо', 'Унты или валенки', 'Меховые варежки'],
    tips: ['Выходите ненадолго, перебежками между тёплыми местами', 'Такси вызывайте заранее и ждите его в помещении', 'Над городом стоит морозный туман: машины видно плохо, переходите дорогу внимательно'],
  },
  {
    from: -45,
    title: 'Настоящая якутская зима',
    wear: ['Длинный пуховик', 'Утеплённые штаны и термобельё', 'Унты, валенки или зимняя обувь на толстой подошве', 'Варежки вместо перчаток'],
    tips: ['Телефон держите во внутреннем кармане: на морозе батарея садится за минуты', 'Закройте лицо шарфом, особенно на ветру', 'Металлические очки и серьги лучше снять'],
  },
  {
    from: -30,
    title: 'Обычная зима',
    wear: ['Зимний пуховик и шапка', 'Шарф и тёплые перчатки', 'Зимняя обувь'],
    tips: ['Гулять по городу можно спокойно', 'Самое время для музеев и прогулки по центру'],
  },
  {
    from: -15,
    title: 'Межсезонье',
    wear: ['Тёплая куртка', 'Шапка и перчатки', 'Непромокаемая обувь'],
    tips: ['Погода меняется быстро, возьмите слой потеплее'],
  },
  {
    from: 5,
    title: 'Лето',
    wear: ['Лёгкая одежда, днём бывает за +30°', 'Кофта на вечер', 'Длинные рукава от комаров'],
    tips: ['Возьмите средство от комаров и мошки', 'В июне почти белые ночи, пригодится маска для сна'],
  },
]

const band = (t: number) => [...BANDS].reverse().find((b) => t >= b.from) || BANDS[0]

export function Frost() {
  const live = useTemperature()
  const [t, setT] = useState(-38)
  const [moved, setMoved] = useState(false)
  useEffect(() => {
    if (live !== null && !moved) setT(Math.max(-55, Math.min(35, live)))
  }, [live, moved])
  const b = band(t)
  const pct = ((t + 55) / 90) * 100

  return (
    <section className="frost" id="pogoda" aria-labelledby="frost-h">
      <div className="wrap frost-grid">
        <div>
          <p className="eyebrow eyebrow-light">Едете впервые</p>
          <h2 id="frost-h">Что надеть в Якутске</h2>
          <p className="lead lead-light">
            Передвиньте термометр, и мы подскажем, как одеться и что учесть. {live !== null && <>Сейчас в городе {fmtT(live)}.</>}
          </p>
          <div className="thermo">
            <div className="thermo-scale" style={{ '--p': `${pct}%` } as React.CSSProperties}>
              <span className="thermo-fill" />
            </div>
            <input
              type="range"
              min={-55}
              max={35}
              step={1}
              value={t}
              onChange={(e) => {
                setT(Number(e.target.value))
                setMoved(true)
              }}
              aria-label="Температура на улице"
              aria-valuetext={fmtT(t)}
            />
            <div className="thermo-marks" aria-hidden="true">
              <span>−55°</span>
              <span>−30°</span>
              <span>0°</span>
              <span>+35°</span>
            </div>
          </div>
          <p className="thermo-now">
            <Icon name="thermo" />
            <b>{fmtT(t)}</b>
            <span>{b.title}</span>
          </p>
          {live !== null && moved && (
            <button type="button" className="link-btn" onClick={() => setMoved(false)}>
              Вернуть погоду на сейчас
            </button>
          )}
        </div>
        <div className="frost-cards" aria-live="polite">
          <div className="fcard">
            <h3>Что надеть</h3>
            <ul>
              {b.wear.map((w) => (
                <li key={w}>
                  <Icon name="check" />
                  {w}
                </li>
              ))}
            </ul>
          </div>
          <div className="fcard">
            <h3>Что учесть</h3>
            <ul>
              {b.tips.map((w) => (
                <li key={w}>
                  <Icon name="snow" />
                  {w}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
