import type { Site } from '../../types'

// Пример для проверки вёрстки. Не публикуется.
export const site: Site = {
  slug: '_sample-det',
  name: 'Пример детейлинга',
  kind: 'Детейлинг',
  city: 'Барнаул',
  cityIn: 'в Барнауле',
  address: 'улица Примерная, 1',
  hours: 'Ежедневно с 10:00 до 20:00',
  phones: [{ display: '+7 900 000-00-00', tel: '+79000000000' }],
  whatsapp: '79000000000',
  ratings: [{ source: '2ГИС', value: '4,9', count: 222, url: 'https://2gis.ru' }],
  map: { lat: 53.35, lon: 83.77 },
  theme: {
    bg: '#0d0f11', surface: '#16191c', ink: '#eef1f4', muted: '#99a2ab', line: 'rgba(255,255,255,.12)',
    accent: '#d9b25f', onAccent: '#14110a', stage: '#0a0b0d', dark: true, heading: 'onest', body: 'onest', headingWeight: 700,
  },
  title: 'Пример: ремонт фар',
  description: 'Пример',
  hero: { title: 'Фары, которые светят как новые', lead: 'Отметьте, что не так, и отправьте фото фар мастеру. Он посмотрит и назовёт цену.' },
  detailing: { polish: true },
  services: [
    { title: 'Комплексная мойка', price: 'от 1 200 ₽', group: 'Мойка' },
    { title: 'Мойка кузова', price: 'от 600 ₽', group: 'Мойка' },
    { title: 'Химчистка салона', text: 'Сиденья, потолок, ковры', price: 'от 9 000 ₽', group: 'Салон' },
    { title: 'Чистка кожи', price: 'от 3 000 ₽', group: 'Салон' },
    { title: 'Полировка кузова', group: 'Кузов' },
  ],
  facts: [{ title: 'Факт один', text: 'Текст' }, { title: 'Факт два', text: 'Текст' }, { title: 'Факт три', text: 'Текст' }],
  praise: ['Тема один', 'Тема два'],
  photos: [],
}
