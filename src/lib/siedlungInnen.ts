/* Die Siedlung innen (E84): reine Rechnungen ohne React, ohne Netz und
 * ohne Datenbank, damit die Oberflaeche, die 3D-Szene und die Pruefung
 * (scripts/siedlung-innen-pruefen.mjs) dieselbe Rechnung benutzen.
 *
 * Form und Koordinaten stehen in src/lib/types.ts (SiedlungInnenHaus und
 * Verwandte): alles in cm des Geschosses wie ein Fundkiste-Plan (x nach
 * rechts, y nach unten), Raeume im Uhrzeigersinn am Bildschirm, eine
 * Oeffnung liegt auf Kante kante (punkte[kante] nach punkte[kante + 1]),
 * abstand_cm ab dem Anfang der Kante, anschlag 'links' heisst: die Angel
 * sitzt am Ende der Oeffnung, das dem Anfang der Kante naeher ist.
 *
 * - siedlungInnenPruefen: prueft eine Liste SiedlungInnenHaus[] mit
 *   denselben Grenzen wie die Datenbank (0045, siedlung_innen_gueltig)
 *   und dazu, was nur hier geprueft wird (Umlauf, Oeffnung passt auf ihre
 *   Kante).
 * - wohnungAuslegen: legt einen Wohnungstyp (eigene cm) an seine Stelle
 *   im Geschoss: spiegeln, drehen, verschieben. Gespiegelte Raeume laufen
 *   danach wieder im Uhrzeigersinn; Kante, Abstand und Angel der
 *   Oeffnungen und die Lage der Moebel ziehen mit.
 * - eingangAussen: Mitte einer Tuer, ein Stueck vor der Wand draussen.
 * - eingangSprungziel: Ort und Blickrichtung vor der Wohnungstuer in der
 *   Siedlung (fuer die Liste der Wohnungen, Sprungziel3D).
 * - geschossZuSiedlung: Geschoss-cm in Siedlungs-Meter (Formel aus dem
 *   Vertrag, wie die eigene Wohnung).
 * - polygonQm, geschossUeberlappungen: Flaeche und Ueberdeckungen.
 */
import { flaeche2, raeumeUeberlappen, zuUmriss, type Punkt } from './geometrie.ts'
import type {
  SiedlungInnenGeschoss,
  SiedlungInnenHaus,
  SiedlungInnenMoebel,
  SiedlungInnenOeffnung,
  SiedlungInnenRaum,
  SiedlungInnenWohnung,
} from './types'

/* ============================================================ Grenzen */

/** Dieselben Grenzen wie in supabase/migrations/0045_siedlung_innen.sql.
 *  Aendert sich eine, aendert sie sich dort mit einer neuen Migration. */
export const INNEN_GRENZEN = {
  /** Haeuser je Siedlung mit Innenleben. */
  haeuser: 20,
  /** Groesse der ganzen Liste als Text in der Datenbank (Bytes). */
  bytes: 2_000_000,
  /** Geschosse je Haus und ihr Bereich (0 = Erdgeschoss). */
  geschosse: 60,
  geschossMin: -5,
  geschossMax: 60,
  wohnungen: 100,
  allgemein: 50,
  raeume: 100,
  oeffnungen: 400,
  moebel: 200,
  punkteMin: 3,
  punkteMax: 200,
  /** Betrag jeder Koordinate in cm (1 km). */
  koordinate: 100_000,
  /** Lage eines Hauses in der Siedlung, Meter (wie 0044). */
  lage: 5000,
  /** Breite einer Oeffnung, Breite und Tiefe eines Moebels (cm). */
  breiteMax: 2000,
  /** Hoehe und Bruestung einer Oeffnung (cm). */
  hoeheMax: 1000,
  textName: 80,
  textTop: 20,
  textTyp: 40,
  textId: 64,
} as const

/* ============================================================== Lage */

export type InnenDrehung = 0 | 90 | 180 | 270

/** Wo ein Wohnungstyp im Geschoss liegt: erst spiegeln (x wird -x, an der
 *  senkrechten Achse durch den Ursprung des Typs), dann um drehung Grad
 *  drehen (R wie im Vertrag, am Bildschirm im Uhrzeigersinn), dann um
 *  (x, y) cm verschieben. */
export interface InnenLage {
  x: number
  y: number
  spiegeln: boolean
  drehung: InnenDrehung
}

/** cos und sin der vier erlaubten Drehungen, exakt. */
const DREH: Record<InnenDrehung, [number, number]> = { 0: [1, 0], 90: [0, 1], 180: [-1, 0], 270: [0, -1] }

/** Auf hundertstel cm, damit keine Rechenreste (1e-13) in die Daten gehen. */
function rund(v: number): number {
  const r = Math.round(v * 100) / 100
  return r === 0 ? 0 : r
}

/** Nur die Richtung (ohne Verschiebung): spiegeln, dann drehen. */
function richtungAuslegen(v: Punkt, lage: InnenLage): Punkt {
  const [c, s] = DREH[lage.drehung]
  const x = lage.spiegeln ? -v[0] : v[0]
  return [c * x - s * v[1], s * x + c * v[1]]
}

/** Ein Punkt des Typs (cm) an seiner Stelle im Geschoss (cm). */
export function punktAuslegen(p: Punkt, lage: InnenLage): Punkt {
  const [x, y] = richtungAuslegen(p, lage)
  return [rund(lage.x + x), rund(lage.y + y)]
}

/** Geschoss-cm eines Hauses in Siedlungs-Meter:
 *  (h.x, h.z) + R(drehung) * (px / 100, py / 100). */
export function geschossZuSiedlung(h: Pick<SiedlungInnenHaus, 'x' | 'z' | 'drehung'>, p: Punkt): Punkt {
  const [c, s] = DREH[h.drehung]
  return [h.x + (c * p[0] - s * p[1]) / 100, h.z + (s * p[0] + c * p[1]) / 100]
}

/* ======================================================= Wohnung legen */

/** Eine Oeffnung im Typ; eingang markiert die Wohnungstuer. */
export type InnenTypOeffnung = SiedlungInnenOeffnung & { eingang?: boolean }

/** Ein Wohnungstyp in eigenen cm, so wie er im Plan steht. */
export interface InnenTyp {
  raeume: SiedlungInnenRaum[]
  oeffnungen: InnenTypOeffnung[]
  moebel: SiedlungInnenMoebel[]
}

/** Laenge von Kante k eines Umrisses (cm). */
function kantenLaenge(p: Punkt[], k: number): number {
  const a = p[k]
  const b = p[(k + 1) % p.length]
  return Math.hypot(b[0] - a[0], b[1] - a[1])
}

/** Einen Raum an seine Stelle legen. Laeuft er danach gegen den
 *  Uhrzeigersinn (gespiegelt oder schon so gezeichnet), wird er wie im
 *  Zeichner umgedreht ([p0, p(n-1), ..., p1]): alte Kante k wird n-1-k.
 *  umgedreht sagt den Oeffnungen, dass sich ihre Kante umkehrt. */
function raumAuslegen(r: SiedlungInnenRaum, lage: InnenLage): { raum: SiedlungInnenRaum; umgedreht: boolean } {
  const p = r.punkte.map((q) => punktAuslegen(q, lage))
  if (p.length < 3 || flaeche2(zuUmriss(p)) > 0) return { raum: { name: r.name, art: r.art, punkte: p }, umgedreht: false }
  const punkte: Punkt[] = [p[0]]
  for (let i = p.length - 1; i >= 1; i--) punkte.push(p[i])
  return { raum: { name: r.name, art: r.art, punkte }, umgedreht: true }
}

/** Eine Oeffnung auf ihren umgedrehten Raum umschreiben: Kante n-1-k, der
 *  Abstand zaehlt vom anderen Ende, und weil die Kante jetzt andersherum
 *  laeuft, sitzt dieselbe Angel auf der anderen Seite (links/rechts
 *  tauschen). Innen und aussen bleiben, wo sie sind. */
function oeffnungUmkehren<T extends SiedlungInnenOeffnung>(o: T, punkte: Punkt[]): T {
  const n = punkte.length
  const kante = n - 1 - o.kante
  // punkte ist schon umgedreht: die alte Kante heisst dort schon kante.
  const laenge = kantenLaenge(punkte, kante)
  return {
    ...o,
    kante,
    abstand_cm: rund(Math.max(0, laenge - o.abstand_cm - o.breite_cm)),
    anschlag: o.anschlag === 'links' ? 'rechts' : 'links',
  }
}

/** Ein Moebel an seine Stelle legen. Die Lage wie bei Fundkiste-Objekten:
 *  (x, y) ist die Ecke, an der die Breite (lokal x) und die Tiefe (lokal y,
 *  0 = Rueckseite an der Wand) beginnen; drehung dreht beide Achsen.
 *  Gedreht wird die Ecke mitgenommen. Gespiegelt bleibt die Rueckseite
 *  hinten, die Breite laeuft aber andersherum: die neue Ecke ist das
 *  gespiegelte andere Ende der Rueckseite, die Drehung folgt der
 *  gespiegelten Rueckseite. So deckt das Moebel genau die gespiegelte
 *  Flaeche ab. */
function moebelAuslegen(m: SiedlungInnenMoebel, lage: InnenLage): SiedlungInnenMoebel {
  const [c, s] = DREH[m.drehung]
  const ux: Punkt = [c, s]
  let ecke: Punkt = [m.x, m.y]
  let achseX = richtungAuslegen(ux, lage)
  if (lage.spiegeln) {
    ecke = [m.x + ux[0] * m.breite_cm, m.y + ux[1] * m.breite_cm]
    achseX = [-achseX[0], -achseX[1]]
  }
  const grad = Math.round((Math.atan2(achseX[1], achseX[0]) * 180) / Math.PI / 90) * 90
  const drehung = (((grad % 360) + 360) % 360) as InnenDrehung
  const [x, y] = punktAuslegen(ecke, lage)
  return { name: m.name, x, y, breite_cm: m.breite_cm, tiefe_cm: m.tiefe_cm, drehung }
}

/** Mitte einer Oeffnung, abstandCm vor der Wand auf der Seite, die nicht
 *  zum Raum gehoert (Wohnungstuer: im Gang). null, wenn Raum oder Kante
 *  nicht passen. Im Uhrzeigersinn liegt das Innere rechts der Kante
 *  (innenNormale = [-uy, ux]); draussen ist die Gegenrichtung. */
export function eingangAussen(
  raeume: Pick<SiedlungInnenRaum, 'punkte'>[],
  o: Pick<SiedlungInnenOeffnung, 'raum' | 'kante' | 'abstand_cm' | 'breite_cm'>,
  abstandCm: number,
): Punkt | null {
  const r = raeume[o.raum]
  if (!r) return null
  const p = r.punkte
  const n = p.length
  if (n < 3 || o.kante < 0 || o.kante >= n || !Number.isInteger(o.kante)) return null
  const a = p[o.kante]
  const b = p[(o.kante + 1) % n]
  const l = Math.hypot(b[0] - a[0], b[1] - a[1])
  if (l === 0) return null
  const ux = (b[0] - a[0]) / l
  const uy = (b[1] - a[1]) / l
  const t = o.abstand_cm + o.breite_cm / 2
  const umlauf = flaeche2(zuUmriss(p)) >= 0 ? 1 : -1
  return [rund(a[0] + ux * t + uy * umlauf * abstandCm), rund(a[1] + uy * t - ux * umlauf * abstandCm)]
}

/** Abstand der Sprungstelle vor der Wohnungstuer, wenn nichts anderes
 *  gesagt ist: hinter einer 44-cm-Aussenwand noch gut 45 cm im Gang. */
export const EINGANG_ABSTAND_CM = 90

/** Wohin die Kamera springt, um vor einer Wohnung zu stehen: an ihren
 *  Eingang (Siedlungs-Meter), Blick zur naechsten Tuer der Wohnung. gier
 *  wie im Motor: vorwaerts ist (-sin gier, -cos gier) in (x, z), 0 = nach
 *  -z. null ohne Eingang; ohne Tuer schaut man nach -z. */
export function eingangSprungziel(
  h: Pick<SiedlungInnenHaus, 'x' | 'z' | 'drehung'>,
  w: Pick<SiedlungInnenWohnung, 'raeume' | 'oeffnungen' | 'eingang'>,
): { x: number; z: number; gier: number } | null {
  const e = w.eingang
  if (!e) return null
  let ziel: Punkt | null = null
  let bester = Infinity
  for (const o of w.oeffnungen) {
    if (o.art !== 'tuer') continue
    const m = eingangAussen(w.raeume, o, 0)
    if (!m) continue
    const d = Math.hypot(m[0] - e[0], m[1] - e[1])
    if (d < bester) {
      bester = d
      ziel = m
    }
  }
  const [x, z] = geschossZuSiedlung(h, e)
  if (!ziel || bester === 0) return { x, z, gier: 0 }
  const [c, s] = DREH[h.drehung]
  const dx = ziel[0] - e[0]
  const dy = ziel[1] - e[1]
  return { x, z, gier: Math.atan2(-(c * dx - s * dy), -(s * dx + c * dy)) }
}

/** Einen Typ als Wohnung ins Geschoss legen. Die Wohnungstuer ist die
 *  erste Tuer mit eingang: true; ohne sie ist eingang null. */
export function wohnungAuslegen(
  typ: InnenTyp,
  lage: InnenLage,
  top: string,
  typName: string,
  eingangAbstandCm: number = EINGANG_ABSTAND_CM,
): SiedlungInnenWohnung {
  const gelegt = typ.raeume.map((r) => raumAuslegen(r, lage))
  const raeume = gelegt.map((g) => g.raum)
  let tuer: SiedlungInnenOeffnung | null = null
  const oeffnungen: SiedlungInnenOeffnung[] = []
  for (const o of typ.oeffnungen) {
    const { eingang, ...ohne } = o
    const g = gelegt[o.raum]
    const neu: SiedlungInnenOeffnung = g?.umgedreht ? oeffnungUmkehren(ohne, g.raum.punkte) : { ...ohne }
    if (eingang && o.art === 'tuer' && !tuer) tuer = neu
    oeffnungen.push(neu)
  }
  const moebel = typ.moebel.map((m) => moebelAuslegen(m, lage))
  const eingang = tuer ? eingangAussen(raeume, tuer, eingangAbstandCm) : null
  return { top, typ: typName, raeume, oeffnungen, moebel, eingang }
}

/* ================================================== Flaeche, Ueberdeckung */

/** Flaeche eines Umrisses in m2 (die gezeichnete Flaeche, ohne Abzug fuer
 *  Waende; die Plan-Anzeige rechnet mit flaecheQm in plan/hilfe.ts). */
export function polygonQm(p: Punkt[]): number {
  if (p.length < 3) return 0
  return Math.abs(flaeche2(zuUmriss(p))) / 2 / 10000
}

/** Wo sich auf einem Geschoss Flaechen ueberdecken: Raeume zweier
 *  Wohnungen, ein Raum und eine allgemeine Flaeche, zwei allgemeine
 *  Flaechen. Gemeinsame Waende zaehlen nicht (raeumeUeberlappen). Raeume
 *  derselben Wohnung prueft der Zeichner. Namen: 'Top/Raumnummer' oder
 *  'allgemein/Nummer'. */
export function geschossUeberlappungen(g: Pick<SiedlungInnenGeschoss, 'wohnungen' | 'allgemein'>): [string, string][] {
  const flaechen: { id: string; gruppe: string; punkte: Punkt[] }[] = []
  g.wohnungen.forEach((w, wi) =>
    w.raeume.forEach((r, ri) => flaechen.push({ id: `${w.top}/${ri}`, gruppe: `w${wi}`, punkte: r.punkte })),
  )
  g.allgemein.forEach((a, ai) => flaechen.push({ id: `allgemein/${ai}`, gruppe: `a${ai}`, punkte: a.punkte }))
  const gruppe = new Map(flaechen.map((f) => [f.id, f.gruppe]))
  return raeumeUeberlappen({ raeume: flaechen }).filter(([a, b]) => gruppe.get(a) !== gruppe.get(b))
}

/* ============================================================ Pruefen */

/** Was an einer Stelle nicht stimmt:
 *  - form: falscher Typ, fehlender oder unbekannter Schluessel, falscher Wert,
 *  - zahl: Zahl ausserhalb der Grenzen oder nicht ganz,
 *  - punkte: Umriss zu kurz, zu lang oder Punkt ausserhalb der Grenzen,
 *  - anzahl: Liste zu lang oder zu kurz,
 *  - groesse: alles zusammen zu gross,
 *  - doppelt: gebaeudeId oder Geschoss doppelt,
 *  - haus_fehlt: gebaeudeId ist kein Haus der Siedlung,
 *  - raum, kante: Nummer zeigt ins Leere,
 *  - umlauf: Raum nicht im Uhrzeigersinn oder ohne Flaeche (nur hier),
 *  - oeffnung_zu_lang: Oeffnung reicht ueber ihre Kante hinaus (nur hier). */
export type InnenKennung =
  | 'form'
  | 'zahl'
  | 'punkte'
  | 'anzahl'
  | 'groesse'
  | 'doppelt'
  | 'haus_fehlt'
  | 'raum'
  | 'kante'
  | 'umlauf'
  | 'oeffnung_zu_lang'

export interface InnenProblem {
  /** Wo, etwa '[0].geschosse[2].wohnungen[1].oeffnungen[3].kante'. */
  pfad: string
  kennung: InnenKennung
}

type Obj = Record<string, unknown>
const G = INNEN_GRENZEN
/** Spielraum, um den eine Oeffnung wegen Rundung ueber ihre Kante reichen darf (cm). */
const OEFFNUNG_SPIEL_CM = 1

function istObj(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}
/** Nur bekannte Schluessel (fehlende fallen bei der Typpruefung auf). */
function nurBekannte(o: Obj, erlaubt: readonly string[]): boolean {
  return Object.keys(o).every((k) => erlaubt.includes(k))
}
function zahlOk(v: unknown, lo: number, hi: number, ganz: boolean): boolean {
  return typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi && (!ganz || Number.isInteger(v))
}
function textOk(v: unknown, min: number, max: number): boolean {
  return typeof v === 'string' && v.length >= min && v.length <= max
}
function punktOk(e: unknown): e is Punkt {
  return (
    Array.isArray(e) &&
    e.length === 2 &&
    zahlOk(e[0], -G.koordinate, G.koordinate, false) &&
    zahlOk(e[1], -G.koordinate, G.koordinate, false)
  )
}
function punkteOk(p: unknown, min: number, max: number): p is Punkt[] {
  return Array.isArray(p) && p.length >= min && p.length <= max && p.every(punktOk)
}
const DREHUNGEN: readonly unknown[] = [0, 90, 180, 270]

/** Laenge als Text in der Datenbank (jsonb::text: ', ' und ': ' zwischen
 *  den Teilen), damit die Grenze hier dieselbe ist wie dort. Zahlen in
 *  der Schreibweise von JavaScript; bei sehr grossen oder sehr kleinen
 *  Zahlen weicht das um wenige Zeichen ab. */
export function jsonbTextLaenge(v: unknown): number {
  if (v === null || v === undefined) return 4
  if (typeof v === 'boolean') return v ? 4 : 5
  if (typeof v === 'number') return String(v).length
  if (typeof v === 'string') return new TextEncoder().encode(JSON.stringify(v)).length
  if (Array.isArray(v)) return 2 + v.reduce<number>((s, x) => s + jsonbTextLaenge(x), 0) + Math.max(0, v.length - 1) * 2
  if (typeof v === 'object') {
    const e = Object.entries(v as Obj)
    return (
      2 +
      e.reduce((s, [k, x]) => s + new TextEncoder().encode(JSON.stringify(k)).length + 2 + jsonbTextLaenge(x), 0) +
      Math.max(0, e.length - 1) * 2
    )
  }
  return 0
}

function pruefeRaum(r: unknown, pfad: string, out: InnenProblem[]): void {
  if (!istObj(r) || !nurBekannte(r, ['name', 'art', 'punkte'])) {
    out.push({ pfad, kennung: 'form' })
    return
  }
  if (!textOk(r.name, 0, G.textName) || (r.art !== 'innen' && r.art !== 'draussen')) out.push({ pfad, kennung: 'form' })
  if (!punkteOk(r.punkte, G.punkteMin, G.punkteMax)) out.push({ pfad: `${pfad}.punkte`, kennung: 'punkte' })
  else if (flaeche2(zuUmriss(r.punkte)) <= 0) out.push({ pfad: `${pfad}.punkte`, kennung: 'umlauf' })
}

function pruefeOeffnung(o: unknown, raeume: unknown[], pfad: string, out: InnenProblem[]): void {
  const SCHLUESSEL = ['raum', 'art', 'kante', 'abstand_cm', 'breite_cm', 'hoehe_cm', 'bruestung_cm', 'anschlag', 'aufschlag']
  if (!istObj(o) || !nurBekannte(o, SCHLUESSEL)) {
    out.push({ pfad, kennung: 'form' })
    return
  }
  if (
    (o.art !== 'tuer' && o.art !== 'fenster' && o.art !== 'durchgang') ||
    (o.anschlag !== 'links' && o.anschlag !== 'rechts') ||
    (o.aufschlag !== 'innen' && o.aufschlag !== 'aussen')
  ) {
    out.push({ pfad, kennung: 'form' })
  }
  let zahlen = true
  for (const [k, lo, hi, ganz] of [
    ['raum', 0, G.raeume - 1, true],
    ['kante', 0, G.punkteMax - 1, true],
    ['abstand_cm', 0, G.koordinate, false],
    ['breite_cm', 1, G.breiteMax, false],
    ['hoehe_cm', 1, G.hoeheMax, false],
    ['bruestung_cm', 0, G.hoeheMax, false],
  ] as const) {
    if (!zahlOk(o[k], lo, hi, ganz)) {
      out.push({ pfad: `${pfad}.${k}`, kennung: 'zahl' })
      zahlen = false
    }
  }
  if (!zahlen) return
  const raum = raeume[o.raum as number]
  if (raum === undefined) {
    out.push({ pfad: `${pfad}.raum`, kennung: 'raum' })
    return
  }
  if (!istObj(raum) || !punkteOk(raum.punkte, G.punkteMin, G.punkteMax)) return
  const punkte = raum.punkte
  const kante = o.kante as number
  if (kante >= punkte.length) {
    out.push({ pfad: `${pfad}.kante`, kennung: 'kante' })
    return
  }
  if ((o.abstand_cm as number) + (o.breite_cm as number) > kantenLaenge(punkte, kante) + OEFFNUNG_SPIEL_CM) {
    out.push({ pfad, kennung: 'oeffnung_zu_lang' })
  }
}

function pruefeMoebel(m: unknown, pfad: string, out: InnenProblem[]): void {
  if (!istObj(m) || !nurBekannte(m, ['name', 'x', 'y', 'breite_cm', 'tiefe_cm', 'drehung'])) {
    out.push({ pfad, kennung: 'form' })
    return
  }
  if (!textOk(m.name, 1, G.textName) || !DREHUNGEN.includes(m.drehung)) out.push({ pfad, kennung: 'form' })
  for (const [k, lo, hi] of [
    ['x', -G.koordinate, G.koordinate],
    ['y', -G.koordinate, G.koordinate],
    ['breite_cm', 1, G.breiteMax],
    ['tiefe_cm', 1, G.breiteMax],
  ] as const) {
    if (!zahlOk(m[k], lo, hi, false)) out.push({ pfad: `${pfad}.${k}`, kennung: 'zahl' })
  }
}

/** Eine Liste pruefen: Liste, Laenge min..max, dann jedes Element. */
function liste(v: unknown, min: number, max: number, pfad: string, out: InnenProblem[], je: (e: unknown, p: string) => void): void {
  if (!Array.isArray(v)) {
    out.push({ pfad, kennung: 'form' })
    return
  }
  if (v.length < min || v.length > max) {
    out.push({ pfad, kennung: 'anzahl' })
    return
  }
  v.forEach((e, i) => je(e, `${pfad}[${i}]`))
}

function pruefeWohnung(w: unknown, pfad: string, out: InnenProblem[]): void {
  if (!istObj(w) || !nurBekannte(w, ['top', 'typ', 'raeume', 'oeffnungen', 'moebel', 'eingang'])) {
    out.push({ pfad, kennung: 'form' })
    return
  }
  if (!textOk(w.top, 1, G.textTop) || !textOk(w.typ, 0, G.textTyp)) out.push({ pfad, kennung: 'form' })
  if (!('eingang' in w) || (w.eingang !== null && !punktOk(w.eingang))) out.push({ pfad: `${pfad}.eingang`, kennung: 'form' })
  liste(w.raeume, 1, G.raeume, `${pfad}.raeume`, out, (r, p) => pruefeRaum(r, p, out))
  const raeume = Array.isArray(w.raeume) ? w.raeume : []
  liste(w.oeffnungen, 0, G.oeffnungen, `${pfad}.oeffnungen`, out, (o, p) => pruefeOeffnung(o, raeume, p, out))
  liste(w.moebel, 0, G.moebel, `${pfad}.moebel`, out, (m, p) => pruefeMoebel(m, p, out))
}

function pruefeAllgemein(a: unknown, pfad: string, out: InnenProblem[]): void {
  if (!istObj(a) || !nurBekannte(a, ['art', 'punkte'])) {
    out.push({ pfad, kennung: 'form' })
    return
  }
  if (a.art !== 'stiege' && a.art !== 'aufzug' && a.art !== 'gang' && a.art !== 'laubengang') out.push({ pfad, kennung: 'form' })
  if (!punkteOk(a.punkte, G.punkteMin, G.punkteMax)) out.push({ pfad: `${pfad}.punkte`, kennung: 'punkte' })
}

function pruefeGeschoss(g: unknown, pfad: string, out: InnenProblem[]): void {
  if (!istObj(g) || !nurBekannte(g, ['geschoss', 'wohnungen', 'allgemein'])) {
    out.push({ pfad, kennung: 'form' })
    return
  }
  if (!zahlOk(g.geschoss, G.geschossMin, G.geschossMax, true)) out.push({ pfad: `${pfad}.geschoss`, kennung: 'zahl' })
  liste(g.wohnungen, 0, G.wohnungen, `${pfad}.wohnungen`, out, (w, p) => pruefeWohnung(w, p, out))
  liste(g.allgemein, 0, G.allgemein, `${pfad}.allgemein`, out, (a, p) => pruefeAllgemein(a, p, out))
}

function pruefeHaus(h: unknown, pfad: string, gebaeudeIds: readonly string[] | null, out: InnenProblem[]): void {
  if (!istObj(h) || !nurBekannte(h, ['gebaeudeId', 'x', 'z', 'drehung', 'geschosse'])) {
    out.push({ pfad, kennung: 'form' })
    return
  }
  if (!textOk(h.gebaeudeId, 1, G.textId)) out.push({ pfad: `${pfad}.gebaeudeId`, kennung: 'form' })
  else if (gebaeudeIds && !gebaeudeIds.includes(h.gebaeudeId as string)) out.push({ pfad: `${pfad}.gebaeudeId`, kennung: 'haus_fehlt' })
  if (!zahlOk(h.x, -G.lage, G.lage, false)) out.push({ pfad: `${pfad}.x`, kennung: 'zahl' })
  if (!zahlOk(h.z, -G.lage, G.lage, false)) out.push({ pfad: `${pfad}.z`, kennung: 'zahl' })
  if (!DREHUNGEN.includes(h.drehung)) out.push({ pfad: `${pfad}.drehung`, kennung: 'form' })
  liste(h.geschosse, 0, G.geschosse, `${pfad}.geschosse`, out, (g, p) => pruefeGeschoss(g, p, out))
  if (Array.isArray(h.geschosse)) {
    const nummern = h.geschosse.map((g) => (istObj(g) ? g.geschoss : undefined))
    if (new Set(nummern).size !== nummern.length) out.push({ pfad: `${pfad}.geschosse`, kennung: 'doppelt' })
  }
}

/** Prueft innen wie die Datenbank (0045) und dazu Umlauf und Laenge der
 *  Oeffnungen. null ist gueltig (nichts drin). gebaeudeIds: die Haeuser
 *  der Siedlung; ohne sie wird nicht geprueft, ob jedes Haus existiert.
 *  Leere Liste heisst: alles gut. */
export function siedlungInnenPruefen(innen: unknown, gebaeudeIds: readonly string[] | null = null): InnenProblem[] {
  const out: InnenProblem[] = []
  if (innen === null) return out
  if (!Array.isArray(innen)) return [{ pfad: '', kennung: 'form' }]
  if (innen.length > G.haeuser) return [{ pfad: '', kennung: 'anzahl' }]
  if (jsonbTextLaenge(innen) > G.bytes) return [{ pfad: '', kennung: 'groesse' }]
  innen.forEach((h, i) => pruefeHaus(h, `[${i}]`, gebaeudeIds, out))
  const ids = innen.map((h) => (istObj(h) ? h.gebaeudeId : undefined))
  if (new Set(ids).size !== ids.length) out.push({ pfad: '', kennung: 'doppelt' })
  return out
}
