import { createRoot } from 'react-dom/client'
import { SIDE_BODY, SIDE_PANELS, SIDE_GLASS, SIDE_LIGHTS, SIDE_HANDLES, SIDE_MIRROR, WHEELS, TOP_BODY, TOP_PANELS, TOP_GLASS, TOP_LIGHTS, TOP_MIRRORS } from '../src/ui/car2d'
const C = ['#e57373','#64b5f6','#81c784','#ffd54f','#ba68c8','#4db6ac','#ff8a65','#90a4ae']
function Side() {
  return <svg viewBox="-10 -10 450 170" width="1100">
    <defs><clipPath id="c"><path d={SIDE_BODY} /></clipPath></defs>
    <path d={SIDE_BODY} fill="#a9afb6" />
    {SIDE_PANELS.map((p, i) => <path key={i} d={p.d} fill={C[i]} stroke="#222" clipPath="url(#c)" opacity=".85" />)}
    {SIDE_GLASS.map(d => <path key={d} d={d} fill="#a9b8c6" stroke="#222" />)}
    {SIDE_LIGHTS.map(d => <path key={d} d={d} fill="#fff" stroke="#222" />)}
    {SIDE_HANDLES.map(d => <path key={d} d={d} fill="#222" />)}
    <path d={SIDE_MIRROR} fill="#555" stroke="#222" />
    <path d={SIDE_BODY} fill="none" stroke="#000" />
    {WHEELS.map(x => <circle key={x} cx={x} cy={120} r={28} fill="#222" />)}
  </svg>
}
function Top() {
  return <svg viewBox="-20 -10 210 450" width="420">
    <defs><clipPath id="t"><path d={TOP_BODY} /></clipPath></defs>
    {TOP_PANELS.map((p, i) => <path key={i} d={p.d} fill={C[i % 8]} stroke="#222" clipPath="url(#t)" opacity=".85" />)}
    {TOP_GLASS.map(d => <path key={d} d={d} fill="#a9b8c6" stroke="#222" />)}
    {TOP_LIGHTS.map(d => <path key={d} d={d} fill="#fff" stroke="#222" />)}
    {TOP_MIRRORS.map(p => <path key={p.id} d={p.d} fill="#555" />)}
    <path d={TOP_BODY} fill="none" stroke="#000" />
  </svg>
}
createRoot(document.getElementById('root')!).render(<><Side /><Top /></>)
