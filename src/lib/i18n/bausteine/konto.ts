import type { Woerterbuch } from '../woerter'

/* Anmelden, Konto anlegen und Passwort zuruecksetzen. Alle Schluessel
 * beginnen mit konto.
 *
 * konto.passwort_anzeigen und konto.passwort_verbergen stehen absichtlich
 * nicht hier, sondern in gemeinsam.ts, weil ui.tsx sie direkt braucht.
 */
export const konto: Woerterbuch = {
  // ------------------------------------------------------- Rahmen und Kopf
  'konto.startseite': { de: 'Startseite' },

  // ------------------------------------------------------------- Anmelden
  'konto.anmelden': { de: 'Anmelden' },
  'konto.anmelden_unter': {
    de: 'Mit E-Mail und Passwort.',
  },
  'konto.noch_kein_konto': { de: 'Noch kein Konto?' },
  'konto.jetzt_anlegen': { de: 'Jetzt anlegen' },

  // ---------------------------------------------------------------- Felder
  'konto.email': { de: 'E-Mail' },
  'konto.login': { de: 'E-Mail oder Benutzername' },
  // Bewusst allgemein: verraet nicht, ob es den Namen gibt.
  'konto.login_falsch': { de: 'Benutzername, E-Mail oder Passwort stimmt nicht.' },
  'konto.email_platzhalter': { de: 'du@beispiel.de' },
  'konto.passwort': { de: 'Passwort' },
  'konto.passwort_platzhalter': { de: 'Dein Passwort' },
  'konto.passwort_vergessen': { de: 'Passwort vergessen' },

  // -------------------------------------------------------- Konto anlegen
  'konto.konto_anlegen': { de: 'Konto anlegen' },
  'konto.konto_anlegen_unter': {
    de: 'Name ist freiwillig. E-Mail und Passwort brauchst du.',
  },
  'konto.schon_konto': { de: 'Schon ein Konto?' },
  'konto.name_hinweis': {
    de: 'Optional. So sehen dich die anderen im Umzug.',
  },
  'konto.name_platzhalter': { de: 'Karam' },
  'konto.passwort_kurz': {
    de: 'Nimm mindestens 10 Zeichen, darunter mindestens einen Buchstaben (a bis z) und eine Ziffer.',
  },
  'konto.passwort_min': { de: 'Mindestens 10 Zeichen, mit Buchstaben und Ziffern.' },
  'konto.passwort_hinweis': {
    de: 'Mindestens 10 Zeichen, mit Buchstaben und Ziffern. Mit dem Auge im Feld kannst du es anzeigen.',
  },
  'konto.neues_passwort_platzhalter': { de: 'Neues Passwort' },
  'konto.fast_fertig': { de: 'Fast fertig' },
  'konto.bestaetigung_noetig': {
    de: 'Konto angelegt. Dieses Supabase-Projekt verlangt noch eine Bestätigung per E-Mail. Schau in dein Postfach, dann kannst du dich anmelden.',
  },
  'konto.zur_anmeldung': { de: 'Zur Anmeldung' },

  // --------------------------------------------------- Passwort vergessen
  'konto.reset_titel': { de: 'Passwort zurücksetzen' },
  'konto.reset_unter': {
    de: 'Wir schicken dir einen Link, mit dem du ein neues Passwort setzt.',
  },
  'konto.zurueck_anmeldung': { de: 'Zurück zur Anmeldung' },
  // Immer derselbe Satz, ob es ein Konto gibt oder nicht.
  'konto.reset_unterwegs_titel': { de: 'Schau in dein Postfach' },
  'konto.reset_unterwegs_text': {
    de: 'Wenn es zu dieser Adresse ein Konto gibt, ist jetzt eine E-Mail mit einem Link unterwegs. Der Link gilt eine Stunde und nur einmal.',
  },
  'konto.reset_zu_viele': {
    de: 'Gerade wurden zu viele Links angefordert. Warte ein paar Minuten und versuch es dann noch einmal.',
  },
  'konto.reset_keine_verbindung': {
    de: 'Keine Verbindung zum Server. Prüf das Internet und versuch es noch einmal.',
  },
  'konto.link_schicken': { de: 'Link schicken' },
  'konto.link_nochmal': { de: 'Link nochmal schicken' },
  'konto.link_nochmal_warten': {
    de: 'Nochmal schicken geht in {s} s',
  },
  'konto.andere_adresse': { de: 'Andere Adresse eingeben' },

  // ------------------------------------------------------- Neues Passwort
  'konto.neues_passwort': { de: 'Neues Passwort' },
  'konto.neues_passwort_unter': {
    de: 'Setze jetzt dein neues Passwort.',
  },
  'konto.link_wird_geprueft': { de: 'Link wird geprüft' },
  'konto.link_weiter': { de: 'Weiter zum neuen Passwort' },
  'konto.link_weiter_text': {
    de: 'Tipp auf den Knopf, um den Link einzulösen. Erst danach kannst du ein neues Passwort setzen.',
  },
  'konto.link_ungueltig': { de: 'Dieser Link ist ungültig' },
  'konto.link_ungueltig_text': {
    de: 'Er ist unvollständig oder schon abgelaufen. Fordere einen neuen Link an.',
  },
  'konto.link_fehler': {
    de: 'Mit diesem Link hat es nicht geklappt. Fordere bitte einen neuen an.',
  },
  'konto.link_anderes_geraet_titel': { de: 'Anderer Browser?' },
  'konto.angemeldet_einstellungen': {
    de: 'Du bist angemeldet. Dein Passwort änderst du in den Einstellungen.',
  },
  'konto.zu_den_einstellungen': { de: 'Zu den Einstellungen' },
  'konto.neuen_link': { de: 'Neuen Link anfordern' },
  'konto.passwort_nochmal': { de: 'Passwort wiederholen' },
  'konto.passwoerter_ungleich': {
    de: 'Die beiden Passwörter sind nicht gleich.',
  },
  'konto.passwort_speichern': { de: 'Passwort speichern' },
  'konto.passwort_geaendert': { de: 'Passwort geändert' },
  'konto.andere_abgemeldet': {
    de: 'Auf allen anderen Geräten bist du jetzt abgemeldet.',
  },
  // Das Passwort steht, nur das Abmelden der anderen Geraete schlug fehl.
  'konto.andere_nicht_abgemeldet': {
    de: 'Andere Geräte konnten wir gerade nicht abmelden. Bist du dort noch angemeldet, melde dich dort selbst ab.',
  },
  // Oben im Formular: fuer welches Konto das neue Passwort gilt.
  'konto.passwort_fuer': {
    de: 'Neues Passwort für {email}',
  },
  // Vor dem Klick war hier ein anderes Konto angemeldet als das aus dem Link.
  'konto.anderes_konto_titel': { de: 'Achtung: anderes Konto' },
  'konto.anderes_konto_text': {
    de: 'Dieser Link gehört nicht zu dem Konto, mit dem du hier angemeldet warst. Das neue Passwort gilt für {email}. Mit deinem bisherigen Konto bist du auf diesem Gerät abgemeldet. Willst du für {email} kein neues Passwort setzen, tippe unten auf „Abbrechen und abmelden“ und melde dich danach mit deinem bisherigen Konto wieder an.',
  },
  // Der Vorgang lief schon und wurde anderswo beendet (anderer Tab).
  'konto.link_beendet_titel': { de: 'Vorgang beendet' },
  'konto.link_beendet_text': {
    de: 'Das Zurücksetzen wurde beendet, zum Beispiel in einem anderen Tab. Brauchst du noch ein neues Passwort, fordere einen neuen Link an.',
  },
  'konto.abbrechen_abmelden': { de: 'Abbrechen und abmelden' },
  'konto.weiter_geht_es': { de: 'Weiter geht es.' },
}
