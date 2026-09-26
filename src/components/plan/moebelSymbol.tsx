import { objektGlobal, type Punkt } from '../../lib/geometrie'
import type { Objekt } from '../../lib/types'

/* Ein eigenes Zeichen je Moebelart im Plan (WC, Waschbecken, Kuehlschrank,
 * Herd, Bett ...), damit man ohne Anklicken sieht, was wo steht. Die Art
 * wird am Namen erkannt (so wie der Katalog ihn setzt, auf Deutsch oder
 * Arabisch); unbekannte Namen bekommen kein Zeichen. Gezeichnet wird in
 * den Koordinaten des Moebels (Breite entlang x, Tiefe entlang y, y = 0 an
 * der Wand) und mit ihm gedreht. */

export type MoebelArt =
  | 'wc'
  | 'waschbecken'
  | 'badewanne'
  | 'dusche'
  | 'geschirrspueler'
  | 'waschmaschine'
  | 'trockner'
  | 'spuele'
  | 'herd'
  | 'kuehlschrank'
  | 'kuechenzeile'
  | 'bett'
  | 'sofa'
  | 'fernseher'
  | 'kommode'
  | 'tisch'

/** Reihenfolge zaehlt: das Genauere zuerst (Geschirrspueler vor Spuele,
 *  Waschtisch vor Tisch, Spuelmaschine vor Waschmaschine). */
const WOERTER: [MoebelArt, string[]][] = [
  ['geschirrspueler', ['geschirrspüler', 'geschirrspueler', 'spülmaschine', 'spuelmaschine', 'غسالة صحون']],
  ['wc', ['wc', 'toilette', 'klo', 'مرحاض']],
  ['waschbecken', ['waschbecken', 'waschtisch', 'مغسلة']],
  ['badewanne', ['badewanne', 'wanne', 'حوض استحمام']],
  ['dusche', ['dusche', 'دش']],
  ['trockner', ['trockner', 'مجفف']],
  ['waschmaschine', ['waschmaschine', 'غسالة']],
  ['spuele', ['spüle', 'spuele', 'حوض المطبخ']],
  ['herd', ['herd', 'kochfeld', 'موقد']],
  ['kuehlschrank', ['kühlschrank', 'kuehlschrank', 'ثلاجة']],
  ['kuechenzeile', ['küchenzeile', 'kuechenzeile', 'küche', 'kueche', 'وحدة مطبخ']],
  ['bett', ['bett', 'سرير']],
  ['sofa', ['sofa', 'couch', 'أريكة']],
  ['fernseher', ['fernseher', 'tv', 'تلفاز']],
  ['kommode', ['kommode', 'خزانة أدراج']],
  ['tisch', ['tisch', 'طاولة']],
]

export function moebelArt(name: string): MoebelArt | null {
  const n = name.toLowerCase()
  for (const [art, woerter] of WOERTER) {
    if (woerter.some((w) => n.includes(w))) return art
  }
  return null
}

type Form = { art: 'linie'; a: Punkt; b: Punkt } | { art: 'zug'; p: Punkt[]; zu: boolean } | { art: 'kreis'; m: Punkt; r: number }

/** Ellipse als Vieleck (lokal), damit sie sich mit dem Moebel dreht. */
function ellipse(mx: number, my: number, rx: number, ry: number, n = 20): Form {
  const p: Punkt[] = []
  for (let i = 0; i < n; i++) {
    const w = (i / n) * Math.PI * 2
    p.push([mx + Math.cos(w) * rx, my + Math.sin(w) * ry])
  }
  return { art: 'zug', p, zu: true }
}

function rechteck(x0: number, y0: number, x1: number, y1: number): Form {
  return { art: 'zug', p: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], zu: true }
}

function kochfeld(x0: number, y0: number, x1: number, y1: number): Form[] {
  const w = x1 - x0
  const h = y1 - y0
  const r = Math.min(w, h) * 0.16
  return [
    { art: 'kreis', m: [x0 + w * 0.3, y0 + h * 0.3], r },
    { art: 'kreis', m: [x0 + w * 0.7, y0 + h * 0.3], r },
    { art: 'kreis', m: [x0 + w * 0.3, y0 + h * 0.7], r },
    { art: 'kreis', m: [x0 + w * 0.7, y0 + h * 0.7], r },
  ]
}

function becken(x0: number, y0: number, x1: number, y1: number): Form[] {
  const w = x1 - x0
  const h = y1 - y0
  return [rechteck(x0 + w * 0.12, y0 + h * 0.22, x1 - w * 0.12, y1 - h * 0.12), { art: 'kreis', m: [x0 + w / 2, y0 + h * 0.58], r: Math.min(w, h) * 0.06 }]
}

/** Die Striche des Zeichens in lokalen Koordinaten. */
export function moebelFormen(art: MoebelArt, o: Pick<Objekt, 'breite_cm' | 'tiefe_cm' | 'form' | 'ausschnitt_breite_cm' | 'ausschnitt_tiefe_cm' | 'ausschnitt_ecke'>): Form[] {
  const B = o.breite_cm
  const T = o.tiefe_cm
  const k = Math.min(B, T)
  switch (art) {
    case 'wc':
      return [rechteck(B * 0.12, 0, B * 0.88, T * 0.26), ellipse(B / 2, T * 0.62, B * 0.36, T * 0.33)]
    case 'waschbecken':
      return [ellipse(B / 2, T * 0.56, B * 0.38, T * 0.32), { art: 'kreis', m: [B / 2, T * 0.56], r: k * 0.07 }, { art: 'kreis', m: [B / 2, T * 0.12], r: k * 0.06 }]
    case 'badewanne': {
      const i = Math.min(8, k * 0.12)
      const lang = T >= B
      return [
        rechteck(i, i, B - i, T - i),
        { art: 'kreis', m: lang ? [B / 2, i + k * 0.18] : [i + k * 0.18, T / 2], r: k * 0.06 },
      ]
    }
    case 'dusche': {
      const i = Math.min(4, k * 0.06)
      return [rechteck(i, i, B - i, T - i), { art: 'linie', a: [i, i], b: [B - i, T - i] }, { art: 'linie', a: [B - i, i], b: [i, T - i] }, { art: 'kreis', m: [B / 2, T / 2], r: k * 0.07 }]
    }
    case 'waschmaschine':
      return [{ art: 'kreis', m: [B / 2, T * 0.55], r: k * 0.32 }, { art: 'kreis', m: [B / 2, T * 0.55], r: k * 0.2 }]
    case 'trockner':
      return [{ art: 'kreis', m: [B / 2, T * 0.55], r: k * 0.32 }, { art: 'linie', a: [B * 0.3, T * 0.55], b: [B * 0.7, T * 0.55] }]
    case 'geschirrspueler':
      return [rechteck(B * 0.12, T * 0.15, B * 0.88, T * 0.88), ...[0.35, 0.52, 0.69].map((f): Form => ({ art: 'linie', a: [B * 0.2, T * f], b: [B * 0.8, T * f] }))]
    case 'spuele':
      return becken(0, 0, B, T)
    case 'herd':
      return kochfeld(0, 0, B, T)
    case 'kuehlschrank':
      return [rechteck(B * 0.1, T * 0.08, B * 0.9, T * 0.8), { art: 'linie', a: [B * 0.1, T * 0.9], b: [B * 0.9, T * 0.9] }, { art: 'linie', a: [B * 0.35, T * 0.35], b: [B * 0.65, T * 0.55] }, { art: 'linie', a: [B * 0.65, T * 0.35], b: [B * 0.35, T * 0.55] }]
    case 'kuechenzeile': {
      // Rechteckige Zeile: Spuele links, Kochfeld rechts. L-Form mit
      // Ausschnitt rechts unten: Kochfeld im oberen Schenkel, Spuele im linken.
      if (o.form === 'l' && o.ausschnitt_ecke === 'ru' && o.ausschnitt_breite_cm && o.ausschnitt_tiefe_cm) {
        const obenT = T - o.ausschnitt_tiefe_cm
        const linksB = B - o.ausschnitt_breite_cm
        const kf = Math.min(60, B - linksB)
        return [
          ...kochfeld(B - kf - 5, 0, B - 5, obenT),
          ...becken(0, obenT + (T - obenT) * 0.3, linksB, obenT + (T - obenT) * 0.3 + Math.min(80, (T - obenT) * 0.4)),
        ]
      }
      if (o.form === 'l') return []
      const lang = B >= T
      if (lang) return [...becken(B * 0.08, 0, B * 0.08 + Math.min(80, B * 0.35), T), ...kochfeld(B - Math.min(60, B * 0.3) - B * 0.06, 0, B - B * 0.06, T)]
      return [...becken(0, T * 0.08, B, T * 0.08 + Math.min(80, T * 0.35)), ...kochfeld(0, T - Math.min(60, T * 0.3) - T * 0.06, B, T - T * 0.06)]
    }
    case 'bett': {
      const kopf = Math.min(35, T * 0.18)
      const kissen: Form[] =
        B >= 130
          ? [rechteck(B * 0.08, 6, B * 0.47, kopf), rechteck(B * 0.53, 6, B * 0.92, kopf)]
          : [rechteck(B * 0.12, 6, B * 0.88, kopf)]
      return [...kissen, { art: 'linie', a: [0, kopf + T * 0.1], b: [B, kopf + T * 0.1] }]
    }
    case 'sofa':
      if (o.form === 'l') return [{ art: 'linie', a: [0, T * 0.28], b: [B, T * 0.28] }]
      return [rechteck(0, 0, B, T * 0.28), rechteck(0, T * 0.28, B * 0.1, T), rechteck(B * 0.9, T * 0.28, B, T)]
    case 'fernseher':
      return [rechteck(B * 0.05, T * 0.35, B * 0.95, T * 0.6)]
    case 'kommode':
      return [{ art: 'linie', a: [B / 3, T * 0.1], b: [B / 3, T * 0.9] }, { art: 'linie', a: [(2 * B) / 3, T * 0.1], b: [(2 * B) / 3, T * 0.9] }]
    case 'tisch':
      return [rechteck(B * 0.1, T * 0.12, B * 0.9, T * 0.88)]
  }
}

/** Das Zeichen eines Moebels im Plan, oder nichts. */
export function MoebelSymbol({ o }: { o: Objekt }) {
  if (o.art !== 'moebel') return null
  const art = moebelArt(o.name ?? '')
  if (!art) return null
  const g = (p: Punkt) => objektGlobal(o, p[0], p[1])
  return (
    <g style={{ stroke: 'var(--plan-objekt-rand)' }} fill="none" strokeWidth={1} vectorEffect="non-scaling-stroke" opacity={0.8}>
      {moebelFormen(art, o).map((f, i) => {
        if (f.art === 'kreis') {
          const m = g(f.m)
          return <circle key={i} cx={m[0]} cy={m[1]} r={f.r} vectorEffect="non-scaling-stroke" />
        }
        if (f.art === 'linie') {
          const a = g(f.a)
          const b = g(f.b)
          return <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} vectorEffect="non-scaling-stroke" />
        }
        const pts = f.p.map((p) => g(p).join(',')).join(' ')
        return f.zu ? (
          <polygon key={i} points={pts} vectorEffect="non-scaling-stroke" />
        ) : (
          <polyline key={i} points={pts} vectorEffect="non-scaling-stroke" />
        )
      })}
    </g>
  )
}
