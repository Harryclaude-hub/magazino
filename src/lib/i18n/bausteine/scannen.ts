import type { Woerterbuch } from '../woerter'

/* Der Scan-Bereich: Kamera, Eingabe von Hand, Trefferkarte, Sitzungsliste.
 *
 * Seriennummern und Kuerzel stehen hier nur als Platzhalter {code}. Sie
 * werden nie uebersetzt und bleiben auch im arabischen Satz von links nach
 * rechts, dafuer sorgt die Klasse t-serial.
 */
export const scannen: Woerterbuch = {
  // ------------------------------------------------------------- Kopfzeile
  'scannen.untertitel_alle': { de: 'Jede Kiste, jeder Umzug' },
  'scannen.nur_nachschlagen': { de: 'Nur nachschlagen' },
  'scannen.setzt_automatisch': { de: 'Setzt automatisch: {wert}' },

  // --------------------------------------------------------- Eingabe, Suche
  'scannen.von_hand': { de: 'Code von Hand eingeben' },
  'scannen.von_hand_hinweis': {
    de: 'Falls der QR-Code beschädigt oder weg ist.',
  },
  'scannen.wird_gesucht': { de: 'Kiste wird gesucht' },

  // --------------------------------------------------------- Kein Treffer
  'scannen.nichts_dazu': { de: 'Dazu gibt es nichts' },
  'scannen.nichts_dazu_hinweis': {
    de: 'Das steckt in keinem deiner Umzüge. Vielleicht gehört das Etikett zu einem Umzug, in dem du noch nicht bist. Lass dir einen Einladungscode geben.',
  },
  'scannen.nichts_im_umzug': {
    de: 'In diesem Umzug gibt es nichts zu {code}',
  },

  // ----------------------------------------------------------- Trefferkarte
  'scannen.etikett_veraltet': {
    de: 'Dieses Etikett ist veraltet. Am besten neu bekleben.',
  },
  'scannen.heisst_jetzt': { de: 'Die Kiste heißt jetzt' },
  'scannen.alter_code': {
    de: 'Achtung: {code} ist ein alter Code, das Etikett ist veraltet.',
  },
  /* Nur die Beschriftung. Der Code steht daneben als eigenes Stueck mit
   * t-serial, sonst stuende eine Nummer ohne Halt im arabischen Satz. */
  'scannen.note_alter_code': { de: 'Alter Code' },
  'scannen.ohne_namen': { de: 'Kiste ohne Namen' },
  'scannen.groesse_zerbrechlich': { de: '{groesse}, zerbrechlich' },
  'scannen.mehrfach.eins': {
    de: 'Denselben Code trägt noch eine weitere Kiste in einem anderen Umzug.',
  },
  'scannen.mehrfach.viele': {
    de: 'Denselben Code tragen noch {n} weitere Kisten in anderen Umzügen.',
  },
  'scannen.nicht_gesetzt': { de: 'nicht gesetzt' },
  'scannen.status_jetzt': { de: 'so steht die Kiste gerade' },
  'scannen.stueck': { de: '{n} Stück' },
  'scannen.foto_alt': { de: 'Foto der Kiste' },
  'scannen.foto_fehlt': { de: 'nicht ladbar' },

  // ------------------------------------------------------------- Zielknoepfe
  'scannen.zur_kiste': { de: 'Zur Kiste' },
  'scannen.zum_zimmer': { de: 'Zum Zimmer' },
  'scannen.zum_umzug': { de: 'Zum Umzug' },
  'scannen.zu_meinen_umzuegen': { de: 'Zu meinen Umzügen' },
  'scannen.alle_umzuege': { de: 'Über alle Umzüge scannen' },

  // ----------------------------------------------------------- Schalter
  'scannen.auto_label': {
    de: 'Beim Scannen direkt auf Angekommen setzen',
  },
  'scannen.auto_hinweis': {
    de: 'Scannen, grün, nächste Kiste. Ohne Haken wird nur nachgeschlagen.',
  },
  'scannen.auto_eingestellt': { de: 'Gerade eingestellt: {wert}' },
  'scannen.auto_label_kurz': { de: 'Beim Scannen Status setzen' },
  'scannen.auto_hinweis_kurz': {
    de: 'So geht der Einzug schnell: scannen, grün, nächste Kiste.',
  },

  // --------------------------------------------------------- Sitzungsliste
  'scannen.sitzung': {
    de: 'In dieser Sitzung gescannt ({n})',
  },
  'scannen.liste_leeren': { de: 'Liste leeren' },
  'scannen.gescannt_um': { de: 'Gescannt um {zeit}' },
  'scannen.leer_titel': { de: 'Noch nichts gescannt' },
  'scannen.leer_hinweis_alle': {
    de: 'Halte den QR-Code vom Etikett in den Rahmen. Jede Kiste landet hier, egal zu welchem Umzug sie gehört.',
  },
  'scannen.leer_hinweis_umzug': {
    de: 'Halte den QR-Code vom Etikett in den Rahmen. Jeder Treffer landet hier in der Liste.',
  },

  // ------------------------------------------------------------- Meldungen
  'scannen.status_gesetzt': { de: '{code} auf {wert} gesetzt' },
  'scannen.status_nicht_geaendert': {
    de: 'Status nicht geändert: {grund}',
  },
  'scannen.ist_angekommen': { de: '{code} ist angekommen' },
  'scannen.gefunden': { de: '{code} gefunden' },
  'scannen.anderer_umzug': {
    de: 'Diese Kiste gehört zu einem anderen Umzug.',
  },
  'scannen.fremdes_etikett': { de: 'Etikett aus einem anderen Umzug?' },
  'scannen.nur_dieser_umzug': {
    de: 'Hier wird nur in {name} gesucht. Der große Scan-Bereich zeigt Treffer aus allen deinen Umzügen.',
  },
  'scannen.nicht_sichtbar': {
    de: 'Diese Kiste ist für dich nicht sichtbar',
  },
  'scannen.nicht_sichtbar_hinweis': {
    de: 'Wahrscheinlich gehört der Code zu einem Umzug, in dem du nicht bist. Lass dir einen Einladungscode geben.',
  },

  // ----------------------------------------------------------------- Kamera
  'scannen.kamera_laeuft_nicht': { de: 'Kamera läuft nicht' },
  'scannen.kamera_kein_zugriff': {
    de: 'Dieser Browser gibt keinen Zugriff auf die Kamera.',
  },
  'scannen.kamera_abgelehnt': {
    de: 'Der Zugriff auf die Kamera wurde abgelehnt. In den Seiteneinstellungen des Browsers wieder erlauben.',
  },
  'scannen.kamera_nicht_gefunden': {
    de: 'Es wurde keine Kamera gefunden.',
  },
  'scannen.kamera_fehler': {
    de: 'Kamera nicht verfügbar: {grund}',
  },
  'scannen.licht_an': { de: 'Licht einschalten' },
  'scannen.licht_aus': { de: 'Licht ausschalten' },
  'scannen.treffer': { de: 'Treffer' },
  'scannen.rahmen_hinweis': { de: 'QR-Code in den Rahmen halten' },
}
