// Тонкие линейные иконки одного стиля, 24×24, обводка 1.6.
const P: Record<string, string> = {
  phone: 'M5 4h3.5l1.5 4.5-2 1.5a11 11 0 0 0 6 6l1.5-2 4.5 1.5V19a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.5 9.7l5.9-.9z',
  pin: 'M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  check: 'M4.5 12.5l5 5 10-11',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  chev: 'M6 9l6 6 6-6',
  close: 'M6 6l12 12M18 6L6 18',
  copy: 'M9 9h11v11H9zM5 15V4h11',
  route: 'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 17h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7',
  box: 'M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8',
  truck: 'M2.5 6h11v10h-11zM13.5 9.5h4l3 3.5v3h-7M6.5 18.5a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6zM17 18.5a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6z',
  reset: 'M4.5 9A8 8 0 1 1 4 13M4 4.5V9h4.5',
}

const FILL: Record<string, string> = {
  tg: 'M20.7 4.2L2.9 11.1c-1.2.5-1.2 1.2-.2 1.5l4.6 1.4 1.7 5.4c.2.6.4.8.8.8s.6-.2.9-.5l2.2-2.1 4.6 3.4c.8.5 1.4.2 1.6-.8l3-14.2c.3-1.2-.5-1.8-1.4-1.3zM9.8 14.3l-.4 4-1.4-4.6 9.8-6.2-8 6.8z',
}

export function Icon({ name, className = 'ic' }: { name: string; className?: string }) {
  if (FILL[name])
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
        <path d={FILL[name]} />
      </svg>
    )
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d={P[name] || ''} />
    </svg>
  )
}
