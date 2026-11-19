import type { Woerterbuch } from '../woerter'

/* Grundriss, Zeichner, Plan-Bausteine und Lageplan (Etappe 2).
 * grundriss.*  Seite, Reiter, Speichern
 * (zeichner.* steht in zeichner.ts und laedt mit dem Zeichner.)
 * plan.*       Woerter in Plaenen (Tuer, Fenster, Fach, Farben)
 * lage.*       Wo steht die Kiste (Lageplan, Kistenseite)
 * Arabische Saetze liest Karam gegen (BAUPLAN 7.2). */
export const grundriss: Woerterbuch = {
  // ---------------------------------------------------------------- Seite
  'grundriss.titel': { de: 'Grundriss' },
  'grundriss.reiter': { de: 'Grundrisse' },
  'grundriss.laedt': { de: 'Grundriss wird geladen' },
  'grundriss.neue_wohnung': { de: 'Neue Wohnung' },
  'grundriss.alte_wohnung': { de: 'Alte Wohnung' },
  'grundriss.keller': { de: 'Keller' },
  'grundriss.lager': { de: 'Lager' },
  'grundriss.anlegen': { de: 'Grundriss anlegen' },
  'grundriss.umbenennen': { de: 'Grundriss umbenennen' },
  'grundriss.loeschen': { de: 'Grundriss löschen' },
  'grundriss.loeschen_titel': { de: '{name} löschen?' },
  'grundriss.loeschen_zaehlt': {
    de: 'Einen Moment, die Kisten werden gezählt.',
  },
  'grundriss.loeschen_frage': {
    de: 'Räume, Türen, Fenster und Möbel dieses Grundrisses verschwinden. {n} Kisten verlieren ihren Platz, bleiben aber im Umzug.',
  },
  'grundriss.geloescht': { de: 'Grundriss gelöscht' },
  'grundriss.name_fehlt': { de: 'Bitte einen Namen mit 1 bis 60 Zeichen.' },
  'grundriss.nur_computer': {
    de: 'Gezeichnet wird am Computer.',
  },
  'grundriss.nur_ansehen': {
    de: 'Hier kannst du den Grundriss ansehen.',
  },
  'grundriss.leer': { de: 'Noch nichts gezeichnet' },
  'grundriss.leer_hinweis': {
    de: 'Der Grundriss kommt bald.',
  },
  'grundriss.leer_betrachter': {
    de: 'Der Grundriss kommt bald.',
  },
  'grundriss.fehlt': { de: 'Diesen Grundriss gibt es nicht mehr.' },
  'grundriss.zum_ersten': { de: 'Zum ersten Grundriss' },
  'grundriss.alles': { de: 'Alles' },
  'fehler.db.grundriss.nur_admin': { de: 'Nur der Admin darf den Grundriss ändern.' },
  'grundriss.gespeichert': { de: 'Gespeichert' },
  'grundriss.speichert': { de: 'Speichert …' },
  'grundriss.nicht_gespeichert': { de: 'Nicht gespeichert, nochmal' },
  'grundriss.veraltet_titel': { de: 'Grundriss geändert' },
  'grundriss.veraltet': {
    de: 'Jemand hat den Grundriss inzwischen geändert. Lade ihn neu; deine letzte Änderung, die noch nicht gespeichert war, musst du danach wiederholen.',
  },
  'grundriss.neu_laden': { de: 'Neu laden' },
  'grundriss.wechsel_ungespeichert': {
    de: 'Der Zeichner hat sich geschlossen (Fenster zu schmal oder keine Maus). Deine letzte Änderung war vielleicht noch nicht gespeichert, bitte im Plan nachsehen.',
  },
  'grundriss.zeigen': { de: 'Zeigen' },
  'grundriss.kisten_draussen_vorab': {
    de: 'Diese Kisten stünden danach außerhalb: {codes}. Nimm sie zuerst vom Platz oder stelle sie um.',
  },

  // ------------------------------------- Groß ansehen und messen (E94)
  'grundriss.gross': { de: 'Groß ansehen' },
  'grundriss.gross_zu': { de: 'Große Ansicht schließen' },
  'grundriss.modus': { de: 'Antippen zum Ansehen oder Messen' },
  'grundriss.modus_ansehen': { de: 'Ansehen' },
  'grundriss.modus_messen': { de: 'Messen' },
  'grundriss.antippen': {
    de: 'Tippe auf ein Möbel, eine Kiste, eine Tür oder einen Raum.',
  },
  'grundriss.messen_start': {
    de: 'Tippe auf den ersten Punkt. Ecken, Türen und Fenster rasten ein, immer an der Innenseite der Wand.',
  },
  'grundriss.messen_b': { de: 'Jetzt den zweiten Punkt tippen.' },
  'grundriss.messen_neu': { de: 'Neue Messung' },
  'grundriss.messen_frei': { de: 'Punkt' },
  'grundriss.messen_abstand': { de: 'Abstand' },
  'grundriss.schnell_links': { de: 'links bis zur Ecke' },
  'grundriss.schnell_rechts': { de: 'rechts bis zur Ecke' },
  'grundriss.schnell_gegenueber': { de: 'Andere Wandseite' },
  'grundriss.schnell_ecke': { de: 'Bis zur Ecke:' },
  'grundriss.schnell_gegen_ecke': { de: 'Andere Wandseite bis zur Ecke:' },
  'grundriss.schnell_blick': {
    de: 'Links und rechts gelten im jeweiligen Raum, mit Blick zur Wand.',
  },
  'grundriss.raum_flaeche': { de: 'Nutzfläche' },
  'grundriss.raum_hoehe': { de: 'Raumhöhe' },
  'grundriss.oeffnung_name': { de: '{was} {raum}' },

  // --------------------------------------------------------------- Plan
  'plan.tuer': { de: 'Tür' },
  'plan.durchgang': { de: 'Durchgang' },
  'plan.fenster': { de: 'Fenster' },
  'plan.moebel': { de: 'Möbel' },
  'plan.regal': { de: 'Regal' },
  'plan.schrank': { de: 'Schrank' },
  'plan.boden': { de: 'Boden' },
  'plan.fach': { de: 'Fach {ebene}/{spalte}' },
  'plan.von_bis': { de: '{von} bis {bis} cm' },
  'plan.m2': { de: '{n} m²' },
  'plan.ragt_vor': { de: '{cm} cm vor' },
  'plan.ragt_vor_lang': { de: '{code} ragt {cm} cm aus dem Fach heraus' },
  'plan.fuellstand': { de: '{code}: {n} % voll' },
  'plan.stapel': { de: 'Stapel {n}' },
  'plan.stapel_seite': { de: 'Stapel von der Seite' },
  'plan.legende_hier': { de: 'Hier steht es' },
  'plan.legende_ziel': { de: 'Hier kommt es hin' },
  'plan.raum_ohne_name': { de: 'Raum ohne Namen' },
  // Messpunkte beim Messen (E90, seit E94 auch am Handy, darum hier und
  // nicht in zeichner.ts): "Tür Bad, links", "Lichte 80".
  'plan.messen.ecke': { de: 'Ecke' },
  'plan.messen.links': { de: 'links' },
  'plan.messen.rechts': { de: 'rechts' },
  'plan.messen.punkt': { de: '{was} {raum}, {ende}' },
  'plan.messen.punkt_ohne_raum': { de: '{was}, {ende}' },
  'plan.messen.gegenueber': { de: '{name}, andere Wandseite' },
  'plan.messen.lichte': { de: 'Lichte' },
  'plan.messen.durchgang': { de: 'Frei für Möbel' },
  'plan.messen.maueroeffnung': { de: 'Maueröffnung' },
  'plan.farbe.anthrazit': { de: 'Anthrazit' },
  'plan.farbe.schiefer': { de: 'Schiefer' },
  'plan.farbe.taubenblau': { de: 'Taubenblau' },
  'plan.farbe.salbei': { de: 'Salbei' },
  'plan.farbe.terrakotta': { de: 'Terrakotta' },
  'plan.farbe.ocker': { de: 'Ocker' },
  'plan.farbe.aubergine': { de: 'Aubergine' },
  'plan.farbe.petrol': { de: 'Petrol' },
  'plan.farbe.eiche_hell': { de: 'Eiche hell' },
  'plan.farbe.eiche_dunkel': { de: 'Eiche dunkel' },
  'plan.farbe.fliese_grau': { de: 'Fliese grau' },
  'plan.farbe.beton': { de: 'Beton' },
  'plan.farbe.sand': { de: 'Sand' },
  'plan.farbe.holz': { de: 'Holz' },
  'plan.farbe.grau': { de: 'Grau' },
  'plan.farbe.hellgrau': { de: 'Hellgrau' },
  'plan.farbe.beige': { de: 'Beige' },
  'plan.farbe.cognac': { de: 'Cognac' },
  'plan.farbe.waldgruen': { de: 'Waldgrün' },
  'plan.farbe.nachtblau': { de: 'Nachtblau' },
  'plan.farbe.senf': { de: 'Senf' },
  'plan.farbe.altrosa': { de: 'Altrosa' },
  'plan.farbe.weiss': { de: 'Weiß' },
  'plan.farbe.schwarz': { de: 'Schwarz' },

  // ------------------------------------------------------------- Lage
  'lage.titel': { de: 'Wo steht die Kiste' },
  'lage.laedt': { de: 'Platz wird geladen' },
  'lage.kein_platz': { de: 'Noch kein Platz im Grundriss' },
  'lage.kein_platz_hinweis': {
    de: 'Sobald die Kiste im Grundriss steht, zeigt die Karte hier, wo.',
  },
  'lage.plan_fehlt': { de: 'Der Raum ließ sich nicht laden.' },
  'lage.ort': { de: '{grundriss}, {raum}' },
  'lage.satz_fach': {
    de: '{name}, Fach {ebene} (Ebene {ebene}), {von} bis {bis} cm über dem Boden',
  },
  'lage.satz_fach_spalte': {
    de: '{name}, Fach {ebene}/{spalte} (Ebene {ebene}, Spalte {spalte}), {von} bis {bis} cm über dem Boden',
  },
  'lage.satz_kiste': { de: 'auf Kiste {code}, {von} bis {bis} cm' },
  'lage.satz_objekt': { de: 'auf {name}, {von} bis {bis} cm' },
  'lage.satz_boden': { de: 'auf dem Boden, {von} bis {bis} cm' },
  'lage.satz_moebel': { de: '{name}, 0 bis {bis} cm' },
  'lage.satz_in_moebel': { de: 'in {name}, {von} bis {bis} cm' },
  'lage.ragt_vor': { de: '{satz}, ragt {cm} cm heraus' },
  'lage.hoehe': { de: '{von} bis {bis} cm über dem Boden' },
  'lage.noch_nicht_da': {
    de: 'Noch nicht angekommen: hier kommt sie hin.',
  },
  'lage.im_grundriss': { de: 'Im Grundriss zeigen' },
  'lage.titel_moebel': { de: 'Wo steht das Möbel' },
  'lage.wo_steht_sie': { de: 'Wo steht sie?' },
  'lage.kein_platz_waehlen': {
    de: 'Wähle das Zimmer und tippe, wo die Kiste steht.',
  },
  'lage.platz_waehlen': { de: 'Platz wählen' },
  'lage.platz_aendern': { de: 'Platz ändern' },
  'lage.vom_platz': { de: 'Vom Platz nehmen' },
  'lage.vom_platz_titel': { de: '{code} vom Platz nehmen?' },
  'lage.vom_platz_frage': {
    de: '{code} verliert ihren Platz im Grundriss. Die Kiste bleibt im Umzug.',
  },
  'lage.rutscht_nach': {
    de: 'Was darauf steht, rutscht nach: {codes}.',
  },
  'lage.vom_platz_fertig': { de: '{code} hat keinen Platz mehr' },
  'lage.moebel_ohne_objekt': {
    de: 'Dieses Möbel ist noch nicht im Grundriss. Zeichne es am Computer als Möbel und verknüpfe es mit diesem Eintrag.',
  },
  'lage.grundriss_oeffnen': { de: 'Grundriss öffnen' },
  'lage.gehoert_in': {
    de: 'Die Kiste gehört ins Zimmer {zimmer}. Die Nummer bleibt, auch wenn sie woanders steht.',
  },
  'plan.zoom_zurueck': { de: 'Ganz zeigen' },
}
