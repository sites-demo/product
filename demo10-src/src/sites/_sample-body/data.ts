import type { Site } from '../../types'

// Пример для проверки вёрстки. Не публикуется: имена с подчёркиванием сборка пропускает.
export const site: Site = {
  slug: '_sample-body',
  name: 'Пример',
  kind: 'Кузовной ремонт и покраска',
  city: 'Омск',
  cityIn: 'в Омске',
  address: 'улица Примерная, 1',
  hours: 'Ежедневно с 9:00 до 20:00',
  phones: [{ display: '+7 900 000-00-00', tel: '+79000000000' }],
  whatsapp: '79000000000',
  ratings: [{ source: '2ГИС', value: '4,9', count: 904, url: 'https://2gis.ru' }],
  map: { lat: 54.98, lon: 73.37 },
  theme: {
    bg: '#f6f7f8', surface: '#eceef1', ink: '#111417', muted: '#5d6670', line: '#d9dde2',
    accent: '#e2461d', onAccent: '#ffffff', stage: '#dfe3e8', heading: 'manrope', body: 'manrope', headingWeight: 800,
  },
  title: 'Пример: кузовной ремонт',
  description: 'Пример',
  hero: { title: 'Кузовной ремонт и покраска в Омске', lead: 'Покажите на машине, что повреждено, и отправьте фото мастеру. Он посмотрит и назовёт цену.' },
  services: [
    { title: 'Кузовной ремонт', text: 'Рихтовка и замена деталей', group: 'Кузов' },
    { title: 'Покраска детали', group: 'Покраска' },
    { title: 'Полировка кузова', group: 'Покраска' },
    { title: 'Ремонт бампера', group: 'Кузов' },
  ],
  facts: [{ title: 'Факт один', text: 'Текст факта' }, { title: 'Факт два', text: 'Текст факта' }, { title: 'Факт три', text: 'Текст факта' }],
  praise: ['Первая тема', 'Вторая тема', 'Третья тема'],
  photos: [],
}
