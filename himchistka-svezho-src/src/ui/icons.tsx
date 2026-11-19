const paths: Record<string, React.ReactNode> = {
  phone: <path d="M6.6 3.5h2.6l1.3 4-2 1.3a11 11 0 0 0 6.7 6.7l1.3-2 4 1.3v2.6a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  back: <path d="M19 12H5m5-5-5 5 5 5" />,
  camera: <><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2l1.5-2h5.6l1.5 2h2.2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5Z" /><circle cx="12" cy="13" r="3.2" /></>,
  rotate: <><path d="M20 12a8 8 0 1 1-2.4-5.7" /><path d="M20 4v4h-4" /></>,
  pin: <><path d="M12 21s-6.5-5.7-6.5-11a6.5 6.5 0 0 1 13 0c0 5.3-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.3" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  copy: <><rect x="8.5" y="8.5" width="11" height="11" rx="2" /><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" /></>,
  route: <><circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" /><path d="M8 18h7.5a3.5 3.5 0 0 0 0-7h-7a3.5 3.5 0 0 1 0-7H16" /></>,
  list: <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />,
  tag: <><path d="M3.5 12.3V4.5a1 1 0 0 1 1-1h7.8l8.2 8.2a1 1 0 0 1 0 1.4l-7.8 7.8a1 1 0 0 1-1.4 0Z" /><circle cx="8" cy="8" r="1.4" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.5A7.5 7.5 0 0 0 7 6.5l-2.4-1-2 3.4 2 1.6a7.6 7.6 0 0 0 0 3l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.5 7.5 0 0 0 2.6-1.5l2.4 1 2-3.4Z" /></>,
  logout: <path d="M14 4.5h4a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-4M10 16l-4-4 4-4M6 12h10" />,
  image: <><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><circle cx="9" cy="10" r="1.7" /><path d="m4 18 5-5 4 4 3-3 4.5 4.5" /></>,
};

export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <svg className="i" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {paths[name]}
    </svg>
  );
}

const types: Record<string, React.ReactNode> = {
  sofa: <><path d="M5 11V8.5A2.5 2.5 0 0 1 7.5 6h17A2.5 2.5 0 0 1 27 8.5V11" /><path d="M3 13a2 2 0 0 1 4 0v2h18v-2a2 2 0 0 1 4 0v6a1.5 1.5 0 0 1-1.5 1.5h-23A1.5 1.5 0 0 1 3 19Z" /><path d="M6 20.5V23M26 20.5V23" /></>,
  armchair: <><path d="M9 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3" /><path d="M6 13a2 2 0 0 1 4 0v2h12v-2a2 2 0 0 1 4 0v6a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 6 19Z" /><path d="M9 20.5V23M23 20.5V23" /></>,
  chair: <><path d="M11 4.5v10M21 4.5v10M11 7h10" /><path d="M9.5 14.5h13a1 1 0 0 1 1 1V17h-15v-1.5a1 1 0 0 1 1-1Z" /><path d="M10.5 17v6M21.5 17v6" /></>,
  mattress: <><path d="M4 13.5 9 9h19l-5 4.5Z" /><path d="M4 13.5V18h19v-4.5M23 18l5-4.5V9" /></>,
  carpet: <><path d="M6 8h20v12H6Z" /><path d="M9 11h14v6H9Z" /><path d="M4 8h2M4 11h2M4 14h2M4 17h2M4 20h2M26 8h2M26 11h2M26 14h2M26 17h2M26 20h2" /></>,
};

export function TypeIcon({ type }: { type: string }) {
  return (
    <svg className="ti" width="32" height="28" viewBox="0 0 32 28" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {types[type]}
    </svg>
  );
}
