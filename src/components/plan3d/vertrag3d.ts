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
  /** E87: lenkt gerade ein Fahrzeug. Lage des Fahrzeugs (Ursprung unten in
   *  der Mitte, Welt, y = Boden darunter, gier wie oben). Die Figur ist
   *  dann nicht zu sehen, das Fahrzeug faehrt bei allen mit. Fehlt oder
   *  null: zu Fuss. */
  lenkt?: { id: string; x: number; y: number; z: number; gier: number } | null
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
  /** E87: Oberkante in Metern ueber dem Boden der Ebene (Bank 0,45, Mauer
   *  0,6, Bordstein 0,15). Fehlt: hoch wie eine Wand. Was hoechstens
   *  STUFE_M hoch ist, steigt man einfach hinauf; hoeher hilft Springen. Wer
   *  mit den Fuessen darueber ist, wird nicht aufgehalten und steht darauf. */
  oben?: number
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
  /** E87: Gelaende. Bodenhoehe an der Stelle (x, z, Meter, Welt) relativ
   *  zu y; fehlt: eben (ueberall y). Muss schnell sein (jedes Bild). */
  hoehe?: (x: number, z: number) => number
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
  /* E87 */
  /** Treppen zwischen Ebenen (auch die Schwelle an jeder Haustuer). */
  treppen?: Treppe3D[]
  /** Fahrzeuge zum Einsteigen und Fahren. */
  fahrzeuge?: Fahrzeug3D[]
  /** Dinge zum Aufheben und Hinstellen. */
  dinge?: WeltDing3D[]
  /** Zaehlt hoch, wenn ebenen, treppen, fahrzeuge oder dinge neu sind
   *  (etwa ein Haus innen ist nachgeladen). Der Motor fragt jedes Bild und
   *  liest dann alles neu. Ebenen kommen nur hinten dazu; keine wird
   *  entfernt oder umsortiert, Indizes bleiben gueltig. Hindernisse einer
   *  Ebene duerfen sich aendern. */
  version?(): number
  /** E87b: ein Ding der Welt einzeln bauen, das (noch) nicht in dinge
   *  steht, etwa weil es aus einem Haus getragen wurde, das gerade nicht
   *  geladen ist (gespeicherte Lage oder Lage eines Mitspielers). Die
   *  Kennung allein muss reichen (sie traegt Haus und Art). null: die Welt
   *  kennt es nicht. Der Motor fragt das fuer jede gemerkte Lage einer
   *  unbekannten Kennung hoechstens einmal je Welt; das Ding steht danach in
   *  dinge (version zaehlt hoch). Kommt spaeter sein Haus, baut die Welt es
   *  nicht noch einmal. */
  dingErzeugen?(id: string): WeltDing3D | null
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
interface Karte3D {
  rahmen: [number, number, number, number]
  haeuser: { name: string; punkte: [number, number][] }[]
  flaechen: { art: KartenFlaeche; punkte: [number, number][] }[]
  /** E87: Strassen und Wege als Linien mit Breite (Meter). */
  strassen?: { art: 'haupt' | 'neben' | 'fuss' | 'gleis' | 'wasser'; breite: number; punkte: [number, number][] }[]
  /** E87: Orte mit Namen (Geschaefte, Feuerwehr, Spital) fuer Beschriftung. */
  orte?: { name: string; x: number; z: number }[]
}

/** Art einer Flaeche auf der Minikarte (E86, E87 erweitert). */
type KartenFlaeche =
  | 'weg'
  | 'spielplatz'
  | 'strasse'
  | 'garten'
  | 'wiese'
  | 'wald'
  | 'wasser'
  | 'parkplatz'
  | 'sport'
  | 'acker'
  | 'gewerbe'

/* ------------------------------------------------------------ E87 */

/** So hoch (Meter) steigt man ohne Springen hinauf (Stufe, Bordstein). */
export const STUFE_M = 0.35

/** Eine gerade Treppe oder Rampe zwischen zwei Ebenen (E87), auch die
 *  Schwelle an einer Haustuer (vom Gelaende auf den Boden des
 *  Erdgeschosses). Grundriss: Rechteck mit Mitte (x, z), laenge entlang der
 *  Laufrichtung, breite quer, drehY wie Hindernis3D und three: ein Punkt
 *  (u, v) der Treppe liegt in der Welt bei
 *    (x + u cos(drehY) + v sin(drehY),  z - u sin(drehY) + v cos(drehY)).
 *  Bei u = -laenge/2 schliesst die Ebene von an, bei u = +laenge/2 die
 *  Ebene nach (Kennungen aus Welt3D.ebenen). Die Hoehe laeuft dazwischen
 *  gerade: unten der Boden von an der Kante (mit Gelaende), oben der Boden
 *  von nach; nach darf auch tiefer liegen. Betreten nur ueber diese zwei
 *  Kanten; seitlich halten Gelaender (der Motor laesst niemanden seitlich
 *  hinaus). Wer die Kante bei +laenge/2 verlaesst, steht auf nach, bei
 *  -laenge/2 auf von. Die Welt sorgt dafuer, dass auf beiden Ebenen nur
 *  die richtige Kante frei ist (sonst Hindernisse). stufen: Zahl der Stufen
 *  zum Zeichnen (0 = Rampe). */
export interface Treppe3D {
  id: string
  x: number
  z: number
  laenge: number
  breite: number
  drehY: number
  von: string
  nach: string
  stufen: number
}

export type FahrzeugArt = 'auto' | 'kombi' | 'transporter' | 'feuerwehr' | 'rettung' | 'polizei' | 'bus'

/** Ein Fahrzeug zum Einsteigen (E87). Ursprung der gruppe unten in der
 *  Mitte, vorne = -z bei rotation.y = 0 (wie Figuren). Der Motor setzt
 *  position und rotation (auch Neigung am Hang) und dreht die Raeder.
 *  Masse in Metern. Die Lage (x, z, gier, ebene) ist die beim Bauen; was
 *  danach geschieht, weiss der Motor (und meldet es mit bewegt()). */
export interface Fahrzeug3D {
  id: string
  art: FahrzeugArt
  gruppe: Object3D
  laenge: number
  breite: number
  hoehe: number
  /** Augen des Fahrers, lokal (x rechts, y hoch, z vorne negativ). */
  fahrerAuge: [number, number, number]
  /** Wo man nach dem Aussteigen steht, lokal (x, z). */
  ausstieg: [number, number]
  /** Raeder (drehen sich um ihre lokale x-Achse; vordere lenken mit). */
  raeder: { teil: Object3D; vorne: boolean }[]
  /** Hoechstens so schnell (km/h). */
  hoechstKmh: number
  /** Blaulicht und Sirene an oder aus (nur Feuerwehr, Rettung, Polizei). */
  blaulicht?(an: boolean): void
  x: number
  z: number
  gier: number
  /** Kennung der Ebene, auf der es steht (meist das Gelaende). */
  ebene: string
  dispose(): void
}

/** Ein Ding in der Welt zum Aufheben und Hinstellen (E87): Ball, Eimer,
 *  Gartensessel, Packung im Regal. objekt hat den Ursprung unten in der
 *  Mitte; der Motor setzt position und rotation.y. Masse in Metern. */
export interface WeltDing3D {
  id: string
  objekt: Object3D
  breite: number
  tiefe: number
  hoehe: number
  /** Kennung der Ebene, auf der es zuerst steht. */
  ebene: string
}

/** Wo ein Ding oder Fahrzeug jetzt steht (E87): zum Speichern und fuer die
 *  Mitspieler. Welt-Meter, y = Unterkante, gier wie Pose3D. */
export interface DingLage3D {
  id: string
  art: 'ding' | 'fahrzeug'
  x: number
  y: number
  z: number
  gier: number
  ebene: string
}

/** Das Fahrzeug, in dem man sitzt (E87), fuer die Anzeige. */
export interface FahrzeugJetzt {
  id: string
  art: FahrzeugArt
  kmh: number
  sicht: 'innen' | 'hinten'
  blaulicht: boolean
}

/** Was man gerade tun kann (E87), fuer Knoepfe am Handy und Hinweise. */
export interface Moeglich3D {
  /** Ein Fahrzeug ist nah genug zum Einsteigen. */
  einsteigen: boolean
  /** Man sitzt in einem Fahrzeug. */
  aussteigen: boolean
  /** Man haelt ein Ding (Hinstellen, Drehen, Ablegen). */
  halten: boolean
  /** Das Ding in der Hand passt dorthin, wo man zeigt. */
  hinstellen: boolean
  /** Springen geht (stehend, zu Fuss, nicht im Aufzug). */
  hupfen: boolean
}
