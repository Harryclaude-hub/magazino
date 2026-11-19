import type { Woerterbuch } from '../woerter'

/* Startseite und 404. Alle Schluessel beginnen mit start., die der
 * Fehlerseite zusaetzlich mit start.nichtgefunden.
 *
 * Der Name Magazino bleibt in beiden Sprachen Magazino. Die Beispielcodes
 * W-3-007, KZ-7-012 und S-1-003 bleiben ebenfalls unveraendert, sie stehen
 * genauso auf den gedruckten Etiketten.
 */
export const start: Woerterbuch = {
  // ------------------------------------------------------------ Kopfzeile
  'start.zur_app': { de: 'Zur App' },
  'start.anmelden': { de: 'Anmelden' },
  'start.loslegen': { de: 'Loslegen' },

  // ------------------------------------------------------------------ Hero
  'start.badge': { de: 'Umzugsplanung' },
  'start.hero_1': { de: 'Jede Kiste hat' },
  'start.hero_2': { de: 'eine Nummer.' },
  /* Die dritte Zeile steht bei 375px allein auf einer Zeile, darum kurz. */
  'start.hero_3': { de: 'Und du weißt, wo sie ist.' },
  'start.hero_text': {
    de: 'Magazino vergibt für jedes Zimmer und jede Person ein Kürzel, nummeriert jede Kiste automatisch, druckt die Etiketten mit QR-Code und zeigt dir beim Einzug in Sekunden, was schon da ist und was noch fehlt.',
  },
  'start.kostenlos_starten': { de: 'Kostenlos starten' },
  'start.habe_konto': { de: 'Ich habe schon ein Konto' },
  'start.kein_link': {
    de: 'E-Mail und Passwort genügen. Kein Bestätigungslink nötig.',
  },

  // ------------------------------------------------- Etikett in der Vorschau
  'start.demo_zimmer': { de: 'Kinderzimmer' },
  'start.demo_inhalt_1': { de: 'Bücher vom Regal' },
  'start.demo_inhalt_2': { de: 'Lego Kiste' },
  'start.demo_inhalt_3': { de: 'Bettwäsche' },
  'start.demo_inhalt_4': { de: 'Nachtlicht' },

  // ------------------------------------------------------- Das Nummernsystem
  'start.nummer_titel': { de: 'So liest sich eine Nummer' },
  'start.nummer_text': {
    de: 'Der Code steht auf jedem Etikett und ist überall gleich aufgebaut. Man versteht ihn ohne Erklärung, auch wenn man nur beim Tragen hilft.',
  },
  'start.teil_kuerzel_text': {
    de: 'Zimmer oder Person. W für Wohnzimmer, KZ für Kinderzimmer, S für Sara.',
  },
  'start.teil_groesse_text': {
    de: '1 ist die kleinste Kiste mit 15 Litern, 10 die größte mit 100 Litern. Steht immer rot, damit man die Traglast sofort sieht.',
  },
  'start.teil_nummer_titel': { de: 'Laufnummer' },
  'start.teil_nummer_text': {
    de: 'Fortlaufend je Kürzel. Wird automatisch vergeben, nie doppelt.',
  },
  'start.beispiele': { de: 'Beispiele' },

  // ------------------------------------------------------------- Vier Schritte
  'start.schritte_titel': { de: 'In vier Schritten' },
  'start.schritt1_titel': { de: 'Bereiche anlegen' },
  'start.schritt1_text': {
    de: 'Jedes Zimmer und jede Person bekommt einen Namen, ein Kürzel und eine Farbe. Wohnzimmer wird W, Kinderzimmer wird KZ, Sara wird S.',
  },
  'start.schritt2_titel': { de: 'Kisten nummerieren' },
  'start.schritt2_text': {
    de: 'Jede Kiste gehört zu einem Zimmer, einer Person oder beidem. Magazino vergibt den Code automatisch, fortlaufend und ohne Dopplung.',
  },
  'start.schritt3_titel': { de: 'Etiketten drucken' },
  'start.schritt3_text': {
    de: 'QR-Code, Nummer, Farbe und die Inhaltsliste auf ein Blatt. Ausdrucken, aufkleben, fertig.',
  },
  'start.schritt4_titel': { de: 'Scannen und abhaken' },
  'start.schritt4_text': {
    de: 'In der neuen Wohnung scannen. Rot heißt noch alte Wohnung, grün heißt angekommen. Alle sehen es sofort.',
  },

  // ---------------------------------------------------------------- Funktionen
  'start.funktionen_titel': { de: 'Alles drin' },
  'start.f_qr_titel': { de: 'QR-Code je Kiste' },
  'start.f_qr_text': {
    de: 'Jede Kiste hat ihren eigenen Code und ihre eigene Seite.',
  },
  'start.f_etiketten_titel': { de: 'Druckfertige Etiketten' },
  'start.f_etiketten_text': {
    de: 'A5, A4 oder A3, frei konfigurierbar, mit oder ohne Inhaltsliste.',
  },
  'start.f_scanner_titel': { de: 'Scanner eingebaut' },
  'start.f_scanner_text': {
    de: 'Mit der Handykamera scannen, Status in einem Tipp ändern.',
  },
  'start.f_inhalt_titel': { de: 'Inhalt, Fotos, Notizen' },
  'start.f_inhalt_text': {
    de: 'Was drin ist, sieht man ohne die Kiste zu öffnen.',
  },
  'start.f_gruppen_titel': { de: 'Gruppen teilen' },
  'start.f_gruppen_text': {
    de: 'Familie und Helfer einladen, jeder sieht denselben Stand.',
  },
  'start.f_chat_titel': { de: 'Chat und Anrufe' },
  'start.f_chat_text': {
    de: 'Sprachnachrichten, Bilder, Reaktionen und Verweise auf Kisten.',
  },
  'start.f_start_titel': { de: 'Auf den Startbildschirm' },
  'start.f_start_text': {
    de: 'Installiert sich wie eine App, mit Benachrichtigungen.',
  },
  'start.f_zugriff_titel': { de: 'Zugriff streng getrennt' },
  'start.f_zugriff_text': {
    de: 'Nur wer im Umzug ist, sieht dessen Daten. Datenbankseitig geprüft.',
  },

  // ----------------------------------------------------------------- Abschluss
  'start.schluss_titel': {
    de: 'Der nächste Umzug wird langweilig.',
  },
  'start.schluss_text': {
    de: 'Genau so soll er sein. Anlegen, drucken, kleben, scannen.',
  },
  'start.konto_anlegen': { de: 'Konto anlegen' },
  'start.fuss': {
    de: 'Gebaut für genau einen Umzug. Und für jeden danach.',
  },

  // -------------------------------------------------------------- Seite fehlt
  'start.nichtgefunden.text': {
    de: 'Diese Seite gibt es nicht. Vielleicht wurde der Umzug gelöscht oder der Link ist alt.',
  },
  'start.nichtgefunden.zurueck': { de: 'Zur Übersicht' },
}
