import { useEffect, useMemo, useState } from 'react';
import { calcItem, describe, MASTER, PRICE_SCHEMA, DEFAULT_PRICES, rub, plural } from '../lib/store';
import { getPrices, getSettings, isDemo, listRequests, login, savePrices, saveSettings, setStatus, type Settings as GameSettings } from '../lib/api';
import { Icon } from '../ui/icons';

const STATUS: Record<string, string> = { new: 'Новая', work: 'В работе', done: 'Выполнена', cancel: 'Отказ' };
const SESSION = 'svezho.cabinet';

function ago(ts: number) {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return 'только что';
  if (m < 60) return `${m} мин назад`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} ${plural(h, 'час', 'часа', 'часов')} назад`;
  const d = new Date(ts);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
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
        <span className="mark" data-l="С" aria-hidden />
        <h1>Кабинет мастера</h1>
        <p>{MASTER.brand}. Здесь все заявки с вашей страницы расчёта.</p>
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

function RequestSheet({ r, prices, onClose, onStatus }: { r: any; prices: any; onClose: () => void; onStatus: (s: string) => void }) {
  const [photo, setPhoto] = useState<string | null>(null);
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);
  const map = 'https://yandex.ru/maps/?text=' + encodeURIComponent(r.address);
  const tel = 'tel:+' + r.phone.replace(/\D/g, '');
  return (
    <div className="sheet" role="dialog" aria-modal="true">
      <header className="sheet-top">
        <button className="icon-btn" onClick={onClose} aria-label="Назад"><Icon name="back" /></button>
        <h2>Заявка {r.num}</h2>
        <span className={'status s-' + r.status}>{STATUS[r.status]}</span>
      </header>
      <div className="sheet-body">
        <section className="card who">
          <div>
            <b>{r.name}</b>
            <a href={tel}>{r.phone}</a>
          </div>
          <a className="btn primary" href={tel}><Icon name="phone" /> Позвонить</a>
        </section>

        <section className="card rows">
          <div className="row"><Icon name="pin" /><span>{r.address}</span><a href={map} target="_blank" rel="noreferrer">Маршрут</a></div>
          <div className="row"><Icon name="clock" /><span>{r.when}</span></div>
          {r.played ? <div className="row gift"><Icon name="star" /><span>Клиент почистил мебель в игре{r.gift ? <>, обещан подарок: <b>{r.gift}</b></> : null}</span></div> : null}
        </section>

        <section className="card">
          <h3>Что чистить</h3>
          {r.items.map((it: any, i: number) => (
            <div className="bd-item" key={i}>
              <p className="item-title">{describe(it)}</p>
              {calcItem(it, prices).lines.map((l, j) => (
                <div className="bd-line" key={j}><span>{l.label}</span><span>{rub(l.sum)}</span></div>
              ))}
            </div>
          ))}
          <div className="summary-total"><span>Клиент увидел цену</span><b>{rub(r.total)}</b></div>
        </section>

        {r.comment ? <section className="card"><h3>Комментарий</h3><p className="comment">{r.comment}</p></section> : null}

        <section className="card">
          <h3>Фото от клиента</h3>
          {r.photos?.length ? (
            <div className="photos">
              {r.photos.map((src: string, i: number) => (
                <figure key={i}><button onClick={() => setPhoto(src)} aria-label="Открыть фото"><img src={src} alt="" /></button></figure>
              ))}
            </div>
          ) : <p className="fine">Клиент не приложил фото{r.photosDropped ? ' (в демо не поместились в память браузера)' : ''}</p>}
        </section>

        <section className="card">
          <h3>Статус</h3>
          <div className="seg status-seg">
            {Object.entries(STATUS).map(([k, v]) => (
              <button key={k} className={r.status === k ? 'on' : ''} onClick={() => onStatus(k)}>{v}</button>
            ))}
          </div>
        </section>
      </div>
      {photo ? <button className="lightbox" onClick={() => setPhoto(null)} aria-label="Закрыть"><img src={photo} alt="" /></button> : null}
    </div>
  );
}

function Requests({ prices }: { prices: any }) {
  const [list, setList] = useState<any[]>([]);
  const [filter, setFilter] = useState('active');
  const [open, setOpen] = useState<string | null>(null);

  const load = () => listRequests().then(setList);
  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    const onStorage = (e: StorageEvent) => e.key?.startsWith('svezho.requests') && load();
    addEventListener('storage', onStorage);
    return () => { clearInterval(t); removeEventListener('storage', onStorage); };
  }, []);

  const counts = useMemo(() => ({
    new: list.filter((r) => r.status === 'new').length,
    work: list.filter((r) => r.status === 'work').length,
    month: list.filter((r) => r.status !== 'cancel' && Date.now() - r.created < 30 * 864e5).reduce((s, r) => s + r.total, 0),
  }), [list]);

  const shown = list.filter((r) => filter === 'all' || (filter === 'active' ? r.status === 'new' || r.status === 'work' : r.status === filter));
  const current = list.find((r) => r.id === open);

  return (
    <>
      <div className="stats">
        <div><b>{counts.new}</b><span>{plural(counts.new, 'новая', 'новые', 'новых')}</span></div>
        <div><b>{counts.work}</b><span>в работе</span></div>
        <div><b>{rub(counts.month)}</b><span>за 30 дней</span></div>
      </div>

      <div className="seg filter">
        {[['active', 'Активные'], ['done', 'Выполнены'], ['all', 'Все']].map(([k, v]) => (
          <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{v}</button>
        ))}
      </div>

      {shown.length ? (
        <ul className="req-list">
          {shown.map((r) => (
            <li key={r.id}>
              <button className={'req' + (r.status === 'new' ? ' is-new' : '')} onClick={() => setOpen(r.id)}>
                <div className="req-top">
                  <b>{r.name}{r.played ? <span className="gift-mark" title="Прошёл игру"><Icon name="star" size={14} /></span> : null}</b>
                  <span className={'status s-' + r.status}>{STATUS[r.status]}</span>
                </div>
                <p>{r.items.map(describe).join(' + ')}</p>
                <div className="req-bottom">
                  <span>{ago(r.created)} · {r.address}</span>
                  <b>{rub(r.total)}</b>
                </div>
              </button>
            </li>
          ))}
        </ul>
      ) : <p className="empty">Здесь пока пусто</p>}

      {current ? (
        <RequestSheet r={current} prices={prices} onClose={() => setOpen(null)}
          onStatus={async (s) => { await setStatus(current.id, s); load(); }} />
      ) : null}
    </>
  );
}

function Prices({ prices, onSaved }: { prices: any; onSaved: (p: any) => void }) {
  const [draft, setDraft] = useState<any>(prices);
  const [saved, setSaved] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(prices);
  const save = async () => {
    await savePrices(draft);
    onSaved(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2400);
  };
  return (
    <div className="prices">
      <p className="lead">Клиенты сразу видят новые цены на странице расчёта.</p>
      {PRICE_SCHEMA.map((g) => (
        <section className="card" key={g.group}>
          <h3>{g.group}</h3>
          {g.items.map(([k, label, unit]) => (
            <label className="price-row" key={k}>
              <span>{label}</span>
              <span className="price-input">
                <input inputMode="decimal" value={draft[k]} onChange={(e) => {
                  const v = e.target.value.replace(',', '.');
                  setDraft({ ...draft, [k]: v === '' ? '' : Number.isNaN(+v) ? draft[k] : +v });
                }} />
                <i>{unit}</i>
              </span>
            </label>
          ))}
        </section>
      ))}
      <button className="link-btn" onClick={() => setDraft({ ...DEFAULT_PRICES })}>Вернуть цены по умолчанию</button>
      <div className={'save-bar' + (dirty || saved ? ' show' : '')}>
        <button className="btn primary wide" disabled={!dirty} onClick={save}>
          {saved ? <><Icon name="check" /> Сохранено</> : 'Сохранить прайс'}
        </button>
      </div>
    </div>
  );
}

function Settings() {
  const link = new URL('../', location.href).href;
  const [copied, setCopied] = useState(false);
  const [install, setInstall] = useState<any>(null);
  const [tg, setTg] = useState(() => { try { return localStorage.getItem('svezho.tg') === '1'; } catch { return false; } });
  const [game, setGame] = useState<GameSettings | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => { getSettings().then(setGame); }, []);
  const store = (next: GameSettings) => {
    setGame(next);
    saveSettings(next).then(() => { setSaved(true); setTimeout(() => setSaved(false), 1600); });
  };
  useEffect(() => {
    const h = (e: any) => { e.preventDefault(); setInstall(e); };
    addEventListener('beforeinstallprompt', h);
    return () => removeEventListener('beforeinstallprompt', h);
  }, []);
  return (
    <div className="settings">
      <section className="card">
        <h3>Ссылка для клиентов</h3>
        <p className="fine">Поставьте её в объявление на Авито, в ВК и в описание Telegram. Клиент сам посчитает цену и пришлёт заявку с фото.</p>
        <div className="copy">
          <code>{link.replace(/^https?:\/\//, '')}</code>
          <button className="btn ghost" onClick={() => { navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
            <Icon name={copied ? 'check' : 'copy'} /> {copied ? 'Скопировано' : 'Копировать'}
          </button>
        </div>
      </section>
      {game ? (
        <section className="card">
          <h3>Игра после заявки</h3>
          <label className="toggle">
            <span>Предлагать клиенту почистить мебель пальцем</span>
            <input type="checkbox" checked={game.gameEnabled} onChange={(e) => store({ ...game, gameEnabled: e.target.checked })} />
            <i aria-hidden />
          </label>
          <p className="fine">Пока клиент ждёт звонка, он стирает грязь с дивана на экране. Это занимает минуту и запоминается.</p>
          {game.gameEnabled ? (
            <label className="field">
              <span>Подарок за чистоту <small>можно оставить пустым</small></span>
              <input value={game.gameReward} maxLength={120} placeholder="Например, бесплатная чистка подушки"
                onChange={(e) => setGame({ ...game, gameReward: e.target.value })}
                onBlur={() => store(game)} />
            </label>
          ) : null}
          <p className={'fine saved' + (saved ? ' show' : '')} aria-live="polite">{saved ? 'Сохранено' : ''}</p>
        </section>
      ) : null}
      <section className="card">
        <h3>Уведомления</h3>
        <label className="toggle">
          <span>Дублировать новые заявки в Telegram</span>
          <input type="checkbox" checked={tg} onChange={(e) => { setTg(e.target.checked); try { localStorage.setItem('svezho.tg', e.target.checked ? '1' : '0'); } catch {} }} />
          <i aria-hidden />
        </label>
      </section>
      <section className="card">
        <h3>Приложение на телефоне</h3>
        <p className="fine">Кабинет ставится на главный экран как обычное приложение, без App Store и Google Play.</p>
        {install
          ? <button className="btn primary wide" onClick={() => install.prompt()}>Установить</button>
          : <p className="fine">На iPhone: «Поделиться», затем «На экран Домой». На Android: меню браузера, «Установить приложение».</p>}
      </section>
    </div>
  );
}

export default function Cabinet() {
  const [authed, setAuthed] = useState(() => { try { return sessionStorage.getItem(SESSION) === '1'; } catch { return false; } });
  const [tab, setTab] = useState<'req' | 'price' | 'set'>('req');
  const [prices, setPrices] = useState<any>(null);
  useEffect(() => { getPrices().then(setPrices); }, []);

  if (!authed) return <Login onOk={() => setAuthed(true)} />;
  if (!prices) return null;

  return (
    <div className="cab">
      <header className="top">
        <div className="brand">
          <span className="mark" data-l="С" aria-hidden />
          <span><b>{MASTER.brand}</b><small>Кабинет мастера</small></span>
        </div>
        <a className="top-link" href="../">Страница клиента</a>
      </header>
      <main className="cab-main">
        {tab === 'req' ? <Requests prices={prices} /> : tab === 'price' ? <Prices prices={prices} onSaved={setPrices} /> : <Settings />}
      </main>
      <nav className="tabbar">
        <button className={tab === 'req' ? 'on' : ''} onClick={() => setTab('req')}><Icon name="list" /><span>Заявки</span></button>
        <button className={tab === 'price' ? 'on' : ''} onClick={() => setTab('price')}><Icon name="tag" /><span>Прайс</span></button>
        <button className={tab === 'set' ? 'on' : ''} onClick={() => setTab('set')}><Icon name="gear" /><span>Настройки</span></button>
      </nav>
    </div>
  );
}
