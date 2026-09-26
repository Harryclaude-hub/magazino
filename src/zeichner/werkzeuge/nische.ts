/* Nische (N): ein Stueck Wand rein- oder rausruecken.
 *
 * 1. Klick: erster Punkt auf einer Wand. 2. Klick: zweiter Punkt auf
 * derselben Wand. Dann zeigt die Maus, wie weit das Stueck dazwischen
 * wandert: in den Raum hinein gibt eine Nische (oder, an einer Ecke, eine
 * weggeschnittene Ecke, also eine L-Form), nach aussen einen Vorsprung.
 * 3. Klick uebernimmt; oder Tiefe tippen ("40" oder "0,4") und Enter, die
 * Richtung (rein oder raus) zeigt die Maus. Esc bricht ab.
 */
import { einrasten, laengeLesen, type Punkt } from '../../lib/geometrie.ts'
import { streckenAbstand } from '../../components/plan/hilfe.ts'
import { nischeFormen, raumVon, type Dok } from '../dok.ts'
import { cmZahl, istLaengenZeichen, type Kontext, type Schritt, type Vorschau, type Werkzeug, type Zeiger } from './typen.ts'

export interface NischeZustand {
  /** Erster Punkt auf einer Wand, mit seinem Raum. */
  a: { raumId: string; p: Punkt } | null
  /** Ab dem zweiten Punkt: die Wand und das Stueck darauf (cm ab ihrer ersten Ecke). */
  wand: { raumId: string; kante: number; t0: number; t1: number } | null
  zeiger: Punkt | null
  /** Tiefe aus der Mausstellung, positiv nach innen. */
  tiefe: number
  text: string
}

const WAND_PX = 10
const ECKE_PX = 10

function start(): NischeZustand {
  return { a: null, wand: null, zeiger: null, tiefe: 0, text: '' }
}

/** Ein Punkt auf einer Wand unter dem Zeiger, eingerastet auf das Raster
 *  entlang der Wand und auf die Ecken. Der gewaehlte Raum hat Vorrang. */
function wandPunkt(k: Kontext, p: Punkt, nurRaum?: string): { raumId: string; kante: number; t: number; p: Punkt } | null {
  const tol = WAND_PX / k.massstab
  const vorne = k.auswahl && 'raumId' in k.auswahl ? k.auswahl.raumId : k.auswahl?.art === 'raum' ? k.auswahl.id : null
  const raeume = [...k.dok.raeume]
    .filter((r) => !nurRaum || r.id === nurRaum)
    .sort((a, b) => (a.id === vorne ? -1 : b.id === vorne ? 1 : 0))
  let best: { raumId: string; kante: number; t: number; p: Punkt; d: number } | null = null
  for (const r of raeume) {
    const n = r.punkte.length
    for (let i = 0; i < n; i++) {
      const a = r.punkte[i]
      const b = r.punkte[(i + 1) % n]
      const s = streckenAbstand(p, a, b)
      if (s.abstand > tol || (best && s.abstand >= best.d)) continue
      const l = Math.hypot(b[0] - a[0], b[1] - a[1])
      let t = einrasten(s.t * l, k.raster)
      if (t * k.massstab < ECKE_PX) t = 0
      if ((l - t) * k.massstab < ECKE_PX) t = l
      t = Math.max(0, Math.min(l, t))
      const q: Punkt = [a[0] + ((b[0] - a[0]) * t) / (l || 1), a[1] + ((b[1] - a[1]) * t) / (l || 1)]
      best = { raumId: r.id, kante: i, t, p: q, d: s.abstand }
    }
    if (best) break
  }
  return best ? { raumId: best.raumId, kante: best.kante, t: best.t, p: best.p } : null
}

/** Die Wand des Raums, auf der beide Punkte liegen, mit ihren Abstaenden
 *  ab der ersten Ecke. Eine Ecke gehoert zu zwei Waenden. */
function gemeinsameWand(dok: Dok, raumId: string, p: Punkt, q: Punkt, tol: number): { kante: number; t0: number; t1: number } | null {
  const r = raumVon(dok, raumId)
  if (!r) return null
  const n = r.punkte.length
  for (let i = 0; i < n; i++) {
    const a = r.punkte[i]
    const b = r.punkte[(i + 1) % n]
    const sp = streckenAbstand(p, a, b)
    const sq = streckenAbstand(q, a, b)
    if (sp.abstand > tol || sq.abstand > tol) continue
    const l = Math.hypot(b[0] - a[0], b[1] - a[1])
    return { kante: i, t0: sp.t * l, t1: sq.t * l }
  }
  return null
}

function innenNormal(dok: Dok, w: NonNullable<NischeZustand['wand']>): { a: Punkt; n: Punkt; r: Punkt } | null {
  const raum = raumVon(dok, w.raumId)
  if (!raum) return null
  const a = raum.punkte[w.kante]
  const b = raum.punkte[(w.kante + 1) % raum.punkte.length]
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
  const rx = (b[0] - a[0]) / l
  const ry = (b[1] - a[1]) / l
  return { a, r: [rx, ry], n: [-ry, rx] }
}

function tiefeAus(k: Kontext, s: NischeZustand, z: Zeiger): number {
  if (!s.wand) return 0
  const g = innenNormal(k.dok, s.wand)
  if (!g) return 0
  const d = (z.p[0] - g.a[0]) * g.n[0] + (z.p[1] - g.a[1]) * g.n[1]
  return einrasten(d, k.raster)
}

/** Die getippte Tiefe mit der Richtung der Maus, sonst die der Maus. */
function wirksameTiefe(s: NischeZustand): number | null {
  if (!s.text) return s.tiefe
  const l = laengeLesen(s.text)
  if (l === null) return null
  return (s.tiefe < 0 ? -1 : 1) * Math.round(l)
}

function anwenden(k: Kontext, s: NischeZustand): Schritt<NischeZustand> {
  const w = s.wand
  const tiefe = wirksameTiefe(s)
  if (!w) return { s }
  if (tiefe === null) return { s, aktionen: [{ typ: 'hinweis', schluessel: 'zeichner.laenge_unklar' }] }
  const r = nischeFormen(k.dok, w.raumId, w.kante, w.t0, w.t1, tiefe)
  if (r.fehler === 'leer') return { s, aktionen: [{ typ: 'hinweis', schluessel: 'zeichner.nische_leer' }] }
  if (r.fehler) return { s, aktionen: [{ typ: 'hinweis', schluessel: `zeichner.raum_fehler.${r.fehler}` }] }
  return { s: { ...start(), zeiger: s.zeiger }, aktionen: [{ typ: 'aendern', dok: r.dok, auswahl: { art: 'raum', id: w.raumId } }] }
}

export const nischeWerkzeug: Werkzeug<NischeZustand> = {
  name: 'nische',
  start,

  runter(k, z, s) {
    if (s.wand) return anwenden(k, s)
    if (!s.a) {
      const w = wandPunkt(k, z.p)
      if (!w) return { s, aktionen: [{ typ: 'hinweis', schluessel: 'zeichner.nische_auf_wand' }] }
      return { s: { ...s, a: { raumId: w.raumId, p: w.p }, zeiger: w.p } }
    }
    const w = wandPunkt(k, z.p, s.a.raumId)
    if (!w) return { s, aktionen: [{ typ: 'hinweis', schluessel: 'zeichner.nische_auf_wand' }] }
    const g = gemeinsameWand(k.dok, s.a.raumId, s.a.p, w.p, 0.75)
    if (!g) return { s, aktionen: [{ typ: 'hinweis', schluessel: 'zeichner.nische_selbe_wand' }] }
    if (Math.abs(g.t1 - g.t0) < 1) return { s }
    return { s: { ...s, wand: { raumId: s.a.raumId, kante: g.kante, t0: Math.min(g.t0, g.t1), t1: Math.max(g.t0, g.t1) }, zeiger: w.p, tiefe: 0 } }
  },

  bewegen(k, z, s) {
    if (s.wand) return { s: { ...s, zeiger: z.p, tiefe: tiefeAus(k, s, z) } }
    const w = wandPunkt(k, z.p, s.a?.raumId)
    return { s: { ...s, zeiger: w ? w.p : null } }
  },

  hoch: (_k, _z, s) => ({ s }),

  taste(k, code, key, _frei, s) {
    if (!s.wand) return null
    if (code === 'Backspace') return { s: { ...s, text: s.text.slice(0, -1) } }
    if (code === 'Enter' || code === 'NumpadEnter') return anwenden(k, s)
    if (istLaengenZeichen(key) && (/[0-9٠-٩۰-۹]/.test(key) || s.text.length > 0)) return { s: { ...s, text: s.text + key } }
    return null
  },

  abbrechen(s) {
    return { s: { ...start(), zeiger: s.zeiger }, etwas: s.a !== null }
  },

  vorschau(k, s): Vorschau {
    const v: Vorschau = { linien: [], texte: [], punkte: [] }
    if (!s.a) {
      if (s.zeiger) v.punkte?.push(s.zeiger)
      return v
    }
    if (!s.wand) {
      v.punkte?.push(s.a.p)
      if (s.zeiger) {
        v.punkte?.push(s.zeiger)
        v.linien?.push({ a: s.a.p, b: s.zeiger, art: 'hilfe' })
        const l = Math.hypot(s.zeiger[0] - s.a.p[0], s.zeiger[1] - s.a.p[1])
        if (l >= 1) v.texte?.push({ p: [(s.a.p[0] + s.zeiger[0]) / 2, (s.a.p[1] + s.zeiger[1]) / 2], text: cmZahl(l) })
      }
      return v
    }
    const tiefe = wirksameTiefe(s) ?? 0
    const g = innenNormal(k.dok, s.wand)
    if (!g) return v
    const p1: Punkt = [g.a[0] + g.r[0] * s.wand.t0, g.a[1] + g.r[1] * s.wand.t0]
    const p2: Punkt = [g.a[0] + g.r[0] * s.wand.t1, g.a[1] + g.r[1] * s.wand.t1]
    const q1: Punkt = [p1[0] + g.n[0] * tiefe, p1[1] + g.n[1] * tiefe]
    const q2: Punkt = [p2[0] + g.n[0] * tiefe, p2[1] + g.n[1] * tiefe]
    const r = tiefe === 0 ? null : nischeFormen(k.dok, s.wand.raumId, s.wand.kante, s.wand.t0, s.wand.t1, tiefe)
    const ok = !!r && r.fehler === null
    v.flaechen = [{ punkte: [p1, q1, q2, p2], art: ok || tiefe === 0 ? 'geist' : 'falsch' }]
    v.punkte?.push(p1, p2)
    v.texte?.push({ p: [(q1[0] + q2[0]) / 2, (q1[1] + q2[1]) / 2], text: cmZahl(Math.abs(tiefe)) })
    v.texte?.push({ p: [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2], text: cmZahl(s.wand.t1 - s.wand.t0) })
    v.eingabe = s.text || undefined
    return v
  },
}
