import type { CSSProperties, ReactNode } from 'react'
import type { FontName, Site } from '../types'

const FAMILY: Record<FontName, string> = {
  manrope: "'Manrope'", onest: "'Onest'", golos: "'Golos Text'", lora: "'Lora'", cormorant: "'Cormorant Garamond'", oswald: "'Oswald'",
}
const fallback = (f: FontName) => (f === 'lora' || f === 'cormorant' ? 'Georgia, serif' : 'system-ui, -apple-system, Roboto, sans-serif')

export function themeVars(site: Site): CSSProperties {
  const t = site.theme
  return {
    '--bg': t.bg, '--surface': t.surface, '--ink': t.ink, '--muted': t.muted, '--line': t.line,
    '--accent': t.accent, '--on-accent': t.onAccent, '--stage': t.stage ?? t.surface,
    '--hf': `${FAMILY[t.heading]}, ${fallback(t.heading)}`,
    '--bf': `${FAMILY[t.body]}, ${fallback(t.body)}`,
    '--hw': String(t.headingWeight ?? 760),
  } as CSSProperties
}

export function Shell({ site, children }: { site: Site; children: ReactNode }) {
  return <div className={site.theme.dark ? 'site dark' : 'site'} style={themeVars(site)}>{children}</div>
}
