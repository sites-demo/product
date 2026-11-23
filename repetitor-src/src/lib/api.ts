import * as local from './store';

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const TUTOR_SLUG = import.meta.env.VITE_TUTOR_SLUG || 'klimova';
export const isDemo = !BASE;

const TOKEN_KEY = 'klimova.token';
const token = () => { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } };

async function http(path: string, init: RequestInit = {}) {
  const r = await fetch(`${BASE}/api/tutors/${TUTOR_SLUG}${path}`, {
    ...init,
    headers: { ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), Authorization: `Bearer ${token()}`, ...init.headers },
  });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.status === 204 ? null : r.json();
}

export async function getPrices() {
  if (isDemo) return local.getPrices();
  return { ...local.DEFAULT_PRICES, ...(await http('/prices')) };
}
export async function savePrices(draft: any) {
  const p = Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, v === '' ? (local.DEFAULT_PRICES as any)[k] : v]));
  if (isDemo) return local.savePrices(p);
  await http('/prices', { method: 'PUT', body: JSON.stringify(p) });
}

export type NewRequest = {
  who: 'parent' | 'student'; name: string; student: string; grade: number; phone: string;
  contact: 'tg' | 'wa' | 'call'; when: string[]; comment: string; plan: any; photos: File[];
};

export async function sendRequest(req: NewRequest) {
  if (isDemo) {
    const photos = await Promise.all(req.photos.map((f) => shrink(f, 900)));
    return local.addRequest({ ...req, photos });
  }
  const fd = new FormData();
  fd.append('data', JSON.stringify({ ...req, photos: undefined }));
  req.photos.forEach((f) => fd.append('photos', f));
  return http('/requests', { method: 'POST', body: fd });
}

const withToken = (url: string) => `${BASE}${url}?access_token=${encodeURIComponent(token())}`;

export async function listRequests() {
  if (isDemo) return local.getRequests();
  const rows = await http('/requests');
  return rows.map((r: any) => ({ ...r, photos: r.photos.map(withToken) }));
}
export async function setStatus(id: string, status: string) {
  if (isDemo) return local.updateRequest(id, { status });
  return http(`/requests/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

export async function listStudents() {
  if (isDemo) return local.getStudents();
  return http('/students');
}
export async function saveStudent(s: any) {
  if (isDemo) {
    const all = local.getStudents();
    const i = all.findIndex((x) => x.id === s.id);
    if (i >= 0) all[i] = s; else all.push(s);
    local.saveStudents(all);
    return s;
  }
  return http(`/students/${s.id}`, { method: 'PUT', body: JSON.stringify(s) });
}

export async function login(pin: string) {
  if (isDemo) return pin === '1234';
  const r = await fetch(`${BASE}/api/tutors/${TUTOR_SLUG}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) });
  if (!r.ok) return false;
  const { token: t } = await r.json();
  try { localStorage.setItem(TOKEN_KEY, t); } catch {}
  return true;
}

function shrink(file: File, max: number): Promise<string> {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      res(c.toDataURL('image/jpeg', 0.72));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => res('');
    img.src = URL.createObjectURL(file);
  });
}
