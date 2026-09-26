/* Geometrie des Grundrisses.
 *
 * Spiegel von supabase/migrations/0028_grundriss_modell.sql, Abschnitte 3
 * bis 8, und 0033 (Ueberstand im Fach). Jede Aenderung an einer Regel in beiden Dateien und im Testfall
 * (scripts/geometrie-pruefen.mjs).
 *
 * Die Datenbank entscheidet. Der Browser rechnet hier nur vor: Vorschau,
 * Warnung, Auswahl. Lehnt die Datenbank ab, zeigt die Oberflaeche ihren
 * uebersetzten Satz und laedt neu.
 *
 * Diese Datei hat keine Importe und nur loeschbare TypeScript-Syntax (kein
 * enum, kein namespace), damit Node sie fuer die Pruefung direkt ausfuehren
 * kann. Alle Entscheidungen rechnen ganzzahlig in cm; die groessten Produkte
 * (50000 mal 100000) liegen weit unter 2^53, JS rechnet also exakt. Keine
 * Wurzel in einer Entscheidung, nur in Anzeige und Zeichnung.
 *
 * Einheiten: ganze cm, Ursprung links oben, x nach rechts, y nach unten
 * (Draufsicht), z nach oben ab Boden. Punkt i steht in u[2i], u[2i+1].
 * Kante k laeuft von Punkt k zu Punkt (k+1) % n.
 */

/* ================================================================ Typen */

export type Punkt = [number, number]
/** Flach [x0,y0,x1,y1,...] wie in der Datenbank. */
export type Umriss = number[]
export interface Rechteck {
  x0: number
  y0: number
  x1: number
  y1: number
}
export type Drehung = 0 | 90 | 180 | 270
export type Ecke = 'lo' | 'ro' | 'ru' | 'lu'
export type PolygonFehler = 'punkte' | 'bereich' | 'doppelt' | 'kreuzt' | 'umlauf'

/** Teilmenge von Objekt (types.ts): alles, was die Geometrie braucht. */
export interface ObjektForm {
  x: number
  y: number
  breite_cm: number
  tiefe_cm: number
  hoehe_cm: number
  drehung: Drehung
  form: 'rechteck' | 'l'
  ausschnitt_breite_cm: number | null
  ausschnitt_tiefe_cm: number | null
  ausschnitt_ecke: Ecke | null
  brett_cm: number[] | null
  spalten: number
}

/* Was kisteBasis, platzFehler und unterlagenAn von einem Grundriss
 * brauchen. GrundrissDaten aus types.ts passt darauf; hier steht nur die
 * Form, damit diese Datei ohne Importe bleibt. */
export type UnterlageArtGeo = 'boden' | 'kiste' | 'objekt' | 'fach'

export interface GeoRaum {
  id: string
  punkte: Punkt[]
  hoehe_cm: number
}

export interface GeoObjekt extends ObjektForm {
  id: string
  raum_id: string
  art: 'moebel' | 'regal' | 'schrank'
  name: string
}

export interface GeoKiste {
  id: string
  code: string
  platz_raum_id: string | null
  platz_x: number
  platz_y: number
  platz_drehung: 0 | 90
  unterlage_art: UnterlageArtGeo
  unterlage_item_id: string | null
  unterlage_objekt_id: string | null
  fach_ebene: number | null
  fach_spalte: number | null
  laenge_cm: number
  breite_cm: number
  hoehe_cm: number
}

/** Kiste im fertigen Plan: grundriss_laden liefert Unterkante und Grenze. */
export interface GeoPlanKiste extends GeoKiste {
  oben_cm: number
  grenze_cm: number
}

export interface GeoDaten {
  raeume: GeoRaum[]
  objekte: GeoObjekt[]
  kisten: GeoKiste[]
}

/** Ablehnung wie in der Datenbank: Kennung fuer fehler.db.grundriss.<kennung>
 *  und die Platzhalter dazu. */
export interface GeoFehler {
  kennung: string
  werte: Record<string, string | number>
}

/* ======================================================= Umriss, Punkte */

export function zuPunkten(u: Umriss): Punkt[] {
  const out: Punkt[] = []
  for (let i = 0; i + 1 < u.length; i += 2) out.push([u[i], u[i + 1]])
  return out
}

export function zuUmriss(p: Punkt[]): Umriss {
  const out: Umriss = []
  for (const [x, y] of p) out.push(x, y)
  return out
}

/* ============================================ Spiegel der SQL-Funktionen */

/** Doppelte vorzeichenbehaftete Flaeche. > 0 heisst: im Uhrzeigersinn am
 *  Bildschirm (y nach unten). geo_flaeche2 */
export function flaeche2(u: Umriss): number {
  const n = Math.floor(u.length / 2)
  let s = 0
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    s += u[2 * i] * u[2 * j + 1] - u[2 * j] * u[2 * i + 1]
  }
  return s
}

function zwischen(v: number, a: number, b: number): boolean {
  return v >= Math.min(a, b) && v <= Math.max(a, b)
}

/** Beruehren oder schneiden sich zwei geschlossene Strecken?
 *  geo_strecken_schneiden */
export function streckenSchneiden(p1: Punkt, p2: Punkt, q1: Punkt, q2: Punkt): boolean {
  const [p1x, p1y] = p1
  const [p2x, p2y] = p2
  const [q1x, q1y] = q1
  const [q2x, q2y] = q2
  const d1 = Math.sign((q2x - q1x) * (p1y - q1y) - (q2y - q1y) * (p1x - q1x))
  const d2 = Math.sign((q2x - q1x) * (p2y - q1y) - (q2y - q1y) * (p2x - q1x))
  const d3 = Math.sign((p2x - p1x) * (q1y - p1y) - (p2y - p1y) * (q1x - p1x))
  const d4 = Math.sign((p2x - p1x) * (q2y - p1y) - (p2y - p1y) * (q2x - p1x))
  if (d1 * d2 < 0 && d3 * d4 < 0) return true
  if (d1 === 0 && zwischen(p1x, q1x, q2x) && zwischen(p1y, q1y, q2y)) return true
  if (d2 === 0 && zwischen(p2x, q1x, q2x) && zwischen(p2y, q1y, q2y)) return true
  if (d3 === 0 && zwischen(q1x, p1x, p2x) && zwischen(q1y, p1y, p2y)) return true
  if (d4 === 0 && zwischen(q2x, p1x, p2x) && zwischen(q2y, p1y, p2y)) return true
  return false
}

/** null = gueltig, sonst die erste verletzte Regel in derselben
 *  Reihenfolge wie geo_polygon_fehler. */
export function polygonFehler(u: Umriss): PolygonFehler | null {
  if (!Array.isArray(u) || u.length % 2 !== 0 || u.length < 6 || u.length > 400) return 'punkte'
  const n = u.length / 2
  for (const v of u) {
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 50000) return 'bereich'
  }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    if (u[2 * i] === u[2 * j] && u[2 * i + 1] === u[2 * j + 1]) return 'doppelt'
  }
  // Zwei Nachbarkanten duerfen nicht aufeinander zuruecklaufen.
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    const k = (i + 2) % n
    const x1 = u[2 * i]
    const y1 = u[2 * i + 1]
    const x2 = u[2 * j]
    const y2 = u[2 * j + 1]
    const x3 = u[2 * k]
    const y3 = u[2 * k + 1]
    if (
      (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1) === 0 &&
      (x2 - x1) * (x3 - x2) + (y2 - y1) * (y3 - y2) < 0
    ) {
      return 'kreuzt'
    }
  }
  // Nicht benachbarte Kanten beruehren sich nicht.
  const p = zuPunkten(u)
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (j === i + 1 || (i === 0 && j === n - 1)) continue
      if (streckenSchneiden(p[i], p[(i + 1) % n], p[j], p[(j + 1) % n])) return 'kreuzt'
    }
  }
  if (flaeche2(u) <= 0) return 'umlauf'
  return null
}

/** 1 innen, 0 auf dem Rand, -1 aussen. f skaliert das Polygon (f = 2 fuer
 *  halbe cm). Strahl nach +x, halboffene Regel. geo_punkt_lage */
export function punktLage(u: Umriss, x: number, y: number, f = 1): 1 | 0 | -1 {
  const n = Math.floor(u.length / 2)
  let drin = false
  for (let i = 0; i < n; i++) {
    const j = (i + n - 1) % n
    const xi = f * u[2 * i]
    const yi = f * u[2 * i + 1]
    const xj = f * u[2 * j]
    const yj = f * u[2 * j + 1]
    if ((xj - xi) * (y - yi) === (yj - yi) * (x - xi) && zwischen(x, xi, xj) && zwischen(y, yi, yj)) {
      return 0
    }
    if (yi > y !== yj > y) {
      const k = (xj - xi) * (y - yi) - (x - xi) * (yj - yi)
      if (k > 0 === yj > yi) drin = !drin
    }
  }
  return drin ? 1 : -1
}

/** Rand zaehlt als drinnen. geo_punkt_im_polygon */
export function punktImPolygon(u: Umriss, x: number, y: number): boolean {
  return punktLage(u, x, y, 1) >= 0
}

/** Trifft die Strecke das OFFENE Rechteck? Beruehren zaehlt nicht.
 *  geo_strecke_trifft_offen */
export function streckeTrifftOffen(a: Punkt, b: Punkt, r: Rechteck): boolean {
  const [sx1, sy1] = a
  const [sx2, sy2] = b
  const seite = (rx: number, ry: number) =>
    Math.sign((sx2 - sx1) * (ry - sy1) - (sy2 - sy1) * (rx - sx1))
  const s1 = seite(r.x0, r.y0)
  const s2 = seite(r.x1, r.y0)
  const s3 = seite(r.x1, r.y1)
  const s4 = seite(r.x0, r.y1)
  return !(
    Math.max(sx1, sx2) <= r.x0 ||
    Math.min(sx1, sx2) >= r.x1 ||
    Math.max(sy1, sy2) <= r.y0 ||
    Math.min(sy1, sy2) >= r.y1 ||
    Math.min(s1, s2, s3, s4) >= 0 ||
    Math.max(s1, s2, s3, s4) <= 0
  )
}

/** Liegt das Rechteck ganz im Polygon (Beruehren der Wand erlaubt)? Mitte
 *  echt innen UND keine Kante im offenen Rechteck. geo_rechteck_im_polygon */
export function rechteckImPolygon(u: Umriss, r: Rechteck): boolean {
  if (r.x0 >= r.x1 || r.y0 >= r.y1) return false
  if (punktLage(u, r.x0 + r.x1, r.y0 + r.y1, 2) !== 1) return false
  const n = Math.floor(u.length / 2)
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    if (streckeTrifftOffen([u[2 * i], u[2 * i + 1]], [u[2 * j], u[2 * j + 1]], r)) return false
  }
  return true
}

/** Laenge von Kante k im Quadrat, ganzzahlig. geo_kante_laenge2 */
export function kanteLaenge2(u: Umriss, k: number): number {
  const n = Math.floor(u.length / 2)
  const j = (k + 1) % n
  const dx = u[2 * j] - u[2 * k]
  const dy = u[2 * j + 1] - u[2 * k + 1]
  return dx * dx + dy * dy
}

/* ================================================================ Kisten */

/** Liegt Punkt (x,y) ueber der Grundflaeche einer Kiste mit Mitte (ux,uy)?
 *  Rand zaehlt. kiste_traegt */
export function kisteTraegt(
  u: { x: number; y: number; drehung: number; laenge: number; breite: number },
  x: number,
  y: number,
): boolean {
  const ex = u.drehung === 90 ? u.breite : u.laenge
  const ey = u.drehung === 90 ? u.laenge : u.breite
  return Math.abs(2 * (x - u.x)) <= ex && Math.abs(2 * (y - u.y)) <= ey
}

/* =============================================================== Objekte */

type Lage = Pick<ObjektForm, 'x' | 'y' | 'drehung'>

/** Grundriss-cm in lokale cm des Objekts. objekt_lokal */
export function objektLokal(o: Lage, x: number, y: number): Punkt {
  const dx = x - o.x
  const dy = y - o.y
  switch (o.drehung) {
    case 0:
      return [dx, dy]
    case 90:
      return [dy, -dx]
    case 180:
      return [-dx, -dy]
    default:
      return [-dy, dx]
  }
}

/** Lokale cm des Objekts in Grundriss-cm. objekt_global */
export function objektGlobal(o: Lage, lx: number, ly: number): Punkt {
  switch (o.drehung) {
    case 0:
      return [o.x + lx, o.y + ly]
    case 90:
      return [o.x - ly, o.y + lx]
    case 180:
      return [o.x - lx, o.y - ly]
    default:
      return [o.x + ly, o.y - lx]
  }
}

/** Punkt in der Objektflaeche (Rand zaehlt, echtes Inneres des
 *  L-Ausschnitts nicht). objekt_enthaelt */
export function objektEnthaelt(o: ObjektForm, x: number, y: number): boolean {
  const [lx, ly] = objektLokal(o, x, y)
  if (lx < 0 || lx > o.breite_cm || ly < 0 || ly > o.tiefe_cm) return false
  if (o.form !== 'l') return true
  const aw = o.ausschnitt_breite_cm ?? 0
  const ad = o.ausschnitt_tiefe_cm ?? 0
  let imAusschnitt: boolean
  switch (o.ausschnitt_ecke) {
    case 'lo':
      imAusschnitt = lx < aw && ly < ad
      break
    case 'ro':
      imAusschnitt = lx > o.breite_cm - aw && ly < ad
      break
    case 'ru':
      imAusschnitt = lx > o.breite_cm - aw && ly > o.tiefe_cm - ad
      break
    default:
      imAusschnitt = lx < aw && ly > o.tiefe_cm - ad
  }
  return !imAusschnitt
}

/** Punkt in Spalte s eines Regals oder Schranks (und innerhalb der Tiefe).
 *  Teiler 2 cm. objekt_im_fach */
export function objektImFach(
  o: Pick<ObjektForm, 'x' | 'y' | 'drehung' | 'breite_cm' | 'tiefe_cm' | 'spalten'>,
  spalte: number,
  x: number,
  y: number,
): boolean {
  const [lx, ly] = objektLokal(o, x, y)
  const s = o.spalten
  return (
    ly >= 0 &&
    ly <= o.tiefe_cm &&
    s * lx >= (spalte - 1) * (o.breite_cm + 2) &&
    s * lx <= spalte * (o.breite_cm + 2) - 2 * s
  )
}

/** Wie weit eine Kiste hoechstens in der Tiefe aus einem Fach ragen darf
 *  (0033). ueberstand_max_cm */
export const UEBERSTAND_MAX_CM = 40

/** Doppelter Ueberstand (ganzzahlig, halbe cm moeglich) einer Kiste mit
 *  Mitte (x,y) in der Tiefe des Objekts (lokal y), vorne oder hinten, der
 *  groessere. Ausdehnung in Objekt-Tiefe: Breite, wenn Kiste 0 und Objekt
 *  0/180 oder Kiste 90 und Objekt 90/270, sonst Laenge.
 *  kiste_ueberstand2 */
export function kisteUeberstand2(
  o: Pick<ObjektForm, 'x' | 'y' | 'drehung' | 'tiefe_cm'>,
  x: number,
  y: number,
  kiste: { drehung: number; laenge: number; breite: number },
): number {
  const [, ly] = objektLokal(o, x, y)
  const gleich = (o.drehung === 0 || o.drehung === 180) === (kiste.drehung !== 90)
  const t = gleich ? kiste.breite : kiste.laenge
  return Math.max(0, t - 2 * ly, 2 * ly + t - 2 * o.tiefe_cm)
}

/** Ueberstand in ganzen cm, aufgerundet (wie kiste_ueberstand_cm). */
export function ueberstandCm(ueberstand2: number): number {
  return Math.floor((ueberstand2 + 1) / 2)
}

/** Bis wohin Ebene e (1 = unten) reicht: Unterkante des naechsten Bretts
 *  (2 cm), oben 2 cm Deckel. fach_decke */
export function fachDecke(o: Pick<ObjektForm, 'brett_cm' | 'hoehe_cm'>, ebene: number): number {
  const b = o.brett_cm ?? []
  return ebene < b.length ? b[ebene] - 2 : o.hoehe_cm - 2
}

/** 1 bis 30 Bretter, erstes >= 0, Abstand >= 3, oben >= 3 Platz.
 *  faecher_gueltig */
export function faecherGueltig(brett: number[] | null, hoehe: number): boolean {
  const n = brett?.length ?? 0
  if (!brett || n < 1 || n > 30 || !Number.isFinite(brett[0]) || brett[0] < 0) return false
  for (let i = 1; i < n; i++) {
    if (!Number.isFinite(brett[i]) || brett[i] - brett[i - 1] < 3) return false
  }
  return hoehe - brett[n - 1] >= 3
}

/** Die Flaeche als achsparallele Rechtecke in Grundriss-cm (1 bei
 *  Rechteck, 2 bei L). objekt_rechtecke */
export function objektRechtecke(o: ObjektForm): Rechteck[] {
  const aw = o.ausschnitt_breite_cm ?? 0
  const ad = o.ausschnitt_tiefe_cm ?? 0
  const bw = o.breite_cm
  const bd = o.tiefe_cm
  let lokal: [number, number, number, number][]
  if (o.form !== 'l') {
    lokal = [[0, 0, bw, bd]]
  } else {
    switch (o.ausschnitt_ecke) {
      case 'lo':
        lokal = [
          [aw, 0, bw, ad],
          [0, ad, bw, bd],
        ]
        break
      case 'ro':
        lokal = [
          [0, 0, bw - aw, ad],
          [0, ad, bw, bd],
        ]
        break
      case 'ru':
        lokal = [
          [0, 0, bw, bd - ad],
          [0, bd - ad, bw - aw, bd],
        ]
        break
      case 'lu':
        lokal = [
          [0, 0, bw, bd - ad],
          [aw, bd - ad, bw, bd],
        ]
        break
      default:
        lokal = []
    }
  }
  return lokal.map(([a, b, c, d]) => {
    const [px, py] = objektGlobal(o, a, b)
    const [qx, qy] = objektGlobal(o, c, d)
    return { x0: Math.min(px, qx), y0: Math.min(py, qy), x1: Math.max(px, qx), y1: Math.max(py, qy) }
  })
}

/* ======================================================= Hoehe, Platz */

export interface KistenBasis {
  unten_cm: number
  grenze_cm: number
  wurzel_art: 'boden' | 'objekt' | 'fach'
  wurzel_objekt: string | null
  /** Zahl der Kisten darunter. */
  tiefe: number
}

/** Unterkante und Grenze einer Kiste: die Kette abwaerts bis zur untersten
 *  Unterlage. null, wenn sie keinen Platz hat oder die Kette reisst.
 *  kiste_basis */
export function kisteBasis(k: GeoKiste, daten: GeoDaten): KistenBasis | null {
  if (!k.platz_raum_id) return null
  let r: GeoKiste = k
  let unten = 0
  let tiefe = 0
  for (let i = 1; i <= 60; i++) {
    if (r.unterlage_art === 'kiste') {
      const u = daten.kisten.find((c) => c.id === r.unterlage_item_id)
      if (!u || !u.platz_raum_id) return null
      unten += u.hoehe_cm
      tiefe += 1
      r = u
      continue
    }
    const raum = daten.raeume.find((x) => x.id === r.platz_raum_id)
    if (r.unterlage_art === 'boden') {
      if (!raum) return null
      return { unten_cm: unten, grenze_cm: raum.hoehe_cm, wurzel_art: 'boden', wurzel_objekt: null, tiefe }
    }
    const o = daten.objekte.find((x) => x.id === r.unterlage_objekt_id)
    if (!o) return null
    if (r.unterlage_art === 'objekt') {
      if (!raum) return null
      return {
        unten_cm: unten + o.hoehe_cm,
        grenze_cm: raum.hoehe_cm,
        wurzel_art: 'objekt',
        wurzel_objekt: o.id,
        tiefe,
      }
    }
    const e = r.fach_ebene ?? 0
    const brett = o.brett_cm?.[e - 1]
    if (brett === undefined) return null
    return {
      unten_cm: unten + brett,
      grenze_cm: fachDecke(o, e),
      wurzel_art: 'fach',
      wurzel_objekt: o.id,
      tiefe,
    }
  }
  return null // nie: Kreise lehnt platz_fehler ab
}

function fehler(kennung: string, werte: Record<string, string | number>): GeoFehler {
  return { kennung, werte }
}

/** Alle Regeln fuer den Platz einer Kiste, gleiche Kennungen und gleiche
 *  Reihenfolge wie platz_fehler (ohne Baum). k ist die Kiste, wie sie
 *  werden soll. null = passt. */
export function platzFehler(k: GeoKiste & { kind?: string }, daten: GeoDaten): GeoFehler | null {
  if (!k.platz_raum_id) return null
  const code = k.code
  if (k.kind === 'furniture') return fehler('moebel_kein_platz', { code })
  const r = daten.raeume.find((x) => x.id === k.platz_raum_id)
  if (!r) return fehler('raum_fehlt', { code })
  if (!punktImPolygon(zuUmriss(r.punkte), k.platz_x, k.platz_y)) return fehler('draussen', { code })

  let unten: number
  let grenze: number
  if (k.unterlage_art === 'boden') {
    unten = 0
    grenze = r.hoehe_cm
  } else if (k.unterlage_art === 'kiste') {
    const u = daten.kisten.find((c) => c.id === k.unterlage_item_id)
    if (!u || u.id === k.id || !u.platz_raum_id) return fehler('unterlage_fehlt', { code })
    if (u.platz_raum_id !== k.platz_raum_id) return fehler('unterlage_anderer_raum', { code })
    // Kein Kreis in "liegt auf".
    let v = u.unterlage_item_id
    let i = 0
    while (v) {
      i++
      if (v === k.id || i > 60) return fehler('kreis', { code, unter: u.code })
      v = daten.kisten.find((c) => c.id === v)?.unterlage_item_id ?? null
    }
    const traegt = kisteTraegt(
      { x: u.platz_x, y: u.platz_y, drehung: u.platz_drehung, laenge: u.laenge_cm, breite: u.breite_cm },
      k.platz_x,
      k.platz_y,
    )
    if (!traegt) return fehler('nicht_darauf', { code, unter: u.code })
    const b = kisteBasis(u, daten)
    if (!b) return fehler('unterlage_fehlt', { code })
    unten = b.unten_cm + u.hoehe_cm
    grenze = b.grenze_cm
  } else {
    const o = daten.objekte.find((x) => x.id === k.unterlage_objekt_id)
    if (!o) return fehler('unterlage_fehlt', { code })
    if (o.raum_id !== k.platz_raum_id) return fehler('unterlage_anderer_raum', { code })
    if (k.unterlage_art === 'objekt') {
      if (!objektEnthaelt(o, k.platz_x, k.platz_y)) {
        return fehler('nicht_darauf_objekt', { code, name: o.name, art: o.art })
      }
      unten = o.hoehe_cm
      grenze = r.hoehe_cm
    } else {
      if (o.art === 'moebel') return fehler('kein_regal', { code, name: o.name })
      const ebene = k.fach_ebene ?? 0
      const spalte = k.fach_spalte ?? 0
      const brett = o.brett_cm ?? []
      if (ebene < 1 || spalte < 1 || ebene > brett.length || spalte > o.spalten) {
        return fehler('fach_fehlt', { code, name: o.name, ebene, spalte })
      }
      if (!objektImFach(o, spalte, k.platz_x, k.platz_y)) {
        return fehler('nicht_im_fach', { code, name: o.name, ebene, spalte })
      }
      const u2 = kisteUeberstand2(o, k.platz_x, k.platz_y, {
        drehung: k.platz_drehung,
        laenge: k.laenge_cm,
        breite: k.breite_cm,
      })
      if (u2 > 2 * UEBERSTAND_MAX_CM) {
        return fehler('ueberstand_zu_gross', { code, name: o.name, cm: ueberstandCm(u2), max: UEBERSTAND_MAX_CM })
      }
      unten = brett[ebene - 1]
      grenze = fachDecke(o, ebene)
    }
  }
  const oben = unten + k.hoehe_cm
  if (oben > grenze) return fehler('zu_hoch', { code, oben, grenze })
  return null
}

/* ======================================================= Nur im Browser */

/** Gegen den Uhrzeigersinn gezeichnete Punkte umkehren ([p0, p(n-1), ...,
 *  p1]). Alte Kante i wird neue Kante n-1-i, der Abstand einer Oeffnung
 *  wird laenge - abstand - breite. Der Zeichner ruft das vor jedem
 *  Speichern. */
export function umlaufRichten(p: Punkt[]): {
  punkte: Punkt[]
  kante: (alt: number) => number
  abstand: (alt: number, laenge: number, abstand: number, breite: number) => number
} {
  const n = p.length
  if (n < 3 || flaeche2(zuUmriss(p)) > 0) {
    return {
      punkte: p.slice(),
      kante: (alt) => alt,
      abstand: (_alt, _laenge, abstand) => abstand,
    }
  }
  const punkte: Punkt[] = [p[0]]
  for (let i = n - 1; i >= 1; i--) punkte.push(p[i])
  return {
    punkte,
    kante: (alt) => n - 1 - alt,
    abstand: (_alt, laenge, abstand, breite) => Math.max(0, Math.round(laenge) - abstand - breite),
  }
}

/** Laenge von Kante k als Kommazahl. Nur Anzeige und Umrechnung. */
export function kanteLaenge(u: Umriss, k: number): number {
  return Math.sqrt(kanteLaenge2(u, k))
}

/** Einheitsvektor entlang Kante k. */
export function kanteRichtung(u: Umriss, k: number): [number, number] {
  const n = Math.floor(u.length / 2)
  const j = (k + 1) % n
  const dx = u[2 * j] - u[2 * k]
  const dy = u[2 * j + 1] - u[2 * k + 1]
  const l = Math.sqrt(dx * dx + dy * dy)
  return l === 0 ? [0, 0] : [dx / l, dy / l]
}

/** Anfang und Ende einer Oeffnung auf ihrer Kante (Kommazahl, nur
 *  Zeichnung). */
export function oeffnungStrecke(
  u: Umriss,
  oeff: { kante: number; abstand_cm: number; breite_cm: number },
): [Punkt, Punkt] {
  const [rx, ry] = kanteRichtung(u, oeff.kante)
  const ax = u[2 * oeff.kante] + oeff.abstand_cm * rx
  const ay = u[2 * oeff.kante + 1] + oeff.abstand_cm * ry
  return [
    [ax, ay],
    [ax + oeff.breite_cm * rx, ay + oeff.breite_cm * ry],
  ]
}

export interface WandStueck {
  a: Punkt
  b: Punkt
  raumId: string
  kante: number
  farbe: string | null
}

/** Jede Kante wird ein Strich (12 cm, mittig). Abgezogen werden die
 *  Oeffnungen dieser Kante und die jeder anderen Kante auf derselben Linie
 *  (gemeinsame Wand zweier Raeume). Gleiche Strecken aus zwei Raeumen
 *  werden nur einmal gezeichnet. */
export function wandStuecke(
  raeume: { id: string; punkte: Punkt[]; wandfarben?: (string | null)[] | null }[],
  oeffnungen: { raum_id: string; kante: number; abstand_cm: number; breite_cm: number }[],
): WandStueck[] {
  // Alle Oeffnungen als Strecken in Grundriss-cm, samt ihrer Kante.
  const umrisse = new Map(raeume.map((r) => [r.id, zuUmriss(r.punkte)]))
  const loecher: { a: Punkt; b: Punkt }[] = []
  for (const o of oeffnungen) {
    const u = umrisse.get(o.raum_id)
    if (!u || o.kante < 0 || o.kante >= u.length / 2) continue
    const [a, b] = oeffnungStrecke(u, o)
    loecher.push({ a, b })
  }
  const gesehen = new Set<string>()
  const out: WandStueck[] = []
  const r2 = (v: number) => Math.round(v * 100) / 100
  for (const raum of raeume) {
    const n = raum.punkte.length
    for (let k = 0; k < n; k++) {
      const a = raum.punkte[k]
      const b = raum.punkte[(k + 1) % n]
      const dx = b[0] - a[0]
      const dy = b[1] - a[1]
      const laenge = Math.sqrt(dx * dx + dy * dy)
      if (laenge === 0) continue
      const rx = dx / laenge
      const ry = dy / laenge
      // Loecher auf derselben Linie als Abschnitte [t0, t1] entlang der Kante.
      const abschnitte: [number, number][] = []
      for (const l of loecher) {
        const kreuzA = (l.a[0] - a[0]) * dy - (l.a[1] - a[1]) * dx
        const kreuzB = (l.b[0] - a[0]) * dy - (l.b[1] - a[1]) * dx
        // Toleranz fuer Kommazahlen: 0,5 cm Abstand zur Linie.
        if (Math.abs(kreuzA) / laenge > 0.5 || Math.abs(kreuzB) / laenge > 0.5) continue
        const ta = (l.a[0] - a[0]) * rx + (l.a[1] - a[1]) * ry
        const tb = (l.b[0] - a[0]) * rx + (l.b[1] - a[1]) * ry
        const t0 = Math.max(0, Math.min(ta, tb))
        const t1 = Math.min(laenge, Math.max(ta, tb))
        if (t1 > t0) abschnitte.push([t0, t1])
      }
      abschnitte.sort((x, y) => x[0] - y[0])
      const stuecke: [number, number][] = []
      let t = 0
      for (const [t0, t1] of abschnitte) {
        if (t0 > t) stuecke.push([t, t0])
        t = Math.max(t, t1)
      }
      if (t < laenge) stuecke.push([t, laenge])
      for (const [s0, s1] of stuecke) {
        const pa: Punkt = [a[0] + s0 * rx, a[1] + s0 * ry]
        const pb: Punkt = [a[0] + s1 * rx, a[1] + s1 * ry]
        const k1 = `${r2(pa[0])},${r2(pa[1])}`
        const k2 = `${r2(pb[0])},${r2(pb[1])}`
        const schluessel = k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`
        if (gesehen.has(schluessel)) continue
        gesehen.add(schluessel)
        out.push({ a: pa, b: pb, raumId: raum.id, kante: k, farbe: raum.wandfarben?.[k] ?? null })
      }
    }
  }
  return out
}

/* ------------------------------------------------------------- Eingabe */

function ziffernNormal(text: string): string {
  return text
    .replace(/[٠-٩]/g, (z) => String(z.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (z) => String(z.charCodeAt(0) - 0x06f0))
    .replace(/[٫،]/g, ',')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/** "3,45" oder "3.45" als cm: ganze Teile mal 100 plus Nachkommastellen,
 *  exakt ueber den Text statt ueber eine Kommazahl, auf cm gerundet. */
function meterZuCm(ganz: string, nachkomma: string): number {
  const mm = Number(ganz) * 1000 + Number((nachkomma + '000').slice(0, 3))
  return Math.round(mm / 10)
}

/** Eine Laenge, wie Menschen sie tippen (START 5.4). Ganze Zahl ohne
 *  Trenner sind Zentimeter, mit Komma oder Punkt Meter. Einheiten m, cm
 *  (auch arabisch م und سم), "3 m 45". Ergebnis in ganzen cm; leer,
 *  negativ, keine Zahl oder mehr als 50000 ist null. */
export function laengeLesen(text: string): number | null {
  const s = ziffernNormal(text)
  if (!s) return null
  let cm: number | null = null
  let m: RegExpMatchArray | null
  if ((m = s.match(/^(\d+)\s*(?:m|م)\s*(\d+)\s*(?:cm|سم)?$/))) {
    cm = Number(m[1]) * 100 + Number(m[2])
  } else if ((m = s.match(/^(\d+)(?:[.,](\d+))?\s*(?:cm|سم)$/))) {
    cm = m[2] ? Math.round(Number(`${m[1]}.${m[2]}`)) : Number(m[1])
  } else if ((m = s.match(/^(\d+)(?:[.,](\d+))?\s*(?:m|م)$/))) {
    cm = meterZuCm(m[1], m[2] ?? '')
  } else if ((m = s.match(/^(\d+)[.,](\d+)$/))) {
    cm = meterZuCm(m[1], m[2])
  } else if ((m = s.match(/^(\d+)$/))) {
    cm = Number(m[1])
  }
  if (cm === null || !Number.isFinite(cm) || cm < 0 || cm > 50000) return null
  return cm
}

/** Eine Zahl aus einem Eingabefeld, wie Menschen sie tippen: mit Komma
 *  oder Punkt, mit arabisch-indischen oder persischen Ziffern, mit dem
 *  arabischen Dezimaltrenner. Keine Zahl heisst null, nie ein Ersatzwert. */
export function zahlLesen(text: string): number | null {
  const ziffern = text
    .trim()
    .replace(/[٠-٩]/g, (z) => String(z.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (z) => String(z.charCodeAt(0) - 0x06f0))
    .replace(/[٫,]/g, '.')
    .replace(/\s+/g, '')
  if (!/^\d+(\.\d+)?$/.test(ziffern)) return null
  const zahl = Number.parseFloat(ziffern)
  return Number.isFinite(zahl) ? zahl : null
}

/** Bretterhoehen aus einem Feld wie "0, 40, 80". Das Komma trennt hier
 *  die Bretter, es ist kein Dezimalzeichen: Bretter stehen auf ganzen
 *  Zentimetern. null bei Unsinn. */
export function brettListeLesen(text: string): number[] | null {
  const teile = text
    .split(/[,;\s،]+/)
    .map((t) => t.trim())
    .filter(Boolean)
  if (teile.length === 0) return null
  const zahlen: number[] = []
  for (const t of teile) {
    const z = zahlLesen(t)
    if (z === null) return null
    zahlen.push(Math.round(z))
  }
  return zahlen
}

/** Eine Laenge zum Lesen: unter 100 "85 cm", sonst "3,45 m" (de) bzw.
 *  "3.45 م" (ar). Die Zahl steht beim Einsetzen in t-serial. */
export function cmText(cm: number, lang: 'de' | 'ar'): string {
  if (Math.abs(cm) < 100) return `${Math.round(cm)} cm`
  const m = (cm / 100).toFixed(2)
  return lang === 'ar' ? `${m} م` : `${m.replace('.', ',')} m`
}

/* ----------------------------------------------------------- Einrasten */

export function einrasten(v: number, raster = 5): number {
  return Math.round(v / raster) * raster
}

/** Ohne Umschalt die Achse mit der groesseren Bewegung (90-Grad-Schritte),
 *  mit Umschalt frei; danach auf ganze cm. */
export function winkelEinrasten(start: Punkt, p: Punkt, frei: boolean): Punkt {
  if (frei) return [Math.round(p[0]), Math.round(p[1])]
  const dx = Math.abs(p[0] - start[0])
  const dy = Math.abs(p[1] - start[1])
  return dx >= dy ? [Math.round(p[0]), Math.round(start[1])] : [Math.round(start[0]), Math.round(p[1])]
}

/* ------------------------------------------------------------- Faecher */

/** Lichte Hoehen von unten nach oben; das erste Fach steht auf dem
 *  Objektboden. Brettdicke 2 cm. */
export function faecherAusAbstaenden(abstaende: number[]): { brett_cm: number[]; hoehe_cm: number } {
  const brett: number[] = []
  let b = 0
  for (let i = 0; i < abstaende.length; i++) {
    brett.push(b)
    b = b + abstaende[i] + 2
  }
  return { brett_cm: brett, hoehe_cm: brett.length ? b : 0 }
}

/** n gleiche Faecher; der Rest geht ins oberste Fach. */
export function faecherGleichmaessig(n: number, hoehe: number): { brett_cm: number[]; hoehe_cm: number } {
  if (n < 1) return { brett_cm: [], hoehe_cm: hoehe }
  const a = Math.floor((hoehe - 2 * n) / n)
  const brett: number[] = []
  for (let i = 0; i < n; i++) brett.push(i * (a + 2))
  return { brett_cm: brett, hoehe_cm: hoehe }
}

/** Umkehrung fuer die Anzeige: lichte Hoehe je Fach. */
export function abstaendeAusFaechern(brett: number[], hoehe: number): number[] {
  return brett.map((b, i) => (i + 1 < brett.length ? brett[i + 1] : hoehe) - b - 2)
}

/* ------------------------------------------------ Unterlagen an einer Stelle */

export interface Unterlage {
  art: UnterlageArtGeo
  itemId?: string
  objektId?: string
  ebene?: number
  spalte?: number
  unten_cm: number
  oben_cm: number
  grenze_cm: number
  passt: boolean
  /** Nur Fach: wie weit die Kiste in der Tiefe herausragt (ganze cm,
   *  aufgerundet), 0 wenn gar nicht. */
  ueberstand_cm?: number
  /** Warum sie nicht passt: zu hoch, oder im Fach zu weit heraus
   *  (mehr als UEBERSTAND_MAX_CM). Nur bei passt = false. */
  grund?: 'hoehe' | 'ueberstand'
  /** Sprachneutral: Code der Kiste, Name des Objekts, bei Faechern mit
   *  Ebene/Spalte. Die Oberflaeche setzt daraus ihren Satz. */
  text: string
}

/** Worauf man an (x, y) eine Kiste stellen kann: Faecher (von unten nach
 *  oben), Kisten (oberste zuerst), Objekt oben drauf, Boden (nur ohne
 *  Objekt an der Stelle). passt = oben <= grenze und im Fach hoechstens
 *  UEBERSTAND_MAX_CM Ueberstand. */
export function unterlagenAn(
  daten: { raeume: GeoRaum[]; objekte: GeoObjekt[]; kisten: GeoPlanKiste[] },
  raumId: string,
  x: number,
  y: number,
  kiste: { id?: string; laenge_cm: number; breite_cm: number; hoehe_cm: number; drehung: 0 | 90 },
): Unterlage[] {
  const raum = daten.raeume.find((r) => r.id === raumId)
  if (!raum) return []
  const h = kiste.hoehe_cm
  const out: Unterlage[] = []
  const eintrag = (u: Omit<Unterlage, 'oben_cm' | 'passt'>, ueberstand2 = 0): Unterlage => {
    const hoehe = u.unten_cm + h <= u.grenze_cm
    const tiefe = ueberstand2 <= 2 * UEBERSTAND_MAX_CM
    return {
      ...u,
      oben_cm: u.unten_cm + h,
      passt: hoehe && tiefe,
      ...(hoehe && tiefe ? {} : { grund: hoehe ? ('ueberstand' as const) : ('hoehe' as const) }),
    }
  }
  const objekte = daten.objekte.filter((o) => o.raum_id === raumId)

  for (const o of objekte) {
    if (o.art === 'moebel' || !o.brett_cm) continue
    for (let s = 1; s <= o.spalten; s++) {
      if (!objektImFach(o, s, x, y)) continue
      const u2 = kisteUeberstand2(o, x, y, { drehung: kiste.drehung, laenge: kiste.laenge_cm, breite: kiste.breite_cm })
      for (let e = 1; e <= o.brett_cm.length; e++) {
        out.push(
          eintrag(
            {
              art: 'fach',
              objektId: o.id,
              ebene: e,
              spalte: s,
              unten_cm: o.brett_cm[e - 1],
              grenze_cm: fachDecke(o, e),
              ueberstand_cm: ueberstandCm(u2),
              text: `${o.name} ${e}/${s}`.trim(),
            },
            u2,
          ),
        )
      }
    }
  }

  // Liegt eine Kiste (auch mittelbar) auf der zu stellenden, kommt sie
  // nicht als Unterlage in Frage: das waere ein Kreis.
  const liegtAuf = (c: GeoKiste): boolean => {
    let v: string | null = c.id
    for (let i = 0; v && i <= 60; i++) {
      if (v === kiste.id) return true
      v = daten.kisten.find((z) => z.id === v)?.unterlage_item_id ?? null
    }
    return false
  }
  const kisten = daten.kisten
    .filter(
      (c) =>
        c.platz_raum_id === raumId &&
        !(kiste.id && liegtAuf(c)) &&
        kisteTraegt(
          { x: c.platz_x, y: c.platz_y, drehung: c.platz_drehung, laenge: c.laenge_cm, breite: c.breite_cm },
          x,
          y,
        ),
    )
    .sort((a, b) => b.oben_cm - a.oben_cm)
  for (const c of kisten) {
    out.push(eintrag({ art: 'kiste', itemId: c.id, unten_cm: c.oben_cm, grenze_cm: c.grenze_cm, text: c.code }))
  }

  let aufObjekt = false
  for (const o of objekte) {
    if (!objektEnthaelt(o, x, y)) continue
    aufObjekt = true
    out.push(
      eintrag({ art: 'objekt', objektId: o.id, unten_cm: o.hoehe_cm, grenze_cm: raum.hoehe_cm, text: o.name }),
    )
  }
  if (!aufObjekt) {
    out.push(eintrag({ art: 'boden', unten_cm: 0, grenze_cm: raum.hoehe_cm, text: '' }))
  }
  return out
}

/* ------------------------------------------------ Ueberlappen (nur Warnung) */

/** Codes der Kisten derselben Unterkante, deren Grundflaechen sich echt
 *  ueberdecken (Beruehren zaehlt nicht). Nur Warnung, START 5.2. */
export function kistenUeberlappen(
  daten: { kisten: (GeoKiste & { oben_cm: number })[] },
  raumId: string,
  x: number,
  y: number,
  masse: { id?: string; laenge_cm: number; breite_cm: number; unten_cm?: number },
  drehung: 0 | 90,
): string[] {
  const unten = masse.unten_cm ?? 0
  const ex = drehung === 90 ? masse.breite_cm : masse.laenge_cm
  const ey = drehung === 90 ? masse.laenge_cm : masse.breite_cm
  const out: string[] = []
  for (const c of daten.kisten) {
    if (c.platz_raum_id !== raumId || c.id === masse.id) continue
    if (c.oben_cm - c.hoehe_cm !== unten) continue
    const cx = c.platz_drehung === 90 ? c.breite_cm : c.laenge_cm
    const cy = c.platz_drehung === 90 ? c.laenge_cm : c.breite_cm
    if (Math.abs(2 * (x - c.platz_x)) < ex + cx && Math.abs(2 * (y - c.platz_y)) < ey + cy) out.push(c.code)
  }
  return out
}

function innenProbe(p: Punkt[], k: number): Punkt | null {
  const a = p[k]
  const b = p[(k + 1) % p.length]
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const l = Math.sqrt(dx * dx + dy * dy)
  if (l === 0) return null
  // Im Uhrzeigersinn am Bildschirm liegt das Innere rechts der Kante.
  return [(a[0] + b[0]) / 2 - (dy / l) * 0.5, (a[1] + b[1]) / 2 + (dx / l) * 0.5]
}

function ueberlappt(a: Punkt[], b: Punkt[]): boolean {
  const ua = zuUmriss(a)
  const ub = zuUmriss(b)
  for (let i = 0; i < a.length; i++) {
    const a1 = a[i]
    const a2 = a[(i + 1) % a.length]
    for (let j = 0; j < b.length; j++) {
      const b1 = b[j]
      const b2 = b[(j + 1) % b.length]
      const d1 = Math.sign((b2[0] - b1[0]) * (a1[1] - b1[1]) - (b2[1] - b1[1]) * (a1[0] - b1[0]))
      const d2 = Math.sign((b2[0] - b1[0]) * (a2[1] - b1[1]) - (b2[1] - b1[1]) * (a2[0] - b1[0]))
      const d3 = Math.sign((a2[0] - a1[0]) * (b1[1] - a1[1]) - (a2[1] - a1[1]) * (b1[0] - a1[0]))
      const d4 = Math.sign((a2[0] - a1[0]) * (b2[1] - a1[1]) - (a2[1] - a1[1]) * (b2[0] - a1[0]))
      if (d1 * d2 < 0 && d3 * d4 < 0) return true
    }
  }
  if (a.some(([x, y]) => punktLage(ub, x, y) === 1)) return true
  if (b.some(([x, y]) => punktLage(ua, x, y) === 1)) return true
  for (let k = 0; k < a.length; k++) {
    const q = innenProbe(a, k)
    if (q && punktLage(ub, q[0], q[1]) === 1) return true
  }
  for (let k = 0; k < b.length; k++) {
    const q = innenProbe(b, k)
    if (q && punktLage(ua, q[0], q[1]) === 1) return true
  }
  return false
}

/** Paare von Raeumen, deren Flaechen sich ueberdecken. Gemeinsame Wand
 *  zaehlt nicht. Nur Warnung; der Zeichner speichert trotzdem. */
export function raeumeUeberlappen(daten: { raeume: { id: string; punkte: Punkt[] }[] }): [string, string][] {
  const out: [string, string][] = []
  const r = daten.raeume
  for (let i = 0; i < r.length; i++) {
    for (let j = i + 1; j < r.length; j++) {
      if (ueberlappt(r[i].punkte, r[j].punkte)) out.push([r[i].id, r[j].id])
    }
  }
  return out
}
