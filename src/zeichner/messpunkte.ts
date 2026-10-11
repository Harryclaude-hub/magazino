/* Messpunkte der Wohnung (E90): die Stellen, an denen man fuer den Umzug
 * misst. Karam: "Wenn ich auf Messen druecke, sind die relevanten Punkte
 * der Wohnung wichtiger: Tuer, zwischen Tuer und Wand, zwischen dieser
 * Seite der Tuer und der anderen Seite der Tuer."
 *
 * E93: Gemessen wird an der Innenseite der Wand, die Wanddicke zaehlt nie
 * mit. Karam: "Ich will, dass die Messpunkte genau da sind, wo die Wand
 * endet." Jede Wand ist 12 cm dick und steht mittig auf der Raumkante
 * (PlanBild, wandStuecke), ihre Innenseite ist also die Kante, um
 * WAND_HALB_CM (6 cm) in ihren eigenen Raum geschoben. Das gilt fuer jede
 * Kante jedes Raums, auch draussen (Balkon, Terrasse): der Plan zeichnet
 * dort dieselbe Wand. So rechnet auch flaecheQm (E50).
 *
 * Messpunkte sind:
 *  - jede Innenecke jedes Raums ('ecke'): dort, wo sich die Innenseiten
 *    der beiden Kanten an der Ecke treffen (Schnitt der beiden um 6 cm
 *    verschobenen Linien, bei Aussen- und Innenecken). Beim rechten Winkel
 *    liegt sie 6 cm von beiden Kanten, fast gerade Ecken ergeben von
 *    selbst den Punkt 6 cm vor der Ecke. An einer einspringenden Ecke
 *    ueber 270 Grad (Pfeiler, Keil) liegt sie hinter den eckigen Enden der
 *    gezeichneten Waende: der Plan zeichnet die Spitze stumpf, gemauert
 *    treffen sich die Innenseiten dort. Eine Innenecke gibt es nicht, wenn
 *      - sie einer Kante ihres Raums naeher als 6 cm weniger 0,5 cm kaeme
 *        (sie laege in einer gezeichneten Wand, etwa bei einem schmalen
 *        Schlitz oder einem winzigen Versprung),
 *      - ihr Fusspunkt vor dem Anfang der Kante davor oder hinter dem Ende
 *        der Kante danach laege, weiter als die 6 cm der eckigen Wandenden
 *        und 0,5 cm (eine der beiden Kanten ist zu kurz fuer die Ecke),
 *      - die Innenseiten sich spitzer als SPITZ_GRAD (10 Grad) treffen:
 *        bei spitzeren Zipfeln laege der Punkt ueber 69 cm hinter der Ecke
 *        (6 cm / sin 5 Grad), so ein Zipfel ist eher ein Zeichenfehler als
 *        eine Stelle, an der man misst.
 *    Die Innenseite einer Kante reicht von Innenecke zu Innenecke. Fehlt
 *    die Innenecke, endet sie spaetestens mit der gezeichneten Wand (6 cm
 *    ueber die Kante hinaus), nie weiter in den Raum. Was von ihr in der
 *    gezeichneten Wand einer anderen Kante desselben Raums liegt (die
 *    Seiten eines Schlitzes oder einer Nische unter 12 cm), sieht man
 *    nicht; dort rastet das Messen nicht ein.
 *  - beide Enden jeder Tuer, jedes Durchgangs und jedes Fensters, an
 *    derselben Stelle entlang der Kante wie die Oeffnung, auf der
 *    Innenseite ihres Raums. Der Anfang auf der Kante heisst links, das
 *    Ende rechts, genau wie bei der Angel (anschlag). Die Lichte zwischen
 *    beiden Enden bleibt die Breite der Oeffnung. Tueren enden, wo die
 *    Maueroeffnung endet (keine eigenen Punkte fuer die Zarge),
 *  - bei Tueren und Durchgaengen dieselben Enden auf der anderen Seite der
 *    Wand, wenn dort ein Nachbarraum mit paralleler Kante hoechstens
 *    WAND_DURCH_CM (40 cm) entfernt liegt (gegenkante), auf der Innenseite
 *    des Nachbarraums. Von dieser Seite zur anderen misst man so die ganze
 *    gezeichnete Wanddicke: Abstand der Kanten plus 12 cm. Reicht die
 *    Oeffnung dort ueber eine Innenecke des Nachbarraums hinaus, steht ihr
 *    Ende auf dieser Innenecke, nicht in der quer stehenden Wand; die
 *    Lichte auf dieser Seite ist dann das, was dort offen ist.
 * Punkte, die naeher als 0,5 cm beieinander liegen, zaehlen einmal. Die
 * Oeffnung gewinnt vor der Gegenseite, die Gegenseite vor der Ecke.
 * Stossen zwei Oeffnungen aneinander (Balkontuer direkt neben dem
 * Fenster), bleibt der Punkt der ersten, das Ende der zweiten geht aber
 * nicht verloren: es steht in auch. So erkennt istLichte auch die Lichte
 * der zweiten Oeffnung, und der Name nennt beide.
 *
 * Dazu die Schnellmasse einer Oeffnung: ihre Breite und der Abstand jedes
 * Endes entlang der Innenseite bis zur Innenecke am Ende derselben Kante
 * (beim rechten Winkel abstand_cm weniger 6; fehlt die Innenecke, bis zum
 * Ende der Innenseite), bei Tueren und Durchgaengen auch auf der anderen
 * Seite der Wand bis zu den Innenecken des Nachbarraums.
 *
 * Die Masse an jeder Wand (Leinwand, wandMasse) bleiben Kantenlaengen:
 * dort tippt man die Laenge der Kante ein. Reine Rechnung ohne React und
 * ohne Browser, geprueft in scripts/zeichner-pruefen.mjs.
 */
import { einrasten, flaeche2, zuUmriss, WAND_DURCH_CM, type Punkt } from '../lib/geometrie.ts'
import { oeffnungPunkte, raumTitel, streckenAbstand, WAND_HALB_CM } from '../components/plan/hilfe.ts'
import type { Oeffnung, Raum } from '../lib/types'

export type MesspunktArt = 'ecke' | 'tuer' | 'durchgang' | 'fenster'

export interface Messpunkt {
  /** Lage auf der Innenseite der Wand (cm). */
  p: Punkt
  art: MesspunktArt
  /** Zu welchem Raum der Punkt gehoert: die Ecke dem Raum der Ecke, ein
   *  Ende dem Raum seiner Oeffnung (auch auf der Gegenseite). */
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

/** Spitzer als das (Grad zwischen den Innenseiten) gibt es keine Innenecke. */
const SPITZ_GRAD = 10
const SPITZ_MAX_CM = WAND_HALB_CM / Math.sin(((SPITZ_GRAD / 2) * Math.PI) / 180)

/** Die Innenseite einer Kante: die Kante, um WAND_HALB_CM in ihren Raum
 *  geschoben. Ein Punkt darauf ist a + u * t + n * WAND_HALB_CM; von und
 *  bis sind t an den Innenecken ihrer beiden Enden (beim rechten Winkel
 *  6 und laenge - 6, an einer einspringenden Ecke -6 und laenge + 6).
 *  Fehlt dort die Innenecke, endet sie mit der gezeichneten Wand, bei -6
 *  oder laenge + 6, wenn der Schnitt der Innenseiten weiter draussen laege. */
interface Innenseite {
  /** Anfang der Kante (Raumpunkt kante). */
  a: Punkt
  /** Einheitsrichtung entlang der Kante. */
  u: Punkt
  /** Einheitsnormale in den eigenen Raum. */
  n: Punkt
  laenge: number
  von: number
  bis: number
  /** Die Stuecke zwischen von und bis, die man sieht: ohne die Teile in
   *  der gezeichneten Wand einer anderen Kante desselben Raums (die Seiten
   *  eines Schlitzes oder einer Nische schmaler als 12 cm liegen ganz in
   *  der Wand gegenueber). Nur dort rastet das Messen ein. */
  teile: [number, number][]
}

/** Eine Kante eines Raums mit Richtung und Normale in den Raum. */
interface Kante {
  a: Punkt
  b: Punkt
  u: Punkt
  n: Punkt
  laenge: number
}

interface RaumInnen {
  /** Je Kante ihre Innenseite, null bei einer Kante der Laenge 0. */
  seiten: (Innenseite | null)[]
  /** Die Innenecken, die auf der sichtbaren Wand liegen (siehe oben), in
   *  der Reihenfolge der Raumpunkte. */
  ecken: Punkt[]
}

function punktAuf(s: Innenseite, t: number, weiter = 0): Punkt {
  const um = WAND_HALB_CM + weiter
  return [s.a[0] + s.u[0] * t + s.n[0] * um, s.a[1] + s.u[1] * t + s.n[1] * um]
}

/** Innenseiten und Innenecken eines Raums. */
function raumInnen(r: Raum): RaumInnen {
  const n = r.punkte.length
  if (n < 3) return { seiten: [], ecken: [] }
  const W = WAND_HALB_CM
  const sinn = flaeche2(zuUmriss(r.punkte)) >= 0 ? 1 : -1
  const kanten = r.punkte.map((a, k): Kante | null => {
    const b = r.punkte[(k + 1) % n]
    const laenge = Math.hypot(b[0] - a[0], b[1] - a[1])
    if (laenge === 0) return null
    const u: Punkt = [(b[0] - a[0]) / laenge, (b[1] - a[1]) / laenge]
    // Innen ist die Gegenrichtung der Aussennormale (wie gegenkante und
    // wandFuellungen sie rechnen): bei positivem Umlauf (-uy, ux).
    const nn: Punkt = [-u[1] * sinn, u[0] * sinn]
    return { a, b, u, n: nn, laenge }
  })
  // Je Ecke die Kante davor und die Kante danach (Kanten der Laenge 0
  // zaehlen nicht) und der Versatz von der Ecke zur Innenecke: der Punkt,
  // der von beiden Kanten WAND_HALB_CM nach innen liegt. Laufen die
  // Kanten genau zurueck (Zipfel ohne Breite), gibt es ihn nicht.
  const vor: number[] = []
  const nach: number[] = []
  const gehrung: (Punkt | null)[] = []
  for (let i = 0; i < n; i++) {
    let j = (i + n - 1) % n
    let k = i
    for (let x = 0; x < n && !kanten[j]; x++) j = (j + n - 1) % n
    for (let x = 0; x < n && !kanten[k]; x++) k = (k + 1) % n
    vor.push(j)
    nach.push(k)
    const e1 = kanten[j]
    const e2 = kanten[k]
    if (!e1 || !e2) {
      gehrung.push(null)
      continue
    }
    const nenner = 1 + e1.n[0] * e2.n[0] + e1.n[1] * e2.n[1]
    gehrung.push(nenner < 1e-9 ? null : [(W * (e1.n[0] + e2.n[0])) / nenner, (W * (e1.n[1] + e2.n[1])) / nenner])
  }
  // Die Innenecken, die es gibt (Regeln oben), je Ecke ob sie gilt.
  const ecken: Punkt[] = []
  const gilt: boolean[] = r.punkte.map(() => false)
  for (let i = 0; i < n; i++) {
    const m = gehrung[i]
    const e1 = kanten[vor[i]]
    const e2 = kanten[nach[i]]
    if (!m || !e1 || !e2) continue
    if (Math.hypot(m[0], m[1]) > SPITZ_MAX_CM) continue
    // Fusspunkt nicht vor dem Anfang von e1 und nicht hinter dem Ende von
    // e2 (samt der eckigen Enden, 6 cm). Hinter dem Ende von e1 und vor dem
    // Anfang von e2 liegt er an jeder einspringenden Ecke, das ist recht.
    const t1 = e1.laenge + m[0] * e1.u[0] + m[1] * e1.u[1]
    const t2 = m[0] * e2.u[0] + m[1] * e2.u[1]
    const rand = W + GLEICH_CM
    if (t1 < -rand || t2 > e2.laenge + rand) continue
    const p = r.punkte[i]
    const q: Punkt = [p[0] + m[0], p[1] + m[1]]
    // Nicht in einer gezeichneten Wand desselben Raums.
    if (kanten.some((e) => e !== null && streckenAbstand(q, e.a, e.b).abstand < W - GLEICH_CM)) continue
    gilt[i] = true
    ecken.push(q)
  }
  const seiten: (Innenseite | null)[] = kanten.map((e, k) => {
    if (!e) return null
    const ende = (k + 1) % n
    const m0 = gehrung[k]
    const m1 = gehrung[ende]
    let von = m0 ? m0[0] * e.u[0] + m0[1] * e.u[1] : 0
    let bis = e.laenge + (m1 ? m1[0] * e.u[0] + m1[1] * e.u[1] : 0)
    // Ohne Innenecke endet die Innenseite spaetestens mit der gezeichneten
    // Wand (Zipfel spitzer als 10 Grad), sonst liefe sie hinter der Spitze
    // Meter weit in den Raum.
    if (!gilt[k]) von = Math.max(von, -W)
    if (!gilt[ende]) bis = Math.min(bis, e.laenge + W)
    // Sichtbar ist, was nicht in der gezeichneten Wand einer anderen Kante
    // liegt. Die beiden Nachbarkanten zaehlen nicht: mit ihnen trifft sich
    // die Innenseite an der Innenecke.
    const p0: Punkt = [e.a[0] + e.n[0] * W, e.a[1] + e.n[1] * W]
    const verdeckt: [number, number][] = []
    kanten.forEach((f, j) => {
      if (!f || j === k || j === vor[k] || j === nach[ende]) return
      const x = inGezeichneterWand(p0, e.u, f)
      if (x) verdeckt.push(x)
    })
    verdeckt.sort((x, y) => x[0] - y[0])
    const teile: [number, number][] = []
    let t = von
    for (const [v0, v1] of [...verdeckt, [Infinity, Infinity] as [number, number]]) {
      const stueckBis = Math.min(v0, bis)
      if (stueckBis - t >= GLEICH_CM) teile.push([t, stueckBis])
      t = Math.max(t, v1)
      if (t >= bis) break
    }
    return { a: e.a, u: e.u, n: e.n, laenge: e.laenge, von, bis, teile }
  })
  return { seiten, ecken }
}

/** Wo die Linie p0 + u * t in der gezeichneten Wand der Kante f liegt: 12 cm
 *  breit, mittig, mit eckigen Enden 6 cm ueber die Kante hinaus (PlanBild,
 *  wandStuecke). Offener Bereich von t, null wenn nie. Ein Punkt auf dem
 *  Rand der Wand liegt nicht darin (1e-6 cm Spiel fuer Rechenrauschen). */
function inGezeichneterWand(p0: Punkt, u: Punkt, f: Kante): [number, number] | null {
  const W = WAND_HALB_CM
  const spiel = 1e-6
  let lo = -Infinity
  let hi = Infinity
  // Entlang der Kante von -W bis laenge + W, quer von -W bis W.
  const grenzen: [Punkt, number, number][] = [
    [f.u, -W + spiel, f.laenge + W - spiel],
    [f.n, -W + spiel, W - spiel],
  ]
  for (const [v, min, max] of grenzen) {
    const c0 = (p0[0] - f.a[0]) * v[0] + (p0[1] - f.a[1]) * v[1]
    const c1 = u[0] * v[0] + u[1] * v[1]
    if (Math.abs(c1) < 1e-12) {
      if (c0 <= min || c0 >= max) return null
      continue
    }
    const ta = (min - c0) / c1
    const tb = (max - c0) / c1
    lo = Math.max(lo, Math.min(ta, tb))
    hi = Math.min(hi, Math.max(ta, tb))
  }
  return lo < hi ? [lo, hi] : null
}

/** Innenseiten und Innenecken aller Raeume, je Raumliste einmal gerechnet. */
function innenVon(raeume: Raum[]): Map<string, RaumInnen> {
  const alt = innenAblage.get(raeume)
  if (alt) return alt
  const neu = new Map(raeume.map((r) => [r.id, raumInnen(r)] as const))
  innenAblage.set(raeume, neu)
  return neu
}

const innenAblage = new WeakMap<object, Map<string, RaumInnen>>()

interface Gegenkante {
  raumId: string
  /** Die Nachbarkante mit ihrer Innenseite (im Nachbarraum). */
  seite: Innenseite
  /** Die beiden Enden der Oeffnung, auf die Nachbarkante gelegt, als
   *  Laenge ab ihrem Anfang, hoechstens bis zu den Enden ihrer Innenseite:
   *  reicht die Oeffnung ueber eine Innenecke des Nachbarraums hinaus,
   *  steht das Ende auf ihr, nicht in seiner quer stehenden Wand. */
  t0: number
  t1: number
  /** Laeuft die Nachbarkante von s0 nach s1 (vor dem Begrenzen)? */
  gleichLauf: boolean
}

/** Die Kante eines anderen Raums auf der anderen Seite der Wand einer
 *  Oeffnung (s0, s1 auf Kante k von r): parallel, Aussenseiten
 *  gegeneinander, hoechstens WAND_DURCH_CM entfernt und so lang, dass
 *  beide Enden der Oeffnung auf ihr liegen. Die naechste gewinnt. */
function gegenkante(
  daten: MessDaten,
  innen: Map<string, RaumInnen>,
  r: Raum,
  k: number,
  s0: Punkt,
  s1: Punkt,
): Gegenkante | null {
  const eigene = innen.get(r.id)?.seiten[k]
  if (!eigene) return null
  const aussen: Punkt = [-eigene.n[0], -eigene.n[1]]
  let beste: Gegenkante | null = null
  let bester = Infinity
  for (const q of daten.raeume) {
    if (q.id === r.id) continue
    for (const seite of innen.get(q.id)?.seiten ?? []) {
      if (!seite) continue
      // Aussenseiten zeigen gegeneinander (wie wandFuellungen in geometrie.ts).
      if (seite.n[0] * eigene.n[0] + seite.n[1] * eigene.n[1] > -0.999) continue
      const c = seite.a
      // Wie weit die Nachbarkante vor der Wand liegt, nach aussen gezaehlt.
      const abstand = (c[0] - s0[0]) * aussen[0] + (c[1] - s0[1]) * aussen[1]
      if (abstand < -GLEICH_CM || abstand > WAND_DURCH_CM) continue
      const v = seite.u
      const t0 = (s0[0] - c[0]) * v[0] + (s0[1] - c[1]) * v[1]
      const t1 = (s1[0] - c[0]) * v[0] + (s1[1] - c[1]) * v[1]
      const drin = (t: number) => t >= -GLEICH_CM && t <= seite.laenge + GLEICH_CM
      if (!drin(t0) || !drin(t1)) continue
      if (abstand < bester) {
        bester = abstand
        const innenseite = (t: number) => Math.max(seite.von, Math.min(seite.bis, t))
        beste = { raumId: q.id, seite, t0: innenseite(t0), t1: innenseite(t1), gleichLauf: t0 <= t1 }
      }
    }
  }
  return beste
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
  const innen = innenVon(daten.raeume)
  const enden: Messpunkt[] = []
  const gegen: Messpunkt[] = []
  for (const o of daten.oeffnungen) {
    const r = daten.raeume.find((x) => x.id === o.raum_id)
    const s = r ? oeffnungPunkte(r, o) : null
    const seite = r ? innen.get(r.id)?.seiten[o.kante] : null
    if (!r || !s || !seite) continue
    const raum = raumTitel(r)
    enden.push({ p: punktAuf(seite, o.abstand_cm), art: o.art, raumId: r.id, raum, oeffnungId: o.id, ende: 'links' })
    enden.push({ p: punktAuf(seite, o.abstand_cm + o.breite_cm), art: o.art, raumId: r.id, raum, oeffnungId: o.id, ende: 'rechts' })
    if (o.art === 'fenster') continue
    const g = gegenkante(daten, innen, r, o.kante, s[0], s[1])
    if (!g) continue
    gegen.push({ p: punktAuf(g.seite, g.t0), art: o.art, raumId: r.id, raum, oeffnungId: o.id, ende: 'links', gegenueber: true })
    gegen.push({ p: punktAuf(g.seite, g.t1), art: o.art, raumId: r.id, raum, oeffnungId: o.id, ende: 'rechts', gegenueber: true })
  }
  const ecken: Messpunkt[] = []
  for (const r of daten.raeume) {
    const raum = raumTitel(r)
    for (const p of innen.get(r.id)?.ecken ?? []) ecken.push({ p, art: 'ecke', raumId: r.id, raum })
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

/** Der naechste Punkt auf der Innenseite einer Wand (irgendein Raum, nur
 *  auf ihren sichtbaren Stuecken, teile), hoechstens toleranz cm von p.
 *  Auf einer waagrechten oder senkrechten Wand bleibt die Koordinate der
 *  Innenseite exakt und nur entlang der Wand wird gerastert (wie fangen an
 *  der Kante); auf einer schraegen Wand wird der Abstand zum Anfang des
 *  Stuecks gerastert, der Punkt bleibt genau auf der Innenseite. Nie ueber
 *  das Stueck hinaus, also nie ueber die Innenecken und nie in eine
 *  gezeichnete Wand. */
function anInnenseite(raeume: Raum[], p: Punkt, opt: { raster: number; toleranz: number }): Punkt | null {
  const innen = innenVon(raeume)
  let beste: { s: Innenseite; t: number; von: number; bis: number } | null = null
  let bester = opt.toleranz
  for (const r of raeume) {
    for (const s of innen.get(r.id)?.seiten ?? []) {
      if (!s) continue
      const entlang = (p[0] - s.a[0]) * s.u[0] + (p[1] - s.a[1]) * s.u[1]
      for (const [von, bis] of s.teile) {
        const t = Math.max(von, Math.min(bis, entlang))
        const q = punktAuf(s, t)
        const d = Math.hypot(p[0] - q[0], p[1] - q[1])
        if (d <= bester) {
          bester = d
          beste = { s, t, von, bis }
        }
      }
    }
  }
  if (!beste) return null
  const { s, t, von, bis } = beste
  const q = punktAuf(s, t)
  const a = punktAuf(s, von)
  const b = punktAuf(s, bis)
  const zwischen = (v: number, x: number, y: number) => Math.max(Math.min(x, y), Math.min(Math.max(x, y), v))
  if (s.u[1] === 0) return [zwischen(einrasten(q[0], opt.raster), a[0], b[0]), q[1]]
  if (s.u[0] === 0) return [q[0], zwischen(einrasten(q[1], opt.raster), a[1], b[1])]
  return punktAuf(s, zwischen(von + einrasten(t - von, opt.raster), von, bis))
}

/** Einrasten fuer das Messen: zuerst der naechste Messpunkt (Innenecke,
 *  Ende einer Oeffnung, Gegenseite), dann ein Punkt auf der Innenseite
 *  einer Wand, dann das Raster. Nie auf die Kante selbst (die Mitte der
 *  gezeichneten Wand): fangen bleibt den Zeichenwerkzeugen. */
export function messFangen(
  daten: MessDaten,
  p: Punkt,
  opt: { raster: number; toleranz: number },
): { p: Punkt; messpunkt: Messpunkt | null } {
  const m = messpunktAn(messpunkte(daten), p, opt.toleranz)
  if (m) return { p: [m.p[0], m.p[1]], messpunkt: m }
  const w = anInnenseite(daten.raeume, p, opt)
  if (w) return { p: w, messpunkt: null }
  return { p: [einrasten(p[0], opt.raster), einrasten(p[1], opt.raster)], messpunkt: null }
}

/** Liegt die Strecke a-b auf der Innenseite einer Wand (beide Enden
 *  hoechstens 0,5 cm neben ihr, nicht ueber die Kante und ihre Innenecken
 *  hinaus)? Dann die Richtung von dort in die Wand, aus dem Raum hinaus,
 *  sonst null. Dorthin rueckt die Zahl einer Messung: im Raum steht vor
 *  der Innenseite schon das Mass der Wand (Leinwand, wandMasse). */
export function wandSeite(raeume: Raum[], a: Punkt, b: Punkt): Punkt | null {
  if (Math.hypot(b[0] - a[0], b[1] - a[1]) < GLEICH_CM) return null
  const innen = innenVon(raeume)
  for (const r of raeume) {
    for (const s of innen.get(r.id)?.seiten ?? []) {
      if (!s) continue
      const auf = (p: Punkt) => {
        const t = (p[0] - s.a[0]) * s.u[0] + (p[1] - s.a[1]) * s.u[1]
        const quer = (p[0] - s.a[0]) * s.n[0] + (p[1] - s.a[1]) * s.n[1] - WAND_HALB_CM
        return Math.abs(quer) < GLEICH_CM && t > Math.min(s.von, 0) - GLEICH_CM && t < Math.max(s.bis, s.laenge) + GLEICH_CM
      }
      if (auf(a) && auf(b)) return [-s.n[0], -s.n[1]]
    }
  }
  return null
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
  /** Die Masslinie, um versatz von der Innenseite der Wand abgerueckt. */
  a: Punkt
  b: Punkt
  /** Dieselben Enden auf der Innenseite der Wand (fuer die kurzen
   *  Hilfsstriche). */
  wandA: Punkt
  wandB: Punkt
  laenge: number
  /** 'breite': die Oeffnung selbst; 'links'/'rechts': vom Ende bis zur
   *  Innenecke an diesem Ende der Kante. */
  art: 'breite' | 'links' | 'rechts'
  gegenueber: boolean
}

/** Schnellmasse einer Oeffnung, alle auf der Innenseite der Wand: Breite
 *  und die Abstaende ihrer Enden bis zur Innenecke am Ende derselben
 *  Kante (beim rechten Winkel abstand_cm weniger 6), abgerueckt um
 *  versatz cm in den Raum (bei der Gegenseite in den Nachbarraum, bis zu
 *  dessen Innenecken). Abstaende unter 1 cm fehlen (Oeffnung in der
 *  Ecke). Die Gegenseite fehlt, wenn sie genau dieselben Zahlen haette. */
export function schnellMasse(daten: MessDaten, oeffnungId: string, versatz: number): Schnellmass[] {
  const o = daten.oeffnungen.find((x) => x.id === oeffnungId)
  const r = o ? daten.raeume.find((x) => x.id === o.raum_id) : null
  const s = o && r ? oeffnungPunkte(r, o) : null
  if (!o || !r || !s) return []
  const innen = innenVon(daten.raeume)
  const seite = innen.get(r.id)?.seiten[o.kante]
  if (!seite) return []
  const out: Schnellmass[] = []
  const dazu = (wand: Innenseite, ta: number, tb: number, l: number, art: Schnellmass['art'], gegenueber: boolean) => {
    if (l < 1) return
    out.push({
      a: punktAuf(wand, ta, versatz),
      b: punktAuf(wand, tb, versatz),
      wandA: punktAuf(wand, ta),
      wandB: punktAuf(wand, tb),
      laenge: l,
      art,
      gegenueber,
    })
  }
  const anfang = o.abstand_cm
  const ende = o.abstand_cm + o.breite_cm
  const vorne = anfang - seite.von
  const hinten = seite.bis - ende
  dazu(seite, anfang, ende, o.breite_cm, 'breite', false)
  dazu(seite, seite.von, anfang, vorne, 'links', false)
  dazu(seite, ende, seite.bis, hinten, 'rechts', false)
  if (o.art === 'fenster') return out
  const g = gegenkante(daten, innen, r, o.kante, s[0], s[1])
  if (!g) return out
  // Auf der Nachbarkante: links ist das Ende ueber s0, rechts das ueber s1,
  // jede Seite bis zur Innenecke des Nachbarraums an ihrem Ende.
  const w = g.seite
  const gleichLauf = g.gleichLauf
  const ecke0 = gleichLauf ? w.von : w.bis
  const ecke1 = gleichLauf ? w.bis : w.von
  const l0 = gleichLauf ? g.t0 - w.von : w.bis - g.t0
  const l1 = gleichLauf ? w.bis - g.t1 : g.t1 - w.von
  if (Math.abs(l0 - vorne) < GLEICH_CM && Math.abs(l1 - hinten) < GLEICH_CM) return out
  dazu(w, ecke0, g.t0, l0, 'links', true)
  dazu(w, g.t1, ecke1, l1, 'rechts', true)
  return out
}
