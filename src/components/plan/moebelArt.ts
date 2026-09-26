/* Welche Moebelart ein Objekt ist, erkannt am Namen (so wie der Katalog
 * ihn setzt, auf Deutsch oder Arabisch). Eigene Datei ohne React, damit
 * auch die 3D-Szene (szene.ts, Pruefskripte unter node) sie nutzen kann. */

import type { Objekt } from '../../lib/types'

export type MoebelArt =
  | 'wc'
  | 'waschbecken'
  | 'badewanne'
  | 'dusche'
  | 'geschirrspueler'
  | 'waschmaschine'
  | 'trockner'
  | 'spuele'
  | 'herd'
  | 'kuehlschrank'
  | 'kuechenzeile'
  | 'bett'
  | 'sofa'
  | 'fernseher'
  | 'kommode'
  | 'tisch'
  | 'sessel'
  | 'couchtisch'
  | 'sideboard'
  | 'esstisch_rund'
  | 'buerostuhl'
  | 'stuhl'
  | 'teppich'
  | 'stehlampe'
  | 'pflanze'
  | 'klavier'
  | 'nachttisch'
  | 'kinderbett'
  | 'schreibtisch'
  | 'schuhschrank'
  | 'garderobe'
  | 'gefrierschrank'
  | 'fahrrad'
  | 'tv_board'
  | 'essgruppe'
  | 'backofen'
  | 'hochschrank'
  | 'bank'
  | 'haengelampe'
  | 'mauer'
  | 'spiegel'

/** Reihenfolge zaehlt: das Genauere zuerst (Geschirrspueler vor Spuele,
 *  Waschtisch vor Tisch, Couchtisch vor Couch, Buerostuhl vor Stuhl,
 *  Kinderbett und Nachttisch vor Bett). */
const WOERTER: [MoebelArt, string[]][] = [
  // Kein Moebel: ein Stueck Wand im Raum (Schacht, Pfeiler), E73.
  ['mauer', ['mauervorsprung', 'wandvorsprung', 'mauerstück', 'mauerstueck', 'بروز جدار']],
  ['spiegel', ['spiegel', 'مرآة']],
  ['tv_board', ['tv-board', 'tv-bank', 'tvboard', 'lowboard', 'fernsehschrank', 'طاولة تلفاز']],
  ['essgruppe', ['essgruppe', 'essbereich', 'مجموعة طعام']],
  ['haengelampe', ['hängeleuchte', 'haengeleuchte', 'hängelampe', 'haengelampe', 'pendelleuchte', 'pendellampe', 'مصباح معلق']],
  ['bank', ['sitzbank', 'eckbank', 'wandbank', 'مقعد طويل']],
  ['backofen', ['backofen', 'ofenschrank', 'فرن']],
  ['hochschrank', ['hochschrank', 'einbaukühlschrank', 'خزانة عالية']],
  ['couchtisch', ['couchtisch', 'wohnzimmertisch', 'طاولة قهوة']],
  ['nachttisch', ['nachttisch', 'nachtkästchen', 'nachtkaestchen', 'طاولة جانبية']],
  ['schreibtisch', ['schreibtisch', 'طاولة مكتب']],
  ['esstisch_rund', ['runder', 'مستديرة']],
  ['buerostuhl', ['bürostuhl', 'buerostuhl', 'drehstuhl', 'كرسي مكتب']],
  ['sessel', ['sessel', 'كرسي بذراعين']],
  ['kinderbett', ['kinderbett', 'babybett', 'سرير أطفال']],
  ['gefrierschrank', ['gefrierschrank', 'gefriertruhe', 'tiefkühl', 'مجمد']],
  ['schuhschrank', ['schuhschrank', 'schuhregal', 'خزانة أحذية']],
  ['garderobe', ['garderobe', 'علاقة ملابس']],
  ['sideboard', ['sideboard', 'anrichte', 'خزانة جانبية']],
  ['stehlampe', ['stehlampe', 'lampe', 'مصباح']],
  ['pflanze', ['pflanze', 'blume', 'نبتة']],
  ['teppich', ['teppich', 'läufer', 'laeufer', 'badematte', 'fußmatte', 'fussmatte', 'سجادة']],
  ['klavier', ['klavier', 'piano', 'بيانو']],
  ['fahrrad', ['fahrrad', 'دراجة']],
  ['geschirrspueler', ['geschirrspüler', 'geschirrspueler', 'spülmaschine', 'spuelmaschine', 'غسالة صحون']],
  ['wc', ['wc', 'toilette', 'klo', 'مرحاض']],
  ['waschbecken', ['waschbecken', 'waschtisch', 'مغسلة']],
  ['badewanne', ['badewanne', 'wanne', 'حوض استحمام']],
  ['dusche', ['dusche', 'دش']],
  ['trockner', ['trockner', 'مجفف']],
  ['waschmaschine', ['waschmaschine', 'غسالة']],
  ['spuele', ['spüle', 'spuele', 'حوض المطبخ']],
  ['herd', ['herd', 'kochfeld', 'موقد']],
  ['kuehlschrank', ['kühlschrank', 'kuehlschrank', 'ثلاجة']],
  ['kuechenzeile', ['küchenzeile', 'kuechenzeile', 'küche', 'kueche', 'وحدة مطبخ']],
  ['bett', ['bett', 'سرير']],
  ['sofa', ['sofa', 'couch', 'أريكة']],
  ['fernseher', ['fernseher', 'tv', 'تلفاز']],
  ['kommode', ['kommode', 'خزانة أدراج']],
  ['tisch', ['tisch', 'طاولة']],
  ['stuhl', ['stuhl', 'كرسي']],
]

export function moebelArt(name: string): MoebelArt | null {
  const n = name.toLowerCase()
  for (const [art, woerter] of WOERTER) {
    if (woerter.some((w) => n.includes(w))) return art
  }
  return null
}

/** Die Kaesten einer Sitzbank in ihren lokalen Koordinaten: ein Rechteck,
 *  oder beim L (E73, Eckbank um einen Mauervorsprung) zwei: die Spalte
 *  ueber die volle Tiefe und der Rest neben dem Ausschnitt. lehne: der
 *  Kasten liegt an der Wand (y = 0) und bekommt Rueckenkissen. */
export function bankStuecke(
  o: Pick<Objekt, 'breite_cm' | 'tiefe_cm' | 'form' | 'ausschnitt_breite_cm' | 'ausschnitt_tiefe_cm' | 'ausschnitt_ecke'>,
): { x0: number; y0: number; x1: number; y1: number; lehne: boolean }[] {
  const B = o.breite_cm
  const T = o.tiefe_cm
  const aB = o.ausschnitt_breite_cm ?? 0
  const aT = o.ausschnitt_tiefe_cm ?? 0
  if (o.form !== 'l' || aB <= 0 || aT <= 0 || aB >= B || aT >= T) return [{ x0: 0, y0: 0, x1: B, y1: T, lehne: true }]
  const e = o.ausschnitt_ecke ?? 'ro'
  const links = e[0] === 'l'
  const oben = e[1] === 'o'
  const voll = links ? { x0: aB, x1: B } : { x0: 0, x1: B - aB }
  const rest = links ? { x0: 0, x1: aB } : { x0: B - aB, x1: B }
  return [
    { ...voll, y0: 0, y1: T, lehne: true },
    { ...rest, y0: oben ? aT : 0, y1: oben ? T : T - aT, lehne: !oben },
  ]
}
