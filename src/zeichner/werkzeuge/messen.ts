/* Messen (A): zwei gefangene Punkte, der Abstand steht daneben. Nur
 * Anzeige, nichts wird gespeichert. Ein dritter Klick beginnt neu.
 *
 * E90: Gefangen wird zuerst an den Messpunkten der Wohnung (Ecken, Enden
 * von Tueren, Durchgaengen und Fenstern, Gegenseite der Tuer, siehe
 * messpunkte.ts), dann an einer Wand, dann am Raster. Solange das
 * Werkzeug an ist, stehen alle Messpunkte als kleine Marken im Plan, der
 * unter dem Zeiger mit Namen. Liegen beide Punkte an den Enden derselben
 * Oeffnung, steht "Lichte" vor der Zahl. Steht der Zeiger ueber einer
 * Tuer, einem Durchgang oder einem Fenster (ohne halbe Messung), zeigen
 * Schnellmasse ihre Breite und den Abstand bis zur naechsten Ecke.
 */
import type { Punkt } from '../../lib/geometrie.ts'
import { oeffnungAn } from '../../components/plan/hilfe.ts'
import { istLichte, messFangen, messpunkte, schnellMasse, type Messpunkt } from '../messpunkte.ts'
import { cmZahl, type Kontext, type Vorschau, type Werkzeug } from './typen.ts'

export interface MessenZustand {
  a: Punkt | null
  b: Punkt | null
  zeiger: Punkt | null
  /** Die Messpunkte an a, b und unter dem Zeiger (null: frei gefangen). */
  aPunkt: Messpunkt | null
  bPunkt: Messpunkt | null
  zeigerPunkt: Messpunkt | null
  /** Tuer, Durchgang oder Fenster unter dem Zeiger (fuer Schnellmasse). */
  ueber: string | null
}

/** Fangweite: 10 Bildpunkte, in cm. */
function toleranz(k: Kontext): number {
  return 10 / k.massstab
}

/** Ueber einer Oeffnung: ihre gezeichnete Wand ist 12 cm dick, darum
 *  mindestens 7 cm um die Kante, sonst 10 Bildpunkte. */
function ueberOeffnung(k: Kontext, p: Punkt): string | null {
  return oeffnungAn(k.dok, p, Math.max(7, 10 / k.massstab))?.id ?? null
}

export const messenWerkzeug: Werkzeug<MessenZustand> = {
  name: 'messen',
  start: () => ({ a: null, b: null, zeiger: null, aPunkt: null, bPunkt: null, zeigerPunkt: null, ueber: null }),
  runter(k, z, s) {
    const f = messFangen(k.dok, z.p, { raster: 1, toleranz: toleranz(k) })
    const ueber = ueberOeffnung(k, z.p)
    if (!s.a || s.b) {
      return { s: { a: f.p, b: null, zeiger: f.p, aPunkt: f.messpunkt, bPunkt: null, zeigerPunkt: f.messpunkt, ueber } }
    }
    return { s: { ...s, b: f.p, bPunkt: f.messpunkt, zeiger: f.p, zeigerPunkt: f.messpunkt, ueber } }
  },
  bewegen(k, z, s) {
    const f = messFangen(k.dok, z.p, { raster: 1, toleranz: toleranz(k) })
    return { s: { ...s, zeiger: f.p, zeigerPunkt: f.messpunkt, ueber: ueberOeffnung(k, z.p) } }
  },
  hoch: (_k, _z, s) => ({ s }),
  taste: () => null,
  abbrechen: (s) => ({ s: { ...s, a: null, b: null, aPunkt: null, bPunkt: null }, etwas: s.a !== null }),
  vorschau(k, s): Vorschau {
    const v: Vorschau = { messpunkte: { alle: messpunkte(k.dok), an: s.zeigerPunkt, von: s.a && !s.b ? s.a : null } }
    const linien: NonNullable<Vorschau['linien']> = []
    const texte: NonNullable<Vorschau['texte']> = []
    // Schnellmasse nur, wenn gerade keine Messung halb fertig ist.
    if (s.ueber && !(s.a && !s.b)) {
      // Masslinie 36 Bildpunkte vor der Innenseite der 12 cm dicken Wand:
      // ihre Zahl steht dann nicht auf der Laenge der Wand (Leinwand, wandMasse).
      for (const m of schnellMasse(k.dok, s.ueber, 6 + 36 / k.massstab)) {
        linien.push({ a: m.a, b: m.b, art: 'mass' }, { a: m.wandA, b: m.a, art: 'mass' }, { a: m.wandB, b: m.b, art: 'mass' })
        texte.push({ p: [(m.a[0] + m.b[0]) / 2, (m.a[1] + m.b[1]) / 2], text: cmZahl(m.laenge), lichte: m.art === 'breite' })
      }
    }
    const a = s.a
    const b = s.b ?? s.zeiger
    if (a && b) {
      const bPunkt = s.b ? s.bPunkt : s.zeigerPunkt
      const l = Math.hypot(b[0] - a[0], b[1] - a[1])
      linien.push({ a, b, art: 'mass' })
      texte.push({ p: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], text: cmZahl(l), lichte: istLichte(s.aPunkt, bPunkt) })
      v.punkte = [a, b]
    } else {
      // Auf einem Messpunkt zeigt die Marke selbst, wo es einrastet.
      v.punkte = s.zeiger && !s.zeigerPunkt ? [s.zeiger] : []
    }
    if (linien.length) v.linien = linien
    if (texte.length) v.texte = texte
    return v
  },
}
