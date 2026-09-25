/* Datenmodell, passend zu supabase/migrations.
 * Wenn sich eine Migration aendert, aendert sich diese Datei im selben
 * Arbeitsgang. Zwei Fassungen, die auseinanderlaufen, sind der teuerste
 * Fehler in diesem Projekt.
 */
import type { ObjektForm, Punkt } from './geometrie'

export type MemberRole = 'owner' | 'editor' | 'viewer'
export type TagKind = 'room' | 'person'
export type ItemKind = 'box' | 'furniture' | 'bag' | 'other'
export type ItemStatus = 'open' | 'transit' | 'arrived'
export type MessageKind = 'text' | 'image' | 'voice' | 'file' | 'system' | 'call'
export type CallStatus = 'ringing' | 'active' | 'ended' | 'missed' | 'declined'

export interface Profile {
  id: string
  display_name: string | null
  email: string | null
  avatar_path: string | null
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  name: string
  note: string | null
  from_address: string | null
  to_address: string | null
  move_date: string | null
  owner_id: string
  archived: boolean
  created_at: string
  updated_at: string
}

export interface ProjectMember {
  project_id: string
  user_id: string
  role: MemberRole
  last_read_at: string
  created_at: string
  profile?: Profile | null
}

export interface ProjectInvite {
  id: string
  project_id: string
  code: string
  role: MemberRole
  created_by: string | null
  expires_at: string | null
  max_uses: number | null
  uses: number
  active: boolean
  created_at: string
}

export interface Tag {
  id: string
  project_id: string
  kind: TagKind
  name: string
  short: string
  color: string
  /* Ein Zeichen, das neben dem Kuerzel steht. Freiwillig. */
  symbol: string | null
  note: string | null
  sort: number
  created_at: string
}

export interface Item {
  id: string
  project_id: string
  kind: ItemKind
  title: string | null
  room_id: string | null
  person_id: string | null
  code_source: TagKind
  prefix: string
  size: number
  seq: number
  code: string
  status: ItemStatus
  note: string | null
  fragile: boolean
  target_room: string | null
  /* Angaben, die nur Moebel brauchen. Moebel sind Eintraege mit
   * kind = 'furniture', keine eigene Tabelle. Siehe Migration 0010. */
  hersteller: string | null
  modell: string | null
  masse: string | null
  zerlegt: boolean
  /* Markieren wie in Excel. Gehoert der einzelnen Zeile, nicht dem
   * Zimmer. Die Zimmerfarbe bleibt davon unberuehrt. */
  mark_color: string | null
  mark_symbol: string | null
  /* Eigene Hoehe in cm, wenn die Kiste nicht so hoch ist wie ihre
   * Groesse, etwa eine Kleiderbox. null heisst: die Hoehe der Groesse. */
  eigene_hoehe_cm: number | null
  /* Eigene Groesse des Umzugs (0027). Ist sie gesetzt, bestimmt sie Laenge,
   * Breite und Hoehe; die Stufe in der Nummer setzt dann die Datenbank. */
  eigene_groesse_id: string | null
  /* Platz im Grundriss (0028): Raum, Mittelpunkt, Drehung und genau eine
   * Unterlage. Entweder alles oder nichts; die Hoehe wird nie gespeichert. */
  platz_raum_id: string | null
  platz_x: number | null
  platz_y: number | null
  platz_drehung: 0 | 90 | null
  unterlage_art: UnterlageArt | null
  unterlage_item_id: string | null
  unterlage_objekt_id: string | null
  fach_ebene: number | null
  fach_spalte: number | null
  /* Das Bild, das beim Scannen sofort erscheint. Verweis auf eine Zeile
   * in item_photos, kein zweiter Pfad. Siehe Migration 0012. */
  cover_photo_id: string | null
  arrived_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

/** Woher eine Zeile der Inhaltsliste kommt. Ein Vorschlag der
 *  Bilderkennung bleibt als solcher erkennbar, auch nachdem er
 *  uebernommen wurde. Siehe Migration 0013. */
export type InhaltQuelle = 'hand' | 'bild'

export interface ItemContent {
  id: string
  item_id: string
  project_id: string
  text: string
  qty: number
  checked: boolean
  sort: number
  quelle: InhaltQuelle
  /* Wo der Gegenstand zu sehen ist: auf welchem Bild, in welcher
   * Schicht, und an welcher Stelle des Bildes. 0 ist links und oben,
   * 1 ist rechts und unten. Anteile statt Punkte, weil dasselbe Bild
   * auf jedem Geraet anders gross erscheint. Siehe Migration 0018. */
  photo_id: string | null
  schicht: number | null
  punkt_x: number | null
  punkt_y: number | null
  /* Hat ein Mensch hingesehen? null heisst "noch niemand", und das ist
   * etwas anderes als "nein, das ist es nicht". */
  bestaetigt: boolean | null
  /* Der Rahmen um das Ding im Bild, als Anteil 0 bis 1. Alle vier oder
   * keiner. Hat ein Eintrag einen Rahmen, ist punkt_x/punkt_y seine
   * Mitte; das setzt die Datenbank (0023). */
  box_x0: number | null
  box_y0: number | null
  box_x1: number | null
  box_y1: number | null
  /** Woerter, unter denen jemand das Ding sucht, in beiden Sprachen. */
  suchwoerter: string[]
  /** Das ausgeschnittene Bild des Dings im Speicher item-photos. */
  ausschnitt_pfad: string | null
  /** Selbsteinschaetzung der Erkennung, 0 bis 1. null bei Handeintraegen. */
  sicherheit: number | null
  created_at: string
}

/** Eine Stufe der Kistengroesse, 1 bis 10. Liter ist der Inhalt, wie ihn
 *  der Hersteller angibt; die Masse sind Aussenmasse eines typischen
 *  Kartons dieser Stufe. Die Zahlen stehen nur in der Datenbank
 *  (Migration 0021) und werden von dort gelesen. */
export interface KistenGroesse {
  stufe: number
  liter: number
  /** Bis hierher (ausschliesslich) zaehlt ein Karton zu dieser Stufe.
   *  null bei der groessten Stufe. */
  bis_liter: number | null
  laenge_cm: number
  breite_cm: number
  hoehe_cm: number
}

/** Ein Treffer der Suche ueber alle Umzuege (inhalt_suchen, 0024): ein
 *  Ding, und wo es steht, bis zur Hoehe ueber dem Boden. */
export interface SuchTreffer {
  content_id: string
  inhalt: string
  menge: number
  schicht: number | null
  photo_id: string | null
  foto_pfad: string | null
  box_x0: number | null
  box_y0: number | null
  box_x1: number | null
  box_y1: number | null
  punkt_x: number | null
  punkt_y: number | null
  ausschnitt_pfad: string | null
  bestaetigt: boolean | null
  item_id: string
  item_code: string
  item_kind: ItemKind
  item_title: string | null
  item_status: ItemStatus
  project_id: string
  project_name: string
  room_id: string | null
  room_name: string | null
  room_color: string | null
  /* Uebergang bis 0030 (siehe 0029): plan_x/plan_y tragen den Mittelpunkt
   * im Grundriss in cm, plan_z die Zahl der Kisten darunter, regal_name
   * und regal_boden Objekt und Ebene eines Fachs. null = ohne Platz. */
  plan_x: number | null
  plan_y: number | null
  plan_z: number | null
  regal_name: string | null
  regal_boden: number | null
  /** Unter- und Oberkante in cm ueber dem Zimmerboden, ohne Platz null. */
  hoehe_von: number | null
  hoehe_bis: number | null
  treffer: number
}

export type PhotoArt = 'foto' | 'anleitung'

export interface ItemPhoto {
  id: string
  /* Ein Foto haengt entweder an einer Kiste oder an einem Bereich.
   * Genau eines von beiden ist gesetzt, die Datenbank prueft das.
   * Siehe Migration 0013. */
  item_id: string | null
  tag_id: string | null
  project_id: string
  path: string
  /** Gewoehnliches Foto oder Aufbauanleitung (Bild oder PDF). */
  art: PhotoArt
  /** Welche Seite zu sehen ist, etwa vorne, hinten, Unterseite. */
  seite: string | null
  /* Wie tief in der Kiste. 1 ist die oberste Lage, 2 liegt darunter.
   * null heisst: ohne Schicht aufgenommen. Siehe Migration 0018. */
  schicht: number | null
  caption: string | null
  created_by: string | null
  created_at: string
}

/* -------------------------------------------------------- Bilderkennung */

/** Ein Ding, das die Erkennung auf einem Bild gesehen hat. */
export interface ErkanntesDing {
  /** Der Name in der Sprache, in der gefragt wurde. */
  text: string
  /** Wie oft es zu sehen ist. Mindestens 1. */
  menge: number
  /** 0 bis 1. Niedrige Werte werden angezeigt, nicht weggeworfen. */
  sicherheit: number
  /** Zerbrechlich, schwer, und was sonst beim Tragen zaehlt. */
  hinweis?: string | null
  /* Wo auf dem Bild das Ding sitzt, als Anteil von 0 bis 1. Geschaetzt,
   * nicht gemessen: darum wird der Punkt im Bild gezeigt und von einem
   * Menschen bestaetigt, statt ihn einfach zu glauben. x und y sind die
   * Mitte, x0 bis y1 der Rahmen (seit 0023). Aeltere Ergebnisse haben nur
   * den Punkt, ganz alte gar nichts. */
  x?: number | null
  y?: number | null
  x0?: number | null
  y0?: number | null
  x1?: number | null
  y1?: number | null
  /** Beide Namen und Suchwoerter, fuer die Suche ueber alle Umzuege. */
  name_de?: string | null
  name_ar?: string | null
  suchwoerter?: string[]
}

export interface PhotoAnalyse {
  id: string
  project_id: string
  photo_id: string
  sprache: 'de' | 'ar'
  status: 'fertig' | 'fehler'
  modell: string | null
  ergebnis: ErkanntesDing[]
  fehler: string | null
  created_by: string | null
  created_at: string
}

export interface ItemEvent {
  id: number
  project_id: string
  item_id: string | null
  user_id: string | null
  type: string
  data: Record<string, unknown>
  created_at: string
}

export interface Message {
  id: string
  project_id: string
  sender_id: string | null
  kind: MessageKind
  body: string | null
  attachment_path: string | null
  attachment_meta: Record<string, unknown>
  reply_to: string | null
  call_id: string | null
  edited_at: string | null
  deleted_at: string | null
  created_at: string
}

export interface MessageReaction {
  message_id: string
  user_id: string
  emoji: string
  project_id: string
  created_at: string
}

export interface MessageLink {
  id: string
  message_id: string
  project_id: string
  target_type: 'item' | 'tag'
  target_id: string
  label: string | null
}

export interface Call {
  id: string
  project_id: string
  created_by: string | null
  video: boolean
  status: CallStatus
  started_at: string | null
  ended_at: string | null
  created_at: string
}

export interface CallParticipant {
  call_id: string
  user_id: string
  state: 'invited' | 'joined' | 'left' | 'declined' | 'missed'
  joined_at: string | null
  left_at: string | null
}

export interface NotificationPrefs {
  user_id: string
  chat: boolean
  calls: boolean
  items: boolean
}

export interface ProjectStats {
  project_id: string
  items_total: number
  items_arrived: number
  items_transit: number
  items_open: number
}

/* ---------------------------------------------------- Eigene Groessen */

/** Eine eigene Groesse des Umzugs (0027). Bei Moebeln optional L-Form als
 *  Rechteck mit rechteckigem Ausschnitt. */
export interface EigeneGroesse {
  id: string
  project_id: string
  name: string
  art: 'kiste' | 'moebel'
  laenge_cm: number
  breite_cm: number
  hoehe_cm: number
  ausschnitt_breite_cm: number | null
  ausschnitt_tiefe_cm: number | null
  created_at: string
  updated_at: string
}

/** Was eine Aenderung der Masse ausloest (eigene_groesse_folgen). */
export interface GroessenFolgen {
  kisten: number
  moebel: number
  stufe_neu: number
  neue_nummer: number
}

/* ------------------------------------------------------------ Grundriss */

export interface Grundriss {
  id: string
  project_id: string
  name: string
  sort: number
  version: number
  created_at: string
  updated_at: string
}

export interface Raum {
  id: string
  grundriss_id: string
  project_id: string
  tag_id: string | null
  name: string
  art: 'innen' | 'draussen'
  /** In der Datenbank flach, hier schon als Punkte (api.ts wandelt). */
  punkte: Punkt[]
  hoehe_cm: number
  bodenfarbe: string | null
  wandfarben: (string | null)[] | null
  sort: number
  /* aus grundriss_laden */
  tag_name: string | null
  tag_short: string | null
  tag_color: string | null
}

export interface Oeffnung {
  id: string
  raum_id: string
  art: 'tuer' | 'fenster'
  kante: number
  abstand_cm: number
  breite_cm: number
  hoehe_cm: number
  bruestung_cm: number
  anschlag: 'links' | 'rechts'
  aufschlag: 'innen' | 'aussen'
}

export type ObjektArt = 'moebel' | 'regal' | 'schrank'

export interface Objekt extends ObjektForm {
  id: string
  raum_id: string
  art: ObjektArt
  name: string
  farbe: string | null
  item_id: string | null
  item_code: string | null
  item_title: string | null
}

export type UnterlageArt = 'boden' | 'kiste' | 'objekt' | 'fach'

export interface Platz {
  raum_id: string
  x: number
  y: number
  drehung: 0 | 90
  unterlage: UnterlageArt
  unterlage_item_id: string | null
  unterlage_objekt_id: string | null
  ebene: number | null
  spalte: number | null
}

/** Eine Kiste in grundriss_laden, mit fertigen Massen und Hoehen. */
export interface PlanKiste {
  id: string
  code: string
  prefix: string
  size: number
  seq: number
  kind: ItemKind
  status: ItemStatus
  title: string | null
  room_id: string | null
  room_color: string | null
  mark_color: string | null
  eigene_groesse_name: string | null
  platz_raum_id: string
  platz_x: number
  platz_y: number
  platz_drehung: 0 | 90
  unterlage_art: UnterlageArt
  unterlage_item_id: string | null
  unterlage_objekt_id: string | null
  fach_ebene: number | null
  fach_spalte: number | null
  laenge_cm: number
  breite_cm: number
  hoehe_cm: number
  unten_cm: number
  oben_cm: number
  grenze_cm: number
  wurzel_art: 'boden' | 'objekt' | 'fach'
  nr: number
}

export interface GrundrissDaten {
  grundriss: Grundriss
  raeume: Raum[]
  oeffnungen: Oeffnung[]
  objekte: Objekt[]
  kisten: PlanKiste[]
}

type LageGrundriss = { id: string; name: string }
type LageRaum = { id: string; name: string | null; tag_id: string | null }
type LageObjekt = { id: string; name: string; art: ObjektArt }

/** Wo eine Kiste steht (kiste_lage), oder bei Moebeln, wo ihr Objekt steht. */
export type KisteLage =
  | {
      art: 'kiste'
      grundriss: LageGrundriss
      raum: LageRaum
      platz_x: number
      platz_y: number
      drehung: 0 | 90
      unterlage_art: UnterlageArt
      unterlage_item_id: string | null
      unterlage_code: string | null
      objekt: LageObjekt | null
      fach_ebene: number | null
      fach_spalte: number | null
      laenge_cm: number
      breite_cm: number
      hoehe_cm: number
      unten_cm: number
      oben_cm: number
      grenze_cm: number
      nr: number
      auf_ihr: string[]
    }
  | {
      art: 'moebel'
      grundriss: LageGrundriss
      raum: LageRaum
      objekt: LageObjekt
      unten_cm: 0
      oben_cm: number
    }

/** Aenderungen fuer grundriss_speichern. Reihenfolge in der Datenbank:
 *  loeschen, raeume, verschieben, objekte, zuordnen, oeffnungen. */
export interface GrundrissAenderung {
  oeffnungen_loeschen?: string[]
  objekte_loeschen?: string[]
  raeume_loeschen?: string[]
  raeume?: Omit<Raum, 'project_id' | 'grundriss_id' | 'tag_name' | 'tag_short' | 'tag_color'>[]
  verschieben?: { raum_id: string; dx: number; dy: number }[]
  objekte?: Omit<Objekt, 'item_code' | 'item_title'>[]
  zuordnen?: { von_raum_id: string; nach_raum_id: string }[]
  oeffnungen?: Oeffnung[]
}

/** Ein Raum aus der Liste aller Raeume eines Umzugs. */
export interface RaumEintrag {
  id: string
  grundriss_id: string
  grundriss_name: string
  tag_id: string | null
  name: string
}

/* --------------------------------------------------------- Anzeigehilfen */

/* Die Woerter zu Status, Art, Groesse und Rolle stehen im Woerterbuch
 * unter status.*, art.*, groesse.* und rolle.*, nicht hier. Hier standen
 * sie frueher ein zweites Mal, fest auf Deutsch. Zwei Fassungen derselben
 * Angabe laufen auseinander, und die hier haette auch im arabischen Satz
 * Deutsch gezeigt. */

export const STATUS_COLOR: Record<ItemStatus, string> = {
  open: '#ef4444',
  transit: '#f59e0b',
  arrived: '#16a34a',
}

export const TAG_COLORS = [
  '#2563EB',
  '#0EA5E9',
  '#14B8A6',
  '#16A34A',
  '#84CC16',
  '#F59E0B',
  '#F97316',
  '#EF4444',
  '#EC4899',
  '#A855F7',
  '#7C3AED',
  '#64748B',
  '#A16207',
  '#0F766E',
]
