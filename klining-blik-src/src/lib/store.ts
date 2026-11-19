export const MASTER = {
  brand: 'Блик',
  name: 'Ольга',
  phone: '+7 900 321-54-76',
  phoneHref: 'tel:+79003215476',
  tagline: 'Уборка квартир',
};

export const DEFAULT_PRICES = {
  support: 70,
  general: 140,
  remont: 190,
  bath2: 1200,
  window: 450,
  balcony: 1200,
  oven: 900,
  fridge: 800,
  micro: 400,
  hood: 700,
  cabinets: 1500,
  iron: 700,
  pets: 600,
  minOrder: 2900,
};

export const PRICE_SCHEMA = [
  { group: 'Уборка, за м²', items: [
    ['support', 'Поддерживающая', '₽'],
    ['general', 'Генеральная', '₽'],
    ['remont', 'После ремонта', '₽'],
  ]},
  { group: 'Дополнительно', items: [
    ['bath2', 'Второй санузел', '₽'],
    ['window', 'Окно, за створку', '₽'],
    ['balcony', 'Балкон или лоджия', '₽'],
    ['oven', 'Духовка внутри', '₽'],
    ['fridge', 'Холодильник внутри', '₽'],
    ['micro', 'Микроволновка', '₽'],
    ['hood', 'Вытяжка', '₽'],
    ['cabinets', 'Кухонные шкафы внутри', '₽'],
    ['iron', 'Глажка, за час', '₽'],
    ['pets', 'Шерсть питомцев', '₽'],
    ['minOrder', 'Минимальный заказ', '₽'],
  ]},
];

const KP = 'blik.prices.v1';
const KR = 'blik.requests.v1';
const KS = 'blik.settings.v1';

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

export const DEFAULT_SETTINGS = { gameEnabled: true, gameReward: 'Мытьё микроволновки бесплатно' };
export function getSettings() { return { ...DEFAULT_SETTINGS, ...read(KS, {}) }; }
export function saveSettings(s) { write(KS, s); }

export const KINDS = { support: 'Поддерживающая', general: 'Генеральная', remont: 'После ремонта' };
export const ROOMS = ['Студия', '1', '2', '3', '4'];
export const AREA = [26, 36, 52, 70, 90];

export const EXTRAS: [string, string][] = [
  ['oven', 'Духовка внутри'],
  ['fridge', 'Холодильник внутри'],
  ['micro', 'Микроволновка'],
  ['hood', 'Вытяжка'],
  ['cabinets', 'Кухонные шкафы'],
  ['pets', 'Шерсть питомцев'],
];

export const rub = (n) => Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ') + ' ₽';

export function roomsLabel(n) {
  return n ? `${n} ${plural(n, 'комната', 'комнаты', 'комнат')}` : 'студия';
}

export function calcItem(it: any, p: any): { lines: { label: string; sum: number }[]; total: number } {
  const L: { label: string; sum: number }[] = [];
  const add = (label, sum) => { if (sum) L.push({ label, sum: Math.round(sum) }); };
  add(`${KINDS[it.kind]}, ${it.area} м²`, it.area * p[it.kind]);
  if (it.baths > 1) add('Второй санузел', p.bath2 * (it.kind === 'support' ? 0.6 : 1));
  if (it.windows) add(`Окна, ${it.windows} ${plural(it.windows, 'створка', 'створки', 'створок')}`, it.windows * p.window);
  if (it.balcony) add('Балкон', p.balcony);
  for (const [k, label] of EXTRAS) if (it[k]) add(k === 'cabinets' ? 'Кухонные шкафы внутри' : label, p[k]);
  if (it.iron) add(`Глажка, ${it.iron} ч`, it.iron * p.iron);
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
  return `${KINDS[it.kind]}, ${roomsLabel(it.rooms)}, ${it.area} м²`;
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

const flat = (o) => ({ type: 'flat', kind: 'general', rooms: 2, area: 52, baths: 1, windows: 0, balcony: false, iron: 0, oven: false, fridge: false, micro: false, hood: false, cabinets: false, pets: false, ...o });

function seed(): any[] {
  const h = 3600e3, now = Date.now();
  const p = DEFAULT_PRICES;
  const mk = (num, ago, status, name, phone, address, when, items, comment) => {
    const { total } = calcOrder(items, p);
    return { id: 'seed' + num, num, created: now - ago, status, name, phone, address, when, items, total, comment, photos: [] };
  };
  return [
    mk(1040, 1.2 * h, 'new', 'Анна', '+7 912 507-33-18', 'ул. Ленина, 48, кв. 112', 'Завтра',
      [flat({ kind: 'general', rooms: 2, area: 56, windows: 6, oven: true, fridge: true })],
      'Есть кот, на диване шерсть. Домофон 112.'),
    mk(1039, 5 * h, 'work', 'Дмитрий', '+7 922 640-81-05', 'ул. Строителей, 3, кв. 7', 'На выходных',
      [flat({ kind: 'remont', rooms: 3, area: 74, baths: 2, windows: 8, balcony: true })], 'Закончили ремонт, много пыли и следов краски.'),
    mk(1038, 28 * h, 'done', 'Елена', '+7 909 118-42-77', 'пр. Победы, 20, кв. 54', 'Вчера, 10:00',
      [flat({ kind: 'support', rooms: 1, area: 38, iron: 1 })], ''),
  ];
}
