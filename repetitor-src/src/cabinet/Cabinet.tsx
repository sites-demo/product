import { useEffect, useMemo, useState } from 'react';
import { dayName, DEFAULT_PRICES, EXAMS, planLine, plural, PRICE_SCHEMA, rub, TUTOR, type ExamKey } from '../lib/store';
import { getPrices, isDemo, listRequests, listStudents, login, savePrices, saveStudent, setStatus } from '../lib/api';
import { Icon } from '../ui/icons';
import { Seal } from '../ui/Seal';

const STATUS: Record<string, string> = { new: 'Новая', work: 'Договорились', done: 'Стал учеником', cancel: 'Отказ' };
const CONTACT: Record<string, string> = { tg: 'Telegram', wa: 'WhatsApp', call: 'Звонок' };
const SESSION = 'klimova.cabinet';

function ago(ts: number) {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return 'только что';
  if (m < 60) return `${m} мин назад`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} ${plural(h, 'час', 'часа', 'часов')} назад`;
  return new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}
const digits = (p: string) => p.replace(/\D/g, '');

function useLock() {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);
}

function Login({ onOk }: { onOk: () => void }) {
  const [pin, setPin] = useState(isDemo ? '1234' : '');
  const [bad, setBad] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await login(pin)) {
      try { sessionStorage.setItem(SESSION, '1'); } catch {}
      onOk();
    } else setBad(true);
  };
  return (
    <div className="login">
      <form onSubmit={submit}>
        <Seal size={92} />
        <h1>Кабинет</h1>
        <p>Заявки со страницы, ученики, расписание и оплаты.</p>
        <label className={'field' + (bad ? ' invalid' : '')}>
          <span>Код доступа</span>
          <input value={pin} onChange={(e) => { setPin(e.target.value); setBad(false); }} inputMode="numeric" autoComplete="one-time-code" maxLength={8} />
          {bad ? <em>Неверный код</em> : null}
        </label>
        <button className="btn primary wide">Войти</button>
        {isDemo ? <p className="fine center">В демо код уже введён</p> : null}
      </form>
    </div>
  );
}

function RequestSheet({ r, onClose, onStatus, onEnroll }: { r: any; onClose: () => void; onStatus: (s: string) => void; onEnroll: () => void }) {
  const [photo, setPhoto] = useState<string | null>(null);
  useLock();
  const d = digits(r.phone);
  const write = r.contact === 'wa' ? `https://wa.me/${d}` : r.contact === 'tg' ? `https://t.me/+${d}` : `tel:+${d}`;
  const p = r.plan;
  return (
    <div className="panel" role="dialog" aria-modal="true">
      <header className="panel-top">
        <button className="x" onClick={onClose} aria-label="Назад"><Icon name="back" /></button>
        <h2>Заявка {r.num}</h2>
        <span className={'status s-' + r.status}>{STATUS[r.status]}</span>
      </header>
      <div className="panel-body">
        <section className="card who">
          <div>
            <b>{r.name}</b>
            <span>{r.who === 'parent' ? `родитель, ученик ${r.student || 'не указан'}` : 'ученик'}, {r.grade} класс</span>
          </div>
        </section>
        <div className="actions">
          <a className="btn primary" href={write} target="_blank" rel="noreferrer">Написать в {CONTACT[r.contact]}</a>
          <a className="btn line" href={`tel:+${d}`}><Icon name="phone" /> {r.phone}</a>
        </div>

        {p ? (
          <section className="card plan">
            <h3>Расчёт, который увидел клиент</h3>
            <p className="plan-line">{planLine(p)}</p>
            <dl>
              <div><dt>Занятий в неделю</dt><dd>{p.perWeek} по {p.dur} мин</dd></div>
              <div><dt>Формат</dt><dd>{p.format === 'online' ? 'онлайн' : 'очно'}</dd></div>
              <div><dt>В месяц</dt><dd>{rub(p.monthly)}</dd></div>
            </dl>
            {p.tight ? <p className="fine">Клиент видел предупреждение, что времени впритык.</p> : null}
          </section>
        ) : null}

        <section className="card">
          <h3>Когда удобно</h3>
          <p>{r.when?.length ? r.when.join(', ') : 'не указано'}</p>
        </section>
        {r.comment ? <section className="card"><h3>Комментарий</h3><p>{r.comment}</p></section> : null}
        <section className="card">
          <h3>Фото пробника</h3>
          {r.photos?.length ? (
            <div className="photos">
              {r.photos.map((src: string, i: number) => (
                <button key={i} onClick={() => setPhoto(src)} aria-label="Открыть фото"><img src={src} alt="" /></button>
              ))}
            </div>
          ) : <p className="fine">Не приложили{r.photosDropped ? ' (в демо фото не поместились в память браузера)' : ''}</p>}
        </section>
        <section className="card">
          <h3>Статус</h3>
          <div className="seg status-seg">
            {Object.entries(STATUS).map(([k, v]) => <button key={k} className={r.status === k ? 'on' : ''} onClick={() => onStatus(k)}>{v}</button>)}
          </div>
        </section>
        {r.status !== 'done' ? <button className="btn line wide" onClick={onEnroll}>Добавить в ученики</button> : null}
      </div>
      {photo ? <button className="lightbox" onClick={() => setPhoto(null)} aria-label="Закрыть"><img src={photo} alt="" /></button> : null}
    </div>
  );
}

function Requests({ onEnroll }: { onEnroll: (r: any) => void }) {
  const [list, setList] = useState<any[]>([]);
  const [filter, setFilter] = useState('active');
  const [open, setOpen] = useState<string | null>(null);
  const load = () => listRequests().then(setList);
  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    const onStorage = (e: StorageEvent) => e.key?.startsWith('klimova.requests') && load();
    addEventListener('storage', onStorage);
    return () => { clearInterval(t); removeEventListener('storage', onStorage); };
  }, []);
  const fresh = list.filter((r) => r.status === 'new').length;
  const shown = list.filter((r) => filter === 'all' || (filter === 'active' ? r.status === 'new' || r.status === 'work' : r.status === filter));
  const current = list.find((r) => r.id === open);
  return (
    <>
      <div className="page-head">
        <h2>Заявки</h2>
        <p>{fresh ? `${fresh} ${plural(fresh, 'новая', 'новые', 'новых')}, родители ждут ответа ${TUTOR.replyBy}` : 'Новых нет'}</p>
      </div>
      <div className="seg filter">
        {[['active', 'Активные'], ['done', 'Стали учениками'], ['all', 'Все']].map(([k, v]) => (
          <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{v}</button>
        ))}
      </div>
      {shown.length ? (
        <ul className="list">
          {shown.map((r) => (
            <li key={r.id}>
              <button className={'row-card' + (r.status === 'new' ? ' is-new' : '')} onClick={() => setOpen(r.id)}>
                <div className="rc-top"><b>{r.name}</b><span className={'status s-' + r.status}>{STATUS[r.status]}</span></div>
                <p>{r.plan ? planLine(r.plan) : 'Без расчёта'}, {r.grade} класс</p>
                <div className="rc-bottom"><span>{ago(r.created)} · {CONTACT[r.contact]}</span>{r.plan ? <b>{rub(r.plan.monthly)}/мес</b> : null}</div>
              </button>
            </li>
          ))}
        </ul>
      ) : <p className="empty">Здесь пока пусто</p>}
      {current ? (
        <RequestSheet r={current} onClose={() => setOpen(null)}
          onStatus={async (s) => { await setStatus(current.id, s); load(); }}
          onEnroll={async () => { await setStatus(current.id, 'done'); load(); setOpen(null); onEnroll(current); }} />
      ) : null}
    </>
  );
}

function StudentSheet({ s, onClose, onSave }: { s: any; onClose: () => void; onSave: (s: any) => void }) {
  const [draft, setDraft] = useState<any>(s);
  useLock();
  const pay = (n: number) => onSave({ ...draft, balance: draft.balance + n, log: [{ ts: Date.now(), type: 'pay', n, sum: n * draft.price }, ...(draft.log || [])] });
  const save = () => onSave(draft);
  const setSlot = (i: number, patch: any) => setDraft({ ...draft, slots: draft.slots.map((x: any, j: number) => j === i ? { ...x, ...patch } : x) });
  return (
    <div className="panel" role="dialog" aria-modal="true">
      <header className="panel-top">
        <button className="x" onClick={onClose} aria-label="Назад"><Icon name="back" /></button>
        <h2>{s.name}</h2>
      </header>
      <div className="panel-body">
        <section className={'card balance' + (s.balance < 0 ? ' debt' : '')}>
          <h3>Оплачено занятий</h3>
          <p className="big">{s.balance < 0 ? `долг ${-s.balance}` : s.balance}</p>
          <p className="fine">{s.balance < 0 ? `${rub(-s.balance * s.price)} к оплате` : s.balance === 0 ? 'Пора напомнить об оплате' : `на ${rub(s.balance * s.price)}`}</p>
          <div className="pay">
            <button className="btn primary" onClick={() => pay(8)}>Оплатил 8</button>
            <button className="btn line" onClick={() => pay(4)}>Оплатил 4</button>
            <button className="btn line" onClick={() => pay(1)}>Оплатил 1</button>
          </div>
        </section>

        <section className="card">
          <h3>Расписание</h3>
          {draft.slots.map((sl: any, i: number) => (
            <div className="slot" key={i}>
              <select value={sl.day} onChange={(e) => setSlot(i, { day: +e.target.value })} aria-label="День">
                {[1, 2, 3, 4, 5, 6, 0].map((d) => <option key={d} value={d}>{dayName(d)}</option>)}
              </select>
              <input type="time" value={sl.time} onChange={(e) => setSlot(i, { time: e.target.value })} aria-label="Время" />
              <select value={sl.dur} onChange={(e) => setSlot(i, { dur: +e.target.value })} aria-label="Длительность">
                <option value={60}>60 мин</option><option value={90}>90 мин</option>
              </select>
              <button className="x" onClick={() => setDraft({ ...draft, slots: draft.slots.filter((_: any, j: number) => j !== i) })} aria-label="Убрать"><Icon name="close" size={18} /></button>
            </div>
          ))}
          <button className="link-btn" onClick={() => setDraft({ ...draft, slots: [...draft.slots, { day: 1, time: '17:00', dur: 60 }] })}>Добавить время</button>
        </section>

        <section className="card form-card">
          <h3>Данные</h3>
          <label className="field"><span>Класс и экзамен</span>
            <select value={draft.exam} onChange={(e) => setDraft({ ...draft, exam: e.target.value })}>
              {Object.entries(EXAMS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </label>
          <label className="field"><span>Родитель</span><input value={draft.parent} onChange={(e) => setDraft({ ...draft, parent: e.target.value })} /></label>
          <label className="field"><span>Телефон</span><input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} inputMode="tel" /></label>
          <label className="field"><span>Цена занятия, ₽</span><input value={draft.price} onChange={(e) => setDraft({ ...draft, price: +e.target.value.replace(/\D/g, '') || 0 })} inputMode="numeric" /></label>
        </section>

        {draft.log?.length ? (
          <section className="card">
            <h3>История</h3>
            <ul className="log">
              {draft.log.slice(0, 12).map((l: any, i: number) => (
                <li key={i}><span>{new Date(l.ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
                  <span>{l.type === 'pay' ? `Оплата, ${l.n} ${plural(l.n, 'занятие', 'занятия', 'занятий')}` : 'Занятие проведено'}</span>
                  <b>{l.type === 'pay' ? rub(l.sum) : ''}</b></li>
              ))}
            </ul>
          </section>
        ) : null}
        <button className="btn primary wide" onClick={save}>Сохранить</button>
      </div>
    </div>
  );
}

function Students({ seed, onSeedUsed }: { seed: any; onSeedUsed: () => void }) {
  const [list, setList] = useState<any[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const load = () => listStudents().then(setList);
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!seed) return;
    const s = { id: 's' + Date.now(), name: seed.student || seed.name, grade: seed.grade, exam: seed.plan?.exam || 'prof', parent: seed.who === 'parent' ? seed.name : '',
      phone: seed.phone, price: seed.plan?.price || DEFAULT_PRICES.online60, balance: 0, slots: [], log: [] };
    saveStudent(s).then(() => { load(); setOpen(s.id); onSeedUsed(); });
  }, [seed]);

  const today = new Date().getDay();
  const lessons = useMemo(() => list.flatMap((s) => s.slots.filter((sl: any) => sl.day === today).map((sl: any) => ({ s, sl })))
    .sort((a, b) => a.sl.time.localeCompare(b.sl.time)), [list]);
  const debts = list.filter((s) => s.balance <= 0);
  const income = Math.round(list.reduce((sum, s) => sum + s.slots.length * s.price * 4.33, 0) / 100) * 100;

  const mark = async (s: any, key: string) => {
    if (done[key]) return;
    await saveStudent({ ...s, balance: s.balance - 1, log: [{ ts: Date.now(), type: 'lesson', n: 1 }, ...(s.log || [])] });
    setDone({ ...done, [key]: true });
    load();
  };
  const current = list.find((s) => s.id === open);

  return (
    <>
      <div className="page-head">
        <h2>Сегодня</h2>
        <p>{new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>
      {lessons.length ? (
        <ul className="today">
          {lessons.map(({ s, sl }) => {
            const key = s.id + sl.time;
            return (
              <li key={key} className={done[key] ? 'done' : ''}>
                <span className="t num">{sl.time}</span>
                <div><b>{s.name}</b><small>{EXAMS[s.exam as ExamKey].label}, {sl.dur} мин</small></div>
                <button className={'btn ' + (done[key] ? 'line' : 'primary')} onClick={() => mark(s, key)} disabled={done[key]}>
                  {done[key] ? <><Icon name="check" size={18} /> Проведено</> : 'Провела'}
                </button>
              </li>
            );
          })}
        </ul>
      ) : <p className="empty">Сегодня занятий нет</p>}

      <div className="stats">
        <div><b className="num">{list.length}</b><span>{plural(list.length, 'ученик', 'ученика', 'учеников')}</span></div>
        <div><b className="num">{debts.length}</b><span>ждут оплаты</span></div>
        <div><b className="num">{rub(income)}</b><span>в месяц по расписанию</span></div>
      </div>

      <div className="page-head"><h2>Ученики</h2></div>
      <ul className="list">
        {list.map((s) => (
          <li key={s.id}>
            <button className="row-card" onClick={() => setOpen(s.id)}>
              <div className="rc-top"><b>{s.name}</b>
                <span className={'status ' + (s.balance < 0 ? 's-cancel' : s.balance === 0 ? 's-work' : 's-done')}>
                  {s.balance < 0 ? `долг ${-s.balance}` : s.balance === 0 ? 'нет оплаты' : `оплачено ${s.balance}`}
                </span>
              </div>
              <p>{s.grade} класс, {EXAMS[s.exam as ExamKey].label}</p>
              <div className="rc-bottom"><span>{s.slots.length ? s.slots.map((x: any) => `${dayName(x.day)} ${x.time}`).join(', ') : 'расписание не задано'}</span><b>{rub(s.price)}</b></div>
            </button>
          </li>
        ))}
      </ul>
      {current ? <StudentSheet s={current} onClose={() => setOpen(null)} onSave={async (s) => { await saveStudent(s); load(); setOpen(null); }} /> : null}
    </>
  );
}

function Prices({ prices, onSaved }: { prices: any; onSaved: (p: any) => void }) {
  const [draft, setDraft] = useState<any>(prices);
  const [saved, setSaved] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(prices);
  const save = async () => { await savePrices(draft); onSaved(draft); setSaved(true); setTimeout(() => setSaved(false), 2400); };
  return (
    <div className="prices">
      <div className="page-head"><h2>Цены и набор</h2><p>Страница и калькулятор сразу считают по новым цифрам.</p></div>
      {PRICE_SCHEMA.map((g) => (
        <section className="card" key={g.group}>
          <h3>{g.group}</h3>
          {g.items.map(([k, label, unit]) => (
            <label className="price-row" key={k}>
              <span>{label}</span>
              <span className="price-input">
                <input inputMode="numeric" value={draft[k]} onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '');
                  setDraft({ ...draft, [k]: v === '' ? '' : +v });
                }} />
                <i>{unit}</i>
              </span>
            </label>
          ))}
        </section>
      ))}
      <div className={'save-bar' + (dirty || saved ? ' show' : '')}>
        <button className="btn primary wide" disabled={!dirty} onClick={save}>{saved ? <><Icon name="check" /> Сохранено</> : 'Сохранить'}</button>
      </div>
    </div>
  );
}

function Settings() {
  const link = new URL('../', location.href).href;
  const [copied, setCopied] = useState(false);
  const [install, setInstall] = useState<any>(null);
  const [tg, setTg] = useState(() => { try { return localStorage.getItem('klimova.tg') !== '0'; } catch { return true; } });
  useEffect(() => {
    const h = (e: any) => { e.preventDefault(); setInstall(e); };
    addEventListener('beforeinstallprompt', h);
    return () => removeEventListener('beforeinstallprompt', h);
  }, []);
  return (
    <div className="settings">
      <div className="page-head"><h2>Настройки</h2></div>
      <section className="card">
        <h3>Ссылка на вашу страницу</h3>
        <p className="fine">Поставьте её в профиль на Профи.ру и Авито, в описание Telegram и ВКонтакте. Родитель сам посчитает подготовку и оставит заявку.</p>
        <div className="copy">
          <code>{link.replace(/^https?:\/\//, '')}</code>
          <button className="btn line" onClick={() => { navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
            <Icon name={copied ? 'check' : 'copy'} /> {copied ? 'Скопировано' : 'Копировать'}
          </button>
        </div>
      </section>
      <section className="card">
        <h3>Уведомления</h3>
        <label className="toggle">
          <span>Присылать новые заявки в Telegram</span>
          <input type="checkbox" checked={tg} onChange={(e) => { setTg(e.target.checked); try { localStorage.setItem('klimova.tg', e.target.checked ? '1' : '0'); } catch {} }} />
          <i aria-hidden />
        </label>
      </section>
      <section className="card">
        <h3>Кабинет на телефоне</h3>
        <p className="fine">Ставится на главный экран как приложение, без App Store и Google Play.</p>
        {install
          ? <button className="btn primary wide" onClick={() => install.prompt()}>Установить</button>
          : <p className="fine">На iPhone: «Поделиться», затем «На экран Домой». На Android: меню браузера, «Установить приложение».</p>}
      </section>
    </div>
  );
}

export default function Cabinet() {
  const [authed, setAuthed] = useState(() => { try { return sessionStorage.getItem(SESSION) === '1'; } catch { return false; } });
  const [tab, setTab] = useState<'req' | 'stud' | 'price' | 'set'>('req');
  const [prices, setPrices] = useState<any>(null);
  const [seed, setSeed] = useState<any>(null);
  useEffect(() => { getPrices().then(setPrices); }, []);
  useEffect(() => { scrollTo(0, 0); }, [tab]);

  if (!authed) return <Login onOk={() => setAuthed(true)} />;
  if (!prices) return null;

  return (
    <div className="cab">
      <header className="cab-top">
        <div className="cab-brand">
          <Seal size={40} ring={false} dark />
          <span><b>{TUTOR.first} {TUTOR.last}</b><small>кабинет</small></span>
        </div>
        <a className="top-link" href="../">Моя страница</a>
      </header>
      <main className="cab-main">
        {tab === 'req' ? <Requests onEnroll={(r) => { setSeed(r); setTab('stud'); }} />
          : tab === 'stud' ? <Students seed={seed} onSeedUsed={() => setSeed(null)} />
          : tab === 'price' ? <Prices prices={prices} onSaved={setPrices} /> : <Settings />}
      </main>
      <nav className="tabbar">
        <button className={tab === 'req' ? 'on' : ''} onClick={() => setTab('req')}><Icon name="list" /><span>Заявки</span></button>
        <button className={tab === 'stud' ? 'on' : ''} onClick={() => setTab('stud')}><Icon name="clock" /><span>Ученики</span></button>
        <button className={tab === 'price' ? 'on' : ''} onClick={() => setTab('price')}><Icon name="tag" /><span>Цены</span></button>
        <button className={tab === 'set' ? 'on' : ''} onClick={() => setTab('set')}><Icon name="gear" /><span>Настройки</span></button>
      </nav>
    </div>
  );
}
