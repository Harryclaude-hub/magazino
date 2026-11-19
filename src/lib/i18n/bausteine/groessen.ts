import type { Woerterbuch } from '../woerter'

/* Groessen pruefen: jede Kiste einmal nach Litern einstufen. Die Liter
 * selbst stehen in der Datenbank (0021), hier nur die Saetze drumherum. */
export const groessen: Woerterbuch = {
  'groessen.titel': { de: 'Größen prüfen' },
  'groessen.untertitel': { de: 'Jede Kiste nach Litern einstufen' },
  'groessen.erklaerung': {
    de: 'Die Größen 1 bis 10 haben jetzt Liter: 1 ist die kleinste Kiste, 10 die größte. Stell jede Kiste einmal auf ihre Größe. Ändert sich die Größe, ändert sich auch die Nummer. Die alte Nummer findet der Scanner weiter, das Etikett druckst du am Ende neu.',
  },

  'groessen.rechner_titel': { de: 'Wie viele Liter hat dein Karton?' },
  'groessen.rechner_hinweis': {
    de: 'Steht meist auf dem Karton oder in der Beschreibung beim Kauf.',
  },
  'groessen.rechner_feld': { de: 'Liter' },
  'groessen.rechner_ergebnis': { de: 'Das ist Größe {n}.' },
  'groessen.rechner_leer': { de: 'Gib eine Zahl ein, zum Beispiel 62.' },

  'groessen.tabelle_titel': { de: 'Die zehn Größen' },
  'groessen.spalte_groesse': { de: 'Größe' },
  'groessen.spalte_liter': { de: 'Liter' },
  'groessen.spalte_bereich': { de: 'gilt für' },
  'groessen.spalte_mass': { de: 'typisch außen' },
  'groessen.bereich_bis': { de: 'unter {bis} l' },
  'groessen.bereich_ab': { de: 'ab {ab} l' },
  'groessen.bereich_von_bis': { de: '{ab} bis unter {bis} l' },
  'groessen.mass_zeile': { de: '{l} × {b} × {h} cm' },
  'groessen.norm': {
    de: 'Für Umzugskartons gibt es keine Norm für Liter. Die Abstände folgen den Normzahlen nach DIN 323: jede Größe ist etwa ein Viertel größer als die vorige.',
  },

  'groessen.kisten_titel': { de: 'Deine Kisten' },
  'groessen.moebel_hinweis': {
    de: 'Möbel stehen hier nicht: sie haben keine Liter.',
  },
  'groessen.leer': {
    de: 'In diesem Umzug gibt es noch keine Kisten.',
  },
  'groessen.nur_lesen': {
    de: 'Nur Bearbeiter können Größen ändern.',
  },
  'groessen.liter_fehlen': {
    de: 'Die Liter konnten nicht geladen werden. Die Größen selbst lassen sich trotzdem ändern.',
  },
  'groessen.neue_nummer': { de: 'jetzt {code}' },
  'groessen.geaendert.eins': { de: '1 Kiste neu eingestuft' },
  'groessen.geaendert.viele': { de: '{n} Kisten neu eingestuft' },
  'groessen.etiketten_drucken': {
    de: 'Etiketten der geänderten drucken',
  },
  'groessen.erledigt': { de: 'Gedruckt, Liste leeren' },
  'groessen.gespeichert': { de: '{alt} ist jetzt {neu}' },

  'groessen.hinweis_liste': {
    de: 'Größen haben jetzt Liter. Stuf deine Kisten einmal neu ein.',
  },

  // ------------------------------------------- Meine Groessen (0027)
  // Eigene Masse je Umzug. Die Stufe in der Nummer setzt die Datenbank.
  'groessen.eigene_titel': { de: 'Meine Größen' },
  'groessen.eigene_leer': { de: 'Noch keine eigenen Größen.' },
  'groessen.eigene_leer_hinweis': {
    de: 'Leg eine an, wenn du viele gleiche Kisten hast, etwa Boxen aus dem Baumarkt. Beim Anlegen einer Kiste wählst du sie dann mit einem Tipp.',
  },
  'groessen.eigene_anlegen': { de: 'Eigene Größe anlegen' },
  'groessen.eigene_aendern': { de: 'Größe ändern' },
  'groessen.eigene_loeschen': { de: 'Größe löschen' },
  'groessen.eigene_loeschen_frage': {
    de: '{name} löschen? Das geht nur, solange keine Kiste und kein Möbel diese Größe benutzt.',
  },
  'groessen.eigene_geloescht': { de: '{name} gelöscht' },
  'groessen.eigene_gespeichert': { de: '{name} gespeichert' },
  'groessen.eigene_name': { de: 'Name' },
  'groessen.eigene_name_platzhalter': { de: 'Große Box IKEA' },
  'groessen.eigene_art': { de: 'Art' },
  'groessen.eigene_art_kiste': { de: 'Kiste' },
  'groessen.eigene_art_moebel': { de: 'Möbel' },
  'groessen.eigene_laenge': { de: 'Länge' },
  'groessen.eigene_breite': { de: 'Breite' },
  'groessen.eigene_hoehe': { de: 'Höhe' },
  'groessen.eigene_in_cm': { de: '= {cm} cm' },
  'groessen.eigene_eingabe_hinweis': {
    de: '60 sind Zentimeter, 0,6 sind Meter.',
  },
  'groessen.eigene_l_form': { de: 'L-Form' },
  'groessen.eigene_l_form_hinweis': {
    de: 'Etwa ein Ecksofa: ein Rechteck, an einer Ecke fehlt ein Stück.',
  },
  'groessen.eigene_ausschnitt': { de: 'Das fehlende Stück an der Ecke.' },
  'groessen.eigene_ausschnitt_breite': { de: 'Ausschnitt Breite' },
  'groessen.eigene_ausschnitt_tiefe': { de: 'Ausschnitt Tiefe' },
  'groessen.eigene_ausschnitt_masse': {
    de: 'Ausschnitt {breite} × {tiefe} cm',
  },
  'groessen.eigene_masse': { de: '{l} × {b} × {h} cm' },
  'groessen.eigene_folgen': {
    de: 'Betrifft {kisten} Kisten und {moebel} Möbel; {neu} bekommen eine neue Nummer (Größe {stufe}). Alte Etiketten bleiben scannbar.',
  },
  'groessen.eigene_bestaetigen': { de: 'Ja, so speichern' },
  'groessen.eigene_fehler_name': {
    de: 'Bitte einen Namen eingeben (höchstens 60 Zeichen).',
  },
  'groessen.eigene_fehler_mass': {
    de: 'Zwischen 1 und 1000 cm, zum Beispiel 60 oder 0,6.',
  },
  'groessen.eigene_fehler_ausschnitt': {
    de: 'Der Ausschnitt muss kleiner sein als Länge und Breite.',
  },
  'groessen.stufe_setzt_db': {
    de: 'Die Größe in der Nummer berechnet Magazino aus Länge, Breite und Höhe.',
  },
}
