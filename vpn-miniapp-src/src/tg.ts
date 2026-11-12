// Тонкая обёртка над Telegram WebApp: в обычном браузере всё молча работает без него.
type Haptic = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'
interface TgWebApp {
  initData: string
  initDataUnsafe: { user?: { first_name?: string; last_name?: string; username?: string; id?: number; photo_url?: string } }
  colorScheme?: 'light' | 'dark'
  ready(): void
  expand(): void
  setHeaderColor(c: string): void
  setBackgroundColor(c: string): void
  openTelegramLink(url: string): void
  BackButton: { show(): void; hide(): void; onClick(cb: () => void): void; offClick(cb: () => void): void }
  HapticFeedback: { impactOccurred(t: Haptic): void; notificationOccurred(t: 'success' | 'error' | 'warning'): void; selectionChanged(): void }
}
declare global { interface Window { Telegram?: { WebApp: TgWebApp } } }

export const tg: TgWebApp | null = window.Telegram?.WebApp?.initData ? window.Telegram.WebApp : null

export function initTg() {
  if (!tg) return
  tg.ready()
  tg.expand()
  // Кабинет следует теме Telegram: светлая или тёмная
  const dark = tg.colorScheme === 'dark'
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  const bg = dark ? '#000000' : '#f1f1f5'
  try { tg.setHeaderColor(bg); tg.setBackgroundColor(bg) } catch { /* старые клиенты */ }
}

export const tapLight = () => { try { tg?.HapticFeedback.impactOccurred('light') } catch { /* */ } }
export const tapHeavy = () => { try { tg?.HapticFeedback.impactOccurred('heavy') } catch { /* */ } }
export const select = () => { try { tg?.HapticFeedback.selectionChanged() } catch { /* */ } }
export const success = () => { try { tg?.HapticFeedback.notificationOccurred('success') } catch { /* */ } }

export const userName = () => tg?.initDataUnsafe.user?.first_name || 'Алексей'
export const userId = (fallback: number) => tg?.initDataUnsafe.user?.id ?? fallback
export const userPhoto = () => tg?.initDataUnsafe.user?.photo_url || ''

export function openTg(url: string) {
  if (tg) tg.openTelegramLink(url)
  else window.open(url, '_blank')
}
