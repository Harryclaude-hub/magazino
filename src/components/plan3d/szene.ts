/* Der Grundriss als Liste einfacher Koerper fuer die 3D-Ansicht (START
 * 5.5, BAUPLAN 5.4). Reine Rechnung ohne three und ohne React, damit Node
 * sie pruefen kann (scripts/szene-pruefen.mjs). Raum3D.tsx macht daraus
 * Meshes.
 *
 * Massstab 1 = 1 m. Plan-x wird x, Plan-y wird z, die Hoehe ist y. Ein
 * Quader steht mit seiner Mitte an `mitte`, `masse` ist [Laenge entlang
 * seiner Richtung, Hoehe, Tiefe], `drehY` dreht ihn um die senkrechte
 * Achse (Bogenmass, wie three: positiv dreht x nach -z).
 *
 * Entschieden wird hier nichts, gezeigt wird, was grundriss_laden liefert.
 */
import { flaeche2, objektGlobal, objektRechtecke, punktImPolygon, wandStuecke, zuUmriss, type Punkt } from '../../lib/geometrie.ts'
import {
  autoSchalter,
  flaecheQm,
  inOeffnung,
  innenNormale,
  innenPunkt,
  kisteAusdehnung,
  oeffnungPunkte,
  oeffnungsLoecher,
  spaltenBereich,
  streckenAbstand,
  symbolAnWand,
} from '../plan/hilfe.ts'
import type { GrundrissDaten, Objekt, PlanKiste, Raum } from '../../lib/types'
import { istDeko, moebelArt, type MoebelArt } from '../plan/moebelArt.ts'
import { moebelTeile, ton, type Teil } from './moebel3d.ts'

/** Die Farben, die die Szene braucht. Raum3D liest sie aus den Tokens. */
export interface Farben3D {
  grund: string
  boden: string
  bodenDraussen: string
  wand: string
  wand3d: string
  tuer: string
  fenster: string
  objekt: string
  objektRand: string
  fach: string
  kisteRand: string
  hervor: string
  strom: string
  steckdose: string
  /* Nur 3D, damit es echter aussieht (E64): */
  wandKopf: string
  wandKante: string
  tuer3d: string
  zarge3d: string
  rahmen3d: string
  boden3d: string
  bodenDraussen3d: string
  holz: string
  holzDunkel: string
  stoff: string
  waesche: string
  keramik: string
  metall: string
  schwarz: string
  front: string
  platte: string
  weiss: string
  gruen: string
  topf: string
  teppich: string
  glas: string
  /** Schalter- und Steckdosenplatte, Spiegel (E74). */
  schalter3d: string
  spiegel: string
  /* E82: Griffe, Wasser, Bildschirm, Aussenwelt, Kistenpappe, Stoffe, Spielzeug. */
  griff: string
  wasser: string
  bildschirm: string
  rasen: string
  weg: string
  baum: string
  stamm: string
  hecke: string
  himmelOben: string
  himmelUnten: string
  fassade: string
  pappe: string
  leinen: string
  spielRot: string
  spielBlau: string
  spielGelb: string
  spielGruen: string
}

/** Welches Token hinter welcher Farbe steht (src/index.css). */
export const FARB_TOKENS: Record<keyof Farben3D, string> = {
  grund: '--plan-grund',
  boden: '--plan-boden',
  bodenDraussen: '--plan-boden-draussen',
  wand: '--plan-wand',
  wand3d: '--plan-wand-3d',
  tuer: '--plan-tuer',
  fenster: '--plan-fenster',
  objekt: '--plan-objekt',
  objektRand: '--plan-objekt-rand',
  fach: '--plan-fach',
  kisteRand: '--plan-kiste-rand',
  hervor: '--plan-hervor',
  strom: '--plan-strom',
  steckdose: '--plan-steckdose',
  wandKopf: '--plan3d-wandkopf',
  wandKante: '--plan3d-wandkante',
  tuer3d: '--plan3d-tuer',
  zarge3d: '--plan3d-zarge',
  rahmen3d: '--plan3d-rahmen',
  boden3d: '--plan3d-boden',
  bodenDraussen3d: '--plan3d-boden-draussen',
  holz: '--plan3d-holz',
  holzDunkel: '--plan3d-holz-dunkel',
  stoff: '--plan3d-stoff',
  waesche: '--plan3d-waesche',
  keramik: '--plan3d-keramik',
  metall: '--plan3d-metall',
  schwarz: '--plan3d-schwarz',
  front: '--plan3d-front',
  platte: '--plan3d-platte',
  weiss: '--plan3d-weiss',
  gruen: '--plan3d-gruen',
  topf: '--plan3d-topf',
  teppich: '--plan3d-teppich',
  glas: '--plan3d-glas',
  schalter3d: '--plan3d-schalter',
  spiegel: '--plan3d-spiegel',
  griff: '--plan3d-griff',
  wasser: '--plan3d-wasser',
  bildschirm: '--plan3d-bildschirm',
  rasen: '--plan3d-rasen',
  weg: '--plan3d-weg',
  baum: '--plan3d-baum',
  stamm: '--plan3d-stamm',
  hecke: '--plan3d-hecke',
  himmelOben: '--plan3d-himmel-oben',
  himmelUnten: '--plan3d-himmel-unten',
  fassade: '--plan3d-fassade',
  pappe: '--plan3d-pappe',
  leinen: '--plan3d-leinen',
  spielRot: '--plan3d-spiel-rot',
  spielBlau: '--plan3d-spiel-blau',
  spielGelb: '--plan3d-spiel-gelb',
  spielGruen: '--plan3d-spiel-gruen',
}

export type Rolle =
  | 'boden'
  | 'wand'
  | 'wandkopf'
  | 'sturz'
  | 'bruestung'
  | 'zarge'
  | 'tuerblatt'
  | 'scheibe'
  | 'rahmen'
  | 'moebel'
  | 'regal'
  | 'brett'
  | 'kiste'
  | 'front'
  | 'leuchte'
  | 'schalter'
  /* E82 */
  | 'griff' // Tuerklinke, Rosette, Griffleiste: dreht mit seiner Tuer, kein Hindernis
  | 'schluessel' // Schluessel im Tuerschloss: Antippen schliesst ab und auf
  | 'spiegel' // Spiegelflaeche (normale zeigt nach vorn)
  | 'ding' // kleines Ding zum Aufheben (ding), kein Hindernis

export type Vec3 = [number, number, number]

export interface Quader {
  art: 'quader'
  rolle: Rolle
  mitte: Vec3
  masse: Vec3
  drehY: number
  farbe: string
  /** 1 = deckend. */
  deckkraft: number
  /** 0 = matt (Stoff), bis 1 = stark glaenzend (Metall, Glas). E67. */
  glanz?: number
  /** Farbe der Kanten, null ohne Kanten. */
  kante: string | null
  /** Ecken abgerundet, Radius in Metern (E81). Ohne Angabe legt der Motor
   *  bei Moebeln und Kisten eine feine Fase an. 0 = scharfe Kante. */
  rund?: number
  /** Rund statt eckig (E81), die Masse bleiben die umschliessende Kiste:
   *  Zylinder (oben: oberer Radius im Verhaeltnis zum unteren, Kegel;
   *  achse in Weltkoordinaten) oder Kugel. */
  form?: Form3D
  /** Id der Kiste oder des Objekts, sonst null. */
  id: string | null
  /** Gesuchte oder gewaehlte Kiste (bzw. Moebel). */
  hervor: boolean
  /** Bei Waenden (und allem, was in ihnen sitzt: Sturz, Bruestung, Tuer,
   *  Fenster): Einheitsnormale zur Raum-Innenseite in (x, z). Zeigt die
   *  Aussenseite zur Kamera, wird das Teil halbdurchsichtig. */
  innen: [number, number] | null
  /** Nur beim Tuerblatt: wie es sich um die Angel dreht (E65). Angel in
   *  Metern (x, z), Laenge in Metern, Winkel als drehY fuer zu und ganz
   *  offen (90 Grad). */
  tuer?: TuerDreh
  /** Schublade: faehrt um weg (Meter, x und z) heraus; alle Teile mit
   *  derselben id fahren zusammen. E68. */
  schub?: { id: string; weg: [number, number] }
  /* ------------------------------------------------------------ E82 */
  /** Hinsetzen oder Hinlegen: punkt ist die Mitte der Sitz- oder
   *  Liegeflaeche oben (Meter, Welt), blick die Blickrichtung als drehY
   *  (0 = Blick nach -z, wie die Kamera). Antippen beim Begehen setzt oder
   *  legt einen dorthin. */
  platz?: { art: 'sitz' | 'liegen'; punkt: Vec3; blick: number }
  /** Kleines Ding zum Aufheben. Alle Teile mit derselben Kennung gehen
   *  zusammen. Nur fuer die Sitzung, nichts wird gespeichert. */
  ding?: string
  /** Teil eines Geraets. Alle Teile mit derselben id gehoeren zu einem
   *  Geraet; Antippen eines davon schaltet es. teil: 'koerper' immer zu
   *  sehen, 'an' nur eingeschaltet (Wasserstrahl, leuchtendes Bild), 'aus'
   *  nur ausgeschaltet (schwarzer Bildschirm). 'an' ist nie ein Hindernis. */
  geraet?: { id: string; art: 'tv' | 'wasser'; teil: 'koerper' | 'an' | 'aus' }
  /** Nur bei rolle 'spiegel': Richtung der Vorderseite (x, z), Laenge 1. */
  normale?: [number, number]
  /** Geneigt um die eigene Mitte, Radiant, nach drehY (Euler 'YXZ'):
   *  x kippt um die Welt-x-Achse des ungedrehten Teils, z um seine z-Achse. */
  kipp?: { x: number; z: number }
  /** E89: bei leuchtenden Teilen eines Moebels (rolle 'leuchte', id ist
   *  dort der Raum fuer den Lichtschalter) die Kennung des Moebels, damit
   *  sie mit ihm getragen werden. */
  objekt?: string
}

export type Form3D = { art: 'zylinder'; oben: number; achse: 'x' | 'y' | 'z' } | { art: 'kugel' }

/** E82: Alle Teile mit tuer (Blatt, Klinke, Rosette, Schluessel, Griff
 *  einer Moebeltuer) sind in der Stellung zu beschrieben (mitte, drehY).
 *  Der Motor dreht jedes Teil mit derselben id um die Angel um (w - zu). */
export interface TuerDreh {
  id: string
  angel: [number, number]
  laenge: number
  zu: number
  auf: number
}

export interface Flaeche {
  art: 'flaeche'
  rolle: 'boden'
  /** Umriss in (x, z), Meter. */
  punkte: [number, number][]
  y: number
  farbe: string
  deckkraft: number
  id: string
}

export type Koerper = Quader | Flaeche

export interface SzeneOptionen {
  /** Nur dieser Raum (Kistenseite, Suche); sonst der ganze Grundriss. */
  raumId?: string | null
  /** Item-Id der gesuchten oder gewaehlten Kiste (oder eines Moebels). */
  hervor?: string | null
  /** Im Zeichner gewaehltes Moebel (Objekt-Id): leuchtet auf. */
  markiert?: string | null
  /** Teppiche zeigen (Standard) oder ausblenden (E74). */
  teppiche?: boolean
  /** Deko zeigen (Standard) oder ausblenden (E82), siehe DEKO_ARTEN. */
  deko?: boolean
  /** Diese Kiste (Item-Id) offen zeigen: Pappe mit aufgeklappten Klappen
   *  und Inhalt angedeutet (E82). */
  offeneKiste?: string | null
}

/** Wandstaerke in cm, wie in 2D (PlanBild). */
export const WAND_CM = 12
/** Blatt einer Tuer: so weit steht es offen (Grad). */
export const TUER_OFFEN_GRAD = 25
/** Deckkraft der Fensterscheibe. */
export const SCHEIBE_DECKKRAFT = 0.35
/** Deckkraft der anderen Kisten, wenn eine hervorgehoben ist. */
export const GEDAEMPFT = 0.38

const KOPF_CM = 2
const ZARGE_CM = 4
const BLATT_CM = 4
const RAHMEN_CM = 4
const BRETT_CM = 2
const SEITE_CM = 2

const m = (cm: number) => cm / 100

/** Massen der Tuerbeschlaege (E82), cm: Rosette 52 mm rund und 8 mm stark,
 *  Klinke 125 mm lang und 18 mm stark, Achse 1050 mm ueber dem Boden und
 *  65 mm vor der Schlosskante, Schluesselrosette 72 mm darunter. */
const KLINKE_HOEHE_CM = 105
const KLINKE_KANTE_CM = 6.5
const KLINKE_LANG_CM = 12.5
const KLINKE_DICK_CM = 1.8
const ROSETTE_CM = 5.2
const ROSETTE_DICK_CM = 0.8
const SCHLOSS_UNTER_CM = 7.2
const BESCHLAG_GLANZ = 0.85

function quader(
  rolle: Rolle,
  mitte: Vec3,
  masse: Vec3,
  farbe: string,
  mehr: Partial<Pick<Quader, 'drehY' | 'deckkraft' | 'kante' | 'id' | 'hervor' | 'innen'>> = {},
): Quader {
  return {
    art: 'quader',
    rolle,
    mitte,
    masse,
    drehY: mehr.drehY ?? 0,
    farbe,
    deckkraft: mehr.deckkraft ?? 1,
    kante: mehr.kante ?? null,
    id: mehr.id ?? null,
    hervor: mehr.hervor ?? false,
    innen: mehr.innen ?? null,
  }
}

/** Ein Stueck Wand (oder Sturz, Bruestung) entlang a -> b in cm, von
 *  unten bis oben (cm), dick in cm. */
function streifen(
  rolle: Rolle,
  a: Punkt,
  b: Punkt,
  unten: number,
  oben: number,
  dicke: number,
  farbe: string,
  mehr: Partial<Pick<Quader, 'deckkraft' | 'kante' | 'innen'>> = {},
): Quader | null {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const l = Math.hypot(dx, dy)
  if (l < 0.01 || oben - unten < 0.01) return null
  return quader(
    rolle,
    [m((a[0] + b[0]) / 2), m((unten + oben) / 2), m((a[1] + b[1]) / 2)],
    [m(l), m(oben - unten), m(dicke)],
    farbe,
    { ...mehr, drehY: -Math.atan2(dy, dx) },
  )
}

/** Innennormale der Kante k, unabhaengig vom Umlaufsinn. */
function raumInnen(r: Pick<Raum, 'punkte'>, k: number): [number, number] {
  const n = r.punkte.length
  const [nx, ny] = innenNormale(r.punkte[k], r.punkte[(k + 1) % n])
  // innenNormale gilt fuer den Uhrzeigersinn am Bildschirm (Flaeche > 0).
  return flaeche2(zuUmriss(r.punkte)) >= 0 ? [nx, ny] : [-nx, -ny]
}

/** Liegt p auf dem Rand von r (1 cm Toleranz)? */
function aufRand(r: Pick<Raum, 'punkte'>, p: Punkt): boolean {
  const n = r.punkte.length
  for (let k = 0; k < n; k++) {
    if (streckenAbstand(p, r.punkte[k], r.punkte[(k + 1) % n]).abstand <= 1) return true
  }
  return false
}

/** Hoehe des Balkongelaenders in cm (Oberkante Handlauf etwas darueber). */
const GELAENDER_CM = 100
/** Handlauf rund, 45 mm; Pfosten 40 x 40 mm, hoechstens 1,2 m auseinander. */
const HANDLAUF_CM = 4.5
const PFOSTEN_CM = 4
const PFOSTEN_ABSTAND_CM = 120
/** Glasfuellung zwischen den Pfosten (E82): das Hindernis. */
const GLAS_DECKKRAFT = 0.22
/** Balkonplatte und Dielen (E82), cm: Diele 14 breit im Raster 14,5
 *  (5 mm Fuge), 2 hoch. */
const PLATTE_CM = 16
const DIELE_CM = 14
const DIELE_RASTER_CM = 14.5
const DIELE_HOCH_CM = 2

/** Gelaender einer offenen Balkonseite a -> b (cm, E82): runde Pfosten aus
 *  Metall, darauf ein runder Handlauf (Oberkante 104,5 cm), unten eine
 *  Fussleiste, dazwischen Glas. Pfosten, Handlauf und Leiste ohne
 *  Innenseite (innen null), damit der Motor sie rundet; das Glas mit
 *  Innenseite wie eine Wand. Alles hat die Rolle Bruestung: man stoesst an. */
function gelaender(a: Punkt, b: Punkt, innen: [number, number], f: Farben3D): Quader[] {
  const l = Math.hypot(b[0] - a[0], b[1] - a[1])
  if (l < 1) return []
  const ux = (b[0] - a[0]) / l
  const uy = (b[1] - a[1]) / l
  const bei = (t: number): Punkt => [a[0] + ux * t, a[1] + uy * t]
  const drehY = -Math.atan2(uy, ux)
  const felder = Math.max(1, Math.ceil(l / PFOSTEN_ABSTAND_CM))
  const schritt = l / felder
  const out: Quader[] = []
  for (let i = 0; i <= felder; i++) {
    const p = bei(i * schritt)
    out.push({
      ...quader('bruestung', [m(p[0]), m(GELAENDER_CM / 2), m(p[1])], [m(PFOSTEN_CM), m(GELAENDER_CM), m(PFOSTEN_CM)], f.metall, { drehY }),
      glanz: 0.75,
      rund: m(0.6),
    })
  }
  const lauf = streifen('bruestung', a, b, GELAENDER_CM, GELAENDER_CM + HANDLAUF_CM, HANDLAUF_CM, f.metall)
  if (lauf) out.push({ ...lauf, glanz: 0.8, form: { art: 'zylinder', oben: 1, achse: 'x' } })
  const fuss = streifen('bruestung', a, b, 6, 10, 3, f.metall)
  if (fuss) out.push({ ...fuss, glanz: 0.75, rund: m(0.5) })
  for (let i = 0; i < felder; i++) {
    const glas = streifen('bruestung', bei(i * schritt + PFOSTEN_CM / 2), bei((i + 1) * schritt - PFOSTEN_CM / 2), 10, GELAENDER_CM - 1, 1, f.glas, {
      deckkraft: GLAS_DECKKRAFT,
      innen,
    })
    if (glas) out.push({ ...glas, glanz: 0.85 })
  }
  return out
}

/** Ein Grundriss-Umriss als Rechtecke (cm): Baender quer zur Richtung
 *  laengs, je Band die Stuecke im Raum. Genau bei rechtwinkligen Raeumen,
 *  sonst angenaehert (Mitte des Bands). laengs 0: Baender uebereinander
 *  (y), Stuecke entlang x; laengs 1 umgekehrt. */
function zerlegen(p: Punkt[], laengs: 0 | 1): { x0: number; x1: number; y0: number; y1: number }[] {
  const q = laengs === 0 ? 1 : 0
  const stufen = [...new Set(p.map((v) => v[q]))].sort((u, v) => u - v)
  const out: { x0: number; x1: number; y0: number; y1: number }[] = []
  for (let i = 0; i + 1 < stufen.length; i++) {
    const q0 = stufen[i]
    const q1 = stufen[i + 1]
    if (q1 - q0 < 0.5) continue
    const qm = (q0 + q1) / 2
    const schnitte: number[] = []
    for (let k = 0; k < p.length; k++) {
      const s = p[k]
      const e = p[(k + 1) % p.length]
      if (s[q] > qm !== e[q] > qm) schnitte.push(s[laengs] + ((qm - s[q]) * (e[laengs] - s[laengs])) / (e[q] - s[q]))
    }
    schnitte.sort((u, v) => u - v)
    for (let k = 0; k + 1 < schnitte.length; k += 2) {
      const l0 = schnitte[k]
      const l1 = schnitte[k + 1]
      if (l1 - l0 < 0.5) continue
      out.push(laengs === 0 ? { x0: l0, x1: l1, y0: q0, y1: q1 } : { x0: q0, x1: q1, y0: l0, y1: l1 })
    }
  }
  return out
}

/** Boden eines Balkons (E82): eine Betonplatte, 16 cm stark, ueber den
 *  Rand hinaus sichtbar (Oberkante knapp unter dem Boden, damit der
 *  Boden in den Fugen zu sehen ist), darauf Holzdielen, 14 cm breit, 5 mm
 *  Fuge, 2 cm hoch, entlang der langen Seite. Rolle Boden: kein Hindernis. */
function balkonBoden(r: Raum, f: Farben3D): Quader[] {
  const xs = r.punkte.map((v) => v[0])
  const ys = r.punkte.map((v) => v[1])
  const laengs: 0 | 1 = Math.max(...xs) - Math.min(...xs) >= Math.max(...ys) - Math.min(...ys) ? 0 : 1
  const stuecke = zerlegen(r.punkte, laengs)
  const out: Quader[] = []
  const platte = ton(f.fassade, 0.9)
  const RAND = 6
  for (const s of stuecke) {
    out.push(
      quader(
        'boden',
        [m((s.x0 + s.x1) / 2), -0.005 - m(PLATTE_CM) / 2, m((s.y0 + s.y1) / 2)],
        [m(s.x1 - s.x0 + 2 * RAND), m(PLATTE_CM), m(s.y1 - s.y0 + 2 * RAND)],
        platte,
        { kante: ton(platte, 0.75) },
      ),
    )
  }
  // Dielen im festen Raster ab der Raumkante, damit sie ueber alle Stuecke fluchten.
  const start = laengs === 0 ? Math.min(...ys) : Math.min(...xs)
  const toene = r.bodenfarbe ? [r.bodenfarbe, ton(r.bodenfarbe, 0.95), ton(r.bodenfarbe, 1.05)] : [1.2, 1.25, 1.3].map((k) => ton(ton(f.holz, 0.62), k))
  for (const s of stuecke) {
    const q0 = laengs === 0 ? s.y0 : s.x0
    const q1 = laengs === 0 ? s.y1 : s.x1
    for (let k = Math.floor((q0 - start) / DIELE_RASTER_CM); start + k * DIELE_RASTER_CM < q1; k++) {
      const a = Math.max(q0, start + k * DIELE_RASTER_CM)
      const e = Math.min(q1, start + k * DIELE_RASTER_CM + DIELE_CM)
      if (e - a < 1) continue
      const [x0, x1, y0, y1] = laengs === 0 ? [s.x0, s.x1, a, e] : [a, e, s.y0, s.y1]
      out.push(
        quader('boden', [m((x0 + x1) / 2), m(DIELE_HOCH_CM / 2), m((y0 + y1) / 2)], [m(x1 - x0), m(DIELE_HOCH_CM), m(y1 - y0)], toene[((k % 3) + 3) % 3]),
      )
    }
  }
  return out
}

/** Liegt p (Mitte eines Wandstuecks) an einer Kante eines anderen Raums
 *  (bis 45 cm, also in derselben dicken Wand)? Dann ist es eine echte Wand. */
function anderemRaumNah(raeume: Raum[], r: Raum, p: Punkt): boolean {
  for (const x of raeume) {
    if (x.id === r.id) continue
    const n = x.punkte.length
    for (let k = 0; k < n; k++) if (streckenAbstand(p, x.punkte[k], x.punkte[(k + 1) % n]).abstand <= 45) return true
  }
  return false
}

function istEcke(r: Pick<Raum, 'punkte'>, p: Punkt): boolean {
  return r.punkte.some((q) => Math.abs(q[0] - p[0]) <= 0.5 && Math.abs(q[1] - p[1]) <= 0.5)
}

function wandFarbe(r: Raum, k: number, f: Farben3D): string {
  return r.wandfarben?.[k] ?? f.wand3d
}

/* ------------------------------------------------------------ Teile */

function waende(daten: GrundrissDaten, raeume: Raum[], f: Farben3D, raumId: string | null): Koerper[] {
  // Der gezeigte Raum zuerst, damit gemeinsame Waende seine Farbe tragen.
  const reihe = raumId ? [...raeume].sort((a, b) => (a.id === raumId ? -1 : b.id === raumId ? 1 : 0)) : raeume
  const gezeigt = raumId ? raeume.find((r) => r.id === raumId) ?? null : null
  const out: Koerper[] = []
  for (const s of wandStuecke(reihe, daten.oeffnungen)) {
    const r = raeume.find((x) => x.id === s.raumId)
    if (!r) continue
    const mitte: Punkt = [(s.a[0] + s.b[0]) / 2, (s.a[1] + s.b[1]) / 2]
    if (gezeigt && !aufRand(gezeigt, mitte)) continue
    // An Raumecken um die halbe Wandstaerke verlaengern, damit die Ecke zu ist.
    const l = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1])
    if (l === 0) continue
    const ux = (s.b[0] - s.a[0]) / l
    const uy = (s.b[1] - s.a[1]) / l
    const h = WAND_CM / 2
    // Fuellungen dicker Waende sind genau so lang und so dick wie die Wand.
    const dicke = s.dicke ?? WAND_CM
    const a: Punkt = !s.dicke && istEcke(r, s.a) ? [s.a[0] - ux * h, s.a[1] - uy * h] : s.a
    const b: Punkt = !s.dicke && istEcke(r, s.b) ? [s.b[0] + ux * h, s.b[1] + uy * h] : s.b
    const innen = raumInnen(r, s.kante)
    const farbe = s.farbe ?? f.wand3d
    const H = r.hoehe_cm
    if (r.art === 'draussen' && !s.dicke && !anderemRaumNah(raeume, r, mitte)) {
      // Offene Seite eines Balkons: Gelaender statt Wand (E69, E82). Ohne
      // Verlaengerung an den Ecken: dort steht ein Pfosten.
      out.push(...gelaender(s.a, s.b, innen, f))
      continue
    }
    const wand = streifen('wand', a, b, 0, H - KOPF_CM, dicke, farbe, { kante: s.dicke ? null : f.wandKante, innen })
    const kopf = streifen('wandkopf', a, b, H - KOPF_CM, H, dicke, f.wandKopf, { innen })
    if (wand) out.push(wand)
    if (kopf) out.push(kopf)
  }
  return out
}

function oeffnungen(daten: GrundrissDaten, raeume: Raum[], f: Farben3D, raumId: string | null): Koerper[] {
  const gezeigt = raumId ? raeume.find((r) => r.id === raumId) ?? null : null
  const out: Koerper[] = []
  const dazu = (q: Quader | null) => {
    if (q) out.push(q)
  }
  for (const o of daten.oeffnungen) {
    const r = raeume.find((x) => x.id === o.raum_id)
    if (!r) continue
    const s = oeffnungPunkte(r, o)
    if (!s) continue
    const [a, b] = s
    if (gezeigt && o.raum_id !== gezeigt.id && !aufRand(gezeigt, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2])) continue
    const H = r.hoehe_cm
    const innen = raumInnen(r, o.kante)
    const wf = wandFarbe(r, o.kante, f)
    const l = Math.hypot(b[0] - a[0], b[1] - a[1])
    const ux = (b[0] - a[0]) / l
    const uy = (b[1] - a[1]) / l
    const bei = (t: number): Punkt => [a[0] + ux * t, a[1] + uy * t]

    if (o.art === 'durchgang') {
      // Offener Durchgang: nur der Sturz darueber, keine Zarge, kein Blatt.
      const th = Math.min(o.hoehe_cm, H)
      dazu(streifen('sturz', a, b, th, H - KOPF_CM, WAND_CM, wf, { kante: f.wandKante, innen }))
      dazu(streifen('wandkopf', a, b, H - KOPF_CM, H, WAND_CM, f.wandKopf, { innen }))
    } else if (o.art === 'tuer') {
      const th = Math.min(o.hoehe_cm, H)
      // Sturz ueber der Tuer, in der Wandfarbe.
      dazu(streifen('sturz', a, b, th, H - KOPF_CM, WAND_CM, wf, { kante: f.wandKante, innen }))
      dazu(streifen('wandkopf', a, b, H - KOPF_CM, H, WAND_CM, f.wandKopf, { innen }))
      // Zarge: zwei Pfosten und oben ein Streifen, orange.
      const z = Math.min(ZARGE_CM, l / 4)
      dazu(streifen('zarge', bei(0), bei(z), 0, th, WAND_CM + 2, f.zarge3d, { kante: f.wandKante, innen }))
      dazu(streifen('zarge', bei(l - z), bei(l), 0, th, WAND_CM + 2, f.zarge3d, { kante: f.wandKante, innen }))
      dazu(streifen('zarge', a, b, Math.max(0, th - z), th, WAND_CM + 2, f.zarge3d, { kante: f.wandKante, innen }))
      // Blatt: an der Angel, beschrieben in der Stellung zu (E82, TuerDreh):
      // entlang der Wand zur anderen Zarge. Der Motor oeffnet es (anfangs
      // TUER_OFFEN_GRAD zur Aufschlagseite); ganz offen steht es quer zur Wand.
      const rechts = o.anschlag === 'rechts'
      const angel: Punkt = rechts ? bei(l - z) : bei(z)
      const gx = rechts ? -ux : ux
      const gy = rechts ? -uy : uy
      const seite = o.aufschlag === 'aussen' ? -1 : 1
      const lang = Math.max(1, l - 2 * z)
      const blatt = streifen('tuerblatt', angel, [angel[0] + gx * lang, angel[1] + gy * lang], 0, Math.max(1, th - z), BLATT_CM, f.tuer3d, {
        kante: f.zarge3d,
        innen,
      })
      if (blatt) {
        const dreh: TuerDreh = {
          id: o.id,
          angel: [m(angel[0]), m(angel[1])],
          laenge: m(lang),
          zu: -Math.atan2(gy, gx),
          auf: -Math.atan2(seite * innen[1], seite * innen[0]),
        }
        blatt.tuer = dreh
        out.push(blatt)
        // Der Schluessel steckt auf der Seite des eigenen Raums; gehoert die
        // Tuer zu einem Raum draussen (Balkon) und liegt dahinter ein Raum
        // der Wohnung, steckt er drinnen (E82).
        const mitte: Punkt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
        const drinnenDahinter = raeume.some(
          (x) => x.id !== r.id && x.art === 'innen' && punktImPolygon(zuUmriss(x.punkte), mitte[0] - innen[0] * 30, mitte[1] - innen[1] * 30),
        )
        out.push(...beschlag(angel, [gx, gy], lang, innen, r.art === 'draussen' && drinnenDahinter ? -1 : 1, dreh, o.id, f))
      }
    } else {
      const br = Math.max(0, Math.min(o.bruestung_cm, H))
      const top = Math.min(H, br + o.hoehe_cm)
      dazu(streifen('bruestung', a, b, 0, br, WAND_CM, wf, { kante: f.wandKante, innen }))
      dazu(streifen('sturz', a, b, top, H - KOPF_CM, WAND_CM, wf, { kante: f.wandKante, innen }))
      dazu(streifen('wandkopf', a, b, H - KOPF_CM, H, WAND_CM, f.wandKopf, { innen }))
      // Rahmen blau: unten (Fensterbank), oben, links, rechts.
      const z = Math.min(RAHMEN_CM, l / 4)
      dazu(streifen('rahmen', a, b, br, br + RAHMEN_CM, WAND_CM + 4, f.rahmen3d, { kante: f.wandKante, innen }))
      dazu(streifen('rahmen', a, b, top - RAHMEN_CM, top, WAND_CM, f.rahmen3d, { kante: f.wandKante, innen }))
      dazu(streifen('rahmen', bei(0), bei(z), br, top, WAND_CM, f.rahmen3d, { kante: f.wandKante, innen }))
      dazu(streifen('rahmen', bei(l - z), bei(l), br, top, WAND_CM, f.rahmen3d, { kante: f.wandKante, innen }))
      dazu(
        streifen('scheibe', bei(z), bei(l - z), br + RAHMEN_CM, top - RAHMEN_CM, 2, f.fenster, {
          deckkraft: SCHEIBE_DECKKRAFT,
          innen,
        }),
      )
    }
  }
  return out
}

/** Drueckergarnitur einer Zimmertuer (E82), silbern, auf beiden Seiten des
 *  Blatts: runde Rosette, Klinke zur Angel hin, darunter die runde
 *  Schluesselrosette; der Schluessel (Bart und Reide) steckt auf der Seite
 *  schluessel (+1 = Richtung innen, -1 = Gegenseite). Alles in der
 *  Stellung zu, mit derselben TuerDreh wie das Blatt (dreht mit), ohne
 *  Innenseite (innen null, so rundet der Motor) und kein Hindernis.
 *  angel und g (Richtung zur Schlosskante) in cm. Masse der Quader: x
 *  entlang des Blatts, y hoch, z quer durch das Blatt. */
function beschlag(angel: Punkt, g: Punkt, lang: number, innen: [number, number], schluessel: 1 | -1, dreh: TuerDreh, id: string, f: Farben3D): Quader[] {
  const zu = dreh.zu
  const achse = Math.max(lang / 2, lang - KLINKE_KANTE_CM)
  const flaeche = BLATT_CM / 2
  const out: Quader[] = []
  const teil = (rolle: Rolle, t: number, tief: number, h: number, masse: Vec3, extra: Partial<Quader>) => {
    const x = angel[0] + g[0] * t + innen[0] * tief
    const y = angel[1] + g[1] * t + innen[1] * tief
    out.push({
      ...quader(rolle, [m(x), m(h), m(y)], [m(masse[0]), m(masse[1]), m(masse[2])], f.griff, { drehY: zu, id: rolle === 'schluessel' ? id : null }),
      glanz: BESCHLAG_GLANZ,
      tuer: { ...dreh },
      ...extra,
    })
  }
  const rundZ = { form: { art: 'zylinder', oben: 1, achse: 'z' } } as const
  const schloss = KLINKE_HOEHE_CM - SCHLOSS_UNTER_CM
  for (const s of [1, -1] as const) {
    // Rosette, Hals und Griff der Klinke; der Griff zeigt zur Angel.
    teil('griff', achse, s * (flaeche + ROSETTE_DICK_CM / 2), KLINKE_HOEHE_CM, [ROSETTE_CM, ROSETTE_CM, ROSETTE_DICK_CM], rundZ)
    teil('griff', achse, s * (flaeche + ROSETTE_DICK_CM + 2.1), KLINKE_HOEHE_CM, [KLINKE_DICK_CM, KLINKE_DICK_CM, 4.2], rundZ)
    teil('griff', achse - KLINKE_LANG_CM / 2 + KLINKE_DICK_CM / 2, s * (flaeche + 5.5), KLINKE_HOEHE_CM, [KLINKE_LANG_CM, KLINKE_DICK_CM, KLINKE_DICK_CM], {
      rund: m(0.8),
    })
    teil('griff', achse, s * (flaeche + ROSETTE_DICK_CM / 2), schloss, [ROSETTE_CM, ROSETTE_CM, ROSETTE_DICK_CM], rundZ)
  }
  // Schluessel, etwa 6 cm: Bart aus dem Schloss, dann die runde Reide.
  const s = schluessel
  teil('schluessel', achse, s * (flaeche + ROSETTE_DICK_CM + 1.5), schloss, [0.4, 0.9, 3], { rund: m(0.2) })
  teil('schluessel', achse, s * (flaeche + ROSETTE_DICK_CM + 3 + 1.3), schloss, [0.35, 2.6, 2.6], { form: { art: 'zylinder', oben: 1, achse: 'x' } })
  return out
}

/** Wie stark ein Material glaenzt (E67). */
export function materialGlanz(m: Objekt['material'] | null | undefined): number {
  switch (m) {
    case 'leder':
      return 0.45
    case 'holz':
      return 0.12
    case 'metall':
      return 0.75
    case 'glas':
      return 0.85
    case 'keramik':
      return 0.6
    case 'samt':
      return 0.04
    default:
      return 0
  }
}

/** Material, wenn beim Moebel keins gewaehlt ist. */
function standardMaterial(art: ReturnType<typeof moebelArt>): Objekt['material'] {
  switch (art) {
    case 'tisch':
    case 'couchtisch':
    case 'esstisch_rund':
    case 'essgruppe':
    case 'stuhl':
    case 'kommode':
    case 'sideboard':
    case 'nachttisch':
    case 'schreibtisch':
      return 'holz'
    case 'wc':
    case 'waschbecken':
    case 'badewanne':
    case 'dusche':
      return 'keramik'
    default:
      return null
  }
}

/** Lokales Rechteck eines Objekts (cm) als Quader in Grundriss-Lage. */
function lokalQuader(
  o: Objekt,
  rolle: Rolle,
  lx0: number,
  ly0: number,
  lx1: number,
  ly1: number,
  unten: number,
  oben: number,
  farbe: string,
  mehr: Partial<Pick<Quader, 'kante' | 'id' | 'hervor'>>,
): Quader | null {
  if (lx1 - lx0 < 0.01 || ly1 - ly0 < 0.01 || oben - unten < 0.01) return null
  const [px, py] = objektGlobal(o, lx0, ly0)
  const [qx, qy] = objektGlobal(o, lx1, ly1)
  const x0 = Math.min(px, qx)
  const x1 = Math.max(px, qx)
  const y0 = Math.min(py, qy)
  const y1 = Math.max(py, qy)
  return quader(rolle, [m((x0 + x1) / 2), m((unten + oben) / 2), m((y0 + y1) / 2)], [m(x1 - x0), m(oben - unten), m(y1 - y0)], farbe, mehr)
}

/** Die Rundform eines Teils in Weltachsen. Laengs ist die Breite des
 *  Moebels (lokal x), quer die Tiefe (lokal y); bei 90 und 270 Grad
 *  tauschen sie. In der Welt ist x der Plan-x, z der Plan-y, y oben. */
function formWelt(o: Objekt, teil: Teil): Form3D | undefined {
  const f = teil.form
  if (!f) return undefined
  if (f.art === 'kugel') return { art: 'kugel' }
  const quer = o.drehung === 90 || o.drehung === 270
  const achse = f.achse === 'laengs' ? (quer ? 'z' : 'x') : f.achse === 'quer' ? (quer ? 'x' : 'z') : 'y'
  return { art: 'zylinder', oben: f.oben ?? 1, achse }
}

function objekte(liste: Objekt[], f: Farben3D, hervor: string | null, raeume: Raum[], markiert: string | null = null): Koerper[] {
  const out: Koerper[] = []
  for (const o of liste) {
    const ist = (!!hervor && o.item_id === hervor) || (!!markiert && o.id === markiert)
    const farbe = ist ? f.hervor : (o.farbe ?? f.objekt)
    const mehr = { kante: ist ? f.kisteRand : f.objektRand, id: o.id, hervor: ist }
    const H = o.hoehe_cm
    // Haengend (0039): alles um die Unterkante ueber dem Boden angehoben.
    const unten = o.boden_cm ?? 0
    // Moebel mit Form (E64): Teile aus moebel3d, als Quader in moebelQuader.
    const decke = (raeume.find((r) => r.id === o.raum_id)?.hoehe_cm ?? 250) - unten
    const art = o.art === 'moebel' ? moebelArt(o.name ?? '') : null
    const form = o.art === 'moebel' ? moebelTeile(o, art, f, decke) : null
    if (form) {
      out.push(...moebelQuader(o, form, f, art, ist))
      continue
    }
    if (o.art === 'moebel' || o.form === 'l') {
      // Moebel als Quader, die L-Form als zwei.
      for (const r of objektRechtecke(o)) {
        out.push(
          quader('moebel', [m((r.x0 + r.x1) / 2), m(unten + H / 2), m((r.y0 + r.y1) / 2)], [m(r.x1 - r.x0), m(H), m(r.y1 - r.y0)], farbe, mehr),
        )
      }
      continue
    }
    // Regal und Schrank: Seiten, Teiler zwischen den Spalten, Deckel, Bretter.
    const B = o.breite_cm
    const T = o.tiefe_cm
    const teile: (Quader | null)[] = [
      lokalQuader(o, 'regal', 0, 0, SEITE_CM, T, 0, H, farbe, mehr),
      lokalQuader(o, 'regal', B - SEITE_CM, 0, B, T, 0, H, farbe, mehr),
      lokalQuader(o, 'regal', 0, 0, B, T, H - BRETT_CM, H, farbe, mehr),
    ]
    for (let s = 1; s < Math.max(1, o.spalten); s++) {
      const [, ende] = spaltenBereich(o, s)
      teile.push(lokalQuader(o, 'regal', ende, 0, ende + 2, T, 0, H - BRETT_CM, farbe, mehr))
    }
    for (const b of o.brett_cm ?? []) {
      // Brett i traegt Ebene i+1: Oberkante bei b, 2 cm stark. Bei 0 steht die Ebene auf dem Boden.
      if (b < BRETT_CM || b > H - BRETT_CM) continue
      teile.push(lokalQuader(o, 'brett', 0, 0, B, T, b - BRETT_CM, b, f.fach, { kante: f.objektRand, id: o.id }))
    }
    for (const q of teile) if (q) out.push(unten ? { ...q, mitte: [q.mitte[0], q.mitte[1] + m(unten), q.mitte[2]] } : q)
    if (o.art === 'schrank') {
      // Tueren vor jeder Spalte (E68): breite Spalten zwei Fluegel, sonst einer.
      const front = ist ? f.hervor : ton(farbe, 1.05)
      for (let s = 1; s <= Math.max(1, o.spalten); s++) {
        const [a, b] = spaltenBereich(o, s)
        const fluegel: Teil[] =
          b - a > 65
            ? [
                { ...teilBox(a - 1, T, (a + b) / 2 - 0.3, T + 2, 0.5, H - 0.5, front), front: { art: 'tuer', angel: 'min', auf: 1 } },
                { ...teilBox((a + b) / 2 + 0.3, T, b + 1, T + 2, 0.5, H - 0.5, front), front: { art: 'tuer', angel: 'max', auf: 1 } },
              ]
            : [{ ...teilBox(a - 1, T, b + 1, T + 2, 0.5, H - 0.5, front), front: { art: 'tuer', angel: s % 2 === 1 ? 'min' : 'max', auf: 1 } }]
        fluegel.forEach((q, i) => {
          const k = drehTuer(o, `${o.id}:t${s}-${i}`, q, unten, front, ton(front, 0.75))
          if (k) out.push(k)
        })
      }
    }
  }
  return out
}

/** Die Teile eines Moebels (moebel3d.ts, lokal in cm) als Quader in der
 *  Welt (E64, E82). Jedes Teil mit einer Kante im dunkleren Ton der eigenen
 *  Farbe, gesucht (ist) alles in der Hervorfarbe. Dazu die E82-Felder:
 *  Platz, Ding, Geraet, Spiegel, Neigung, und der Griff einer Tuer dreht
 *  mit ihr. Reine Rechnung, auch fuer die Pruefung. */
export function moebelQuader(o: Objekt, form: Teil[], f: Farben3D, art: MoebelArt | null, ist: boolean): Quader[] {
  const out: Quader[] = []
  // Haengend (0039): alles um die Unterkante ueber dem Boden angehoben.
  const unten = o.boden_cm ?? 0
  // Glanz des Hauptmaterials (Stoff, Leder ...); Teile mit eigenem Glanz
  // (Keramik, Metall, Kochfeld) behalten ihn.
  const glanz = materialGlanz(o.material ?? standardMaterial(art))
  // Tueren mit gruppe (E82) heissen nach ihr, damit ihr Griff (front
  // 'griff', gleiche gruppe) dieselbe Drehung bekommt; sonst nach dem
  // Platz in der Liste wie bisher.
  const tuerId = (q: Teil) => (q.front?.art === 'tuer' && q.front.gruppe !== undefined ? `${o.id}:t${q.front.gruppe}` : `${o.id}:t${form.indexOf(q)}`)
  const gruppen = new Map<number, TuerDreh>()
  for (const q of form) {
    if (q.front?.art !== 'tuer' || q.front.gruppe === undefined || gruppen.has(q.front.gruppe)) continue
    const d = drehTuer(o, tuerId(q), q, unten, q.farbe, q.farbe)?.tuer
    if (d) gruppen.set(q.front.gruppe, d)
  }
  for (const q of form) {
    // Leuchtende Teile (LED unter den Oberschraenken, Lampenschirm unten)
    // gehoeren zum Licht ihres Raums und gehen mit dem Schalter an (E74).
    const rundform = formWelt(o, q)
    if (q.leuchte && !ist) {
      const l = lokalQuader(o, 'leuchte', q.x0, q.y0, q.x1, q.y1, unten + q.z0, unten + q.z1, q.farbe, { id: o.raum_id })
      if (l) out.push({ ...l, form: rundform, rund: q.rund !== undefined ? m(q.rund) : undefined, objekt: o.id })
      continue
    }
    const qf = ist ? f.hervor : q.farbe
    // Kanten an allem, was man sieht (E74: mehr Kontrast), nur nicht an
    // ganz kleinen Teilen; sauberer und schneller.
    const gross = Math.max(q.x1 - q.x0, q.y1 - q.y0) >= 12 && q.z1 - q.z0 >= 2
    // Runde und weich gepolsterte Teile ohne Kantenlinien (E81): die
    // Linie saesse auf einer Rundung in der Luft; die Rundung zeigt das
    // Licht selbst.
    const weich = !!rundform || (q.rund ?? 0) >= 2
    const kante = ist ? f.kisteRand : gross && !weich && art !== 'mauer' ? ton(qf, 0.68) : undefined
    const k =
      q.front?.art === 'tuer'
        ? drehTuer(o, tuerId(q), q, unten, qf, kante ?? ton(qf, 0.8))
        : lokalQuader(o, teilRolle(q), q.x0, q.y0, q.x1, q.y1, unten + q.z0, unten + q.z1, qf, { kante, id: o.id, hervor: ist })
    if (!k) continue
    if (q.front?.art === 'schub') k.schub = { id: `${o.id}:s${q.front.gruppe}`, weg: schubWeg(o, q) }
    // Griff einer Moebeltuer: in der Stellung zu beschrieben, dreht mit ihr.
    if (q.front?.art === 'griff') {
      const d = gruppen.get(q.front.gruppe)
      if (d) k.tuer = { ...d }
    }
    out.push({
      ...k,
      glanz: q.glanz ?? glanz,
      ...(q.deckkraft !== undefined ? { deckkraft: q.deckkraft } : {}),
      ...(q.rund !== undefined ? { rund: m(q.rund) } : {}),
      ...(rundform ? { form: rundform, kante: ist ? k.kante : null } : {}),
      ...teilFelder(o, q, unten, k.drehY),
    })
  }
  return out
}

function teilBox(x0: number, y0: number, x1: number, y1: number, z0: number, z1: number, farbe: string): Teil {
  return { x0, y0, x1, y1, z0, z1, farbe }
}

/** Richtung eines lokalen Vektors im Grundriss (cm). */
function globalRichtung(o: Objekt, dx: number, dy: number): [number, number] {
  const a = objektGlobal(o, 0, 0)
  const b = objektGlobal(o, dx, dy)
  return [b[0] - a[0], b[1] - a[1]]
}

/** Rolle eines Moebelteils, das keine Tuer ist (E82): Griff, Spiegel,
 *  Ding zum Aufheben, sonst Moebel. */
function teilRolle(q: Teil): Rolle {
  if (q.front?.art === 'griff') return 'griff'
  if (q.spiegel) return 'spiegel'
  if (q.ding) return 'ding'
  return 'moebel'
}

/** Einheitsvektor in (x, z); (0, 0) bleibt. */
function einheit(v: [number, number]): [number, number] {
  const l = Math.hypot(v[0], v[1])
  return l > 0 ? [v[0] / l, v[1] / l] : [0, 0]
}

/** Blickrichtung als drehY wie die Kamera (0 = Blick nach -z) fuer eine
 *  Richtung (x, z) in der Welt. */
export function blickAus(dx: number, dz: number): number {
  const w = Math.atan2(-dx, -dz)
  // -0 und -Pi vermeiden, damit Vergleiche und Pruefung eindeutig sind.
  return Math.abs(w) < 1e-12 ? 0 : w <= -Math.PI + 1e-12 ? Math.PI : w
}

/** Die E82-Felder eines Moebelteils als Quader-Felder: Platz (Mitte der
 *  Oberseite, Blick lokal vorn/hinten/links/rechts in der Welt), Ding,
 *  Geraet, Spiegel (Vorderseite = lokal +y) und Neigung (siehe kippWelt).
 *  drehY ist die des fertigen Quaders. */
function teilFelder(o: Objekt, q: Teil, unten: number, drehY: number): Partial<Quader> {
  const out: Partial<Quader> = {}
  if (q.platz) {
    const [cx, cy] = objektGlobal(o, (q.x0 + q.x1) / 2, (q.y0 + q.y1) / 2)
    const lokal: Record<'vorn' | 'hinten' | 'links' | 'rechts', [number, number]> = { vorn: [0, 1], hinten: [0, -1], links: [-1, 0], rechts: [1, 0] }
    const [dx, dz] = globalRichtung(o, ...lokal[q.platz.blick])
    out.platz = { art: q.platz.art, punkt: [m(cx), m(unten + q.z1), m(cy)], blick: blickAus(dx, dz) }
  }
  if (q.ding) out.ding = `${o.id}:${q.ding}`
  if (q.geraet) out.geraet = { id: `${o.id}:g${q.geraet.nr ?? 0}`, art: q.geraet.art, teil: q.geraet.teil }
  if (q.spiegel) out.normale = einheit(globalRichtung(o, 0, 1))
  if (q.kipp) {
    const k = kippWelt(o, q.kipp, drehY)
    if (k) out.kipp = k
  }
  return out
}

/** Neigung eines Moebelteils (Teil.kipp, Grad) als Quader.kipp (Radiant).
 *  Teil.kipp gilt mit der Rechte-Hand-Regel im lokalen x, y, z (z oben):
 *  positives laengs (um lokal x) bringt die Oberkante nach hinten (-y, zur
 *  Wand; Lehne nach hinten), positives quer (um lokal y) nach rechts (+x).
 *  In der Welt kippt das um eine waagrechte Achse u, die je nach
 *  o.drehung die Welt-x- oder -z-Achse ist (mit Vorzeichen); Quader.kipp
 *  rechnet in den Achsen des Quaders vor drehY, darum u noch um -drehY. */
function kippWelt(o: Objekt, kipp: NonNullable<Teil['kipp']>, drehY: number): { x: number; z: number } | undefined {
  let x = 0
  let z = 0
  const c = Math.cos(drehY)
  const s = Math.sin(drehY)
  const um = (d: [number, number], grad: number) => {
    // Die Oberkante wandert nach d (x, z): Drehachse u = (d.z, -d.x).
    const w = (grad * Math.PI) / 180
    const ux = d[1]
    const uz = -d[0]
    x += w * (ux * c - uz * s)
    z += w * (ux * s + uz * c)
  }
  if (kipp.laengs) um(einheit(globalRichtung(o, 0, -1)), kipp.laengs)
  if (kipp.quer) um(einheit(globalRichtung(o, 1, 0)), kipp.quer)
  const rund = (v: number) => (Math.abs(v) < 1e-12 ? 0 : v)
  return x || z ? { x: rund(x), z: rund(z) } : undefined
}

/** Tuer eines Moebels als Quader, der sich um seine Angel dreht (E68). */
function drehTuer(o: Objekt, id: string, q: Teil, unten: number, farbe: string, kante: string): Quader | null {
  if (q.front?.art !== 'tuer') return null
  const breitX = q.x1 - q.x0 >= q.y1 - q.y0
  const auf = q.front.auf
  const vorne = q.front.angel === 'min' ? 1 : -1
  // Angel an der Kante der langen Seite, mitten in der Dicke.
  const angelL: Punkt = breitX
    ? [q.front.angel === 'min' ? q.x0 : q.x1, (q.y0 + q.y1) / 2]
    : [(q.x0 + q.x1) / 2, q.front.angel === 'min' ? q.y0 : q.y1]
  const laenge = breitX ? q.x1 - q.x0 : q.y1 - q.y0
  const dicke = breitX ? q.y1 - q.y0 : q.x1 - q.x0
  const zuL: Punkt = breitX ? [vorne, 0] : [0, vorne]
  const aufL: Punkt = breitX ? [0, auf] : [auf, 0]
  const a = objektGlobal(o, angelL[0], angelL[1])
  const zu = globalRichtung(o, zuL[0], zuL[1])
  const offen = globalRichtung(o, aufL[0], aufL[1])
  const b: Punkt = [a[0] + zu[0] * laenge, a[1] + zu[1] * laenge]
  const k = streifen('front', a, b, unten + q.z0, unten + q.z1, dicke, farbe, { kante })
  if (!k) return null
  k.id = o.id
  k.tuer = { id, angel: [m(a[0]), m(a[1])], laenge: m(laenge), zu: -Math.atan2(zu[1], zu[0]), auf: -Math.atan2(offen[1], offen[0]) }
  return k
}

/** Weg einer Schublade in Metern (x, z). */
function schubWeg(o: Objekt, q: Teil): [number, number] {
  if (q.front?.art !== 'schub') return [0, 0]
  const breitX = q.x1 - q.x0 >= q.y1 - q.y0
  const w = q.front.auf * q.front.weit
  const [dx, dy] = globalRichtung(o, breitX ? 0 : w, breitX ? w : 0)
  return [m(dx), m(dy)]
}

function kisten(daten: GrundrissDaten, f: Farben3D, raumId: string | null, hervor: string | null, offen: string | null): Koerper[] {
  const liste = raumId ? daten.kisten.filter((k) => k.platz_raum_id === raumId) : daten.kisten
  const gibtHervor = !!hervor && liste.some((k) => k.id === hervor)
  const out: Koerper[] = []
  for (const k of liste) {
    const [ex, ey] = kisteAusdehnung(k)
    const ist = k.id === hervor
    const deckkraft = gibtHervor && !ist ? GEDAEMPFT : 1
    if (offen && k.id === offen) {
      out.push(...offeneKiste(k, f, ist, deckkraft))
      continue
    }
    // Einen halben cm kleiner, damit Kanten gestapelter Kisten sichtbar bleiben.
    out.push(
      quader(
        'kiste',
        [m(k.platz_x), m(k.unten_cm + k.hoehe_cm / 2), m(k.platz_y)],
        [m(Math.max(1, ex - 0.5)), m(Math.max(1, k.hoehe_cm - 0.5)), m(Math.max(1, ey - 0.5))],
        ist ? f.hervor : (k.mark_color ?? k.room_color ?? f.objekt),
        { kante: f.kisteRand, id: k.id, hervor: ist, deckkraft },
      ),
    )
  }
  return out
}

/** Klappen einer offenen Kiste: so weit aufgeklappt (Grad); ueber 90
 *  lehnen sie nach aussen. */
const KLAPPE_GRAD = 115
/** Pappe 5 mm stark. */
const PAPPE_CM = 0.5
/** Fuellstand, wenn keiner angegeben ist (Prozent). */
const FUELLSTAND_STANDARD = 70

/** Kleine Zahl aus einer Id, damit dieselbe Kiste immer gleich aussieht. */
function streuung(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return h
}

/** Eine offene Kiste aus Pappe (E82): Boden, vier Waende, vier Klappen
 *  nach aussen geklappt (an der Oberkante der Wand angeschlagen), innen
 *  eine Fuellung in Hoehe des Fuellstands (sonst 70 Prozent) mit vier bis
 *  sechs kleinen Bloecken als Andeutung des Inhalts, und Klebeband an den
 *  Stirnseiten. Alle Teile tragen die Id der Kiste und die Rolle Kiste,
 *  damit Antippen sie trifft. Gesucht: roter Rand statt roter Pappe. */
function offeneKiste(k: PlanKiste, f: Farben3D, ist: boolean, deckkraft: number): Quader[] {
  const [ex0, ey0] = kisteAusdehnung(k)
  const ex = Math.max(2, ex0 - 0.5)
  const ey = Math.max(2, ey0 - 0.5)
  const unten = k.unten_cm + 0.25
  const oben = k.unten_cm + Math.max(2, k.hoehe_cm - 0.25)
  const h = oben - unten
  const cx = k.platz_x
  const cy = k.platz_y
  const D = PAPPE_CM
  const pappe = f.pappe
  const rand = ist ? f.hervor : ton(pappe, 0.72)
  const out: Quader[] = []
  const teil = (mitte: Vec3, masse: Vec3, farbe: string, extra: Partial<Quader> = {}, kante: string | null = rand) => {
    out.push({
      ...quader('kiste', [m(mitte[0]), m(mitte[1]), m(mitte[2])], [m(masse[0]), m(masse[1]), m(masse[2])], farbe, { kante, id: k.id, hervor: ist, deckkraft }),
      ...extra,
    })
  }
  // Boden und Waende.
  teil([cx, unten + D / 2, cy], [ex, D, ey], ton(pappe, 0.92))
  teil([cx, unten + h / 2, cy - ey / 2 + D / 2], [ex, h, D], pappe)
  teil([cx, unten + h / 2, cy + ey / 2 - D / 2], [ex, h, D], pappe)
  teil([cx - ex / 2 + D / 2, unten + h / 2, cy], [D, h, ey - 2 * D], ton(pappe, 0.96))
  teil([cx + ex / 2 - D / 2, unten + h / 2, cy], [D, h, ey - 2 * D], ton(pappe, 0.96))
  // Klappen: an der Oberkante angeschlagen, um KLAPPE_GRAD aufgeklappt. Die
  // Mitte liegt eine halbe Klappenbreite vom Scharnier entfernt in der
  // Richtung, in die die Klappe jetzt zeigt; so bleibt die innere Kante
  // auf der Wand.
  const W = Math.max(1, Math.min(ex, ey) / 2 - 0.5)
  const w = (KLAPPE_GRAD * Math.PI) / 180
  const hoch = Math.sin(w) * (W / 2)
  const weg = -Math.cos(w) * (W / 2) // nach aussen (cos 115 < 0)
  const klappe = ton(pappe, 1.06)
  const zW = ey / 2 - D / 2
  const xW = ex / 2 - D / 2
  teil([cx, oben + hoch, cy + zW + weg], [ex - 1, D, W], klappe, { kipp: { x: w, z: 0 } })
  teil([cx, oben + hoch, cy - zW - weg], [ex - 1, D, W], klappe, { kipp: { x: -w, z: 0 } })
  teil([cx + xW + weg, oben + hoch, cy], [W, D, ey - 1], klappe, { kipp: { x: 0, z: -w } })
  teil([cx - xW - weg, oben + hoch, cy], [W, D, ey - 1], klappe, { kipp: { x: 0, z: w } })
  // Fuellung bis zum Fuellstand, dunkler, darauf der angedeutete Inhalt.
  const pct = Math.max(0, Math.min(100, k.fuellstand ?? FUELLSTAND_STANDARD))
  const ix = ex - 2 * D - 0.4
  const iy = ey - 2 * D - 0.4
  const fuellOben = unten + D + 1 + Math.max(0, h - D - 1) * (pct / 100)
  teil([cx, fuellOben - 0.5, cy], [ix, 1, iy], ton(pappe, 0.55), {}, null)
  if (pct >= 5 && ix > 4 && iy > 4) {
    const z = streuung(k.id)
    const anzahl = 4 + (z % 3)
    const farben = [ton(f.leinen, 0.85), ton(f.spielBlau, 1.35), ton(f.holz, 0.95), ton(f.stoff, 1.2), ton(f.spielGruen, 1.3), ton(f.spielRot, 1.4)]
    const zw = ix / 3
    const zh = iy / 2
    for (let i = 0; i < anzahl; i++) {
      const r = (z >>> (i * 3)) & 7 // 0..7, fuer kleine Unterschiede
      const sx = zw * (0.5 + (r % 3) * 0.1)
      const sz = zh * (0.5 + ((r >> 1) % 3) * 0.1)
      const sh = Math.min(3 + r, Math.max(1, oben + 3 - fuellOben))
      const mx = cx - ix / 2 + zw * ((i % 3) + 0.5) + ((r % 2 ? 1 : -1) * zw * 0.08)
      const mz = cy - iy / 2 + zh * (Math.floor(i / 3) + 0.5)
      teil([mx, fuellOben + sh / 2, mz], [sx, sh, sz], farben[(i + z) % farben.length], { rund: m(Math.min(1, sh / 3)) }, null)
    }
  }
  // Klebeband an den Stirnseiten (quer zur langen Seite), von oben herab.
  const band = ton(pappe, 1.18)
  if (ex >= ey) {
    for (const s of [1, -1]) teil([cx + s * (ex / 2 + 0.05), oben - 4, cy], [0.1, 8, Math.min(5, ey * 0.4)], band, { glanz: 0.6 }, null)
  } else {
    for (const s of [1, -1]) teil([cx, oben - 4, cy + s * (ey / 2 + 0.05)], [Math.min(5, ex * 0.4), 8, 0.1], band, { glanz: 0.6 }, null)
  }
  return out
}

/* ------------------------------------------------------------ Szene */

/** Der Grundriss (oder ein Raum daraus) als Koerper: Boeden, Waende mit
 *  Sturz und Bruestung, Tueren, Fenster, Moebel, Regale, Kisten. */
export function baueSzene(daten: GrundrissDaten, farben: Farben3D, optionen: SzeneOptionen = {}): Koerper[] {
  const raumId = optionen.raumId && daten.raeume.some((r) => r.id === optionen.raumId) ? optionen.raumId : null
  const hervor = optionen.hervor ?? null
  const raeume = daten.raeume.filter((r) => r.punkte.length >= 3)
  const sichtbar = raumId ? raeume.filter((r) => r.id === raumId) : raeume
  const out: Koerper[] = []
  for (const r of sichtbar) {
    out.push({
      art: 'flaeche',
      rolle: 'boden',
      punkte: r.punkte.map(([x, y]) => [m(x), m(y)] as [number, number]),
      y: 0,
      farbe: r.bodenfarbe ?? (r.art === 'draussen' ? farben.bodenDraussen3d : farben.boden3d),
      deckkraft: 1,
      id: r.id,
    })
  }
  // Balkon (E82): Betonplatte mit sichtbarer Kante und Holzdielen.
  for (const r of sichtbar) if (r.art === 'draussen') out.push(...balkonBoden(r, farben))
  out.push(...waende(daten, raeume, farben, raumId))
  out.push(...oeffnungen(daten, raeume, farben, raumId))
  // Teppiche (E74) und Deko (E82) lassen sich ausblenden.
  const zeigen = (o: Objekt) =>
    (optionen.teppiche !== false || moebelArt(o.name ?? '') !== 'teppich') && (optionen.deko !== false || !istDeko(o))
  out.push(
    ...objekte(
      (raumId ? daten.objekte.filter((o) => o.raum_id === raumId) : daten.objekte).filter(zeigen),
      farben,
      hervor,
      raeume,
      optionen.markiert ?? null,
    ),
  )
  out.push(...kisten(daten, farben, raumId, hervor, optionen.offeneKiste ?? null))
  out.push(...symbole(daten, sichtbar, farben))
  // Deckenleuchten, wo der Raum keine eigene hat (E71); draussen eine
  // Wandleuchte an der Hauswand (E82).
  for (const l of lichter(daten, raumId)) {
    if (!l.leuchte) continue
    if (l.wand) out.push(...wandLeuchte(l, farben))
    else out.push(quader('leuchte', [l.pos[0], l.pos[1] + 0.03, l.pos[2]], [0.34, 0.03, 0.34], farben.waesche, { kante: farben.metall, id: l.raumId }))
  }
  return out
}

/** Wandleuchte draussen (E82): dunkles Gehaeuse an der Wand, davor ein
 *  leuchtender Glaskoerper (geht mit dem Schalter des Raums an), oben ein
 *  Dach. l.wand zeigt von der Wand weg; die Wand liegt WANDLEUCHTE_VOR
 *  hinter l.pos. */
function wandLeuchte(l: Licht3D, f: Farben3D): Quader[] {
  const n = l.wand
  if (!n) return []
  const drehY = -Math.atan2(-n[0], n[1])
  const wx = l.pos[0] - n[0] * m(WANDLEUCHTE_VOR_CM)
  const wz = l.pos[2] - n[1] * m(WANDLEUCHTE_VOR_CM)
  const y = m(WANDLEUCHTE_CM)
  const vor = (cm: number): [number, number] => [wx + n[0] * m(cm), wz + n[1] * m(cm)]
  // Rueckplatte 2 cm an der Wand, davor Glas (2 bis 11 cm) und Dach.
  const [px, pz] = vor(1)
  const [gx, gz] = vor(6.5)
  return [
    { ...quader('moebel', [px, y, pz], [0.13, 0.24, 0.02], f.schwarz, { drehY }), glanz: 0.5, rund: 0.004 },
    { ...quader('leuchte', [gx, y - 0.01, gz], [0.1, 0.15, 0.09], f.waesche, { drehY, id: l.raumId }), rund: 0.006 },
    { ...quader('moebel', [gx, y + 0.075, gz], [0.13, 0.02, 0.11], f.schwarz, { drehY }), glanz: 0.5, rund: 0.004 },
  ]
}

/** Wandleuchte draussen: Mitte auf 2,0 m, das Licht 15 cm vor der Wand. */
const WANDLEUCHTE_CM = 200
const WANDLEUCHTE_VOR_CM = 15

/** Eine Lichtquelle in Metern (E71). leuchte: eine Leuchte zeichnen
 *  (automatische Lichter), an der Decke oder, mit wand, an der Wand. */
export interface Licht3D {
  pos: Vec3
  staerke: number
  farbe: string
  art: 'decke' | 'kueche' | 'lampe'
  leuchte: boolean
  /** Der Raum, dessen Schalter dieses Licht schaltet (E74). */
  raumId: string
  /** Wandleuchte (E82, draussen an der Hauswand): Richtung von der Wand
   *  weg (x, z), Laenge 1. Ohne: Deckenleuchte. */
  wand?: [number, number]
  /** E89: das Moebel, in dem das Licht steckt (Kuechenzeile, Haenge- und
   *  Stehlampe); es wandert mit, wenn man das Moebel traegt. */
  objektId?: string
}

/** Wo es Licht gibt: je Raum Deckenlicht (ab 12 m2 zwei, entlang der
 *  langen Seite), eigene Licht-Symbole statt des automatischen, unter den
 *  Oberschraenken der Kueche, in Haenge- und Stehlampen. */
export function lichter(daten: GrundrissDaten, raumId: string | null = null): Licht3D[] {
  const raeume = daten.raeume.filter((r) => r.punkte.length >= 3 && (!raumId || r.id === raumId))
  const out: Licht3D[] = []
  const eigene = (daten.grundriss.symbole ?? []).filter((s) => s.art === 'licht')
  for (const r of raeume) {
    const H = r.hoehe_cm
    const hier = eigene.filter((s) => punktImPolygon(zuUmriss(r.punkte), s.x, s.y))
    if (hier.length) {
      for (const s of hier) out.push({ pos: [m(s.x), m(H - 6), m(s.y)], staerke: 1, farbe: '#ffe2b8', art: 'decke', leuchte: false, raumId: r.id })
      continue
    }
    const p = innenPunkt(r.punkte)
    const flaeche = flaecheQm(r.punkte)
    const xs = r.punkte.map((q) => q[0])
    const ys = r.punkte.map((q) => q[1])
    const breit = Math.max(...xs) - Math.min(...xs)
    const tief = Math.max(...ys) - Math.min(...ys)
    const draussen = r.art === 'draussen'
    const wand = draussen ? aussenWand(r, daten) : null
    if (wand) {
      // Draussen keine schwebende Deckenplatte, sondern eine Wandleuchte
      // an der Hauswand auf 2,0 m (E82); das Licht 15 cm davor.
      out.push({
        pos: [m(wand.punkt[0] + wand.innen[0] * WANDLEUCHTE_VOR_CM), m(WANDLEUCHTE_CM - 5), m(wand.punkt[1] + wand.innen[1] * WANDLEUCHTE_VOR_CM)],
        staerke: 0.5,
        farbe: '#ffd29a',
        art: 'lampe',
        leuchte: true,
        raumId: r.id,
        wand: wand.innen,
      })
      continue
    }
    if (flaeche >= 12 && !draussen) {
      // Zwei Leuchten entlang der langen Seite, beide sicher im Raum.
      const d = (breit >= tief ? breit : tief) / 4
      for (const s of [-1, 1]) {
        const q: [number, number] = breit >= tief ? [p[0] + s * d, p[1]] : [p[0], p[1] + s * d]
        const im = punktImPolygon(zuUmriss(r.punkte), q[0], q[1])
        const z = im ? q : p
        out.push({ pos: [m(z[0]), m(H - 6), m(z[1])], staerke: 0.8, farbe: '#ffe2b8', art: 'decke', leuchte: true, raumId: r.id })
      }
    } else {
      out.push({ pos: [m(p[0]), m(H - 6), m(p[1])], staerke: draussen ? 0.5 : Math.min(1, 0.55 + flaeche / 20), farbe: draussen ? '#ffd29a' : '#ffe2b8', art: 'decke', leuchte: true, raumId: r.id })
    }
  }
  const drin = new Set(raeume.map((r) => r.id))
  for (const o of daten.objekte) {
    if (!drin.has(o.raum_id)) continue
    const a = moebelArt(o.name ?? '')
    const boden = o.boden_cm ?? 0
    if (a === 'kuechenzeile') {
      // LED unter den Oberschraenken: je Arm ein Licht auf 145 cm.
      for (const q of objektRechtecke(o)) {
        out.push({ pos: [m((q.x0 + q.x1) / 2), m(boden + o.hoehe_cm + 50), m((q.y0 + q.y1) / 2)], staerke: 0.45, farbe: '#fff1d6', art: 'kueche', leuchte: false, raumId: o.raum_id, objektId: o.id })
      }
    } else if (a === 'haengelampe' || a === 'stehlampe') {
      const [cx, cy] = objektGlobal(o, o.breite_cm / 2, o.tiefe_cm / 2)
      const z = a === 'haengelampe' ? boden - 4 : boden + o.hoehe_cm - 12
      out.push({ pos: [m(cx), m(z), m(cy)], staerke: a === 'haengelampe' ? 0.6 : 0.45, farbe: '#ffd9a8', art: 'lampe', leuchte: false, raumId: o.raum_id, objektId: o.id })
    }
  }
  return out
}

/** Die Hauswand eines Raums draussen (E82): die laengste Kante, an der ein
 *  anderer Raum liegt (also eine echte Wand, kein Gelaender), und darauf
 *  eine Stelle ohne Tuer oder Fenster, moeglichst in der Mitte. punkt auf
 *  der Innenseite der Wand (cm), innen zeigt auf den Balkon. null ohne
 *  Hauswand (freie Terrasse). */
function aussenWand(r: Raum, daten: GrundrissDaten): { punkt: Punkt; innen: [number, number] } | null {
  const raeume = daten.raeume.filter((x) => x.punkte.length >= 3)
  const loecher = oeffnungsLoecher(daten)
  const n = r.punkte.length
  const kanten: { k: number; l: number }[] = []
  for (let k = 0; k < n; k++) {
    const a = r.punkte[k]
    const b = r.punkte[(k + 1) % n]
    const l = Math.hypot(b[0] - a[0], b[1] - a[1])
    if (l >= 40 && anderemRaumNah(raeume, r, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2])) kanten.push({ k, l })
  }
  kanten.sort((p, q) => q.l - p.l)
  for (const { k, l } of kanten) {
    const a = r.punkte[k]
    const b = r.punkte[(k + 1) % n]
    const ux = (b[0] - a[0]) / l
    const uy = (b[1] - a[1]) / l
    const innen = raumInnen(r, k)
    for (const anteil of [0.5, 0.35, 0.65, 0.2, 0.8]) {
      const t = l * anteil
      if (t < 20 || t > l - 20) continue
      // Die Leuchte ist 13 cm breit: beide Raender frei.
      const frei = [-10, 0, 10].every((d) => !inOeffnung([a[0] + ux * (t + d), a[1] + uy * (t + d)], ux, uy, loecher))
      if (frei) return { punkt: [a[0] + ux * t + innen[0] * (WAND_CM / 2), a[1] + uy * t + innen[1] * (WAND_CM / 2)], innen }
    }
  }
  return null
}

/** Lichter an der Decke; Steckdosen (30 cm hoch) und Schalter (105 cm)
 *  als flache Platten an der naechsten Wand (E74), nie frei im Raum.
 *  Schalter sind unauffaellig weiss und schalten ihren Raum (oder den, den
 *  sie laut Plan schalten); Steckdosen haben einen roten Rand. Raeume ohne
 *  Schalter bekommen einen automatischen neben der Tuer (E82, autoSchalter). */
function symbole(daten: GrundrissDaten, raeume: Raum[], f: Farben3D): Koerper[] {
  const out: Koerper[] = []
  const drin = new Set(raeume.map((r) => r.id))
  for (const s of [...(daten.grundriss.symbole ?? []), ...autoSchalter(daten)]) {
    if (s.art === 'licht') {
      const r = raeume.find((x) => punktImPolygon(zuUmriss(x.punkte), s.x, s.y))
      if (r) out.push(quader('leuchte', [m(s.x), m(r.hoehe_cm - 2), m(s.y)], [m(30), m(4), m(30)], f.waesche, { kante: f.metall, id: r.id }))
      continue
    }
    const w = symbolAnWand([s.x, s.y], daten)
    if (!w || !drin.has(w.raumId)) continue
    const h = s.art === 'schalter' ? 105 : 30
    // Laengs der Wand: senkrecht zur Innenrichtung.
    const drehY = -Math.atan2(-w.innen[0], w.innen[1])
    const platte = (tief: number, breit: number, farbe: string, kante: string | null, rolle: Rolle, id: string | null) =>
      quader(rolle, [m(w.punkt[0] + w.innen[0] * tief / 2), m(h), m(w.punkt[1] + w.innen[1] * tief / 2)], [m(breit), m(breit), m(tief)], farbe, { drehY, kante, id })
    if (s.art === 'schalter') {
      const raum = s.schaltet && daten.raeume.some((r) => r.id === s.schaltet) ? s.schaltet : w.raumId
      out.push(platte(1.2, 8.5, f.schalter3d, f.wandKante, 'schalter', raum))
      out.push(platte(1.8, 5.5, f.schalter3d, null, 'schalter', raum))
    } else {
      out.push(platte(1.2, 8, f.schalter3d, f.steckdose, 'moebel', null))
    }
  }
  return out
}

export interface SzenenRahmen {
  x0: number
  x1: number
  z0: number
  z1: number
  hoehe: number
}

/** Rahmen um alle Koerper (Meter). null bei leerer Szene. */
export function szeneRahmen(koerper: Koerper[]): SzenenRahmen | null {
  let x0 = Infinity
  let x1 = -Infinity
  let z0 = Infinity
  let z1 = -Infinity
  let hoehe = 0
  for (const k of koerper) {
    if (k.art === 'flaeche') {
      for (const [x, z] of k.punkte) {
        x0 = Math.min(x0, x)
        x1 = Math.max(x1, x)
        z0 = Math.min(z0, z)
        z1 = Math.max(z1, z)
      }
    } else {
      const c = Math.abs(Math.cos(k.drehY))
      const s = Math.abs(Math.sin(k.drehY))
      const ex = (c * k.masse[0] + s * k.masse[2]) / 2
      const ez = (s * k.masse[0] + c * k.masse[2]) / 2
      x0 = Math.min(x0, k.mitte[0] - ex)
      x1 = Math.max(x1, k.mitte[0] + ex)
      z0 = Math.min(z0, k.mitte[2] - ez)
      z1 = Math.max(z1, k.mitte[2] + ez)
      hoehe = Math.max(hoehe, k.mitte[1] + k.masse[1] / 2)
    }
  }
  if (!Number.isFinite(x0)) return null
  return { x0, x1, z0, z1, hoehe }
}

/** Mitte der hervorgehobenen Kiste (oder des Moebels), sonst null. */
export function hervorMitte(koerper: Koerper[]): Vec3 | null {
  for (const k of koerper) if (k.art === 'quader' && k.hervor && (k.rolle === 'kiste' || k.rolle === 'moebel')) return k.mitte
  for (const k of koerper) if (k.art === 'quader' && k.hervor) return k.mitte
  return null
}
