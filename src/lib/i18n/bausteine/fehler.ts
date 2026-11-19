import type { Woerterbuch } from '../woerter'

/* Meldungen aus dem Datenzugriff und den Hilfsmodulen. Sie erscheinen als
 * Hinweis oder in einer Fehlerkarte, gehoeren also zum Programm und werden
 * uebersetzt.
 *
 * Der Platzhalter {grund} traegt den Klartext, den der Server geliefert
 * hat. Der kommt aus errText und ist selbst schon uebersetzt.
 *
 * Nicht hier: die Texte aus console.warn. Die liest nur, wer die Konsole
 * offen hat, und die bleiben darum deutsch.
 */
export const fehler: Woerterbuch = {
  // --------------------------------------------------------- Allgemein
  'fehler.admin_aendern': {
    de: 'Freigabe nicht geändert: {grund}',
  },
  'fehler.admin_loeschen': {
    de: 'Konto nicht gelöscht: {grund}',
  },
  'fehler.db.admin.nicht_selbst': {
    de: 'Das geht nicht bei deinem eigenen Konto.',
  },
  'fehler.db.admin.nicht_admin': {
    de: 'Ein Admin-Konto lässt sich nicht sperren oder löschen.',
  },
  'fehler.db.admin.unbekannt': {
    de: 'Dieses Konto gibt es nicht mehr.',
  },
  'fehler.db.konto.nicht_frei': {
    de: 'Dein Konto ist noch nicht freigeschaltet.',
  },
  // Aus 0049: Mitgliedschaft und Eigentuemer bleiben fest.
  'fehler.db.mitglied.fest': {
    de: 'Eine Mitgliedschaft lässt sich nicht in einen anderen Umzug oder auf eine andere Person verschieben.',
  },
  'fehler.db.umzug.eigentuemer_nur_besitzer': {
    de: 'Den Eigentümer eines Umzugs ändert nur ein Besitzer.',
  },
  'fehler.admin_laden': {
    de: 'Admin-Übersicht nicht geladen: {grund}',
  },
  'fehler.db.admin.kein_zugriff': {
    de: 'Nur für Admins.',
  },
  'fehler.produkt_lesen': {
    de: 'Die Produktseite ließ sich nicht lesen: {grund}',
  },
  'fehler.linien_speichern': {
    de: 'Die Hilfslinien wurden nicht gespeichert: {grund}',
  },
  'fehler.keine_daten': { de: 'keine Daten erhalten' },
  'fehler.nicht_angemeldet': { de: 'Nicht angemeldet' },

  // ---------------------------------------------------------- Umzuege
  'fehler.umzuege_laden': {
    de: 'Umzüge laden: {grund}',
  },
  'fehler.umzug_laden': { de: 'Umzug laden: {grund}' },
  'fehler.umzug_anlegen': { de: 'Umzug anlegen: {grund}' },
  'fehler.umzug_speichern': { de: 'Umzug speichern: {grund}' },
  'fehler.umzug_loeschen': { de: 'Umzug löschen: {grund}' },
  'fehler.beitreten': { de: 'Beitreten: {grund}' },
  'fehler.umzug_fehlt': {
    de: 'Dieser Umzug existiert nicht oder du bist nicht eingeladen.',
  },
  'fehler.umzug_unsichtbar': {
    de: 'Der Umzug zu dieser Kiste ist für dich nicht sichtbar.',
  },
  'fehler.zaehlwerte_laden': {
    de: 'Zählwerte laden: {grund}',
  },
  'fehler.zaehlwerte_bereich': {
    de: 'Zählwerte je Bereich: {grund}',
  },

  // -------------------------------------------------------- Mitglieder
  'fehler.mitglieder_laden': {
    de: 'Mitglieder laden: {grund}',
  },
  'fehler.rolle_aendern': { de: 'Rolle ändern: {grund}' },
  'fehler.mitglied_entfernen': {
    de: 'Mitglied entfernen: {grund}',
  },

  // ------------------------------------------------------- Einladungen
  'fehler.einladungen_laden': {
    de: 'Einladungen laden: {grund}',
  },
  'fehler.einladung_anlegen': {
    de: 'Einladung anlegen: {grund}',
  },
  'fehler.einladung_aendern': {
    de: 'Einladung ändern: {grund}',
  },

  // ---------------------------------------------------------- Bereiche
  'fehler.bereiche_laden': { de: 'Bereiche laden: {grund}' },
  'fehler.bereich_anlegen': { de: 'Bereich anlegen: {grund}' },
  'fehler.bereich_speichern': {
    de: 'Bereich speichern: {grund}',
  },
  'fehler.bereich_loeschen': { de: 'Bereich löschen: {grund}' },
  'fehler.zimmer_person_laden': {
    de: 'Zimmer und Person laden: {grund}',
  },

  // ------------------------------------------------------------ Kisten
  'fehler.suchen': { de: 'Suchen: {grund}' },
  'fehler.regale_laden': { de: 'Regale laden: {grund}' },

  // Ablehnungen der Datenbank. Die Kennung kommt als hint mit
  // (kistly:grundriss.xyz, kistly:groesse.xyz), der Satz steht hier.
  'fehler.groessen_laden': {
    de: 'Größen laden: {grund}',
  },
  'fehler.kisten_laden': { de: 'Kisten laden: {grund}' },
  'fehler.kiste_laden': { de: 'Kiste laden: {grund}' },
  'fehler.kiste_anlegen': { de: 'Kiste anlegen: {grund}' },
  'fehler.kiste_speichern': { de: 'Kiste speichern: {grund}' },
  'fehler.kiste_loeschen': { de: 'Kiste löschen: {grund}' },
  'fehler.kiste_suchen': { de: 'Kiste suchen: {grund}' },
  'fehler.kiste_fehlt': { de: 'Diese Kiste gibt es nicht mehr.' },
  'fehler.code_suchen': { de: 'Code suchen: {grund}' },
  'fehler.alter_code_suchen': {
    de: 'Alten Code suchen: {grund}',
  },

  // ----------------------------------------------------------- Inhalte
  'fehler.inhalt_laden': { de: 'Inhalt laden: {grund}' },
  'fehler.inhalte_laden': { de: 'Inhalte laden: {grund}' },
  'fehler.eintrag_anlegen': { de: 'Eintrag anlegen: {grund}' },
  'fehler.eintrag_speichern': {
    de: 'Eintrag speichern: {grund}',
  },
  'fehler.eintrag_loeschen': { de: 'Eintrag löschen: {grund}' },

  // ------------------------------------------------------------- Fotos
  'fehler.fotos_laden': { de: 'Fotos laden: {grund}' },
  'fehler.foto_speichern': { de: 'Foto speichern: {grund}' },
  'fehler.foto_loeschen': { de: 'Foto löschen: {grund}' },
  'fehler.hochladen': { de: 'Hochladen: {grund}' },
  'fehler.ausschnitt': {
    de: 'Ausschnitt anlegen: {grund}',
  },

  // ----------------------------------------------------------- Verlauf
  'fehler.verlauf_laden': { de: 'Verlauf laden: {grund}' },
  'fehler.verlauf_loeschen': { de: 'Verlauf löschen: {grund}' },

  // -------------------------------------------------------------- Chat
  'fehler.nachrichten_laden': {
    de: 'Nachrichten laden: {grund}',
  },
  'fehler.nachricht_senden': {
    de: 'Nachricht senden: {grund}',
  },
  'fehler.nachricht_loeschen': {
    de: 'Nachricht löschen: {grund}',
  },
  'fehler.nachricht_aendern': {
    de: 'Nachricht ändern: {grund}',
  },
  'fehler.reaktion_setzen': {
    de: 'Reaktion setzen: {grund}',
  },
  'fehler.reaktion_entfernen': {
    de: 'Reaktion entfernen: {grund}',
  },

  // ------------------------------------------------------------ Anrufe
  'fehler.anruf_starten': { de: 'Anruf starten: {grund}' },
  'fehler.anruf_laden': { de: 'Anruf laden: {grund}' },
  'fehler.anruf_aendern': { de: 'Anruf ändern: {grund}' },
  'fehler.anruf_fehlt': { de: 'Anruf nicht gefunden' },
  'fehler.teilnehmer_eintragen': {
    de: 'Teilnehmer eintragen: {grund}',
  },
  'fehler.teilnehmer_aendern': {
    de: 'Teilnehmer ändern: {grund}',
  },
  'fehler.mikrofon_abgelehnt': {
    de: 'Zugriff auf Mikrofon wurde abgelehnt. Ohne Mikrofon geht kein Anruf.',
  },
  'fehler.mikrofon_fehlt': {
    de: 'Mikrofon nicht verfügbar: {grund}',
  },
  'fehler.signalkanal': {
    de: 'Der Signalkanal ist abgebrochen. Anruf neu starten.',
  },
  'fehler.verbindung_direkt': {
    de: 'Die direkte Verbindung kam nicht zustande. Das passiert in manchen Mobilfunknetzen ohne TURN-Server.',
  },

  // ------------------------------------- Figur und Wohnung live (E82)
  'fehler.figur_ungueltig': {
    de: 'Diese Figur lässt sich nicht speichern. Bitte die Auswahl prüfen.',
  },
  'fehler.figur_spalte_fehlt': {
    de: 'Die Datenbank kennt Figuren noch nicht. Speichern geht nach dem nächsten Update.',
  },
  'fehler.wohnung_anmeldung': {
    de: 'Verbindung zur Wohnung nicht aufgebaut: {grund}',
  },
  'fehler.wohnung_kanal': {
    de: 'Die Verbindung zu den anderen in der Wohnung ist gestört. Du siehst sie gerade nicht.',
  },
  'fehler.wohnung_zeit': {
    de: 'Die anderen in der Wohnung antworten nicht. Es wird weiter versucht.',
  },
  'fehler.wohnung_zu': {
    de: 'Die Verbindung zu den anderen in der Wohnung wurde beendet.',
  },
  'fehler.sprechen_mikrofon_abgelehnt': {
    de: 'Das Mikrofon ist gesperrt. Zuhören geht trotzdem; zum Sprechen das Mikrofon in den Seiteneinstellungen erlauben.',
  },

  // ---------------------------------------------------------- Aufnahme
  'fehler.keine_aufnahme': { de: 'Es läuft keine Aufnahme' },
  'fehler.aufnahme_leer': {
    de: 'Die Aufnahme ist leer geblieben',
  },

  // ------------------------------------------------------ Einstellungen
  'fehler.prefs_laden': {
    de: 'Einstellungen laden: {grund}',
  },
  'fehler.prefs_anlegen': {
    de: 'Einstellungen anlegen: {grund}',
  },
  'fehler.prefs_speichern': {
    de: 'Einstellungen speichern: {grund}',
  },

  // -------------------------------------------------------------- Push
  'fehler.push_nicht_moeglich': {
    de: 'Dieser Browser kann keine Push-Benachrichtigungen.',
  },
  'fehler.push_kein_schluessel': {
    de: 'Es ist kein VAPID-Schlüssel hinterlegt. Ohne den kann der Server nichts schicken.',
  },
  'fehler.push_blockiert': {
    de: 'Benachrichtigungen wurden im Browser blockiert. Das musst du in den Seiteneinstellungen wieder erlauben.',
  },
  'fehler.push_keine_erlaubnis': {
    de: 'Ohne Erlaubnis gibt es keine Benachrichtigungen.',
  },
  'fehler.push_abo_unvollstaendig': {
    de: 'Das Abo des Browsers war unvollständig.',
  },
  'fehler.push_abo_speichern': {
    de: 'Abo speichern: {grund}',
  },

  // --------------------------------------- Aus errText, Antwort des Servers
  'fehler.mail_limit': {
    de: 'Supabase wollte eine Bestätigungsmail verschicken und hat das Stundenlimit erreicht. Abhilfe: in der Projektverwaltung unter Authentication, Sign In, Email die Option "Confirm email" ausschalten. Dann wird gar keine Mail mehr verschickt und die Registrierung geht sofort durch.',
  },
  'fehler.zu_viele_versuche': {
    de: 'Zu viele Versuche kurz hintereinander. Warte einen Moment und probier es noch einmal.',
  },
  'fehler.registrierung_aus': {
    de: 'Registrierung ist in diesem Projekt abgeschaltet.',
  },
  'fehler.login_falsch': {
    de: 'E-Mail oder Passwort stimmt nicht.',
  },
  'fehler.mail_vergeben': {
    de: 'Diese E-Mail ist schon registriert.',
  },
  'fehler.mail_unbestaetigt': {
    de: 'Das Konto wartet noch auf eine Bestätigung. Sag Bescheid, dann wird es freigeschaltet.',
  },
  'fehler.passwort_kurz': {
    de: 'Das Passwort braucht mindestens 10 Zeichen, mit Buchstaben und Ziffern.',
  },
  'fehler.passwort_gleich': {
    de: 'Das neue Passwort muss sich vom alten unterscheiden.',
  },
  'fehler.passwort_schwach': {
    de: 'Das Passwort ist zu schwach. Nimm mindestens 10 Zeichen, darunter mindestens einen Buchstaben (a bis z) und eine Ziffer.',
  },
  'fehler.passwort_geleakt': {
    de: 'Dieses Passwort ist schon in Datenlecks aufgetaucht. Nimm bitte ein anderes.',
  },
  'fehler.neu_anmelden_noetig': {
    de: 'Aus Sicherheitsgründen musst du dich dafür neu anmelden. Melde dich ab und wieder an und ändere das Passwort gleich danach.',
  },
  'fehler.link_abgelaufen': {
    de: 'Der Link ist abgelaufen oder wurde schon benutzt.',
  },
  'fehler.link_anderer_browser': {
    de: 'Bitte öffne den Link im selben Browser, in dem du ihn angefordert hast, oder fordere einen neuen Link an.',
  },
  'fehler.sitzung_weg': {
    de: 'Die Sitzung ist abgelaufen. Bitte neu anmelden.',
  },
  'fehler.kuerzel_vergeben': {
    de: 'Dieses Kürzel ist in diesem Umzug schon vergeben.',
  },
  'fehler.eintrag_doppelt': { de: 'Der Eintrag existiert schon.' },
  'fehler.keine_berechtigung': {
    de: 'Dafür fehlt dir die Berechtigung in diesem Umzug.',
  },
  'fehler.bereiche_zusammenfuehren': {
    de: 'Bereiche zusammenführen: {grund}',
  },
  'fehler.inhalt_verschieben': {
    de: 'Inhalt verschieben: {grund}',
  },
  'fehler.erkennung_laden': {
    de: 'Erkennung laden: {grund}',
  },
  'fehler.erkennung_verwerfen': {
    de: 'Erkennung verwerfen: {grund}',
  },
  'fehler.rest_laden': {
    de: 'Verbleibende Auswertungen laden: {grund}',
  },
  'fehler.umzug_verlassen': {
    de: 'Umzug verlassen: {grund}',
  },
  'fehler.keine_verbindung': {
    de: 'Keine Verbindung zum Server. Internet prüfen.',
  },

  // ---------------------------------------- Eigene Groessen und Grundriss
  'fehler.eigene_groessen_laden': {
    de: 'Eigene Größen laden: {grund}',
  },
  'fehler.eigene_groesse_speichern': { de: 'Größe speichern: {grund}' },
  'fehler.eigene_groesse_loeschen': { de: 'Größe löschen: {grund}' },
  'fehler.eigene_groesse_folgen': {
    de: 'Folgen prüfen: {grund}',
  },
  'fehler.grundrisse_laden': { de: 'Grundrisse laden: {grund}' },
  'fehler.grundriss_laden': { de: 'Grundriss laden: {grund}' },
  'fehler.grundriss_anlegen': { de: 'Grundriss anlegen: {grund}' },
  'fehler.grundriss_speichern': { de: 'Grundriss speichern: {grund}' },
  'fehler.grundriss_loeschen': { de: 'Grundriss löschen: {grund}' },
  'fehler.raeume_laden': { de: 'Räume laden: {grund}' },
  'fehler.platz_setzen': { de: 'Platz setzen: {grund}' },
  'fehler.platz_raeumen': { de: 'Vom Platz nehmen: {grund}' },
  'fehler.kiste_lage_laden': {
    de: 'Platz der Kiste laden: {grund}',
  },
  'fehler.bitte_nochmal': {
    de: 'Das kam einer anderen Änderung in die Quere. Bitte nochmal versuchen.',
  },
  // Ersatzwoerter, wenn die Datenbank keinen Namen mitschickt.
  'fehler.dieses_zimmer': { de: 'Dieses Zimmer' },
  'fehler.objekt_art.moebel': { de: 'Möbelstück' },
  'fehler.objekt_art.regal': { de: 'Regal' },
  'fehler.objekt_art.schrank': { de: 'Schrank' },
  'fehler.objekt_art.objekt': { de: 'Objekt' },

  // Ablehnungen fuer eigene Groessen (0027): hint kistly:groesse.xyz,
  // Platzhalter aus details.
  'fehler.db.groesse.benutzt': {
    de: 'Diese Größe benutzen noch {kisten} Kisten und {moebel} Möbel.',
  },
  'fehler.db.groesse.anderer_umzug': {
    de: 'Diese Größe gehört zu einem anderen Umzug.',
  },
  'fehler.db.groesse.name_doppelt': {
    de: 'Eine Größe mit diesem Namen gibt es schon.',
  },
  // Alte, noch zwischengespeicherte Apps nach 0029.

  // Ablehnungen des Grundrisses (0028): hint kistly:grundriss.xyz,
  // Platzhalter aus details. Liste im Bauplan, Abschnitt 5.5.
  'fehler.db.grundriss.raum_punkte': {
    de: 'Ein Raum braucht 3 bis 200 Ecken.',
  },
  'fehler.db.grundriss.raum_bereich': {
    de: 'Der Raum liegt außerhalb der Zeichenfläche.',
  },
  'fehler.db.grundriss.raum_doppelt': {
    de: 'Zwei Ecken liegen aufeinander.',
  },
  'fehler.db.grundriss.raum_kreuzt': {
    de: 'Die Wände dieses Raums kreuzen sich.',
  },
  'fehler.db.grundriss.raum_umlauf': {
    de: 'Der Raum ist falsch herum gezeichnet. Bitte neu laden.',
  },
  'fehler.db.grundriss.raum_umhaengen': {
    de: 'Ein Raum bleibt in seinem Grundriss.',
  },
  'fehler.db.siedlung.nur_besitzer': {
    de: 'Das darf nur, wem die Siedlung gehört.',
  },
  'fehler.db.siedlung.kein_zugriff': {
    de: 'Du bist in dieser Siedlung nicht eingeladen.',
  },
  'fehler.db.siedlung.nicht_drin': {
    de: 'Diese Person ist nicht mehr in der Siedlung.',
  },
  'fehler.db.siedlung.zu_oft': {
    de: 'Zu viele Einladungen in kurzer Zeit. Versuch es in einer Stunde wieder.',
  },
  // Stadt und Dinge der Siedlung (E87, 0047).
  'fehler.db.siedlung.zu_viele_dinge': {
    de: 'In dieser Siedlung wurden schon zu viele Dinge verschoben.',
  },
  'fehler.db.siedlung.ding_ungueltig': {
    de: 'Dieses Ding lässt sich so nicht abstellen.',
  },
  'fehler.db.siedlung.stadt_ungueltig': {
    de: 'Die Umgebung in der Datei ist beschädigt oder zu groß.',
  },
  'fehler.siedlung_stadt': {
    de: 'Die Siedlung ist gespeichert, die Umgebung aber nicht: {grund} Lade die Datei noch einmal.',
  },
  'fehler.siedlung_dinge_laden': {
    de: 'Dinge der Siedlung laden: {grund}',
  },
  'fehler.siedlung_ding_setzen': {
    de: 'Ding abstellen: {grund}',
  },
  // Nacharbeit (E87b, 0048).
  'fehler.db.siedlung.zu_viele_eigene_dinge': {
    de: 'Du hast in dieser Siedlung schon 500 Dinge verschoben. Wem die Siedlung gehört, kann sie zurücksetzen.',
  },
  'fehler.siedlung_dinge_zuruecksetzen': {
    de: 'Dinge zurücksetzen: {grund}',
  },
  'fehler.siedlung_ersetzen': {
    de: 'Diese Siedlung lässt sich nicht ersetzen, es wurde nichts geändert: {grund}',
  },
  'fehler.db.grundriss.grundriss_fehlt': {
    de: 'Diesen Grundriss gibt es nicht mehr.',
  },
  'fehler.db.grundriss.zimmer_falsch': {
    de: 'Das ist kein Zimmer dieses Umzugs.',
  },
  'fehler.db.grundriss.zimmer_doppelt': {
    de: '{name} ist in diesem Grundriss schon gezeichnet.',
  },
  'fehler.db.grundriss.farbe_ungueltig': { de: 'Diese Farbe geht nicht.' },
  'fehler.db.grundriss.kisten_draussen': {
    de: 'Danach stünden {n} Kisten außerhalb, zum Beispiel {code}.',
  },
  'fehler.db.grundriss.zu_niedrig': {
    de: 'So niedrig passen {n} Kisten nicht mehr, zum Beispiel {code}.',
  },
  'fehler.db.grundriss.raum_fehlt': {
    de: 'Diesen Raum gibt es nicht mehr.',
  },
  'fehler.db.grundriss.oeffnung_kante': {
    de: 'Diese Wand gibt es nicht mehr.',
  },
  'fehler.db.grundriss.oeffnung_zu_breit': {
    de: 'Tür oder Fenster ist breiter als die Wand.',
  },
  'fehler.db.grundriss.oeffnung_zu_hoch': {
    de: 'Tür oder Fenster ist höher als der Raum.',
  },
  'fehler.db.grundriss.oeffnungen_ueberlappen': {
    de: 'Hier ist schon eine Tür oder ein Fenster.',
  },
  'fehler.db.grundriss.objekt_draussen': {
    de: '{name} ragt aus dem Raum.',
  },
  'fehler.db.grundriss.objekt_zu_hoch': {
    de: '{name} ist höher als der Raum.',
  },
  'fehler.db.grundriss.objekt_umhaengen': {
    de: 'Möbel bleiben im selben Grundriss.',
  },
  'fehler.db.grundriss.faecher_ungueltig': {
    de: 'Die Fächer von {name} passen nicht (mindestens 1 cm Platz je Fach).',
  },
  'fehler.db.grundriss.moebel_verknuepfung': {
    de: 'Nur ein Möbel-Eintrag dieses Umzugs lässt sich verknüpfen.',
  },
  'fehler.db.grundriss.moebel_schon_verknuepft': {
    de: 'Dieser Möbel-Eintrag gehört schon zu einem anderen Möbel.',
  },
  'fehler.db.grundriss.moebel_kein_platz': {
    de: 'Möbel stehen im Grundriss, nicht als Kiste.',
  },
  'fehler.db.grundriss.draussen': {
    de: '{code} stünde außerhalb des Raums.',
  },
  'fehler.db.grundriss.unterlage_fehlt': {
    de: 'Darunter steht nichts mehr. Bitte neu laden.',
  },
  'fehler.db.grundriss.unterlage_anderer_raum': {
    de: 'Die Unterlage steht in einem anderen Raum.',
  },
  'fehler.db.grundriss.kreis': {
    de: '{code} kann nicht auf {unter} liegen, das liegt schon auf {code}.',
  },
  'fehler.db.grundriss.nicht_darauf': {
    de: '{code} liegt nicht auf {unter}: die Mitte muss über der Kiste darunter sein.',
  },
  'fehler.db.grundriss.nicht_darauf_objekt': {
    de: '{code} steht nicht auf {name}.',
  },
  'fehler.db.grundriss.kein_regal': {
    de: '{name} hat keine Fächer.',
  },
  'fehler.db.grundriss.brett_belegt': {
    de: 'Auf diesem Brett in {name} steht noch {code}. Nimm die Kiste zuerst herunter.',
  },
  'fehler.db.grundriss.fach_fehlt': {
    de: 'Dieses Fach gibt es in {name} nicht.',
  },
  'fehler.db.grundriss.nicht_im_fach': {
    de: '{code} steht nicht in diesem Fach.',
  },
  'fehler.db.grundriss.ueberstand_zu_gross': {
    de: '{code} ragt {cm} cm aus {name} heraus, erlaubt sind höchstens {max} cm.',
  },
  'fehler.db.fuellstand': {
    de: 'Der Füllstand muss zwischen 0 und 100 Prozent liegen.',
  },
  'fehler.db.grundriss.zu_hoch': {
    de: '{code} ginge bis {oben} cm, Platz ist bis {grenze} cm.',
  },
  'fehler.db.grundriss.veraltet': {
    de: 'Jemand hat den Grundriss inzwischen geändert. Bitte neu laden.',
  },
  'fehler.db.grundriss.keine_rechte': {
    de: 'Das dürfen nur Bearbeiter.',
  },
  'fehler.db.grundriss.drehung': {
    de: 'Eine Kiste steht gerade oder quer, andere Drehungen gibt es nicht.',
  },
  'fehler.db.grundriss.fremde_id': {
    de: 'Das gehört zu einem anderen Grundriss. Bitte neu laden.',
  },
}
