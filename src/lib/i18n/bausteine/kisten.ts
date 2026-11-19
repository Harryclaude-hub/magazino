import type { Woerterbuch } from '../woerter'

/* Kistenliste und Kistenansicht.
 *
 * Jeder Schluessel beginnt mit kisten., damit sich nichts mit einem anderen
 * Baustein ueberschneidet. Status, Kistenart und die Groessenwoerter stehen
 * schon in gemeinsam.ts und werden von hier aus nur benutzt.
 *
 * Seriennummern und Kuerzel bleiben immer unveraendert, sie stehen nur als
 * Platzhalter in den Texten.
 */
export const kisten: Woerterbuch = {
  // ----------------------------------------------------- Suche und Filter
  'kisten.suche_platzhalter': { de: 'Code, Titel oder Notiz' },
  'kisten.suche_leeren': { de: 'Suche leeren' },
  'kisten.filter_gesetzt': { de: 'Filter, {n} gesetzt' },
  'kisten.filter_oeffnen': { de: 'Filter öffnen' },
  'kisten.filter_schliessen': { de: 'Filter schließen' },
  'kisten.filter_zuruecksetzen': { de: 'Filter zurücksetzen' },
  'kisten.alle_zimmer': { de: 'Alle Zimmer' },
  'kisten.alle_personen': { de: 'Alle Personen' },
  // Die Kisten, denen die Zuordnung fehlt. Sie sollen auffindbar sein,
  // nicht unsichtbar zwischen den anderen stehen.
  'kisten.ohne_zimmer': { de: 'Ohne Zimmer' },
  'kisten.ohne_person': { de: 'Ohne Person' },
  'kisten.ohne_zimmer_anzahl.eins': {
    de: '{n} Kiste hat kein Zimmer',
  },
  'kisten.ohne_zimmer_anzahl.viele': {
    de: '{n} Kisten haben kein Zimmer',
  },
  'kisten.ohne_zimmer_zeigen': { de: 'Anzeigen' },
  'kisten.zimmer_regel': {
    de: 'Jede Kiste gehört in ein Zimmer. Eine Person kommt freiwillig dazu.',
  },
  'kisten.sortierung': { de: 'Sortierung' },
  'kisten.sort_code': { de: 'Nach Nummer' },
  'kisten.sort_neueste': { de: 'Neueste zuerst' },
  'kisten.sort_groesste': { de: 'Größte zuerst' },

  // -------------------------------------------------------------- Liste
  'kisten.laedt': { de: 'Kisten werden geladen' },
  'kisten.leer_titel': { de: 'Noch keine Kiste' },
  'kisten.leer_hinweis': {
    de: 'Lege die erste Kiste an. Die Nummer vergibt Magazino selbst.',
  },
  'kisten.leer_filter': {
    de: 'Zu diesem Filter passt gerade nichts. Setz den Filter zurück.',
  },
  'kisten.leer_suche': {
    de: 'Zu dieser Suche passt gerade keine Kiste. Leere die Suche.',
  },
  'kisten.erste': { de: 'Erste Kiste' },
  'kisten.nach_ziel': { de: 'nach {ziel}' },
  'kisten.geladen_von': { de: '{a} von {b} geladen' },
  'kisten.alle_geladen': { de: 'Alle {n} Kisten geladen' },

  // ------------------------------------------------------------ Groesse
  'kisten.groesse_knopf': { de: 'Größe {n}, {wort}' },
  'kisten.eigene_hoehe': { de: 'Eigene Höhe in cm' },
  'kisten.eigene_hoehe_hinweis': {
    de: 'Leer lassen, dann gilt die typische Höhe der Größe: {h} cm. Nur für Kisten, die anders hoch sind, etwa eine Kleiderbox.',
  },
  'kisten.eigene_hoehe_fehler': {
    de: 'Erlaubt sind 5 bis 300 cm.',
  },
  'kisten.groesse_knopf_liter': { de: 'Größe {n}, {liter} Liter' },
  'kisten.art_und_satz': { de: '{art}, {groesse}' },
  'kisten.groesse_hinweis': {
    de: 'Die Ziffer steht rot mitten in der Nummer.',
  },

  // ------------------------------------------------------- Neue Kiste
  'kisten.neu': { de: 'Neue Kiste' },
  'kisten.anzahl_anlegen': { de: '{n} anlegen' },
  'kisten.nummer_wird': { de: 'Die Nummer wird' },
  'kisten.nummer_hinweis': {
    de: 'Die letzten drei Ziffern vergibt Magazino selbst.',
  },
  'kisten.kein_zimmer': { de: 'kein Zimmer' },
  'kisten.keine_person': { de: 'keine Person' },
  'kisten.kuerzel_frage': { de: 'Welches Kürzel steht vorne?' },
  'kisten.kuerzel_hinweis': {
    de: 'Eine Kiste kann zu einem Zimmer und einer Person gehören. Die Nummer beginnt aber mit genau einem Kürzel.',
  },
  'kisten.kuerzel_zimmer': { de: '{kuerzel} . Zimmer' },
  'kisten.kuerzel_person': { de: '{kuerzel} . Person' },
  'kisten.art': { de: 'Art' },
  'kisten.titel_hinweis': {
    de: 'Optional, zum Beispiel Bücher Regal links.',
  },
  'kisten.ziel': { de: 'Ziel in der neuen Wohnung' },
  'kisten.ziel_platzhalter': { de: 'Arbeitszimmer oben' },
  'kisten.anzahl': { de: 'Anzahl' },
  'kisten.anzahl_hinweis': {
    de: 'Mehrere gleiche Kisten auf einmal anlegen, maximal 50.',
  },
  'kisten.zerbrechlich_hinweis': {
    de: 'Wird auf dem Etikett hervorgehoben.',
  },
  'kisten.fehler_kein_tag': {
    de: 'Wähle mindestens ein Zimmer oder eine Person.',
  },
  'kisten.angelegt': { de: '{code} angelegt' },
  // Erfolgsblatt nach dem Anlegen: gleich im Zimmer hinstellen (Etappe 3).
  'kisten.angelegt_blatt': { de: '{code} angelegt' },
  'kisten.angelegt_blatt_viele': { de: '{n} Kisten angelegt' },
  'kisten.angelegt_frage': {
    de: 'Stell sie gleich im Zimmer hin. Dann zeigt der Plan später, wo sie steht.',
  },
  'kisten.im_zimmer_platzieren': { de: 'Im Zimmer platzieren' },
  'kisten.nacheinander': { de: 'Nacheinander hinstellen' },
  'kisten.reihe_abgebrochen': {
    de: '{n} Kisten sind angelegt und stehen in der Liste. Danach ging es nicht weiter: {grund}',
  },
  'kisten.mehrere_angelegt': {
    de: '{n} Kisten angelegt, {von} bis {bis}',
  },
  'kisten.ist_angekommen': { de: '{code} ist angekommen' },

  // ---------------------------------------------------------- CSV-Datei
  'kisten.csv_code': { de: 'Code' },
  'kisten.ja': { de: 'ja' },
  'kisten.nein': { de: 'nein' },
  'kisten.nichts_zu_exportieren': {
    de: 'Es gibt noch nichts zu exportieren.',
  },
  'kisten.exportiert': { de: '{n} Kisten exportiert' },

  // ------------------------------------------------------- Kistenansicht
  'kisten.kiste_laedt': { de: 'Kiste wird geladen' },
  'kisten.nicht_gefunden': { de: 'Diese Kiste gibt es nicht mehr.' },
  'kisten.zur_liste': { de: 'Zur Kistenliste' },
  'kisten.bearbeiten': { de: 'Kiste bearbeiten' },
  'kisten.loeschen': { de: 'Kiste löschen' },
  'kisten.art_und_groesse': {
    de: '{art}, Größe {n} von 10, {wort}',
  },
  'kisten.ohne_zuordnung': { de: 'Ohne Zimmer und Person' },
  'kisten.ohne_zuordnung_hinweis': {
    de: 'Beides lässt sich beim Bearbeiten setzen.',
  },
  'kisten.zerbrechlich_warnung': {
    de: 'Zerbrechlich, bitte vorsichtig tragen',
  },
  'kisten.link_kopieren': { de: 'Link kopieren' },
  'kisten.link_kopiert': { de: 'Link kopiert' },
  'kisten.kopieren_fehler': { de: 'Kopieren nicht möglich: {grund}' },
  'kisten.druckansicht': { de: 'Druckansicht' },
  'kisten.angekommen_am': { de: 'Angekommen: {wann}' },

  // ------------------------------------------------------------- Inhalt
  'kisten.inhalt_leer': {
    de: 'Noch nichts eingetragen. Was hier steht, landet auf Wunsch mit auf dem Etikett.',
  },
  'kisten.abhaken': { de: 'Abhaken' },
  'kisten.haken_entfernen': { de: 'Haken entfernen' },
  'kisten.eintrag_loeschen': { de: 'Eintrag löschen' },
  'kisten.eintrag_hinzufuegen': { de: 'Eintrag hinzufügen' },
  'kisten.inhalt_platzhalter': { de: 'Was ist drin?' },

  // -------------------------------------------------------------- Fotos
  'kisten.foto': { de: 'Foto' },
  'kisten.foto_aufnehmen': { de: 'Foto aufnehmen' },
  'kisten.foto_alt': { de: 'Foto der Kiste' },
  'kisten.zum_deckbild': { de: 'Zum Deckbild machen' },
  'kisten.deckbild_ab': { de: 'Deckbild abgenommen' },
  'kisten.foto_loeschen': { de: 'Foto löschen' },
  'kisten.fotos_leer': { de: 'Noch kein Foto vom Inhalt' },
  'kisten.fotos_hinweis': {
    de: 'Bilder lassen sich hierher ziehen oder mit Strg und V einfügen.',
  },
  'kisten.hier_ablegen': { de: 'Bilder hier ablegen' },
  'kisten.bild': { de: 'Bild' },
  'kisten.bild_fehlt': { de: 'Bild nicht ladbar' },
  'kisten.fotos_fehlen.eins': {
    de: 'Ein Foto lässt sich gerade nicht laden.',
  },
  'kisten.fotos_fehlen.viele': {
    de: '{n} Fotos lassen sich gerade nicht laden.',
  },
  'kisten.fotos_hinzugefuegt.eins': { de: 'Ein Foto hinzugefügt' },
  'kisten.fotos_hinzugefuegt.viele': { de: '{n} Fotos hinzugefügt' },
  'kisten.kein_bild.eins': {
    de: 'Eine Datei war kein Bild und wurde übersprungen',
  },
  'kisten.kein_bild.viele': {
    de: '{n} Dateien waren kein Bild und wurden übersprungen',
  },
  'kisten.upload_fehler': { de: 'Nicht hochgeladen: {liste}' },

  // ------------------------------------------------------------ Verlauf
  'kisten.verlauf_laedt': { de: 'Verlauf wird geladen' },
  'kisten.verlauf_leer': { de: 'Noch nichts passiert.' },
  'kisten.jemand': { de: 'Jemand' },
  'kisten.ev_created': { de: 'hat die Kiste angelegt' },
  'kisten.ev_status': { de: 'hat {status} gesetzt' },
  'kisten.ev_scan': { de: 'hat gescannt' },
  'kisten.ev_code': { de: 'hat den Code geändert:' },
  'kisten.ev_menge': { de: 'hat die Menge geändert:' },
  'kisten.ev_umgepackt': { de: 'hat umgepackt:' },
  'kisten.alter_jetzt': { de: 'gerade eben' },
  'kisten.alter_min.eins': { de: 'vor einer Minute' },
  'kisten.alter_min.viele': { de: 'vor {n} Min.' },
  'kisten.alter_std.eins': { de: 'vor einer Stunde' },
  'kisten.alter_std.viele': { de: 'vor {n} Std.' },
  'kisten.alter_tage.eins': { de: 'gestern' },
  'kisten.alter_tage.viele': { de: 'vor {n} Tagen' },
  'kisten.alter_wochen.eins': { de: 'vor einer Woche' },
  'kisten.alter_wochen.viele': { de: 'vor {n} Wochen' },
  'kisten.alter_monate.eins': { de: 'vor einem Monat' },
  'kisten.alter_monate.viele': { de: 'vor {n} Monaten' },
  'kisten.alter_jahre.eins': { de: 'vor einem Jahr' },
  'kisten.alter_jahre.viele': { de: 'vor {n} Jahren' },
  'kisten.eingetragen': { de: 'Eingetragen {wann}' },
  'kisten.geaendert_menge': { de: 'Menge geändert {wann}' },
  'kisten.geaendert_text': { de: 'Umbenannt {wann}' },
  'kisten.geaendert_kiste': { de: 'Umgepackt {wann}' },
  'kisten.foto_alter': { de: 'Foto {wann}' },
  'kisten.foto_vom': { de: 'Foto aufgenommen am {datum}' },
  'kisten.foto_hochgeladen': {
    de: 'Aufnahmedatum unbekannt, hochgeladen am {datum}',
  },
  'kisten.menge': { de: 'Menge' },
  'kisten.menge_weniger': { de: 'Eins weniger' },
  'kisten.menge_mehr': { de: 'Eins mehr' },
  'kisten.menge_gespeichert': { de: '{text}: jetzt {n}' },

  // --------------------------------------------------- Bearbeiten und Loeschen
  'kisten.code_hinweis': {
    de: 'Änderst du Größe oder Kürzel, vergibt Magazino einen neuen Code. Der alte bleibt gespeichert, damit ein schon geklebtes Etikett weiter gefunden wird.',
  },
  'kisten.kuerzel_im_code': { de: 'Kürzel im Code' },
  'kisten.kuerzel_option_zimmer': { de: 'Zimmer ({kuerzel})' },
  'kisten.kuerzel_option_person': { de: 'Person ({kuerzel})' },
  'kisten.loeschen_titel': { de: '{code} löschen' },
  'kisten.loeschen_text': {
    de: 'Die Kiste, ihr Inhalt, die Fotos und der Verlauf werden gelöscht. Das lässt sich nicht rückgängig machen.',
  },
  'kisten.geloescht': { de: 'Kiste gelöscht' },

  // ------------------------------------------- Eigene Groessen (0027)
  'kisten.eigene_groesse': { de: 'Eigene Größe' },
  'kisten.eigene_hoehe_durch_groesse': {
    de: 'Die Höhe kommt aus der eigenen Größe.',
  },
  'kisten.zimmer_waehlen_pflicht': { de: 'Bitte ein Zimmer wählen' },

  // ------------------------------------- Tabelle und Vorschau am Computer
  'kisten.spalte_nummer': { de: 'Nummer' },
  'kisten.spalte_platz': { de: 'Platz' },
  'kisten.platz_nein': { de: 'noch offen' },
  'kisten.platz_auf_kiste': { de: 'auf einer Kiste' },
  'kisten.sortieren_nach': { de: 'Sortieren nach {spalte}' },
  'kisten.sortiert_geladene': {
    de: 'Sortiert werden die {n} geladenen Einträge.',
  },
  'kisten.vorschau_leer': { de: 'Wähle eine Kiste aus der Liste.' },
  'kisten.oeffnen': { de: 'Kiste öffnen' },
  'kisten.vorschau_schliessen': { de: 'Vorschau schließen' },
}
