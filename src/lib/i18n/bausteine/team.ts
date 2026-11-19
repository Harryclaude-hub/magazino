import type { Woerterbuch } from '../woerter'

/* Seiten Team und Umzug einstellen: Mitglieder, Rollen, Einladungscodes,
 * Grunddaten und Gefahrenbereich.
 * Projektname, Personennamen und Adressen der Nutzer bleiben unveraendert,
 * Einladungscodes ebenfalls. */
export const team: Woerterbuch = {
  // --------------------------------------------------------------- Kopfzeile
  'team.titel': { de: 'Team' },
  'team.einladen': { de: 'Einladen' },

  // -------------------------------------------------------------- Mitglieder
  'team.unbekannt': { de: 'Unbekannt' },
  'team.du': { de: '(du)' },
  'team.ohne_email': { de: 'ohne E-Mail' },
  'team.dabei_seit': { de: 'dabei seit {datum}' },
  'team.rolle_von': { de: 'Rolle von {name}' },
  'team.entfernen_label': { de: '{name} entfernen' },
  'team.rolle_geaendert': { de: 'Rolle geändert' },

  // ---------------------------------------------------------- Einladungscodes
  'team.codes_titel': { de: 'Einladungscodes' },
  'team.neuer_code': { de: 'Neuer Code' },
  'team.codes_laden': { de: 'Codes werden geladen' },
  'team.kein_code_titel': { de: 'Kein Code offen' },
  'team.kein_code_hinweis': {
    de: 'Ein Code lässt andere diesem Umzug beitreten. Sie geben ihn unter Code einlösen ein.',
  },
  'team.code_erstellen': { de: 'Code erstellen' },
  // Rolle und Nutzung in einer Zeile. Das Komma steht mit im Text, weil
  // Arabisch ein eigenes Kommazeichen benutzt.
  'team.code_zeile': {
    de: '{rolle}, {n}x benutzt',
  },
  'team.code_deaktivieren': { de: 'Code deaktivieren' },
  'team.code_deaktiviert': { de: 'Code deaktiviert' },
  'team.einladung_teilen': { de: 'Einladung teilen' },

  // -------------------------------------------------------- Kopieren, Teilen
  'team.code_angelegt_kopiert': {
    de: 'Code {code} angelegt und kopiert',
  },
  'team.code_angelegt_ohne_kopie': {
    de: 'Code {code} angelegt. Kopieren ging nicht, schreib ihn bitte ab.',
  },
  'team.code_kopiert': { de: 'Code kopiert' },
  'team.kopieren_fehler': {
    de: 'Kopieren hat nicht geklappt. Schreib den Code bitte ab.',
  },
  'team.einladung_kopiert': { de: 'Einladung kopiert' },
  'team.teilen_fehler': {
    de: 'Teilen hat nicht geklappt. Schreib den Code bitte ab.',
  },
  // Nachricht an einen Menschen. Der Name des Umzugs bleibt, wie er ist.
  'team.teilen_titel': { de: 'Magazino Einladung' },
  'team.teilen_text': {
    de: 'Komm zu meinem Umzug "{name}" bei Magazino. Code: {code}',
  },

  // ---------------------------------------------------------------- Verlassen
  'team.verlassen_knopf': { de: 'Diesen Umzug verlassen' },
  'team.verlassen_hinweis': {
    de: 'Der Umzug bleibt bestehen, du bist nur nicht mehr dabei. Was du angelegt hast, bleibt drin, denn es gehört dem Umzug und nicht dir.',
  },
  'team.verlassen_besitzer': {
    de: 'Du bist der einzige Besitzer. Verlassen geht erst, wenn jemand anders auch Besitzer ist.',
  },
  'team.verlassen_titel': { de: 'Umzug verlassen' },
  'team.verlassen_bestaetigen': { de: 'Verlassen' },
  'team.verlassen_text': {
    de: 'Du siehst "{name}" danach nicht mehr. Der Umzug selbst bleibt bestehen. Mit einem neuen Einladungscode kommst du wieder rein.',
  },
  'team.verlassen_ok': { de: 'Umzug verlassen' },

  // ------------------------------------------------------ Mitglied entfernen
  'team.entfernen_titel': { de: 'Mitglied entfernen' },
  'team.entfernen_text': {
    de: 'Die Person verliert den Zugriff auf diesen Umzug. Ihre Kisten und Nachrichten bleiben erhalten.',
  },
  'team.entfernt': { de: 'Mitglied entfernt' },

  // ------------------------------------------- Umzug einstellen, Grunddaten
  'team.einstellen_titel': { de: 'Umzug einstellen' },
  'team.grunddaten': { de: 'Grunddaten' },
  'team.speichert_beim_verlassen': {
    de: 'Änderungen werden gespeichert, sobald du das Feld verlässt.',
  },
  'team.nur_lesen': {
    de: 'Du kannst hier nur lesen. Zum Ändern brauchst du die Rolle Bearbeiter.',
  },
  'team.umzug_name': { de: 'Name des Umzugs' },
  'team.vermerk': { de: 'Vermerk' },
  'team.vermerk_hinweis': {
    de: 'Steht auf der Übersicht unter dem Namen.',
  },
  'team.alte_adresse': { de: 'Alte Adresse' },
  'team.neue_adresse': { de: 'Neue Adresse' },
  'team.umzugstag': { de: 'Umzugstag' },
  'team.zeitstempel': {
    de: 'Angelegt am {angelegt}. Zuletzt geändert {geaendert}.',
  },
  'team.gespeichert': { de: 'Gespeichert' },

  // ------------------------------------------ Umzug einstellen, Mitglieder
  'team.karte_titel': { de: 'Team und Einladungscodes' },
  'team.karte_hinweis': {
    de: 'Wer darf mit, wer darf nur lesen, und welcher Code ist offen.',
  },
  'team.karte_knopf': { de: 'Team öffnen' },

  // -------------------------------------- Umzug einstellen, Gefahrenbereich
  'team.gefahr_titel': { de: 'Gefahrenbereich' },
  'team.umzug_loeschen': { de: 'Umzug löschen' },
  'team.umzug_loeschen_hinweis': {
    de: 'Löscht Kisten, Bereiche, Fotos, Nachrichten und alle Mitgliedschaften. Das lässt sich nicht rückgängig machen.',
  },
  'team.loeschen_titel': { de: 'Umzug endgültig löschen' },
  'team.loeschen_text': {
    de: 'Alles in diesem Umzug wird gelöscht: Kisten, Bereiche, Fotos, Nachrichten und Mitgliedschaften. Tippe zur Sicherheit den Namen ein.',
  },
  'team.loeschen_name_hinweis': {
    de: 'Muss Zeichen für Zeichen stimmen.',
  },
  'team.loeschen_ja': { de: 'Ja, löschen' },
  'team.geloescht': { de: 'Umzug gelöscht' },
}
