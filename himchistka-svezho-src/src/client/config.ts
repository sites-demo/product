import { create } from 'zustand';

export type ItemType = 'sofa' | 'armchair' | 'chair' | 'mattress' | 'carpet';
export type Item = Record<string, any> & { type: ItemType };

const defaults: Record<ItemType, Item> = {
  sofa: { type: 'sofa', seats: 3, corner: false, arm: 'round', legs: 'wood', fabric: 'velour', color: 4, pillows: 2, stains: false, odor: false, fur: false },
  armchair: { type: 'armchair', arm: 'round', legs: 'wood', fabric: 'velour', color: 2, pillows: 0, stains: false, odor: false, fur: false },
  chair: { type: 'chair', count: 4, back: true, fabric: 'rogozhka', color: 3, stains: false, odor: false, fur: false },
  mattress: { type: 'mattress', size: '160', sides: 1, stains: false, odor: false, fur: false },
  carpet: { type: 'carpet', w: 2, l: 3, pile: 'short', color: 2, stains: false, odor: false, fur: false },
};

type State = {
  type: ItemType;
  items: Record<ItemType, Item>;
  cart: Item[];
  pulse: { tag: string; at: number };
  picked: { tag: string; at: number };
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
  setType: (type) => set({ type, pulse: { tag: '', at: 0 } }),
  set: (key, value) => {
    const { type, items } = get();
    set({
      items: { ...items, [type]: { ...items[type], [key]: value } },
      pulse: { tag: pulseTag[key] || 'all', at: performance.now() },
    });
  },
  pick: (tag) => set({ pulse: { tag, at: performance.now() }, picked: { tag, at: Date.now() } }),
  addToCart: () => {
    const { type, items, cart } = get();
    set({ cart: [...cart, { ...items[type] }], items: { ...items, [type]: { ...defaults[type] } } });
  },
  removeFromCart: (i) => set({ cart: get().cart.filter((_, j) => j !== i) }),
  reset: () => set({ cart: [], items: structuredClone(defaults), type: 'sofa' }),
}));
