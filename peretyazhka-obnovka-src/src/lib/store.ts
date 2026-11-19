export const MASTER = {
  brand: 'Обновка',
  name: 'Андрей',
  phone: '+7 900 765-43-21',
  phoneHref: 'tel:+79007654321',
  tagline: 'Перетяжка мягкой мебели',
};

export const DEFAULT_PRICES = {
  sofaSeat: 3500,
  sofaCorner: 4500,
  sofaArms: 1500,
  pillow: 600,
  armchair: 5500,
  chairSeat: 800,
  chairBack: 700,
  rogozhka: 900,
  velour: 1100,
  micro: 1300,
  leather: 1200,
  foamSeat: 1500,
  foamChair: 350,
  springs: 2500,
  frame: 2000,
  minOrder: 3000,
};

export const PRICE_SCHEMA = [
  { group: 'Работа', items: [
    ['sofaSeat', 'Диван, за одно место', '₽'],
    ['sofaCorner', 'Угловая часть дивана', '₽'],
    ['sofaArms', 'Мягкие подлокотники, пара', '₽'],
    ['pillow', 'Подушка', '₽'],
    ['armchair', 'Кресло', '₽'],
    ['chairSeat', 'Стул, сиденье', '₽'],
    ['chairBack', 'Мягкая спинка стула', '₽'],
  ]},
  { group: 'Ткань, за погонный метр', items: [
    ['rogozhka', 'Рогожка', '₽'],
    ['velour', 'Велюр', '₽'],
    ['micro', 'Микрофибра', '₽'],
    ['leather', 'Экокожа', '₽'],
  ]},
  { group: 'Ремонт', items: [
    ['foamSeat', 'Новый поролон, за место', '₽'],
    ['foamChair', 'Новый поролон, стул', '₽'],
    ['springs', 'Пружины или механизм', '₽'],
    ['frame', 'Укрепить каркас', '₽'],
    ['minOrder', 'Минимальный заказ', '₽'],
  ]},
];

const KP = 'obnovka.prices.v1';
const KR = 'obnovka.requests.v1';
const KS = 'obnovka.settings.v1';

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

export const DEFAULT_SETTINGS = { gameEnabled: true, gameReward: 'Скидка 500 ₽ на перетяжку' };
export function getSettings() { return { ...DEFAULT_SETTINGS, ...read(KS, {}) }; }
export function saveSettings(s) { write(KS, s); }

export const FABRICS = {
  velour: 'Велюр', rogozhka: 'Рогожка', micro: 'Микрофибра', leather: 'Экокожа', own: 'Своя ткань',
};
export const ARMS = { round: 'Мягкие', square: 'Прямые', low: 'Низкие', none: 'Без подлокотников' };
export const LEGS = { wood: 'Деревянные', metal: 'Металл', plinth: 'Без ножек' };

export const rub = (n) => Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ') + ' ₽';

export function meters(it: any) {
  if (it.type === 'sofa') return it.seats * 2.4 + (it.corner ? 3 : 0) + (it.arm === 'round' || it.arm === 'low' ? 1.2 : 0) + (it.pillows || 0) * 0.5;
  if (it.type === 'armchair') return 4 + (it.pillows ? 0.5 : 0);
  if (it.type === 'chair') return it.count * (it.back ? 0.9 : 0.5);
  return 0;
}

export function calcItem(it: any, p: any): { lines: { label: string; sum: number }[]; total: number } {
  const L: { label: string; sum: number }[] = [];
  const add = (label, sum) => { if (sum) L.push({ label, sum: Math.round(sum) }); };
  const seats = it.type === 'sofa' ? it.seats + (it.corner ? 1 : 0) : it.type === 'armchair' ? 1 : 0;
  if (it.type === 'sofa') {
    add(`Перетяжка, ${it.seats} ${plural(it.seats, 'место', 'места', 'мест')}`, it.seats * p.sofaSeat);
    if (it.corner) add('Угловая часть', p.sofaCorner);
    if (it.arm === 'round' || it.arm === 'low') add('Мягкие подлокотники', p.sofaArms);
    if (it.pillows) add(`Подушки, ${it.pillows} шт.`, it.pillows * p.pillow);
  } else if (it.type === 'armchair') {
    add('Перетяжка кресла', p.armchair);
    if (it.pillows) add('Подушка', p.pillow);
  } else if (it.type === 'chair') {
    add(`Стулья, ${it.count} шт.`, it.count * p.chairSeat);
    if (it.back) add('Мягкие спинки', it.count * p.chairBack);
  }
  const m = Math.ceil(meters(it) * 2) / 2;
  if (it.fabric !== 'own') add(`${FABRICS[it.fabric]}, около ${fmt(m)} м`, m * p[it.fabric]);
  if (it.foam) add('Новый поролон', it.type === 'chair' ? it.count * p.foamChair : seats * p.foamSeat);
  if (it.springs && it.type !== 'chair') add(it.type === 'sofa' ? 'Пружины, механизм' : 'Пружины', it.type === 'sofa' ? p.springs : p.springs * 0.6);
  if (it.frame) add('Укрепить каркас', it.type === 'chair' ? it.count * p.frame * 0.2 : it.type === 'armchair' ? p.frame * 0.7 : p.frame);
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
  const f = FABRICS[it.fabric]?.toLowerCase() || '';
  switch (it.type) {
    case 'sofa': return `${it.corner ? 'Угловой диван' : 'Диван'}, ${it.seats} ${plural(it.seats, 'место', 'места', 'мест')}, ${f}`;
    case 'armchair': return `Кресло, ${f}`;
    case 'chair': return `Стулья, ${it.count} шт.${it.back ? ', со спинкой' : ''}, ${f}`;
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
    mk(1040, 1.5 * h, 'new', 'Марина', '+7 912 404-18-77', 'ул. Гагарина, 21, кв. 9', 'На выходных',
      [{ type: 'sofa', seats: 3, corner: true, arm: 'round', legs: 'wood', fabric: 'velour', color: 3, pillows: 2, foam: true, springs: false, frame: false }],
      'Кот подрал подлокотники, хочу светлый велюр.'),
    mk(1039, 6 * h, 'work', 'Игорь', '+7 922 318-50-12', 'пр. Мира, 7', 'Завтра, утро',
      [{ type: 'chair', count: 6, back: true, fabric: 'rogozhka', color: 0, foam: true, springs: false, frame: true }], ''),
    mk(1038, 30 * h, 'done', 'Светлана', '+7 909 211-63-40', 'ул. Садовая, 15, кв. 41', 'Вчера, 16:00',
      [{ type: 'armchair', arm: 'square', legs: 'wood', fabric: 'own', color: 5, pillows: 0, foam: false, springs: true, frame: false }], 'Ткань своя, 4 метра.'),
  ];
}
