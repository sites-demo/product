import { create } from 'zustand';

export type ItemType = 'sofa' | 'armchair' | 'chair' | 'mattress' | 'carpet';
export type Item = Record<string, any> & { type: ItemType };

const defaults: Record<ItemType, Item> = {
  sofa: { type: 'sofa', seats: 3, corner: false, arm: 'round', legs: 'wood', fabric: 'velour', color: 2, pillows: 2, stains: false, odor: false, fur: false },
  armchair: { type: 'armchair', arm: 'round', legs: 'wood', fabric: 'velour', color: 5, pillows: 0, stains: false, odor: false, fur: false },
  chair: { type: 'chair', count: 4, back: true, fabric: 'rogozhka', color: 3, stains: false, odor: false, fur: false },
  mattress: { type: 'mattress', size: '160', sides: 1, stains: false, odor: false, fur: false },
  carpet: { type: 'carpet', w: 2, l: 3, pile: 'short', color: 2, stains: false, odor: false, fur: false },
};

const hello: Record<ItemType, string> = {
  sofa: 'Привет! Я ваш диван. Соберите меня как дома, и я скажу цену',
  armchair: 'Кресло на связи! Какие у меня подлокотники?',
  chair: 'Нас тут целая компания. Сколько нас у вас?',
  mattress: 'Матрасу тоже нужен душ. Какой я ширины?',
  carpet: 'Я ковёр. Покрутите мой размер',
};

const onSet: Record<string, (v: any) => string | null> = {
  seats: (v) => (v === 4 ? 'Ого, четыре места! Есть где развалиться' : v === 2 ? 'Компактный и уютный' : 'Классика, три места'),
  corner: (v) => (v ? 'Угловой! Теперь я ещё и с лежанкой' : 'Прямой, без углов'),
  arm: (v) => (v === 'none' ? 'Без подлокотников, руки свободны' : 'Смотрите, какие подлокотники!'),
  legs: (v) => (v === 'plinth' ? 'Ножки спрятал' : 'Ножки на месте, топ-топ'),
  pillows: (v) => (v ? 'Подушки тоже почистим' : 'Без подушек так без подушек'),
  fabric: (v) => ({ velour: 'Велюр, мягкий как котик', rogozhka: 'Рогожка, крепкая ткань', micro: 'Микрофибра, нежная', leather: 'Экокожа, блестим' } as any)[v],
  color: () => 'Новый цвет мне идёт?',
  stains: (v) => (v ? 'Ой, пятна... Не страшно, ототрём' : 'Пятен нет, ура'),
  odor: (v) => (v ? 'Фу-фу. Запах тоже уберём' : 'Пахну свежестью'),
  fur: (v) => (v ? 'Шерсть соберём до волоска' : 'Без шерсти, отлично'),
  count: (v) => (v > 6 ? 'Ого, сколько нас!' : null),
  size: () => 'Запомнил размер',
  sides: (v) => (v === 2 ? 'С двух сторон, как новый' : null),
  pile: (v) => (v === 'long' ? 'Длинный ворс, пушистый' : 'Короткий ворс'),
  back: (v) => (v ? 'Мягкая спинка, удобно' : 'Жёсткая спинка'),
};

const onPick: Record<string, string> = {
  face: 'Хи-хи, щекотно!',
  hand: 'Дай пять!',
  arm: 'Это мои подлокотники',
  leg: 'Ножки чистить не надо, но спасибо',
  seat: 'Тут любит сидеть кот',
  pillow: 'Подушка! Мягкая',
  frame: 'Каркас крепкий',
  dirt: 'Вот это пятно и ототрём',
};

type State = {
  type: ItemType;
  items: Record<ItemType, Item>;
  cart: Item[];
  pulse: { tag: string; at: number };
  picked: { tag: string; at: number };
  line: { text: string; at: number };
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
  setType: (type) => set({ type, pulse: { tag: '', at: 0 }, line: { text: hello[type], at: Date.now() } }),
  set: (key, value) => {
    const { type, items } = get();
    const text = onSet[key]?.(value);
    set({
      items: { ...items, [type]: { ...items[type], [key]: value } },
      pulse: { tag: pulseTag[key] || 'all', at: performance.now() },
      ...(text ? { line: { text, at: Date.now() } } : {}),
    });
  },
  pick: (tag) => set({ pulse: { tag, at: performance.now() }, picked: { tag, at: Date.now() }, line: { text: onPick[tag] || onPick.frame, at: Date.now() } }),
  addToCart: () => {
    const { type, items, cart } = get();
    set({ cart: [...cart, { ...items[type] }], items: { ...items, [type]: { ...defaults[type] } }, line: { text: 'Записал! Кого почистим ещё?', at: Date.now() } });
  },
  removeFromCart: (i) => set({ cart: get().cart.filter((_, j) => j !== i) }),
  reset: () => set({ cart: [], items: structuredClone(defaults), type: 'sofa' }),
}));
