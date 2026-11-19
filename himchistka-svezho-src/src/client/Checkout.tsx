import { useEffect, useRef, useState } from 'react';
import { describe, MASTER, rub } from '../lib/store';
import { sendRequest } from '../lib/api';
import { Icon } from '../ui/icons';

const WHEN = ['Сегодня', 'Завтра', 'На выходных', 'Обсудим'];

function phoneMask(v: string) {
  let raw = v.trim();
  if (raw.startsWith('+7')) raw = raw.slice(2);
  let d = raw.replace(/\D/g, '');
  if (d.length === 11 && (d[0] === '8' || d[0] === '7')) d = d.slice(1);
  d = d.slice(0, 10);
  const p = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 8), d.slice(8, 10)];
  let out = '+7';
  if (p[0]) out += ' ' + p[0];
  if (p[1]) out += ' ' + p[1];
  if (p[2]) out += '-' + p[2];
  if (p[3]) out += '-' + p[3];
  return out;
}

export default function Checkout({ items, total, onClose, onDone }: { items: any[]; total: number; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ name: '', phone: '', address: '', when: 'Завтра', comment: '' });
  const [photos, setPhotos] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [state, setState] = useState<'form' | 'sending' | 'done'>('form');
  const [num, setNum] = useState<number | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const previews = useRef<string[]>([]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; previews.current.forEach(URL.revokeObjectURL); };
  }, []);

  const set = (k: string) => (e: any) => {
    const v = k === 'phone' ? phoneMask(e.target.value) : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((x) => ({ ...x, [k]: false }));
  };

  const addPhotos = (list: FileList | null) => {
    if (!list) return;
    const next = [...photos, ...Array.from(list).filter((f) => f.type.startsWith('image/'))].slice(0, 6);
    previews.current.forEach(URL.revokeObjectURL);
    previews.current = next.map((f) => URL.createObjectURL(f));
    setPhotos(next);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = {
      name: form.name.trim().length < 2,
      phone: form.phone.replace(/\D/g, '').length !== 11,
      address: form.address.trim().length < 5,
    };
    setErrors(err);
    if (Object.values(err).some(Boolean)) {
      document.querySelector<HTMLElement>('.sheet .invalid input')?.focus();
      return;
    }
    setState('sending');
    try {
      const r = await sendRequest({ ...form, items, total, photos });
      setNum(r?.num ?? null);
      setState('done');
      onDone();
    } catch {
      setState('form');
      alert('Не получилось отправить. Позвоните, пожалуйста: ' + MASTER.phone);
    }
  };

  if (state === 'done') return (
    <div className="sheet done" role="dialog" aria-modal="true">
      <div className="done-body">
        <div className="done-icon"><Icon name="check" /></div>
        <h2>Заявка у мастера</h2>
        <p>{MASTER.name} посмотрит фото и позвонит вам в течение 15 минут, чтобы договориться о времени.</p>
        {num ? <p className="done-num">Номер заявки {num}</p> : null}
        <a className="btn primary wide" href="cabinet/">Как заявку видит мастер</a>
        <button className="btn ghost wide" onClick={onClose}>Вернуться</button>
      </div>
    </div>
  );

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="co-title">
      <header className="sheet-top">
        <button className="icon-btn" onClick={onClose} aria-label="Назад"><Icon name="back" /></button>
        <h2 id="co-title">Заявка на чистку</h2>
      </header>

      <form className="sheet-body" onSubmit={submit} noValidate>
        <section className="summary">
          <ul>{items.map((it, i) => <li key={i}>{describe(it)}</li>)}</ul>
          <div className="summary-total"><span>Предварительно</span><b>{rub(total)}</b></div>
        </section>

        <label className={'field' + (errors.name ? ' invalid' : '')}>
          <span>Как к вам обращаться</span>
          <input value={form.name} onChange={set('name')} autoComplete="given-name" placeholder="Имя" />
          {errors.name ? <em>Напишите имя</em> : null}
        </label>
        <label className={'field' + (errors.phone ? ' invalid' : '')}>
          <span>Телефон</span>
          <input value={form.phone} onChange={set('phone')} onFocus={(e) => !e.target.value && setForm((f) => ({ ...f, phone: '+7 ' }))} inputMode="tel" autoComplete="tel" placeholder="+7 900 000-00-00" />
          {errors.phone ? <em>Проверьте номер, нужно 11 цифр</em> : null}
        </label>
        <label className={'field' + (errors.address ? ' invalid' : '')}>
          <span>Адрес</span>
          <input value={form.address} onChange={set('address')} autoComplete="street-address" placeholder="Улица, дом, квартира" />
          {errors.address ? <em>Нужен адрес, чтобы мастер рассчитал дорогу</em> : null}
        </label>

        <div className="field">
          <span>Когда удобно</span>
          <div className="chips">
            {WHEN.map((w) => (
              <button type="button" key={w} className={'chip' + (form.when === w ? ' on' : '')} aria-pressed={form.when === w} onClick={() => setForm((f) => ({ ...f, when: w }))}>{w}</button>
            ))}
          </div>
        </div>

        <div className="field">
          <span>Фото мебели и пятен <small>необязательно, до 6 штук</small></span>
          <div className="photos">
            {previews.current.map((src, i) => (
              <figure key={src}>
                <img src={src} alt="" />
                <button type="button" aria-label="Убрать фото" onClick={() => {
                  const next = photos.filter((_, j) => j !== i);
                  URL.revokeObjectURL(previews.current[i]);
                  previews.current = previews.current.filter((_, j) => j !== i);
                  setPhotos(next);
                }}><Icon name="close" /></button>
              </figure>
            ))}
            {photos.length < 6 ? (
              <button type="button" className="photo-add" onClick={() => file.current?.click()}>
                <Icon name="camera" />
                <span>Добавить</span>
              </button>
            ) : null}
          </div>
          <input ref={file} type="file" accept="image/*" multiple hidden onChange={(e) => { addPhotos(e.target.files); e.target.value = ''; }} />
        </div>

        <label className="field">
          <span>Комментарий <small>необязательно</small></span>
          <textarea rows={3} value={form.comment} onChange={set('comment')} placeholder="Этаж, домофон, что за пятна" />
        </label>

        <button className="btn primary wide big" disabled={state === 'sending'}>
          {state === 'sending' ? 'Отправляем' : 'Отправить заявку'}
        </button>
        <p className="fine center">Мастер подтвердит цену по фото до выезда. Номер нужен только для связи.</p>
      </form>
    </div>
  );
}
