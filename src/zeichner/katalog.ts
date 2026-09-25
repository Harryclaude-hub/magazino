/* Der Moebel-Katalog des Zeichners: uebliche Masse, die man danach in den
 * Eigenschaften auf den Zentimeter anpasst. Namen kommen aus dem
 * Woerterbuch (zeichner.katalog.<schluessel>) und werden beim Setzen als
 * Name des Moebels gespeichert.
 */
import { faecherGleichmaessig } from '../lib/geometrie.ts'
import type { EigeneGroesse } from '../lib/types'
import type { Vorlage } from './dok'

type Roh = Omit<Vorlage, 'name' | 'form' | 'ausschnitt_breite_cm' | 'ausschnitt_tiefe_cm' | 'ausschnitt_ecke' | 'brett_cm' | 'spalten'> &
  Partial<Vorlage>

function v(r: Roh): Vorlage {
  return {
    name: '',
    form: 'rechteck',
    ausschnitt_breite_cm: null,
    ausschnitt_tiefe_cm: null,
    ausschnitt_ecke: null,
    brett_cm: null,
    spalten: 1,
    ...r,
  }
}

export const KATALOG: Vorlage[] = [
  v({ schluessel: 'sofa', art: 'moebel', breite_cm: 200, tiefe_cm: 90, hoehe_cm: 85 }),
  v({
    schluessel: 'l_sofa',
    art: 'moebel',
    breite_cm: 250,
    tiefe_cm: 160,
    hoehe_cm: 85,
    form: 'l',
    ausschnitt_breite_cm: 90,
    ausschnitt_tiefe_cm: 70,
    ausschnitt_ecke: 'ro',
  }),
  v({ schluessel: 'bett_90', art: 'moebel', breite_cm: 90, tiefe_cm: 200, hoehe_cm: 45 }),
  v({ schluessel: 'bett_140', art: 'moebel', breite_cm: 140, tiefe_cm: 200, hoehe_cm: 45 }),
  v({ schluessel: 'bett_180', art: 'moebel', breite_cm: 180, tiefe_cm: 200, hoehe_cm: 45 }),
  v({ schluessel: 'tisch', art: 'moebel', breite_cm: 160, tiefe_cm: 90, hoehe_cm: 75 }),
  v({ schluessel: 'kommode', art: 'moebel', breite_cm: 100, tiefe_cm: 45, hoehe_cm: 80 }),
  v({ schluessel: 'fernseher', art: 'moebel', breite_cm: 160, tiefe_cm: 40, hoehe_cm: 50 }),
  v({ schluessel: 'kuehlschrank', art: 'moebel', breite_cm: 60, tiefe_cm: 65, hoehe_cm: 180 }),
  v({ schluessel: 'waschmaschine', art: 'moebel', breite_cm: 60, tiefe_cm: 60, hoehe_cm: 85 }),
]

export const REGAL_STANDARD: Vorlage = v({
  schluessel: 'regal',
  art: 'regal',
  breite_cm: 80,
  tiefe_cm: 30,
  ...faecherGleichmaessig(5, 180),
  spalten: 1,
})

export const SCHRANK_STANDARD: Vorlage = v({
  schluessel: 'kleiderschrank',
  art: 'schrank',
  breite_cm: 150,
  tiefe_cm: 60,
  hoehe_cm: 200,
  brett_cm: [0, 160],
  spalten: 2,
})

/** Ein Moebel aus einer eigenen Groesse: die Masse werden kopiert, keine
 *  Verknuepfung (BAUPLAN 7.1 E14). */
export function ausEigenerGroesse(g: EigeneGroesse): Vorlage {
  const l = g.ausschnitt_breite_cm !== null && g.ausschnitt_tiefe_cm !== null
  return v({
    schluessel: `eigen_${g.id}`,
    art: 'moebel',
    name: g.name,
    breite_cm: g.laenge_cm,
    tiefe_cm: g.breite_cm,
    hoehe_cm: g.hoehe_cm,
    form: l ? 'l' : 'rechteck',
    ausschnitt_breite_cm: l ? g.ausschnitt_breite_cm : null,
    ausschnitt_tiefe_cm: l ? g.ausschnitt_tiefe_cm : null,
    ausschnitt_ecke: l ? 'ro' : null,
  })
}
