/* Gemeinsame Masse der Stadt (E87): Fassade aussen (stadt3d.ts) und Raeume
 * innen (innen3d.ts) muessen dieselben Fenster und Tueren haben, sonst sieht
 * man innen eine Wand, wo aussen ein Fenster ist. Darum stehen Masse und
 * Regeln hier, an einer Stelle, rein und ohne three. Aendern nur zusammen
 * mit beiden Seiten. */

/** Wanddicke der Aussenwand (Meter), nach innen gemessen ab dem Umriss. */
export const AUSSENWAND_M = 0.3
/** Fenster: Breite, Hoehe, Bruestung ueber dem Boden des Geschosses (Meter). */
export const FENSTER_B = 1.2
export const FENSTER_H = 1.4
export const FENSTER_BRUESTUNG = 0.9
/** Abstand der Fenstermitten und freier Rand an jeder Ecke (Meter). */
export const FENSTER_ABSTAND = 2.6
export const FENSTER_RAND = 0.9
/** Haustuer: Breite und Hoehe (Meter); Laeden und groessere Haeuser breiter. */
export const TUER_H = 2.3
export function tuerBreite(art: string): number {
  if (art === 'einkaufszentrum' || art === 'supermarkt') return 2.6
  if (art === 'laden' || art === 'spital' || art === 'schule' || art === 'feuerwehr' || art === 'kirche' || art === 'buero') return 1.8
  if (art === 'garage') return 2.6
  return 1.2
}
/** Schwelle an der Haustuer (Treppe3D vom Gelaende ins Erdgeschoss):
 *  so weit vor und hinter der Aussenkante (Meter). */
export const SCHWELLE_VOR = 0.9
export const SCHWELLE_HINTER = 0.6

/** Mitten der Fenster entlang einer Kante der Laenge laenge (Meter, ab dem
 *  Anfang der Kante), gleichmaessig verteilt, mit FENSTER_RAND frei an den
 *  Ecken. Zu kurze Kanten haben keins. */
export function fensterReihe(laenge: number): number[] {
  const frei = laenge - 2 * FENSTER_RAND
  if (!(frei >= FENSTER_B)) return []
  const n = Math.max(1, Math.floor((frei - FENSTER_B) / FENSTER_ABSTAND) + 1)
  const breite = (n - 1) * FENSTER_ABSTAND
  const start = laenge / 2 - breite / 2
  const out: number[] = []
  for (let i = 0; i < n; i++) out.push(start + i * FENSTER_ABSTAND)
  return out
}

/** Fenster auf einer Kante ohne die, die die Tuer (Mitte tuerT in Metern
 *  ab Kantenanfang, Breite tuerB) beruehren, im Erdgeschoss. */
export function fensterOhneTuer(laenge: number, tuerT: number | null, tuerB: number): number[] {
  const alle = fensterReihe(laenge)
  if (tuerT === null) return alle
  return alle.filter((m) => Math.abs(m - tuerT) > (FENSTER_B + tuerB) / 2 + 0.2)
}

/** Geschoss, ab dem ein Haus innen gezeigt wird: Abstand der Kamera zur
 *  naechsten Kante des Umrisses in Metern (laden), und ab wann es wieder
 *  wegfaellt (entladen). */
export const INNEN_LADEN_M = 40
export const INNEN_ENTLADEN_M = 90
