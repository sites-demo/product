import type { BodyType } from './three/car'

export type FontName = 'manrope' | 'onest' | 'golos' | 'lora' | 'cormorant'

export type Rating = {
  source: '2ГИС' | 'Яндекс Карты'
  /** «4,9» */
  value: string
  /** Сколько отзывов или оценок, как написано в карточке. */
  count: number
  /** «отзывов» или «оценок» */
  unit?: string
  url: string
}

export type Service = { title: string; text?: string; price?: string; group?: string }

export type Photo = { src: string; alt: string; w: number; h: number }

export type Phone = { display: string; tel: string; note?: string }

export type Site = {
  slug: string
  /** Как называют себя сами. */
  name: string
  /** Что это за место, одной строкой: «Кузовной ремонт и покраска». */
  kind: string
  city: string
  /** «в Омске» */
  cityIn: string
  address: string
  addressNote?: string
  hours: string
  phones: Phone[]
  /** Номер для WhatsApp только цифрами: 79001234567. */
  whatsapp?: string
  telegram?: string
  vk?: string
  max?: string
  email?: string
  ratings: Rating[]
  /** Виджет Яндекс Карт: id организации или координаты. */
  map?: { oid?: string; lat?: number; lon?: number; text?: string }
  logo?: { src: string; w: number; h: number; onDark?: string; /** Высота в шапке, если логотип почти квадратный и в 40 px не читается. */ height?: number }
  theme: {
    bg: string
    surface: string
    ink: string
    muted: string
    line: string
    accent: string
    /** Цвет текста на кнопке с акцентом. */
    onAccent: string
    /** Сцена с 3D: фон за моделью. */
    stage?: string
    dark?: boolean
    heading: FontName
    body: FontName
    /** Насыщенность заголовков. */
    headingWeight?: number
  }
  title: string
  description: string
  hero: { title: string; lead: string }
  car?: { type: BodyType }
  /** Для кухонь: из чего можно собрать кухню в конфигураторе. Только то, что компания делает на самом деле. */
  kitchen?: {
    facades: { name: string; hex: string; finish: 'matte' | 'gloss' | 'wood' }[]
    counters: { name: string; hex: string; kind: 'stone' | 'dark' | 'concrete' | 'wood' }[]
    /** Чем пишет компания в ответ: «дизайнер», «менеджер», «замерщик». */
    who?: string
  }
  /** Для мастерских по фарам: что показать в разобранной фаре и с чем приходят клиенты. */
  headlight?: {
    parts: { part: 'glass' | 'lens' | 'mask' | 'housing'; title: string; text: string; price?: string }[]
    issues: string[]
  }
  /** Для загородного отеля: фото двух сезонов, номера, чем заняться летом и зимой. Только то, что есть у них. */
  hotel?: {
    seasons: { winter: Photo; summer: Photo }
    /** Какой сезон показать сразу, пока страница не узнала дату. */
    season?: 'winter' | 'summer'
    rooms: { name: string; text?: string; photo?: Photo; price?: string }[]
    /** Фото номеров без привязки к категории. */
    roomPhotos?: Photo[]
    roomsNote?: string
    activities: { winter: string[]; summer: string[] }
    features: { id: string; title: string; text: string; photo?: Photo; /** Короткое имя для меню. */ nav?: string }[]
    offers?: { title: string; text: string }[]
  }
  /** Для автосервиса: с чем приезжают, списком для заявки. */
  service?: { symptoms: string[] }
  /** Для детейлинга: показывать ли лампу с царапинами (только если студия правда полирует) и цвет капота. */
  detailing?: { polish?: boolean; paint?: string }
  /** Как проходит заказ, словами самой компании. */
  steps?: { title: string; text: string }[]
  /** Цены, которые компания публикует сама: «Кухня Лайт», «от 190 000 ₽». */
  prices?: { title: string; price: string; text?: string }[]
  pricesNote?: string
  /** Заголовок раздела с ценами, если там условия, а не цены. */
  pricesTitle?: string
  /** Готовые коллажи «до и после» из карточки компании. */
  beforeAfter?: Photo[]
  services: Service[]
  servicesNote?: string
  facts: { title: string; text: string }[]
  /** Что хвалят клиенты, своими словами (не цитаты). */
  praise?: string[]
  photos: Photo[]
  /** Для каких 3D-сцен есть картинка-заглушка в public/posters (её снимает scripts/posters.cjs). */
  posters?: string[]
  /** Что ещё не подтвердили владельцы: на страницу не выводится. */
  todo?: string[]
}
