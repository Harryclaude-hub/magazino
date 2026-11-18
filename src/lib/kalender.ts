/* Kalenderdatei (.ics, RFC 5545) fuer Rueckgabetermine.
 *
 * Reine Funktionen ohne Netz und ohne Importe, damit scripts/kalender-pruefen.mjs
 * sie direkt laden kann. Die Texte (Titel, Beschreibung) baut der Aufrufer in
 * der gewaehlten Sprache; hier wird nur verpackt: Zeilen mit CRLF, Sonderzeichen
 * maskiert, lange Zeilen gefaltet, Zeiten in UTC. Zwei Erinnerungen je Termin
 * (3 Stunden und 30 Minuten vorher). Funktioniert so im Apple- und im
 * Google-Kalender. */

export interface KalenderTermin {
  /** Stabile Kennung, damit ein erneuter Import den Termin ersetzt (UID). */
  id: string
  titel: string
  beschreibung: string
  /** Rueckgabezeitpunkt. */
  faellig: Date | string
  /** Dauer des Termins in Minuten, Standard 30. */
  dauerMin?: number
}

const CRLF = '\r\n'

function zwei(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

/** 20261118T170000Z */
export function icsZeit(d: Date): string {
  return (
    `${d.getUTCFullYear()}${zwei(d.getUTCMonth() + 1)}${zwei(d.getUTCDate())}` +
    `T${zwei(d.getUTCHours())}${zwei(d.getUTCMinutes())}${zwei(d.getUTCSeconds())}Z`
  )
}

/** TEXT-Wert nach RFC 5545: Rueckstrich, Semikolon, Komma, Zeilenumbruch. */
export function icsText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n')
}

/** Zeilen duerfen 75 Oktette lang sein; der Rest folgt nach CRLF und einem
 *  Leerzeichen. Gefaltet wird nie mitten in einem UTF-8-Zeichen. */
export function icsFalten(zeile: string): string {
  const enc = new TextEncoder()
  if (enc.encode(zeile).length <= 75) return zeile
  const teile: string[] = []
  let aktuell = ''
  let bytes = 0
  // Die erste Zeile darf 75 Oktette haben, Folgezeilen 74 plus das Leerzeichen.
  let grenze = 75
  for (const zeichen of zeile) {
    const n = enc.encode(zeichen).length
    if (bytes + n > grenze) {
      teile.push(aktuell)
      aktuell = ''
      bytes = 0
      grenze = 74
    }
    aktuell += zeichen
    bytes += n
  }
  if (aktuell) teile.push(aktuell)
  return teile.join(CRLF + ' ')
}

function alarm(trigger: string, text: string): string[] {
  return ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(text)}`, `TRIGGER:${trigger}`, 'END:VALARM']
}

/** Baut den Inhalt einer .ics-Datei mit einem Termin je Eintrag. Ein
 *  ungueltiges Datum wirft einen Fehler, statt eine kaputte Datei zu bauen. */
export function icsBauen(termine: KalenderTermin[], jetzt: Date = new Date()): string {
  const stempel = icsZeit(jetzt)
  const zeilen: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Magazino//Lager//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]
  for (const t of termine) {
    const start = t.faellig instanceof Date ? t.faellig : new Date(t.faellig)
    if (Number.isNaN(start.getTime())) throw new Error('Ungueltiges Datum im Kalendertermin')
    const ende = new Date(start.getTime() + (t.dauerMin ?? 30) * 60000)
    zeilen.push(
      'BEGIN:VEVENT',
      `UID:${t.id}@magazino`,
      `DTSTAMP:${stempel}`,
      `DTSTART:${icsZeit(start)}`,
      `DTEND:${icsZeit(ende)}`,
      `SUMMARY:${icsText(t.titel)}`,
      `DESCRIPTION:${icsText(t.beschreibung)}`,
      ...alarm('-PT3H', t.titel),
      ...alarm('-PT30M', t.titel),
      'END:VEVENT',
    )
  }
  zeilen.push('END:VCALENDAR')
  return zeilen.map(icsFalten).join(CRLF) + CRLF
}

/** Laedt die Datei im Browser herunter (Blob). Auf dem Handy oeffnet sie sich
 *  im Kalender. */
export function icsHerunterladen(termine: KalenderTermin[], dateiname = 'rueckgabe.ics'): void {
  const inhalt = icsBauen(termine)
  const blob = new Blob([inhalt], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = dateiname
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
