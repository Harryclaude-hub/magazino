/* Welche Schritte die Fuehrung ("Erklaerung") auf welcher Seite zeigt.
 *
 * Ein Schritt ist ein Schluessel s im Woerterbuch (s.titel und s.text,
 * bausteine/fuehrung.ts) und optional ein Ziel: der Name in
 * data-tour="...". Schritte, deren Ziel gerade nicht sichtbar ist, laesst
 * components/Fuehrung.tsx weg; darum stehen Computer- und Handy-Knoepfe
 * in derselben Liste. Reine Rechnung ohne React. */

export interface TourSchritt {
  /** Woerterbuch-Schluessel ohne .titel/.text. */
  s: string
  /** data-tour-Name des Elements, auf das der Schritt zeigt. */
  ziel?: string
}

const k = (s: string, ziel?: string): TourSchritt => ({ s: `fuehrung.${s}`, ziel })

/** Die Kopfzeile und die Navigation, die es auf jeder Seite gibt. */
const NAVIGATION: TourSchritt[] = [
  k('nav.leiste', 'leiste'),
  k('nav.umzug', 'leiste-umzug'),
  k('nav.klappen', 'leiste-klappen'),
  k('nav.suchkopf', 'suchkopf'),
  k('nav.umzuege', 'nav-umzuege'),
  k('nav.kisten', 'nav-kisten'),
  k('nav.zimmer', 'nav-zimmer'),
  k('nav.grundriss', 'nav-grundriss'),
  k('nav.suchen', 'nav-suchen'),
  k('nav.scannen', 'nav-scannen'),
  k('nav.chat', 'nav-chat'),
  k('nav.profil_nav', 'nav-profil'),
  k('nav.admin', 'nav-admin'),
]

const KOPF: TourSchritt[] = [k('kopf.zurueck', 'zurueck'), k('kopf.erklaerung', 'erklaerung'), k('kopf.profil', 'profil')]

export type TourName =
  | 'umzuege'
  | 'umzug'
  | 'kisten'
  | 'kiste'
  | 'platz'
  | 'bereiche'
  | 'zimmer'
  | 'person'
  | 'zeichner'
  | 'grundriss'
  | 'moebel'
  | 'suche'
  | 'scan'
  | 'chat'
  | 'profil'
  | 'admin'
  | 'allgemein'

/** Welche Seite ist das? */
export function tourName(pfad: string, g: { desktop: boolean; zeichnen: boolean }): TourName {
  const p = pfad.replace(/\/+$/, '')
  if (p === '/app') return 'umzuege'
  if (p === '/app/suche') return 'suche'
  if (p === '/app/scan' || /^\/app\/p\/[^/]+\/scan$/.test(p)) return 'scan'
  if (p === '/app/einstellungen') return 'profil'
  if (p === '/app/admin') return 'admin'
  const m = /^\/app\/p\/[^/]+(\/.*)?$/.exec(p)
  if (!m) return 'allgemein'
  const rest = m[1] ?? ''
  if (rest === '') return 'umzug'
  if (rest === '/kisten') return 'kisten'
  if (/^\/kisten\/[^/]+\/platz$/.test(rest)) return 'platz'
  if (/^\/kisten\/[^/]+$/.test(rest)) return 'kiste'
  if (rest === '/bereiche') return 'bereiche'
  if (/^\/zimmer\/[^/]+$/.test(rest)) return 'zimmer'
  if (/^\/person\/[^/]+$/.test(rest)) return 'person'
  if (rest.startsWith('/grundriss')) return g.zeichnen ? 'zeichner' : 'grundriss'
  if (rest.startsWith('/moebel')) return 'moebel'
  if (rest === '/chat') return 'chat'
  return 'allgemein'
}

/** Die Schritte einer Seite, ohne Kopf und Navigation. */
const SEITEN: Record<TourName, TourSchritt[]> = {
  umzuege: [k('umzuege.start'), k('umzuege.neu', 'umzuege-neu'), k('umzuege.beitreten', 'umzuege-beitreten'), k('umzuege.karte', 'umzuege-karte')],
  umzug: [
    k('umzug.start'),
    k('umzug.einstellen', 'umzug-einstellen'),
    k('umzug.zahlen', 'umzug-zahlen'),
    k('umzug.schnell', 'umzug-schnell'),
    k('umzug.zimmer', 'umzug-zimmer'),
    k('umzug.personen', 'umzug-personen'),
    k('umzug.fuss', 'umzug-fuss'),
  ],
  kisten: [
    k('kisten.start'),
    k('kisten.neu', 'kisten-neu'),
    k('kisten.gegenstand', 'kisten-gegenstand'),
    k('kisten.auswahl', 'kisten-auswahl'),
    k('kisten.export', 'kisten-export'),
    k('kisten.groessen', 'kisten-groessen'),
    k('kisten.suche', 'kisten-suche'),
    k('kisten.filter', 'kisten-filter'),
    k('kisten.status', 'kisten-status'),
    k('kisten.liste', 'kisten-liste'),
  ],
  kiste: [
    k('kiste.start'),
    k('kiste.markieren', 'kiste-markieren'),
    k('kiste.bearbeiten', 'kiste-bearbeiten'),
    k('kiste.loeschen', 'kiste-loeschen'),
    k('kiste.status', 'kiste-status'),
    k('kiste.fuellstand', 'kiste-fuellstand'),
    k('kiste.wo', 'kiste-wo'),
    k('kiste.eintrag', 'kiste-eintrag'),
    k('kiste.foto_lesen', 'kiste-foto-lesen'),
    k('kiste.foto', 'kiste-foto'),
    k('kiste.schicht', 'kiste-schicht'),
    k('kiste.lage', 'kiste-lage'),
    k('kiste.drei_d', 'lage-3d'),
    k('kiste.link', 'kiste-link'),
    k('kiste.druck', 'kiste-druck'),
  ],
  platz: [k('platz.start'), k('platz.drehen', 'platz-drehen'), k('platz.fein', 'platz-fein'), k('platz.speichern', 'platz-speichern')],
  bereiche: [
    k('bereiche.start'),
    k('bereiche.neu', 'bereiche-neu'),
    k('bereiche.zeile', 'bereiche-zeile'),
    k('bereiche.bearbeiten', 'bereiche-bearbeiten'),
    k('bereiche.loeschen', 'bereiche-loeschen'),
  ],
  zimmer: [
    k('zimmer.start'),
    k('zimmer.grundriss', 'zimmer-grundriss'),
    k('zimmer.auswahl', 'zimmer-auswahl'),
    k('zimmer.bearbeiten', 'zimmer-bearbeiten'),
    k('zimmer.zahlen', 'zimmer-zahlen'),
    k('zimmer.inhalt', 'zimmer-inhalt'),
    k('zimmer.knoepfe', 'zimmer-knoepfe'),
    k('zimmer.ohne_platz', 'zimmer-ohne-platz'),
    k('zimmer.kiste_neu', 'zimmer-kiste-neu'),
    k('zimmer.gegenstand_neu', 'zimmer-gegenstand-neu'),
    k('zimmer.moebel_neu', 'zimmer-moebel-neu'),
  ],
  person: [
    k('person.start'),
    k('zimmer.auswahl', 'zimmer-auswahl'),
    k('zimmer.bearbeiten', 'zimmer-bearbeiten'),
    k('zimmer.zahlen', 'zimmer-zahlen'),
    k('zimmer.knoepfe', 'zimmer-knoepfe'),
    k('zimmer.kiste_neu', 'zimmer-kiste-neu'),
  ],
  zeichner: [
    k('zeichner.start'),
    k('zeichner.flaeche', 'z-flaeche'),
    k('zeichner.maus'),
    k('zeichner.werkzeuge', 'z-werkzeuge'),
    k('zeichner.links', 'z-links'),
    k('zeichner.rechts', 'z-rechts'),
    k('zeichner.w_auswahl', 'z-w-auswahl'),
    k('zeichner.w_raum', 'z-w-raum'),
    k('zeichner.w_rechteck', 'z-rechteck'),
    k('zeichner.w_teilen', 'z-w-teilen'),
    k('zeichner.w_nische', 'z-w-nische'),
    k('zeichner.formen'),
    k('zeichner.w_tuer', 'z-w-tuer'),
    k('zeichner.w_fenster', 'z-w-fenster'),
    k('zeichner.w_moebel', 'z-w-moebel'),
    k('zeichner.w_regal', 'z-w-regal'),
    k('zeichner.w_schrank', 'z-w-schrank'),
    k('zeichner.w_kiste', 'z-w-kiste'),
    k('zeichner.w_messen', 'z-w-messen'),
    k('zeichner.w_linie', 'z-w-linie'),
    k('zeichner.zimmer', 'z-zimmer'),
    k('zeichner.rueck', 'z-rueck'),
    k('zeichner.vor', 'z-vor'),
    k('zeichner.hilfe', 'z-hilfe'),
    k('zeichner.ansicht', 'z-ansicht'),
    k('zeichner.drei_d'),
    k('zeichner.speichern', 'z-speichern'),
    k('zeichner.zoom', 'z-zoom'),
    k('zeichner.seite', 'z-seite'),
    k('zeichner.raster', 'z-raster'),
    k('zeichner.winkel', 'z-winkel'),
    k('zeichner.tasten', 'z-tasten'),
  ],
  grundriss: [
    k('grundriss.start'),
    k('grundriss.raeume', 'grundriss-raeume'),
    k('grundriss.plan', 'grundriss-plan'),
    k('grundriss.drei_d', 'grundriss-3d'),
  ],
  moebel: [k('moebel.start'), k('moebel.neu', 'moebel-neu'), k('moebel.filter', 'moebel-filter')],
  suche: [k('suche.start'), k('suche.feld', 'suche-feld'), k('suche.treffer')],
  scan: [k('scan.start'), k('scan.kamera', 'scan-kamera'), k('scan.nummer', 'scan-nummer')],
  chat: [k('chat.start'), k('chat.anruf', 'chat-anruf'), k('chat.video', 'chat-video')],
  profil: [
    k('profil.start'),
    k('profil.sprache', 'profil-sprache'),
    k('profil.aussehen', 'profil-aussehen'),
    k('profil.bewegung', 'profil-bewegung'),
    k('profil.admin', 'profil-admin'),
    k('profil.abmelden', 'profil-abmelden'),
  ],
  admin: [
    k('admin.start'),
    k('admin.zahlen', 'admin-zahlen'),
    k('admin.wartende', 'admin-wartende'),
    k('admin.knoepfe', 'admin-knoepfe'),
    k('admin.suche', 'admin-suche'),
  ],
  allgemein: [k('allgemein.start')],
}

/** Alle Schritte fuer diese Seite: die Seite zuerst, dann Kopf und
 *  Navigation. Der Zeichner hat seine eigene, lange Erklaerung. */
export function tourFuer(pfad: string, g: { desktop: boolean; zeichnen: boolean }): TourSchritt[] {
  const name = tourName(pfad, g)
  return [...SEITEN[name], ...KOPF, ...NAVIGATION, k('ende')]
}

export { SEITEN as TOUR_SEITEN }
