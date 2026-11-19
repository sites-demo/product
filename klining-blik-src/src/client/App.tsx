import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useConfig, type Kind } from './config';
import { calcOrder, MASTER, rub, fmt, ROOMS, EXTRAS } from '../lib/store';
import { getPrices } from '../lib/api';
import { Icon, TypeIcon } from '../ui/icons';
import Checkout from './Checkout';

const Viewer = lazy(() => import('./Viewer'));

const TYPES: [Kind, string][] = [['support', 'Обычная'], ['general', 'Генеральная'], ['remont', 'После ремонта']];

function Segmented({ value, options, onChange, wrap }: { value: any; options: [any, string][]; onChange: (v: any) => void; wrap?: boolean }) {
  return (
    <div className={'seg' + (wrap ? ' wrap' : '')} role="radiogroup">
      {options.map(([v, label]) => (
        <button key={String(v)} role="radio" aria-checked={value === v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  );
}

function Stepper({ value, min, max, step = 1, unit, onChange }: { value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void }) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, Math.round(v * 10) / 10)));
  return (
    <div className="stepper">
      <button aria-label="Меньше" disabled={value <= min} onClick={() => set(value - step)}><Icon name="minus" /></button>
      <output>{fmt(value)}{unit ? <small> {unit}</small> : null}</output>
      <button aria-label="Больше" disabled={value >= max} onClick={() => set(value + step)}><Icon name="plus" /></button>
    </div>
  );
}

function Group({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="group" id={'opt-' + id}>
      <div className="group-head">
        <h3>{label}</h3>
        {hint ? <span>{hint}</span> : null}
      </div>
      {children}
    </section>
  );
}

function Extras() {
  const it = useConfig((s) => s.items.flat);
  const set = useConfig((s) => s.set);
  return (
    <div className="chips">
      {EXTRAS.map(([k, label]) => (
        <button key={k} className={'chip' + (it[k] ? ' on' : '')} aria-pressed={!!it[k]} onClick={() => set(k, !it[k])}>
          {it[k] ? <Icon name="check" /> : null}
          {label}
        </button>
      ))}
    </div>
  );
}

function Options() {
  const it = useConfig((s) => s.items.flat);
  const set = useConfig((s) => s.set);
  return (
    <>
      <Group id="rooms" label="Комнат">
        <Segmented value={it.rooms} onChange={(v) => set('rooms', v)} options={ROOMS.map((r, i) => [i, r])} />
      </Group>
      <Group id="area" label="Площадь" hint="можно точнее">
        <Stepper value={it.area} min={15} max={250} unit="м²" onChange={(v) => set('area', v)} />
      </Group>
      <Group id="baths" label="Санузлов">
        <Segmented value={it.baths} onChange={(v) => set('baths', v)} options={[[1, 'Один'], [2, 'Два']]} />
      </Group>
      <Group id="windows" label="Помыть окна" hint="считаем створки">
        <Stepper value={it.windows} min={0} max={24} unit="шт." onChange={(v) => set('windows', v)} />
      </Group>
      <Group id="balcony" label="Балкон или лоджия">
        <Segmented value={it.balcony} onChange={(v) => set('balcony', v)} options={[[false, 'Не нужно'], [true, 'Убрать тоже']]} />
      </Group>
      <Group id="kitchen" label="Ещё отмыть" hint="по желанию">
        <Extras />
      </Group>
      <Group id="iron" label="Глажка" hint="пока сохнут полы">
        <Stepper value={it.iron} min={0} max={6} unit="ч" onChange={(v) => set('iron', v)} />
      </Group>
    </>
  );
}

function Say() {
  const line = useConfig((s) => s.line);
  return (
    <div className="say" key={line.at} role="status" aria-live="polite">
      {line.text}
    </div>
  );
}

const pickToGroup: Record<string, string> = { kitchen: 'kitchen', bath: 'baths', wc: 'baths', balcony: 'balcony', living: 'rooms', bed: 'rooms', kids: 'rooms', hall: 'area' };

export default function App() {
  const { items, picked, reset, before, setBefore, set } = useConfig();
  const [prices, setPrices] = useState<any>(null);
  const [touched, setTouched] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => { getPrices().then(setPrices); }, []);

  useEffect(() => {
    if (!picked.at || !pickToGroup[picked.tag]) return;
    const el = document.getElementById('opt-' + pickToGroup[picked.tag]);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
  }, [picked.at]);

  const current = items.flat;
  const order = useMemo(() => (prices ? calcOrder([current], prices) : null), [prices, current]);

  return (
    <div className="app">
      <header className="top">
        <a className="brand" href="./" aria-label={MASTER.brand}>
          <span className="mark" aria-hidden><i /></span>
          <span>
            <b>{MASTER.brand}</b>
            <small>{MASTER.tagline}</small>
          </span>
        </a>
        <a className="icon-btn" href={MASTER.phoneHref} aria-label="Позвонить мастеру"><Icon name="phone" /></a>
      </header>

      <main className="layout">
        <div className="stage-col">
          <div className="intro">
            <h1>Сколько стоит уборка вашей квартиры?</h1>
            <p>Соберите квартиру как у вас и отметьте, что отмыть. Цену скажем сразу.</p>
          </div>

          <nav className="types" aria-label="Какая уборка">
            {TYPES.map(([t, label]) => (
              <button key={t} className={current.kind === t ? 'on' : ''} aria-pressed={current.kind === t} onClick={() => set('kind', t)}>
                <TypeIcon type={t} />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <div className="stage">
            <div className="bubbles" aria-hidden><i /><i /><i /><i /><i /></div>
            <Say />
            <Suspense fallback={<div className="stage-loading">Загружаем модель</div>}>
              <Viewer onTouch={() => setTouched(true)} paused={checkout} />
            </Suspense>
            <div className={'stage-hint' + (touched ? ' gone' : '')}>
              <Icon name="rotate" /> Крутите пальцем, нажмите на комнату
            </div>
            <div className="ba" role="radiogroup" aria-label="Было или станет">
              <button role="radio" aria-checked={before} className={before ? 'on' : ''} onClick={() => setBefore(true)}>Было</button>
              <button role="radio" aria-checked={!before} className={!before ? 'on' : ''} onClick={() => setBefore(false)}>Станет</button>
            </div>
          </div>
        </div>

        <div className="panel" ref={panel}>
          <Options />

          {order ? (
            <details className="breakdown" open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
              <summary>Из чего складывается цена</summary>
              <div className="bd-item">
                {order.parts[0].lines.map((l, j) => (
                  <div className="bd-line" key={j}><span>{l.label}</span><span>{rub(l.sum)}</span></div>
                ))}
              </div>
              {order.min ? <div className="bd-line muted"><span>Минимальный заказ</span><span>{rub(prices.minOrder)}</span></div> : null}
              <p className="fine">Приезжаем со своими средствами и инвентарём, пылесос тоже наш. Если площадь совпадает, цена не изменится.</p>
            </details>
          ) : null}

          <footer className="foot">
            <span>Убираю сама, без посредников. {MASTER.name}, <span className="nowrap">{MASTER.phone}</span></span>
            <a href="cabinet/">Вход для мастера</a>
          </footer>
        </div>
      </main>

      <div className="bar">
        <div className="bar-sum">
          <small>Предварительно</small>
          <b key={order?.total} className="bump">{order ? rub(order.total) : '—'}</b>
        </div>
        <button className="btn primary" onClick={() => setCheckout(true)} disabled={!order}>
          Продолжить <Icon name="arrow" />
        </button>
      </div>

      {checkout && order ? (
        <Checkout items={[current]} total={order.total} onClose={() => setCheckout(false)} onDone={reset} />
      ) : null}
    </div>
  );
}
