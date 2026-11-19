import type { Woerterbuch } from '../woerter'

/* Schichten in der Kiste und Punkte im Bild. Gehört zur Bilderkennung,
 * steht aber eigenständig, weil auch Fotos ohne Erkennung eine Schicht
 * haben dürfen. */
export const schichten: Woerterbuch = {
  'schichten.schicht': { de: 'Schicht' },
  'schichten.schicht_n': { de: 'Schicht {n}' },
  'schichten.ohne': { de: 'Ohne Schicht' },
  'schichten.waehlen': { de: 'Schicht für neue Fotos' },
  'schichten.hinweis': {
    de: 'Fotografiere die Kiste Lage für Lage. Schicht 1 ist oben, Schicht 2 liegt darunter. So weiß man später nicht nur was drin ist, sondern auch wie tief.',
  },
  'schichten.foto_schicht': { de: 'Schicht dieses Fotos' },
  'schichten.gesetzt': { de: 'Foto in Schicht {n}' },
  'schichten.entfernt': { de: 'Foto ohne Schicht' },

  // -------------------------------------------------------- Punkt im Bild
  'schichten.im_bild_zeigen': { de: 'Im Bild zeigen' },
  'schichten.frage': { de: 'Ist das der gesuchte Gegenstand?' },
  'schichten.ja': { de: 'Ja, das ist es' },
  'schichten.nein': { de: 'Nein, das ist es nicht' },
  'schichten.kein_punkt': {
    de: 'Zu diesem Eintrag gibt es keine Stelle im Bild.',
  },
  'schichten.bestaetigt': { de: 'Bestätigt' },
  'schichten.verneint': { de: 'Stimmt nicht' },
  'schichten.antwort_weg': { de: 'Antwort zurückgenommen' },

  // ------------------------------------------------ Rahmen und Ausschnitt
  'schichten.markieren': { de: 'Ding markieren' },
  'schichten.markieren_titel': { de: 'Ding im Bild markieren' },
  'schichten.markieren_name': { de: 'Wie heißt das Ding?' },
  'schichten.markiert': { de: 'Ding eingetragen' },
  'schichten.ziehen_hinweis': {
    de: 'Zieh mit dem Finger einen Rahmen um das Ding.',
  },
  'schichten.rahmen_neu': { de: 'Rahmen neu ziehen' },
  'schichten.rahmen_ziehen': { de: 'Rahmen ziehen' },
  'schichten.rahmen_gespeichert': { de: 'Rahmen gespeichert' },
  'schichten.ausschnitt_fehlt.eins': {
    de: 'Ein Ausschnitt konnte nicht angelegt werden. Der Eintrag steht trotzdem in der Liste.',
  },
  'schichten.ausschnitt_fehlt.viele': {
    de: '{n} Ausschnitte konnten nicht angelegt werden. Die Einträge stehen trotzdem in der Liste.',
  },
}
