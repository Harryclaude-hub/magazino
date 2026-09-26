/* Linie (L): eine gestrichelte Hilfslinie, nur zur Anzeige (Treppe, Stufe,
 * Teppich, Bereich). Zwei Klicks; gefangen wie beim Raum (Raster, Ecken,
 * 90 Grad, mit Umschalt frei). Laenge tippen und Enter geht auch. Die
 * Linie prueft nichts und haelt nichts auf. Waehlen, ziehen und loeschen
 * mit der Auswahl.
 */
import { laengeLesen, type Punkt } from '../../lib/geometrie.ts'
import { linieHinzufuegen } from '../dok.ts'
import { fangen, richtung, weiterFangen } from '../fangen.ts'
import { cmZahl, istLaengenZeichen, type Kontext, type Schritt, type Vorschau, type Werkzeug, type Zeiger } from './typen.ts'

export interface LinieZustand {
  a: Punkt | null
  zeiger: Punkt | null
  text: string
}

const FANG_PX = 10

function punktFuer(k: Kontext, z: Zeiger, s: LinieZustand): Punkt {
  const tol = FANG_PX / k.massstab
  if (s.a) return weiterFangen(k.dok, s.a, z.p, { raster: k.raster, toleranz: tol, winkel: k.winkel, frei: z.frei }).p
  return fangen(k.dok, z.p, { raster: k.raster, toleranz: tol, kanten: true }).p
}

function fertig(k: Kontext, a: Punkt, b: Punkt): Schritt<LinieZustand> {
  if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 1) return { s: { a: null, zeiger: b, text: '' } }
  const id = k.neueId()
  return {
    s: { a: null, zeiger: b, text: '' },
    aktionen: [{ typ: 'aendern', dok: linieHinzufuegen(k.dok, { id, a, b }), auswahl: { art: 'linie', id } }],
  }
}

export const linieWerkzeug: Werkzeug<LinieZustand> = {
  name: 'linie',
  start: () => ({ a: null, zeiger: null, text: '' }),

  runter(k, z, s) {
    const p = punktFuer(k, z, s)
    if (!s.a) return { s: { a: p, zeiger: p, text: '' } }
    return fertig(k, s.a, p)
  },

  bewegen(k, z, s) {
    return { s: { ...s, zeiger: punktFuer(k, z, s) } }
  },

  hoch: (_k, _z, s) => ({ s }),

  taste(k, code, key, frei, s) {
    if (!s.a) return null
    if (code === 'Backspace') return { s: { ...s, text: s.text.slice(0, -1) } }
    if (code === 'Enter' || code === 'NumpadEnter') {
      const l = laengeLesen(s.text)
      if (!s.text || l === null || l === 0) return { s, aktionen: [{ typ: 'hinweis', schluessel: 'zeichner.laenge_unklar' }] }
      const ziel = s.zeiger ?? [s.a[0] + 1, s.a[1]]
      const [rx, ry] = richtung(s.a, ziel, k.winkel && !frei)
      return fertig(k, s.a, [Math.round(s.a[0] + rx * l), Math.round(s.a[1] + ry * l)])
    }
    if (istLaengenZeichen(key) && (/[0-9٠-٩۰-۹]/.test(key) || s.text.length > 0)) return { s: { ...s, text: s.text + key } }
    return null
  },

  abbrechen(s) {
    return { s: { a: null, zeiger: s.zeiger, text: '' }, etwas: s.a !== null }
  },

  vorschau(k, s): Vorschau {
    if (!s.a || !s.zeiger) return { punkte: s.zeiger ? [s.zeiger] : [] }
    let b = s.zeiger
    const l = s.text ? laengeLesen(s.text) : null
    if (l) {
      const [rx, ry] = richtung(s.a, s.zeiger, k.winkel)
      b = [Math.round(s.a[0] + rx * l), Math.round(s.a[1] + ry * l)]
    }
    return {
      linien: [{ a: s.a, b, art: 'hilfe' }],
      punkte: [s.a, b],
      texte: [{ p: [(s.a[0] + b[0]) / 2, (s.a[1] + b[1]) / 2], text: cmZahl(Math.hypot(b[0] - s.a[0], b[1] - s.a[1])) }],
      eingabe: s.text || undefined,
    }
  },
}
