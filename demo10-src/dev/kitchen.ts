import { createKitchenScene, type KitchenConfig } from '../src/three/kitchen'
const base: KitchenConfig = { layout: 'straight', a: 3.2, b: 2.2, facade: { hex: '#d9cfc1', finish: 'matte' }, counter: { hex: '#efefec', kind: 'stone' }, uppers: true, handles: 'gola' }
createKitchenScene(document.getElementById('a')!, base)
createKitchenScene(document.getElementById('b')!, { ...base, layout: 'corner', facade: { hex: '#3c3f43', finish: 'matte' }, counter: { hex: '#b58a5a', kind: 'wood' } })
createKitchenScene(document.getElementById('c')!, { ...base, layout: 'u', a: 2.8, b: 2.4, facade: { hex: '#c9a57a', finish: 'wood' }, counter: { hex: '#2b2b2c', kind: 'dark' }, handles: 'bar' })
createKitchenScene(document.getElementById('d')!, { ...base, layout: 'island', a: 3.6, facade: { hex: '#9aa58f', finish: 'gloss' }, counter: { hex: '#a5a39e', kind: 'concrete' }, uppers: false })
;(window as any).__ready = true
