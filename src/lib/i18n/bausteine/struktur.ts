import type { Woerterbuch } from '../woerter'

/* Bundeslandprojekte, Lagerliste, Verlauf, Navigation (E104). Schluessel struktur.*
 * Bewusst kurz: ein Wort, wo ein Wort genuegt. */
export const struktur: Woerterbuch = {
  // ------------------------------------------------------------ Navigation
  'struktur.start': { de: 'Start' },
  'struktur.verlauf': { de: 'Verlauf' },
  'struktur.einstellungen': { de: 'Einstellungen' },
  'struktur.menue': { de: 'Menü' },

  // ------------------------------------------------- Bundeslandprojekte
  'struktur.lager_anzahl.eins': { de: '{n} Lager' },
  'struktur.lager_anzahl.viele': { de: '{n} Lager' },
  'struktur.kein_zugang': {
    de: 'Du hast noch keinen Zugang. Sag es dem Admin.',
  },
  'struktur.bl_neu': { de: 'Neues Bundeslandprojekt' },
  'struktur.bl_name_platzhalter': { de: 'Oberösterreich' },
  'struktur.bl_leer': { de: 'Noch kein Bundeslandprojekt' },
  'struktur.bl_fehlt': {
    de: 'Das gibt es nicht, oder du hast keinen Zugang.',
  },
  'struktur.bl_angelegt': { de: 'Angelegt' },
  'struktur.bl_umbenannt': { de: 'Umbenannt' },
  'struktur.bl_geloescht': { de: 'Gelöscht' },
  'struktur.umbenennen': { de: 'Umbenennen' },
  'struktur.bl_loeschen_frage': {
    de: '„{name}“ löschen? Das lässt sich nicht rückgängig machen.',
  },
  'struktur.lager_neu': { de: 'Neues Lager' },
  'struktur.lager_name_platzhalter': { de: 'Lager Linz' },
  'struktur.lager_leer': { de: 'Noch kein Lager' },
  'struktur.lager_angelegt': { de: 'Lager angelegt' },

  // ------------------------------------------------------------- Verlauf
  'struktur.gerade_drin': { de: 'Gerade drin' },
  'struktur.niemand_drin': { de: 'Niemand' },
  'struktur.filter_ein_aus': { de: 'Ein/Aus' },
  'struktur.filter_entnommen': { de: 'Entnommen' },
  'struktur.filter_ausgeliehen': { de: 'Ausgeliehen' },
  'struktur.verlauf_leer': { de: 'Noch nichts passiert' },
  'struktur.verlauf_leer_filter': { de: 'Nichts in dieser Auswahl' },
  'struktur.verlauf_laedt': { de: 'Verlauf lädt' },
  'struktur.art.betreten': { de: 'Betreten' },
  'struktur.art.verlassen': { de: 'Verlassen' },
  'struktur.art.entnahme': { de: 'Entnommen' },
  'struktur.art.zugang': { de: 'Gebracht' },
  'struktur.art.ausleihe': { de: 'Ausgeliehen' },
  'struktur.art.rueckgabe': { de: 'Zurückgebracht' },
  'struktur.art.korrektur': { de: 'Korrektur' },
  'struktur.art.entfernt': { de: 'Entfernt' },
  'struktur.art.admin': { de: 'Admin' },
  'struktur.art.sonst': { de: 'Eintrag' },
}
