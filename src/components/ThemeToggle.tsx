import { useEffect } from 'react'
import { Monitor, Moon, Palette, Sun } from 'lucide-react'
import { useLocalState } from '../lib/util'
import { useT } from '../lib/i18n'

/* Neben System, Hell und Dunkel fuenf Designs (E76). Ihre Farben stehen in
 * src/design/themen.css; fehlt die Datei, sehen sie aus wie Hell oder
 * Dunkel. Die Schnellwahl in der Kopfzeile wechselt nur zwischen den
 * ersten dreien, alle stehen im Profil. */
export type Mode = 'system' | 'light' | 'dark' | 'kontrast' | 'salbei' | 'ozean' | 'nacht' | 'graphit'
export const ALLE_DESIGNS: Mode[] = ['system', 'light', 'dark', 'kontrast', 'salbei', 'ozean', 'nacht', 'graphit']
/** Diese Designs sind dunkel: sie bekommen die Klasse dark dazu. */
export const DUNKLE_DESIGNS = new Set<Mode>(['dark', 'nacht', 'graphit'])
const ORDER: Mode[] = ['system', 'light', 'dark']
const ICON: Record<Mode, typeof Sun> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
  kontrast: Palette,
  salbei: Palette,
  ozean: Palette,
  nacht: Palette,
  graphit: Palette,
}

/* Nicht der fertige Name, sondern der Schluessel dazu. Den Namen holt sich
 * jede Stelle selbst, damit er beim Sprachwechsel neu gerendert wird. */
export const MODE_KEY: Record<Mode, string> = {
  system: 'einstellungen.theme_system',
  light: 'einstellungen.theme_hell',
  dark: 'einstellungen.theme_dunkel',
  kontrast: 'einstellungen.theme_kontrast',
  salbei: 'einstellungen.theme_salbei',
  ozean: 'einstellungen.theme_ozean',
  nacht: 'einstellungen.theme_nacht',
  graphit: 'einstellungen.theme_graphit',
}

export function applyTheme(mode: Mode) {
  const bekannt = ALLE_DESIGNS.includes(mode) ? mode : 'system'
  const dark =
    DUNKLE_DESIGNS.has(bekannt) ||
    (bekannt === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const html = document.documentElement
  html.classList.toggle('dark', dark)
  if (bekannt === 'system' || bekannt === 'light' || bekannt === 'dark') delete html.dataset.theme
  else html.dataset.theme = bekannt
  const meta = document.querySelector('meta[name="theme-color"]')
  // Die Farbe der Browserleiste folgt dem Grund des Designs.
  const grund = getComputedStyle(html).getPropertyValue('--paper').trim()
  if (meta) meta.setAttribute('content', grund || (dark ? '#0b0b0c' : '#ffffff'))
}

export function useTheme() {
  const [mode, setMode] = useLocalState<Mode>('kistly.theme', 'system')
  useEffect(() => {
    applyTheme(mode)
    if (mode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [mode])
  return { mode, setMode }
}

export function ThemeToggle({ withLabel = false }: { withLabel?: boolean }) {
  const { mode, setMode } = useTheme()
  const t = useT()
  const Icon = ICON[mode] ?? Monitor
  // Aus einem der weiteren Designs geht die Schnellwahl zurueck auf System.
  const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length]
  const name = t(MODE_KEY[mode])
  return (
    <button
      type="button"
      onClick={() => setMode(next)}
      title={t('einstellungen.theme_titel', { wert: name })}
      aria-label={t('kopf.darstellung', { wert: name })}
      className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-ink hover:bg-raised"
    >
      <Icon size={18} />
      {withLabel ? name : null}
    </button>
  )
}
