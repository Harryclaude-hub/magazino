import type { Woerterbuch } from '../woerter'

/* Chat und Anrufe.
 *
 * Jeder Schluessel beginnt mit chat., damit sich nichts mit einem anderen
 * Baustein ueberschneidet. Navigation, Aktionen und Zustaende stehen schon
 * in gemeinsam.ts und werden von hier aus nur benutzt.
 *
 * Der Nachrichtentext selbst ist Nutzereingabe und steht nie hier. Ebenso
 * wenig Namen, Zimmernamen, Kistentitel und der Name des Umzugs. Was in
 * geschweiften Klammern steht, wird beim Uebersetzen eingesetzt und bleibt
 * unveraendert.
 */
export const chat: Woerterbuch = {
  // ----------------------------------------------------------- Kopfzeile
  'chat.anrufen': { de: 'Anrufen' },
  'chat.videoanruf': { de: 'Videoanruf' },

  // -------------------------------------------------------- Verlauf laden
  'chat.laedt': { de: 'Nachrichten werden geladen' },
  'chat.aeltere': { de: 'Ältere Nachrichten' },
  'chat.leer_titel': { de: 'Noch keine Nachricht' },
  'chat.leer_hinweis': {
    de: 'Hier besprecht ihr den Umzug. Du kannst Kisten und Zimmer verlinken, Bilder hereinziehen oder einfach einfügen.',
  },
  'chat.teilweise_geladen': {
    de: 'Neue Nachricht nur teilweise geladen: {grund}',
  },

  // ----------------------------------------------------------- Tagestrenner
  'chat.heute': { de: 'Heute' },
  'chat.gestern': { de: 'Gestern' },

  // ------------------------------------------------------ Nachrichtenarten
  'chat.geloescht': { de: 'Nachricht gelöscht' },
  'chat.geloescht_kurz': { de: 'gelöscht' },
  'chat.bearbeitet': { de: 'bearbeitet' },
  'chat.sprachnachricht': { de: 'Sprachnachricht' },
  'chat.bild': { de: 'Bild' },
  'chat.datei': { de: 'Datei' },
  'chat.bild_gross': { de: 'Bild groß anzeigen' },
  'chat.bild_schliessen': { de: 'Bild schließen' },
  'chat.bild_nicht_erreichbar': {
    de: 'Das Bild ist gerade nicht erreichbar.',
  },
  'chat.datei_nicht_erreichbar': {
    de: 'Die Datei ist gerade nicht erreichbar.',
  },

  // -------------------------------------------------------------- Aktionen
  'chat.reagieren': { de: 'Reagieren' },
  'chat.antworten': { de: 'Antworten' },
  'chat.loeschen': { de: 'Nachricht löschen' },
  /* Die arabische Vorsilbe haengt ohne Leerzeichen am folgenden Zeichen. */
  'chat.mit_reagieren': { de: 'Mit {emoji} reagieren' },
  'chat.reaktion_umschalten': {
    de: '{emoji} {n}, antippen zum Ändern',
  },

  // --------------------------------------------------------------- Antwort
  'chat.antwort_an': { de: 'Antwort an {name}' },
  'chat.antwort_verwerfen': { de: 'Antwort verwerfen' },

  // -------------------------------------------------------------- Anhaenge
  'chat.bild_datei': { de: 'Bild oder Datei senden' },
  'chat.anhaenge_offen.eins': {
    de: '{n} Anhang, noch nicht gesendet',
  },
  'chat.anhaenge_offen.viele': {
    de: '{n} Anhänge, noch nicht gesendet',
  },
  'chat.anhang_entfernen': { de: '{name} entfernen' },
  'chat.datei_zu_gross': {
    de: '{name} ist zu groß. Höchstens 25 MB.',
  },
  /* Wenn ein eingefuegtes Bild gar keinen Dateinamen mitbringt. */
  'chat.bild_dateiname': { de: 'Bild.png' },
  'chat.abwurf_titel': { de: 'Loslassen zum Senden' },
  'chat.abwurf_hinweis': {
    de: 'Bilder und Dateien einfach hier fallen lassen.',
  },
  'chat.kein_datei_abwurf': { de: 'Da war keine Datei dabei.' },

  // ---------------------------------------------------------------- Eingabe
  'chat.platzhalter': { de: 'Nachricht' },
  'chat.senden': { de: 'Senden' },
  'chat.verwerfen': { de: 'Verwerfen' },

  // --------------------------------------------------------------- Aufnahme
  'chat.aufnehmen': {
    de: 'Sprachnachricht aufnehmen, gedrückt halten',
  },
  'chat.abspielen': { de: 'Abspielen' },
  'chat.pause': { de: 'Pause' },
  'chat.aufnahme_nicht_moeglich': {
    de: 'Dieser Browser kann keine Sprachnachrichten aufnehmen.',
  },
  'chat.mikrofon_abgelehnt': {
    de: 'Zugriff auf das Mikrofon wurde abgelehnt.',
  },
  'chat.aufnahme_fehler': { de: 'Aufnahme nicht möglich: {grund}' },
  'chat.aufnahme_zu_kurz': {
    de: 'Zu kurz. Halte den Knopf gedrückt, solange du sprichst.',
  },

  // -------------------------------------------------------- Verlinken
  'chat.verlinken': { de: 'Kiste oder Zimmer verlinken' },
  'chat.verlinken_titel': { de: 'Kiste oder Bereich verlinken' },
  'chat.verlinken_suche': {
    de: 'Nummer, Titel oder Zimmer suchen',
  },
  'chat.sucht': { de: 'sucht' },

  // ----------------------------------------------------------- Namen
  'chat.jemand': { de: 'Jemand' },
  'chat.du': { de: 'Du' },

  // ------------------------------------------------- Benachrichtigungen
  'chat.push_neue_nachricht': { de: 'Neue Nachricht' },
  'chat.push_sprachnachricht': { de: 'Sprachnachricht, {dauer}' },

  // ------------------------------------------------------- Anruf, eingehend
  'chat.anruf_eingehend': { de: 'Anruf in {umzug}' },
  'chat.anruf_eingehend_video': {
    de: 'Videoanruf in {umzug}',
  },
  'chat.anruf_annehmen': { de: 'Annehmen' },
  'chat.anruf_ablehnen': { de: 'Ablehnen' },
  'chat.anruf_ruft_an': { de: '{name} ruft an' },
  'chat.anruf_push_video': { de: '{umzug}, Videoanruf' },

  // --------------------------------------------------------- Anruf, laufend
  'chat.anruf_laeuft': { de: 'Anruf läuft' },
  'chat.anruf_laeuft_video': { de: 'Videoanruf läuft' },
  'chat.anruf_verbunden.eins': { de: '{n} verbunden' },
  'chat.anruf_verbunden.viele': { de: '{n} verbunden' },
  'chat.anruf_verbindet': { de: 'verbindet' },
  'chat.anruf_fehlgeschlagen': { de: 'Verbindung fehlgeschlagen' },
  'chat.mikro_an': { de: 'Mikrofon an' },
  'chat.mikro_aus': { de: 'Mikrofon aus' },
  'chat.kamera_an': { de: 'Kamera an' },
  'chat.kamera_aus': { de: 'Kamera aus' },
  'chat.auflegen': { de: 'Auflegen' },

  // ---------------------------------------------------------- Anruf, Ende
  'chat.anruf_niemand_da': {
    de: 'In diesem Umzug ist sonst niemand, den man anrufen könnte.',
  },
  'chat.anruf_niemand_ran': { de: 'Niemand ist rangegangen.' },
  'chat.anruf_beendet_kurz': { de: 'Anruf beendet' },
  'chat.anruf_beendet': { de: 'Anruf beendet, {dauer}' },
  'chat.anruf_abgelehnt': { de: 'Anruf abgelehnt' },
  'chat.anruf_nicht_angenommen': { de: 'Anruf nicht angenommen' },
}
