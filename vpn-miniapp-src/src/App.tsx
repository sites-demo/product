import { useEffect, useMemo, useState, type ReactNode } from 'react'
import QRCode from 'qrcode'
import { Tunnel } from './Tunnel'
import { tg, tapLight, tapHeavy, select, success, userName, openTg } from './tg'
import { BRAND, BOT, SUPPORT, CHANNEL, USER_ID, SUB_URL, DEVICES_MAX, SERVERS, PLANS, OS_LIST, GUIDES, REF, type Os, type Plan } from './data'
import { IHome, ICard, IPhone, IGift, ICopy, IQr, ILaptop, IChat, IMegaphone, IShield, IChevron, IShare, IPlus } from './icons'

type Tab = 'home' | 'plans' | 'setup' | 'friends'
const TODAY = new Date(2026, 10, 11)
const DAY = 864e5

const plural = (n: number, one: string, few: string, many: string) => {
  const a = n % 10, b = n % 100
  if (a === 1 && b !== 11) return one
  if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few
  return many
}
const fmtDate = (d: Date) => d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })

export function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [until, setUntil] = useState(() => new Date(2026, 10, 14))
  const [energy, setEnergy] = useState(0.35)
  const [sheet, setSheet] = useState<ReactNode>(null)
  const [toast, setToast] = useState('')

  const daysLeft = Math.max(0, Math.round((+until - +TODAY) / DAY))
  const low = daysLeft <= 5

  const say = (m: string) => { setToast(m); window.clearTimeout((say as any)._t); (say as any)._t = window.setTimeout(() => setToast(''), 2000) }
  const copy = (t: string) => { navigator.clipboard?.writeText(t).catch(() => {}); tapLight(); say('Скопировано') }
  const go = (t: Tab) => { setTab(t); tapLight(); window.scrollTo({ top: 0 }) }

  // Кнопка «назад» в шапке Telegram возвращает на главную
  useEffect(() => {
    if (!tg) return
    const back = () => { if (sheet) setSheet(null); else setTab('home') }
    if (tab !== 'home' || sheet) tg.BackButton.show(); else tg.BackButton.hide()
    tg.BackButton.onClick(back)
    return () => tg!.BackButton.offClick(back)
  }, [tab, sheet])

  const paid = (p: Plan, price: number) => {
    const next = new Date(Math.max(+until, +TODAY)); next.setMonth(next.getMonth() + p.months)
    setUntil(next)
    setEnergy(1); success()
    window.setTimeout(() => setEnergy(0.55), 2200)
    setSheet(<PaidSheet plan={p} price={price} until={next} onDone={() => { setSheet(null); go('home') }} />)
  }

  return (
    <div className="app">
      <header className="bar">
        <div className="brand"><Logo /><span>{BRAND}</span></div>
        <div className="me"><span className="me-name">{userName()}</span><span className="ava">{userName()[0]}</span></div>
      </header>

      <main key={tab} className="screen">
        {tab === 'home' && <Home daysLeft={daysLeft} until={until} low={low} energy={energy} go={go} copy={copy} openSheet={setSheet} say={say} />}
        {tab === 'plans' && <Plans until={until} onPay={(p, price) => setSheet(<PaySheet plan={p} price={price} onPaid={() => paid(p, price)} />)} say={say} />}
        {tab === 'setup' && <Setup copy={copy} say={say} openSheet={setSheet} />}
        {tab === 'friends' && <Friends copy={copy} say={say} />}
        <p className="demo-note">Демо для бота @{BOT}. Оплата, ключ и цифры здесь примерные, в рабочей версии они берутся из вашей панели.</p>
      </main>

      <nav className="tabs">
        <TabBtn on={tab === 'home'} onClick={() => go('home')} icon={<IHome />} label="Главная" />
        <TabBtn on={tab === 'plans'} onClick={() => go('plans')} icon={<ICard />} label="Тарифы" />
        <TabBtn on={tab === 'setup'} onClick={() => go('setup')} icon={<IPhone />} label="Подключение" />
        <TabBtn on={tab === 'friends'} onClick={() => go('friends')} icon={<IGift />} label="Друзья" />
      </nav>

      <div className={`sheet-bg ${sheet ? 'open' : ''}`} onClick={() => setSheet(null)} />
      <div className={`sheet ${sheet ? 'open' : ''}`} role="dialog"><div className="grip" />{sheet}</div>
      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
    </div>
  )
}

function Logo() {
  return (
    <svg className="logo" viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="9" fill="url(#lg)" />
      <path d="M8 21V11l8 6 8-6v10" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <defs><linearGradient id="lg" x1="0" y1="0" x2="32" y2="32"><stop stopColor="#7b7ffb" /><stop offset="1" stopColor="#3a3ed8" /></linearGradient></defs>
    </svg>
  )
}

function TabBtn({ on, onClick, icon, label }: { on: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return <button className={`tab ${on ? 'on' : ''}`} onClick={onClick}>{icon}<span>{label}</span></button>
}

/* ---------- Главная ---------- */
function Home({ daysLeft, until, low, energy, go, copy, openSheet, say }: {
  daysLeft: number; until: Date; low: boolean; energy: number
  go: (t: Tab) => void; copy: (t: string) => void; openSheet: (n: ReactNode) => void; say: (m: string) => void
}) {
  const [server, setServer] = useState(0)
  const s = SERVERS[server]
  return (
    <>
      <section className={`hero ${low ? 'low' : ''}`}>
        <Tunnel energy={energy} />
        <div className="hero-in">
          <div className={`status ${low ? 'warn' : 'ok'}`}><i />{low ? 'Подписка скоро закончится' : 'Подписка активна'}</div>
          <div className="days"><b>{daysLeft}</b><span>{plural(daysLeft, 'день', 'дня', 'дней')}</span></div>
          <div className="hero-sub">до {fmtDate(until)} · до {DEVICES_MAX} устройств</div>
          <div className="hero-btns">
            <button className="btn primary" onClick={() => go('plans')}>Продлить</button>
            <button className="btn glass" onClick={() => go('setup')}>Подключить</button>
          </div>
        </div>
      </section>

      <h2 className="h">Ключ подписки</h2>
      <div className="card key-card">
        <code className="key">{SUB_URL}</code>
        <div className="key-actions">
          <button className="icon-btn" onClick={() => copy(SUB_URL)}><ICopy size={20} />Скопировать</button>
          <button className="icon-btn" onClick={() => openSheet(<QrSheet />)}><IQr size={20} />QR-код</button>
        </div>
        <p className="hint">При продлении ключ не меняется, ничего переподключать не нужно.</p>
      </div>

      <h2 className="h">Устройства <span className="h-aside">2 из {DEVICES_MAX}</span></h2>
      <div className="card list">
        <Row icon={<IPhone size={20} />} title="iPhone 13" sub="Онлайн сейчас" right={<span className="dot-on" />} />
        <Row icon={<ILaptop size={20} />} title="MacBook Air" sub="Был вчера в 22:14" right={<button className="link-btn" onClick={() => say('Устройство отключено')}>Отключить</button>} />
        <Row icon={<IPlus size={20} />} title="Добавить устройство" sub="Осталось одно место" onClick={() => go('setup')} accent />
      </div>

      <h2 className="h">Серверы <span className="h-aside">все входят в подписку</span></h2>
      <div className="card list">
        {SERVERS.map((sv, i) => (
          <button key={sv.code} className={`row srv ${i === server ? 'sel' : ''}`} onClick={() => { setServer(i); select() }}>
            <span className="cc">{sv.code}</span>
            <span className="row-t"><b>{sv.name}</b><small>{sv.city}</small></span>
            <span className="load" title={`Загрузка ${sv.load}%`}><i style={{ width: `${sv.load}%` }} /></span>
            <span className={`ping ${sv.ping > 90 ? 'far' : ''}`}>{sv.ping} мс</span>
          </button>
        ))}
      </div>
      <p className="hint pad">{s.city}: пинг {s.ping} мс, загрузка {s.load}%. Сервер переключается прямо в приложении Happ.</p>
    </>
  )
}

function Row({ icon, title, sub, right, onClick, accent }: { icon: ReactNode; title: string; sub?: string; right?: ReactNode; onClick?: () => void; accent?: boolean }) {
  const inner = (<>
    <span className={`row-ic ${accent ? 'accent' : ''}`}>{icon}</span>
    <span className="row-t"><b>{title}</b>{sub && <small>{sub}</small>}</span>
    {right ?? (onClick && <span className="chev"><IChevron size={18} /></span>)}
  </>)
  return onClick ? <button className="row" onClick={onClick}>{inner}</button> : <div className="row">{inner}</div>
}

function QrSheet() {
  const [src, setSrc] = useState('')
  useEffect(() => { QRCode.toDataURL(SUB_URL, { margin: 1, width: 400, color: { dark: '#0a0a12', light: '#ffffff' } }).then(setSrc) }, [])
  return (
    <div className="sheet-body">
      <h3>QR-код ключа</h3>
      <div className="qr">{src && <img src={src} alt="QR-код ключа" />}</div>
      <p className="hint center">Откройте Happ на телевизоре или втором телефоне и выберите «Сканировать QR».</p>
    </div>
  )
}

/* ---------- Тарифы ---------- */
function Plans({ until, onPay, say }: { until: Date; onPay: (p: Plan, price: number) => void; say: (m: string) => void }) {
  const [sel, setSel] = useState(2)
  const [promo, setPromo] = useState('')
  const [disc, setDisc] = useState(0)
  const base = PLANS[0].price
  const price = (p: Plan) => Math.round(p.price * (1 - disc))
  const p = PLANS[sel]
  const newUntil = useMemo(() => { const d = new Date(Math.max(+until, +TODAY)); d.setMonth(d.getMonth() + p.months); return d }, [until, p])

  return (
    <>
      <h1 className="title">Продление</h1>
      <p className="lead">Сейчас подписка действует до {fmtDate(until)}. Новые дни добавятся к оставшимся.</p>
      <div className="plans">
        {PLANS.map((pl, i) => {
          const save = Math.round((1 - pl.price / (base * pl.months)) * 100)
          return (
            <button key={pl.months} className={`plan ${i === sel ? 'sel' : ''}`} onClick={() => { setSel(i); select() }}>
              <span className="plan-top"><b>{pl.title}</b>{save > 0 && <em>−{save}%</em>}</span>
              <span className="plan-price">{price(pl)} ₽</span>
              <span className="plan-per">{Math.round(price(pl) / pl.months)} ₽ в месяц</span>
              {i === 2 && <span className="plan-badge">Чаще берут</span>}
            </button>
          )
        })}
      </div>

      <div className="card list" style={{ marginTop: 14 }}>
        <div className="row"><span className="row-ic sbp">СБП</span><span className="row-t"><b>Система быстрых платежей</b><small>Оплата в приложении банка, без карты</small></span></div>
        <div className="row promo">
          <input value={promo} onChange={e => setPromo(e.target.value)} placeholder="Промокод, если есть" autoComplete="off" />
          <button className="link-btn" onClick={() => { if (!promo.trim()) return say('Введите промокод'); setDisc(0.1); tapLight(); say('Скидка 10% применена') }}>Применить</button>
        </div>
      </div>

      <div className="pay-sum">
        <span>Будет действовать до {fmtDate(newUntil)}</span>
        <b>{price(p)} ₽</b>
      </div>
      <button className="btn primary wide" onClick={() => { tapHeavy(); onPay(p, price(p)) }}>Оплатить {price(p)} ₽</button>
      <p className="hint center">Чек придёт в чат с ботом. Автопродление можно выключить в любой момент.</p>
    </>
  )
}

function PaySheet({ plan, price, onPaid }: { plan: Plan; price: number; onPaid: () => void }) {
  useEffect(() => { const t = window.setTimeout(onPaid, 1600); return () => window.clearTimeout(t) }, [])
  return (
    <div className="sheet-body center">
      <div className="spinner" />
      <h3>Ждём оплату</h3>
      <p className="hint center">{plan.title} за {price} ₽. В рабочей версии здесь откроется приложение вашего банка.</p>
    </div>
  )
}

function PaidSheet({ plan, price, until, onDone }: { plan: Plan; price: number; until: Date; onDone: () => void }) {
  return (
    <div className="sheet-body">
      <div className="paid-ic"><IShield size={30} /></div>
      <h3 className="center">Оплата прошла</h3>
      <div className="card list flat">
        <div className="row"><span className="row-t"><b>Тариф</b></span><span className="val">{plan.title}</span></div>
        <div className="row"><span className="row-t"><b>Списано</b></span><span className="val">{price} ₽</span></div>
        <div className="row"><span className="row-t"><b>Действует до</b></span><span className="val">{fmtDate(until)}</span></div>
      </div>
      <button className="btn primary wide" onClick={onDone}>Готово</button>
    </div>
  )
}

/* ---------- Подключение ---------- */
const FAQ = [
  ['VPN включён, но сайты не открываются', 'Выключите и включите VPN в приложении и выберите другой сервер. Если не помогло, обновите подписку: потяните список серверов вниз.'],
  ['Перестало работать после обновления', 'Удалите старую подписку в приложении и снова нажмите «Добавить ключ». Ключ тот же, платить заново не нужно.'],
  ['Можно ли на телевизор', 'Да, на Android TV через Happ. Откройте QR-код ключа на главной и отсканируйте его телевизором.'],
]

function Setup({ copy, say, openSheet }: { copy: (t: string) => void; say: (m: string) => void; openSheet: (n: ReactNode) => void }) {
  const [os, setOs] = useState<Os>(() => /android/i.test(navigator.userAgent) ? 'android' : /iphone|ipad/i.test(navigator.userAgent) ? 'ios' : /mac/i.test(navigator.userAgent) ? 'mac' : 'win')
  const [open, setOpen] = useState<number | null>(null)
  const g = GUIDES[os]
  return (
    <>
      <h1 className="title">Подключение</h1>
      <p className="lead">Две минуты, и VPN работает. Нужно только приложение {g.app}.</p>
      <div className="seg">
        {OS_LIST.map(o => <button key={o.id} className={o.id === os ? 'on' : ''} onClick={() => { setOs(o.id); select() }}>{o.label}</button>)}
      </div>
      <ol className="steps">
        {g.steps.map((s, i) => <li key={i}><span className="step-n">{i + 1}</span><span>{s}</span></li>)}
      </ol>
      {os === 'win'
        ? <button className="btn primary wide" onClick={() => copy(SUB_URL)}>Скопировать ключ</button>
        : <button className="btn primary wide" onClick={() => { tapHeavy(); say(`В рабочей версии откроется ${g.app} с ключом`) }}>Добавить ключ в {g.app}</button>}
      <button className="btn ghost wide" onClick={() => openSheet(<QrSheet />)}>Показать QR для другого устройства</button>

      <h2 className="h">Если что-то не так</h2>
      <div className="card list">
        {FAQ.map(([q, a], i) => (
          <div key={i} className={`faq ${open === i ? 'open' : ''}`}>
            <button className="row" onClick={() => { setOpen(open === i ? null : i); select() }}>
              <span className="row-t"><b>{q}</b></span><span className="chev"><IChevron size={18} /></span>
            </button>
            <div className="faq-a"><p>{a}</p></div>
          </div>
        ))}
        <Row icon={<IChat size={20} />} title="Написать в поддержку" sub={`@${SUPPORT}, отвечаем живым человеком`} onClick={() => openTg(`https://t.me/${SUPPORT}`)} accent />
      </div>
    </>
  )
}

/* ---------- Друзья ---------- */
function Friends({ copy, say }: { copy: (t: string) => void; say: (m: string) => void }) {
  const link = `https://t.me/${BOT}?start=ref_${USER_ID}`
  const share = () => {
    const text = `Пользуюсь ${BRAND}, подключается за пару минут`
    tapLight()
    if (tg) openTg(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`)
    else if (navigator.share) navigator.share({ text, url: link }).catch(() => {})
    else copy(link)
  }
  const left = REF.minWithdraw - REF.balance
  return (
    <>
      <h1 className="title">Приглашайте друзей</h1>
      <p className="lead">Получайте {REF.percent}% с каждой оплаты друга, пока он пользуется {BRAND}.</p>
      <section className="balance">
        <span className="bal-l">Баланс</span>
        <b className="bal-v">{REF.balance} ₽</b>
        <div className="bal-bar"><i style={{ width: `${(REF.balance / REF.minWithdraw) * 100}%` }} /></div>
        <span className="bal-hint">До вывода {left} ₽, выводим от {REF.minWithdraw} ₽ на карту</span>
        <div className="hero-btns">
          <button className="btn primary" onClick={share}><IShare size={18} />Пригласить</button>
          <button className="btn glass" onClick={() => say(`Вывод доступен от ${REF.minWithdraw} ₽`)}>Вывести</button>
        </div>
      </section>

      <h2 className="h">Ваша ссылка</h2>
      <button className="card key-card link-card" onClick={() => copy(link)}>
        <code className="key">{link.replace('https://', '')}</code>
        <span className="icon-btn"><ICopy size={20} /></span>
      </button>

      <div className="stats">
        <div><b>{REF.invited}</b><span>перешли по ссылке</span></div>
        <div><b>{REF.paid}</b><span>оплатили</span></div>
        <div><b>{REF.balance} ₽</b><span>заработано</span></div>
      </div>

      <h2 className="h">О сервисе</h2>
      <div className="card list">
        <Row icon={<IMegaphone size={20} />} title="Канал с новостями" sub={`@${CHANNEL}`} onClick={() => openTg(`https://t.me/${CHANNEL}`)} />
        <Row icon={<IShield size={20} />} title="Пользовательское соглашение" onClick={() => say('Откроется соглашение')} />
      </div>
    </>
  )
}
