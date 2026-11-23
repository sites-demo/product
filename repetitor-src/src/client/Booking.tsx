import { useEffect, useRef, useState } from 'react';
import { planLine, plural, rub, TUTOR, type Plan } from '../lib/store';
import { sendRequest } from '../lib/api';
import { Icon } from '../ui/icons';
import { Seal } from '../ui/Seal';

const WHEN = ['Будни днём', 'Будни вечером', 'Выходные'];
const CONTACT: [string, string][] = [['tg', 'Telegram'], ['wa', 'WhatsApp'], ['call', 'Звонок']];

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

export default function Booking({ plan, onClose }: { plan: Plan | null; onClose: () => void }) {
  const [who, setWho] = useState<'parent' | 'student'>('parent');
  const [form, setForm] = useState({ name: '', student: '', phone: '', comment: '' });
  const [grade, setGrade] = useState(plan ? (plan.exam === 'oge' ? 9 : plan.exam === 'school' ? 8 : 11) : 11);
  const [contact, setContact] = useState<'tg' | 'wa' | 'call'>('tg');
  const [when, setWhen] = useState<string[]>(['Будни вечером']);
  const [photos, setPhotos] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [state, setState] = useState<'form' | 'sending' | 'done'>('form');
  const [num, setNum] = useState<number | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const previews = useRef<string[]>([]);
  const body = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', esc);
    return () => { document.body.style.overflow = ''; removeEventListener('keydown', esc); previews.current.forEach(URL.revokeObjectURL); };
  }, []);

  const set = (k: string) => (e: any) => {
    const v = k === 'phone' ? phoneMask(e.target.value) : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((x) => ({ ...x, [k]: false }));
  };
  const addPhotos = (list: FileList | null) => {
    if (!list) return;
    const next = [...photos, ...Array.from(list).filter((f) => f.type.startsWith('image/'))].slice(0, 4);
    previews.current.forEach(URL.revokeObjectURL);
    previews.current = next.map((f) => URL.createObjectURL(f));
    setPhotos(next);
  };
  const removePhoto = (i: number) => {
    const next = photos.filter((_, j) => j !== i);
    previews.current.forEach(URL.revokeObjectURL);
    previews.current = next.map((f) => URL.createObjectURL(f));
    setPhotos(next);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err: Record<string, boolean> = {};
    if (!form.name.trim()) err.name = true;
    if (form.phone.replace(/\D/g, '').length < 11) err.phone = true;
    setErrors(err);
    if (Object.keys(err).length) return;
    setState('sending');
    const planData = plan ? { exam: plan.exam, now: plan.now, goal: plan.goal, dur: plan.dur, format: plan.format, perWeek: plan.perWeek, monthly: plan.monthly, price: plan.price, reach: plan.reach, tight: plan.tight } : null;
    const r: any = await sendRequest({
      who, name: form.name.trim(), student: who === 'student' ? form.name.trim() : form.student.trim(), grade, phone: form.phone,
      contact, when, comment: form.comment.trim(), plan: planData, photos,
    });
    setNum(r?.num ?? null);
    setState('done');
    body.current?.scrollTo({ top: 0 });
  };

  const contactWord = contact === 'tg' ? 'в Telegram' : contact === 'wa' ? 'в WhatsApp' : 'по телефону';

  return (
    <div className="sheet-wrap" role="dialog" aria-modal="true" aria-label="Запись на знакомство">
      <button className="sheet-bg" onClick={onClose} aria-label="Закрыть" />
      <div className="sheet" ref={body}>
        <header className="sheet-head">
          <div>
            <h2>{state === 'done' ? 'Заявка принята' : 'Запись на знакомство'}</h2>
            {state !== 'done' ? <p className="fine">40 минут, бесплатно, онлайн или у меня</p> : null}
          </div>
          <button className="x" onClick={onClose} aria-label="Закрыть"><Icon name="close" /></button>
        </header>

        {state === 'done' ? (
          <div className="done">
            <Seal size={84} />
            <p className="done-lead">
              {TUTOR.short} напишет вам {contactWord} {TUTOR.replyBy} и предложит время для знакомства.
            </p>
            {plan ? (
              <div className="done-plan">
                <p>{planLine(plan)}</p>
                <p className="fine">{plan.perWeek} {plural(plan.perWeek, 'занятие', 'занятия', 'занятий')} в неделю по {plan.dur} минут, около {rub(plan.monthly)} в месяц</p>
              </div>
            ) : null}
            {num ? <p className="fine">Номер заявки {num}</p> : null}
            <button className="btn primary wide" onClick={onClose}>Вернуться на страницу</button>
            <a className="btn line wide" href="cabinet/">Как заявку видит репетитор</a>
          </div>
        ) : (
          <form className="book" onSubmit={submit} noValidate>
            {plan ? (
              <div className="book-plan">
                <span>Ваш расчёт</span>
                <b>{planLine(plan)}</b>
                <span>{plan.perWeek} {plural(plan.perWeek, 'занятие', 'занятия', 'занятий')} в неделю по {plan.dur} минут, {rub(plan.monthly)} в месяц</span>
              </div>
            ) : null}

            <div className="seg">
              <button type="button" className={who === 'parent' ? 'on' : ''} onClick={() => setWho('parent')}>Я родитель</button>
              <button type="button" className={who === 'student' ? 'on' : ''} onClick={() => setWho('student')}>Я ученик</button>
            </div>

            <label className={'field' + (errors.name ? ' invalid' : '')}>
              <span>Как к вам обращаться</span>
              <input value={form.name} onChange={set('name')} autoComplete="given-name" placeholder={who === 'parent' ? 'Ирина Сергеевна' : 'Имя'} />
              {errors.name ? <em>Напишите имя</em> : null}
            </label>
            {who === 'parent' ? (
              <label className="field">
                <span>Имя ученика</span>
                <input value={form.student} onChange={set('student')} placeholder="Матвей" />
              </label>
            ) : null}

            <div className="field">
              <span>Класс</span>
              <div className="seg grade-seg">
                {[7, 8, 9, 10, 11].map((g) => <button type="button" key={g} className={grade === g ? 'on' : ''} onClick={() => setGrade(g)}>{g}</button>)}
              </div>
            </div>

            <label className={'field' + (errors.phone ? ' invalid' : '')}>
              <span>Телефон</span>
              <input value={form.phone} onChange={set('phone')} inputMode="tel" autoComplete="tel" placeholder="+7 900 000-00-00" />
              {errors.phone ? <em>Проверьте номер</em> : null}
            </label>

            <div className="field">
              <span>Где удобнее ответить</span>
              <div className="seg">
                {CONTACT.map(([k, v]) => <button type="button" key={k} className={contact === k ? 'on' : ''} onClick={() => setContact(k as any)}>{v}</button>)}
              </div>
            </div>

            <div className="field">
              <span>Когда удобно заниматься <small>можно несколько</small></span>
              <div className="chips">
                {WHEN.map((w) => (
                  <button type="button" key={w} className={'chip' + (when.includes(w) ? ' on' : '')}
                    onClick={() => setWhen((s) => s.includes(w) ? s.filter((x) => x !== w) : [...s, w])}>{w}</button>
                ))}
              </div>
            </div>

            <div className="field">
              <span>Фото последнего пробника <small>по желанию</small></span>
              <p className="fine">Посмотрю ошибки до встречи, и знакомство пройдёт предметнее.</p>
              <div className="shots">
                {previews.current.map((src, i) => (
                  <figure key={src}>
                    <img src={src} alt="" />
                    <button type="button" onClick={() => removePhoto(i)} aria-label="Убрать фото"><Icon name="close" size={16} /></button>
                  </figure>
                ))}
                {photos.length < 4 ? (
                  <button type="button" className="shot-add" onClick={() => file.current?.click()}>
                    <Icon name="camera" /><span>Добавить фото</span>
                  </button>
                ) : null}
              </div>
              <input ref={file} type="file" accept="image/*" multiple hidden onChange={(e) => { addPhotos(e.target.files); e.target.value = ''; }} />
            </div>

            <label className="field">
              <span>Комментарий <small>по желанию</small></span>
              <textarea value={form.comment} onChange={set('comment')} placeholder="Куда поступаете, что сейчас даётся тяжелее всего" />
            </label>

            <button className="btn primary wide" disabled={state === 'sending'}>{state === 'sending' ? 'Отправляю' : 'Отправить заявку'}</button>
            <p className="fine center">Нажимая кнопку, вы соглашаетесь на обработку персональных данных для связи по заявке.</p>
          </form>
        )}
      </div>
    </div>
  );
}
