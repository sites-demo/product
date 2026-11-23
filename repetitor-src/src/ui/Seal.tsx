import { TUTOR } from '../lib/store';

export function Seal({ size = 56, dark = false, ring = true }: { size?: number; dark?: boolean; ring?: boolean }) {
  const c = dark ? 'var(--brass-2)' : 'var(--green)';
  const id = 'arc' + size + (dark ? 'd' : 'l');
  return (
    <span className="seal" aria-hidden>
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="48" fill="none" stroke={c} strokeWidth="1.2" />
        <circle cx="50" cy="50" r="44.5" fill="none" stroke={c} strokeWidth="0.6" />
        {ring ? (
          <>
            <defs><path id={id} d="M50 50 m-36 0 a36 36 0 1 1 72 0 a36 36 0 1 1 -72 0" /></defs>
            <text fill={c} style={{ font: '600 8.4px var(--sans)', letterSpacing: '1px' }}>
              <textPath href={'#' + id} startOffset="0" textLength={224} lengthAdjust="spacing">МАТЕМАТИКА · САНКТ-ПЕТЕРБУРГ · С {TUTOR.since} ·</textPath>
            </text>
            <circle cx="50" cy="50" r="27" fill="none" stroke={c} strokeWidth="0.6" />
          </>
        ) : null}
        <text x="50" y={ring ? 59 : 62} textAnchor="middle" fill={c} style={{ font: `500 ${ring ? 26 : 38}px var(--serif)`, letterSpacing: '-0.5px' }}>{TUTOR.initials}</text>
      </svg>
    </span>
  );
}
