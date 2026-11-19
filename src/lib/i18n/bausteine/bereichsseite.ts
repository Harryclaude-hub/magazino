import type { Woerterbuch } from '../woerter'

/* Die eigene Seite eines Zimmers oder einer Person.
 * Sie oeffnet sich wie eine Akte: oben das Kuerzel und die Farbe, darunter
 * alles, was zu diesem Bereich gehoert. */
export const bereichsseite: Woerterbuch = {
  'bereichsseite.laedt': { de: 'Bereich wird geladen' },
  'bereichsseite.nicht_gefunden': {
    de: 'Diesen Bereich gibt es in diesem Umzug nicht.',
  },
  'bereichsseite.zurueck': { de: 'Zu den Bereichen' },

  'bereichsseite.kisten': { de: 'Kisten in diesem Bereich' },
  'bereichsseite.moebel': { de: 'Möbel in diesem Zimmer' },
  'bereichsseite.keine_kisten': { de: 'Noch keine Kisten hier' },
  'bereichsseite.keine_kisten_hinweis': {
    de: 'Neue Kisten bekommen das Kürzel dieses Bereichs in ihrer Nummer.',
  },
  'bereichsseite.keine_moebel': { de: 'Noch keine Möbel hier' },
  'bereichsseite.kiste_anlegen': { de: 'Kiste hier anlegen' },
  'bereichsseite.moebel_anlegen': { de: 'Möbel hier anlegen' },
  'bereichsseite.alle_zeigen': { de: 'Alle in der Kistenliste zeigen' },
  'bereichsseite.etiketten': { de: 'Etiketten für diesen Bereich' },

  'bereichsseite.personen_hier': { de: 'Personen mit Kisten hier' },
  'bereichsseite.zimmer_dieser_person': { de: 'Zimmer dieser Person' },
  'bereichsseite.ohne_zimmer': { de: 'Ohne Zimmer' },
  'bereichsseite.ohne_person': { de: 'Ohne Person' },

  'bereichsseite.fortschritt': {
    de: '{a} von {b} angekommen',
  },
  'bereichsseite.zahl_unbekannt': {
    de: 'Anzahl unbekannt',
  },
  'bereichsseite.zahlen_laden': { de: 'Zahlen werden geladen' },
  'bereichsseite.zaehlwerte_fehler': {
    de: 'Zählwerte konnten nicht geladen werden.',
  },
  // Kisten dieses Zimmers ohne Platz im Grundriss (Etappe 3).
  'bereichsseite.ohne_platz': { de: 'Noch ohne Platz im Grundriss' },
  'bereichsseite.ohne_platz_hinweis': {
    de: 'Tippe eine Kiste an und stell sie hin. Danach kommt die nächste.',
  },
}
