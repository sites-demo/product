import type { Site } from '../../types'

const w = { src: 'photos/winter.jpg', alt: 'Корпус зимой', w: 1800, h: 1100 }
const s = { src: 'photos/summer.jpg', alt: 'Корпус летом', w: 1800, h: 1100 }
// Пример для проверки вёрстки. Не публикуется.
export const site: Site = {
  slug: '_sample-hotel',
  name: 'Пример отеля',
  kind: 'Парк-отель',
  city: 'Пример',
  cityIn: 'под городом',
  address: 'посёлок Примерный, 1',
  hours: 'Круглосуточно',
  phones: [{ display: '+7 900 000-00-00', tel: '+79000000000' }],
  whatsapp: '79000000000',
  ratings: [{ source: '2ГИС', value: '4,9', count: 215, url: 'https://2gis.ru' }, { source: 'Яндекс Карты', value: '4,7', count: 682, url: 'https://yandex.ru/maps' }],
  map: { lat: 55, lon: 83 },
  theme: {
    bg: '#f7f3ec', surface: '#efe8dc', ink: '#1d1b18', muted: '#6b645a', line: '#ddd3c4',
    accent: '#7a2e2a', onAccent: '#ffffff', heading: 'cormorant', body: 'manrope', headingWeight: 600,
  },
  title: 'Пример отеля',
  description: 'Пример',
  hero: { title: 'Отдых в сосновом бору', lead: 'Номера, ресторан, баня и бассейн в одном месте, в часе от города.' },
  hotel: {
    seasons: { winter: w, summer: s },
    rooms: [{ name: 'Стандарт', text: 'Текст', photo: s }, { name: 'Люкс', text: 'Текст', photo: w }, { name: 'Коттедж', text: 'Текст', photo: s }],
    roomsNote: 'Цены зависят от дат, администратор назовёт точную.',
    activities: { winter: ['Тюбинг', 'Лыжи', 'Баня'], summer: ['Бассейн', 'Велосипеды', 'Беседки'] },
    features: [{ id: 'restaurant', title: 'Ресторан', text: 'Текст про ресторан', photo: s }, { id: 'banya', title: 'Баня и сауны', text: 'Текст', photo: w }],
    offers: [{ title: 'Будни осенью', text: 'Текст' }],
  },
  services: [],
  facts: [],
  praise: ['Тема один', 'Тема два'],
  photos: [s, w],
}
