import type { Woerterbuch } from '../woerter'

/* Texte der Etikettenseite (pages/Labels.tsx, components/etikett).
 *
 * Auf dem Etikett selbst steht fast nur, was der Nutzer eingetippt hat:
 * Bereich, Titel, Inhalt, Lagername. Uebersetzt ist nur "+ n weitere" und
 * der Platz im Regal. Die Nummer steht, wie die Datenbank sie vergibt. */
export const etiketten: Woerterbuch = {
  'etiketten.titel': { de: 'Etiketten' },
  'etiketten.vorschau': { de: 'Vorschau' },

  // ------------------------------------------------- Kisten oder Tür
  'etiketten.ansicht': { de: 'Was drucken' },
  'etiketten.ansicht_kisten': { de: 'Kisten' },
  'etiketten.ansicht_tuer': { de: 'Tür-Etikett' },

  // ------------------------------------------------- Format
  'etiketten.format': { de: 'Format' },
  'etiketten.gruppe_einzel': { de: 'Ein Etikett pro Blatt' },
  'etiketten.gruppe_raster': { de: 'Bogen auf A4' },
  'etiketten.format_einzel': { de: '{name} . {b} x {h} mm' },
  'etiketten.format_raster': { de: '{s} x {z} Etiketten . je {b} x {h} mm' },
  'etiketten.format_mini': { de: '{s} x {z} Mini . nur Nummer und QR . {b} x {h} mm' },
  'etiketten.ausrichtung': { de: 'Ausrichtung' },
  'etiketten.hoch': { de: 'Hochformat' },
  'etiketten.quer': { de: 'Querformat' },
  'etiketten.raster_hoch': { de: 'Der Bogen liegt immer im Hochformat.' },

  // ------------------------------------------------- Auswahl
  'etiketten.welche': { de: 'Welche Kisten' },
  'etiketten.sel_alle': { de: 'Alle' },
  'etiketten.sel_bereich': { de: 'Bereich' },
  'etiketten.sel_einzeln': { de: 'Auswahl' },
  'etiketten.bereich_waehlen': { de: 'Bereich wählen' },
  'etiketten.ohne_bereich': { de: 'Ohne Bereich' },
  'etiketten.suche': { de: 'Kiste suchen' },
  'etiketten.suche_leer': { de: 'Keine Kiste gefunden.' },
  'etiketten.alle_anhaken': { de: 'Alle' },
  'etiketten.keine_anhaken': { de: 'Keine' },
  'etiketten.n_angehakt': { de: '{n} angehakt' },

  // ------------------------------------------------- Schalter
  'etiketten.schalter_inhalt': { de: 'Inhalt zeigen' },
  'etiketten.schalter_platz': { de: 'Platz zeigen' },
  'etiketten.schalter_lager': { de: 'Lager zeigen' },
  'etiketten.schalter_rahmen': { de: 'Rahmen' },

  // ------------------------------------------------- Vorschau und Druck
  'etiketten.zoom_fit': { de: 'Einpassen' },
  'etiketten.zoom_halb': { de: '50 %' },
  'etiketten.zoom_voll': { de: '100 %' },
  'etiketten.keine_auswahl': { de: 'Noch keine Etiketten ausgewählt.' },
  'etiketten.anzahl.eins': { de: '{n} Etikett' },
  'etiketten.anzahl.viele': { de: '{n} Etiketten' },
  'etiketten.seiten.eins': { de: '{n} Seite' },
  'etiketten.seiten.viele': { de: '{n} Seiten' },
  'etiketten.zusammen': { de: '{etiketten} auf {seiten}' },
  'etiketten.druck_hinweis': {
    de: 'Das Format {format} ist im Druckdialog schon eingestellt. Für eine PDF-Datei dort "Als PDF speichern" wählen.',
  },

  // ------------------------------------------------- Zustände
  'etiketten.laden': { de: 'Kisten werden geladen' },
  'etiketten.nichts': { de: 'Nichts zu drucken' },
  'etiketten.nichts_keine_kisten': { de: 'Es gibt noch keine Kisten. Lege zuerst eine an.' },
  'etiketten.nichts_auswahl': { de: 'Zu dieser Auswahl gibt es keine Kisten. Ändere die Auswahl links.' },
  'etiketten.platz_laedt': { de: 'Plätze werden geladen' },
  'etiketten.platz_fehler': { de: 'Die Plätze konnten nicht geladen werden: {grund}' },

  // ------------------------------------------------- Auf dem Etikett
  'etiketten.weitere': { de: '+ {n} weitere' },
  'etiketten.platz_fach': { de: '{name}, Fach {ebene}/{spalte}' },
  'etiketten.platz_fach_eine': { de: '{name}, Fach {ebene}' },
  'etiketten.platz_auf_kiste': { de: 'auf {code}' },
  'etiketten.platz_boden': { de: '{raum}, Boden' },
}
