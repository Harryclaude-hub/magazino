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
import { flaeche2, objektGlobal, objektRechtecke, wandStuecke, zuUmriss, type Punkt } from '../../lib/geometrie.ts'
import { innenNormale, kisteAusdehnung, oeffnungPunkte, spaltenBereich, streckenAbstand } from '../plan/hilfe.ts'
import type { GrundrissDaten, Objekt, Raum } from '../../lib/types'

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
  /** Farbe der Kanten, null ohne Kanten. */
  kante: string | null
  /** Id der Kiste oder des Objekts, sonst null. */
  id: string | null
  /** Gesuchte oder gewaehlte Kiste (bzw. Moebel). */
  hervor: boolean
  /** Bei Waenden: Einheitsnormale zur Raum-Innenseite in (x, z). Zeigt
   *  die Aussenseite zur Kamera, wird die Wand halbdurchsichtig. */
  innen: [number, number] | null
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
    const a: Punkt = istEcke(r, s.a) ? [s.a[0] - ux * h, s.a[1] - uy * h] : s.a
    const b: Punkt = istEcke(r, s.b) ? [s.b[0] + ux * h, s.b[1] + uy * h] : s.b
    const innen = raumInnen(r, s.kante)
    const farbe = s.farbe ?? f.wand3d
    const H = r.hoehe_cm
    const wand = streifen('wand', a, b, 0, H - KOPF_CM, WAND_CM, farbe, { kante: f.wand, innen })
    const kopf = streifen('wandkopf', a, b, H - KOPF_CM, H, WAND_CM, f.wand, { innen })
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

    if (o.art === 'tuer') {
      const th = Math.min(o.hoehe_cm, H)
      // Sturz ueber der Tuer, in der Wandfarbe.
      dazu(streifen('sturz', a, b, th, H - KOPF_CM, WAND_CM, wf, { kante: f.wand, innen }))
      dazu(streifen('wandkopf', a, b, H - KOPF_CM, H, WAND_CM, f.wand, { innen }))
      // Zarge: zwei Pfosten und oben ein Streifen, orange.
      const z = Math.min(ZARGE_CM, l / 4)
      dazu(streifen('zarge', bei(0), bei(z), 0, th, WAND_CM + 2, f.tuer))
      dazu(streifen('zarge', bei(l - z), bei(l), 0, th, WAND_CM + 2, f.tuer))
      dazu(streifen('zarge', a, b, Math.max(0, th - z), th, WAND_CM + 2, f.tuer))
      // Blatt: an der Angel, 25 Grad offen zur Aufschlagseite.
      const rechts = o.anschlag === 'rechts'
      const angel: Punkt = rechts ? bei(l - z) : bei(z)
      const gx = rechts ? -ux : ux
      const gy = rechts ? -uy : uy
      const seite = o.aufschlag === 'aussen' ? -1 : 1
      const w = (TUER_OFFEN_GRAD * Math.PI) / 180
      const dx = Math.cos(w) * gx + Math.sin(w) * seite * innen[0]
      const dy = Math.cos(w) * gy + Math.sin(w) * seite * innen[1]
      const lang = Math.max(1, l - 2 * z)
      dazu(
        streifen('tuerblatt', angel, [angel[0] + dx * lang, angel[1] + dy * lang], 0, Math.max(1, th - z), BLATT_CM, f.tuer, {
          kante: f.wand,
        }),
      )
    } else {
      const br = Math.max(0, Math.min(o.bruestung_cm, H))
      const top = Math.min(H, br + o.hoehe_cm)
      dazu(streifen('bruestung', a, b, 0, br, WAND_CM, wf, { kante: f.wand, innen }))
      dazu(streifen('sturz', a, b, top, H - KOPF_CM, WAND_CM, wf, { kante: f.wand, innen }))
      dazu(streifen('wandkopf', a, b, H - KOPF_CM, H, WAND_CM, f.wand, { innen }))
      // Rahmen blau: unten (Fensterbank), oben, links, rechts.
      const z = Math.min(RAHMEN_CM, l / 4)
      dazu(streifen('rahmen', a, b, br, br + RAHMEN_CM, WAND_CM + 4, f.fenster))
      dazu(streifen('rahmen', a, b, top - RAHMEN_CM, top, WAND_CM, f.fenster))
      dazu(streifen('rahmen', bei(0), bei(z), br, top, WAND_CM, f.fenster))
      dazu(streifen('rahmen', bei(l - z), bei(l), br, top, WAND_CM, f.fenster))
      dazu(
        streifen('scheibe', bei(z), bei(l - z), br + RAHMEN_CM, top - RAHMEN_CM, 2, f.fenster, {
          deckkraft: SCHEIBE_DECKKRAFT,
        }),
      )
    }
  }
  return out
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

function objekte(liste: Objekt[], f: Farben3D, hervor: string | null): Koerper[] {
  const out: Koerper[] = []
  for (const o of liste) {
    const ist = !!hervor && o.item_id === hervor
    const farbe = ist ? f.hervor : (o.farbe ?? f.objekt)
    const mehr = { kante: ist ? f.kisteRand : f.objektRand, id: o.id, hervor: ist }
    const H = o.hoehe_cm
    if (o.art === 'moebel' || o.form === 'l') {
      // Moebel als Quader, die L-Form als zwei.
      for (const r of objektRechtecke(o)) {
        out.push(
          quader('moebel', [m((r.x0 + r.x1) / 2), m(H / 2), m((r.y0 + r.y1) / 2)], [m(r.x1 - r.x0), m(H), m(r.y1 - r.y0)], farbe, mehr),
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
    for (const q of teile) if (q) out.push(q)
  }
  return out
}

function kisten(daten: GrundrissDaten, f: Farben3D, raumId: string | null, hervor: string | null): Koerper[] {
  const liste = raumId ? daten.kisten.filter((k) => k.platz_raum_id === raumId) : daten.kisten
  const gibtHervor = !!hervor && liste.some((k) => k.id === hervor)
  return liste.map((k) => {
    const [ex, ey] = kisteAusdehnung(k)
    const ist = k.id === hervor
    // Einen halben cm kleiner, damit Kanten gestapelter Kisten sichtbar bleiben.
    return quader(
      'kiste',
      [m(k.platz_x), m(k.unten_cm + k.hoehe_cm / 2), m(k.platz_y)],
      [m(Math.max(1, ex - 0.5)), m(Math.max(1, k.hoehe_cm - 0.5)), m(Math.max(1, ey - 0.5))],
      ist ? f.hervor : (k.mark_color ?? k.room_color ?? f.objekt),
      { kante: f.kisteRand, id: k.id, hervor: ist, deckkraft: gibtHervor && !ist ? GEDAEMPFT : 1 },
    )
  })
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
      farbe: r.bodenfarbe ?? (r.art === 'draussen' ? farben.bodenDraussen : farben.boden),
      deckkraft: 1,
      id: r.id,
    })
  }
  out.push(...waende(daten, raeume, farben, raumId))
  out.push(...oeffnungen(daten, raeume, farben, raumId))
  out.push(...objekte(raumId ? daten.objekte.filter((o) => o.raum_id === raumId) : daten.objekte, farben, hervor))
  out.push(...kisten(daten, farben, raumId, hervor))
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
