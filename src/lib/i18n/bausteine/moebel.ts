import type { Woerterbuch } from '../woerter'

/* Moebel.
 *
 * Moebel sind in der Datenbank Eintraege in items mit kind = 'furniture'.
 * Darum heissen Nummer, Status, Zimmer und Person hier genauso wie bei den
 * Kisten. Neu sind nur die Angaben zum Stueck, die Seitenfotos, der
 * Teilekatalog und die Aufbauanleitung.
 */
export const moebel: Woerterbuch = {
  'moebel.titel': { de: 'Möbel' },
  'moebel.untertitel': {
    de: 'Jedes Stück mit Fotos von allen Seiten, Teilen und Anleitung',
  },
  'moebel.laedt': { de: 'Möbel werden geladen' },
  'moebel.nicht_gefunden': {
    de: 'Dieses Möbelstück gibt es nicht.',
  },
  'moebel.zur_liste': { de: 'Zu den Möbeln' },
  'moebel.anzahl.eins': { de: '1 Möbelstück' },
  'moebel.anzahl.viele': { de: '{n} Möbelstücke' },

  'moebel.neu': { de: 'Neues Möbel' },
  'moebel.name_platzhalter': { de: 'Esstisch, Kleiderschrank, Bett' },
  'moebel.angelegt': { de: '{code} angelegt' },
  'moebel.gespeichert': { de: 'Gespeichert' },
  'moebel.leer_titel': { de: 'Noch keine Möbel' },
  'moebel.leer_hinweis': {
    de: 'Leg jedes größere Stück einmal an. Danach kannst du jede Seite fotografieren, die Teile aufschreiben und die Anleitung dazulegen.',
  },
  'moebel.leer_filter': {
    de: 'In diesem Zimmer stehen keine Möbel.',
  },

  'moebel.angaben': { de: 'Angaben zum Stück' },
  'moebel.hersteller': { de: 'Hersteller' },
  'moebel.hersteller_platzhalter': { de: 'IKEA, Tischler, unbekannt' },
  'moebel.modell': { de: 'Modell' },
  'moebel.modell_platzhalter': { de: 'PAX, NORDEN' },
  'moebel.masse': { de: 'Maße' },
  'moebel.masse_platzhalter': { de: 'Breite x Tiefe x Höhe' },
  'moebel.masse_hinweis': {
    de: 'Schreib es so, wie du es beim Tragen brauchst. Zum Beispiel 180 x 90 x 75 cm.',
  },
  'moebel.zerlegt': { de: 'Zerlegt' },
  'moebel.zerlegt_hinweis': {
    de: 'Ist das Stück für den Umzug auseinandergebaut?',
  },
  'moebel.zerlegt_ja': { de: 'Zerlegt' },
  'moebel.zerlegt_nein': { de: 'Am Stück' },
  'moebel.keine_angaben': {
    de: 'Noch keine Angaben eingetragen.',
  },

  'moebel.teile': { de: 'Teilekatalog' },
  'moebel.teile_hinweis': {
    de: 'Freiwillig. Wer die Teile aufschreibt, kann sie beim Aufbauen nachzählen.',
  },
  'moebel.teile_leer': { de: 'Noch keine Teile eingetragen.' },
  'moebel.teil_platzhalter': { de: 'Tischbein, Schraube M6, Schlüssel' },
  'moebel.teile_gesamt.eins': { de: '1 Teil insgesamt' },
  'moebel.teile_gesamt.viele': { de: '{n} Teile insgesamt' },
  'moebel.teil_menge': { de: 'Menge' },
  'moebel.teil_gezaehlt': { de: 'Nachgezählt' },

  'moebel.fotos_seiten': { de: 'Fotos von jeder Seite' },
  'moebel.fotos_hinweis': {
    de: 'Fotografier jede Seite einzeln. Beim Aufbauen weiß man dann wieder, wo was hingehört.',
  },
  'moebel.fotos_leer': {
    de: 'Noch kein Foto von diesem Stück.',
  },
  'moebel.hier_ablegen': {
    de: 'Bilder oder PDF hier ablegen',
  },
  'moebel.seite_waehlen': { de: 'Welche Seite?' },
  'moebel.seite_ohne': { de: 'Ohne Angabe' },
  'moebel.seite_vorne': { de: 'Vorne' },
  'moebel.seite_hinten': { de: 'Hinten' },
  'moebel.seite_links': { de: 'Seite A' },
  'moebel.seite_rechts': { de: 'Seite B' },
  'moebel.seite_oben': { de: 'Oben' },
  'moebel.seite_unten': { de: 'Unten' },
  'moebel.seite_innen': { de: 'Innen' },
  'moebel.seite_detail': { de: 'Detail' },
  'moebel.seite_offen': { de: 'Seite noch offen' },
  'moebel.seite_setzen': { de: 'Seite eintragen' },

  'moebel.anleitung': { de: 'Aufbauanleitung' },
  'moebel.anleitung_hinweis': {
    de: 'Zieh die Anleitung als PDF hier herein oder fotografier die Blätter. Beides bleibt bei diesem Möbelstück.',
  },
  'moebel.anleitung_leer': { de: 'Noch keine Anleitung hinterlegt.' },
  'moebel.anleitung_pdf': { de: 'PDF wählen' },
  'moebel.anleitung_foto': { de: 'Blatt fotografieren' },
  'moebel.anleitung_oeffnen': { de: 'Anleitung öffnen' },
  'moebel.anleitung_seite': { de: 'Blatt {n}' },
  'moebel.anleitung_hinzugefuegt.eins': { de: '1 Blatt hinzugefügt' },
  'moebel.anleitung_hinzugefuegt.viele': { de: '{n} Blätter hinzugefügt' },
  'moebel.kein_pdf_oder_bild': {
    de: 'Nur Bilder und PDF können hier abgelegt werden. {n} Datei wurde nicht übernommen.',
  },

  'moebel.in_zimmer': { de: 'Zimmer' },
  'moebel.ohne_zimmer': { de: 'Ohne Zimmer' },
  'moebel.filter_zimmer': { de: 'Zimmer filtern' },
  'moebel.loeschen_titel': { de: 'Möbel löschen?' },
  'moebel.loeschen_text': {
    de: '{code} wird mit allen Fotos, Teilen und der Anleitung entfernt. Das lässt sich nicht rückgängig machen.',
  },
  'moebel.geloescht': { de: 'Möbel gelöscht' },
}
