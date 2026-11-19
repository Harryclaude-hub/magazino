/* Der Moebel-Katalog des Zeichners: uebliche Masse, die man danach in den
 * Eigenschaften auf den Zentimeter anpasst. Namen kommen aus dem
 * Woerterbuch (zeichner.katalog.<schluessel>) und werden beim Setzen als
 * Name des Moebels gespeichert.
 */
import { faecherGleichmaessig } from '../lib/geometrie.ts'
import { moebelArt, type MoebelArt } from '../components/plan/moebelArt.ts'
import type { Objekt } from '../lib/types'
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
  v({ schluessel: 'sitzbank', art: 'moebel', breite_cm: 180, tiefe_cm: 45, hoehe_cm: 85 }),
  v({ schluessel: 'haengelampe', art: 'moebel', breite_cm: 45, tiefe_cm: 45, hoehe_cm: 90, boden_cm: 160 }),
  v({ schluessel: 'stuhl', art: 'moebel', breite_cm: 45, tiefe_cm: 50, hoehe_cm: 90 }),
  v({ schluessel: 'teppich', art: 'moebel', breite_cm: 200, tiefe_cm: 140, hoehe_cm: 1 }),
  v({ schluessel: 'stehlampe', art: 'moebel', breite_cm: 35, tiefe_cm: 35, hoehe_cm: 170 }),
  v({ schluessel: 'pflanze', art: 'moebel', breite_cm: 45, tiefe_cm: 45, hoehe_cm: 120 }),
  v({ schluessel: 'klavier', art: 'moebel', breite_cm: 150, tiefe_cm: 60, hoehe_cm: 125 }),
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

/** Arten, die im Katalog unter einer anderen stehen: die BESTA-Eckbank
 *  (eigene Art seit E91) ist eine Sitzbank und zaehlt dort mit. */
function katalogArt(a: MoebelArt | null): MoebelArt | null {
  return a === 'besta_bank' ? 'bank' : a
}

/** Gehoert ein Moebel im Plan zu diesem Katalog-Eintrag? Gleiche Art
 *  (am Namen erkannt), bei Betten dieselbe Breite, bei Sofas dieselbe Form,
 *  beim Fernseher: an der Wand oder nicht. Ohne erkannte Art: gleicher Name.
 *  name ist der Name des Eintrags in der aktuellen Sprache. */
export function gehoertZu(o: Objekt, v: Vorlage, name: string): boolean {
  if (o.art !== v.art) return false
  const a = v.art === 'moebel' ? katalogArt(moebelArt(name)) : null
  if (!a) return o.name === name
  if (katalogArt(moebelArt(o.name ?? '')) !== a) return false
  if (a === 'bett') return o.breite_cm === v.breite_cm
  if (a === 'sofa') return (o.form === 'l') === (v.form === 'l')
  if (a === 'fernseher') return (o.tiefe_cm <= 12) === (v.tiefe_cm <= 12)
  return true
}
