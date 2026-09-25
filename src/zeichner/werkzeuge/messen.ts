/* Messen (A): zwei gefangene Punkte, der Abstand steht daneben. Nur
 * Anzeige, nichts wird gespeichert. Ein dritter Klick beginnt neu.
 */
import type { Punkt } from '../../lib/geometrie.ts'
import { fangen } from '../fangen.ts'
import { cmZahl, type Vorschau, type Werkzeug } from './typen.ts'

export interface MessenZustand {
  a: Punkt | null
  b: Punkt | null
  zeiger: Punkt | null
}

export const messenWerkzeug: Werkzeug<MessenZustand> = {
  name: 'messen',
  start: () => ({ a: null, b: null, zeiger: null }),
  runter(k, z, s) {
    const p = fangen(k.dok, z.p, { raster: 1, toleranz: 10 / k.massstab, kanten: true }).p
    if (!s.a || s.b) return { s: { a: p, b: null, zeiger: p } }
    return { s: { ...s, b: p } }
  },
  bewegen(k, z, s) {
    return { s: { ...s, zeiger: fangen(k.dok, z.p, { raster: 1, toleranz: 10 / k.massstab, kanten: true }).p } }
  },
  hoch: (_k, _z, s) => ({ s }),
  taste: () => null,
  abbrechen: (s) => ({ s: { a: null, b: null, zeiger: s.zeiger }, etwas: s.a !== null }),
  vorschau(_k, s): Vorschau {
    const a = s.a
    const b = s.b ?? s.zeiger
    if (!a || !b) return { punkte: s.zeiger ? [s.zeiger] : [] }
    const l = Math.hypot(b[0] - a[0], b[1] - a[1])
    return {
      linien: [{ a, b, art: 'mass' }],
      punkte: [a, b],
      texte: [{ p: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], text: cmZahl(l) }],
    }
  },
}
