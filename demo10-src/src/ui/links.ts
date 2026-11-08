import type { Site } from '../types'

/** Путь к файлу из public с учётом адреса демо (/avgust-omsk/…). */
export const asset = (p: string) => import.meta.env.BASE_URL + p.replace(/^\//, '')

export const telHref = (tel: string) => `tel:${tel.replace(/[^\d+]/g, '')}`

export const waHref = (phone: string, text?: string) =>
  `https://wa.me/${phone.replace(/\D/g, '')}${text ? `?text=${encodeURIComponent(text)}` : ''}`

export const tgHref = (user: string) => `https://t.me/${user.replace(/^@/, '')}`

/** Куда отправить готовый текст заявки: WhatsApp с текстом, иначе Telegram (текст копируем), иначе звонок. */
export type Handoff = { href: string; label: string; copy: boolean; icon: 'wa' | 'tg' | 'phone'; intro: string }
export function handoff(site: Site, text: string): Handoff {
  if (site.whatsapp) return { href: waHref(site.whatsapp, text), label: 'Отправить в WhatsApp', copy: false, icon: 'wa', intro: 'Откроется WhatsApp с готовым текстом.' }
  if (site.telegram) return { href: tgHref(site.telegram), label: 'Отправить в Telegram', copy: true, icon: 'tg', intro: 'Текст скопируется и откроется Telegram, останется вставить его в чат.' }
  return { href: telHref(site.phones[0].tel), label: 'Позвонить', copy: true, icon: 'phone', intro: 'Текст скопируется, по нему удобно рассказать по телефону.' }
}

export function mapSrc(site: Site) {
  const m = site.map
  if (!m) return null
  if (m.text) return `https://yandex.ru/map-widget/v1/?text=${encodeURIComponent(m.text)}&z=16`
  if (m.oid) return `https://yandex.ru/map-widget/v1/?oid=${m.oid}&ol=biz&z=16`
  if (m.lat && m.lon) return `https://yandex.ru/map-widget/v1/?ll=${m.lon},${m.lat}&z=16&pt=${m.lon},${m.lat},pm2rdm`
  return null
}

/** «904 отзыва», «1 отзыв», «25 отзывов» */
export function plural(n: number, one: string, few: string, many: string) {
  const a = n % 10, b = n % 100
  if (a === 1 && b !== 11) return one
  if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few
  return many
}

export const fmtNum = (n: number) => n.toLocaleString('ru-RU').replace(/ /g, ' ')
