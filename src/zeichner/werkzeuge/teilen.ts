/* Teilen (T): eine Linie quer durch einen Raum, von Wand zu Wand. Zwei
 * Klicks (90 Grad gefangen, Umschalt frei). Es entstehen zwei Raeume; der
 * groessere behaelt Id und Zimmer, der Inhalt geht an den Teil, in dem er
 * liegt (die Datenbank haengt ihn per "zuordnen" um).
 */
import type { Punkt } from '../../lib/geometrie.ts'
import { raumTeilen } from '../dok.ts'
import { fangen, weiterFangen } from '../fangen.ts'
import { cmZahl, type Schritt, type Vorschau, type Werkzeug } from './typen.ts'

export interface TeilenZustand {
  a: Punkt | null
  zeiger: Punkt | null
}

const FANG_PX = 10

export const teilenWerkzeug: Werkzeug<TeilenZustand> = {
  name: 'teilen',
  start: () => ({ a: null, zeiger: null }),

  runter(k, z, s): Schritt<TeilenZustand> {
    const tol = FANG_PX / k.massstab
    if (!s.a) {
      const g = fangen(k.dok, z.p, { raster: k.raster, toleranz: tol, kanten: true })
      return { s: { a: g.p, zeiger: g.p } }
    }
    const b = weiterFangen(k.dok, s.a, z.p, { raster: k.raster, toleranz: tol, winkel: k.winkel, frei: z.frei }).p
    const r = raumTeilen(k.dok, s.a, b, k.neueId())
    if ('fehler' in r) return { s: { a: null, zeiger: b }, aktionen: [{ typ: 'hinweis', schluessel: r.fehler }] }
    return {
      s: { a: null, zeiger: b },
      aktionen: [
        { typ: 'aendern', dok: r.dok, auswahl: { art: 'raum', id: r.neuId } },
        { typ: 'hinweis', schluessel: 'zeichner.geteilt' },
      ],
    }
  },

  bewegen(k, z, s) {
    const tol = FANG_PX / k.massstab
    const p = s.a
      ? weiterFangen(k.dok, s.a, z.p, { raster: k.raster, toleranz: tol, winkel: k.winkel, frei: z.frei }).p
      : fangen(k.dok, z.p, { raster: k.raster, toleranz: tol, kanten: true }).p
    return { s: { ...s, zeiger: p } }
  },

  hoch: (_k, _z, s) => ({ s }),
  taste: () => null,

  abbrechen(s) {
    return { s: { a: null, zeiger: s.zeiger }, etwas: s.a !== null }
  },

  vorschau(_k, s): Vorschau {
    if (!s.a || !s.zeiger) return { punkte: s.zeiger ? [s.zeiger] : [] }
    return {
      linien: [{ a: s.a, b: s.zeiger, art: 'hilfe' }],
      punkte: [s.a, s.zeiger],
      texte: [
        {
          p: [(s.a[0] + s.zeiger[0]) / 2, (s.a[1] + s.zeiger[1]) / 2],
          text: cmZahl(Math.hypot(s.zeiger[0] - s.a[0], s.zeiger[1] - s.a[1])),
        },
      ],
    }
  },
}
