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

type BestandZustand = 'da' | 'knapp' | 'leer'

/** Der eine Zustand, den jeder sieht: leer (Menge 0), knapp oder im Lager. */
export function zustandVon(b: Bestand): BestandZustand {
  if (b.menge <= 0) return 'leer'
  return istKnapp(b) ? 'knapp' : 'da'
}

/* ------------------------------------------------------ Zustand, Sortierung */

/** Der Zustand in einem Wort: im Lager, nur noch X, leer.
 *  In der Suche heisst leer "gibt es nicht mehr". */
export function zustandText(
  b: Bestand,
  t: (k: string, v?: Record<string, string | number>) => string,
  suche = false,
): string {
  const z = zustandVon(b)
  if (z === 'da') return t('lager.z_da')
  if (z === 'knapp') return t('lager.z_knapp', { menge: mengeText(b.menge), einheit: b.einheit })
  return t(suche ? 'lager.z_weg' : 'lager.z_leer')
}

/** Rang fuer das Sortieren nach Zustand: leer zuerst, dann knapp, dann im Lager. */
export function zustandRang(b: Bestand): number {
  const z = zustandVon(b)
  return z === 'leer' ? 0 : z === 'knapp' ? 1 : 2
}

/* --------------------------------------------------- Faelligkeit (Unterwegs) */

type Uebersetzer = (key: string, vars?: Record<string, string | number>) => string

const TAG_MS = 86_400_000

function uhr(d: Date): string {
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

function mitternacht(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** Wann etwas zurueck sein soll, in einem kurzen Satz: "heute 18:00",
 *  "morgen 18:00", "Mi., 25.11. 18:00" oder "überfällig seit 2 Tagen".
 *  ueberfaellig sagt der Oberflaeche, ob sie es rot zeigen soll. */
export function faelligInfo(iso: string, t: Uebersetzer, jetzt: number = Date.now()): { text: string; ueberfaellig: boolean } {
  const d = new Date(iso)
  const ms = d.getTime()
  if (Number.isNaN(ms)) return { text: '', ueberfaellig: false }
  if (ms < jetzt) {
    const min = Math.floor((jetzt - ms) / 60_000)
    if (min < 60) return { text: t('lager.ueberf_gerade'), ueberfaellig: true }
    const std = Math.floor(min / 60)
    if (std < 24) return { text: t('lager.ueberf_std', { n: std }), ueberfaellig: true }
    const tage = Math.floor(std / 24)
    return { text: t(tage === 1 ? 'lager.ueberf_tage.eins' : 'lager.ueberf_tage.viele', { n: tage }), ueberfaellig: true }
  }
  const tageBis = Math.round((mitternacht(d) - mitternacht(new Date(jetzt))) / TAG_MS)
  if (tageBis === 0) return { text: t('lager.faellig_heute', { zeit: uhr(d) }), ueberfaellig: false }
  if (tageBis === 1) return { text: t('lager.faellig_morgen', { zeit: uhr(d) }), ueberfaellig: false }
  const tag = d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' })
  return { text: t('lager.faellig_am', { tag, zeit: uhr(d) }), ueberfaellig: false }
}
