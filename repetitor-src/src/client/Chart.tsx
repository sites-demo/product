import { useEffect, useRef, useState } from 'react';
import { EXAMS, trajectory, type Plan } from '../lib/store';

const L = 30, R = 14, T = 24, B = 30;

export default function Chart({ plan }: { plan: Plan }) {
  const box = useRef<HTMLElement>(null);
  const [W, setW] = useState(480);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = Math.round(Math.min(280, Math.max(210, W * 0.52)));
  const ex = EXAMS[plan.exam];
  const { months, pts, top } = trajectory(plan);
  const points = ex.kind === 'points';
  const lo = points ? Math.max(0, Math.floor((plan.now - 12) / 10) * 10) : 2;
  const hi = points ? 100 : 5;
  const x = (t: number) => L + t * (W - L - R);
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const ticks = points ? Array.from({ length: (hi - lo) / 10 + 1 }, (_, i) => lo + i * 10) : [2, 3, 4, 5];
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ');
  const area = `${d} L${x(1)} ${y(lo)} L${x(0)} ${y(lo)} Z`;
  const fmt = (v: number) => points ? String(Math.round(v)) : `«${Math.round(v)}»`;
  const key = `${plan.exam}-${plan.now}-${plan.goal}-${plan.dur}`;
  const missed = plan.tight && !plan.keep;

  return (
    <figure className="chart" ref={box as any}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`План: с ${fmt(plan.now)} до ${fmt(top)} к экзамену`}>
        <defs>
          <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d3b27a" stopOpacity=".22" />
            <stop offset="1" stopColor="#d3b27a" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="grid" />
            <text x={L - 8} y={y(v) + 4} textAnchor="end" className="tick">{points ? v : v}</text>
          </g>
        ))}
        {months.map((m, i) => (
          <g key={i}>
            <line x1={x(m.t)} x2={x(m.t)} y1={T} y2={H - B} className="grid v" />
            {i % (W < 420 && months.length > 5 ? 2 : 1) === 0 ? <text x={x(m.t)} y={H - B + 20} textAnchor="middle" className="tick">{m.label}</text> : null}
          </g>
        ))}
        {missed ? (
          <g>
            <line x1={L} x2={W - R} y1={y(plan.goal)} y2={y(plan.goal)} className="goal" />
            <text x={W - R} y={y(plan.goal) - 7} textAnchor="end" className="goal-t">цель {fmt(plan.goal)}</text>
          </g>
        ) : null}
        <path key={'a' + key} d={area} fill="url(#chart-fill)" className="area" />
        <path key={'l' + key} d={d} className="curve" pathLength={1} />
        <circle cx={x(0)} cy={y(plan.now)} r="5" className="dot start" />
        <circle key={'e' + key} cx={x(1)} cy={y(top)} r="6.5" className="dot end" />
        <text x={x(0) + 10} y={y(plan.now) + (plan.now > hi - (hi - lo) * 0.2 ? 20 : -12)} className="lbl">сейчас {fmt(plan.now)}</text>
        <text x={x(1) - 12} y={y(top) + (top > hi - (hi - lo) * 0.12 ? 22 : -14)} textAnchor="end" className="lbl strong">{ex.finish} {fmt(top)}</text>
      </svg>
    </figure>
  );
}
