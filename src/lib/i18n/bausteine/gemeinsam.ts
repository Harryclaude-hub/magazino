import type { Woerterbuch } from '../woerter'

/* Texte, die an vielen Stellen vorkommen: Navigation, Knoepfe, Zustaende,
 * Status, Rollen, Groessen. Seitenspezifisches gehoert in den jeweiligen
 * Baustein, nicht hierher. */
export const gemeinsam: Woerterbuch = {
  // ------------------------------------------------------------ Navigation
  'nav.umzuege': { de: 'Start' },
  'nav.kisten': { de: 'Kisten' },
  'nav.scannen': { de: 'Scannen' },
  'nav.chat': { de: 'Chat' },
  'nav.profil': { de: 'Profil' },
  'nav.uebersicht': { de: 'Übersicht' },
  'menue.umzug': { de: 'Menü' },
  'leiste.zimmer': { de: 'Zimmer' },
  'leiste.grundriss': { de: 'Grundriss' },
  'leiste.umzug': { de: 'Lager' },
  'leiste.umzug_waehlen': { de: 'Lager wählen' },
  'leiste.keine_umzuege': { de: 'Noch kein Lager' },
  'leiste.umzuege_fehler': { de: 'Lager nicht geladen' },
  'leiste.einklappen': { de: 'Leiste einklappen' },
  'leiste.aufklappen': { de: 'Leiste aufklappen' },
  'leiste.suche_platzhalter': { de: 'In allen Lagern suchen' },

  // --------------------------------------------------------------- Aktionen
  'aktion.speichern': { de: 'Speichern' },
  'aktion.abbrechen': { de: 'Abbrechen' },
  'aktion.loeschen': { de: 'Löschen' },
  'aktion.entfernen': { de: 'Entfernen' },
  'aktion.schliessen': { de: 'Schließen' },
  'nav.suchen': { de: 'Suchen' },
  'aktion.ausblenden': { de: 'Ausblenden' },
  'aktion.zurueck': { de: 'Zurück' },
  'aktion.anlegen': { de: 'Anlegen' },
  'aktion.bearbeiten': { de: 'Bearbeiten' },
  'aktion.kopieren': { de: 'Kopieren' },
  'aktion.teilen': { de: 'Teilen' },
  'aktion.suchen': { de: 'Suchen' },
  'aktion.neu': { de: 'Neu' },
  'aktion.fertig': { de: 'Fertig' },
  'aktion.weiter': { de: 'Weiter' },
  'aktion.alle': { de: 'Alle' },
  'aktion.filter': { de: 'Filter' },
  'aktion.drucken': { de: 'Drucken' },
  'aktion.exportieren': { de: 'Als CSV exportieren' },
  'aktion.nochmal': { de: 'Nochmal versuchen' },
  'aktion.mehr_laden': { de: 'Weitere laden' },

  // -------------------------------------------------------------- Zustaende
  'zustand.laedt': { de: 'Lädt' },
  'zustand.moment': { de: 'Moment' },
  'zustand.fehler': { de: 'Das hat nicht geklappt' },
  'zustand.nichts_gefunden': { de: 'Nichts gefunden' },
  'zustand.unbekannter_fehler': { de: 'Unbekannter Fehler' },

  // ---------------------------------------------------------------- Begriffe
  'begriff.umzug': { de: 'Lager' },
  'begriff.zimmer': { de: 'Zimmer' },
  'begriff.person': { de: 'Person' },
  'begriff.personen': { de: 'Personen' },
  'begriff.bereich': { de: 'Bereich' },
  'begriff.bereiche': { de: 'Bereiche' },
  'begriff.kiste': { de: 'Kiste' },
  'begriff.groesse': { de: 'Größe' },
  'begriff.kuerzel': { de: 'Kürzel' },
  'begriff.farbe': { de: 'Farbe' },
  'begriff.name': { de: 'Name' },
  'begriff.notiz': { de: 'Notiz' },
  'begriff.titel': { de: 'Titel' },
  'begriff.status': { de: 'Status' },
  'begriff.inhalt': { de: 'Inhalt' },
  'begriff.fotos': { de: 'Fotos' },
  'begriff.verlauf': { de: 'Verlauf' },
  'begriff.mitglieder': { de: 'Mitglieder' },
  'begriff.zerbrechlich': { de: 'Zerbrechlich' },
  'begriff.ziel': { de: 'Ziel' },
  'begriff.optional': { de: 'Optional' },
  'begriff.kisten_anzahl.eins': { de: '{n} Kiste' },
  'begriff.kisten_anzahl.viele': { de: '{n} Kisten' },
  'begriff.mitglieder_anzahl.eins': { de: '{n} Mitglied' },
  'begriff.mitglieder_anzahl.viele': { de: '{n} Mitglieder' },
  'begriff.eintraege.eins': { de: '{n} Eintrag' },
  'begriff.eintraege.viele': { de: '{n} Einträge' },

  // ------------------------------------------------------------------ Status
  'status.open': { de: 'Alte Wohnung' },
  'status.transit': { de: 'Unterwegs' },
  'status.arrived': { de: 'Angekommen' },
  'status.angekommen_von': { de: '{a} von {b} angekommen' },

  // --------------------------------------------------------------- Kistenart
  'art.box': { de: 'Kiste' },
  'art.furniture': { de: 'Möbelstück' },
  'art.bag': { de: 'Tasche' },
  'art.other': { de: 'Gegenstand' },

  // ------------------------------------------------------------------ Rollen
  'rolle.owner': { de: 'Besitzer' },
  'rolle.editor': { de: 'Bearbeiter' },
  'rolle.viewer': { de: 'Nur lesen' },

  // ---------------------------------------------------------------- Groessen
  'groesse.1': { de: 'winzig' },
  'groesse.2': { de: 'sehr klein' },
  'groesse.3': { de: 'klein' },
  'groesse.4': { de: 'eher klein' },
  'groesse.5': { de: 'mittel' },
  'groesse.6': { de: 'eher groß' },
  'groesse.7': { de: 'groß' },
  'groesse.8': { de: 'sehr groß' },
  'groesse.9': { de: 'riesig' },
  'groesse.10': { de: 'sperrig' },
  'groesse.von_zehn': { de: 'Größe {n} von 10, {wort}' },
  // Liter statt Wort, fuer alles ausser Moebeln. Die Zahlen kommen aus der
  // Datenbank (0021), hier steht nur der Satz.
  'groesse.von_zehn_liter': {
    de: 'Größe {n} von 10, {liter} Liter',
  },
  'groesse.liter_kurz': { de: '{liter} l' },
  'groesse.mass': {
    de: 'typisch etwa {l} × {b} × {h} cm',
  },

  // ------------------------------------------- Von ui.tsx direkt gebraucht
  'konto.passwort_anzeigen': { de: 'Passwort anzeigen' },
  'konto.passwort_verbergen': { de: 'Passwort verbergen' },

  // -------------------------------------------------------------- Fuellstand
  'fuellstand.titel': { de: 'Füllstand' },
  // Kurz fuer die Spalte der Kistentabelle, damit alle Spalten passen.
  'fuellstand.spalte': { de: 'Voll' },
  'fuellstand.frage': { de: 'Wie voll ist es?' },
  'fuellstand.prozent': { de: '{n} %' },
  'fuellstand.aria': { de: 'Füllstand {n} Prozent' },
  'fuellstand.leer': { de: 'leer' },
  'fuellstand.voll': { de: 'voll' },
  'fuellstand.nicht_angegeben': { de: 'nicht angegeben' },
  'fuellstand.zuruecksetzen': { de: 'Nicht angeben' },
  'fuellstand.regler': { de: 'Genau einstellen (5er-Schritte)' },
  'fuellstand.nur_lesen': {
    de: 'Nur wer bearbeiten darf, kann den Füllstand ändern.',
  },

  // ------------------------------------------------------------ Kopfzeile
  'kopf.profil': { de: 'Profil und Einstellungen' },
  'kopf.mehr': { de: 'Mehr' },
  'kopf.darstellung': { de: 'Darstellung umschalten, aktuell {wert}' },
  'kopf.sprache': { de: 'Sprache umschalten, aktuell {wert}' },
  'kopf.bewegung': { de: 'Bewegung umschalten, aktuell {wert}' },
}
