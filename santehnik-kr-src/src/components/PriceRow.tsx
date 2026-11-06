import { useEffect, useId, useRef, useState } from 'react'
import { money, PIPE_RATE, TEL, viberDraft, type PriceItem } from '../data'
import { PhoneIcon } from './PhoneIcon'

const MIN_M = 1
const MAX_M = 40

// Сумма доезжает до нового значения за 180 мс. При reduced-motion меняется сразу.
function useRolling(target: number) {
  const [shown, setShown] = useState(target)
  const from = useRef(target)
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      from.current = target
      setShown(target)
      return
    }
    const start = from.current
    const t0 = performance.now()
    let raf = requestAnimationFrame(function tick(now) {
      const k = Math.min(1, (now - t0) / 180)
      const v = Math.round((start + (target - start) * (1 - (1 - k) ** 3)) / 10) * 10
      from.current = k === 1 ? target : v
      setShown(k === 1 ? target : v)
      if (k < 1) raf = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(raf)
  }, [target])
  return shown
}

function PipeCalc({ metres, onChange }: { metres: number; onChange: (m: number) => void }) {
  const id = useId()
  const total = useRolling(metres * PIPE_RATE)
  const clamp = (m: number) => Math.max(MIN_M, Math.min(MAX_M, m))
  const fill = `${((metres - MIN_M) / (MAX_M - MIN_M)) * 100}%`
  return (
    <div className="calc">
      <label htmlFor={id}>
        Сколько метров труб: <b>{metres}&nbsp;м</b>
      </label>
      <div className="calc-row">
        <button type="button" className="step" aria-label="На метр меньше" disabled={metres <= MIN_M} onClick={() => onChange(clamp(metres - 1))}>
          −
        </button>
        <input
          id={id}
          type="range"
          min={MIN_M}
          max={MAX_M}
          value={metres}
          aria-valuetext={`${metres} м`}
          style={{ '--fill': fill } as React.CSSProperties}
          onChange={(e) => onChange(+e.target.value)}
        />
        <button type="button" className="step" aria-label="На метр больше" disabled={metres >= MAX_M} onClick={() => onChange(clamp(metres + 1))}>
          +
        </button>
      </div>
      <p className="calc-sum" aria-hidden="true">
        от&nbsp;<span>{money(total)}</span>&nbsp;грн
      </p>
      <p className="sr" role="status">
        Ориентир от {money(metres * PIPE_RATE)} гривен
      </p>
      <p className="calc-note">Ориентир по цене от {PIPE_RATE} грн за метр. Точную сумму мастер назовёт до начала работ.</p>
    </div>
  )
}

export function PriceRow({ it, startOpen = false }: { it: PriceItem; startOpen?: boolean }) {
  const panel = useId()
  const [open, setOpen] = useState(startOpen)
  const [copied, setCopied] = useState(false)
  const [metres, setMetres] = useState(10)
  const what = it.calc ? `Нужно заменить примерно ${metres} м труб.` : it.m
  const text = `Здравствуйте. ${what} Адрес: `
  useEffect(() => setCopied(false), [text])
  return (
    <div className={'row' + (open ? ' open' : '')}>
      <button type="button" className="row-h" aria-expanded={open} aria-controls={panel} onClick={() => setOpen((v) => !v)}>
        <span className="row-tp">
          <span className="rt">{it.t}</span>
          <span className={'rp' + (it.p.startsWith('по') ? ' q' : '')}>{it.p}</span>
        </span>
        <i className="row-i" aria-hidden="true" />
      </button>
      <div className="rb-wrap" id={panel}>
        <div className="rb-clip">
          <div className="rb">
            <p>{it.d}</p>
            {it.calc && <PipeCalc metres={metres} onChange={setMetres} />}
            <div className="acts">
              <a className="btn btn-call sm" href={TEL}>
                <PhoneIcon />
                Позвонить
              </a>
              <a className="btn btn-ghost sm" href={viberDraft(text)}>
                Написать в Viber
              </a>
              <button
                type="button"
                className="link"
                onClick={() => {
                  navigator.clipboard?.writeText(text).then(
                    () => setCopied(true),
                    () => setCopied(false),
                  )
                }}
              >
                <span role="status">{copied ? 'Скопировано' : 'Скопировать текст'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
