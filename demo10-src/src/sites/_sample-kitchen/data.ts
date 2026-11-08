import type { Site } from '../../types'
import { site as body } from '../_sample-body/data'

// Пример для проверки вёрстки. Не публикуется.
export const site: Site = {
  ...body,
  slug: '_sample-kitchen',
  kind: 'Кухни на заказ',
  hero: { title: 'Кухни на заказ в Омске', lead: 'Соберите кухню прямо на сайте и отправьте проект дизайнеру. Он посмотрит размеры и назовёт цену.' },
  theme: { ...body.theme, bg: '#f7f4ef', surface: '#efe9e1', accent: '#7a5a3a', heading: 'lora', body: 'manrope', headingWeight: 600 },
  kitchen: {
    facades: [
      { name: 'Белый матовый', hex: '#eeece7', finish: 'matte' }, { name: 'Кашемир', hex: '#d9cfc1', finish: 'matte' },
      { name: 'Шалфей', hex: '#9aa58f', finish: 'matte' }, { name: 'Графит', hex: '#3c3f43', finish: 'matte' }, { name: 'Дуб', hex: '#c9a57a', finish: 'wood' },
    ],
    counters: [{ name: 'Белый камень', hex: '#efefec', kind: 'stone' }, { name: 'Тёмный камень', hex: '#2b2b2c', kind: 'dark' }, { name: 'Бетон', hex: '#a5a39e', kind: 'concrete' }, { name: 'Дуб', hex: '#b58a5a', kind: 'wood' }],
  },
  prices: [{ title: 'Кухня Лайт', price: 'от 190 000 ₽' }, { title: 'Кухня Классика', price: 'от 300 000 ₽', text: 'Описание' }],
  steps: [{ title: 'Замер', text: 'Текст' }, { title: 'Проект', text: 'Текст' }, { title: 'Производство', text: 'Текст' }, { title: 'Монтаж', text: 'Текст' }],
}
