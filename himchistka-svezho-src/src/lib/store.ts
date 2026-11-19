export const MASTER = {
  brand: 'Свежо',
  name: 'Дмитрий',
  phone: '+7 900 123-45-67',
  phoneHref: 'tel:+79001234567',
  tagline: 'Химчистка мебели и ковров на выезде',
};

export const DEFAULT_PRICES = {
  sofaSeat: 800,
  sofaCorner: 1200,
  sofaArms: 200,
  pillow: 150,
  leatherK: 1.15,
  armchair: 1000,
  chairSeat: 300,
  chairBack: 150,
  mattress90: 1400,
  mattress140: 1900,
  mattress160: 2100,
  mattress180: 2400,
  mattressSecond: 60,
  carpetShort: 250,
  carpetLong: 350,
  stains: 500,
  odor: 900,
  fur: 300,
  minOrder: 1500,
};

export const PRICE_SCHEMA = [
  { group: 'Диваны и кресла', items: [
    ['sofaSeat', 'Диван, за одно место', '₽'],
    ['sofaCorner', 'Угловая часть дивана', '₽'],
    ['sofaArms', 'Мягкие подлокотники, пара', '₽'],
    ['pillow', 'Декоративная подушка', '₽'],
    ['armchair', 'Кресло', '₽'],
    ['leatherK', 'Наценка за экокожу, коэффициент', '×'],
  ]},
  { group: 'Стулья', items: [
    ['chairSeat', 'Стул, сиденье', '₽'],
    ['chairBack', 'Мягкая спинка, доплата', '₽'],
  ]},
  { group: 'Матрасы', items: [
    ['mattress90', 'Матрас 90×200', '₽'],
    ['mattress140', 'Матрас 140×200', '₽'],
    ['mattress160', 'Матрас 160×200', '₽'],
    ['mattress180', 'Матрас 180×200', '₽'],
    ['mattressSecond', 'Вторая сторона, % от цены', '%'],
  ]},
  { group: 'Ковры', items: [
    ['carpetShort', 'Короткий ворс, за м²', '₽'],
    ['carpetLong', 'Длинный ворс, за м²', '₽'],
  ]},
  { group: 'Доплаты', items: [
    ['stains', 'Сложные пятна', '₽'],
    ['odor', 'Запах, следы животных', '₽'],
    ['fur', 'Шерсть', '₽'],
    ['minOrder', 'Минимальный заказ', '₽'],
  ]},
];

const KP = 'svezho.prices.v1';
const KR = 'svezho.requests.v1';

function read(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function write(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); return true; }
  catch { return false; }
}

export function getPrices() { return { ...DEFAULT_PRICES, ...read(KP, {}) }; }
export function savePrices(p) { write(KP, p); }
export function resetPrices() { try { localStorage.removeItem(KP); } catch {} }

export const FABRICS = {
  velour: 'Велюр', rogozhka: 'Рогожка', micro: 'Микрофибра', leather: 'Экокожа',
};
export const ARMS = { round: 'Мягкие', square: 'Прямые', low: 'Низкие', none: 'Без подлокотников' };
export const LEGS = { wood: 'Деревянные', metal: 'Металл', plinth: 'Без ножек' };

export const rub = (n) => Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ') + ' ₽';

export function calcItem(it: any, p: any): { lines: { label: string; sum: number }[]; total: number } {
  const L: { label: string; sum: number }[] = [];
  const add = (label, sum) => { if (sum) L.push({ label, sum: Math.round(sum) }); };
  let k = 1;
  if (it.type === 'sofa') {
    k = it.fabric === 'leather' ? p.leatherK : 1;
    add(`Диван, ${it.seats} ${plural(it.seats, 'место', 'места', 'мест')}`, it.seats * p.sofaSeat * k);
    if (it.corner) add('Угловая часть', p.sofaCorner * k);
    if (it.arm === 'round' || it.arm === 'low') add('Мягкие подлокотники', p.sofaArms * k);
    if (it.pillows) add(`Подушки, ${it.pillows} шт.`, it.pillows * p.pillow);
  } else if (it.type === 'armchair') {
    k = it.fabric === 'leather' ? p.leatherK : 1;
    add('Кресло', p.armchair * k);
    if (it.pillows) add('Подушка', it.pillows * p.pillow);
  } else if (it.type === 'chair') {
    add(`Стулья, ${it.count} шт.`, it.count * p.chairSeat);
    if (it.back) add('Мягкие спинки', it.count * p.chairBack);
  } else if (it.type === 'mattress') {
    const base = p['mattress' + it.size];
    add(`Матрас ${it.size}×200`, base);
    if (it.sides === 2) add('Вторая сторона', base * p.mattressSecond / 100);
  } else if (it.type === 'carpet') {
    const m2 = it.w * it.l;
    add(`Ковёр ${fmt(it.w)}×${fmt(it.l)} м, ${fmt(m2)} м²`, m2 * (it.pile === 'long' ? p.carpetLong : p.carpetShort));
  }
  if (it.stains) add('Сложные пятна', p.stains);
  if (it.odor) add('Запах, следы животных', p.odor);
  if (it.fur) add('Шерсть', p.fur);
  return { lines: L, total: L.reduce((s, l) => s + l.sum, 0) };
}

export function calcOrder(items, p) {
  const parts = items.map((it) => calcItem(it, p));
  let total = parts.reduce((s, x) => s + x.total, 0);
  const min = total > 0 && total < p.minOrder;
  if (min) total = p.minOrder;
  return { parts, total, min };
}

export function describe(it) {
  switch (it.type) {
    case 'sofa': return `${it.corner ? 'Угловой диван' : 'Диван'}, ${it.seats} ${plural(it.seats, 'место', 'места', 'мест')}, ${FABRICS[it.fabric].toLowerCase()}`;
    case 'armchair': return `Кресло, ${FABRICS[it.fabric].toLowerCase()}`;
    case 'chair': return `Стулья, ${it.count} шт.${it.back ? ', со спинкой' : ''}`;
    case 'mattress': return `Матрас ${it.size}×200${it.sides === 2 ? ', 2 стороны' : ''}`;
    case 'carpet': return `Ковёр ${fmt(it.w)}×${fmt(it.l)} м, ${it.pile === 'long' ? 'длинный' : 'короткий'} ворс`;
  }
  return '';
}

export function plural(n, a, b, c) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return a;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return b;
  return c;
}
export const fmt = (n) => String(Math.round(n * 10) / 10).replace('.', ',');


export function getRequests(): any[] {
  let r = read(KR, null);
  if (!r) { r = seed(); write(KR, r); }
  return r;
}
export function addRequest(req) {
  const all = getRequests();
  const num = Math.max(1040, ...all.map((x) => x.num)) + 1;
  const full: any = { ...req, id: 'r' + Date.now(), num, status: 'new', created: Date.now() };
  all.unshift(full);
  if (!write(KR, all)) {
    full.photos = []; full.photosDropped = true; write(KR, all);
  }
  return full;
}
export function updateRequest(id, patch) {
  const all = getRequests();
  const i = all.findIndex((x) => x.id === id);
  if (i >= 0) { all[i] = { ...all[i], ...patch }; write(KR, all); }
  return all[i];
}

function seed(): any[] {
  const h = 3600e3, now = Date.now();
  const p = DEFAULT_PRICES;
  const mk = (num, ago, status, name, phone, address, when, items, comment) => {
    const { total } = calcOrder(items, p);
    return { id: 'seed' + num, num, created: now - ago, status, name, phone, address, when, items, total, comment, photos: [] };
  };
  return [
    mk(1040, 1.2 * h, 'new', 'Ольга', '+7 912 345-18-07', 'ул. Ленина, 54, кв. 17', 'Завтра, после 18:00',
      [{ type: 'sofa', seats: 3, corner: true, arm: 'round', legs: 'wood', fabric: 'velour', color: 0, pillows: 2, stains: true, odor: false, fur: true }],
      'Кот, шерсть везде. Пятно от кофе на сиденье.'),
    mk(1039, 5 * h, 'work', 'Артём', '+7 922 610-44-90', 'пр. Строителей, 12', 'Суббота, утро',
      [{ type: 'chair', count: 6, back: true, fabric: 'rogozhka', color: 3, stains: false, odor: false, fur: false },
       { type: 'carpet', w: 2, l: 3, pile: 'short', color: 1, stains: true, odor: false, fur: false }], ''),
    mk(1038, 26 * h, 'done', 'Наталья', '+7 909 771-02-35', 'ул. Мира, 3, кв. 88', 'Вчера, 14:00',
      [{ type: 'mattress', size: '160', sides: 2, stains: false, odor: true, fur: false }], 'Детский матрас, следы.'),
  ];
}
