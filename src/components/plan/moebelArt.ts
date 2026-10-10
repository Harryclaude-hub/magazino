/* Welche Moebelart ein Objekt ist, erkannt am Namen (so wie der Katalog
 * ihn setzt, auf Deutsch oder Arabisch). Eigene Datei ohne React, damit
 * auch die 3D-Szene (szene.ts, Pruefskripte unter node) sie nutzen kann. */

import { objektBoden, objektRechtecke, type ObjektForm } from '../../lib/geometrie.ts'
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
  /* E82: Deko, Spielzeug, Stoffe, Sockel */
  | 'spielzeugkiste'
  | 'kuscheltier'
  | 'bausteine'
  | 'spielkueche'
  | 'buecher'
  | 'bild'
  | 'kissen'
  | 'wolldecke'
  | 'korb'
  | 'vorhang'
  | 'obstschale'
  | 'blumenkasten'
  | 'sockel'
  /* E91: Eckbank aus BESTA, Deko fuer Bad und WC */
  | 'besta_bank'
  | 'handtuch'
  | 'handtuchstapel'
  | 'badaccessoires'
  | 'seifenschale'
  | 'kerzen'
  | 'duftstaebchen'
  | 'badewannenablage'
  | 'klopapierhalter'
  | 'klobuerste'
  | 'bademantel'
  | 'wandregal'

/** Ein Wort im Namen: Teilwort (Text) oder Muster (E91). */
type Wort = string | RegExp

/** BESTA als Sitzbank (E91): der Name nennt BESTA (mit A, AA oder dem
 *  schwedischen Ring-A) und eine Bank (arabisch مقعد). Eine blosse TV-Bank
 *  bleibt ein TV-Board, ein Bankkissen ein Kissen. */
const BESTA_BANK = /^(?=.*(?:(?<![a-z])best(?:å|aa|a)(?![a-zäöüß])|بيستو))(?=.*(?:(?<!tv[- ]?)bank(?!kissen)|مقعد))/

/** Gestapelte, gefaltete oder gerollte Handtuecher (E91); haengen sie an
 *  Stange, Haken oder Ring, bleiben es Handtuecher am Halter. */
const HANDTUCHSTAPEL =
  /^(?!.*(?:halter|stange|haken|ring|reling))(?=.*(?:hand|bade|dusch|gäste|gaeste)t(?:uch|ücher|uecher))(?=.*(?:stapel|gestapelt|gerollt|zusammengelegt|gefaltet))/

/** Reihenfolge zaehlt: das Genauere zuerst (Geschirrspueler vor Spuele,
 *  Waschtisch vor Tisch, Couchtisch vor Couch, Buerostuhl vor Stuhl,
 *  Kinderbett und Nachttisch vor Bett).
 *
 *  Deko und Spielzeug (E82) stehen vor den allgemeinen Moebeln, deren
 *  Woerter in ihren Namen stecken: Sofakissen (sofa), Kinderkueche
 *  (kueche), Blumenkasten (blume), Buecher auf dem Tisch (tisch). Nicht
 *  ganz vorn: Buecher erst nach Schreibtisch und Buerostuhl (arabisch
 *  "مكتب" enthaelt "كتب"), Korb ganz hinten (arabisch "مغسلة" enthaelt
 *  "سلة", Korbsessel und Korbstuhl bleiben Sessel und Stuhl). Nie das
 *  blosse "bild", das stuende auch im Bildschirm. Der Sockel (ENHET unter
 *  der Waschmaschine) frueh, damit "Sockel Waschmaschine" ein Sockel
 *  bleibt. scripts/szene-pruefen.mjs prueft die Namen der Wohnung.
 *
 *  E91: Die Deko fuer Bad und WC steht gleich nach der Mauer, vor Spiegel,
 *  Sockel, Wanne, WC, Waschbecken und Tisch, deren Woerter in ihren Namen
 *  stecken (Kerzen auf dem Wannenrand, Toilettenpapierhalter, Zahnputzbecher
 *  am Waschbecken, Handtuchhalter neben dem Spiegel). Untereinander: die
 *  Wannenablage vor den Kerzen (sie traegt eine), Duftstaebchen vor Kerzen,
 *  Bademantel und Handtuchstapel vor dem Handtuch. Die BESTA-Bank steht
 *  vor dem TV-Board, siehe BESTA_BANK. */
const WOERTER: [MoebelArt, Wort[]][] = [
  // Kein Moebel: ein Stueck Wand im Raum (Schacht, Pfeiler), E73.
  ['mauer', ['mauervorsprung', 'wandvorsprung', 'mauerstück', 'mauerstueck', 'بروز جدار']],
  ['besta_bank', [BESTA_BANK]],
  ['badewannenablage', ['badewannenablage', 'wannenablage', 'badewannenbrett', 'wannenbrett', 'badewannentablett', 'wannentablett', 'رف حوض الاستحمام', 'صينية حوض الاستحمام']],
  ['duftstaebchen', ['duftstäbchen', 'duftstaebchen', 'raumduft', 'diffuser', 'أعواد عطرية', 'معطر جو']],
  ['kerzen', ['kerze', 'teelicht', 'شمعة', 'شموع', 'شمعدان']],
  ['klopapierhalter', ['klopapier', 'toilettenpapier', 'toilettenrolle', 'wc-papier', 'wc-rolle', 'klorolle', 'ورق التواليت', 'ورق المرحاض', 'حامل ورق']],
  ['klobuerste', ['klobürste', 'klobuerste', 'wc-bürste', 'wc-buerste', 'toilettenbürste', 'toilettenbuerste', 'wc-garnitur', 'فرشاة المرحاض', 'فرشاة التواليت']],
  ['bademantel', ['bademantel', 'morgenmantel', 'saunamantel', 'رداء الحمام', 'روب الحمام', 'برنس']],
  ['handtuchstapel', [HANDTUCHSTAPEL, 'مناشف مطوية', 'منشفة مطوية', 'مناشف ملفوفة', 'كومة مناشف']],
  ['handtuch', ['handtuch', 'handtücher', 'handtuecher', 'badetuch', 'badetücher', 'badetuecher', 'duschtuch', 'duschtücher', 'duschtuecher', 'gästetuch', 'gaestetuch', 'منشفة', 'مناشف']],
  ['badaccessoires', ['zahnputzbecher', 'zahnbürste', 'zahnbuerste', 'seifenspender', 'badaccessoire', 'bad-accessoire', 'badset', 'bad-set', 'كوب فرشاة الأسنان', 'فرشاة أسنان', 'فرشاة الأسنان', 'موزع صابون', 'إكسسوارات الحمام']],
  ['seifenschale', ['seifenschale', 'seifenablage', 'seifenstück', 'seifenstueck', 'صحن صابون', 'صابونة']],
  ['wandregal', ['wandregal', 'wandboard', 'hängeregal', 'haengeregal', 'bambusregal', 'رف حائط', 'رف جداري']],
  ['spiegel', ['spiegel', 'مرآة']],
  ['sockel', ['sockel', 'قاعدة']],
  ['tv_board', ['tv-board', 'tv-bank', 'tvboard', 'lowboard', 'fernsehschrank', 'طاولة تلفاز']],
  ['essgruppe', ['essgruppe', 'essbereich', 'مجموعة طعام']],
  ['haengelampe', ['hängeleuchte', 'haengeleuchte', 'hängelampe', 'haengelampe', 'pendelleuchte', 'pendellampe', 'مصباح معلق']],
  // E82: Deko und Spielzeug, vor Bank, Sofa, Bett, Kueche, Pflanze und Tisch.
  // Kissen fuer Bank und Stuhl bleiben Kissen, "Sitzbank mit Kissen" eine Bank (E82, Pruefung).
  ['kissen', ['bankkissen', 'sitzkissen', 'stuhlkissen', 'zierkissen', 'sofakissen']],
  ['bank', ['sitzbank', 'eckbank', 'wandbank', 'مقعد طويل']],
  ['kissen', ['kissen', 'وسادة']],
  ['wolldecke', ['wolldecke', 'plaid', 'kuscheldecke', 'بطانية']],
  ['spielzeugkiste', ['spielzeugkiste', 'spielzeugtruhe', 'spielzeugkorb', 'صندوق ألعاب']],
  ['spielkueche', ['spielküche', 'spielkueche', 'kinderküche', 'kinderkueche', 'مطبخ ألعاب']],
  ['kuscheltier', ['kuscheltier', 'teddy', 'plüschtier', 'plueschtier', 'دمية محشوة']],
  ['bausteine', ['bausteine', 'bauklötze', 'baukloetze', 'holzklötze', 'holzkloetze', 'مكعبات']],
  ['obstschale', ['obstschale', 'obstkorb', 'وعاء فاكهة']],
  ['blumenkasten', ['blumenkasten', 'balkonkasten', 'kräuterkasten', 'kraeuterkasten', 'صندوق زهور']],
  ['vorhang', ['vorhang', 'vorhänge', 'vorhaenge', 'gardine', 'ستارة']],
  ['bild', ['wandbild', 'bilderrahmen', 'poster', 'kunstdruck', 'لوحة']],
  ['backofen', ['backofen', 'ofenschrank', 'فرن']],
  ['hochschrank', ['hochschrank', 'einbaukühlschrank', 'خزانة عالية']],
  ['couchtisch', ['couchtisch', 'wohnzimmertisch', 'طاولة قهوة']],
  ['nachttisch', ['nachttisch', 'nachtkästchen', 'nachtkaestchen', 'طاولة جانبية']],
  ['schreibtisch', ['schreibtisch', 'طاولة مكتب']],
  ['esstisch_rund', ['runder', 'مستديرة']],
  ['buerostuhl', ['bürostuhl', 'buerostuhl', 'drehstuhl', 'كرسي مكتب']],
  ['buecher', ['bücherstapel', 'buecherstapel', 'buchstapel', 'bilderbücher', 'bilderbuecher', 'كومة كتب']],
  ['sessel', ['sessel', 'كرسي بذراعين']],
  ['kinderbett', ['kinderbett', 'babybett', 'juniorbett', 'سرير أطفال']],
  ['gefrierschrank', ['gefrierschrank', 'gefriertruhe', 'tiefkühl', 'مجمد']],
  ['schuhschrank', ['schuhschrank', 'schuhregal', 'خزانة أحذية']],
  ['garderobe', ['garderobe', 'علاقة ملابس']],
  ['sideboard', ['sideboard', 'anrichte', 'خزانة جانبية']],
  ['stehlampe', ['stehlampe', 'lampe', 'مصباح']],
  ['pflanze', ['pflanze', 'blume', 'ficus', 'monstera', 'efeutute', 'bogenhanf', 'grünlilie', 'gruenlilie', 'zimmerpflanze', 'نبتة']],
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
  ['korb', ['aufbewahrungskorb', 'korb', 'سلة']],
]

/** Deko und Spielzeug (E82): eine eigene Ebene, die sich in 2D und 3D
 *  ausblenden laesst wie die Teppiche. */
export const DEKO_ARTEN: ReadonlySet<MoebelArt> = new Set<MoebelArt>([
  'spielzeugkiste',
  'kuscheltier',
  'bausteine',
  'spielkueche',
  'buecher',
  'bild',
  'kissen',
  'wolldecke',
  'korb',
  'vorhang',
  'obstschale',
  'blumenkasten',
  /* E91: Bad und WC */
  'handtuch',
  'handtuchstapel',
  'badaccessoires',
  'seifenschale',
  'kerzen',
  'duftstaebchen',
  'badewannenablage',
  'klopapierhalter',
  'klobuerste',
  'bademantel',
  'wandregal',
])

/** Woerter, die nur als ganzes Wort Buecher heissen (E82, Pruefung): als
 *  Teilwort stecken sie in Buecherregal, Buecherschrank, arabisch مكتب
 *  (Schreibtisch) und مكتبة (Buecherregal). */
const BUECHER_WORTE = new Set(['bücher', 'buecher', 'كتب'])
const REGAL_WORT = /regal|schrank|خزانة|رف|مكتبة/

export function moebelArt(name: string): MoebelArt | null {
  const n = name.toLowerCase()
  for (const [art, woerter] of WOERTER) {
    if (woerter.some((w) => (typeof w === 'string' ? n.includes(w) : w.test(n)))) return art
    // Nach Schreibtisch und Buerostuhl (dort steht مكتب), vor Sessel und Bett.
    if (art === 'buerostuhl' && !REGAL_WORT.test(n) && n.split(/[\s,.;:/()+-]+/).some((w) => BUECHER_WORTE.has(w))) return 'buecher'
  }
  return null
}

/** Gehoert das Objekt zur Deko-Ebene (E82)? Nur Moebel: ein Regal mit
 *  "Buecher" im Namen bleibt ein Regal und wird nie ausgeblendet. */
export function istDeko(o: Pick<Objekt, 'art' | 'name'>): boolean {
  if (o.art !== 'moebel') return false
  const a = moebelArt(o.name ?? '')
  return a !== null && DEKO_ARTEN.has(a)
}

/** So weit (cm) darf die Unterkante von der Oberkante der Deko abweichen
 *  und gilt noch als daraufgestellt. */
const AUF_DEKO_CM = 1

type EbenenObjekt = Pick<Objekt, 'id' | 'art' | 'name' | 'raum_id'> & ObjektForm

/** Ueberdecken sich die Grundflaechen von a und b (mehr als 0,5 cm in
 *  beiden Richtungen, nur Beruehren zaehlt nicht)? */
function grundUeberdeckt(a: ObjektForm, b: ObjektForm): boolean {
  return objektRechtecke(a).some((p) =>
    objektRechtecke(b).some((q) => Math.min(p.x1, q.x1) - Math.max(p.x0, q.x0) > 0.5 && Math.min(p.y1, q.y1) - Math.max(p.y0, q.y0) > 0.5),
  )
}

/** Was mit der Deko-Ebene verschwindet (Nacharbeit E91): die Deko selbst
 *  und alles, was auf ihr steht, etwa die Efeutute auf dem Wandregal ueber
 *  dem WC. Ohne ihr Regal schwebte sie sonst in der Luft. Auf einer Deko
 *  steht, was im selben Raum ueber dem Boden haengt, mit der Unterkante auf
 *  ihrer Oberkante (bis AUF_DEKO_CM) und mit der Grundflaeche ueber ihr.
 *  Was darauf wieder steht, verschwindet mit. Ergebnis: die ids. Fuer
 *  den Zeichner, die 3D-Szene und den Plan. */
export function dekoEbene(objekte: readonly EbenenObjekt[]): Set<string> {
  const weg = new Set<string>()
  const traeger: EbenenObjekt[] = []
  for (const o of objekte) {
    if (!istDeko(o)) continue
    weg.add(o.id)
    traeger.push(o)
  }
  // Die Liste waechst, waehrend sie abgearbeitet wird: so kommt auch mit,
  // was auf dem Mitgenommenen steht.
  for (let i = 0; i < traeger.length; i++) {
    const d = traeger[i]
    const oben = objektBoden(d) + d.hoehe_cm
    for (const o of objekte) {
      if (weg.has(o.id) || o.raum_id !== d.raum_id) continue
      const unten = objektBoden(o)
      if (unten <= 0 || Math.abs(unten - oben) > AUF_DEKO_CM || !grundUeberdeckt(o, d)) continue
      weg.add(o.id)
      traeger.push(o)
    }
  }
  return weg
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
