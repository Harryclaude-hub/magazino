/* Rechnen fuer die Anzeige eines Grundrisses: Rahmen, Beschriftungspunkt,
 * Umriss eines Objekts, was unter dem Zeiger liegt. Reine Funktionen ohne
 * React, damit PlanBild, Zeichner und die Pruefung (scripts/zeichner-
 * pruefen.mjs) dieselbe Rechnung benutzen.
 *
 * Entschieden wird hier nichts: ob etwas gilt, sagt die Datenbank
 * (0028), vorgerechnet wird in lib/geometrie.ts.
 */
import {
  flaeche2,
  kisteTraegt,
  objektEnthaelt,
  objektGlobal,
  punktImPolygon,
  zuUmriss,
  type ObjektForm,
  type Punkt,
  type Rechteck,
} from '../../lib/geometrie.ts'
import type { GrundrissDaten, Objekt, Oeffnung, PlanKiste, Raum } from '../../lib/types'

/** Name eines Raums: das Zimmer, sonst der eigene Name, sonst leer. */
export function raumTitel(r: Pick<Raum, 'tag_name' | 'name'>): string {
  return (r.tag_name ?? '').trim() || (r.name ?? '').trim()
}

export function punkteBox(p: Punkt[]): Rechteck {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const [x, y] of p) {
    if (x < x0) x0 = x
    if (y < y0) y0 = y
    if (x > x1) x1 = x
    if (y > y1) y1 = y
  }
  if (!Number.isFinite(x0)) return { x0: 0, y0: 0, x1: 0, y1: 0 }
  return { x0, y0, x1, y1 }
}

/** Rahmen um alles Gezeichnete (oder nur um einen Raum). null, wenn es
 *  nichts gibt. */
export function datenBox(daten: Pick<GrundrissDaten, 'raeume'>, raumId?: string | null): Rechteck | null {
  const raeume = raumId ? daten.raeume.filter((r) => r.id === raumId) : daten.raeume
  if (raeume.length === 0) return null
  return punkteBox(raeume.flatMap((r) => r.punkte))
}

/** Halbe Wandstaerke in cm: jede Wand ist 12 cm dick und steht mittig auf
 *  der Kante (PlanBild, wandStuecke). */
const WAND_HALB_CM = 6

/** Nutzflaeche in Quadratmetern, zwei Nachkommastellen (wie auf einem
 *  Wohnungsplan, 3,97 m2): die Flaeche innen
 *  bis an die gezeichneten Waende, wie sie auf einem Wohnungsplan steht
 *  (nicht bis zur Wandmitte). Rechnung: Flaeche des um die halbe
 *  Wandstaerke nach innen versetzten Umrisses, A - d*U + d^2 * Summe
 *  tan(Knick/2) ueber die Ecken (bei rechten Winkeln +1 je Aussenecke,
 *  -1 je Innenecke). */
export function flaecheQm(p: Punkt[]): number {
  const n = p.length
  if (n < 3) return 0
  const a2 = flaeche2(zuUmriss(p))
  const richtung = a2 >= 0 ? 1 : -1
  let umfang = 0
  let knicke = 0
  for (let i = 0; i < n; i++) {
    const a = p[(i + n - 1) % n]
    const b = p[i]
    const c = p[(i + 1) % n]
    umfang += Math.hypot(c[0] - b[0], c[1] - b[1])
    const w1 = Math.atan2(b[1] - a[1], b[0] - a[0])
    const w2 = Math.atan2(c[1] - b[1], c[0] - b[0])
    let knick = w2 - w1
    while (knick > Math.PI) knick -= 2 * Math.PI
    while (knick < -Math.PI) knick += 2 * Math.PI
    // Nur echte Ecken; fast gerade Knicke und Spitzen zaehlen nicht.
    if (Math.abs(knick) > 1e-6 && Math.abs(knick) < Math.PI - 1e-3) knicke += Math.tan((knick * richtung) / 2)
  }
  const d = WAND_HALB_CM
  const innen = Math.abs(a2) / 2 - d * umfang + d * d * knicke
  return Math.round(Math.max(0, innen) / 100) / 100
}

/** Ein Punkt sicher im Raum fuer die Beschriftung: der Schwerpunkt, und
 *  wenn der bei einem L-Raum draussen liegt, die Mitte des breitesten
 *  Stuecks auf seiner Hoehe. */
export function innenPunkt(p: Punkt[]): Punkt {
  const u = zuUmriss(p)
  const a2 = flaeche2(u)
  let cx = 0
  let cy = 0
  if (a2 !== 0) {
    for (let i = 0; i < p.length; i++) {
      const [x0, y0] = p[i]
      const [x1, y1] = p[(i + 1) % p.length]
      const k = x0 * y1 - x1 * y0
      cx += (x0 + x1) * k
      cy += (y0 + y1) * k
    }
    cx /= 3 * a2
    cy /= 3 * a2
  } else {
    const b = punkteBox(p)
    cx = (b.x0 + b.x1) / 2
    cy = (b.y0 + b.y1) / 2
  }
  if (punktImPolygon(u, cx, cy)) return [cx, cy]
  // Waagrechte Linie durch cy: Schnittpunkte mit den Kanten, breitestes Innenstueck.
  const xs: number[] = []
  for (let i = 0; i < p.length; i++) {
    const [ax, ay] = p[i]
    const [bx, by] = p[(i + 1) % p.length]
    if (ay > cy !== by > cy) xs.push(ax + ((cy - ay) * (bx - ax)) / (by - ay))
  }
  xs.sort((a, b) => a - b)
  let best: Punkt = p[0]
  let breite = -1
  for (let i = 0; i + 1 < xs.length; i += 2) {
    if (xs[i + 1] - xs[i] > breite) {
      breite = xs[i + 1] - xs[i]
      best = [(xs[i] + xs[i + 1]) / 2, cy]
    }
  }
  return best
}

/** Der Umriss eines Objekts in Grundriss-cm (4 Ecken, beim L 6). */
export function objektUmriss(o: ObjektForm): Punkt[] {
  const bw = o.breite_cm
  const bd = o.tiefe_cm
  let lokal: Punkt[]
  if (o.form === 'l' && o.ausschnitt_ecke) {
    const aw = o.ausschnitt_breite_cm ?? 0
    const ad = o.ausschnitt_tiefe_cm ?? 0
    switch (o.ausschnitt_ecke) {
      case 'lo':
        lokal = [[aw, 0], [bw, 0], [bw, bd], [0, bd], [0, ad], [aw, ad]]
        break
      case 'ro':
        lokal = [[0, 0], [bw - aw, 0], [bw - aw, ad], [bw, ad], [bw, bd], [0, bd]]
        break
      case 'ru':
        lokal = [[0, 0], [bw, 0], [bw, bd - ad], [bw - aw, bd - ad], [bw - aw, bd], [0, bd]]
        break
      default:
        lokal = [[0, 0], [bw, 0], [bw, bd], [aw, bd], [aw, bd - ad], [0, bd - ad]]
    }
  } else {
    lokal = [[0, 0], [bw, 0], [bw, bd], [0, bd]]
  }
  return lokal.map(([lx, ly]) => objektGlobal(o, lx, ly))
}

/** Ausdehnung einer Kiste in x und y (nach ihrer Drehung). */
export function kisteAusdehnung(k: Pick<PlanKiste, 'laenge_cm' | 'breite_cm' | 'platz_drehung'>): [number, number] {
  return k.platz_drehung === 90 ? [k.breite_cm, k.laenge_cm] : [k.laenge_cm, k.breite_cm]
}

export function kisteRechteck(
  k: Pick<PlanKiste, 'laenge_cm' | 'breite_cm' | 'platz_drehung' | 'platz_x' | 'platz_y'>,
): Rechteck {
  const [ex, ey] = kisteAusdehnung(k)
  return { x0: k.platz_x - ex / 2, y0: k.platz_y - ey / 2, x1: k.platz_x + ex / 2, y1: k.platz_y + ey / 2 }
}

/** Die unterste Kiste der Kette, auf der k (mittelbar) liegt. */
export function stapelWurzel(k: PlanKiste, kisten: PlanKiste[]): PlanKiste {
  let r = k
  for (let i = 0; i < 60 && r.unterlage_art === 'kiste'; i++) {
    const u = kisten.find((c) => c.id === r.unterlage_item_id)
    if (!u) break
    r = u
  }
  return r
}

/** Alle Kisten desselben Stapels wie k (von der Wurzel aufwaerts), nach
 *  Unterkante sortiert. */
export function stapelVon(k: PlanKiste, kisten: PlanKiste[]): PlanKiste[] {
  const wurzel = stapelWurzel(k, kisten)
  const out: PlanKiste[] = [wurzel]
  const offen = [wurzel.id]
  while (offen.length && out.length < 200) {
    const id = offen.shift() as string
    for (const c of kisten) {
      if (c.unterlage_art === 'kiste' && c.unterlage_item_id === id && !out.includes(c)) {
        out.push(c)
        offen.push(c.id)
      }
    }
  }
  return out.sort((a, b) => a.unten_cm - b.unten_cm)
}

/** Das Objekt, auf oder in dem die Kette von k endet (Fach oder oben
 *  drauf), sonst null. */
export function stapelObjekt(k: PlanKiste, daten: Pick<GrundrissDaten, 'kisten' | 'objekte'>): Objekt | null {
  const w = stapelWurzel(k, daten.kisten)
  if (w.unterlage_art !== 'objekt' && w.unterlage_art !== 'fach') return null
  return daten.objekte.find((o) => o.id === w.unterlage_objekt_id) ?? null
}

/** Nach innen zeigende Einheitsnormale der Kante a -> b. Im Uhrzeigersinn
 *  am Bildschirm liegt das Innere rechts der Kante. */
export function innenNormale(a: Punkt, b: Punkt): Punkt {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const l = Math.hypot(dx, dy) || 1
  return [-dy / l, dx / l]
}

/** Abstand eines Punkts zur Strecke a-b und der Anteil t (0 bis 1) des
 *  naechsten Punkts auf ihr. */
export function streckenAbstand(p: Punkt, a: Punkt, b: Punkt): { abstand: number; t: number; punkt: Punkt } {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const l2 = dx * dx + dy * dy
  let t = l2 === 0 ? 0 : ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2
  t = Math.max(0, Math.min(1, t))
  const q: Punkt = [a[0] + t * dx, a[1] + t * dy]
  return { abstand: Math.hypot(p[0] - q[0], p[1] - q[1]), t, punkt: q }
}

export type PlanTreffer =
  | { art: 'kiste'; id: string }
  | { art: 'objekt'; id: string }
  | { art: 'oeffnung'; id: string }
  | { art: 'raum'; id: string }

/** Was liegt an p? Kisten zuerst (die oberste), dann Objekte, Tueren und
 *  Fenster (innerhalb der Toleranz in cm), zuletzt Raeume. */
export function trefferAn(
  daten: Pick<GrundrissDaten, 'raeume' | 'objekte' | 'kisten' | 'oeffnungen'>,
  p: Punkt,
  toleranz = 10,
  mitKisten = true,
): PlanTreffer | null {
  if (mitKisten) {
    let beste: PlanKiste | null = null
    for (const k of daten.kisten) {
      const traegt = kisteTraegt(
        { x: k.platz_x, y: k.platz_y, drehung: k.platz_drehung, laenge: k.laenge_cm, breite: k.breite_cm },
        p[0],
        p[1],
      )
      if (traegt && (!beste || k.oben_cm > beste.oben_cm)) beste = k
    }
    if (beste) return { art: 'kiste', id: beste.id }
  }
  const oeff = oeffnungAn(daten, p, toleranz)
  if (oeff) return { art: 'oeffnung', id: oeff.id }
  for (let i = daten.objekte.length - 1; i >= 0; i--) {
    const o = daten.objekte[i]
    if (objektEnthaelt(o, p[0], p[1])) return { art: 'objekt', id: o.id }
  }
  for (let i = daten.raeume.length - 1; i >= 0; i--) {
    const r = daten.raeume[i]
    if (punktImPolygon(zuUmriss(r.punkte), p[0], p[1])) return { art: 'raum', id: r.id }
  }
  return null
}

/** Anfang und Ende einer Oeffnung (Kommazahl, nur Zeichnung). */
export function oeffnungPunkte(r: Pick<Raum, 'punkte'>, o: Pick<Oeffnung, 'kante' | 'abstand_cm' | 'breite_cm'>): [Punkt, Punkt] | null {
  const n = r.punkte.length
  if (o.kante < 0 || o.kante >= n) return null
  const a = r.punkte[o.kante]
  const b = r.punkte[(o.kante + 1) % n]
  const l = Math.hypot(b[0] - a[0], b[1] - a[1])
  if (l === 0) return null
  const rx = (b[0] - a[0]) / l
  const ry = (b[1] - a[1]) / l
  const s: Punkt = [a[0] + rx * o.abstand_cm, a[1] + ry * o.abstand_cm]
  return [s, [s[0] + rx * o.breite_cm, s[1] + ry * o.breite_cm]]
}

export function oeffnungAn(
  daten: Pick<GrundrissDaten, 'raeume' | 'oeffnungen'>,
  p: Punkt,
  toleranz: number,
): Oeffnung | null {
  let beste: Oeffnung | null = null
  let bester = Infinity
  for (const o of daten.oeffnungen) {
    const r = daten.raeume.find((x) => x.id === o.raum_id)
    if (!r) continue
    const s = oeffnungPunkte(r, o)
    if (!s) continue
    const d = streckenAbstand(p, s[0], s[1]).abstand
    if (d <= toleranz && d < bester) {
      bester = d
      beste = o
    }
  }
  return beste
}

/** Lokaler Bereich (links, rechts in cm) von Spalte s eines Regals oder
 *  Schranks: gleich breit, 2 cm Teiler (wie objekt_im_fach). */
export function spaltenBereich(o: { breite_cm: number; spalten: number }, s: number): [number, number] {
  const S = Math.max(1, o.spalten)
  return [((s - 1) * (o.breite_cm + 2)) / S, (s * (o.breite_cm + 2)) / S - 2]
}
