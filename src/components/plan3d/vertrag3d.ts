/* Gemeinsame Formen fuer Begehen, Figuren und Mitspieler (E82).
 *
 * Der Motor (motor.ts), die Figuren (avatar3d.ts) und die Verbindung zu
 * den anderen Leuten im Umzug (lib/anwesenheit.ts) sprechen ueber diese
 * Typen miteinander. Nur Typen, kein Code, damit jede Seite fuer sich
 * gebaut und geprueft werden kann. */
import type { Object3D } from 'three'

/** Wie jemand gerade ist: steht (und geht), sitzt oder liegt. */
export type Haltung = 'stehen' | 'sitz' | 'liegen'

/** Stellung einer Person in der Wohnung. x und z in Metern (Welt, z ist
 *  der Plan-y), y die Augenhoehe ueber dem Boden in Metern. gier ist die
 *  Blickrichtung um die Hochachse (0 = Blick nach -z, wie die Kamera),
 *  neigung hoch und runter (positiv = nach oben). tempo: 0 steht, 1 geht
 *  normal, 2 rennt; fuer die Beinbewegung der Figur. */
export interface Pose3D {
  x: number
  y: number
  z: number
  gier: number
  neigung: number
  haltung: Haltung
  tempo: number
}

/** Eine Figur in der Szene. Ursprung der gruppe: zwischen den Fuessen
 *  (stehend) auf dem Boden, Gesicht nach -z bei rotation.y = 0. Der Motor
 *  setzt Lage und Drehung, die Figur bewegt nur ihre Glieder. */
export interface Figur3D {
  gruppe: Object3D
  /** Glieder setzen: Haltung, Gehtempo (0..2) und Zeit in Sekunden fuer
   *  das Schwingen der Beine. */
  pose(haltung: Haltung, tempo: number, zeit: number): void
  /** Augenhoehe ueber dem Ursprung in dieser Haltung (Meter). Der Motor
   *  setzt die Figur nach der festen Kamerahoehe der Haltung (Fuesse auf
   *  den Boden), nicht nach diesem Wert; er dient Namensschild und Tests. */
  auge(haltung: Haltung): number
  dispose(): void
}

/* ------------------------------------------------------------ E83: Siedlung */

/** Ein Rechteck, das beim Begehen aufhaelt (Welt, Meter): Mitte, Laenge
 *  entlang x vor der Drehung, Tiefe entlang z, Drehung um die Hochachse. */
export interface Hindernis3D {
  x: number
  z: number
  laenge: number
  tiefe: number
  drehY: number
}

/** Eine begehbare Ebene ausserhalb der eigenen Wohnung: ein Geschoss im
 *  Haus (Gang, Stiegenhaus, Aufzug) oder das Gelaende draussen. y ist die
 *  Bodenhoehe in Metern (die Wohnung liegt immer bei 0). Auf Ebene 0 gelten
 *  zusaetzlich die Hindernisse der Wohnung selbst. */
export interface Ebene3D {
  id: string
  /** Fuer Knoepfe und Ansagen, etwa 'EG', '1', '2', 'Garten'. */
  name: string
  y: number
  hindernisse: Hindernis3D[]
}

/** Antippbare Dinge ausserhalb der Szene der Wohnung (Aufzugknoepfe,
 *  Haustueren der Siedlung). Der Motor prueft sie beim Antippen zuerst. */
export interface Interaktiv3D {
  objekte: Object3D[]
  tippen(o: Object3D): void
}

/** Was eine Aussenwelt (aussen3d.ts oder siedlung3d.ts) an Raum3D gibt. */
export interface Welt3D {
  gruppe: Object3D
  nebel: import('three').Fog | null
  himmel: string | null
  /** Begehbare Ebenen (Siedlung: Geschosse und Gelaende), sonst leer. */
  ebenen: Ebene3D[]
  /** Aufzugknoepfe und Aehnliches, sonst null. */
  interaktiv: Interaktiv3D | null
  /** Wohnungen und Orte zum Hinspringen (E84), sonst leer oder fehlt. */
  sprungziele?: Sprungziel3D[]
  /** Fuer die Minikarte (E86): Umrisse in Weltmetern (x, z), sonst fehlt. */
  karte?: Karte3D
  /** Jedes Bild (beim Begehen): Aufzugtueren, Kabine. true = es bewegt sich noch. */
  schritt?(dt: number, kameraY: number): boolean
  dispose(): void
}

/* ------------------------------------------------------------ E84 */

/** Ein Sprungziel in der Siedlung (Liste "Wohnungen"): wohin die Kamera
 *  beim Begehen springt. ebene: Index in Welt3D.ebenen. */
export interface Sprungziel3D {
  name: string
  ebene: number
  x: number
  z: number
  /** Blickrichtung (0 = nach -z). */
  gier: number
}

/* ------------------------------------------------------------ E86 */

/** Was die Minikarte zeigt: Haeuser und Flaechen als Umrisse in
 *  Weltmetern (x, z; z wie der Plan nach unten), dazu der Rahmen. */
export interface Karte3D {
  rahmen: [number, number, number, number]
  haeuser: { name: string; punkte: [number, number][] }[]
  flaechen: { art: 'weg' | 'spielplatz' | 'strasse' | 'garten'; punkte: [number, number][] }[]
}
