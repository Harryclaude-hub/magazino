/* Auswahl (V): Klick waehlt Raum, Kante, Ecke, Tuer/Fenster, Moebel oder
 * Kiste. Ziehen verschiebt: den Raum samt Inhalt, eine Kante parallel,
 * eine Ecke, ein Moebel, eine Tuer entlang ihrer Wand. Doppelklick auf
 * eine Kante fuegt eine Ecke ein, auf eine Ecke entfernt sie. Eine
 * gestrichelte Hilfslinie laesst sich waehlen, ziehen und loeschen. Pfeile
 * schieben um 1 cm, mit Umschalt um 10 cm. Entf loescht.
 */
import { einrasten, type Punkt } from '../../lib/geometrie.ts'
import { oeffnungPunkte, streckenAbstand, trefferAn } from '../../components/plan/hilfe.ts'
import {
  eckeEinfuegen,
  eckeEntfernen,
  eckeVerschieben,
  kanteVerschieben,
  kistenImRaum,
  linieAn,
  linieVerschieben,
  loeschen,
  objektSetzen,
  raumVerschieben,
  raumVon,
  type Auswahl,
  type Dok,
} from '../dok.ts'
import { fangen } from '../fangen.ts'
import type { Aktion, Kontext, Schritt, Werkzeug, Zeiger } from './typen.ts'

interface Zug {
  art: 'raum' | 'ecke' | 'kante' | 'objekt' | 'oeffnung' | 'linie'
  start: Punkt
  basis: Dok
  auswahl: NonNullable<Auswahl>
  entwurf: Dok | null
  bewegt: boolean
}

export interface AuswahlZustand {
  zug: Zug | null
}

const ECKE_PX = 9
const KANTE_PX = 7

type Griff =
  | { art: 'ecke'; raumId: string; ecke: number }
  | { art: 'kante'; raumId: string; kante: number; punkt: Punkt }

/** Ecke oder Kante unter dem Zeiger. Der gewaehlte Raum hat Vorrang,
 *  damit an einer gemeinsamen Wand der richtige Raum greift. */
export function griffAn(k: Kontext, p: Punkt): Griff | null {
  const vorne =
    k.auswahl && 'raumId' in k.auswahl ? k.auswahl.raumId : k.auswahl?.art === 'raum' ? k.auswahl.id : null
  const raeume = [...k.dok.raeume].sort((a, b) => (a.id === vorne ? -1 : b.id === vorne ? 1 : 0))
  const te = ECKE_PX / k.massstab
  for (const r of raeume) {
    for (let i = 0; i < r.punkte.length; i++) {
      const q = r.punkte[i]
      if (Math.hypot(q[0] - p[0], q[1] - p[1]) <= te) return { art: 'ecke', raumId: r.id, ecke: i }
    }
  }
  const tk = KANTE_PX / k.massstab
  for (const r of raeume) {
    const n = r.punkte.length
    for (let i = 0; i < n; i++) {
      const s = streckenAbstand(p, r.punkte[i], r.punkte[(i + 1) % n])
      if (s.abstand <= tk) return { art: 'kante', raumId: r.id, kante: i, punkt: s.punkt }
    }
  }
  return null
}

/** So nah (Bildschirmpixel) muss eine Wand an einer fremden Wand sein,
 *  damit der gezogene Raum buendig einrastet. */
const MAGNET_PX = 12

/** Kleinste Korrektur (dx, dy), mit der eine waagrechte oder senkrechte
 *  Kante des verschobenen Raums genau auf einer parallelen Kante eines
 *  anderen Raums liegt, der sich entlang der Kante mit ihr ueberdeckt. */
export function magnet(d: Dok, raumId: string, punkte: Punkt[], gx: number, gy: number, tol: number): [number, number] {
  const eigene = kantenAchsen(punkte.map(([x, y]) => [x + gx, y + gy] as Punkt))
  const fremde = d.raeume.filter((r) => r.id !== raumId).flatMap((r) => kantenAchsen(r.punkte))
  let bx: number | null = null
  let by: number | null = null
  for (const e of eigene) {
    for (const f of fremde) {
      if (e.achse !== f.achse) continue
      if (Math.min(e.bis, f.bis) - Math.max(e.von, f.von) <= 0) continue
      const diff = f.lage - e.lage
      if (Math.abs(diff) > tol || Math.abs(diff) < 1e-9) continue
      if (e.achse === 'x' && (bx === null || Math.abs(diff) < Math.abs(bx))) bx = diff
      if (e.achse === 'y' && (by === null || Math.abs(diff) < Math.abs(by))) by = diff
    }
  }
  return [Math.round(bx ?? 0), Math.round(by ?? 0)]
}

/** Senkrechte Kanten (achse x: Lage = x) und waagrechte (achse y). */
function kantenAchsen(p: Punkt[]): { achse: 'x' | 'y'; lage: number; von: number; bis: number }[] {
  const out: { achse: 'x' | 'y'; lage: number; von: number; bis: number }[] = []
  for (let i = 0; i < p.length; i++) {
    const a = p[i]
    const b = p[(i + 1) % p.length]
    if (a[0] === b[0] && a[1] !== b[1]) out.push({ achse: 'x', lage: a[0], von: Math.min(a[1], b[1]), bis: Math.max(a[1], b[1]) })
    else if (a[1] === b[1] && a[0] !== b[0]) out.push({ achse: 'y', lage: a[1], von: Math.min(a[0], b[0]), bis: Math.max(a[0], b[0]) })
  }
  return out
}

function entwurfFuer(k: Kontext, zug: Zug, p: Punkt, frei: boolean): Dok {
  const d = zug.basis
  const r = k.raster
  const dx = p[0] - zug.start[0]
  const dy = p[1] - zug.start[1]
  const a = zug.auswahl
  switch (zug.art) {
    case 'raum': {
      if (a.art !== 'raum') return d
      let gx = einrasten(dx, r)
      let gy = einrasten(dy, r)
      // Ein Raum geht frei in jede Richtung; mit Umschalt nur in einer Achse.
      if (frei) {
        if (Math.abs(dx) >= Math.abs(dy)) gy = 0
        else gx = 0
      }
      // Magnet: liegt eine Wand nahe an einer Wand eines anderen Raums,
      // rastet der Raum buendig an (ohne Umschalt in beiden Achsen).
      const raum = raumVon(d, a.id)
      if (raum) {
        const [mx, my] = magnet(d, raum.id, raum.punkte, gx, gy, MAGNET_PX / k.massstab)
        if (!frei || gy === 0) gx += mx
        if (!frei || gx === 0) gy += my
      }
      return raumVerschieben(d, a.id, gx, gy)
    }
    case 'ecke': {
      if (a.art !== 'ecke') return d
      const g = fangen(d, p, { raster: r, toleranz: ECKE_PX / k.massstab, ohne: { raumId: a.raumId, ecke: a.ecke } })
      return eckeVerschieben(d, a.raumId, a.ecke, g.p)
    }
    case 'kante': {
      if (a.art !== 'kante') return d
      const raum = raumVon(d, a.raumId)
      if (!raum) return d
      const n = raum.punkte.length
      const pa = raum.punkte[a.kante]
      const pb = raum.punkte[(a.kante + 1) % n]
      const l = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) || 1
      const nx = -(pb[1] - pa[1]) / l
      const ny = (pb[0] - pa[0]) / l
      return kanteVerschieben(d, a.raumId, a.kante, einrasten(dx * nx + dy * ny, r))
    }
    case 'objekt': {
      if (a.art !== 'objekt') return d
      const o = d.objekte.find((x) => x.id === a.id)
      if (!o) return d
      // Moebel werden frei gezogen, nur das Raster gilt.
      return objektSetzen(d, { ...o, x: o.x + einrasten(dx, r), y: o.y + einrasten(dy, r) })
    }
    case 'linie': {
      if (a.art !== 'linie') return d
      return linieVerschieben(d, a.id, einrasten(dx, r), einrasten(dy, r))
    }
    case 'oeffnung': {
      if (a.art !== 'oeffnung') return d
      const o = d.oeffnungen.find((x) => x.id === a.id)
      const raum = o ? raumVon(d, o.raum_id) : null
      if (!o || !raum) return d
      const n = raum.punkte.length
      const pa = raum.punkte[o.kante]
      const pb = raum.punkte[(o.kante + 1) % n]
      const l = Math.hypot(pb[0] - pa[0], pb[1] - pa[1])
      const t = streckenAbstand(p, pa, pb).t * l
      const abstand = Math.max(0, Math.min(Math.floor(l) - o.breite_cm, einrasten(t - o.breite_cm / 2, r)))
      return { ...d, oeffnungen: d.oeffnungen.map((x) => (x.id === o.id ? { ...x, abstand_cm: abstand } : x)) }
    }
  }
}

function pfeil(k: Kontext, code: string, schritt: number): Aktion[] | null {
  const dx = code === 'ArrowLeft' ? -schritt : code === 'ArrowRight' ? schritt : 0
  const dy = code === 'ArrowUp' ? -schritt : code === 'ArrowDown' ? schritt : 0
  if (dx === 0 && dy === 0) return null
  const a = k.auswahl
  const d = k.dok
  if (!a) return []
  let neu: Dok | null = null
  switch (a.art) {
    case 'raum':
      neu = raumVerschieben(d, a.id, dx, dy)
      break
    case 'linie':
      neu = linieVerschieben(d, a.id, dx, dy)
      break
    case 'objekt': {
      const o = d.objekte.find((x) => x.id === a.id)
      if (o) neu = objektSetzen(d, { ...o, x: o.x + dx, y: o.y + dy })
      break
    }
    case 'ecke': {
      const r = raumVon(d, a.raumId)
      const q = r?.punkte[a.ecke]
      if (q) neu = eckeVerschieben(d, a.raumId, a.ecke, [q[0] + dx, q[1] + dy])
      break
    }
    case 'kante': {
      const r = raumVon(d, a.raumId)
      if (!r) break
      const n = r.punkte.length
      const pa = r.punkte[a.kante]
      const pb = r.punkte[(a.kante + 1) % n]
      const l = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) || 1
      const nx = -(pb[1] - pa[1]) / l
      const ny = (pb[0] - pa[0]) / l
      const weg = Math.round(dx * nx + dy * ny)
      if (weg !== 0) neu = kanteVerschieben(d, a.raumId, a.kante, weg)
      break
    }
    case 'oeffnung': {
      const o = d.oeffnungen.find((x) => x.id === a.id)
      const r = o ? raumVon(d, o.raum_id) : null
      if (!o || !r) break
      const s = oeffnungPunkte(r, o)
      if (!s) break
      const rx = s[1][0] - s[0][0]
      const ry = s[1][1] - s[0][1]
      const weg = Math.sign(dx * rx + dy * ry) * schritt
      if (weg !== 0) {
        neu = {
          ...d,
          oeffnungen: d.oeffnungen.map((x) => (x.id === o.id ? { ...x, abstand_cm: Math.max(0, x.abstand_cm + weg) } : x)),
        }
      }
      break
    }
    default:
      break
  }
  return neu ? [{ typ: 'aendern', dok: neu, auswahl: a }] : []
}

export const auswahlWerkzeug: Werkzeug<AuswahlZustand> = {
  name: 'auswahl',
  start: () => ({ zug: null }),

  runter(k: Kontext, z: Zeiger): Schritt<AuswahlZustand> {
    const g = griffAn(k, z.p)
    let auswahl: NonNullable<Auswahl> | null = null
    let art: Zug['art'] | null = null
    if (g?.art === 'ecke') {
      auswahl = { art: 'ecke', raumId: g.raumId, ecke: g.ecke }
      art = 'ecke'
    } else if (g?.art === 'kante') {
      auswahl = { art: 'kante', raumId: g.raumId, kante: g.kante }
      art = 'kante'
    } else if (linieAn(k.dok, z.p, KANTE_PX / k.massstab)) {
      auswahl = { art: 'linie', id: linieAn(k.dok, z.p, KANTE_PX / k.massstab)!.id }
      art = 'linie'
    } else {
      const t = trefferAn(k.dok, z.p, 8 / k.massstab)
      if (t?.art === 'kiste') auswahl = { art: 'kiste', id: t.id }
      else if (t?.art === 'oeffnung') {
        auswahl = { art: 'oeffnung', id: t.id }
        art = 'oeffnung'
      } else if (t?.art === 'objekt') {
        auswahl = { art: 'objekt', id: t.id }
        art = 'objekt'
      } else if (t?.art === 'raum') {
        auswahl = { art: 'raum', id: t.id }
        art = 'raum'
      }
    }
    const zug: Zug | null =
      auswahl && art ? { art, start: z.p, basis: k.dok, auswahl, entwurf: null, bewegt: false } : null
    return { s: { zug }, aktionen: [{ typ: 'waehlen', auswahl }] }
  },

  bewegen(k: Kontext, z: Zeiger, s: AuswahlZustand): Schritt<AuswahlZustand> {
    if (!s.zug) return { s }
    const weitPx = Math.hypot(z.p[0] - s.zug.start[0], z.p[1] - s.zug.start[1]) * k.massstab
    if (!s.zug.bewegt && weitPx < 4) return { s }
    return { s: { zug: { ...s.zug, bewegt: true, entwurf: entwurfFuer(k, s.zug, z.p, z.frei) } } }
  },

  hoch(_k: Kontext, _z: Zeiger, s: AuswahlZustand): Schritt<AuswahlZustand> {
    const zug = s.zug
    if (!zug || !zug.bewegt || !zug.entwurf || zug.entwurf === zug.basis) return { s: { zug: null } }
    return { s: { zug: null }, aktionen: [{ typ: 'aendern', dok: zug.entwurf, auswahl: zug.auswahl }] }
  },

  doppel(k: Kontext, z: Zeiger): Schritt<AuswahlZustand> {
    const g = griffAn(k, z.p)
    if (g?.art === 'ecke') {
      const neu = eckeEntfernen(k.dok, g.raumId, g.ecke)
      if (!neu) return { s: { zug: null }, aktionen: [{ typ: 'hinweis', schluessel: 'zeichner.ecke_bleibt' }] }
      return { s: { zug: null }, aktionen: [{ typ: 'aendern', dok: neu, auswahl: { art: 'raum', id: g.raumId } }] }
    }
    if (g?.art === 'kante') {
      const q = fangen(k.dok, g.punkt, { raster: k.raster, toleranz: 0, kanten: true })
      const neu = eckeEinfuegen(k.dok, g.raumId, g.kante, q.p)
      if (!neu) return { s: { zug: null } }
      return {
        s: { zug: null },
        aktionen: [{ typ: 'aendern', dok: neu, auswahl: { art: 'ecke', raumId: g.raumId, ecke: g.kante + 1 } }],
      }
    }
    return { s: { zug: null } }
  },

  taste(k: Kontext, code: string, _key: string, frei: boolean, s: AuswahlZustand): Schritt<AuswahlZustand> | null {
    if (code === 'Delete' || code === 'Backspace') {
      const a = k.auswahl
      if (!a || a.art === 'kante' || a.art === 'kiste') return { s }
      if (a.art === 'raum') {
        const codes = kistenImRaum(k.dok, a.id).map((x) => x.code)
        if (codes.length) return { s, aktionen: [{ typ: 'loeschen_fragen', raumId: a.id, codes }] }
      }
      const neu = loeschen(k.dok, a)
      if (neu === k.dok) return { s, aktionen: [{ typ: 'hinweis', schluessel: 'zeichner.ecke_bleibt' }] }
      return { s, aktionen: [{ typ: 'aendern', dok: neu, auswahl: a.art === 'ecke' ? { art: 'raum', id: a.raumId } : null }] }
    }
    const pf = pfeil(k, code, frei ? 10 : 1)
    if (pf) return { s, aktionen: pf }
    return null
  },

  abbrechen(s: AuswahlZustand) {
    return { s: { zug: null }, etwas: s.zug !== null }
  },

  vorschau(_k: Kontext, s: AuswahlZustand) {
    return s.zug?.entwurf ? { dok: s.zug.entwurf } : {}
  },
}
