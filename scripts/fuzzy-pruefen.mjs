// Prueft die tolerante Suche (src/lib/fuzzy.ts) ohne Browser: Tippfehler,
// Umlaute ohne Punkte, vertauschte und fehlende Buchstaben, mehrere Woerter,
// Reihenfolge und Tempo.
// Aufruf im Projektordner: node scripts/fuzzy-pruefen.mjs
// Ausgabe "ok" oder die abweichenden Faelle, Exit 1 bei Fehlern.
// Node entfernt die Typen der .ts-Datei selbst.
import { fuzzyFilter, fuzzyIndex, fuzzyAbfrage, locker, normalisieren } from '../src/lib/fuzzy.ts'

let fehler = 0
function wahr(name, ist) {
  if (!ist) {
    console.log('ABWEICHUNG', name)
    fehler++
  }
}

const waren = [
  'Papierbecher',
  'Fußbälle',
  'Gummibärchen',
  'Klebeband',
  'Müllsäcke',
  'Kabelbinder',
  'Gelbe Warnweste',
  'Plastikteller',
  'Kaffee',
  'Taschenlampe',
  'Schaufel',
  'Tisch',
]
const finden = (q) => fuzzyFilter(waren, q, (w) => [w]).map((t) => t.item)

// Normalisieren
wahr('normalisieren Umlaut', normalisieren('Fußbälle!') === 'fussbaelle')
wahr('normalisieren Akzent', normalisieren('Café') === 'cafe')
wahr('locker', locker('fussbaelle') === 'fusbale')

// Die Beispiele aus dem Auftrag
wahr('papirbecher', finden('papirbecher')[0] === 'Papierbecher')
wahr('fusbal', finden('fusbal')[0] === 'Fußbälle')
wahr('gumibaerchen', finden('gumibaerchen')[0] === 'Gummibärchen')
wahr('gummibaerchen', finden('gummibaerchen')[0] === 'Gummibärchen')

// Umlaute ohne Punkte, ae/oe/ue und ss
wahr('fussballe', finden('fussballe')[0] === 'Fußbälle')
wahr('fussbaelle', finden('fussbaelle')[0] === 'Fußbälle')
wahr('gummibarchen', finden('gummibarchen')[0] === 'Gummibärchen')
wahr('muellsaecke', finden('muellsaecke')[0] === 'Müllsäcke')
wahr('mulsacke', finden('mulsacke')[0] === 'Müllsäcke')
wahr('Gross/klein', finden('PAPIERBECHER')[0] === 'Papierbecher')

// Vertauschte Buchstaben
wahr('vertauscht papeirbecher', finden('papeirbecher')[0] === 'Papierbecher')
wahr('vertauscht klebeabnd', finden('klebeabnd')[0] === 'Klebeband')
wahr('vertauscht kabelbidner', finden('kabelbidner')[0] === 'Kabelbinder')

// Fehlende Buchstaben und zu viele
wahr('fehlt klebband', finden('klebband')[0] === 'Klebeband')
wahr('fehlt kaffe', finden('kafee')[0] === 'Kaffee')
wahr('fehlt taschenlmpe', finden('taschenlmpe')[0] === 'Taschenlampe')
wahr('zuviel schaufell', finden('schaufell')[0] === 'Schaufel')
wahr('falsch plastiktaller', finden('plastiktaller')[0] === 'Plastikteller')

// Anfang und Teilwort
wahr('anfang pap', finden('pap')[0] === 'Papierbecher')
wahr('teilwort becher', finden('becher')[0] === 'Papierbecher')
wahr('teilwort mit Fehler bechr', finden('bechr').includes('Papierbecher'))

// Mehrere Woerter: alle muessen passen
wahr('zwei Woerter', finden('warnwest gelb').join() === 'Gelbe Warnweste')
wahr('zwei Woerter nein', finden('papier gelb').length === 0)
wahr('getrennt geschrieben', finden('papier becher')[0] === 'Papierbecher')
const zweiTeilig = fuzzyFilter(['Papier Becher', 'Teller'], 'papirbecher', (w) => [w])
wahr('zusammen geschrieben', zweiTeilig.length === 1 && zweiTeilig[0].item === 'Papier Becher')

// Nicht finden, was nicht passt
wahr('nichts xyz', finden('xyz').length === 0)
wahr('nichts auto', finden('auto').length === 0)
wahr('zu kurz ab', finden('ab').length === 0)
wahr('tisch nicht Teller', !finden('tisch').includes('Plastikteller'))

// Reihenfolge: genau vor Anfang vor Tippfehler
const gemischt = fuzzyFilter(['Becherhalter', 'Bechere', 'Becher', 'Bechter'], 'becher', (w) => [w]).map((t) => t.item)
wahr('genau zuerst', gemischt[0] === 'Becher')
wahr('anfang vor Tippfehler', gemischt.indexOf('Becherhalter') < gemischt.indexOf('Bechter'))

// Gewicht: der Name zaehlt mehr als das Lager
const felder = [
  { n: 'Kleber', l: 'Wien' },
  { n: 'Wiener Wuerstel', l: 'Graz' },
]
const gew = fuzzyFilter(felder, 'wien', (x) => [x.n, { text: x.l, gewicht: 0.4 }]).map((t) => t.item.n)
wahr('Name vor Lager', gew[0] === 'Wiener Wuerstel' && gew.length === 2)

// Leere Eingabe: alles, alte Reihenfolge
wahr('leer gibt alles', fuzzyFilter(waren, '  ', (w) => [w]).length === waren.length)

// Tempo: 5000 Eintraege, 20 Abfragen
const viele = []
for (let i = 0; i < 5000; i++) viele.push(`Artikel ${i} Papierbecher Lager ${i % 40} Regal ${i % 7}`)
const t0 = Date.now()
const idx = fuzzyIndex(viele, (w) => [w])
for (const q of ['papirbecher', 'fusbal', 'regal 3', 'artikl 4999', 'zzzzzz', 'lager 12 papir']) fuzzyAbfrage(idx, q)
const ms = Date.now() - t0
wahr(`Tempo (${ms} ms fuer Index und 6 Abfragen)`, ms < 2500)

console.log(fehler === 0 ? 'ok' : `${fehler} Abweichung(en)`)
process.exit(fehler === 0 ? 0 : 1)
