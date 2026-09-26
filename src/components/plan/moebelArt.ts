/* Welche Moebelart ein Objekt ist, erkannt am Namen (so wie der Katalog
 * ihn setzt, auf Deutsch oder Arabisch). Eigene Datei ohne React, damit
 * auch die 3D-Szene (szene.ts, Pruefskripte unter node) sie nutzen kann. */

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

/** Reihenfolge zaehlt: das Genauere zuerst (Geschirrspueler vor Spuele,
 *  Waschtisch vor Tisch, Couchtisch vor Couch, Buerostuhl vor Stuhl,
 *  Kinderbett und Nachttisch vor Bett). */
const WOERTER: [MoebelArt, string[]][] = [
  ['tv_board', ['tv-board', 'tvboard', 'lowboard', 'fernsehschrank', 'طاولة تلفاز']],
  ['essgruppe', ['essgruppe', 'essbereich', 'مجموعة طعام']],
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
  ['teppich', ['teppich', 'سجادة']],
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
