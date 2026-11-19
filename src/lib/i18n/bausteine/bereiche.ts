import type { Woerterbuch } from '../woerter'

/* Seite Bereiche: Zimmer und Personen mit Kuerzel und Farbe.
 * Namen, Kuerzel und Notizen der Nutzer bleiben unveraendert, hier stehen
 * nur die Texte der Oberflaeche. */
export const bereiche: Woerterbuch = {
  // ------------------------------------------------------------- Kopfzeile
  'bereiche.untertitel': {
    de: 'Zimmer und Personen mit Kürzel und Farbe',
  },
  'bereiche.erklaerung': {
    de: 'Das Kürzel steht vorne auf jeder Nummer. Wohnzimmer mit dem Kürzel W ergibt Kisten wie W-3-001. Jedes Kürzel darf es in diesem Umzug nur einmal geben, egal ob Zimmer oder Person.',
  },

  // -------------------------------------------------------------- Abschnitte
  'bereiche.zimmer_titel': { de: 'Zimmer und Bereiche' },
  'bereiche.leer_zimmer_titel': { de: 'Noch kein Zimmer' },
  'bereiche.leer_zimmer_hinweis': {
    de: 'Wohnzimmer, Küche, Keller. Jedes bekommt ein Kürzel und eine Farbe.',
  },
  'bereiche.leer_person_titel': { de: 'Noch keine Person' },
  'bereiche.leer_person_hinweis': {
    de: 'Wem gehört die Kiste? Personen bekommen genau wie Zimmer ein Kürzel.',
  },

  // ------------------------------------------------------------- Kistenzahl
  'bereiche.anzahl_fehlt': { de: 'Anzahl nicht geladen' },
  'bereiche.wird_gezaehlt': { de: 'wird gezählt' },
  'bereiche.anzahl_fehler': {
    de: 'Die Anzahl der Kisten konnte nicht geladen werden. {grund}',
  },

  // ------------------------------------------------------------- Zeile
  'bereiche.bearbeiten_label': { de: '{name} bearbeiten' },
  'bereiche.loeschen_label': { de: '{name} löschen' },

  // ------------------------------------------------------------- Farbwahl
  'bereiche.farbe_waehlen': { de: 'Farbe {farbe}' },
  'bereiche.eigene_farbe': { de: 'Eigene Farbe' },

  // --------------------------------------------------------------- Dialog
  'bereiche.dialog_bearbeiten': { de: 'Bereich bearbeiten' },
  'bereiche.dialog_neues_zimmer': { de: 'Neues Zimmer' },
  'bereiche.dialog_neue_person': { de: 'Neue Person' },
  'bereiche.name_platzhalter_zimmer': { de: 'Kinderzimmer' },
  'bereiche.name_platzhalter_person': { de: 'Sara' },
  'bereiche.kuerzel_hinweis': {
    de: '1 bis 4 Zeichen. Steht vorne auf jeder Kistennummer.',
  },
  // Das Kuerzel besteht immer aus lateinischen Zeichen, darum bleibt der
  // Platzhalter in beiden Sprachen gleich.
  'bereiche.kuerzel_platzhalter': { de: 'KZ' },
  'bereiche.farbe_hinweis': {
    de: 'Wird auf dem Etikett als Balken gedruckt.',
  },
  'bereiche.notiz_hinweis': {
    de: 'Optional, zum Beispiel wohin es in der neuen Wohnung soll.',
  },
  'bereiche.vorschau': { de: 'So sieht die Nummer aus' },

  // ---------------------------------------------------------- Pruefung
  'bereiche.fehler_name': { de: 'Name fehlt.' },
  'bereiche.fehler_kuerzel': {
    de: 'Das Kürzel darf 1 bis 4 Buchstaben oder Ziffern haben.',
  },
  'bereiche.fehler_kuerzel_belegt': {
    de: 'Das Kürzel {kuerzel} gehört schon zu {name}.',
  },

  // ---------------------------------------------------------------- Meldungen
  'bereiche.gespeichert': { de: 'Bereich gespeichert' },
  'bereiche.angelegt': { de: 'Bereich angelegt' },
  'bereiche.geloescht': { de: 'Bereich gelöscht' },

  // ------------------------------------------------------------ Loeschabfrage
  'bereiche.loeschen_titel': { de: '{name} löschen' },
  'bereiche.loeschen_unbekannt': {
    de: 'Wie viele Kisten zu diesem Bereich gehören, ist gerade nicht bekannt. Die Kisten bleiben bestehen, verlieren aber die Zuordnung und behalten ihren bisherigen Code. Wirklich löschen?',
  },
  'bereiche.loeschen_mit_kisten': {
    de: 'Dieser Bereich hat {kisten}. Die Kisten bleiben bestehen, verlieren aber die Zuordnung und behalten ihren bisherigen Code. Wirklich löschen?',
  },
  'bereiche.loeschen_leer': {
    de: 'Der Bereich wird entfernt. Das lässt sich nicht rückgängig machen.',
  },
}
