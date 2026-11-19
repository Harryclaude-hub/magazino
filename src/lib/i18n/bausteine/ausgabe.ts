import type { Woerterbuch } from '../woerter'

/* Drucken und Ausgeben.
 *
 * Die Vorschau zeigt genau das HTML, das auch gedruckt und in die Datei
 * geschrieben wird. Darum reden diese Woerter nur ueber das, was auf dem
 * Blatt landet.
 */
export const ausgabe: Woerterbuch = {
  'ausgabe.titel': { de: 'Drucken und Ausgeben' },
  'ausgabe.untertitel': {
    de: 'Erst die Vorschau, dann aufs Papier oder in eine Datei',
  },
  'ausgabe.laedt': { de: 'Daten werden geladen' },
  'ausgabe.leer': {
    de: 'Mit diesen Einstellungen bleibt das Blatt leer.',
  },

  'ausgabe.spalte_qr': { de: 'QR' },
  'ausgabe.spalte_code': { de: 'Nummer' },
  'ausgabe.spalte_titel': { de: 'Bezeichnung' },
  'ausgabe.spalte_zimmer': { de: 'Zimmer' },
  'ausgabe.spalte_person': { de: 'Person' },
  'ausgabe.spalte_groesse': { de: 'Größe' },
  'ausgabe.spalte_liter': { de: 'Liter' },
  'ausgabe.spalte_status': { de: 'Status' },
  'ausgabe.spalte_inhalt': { de: 'Inhalt' },
  'ausgabe.spalte_notiz': { de: 'Notiz' },
  'ausgabe.fusszeile': { de: '{n} Zeilen. Erstellt mit Magazino.' },

  'ausgabe.was_drauf': { de: 'Was aufs Blatt kommt' },
  'ausgabe.spalten': { de: 'Spalten' },
  'ausgabe.spalten_hinweis': {
    de: 'Tipp die Spalten an, die du brauchst. Die Vorschau ändert sich sofort.',
  },
  'ausgabe.gestaltung': { de: 'Gestaltung' },
  'ausgabe.farben': { de: 'Farben mitdrucken' },
  'ausgabe.farben_hinweis': {
    de: 'Zimmerfarbe, Personenfarbe und eigene Markierung. Aus ergibt ein schlichtes Blatt, das auch in Schwarzweiß gut aussieht.',
  },
  'ausgabe.symbole': { de: 'Zeichen mitdrucken' },
  'ausgabe.symbole_hinweis': {
    de: 'Das Zeichen der Markierung steht neben der Nummer.',
  },
  'ausgabe.schlicht': { de: 'Schlicht' },
  'ausgabe.schlicht_hinweis': {
    de: 'Ohne Farben und ohne Zeichen, nur die Angaben.',
  },
  'ausgabe.zebra_immer': {
    de: 'Eine Zeile bleibt heller, die nächste dunkler. Das gilt immer, auch schlicht und auch mit eigenen Farben.',
  },
  'ausgabe.papier': { de: 'Papierformat' },
  'ausgabe.qr_groesse': { de: 'Größe des QR-Codes' },
  'ausgabe.qr_mass': { de: '{n} Punkte' },

  'ausgabe.auswahl': { de: 'Was ausgegeben wird' },
  'ausgabe.nur_markierte': { de: 'Nur markierte Zeilen' },
  'ausgabe.mit_moebeln': { de: 'Möbel mitnehmen' },
  'ausgabe.anzahl.eins': { de: '1 Zeile kommt aufs Blatt' },
  'ausgabe.anzahl.viele': { de: '{n} Zeilen kommen aufs Blatt' },

  'ausgabe.vorschau': { de: 'Vorschau' },
  'ausgabe.vorschau_hinweis': {
    de: 'Genau das kommt aufs Papier und genau das steht in der Datei.',
  },

  'ausgabe.drucken': { de: 'Drucken' },
  'ausgabe.pdf_hinweis': {
    de: 'Im Druckfenster steht "Als PDF speichern". Das gibt ein sauberes PDF, auch auf Arabisch.',
  },
  'ausgabe.word': { de: 'Word-Datei' },
  'ausgabe.word_hinweis': {
    de: 'Öffnet sich in Word und in LibreOffice und lässt sich dort weiterschreiben.',
  },
  'ausgabe.html': { de: 'HTML-Datei' },
  'ausgabe.html_hinweis': {
    de: 'Eine Datei zum Weitergeben. Sie öffnet sich in jedem Browser und lässt sich von dort als PDF speichern.',
  },
  'ausgabe.csv': { de: 'Tabelle als CSV' },
  'ausgabe.csv_hinweis': {
    de: 'Für Excel und Google Tabellen.',
  },
  'ausgabe.etiketten_statt': {
    de: 'Einzelne Etiketten mit großem QR-Code gibt es im Etikettenbereich.',
  },
  'ausgabe.datei_fertig': { de: 'Datei wurde erzeugt' },
}
