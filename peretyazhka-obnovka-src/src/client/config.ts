import { create } from 'zustand';

export type ItemType = 'sofa' | 'armchair' | 'chair' | 'mattress' | 'carpet';
export type Item = Record<string, any> & { type: ItemType };

const defaults: Record<ItemType, Item> = {
  sofa: { type: 'sofa', seats: 3, corner: false, arm: 'round', legs: 'wood', fabric: 'velour', color: 2, pillows: 2, foam: false, springs: false, frame: false },
  armchair: { type: 'armchair', arm: 'round', legs: 'wood', fabric: 'velour', color: 5, pillows: 0, foam: false, springs: false, frame: false },
  chair: { type: 'chair', count: 4, back: true, fabric: 'rogozhka', color: 3, foam: false, springs: false, frame: false },
  mattress: { type: 'mattress', size: '160', sides: 1 },
  carpet: { type: 'carpet', w: 2, l: 3, pile: 'short', color: 2 },
};

const hello: Record<ItemType, string> = {
  sofa: 'Привет! Я ваш диван. Устал от старой обивки, подберите мне новую',
  armchair: 'Кресло на связи! Хочу новый наряд',
  chair: 'Нас тут целая компания. Сколько нас перетянуть?',
  mattress: '',
  carpet: '',
};

const onSet: Record<string, (v: any) => string | null> = {
  seats: (v) => (v === 4 ? 'Ого, четыре места! Ткани уйдёт побольше' : v === 2 ? 'Компактный и уютный' : 'Классика, три места'),
  corner: (v) => (v ? 'Угловой! Ещё и с лежанкой' : 'Прямой, без углов'),
  arm: (v) => (v === 'none' ? 'Без подлокотников, руки свободны' : 'Подлокотники тоже обтянем'),
  legs: (v) => (v === 'plinth' ? 'Ножки спрятал' : 'Ножки на месте, топ-топ'),
  pillows: (v) => (v ? 'Подушки сошьём в тон' : 'Без подушек так без подушек'),
  fabric: (v) => ({ velour: 'Велюр, мягкий как котик', rogozhka: 'Рогожка, не боится когтей', micro: 'Микрофибра, нежная и тёплая', leather: 'Экокожа, легко протирать', own: 'Своя ткань? Сошьём из неё' } as any)[v],
  color: () => 'Мне идёт этот цвет?',
  foam: (v) => (v ? 'Новый поролон, буду упругим' : 'Поролон ещё держится'),
  springs: (v) => (v ? 'Пружины больше не скрипят' : null),
  frame: (v) => (v ? 'Каркас подтянем, не шатаюсь' : null),
  count: (v) => (v > 6 ? 'Ого, сколько нас!' : null),
  back: (v) => (v ? 'Мягкая спинка, удобно' : 'Жёсткая спинка'),
};

const onPick: Record<string, string> = {
  face: 'Хи-хи, щекотно!',
  hand: 'Дай пять!',
  arm: 'Это мои подлокотники',
  leg: 'Ножки оставим как есть',
  seat: 'Сюда пойдёт новый поролон',
  pillow: 'Подушка! Сошьём в тон',
  frame: 'Каркас крепкий',
  dirt: 'Это старая обивка, её снимем',
};

type State = {
  type: ItemType;
  items: Record<ItemType, Item>;
  cart: Item[];
  pulse: { tag: string; at: number };
  picked: { tag: string; at: number };
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

const pulseTag: Record<string, string> = {
  arm: 'arm', back: 'arm', legs: 'leg', seats: 'seat', corner: 'seat', pillows: 'pillow',
};

export const useConfig = create<State>((set, get) => ({
  type: 'sofa',
  items: structuredClone(defaults),
  cart: [],
  pulse: { tag: '', at: 0 },
  picked: { tag: '', at: 0 },
  line: { text: hello.sofa, at: Date.now() },
  before: false,
  setBefore: (before) => set({ before, line: { text: before ? 'Вот я сейчас. Потёртый и грустный' : 'А вот я после перетяжки!', at: Date.now() } }),
  setType: (type) => set({ before: false, type, pulse: { tag: '', at: 0 }, line: { text: hello[type], at: Date.now() } }),
  set: (key, value) => {
    const { type, items } = get();
    const text = onSet[key]?.(value);
    set({
      before: false,
      items: { ...items, [type]: { ...items[type], [key]: value } },
      pulse: { tag: pulseTag[key] || 'all', at: performance.now() },
      ...(text ? { line: { text, at: Date.now() } } : {}),
    });
  },
  pick: (tag) => set({ pulse: { tag, at: performance.now() }, picked: { tag, at: Date.now() }, line: { text: onPick[tag] || onPick.frame, at: Date.now() } }),
  addToCart: () => {
    const { type, items, cart } = get();
    set({ cart: [...cart, { ...items[type] }], items: { ...items, [type]: { ...defaults[type] } }, line: { text: 'Записал! Кого ещё перетянем?', at: Date.now() } });
  },
  removeFromCart: (i) => set({ cart: get().cart.filter((_, j) => j !== i) }),
  reset: () => set({ cart: [], items: structuredClone(defaults), type: 'sofa', before: false }),
}));
