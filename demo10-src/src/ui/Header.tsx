import type { Site } from '../types'
import { asset, telHref, waHref, tgHref } from './links'
import { Icon } from './Icon'

export function Brand({ site, light }: { site: Site; light?: boolean }) {
  const logo = site.logo
  const src = logo && (light && logo.onDark ? logo.onDark : logo.src)
  return <a className="brand" href="#top" aria-label={`${site.name}, в начало страницы`}>
    {src ? <img src={asset(src)} alt="" width={logo!.w} height={logo!.h} /> : <span className="brand-name">{site.name}</span>}
  </a>
}

/** Шапка не липнет к экрану: так просил владелец студии. */
export function Header({ site, nav }: { site: Site; nav: [string, string][] }) {
  const phone = site.phones[0]
  return <header className="hdr" id="top">
    <div className="wrap hdr-in">
      <Brand site={site} />
      <nav className="hdr-nav" aria-label="Разделы">
        {nav.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
      </nav>
      <div className="hdr-act">
        <a className="hdr-tel" href={telHref(phone.tel)}><Icon name="phone" size={18} /><span>{phone.display}</span></a>
        {site.whatsapp ? <a className="btn btn-sm btn-accent hdr-msg" href={waHref(site.whatsapp)} target="_blank" rel="noopener noreferrer"><Icon name="wa" size={18} /><span>WhatsApp</span></a>
          : site.telegram ? <a className="btn btn-sm btn-accent hdr-msg" href={tgHref(site.telegram)} target="_blank" rel="noopener noreferrer"><Icon name="tg" size={18} /><span>Telegram</span></a> : null}
      </div>
    </div>
  </header>
}
