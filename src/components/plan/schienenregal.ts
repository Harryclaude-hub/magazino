/* Schienenregal (E95): Regal aus Wandschienen mit Doppelschlitz, Konsolen
 * und Massivholzbrettern, wie Karam es im Keller hat. Eigene Datei ohne
 * React, damit Plan (PlanBild), 3D-Szene (szene.ts) und die Pruefskripte
 * unter node sie teilen.
 *
 * Erkannt wird ein Objekt der Art 'regal' am Namen, so wie moebelArt die
 * Moebel erkennt: "Schienenregal" oder "Wandschiene" (auch "Schienen-Regal"),
 * arabisch "رف سكة", "رف بسكك" oder "سكة جدارية". Ein Schrank oder ein
 * Moebel mit diesem Namen bleibt, was er ist.
 *
 * Die Regel fuer die Enden steht ebenfalls im Namen. Links und rechts gelten
 * wie ueberall im Plan mit Blick auf die Wand, an der das Regal haengt:
 * links ist lokal x = 0, rechts x = B (B Breite, T Tiefe, y = 0 an der
 * Wand).
 *   "45 links"  die vordere Ecke bei x = 0 ist auf 45 Grad abgeschnitten,
 *               beide Schenkel T: die Vorderkante laeuft schraeg von
 *               (T, T) bis an die Wand bei (0, 0). Das Brett endet spitz
 *               an der Wand, niemand stoesst sich an einer Ecke.
 *   "45 rechts" dasselbe bei x = B.
 *   "45 beide"  an beiden Enden.
 * Statt "45" geht auch "45°" oder "45 Grad"; arabisch "45 يسار", "45 يمين",
 * "45 الجهتين" (auch mit ٤٥). Ist das Regal schmaler als die Schenkel,
 * werden sie kuerzer (hoechstens B, bei beiden Enden B / 2), das Brett
 * bleibt immer im Kasten B x T.
 *   "Ecke"      (arabisch "زاوية"): ein Eckbrett ohne eigene Schienen. Es
 *               liegt in der Innenecke zwischen zwei Laeufen auf deren
 *               Konsolen und zeigt nur Bretter.
 *
 * Das U im Keller (Rueckwand, linke und rechte Wand, Tuer vorn) besteht aus
 * drei Laeufen, alle mit "45 beide" (E96, Gehrung statt Eckbrett):
 *   Rueckwand    "Schienenregal hinten, 45 beide", von Wand zu Wand
 *   linke Wand   "Schienenregal links, 45 beide", bis an die Rueckwand
 *   rechte Wand  "Schienenregal rechts, 45 beide", bis an die Rueckwand
 * Die Seitenlaeufe gehen ganz bis zur Rueckwand und ueberdecken so das
 * Eckquadrat. Der 45-Grad-Schnitt am hinteren Ende jedes Seitenlaufs und an
 * beiden Enden der Rueckwand liegt auf der Diagonale durch die Wandecke:
 * dort treffen sich zwei Bretter in einer Gehrung, ohne Luecke und ohne
 * Ueberdeckung, jedes aus einem Stueck (in 3D ein Prisma, keine Naht quer
 * durch das Brett). Sind die Tiefen verschieden (30 gegen 35), steht die
 * Vorderkante dort um die Differenz versetzt. Das alte Eckbrett ("Ecke")
 * bleibt als Teil fuer andere Ecken moeglich. scripts/szene-pruefen.mjs
 * prueft die Gehrung am Keller mit seinen echten Massen.
 */

import type { Punkt } from '../../lib/geometrie.ts'

export interface Schienenregal {
  /** Vordere Ecke bei x = 0 auf 45 Grad. */
  links: boolean
  /** Vordere Ecke bei x = B auf 45 Grad. */
  rechts: boolean
  /** Eckbrett ohne eigene Schienen. */
  ecke: boolean
  /** Zahl der Schienen aus dem Namen ("5 Schienen", 2 bis 12), sonst null
   *  und die Zahl folgt der Breite (E97). */
  schienen?: number | null
}

/** Staerke eines Massivholzbretts (Birke Multiplex), cm. */
export const BRETT_DICKE_CM = 2.7
/** Wandschiene mit Doppelschlitz: Breite entlang der Wand und Tiefe, cm. */
export const SCHIENE_BREIT_CM = 1.6
export const SCHIENE_TIEF_CM = 1.3
/** Konsole: Breite (entlang der Wand) und Hoehe unter dem Brett, cm. */
export const ARM_BREIT_CM = 1.2
export const ARM_HOCH_CM = 3.5

const NAME = /schienen[- ]?regal|wandschiene|رف سكة|رف بسكك|سكة جدارية|سكك جدارية/
const SCHRAEG = /(?:45|٤٥)\s*(?:°|grad|درجة)?\s*[,-]?\s*(links|rechts|beide|يسار|يمين|الجهتين|كلاهما|الطرفين)/g
const ZAHL = /(?<![\d٠-٩])(\d{1,2}|[٠-٩]{1,2})\s*(?:schienen|سكك|سكة)/
const ECKE = /(?<![a-zäöüß])(?:ecke|eckbrett|eckstück|eckstueck)(?![a-zäöüß])|زاوية/

/** Ist das Objekt ein Schienenregal, und wie sind seine Enden? Sonst null. */
export function schienenregal(o: { art: string; name?: string | null }): Schienenregal | null {
  if (o.art !== 'regal') return null
  const n = (o.name ?? '').toLowerCase()
  if (!NAME.test(n)) return null
  let links = false
  let rechts = false
  for (const m of n.matchAll(SCHRAEG)) {
    const w = m[1]
    if (w === 'links' || w === 'يسار') links = true
    else if (w === 'rechts' || w === 'يمين') rechts = true
    else links = rechts = true
  }
  const z = ZAHL.exec(n)
  const zahl = z ? Number(z[1].replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x660))) : NaN
  const aus: Schienenregal = { links, rechts, ecke: ECKE.test(n) }
  if (zahl >= 2 && zahl <= 12) aus.schienen = zahl
  return aus
}

/** Zahl der Schienen: aus dem Namen ("5 Schienen"), sonst unter 80 cm
 *  zwei, unter 130 drei, sonst vier; ein Eckbrett keine. */
export function schienenZahl(B: number, s: Schienenregal): number {
  if (s.ecke || !(B > 0)) return 0
  if (s.schienen) return s.schienen
  return B < 80 ? 2 : B < 130 ? 3 : 4
}

/** Schenkel der Schraege an jedem Ende (cm), 0 ohne Schraege. */
export function schraegen(B: number, T: number, s: Schienenregal): { links: number; rechts: number } {
  const max = s.links && s.rechts ? B / 2 : B
  const c = Math.max(0, Math.min(T, max))
  return { links: s.links ? c : 0, rechts: s.rechts ? c : 0 }
}

/** Tiefe des Bretts an der Stelle x (lokal, cm). */
export function brettTiefe(x: number, B: number, T: number, s: Schienenregal): number {
  let d = Math.max(0, T)
  if (s.links) d = Math.min(d, x)
  if (s.rechts) d = Math.min(d, B - x)
  return Math.max(0, d)
}

/** Umriss des Bretts lokal (cm), im Uhrzeigersinn am Bildschirm, von der
 *  Wand aus. Ohne Schraegen das Rechteck B x T. */
export function brettUmriss(B: number, T: number, s: Schienenregal): Punkt[] {
  const c = schraegen(B, T, s)
  const p: Punkt[] = [[0, 0], [B, 0]]
  // Reicht die Schraege eines Endes ueber die ganze Breite (schmales Brett),
  // endet sie am anderen Rand: die Vorderecke dort faellt weg, sonst bliebe
  // ein Zacken (E96).
  if (c.rechts > 0) p.push([B - c.rechts, c.rechts])
  else if (c.links < B - 1e-9) p.push([B, T])
  if (c.links > 0) p.push([c.links, c.links])
  else if (c.rechts < B - 1e-9) p.push([0, T])
  // Treffen sich beide Schraegen in der Mitte, faellt ein Punkt weg.
  return p.filter((q, i) => {
    const v = p[(i + p.length - 1) % p.length]
    return i === 0 || Math.abs(q[0] - v[0]) > 1e-9 || Math.abs(q[1] - v[1]) > 1e-9
  })
}

/** Die Schienen entlang der Wand (lokal x der Mitte, cm). Gleichmaessig,
 *  etwas eingerueckt; an einem Ende mit Schraege um die halbe Tiefe weiter
 *  hinein, damit die Konsole dort noch unter dem Brett liegt. */
export function schienenX(B: number, T: number, s: Schienenregal): number[] {
  const n = schienenZahl(B, s)
  if (n === 0) return []
  const rand = Math.min(10, B * 0.1)
  const c = schraegen(B, T, s)
  let a = rand + c.links / 2
  let b = B - rand - c.rechts / 2
  if (b - a < SCHIENE_BREIT_CM) a = b = B / 2
  if (a === b) return [a]
  return Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1))
}

/** Ein Teil des Schienenregals lokal (cm), wie Teil in moebel3d.ts. umriss
 *  (nur Bretter mit Schraege an einem Ende): die Ecken des Bretts, ein
 *  Stueck aus einem Prisma (E96), sonst ist das Brett das Rechteck. */
export interface SchienenTeil {
  art: 'schiene' | 'schlitz' | 'arm' | 'brett'
  x0: number
  y0: number
  x1: number
  y1: number
  z0: number
  z1: number
  umriss?: Punkt[]
}

/** Alle Teile: Schienen ueber die volle Hoehe an der Wand (mit dunklem
 *  Schlitzband vorn), je Brett eine Konsole an jeder Schiene, die Bretter
 *  (Oberkante bei brett_cm, ein Brett bei 0 ist der Boden und fehlt).
 *  Ein Brett mit Schraege ist ein Stueck (umriss), keine Naht.
 *  Nichts ragt aus dem Kasten B x T x H. */
export function schienenTeile(o: { breite_cm: number; tiefe_cm: number; hoehe_cm: number; brett_cm: number[] | null }, s: Schienenregal): SchienenTeil[] {
  const B = o.breite_cm
  const T = o.tiefe_cm
  const H = o.hoehe_cm
  const out: SchienenTeil[] = []
  if (!(B > 0 && T > 0 && H > 0)) return out
  const xs = schienenX(B, T, s)
  const sb = Math.min(SCHIENE_BREIT_CM, B)
  const st = Math.min(SCHIENE_TIEF_CM, T / 4)
  for (const x of xs) {
    const x0 = Math.max(0, Math.min(B - sb, x - sb / 2))
    out.push({ art: 'schiene', x0, x1: x0 + sb, y0: 0, y1: st, z0: 0, z1: H })
    // Zwei Schlitzreihen als dunkle Streifen auf der Vorderseite.
    const w = sb * 0.22
    for (const m of [x0 + sb * 0.3, x0 + sb * 0.7]) out.push({ art: 'schlitz', x0: m - w / 2, x1: m + w / 2, y0: st, y1: Math.min(T, st + 0.15), z0: Math.min(2, H / 4), z1: Math.max(H / 2, H - 2) })
  }
  const c = schraegen(B, T, s)
  const umriss = brettUmriss(B, T, s)
  for (const b of o.brett_cm ?? []) {
    if (!Number.isFinite(b) || b < BRETT_DICKE_CM || b > H) continue
    const z0 = b - BRETT_DICKE_CM
    if (c.links > 0 || c.rechts > 0) out.push({ art: 'brett', x0: 0, x1: B, y0: 0, y1: Math.max(...umriss.map((q) => q[1])), z0, z1: b, umriss })
    else out.push({ art: 'brett', x0: 0, x1: B, y0: 0, y1: T, z0, z1: b })
    // Konsole unter dem Brett an jeder Schiene, so lang, wie das Brett dort tief ist.
    const az0 = Math.max(0, z0 - ARM_HOCH_CM)
    if (z0 - az0 < 0.5) continue
    for (const x of xs) {
      const lang = Math.min(T * 0.9, brettTiefe(x, B, T, s) - 1.5)
      if (lang <= st + 0.5) continue
      const ab = Math.min(ARM_BREIT_CM, B)
      const x0 = Math.max(0, Math.min(B - ab, x - ab / 2))
      out.push({ art: 'arm', x0, x1: x0 + ab, y0: st, y1: lang, z0: az0, z1: z0 })
    }
  }
  return out
}

/* ------------------------------------------------------------ Plan (2D) */

type Gerade = { p: Punkt; r: Punkt }

function schnitt(a: Gerade, b: Gerade): Punkt | null {
  const det = a.r[0] * b.r[1] - a.r[1] * b.r[0]
  if (Math.abs(det) < 1e-9) return null
  const t = ((b.p[0] - a.p[0]) * b.r[1] - (b.p[1] - a.p[1]) * b.r[0]) / det
  return [a.p[0] + a.r[0] * t, a.p[1] + a.r[1] * t]
}

/** Die doppelte Vorderkante im Plan (lokal, cm), wie bei Regal und
 *  Schrank um d nach innen: entlang der Vorderkante und der Schraegen,
 *  von Rand zu Rand (Seite oder Wand). */
export function vorderlinie(B: number, T: number, s: Schienenregal, d: number): Punkt[] {
  const u = brettUmriss(B, T, s)
  if (u.length < 3 || !(B > 0 && T > 0)) return []
  const m: Punkt = [u.reduce((a, q) => a + q[0], 0) / u.length, u.reduce((a, q) => a + q[1], 0) / u.length]
  const seite = (a: Punkt, b: Punkt) => (Math.abs(a[0] - b[0]) < 1e-9 && (Math.abs(a[0]) < 1e-9 || Math.abs(a[0] - B) < 1e-9)) || (Math.abs(a[1]) < 1e-9 && Math.abs(b[1]) < 1e-9)
  // Kanten von links nach rechts: rueckwaerts um den Umriss, ab (0, 0).
  const zug: Punkt[] = [u[0], ...u.slice(1).reverse()]
  const geraden: Gerade[] = []
  const c = schraegen(B, T, s)
  geraden.push(c.links > 0 ? { p: [0, 0], r: [1, 0] } : { p: [0, 0], r: [0, 1] })
  for (let i = 0; i + 1 < zug.length; i++) {
    const a = zug[i]
    const b = zug[i + 1]
    if (seite(a, b)) continue
    const r: Punkt = [b[0] - a[0], b[1] - a[1]]
    const l = Math.hypot(r[0], r[1])
    if (l < 1e-9) continue
    let n: Punkt = [-r[1] / l, r[0] / l]
    if ((m[0] - a[0]) * n[0] + (m[1] - a[1]) * n[1] < 0) n = [-n[0], -n[1]]
    geraden.push({ p: [a[0] + n[0] * d, a[1] + n[1] * d], r })
  }
  geraden.push(c.rechts > 0 ? { p: [B, 0], r: [1, 0] } : { p: [B, 0], r: [0, 1] })
  const out: Punkt[] = []
  for (let i = 0; i + 1 < geraden.length; i++) {
    const q = schnitt(geraden[i], geraden[i + 1])
    if (q && Number.isFinite(q[0]) && Number.isFinite(q[1])) out.push(q)
  }
  return out
}

/** Kurze Striche an der Wandkante, wo die Schienen sitzen (lokal, cm).
 *  10 cm lang: die ersten 6 cm liegen im Plan unter der halben Wand. */
export function schienenStriche(B: number, T: number, s: Schienenregal): [Punkt, Punkt][] {
  const l = Math.min(10, T / 3)
  return schienenX(B, T, s).map((x): [Punkt, Punkt] => [[x, 0], [x, l]])
}
