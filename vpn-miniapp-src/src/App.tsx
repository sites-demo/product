import { useEffect, useMemo, useState, type ReactNode } from 'react'
import QRCode from 'qrcode'
import { tg, tapLight, tapHeavy, select, success, userName, userId, userPhoto, openTg } from './tg'
import { TRIAL, BRAND, BOT, SUPPORT, CHANNEL, USER_ID, SUB_URL, DEVICES_MAX, SERVERS, PLANS, OS_LIST, GUIDES, REF, type Os, type Plan } from './data'
import { IHome, ICard, IPhone, IGift, ICopy, IQr, ILaptop, IChat, IMegaphone, IChevron, IShare, IPlus, IDoc } from './icons'

type Tab = 'home' | 'plans' | 'setup' | 'friends'
const TODAY = new Date(2026, 10, 11)
const DAY = 864e5
const TRIAL_PLAN: Plan = { months: 0, title: `Пробный, ${TRIAL.days} дня`, price: TRIAL.price }

const plural = (n: number, one: string, few: string, many: string) => {
  const a = n % 10, b = n % 100
  if (a === 1 && b !== 11) return one
  if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few
  return many
}
const days = (n: number) => `${n} ${plural(n, 'день', 'дня', 'дней')}`
const fmtDate = (d: Date) => d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
const rub = (n: number) => n.toLocaleString('ru-RU') + ' ₽'
const short = (u: string) => { const t = u.replace('https://', ''); return t.length > 30 ? t.slice(0, 20) + '…' + t.slice(-6) : t }

export function App() {
  const [tab, setTab] = useState<Tab>('home')
  // Вид для нового пользователя без подписки: ссылка с ?new
  const startNew = new URLSearchParams(location.search).has('new')
  const [until, setUntil] = useState(() => startNew ? new Date(+TODAY) : new Date(2026, 10, 14))
  const [newUser, setNewUser] = useState(startNew)
  const [sheet, setSheet] = useState<ReactNode>(null)
  const [toast, setToast] = useState('')

  const daysLeft = Math.max(0, Math.round((+until - +TODAY) / DAY))

  const say = (m: string) => { setToast(m); window.clearTimeout((say as any)._t); (say as any)._t = window.setTimeout(() => setToast(''), 2000) }
  const copy = (t: string) => { navigator.clipboard?.writeText(t).catch(() => {}); tapLight(); say('Скопировано') }
  const go = (t: Tab) => { setTab(t); tapLight(); window.scrollTo({ top: 0 }) }

  // Кнопка «назад» в шапке Telegram
  useEffect(() => {
    if (!tg) return
    const back = () => { if (sheet) setSheet(null); else setTab('home') }
    if (tab !== 'home' || sheet) tg.BackButton.show(); else tg.BackButton.hide()
    tg.BackButton.onClick(back)
    return () => tg!.BackButton.offClick(back)
  }, [tab, sheet])

  const paid = (p: Plan, price: number) => {
    const next = new Date(Math.max(+until, +TODAY))
    if (p.months === 0) next.setTime(+TODAY + TRIAL.days * DAY); else next.setMonth(next.getMonth() + p.months)
    setUntil(next); setNewUser(false); success()
    setSheet(<PaidSheet plan={p} price={price} until={next} onDone={() => { setSheet(null); go('home') }} />)
  }
  const pay = (p: Plan, price: number) => setSheet(<PaySheet plan={p} price={price} onPaid={() => paid(p, price)} />)


  return (
    <div className="app">
      <header className="top">
        <div className="brand"><Logo /><span>{BRAND}</span></div>
        <button className="help" onClick={() => openTg(`https://t.me/${SUPPORT}`)}>Поддержка</button>
      </header>

      <main key={tab} className="screen">
        {tab === 'home' && <Home newUser={newUser} daysLeft={daysLeft} until={until}
          tryTrial={() => { tapHeavy(); pay(TRIAL_PLAN, TRIAL.price) }} go={go} copy={copy} openSheet={setSheet} say={say} />}
        {tab === 'plans' && <Plans until={until} history={!newUser} onPay={pay} say={say} />}
        {tab === 'setup' && <Setup locked={newUser} copy={copy} say={say} openSheet={setSheet} go={go} />}
        {tab === 'friends' && <Friends copy={copy} say={say} />}
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

const ASSET = import.meta.env.BASE_URL
function Logo() {
  return <img className="logo" src={`${ASSET}logo.png`} alt="" width={28} height={28} />
}
function Mark() {
  return <img className="sc-logo" src={`${ASSET}logo-mark.png`} alt={BRAND} height={36} />
}

function TabBtn({ on, onClick, icon, label }: { on: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return <button className={`tab ${on ? 'on' : ''}`} onClick={onClick}>{icon}<span>{label}</span></button>
}

/* Полоска дней. Анимируется только при первом открытии и когда дни добавились,
   при возврате на главную просто стоит заполненной. */
let stripShown = 0
const STRIP = 30
function DayStrip({ left }: { left: number }) {
  const target = Math.min(left, STRIP)
  const [from] = useState(() => (target < stripShown ? target : stripShown))
  const [shown, setShown] = useState(from)
  useEffect(() => {
    if (target === stripShown && shown === target) return
    const t = window.setTimeout(() => { setShown(target); stripShown = target }, 120)
    return () => window.clearTimeout(t)
  }, [target])
  return (
    <div className="strip" aria-label={`Осталось ${days(left)}`}>
      {Array.from({ length: STRIP }, (_, i) => (
        <i key={i} className={i < shown ? 'f' : ''} style={{ transitionDelay: i >= from && i < shown ? `${(i - from) * 35}ms` : '0ms' }} />
      ))}
    </div>
  )
}

/* Число дней плавно досчитывается, когда меняется (после оплаты) */
let countShown = -1
function useCountUp(target: number) {
  const [n, setN] = useState(() => (countShown < 0 ? target : countShown))
  useEffect(() => {
    const start = countShown < 0 ? target : countShown
    countShown = target
    if (start === target || matchMedia('(prefers-reduced-motion: reduce)').matches) { setN(target); return }
    let raf = 0; const t0 = performance.now(), dur = 900
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4)
      setN(Math.round(start + (target - start) * e))
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target])
  return n
}

/* ---------- Главная ---------- */
function Home({ newUser, daysLeft, until, tryTrial, go, copy, openSheet, say }: {
  newUser: boolean; daysLeft: number; until: Date; tryTrial: () => void
  go: (t: Tab) => void; copy: (t: string) => void; openSheet: (n: ReactNode) => void; say: (m: string) => void
}) {
  const low = daysLeft <= 5
  const shownDays = useCountUp(newUser ? 0 : daysLeft)
  return (
    <>
      {newUser ? (
        <section className="subcard trial">
          <div className="sc-top"><Mark /><em>пробный период</em></div>
          <div className="sc-big">{TRIAL.price} ₽</div>
          <div className="sc-sub">{TRIAL.days} дня без ограничений, потом от {rub(PLANS[0].price)} в месяц</div>
          <div className="sc-btns">
            <button className="btn white" onClick={tryTrial}>Попробовать</button>
            <button className="btn outline" onClick={() => go('plans')}>Тарифы</button>
          </div>
        </section>
      ) : (
        <section className="subcard">
          <div className="sc-top"><Mark />{low && <em>скоро закончится</em>}</div>
          <div className="sc-big">{days(shownDays)}</div>
          <div className="sc-sub">до {fmtDate(until)}, до {DEVICES_MAX} устройств</div>
          <DayStrip left={daysLeft} />
          <div className="sc-btns">
            <button className="btn white" onClick={() => go('plans')}>Продлить</button>
            <button className="btn outline" onClick={() => go('setup')}>Подключить</button>
          </div>
        </section>
      )}

      <h2 className="h">Ключ</h2>
      {newUser ? (
        <div className="group">
          <div className="row"><span className="row-t"><b className="muted">Появится сразу после оплаты</b></span></div>
        </div>
      ) : (
        <div className="group">
          <Row icon={<ICopy size={18} />} color="blue" title="Скопировать ключ" sub={short(SUB_URL)} onClick={() => copy(SUB_URL)} />
          <Row icon={<IQr size={18} />} color="indigo" title="QR-код" sub="Для телевизора или второго телефона" onClick={() => openSheet(<QrSheet />)} />
        </div>
      )}

      {!newUser && <>
        <h2 className="h">Устройства<span className="aside">2 из {DEVICES_MAX}</span></h2>
        <div className="group">
          <Row icon={<IPhone size={18} />} color="gray" title="iPhone 13" sub="сейчас онлайн" />
          <Row icon={<ILaptop size={18} />} color="gray" title="MacBook Air" sub="вчера в 22:14" right={<button className="link" onClick={() => say('Устройство отключено')}>Отключить</button>} />
          <Row icon={<IPlus size={18} />} color="green" title="Добавить устройство" onClick={() => go('setup')} blue />
        </div>

        <h2 className="h">Уведомления</h2>
        <div className="group">
          <Toggle title="Напомнить за 3 дня до конца" sub="Сообщение придёт в бот" initial={true} say={say} />
          <Toggle title="Автопродление" sub="Через СБП, за день до конца" initial={false} say={say} />
        </div>
      </>}

      <h2 className="h">Серверы</h2>
      <div className="group">
        {SERVERS.map(sv => (
          <div key={sv.code} className="row">
            <span className="row-t"><b>{sv.name}</b><small>{sv.city}</small></span>
            <span className={`ping ${sv.ping > 90 ? 'far' : ''}`}>{sv.ping} мс</span>
          </div>
        ))}
      </div>
      <p className="note">Сервер выбирается в приложении Happ, все входят в подписку.</p>
    </>
  )
}

type IconColor = 'blue' | 'indigo' | 'gray' | 'green' | 'orange' | 'teal'
function Row({ icon, color = 'gray', title, sub, right, onClick, blue }: { icon?: ReactNode; color?: IconColor; title: string; sub?: string; right?: ReactNode; onClick?: () => void; blue?: boolean }) {
  const inner = (<>
    {icon && <span className={`row-ic ic-${color}`}>{icon}</span>}
    <span className="row-t"><b className={blue ? 'blue' : ''}>{title}</b>{sub && <small>{sub}</small>}</span>
    {right ?? (onClick && !blue && <span className="chev"><IChevron size={18} /></span>)}
  </>)
  return onClick ? <button className="row" onClick={onClick}>{inner}</button> : <div className="row">{inner}</div>
}

/* Переключатель как в настройках Telegram */
function Toggle({ title, sub, initial, say }: { title: string; sub?: string; initial: boolean; say: (m: string) => void }) {
  const [on, setOn] = useState(initial)
  return (
    <button className="row" role="switch" aria-checked={on} onClick={() => { setOn(!on); select(); say(on ? `${title}: выключено` : `${title}: включено`) }}>
      <span className="row-t"><b>{title}</b>{sub && <small>{sub}</small>}</span>
      <span className={`switch ${on ? 'on' : ''}`}><i /></span>
    </button>
  )
}

function QrSheet() {
  const [src, setSrc] = useState('')
  useEffect(() => { QRCode.toDataURL(SUB_URL, { margin: 1, width: 400, color: { dark: '#111111', light: '#ffffff' } }).then(setSrc) }, [])
  return (
    <div className="sheet-body">
      <h3>QR-код ключа</h3>
      <div className="qr">{src && <img src={src} alt="QR-код ключа" />}</div>
      <p className="note center">В Happ: плюс в правом верхнем углу, «Сканировать QR».</p>
    </div>
  )
}

/* ---------- Тарифы ---------- */
const HISTORY = [
  { date: '14 октября', what: '1 месяц', sum: 135 },
  { date: '14 сентября', what: '1 месяц', sum: 135 },
  { date: '14 августа', what: '1 месяц', sum: 135 },
]

function Plans({ until, history, onPay, say }: { until: Date; history: boolean; onPay: (p: Plan, price: number) => void; say: (m: string) => void }) {
  const [sel, setSel] = useState(2)
  const [promo, setPromo] = useState('')
  const [disc, setDisc] = useState(0)
  const base = PLANS[0].price
  const price = (p: Plan) => Math.round(p.price * (1 - disc))
  const p = PLANS[sel]
  const newUntil = useMemo(() => { const d = new Date(Math.max(+until, +TODAY)); d.setMonth(d.getMonth() + p.months); return d }, [until, p])

  return (
    <>
      <h1 className="title">Тарифы</h1>
      <div className="group">
        {PLANS.map((pl, i) => {
          const save = Math.round((1 - pl.price / (base * pl.months)) * 100)
          return (
            <button key={pl.months} className={`row plan ${i === sel ? 'sel' : ''}`} onClick={() => { setSel(i); select() }}>
              <span className="radio" />
              <span className="row-t"><b>{pl.title}</b><small>{rub(Math.round(price(pl) / pl.months))} в месяц{save > 0 && <span className="save">, выгода {save}%</span>}</small></span>
              <span className="price">{rub(price(pl))}</span>
            </button>
          )
        })}
      </div>
      <p className="note">До 3 устройств на любом тарифе. Ключ при продлении не меняется.</p>

      <h2 className="h">Оплата</h2>
      <div className="group">
        <div className="row"><span className="row-ic ic-indigo sbp">СБП</span><span className="row-t"><b>Через приложение банка</b></span></div>
        <div className="row promo">
          <input value={promo} onChange={e => setPromo(e.target.value)} placeholder="Промокод" autoComplete="off" />
          <button className="link" onClick={() => { if (!promo.trim()) return say('Введите промокод'); setDisc(0.1); tapLight(); say('Скидка 10%') }}>Применить</button>
        </div>
      </div>

      <button className="btn blue wide" onClick={() => { tapHeavy(); onPay(p, price(p)) }}>Оплатить {rub(price(p))}</button>
      <p className="note center">Подписка будет до {fmtDate(newUntil)}. Чек придёт в бот.</p>

      {history && <>
        <h2 className="h">История оплат</h2>
        <div className="group">
          {HISTORY.map(h => (
            <div key={h.date} className="row"><span className="row-t"><b>{h.what}</b><small>{h.date}, СБП</small></span><span className="val">{rub(h.sum)}</span></div>
          ))}
        </div>
      </>}
    </>
  )
}

function PaySheet({ plan, price, onPaid }: { plan: Plan; price: number; onPaid: () => void }) {
  useEffect(() => { const t = window.setTimeout(onPaid, 1500); return () => window.clearTimeout(t) }, [])
  return (
    <div className="sheet-body center">
      <div className="spinner" />
      <h3>Ждём оплату</h3>
      <p className="note center">{plan.title}, {rub(price)}. Подтвердите оплату в приложении банка.</p>
    </div>
  )
}

function PaidSheet({ plan, price, until, onDone }: { plan: Plan; price: number; until: Date; onDone: () => void }) {
  return (
    <div className="sheet-body">
      <h3>Оплачено</h3>
      <div className="group inset">
        <div className="row"><span className="row-t"><b>Тариф</b></span><span className="val">{plan.title}</span></div>
        <div className="row"><span className="row-t"><b>Сумма</b></span><span className="val">{rub(price)}</span></div>
        <div className="row"><span className="row-t"><b>Действует до</b></span><span className="val">{fmtDate(until)}</span></div>
      </div>
      <button className="btn blue wide" onClick={onDone}>Готово</button>
    </div>
  )
}

/* ---------- Подключение ---------- */
const FAQ = [
  ['VPN включён, но сайты не открываются', 'Выключите и включите VPN, выберите другой сервер. Не помогло: потяните список серверов вниз, подписка обновится.'],
  ['Перестало работать после обновления', 'Удалите старую подписку в приложении и снова нажмите «Добавить ключ». Ключ тот же, платить заново не нужно.'],
  ['Можно ли на телевизор', 'Да, на Android TV через Happ. Откройте QR-код на главной и отсканируйте его телевизором.'],
]

function Setup({ locked, copy, say, openSheet, go }: { locked: boolean; copy: (t: string) => void; say: (m: string) => void; openSheet: (n: ReactNode) => void; go: (t: Tab) => void }) {
  const [os, setOs] = useState<Os>(() => /android/i.test(navigator.userAgent) ? 'android' : /iphone|ipad/i.test(navigator.userAgent) ? 'ios' : /mac/i.test(navigator.userAgent) ? 'mac' : 'win')
  const [open, setOpen] = useState<number | null>(null)
  const g = GUIDES[os]
  return (
    <>
      <h1 className="title">Подключение</h1>
      <div className="seg">
        {OS_LIST.map(o => <button key={o.id} className={o.id === os ? 'on' : ''} onClick={() => { setOs(o.id); select() }}>{o.label}</button>)}
      </div>
      <div className="group">
        {g.steps.map((s, i) => <div key={i} className="row step"><span className="n">{i + 1}</span><span className="row-t"><b>{s}</b></span></div>)}
      </div>
      {locked
        ? <button className="btn blue wide" onClick={() => go('home')}>Сначала оформить подписку</button>
        : os === 'win'
          ? <button className="btn blue wide" onClick={() => copy(SUB_URL)}>Скопировать ключ</button>
          : <button className="btn blue wide" onClick={() => { tapHeavy(); say(`Открываем ${g.app}…`) }}>Добавить ключ в {g.app}</button>}
      {!locked && <button className="btn plain wide" onClick={() => openSheet(<QrSheet />)}>QR-код для другого устройства</button>}

      <h2 className="h">Не работает</h2>
      <div className="group">
        {FAQ.map(([q, a], i) => (
          <div key={i} className={`faq ${open === i ? 'open' : ''}`}>
            <button className="row" onClick={() => { setOpen(open === i ? null : i); select() }}>
              <span className="row-t"><b>{q}</b></span><span className="chev"><IChevron size={18} /></span>
            </button>
            <div className="faq-a"><p>{a}</p></div>
          </div>
        ))}
        <Row icon={<IChat size={18} />} color="teal" title="Написать в поддержку" sub={`@${SUPPORT}`} onClick={() => openTg(`https://t.me/${SUPPORT}`)} />
      </div>
    </>
  )
}

/* ---------- Друзья ---------- */
function Friends({ copy, say }: { copy: (t: string) => void; say: (m: string) => void }) {
  const link = `https://t.me/${BOT}?start=ref_${USER_ID}`
  const share = () => {
    tapLight()
    const text = `Пользуюсь ${BRAND}, подключается за пару минут`
    if (tg) openTg(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`)
    else if (navigator.share) navigator.share({ text, url: link }).catch(() => {})
    else copy(link)
  }
  return (
    <>
      <h1 className="title">Друзья</h1>
      <Profile copy={copy} />
      <p className="lead">{REF.percent}% с каждой оплаты приглашённого друга. Вывод на карту от {rub(REF.minWithdraw)}.</p>
      <div className="group pad">
        <div className="bal-row"><span className="muted">Баланс</span><span className="muted">из {rub(REF.minWithdraw)}</span></div>
        <div className="bal">{rub(REF.balance)}</div>
        <div className="bar"><i style={{ width: `${(REF.balance / REF.minWithdraw) * 100}%` }} /></div>
        <div className="sc-btns">
          <button className="btn blue" onClick={share}><IShare size={18} />Пригласить</button>
          <button className="btn plain" onClick={() => say(`Вывод от ${rub(REF.minWithdraw)}`)}>Вывести</button>
        </div>
      </div>

      <h2 className="h">Ссылка</h2>
      <div className="group">
        <Row icon={<ICopy size={18} />} color="blue" title="Скопировать ссылку" sub={short(link)} onClick={() => copy(link)} />
      </div>

      <h2 className="h">Статистика</h2>
      <div className="group">
        <div className="row"><span className="row-t"><b>Перешли по ссылке</b></span><span className="val">{REF.invited}</span></div>
        <div className="row"><span className="row-t"><b>Оплатили</b></span><span className="val">{REF.paid}</span></div>
        <div className="row"><span className="row-t"><b>Заработано</b></span><span className="val">{rub(REF.balance)}</span></div>
      </div>

      <h2 className="h">{BRAND}</h2>
      <div className="group">
        <Row icon={<IMegaphone size={18} />} color="orange" title="Канал" sub={`@${CHANNEL}`} onClick={() => openTg(`https://t.me/${CHANNEL}`)} />
        <Row icon={<IDoc size={18} />} color="gray" title="Пользовательское соглашение" onClick={() => say('Открываем соглашение…')} />
      </div>
    </>
  )
}

/* Профиль: имя и ID из Telegram. Фото только настоящее, заглушек нет. */
function Profile({ copy }: { copy: (t: string) => void }) {
  const id = userId(USER_ID)
  const photo = userPhoto()
  return (
    <div className="group profile">
      <div className="row">
        {photo && <img className="photo" src={photo} alt="" />}
        <span className="row-t"><b>{userName()}</b><small>ID {id}</small></span>
        <button className="link" onClick={() => copy(String(id))}>Скопировать ID</button>
      </div>
    </div>
  )
}
