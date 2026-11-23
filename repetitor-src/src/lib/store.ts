export const TUTOR = {
  full: 'Вера Андреевна Климова',
  short: 'Вера Андреевна',
  first: 'Вера',
  last: 'Климова',
  initials: 'ВК',
  subject: 'Математика',
  city: 'Санкт-Петербург',
  place: 'Петроградская сторона, рядом с метро «Чкаловская»',
  phone: '+7 900 000-14-27',
  since: 2009,
  replyBy: 'сегодня до 21:00',
};

export const DEFAULT_PRICES = {
  online60: 3000,
  online90: 4200,
  offline: 500,
  pack: 5,
  seats: 3,
  capacity: 14,
};

export const PRICE_SCHEMA: { group: string; items: [string, string, string][] }[] = [
  { group: 'Занятия', items: [
    ['online60', 'Занятие 60 минут', '₽'],
    ['online90', 'Занятие 90 минут', '₽'],
    ['offline', 'Очно у меня, доплата', '₽'],
    ['pack', 'Скидка за 8 занятий', '%'],
  ]},
  { group: 'Набор учеников', items: [
    ['seats', 'Свободных мест', 'шт'],
    ['capacity', 'Всего учеников в год', 'шт'],
  ]},
];

export type ExamKey = 'prof' | 'base' | 'oge' | 'school';
export const EXAMS: Record<ExamKey, { label: string; short: string; kind: 'points' | 'grade'; now: number; goal: number; date: string; finish: string }> = {
  prof: { label: 'ЕГЭ профиль', short: 'ЕГЭ', kind: 'points', now: 45, goal: 80, date: '2027-06-01', finish: 'ЕГЭ' },
  base: { label: 'ЕГЭ база', short: 'ЕГЭ база', kind: 'grade', now: 3, goal: 5, date: '2027-05-28', finish: 'ЕГЭ' },
  oge: { label: 'ОГЭ', short: 'ОГЭ', kind: 'grade', now: 3, goal: 5, date: '2027-06-02', finish: 'ОГЭ' },
  school: { label: 'Школьная программа', short: 'Школа', kind: 'grade', now: 3, goal: 5, date: '2027-05-25', finish: 'Конец года' },
};

const STEP_HOURS: Record<string, number[]> = { oge: [0, 0, 18, 24, 32], base: [0, 0, 14, 18, 24], school: [0, 0, 14, 18, 24] };

function pointWeight(p: number) {
  if (p < 40) return 0.6;
  if (p < 60) return 0.9;
  if (p < 75) return 1.4;
  if (p < 88) return 2.2;
  return 3.2;
}

export function hoursFor(exam: ExamKey, now: number, goal: number) {
  if (goal <= now) return 0;
  if (EXAMS[exam].kind === 'points') {
    let h = 8;
    for (let p = now; p < goal; p++) h += pointWeight(p);
    return h;
  }
  let h = 6;
  for (let g = Math.max(2, now); g < goal; g++) h += STEP_HOURS[exam][g];
  return h;
}

function reachWith(exam: ExamKey, now: number, hours: number) {
  if (EXAMS[exam].kind === 'points') {
    let h = hours - 8, p = now;
    while (p < 100 && h >= pointWeight(p)) { h -= pointWeight(p); p++; }
    return p;
  }
  let h = hours - 6, g = Math.max(2, now);
  while (g < 5 && h >= STEP_HOURS[exam][g]) { h -= STEP_HOURS[exam][g]; g++; }
  return g;
}

export type Plan = {
  exam: ExamKey; now: number; goal: number; dur: number; format: 'online' | 'offline';
  weeks: number; perWeek: number; lessons: number; price: number; monthly: number; monthLessons: number;
  reach: number; tight: boolean; keep: boolean; start: Date; end: Date;
};

export function weeksLeft(exam: ExamKey, from = new Date()) {
  const end = new Date(EXAMS[exam].date + 'T09:00:00');
  return { end, weeks: Math.max(4, Math.floor((+end - +from) / (7 * 864e5))) };
}

export function makePlan(exam: ExamKey, now: number, goal: number, dur: number, format: 'online' | 'offline', p: typeof DEFAULT_PRICES, from = new Date()): Plan {
  const { end, weeks } = weeksLeft(exam, from);
  const eff = weeks * 0.9;
  const keep = goal <= now;
  const need = hoursFor(exam, now, goal);
  const raw = keep ? 1 : need / eff / (dur / 60);
  let perWeek = raw <= 1.15 ? 1 : raw <= 2.2 ? 2 : 3;
  const tight = raw > 3.2;
  const reach = tight ? reachWith(exam, now, 3 * (dur / 60) * eff) : goal;
  const lessons = Math.round(perWeek * eff);
  const price = (dur === 90 ? p.online90 : p.online60) + (format === 'offline' ? p.offline : 0);
  const monthLessons = Math.round(perWeek * 4.33);
  return { exam, now, goal, dur, format, weeks, perWeek, lessons, price, monthly: monthLessons * price, monthLessons, reach, tight, keep, start: from, end };
}

export const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

export function trajectory(plan: Plan) {
  const months: { t: number; label: string }[] = [];
  const s = plan.start, e = plan.end;
  const span = +e - +s;
  const d = new Date(s.getFullYear(), s.getMonth() + 1, 1);
  while (+d < +e) {
    months.push({ t: (+d - +s) / span, label: MONTHS_SHORT[d.getMonth()] });
    d.setMonth(d.getMonth() + 1);
  }
  const top = plan.keep ? plan.now : plan.reach;
  const pts = Array.from({ length: 41 }, (_, i) => {
    const t = i / 40;
    const f = 1 - Math.pow(1 - t, 1.55);
    return { t, v: plan.now + (top - plan.now) * f };
  });
  return { months, pts, top };
}

export const rub = (n: number) => Math.round(n).toLocaleString('ru-RU').replace(/\s|,/g, '\u00a0') + '\u00a0₽';

export function plural(n: number, a: string, b: string, c: string) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return a;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return b;
  return c;
}

export const gradeWord = (g: number) => ({ 2: 'двойка', 3: 'тройка', 4: 'четвёрка', 5: 'пятёрка' } as any)[g] || String(g);

export function planLine(p: any) {
  if (!p) return '';
  const e = EXAMS[p.exam as ExamKey];
  const v = (x: number) => e.kind === 'points' ? `${x}` : `«${x}»`;
  return `${e.label}, с ${v(p.now)} до ${v(p.goal)}`;
}

const KP = 'klimova.prices.v1';
const KR = 'klimova.requests.v1';
const KS = 'klimova.students.v1';

function read(key: string, fallback: any) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function write(key: string, val: any) {
  try { localStorage.setItem(key, JSON.stringify(val)); return true; }
  catch { return false; }
}

export function getPrices() { return { ...DEFAULT_PRICES, ...read(KP, {}) }; }
export function savePrices(p: any) { write(KP, p); }

export function getRequests(): any[] {
  let r = read(KR, null);
  if (!r) { r = seedRequests(); write(KR, r); }
  return r;
}
export function addRequest(req: any) {
  const all = getRequests();
  const num = Math.max(210, ...all.map((x) => x.num)) + 1;
  const full: any = { ...req, id: 'r' + Date.now(), num, status: 'new', created: Date.now() };
  all.unshift(full);
  if (!write(KR, all)) { full.photos = []; full.photosDropped = true; write(KR, all); }
  return full;
}
export function updateRequest(id: string, patch: any) {
  const all = getRequests();
  const i = all.findIndex((x) => x.id === id);
  if (i >= 0) { all[i] = { ...all[i], ...patch }; write(KR, all); }
  return all[i];
}

export function getStudents(): any[] {
  let r = read(KS, null);
  if (!r) { r = seedStudents(); write(KS, r); }
  return r;
}
export function saveStudents(list: any[]) { write(KS, list); }

function seedRequests(): any[] {
  const h = 3600e3, now = Date.now();
  const p = DEFAULT_PRICES;
  const plan = (exam: ExamKey, a: number, b: number, dur: number, format: 'online' | 'offline') => {
    const x = makePlan(exam, a, b, dur, format, p);
    return { exam, now: a, goal: b, dur, format, perWeek: x.perWeek, monthly: x.monthly, price: x.price, reach: x.reach, tight: x.tight };
  };
  return [
    { id: 'seed212', num: 212, created: now - 0.8 * h, status: 'new', who: 'parent', name: 'Ирина', student: 'Матвей', grade: 11, phone: '+7 911 204-17-63', contact: 'tg', when: ['Будни вечером'],
      comment: 'Пробник в школе написал на 46. Хотим в Политех, нужно 80+. Сейчас ходит в школьную группу, не помогает.', photos: [], plan: plan('prof', 46, 82, 90, 'online') },
    { id: 'seed211', num: 211, created: now - 6 * h, status: 'work', who: 'student', name: 'Алиса', student: 'Алиса', grade: 9, phone: '+7 921 557-08-12', contact: 'wa', when: ['Выходные'],
      comment: '', photos: [], plan: plan('oge', 3, 5, 60, 'offline') },
    { id: 'seed210', num: 210, created: now - 30 * h, status: 'done', who: 'parent', name: 'Олег Викторович', student: 'Дарья', grade: 10, phone: '+7 905 330-41-98', contact: 'call', when: ['Будни днём', 'Выходные'],
      comment: 'Готовимся заранее, за полтора года.', photos: [], plan: plan('prof', 58, 90, 90, 'offline') },
  ];
}

const DAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
export const dayName = (d: number) => DAYS[d];

function seedStudents(): any[] {
  const today = new Date().getDay();
  const d = (k: number) => (today + k) % 7;
  return [
    { id: 's1', name: 'Матвей Соколов', grade: 11, exam: 'prof', parent: 'Ирина', phone: '+7 911 204-17-63', price: 4200, balance: 5,
      slots: [{ day: d(0), time: '16:30', dur: 90 }, { day: d(3), time: '16:30', dur: 90 }], log: [] },
    { id: 's2', name: 'Алиса Петрова', grade: 9, exam: 'oge', parent: 'Светлана', phone: '+7 921 557-08-12', price: 3500, balance: 2,
      slots: [{ day: d(0), time: '18:30', dur: 60 }, { day: d(4), time: '11:00', dur: 60 }], log: [] },
    { id: 's3', name: 'Дарья Лебедева', grade: 10, exam: 'prof', parent: 'Олег Викторович', phone: '+7 905 330-41-98', price: 4700, balance: -1,
      slots: [{ day: d(1), time: '17:00', dur: 90 }, { day: d(5), time: '12:00', dur: 90 }], log: [] },
    { id: 's4', name: 'Глеб Морозов', grade: 11, exam: 'base', parent: 'Наталья', phone: '+7 931 118-62-05', price: 3000, balance: 7,
      slots: [{ day: d(0), time: '20:00', dur: 60 }], log: [] },
    { id: 's5', name: 'Софья Зайцева', grade: 8, exam: 'school', parent: 'Марина', phone: '+7 952 774-90-31', price: 3000, balance: 0,
      slots: [{ day: d(2), time: '15:30', dur: 60 }], log: [] },
  ];
}
