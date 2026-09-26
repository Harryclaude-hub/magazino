/* Farben, die als Daten gespeichert werden (Wandfarbe je Kante,
 * Bodenfarbe eines Raums). Sie stehen als Hex in der Datenbank, darum sind
 * sie keine CSS-Variablen. Alles, was die Oberflaeche selbst faerbt, steht
 * dagegen als Variable in index.css (--plan-*).
 *
 * Die acht Wandfarben haben gegen den hellen Boden (--plan-boden hell,
 * #e6dccb) mindestens 3:1 Kontrast. 2D zeichnet die Wand trotzdem immer in
 * --plan-wand und die Wandfarbe nur als Streifen innen, damit der Kontrast
 * auch im Dunkelmodus haelt.
 */

export interface DatenFarbe {
  /** Schluessel fuer den Namen im Woerterbuch (plan.farbe.<schluessel>). */
  schluessel: string
  hex: string
}

export const WANDFARBEN: DatenFarbe[] = [
  { schluessel: 'anthrazit', hex: '#3f3931' },
  { schluessel: 'schiefer', hex: '#4a5560' },
  { schluessel: 'taubenblau', hex: '#3e5f7a' },
  { schluessel: 'salbei', hex: '#4f6b4a' },
  { schluessel: 'terrakotta', hex: '#8a4a32' },
  { schluessel: 'ocker', hex: '#7a5a1e' },
  { schluessel: 'aubergine', hex: '#5b3f5e' },
  { schluessel: 'petrol', hex: '#1f5f63' },
]

export const BODENFARBEN: DatenFarbe[] = [
  { schluessel: 'eiche_hell', hex: '#e2cfa8' },
  { schluessel: 'eiche_dunkel', hex: '#b08a5a' },
  { schluessel: 'fliese_grau', hex: '#c9c6bf' },
  { schluessel: 'beton', hex: '#a9a49a' },
]

/** Farben fuer Moebel, Regale und Schraenke (gedaempft, damit Kisten
 *  darauf lesbar bleiben). null heisst: --plan-objekt. */
export const OBJEKTFARBEN: DatenFarbe[] = [
  { schluessel: 'sand', hex: '#cbbfa9' },
  { schluessel: 'holz', hex: '#b08a5a' },
  { schluessel: 'salbei', hex: '#9aa88a' },
  { schluessel: 'taubenblau', hex: '#8fa0b3' },
  { schluessel: 'terrakotta', hex: '#b88a74' },
  { schluessel: 'grau', hex: '#a39e95' },
  { schluessel: 'anthrazit', hex: '#4b4f55' },
  { schluessel: 'hellgrau', hex: '#b9b8b3' },
  { schluessel: 'beige', hex: '#cdbfa5' },
  { schluessel: 'cognac', hex: '#94592f' },
  { schluessel: 'waldgruen', hex: '#445c48' },
  { schluessel: 'nachtblau', hex: '#34435c' },
  { schluessel: 'senf', hex: '#c09a3e' },
  { schluessel: 'altrosa', hex: '#c7a19c' },
  { schluessel: 'weiss', hex: '#eeede9' },
  { schluessel: 'schwarz', hex: '#2a2b2e' },
]

/** Der Boden, gegen den Wandfarben geprueft werden (--plan-boden hell). */
export const BODEN_STANDARD = '#e6dccb'

function kanal(c: number): number {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

function helligkeit(hex: string): number | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = Number.parseInt(m[1], 16)
  return 0.2126 * kanal((n >> 16) & 255) + 0.7152 * kanal((n >> 8) & 255) + 0.0722 * kanal(n & 255)
}

/** Kontrast zweier Farben nach WCAG (1 bis 21). null bei ungueltiger Farbe. */
export function kontrast(a: string, b: string): number | null {
  const la = helligkeit(a)
  const lb = helligkeit(b)
  if (la === null || lb === null) return null
  const [hell, dunkel] = la > lb ? [la, lb] : [lb, la]
  return (hell + 0.05) / (dunkel + 0.05)
}
