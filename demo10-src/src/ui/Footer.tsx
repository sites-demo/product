import type { Site } from '../types'
import { Brand } from './Header'
import { telHref } from './links'

export function Footer({ site, nav }: { site: Site; nav: [string, string][] }) {
  return <footer className="ftr">
    <div className="wrap ftr-in">
      <div className="ftr-brand"><Brand site={site} light={!site.theme.dark} /><p>{site.kind} {site.cityIn}</p></div>
      <nav aria-label="Разделы сайта">{nav.map(([href, label]) => <a key={href} href={href}>{label}</a>)}</nav>
      <div className="ftr-contacts">
        {site.phones.map(p => <a key={p.tel} href={telHref(p.tel)}>{p.display}</a>)}
        <span>{site.city}, {site.address}</span>
      </div>
    </div>
  </footer>
}
