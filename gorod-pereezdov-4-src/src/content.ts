import { useEffect, useState } from 'react'
import defaults from './site-content.json'

export type SiteContent = typeof defaults
export const mapUrl = 'https://yandex.ru/maps/org/muving_taun/52265900654/'

export function media(path: string) {
  return import.meta.env.BASE_URL + path
}

export function telephone(phone: string) {
  return 'tel:+' + phone.replace(/\D/g, '').replace(/^8/, '7')
}

export function telegramLink(username: string, message?: string) {
  const handle = username.trim().replace(/^(?:https?:\/\/)?t\.me\//i, '').replace(/^@/, '')
  const safeHandle = /^[a-zA-Z0-9_]{5,32}$/.test(handle) ? handle : defaults.contacts.telegram
  return 'https://t.me/' + safeHandle + (message ? '?text=' + encodeURIComponent(message) : '')
}

export function photoUrl(source: string, fallback: string) {
  const value = source.trim()
  return /^https:\/\/[^\s]+$/i.test(value) || /^data:image\/(?:jpeg|png|webp);base64,/i.test(value)
    ? value
    : media(fallback)
}

function readContent(template: unknown, value: unknown): unknown {
  if (Array.isArray(template)) {
    return Array.isArray(value) ? value.map(item => readContent(template[0], item)) : template
  }
  if (template && typeof template === 'object') {
    const data = value && typeof value === 'object' ? value as Record<string, unknown> : {}
    return Object.fromEntries(Object.entries(template).map(([key, entry]) => [key, readContent(entry, data[key])]))
  }
  return typeof value === typeof template ? value : template
}

export function useSiteContent() {
  const [preview] = useState(() => new URLSearchParams(location.search).get('preview') === '1')
  const [site, setSite] = useState<SiteContent>(() => {
    if (preview) return defaults
    try {
      return readContent(defaults, JSON.parse(localStorage.getItem('mt-v2:mt-content') ?? 'null')) as SiteContent
    } catch {
      return defaults
    }
  })
  useEffect(() => {
    if (!preview || window.parent === window) return
    function update(event: MessageEvent) {
      if (event.origin !== location.origin || event.source !== window.parent) return
      if (event.data?.type === 'mt-content') {
        setSite(readContent(defaults, event.data.content) as SiteContent)
      }
      if (event.data?.type === 'mt-scroll') {
        if (event.data.id) document.getElementById(event.data.id)?.scrollIntoView()
        else window.scrollTo(0, 0)
      }
    }
    window.addEventListener('message', update)
    window.parent.postMessage({ type: 'mt-ready' }, location.origin)
    return () => window.removeEventListener('message', update)
  }, [preview])
  useEffect(() => {
    document.title = site.seo.title
    document.querySelector('meta[name="description"]')?.setAttribute('content', site.seo.description)
  }, [site.seo])
  return { site, preview }
}
