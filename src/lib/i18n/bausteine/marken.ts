import type { Woerterbuch } from '../woerter'

/* Markieren, auswaehlen, verschieben und zusammenfuehren.
 *
 * Das gehoert zusammen: man waehlt Zeilen aus wie in einer Tabelle und
 * macht dann etwas mit allen auf einmal. Darum stehen die Woerter dafuer
 * auch in einem Baustein.
 */
export const marken: Woerterbuch = {
  /* ------------------------------------------------------- Markieren */
  'marken.titel': { de: 'Markieren' },
  'marken.markieren': { de: 'Markieren' },
  'marken.farbe': { de: 'Farbe' },
  'marken.symbol': { de: 'Zeichen' },
  'marken.ohne_farbe': { de: 'Keine Farbe' },
  'marken.ohne_symbol': { de: 'Kein Zeichen' },
  'marken.farbe_waehlen': { de: 'Farbe {farbe} wählen' },
  'marken.zebra_hinweis': {
    de: 'Eine Zeile bleibt heller, die nächste dunkler. Das gilt auch mit eigener Farbe, damit man beim Lesen die Spur nicht verliert.',
  },
  'marken.gesetzt': { de: 'Markierung gesetzt' },
  'marken.entfernt': { de: 'Markierung entfernt' },
  'marken.gehoert_der_zeile': {
    de: 'Die Markierung gehört dieser Zeile. Die Farbe des Zimmers bleibt, wie sie ist.',
  },

  'marken.symbol_stern': { de: 'Stern' },
  'marken.symbol_haken': { de: 'Haken' },
  'marken.symbol_achtung': { de: 'Achtung' },
  'marken.symbol_herz': { de: 'Herz' },
  'marken.symbol_flagge': { de: 'Flagge' },
  'marken.symbol_kreis': { de: 'Kreis' },
  'marken.symbol_blitz': { de: 'Blitz' },
  'marken.symbol_schloss': { de: 'Schloss' },

  /* ------------------------------------------------------- Auswaehlen */
  'auswahl.modus_an': { de: 'Auswählen' },
  'auswahl.modus_aus': { de: 'Auswahl beenden' },
  'auswahl.alle': { de: 'Alle' },
  'auswahl.keine': { de: 'Keine' },
  'auswahl.anzahl.eins': { de: '1 ausgewählt' },
  'auswahl.anzahl.viele': { de: '{n} ausgewählt' },
  'auswahl.nichts_gewaehlt': { de: 'Noch nichts ausgewählt' },
  'auswahl.zeile_waehlen': { de: 'Zeile auswählen' },
  'auswahl.hinweis': {
    de: 'Tippe die Zeilen an, die du meinst. Danach gilt jede Aktion für alle davon.',
  },

  /* ------------------------------------------------------ Verschieben */
  'verschieben.titel': { de: 'Verschieben' },
  'verschieben.zimmer': { de: 'In dieses Zimmer' },
  'verschieben.person': { de: 'Zu dieser Person' },
  'verschieben.unveraendert': { de: 'Nicht ändern' },
  'verschieben.abhaengen': { de: 'Abhängen' },
  'verschieben.code_hinweis': {
    de: 'Die Nummer wird neu vergeben, weil das Kürzel wechselt. Das alte Etikett bleibt scannbar.',
  },
  'verschieben.erledigt.eins': { de: '1 Kiste verschoben' },
  'verschieben.erledigt.viele': { de: '{n} Kisten verschoben' },
  'verschieben.teilweise': {
    de: '{ok} verschoben, {fehler} nicht. Grund: {grund}',
  },
  'verschieben.nichts_gewaehlt': {
    de: 'Wähle ein Zimmer oder eine Person aus.',
  },

  /* -------------------------------------------------- Zusammenfuehren */
  'zusammen.titel': { de: 'Bereiche zusammenführen' },
  'zusammen.knopf': { de: 'Zusammenführen' },
  'zusammen.ziel': { de: 'Alles kommt hierhin' },
  'zusammen.ziel_waehlen': { de: 'Ziel wählen' },
  'zusammen.warnung': {
    de: 'Alles aus {von} hängt danach an {nach}, und {von} verschwindet. Die Nummern werden neu vergeben, die alten Etiketten bleiben scannbar. Rückgängig geht das nicht.',
  },
  'zusammen.erledigt.eins': { de: '1 Eintrag umgehängt' },
  'zusammen.erledigt.viele': { de: '{n} Einträge umgehängt' },
  'zusammen.kein_ziel': {
    de: 'Es gibt keinen zweiten Bereich derselben Art.',
  },

  /* ------------------------------------------- Inhalt in andere Kiste */
  'inhalt.verschieben': { de: 'In andere Kiste' },
  'inhalt.ziel_waehlen': { de: 'In welche Kiste?' },
  'inhalt.verschoben': { de: '{text} liegt jetzt in {code}' },
  'inhalt.suche': { de: 'Nummer oder Titel suchen' },
  'inhalt.keine_kisten': { de: 'Keine andere Kiste gefunden.' },
}
