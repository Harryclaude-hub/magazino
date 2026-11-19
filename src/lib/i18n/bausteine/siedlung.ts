import type { Woerterbuch } from '../woerter'

/* Die Siedlung (E83): Liste, Einrichten und die Ansicht in 3D.
 *
 * Wie plan3d.ts steht dieser Baustein NICHT in woerter.ts, sondern laedt
 * mit den Seiten der Siedlung (pages/Siedlungen.tsx und
 * pages/SiedlungAnsicht.tsx rufen woerterNachladen). Beim Start der App
 * kommt davon nichts mit. Was schon vorher zu sehen ist (der Knopf oben
 * und der Schalter in den Einstellungen), steht darum in umzuege.ts.
 *
 * Einfache Woerter: Siedlung, Haus, Stockwerk, Wohnung, Aufzug. Adresse,
 * Namen und Stockwerk der eigenen Wohnung stehen nie hier, nur in der
 * Datenbank. */
export const siedlungWoerter: Woerterbuch = {
  // ------------------------------------------------------------- Liste
  'siedlung.titel': { de: 'Siedlung' },
  'siedlung.laden': { de: 'Siedlung laden' },
  'siedlung.laden_hinweis': {
    de: 'Wähle die Datei deiner Siedlung (endet auf .json). Die App trägt die Häuser, alle Wohnungen und die Deko mit deinem Konto ein. Das musst du nur einmal machen.',
  },
  'siedlung.laden_laeuft': { de: 'Siedlung wird eingetragen' },
  'siedlung.geladen': { de: 'Siedlung eingetragen' },
  'siedlung.deko_ok': { de: 'Deko und Schalter sind in deinem Grundriss' },
  'siedlung.deko_fehler': {
    de: 'Die Siedlung ist da, aber Deko und Schalter kamen nicht in den Grundriss: {grund}',
  },
  'siedlung.datei_fehler': { de: 'Die Datei passt nicht: {grund}' },
  'siedlung.datei_zu_gross': { de: 'zu groß' },
  'siedlung.datei_kein_json': { de: 'keine JSON-Datei' },
  'siedlung.datei_falsche_art': { de: 'keine Siedlungs-Datei von Magazino' },
  'siedlung.zurueck_start': { de: 'Zur Startseite' },
  'siedlung.intro': {
    de: 'Die Häuser rund um dein Zuhause in 3D, mit deiner Wohnung darin. Du gehst durch das Haus, das Treppenhaus und mit dem Aufzug.',
  },
  'siedlung.anlegen': { de: 'Siedlung anlegen' },
  'siedlung.laedt': { de: 'Siedlungen werden geladen' },
  'siedlung.leer_titel': { de: 'Noch keine Siedlung' },
  'siedlung.leer_hinweis': {
    de: 'Such deine Adresse, wähl die Häuser rundherum und setz deine Wohnung hinein. Dann gehst du in 3D durch die Siedlung, das Treppenhaus und den Aufzug.',
  },
  'siedlung.haeuser_zahl': { de: 'Häuser: {n}' },
  'siedlung.wohnung_in': { de: 'Deine Wohnung: {haus}, {stock}' },
  'siedlung.ohne_wohnung': { de: 'Noch ohne eigene Wohnung' },
  'siedlung.ansehen': { de: 'Ansehen' },
  'siedlung.loeschen_titel': { de: 'Siedlung löschen?' },
  'siedlung.loeschen_text': {
    de: '„{name}“ wird gelöscht. Deine Umzüge und Grundrisse bleiben, wie sie sind.',
  },
  'siedlung.geloescht': { de: 'Siedlung gelöscht' },
  'siedlung.gespeichert': { de: 'Siedlung gespeichert' },

  // ------------------------------------------------- Stockwerke, Aussehen
  'siedlung.geschoss_eg': { de: 'Erdgeschoss' },
  'siedlung.geschoss_n': { de: '{n}. Stock' },
  'siedlung.stil_weiss_loggia': { de: 'Weiß mit Loggien' },
  'siedlung.stil_holz': { de: 'Holz' },
  'siedlung.stil_putz': { de: 'Hell verputzt' },
  'siedlung.stil_grau': { de: 'Grau' },

  // ------------------------------------------------------- Einrichten
  'siedlung.einrichten_titel': { de: 'Siedlung einrichten' },
  'siedlung.bearbeiten_titel': { de: 'Siedlung bearbeiten' },
  'siedlung.schritt_von': { de: 'Schritt {nr} von {von}: {name}' },
  'siedlung.schritt_adresse': { de: 'Adresse' },
  'siedlung.schritt_haeuser': { de: 'Häuser' },
  'siedlung.schritt_wohnung': { de: 'Wohnung' },
  'siedlung.schritt_speichern': { de: 'Speichern' },

  // Schritt 1: Adresse
  'siedlung.adresse_platzhalter': { de: 'Straße Hausnummer, Ort' },
  'siedlung.adresse_hinweis': {
    de: 'Die Suche fragt OpenStreetMap. Gespeichert wird nur der Punkt auf der Karte, nicht die Adresse.',
  },
  'siedlung.sucht': { de: 'Suche läuft' },
  'siedlung.keine_treffer': {
    de: 'Nichts gefunden. Versuch es mit Straße, Hausnummer und Ort.',
  },
  'siedlung.treffer_waehlen': { de: 'Tipp auf den richtigen Ort.' },

  // Schritt 2: Haeuser
  'siedlung.haeuser_laden': { de: 'Häuser in der Nähe werden geladen' },
  'siedlung.haeuser_leer': {
    de: 'Rund um diesen Punkt zeigt die Karte keine Häuser. Such eine andere Adresse.',
  },
  'siedlung.haeuser_hinweis': {
    de: 'Tipp auf ein Haus, um es dazuzunehmen oder wegzulassen.',
  },
  'siedlung.haeuser_neu_laden': { de: 'Häuser in der Nähe neu laden' },
  'siedlung.haeuser_gewaehlt': { de: 'Ausgewählt: {n}' },
  'siedlung.haus_name': { de: 'Name des Hauses' },
  'siedlung.haus_vorschlag': { de: 'Haus {nr}' },
  'siedlung.geschosse': { de: 'Stockwerke' },
  'siedlung.geschosse_nur_eg': { de: '1 (nur Erdgeschoss)' },
  'siedlung.geschosse_zahl': { de: '{n} (Erdgeschoss + {oben})' },
  'siedlung.stil': { de: 'Aussehen' },
  'siedlung.weglassen': { de: 'Weglassen' },
  'siedlung.mindestens_ein_haus': { de: 'Wähl mindestens ein Haus.' },
  'siedlung.karte': { de: 'Häuser von oben, Norden ist oben' },
  'siedlung.norden': { de: 'N' },
  'siedlung.massstab': { de: '{m} m' },

  // Schritt 3: Wohnung
  'siedlung.wohnung_frage': { de: 'Welche Wohnung ist deine?' },
  'siedlung.wohnung_hinweis': {
    de: 'Nimm einen Grundriss aus einem deiner Umzüge. Er bleibt im Umzug, die Siedlung zeigt ihn nur.',
  },
  'siedlung.grundrisse_laden': { de: 'Grundrisse werden geladen' },
  'siedlung.grundrisse_leer': {
    de: 'Du hast noch keinen Grundriss. Zeichne ihn zuerst in einem Umzug, dann setzt du ihn hier ein. Ohne Wohnung geht es auch.',
  },
  'siedlung.grundriss': { de: 'Grundriss' },
  'siedlung.keine_wohnung': { de: 'Keine Wohnung' },
  'siedlung.haus': { de: 'Haus' },
  'siedlung.stockwerk': { de: 'Stockwerk' },
  'siedlung.platzieren_hinweis': {
    de: 'Zieh die Wohnung an ihre Stelle im Haus. Die Pfeile schieben in kleinen Schritten, die runden Pfeile drehen.',
  },
  'siedlung.drehen_links': { de: 'Nach links drehen' },
  'siedlung.drehen_rechts': { de: 'Nach rechts drehen' },
  'siedlung.schieben_norden': { de: 'Nach Norden schieben' },
  'siedlung.schieben_sueden': { de: 'Nach Süden schieben' },
  'siedlung.schieben_westen': { de: 'Nach Westen schieben' },
  'siedlung.schieben_osten': { de: 'Nach Osten schieben' },
  'siedlung.in_die_mitte': { de: 'In die Mitte des Hauses' },
  'siedlung.ausserhalb': {
    de: 'Die Wohnung ragt aus dem Haus heraus. Schieb sie ganz hinein.',
  },
  'siedlung.grundriss_laedt': { de: 'Grundriss wird geladen' },
  'siedlung.grundriss_fehlt': {
    de: 'Diesen Grundriss gibt es nicht mehr. Wähl einen anderen.',
  },
  'siedlung.grundriss_unbekannt': { de: 'Grundriss nicht gefunden' },
  'siedlung.grundriss_ohne_raeume': {
    de: 'Dieser Grundriss hat noch keine Räume. Zeichne sie zuerst.',
  },
  'siedlung.wohnung_karte': { de: 'Deine Wohnung im Haus, von oben' },

  // Schritt 4: Speichern
  'siedlung.name': { de: 'Name der Siedlung' },
  'siedlung.name_vorschlag': { de: 'Meine Siedlung' },
  'siedlung.name_hinweis': { de: 'Ein Name für dich, etwa „Zuhause“.' },
  'siedlung.name_fehlt': { de: 'Gib der Siedlung einen Namen.' },

  // ------------------------------------------------------- Ansicht in 3D
  'siedlung.zur_wohnung': { de: 'Zur Wohnung' },
  'siedlung.von_oben': { de: 'Von oben' },
  'siedlung.ansicht_laedt': { de: 'Siedlung wird geladen' },
  'siedlung.nicht_gefunden': {
    de: 'Diese Siedlung gibt es nicht (mehr).',
  },
  'siedlung.zur_liste': { de: 'Zu den Siedlungen' },
  'siedlung.wohnung_fehlt': {
    de: 'Der Grundriss deiner Wohnung fehlt. Die Siedlung wird ohne ihn gezeigt.',
  },
  'siedlung.3d_fehler': {
    de: 'Die Häuser in 3D konnten nicht geladen werden: {fehler}',
  },
  'siedlung.welt_fehler': {
    de: 'Die Häuser konnten nicht gebaut werden: {fehler}',
  },
  'siedlung.ebene_jetzt': { de: 'Du bist hier: {name}' },
  'siedlung.haus_stock': { de: '{haus}, {stock}' },
  'siedlung.aufzug': { de: 'Aufzug: Stockwerk wählen' },

  // ------------------------------------------- Liste der Wohnungen (E84)
  // E87: die Liste heisst "Orte" (Wohnungen, Geschaefte, Feuerwehr, Spital).
  'siedlung.orte': { de: 'Orte' },
  'siedlung.orte_hilfe': {
    de: 'Wohnungen, Geschäfte und andere Orte: antippen und hingehen',
  },
  'siedlung.orte_laedt': { de: 'Die Häuser werden noch gebaut' },
  'siedlung.orte_suchen': { de: 'Suchen, etwa Top 12 oder Feuerwehr' },
  'siedlung.orte_leer': {
    de: 'In dieser Siedlung gibt es noch keine Orte zum Hingehen.',
  },
  'siedlung.orte_keine_treffer': { de: 'Kein Ort passt zu „{suche}“.' },
  'siedlung.springen_hinweis': {
    de: 'Tipp auf einen Ort, dann gehst du dort weiter.',
  },
  'siedlung.springen': { de: 'Hingehen' },
  'siedlung.springen_zu': { de: 'Zu {name} gehen' },

  // ------------------------------------------ Gemeinsame Siedlung (E86)
  // Leute einladen, entfernen, verlassen
  'siedlung.leute': { de: 'Leute' },
  'siedlung.leute_hilfe': {
    de: 'Leute einladen und sehen, wer dabei ist',
  },
  'siedlung.leute_titel': { de: 'Leute in der Siedlung' },
  'siedlung.leute_fehler_kurz': {
    de: 'Die Leute konnten nicht geladen werden. Tippe hier für Details.',
  },
  'siedlung.zu_gast': { de: 'Du bist hier zu Gast' },
  'siedlung.start': { de: 'Start am Hauseingang' },
  'siedlung.einladen_titel': { de: 'Jemanden einladen' },
  'siedlung.einladen_feld': { de: 'E-Mail oder Name' },
  'siedlung.einladen_hinweis': {
    de: 'Die Person braucht ein Magazino-Konto. Ein Name geht nur, wenn ihn genau eine Person hat; sonst nimm die E-Mail.',
  },
  'siedlung.einladen': { de: 'Einladen' },
  'siedlung.einladen_leer': { de: 'Gib eine E-Mail oder einen Namen ein.' },
  'siedlung.einladen_fehler': { de: 'Einladen ging nicht: {grund}' },
  'siedlung.einladung_ok': {
    de: '{name} ist jetzt dabei und kann die Siedlung öffnen.',
  },
  'siedlung.einladung_nicht_gefunden': {
    de: 'Niemand mit dieser E-Mail oder diesem Namen gefunden. Die Person braucht ein Magazino-Konto.',
  },
  'siedlung.einladung_mehrdeutig': {
    de: 'Diesen Namen haben mehrere Leute. Nimm bitte die E-Mail-Adresse.',
  },
  'siedlung.einladung_schon_drin': { de: 'Diese Person ist schon dabei.' },
  'siedlung.einladung_selbst': { de: 'Das bist du selbst.' },
  'siedlung.einladung_zu_viele': {
    de: 'Das geht gerade nicht: zu viele Leute oder zu viele Versuche. Entferne jemanden oder versuch es später noch einmal.',
  },
  'siedlung.mitglieder': { de: 'Dabei' },
  'siedlung.mitglieder_laedt': { de: 'Leute werden geladen' },
  'siedlung.mitglieder_leer': {
    de: 'Noch niemand eingeladen. Wer dabei ist, geht mit dir durch die Siedlung, und ihr hört euch.',
  },
  'siedlung.rolle_besitzer': { de: 'Besitzer' },
  'siedlung.rolle_gast': { de: 'Gast' },
  // E87b: Leute im Umzug der eigenen Wohnung des Besitzers (kein Gast).
  'siedlung.rolle_umzug': { de: 'im Umzug' },
  'siedlung.umzug_hinweis': {
    de: 'Du bist über den Umzug dieser Wohnung dabei. Einladen kann nur, wem die Siedlung gehört.',
  },
  'siedlung.gaeste_zahl': { de: 'Gäste: {n} von {max}' },
  'siedlung.du': { de: 'Du' },
  'siedlung.entfernen': { de: 'Entfernen' },
  'siedlung.entfernen_name': { de: '{name} entfernen' },
  'siedlung.entfernen_frage': {
    de: '{name} entfernen? Die Person kann die Siedlung dann nicht mehr öffnen.',
  },
  'siedlung.entfernt': { de: '{name} ist nicht mehr dabei.' },
  'siedlung.gast_hinweis': {
    de: 'Du bist Gast in dieser Siedlung. Einladen kann nur, wem sie gehört.',
  },
  'siedlung.verlassen': { de: 'Siedlung verlassen' },
  'siedlung.verlassen_frage': {
    de: '„{name}“ verlassen? Du kannst die Siedlung dann erst wieder öffnen, wenn du neu eingeladen wirst.',
  },
  'siedlung.verlassen_ok': { de: 'Du hast die Siedlung verlassen.' },
  'siedlung.aktion_fehler': { de: 'Das ging nicht: {grund}' },

  // Zusammen in 3D: wer da ist, Sprechen, Verbindung
  'siedlung.leute_da': { de: 'Mit dir in der Siedlung: {n}' },
  'siedlung.mikro_hilfe': {
    de: 'Mit Mikrofon hören dich alle, die gerade auch durch die Siedlung gehen, lauter, je näher sie stehen.',
  },
  'siedlung.live_anmeldung': {
    de: 'Verbindung zur Siedlung nicht aufgebaut: {grund}',
  },
  'siedlung.live_kanal': {
    de: 'Die Verbindung zu den anderen in der Siedlung ist gestört. Du siehst sie gerade nicht.',
  },
  'siedlung.live_zeit': {
    de: 'Die anderen in der Siedlung antworten nicht. Es wird weiter versucht.',
  },
  'siedlung.live_zu': {
    de: 'Die Verbindung zu den anderen in der Siedlung wurde beendet.',
  },

  // Minikarte
  'siedlung.minikarte': { de: 'Karte' },
  'siedlung.minikarte_bild': {
    de: 'Karte der Siedlung von oben, Norden ist oben. Tippe auf ein Haus, um hinzugehen.',
  },
  'siedlung.minikarte_zu': { de: 'Karte einklappen' },
  'siedlung.minikarte_auf': { de: 'Karte zeigen' },
  'siedlung.minikarte_du': { de: 'Du' },
  'siedlung.minikarte_naeher': { de: 'Näher heran' },
  'siedlung.minikarte_weiter': { de: 'Weiter weg' },

  // ---------------------------------- Stadtteil, Dinge, Wohnung (E87)
  'siedlung.zu_unserer_wohnung': { de: 'Zu unserer Wohnung' },
  'siedlung.zu_unserer_wohnung_hilfe': {
    de: 'Zu eurer Wohnung in der Siedlung gehen (leer, wie geplant)',
  },
  'siedlung.eingerichtet': { de: 'Eingerichtet ansehen' },
  'siedlung.eingerichtet_hilfe': {
    de: 'Die eingerichtete Wohnung im Umzug öffnen: Grundriss, dann 3D und Begehen',
  },
  'siedlung.dinge_laden_fehler': {
    de: 'Wo Dinge und Autos zuletzt standen, konnte nicht geladen werden: {grund}',
  },
  'siedlung.dinge_speichern_fehler': {
    de: 'Wo das Ding jetzt steht, wurde nicht gespeichert: {grund}',
  },
  // E87b: Fehler je Ding; mehrere nicht gespeichert, dazu der juengste Grund.
  'siedlung.dinge_speichern_fehler_n': {
    de: 'Wo verschobene Dinge jetzt stehen, wurde nicht gespeichert (Anzahl: {anzahl}): {grund}',
  },
  'siedlung.dinge_ohne_rahmen': {
    de: 'Wo Dinge und Autos stehen, wird gerade weder geladen noch gespeichert: Diese Siedlung kann ihre Lage noch nicht umrechnen.',
  },
  'siedlung.dinge_umrechnen_fehler': {
    de: 'Einige Dinge konnten nicht an ihren gespeicherten Platz gestellt oder dort gespeichert werden.',
  },
  'siedlung.dinge_zuruecksetzen': { de: 'Dinge zurücksetzen' },
  'siedlung.dinge_zuruecksetzen_hilfe': {
    de: 'Alle verschobenen Dinge und Autos wieder an ihren Startplatz stellen',
  },
  'siedlung.dinge_zuruecksetzen_frage': {
    de: 'Alle verschobenen Dinge und Autos wieder an ihren Startplatz stellen? Das gilt für alle in der Siedlung und lässt sich nicht rückgängig machen.',
  },
  'siedlung.dinge_zuruecksetzen_ja': { de: 'Zurücksetzen' },
  'siedlung.dinge_zurueckgesetzt': { de: 'Dinge zurückgesetzt: {n}' },
  'siedlung.dinge_zuruecksetzen_fehler': { de: 'Zurücksetzen ging nicht: {grund}' },
  // E87b: herausgenommen, waehrend die Siedlung offen war.
  'siedlung.nicht_mehr_dabei': { de: 'Du bist nicht mehr in dieser Siedlung.' },
  'siedlung.nicht_mehr_dabei_hinweis': {
    de: 'Wem die Siedlung gehört, hat dich herausgenommen. Die Verbindung zu den anderen ist beendet. Lädt man dich wieder ein, kannst du sie wieder öffnen.',
  },

  // ------------------------------- Aus Datei aktualisieren, Umgebung (E87)
  'siedlung.aus_datei': { de: 'Aus Datei aktualisieren' },
  'siedlung.aus_datei_hilfe': {
    de: 'Die Siedlung aus einer neuen Datei (.json) laden, etwa mit der Umgebung. Sie ersetzt diese Siedlung; Gäste und verschobene Dinge bleiben.',
  },
  'siedlung.aus_datei_laeuft': { de: 'Siedlung wird aktualisiert' },
  'siedlung.aktualisiert': { de: 'Siedlung aktualisiert' },
  'siedlung.umgebung_fehler': { de: 'Die Umgebung konnte nicht gebaut werden' },
  'siedlung.umgebung_fehler_grund': {
    de: 'Die Umgebung konnte nicht gebaut werden: {grund}',
  },
}
