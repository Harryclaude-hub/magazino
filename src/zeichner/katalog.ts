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
  v({ schluessel: 'sessel', art: 'moebel', breite_cm: 80, tiefe_cm: 85, hoehe_cm: 90 }),
  v({ schluessel: 'couchtisch', art: 'moebel', breite_cm: 110, tiefe_cm: 60, hoehe_cm: 45 }),
  v({ schluessel: 'fernseher', art: 'moebel', breite_cm: 160, tiefe_cm: 40, hoehe_cm: 50 }),
  v({ schluessel: 'fernseher_wand', art: 'moebel', breite_cm: 145, tiefe_cm: 6, hoehe_cm: 84, boden_cm: 105 }),
  v({ schluessel: 'tv_board', art: 'moebel', breite_cm: 180, tiefe_cm: 40, hoehe_cm: 45 }),
  v({ schluessel: 'sideboard', art: 'moebel', breite_cm: 180, tiefe_cm: 45, hoehe_cm: 80 }),
  v({ schluessel: 'kommode', art: 'moebel', breite_cm: 100, tiefe_cm: 45, hoehe_cm: 80 }),
  v({ schluessel: 'tisch', art: 'moebel', breite_cm: 160, tiefe_cm: 90, hoehe_cm: 75 }),
  v({ schluessel: 'esstisch_rund', art: 'moebel', breite_cm: 110, tiefe_cm: 110, hoehe_cm: 75 }),
  v({ schluessel: 'essgruppe', art: 'moebel', breite_cm: 200, tiefe_cm: 170, hoehe_cm: 90 }),
  v({ schluessel: 'stuhl', art: 'moebel', breite_cm: 45, tiefe_cm: 50, hoehe_cm: 90 }),
  v({ schluessel: 'teppich', art: 'moebel', breite_cm: 200, tiefe_cm: 140, hoehe_cm: 1 }),
  v({ schluessel: 'stehlampe', art: 'moebel', breite_cm: 35, tiefe_cm: 35, hoehe_cm: 170 }),
  v({ schluessel: 'pflanze', art: 'moebel', breite_cm: 45, tiefe_cm: 45, hoehe_cm: 120 }),
  v({ schluessel: 'klavier', art: 'moebel', breite_cm: 150, tiefe_cm: 60, hoehe_cm: 125 }),
]

/** Schlafen und Arbeiten. */
export const KATALOG_SCHLAFEN: Vorlage[] = [
  v({ schluessel: 'bett_90', art: 'moebel', breite_cm: 90, tiefe_cm: 200, hoehe_cm: 45 }),
  v({ schluessel: 'bett_140', art: 'moebel', breite_cm: 140, tiefe_cm: 200, hoehe_cm: 45 }),
  v({ schluessel: 'bett_180', art: 'moebel', breite_cm: 180, tiefe_cm: 200, hoehe_cm: 45 }),
  v({ schluessel: 'nachttisch', art: 'moebel', breite_cm: 45, tiefe_cm: 40, hoehe_cm: 55 }),
  v({ schluessel: 'kinderbett', art: 'moebel', breite_cm: 70, tiefe_cm: 140, hoehe_cm: 90 }),
  v({ schluessel: 'schreibtisch', art: 'moebel', breite_cm: 140, tiefe_cm: 70, hoehe_cm: 75 }),
  v({ schluessel: 'buerostuhl', art: 'moebel', breite_cm: 60, tiefe_cm: 60, hoehe_cm: 110 }),
]

/** Flur, Abstellraum und Sonstiges. */
export const KATALOG_SONST: Vorlage[] = [
  v({ schluessel: 'schuhschrank', art: 'moebel', breite_cm: 80, tiefe_cm: 35, hoehe_cm: 100 }),
  v({ schluessel: 'wandregal', art: 'regal', breite_cm: 80, tiefe_cm: 25, ...faecherGleichmaessig(2, 50), spalten: 1, boden_cm: 150 }),
  v({ schluessel: 'wandschrank', art: 'schrank', breite_cm: 80, tiefe_cm: 35, ...faecherGleichmaessig(2, 60), spalten: 1, boden_cm: 150 }),
  v({ schluessel: 'garderobe', art: 'moebel', breite_cm: 100, tiefe_cm: 35, hoehe_cm: 180 }),
  v({ schluessel: 'gefrierschrank', art: 'moebel', breite_cm: 60, tiefe_cm: 65, hoehe_cm: 145 }),
  v({ schluessel: 'fahrrad', art: 'moebel', breite_cm: 180, tiefe_cm: 60, hoehe_cm: 100 }),
]

/** Bad und WC: Sanitaer in ueblichen Groessen. */
export const KATALOG_BAD: Vorlage[] = [
  v({ schluessel: 'wc', art: 'moebel', breite_cm: 40, tiefe_cm: 65, hoehe_cm: 80 }),
  v({ schluessel: 'waschbecken', art: 'moebel', breite_cm: 60, tiefe_cm: 45, hoehe_cm: 85 }),
  v({ schluessel: 'handwaschbecken', art: 'moebel', breite_cm: 40, tiefe_cm: 25, hoehe_cm: 85 }),
  v({ schluessel: 'badewanne', art: 'moebel', breite_cm: 170, tiefe_cm: 75, hoehe_cm: 58 }),
  v({ schluessel: 'dusche', art: 'moebel', breite_cm: 90, tiefe_cm: 90, hoehe_cm: 5 }),
  v({ schluessel: 'waschmaschine', art: 'moebel', breite_cm: 60, tiefe_cm: 60, hoehe_cm: 85 }),
  v({ schluessel: 'trockner', art: 'moebel', breite_cm: 60, tiefe_cm: 60, hoehe_cm: 85 }),
]

/** Kueche: die Zeile als Ganzes und einzelne Teile. Unter- und Hochschrank
 *  sind Schraenke mit Faechern: dort lassen sich Kisten hineinstellen. */
export const KATALOG_KUECHE: Vorlage[] = [
  v({ schluessel: 'kuechenzeile', art: 'moebel', breite_cm: 240, tiefe_cm: 60, hoehe_cm: 90 }),
  v({ schluessel: 'unterschrank', art: 'schrank', breite_cm: 60, tiefe_cm: 60, hoehe_cm: 87, brett_cm: [0, 40], spalten: 1 }),
  v({ schluessel: 'hochschrank', art: 'schrank', breite_cm: 60, tiefe_cm: 60, ...faecherGleichmaessig(5, 210), spalten: 1 }),
  v({ schluessel: 'haengeschrank', art: 'schrank', breite_cm: 60, tiefe_cm: 35, ...faecherGleichmaessig(2, 70), spalten: 1, boden_cm: 145 }),
  v({ schluessel: 'spuele', art: 'moebel', breite_cm: 80, tiefe_cm: 60, hoehe_cm: 90 }),
  v({ schluessel: 'herd', art: 'moebel', breite_cm: 60, tiefe_cm: 60, hoehe_cm: 90 }),
  v({ schluessel: 'geschirrspueler', art: 'moebel', breite_cm: 60, tiefe_cm: 60, hoehe_cm: 87 }),
  v({ schluessel: 'kuehlschrank', art: 'moebel', breite_cm: 60, tiefe_cm: 65, hoehe_cm: 180 }),
  v({ schluessel: 'backofen', art: 'moebel', breite_cm: 60, tiefe_cm: 60, hoehe_cm: 220 }),
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
