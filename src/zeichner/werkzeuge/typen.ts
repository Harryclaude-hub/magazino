/* Gemeinsame Form aller Werkzeuge des Zeichners.
 *
 * Ein Werkzeug ist ein reines Objekt ohne JSX und ohne Browser: es bekommt
 * den Zeiger in cm und die gedrueckten Tasten und gibt seinen neuen Zustand
 * und Aktionen zurueck. Was es gerade zeigen will (Geist, Hilfslinien,
 * Masse), beschreibt vorschau(). Die Leinwand zeichnet das, der Zeichner
 * fuehrt die Aktionen aus. So laesst sich jedes Werkzeug in Node pruefen
 * (scripts/zeichner-pruefen.mjs).
 *
 * Tasten kommen als event.code (Lage auf der Tastatur, gleich auf einer
 * arabischen Tastatur) und event.key (das getippte Zeichen, fuer Zahlen).
 */
import type { ObjektForm, Punkt } from '../../lib/geometrie.ts'
import type { Oeffnung, Raum } from '../../lib/types'
import type { Auswahl, Dok, Vorlage } from '../dok'

export type WerkzeugName =
  | 'auswahl'
  | 'raum'
  | 'teilen'
  | 'nische'
  | 'tuer'
  | 'fenster'
  | 'moebel'
  | 'regal'
  | 'schrank'
  | 'kiste'
  | 'messen'
  | 'linie'

/** Die Kiste, die "Kiste setzen" gerade in der Hand hat. */
export interface KisteInHand {
  id: string
  code: string
  laenge_cm: number
  breite_cm: number
  hoehe_cm: number
}

export interface Kontext {
  dok: Dok
  /** Einrasten auf 1, 5 oder 10 cm. */
  raster: number
  /** Winkel auf 90 Grad fangen (mit Umschalt frei). */
  winkel: boolean
  /** Pixel je cm: daraus die Fangweite in cm. */
  massstab: number
  auswahl: Auswahl
  neueId: () => string
  vorlage: Vorlage | null
  kiste: KisteInHand | null
}

export interface Zeiger {
  /** Position in cm, ungerundet. */
  p: Punkt
  /** Umschalt gedrueckt: Winkel frei. */
  frei: boolean
}

export type Aktion =
  | { typ: 'aendern'; dok: Dok; auswahl?: Auswahl }
  | { typ: 'waehlen'; auswahl: Auswahl }
  | { typ: 'hinweis'; schluessel: string; werte?: Record<string, string | number> }
  | { typ: 'loeschen_fragen'; raumId: string; codes: string[] }
  | { typ: 'unterlage_waehlen'; raumId: string; x: number; y: number; drehung: 0 | 90 }
  | { typ: 'werkzeug'; name: WerkzeugName }

export interface Vorschau {
  /** Entwurf, der statt des Dokuments gezeichnet wird (beim Ziehen). */
  dok?: Dok
  linien?: { a: Punkt; b: Punkt; art: 'hilfe' | 'geist' | 'falsch' | 'mass' }[]
  flaechen?: { punkte: Punkt[]; art: 'geist' | 'falsch' }[]
  oeffnung?: { raum: Pick<Raum, 'punkte'>; o: Oeffnung; ok: boolean }
  objekt?: { o: ObjektForm; ok: boolean }
  kiste?: { x: number; y: number; ex: number; ey: number; ok: boolean }
  /** Fangpunkte (Ecke gefangen: Ring). */
  punkte?: Punkt[]
  /** Beschriftungen in cm-Koordinaten (Laengen). */
  texte?: { p: Punkt; text: string }[]
  /** Was gerade getippt wird (steht in der Statusleiste). */
  eingabe?: string
}

export interface Schritt<S> {
  s: S
  aktionen?: Aktion[]
}

export interface Werkzeug<S> {
  name: WerkzeugName
  start(): S
  runter(k: Kontext, z: Zeiger, s: S): Schritt<S>
  bewegen(k: Kontext, z: Zeiger, s: S): Schritt<S>
  hoch(k: Kontext, z: Zeiger, s: S): Schritt<S>
  doppel?(k: Kontext, z: Zeiger, s: S): Schritt<S>
  /** null heisst: nicht behandelt, der Zeichner darf die Taste nehmen. */
  taste(k: Kontext, code: string, key: string, frei: boolean, s: S): Schritt<S> | null
  /** Esc: true, wenn es etwas abzubrechen gab. */
  abbrechen(s: S): { s: S; etwas: boolean }
  vorschau(k: Kontext, s: S): Vorschau
}

/** Zeichen, die in eine Laengen-Eingabe gehoeren ("3,45", "3 m 45", "345 cm"). */
export function istLaengenZeichen(key: string): boolean {
  return key.length === 1 && /[0-9٠-٩۰-۹.,٫،mcمس ]/.test(key)
}

/** Laenge als Text fuer Masse im Plan: "345". */
export function cmZahl(v: number): string {
  return String(Math.round(v))
}
