/* Tuer (D) und Fenster (F): auf eine Wand zeigen, klicken. Standard Tuer
 * 80 x 200 cm, Fenster 100 x 120 cm mit 90 cm Bruestung. Eine getippte
 * Zahl setzt den Abstand zur naeheren Ecke ("35" Enter). Farbe fest: Tuer
 * orange, Fenster blau.
 */
import { einrasten, laengeLesen, type Punkt } from '../../lib/geometrie.ts'
import { oeffnungPunkte, streckenAbstand } from '../../components/plan/hilfe.ts'
import type { Oeffnung, Raum } from '../../lib/types'
import type { Dok } from '../dok.ts'
import { cmZahl, istLaengenZeichen, type Kontext, type Schritt, type Vorschau, type Werkzeug } from './typen.ts'

interface OeffnungZustand {
  zeiger: Punkt | null
  ziel: { raumId: string; kante: number; abstand: number; laenge: number; nachEnde: boolean } | null
  text: string
}

const STANDARD = {
  tuer: { breite_cm: 80, hoehe_cm: 200, bruestung_cm: 0 },
  fenster: { breite_cm: 100, hoehe_cm: 120, bruestung_cm: 90 },
} as const

const FANG_PX = 14

/** Liegen zwei Strecken auf einer Linie und ueberdecken sich echt? */
export function ueberdecken(a: [Punkt, Punkt], b: [Punkt, Punkt]): boolean {
  const [p, q] = a
  const l = Math.hypot(q[0] - p[0], q[1] - p[1])
  if (l === 0) return false
  const rx = (q[0] - p[0]) / l
  const ry = (q[1] - p[1]) / l
  const quer = (x: Punkt) => Math.abs(rx * (x[1] - p[1]) - ry * (x[0] - p[0]))
  if (quer(b[0]) > 1 || quer(b[1]) > 1) return false
  const t0 = rx * (b[0][0] - p[0]) + ry * (b[0][1] - p[1])
  const t1 = rx * (b[1][0] - p[0]) + ry * (b[1][1] - p[1])
  return Math.min(t0, t1) < l - 0.5 && Math.max(t0, t1) > 0.5
}

export function oeffnungPasst(dok: Dok, o: Oeffnung, raum: Raum): boolean {
  const n = raum.punkte.length
  const a = raum.punkte[o.kante]
  const b = raum.punkte[(o.kante + 1) % n]
  const l = Math.hypot(b[0] - a[0], b[1] - a[1])
  if (o.abstand_cm < 0 || o.abstand_cm + o.breite_cm > l + 1e-9) return false
  if (o.bruestung_cm + o.hoehe_cm > raum.hoehe_cm) return false
  const s = oeffnungPunkte(raum, o)
  if (!s) return false
  for (const x of dok.oeffnungen) {
    if (x.id === o.id) continue
    const r = dok.raeume.find((y) => y.id === x.raum_id)
    const t = r ? oeffnungPunkte(r, x) : null
    if (t && ueberdecken(s, t)) return false
  }
  return true
}

function zielAn(k: Kontext, p: Punkt, breite: number): OeffnungZustand['ziel'] {
  const tol = FANG_PX / k.massstab
  let beste: OeffnungZustand['ziel'] = null
  let bester = tol
  for (const r of k.dok.raeume) {
    const n = r.punkte.length
    for (let i = 0; i < n; i++) {
      const a = r.punkte[i]
      const b = r.punkte[(i + 1) % n]
      const s = streckenAbstand(p, a, b)
      if (s.abstand > bester) continue
      const l = Math.hypot(b[0] - a[0], b[1] - a[1])
      const t = s.t * l
      const abstand = Math.max(0, Math.min(Math.floor(l) - breite, einrasten(t - breite / 2, k.raster)))
      bester = s.abstand
      beste = { raumId: r.id, kante: i, abstand, laenge: l, nachEnde: s.t > 0.5 }
    }
  }
  return beste
}

export function oeffnungWerkzeug(art: 'tuer' | 'fenster'): Werkzeug<OeffnungZustand> {
  const std = STANDARD[art]
  const bauen = (k: Kontext, ziel: NonNullable<OeffnungZustand['ziel']>, id: string): { o: Oeffnung; raum: Raum; ok: boolean } | null => {
    const raum = k.dok.raeume.find((r) => r.id === ziel.raumId)
    if (!raum) return null
    const o: Oeffnung = {
      id,
      raum_id: raum.id,
      art,
      kante: ziel.kante,
      abstand_cm: ziel.abstand,
      breite_cm: std.breite_cm,
      hoehe_cm: std.hoehe_cm,
      bruestung_cm: std.bruestung_cm,
      anschlag: 'links',
      aufschlag: 'innen',
    }
    return { o, raum, ok: ziel.laenge >= std.breite_cm && oeffnungPasst(k.dok, o, raum) }
  }
  const setzen = (k: Kontext, s: OeffnungZustand, ziel: NonNullable<OeffnungZustand['ziel']>): Schritt<OeffnungZustand> => {
    const id = k.neueId()
    const g = bauen(k, ziel, id)
    if (!g) return { s }
    if (!g.ok) return { s, aktionen: [{ typ: 'hinweis', schluessel: `zeichner.${art}_passt_nicht` }] }
    return {
      s: { ...s, text: '' },
      aktionen: [{ typ: 'aendern', dok: { ...k.dok, oeffnungen: [...k.dok.oeffnungen, g.o] }, auswahl: { art: 'oeffnung', id } }],
    }
  }
  return {
    name: art,
    start: () => ({ zeiger: null, ziel: null, text: '' }),
    runter(k, z, s) {
      const ziel = zielAn(k, z.p, std.breite_cm)
      if (!ziel) return { s, aktionen: [{ typ: 'hinweis', schluessel: 'zeichner.auf_wand_zeigen' }] }
      return setzen(k, s, ziel)
    },
    bewegen(k, z, s) {
      return { s: { ...s, zeiger: z.p, ziel: zielAn(k, z.p, std.breite_cm) } }
    },
    hoch: (_k, _z, s) => ({ s }),
    taste(k, code, key, _frei, s) {
      if (code === 'Backspace') return s.text ? { s: { ...s, text: s.text.slice(0, -1) } } : null
      if ((code === 'Enter' || code === 'NumpadEnter') && s.text) {
        const l = laengeLesen(s.text)
        if (l === null || !s.ziel) return { s, aktionen: [{ typ: 'hinweis', schluessel: 'zeichner.laenge_unklar' }] }
        const abstand = s.ziel.nachEnde ? Math.round(s.ziel.laenge) - l - std.breite_cm : l
        return setzen(k, s, { ...s.ziel, abstand })
      }
      if (istLaengenZeichen(key) && (/[0-9٠-٩۰-۹]/.test(key) || s.text.length > 0)) return { s: { ...s, text: s.text + key } }
      return null
    },
    abbrechen(s) {
      return { s: { ...s, text: '' }, etwas: s.text !== '' }
    },
    vorschau(k, s): Vorschau {
      if (!s.ziel) return {}
      let ziel = s.ziel
      const l = s.text ? laengeLesen(s.text) : null
      if (l !== null) ziel = { ...ziel, abstand: ziel.nachEnde ? Math.round(ziel.laenge) - l - std.breite_cm : l }
      const g = bauen(k, ziel, 'geist')
      if (!g) return {}
      const v: Vorschau = { oeffnung: { raum: g.raum, o: g.o, ok: g.ok }, texte: [], eingabe: s.text || undefined }
      const seg = oeffnungPunkte(g.raum, g.o)
      if (seg) {
        const n = g.raum.punkte.length
        const a = g.raum.punkte[g.o.kante]
        const b = g.raum.punkte[(g.o.kante + 1) % n]
        v.linien = [
          { a, b: seg[0], art: 'mass' },
          { a: seg[1], b, art: 'mass' },
        ]
        v.texte?.push({ p: [(a[0] + seg[0][0]) / 2, (a[1] + seg[0][1]) / 2], text: cmZahl(g.o.abstand_cm) })
        v.texte?.push({
          p: [(b[0] + seg[1][0]) / 2, (b[1] + seg[1][1]) / 2],
          text: cmZahl(ziel.laenge - g.o.abstand_cm - g.o.breite_cm),
        })
      }
      return v
    },
  }
}
