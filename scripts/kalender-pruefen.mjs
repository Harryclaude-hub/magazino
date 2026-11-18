// Prueft die Kalenderdatei (src/lib/kalender.ts) ohne Browser: CRLF, Pflichtfelder,
// UTC-Zeiten, Maskierung, Faltung bei 75 Oktetten, beide Erinnerungen.
// Aufruf im Projektordner: node scripts/kalender-pruefen.mjs
// Ausgabe "ok" oder die abweichenden Faelle, Exit 1 bei Fehlern.
// Node entfernt die Typen der .ts-Datei selbst.
import { icsBauen, icsFalten, icsText, icsZeit } from '../src/lib/kalender.ts'

let fehler = 0
function gleich(name, ist, soll) {
  const a = JSON.stringify(ist)
  const b = JSON.stringify(soll)
  if (a !== b) {
    console.log('ABWEICHUNG', name, 'ist', a, 'soll', b)
    fehler++
  }
}
function wahr(name, ist) {
  if (!ist) {
    console.log('ABWEICHUNG', name, 'ist nicht wahr')
    fehler++
  }
}

gleich('zeit', icsZeit(new Date(Date.UTC(2026, 10, 18, 17, 5, 9))), '20261118T170509Z')
gleich('text maskiert', icsText('a,b;c\\d\ne'), 'a\\,b\\;c\\\\d\\ne')

const jetzt = new Date(Date.UTC(2026, 10, 18, 8, 0, 0))
const ics = icsBauen(
  [
    {
      id: 'abc-1',
      titel: 'Zurückbringen: Akkuschrauber, groß (Lager Nord)',
      beschreibung: '1 Stk Akkuschrauber ins Lager Nord zurückbringen.',
      faellig: new Date(Date.UTC(2026, 10, 18, 17, 0, 0)),
    },
    { id: 'abc-2', titel: 'Zwei', beschreibung: '', faellig: '2026-11-19T17:00:00.000Z', dauerMin: 60 },
  ],
  jetzt,
)

wahr('beginnt mit VCALENDAR', ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'))
wahr('endet mit CRLF', ics.endsWith('END:VCALENDAR\r\n'))
wahr('kein nacktes LF', !/(^|[^\r])\n/.test(ics))
const zeilen = ics.split('\r\n')
gleich('zwei Termine', zeilen.filter((z) => z === 'BEGIN:VEVENT').length, 2)
gleich('vier Alarme', zeilen.filter((z) => z === 'BEGIN:VALARM').length, 4)
wahr('uid', zeilen.includes('UID:abc-1@magazino'))
wahr('dtstamp', zeilen.includes('DTSTAMP:20261118T080000Z'))
wahr('dtstart', zeilen.includes('DTSTART:20261118T170000Z'))
wahr('dtend 30 min', zeilen.includes('DTEND:20261118T173000Z'))
wahr('dtend 60 min', zeilen.includes('DTEND:20261119T180000Z'))
wahr('trigger 3h', zeilen.includes('TRIGGER:-PT3H'))
wahr('trigger 30min', zeilen.includes('TRIGGER:-PT30M'))
// Komma im Titel ist maskiert. Die Zeile ist gefaltet; wieder zusammengesetzt pruefen.
const flach = ics.replace(/\r\n /g, '')
wahr('summary maskiert', flach.includes('SUMMARY:Zurückbringen: Akkuschrauber\\, groß (Lager Nord)'))
for (const z of zeilen) {
  const bytes = new TextEncoder().encode(z).length
  if (bytes > 75) {
    console.log('ABWEICHUNG Zeile laenger als 75 Oktette', bytes, z.slice(0, 30))
    fehler++
  }
}

// Faltung: lange Zeile mit Umlauten, Zusammensetzen ergibt das Original.
const lang = 'DESCRIPTION:' + 'äöüß '.repeat(40)
const gefaltet = icsFalten(lang)
wahr('gefaltet hat Umbruch', gefaltet.includes('\r\n '))
gleich('entfaltet gleich', gefaltet.replace(/\r\n /g, ''), lang)
for (const z of gefaltet.split('\r\n')) {
  if (new TextEncoder().encode(z).length > 75) {
    console.log('ABWEICHUNG gefaltete Zeile zu lang')
    fehler++
  }
}

// Ungueltiges Datum wirft, statt eine kaputte Datei zu liefern.
let geworfen = false
try {
  icsBauen([{ id: 'x', titel: 't', beschreibung: '', faellig: 'kein datum' }])
} catch {
  geworfen = true
}
wahr('ungueltiges Datum wirft', geworfen)

console.log(fehler === 0 ? 'ok' : `${fehler} Abweichung(en)`)
process.exit(fehler === 0 ? 0 : 1)
