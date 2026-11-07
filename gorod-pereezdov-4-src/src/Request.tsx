import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { telegramLink, telephone, type SiteContent } from './content'
import { Icon } from './Icon'
import { MovePreview } from './MovePreview'

const types = [
  ['Квартира', 'home'], ['Офис', 'office'], ['Дача или дом', 'dacha'],
  ['Отдельные вещи', 'box'], ['В другой город', 'route'],
]
const lifts = ['Нет', 'Обычный', 'Грузовой']
const extras = ['Упаковка вещей', 'Разборка и сборка мебели', 'Пианино, сейф или другой тяжёлый груз', 'Хранение на складе', 'Вывоз старой мебели']
const methods = ['Звонок', 'WhatsApp', 'Telegram', 'MAX']
const steps = [
  ['Что перевозим?', 'Выберите тип переезда.'],
  ['Откуда забираем?', 'Укажите адрес, этаж и наличие лифта, если уже знаете.'],
  ['Куда везём?', 'Для междугороднего переезда можно указать только город.'],
  ['Когда и что нужно?', 'Выберите дату и отметьте услуги, которые пригодятся.'],
  ['Добавьте фото вещей', 'Сфотографируйте мебель, технику и коробки. По фото проще подобрать машину.'],
  ['Как с вами связаться?', 'Укажите телефон или имя пользователя, если выбрали Telegram.'],
]

type Stop = { address: string; floor: number; lift: string }
type Photo = { url: string; name: string }

function phoneValue(value: string) {
  let digits = value.replace(/\D/g, '')
  if (digits.length === 10) digits = '7' + digits
  if (digits.length === 11 && digits[0] === '8') digits = '7' + digits.slice(1)
  return /^7\d{10}$/.test(digits) ? '+' + digits : ''
}

function localDate() {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}

function Choice({ name, value, checked, onChange, children, multiple }: {
  name: string; value: string; checked: boolean; onChange: () => void; children: ReactNode; multiple?: boolean
}) {
  return <label className="choice">
    <input type={multiple ? 'checkbox' : 'radio'} name={name} value={value} checked={checked} onChange={onChange} />
    <span>{children}</span>
  </label>
}

function AddressStep({ name, stop, change }: { name: 'from' | 'to'; stop: Stop; change: (stop: Stop) => void }) {
  const [floorDraft, setFloorDraft] = useState<string>()
  return <>
    <label className="field">Адрес
      <input value={stop.address} maxLength={180} autoComplete="off" onChange={e => change({ ...stop, address: e.target.value })}
        placeholder={name === 'from' ? 'Например, ул. Белинского, 32' : 'Например, Бор, ул. Луначарского, 5'} />
    </label>
    <div className="address-options">
      <fieldset>
        <legend>Этаж</legend>
        <div className="counter">
          <button type="button" onClick={() => change({ ...stop, floor: stop.floor - 1 })} disabled={stop.floor <= 1} aria-label="Уменьшить этаж"><Icon name="minus" size={16} /></button>
          <input type="number" min={1} max={30} step={1} inputMode="numeric" aria-label="Номер этажа"
            value={floorDraft ?? stop.floor} onFocus={event => event.currentTarget.select()}
            onBlur={() => setFloorDraft(undefined)} onChange={event => {
              const value = event.currentTarget.value
              setFloorDraft(value)
              const floor = Number(value)
              if (Number.isInteger(floor) && floor >= 1 && floor <= 30) change({ ...stop, floor })
            }} />
          <output className="sr-only" aria-live="polite">{stop.floor}-й этаж</output>
          <button type="button" onClick={() => change({ ...stop, floor: stop.floor + 1 })} disabled={stop.floor >= 30} aria-label="Увеличить этаж"><Icon name="plus" size={16} /></button>
        </div>
      </fieldset>
      <fieldset>
        <legend>Лифт</legend>
        <div className="choices lift-options">
          {lifts.map(lift => <Choice key={lift} name={name + '-lift'} value={lift} checked={lift === stop.lift} onChange={() => change({ ...stop, lift })}>{lift}</Choice>)}
        </div>
      </fieldset>
    </div>
  </>
}

function Handoff({ message, site, photos = 0, edit }: { message: string; site: SiteContent; photos?: number; edit: () => void }) {
  const [status, setStatus] = useState('')
  const textarea = useRef<HTMLTextAreaElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => heading.current?.focus(), [])
  async function copy() {
    try {
      await navigator.clipboard.writeText(message)
      setStatus('Текст скопирован.')
    } catch {
      textarea.current?.focus()
      textarea.current?.select()
      setStatus('Текст выделен. Скопируйте его вручную.')
    }
  }

  return <div className="handoff">
    <div className="form-icon"><Icon name="check" /></div>
    <h3 tabIndex={-1} ref={heading}>Заявка готова</h3>
    <p>Откройте чат и отправьте подготовленный текст менеджеру.{photos > 0 && ' Фото добавьте в чате перед отправкой.'}</p>
    <textarea aria-label="Текст заявки" ref={textarea} value={message} readOnly rows={4} />
    <div className="handoff-actions">
      <a className="button primary" href={telegramLink(site.contacts.telegram, message)} target="_blank" rel="noopener noreferrer">
        Открыть Telegram <Icon name="upRight" size={17} />
      </a>
      <button type="button" className="button secondary" onClick={copy}>Копировать</button>
    </div>
    <p role="status" className="copy-status">{status}</p>
    <button type="button" className="text-button" onClick={edit}><Icon name="back" size={17} /> Редактировать заявку</button>
  </div>
}

const defaultStop = { address: '', floor: 1, lift: 'Нет' }

export function Request({ site, staticPreview }: { site: SiteContent; staticPreview: boolean }) {
  const [mobile, setMobile] = useState(() => matchMedia('(max-width: 700px)').matches)
  useEffect(() => {
    const query = matchMedia('(max-width: 700px)')
    const sync = () => setMobile(query.matches)
    query.addEventListener('change', sync)
    sync()
    return () => query.removeEventListener('change', sync)
  }, [])
  const [step, setStep] = useState(0)
  const [type, setType] = useState(types[0][0])
  const [rooms, setRooms] = useState<number | null>(null)
  const [from, setFrom] = useState(defaultStop)
  const [to, setTo] = useState(defaultStop)
  const [date, setDate] = useState('')
  const [extra, setExtra] = useState<string[]>([])
  const [comment, setComment] = useState('')
  const [photos, setPhotos] = useState<Photo[]>([])
  const photosRef = useRef<Photo[]>([])
  const [fileNote, setFileNote] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [via, setVia] = useState(methods[0])
  const [telegram, setTelegram] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [dragging, setDragging] = useState(false)
  const focusStep = useRef(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const phoneInput = useRef<HTMLInputElement>(null)
  const telegramInput = useRef<HTMLInputElement>(null)
  const room = type === 'Квартира' && rooms !== null ? site.rooms[rooms] : undefined
  const dateText = date ? new Date(date + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
  const end = step === steps.length - 1
  const selectedStop = step === 2 ? to : from
  const visual = step === 1 || step === 2
    ? { kind: 'address' as const, destination: step === 2, floor: selectedStop.floor, lift: selectedStop.lift }
    : {
        kind: 'load' as const, type, volume: room?.car, rooms: room ? rooms : null,
        note: step === 3 && extra.length ? `Доп. услуги: ${extra.length}`
          : step >= 4 && photos.length ? `Фото: ${photos.length} из 10`
          : room ? 'Ориентир по выбранному числу комнат'
          : type === 'Квартира' ? 'Выберите число комнат' : 'Подберём машину под ваши вещи',
      }


  useEffect(() => () => photosRef.current.forEach(photo => URL.revokeObjectURL(photo.url)), [])
  useEffect(() => {
    if (!focusStep.current || message) return
    focusStep.current = false
    heading.current?.focus({ preventScroll: true })
    heading.current?.scrollIntoView({ block: 'nearest' })
  }, [step, message])

  function go(next: number) {
    focusStep.current = true
    setStep(next)
    setError('')
  }

  function addFiles(files: FileList | null) {
    if (!files) return
    const incoming = Array.from(files)
    const images = incoming.filter(file => file.type.startsWith('image/'))
    const roomLeft = 10 - photosRef.current.length
    const added = images.slice(0, roomLeft).map(file => ({ url: URL.createObjectURL(file), name: file.name }))
    photosRef.current = [...photosRef.current, ...added]
    setPhotos(photosRef.current)
    setFileNote(images.length > roomLeft ? 'Можно добавить до 10 фото.' :
      images.length !== incoming.length ? 'Выберите файлы с изображениями.' : added.length ? `Добавлено фото: ${added.length}.` : '')
  }

  function removePhoto(url: string) {
    URL.revokeObjectURL(url)
    photosRef.current = photosRef.current.filter(photo => photo.url !== url)
    setPhotos(photosRef.current)
    setFileNote('Фото удалено.')
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!end) { go(step + 1); return }
    const tel = phoneValue(phone)
    const handle = via === 'Telegram' && /^@?[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(telegram.trim())
      ? '@' + telegram.trim().replace(/^@/, '') : ''
    if (!tel && !handle) {
      setError(via === 'Telegram' ? 'Укажите телефон или корректное имя пользователя в Telegram.' : 'Укажите телефон в формате +7 900 123-45-67.')
      if (via === 'Telegram' && !phone.trim()) telegramInput.current?.focus()
      else phoneInput.current?.focus()
      return
    }
    const route = (label: string, stop: Stop) =>
      stop.address.trim() || stop.floor > 1 || stop.lift !== 'Нет'
        ? `${label}: ${stop.address.trim() || 'адрес уточню'}, этаж ${stop.floor}, лифт: ${stop.lift.toLowerCase()}` : ''
    setMessage([
      'Здравствуйте! Хочу рассчитать переезд.',
      `Что перевозим: ${type}${room ? ', ' + room.name : ''}`,
      route('Откуда', from), route('Куда', to), dateText && 'Дата: ' + dateText,
      extra.length > 0 && 'Дополнительно: ' + extra.join(', '), comment.trim() && 'Комментарий: ' + comment.trim(),
      photos.length > 0 && `Фото приложу в чате (${photos.length} шт.).`, name.trim() && 'Имя: ' + name.trim(),
      tel && 'Телефон: ' + tel, handle && 'Telegram: ' + handle, 'Связаться: ' + via,
      site.promo.on && `Заявка с сайта, скидка ${site.promo.pct}%.`,
    ].filter(Boolean).join('\n'))
  }

  return <div className="request-layout">
    <div className="form-panel">
      {message ? <Handoff site={site} message={message} photos={photos.length} edit={() => { focusStep.current = true; setMessage('') }} /> :
        <form noValidate onSubmit={submit}>
          <div className="form-progress" aria-hidden="true">
            {steps.map(([label], index) => <span key={label} data-filled={index <= step} />)}
          </div>
          <div className="step-number">ШАГ {step + 1} ИЗ {steps.length}</div>
          <div className="form-step" key={step}>
            <h3 ref={heading} tabIndex={-1}>{steps[step][0]}</h3>
            <p className="form-hint">{steps[step][1]}</p>
            {step === 0 && <>
              <fieldset>
                <legend className="sr-only">Тип переезда</legend>
                <div className="choices">
                  {types.map(([option, icon]) => <Choice key={option} name="move-type" value={option} checked={type === option} onChange={() => setType(option)}>
                    <Icon name={icon} size={18} /> {option}
                  </Choice>)}
                </div>
              </fieldset>
              {type === 'Квартира' && site.rooms.length > 0 && <fieldset>
                <legend>Сколько комнат?</legend>
                <div className="choices">
                  {site.rooms.map((option, index) => <Choice key={index} name="rooms" value={option.name} checked={rooms === index} onChange={() => setRooms(index)}>
                    <span>{option.name}<small>{option.car}</small></span>
                  </Choice>)}
                </div>
              </fieldset>}
            </>}
            {step === 1 && <AddressStep name="from" stop={from} change={setFrom} />}
            {step === 2 && <AddressStep name="to" stop={to} change={setTo} />}
            {step === 3 && <>
              <label className="field date-field">Желаемая дата<input type="date" value={date} min={localDate()} onChange={event => setDate(event.target.value)} /></label>
              <fieldset>
                <legend>Дополнительные услуги</legend>
                <div className="choices">
                  {extras.map(option => <Choice multiple key={option} name="extras" value={option} checked={extra.includes(option)}
                    onChange={() => setExtra(items => items.includes(option) ? items.filter(item => item !== option) : [...items, option])}>{option}</Choice>)}
                </div>
              </fieldset>
              <label className="field">Комментарий<textarea rows={3} value={comment} maxLength={480} onChange={event => setComment(event.target.value)} placeholder="Например, у подъезда мало места для машины" /></label>
            </>}
            {step === 4 && <>
              <label className={dragging ? 'upload dragging' : 'upload'} onDragOver={event => { event.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files) }}>
                <Icon name="photo" size={25} /><strong>Выбрать фото</strong><small>До 10 фото. Этот шаг можно пропустить.</small>
                <input className="sr-only" type="file" accept="image/*" multiple onChange={event => { addFiles(event.target.files); event.target.value = '' }} />
              </label>
              <p className="file-note" role="status">{fileNote}</p>
              {photos.length > 0 && <ul className="photo-list">{photos.map((photo, index) => <li key={photo.url}>
                <img src={photo.url} alt={photo.name || `Фото ${index + 1}`} />
                <button type="button" onClick={() => removePhoto(photo.url)} aria-label={`Удалить фото ${index + 1}`}><Icon name="close" size={17} /></button>
              </li>)}</ul>}
            </>}
            {end && <>
              <div className="contact-fields">
                <label className="field">Имя<input autoComplete="given-name" maxLength={80} value={name} onChange={event => setName(event.target.value)} placeholder="Как к вам обращаться" /></label>
                <label className="field">Телефон<input ref={phoneInput} type="tel" autoComplete="tel" maxLength={25} value={phone} onChange={event => { setPhone(event.target.value); setError('') }} placeholder="+7 900 123-45-67" aria-describedby={error ? 'contact-error' : undefined} /></label>
              </div>
              <fieldset>
                <legend>Способ связи</legend>
                <div className="choices">
                  {methods.map(option => <Choice key={option} name="via" value={option} checked={option === via} onChange={() => { setVia(option); setError('') }}>{option}</Choice>)}
                </div>
              </fieldset>
              {via === 'Telegram' && <label className="field">Ваш Telegram<input ref={telegramInput} autoComplete="off" maxLength={33} value={telegram} placeholder="@username" onChange={event => { setTelegram(event.target.value); setError('') }} aria-describedby={error ? 'contact-error' : undefined} /></label>}
              {error && <p className="form-error" role="alert" id="contact-error">{error}</p>}
            </>}
          </div>
          {mobile && <MovePreview data={visual} mobile staticPreview={staticPreview} />}
          <div className="form-nav">
            {step > 0 && <button type="button" className="button secondary" onClick={() => go(step - 1)}><Icon name="back" size={17} /> Назад</button>}
            <button type="submit" className="button primary">{end ? 'Подготовить заявку' : 'Дальше'} <Icon name="arrow" size={18} /></button>
          </div>
        </form>}
    </div>
    <aside className="request-summary" aria-label="Сводка заявки">
      <h3 className="summary-label">Ваша заявка</h3>
      {!mobile && <MovePreview data={visual} staticPreview={staticPreview} />}
      <div className="estimate"><span>Ориентир по стоимости</span><strong>{room?.price ?? 'По заявке'}</strong>
        <p>{room ? `Машина ${room.car}, ${room.crew.toLowerCase()}. Точную цену менеджер уточнит по маршруту и вещам.` : 'Подберём машину и бригаду по вашим ответам.'}</p>
      </div>
      <dl>
        <div><dt>Переезд</dt><dd>{type}{room ? ', ' + room.name : ''}</dd></div>
        {from.address.trim() && <div><dt>Откуда</dt><dd>{from.address.trim()}</dd></div>}
        {to.address.trim() && <div><dt>Куда</dt><dd>{to.address.trim()}</dd></div>}
        {dateText && <div><dt>Дата</dt><dd>{dateText}</dd></div>}
        {extra.length > 0 && <div><dt>Услуги</dt><dd>{extra.join(', ')}</dd></div>}
        {photos.length > 0 && <div><dt>Фото</dt><dd>{photos.length} шт.</dd></div>}
      </dl>
    </aside>
  </div>
}

export function Callback({ site, topic, clearTopic }: { site: SiteContent; topic: string; clearTopic: () => void }) {
  const [phone, setPhone] = useState('')
  const [error, setError] = useState(false)
  const [message, setMessage] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const { contacts } = site

  function submit(event: FormEvent) {
    event.preventDefault()
    const tel = phoneValue(phone)
    if (!tel) {
      setError(true)
      input.current?.focus()
      return
    }
    setMessage(['Здравствуйте! Перезвоните мне, пожалуйста.', 'Телефон: ' + tel,
      topic && 'Тема: ' + topic, site.promo.on && `Заявка с сайта, скидка ${site.promo.pct}%.`].filter(Boolean).join('\n'))
  }

  return <div className="callback-panel">
    {message ? <Handoff message={message} site={site} edit={() => setMessage('')} /> :
      <form onSubmit={submit} noValidate>
        <h3>Заказать звонок</h3>
        <p>Звонки принимаем с {contacts.from} до {contacts.to}.</p>
        {topic && <div className="topic"><span>{topic}</span><button type="button" aria-label="Убрать тему" onClick={clearTopic}><Icon name="close" size={16} /></button></div>}
        <label className="field">Ваш телефон<input ref={input} type="tel" autoComplete="tel" maxLength={25} value={phone} placeholder="+7 900 123-45-67" aria-describedby={error ? 'callback-error' : undefined} aria-invalid={error} onChange={event => { setPhone(event.target.value); setError(false) }} /></label>
        {error && <p className="form-error" id="callback-error" role="alert">Укажите телефон в формате +7 900 123-45-67.</p>}
        <button className="button primary" type="submit">Подготовить запрос <Icon name="arrow" size={18} /></button>
        <p className="callback-note">Запрос нужно будет отправить в Telegram. Или <a href={telephone(contacts.phone)}>позвоните нам</a>.</p>
      </form>}
  </div>
}
