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
import type { GrundrissDaten, Objekt, Oeffnung, PlanKiste, PlanSymbol, Raum } from '../../lib/types'
import { moebelArt } from './moebelArt.ts'

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
  // Erst was auf dem Teppich steht, dann der Teppich selbst (E74).
  for (const teppich of [false, true]) {
    for (let i = daten.objekte.length - 1; i >= 0; i--) {
      const o = daten.objekte[i]
      if ((moebelArt(o.name ?? '') === 'teppich') !== teppich) continue
      if (objektEnthaelt(o, p[0], p[1])) return { art: 'objekt', id: o.id }
    }
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


/** Wo eine Steckdose oder ein Schalter wirklich sitzt (E74): an der
 *  naechsten Wand des Raums, in dem der Punkt liegt, auf der Innenseite und
 *  nicht in einer Tuer, einem Fenster oder Durchgang (auch nicht in dem des
 *  Nachbarraums in derselben Wand). innen zeigt in den Raum. Liegt der
 *  Punkt in keinem Raum, null. So schwebt nichts im Raum, auch wenn der
 *  Punkt etwas neben der Wand gesetzt wurde. */
export function symbolAnWand(
  p: Punkt,
  daten: Pick<GrundrissDaten, 'raeume' | 'oeffnungen'>,
): { punkt: Punkt; innen: Punkt; raumId: string } | null {
  const raum = daten.raeume.find((r) => r.punkte.length >= 3 && punktImPolygon(zuUmriss(r.punkte), p[0], p[1]))
  if (!raum) return null
  const w = naechsteWand(p, raum, oeffnungsLoecher(daten))
  return w ? { punkt: w.punkt, innen: w.innen, raumId: raum.id } : null
}

/** Anfang und Ende aller Oeffnungen (Tueren, Fenster, Durchgaenge) in cm. */
export function oeffnungsLoecher(daten: Pick<GrundrissDaten, 'raeume' | 'oeffnungen'>): [Punkt, Punkt][] {
  const loecher: [Punkt, Punkt][] = []
  for (const o of daten.oeffnungen) {
    const r = daten.raeume.find((x) => x.id === o.raum_id)
    const s = r ? oeffnungPunkte(r, o) : null
    if (s) loecher.push(s)
  }
  return loecher
}

/** Liegt q, ein Punkt auf einer Wand mit der Richtung (rx, ry), in einer
 *  Oeffnung dieser Wand (gleiche Richtung, hoechstens eine dicke Wand
 *  daneben, 5 cm Rand)? */
export function inOeffnung(q: Punkt, rx: number, ry: number, loecher: [Punkt, Punkt][]): boolean {
  return loecher.some(([s0, s1]) => {
    const sl = Math.hypot(s1[0] - s0[0], s1[1] - s0[1])
    if (sl === 0) return false
    const sx = (s1[0] - s0[0]) / sl
    const sy = (s1[1] - s0[1]) / sl
    if (Math.abs(sx * ry - sy * rx) > 0.01) return false
    const quer = Math.abs((q[0] - s0[0]) * sy - (q[1] - s0[1]) * sx)
    const laengs = (q[0] - s0[0]) * sx + (q[1] - s0[1]) * sy
    return quer <= 41 && laengs > -5 && laengs < sl + 5
  })
}

/** Die naechste Wand des Raums zu p: Punkt auf ihrer Innenseite, Richtung
 *  in den Raum und ob die Stelle frei ist (nicht in einer Oeffnung). Freie
 *  Stellen gehen vor; p darf auch knapp ausserhalb des Raums liegen. */
function naechsteWand(p: Punkt, raum: Pick<Raum, 'punkte'>, loecher: [Punkt, Punkt][]): { punkt: Punkt; innen: Punkt; frei: boolean } | null {
  const sinn = flaeche2(zuUmriss(raum.punkte)) >= 0 ? 1 : -1
  const n = raum.punkte.length
  let beste: { punkt: Punkt; innen: Punkt; d: number; frei: boolean } | null = null
  for (let k = 0; k < n; k++) {
    const a = raum.punkte[k]
    const b = raum.punkte[(k + 1) % n]
    const l = Math.hypot(b[0] - a[0], b[1] - a[1])
    // Zu kurz fuer ein Zeichen (Stufe, Knick): ueberspringen.
    if (l < 2 * WAND_HALB_CM + 10) continue
    const rx = (b[0] - a[0]) / l
    const ry = (b[1] - a[1]) / l
    const t = Math.max(WAND_HALB_CM + 5, Math.min(l - WAND_HALB_CM - 5, (p[0] - a[0]) * rx + (p[1] - a[1]) * ry))
    const q: Punkt = [a[0] + rx * t, a[1] + ry * t]
    const innen: Punkt = [-ry * sinn, rx * sinn]
    const frei = !inOeffnung(q, rx, ry, loecher)
    const d = Math.hypot(p[0] - q[0], p[1] - q[1])
    const kandidat = { punkt: [q[0] + innen[0] * WAND_HALB_CM, q[1] + innen[1] * WAND_HALB_CM] as Punkt, innen, d, frei }
    if (!beste || (kandidat.frei && !beste.frei) || (kandidat.frei === beste.frei && d < beste.d)) beste = kandidat
  }
  return beste ? { punkt: beste.punkt, innen: beste.innen, frei: beste.frei } : null
}

/** Ein Lichtschalter, den der Plan nicht hat (E82): jeder Raum bekommt
 *  einen, wenn ihn kein Schalter schaltet. Nur Anzeige, nie gespeichert,
 *  nicht zu bearbeiten. id 'auto:<raumId>', schaltet den Raum. */
export type AutoSchalter = PlanSymbol & { art: 'schalter'; schaltet: string; auto: true }

/** So weit neben der Zarge (cm) sitzt ein automatischer Schalter. */
const AUTO_SCHALTER_CM = 15
/** So weit in den Raum hinein wird gesucht, bevor er an die Wand rueckt. */
const AUTO_SCHALTER_INNEN_CM = 20

/** Automatische Lichtschalter fuer jeden Raum (innen und draussen) ohne
 *  Schalter. Ein Raum hat einen, wenn ein Schalter ihn schaltet: laut Plan
 *  (schaltet) oder weil er an seiner Wand sitzt (symbolAnWand), genau wie
 *  in der 3D-Szene. Der neue sitzt wie ueblich an der Griffseite der
 *  ersten Tuer (oder des ersten Durchgangs) des Raums, gegenueber der
 *  Angel, 15 cm neben der Zarge, innen an einer freien Wandstelle. Ohne
 *  Tuer an der freien Wand, die der Raummitte am naechsten ist. Schmale
 *  Flaechen (Vorwand, unter 60 cm) bekommen keinen. Reine Rechnung. */
export function autoSchalter(
  daten: Pick<GrundrissDaten, 'raeume' | 'oeffnungen'> & { grundriss: { symbole?: PlanSymbol[] | null } },
): AutoSchalter[] {
  const raeume = daten.raeume.filter((r) => r.punkte.length >= 3)
  const geschaltet = new Set<string>()
  for (const s of daten.grundriss.symbole ?? []) {
    if (s.art !== 'schalter') continue
    const w = symbolAnWand([s.x, s.y], daten)
    if (!w) continue
    geschaltet.add(s.schaltet && raeume.some((r) => r.id === s.schaltet) ? s.schaltet : w.raumId)
  }
  const loecher = oeffnungsLoecher(daten)
  const out: AutoSchalter[] = []
  for (const r of raeume) {
    if (geschaltet.has(r.id)) continue
    const box = punkteBox(r.punkte)
    if (Math.min(box.x1 - box.x0, box.y1 - box.y0) < 60) continue
    const stelle = schalterStelle(r, daten, loecher)
    if (!stelle) continue
    out.push({ id: `auto:${r.id}`, art: 'schalter', x: stelle[0], y: stelle[1], schaltet: r.id, auto: true })
  }
  return out
}

/** Wo der automatische Schalter von r sitzt (cm, Innenseite der Wand). */
function schalterStelle(r: Raum, daten: Pick<GrundrissDaten, 'raeume' | 'oeffnungen'>, loecher: [Punkt, Punkt][]): Punkt | null {
  const n = r.punkte.length
  // Tueren und Durchgaenge des Raums, danach die der Nachbarn auf seinem Rand.
  const eigene: { o: Oeffnung; s: [Punkt, Punkt] }[] = []
  const fremde: { o: Oeffnung; s: [Punkt, Punkt] }[] = []
  for (const o of daten.oeffnungen) {
    if (o.art === 'fenster') continue
    const raum = daten.raeume.find((x) => x.id === o.raum_id)
    const s = raum ? oeffnungPunkte(raum, o) : null
    if (!s) continue
    if (o.raum_id === r.id) eigene.push({ o, s })
    else {
      const mitte: Punkt = [(s[0][0] + s[1][0]) / 2, (s[0][1] + s[1][1]) / 2]
      let nah = Infinity
      for (let k = 0; k < n; k++) nah = Math.min(nah, streckenAbstand(mitte, r.punkte[k], r.punkte[(k + 1) % n]).abstand)
      if (nah <= WAND_HALB_CM + 1) fremde.push({ o, s })
    }
  }
  for (const { o, s } of [...eigene, ...fremde]) {
    const angel = o.anschlag === 'rechts' ? s[1] : s[0]
    const griff = o.anschlag === 'rechts' ? s[0] : s[1]
    const l = Math.hypot(griff[0] - angel[0], griff[1] - angel[1])
    if (l === 0) continue
    const ux = (griff[0] - angel[0]) / l
    const uy = (griff[1] - angel[1]) / l
    // Innenrichtung von r an dieser Wand: senkrecht zur Oeffnung, zum Raum hin.
    const nx = -uy
    const ny = ux
    const mitte: Punkt = [(s[0][0] + s[1][0]) / 2, (s[0][1] + s[1][1]) / 2]
    const probe = punktImPolygon(zuUmriss(r.punkte), mitte[0] + nx * 20, mitte[1] + ny * 20)
    const seite = probe ? 1 : -1
    // Zuerst die Griffseite, sonst die Angelseite.
    for (const [ende, richtung] of [[griff, 1], [angel, -1]] as [Punkt, number][]) {
      const p: Punkt = [
        ende[0] + ux * richtung * AUTO_SCHALTER_CM + nx * seite * AUTO_SCHALTER_INNEN_CM,
        ende[1] + uy * richtung * AUTO_SCHALTER_CM + ny * seite * AUTO_SCHALTER_INNEN_CM,
      ]
      const w = naechsteWand(p, r, loecher)
      if (w?.frei && Math.hypot(w.punkt[0] - p[0], w.punkt[1] - p[1]) <= 60) return w.punkt
    }
  }
  const w = naechsteWand(innenPunkt(r.punkte), r, loecher)
  return w ? w.punkt : null
}
