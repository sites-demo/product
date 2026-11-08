import type { Site } from '../types'
import { Brand } from './Header'
import { telHref } from './links'

export function Footer({ site, nav, carCredit }: { site: Site; nav: [string, string][]; carCredit?: boolean }) {
  return <footer className="ftr">
    <div className="wrap ftr-in">
      <div className="ftr-brand"><Brand site={site} light={!site.theme.dark} /><p>{site.kind} {site.cityIn}</p></div>
      <nav aria-label="Разделы сайта">{nav.map(([href, label]) => <a key={href} href={href}>{label}</a>)}</nav>
      <div className="ftr-contacts">
        {site.phones.map(p => <a key={p.tel} href={telHref(p.tel)}>{p.display}</a>)}
        <span>{site.city}, {site.address}</span>
      </div>
    </div>
    {carCredit && <p className="wrap ftr-credit">3D-модель машины: <a href="https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept" rel="noopener" target="_blank">Car Concept</a>, Eric Chadwick и Darmstadt Graphics Group, лицензия <a href="https://creativecommons.org/licenses/by/4.0/deed.ru" rel="noopener" target="_blank">CC BY 4.0</a>. Логотипы убраны, текстуры сжаты.</p>}
  </footer>
}
