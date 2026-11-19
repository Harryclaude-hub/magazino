import type { Woerterbuch } from '../woerter'

/* Die Suche ueber alle Umzuege. Nummern, Zimmernamen und Umzugsnamen sind
 * Nutzerinhalt und bleiben, wie sie sind. */
export const suche: Woerterbuch = {
  'suche.titel': { de: 'Suchen' },
  'suche.untertitel': { de: 'In allen deinen Umzügen' },
  'suche.feld': { de: 'Was suchst du?' },
  'suche.platzhalter': { de: 'zum Beispiel Kleber oder Ladekabel' },
  'suche.hinweis': {
    de: 'Gesucht wird in allem, was in den Kisten steht, auf Deutsch und Arabisch, auch mit Tippfehler.',
  },
  'suche.zu_kurz': { de: 'Mindestens zwei Buchstaben.' },
  'suche.nichts': {
    de: 'Nichts gefunden. Versuch ein anderes Wort oder einen Oberbegriff.',
  },
  'suche.treffer.eins': { de: '1 Treffer' },
  'suche.treffer.viele': { de: '{n} Treffer' },
  // Mehr Treffer, als gezeigt werden. Nicht still abschneiden.
  'suche.treffer.mehr': {
    de: 'Mehr als {n} Treffer. Die besten stehen oben, such genauer für den Rest.',
  },
  'suche.ohne_platz': { de: 'noch ohne Platz im Grundriss' },
  'suche.ohne_zimmer': { de: 'ohne Zimmer' },
  // Grundriss und Raum, dann Platz und Hoehe, mit dem Komma der jeweiligen Sprache.
  'suche.ort_zeile': { de: '{ort}, {satz}' },
  'suche.gesucht': { de: 'Gesucht: {name}' },
  'suche.gesucht_schicht': { de: 'Gesucht: {name}, Schicht {n}' },
  'suche.eintrag_weg': {
    de: 'Das gesuchte Ding steht nicht mehr in dieser Liste. Vielleicht wurde es verschoben oder gelöscht.',
  },
  'suche.zum_lageplan': { de: 'Zum Lageplan' },
  'suche.band_weg': { de: 'Hinweis schließen' },
  'suche.foto_gross': { de: 'Foto groß' },
  'suche.waehlen': { de: 'Wähle links einen Treffer.' },
  'suche.im_foto': { de: 'Im Foto zeigen' },
  'suche.zur_kiste': { de: 'Zur Kiste' },
  'suche.zum_moebel': { de: 'Zum Möbelstück' },
  'suche.leeren': { de: 'Suche leeren' },
  'suche.umzug': { de: 'Umzug' },
  'suche.zimmer': { de: 'Zimmer' },
  'suche.schicht': { de: 'Schicht' },
  'suche.platz': { de: 'Platz' },
  'suche.hoehe': { de: 'Höhe' },
  'suche.legende_hier': { de: 'Hier steht es' },
  'suche.legende_ziel': { de: 'Hier kommt es hin' },
  'suche.seite_titel': { de: 'Von der Seite, Reihe {n}' },
  'suche.noch_nicht_da': {
    de: 'Noch nicht angekommen. Der Grundriss zeigt, wo die Kiste hinkommt.',
  },
}
