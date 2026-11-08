import type { Site } from '../../types'

// Пример для проверки вёрстки. Не публикуется.
export const site: Site = {
  slug: '_sample-head',
  name: 'Пример фар',
  kind: 'Ремонт и тюнинг фар',
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
    accent: '#3fa7ff', onAccent: '#04121f', stage: '#0a0b0d', dark: true, heading: 'golos', body: 'golos', headingWeight: 700,
  },
  title: 'Пример: ремонт фар',
  description: 'Пример',
  hero: { title: 'Фары, которые светят как новые', lead: 'Отметьте, что не так, и отправьте фото фар мастеру. Он посмотрит и назовёт цену.' },
  headlight: {
    parts: [
      { part: 'glass', title: 'Стекло фары', text: 'Снимаем желтизну и мутность, стекло снова прозрачное', price: '1 000 ₽' },
      { part: 'lens', title: 'Линзы', text: 'Ставим линзы вместо старого отражателя', price: 'от 12 000 ₽' },
      { part: 'mask', title: 'Маска', text: 'Текст про маску' },
      { part: 'housing', title: 'Корпус', text: 'Текст про корпус' },
    ],
    issues: ['Тусклый свет', 'Мутное стекло', 'Слепит встречных', 'Запотевает', 'Трещина или скол'],
  },
  services: [{ title: 'Полировка фар', price: '1 000 ₽' }, { title: 'Установка линз', price: 'от 12 000 ₽' }],
  facts: [{ title: 'Факт', text: 'Текст' }, { title: 'Факт', text: 'Текст' }, { title: 'Факт', text: 'Текст' }],
  praise: ['Тема один', 'Тема два'],
  photos: [],
}
