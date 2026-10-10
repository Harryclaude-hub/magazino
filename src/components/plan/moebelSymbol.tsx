import { objektGlobal, type Punkt } from '../../lib/geometrie'
import type { Objekt } from '../../lib/types'
import { objektUmriss } from './hilfe'

/* Ein eigenes Zeichen je Moebelart im Plan (WC, Waschbecken, Kuehlschrank,
 * Herd, Bett ...), damit man ohne Anklicken sieht, was wo steht. Die Art
 * wird am Namen erkannt (so wie der Katalog ihn setzt, auf Deutsch oder
 * Arabisch); unbekannte Namen bekommen kein Zeichen. Gezeichnet wird in
 * den Koordinaten des Moebels (Breite entlang x, Tiefe entlang y, y = 0 an
 * der Wand) und mit ihm gedreht. */

import { bankStuecke, moebelArt, type MoebelArt } from './moebelArt'
export { moebelArt, type MoebelArt }

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

/** L-Sofa: Lehne an den beiden Aussenseiten, Armlehnen an den freien Enden.
 *  Gerechnet mit der freien Ecke rechts oben, dann gespiegelt. */
function lSofa(o: Pick<Objekt, 'breite_cm' | 'tiefe_cm' | 'ausschnitt_breite_cm' | 'ausschnitt_tiefe_cm' | 'ausschnitt_ecke'>): Form[] {
  const B = o.breite_cm
  const T = o.tiefe_cm
  const aB = o.ausschnitt_breite_cm ?? 0
  const aT = o.ausschnitt_tiefe_cm ?? 0
  if (aB <= 0 || aT <= 0) return []
  const schenkel = B - aB
  const lang = T - aT
  const r = Math.min(20, schenkel * 0.25, lang * 0.25)
  const e = o.ausschnitt_ecke ?? 'ro'
  const sx = e === 'lo' || e === 'lu'
  const sy = e === 'ru' || e === 'lu'
  const m = (q: Punkt): Punkt => [sx ? B - q[0] : q[0], sy ? T - q[1] : q[1]]
  const formen: Form[] = [
    { art: 'zug', p: [[r, 0], [r, T - r], [B, T - r]], zu: false },
    { art: 'linie', a: [r, r], b: [schenkel, r] },
    { art: 'linie', a: [B - r, aT], b: [B - r, T - r] },
  ]
  return formen.map((f) =>
    f.art === 'zug' ? { ...f, p: f.p.map(m) } : f.art === 'linie' ? { ...f, a: m(f.a), b: m(f.b) } : f,
  )
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
      if (o.form === 'l') return lSofa(o)
      return [rechteck(0, 0, B, T * 0.28), rechteck(0, T * 0.28, B * 0.1, T), rechteck(B * 0.9, T * 0.28, B, T)]
    case 'fernseher':
      return [rechteck(B * 0.05, T * 0.35, B * 0.95, T * 0.6)]
    case 'kommode':
      return [{ art: 'linie', a: [B / 3, T * 0.1], b: [B / 3, T * 0.9] }, { art: 'linie', a: [(2 * B) / 3, T * 0.1], b: [(2 * B) / 3, T * 0.9] }]
    case 'tisch':
      return [rechteck(B * 0.1, T * 0.12, B * 0.9, T * 0.88)]
    case 'sessel':
      return [rechteck(0, 0, B, T * 0.25), rechteck(0, T * 0.25, B * 0.18, T), rechteck(B * 0.82, T * 0.25, B, T)]
    case 'couchtisch':
      return [rechteck(B * 0.12, T * 0.15, B * 0.88, T * 0.85), { art: 'linie', a: [B * 0.12, T * 0.5], b: [B * 0.88, T * 0.5] }]
    case 'sideboard':
      return [0.25, 0.5, 0.75].map((f): Form => ({ art: 'linie', a: [B * f, T * 0.1], b: [B * f, T * 0.9] }))
    case 'esstisch_rund':
      return [ellipse(B / 2, T / 2, B * 0.4, T * 0.4)]
    case 'stuhl':
      return [rechteck(B * 0.12, T * 0.25, B * 0.88, T * 0.95), { art: 'linie', a: [B * 0.1, T * 0.1], b: [B * 0.9, T * 0.1] }]
    case 'buerostuhl':
      return [
        { art: 'kreis', m: [B / 2, T * 0.55], r: k * 0.32 },
        { art: 'zug', p: [[B * 0.15, T * 0.25], [B * 0.5, T * 0.08], [B * 0.85, T * 0.25]], zu: false },
      ]
    case 'teppich': {
      const r = Math.min(8, k * 0.08)
      const fransen = [0.2, 0.4, 0.6, 0.8].flatMap((f): Form[] => [
        { art: 'linie', a: [0, T * f], b: [r, T * f] },
        { art: 'linie', a: [B - r, T * f], b: [B, T * f] },
      ])
      return [rechteck(r, r, B - r, T - r), ...fransen]
    }
    case 'stehlampe': {
      const d = k * 0.25
      return [
        { art: 'kreis', m: [B / 2, T / 2], r: k * 0.38 },
        { art: 'linie', a: [B / 2 - d, T / 2 - d], b: [B / 2 + d, T / 2 + d] },
        { art: 'linie', a: [B / 2 - d, T / 2 + d], b: [B / 2 + d, T / 2 - d] },
      ]
    }
    case 'pflanze':
      return [
        { art: 'kreis', m: [B / 2, T / 2], r: k * 0.42 },
        { art: 'kreis', m: [B * 0.4, T * 0.42], r: k * 0.14 },
        { art: 'kreis', m: [B * 0.62, T * 0.45], r: k * 0.12 },
        { art: 'kreis', m: [B * 0.5, T * 0.64], r: k * 0.13 },
      ]
    case 'klavier': {
      const tasten: Form[] = []
      for (let i = 1; i < 12; i++) tasten.push({ art: 'linie', a: [(B * i) / 12, T * 0.62], b: [(B * i) / 12, T * 0.95] })
      return [rechteck(B * 0.02, T * 0.62, B * 0.98, T * 0.95), ...tasten]
    }
    case 'nachttisch':
      return [rechteck(B * 0.12, T * 0.12, B * 0.88, T * 0.88), { art: 'kreis', m: [B / 2, T / 2], r: k * 0.18 }]
    case 'kinderbett': {
      const staebe: Form[] = []
      for (let i = 1; i < 6; i++) {
        staebe.push({ art: 'linie', a: [(B * i) / 6, 0], b: [(B * i) / 6, T * 0.06] })
        staebe.push({ art: 'linie', a: [(B * i) / 6, T * 0.94], b: [(B * i) / 6, T] })
      }
      return [rechteck(B * 0.08, T * 0.06, B * 0.92, T * 0.94), rechteck(B * 0.2, T * 0.1, B * 0.8, T * 0.22), ...staebe]
    }
    case 'schreibtisch':
      return [rechteck(B * 0.3, T * 0.08, B * 0.7, T * 0.18), rechteck(B * 0.35, T * 0.45, B * 0.65, T * 0.65)]
    case 'schuhschrank':
      return [
        { art: 'linie', a: [B * 0.05, T * 0.35], b: [B * 0.95, T * 0.35] },
        { art: 'linie', a: [B * 0.05, T * 0.7], b: [B * 0.95, T * 0.7] },
        { art: 'linie', a: [B / 2, T * 0.1], b: [B / 2, T * 0.9] },
      ]
    case 'garderobe': {
      const haken = [0.2, 0.4, 0.6, 0.8].map((f): Form => ({ art: 'kreis', m: [B * f, T * 0.35], r: k * 0.08 }))
      return [{ art: 'linie', a: [B * 0.05, T * 0.15], b: [B * 0.95, T * 0.15] }, ...haken]
    }
    case 'gefrierschrank': {
      const mx = B / 2
      const my = T * 0.45
      const d = k * 0.25
      return [
        rechteck(B * 0.1, T * 0.08, B * 0.9, T * 0.85),
        { art: 'linie', a: [mx - d, my], b: [mx + d, my] },
        { art: 'linie', a: [mx, my - d], b: [mx, my + d] },
        { art: 'linie', a: [mx - d * 0.7, my - d * 0.7], b: [mx + d * 0.7, my + d * 0.7] },
        { art: 'linie', a: [mx - d * 0.7, my + d * 0.7], b: [mx + d * 0.7, my - d * 0.7] },
      ]
    }
    case 'tv_board':
      return [
        rechteck(B * 0.15, T * 0.05, B * 0.85, T * 0.22),
        ...[1 / 3, 2 / 3].map((f): Form => ({ art: 'linie', a: [B * f, T * 0.35], b: [B * f, T * 0.95] })),
      ]
    case 'essgruppe': {
      const c = Math.min(45, T * 0.3)
      const stuehle = [B * 0.3, B * 0.7].flatMap((cx): Form[] => [
        rechteck(cx - c / 2, T * 0.02, cx + c / 2, c),
        rechteck(cx - c / 2, T - c, cx + c / 2, T * 0.98),
      ])
      return [rechteck(B * 0.1, T * 0.27, B * 0.9, T * 0.73), ...stuehle]
    }
    case 'bank':
    case 'besta_bank': {
      // Rueckenkissen an der Wand, Fugen zwischen den Sitzpolstern; beim L je Kasten.
      const lehne = Math.min(T * 0.3, 15)
      const out: Form[] = []
      for (const s of bankStuecke(o)) {
        const n = Math.max(1, Math.round((s.x1 - s.x0) / 60))
        const y0 = s.lehne ? lehne : s.y0
        if (s.lehne) out.push({ art: 'linie', a: [s.x0, lehne], b: [s.x1, lehne] })
        for (let i = 1; i < n; i++) {
          const x = s.x0 + ((s.x1 - s.x0) * i) / n
          out.push({ art: 'linie', a: [x, y0], b: [x, s.y1] })
        }
      }
      return out
    }
    case 'haengelampe': {
      const d = k * 0.3
      return [
        { art: 'kreis', m: [B / 2, T / 2], r: k * 0.45 },
        { art: 'linie', a: [B / 2 - d, T / 2], b: [B / 2 + d, T / 2] },
        { art: 'linie', a: [B / 2, T / 2 - d], b: [B / 2, T / 2 + d] },
      ]
    }
    case 'mauer':
      return []
    case 'spiegel':
      return [{ art: 'linie', a: [B * 0.06, T * 0.6], b: [B * 0.94, T * 0.6] }]
    case 'hochschrank':
      return [{ art: 'linie', a: [B * 0.1, T * 0.9], b: [B * 0.9, T * 0.9] }, { art: 'linie', a: [B * 0.85, T * 0.3], b: [B * 0.85, T * 0.7] }]
    case 'backofen':
      return [rechteck(B * 0.1, T * 0.55, B * 0.9, T * 0.95), { art: 'linie', a: [B * 0.2, T * 0.75], b: [B * 0.8, T * 0.75] }]
    case 'fahrrad': {
      const r = Math.min(T * 0.4, B * 0.18)
      return [
        { art: 'kreis', m: [r + 2, T / 2], r },
        { art: 'kreis', m: [B - r - 2, T / 2], r },
        { art: 'zug', p: [[r + 2, T / 2], [B / 2, T * 0.2], [B - r - 2, T / 2]], zu: false },
      ]
    }
    /* E82: Deko, Spielzeug, Stoffe, Sockel. */
    case 'spielzeugkiste':
      // Truhe mit Deckelfuge, darin ein Ball und ein Klotz.
      return [
        rechteck(B * 0.05, T * 0.08, B * 0.95, T * 0.92),
        { art: 'linie', a: [B * 0.05, T * 0.3], b: [B * 0.95, T * 0.3] },
        { art: 'kreis', m: [B * 0.32, T * 0.62], r: k * 0.14 },
        rechteck(B * 0.56, T * 0.46, B * 0.78, T * 0.8),
      ]
    case 'kuscheltier':
      // Teddykopf von oben: Kopf mit zwei Ohren und Schnauze.
      return [
        { art: 'kreis', m: [B / 2, T * 0.56], r: k * 0.32 },
        { art: 'kreis', m: [B / 2 - k * 0.27, T * 0.56 - k * 0.27], r: k * 0.11 },
        { art: 'kreis', m: [B / 2 + k * 0.27, T * 0.56 - k * 0.27], r: k * 0.11 },
        { art: 'kreis', m: [B / 2, T * 0.56 + k * 0.12], r: k * 0.09 },
      ]
    case 'bausteine':
      // Ein paar Kloetze, versetzt.
      return [
        rechteck(B * 0.1, T * 0.12, B * 0.42, T * 0.44),
        rechteck(B * 0.52, T * 0.18, B * 0.88, T * 0.42),
        rechteck(B * 0.22, T * 0.54, B * 0.5, T * 0.88),
        { art: 'zug', p: [[B * 0.6, T * 0.88], [B * 0.74, T * 0.54], [B * 0.88, T * 0.88]], zu: true },
      ]
    case 'spielkueche':
      // Zwei Kochstellen links, Becken rechts.
      return [
        { art: 'kreis', m: [B * 0.25, T * 0.34], r: k * 0.14 },
        { art: 'kreis', m: [B * 0.25, T * 0.7], r: k * 0.14 },
        rechteck(B * 0.55, T * 0.24, B * 0.88, T * 0.78),
        { art: 'kreis', m: [B * 0.715, T * 0.12], r: k * 0.05 },
      ]
    case 'buecher':
      // Ein Stapel: drei Buecher leicht verdreht, mit Ruecken.
      return [
        rechteck(B * 0.08, T * 0.14, B * 0.8, T * 0.78),
        { art: 'zug', p: [[B * 0.2, T * 0.22], [B * 0.92, T * 0.3], [B * 0.86, T * 0.92], [B * 0.14, T * 0.84]], zu: true },
        { art: 'linie', a: [B * 0.16, T * 0.14], b: [B * 0.16, T * 0.78] },
      ]
    case 'bild':
      // Flach an der Wand: Rahmen mit Bildflaeche.
      return [rechteck(B * 0.04, T * 0.15, B * 0.96, T * 0.85), { art: 'linie', a: [B * 0.12, T * 0.5], b: [B * 0.88, T * 0.5] }]
    case 'kissen': {
      // Kissen von oben: Ecken spitz, Seiten eingezogen.
      const ecken: Punkt[] = [[0.06, 0.06], [0.5, 0.15], [0.94, 0.06], [0.85, 0.5], [0.94, 0.94], [0.5, 0.85], [0.06, 0.94], [0.15, 0.5]]
      const p = ecken.map(([x, y]): Punkt => [B * x, T * y])
      return [{ art: 'zug', p, zu: true }]
    }
    case 'wolldecke': {
      // Gefaltet: zwei Falten und Fransen an einer Seite.
      const fransen = [0.25, 0.45, 0.65, 0.85].map((f): Form => ({ art: 'linie', a: [B * 0.92, T * f], b: [B, T * f] }))
      return [
        rechteck(B * 0.04, T * 0.1, B * 0.92, T * 0.9),
        { art: 'linie', a: [B * 0.04, T * 0.37], b: [B * 0.92, T * 0.37] },
        { art: 'linie', a: [B * 0.04, T * 0.63], b: [B * 0.92, T * 0.63] },
        ...fransen,
      ]
    }
    case 'korb':
      // Rand und Boden des Korbs, dazu Henkel.
      return [
        ellipse(B / 2, T / 2, B * 0.44, T * 0.42),
        ellipse(B / 2, T / 2, B * 0.32, T * 0.3),
        { art: 'linie', a: [B * 0.06, T / 2], b: [B * 0.18, T / 2] },
        { art: 'linie', a: [B * 0.82, T / 2], b: [B * 0.94, T / 2] },
      ]
    case 'vorhang': {
      // Schiene an der Wand, davor der Stoff in Falten.
      const n = Math.max(4, Math.round(B / 12))
      const falten: Punkt[] = []
      for (let i = 0; i <= n; i++) falten.push([(B * i) / n, i % 2 === 0 ? T * 0.4 : T * 0.85])
      return [{ art: 'linie', a: [0, T * 0.15], b: [B, T * 0.15] }, { art: 'zug', p: falten, zu: false }]
    }
    case 'obstschale':
      // Schale mit drei Fruechten.
      return [
        { art: 'kreis', m: [B / 2, T / 2], r: k * 0.44 },
        { art: 'kreis', m: [B * 0.4, T * 0.42], r: k * 0.13 },
        { art: 'kreis', m: [B * 0.6, T * 0.44], r: k * 0.12 },
        { art: 'kreis', m: [B * 0.5, T * 0.62], r: k * 0.12 },
      ]
    case 'blumenkasten': {
      // Langer Kasten, darin Pflanzen in einer Reihe.
      const n = Math.max(2, Math.min(6, Math.round(B / 18)))
      const pflanzen = Array.from({ length: n }, (_, i): Form => ({ art: 'kreis', m: [(B * (i + 0.5)) / n, T / 2], r: Math.min(T * 0.3, B / n / 2.4) }))
      return [rechteck(B * 0.02, T * 0.1, B * 0.98, T * 0.9), ...pflanzen]
    }
    case 'sockel':
      // Unterbau mit Auszug: Front und Griffleiste.
      return [
        rechteck(B * 0.05, T * 0.08, B * 0.95, T * 0.92),
        { art: 'linie', a: [B * 0.05, T * 0.84], b: [B * 0.95, T * 0.84] },
        { art: 'linie', a: [B * 0.38, T * 0.74], b: [B * 0.62, T * 0.74] },
      ]
    /* E91: Deko fuer Bad und WC. */
    case 'handtuch':
    case 'bademantel':
      // Stange oder Haken an der Wand, davor der Stoff.
      return [{ art: 'linie', a: [B * 0.04, T * 0.3], b: [B * 0.96, T * 0.3] }, rechteck(B * 0.1, T * 0.42, B * 0.9, T * 0.9)]
    case 'handtuchstapel':
      // Gefaltet: Kanten der Lagen an einer Seite.
      return [
        rechteck(B * 0.05, T * 0.08, B * 0.95, T * 0.92),
        { art: 'linie', a: [B * 0.05, T * 0.36], b: [B * 0.95, T * 0.36] },
        { art: 'linie', a: [B * 0.05, T * 0.64], b: [B * 0.95, T * 0.64] },
      ]
    case 'badaccessoires':
      // Becher und Seifenspender.
      return [
        { art: 'kreis', m: [B * 0.25, T / 2], r: Math.min(B * 0.18, T * 0.4) },
        { art: 'kreis', m: [B * 0.68, T / 2], r: Math.min(B * 0.16, T * 0.36) },
      ]
    case 'seifenschale':
      return [ellipse(B / 2, T / 2, B * 0.44, T * 0.4), rechteck(B * 0.3, T * 0.3, B * 0.7, T * 0.7)]
    case 'kerzen':
      // Tablett mit Kerzen.
      return [
        rechteck(B * 0.04, T * 0.08, B * 0.96, T * 0.92),
        { art: 'kreis', m: [B * 0.25, T * 0.55], r: k * 0.22 },
        { art: 'kreis', m: [B * 0.52, T * 0.42], r: k * 0.2 },
        { art: 'kreis', m: [B * 0.77, T * 0.58], r: k * 0.18 },
      ]
    case 'duftstaebchen':
      // Flasche mit Staebchen nach allen Seiten.
      return [
        { art: 'kreis', m: [B / 2, T / 2], r: k * 0.3 },
        { art: 'linie', a: [B * 0.1, T * 0.2], b: [B * 0.9, T * 0.8] },
        { art: 'linie', a: [B * 0.1, T * 0.8], b: [B * 0.9, T * 0.2] },
      ]
    case 'badewannenablage':
      // Ablage aus Latten quer ueber der Wanne.
      return [
        rechteck(0, T * 0.05, B, T * 0.95),
        ...[0.35, 0.65].map((f): Form => ({ art: 'linie', a: [0, T * f], b: [B, T * f] })),
        { art: 'kreis', m: [B * 0.3, T / 2], r: k * 0.2 },
      ]
    case 'klopapierhalter':
      // Rolle vor der Wand.
      return [{ art: 'linie', a: [B * 0.1, T * 0.1], b: [B * 0.9, T * 0.1] }, rechteck(B * 0.1, T * 0.25, B * 0.9, T * 0.95)]
    case 'klobuerste':
      return [{ art: 'kreis', m: [B / 2, T / 2], r: k * 0.42 }, { art: 'kreis', m: [B / 2, T / 2], r: k * 0.12 }]
    case 'wandregal':
      // Brett an der Wand mit zwei Seiten.
      return [
        rechteck(B * 0.02, T * 0.05, B * 0.98, T * 0.95),
        { art: 'linie', a: [B * 0.08, T * 0.05], b: [B * 0.08, T * 0.95] },
        { art: 'linie', a: [B * 0.92, T * 0.05], b: [B * 0.92, T * 0.95] },
      ]
  }
}

/** Kleines Vorschaubild fuer die Auswahl im Katalog: Umriss und Zeichen
 *  des Moebels, in ein Kaestchen eingepasst. Regale zeigen Faecher,
 *  Schraenke eine Kleiderstange. */
export function MoebelVorschau({
  v,
  name,
  groesse = 34,
}: {
  v: Pick<Objekt, 'art' | 'breite_cm' | 'tiefe_cm' | 'hoehe_cm' | 'form' | 'ausschnitt_breite_cm' | 'ausschnitt_tiefe_cm' | 'ausschnitt_ecke' | 'brett_cm' | 'spalten'>
  name: string
  groesse?: number
}) {
  const B = v.breite_cm
  const T = v.tiefe_cm
  const m = Math.max(B, T)
  const rand = m * 0.06
  const umriss = objektUmriss({ ...v, x: 0, y: 0, drehung: 0 })
  const art = v.art === 'moebel' ? moebelArt(name) : null
  const formen: Form[] = art
    ? moebelFormen(art, v)
    : v.art === 'regal'
      ? [0.33, 0.66].map((f): Form => ({ art: 'linie', a: [B * f, 0], b: [B * f, T] }))
      : v.art === 'schrank'
        ? [{ art: 'linie', a: [B * 0.05, T / 2], b: [B * 0.95, T / 2] }]
        : []
  return (
    <svg width={groesse} height={groesse} viewBox={`${-rand} ${-rand} ${m + 2 * rand} ${m + 2 * rand}`} className="shrink-0" aria-hidden="true">
      <g transform={`translate(${(m - B) / 2} ${(m - T) / 2})`} fill="none" stroke="currentColor" strokeWidth={1.3}>
        <polygon points={umriss.map((p) => p.join(',')).join(' ')} vectorEffect="non-scaling-stroke" />
        {formen.map((f, i) => {
          if (f.art === 'kreis') return <circle key={i} cx={f.m[0]} cy={f.m[1]} r={f.r} vectorEffect="non-scaling-stroke" />
          if (f.art === 'linie') return <line key={i} x1={f.a[0]} y1={f.a[1]} x2={f.b[0]} y2={f.b[1]} vectorEffect="non-scaling-stroke" />
          const pts = f.p.map((p) => p.join(',')).join(' ')
          return f.zu ? (
            <polygon key={i} points={pts} vectorEffect="non-scaling-stroke" />
          ) : (
            <polyline key={i} points={pts} vectorEffect="non-scaling-stroke" />
          )
        })}
      </g>
    </svg>
  )
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
