/* Der Satz, der sagt, wo eine Kiste steht:
 *   Fach:      "Regal Billy, Fach 2 (Ebene 2), 44 bis 78 cm ueber dem Boden"
 *   auf Kiste: "auf Kiste K-6-003, 34 bis 68 cm"
 *   auf Objekt:"auf Kommode, 80 bis 111 cm"
 *   Boden:     "auf dem Boden, 0 bis 31 cm"
 * Die Hoehen kommen fertig aus der Datenbank (kiste_lage), hier wird
 * nichts nachgerechnet. Seriennummern stehen als eigene Richtungsinsel
 * (FSI ... PDI), damit sie im arabischen Satz nicht zerfallen.
 */
import type { KisteLage, ObjektArt } from '../../lib/types'

type T = (key: string, vars?: Record<string, string | number>) => string

export function insel(code: string): string {
  return `⁨${code}⁩`
}

/** Name eines Objekts, oder das Wort seiner Art, wenn es keinen hat. */
export function objektName(t: T, o: { name: string; art: ObjektArt }): string {
  return o.name.trim() || t(`plan.${o.art}`)
}

export function lageSatz(lage: KisteLage, t: T): string {
  if (lage.art === 'moebel') {
    return t('lage.satz_moebel', { name: objektName(t, lage.objekt), bis: lage.oben_cm })
  }
  const von = lage.unten_cm
  const bis = lage.oben_cm
  if (lage.unterlage_art === 'fach' && lage.objekt) {
    return t('lage.satz_fach', {
      name: objektName(t, lage.objekt),
      ebene: lage.fach_ebene ?? 0,
      spalte: lage.fach_spalte ?? 1,
      von,
      bis,
    })
  }
  if (lage.unterlage_art === 'kiste') {
    return t('lage.satz_kiste', { code: insel(lage.unterlage_code ?? '?'), von, bis })
  }
  if (lage.unterlage_art === 'objekt' && lage.objekt) {
    return t('lage.satz_objekt', { name: objektName(t, lage.objekt), von, bis })
  }
  return t('lage.satz_boden', { von, bis })
}

/** "Neue Wohnung, Wohnzimmer" */
export function lageOrt(lage: KisteLage, t: T): string {
  return t('lage.ort', { grundriss: lage.grundriss.name, raum: lage.raum.name ?? t('plan.raum_ohne_name') })
}
