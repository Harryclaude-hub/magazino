import type { Woerterbuch } from '../woerter'

/* Kiste platzieren am Handy (Etappe 3, START 5.7): Zimmer waehlen, Stelle
 * tippen, Unterlage waehlen, speichern.
 *
 * Wie der Zeichner-Baustein steht dieser NICHT in woerter.ts, sondern
 * laedt mit dem Code-Teil des Ablaufs (pages/PlatzWahl.tsx ruft
 * woerterNachladen). Geprueft wird er wie alle anderen
 * (scripts/woerter-pruefen.mjs). Arabische Saetze liest Karam gegen. */
export const platzWoerter: Woerterbuch = {
  'platz.titel': { de: 'Platz wählen' },
  'platz.laedt': { de: 'Zimmer werden geladen' },
  'platz.raum_laedt': { de: 'Zimmer wird geladen' },
  'platz.zimmer_waehlen': { de: 'In welchem Zimmer steht die Kiste?' },
  'platz.anderes_zimmer': { de: 'Anderes Zimmer' },
  'platz.nicht_gezeichnet': { de: 'Noch kein Zimmer gezeichnet' },
  'platz.nicht_gezeichnet_hinweis': {
    de: 'Zeichnen geht am Computer. Danach kannst du hier jede Kiste mit wenigen Tipps hinstellen.',
  },
  'platz.spaeter': { de: 'Später' },
  'platz.moebel': { de: 'Möbel bekommen ihren Platz im Grundriss' },
  'platz.moebel_hinweis': {
    de: 'Zeichne das Möbel am Computer und verknüpfe es mit diesem Eintrag.',
  },
  'platz.nur_ansehen': {
    de: 'Plätze setzen dürfen nur Bearbeiter. Hier siehst du das Zimmer.',
  },
  'platz.jetzt': { de: 'Steht jetzt: {satz}' },
  'platz.tippen': { de: 'Tippe, wo die Kiste steht.' },
  'platz.tippen_hinweis': {
    de: 'Mit zwei Fingern zoomen. Die Stelle wird auf 5 cm gerundet.',
  },
  'platz.plan_label': { de: 'Zimmer von oben, zum Tippen' },
  'platz.stelle': { de: '{x} cm von links, {y} cm von oben' },
  'platz.draussen': {
    de: 'Diese Stelle liegt außerhalb des Zimmers. Tippe innerhalb der Wände.',
  },
  'platz.feineinstellung': { de: 'Feineinstellung' },
  'platz.von_links': { de: 'von links (cm)' },
  'platz.von_oben': { de: 'von oben (cm)' },
  'platz.zahl_falsch': {
    de: 'Bitte eine Länge wie 345 oder 3,45 eingeben.',
  },
  'platz.schieben': { de: '{achse} um {n} cm' },
  'platz.drehen': { de: 'Drehen' },
  'platz.masse': { de: 'Kiste {masse}' },
  'platz.letzte': { de: 'Zuletzt benutzt' },
  'platz.unterlage_titel': { de: 'Worauf steht sie?' },
  'platz.unterlage_leer': {
    de: 'Tippe zuerst im Plan, wo die Kiste steht.',
  },
  'platz.boden': { de: 'Boden, {von} bis {bis} cm' },
  'platz.auf_kiste': { de: 'auf {code}, {von} bis {bis} cm' },
  'platz.auf_objekt': { de: 'auf {name}, {von} bis {bis} cm' },
  'platz.regal': { de: '{name}: Fach wählen' },
  'platz.fach': {
    de: 'Fach {ebene} (Ebene {ebene}), {von} bis {bis} cm',
  },
  'platz.fach_spalte': {
    de: 'Fach {ebene}/{spalte} (Ebene {ebene}, Spalte {spalte}), {von} bis {bis} cm',
  },
  'platz.passt_nicht': { de: 'Passt nicht: Platz nur bis {grenze} cm' },
  'platz.ragt_vor': { de: 'ragt {cm} cm aus dem Fach heraus' },
  'platz.ueberstand_zu_gross': {
    de: 'Passt nicht: ragt {cm} cm heraus, erlaubt sind {max} cm',
  },
  'platz.ueberlappt': {
    de: 'Achtung, hier steht schon etwas: {codes}. Speichern geht trotzdem.',
  },
  'platz.speichern': { de: 'Hier hinstellen' },
  'platz.gespeichert': { de: '{code} steht jetzt: {satz}' },
  'platz.naechste': { de: 'Nächste Kiste ({n} übrig)' },
  'platz.reihe': { de: 'Kiste {nr} von {n}' },
}
