const paths: Record<string, React.ReactNode> = {
  pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  phone: <path d="M7 3H4a1 1 0 0 0-1 1 17 17 0 0 0 17 17 1 1 0 0 0 1-1v-3l-5-2-1.5 2a13 13 0 0 1-7.5-7.5L9 8 7 3Z" />,
  send: <><path d="m21 3-7.5 18-3.5-7-7-3.5L21 3Z"/><path d="M21 3 10 14"/></>,
  home: <><path d="m3 10 9-7 9 7v10H3V10Z"/><path d="M9 20v-6h6v6"/></>,
  office: <><rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01m-3 6v-3"/></>,
  dacha: <path d="M2 20h20M5 20v-8l7-6 7 6v8m-9 0v-5h4v5M17 8V5h2v5"/>,
  route: <><circle cx="5" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path d="M7 6h8a3 3 0 1 1 0 6H9a3 3 0 0 0 0 6h8"/></>,
  rigging: <path d="M5 9h14v12H5V9Zm4 0V6a3 3 0 1 1 6 0v3m-3 4v4"/>,
  storage: <path d="m3 9 9-5 9 5v11H3V9Zm4 11v-7h10v7m-10-3h10"/>,
  box: <path d="m12 3 9 4.5v9L12 21l-9-4.5v-9L12 3Zm9 4.5L12 12 3 7.5m9 4.5v9M7.5 5.25l9 4.5"/>,
  people: <><circle cx="12" cy="7.5" r="3.5"/><path d="M5 21v-1a7 7 0 0 1 14 0v1"/></>,
  truck: <><path d="M2 5h13v12H2V5Zm13 4h4l3 4v4h-7"/><circle cx="6" cy="18" r="2" fill="var(--icon-fill,white)"/><circle cx="18" cy="18" r="2" fill="var(--icon-fill,white)"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  shield: <><path d="m12 3 8 3v5c0 4.5-3.4 8-8 10-4.6-2-8-5.5-8-10V6l8-3Z"/><path d="m8.5 12 2 2 4.5-4"/></>,
  doc: <><path d="M6 3h8l4 4v14H6V3Zm8 0v5h4M9 12h6m-6 4h6"/></>,
  wallet: <path d="M4 6h16v14H4V6Zm0 0 11-3m5 8h-6v4h6m-3-2h.01"/>,
  photo: <><path d="M3 7h4l2-3h6l2 3h4v13H3V7Z"/><circle cx="12" cy="13" r="3.5"/></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  plus: <path d="M5 12h14M12 5v14"/>,
  minus: <path d="M5 12h14"/>,
  check: <path d="m5 12 5 5L19 7"/>,
  star: <path fill="currentColor" stroke="none" d="m12 2.8 2.8 5.7 6.3.9-4.6 4.4 1.1 6.3-5.6-3-5.6 3 1.1-6.3-4.6-4.4 6.3-.9 2.8-5.7Z"/>,
  play: <path d="m8 5 12 7-12 7z" />,
  pause: <path d="M9 5v14m6-14v14" />,
}

export function Icon({ name, size = 22 }: { name: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {paths[name] ?? paths.box}
  </svg>
}
