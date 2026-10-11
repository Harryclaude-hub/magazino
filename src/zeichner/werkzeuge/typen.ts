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
import type { Oeffnung, Raum, SymbolArt } from '../../lib/types'
import type { Auswahl, Dok, Vorlage } from '../dok'
import type { Messpunkt } from '../messpunkte'

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
  | 'strom'

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
  /** Was das Werkzeug Strom setzt. */
  symbolArt?: SymbolArt
  /** Welches Element gerade zum Verschieben freigegeben ist (Rechtsklick,
   *  "Verschieben / Groesse aendern"), als sperrSchluessel. null: keines,
   *  Ziehen verschiebt dann nur die Ansicht. Fehlt es (undefined), ist alles
   *  frei (Pruefskripte). */
  entsperrt?: string | null
  /** Deko ist ausgeblendet und darum nicht anklickbar (E82). */
  ohneDeko?: boolean
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
  /** Beschriftungen in cm-Koordinaten (Laengen). lichte: "Lichte" steht
   *  davor (beide Enden derselben Oeffnung, E90). weg: die Zahl rueckt in
   *  diese Richtung ab statt nach oben (siehe textLage). */
  texte?: { p: Punkt; text: string; lichte?: boolean; weg?: Punkt }[]
  /** Nur beim Messen (E90): alle Messpunkte der Wohnung als kleine Marken,
   *  der unter dem Zeiger (an) hervorgehoben und mit Namen. von: Anfang
   *  einer halben Messung; der Name steht auf der abgewandten Seite. */
  messpunkte?: { alle: Messpunkt[]; an: Messpunkt | null; von?: Punkt | null }
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

/** Wo die Leinwand eine Beschriftung der Vorschau hinsetzt (cm, s
 *  Bildpunkte je cm, fs Schriftgroesse in cm). Ohne weg steht die
 *  Grundlinie 8 Bildpunkte ueber dem Punkt, waagrecht. Mit weg (Messung
 *  entlang der Innenseite einer Wand, Nacharbeit E93) steht die Mitte der
 *  Zahl 8 Bildpunkte und eine halbe Zeile in diese Richtung abgerueckt, in
 *  der Wand, und gedreht wie die Masse an jeder Wand (nie kopfueber): auf
 *  der Raumseite steht dort schon das Wandmass. mitte: Grundlinie in der
 *  Mitte der Schrift (dominantBaseline middle). */
export function textLage(x: { p: Punkt; weg?: Punkt }, s: number, fs: number): { p: Punkt; winkel: number; mitte: boolean } {
  if (!x.weg) return { p: [x.p[0], x.p[1] - 8 / s], winkel: 0, mitte: false }
  const v = 8 / s + fs * 0.4
  // Die Schrift laeuft quer zu weg, also entlang der Wand.
  let winkel = (Math.atan2(-x.weg[0], x.weg[1]) * 180) / Math.PI
  if (winkel > 90.5) winkel -= 180
  else if (winkel < -89.5) winkel += 180
  return { p: [x.p[0] + x.weg[0] * v, x.p[1] + x.weg[1] * v], winkel, mitte: true }
}
