import type { Woerterbuch } from '../woerter'

/* Die 3D-Ansicht am Computer (Etappe 4, START 5.5).
 *
 * Wie der Zeichner-Baustein steht dieser NICHT in woerter.ts, sondern
 * laedt mit dem Knopf (components/plan3d/oeffnen.tsx ruft
 * woerterNachladen). Am Handy gibt es sie im Grundriss und im Lageplan. Geprueft wird er
 * wie alle anderen (scripts/woerter-pruefen.mjs). */
export const plan3dWoerter: Woerterbuch = {
  'plan3d.oeffnen': { de: 'In 3D ansehen' },
  'plan3d.titel': { de: '3D-Ansicht' },
  'plan3d.laedt': { de: '3D-Ansicht wird geladen' },
  'plan3d.geht_nicht': {
    de: 'Dieser Browser kann keine 3D-Grafik (WebGL) zeigen. Der Plan von oben funktioniert weiter.',
  },
  'plan3d.fehler': {
    de: 'Die 3D-Ansicht konnte nicht geladen werden: {fehler}',
  },
  'plan3d.ansicht_oben': { de: 'Von oben' },
  'plan3d.ansicht_schraeg': { de: 'Schräg' },
  'plan3d.zur_kiste': { de: 'Zur Kiste' },
  'plan3d.waende_halb': { de: 'Wände zur Kamera durchsichtig' },
  'plan3d.schliessen': { de: '3D schließen' },
  'plan3d.bedienung': {
    de: 'Ziehen dreht, rechte Maustaste verschiebt, Mausrad zoomt.',
  },
  'plan3d.bedienung_ziehen': {
    de: 'Ziehen dreht die Wohnung, rechte Maustaste verschiebt, Mausrad zoomt. Möbel verschieben: "Hand" wählen.',
  },
  'plan3d.bedienung_handy': {
    de: 'Ein Finger dreht, zwei Finger verschieben und zoomen.',
  },
  'plan3d.modus': { de: 'Linke Maustaste' },
  'plan3d.hand': { de: 'Hand' },
  'plan3d.begehen': { de: 'Begehen' },
  'plan3d.licht': { de: 'Licht' },
  'plan3d.licht_tag': { de: 'Tag' },
  'plan3d.licht_abend': { de: 'Abend' },
  'plan3d.licht_auto': { de: 'Automatisch' },
  'plan3d.licht_raeume': { de: 'Licht je Zimmer' },
  'plan3d.licht_schalter_hilfe': {
    de: 'Licht pro Zimmer an und aus. Ein Klick auf einen Lichtschalter an der Wand geht auch.',
  },
  'plan3d.licht_alle_an': { de: 'Alle an' },
  'plan3d.licht_alle_aus': { de: 'Alle aus' },
  'plan3d.licht_an': { de: 'an' },
  'plan3d.licht_aus': { de: 'aus' },
  'plan3d.teppiche': { de: 'Teppiche' },
  'plan3d.deko': { de: 'Deko' },
  'plan3d.aufstehen': { de: 'Aufstehen' },
  'plan3d.ablegen': { de: 'Ablegen' },
  'plan3d.mikro_an': { de: 'Mikrofon an' },
  'plan3d.mikro_aus': { de: 'Mikrofon aus' },
  'plan3d.mikro_hilfe': {
    de: 'Mit Mikrofon hören dich alle, die gerade auch durch die Wohnung gehen, lauter, je näher sie stehen.',
  },
  'plan3d.leute_da': { de: 'Mit dir in der Wohnung: {n}' },
  'plan3d.ton_tippen': { de: 'Einmal tippen, dann hörst du die anderen.' },
  'plan3d.vollbild': { de: 'Vollbild' },
  'plan3d.vollbild_ende': { de: 'Vollbild beenden' },
  'plan3d.leiste_zu': { de: 'Knöpfe einklappen' },
  'plan3d.leiste_auf': { de: 'Knöpfe zeigen' },
  'plan3d.begehen_ende': { de: 'Begehen beenden' },
  'plan3d.begehen_hilfe': {
    de: 'Durch die Wohnung gehen, als wärst du drin.',
  },
  'plan3d.begehen_bedienung': {
    de: 'W A S D oder Pfeiltasten gehen, Umschalt rennt, Leertaste springt, ziehen schaut umher. E steigt ein. Antippen: hinsetzen, hinlegen, aufheben, Fernseher und Wasser an. Rechtsklick auf ein Möbel: Details, verschieben, hinsetzen oder hinlegen. Esc beendet.',
  },
  'plan3d.begehen_bedienung_handy': {
    de: 'Links den Knopf schieben zum Gehen, mit dem Finger ziehen zum Umschauen. Die Knöpfe darüber: springen, einsteigen. Antippen: hinsetzen, hinlegen, aufheben, Fernseher und Wasser an. Lange auf ein Möbel drücken: Details, verschieben, hinsetzen oder hinlegen.',
  },
  // E87: Springen, Fahren, Dinge hinstellen (Knoepfe beim Begehen).
  'plan3d.aktionen': { de: 'Was du gerade tun kannst' },
  'plan3d.springen': { de: 'Springen' },
  'plan3d.einsteigen': { de: 'Einsteigen' },
  'plan3d.aussteigen': { de: 'Aussteigen' },
  // E87b: rundherum ist alles zu, man bleibt sitzen.
  'plan3d.aussteigen_kein_platz': {
    de: 'Hier ist kein Platz zum Aussteigen. Fahr ein Stück weiter.',
  },
  'plan3d.aussteigen_kein_platz_esc': {
    de: 'Hier ist kein Platz zum Aussteigen. Fahr ein Stück weiter, oder drück noch einmal Esc, dann endet das Begehen.',
  },
  'plan3d.sicht': { de: 'Sicht' },
  'plan3d.sicht_hinten': { de: 'Sicht von hinten' },
  'plan3d.blaulicht': { de: 'Blaulicht' },
  'plan3d.hinstellen': { de: 'Hinstellen' },
  'plan3d.ding_drehen': { de: 'Drehen' },
  'plan3d.kmh_name': { de: 'Geschwindigkeit in km/h' },
  'plan3d.knueppel_fahren': {
    de: 'Fahren: nach vorn schieben fährt, zur Seite lenkt',
  },
  'plan3d.fahren_bedienung': {
    de: 'W und S Gas und Bremse, A und D lenken, ziehen schaut umher. E oder Esc steigt aus, V wechselt die Sicht, B schaltet das Blaulicht.',
  },
  'plan3d.fahren_bedienung_handy': {
    de: 'Den Knopf links schieben: nach vorn fährt, zur Seite lenkt. Die Knöpfe darüber: aussteigen, Sicht, Blaulicht.',
  },
  'plan3d.halten_bedienung': {
    de: 'Klick stellt das Ding dorthin, wohin du zeigst. R oder Mausrad dreht es, Ablegen legt es vor dir ab. Esc beendet.',
  },
  'plan3d.halten_bedienung_handy': {
    de: 'Tipp auf die Stelle, an die das Ding soll, oder Hinstellen für die Mitte (Kreuz). Drehen dreht es, Ablegen legt es vor dir ab.',
  },
  /* E89: Möbel tragen beim Begehen. */
  'plan3d.moebel_verschoben.eins': { de: '{n} Möbelstück verschoben' },
  'plan3d.moebel_verschoben.viele': { de: '{n} Möbel verschoben' },
  'plan3d.moebel_tragen_hinweis': {
    de: 'Klick: abstellen · R: drehen · Esc: zurück',
  },
  'plan3d.moebel_tragen_hinweis_handy': { de: 'Tippen: abstellen' },
  'plan3d.moebel_hier_nicht': {
    de: 'Hier nicht: Wand oder außerhalb der Räume.',
  },
  'plan3d.moebel_abstellen': { de: 'Abstellen' },
  'plan3d.moebel_zuruecksetzen': { de: 'Zurücksetzen' },
  'plan3d.moebel_zuruecksetzen_hilfe': {
    de: 'Alle Möbel zurück an ihren Platz im Plan',
  },
  'plan3d.moebel_speichern_hilfe': {
    de: 'Die neue Stellung der Möbel in den Grundriss übernehmen',
  },
  'plan3d.moebel_speichern_fehler': { de: 'Speichern ging nicht: {fehler}' },
  'plan3d.moebel_gesperrt': { de: 'Das lässt sich nicht verschieben' },
  'plan3d.verschiebungen_verworfen': { de: 'Verschiebungen verworfen' },
  /* E92: Kontextmenü (Rechtsklick, langes Drücken) und Möbelkarte. */
  'plan3d.menue': { de: 'Möbel: {name}' },
  'plan3d.menue_details': { de: 'Details' },
  'plan3d.menue_verschieben': { de: 'Verschieben' },
  'plan3d.menue_hinsetzen': { de: 'Hinsetzen' },
  'plan3d.menue_hinlegen': { de: 'Hinlegen' },
  'plan3d.moebel_art': { de: 'Art' },
  'plan3d.moebel_haengt': { de: 'hängt {n} cm über dem Boden' },
  'plan3d.moebel_material': { de: 'Material' },
  'plan3d.material.stoff': { de: 'Stoff' },
  'plan3d.material.leder': { de: 'Leder' },
  'plan3d.material.samt': { de: 'Samt' },
  'plan3d.material.holz': { de: 'Holz' },
  'plan3d.material.metall': { de: 'Metall' },
  'plan3d.material.glas': { de: 'Glas' },
  'plan3d.material.keramik': { de: 'Keramik' },
  'plan3d.moebel_preis': { de: 'Preis' },
  'plan3d.moebel_shop': { de: 'Shop' },
  'plan3d.moebel_shop_neu': { de: '{host} öffnen (neuer Tab)' },
  'plan3d.moebel_shop_ungueltig': { de: 'Kein gültiger Link: {link}' },
  'plan3d.moebel_ohne_angaben': {
    de: 'Preis, Material und Shop sind nicht eingetragen.',
  },
  'plan3d.moebel_kisten': { de: 'Kisten darauf oder darin' },
  'plan3d.moebel_keine_kisten': { de: 'keine' },
  'plan3d.moebel_seite': { de: 'Möbelseite öffnen' },
  'plan3d.moebel_weg': {
    de: 'Dieses Möbelstück gibt es im Plan nicht mehr. Vielleicht wurde es gerade gelöscht.',
  },
  'plan3d.gehen_vor': { de: 'Vorwärts gehen' },
  'plan3d.knueppel': { de: 'Gehen: in die Richtung schieben' },
  'plan3d.gehen_zurueck': { de: 'Rückwärts gehen' },
  'plan3d.gehen_links': { de: 'Nach links gehen' },
  'plan3d.gehen_rechts': { de: 'Nach rechts gehen' },
  'plan3d.drehen': { de: 'Drehen' },
  'plan3d.hand_hilfe': {
    de: 'Greifen und verschieben: nach oben, unten, links, rechts. Rechte Maustaste dreht.',
  },
  'plan3d.drehen_hilfe': {
    de: 'Ziehen dreht die Wohnung. Rechte Maustaste verschiebt.',
  },
  'plan3d.bedienung_hand': {
    de: 'Ziehen verschiebt, rechte Maustaste dreht, Mausrad zoomt.',
  },
  'plan3d.bedienung_ziehen_hand': {
    de: 'Möbel ziehen verschiebt es. Sonst: Ziehen verschiebt die Ansicht, rechte Maustaste dreht, Mausrad zoomt.',
  },
  'plan3d.bedienung_handy_hand': {
    de: 'Ein Finger verschiebt, zwei Finger drehen und zoomen.',
  },
  'plan3d.leer': { de: 'Hier ist noch nichts gezeichnet.' },
  'plan3d.umschalter': { de: 'Ansicht' },
  'plan3d.zwei_d': { de: '2D' },
  'plan3d.drei_d': { de: '3D' },
  'plan3d.leinwand': { de: 'Grundriss in 3D' },
}
