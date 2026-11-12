// Данные кабинета. Подписка, ключ, устройства и рефералы приходят из панели VPN и платёжки.
export const BRAND = 'MY VPN'
export const BOT = 'My_v_p_n_robot'
export const SUPPORT = 'SeeTheLight11'
export const CHANNEL = 'my_v_p_n_channel'
export const USER_ID = 8843609293
export const SUB_URL = 'https://t.me/My_v_p_n_robot?start=key_7f3a9c51e2b4'
export const DEVICES_MAX = 3

export interface Server { code: string; name: string; city: string; ping: number; load: number }
export const SERVERS: Server[] = [
  { code: 'NL', name: 'Нидерланды', city: 'Амстердам', ping: 38, load: 41 },
  { code: 'FI', name: 'Финляндия', city: 'Хельсинки', ping: 29, load: 63 },
  { code: 'DE', name: 'Германия', city: 'Франкфурт', ping: 44, load: 37 },
  { code: 'KZ', name: 'Казахстан', city: 'Алматы', ping: 61, load: 22 },
  { code: 'US', name: 'США', city: 'Нью-Йорк', ping: 132, load: 18 },
]

export interface Plan { months: number; title: string; price: number }
export const PLANS: Plan[] = [
  { months: 1, title: '1 месяц', price: 135 },
  { months: 3, title: '3 месяца', price: 375 },
  { months: 6, title: '6 месяцев', price: 660 },
  { months: 12, title: '1 год', price: 1200 },
]

export type Os = 'ios' | 'android' | 'win' | 'mac'
export const OS_LIST: { id: Os; label: string }[] = [
  { id: 'ios', label: 'iPhone' }, { id: 'android', label: 'Android' }, { id: 'win', label: 'Windows' }, { id: 'mac', label: 'Mac' },
]
export const GUIDES: Record<Os, { app: string; store: string; steps: string[] }> = {
  ios: { app: 'Happ', store: 'App Store', steps: ['Установите Happ из App Store', 'Нажмите «Добавить ключ», он подставится сам', 'Включите VPN и разрешите конфигурацию'] },
  android: { app: 'Happ', store: 'Google Play', steps: ['Установите Happ или v2RayTun из Google Play', 'Нажмите «Добавить ключ», он подставится сам', 'Нажмите кнопку подключения в приложении'] },
  win: { app: 'Hiddify', store: 'сайта Hiddify', steps: ['Скачайте Hiddify для Windows', 'Скопируйте ключ на главной', 'В Hiddify выберите «Добавить из буфера обмена»'] },
  mac: { app: 'Happ', store: 'App Store', steps: ['Установите Happ из App Store', 'Нажмите «Добавить ключ», он подставится сам', 'Включите VPN в Happ'] },
}

export const REF = { percent: 30, minWithdraw: 500, balance: 243, invited: 7, paid: 4 }

// Пробный период: у MY VPN его пока нет, это предложение для запуска
export const TRIAL = { price: 1, days: 3 }
