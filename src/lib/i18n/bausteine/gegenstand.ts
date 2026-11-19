import type { Woerterbuch } from '../woerter'

/* Einzelne Gegenstaende (Lampe, Staubsauger, Bild): ohne Kiste, mit Foto
 * und ungefaehrer Groesse. In der Datenbank Eintraege mit kind 'other'.
 * Dazu die Zahlen der Zimmerseite: Moebel, Regale, Kisten, Gegenstaende. */
export const gegenstand: Woerterbuch = {
  'gegenstand.anlegen': { de: 'Gegenstand anlegen' },
  'gegenstand.titel': { de: 'Neuer Gegenstand' },
  'gegenstand.name': { de: 'Was ist es?' },
  'gegenstand.name_platzhalter': { de: 'z. B. Stehlampe, Staubsauger' },
  'gegenstand.name_fehlt': { de: 'Bitte einen Namen eingeben.' },
  'gegenstand.zimmer': { de: 'Zimmer' },
  'gegenstand.zimmer_fehlt': { de: 'Bitte ein Zimmer wählen.' },
  'gegenstand.zimmer_waehlen': { de: 'Zimmer wählen' },
  'gegenstand.foto': { de: 'Foto' },
  'gegenstand.foto_machen': { de: 'Foto machen' },
  'gegenstand.foto_anderes': { de: 'Anderes Foto' },
  'gegenstand.foto_weg': { de: 'Foto entfernen' },
  'gegenstand.kein_bild': { de: 'Das ist kein Bild.' },
  'gegenstand.groesse': { de: 'Ungefähre Größe' },
  'gegenstand.groesse_hinweis': {
    de: 'Grob reicht. Leer lassen geht auch, dann gilt eine mittlere Kiste.',
  },
  'gegenstand.klein': { de: 'Klein' },
  'gegenstand.mittel': { de: 'Mittel' },
  'gegenstand.gross': { de: 'Groß' },
  'gegenstand.lang': { de: 'Lang' },
  'gegenstand.laenge': { de: 'Länge (cm)' },
  'gegenstand.breite': { de: 'Breite (cm)' },
  'gegenstand.hoehe': { de: 'Höhe (cm)' },
  'gegenstand.mass_falsch': {
    de: 'Bitte alle drei Maße zwischen 1 und 1000 cm eingeben, oder alle leer lassen.',
  },
  'gegenstand.angelegt': { de: '{code} angelegt' },
  'gegenstand.foto_fehler': {
    de: '{code} ist angelegt, aber das Foto kam nicht an: {grund}',
  },
  'gegenstand.speichern': { de: 'Anlegen' },
  'gegenstand.und_noch_einer': { de: 'Noch einer' },

  // Zimmerseite: was im Zimmer steht
  'gegenstand.im_zimmer': { de: 'Im Zimmer' },
  'gegenstand.zahl_moebel': { de: 'Möbel' },
  'gegenstand.zahl_regale': { de: 'Regale und Schränke' },
  'gegenstand.zahl_kisten': { de: 'Kisten' },
  'gegenstand.zahl_gegenstaende': { de: 'Gegenstände' },
  'gegenstand.moebel_hinweis': {
    de: 'Regale und Schränke zählen bei den Möbeln mit.',
  },
  'gegenstand.regale_titel': { de: 'Regale und Schränke' },
  'gegenstand.regal_inhalt': {
    de: '{kisten} Kisten, {dinge} Gegenstände',
  },
  'gegenstand.regal': { de: 'Regal' },
  'gegenstand.schrank': { de: 'Schrank' },
  'gegenstand.regal_leer': { de: 'leer' },
  'gegenstand.plan_laedt': { de: 'Grundriss wird geladen' },
  'gegenstand.keine': { de: 'Noch keine einzelnen Gegenstände' },
  'gegenstand.keine_hinweis': {
    de: 'Lampe, Staubsauger, Bild: alles, was nicht in eine Kiste kommt.',
  },
  'gegenstand.gegenstaende_titel': { de: 'Gegenstände in diesem Zimmer' },
}
