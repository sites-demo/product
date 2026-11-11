// Иконки одним набором: линия 1.75, скруглённые концы.
const P = (d: string) => (p: { size?: number }) => (
  <svg width={p.size ?? 22} height={p.size ?? 22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden dangerouslySetInnerHTML={{ __html: d }} />
)
export const IHome = P('<path d="M3.5 10.5 12 4l8.5 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-4v-6h-6v6H5A1.5 1.5 0 0 1 3.5 19z"/>')
export const ICard = P('<rect x="2.5" y="5.5" width="19" height="13" rx="2.5"/><path d="M2.5 10h19M6.5 14.5h4"/>')
export const IPhone = P('<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18.5h2"/>')
export const IGift = P('<rect x="3.5" y="8.5" width="17" height="12" rx="1.5"/><path d="M12 8.5v12M3.5 12.5h17M12 8.5c-1.5-3-5-4-5-1.5S10 8.5 12 8.5zM12 8.5c1.5-3 5-4 5-1.5S14 8.5 12 8.5z"/>')
export const ICopy = P('<rect x="8.5" y="8.5" width="12" height="12" rx="2.5"/><path d="M15.5 8.5V6A2.5 2.5 0 0 0 13 3.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5"/>')
export const IQr = P('<rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="14" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="3.5" y="14" width="6.5" height="6.5" rx="1"/><path d="M14 14h2.5v2.5H14zM18 18h2.5v2.5H18zM18 14h2.5M14 20.5h2"/>')
export const ILaptop = P('<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19.5h20"/>')
export const IChat = P('<path d="M20.5 12a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.2-4.1A8.5 8.5 0 1 1 20.5 12z"/>')
export const IMegaphone = P('<path d="M4 10v4a1 1 0 0 0 1 1h2l6 4V5L7 9H5a1 1 0 0 0-1 1zM17 9a4 4 0 0 1 0 6"/>')
export const IShield = P('<path d="M12 3 19.5 6v5.5c0 4.7-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.8-7.5-9.5V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>')
export const IChevron = P('<path d="m9.5 6 6 6-6 6"/>')
export const IShare = P('<path d="M12 15V3.5M7.5 8 12 3.5 16.5 8M5 12.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6.5"/>')
export const IPlus = P('<path d="M12 5v14M5 12h14"/>')
export const IDoc = P('<path d="M14 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8z"/><path d="M14 3.5V8h4.5M9 13h6M9 16.5h4"/>')
