import { FARB_TOKENS, type Farben3D } from './szene'

/** Die 3D-Farben aus den Tokens (src/index.css), bei Hell/Dunkel neu lesen. */
export function farbenLesen(): Farben3D {
  const stil = getComputedStyle(document.documentElement)
  const out = {} as Farben3D
  for (const [k, token] of Object.entries(FARB_TOKENS) as [keyof Farben3D, string][]) {
    out[k] = stil.getPropertyValue(token).trim() || '#888888'
  }
  return out
}
