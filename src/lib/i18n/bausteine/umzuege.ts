import type { Woerterbuch } from '../woerter'

/* Uebersicht der Umzuege, Startseite eines Umzugs und der Rahmen darum.
 * Aufbau je Eintrag:
 *   'schluessel': { de: 'Deutsch' }
 *
 * Namen von Umzuegen, Zimmern und Personen stehen hier nicht. Die hat der
 * Nutzer selbst eingetippt und bleiben in jeder Sprache so, wie sie sind.
 */
export const umzuege: Woerterbuch = {
  // ------------------------------------------------- Uebersicht, Begruessung
  'umzuege.hallo': { de: 'Hallo' },
  'umzuege.hallo_name': { de: 'Hallo, {name}' },
  'umzuege.blick': { de: 'Deine Lager auf einen Blick.' },

  // ---------------------------------------------------- Uebersicht, Knoepfe
  'umzuege.neu': { de: 'Neues Lager' },
  'umzuege.code_einloesen': { de: 'Code einlösen' },

  // ------------------------------------------------ Uebersicht, Liste leer
  'umzuege.laden': { de: 'Lager werden geladen' },
  'umzuege.leer_titel': { de: 'Noch kein Lager' },
  'umzuege.leer_hinweis': {
    de: 'Ein Lager ist die Klammer um alles: Bestand, Kisten, Ausleihen, Team und den Chat.',
  },
  'umzuege.leer_knopf': { de: 'Erstes Lager anlegen' },

  // ------------------------------------------------------ Karte eines Umzugs
  'umzuege.kein_vermerk': { de: 'Kein Vermerk' },
  'umzuege.umzug_am': { de: 'Am {datum}' },
  'umzuege.karte_kisten': { de: 'Kisten' },
  'umzuege.karte_dabei': { de: 'dabei' },
  'umzuege.karte_unterwegs': { de: '{n} unterwegs' },

  // ----------------------------------------------------- Dialog neuer Umzug
  'umzuege.toast_angelegt': { de: 'Lager angelegt' },
  'umzuege.name_platzhalter': { de: 'Lager Salzburg' },
  'umzuege.vermerk': { de: 'Vermerk' },
  'umzuege.vermerk_hinweis': {
    de: 'Optional, zum Beispiel die neue Adresse.',
  },
  'umzuege.standardzimmer': { de: 'Standardzimmer anlegen' },
  'umzuege.standardzimmer_hinweis': {
    de: 'Wohnzimmer, Küche, Schlafzimmer, Kinderzimmer, Bad, Flur, Keller. Kannst du danach ändern.',
  },

  // -------------------------------------------------------- Dialog beitreten
  'umzuege.beitreten_titel': { de: 'Einem Lager beitreten' },
  'umzuege.beitreten': { de: 'Beitreten' },
  'umzuege.toast_beigetreten': {
    de: 'Du bist jetzt bei {name} dabei',
  },
  'umzuege.einladungscode': { de: 'Einladungscode' },
  'umzuege.einladungscode_hinweis': {
    de: 'Den Code bekommst du von der Person, die das Lager angelegt hat.',
  },

  // ------------------------------------------- Startseite, Kopf und Zahlen
  'umzuege.einstellen': { de: 'Lager einstellen' },
  'umzuege.zaehlwerte_laden': { de: 'Zählwerte werden geladen' },
  'umzuege.a_von_b': { de: '{a} von {b}' },

  // -------------------------------------------------- Startseite, Schnellzugriff
  'umzuege.kiste_anlegen': { de: 'Kiste anlegen' },
  'umzuege.etiketten': { de: 'Etiketten' },

  // ------------------------------------------ Startseite, Zimmer und Personen
  'umzuege.zimmer_ueberschrift': { de: 'Zimmer' },
  'umzuege.verwalten': { de: 'Verwalten' },
  'umzuege.keine_zimmer': { de: 'Noch keine Zimmer' },
  'umzuege.keine_zimmer_hinweis': {
    de: 'Lege zuerst die Bereiche an. Jedes Zimmer bekommt ein Kürzel, damit die Kisten eine Nummer bekommen können.',
  },
  'umzuege.bereiche_anlegen': { de: 'Bereiche anlegen' },
  'umzuege.zaehlwerte_fehler': { de: 'Zählwerte nicht geladen' },
  'umzuege.wird_gezaehlt': { de: 'wird gezählt' },
  'umzuege.noch_keine_kisten': { de: 'noch keine Kisten' },

  // ---------------------------------------------------- Startseite, Verlauf
  'umzuege.zuletzt': { de: 'Zuletzt passiert' },
  'umzuege.verlauf_zeigen': { de: 'Verlauf zeigen' },
  'umzuege.verlauf_verbergen': { de: 'Verlauf einklappen' },
  'umzuege.verlauf_loeschen': { de: 'Verlauf löschen' },
  'umzuege.verlauf_loeschen_frage': {
    de: 'Der ganze Verlauf dieses Lagers wird gelöscht, auch der Verlauf jeder einzelnen Kiste. Kisten und Inhalte bleiben. Das lässt sich nicht rückgängig machen.',
  },
  'umzuege.verlauf_geloescht': { de: 'Verlauf gelöscht' },
  'umzuege.verlauf_laden': { de: 'Verlauf wird geladen' },
  'umzuege.verlauf_leer': {
    de: 'Noch nichts passiert. Sobald Kisten angelegt oder gescannt werden, steht es hier.',
  },
  'umzuege.jemand': { de: 'Jemand' },
  'umzuege.eine_kiste': { de: 'eine Kiste' },
  'umzuege.ereignis_angelegt': { de: 'hat {code} angelegt' },
  'umzuege.ereignis_status': { de: 'hat {status} gesetzt' },
  'umzuege.ereignis_scan': { de: 'hat gescannt' },
  'umzuege.ereignis_code': {
    de: 'hat den Code auf {code} geändert',
  },
  'umzuege.ereignis_menge': { de: 'Menge geändert: {text} ({von} auf {nach})' },
  'umzuege.ereignis_umgepackt': { de: '{text} umgepackt nach {code}' },

  // ------------------------------------------------- Startseite, Fusszeile
  'umzuege.alle_kisten': { de: 'Alle Kisten' },
  'umzuege.etiketten_liste': { de: 'Etiketten und Liste' },
  'umzuege.team': { de: 'Team' },
  'umzuege.andere': { de: 'Andere Lager' },

  // ------------------------------------------------------------- Der Rahmen
  'umzuege.umzug_laden': { de: 'Lager wird geladen' },
  'umzuege.zur_uebersicht': { de: 'Zur Übersicht' },

  // ---------------------------------------------- Siedlung, schon beim Start
  // Der Knopf oben und sein Schalter in den Einstellungen sind zu sehen,
  // bevor die Siedlung geladen ist. Alle anderen Saetze der Siedlung laden
  // erst mit ihr (bausteine/siedlung.ts).
  'nav.siedlung': { de: 'Siedlung' },
  'einstellungen.siedlung_knopf': { de: 'Siedlung-Knopf zeigen' },
  'einstellungen.siedlung_knopf_hinweis': {
    de: 'Oben rechts neben dem Profil. Ausgeschaltet bleibt alles andere gleich.',
  },
}
