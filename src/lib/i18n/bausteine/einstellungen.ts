import type { Woerterbuch } from '../woerter'

/* Einstellungen, Installationshinweis und Darstellungsschalter.
 * Der Name Magazino bleibt in beiden Sprachen stehen, ebenso VAPID und
 * Safari. Zahlen bleiben in westlichen Ziffern, weil dieselben Ziffern
 * auf den Etiketten stehen.
 */
export const einstellungen: Woerterbuch = {
  // -------------------------------------------------------------- Kopfzeile
  'einstellungen.titel': { de: 'Einstellungen' },

  // ----------------------------------------------------------------- Profil
  'einstellungen.profil': { de: 'Profil' },
  'einstellungen.ohne_namen': { de: 'Ohne Namen' },
  'einstellungen.anzeigename': { de: 'Anzeigename' },
  'einstellungen.anzeigename_hinweis': {
    de: 'So sehen dich die anderen in Umzügen und im Chat.',
  },
  'einstellungen.name_platzhalter': { de: 'Dein Name' },
  'einstellungen.name_gespeichert': { de: 'Name gespeichert' },

  // ------------------------------------------------- Figur in der Wohnung (E82)
  'einstellungen.figur': { de: 'Meine Figur in der Wohnung' },
  'einstellungen.figur_hinweis': {
    de: 'So sehen dich die anderen, wenn ihr gemeinsam in 3D durch die Wohnung geht.',
  },
  'einstellungen.figur_ungespeichert': { de: 'Noch nicht gespeichert.' },
  'einstellungen.figur_vorschau': {
    de: 'Vorschau deiner Figur. Ziehen dreht sie.',
  },
  'einstellungen.figur_laedt': { de: 'Vorschau lädt …' },
  'einstellungen.figur_vorschau_fehler': {
    de: 'Vorschau nicht geladen: {fehler}',
  },
  'einstellungen.figur_kein_3d': {
    de: 'Dieses Gerät kann kein 3D anzeigen. Speichern geht trotzdem.',
  },
  'einstellungen.figur_haut': { de: 'Hautton' },
  'einstellungen.figur_haare': { de: 'Haarfarbe' },
  'einstellungen.figur_frisur': { de: 'Frisur' },
  'einstellungen.figur_frisur_kurz': { de: 'Kurz' },
  'einstellungen.figur_frisur_lang': { de: 'Lang' },
  'einstellungen.figur_frisur_zopf': { de: 'Zopf' },
  'einstellungen.figur_frisur_glatze': { de: 'Glatze' },
  'einstellungen.figur_frisur_locken': { de: 'Locken' },
  'einstellungen.figur_oben': { de: 'Oberteil' },
  'einstellungen.figur_unten': { de: 'Hose' },
  'einstellungen.figur_schuhe': { de: 'Schuhe' },
  'einstellungen.figur_groesse': { de: 'Größe' },
  'einstellungen.figur_groesse_wert': { de: '{cm} cm' },
  'einstellungen.figur_statur': { de: 'Statur' },
  'einstellungen.figur_statur_schmal': { de: 'Schmal' },
  'einstellungen.figur_statur_mittel': { de: 'Mittel' },
  'einstellungen.figur_statur_breit': { de: 'Breit' },
  'einstellungen.figur_brille': { de: 'Brille' },
  'einstellungen.figur_farbe': { de: 'Farbe {n} von {von}' },
  'einstellungen.figur_speichern': { de: 'Figur speichern' },
  'einstellungen.figur_gespeichert': { de: 'Figur gespeichert' },
  'einstellungen.figur_standard': { de: 'Zurück zum Standard' },

  // --------------------------------------------------------------- Passwort
  'einstellungen.passwort': { de: 'Passwort' },
  'einstellungen.benutzername': { de: 'Benutzername' },
  'einstellungen.zwang_titel': { de: 'Bitte setze jetzt dein eigenes Passwort' },
  'einstellungen.zwang_text': {
    de: 'Dein Startpasswort kennt auch die Person, die dein Konto angelegt hat. Bis du ein eigenes hast, kommst du nicht weiter. Wähle unten ein neues.',
  },
  'einstellungen.passwort_nie_sichtbar': {
    de: 'Dein Passwort kann niemand sehen, auch kein Admin. Man kann es nur neu setzen.',
  },
  'einstellungen.neues_passwort': { de: 'Neues Passwort' },
  'einstellungen.passwort_hinweis': {
    de: 'Mindestens 10 Zeichen, mit Buchstaben und Ziffern, nicht dein Name. Mit dem Auge kannst du es anzeigen.',
  },
  'einstellungen.passwort_wiederholen': {
    de: 'Neues Passwort wiederholen',
  },
  'einstellungen.aendern': { de: 'Ändern' },
  'einstellungen.passwort_geaendert': {
    de: 'Passwort geändert. Auf allen anderen Geräten bist du jetzt abgemeldet.',
  },
  // Das Passwort steht, nur das Abmelden der anderen Geraete schlug fehl.
  'einstellungen.passwort_geaendert_andere_offen': {
    de: 'Passwort geändert. Andere Geräte konnten wir gerade nicht abmelden. Bist du dort noch angemeldet, melde dich dort selbst ab.',
  },
  'einstellungen.sicherheit_hinweis': {
    de: 'Die Verbindung läuft verschlüsselt, Passwörter liegen nur als Hash beim Anbieter. Deine Daten sieht nur, wer im jeweiligen Umzug eingetragen ist.',
  },

  // ----------------------------------------------------- Benachrichtigungen
  'einstellungen.benachrichtigungen': { de: 'Benachrichtigungen' },
  'einstellungen.dieses_geraet': { de: 'Auf diesem Gerät' },
  'einstellungen.push_unsupported': {
    de: 'Dieser Browser kann keine Push-Benachrichtigungen. Auf dem iPhone geht es erst, wenn Magazino auf dem Startbildschirm liegt.',
  },
  'einstellungen.push_no_key': {
    de: 'Auf dem Server ist kein VAPID-Schlüssel hinterlegt. Ohne den kann nichts verschickt werden.',
  },
  'einstellungen.push_denied': {
    de: 'Benachrichtigungen sind im Browser blockiert. Das musst du in den Seiteneinstellungen wieder erlauben.',
  },
  'einstellungen.push_default': { de: 'Noch nicht erlaubt.' },
  'einstellungen.push_granted_off': {
    de: 'Erlaubt, aber dieses Gerät ist nicht angemeldet.',
  },
  'einstellungen.push_granted_on': {
    de: 'Dieses Gerät bekommt Benachrichtigungen.',
  },
  'einstellungen.einschalten': { de: 'Einschalten' },
  'einstellungen.ausschalten': { de: 'Ausschalten' },
  'einstellungen.push_an': { de: 'Benachrichtigungen an' },
  'einstellungen.push_aus': { de: 'Auf diesem Gerät aus' },
  'einstellungen.laedt': { de: 'Einstellungen werden geladen' },
  'einstellungen.chat': { de: 'Chatnachrichten' },
  'einstellungen.chat_hinweis': { de: 'Einmal pro Nachricht.' },
  'einstellungen.anrufe': { de: 'Anrufe' },
  'einstellungen.anrufe_hinweis': {
    de: 'Wiederholt sich, solange es klingelt.',
  },
  'einstellungen.kisten': { de: 'Erinnerungen' },
  'einstellungen.kisten_hinweis': {
    de: 'Rückgabe fällig, Bestand wird knapp.',
  },

  // ---------------------------------------------------------------- Sprache
  'einstellungen.sprache': { de: 'Sprache' },

  // ------------------------------------------------------------ Darstellung
  'einstellungen.darstellung': { de: 'Darstellung' },
  'einstellungen.theme_system': { de: 'System' },
  'einstellungen.theme_hell': { de: 'Hell' },
  'einstellungen.theme_dunkel': { de: 'Dunkel' },
  'einstellungen.theme_kontrast': { de: 'Kontrast' },
  'einstellungen.theme_salbei': { de: 'Salbei' },
  'einstellungen.theme_ozean': { de: 'Ozean' },
  'einstellungen.theme_nacht': { de: 'Nacht' },
  'einstellungen.theme_graphit': { de: 'Graphit' },
  'einstellungen.theme_titel': { de: 'Darstellung: {wert}' },

  // --------------------------------------------------------------- Bewegung
  'einstellungen.bewegung': { de: 'Bewegung' },
  'einstellungen.bewegung_ruhig': { de: 'Ruhig' },
  'einstellungen.bewegung_ruhig_hinweis': {
    de: 'Nichts bewegt sich. Schont den Akku.',
  },
  'einstellungen.bewegung_normal': { de: 'Normal' },
  'einstellungen.bewegung_normal_hinweis': {
    de: 'Der Hintergrund steht fest, der Vordergrund scrollt darüber.',
  },
  'einstellungen.bewegung_voll': { de: 'Voll' },
  'einstellungen.bewegung_voll_hinweis': {
    de: 'Dazu driftende Kisten und atmende Lichter.',
  },

  // -------------------------------------------------------------------- App
  'einstellungen.app': { de: 'App' },
  'einstellungen.abmelden': { de: 'Abmelden' },
  'einstellungen.fusszeile': {
    de: 'Magazino . gebaut für den eigenen Umzug',
  },

  // --------------------------------------------------- Auf den Startbildschirm
  'einstellungen.install_ausblenden': { de: 'Hinweis ausblenden' },
  'einstellungen.install_titel': {
    de: 'Magazino auf den Startbildschirm',
  },
  'einstellungen.install_ios_1': { de: 'In Safari unten auf' },
  'einstellungen.install_ios_2': {
    de: 'Teilen tippen, dann auf Zum Home-Bildschirm. Danach startet Magazino wie eine normale App, mit Logo.',
  },
  'einstellungen.install_text': {
    de: 'Ein Tipp, und Magazino liegt mit Logo auf deinem Startbildschirm. Ohne Browserleiste, mit Benachrichtigungen.',
  },
  'einstellungen.install_knopf': { de: 'Jetzt installieren' },
  // Geraete (0063)
  'geraete.titel': { de: 'Geräte' },
  'geraete.laedt': { de: 'Lade Geräte' },
  'geraete.dieses': { de: 'Dieses Gerät' },
  'geraete.zuletzt': { de: 'Zuletzt aktiv {wann}' },
  'geraete.seit': { de: 'Angemeldet seit {wann}' },
  'geraete.abmelden': { de: 'Abmelden' },
  'geraete.hier_abmelden': { de: 'Hier abmelden' },
  'geraete.alle_anderen': { de: 'Alle anderen Geräte abmelden' },
  'geraete.nur_dieses': { de: 'Du bist nur auf diesem Gerät angemeldet.' },
  'geraete.abgemeldet': { de: 'Gerät abgemeldet.' },
  'geraete.alle_abgemeldet': { de: 'Alle anderen Geräte sind abgemeldet.' },
  'geraete.frage_titel': { de: 'Alle anderen Geräte abmelden?' },
  'geraete.frage_text': { de: '{n} andere Geräte werden abgemeldet. Dieses Gerät bleibt angemeldet. Sie müssen sich neu anmelden.' },
  'geraete.hinweis': { de: 'Erkennst du ein Gerät nicht, melde es ab und ändere dein Passwort. Ein abgemeldetes Gerät kann sich nicht mehr erneuern; sein letzter Zugang endet spätestens nach einer Stunde.' },
}
