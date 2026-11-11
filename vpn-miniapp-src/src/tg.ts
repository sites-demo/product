// Тонкая обёртка над Telegram WebApp: в обычном браузере всё молча работает без него.
type Haptic = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'
interface TgWebApp {
  initData: string
  initDataUnsafe: { user?: { first_name?: string; id?: number } }
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
  try { tg.setHeaderColor('#0a0a12'); tg.setBackgroundColor('#0a0a12') } catch { /* старые клиенты */ }
}

export const tapLight = () => { try { tg?.HapticFeedback.impactOccurred('light') } catch { /* */ } }
export const tapHeavy = () => { try { tg?.HapticFeedback.impactOccurred('heavy') } catch { /* */ } }
export const select = () => { try { tg?.HapticFeedback.selectionChanged() } catch { /* */ } }
export const success = () => { try { tg?.HapticFeedback.notificationOccurred('success') } catch { /* */ } }

export const userName = () => tg?.initDataUnsafe.user?.first_name || 'Алексей'

export function openTg(url: string) {
  if (tg) tg.openTelegramLink(url)
  else window.open(url, '_blank')
}
