import type { Woerterbuch } from '../woerter'

/* Texte der Druckansicht.
 *
 * Auf dem Etikett selbst wird nur uebersetzt, was zum Programm gehoert:
 * die Groessenangabe, das Wort Zerbrechlich, das Ziel, der Status und die
 * Spaltenkoepfe der Inhaltstabelle. Zimmername, Personenname, Kistentitel
 * und die Inhaltszeilen hat der Nutzer eingetippt und bleiben stehen. Die
 * Seriennummer bleibt in jeder Sprache gleich.
 */
export const etiketten: Woerterbuch = {
  // ------------------------------------------------------------- Kopfzeile
  'etiketten.titel': { de: 'Etiketten' },
  'etiketten.pro_seite': { de: '{n} pro Seite' },

  // --------------------------------------------------- Papier und Raster
  'etiketten.papier_mass': { de: '{name} . {b} x {h} mm' },
  'etiketten.pro_seite_mass': {
    de: '{n} pro Seite . {b} x {h} mm',
  },

  // ---------------------------------------- Was auf dem Etikett steht
  'etiketten.modus.nummer': {
    de: 'Nur die Seriennummer, sehr groß',
  },
  'etiketten.modus.qr': { de: 'Seriennummer und QR-Code' },
  'etiketten.modus.tabelle': {
    de: 'Seriennummer, QR-Code und Inhaltstabelle',
  },

  // ------------------------------------------------------------- Auswahl
  'etiketten.welche_kisten': { de: 'Welche Kisten' },
  'etiketten.nur_auswahl': {
    de: 'Nur die {n} ausgewählten Kisten.',
  },
  'etiketten.nur_eine_kiste': {
    de: 'Es wird nur diese eine Kiste gedruckt. Ohne den Link oben kommst du zur vollständigen Auswahl.',
  },
  'etiketten.alle_zimmer': { de: 'Alle Zimmer' },
  'etiketten.alle_personen': { de: 'Alle Personen' },

  // --------------------------------------------------- Papier und Inhalt
  'etiketten.papier_und_inhalt': { de: 'Papier und Inhalt' },
  'etiketten.papierformat': { de: 'Papierformat' },
  'etiketten.papierformat_hinweis': {
    de: 'Dieses Format wird auch wirklich gedruckt.',
  },
  'etiketten.was_steht_drauf': { de: 'Was steht auf dem Etikett' },
  'etiketten.pro_seite_label': { de: 'Etiketten pro Seite' },
  'etiketten.pro_seite_hinweis': {
    de: 'Dahinter steht die Kachelgröße.',
  },

  // ---------------------------------------------------------- Feinheiten
  'etiketten.feinheiten': { de: 'Feinheiten' },
  'etiketten.standard': { de: 'Standard' },
  'etiketten.exemplare': { de: 'Exemplare je Kiste' },
  'etiketten.exemplare_hinweis': {
    de: 'Zwei Etiketten kleben auf zwei Seiten.',
  },
  'etiketten.zeilen_inhalt': { de: 'Zeilen Inhalt' },
  'etiketten.alles_anzeigen': { de: 'Alles anzeigen' },
  'etiketten.zeilen_n': { de: '{n} Zeilen' },

  // ------------------------------------------------------------ Schalter
  'etiketten.schalter_zimmername': { de: 'Zimmername' },
  'etiketten.schalter_farbbalken': { de: 'Farbbalken' },
  'etiketten.schalter_groesse': { de: 'Größe als Text' },
  'etiketten.schalter_umzugsname': { de: 'Name des Umzugs' },
  'etiketten.schalter_schnittlinien': { de: 'Schnittlinien' },

  // ---------------------------------------------------------- Zustaende
  'etiketten.kisten_laden': { de: 'Kisten werden geladen' },
  'etiketten.nichts_zu_drucken': { de: 'Nichts zu drucken' },
  'etiketten.leer_einzeln': {
    de: 'Diese Kiste gibt es nicht mehr. Öffne die Etiketten über den Umzug, dann siehst du alle Kisten.',
  },
  'etiketten.leer_filter': {
    de: 'Zu dieser Auswahl gibt es keine Kisten. Ändere den Filter oder lege zuerst Kisten an.',
  },

  // ------------------------------------------------- Satz ueber der Vorschau
  'etiketten.keine_auswahl': { de: 'Noch keine Etiketten ausgewählt.' },
  'etiketten.anzahl.eins': { de: '{n} Etikett' },
  'etiketten.anzahl.viele': { de: '{n} Etiketten' },
  'etiketten.seiten.eins': { de: '{n} Seite' },
  'etiketten.seiten.viele': { de: '{n} Seiten' },
  'etiketten.vorschau_satz': {
    de: '{etiketten} auf {seiten} {format}, jedes Etikett {b} x {h} mm.',
  },
  'etiketten.druck_hinweis': {
    de: 'Im Druckfenster ist {format} schon vorgegeben. Hintergrundgrafiken einschalten, damit Farbbalken und rote Ziffer mitkommen.',
  },

  // ----------------------------------------------- Auf dem Etikett selbst
  'etiketten.groesse_von_zehn': { de: 'Größe {n} von 10' },
  'etiketten.groesse_liter': { de: 'Größe {n} · {liter} l' },
  'etiketten.zerbrechlich': { de: 'ZERBRECHLICH' },
  'etiketten.nach_ziel': { de: 'nach {ziel}' },
  'etiketten.kein_inhalt': { de: 'Kein Inhalt eingetragen' },
  'etiketten.menge': { de: 'Menge' },
  'etiketten.bezeichnung': { de: 'Bezeichnung' },
  'etiketten.weitere_nicht_gedruckt': {
    de: 'weitere, hier nicht gedruckt',
  },
  'etiketten.groesse_eigene': { de: 'Größe: {name}' },
}
