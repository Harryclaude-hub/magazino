/* Einrasten: ein Zeiger in cm wird zu einem Punkt auf ganzen cm.
 *
 * Reihenfolge: eine vorhandene Ecke in der Naehe gewinnt (damit Raeume
 * genau aneinander stossen), dann auf Wunsch ein Punkt auf einer Wand, dann
 * das Raster (1, 5 oder 10 cm). Beim Zeichnen von Wand zu Wand wird die
 * Richtung auf 90 Grad gefangen und die Laenge aufs Raster gerundet;
 * Umschalt macht beides frei (START 5.4).
 */
import { einrasten, type Punkt } from '../lib/geometrie.ts'
import { streckenAbstand } from '../components/plan/hilfe.ts'
import type { Dok } from './dok'

export type FangArt = 'ecke' | 'kante' | 'raster'

export interface Gefangen {
  p: Punkt
  art: FangArt
  /** Bei 'kante': welcher Raum und welche Kante. */
  raumId?: string
  kante?: number
}

export function fangen(
  dok: Pick<Dok, 'raeume'>,
  p: Punkt,
  opt: { raster: number; toleranz: number; kanten?: boolean; ohne?: { raumId: string; ecke: number } },
): Gefangen {
  let beste: Gefangen | null = null
  let bester = opt.toleranz
  for (const r of dok.raeume) {
    for (let i = 0; i < r.punkte.length; i++) {
      if (opt.ohne && opt.ohne.raumId === r.id && opt.ohne.ecke === i) continue
      const q = r.punkte[i]
      const d = Math.hypot(q[0] - p[0], q[1] - p[1])
      if (d <= bester) {
        bester = d
        beste = { p: [q[0], q[1]], art: 'ecke' }
      }
    }
  }
  if (beste) return beste
  if (opt.kanten) {
    let kb: Gefangen | null = null
    let kd = opt.toleranz
    for (const r of dok.raeume) {
      const n = r.punkte.length
      for (let k = 0; k < n; k++) {
        const a = r.punkte[k]
        const b = r.punkte[(k + 1) % n]
        const s = streckenAbstand(p, a, b)
        if (s.abstand <= kd) {
          kd = s.abstand
          // Auf einer geraden Wand bleibt die Wandkoordinate exakt, nur
          // entlang der Wand wird gerastert.
          let q: Punkt
          if (a[1] === b[1]) q = [einrasten(s.punkt[0], opt.raster), a[1]]
          else if (a[0] === b[0]) q = [a[0], einrasten(s.punkt[1], opt.raster)]
          else q = [Math.round(s.punkt[0]), Math.round(s.punkt[1])]
          kb = { p: q, art: 'kante', raumId: r.id, kante: k }
        }
      }
    }
    if (kb) return kb
  }
  return { p: [einrasten(p[0], opt.raster), einrasten(p[1], opt.raster)], art: 'raster' }
}

/** Vom letzten Punkt aus: Richtung auf 90 Grad gefangen (ausser frei),
 *  Laenge aufs Raster. Liegt eine Ecke in der Naehe, gewinnt sie. */
export function weiterFangen(
  dok: Pick<Dok, 'raeume'>,
  von: Punkt,
  p: Punkt,
  opt: { raster: number; toleranz: number; winkel: boolean; frei: boolean; extra?: Punkt[] },
): Gefangen {
  for (const q of opt.extra ?? []) {
    if (Math.hypot(q[0] - p[0], q[1] - p[1]) <= opt.toleranz) return { p: q, art: 'ecke' }
  }
  const ecke = fangen(dok, p, { raster: opt.raster, toleranz: opt.toleranz })
  if (ecke.art === 'ecke') return ecke
  const dx = p[0] - von[0]
  const dy = p[1] - von[1]
  if (opt.winkel && !opt.frei) {
    if (Math.abs(dx) >= Math.abs(dy)) return { p: [von[0] + einrasten(dx, opt.raster), von[1]], art: 'raster' }
    return { p: [von[0], von[1] + einrasten(dy, opt.raster)], art: 'raster' }
  }
  return { p: [von[0] + einrasten(dx, opt.raster), von[1] + einrasten(dy, opt.raster)], art: 'raster' }
}

/** Einheitsrichtung von a nach b; auf 90 Grad, wenn gefangen. */
export function richtung(a: Punkt, b: Punkt, gefangen: boolean): Punkt {
  let dx = b[0] - a[0]
  let dy = b[1] - a[1]
  if (gefangen) {
    if (Math.abs(dx) >= Math.abs(dy)) dy = 0
    else dx = 0
  }
  const l = Math.hypot(dx, dy)
  if (l === 0) return [1, 0]
  return [dx / l, dy / l]
}
