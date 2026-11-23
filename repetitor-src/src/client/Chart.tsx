import { useEffect, useRef, useState } from 'react';
import { EXAMS, MONTHS_SHORT, trajectory, type Plan } from '../lib/store';

const L = 34, R = 10, T = 42, B = 34;

/** Подпись из двух частей: мелкое слово рубленым шрифтом и число антиквой. */
function Tag({ x, y, anchor = 'start', cap, fig, strong }: { x: number; y: number; anchor?: 'start' | 'end'; cap: string; fig: string; strong?: boolean }) {
  return (
    <text x={x} y={y} textAnchor={anchor} className={'lbl' + (strong ? ' strong' : '')}>
      <tspan className="cap">{cap}</tspan>
      <tspan className="fig" dx="5">{fig}</tspan>
    </text>
  );
}

export default function Chart({ plan }: { plan: Plan }) {
  const box = useRef<HTMLElement>(null);
  const [W, setW] = useState(480);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = Math.round(Math.min(300, Math.max(250, W * 0.6)));
  const ex = EXAMS[plan.exam];
  const { months, pts, top } = trajectory(plan);
  const points = ex.kind === 'points';
  // для оценок запас снизу, чтобы подпись «сейчас» помещалась под точкой даже с двойки
  const lo = points ? Math.floor((plan.now - 18) / 10) * 10 : 1.25;
  const hi = points ? 100 : 5;
  const x = (t: number) => L + t * (W - L - R);
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const ph = H - T - B;
  const step = points ? (ph * 10 / (hi - lo) < 24 ? 20 : 10) : 1;
  const ticks = points
    ? Array.from({ length: Math.floor((hi - lo) / 10) + 1 }, (_, i) => lo + i * 10).filter((v) => v >= 0 && v % step === 0)
    : [2, 3, 4, 5];
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ');
  const area = `${d} L${x(1)} ${y(lo)} L${x(0)} ${y(lo)} Z`;
  const fmt = (v: number) => points ? String(Math.round(v)) : `«${Math.round(v)}»`;
  const key = `${plan.exam}-${plan.now}-${plan.goal}-${plan.dur}`;
  const missed = plan.tight && !plan.keep;

  // месяцы по оси: первый у левого края, месяц экзамена у правого, между ними не теснее 46 px
  const axis: { px: number; label: string; anchor: 'start' | 'middle' | 'end' }[] = [
    { px: x(0), label: MONTHS_SHORT[plan.start.getMonth()], anchor: 'start' },
  ];
  const endLabel = { px: x(1), label: MONTHS_SHORT[plan.end.getMonth()], anchor: 'end' as const };
  for (const m of months) {
    const px = x(m.t);
    if (m.label === endLabel.label) continue;
    if (px - axis[axis.length - 1].px < 46 || endLabel.px - px < 54) continue;
    axis.push({ px, label: m.label, anchor: 'middle' });
  }
  axis.push(endLabel);

  // подпись старта: под точкой и правее, туда кривая не заходит
  const sY = y(plan.now) + 23;
  // подпись финиша над точкой (сверху оставлен запас), а если цель не достигается, под точкой: над ней линия цели
  const eY = y(top) + (missed ? 36 : -15);

  return (
    <figure className="chart" ref={box as any}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`План: с ${fmt(plan.now)} до ${fmt(top)} к экзамену`}>
        <defs>
          <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d3b27a" stopOpacity=".2" />
            <stop offset="1" stopColor="#d3b27a" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="grid" />
            <text x={L - 9} y={y(v) + 4} textAnchor="end" className="tick">{v}</text>
          </g>
        ))}
        <line x1={L} x2={W - R} y1={H - B} y2={H - B} className="base" />
        {months.map((m, i) => <line key={i} x1={x(m.t)} x2={x(m.t)} y1={T} y2={H - B} className="grid v" />)}
        {axis.map((a, i) => <text key={i} x={a.px} y={H - B + 21} textAnchor={a.anchor} className="tick">{a.label}</text>)}
        {missed ? (
          <g>
            <line x1={L} x2={W - R} y1={y(plan.goal)} y2={y(plan.goal)} className="goal" />
            <Tag x={L + 4} y={y(plan.goal) - 9} cap="цель" fig={fmt(plan.goal)} />
          </g>
        ) : null}
        <path key={'a' + key} d={area} fill="url(#chart-fill)" className="area" />
        <path key={'l' + key} d={d} className="curve" pathLength={1} />
        <circle cx={x(0)} cy={y(plan.now)} r="4.5" className="dot start" />
        <circle key={'e' + key} cx={x(1)} cy={y(top)} r="6" className="dot end" />
        <Tag x={x(0) + 12} y={sY} cap="сейчас" fig={fmt(plan.now)} />
        <Tag x={x(1) - 4} y={eY} anchor="end" cap={ex.finish} fig={fmt(top)} strong />
      </svg>
    </figure>
  );
}
