/* Die Siedlung in 3D (E83). Ein eigener Bereich neben den Umzuegen: die
 * Haeuser rund um die eigene Wohnung, die Wohnung selbst darin, begehbar
 * mit Laubengang, Stiegenhaus und Aufzug. Alles kommt aus den Daten der
 * Siedlung (Datenbank); welche Haeuser, wo und welche Wohnung steht nie im
 * Code.
 *
 * Koordinaten: die Siedlung rechnet lokal in Metern um ihren Mittelpunkt,
 * x nach Osten, z nach Sueden, y nach oben, Gelaende bei y = 0. Die Wohnung
 * liegt in der Welt am Ursprung, ihr Boden bei y = 0 (wie szene.ts). Darum
 * steckt alles in einer Gruppe, die die Lage der Wohnung umkehrt: gedreht
 * um drehung, verschoben und um geschoss * geschossHoehe abgesenkt. Ohne
 * Wohnung steht die Siedlung mittig, das Gelaende bei 0. Ebenen,
 * Hindernisse und die Kabine des Aufzugs kommen in Weltkoordinaten heraus.
 *
 * Was entsteht:
 * - Himmel und Dunst wie in aussen3d.ts, eine Wiese (mit Loch fuer die
 *   Rampe der Tiefgarage), die Strasse mit Gehsteigen und Bordsteinen an
 *   der Seite, an der die meisten Haeuser in einer Flucht stehen, Hecken
 *   davor, Wege aus aussen.wege, ein Parkplatz mit Autos, die Rampe mit
 *   Seitenwaenden und Gelaender, der Spielplatz (Schaukel, Sandkiste,
 *   Spielturm, Baenke), Baeume mit runden Kronen in Herbstfarben, Buesche,
 *   Laternen und ein paar schlichte Nachbarhaeuser.
 * - Jedes Haus aus seinem Umriss: Waende je Geschoss, Sockel, Attika,
 *   Flachdach (begruent, mit Photovoltaik und Lichtkuppeln), Fenster etwa
 *   alle 2,6 m mit Abstand zu den Ecken, ein Eingang zur Strasse. Stil
 *   weiss_loggia: weisser Putz, Eckloggien mit gelben Innenwaenden,
 *   Balkone mit Metallgelaender; holz: rotbraune senkrechte Schalung,
 *   weniger Fenster, eine Loggia; putz und grau: heller Putz, putz mit
 *   eingeschnittenen Loggien.
 * - Das eigene Haus (das der Wohnung) dazu mit offenem Laubengang an der
 *   Nordseite in jedem Obergeschoss (Platte, Gelaender, Saeulen), einem
 *   Kern aus Stiegenhaus und Aufzug an einem Ende des Gangs (Schacht mit
 *   Tueren, Kabine mit Knoepfen) und Wohnungstueren am Gang. Wo die eigene
 *   Wohnung liegt (wohnungRahmen und 15 cm Rand, auf ihrem Geschoss von
 *   -0,02 bis geschossHoehe - 0,05), steht nichts davon: dort zeigt die
 *   Szene der Wohnung ihre echten Waende.
 *
 * Billig fuers Handy: keine Texturen, Farben je Ecke, alles Starre in
 * wenigen Meshes (7 Zeichenaufrufe und zwei je Geschoss fuer die Knoepfe),
 * unter 150 000 Dreiecke. Gleiche Daten geben dieselbe Welt (Zufall mit
 * Saat aus den Umrissen, kein Math.random). Pruefung ohne Browser:
 * node scripts/siedlung-pruefen.mjs
 *
 * Einbau (Motor): gruppe in die Szene, scene.fog = nebel, Hintergrund
 * himmel, Ebenen und Knoepfe wie in vertrag3d.ts. Ebenen: zuerst die
 * Geschosse des eigenen Hauses (Index = Geschoss, 0 = EG, die Ebene der
 * Wohnung heisst 'wohnung' und liegt bei 0), zuletzt 'garten' (Gelaende,
 * gleiche Hoehe wie das EG). Jedes Bild schritt(dt, kameraY) rufen; true
 * heisst, der Aufzug bewegt sich noch. Zusaetzlich traegt das Ergebnis:
 * - fahrt(): waehrend einer Fahrt (Tueren zu, fahren, Tueren auf am Ziel)
 *   { ziel, y } mit dem Index der Ziel-Ebene und der Bodenhoehe der Kabine
 *   in Weltmetern (wie Ebene3D.y), sonst null. Steht die Kamera in der
 *   Kabine, setzt der Motor ihre Hoehe auf y plus Augenhoehe.
 * - kabine: Grundriss der Kabine innen in Weltmetern (x0, z0, x1, z1) oder
 *   null ohne Aufzug, damit der Motor weiss, ob die Kamera mitfaehrt.
 * aufzugZiel(w) meldet genau einmal je Ankunft den Index der Ebene, an der
 * die Tueren aufgehen; steht die Kamera in der Kabine, wechselt der Motor
 * dann auf diese Ebene. Die Hindernisse sind fest: die Luecke in der
 * Schachtwand an der Tuer ist immer offen, auch wenn die Kabine woanders
 * ist. Beim Abbau dispose(). */
import {
  BackSide,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  Fog,
  Group,
  IcosahedronGeometry,
  Matrix3,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  ShapeUtils,
  SphereGeometry,
  Vector2,
  type Material,
  type Object3D,
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { Siedlung, SiedlungGebaeude, SiedlungStil } from '../../lib/types'
import type { Farben3D } from './szene.ts'
import type { Ebene3D, Hindernis3D, Interaktiv3D, Welt3D } from './vertrag3d.ts'

export interface SiedlungOptionen {
  siedlung: Siedlung
  farben: Farben3D
  /** Umriss der eigenen Wohnung in Weltmetern (x0, z0, x1, z1) um die Fassade dort auszusparen; null ohne Wohnung. */
  wohnungRahmen: [number, number, number, number] | null
}

/* ------------------------------------------------ Zahlen */

/** Dunst: ab hier beginnt er, hier ist alles Himmelfarbe (Meter). */
const NEBEL_NAH = 80
const NEBEL_FERN = 270
/** Himmelskugel (folgt der Kamera, der Motor hat far 400) und Wiese. */
const HIMMEL_R = 280
const WIESE_R = 300
/** Oberkante jeder Gehflaeche (Gang, Wege, Stiegenhaus) unter ihrer Ebene. */
const GEH = -0.02
/** Wiese, darunter (die Gehflaechen liegen 2 cm darueber). */
const WIESE_Y = -0.04
const WAND = 0.3
/** So viel groesser als wohnungRahmen bleibt die Wohnung frei. */
const RAND = 0.15
/** Tiefe des Laubengangs ab der Fassade. */
const GANG = 1.6
/** Deckenplatten im Gang: von GEH - PLATTE bis GEH. */
const PLATTE = 0.28
const ATTIKA = 0.75
/** Oberkante des Dachaufbaus ueber der Hoehe des Hauses. */
const DACH = 0.25
const FENSTER_ABSTAND = 2.6
const ECKE_FREI = 1.3
/** Luecke in der Fassade am Gang vor der Wohnungstuer (Hindernisse). */
const TUER_LUECKE = 1.2
/** Aufzug: Tueren auf oder zu, Fahrt je Geschoss, Halt bei weiteren Wuenschen. */
const TUER_ZEIT = 0.6
const FAHRT_JE_GESCHOSS = 1.2
const HALTE_ZEIT = 2.5
/** Strasse: halbe Laenge, Vorgarten, Gehsteig, Bordstein, Fahrbahn (Meter). */
const STRASSE_HALB = 200
const VORGARTEN = 2.6
const GEHSTEIG = 2.0
const BORD = 0.15
const FAHRBAHN = 6.5
const WEG_BREIT = 1.8
const EPS = 1e-6

/* Kern aus Aufzug und Stiegenhaus am Ende des Laubengangs: x laengs des
 * Gangs vom aeusseren Ende des Kerns, s quer von der Fassade nach aussen.
 * Schacht x 0 bis 2,3 mit Tuer 0,65 bis 1,65; Geschosspodest 2,3 bis 3,4;
 * zwei Laeufe (je 9 Steigungen) bis 5,48, Zwischenpodest bis 6,6, Wand
 * bis 6,8. Der Kern steht vor dem Gang, s 1,6 bis 4,4. */
const K_LAENGE = 6.8
const K_S0 = GANG
const K_S1 = GANG + 2.8
const K_WAND = 0.2
const K_SCHACHT = 2.3
const K_TUER0 = 0.65
const K_TUER1 = 1.65
const K_TUER_H = 2.15
const K_PODEST = 3.4
const K_LAUF = 5.48
const K_ZWISCHEN = 6.6
const K_LAUF_A: [number, number] = [1.65, 2.85]
const K_LAUF_B: [number, number] = [2.95, 4.15]
/** Kabine aussen: x0, x1, s0, s1. */
const KAB: [number, number, number, number] = [0.25, 2.05, 1.9, 4.1]
const KAB_H = 2.3

const STILE: SiedlungStil[] = ['weiss_loggia', 'holz', 'putz', 'grau']

/* ------------------------------------------------ Formen */

/** Punkt im Plan (x, z), Meter. */
type P = [number, number]
type V3 = [number, number, number]
/** Rechteck im Plan: x0, z0, x1, z1. */
type Kasten = [number, number, number, number]

/** Eine gerade Linie mit Richtung u und Normale n (Einheitsvektoren). An
 *  einer Hauswand zeigt n nach aussen. t misst laengs, s quer. */
interface Kante {
  a: P
  u: P
  n: P
  laenge: number
}

/** Rechteck an einer Kante (t0..t1 laengs, s0..s1 quer). */
interface KRechteck {
  k: Kante
  t0: number
  t1: number
  s0: number
  s1: number
}

/** Was frei bleibt: Rechteck im Plan und Hoehen, beides lokal. */
interface Schnitt {
  r: Kasten
  y0: number
  y1: number
}

interface Haus {
  g: SiedlungGebaeude
  stil: SiedlungStil
  poly: P[]
  kanten: Kante[]
  gh: number
  n: number
  H: number
}

interface Rampe {
  x: number
  z: number
  breite: number
  laenge: number
  drehung: number
}

function zahl(v: unknown, was: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`Siedlung: ${was} ist keine endliche Zahl`)
  return v
}

function ordnen(r: readonly number[], was: string): Kasten {
  if (!Array.isArray(r) || r.length !== 4) throw new Error(`Siedlung: ${was} braucht vier Zahlen`)
  for (let i = 0; i < 4; i++) zahl(r[i], `${was}[${i}]`)
  return [Math.min(r[0], r[2]), Math.min(r[1], r[3]), Math.max(r[0], r[2]), Math.max(r[1], r[3])]
}

function punkt(v: unknown, was: string): P {
  if (!Array.isArray(v) || v.length < 2) throw new Error(`Siedlung: ${was} ist kein Punkt`)
  return [zahl(v[0], `${was} x`), zahl(v[1], `${was} z`)]
}

/** Flaeche mit Vorzeichen (Schnuersenkel in x und z). */
function flaecheVon(poly: P[]): number {
  let a = 0
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]
    const q = poly[(i + 1) % poly.length]
    a += p[0] * q[1] - q[0] * p[1]
  }
  return a / 2
}

function innen(p: P, poly: P[]): boolean {
  let drin = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    if (a[1] > p[1] !== b[1] > p[1] && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) drin = !drin
  }
  return drin
}

function abstandStrecke(p: P, a: P, b: P): number {
  const dx = b[0] - a[0]
  const dz = b[1] - a[1]
  const l2 = dx * dx + dz * dz
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2)) : 0
  return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dz * t)
}

/** Schneiden sich die Strecken ab und cd echt (ohne blosses Beruehren)? */
function kreuzen(a: P, b: P, c: P, d: P): boolean {
  const o = (p: P, q: P, r: P) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
  const d1 = o(c, d, a)
  const d2 = o(c, d, b)
  const d3 = o(a, b, c)
  const d4 = o(a, b, d)
  return d1 > 0 !== d2 > 0 && d3 > 0 !== d4 > 0 && d1 !== 0 && d2 !== 0 && d3 !== 0 && d4 !== 0
}

/** Kleinster Abstand zweier Linienzuege (geschlossen ab drei Punkten, sonst
 *  eine Strecke); 0, wenn sie sich ueberlappen oder schneiden. */
function abstandFormen(a: P[], b: P[]): number {
  const kanten = (f: P[]): [P, P][] => (f.length < 3 ? [[f[0], f[f.length - 1]]] : f.map((p, i) => [p, f[(i + 1) % f.length]]))
  const ka = kanten(a)
  const kb = kanten(b)
  if (b.length >= 3 && a.some((p) => innen(p, b))) return 0
  if (a.length >= 3 && b.some((p) => innen(p, a))) return 0
  for (const [p, q] of ka) for (const [r, s] of kb) if (kreuzen(p, q, r, s)) return 0
  let d = Infinity
  for (const p of a) for (const [r, s] of kb) d = Math.min(d, abstandStrecke(p, r, s))
  for (const p of b) for (const [r, s] of ka) d = Math.min(d, abstandStrecke(p, r, s))
  return d
}

/** Konvexes Vieleck auf der Seite nx * x + nz * z >= d halten. */
function halbebene(poly: P[], nx: number, nz: number, d: number): P[] {
  const out: P[] = []
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const fa = nx * a[0] + nz * a[1] - d
    const fb = nx * b[0] + nz * b[1] - d
    if (fa >= 0) out.push(a)
    if (fa >= 0 !== fb >= 0) {
      const t = fa / (fa - fb)
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
    }
  }
  return out
}

function kp(k: Kante, t: number, s: number): P {
  return [k.a[0] + k.u[0] * t + k.n[0] * s, k.a[1] + k.u[1] * t + k.n[1] * s]
}

/** Kante von a nach b; n ist ohne Angabe u um 90 Grad gedreht. */
function kanteVon(a: P, b: P, n?: P): Kante {
  const l = Math.hypot(b[0] - a[0], b[1] - a[1])
  const u: P = l > 0 ? [(b[0] - a[0]) / l, (b[1] - a[1]) / l] : [1, 0]
  return { a, u, n: n ?? [u[1], -u[0]], laenge: l }
}

/** Querkante bei t: laengs zeigt sie nach aussen (n der Kante), quer nach +t. */
function quer(k: Kante, t: number, s = 0): Kante {
  return { a: kp(k, t, s), u: k.n, n: k.u, laenge: 0 }
}

/** Dieselbe Kante, um s nach aussen verschoben. */
function versetzt(k: Kante, s: number): Kante {
  return { a: kp(k, 0, s), u: k.u, n: k.n, laenge: k.laenge }
}

function rechteckForm(r: KRechteck): P[] {
  return [kp(r.k, r.t0, r.s0), kp(r.k, r.t1, r.s0), kp(r.k, r.t1, r.s1), kp(r.k, r.t0, r.s1)]
}

function kastenRechteck(x0: number, z0: number, x1: number, z1: number): KRechteck {
  return { k: { a: [x0, z0], u: [1, 0], n: [0, 1], laenge: x1 - x0 }, t0: 0, t1: x1 - x0, s0: 0, s1: z1 - z0 }
}

function wachsen(r: KRechteck, d: number): KRechteck {
  return { k: r.k, t0: r.t0 - d, t1: r.t1 + d, s0: r.s0 - d, s1: r.s1 + d }
}

/** Kanten eines Umrisses mit Normale nach aussen. */
function kantenVon(poly: P[]): Kante[] {
  const links = flaecheVon(poly) > 0
  return poly.map((a, i) => {
    const b = poly[(i + 1) % poly.length]
    const k = kanteVon(a, b)
    k.n = links ? [k.u[1], -k.u[0]] : [-k.u[1], k.u[0]]
    return k
  })
}

/** Wo das Rechteck r (lokal, achsenparallel) die Flaeche t0..t1, s0..s1 an
 *  der Kante k trifft, als Rahmen (ta, tb, sa, sb); null ohne Flaeche. */
function treffer(k: Kante, t0: number, t1: number, s0: number, s1: number, r: Kasten): [number, number, number, number] | null {
  let poly: P[] = (
    [
      [r[0], r[1]],
      [r[2], r[1]],
      [r[2], r[3]],
      [r[0], r[3]],
    ] as P[]
  ).map(([x, z]) => {
    const dx = x - k.a[0]
    const dz = z - k.a[1]
    return [dx * k.u[0] + dz * k.u[1], dx * k.n[0] + dz * k.n[1]] as P
  })
  poly = halbebene(poly, 1, 0, t0)
  poly = halbebene(poly, -1, 0, -t1)
  poly = halbebene(poly, 0, 1, s0)
  poly = halbebene(poly, 0, -1, -s1)
  if (poly.length < 3 || Math.abs(flaecheVon(poly)) < 1e-9) return null
  let ta = Infinity
  let tb = -Infinity
  let sa = Infinity
  let sb = -Infinity
  for (const [t, s] of poly) {
    ta = Math.min(ta, t)
    tb = Math.max(tb, t)
    sa = Math.min(sa, s)
    sb = Math.max(sb, s)
  }
  return [ta, tb, sa, sb]
}

/** Ein Rechteck ohne den Teil im Rechteck r (lokal), als Stuecke. */
function ohne(h: KRechteck, r: Kasten | null): KRechteck[] {
  if (!r) return [h]
  const tr = treffer(h.k, h.t0, h.t1, h.s0, h.s1, r)
  if (!tr) return [h]
  const [ta, tb, sa, sb] = tr
  return [
    { ...h, t1: ta },
    { ...h, t0: tb },
    { ...h, t0: ta, t1: tb, s1: sa },
    { ...h, t0: ta, t1: tb, s0: sb },
  ].filter((x) => x.t1 - x.t0 > 0.01 && x.s1 - x.s0 > 0.01)
}

/** Intervalle [a, b] ohne die Luecken. */
function abziehen(von: [number, number], weg: [number, number][]): [number, number][] {
  let stuecke: [number, number][] = [von]
  for (const [a, b] of weg) {
    const neu: [number, number][] = []
    for (const [x, y] of stuecke) {
      if (b <= x || a >= y) {
        neu.push([x, y])
        continue
      }
      if (a > x) neu.push([x, a])
      if (b < y) neu.push([b, y])
    }
    stuecke = neu
  }
  return stuecke.filter(([a, b]) => b - a > 0.01)
}

/** Kleiner Zufall mit Saat (mulberry32): gleiche Saat, gleiche Folge. */
function zufallMit(saat: number): () => number {
  let s = saat >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Saat aus Zahlen, auf ganze Zentimeter (FNV-1a). */
function saatAus(zahlen: number[]): number {
  let h = 0x811c9dc5
  for (const v of zahlen) {
    h ^= Math.round(v * 100) | 0
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/* ------------------------------------------------ Geometrie sammeln */

/** Ecken einer Vorlage (ohne Index), einmal gebaut und dann nur gelesen. */
interface Vorlage {
  lage: Float32Array
  richtung: Float32Array
  y0: number
  y1: number
}
const vorlagen = new Map<string, Vorlage>()
function vorlage(name: string, bau: () => BufferGeometry): Vorlage {
  let v = vorlagen.get(name)
  if (!v) {
    const geo = bau()
    const g = geo.index ? geo.toNonIndexed() : geo
    if (g !== geo) geo.dispose()
    const lage = Float32Array.from(g.getAttribute('position').array)
    const richtung = Float32Array.from(g.getAttribute('normal').array)
    g.dispose()
    let y0 = Infinity
    let y1 = -Infinity
    for (let i = 1; i < lage.length; i += 3) {
      y0 = Math.min(y0, lage[i])
      y1 = Math.max(y1, lage[i])
    }
    v = { lage, richtung, y0, y1 }
    vorlagen.set(name, v)
  }
  return v
}
const wuerfel = () => vorlage('wuerfel', () => new BoxGeometry(1, 1, 1))
const kugelFein = () => vorlage('kugel2', () => new IcosahedronGeometry(1, 2))
const kugelGrob = () => vorlage('kugel1', () => new IcosahedronGeometry(1, 1))
const walze = () => vorlage('walze8', () => new CylinderGeometry(1, 1, 1, 8))
const stammForm = () => vorlage('stamm7', () => new CylinderGeometry(0.6, 1, 1, 7, 1, true))

/** Dreiecke ohne Index: Lage, Richtung und Farbe je Ecke, in Feldern, die
 *  bei Bedarf doppelt so gross werden (schneller als Listen am Handy). */
class Puffer {
  private l = new Float32Array(3 * 4096)
  private r = new Float32Array(3 * 4096)
  private f = new Float32Array(3 * 4096)
  private n = 0

  get ecken(): number {
    return this.n / 3
  }

  /** Eine Ecke anhaengen. */
  ecke(x: number, y: number, z: number, nx: number, ny: number, nz: number, cr: number, cg: number, cb: number): void {
    if (this.n + 3 > this.l.length) {
      const neu = (a: Float32Array) => {
        const b = new Float32Array(a.length * 2)
        b.set(a)
        return b
      }
      this.l = neu(this.l)
      this.r = neu(this.r)
      this.f = neu(this.f)
    }
    const i = this.n
    this.l[i] = x
    this.l[i + 1] = y
    this.l[i + 2] = z
    this.r[i] = nx
    this.r[i + 1] = ny
    this.r[i + 2] = nz
    this.f[i] = cr
    this.f[i + 1] = cg
    this.f[i + 2] = cb
    this.n = i + 3
  }

  /** Quader um c mit den Achsen ax (Laenge sx), ay (Hoehe sy), az (Tiefe
   *  sz), rechtshaendig. schatten: unten so viel dunkler. deckel: false
   *  laesst Ober- und Unterseite weg (Staebe, die man nie von dort sieht). */
  quader(c: V3, ax: V3, ay: V3, az: V3, sx: number, sy: number, sz: number, f: Color, schatten = 0, deckel = true): void {
    const v = wuerfel()
    for (let i = 0; i < v.lage.length; i += 3) {
      // Ecken 12 bis 23 sind Ober- und Unterseite (Reihenfolge der BoxGeometry).
      if (!deckel && i >= 36 && i < 72) continue
      const x = v.lage[i] * sx
      const y = v.lage[i + 1] * sy
      const z = v.lage[i + 2] * sz
      const nx = v.richtung[i]
      const ny = v.richtung[i + 1]
      const nz = v.richtung[i + 2]
      const k = schatten > 0 ? 1 - schatten * (0.5 - v.lage[i + 1]) : 1
      this.ecke(
        c[0] + ax[0] * x + ay[0] * y + az[0] * z,
        c[1] + ax[1] * x + ay[1] * y + az[1] * z,
        c[2] + ax[2] * x + ay[2] * y + az[2] * z,
        ax[0] * nx + ay[0] * ny + az[0] * nz,
        ax[1] * nx + ay[1] * ny + az[1] * nz,
        ax[2] * nx + ay[2] * ny + az[2] * nz,
        f.r * k,
        f.g * k,
        f.b * k,
      )
    }
  }

  /** Flaches Rechteck um c (ax mal sx, ay mal sy), sichtbar zur Seite n. */
  viereck(c: V3, ax: V3, ay: V3, sx: number, sy: number, n: V3, f: Color): void {
    const p = (a: number, b: number): V3 => [c[0] + ax[0] * a * sx + ay[0] * b * sy, c[1] + ax[1] * a * sx + ay[1] * b * sy, c[2] + ax[2] * a * sx + ay[2] * b * sy]
    const w = kreuz(ax, ay)
    const vorn = w[0] * n[0] + w[1] * n[1] + w[2] * n[2] > 0
    const ecken = vorn
      ? [p(-0.5, -0.5), p(0.5, -0.5), p(0.5, 0.5), p(-0.5, -0.5), p(0.5, 0.5), p(-0.5, 0.5)]
      : [p(-0.5, -0.5), p(0.5, 0.5), p(0.5, -0.5), p(-0.5, -0.5), p(-0.5, 0.5), p(0.5, 0.5)]
    for (const e of ecken) this.ecke(e[0], e[1], e[2], n[0], n[1], n[2], f.r, f.g, f.b)
  }

  /** Achsenparalleler Quader. */
  kasten(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, f: Color, schatten = 0): void {
    this.quader([(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [1, 0, 0], [0, 1, 0], [0, 0, 1], x1 - x0, y1 - y0, z1 - z0, f, schatten)
  }

  /** Vorlage mit Matrix m. schatten nach der Hoehe in der Vorlage. */
  form(v: Vorlage, m: Matrix4, f: Color, schatten = 0): void {
    const e = m.elements
    const nm = new Matrix3().getNormalMatrix(m).elements
    const hoch = v.y1 - v.y0
    for (let i = 0; i < v.lage.length; i += 3) {
      const x = v.lage[i]
      const y = v.lage[i + 1]
      const z = v.lage[i + 2]
      const nx = v.richtung[i]
      const ny = v.richtung[i + 1]
      const nz = v.richtung[i + 2]
      const rx = nm[0] * nx + nm[3] * ny + nm[6] * nz
      const ry = nm[1] * nx + nm[4] * ny + nm[7] * nz
      const rz = nm[2] * nx + nm[5] * ny + nm[8] * nz
      const l = Math.hypot(rx, ry, rz) || 1
      const t = schatten > 0 && hoch > 0 ? (y - v.y0) / hoch : 1
      const k = 1 - schatten * (1 - t)
      this.ecke(
        e[0] * x + e[4] * y + e[8] * z + e[12],
        e[1] * x + e[5] * y + e[9] * z + e[13],
        e[2] * x + e[6] * y + e[10] * z + e[14],
        rx / l,
        ry / l,
        rz / l,
        f.r * k,
        f.g * k,
        f.b * k,
      )
    }
  }

  /** Ein flaches Dreieck bei Hoehe y, nach oben oder unten gewendet. */
  dreieck(a: P, b: P, c: P, y: number, fa: Color, fb: Color, fc: Color, oben = true): void {
    const ny = (b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1])
    if (Math.abs(ny) < 1e-12) return
    if (ny > 0 !== oben) {
      ;[b, c] = [c, b]
      ;[fb, fc] = [fc, fb]
    }
    const r = oben ? 1 : -1
    this.ecke(a[0], y, a[1], 0, r, 0, fa.r, fa.g, fa.b)
    this.ecke(b[0], y, b[1], 0, r, 0, fb.r, fb.g, fb.b)
    this.ecke(c[0], y, c[1], 0, r, 0, fc.r, fc.g, fc.b)
  }

  /** Ebenes Vieleck bei Hoehe y (darf nicht konvex sein). */
  flaeche(poly: P[], y: number, f: Color | ((p: P) => Color), oben = true): void {
    if (poly.length < 3) return
    const farbe = typeof f === 'function' ? f : () => f
    const dreiecke = ShapeUtils.triangulateShape(
      poly.map(([x, z]) => new Vector2(x, z)),
      [],
    )
    for (const [i, j, k] of dreiecke) this.dreieck(poly[i], poly[j], poly[k], y, farbe(poly[i]), farbe(poly[j]), farbe(poly[k]), oben)
  }

  bauen(): BufferGeometry | null {
    if (!this.n) return null
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(this.l.slice(0, this.n), 3))
    g.setAttribute('normal', new BufferAttribute(this.r.slice(0, this.n), 3))
    g.setAttribute('color', new BufferAttribute(this.f.slice(0, this.n), 3))
    g.computeBoundingSphere()
    return g
  }
}

/** Matrix aus Mitte, Achsen (rechtshaendig) und Groessen. */
function achsenMatrix(c: V3, ax: V3, ay: V3, az: V3, sx: number, sy: number, sz: number): Matrix4 {
  return new Matrix4().set(
    ax[0] * sx, ay[0] * sy, az[0] * sz, c[0],
    ax[1] * sx, ay[1] * sy, az[1] * sz, c[1],
    ax[2] * sx, ay[2] * sy, az[2] * sz, c[2],
    0, 0, 0, 1,
  )
}

function normiert(v: V3): V3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / l, v[1] / l, v[2] / l]
}

function kreuz(a: V3, b: V3): V3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}

/** Rechtshaendige Achsen mit ay entlang der Richtung d. */
function achsenUm(d: V3): [V3, V3, V3] {
  const ay = normiert(d)
  const hilfe: V3 = Math.abs(ay[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]
  const az = normiert(kreuz(hilfe, ay))
  const ax = kreuz(ay, az)
  return [ax, ay, az]
}

/** Quader an einer Kante: t laengs, s quer, y hoch (lokal). Trifft er die
 *  Aussparung sch, bleiben nur die Stuecke ausserhalb stehen. */
function kq(p: Puffer, k: Kante, t0: number, t1: number, s0: number, s1: number, y0: number, y1: number, f: Color, sch: Schnitt | null, schatten = 0, deckel = true): void {
  if (t1 - t0 < 1e-3 || s1 - s0 < 1e-3 || y1 - y0 < 1e-3) return
  if (sch && y0 < sch.y1 - EPS && y1 > sch.y0 + EPS) {
    const h = treffer(k, t0, t1, s0, s1, sch.r)
    if (h) {
      const [ta, tb, sa, sb] = h
      kq(p, k, t0, ta, s0, s1, y0, y1, f, null, schatten, deckel)
      kq(p, k, tb, t1, s0, s1, y0, y1, f, null, schatten, deckel)
      kq(p, k, ta, tb, s0, sa, y0, y1, f, null, schatten, deckel)
      kq(p, k, ta, tb, sb, s1, y0, y1, f, null, schatten, deckel)
      kq(p, k, ta, tb, sa, sb, y0, Math.min(y1, sch.y0), f, null, schatten, deckel)
      kq(p, k, ta, tb, sa, sb, Math.max(y0, sch.y1), y1, f, null, schatten, deckel)
      return
    }
  }
  const tm = (t0 + t1) / 2
  const sm = (s0 + s1) / 2
  const c = kp(k, tm, sm)
  p.quader([c[0], (y0 + y1) / 2, c[1]], [k.u[0], 0, k.u[1]], [0, 1, 0], [-k.u[1], 0, k.u[0]], t1 - t0, y1 - y0, s1 - s0, f, schatten, deckel)
}

/** Flaeche an der Kante bei s (t0..t1, y0..y1), sichtbar nach aussen (n). */
function kf(p: Puffer, k: Kante, t0: number, t1: number, s: number, y0: number, y1: number, f: Color): void {
  const c = kp(k, (t0 + t1) / 2, s)
  p.viereck([c[0], (y0 + y1) / 2, c[1]], [k.u[0], 0, k.u[1]], [0, 1, 0], t1 - t0, y1 - y0, [k.n[0], 0, k.n[1]], f)
}

/** Trifft ein Teil an der Kante (mit Rand) die Aussparung? Dann faellt es
 *  ganz weg (Fenster, Balkone: halbe sehen falsch aus). */
function trifft(sch: Schnitt | null, k: Kante, t0: number, t1: number, s0: number, s1: number, y0: number, y1: number, rand = 0): boolean {
  if (!sch) return false
  if (!(y0 - rand < sch.y1 - EPS && y1 + rand > sch.y0 + EPS)) return false
  return treffer(k, t0 - rand, t1 + rand, s0 - rand, s1 + rand, sch.r) !== null
}

function trifftKasten(sch: Schnitt | null, x0: number, z0: number, x1: number, z1: number, y0: number, y1: number): boolean {
  if (!sch) return false
  if (!(y0 < sch.y1 - EPS && y1 > sch.y0 + EPS)) return false
  return x0 < sch.r[2] - EPS && x1 > sch.r[0] + EPS && z0 < sch.r[3] - EPS && z1 > sch.r[1] + EPS
}

/* ------------------------------------------------ Pruefen */

function umrissBereinigen(umriss: unknown, name: string): P[] {
  if (!Array.isArray(umriss)) throw new Error(`Siedlung: ${name} hat keinen Umriss`)
  const roh = umriss.map((p, i) => punkt(p, `${name}, Punkt ${i + 1}`))
  const out: P[] = []
  for (const p of roh) {
    const l = out[out.length - 1]
    if (!l || Math.hypot(p[0] - l[0], p[1] - l[1]) > 0.05) out.push(p)
  }
  while (out.length > 2 && Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) <= 0.05) out.pop()
  if (out.length < 3 || Math.abs(flaecheVon(out)) < 4) throw new Error(`Siedlung: ${name} hat keinen gueltigen Umriss`)
  return out
}

function hausPruefen(g: SiedlungGebaeude, i: number): Haus {
  const name = g && typeof g.name === 'string' && g.name ? g.name : `Haus ${i + 1}`
  if (!g || typeof g.id !== 'string' || !g.id) throw new Error(`Siedlung: ${name} hat keine Kennung`)
  const poly = umrissBereinigen(g.umriss, name)
  if (!Number.isInteger(g.geschosse) || g.geschosse < 1 || g.geschosse > 30) throw new Error(`Siedlung: ${name} hat keine gueltige Zahl an Geschossen`)
  const gh = zahl(g.geschossHoehe, `${name}: geschossHoehe`)
  if (gh < 2.2 || gh > 6) throw new Error(`Siedlung: ${name}: geschossHoehe ausserhalb von 2,2 bis 6 m`)
  // Ein neuer Stil, den diese Fassung noch nicht kennt, wird hell verputzt.
  const stil: SiedlungStil = STILE.includes(g.stil) ? g.stil : 'putz'
  return { g, stil, poly, kanten: kantenVon(poly), gh, n: g.geschosse, H: g.geschosse * gh }
}

/* ------------------------------------------------ Farben */

function farbenAus(f: Farben3D) {
  const c = (s: string) => new Color(s)
  const mix = (a: Color, b: Color, t: number) => a.clone().lerp(b, t)
  const b = {
    rasen: c(f.rasen),
    weg: c(f.weg),
    baum: c(f.baum),
    stamm: c(f.stamm),
    hecke: c(f.hecke),
    oben: c(f.himmelOben),
    unten: c(f.himmelUnten),
    fassade: c(f.fassade),
    wand: c(f.wand3d),
    weiss: c(f.weiss),
    metall: c(f.metall),
    schwarz: c(f.schwarz),
    glas: c(f.glas),
    holz: c(f.holz),
    holzDunkel: c(f.holzDunkel),
    rot: c(f.spielRot),
    blau: c(f.spielBlau),
    gelb: c(f.spielGelb),
    gruen: c(f.gruen),
    rahmen: c(f.rahmen3d),
    platte: c(f.platte),
    spiegel: c(f.spiegel),
  }
  return {
    ...b,
    putzWeiss: mix(b.fassade, b.weiss, 0.55),
    putzBeige: mix(b.fassade, b.holz, 0.2),
    putzGrau: mix(b.fassade, b.metall, 0.35),
    holzFassade: mix(b.holz, b.rot, 0.25).multiplyScalar(0.8),
    loggiaGelb: mix(b.gelb, b.weiss, 0.45),
    loggiaWeiss: mix(b.fassade, b.weiss, 0.8),
    glasDunkel: mix(b.glas, b.schwarz, 0.62),
    bank: b.weiss.clone().multiplyScalar(0.9),
    gelaender: mix(b.metall, b.weiss, 0.35),
    beton: mix(b.fassade, b.metall, 0.25).multiplyScalar(0.9),
    sockel: b.wand.clone().multiplyScalar(0.72),
    substrat: mix(b.stamm, b.rasen, 0.35).multiplyScalar(0.8),
    kies: mix(b.weg, b.metall, 0.3),
    moos: mix(b.rasen, b.gruen, 0.5),
    sedum: mix(b.rot, b.stamm, 0.45).multiplyScalar(0.9),
    stroh: mix(b.weg, b.gelb, 0.4),
    pv: mix(b.schwarz, b.blau, 0.3),
    asphalt: b.weg.clone().multiplyScalar(0.36),
    bord: mix(b.weg, b.fassade, 0.5),
    pflaster: mix(b.weg, b.fassade, 0.25),
    sand: mix(b.gelb, b.weg, 0.6),
    tuer: mix(b.holzDunkel, b.holz, 0.3),
    trocken: mix(b.rasen, b.weg, 0.6),
    licht: mix(b.weiss, b.gelb, 0.12),
    kabine: mix(b.holz, b.weiss, 0.45),
    nachbar: mix(b.fassade, b.weiss, 0.35),
    laub: [
      mix(b.gelb, b.baum, 0.2),
      mix(b.gelb, b.rot, 0.45),
      mix(b.rot, b.stamm, 0.2),
      mix(b.baum, b.gelb, 0.4),
      b.baum.clone(),
      mix(b.gelb, b.rot, 0.25),
    ],
  }
}


/* ------------------------------------------------ Aufzug */

type Phase = 'ruhe' | 'zu' | 'fahrt' | 'auf' | 'halt'

/** Ein Tuerblatt: Ecken start bis ende im Mesh, gleitet um weg entlang richtung. */
interface Blatt {
  start: number
  ende: number
  richtung: P
  weg: number
}

interface Aufzug {
  phase: Phase
  etage: number
  pos: number
  ziel: number
  von: number
  zeit: number
  dauer: number
  tuer: number
  halt: number
  warte: number[]
  nachFahrt: boolean
  ankunft: number | null
}

/** Zum Abfragen der Ankunft (aufzugZiel), je gebauter Siedlung. */
const ANKUENFTE = new WeakMap<Welt3D, () => number | null>()

/** Index der Ebene, an der der Aufzug gerade angekommen ist und die Tueren
 *  aufgehen; genau einmal je Ankunft, sonst null. Fuer andere Welten null. */
export function aufzugZiel(w: Welt3D): number | null {
  const f = ANKUENFTE.get(w)
  return f ? f() : null
}

/* ------------------------------------------------ Aufbau */

export function baueSiedlung(o: SiedlungOptionen): Welt3D {
  const sd = o.siedlung
  if (!sd || !Array.isArray(sd.gebaeude)) throw new Error('Siedlung: keine Daten')
  if (sd.gebaeude.length === 0) throw new Error('Siedlung: keine Haeuser')
  const haeuser = sd.gebaeude.map(hausPruefen)
  const ids = new Set<string>()
  for (const h of haeuser) {
    if (ids.has(h.g.id)) throw new Error(`Siedlung: Kennung ${h.g.id} doppelt`)
    ids.add(h.g.id)
  }

  /* Die eigene Wohnung. */
  let eigen: Haus | null = null
  let geschoss = 0
  let drehung = 0
  let wx = 0
  let wz = 0
  if (sd.wohnung) {
    const w = sd.wohnung
    eigen = haeuser.find((h) => h.g.id === w.gebaeudeId) ?? null
    if (!eigen) throw new Error('Siedlung: das Haus der Wohnung fehlt')
    if (!Number.isInteger(w.geschoss) || w.geschoss < 0 || w.geschoss >= eigen.n) throw new Error('Siedlung: das Geschoss der Wohnung gibt es im Haus nicht')
    if (![0, 90, 180, 270].includes(w.drehung)) throw new Error('Siedlung: drehung muss 0, 90, 180 oder 270 sein')
    geschoss = w.geschoss
    drehung = w.drehung
    wx = zahl(w.x, 'Lage der Wohnung x')
    wz = zahl(w.z, 'Lage der Wohnung z')
  }
  const gh = eigen ? eigen.gh : 3
  const absenk = eigen ? geschoss * gh : 0

  /* Draussen. */
  const a = sd.aussen ?? { spielplatz: null, tiefgarage: null, wege: [] }
  const spielPoly = a.spielplatz ? a.spielplatz.map((p, i) => punkt(p, `Spielplatz, Punkt ${i + 1}`)) : null
  if (spielPoly && (spielPoly.length < 3 || Math.abs(flaecheVon(spielPoly)) < 4)) throw new Error('Siedlung: der Spielplatz hat keine Flaeche')
  let rampe: Rampe | null = null
  if (a.tiefgarage) {
    const t = a.tiefgarage
    rampe = {
      x: zahl(t.x, 'Tiefgarage x'),
      z: zahl(t.z, 'Tiefgarage z'),
      breite: zahl(t.breite, 'Tiefgarage breite'),
      laenge: zahl(t.laenge, 'Tiefgarage laenge'),
      drehung: zahl(t.drehung, 'Tiefgarage drehung'),
    }
    if (rampe.breite < 2 || rampe.laenge < 4) throw new Error('Siedlung: die Rampe der Tiefgarage ist zu klein')
  }
  if (!Array.isArray(a.wege)) throw new Error('Siedlung: wege ist keine Liste')
  const wege: P[][] = a.wege.map((w, i) => {
    if (!Array.isArray(w) || w.length < 2) throw new Error(`Siedlung: Weg ${i + 1} braucht zwei Punkte`)
    return w.map((p, j) => punkt(p, `Weg ${i + 1}, Punkt ${j + 1}`))
  })

  /* Lage: lokal -> Welt dreht um drehung zurueck, verschiebt und senkt. */
  const alle = haeuser.flatMap((h) => h.poly)
  const bx0 = Math.min(...alle.map((p) => p[0]))
  const bx1 = Math.max(...alle.map((p) => p[0]))
  const bz0 = Math.min(...alle.map((p) => p[1]))
  const bz1 = Math.max(...alle.map((p) => p[1]))
  if (!eigen) {
    wx = (bx0 + bx1) / 2
    wz = (bz0 + bz1) / 2
  }
  const [cs, sn] = ({ 0: [1, 0], 90: [0, 1], 180: [-1, 0], 270: [0, -1] } as Record<number, [number, number]>)[drehung]
  const rad = (drehung * Math.PI) / 180
  const nachWelt = (p: P): P => {
    const dx = p[0] - wx
    const dz = p[1] - wz
    return [cs * dx + sn * dz, -sn * dx + cs * dz]
  }
  const nachLokal = (p: P): P => [wx + cs * p[0] - sn * p[1], wz + sn * p[0] + cs * p[1]]
  const kastenLokal = (r: Kasten): Kasten => {
    const e = [nachLokal([r[0], r[1]]), nachLokal([r[2], r[3]])]
    return [Math.min(e[0][0], e[1][0]), Math.min(e[0][1], e[1][1]), Math.max(e[0][0], e[1][0]), Math.max(e[0][1], e[1][1])]
  }

  /* Die Aussparung fuer die Wohnung, lokal. */
  const rahmenWelt = o.wohnungRahmen ? ordnen(o.wohnungRahmen, 'wohnungRahmen') : null
  const rahmenLokal = rahmenWelt ? kastenLokal(rahmenWelt) : null
  const sch: Schnitt | null = rahmenLokal
    ? {
        r: [rahmenLokal[0] - RAND, rahmenLokal[1] - RAND, rahmenLokal[2] + RAND, rahmenLokal[3] + RAND],
        y0: absenk - 0.02,
        y1: absenk + gh - 0.05,
      }
    : null

  const F = farbenAus(o.farben)
  const zz = zufallMit(
    saatAus([
      ...alle.flat(),
      ...haeuser.map((h) => h.n),
      ...(spielPoly ?? []).flat(),
      ...wege.flat(2),
      ...(rampe ? [rampe.x, rampe.z, rampe.laenge] : []),
    ]),
  )

  const bauten = new Puffer()
  const gelaende = new Puffer()
  const gruen = new Puffer()
  const boden = new Puffer()

  /** Belegte Flaechen fuer das Verteilen von Baeumen, Parkplatz und Co.,
   *  mit Rahmen, damit weit Entferntes gleich wegfaellt. */
  const belegt: { form: P[]; r: Kasten }[] = []
  const belegen = (form: P[]) => {
    belegt.push({ form, r: kastenVon(form) })
  }
  const frei = (form: P[], d: number, ausser: P[] | null = null) => {
    const r = kastenVon(form)
    for (const b of belegt) {
      if (b.form === ausser) continue
      if (r[0] - b.r[2] >= d || b.r[0] - r[2] >= d || r[1] - b.r[3] >= d || b.r[1] - r[3] >= d) continue
      if (abstandFormen(form, b.form) < d) return false
    }
    return true
  }
  /** Hindernisse draussen (lokal). */
  const garten: KRechteck[] = []

  /* ------------------------------------------------ Strasse */
  /* Die Seite der Siedlung (Ost, Sued, West, Nord), an der am meisten
   * Fassade in einer Flucht steht. */
  const SEITEN: { name: string; q: P }[] = [
    { name: 'ost', q: [1, 0] },
    { name: 'sued', q: [0, 1] },
    { name: 'west', q: [-1, 0] },
    { name: 'nord', q: [0, -1] },
  ]
  let seite = SEITEN[0]
  let besteWertung = -1
  for (const s of SEITEN) {
    const c0 = Math.max(...alle.map((p) => p[0] * s.q[0] + p[1] * s.q[1]))
    let w = 0
    for (const h of haeuser) {
      for (const k of h.kanten) {
        const m = kp(k, k.laenge / 2, 0)
        if (k.n[0] * s.q[0] + k.n[1] * s.q[1] > 0.97 && Math.abs(m[0] * s.q[0] + m[1] * s.q[1] - c0) <= 3) w += k.laenge
      }
    }
    if (w > besteWertung + EPS) {
      besteWertung = w
      seite = s
    }
  }
  const q = seite.q
  const l: P = [-q[1], q[0]]
  const qv = (p: P) => p[0] * q[0] + p[1] * q[1]
  const lv = (p: P) => p[0] * l[0] + p[1] * l[1]
  const c0 = Math.max(...alle.map(qv))
  const qmin = Math.min(...alle.map(qv))
  const lmin = Math.min(...alle.map(lv))
  const lmax = Math.max(...alle.map(lv))
  const lmitte = (lmin + lmax) / 2
  /** Kante entlang der Strasse: t ist die Lage laengs, s der Abstand quer. */
  const sk: Kante = { a: [0, 0], u: l, n: q, laenge: 0 }
  const strasseQ0 = c0 + VORGARTEN
  const strasseQ1 = strasseQ0 + 2 * GEHSTEIG + 2 * BORD + FAHRBAHN
  {
    const t0 = lmitte - STRASSE_HALB
    const t1 = lmitte + STRASSE_HALB
    const baender: [number, number, number, Color][] = [
      [0, GEHSTEIG, 0.08, F.weg],
      [GEHSTEIG, GEHSTEIG + BORD, 0.1, F.bord],
      [GEHSTEIG + BORD, GEHSTEIG + BORD + FAHRBAHN, -0.025, F.asphalt],
      [GEHSTEIG + BORD + FAHRBAHN, GEHSTEIG + 2 * BORD + FAHRBAHN, 0.1, F.bord],
      [GEHSTEIG + 2 * BORD + FAHRBAHN, 2 * GEHSTEIG + 2 * BORD + FAHRBAHN, 0.08, F.weg],
    ]
    for (const [s0, s1, oben, f] of baender) kq(gelaende, sk, t0, t1, strasseQ0 + s0, strasseQ0 + s1, -0.2, oben, f, sch)
    belegen(rechteckForm({ k: sk, t0, t1, s0: strasseQ0, s1: strasseQ1 }))
  }

  /* ------------------------------------------------ Rampe der Tiefgarage */
  let loch: P[] | null = null
  if (rampe) {
    const d: P = [Math.cos((rampe.drehung * Math.PI) / 180), Math.sin((rampe.drehung * Math.PI) / 180)]
    const rk: Kante = { a: [rampe.x, rampe.z], u: d, n: [-d[1], d[0]], laenge: rampe.laenge }
    const L = rampe.laenge
    const B = rampe.breite
    const T = Math.min(3.2, 0.16 * L)
    const W = 0.25
    const grube: KRechteck = { k: rk, t0: -L / 2, t1: L / 2 + W, s0: -B / 2 - W, s1: B / 2 + W }
    loch = rechteckForm(grube)
    const unten = -T - 0.02
    // Fahrbahn: schraege Platte von oben (Gelaende) nach unten.
    const ax = normiert([d[0] * L, unten - GEH, d[1] * L])
    let az: V3 = [-d[1], 0, d[0]]
    let ay = kreuz(az, ax)
    if (ay[1] < 0) {
      az = [-az[0], -az[1], -az[2]]
      ay = kreuz(az, ax)
    }
    const lang = Math.hypot(L, unten - GEH)
    const m: V3 = [rampe.x - ay[0] * 0.125, (GEH + unten) / 2 - ay[1] * 0.125, rampe.z - ay[2] * 0.125]
    if (!trifftKasten(sch, ...kastenVon(loch), unten - 0.4, 1.2)) {
      gelaende.quader(m, ax, ay, az, lang, 0.25, B, F.asphalt)
      // Boden vor dem Tor, Seitenwaende, Stirnwand mit Tor, Gelaender.
      kq(gelaende, rk, L / 2 - 0.01, L / 2 + W, -B / 2, B / 2, unten - 0.3, unten, F.asphalt, null)
      for (const s of [-1, 1]) {
        const s0 = s < 0 ? -B / 2 - W : B / 2
        kq(bauten, rk, -L / 2, L / 2 + W, s0, s0 + W, unten - 0.3, 0.95, F.beton, null)
        gelaenderLinie(bauten, rk, -L / 2 + 0.1, L / 2 + W - 0.1, s0 + W / 2, 0.95, F.gelaender, null, 0.1, 0)
      }
      kq(bauten, rk, L / 2, L / 2 + W, -B / 2, B / 2, unten - 0.3, 0.95, F.beton, null)
      kq(bauten, rk, L / 2 - 0.03, L / 2, -B / 2 + 0.3, B / 2 - 0.3, unten, unten + 2.3, F.schwarz, null)
      gelaenderLinie(bauten, quer(rk, L / 2 + W / 2), -B / 2 - W, B / 2 + W, 0, 0.95, F.gelaender, null, 0.1, 0)
      belegen(rechteckForm(wachsen(grube, 0.5)))
      garten.push(grube)
    } else loch = null
  }

  /* ------------------------------------------------ Spielplatz */
  let spielgeraete = 0
  if (spielPoly) {
    belegen(spielPoly)
    const kanten = kantenVon(spielPoly)
    const ganz = spielPoly.flat()
    const xs = ganz.filter((_, i) => i % 2 === 0)
    const zs = ganz.filter((_, i) => i % 2 === 1)
    if (!trifftKasten(sch, Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs), -0.1, 3.5)) {
      gelaende.flaeche(spielPoly, -0.015, F.sand)
      for (const k of kanten) kq(gelaende, k, 0, k.laenge, -0.12, 0, -0.1, 0.06, F.holz, sch)
      spielgeraete = spielplatz(spielPoly, kanten)
    }
  }

  /* ------------------------------------------------ Wege */
  for (const w of wege) {
    for (let i = 0; i + 1 < w.length; i++) {
      const k = kanteVon(w[i], w[i + 1])
      if (k.laenge < 0.05) continue
      kq(gelaende, k, 0, k.laenge, -WEG_BREIT / 2, WEG_BREIT / 2, GEH - 0.05, GEH, F.pflaster, sch)
      belegen([w[i], w[i + 1]])
    }
    // Runde Stoesse an den Knicken.
    for (let i = 1; i + 1 < w.length; i++) {
      const [x, z] = w[i]
      if (trifftKasten(sch, x - 1, z - 1, x + 1, z + 1, GEH - 0.05, GEH)) continue
      gelaende.form(walze(), achsenMatrix([x, GEH - 0.025, z], [1, 0, 0], [0, 1, 0], [0, 0, 1], WEG_BREIT / 2, 0.05, WEG_BREIT / 2), F.pflaster)
    }
  }
  /** Abstand zu einem Weg (Mittellinie). */
  const wegAbstand = (form: P[]) => {
    let d = Infinity
    for (const w of wege) for (let i = 0; i + 1 < w.length; i++) d = Math.min(d, abstandFormen(form, [w[i], w[i + 1]]))
    return d
  }

  /* ------------------------------------------------ Laubengang und Kern */
  /* Der Gang liegt an der Kante des eigenen Hauses, die am meisten nach
   * Norden zeigt, der Kern an dem Ende, das naeher an der Strasse liegt
   * (oder am anderen, wenn dort etwas im Weg steht). */
  let gang: Kante | null = null
  let kernEnde: 0 | 1 = 1
  let mitKern = false
  if (eigen) {
    let beste = -Infinity
    for (const k of eigen.kanten) {
      if (k.laenge < 4) continue
      const w = -k.n[1] + k.laenge * 1e-4
      if (w > beste) {
        beste = w
        gang = k
      }
    }
    if (gang) {
      const g = gang
      const kernForm = (ende: 0 | 1) => {
        const t0 = ende === 1 ? g.laenge - K_LAENGE : 0
        return rechteckForm({ k: g, t0, t1: t0 + K_LAENGE, s0: K_S0, s1: K_S1 })
      }
      const ok = (ende: 0 | 1) => {
        const f = kernForm(ende)
        const andere = haeuser.filter((h) => h !== eigen).every((h) => abstandFormen(f, h.poly) >= 0.5)
        const spiel = !spielPoly || abstandFormen(f, spielPoly) >= 0.5
        const grube = !loch || abstandFormen(f, loch) >= 0.5
        const xs = f.map((p) => p[0])
        const zs = f.map((p) => p[1])
        const wohnung = !sch || !trifftKasten(sch, Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs), -1, 999)
        return { gut: andere && spiel && grube, wohnung }
      }
      const naeher: 0 | 1 = qv(kp(g, g.laenge, 0)) >= qv(kp(g, 0, 0)) ? 1 : 0
      const reihe: (0 | 1)[] = [naeher, naeher === 1 ? 0 : 1]
      const passend = reihe.find((e) => ok(e).gut && ok(e).wohnung) ?? reihe.find((e) => ok(e).wohnung)
      if (g.laenge >= K_LAENGE + 2 && passend !== undefined) {
        kernEnde = passend
        mitKern = true
      }
      belegen(rechteckForm({ k: g, t0: -0.5, t1: g.laenge + 0.5, s0: 0, s1: mitKern ? K_S1 + 0.3 : GANG + 0.3 }))
    }
  }
  /** Laengs am Gang: x im Kern (vom aeusseren Ende) als t an der Gangkante. */
  const kt = (x: number) => (gang && kernEnde === 1 ? gang.laenge - x : x)
  const ktSpanne = (x0: number, x1: number): [number, number] => {
    const a1 = kt(x0)
    const b1 = kt(x1)
    return [Math.min(a1, b1), Math.max(a1, b1)]
  }

  /* ------------------------------------------------ Haeuser */
  const fassadeVon = (h: Haus): Color =>
    h.stil === 'weiss_loggia' ? F.putzWeiss : h.stil === 'holz' ? F.holzFassade : h.stil === 'grau' ? F.putzGrau : F.putzBeige
  const innenVon = (h: Haus): Color => (h.stil === 'weiss_loggia' ? F.loggiaGelb : h.stil === 'holz' ? F.loggiaWeiss : F.loggiaWeiss)

  /** Fenster mit hellem Rahmen, dunklem Glas, Sprosse und Bank. */
  function fenster(k: Kante, t: number, y0: number, w: number, h: number, rahmen: Color = F.rahmen): boolean {
    if (trifft(sch, k, t - w / 2, t + w / 2, -WAND, 0.1, y0 - 0.12, y0 + h + 0.08, 0.05)) return false
    kq(bauten, k, t - w / 2 - 0.06, t + w / 2 + 0.06, 0, 0.03, y0 - 0.06, y0 + h + 0.06, rahmen, null)
    kf(bauten, k, t - w / 2, t + w / 2, 0.034, y0, y0 + h, F.glasDunkel)
    if (w > 1.05) kf(bauten, k, t - 0.025, t + 0.025, 0.038, y0, y0 + h, rahmen)
    kq(bauten, k, t - w / 2 - 0.08, t + w / 2 + 0.08, 0, 0.08, y0 - 0.1, y0 - 0.06, F.bank, null)
    return true
  }

  /** Tuer mit Rahmen (Wohnungstuer am Gang, Hauseingang). */
  function tuer(k: Kante, t: number, y0: number, w: number, h: number, blatt: Color): boolean {
    if (trifft(sch, k, t - w / 2, t + w / 2, -WAND, 0.1, y0 - 0.05, y0 + h + 0.08, 0.05)) return false
    kq(bauten, k, t - w / 2 - 0.07, t + w / 2 + 0.07, 0, 0.03, y0, y0 + h + 0.07, F.rahmen, null)
    kf(bauten, k, t - w / 2, t + w / 2, 0.034, y0, y0 + h, blatt)
    return true
  }

  /** Gelaender entlang einer Kante von t0 bis t1 bei s, Boden y0: Handlauf,
   *  Fussleiste, Pfosten und Staebe (Abstand stab; 0 ohne Staebe). */
  function gelaenderLinie(p: Puffer, k: Kante, t0: number, t1: number, s: number, y0: number, f: Color, schn: Schnitt | null, hoehe = 1.0, stab = 0.16): void {
    const lang = t1 - t0
    if (lang < 0.15) return
    kq(p, k, t0, t1, s - 0.025, s + 0.025, y0 + hoehe - 0.045, y0 + hoehe, f, schn)
    if (stab > 0) kq(p, k, t0, t1, s - 0.012, s + 0.012, y0 + 0.08, y0 + 0.12, f, schn)
    const pfosten = Math.max(1, Math.ceil(lang / 1.6))
    for (let i = 0; i <= pfosten; i++) {
      const t = t0 + (lang * i) / pfosten
      kq(p, k, t - 0.025, t + 0.025, s - 0.025, s + 0.025, y0, y0 + hoehe - 0.045, f, schn)
    }
    if (stab <= 0) return
    const n = Math.max(1, Math.round(lang / stab))
    for (let i = 1; i < n; i++) {
      const t = t0 + (lang * i) / n
      kq(p, k, t - 0.009, t + 0.009, s - 0.009, s + 0.009, y0 + 0.12, y0 + hoehe - 0.045, f, schn, 0, false)
    }
  }

  /** Eine Nische (Loggia) an der Kante k, t0..t1, Tiefe d, im Geschoss g
   *  des Hauses h. offen: welche Seite zur Nachbarfassade offen ist. */
  function nische(h: Haus, k: Kante, t0: number, t1: number, d: number, g: number, offen: 'anfang' | 'ende' | null, gelaender: boolean, decke: boolean): void {
    const y = g * h.gh
    const innen = innenVon(h)
    const fassade = fassadeVon(h)
    // Rueckwand und Seitenwaende.
    kq(bauten, k, t0, t1, -d - 0.2, -d, y - 0.02, y + h.gh, innen, sch)
    if (offen !== 'anfang') kq(bauten, k, t0 - 0.2, t0, -d - 0.2, -WAND, y - 0.02, y + h.gh, innen, sch)
    if (offen !== 'ende') kq(bauten, k, t1, t1 + 0.2, -d - 0.2, -WAND, y - 0.02, y + h.gh, innen, sch)
    // Boden (Platte) und Decke darueber.
    kq(bauten, k, t0, t1, -d, 0, y - 0.3, y + GEH, fassade, sch)
    if (g === h.n - 1) kq(bauten, k, t0, t1, -d, 0, h.H - 0.3, h.H + DACH, fassade, sch)
    else if (decke) kq(bauten, k, t0, t1, -d, 0, y + h.gh - 0.3, y + h.gh + GEH, fassade, sch)
    // Eckpfeiler der offenen Ecke.
    if (offen === 'anfang') kq(bauten, k, t0, t0 + 0.35, -0.35, 0, y - 0.02, y + h.gh, fassade, sch)
    if (offen === 'ende') kq(bauten, k, t1 - 0.35, t1, -0.35, 0, y - 0.02, y + h.gh, fassade, sch)
    // Fenstertuer in der Rueckwand.
    const rk = versetzt(k, -d)
    const breit = Math.min(2.2, (t1 - t0) * 0.6)
    tuer(rk, (t0 + t1) / 2 + (offen === 'anfang' ? 0.3 : offen === 'ende' ? -0.3 : 0), y + GEH, breit, 2.25, F.glasDunkel)
    if (!gelaender) return
    const a0 = offen === 'anfang' ? t0 + 0.35 : t0
    const a1 = offen === 'ende' ? t1 - 0.35 : t1
    gelaenderLinie(bauten, k, a0, a1, -0.06, y + GEH, F.gelaender, sch)
    if (offen) {
      const qk = quer(k, offen === 'anfang' ? t0 + 0.06 : t1 - 0.06)
      // Laengs zeigt die Querkante nach aussen: von -d bis kurz vor die Ecke.
      gelaenderLinie(bauten, qk, -d, -0.35, 0, y + GEH, F.gelaender, sch)
    }
  }

  /** Vorgestellter Balkon an der Kante k um tm, im Geschoss g. */
  function balkon(h: Haus, k: Kante, tm: number, g: number): boolean {
    const y = g * h.gh
    const w = 3.0
    const d = 1.5
    if (trifft(sch, k, tm - w / 2, tm + w / 2, -WAND, d, y - 0.3, y + h.gh, 0.5)) return false
    const form = rechteckForm({ k, t0: tm - w / 2, t1: tm + w / 2, s0: 0, s1: d })
    if (haeuser.some((x) => x !== h && abstandFormen(form, x.poly) < 0.5)) return false
    kq(bauten, k, tm - w / 2, tm + w / 2, 0, d, y - 0.24, y + GEH, F.putzWeiss, null)
    gelaenderLinie(bauten, k, tm - w / 2 + 0.04, tm + w / 2 - 0.04, d - 0.05, y + GEH, F.gelaender, null)
    for (const t of [tm - w / 2 + 0.05, tm + w / 2 - 0.05]) gelaenderLinie(bauten, quer(k, t), 0.05, d - 0.05, 0, y + GEH, F.gelaender, null)
    tuer(k, tm, y + GEH, 2.2, 2.25, F.glasDunkel)
    return true
  }

  /** Begruentes Flachdach mit Photovoltaik und Lichtkuppeln. */
  function dach(h: Haus, frei0: Kasten[]): void {
    const oben = h.H + DACH
    const [x0, z0, x1, z1] = kastenVon(h.poly)
    const randAb = (p: P) => (innen(p, h.poly) ? h.kanten.reduce((m, k) => Math.min(m, abstandStrecke(p, k.a, kp(k, k.laenge, 0))), Infinity) : -1)
    /** Abstand zweier achsenparalleler Kaesten (0 bei Ueberlappung). */
    const kastenAbstand = (a1: Kasten, b1: Kasten) => Math.hypot(Math.max(0, a1[0] - b1[2], b1[0] - a1[2]), Math.max(0, a1[1] - b1[3], b1[1] - a1[3]))
    if (trifftKasten(sch, x0, z0, x1, z1, oben - 0.01, oben + 2)) return
    bauten.flaeche(h.poly, oben, h.g.dachGruen ? F.substrat : F.kies)
    const aussen: Kasten[] = [...frei0]
    // Lichtkuppeln: eine je angefangene 220 m2, hoechstens drei.
    const flaeche = Math.abs(flaecheVon(h.poly))
    const kuppeln = Math.min(3, Math.max(1, Math.round(flaeche / 220)))
    let gesetzt = 0
    for (let versuch = 0; versuch < 60 && gesetzt < kuppeln; versuch++) {
      const p: P = [x0 + (x1 - x0) * (0.2 + 0.6 * zz()), z0 + (z1 - z0) * (0.2 + 0.6 * zz())]
      const r: Kasten = [p[0] - 0.8, p[1] - 0.8, p[0] + 0.8, p[1] + 0.8]
      if (
        [
          [r[0], r[1]],
          [r[2], r[1]],
          [r[2], r[3]],
          [r[0], r[3]],
        ].some((e) => randAb(e as P) < 1.4)
      )
        continue
      if (aussen.some((b) => kastenAbstand(r, b) < 1.2)) continue
      bauten.kasten(p[0] - 0.65, oben, p[1] - 0.65, p[0] + 0.65, oben + 0.35, p[1] + 0.65, F.putzWeiss)
      bauten.kasten(p[0] - 0.55, oben + 0.35, p[1] - 0.55, p[0] + 0.55, oben + 0.45, p[1] + 0.55, F.glas)
      aussen.push(r)
      gesetzt++
    }
    if (h.g.dachGruen) {
      // Gruene Felder (1,25 m) mit Moos, Sedum und Stroh, ganz innen.
      const Z = 1.25
      const ph = [zz(), zz(), zz()].map((v) => v * Math.PI * 2)
      const ton = (p: P) => {
        const w = Math.sin(p[0] * 0.45 + ph[0]) * Math.sin(p[1] * 0.38 + ph[1]) + 0.5 * Math.sin((p[0] + p[1]) * 0.9 + ph[2])
        const c = F.moos.clone()
        if (w > 0.45) c.lerp(F.sedum, Math.min(1, (w - 0.45) * 1.4))
        else if (w < -0.6) c.lerp(F.stroh, Math.min(0.7, (-0.6 - w) * 1.2))
        return c.multiplyScalar(0.94 + 0.12 * zz())
      }
      for (let x = x0 + 0.35; x + Z <= x1 - 0.35 + EPS; x += Z) {
        for (let z = z0 + 0.35; z + Z <= z1 - 0.35 + EPS; z += Z) {
          const ecken: P[] = [
            [x, z],
            [x + Z, z],
            [x + Z, z + Z],
            [x, z + Z],
          ]
          if (ecken.some((e) => randAb(e) < 0.35)) continue
          if (aussen.some((b) => kastenAbstand([x, z, x + Z, z + Z], b) < 0.05)) continue
          const c = ton([x + Z / 2, z + Z / 2])
          bauten.dreieck(ecken[0], ecken[1], ecken[2], oben + 0.03, c, c, c)
          bauten.dreieck(ecken[0], ecken[2], ecken[3], oben + 0.03, c, c, c)
        }
      }
    }
    if (!h.g.pv) return
    // Photovoltaik in Reihen nach Sueden geneigt (15 Grad). Benachbarte
    // Module einer Reihe werden ein Streifen (Rahmen, Glas, zwei Stuetzen).
    const neig = (15 * Math.PI) / 180
    const ay: V3 = [0, Math.cos(neig), Math.sin(neig)]
    const az: V3 = [0, -Math.sin(neig), Math.cos(neig)]
    const y = oben + 0.35
    const streifen = (xa: number, xb: number, z: number) => {
      const xm = (xa + xb) / 2
      const lang = xb - xa
      bauten.quader([xm, y, z], [1, 0, 0], ay, az, lang, 0.04, 1.0, F.gelaender)
      bauten.viereck([xm, y + 0.021 * Math.cos(neig), z + 0.021 * Math.sin(neig)], [1, 0, 0], [0, -Math.sin(neig), Math.cos(neig)], lang - 0.08, 0.92, ay, F.pv)
      for (const xs1 of [xa + 0.3, xb - 0.35]) bauten.kasten(xs1, oben + 0.03, z - 0.45, xs1 + 0.05, y - 0.1, z - 0.4, F.metall)
    }
    for (let z = z0 + 1.8; z <= z1 - 1.8; z += 2.1) {
      let von: number | null = null
      let bis = 0
      for (let x = x0 + 1.7; x <= x1 - 1.7 + 1.78; x += 1.78) {
        const ok =
          x <= x1 - 1.7 &&
          ([
            [x - 0.89, z - 0.5],
            [x + 0.89, z - 0.5],
            [x + 0.89, z + 0.5],
            [x - 0.89, z + 0.5],
          ] as P[]).every((e) => randAb(e) >= 1.2) &&
          !aussen.some((b) => kastenAbstand([x - 0.89, z - 0.5, x + 0.89, z + 0.5], b) < 0.4)
        if (ok) {
          if (von === null) von = x - 0.88
          bis = x + 0.88
        } else if (von !== null) {
          streifen(von, bis, z)
          von = null
        }
      }
    }
  }

  /** Ein ganzes Haus. */
  function haus(h: Haus): void {
    const istEigen = h === eigen
    const fassade = fassadeVon(h)
    const nK = h.kanten.length
    /** Je Kante und Geschoss: wo die Wand fehlt und wo kein Fenster hin soll. */
    const luecken: [number, number][][][] = h.kanten.map(() => Array.from({ length: h.n }, () => []))
    const besetzt: [number, number][][][] = h.kanten.map(() => Array.from({ length: h.n }, () => []))
    const strassenSeite = (k: Kante) => k.n[0] * q[0] + k.n[1] * q[1]
    const gangIndex = istEigen && gang ? h.kanten.indexOf(gang) : -1

    /* Eckloggien (weiss_loggia): an den rechtwinkligen Ecken naechst der
     * Strasse, nicht am Gang. Die breite Seite (3,4 m) an der laengeren Kante. */
    const nischen: { k: number; t0: number; t1: number; d: number; offen: 'anfang' | 'ende' | null; ab: number }[] = []
    if (h.stil === 'weiss_loggia') {
      const ecken: { i: number; abstand: number }[] = []
      for (let i = 0; i < nK; i++) {
        const vor = h.kanten[(i - 1 + nK) % nK]
        const nach = h.kanten[i]
        if (i === gangIndex || (i - 1 + nK) % nK === gangIndex) continue
        if (Math.abs(vor.u[0] * nach.u[0] + vor.u[1] * nach.u[1]) > 0.17) continue
        if (vor.laenge < 7 || nach.laenge < 7) continue
        // Nur aussen liegende Ecken (Normale der Nachbarkante zeigt weg).
        if (vor.u[0] * nach.n[0] + vor.u[1] * nach.n[1] < 0) continue
        ecken.push({ i, abstand: c0 - qv(nach.a) })
      }
      ecken.sort((x, y) => x.abstand - y.abstand || x.i - y.i)
      for (const { i } of ecken.slice(0, 2)) {
        const vorI = (i - 1 + nK) % nK
        const nach = h.kanten[i]
        const vor = h.kanten[vorI]
        if (nach.laenge >= vor.laenge) nischen.push({ k: i, t0: 0, t1: 3.4, d: 2.0, offen: 'anfang', ab: 0 })
        else nischen.push({ k: vorI, t0: vor.laenge - 3.4, t1: vor.laenge, d: 2.0, offen: 'ende', ab: 0 })
      }
    }
    /* Eingeschnittene Loggien: putz an den zwei laengsten Kanten in den
     * Obergeschossen, holz eine in der Mitte der Strassenseite. */
    if (h.stil === 'putz' || h.stil === 'holz') {
      const reihe = h.kanten
        .map((k, i) => ({ k, i }))
        .filter(({ i, k }) => i !== gangIndex && k.laenge >= 14)
        .sort((x, y) => (h.stil === 'holz' ? strassenSeite(y.k) - strassenSeite(x.k) : y.k.laenge - x.k.laenge) || x.i - y.i)
      for (const { k, i } of reihe.slice(0, h.stil === 'holz' ? 1 : 2)) {
        if (h.stil === 'holz') nischen.push({ k: i, t0: k.laenge / 2 - 1.9, t1: k.laenge / 2 + 1.9, d: 1.6, offen: null, ab: 0 })
        else {
          const n = Math.max(1, Math.floor((k.laenge - 4) / 7.8))
          const abst = (k.laenge - 4) / n
          for (let j = 0; j < n; j++) {
            const tm = 2 + abst * (j + 0.5)
            nischen.push({ k: i, t0: tm - 1.6, t1: tm + 1.6, d: 1.6, offen: null, ab: 1 })
          }
        }
      }
    }
    /* Je Geschoss: Nische nur, wenn sie die Wohnung nicht beruehrt. Fehlt
     * sie darueber, bekommt sie eine eigene Decke. */
    for (const ni of nischen) {
      const k = h.kanten[ni.k]
      const da: number[] = []
      for (let g = ni.ab; g < h.n; g++) {
        const y = g * h.gh
        if (!trifft(sch, k, ni.t0 - 0.3, ni.t1 + 0.3, -ni.d - 0.3, 0.3, y - 0.3, y + h.gh, 0.3)) da.push(g)
      }
      for (const g of da) {
        luecken[ni.k][g].push([ni.t0, ni.t1])
        besetzt[ni.k][g].push([ni.t0 - 0.5, ni.t1 + 0.5])
        if (ni.offen) {
          const nb = ni.offen === 'anfang' ? (ni.k - 1 + nK) % nK : (ni.k + 1) % nK
          const L = h.kanten[nb].laenge
          const sp: [number, number] = ni.offen === 'anfang' ? [L - ni.d, L] : [0, ni.d]
          luecken[nb][g].push(sp)
          besetzt[nb][g].push([sp[0] - 0.5, sp[1] + 0.5])
        }
        nische(h, k, ni.t0, ni.t1, ni.d, g, ni.offen, g > 0, !da.includes(g + 1))
      }
    }

    /* Balkone (weiss_loggia) an der Kante, die am weitesten von der Strasse
     * weg zeigt (beim eigenen Haus gegenueber dem Gang), Terrassen im EG. */
    if (h.stil === 'weiss_loggia') {
      let bi = -1
      let bw = Infinity
      h.kanten.forEach((k, i) => {
        if (i === gangIndex || k.laenge < 8) return
        const w = gangIndex >= 0 ? k.n[1] * -1 : strassenSeite(k)
        if (w < bw - 1e-6) {
          bw = w
          bi = i
        }
      })
      if (bi >= 0) {
        const k = h.kanten[bi]
        const sperre = nischen.filter((n) => n.k === bi).map((n) => [n.t0 - 1.2, n.t1 + 1.2] as [number, number])
        // Auch Nischen der Nachbarkanten, die an dieser Kante enden.
        for (const n of nischen) {
          if (n.offen === 'anfang' && (n.k - 1 + nK) % nK === bi) sperre.push([k.laenge - n.d - 1.2, k.laenge])
          if (n.offen === 'ende' && (n.k + 1) % nK === bi) sperre.push([0, n.d + 1.2])
        }
        const stellen: number[] = []
        for (let t = 3.5; t <= k.laenge - 3.5; t += 7.0) if (!sperre.some(([a1, b1]) => t + 1.6 > a1 && t - 1.6 < b1)) stellen.push(t)
        for (const t of stellen) {
          for (let g = 1; g < h.n; g++) if (balkon(h, k, t, g)) besetzt[bi][g].push([t - 1.7, t + 1.7])
          // Terrasse vor dem Erdgeschoss.
          const form = rechteckForm({ k, t0: t - 1.6, t1: t + 1.6, s0: 0, s1: 2.4 })
          if (!trifft(sch, k, t - 1.6, t + 1.6, 0, 2.4, GEH - 0.05, 2.3, 0.3) && frei(form, 0.3, h.poly)) {
            kq(gelaende, k, t - 1.6, t + 1.6, 0, 2.4, GEH - 0.05, GEH, F.pflaster, null)
            if (tuer(k, t, GEH, 2.2, 2.25, F.glasDunkel)) besetzt[bi][0].push([t - 1.7, t + 1.7])
            belegen(form)
          }
        }
      }
    }

    /* Eingang zur Strasse (nicht beim eigenen Haus: dort ist der Kern). */
    if (!istEigen) {
      let ei = 0
      let ew = -Infinity
      h.kanten.forEach((k, i) => {
        if (k.laenge < 3.5) return
        const w = strassenSeite(k) + k.laenge * 1e-3
        if (w > ew) {
          ew = w
          ei = i
        }
      })
      const k = h.kanten[ei]
      const kandidaten = [0.5, 0.35, 0.65, 0.2, 0.8].map((f) => k.laenge * f)
      const t = kandidaten.find((x) => !besetzt[ei][0].some(([a1, b1]) => x + 1.5 > a1 && x - 1.5 < b1) && x > 1.6 && x < k.laenge - 1.6)
      if (t !== undefined && tuer(k, t, GEH, 1.8, 2.4, F.glasDunkel)) {
        besetzt[ei][0].push([t - 1.6, t + 1.6])
        if (!trifft(sch, k, t - 1.4, t + 1.4, 0, 1.4, 2.7, 2.9, 0.1)) kq(bauten, k, t - 1.4, t + 1.4, 0, 1.4, 2.72, 2.9, F.putzWeiss, null)
        // Weg vom Eingang zum Gehsteig, wenn er frei ist.
        const nq = strassenSeite(k)
        if (nq > 0.5) {
          const start = kp(k, t, 0)
          const lang = (strasseQ0 + 0.1 - qv(start)) / nq
          if (lang > 0.2 && lang < 30) {
            const form = rechteckForm({ k, t0: t - 0.8, t1: t + 0.8, s0: 0.05, s1: lang })
            const ok = haeuser.every((x) => x === h || abstandFormen(form, x.poly) >= 0.3) && (!loch || abstandFormen(form, loch) >= 0.3)
            if (ok && !trifft(sch, k, t - 0.8, t + 0.8, 0, lang, GEH - 0.05, GEH)) {
              kq(gelaende, k, t - 0.8, t + 0.8, 0, lang, GEH - 0.05, GEH, F.pflaster, null)
              belegen(form)
              eingaenge.push(form)
            }
          }
        }
      }
    }

    /* Waende je Kante und Geschoss, ohne die Luecken; darueber die Attika. */
    h.kanten.forEach((k, i) => {
      for (let g = 0; g < h.n; g++) {
        const y0 = g === 0 ? -0.35 : g * h.gh
        for (const [t0, t1] of abziehen([0, k.laenge], luecken[i][g])) kq(bauten, k, t0, t1, -WAND, 0, y0, (g + 1) * h.gh, fassade, sch)
      }
      kq(bauten, k, 0, k.laenge, -WAND, 0, h.H, h.H + ATTIKA, fassade, sch)
      kq(bauten, k, 0, k.laenge, -WAND - 0.04, 0.04, h.H + ATTIKA, h.H + ATTIKA + 0.06, F.gelaender, sch)
      // Sockel, ausser in den Luecken des Erdgeschosses.
      for (const [t0, t1] of abziehen([0, k.laenge], luecken[i][0])) kq(bauten, k, t0, t1, 0, 0.025, -0.1, 0.4, F.sockel, sch)
    })
    // Hindernis draussen: jede Kante als 30 cm starkes Rechteck.
    if (!istEigen) for (const k of h.kanten) garten.push({ k, t0: 0, t1: k.laenge, s0: -WAND, s1: 0 })

    /* Fenster. holz: weniger und breiter; am Gang des eigenen Hauses
     * kleine Kuechenfenster und je Wohnung eine Tuer. */
    const abstand = h.stil === 'holz' ? 4.0 : h.stil === 'grau' ? 3.0 : FENSTER_ABSTAND
    const [fw, fh, fy] = h.stil === 'holz' ? [1.4, 1.5, 0.85] : h.stil === 'putz' ? [1.1, 1.45, 0.9] : [1.2, 1.45, 0.9]
    h.kanten.forEach((k, i) => {
      const nutz = k.laenge - 2 * ECKE_FREI
      if (nutz < 0.9) return
      const am = i === gangIndex
      const ab = am ? FENSTER_ABSTAND : abstand
      const n = Math.floor(nutz / ab) + 1
      const start = ECKE_FREI + (nutz - (n - 1) * ab) / 2
      for (let g = 0; g < h.n; g++) {
        const y = g * h.gh
        for (let j = 0; j < n; j++) {
          const t = start + j * ab
          if (besetzt[i][g].some(([a1, b1]) => t + 0.75 > a1 && t - 0.75 < b1)) continue
          if (luecken[i][g].some(([a1, b1]) => t + 0.75 > a1 && t - 0.75 < b1)) continue
          if (am) {
            if (j % 3 === 1) tuer(k, t, y + GEH, 1.0, 2.15, F.tuer)
            else fenster(k, t, y + 1.15, 1.1, 1.05)
          } else fenster(k, t, y + fy, fw, fh, h.stil === 'holz' ? F.weiss : F.rahmen)
        }
      }
    })

    /* Holzschalung: senkrechte Leisten, etwas heller und dunkler. */
    if (h.stil === 'holz') {
      const hell = F.holzFassade.clone().multiplyScalar(1.12)
      const dunkel = F.holzFassade.clone().multiplyScalar(0.86)
      h.kanten.forEach((k, i) => {
        const n = Math.floor(k.laenge / 0.24)
        for (let j = 1; j < n; j++) {
          const t = (k.laenge * j) / n
          // Zusammenhaengende Geschosse ohne Luecke werden eine Leiste.
          let von = -1
          for (let g = 0; g <= h.n; g++) {
            const offen = g < h.n && !luecken[i][g].some(([a1, b1]) => t > a1 - 0.05 && t < b1 + 0.05)
            if (offen && von < 0) von = g
            if (!offen && von >= 0) {
              kq(bauten, k, t - 0.03, t + 0.03, 0, 0.022, von === 0 ? 0.4 : von * h.gh, g * h.gh, j % 3 === 0 ? dunkel : hell, sch)
              von = -1
            }
          }
        }
      })
    }

    /* Dach; beim eigenen Haus ohne Ueberfahrt (die steht auf dem Kern). */
    const dachFrei: Kasten[] = []
    if (!istEigen && h.n >= 4) {
      const p = innenPunkt(h.poly)
      if (!trifftKasten(sch, p[0] - 1.2, p[1] - 1.0, p[0] + 1.2, p[1] + 1.0, h.H, h.H + 2)) {
        bauten.kasten(p[0] - 1.2, h.H + DACH, p[1] - 1.0, p[0] + 1.2, h.H + 1.6, p[1] + 1.0, fassade)
        bauten.kasten(p[0] - 1.28, h.H + 1.6, p[1] - 1.08, p[0] + 1.28, h.H + 1.68, p[1] + 1.08, F.gelaender)
      }
      dachFrei.push([p[0] - 1.2, p[1] - 1.0, p[0] + 1.2, p[1] + 1.0])
    }
    dach(h, dachFrei)

    /* Eigenes Haus: Boden unter und Decke ueber dem Geschoss der Wohnung,
     * damit man durch Spalten nicht ins Leere sieht. */
    if (istEigen) {
      // 1 cm unter den Platten der Loggien, damit dort nichts flimmert.
      bauten.flaeche(h.poly, geschoss * h.gh + GEH - 0.01, F.beton, true)
      bauten.flaeche(h.poly, (geschoss + 1) * h.gh - 0.05, F.putzWeiss, false)
      if (geschoss + 1 < h.n) bauten.flaeche(h.poly, (geschoss + 1) * h.gh + GEH - 0.01, F.beton, true)
      laubengang(h)
    }
  }

  /** Ein Punkt sicher im Umriss (Schwerpunkt oder Mitte einer Zeile). */
  function innenPunkt(poly: P[]): P {
    const A = flaecheVon(poly)
    let cx = 0
    let cz = 0
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i]
      const r = poly[(i + 1) % poly.length]
      const f = p[0] * r[1] - r[0] * p[1]
      cx += (p[0] + r[0]) * f
      cz += (p[1] + r[1]) * f
    }
    const c: P = [cx / (6 * A), cz / (6 * A)]
    if (innen(c, poly)) return c
    const zs = poly.map((p) => p[1])
    const z = (Math.min(...zs) + Math.max(...zs)) / 2 + 0.013
    const xs: number[] = []
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i]
      const r = poly[(i + 1) % poly.length]
      if (p[1] > z !== r[1] > z) xs.push(p[0] + ((z - p[1]) * (r[0] - p[0])) / (r[1] - p[1]))
    }
    xs.sort((x, y) => x - y)
    let best: P = poly[0]
    let breit = -1
    for (let i = 0; i + 1 < xs.length; i += 2) {
      if (xs[i + 1] - xs[i] > breit) {
        breit = xs[i + 1] - xs[i]
        best = [(xs[i] + xs[i + 1]) / 2, z]
      }
    }
    return best
  }

  /* ------------------------------------------------ Gang, Kern, Aufzug */
  const kabine = new Puffer()
  const tueren = new Puffer()
  const blaetterKabine: Blatt[] = []
  const blaetterEtage: Blatt[][] = []
  /** Hindernisse je Geschoss des eigenen Hauses (ohne Waende und Garten). */
  const gangHindernisse: KRechteck[][] = []
  const kernHindernisse: KRechteck[] = []
  const saeulen: KRechteck[] = []
  const eingaenge: P[][] = []

  function laubengang(h: Haus): void {
    const g = gang
    if (!g) return
    const L = g.laenge
    const H = h.H
    const weiss = F.putzWeiss
    const [kt0, kt1] = mitKern ? ktSpanne(0, K_LAENGE) : [Infinity, -Infinity]
    const [vt0, vt1] = mitKern ? ktSpanne(0, K_PODEST) : [Infinity, -Infinity]
    for (let k = 0; k < h.n; k++) gangHindernisse.push([])
    /* Platten, Gelaender, Abschluesse je Obergeschoss, Dach ueber dem obersten. */
    for (let k = 1; k < h.n; k++) {
      const y = k * h.gh
      kq(bauten, g, 0, L, 0, GANG, y + GEH - PLATTE, y + GEH, weiss, sch)
      const offen = abziehen([0, L], mitKern ? [[vt0, vt1]] : [])
      for (const [t0, t1] of offen) {
        gelaenderLinie(bauten, g, t0, t1, GANG - 0.07, y + GEH, F.gelaender, sch)
        gangHindernisse[k].push({ k: g, t0, t1, s0: GANG - 0.13, s1: GANG })
      }
      for (const t of [0.04, L - 0.04]) gelaenderLinie(bauten, quer(g, t), 0, GANG - 0.1, 0, y + GEH, F.gelaender, sch)
      gangHindernisse[k].push({ k: g, t0: -0.12, t1: 0, s0: 0, s1: GANG }, { k: g, t0: L, t1: L + 0.12, s0: 0, s1: GANG })
    }
    kq(bauten, g, 0, L, 0, GANG, H - 0.05, H + DACH, weiss, sch)
    kq(bauten, g, 0, L, GANG - 0.15, GANG, H + DACH, H + 0.55, weiss, sch)
    kq(bauten, g, 0, L, GANG - 0.19, GANG + 0.04, H + 0.55, H + 0.6, F.gelaender, sch)
    /* Saeulen unter der Gangkante. */
    const n = Math.max(1, Math.ceil((L - 0.6) / 5.5))
    for (let i = 0; i <= n; i++) {
      const t = 0.3 + ((L - 0.6) * i) / n
      if (t > kt0 - 0.4 && t < kt1 + 0.4) continue
      kq(bauten, g, t - 0.11, t + 0.11, GANG - 0.24, GANG - 0.02, -0.35, H - 0.05, weiss, sch)
      saeulen.push({ k: g, t0: t - 0.11, t1: t + 0.11, s0: GANG - 0.24, s1: GANG - 0.02 })
    }
    /* Gehweg unter dem Gang im Erdgeschoss. */
    kq(gelaende, g, -0.5, L + 0.5, 0, GANG + 0.4, GEH - 0.06, GEH, F.pflaster, sch)
    if (mitKern) kern(h, g)
  }

  /** Kern: Aufzugsschacht mit Tueren, Stiegenhaus mit Laeufen, Kabine. */
  function kern(h: Haus, g: Kante): void {
    const H = h.H
    const weiss = F.putzWeiss
    const N = h.n
    /** Quader im Kern (x laengs vom aeusseren Ende, s quer, y). */
    const kk = (p: Puffer, x0: number, x1: number, s0: number, s1: number, y0: number, y1: number, f: Color, schn: Schnitt | null = sch) => {
      const [t0, t1] = ktSpanne(x0, x1)
      kq(p, g, t0, t1, s0, s1, y0, y1, f, schn)
    }
    const kr = (x0: number, x1: number, s0: number, s1: number): KRechteck => {
      const [t0, t1] = ktSpanne(x0, x1)
      return { k: g, t0, t1, s0, s1 }
    }
    /** Richtung von x im Lokalen. */
    const ex: P = kernEnde === 1 ? [-g.u[0], -g.u[1]] : [g.u[0], g.u[1]]

    /* Schacht. */
    const oben = H + 1.6
    kk(bauten, 0, K_WAND, K_S0, K_S1, -0.35, oben, weiss)
    kk(bauten, K_SCHACHT - K_WAND, K_SCHACHT, K_S0, K_S1, -0.35, oben, weiss)
    kk(bauten, 0, K_SCHACHT, K_S1 - K_WAND, K_S1, -0.35, oben, weiss)
    kk(bauten, K_WAND, K_TUER0, K_S0, K_S0 + K_WAND, -0.35, oben, weiss)
    kk(bauten, K_TUER1, K_SCHACHT - K_WAND, K_S0, K_S0 + K_WAND, -0.35, oben, weiss)
    kk(bauten, K_TUER0, K_TUER1, K_S0, K_S0 + K_WAND, -0.35, GEH, weiss)
    for (let k = 0; k < N; k++) {
      const y = k * h.gh
      kk(bauten, K_TUER0, K_TUER1, K_S0, K_S0 + K_WAND, y + K_TUER_H, k + 1 < N ? (k + 1) * h.gh + GEH : oben, weiss)
      // Zarge aus Metall um die Tuer, Platte mit Rufknopf daneben.
      kk(bauten, K_TUER0 - 0.08, K_TUER0, K_S0 - 0.03, K_S0, y + GEH, y + K_TUER_H + 0.08, F.gelaender)
      kk(bauten, K_TUER1, K_TUER1 + 0.08, K_S0 - 0.03, K_S0, y + GEH, y + K_TUER_H + 0.08, F.gelaender)
      kk(bauten, K_TUER0 - 0.08, K_TUER1 + 0.08, K_S0 - 0.03, K_S0, y + K_TUER_H, y + K_TUER_H + 0.08, F.gelaender)
      kk(bauten, 1.9, 2.04, K_S0 - 0.015, K_S0, y + 0.95, y + 1.2, F.gelaender)
      // Tuerblaetter (mittig oeffnend), je zwei; sie gleiten in die Wand.
      const blaetter: Blatt[] = []
      for (const [x0, x1, r] of [
        [K_TUER0 - 0.01, 1.16, -1],
        [1.14, K_TUER1 + 0.01, 1],
      ] as [number, number, number][]) {
        const start = tueren.ecken
        kk(tueren, x0, x1, K_S0 + 0.02, K_S0 + 0.06, y + GEH, y + K_TUER_H, F.metall, null)
        kk(tueren, x0 + 0.08, x1 - 0.08, K_S0 + 0.015, K_S0 + 0.02, y + 1.2, y + 1.9, F.glasDunkel, null)
        blaetter.push({ start, ende: tueren.ecken, richtung: [ex[0] * r, ex[1] * r], weg: 0.5 })
      }
      blaetterEtage.push(blaetter)
    }
    kk(bauten, 0, K_SCHACHT, K_S0, K_S1, oben, oben + 0.15, F.gelaender)

    /* Stiegenhaus: Rueckwand, Stirnwand, Dach, Wand zwischen den Laeufen. */
    kk(bauten, K_SCHACHT, K_LAENGE, K_S1 - K_WAND, K_S1, -0.35, H + ATTIKA, weiss)
    kk(bauten, K_LAENGE - K_WAND, K_LAENGE, K_S0, K_S1 - K_WAND, -0.35, H + ATTIKA, weiss)
    kk(bauten, K_SCHACHT, K_LAENGE - K_WAND, K_S0, K_S1 - K_WAND, H - 0.05, H + DACH, weiss)
    kk(bauten, K_SCHACHT, K_LAENGE - K_WAND, K_S0, K_S0 + 0.15, H + DACH, H + ATTIKA, weiss)
    kk(bauten, K_SCHACHT, K_LAENGE, K_S0 - 0.04, K_S1 + 0.04, H + ATTIKA, H + ATTIKA + 0.06, F.gelaender)
    kk(bauten, K_PODEST, K_LAUF, K_LAUF_A[1] + 0.02, K_LAUF_B[0] - 0.02, -0.35, H - 0.05, F.beton)
    const stufe = h.gh / 18
    for (let k = 0; k + 1 < N; k++) {
      const y = k * h.gh + GEH
      for (let j = 1; j <= 8; j++) {
        kk(bauten, K_PODEST + (j - 1) * 0.26, K_PODEST + j * 0.26, K_LAUF_A[0], K_LAUF_A[1], y + j * stufe - stufe - 0.12, y + j * stufe, F.beton)
        kk(bauten, K_LAUF - j * 0.26, K_LAUF - (j - 1) * 0.26, K_LAUF_B[0], K_LAUF_B[1], y + h.gh / 2 + j * stufe - stufe - 0.12, y + h.gh / 2 + j * stufe, F.beton)
      }
      kk(bauten, K_LAUF, K_ZWISCHEN, K_LAUF_A[0], K_LAUF_B[1], y + h.gh / 2 - 0.28, y + h.gh / 2, F.beton)
    }
    // Geschosspodeste; vor dem Treppenloch steht das Gelaender des Gangs.
    for (let k = 1; k < N; k++) kk(bauten, K_SCHACHT, K_PODEST, K_S0, K_S1 - K_WAND, k * h.gh + GEH - PLATTE, k * h.gh + GEH, weiss)
    // Pflaster unter dem Kern.
    kk(gelaende, 0, K_LAENGE, K_S0, K_S1, GEH - 0.06, GEH, F.pflaster)
    /* Grosse Fenster des Stiegenhauses: hinten und an der Stirn. */
    const hinten = versetzt(g, K_S1)
    const stirnA = kp(g, kt(K_LAENGE), K_S0)
    const stirn: Kante = { a: stirnA, u: g.n, n: ex, laenge: K_S1 - K_S0 }
    for (let k = 0; k < N; k++) {
      const y = k * h.gh
      fenster(hinten, kt((K_PODEST + K_ZWISCHEN) / 2), y + 0.7, 2.6, 1.9)
      fenster(stirn, (K_S1 - K_S0) / 2, y + 0.9, 1.4, 1.6)
    }
    /* Hindernisse des Kerns, in jedem Geschoss gleich. */
    kernHindernisse.push(
      kr(0, K_WAND, K_S0, K_S1),
      kr(K_SCHACHT - K_WAND, K_SCHACHT, K_S0, K_S1),
      kr(0, K_SCHACHT, K_S1 - K_WAND, K_S1),
      kr(0, K_TUER0, K_S0, K_S0 + K_WAND),
      kr(K_TUER1, K_SCHACHT, K_S0, K_S0 + K_WAND),
      kr(K_PODEST, K_LAENGE, K_S0, K_S1),
      kr(K_SCHACHT, K_LAENGE, K_S1 - K_WAND, K_S1),
    )

    /* Kabine: Boden, Waende, Decke mit Licht, Spiegel, Handlauf, Tafel mit
     * Knoepfen, zwei Tuerblaetter. Gebaut fuer das Erdgeschoss; das Mesh
     * faehrt mit position.y. */
    const [x0, x1, s0, s1] = KAB
    const kb = (a0: number, a1: number, b0: number, b1: number, y0: number, y1: number, f: Color) => kk(kabine, a0, a1, b0, b1, y0, y1, f, null)
    kb(x0, x1, s0, s1, GEH - 0.1, GEH, F.platte)
    kb(x0, x0 + 0.04, s0, s1, GEH, KAB_H, F.kabine)
    kb(x1 - 0.04, x1, s0, s1, GEH, KAB_H, F.kabine)
    kb(x0, x1, s1 - 0.04, s1, GEH, KAB_H, F.kabine)
    kb(x0, K_TUER0, s0, s0 + 0.04, GEH, KAB_H, F.metall)
    kb(K_TUER1, x1, s0, s0 + 0.04, GEH, KAB_H, F.metall)
    kb(K_TUER0, K_TUER1, s0, s0 + 0.04, K_TUER_H, KAB_H, F.metall)
    kb(x0, x1, s0, s1, KAB_H, KAB_H + 0.06, F.metall)
    kb(0.7, 1.6, 2.6, 3.4, KAB_H - 0.03, KAB_H, F.licht)
    kb(0.6, 1.7, s1 - 0.06, s1 - 0.04, 0.9, 2.0, F.spiegel)
    kb(0.4, 1.9, s1 - 0.15, s1 - 0.11, 0.88, 0.92, F.gelaender)
    kb(x1 - 0.055, x1 - 0.04, 2.0, 2.3, 0.75, 0.9 + N * 0.1, F.gelaender)
    for (const [a0, a1, r] of [
      [K_TUER0 - 0.01, 1.16, -1],
      [1.14, K_TUER1 + 0.01, 1],
    ] as [number, number, number][]) {
      const start = kabine.ecken
      kb(a0, a1, s0 - 0.04, s0 - 0.01, GEH, K_TUER_H, F.metall)
      blaetterKabine.push({ start, ende: kabine.ecken, richtung: [ex[0] * r, ex[1] * r], weg: 0.5 })
    }
  }

  /* ------------------------------------------------ Haeuser bauen */
  for (const h of haeuser) {
    belegen(h.poly)
  }
  for (const h of haeuser) haus(h)

  /* ------------------------------------------------ Parkplatz */
  let parkplaetze = 0
  let autos = 0
  /** Bester Platz fuer n Stellplaetze (Reihe von n * 2,5 m, 11 m tief mit
   *  Fahrgasse): frei von allem, moeglichst mittig in der Siedlung. */
  const parkplatzSuchen = (n: number): KRechteck | null => {
    const innenQ = c0 - 3
    let gefunden: KRechteck | null = null
    const lang = n * 2.5
    const tief = 11
    let beste = Infinity
    for (const laengsL of [true, false]) {
      const [lq, ll] = laengsL ? [tief, lang] : [lang, tief]
      for (let qc = qmin - 4 + lq / 2; qc + lq / 2 <= innenQ; qc += 1.5) {
        for (let lc = lmin - 4 + ll / 2; lc + ll / 2 <= lmax + 4; lc += 1.5) {
            const k: Kante = laengsL
              ? { a: [q[0] * (qc - lq / 2) + l[0] * (lc - ll / 2), q[1] * (qc - lq / 2) + l[1] * (lc - ll / 2)], u: l, n: q, laenge: lang }
              : { a: [q[0] * (qc - lq / 2) + l[0] * (lc + ll / 2), q[1] * (qc - lq / 2) + l[1] * (lc + ll / 2)], u: q, n: [-l[0], -l[1]], laenge: lang }
            const r: KRechteck = { k, t0: 0, t1: lang, s0: 0, s1: tief }
            const form = rechteckForm(r)
            const wert = Math.hypot(qc - (qmin + c0) / 2, lc - lmitte)
            if (wert >= beste) continue
            if (!frei(form, 2.5)) continue
            if (wegAbstand(form) < WEG_BREIT / 2 + 0.8) continue
            const xs = form.map((p) => p[0])
            const zs = form.map((p) => p[1])
            if (trifftKasten(sch, Math.min(...xs) - 1, Math.min(...zs) - 1, Math.max(...xs) + 1, Math.max(...zs) + 1, -1, 99)) continue
            beste = wert
            gefunden = r
          }
        }
      }
    return gefunden
  }
  {
    const gefunden = parkplatzSuchen(8) ?? parkplatzSuchen(6) ?? parkplatzSuchen(4)
    if (gefunden) {
      const r = gefunden
      const k = r.k
      parkplaetze = Math.round(r.t1 / 2.5)
      kq(gelaende, k, 0, r.t1, 0, r.s1, -0.12, -0.025, F.asphalt, sch)
      for (let i = 0; i <= parkplaetze; i++) kq(gelaende, k, i * 2.5 - 0.05, i * 2.5 + 0.05, 0.3, 5.0, -0.12, -0.02, F.weiss, sch)
      kq(gelaende, k, 0, r.t1, -0.15, 0, -0.12, 0.08, F.bord, sch)
      for (let i = 0; i < parkplaetze; i++) {
        if (zz() > 0.62) continue
        const farbe = [F.weiss, F.schwarz, F.metall, F.rot, F.blau, F.putzGrau][Math.floor(zz() * 6)]
        if (auto(quer(k, (i + 0.5) * 2.5, 2.55), farbe)) {
          garten.push({ k: quer(k, (i + 0.5) * 2.5, 2.55), t0: -2.2, t1: 2.2, s0: -0.95, s1: 0.95 })
          autos++
        }
      }
      belegen(rechteckForm(wachsen(r, 0.5)))
      // Zufahrt zur Strasse, wenn der Weg frei ist (nur bei Lage laengs der Strasse).
      if (k.u === l) {
        const qa = qv(kp(k, 0, r.s1))
        const zr: KRechteck = { k, t0: r.t1 / 2 - 2.5, t1: r.t1 / 2 + 2.5, s0: r.s1, s1: r.s1 + (strasseQ0 + 0.1 - qa) }
        const form = rechteckForm(zr)
        const ok = zr.s1 - zr.s0 > 0.5 && haeuser.every((h) => abstandFormen(form, h.poly) >= 0.5) && (!loch || abstandFormen(form, loch) >= 0.5) && (!spielPoly || abstandFormen(form, spielPoly) >= 0.5)
        if (ok) {
          kq(gelaende, k, zr.t0, zr.t1, zr.s0, zr.s1, -0.12, -0.025, F.asphalt, sch)
          belegen(form)
          eingaenge.push(form)
        }
      }
    }
  }

  /** Auto aus runden Quadern und Raedern, laengs der Kante k. */
  function auto(k: Kante, farbe: Color): boolean {
    const xs = [-2.2, 2.2].flatMap((t) => [-0.95, 0.95].map((s) => kp(k, t, s)))
    const x0 = Math.min(...xs.map((p) => p[0]))
    const x1 = Math.max(...xs.map((p) => p[0]))
    const z0 = Math.min(...xs.map((p) => p[1]))
    const z1 = Math.max(...xs.map((p) => p[1]))
    if (trifftKasten(sch, x0, z0, x1, z1, -0.1, 1.6)) return false
    const ax: V3 = [k.u[0], 0, k.u[1]]
    const az: V3 = [-k.u[1], 0, k.u[0]]
    const rq = (t: number, y: number, sx: number, sy: number, sz: number, f: Color, r: number) => {
      const c = kp(k, t, 0)
      const geo = new RoundedBoxGeometry(1, 1, 1, 1, r)
      const v = vorlageAusGeo(geo)
      bauten.form(v, achsenMatrix([c[0], y, c[1]], ax, [0, 1, 0], az, sx, sy, sz), f)
    }
    rq(0, 0.62, 4.3, 0.72, 1.78, farbe, 0.16)
    rq(-0.2, 1.22, 2.3, 0.52, 1.6, F.glasDunkel, 0.2)
    for (const t of [-1.35, 1.35]) {
      for (const s of [-0.78, 0.78]) {
        const c = kp(k, t, s)
        bauten.form(walze(), achsenMatrix([c[0], 0.32, c[1]], ax, az, [0, -1, 0], 0.32, 0.22, 0.32), F.schwarz)
      }
    }
    return true
  }

  /* ------------------------------------------------ Hecken an der Strasse */
  let hecken = 0
  {
    const q0 = strasseQ0 - 1.3
    const q1 = strasseQ0 - 0.5
    for (const h of haeuser) {
      const qs = h.poly.map(qv)
      if (Math.max(...qs) < c0 - 3.5) continue
      const ls = h.poly.map(lv)
      const lucken: [number, number][] = []
      for (const f of [...eingaenge, ...(loch ? [loch] : [])]) {
        const fl = f.map(lv)
        const fq = f.map(qv)
        if (Math.max(...fq) < q0 - 0.5 || Math.min(...fq) > q1 + 0.5) continue
        lucken.push([Math.min(...fl) - 0.8, Math.max(...fl) + 0.8])
      }
      for (const w of wege) {
        for (let i = 0; i + 1 < w.length; i++) {
          const [p1, p2] = [w[i], w[i + 1]]
          const a1 = qv(p1)
          const a2 = qv(p2)
          if (Math.max(a1, a2) < q0 - 1 || Math.min(a1, a2) > q1 + 1) continue
          const lsP = [lv(p1), lv(p2)]
          lucken.push([Math.min(...lsP) - 1.4, Math.max(...lsP) + 1.4])
        }
      }
      for (const [t0, t1] of abziehen([Math.min(...ls) + 0.5, Math.max(...ls) - 0.5], lucken)) {
        // In Stuecken bis 6 m, jedes etwas anders im Ton.
        const n = Math.max(1, Math.ceil((t1 - t0) / 6))
        for (let i = 0; i < n; i++) {
          const a1 = t0 + ((t1 - t0) * i) / n
          const b1 = t0 + ((t1 - t0) * (i + 1)) / n
          if (b1 - a1 < 1.2) continue
          const r: KRechteck = { k: sk, t0: a1 + 0.05, t1: b1 - 0.05, s0: q0, s1: q1 }
          const form = rechteckForm(r)
          if (haeuser.some((x) => abstandFormen(form, x.poly) < 0.3)) continue
          const xs = form.map((p) => p[0])
          const zs = form.map((p) => p[1])
          if (trifftKasten(sch, Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs), -0.1, 1.1)) continue
          rundTeil(gruen, sk, r, -0.05, 1.0 + zz() * 0.15, F.hecke.clone().multiplyScalar(0.92 + zz() * 0.12), 0.28, 0.3)
          garten.push(r)
          belegen(form)
          hecken++
        }
      }
    }
  }

  /** Runder Quader auf einem Rechteck an einer Kante. */
  function rundTeil(p: Puffer, k: Kante, r: KRechteck, y0: number, y1: number, f: Color, schatten: number, rund: number): void {
    const c = kp(k, (r.t0 + r.t1) / 2, (r.s0 + r.s1) / 2)
    const sx = r.t1 - r.t0
    const sz = r.s1 - r.s0
    const geo = new RoundedBoxGeometry(sx, y1 - y0, sz, 1, Math.min(rund, sx / 2 - 0.01, sz / 2 - 0.01, (y1 - y0) / 2 - 0.01))
    p.form(vorlageAusGeo(geo), achsenMatrix([c[0], (y0 + y1) / 2, c[1]], [k.u[0], 0, k.u[1]], [0, 1, 0], [-k.u[1], 0, k.u[0]], 1, 1, 1), f, schatten)
  }

  /* ------------------------------------------------ Laternen */
  {
    const qL = strasseQ0 + GEHSTEIG - 0.35
    for (let t = lmin - 6; t <= lmax + 6; t += 26) {
      const c = kp(sk, t, qL)
      const kopf = kp(sk, t, qL + 0.7)
      if (trifftKasten(sch, c[0] - 1, c[1] - 1, c[0] + 1, c[1] + 1, -0.1, 6)) continue
      gelaende.form(walze(), achsenMatrix([c[0], 2.7, c[1]], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.07, 5.4, 0.07), F.platte)
      gelaende.quader([(c[0] + kopf[0]) / 2, 5.35, (c[1] + kopf[1]) / 2], [q[0], 0, q[1]], [0, 1, 0], [-q[1], 0, q[0]], 0.9, 0.07, 0.07, F.platte)
      gelaende.quader([kopf[0], 5.28, kopf[1]], [q[0], 0, q[1]], [0, 1, 0], [-q[1], 0, q[0]], 0.55, 0.12, 0.26, F.licht)
      garten.push({ k: sk, t0: t - 0.12, t1: t + 0.12, s0: qL - 0.12, s1: qL + 0.12 })
    }
  }

  /* ------------------------------------------------ Nachbarhaeuser */
  let nachbarn = 0
  {
    const haus2 = (r: KRechteck, stock: number) => {
      const form = rechteckForm(r)
      if (!frei(form, 3) || wegAbstand(form) < 3) return
      const xs = form.map((p) => p[0])
      const zs = form.map((p) => p[1])
      if (trifftKasten(sch, Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs), -1, 99)) return
      const H = stock * 3 + 0.5
      rundTeil(bauten, r.k, r, -0.4, H, F.nachbar.clone().multiplyScalar(0.97 + zz() * 0.05), 0, 0.2)
      rundTeil(bauten, r.k, wachsen(r, 0.1), H - 0.05, H + 0.1, F.gelaender, 0, 0.05)
      garten.push(r)
      belegen(form)
      nachbarn++
    }
    // Gegenueber der Strasse.
    const q0 = strasseQ1 + 6 + zz() * 3
    let t = lmin - 8 - zz() * 6
    while (t < lmax + 6) {
      const lang = 20 + zz() * 12
      haus2({ k: sk, t0: t, t1: t + lang, s0: q0, s1: q0 + 12 + zz() * 3 }, 3 + Math.floor(zz() * 3))
      t += lang + 9 + zz() * 5
    }
    // Hinter der Siedlung.
    const qh = qmin - 16 - zz() * 4
    for (const f of [0.25, 0.72]) {
      const lang = 22 + zz() * 10
      const tm = lmin + (lmax - lmin) * f
      haus2({ k: sk, t0: tm - lang / 2, t1: tm + lang / 2, s0: qh - 13, s1: qh }, 3 + Math.floor(zz() * 2))
    }
  }

  /* ------------------------------------------------ Baeume und Buesche */
  let baeume = 0
  {
    const stamme: P[] = []
    const ziel = 26
    const x0 = bx0 - 12
    const x1 = bx1 + 12
    const z0 = bz0 - 12
    const z1 = bz1 + 12
    for (let versuch = 0; versuch < 4000 && baeume < ziel; versuch++) {
      const p: P = [x0 + zz() * (x1 - x0), z0 + zz() * (z1 - z0)]
      const r0 = 1.5 + zz() * 1.1
      const stammH = 2.0 + zz() * 1.2
      if (qv(p) > strasseQ0 - 0.6 && qv(p) < strasseQ1 + 0.6) continue
      const punktForm: P[] = [
        [p[0] - 0.3, p[1] - 0.3],
        [p[0] + 0.3, p[1] - 0.3],
        [p[0] + 0.3, p[1] + 0.3],
        [p[0] - 0.3, p[1] + 0.3],
      ]
      if (haeuser.some((h) => abstandFormen(punktForm, h.poly) < r0 + 1.2)) continue
      if (!frei(punktForm, 1.0)) continue
      if (wegAbstand(punktForm) < WEG_BREIT / 2 + 0.6) continue
      if (stamme.some((s) => Math.hypot(s[0] - p[0], s[1] - p[1]) < 4.8)) continue
      const kroneY = stammH + r0 * 0.75
      if (trifftKasten(sch, p[0] - r0 * 1.6, p[1] - r0 * 1.6, p[0] + r0 * 1.6, p[1] + r0 * 1.6, -0.1, kroneY + r0 * 1.6)) continue
      stamme.push(p)
      gruen.form(stammForm(), achsenMatrix([p[0], (kroneY - 0.05) / 2, p[1]], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.16 + zz() * 0.05, kroneY + 0.05, 0.16 + zz() * 0.05), F.stamm)
      const ton = F.laub[Math.floor(zz() * F.laub.length)].clone().multiplyScalar(0.92 + zz() * 0.14)
      gruen.form(kugelFein(), achsenMatrix([p[0], kroneY, p[1]], [1, 0, 0], [0, 1, 0], [0, 0, 1], r0, r0 * 1.05, r0), ton, 0.32)
      const neben = 2 + Math.floor(zz() * 3)
      const dreh = zz() * Math.PI * 2
      for (let i = 0; i < neben; i++) {
        const w = dreh + (i / neben) * Math.PI * 2 + (zz() - 0.5) * 0.6
        const d = r0 * (0.5 + zz() * 0.2)
        const r = r0 * (0.55 + zz() * 0.2)
        const c = ton.clone().multiplyScalar(0.92 + zz() * 0.14)
        gruen.form(kugelGrob(), achsenMatrix([p[0] + Math.cos(w) * d, kroneY + r0 * (zz() * 0.5 - 0.15), p[1] + Math.sin(w) * d], [1, 0, 0], [0, 1, 0], [0, 0, 1], r, r, r), c, 0.3)
      }
      garten.push(kastenRechteck(p[0] - 0.22, p[1] - 0.22, p[0] + 0.22, p[1] + 0.22))
      belegen(punktForm)
      baeume++
    }
    // Buesche nahe den Fassaden (nicht am Gang).
    let buesche = 0
    for (let versuch = 0; versuch < 1500 && buesche < 16; versuch++) {
      const h = haeuser[Math.floor(zz() * haeuser.length)]
      const k = h.kanten[Math.floor(zz() * h.kanten.length)]
      if (h === eigen && k === gang) continue
      if (k.laenge < 3) continue
      const p = kp(k, 1 + zz() * (k.laenge - 2), 1.3 + zz() * 1.2)
      const r = 0.45 + zz() * 0.35
      const form: P[] = [
        [p[0] - r, p[1] - r],
        [p[0] + r, p[1] - r],
        [p[0] + r, p[1] + r],
        [p[0] - r, p[1] + r],
      ]
      if (haeuser.some((x) => abstandFormen(form, x.poly) < 0.4)) continue
      if (!frei(form, 0.4, h.poly)) continue
      if (wegAbstand(form) < WEG_BREIT / 2 + 0.3) continue
      if (qv(p) > strasseQ0 - 1.4) continue
      if (trifftKasten(sch, p[0] - r, p[1] - r, p[0] + r, p[1] + r, -0.1, 1.2)) continue
      gruen.form(kugelGrob(), achsenMatrix([p[0], r * 0.55, p[1]], [1, 0, 0], [0, 1, 0], [0, 0, 1], r, r * 0.85, r), F.hecke.clone().lerp(F.laub[Math.floor(zz() * 4)], 0.25 * zz()), 0.3)
      garten.push(kastenRechteck(p[0] - r * 0.8, p[1] - r * 0.8, p[0] + r * 0.8, p[1] + r * 0.8))
      belegen(form)
      buesche++
    }
  }

  /* ------------------------------------------------ Spielgeraete */
  function spielplatz(poly: P[], kanten: Kante[]): number {
    const laengste = kanten.reduce((m, k) => (k.laenge > m.laenge ? k : m), kanten[0])
    const e = laengste.u
    const f: P = [-e[1], e[0]]
    const mitte = innenPunkt(poly)
    const us = poly.map((p) => (p[0] - mitte[0]) * e[0] + (p[1] - mitte[1]) * e[1])
    const vs = poly.map((p) => (p[0] - mitte[0]) * f[0] + (p[1] - mitte[1]) * f[1])
    const hu = (Math.max(...us) - Math.min(...us)) / 2
    const hv = (Math.max(...vs) - Math.min(...vs)) / 2
    const um = (Math.max(...us) + Math.min(...us)) / 2
    const vm = (Math.max(...vs) + Math.min(...vs)) / 2
    const gesetzt: P[][] = []
    const platz = (lang: number, breit: number, kand: [number, number][]): Kante | null => {
      for (const [fu, fv] of kand) {
        for (const s of [1, 0.75, 0.5, 0.25, 0]) {
          const c: P = [mitte[0] + e[0] * (um + fu * hu * s) + f[0] * (vm + fv * hv * s), mitte[1] + e[1] * (um + fu * hu * s) + f[1] * (vm + fv * hv * s)]
          const k: Kante = { a: c, u: e, n: f, laenge: lang }
          const form = rechteckForm({ k, t0: -lang / 2, t1: lang / 2, s0: -breit / 2, s1: breit / 2 })
          if (!form.every((p) => innen(p, poly))) continue
          if (form.some((p) => kanten.some((kk) => abstandStrecke(p, kk.a, kp(kk, kk.laenge, 0)) < 0.3))) continue
          if (gesetzt.some((g) => abstandFormen(form, g) < 0.9)) continue
          const xs = form.map((p) => p[0])
          const zs = form.map((p) => p[1])
          if (trifftKasten(sch, Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs), -0.1, 3.2)) continue
          gesetzt.push(form)
          garten.push({ k, t0: -lang / 2, t1: lang / 2, s0: -breit / 2, s1: breit / 2 })
          return k
        }
      }
      return null
    }
    let n = 0
    /** Stab (Walze) von a nach b, Radius r. */
    const stab = (a3: V3, b3: V3, r: number, farbe: Color) => {
      const d: V3 = [b3[0] - a3[0], b3[1] - a3[1], b3[2] - a3[2]]
      const [ax, ay, az] = achsenUm(d)
      bauten.form(walze(), achsenMatrix([(a3[0] + b3[0]) / 2, (a3[1] + b3[1]) / 2, (a3[2] + b3[2]) / 2], ax, ay, az, r, Math.hypot(...d), r), farbe)
    }
    const at = (k: Kante, t: number, s: number, y: number): V3 => {
      const p = kp(k, t, s)
      return [p[0], y, p[1]]
    }
    // Schaukel: zwei A-Boecke, Balken, zwei Sitze an Seilen.
    const sk1 = platz(3.8, 2.6, [
      [-0.5, 0],
      [0.5, 0],
      [0, -0.45],
      [0, 0.45],
    ])
    if (sk1) {
      for (const t of [-1.75, 1.75]) for (const s of [-1.1, 1.1]) stab(at(sk1, t, s, 0), at(sk1, t, 0, 2.3), 0.06, F.holz)
      stab(at(sk1, -1.9, 0, 2.3), at(sk1, 1.9, 0, 2.3), 0.07, F.holz)
      for (const t of [-0.75, 0.75]) {
        kq(bauten, sk1, t - 0.23, t + 0.23, -0.1, 0.1, 0.43, 0.48, F.rot, null)
        for (const dt of [-0.18, 0.18]) stab(at(sk1, t + dt, 0, 0.47), at(sk1, t + dt, 0, 2.28), 0.012, F.metall)
      }
      n++
    }
    // Spielturm mit Rutsche.
    const sk2 = platz(4.4, 2.0, [
      [0.5, 0],
      [-0.5, 0],
      [0, 0.45],
      [0, -0.45],
    ])
    if (sk2) {
      for (const t of [-2.1, -0.7]) for (const s of [-0.7, 0.7]) kq(bauten, sk2, t - 0.05, t + 0.05, s - 0.05, s + 0.05, 0, 2.65, F.holz, null)
      kq(bauten, sk2, -2.2, -0.6, -0.8, 0.8, 1.1, 1.2, F.holz, null)
      kq(bauten, sk2, -2.15, -0.65, 0.72, 0.76, 1.2, 1.85, F.gelb, null)
      kq(bauten, sk2, -2.15, -0.65, -0.76, -0.72, 1.2, 1.85, F.gelb, null)
      kq(bauten, sk2, -2.3, -0.5, -0.9, 0.9, 2.62, 2.76, F.rot, null)
      // Rutsche: schraege Bahn mit Raendern.
      const a3 = at(sk2, -0.6, 0, 1.2)
      const b3 = at(sk2, 2.1, 0, 0.22)
      const ax = normiert([b3[0] - a3[0], b3[1] - a3[1], b3[2] - a3[2]])
      let az: V3 = [sk2.n[0], 0, sk2.n[1]]
      let ay = kreuz(az, ax)
      if (ay[1] < 0) {
        az = [-az[0], 0, -az[2]]
        ay = kreuz(az, ax)
      }
      const lang = Math.hypot(b3[0] - a3[0], b3[1] - a3[1], b3[2] - a3[2])
      const m: V3 = [(a3[0] + b3[0]) / 2, (a3[1] + b3[1]) / 2, (a3[2] + b3[2]) / 2]
      bauten.quader(m, ax, ay, az, lang, 0.05, 0.5, F.blau)
      for (const s of [-0.26, 0.26]) bauten.quader([m[0] + az[0] * s + ay[0] * 0.07, m[1] + ay[1] * 0.07, m[2] + az[2] * s + ay[2] * 0.07], ax, ay, az, lang, 0.16, 0.03, F.blau)
      // Leiter.
      for (const s of [-0.3, 0.3]) stab(at(sk2, -2.45, s, 0), at(sk2, -2.2, s, 1.2), 0.03, F.holz)
      for (let j = 1; j <= 4; j++) stab(at(sk2, -2.45 + j * 0.05, -0.3, j * 0.24), at(sk2, -2.45 + j * 0.05, 0.3, j * 0.24), 0.02, F.holz)
      n++
    }
    // Sandkiste.
    const sk3 = platz(2.4, 2.4, [
      [0, 0.45],
      [0, -0.45],
      [0, 0],
      [0.3, 0.3],
    ])
    if (sk3) {
      kq(gelaende, sk3, -1.08, 1.08, -1.08, 1.08, -0.05, 0.16, F.sand.clone().multiplyScalar(1.08), null)
      for (const [t0, t1, s0, s1] of [
        [-1.2, 1.2, -1.2, -1.08],
        [-1.2, 1.2, 1.08, 1.2],
        [-1.2, -1.08, -1.08, 1.08],
        [1.08, 1.2, -1.08, 1.08],
      ]) kq(bauten, sk3, t0, t1, s0, s1, -0.05, 0.3, F.holz, null)
      n++
    }
    // Zwei Baenke am Rand, mit Blick zur Mitte.
    for (const [fu, fv] of [
      [0, -0.85],
      [0, 0.85],
    ] as [number, number][]) {
      const kb = platz(1.8, 0.7, [
        [fu, fv],
        [fu + 0.4, fv * 0.8],
        [fu - 0.4, fv * 0.8],
      ])
      if (!kb) continue
      const zur = fv > 0 ? -1 : 1
      // Sitz, Lehne (hinten, weg von der Mitte), Fuesse.
      kq(bauten, kb, -0.9, 0.9, -0.21, 0.21, 0.42, 0.47, F.holz, null)
      kq(bauten, kb, -0.9, 0.9, -zur * 0.27 - 0.03, -zur * 0.27 + 0.03, 0.55, 0.88, F.holz, null)
      for (const t of [-0.75, 0.75]) kq(bauten, kb, t - 0.03, t + 0.03, -0.25, 0.25, 0, 0.42, F.platte, null)
      n++
    }
    return n
  }

  /* ------------------------------------------------ Wiese mit Loch */
  {
    const cx = (bx0 + bx1) / 2
    const cz = (bz0 + bz1) / 2
    const halb = Math.max(bx1 - bx0, bz1 - bz0) / 2 + 50
    const Z = Math.max(ZELLE_MIN, (2 * halb) / 70)
    const ph = [zz(), zz(), zz(), zz()].map((v) => v * Math.PI * 2)
    const welle = (x: number, z: number) =>
      0.5 * Math.sin(x * 0.13 + ph[0]) * Math.sin(z * 0.11 + ph[1]) + 0.3 * Math.sin((x - z) * 0.05 + ph[2]) + 0.2 * Math.sin((x + 0.6 * z) * 0.31 + ph[3])
    const ton = (p: P) => {
      const w = welle(p[0], p[1])
      const w2 = welle(p[1] * 0.7 + 31, p[0] * 0.7 - 17)
      return F.rasen
        .clone()
        .lerp(F.trocken, 0.16 * (0.5 + 0.5 * w2))
        .multiplyScalar(1 + 0.07 * w)
    }
    // Halbebenen des Lochs (nach innen gerichtet).
    let lochEbenen: [number, number, number][] = []
    const lochR = loch ? kastenVon(loch) : null
    if (loch) {
      const lk = kantenVon(loch)
      lochEbenen = lk.map((k) => [-k.n[0], -k.n[1], -(k.n[0] * k.a[0] + k.n[1] * k.a[1])])
    }
    const n = Math.ceil((2 * halb) / Z)
    const x0 = cx - (n * Z) / 2
    const z0 = cz - (n * Z) / 2
    const fan = (poly: P[]) => {
      for (let i = 1; i + 1 < poly.length; i++) boden.dreieck(poly[0], poly[i], poly[i + 1], WIESE_Y, ton(poly[0]), ton(poly[i]), ton(poly[i + 1]))
    }
    // Farben je Gitterpunkt einmal rechnen.
    const gitter: Color[] = []
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) gitter.push(ton([x0 + i * Z, z0 + j * Z]))
    const gf = (i: number, j: number) => gitter[i * (n + 1) + j]
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const zelle: P[] = [
          [x0 + i * Z, z0 + j * Z],
          [x0 + (i + 1) * Z, z0 + j * Z],
          [x0 + (i + 1) * Z, z0 + (j + 1) * Z],
          [x0 + i * Z, z0 + (j + 1) * Z],
        ]
        const aussen =
          !loch || !lochR || zelle[1][0] <= lochR[0] || zelle[0][0] >= lochR[2] || zelle[2][1] <= lochR[1] || zelle[0][1] >= lochR[3] || abstandFormen(zelle, loch) > 0
        if (aussen) {
          boden.dreieck(zelle[0], zelle[1], zelle[2], WIESE_Y, gf(i, j), gf(i + 1, j), gf(i + 1, j + 1))
          boden.dreieck(zelle[0], zelle[2], zelle[3], WIESE_Y, gf(i, j), gf(i + 1, j + 1), gf(i, j + 1))
          continue
        }
        // Zelle ohne Loch: je Seite des Lochs das Stueck draussen.
        let rest = zelle
        for (const [nx, nz, d] of lochEbenen) {
          const draussen = halbebene(rest, -nx, -nz, -d)
          if (draussen.length >= 3 && Math.abs(flaecheVon(draussen)) > 1e-6) fan(draussen)
          rest = halbebene(rest, nx, nz, d)
          if (rest.length < 3) break
        }
      }
    }
    // Ring bis 300 m, etwas tiefer unter dem Raster.
    const rIn = halb - 1
    const ringe = [rIn]
    while (ringe[ringe.length - 1] < WIESE_R) ringe.push(Math.min(WIESE_R, ringe[ringe.length - 1] * 1.35))
    const TEILE = 64
    const punktAuf = (r: number, k: number): P => [cx + Math.cos((k / TEILE) * Math.PI * 2) * r, cz + Math.sin((k / TEILE) * Math.PI * 2) * r]
    for (let ri = 0; ri + 1 < ringe.length; ri++) {
      for (let k = 0; k < TEILE; k++) {
        const a1 = punktAuf(ringe[ri], k)
        const b1 = punktAuf(ringe[ri], k + 1)
        const c1 = punktAuf(ringe[ri + 1], k + 1)
        const d1 = punktAuf(ringe[ri + 1], k)
        boden.dreieck(a1, b1, c1, WIESE_Y - 0.01, ton(a1), ton(b1), ton(c1))
        boden.dreieck(a1, c1, d1, WIESE_Y - 0.01, ton(a1), ton(c1), ton(d1))
      }
    }
  }

  /* ------------------------------------------------ Ebenen */
  const ebenen: Ebene3D[] = []
  const nachHindernis = (h: KRechteck): Hindernis3D => {
    const m = nachWelt(kp(h.k, (h.t0 + h.t1) / 2, (h.s0 + h.s1) / 2))
    return { x: m[0], z: m[1], laenge: h.t1 - h.t0, tiefe: h.s1 - h.s0, drehY: Math.atan2(-h.k.u[1], h.k.u[0]) + rad }
  }
  /** Ohne Aussparung: auf der Ebene der Wohnung bleibt ihr Rechteck frei. */
  const rahmenFrei = sch ? sch.r : null
  const gartenListe = (wohnungsEbene: boolean): KRechteck[] => (wohnungsEbene ? garten.flatMap((h) => ohne(h, rahmenFrei)) : garten.slice())
  /** Wo die Wohnungstuer auf den Gang trifft (t an der Gangkante). */
  let tuerT: number | null = null
  if (eigen && gang && rahmenLokal) {
    const g = gang
    const ecken = ([
      [rahmenLokal[0], rahmenLokal[1]],
      [rahmenLokal[2], rahmenLokal[1]],
      [rahmenLokal[2], rahmenLokal[3]],
      [rahmenLokal[0], rahmenLokal[3]],
    ] as P[])
      .map((p) => ({ t: (p[0] - g.a[0]) * g.u[0] + (p[1] - g.a[1]) * g.u[1], s: (p[0] - g.a[0]) * g.n[0] + (p[1] - g.a[1]) * g.n[1] }))
      .sort((x, y) => y.s - x.s)
    tuerT = (ecken[0].t + ecken[1].t) / 2
  }
  if (eigen) {
    const h = eigen
    for (let k = 0; k < h.n; k++) {
      const istWohnung = k === geschoss
      const liste: KRechteck[] = []
      for (const kn of h.kanten) {
        const wand: KRechteck = { k: kn, t0: 0, t1: kn.laenge, s0: -WAND, s1: 0 }
        if (istWohnung && kn === gang && tuerT !== null) {
          for (const [t0, t1] of abziehen([0, kn.laenge], [[tuerT - TUER_LUECKE / 2, tuerT + TUER_LUECKE / 2]])) liste.push({ ...wand, t0, t1 })
        } else liste.push(wand)
      }
      liste.push(...(gangHindernisse[k] ?? []), ...kernHindernisse)
      if (k === 0) liste.push(...saeulen, ...garten)
      const fertig = istWohnung ? liste.flatMap((x) => ohne(x, rahmenFrei)) : liste
      ebenen.push({
        id: istWohnung ? 'wohnung' : `geschoss-${k}`,
        name: k === 0 ? 'EG' : `${k}. OG`,
        y: (k - geschoss) * h.gh,
        hindernisse: fertig.map(nachHindernis),
      })
    }
    ebenen.push({ id: 'garten', name: 'Garten', y: -geschoss * h.gh, hindernisse: ebenen[0].hindernisse.map((x) => ({ ...x })) })
  } else {
    ebenen.push({ id: 'garten', name: 'Garten', y: 0, hindernisse: gartenListe(!!sch).map(nachHindernis) })
  }

  /* ------------------------------------------------ Meshes */
  const welt = new MeshLambertMaterial({ vertexColors: true })
  // Die Wiese weicht in der Tiefe, so flimmert nichts, was flach auf ihr liegt.
  const bodenMat = new MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 })
  const himmelMat = new MeshBasicMaterial({ vertexColors: true, side: BackSide, fog: false, depthWrite: false })
  const knopfMat = new MeshLambertMaterial({ color: F.gelaender.clone().multiplyScalar(1.05) })
  const knopfAnMat = new MeshLambertMaterial({ color: F.licht.clone(), emissive: F.gelb.clone(), emissiveIntensity: 0.75 })
  const materialien: Material[] = [welt, bodenMat, himmelMat, knopfMat, knopfAnMat]
  const geometrien: BufferGeometry[] = []

  const gruppe = new Group()
  gruppe.name = 'siedlung'
  const lage = new Group()
  lage.name = 'siedlungLage'
  lage.rotation.y = rad
  lage.position.set(-(cs * wx + sn * wz), -absenk, -(-sn * wx + cs * wz))
  lage.updateMatrix()
  lage.matrixAutoUpdate = false
  gruppe.add(lage)

  const himmelGeo = himmelKugel(F.oben, F.unten)
  geometrien.push(himmelGeo)
  const himmelMesh = new Mesh(himmelGeo, himmelMat)
  himmelMesh.name = 'himmel'
  himmelMesh.renderOrder = -1000
  himmelMesh.frustumCulled = false
  himmelMesh.raycast = () => undefined
  himmelMesh.onBeforeRender = (_r, _s, kamera) => {
    const e = kamera.matrixWorld.elements
    himmelMesh.matrixWorld.makeTranslation(e[12], e[13], e[14])
  }
  gruppe.add(himmelMesh)

  const fest = (p: Puffer, name: string, mat: Material): Mesh | null => {
    const geo = p.bauen()
    if (!geo) return null
    geometrien.push(geo)
    const m = new Mesh(geo, mat)
    m.name = name
    m.matrixAutoUpdate = false
    lage.add(m)
    return m
  }
  fest(boden, 'boden', bodenMat)
  fest(gelaende, 'gelaende', welt)
  fest(gruen, 'gruen', welt)
  fest(bauten, 'bauten', welt)

  /* Aufzug. */
  const knoepfe: Mesh[] = []
  const rufKnoepfe: Mesh[] = []
  const fahrKnoepfe: Mesh[] = []
  let kabineMesh: Mesh | null = null
  let tuerMesh: Mesh | null = null
  let kabineWelt: [number, number, number, number] | null = null
  const az: Aufzug = { phase: 'ruhe', etage: geschoss, pos: geschoss, ziel: geschoss, von: geschoss, zeit: 0, dauer: 0, tuer: 0, halt: 0, warte: [], nachFahrt: false, ankunft: null }
  let tuerBasis: Float32Array | null = null
  let kabineBasis: Float32Array | null = null
  if (eigen && gang && mitKern) {
    const h = eigen
    const g = gang
    const ex: P = kernEnde === 1 ? [-g.u[0], -g.u[1]] : [g.u[0], g.u[1]]
    kabineMesh = fest(kabine, 'kabine', welt)
    tuerMesh = fest(tueren, 'aufzugTueren', welt)
    if (kabineMesh) {
      kabineMesh.matrixAutoUpdate = true
      kabineMesh.position.y = geschoss * h.gh
      kabineMesh.updateMatrix()
      kabineBasis = Float32Array.from(kabineMesh.geometry.getAttribute('position').array as Float32Array)
    }
    if (tuerMesh) tuerBasis = Float32Array.from(tuerMesh.geometry.getAttribute('position').array as Float32Array)
    const knopfGeo = new RoundedBoxGeometry(0.06, 0.06, 0.024, 1, 0.008)
    geometrien.push(knopfGeo)
    const drehNach = (d: P) => Math.atan2(d[0], d[1])
    for (let k = 0; k < h.n; k++) {
      const m = new Mesh(knopfGeo, knopfMat)
      const p = kp(g, kt(1.97), K_S0 - 0.027)
      m.position.set(p[0], k * h.gh + 1.075, p[1])
      m.rotation.y = drehNach(g.n)
      m.userData = { aufzug: 'ruf', ebene: k }
      m.name = `aufzugRuf${k}`
      m.updateMatrix()
      m.matrixAutoUpdate = false
      lage.add(m)
      rufKnoepfe.push(m)
      knoepfe.push(m)
    }
    if (kabineMesh) {
      for (let k = 0; k < h.n; k++) {
        const m = new Mesh(knopfGeo, knopfMat)
        const p = kp(g, kt(KAB[1] - 0.055 - 0.012), 2.15)
        m.position.set(p[0], 0.85 + k * 0.1, p[1])
        m.rotation.y = drehNach(ex)
        m.userData = { aufzug: 'fahre', ebene: k }
        m.name = `aufzugFahre${k}`
        m.updateMatrix()
        m.matrixAutoUpdate = false
        kabineMesh.add(m)
        fahrKnoepfe.push(m)
        knoepfe.push(m)
      }
    }
    // Innenraum der Kabine in Weltmetern.
    const ecken = [kp(g, kt(KAB[0] + 0.04), KAB[2] + 0.04), kp(g, kt(KAB[1] - 0.04), KAB[3] - 0.04)].map(nachWelt)
    kabineWelt = [Math.min(ecken[0][0], ecken[1][0]), Math.min(ecken[0][1], ecken[1][1]), Math.max(ecken[0][0], ecken[1][0]), Math.max(ecken[0][1], ecken[1][1])]
  }

  const blaetterSetzen = (mesh: Mesh | null, basis: Float32Array | null, blaetter: Blatt[], auf: number) => {
    if (!mesh || !basis) return
    const attr = mesh.geometry.getAttribute('position') as BufferAttribute
    const arr = attr.array as Float32Array
    for (const b of blaetter) {
      for (let v = b.start; v < b.ende; v++) {
        arr[v * 3] = basis[v * 3] + b.richtung[0] * b.weg * auf
        arr[v * 3 + 2] = basis[v * 3 + 2] + b.richtung[1] * b.weg * auf
      }
    }
    attr.needsUpdate = true
  }
  let tuerEtageGezeigt = az.etage
  const tuerenZeigen = () => {
    if (tuerEtageGezeigt !== az.etage) {
      blaetterSetzen(tuerMesh, tuerBasis, blaetterEtage[tuerEtageGezeigt] ?? [], 0)
      tuerEtageGezeigt = az.etage
    }
    blaetterSetzen(tuerMesh, tuerBasis, blaetterEtage[az.etage] ?? [], az.tuer)
    blaetterSetzen(kabineMesh, kabineBasis, blaetterKabine, az.tuer)
  }
  const leuchten = (k: number, an: boolean) => {
    for (const m of [rufKnoepfe[k], fahrKnoepfe[k]]) if (m) m.material = an ? knopfAnMat : knopfMat
  }
  const nEtagen = eigen ? eigen.n : 0
  const starten = (k: number) => {
    az.ziel = k
    az.phase = 'zu'
  }
  const anfordern = (k: number) => {
    if (!Number.isInteger(k) || k < 0 || k >= nEtagen || !kabineMesh) return
    if (az.phase !== 'fahrt' && k === az.etage) {
      if (az.phase === 'zu') {
        if (az.ziel !== az.etage) az.warte.unshift(az.ziel)
        az.phase = 'auf'
        az.nachFahrt = false
      } else if (az.phase === 'ruhe' && az.tuer < 1) {
        az.phase = 'auf'
        az.nachFahrt = false
      } else if (az.phase === 'halt') az.halt = HALTE_ZEIT
      return
    }
    if (az.warte.includes(k) || (az.phase === 'fahrt' && az.ziel === k) || (az.phase === 'zu' && az.ziel === k)) return
    leuchten(k, true)
    if (az.phase === 'ruhe') starten(k)
    else az.warte.push(k)
  }
  let weg = false
  const schritt = (dtRoh: number, _kameraY: number): boolean => {
    if (weg || !kabineMesh) return false
    const dt = Number.isFinite(dtRoh) ? Math.max(0, Math.min(0.1, dtRoh)) : 0
    if (az.phase === 'ruhe') return false
    if (az.phase === 'zu') {
      az.tuer = Math.max(0, az.tuer - dt / TUER_ZEIT)
      if (az.tuer <= 0) {
        if (az.ziel === az.etage) {
          az.phase = 'auf'
          az.nachFahrt = false
        } else {
          az.phase = 'fahrt'
          az.von = az.etage
          az.zeit = 0
          az.dauer = FAHRT_JE_GESCHOSS * Math.abs(az.ziel - az.von)
        }
      }
    } else if (az.phase === 'fahrt') {
      az.zeit += dt
      const p = Math.min(1, az.zeit / az.dauer)
      const e = p * p * (3 - 2 * p)
      az.pos = az.von + (az.ziel - az.von) * e
      if (p >= 1) {
        az.pos = az.ziel
        az.etage = az.ziel
        az.phase = 'auf'
        az.nachFahrt = true
        az.ankunft = az.ziel
        leuchten(az.ziel, false)
      }
      kabineMesh.position.y = az.pos * (eigen ? eigen.gh : 3)
    } else if (az.phase === 'auf') {
      az.tuer = Math.min(1, az.tuer + dt / TUER_ZEIT)
      if (az.tuer >= 1) {
        az.nachFahrt = false
        if (az.warte.length) {
          az.phase = 'halt'
          az.halt = HALTE_ZEIT
        } else az.phase = 'ruhe'
      }
    } else if (az.phase === 'halt') {
      az.halt -= dt
      if (az.halt <= 0) {
        const k = az.warte.shift()
        if (k === undefined) az.phase = 'ruhe'
        else starten(k)
      }
    }
    tuerenZeigen()
    return az.phase !== 'ruhe'
  }
  const fahrt = (): { ziel: number; y: number } | null => {
    if (weg || !kabineMesh || !eigen) return null
    const faehrt = az.phase === 'fahrt' || (az.phase === 'zu' && az.ziel !== az.etage) || (az.phase === 'auf' && az.nachFahrt)
    return faehrt ? { ziel: az.ziel, y: (az.pos - geschoss) * eigen.gh } : null
  }
  const interaktiv: Interaktiv3D | null = knoepfe.length
    ? {
        objekte: knoepfe as Object3D[],
        tippen(o3: Object3D) {
          if (weg) return
          const d = o3.userData as { aufzug?: string; ebene?: number }
          if ((d.aufzug === 'ruf' || d.aufzug === 'fahre') && typeof d.ebene === 'number') anfordern(d.ebene)
        },
      }
    : null

  gruppe.userData = {
    baeume,
    hecken,
    parkplaetze,
    autos,
    nachbarn,
    spielgeraete,
    strasse: seite.name,
    kern: !!kabineMesh,
  }

  const ergebnis: Welt3D & { fahrt(): { ziel: number; y: number } | null; kabine: [number, number, number, number] | null } = {
    gruppe,
    nebel: new Fog(o.farben.himmelUnten, NEBEL_NAH, NEBEL_FERN),
    himmel: o.farben.himmelUnten,
    ebenen,
    interaktiv,
    schritt,
    fahrt,
    kabine: kabineWelt,
    dispose() {
      if (weg) return
      weg = true
      himmelMesh.onBeforeRender = () => undefined
      for (const g of geometrien) g.dispose()
      for (const m of materialien) m.dispose()
      kabineMesh?.clear()
      lage.clear()
      gruppe.clear()
      ANKUENFTE.delete(ergebnis)
    },
  }
  ANKUENFTE.set(ergebnis, () => {
    const a1 = az.ankunft
    az.ankunft = null
    return a1
  })
  return ergebnis
}

/** Kleinste Kantenlaenge der Wiesenzellen (Meter). */
const ZELLE_MIN = 2.5

/** Vorlage aus einer einzelnen Geometrie (wird danach freigegeben). */
function vorlageAusGeo(geo: BufferGeometry): Vorlage {
  const g = geo.index ? geo.toNonIndexed() : geo
  if (g !== geo) geo.dispose()
  const lage = g.getAttribute('position').array as Float32Array
  const richtung = g.getAttribute('normal').array as Float32Array
  let y0 = Infinity
  let y1 = -Infinity
  for (let i = 1; i < lage.length; i += 3) {
    y0 = Math.min(y0, lage[i])
    y1 = Math.max(y1, lage[i])
  }
  const v = { lage: Float32Array.from(lage), richtung: Float32Array.from(richtung), y0, y1 }
  g.dispose()
  return v
}

/** Grenzen eines Vielecks als Kasten (x0, z0, x1, z1). */
function kastenVon(poly: P[]): [number, number, number, number] {
  const xs = poly.map((p) => p[0])
  const zs = poly.map((p) => p[1])
  return [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)]
}

/** Himmelskugel: Farbe nach der Hoehe, am Horizont schnell heller. */
function himmelKugel(oben: Color, unten: Color): BufferGeometry {
  const g = new SphereGeometry(HIMMEL_R, 32, 24)
  g.deleteAttribute('uv')
  g.deleteAttribute('normal')
  const pos = g.getAttribute('position')
  const col = new Float32Array(pos.count * 3)
  const c = new Color()
  for (let i = 0; i < pos.count; i++) {
    const t = Math.max(0, pos.getY(i) / HIMMEL_R)
    c.copy(unten).lerp(oben, 1 - (1 - t) ** 2.4)
    col[i * 3] = c.r
    col[i * 3 + 1] = c.g
    col[i * 3 + 2] = c.b
  }
  g.setAttribute('color', new BufferAttribute(col, 3))
  return g
}
