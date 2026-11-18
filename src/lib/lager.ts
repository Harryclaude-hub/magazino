import type { Bestand } from './types'

/* Kleine Helfer fuer die Lager-Seiten (E103), ohne Netz und ohne React. */

/** "1,5" und "1.5" sind beide gueltig. Alles andere gibt NaN. */
export function zahl(s: string): number {
  const v = s.trim().replace(',', '.')
  return v === '' ? NaN : Number(v)
}

/** Menge ohne Rechenreste: 0.1 + 0.2 wird als 0.3 gezeigt. */
export function mengeText(n: number): string {
  return String(Number(n.toFixed(3)))
}

/** Knapp: die Datenbank hat es gemerkt (knapp_seit) oder die Menge liegt
 *  bei oder unter der Mindestmenge. Mindestmenge 0 heisst: keine Warnung. */
export function istKnapp(b: Bestand): boolean {
  return b.knapp_seit !== null || (b.mindestmenge > 0 && b.menge <= b.mindestmenge)
}
