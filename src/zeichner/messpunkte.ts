/* Messpunkte der Wohnung (E90): die Stellen, an denen man fuer den Umzug
 * misst. Karam: "Wenn ich auf Messen druecke, sind die relevanten Punkte
 * der Wohnung wichtiger: Tuer, zwischen Tuer und Wand, zwischen dieser
 * Seite der Tuer und der anderen Seite der Tuer."
 *
 * Messpunkte sind:
 *  - jede Ecke jedes Raums ('ecke'),
 *  - beide Enden jeder Tuer, jedes Durchgangs und jedes Fensters. Der
 *    Anfang auf der Kante heisst links, das Ende rechts, genau wie bei der
 *    Angel (anschlag),
 *  - bei Tueren und Durchgaengen dieselben Enden auf der anderen Seite der
 *    Wand, wenn dort ein Nachbarraum mit paralleler Kante hoechstens
 *    WAND_DURCH_CM (40 cm) entfernt liegt (dicke Wand). So misst man die
 *    Wanddicke und die lichte Weite von beiden Seiten. Teilen sich die
 *    Raeume die Kante, fallen diese Punkte mit den Enden zusammen.
 * Punkte, die naeher als 0,5 cm beieinander liegen, zaehlen einmal. Die
 * Oeffnung gewinnt vor der Gegenseite, die Gegenseite vor der Ecke.
 * Stossen zwei Oeffnungen aneinander (Balkontuer direkt neben dem
 * Fenster), bleibt der Punkt der ersten, das Ende der zweiten geht aber
 * nicht verloren: es steht in auch. So erkennt istLichte auch die Lichte
 * der zweiten Oeffnung, und der Name nennt beide.
 *
 * Dazu die Schnellmasse einer Oeffnung: ihre Breite und der Abstand jedes
 * Endes bis zur naechsten Ecke an derselben Kante, bei Tueren und
 * Durchgaengen auch auf der anderen Seite der Wand.
 *
 * Gemessen wird an den gezeichneten Kanten, wie die Masse an jeder Wand
 * (Leinwand, wandMasse). Reine Rechnung ohne React und ohne Browser,
 * geprueft in scripts/zeichner-pruefen.mjs.
 */
import { flaeche2, zuUmriss, WAND_DURCH_CM, type Punkt } from '../lib/geometrie.ts'
import { oeffnungPunkte, raumTitel } from '../components/plan/hilfe.ts'
import { fangen } from './fangen.ts'
import type { Oeffnung, Raum } from '../lib/types'

export type MesspunktArt = 'ecke' | 'tuer' | 'durchgang' | 'fenster'

export interface Messpunkt {
  p: Punkt
  art: MesspunktArt
  /** Zu welchem Raum der Punkt gehoert: die Ecke dem Raum der Ecke, ein
   *  Ende dem Raum seiner Oeffnung. */
  raumId: string
  /** Name dieses Raums fuer die Anzeige, leer wenn er keinen hat. */
  raum: string
  /** Nur bei Oeffnungen: welche und welches Ende. */
  oeffnungId?: string
  ende?: 'links' | 'rechts'
  /** Auf der anderen Seite der Wand (nur Tueren und Durchgaenge). */
  gegenueber?: boolean
  /** Enden anderer Oeffnungen, die auf denselben Punkt fallen (zwei
   *  Oeffnungen stossen aneinander). Ohne eigenen Punkt, es ist dieser. */
  auch?: MesspunktEnde[]
}

/** Ein Ende einer Oeffnung ohne Lage, fuer Messpunkt.auch. */
export type MesspunktEnde = Omit<Messpunkt, 'p' | 'auch'>

type MessDaten = { raeume: Raum[]; oeffnungen: Oeffnung[] }

/** Naeher als das gilt als derselbe Punkt (cm). */
const GLEICH_CM = 0.5

/** Nach aussen zeigende Einheitsnormale der Kante k von r. */
function aussenNormale(r: Pick<Raum, 'punkte'>, k: number): Punkt {
  const n = r.punkte.length
  const a = r.punkte[k]
  const b = r.punkte[(k + 1) % n]
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
  const sinn = flaeche2(zuUmriss(r.punkte)) >= 0 ? 1 : -1
  return [((b[1] - a[1]) / l) * sinn, (-(b[0] - a[0]) / l) * sinn]
}

interface Gegenkante {
  raumId: string
  /** Anfang und Richtung der Nachbarkante, ihre Laenge. */
  c: Punkt
  v: Punkt
  laenge: number
  /** Die beiden Enden der Oeffnung, auf die Nachbarkante gelegt, als
   *  Laenge ab c. */
  t0: number
  t1: number
}

/** Die Kante eines anderen Raums auf der anderen Seite der Wand einer
 *  Oeffnung (s0, s1 auf Kante k von r): parallel, Aussenseiten
 *  gegeneinander, hoechstens WAND_DURCH_CM entfernt und so lang, dass
 *  beide Enden der Oeffnung auf ihr liegen. Die naechste gewinnt. */
function gegenkante(daten: MessDaten, r: Raum, k: number, s0: Punkt, s1: Punkt): Gegenkante | null {
  const aussen = aussenNormale(r, k)
  let beste: Gegenkante | null = null
  let bester = Infinity
  for (const q of daten.raeume) {
    if (q.id === r.id) continue
    const n = q.punkte.length
    if (n < 3) continue
    for (let j = 0; j < n; j++) {
      const c = q.punkte[j]
      const d = q.punkte[(j + 1) % n]
      const laenge = Math.hypot(d[0] - c[0], d[1] - c[1])
      if (laenge === 0) continue
      const qa = aussenNormale(q, j)
      // Aussenseiten zeigen gegeneinander (wie wandFuellungen in geometrie.ts).
      if (qa[0] * aussen[0] + qa[1] * aussen[1] > -0.999) continue
      // Wie weit die Nachbarkante vor der Wand liegt, nach aussen gezaehlt.
      const abstand = (c[0] - s0[0]) * aussen[0] + (c[1] - s0[1]) * aussen[1]
      if (abstand < -GLEICH_CM || abstand > WAND_DURCH_CM) continue
      const v: Punkt = [(d[0] - c[0]) / laenge, (d[1] - c[1]) / laenge]
      const t0 = (s0[0] - c[0]) * v[0] + (s0[1] - c[1]) * v[1]
      const t1 = (s1[0] - c[0]) * v[0] + (s1[1] - c[1]) * v[1]
      const drin = (t: number) => t >= -GLEICH_CM && t <= laenge + GLEICH_CM
      if (!drin(t0) || !drin(t1)) continue
      if (abstand < bester) {
        bester = abstand
        beste = { raumId: q.id, c, v, laenge, t0, t1 }
      }
    }
  }
  return beste
}

function aufKante(g: Gegenkante, t: number): Punkt {
  return [g.c[0] + g.v[0] * t, g.c[1] + g.v[1] * t]
}

/** Alle Messpunkte der Wohnung, ohne doppelte (siehe oben). Das Ergebnis
 *  haengt nur an raeume und oeffnungen und wird fuer dieselben Listen
 *  einmal gerechnet: der Zeichner fragt bei jeder Mausbewegung. */
export function messpunkte(daten: MessDaten): Messpunkt[] {
  const alt = ablage.get(daten.raeume)
  if (alt && alt.oeffnungen === daten.oeffnungen) return alt.liste
  const liste = messpunkteRechnen(daten)
  ablage.set(daten.raeume, { oeffnungen: daten.oeffnungen, liste })
  return liste
}

const ablage = new WeakMap<object, { oeffnungen: Oeffnung[]; liste: Messpunkt[] }>()

function messpunkteRechnen(daten: MessDaten): Messpunkt[] {
  const enden: Messpunkt[] = []
  const gegen: Messpunkt[] = []
  for (const o of daten.oeffnungen) {
    const r = daten.raeume.find((x) => x.id === o.raum_id)
    const s = r ? oeffnungPunkte(r, o) : null
    if (!r || !s) continue
    const raum = raumTitel(r)
    enden.push({ p: s[0], art: o.art, raumId: r.id, raum, oeffnungId: o.id, ende: 'links' })
    enden.push({ p: s[1], art: o.art, raumId: r.id, raum, oeffnungId: o.id, ende: 'rechts' })
    if (o.art === 'fenster') continue
    const g = gegenkante(daten, r, o.kante, s[0], s[1])
    if (!g) continue
    gegen.push({ p: aufKante(g, g.t0), art: o.art, raumId: r.id, raum, oeffnungId: o.id, ende: 'links', gegenueber: true })
    gegen.push({ p: aufKante(g, g.t1), art: o.art, raumId: r.id, raum, oeffnungId: o.id, ende: 'rechts', gegenueber: true })
  }
  const ecken: Messpunkt[] = []
  for (const r of daten.raeume) {
    const raum = raumTitel(r)
    for (const p of r.punkte) ecken.push({ p: [p[0], p[1]], art: 'ecke', raumId: r.id, raum })
  }
  // Reihenfolge ist Vorrang: wer zuerst steht, bleibt. Faellt ein Ende
  // auf das Ende einer anderen Oeffnung, kommt es dort in auch.
  const out: Messpunkt[] = []
  for (const m of [...enden, ...gegen, ...ecken]) {
    const i = out.findIndex((x) => Math.hypot(x.p[0] - m.p[0], x.p[1] - m.p[1]) < GLEICH_CM)
    if (i < 0) {
      out.push(m)
      continue
    }
    const x = out[i]
    if (m.oeffnungId === undefined || x.oeffnungId === undefined || x.oeffnungId === m.oeffnungId) continue
    if ((x.auch ?? []).some((a) => a.oeffnungId === m.oeffnungId)) continue
    const ende: MesspunktEnde = { art: m.art, raumId: m.raumId, raum: m.raum, oeffnungId: m.oeffnungId, ende: m.ende }
    if (m.gegenueber) ende.gegenueber = true
    out[i] = { ...x, auch: [...(x.auch ?? []), ende] }
  }
  return out
}

/** Der Punkt selbst und alle Enden in auch. */
function endenVon(m: Messpunkt): MesspunktEnde[] {
  return [m, ...(m.auch ?? [])]
}

/** Der Messpunkt, der p am naechsten liegt, hoechstens toleranz cm weit. */
export function messpunktAn(liste: Messpunkt[], p: Punkt, toleranz: number): Messpunkt | null {
  let beste: Messpunkt | null = null
  let bester = toleranz
  for (const m of liste) {
    const d = Math.hypot(m.p[0] - p[0], m.p[1] - p[1])
    if (d <= bester) {
      bester = d
      beste = m
    }
  }
  return beste
}

/** Einrasten fuer das Messen: zuerst der naechste Messpunkt (Ecke, Ende
 *  einer Oeffnung, Gegenseite), dann ein Punkt auf einer Wand, dann das
 *  Raster. */
export function messFangen(
  daten: MessDaten,
  p: Punkt,
  opt: { raster: number; toleranz: number },
): { p: Punkt; messpunkt: Messpunkt | null } {
  const m = messpunktAn(messpunkte(daten), p, opt.toleranz)
  if (m) return { p: [m.p[0], m.p[1]], messpunkt: m }
  return { p: fangen(daten, p, { raster: opt.raster, toleranz: opt.toleranz, kanten: true }).p, messpunkt: null }
}

/** Sind a und b die beiden Enden derselben Oeffnung, auf derselben Seite
 *  der Wand? Dann ist der Abstand ihre lichte Weite. Gezaehlt werden auch
 *  die Enden in auch (zwei Oeffnungen stossen aneinander). */
export function istLichte(a: Messpunkt | null, b: Messpunkt | null): boolean {
  if (!a || !b) return false
  return endenVon(a).some((x) =>
    endenVon(b).some(
      (y) =>
        x.art !== 'ecke' &&
        x.oeffnungId !== undefined &&
        x.oeffnungId === y.oeffnungId &&
        x.ende !== y.ende &&
        !!x.gegenueber === !!y.gegenueber,
    ),
  )
}

export interface Schnellmass {
  /** Die Masslinie, um versatz von der Wand abgerueckt. */
  a: Punkt
  b: Punkt
  /** Dieselben Enden auf der Kante (fuer die kurzen Hilfsstriche). */
  wandA: Punkt
  wandB: Punkt
  laenge: number
  /** 'breite': die Oeffnung selbst; 'links'/'rechts': vom Ende bis zur
   *  naechsten Ecke auf dieser Seite. */
  art: 'breite' | 'links' | 'rechts'
  gegenueber: boolean
}

/** Schnellmasse einer Oeffnung: Breite und die Abstaende ihrer Enden bis
 *  zur naechsten Ecke an derselben Kante, abgerueckt um versatz cm in den
 *  Raum (bei der Gegenseite in den Nachbarraum). Abstaende unter 1 cm
 *  fehlen (Oeffnung in der Ecke). Die Gegenseite fehlt, wenn sie genau
 *  dieselben Zahlen haette. */
export function schnellMasse(daten: MessDaten, oeffnungId: string, versatz: number): Schnellmass[] {
  const o = daten.oeffnungen.find((x) => x.id === oeffnungId)
  const r = o ? daten.raeume.find((x) => x.id === o.raum_id) : null
  const s = o && r ? oeffnungPunkte(r, o) : null
  if (!o || !r || !s) return []
  const n = r.punkte.length
  const ka = r.punkte[o.kante]
  const kb = r.punkte[(o.kante + 1) % n]
  const laenge = Math.hypot(kb[0] - ka[0], kb[1] - ka[1])
  const aussen = aussenNormale(r, o.kante)
  const ab = (p: Punkt, um: number): Punkt => [p[0] + aussen[0] * um, p[1] + aussen[1] * um]
  const out: Schnellmass[] = []
  const dazu = (wandA: Punkt, wandB: Punkt, l: number, art: Schnellmass['art'], gegenueber: boolean, um: number) => {
    if (l < 1) return
    out.push({ a: ab(wandA, um), b: ab(wandB, um), wandA, wandB, laenge: l, art, gegenueber })
  }
  const vorne = Math.max(0, o.abstand_cm)
  const hinten = Math.max(0, laenge - o.abstand_cm - o.breite_cm)
  dazu(s[0], s[1], o.breite_cm, 'breite', false, -versatz)
  dazu(ka, s[0], vorne, 'links', false, -versatz)
  dazu(s[1], kb, hinten, 'rechts', false, -versatz)
  if (o.art === 'fenster') return out
  const g = gegenkante(daten, r, o.kante, s[0], s[1])
  if (!g) return out
  // Auf der Nachbarkante: links ist das Ende ueber s0, rechts das ueber s1.
  const p0 = aufKante(g, g.t0)
  const p1 = aufKante(g, g.t1)
  const ecke0 = aufKante(g, g.t0 <= g.t1 ? 0 : g.laenge)
  const ecke1 = aufKante(g, g.t0 <= g.t1 ? g.laenge : 0)
  const l0 = Math.abs(g.t0 - (g.t0 <= g.t1 ? 0 : g.laenge))
  const l1 = Math.abs((g.t0 <= g.t1 ? g.laenge : 0) - g.t1)
  if (Math.abs(l0 - vorne) < GLEICH_CM && Math.abs(l1 - hinten) < GLEICH_CM) return out
  // Die Nachbarkante liegt schon um ihren Abstand draussen; von dort weiter.
  dazu(ecke0, p0, l0, 'links', true, versatz)
  dazu(p1, ecke1, l1, 'rechts', true, versatz)
  return out
}
