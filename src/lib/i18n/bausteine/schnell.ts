import type { Woerterbuch } from '../woerter'

/* Die Schnellansicht.
 *
 * Sie erscheint nach jedem Scan. Wichtig ist, was man beim Tragen in der
 * Hand braucht: was ist das, wo gehoert es hin, ist es schon da. Alles
 * andere steht auf der vollen Seite.
 */
export const schnell: Woerterbuch = {
  'schnell.laedt': { de: 'Kiste wird geholt' },
  'schnell.nicht_gefunden': { de: 'Dazu gibt es nichts.' },

  'schnell.angekommen_knopf': { de: 'Angekommen' },
  'schnell.angekommen_hinweis': {
    de: 'Ein Tippen, dann steht sie auf angekommen.',
  },
  'schnell.wieder_offen': { de: 'Doch nicht angekommen' },
  'schnell.status_aendern': { de: 'Status' },

  'schnell.deckbild': { de: 'Deckbild' },
  'schnell.kein_deckbild': { de: 'Noch kein Deckbild' },
  'schnell.deckbild_aufnehmen': { de: 'Deckbild aufnehmen' },
  'schnell.deckbild_wechseln': { de: 'Anderes Deckbild' },
  'schnell.deckbild_gesetzt': { de: 'Deckbild gesetzt' },
  'schnell.deckbild_hinweis': {
    de: 'Das Bild erscheint beim nächsten Scan sofort. Dann sieht man, was man in der Hand hat, ohne zu lesen.',
  },
  'schnell.bild_laedt_hoch': { de: 'Bild wird hochgeladen' },

  'schnell.notiz': { de: 'Kurznotiz' },
  'schnell.notiz_platzhalter': {
    de: 'Steht im Keller, oben aufmachen, Glas',
  },
  'schnell.notiz_leer': {
    de: 'Noch nichts notiert. Antippen zum Schreiben.',
  },
  'schnell.notiz_speichern': { de: 'Notiz sichern' },
  'schnell.notiz_gespeichert': { de: 'Notiz gesichert' },

  'schnell.inhalt_leer': { de: 'Kein Inhalt eingetragen' },
  'schnell.inhalt_mehr': { de: 'und {n} weitere' },

  'schnell.tippen_hinweis': {
    de: 'Tipp irgendwo hier hin, dann siehst du alles: Tabelle, Notizen und alle Bilder.',
  },
  'schnell.oeffnen': { de: 'Ganz öffnen' },
  'schnell.weiter': { de: 'Weiter scannen' },
  'schnell.schliessen': { de: 'Schließen' },
  'schnell.alter_code_gescannt': {
    de: 'Gescannt wurde das alte Etikett {code}. Die Kiste heißt jetzt anders.',
  },
  // Platz im Grundriss (Etappe 3): zwischen Zimmer und Angekommen.
  'schnell.platz': { de: 'Platz: {raum}' },
  'schnell.kein_platz': { de: 'Noch kein Platz im Grundriss' },
  'schnell.platzieren': { de: 'Im Zimmer platzieren' },
  'schnell.platz_aendern': { de: 'Platz ändern' },
  // Karte einer Kiste in der 3D-Begehung (E82). Zurück, Inhalt und
  // "Ganz öffnen" nehmen die vorhandenen Schlüssel.
  'schnell.kiste_oeffnen': { de: 'Kiste öffnen' },
  'schnell.kiste_schliessen': { de: 'Kiste schließen' },
  'schnell.zur_begehung': { de: 'Zurück zur Begehung' },
  'schnell.zur_ansicht': { de: 'Zurück zur 3D-Ansicht' },
  'schnell.inhalt_laedt': { de: 'Inhalt wird geholt' },
}
