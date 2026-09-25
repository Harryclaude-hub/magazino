/* Raum (R): Punkt fuer Punkt. Richtung mit der Maus zeigen, Laenge tippen
 * ("3,45" oder "345"), Enter: die Wand steht, ohne in ein Feld zu klicken.
 * Klick auf den Startpunkt oder Enter ohne Zahl schliesst den Raum.
 * Rueckschritt nimmt das letzte Zeichen, sonst den letzten Punkt.
 *
 * Umschalt+R: Rechteck. Erste Ecke klicken, dann "4,20" Tab "3,85" Enter
 * (oder die zweite Ecke klicken).
 */
import { laengeLesen, type Punkt } from '../../lib/geometrie.ts'
import { raumAnlegen } from '../dok.ts'
import { fangen, richtung, weiterFangen } from '../fangen.ts'
import { cmZahl, istLaengenZeichen, type Aktion, type Kontext, type Schritt, type Vorschau, type Werkzeug, type Zeiger } from './typen.ts'

export interface RaumZustand {
  modus: 'punkte' | 'rechteck'
  punkte: Punkt[]
  zeiger: Punkt | null
  gefangen: boolean
  text: string
  /* Rechteck */
  ecke: Punkt | null
  breite: string
  tiefe: string
  feld: 1 | 2
}

export function raumStart(modus: RaumZustand['modus'] = 'punkte'): RaumZustand {
  return { modus, punkte: [], zeiger: null, gefangen: false, text: '', ecke: null, breite: '', tiefe: '', feld: 1 }
}

const FANG_PX = 10

function zeigerFuer(k: Kontext, z: Zeiger, s: RaumZustand): { p: Punkt; gefangen: boolean } {
  const tol = FANG_PX / k.massstab
  if (s.modus === 'punkte' && s.punkte.length > 0) {
    const g = weiterFangen(k.dok, s.punkte[s.punkte.length - 1], z.p, {
      raster: k.raster,
      toleranz: tol,
      winkel: k.winkel,
      frei: z.frei,
      extra: s.punkte.length >= 3 ? [s.punkte[0]] : [],
    })
    return { p: g.p, gefangen: g.art === 'ecke' }
  }
  const g = fangen(k.dok, z.p, { raster: k.raster, toleranz: tol, kanten: true })
  return { p: g.p, gefangen: g.art !== 'raster' }
}

function schliessen(k: Kontext, punkte: Punkt[]): Aktion[] {
  const id = k.neueId()
  const r = raumAnlegen(k.dok, id, punkte)
  if (r.fehler !== null) return [{ typ: 'hinweis', schluessel: `zeichner.raum_fehler.${r.fehler}` }]
  return [{ typ: 'aendern', dok: r.dok, auswahl: { art: 'raum', id } }]
}

function rechteckAus(ecke: Punkt, zeiger: Punkt | null, breite: number | null, tiefe: number | null): Punkt[] | null {
  const sx = zeiger && zeiger[0] < ecke[0] ? -1 : 1
  const sy = zeiger && zeiger[1] < ecke[1] ? -1 : 1
  const w = breite ?? (zeiger ? Math.abs(zeiger[0] - ecke[0]) : null)
  const h = tiefe ?? (zeiger ? Math.abs(zeiger[1] - ecke[1]) : null)
  if (!w || !h) return null
  const x2 = ecke[0] + sx * w
  const y2 = ecke[1] + sy * h
  const x0 = Math.min(ecke[0], x2)
  const x1 = Math.max(ecke[0], x2)
  const y0 = Math.min(ecke[1], y2)
  const y1 = Math.max(ecke[1], y2)
  return [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ]
}

export const raumWerkzeug: Werkzeug<RaumZustand> = {
  name: 'raum',
  start: () => raumStart('punkte'),

  runter(k, z, s): Schritt<RaumZustand> {
    const { p } = zeigerFuer(k, z, s)
    if (s.modus === 'rechteck') {
      if (!s.ecke) return { s: { ...s, ecke: p, zeiger: p, breite: '', tiefe: '', feld: 1 } }
      const rechteck = rechteckAus(s.ecke, p, laengeLesen(s.breite), laengeLesen(s.tiefe))
      if (!rechteck) return { s }
      return { s: raumStart('rechteck'), aktionen: schliessen(k, rechteck) }
    }
    if (s.punkte.length >= 3 && p[0] === s.punkte[0][0] && p[1] === s.punkte[0][1]) {
      return { s: raumStart('punkte'), aktionen: schliessen(k, s.punkte) }
    }
    const letzter = s.punkte[s.punkte.length - 1]
    if (letzter && letzter[0] === p[0] && letzter[1] === p[1]) return { s }
    return { s: { ...s, punkte: [...s.punkte, p], zeiger: p, text: '' } }
  },

  bewegen(k, z, s) {
    const { p, gefangen } = zeigerFuer(k, z, s)
    return { s: { ...s, zeiger: p, gefangen } }
  },

  hoch(_k, _z, s) {
    return { s }
  },

  taste(k, code, key, frei, s) {
    if (s.modus === 'rechteck') {
      if (!s.ecke) return null
      const feldText = s.feld === 1 ? s.breite : s.tiefe
      const setzen = (v: string): RaumZustand => (s.feld === 1 ? { ...s, breite: v } : { ...s, tiefe: v })
      if (code === 'Tab') return { s: { ...s, feld: s.feld === 1 ? 2 : 1 } }
      if (code === 'Backspace') return { s: setzen(feldText.slice(0, -1)) }
      if (code === 'Enter' || code === 'NumpadEnter') {
        const b = s.breite ? laengeLesen(s.breite) : null
        const t = s.tiefe ? laengeLesen(s.tiefe) : null
        if ((s.breite && b === null) || (s.tiefe && t === null)) {
          return { s, aktionen: [{ typ: 'hinweis', schluessel: 'zeichner.laenge_unklar' }] }
        }
        const rechteck = rechteckAus(s.ecke, s.zeiger, b, t)
        if (!rechteck) return { s, aktionen: [{ typ: 'hinweis', schluessel: 'zeichner.rechteck_masse' }] }
        return { s: raumStart('rechteck'), aktionen: schliessen(k, rechteck) }
      }
      if (istLaengenZeichen(key)) return { s: setzen(feldText + key) }
      return null
    }

    if (code === 'Backspace') {
      if (s.text) return { s: { ...s, text: s.text.slice(0, -1) } }
      if (s.punkte.length) return { s: { ...s, punkte: s.punkte.slice(0, -1) } }
      return { s }
    }
    if (code === 'Enter' || code === 'NumpadEnter') {
      if (!s.text) {
        if (s.punkte.length >= 3) return { s: raumStart('punkte'), aktionen: schliessen(k, s.punkte) }
        return { s, aktionen: [{ typ: 'hinweis', schluessel: 'zeichner.raum_mehr_punkte' }] }
      }
      const l = laengeLesen(s.text)
      if (l === null || l === 0) return { s, aktionen: [{ typ: 'hinweis', schluessel: 'zeichner.laenge_unklar' }] }
      const letzter = s.punkte[s.punkte.length - 1]
      if (!letzter) return { s, aktionen: [{ typ: 'hinweis', schluessel: 'zeichner.erst_startpunkt' }] }
      const ziel = s.zeiger ?? [letzter[0] + 1, letzter[1]]
      const [rx, ry] = richtung(letzter, ziel, k.winkel && !frei)
      const neu: Punkt = [Math.round(letzter[0] + rx * l), Math.round(letzter[1] + ry * l)]
      if (s.punkte.length >= 3 && neu[0] === s.punkte[0][0] && neu[1] === s.punkte[0][1]) {
        return { s: raumStart('punkte'), aktionen: schliessen(k, s.punkte) }
      }
      return { s: { ...s, punkte: [...s.punkte, neu], text: '', zeiger: neu } }
    }
    // Buchstaben nur als Einheit, solange schon eine Zahl steht (sonst
    // bleiben M, C usw. Tasten fuer die Werkzeuge).
    if (istLaengenZeichen(key) && (/[0-9٠-٩۰-۹]/.test(key) || s.text.length > 0)) {
      if (s.punkte.length === 0) return { s, aktionen: [{ typ: 'hinweis', schluessel: 'zeichner.erst_startpunkt' }] }
      return { s: { ...s, text: s.text + key } }
    }
    return null
  },

  abbrechen(s) {
    const etwas = s.punkte.length > 0 || s.ecke !== null || s.text !== ''
    return { s: raumStart(s.modus), etwas }
  },

  vorschau(k, s): Vorschau {
    const v: Vorschau = { linien: [], texte: [], punkte: [] }
    if (s.modus === 'rechteck') {
      if (!s.ecke) {
        if (s.zeiger) v.punkte?.push(s.zeiger)
        return v
      }
      const b = laengeLesen(s.breite)
      const t = laengeLesen(s.tiefe)
      const r = rechteckAus(s.ecke, s.zeiger, b, t)
      if (r) {
        v.flaechen = [{ punkte: r, art: 'geist' }]
        v.texte?.push({ p: [(r[0][0] + r[1][0]) / 2, r[0][1]], text: cmZahl(r[1][0] - r[0][0]) })
        v.texte?.push({ p: [r[1][0], (r[1][1] + r[2][1]) / 2], text: cmZahl(r[2][1] - r[1][1]) })
      }
      v.eingabe = `${s.breite || '…'} x ${s.tiefe || '…'}`
      return v
    }
    const pts = s.punkte
    for (let i = 0; i + 1 < pts.length; i++) {
      v.linien?.push({ a: pts[i], b: pts[i + 1], art: 'geist' })
      v.texte?.push({
        p: [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2],
        text: cmZahl(Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1])),
      })
    }
    const letzter = pts[pts.length - 1]
    if (letzter && s.zeiger) {
      let ziel = s.zeiger
      const l = s.text ? laengeLesen(s.text) : null
      if (l) {
        const [rx, ry] = richtung(letzter, s.zeiger, k.winkel)
        ziel = [Math.round(letzter[0] + rx * l), Math.round(letzter[1] + ry * l)]
      }
      v.linien?.push({ a: letzter, b: ziel, art: 'hilfe' })
      v.texte?.push({
        p: [(letzter[0] + ziel[0]) / 2, (letzter[1] + ziel[1]) / 2],
        text: cmZahl(Math.hypot(ziel[0] - letzter[0], ziel[1] - letzter[1])),
      })
    }
    if (pts.length >= 3) v.punkte?.push(pts[0])
    if (s.zeiger && s.gefangen) v.punkte?.push(s.zeiger)
    if (pts.length === 0 && s.zeiger) v.punkte?.push(s.zeiger)
    v.eingabe = s.text || undefined
    return v
  },
}
