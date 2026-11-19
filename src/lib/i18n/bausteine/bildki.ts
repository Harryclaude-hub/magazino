import type { Woerterbuch } from '../woerter'

/* Bilderkennung.
 *
 * Die Texte sagen ausdruecklich, was passiert: dass das Bild den Server
 * verlaesst, dass es Geld kostet, und dass ein Vorschlag ein Vorschlag
 * bleibt, bis jemand ihn uebernimmt.
 */
export const bildki: Woerterbuch = {
  'bildki.titel': { de: 'Aus dem Foto lesen' },
  'bildki.knopf': { de: 'Inhalt aus Foto lesen' },
  'bildki.knopf_kurz': { de: 'Foto lesen' },
  'bildki.laeuft': { de: 'Das Bild wird gelesen' },
  'bildki.fortschritt': {
    de: 'Foto {n} von {gesamt} wird gelesen',
  },
  'bildki.seit': { de: 'Läuft seit' },
  'bildki.dauer': {
    de: 'Ein Foto dauert höchstens 20 Sekunden.',
  },
  'bildki.erklaerung': {
    de: 'Die Erkennung sieht sich das Foto an und trägt alles, was sie findet, gleich in die Inhaltsliste ein. Danach findest du es über die Suche. Was nicht stimmt, löschst du in der Liste.',
  },

  'bildki.keine_bilder': {
    de: 'Es gibt noch kein Foto zum Lesen. Mach zuerst eins.',
  },
  'bildki.kein_ergebnis': {
    de: 'Auf diesem Bild war nichts zu erkennen. Ein Foto von näher dran oder bei besserem Licht hilft meistens.',
  },
  'bildki.bild_nummer': { de: 'Bild {n}' },
  'bildki.unvollstaendig': {
    de: 'Nach 20 Sekunden war die Liste noch nicht fertig. Eingetragen ist, was bis dahin erkannt war. Für den Rest ein zweites Foto von näher dran machen.',
  },

  'bildki.uebernehmen': { de: 'Übernehmen' },
  'bildki.alle_uebernehmen': { de: 'Alle gewählten übernehmen' },
  'bildki.uebernommen.eins': { de: '1 Zeile übernommen' },
  'bildki.uebernommen.viele': { de: '{n} Zeilen übernommen' },
  'bildki.teilweise_uebernommen': {
    de: '{ok} übernommen, {fehler} nicht. Grund: {grund}',
  },
  'bildki.nichts_gewaehlt': { de: 'Nichts ausgewählt' },
  'bildki.schon_drin': { de: 'Steht schon in der Liste' },

  'bildki.stufe_sicher': { de: 'Sicher' },
  'bildki.stufe_wahrscheinlich': { de: 'Wahrscheinlich' },
  'bildki.stufe_unsicher': { de: 'Unsicher' },
  'bildki.stufe_hinweis': {
    de: 'Die Stufe ist eine Selbsteinschätzung der Erkennung, keine Messung. Sieh die unsicheren Zeilen durch, bevor du sie übernimmst.',
  },

  'bildki.menge': { de: 'Menge' },
  'bildki.zeile_aendern': { de: 'Zeile ändern' },

  'bildki.kostet': {
    de: 'Jedes neue Bild kostet einen Bruchteil eines Cent. Ein Bild, das schon gelesen wurde, kostet nichts mehr.',
  },
  'bildki.aus_speicher': { de: 'Schon gelesen' },
  'bildki.alles_gelesen': {
    de: 'Alle Fotos sind schon gelesen. Mit "Neu lesen" liest du sie noch einmal.',
  },
  'bildki.neu_lesen': { de: 'Neu lesen' },
  'bildki.neu_lesen_frage': {
    de: 'Das Bild wird noch einmal gelesen und kostet wieder. Die bisherigen Vorschläge gehen dabei verloren.',
  },
  'bildki.rest': {
    de: 'Heute noch frei: {projekt} für diesen Umzug, {nutzer} für dich in dieser Stunde.',
  },
  'bildki.noch_ungelesen.eins': {
    de: 'Ein Foto ist noch nicht gelesen. Tippe noch einmal auf "Foto lesen", dann kommt es dran.',
  },
  'bildki.noch_ungelesen.viele': {
    de: '{n} Fotos sind noch nicht gelesen. Je Durchgang gehen höchstens {max}. Tippe noch einmal auf "Foto lesen", dann kommen die nächsten dran.',
  },
  'bildki.grenze_erreicht': {
    de: 'Die Grenze für heute ist erreicht. {n} Bilder sind darum liegen geblieben. Morgen geht es weiter.',
  },

  'bildki.dienst': {
    de: 'Gelesen wird mit dem offenen Modell Qwen bei OVHcloud in Frankreich.',
  },
  'bildki.datenschutz': {
    de: 'Zum Lesen wird das Bild an den Erkennungsdienst geschickt. Fotografier nichts, was niemanden angeht: Papiere, Rezepte, Ausweise.',
  },

  'bildki.sprache_anders': {
    de: 'Diese Vorschläge wurden auf {sprache} gelesen. Sie bleiben so stehen, denn ab jetzt sind sie dein Inhalt.',
  },
  'bildki.sprache_de': { de: 'Deutsch' },
  'bildki.sprache_ar': { de: 'Arabisch' },

  'bildki.kein_schluessel_titel': { de: 'Die Erkennung ist noch nicht eingeschaltet' },
  'bildki.kein_schluessel': {
    de: 'Es fehlt der Schlüssel für den Erkennungsdienst. Er wird einmal im Supabase-Projekt als Function Secret OVH_AI_ENDPOINTS_TOKEN hinterlegt. Danach läuft es ohne weiteres Zutun.',
  },
  // Eigene Saetze fuer die Fehler, die die Erkennung mit Kennung meldet.
  'bildki.fehler.zu_lang': {
    de: 'Auf dem Bild war so viel, dass die Antwort abgeschnitten wurde. Fotografiere die Lage in zwei Teilen.',
  },
  'bildki.fehler.zeit': {
    de: 'In 20 Sekunden kam keine Liste zurück. Versuch es gleich noch einmal, am besten mit einem Foto von näher dran.',
  },
  'bildki.fehler.abgemeldet': {
    de: 'Deine Anmeldung ist abgelaufen. Melde dich neu an und versuch es dann noch einmal.',
  },
  'bildki.fehler.langsam': {
    de: 'Der Erkennungsdienst hat nicht geantwortet. Versuch es gleich noch einmal.',
  },
  'bildki.fehler.modell_fehler': {
    de: 'Der Erkennungsdienst hat einen Fehler gemeldet. Versuch es noch einmal.',
  },
  'bildki.fehler.denkt': {
    de: 'Die Erkennung hat zu lange überlegt statt zu antworten. Versuch es noch einmal.',
  },
  'bildki.fehler.kein_mitglied': {
    de: 'Du bist in diesem Umzug nicht Mitglied.',
  },
  'bildki.fehler.foto_weg': {
    de: 'Dieses Foto gibt es nicht mehr. Lade die Seite neu.',
  },
  'bildki.fehler.zu_viele': {
    de: 'Zu viele Fotos auf einmal. Versuch es noch einmal.',
  },
  'bildki.fehler.netz': {
    de: 'Keine Verbindung zur Erkennung. Prüf das Internet und versuch es noch einmal.',
  },
  'bildki.fehler.unbekannt': {
    de: 'Das Lesen hat nicht geklappt. Versuch es noch einmal.',
  },
  'bildki.fehler.dienst_voll': {
    de: 'Der Erkennungsdienst ist gerade ausgelastet. Versuch es in einer Minute noch einmal.',
  },
  'bildki.fehler.schluessel_falsch': {
    de: 'Der Schlüssel für den Erkennungsdienst wird nicht angenommen. Prüf OVH_AI_ENDPOINTS_TOKEN in Supabase.',
  },
  'bildki.fehler.format': {
    de: 'Dieses Foto hat ein Format, das die Erkennung nicht lesen kann. Nimm es noch einmal auf.',
  },
  'bildki.fehler.unlesbar': {
    de: 'Die Erkennung hat keine brauchbare Liste geliefert. Versuch es noch einmal.',
  },
  'bildki.fehler.zu_gross': {
    de: 'Das Foto ist zu groß für die Erkennung.',
  },
  'bildki.nur_lesen': {
    de: 'Nur Bearbeiter dürfen Bilder lesen lassen.',
  },
}
