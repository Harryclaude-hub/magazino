import type { Woerterbuch } from '../woerter'

/* Lager (E103): Tuer-QR, Bestand, Ausleihen, Kalender, Lagerstart, Fehlersaetze. Schluessel lager.* und fehler.db.lager.*
 *
 * Einheiten, Namen und Orte stehen so da, wie sie eingegeben wurden, und
 * kommen nur ueber Platzhalter in die Saetze. */
export const lager: Woerterbuch = {
  // ------------------------------------------------------------ Menue
  'lager.nav_tuer': { de: 'Tür' },
  'lager.nav_bestand': { de: 'Bestand' },
  'lager.nav_ausleihen': { de: 'Ausleihen' },

  // ------------------------------------------------------- Allgemein
  'lager.fehler': { de: '{grund}' },
  'lager.knapp': { de: 'Knapp' },
  'lager.zur_tuer': { de: 'Zur Tür' },
  'lager.menge': { de: 'Menge' },
  'lager.notiz': { de: 'Notiz (optional)' },
  'lager.unbekanntes_ding': { de: 'Unbekanntes Ding' },
  'lager.menge_ungueltig': {
    de: 'Bitte eine Menge größer als 0 eingeben.',
  },
  'lager.menge_ungueltig_null': {
    de: 'Bitte eine Menge von 0 oder mehr eingeben.',
  },

  // ------------------------------------------------------------- Tür
  'lager.tuer_titel': { de: 'Tür' },
  'lager.tuer_laedt': { de: 'Tür wird geladen' },
  'lager.tuer_eintragen': { de: 'Eintragen' },
  'lager.tuer_austragen': { de: 'Austragen' },
  'lager.tuer_status_drin': { de: 'Du bist eingetragen seit {zeit}.' },
  'lager.tuer_status_draussen': { de: 'Du bist nicht eingetragen.' },
  'lager.tuer_hinweis': {
    de: 'Trag dich ein, wenn du ins Lager gehst, und trag dich aus, wenn du gehst. Nur eingetragen kannst du etwas entnehmen oder ausleihen.',
  },
  'lager.tuer_hinweis_besitzer': {
    de: 'Als Besitzer darfst du auch ohne Eintrag buchen.',
  },
  'lager.tuer_toast_ein': { de: 'Eingetragen' },
  'lager.tuer_toast_aus': { de: 'Ausgetragen' },
  'lager.tuer_drin_titel': { de: 'Gerade im Lager' },
  'lager.tuer_niemand': { de: 'Gerade ist niemand eingetragen.' },
  'lager.tuer_seit': { de: 'seit {zeit}' },
  'lager.tuer_protokoll': { de: 'Protokoll (letzte 30)' },
  'lager.tuer_protokoll_leer': { de: 'Noch keine Einträge.' },
  'lager.tuer_von_bis': { de: '{von} bis {bis}' },
  'lager.tuer_noch_drin': { de: 'noch drin' },

  // ------------------------------------------------------ Tür-QR
  'lager.etikett_titel': { de: 'Tür-QR zum Drucken' },
  'lager.etikett_hinweis': {
    de: 'Aufhängen an der Lagertür. Wer den Code scannt, landet direkt bei Eintragen und Austragen.',
  },
  'lager.etikett_kopf': { de: 'Hier ein- und austragen' },
  'lager.etikett_fuss': { de: 'Mit der Handykamera scannen' },

  // --------------------------------------------------------- Bestand
  'lager.bestand_titel': { de: 'Bestand' },
  'lager.bestand_laedt': { de: 'Bestand wird geladen' },
  'lager.bestand_suche': { de: 'Name oder Ort suchen' },
  'lager.bestand_ohne_bereich': { de: 'Ohne Bereich' },
  'lager.bestand_leer_titel': { de: 'Noch nichts im Bestand' },
  'lager.bestand_leer_bearbeiter': {
    de: 'Lege die ersten Dinge mit Neu hinzufügen an.',
  },
  'lager.bestand_leer_leser': {
    de: 'Ein Bearbeiter legt die Dinge an.',
  },
  'lager.mindestens': { de: 'Mindestens {menge} {einheit}' },
  'lager.ort_zeile': { de: 'Ort: {ort}' },
  'lager.art_verbrauch': { de: 'Verbrauch' },
  'lager.art_ausleihe': { de: 'Ausleihen' },
  'lager.art_hinweis': {
    de: 'Verbrauch wird aufgebraucht. Ausleihen kommt zurück.',
  },
  'lager.entnehmen': { de: 'Entnehmen' },
  'lager.zugang': { de: 'Zugang' },
  'lager.zaehlen': { de: 'Zählen' },
  'lager.neu': { de: 'Neu hinzufügen' },
  'lager.bereiche_verwalten': { de: 'Bereiche verwalten' },

  // ------------------------------------------------------ Entnehmen
  'lager.entnehmen_titel': { de: '{name} entnehmen' },
  'lager.da': { de: 'Da sind {menge} {einheit}.' },
  'lager.kommt_zurueck': { de: 'Kommt zurück' },
  'lager.kommt_zurueck_hinweis': {
    de: 'Aus, wenn es verbraucht wird. An, wenn du es zurückbringst.',
  },
  'lager.zurueck_bis': { de: 'Zurück bis' },
  'lager.heute_abend': { de: 'Heute Abend' },
  'lager.morgen': { de: 'Morgen' },
  'lager.in_woche': { de: 'In einer Woche' },
  'lager.termin_vergangen': {
    de: 'Der Rückgabetermin liegt in der Vergangenheit.',
  },
  'lager.termin_fehlt': { de: 'Bitte einen Rückgabetermin wählen.' },
  'lager.toast_entnommen': {
    de: '{name}: {menge} {einheit} entnommen',
  },
  'lager.toast_ausgeliehen': {
    de: '{name} ausgeliehen bis {bis}',
  },

  // ------------------------------------------------- Zugang, Zählen
  'lager.zugang_titel': { de: '{name}: Zugang' },
  'lager.zugang_hinweis': { de: 'Wie viel legst du dazu?' },
  'lager.zaehlen_titel': { de: '{name}: Zählen' },
  'lager.zaehlen_hinweis': {
    de: 'Wie viel ist jetzt wirklich da? Der Bestand wird auf diese Zahl gesetzt.',
  },
  'lager.toast_zugegeben': {
    de: '{name}: {menge} {einheit} dazugelegt',
  },
  'lager.toast_gezaehlt': {
    de: '{name}: jetzt {menge} {einheit}',
  },

  // ------------------------------------------- Neu, Ändern, Löschen
  'lager.neu_titel': { de: 'Neu hinzufügen' },
  'lager.bereich': { de: 'Bereich' },
  'lager.kein_bereich': { de: 'Kein Bereich' },
  'lager.einheit': { de: 'Einheit' },
  'lager.einheit_beispiel': { de: 'Stk, kg, Liter' },
  'lager.mindestmenge': { de: 'Mindestmenge' },
  'lager.mindestmenge_hinweis': {
    de: 'Darunter erscheint knapp. 0 heißt: keine Warnung.',
  },
  'lager.art': { de: 'Art' },
  'lager.ort': { de: 'Ort (optional)' },
  'lager.speichern_naechstes': { de: 'Speichern und nächstes' },
  'lager.name_fehlt': { de: 'Bitte einen Namen eingeben.' },
  'lager.toast_angelegt': { de: '{name} angelegt' },
  'lager.aendern_titel': { de: '{name} ändern' },
  'lager.aendern_hinweis': {
    de: 'Die Menge änderst du mit Entnehmen, Zugang oder Zählen.',
  },
  'lager.toast_geaendert': { de: '{name} gespeichert' },
  'lager.loeschen_titel': { de: '{name} löschen?' },
  'lager.loeschen_text': {
    de: 'Das Ding wird aus dem Bestand gelöscht, samt seinen Ausleihen. Das lässt sich nicht rückgängig machen.',
  },
  'lager.toast_geloescht': { de: '{name} gelöscht' },

  // ------------------------------------------------------- Bereiche
  'lager.bereiche_titel': { de: 'Bereiche verwalten' },
  'lager.bereiche_hinweis': {
    de: 'Ein Bereich fasst Dinge zusammen. Wer zuständig ist, kümmert sich um den Nachschub.',
  },
  'lager.bereich_name': { de: 'Name des Bereichs' },
  'lager.zustaendig': { de: 'Zuständig' },
  'lager.niemand': { de: 'Niemand' },
  'lager.bereich_neu': { de: 'Neuer Bereich' },
  'lager.bereiche_leer': { de: 'Noch keine Bereiche.' },
  'lager.toast_bereich': { de: 'Bereich gespeichert' },

  // ------------------------------------------------------ Ausleihen
  'lager.ausleihen_titel': { de: 'Ausleihen' },
  'lager.ausleihen_laedt': { de: 'Ausleihen werden geladen' },
  'lager.meine_offenen': { de: 'Meine offenen' },
  'lager.alle_offenen': { de: 'Alle offenen' },
  'lager.keine_meine': { de: 'Du hast nichts ausgeliehen.' },
  'lager.keine_alle': { de: 'Es ist nichts ausgeliehen.' },
  'lager.faellig': { de: 'Fällig {zeit}' },
  'lager.ueberfaellig': { de: 'Überfällig' },
  'lager.von_wem': { de: 'von {name}' },
  'lager.zurueckgebracht': { de: 'Zurückgebracht' },
  'lager.toast_zurueck': { de: 'Als zurückgebracht gebucht' },
  'lager.in_kalender': { de: 'In Kalender' },
  'lager.alle_in_kalender': { de: 'Alle meine offenen in den Kalender' },
  'lager.toast_kalender': { de: 'Kalenderdatei erstellt' },
  'lager.erledigt_titel': { de: 'Zurückgebracht' },
  'lager.erledigt_zeigen': { de: 'Zurückgebrachte anzeigen' },
  'lager.erledigt_leer': { de: 'Noch nichts zurückgebracht.' },
  'lager.zurueck_am': { de: 'zurück am {zeit}' },
  'lager.kal_titel': { de: 'Zurückbringen: {ding} ({lager})' },
  'lager.kal_beschreibung': {
    de: '{menge} {einheit} {ding} ins Lager {lager} zurückbringen.',
  },

  // ------------------------------------------------------ Lagerstart
  'lager.band_passwort': { de: 'Bitte setze ein eigenes Passwort.' },
  'lager.band_passwort_knopf': { de: 'Passwort ändern' },
  'lager.home_drin': { de: 'Drin seit {zeit}' },
  'lager.home_nicht_drin': { de: 'Nicht eingetragen' },
  'lager.home_knapp': { de: '{n} knapp' },
  'lager.home_alles_da': { de: 'Alles da' },
  'lager.home_offen': { de: '{n} offen' },
  'lager.home_nichts_offen': { de: 'Nichts offen' },
  'lager.home_ueberfaellig': { de: '{n} überfällig' },
  'lager.home_fehler': { de: 'Nicht geladen' },
  'lager.leer_zugeteilt': {
    de: 'Ein Admin muss dich einem Lager zuteilen.',
  },
  'lager.admin_pruefen_fehler': {
    de: 'Ob du Admin bist, ließ sich nicht prüfen: {grund}',
  },

  // ---------------------------------------------- Konten (api.ts)
  'lager.konto_halb': {
    de: 'Das Konto wurde angelegt, aber ein Folgeschritt ist fehlgeschlagen: {grund}. Prüfe Freigabe und Zuteilung in der Admin-Übersicht.',
  },
  'lager.konto_fehler_email_ungueltig': {
    de: 'Diese E-Mail-Adresse ist ungültig.',
  },
  'lager.konto_fehler_passwort_schwach': {
    de: 'Das Passwort ist zu schwach. Nimm ein längeres mit Buchstaben und Zahlen.',
  },
  'lager.konto_fehler_email_vergeben': {
    de: 'Zu dieser E-Mail-Adresse gibt es schon ein Konto.',
  },
  'lager.konto_fehler_kein_admin': {
    de: 'Nur Admins dürfen Konten anlegen.',
  },
  'lager.konto_fehler_nicht_angemeldet': {
    de: 'Du bist nicht angemeldet.',
  },
  'lager.konto_fehler_anlegen_fehlgeschlagen': {
    de: 'Das Konto ließ sich nicht anlegen. Bitte versuche es später nochmal.',
  },
  'lager.konto_fehler_serverfehler': {
    de: 'Der Server meldet einen Fehler. Bitte versuche es später nochmal.',
  },
  'lager.konto_fehler_unbekannt': {
    de: 'Beim Anlegen des Kontos ist etwas schiefgegangen.',
  },

  // ---------------------------------- Zustand, Auffüllen, Entfernen (E105)
  'lager.z_da': { de: 'Im Lager' },
  'lager.z_knapp': { de: 'Nur noch {menge} {einheit}' },
  'lager.z_leer': { de: 'Leer' },
  'lager.z_weg': { de: 'Gibt es nicht mehr' },
  'lager.auffuellen': { de: 'Auffüllen' },
  'lager.auffuellen_titel': { de: '{name} auffüllen' },
  'lager.entfernen_titel': { de: '{name} entfernen?' },
  'lager.entfernen_text': {
    de: 'Es ist aufgebraucht. Entfernen nimmt es aus der Liste.',
  },
  'lager.toast_entfernt': { de: '{name} entfernt' },
  'lager.produkt': { de: 'Produkt' },
  'lager.mindestmenge_kurz': { de: 'Warnen ab' },
  'lager.bereich_loeschen_titel': { de: 'Bereich {name} löschen?' },
  'lager.bereich_loeschen_text': {
    de: 'Das geht nur, wenn nichts mehr darin liegt.',
  },
  'lager.toast_bereich_weg': { de: 'Bereich {name} gelöscht' },

  // ------------------------------------------------- Kisten (E105)
  'lager.k_bereich_waehlen': { de: 'Bitte einen Bereich wählen.' },
  'lager.k_name': { de: 'Name (optional)' },
  'lager.k_name_beispiel': { de: 'zum Beispiel Bastelfarben' },
  'lager.k_mehr': { de: 'Mehr' },
  'lager.k_ohne_bereich': { de: 'Ohne Bereich' },
  'lager.k_platz_waehlen': { de: 'Platz wählen' },

  // ------------------------------------------------- Suche (E105)
  'lager.suche_untertitel': { de: 'In allen Lagern' },
  'lager.suche_platzhalter': { de: 'Kleber, Kiste, Produkt' },
  'lager.suche_hinweis': {
    de: 'Sucht in Produkten und im Inhalt der Kisten.',
  },
  'lager.suche_produkte': { de: 'Produkte' },
  'lager.suche_kisten': { de: 'Kisten' },
  'lager.suche_lager': { de: 'Lager' },

  // ---------------------------- Ablehnungen der Datenbank (0050)
  'fehler.db.lager.nur_buchung': {
    de: 'Die Menge lässt sich nur über eine Buchung ändern: Entnehmen, Zugang oder Zählen.',
  },
  'fehler.db.lager.fremde_kategorie': {
    de: 'Dieser Bereich gehört zu einem anderen Lager.',
  },
  'fehler.db.lager.fremde_kiste': {
    de: 'Diese Kiste gehört zu einem anderen Lager.',
  },
  'fehler.db.lager.zustaendig_kein_mitglied': {
    de: 'Wer zuständig ist, muss Mitglied dieses Lagers sein.',
  },
  'fehler.db.lager.kein_zugang': {
    de: 'Dafür hast du in diesem Lager keine Berechtigung.',
  },
  'fehler.db.lager.nicht_drin': {
    de: 'Du bist nicht eingetragen, also kannst du dich auch nicht austragen.',
  },
  'fehler.db.lager.unbekannt': {
    de: 'Das gibt es nicht mehr. Lade die Seite neu.',
  },
  'fehler.db.lager.art': {
    de: 'Diese Buchungsart gibt es nicht.',
  },
  'fehler.db.lager.menge': {
    de: 'Die Menge ist ungültig. Sie muss größer als 0 sein, beim Zählen 0 oder mehr.',
  },
  'fehler.db.lager.nicht_eingetragen': {
    de: 'Du bist nicht eingetragen. Trag dich zuerst an der Tür ein.',
  },
  'fehler.db.lager.termin': {
    de: 'Zum Ausleihen brauchst du einen Rückgabetermin.',
  },
  'fehler.db.lager.zu_wenig': {
    de: 'So viel ist nicht da. Es sind nur {n} {einheit}.',
  },
  'fehler.db.lager.rolle': {
    de: 'Diese Rolle gibt es nicht.',
  },
  'fehler.db.lager.bereich_nicht_leer': {
    de: 'Dieser Bereich ist nicht leer. Räum erst die Produkte und Kisten daraus weg.',
  },
  'fehler.db.lager.noch_ausgeliehen': {
    de: 'Das ist noch ausgeliehen. Erst wenn es zurück ist, lässt es sich entfernen.',
  },
  'fehler.db.lager.name': {
    de: 'Bitte einen gültigen Namen eingeben.',
  },
  'fehler.db.lager.bl_nicht_leer': {
    de: 'In diesem Bundeslandprojekt gibt es noch Lager. Entferne zuerst die Lager.',
  },
  'fehler.db.admin.letzter': {
    de: 'Der letzte Admin bleibt. Ernenne zuerst einen anderen.',
  },
  'fehler.db.admin.selbst': {
    de: 'Das geht nicht bei deinem eigenen Konto.',
  },
  'lager.nehmen': { de: 'Nehmen' },
  'lager.ausleihen_knopf': { de: 'Ausleihen' },
  'lager.ausleihen_dialog_titel': { de: '{name} ausleihen' },
  'lager.start_scannen_hinweis': { de: 'Schlüssel zum Lager' },
  'lager.start_bestand_hinweis': { de: 'Was da ist' },
  'lager.start_bereiche': { de: 'Bereiche' },
  'lager.start_welches_lager': { de: 'Welches Lager?' },
  'lager.start_mehr': { de: 'Es gibt mehr Treffer. Schreibe genauer.' },
  'lager.start_verwalten': { de: 'Verwalten' },
  'lager.start_scan_untertitel': { de: 'Kiste oder Lagertür' },
  'lager.konto_fehler_benutzername_ungueltig': { de: 'Der Benutzername darf nur Kleinbuchstaben, Ziffern, Punkt, Bindestrich und Unterstrich enthalten (3 bis 30 Zeichen).' },
  'lager.konto_fehler_benutzername_vergeben': { de: 'Diesen Benutzernamen gibt es schon.' },
  'lager.konto_fehler_login_fehlt': { de: 'Bitte eine E-Mail-Adresse oder einen Benutzernamen eintragen.' },
  'lager.konto_fehler_passwort_bekannt': { de: 'Dieses Passwort ist zu leicht zu erraten. Bitte ein anderes nehmen.' },
  'lager.konto_fehler_passwort_enthaelt_name': { de: 'Das Passwort darf den Namen oder die Adresse nicht enthalten.' },
  'lager.passwort_fehler_passwort_schwach': { de: 'Das Passwort braucht mindestens 10 Zeichen mit Buchstaben und Ziffern.' },
  'lager.passwort_fehler_passwort_bekannt': { de: 'Dieses Passwort ist zu leicht zu erraten. Bitte ein anderes nehmen.' },
  'lager.passwort_fehler_passwort_enthaelt_name': { de: 'Das Passwort darf den Namen oder die Adresse nicht enthalten.' },
  'lager.passwort_fehler_ziel_ist_admin': { de: 'Das Passwort eines Admins setzt nur er selbst, in seinen Einstellungen.' },
  'lager.passwort_fehler_nicht_selbst': { de: 'Das eigene Passwort änderst du in den Einstellungen.' },
  'lager.passwort_fehler_konto_unbekannt': { de: 'Dieses Konto gibt es nicht.' },
  'lager.passwort_fehler_kein_admin': { de: 'Nur Admins dürfen das.' },
  'lager.passwort_fehler_setzen_fehlgeschlagen': { de: 'Das Passwort konnte nicht gesetzt werden. Bitte noch einmal versuchen.' },
  'lager.passwort_fehler_unbekannt': { de: 'Das Passwort konnte nicht gesetzt werden.' },
}
