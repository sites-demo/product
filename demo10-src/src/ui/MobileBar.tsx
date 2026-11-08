import { useEffect, useState } from 'react'
import type { Site } from '../types'
import { telHref } from './links'
import { Icon } from './Icon'

/** Нижняя панель на телефоне: появляется, когда первый экран прокручен, и прячется у контактов. */
export function MobileBar({ site, action, href }: { site: Site; action: string; href: string }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const hero = document.querySelector('[data-hero]'), contacts = document.getElementById('contacts')
    if (!hero) return
    let pastHero = false, atContacts = false
    const update = () => setShow(pastHero && !atContacts)
    const io = new IntersectionObserver(es => {
      for (const e of es) {
        if (e.target === hero) pastHero = !e.isIntersecting && e.boundingClientRect.top < 0
        else atContacts = e.isIntersecting
      }
      update()
    })
    io.observe(hero)
    if (contacts) io.observe(contacts)
    return () => io.disconnect()
  }, [])
  return <nav className={show ? 'mbar show' : 'mbar'} aria-label="Быстрая связь" inert={!show}>
    <a className="btn btn-ghost" href={telHref(site.phones[0].tel)} aria-label="Позвонить"><Icon name="phone" /></a>
    <a className="btn btn-accent" href={href}>{action}</a>
  </nav>
}
