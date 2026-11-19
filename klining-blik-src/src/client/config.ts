import { create } from 'zustand';
import { AREA } from '../lib/store';

export type ItemType = 'flat';
export type Item = Record<string, any> & { type: ItemType };
export type Kind = 'support' | 'general' | 'remont';

const defaults: Item = {
  type: 'flat', kind: 'general', rooms: 2, area: AREA[2], baths: 1, windows: 0, balcony: false, iron: 0,
  oven: false, fridge: false, micro: false, hood: false, cabinets: false, pets: false,
};

const hello: Record<Kind, string> = {
  support: 'Привет! Я Блик. Пыль, полы, кухня и ванная, быстро и аккуратно',
  general: 'Привет! Я Блик. Покажите, где у вас живёт пыль',
  remont: 'Ремонт закончили? Строительную пыль беру на себя',
};

const onSet: Record<string, (v: any) => string | null> = {
  kind: (v) => hello[v as Kind],
  rooms: (v) => (v === 0 ? 'Студия, уютно и всё рядом' : v >= 3 ? 'Большая квартира, возьму помощницу' : 'Две комнаты, справлюсь за день'),
  baths: (v) => (v > 1 ? 'Два санузла, оба отмою до блеска' : 'Один санузел'),
  windows: (v) => (v === 1 ? 'Окна будут прозрачные, как воздух' : null),
  balcony: (v) => (v ? 'Балкон тоже наш, и стёкла помою' : 'Без балкона'),
  oven: (v) => (v ? 'Духовку отмою изнутри' : null),
  fridge: (v) => (v ? 'Холодильник помою внутри, полки тоже' : null),
  micro: (v) => (v ? 'Микроволновка заблестит' : null),
  hood: (v) => (v ? 'Вытяжку отмою от жира' : null),
  cabinets: (v) => (v ? 'Шкафчики разберём и протрём' : null),
  iron: (v) => (v === 1 ? 'Поглажу бельё, пока сохнут полы' : null),
  pets: (v) => (v ? 'Шерсть соберу, даже с дивана' : null),
};

const onPick: Record<string, string> = {
  face: 'Хи-хи, щекотно!',
  hand: 'Дай пять!',
  bottle: 'Пшик! Я Блик, ваш помощник',
  living: 'Гостиная. Пыль, полы, диван',
  bed: 'Спальня. Под кроватью тоже протру',
  kids: 'Детская. Игрушки сложу по местам',
  kitchen: 'Кухня! Духовку тоже отмыть?',
  bath: 'Ванную отмою до блеска',
  wc: 'Второй санузел, принято',
  hall: 'Прихожая. Обувь и зеркало протру',
  balcony: 'Балкон! Помою и стёкла',
};

const room: Record<string, string> = {
  baths: 'bath', windows: 'living', balcony: 'balcony', oven: 'kitchen', fridge: 'kitchen', micro: 'kitchen',
  hood: 'kitchen', cabinets: 'kitchen', iron: 'bed', pets: 'living',
};

type State = {
  type: ItemType;
  items: Record<ItemType, Item>;
  cart: Item[];
  pulse: { tag: string; at: number };
  picked: { tag: string; at: number };
  goto: { room: string; at: number };
  line: { text: string; at: number };
  before: boolean;
  setBefore: (v: boolean) => void;
  setType: (t: ItemType) => void;
  set: (key: string, value: any) => void;
  pick: (tag: string) => void;
  addToCart: () => void;
  removeFromCart: (i: number) => void;
  reset: () => void;
};

export const useConfig = create<State>((set, get) => ({
  type: 'flat',
  items: { flat: { ...defaults } },
  cart: [],
  pulse: { tag: '', at: 0 },
  picked: { tag: '', at: 0 },
  goto: { room: 'living', at: 0 },
  line: { text: hello.general, at: Date.now() },
  before: false,
  setBefore: (before) => set({ before, line: { text: before ? 'Так сейчас. Пыль, пятна, всё не на месте' : 'А так будет после меня!', at: Date.now() } }),
  setType: () => {},
  set: (key, value) => {
    const { items } = get();
    const text = onSet[key]?.(value);
    const patch: Item = { ...items.flat, [key]: value };
    if (key === 'rooms') patch.area = AREA[value];
    set({
      before: false,
      items: { flat: patch },
      pulse: { tag: key, at: performance.now() },
      ...(room[key] ? { goto: { room: room[key], at: Date.now() } } : {}),
      ...(text ? { line: { text, at: Date.now() } } : {}),
    });
  },
  pick: (tag) => set({
    pulse: { tag, at: performance.now() },
    picked: { tag, at: Date.now() },
    ...(onPick[tag] && !['face', 'hand', 'bottle'].includes(tag) ? { goto: { room: tag, at: Date.now() } } : {}),
    line: { text: onPick[tag] || onPick.bottle, at: Date.now() },
  }),
  addToCart: () => {},
  removeFromCart: () => {},
  reset: () => set({ cart: [], items: { flat: { ...defaults } }, before: false }),
}));
