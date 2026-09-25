/* Moebel (M), Regal (K), Schrank (J): der Geist folgt dem Zeiger, rastet
 * an Waenden und anderen Moebeln ein, Q und E drehen um 90 Grad (auf der
 * Stelle). Rot, wenn er nicht ganz im Raum steht oder hoeher ist als der
 * Raum. Klick setzt ihn. Masse und Faecher kommen aus der Vorlage (Katalog,
 * "Aus meiner Groesse", Faecher-Editor).
 */
import { einrasten, type Drehung, type Punkt } from '../../lib/geometrie.ts'
import { neuesObjekt, objektBox, objektPasst, objektUm, raumAn, type Vorlage } from '../dok.ts'
import type { Kontext, Schritt, Vorschau, Werkzeug } from './typen.ts'

export interface ObjektZustand {
  zeiger: Punkt | null
  drehung: Drehung
}

const FANG_PX = 12

/** Ort des Geists: Mitte am Zeiger, dann an nahe Waende und Moebel
 *  gerueckt (nur gerade Waende). */
export function geistOrt(k: Kontext, v: Vorlage, p: Punkt, drehung: Drehung): { x: number; y: number } {
  const form = { ...v, drehung, brett_cm: v.brett_cm, spalten: v.spalten }
  let pos = objektUm(form, [einrasten(p[0], k.raster), einrasten(p[1], k.raster)])
  const box = objektBox({ ...form, ...pos })
  const tol = FANG_PX / k.massstab
  const xs: number[] = []
  const ys: number[] = []
  const raum = raumAn(k.dok, p)
  if (raum) {
    const n = raum.punkte.length
    for (let i = 0; i < n; i++) {
      const a = raum.punkte[i]
      const b = raum.punkte[(i + 1) % n]
      if (a[0] === b[0]) xs.push(a[0])
      if (a[1] === b[1]) ys.push(a[1])
    }
    for (const o of k.dok.objekte) {
      if (o.raum_id !== raum.id) continue
      const q = objektBox(o)
      xs.push(q.x0, q.x1)
      ys.push(q.y0, q.y1)
    }
  }
  let bx = 0
  let bestX = tol
  for (const x of xs) {
    for (const kante of [box.x0, box.x1]) {
      if (Math.abs(x - kante) < bestX) {
        bestX = Math.abs(x - kante)
        bx = x - kante
      }
    }
  }
  let by = 0
  let bestY = tol
  for (const y of ys) {
    for (const kante of [box.y0, box.y1]) {
      if (Math.abs(y - kante) < bestY) {
        bestY = Math.abs(y - kante)
        by = y - kante
      }
    }
  }
  pos = { x: pos.x + bx, y: pos.y + by }
  return pos
}

export function objektWerkzeug(art: 'moebel' | 'regal' | 'schrank'): Werkzeug<ObjektZustand> {
  const geist = (k: Kontext, s: ObjektZustand) => {
    if (!k.vorlage || !s.zeiger) return null
    const pos = geistOrt(k, k.vorlage, s.zeiger, s.drehung)
    const o = neuesObjekt(k.vorlage, 'geist', '', pos, s.drehung)
    const box = objektBox(o)
    const raum = raumAn(k.dok, [(box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2])
    return { o, raum, ok: raum ? objektPasst(o, raum) : false }
  }
  return {
    name: art,
    start: () => ({ zeiger: null, drehung: 0 }),
    runter(k, z, s): Schritt<ObjektZustand> {
      if (!k.vorlage) return { s, aktionen: [{ typ: 'hinweis', schluessel: 'zeichner.vorlage_waehlen' }] }
      const g = geist(k, { ...s, zeiger: z.p })
      if (!g || !g.raum) return { s, aktionen: [{ typ: 'hinweis', schluessel: 'zeichner.objekt_in_raum' }] }
      if (!g.ok) return { s, aktionen: [{ typ: 'hinweis', schluessel: 'zeichner.objekt_passt_nicht' }] }
      const id = k.neueId()
      const o = { ...g.o, id, raum_id: g.raum.id }
      return {
        s,
        aktionen: [
          { typ: 'aendern', dok: { ...k.dok, objekte: [...k.dok.objekte, o] }, auswahl: { art: 'objekt', id } },
          { typ: 'werkzeug', name: 'auswahl' },
        ],
      }
    },
    bewegen: (_k, z, s) => ({ s: { ...s, zeiger: z.p } }),
    hoch: (_k, _z, s) => ({ s }),
    taste(_k, code, _key, _frei, s) {
      if (code === 'KeyQ') return { s: { ...s, drehung: (((s.drehung + 270) % 360) as Drehung) } }
      if (code === 'KeyE') return { s: { ...s, drehung: (((s.drehung + 90) % 360) as Drehung) } }
      return null
    },
    abbrechen: (s) => ({ s, etwas: false }),
    vorschau(k, s): Vorschau {
      const g = geist(k, s)
      return g ? { objekt: { o: g.o, ok: g.ok } } : {}
    },
  }
}
