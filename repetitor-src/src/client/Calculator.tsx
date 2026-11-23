import { useMemo, useState } from 'react';
import { EXAMS, makePlan, plural, rub, type ExamKey, type Plan } from '../lib/store';
import Chart from './Chart';

const ORDER: ExamKey[] = ['prof', 'base', 'oge', 'school'];
const SHORT: Record<ExamKey, string> = { prof: 'ЕГЭ профиль', base: 'ЕГЭ база', oge: 'ОГЭ', school: 'Школа' };

function Range({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className="range">
      <span className="range-top"><span>{label}</span><b className="num">{value}</b></span>
      <input type="range" min={min} max={max} value={value} style={{ ['--p' as any]: pct + '%' }}
        onChange={(e) => onChange(+e.target.value)} />
      <span className="range-scale"><span>{min}</span><span>{max}</span></span>
    </label>
  );
}

function Grades({ label, value, from, onChange }: { label: string; value: number; from: number; onChange: (v: number) => void }) {
  return (
    <div className="grades">
      <span className="grades-l">{label}</span>
      <div className="seg">
        {[2, 3, 4, 5].filter((g) => g >= from).map((g) => (
          <button key={g} className={value === g ? 'on' : ''} onClick={() => onChange(g)} aria-pressed={value === g}>
            <span className="g-n">{g}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Calculator({ prices, onBook }: { prices: any; onBook: (p: Plan) => void }) {
  const [exam, setExam] = useState<ExamKey>('prof');
  const [vals, setVals] = useState<Record<ExamKey, [number, number]>>(() =>
    Object.fromEntries(ORDER.map((k) => [k, [EXAMS[k].now, EXAMS[k].goal]])) as any);
  const [dur, setDur] = useState(90);
  const [format, setFormat] = useState<'online' | 'offline'>('online');
  const [now, goal] = vals[exam];
  const set = (i: 0 | 1) => (v: number) => setVals((s) => {
    const next: [number, number] = [...s[exam]] as any;
    next[i] = v;
    if (i === 0 && next[1] < v && EXAMS[exam].kind === 'grade') next[1] = v;
    return { ...s, [exam]: next };
  });
  const plan = useMemo(() => makePlan(exam, now, goal, dur, format, prices), [exam, now, goal, dur, format, prices]);
  const ex = EXAMS[exam];
  const fmt = (v: number) => ex.kind === 'points' ? `${v}` : `«${v}»`;
  const pack = Math.round(plan.price * 8 * (1 - prices.pack / 100));

  return (
    <div className="calc">
      <div className="calc-form">
        <div className="calc-group">
          <span className="calc-l">Что сдаём</span>
          <div className="seg exam-seg">
            {ORDER.map((k) => (
              <button key={k} className={exam === k ? 'on' : ''} onClick={() => setExam(k)} aria-pressed={exam === k}>{SHORT[k]}</button>
            ))}
          </div>
        </div>

        {ex.kind === 'points' ? (
          <div className="calc-group ranges">
            <Range label="Сейчас, по последнему пробнику" value={now} min={10} max={95} onChange={set(0)} />
            <Range label="Цель на экзамене" value={goal} min={Math.max(30, now)} max={100} onChange={set(1)} />
          </div>
        ) : (
          <div className="calc-group ranges">
            <Grades label={exam === 'school' ? 'Сейчас в четверти' : 'Сейчас пишет пробники на'} value={now} from={2} onChange={set(0)} />
            <Grades label="Хотим получить" value={goal} from={Math.max(3, now)} onChange={set(1)} />
          </div>
        )}

        <div className="calc-row">
          <div className="calc-group">
            <span className="calc-l">Занятие</span>
            <div className="seg">
              {[60, 90].map((m) => <button key={m} className={dur === m ? 'on' : ''} onClick={() => setDur(m)}>{m} минут</button>)}
            </div>
          </div>
          <div className="calc-group">
            <span className="calc-l">Формат</span>
            <div className="seg">
              <button className={format === 'online' ? 'on' : ''} onClick={() => setFormat('online')}>Онлайн</button>
              <button className={format === 'offline' ? 'on' : ''} onClick={() => setFormat('offline')}>Очно</button>
            </div>
          </div>
        </div>
        <p className="fine calc-note">
          Расчёт ориентировочный: столько часов обычно нужно моим ученикам на такой рост. Точный план составлю после знакомства, когда посмотрю, какие темы проседают.
        </p>
      </div>

      <div className="calc-out" aria-live="polite">
        <p className="out-k">{plan.keep ? 'Поддерживающий режим' : 'Рекомендую'}</p>
        <p className="out-big">
          <span className="num">{plan.perWeek}</span> {plural(plan.perWeek, 'занятие', 'занятия', 'занятий')} в неделю
        </p>
        <p className="out-sub">по {dur} минут, {format === 'online' ? 'онлайн' : 'очно на Петроградской'}</p>

        <Chart plan={plan} />

        {plan.tight ? (
          <p className="out-warn">
            Времени впритык. При трёх занятиях в неделю реально выйти на {fmt(plan.reach)}. Чем раньше начнём, тем ближе к {fmt(goal)}.
          </p>
        ) : null}

        <dl className="out-rows">
          <div><dt>До экзамена</dt><dd className="num">{plan.weeks} {plural(plan.weeks, 'неделя', 'недели', 'недель')}</dd></div>
          <div><dt>Всего занятий</dt><dd className="num">около {plan.lessons}</dd></div>
          <div><dt>Одно занятие</dt><dd className="num">{rub(plan.price)}</dd></div>
          <div className="em"><dt>В месяц</dt><dd className="num">{rub(plan.monthly)}</dd></div>
        </dl>
        <p className="out-pack">Абонемент на 8 занятий: {rub(pack)}, экономия {prices.pack}%</p>

        <button className="btn brass wide" onClick={() => onBook(plan)}>Записаться на знакомство</button>
        <p className="out-fine">Первая встреча 40 минут, бесплатно. Проверим уровень и уточним план.</p>
      </div>
    </div>
  );
}
