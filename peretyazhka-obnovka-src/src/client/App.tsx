import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useConfig, type ItemType } from './config';
import { calcOrder, describe, MASTER, rub, plural, FABRICS, ARMS, LEGS, fmt } from '../lib/store';
import { getPrices } from '../lib/api';
import { COLORS } from '../lib/colors';
import { Icon, TypeIcon } from '../ui/icons';
import Checkout from './Checkout';

const Viewer = lazy(() => import('./Viewer'));

const TYPES: [ItemType, string][] = [
  ['sofa', 'Диван'],
  ['armchair', 'Кресло'],
  ['chair', 'Стулья'],
];

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

function Swatches() {
  const it = useConfig((s) => s.items[s.type]);
  const set = useConfig((s) => s.set);
  return (
    <div className="swatches">
      {COLORS.map((c, i) => (
        <button key={c.hex} aria-label={c.name} aria-pressed={it.color === i} className={it.color === i ? 'on' : ''} style={{ '--c': c.hex } as any} onClick={() => set('color', i)} />
      ))}
      <span className="swatch-name">{COLORS[it.color]?.name}</span>
    </div>
  );
}

function Repairs() {
  const type = useConfig((s) => s.type);
  const it = useConfig((s) => s.items[s.type]);
  const set = useConfig((s) => s.set);
  const list: [string, string][] = [['foam', 'Новый поролон'], ['springs', 'Пружины, механизм'], ['frame', 'Укрепить каркас']];
  return (
    <div className="chips">
      {list.filter(([k]) => !(type === 'chair' && k === 'springs')).map(([k, label]) => (
        <button key={k} className={'chip' + (it[k] ? ' on' : '')} aria-pressed={!!it[k]} onClick={() => set(k, !it[k])}>
          {it[k] ? <Icon name="check" /> : null}
          {label}
        </button>
      ))}
    </div>
  );
}

function Options() {
  const type = useConfig((s) => s.type);
  const it = useConfig((s) => s.items[s.type]);
  const set = useConfig((s) => s.set);
  const fabric = (
    <Group id="fabric" label="Новая ткань" hint={it.fabric === 'own' ? 'Ваша' : 'Образцы привезём'}>
      <Segmented wrap value={it.fabric} onChange={(v) => set('fabric', v)} options={Object.entries(FABRICS)} />
      {it.fabric === 'own' ? <p className="note">Купили ткань сами? Отлично, платите только за работу. Скажем, сколько метров нужно.</p> : <Swatches />}
    </Group>
  );
  const problems = (
    <Group id="repair" label="Что ещё сделать" hint="по желанию">
      <Repairs />
    </Group>
  );

  if (type === 'sofa') return (
    <>
      <Group id="seats" label="Посадочных мест">
        <Segmented value={it.seats} onChange={(v) => set('seats', v)} options={[[2, '2'], [3, '3'], [4, '4']]} />
      </Group>
      <Group id="corner" label="Форма">
        <Segmented value={it.corner} onChange={(v) => set('corner', v)} options={[[false, 'Прямой'], [true, 'Угловой']]} />
      </Group>
      <Group id="arm" label="Подлокотники">
        <Segmented value={it.arm} onChange={(v) => set('arm', v)} options={Object.entries(ARMS).map(([k, v]) => [k, k === 'none' ? 'Без' : v])} />
      </Group>
      <Group id="legs" label="Ножки">
        <Segmented value={it.legs} onChange={(v) => set('legs', v)} options={Object.entries(LEGS)} />
      </Group>
      <Group id="pillows" label="Декоративные подушки">
        <Segmented value={it.pillows} onChange={(v) => set('pillows', v)} options={[[0, 'Нет'], [2, '2'], [4, '4']]} />
      </Group>
      {fabric}
      {problems}
    </>
  );
  if (type === 'armchair') return (
    <>
      <Group id="arm" label="Подлокотники">
        <Segmented value={it.arm} onChange={(v) => set('arm', v)} options={Object.entries(ARMS).map(([k, v]) => [k, k === 'none' ? 'Без' : v])} />
      </Group>
      <Group id="legs" label="Ножки">
        <Segmented value={it.legs} onChange={(v) => set('legs', v)} options={Object.entries(LEGS)} />
      </Group>
      <Group id="pillows" label="Подушка">
        <Segmented value={it.pillows} onChange={(v) => set('pillows', v)} options={[[0, 'Нет'], [1, 'Есть']]} />
      </Group>
      {fabric}
      {problems}
    </>
  );
  if (type === 'chair') return (
    <>
      <Group id="seats" label="Сколько стульев">
        <Stepper value={it.count} min={1} max={16} unit="шт." onChange={(v) => set('count', v)} />
      </Group>
      <Group id="arm" label="Спинка">
        <Segmented value={it.back} onChange={(v) => set('back', v)} options={[[true, 'Мягкая'], [false, 'Жёсткая']]} />
      </Group>
      {fabric}
      {problems}
    </>
  );
  return null;
}

function Say() {
  const line = useConfig((s) => s.line);
  return (
    <div className="say" key={line.at} role="status" aria-live="polite">
      {line.text}
    </div>
  );
}

const pickToGroup: Record<string, string> = { arm: 'arm', leg: 'legs', seat: 'repair', pillow: 'pillows', frame: 'fabric' };

export default function App() {
  const { type, items, cart, setType, addToCart, removeFromCart, picked, reset, before, setBefore } = useConfig();
  const [prices, setPrices] = useState<any>(null);
  const [touched, setTouched] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => { getPrices().then(setPrices); }, []);

  useEffect(() => {
    if (!picked.at || picked.tag === 'face' || picked.tag === 'hand' || picked.tag === 'dirt') return;
    const el = document.getElementById('opt-' + (pickToGroup[picked.tag] || 'fabric'));
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
  }, [picked.at]);

  const current = items[type];
  const order = useMemo(() => (prices ? calcOrder([...cart, current], prices) : null), [prices, cart, current]);
  const cartSums = useMemo(() => (prices ? calcOrder(cart, prices).parts.map((p) => p.total) : []), [prices, cart]);
  const count = cart.length + 1;

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
            <h1>Сколько стоит перетянуть вашу мебель?</h1>
            <p>Соберите её как дома и выберите новую ткань. Цену скажем сразу.</p>
          </div>

          <nav className="types" aria-label="Что перетягиваем">
            {TYPES.map(([t, label]) => (
              <button key={t} className={type === t ? 'on' : ''} aria-pressed={type === t} onClick={() => setType(t)}>
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
              <Icon name="rotate" /> Крутите пальцем, нажмите на деталь
            </div>
            {type === 'chair' && current.count > 4 ? <div className="stage-badge">×{current.count}</div> : null}
            <div className="ba" role="radiogroup" aria-label="Было или станет">
              <button role="radio" aria-checked={before} className={before ? 'on' : ''} onClick={() => setBefore(true)}>Было</button>
              <button role="radio" aria-checked={!before} className={!before ? 'on' : ''} onClick={() => setBefore(false)}>Станет</button>
            </div>
          </div>
        </div>

        <div className="panel" ref={panel}>
          {cart.length ? (
            <section className="cart">
              <h3>Уже в заявке</h3>
              <ul>
                {cart.map((it, i) => (
                  <li key={i}>
                    <span>{describe(it)}</span>
                    <b>{rub(cartSums[i] || 0)}</b>
                    <button aria-label="Убрать" onClick={() => removeFromCart(i)}><Icon name="close" /></button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <Options />

          <button className="btn ghost wide" onClick={() => { addToCart(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
            <Icon name="plus" /> Добавить ещё предмет
          </button>

          {order ? (
            <details className="breakdown" open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
              <summary>Из чего складывается цена</summary>
              {[...cart, current].map((it, i) => (
                <div key={i} className="bd-item">
                  {order.parts[i].lines.map((l, j) => (
                    <div className="bd-line" key={j}><span>{l.label}</span><span>{rub(l.sum)}</span></div>
                  ))}
                </div>
              ))}
              {order.min ? <div className="bd-line muted"><span>Минимальный заказ</span><span>{rub(prices.minOrder)}</span></div> : null}
              <p className="fine">Цена ткани примерная, точно посчитаем на замере. Образцы ткани привезём на замер бесплатно. Заберём мебель и вернём сами, срок от 3 до 7 дней.</p>
            </details>
          ) : null}

          <footer className="foot">
            <span>Работаю сам, без посредников. {MASTER.name}, <span className="nowrap">{MASTER.phone}</span></span>
            <a href="cabinet/">Вход для мастера</a>
          </footer>
        </div>
      </main>

      <div className="bar">
        <div className="bar-sum">
          <small>{count > 1 ? `${count} ${plural(count, 'предмет', 'предмета', 'предметов')}` : 'Предварительно'}</small>
          <b key={order?.total} className="bump">{order ? rub(order.total) : '—'}</b>
        </div>
        <button className="btn primary" onClick={() => setCheckout(true)} disabled={!order}>
          Продолжить <Icon name="arrow" />
        </button>
      </div>

      {checkout && order ? (
        <Checkout items={[...cart, current]} total={order.total} onClose={() => setCheckout(false)} onDone={reset} />
      ) : null}
    </div>
  );
}
