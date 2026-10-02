/* Haeuser innen erfinden (E87). Rein, ohne three und ohne Netz: innen3d.ts
 * baut aus dem Plan die Meshes, scripts/innen-pruefen.mjs prueft ihn ohne
 * Browser. Gleiche Eingabe gibt dasselbe Innere (Zufall mit Saat aus e.id),
 * bei allen Mitspielern gleich. Erfunden und glaubhaft, nicht 1:1.
 *
 * innenPlanen(e):
 * - Rahmen: Achse u entlang der laengsten Kante des Umrisses, v quer dazu.
 *   Raster aus Zellen von etwa 0,3 m (grosse Haeuser groeber), die ganz
 *   innerhalb der Aussenwand liegen (AUSSENWAND_M ab dem Umriss nach
 *   innen). Die Zellen gehen im umgebenden Rechteck genau auf.
 * - Treppenhaus ab zwei Geschossen: gerade Laeufe (Stufen etwa 0,17 x 0,28
 *   m, mindestens 1,1 m breit), abwechselnd auf zwei Bahnen nebeneinander,
 *   an beiden Enden ein Podest ueber die ganze Breite (X und Y). Lauf k
 *   fuehrt von Geschoss k nach k + 1, gerade k von X nach Y, ungerade
 *   zurueck. Im Geschoss j kommt man also an dem Podest an, an dem es
 *   weiter hinauf geht (X bei geraden j, sonst Y); die anderen Enden der
 *   Bahnen und alle Seiten sind dort gesperrt (Gelaender oder unsichtbare
 *   Sperre), wie Treppe3D es verlangt. Passt die Treppe nicht, wird sie
 *   kuerzer und steiler (bis 0,22 m Steigung).
 * - Gaenge: Eingang (EG) und Podeste werden mit Wegen mit wenig Knicken
 *   verbunden; was weiter als eine Raumtiefe vom Gang weg liegt, bekommt
 *   einen eigenen geraden Gang mit Anschluss.
 * - Programme je Art: Wohnungen (Vorraum, Bad, WC, Wohnkueche, Zimmer),
 *   Einfamilienhaus, Laden, Supermarkt, Einkaufszentrum (Geschaefte mit
 *   Schild), Feuerwehr (Fahrzeughalle), Spital, Schule, Kindergarten,
 *   Kirche (Schiff, Empore), Buero, Halle, Garage, Schuppen. Schnitte
 *   zwischen Raeumen moeglichst nicht vor Fenstern.
 * - Waende auf den Rasterlinien zwischen verschiedenen Raeumen (10 cm in
 *   einer Einheit, 20 cm sonst), bis in die Aussenwand verlaengert, Tueren
 *   0,9 m. Ein Graph prueft, dass jeder Raum vom Eingang aus erreichbar
 *   ist; sonst kommt eine Tuer dazu oder der Raum geht im Nachbarn auf.
 * - Moebel an Waenden (nicht vor Tueren, hohe nicht vor Fenstern) oder frei
 *   mit Gaengen; Dinge zum Aufheben auf Tischen, Theken und Regalen.
 * Ergebnis im Rahmen des Hauses (Meter, x Osten, z Sueden, EG-Boden bei 0).
 *
 * tuerLage(umriss, tuer, art): wo die Haustuer liegt (Kante, Mitte,
 * Breite), weg von den Ecken; stadt3d.ts schneidet die Fassade und legt
 * die Stufen genau dorthin, innenPlanen die Oeffnung im Inneren.
 *
 * Rechnen im Hintergrund: innenWerker.ts ruft innenPlanen in einem Web
 * Worker auf (der Plan ist reine Daten), stadt3d.ts fragt dort an.
 *
 * wohnhausInnen(e): Wohnungen fuer ein Haus der Siedlung ohne Plaene im
 * Format von siedlungen.innen (E84), mit demselben Raster und denselben
 * Wohnungen; Raeume als Umrisse in cm, im Uhrzeigersinn. */
import { AUSSENWAND_M, FENSTER_B, fensterOhneTuer, fensterReihe, tuerBreite } from '../components/plan3d/stadtMasse.ts'
import type { FahrzeugArt } from '../components/plan3d/vertrag3d'
import type { SiedlungInnenHaus, SiedlungInnenMoebel, SiedlungInnenOeffnung, SiedlungInnenRaum, SiedlungInnenWohnung, StadtHausArt } from './types'

/** Was der Generator ueber ein Haus weiss. Meter im eigenen Rahmen des
 *  Hauses (x, z wie die Stadt: x Osten, z Sueden), Boden des EG bei y 0. */
export interface InnenEingabe {
  /** Stabil; daraus kommt der Zufall (gleiches Haus, gleiche Raeume bei
   *  allen Mitspielern). */
  id: string
  art: StadtHausArt
  umriss: [number, number][]
  loecher?: [number, number][][]
  geschosse: number
  geschossHoehe: number
  tuer: { kante: number; t: number }
  name?: string
  laeden?: { name: string; art: string }[]
}

/* ============================================================ Formen */

export type Punkt2 = [number, number]

/** Was ein Raum ist (bestimmt Boden, Moebel und Dinge). */
export type RaumTyp =
  | 'flur'
  | 'treppe'
  | 'vorraum'
  | 'wohnen'
  | 'kueche'
  | 'bad'
  | 'wc'
  | 'zimmer'
  | 'schlafen'
  | 'kind'
  | 'abstell'
  | 'verkauf'
  | 'lager'
  | 'buero'
  | 'besprechung'
  | 'teekueche'
  | 'laden'
  | 'mall'
  | 'fahrzeughalle'
  | 'umkleide'
  | 'werkstatt'
  | 'aufenthalt'
  | 'schlafraum'
  | 'lobby'
  | 'behandlung'
  | 'patient'
  | 'station'
  | 'klasse'
  | 'gruppe'
  | 'garderobe'
  | 'lehrer'
  | 'direktion'
  | 'schiff'
  | 'sakristei'
  | 'empore'
  | 'halle'
  | 'garage'
  | 'schuppen'
  | 'dachboden'
  | 'schacht'
  | 'leer'

export type BodenArt = 'parkett' | 'fliese' | 'stein' | 'beton' | 'linol' | 'teppich' | 'dielen'

export type MoebelArt =
  | 'bett2'
  | 'bett1'
  | 'nachttisch'
  | 'schrank'
  | 'kommode'
  | 'sofa'
  | 'sessel'
  | 'couchtisch'
  | 'tv'
  | 'esstisch'
  | 'stuhl'
  | 'kueche'
  | 'kuehlschrank'
  | 'wanne'
  | 'dusche'
  | 'wc'
  | 'becken'
  | 'waschmaschine'
  | 'garderobe'
  | 'regal'
  | 'schreibtisch'
  | 'buerostuhl'
  | 'pflanze'
  | 'teppich'
  | 'theke'
  | 'regalwand'
  | 'gondel'
  | 'kuehlregal'
  | 'kasse'
  | 'auslage'
  | 'kleiderstaender'
  | 'cafetisch'
  | 'bank'
  | 'spind'
  | 'schlauch'
  | 'werkbank'
  | 'empfang'
  | 'wartestuhl'
  | 'spitalbett'
  | 'vorhang'
  | 'liege'
  | 'schulbank'
  | 'lehrertisch'
  | 'tafel'
  | 'kindertisch'
  | 'spielregal'
  | 'matte'
  | 'kirchenbank'
  | 'altar'
  | 'podest'
  | 'ambo'
  | 'orgel'
  | 'aktenschrank'
  | 'hochregal'
  | 'werkzeugwand'
  | 'rasenmaeher'
  | 'schubkarre'
  | 'kisten'
  | 'lift'

export type DingArt =
  | 'ball'
  | 'buch'
  | 'tasse'
  | 'karton'
  | 'flasche'
  | 'apfel'
  | 'dose'
  | 'packung'
  | 'teddy'
  | 'spielauto'
  | 'helm'
  | 'erstehilfe'
  | 'globus'
  | 'kerze'
  | 'laptop'
  | 'werkzeugkiste'
  | 'giesskanne'
  | 'blumentopf'
  | 'kissen'
  | 'vase'
  | 'tuete'

export type LueckeArt = 'tuer' | 'durchgang' | 'front'

export interface InnenRaum {
  typ: RaumTyp
  name: string
  /** Einheit (Wohnung, Geschaeft) im Geschoss, -1: allgemein. */
  einheit: number
  qm: number
  /** Rechtecke (je vier Ecken, Haus-Meter), die den Raum zusammen bedecken. */
  rechtecke: Punkt2[][]
  /** Eine Stelle im Raum ohne Moebel (Haus-Meter), zum Hingehen. */
  frei: Punkt2
  boden: BodenArt
  laden?: { name: string; art: string }
}

export interface InnenLuecke {
  /** Meter ab a entlang der Wand. */
  t0: number
  t1: number
  art: LueckeArt
  hoehe: number
}

/** Eine Wand (Mittellinie a nach b, Haus-Meter) mit Luecken. gelaender:
 *  1 m hoch und duenn; sperre: unsichtbar, nur Hindernis. */
export interface InnenWand {
  a: Punkt2
  b: Punkt2
  dicke: number
  art: 'wand' | 'gelaender' | 'sperre'
  luecken: InnenLuecke[]
}

/** Ein Moebel: Mitte, Breite b entlang u, Tiefe t entlang der Vorderseite
 *  (-u.z, u.x), Hoehe h (Meter). oben: Oberkante fuer das Hindernis (null:
 *  so hoch wie eine Wand); ablage: Hoehe, auf der Dinge liegen koennen. */
export interface InnenMoebel {
  art: MoebelArt
  mitte: Punkt2
  u: Punkt2
  b: number
  t: number
  h: number
  oben: number | null
  hindernis: boolean
  /** 0..1, waehlt Farbe und Spielart. */
  ton: number
  ablage: number | null
  text?: string
}

export interface InnenDing {
  art: DingArt
  mitte: Punkt2
  /** Unterkante ueber dem Boden des Geschosses. */
  y: number
  gier: number
  b: number
  t: number
  h: number
  ton: number
}

/** Ein Fahrzeug zum Anschauen (Feuerwehr, Garage), nicht zum Fahren:
 *  gier wie three (vorne -z bei 0). */
export interface InnenFahrzeug {
  art: FahrzeugArt
  farbe: string
  mitte: Punkt2
  gier: number
}

/** Ein Schild: Unterkante y ueber dem Boden, Mitte vor der Wand, u die
 *  Leserichtung, n zeigt zum Betrachter. */
export interface InnenSchild {
  text: string
  mitte: Punkt2
  u: Punkt2
  n: Punkt2
  breite: number
  hoehe: number
  y: number
}

/** Ein gerader Lauf von Geschoss k nach k + 1: a ist die Mitte der
 *  unteren Kante, u die Laufrichtung (Haus-Meter). */
export interface InnenLauf {
  k: number
  a: Punkt2
  u: Punkt2
  laenge: number
  breite: number
  stufen: number
}

export interface InnenGeschoss {
  k: number
  /** Boden (Meter ueber dem EG-Boden). */
  y: number
  raeume: InnenRaum[]
  waende: InnenWand[]
  moebel: InnenMoebel[]
  dinge: InnenDing[]
  fahrzeuge: InnenFahrzeug[]
  schilder: InnenSchild[]
  /** Wo es einen Boden gibt (Vielecke, Haus-Meter); null: ueberall im Umriss. */
  boden: Punkt2[][] | null
  /** Loecher im Boden (Treppen), Vierecke. */
  loecher: Punkt2[][]
  /** Raum (Index), in dem man das Geschoss betritt. */
  start: number
}

export interface InnenFenster {
  /** 0: Umriss, 1...: Innenhoefe. */
  ring: number
  kante: number
  /** Mitte in Metern ab dem Anfang der Kante. */
  t: number
  /** Gibt es auch im Erdgeschoss (nicht neben der Haustuer). */
  eg: boolean
}

export interface InnenTuer {
  kante: number
  /** Mitte in Metern ab dem Anfang der Kante. */
  t: number
  mitte: Punkt2
  /** Entlang der Kante und nach innen (Einheitsvektoren). */
  u: Punkt2
  n: Punkt2
  breite: number
}

/** Ein erfundenes Inneres. Nur innen3d.ts (und die Pruefung) liest es. */
export interface InnenPlan {
  id: string
  art: StadtHausArt
  /** Umriss und Innenhoefe, wie gegeben. */
  ringe: Punkt2[][]
  geschossHoehe: number
  geschosse: InnenGeschoss[]
  laeufe: InnenLauf[]
  tuer: InnenTuer | null
  fenster: InnenFenster[]
  /** Zellgroesse des Rasters (Meter) und Rechenzeit (ms), fuer die Pruefung. */
  zelle: number
  ms: number
}

/** Decke unter dem naechsten Geschoss (Meter). */
export const DECKE_M = 0.25
/** Hoehe der Tueren und Durchgaenge innen. */
export const TUER_INNEN_H = 2.1

/* ============================================================ Hilfen */

type P = [number, number]

function saatAus(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Gleichmaessiger Zufall 0..1 aus einer Saat (mulberry32). */
function zufallMit(saat: number): () => number {
  let a = saat >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function flaecheVon(p: readonly P[]): number {
  let s = 0
  for (let i = 0; i < p.length; i++) {
    const a = p[i]
    const b = p[(i + 1) % p.length]
    s += a[0] * b[1] - b[0] * a[1]
  }
  return s / 2
}

function abstandStrecke(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax
  const dz = bz - az
  const l = dx * dx + dz * dz
  let t = l > 0 ? ((px - ax) * dx + (pz - az) * dz) / l : 0
  t = t < 0 ? 0 : t > 1 ? 1 : t
  return Math.hypot(px - ax - t * dx, pz - az - t * dz)
}

function zahlOk(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

const klemm = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)

/* ------------------------------------------------ Rahmen */

/** Lokaler Rahmen: u entlang (ax, az), v = (-az, ax); beides Einheiten. */
interface Rahmen {
  ox: number
  oz: number
  ax: number
  az: number
}

function lokal(r: Rahmen, x: number, z: number): P {
  const dx = x - r.ox
  const dz = z - r.oz
  return [dx * r.ax + dz * r.az, -dx * r.az + dz * r.ax]
}

function hausVon(r: Rahmen, u: number, v: number): P {
  return [r.ox + u * r.ax - v * r.az, r.oz + u * r.az + v * r.ax]
}

function richtungHaus(r: Rahmen, du: number, dv: number): P {
  return [du * r.ax - dv * r.az, du * r.az + dv * r.ax]
}

/* ------------------------------------------------ Raster */

interface Feld {
  u0: number
  v0: number
  gu: number
  gv: number
  nu: number
  nv: number
  /** 1: Zelle liegt ganz innerhalb der Aussenwand. */
  frei: Uint8Array
  sat: Int32Array
}

/** Summen-Tabelle ueber eine Maske (fuer Rechtecke in O(1)). */
function satVon(m: ArrayLike<number>, nu: number, nv: number, wert?: (x: number) => boolean): Int32Array {
  const W = nu + 1
  const s = new Int32Array(W * (nv + 1))
  for (let j = 0; j < nv; j++) {
    let zeile = 0
    for (let i = 0; i < nu; i++) {
      const x = m[j * nu + i]
      zeile += (wert ? wert(x) : x > 0) ? 1 : 0
      s[(j + 1) * W + i + 1] = s[j * W + i + 1] + zeile
    }
  }
  return s
}

/** Anzahl in [i0, i1) x [j0, j1). */
function satSumme(s: Int32Array, nu: number, i0: number, j0: number, i1: number, j1: number): number {
  const W = nu + 1
  return s[j1 * W + i1] - s[j0 * W + i1] - s[j1 * W + i0] + s[j0 * W + i0]
}

function feldBauen(ringeL: P[][], aw: number, gZiel: number): Feld | null {
  let umin = Infinity
  let umax = -Infinity
  let vmin = Infinity
  let vmax = -Infinity
  for (const [u, v] of ringeL[0]) {
    umin = Math.min(umin, u)
    umax = Math.max(umax, u)
    vmin = Math.min(vmin, v)
    vmax = Math.max(vmax, v)
  }
  const bu = umax - umin - 2 * aw
  const bv = vmax - vmin - 2 * aw
  if (!(bu >= 0.6 && bv >= 0.6)) return null
  let g = gZiel
  while ((bu / g) * (bv / g) > 25000) g *= 1.15
  const nu = Math.max(2, Math.round(bu / g))
  const nv = Math.max(2, Math.round(bv / g))
  const gu = bu / nu
  const gv = bv / nv
  const u0 = umin + aw
  const v0 = vmin + aw
  const frei = new Uint8Array(nu * nv)
  const kanten: number[] = []
  for (const r of ringeL) {
    for (let i = 0; i < r.length; i++) {
      const a = r[i]
      const b = r[(i + 1) % r.length]
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 1e-9) continue
      kanten.push(a[0], a[1], b[0], b[1])
    }
  }
  // Innen: je Zeile die Schnitte mit allen Kanten (gerade-ungerade, Hoefe zaehlen mit).
  const xs: number[] = []
  for (let j = 0; j < nv; j++) {
    const vc = v0 + (j + 0.5) * gv
    xs.length = 0
    for (let k = 0; k < kanten.length; k += 4) {
      const av = kanten[k + 1]
      const bv2 = kanten[k + 3]
      if (av <= vc !== bv2 <= vc) xs.push(kanten[k] + ((vc - av) / (bv2 - av)) * (kanten[k + 2] - kanten[k]))
    }
    xs.sort((a, b) => a - b)
    for (let m = 0; m + 1 < xs.length; m += 2) {
      const i0 = Math.max(0, Math.ceil((xs[m] - u0) / gu - 0.5))
      const i1 = Math.min(nu - 1, Math.floor((xs[m + 1] - u0) / gu - 0.5))
      for (let i = i0; i <= i1; i++) frei[j * nu + i] = 1
    }
  }
  // Saum: Zellen, deren Mitte naeher als die Wand (plus halbe Zelle) an einer Kante liegt.
  const grenze = aw + Math.min(gu, gv) / 2 - 1e-6
  const gmin = Math.min(gu, gv)
  const ri = Math.ceil(grenze / gu) + 1
  const rj = Math.ceil(grenze / gv) + 1
  for (let k = 0; k < kanten.length; k += 4) {
    const au = kanten[k]
    const av = kanten[k + 1]
    const bu2 = kanten[k + 2]
    const bv2 = kanten[k + 3]
    const L = Math.hypot(bu2 - au, bv2 - av)
    const schritte = Math.max(1, Math.ceil(L / (gmin * 0.5)))
    for (let s = 0; s <= schritte; s++) {
      const qu = au + ((bu2 - au) * s) / schritte
      const qv = av + ((bv2 - av) * s) / schritte
      const ci = Math.floor((qu - u0) / gu)
      const cj = Math.floor((qv - v0) / gv)
      for (let dj = -rj; dj <= rj; dj++) {
        const j = cj + dj
        if (j < 0 || j >= nv) continue
        for (let di = -ri; di <= ri; di++) {
          const i = ci + di
          if (i < 0 || i >= nu) continue
          const z = j * nu + i
          if (!frei[z]) continue
          if (abstandStrecke(u0 + (i + 0.5) * gu, v0 + (j + 0.5) * gv, au, av, bu2, bv2) < grenze) frei[z] = 0
        }
      }
    }
  }
  return { u0, v0, gu, gv, nu, nv, frei, sat: satVon(frei, nu, nv) }
}

/* ============================================================ Zusammenhang */

type RegArt = 'flur' | 'raum' | 'lauf' | 'leer' | 'schacht'

interface Reg {
  art: RegArt
  typ: RaumTyp
  name: string
  einheit: number
  /** Zu diesen Raeumen keine Wand (offene Kueche, Chor). */
  offen: number[]
  laden: { name: string; art: string } | null
  /** false, wenn der Raum in einem anderen aufging. */
  aktiv: boolean
}

interface Anfrage {
  a: number
  b: number
  art: LueckeArt
  breite: number
  /** Lieber hier (lokal). */
  bei: P | null
}

/** Eine Wand im Raster (lokal): auf Linie linie (achse 0: v = const, laeuft
 *  entlang u; achse 1: u = const), Zellen i0..i1 entlang, ra auf der
 *  kleineren, rb auf der groesseren Seite. */
interface WandL {
  achse: 0 | 1
  linie: number
  i0: number
  i1: number
  ra: number
  rb: number
  art: 'wand' | 'gelaender' | 'sperre'
  dicke: number
  p0: P
  p1: P
  /** Wo der Zellbereich auf der Wand beginnt (Meter ab p0). */
  s0: number
  luecken: InnenLuecke[]
}

/** Eine gesetzte Oeffnung (lokal): Mitte, Richtung der Wand, Breite. */
interface OeffnungL {
  c: P
  w: P
  breite: number
  art: LueckeArt
  ra: number
  rb: number
  wand: WandL
}

interface MoebelL {
  art: MoebelArt
  c: P
  /** Vorderseite (lokale Einheit). */
  d: P
  b: number
  t: number
  h: number
  oben: number | null
  hindernis: boolean
  ton: number
  ablage: number | null
  raum: number
  text?: string
}

interface DingL {
  art: DingArt
  c: P
  y: number
  gier: number
  b: number
  t: number
  h: number
  ton: number
}

interface FahrzeugL {
  art: FahrzeugArt
  farbe: string
  c: P
  /** Vorne (lokale Einheit). */
  vorn: P
}

interface SchildL {
  text: string
  c: P
  n: P
  breite: number
  hoehe: number
  y: number
}

interface Stock {
  k: number
  /** -1 unbrauchbar, -2 noch frei, sonst Raum. */
  zelle: Int32Array
  regs: Reg[]
  anfragen: Anfrage[]
  einheiten: number
  waende: WandL[]
  extra: WandL[]
  oeffnungen: OeffnungL[]
  belegt: Uint8Array
  halten: Uint8Array
  moebel: MoebelL[]
  dinge: DingL[]
  fahrzeuge: FahrzeugL[]
  schilder: SchildL[]
  /** Raum, in dem man das Geschoss betritt. */
  start: number
  /** Zonen mit Boden (lokale Rechtecke u0, v0, u1, v1); null: ueberall. */
  bodenZonen: [number, number, number, number][] | null
  rnd: () => number
  /** Ab dem Einrichten fest: Zellen und Rahmen je Raum, Wandplaetze (Zwischenspeicher). */
  listen: number[][] | null
  kaesten: [number, number, number, number][] | null
  plaetze: Map<number, WandPlatz[]>
}

interface Tuer {
  kante: number
  t: number
  mitte: P
  u: P
  n: P
  breite: number
  ml: P
  ul: P
  nl: P
}

interface Kern {
  achse: 0 | 1
  i0: number
  j0: number
  ni: number
  nj: number
  pz: number
  lz: number
  qn: number
  /** Podest X am kleinen Ende der Laengsachse. */
  xMin: boolean
  bahnen: 1 | 2
  bahnB: number
  spalt: number
  stufen: number
}

interface FensterL {
  /** Mitte lokal und Richtung der Kante lokal. */
  c: P
  d: P
  eg: boolean
}

interface Ctx {
  e: InnenEingabe
  art: StadtHausArt
  n: number
  gh: number
  ringe: P[][]
  ringeL: P[][]
  rahmen: Rahmen
  feld: Feld
  qm: number
  strafeU: Float32Array
  strafeV: Float32Array
  fenster: InnenFenster[]
  fensterL: FensterL[]
  tuer: Tuer | null
  eingang: number[]
  kern: Kern | null
  ladenNr: number
  rnd: () => number
  saat: number
}

/* ============================================================ Vorbereiten */

const AW = AUSSENWAND_M

/** Ring als Zahlen, ein doppelter Endpunkt faellt weg (wie in stadt3d.ts,
 *  damit die Kanten dieselben Indizes haben). */
function ringAus(r: readonly (readonly [number, number])[]): P[] {
  const out = r.map((p) => [Number(p[0]), Number(p[1])] as P)
  if (out.length > 1) {
    const a = out[0]
    const b = out[out.length - 1]
    if (Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9) out.pop()
  }
  return out
}

/** Rand der Haustuer zu jeder Ecke ihrer Kante (Meter): die Wand der
 *  Nachbarkante und eine Zarge haben Platz. */
const TUER_ECKE = AUSSENWAND_M + 0.15

/** Wo die Haustuer eines Hauses liegt (E87), fuer die Fassade (stadt3d.ts)
 *  und das Innere gleich: Kante (Index im Umriss, ohne doppelten
 *  Endpunkt), Mitte t in Metern ab dem Anfang der Kante, Breite. Die Tuer
 *  bleibt ganz auf ihrer Kante; ist die Kante lang genug, rueckt sie so weit
 *  von den Ecken weg (TUER_ECKE), dass die Wand der Nachbarkante sie nicht
 *  verdeckt, sonst steht sie in der Mitte. Breite nach tuerBreite, auf
 *  kurzen Kanten schmaler (mindestens 0,7 m). null: keine Tuer (Kante unter
 *  0,8 m, kaputte Angaben). Rein, ohne three. */
export function tuerLage(umriss: readonly (readonly [number, number])[], tuer: { kante: number; t: number } | null | undefined, art: string): { kante: number; t: number; breite: number } | null {
  if (!Array.isArray(umriss) || !tuer || typeof tuer !== 'object' || !zahlOk(tuer.kante)) return null
  const u = ringAus(umriss)
  if (u.length < 3 || !u.every((p) => zahlOk(p[0]) && zahlOk(p[1]))) return null
  const kante = ((Math.round(tuer.kante) % u.length) + u.length) % u.length
  const a = u[kante]
  const b = u[(kante + 1) % u.length]
  const L = Math.hypot(b[0] - a[0], b[1] - a[1])
  if (!(L >= 0.8)) return null
  let breite = tuerBreite(art)
  if (breite > L - 0.1) breite = Math.max(0.7, L - 0.1)
  const t0 = klemm(zahlOk(tuer.t) ? tuer.t : 0.5, 0, 1) * L
  const rand = breite / 2 + TUER_ECKE
  const t = L >= 2 * rand ? klemm(t0, rand, L - rand) : L / 2
  return { kante, t, breite }
}

function vorbereiten(e: InnenEingabe): Ctx | null {
  if (!e || !Array.isArray(e.umriss) || e.umriss.length < 3) return null
  const ringe: P[][] = [ringAus(e.umriss)]
  if (ringe[0].length < 3) return null
  // Hoefe wie stadt3d.ts: ab drei Punkten und mehr als 0,5 m2.
  for (const l of e.loecher ?? []) {
    if (!Array.isArray(l)) continue
    const r = ringAus(l)
    if (r.length >= 3 && Math.abs(flaecheVon(r)) > 0.5) ringe.push(r)
  }
  if (!ringe.every((r) => r.every((p) => zahlOk(p[0]) && zahlOk(p[1])))) return null
  if (Math.abs(flaecheVon(ringe[0])) < 2) return null
  // Grenzen wie stadt3d.ts (Geschosse bis 60, Hoehe bis 10 m), damit Fenster
  // und Boeden innen genau zur Fassade passen.
  const n = klemm(Math.round(zahlOk(e.geschosse) ? e.geschosse : 1), 1, 60)
  const gh = klemm(zahlOk(e.geschossHoehe) ? e.geschossHoehe : 3, 2.2, 10)
  // Rahmen an der laengsten Kante.
  const u = ringe[0]
  let lang = -1
  let ax = 1
  let az = 0
  for (let i = 0; i < u.length; i++) {
    const a = u[i]
    const b = u[(i + 1) % u.length]
    const l = Math.hypot(b[0] - a[0], b[1] - a[1])
    if (l > lang + 1e-9) {
      lang = l
      ax = (b[0] - a[0]) / l
      az = (b[1] - a[1]) / l
    }
  }
  let cx = 0
  let cz = 0
  for (const p of u) {
    cx += p[0]
    cz += p[1]
  }
  const rahmen: Rahmen = { ox: cx / u.length, oz: cz / u.length, ax, az }
  const ringeL = ringe.map((r) => r.map((p) => lokal(rahmen, p[0], p[1])))
  const flaeche = Math.abs(flaecheVon(ringe[0]))
  const feld = feldBauen(ringeL, AW, flaeche > 6000 ? 0.8 : flaeche > 2500 ? 0.6 : flaeche > 900 ? 0.4 : 0.3)
  if (!feld) return null
  const saat = saatAus(String(e.id))
  const ctx: Ctx = {
    e,
    art: e.art,
    n,
    gh,
    ringe,
    ringeL,
    rahmen,
    feld,
    qm: feld.gu * feld.gv,
    strafeU: new Float32Array(feld.nu + 1),
    strafeV: new Float32Array(feld.nv + 1),
    fenster: [],
    fensterL: [],
    tuer: null,
    eingang: [],
    kern: null,
    ladenNr: 0,
    rnd: zufallMit(saat),
    saat,
  }
  tuerFinden(ctx)
  fensterFinden(ctx)
  eingangFinden(ctx)
  return ctx
}

/** Innennormale der Kante i eines Rings (Umriss: ins Haus; Hof: weg vom Hof). */
function innenNormale(ring: P[], i: number, hof: boolean): P | null {
  const a = ring[i]
  const b = ring[(i + 1) % ring.length]
  const l = Math.hypot(b[0] - a[0], b[1] - a[1])
  if (l < 1e-9) return null
  const dx = (b[0] - a[0]) / l
  const dz = (b[1] - a[1]) / l
  const links = flaecheVon(ring) > 0
  // Bei positiver Flaeche liegt das Innere links: (-dz, dx).
  const s = links !== hof ? 1 : -1
  return [-dz * s, dx * s]
}

function tuerFinden(c: Ctx): void {
  const u = c.ringe[0]
  // Dieselbe Lage wie die Luecke in der Fassade (stadt3d.ts).
  const lage = tuerLage(u, c.e.tuer, c.art)
  if (!lage) return
  const k = lage.kante
  const a = u[k]
  const b = u[(k + 1) % u.length]
  const L = Math.hypot(b[0] - a[0], b[1] - a[1])
  const n = innenNormale(u, k, false)
  if (!n) return
  const breite = lage.breite
  const tm = lage.t
  const ux = (b[0] - a[0]) / L
  const uz = (b[1] - a[1]) / L
  const mitte: P = [a[0] + ux * tm, a[1] + uz * tm]
  const ml = lokal(c.rahmen, mitte[0], mitte[1])
  const r = c.rahmen
  const ul: P = [ux * r.ax + uz * r.az, -ux * r.az + uz * r.ax]
  const nl: P = [n[0] * r.ax + n[1] * r.az, -n[0] * r.az + n[1] * r.ax]
  c.tuer = { kante: k, t: tm, mitte, u: [ux, uz], n, breite, ml, ul, nl }
}

function fensterFinden(c: Ctx): void {
  const F = c.feld
  const halb = FENSTER_B / 2 + 0.15
  c.ringe.forEach((ring, ri) => {
    for (let k = 0; k < ring.length; k++) {
      const a = ring[k]
      const b = ring[(k + 1) % ring.length]
      const L = Math.hypot(b[0] - a[0], b[1] - a[1])
      if (L < 1e-6) continue
      const alle = fensterReihe(L)
      if (!alle.length) continue
      const tuerHier = ri === 0 && c.tuer && c.tuer.kante === k
      const eg = tuerHier && c.tuer ? fensterOhneTuer(L, c.tuer.t, c.tuer.breite) : alle
      const ux = (b[0] - a[0]) / L
      const uz = (b[1] - a[1]) / L
      const r = c.rahmen
      const dl: P = [ux * r.ax + uz * r.az, -ux * r.az + uz * r.ax]
      for (const t of alle) {
        const imEg = eg.some((x) => Math.abs(x - t) < 1e-6)
        c.fenster.push({ ring: ri, kante: k, t, eg: imEg })
        const cl = lokal(r, a[0] + ux * t, a[1] + uz * t)
        c.fensterL.push({ c: cl, d: dl, eg: imEg })
        // Strafe fuer Schnitte (Waende), die hier auf die Fassade treffen.
        if (Math.abs(dl[0]) > 0.85) {
          const w = halb * Math.abs(dl[0])
          for (let i = Math.max(0, Math.ceil((cl[0] - w - F.u0) / F.gu)); i <= Math.min(F.nu, Math.floor((cl[0] + w - F.u0) / F.gu)); i++) c.strafeU[i] += 1
        }
        if (Math.abs(dl[1]) > 0.85) {
          const w = halb * Math.abs(dl[1])
          for (let j = Math.max(0, Math.ceil((cl[1] - w - F.v0) / F.gv)); j <= Math.min(F.nv, Math.floor((cl[1] + w - F.v0) / F.gv)); j++) c.strafeV[j] += 1
        }
      }
    }
  })
}

function eingangFinden(c: Ctx): void {
  const t = c.tuer
  if (!t) return
  const F = c.feld
  const out: number[] = []
  let beste = -1
  let besteD = 3
  for (let j = 0; j < F.nv; j++) {
    for (let i = 0; i < F.nu; i++) {
      const z = j * F.nu + i
      if (!F.frei[z]) continue
      const du = F.u0 + (i + 0.5) * F.gu - t.ml[0]
      const dv = F.v0 + (j + 0.5) * F.gv - t.ml[1]
      const s = du * t.nl[0] + dv * t.nl[1]
      const q = du * t.ul[0] + dv * t.ul[1]
      // Etwas breiter als die Tuer, damit Trennwaende neben der Tuer auf die Fassade treffen.
      if (s >= AW - 0.05 && s <= AW + 1.3 && Math.abs(q) <= t.breite / 2 + 0.4) out.push(z)
      const d = Math.hypot(du - t.nl[0] * (AW + 0.5), dv - t.nl[1] * (AW + 0.5))
      if (d < besteD) {
        besteD = d
        beste = z
      }
    }
  }
  if (!out.length && beste >= 0) out.push(beste)
  c.eingang = out
}

/* ============================================================ Raeume */

const NAMEN: Record<RaumTyp, string> = {
  flur: 'Gang',
  treppe: 'Stiege',
  vorraum: 'Vorraum',
  wohnen: 'Wohnkueche',
  kueche: 'Kueche',
  bad: 'Bad',
  wc: 'WC',
  zimmer: 'Zimmer',
  schlafen: 'Schlafzimmer',
  kind: 'Kinderzimmer',
  abstell: 'Abstellraum',
  verkauf: 'Verkauf',
  lager: 'Lager',
  buero: 'Buero',
  besprechung: 'Besprechung',
  teekueche: 'Teekueche',
  laden: 'Geschaeft',
  mall: 'Passage',
  fahrzeughalle: 'Fahrzeughalle',
  umkleide: 'Umkleide',
  werkstatt: 'Werkstatt',
  aufenthalt: 'Aufenthaltsraum',
  schlafraum: 'Schlafraum',
  lobby: 'Eingangshalle',
  behandlung: 'Behandlung',
  patient: 'Patientenzimmer',
  station: 'Stationszimmer',
  klasse: 'Klasse',
  gruppe: 'Gruppenraum',
  garderobe: 'Garderobe',
  lehrer: 'Lehrerzimmer',
  direktion: 'Direktion',
  schiff: 'Kirchenschiff',
  sakristei: 'Sakristei',
  empore: 'Empore',
  halle: 'Halle',
  garage: 'Garage',
  schuppen: 'Schuppen',
  dachboden: 'Dachboden',
  schacht: 'Schacht',
  leer: 'Luftraum',
}

function bodenVon(typ: RaumTyp, art: StadtHausArt): BodenArt {
  switch (typ) {
    case 'bad':
    case 'wc':
    case 'kueche':
    case 'teekueche':
    case 'umkleide':
      return 'fliese'
    case 'flur':
    case 'treppe':
    case 'vorraum':
    case 'lobby':
    case 'mall':
    case 'schiff':
    case 'empore':
    case 'sakristei':
      return art === 'wohnen' || art === 'haus' ? (typ === 'vorraum' ? 'fliese' : 'stein') : 'stein'
    case 'verkauf':
    case 'laden':
    case 'station':
    case 'patient':
    case 'behandlung':
    case 'klasse':
    case 'gruppe':
    case 'garderobe':
      return 'linol'
    case 'buero':
    case 'besprechung':
    case 'lehrer':
    case 'direktion':
      return 'teppich'
    case 'lager':
    case 'fahrzeughalle':
    case 'werkstatt':
    case 'halle':
    case 'garage':
    case 'schacht':
      return 'beton'
    case 'schuppen':
    case 'dachboden':
      return 'dielen'
    default:
      return 'parkett'
  }
}

function neuerRaum(st: Stock, art: RegArt, typ: RaumTyp, einheit = -1, name?: string): number {
  st.regs.push({ art, typ, name: name ?? NAMEN[typ], einheit, offen: [], laden: null, aktiv: true })
  return st.regs.length - 1
}

function setzen(st: Stock, zellen: readonly number[], r: number): void {
  for (const z of zellen) st.zelle[z] = r
}

function zellenVon(st: Stock, r: number): number[] {
  if (st.listen) return st.listen[r] ?? []
  const out: number[] = []
  for (let z = 0; z < st.zelle.length; z++) if (st.zelle[z] === r) out.push(z)
  return out
}

function freieZellen(st: Stock): number[] {
  const out: number[] = []
  for (let z = 0; z < st.zelle.length; z++) if (st.zelle[z] === -2) out.push(z)
  return out
}

/** Zusammenhaengende Stuecke (4er-Nachbarschaft) einer Zellmenge. */
let stueckPuffer = new Uint8Array(0)

function stuecke(c: Ctx, zellen: readonly number[]): number[][] {
  const F = c.feld
  const nu = F.nu
  const N = nu * F.nv
  if (stueckPuffer.length < N) stueckPuffer = new Uint8Array(N)
  const drin = stueckPuffer
  for (const z of zellen) drin[z] = 1
  const out: number[][] = []
  const stapel: number[] = []
  for (const z0 of zellen) {
    if (drin[z0] !== 1) continue
    drin[z0] = 2
    const teil = [z0]
    stapel.push(z0)
    while (stapel.length) {
      const z = stapel.pop() as number
      const i = z % nu
      if (i > 0 && drin[z - 1] === 1) {
        drin[z - 1] = 2
        teil.push(z - 1)
        stapel.push(z - 1)
      }
      if (i < nu - 1 && drin[z + 1] === 1) {
        drin[z + 1] = 2
        teil.push(z + 1)
        stapel.push(z + 1)
      }
      if (z >= nu && drin[z - nu] === 1) {
        drin[z - nu] = 2
        teil.push(z - nu)
        stapel.push(z - nu)
      }
      if (z + nu < N && drin[z + nu] === 1) {
        drin[z + nu] = 2
        teil.push(z + nu)
        stapel.push(z + nu)
      }
    }
    out.push(teil)
  }
  for (const z of zellen) drin[z] = 0
  return out.sort((a, b) => b.length - a.length)
}

/** Zellen der Menge, die an einen Flur grenzen, je Seite (0: -v, 1: +v, 2: -u, 3: +u). */
function frontVon(c: Ctx, st: Stock, zellen: readonly number[]): { zellen: number[][]; nachbar: number[][] } {
  const F = c.feld
  const out: number[][] = [[], [], [], []]
  const nb: number[][] = [[], [], [], []]
  const nu = F.nu
  const N = nu * F.nv
  const pruefe = (z: number, y: number, s: number) => {
    const r = st.zelle[y]
    if (r >= 0 && st.regs[r].art === 'flur') {
      out[s].push(z)
      nb[s].push(r)
    }
  }
  for (const z of zellen) {
    const i = z % nu
    if (z >= nu) pruefe(z, z - nu, 0)
    if (z + nu < N) pruefe(z, z + nu, 1)
    if (i > 0) pruefe(z, z - 1, 2)
    if (i < nu - 1) pruefe(z, z + 1, 3)
  }
  return { zellen: out, nachbar: nb }
}

/* ============================================================ Treppenhaus */

const STIEGEN = [
  { b: 1.2, p: 1.3, steig: 0.17, tritt: 0.28 },
  { b: 1.1, p: 1.1, steig: 0.175, tritt: 0.27 },
  { b: 1.1, p: 0.95, steig: 0.19, tritt: 0.25 },
  { b: 1.1, p: 0.85, steig: 0.215, tritt: 0.22 },
  { b: 1.1, p: 0.65, steig: 0.22, tritt: 0.2 },
]
const STIEGE_BREIT = { b: 2.0, p: 2.2, steig: 0.17, tritt: 0.3 }

function kernSuchen(c: Ctx, ziel: P, sperre: Uint8Array | null, breit: boolean): Kern | null {
  const F = c.feld
  if (c.n < 2) return null
  const bahnen: 1 | 2 = c.n >= 3 ? 2 : 1
  const spalt = 0.16
  const satSperre = sperre ? satVon(sperre, F.nu, F.nv) : null
  const eing = new Uint8Array(F.nu * F.nv)
  for (const z of c.eingang) eing[z] = 1
  const satEing = satVon(eing, F.nu, F.nv)
  const varianten = breit ? [STIEGE_BREIT, ...STIEGEN] : STIEGEN
  // Freie Zellen am Stueck nach oben, unten, links, rechts (einschliesslich der Zelle).
  const N0 = F.nu * F.nv
  const nachOben = new Int32Array(N0)
  const nachUnten = new Int32Array(N0)
  const nachLinks = new Int32Array(N0)
  const nachRechts = new Int32Array(N0)
  for (let j = 0; j < F.nv; j++) {
    for (let i = 0; i < F.nu; i++) {
      const z = j * F.nu + i
      if (!F.frei[z]) continue
      nachOben[z] = 1 + (j > 0 ? nachOben[z - F.nu] : 0)
      nachLinks[z] = 1 + (i > 0 ? nachLinks[z - 1] : 0)
    }
  }
  for (let j = F.nv - 1; j >= 0; j--) {
    for (let i = F.nu - 1; i >= 0; i--) {
      const z = j * F.nu + i
      if (!F.frei[z]) continue
      nachUnten[z] = 1 + (j < F.nv - 1 ? nachUnten[z + F.nu] : 0)
      nachRechts[z] = 1 + (i < F.nu - 1 ? nachRechts[z + 1] : 0)
    }
  }
  for (const v of varianten) {
    const stufen = Math.max(3, Math.round(c.gh / v.steig))
    const laenge = stufen * v.tritt
    const kand: { wert: number; k: Kern }[] = []
    for (const achse of [0, 1] as const) {
      const gl = achse === 0 ? F.gu : F.gv
      const gq = achse === 0 ? F.gv : F.gu
      const lz = Math.ceil(laenge / gl - 1e-6)
      const pz = Math.ceil(v.p / gl - 1e-6)
      const qn = Math.ceil((bahnen * v.b + (bahnen - 1) * spalt) / gq - 1e-6)
      const ni = achse === 0 ? 2 * pz + lz : qn
      const nj = achse === 0 ? qn : 2 * pz + lz
      if (ni > F.nu || nj > F.nv) continue
      for (let j0 = 0; j0 + nj <= F.nv; j0++) {
        for (let i0 = 0; i0 + ni <= F.nu; i0++) {
          if (satSumme(F.sat, F.nu, i0, j0, i0 + ni, j0 + nj) !== ni * nj) continue
          if (satSperre && satSumme(satSperre, F.nu, i0, j0, i0 + ni, j0 + nj) > 0) continue
          if (satSumme(satEing, F.nu, Math.max(0, i0 - 1), Math.max(0, j0 - 1), Math.min(F.nu, i0 + ni + 1), Math.min(F.nv, j0 + nj + 1)) > 0) continue
          const mu = F.u0 + (i0 + ni / 2) * F.gu
          const mv = F.v0 + (j0 + nj / 2) * F.gv
          let wert = Math.hypot(mu - ziel[0], mv - ziel[1])
          // An einer Aussenwand (eine Laengsseite ohne freie Zellen dahinter) ist besser.
          const anWand = (seite: number) => {
            if (achse === 0) {
              const j = seite < 0 ? j0 - 1 : j0 + nj
              return j < 0 || j >= F.nv || satSumme(F.sat, F.nu, i0, j, i0 + ni, j + 1) === 0
            }
            const i = seite < 0 ? i0 - 1 : i0 + ni
            return i < 0 || i >= F.nu || satSumme(F.sat, F.nu, i, j0, i + 1, j0 + nj) === 0
          }
          if (anWand(-1) || anWand(1)) wert -= 2.5
          // Ein schmaler Streifen (unter 2,4 m) zwischen Treppenhaus und Wand taugt fuer nichts.
          const luecke = (seite: number): number => {
            if (achse === 0) {
              const i = i0 + (ni >> 1)
              const j = seite < 0 ? j0 - 1 : j0 + nj
              if (j < 0 || j >= F.nv) return 0
              return (seite < 0 ? nachOben : nachUnten)[j * F.nu + i] * F.gv
            }
            const j = j0 + (nj >> 1)
            const i = seite < 0 ? i0 - 1 : i0 + ni
            if (i < 0 || i >= F.nu) return 0
            return (seite < 0 ? nachLinks : nachRechts)[j * F.nu + i] * F.gu
          }
          for (const seite of [-1, 1]) {
            const sp = luecke(seite)
            if (sp > 0.01 && sp < 2.4) wert += 3
          }
          if (kand.length >= 14 && wert >= kand[kand.length - 1].wert) continue
          const e0: P = achse === 0 ? [F.u0 + i0 * F.gu, mv] : [mu, F.v0 + j0 * F.gv]
          const e1: P = achse === 0 ? [F.u0 + (i0 + ni) * F.gu, mv] : [mu, F.v0 + (j0 + nj) * F.gv]
          const xMin = Math.hypot(e0[0] - ziel[0], e0[1] - ziel[1]) <= Math.hypot(e1[0] - ziel[0], e1[1] - ziel[1])
          const k: Kern = { achse, i0, j0, ni, nj, pz, lz, qn, xMin, bahnen, bahnB: (qn * gq - (bahnen - 1) * spalt) / bahnen, spalt, stufen }
          kand.push({ wert, k })
          kand.sort((a, b) => a.wert - b.wert)
          if (kand.length > 14) kand.pop()
        }
      }
    }
    for (const { k } of kand) if (bleibtVerbunden(c, k)) return k
  }
  return null
}

/** Zellen eines Kerns: Laeufe und die beiden Podeste. */
function kernZellen(c: Ctx, k: Kern): { lauf: number[]; x: number[]; y: number[]; bahn: Int8Array } {
  const F = c.feld
  const lauf: number[] = []
  const x: number[] = []
  const y: number[] = []
  const bahn = new Int8Array(F.nu * F.nv).fill(-1)
  const gq = k.achse === 0 ? F.gv : F.gu
  for (let dj = 0; dj < k.nj; dj++) {
    for (let di = 0; di < k.ni; di++) {
      const z = (k.j0 + dj) * F.nu + k.i0 + di
      const s = k.achse === 0 ? di : dj
      const q = k.achse === 0 ? dj : di
      if (s < k.pz) (k.xMin ? x : y).push(z)
      else if (s >= k.pz + k.lz) (k.xMin ? y : x).push(z)
      else {
        lauf.push(z)
        bahn[z] = k.bahnen === 2 && (q + 0.5) * gq > k.bahnB + k.spalt / 2 ? 1 : 0
      }
    }
  }
  return { lauf, x, y, bahn }
}

function bleibtVerbunden(c: Ctx, k: Kern): boolean {
  const F = c.feld
  const { lauf, x } = kernZellen(c, k)
  const weg = new Uint8Array(F.nu * F.nv)
  for (const z of lauf) weg[z] = 1
  const alle: number[] = []
  for (let z = 0; z < F.frei.length; z++) if (F.frei[z] && !weg[z]) alle.push(z)
  const st = stuecke(c, alle)
  if (st.length <= 1) return true
  // Kleine Reste (unter 2 m2) zaehlen nicht.
  const imGrossen = new Set(st[0])
  if (!x.every((z) => imGrossen.has(z))) return false
  return st.slice(1).every((s) => s.length * c.qm < 2)
}

/** Lage der Bahn l (0, 1) quer (lokal, Meter) und die Laengs-Enden. */
function bahnLage(c: Ctx, k: Kern, l: number): { q0: number; q1: number; s0: number; s1: number } {
  const F = c.feld
  const gl = k.achse === 0 ? F.gu : F.gv
  const Q0 = k.achse === 0 ? F.v0 + k.j0 * F.gv : F.u0 + k.i0 * F.gu
  const S0 = k.achse === 0 ? F.u0 + k.i0 * F.gu : F.v0 + k.j0 * F.gv
  const q0 = Q0 + l * (k.bahnB + k.spalt)
  return { q0, q1: q0 + k.bahnB, s0: S0 + k.pz * gl, s1: S0 + (k.pz + k.lz) * gl }
}

/** Lauf f: Bahn, Anfang (Ende bei kleinem oder grossem s). */
function laufLage(k: Kern, f: number): { bahn: number; vonKlein: boolean } {
  const bahn = k.bahnen === 2 ? f % 2 : 0
  const vonX = f % 2 === 0
  return { bahn, vonKlein: vonX === k.xMin }
}

const lokalPunkt = (k: Kern, s: number, q: number): P => (k.achse === 0 ? [s, q] : [q, s])

/* ============================================================ Gaenge */

/** Ein Weg mit Pinsel wU x wV (Zellen) von einer Menge a zu einer Menge b,
 *  nur durch begehbare freie Zellen; wenige Knicke. Gibt die Zellen des
 *  Pinsels entlang des Wegs oder null. */
function wegSuchen(c: Ctx, st: Stock, a: Uint8Array, b: Uint8Array, wU: number, wV: number): number[] | null {
  const F = c.feld
  const nu = F.nu
  const nv = F.nv
  const N = nu * nv
  const geht = new Uint8Array(N)
  for (let z = 0; z < N; z++) {
    const r = st.zelle[z]
    geht[z] = r === -2 || (r >= 0 && st.regs[r].art === 'flur') || a[z] || b[z] ? 1 : 0
  }
  const sG = satVon(geht, nu, nv)
  const sA = satVon(a, nu, nv)
  const sB = satVon(b, nu, nv)
  const oi = (wU - 1) >> 1
  const oj = (wV - 1) >> 1
  const genug = Math.min(3, wU, wV)
  /** Beruehrt der Pinsel bei (i0, j0) die Menge ueber eine Kante (nicht nur ueber Eck), mit genug Zellen? */
  const beruehrt = (s: Int32Array, i0: number, j0: number) => {
    const innen = satSumme(s, nu, i0, j0, i0 + wU, j0 + wV)
    if (innen >= genug) return true
    return (
      satSumme(s, nu, Math.max(0, i0 - 1), j0, Math.min(nu, i0 + wU + 1), j0 + wV) - innen >= genug ||
      satSumme(s, nu, i0, Math.max(0, j0 - 1), i0 + wU, Math.min(nv, j0 + wV + 1)) - innen >= genug
    )
  }
  // 1: Pinsel passt, 2: dazu Start, 4: dazu Ziel.
  const art = new Uint8Array(N)
  for (let j = oj; j - oj + wV <= nv; j++) {
    for (let i = oi; i - oi + wU <= nu; i++) {
      const i0 = i - oi
      const j0 = j - oj
      if (satSumme(sG, nu, i0, j0, i0 + wU, j0 + wV) !== wU * wV) continue
      let m = 1
      if (beruehrt(sA, i0, j0)) m |= 2
      if (beruehrt(sB, i0, j0)) m |= 4
      art[j * nu + i] = m
    }
  }
  // Breitensuche vom Ziel; dann vom naechsten Start aus zurueck, moeglichst geradeaus.
  const dist = new Int32Array(N).fill(-1)
  const schlange = new Int32Array(N)
  let kopf = 0
  let ende = 0
  for (let z = 0; z < N; z++) {
    if (art[z] & 4) {
      dist[z] = 0
      schlange[ende++] = z
    }
  }
  // Mitte des Ziels: unter gleich kurzen Wegen gewinnt der, der dort am naechsten startet.
  let zu = 0
  let zv = 0
  let zn = 0
  for (let z = 0; z < N; z++) {
    if (!(art[z] & 4)) continue
    zu += z % nu
    zv += Math.floor(z / nu)
    zn++
  }
  zu /= Math.max(1, zn)
  zv /= Math.max(1, zn)
  let start = -1
  let startD = -1
  let startW = Infinity
  while (kopf < ende) {
    const z = schlange[kopf++]
    if (startD >= 0 && dist[z] > startD) break
    if (art[z] & 2) {
      const w = Math.hypot((z % nu) - zu, Math.floor(z / nu) - zv)
      if (w < startW) {
        startW = w
        start = z
        startD = dist[z]
      }
      continue
    }
    const i = z % nu
    const d = dist[z] + 1
    if (i > 0 && art[z - 1] && dist[z - 1] < 0) {
      dist[z - 1] = d
      schlange[ende++] = z - 1
    }
    if (i < nu - 1 && art[z + 1] && dist[z + 1] < 0) {
      dist[z + 1] = d
      schlange[ende++] = z + 1
    }
    if (z >= nu && art[z - nu] && dist[z - nu] < 0) {
      dist[z - nu] = d
      schlange[ende++] = z - nu
    }
    if (z + nu < N && art[z + nu] && dist[z + nu] < 0) {
      dist[z + nu] = d
      schlange[ende++] = z + nu
    }
  }
  if (start < 0) return null
  const out: number[] = []
  const pinsel = (z: number) => {
    const i = z % nu
    const j = (z - i) / nu
    for (let y = j - oj; y < j - oj + wV; y++) for (let x = i - oi; x < i - oi + wU; x++) out.push(y * nu + x)
  }
  const schritte = [1, -1, nu, -nu]
  let z = start
  let richtung = -1
  pinsel(z)
  for (let sicher = 0; dist[z] > 0 && sicher < N; sicher++) {
    const i = z % nu
    let naechst = -1
    let nr = -1
    for (let e = 0; e < 4; e++) {
      const y = z + schritte[e]
      if (y < 0 || y >= N || (e === 0 && i === nu - 1) || (e === 1 && i === 0)) continue
      if (dist[y] !== dist[z] - 1) continue
      if (naechst < 0 || e === richtung) {
        naechst = y
        nr = e
      }
    }
    if (naechst < 0) break
    z = naechst
    richtung = nr
    pinsel(z)
  }
  return out
}

/** Gaenge: verbindet die Gruppen (Eingang, Podeste) und zieht Ruecken in
 *  Teile, die weiter als dmax vom Gang weg liegen. Gibt den Raum des Gangs. */
function zugang(c: Ctx, st: Stock, gruppen: number[][], breite: number, dmax: number, typ: RaumTyp = 'flur'): number {
  const F = c.feld
  const N = F.nu * F.nv
  const flur = neuerRaum(st, 'flur', typ)
  const netz = new Uint8Array(N)
  let imNetz = 0
  const nehmen = (zellen: readonly number[]) => {
    for (const z of zellen) {
      if (st.zelle[z] === -2) st.zelle[z] = flur
      if (st.zelle[z] >= 0 && st.regs[st.zelle[z]].art === 'flur' && !netz[z]) {
        netz[z] = 1
        imNetz++
      }
    }
  }
  const gs = gruppen.filter((g) => g.length)
  if (!gs.length) return flur
  const breiten = breite > 1.25 ? [breite, 1.25] : [breite]
  const verbinden = (ziel: Uint8Array): boolean => {
    for (const b of breiten) {
      const wU = Math.max(1, Math.round(b / F.gu))
      const wV = Math.max(1, Math.round(b / F.gv))
      const w = wegSuchen(c, st, netz, ziel, wU, wV)
      if (w) {
        nehmen(w)
        return true
      }
    }
    return false
  }
  // Reichweite (Breitensuche durch freie Zellen) ab einer Maske; ferne Zellen zurueck.
  const schritt = (F.gu + F.gv) / 2
  const dist = new Int32Array(N)
  const schlange = new Int32Array(N)
  const fernAb = (start: Uint8Array): number[] => {
    dist.fill(-1)
    let kopf = 0
    let ende = 0
    for (let z = 0; z < N; z++) {
      if (start[z]) {
        dist[z] = 0
        schlange[ende++] = z
      }
    }
    while (kopf < ende) {
      const z = schlange[kopf++]
      const i = z % F.nu
      const dz = dist[z] + 1
      if (i > 0 && dist[z - 1] < 0 && st.zelle[z - 1] === -2) {
        dist[z - 1] = dz
        schlange[ende++] = z - 1
      }
      if (i < F.nu - 1 && dist[z + 1] < 0 && st.zelle[z + 1] === -2) {
        dist[z + 1] = dz
        schlange[ende++] = z + 1
      }
      if (z >= F.nu && dist[z - F.nu] < 0 && st.zelle[z - F.nu] === -2) {
        dist[z - F.nu] = dz
        schlange[ende++] = z - F.nu
      }
      if (z + F.nu < N && dist[z + F.nu] < 0 && st.zelle[z + F.nu] === -2) {
        dist[z + F.nu] = dz
        schlange[ende++] = z + F.nu
      }
    }
    const fern: number[] = []
    for (let z = 0; z < N; z++) if (st.zelle[z] === -2 && (dist[z] < 0 || dist[z] * schritt > dmax)) fern.push(z)
    return fern
  }
  const genugFern = (fern: number[]) => fern.length * c.qm >= Math.max(8, dmax * 2)
  // Zu tief fuer den Zugang allein: zuerst ein gerader Gang durch den Hauptkoerper.
  const startM = new Uint8Array(N)
  for (const g of gs) for (const z of g) startM[z] = 1
  if (genugFern(fernAb(startM))) {
    const ruecken = rueckenIn(c, st, freieZellen(st), breite)
    if (ruecken) nehmen(ruecken)
  }
  for (const g of gs) {
    if (!imNetz || g.some((z) => netz[z])) {
      nehmen(g)
      continue
    }
    const m = new Uint8Array(N)
    for (const z of g) m[z] = 1
    verbinden(m)
    nehmen(g)
  }
  // Ruecken in Fluegel, die noch zu weit weg liegen.
  for (let runde = 0; runde < 8; runde++) {
    const fern = fernAb(netz)
    if (!genugFern(fern)) break
    const teil = stuecke(c, fern)[0]
    const ruecken = rueckenIn(c, st, teil, breite)
    if (!ruecken) break
    const m = new Uint8Array(N)
    for (const z of ruecken) m[z] = 1
    if (!verbinden(m)) break
    nehmen(ruecken)
  }
  return flur
}

/** Ein gerader Gang durch ein Teil, entlang seiner laengeren Seite. */
function rueckenIn(c: Ctx, st: Stock, teil: number[], breite: number): number[] | null {
  const F = c.feld
  let i0 = Infinity
  let i1 = -1
  let j0 = Infinity
  let j1 = -1
  let su = 0
  let sv = 0
  for (const z of teil) {
    const i = z % F.nu
    const j = (z - i) / F.nu
    i0 = Math.min(i0, i)
    i1 = Math.max(i1, i)
    j0 = Math.min(j0, j)
    j1 = Math.max(j1, j)
    su += i
    sv += j
  }
  const laengsU = (i1 - i0 + 1) * F.gu >= (j1 - j0 + 1) * F.gv
  const wU = Math.max(1, Math.round(breite / F.gu))
  const wV = Math.max(1, Math.round(breite / F.gv))
  // Nur Zellen des Teils, damit der Gang in seiner Mitte liegt.
  const imTeil = new Uint8Array(F.nu * F.nv)
  for (const z of teil) imTeil[z] = 1
  const frei = (z: number) => imTeil[z] === 1 && st.zelle[z] === -2
  let best: number[] | null = null
  let bestWert = -Infinity
  if (laengsU) {
    const mitte = sv / teil.length
    for (let j = j0; j + wV - 1 <= j1; j++) {
      let lauf = 0
      let start = i0
      for (let i = i0; i <= i1 + 1; i++) {
        let ok = i <= i1
        for (let y = j; ok && y < j + wV; y++) ok = frei(y * F.nu + i)
        if (ok) {
          if (!lauf) start = i
          lauf++
          continue
        }
        if (lauf) {
          const wert = lauf * F.gu - 1.2 * Math.abs(j + wV / 2 - mitte) * F.gv
          if (lauf * F.gu >= 3 && wert > bestWert) {
            bestWert = wert
            best = []
            for (let x = start; x < start + lauf; x++) for (let y = j; y < j + wV; y++) best.push(y * F.nu + x)
          }
        }
        lauf = 0
      }
    }
  } else {
    const mitte = su / teil.length
    for (let i = i0; i + wU - 1 <= i1; i++) {
      let lauf = 0
      let start = j0
      for (let j = j0; j <= j1 + 1; j++) {
        let ok = j <= j1
        for (let x = i; ok && x < i + wU; x++) ok = frei(j * F.nu + x)
        if (ok) {
          if (!lauf) start = j
          lauf++
          continue
        }
        if (lauf) {
          const wert = lauf * F.gv - 1.2 * Math.abs(i + wU / 2 - mitte) * F.gu
          if (lauf * F.gv >= 3 && wert > bestWert) {
            bestWert = wert
            best = []
            for (let y = start; y < start + lauf; y++) for (let x = i; x < i + wU; x++) best.push(y * F.nu + x)
          }
        }
        lauf = 0
      }
    }
  }
  return best
}

/* ============================================================ Teilen */

/** Teilt Zellen mit Schnitten quer zur Achse (0: Schnitte bei u = const)
 *  in Teile mit den Anteilen, der Reihe nach entlang der Achse. Schnitte
 *  meiden Fenster. Leere Teile moeglich. */
function teilenEntlang(c: Ctx, zellen: readonly number[], achse: 0 | 1, anteile: readonly number[], minBreite = 1.2): number[][] {
  const F = c.feld
  const k = anteile.length
  if (k <= 1 || !zellen.length) return [zellen.slice()]
  const idx = (z: number) => (achse === 0 ? z % F.nu : Math.floor(z / F.nu))
  let lo = Infinity
  let hi = -1
  for (const z of zellen) {
    const x = idx(z)
    if (x < lo) lo = x
    if (x > hi) hi = x
  }
  const n = hi - lo + 1
  const anzahl = new Int32Array(n + 1)
  for (const z of zellen) anzahl[idx(z) - lo + 1]++
  for (let x = 1; x <= n; x++) anzahl[x] += anzahl[x - 1]
  const g = achse === 0 ? F.gu : F.gv
  const strafe = achse === 0 ? c.strafeU : c.strafeV
  const minSl = Math.max(1, Math.round(minBreite / g))
  const summe = anteile.reduce((s, a) => s + Math.max(0, a), 0) || 1
  const schnitte: number[] = []
  let start = 0
  let kum = 0
  const proSl = zellen.length / n
  for (let m = 0; m < k - 1; m++) {
    kum += Math.max(0, anteile[m])
    const ziel = (zellen.length * kum) / summe
    const rest = k - 1 - m
    const bMin = start + minSl
    const bMax = n - minSl * rest
    if (bMin > bMax) {
      schnitte.push(Math.min(n, Math.max(start, bMin)))
      start = schnitte[schnitte.length - 1]
      continue
    }
    let beste = bMin
    let besteW = Infinity
    for (let b = bMin; b <= bMax; b++) {
      const abw = Math.abs(anzahl[b] - ziel) / Math.max(1, proSl)
      const w = abw + strafe[lo + b] * 1.6
      if (w < besteW) {
        besteW = w
        beste = b
      }
    }
    schnitte.push(beste)
    start = beste
  }
  const teile: number[][] = Array.from({ length: k }, () => [])
  for (const z of zellen) {
    const x = idx(z) - lo
    let m = 0
    while (m < schnitte.length && x >= schnitte[m]) m++
    teile[m].push(z)
  }
  return teile
}

/** Laengsachse der Front (die Achse, entlang der die Flur-Nachbarn liegen). */
function frontAchse(c: Ctx, st: Stock, zellen: readonly number[]): 0 | 1 {
  const f = frontVon(c, st, zellen)
  const entlangU = f.zellen[0].length + f.zellen[1].length
  const entlangV = f.zellen[2].length + f.zellen[3].length
  if (entlangU + entlangV > 0) return entlangU * c.feld.gu >= entlangV * c.feld.gv ? 0 : 1
  const F = c.feld
  let i0 = Infinity
  let i1 = -1
  let j0 = Infinity
  let j1 = -1
  for (const z of zellen) {
    const i = z % F.nu
    const j = (z - i) / F.nu
    i0 = Math.min(i0, i)
    i1 = Math.max(i1, i)
    j0 = Math.min(j0, j)
    j1 = Math.max(j1, j)
  }
  return (i1 - i0 + 1) * F.gu >= (j1 - j0 + 1) * F.gv ? 0 : 1
}

/** Einheiten an einem Gang: Block in etwa gleich grosse Teile, jedes mit Front. */
function einheitenTeilen(c: Ctx, st: Stock, block: number[], ziel: number, min: number): number[][] {
  const qm = block.length * c.qm
  let k = Math.max(1, Math.round(qm / ziel))
  while (k > 1 && qm / k < min) k--
  if (k === 1) return [block]
  const achse = frontAchse(c, st, block)
  const anteile = Array.from({ length: k }, () => 0.85 + c.rnd() * 0.3)
  const teile = teilenEntlang(c, block, achse, anteile, 2.4).filter((t) => t.length)
  // Jedes zusammenhaengende Stueck mit Front wird eine Einheit; der Rest bleibt
  // frei und geht spaeter an die Nachbarn (restVerteilen).
  const out: number[][] = []
  const g = Math.min(c.feld.gu, c.feld.gv)
  for (const t of teile) {
    for (const komp of stuecke(c, t)) {
      const f = frontVon(c, st, komp)
      const front = f.zellen.reduce((s2, x) => s2 + x.length, 0) * g
      if (front >= 1.2 && komp.length * c.qm >= min * 0.5) out.push(komp)
    }
  }
  return out.length ? out : [block]
}

/** Raeume nach Programm auf die freien Bloecke verteilen (jeder Raum am
 *  Flur). Gibt die Raeume (Index) in der Reihenfolge des Programms. */
/** Groesste sinnvolle Flaeche je Raumtyp (m2); groessere Anteile werden mehrere Raeume. */
const MAX_QM: Partial<Record<RaumTyp, number>> = {
  wc: 9,
  bad: 14,
  kueche: 28,
  teekueche: 16,
  buero: 32,
  schlafraum: 45,
  aufenthalt: 70,
  umkleide: 45,
  werkstatt: 80,
  lager: 120,
  abstell: 12,
  zimmer: 24,
  kind: 20,
  schlafen: 26,
  wohnen: 48,
}

/** So viele Raeume dieses Typs hoechstens je Programm. */
const MAX_N: Partial<Record<RaumTyp, number>> = { wc: 2, bad: 2, kueche: 1, teekueche: 1 }

function raeumeVerteilen(c: Ctx, st: Stock, programmRoh: { typ: RaumTyp; anteil: number }[], einheit = -1): number[] {
  const bloecke = stuecke(c, freieZellen(st)).filter((b) => b.length * c.qm >= 2)
  // Zu grosse Raeume werden mehrere gleiche.
  const gesamt = bloecke.reduce((s, b) => s + b.length, 0) * c.qm
  const summeRoh = programmRoh.reduce((s, p) => s + p.anteil, 0) || 1
  const herkunft: number[] = []
  const programm: { typ: RaumTyp; anteil: number }[] = []
  // Nebenraeume (WC, Kueche, Bad) nur in kleiner Zahl; der Rest geht an die anderen.
  const qms = programmRoh.map((p) => (gesamt * p.anteil) / summeRoh)
  let ueber = 0
  programmRoh.forEach((p, i) => {
    const n = MAX_N[p.typ]
    if (n === undefined) return
    const grenze = n * (MAX_QM[p.typ] ?? 1e9)
    if (qms[i] > grenze) {
      ueber += qms[i] - grenze
      qms[i] = grenze
    }
  })
  const frei = programmRoh.reduce((s, p, i) => s + (MAX_N[p.typ] === undefined ? qms[i] : 0), 0)
  if (frei > 0) programmRoh.forEach((p, i) => MAX_N[p.typ] === undefined && (qms[i] += (ueber * qms[i]) / frei))
  programmRoh.forEach((p, i) => {
    const qm = qms[i]
    const n = Math.max(1, Math.min(12, Math.ceil(qm / (MAX_QM[p.typ] ?? 1e9))))
    for (let k = 0; k < n; k++) {
      programm.push({ typ: p.typ, anteil: qm / n })
      herkunft.push(i)
    }
  })
  const alle = raeumeVerteilenGenau(c, st, bloecke, programm, einheit)
  // Je Eintrag des Programms der erste Raum (die anderen bekommen ihre Tueren ueber den Flur).
  const out: number[] = programmRoh.map(() => -1)
  alle.forEach((r, i) => {
    if (r < 0) return
    if (out[herkunft[i]] < 0) out[herkunft[i]] = r
    else anFlurAnschliessen(c, st, r)
  })
  return out
}

function raeumeVerteilenGenau(c: Ctx, st: Stock, bloecke: number[][], programm: { typ: RaumTyp; anteil: number }[], einheit: number): number[] {
  const out: number[] = programm.map(() => -1)
  if (!bloecke.length) return out
  const frei = bloecke.map((b) => b.length)
  const ganz = frei.reduce((s, x) => s + x, 0)
  const summe = programm.reduce((s, p) => s + p.anteil, 0) || 1
  const zuteilung: number[][] = bloecke.map(() => [])
  const reihe = programm.map((p, i) => ({ i, a: (p.anteil / summe) * ganz })).sort((a, b) => b.a - a.a)
  const rest = frei.slice()
  for (const r of reihe) {
    let best = 0
    for (let b = 1; b < rest.length; b++) if (rest[b] > rest[best]) best = b
    zuteilung[best].push(r.i)
    rest[best] -= r.a
  }
  bloecke.forEach((b, bi) => {
    const liste = zuteilung[bi].sort((x, y) => x - y)
    if (!liste.length) {
      // Block ohne Raum: geht an den groessten Raum daneben (spaeter).
      return
    }
    const achse = frontAchse(c, st, b)
    const teile = teilenEntlang(c, b, achse, liste.map((i) => programm[i].anteil), 1.2)
    teile.forEach((t, ti) => {
      if (!t.length) return
      const p = programm[liste[ti]]
      const r = neuerRaum(st, 'raum', p.typ, einheit)
      setzen(st, t, r)
      out[liste[ti]] = r
    })
  })
  return out
}

/** Restliche freie Zellen an Nachbarn verteilen (lieber Raeume als Gaenge). */
function restVerteilen(c: Ctx, st: Stock): void {
  const F = c.feld
  for (let runde = 0; runde < 400; runde++) {
    let geaendert = 0
    let offen = 0
    for (let z = 0; z < st.zelle.length; z++) {
      if (st.zelle[z] !== -2) continue
      offen++
      const i = z % F.nu
      const j = (z - i) / F.nu
      const n0 = i > 0 ? st.zelle[z - 1] : -1
      const n1 = i < F.nu - 1 ? st.zelle[z + 1] : -1
      const n2 = j > 0 ? st.zelle[z - F.nu] : -1
      const n3 = j < F.nv - 1 ? st.zelle[z + F.nu] : -1
      let best = -1
      let bestW = -1
      for (let q = 0; q < 4; q++) {
        const r = q === 0 ? n0 : q === 1 ? n1 : q === 2 ? n2 : n3
        if (r < 0) continue
        const R = st.regs[r]
        if (R.art === 'lauf' || R.art === 'leer') continue
        const w = (R.art === 'raum' ? 10 : R.typ === 'treppe' ? 0 : 5) + (n0 === r ? 1 : 0) + (n1 === r ? 1 : 0) + (n2 === r ? 1 : 0) + (n3 === r ? 1 : 0)
        if (w > bestW) {
          bestW = w
          best = r
        }
      }
      if (best >= 0) {
        st.zelle[z] = best
        geaendert++
      }
    }
    if (!offen || !geaendert) break
  }
  const uebrig = freieZellen(st)
  if (uebrig.length) {
    const s = neuerRaum(st, 'schacht', 'schacht')
    setzen(st, uebrig, s)
  }
}

/** Jeder Raum ein zusammenhaengendes Stueck; abgerissene gehen an Nachbarn.
 *  Gaenge zaehlen ueber alle Flurflaechen (Podeste) zusammen. */
function zusammenhalten(c: Ctx, st: Stock): void {
  const N = st.zelle.length
  for (let runde = 0; runde < 4; runde++) {
    let los = 0
    // Teile aller Flurflaechen zusammen.
    const flurZellen: number[] = []
    for (let z = 0; z < N; z++) {
      const r = st.zelle[z]
      if (r >= 0 && st.regs[r].art === 'flur') flurZellen.push(z)
    }
    const teilVon = new Int32Array(N).fill(-1)
    // Eingang (EG) und das Podest, an dem man ankommt, bleiben auf jeden Fall.
    const wichtig = new Uint8Array(N)
    if (st.k === 0) for (const z of c.eingang) wichtig[z] = 1
    const ankunft = st.regs.findIndex((R) => R.typ === 'treppe' && R.art === 'flur')
    if (ankunft >= 0) for (let z = 0; z < N; z++) if (st.zelle[z] === ankunft) wichtig[z] = 1
    // Gewicht je Teil des ganzen Flurnetzes (Eingang und Ankunft zaehlen viel).
    const gewicht: number[] = []
    stuecke(c, flurZellen).forEach((t, ti) => {
      let w = 0
      for (const z of t) {
        teilVon[z] = ti
        w += wichtig[z] ? 100000 : 1
      }
      gewicht.push(w)
    })
    const listen: number[][] = st.regs.map(() => [])
    for (let z = 0; z < N; z++) if (st.zelle[z] >= 0) listen[st.zelle[z]].push(z)
    st.regs.forEach((R, r) => {
      if (!R.aktiv || R.art === 'lauf' || R.art === 'leer') return
      const zellen = listen[r]
      if (R.art === 'flur') {
        // Der Teil des Raums im schwersten Teil des Netzes bleibt; groessere
        // abgetrennte Stuecke werden eigene Flure (die Pruefung der
        // Erreichbarkeit schliesst sie an), kleine gehen an Nachbarn.
        let best = -1
        for (const z of zellen) if (best < 0 || gewicht[teilVon[z]] > gewicht[best]) best = teilVon[z]
        const weg = new Map<number, number[]>()
        for (const z of zellen) {
          const t = teilVon[z]
          if (t === best) continue
          const l = weg.get(t)
          if (l) l.push(z)
          else weg.set(t, [z])
        }
        for (const stueck of weg.values()) {
          if (stueck.length * c.qm >= 6 && R.typ !== 'treppe') setzen(st, stueck, neuerRaum(st, 'flur', R.typ, R.einheit))
          else {
            for (const z of stueck) st.zelle[z] = -2
            los++
          }
        }
        return
      }
      const ts = stuecke(c, zellen)
      for (const t of ts.slice(1)) {
        for (const z of t) st.zelle[z] = -2
        los++
      }
    })
    if (!los) return
    restVerteilen(c, st)
  }
}

/** Engstellen glaetten: Zellen, deren Raum in Zeile oder Spalte schmaler als
 *  0,85 m ist (da passt niemand durch), gehen an den Nachbarn. Stiegen und
 *  Laeufe bleiben, wie sie sind. */
function engstellenGlaetten(c: Ctx, st: Stock): void {
  const F = c.feld
  const nu = F.nu
  const nv = F.nv
  // Raeume mindestens 0,85 m, Gaenge (und Hallen der Flure) mindestens 1,1 m breit.
  const kU = Math.max(2, Math.ceil(0.85 / F.gu - 1e-9))
  const kV = Math.max(2, Math.ceil(0.85 / F.gv - 1e-9))
  const gU = Math.max(2, Math.ceil(1.1 / F.gu - 1e-9))
  const gV = Math.max(2, Math.ceil(1.1 / F.gv - 1e-9))
  const lauf = new Int32Array(nu * nv)
  const runV = new Int32Array(nu * nv)
  const fest = (r: number) => r < 0 || st.regs[r].art === 'lauf' || st.regs[r].art === 'leer' || st.regs[r].typ === 'treppe'
  for (let runde = 0; runde < 6; runde++) {
    // Laenge des Laufs gleicher Zellen in Zeile und Spalte.
    for (let j = 0; j < nv; j++) {
      let i = 0
      while (i < nu) {
        const r = st.zelle[j * nu + i]
        let k = i
        while (k < nu && st.zelle[j * nu + k] === r) k++
        for (let x = i; x < k; x++) lauf[j * nu + x] = k - i
        i = k
      }
    }
    for (let i = 0; i < nu; i++) {
      let j = 0
      while (j < nv) {
        const r = st.zelle[j * nu + i]
        let k = j
        while (k < nv && st.zelle[k * nu + i] === r) k++
        for (let y = j; y < k; y++) runV[y * nu + i] = k - j
        j = k
      }
    }
    let geaendert = 0
    for (let z = 0; z < nu * nv; z++) {
      const r = st.zelle[z]
      if (fest(r)) continue
      const flur = st.regs[r].art === 'flur'
      if (lauf[z] >= (flur ? gU : kU) && runV[z] >= (flur ? gV : kV)) continue
      const i = z % nu
      let best = -1
      let bestW = -1
      for (const y of [i > 0 ? z - 1 : -1, i < nu - 1 ? z + 1 : -1, z - nu, z + nu]) {
        if (y < 0 || y >= nu * nv) continue
        const x = st.zelle[y]
        if (x === r || fest(x) || !st.regs[x].aktiv) continue
        const w = lauf[y] + runV[y] + (st.regs[x].einheit === st.regs[r].einheit && st.regs[r].einheit >= 0 ? 50 : 0) + (st.regs[x].art === 'raum' ? 5 : 0)
        if (w > bestW) {
          bestW = w
          best = x
        }
      }
      if (best >= 0) {
        st.zelle[z] = best
        geaendert++
      }
    }
    if (!geaendert) return
  }
}

/* ============================================================ Stock */

function stockAnfangen(c: Ctx, k: number): Stock {
  const F = c.feld
  const N = F.nu * F.nv
  const zelle = new Int32Array(N)
  for (let z = 0; z < N; z++) zelle[z] = F.frei[z] ? -2 : -1
  const st: Stock = {
    k,
    zelle,
    regs: [],
    anfragen: [],
    einheiten: 0,
    waende: [],
    extra: [],
    oeffnungen: [],
    belegt: new Uint8Array(N),
    halten: new Uint8Array(N),
    moebel: [],
    dinge: [],
    fahrzeuge: [],
    schilder: [],
    start: -1,
    bodenZonen: null,
    rnd: zufallMit((c.saat ^ Math.imul(k + 1, 0x9e3779b1)) >>> 0),
    listen: null,
    kaesten: null,
    plaetze: new Map(),
  }
  const K = c.kern
  if (K) {
    const kz = kernZellen(c, K)
    const lauf = neuerRaum(st, 'lauf', 'treppe', -1, 'Treppenlauf')
    const beruehrt = (b: number) => {
      for (const f of [k - 1, k]) if (f >= 0 && f <= c.n - 2 && laufLage(K, f).bahn === b) return true
      return false
    }
    const freiImKern: number[] = [...kz.x, ...kz.y]
    for (const z of kz.lauf) {
      if (beruehrt(kz.bahn[z])) st.zelle[z] = lauf
      else freiImKern.push(z)
    }
    // Podeste (und freie Bahnen) als Stiege; das, an dem man ankommt, zuerst.
    const aktiv = k % 2 === 0 ? kz.x : kz.y
    const teile = stuecke(c, freiImKern)
    const sortiert = teile.sort((a, b) => (b.includes(aktiv[0]) ? 1 : 0) - (a.includes(aktiv[0]) ? 1 : 0))
    for (const t of sortiert) setzen(st, t, neuerRaum(st, 'flur', 'treppe'))
  }
  return st
}

/** Ein Regelgeschoss: Raeume, Waende und Tueren wie im Vorbild, Moebel neu. */
function stockKopie(c: Ctx, v: Stock, k: number): Stock {
  const N = v.zelle.length
  const st: Stock = {
    k,
    zelle: Int32Array.from(v.zelle),
    regs: v.regs.map((R) => ({ ...R, offen: R.offen.slice() })),
    anfragen: v.anfragen.map((q) => ({ ...q })),
    einheiten: v.einheiten,
    waende: v.waende,
    extra: [],
    oeffnungen: v.oeffnungen,
    belegt: new Uint8Array(N),
    halten: new Uint8Array(N),
    moebel: [],
    dinge: [],
    fahrzeuge: [],
    schilder: [],
    start: -1,
    bodenZonen: v.bodenZonen,
    rnd: zufallMit((c.saat ^ Math.imul(k + 1, 0x9e3779b1)) >>> 0),
    listen: null,
    kaesten: null,
    plaetze: new Map(),
  }
  // Ankunft: das Podest, das in diesem Geschoss gilt.
  if (c.kern) {
    const kz = kernZellen(c, c.kern)
    const aktiv = k % 2 === 0 ? kz.x : kz.y
    const r = st.zelle[aktiv[0]]
    if (r >= 0) st.start = r
  }
  return st
}

/** Gruppen fuer die Gaenge: Eingang (EG) und das Podest, an dem man ankommt
 *  (das andere Podest ist in diesem Geschoss eine Sackgasse und geht spaeter an
 *  den Raum daneben). */
function flurGruppen(c: Ctx, st: Stock): number[][] {
  const out: number[][] = []
  if (st.k === 0) out.push(c.eingang.filter((z) => st.zelle[z] === -2))
  const r = st.regs.findIndex((R) => R.typ === 'treppe' && R.art === 'flur')
  if (r >= 0) out.push(zellenVon(st, r))
  return out
}

/** Das zweite Podest (Sackgasse) an den Raum daneben mit der laengsten Grenze. */
function sackgasseVerteilen(c: Ctx, st: Stock): void {
  const erstes = st.regs.findIndex((R) => R.typ === 'treppe' && R.art === 'flur')
  const F = c.feld
  st.regs.forEach((R, r) => {
    if (r === erstes || R.typ !== 'treppe' || R.art !== 'flur' || !R.aktiv) return
    const zz = zellenVon(st, r)
    const zaehl = new Map<number, number>()
    let gang = -1
    for (const z of zz) {
      const i = z % F.nu
      for (const y of [i > 0 ? z - 1 : -1, i < F.nu - 1 ? z + 1 : -1, z - F.nu, z + F.nu]) {
        if (y < 0 || y >= st.zelle.length) continue
        const x = st.zelle[y]
        if (x >= 0 && x !== r && st.regs[x].art === 'raum') zaehl.set(x, (zaehl.get(x) ?? 0) + 1)
        if (x >= 0 && x !== r && st.regs[x].art === 'flur' && st.regs[x].typ !== 'treppe') gang = x
      }
    }
    // Liegt ein Gang daneben, wird das Podest ein Stueck Gang (der Weg fuehrt vielleicht darueber).
    if (gang >= 0) {
      setzen(st, zz, gang)
      R.aktiv = false
      return
    }
    let best = -1
    let bestN = 0
    for (const [x, n] of zaehl) {
      if (n > bestN) {
        bestN = n
        best = x
      }
    }
    if (best < 0) return
    setzen(st, zz, best)
    R.aktiv = false
  })
}

/** Zu kleine Raeume gehen im Nachbarn derselben Einheit auf (sonst im groessten Nachbarn). */
function kleineZusammenlegen(c: Ctx, st: Stock): void {
  const F = c.feld
  const MIN: Partial<Record<RaumTyp, number>> = { bad: 3.2, wc: 1.1, vorraum: 2.2, abstell: 1.5, treppe: 0 }
  for (let runde = 0; runde < 3; runde++) {
    let geaendert = false
    const listen: number[][] = st.regs.map(() => [])
    for (let z = 0; z < st.zelle.length; z++) if (st.zelle[z] >= 0) listen[st.zelle[z]].push(z)
    st.regs.forEach((R, r) => {
      if (!R.aktiv || R.art !== 'raum') return
      const qm = listen[r].length * c.qm
      if (qm >= (MIN[R.typ] ?? 4.5)) return
      const zaehl = new Map<number, number>()
      for (const z of listen[r]) {
        const i = z % F.nu
        for (const y of [i > 0 ? z - 1 : -1, i < F.nu - 1 ? z + 1 : -1, z - F.nu, z + F.nu]) {
          if (y < 0 || y >= st.zelle.length) continue
          const x = st.zelle[y]
          if (x < 0 || x === r || !st.regs[x].aktiv || st.regs[x].art !== 'raum') continue
          zaehl.set(x, (zaehl.get(x) ?? 0) + (st.regs[x].einheit === R.einheit ? 100 : 1))
        }
      }
      let best = -1
      let bestN = 0
      for (const [x, n] of zaehl) {
        if (n > bestN) {
          bestN = n
          best = x
        }
      }
      if (best < 0) return
      setzen(st, listen[r], best)
      listen[best].push(...listen[r])
      listen[r] = []
      R.aktiv = false
      for (const q of st.anfragen) {
        if (q.a === r) q.a = best
        if (q.b === r) q.b = best
      }
      geaendert = true
    })
    if (!geaendert) return
  }
}

/** Stelle (lokal) auf der Grenze zwischen Zelle z und ihrem Nachbarn in Richtung s. */
function grenzPunkt(c: Ctx, z: number, s: number): P {
  const F = c.feld
  const i = z % F.nu
  const j = (z - i) / F.nu
  const u = F.u0 + (i + 0.5) * F.gu
  const v = F.v0 + (j + 0.5) * F.gv
  if (s === 0) return [u, v - F.gv / 2]
  if (s === 1) return [u, v + F.gv / 2]
  if (s === 2) return [u - F.gu / 2, v]
  return [u + F.gu / 2, v]
}

function anfrage(st: Stock, a: number, b: number, art: LueckeArt = 'tuer', breite = 0.9, bei: P | null = null): void {
  if (a < 0 || b < 0 || a === b) return
  st.anfragen.push({ a, b, art, breite, bei })
}

/** Raum am Flur bekommt eine Tuer zum Flur-Nachbarn mit der laengsten Front. */
function anFlurAnschliessen(c: Ctx, st: Stock, r: number, art: LueckeArt = 'tuer', breite = 0.9, zellen?: number[]): void {
  const z = zellen ?? zellenVon(st, r)
  const f = frontVon(c, st, z)
  const zaehl = new Map<number, number>()
  f.nachbar.forEach((liste) => liste.forEach((x) => zaehl.set(x, (zaehl.get(x) ?? 0) + 1)))
  let best = -1
  let bestN = 0
  for (const [x, n] of zaehl) {
    const w = n + (st.regs[x].typ === 'treppe' ? 0 : 1000)
    if (w > bestN) {
      bestN = w
      best = x
    }
  }
  if (best >= 0) anfrage(st, r, best, art, breite)
}

/* ============================================================ Wohnungen */

/** Eine Wohnung in die Zellen legen: Vorraum an der Tuer zum Gang, daneben
 *  Bad (und WC), dahinter Wohnkueche und Zimmer. */
function wohnungAnlegen(c: Ctx, st: Stock, zellen: number[], ohneWc = false): number[] {
  const F = c.feld
  const einheit = st.einheiten++
  const qm = zellen.length * c.qm
  const neu: number[] = []
  const raum = (typ: RaumTyp, z: readonly number[]) => {
    if (!z.length) return -1
    const r = neuerRaum(st, 'raum', typ, einheit)
    setzen(st, z, r)
    neu.push(r)
    return r
  }
  const f = frontVon(c, st, zellen)
  let seite = 0
  for (let s = 1; s < 4; s++) if (f.zellen[s].length > f.zellen[seite].length) seite = s
  if (!f.zellen[seite].length || qm < 16) {
    const r = raum(qm < 16 ? 'abstell' : 'wohnen', zellen)
    anFlurAnschliessen(c, st, r)
    return neu
  }
  // Tuer: Mitte der Front auf dieser Seite.
  const laengs: 0 | 1 = seite < 2 ? 0 : 1
  const lIdx = (z: number) => (laengs === 0 ? z % F.nu : Math.floor(z / F.nu))
  const qIdx = (z: number) => (laengs === 0 ? Math.floor(z / F.nu) : z % F.nu)
  const fr = f.zellen[seite].slice().sort((a, b) => lIdx(a) - lIdx(b))
  const tuerZelle = fr[fr.length >> 1]
  const flurNb = f.nachbar[seite][fr.indexOf(tuerZelle)]
  const ld = lIdx(tuerZelle)
  const qd = qIdx(tuerZelle)
  const sgn = seite === 0 || seite === 2 ? 1 : -1
  const gl = laengs === 0 ? F.gu : F.gv
  const gq = laengs === 0 ? F.gv : F.gu
  const tiefe = (z: number) => (qIdx(z) - qd) * sgn
  let tMax = 0
  for (const z of zellen) tMax = Math.max(tMax, tiefe(z))
  const tiefeM = (tMax + 1) * gq
  const zimmer = qm < 40 ? 0 : qm < 60 ? 1 : qm < 84 ? 2 : 3
  const mitWc = !ohneWc && qm >= 64
  const fz = tiefeM >= 6.5 ? Math.round(2.4 / gq) : tiefeM >= 4.5 ? Math.round(Math.min(2.1, tiefeM * 0.42) / gq) : 0
  const front = fz > 0 ? zellen.filter((z) => tiefe(z) >= 0 && tiefe(z) < fz) : []
  const vorne: number[] = []
  const bad: number[] = []
  const wc: number[] = []
  let hinten: number[] = []
  if (front.length) {
    let l0 = Infinity
    let l1 = -1
    for (const z of front) {
      l0 = Math.min(l0, lIdx(z))
      l1 = Math.max(l1, lIdx(z))
    }
    const wV = Math.max(1, Math.round(1.8 / gl))
    const wB = Math.max(1, Math.round(2.4 / gl))
    const wBmin = Math.max(1, Math.round(1.7 / gl))
    const wW = Math.max(1, Math.round(1.35 / gl))
    const v0 = klemm(ld - (wV >> 1), l0, Math.max(l0, l1 - wV + 1))
    const v1 = v0 + wV - 1
    const links = v0 - l0
    const rechts = l1 - v1
    let b0 = -1
    let b1 = -2
    let w0 = -1
    let w1 = -2
    if (links >= rechts) {
      if (links >= wBmin) {
        b1 = v0 - 1
        b0 = Math.max(l0, v0 - wB)
      }
      if (mitWc && rechts >= wW) {
        w0 = v1 + 1
        w1 = v1 + wW
      }
    } else {
      if (rechts >= wBmin) {
        b0 = v1 + 1
        b1 = Math.min(l1, v1 + wB)
      }
      if (mitWc && links >= wW) {
        w1 = v0 - 1
        w0 = v0 - wW
      }
    }
    // Ohne Platz fuer das Bad kommt es nach hinten.
    for (const z of zellen) {
      const t = tiefe(z)
      const l = lIdx(z)
      if (t >= 0 && t < fz) {
        if (l >= v0 && l <= v1) vorne.push(z)
        else if (l >= b0 && l <= b1) bad.push(z)
        else if (l >= w0 && l <= w1) wc.push(z)
        else hinten.push(z)
      } else hinten.push(z)
    }
  } else {
    // Flach: Vorraum ein Streifen an der Tuer, der Rest nach hinten.
    const wV = Math.max(1, Math.round(1.6 / gl))
    const v0 = ld - (wV >> 1)
    const tz = Math.max(1, Math.round(Math.min(2.0, tiefeM * 0.5) / gq))
    for (const z of zellen) {
      const l = lIdx(z)
      if (l >= v0 && l < v0 + wV && tiefe(z) >= 0 && tiefe(z) < tz) vorne.push(z)
      else hinten.push(z)
    }
  }
  // Hinten: Wohnkueche (am Vorraum) und Zimmer nebeneinander.
  const istBadHinten = !bad.length
  const hintenTeile: { typ: RaumTyp; anteil: number }[] = []
  const nz = zimmer
  for (let i = 0; i < nz; i++) hintenTeile.push({ typ: i === 0 && nz >= 2 ? 'schlafen' : i > 0 ? 'kind' : 'zimmer', anteil: 1 })
  if (istBadHinten && qm >= 22) hintenTeile.push({ typ: 'bad', anteil: 0.45 })
  // Wohnkueche an die Stelle, die dem Vorraum am naechsten liegt.
  let h0 = Infinity
  let h1 = -1
  for (const z of hinten) {
    h0 = Math.min(h0, lIdx(z))
    h1 = Math.max(h1, lIdx(z))
  }
  const p = h1 > h0 ? klemm((ld - h0) / (h1 - h0), 0, 1) : 0.5
  const kHinten = hintenTeile.length + 1
  const wIdx = Math.round(p * (kHinten - 1))
  hintenTeile.splice(wIdx, 0, { typ: 'wohnen', anteil: zimmer === 0 ? 2 : 1.7 })
  const teile = hinten.length ? teilenEntlang(c, hinten, laengs, hintenTeile.map((x) => x.anteil), 2.0) : []
  const rV = raum('vorraum', vorne)
  const rB = raum('bad', bad)
  const rW = raum('wc', wc)
  // Zu tiefe Streifen: innen ein Abstellraum (oder Kueche, Zimmer), aussen der Raum mit Fenster.
  const innenR: number[] = []
  teile.forEach((t, i) => {
    if (!t.length) return
    const breiteZ = new Set(t.map(lIdx)).size * gl
    let tmin = Infinity
    let tmax = -Infinity
    for (const z of t) {
      tmin = Math.min(tmin, tiefe(z))
      tmax = Math.max(tmax, tiefe(z))
    }
    const tiefeZ = (tmax - tmin + 1) * gq
    const qmT = t.length * c.qm
    if (tiefeZ < 2.1 * breiteZ || qmT < 16 || tiefeZ < 5.6) return
    const quer: 0 | 1 = laengs === 0 ? 1 : 0
    // teilenEntlang ordnet nach wachsendem Index; Tiefe waechst mit sgn.
    const innenAnteil = Math.min(0.5, Math.max(0.3, (tiefeZ - 4.6) / tiefeZ))
    const zwei = teilenEntlang(c, t, quer, sgn > 0 ? [innenAnteil, 1 - innenAnteil] : [1 - innenAnteil, innenAnteil], 1.5)
    const [innen, aussen] = sgn > 0 ? zwei : [zwei[1], zwei[0]]
    if (!innen.length || !aussen.length) return
    teile[i] = aussen
    const typ: RaumTyp = innen.length * c.qm < 7 ? 'abstell' : hintenTeile[i].typ === 'wohnen' ? 'kueche' : 'zimmer'
    innenR.push(-1)
    const r = raum(typ, innen)
    innenR[innenR.length - 1] = r
  })
  const hintenR = teile.map((t, i) => raum(hintenTeile[i].typ, t))
  if (rV >= 0) anfrage(st, rV, flurNb, 'tuer', 0.9, grenzPunkt(c, tuerZelle, seite))
  else if (hintenR[wIdx] >= 0) anfrage(st, hintenR[wIdx], flurNb, 'tuer', 0.9, grenzPunkt(c, tuerZelle, seite))
  const zentral = rV >= 0 ? rV : hintenR[wIdx]
  if (rB >= 0) anfrage(st, zentral, rB)
  if (rW >= 0) anfrage(st, zentral, rW)
  const rWohn = hintenR[wIdx]
  hintenR.forEach((r, i) => {
    if (r < 0 || r === zentral) return
    anfrage(st, zentral, r, i === wIdx ? 'durchgang' : 'tuer', i === wIdx ? 1.0 : 0.9)
    if (rWohn >= 0 && r !== rWohn) anfrage(st, rWohn, r)
  })
  for (const r of innenR) {
    if (r < 0) continue
    anfrage(st, zentral, r)
    if (rWohn >= 0) anfrage(st, rWohn, r, st.regs[r].typ === 'kueche' ? 'durchgang' : 'tuer', st.regs[r].typ === 'kueche' ? 1.2 : 0.9)
    for (const x of hintenR) if (x >= 0 && x !== rWohn) anfrage(st, x, r)
  }
  return neu
}

/* ============================================================ Programme */

type Programm = (c: Ctx, st: Stock) => void

/** Achse und Richtung von der Haustuer ins Haus (lokal): 0 = u, 1 = v; sgn +1 wachsend. */
function tuerAchse(c: Ctx): { achse: 0 | 1; sgn: number } {
  const t = c.tuer
  if (!t) return { achse: 1, sgn: 1 }
  return Math.abs(t.nl[0]) >= Math.abs(t.nl[1]) ? { achse: 0, sgn: t.nl[0] >= 0 ? 1 : -1 } : { achse: 1, sgn: t.nl[1] >= 0 ? 1 : -1 }
}

/** Zellen nach Tiefe ab der Haustuer (Meter, entlang der Tuerachse). */
function tiefeAbTuer(c: Ctx, z: number): number {
  const F = c.feld
  const { achse, sgn } = tuerAchse(c)
  const i = z % F.nu
  const j = (z - i) / F.nu
  const t = c.tuer
  const ref = t ? t.ml : [F.u0, F.v0]
  if (achse === 0) return (F.u0 + (i + 0.5) * F.gu - ref[0]) * sgn
  return (F.v0 + (j + 0.5) * F.gv - ref[1]) * sgn
}

/** Teilt entlang der Tuerachse in Teile von der Tuer weg. */
function teilenVonTuer(c: Ctx, zellen: readonly number[], anteile: number[], min = 1.2): number[][] {
  const { achse, sgn } = tuerAchse(c)
  const teile = teilenEntlang(c, zellen, achse, sgn > 0 ? anteile : anteile.slice().reverse(), min)
  return sgn > 0 ? teile : teile.reverse()
}

const wohnenProgramm: Programm = (c, st) => {
  zugang(c, st, flurGruppen(c, st), 1.4, 7.5)
  for (const b of stuecke(c, freieZellen(st))) {
    if (b.length * c.qm < 10) continue
    for (const t of einheitenTeilen(c, st, b, 60 + c.rnd() * 18, 28)) wohnungAnlegen(c, st, t)
  }
}

const hausProgramm: Programm = (c, st) => {
  const gruppen = flurGruppen(c, st)
  if (st.k === 0 && c.eingang.length) {
    // Vorraum an der Haustuer.
    const vr = c.eingang.filter((z) => st.zelle[z] === -2)
    const extra = freieZellen(st).filter((z) => {
      const t = tiefeAbTuer(c, z)
      if (t > AW + 2.2) return false
      const F = c.feld
      const i = z % F.nu
      const j = (z - i) / F.nu
      const tu = c.tuer as Tuer
      const du = F.u0 + (i + 0.5) * F.gu - tu.ml[0]
      const dv = F.v0 + (j + 0.5) * F.gv - tu.ml[1]
      return Math.abs(du * tu.ul[0] + dv * tu.ul[1]) <= 1.0
    })
    const r = neuerRaum(st, 'flur', 'vorraum')
    setzen(st, [...new Set([...vr, ...extra])], r)
    gruppen[0] = zellenVon(st, r)
  }
  zugang(c, st, gruppen, 1.2, 5.5)
  const qm = freieZellen(st).length * c.qm
  if (st.k === 0) {
    const pr: { typ: RaumTyp; anteil: number }[] = [
      { typ: 'wohnen', anteil: 0.46 },
      { typ: 'kueche', anteil: 0.18 },
      { typ: 'wc', anteil: 0.05 },
    ]
    if (qm > 45) pr.push({ typ: 'zimmer', anteil: 0.2 })
    if (qm > 70) pr.push({ typ: 'abstell', anteil: 0.06 })
    const rs = raeumeVerteilen(c, st, pr, 0)
    rs.forEach((r) => r >= 0 && anFlurAnschliessen(c, st, r))
    if (rs[0] >= 0 && rs[1] >= 0) anfrage(st, rs[0], rs[1], 'durchgang', 1.2)
  } else {
    const pr: { typ: RaumTyp; anteil: number }[] = [
      { typ: 'schlafen', anteil: 0.34 },
      { typ: 'bad', anteil: 0.16 },
      { typ: 'kind', anteil: 0.25 },
    ]
    if (qm > 50) pr.push({ typ: 'kind', anteil: 0.22 })
    if (qm > 75) pr.push({ typ: 'abstell', anteil: 0.06 })
    raeumeVerteilen(c, st, pr, 0).forEach((r) => r >= 0 && anFlurAnschliessen(c, st, r))
  }
}

const ladenProgramm: Programm = (c, st) => {
  if (st.k > 0) {
    if (freieZellen(st).length * c.qm >= 40) wohnenProgramm(c, st)
    else einRaum(c, st, 'lager')
    return
  }
  const zellen = freieZellen(st)
  const qm = zellen.length * c.qm
  const teile = qm >= 30 ? teilenVonTuer(c, zellen, [0.76, 0.24], 1.5) : [zellen]
  const v = neuerRaum(st, 'raum', 'verkauf', st.einheiten++)
  setzen(st, teile[0], v)
  st.regs[v].laden = c.e.name ? { name: c.e.name, art: 'shop' } : null
  if (teile[1]?.length) {
    const hinten = teile[1]
    const wcAnteil = Math.min(0.28, 3 / Math.max(1, hinten.length * c.qm))
    const sub = hinten.length * c.qm >= 12 ? teilenEntlang(c, hinten, tuerAchse(c).achse === 0 ? 1 : 0, [1 - wcAnteil, wcAnteil], 1.2) : [hinten]
    const l = neuerRaum(st, 'raum', 'lager', st.regs[v].einheit)
    setzen(st, sub[0], l)
    anfrage(st, v, l)
    if (sub[1]?.length) {
      const w = neuerRaum(st, 'raum', 'wc', st.regs[v].einheit)
      setzen(st, sub[1], w)
      anfrage(st, l, w)
      anfrage(st, v, w)
    }
  }
  treppeAnschliessen(c, st)
}

/** Ein Geschoss als ein Raum (mit Stiege). */
function einRaum(c: Ctx, st: Stock, typ: RaumTyp): number {
  const r = neuerRaum(st, 'raum', typ, st.einheiten++)
  setzen(st, freieZellen(st), r)
  treppeAnschliessen(c, st)
  return r
}

/** Podeste ohne Gang an die Raeume daneben anschliessen (Durchgang). */
function treppeAnschliessen(c: Ctx, st: Stock): void {
  st.regs.forEach((R, r) => {
    if (R.typ !== 'treppe' || R.art !== 'flur') return
    const zz = zellenVon(st, r)
    const F = c.feld
    const zaehl = new Map<number, number>()
    for (const z of zz) {
      const i = z % F.nu
      const j = (z - i) / F.nu
      for (const y of [i > 0 ? z - 1 : -1, i < F.nu - 1 ? z + 1 : -1, j > 0 ? z - F.nu : -1, j < F.nv - 1 ? z + F.nu : -1]) {
        if (y < 0) continue
        const x = st.zelle[y]
        if (x >= 0 && x !== r && st.regs[x].art === 'raum') zaehl.set(x, (zaehl.get(x) ?? 0) + 1)
      }
    }
    let best = -1
    let bestN = 0
    for (const [x, n] of zaehl) {
      if (n > bestN) {
        bestN = n
        best = x
      }
    }
    if (best >= 0) anfrage(st, r, best, 'durchgang', 1.1)
  })
}

const supermarktProgramm: Programm = (c, st) => {
  if (st.k > 0) {
    zugang(c, st, flurGruppen(c, st), 1.6, 8)
    const rs = raeumeVerteilen(c, st, [
      { typ: 'lager', anteil: 0.55 },
      { typ: 'buero', anteil: 0.2 },
      { typ: 'aufenthalt', anteil: 0.17 },
      { typ: 'wc', anteil: 0.08 },
    ])
    rs.forEach((r) => r >= 0 && anFlurAnschliessen(c, st, r))
    return
  }
  const zellen = freieZellen(st)
  const teile = teilenVonTuer(c, zellen, [0.8, 0.2], 3)
  const e = st.einheiten++
  const v = neuerRaum(st, 'raum', 'verkauf', e)
  setzen(st, teile[0], v)
  st.regs[v].laden = c.e.name ? { name: c.e.name, art: 'supermarket' } : null
  if (teile[1]?.length) {
    const quer = tuerAchse(c).achse === 0 ? 1 : 0
    const qmH = Math.max(1, teile[1].length * c.qm)
    const bA = Math.min(0.22, 18 / qmH)
    const wA = Math.min(0.16, 6 / qmH)
    const sub = teilenEntlang(c, teile[1], quer, [1 - bA - wA, bA, wA], 1.4)
    const typen: RaumTyp[] = ['lager', 'buero', 'wc']
    const rs = sub.map((t, i) => {
      if (!t.length) return -1
      const r = neuerRaum(st, 'raum', typen[i], e)
      setzen(st, t, r)
      return r
    })
    if (rs[0] >= 0) anfrage(st, v, rs[0], 'durchgang', 1.6)
    if (rs[1] >= 0) anfrage(st, rs[0] >= 0 ? rs[0] : v, rs[1])
    if (rs[2] >= 0) anfrage(st, rs[0] >= 0 ? rs[0] : v, rs[2])
  }
  treppeAnschliessen(c, st)
}

/** Ladenarten fuer Einkaufszentren ohne Liste (erfunden, allgemein). */
const LAEDEN_ERSATZ: { name: string; art: string }[] = [
  { name: 'Mode', art: 'clothes' },
  { name: 'Cafe', art: 'cafe' },
  { name: 'Schuhe', art: 'shoes' },
  { name: 'Drogerie', art: 'chemist' },
  { name: 'Buecher', art: 'books' },
  { name: 'Elektro', art: 'electronics' },
  { name: 'Baeckerei', art: 'bakery' },
  { name: 'Spielwaren', art: 'toys' },
]

const einkaufProgramm: Programm = (c, st) => {
  const flur = zugang(c, st, flurGruppen(c, st), c.feld.gu > 0.45 ? 4.8 : 4.2, 14, 'mall')
  const laeden = c.e.laeden && c.e.laeden.length ? c.e.laeden : LAEDEN_ERSATZ
  for (const b of stuecke(c, freieZellen(st))) {
    if (b.length * c.qm < 12) continue
    for (const t of einheitenTeilen(c, st, b, 95 + c.rnd() * 60, 30)) {
      const e = st.einheiten++
      const qm = t.length * c.qm
      const teile = qm >= 110 ? tiefTeilen(c, st, t, [0.82, 0.18]) : [t]
      const r = neuerRaum(st, 'raum', 'laden', e)
      setzen(st, teile[0], r)
      const l = laeden[c.ladenNr++ % laeden.length]
      st.regs[r].laden = { name: String(l.name ?? '').slice(0, 40), art: String(l.art ?? '') }
      st.regs[r].name = st.regs[r].laden.name || NAMEN.laden
      const f = frontVon(c, st, teile[0])
      const front = f.zellen.reduce((s, x) => s + x.length, 0) * Math.min(c.feld.gu, c.feld.gv)
      anfrage(st, r, flur, 'front', klemm(front * 0.6, 1.6, 4.2))
      if (teile[1]?.length) {
        const lg = neuerRaum(st, 'raum', 'lager', e)
        setzen(st, teile[1], lg)
        anfrage(st, r, lg)
      }
    }
  }
}

/** Teilt eine Einheit nach Tiefe ab ihrer Front (vorne zuerst). */
function tiefTeilen(c: Ctx, st: Stock, zellen: number[], anteile: number[]): number[][] {
  const f = frontVon(c, st, zellen)
  let seite = 0
  for (let s = 1; s < 4; s++) if (f.zellen[s].length > f.zellen[seite].length) seite = s
  const achse: 0 | 1 = seite < 2 ? 1 : 0
  const vorneKlein = seite === 0 || seite === 2
  const teile = teilenEntlang(c, zellen, achse, vorneKlein ? anteile : anteile.slice().reverse(), 2)
  return vorneKlein ? teile : teile.reverse()
}

const feuerwehrProgramm: Programm = (c, st) => {
  if (st.k === 0) {
    const ht = hallenTiefe(c)
    const halle = freieZellen(st).filter((z) => tiefeAbTuer(c, z) <= ht)
    const h = neuerRaum(st, 'raum', 'fahrzeughalle', st.einheiten++)
    setzen(st, halle, h)
    st.start = h
    zugang(c, st, flurGruppen(c, st).slice(1), 1.4, 6)
    const rs = raeumeVerteilen(c, st, [
      { typ: 'umkleide', anteil: 0.38 },
      { typ: 'werkstatt', anteil: 0.3 },
      { typ: 'lager', anteil: 0.2 },
      { typ: 'wc', anteil: 0.1 },
    ])
    rs.forEach((r) => {
      if (r < 0) return
      anFlurAnschliessen(c, st, r)
      anfrage(st, h, r)
    })
    treppeAnschliessen(c, st)
    return
  }
  zugang(c, st, flurGruppen(c, st), 1.4, 6.5)
  raeumeVerteilen(c, st, [
    { typ: 'aufenthalt', anteil: 0.34 },
    { typ: 'kueche', anteil: 0.15 },
    { typ: 'buero', anteil: 0.15 },
    { typ: 'schlafraum', anteil: 0.26 },
    { typ: 'wc', anteil: 0.1 },
  ]).forEach((r) => r >= 0 && anFlurAnschliessen(c, st, r))
}

function hallenTiefe(c: Ctx): number {
  let tMax = 0
  for (let z = 0; z < c.feld.frei.length; z++) if (c.feld.frei[z]) tMax = Math.max(tMax, tiefeAbTuer(c, z))
  return tMax <= 14 ? tMax * 0.66 : Math.min(14, tMax * 0.72)
}

/** Einheiten am Gang mit Typen: die groessten, kleinsten bekommen eigene. */
function amGang(c: Ctx, st: Stock, breite: number, dmax: number, ziel: number, min: number, typ: RaumTyp, sonder: { typ: RaumTyp; wo: 'gross' | 'klein' }[]): number[] {
  zugang(c, st, flurGruppen(c, st), breite, dmax)
  const einheiten: number[][] = []
  for (const b of stuecke(c, freieZellen(st))) {
    if (b.length * c.qm < 6) continue
    einheiten.push(...einheitenTeilen(c, st, b, ziel * (0.85 + c.rnd() * 0.3), min))
  }
  const typen: RaumTyp[] = einheiten.map(() => typ)
  const nachGroesse = einheiten.map((t, i) => ({ i, n: t.length })).sort((a, b) => a.n - b.n)
  let lo = 0
  let hi = nachGroesse.length - 1
  for (const s of sonder) {
    if (lo > hi) break
    if (s.wo === 'klein') typen[nachGroesse[lo++].i] = s.typ
    else typen[nachGroesse[hi--].i] = s.typ
  }
  return einheiten.map((t, i) => {
    const r = neuerRaum(st, 'raum', typen[i], st.einheiten++)
    setzen(st, t, r)
    anFlurAnschliessen(c, st, r, 'tuer', 0.9, t)
    return r
  })
}

const spitalProgramm: Programm = (c, st) => {
  if (st.k === 0 && c.eingang.length) {
    const lobby = freieZellen(st).filter((z) => tiefeAbTuer(c, z) <= AW + 6.5 && querAbTuer(c, z) <= 6)
    const l = neuerRaum(st, 'flur', 'lobby')
    setzen(st, lobby, l)
    const g = flurGruppen(c, st)
    g[0] = zellenVon(st, l)
    zugang(c, st, g, 2.2, 7)
    const einheiten: number[][] = []
    for (const b of stuecke(c, freieZellen(st))) if (b.length * c.qm >= 6) einheiten.push(...einheitenTeilen(c, st, b, 22, 9))
    const sorte = einheiten.map((t, i) => ({ i, n: t.length })).sort((a, b) => a.n - b.n)
    einheiten.forEach((t, i) => {
      const rang = sorte.findIndex((s) => s.i === i)
      const typ: RaumTyp = rang === 0 ? 'wc' : rang === 1 ? 'buero' : rang === sorte.length - 1 ? 'station' : 'behandlung'
      const r = neuerRaum(st, 'raum', typ, st.einheiten++)
      setzen(st, t, r)
      anFlurAnschliessen(c, st, r, 'tuer', 0.9, t)
    })
    return
  }
  amGang(c, st, 2.2, 7, 24, 10, 'patient', [
    { typ: 'wc', wo: 'klein' },
    { typ: 'station', wo: 'klein' },
    { typ: 'aufenthalt', wo: 'gross' },
  ])
}

function querAbTuer(c: Ctx, z: number): number {
  const t = c.tuer
  if (!t) return 0
  const F = c.feld
  const i = z % F.nu
  const j = (z - i) / F.nu
  return Math.abs((F.u0 + (i + 0.5) * F.gu - t.ml[0]) * t.ul[0] + (F.v0 + (j + 0.5) * F.gv - t.ml[1]) * t.ul[1])
}

const schuleProgramm: Programm = (c, st) => {
  amGang(c, st, 2.4, 8, 58, 24, 'klasse', st.k === 0 ? [{ typ: 'wc', wo: 'klein' }, { typ: 'direktion', wo: 'klein' }, { typ: 'lehrer', wo: 'klein' }] : [{ typ: 'wc', wo: 'klein' }, { typ: 'lehrer', wo: 'klein' }])
}

const kindergartenProgramm: Programm = (c, st) => {
  amGang(c, st, 1.8, 7, 40, 14, 'gruppe', st.k === 0 ? [{ typ: 'wc', wo: 'klein' }, { typ: 'garderobe', wo: 'klein' }, { typ: 'kueche', wo: 'klein' }] : [{ typ: 'wc', wo: 'klein' }, { typ: 'abstell', wo: 'klein' }])
}

const bueroProgramm: Programm = (c, st) => {
  amGang(c, st, 1.6, 6, 19, 8, 'buero', [
    { typ: 'wc', wo: 'klein' },
    { typ: 'teekueche', wo: 'klein' },
    { typ: 'besprechung', wo: 'gross' },
  ])
}

function emporeTiefe(c: Ctx): number {
  const K = c.kern
  let t = 4.5
  if (K) {
    const F = c.feld
    for (let dj = 0; dj < K.nj; dj++) for (let di = 0; di < K.ni; di++) t = Math.max(t, tiefeAbTuer(c, (K.j0 + dj) * F.nu + K.i0 + di) + 1.6)
  }
  return t
}

const kircheProgramm: Programm = (c, st) => {
  if (st.k === 0) {
    const zellen = freieZellen(st)
    const teile = teilenVonTuer(c, zellen, [0.86, 0.14], 2.4)
    const s = neuerRaum(st, 'raum', 'schiff', st.einheiten++)
    setzen(st, teile[0], s)
    st.start = s
    if (teile[1]?.length) {
      const quer = tuerAchse(c).achse === 0 ? 1 : 0
      const sub = teilenEntlang(c, teile[1], quer, [0.38, 0.62], 1.6)
      if (sub[0].length * c.qm >= 5) {
        const sk = neuerRaum(st, 'raum', 'sakristei', st.regs[s].einheit)
        setzen(st, sub[0], sk)
        anfrage(st, s, sk)
        setzen(st, sub[1], s)
      } else setzen(st, teile[1], s)
    }
    treppeAnschliessen(c, st)
    return
  }
  const tief = emporeTiefe(c)
  const zellen = freieZellen(st)
  const empore = zellen.filter((z) => tiefeAbTuer(c, z) <= tief)
  const rest = zellen.filter((z) => tiefeAbTuer(c, z) > tief)
  const e = neuerRaum(st, 'flur', 'empore')
  setzen(st, empore, e)
  if (rest.length) setzen(st, rest, neuerRaum(st, 'leer', 'leer'))
  st.start = e
  // Boden nur unter der Empore (und dem Treppenhaus).
  const F = c.feld
  const { achse, sgn } = tuerAchse(c)
  const t = c.tuer
  const ref = t ? (achse === 0 ? t.ml[0] : t.ml[1]) : achse === 0 ? F.u0 : F.v0
  const grenze = ref + sgn * (tief + (achse === 0 ? F.gu : F.gv) * 0.5)
  const weit = 1e4
  const lo = sgn > 0 ? -weit : grenze
  const hi = sgn > 0 ? grenze : weit
  st.bodenZonen = [achse === 0 ? [lo, -weit, hi, weit] : [-weit, lo, weit, hi]]
}

const halleProgramm: Programm = (c, st) => {
  if (st.k > 0) {
    einRaum(c, st, freieZellen(st).length * c.qm > 30 ? 'lager' : 'dachboden')
    return
  }
  const zellen = freieZellen(st)
  const qm = zellen.length * c.qm
  const h = neuerRaum(st, 'raum', 'halle', st.einheiten++)
  st.start = h
  if (qm >= 110 && c.tuer) {
    const vorne = zellen.filter((z) => tiefeAbTuer(c, z) <= AW + 4)
    const quer = tuerAchse(c).achse === 0 ? 1 : 0
    const sub = teilenEntlang(c, vorne, quer, [0.24, 0.76], 2.4)
    const seite = sub[0].some((z) => c.eingang.includes(z)) ? 1 : 0
    const buero = sub[seite]
    if (buero.length * c.qm >= 8 && !buero.some((z) => c.eingang.includes(z))) {
      const b = neuerRaum(st, 'raum', 'buero', st.regs[h].einheit)
      setzen(st, buero, b)
      anfrage(st, h, b)
    }
  }
  setzen(st, freieZellen(st), h)
  treppeAnschliessen(c, st)
}

const garageProgramm: Programm = (c, st) => {
  const r = einRaum(c, st, st.k === 0 ? 'garage' : 'dachboden')
  if (st.k === 0) st.start = r
}

const schuppenProgramm: Programm = (c, st) => {
  const r = einRaum(c, st, st.k === 0 ? 'schuppen' : 'dachboden')
  if (st.k === 0) st.start = r
}

const sonstProgramm: Programm = (c, st) => {
  if (c.n >= 3 || freieZellen(st).length * c.qm > 600) bueroProgramm(c, st)
  else halleProgramm(c, st)
}

const PROGRAMME: Record<StadtHausArt, Programm> = {
  wohnen: wohnenProgramm,
  haus: hausProgramm,
  laden: ladenProgramm,
  supermarkt: supermarktProgramm,
  einkaufszentrum: einkaufProgramm,
  feuerwehr: feuerwehrProgramm,
  spital: spitalProgramm,
  schule: schuleProgramm,
  kindergarten: kindergartenProgramm,
  kirche: kircheProgramm,
  buero: bueroProgramm,
  halle: halleProgramm,
  garage: garageProgramm,
  schuppen: schuppenProgramm,
  sonst: sonstProgramm,
}

/* ============================================================ Waende */

const WAND_DICK = { art: 'wand', dicke: 0.2 } as const
const WAND_DUENN = { art: 'wand', dicke: 0.1 } as const
const GELAENDER = { art: 'gelaender', dicke: 0.06 } as const

function wandTyp(st: Stock, a: number, b: number): { readonly art: 'wand' | 'gelaender'; readonly dicke: number } | null {
  if (a === b || a < 0 || b < 0) return null
  const A = st.regs[a]
  const B = st.regs[b]
  if (A.art === 'lauf' || B.art === 'lauf') {
    const o = A.art === 'lauf' ? B : A
    return o.art === 'raum' || o.art === 'schacht' ? WAND_DICK : null
  }
  if (A.art === 'leer' || B.art === 'leer') return A.art === B.art ? null : GELAENDER
  if (A.art === 'flur' && B.art === 'flur') return null
  if ((A.offen.length && A.offen.includes(b)) || (B.offen.length && B.offen.includes(a))) return null
  if (A.einheit >= 0 && A.einheit === B.einheit && A.art === 'raum' && B.art === 'raum') return WAND_DUENN
  return WAND_DICK
}

/** Abstand vom Punkt p in Richtung d bis zum naechsten Ring (lokal), sonst Infinity. */
function strahlRing(c: Ctx, p: P, d: P, max: number): number {
  let best = Infinity
  for (const r of c.ringeL) {
    for (let i = 0; i < r.length; i++) {
      const a = r[i]
      const b = r[(i + 1) % r.length]
      const ex = b[0] - a[0]
      const ez = b[1] - a[1]
      const den = d[0] * ez - d[1] * ex
      if (Math.abs(den) < 1e-12) continue
      const t = ((a[0] - p[0]) * ez - (a[1] - p[1]) * ex) / den
      const s = ((a[0] - p[0]) * d[1] - (a[1] - p[1]) * d[0]) / den
      if (t > 1e-6 && t <= max && s >= -1e-9 && s <= 1 + 1e-9 && t < best) best = t
    }
  }
  return best
}

function waendeBauen(c: Ctx, st: Stock): void {
  const F = c.feld
  const nu = F.nu
  const nv = F.nv
  const z = st.zelle
  const out: WandL[] = []
  const neu = (achse: 0 | 1, linie: number, i0: number, a: number, b: number, t: { readonly art: 'wand' | 'gelaender'; readonly dicke: number }): WandL => ({
    achse,
    linie,
    i0,
    i1: i0 + 1,
    ra: a,
    rb: b,
    art: t.art,
    dicke: t.dicke,
    p0: [0, 0],
    p1: [0, 0],
    s0: 0,
    luecken: [],
  })
  for (let j = 0; j <= nv; j++) {
    let w: WandL | null = null
    for (let i = 0; i < nu; i++) {
      const a = j > 0 ? z[(j - 1) * nu + i] : -1
      const b = j < nv ? z[j * nu + i] : -1
      const t = wandTyp(st, a, b)
      if (t && w && w.ra === a && w.rb === b && w.i1 === i) {
        w.i1++
        continue
      }
      if (w) out.push(w)
      w = t ? neu(0, j, i, a, b, t) : null
    }
    if (w) out.push(w)
  }
  for (let i = 0; i <= nu; i++) {
    let w: WandL | null = null
    for (let j = 0; j < nv; j++) {
      const a = i > 0 ? z[j * nu + i - 1] : -1
      const b = i < nu ? z[j * nu + i] : -1
      const t = wandTyp(st, a, b)
      if (t && w && w.ra === a && w.rb === b && w.i1 === j) {
        w.i1++
        continue
      }
      if (w) out.push(w)
      w = t ? neu(1, i, j, a, b, t) : null
    }
    if (w) out.push(w)
  }
  for (const w of out) wandEnden(c, st, w)
  st.waende = out
}

/** Endpunkte einer Wand, an der Aussenwand bis in sie hinein verlaengert. */
function wandEnden(c: Ctx, st: Stock, w: WandL): void {
  const F = c.feld
  const z = st.zelle
  const nu = F.nu
  const nv = F.nv
  let p0: P
  let p1: P
  let d: P
  // Zellen jenseits der Enden (beide Seiten der Linie).
  const jenseits = (vorn: boolean): [number, number] => {
    const x = vorn ? w.i0 - 1 : w.i1
    if (w.achse === 0) {
      if (x < 0 || x >= nu) return [-1, -1]
      return [w.linie > 0 ? z[(w.linie - 1) * nu + x] : -1, w.linie < nv ? z[w.linie * nu + x] : -1]
    }
    if (x < 0 || x >= nv) return [-1, -1]
    return [w.linie > 0 ? z[x * nu + w.linie - 1] : -1, w.linie < nu ? z[x * nu + w.linie] : -1]
  }
  if (w.achse === 0) {
    const v = F.v0 + w.linie * F.gv
    p0 = [F.u0 + w.i0 * F.gu, v]
    p1 = [F.u0 + w.i1 * F.gu, v]
    d = [1, 0]
  } else {
    const u = F.u0 + w.linie * F.gu
    p0 = [u, F.v0 + w.i0 * F.gv]
    p1 = [u, F.v0 + w.i1 * F.gv]
    d = [0, 1]
  }
  let vor = 0
  let nach = 0
  const gl = w.achse === 0 ? F.gu : F.gv
  /** Wie weit die Linie ueber das Ende hinaus nur am Saum (Aussenwand) entlang laeuft:
   *  sobald beidseits wieder Zellen eines Raums liegen, ist Schluss. */
  const imSaum = (vorn: boolean): number => {
    for (let k = 0; k < 40; k++) {
      const x = vorn ? w.i0 - 1 - k : w.i1 + k
      let a = -1
      let b = -1
      if (w.achse === 0) {
        if (x < 0 || x >= nu) return Infinity
        a = w.linie > 0 ? z[(w.linie - 1) * nu + x] : -1
        b = w.linie < nv ? z[w.linie * nu + x] : -1
      } else {
        if (x < 0 || x >= nv) return Infinity
        a = w.linie > 0 ? z[x * nu + w.linie - 1] : -1
        b = w.linie < nu ? z[x * nu + w.linie] : -1
      }
      if (a !== -1 && b !== -1) return k * gl
    }
    return Infinity
  }
  const [a0, b0] = jenseits(true)
  if (a0 === -1 || b0 === -1) {
    const t = strahlRing(c, p0, [-d[0], -d[1]], AW + 2.5)
    vor = Math.min(Number.isFinite(t) ? t : 0.1, imSaum(true))
  } else vor = 0.1
  const [a1, b1] = jenseits(false)
  if (a1 === -1 || b1 === -1) {
    const t = strahlRing(c, p1, d, AW + 2.5)
    nach = Math.min(Number.isFinite(t) ? t : 0.1, imSaum(false))
  } else nach = 0.1
  if (w.art === 'gelaender') {
    vor = Math.min(vor, 0.03)
    nach = Math.min(nach, 0.03)
  }
  // Trifft die Verlaengerung ein Fenster, endet die Wand an der Innenseite der Aussenwand.
  const vorFenster = (p: P, sgn: number, lang: number): number => {
    if (lang <= 0.1) return lang
    const q: P = [p[0] + d[0] * sgn * lang, p[1] + d[1] * sgn * lang]
    for (const f of c.fensterL) {
      if (st.k === 0 && !f.eg) continue
      const du = q[0] - f.c[0]
      const dv = q[1] - f.c[1]
      // Auf der Fassade bei diesem Fenster (quer hoechstens die Wanddicke weg)?
      const entlang = du * f.d[0] + dv * f.d[1]
      const quer = Math.abs(-du * f.d[1] + dv * f.d[0])
      if (Math.abs(entlang) > FENSTER_B / 2 + 0.08 || quer > AW + 0.05) continue
      // Senkrechter Abstand von p zur Fassade und wie schnell er entlang d abnimmt.
      const n0 = -(p[0] - f.c[0]) * f.d[1] + (p[1] - f.c[1]) * f.d[0]
      const nd = -d[0] * sgn * f.d[1] + d[1] * sgn * f.d[0]
      if (Math.abs(nd) < 1e-6) continue
      const x = (Math.abs(n0) - AW - 0.01) / Math.abs(nd)
      return Math.max(0, Math.min(lang, x))
    }
    return lang
  }
  vor = vorFenster(p0, -1, vor)
  nach = vorFenster(p1, 1, nach)
  // Nie in die Oeffnung der Haustuer hinein: dort endet die Wand an der Innenseite.
  const t = c.tuer
  if (t) {
    const inTuer = (q: P) => {
      const du = q[0] - t.ml[0]
      const dv = q[1] - t.ml[1]
      return Math.abs(du * t.ul[0] + dv * t.ul[1]) < t.breite / 2 + 0.12 && du * t.nl[0] + dv * t.nl[1] < AW + 0.05
    }
    const kuerzen = (p: P, sgn: number, lang: number): number => {
      for (let x = lang; x > 0; x -= 0.05) if (!inTuer([p[0] + d[0] * sgn * x, p[1] + d[1] * sgn * x])) return x
      return 0
    }
    if (vor > 0.1 && inTuer([p0[0] - d[0] * vor, p0[1] - d[1] * vor])) vor = kuerzen(p0, -1, vor)
    if (nach > 0.1 && inTuer([p1[0] + d[0] * nach, p1[1] + d[1] * nach])) nach = kuerzen(p1, 1, nach)
  }
  w.p0 = [p0[0] - d[0] * vor, p0[1] - d[1] * vor]
  w.p1 = [p1[0] + d[0] * nach, p1[1] + d[1] * nach]
  w.s0 = vor
}

/** Oeffnungen aus den Anfragen in die Waende setzen. */
function oeffnungenSetzen(c: Ctx, st: Stock): void {
  const F = c.feld
  for (const w of st.waende) w.luecken = []
  st.oeffnungen = []
  const nachPaar = new Map<number, WandL[]>()
  const schluessel = (a: number, b: number) => (a < b ? a * 100003 + b : b * 100003 + a)
  for (const w of st.waende) {
    if (w.art !== 'wand' || w.ra < 0 || w.rb < 0) continue
    const k = schluessel(w.ra, w.rb)
    const l = nachPaar.get(k)
    if (l) l.push(w)
    else nachPaar.set(k, [w])
  }
  const gesehen = new Set<number>()
  for (const q of st.anfragen) {
    if (!st.regs[q.a]?.aktiv || !st.regs[q.b]?.aktiv) continue
    const k = schluessel(q.a, q.b)
    if (gesehen.has(k)) continue
    const ws = nachPaar.get(k)
    if (!ws) continue
    const gz = (w: WandL) => (w.achse === 0 ? F.gu : F.gv)
    let best: WandL | null = null
    let bestW = -Infinity
    for (const w of ws) {
      const L = (w.i1 - w.i0) * gz(w)
      if (L < Math.min(q.breite, 0.9) + 0.24) continue
      let wert = L
      if (q.bei) {
        const m: P = [(w.p0[0] + w.p1[0]) / 2, (w.p0[1] + w.p1[1]) / 2]
        wert = -Math.hypot(m[0] - q.bei[0], m[1] - q.bei[1]) + Math.min(L, 2)
      }
      if (wert > bestW) {
        bestW = wert
        best = w
      }
    }
    if (!best) continue
    const L = (best.i1 - best.i0) * gz(best)
    const breite = q.art === 'front' ? klemm(q.breite, 1.2, L - 0.5) : Math.min(q.breite, L - 0.24)
    let s = L / 2
    if (q.bei) s = best.achse === 0 ? q.bei[0] - (F.u0 + best.i0 * F.gu) : q.bei[1] - (F.v0 + best.i0 * F.gv)
    s = klemm(s, breite / 2 + 0.12, L - breite / 2 - 0.12)
    const hoehe = q.art === 'front' ? Math.min(2.6, c.gh - DECKE_M - 0.35) : q.art === 'durchgang' ? Math.min(2.2, c.gh - DECKE_M - 0.3) : TUER_INNEN_H
    best.luecken.push({ t0: best.s0 + s - breite / 2, t1: best.s0 + s + breite / 2, art: q.art, hoehe })
    const dir: P = best.achse === 0 ? [1, 0] : [0, 1]
    const mitte: P = [best.p0[0] + dir[0] * (best.s0 + s), best.p0[1] + dir[1] * (best.s0 + s)]
    st.oeffnungen.push({ c: mitte, w: dir, breite, art: q.art, ra: best.ra, rb: best.rb, wand: best })
    gesehen.add(k)
  }
}

/** Erreichbarkeit im Graph der Raeume; fehlende Tueren dazu, Kleines zusammenlegen. */
function erreichbarMachen(c: Ctx, st: Stock): void {
  const F = c.feld
  for (let runde = 0; runde < 8; runde++) {
    waendeBauen(c, st)
    oeffnungenSetzen(c, st)
    // Nachbarschaft: Laenge der gemeinsamen Grenze und ob eine Wand dazwischen steht.
    const nb = new Map<number, { a: number; b: number; laenge: number; wand: boolean; offenL: number }>()
    const add = (a: number, b: number, l: number) => {
      if (a < 0 || b < 0 || a === b) return
      const x = a < b ? a : b
      const y = a < b ? b : a
      const k = x * 100003 + y
      let e = nb.get(k)
      if (!e) {
        e = { a: x, b: y, laenge: 0, wand: wandTyp(st, x, y) !== null, offenL: 0 }
        nb.set(k, e)
      }
      e.laenge += l
      if (!e.wand) e.offenL += l
    }
    for (let j = 0; j < F.nv; j++) {
      for (let i = 0; i < F.nu; i++) {
        const z = j * F.nu + i
        const r = st.zelle[z]
        if (r < 0) continue
        if (i + 1 < F.nu && st.zelle[z + 1] !== r) add(r, st.zelle[z + 1], F.gv)
        if (j + 1 < F.nv && st.zelle[z + F.nu] !== r) add(r, st.zelle[z + F.nu], F.gu)
      }
    }
    const geht = (r: number) => st.regs[r].aktiv && (st.regs[r].art === 'flur' || st.regs[r].art === 'raum')
    const kanten = new Map<number, number[]>()
    const verbinde = (a: number, b: number) => {
      if (!kanten.has(a)) kanten.set(a, [])
      if (!kanten.has(b)) kanten.set(b, [])
      ;(kanten.get(a) as number[]).push(b)
      ;(kanten.get(b) as number[]).push(a)
    }
    for (const e of nb.values()) if (geht(e.a) && geht(e.b) && e.offenL >= 0.6) verbinde(e.a, e.b)
    for (const o of st.oeffnungen) verbinde(o.ra, o.rb)
    const start = startRaum(c, st)
    const erreicht = new Set<number>()
    if (start >= 0) {
      const q = [start]
      erreicht.add(start)
      while (q.length) {
        const r = q.pop() as number
        for (const x of kanten.get(r) ?? []) {
          if (!erreicht.has(x)) {
            erreicht.add(x)
            q.push(x)
          }
        }
      }
    }
    const fehlt = st.regs.map((_, r) => r).filter((r) => geht(r) && !erreicht.has(r) && st.regs[r].art !== 'leer')
    if (!fehlt.length) return
    let neueTuer = false
    let zusammen = false
    for (const r of fehlt) {
      // Bester erreichter Nachbar mit genug Wand fuer eine Tuer.
      let best = -1
      let bestW = -Infinity
      let gross = -1
      let grossL = 0
      for (const e of nb.values()) {
        if (e.a !== r && e.b !== r) continue
        const x = e.a === r ? e.b : e.a
        if (!geht(x)) continue
        if (e.laenge > grossL && st.regs[x].art !== 'leer') {
          grossL = e.laenge
          gross = x
        }
        if (!erreicht.has(x) || !e.wand || e.laenge < 1.2) continue
        const t = wandTyp(st, r, x)
        if (!t || t.art !== 'wand') continue
        const R = st.regs[r]
        const X = st.regs[x]
        const w = e.laenge + (X.einheit === R.einheit && R.einheit >= 0 ? 20 : 0) + (X.art === 'flur' && X.typ !== 'treppe' ? 10 : 0) + (X.typ === 'vorraum' ? 5 : 0)
        if (w > bestW) {
          bestW = w
          best = x
        }
      }
      if (best >= 0) {
        anfrage(st, r, best, st.regs[best].typ === 'treppe' || st.regs[r].typ === 'treppe' ? 'durchgang' : 'tuer', 0.9)
        erreicht.add(r)
        neueTuer = true
        continue
      }
      const qm = zellenVon(st, r).length * c.qm
      if (gross >= 0 && (qm < 6 || st.regs[r].art === 'flur' || runde >= 3)) {
        for (let z = 0; z < st.zelle.length; z++) if (st.zelle[z] === r) st.zelle[z] = gross
        st.regs[r].aktiv = false
        for (const q of st.anfragen) {
          if (q.a === r) q.a = gross
          if (q.b === r) q.b = gross
        }
        zusammen = true
      }
    }
    if (!neueTuer && !zusammen) {
      for (const r of fehlt) st.regs[r].art = 'schacht'
      waendeBauen(c, st)
      oeffnungenSetzen(c, st)
      return
    }
  }
  waendeBauen(c, st)
  oeffnungenSetzen(c, st)
}

function startRaum(c: Ctx, st: Stock): number {
  if (st.start >= 0 && st.regs[st.start].aktiv) return st.start
  if (st.k === 0) {
    for (const z of c.eingang) {
      const r = st.zelle[z]
      if (r >= 0 && st.regs[r].aktiv) return r
    }
  }
  // Das Podest, an dem man ankommt (zuerst angelegt).
  for (let r = 0; r < st.regs.length; r++) if (st.regs[r].typ === 'treppe' && st.regs[r].art === 'flur' && st.regs[r].aktiv) return r
  for (let r = 0; r < st.regs.length; r++) if (st.regs[r].aktiv && st.regs[r].art !== 'lauf' && st.regs[r].art !== 'leer') return r
  return -1
}

/** Gelaender und Sperren am Treppenhaus in Geschoss k. */
function treppeSperren(c: Ctx, st: Stock): void {
  const K = c.kern
  st.extra = []
  if (!K) return
  const F = c.feld
  const k = st.k
  const dick = 0.08
  const linie = (s0: number, q0: number, s1: number, q1: number, art: 'gelaender' | 'sperre') => {
    const p0 = lokalPunkt(K, s0, q0)
    const p1 = lokalPunkt(K, s1, q1)
    st.extra.push({ achse: 0, linie: 0, i0: 0, i1: 0, ra: -1, rb: -1, art, dicke: dick, p0, p1, s0: 0, luecken: [] })
  }
  /** Ist quer bei q (lokal, Meter) entlang der Bahn ein Raum (Wand) daneben? */
  const nebenWand = (q: number, s0: number, s1: number): boolean => {
    let wand = 0
    let alle = 0
    const gl = K.achse === 0 ? F.gu : F.gv
    for (let s = s0 + gl / 2; s < s1; s += gl) {
      const p = lokalPunkt(K, s, q)
      const i = Math.floor((p[0] - F.u0) / F.gu)
      const j = Math.floor((p[1] - F.v0) / F.gv)
      alle++
      if (i < 0 || j < 0 || i >= F.nu || j >= F.nv) {
        wand++
        continue
      }
      const r = st.zelle[j * F.nu + i]
      if (r < 0 || st.regs[r].art === 'raum' || st.regs[r].art === 'schacht') wand++
    }
    return alle > 0 && wand / alle > 0.6
  }
  for (const f of [k - 1, k]) {
    if (f < 0 || f > c.n - 2) continue
    const { bahn, vonKlein } = laufLage(K, f)
    const L = bahnLage(c, K, bahn)
    const kommt = f === k - 1
    const sichtbar = kommt
    // Seiten (knapp ausserhalb der Bahn).
    for (const [q, aussen] of [
      [L.q0 - dick / 2, -1],
      [L.q1 + dick / 2, 1],
    ] as const) {
      const q2 = q + aussen * 0.12
      const wand = nebenWand(q2, L.s0, L.s1)
      linie(L.s0 - (kommt ? dick : 0), q, L.s1 + (kommt ? dick : 0), q, sichtbar && !wand ? 'gelaender' : 'sperre')
    }
    // Gesperrtes Ende: beim ankommenden Lauf sein Anfang, beim abgehenden sein Ende.
    const anfangKlein = vonKlein
    const sperrKlein = kommt ? anfangKlein : !anfangKlein
    const s = sperrKlein ? L.s0 - dick / 2 : L.s1 + dick / 2
    // Steht dahinter ein Raum (Wand), reicht die unsichtbare Sperre.
    const hinter = lokalPunkt(K, sperrKlein ? L.s0 - 0.2 : L.s1 + 0.2, (L.q0 + L.q1) / 2)
    const hi = Math.floor((hinter[0] - F.u0) / F.gu)
    const hj = Math.floor((hinter[1] - F.v0) / F.gv)
    const hr = hi >= 0 && hj >= 0 && hi < F.nu && hj < F.nv ? st.zelle[hj * F.nu + hi] : -1
    const wandDahinter = hr < 0 || st.regs[hr].art === 'raum' || st.regs[hr].art === 'schacht'
    linie(s, L.q0 - dick, s, L.q1 + dick, sichtbar && !wandDahinter ? 'gelaender' : 'sperre')
  }
}

/* ============================================================ Moebel */

interface Vorlage {
  art: MoebelArt
  b: number
  t: number
  h: number
  oben: number | null
  hindernis?: boolean
  ablage?: number | null
  /** Hoch: nicht vor Fenster. */
  hoch?: boolean
}

const V = (art: MoebelArt, b: number, t: number, h: number, oben: number | null, ablage: number | null = null, hoch = false, hindernis = true): Vorlage => ({ art, b, t, h, oben, ablage, hoch, hindernis })

interface WandPlatz {
  achse: 0 | 1
  /** Lage der Wandlinie quer (lokal, Meter). */
  linie: number
  a: number
  b: number
  /** Richtung in den Raum quer: +1 oder -1. */
  rein: 1 | -1
  aussen: boolean
  versatz: number
}

/** Freihalten: vor allen Oeffnungen, am Eingang und auf den Podesten. */
function freihalten(c: Ctx, st: Stock): void {
  const F = c.feld
  st.halten.fill(0)
  const zone = (cx: number, cz: number, wx: number, wz: number, breite: number, tief: number) => {
    const nx = -wz
    const nz = wx
    const r = Math.max(breite / 2, tief) + 0.6
    const i0 = Math.max(0, Math.floor((cx - r - F.u0) / F.gu))
    const i1 = Math.min(F.nu - 1, Math.floor((cx + r - F.u0) / F.gu))
    const j0 = Math.max(0, Math.floor((cz - r - F.v0) / F.gv))
    const j1 = Math.min(F.nv - 1, Math.floor((cz + r - F.v0) / F.gv))
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const du = F.u0 + (i + 0.5) * F.gu - cx
        const dv = F.v0 + (j + 0.5) * F.gv - cz
        if (Math.abs(du * wx + dv * wz) <= breite / 2 + 0.3 && Math.abs(du * nx + dv * nz) <= tief) st.halten[j * F.nu + i] = 1
      }
    }
  }
  for (const o of st.oeffnungen) zone(o.c[0], o.c[1], o.w[0], o.w[1], o.breite, o.art === 'front' ? 1.6 : 1.05)
  if (st.k === 0 && c.tuer) zone(c.tuer.ml[0], c.tuer.ml[1], c.tuer.ul[0], c.tuer.ul[1], c.tuer.breite, AW + (c.art === 'garage' ? 0.9 : 1.6))
  for (let z = 0; z < st.zelle.length; z++) {
    const r = st.zelle[z]
    if (r >= 0 && (st.regs[r].typ === 'treppe' || st.regs[r].art === 'lauf')) st.halten[z] = 1
  }
  // Offene Uebergaenge (ohne Wand zwischen zwei begehbaren Raeumen): 1,2 m rundum frei.
  const nu = F.nu
  const ru = Math.ceil(1.2 / F.gu)
  const rv = Math.ceil(1.2 / F.gv)
  const begehbar = (r: number) => r >= 0 && (st.regs[r].art === 'flur' || st.regs[r].art === 'raum')
  const rand: number[] = []
  for (let z = 0; z < st.zelle.length; z++) {
    const a = st.zelle[z]
    if (!begehbar(a)) continue
    const i = z % nu
    for (const y of [i < nu - 1 ? z + 1 : -1, z + nu < st.zelle.length ? z + nu : -1]) {
      if (y < 0) continue
      const b = st.zelle[y]
      if (b === a || !begehbar(b) || wandTyp(st, a, b)) continue
      rand.push(z)
      break
    }
  }
  for (const z of rand) {
    const i = z % nu
    const j = (z - i) / nu
    for (let y = Math.max(0, j - rv); y <= Math.min(F.nv - 1, j + rv); y++) for (let x = Math.max(0, i - ru); x <= Math.min(nu - 1, i + ru); x++) st.halten[y * nu + x] = 1
  }
  // Vor den freien Enden der Laeufe.
  const K = c.kern
  if (K) {
    for (const f of [st.k - 1, st.k]) {
      if (f < 0 || f > c.n - 2) continue
      const { bahn, vonKlein } = laufLage(K, f)
      const L = bahnLage(c, K, bahn)
      const kommt = f === st.k - 1
      const klein = kommt ? !vonKlein : vonKlein
      const s = klein ? L.s0 - 0.8 : L.s1 + 0.8
      const p = lokalPunkt(K, s, (L.q0 + L.q1) / 2)
      const w: P = K.achse === 0 ? [0, 1] : [1, 0]
      zone(p[0], p[1], w[0], w[1], L.q1 - L.q0, 1.0)
    }
  }
}

function wandPlaetze(c: Ctx, st: Stock, r: number): WandPlatz[] {
  const schon = st.plaetze.get(r)
  if (schon) return schon
  const F = c.feld
  const nu = F.nu
  const nv = F.nv
  type Kante = { achse: 0 | 1; linie: number; pos: number; rein: 1 | -1; aussen: boolean; dicke: number }
  const kanten: Kante[] = []
  const dickeZu = (x: number) => {
    if (x < 0) return 0
    const t = wandTyp(st, r, x)
    return t ? t.dicke : -1
  }
  for (const z of zellenVon(st, r)) {
    const i = z % nu
    const j = (z - i) / nu
    const nb: [number, 0 | 1, number, 1 | -1, number][] = [
      [j > 0 ? st.zelle[z - nu] : -1, 0, j, 1, i],
      [j < nv - 1 ? st.zelle[z + nu] : -1, 0, j + 1, -1, i],
      [i > 0 ? st.zelle[z - 1] : -1, 1, i, 1, j],
      [i < nu - 1 ? st.zelle[z + 1] : -1, 1, i + 1, -1, j],
    ]
    for (const [x, achse, linie, rein, pos] of nb) {
      if (x === r) continue
      const d = dickeZu(x)
      if (d < 0) continue
      kanten.push({ achse, linie, pos, rein, aussen: x < 0, dicke: d })
    }
  }
  kanten.sort((a, b) => a.achse - b.achse || a.linie - b.linie || a.rein - b.rein || (a.aussen ? 1 : 0) - (b.aussen ? 1 : 0) || a.pos - b.pos)
  const out: WandPlatz[] = []
  let lauf: { k: Kante; von: number; bis: number } | null = null
  const fertig = () => {
    if (!lauf) return
    const k = lauf.k
    const g = k.achse === 0 ? F.gu : F.gv
    const o = k.achse === 0 ? F.u0 : F.v0
    const q = k.achse === 0 ? F.v0 + k.linie * F.gv : F.u0 + k.linie * F.gu
    out.push({ achse: k.achse, linie: q, a: o + lauf.von * g, b: o + (lauf.bis + 1) * g, rein: k.rein, aussen: k.aussen, versatz: k.aussen ? 0.01 : k.dicke / 2 + 0.01 })
    lauf = null
  }
  for (const k of kanten) {
    if (lauf && lauf.k.achse === k.achse && lauf.k.linie === k.linie && lauf.k.rein === k.rein && lauf.k.aussen === k.aussen && lauf.k.dicke === k.dicke && k.pos === lauf.bis + 1) {
      lauf.bis = k.pos
      continue
    }
    fertig()
    lauf = { k, von: k.pos, bis: k.pos }
  }
  fertig()
  out.sort((a, b) => b.b - b.a - (a.b - a.a))
  st.plaetze.set(r, out)
  return out
}

/** Sind alle Zellen des Rechtecks (lokal) im Raum und frei? */
function rechteckFrei(c: Ctx, st: Stock, r: number, u0: number, v0: number, u1: number, v1: number, halten = true): boolean {
  const F = c.feld
  const e = 0.03
  const i0 = Math.floor((u0 + e - F.u0) / F.gu)
  const i1 = Math.ceil((u1 - e - F.u0) / F.gu) - 1
  const j0 = Math.floor((v0 + e - F.v0) / F.gv)
  const j1 = Math.ceil((v1 - e - F.v0) / F.gv) - 1
  if (i0 < 0 || j0 < 0 || i1 >= F.nu || j1 >= F.nv || i1 < i0 || j1 < j0) return false
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      const z = j * F.nu + i
      if (st.zelle[z] !== r || st.belegt[z] || (halten && st.halten[z])) return false
    }
  }
  return true
}

function belegen(c: Ctx, st: Stock, u0: number, v0: number, u1: number, v1: number, rand = 0): void {
  const F = c.feld
  const e = 0.03
  const i0 = Math.max(0, Math.floor((u0 - rand + e - F.u0) / F.gu))
  const i1 = Math.min(F.nu - 1, Math.ceil((u1 + rand - e - F.u0) / F.gu) - 1)
  const j0 = Math.max(0, Math.floor((v0 - rand + e - F.v0) / F.gv))
  const j1 = Math.min(F.nv - 1, Math.ceil((v1 + rand - e - F.v0) / F.gv) - 1)
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) st.belegt[j * F.nu + i] = 1
}

function moebelSetzen(st: Stock, r: number, v: Vorlage, c0: P, d: P, ton: number, text?: string): MoebelL {
  const m: MoebelL = { art: v.art, c: c0, d, b: v.b, t: v.t, h: v.h, oben: v.oben, hindernis: v.hindernis !== false, ton, ablage: v.ablage ?? null, raum: r, text }
  st.moebel.push(m)
  return m
}

/** Fussabdruck (lokal) eines Moebels mit Vorderseite d. */
function abdruck(c0: P, d: P, b: number, t: number): [number, number, number, number] {
  const quer = d[0] !== 0
  const hu = quer ? t / 2 : b / 2
  const hv = quer ? b / 2 : t / 2
  return [c0[0] - hu, c0[1] - hv, c0[0] + hu, c0[1] + hv]
}

/** Ein Moebel an eine Wand des Raums stellen. vorn: Platz davor frei halten (Meter). */
function anWand(
  c: Ctx,
  st: Stock,
  r: number,
  v: Vorlage,
  opts: { innen?: boolean; aussen?: boolean; vorn?: number; ecke?: boolean; nicht?: WandPlatz[] } = {},
): { m: MoebelL; p: WandPlatz } | null {
  const plaetze = wandPlaetze(c, st, r)
  const vorn = opts.vorn ?? 0
  const reihe = plaetze.filter((p) => (opts.innen ? !p.aussen : true) && (opts.aussen ? p.aussen : true) && !(opts.nicht ?? []).some((x) => x.achse === p.achse && Math.abs(x.linie - p.linie) < 1e-6))
  if (opts.innen || opts.aussen) reihe.push(...plaetze.filter((p) => !reihe.includes(p) && !(opts.nicht ?? []).some((x) => x.achse === p.achse && Math.abs(x.linie - p.linie) < 1e-6)))
  for (const p of reihe) {
    if (p.b - p.a < v.b + 0.04) continue
    // Fenster auf dieser Wand sperren hohe Moebel.
    const sperren: [number, number][] = []
    if (p.aussen && v.hoch) {
      for (const f of c.fensterL) {
        if (st.k === 0 && !f.eg) continue
        const parallel = p.achse === 0 ? Math.abs(f.d[0]) > 0.85 : Math.abs(f.d[1]) > 0.85
        if (!parallel) continue
        const quer = p.achse === 0 ? f.c[1] : f.c[0]
        if (Math.abs(quer - p.linie) > AW + 0.7) continue
        const m = p.achse === 0 ? f.c[0] : f.c[1]
        sperren.push([m - FENSTER_B / 2 - 0.1, m + FENSTER_B / 2 + 0.1])
      }
    }
    const kand: number[] = []
    const n = Math.max(1, Math.floor((p.b - p.a - v.b) / 0.3))
    if (opts.ecke !== false) kand.push(p.a + 0.02, p.b - v.b - 0.02)
    kand.push((p.a + p.b - v.b) / 2)
    for (let i = 1; i < n; i++) kand.push(p.a + 0.02 + ((p.b - p.a - v.b - 0.04) * i) / n)
    for (const s of kand) {
      if (sperren.some(([a, b]) => s < b && s + v.b > a)) continue
      const q0 = p.linie + p.rein * p.versatz
      const q1 = q0 + p.rein * v.t
      const qv = q1 + p.rein * vorn
      const [lo, hi] = [Math.min(q0, qv), Math.max(q0, qv)]
      const ok = p.achse === 0 ? rechteckFrei(c, st, r, s, lo, s + v.b, hi) : rechteckFrei(c, st, r, lo, s, hi, s + v.b)
      if (!ok) continue
      const qm = (q0 + q1) / 2
      const c0: P = p.achse === 0 ? [s + v.b / 2, qm] : [qm, s + v.b / 2]
      const d: P = p.achse === 0 ? [0, p.rein] : [p.rein, 0]
      const [a0, b0, a1, b1] = abdruck(c0, d, v.b, v.t)
      belegen(c, st, a0, b0, a1, b1)
      return { m: moebelSetzen(st, r, v, c0, d, st.rnd()), p }
    }
  }
  return null
}

/** Groesstes freies Rechteck im Raum (Zellen), ohne Belegtes und Gehaltenes. */
function freiesRechteck(c: Ctx, st: Stock, r: number, halten = true): { u0: number; v0: number; u1: number; v1: number } | null {
  const F = c.feld
  const [i0, j0, i1, j1] = rahmenVon(c, st, r)
  if (i1 < 0) return null
  const w = i1 - i0 + 1
  const hoehe = new Int32Array(w)
  let best = 0
  let erg: [number, number, number, number] | null = null
  for (let j = j0; j <= j1; j++) {
    for (let i = 0; i < w; i++) {
      const z = j * F.nu + i0 + i
      const ok = st.zelle[z] === r && !st.belegt[z] && !(halten && st.halten[z])
      hoehe[i] = ok ? hoehe[i] + 1 : 0
    }
    const stapel: number[] = []
    for (let i = 0; i <= w; i++) {
      const h = i < w ? hoehe[i] : 0
      while (stapel.length && hoehe[stapel[stapel.length - 1]] >= h) {
        const top = stapel.pop() as number
        const hh = hoehe[top]
        const links = stapel.length ? stapel[stapel.length - 1] + 1 : 0
        const flaeche = hh * F.gv * (i - links) * F.gu
        if (flaeche > best) {
          best = flaeche
          erg = [i0 + links, j - hh + 1, i0 + i, j + 1]
        }
      }
      stapel.push(i)
    }
  }
  if (!erg) return null
  return { u0: F.u0 + erg[0] * F.gu, v0: F.v0 + erg[1] * F.gv, u1: F.u0 + erg[2] * F.gu, v1: F.v0 + erg[3] * F.gv }
}

/** Ein Moebel frei in die Mitte des groessten freien Rechtecks. */
function frei(c: Ctx, st: Stock, r: number, v: Vorlage, rand: number, d?: P): MoebelL | null {
  const q = freiesRechteck(c, st, r)
  if (!q) return null
  const lu = q.u1 - q.u0
  const lv = q.v1 - q.v0
  const dir: P = d ?? (lu >= lv ? [0, 1] : [1, 0])
  const quer = dir[0] !== 0
  const su = quer ? v.t : v.b
  const sv = quer ? v.b : v.t
  if (su + 2 * rand > lu || sv + 2 * rand > lv) return null
  const c0: P = [(q.u0 + q.u1) / 2, (q.v0 + q.v1) / 2]
  const [a0, b0, a1, b1] = abdruck(c0, dir, v.b, v.t)
  if (!rechteckFrei(c, st, r, a0, b0, a1, b1)) return null
  belegen(c, st, a0, b0, a1, b1, rand)
  return moebelSetzen(st, r, v, c0, dir, st.rnd())
}

/** Stuehle um einen Tisch (nur wo frei). */
function stuehleUm(c: Ctx, st: Stock, r: number, tisch: MoebelL, anzahl: number): void {
  const quer = tisch.d[0] !== 0
  const lang = tisch.b
  const tief = tisch.t
  const ax: P = quer ? [0, 1] : [1, 0]
  const qx: P = quer ? [1, 0] : [0, 1]
  const plaetze: [P, P][] = []
  const n = Math.max(1, Math.min(3, Math.floor(lang / 0.6)))
  for (let i = 0; i < n; i++) {
    const s = -lang / 2 + (lang * (i + 0.5)) / n
    for (const seite of [-1, 1]) {
      const c0: P = [tisch.c[0] + ax[0] * s + qx[0] * seite * (tief / 2 + 0.22), tisch.c[1] + ax[1] * s + qx[1] * seite * (tief / 2 + 0.22)]
      plaetze.push([c0, [-qx[0] * seite, -qx[1] * seite]])
    }
  }
  let gesetzt = 0
  for (const [c0, d] of plaetze) {
    if (gesetzt >= anzahl) break
    const [a0, b0, a1, b1] = abdruck(c0, d, 0.44, 0.44)
    if (!rechteckFrei(c, st, r, a0, b0, a1, b1, false)) continue
    belegen(c, st, a0, b0, a1, b1)
    moebelSetzen(st, r, V('stuhl', 0.44, 0.44, 0.88, 0.46, null), c0, d, tisch.ton)
    gesetzt++
  }
}

/** Reihen im groessten freien Rechteck: Moebel v hintereinander mit Gaengen.
 *  laengs: die Reihen laufen entlang der laengeren Seite. */
function reihen(c: Ctx, st: Stock, r: number, v: Vorlage, gang: number, rand: number, opts: { max?: number; d?: P; achse?: 0 | 1 } = {}): MoebelL[] {
  const q = freiesRechteck(c, st, r)
  const out: MoebelL[] = []
  if (!q) return out
  const lu = q.u1 - q.u0 - 2 * rand
  const lv = q.v1 - q.v0 - 2 * rand
  if (lu <= 0 || lv <= 0) return out
  // Reihen nebeneinander entlang der Achse a, jede Reihe aus Stuecken entlang b.
  const entlangU = opts.achse === undefined ? lu >= lv : opts.achse === 0
  const reiheLang = entlangU ? lu : lv
  const reiheQuer = entlangU ? lv : lu
  const pitch = v.t + gang
  const nReihen = Math.max(0, Math.floor((reiheQuer + gang) / pitch))
  const nStueck = Math.max(0, Math.floor(reiheLang / v.b))
  if (!nReihen || !nStueck) return out
  const restQ = reiheQuer - (nReihen * pitch - gang)
  const restL = reiheLang - nStueck * v.b
  for (let a = 0; a < nReihen; a++) {
    for (let b = 0; b < nStueck; b++) {
      if (opts.max !== undefined && out.length >= opts.max) return out
      const sq = rand + restQ / 2 + a * pitch + v.t / 2
      const sl = rand + restL / 2 + b * v.b + v.b / 2
      const c0: P = entlangU ? [q.u0 + sl, q.v0 + sq] : [q.u0 + sq, q.v0 + sl]
      const d: P = opts.d ?? (entlangU ? [0, 1] : [1, 0])
      const [a0, b0, a1, b1] = abdruck(c0, d, v.b, v.t)
      if (!rechteckFrei(c, st, r, a0, b0, a1, b1)) continue
      belegen(c, st, a0, b0, a1, b1)
      out.push(moebelSetzen(st, r, v, c0, d, st.rnd()))
    }
  }
  return out
}

/** Zellrahmen eines Raums (i0, j0, i1, j1; i1 < 0 ohne Zellen). */
function rahmenVon(c: Ctx, st: Stock, r: number): [number, number, number, number] {
  if (st.kaesten && st.kaesten[r]) return st.kaesten[r]
  const F = c.feld
  let i0 = Infinity
  let i1 = -1
  let j0 = Infinity
  let j1 = -1
  for (const z of zellenVon(st, r)) {
    const i = z % F.nu
    const j = (z - i) / F.nu
    i0 = Math.min(i0, i)
    i1 = Math.max(i1, i)
    j0 = Math.min(j0, j)
    j1 = Math.max(j1, j)
  }
  return [i0, j0, i1, j1]
}

/** Rahmen des Raums (lokal, Meter). */
function raumKasten(c: Ctx, st: Stock, r: number): { u0: number; v0: number; u1: number; v1: number } | null {
  const F = c.feld
  const [i0, j0, i1, j1] = rahmenVon(c, st, r)
  if (i1 < 0) return null
  return { u0: F.u0 + i0 * F.gu, v0: F.v0 + j0 * F.gv, u1: F.u0 + (i1 + 1) * F.gu, v1: F.v0 + (j1 + 1) * F.gv }
}

/** Ab hier aendern sich die Raeume nicht mehr: Zellen und Rahmen je Raum merken. */
function festschreiben(c: Ctx, st: Stock): void {
  const F = c.feld
  const listen: number[][] = st.regs.map(() => [])
  const kaesten: [number, number, number, number][] = st.regs.map(() => [Infinity, Infinity, -1, -1])
  for (let z = 0; z < st.zelle.length; z++) {
    const r = st.zelle[z]
    if (r < 0) continue
    listen[r].push(z)
    const i = z % F.nu
    const j = (z - i) / F.nu
    const k = kaesten[r]
    if (i < k[0]) k[0] = i
    if (j < k[1]) k[1] = j
    if (i > k[2]) k[2] = i
    if (j > k[3]) k[3] = j
  }
  st.listen = listen
  st.kaesten = kaesten
  st.plaetze.clear()
}

function einrichten(c: Ctx, st: Stock): void {
  festschreiben(c, st)
  freihalten(c, st)
  st.regs.forEach((R, r) => {
    if (!R.aktiv) return
    const qm = zellenVon(st, r).length * c.qm
    if (qm < 1) return
    const W = (v: Vorlage, o?: Parameters<typeof anWand>[4]) => anWand(c, st, r, v, o)
    switch (R.typ) {
      case 'vorraum':
        W(V('garderobe', 1.0, 0.4, 1.9, null, null, true), { innen: true })
        break
      case 'bad': {
        const wanne = qm >= 4.5 ? W(V('wanne', 1.7, 0.75, 0.56, 0.56, 0.56), { ecke: true }) : W(V('dusche', 0.9, 0.9, 2.0, 0.05, null, true), { ecke: true })
        if (!wanne && qm >= 2.5) W(V('dusche', 0.9, 0.9, 2.0, 0.05, null, true))
        W(V('becken', 0.6, 0.46, 0.86, 0.86, 0.86, true), { vorn: 0.5 })
        W(V('wc', 0.4, 0.62, 0.42, 0.42), { vorn: 0.45 })
        if (qm >= 5.5) W(V('waschmaschine', 0.6, 0.6, 0.86, 0.86, 0.86))
        break
      }
      case 'wc':
        W(V('wc', 0.4, 0.62, 0.42, 0.42), { vorn: 0.4 })
        W(V('becken', 0.45, 0.32, 0.86, 0.86, 0.86, true))
        break
      case 'wohnen':
      case 'kueche':
      case 'teekueche':
      case 'aufenthalt': {
        const lang = R.typ === 'teekueche' ? 1.8 : qm > 20 ? 3.0 : 2.4
        // Mit Oberschraenken an einer Innenwand; sonst niedrig (auch unter Fenstern), kuerzer.
        if (!W(V('kueche', lang, 0.62, 2.15, 0.92, 0.92, true), { innen: true, vorn: 0.9 }))
          for (const l of [lang, 1.8, 1.2]) if (W(V('kueche', l, 0.62, 0.92, 0.92, 0.92), { vorn: 0.8 })) break
        W(V('kuehlschrank', 0.62, 0.66, 1.86, null, null, true), { innen: true, vorn: 0.8 })
        if (R.typ === 'teekueche') {
          const t = frei(c, st, r, V('esstisch', 0.9, 0.8, 0.75, 0.75, 0.75), 0.6)
          if (t) stuehleUm(c, st, r, t, 3)
          break
        }
        if (R.typ !== 'kueche' && qm >= 16) {
          const s = W(V('sofa', 2.1, 0.9, 0.82, 0.45, 0.45), { vorn: 1.3 })
          if (s) {
            const cd = s.m.d
            const c0: P = [s.m.c[0] + cd[0] * (s.m.t / 2 + 0.75), s.m.c[1] + cd[1] * (s.m.t / 2 + 0.75)]
            const [a0, b0, a1, b1] = abdruck(c0, cd, 1.0, 0.55)
            if (rechteckFrei(c, st, r, a0, b0, a1, b1, false)) {
              moebelSetzen(st, r, V('teppich', 2.2, 1.6, 0.01, null, null, false, false), [s.m.c[0] + cd[0] * (s.m.t / 2 + 0.7), s.m.c[1] + cd[1] * (s.m.t / 2 + 0.7)], cd, st.rnd())
              belegen(c, st, a0, b0, a1, b1)
              moebelSetzen(st, r, V('couchtisch', 1.0, 0.55, 0.42, 0.42, 0.42), c0, cd, st.rnd())
            }
          }
          W(V('tv', 1.6, 0.45, 0.55, 0.55, 0.55), { vorn: 1.2 })
        }
        const t = frei(c, st, r, V('esstisch', qm > 24 ? 1.6 : 1.2, 0.85, 0.75, 0.75, 0.75), 0.65)
        if (t) stuehleUm(c, st, r, t, qm > 24 ? 6 : 4)
        if (qm > 14) W(V('pflanze', 0.45, 0.45, 1.1, null), { vorn: 0.2 })
        break
      }
      case 'zimmer':
      case 'schlafen': {
        const b = W(V('bett2', 1.6, 2.05, 0.5, 0.5, 0.5), { innen: true, vorn: 0.6, ecke: false })
        if (b) {
          for (const seite of [-1, 1]) {
            const ax: P = b.m.d[0] !== 0 ? [0, 1] : [1, 0]
            const c0: P = [b.m.c[0] + ax[0] * seite * (b.m.b / 2 + 0.26) - b.m.d[0] * (b.m.t / 2 - 0.22), b.m.c[1] + ax[1] * seite * (b.m.b / 2 + 0.26) - b.m.d[1] * (b.m.t / 2 - 0.22)]
            const [a0, b0, a1, b1] = abdruck(c0, b.m.d, 0.45, 0.42)
            if (rechteckFrei(c, st, r, a0, b0, a1, b1)) {
              belegen(c, st, a0, b0, a1, b1)
              moebelSetzen(st, r, V('nachttisch', 0.45, 0.42, 0.5, 0.5, 0.5), c0, b.m.d, st.rnd())
            }
          }
        } else W(V('bett1', 0.95, 2.05, 0.5, 0.5, 0.5), { vorn: 0.5 })
        W(V('schrank', qm > 13 ? 2.0 : 1.4, 0.62, 2.1, null, null, true), { innen: true, vorn: 0.8 })
        if (qm > 11) W(V('kommode', 1.0, 0.45, 0.85, 0.85, 0.85), { vorn: 0.6 })
        break
      }
      case 'kind': {
        W(V('bett1', 0.95, 2.05, 0.5, 0.5, 0.5), { vorn: 0.5 })
        const sch = W(V('schreibtisch', 1.2, 0.65, 0.75, 0.75, 0.75), { aussen: true, vorn: 0.7 })
        if (sch) stuhlVor(c, st, r, sch.m, 'stuhl')
        W(V('regal', 0.9, 0.38, 1.8, null, 1.05, true), { innen: true, vorn: 0.6 })
        const t = freiesRechteck(c, st, r)
        if (t && t.u1 - t.u0 > 1.4 && t.v1 - t.v0 > 1.4) moebelSetzen(st, r, V('teppich', Math.min(2, t.u1 - t.u0 - 0.4), Math.min(1.4, t.v1 - t.v0 - 0.4), 0.01, null, null, false, false), [(t.u0 + t.u1) / 2, (t.v0 + t.v1) / 2], [0, 1], st.rnd())
        break
      }
      case 'abstell':
      case 'lager':
      case 'dachboden': {
        const n = Math.max(1, Math.min(6, Math.floor(qm / 6)))
        for (let i = 0; i < n; i++) if (!W(V('regal', 1.0, 0.45, 2.0, null, 1.05, true), { vorn: 0.8 })) break
        if (R.typ !== 'abstell') reihen(c, st, r, V('kisten', 1.2, 0.8, 0.9, 0.9, 0.9), 1.4, 0.9, { max: Math.floor(qm / 12) })
        break
      }
      case 'verkauf':
        if (c.art === 'supermarkt') supermarktEinrichten(c, st, r)
        else ladenEinrichten(c, st, r, R.laden?.art ?? 'shop', R.laden?.name)
        break
      case 'laden':
        ladenEinrichten(c, st, r, R.laden?.art ?? 'shop', null)
        break
      case 'mall':
        passageEinrichten(c, st, r)
        break
      case 'buero':
      case 'direktion':
      case 'lehrer': {
        const n = R.typ === 'buero' ? Math.max(1, Math.min(4, Math.floor(qm / 9))) : 1
        for (let i = 0; i < n; i++) {
          const s = W(V('schreibtisch', 1.4, 0.75, 0.75, 0.75, 0.75), { aussen: true, vorn: 0.9 })
          if (!s) break
          stuhlVor(c, st, r, s.m, 'buerostuhl')
        }
        W(V('aktenschrank', 0.9, 0.45, 1.9, null, null, true), { innen: true, vorn: 0.7 })
        if (R.typ !== 'buero') {
          const t = frei(c, st, r, V('esstisch', 1.6, 0.9, 0.75, 0.75, 0.75), 0.7)
          if (t) stuehleUm(c, st, r, t, 6)
        }
        if (qm > 12) W(V('pflanze', 0.45, 0.45, 1.1, null))
        break
      }
      case 'besprechung': {
        const t = frei(c, st, r, V('esstisch', Math.min(3.6, Math.max(1.6, Math.sqrt(qm) * 0.8)), 1.1, 0.75, 0.75, 0.75), 0.75)
        if (t) stuehleUm(c, st, r, t, 8)
        W(V('tv', 1.6, 0.45, 0.55, 0.55, 0.55), { innen: true })
        break
      }
      case 'fahrzeughalle':
        halleFahrzeuge(c, st, r)
        break
      case 'umkleide': {
        for (let i = 0; i < 4; i++) if (!W(V('spind', 1.8, 0.5, 1.9, null, null, true), { vorn: 0.9 })) break
        frei(c, st, r, V('bank', 1.8, 0.4, 0.45, 0.45, 0.45), 0.6)
        break
      }
      case 'werkstatt':
        W(V('werkbank', 2.0, 0.75, 1.8, 0.9, 0.9, true), { vorn: 0.9 })
        W(V('schlauch', 1.2, 0.45, 1.8, null, null, true), { vorn: 0.8 })
        W(V('regal', 1.0, 0.45, 2.0, null, 1.05, true), { vorn: 0.8 })
        break
      case 'schlafraum': {
        for (let i = 0; i < 6; i++) if (!W(V('bett1', 0.95, 2.05, 0.5, 0.5, 0.5), { vorn: 0.8, ecke: false })) break
        W(V('spind', 1.2, 0.5, 1.9, null, null, true), { vorn: 0.8 })
        break
      }
      case 'lobby': {
        if (st.k === 0) {
          const e = W(V('empfang', Math.min(3.2, Math.max(2, qm / 12)), 0.8, 1.1, 1.1, 1.1), { innen: true, vorn: 1.6 })
          if (e && c.e.name) schildUeber(st, e.m, c.e.name)
        }
        reihen(c, st, r, V('wartestuhl', 2.2, 0.6, 0.85, 0.45, 0.45), 1.6, 1.4, { max: 4 })
        W(V('pflanze', 0.5, 0.5, 1.3, null))
        break
      }
      case 'behandlung':
        W(V('liege', 0.75, 1.95, 0.7, 0.7, 0.7), { vorn: 0.8 })
        {
          const s = W(V('schreibtisch', 1.2, 0.7, 0.75, 0.75, 0.75), { aussen: true, vorn: 0.9 })
          if (s) stuhlVor(c, st, r, s.m, 'buerostuhl')
        }
        W(V('schrank', 1.0, 0.5, 2.0, null, null, true), { innen: true, vorn: 0.7 })
        break
      case 'patient': {
        let n = 0
        for (let i = 0; i < 2; i++) {
          const b = W(V('spitalbett', 1.0, 2.15, 0.62, 0.62, 0.62), { vorn: 0.9, ecke: false })
          if (!b) break
          n++
          const ax: P = b.m.d[0] !== 0 ? [0, 1] : [1, 0]
          const c0: P = [b.m.c[0] + ax[0] * (b.m.b / 2 + 0.3) - b.m.d[0] * (b.m.t / 2 - 0.25), b.m.c[1] + ax[1] * (b.m.b / 2 + 0.3) - b.m.d[1] * (b.m.t / 2 - 0.25)]
          const [a0, b0, a1, b1] = abdruck(c0, b.m.d, 0.48, 0.45)
          if (rechteckFrei(c, st, r, a0, b0, a1, b1)) {
            belegen(c, st, a0, b0, a1, b1)
            moebelSetzen(st, r, V('nachttisch', 0.48, 0.45, 0.8, 0.8, 0.8), c0, b.m.d, st.rnd())
          }
          // Vorhang an der Decke ums Bett (nur zum Anschauen).
          moebelSetzen(st, r, V('vorhang', b.m.b + 0.5, b.m.t + 0.2, 2.2, null, null, false, false), b.m.c, b.m.d, st.rnd())
        }
        if (!n) W(V('bett1', 0.95, 2.05, 0.5, 0.5, 0.5))
        W(V('schrank', 1.0, 0.55, 2.0, null, null, true), { innen: true, vorn: 0.8 })
        break
      }
      case 'station': {
        W(V('theke', 2.0, 0.7, 1.0, 1.0, 1.0), { vorn: 1.0 })
        const s = W(V('schreibtisch', 1.4, 0.7, 0.75, 0.75, 0.75), { vorn: 0.9 })
        if (s) stuhlVor(c, st, r, s.m, 'buerostuhl')
        W(V('regal', 1.0, 0.45, 2.0, null, 1.05, true), { vorn: 0.7 })
        break
      }
      case 'klasse': {
        const tafel = W(V('tafel', Math.min(3.6, Math.max(2, Math.sqrt(qm) * 0.5)), 0.08, 2.15, null, null, true, false), { innen: true, ecke: false })
        if (tafel) {
          const d = tafel.m.d
          const c0: P = [tafel.m.c[0] + d[0] * 1.3, tafel.m.c[1] + d[1] * 1.3]
          const [a0, b0, a1, b1] = abdruck(c0, d, 1.4, 0.7)
          if (rechteckFrei(c, st, r, a0, b0, a1, b1)) {
            belegen(c, st, a0, b0, a1, b1, 0.6)
            moebelSetzen(st, r, V('lehrertisch', 1.4, 0.7, 0.75, 0.75, 0.75), c0, [-d[0], -d[1]], st.rnd())
          }
          // Freier Streifen vor der Tafel.
          const [x0, y0, x1, y1] = abdruck([tafel.m.c[0] + d[0] * 1.0, tafel.m.c[1] + d[1] * 1.0], d, tafel.m.b + 1.2, 1.8)
          belegen(c, st, x0, y0, x1, y1)
          reihen(c, st, r, V('schulbank', 1.3, 1.0, 0.75, 0.75, 0.75), 0.6, 0.7, { d: [-d[0], -d[1]], achse: d[0] === 0 ? 0 : 1 })
        } else reihen(c, st, r, V('schulbank', 1.3, 1.0, 0.75, 0.75, 0.75), 0.6, 0.7)
        W(V('regal', 1.2, 0.4, 1.8, null, 1.05, true), { vorn: 0.6 })
        break
      }
      case 'gruppe': {
        W(V('spielregal', 1.2, 0.4, 1.0, 1.0, 1.0), { vorn: 0.7 })
        W(V('spielregal', 1.2, 0.4, 1.0, 1.0, 1.0), { vorn: 0.7 })
        const mt = freiesRechteck(c, st, r)
        if (mt && mt.u1 - mt.u0 > 2.2 && mt.v1 - mt.v0 > 2.2) moebelSetzen(st, r, V('matte', 2.0, 1.6, 0.04, null, null, false, false), [mt.u0 + 1.2, mt.v0 + 1.0], [0, 1], st.rnd())
        const t = frei(c, st, r, V('kindertisch', 1.2, 0.8, 0.55, 0.55, 0.55), 0.6)
        if (t) {
          for (const [su, sv] of [[-0.35, -0.6], [0.35, -0.6], [-0.35, 0.6], [0.35, 0.6]]) {
            const quer = t.d[0] !== 0
            const c0: P = quer ? [t.c[0] + sv, t.c[1] + su] : [t.c[0] + su, t.c[1] + sv]
            const [a0, b0, a1, b1] = abdruck(c0, t.d, 0.34, 0.34)
            if (!rechteckFrei(c, st, r, a0, b0, a1, b1, false)) continue
            belegen(c, st, a0, b0, a1, b1)
            moebelSetzen(st, r, V('stuhl', 0.34, 0.34, 0.6, 0.32, null), c0, sv < 0 ? t.d : [-t.d[0], -t.d[1]], t.ton)
          }
        }
        break
      }
      case 'garderobe':
        for (let i = 0; i < 3; i++) if (!W(V('garderobe', 1.4, 0.4, 1.5, null, null, true), { vorn: 0.8 })) break
        frei(c, st, r, V('bank', 1.6, 0.4, 0.35, 0.35, 0.35), 0.6)
        break
      case 'schiff':
        kircheEinrichten(c, st, r)
        break
      case 'empore': {
        const K = c.kern
        if (st.k === 1 && K) W(V('orgel', 2.4, 1.0, 2.6, null, null, true), { vorn: 1.0 })
        reihen(c, st, r, V('kirchenbank', 2.6, 0.62, 0.9, 0.45, 0.45), 0.4, 0.7, { max: 6 })
        break
      }
      case 'sakristei':
        W(V('schrank', 1.6, 0.6, 2.0, null, null, true), { vorn: 0.8 })
        frei(c, st, r, V('esstisch', 1.2, 0.7, 0.75, 0.75, 0.75), 0.6)
        break
      case 'halle': {
        const hoch = Math.min(3.0, c.gh - DECKE_M - 0.3)
        W(V('werkbank', 2.0, 0.75, 1.8, 0.9, 0.9, true), { vorn: 1.0 })
        reihen(c, st, r, V('hochregal', 2.7, 1.1, hoch, null, 1.2, true), 2.6, 1.2, { max: 24 })
        break
      }
      case 'garage':
        garageEinrichten(c, st, r)
        break
      case 'schuppen':
        W(V('werkzeugwand', 1.6, 0.12, 1.6, null, null, true, false), { innen: true, ecke: false })
        W(V('regal', 1.0, 0.45, 1.8, null, 1.05, true), { vorn: 0.6 })
        W(V('rasenmaeher', 0.55, 0.95, 0.9, 0.45, null), { vorn: 0.4 })
        W(V('schubkarre', 0.65, 1.3, 0.7, 0.6, null), { vorn: 0.4 })
        break
      default:
        break
    }
    // Spital: Aufzugtuer am Podest (nur zum Anschauen).
    if (R.typ === 'treppe' && c.art === 'spital' && st.k >= 0) {
      const t = anWandOhneHalten(c, st, r, V('lift', 1.3, 0.08, 2.3, null, null, false, false))
      void t
    }
    durchgangSichern(c, st, r)
  })
}

/** Belegte Zellen eines Raums aus seinen Moebeln neu aufbauen (nach dem Entfernen eines Moebels). */
function belegtNeu(c: Ctx, st: Stock, r: number): void {
  for (const z of zellenVon(st, r)) st.belegt[z] = 0
  for (const m of st.moebel) {
    if (!m.hindernis || m.raum !== r) continue
    const [a0, b0, a1, b1] = abdruck(m.c, m.d, m.b, m.t)
    belegen(c, st, a0, b0, a1, b1)
  }
}

/** Von den Eingaengen eines Raums (Tueren, offene Uebergaenge, Haustuer) muss
 *  man mit Abstand zu den Moebeln (eine Zelle rundum frei) zu allen anderen
 *  Eingaengen und zum groessten Teil des Raums kommen; sonst gehen die zuletzt
 *  gestellten Moebel des Raums wieder raus. Rechnet nur im Rahmen des Raums. */
function durchgangSichern(c: Ctx, st: Stock, r: number): void {
  if (!st.moebel.some((m) => m.raum === r && m.hindernis)) return
  const F = c.feld
  const nu = F.nu
  const zellen = zellenVon(st, r)
  if (!zellen.length) return
  const [ri0, rj0, ri1, rj1] = rahmenVon(c, st, r)
  // Rahmen eine Zelle groesser, lokale Felder.
  const bi0 = Math.max(0, ri0 - 1)
  const bj0 = Math.max(0, rj0 - 1)
  const bw = Math.min(nu - 1, ri1 + 1) - bi0 + 1
  const bh = Math.min(F.nv - 1, rj1 + 1) - bj0 + 1
  const L = (z: number) => {
    const i = z % nu
    return ((z - i) / nu - bj0) * bw + (i - bi0)
  }
  const drin = new Uint8Array(bw * bh)
  for (const z of zellen) drin[L(z)] = 1
  const begehbar = (x: number) => x >= 0 && (st.regs[x].art === 'flur' || st.regs[x].art === 'raum')
  // Startzellen: je Oeffnung dieses Raums eine Gruppe, dazu offene Uebergaenge und die Haustuer.
  const gruppen: number[][] = []
  const start: number[] = []
  for (const o of st.oeffnungen) {
    if (o.ra !== r && o.rb !== r) continue
    const n: P = [-o.w[1], o.w[0]]
    const gr: number[] = []
    for (const sgn of [-1, 1]) {
      for (const w of [-o.breite / 3, 0, o.breite / 3]) {
        const p: P = [o.c[0] + o.w[0] * w + n[0] * sgn * 0.15, o.c[1] + o.w[1] * w + n[1] * sgn * 0.15]
        const i = Math.floor((p[0] - F.u0) / F.gu)
        const j = Math.floor((p[1] - F.v0) / F.gv)
        if (i >= 0 && j >= 0 && i < nu && j < F.nv && st.zelle[j * nu + i] === r) {
          start.push(j * nu + i)
          gr.push(j * nu + i)
        }
      }
    }
    if (gr.length) gruppen.push(gr)
  }
  for (const z of zellen) {
    const i = z % nu
    for (const y of [i > 0 ? z - 1 : -1, i < nu - 1 ? z + 1 : -1, z - nu, z + nu]) {
      if (y < 0 || y >= st.zelle.length) continue
      const x = st.zelle[y]
      if (x !== r && begehbar(x) && !wandTyp(st, r, x)) {
        start.push(z)
        break
      }
    }
  }
  if (st.k === 0) for (const z of c.eingang) if (st.zelle[z] === r) start.push(z)
  if (!start.length) return
  const besucht = new Uint8Array(bw * bh)
  const freiM = new Uint8Array(bw * bh)
  for (let runde = 0; runde < 10; runde++) {
    if (!st.moebel.some((m) => m.raum === r && m.hindernis)) return
    // Frei: nicht belegt und rundum (eine Zelle) kein Moebel dieses Raums.
    freiM.fill(0)
    for (const z of zellen) {
      if (st.belegt[z]) continue
      const i = z % nu
      const j = (z - i) / nu
      let ok = 1
      for (let dj = -1; dj <= 1 && ok; dj++) {
        const y = j + dj
        if (y < 0 || y >= F.nv) continue
        for (let di = -1; di <= 1; di++) {
          const x = i + di
          if (x < 0 || x >= nu) continue
          const q = y * nu + x
          if (st.belegt[q] && st.zelle[q] === r) {
            ok = 0
            break
          }
        }
      }
      freiM[L(z)] = ok
    }
    const frei = (z: number) => freiM[L(z)] === 1
    besucht.fill(0)
    const stapel: number[] = []
    for (const z of gruppen.length ? gruppen[0] : start) {
      if (!besucht[L(z)]) {
        besucht[L(z)] = 1
        stapel.push(z)
      }
    }
    let erreicht = 0
    let freiGesamt = 0
    for (const z of zellen) if (frei(z)) freiGesamt++
    while (stapel.length) {
      const z = stapel.pop() as number
      if (frei(z)) erreicht++
      const i = z % nu
      for (const y of [i > 0 ? z - 1 : -1, i < nu - 1 ? z + 1 : -1, z - nu, z + nu]) {
        if (y < 0 || y >= st.zelle.length || st.zelle[y] !== r) continue
        const ly = L(y)
        if (besucht[ly] || !frei(y)) continue
        besucht[ly] = 1
        stapel.push(y)
      }
    }
    const alleTueren = gruppen.every((gr) => gr.some((z) => besucht[L(z)]))
    if (freiGesamt === 0 || (alleTueren && erreicht >= freiGesamt * 0.6)) return
    // Das zuletzt gestellte Hindernis-Moebel dieses Raums entfernen.
    let letzte = -1
    for (let k = st.moebel.length - 1; k >= 0; k--) {
      if (st.moebel[k].raum === r && st.moebel[k].hindernis) {
        letzte = k
        break
      }
    }
    if (letzte < 0) return
    st.moebel.splice(letzte, 1)
    belegtNeu(c, st, r)
  }
}

/** Wie anWand, aber auch auf freizuhaltenden Zellen (fuer Flaches an der Wand). */
function anWandOhneHalten(c: Ctx, st: Stock, r: number, v: Vorlage): MoebelL | null {
  const alt = st.halten
  st.halten = new Uint8Array(alt.length)
  const m = anWand(c, st, r, v, { innen: true, ecke: false })
  st.halten = alt
  return m ? m.m : null
}

function stuhlVor(c: Ctx, st: Stock, r: number, tisch: MoebelL, art: 'stuhl' | 'buerostuhl'): void {
  const c0: P = [tisch.c[0] + tisch.d[0] * (tisch.t / 2 + 0.25), tisch.c[1] + tisch.d[1] * (tisch.t / 2 + 0.25)]
  const [a0, b0, a1, b1] = abdruck(c0, tisch.d, 0.5, 0.5)
  if (!rechteckFrei(c, st, r, a0, b0, a1, b1, false)) return
  belegen(c, st, a0, b0, a1, b1)
  moebelSetzen(st, r, V(art, 0.5, 0.5, art === 'stuhl' ? 0.88 : 1.0, 0.48, null), c0, [-tisch.d[0], -tisch.d[1]], tisch.ton)
}

function schildUeber(st: Stock, m: MoebelL, text: string): void {
  // Schild an der Wand hinter dem Moebel, Blick in den Raum.
  const c0: P = [m.c[0] - m.d[0] * (m.t / 2 - 0.02), m.c[1] - m.d[1] * (m.t / 2 - 0.02)]
  st.schilder.push({ text, c: c0, n: m.d, breite: Math.min(2.6, m.b), hoehe: 0.42, y: 1.75 })
}

function ladenEinrichten(c: Ctx, st: Stock, r: number, art: string, name: string | null | undefined): void {
  const a = art.toLowerCase()
  const essen = /cafe|coffee|bakery|baecker|restaurant|fast_food|ice_cream|confectionery|pastry|bar|pub/.test(a)
  const mode = /cloth|shoe|fashion|boutique|jewel|bag|sport|textile/.test(a)
  const W = (v: Vorlage, o?: Parameters<typeof anWand>[4]) => anWand(c, st, r, v, o)
  const theke = W(V('theke', 1.8, 0.7, 1.0, 1.0, 1.0), { innen: true, vorn: 1.2 })
  if (theke && name) schildUeber(st, theke.m, name)
  if (essen) {
    W(V('kuehlregal', 1.2, 0.7, 1.9, null, null, true), { innen: true, vorn: 1.0 })
    const t = reihen(c, st, r, V('cafetisch', 0.75, 0.75, 0.75, 0.75, 0.75), 1.3, 0.9, { max: 10 })
    for (const x of t) stuehleUm(c, st, r, x, 2)
    return
  }
  for (let i = 0; i < 6; i++) if (!W(V('regalwand', 1.6, 0.45, 1.9, null, 1.1, true), { vorn: 1.0 })) break
  if (mode) reihen(c, st, r, V('kleiderstaender', 1.4, 0.55, 1.55, null, null), 1.4, 1.0, { max: 8 })
  else reihen(c, st, r, V('gondel', 1.8, 0.9, 1.5, null, 1.0, true), 1.5, 1.0, { max: 8 })
}

function supermarktEinrichten(c: Ctx, st: Stock, r: number): void {
  const k = raumKasten(c, st, r)
  if (!k) return
  const { achse, sgn } = tuerAchse(c)
  const t = c.tuer
  // Kassen in einer Reihe 3,5 m hinter der Tuer, neben dem Weg von der Tuer.
  if (t) {
    const quer: P = achse === 0 ? [0, 1] : [1, 0]
    const tief: P = achse === 0 ? [sgn, 0] : [0, sgn]
    const d0 = AW + 4.2
    const tq = achse === 0 ? t.ml[1] : t.ml[0]
    let n = 0
    for (let i = 1; i <= 8 && n < 4; i++) {
      for (const seite of [1, -1]) {
        if (n >= 4) break
        const q = tq + seite * (1.4 + i * 1.9)
        const c0: P = achse === 0 ? [t.ml[0] + tief[0] * d0, q] : [q, t.ml[1] + tief[1] * d0]
        const d: P = [quer[0] * 1, quer[1] * 1]
        const [a0, b0, a1, b1] = abdruck(c0, d, 2.2, 0.8)
        if (!rechteckFrei(c, st, r, a0, b0, a1, b1)) continue
        belegen(c, st, a0, b0, a1, b1, 0.35)
        moebelSetzen(st, r, V('kasse', 2.2, 0.8, 0.9, 0.9, 0.9), c0, d, st.rnd())
        n++
      }
    }
    // Eingangszone frei halten.
    const zone = abdruck([t.ml[0] + tief[0] * (AW + 3.2), t.ml[1] + tief[1] * (AW + 3.2)], tief, 1e3, 6.4)
    for (let z = 0; z < st.zelle.length; z++) {
      if (st.zelle[z] !== r) continue
      const F = c.feld
      const i = z % F.nu
      const j = (z - i) / F.nu
      const u = F.u0 + (i + 0.5) * F.gu
      const v = F.v0 + (j + 0.5) * F.gv
      if (u >= zone[0] && u <= zone[2] && v >= zone[1] && v <= zone[3]) st.halten[z] = 1
    }
    if (c.e.name) {
      const sc: P = [t.ml[0] + tief[0] * (AW + 0.2), t.ml[1] + tief[1] * (AW + 0.2)]
      void sc
    }
  }
  for (let i = 0; i < 5; i++) if (!anWand(c, st, r, V('kuehlregal', 2.4, 0.85, 2.0, null, null, true), { innen: true, vorn: 1.6 })) break
  reihen(c, st, r, V('gondel', 2.4, 0.95, 1.6, null, 1.0, true), 1.7, 1.2, { max: 40, achse: tuerAchse(c).achse })
}

function passageEinrichten(c: Ctx, st: Stock, r: number): void {
  // Wenige Baenke und Pflanzen in der Mitte breiter Stellen, mit viel Platz rundum.
  for (let i = 0; i < 6; i++) {
    const q = freiesRechteck(c, st, r)
    if (!q) break
    const lu = q.u1 - q.u0
    const lv = q.v1 - q.v0
    if (Math.min(lu, lv) < 4.2 || Math.max(lu, lv) < 6) break
    const bank = i % 2 === 0
    const v = bank ? V('bank', 1.6, 0.5, 0.45, 0.45, 0.45) : V('pflanze', 0.7, 0.7, 1.5, null)
    const d: P = lu >= lv ? [0, 1] : [1, 0]
    const c0: P = [(q.u0 + q.u1) / 2, (q.v0 + q.v1) / 2]
    const [a0, b0, a1, b1] = abdruck(c0, d, v.b, v.t)
    if (!rechteckFrei(c, st, r, a0, b0, a1, b1)) break
    belegen(c, st, a0, b0, a1, b1, 3)
    moebelSetzen(st, r, v, c0, d, st.rnd())
  }
}

const HALLE_FARBE = '#c4302b'
const HALLE_FARBE_RETTUNG = '#f1efe9'
const GARAGE_FARBEN = ['#3d5a80', '#8d99ae', '#a44a3f', '#2f3e46']
/** Alle Fahrzeuge (Art und Farbe), die innenPlanen hinstellen kann: so
 *  rechnet innen3d.ts ihre Vorlagen schon beim Laden der Stadt (E87). */
export const INNEN_FAHRZEUGE: readonly { art: FahrzeugArt; farbe: string }[] = [
  ...(['feuerwehr', 'transporter', 'auto'] as const).map((art) => ({ art, farbe: HALLE_FARBE })),
  { art: 'rettung', farbe: HALLE_FARBE_RETTUNG },
  ...GARAGE_FARBEN.map((farbe) => ({ art: 'auto' as const, farbe })),
]

function halleFahrzeuge(c: Ctx, st: Stock, r: number): void {
  const q = freiesRechteck(c, st, r)
  const W = (v: Vorlage, o?: Parameters<typeof anWand>[4]) => anWand(c, st, r, v, o)
  if (q) {
    const { achse } = tuerAchse(c)
    const lu = q.u1 - q.u0
    const lv = q.v1 - q.v0
    const tief = achse === 0 ? lu : lv
    const breit = achse === 0 ? lv : lu
    const art: FahrzeugArt = c.gh >= 3.6 && tief >= 9.6 ? 'feuerwehr' : c.gh >= 3.0 && tief >= 7.6 ? 'rettung' : tief >= 6.6 ? 'transporter' : 'auto'
    const [laenge, br] = art === 'feuerwehr' ? [8.0, 2.5] : art === 'rettung' ? [6.0, 2.1] : art === 'transporter' ? [5.3, 2.0] : [4.3, 1.8]
    const bucht = br + 2.0
    // Hoechstens zwei: eingebackene Fahrzeuge kosten viele Dreiecke (E87).
    const n = Math.max(0, Math.min(2, Math.floor(breit / bucht)))
    const farbe = art === 'rettung' ? HALLE_FARBE_RETTUNG : HALLE_FARBE
    for (let i = 0; i < n; i++) {
      const s = (breit - n * bucht) / 2 + (i + 0.5) * bucht
      const c0: P = achse === 0 ? [q.u0 + lu / 2, q.v0 + s] : [q.u0 + s, q.v0 + lv / 2]
      // Nase zur Tuerseite (dort sind die Tore).
      const { sgn } = tuerAchse(c)
      const vorn: P = achse === 0 ? [-sgn, 0] : [0, -sgn]
      const fu = achse === 0 ? laenge : br
      const fv = achse === 0 ? br : laenge
      const a0 = c0[0] - fu / 2
      const b0 = c0[1] - fv / 2
      if (!rechteckFrei(c, st, r, a0, b0, a0 + fu, b0 + fv)) continue
      belegen(c, st, a0, b0, a0 + fu, b0 + fv, 0.3)
      st.fahrzeuge.push({ art, farbe, c: c0, vorn })
    }
  }
  for (let i = 0; i < 4; i++) if (!W(V('spind', 1.8, 0.5, 1.9, null, null, true), { vorn: 0.9 })) break
  W(V('schlauch', 1.4, 0.45, 1.8, null, null, true), { vorn: 0.9 })
}

function garageEinrichten(c: Ctx, st: Stock, r: number): void {
  const q = freiesRechteck(c, st, r)
  if (q) {
    const lu = q.u1 - q.u0
    const lv = q.v1 - q.v0
    const laengsU = lu >= lv
    const L = laengsU ? lu : lv
    const B = laengsU ? lv : lu
    if (L >= 4.6 && B >= 2.2) {
      const { achse, sgn } = tuerAchse(c)
      const c0: P = [(q.u0 + q.u1) / 2, (q.v0 + q.v1) / 2]
      const vorn: P = laengsU ? (achse === 0 ? [-sgn, 0] : [-1, 0]) : achse === 1 ? [0, -sgn] : [0, -1]
      const fu = laengsU ? 4.3 : 1.8
      const fv = laengsU ? 1.8 : 4.3
      if (rechteckFrei(c, st, r, c0[0] - fu / 2, c0[1] - fv / 2, c0[0] + fu / 2, c0[1] + fv / 2)) {
        belegen(c, st, c0[0] - fu / 2, c0[1] - fv / 2, c0[0] + fu / 2, c0[1] + fv / 2, 0.25)
        st.fahrzeuge.push({ art: 'auto', farbe: GARAGE_FARBEN[Math.floor(st.rnd() * GARAGE_FARBEN.length)], c: c0, vorn })
      }
    }
  }
  anWand(c, st, r, V('regal', 1.0, 0.45, 1.8, null, 1.05, true), { vorn: 0.4 })
  anWand(c, st, r, V('werkbank', 1.4, 0.6, 1.8, 0.9, 0.9, true), { vorn: 0.4 })
}

function kircheEinrichten(c: Ctx, st: Stock, r: number): void {
  const k = freiesRechteck(c, st, r, false)
  if (!k) return
  const { achse, sgn } = tuerAchse(c)
  const lu = k.u1 - k.u0
  const lv = k.v1 - k.v0
  const tief = achse === 0 ? lu : lv
  const breit = achse === 0 ? lv : lu
  // Altarraum am Ende gegenueber der Tuer: Podest, Altar, Ambo.
  const ende = sgn > 0 ? (achse === 0 ? k.u1 : k.v1) : achse === 0 ? k.u0 : k.v0
  const anfang = sgn > 0 ? (achse === 0 ? k.u0 : k.v0) : achse === 0 ? k.u1 : k.v1
  const mitteQ = achse === 0 ? (k.v0 + k.v1) / 2 : (k.u0 + k.u1) / 2
  const pt = Math.min(3.2, tief * 0.2)
  const pb = Math.min(breit - 1, 6)
  const zur: P = achse === 0 ? [-sgn, 0] : [0, -sgn]
  const pm = ende - sgn * (pt / 2 + 0.05)
  const c0: P = achse === 0 ? [pm, mitteQ] : [mitteQ, pm]
  if (pt >= 1.4 && pb >= 2.5) {
    moebelSetzen(st, r, V('podest', pb, pt, 0.3, 0.3, null), c0, zur, st.rnd())
    const am = ende - sgn * (pt * 0.55)
    const ac: P = achse === 0 ? [am, mitteQ] : [mitteQ, am]
    moebelSetzen(st, r, V('altar', 2.0, 0.9, 1.0, 1.0, 1.0), ac, zur, st.rnd())
    const bm = ende - sgn * (pt - 0.5)
    const bc: P = achse === 0 ? [bm, mitteQ + Math.min(2.2, pb / 2 - 0.5)] : [mitteQ + Math.min(2.2, pb / 2 - 0.5), bm]
    moebelSetzen(st, r, V('ambo', 0.6, 0.5, 1.2, null, null), bc, zur, st.rnd())
    const [a0, b0, a1, b1] = abdruck(c0, zur, pb, pt)
    belegen(c, st, a0, b0, a1, b1, 0.6)
  }
  // Baenke links und rechts eines Mittelgangs, von 2,5 m hinter der Tuer bis vor den Altarraum.
  const gang = 1.6
  const von = anfang + sgn * 2.6
  const bis = ende - sgn * (pt + 1.2)
  const laenge = (bis - von) * sgn
  if (laenge < 1) return
  const bankB = Math.min(4.2, (breit - gang - 1.6) / 2)
  if (bankB < 1.2) return
  const n = Math.floor(laenge / 0.95)
  for (let i = 0; i < n; i++) {
    const s = von + sgn * (i * 0.95 + 0.31)
    for (const seite of [-1, 1]) {
      const q = mitteQ + seite * (gang / 2 + bankB / 2)
      const bc: P = achse === 0 ? [s, q] : [q, s]
      const [a0, b0, a1, b1] = abdruck(bc, zur, bankB, 0.62)
      if (!rechteckFrei(c, st, r, a0, b0, a1, b1)) continue
      belegen(c, st, a0, b0, a1, b1)
      moebelSetzen(st, r, V('kirchenbank', bankB, 0.62, 0.9, 0.45, 0.45), bc, zur, st.rnd())
    }
  }
}

/* ============================================================ Dinge */

/** Breite, Tiefe und Hoehe (Meter) je Art. E87b: auch fuer innen3d.ts, das
 *  ein weggetragenes Ding allein aus seiner Kennung wieder baut (die Art
 *  steht am Ende der Kennung, die Masse kommen von hier). */
export const DING_MASSE: Record<DingArt, [number, number, number]> = {
  ball: [0.22, 0.22, 0.22],
  buch: [0.17, 0.24, 0.035],
  tasse: [0.09, 0.09, 0.1],
  karton: [0.4, 0.3, 0.28],
  flasche: [0.08, 0.08, 0.3],
  apfel: [0.08, 0.08, 0.08],
  dose: [0.07, 0.07, 0.11],
  packung: [0.2, 0.07, 0.28],
  teddy: [0.24, 0.2, 0.3],
  spielauto: [0.26, 0.12, 0.1],
  helm: [0.3, 0.3, 0.24],
  erstehilfe: [0.3, 0.12, 0.2],
  globus: [0.3, 0.3, 0.44],
  kerze: [0.08, 0.08, 0.26],
  laptop: [0.34, 0.24, 0.025],
  werkzeugkiste: [0.46, 0.22, 0.2],
  giesskanne: [0.45, 0.18, 0.34],
  blumentopf: [0.24, 0.24, 0.42],
  kissen: [0.45, 0.45, 0.14],
  vase: [0.14, 0.14, 0.3],
  tuete: [0.32, 0.16, 0.36],
}

function dingArten(c: Ctx, R: Reg): DingArt[] {
  switch (R.typ) {
    case 'wohnen':
    case 'kueche':
      return ['tasse', 'apfel', 'vase', 'flasche', 'buch']
    case 'zimmer':
    case 'schlafen':
      return ['buch', 'kissen', 'vase']
    case 'kind':
    case 'gruppe':
      return ['ball', 'teddy', 'spielauto', 'buch']
    case 'verkauf':
    case 'laden': {
      const a = (R.laden?.art ?? '').toLowerCase()
      if (/cafe|bakery|coffee|restaurant|food|ice/.test(a)) return ['tasse', 'apfel', 'flasche']
      if (/cloth|shoe|fashion|boutique|sport/.test(a)) return ['tuete', 'karton']
      if (/book|stationery/.test(a)) return ['buch', 'buch', 'packung']
      if (/toy/.test(a)) return ['ball', 'teddy', 'spielauto']
      if (c.art === 'supermarkt' || /supermarket|convenience|chemist|pharmacy/.test(a)) return ['packung', 'dose', 'flasche', 'apfel']
      return ['packung', 'karton', 'tuete']
    }
    case 'lager':
    case 'dachboden':
    case 'abstell':
      return ['karton', 'werkzeugkiste']
    case 'fahrzeughalle':
    case 'umkleide':
    case 'werkstatt':
      return ['helm', 'werkzeugkiste', 'erstehilfe']
    case 'aufenthalt':
    case 'teekueche':
      return ['tasse', 'flasche', 'apfel']
    case 'behandlung':
    case 'patient':
    case 'station':
    case 'lobby':
      return ['erstehilfe', 'flasche', 'blumentopf', 'buch']
    case 'klasse':
    case 'lehrer':
    case 'direktion':
      return ['buch', 'globus', 'ball']
    case 'schiff':
    case 'empore':
    case 'sakristei':
      return ['kerze', 'buch', 'vase']
    case 'buero':
    case 'besprechung':
      return ['laptop', 'tasse', 'buch', 'blumentopf']
    case 'halle':
    case 'garage':
      return ['werkzeugkiste', 'karton', 'flasche']
    case 'schuppen':
      return ['giesskanne', 'blumentopf', 'werkzeugkiste', 'ball']
    default:
      return []
  }
}

function dingeVerteilen(c: Ctx, stoecke: Stock[]): void {
  let flaeche = 0
  for (const st of stoecke) for (let z = 0; z < st.zelle.length; z++) if (st.zelle[z] >= 0 && st.regs[st.zelle[z]].art !== 'lauf' && st.regs[st.zelle[z]].art !== 'leer') flaeche += c.qm
  const gross = c.art === 'einkaufszentrum' || c.art === 'spital' || c.art === 'schule' || c.art === 'supermarkt'
  const ziel = klemm(Math.round(5 + flaeche / 45), 5, gross ? 22 : 16)
  // Ablagen sammeln.
  const ablagen: { st: Stock; m: MoebelL; arten: DingArt[] }[] = []
  for (const st of stoecke) {
    for (const m of st.moebel) {
      if (m.ablage === null || m.ablage > 1.3) continue
      const arten = dingArten(c, st.regs[m.raum])
      if (arten.length) ablagen.push({ st, m, arten })
    }
  }
  const rnd = zufallMit(c.saat ^ 0x5bd1e995)
  // Gleichmaessig ueber Geschosse und Raeume.
  ablagen.sort((a, b) => a.st.k - b.st.k)
  const benutzt = new Map<MoebelL, number>()
  let n = 0
  let versuche = 0
  while (n < ziel && ablagen.length && versuche < ziel * 12) {
    versuche++
    const a = ablagen[Math.floor(rnd() * ablagen.length)]
    const schon = benutzt.get(a.m) ?? 0
    if (schon >= 2) continue
    const art = a.arten[Math.floor(rnd() * a.arten.length)]
    const [b, t, h] = DING_MASSE[art]
    const quer = a.m.d[0] !== 0
    const breit = a.m.b
    const tief = a.m.t
    if (b + 0.06 > breit || t + 0.06 > tief) continue
    const halbe = (breit - b) / 2 - 0.03
    if (schon && halbe < b / 2 + 0.02) continue
    const s = schon ? b / 2 + 0.02 + rnd() * Math.max(0, halbe - b / 2 - 0.02) : -rnd() * Math.max(0, halbe)
    const ax: P = quer ? [0, 1] : [1, 0]
    const tq = (rnd() - 0.5) * Math.max(0, tief - t - 0.08)
    const c0: P = [a.m.c[0] + ax[0] * s + a.m.d[0] * tq, a.m.c[1] + ax[1] * s + a.m.d[1] * tq]
    a.st.dinge.push({ art, c: c0, y: a.m.ablage as number, gier: (rnd() - 0.5) * 0.8, b, t, h, ton: rnd() })
    benutzt.set(a.m, schon + 1)
    n++
  }
  // Zu wenig Ablagen: auf den Boden (Kartons, Baelle) an freie Stellen, notfalls mehrere je Raum.
  const F = c.feld
  for (let pass = 0; pass < 12 && n < 5; pass++) {
    for (const st of stoecke) {
      for (let r = 0; r < st.regs.length && n < 5; r++) {
        const R = st.regs[r]
        if (!R.aktiv || (R.art !== 'raum' && R.art !== 'flur') || R.typ === 'treppe') continue
        const arten = dingArten(c, R)
        const art: DingArt = arten.includes('ball') ? 'ball' : arten[0] === 'giesskanne' ? 'giesskanne' : 'karton'
        const zz = zellenVon(st, r)
        for (let x = 0; x < zz.length; x++) {
          const z = zz[(x * 7919 + st.k * 31 + pass * 17) % zz.length]
          if (st.belegt[z] || (pass < 4 && st.halten[z])) continue
          const i = z % F.nu
          const j = (z - i) / F.nu
          const [b, t, h] = DING_MASSE[art]
          st.dinge.push({ art, c: [F.u0 + (i + 0.5) * F.gu, F.v0 + (j + 0.5) * F.gv], y: 0, gier: rnd() * 0.6, b, t, h, ton: rnd() })
          st.belegt[z] = 1
          n++
          break
        }
      }
    }
  }
}

/* ============================================================ Ausgabe */

/** Rechtecke (Zellbereiche) eines Raums, zeilenweise zusammengefasst. */
function raumRechtecke(c: Ctx, st: Stock, r: number): [number, number, number, number][] {
  const F = c.feld
  const offen = new Map<string, [number, number, number, number]>()
  const out: [number, number, number, number][] = []
  const [ri0, rj0, ri1, rj1] = rahmenVon(c, st, r)
  if (ri1 < 0) return out
  for (let j = rj0; j <= rj1; j++) {
    const jetzt = new Map<string, [number, number, number, number]>()
    let i = ri0
    while (i <= ri1) {
      if (st.zelle[j * F.nu + i] !== r) {
        i++
        continue
      }
      const a = i
      while (i <= ri1 && st.zelle[j * F.nu + i] === r) i++
      const key = `${a}:${i}`
      const vor = offen.get(key)
      if (vor) {
        vor[3] = j + 1
        jetzt.set(key, vor)
        offen.delete(key)
      } else jetzt.set(key, [a, j, i, j + 1])
    }
    for (const x of offen.values()) out.push(x)
    offen.clear()
    for (const [k, x] of jetzt) offen.set(k, x)
  }
  for (const x of offen.values()) out.push(x)
  return out
}

function geschossAusgeben(c: Ctx, st: Stock): InnenGeschoss {
  const F = c.feld
  const R = c.rahmen
  const h = (p: P): Punkt2 => {
    const q = hausVon(R, p[0], p[1])
    return [runden(q[0]), runden(q[1])]
  }
  const dir = (d: P): Punkt2 => richtungHaus(R, d[0], d[1])
  const index = new Map<number, number>()
  const raeume: InnenRaum[] = []
  st.regs.forEach((G, r) => {
    if (!G.aktiv || G.art === 'lauf' || G.art === 'leer') return
    const rechtecke = raumRechtecke(c, st, r)
    if (!rechtecke.length) return
    let qm = 0
    let best = rechtecke[0]
    for (const x of rechtecke) {
      const f = (x[2] - x[0]) * (x[3] - x[1])
      qm += f * c.qm
      if (f > (best[2] - best[0]) * (best[3] - best[1])) best = x
    }
    const q = freiesRechteck(c, st, r, false)
    const fp: P = q ? [(q.u0 + q.u1) / 2, (q.v0 + q.v1) / 2] : [F.u0 + ((best[0] + best[2]) / 2) * F.gu, F.v0 + ((best[1] + best[3]) / 2) * F.gv]
    index.set(r, raeume.length)
    raeume.push({
      typ: G.art === 'schacht' ? 'schacht' : G.typ,
      name: G.name,
      einheit: G.einheit,
      qm: runden(qm),
      rechtecke: rechtecke.map(([i0, j0, i1, j1]) => {
        const u0 = F.u0 + i0 * F.gu
        const v0 = F.v0 + j0 * F.gv
        const u1 = F.u0 + i1 * F.gu
        const v1 = F.v0 + j1 * F.gv
        return [h([u0, v0]), h([u1, v0]), h([u1, v1]), h([u0, v1])]
      }),
      frei: h(fp),
      boden: bodenVon(G.typ, c.art),
      ...(G.laden ? { laden: G.laden } : {}),
    })
  })
  const waende: InnenWand[] = [...st.waende, ...st.extra].map((w) => ({
    a: h(w.p0),
    b: h(w.p1),
    dicke: w.dicke,
    art: w.art,
    luecken: w.luecken.map((l) => ({ t0: runden(l.t0), t1: runden(l.t1), art: l.art, hoehe: l.hoehe })),
  }))
  const moebel: InnenMoebel[] = st.moebel.map((m) => {
    const u: P = [m.d[1], -m.d[0]]
    return {
      art: m.art,
      mitte: h(m.c),
      u: dir(u),
      b: m.b,
      t: m.t,
      h: m.h,
      oben: m.oben,
      hindernis: m.hindernis,
      ton: runden(m.ton),
      ablage: m.ablage,
      ...(m.text ? { text: m.text } : {}),
    }
  })
  const dinge: InnenDing[] = st.dinge.map((d) => ({ art: d.art, mitte: h(d.c), y: d.y, gier: d.gier, b: d.b, t: d.t, h: d.h, ton: runden(d.ton) }))
  const fahrzeuge: InnenFahrzeug[] = st.fahrzeuge.map((f) => {
    const v = dir(f.vorn)
    return { art: f.art, farbe: f.farbe, mitte: h(f.c), gier: Math.atan2(-v[0], -v[1]) }
  })
  const schilder: InnenSchild[] = st.schilder.map((s) => {
    const n = dir(s.n)
    return { text: s.text, mitte: h(s.c), u: [n[1], -n[0]], n, breite: s.breite, hoehe: s.hoehe, y: s.y }
  })
  const loecher: Punkt2[][] = []
  const K = c.kern
  if (K && st.k >= 1) {
    const { bahn } = laufLage(K, st.k - 1)
    const L = bahnLage(c, K, bahn)
    loecher.push([lokalPunkt(K, L.s0, L.q0), lokalPunkt(K, L.s1, L.q0), lokalPunkt(K, L.s1, L.q1), lokalPunkt(K, L.s0, L.q1)].map(h))
  }
  const boden = st.bodenZonen ? st.bodenZonen.map(([u0, v0, u1, v1]) => [h([u0, v0]), h([u1, v0]), h([u1, v1]), h([u0, v1])]) : null
  const start = startRaum(c, st)
  return {
    k: st.k,
    y: st.k * c.gh,
    raeume,
    waende,
    moebel,
    dinge,
    fahrzeuge,
    schilder,
    boden,
    loecher,
    start: index.get(start) ?? 0,
  }
}

const runden = (v: number) => Math.round(v * 1e4) / 1e4

function laeufeAusgeben(c: Ctx): InnenLauf[] {
  const K = c.kern
  if (!K) return []
  const out: InnenLauf[] = []
  for (let f = 0; f <= c.n - 2; f++) {
    const { bahn, vonKlein } = laufLage(K, f)
    const L = bahnLage(c, K, bahn)
    const qm = (L.q0 + L.q1) / 2
    const a = lokalPunkt(K, vonKlein ? L.s0 : L.s1, qm)
    const d = vonKlein ? 1 : -1
    const ul: P = K.achse === 0 ? [d, 0] : [0, d]
    const ah = hausVon(c.rahmen, a[0], a[1])
    out.push({ k: f, a: [runden(ah[0]), runden(ah[1])], u: richtungHaus(c.rahmen, ul[0], ul[1]), laenge: runden(L.s1 - L.s0), breite: runden(L.q1 - L.q0), stufen: K.stufen })
  }
  return out
}

/* ============================================================ innenPlanen */

/** Ein glaubhaftes Inneres fuer ein Haus der Stadt (siehe oben). Kaputte
 *  Eingaben (kein Umriss, keine Flaeche) geben ein Inneres ohne Geschosse. */
export function innenPlanen(e: InnenEingabe): InnenPlan {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now()
  const leer: InnenPlan = {
    id: String(e?.id ?? ''),
    art: e?.art ?? 'sonst',
    ringe: [],
    geschossHoehe: 3,
    geschosse: [],
    laeufe: [],
    tuer: null,
    fenster: [],
    zelle: 0,
    ms: 0,
  }
  const c = vorbereiten(e)
  if (!c) return leer
  const programm = PROGRAMME[c.art] ?? PROGRAMME.sonst
  // Treppenhaus fuer alle Geschosse gleich.
  if (c.n >= 2) {
    let ziel: P = c.tuer ? [c.tuer.ml[0] + c.tuer.nl[0] * 3, c.tuer.ml[1] + c.tuer.nl[1] * 3] : [0, 0]
    let sperre: Uint8Array | null = null
    const F = c.feld
    if (c.art === 'einkaufszentrum') {
      let su = 0
      let sv = 0
      let n = 0
      for (let z = 0; z < F.frei.length; z++) {
        if (!F.frei[z]) continue
        su += z % F.nu
        sv += Math.floor(z / F.nu)
        n++
      }
      ziel = [F.u0 + (su / Math.max(1, n) + 0.5) * F.gu, F.v0 + (sv / Math.max(1, n) + 0.5) * F.gv]
    }
    if (c.art === 'laden' || c.art === 'supermarkt' || c.art === 'halle' || c.art === 'garage' || c.art === 'schuppen') {
      // Hinten, weg von der Tuer (nicht mitten im Verkaufsraum).
      let best = -1
      let bestT = -Infinity
      for (let z = 0; z < F.frei.length; z++) {
        if (!F.frei[z]) continue
        const t = tiefeAbTuer(c, z) - 0.05 * querAbTuer(c, z)
        if (t > bestT) {
          bestT = t
          best = z
        }
      }
      if (best >= 0) ziel = [F.u0 + ((best % F.nu) + 0.5) * F.gu, F.v0 + (Math.floor(best / F.nu) + 0.5) * F.gv]
    }
    if (c.art === 'feuerwehr') {
      const t = hallenTiefe(c)
      sperre = new Uint8Array(F.frei.length)
      for (let z = 0; z < sperre.length; z++) if (F.frei[z] && tiefeAbTuer(c, z) <= t) sperre[z] = 1
    }
    if (c.art === 'kirche') {
      sperre = new Uint8Array(F.frei.length)
      for (let z = 0; z < sperre.length; z++) if (F.frei[z] && tiefeAbTuer(c, z) > AW + 7.5) sperre[z] = 1
    }
    c.kern = kernSuchen(c, ziel, sperre, c.art === 'einkaufszentrum')
    if (!c.kern && sperre) c.kern = kernSuchen(c, ziel, null, c.art === 'einkaufszentrum')
  }
  const stoecke: Stock[] = []
  const regel: (Stock | null)[] = [null, null]
  for (let k = 0; k < c.n; k++) {
    // Regelgeschosse (zwischen dem ersten und dem obersten) haben dieselben Raeume wie
    // das erste oder zweite Obergeschoss (gleiches Podest), nur neu eingerichtet.
    const vorbild = regel[k % 2]
    if (vorbild && k >= 3 && k <= c.n - 2) {
      const st = stockKopie(c, vorbild, k)
      c.rnd = st.rnd
      treppeSperren(c, st)
      einrichten(c, st)
      stoecke.push(st)
      continue
    }
    const st = stockAnfangen(c, k)
    c.rnd = st.rnd
    if (k > 0 && !c.kern) {
      // Ohne Treppe ist das Geschoss nicht zu erreichen: kein Inneres.
      st.zelle.fill(-1)
      stoecke.push(st)
      continue
    }
    programm(c, st)
    restVerteilen(c, st)
    sackgasseVerteilen(c, st)
    zusammenhalten(c, st)
    engstellenGlaetten(c, st)
    zusammenhalten(c, st)
    kleineZusammenlegen(c, st)
    erreichbarMachen(c, st)
    treppeSperren(c, st)
    einrichten(c, st)
    stoecke.push(st)
    if ((k === 1 || k === 2) && k <= c.n - 2) regel[k % 2] = st
  }
  dingeVerteilen(c, stoecke)
  const geschosse = stoecke.map((st) => geschossAusgeben(c, st))
  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now()
  return {
    id: String(e.id),
    art: c.art,
    ringe: c.ringe.map((r) => r.map((p) => [p[0], p[1]] as Punkt2)),
    geschossHoehe: c.gh,
    geschosse,
    laeufe: laeufeAusgeben(c),
    tuer: c.tuer ? { kante: c.tuer.kante, t: c.tuer.t, mitte: c.tuer.mitte, u: c.tuer.u, n: c.tuer.n, breite: c.tuer.breite } : null,
    fenster: c.fenster,
    zelle: runden(Math.max(c.feld.gu, c.feld.gv)),
    ms: runden(t1 - t0),
  }
}

/* ============================================================ wohnhausInnen */

/** Wohnungen fuer ein Haus der Siedlung ohne bekannte Plaene (E87), im
 *  Format von siedlungen.innen (E84), damit siedlung3d.ts es wie die echten
 *  Plaene zeichnet. kern: Stiegenhaus und Aufzug, die siedlung3d schon
 *  baut (cm im Rahmen des Geschosses), dort entsteht keine Wohnung. */
export function wohnhausInnen(e: {
  gebaeudeId: string
  /** Rahmen des Geschosses: wie SiedlungInnenHaus x, z, drehung. */
  x: number
  z: number
  drehung: 0 | 90 | 180 | 270
  /** Umriss eines Geschosses in cm im Rahmen des Geschosses. */
  umrissCm: [number, number][]
  geschosse: number
  kern: [number, number][][]
  /** Gang oder Laubengang (cm), ueber den die Wohnungstueren erreicht werden. */
  gang: [number, number][][]
}): SiedlungInnenHaus | null {
  if (!e || !Array.isArray(e.umrissCm) || e.umrissCm.length < 3) return null
  if (![0, 90, 180, 270].includes(e.drehung) || !zahlOk(e.x) || !zahlOk(e.z)) return null
  const umriss: P[] = e.umrissCm.map((p) => [Number(p[0]) / 100, Number(p[1]) / 100])
  if (!umriss.every((p) => zahlOk(p[0]) && zahlOk(p[1])) || Math.abs(flaecheVon(umriss)) < 20) return null
  const n = klemm(Math.round(zahlOk(e.geschosse) ? e.geschosse : 1), 1, 30)
  const zuM = (liste: [number, number][][] | undefined) =>
    (Array.isArray(liste) ? liste : []).filter((q) => Array.isArray(q) && q.length >= 3).map((q) => q.map((p) => [Number(p[0]) / 100, Number(p[1]) / 100] as P)).filter((q) => q.every((p) => zahlOk(p[0]) && zahlOk(p[1])))
  let kern = zuM(e.kern)
  let gang = zuM(e.gang)
  // Raster wie die Stadt, aber mit 24 cm Wand (die Raumkante liegt in Kistly 6 cm in der Wand).
  const saat = saatAus(String(e.gebaeudeId))
  const rnd = zufallMit(saat)
  let lang = -1
  let ax = 1
  let az = 0
  for (let i = 0; i < umriss.length; i++) {
    const a = umriss[i]
    const b = umriss[(i + 1) % umriss.length]
    const l = Math.hypot(b[0] - a[0], b[1] - a[1])
    if (l > lang + 1e-9) {
      lang = l
      ax = (b[0] - a[0]) / l
      az = (b[1] - a[1]) / l
    }
  }
  const rahmen: Rahmen = { ox: umriss[0][0], oz: umriss[0][1], ax, az }
  const ringeL = [umriss.map((p) => lokal(rahmen, p[0], p[1]))]
  const feld = feldBauen(ringeL, 0.24, 0.3)
  if (!feld) return null
  const F = feld
  const N = F.nu * F.nv
  const mitte = (z: number): P => {
    const i = z % F.nu
    const j = (z - i) / F.nu
    return hausVon(rahmen, F.u0 + (i + 0.5) * F.gu, F.v0 + (j + 0.5) * F.gv)
  }
  const inPoly = (p: P, poly: P[]) => {
    let drin = false
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i]
      const b = poly[j]
      if (a[1] > p[1] !== b[1] > p[1] && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) drin = !drin
    }
    return drin
  }
  const abstandPoly = (p: P, poly: P[]) => {
    let d = Infinity
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i]
      const b = poly[(i + 1) % poly.length]
      d = Math.min(d, abstandStrecke(p[0], p[1], a[0], a[1], b[0], b[1]))
    }
    return inPoly(p, poly) ? -d : d
  }
  const halb = Math.hypot(F.gu, F.gv) / 2
  // Ohne Gang: ein Mittelgang (oder an der Seite) laengs durch das Haus, mit eigener Stiege.
  const eigenerGang = !gang.length
  if (eigenerGang) {
    let vmin = Infinity
    let vmax = -Infinity
    let umin = Infinity
    let umax = -Infinity
    for (const [u, v] of ringeL[0]) {
      umin = Math.min(umin, u)
      umax = Math.max(umax, u)
      vmin = Math.min(vmin, v)
      vmax = Math.max(vmax, v)
    }
    const tiefe = vmax - vmin
    const gb = 1.5
    const gv0 = tiefe >= 10 ? (vmin + vmax) / 2 - gb / 2 : vmax - 0.24 - gb
    const rechteck = (u0: number, v0: number, u1: number, v1: number): P[] => [hausVon(rahmen, u0, v0), hausVon(rahmen, u1, v0), hausVon(rahmen, u1, v1), hausVon(rahmen, u0, v1)]
    gang = [rechteck(umin - 0.01, gv0, umax + 0.01, gv0 + gb)]
    if (!kern.length && n >= 2) {
      const sl = 5.6
      const sb = 2.6
      const sv0 = gv0 + gb > (vmin + vmax) / 2 + 2 ? gv0 - sb : gv0 + gb
      kern = [rechteck(umin + 0.24, sv0, umin + 0.24 + sl, sv0 + sb)]
    }
  }
  const zelle = new Int32Array(N)
  for (let z = 0; z < N; z++) {
    if (!F.frei[z]) {
      zelle[z] = -1
      continue
    }
    const p = mitte(z)
    const zuNah = [...kern, ...gang].some((q) => abstandPoly(p, q) < halb + 0.1)
    zelle[z] = zuNah ? -1 : -2
  }
  // Ein Stock fuer die Wohnungen, mit einem Flur-Raum fuer die Front.
  const ctx: Ctx = {
    e: { id: e.gebaeudeId, art: 'wohnen', umriss, geschosse: n, geschossHoehe: 3, tuer: { kante: 0, t: 0.5 } },
    art: 'wohnen',
    n,
    gh: 3,
    ringe: [umriss],
    ringeL,
    rahmen,
    feld: F,
    qm: F.gu * F.gv,
    strafeU: new Float32Array(F.nu + 1),
    strafeV: new Float32Array(F.nv + 1),
    fenster: [],
    fensterL: [],
    tuer: null,
    eingang: [],
    kern: null,
    ladenNr: 0,
    rnd,
    saat,
  }
  const allgemein: SiedlungInnenHaus['geschosse'][number]['allgemein'] = [
    ...kern.map((q) => ({ art: 'stiege' as const, punkte: q.map(cmPunkt) })),
    ...gang.map((q) => ({ art: 'gang' as const, punkte: q.map(cmPunkt) })),
  ]
  for (const a of allgemein) if (flaecheVon(a.punkte) < 0) a.punkte.reverse()
  // Abstand jeder Zelle zum Gang (fuer die Front der Wohnungen).
  const dGang = new Float32Array(N).fill(Infinity)
  for (let z = 0; z < N; z++) {
    if (zelle[z] !== -2) continue
    const p = mitte(z)
    for (const g of gang) dGang[z] = Math.min(dGang[z], Math.max(0, abstandPoly(p, g)))
  }
  const geschosse: SiedlungInnenHaus['geschosse'] = []
  const allgemeinKopie = () => allgemein.map((a) => ({ art: a.art, punkte: a.punkte.map((p) => [p[0], p[1]] as [number, number]) }))
  for (let k = 0; k < n; k++) {
    const st: Stock = {
      k,
      zelle: Int32Array.from(zelle),
      regs: [],
      anfragen: [],
      einheiten: 0,
      waende: [],
      extra: [],
      oeffnungen: [],
      belegt: new Uint8Array(N),
      halten: new Uint8Array(N),
      moebel: [],
      dinge: [],
      fahrzeuge: [],
      schilder: [],
      start: -1,
      bodenZonen: null,
      rnd: zufallMit((saat ^ Math.imul(k + 7, 0x9e3779b1)) >>> 0),
      listen: null,
      kaesten: null,
      plaetze: new Map(),
    }
    ctx.rnd = st.rnd
    const offen = freieZellen(st)
    const qm = offen.length * ctx.qm
    if (qm < 20) {
      geschosse.push({ geschoss: k, wohnungen: [], allgemein: allgemeinKopie() })
      continue
    }
    // Ein Hilfs-Flur: die vorderste Zellreihe am Gang, damit jede Wohnung ihre Front findet.
    const flur = neuerRaum(st, 'flur', 'flur')
    const anzahl = klemm(Math.round(qm / 68), 2, 4)
    const frontZellen = offen.filter((z) => dGang[z] < Infinity)
    let dMin = Infinity
    for (const z of frontZellen) dMin = Math.min(dMin, dGang[z])
    const achse = (() => {
      const nah = frontZellen.filter((z) => dGang[z] <= dMin + Math.max(F.gu, F.gv) * 0.6)
      let i0 = Infinity
      let i1 = -1
      let j0 = Infinity
      let j1 = -1
      for (const z of nah.length ? nah : offen) {
        const i = z % F.nu
        const j = (z - i) / F.nu
        i0 = Math.min(i0, i)
        i1 = Math.max(i1, i)
        j0 = Math.min(j0, j)
        j1 = Math.max(j1, j)
      }
      return ((i1 - i0 + 1) * F.gu >= (j1 - j0 + 1) * F.gv ? 0 : 1) as 0 | 1
    })()
    const teile = teilenEntlang(ctx, offen, achse, Array.from({ length: anzahl }, () => 0.85 + st.rnd() * 0.3), 3.6).filter((t) => t.length)
    const bereiche: { von: number; bis: number; reihe: number[] }[] = []
    for (const t of teile) {
      const haupt = stuecke(ctx, t)[0]
      if (haupt.length * ctx.qm < 14) continue
      // Vorderste Reihe: die Zellen der Wohnung, die dem Gang am naechsten liegen.
      let dw = Infinity
      for (const z of haupt) dw = Math.min(dw, dGang[z])
      if (!Number.isFinite(dw) || dw > 1.2) continue
      const reihe = haupt.filter((z) => dGang[z] <= dw + Math.min(F.gu, F.gv) * 0.5)
      setzen(st, reihe, flur)
      const rest = haupt.filter((z) => st.zelle[z] === -2)
      const von = st.regs.length
      wohnungAnlegen(ctx, st, rest, true)
      for (const z of reihe) st.zelle[z] = -2
      restInWohnung(ctx, st, reihe, von)
      bereiche.push({ von, bis: st.regs.length, reihe })
    }
    st.regs[flur].aktiv = false
    // Alles andere bleibt leer (wird nicht gezeichnet); Waende, Tueren und Moebel einmal fuer alle.
    for (let z = 0; z < N; z++) if (st.zelle[z] === -2 || st.zelle[z] === flur) st.zelle[z] = -1
    waendeBauen(ctx, st)
    oeffnungenSetzen(ctx, st)
    einrichten(ctx, st)
    const wohnungen: SiedlungInnenWohnung[] = []
    let nr = 0
    for (const b of bereiche) {
      const w = wohnungAusgeben(ctx, st, b.von, b.bis, `${hausBuchstabe(e.gebaeudeId)}${k}${String(++nr).padStart(2, '0')}`, gang)
      if (w) wohnungen.push(w)
    }
    geschosse.push({ geschoss: k, wohnungen, allgemein: allgemeinKopie() })
  }
  return { gebaeudeId: String(e.gebaeudeId).slice(0, 64), x: e.x, z: e.z, drehung: e.drehung, geschosse }
}

const cmPunkt = (p: P): [number, number] => [Math.round(p[0] * 10000) / 100, Math.round(p[1] * 10000) / 100]

/** Ein Buchstabe fuer die Top-Nummern (nicht wie eine echte Adresse). */
function hausBuchstabe(id: string): string {
  const s = saatAus(id)
  return 'Haus-' + String.fromCharCode(65 + (s % 26)) + '-'
}

/** Zellen der Hilfsreihe an die Raeume der Wohnung daneben (ab Index vorher). */
function restInWohnung(c: Ctx, st: Stock, reihe: number[], vorher: number): void {
  const F = c.feld
  for (let runde = 0; runde < 30; runde++) {
    let offen = 0
    for (const z of reihe) {
      if (st.zelle[z] !== -2) continue
      offen++
      const i = z % F.nu
      const j = (z - i) / F.nu
      for (const y of [j > 0 ? z - F.nu : -1, j < F.nv - 1 ? z + F.nu : -1, i > 0 ? z - 1 : -1, i < F.nu - 1 ? z + 1 : -1]) {
        if (y >= 0 && st.zelle[y] >= vorher) {
          st.zelle[z] = st.zelle[y]
          break
        }
      }
    }
    if (!offen) return
  }
  for (const z of reihe) if (st.zelle[z] === -2) st.zelle[z] = -1
}

/** Umriss einer Zellmenge (ohne Loecher), im Uhrzeigersinn am Bildschirm, lokal. */
function zellUmriss(c: Ctx, st: Stock, r: number): P[] | null {
  const F = c.feld
  // Gerichtete Randkanten (Inneres rechts im y-nach-unten-Sinn: wir sammeln mathematisch links und drehen am Ende).
  const kanten = new Map<number, number[]>()
  const punktId = (i: number, j: number) => j * (F.nu + 1) + i
  const add = (a: number, b: number) => {
    const l = kanten.get(a)
    if (l) l.push(b)
    else kanten.set(a, [b])
  }
  let n = 0
  for (let j = 0; j < F.nv; j++) {
    for (let i = 0; i < F.nu; i++) {
      if (st.zelle[j * F.nu + i] !== r) continue
      n++
      const in_ = (x: number, y: number) => x >= 0 && y >= 0 && x < F.nu && y < F.nv && st.zelle[y * F.nu + x] === r
      // Gegen den Uhrzeigersinn in (u, v) mit v nach oben gedacht: unten, rechts, oben, links.
      if (!in_(i, j - 1)) add(punktId(i, j), punktId(i + 1, j))
      if (!in_(i + 1, j)) add(punktId(i + 1, j), punktId(i + 1, j + 1))
      if (!in_(i, j + 1)) add(punktId(i + 1, j + 1), punktId(i, j + 1))
      if (!in_(i - 1, j)) add(punktId(i, j + 1), punktId(i, j))
    }
  }
  if (!n) return null
  // Laengste Schleife.
  let best: number[] | null = null
  const benutzt = new Set<string>()
  for (const [s, ziele] of kanten) {
    for (const z0 of ziele) {
      const key0 = `${s}>${z0}`
      if (benutzt.has(key0)) continue
      const schleife = [s]
      let a = s
      let b = z0
      let sicher = 0
      while (sicher++ < 100000) {
        benutzt.add(`${a}>${b}`)
        if (b === s) break
        schleife.push(b)
        const weiter = (kanten.get(b) ?? []).filter((x) => !benutzt.has(`${b}>${x}`))
        if (!weiter.length) break
        a = b
        b = weiter[0]
      }
      if (!best || schleife.length > best.length) best = schleife
    }
  }
  if (!best || best.length < 4) return null
  const pts: P[] = best.map((id) => {
    const i = id % (F.nu + 1)
    const j = (id - i) / (F.nu + 1)
    return [F.u0 + i * F.gu, F.v0 + j * F.gv]
  })
  // Gerade Zwischenpunkte weg.
  const out: P[] = []
  for (let k = 0; k < pts.length; k++) {
    const a = pts[(k - 1 + pts.length) % pts.length]
    const b = pts[k]
    const d = pts[(k + 1) % pts.length]
    const kreuz = (b[0] - a[0]) * (d[1] - b[1]) - (b[1] - a[1]) * (d[0] - b[0])
    if (Math.abs(kreuz) > 1e-9) out.push(b)
  }
  return out.length >= 3 ? out : null
}

/** Eine Wohnung (Raeume ab Index vorher) im Format E84 ausgeben. */
function wohnungAusgeben(c: Ctx, st: Stock, vorher: number, bis: number, top: string, gang: P[][]): SiedlungInnenWohnung | null {
  const R = c.rahmen
  const regs: number[] = []
  for (let r = vorher; r < bis; r++) if (st.regs[r].aktiv && st.regs[r].art === 'raum' && zellenVon(st, r).length) regs.push(r)
  if (!regs.length) return null
  const raeume: SiedlungInnenRaum[] = []
  const idx = new Map<number, number>()
  const polys = new Map<number, P[]>()
  for (const r of regs) {
    const lok = zellUmriss(c, st, r)
    if (!lok) continue
    let pts = lok.map((p) => hausVon(R, p[0], p[1]))
    if (flaecheVon(pts) < 0) pts = [pts[0], ...pts.slice(1).reverse()]
    idx.set(r, raeume.length)
    polys.set(r, pts)
    raeume.push({ name: st.regs[r].name, art: 'innen', punkte: pts.map(cmPunkt) })
  }
  if (!raeume.length) return null
  const oeffnungen: SiedlungInnenOeffnung[] = []
  const kanteMit = (pts: P[], a: P, b: P): { kante: number; ab: number } | null => {
    // Kante des Raums, auf der die Strecke a-b liegt.
    for (let k = 0; k < pts.length; k++) {
      const p = pts[k]
      const q = pts[(k + 1) % pts.length]
      const L = Math.hypot(q[0] - p[0], q[1] - p[1])
      if (L < 1e-6) continue
      const ux = (q[0] - p[0]) / L
      const uz = (q[1] - p[1]) / L
      const da = Math.abs((a[0] - p[0]) * uz - (a[1] - p[1]) * ux)
      const db = Math.abs((b[0] - p[0]) * uz - (b[1] - p[1]) * ux)
      if (da > 0.02 || db > 0.02) continue
      const ta = (a[0] - p[0]) * ux + (a[1] - p[1]) * uz
      const tb = (b[0] - p[0]) * ux + (b[1] - p[1]) * uz
      const t0 = Math.min(ta, tb)
      const t1 = Math.max(ta, tb)
      if (t0 < -0.02 || t1 > L + 0.02) continue
      return { kante: k, ab: Math.max(0, t0) }
    }
    return null
  }
  // Innentueren aus den gesetzten Oeffnungen.
  for (const o of st.oeffnungen) {
    const ia = idx.get(o.ra)
    const ib = idx.get(o.rb)
    if (ia === undefined || ib === undefined) continue
    const a = hausVon(R, o.c[0] - (o.w[0] * o.breite) / 2, o.c[1] - (o.w[1] * o.breite) / 2)
    const b = hausVon(R, o.c[0] + (o.w[0] * o.breite) / 2, o.c[1] + (o.w[1] * o.breite) / 2)
    const k = kanteMit(polys.get(o.ra) as P[], a, b)
    if (!k) continue
    oeffnungen.push({ raum: ia, art: o.art === 'durchgang' ? 'durchgang' : 'tuer', kante: k.kante, abstand_cm: Math.round(k.ab * 1000) / 10, breite_cm: Math.round(o.breite * 1000) / 10, hoehe_cm: o.art === 'durchgang' ? 220 : 210, bruestung_cm: 0, anschlag: 'links', aufschlag: 'innen' })
  }
  // Wohnungstuer: am Vorraum (sonst am ersten Raum) auf der Kante, die dem Gang am naechsten liegt.
  const vorraum = regs.find((r) => st.regs[r].typ === 'vorraum' && idx.has(r)) ?? regs.find((r) => idx.has(r)) ?? -1
  let eingang: [number, number] | null = null
  if (vorraum >= 0) {
    const pts = polys.get(vorraum) as P[]
    let best = -1
    let bestD = Infinity
    for (let k = 0; k < pts.length; k++) {
      const p = pts[k]
      const q = pts[(k + 1) % pts.length]
      const L = Math.hypot(q[0] - p[0], q[1] - p[1])
      if (L < 1.15) continue
      const m: P = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]
      let d = Infinity
      for (const g of gang) {
        for (let i = 0; i < g.length; i++) {
          const a = g[i]
          const b = g[(i + 1) % g.length]
          d = Math.min(d, abstandStrecke(m[0], m[1], a[0], a[1], b[0], b[1]))
        }
        let drin = false
        for (let i = 0, j = g.length - 1; i < g.length; j = i++) {
          const a = g[i]
          const b = g[j]
          if (a[1] > m[1] !== b[1] > m[1] && m[0] < ((b[0] - a[0]) * (m[1] - a[1])) / (b[1] - a[1]) + a[0]) drin = !drin
        }
        if (drin) d = 0
      }
      if (d < bestD) {
        bestD = d
        best = k
      }
    }
    if (best >= 0) {
      const p = pts[best]
      const q = pts[(best + 1) % pts.length]
      const L = Math.hypot(q[0] - p[0], q[1] - p[1])
      const breite = Math.min(1.0, L - 0.2)
      const ab = (L - breite) / 2
      oeffnungen.unshift({ raum: idx.get(vorraum) as number, art: 'tuer', kante: best, abstand_cm: Math.round(ab * 1000) / 10, breite_cm: Math.round(breite * 1000) / 10, hoehe_cm: 210, bruestung_cm: 0, anschlag: 'rechts', aufschlag: 'innen' })
      // Eingang 90 cm vor der Tuer, auf der Seite ausserhalb des Raums.
      const ux = (q[0] - p[0]) / L
      const uz = (q[1] - p[1]) / L
      // Im Uhrzeigersinn (Bildschirm) liegt das Innere rechts: aussen ist (uz, -ux).
      const m: P = [p[0] + ux * (ab + breite / 2) + uz * 0.9, p[1] + uz * (ab + breite / 2) - ux * 0.9]
      eingang = cmPunkt(m)
    }
  }
  // Fenster an Aussenkanten (Raumkanten, hinter denen nichts liegt).
  regs.forEach((r) => {
    const i = idx.get(r)
    if (i === undefined) return
    const pts = polys.get(r) as P[]
    for (let k = 0; k < pts.length; k++) {
      const p = pts[k]
      const q = pts[(k + 1) % pts.length]
      const L = Math.hypot(q[0] - p[0], q[1] - p[1])
      if (L < 1.8) continue
      const ux = (q[0] - p[0]) / L
      const uz = (q[1] - p[1]) / L
      const m: P = [(p[0] + q[0]) / 2 + uz * 0.5, (p[1] + q[1]) / 2 - ux * 0.5]
      // Aussen: der Punkt 50 cm hinter der Kante liegt in keinem Raum und ausserhalb von Gang und Kern nahe am Umriss.
      const umr = c.ringe[0]
      let dUmriss = Infinity
      for (let a = 0; a < umr.length; a++) {
        const s = umr[a]
        const t = umr[(a + 1) % umr.length]
        dUmriss = Math.min(dUmriss, abstandStrecke(m[0], m[1], s[0], s[1], t[0], t[1]))
      }
      const mitteKante: P = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]
      let dKante = Infinity
      for (let a = 0; a < umr.length; a++) {
        const s = umr[a]
        const t = umr[(a + 1) % umr.length]
        dKante = Math.min(dKante, abstandStrecke(mitteKante[0], mitteKante[1], s[0], s[1], t[0], t[1]))
      }
      if (dKante > 0.45) continue
      if (gang.some((g) => g.some((_, gi) => abstandStrecke(mitteKante[0], mitteKante[1], g[gi][0], g[gi][1], g[(gi + 1) % g.length][0], g[(gi + 1) % g.length][1]) < 0.5))) continue
      void dUmriss
      const anzahl = Math.max(1, Math.min(4, Math.floor((L - 0.6) / 2.6)))
      const fb = 1.2
      for (let f = 0; f < anzahl; f++) {
        const tm = (L * (f + 0.5)) / anzahl
        oeffnungen.push({ raum: i, art: 'fenster', kante: k, abstand_cm: Math.round((tm - fb / 2) * 1000) / 10, breite_cm: fb * 100, hoehe_cm: 140, bruestung_cm: 90, anschlag: 'links', aufschlag: 'innen' })
      }
    }
  })
  // Kueche und Bad (nur die Namen, die siedlung3d kennt).
  const moebel: SiedlungInnenMoebel[] = []
  for (const m of st.moebel) {
    if (!regs.includes(m.raum)) continue
    const name = m.art === 'kueche' ? 'Kuechenzeile' : m.art === 'kuehlschrank' ? 'Kuehlschrank' : m.art === 'wc' ? 'WC' : m.art === 'becken' ? 'Waschbecken' : m.art === 'wanne' ? 'Badewanne' : m.art === 'dusche' ? 'Dusche' : m.art === 'waschmaschine' ? 'Waschmaschine' : null
    if (!name) continue
    // Ecke (x, y): hinten links; lokal x laengs (Breite), y nach vorn.
    const u: P = [m.d[1], -m.d[0]]
    const uh = richtungHaus(R, u[0], u[1])
    const dh = richtungHaus(R, m.d[0], m.d[1])
    const ch = hausVon(R, m.c[0], m.c[1])
    const ecke: P = [ch[0] - (uh[0] * m.b) / 2 - (dh[0] * m.t) / 2, ch[1] - (uh[1] * m.b) / 2 - (dh[1] * m.t) / 2]
    const grad = (((Math.round((Math.atan2(uh[1], uh[0]) * 180) / Math.PI / 90) * 90) % 360) + 360) % 360
    moebel.push({ name, x: cmPunkt(ecke)[0], y: cmPunkt(ecke)[1], breite_cm: Math.round(m.b * 100), tiefe_cm: Math.round(m.t * 100), drehung: grad as 0 | 90 | 180 | 270 })
  }
  const zimmer = regs.filter((r) => ['zimmer', 'schlafen', 'kind'].includes(st.regs[r].typ)).length
  return { top: top.slice(0, 20), typ: `${zimmer + 1} Zimmer`, raeume, oeffnungen, moebel, eingang }
}
