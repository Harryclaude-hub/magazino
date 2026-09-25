/* Der Satz, der sagt, wo eine Kiste steht:
 *   Fach:      "Regal Billy, Fach 2 (Ebene 2), 44 bis 78 cm ueber dem Boden"
 *   auf Kiste: "auf Kiste K-6-003, 34 bis 68 cm"
 *   auf Objekt:"auf Kommode, 80 bis 111 cm"
 *   Boden:     "auf dem Boden, 0 bis 31 cm"
 *   im Moebel: "in Couch, 0 bis 45 cm" (Ding in einem Moebel, nur Suche)
 * Kistenseite (kiste_lage) und Suche (inhalt_suchen) benutzen denselben
 * Satz, damit beide dieselben Zahlen gleich sagen. Die Hoehen kommen
 * fertig aus der Datenbank, hier wird nichts nachgerechnet.
 * Seriennummern stehen als eigene Richtungsinsel (FSI ... PDI), damit sie
 * im arabischen Satz nicht zerfallen.
 *
 * Keine Importe ausser Typen: die Suche im Hauptbuendel nimmt diese Datei
 * mit, ohne die Plan-Bausteine mitzuziehen.
 */
import type { KisteLage, ObjektArt, SuchTreffer, UnterlageArt } from '../../lib/types'

type T = (key: string, vars?: Record<string, string | number>) => string

export function insel(code: string): string {
  return `⁨${code}⁩`
}

/** Name eines Objekts, oder das Wort seiner Art, wenn es keinen hat. */
export function objektName(t: T, o: { name: string; art: ObjektArt }): string {
  return o.name.trim() || t(`plan.${o.art}`)
}

/** Was es fuer den Satz braucht, egal ob aus kiste_lage oder der Suche. */
export interface PlatzAngabe {
  unterlage_art: UnterlageArt | 'moebel' | null
  unterlage_code: string | null
  objekt: { name: string; art: ObjektArt } | null
  fach_ebene: number | null
  fach_spalte: number | null
  /** Zahl der Spalten des Regals, wenn bekannt. Bei mehr als einer steht
   *  die Spalte im Satz. */
  spalten?: number | null
  von: number
  bis: number
}

export function platzSatz(p: PlatzAngabe, t: T): string {
  const { von, bis } = p
  if (p.unterlage_art === 'moebel' && p.objekt) {
    return t('lage.satz_in_moebel', { name: objektName(t, p.objekt), von, bis })
  }
  if (p.unterlage_art === 'fach' && p.objekt) {
    const ebene = p.fach_ebene ?? 0
    const spalte = p.fach_spalte ?? 1
    const mitSpalte = (p.spalten ?? spalte) > 1
    return t(mitSpalte ? 'lage.satz_fach_spalte' : 'lage.satz_fach', {
      name: objektName(t, p.objekt),
      ebene,
      spalte,
      von,
      bis,
    })
  }
  if (p.unterlage_art === 'kiste') {
    return t('lage.satz_kiste', { code: insel(p.unterlage_code ?? '?'), von, bis })
  }
  if (p.unterlage_art === 'objekt' && p.objekt) {
    return t('lage.satz_objekt', { name: objektName(t, p.objekt), von, bis })
  }
  return t('lage.satz_boden', { von, bis })
}

export function lageSatz(lage: KisteLage, t: T, spalten?: number | null): string {
  if (lage.art === 'moebel') {
    return t('lage.satz_moebel', { name: objektName(t, lage.objekt), bis: lage.oben_cm })
  }
  return platzSatz(
    {
      unterlage_art: lage.unterlage_art,
      unterlage_code: lage.unterlage_code,
      objekt: lage.objekt,
      fach_ebene: lage.fach_ebene,
      fach_spalte: lage.fach_spalte,
      spalten,
      von: lage.unten_cm,
      bis: lage.oben_cm,
    },
    t,
  )
}

/** "Neue Wohnung, Wohnzimmer" */
export function lageOrt(lage: KisteLage, t: T): string {
  return t('lage.ort', { grundriss: lage.grundriss.name, raum: lage.raum.name ?? t('plan.raum_ohne_name') })
}

/** Platz und Hoehe eines Suchtreffers in einer Zeile:
 *  "Neue Wohnung, Wohnzimmer, Regal Billy, Fach 2 (Ebene 2), 44 bis 78 cm
 *  ueber dem Boden". null ohne Platz (die Seite sagt dann "noch ohne
 *  Platz"). */
export function trefferOrt(z: SuchTreffer, t: T): string | null {
  if (!z.raum_id || !z.grundriss_id || z.hoehe_von === null || z.hoehe_bis === null) return null
  const ort = t('lage.ort', {
    grundriss: z.grundriss_name ?? '',
    raum: (z.raum_name ?? '').trim() || t('plan.raum_ohne_name'),
  })
  const satz = platzSatz(
    {
      unterlage_art: z.unterlage_art,
      unterlage_code: z.unterlage_code,
      objekt: z.objekt_art ? { name: z.objekt_name ?? '', art: z.objekt_art } : null,
      fach_ebene: z.fach_ebene,
      fach_spalte: z.fach_spalte,
      von: Math.round(z.hoehe_von),
      bis: Math.round(z.hoehe_bis),
    },
    t,
  )
  return t('suche.ort_zeile', { ort, satz })
}
