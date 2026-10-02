/* three.js fuer die 3D-Ansicht: aus den Koerpern von szene.ts werden
 * Meshes, dazu Kamera, Licht und OrbitControls. Raum3D.tsx und
 * Vorschau3D.tsx benutzen das hier; beide liegen in Code-Teilen, die erst
 * mit der 3D-Ansicht geladen werden.
 *
 * Keine Schatten. Gezeichnet wird in einer einzigen Bildschleife
 * (requestAnimationFrame), die nur laeuft, solange sich etwas bewegt:
 * Kamera, Gehen, Umschauen, Tueren, Schubladen, Hinsetzen, ein Ding in der
 * Hand, andere Leute, ein laufender Fernseher oder Wasserhahn. Steht alles
 * still, ruht sie, und das Handy darf schlafen. Rechnen und Zeichnen
 * geschehen im selben Bild, ohne ein Bild Verspaetung.
 *
 * Fluessig auch auf schwachen Geraeten: Materialien gleicher Farbe werden
 * geteilt. Beim Drehen der Ansicht rechnet der Renderer mit hoechstens 1,5
 * Bildpunkten je Pixel, im Stand scharf. Beim Begehen (E82) wird die
 * Aufloesung einmal beim Start gewaehlt und bleibt fest (jedes Umstellen
 * baut die Leinwand neu und ruckelt); nur wenn das Geraet nicht mitkommt,
 * sinkt sie ein einziges Mal und bleibt dann unten.
 *
 * Mit Maus: linke Taste dreht, rechte verschiebt, Rad zoomt. Im Zeichner
 * laesst sich ein Moebel, Regal oder Schrank mit der linken Taste am Boden
 * entlang ziehen (ziehen()). Am Handy: ein Finger dreht, zwei Finger
 * verschieben und zoomen.
 *
 * Begehen (E82): weich anfahren und abbremsen, an Waenden jeder Richtung
 * entlang gleiten (kollision.ts), Tueren mit Klinke und Schluessel,
 * Hinsetzen und Hinlegen, Dinge aufheben und ablegen, Fernseher und
 * Wasserhahn, Spiegel, die eigene Figur (nur im Spiegel zu sehen) und die
 * anderen Leute im Umzug. Gespeichert wird davon nichts, alles gilt nur
 * fuer diese Sitzung.
 *
 * Ebenen und Aufzug (E83): eine Welt (welt()) kann mehrere begehbare
 * Boeden mitbringen, etwa die Geschosse einer Siedlung und das Gelaende.
 * Beim Begehen steht man immer auf genau einer Ebene: die Augen auf ihrem
 * Boden plus Augenhoehe, und es halten nur ihre Hindernisse auf (auf der
 * Ebene der Wohnung dazu die der Wohnung). Zu Fuss verlaesst man die Ebene
 * nicht; man wechselt per Knopf (ebeneWechseln) oder faehrt im Aufzug mit
 * (fahrt() der Welt). Sitzen und Liegen gibt es nur auf der Ebene der
 * Wohnung; ein Ding in der Hand geht mit und landet beim Ablegen nie
 * unter dem Boden, auf dem man steht.
 *
 * Siedlung innen (E84): mehrere Haeuser haben Geschosse gleicher Hoehe,
 * jedes mit eigenen Hindernissen. Darum zaehlt immer der Index der Ebene,
 * nie die Hoehe allein: nach einer Aufzugfahrt gilt ihr Ziel (fahrt().ziel),
 * eine neue Welt beim Begehen (etwa nach einem Wechsel des Farbschemas)
 * findet die Ebene ueber ihre Kennung wieder, und springen() setzt Stelle
 * und Ebene zugleich. Im Aufzug faehrt nur mit, wer im Grundriss der
 * Kabine steht (kabine der Welt), nicht jeder auf gleicher Hoehe in einem
 * anderen Haus. Hat die Welt eine Methode kamera(), bekommt sie beim
 * Begehen in jedem Bild die Stelle der Kamera (sie schaltet damit das
 * Innere der Wohnungen in der Naehe an) und einmal die der Rundumsicht,
 * wenn das Begehen endet.
 *
 * Hoehe (E87, Rechnung in physik.ts): die Fuesse stehen auf dem Boden der
 * Ebene plus ihrem Gelaende (Ebene3D.hoehe) plus dem, worauf man steht.
 * Niedriges (Hindernis3D.oben bis STUFE_M) steigt man im Gehen hinauf,
 * Hoeheres haelt auf, bis man darueber springt (Leertaste oder hupfen());
 * wer von einer Mauer geht, faellt hinunter. Tische, Betten und Sofas der
 * Wohnung haben ihre echte Oberkante, Waende keine; in der Wohnung stoesst
 * der Kopf an die Decke (Hoehe der Waende). Das Auge folgt den Fuessen am
 * Boden leicht geglaettet (Stufen, Knicke des Gelaendes), in der Luft
 * genau; beim Landen sinkt es nur in der Bewegungsstufe "voll" kurz ein.
 * Treppen der Welt (Welt3D.treppen) betritt man ueber ihre Kante von oder
 * nach und verlaesst sie am anderen Ende auf der anderen Ebene (ebeneJetzt
 * meldet es). Zaehlt version() der Welt hoch, liest der Motor Ebenen,
 * Treppen, Fahrzeuge und Dinge neu (Raster nur, wo die Hindernisse neu
 * sind) und bleibt auf derselben Ebene und Stelle.
 *
 * Fahren (E87, Rechnung in fahren.ts): Fahrzeuge und Dinge der Welt
 * uebernimmt der Motor in seine Szene (Regel bei welt()). Mit E, einem
 * Knopf oder einem Tipp aufs Fahrzeug steigt man nahe der Fahrertuer ein;
 * W A S D, Pfeile und Knueppel fahren, die Leertaste bremst, V wechselt
 * zwischen Fahrersitz und Sicht von hinten, B schaltet ein Blaulicht, E
 * steigt wieder aus (neben der Fahrertuer, sonst gegenueber, sonst
 * rundherum, nie in einem Hindernis). Gefahren wird auf der Ebene des
 * Fahrzeugs gegen ihr Raster (was hoeher als ein Bordstein ist) und gegen
 * die anderen Fahrzeuge; Aufzug und Treppen gelten fuer Fahrzeuge nicht.
 * Abgestellte Fahrzeuge halten beim Gehen auf (eigenes, kleines Raster,
 * kollision.ts dazu), weiter als 150 m entfernte sind nicht zu sehen
 * (ausser dem eigenen und von anderen gelenkten). Wer faehrt, meldet in
 * Pose3D.lenkt das Fahrzeug; fremde gelenkte Fahrzeuge gleiten weich
 * dorthin, die Figur des Fahrers ist dann nicht zu sehen.
 *
 * Hinstellen (E87, Regeln in hinstellen.ts): ein Ding in der Hand (der
 * Wohnung oder der Welt) steht in jedem Bild halb durchsichtig dort, wohin
 * man zeigt (Maus, sonst Mitte des Bildes), gruen, wenn es dort passt, rot,
 * wenn nicht; zeigt man zu weit, bleibt es in der Hand. Gezielt wird genau
 * gegen die Wohnung und die Dinge der Welt (three) und gegen das Raster der
 * Ebene (strahlZiel), nie gegen die Dreiecke der ganzen Stadt: das kostete
 * am Rechner Millisekunden je Bild. Klick, Tipp oder hinstellen() stellen
 * es hin, R, Umschalt+R, Mausrad und drehen() drehen es um 45 Grad.
 *
 * Nacharbeit (E87b): greifen und zielen nur auf Dinge im eigenen Geschoss
 * (dingGreifbar in hinstellen.ts; die Ebenen kennen keine Decke). Die
 * Sichtbarkeit unbewegter Dinge bestimmt die Welt. Lenkt ein Mitspieler
 * ein Fahrzeug, das es hier nicht gibt, sitzt seine Figur an ihrer
 * Stellung. Dieselbe Lage noch einmal (Neubau der Welt) wirft nichts aus
 * der Hand. Beim Abbau und wenn die Welt beim Fahren geht, meldet bewegt()
 * die Lage des Fahrzeugs. Fehlt nach einer neuen Welt die Ebene, auf der
 * man stand, wartet der Motor bis zu 5 s auf sie (EBENE_WARTEN_MS). Fuer
 * gemerkte Lagen unbekannter Kennungen baut die Welt das Ding einzeln
 * (Welt3D.dingErzeugen).
 */
import {
  AmbientLight,
  Box3,
  BoxGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DataTexture,
  DirectionalLight,
  EdgesGeometry,
  Euler,
  Group,
  LinearFilter,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshLambertMaterial,
  MeshBasicMaterial,
  MeshPhongMaterial,
  Matrix3,
  PointLight,
  MOUSE,
  PerspectiveCamera,
  Plane,
  PlaneGeometry,
  Quaternion,
  Raycaster,
  RepeatWrapping,
  RGBAFormat,
  Scene,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  SRGBColorSpace,
  TOUCH,
  Vector2,
  Vector3,
  WebGLRenderer,
  type BufferGeometry,
  type Fog,
  type Material,
  type Object3D,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'
import { hervorMitte, szeneRahmen, TUER_OFFEN_GRAD, type Koerper, type Licht3D, type Quader, type Vec3 } from './szene.ts'
import { AUFZUG_BODEN_M, Ebenen, Hindernisse, KOERPER_RADIUS_M, Mitfahrt, type Stelle } from './kollision.ts'
import { augeFolgen, delle, delleTiefe, grundAn, hupfenStart, KOPF_M, senkrechtNeu, senkrechtSchritt, senkrechtSetzen, Treppen } from './physik.ts'
import {
  aussteigenSuchen,
  EINSTEIGEN_M,
  FAHR_FOV_INNEN,
  fahrBoden,
  fahrErgebnis,
  fahrerSicht,
  fahrSchritt,
  fahrWerte,
  fahrZustand,
  GRENZE_KMH,
  lageAnwenden,
  radDrehen,
  raederStellen,
  tempoKmh,
  tuerAbstand,
  verfolgen,
  verfolger,
  type FahrEingabe,
  type FahrerSicht,
  type FahrWerte,
  type FahrZustand,
  type Verfolger,
} from './fahren.ts'
import {
  DREH_STUFE_RAD,
  REICHWEITE_M,
  dingGreifbar,
  hinstellenPruefen,
  stellErgebnis,
  strahlTreffer,
  strahlZiel,
  stufeDrehen,
  stufeFuer,
  tippPunkt,
  zeigePunkt,
  type StellAnfrage,
  type StellDing,
  type StellErgebnis,
  type StellUmgebung,
  type StrahlTreffer,
  type StrahlWelt,
  type ZeigeEingabe,
} from './hinstellen.ts'
import type { DingLage3D, Fahrzeug3D, Figur3D, FahrzeugJetzt, Haltung, Interaktiv3D, Moeglich3D, Pose3D, Welt3D, WeltDing3D } from './vertrag3d.ts'

export type { Haltung, Pose3D, Figur3D, Welt3D, Ebene3D, Interaktiv3D, Sprungziel3D } from './vertrag3d.ts'
export type { DingLage3D, FahrzeugJetzt, Moeglich3D, Treppe3D, Fahrzeug3D, WeltDing3D } from './vertrag3d.ts'

/** Die Ebene, auf der man beim Begehen steht (E83): Index in welt().ebenen,
 *  Kennung und Name. */
export interface EbeneJetzt {
  index: number
  id: string
  name: string
}

/** Eine laufende Aufzugfahrt (E83), gemeldet von fahrt() der Welt: ziel
 *  ist der Index der Ebene, zu der die Kabine faehrt, y die Hoehe ihres
 *  Bodens gerade jetzt (Meter, wie Ebene3D.y). Der Motor folgt y; nach der
 *  Fahrt gilt die Ebene ziel (E84, siehe ankunftsEbene), ohne gueltiges
 *  ziel die mit dem naechsten Boden. */
export interface Fahrt3D {
  ziel: number
  y: number
}

/** Eine Welt mit Aufzug und Innenleben. Nicht Teil von Welt3D; der Motor
 *  fragt danach. fahrt() (E83) gibt waehrend der Fahrt die Lage der
 *  Kabine, sonst null. kabine (E83, im Motor seit E84): Grundriss der
 *  Kabine innen (x0, z0, x1, z1, Meter, Welt); mit faehrt nur, wer darin
 *  steht. kamera() (E84) bekommt beim Begehen in jedem Bild die Stelle der
 *  Kamera (Meter, Welt; y in Augenhoehe), dazu einmal beim Start, nach
 *  jedem Sprung und, wenn das Begehen endet, die Stelle der Rundumsicht. */
type WeltMitFahrt = Welt3D & {
  fahrt?: () => Fahrt3D | null
  kabine?: readonly number[] | null
  kamera?: (x: number, y: number, z: number) => void
}

/** Wo man vor einer neuen Welt stand (E84): Kennung und Index der Ebene
 *  (null und -1: die Wohnung allein), ihr Boden und ob es die Ebene der
 *  Wohnung war. */
export interface EbeneMerk {
  id: string | null
  index: number
  y: number
  wohnung: boolean
}

/** Die Ebene mit dem naechsten Boden zu y; liegt die aktive genauso nah
 *  (gleiche Hoehe in mehreren Haeusern), bleibt es die aktive. */
function naechsteOderAktive(eb: Ebenen, y: number): number {
  const n = eb.naechste(y)
  const i = eb.index
  if (n === i || !eb.gibt(i) || !Number.isFinite(y)) return n
  return Math.abs(eb.boden(i) - y) <= Math.abs(eb.boden(n) - y) + 1e-6 ? i : n
}

/** Ebene nach einer Aufzugfahrt (E84). Mehrere Haeuser haben Geschosse
 *  gleicher Hoehe, darum zaehlt das Ziel der Fahrt (Index aus fahrt()),
 *  wenn es die Ebene gibt und ihr Boden dort liegt, wo man angekommen ist
 *  (hoechstens AUFZUG_BODEN_M daneben; wer beim Schliessen der Tueren
 *  hinausgegangen ist, steht noch am Start). Sonst die Ebene mit dem
 *  naechsten Boden, bei gleicher Hoehe die bisherige. y: der eigene Boden
 *  am Ende der Fahrt. */
export function ankunftsEbene(eb: Ebenen, ziel: number, y: number): number {
  if (Number.isInteger(ziel) && ziel >= 0 && eb.gibt(ziel) && Math.abs(eb.boden(ziel) - y) <= AUFZUG_BODEN_M) return ziel
  return naechsteOderAktive(eb, y)
}

/** Ebene nach einer neuen Welt beim Begehen (E84), nachdem eb.setzen()
 *  die neuen Ebenen hat: wer auf der Wohnung stand, steht wieder dort;
 *  sonst die Ebene mit derselben Kennung (am selben Index zuerst), sonst
 *  die mit dem naechsten Boden zu m.y. Nie nach der Hoehe allein: Haeuser
 *  haben Geschosse gleicher Hoehe mit eigenen Hindernissen. */
export function ebeneWiederfinden(eb: Ebenen, m: EbeneMerk): number {
  if (m.wohnung) return eb.wohnIndex
  if (m.id !== null) {
    if (m.index >= 0 && eb.gibt(m.index) && eb.liste[m.index].id === m.id) return m.index
    for (let i = 0; i < eb.liste.length; i++) if (eb.liste[i].id === m.id && eb.gibt(i)) return i
  }
  return naechsteOderAktive(eb, m.y)
}

/** So lange (ms) wartet der Motor nach einer neuen Welt beim Begehen auf
 *  die Ebene, auf der man stand, wenn es ihre Kennung (noch) nicht gibt
 *  (E87b): die Geschosse eines Hauses der Stadt kommen erst, wenn es fertig
 *  gebaut ist. */
export const EBENE_WARTEN_MS = 5000

/** Warten auf eine Ebene (E87b): ihre Kennung, der Boden, auf dem man
 *  stand, die Treppe darauf (Kennung oder null) und bis wann (ms, Uhr von
 *  performance.now). */
export interface EbeneWarten {
  id: string
  y: number
  treppe: string | null
  bis: number
}

/** Index der ersten begehbaren Ebene mit dieser Kennung, sonst -1. */
export function ebeneMitKennung(eb: Ebenen, id: string): number {
  for (let i = 0; i < eb.liste.length; i++) if (eb.liste[i].id === id && eb.gibt(i)) return i
  return -1
}

/** Nach einer neuen Welt beim Begehen (E87b): muss man auf die Ebene von
 *  vorher warten? Ja, wenn man nicht auf der Wohnung stand, die Welt eine
 *  version() hat (nur dann kann die Ebene spaeter kommen) und es ihre
 *  Kennung in eb (schon mit den neuen Ebenen) nicht gibt. Wartete man schon
 *  auf dieselbe Kennung (neue Welt mitten im Warten), gilt die alte Frist.
 *  Sonst null: dann wie bisher ebeneWiederfinden. */
export function ebeneWartenAb(eb: Ebenen, m: EbeneMerk, mitVersion: boolean, treppe: string | null, jetzt: number, alt: EbeneWarten | null): EbeneWarten | null {
  if (m.wohnung || m.id === null || !mitVersion || !Number.isFinite(jetzt)) return null
  if (ebeneMitKennung(eb, m.id) >= 0) return null
  const bis = alt && alt.id === m.id && Number.isFinite(alt.bis) ? alt.bis : jetzt + EBENE_WARTEN_MS
  return { id: m.id, y: m.y, treppe, bis }
}

/** Beim Warten (E87b, jedes Bild und nach jeder neuen version()): der
 *  Index der Ebene, sobald es sie gibt; -1, solange weiter gewartet wird;
 *  -2, wenn die Frist um ist (dann wie ohne Warten). */
export function ebeneWartenPruefen(eb: Ebenen, w: EbeneWarten, jetzt: number): number {
  const i = ebeneMitKennung(eb, w.id)
  if (i >= 0) return i
  return jetzt >= w.bis ? -2 : -1
}

/** Bis so weit (Meter) und so viel Drehung (rad) gelten zwei Lagen als
 *  dieselbe (E87b): Neubau der Welt, Umrechnung in den Rahmen der Siedlung
 *  und zurueck. */
export const LAGE_GLEICH_M = 0.01
export const LAGE_GLEICH_RAD = 0.01

/** Dieselbe Lage (E87b)? Gleiche Kennung und Art, Stelle auf LAGE_GLEICH_M
 *  und Drehung auf LAGE_GLEICH_RAD (ueber +-pi hinweg), gleiche Ebene;
 *  fehlt die Ebene auf einer Seite (''), zaehlt sie nicht. Kaputte Zahlen:
 *  nein. */
export function lageGleich(a: DingLage3D, b: DingLage3D): boolean {
  if (a.id !== b.id || a.art !== b.art) return false
  if (a.ebene && b.ebene && a.ebene !== b.ebene) return false
  // winkelDiff kaeme mit unendlich nie zurueck.
  if (!Number.isFinite(a.gier) || !Number.isFinite(b.gier)) return false
  const g = Math.abs(winkelDiff(a.gier, b.gier))
  return Math.abs(a.x - b.x) <= LAGE_GLEICH_M && Math.abs(a.y - b.y) <= LAGE_GLEICH_M && Math.abs(a.z - b.z) <= LAGE_GLEICH_M && g <= LAGE_GLEICH_RAD
}

/** Sichtbarkeit eines Dings der Welt in diesem Bild (E87b, teileSichtbar):
 *  bewegt (vom Motor hingestellt, abgelegt, Lage aus lage()) oder in der
 *  Hand: immer zu sehen. Sonst entscheidet die Welt (o.visible, etwa je
 *  Geschoss), und der Motor setzt nichts, ausser herkunftSichtbar ist
 *  falsch (der Elternteil in der Welt, aus dem es kam, ist aus): dann aus,
 *  vermerkt in d.versteckt, und nur dieses eigene Ausblenden nimmt er
 *  zurueck, sobald der Elternteil wieder an ist. Ohne neues Objekt. */
export function dingSichtbarkeit(o: { visible: boolean }, d: { versteckt: boolean }, bewegt: boolean, herkunftSichtbar: boolean): void {
  if (bewegt) {
    d.versteckt = false
    if (!o.visible) o.visible = true
  } else if (!herkunftSichtbar) {
    if (o.visible) {
      o.visible = false
      d.versteckt = true
    }
  } else if (d.versteckt) {
    d.versteckt = false
    o.visible = true
  }
}

/** Kennungen, fuer die die Welt ein Ding einzeln bauen soll (E87b,
 *  Welt3D.dingErzeugen): gemerkte Lagen, deren Kennung in der Welt fehlt.
 *  Je Welt wird jede Kennung hoechstens einmal gefragt, je Bild nur wenige
 *  (schritt). */
export class ErzeugenListe {
  private gefragt = new Set<string>()
  private readonly warte: string[] = []
  private readonly drin = new Set<string>()

  /** Neue Welt (oder keine): nichts wartet, jede Kennung darf wieder
   *  einmal gefragt werden. */
  neu(): void {
    this.gefragt = new Set()
    this.warte.length = 0
    this.drin.clear()
  }

  /** Wie viele warten. */
  get laenge(): number {
    return this.warte.length
  }

  /** Wurde id in dieser Welt schon gefragt? */
  schonGefragt(id: string): boolean {
    return this.gefragt.has(id)
  }

  /** id vormerken (sie fehlt in der Welt, eine Lage ist gemerkt), wenn sie
   *  in dieser Welt noch nicht gefragt wurde und nicht schon wartet. */
  vormerken(id: string): void {
    if (this.gefragt.has(id) || this.drin.has(id)) return
    this.drin.add(id)
    this.warte.push(id)
  }

  /** Ein Bild: fuer wartende Kennungen, die noch fehlen (fehlt(id); sonst
   *  fallen sie still weg, die Welt hat sie inzwischen), erzeugen(id) rufen
   *  (true: gebaut). Hoechstens jeBild gebaute und fragen Fragen; die
   *  gebauten Kennungen kommen nach gebaut. Gibt zurueck, wie oft gefragt
   *  wurde. Fehler faengt erzeugen selbst ab. */
  schritt(fehlt: (id: string) => boolean, erzeugen: (id: string) => boolean, jeBild: number, fragen: number, gebaut: string[]): number {
    gebaut.length = 0
    let n = 0
    while (this.warte.length && gebaut.length < jeBild && n < fragen) {
      const id = this.warte.pop() as string
      this.drin.delete(id)
      if (this.gefragt.has(id) || !fehlt(id)) continue
      this.gefragt.add(id)
      n++
      if (erzeugen(id)) gebaut.push(id)
    }
    return n
  }
}

/** Steht die Mitte x, z im Grundriss der Kabine k (x0, z0, x1, z1, Meter),
 *  mit einem Koerperradius Rand fuer die Tuer (E84)? Mit faehrt nur, wer
 *  darin steht, nicht jeder auf gleicher Hoehe: andere Haeuser haben
 *  Geschosse gleicher Hoehe. Ohne gueltiges k: ja (wie in E83). Ohne neues
 *  Objekt, laeuft in jedem Bild einer Fahrt. */
export function inKabine(k: readonly number[] | null | undefined, x: number, z: number): boolean {
  if (!Array.isArray(k) || k.length !== 4) return true
  const [x0, z0, x1, z1] = k
  if (!Number.isFinite(x0) || !Number.isFinite(z0) || !Number.isFinite(x1) || !Number.isFinite(z1)) return true
  const r = KOERPER_RADIUS_M
  return x >= Math.min(x0, x1) - r && x <= Math.max(x0, x1) + r && z >= Math.min(z0, z1) - r && z <= Math.max(z0, z1) + r
}

/** Weniger Bewegung gewuenscht (System oder Stufe "ruhig", wie in
 *  lib/util.ts rollenArt): Spruenge ohne Blende. Im Zweifel ja. */
function wenigBewegung(): boolean {
  try {
    return document.documentElement.dataset.motion === 'ruhig' || window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return true
  }
}

/** Volle Bewegung gewuenscht (Stufe "voll", System ohne Wunsch nach
 *  weniger Bewegung): nur dann sinkt das Auge beim Landen ein (E87). Im
 *  Zweifel nein. */
function vollBewegung(): boolean {
  try {
    return document.documentElement.dataset.motion === 'voll' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/** Augenhoehe ueber der Sitzflaeche beim Sitzen (Meter). */
export const SITZ_AUGE_M = 0.78
/** Augenhoehe ueber der Liegeflaeche beim Liegen (Meter). */
export const LIEGE_AUGE_M = 0.2

export type Blick = 'oben' | 'schraeg' | 'kiste'

export interface Motor {
  /** Neue Koerper zeigen. ausrichten: Kamera auf die Szene setzen. */
  setzen(koerper: Koerper[], hintergrund: string, ausrichten: boolean): void
  blick(b: Blick): void
  waendeHalb(an: boolean): void
  /** Hand: linke Maustaste (ein Finger) verschiebt, rechte dreht. Sonst
   *  umgekehrt. */
  hand(an: boolean): void
  /** Moebel ziehen erlauben (Zeichner), null schaltet es aus. traeger:
   *  Kiste -> Objekt, auf oder in dem ihr Stapel steht; sie gehen mit. */
  ziehen(fn: ((id: string, dxCm: number, dyCm: number) => void) | null, traeger: Map<string, string>): void
  /** Begehen: in Augenhoehe durch die Wohnung. start: Punkt im Plan (cm);
   *  null nimmt den Punkt, auf den die Kamera gerade schaut. Aus: die
   *  Kamera kehrt dorthin zurueck, wo sie vorher war. */
  begehen(an: boolean, start: [number, number] | null): void
  /** Gehen per Knopf (Handy): Richtung halten, loslassen stoppt. */
  gehenKnopf(richtung: GehRichtung, an: boolean): void
  /** Gehen per Steuerknueppel (E81): x nach rechts, y nach vorn, je -1
   *  bis 1. Wie weit gedrueckt, so schnell. 0, 0 bleibt stehen. */
  gehenStick(x: number, y: number): void
  /** Lichtquellen der Szene (Decke, Kueche, Lampen). E71. */
  lichter(liste: Licht3D[]): void
  /** Tag: Sonne, Lampen aus. Abend: wenig Himmel, alle Lampen an. */
  lichtModus(modus: 'tag' | 'abend'): void
  /** In welchen Raeumen das Licht an ist (E74). Die anderen sind dunkel. */
  lichtRaeume(an: Set<string>): void
  /** Klick auf einen Lichtschalter an der Wand: der Raum, den er schaltet.
   *  null schaltet es aus. */
  schalter(fn: ((raumId: string) => void) | null): void
  /** Kurzer Klick in die Szene (nicht auf eine Tuer): die Stelle im Plan
   *  in cm, auf Moebeln die Stelle auf ihnen. null schaltet es aus. Kisten
   *  zaehlen auch, wenn sie gedaempft sind (E82). Beim Begehen setzen,
   *  legen, heben und schalten Sitzplaetze, Dinge und Geraete selbst und
   *  melden sich hier nicht. */
  tippen(fn: ((xCm: number, yCm: number, treffer: Treffer3D | null) => void) | null): void
  /* ------------------------------------------------------------ E82 */
  /** false haelt jede Eingabe beim Begehen an (Tasten, Knueppel, Umschauen,
   *  Tippen auf das Bild), bis wieder true kommt; etwa solange ein Fenster
   *  ueber dem Bild offen ist. */
  eingabe(an: boolean): void
  /** Meldet, wenn man sich setzt, hinlegt oder aufsteht. */
  haltung(fn: ((h: Haltung) => void) | null): void
  /** Vom Sitz- oder Liegeplatz aufstehen (weich, wie beim Hinsetzen). */
  aufstehen(): void
  /** Meldet das Ding in der Hand (Kennung) oder null, wenn es abgelegt ist. */
  inHand(fn: ((ding: string | null) => void) | null): void
  /** Das Ding in der Hand ablegen, dort, wo man gerade steht. */
  ablegen(): void
  /** Aussenwelt (Garten, Strasse) neben der Wohnung. Zaehlt nicht fuer den
   *  Bildausschnitt. nebel und himmel (Farbe) gelten, solange sie da ist;
   *  null nimmt sie weg. Die Gruppe gehoert dem Aufrufer, er gibt sie frei. */
  umgebung(u: { gruppe: Object3D; nebel?: Fog | null; himmel?: string | null } | null): void
  /** Die anderen Leute im Umzug. Der Motor uebernimmt die Figuren und gibt
   *  die frei, die nicht mehr in der Liste stehen (und bei dispose). */
  leute(liste: { uid: string; figur: Figur3D }[]): void
  /** Neue Stellung eines Mitspielers; der Motor gleitet weich dorthin.
   *  Unbekannte uid: nichts. */
  leutePose(uid: string, p: Pose3D): void
  /** Die eigene Figur, nur im Spiegel zu sehen. null nimmt sie heraus. Sie
   *  bleibt Eigentum des Aufrufers (der Motor gibt sie nicht frei). */
  ich(figur: Figur3D | null): void
  /** Beim Begehen die eigene Stellung melden: hoechstens 10-mal je Sekunde,
   *  nur nach 2 cm, 1,5 Grad, neuer Haltung, beim Stehenbleiben oder alle
   *  2 s; einmal beim Start. */
  eigenePose(fn: ((p: Pose3D) => void) | null): void
  /** Spiegel echt spiegeln lassen (beim Begehen). Aus: matt glaenzend. */
  spiegel(an: boolean): void
  /* ------------------------------------------------------------ E83 */
  /** Aussenwelt mit Ebenen (Siedlung). Wie umgebung(): die Gruppe steht
   *  neben der Wohnung, zaehlt nicht fuer den Bildausschnitt, nebel und
   *  himmel gelten (vor denen aus umgebung()). Dazu: begehbare Ebenen mit
   *  eigenen Hindernissen, antippbare Dinge (vor allem anderen geprueft,
   *  beim Begehen und in der Rundumsicht) und schritt() in jedem Bild beim
   *  Begehen und solange es true gibt. Hat die Welt eine Methode fahrt()
   *  (Fahrt3D | null), faehrt man im Aufzug mit; gibt sie kabine (x0, z0,
   *  x1, z1) an, nur wer darin steht (E84). Hat sie eine Methode
   *  kamera(x, y, z) (E84), bekommt sie beim Begehen in jedem Bild die
   *  Stelle der Kamera, dazu einmal beim Start, nach jedem Sprung und die
   *  der Rundumsicht, wenn das Begehen endet. Kommt beim Begehen eine neue
   *  Welt (auch gleich nach welt(null), vor dem naechsten Bild), steht man
   *  auf der Ebene mit derselben Kennung. null nimmt die Welt weg. Sie
   *  gehoert dem Aufrufer, er ruft ihr dispose().
   *  E87: Ebenen duerfen Gelaende haben (hoehe), Hindernisse eine
   *  Oberkante (oben), die Welt Treppen (treppen). version() fragt der
   *  Motor beim Begehen in jedem Bild (und vor springen, ebeneWechseln und
   *  begehen(true)); zaehlt sie hoch, liest er ebenen, treppen, fahrzeuge
   *  und dinge neu, rastert nur Ebenen, deren Feld hindernisse ein anderes
   *  ist (oder die neu sind), und bleibt auf der Ebene mit derselben
   *  Kennung an derselben Stelle (auf einer Treppe, wenn es sie noch gibt).
   *  E87b: Gibt es diese Kennung in einer neuen Welt (noch) nicht (ein Haus
   *  der Stadt baut seine Geschosse erst), wartet der Motor bis
   *  EBENE_WARTEN_MS darauf: Stelle und Hoehe bleiben, man faellt nicht,
   *  nichts schiebt einen, gehen und springen ruhen (umschauen geht),
   *  ebeneJetzt meldet null. Kommt die Ebene mit einer neuen version(),
   *  steht man auf ihr (auch wieder auf der Treppe); sonst nach der Frist
   *  wie ohne Warten. Ein Sprung, ebeneWechseln oder begehen beenden das
   *  Warten.
   *  E87, wem Fahrzeuge und Dinge gehoeren: Fahrzeug3D.gruppe und
   *  WeltDing3D.objekt nimmt der Motor mit scene.attach() in seine Szene
   *  (die Lage in der Welt bleibt), sobald sie in fahrzeuge oder dinge
   *  stehen (bei welt() und bei jeder neuen version()); er setzt ab dann
   *  ihre Lage. Sichtbarkeit (E87b): ein Ding, das der Motor bewegt hat
   *  (hingestellt, abgelegt, Lage aus lage()) oder das man haelt, zeigt er
   *  immer; bei allen anderen entscheidet die Welt (objekt.visible, etwa je
   *  Geschoss), der Motor setzt es nicht, ausser ihr Elternteil in der Welt
   *  ist aus (dann ist es mit ihm aus, und nur dieses Ausblenden nimmt er
   *  wieder zurueck). Fahrzeuge weiter als 150 m sind nicht zu sehen.
   *  Stehen sie nicht mehr darin oder geht die
   *  Welt, nimmt er sie heraus (scene.remove, ohne dispose: Geometrie und
   *  Material gibt die Welt frei). Lagen aus lage() fuer Kennungen, die es
   *  noch nicht gibt, merkt er sich und setzt sie, sobald die Kennung
   *  auftaucht (auch nach Entladen und neuem Laden). E87b: hat die Welt
   *  dingErzeugen(), fragt er sie fuer jede gemerkte Lage einer Kennung,
   *  die weder in dinge noch in fahrzeuge steht, hoechstens einmal je Welt
   *  (wenige je Bild); was sie baut, steht danach in dinge und bekommt die
   *  Lage. Ist ein Ding in der
   *  Hand verschwunden, weil die Welt es entladen hat, ist es still nicht
   *  mehr in der Hand (kein Fehler, kein bewegt()); kommt es unter
   *  derselben Kennung wieder (neue Welt, etwa ein anderes Farbschema),
   *  bleibt es in der Hand; ebenso bleibt man in einem Fahrzeug sitzen.
   *  E87b: geht die Welt, waehrend man faehrt (welt(null) oder eine andere
   *  Welt), meldet bewegt() vorher die Lage des Fahrzeugs (noch in den
   *  Metern der alten Welt), wenn sie neu ist; kommt das Fahrzeug in der
   *  neuen Welt nicht wieder, steigt man aus, und es bleibt dort. */
  welt(w: Welt3D | null): void
  /** Meldet beim Begehen die Ebene, auf der man steht (beim Start, bei
   *  jedem Wechsel, nach jeder Aufzugfahrt); null ohne Ebenen, wenn das
   *  Begehen endet und solange der Motor nach einer neuen Welt auf die
   *  Ebene wartet (E87b, siehe welt()). Gleich beim Setzen einmal. */
  ebeneJetzt(fn: ((e: EbeneJetzt | null) => void) | null): void
  /** Beim Begehen auf Ebene index (aus welt().ebenen) wechseln: gleiche
   *  Stelle in x und z, die Hoehe gleitet in 0,8 s hinueber. Wer sitzt
   *  oder liegt, steht dafuer sofort auf. Ohne Begehen, waehrend man im
   *  Aufzug mitfaehrt oder fuer eine unbekannte Ebene: nichts. */
  ebeneWechseln(index: number): void
  /* ------------------------------------------------------------ E84 */
  /** Springen (Liste der Wohnungen, Sprungziel3D): an die Stelle x, z
   *  (Meter, Welt) auf Ebene ebene (Index in welt().ebenen), die Augen auf
   *  ihrem Boden plus Augenhoehe, Blick gier (0 = nach -z), geradeaus.
   *  Beim Begehen blendet das Bild in 0,35 s zur Hintergrundfarbe ab und
   *  wieder auf, in der Mitte steht man am Ziel; bei wenig Bewegung (System
   *  oder Stufe "ruhig") sofort. Dabei wird ein Ding in der Hand abgelegt,
   *  wer sitzt oder liegt, steht auf, eine Aufzugfahrt endet fuer einen,
   *  dann meldet ebeneJetzt die Ebene und kamera() der Welt die Stelle.
   *  Ohne Begehen beginnt es dort sofort (wie begehen(true), aber an dieser
   *  Stelle und auf dieser Ebene). Unbekannte Ebene oder kaputte Zahlen:
   *  nichts. */
  springen(ebene: number, x: number, z: number, gier: number): void
  /* ------------------------------------------------------------ E87 */
  /** Hochspringen (Leertaste oder Knopf): nur zu Fuss, stehend, nicht im
   *  Aufzug und nicht auf einer Treppe. Sonst nichts. Gut 0,7 m hoch, kein
   *  zweiter Sprung in der Luft; damit kommt man auf Mauern und Tische bis
   *  etwa 1 m. Auch nicht, solange eingabe(false) gilt, waehrend eines
   *  Sprungs an einen Ort (springen) oder eines Ebenenwechsels.
   *  Tasten beim Begehen (E87): Leertaste springt. Der Motor faengt sie
   *  vor allen anderen ab (keydown und keyup, Einfang-Phase am Fenster),
   *  verhindert das Rollen der Seite und das Ausloesen eines Knopfs, der
   *  gerade den Fokus hat (dafuer gibt es Enter), und reicht sie nicht
   *  weiter (der Zeichner darunter schaltet sonst auf die Hand). Nicht in
   *  Eingabefeldern, Auswahllisten und editierbarem Text, und nicht, wenn
   *  ein anderes Fenster (aria-modal, ohne diese Ansicht darin) offen ist.
   *  Gehaltene Leertaste springt nur einmal. W A S D und Pfeile gehen wie
   *  bisher, Umschalt rennt. Ebenso (E87, Paket Fahren) E, V, B und R:
   *  der Motor faengt sie beim Begehen vor allen anderen ab (Raum3D und der
   *  Zeichner darunter binden sie nicht), mit Strg, Alt oder Cmd nicht.
   *  Im Fahrzeug bremst die Leertaste (solange gedrueckt). */
  hupfen(): void
  /** In das naechste Fahrzeug einsteigen (hoechstens 3 m von der Mitte
   *  der Fahrertuer, Taste E oder Tippen aufs Fahrzeug), nur stehend, zu
   *  Fuss, auf der Ebene des Fahrzeugs, nicht auf einer Treppe, im Aufzug
   *  oder in der Luft, und nicht in eins, das ein anderer lenkt. Ein Ding
   *  in der Hand wird vorher abgelegt. Keins nah: nichts. */
  einsteigen(): void
  /** Aussteigen (Taste E): man steht neben der Fahrertuer, das Fahrzeug
   *  bleibt dort stehen (bewegt() meldet die Lage). Ist dort kein Platz,
   *  auf der anderen Seite, sonst hinter oder vor dem Wagen, sonst die
   *  naechste freie Stelle rundherum (bis gut 6 m), nie in einem Hindernis
   *  und nicht durch eine Wand. Nur wenn rundherum alles zu ist, bleibt man
   *  sitzen (Warnung in der Konsole). Nicht im Fahrzeug: nichts. E87b:
   *  true, wenn man danach zu Fuss ist (auch wenn man es schon war); false,
   *  wenn nirgends Platz war und man sitzen bleibt. */
  aussteigen(): boolean
  /** Sicht beim Fahren: vom Fahrersitz oder von hinten (Taste V). Gilt
   *  auch fuer das naechste Einsteigen. */
  fahrSicht(s: 'innen' | 'hinten'): void
  /** Blaulicht an oder aus (Taste B), nur wenn das Fahrzeug eins hat. Nach
   *  dem Aussteigen blinkt es weiter, bis man es wieder ausschaltet. */
  blaulicht(an: boolean): void
  /** Meldet das Fahrzeug, in dem man sitzt (beim Ein- und Aussteigen, bei
   *  Sicht und Blaulicht und hoechstens 5-mal je Sekunde waehrend der
   *  Fahrt), sonst null. Gleich beim Setzen einmal. */
  fahrzeug(fn: ((f: FahrzeugJetzt | null) => void) | null): void
  /** Meldet, was man gerade tun kann, nur bei Aenderung, und gleich beim
   *  Setzen einmal. hupfen: beim Begehen, stehend, zu Fuss, nicht auf einer
   *  Treppe und nicht mitfahrend im Aufzug (in der Luft bleibt es an, damit
   *  ein Knopf nicht bei jedem Sprung verschwindet). einsteigen: ein
   *  Fahrzeug ist nah genug (wie einsteigen()). aussteigen: man sitzt in
   *  einem. halten: ein Ding ist in der Hand. hinstellen: es passt dorthin,
   *  wohin man gerade zeigt. */
  moeglich(fn: ((m: Moeglich3D) => void) | null): void
  /** Ding in der Hand um 45 Grad drehen (Taste R vorwaerts, Umschalt+R
   *  zurueck, Mausrad). */
  drehen(richtung: 1 | -1): void
  /** Das Ding in der Hand dort hinstellen, wohin man zeigt (Maus oder
   *  Mitte des Bildes), wenn es dort passt; sonst nichts. Ein Klick oder
   *  Tipp auf eine passende Stelle tut dasselbe (dort, wo getippt wurde);
   *  ein Tipp ins Leere oder zu weit legt es wie bisher unter der Hand ab. */
  hinstellen(): void
  /** Lage eines Dings oder Fahrzeugs der Welt setzen (gespeichert oder von
   *  Mitspielern). Ist es (noch) nicht da, merkt der Motor sich die Lage
   *  und setzt sie, sobald es auftaucht (und fragt die Welt mit
   *  dingErzeugen, E87b). Haelt man es gerade, gilt die
   *  neue Lage, und es ist nicht mehr in der Hand; E87b: ist es dieselbe
   *  Lage wie die gemerkte oder die, auf der es vor dem Aufheben stand (auf
   *  1 cm, lageGleich), bleibt es in der Hand und nichts geschieht (Neubau
   *  der Welt spielt Lagen erneut ab). Ebenso aendert dieselbe Lage nichts
   *  an einem Fahrzeug, das gerade ein Mitspieler lenkt. Ein Fahrzeug, in
   *  dem man selbst sitzt, bleibt, wo es ist. Unbrauchbare Angaben (keine
   *  Kennung, kaputte Zahlen): Warnung in der Konsole, sonst nichts. */
  lage(l: DingLage3D): void
  /** Meldet, wenn man ein Ding der Welt hingestellt oder abgelegt oder ein
   *  Fahrzeug abgestellt (ausgestiegen) hat: zum Speichern und fuer die
   *  Mitspieler. Dinge der Wohnung (aus der Szene) melden sich nicht.
   *  E87b: auch das Fahrzeug, in dem man sitzt, wenn die Welt geht oder der
   *  Motor abgebaut wird (dispose), und das Ding in der Hand beim Abbau
   *  (abgelegt). Ein Fahrzeug an derselben Stelle wie zuletzt gemerkt
   *  (lageGleich) meldet sich nicht noch einmal. */
  bewegt(fn: ((l: DingLage3D) => void) | null): void
  /** Abbauen. E87b: zuerst steigt man aus einem Fahrzeug aus (es bleibt
   *  stehen) und legt ein Ding in der Hand ab; beides meldet bewegt(),
   *  solange der Abnehmer noch angeschlossen ist. */
  dispose(): void
}

export type GehRichtung = 'vor' | 'zurueck' | 'links' | 'rechts'

/** Was ein Klick in 3D getroffen hat (Moebel oder Kiste). */
export interface Treffer3D {
  objekt?: string
  kiste?: string
}

/** Ab so vielen Pixeln wird aus einem Druck auf ein Moebel ein Ziehen. */
const ZIEH_PX = 4

/** Wie durchsichtig eine Wand ist, deren Aussenseite zur Kamera zeigt. */
const WAND_HALB = 0.16

/* Begehen: seit E77 geht ein Mann mit 1,75 m durch die Wohnung, Augen auf
 * 1,64 m, Schultern 46 cm breit (KOERPER_RADIUS_M). Seit E82 rechnet der
 * Zusammenstoss in der Ebene (kollision.ts) statt mit Strahlen: Waende,
 * Bruestungen und Fenster halten immer auf, Moebel und Kisten, wenn sie in
 * Knie- bis Brusthoehe reichen (0,3 bis 1,2 m). Teppiche, Haengendes ueber
 * Kopf, Griffe, Schluessel, Dinge, Leuchten, Schalter, Spiegel und ein
 * laufender Wasserstrahl halten nicht auf. Zu oder abgeschlossene Tueren
 * halten auf, offene nicht. */
const AUGE_M = 1.64
const GEHEN_M_S = 1.4
const RENNEN_M_S = 2.8
/** Anfahren und Abbremsen: Zeitkonstante in Sekunden. */
const TRAEGHEIT_S = 0.12
/** Umschauen: leichte Glaettung, Zeitkonstante in Sekunden. */
const BLICK_S = 0.045
/** Laengstes Bild, mit dem gerechnet wird (Sekunden). */
const DT_MAX = 0.1
const MOEBEL_UNTEN_M = 0.3
const MOEBEL_OBEN_M = 1.2
/** Moebelteile, die hoechstens so hoch enden (Tisch, Bett, Sofa, Stuhl),
 *  haben ihre echte Oberkante: hinauf kommt man mit einem Sprung (E87).
 *  Hoehere (Schrank) halten wie eine Wand auf. */
const MOEBEL_STEIG_M = 1.0
const WAND_HINDERNIS = new Set(['wand', 'bruestung', 'scheibe', 'rahmen', 'zarge', 'tuerblatt'])
const MOEBEL_HINDERNIS = new Set(['moebel', 'regal', 'front', 'kiste'])
/** Teile, die zu einem Objekt gehoeren (Ziehen, Tippen auf ein Moebel). */
const OBJEKT_ROLLEN = new Set(['moebel', 'regal', 'brett', 'ding', 'spiegel', 'griff'])

/** Hinsetzen, Hinlegen, Aufstehen: so lange gleitet die Kamera (ms). */
const WECHSEL_MS = 600
/** Beim Aufstehen so weit vor den Platz treten (Meter). */
const AUFSTEH_M = 0.6
const SITZ_ZURUECK_M = 0.1
const SITZ_NEIGUNG = -0.12
const LIEGE_NEIGUNG = 1.0
const TUER_MS = 350
const SCHUB_MS = 300
/** Abgeschlossene Tuer: kurzes Ruetteln um 2 Grad. */
const RATTERN_MS = 420
const RATTERN_RAD = (2 * Math.PI) / 180
const SCHLOSS_MS = 220
/** Zu bis auf diesen Winkel: haelt beim Begehen auf. */
const TUER_ZU_RAD = 0.35
const HEBEN_MS = 350
const HALTE_VOR_M = 0.5
const HALTE_UNTER_M = 0.3
const SPIEGEL_WEIT_M = 6
/** Fernsehbild: hoechstens 8 neue Bilder je Sekunde. */
const TV_BILD_MS = 125
/** Laufen nur Geraete, zeichnet die Schleife hoechstens etwa 15-mal je Sekunde. */
const GERAETE_PAUSE_MS = 66
const TV_LICHT_CD = 1.4
const TV_LICHTER_MAX = 2
const POSE_MS = 100
const POSE_PULS_MS = 2000
const POSE_DREH_RAD = (1.5 * Math.PI) / 180
/** Ebene wechseln (E83): so lange gleitet die Hoehe hinueber (ms). */
const EBENE_MS = 800
/** Springen (E84): ab- und wieder aufblenden, zusammen (ms). */
const SPRUNG_MS = 350

/** Kleinster Unterschied zweier Winkel (-Pi bis Pi). */
function winkelDiff(a: number, b: number): number {
  let d = a - b
  while (d > Math.PI) d -= 2 * Math.PI
  while (d < -Math.PI) d += 2 * Math.PI
  return d
}

/** Weich an- und auslaufen, p von 0 bis 1. */
function glatt(p: number): number {
  return p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2
}

function anteil(zeit: number, start: number, dauer: number): number {
  return Math.max(0, Math.min(1, (zeit - start) / dauer))
}

/** Alles mit Innenseite (Wand, Sturz, Tuer, Fenster) wird im Weg halbdurchsichtig. */
interface WandInfo {
  mesh: Mesh
  linien: LineSegments | null
  innen: [number, number]
  x: number
  z: number
  basis: number
}

/** Was der Motor an jedem Mesh der Szene weiss (userData). */
interface TeilDaten {
  rolle: string
  objektId?: string
  kisteId?: string
  schalterRaum?: string
  tuer?: TuerTeil
  schub?: SchubGruppe
  platz?: NonNullable<Quader['platz']>
  ding?: string
  geraet?: NonNullable<Quader['geraet']>
  /** Durchsichtig (Glas, Wasser): beim Ablegen faellt ein Ding hindurch. */
  glas?: boolean
}

function daten(o: Object3D): TeilDaten {
  return o.userData as TeilDaten
}

/* Tueren (E65, E82): alle Teile mit derselben tuer.id drehen zusammen um
 * die Angel. Beschrieben sind sie in der Stellung zu; gemerkt wird je Teil
 * die Lage relativ zur Angel und die eigene Drehung. */
interface TuerTeil {
  mesh: Mesh
  gruppe: TuerGruppe
  ax: number
  az: number
  ox: number
  oz: number
  drehY: number
  kx: number
  kz: number
  schluessel: boolean
  /** Lange Achse des Schluessels (um sie dreht er beim Abschliessen). */
  achse: Vector3
  /** Rechteck in kollision.ts, -1 ohne. */
  hindernis: number
}

interface TuerGruppe {
  id: string
  zu: number
  auf: number
  /** Winkel von zu bis ganz offen (mit Vorzeichen). */
  spanne: number
  /** +1 oder -1: in diese Richtung geht die Tuer auf. */
  richtung: number
  /** Zimmertuer (Blatt), sonst Moebeltuer. */
  raum: boolean
  winkel: number
  teile: TuerTeil[]
  /** 0 ruht, 1 dreht, 2 ruettelt (abgeschlossen). */
  lauf: number
  von: number
  nach: number
  start: number
  /** Schluessel bei offener Tuer gedreht: erst zu, dann abschliessen. */
  danachAbschliessen: boolean
  verschlossen: boolean
  /** Wie weit der Schluessel gedreht ist, 0 bis 1. */
  schloss: number
  schlossVon: number
  schlossStart: number
  schlossLauf: boolean
}

interface SchubTeil {
  mesh: Mesh
  bx: number
  bz: number
  drehY: number
  hindernis: number
}

interface SchubGruppe {
  id: string
  weg: [number, number]
  anteil: number
  teile: SchubTeil[]
  lauf: boolean
  von: number
  nach: number
  start: number
}

/** Ding zum Aufheben: Teile in ihrer beschriebenen Lage und deren Mitte. */
interface DingTeil {
  mesh: Mesh
  px: number
  py: number
  pz: number
  drehY: number
  kx: number
  kz: number
}

/** Ein Ding zum Aufheben. In der Wohnung (E82): Teile in ihrer
 *  beschriebenen Lage und die Mitte ihres Kastens (cx, cy, cz); Drehung 0
 *  ist die Beschreibung. In der Welt (E87): ein Objekt (WeltDing3D) mit dem
 *  Ursprung unten in der Mitte; Drehung ist die Blickrichtung (gier). */
interface Ding {
  id: string
  teile: DingTeil[]
  cx: number
  cy: number
  cz: number
  /** Groesse (Meter) fuer das Hinstellen: breite entlang x und tiefe
   *  entlang z bei Drehung 0, hoehe. */
  breite: number
  tiefe: number
  hoehe: number
  /** E87: das Objekt eines Dings der Welt, sonst null (Ding der Wohnung). */
  objekt: Object3D | null
  /** Ding der Welt: Lage jetzt (Mitte unten, Drehung um die Hochachse). */
  lx: number
  ly: number
  lz: number
  lg: number
  /** Ding der Welt: Kennung der Ebene, auf der es steht. */
  ebeneId: string
  /** Ding der Welt: Elternteil in der Welt, als der Motor es nahm. Ist er
   *  aus (etwa eine Gruppe je Geschoss), ist ein unbewegtes Ding mit ihm
   *  aus (E87b, teileSichtbar). */
  herkunft: Object3D | null
  /** Ding der Welt: vom Motor bewegt (hingestellt, abgelegt, Lage aus
   *  lage()); dann zeigt er es immer. */
  verlegt: boolean
  /** Ding der Welt: der Motor hat es ausgeblendet, weil herkunft aus war
   *  (E87b); nur das nimmt er wieder zurueck. */
  versteckt: boolean
}

/** Ein neues, leeres Ding (Teile und Masse kommen danach). */
function dingNeu(id: string): Ding {
  return { id, teile: [], cx: 0, cy: 0, cz: 0, breite: 0.3, tiefe: 0.3, hoehe: 0.3, objekt: null, lx: 0, ly: 0, lz: 0, lg: 0, ebeneId: '', herkunft: null, verlegt: false, versteckt: false }
}

/** Ein Fahrzeug der Welt, wie der Motor es fuehrt (E87). */
interface FzEintrag {
  f: Fahrzeug3D
  werte: FahrWerte
  /** Lage jetzt (auch im Stand) als Zustand der Fahrphysik. */
  zust: FahrZustand
  /** Index der Ebene in welt().ebenen; -1: unbekannt (dann weder zu fahren
   *  noch ein Hindernis, es bleibt, wo die Welt es hingestellt hat). */
  ebene: number
  ebeneId: string
  /** Jemand anderes lenkt es (Pose3D.lenkt): Ziel, dem es weich folgt. */
  fern: { an: boolean; uid: string; x: number; y: number; z: number; gier: number }
  /** Blaulicht an (vom Motor geschaltet). */
  blau: boolean
  /** Lage, mit der sein Rechteck im Raster der Fahrzeuge zuletzt stand. */
  rx: number
  rz: number
  rg: number
}

/** Fahrzeuge weiter weg (Meter, waagrecht von der Kamera) sind nicht zu sehen. */
const FAHRZEUG_SICHT_M = 150
/** Beim Fahren meldet fahrzeug() hoechstens so oft (ms) ein neues Tempo. */
const FAHRZEUG_MELDEN_MS = 200
/** Raster der Fahrzeuge fuer fremd gelenkte hoechstens so oft neu (ms). */
const FAHRZEUG_RASTER_MS = 100
/** Sichtfeld beim Gehen und von hinten beim Fahren (Grad). */
const FOV_GEHEN = 70
/** Ein Ding der Welt laesst sich hoechstens so weit weg (Meter, von den
 *  Augen) aufheben. */
const AUFHEBEN_M = 6
/** E87b: Dinge, die die Welt fuer gemerkte Lagen einzeln baut
 *  (dingErzeugen), hoechstens so viele je Bild; gefragt wird je Bild
 *  hoechstens so oft (unbekannte Kennungen kosten fast nichts). */
const ERZEUGEN_JE_BILD = 3
const ERZEUGEN_FRAGEN_JE_BILD = 50
/** Umschauen beim Fahren kehrt in dieser Zeit (s) nach vorne zurueck,
 *  solange der Wagen faehrt und niemand zieht. */
const FAHR_BLICK_ZURUECK_S = 1.2
/** Aufprall: so lange (s) wackelt die Kamera. */
const WACKELN_S = 0.35

/** Wo ein Ding jetzt liegt: Mitte und Drehung gegenueber der Beschreibung. */
interface DingLage {
  x: number
  y: number
  z: number
  d: number
}

interface Spiegel {
  x: number
  y: number
  z: number
  nx: number
  nz: number
  breite: number
  hoehe: number
  refl: Reflector | null
}

interface TvLicht {
  licht: PointLight
  id: string
  x: number
  y: number
  z: number
  nx: number
  nz: number
  /** Richtung der Vorderseite bekannt; sonst entscheidet der erste Blick. */
  sicher: boolean
}

interface Person {
  uid: string
  figur: Figur3D
  ziel: Pose3D
  x: number
  y: number
  z: number
  gier: number
  tempo: number
  haltung: Haltung
  hat: boolean
  zuletzt: number
  /** E87: Kennung des Fahrzeugs, das diese Person lenkt, sonst null. */
  fahrzeug: string | null
  /** E87b: zuletzt gemeldete Lage dieses Fahrzeugs (Pose3D.lenkt). Gibt es
   *  das Fahrzeug hier erst spaeter (neue Welt), faehrt es ab da mit. */
  lenkt: { x: number; y: number; z: number; gier: number }
}

const ACHSE_X = new Vector3(1, 0, 0)
const ACHSE_Y = new Vector3(0, 1, 0)
const ACHSE_Z = new Vector3(0, 0, 1)
const RUNTER = new Vector3(0, -1, 0)

/** WebGL da? Ohne Kontext gibt es keine 3D-Ansicht, nur 2D. */
export function webglDa(): boolean {
  try {
    const c = document.createElement('canvas')
    const ctx = c.getContext('webgl2') ?? c.getContext('webgl')
    // Den Pruef-Kontext sofort freigeben, sonst sammeln sich beim
    // Umschalten 2D/3D Kontexte an, bis der Browser warnt.
    ctx?.getExtension('WEBGL_lose_context')?.loseContext()
    return !!ctx
  } catch {
    return false
  }
}

/** Startet three im Element. null, wenn WebGL fehlt oder der Renderer
 *  nicht entsteht. */
export function motorStarten(host: HTMLElement): Motor | null {
  if (!webglDa()) return null
  let renderer: WebGLRenderer
  try {
    renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  } catch {
    return null
  }
  /* Aufloesung: im Stand bis 2 Bildpunkte je Pixel, beim Drehen der Ansicht
   * bis 1,5. Beim Begehen einmal gewaehlt (bis 1,5) und fest; sinkt
   * hoechstens einmal auf 1, wenn das Geraet beim Gehen unter rund 30
   * Bildern je Sekunde bleibt, und bleibt dann dort. */
  const dpr = window.devicePixelRatio || 1
  const ratioStand = Math.min(dpr, 2)
  const ratioBewegt = Math.min(ratioStand, 1.5)
  let ratioGehen = Math.min(dpr, 1.5)
  let ratioJetzt = ratioStand
  function ratioSetzen(r: number) {
    if (r === ratioJetzt) return
    ratioJetzt = r
    renderer.setPixelRatio(r)
  }
  let messZeit = 0
  let messBilder = 0
  function tempoMessen(dt: number) {
    if (ratioGehen <= 1) return
    messZeit += dt
    messBilder++
    if (messBilder < 45) return
    if (messZeit / messBilder > 1 / 30) {
      ratioGehen = 1
      ratioSetzen(1)
    }
    messZeit = 0
    messBilder = 0
  }
  renderer.setPixelRatio(ratioStand)
  renderer.domElement.style.display = 'block'
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'
  renderer.domElement.style.touchAction = 'none'
  host.appendChild(renderer.domElement)

  const scene = new Scene()
  const camera = new PerspectiveCamera(40, 1, 0.05, 400)
  camera.position.set(-6, 8, 10)
  // Die Kamera sieht nur Ebene 0; die eigene Figur liegt auf Ebene 1 und
  // zeigt sich nur im Spiegel.
  camera.layers.set(0)

  // Licht von oben: der Boden hell, senkrechte Waende dunkler, damit Wand
  // und Boden deutlich auseinandergehen. three rechnet Licht physikalisch
  // (Lambert teilt durch Pi), darum die Staerken mal Pi: Umgebung plus
  // Sonne ergeben auf dem Boden etwa die Farbe des Tokens. Weniger
  // Umgebungslicht und mehr Sonne von schraeg (E64): jede Wandseite hat
  // ihren eigenen Ton, nichts wirkt grell. Sonne leicht warm, Umgebung
  // leicht kuehl, wie Tageslicht im Raum.
  const umgebungLicht = new AmbientLight(0xf1f3f7, 0.5 * Math.PI)
  scene.add(umgebungLicht)
  const sonne = new DirectionalLight(0xfff4e6, 0.52 * Math.PI)
  sonne.position.set(-4, 8, 6)
  scene.add(sonne)
  const gegen = new DirectionalLight(0xffffff, 0.16 * Math.PI)
  gegen.position.set(4, 3, -6)
  scene.add(gegen)

  /** Die Szene aus setzen(); wird bei jedem Neubau geleert. */
  const gruppe = new Group()
  scene.add(gruppe)
  /** Spiegelflaechen (eigene Gruppe, damit Strahlen sie nicht treffen). */
  const spiegelGruppe = new Group()
  scene.add(spiegelGruppe)
  /** Die anderen Leute; ueberlebt jeden Neubau. */
  const leuteGruppe = new Group()
  scene.add(leuteGruppe)
  /** Die eigene Figur, nur beim Begehen. */
  const ichGruppe = new Group()
  ichGruppe.visible = false
  scene.add(ichGruppe)

  const einheit = new BoxGeometry(1, 1, 1)
  const kanten = new EdgesGeometry(einheit)

  /* Runde Formen (E81). Gerundete Quader haben ihre echte Groesse (die
   * Rundung soll nicht mitgestreckt werden), Zylinder und Kugeln sind
   * Einheitskoerper und werden gestreckt wie der Wuerfel. Gleiche Formen
   * teilen sich eine Geometrie; beim Neubau der Szene wird alles frei. */
  const formen = new Map<string, BufferGeometry>()
  function geteilt(key: string, bau: () => BufferGeometry): BufferGeometry {
    let g = formen.get(key)
    if (!g) {
      g = bau()
      formen.set(key, g)
    }
    return g
  }
  /** Feine Fase an Moebeln und Kisten, damit keine Kante messerscharf ist
   *  und das Licht an den Kanten weich abbricht. Meter. */
  const FASE_ROLLEN = new Set(['moebel', 'front', 'regal', 'brett', 'kiste'])
  function form(k: Quader): { geo: BufferGeometry; echt: boolean } {
    const f = k.form
    if (f?.art === 'kugel') return { geo: geteilt('kugel', () => new SphereGeometry(0.5, 32, 20)), echt: false }
    if (f?.art === 'zylinder') {
      const oben = Math.round(f.oben * 100) / 100
      return {
        geo: geteilt(`zyl:${oben}:${f.achse}`, () => {
          const g = new CylinderGeometry(0.5 * oben, 0.5, 1, 40)
          if (f.achse === 'x') g.rotateZ(-Math.PI / 2)
          else if (f.achse === 'z') g.rotateX(Math.PI / 2)
          return g
        }),
        echt: false,
      }
    }
    const [w, h, d] = k.masse
    const klein = Math.min(w, h, d)
    const r = Math.min(k.rund ?? (FASE_ROLLEN.has(k.rolle) ? Math.min(0.008, klein * 0.25) : 0), klein / 2)
    if (r < 0.002) return { geo: einheit, echt: false }
    const mm = (v: number) => Math.round(v * 1000)
    return {
      geo: geteilt(`rund:${mm(w)}:${mm(h)}:${mm(d)}:${mm(r)}`, () => new RoundedBoxGeometry(w, h, d, r >= 0.02 ? 4 : r >= 0.008 ? 2 : 1, r)),
      echt: true,
    }
  }

  /* ---------------------------------------------- Zustand und Schleife */

  let weg = false
  /** Geplantes Bild der Schleife (0 = keins). */
  let lauf = 0
  let letzteZeit = 0
  /** Laufen nur Geraete: Uhr fuer das naechste, gedrosselte Bild. */
  let geraeteUhr = 0
  /** Begehen: Kamera in Augenhoehe, OrbitControls ruhen (siehe gehenAn). */
  let gehen = false
  let eingabeAn = true
  let halb = true
  let koerperJetzt: Koerper[] = []
  let bewegt = false

  /** Ein Bild anfordern; die Schleife laeuft weiter, solange sich etwas tut. */
  function anstossen() {
    if (weg || lauf) return
    lauf = requestAnimationFrame(bild)
  }

  /* Moebel ziehen. Die Zuhoerer sitzen am host in der Einfang-Phase, also
   * vor OrbitControls am Canvas: trifft der Druck ein Moebel, bekommt die
   * Kamera ihn nicht. */
  let ziehFn: ((id: string, dxCm: number, dyCm: number) => void) | null = null
  // Moebel greifen nur im Modus Hand; beim Drehen dreht ein Druck immer die Ansicht.
  let handAn = false
  let traeger = new Map<string, string>()
  const strahl = new Raycaster()
  const bodenEbene = new Plane(new Vector3(0, 1, 0), 0)
  let zug: {
    id: string
    px: number
    py: number
    start: Vector3
    meshes: Object3D[]
    basis: Vector3[]
    bewegt: boolean
    dx: number
    dz: number
    pointerId: number
  } | null = null

  function zeigerNdc(e: { clientX: number; clientY: number }): Vector2 {
    const r = renderer.domElement.getBoundingClientRect()
    return new Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
  }

  /** Das Objekt (Moebel, Regal, Schrank) unter dem Zeiger, sonst null. */
  function objektUnter(e: { clientX: number; clientY: number }): string | null {
    strahl.setFromCamera(zeigerNdc(e), camera)
    for (const t of strahl.intersectObjects(gruppe.children, false)) {
      if (!t.object.visible) continue
      const id = daten(t.object).objektId
      if (id) return id
      // Was davor steht und nicht halbdurchsichtig ist, verdeckt.
      const mat = (t.object as Mesh).material as MeshLambertMaterial | undefined
      if (mat && mat.opacity >= 0.5) return null
    }
    return null
  }

  function bodenPunkt(e: { clientX: number; clientY: number }): Vector3 | null {
    strahl.setFromCamera(zeigerNdc(e), camera)
    const p = new Vector3()
    return strahl.ray.intersectPlane(bodenEbene, p) ? p : null
  }

  const ziehRunter = (e: PointerEvent) => {
    if (!ziehFn || !handAn || gehen || e.button !== 0 || e.pointerType === 'touch') return
    const id = objektUnter(e)
    if (!id) return
    const start = bodenPunkt(e)
    if (!start) return
    const meshes = gruppe.children.filter((o) => {
      const u = daten(o)
      return u.objektId === id || (!!u.kisteId && traeger.get(u.kisteId) === id)
    })
    e.stopPropagation()
    e.preventDefault()
    host.setPointerCapture(e.pointerId)
    zug = {
      id,
      px: e.clientX,
      py: e.clientY,
      start,
      meshes,
      basis: meshes.map((m) => m.position.clone()),
      bewegt: false,
      dx: 0,
      dz: 0,
      pointerId: e.pointerId,
    }
  }
  const ziehBewegen = (e: PointerEvent) => {
    const z = zug
    if (!z) {
      // Ohne Druck zeigen, dass sich ein Moebel greifen laesst.
      if (ziehFn && handAn && !gehen && e.pointerType === 'mouse' && e.buttons === 0) {
        renderer.domElement.style.cursor = objektUnter(e) ? 'grab' : ''
      }
      return
    }
    e.stopPropagation()
    if (!z.bewegt && Math.hypot(e.clientX - z.px, e.clientY - z.py) < ZIEH_PX) return
    if (!z.bewegt) {
      z.bewegt = true
      bewegungAn(true)
      renderer.domElement.style.cursor = 'grabbing'
    }
    const p = bodenPunkt(e)
    if (!p) return
    // Auf ganze cm, damit Vorschau und Ergebnis gleich aussehen.
    z.dx = Math.round((p.x - z.start.x) * 100) / 100
    z.dz = Math.round((p.z - z.start.z) * 100) / 100
    z.meshes.forEach((m, i) => m.position.set(z.basis[i].x + z.dx, z.basis[i].y, z.basis[i].z + z.dz))
    anstossen()
  }
  const ziehHoch = (e: PointerEvent) => {
    const z = zug
    if (!z || e.pointerId !== z.pointerId) return
    e.stopPropagation()
    zug = null
    if (host.hasPointerCapture(e.pointerId)) host.releasePointerCapture(e.pointerId)
    renderer.domElement.style.cursor = ''
    if (!z.bewegt) return
    bewegungAn(false)
    const dx = Math.round(z.dx * 100)
    const dy = Math.round(z.dz * 100)
    if ((dx !== 0 || dy !== 0) && ziehFn) {
      ziehFn(z.id, dx, dy)
    } else {
      z.meshes.forEach((m, i) => m.position.copy(z.basis[i]))
      anstossen()
    }
  }
  host.addEventListener('pointerdown', ziehRunter, { capture: true })
  host.addEventListener('pointermove', ziehBewegen, { capture: true })
  host.addEventListener('pointerup', ziehHoch, { capture: true })
  host.addEventListener('pointercancel', ziehHoch, { capture: true })

  const controls = new OrbitControls(camera, renderer.domElement)
  // Kurzer, ruhiger Nachlauf nach dem Loslassen: weich, aber die Wohnung
  // rollt nicht lange weiter.
  controls.enableDamping = true
  controls.dampingFactor = 0.28
  controls.rotateSpeed = 0.7
  controls.zoomToCursor = true
  controls.maxPolarAngle = Math.PI * 0.49
  controls.minDistance = 0.4
  controls.maxDistance = 80
  // Verschieben bleibt auf Bodenhoehe: so dreht sich die Wohnung immer um
  // einen Punkt auf dem Boden und schwebt nicht weg.
  controls.screenSpacePanning = false

  let waende: WandInfo[] = []
  /** Woran man in der Wohnung stoesst (E82: Rechtecke in der Ebene). */
  const kollision = new Hindernisse(1)
  /** Begehbare Ebenen der Welt (E83), je eine mit eigenem Raster; auf der
   *  Ebene der Wohnung gilt kollision samt den Rechtecken dieser Ebene.
   *  Beim Gehen zaehlt immer ebenen.aktiv. */
  const ebenen = new Ebenen(kollision, 1)
  /** Decke der Wohnung (E87): Oberkante ihrer hoechsten Wand und der
   *  Grundriss der Waende (x0, z0, x1, z1). Darin stoesst beim Begehen auf
   *  ihrer Ebene der Kopf an. Ohne Waende unendlich. */
  const decke = { y: Infinity, x0: 0, z0: 0, x1: 0, z1: 0 }
  /** Tueren (E65, E82) und wie weit sie offen sind (0 zu, 1 ganz offen) je
   *  id, damit ein Neubau es behaelt, auch wenn sich Angel oder Richtung
   *  aendern. */
  let tuerGruppen: TuerGruppe[] = []
  const tuerStand = new Map<string, number>()
  /** Abgeschlossene Tueren (E82), nur fuer diese Sitzung. */
  const schlossZu = new Set<string>()
  /** Schubladen (E68) und wie weit sie offen sind (0 bis 1). */
  let schubGruppen: SchubGruppe[] = []
  const schubStand = new Map<string, number>()
  /** Dinge zum Aufheben (E82) und wohin sie gelegt wurden. */
  let dinge = new Map<string, Ding>()
  const dingLage = new Map<string, DingLage>()
  /** Geraete (E82): Teile und welche an sind. */
  let geraetTeile: Mesh[] = []
  const geraetAn = new Map<string, boolean>()
  let tvLichter: TvLicht[] = []
  let tvLaeuft = false
  let wasserLaeuft = false
  /** Spiegel (E82). */
  let spiegelListe: Spiegel[] = []
  let spiegelAn = false

  /** Beim Drehen der Ansicht mit weniger Bildpunkten rechnen. Beim Begehen
   *  nie: dort bleibt die Aufloesung fest (siehe gehenAn). */
  function bewegungAn(an: boolean) {
    if (bewegt === an) return
    bewegt = an
    if (!gehen) ratioSetzen(an ? ratioBewegt : ratioStand)
    anstossen()
  }

  function waendePruefen() {
    const cx = camera.position.x
    const cz = camera.position.z
    for (let i = 0; i < waende.length; i++) {
      const w = waende[i]
      // Zeigt die Aussenseite zur Kamera, steht die Wand im Weg.
      // Beim Begehen steht man im Raum: dann bleibt jede Wand ganz sichtbar.
      const vorne = halb && !gehen && (cx - w.x) * w.innen[0] + (cz - w.z) * w.innen[1] < -0.05
      const mat = w.mesh.material as MeshLambertMaterial
      mat.opacity = vorne ? Math.min(w.basis, WAND_HALB) : w.basis
      mat.depthWrite = !vorne && w.basis >= 1
      if (w.linien) (w.linien.material as LineBasicMaterial).opacity = mat.opacity
    }
  }

  /** Groesse des Bildes in CSS-Pixeln (fuer das Zeigen beim Hinstellen). */
  const leinwand = { b: 1, h: 1 }
  function groesse() {
    const w = Math.max(1, host.clientWidth)
    const h = Math.max(1, host.clientHeight)
    leinwand.b = w
    leinwand.h = h
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    for (const s of spiegelListe) {
      if (!s.refl) continue
      const [tw, th] = spiegelPixel(s)
      s.refl.getRenderTarget().setSize(tw, th)
    }
    anstossen()
  }

  // Daempfung: solange die Kamera noch auslaeuft, meldet update() in der
  // Schleife 'change', und das fordert das naechste Bild an.
  controls.addEventListener('change', anstossen)
  const anfang = () => {
    window.clearTimeout(ruheUhr)
    bewegungAn(true)
  }
  let ruheUhr = 0
  const ende = () => {
    // Nach dem Auslaufen wieder scharf.
    window.clearTimeout(ruheUhr)
    ruheUhr = window.setTimeout(() => bewegungAn(false), 400)
  }
  controls.addEventListener('start', anfang)
  controls.addEventListener('end', ende)
  // Das Mausrad gehoert hier der Kamera, nicht der Seite oder dem Zeichner
  // darunter. Mit einem Ding in der Hand dreht es das Ding (E87).
  const radStopp = (e: WheelEvent) => {
    e.stopPropagation()
    radDrehung(e)
  }
  host.addEventListener('wheel', radStopp, { passive: false })

  /* Gleiche Farbe und Deckkraft: ein Material fuer alle. Waende bekommen je
   * ein eigenes, weil ihre Deckkraft einzeln wechselt. */
  const flaechenMat = new Map<string, MeshLambertMaterial | MeshPhongMaterial>()
  /** Leuchten (Decke, LED, Lampenschirm): selbstleuchtend, je Raum ein
   *  Material, damit der Schalter nur seinen Raum hell macht (E74). */
  const leuchteMats = new Map<string, MeshBasicMaterial>()
  function leuchteMat(raum: string): MeshBasicMaterial {
    let mat = leuchteMats.get(raum)
    if (!mat) {
      mat = new MeshBasicMaterial({ color: new Color(leuchteFarbe(raum)) })
      leuchteMats.set(raum, mat)
    }
    return mat
  }
  /** An: warm-hell. Aus: am Tag hellgrau wie ein Schirm, am Abend dunkel. */
  function leuchteFarbe(raum: string): string {
    return raeumeAn.has(raum) ? '#fff4dc' : modus === 'abend' ? '#6f6b64' : '#e9e4da'
  }

  /* ------------------------------------------------ Licht (E71) */
  let punktLichter: PointLight[] = []
  let modus: 'tag' | 'abend' = 'tag'
  let raeumeAn = new Set<string>()
  let schalterFn: ((raumId: string) => void) | null = null
  function lichterSetzen(liste: Licht3D[]) {
    for (const l of punktLichter) {
      scene.remove(l)
      l.dispose()
    }
    // Hoechstens 20 Lichter, damit schwache Rechner fluessig bleiben.
    punktLichter = liste.slice(0, 20).map((l) => {
      const p = new PointLight(new Color(l.farbe), 0, l.art === 'kueche' ? 2.2 : 7, 2)
      p.position.set(l.pos[0], l.pos[1], l.pos[2])
      p.userData = { staerke: l.staerke, art: l.art, raum: l.raumId }
      scene.add(p)
      return p
    })
    modusSetzen(modus)
  }
  function modusSetzen(m: 'tag' | 'abend') {
    modus = m
    const abend = m === 'abend'
    umgebungLicht.intensity = (abend ? 0.16 : 0.5) * Math.PI
    umgebungLicht.color.set(abend ? 0x9aa6c4 : 0xf1f3f7)
    sonne.intensity = (abend ? 0.04 : 0.52) * Math.PI
    gegen.intensity = (abend ? 0.03 : 0.16) * Math.PI
    for (const l of punktLichter) {
      const d = l.userData as { staerke: number; art: string; raum: string }
      // Candela (three rechnet physikalisch): Decke etwa 12, Kueche naeher dran.
      // Am Tag gibt eingeschaltetes Licht nur etwas dazu.
      const basis = d.art === 'kueche' ? 2.6 : d.art === 'lampe' ? 7 : 13
      l.intensity = raeumeAn.has(d.raum) ? basis * d.staerke * (abend ? 1 : 0.45) : 0
    }
    for (const [raum, mat] of leuchteMats) mat.color.set(leuchteFarbe(raum))
    anstossen()
  }
  function lichtRaeume(an: Set<string>) {
    raeumeAn = new Set(an)
    modusSetzen(modus)
  }
  const linienMat = new Map<string, LineBasicMaterial>()
  function flaecheMaterial(farbe: string, deckkraft: number, durch: boolean, glanz = 0): MeshLambertMaterial | MeshPhongMaterial {
    const key = `${farbe}|${deckkraft}|${durch}|${glanz}`
    let m = flaechenMat.get(key)
    if (!m) {
      // Glaenzendes (Leder, Metall, Keramik, Glas) mit Lichtpunkt, sonst matt.
      // Phong rechnet das Licht wie Lambert, nur mit Glanz dazu.
      m =
        glanz > 0
          ? new MeshPhongMaterial({
              color: new Color(farbe),
              transparent: durch,
              opacity: deckkraft,
              depthWrite: deckkraft >= 1,
              shininess: 6 + glanz * 90,
              specular: new Color(glanz * 0.32, glanz * 0.32, glanz * 0.32),
            })
          : new MeshLambertMaterial({ color: new Color(farbe), transparent: durch, opacity: deckkraft, depthWrite: deckkraft >= 1 })
      flaechenMat.set(key, m)
    }
    return m
  }
  function linieMaterial(farbe: string, deckkraft: number, durch: boolean): LineBasicMaterial {
    const key = `${farbe}|${deckkraft}|${durch}`
    let m = linienMat.get(key)
    if (!m) {
      m = new LineBasicMaterial({ color: new Color(farbe), transparent: durch, opacity: deckkraft })
      linienMat.set(key, m)
    }
    return m
  }

  /* ------------------------------------------- Geraete (E82): Bild, Wasser */

  /** Ruhiges Fernsehbild: Abendhimmel, Sonne, ziehende Wolken, Huegel.
   *  Eine Leinwand fuer alle Fernseher, erst beim ersten gebraucht. */
  let tvLeinwand: HTMLCanvasElement | null = null
  let tvHimmel: HTMLCanvasElement | null = null
  let tvTextur: CanvasTexture | null = null
  let tvZeit = -Infinity
  function tvTexturHolen(): CanvasTexture {
    if (tvTextur) return tvTextur
    const w = 192
    const h = 108
    tvLeinwand = document.createElement('canvas')
    tvLeinwand.width = w
    tvLeinwand.height = h
    tvHimmel = document.createElement('canvas')
    tvHimmel.width = w
    tvHimmel.height = h
    const hc = tvHimmel.getContext('2d')
    if (hc) {
      const verlauf = hc.createLinearGradient(0, 0, 0, h)
      verlauf.addColorStop(0, '#2f3d6e')
      verlauf.addColorStop(0.45, '#9a5d7a')
      verlauf.addColorStop(0.72, '#e79a6c')
      verlauf.addColorStop(1, '#f6c98e')
      hc.fillStyle = verlauf
      hc.fillRect(0, 0, w, h)
    }
    tvTextur = new CanvasTexture(tvLeinwand)
    tvTextur.colorSpace = SRGBColorSpace
    tvTextur.generateMipmaps = false
    tvTextur.minFilter = LinearFilter
    tvMalen(0)
    return tvTextur
  }
  function huegel(ctx: CanvasRenderingContext2D, w: number, h: number, basis: number, hoch: number, frequenz: number, phase: number, farbe: string) {
    ctx.fillStyle = farbe
    ctx.beginPath()
    ctx.moveTo(0, h)
    for (let x = 0; x <= w; x += 8) {
      ctx.lineTo(x, basis - hoch * Math.sin(x * frequenz + phase) - hoch * 0.45 * Math.sin(x * frequenz * 2.3 + phase * 1.7))
    }
    ctx.lineTo(w, h)
    ctx.closePath()
    ctx.fill()
  }
  /** Ein Bild des Fernsehers zur Zeit t (Sekunden). */
  function tvMalen(t: number) {
    const ctx = tvLeinwand?.getContext('2d')
    if (!ctx || !tvLeinwand || !tvHimmel) return
    const w = tvLeinwand.width
    const h = tvLeinwand.height
    ctx.globalAlpha = 1
    ctx.drawImage(tvHimmel, 0, 0)
    // Sonne, die langsam auf und ab geht, mit weichem Schein.
    const sx = w * 0.63
    const sy = h * (0.5 + 0.06 * Math.sin(t * 0.16))
    ctx.globalAlpha = 0.28
    ctx.fillStyle = '#ffd7a0'
    ctx.beginPath()
    ctx.arc(sx, sy, h * 0.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.fillStyle = '#fff0c8'
    ctx.beginPath()
    ctx.arc(sx, sy, h * 0.1, 0, Math.PI * 2)
    ctx.fill()
    // Wolken ziehen langsam vorbei.
    ctx.globalAlpha = 0.5
    ctx.fillStyle = '#ffe9e0'
    for (let i = 0; i < 3; i++) {
      const x = ((t * (2.5 + i) + i * 77) % (w + 80)) - 40
      ctx.beginPath()
      ctx.ellipse(x, h * (0.15 + i * 0.09), 24 - i * 4, 4.5 - i, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    huegel(ctx, w, h, h * 0.7, 6, 0.045, t * 0.05, '#7a5a7e')
    huegel(ctx, w, h, h * 0.82, 5, 0.07, 1.3 - t * 0.08, '#463a58')
  }
  /** Material des leuchtenden Bildschirms, je Neubau eins. */
  let tvMat: MeshBasicMaterial | null = null
  function tvMaterial(): MeshBasicMaterial {
    if (!tvMat) tvMat = new MeshBasicMaterial({ map: tvTexturHolen() })
    return tvMat
  }

  /** Wasserstrahl: Streifen, die langsam nach unten laufen. */
  let wasserTextur: DataTexture | null = null
  const wasserMats = new Map<string, MeshPhongMaterial>()
  function wasserMaterial(farbe: string): MeshPhongMaterial {
    let m = wasserMats.get(farbe)
    if (m) return m
    if (!wasserTextur) {
      const b = 4
      const h = 64
      const feld = new Uint8Array(b * h * 4)
      for (let y = 0; y < h; y++) {
        const v = Math.round(200 + 55 * (0.5 + 0.5 * Math.sin((y / h) * Math.PI * 2 * 3)))
        for (let x = 0; x < b; x++) {
          const i = (y * b + x) * 4
          feld[i] = v
          feld[i + 1] = v
          feld[i + 2] = v
          feld[i + 3] = 255
        }
      }
      wasserTextur = new DataTexture(feld, b, h, RGBAFormat)
      wasserTextur.wrapS = RepeatWrapping
      wasserTextur.wrapT = RepeatWrapping
      wasserTextur.repeat.set(1, 3)
      wasserTextur.magFilter = LinearFilter
      wasserTextur.minFilter = LinearFilter
      wasserTextur.colorSpace = SRGBColorSpace
      wasserTextur.needsUpdate = true
    }
    m = new MeshPhongMaterial({
      color: new Color(farbe),
      map: wasserTextur,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      shininess: 110,
      specular: new Color(0.55, 0.55, 0.55),
    })
    wasserMats.set(farbe, m)
    return m
  }

  function geraetIstAn(id: string): boolean {
    return geraetAn.get(id) ?? false
  }

  /** Sichtbarkeit der Teile, Licht der Fernseher, laeuft etwas? */
  function geraeteAktualisieren() {
    tvLaeuft = false
    wasserLaeuft = false
    for (const m of geraetTeile) {
      const g = daten(m).geraet
      if (!g) continue
      const an = geraetIstAn(g.id)
      m.visible = g.teil === 'koerper' || (g.teil === 'an') === an
      if (g.teil === 'an' && an) {
        if (g.art === 'tv') tvLaeuft = true
        else wasserLaeuft = true
      }
    }
    for (const l of tvLichter) {
      const an = geraetIstAn(l.id)
      if (an && !l.sicher) {
        // Vorderseite unbekannt: zu der Seite, von der man schaut.
        const s = (camera.position.x - l.x) * l.nx + (camera.position.z - l.z) * l.nz < 0 ? -1 : 1
        l.nx *= s
        l.nz *= s
        l.sicher = true
      }
      l.licht.position.set(l.x + l.nx * 0.4, l.y, l.z + l.nz * 0.4)
      l.licht.intensity = an ? TV_LICHT_CD : 0
    }
    if (tvLaeuft) tvZeit = -Infinity
  }

  function geraetUmschalten(id: string) {
    geraetAn.set(id, !geraetIstAn(id))
    geraeteAktualisieren()
    anstossen()
  }

  /** Bild des Fernsehers und Fluss des Wassers. true, solange etwas laeuft. */
  function geraeteSchritt(zeit: number): boolean {
    if (!tvLaeuft && !wasserLaeuft) return false
    if (tvLaeuft && tvTextur && zeit - tvZeit >= TV_BILD_MS) {
      tvZeit = zeit
      tvMalen(zeit / 1000)
      tvTextur.needsUpdate = true
    }
    if (wasserLaeuft && wasserTextur) wasserTextur.offset.y = ((zeit / 1000) * 0.9) % 1
    return true
  }

  /* ----------------------------------------------------- Spiegel (E82) */

  /** Groesse des Spiegelbilds: aus Flaeche und Pixeldichte, die lange Seite
   *  hoechstens 512, im Seitenverhaeltnis des Bildschirms (das Spiegelbild
   *  wird ueber den ganzen Blick gelegt). */
  function spiegelPixel(s: Spiegel): [number, number] {
    const lang = Math.round(Math.min(512, Math.max(128, Math.max(s.breite, s.hoehe) * 360 * Math.min(dpr, 2))))
    const a = camera.aspect
    return a >= 1 ? [lang, Math.max(64, Math.round(lang / a))] : [Math.max(64, Math.round(lang * a)), lang]
  }

  /** Spiegelflaeche aus einem Quader: vor seiner Vorderseite (normale). */
  function spiegelAus(k: Quader, normale: [number, number]): Spiegel {
    const l = Math.hypot(normale[0], normale[1]) || 1
    const nx = normale[0] / l
    const nz = normale[1] / l
    const c = Math.cos(k.drehY)
    const s = Math.sin(k.drehY)
    // Achsen des Quaders: Laenge (c, -s), Tiefe (s, c). Quer zur Normalen (tx, tz).
    const tx = -nz
    const tz = nx
    const breite = Math.abs(tx * c - tz * s) * k.masse[0] + Math.abs(tx * s + tz * c) * k.masse[2]
    const dicke = Math.abs(nx * c - nz * s) * k.masse[0] + Math.abs(nx * s + nz * c) * k.masse[2]
    const vor = dicke / 2 + 0.001
    return {
      x: k.mitte[0] + nx * vor,
      y: k.mitte[1],
      z: k.mitte[2] + nz * vor,
      nx,
      nz,
      breite: Math.max(0.01, breite),
      hoehe: Math.max(0.01, k.masse[1]),
      refl: null,
    }
  }

  function spiegelBauen(s: Spiegel): Reflector {
    const [w, h] = spiegelPixel(s)
    const r = new Reflector(new PlaneGeometry(s.breite, s.hoehe), {
      textureWidth: w,
      textureHeight: h,
      color: 0x858a8e,
      clipBias: 0.003,
      multisample: 2,
    })
    r.position.set(s.x, s.y, s.z)
    // Die Ebene schaut nach +z; gedreht schaut sie entlang der Normalen.
    r.rotation.y = Math.atan2(s.nx, s.nz)
    // Die Kamera des Spiegels sieht auch Ebene 1: die eigene Figur.
    r.getReflectionCamera(camera).layers.enable(1)
    r.visible = false
    spiegelGruppe.add(r)
    s.refl = r
    return r
  }

  /** Nur die zwei naechsten Spiegel bis 6 m, deren Vorderseite zur Kamera
   *  zeigt, spiegeln echt; die anderen zeigen ihr Glas. */
  function spiegelPruefen() {
    let a = -1
    let b = -1
    let da = Infinity
    let db = Infinity
    if (spiegelAn) {
      const p = camera.position
      for (let i = 0; i < spiegelListe.length; i++) {
        const s = spiegelListe[i]
        const dx = p.x - s.x
        const dz = p.z - s.z
        const d = Math.hypot(dx, p.y - s.y, dz)
        if (d > SPIEGEL_WEIT_M || dx * s.nx + dz * s.nz <= 0.02) continue
        if (d < da) {
          b = a
          db = da
          a = i
          da = d
        } else if (d < db) {
          b = i
          db = d
        }
      }
    }
    for (let i = 0; i < spiegelListe.length; i++) {
      const s = spiegelListe[i]
      const an = i === a || i === b
      if (an && !s.refl) spiegelBauen(s)
      if (s.refl) s.refl.visible = an
    }
  }

  /* --------------------------------------------------- Szene bauen */

  /** Sitz- und Liegeplaetze je Moebel (E82): ein Tipp irgendwo auf das
   *  Moebel nimmt den naechsten, nicht nur ein Tipp genau auf das Polster. */
  let plaetze = new Map<string, NonNullable<Quader['platz']>[]>()
  function naechsterPlatz(objektId: string, x: number, z: number): NonNullable<Quader['platz']> | null {
    let best: NonNullable<Quader['platz']> | null = null
    let bester = 1.5
    for (const pl of plaetze.get(objektId) ?? []) {
      const d = Math.hypot(pl.punkt[0] - x, pl.punkt[2] - z)
      if (d < bester) {
        bester = d
        best = pl
      }
    }
    return best
  }

  function leeren() {
    // Laufende Tueren und Schubladen gelten als angekommen, damit der
    // Neubau sie dort zeigt, wo sie hinwollten.
    for (const g of tuerGruppen) {
      if (g.lauf === 1) tuerStand.set(g.id, offenAnteil(g, g.nach))
      if (g.lauf === 2) tuerStand.set(g.id, 0)
      if (g.danachAbschliessen) {
        tuerStand.set(g.id, 0)
        schlossZu.add(g.id)
      }
    }
    for (const s of schubGruppen) if (s.lauf) schubStand.set(s.id, s.nach)
    const alt = [...gruppe.children]
    gruppe.clear()
    // Geteilte Materialien werden dabei mehrfach freigegeben; das ist in three harmlos.
    for (const o of alt) wegwerfen(o, einheit, kanten, ...formen.values())
    for (const g of formen.values()) g.dispose()
    formen.clear()
    flaechenMat.clear()
    linienMat.clear()
    wasserMats.clear()
    tvMat = null
    for (const s of spiegelListe) {
      if (!s.refl) continue
      spiegelGruppe.remove(s.refl)
      s.refl.geometry.dispose()
      s.refl.dispose()
    }
    spiegelListe = []
    for (const l of tvLichter) {
      scene.remove(l.licht)
      l.licht.dispose()
    }
    tvLichter = []
    waende = []
    kollision.leeren()
    decke.y = Infinity
    tuerGruppen = []
    schubGruppen = []
    dinge = new Map()
    geraetTeile = []
    plaetze = new Map()
  }

  /** Haelt dieses Teil beim Begehen auf? Waende (ohne Sturz und Oberteil der
   *  Zarge), Moebel in Knie- bis Brusthoehe. */
  function istHindernis(k: Quader): boolean {
    if (k.ding || k.geraet?.teil === 'an') return false
    const unten = k.mitte[1] - k.masse[1] / 2
    const oben = k.mitte[1] + k.masse[1] / 2
    if (WAND_HINDERNIS.has(k.rolle)) return unten < MOEBEL_OBEN_M
    if (MOEBEL_HINDERNIS.has(k.rolle)) return oben > MOEBEL_UNTEN_M && unten < MOEBEL_OBEN_M
    return false
  }

  /** Oberkante eines Hindernisses der Wohnung (E87, Meter ueber dem
   *  Boden): Moebelteile bis MOEBEL_STEIG_M (Tisch, Bett, Sofa, Stuhl)
   *  ersteigt man. Waende, Tueren, Schubladen, Regale, Kisten und hohe
   *  Moebel: keine (halten immer auf). */
  function obenVon(k: Quader): number | undefined {
    if (k.rolle !== 'moebel' || k.tuer || k.schub) return undefined
    const oben = k.mitte[1] + k.masse[1] / 2
    return oben > 0 && oben <= MOEBEL_STEIG_M ? oben : undefined
  }

  function bauen(liste: Koerper[]) {
    // Die Vorschau (E87) gibt einem Ding der Wohnung ihre Materialien:
    // zurueck, bevor die Teile freigegeben werden.
    geistAus()
    leeren()
    const tuerNachId = new Map<string, TuerGruppe>()
    const schubNachId = new Map<string, SchubGruppe>()
    const dingNachId = new Map<string, Ding>()
    const dingKasten = new Map<string, [number, number, number, number, number, number]>()
    const tvKoerper = new Map<string, Quader[]>()
    const tvSchirme: Quader[] = []
    for (const k of liste) {
      if (k.art === 'flaeche') {
        const umriss = new Shape(k.punkte.map(([x, z]) => new Vector2(x, -z)))
        const geo = new ShapeGeometry(umriss)
        const mesh = new Mesh(geo, new MeshLambertMaterial({ color: new Color(k.farbe) }))
        mesh.rotation.x = -Math.PI / 2
        mesh.position.y = k.y - 0.002
        mesh.userData = { rolle: 'boden' } satisfies TeilDaten
        gruppe.add(mesh)
        continue
      }
      const wand = k.innen !== null
      const durch = k.deckkraft < 1 || wand
      const g = k.geraet
      const mat =
        k.rolle === 'leuchte'
          ? leuchteMat(k.id ?? '')
          : g?.teil === 'an' && g.art === 'tv'
            ? tvMaterial()
            : g?.teil === 'an' && g.art === 'wasser'
              ? wasserMaterial(k.farbe)
              : wand
                ? new MeshLambertMaterial({
                    color: new Color(k.farbe),
                    transparent: durch,
                    opacity: k.deckkraft,
                    depthWrite: k.deckkraft >= 1,
                  })
                : flaecheMaterial(k.farbe, k.deckkraft, durch, k.glanz ?? 0)
      const gestalt = wand ? { geo: einheit, echt: false } : form(k)
      const mesh = new Mesh(gestalt.geo, mat)
      // Erst Lage, Groesse und Drehung, danach Tuer- und Schubstand. Vor
      // E82 lief es umgekehrt: Schubladen sprangen zum Ursprung, Tueren
      // vergassen beim Neubau ihren Stand.
      mesh.position.set(k.mitte[0], k.mitte[1], k.mitte[2])
      if (!gestalt.echt) mesh.scale.set(k.masse[0], k.masse[1], k.masse[2])
      const kx = k.kipp?.x ?? 0
      const kz = k.kipp?.z ?? 0
      mesh.rotation.set(kx, k.drehY, kz, 'YXZ')
      const u: TeilDaten = { rolle: k.rolle }
      mesh.userData = u
      if (k.id) {
        if (k.rolle === 'kiste') u.kisteId = k.id
        else if (k.rolle === 'schalter') u.schalterRaum = k.id
        // Tueren und Schubladen tragen keine Objekt-Id: ein Druck darauf
        // schaltet sie und greift nicht das Moebel (wie vor E82).
        else if (OBJEKT_ROLLEN.has(k.rolle) && !k.tuer && !k.schub) u.objektId = k.id
      }
      if (k.platz) {
        u.platz = k.platz
        if (k.id) {
          const liste = plaetze.get(k.id) ?? []
          liste.push(k.platz)
          plaetze.set(k.id, liste)
        }
      }
      if (k.rolle === 'scheibe' || (k.deckkraft < 0.5 && k.rolle !== 'kiste') || g?.teil === 'an') u.glas = true
      if (g) {
        u.geraet = g
        geraetTeile.push(mesh)
        if (g.art === 'tv' && g.teil === 'an') tvSchirme.push(k)
        else if (g.art === 'tv') {
          const liste = tvKoerper.get(g.id) ?? []
          liste.push(k)
          tvKoerper.set(g.id, liste)
        }
      }
      let linien: LineSegments | null = null
      if (k.kante) {
        const deck = k.hervor ? 1 : k.deckkraft
        linien = new LineSegments(
          kanten,
          wand
            ? new LineBasicMaterial({ color: new Color(k.kante), transparent: durch, opacity: deck })
            : linieMaterial(k.kante, deck, durch),
        )
        // An einer Geometrie in echter Groesse wird der Einheitswuerfel der
        // Linien selbst gestreckt.
        if (gestalt.echt) linien.scale.set(k.masse[0], k.masse[1], k.masse[2])
        mesh.add(linien)
      }
      gruppe.add(mesh)
      if (k.innen) waende.push({ mesh, linien, innen: k.innen, x: k.mitte[0], z: k.mitte[2], basis: k.deckkraft })

      const hindernis = istHindernis(k) ? kollision.dazu(k.mitte[0], k.mitte[2], k.masse[0], k.masse[2], k.drehY, true, obenVon(k)) : -1
      if (k.rolle === 'wand') {
        // Decke (E87): die hoechste Wand, Grundriss aller Waende (grob, ohne Drehung).
        const halb = Math.max(k.masse[0], k.masse[2]) / 2
        const oben = k.mitte[1] + k.masse[1] / 2
        if (decke.y === Infinity) {
          decke.y = oben
          decke.x0 = k.mitte[0] - halb
          decke.z0 = k.mitte[2] - halb
          decke.x1 = k.mitte[0] + halb
          decke.z1 = k.mitte[2] + halb
        } else {
          decke.y = Math.max(decke.y, oben)
          decke.x0 = Math.min(decke.x0, k.mitte[0] - halb)
          decke.z0 = Math.min(decke.z0, k.mitte[2] - halb)
          decke.x1 = Math.max(decke.x1, k.mitte[0] + halb)
          decke.z1 = Math.max(decke.z1, k.mitte[2] + halb)
        }
      }

      if (k.tuer) {
        const d = k.tuer
        let t = tuerNachId.get(d.id)
        if (!t) {
          const spanne = winkelDiff(d.auf, d.zu)
          t = {
            id: d.id,
            zu: d.zu,
            auf: d.auf,
            spanne,
            richtung: spanne < 0 ? -1 : 1,
            raum: false,
            winkel: d.zu,
            teile: [],
            lauf: 0,
            von: 0,
            nach: 0,
            start: 0,
            danachAbschliessen: false,
            verschlossen: schlossZu.has(d.id),
            schloss: schlossZu.has(d.id) ? 1 : 0,
            schlossVon: 0,
            schlossStart: 0,
            schlossLauf: false,
          }
          tuerNachId.set(d.id, t)
          tuerGruppen.push(t)
        }
        if (k.rolle === 'tuerblatt') t.raum = true
        const ox = k.mitte[0] - d.angel[0]
        const oz = k.mitte[2] - d.angel[1]
        const [l0, , l2] = k.masse
        const teil: TuerTeil = {
          mesh,
          gruppe: t,
          ax: d.angel[0],
          az: d.angel[1],
          ox,
          oz,
          drehY: k.drehY,
          kx,
          kz,
          schluessel: k.rolle === 'schluessel',
          achse: k.masse[0] >= k.masse[1] && k.masse[0] >= k.masse[2] ? ACHSE_X : k.masse[1] >= k.masse[2] ? ACHSE_Y : ACHSE_Z,
          hindernis,
        }
        if (hindernis >= 0) {
          // Raster: der ganze Kreis, den das Teil um die Angel ueberstreicht.
          const reich = Math.hypot(ox, oz) + Math.hypot(l0, l2) / 2 + 0.01
          kollision.bereich(hindernis, d.angel[0] - reich, d.angel[1] - reich, d.angel[0] + reich, d.angel[1] + reich)
        }
        u.tuer = teil
        t.teile.push(teil)
      } else if (k.schub) {
        let s = schubNachId.get(k.schub.id)
        if (!s) {
          s = { id: k.schub.id, weg: k.schub.weg, anteil: 0, teile: [], lauf: false, von: 0, nach: 0, start: 0 }
          schubNachId.set(k.schub.id, s)
          schubGruppen.push(s)
        }
        // Grundlage ist die geschlossene Lage aus der Beschreibung (E68).
        s.teile.push({ mesh, bx: k.mitte[0], bz: k.mitte[2], drehY: k.drehY, hindernis })
        if (hindernis >= 0) kollision.bereichVerschoben(hindernis, k.schub.weg[0], k.schub.weg[1])
        u.schub = s
      }

      if (k.ding) {
        u.ding = k.ding
        let d = dingNachId.get(k.ding)
        if (!d) {
          d = dingNeu(k.ding)
          dingNachId.set(k.ding, d)
          dingKasten.set(k.ding, [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity])
        }
        d.teile.push({ mesh, px: k.mitte[0], py: k.mitte[1], pz: k.mitte[2], drehY: k.drehY, kx, kz })
        const b = dingKasten.get(k.ding)
        if (b) {
          for (let a = 0; a < 3; a++) {
            b[a] = Math.min(b[a], k.mitte[a] - k.masse[a] / 2)
            b[a + 3] = Math.max(b[a + 3], k.mitte[a] + k.masse[a] / 2)
          }
        }
      }

      if (k.rolle === 'spiegel' && k.normale) spiegelListe.push(spiegelAus(k, k.normale))
    }

    // Tueren: Stand aus dieser Sitzung, sonst Zimmertueren 25 Grad offen
    // (wie im Plan), Moebeltueren zu. Abgeschlossen heisst zu.
    const offen = (TUER_OFFEN_GRAD * Math.PI) / 180
    for (const t of tuerGruppen) {
      const stand = tuerStand.get(t.id)
      const w = t.verschlossen ? t.zu : stand !== undefined ? t.zu + t.spanne * stand : t.raum ? t.zu + t.richtung * offen : t.zu
      tuerSetzen(t, w)
    }
    for (const s of schubGruppen) schubSetzen(s, schubStand.get(s.id) ?? 0)

    // Dinge: Mitte aus der Beschreibung, verlegte wieder an ihren Platz.
    for (const d of dingNachId.values()) {
      const b = dingKasten.get(d.id)
      if (b) {
        d.cx = (b[0] + b[3]) / 2
        d.cy = (b[1] + b[4]) / 2
        d.cz = (b[2] + b[5]) / 2
        // Groesse fuer das Hinstellen (E87): der Kasten der Beschreibung.
        d.breite = Math.max(0.02, b[3] - b[0])
        d.hoehe = Math.max(0.02, b[4] - b[1])
        d.tiefe = Math.max(0.02, b[5] - b[2])
      }
      const lage = dingLage.get(d.id)
      if (lage) dingAnwenden(d, lage.x, lage.y, lage.z, lage.d)
    }
    dinge = dingNachId

    // Fernseher: ein kuehles Licht vor dem Bildschirm (hoechstens zwei).
    for (const k of tvSchirme) {
      if (tvLichter.length >= TV_LICHTER_MAX || !k.geraet) break
      const c = Math.cos(k.drehY)
      const s = Math.sin(k.drehY)
      // Der Bildschirm ist entlang seiner duennen Seite flach.
      const duennX = k.masse[0] <= k.masse[2]
      let nx = duennX ? c : s
      let nz = duennX ? -s : c
      let sicher = false
      const koerper = tvKoerper.get(k.geraet.id)
      if (koerper?.length) {
        let bx = 0
        let bz = 0
        for (const q of koerper) {
          bx += q.mitte[0] / koerper.length
          bz += q.mitte[2] / koerper.length
        }
        const vor = (k.mitte[0] - bx) * nx + (k.mitte[2] - bz) * nz
        if (Math.abs(vor) > 0.002) {
          sicher = true
          if (vor < 0) {
            nx = -nx
            nz = -nz
          }
        }
      }
      const licht = new PointLight(0x9fc4ff, 0, 3.2, 2)
      scene.add(licht)
      tvLichter.push({ licht, id: k.geraet.id, x: k.mitte[0], y: k.mitte[1], z: k.mitte[2], nx, nz, sicher })
    }
    geraeteAktualisieren()

    // Rastern, mit den Rechtecken der Ebene der Wohnung dahinter (E83).
    ebenen.wohnungFertig()
    // Der Kasten der Wohnung, fuer das Zielen beim Hinstellen (E87).
    wohnKasten.makeEmpty()
    if (gruppe.children.length) wohnKasten.setFromObject(gruppe)

    // Ein Ding in der Hand bleibt in der Hand, auch nach dem Neubau (nur
    // eins der Wohnung; eins der Welt haengt nicht an ihr).
    if (halt.id && !halt.ding?.objekt) {
      const d = dinge.get(halt.id)
      if (d) {
        halt.ding = d
        halt.laeuft = false
        haltSchritt(performance.now())
      } else {
        halt.id = null
        halt.ding = null
        inHandFn?.(null)
      }
    }
  }

  function zielen(ziel: Vec3, abstand: number, polar: number, azimut: number) {
    controls.target.set(ziel[0], ziel[1], ziel[2])
    camera.position.set(
      ziel[0] + abstand * Math.sin(polar) * Math.sin(azimut),
      ziel[1] + abstand * Math.cos(polar),
      ziel[2] + abstand * Math.sin(polar) * Math.cos(azimut),
    )
    controls.update()
    anstossen()
  }

  /* ------------------------------------------------ Tueren auf und zu */

  const euler = new Euler()
  const quat = new Quaternion()

  /** Wie weit offen bei Winkel w: 0 zu, 1 ganz offen. */
  function offenAnteil(g: TuerGruppe, w: number): number {
    return Math.abs(g.spanne) > 1e-6 ? winkelDiff(w, g.zu) / g.spanne : 0
  }

  /** Alle Teile der Tuer auf Winkel w (als drehY): jedes um die Angel um
   *  (w - zu) gedreht, Neigung bleibt. Der Schluessel dreht dazu um seine
   *  lange Achse, so weit er abgeschlossen ist. Ohne neues Objekt. */
  function tuerSetzen(g: TuerGruppe, w: number) {
    g.winkel = w
    tuerStand.set(g.id, offenAnteil(g, w))
    const d = winkelDiff(w, g.zu)
    const c = Math.cos(d)
    const s = Math.sin(d)
    for (let i = 0; i < g.teile.length; i++) {
      const t = g.teile[i]
      const x = t.ax + t.ox * c + t.oz * s
      const z = t.az - t.ox * s + t.oz * c
      const m = t.mesh
      m.position.x = x
      m.position.z = z
      const dreh = t.drehY + d
      if (t.schluessel && g.schloss > 1e-4) {
        euler.set(t.kx, dreh, t.kz, 'YXZ')
        m.quaternion.setFromEuler(euler)
        quat.setFromAxisAngle(t.achse, (g.schloss * Math.PI) / 2)
        m.quaternion.multiply(quat)
      } else m.rotation.set(t.kx, dreh, t.kz, 'YXZ')
      if (t.hindernis >= 0) kollision.lage(t.hindernis, x, z, dreh)
    }
    const aufhalten = g.verschlossen || Math.abs(d) < TUER_ZU_RAD
    for (let i = 0; i < g.teile.length; i++) {
      const t = g.teile[i]
      if (t.hindernis >= 0) kollision.aktiv(t.hindernis, aufhalten)
    }
  }

  function tuerFahren(g: TuerGruppe, nach: number) {
    g.lauf = 1
    g.von = g.winkel
    g.nach = nach
    g.start = performance.now()
    anstossen()
  }

  function tuerIstZu(g: TuerGruppe): boolean {
    return g.lauf !== 1 && Math.abs(winkelDiff(g.winkel, g.zu)) < 0.05
  }

  function schlossSetzen(g: TuerGruppe, zu: boolean) {
    g.verschlossen = zu
    if (zu) schlossZu.add(g.id)
    else schlossZu.delete(g.id)
    g.schlossVon = g.schloss
    g.schlossStart = performance.now()
    g.schlossLauf = true
    tuerSetzen(g, g.winkel)
    anstossen()
  }

  /** Tippen auf ein Teil der Tuer. Schluessel: ab- und aufschliessen (offen:
   *  erst zu, dann ab). Sonst: offen -> zu, zu -> ganz offen; abgeschlossen
   *  ruettelt sie nur. */
  function tuerTippen(g: TuerGruppe, schluessel: boolean) {
    if (schluessel) {
      if (g.verschlossen) schlossSetzen(g, false)
      else if (tuerIstZu(g)) schlossSetzen(g, true)
      else {
        g.danachAbschliessen = true
        tuerFahren(g, g.zu)
      }
      return
    }
    if (g.verschlossen) {
      g.lauf = 2
      g.start = performance.now()
      anstossen()
      return
    }
    g.danachAbschliessen = false
    // Waehrend des Laufs zaehlt, wohin sie gerade will.
    const ziel = g.lauf === 1 ? g.nach : g.winkel
    tuerFahren(g, Math.abs(winkelDiff(ziel, g.zu)) < 0.05 ? g.auf : g.zu)
  }

  /** Hat sich in diesem Bild eine Tuer bewegt (auch im letzten Schritt)? */
  let tuerBewegt = false

  /** Tueren weiterdrehen. true, solange eine laeuft. */
  function tuerenSchritt(zeit: number): boolean {
    let laeuft = false
    tuerBewegt = false
    for (let i = 0; i < tuerGruppen.length; i++) {
      const g = tuerGruppen[i]
      if (!g.lauf && !g.schlossLauf) continue
      tuerBewegt = true
      let w = g.winkel
      if (g.lauf === 1) {
        const p = anteil(zeit, g.start, TUER_MS)
        w = g.von + winkelDiff(g.nach, g.von) * glatt(p)
        if (p >= 1) {
          g.lauf = 0
          w = g.nach
          g.winkel = w
          if (g.danachAbschliessen) {
            g.danachAbschliessen = false
            schlossSetzen(g, true)
          }
        }
      } else if (g.lauf === 2) {
        const p = anteil(zeit, g.start, RATTERN_MS)
        w = g.zu + g.richtung * RATTERN_RAD * Math.abs(Math.sin(p * Math.PI * 3)) * (1 - p)
        if (p >= 1) {
          g.lauf = 0
          w = g.zu
        }
      }
      if (g.schlossLauf) {
        const p = anteil(zeit, g.schlossStart, SCHLOSS_MS)
        g.schloss = g.schlossVon + ((g.verschlossen ? 1 : 0) - g.schlossVon) * glatt(p)
        if (p >= 1) g.schlossLauf = false
      }
      tuerSetzen(g, w)
      if (g.lauf || g.schlossLauf) laeuft = true
    }
    return laeuft
  }

  /** Schublade auf Anteil a (0 zu, 1 ganz offen) setzen. */
  function schubSetzen(s: SchubGruppe, a: number) {
    s.anteil = a
    schubStand.set(s.id, a)
    for (let i = 0; i < s.teile.length; i++) {
      const t = s.teile[i]
      const x = t.bx + s.weg[0] * a
      const z = t.bz + s.weg[1] * a
      t.mesh.position.x = x
      t.mesh.position.z = z
      if (t.hindernis >= 0) kollision.lage(t.hindernis, x, z, t.drehY)
    }
  }

  /** Offen -> zu, zu -> offen; waehrend des Laufs zaehlt, wohin sie will. */
  function schubUmschalten(s: SchubGruppe) {
    const ziel = s.lauf ? s.nach : s.anteil
    s.von = s.anteil
    s.nach = ziel > 0.5 ? 0 : 1
    s.lauf = true
    s.start = performance.now()
    anstossen()
  }

  function schubSchritt(zeit: number): boolean {
    let laeuft = false
    for (let i = 0; i < schubGruppen.length; i++) {
      const s = schubGruppen[i]
      if (!s.lauf) continue
      const p = anteil(zeit, s.start, SCHUB_MS)
      schubSetzen(s, s.von + (s.nach - s.von) * glatt(p))
      if (p >= 1) s.lauf = false
      else laeuft = true
    }
    return laeuft
  }

  /* ---------------------------------------------------------- Begehen */

  let gier = 0 // Drehung um die Hochachse (Blickrichtung)
  let neigung = 0 // hoch und runter schauen
  /** Wohin das Umschauen will; gier und neigung folgen leicht geglaettet. */
  let gierZiel = 0
  let neigungZiel = 0
  /** Geschwindigkeit am Boden (m/s), weich an- und auslaufend. */
  let vx = 0
  let vz = 0
  let vorher: { pos: Vector3; ziel: Vector3; fov: number } | null = null
  const halten = new Set<GehRichtung>()
  /** Steuerknueppel: seitlich und vor, je -1..1. */
  const stick = { x: 0, y: 0 }
  let rennen = false
  let schauen: { x: number; y: number; id: number } | null = null
  /** Stelle fuer kollision.ts, ohne neues Objekt je Bild. */
  const stelle: Stelle = { x: 0, z: 0 }

  /* Hoehe (E87, physik.ts): Fuesse, Sprung und Fall; das Auge folgt
   * geglaettet (augeFuss ist die Hoehe der Fuesse, der es folgt). */
  const senk = senkrechtNeu(0)
  let augeFuss = 0
  /** Sitzen, Liegen oder ein Wechsel fuehrte die Kamera: beim naechsten
   *  Stehen beginnen Fuesse und Auge an der Kamera. */
  let senkFrei = true
  /** Einsinken beim Landen: Beginn (ms, Uhr der Bilder) und Tiefe (m). */
  let delleStart = -Infinity
  let delleT = 0
  /** Treppen der Welt und die, auf der man steht (-1: keine). Auf ihr gilt
   *  weiter die Ebene, von der man kam, bis man sie verlaesst. */
  const treppen = new Treppen()
  let treppeJetzt = -1
  /** Die Welt ging beim Begehen auf einer Treppe weg (welt(null)): ihre
   *  Kennung, damit eine neue Welt vor dem naechsten Bild sie wiederfindet. */
  let treppeMerk: string | null = null
  /** Zuletzt gelesene version() der Welt (null: hat keine). */
  let weltVersion: number | null = null
  /** Was man tun kann (moeglich()), zuletzt gemeldet als Bitmaske (-1: noch nie). */
  let moeglichFn: ((m: Moeglich3D) => void) | null = null
  let moeglichZuletzt = -1

  /* Hinsetzen und Hinlegen (E82). */
  let haltungJetzt: Haltung = 'stehen'
  let haltungFn: ((h: Haltung) => void) | null = null
  let platzJetzt: NonNullable<Quader['platz']> | null = null
  /** Wo man zuletzt stand, bevor man sich gesetzt hat. */
  let stehX = 0
  let stehZ = 0
  /** Weiches Gleiten der Kamera zum Platz und zurueck. */
  const wechsel = { an: false, start: 0, vx: 0, vy: 0, vz: 0, vg: 0, vn: 0, nx: 0, ny: 0, nz: 0, ng: 0, nn: 0 }

  /* Ein Ding in der Hand (E82). */
  let inHandFn: ((ding: string | null) => void) | null = null
  const halt = {
    id: null as string | null,
    ding: null as Ding | null,
    /** Drehung des Dings gegenueber dem Blick, beim Aufheben gemerkt. */
    relD: 0,
    /** Drehstufe fuer das Hinstellen (E87, hinstellen.ts), je 45 Grad. */
    stufe: 0,
    laeuft: false,
    start: 0,
    vonX: 0,
    vonY: 0,
    vonZ: 0,
    vonD: 0,
    x: 0,
    y: 0,
    z: 0,
    d: 0,
  }
  const kasten = new Box3()
  const hilf = new Vector3()
  /** Kasten der Wohnung (E87): nur wenn der Strahl ihn trifft, wird beim
   *  Zielen gegen ihre Teile gerechnet. */
  const wohnKasten = new Box3()

  /* Eigene Stellung melden (E82). */
  let poseFn: ((p: Pose3D) => void) | null = null
  const gemeldet = { x: 0, y: 0, z: 0, gier: 0, neigung: 0, haltung: 'stehen' as Haltung, tempo: 0, zeit: -Infinity, fz: null as string | null }
  let pulsUhr = 0

  function tempoJetzt(): number {
    return Math.min(2, Math.hypot(vx, vz) / GEHEN_M_S)
  }

  function haltungSetzen(h: Haltung) {
    if (h === haltungJetzt) return
    haltungJetzt = h
    haltungFn?.(h)
    poseMelden(performance.now(), true)
  }

  /** Augenhoehe fuer die eigene Figur und die Mitspieler (E87): stehend die
   *  Fuesse plus Augenhoehe, ohne die Glaettung und das Einsinken des
   *  Bildes (sonst steckte die Figur auf Stufen kurz im Boden), sonst die
   *  Kamera. */
  function poseY(): number {
    return gehen && haltungJetzt === 'stehen' && !wechsel.an && !senkFrei ? senk.fuss + AUGE_M : camera.position.y
  }

  /** Augen des Fahrers fuer die Meldung (E87), ohne neues Objekt. */
  const poseSicht: FahrerSicht = { x: 0, y: 0, z: 0, gier: 0, neigung: 0, kippen: 0 }

  function poseMelden(jetzt: number, erzwingen: boolean) {
    if (!poseFn || !gehen) return
    const ft = fahrt
    let px: number
    let py: number
    let pz: number
    let pg: number
    let h: Haltung
    let tempo: number
    if (ft) {
      // Im Fahrzeug (E87): die Augen des Fahrers, sitzend; das Fahrzeug in lenkt.
      fahrerSicht(ft.e.zust, ft.e.f.fahrerAuge, poseSicht)
      px = poseSicht.x
      py = poseSicht.y
      pz = poseSicht.z
      pg = ft.e.zust.gier + gier
      h = 'sitz'
      tempo = 0
    } else {
      const p = camera.position
      px = p.x
      py = poseY()
      pz = p.z
      pg = gier
      h = haltungJetzt
      tempo = tempoJetzt()
    }
    const fz = ft ? ft.e.f.id : null
    if (!erzwingen) {
      if (jetzt - gemeldet.zeit < POSE_MS) return
      const weiter = Math.hypot(px - gemeldet.x, py - gemeldet.y, pz - gemeldet.z) > 0.02
      const gedreht = Math.abs(winkelDiff(pg, gemeldet.gier)) > POSE_DREH_RAD || Math.abs(neigung - gemeldet.neigung) > POSE_DREH_RAD
      // Stehengeblieben: einmal melden, damit die Beine der Figur anhalten.
      const steht = gemeldet.tempo > 0 && tempo === 0
      if (!weiter && !gedreht && !steht && h === gemeldet.haltung && fz === gemeldet.fz && jetzt - gemeldet.zeit < POSE_PULS_MS) return
    }
    gemeldet.x = px
    gemeldet.y = py
    gemeldet.z = pz
    gemeldet.gier = pg
    gemeldet.neigung = neigung
    gemeldet.haltung = h
    gemeldet.tempo = tempo
    gemeldet.zeit = jetzt
    gemeldet.fz = fz
    const z = ft ? ft.e.zust : null
    poseFn({
      x: px,
      y: py,
      z: pz,
      gier: winkelDiff(pg, 0),
      neigung,
      haltung: h,
      tempo,
      lenkt: ft && z ? { id: ft.e.f.id, x: z.x, y: z.y, z: z.z, gier: winkelDiff(z.gier, 0) } : null,
    })
  }

  /** Alle 2 s ein Lebenszeichen, auch wenn man still steht (ohne die Schleife zu wecken). */
  function pulsPruefen() {
    window.clearInterval(pulsUhr)
    pulsUhr = 0
    if (gehen && poseFn) pulsUhr = window.setInterval(() => poseMelden(performance.now(), false), 500)
  }

  function wechselStarten(x: number, y: number, z: number, g: number, n: number) {
    const p = camera.position
    wechsel.an = true
    wechsel.start = performance.now()
    wechsel.vx = p.x
    wechsel.vy = p.y
    wechsel.vz = p.z
    wechsel.vg = gier
    wechsel.vn = neigung
    wechsel.nx = x
    wechsel.ny = y
    wechsel.nz = z
    wechsel.ng = gier + winkelDiff(g, gier)
    wechsel.nn = n
    // Das Umschauen zielt gleich auf das Ende; wer waehrend des Gleitens
    // zieht, schaut danach weich dorthin weiter.
    gierZiel = wechsel.ng
    neigungZiel = n
    vx = 0
    vz = 0
    anstossen()
  }

  function wechselSchritt(zeit: number) {
    const p = anteil(zeit, wechsel.start, WECHSEL_MS)
    const e = glatt(p)
    camera.position.set(wechsel.vx + (wechsel.nx - wechsel.vx) * e, wechsel.vy + (wechsel.ny - wechsel.vy) * e, wechsel.vz + (wechsel.nz - wechsel.vz) * e)
    gier = wechsel.vg + (wechsel.ng - wechsel.vg) * e
    neigung = wechsel.vn + (wechsel.nn - wechsel.vn) * e
    if (p >= 1) wechsel.an = false
  }

  /** Auf einen Platz setzen oder legen: Kamera gleitet hin, Blick in die
   *  Richtung des Platzes. */
  function platzNehmen(pl: NonNullable<Quader['platz']>) {
    if (haltungJetzt === 'stehen') {
      stehX = wechsel.an ? wechsel.nx : camera.position.x
      stehZ = wechsel.an ? wechsel.nz : camera.position.z
    }
    platzJetzt = pl
    // Wer sich setzt, ist von der Treppe herunter (E87).
    treppeJetzt = -1
    const fx = -Math.sin(pl.blick)
    const fz = -Math.cos(pl.blick)
    const [px, py, pz] = pl.punkt
    if (pl.art === 'sitz') wechselStarten(px - fx * SITZ_ZURUECK_M, py + SITZ_AUGE_M, pz - fz * SITZ_ZURUECK_M, pl.blick, SITZ_NEIGUNG)
    else wechselStarten(px, py + LIEGE_AUGE_M, pz, pl.blick, LIEGE_NEIGUNG)
    haltungSetzen(pl.art)
  }

  /** Aufstehen: 60 cm vor den Platz, wenn dort frei ist, sonst dorthin,
   *  wo man vorher stand. */
  function aufstehen() {
    if (!gehen || haltungJetzt === 'stehen') return
    let x = stehX
    let z = stehZ
    if (platzJetzt) {
      const tx = platzJetzt.punkt[0] - Math.sin(platzJetzt.blick) * AUFSTEH_M
      const tz = platzJetzt.punkt[2] - Math.cos(platzJetzt.blick) * AUFSTEH_M
      if (ebenen.aktiv.frei(tx, tz, KOERPER_RADIUS_M, 0, fzZusatz())) {
        x = tx
        z = tz
      }
    }
    platzJetzt = null
    // Augen ueber dem Boden dort, mit Gelaende und dem, worauf man steht (E87).
    wechselStarten(x, grundAn(ebenen, ebenen.index, bodenY, x, z, bodenY) + AUGE_M, z, gier, 0)
    haltungSetzen('stehen')
  }

  /** Ding in Lage: Mitte cx, cy, cz (Mitte des Kastens), Drehung dd
   *  (Wohnung: gegenueber der Beschreibung; Welt, E87: Blickrichtung). */
  function dingAnwenden(d: Ding, cx: number, cy: number, cz: number, dd: number) {
    const o = d.objekt
    if (o) {
      o.position.set(cx, cy - d.hoehe / 2, cz)
      o.rotation.set(0, dd, 0)
      return
    }
    const c = Math.cos(dd)
    const s = Math.sin(dd)
    for (let i = 0; i < d.teile.length; i++) {
      const t = d.teile[i]
      const rx = t.px - d.cx
      const rz = t.pz - d.cz
      t.mesh.position.set(cx + rx * c + rz * s, cy + (t.py - d.cy), cz - rx * s + rz * c)
      t.mesh.rotation.set(t.kx, t.drehY + dd, t.kz, 'YXZ')
    }
  }

  function aufheben(d: Ding) {
    if (halt.ding || fahrt) return
    if (d.objekt) {
      // Ding der Welt (E87): Mitte des Kastens aus der Lage unten.
      halt.vonX = d.lx
      halt.vonY = d.ly + d.hoehe / 2
      halt.vonZ = d.lz
      halt.vonD = d.lg
    } else {
      const lage = dingLage.get(d.id)
      halt.vonX = lage ? lage.x : d.cx
      halt.vonY = lage ? lage.y : d.cy
      halt.vonZ = lage ? lage.z : d.cz
      halt.vonD = lage ? lage.d : 0
    }
    halt.relD = halt.vonD - gier
    // So gedreht, wie es stand, auf 45 Grad gerastert (hinstellen.ts).
    halt.stufe = stufeFuer(halt.vonD, gier)
    halt.id = d.id
    halt.ding = d
    halt.laeuft = true
    halt.start = performance.now()
    inHandFn?.(d.id)
    anstossen()
  }

  /** Nicht mehr in der Hand (hingestellt, abgelegt oder weg). */
  function handLeeren() {
    geistAus()
    halt.id = null
    halt.ding = null
    halt.laeuft = false
    vorschau.gueltig = false
    vorschau.ok = false
    inHandFn?.(null)
    anstossen()
  }

  /** Ein Ding der Welt liegt jetzt dort (Mitte unten x, y, z, Drehung g)
   *  auf Ebene ebene (E87); merken fuer ein spaeteres Wiederauftauchen. */
  function weltDingSetzen(d: Ding, x: number, y: number, z: number, g: number, ebene: string | null) {
    d.lx = x
    d.ly = y
    d.lz = z
    d.lg = winkelDiff(g, 0)
    if (ebene) d.ebeneId = ebene
    d.verlegt = true
    dingAnwenden(d, x, y + d.hoehe / 2, z, d.lg)
  }

  /** Kennung der Ebene, auf der man steht (fuer bewegt()); ohne Ebenen die
   *  des Dings. */
  function ebeneIdJetzt(sonst: string): string {
    const i = ebenen.index
    return i >= 0 && i < ebenen.liste.length ? ebenen.liste[i].id : sonst
  }

  /** Kennung der Ebene fuer ein Ding, das man an (x, z) mit Unterkante y
   *  hinstellt (E87b): auf einer Treppe die ihrer beiden Ebenen, auf deren
   *  Boden (samt Gelaende) es steht, also den hoechsten Boden darunter
   *  (oben auf dem Absatz die obere); sonst die, auf der man steht. So
   *  findet dingErreichbar das Geschoss des Dings. */
  function ebeneIdFuer(x: number, y: number, z: number, sonst: string): string {
    const t = treppeJetzt
    if (t < 0 || t >= treppen.liste.length) return ebeneIdJetzt(sonst)
    let best = -1
    let bestY = -Infinity
    for (const k of [treppen.von[t], treppen.nach[t]]) {
      if (!ebenen.gibt(k)) continue
      const b = ebenen.boden(k) + ebenen.gelaende(k, x, z)
      if (b <= y + 0.05 && b > bestY) {
        best = k
        bestY = b
      }
    }
    return best >= 0 ? ebenen.liste[best].id : ebeneIdJetzt(sonst)
  }

  /** Ein Ding der Welt wurde hingestellt oder abgelegt (E87): merken und melden. */
  function dingMelden(d: Ding) {
    const l: DingLage3D = { id: d.id, art: 'ding', x: d.lx, y: d.ly, z: d.lz, gier: d.lg, ebene: d.ebeneId }
    lagenMerk.set(d.id, l)
    bewegtFn?.({ ...l })
  }

  /** Das Ding in der Hand an diese Stelle stellen (Mitte unten x, y, z,
   *  Drehung g), aus der Hand. Dinge der Welt melden sich (bewegt()). */
  function dingHinstellen(d: Ding, x: number, y: number, z: number, g: number) {
    geistAus()
    if (d.objekt) {
      weltDingSetzen(d, x, y, z, g, ebeneIdFuer(x, y, z, d.ebeneId))
      dingMelden(d)
    } else {
      dingAnwenden(d, x, y + d.hoehe / 2, z, g)
      dingLage.set(d.id, { x, y: y + d.hoehe / 2, z, d: g })
    }
    handLeeren()
  }

  /** Ding in der Hand: 0,5 m vor der Kamera, 0,3 m unter den Augen, mit
   *  dem Blick gedreht. true, solange es noch hochgehoben wird. */
  function haltSchritt(zeit: number): boolean {
    const d = halt.ding
    if (!d) return false
    const p = camera.position
    const tx = p.x - Math.sin(gier) * HALTE_VOR_M
    const ty = p.y - HALTE_UNTER_M
    const tz = p.z - Math.cos(gier) * HALTE_VOR_M
    const td = gier + halt.relD
    if (halt.laeuft) {
      const a = anteil(zeit, halt.start, HEBEN_MS)
      const e = glatt(a)
      halt.x = halt.vonX + (tx - halt.vonX) * e
      halt.y = halt.vonY + (ty - halt.vonY) * e
      halt.z = halt.vonZ + (tz - halt.vonZ) * e
      halt.d = halt.vonD + winkelDiff(td, halt.vonD) * e
      if (a >= 1) halt.laeuft = false
    } else {
      halt.x = tx
      halt.y = ty
      halt.z = tz
      halt.d = td
    }
    dingAnwenden(d, halt.x, halt.y, halt.z, halt.d)
    return halt.laeuft
  }

  /** Boden unter (x, z) zum Ablegen (E87): auf einer Treppe die Treppe,
   *  sonst Boden der Ebene, Gelaende und jede Oberkante dort (Bank,
   *  Mauer, Tisch). */
  const unterStelle: Stelle = { x: 0, z: 0 }
  function bodenUnter(x: number, z: number): number {
    if (treppeJetzt >= 0) {
      unterStelle.x = x
      unterStelle.z = z
      return treppen.hoehe(treppeJetzt, unterStelle, ebenen)
    }
    return grundAn(ebenen, ebenen.index, bodenY, x, z, 1e5)
  }

  /** Ablegen: senkrecht unter der Hand auf das, was dort steht (ohne Glas
   *  und ohne das Ding selbst), sonst auf den Boden. Drehung bleibt. */
  function ablegen() {
    const d = halt.ding
    if (!d) return
    geistAus()
    dingAnwenden(d, halt.x, halt.y, halt.z, halt.d)
    kasten.makeEmpty()
    if (d.objekt) {
      d.objekt.updateWorldMatrix(true, true)
      kasten.expandByObject(d.objekt, false)
    }
    for (const t of d.teile) {
      t.mesh.updateWorldMatrix(true, true)
      kasten.expandByObject(t.mesh, false)
    }
    const unten = kasten.isEmpty() ? halt.y - d.hoehe / 2 : kasten.min.y
    hilf.set(halt.x, halt.y, halt.z)
    strahl.set(hilf, RUNTER)
    // Nie unter den Boden, auf dem man steht (E83: auch auf anderen Ebenen;
    // E87: mit Gelaende, Treppe, Bank und Mauer).
    const grund = bodenUnter(halt.x, halt.z)
    let boden = grund
    for (const hit of strahl.intersectObjects(gruppe.children, false)) {
      const u = daten(hit.object)
      if (!hit.object.visible || u.ding === d.id || u.glas) continue
      boden = Math.max(grund, hit.point.y)
      break
    }
    // E87: auch auf ein Ding der Welt darunter.
    weltNaheSammeln(halt.x, halt.z, 2)
    if (weltNahe.length) {
      for (const hit of strahl.intersectObjects(weltNahe, true)) {
        if (!sichtbar(hit.object) || dingVon(hit.object) === d) continue
        boden = Math.max(boden, hit.point.y)
        break
      }
    }
    halt.y += boden - unten
    if (d.objekt) {
      // Ding der Welt (E87): Lage merken und melden.
      weltDingSetzen(d, halt.x, halt.y - d.hoehe / 2, halt.z, halt.d, ebeneIdFuer(halt.x, halt.y - d.hoehe / 2, halt.z, d.ebeneId))
      dingMelden(d)
      handLeeren()
      return
    }
    dingAnwenden(d, halt.x, halt.y, halt.z, halt.d)
    dingLage.set(d.id, { x: halt.x, y: halt.y, z: halt.z, d: halt.d })
    handLeeren()
  }

  /* ------------------------------------- Fahrzeuge und Dinge der Welt (E87) */

  /** Fahrzeuge der Welt (dem Motor uebergeben, siehe welt()). */
  let fzListe: FzEintrag[] = []
  let fzNachId = new Map<string, FzEintrag>()
  const fzNachGruppe = new Map<Object3D, FzEintrag>()
  /** Dinge der Welt (ebenso). */
  let weltDingListe: Ding[] = []
  let weltDingNachId = new Map<string, Ding>()
  const objektDing = new Map<Object3D, Ding>()
  /** Lagen aus lage() und eigene (hingestellt, abgestellt) je Kennung: gelten,
   *  sobald die Kennung (wieder) auftaucht. */
  const lagenMerk = new Map<string, DingLage3D>()
  /** E87b: Kennungen gemerkter Lagen, fuer die die Welt das Ding einzeln
   *  bauen soll (dingErzeugen, je Welt hoechstens einmal). */
  const erzeugen = new ErzeugenListe()
  /** Was dingErzeugen in einem Bild gebaut hat (ohne neues Feld je Bild). */
  const erzeugtJetzt: string[] = []
  /** E87b: Kennungen, die dingErzeugen gebaut hat, die aber danach nicht in
   *  dinge standen (einmal gewarnt). */
  const erzeugtFehlt = new Set<string>()
  let bewegtFn: ((l: DingLage3D) => void) | null = null
  /** Zuletzt gewarnte kaputte Eintraege der Welt (nicht bei jeder Version neu). */
  let teileWarnung = ''

  /** Die abgestellten Fahrzeuge der aktiven Ebene als Rechtecke (fuer das
   *  Gehen und, ohne das eigene, fuer das Fahren). Neu gebaut, wenn alt,
   *  bei einer anderen Ebene oder einem anderen eigenen Fahrzeug. */
  const fzRaster = new Hindernisse(4)
  let fzAlt = true
  let fzRasterEbene = -2
  let fzRasterOhne: FzEintrag | null = null
  let fzRasterZeit = 0

  /** Das Fahrzeug, in dem man sitzt (E87), sonst null. */
  let fahrt: { e: FzEintrag; sicht: 'innen' | 'hinten'; kam: Verfolger } | null = null
  /** Sicht fuer das naechste Einsteigen (fahrSicht() gilt weiter). */
  let fahrSichtWahl: 'innen' | 'hinten' = 'innen'
  const fahrKam = verfolger()
  /** Leertaste beim Fahren (bremst, solange gedrueckt). */
  let bremse = false
  const fahrEin: FahrEingabe = { gas: 0, lenk: 0, bremse: false }
  const fahrErg = fahrErgebnis()
  const fahrSichtJetzt: FahrerSicht = { x: 0, y: 0, z: 0, gier: 0, neigung: 0, kippen: 0 }
  /** Zustand fuer die Kamera hinten mit Umschauen (gedreht um den Blick). */
  const umZust = fahrZustand(0, 0, 0)
  let fahrzeugFn: ((f: FahrzeugJetzt | null) => void) | null = null
  const fzGemeldet = { zeit: -Infinity, kmh: -1, an: false }
  /** Aufprall: Kamera wackelt kurz (Beginn ms, Staerke m). */
  const wackeln = { start: -Infinity, staerke: 0 }

  /** Boden einer Ebene (fzBodenEbene) samt Gelaende, ohne neues Objekt. */
  let fzBodenEbene = -1
  const fzBoden = (x: number, z: number) => ebenen.boden(fzBodenEbene) + ebenen.gelaende(fzBodenEbene, x, z)

  /** Index der Ebene mit dieser Kennung (die erste begehbare), sonst -1. */
  function ebeneIndexVon(id: string): number {
    return ebeneMitKennung(ebenen, id)
  }

  /** Blickrichtung (gier, 0 = nach -z) aus einer Drehung in der Welt. */
  function gierVon(o: Object3D): number {
    hilf.set(0, 0, 1).applyQuaternion(o.quaternion)
    return Math.atan2(hilf.x, hilf.z)
  }

  /** Ein Fahrzeug auf den Boden seiner Ebene stellen (Hoehe, Neigung, Kippen). */
  function fzAufBoden(e: FzEintrag) {
    if (e.ebene < 0 || !ebenen.gibt(e.ebene)) return
    fzBodenEbene = e.ebene
    fahrBoden(e.zust, e.werte, fzBoden)
  }

  function fzAnwenden(e: FzEintrag) {
    lageAnwenden(e.f.gruppe, e.zust)
    raederStellen(e.f.raeder, e.zust, e.werte)
  }

  /** Ein Fahrzeug der Welt uebernehmen: in die Szene (Lage in der Welt
   *  bleibt), Lage aus der Welt oder aus lagenMerk, auf den Boden. */
  function fzNehmen(f: Fahrzeug3D): FzEintrag {
    scene.attach(f.gruppe)
    f.gruppe.matrixAutoUpdate = true
    const p = f.gruppe.position
    const grenze = f.hoechstKmh > 0 ? Math.min(GRENZE_KMH, f.hoechstKmh) : GRENZE_KMH
    const werte = fahrWerte(f.art, grenze)
    const e: FzEintrag = {
      f,
      werte,
      zust: fahrZustand(p.x, p.z, gierVon(f.gruppe), p.y),
      ebene: ebeneIndexVon(f.ebene),
      ebeneId: f.ebene,
      fern: { an: false, uid: '', x: 0, y: 0, z: 0, gier: 0 },
      blau: false,
      rx: 0,
      rz: 0,
      rg: 0,
    }
    const l = lagenMerk.get(f.id)
    if (l && l.art === 'fahrzeug') {
      e.zust.x = l.x
      e.zust.y = l.y
      e.zust.z = l.z
      e.zust.gier = l.gier
      if (l.ebene) {
        e.ebeneId = l.ebene
        e.ebene = ebeneIndexVon(l.ebene)
      }
    }
    fzAufBoden(e)
    fzAnwenden(e)
    fzNachGruppe.set(f.gruppe, e)
    return e
  }

  /** Ein Fahrzeug abgeben (es steht nicht mehr in der Liste der Welt). */
  function fzLoslassen(e: FzEintrag) {
    fzNachGruppe.delete(e.f.gruppe)
    e.fern.an = false
    // Ein Blaulicht, das der Motor eingeschaltet hat, geht aus (die Sirene
    // mit). Beim eigenen Fahrzeug bleibt der Stand gemerkt: kommt es unter
    // derselben Kennung wieder (fahrtPruefen), blinkt es dort weiter.
    if (e.blau) {
      if (!fahrt || fahrt.e !== e) e.blau = false
      try {
        e.f.blaulicht?.(false)
      } catch (err) {
        console.warn('[3d] Blaulicht beim Abgeben nicht ausgeschaltet:', err)
      }
    }
    if (e.f.gruppe.parent === scene) scene.remove(e.f.gruppe)
  }

  /** Ein Ding der Welt uebernehmen: in die Szene, Lage aus der Welt (Mitte
   *  unten, Drehung um die Hochachse) oder aus lagenMerk. */
  function dingNehmen(w: WeltDing3D): Ding {
    const o = w.objekt
    const herkunft = o.parent
    scene.attach(o)
    o.matrixAutoUpdate = true
    const d = dingNeu(w.id)
    d.objekt = o
    d.herkunft = herkunft
    d.breite = w.breite > 0 && w.breite < 100 ? w.breite : 0.3
    d.tiefe = w.tiefe > 0 && w.tiefe < 100 ? w.tiefe : 0.3
    d.hoehe = w.hoehe > 0 && w.hoehe < 100 ? w.hoehe : 0.3
    d.ebeneId = w.ebene
    d.lx = o.position.x
    d.ly = o.position.y
    d.lz = o.position.z
    d.lg = gierVon(o)
    // Nur die Drehung um die Hochachse (attach kann sie anders zerlegen).
    o.rotation.set(0, d.lg, 0)
    const l = lagenMerk.get(w.id)
    if (l && l.art === 'ding') weltDingSetzen(d, l.x, l.y, l.z, l.gier, l.ebene)
    objektDing.set(o, d)
    return d
  }

  function dingLoslassen(d: Ding) {
    if (geist.ding === d) geistAus()
    const o = d.objekt
    if (!o) return
    objektDing.delete(o)
    if (o.parent === scene) scene.remove(o)
  }

  /** Das Ding der Welt, zu dem dieses Teil gehoert, sonst null. */
  function dingVon(o: Object3D | null): Ding | null {
    for (let x = o; x; x = x.parent) {
      const d = objektDing.get(x)
      if (d) return d
    }
    return null
  }

  /** Das Fahrzeug, zu dem dieses Teil gehoert, sonst null. */
  function fzVon(o: Object3D | null): FzEintrag | null {
    for (let x = o; x; x = x.parent) {
      const e = fzNachGruppe.get(x)
      if (e) return e
    }
    return null
  }

  /** Fahrzeuge und Dinge der Welt mit den Listen abgleichen (E87): neue
   *  uebernehmen, verschwundene abgeben, gleiche behalten. Danach gilt
   *  jede Ebene neu (Index ueber die Kennung). */
  function teileAbgleichen(fz: readonly Fahrzeug3D[], di: readonly WeltDing3D[]) {
    let kaputt = 0
    let doppelt = 0
    const neuFz = new Map<string, FzEintrag>()
    const fzNeu: FzEintrag[] = []
    for (const f of fz) {
      if (!f || typeof f.id !== 'string' || !f.gruppe || !f.raeder) {
        kaputt++
        continue
      }
      if (neuFz.has(f.id)) {
        doppelt++
        continue
      }
      let e = fzNachId.get(f.id)
      if (e && e.f !== f) {
        fzLoslassen(e)
        e = undefined
      }
      if (!e) e = fzNehmen(f)
      else e.ebene = ebeneIndexVon(e.ebeneId)
      neuFz.set(f.id, e)
      fzNeu.push(e)
    }
    for (const e of fzListe) if (neuFz.get(e.f.id) !== e) fzLoslassen(e)
    fzNachId = neuFz
    fzListe = fzNeu
    fzAlt = true
    const neuDi = new Map<string, Ding>()
    const diNeu: Ding[] = []
    for (const w of di) {
      if (!w || typeof w.id !== 'string' || !w.objekt) {
        kaputt++
        continue
      }
      if (neuDi.has(w.id)) {
        doppelt++
        continue
      }
      let d = weltDingNachId.get(w.id)
      if (d && d.objekt !== w.objekt) {
        dingLoslassen(d)
        d = undefined
      }
      if (!d) d = dingNehmen(w)
      neuDi.set(w.id, d)
      diNeu.push(d)
    }
    for (const d of weltDingListe) if (neuDi.get(d.id) !== d) dingLoslassen(d)
    weltDingNachId = neuDi
    weltDingListe = diNeu
    const warnung = kaputt || doppelt ? `${kaputt}|${doppelt}` : ''
    if (warnung && warnung !== teileWarnung) console.warn(`[3d] Welt: ${kaputt} Fahrzeuge oder Dinge ohne Kennung oder Objekt und ${doppelt} doppelte Kennungen uebergangen`)
    teileWarnung = warnung
  }

  /** Haelt man ein Ding der Welt, das nicht mehr in ihrer Liste steht: unter
   *  derselben Kennung neu (neue Welt), dann dieses in der Hand; sonst,
   *  wenn endgueltig (kein Wechsel der Welt unterwegs), still aus der Hand:
   *  die Welt hat es entladen. */
  function haltPruefen(endgueltig: boolean) {
    const d = halt.ding
    if (!d || !d.objekt || weltDingNachId.get(d.id) === d) return
    const n = weltDingNachId.get(d.id)
    if (n) {
      geistAus()
      halt.ding = n
      n.verlegt = true
      if (gehen) haltSchritt(performance.now())
      return
    }
    if (endgueltig) handLeeren()
  }

  /** Sitzt man in einem Fahrzeug, das nicht mehr in der Liste steht: unter
   *  derselben Kennung neu (neue Welt), dann weiter darin (Lage, Tempo und
   *  Blaulicht bleiben); sonst, wenn endgueltig, aussteigen, wo es war, und
   *  (E87b) seine Lage melden, wenn sie neu ist: sonst sprang es beim
   *  naechsten Laden an die alte Stelle zurueck. */
  function fahrtPruefen(endgueltig: boolean) {
    const ft = fahrt
    if (!ft || fzNachId.get(ft.e.f.id) === ft.e) return
    const n = fzNachId.get(ft.e.f.id)
    if (n && n.ebene >= 0) {
      Object.assign(n.zust, ft.e.zust)
      if (ft.e.blau && n.f.blaulicht) {
        n.f.blaulicht(true)
        n.blau = true
      }
      ft.e.blau = false
      n.fern.an = false
      ft.e = n
      n.f.gruppe.visible = true
      fzAnwenden(n)
      fzAlt = true
      return
    }
    if (endgueltig) fahrtEnde(null, true)
  }

  /** Raster der Fahrzeuge fuer die aktive Ebene, ohne ohne (das eigene beim
   *  Fahren), wenn noetig neu. */
  function fzRasterAktuell(ohne: FzEintrag | null) {
    const i = ebenen.index
    if (!fzAlt && fzRasterEbene === i && fzRasterOhne === ohne) return
    fzAlt = false
    fzRasterEbene = i
    fzRasterOhne = ohne
    fzRasterZeit = performance.now()
    fzRaster.leeren()
    if (i >= 0) {
      for (const e of fzListe) {
        if (e === ohne || e.ebene !== i) continue
        const z = e.zust
        // Hindernis3D: laenge entlang x vor der Drehung (die Breite des Wagens).
        fzRaster.dazu(z.x, z.z, e.f.breite, e.f.laenge, z.gier, true, e.f.hoehe)
        e.rx = z.x
        e.rz = z.z
        e.rg = z.gier
      }
    }
    fzRaster.rastern()
  }

  /** Das Raster der Fahrzeuge fuer das Gehen (oder Fahren) jetzt, null ohne. */
  function fzZusatz(): Hindernisse | null {
    fzRasterAktuell(fahrt ? fahrt.e : null)
    return fzRaster.groesse > 0 ? fzRaster : null
  }

  /** Fahrzeuge weiter als FAHRZEUG_SICHT_M weg sind nicht zu sehen (ausser
   *  dem eigenen und fremd gelenkten). Dinge der Welt (E87b): bewegte und
   *  das in der Hand immer; bei den anderen entscheidet die Welt (sie
   *  blendet etwa die Dinge eines Geschosses aus, das man nicht sieht), der
   *  Motor setzt nichts, ausser ihr Elternteil in der Welt ist aus: dann
   *  aus, und nur dieses eigene Ausblenden nimmt er wieder zurueck. Jedes
   *  Bild, ohne neues Objekt. */
  function teileSichtbar() {
    const p = camera.position
    const weit2 = FAHRZEUG_SICHT_M * FAHRZEUG_SICHT_M
    const eigen = fahrt ? fahrt.e : null
    for (let i = 0; i < fzListe.length; i++) {
      const e = fzListe[i]
      const dx = e.zust.x - p.x
      const dz = e.zust.z - p.z
      const an = e === eigen || e.fern.an || dx * dx + dz * dz <= weit2
      if (e.f.gruppe.visible !== an) e.f.gruppe.visible = an
    }
    for (let i = 0; i < weltDingListe.length; i++) {
      const d = weltDingListe[i]
      const o = d.objekt
      if (!o) continue
      const bewegt = d === halt.ding || d.verlegt
      dingSichtbarkeit(o, d, bewegt, bewegt || sichtbar(d.herkunft))
    }
  }

  /** Laeuft ein Blaulicht, das der Motor eingeschaltet hat (und ist es zu
   *  sehen)? Dann zeichnet die Schleife weiter (das Blinken). */
  function blaulichtLaeuft(): boolean {
    for (let i = 0; i < fzListe.length; i++) if (fzListe[i].blau && fzListe[i].f.gruppe.visible) return true
    return false
  }

  /* ------------------------------------------- Fahren (E87, fahren.ts) */

  /** Einsteigen ginge jetzt grundsaetzlich (zu Fuss, stehend, ruhig). */
  function einsteigenGeht(): boolean {
    return (
      gehen &&
      !fahrt &&
      haltungJetzt === 'stehen' &&
      !wechsel.an &&
      treppeJetzt < 0 &&
      !(aufzug.an && aufzug.mit) &&
      !senk.luft &&
      !sprung.an &&
      !uebergang.an &&
      !ebeneWarten
    )
  }

  /** Darf man in dieses Fahrzeug? Auf der eigenen Ebene, zu sehen, und
   *  niemand anderes lenkt es. */
  function einsteigbar(e: FzEintrag): boolean {
    return e.ebene >= 0 && e.ebene === ebenen.index && !e.fern.an && e.f.gruppe.visible
  }

  /** Das Fahrzeug mit der naechsten Fahrertuer, hoechstens EINSTEIGEN_M weg. */
  function einsteigenZiel(): FzEintrag | null {
    if (!einsteigenGeht() || fzListe.length === 0) return null
    const p = camera.position
    let best: FzEintrag | null = null
    let bester = EINSTEIGEN_M
    for (let i = 0; i < fzListe.length; i++) {
      const e = fzListe[i]
      if (!einsteigbar(e)) continue
      const grob = e.f.laenge / 2 + EINSTEIGEN_M + 1
      if (Math.abs(e.zust.x - p.x) > grob || Math.abs(e.zust.z - p.z) > grob) continue
      const d = tuerAbstand(e.f, e.zust, p.x, p.z)
      if (d <= bester) {
        bester = d
        best = e
      }
    }
    return best
  }

  function einsteigen() {
    const e = einsteigenZiel()
    if (e) einsteigenIn(e)
  }

  /** In dieses Fahrzeug einsteigen (die Bedingungen prueft es selbst). */
  function einsteigenIn(e: FzEintrag) {
    if (!eingabeAn || !einsteigenGeht() || !einsteigbar(e)) return
    if (tuerAbstand(e.f, e.zust, camera.position.x, camera.position.z) > EINSTEIGEN_M) return
    // Ein Ding in der Hand vorher ablegen.
    if (halt.ding) ablegen()
    vx = 0
    vz = 0
    bremse = false
    const z = e.zust
    z.v = 0
    z.seitWand = Infinity
    fahrKam.an = false
    fahrt = { e, sicht: fahrSichtWahl, kam: fahrKam }
    // Umschauen gilt im Fahrzeug gegenueber seiner Richtung.
    gier = 0
    gierZiel = 0
    neigung = 0
    neigungZiel = 0
    wackeln.staerke = 0
    ichGruppe.visible = false
    camera.fov = fahrt.sicht === 'innen' ? FAHR_FOV_INNEN : FOV_GEHEN
    camera.updateProjectionMatrix()
    fzAlt = true
    fahrKamera(0, performance.now())
    const jetzt = performance.now()
    fahrzeugMelden(jetzt, true)
    poseMelden(jetzt, true)
    moeglichPruefen(false)
    anstossen()
  }

  /** Aussteigen (E87): Stelle suchen (fahren.ts, aussteigenSuchen), sonst
   *  sitzen bleiben. E87b: true, wenn man danach zu Fuss ist (auch wenn
   *  man gar nicht sass), false, wenn rundherum kein Platz war. */
  function aussteigen(): boolean {
    const ft = fahrt
    if (!ft) return true
    const e = ft.e
    if (e.ebene < 0 || !ebenen.gibt(e.ebene)) {
      // Die Ebene gibt es nicht (mehr): dort heraus, wo der Wagen steht.
      fahrtEnde(null, true)
      return fahrt === null
    }
    ebenen.wechseln(e.ebene)
    // Mit allen Fahrzeugen (auch dem eigenen): man steht nicht darin.
    fzRasterAktuell(null)
    const raster = ebenen.rasterVon(e.ebene)
    const dazu = fzRaster.groesse > 0 ? fzRaster : null
    const frei = (x: number, z: number) => raster.frei(x, z, KOERPER_RADIUS_M, 0, dazu) && treppen.unter(e.ebene, x, z) < 0
    const weg = (x0: number, z0: number, x1: number, z1: number) => {
      ausWeg.x = x0
      ausWeg.z = z0
      raster.bewegen(ausWeg, x1 - x0, z1 - z0, KOERPER_RADIUS_M, 0)
      return Math.hypot(ausWeg.x - x1, ausWeg.z - z1) < 0.05
    }
    if (aussteigenSuchen(e.f, e.zust, frei, weg, ausStelle)) {
      fahrtEnde(ausStelle, true)
      return fahrt === null
    }
    // Rundherum alles zu: sitzen bleiben, aber nicht still (Warnung, und
    // false fuer die Anzeige).
    fzAlt = true
    console.warn(`[3d] Aussteigen: rund um ${e.f.id} ist kein Platz, man bleibt sitzen`)
    return false
  }
  const ausStelle: Stelle = { x: 0, z: 0 }
  const ausWeg: Stelle = { x: 0, z: 0 }

  /** Lage des Fahrzeugs e an bewegt() melden und merken (E87), wenn sie
   *  neu ist (E87b: dieselbe wie gemerkt, lageGleich, nicht noch einmal).
   *  Nur mit bekannter Ebene. */
  function fahrzeugLageMelden(e: FzEintrag) {
    if (e.ebene < 0) return
    const z = e.zust
    const l: DingLage3D = { id: e.f.id, art: 'fahrzeug', x: z.x, y: z.y, z: z.z, gier: winkelDiff(z.gier, 0), ebene: e.ebeneId }
    const alt = lagenMerk.get(l.id)
    if (alt && lageGleich(alt, l)) return
    lagenMerk.set(l.id, l)
    bewegtFn?.({ ...l })
  }

  /** Das Fahren endet (E87). stelle: wo man steht (null: am Wagen, aus
   *  allem heraus). melden: bewegt() mit der Lage des Fahrzeugs (E87b: nur
   *  wenn sie neu ist, fahrzeugLageMelden). */
  function fahrtEnde(stelleAus: Stelle | null, melden: boolean) {
    const ft = fahrt
    if (!ft) return
    const e = ft.e
    const z = e.zust
    fahrt = null
    z.v = 0
    bremse = false
    wackeln.staerke = 0
    camera.fov = FOV_GEHEN
    camera.updateProjectionMatrix()
    ichGruppe.visible = gehen
    const blick = winkelDiff(z.gier + gier, 0)
    // Die Ebene des Fahrzeugs ueber ihre Kennung (E87b: nach einer neuen
    // Welt kann der alte Index eine andere Ebene sein).
    const ei = e.ebene >= 0 && ebenen.gibt(e.ebene) && ebenen.liste[e.ebene].id === e.ebeneId ? e.ebene : ebeneIndexVon(e.ebeneId)
    if (ei >= 0) ebenen.wechseln(ei)
    bodenY = ebenen.boden()
    uebergang.an = false
    treppeJetzt = -1
    treppeMerk = null
    const p = camera.position
    fzAlt = true
    if (stelleAus) {
      p.x = stelleAus.x
      p.z = stelleAus.z
    } else {
      stelle.x = z.x
      stelle.z = z.z
      ebenen.aktiv.herausdruecken(stelle, KOERPER_RADIUS_M, 0, fzZusatz())
      p.x = stelle.x
      p.z = stelle.z
    }
    stehenAufBoden()
    stehX = p.x
    stehZ = p.z
    gier = blick
    gierZiel = blick
    neigung = 0
    neigungZiel = 0
    vx = 0
    vz = 0
    camera.rotation.set(neigung, gier, 0, 'YXZ')
    if (melden) fahrzeugLageMelden(e)
    const jetzt = performance.now()
    fahrzeugMelden(jetzt, true)
    poseMelden(jetzt, true)
    moeglichPruefen(false)
    anstossen()
  }

  /** fahrzeug() melden: beim Ein- und Aussteigen, Sicht und Blaulicht
   *  (erzwingen), sonst hoechstens alle FAHRZEUG_MELDEN_MS ein neues Tempo. */
  function fahrzeugMelden(jetzt: number, erzwingen: boolean) {
    if (!fahrzeugFn) return
    const ft = fahrt
    if (!ft) {
      if (erzwingen || fzGemeldet.an) {
        fzGemeldet.an = false
        fahrzeugFn(null)
      }
      return
    }
    const kmh = Math.round(tempoKmh(ft.e.zust))
    if (!erzwingen && (jetzt - fzGemeldet.zeit < FAHRZEUG_MELDEN_MS || kmh === fzGemeldet.kmh)) return
    fzGemeldet.an = true
    fzGemeldet.zeit = jetzt
    fzGemeldet.kmh = kmh
    fahrzeugFn({ id: ft.e.f.id, art: ft.e.f.art, kmh, sicht: ft.sicht, blaulicht: ft.e.blau })
  }

  /** Kamera beim Fahren: vom Fahrersitz (mit Umschauen) oder hinter dem
   *  Wagen (verfolgen, mit Umschauen um ihn herum). true, solange sie
   *  sich noch bewegt (die Kamera hinten gleitet nach). */
  function fahrKamera(dt: number, zeit: number): boolean {
    const ft = fahrt
    if (!ft) return false
    const e = ft.e
    const z = e.zust
    const p = camera.position
    const ax = p.x
    const ay = p.y
    const az = p.z
    if (ft.sicht === 'innen') {
      fahrerSicht(z, e.f.fahrerAuge, fahrSichtJetzt)
      p.set(fahrSichtJetzt.x, fahrSichtJetzt.y, fahrSichtJetzt.z)
      camera.rotation.set(fahrSichtJetzt.neigung + neigung, fahrSichtJetzt.gier + gier, fahrSichtJetzt.kippen, 'YXZ')
    } else {
      // Umschauen dreht die Kamera um den Wagen: verfolgen mit gedrehter Richtung.
      Object.assign(umZust, z)
      umZust.gier = z.gier + gier
      fzBodenEbene = e.ebene
      const raster = e.ebene >= 0 ? ebenen.rasterVon(e.ebene) : null
      verfolgen(ft.kam, umZust, e.werte, dt, raster, e.ebene >= 0 ? fzBoden : null)
      p.set(ft.kam.x, ft.kam.y, ft.kam.z)
      camera.rotation.set(Math.max(-1.2, Math.min(1.2, ft.kam.neigung + neigung * 0.5)), ft.kam.gier, 0, 'YXZ')
    }
    // Aufprall: kurz wackeln (nicht bei wenig Bewegung).
    const t = (zeit - wackeln.start) / 1000
    if (wackeln.staerke > 0 && t >= 0 && t < WACKELN_S) {
      const a = wackeln.staerke * (1 - t / WACKELN_S)
      p.y += Math.sin(t * 70) * a
      p.x += Math.sin(t * 53 + 1) * a * 0.6
    }
    return Math.abs(p.x - ax) > 1e-4 || Math.abs(p.y - ay) > 1e-4 || Math.abs(p.z - az) > 1e-4
  }

  /** Ein Bild Fahren (statt gehSchritt): Eingabe, fahrSchritt gegen das
   *  Raster der Ebene und die anderen Fahrzeuge, Modell, Kamera, Meldungen.
   *  true, solange sich etwas tut. */
  function fahrBild(dt: number, zeit: number, echt: boolean): boolean {
    const ft = fahrt
    if (!ft) return false
    const e = ft.e
    const z = e.zust
    let gas = 0
    let lenk = 0
    if (eingabeAn) {
      gas = Math.max(-1, Math.min(1, (halten.has('vor') ? 1 : 0) - (halten.has('zurueck') ? 1 : 0) + stick.y))
      lenk = Math.max(-1, Math.min(1, (halten.has('rechts') ? 1 : 0) - (halten.has('links') ? 1 : 0) + stick.x))
      if (Math.abs(gas) < 0.05) gas = 0
      if (Math.abs(lenk) < 0.05) lenk = 0
    }
    fahrEin.gas = gas
    fahrEin.lenk = lenk
    fahrEin.bremse = eingabeAn && bremse
    const vorV = z.v
    const vorLenk = z.lenk
    fzRasterAktuell(e)
    fzBodenEbene = e.ebene
    const raster = e.ebene >= 0 ? ebenen.rasterVon(e.ebene) : null
    fahrSchritt(z, fahrEin, e.werte, dt, raster, e.ebene >= 0 ? fzBoden : null, fahrErg, fzRaster.groesse > 0 ? fzRaster : null)
    fzAnwenden(e)
    if (fahrErg.stoss > 0 && !wenigBewegung()) {
      wackeln.start = zeit
      wackeln.staerke = Math.min(0.06, fahrErg.stoss * 0.006)
    }
    // Umschauen: weich; faehrt der Wagen und zieht niemand, zurueck nach vorne.
    if (Math.abs(z.v) > 1 && !schauen) {
      const k = Math.exp(-dt / FAHR_BLICK_ZURUECK_S)
      gierZiel = winkelDiff(gierZiel, 0) * k
      neigungZiel *= k
    }
    const kb = 1 - Math.exp(-dt / BLICK_S)
    const dg = gierZiel - gier
    const dn = neigungZiel - neigung
    let schaut = false
    if (Math.abs(dg) > 1e-4 || Math.abs(dn) > 1e-4) {
      gier += dg * kb
      neigung += dn * kb
      schaut = true
    } else {
      gier = gierZiel
      neigung = neigungZiel
    }
    const kamera = fahrKamera(dt, zeit)
    fahrzeugMelden(zeit, false)
    poseMelden(zeit, false)
    if (echt) tempoMessen(dt)
    const wackelt = wackeln.staerke > 0 && zeit - wackeln.start < WACKELN_S * 1000
    return z.v !== 0 || vorV !== 0 || z.lenk !== vorLenk || gas !== 0 || lenk !== 0 || fahrEin.bremse || schaut || kamera || wackelt
  }

  /** Sicht beim Fahren wechseln (Taste V). */
  function fahrSichtSetzen(s: 'innen' | 'hinten') {
    if (s !== 'innen' && s !== 'hinten') return
    fahrSichtWahl = s
    const ft = fahrt
    if (!ft || ft.sicht === s) return
    ft.sicht = s
    ft.kam.an = false
    camera.fov = s === 'innen' ? FAHR_FOV_INNEN : FOV_GEHEN
    camera.updateProjectionMatrix()
    fahrKamera(0, performance.now())
    fahrzeugMelden(performance.now(), true)
    anstossen()
  }

  /** Blaulicht an oder aus (Taste B), wenn das Fahrzeug eins hat. */
  function blaulichtSetzen(an: boolean) {
    const ft = fahrt
    if (!ft || typeof ft.e.f.blaulicht !== 'function') return
    const soll = !!an
    if (ft.e.blau === soll) return
    ft.e.f.blaulicht(soll)
    ft.e.blau = soll
    fahrzeugMelden(performance.now(), true)
    anstossen()
  }

  /** Fremd gelenktes Fahrzeug (E87): weich zur gemeldeten Lage, Raeder
   *  drehen mit, auf den Boden seiner Ebene. true, solange es sich bewegt. */
  function fernSchritt(e: FzEintrag, k: number, jetzt: number): boolean {
    const z = e.zust
    const f = e.fern
    const ox = z.x
    const oz = z.z
    const og = z.gier
    z.x += (f.x - z.x) * k
    z.z += (f.z - z.z) * k
    const dg = winkelDiff(f.gier, z.gier)
    z.gier = winkelDiff(z.gier + dg * k, 0)
    const weg = (z.x - ox) * -Math.sin(z.gier) + (z.z - oz) * -Math.cos(z.gier)
    z.radWinkel = radDrehen(z.radWinkel, weg, e.werte.radR)
    // Lenkung grob aus der Drehung je Weg (Einspurmodell, fahren.ts).
    if (Math.abs(weg) > 1e-3) {
      const ziel = Math.atan((-winkelDiff(z.gier, og) * e.werte.radstand) / weg)
      z.lenk += (Math.max(-e.werte.lenkMax, Math.min(e.werte.lenkMax, ziel)) - z.lenk) * 0.3
    } else z.lenk *= 0.9
    if (e.ebene >= 0 && ebenen.gibt(e.ebene)) fzAufBoden(e)
    else z.y += (f.y - z.y) * k
    fzAnwenden(e)
    // Das Raster der Fahrzeuge folgt, hoechstens alle FAHRZEUG_RASTER_MS.
    if ((Math.abs(z.x - e.rx) > 0.05 || Math.abs(z.z - e.rz) > 0.05 || Math.abs(winkelDiff(z.gier, e.rg)) > 0.02) && jetzt - fzRasterZeit > FAHRZEUG_RASTER_MS) fzAlt = true
    return Math.abs(f.x - z.x) > 0.002 || Math.abs(f.z - z.z) > 0.002 || Math.abs(dg) > 0.001 || Math.abs(weg) > 1e-4
  }

  /** Das Fahrzeug, das m lenkt, wenn es hier eins ist (E87b) und man nicht
   *  selbst darin sitzt; sonst null. Nur dann ist die Figur nicht zu sehen:
   *  lenkt jemand ein Fahrzeug, das es hier (noch) nicht gibt (Stadt nicht
   *  geladen, anderer Stand), sitzt die Figur an ihrer Stellung. */
  function personFz(m: Person): FzEintrag | null {
    if (!m.fahrzeug) return null
    const e = fzNachId.get(m.fahrzeug)
    return e && !(fahrt && fahrt.e === e) ? e : null
  }

  /** e faehrt mit m (E87): Ziel ist die zuletzt gemeldete Lage (m.lenkt).
   *  Erst jetzt gelenkt, von jemand anderem uebernommen oder weit weg:
   *  gleich dort. */
  function fernFolgen(m: Person, e: FzEintrag) {
    const f = e.fern
    const l = m.lenkt
    const springt = !f.an || f.uid !== m.uid || Math.hypot(e.zust.x - l.x, e.zust.z - l.z) > 25
    f.an = true
    f.uid = m.uid
    f.x = l.x
    f.y = l.y
    f.z = l.z
    f.gier = l.gier
    if (springt) {
      e.zust.x = l.x
      e.zust.y = l.y
      e.zust.z = l.z
      e.zust.gier = winkelDiff(l.gier, 0)
      fzAufBoden(e)
      fzAnwenden(e)
      fzAlt = true
    }
  }

  /** Eine Person lenkt kein Fahrzeug mehr (lenkt null, oder sie ist weg):
   *  das Fahrzeug bleibt, wo es ist. */
  function fernAus(m: Person) {
    const id = m.fahrzeug
    m.fahrzeug = null
    if (!id) return
    const e = fzNachId.get(id)
    if (e && e.fern.uid === m.uid) {
      e.fern.an = false
      fzAlt = true
    }
  }

  /** lage() (E87): gespeichert oder von Mitspielern. Merken; gibt es die
   *  Kennung schon, gleich setzen (nicht das Fahrzeug, in dem man sitzt;
   *  ein Ding in der Hand ist danach nicht mehr in der Hand). E87b:
   *  dieselbe Lage noch einmal (Neubau der Welt) laesst ein Ding in der
   *  Hand und ein fremd gelenktes Fahrzeug, wie sie sind. Unbekannte
   *  Kennung: die Welt bauen lassen (dingErzeugen), wenn sie kann. */
  function lageSetzen(l: DingLage3D) {
    const gut =
      !!l &&
      typeof l.id === 'string' &&
      l.id.length > 0 &&
      (l.art === 'ding' || l.art === 'fahrzeug') &&
      Number.isFinite(l.x) &&
      Number.isFinite(l.y) &&
      Number.isFinite(l.z) &&
      Number.isFinite(l.gier)
    if (!gut) {
      console.warn('[3d] lage(): unbrauchbare Lage uebergangen', l)
      return
    }
    const ebene = typeof l.ebene === 'string' && l.ebene ? l.ebene : null
    const neu: DingLage3D = { id: l.id, art: l.art, x: l.x, y: l.y, z: l.z, gier: l.gier, ebene: ebene ?? '' }
    const alt = lagenMerk.get(l.id)
    const wieGemerkt = !!alt && lageGleich(alt, neu)
    lagenMerk.set(l.id, neu)
    if (l.art === 'fahrzeug') {
      const e = fzNachId.get(l.id)
      if (!e) {
        if (!weltDingNachId.has(l.id)) erzeugenVormerken(l.id)
        anstossen()
        return
      }
      if (fahrt && fahrt.e === e) return
      // E87b: lenkt es gerade jemand, glitte es sonst zur alten Stelle.
      if (wieGemerkt && e.fern.an) return
      const z = e.zust
      z.x = l.x
      z.y = l.y
      z.z = l.z
      z.gier = winkelDiff(l.gier, 0)
      z.v = 0
      if (ebene) {
        e.ebeneId = ebene
        e.ebene = ebeneIndexVon(ebene)
      }
      if (e.fern.an) {
        // Faehrt es gerade jemand: das Ziel ist dieselbe Lage.
        e.fern.x = l.x
        e.fern.y = l.y
        e.fern.z = l.z
        e.fern.gier = l.gier
      }
      fzAufBoden(e)
      fzAnwenden(e)
      fzAlt = true
    } else {
      const d = weltDingNachId.get(l.id)
      if (!d) {
        if (!fzNachId.has(l.id)) erzeugenVormerken(l.id)
        anstossen()
        return
      }
      if (halt.ding === d) {
        // E87b: dieselbe Lage wie gemerkt oder wie vor dem Aufheben (d.l*
        // bleibt beim Halten stehen): nichts Neues, es bleibt in der Hand.
        const vorher: DingLage3D = { id: d.id, art: 'ding', x: d.lx, y: d.ly, z: d.lz, gier: d.lg, ebene: d.ebeneId }
        if (wieGemerkt || lageGleich(vorher, neu)) return
        handLeeren()
      }
      weltDingSetzen(d, l.x, l.y, l.z, l.gier, ebene)
    }
    anstossen()
  }

  /* ------------------------------------------- Hinstellen (E87, hinstellen.ts) */

  /** Die Vorschau: wohin das Ding in der Hand kaeme (jedes Bild beim Halten). */
  const vorschau = { gueltig: false, ok: false, r: stellErgebnis() }
  const tippErg = stellErgebnis()
  const zielTreffer = strahlTreffer()
  const ebeneTreffer = strahlTreffer()
  const zielStrahl = new Raycaster()
  const ndcZiel = new Vector2()
  const normalMat = new Matrix3()
  const nHilf = new Vector3()
  const kastenHilf = new Vector3()
  /** Dinge der Welt in der Naehe (fuer Strahlen), ohne neues Feld je Bild. */
  const weltNahe: Object3D[] = []
  const fzObjekte: Object3D[] = []
  const treppeStelle: Stelle = { x: 0, z: 0 }
  /** Die Ebene, auf der man steht, fuer strahlZiel. */
  const strahlWelt: StrahlWelt = {
    raster: null,
    boden: (x, z) => ebenen.boden(ebenen.index) + ebenen.gelaende(ebenen.index, x, z),
    flaeche: (x, z, o) => {
      const i = treppen.unter(ebenen.index, x, z)
      if (i < 0) return false
      treppeStelle.x = x
      treppeStelle.z = z
      o.y = treppen.hoehe(i, treppeStelle, ebenen)
      o.stufig = treppen.liste[i].stufen > 0
      return true
    },
  }
  /** Zeigen: Maus oder Mitte (zeigePunkt). */
  const zeige: ZeigeEingabe = { touch: false, ziehen: false, maus: null, breite: 1, hoehe: 1 }
  const mausPunkt = { x: 0, y: 0 }
  try {
    zeige.touch = window.matchMedia('(pointer: coarse)').matches
  } catch {
    zeige.touch = false
  }
  /** Fuer hinstellenPruefen, je Bild neu gefuellt (ohne neue Objekte). */
  const stellDinge: StellDing[] = []
  const stellDingVorrat: StellDing[] = []
  const stellAndere: { x: number; z: number; boden: number }[] = []
  const stellAndereVorrat: { x: number; z: number; boden: number }[] = []
  const stellAnfrage: StellAnfrage = {
    treffer: null,
    ding: { breite: 0.3, tiefe: 0.3, hoehe: 0.3 },
    auge: camera.position,
    spieler: { x: 0, z: 0, boden: 0 },
    gier: 0,
    stufe: 0,
    andere: stellAndere,
  }
  const stellUmgebung: StellUmgebung = { raster: null, oben: null, boden: strahlWelt.boden, dinge: stellDinge }

  /** Dinge der Welt bis weit (Meter, waagrecht) um (x, z) in weltNahe. */
  function weltNaheSammeln(x: number, z: number, weit: number) {
    weltNahe.length = 0
    for (let i = 0; i < weltDingListe.length; i++) {
      const d = weltDingListe[i]
      if (!d.objekt) continue
      const r = weit + Math.max(d.breite, d.tiefe, d.hoehe)
      if (Math.abs(d.lx - x) <= r && Math.abs(d.lz - z) <= r) weltNahe.push(d.objekt)
    }
  }

  /** Normale des Treffers in der Welt (zur Kamera hin) nach nHilf. */
  function trefferNormale(hit: { face?: { normal: Vector3 } | null; object: Object3D }, richtung: Vector3) {
    if (!hit.face) {
      nHilf.set(0, 1, 0)
      return
    }
    normalMat.getNormalMatrix(hit.object.matrixWorld)
    nHilf.copy(hit.face.normal).applyMatrix3(normalMat).normalize()
    if (nHilf.dot(richtung) > 0) nHilf.negate()
  }

  function stellDing(): StellDing {
    const n = stellDinge.length
    let s = stellDingVorrat[n]
    if (!s) {
      s = { id: '', x: 0, y: 0, z: 0, gier: 0, breite: 0, tiefe: 0, hoehe: 0 }
      stellDingVorrat.push(s)
    }
    stellDinge.push(s)
    return s
  }

  /** Dinge, Fahrzeuge und Leute um die Stelle (x, z) fuer hinstellenPruefen. */
  function stellUmgebungFuellen(ohne: Ding, x: number, z: number) {
    stellDinge.length = 0
    const nah = 6
    // Dinge der Welt.
    for (let i = 0; i < weltDingListe.length; i++) {
      const d = weltDingListe[i]
      if (d === ohne || !d.objekt?.visible || Math.abs(d.lx - x) > nah || Math.abs(d.lz - z) > nah) continue
      const s = stellDing()
      s.id = d.id
      s.x = d.lx
      s.y = d.ly
      s.z = d.lz
      s.gier = d.lg
      s.breite = d.breite
      s.tiefe = d.tiefe
      s.hoehe = d.hoehe
    }
    // Dinge der Wohnung (Mitte aus der Lage oder der Beschreibung).
    for (const d of dinge.values()) {
      if (d === ohne) continue
      const l = dingLage.get(d.id)
      const cx = l ? l.x : d.cx
      const cz = l ? l.z : d.cz
      if (Math.abs(cx - x) > nah || Math.abs(cz - z) > nah) continue
      const s = stellDing()
      s.id = d.id
      s.x = cx
      s.y = (l ? l.y : d.cy) - d.hoehe / 2
      s.z = cz
      s.gier = l ? l.d : 0
      s.breite = d.breite
      s.tiefe = d.tiefe
      s.hoehe = d.hoehe
    }
    // Fahrzeuge (nicht im Strahl, aber hinein stellt man nichts).
    for (let i = 0; i < fzListe.length; i++) {
      const e = fzListe[i]
      const zu = e.zust
      if (Math.abs(zu.x - x) > nah + e.f.laenge || Math.abs(zu.z - z) > nah + e.f.laenge) continue
      const s = stellDing()
      s.id = e.f.id
      s.x = zu.x
      s.y = zu.y
      s.z = zu.z
      s.gier = zu.gier
      s.breite = e.f.breite
      s.tiefe = e.f.laenge
      s.hoehe = e.f.hoehe
    }
    // Andere Leute (wer ein Fahrzeug lenkt, das es hier gibt, sitzt darin).
    stellAndere.length = 0
    for (let i = 0; i < leuteListe.length; i++) {
      const m = leuteListe[i]
      if (!m.hat || personFz(m) || Math.abs(m.x - x) > nah || Math.abs(m.z - z) > nah) continue
      let a = stellAndereVorrat[stellAndere.length]
      if (!a) {
        a = { x: 0, z: 0, boden: 0 }
        stellAndereVorrat.push(a)
      }
      a.x = m.x
      a.z = m.z
      a.boden = m.y - KAMERA_AUGE[m.haltung]
      stellAndere.push(a)
    }
  }

  /** Worauf der Strahl durch die Bildstelle (nx, ny) zuerst trifft, bis
   *  weit Meter: die Wohnung (Teile, ohne Glas und das Ding in der Hand),
   *  Dinge der Welt in der Naehe und die Ebene (strahlZiel). Fahrzeuge und
   *  Figuren zaehlen nicht. true und der Treffer in out. */
  function zielTreffen(nx: number, ny: number, ohne: Ding | null, weit: number, out: StrahlTreffer): boolean {
    ndcZiel.set(nx, ny)
    zielStrahl.setFromCamera(ndcZiel, camera)
    zielStrahl.near = 0
    zielStrahl.far = weit
    const ray = zielStrahl.ray
    let best = weit
    let hat = false
    // Die Wohnung, nur wenn der Strahl ihren Kasten in Reichweite trifft.
    if (!wohnKasten.isEmpty() && ray.intersectBox(wohnKasten, kastenHilf) && kastenHilf.distanceTo(ray.origin) <= weit) {
      for (const hit of zielStrahl.intersectObjects(gruppe.children, false)) {
        const o = hit.object
        if (!o.visible) continue
        const u = daten(o)
        if (u.glas || (ohne && !ohne.objekt && u.ding === ohne.id)) continue
        const mat = (o as Mesh).material as MeshLambertMaterial | undefined
        if (mat && !Array.isArray(mat) && mat.opacity < 0.5) continue
        trefferNormale(hit, ray.direction)
        best = hit.distance
        hat = true
        out.x = hit.point.x
        out.y = hit.point.y
        out.z = hit.point.z
        out.nx = nHilf.x
        out.ny = nHilf.y
        out.nz = nHilf.z
        out.abstand = hit.distance
        out.ding = u.ding
        out.art = u.ding ? 'ding' : u.rolle === 'boden' ? 'boden' : nHilf.y > 0.7 ? 'oben' : 'wand'
        break
      }
    }
    // Dinge der Welt.
    weltNaheSammeln(ray.origin.x, ray.origin.z, weit)
    if (weltNahe.length) {
      for (const hit of zielStrahl.intersectObjects(weltNahe, true)) {
        if (hit.distance >= best) break
        if (!sichtbar(hit.object)) continue
        const d = dingVon(hit.object)
        // Nicht auf ein Ding eines anderen Geschosses (E87b): die Decke
        // dazwischen kennt die Ebene nicht.
        if (!d || d === ohne || !dingErreichbar(d)) continue
        trefferNormale(hit, ray.direction)
        best = hit.distance
        hat = true
        out.x = hit.point.x
        out.y = hit.point.y
        out.z = hit.point.z
        out.nx = nHilf.x
        out.ny = nHilf.y
        out.nz = nHilf.z
        out.abstand = hit.distance
        out.ding = d.id
        out.art = 'ding'
        break
      }
    }
    // Die Ebene: Boden, Gelaende, Moebel, Mauern, Waende, Treppen.
    strahlWelt.raster = ebenen.aktiv
    const o = ray.origin
    const r = ray.direction
    if (strahlZiel(o.x, o.y, o.z, r.x, r.y, r.z, best, strahlWelt, ebeneTreffer) && ebeneTreffer.abstand < best) {
      Object.assign(out, ebeneTreffer)
      hat = true
    }
    return hat
  }

  /** Wohin das Ding d kaeme, wenn man durch die Bildstelle (nx, ny) zeigt:
   *  hinstellenPruefen nach r. true, wenn der Strahl in Reichweite etwas
   *  trifft (dann gilt r, auch wenn es nicht passt), sonst false (zu weit
   *  oder ins Leere: das Ding bleibt in der Hand). */
  function stellenRechnen(nx: number, ny: number, d: Ding, r: StellErgebnis): boolean {
    const hat = zielTreffen(nx, ny, d, REICHWEITE_M + 1.5, zielTreffer)
    const a = stellAnfrage
    a.treffer = hat ? zielTreffer : null
    a.ding.breite = d.breite
    a.ding.tiefe = d.tiefe
    a.ding.hoehe = d.hoehe
    a.auge = camera.position
    a.spieler.x = camera.position.x
    a.spieler.z = camera.position.z
    a.spieler.boden = fussJetzt()
    a.gier = gier
    a.stufe = halt.stufe
    stellUmgebungFuellen(d, hat ? zielTreffer.x : camera.position.x, hat ? zielTreffer.z : camera.position.z)
    const ra = ebenen.aktiv
    stellUmgebung.raster = ra
    stellUmgebung.oben = ra.ob
    hinstellenPruefen(a, stellUmgebung, r)
    return hat && r.grund !== 'zu_weit'
  }

  /** Vorschau fuer dieses Bild (nach dem Gehen, vor dem Zeichnen): das Ding
   *  in der Hand halb durchsichtig dort, wohin man zeigt, gruen oder rot;
   *  zeigt man zu weit, bleibt es in der Hand. */
  function vorschauSchritt() {
    const d = halt.ding
    if (!d || halt.laeuft || !gehen || fahrt || sprung.an) {
      if (geist.ding) geistAus()
      vorschau.gueltig = false
      vorschau.ok = false
      return
    }
    zeige.ziehen = schauen !== null
    zeige.breite = leinwand.b
    zeige.hoehe = leinwand.h
    zeigePunkt(zeige, ndcZiel)
    const ziel = stellenRechnen(ndcZiel.x, ndcZiel.y, d, vorschau.r)
    vorschau.gueltig = ziel
    vorschau.ok = ziel && vorschau.r.ok
    if (!ziel) {
      // In der Hand (haltSchritt hat es in diesem Bild dorthin gesetzt).
      if (geist.ding) {
        geistAus()
        dingAnwenden(d, halt.x, halt.y, halt.z, halt.d)
      }
      return
    }
    geistAn(d, vorschau.r.ok)
    dingAnwenden(d, vorschau.r.x, vorschau.r.y + d.hoehe / 2, vorschau.r.z, vorschau.r.gier)
  }

  /** Hinstellen (E87): durch die Bildstelle (nx, ny) oder, ohne, dorthin,
   *  wohin man zeigt. Passt es nicht: nichts (false). Ins Leere oder zu
   *  weit bei einem Tipp (ablegenSonst): wie bisher unter der Hand ablegen. */
  function hinstellenBei(nx: number | null, ny: number | null, ablegenSonst: boolean): boolean {
    const d = halt.ding
    if (!d || !gehen || fahrt) return false
    if (halt.laeuft) {
      halt.laeuft = false
      haltSchritt(performance.now())
    }
    if (nx === null || ny === null) {
      zeige.ziehen = schauen !== null
      zeige.breite = leinwand.b
      zeige.hoehe = leinwand.h
      zeigePunkt(zeige, ndcZiel)
      nx = ndcZiel.x
      ny = ndcZiel.y
    }
    const ziel = stellenRechnen(nx, ny, d, tippErg)
    if (!ziel) {
      if (ablegenSonst) ablegen()
      return false
    }
    if (!tippErg.ok) {
      anstossen()
      return false
    }
    dingHinstellen(d, tippErg.x, tippErg.y, tippErg.z, tippErg.gier)
    return true
  }

  /** Ding in der Hand eine Stufe (45 Grad) weiterdrehen. */
  function drehen(richtung: number) {
    if (!halt.ding || fahrt || !gehen) return
    const r = richtung < 0 ? -1 : 1
    halt.stufe = stufeDrehen(halt.stufe, r)
    halt.relD += r * DREH_STUFE_RAD
    anstossen()
  }

  /** Mausrad mit einem Ding in der Hand: dreht es, eine Stufe je Raste
   *  (Touchpads liefern viele kleine Schritte: gesammelt, hoechstens eine
   *  Stufe je 90 ms). */
  let radSumme = 0
  let radLetzt = 0
  let radZeit = 0
  function radDrehung(e: WheelEvent) {
    if (!gehen || fahrt || !halt.ding || !eingabeAn) return
    e.preventDefault()
    const jetzt = performance.now()
    if (jetzt - radLetzt > 400) radSumme = 0
    radLetzt = jetzt
    radSumme += e.deltaMode === 1 ? e.deltaY * 33 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY
    if (Math.abs(radSumme) >= 50 && jetzt - radZeit >= 90) {
      drehen(radSumme > 0 ? 1 : -1)
      radSumme = 0
      radZeit = jetzt
    }
  }

  /* Die Vorschau zeigt das Ding selbst halb durchsichtig (Materialien
   * getauscht, Kanten aus) und gibt alles zurueck, wenn sie endet. */
  const geist = { ding: null as Ding | null, ok: false, mats: new Map<Mesh, Material | Material[]>(), linien: [] as Object3D[] }
  let geistMatOk: MeshLambertMaterial | null = null
  let geistMatNein: MeshLambertMaterial | null = null
  function geistMaterial(ok: boolean): MeshLambertMaterial {
    if (ok) {
      geistMatOk ??= new MeshLambertMaterial({ color: 0x5fae7e, emissive: 0x1f4a32, transparent: true, opacity: 0.55, depthWrite: false })
      return geistMatOk
    }
    geistMatNein ??= new MeshLambertMaterial({ color: 0xd2644f, emissive: 0x4a1d14, transparent: true, opacity: 0.5, depthWrite: false })
    return geistMatNein
  }
  function geistAn(d: Ding, ok: boolean) {
    if (geist.ding !== d) {
      geistAus()
      geist.ding = d
      const sammeln = (o: Object3D) => {
        if ((o as Mesh).isMesh) geist.mats.set(o as Mesh, (o as Mesh).material)
        else if ((o as LineSegments).isLineSegments && o.visible) {
          geist.linien.push(o)
          o.visible = false
        }
      }
      if (d.objekt) d.objekt.traverse(sammeln)
      else for (const t of d.teile) t.mesh.traverse(sammeln)
      geist.ok = !ok
    }
    if (geist.ok === ok) return
    geist.ok = ok
    const m = geistMaterial(ok)
    for (const mesh of geist.mats.keys()) mesh.material = m
  }
  function geistAus() {
    if (!geist.ding) return
    for (const [mesh, m] of geist.mats) mesh.material = m
    for (const l of geist.linien) l.visible = true
    geist.mats.clear()
    geist.linien.length = 0
    geist.ding = null
  }

  /** Das Fahrzeug unter dem Strahl (strahl ist gesetzt), nicht verdeckt. */
  function fahrzeugUnterStrahl(): FzEintrag | null {
    fzObjekte.length = 0
    for (let i = 0; i < fzListe.length; i++) if (fzListe[i].f.gruppe.visible) fzObjekte.push(fzListe[i].f.gruppe)
    if (!fzObjekte.length) return null
    for (const hit of strahl.intersectObjects(fzObjekte, true)) {
      if (!sichtbar(hit.object)) continue
      const e = fzVon(hit.object)
      if (!e) continue
      if (wohnungDavor(hit.distance) || weltDavor(hit.distance)) return null
      return e
    }
    return null
  }

  /** Das Ding der Welt unter dem Strahl (strahl ist gesetzt), nicht
   *  verdeckt, hoechstens AUFHEBEN_M weit und (E87b) im eigenen Geschoss
   *  (dingErreichbar): durch eine Decke greift man nicht. */
  function weltDingUnterStrahl(): Ding | null {
    weltNaheSammeln(strahl.ray.origin.x, strahl.ray.origin.z, AUFHEBEN_M)
    if (!weltNahe.length) return null
    for (const hit of strahl.intersectObjects(weltNahe, true)) {
      if (hit.distance > AUFHEBEN_M) return null
      if (!sichtbar(hit.object)) continue
      const d = dingVon(hit.object)
      if (!d || !dingErreichbar(d)) continue
      if (wohnungDavor(hit.distance) || weltDavor(hit.distance)) return null
      return d
    }
    return null
  }

  /** Boeden der Ebenen, auf denen man steht, an der Stelle eines Dings
   *  (fuer dingGreifbar), ohne neues Feld je Aufruf. */
  const greifBoeden: number[] = []
  /** Steht ein Ding der Welt im eigenen Geschoss (E87b, Regeln in
   *  hinstellen.ts, dingGreifbar)? Verglichen wird an seiner Stelle: seine
   *  Unterkante und der Boden seiner Ebene mit dem Boden der Ebene, auf der
   *  man steht (auf einer Treppe auch dem am anderen Ende). Ohne Ebenen
   *  (die Wohnung allein) zaehlt ihr Boden bei 0. */
  function dingErreichbar(d: Ding): boolean {
    const j = d.ebeneId ? ebeneIndexVon(d.ebeneId) : -1
    const dingBoden = j >= 0 ? ebenen.boden(j) + ebenen.gelaende(j, d.lx, d.lz) : null
    greifBoeden.length = 0
    const i = ebenen.index
    greifBoeden.push(ebenen.boden(i) + ebenen.gelaende(i, d.lx, d.lz))
    const t = treppeJetzt
    if (t >= 0 && t < treppen.liste.length) {
      const von = treppen.von[t]
      const nach = treppen.nach[t]
      if (von !== i && ebenen.gibt(von)) greifBoeden.push(ebenen.boden(von) + ebenen.gelaende(von, d.lx, d.lz))
      if (nach !== i && ebenen.gibt(nach)) greifBoeden.push(ebenen.boden(nach) + ebenen.gelaende(nach, d.lx, d.lz))
    }
    return dingGreifbar(d.ly, dingBoden, greifBoeden)
  }

  /** Steht auf der Ebene etwas (Wand, Mauer, Boden) naeher als abstand im
   *  Strahl (strahl ist gesetzt)? Gerechnet wie beim Zielen (strahlZiel). */
  function weltDavor(abstand: number): boolean {
    if (!(abstand > 0.15)) return false
    strahlWelt.raster = ebenen.aktiv
    const o = strahl.ray.origin
    const r = strahl.ray.direction
    return strahlZiel(o.x, o.y, o.z, r.x, r.y, r.z, abstand - 0.1, strahlWelt, ebeneTreffer)
  }

  /** Mit welt() oder nach einer neuen version(): Listen der Welt lesen und
   *  pruefen, was man haelt und worin man sitzt. endgueltig: ohne Wechsel
   *  der Welt unterwegs (dann ist Verschwundenes wirklich weg). */
  function teilePruefen(endgueltig: boolean) {
    haltPruefen(endgueltig)
    fahrtPruefen(endgueltig)
  }

  /* ------------------------------------------- Welt, Ebenen, Aufzug (E83) */

  /** Die Welt aus welt(); gehoert dem Aufrufer. */
  let weltJetzt: Welt3D | null = null
  /** schritt() der Welt hat zuletzt true gegeben (oder ein Tipp hat sie
   *  eben geweckt): die Schleife ruft sie weiter, auch ohne Begehen. */
  let weltLaeuft = false
  /** schritt() oder fahrt() hat einen Fehler geworfen: beide ruhen. */
  let weltKaputt = false
  /** Boden unter den Fuessen beim Begehen (Meter, Welt): der der aktiven
   *  Ebene, waehrend eines Wechsels oder einer Fahrt dazwischen. */
  let bodenY = 0
  /** Weiches Gleiten der Hoehe zu einer neuen Ebene. */
  const uebergang = { an: false, start: 0, von: 0, nach: 0 }
  /** Mitfahren im Aufzug (Regeln in kollision.ts). */
  const aufzug = new Mitfahrt()
  /** Ziel der laufenden Fahrt, zuletzt von fahrt() gemeldet (E84); -1 ohne. */
  let fahrtZiel = -1
  let ebeneFn: ((e: EbeneJetzt | null) => void) | null = null
  /** Zuletzt gemeldete Ebene (Index, Kennung, Name), '' noch keine. */
  let ebeneZuletzt = ''
  /** Die Welt ging beim Begehen weg (welt(null)): wo man stand (E84). Kommt
   *  vor dem naechsten Bild eine neue Welt (Raum3D baut sie bei jedem
   *  Farbschema neu), steht man dort auf derselben Ebene; sonst geht es im
   *  naechsten Bild auf die Wohnung allein hinunter. */
  let weltMerk: EbeneMerk | null = null
  /** E87b: nach einer neuen Welt gibt es die Ebene, auf der man stand,
   *  (noch) nicht: worauf und bis wann gewartet wird (ebeneWartenAb), sonst
   *  null. Solange ruht das Gehen (wartenBild). */
  let ebeneWarten: EbeneWarten | null = null

  /** Fehler in schritt(), fahrt() oder kamera() der Welt: einmal in die
   *  Konsole, danach ruhen alle drei fuer diese Welt, damit Wohnung und
   *  Gehen weiterlaufen. */
  function weltFehler(was: string, err: unknown) {
    console.error(`[3d] Welt.${was}:`, err)
    weltKaputt = true
    weltLaeuft = false
  }

  /** schritt() der Welt fuer dieses Bild: beim Begehen immer, sonst nur,
   *  solange sie zuletzt true gab. true, solange sich dort etwas bewegt. */
  function weltSchritt(dt: number): boolean {
    const w = weltJetzt
    if (!w || weltKaputt || typeof w.schritt !== 'function' || !(gehen || weltLaeuft)) {
      weltLaeuft = false
      return false
    }
    try {
      weltLaeuft = w.schritt(dt, camera.position.y) === true
    } catch (err) {
      weltFehler('schritt', err)
    }
    return weltLaeuft
  }

  /** Lage der Kabine, solange der Aufzug der Welt faehrt, sonst null. */
  function fahrtLesen(): Fahrt3D | null {
    const w = weltJetzt as WeltMitFahrt | null
    if (!w || weltKaputt || typeof w.fahrt !== 'function') return null
    try {
      const f = w.fahrt()
      return f && Number.isFinite(f.y) ? f : null
    } catch (err) {
      weltFehler('fahrt', err)
      return null
    }
  }

  /** Die Stelle der Kamera an kamera() der Welt (E84), wenn sie eine hat:
   *  beim Begehen die Augen, sonst die Rundumsicht. */
  function weltKamera() {
    const w = weltJetzt as WeltMitFahrt | null
    if (!w || weltKaputt || typeof w.kamera !== 'function') return
    const p = camera.position
    try {
      w.kamera(p.x, p.y, p.z)
    } catch (err) {
      weltFehler('kamera', err)
    }
  }

  /** version() der Welt lesen (E87); ohne Methode null. Wirft sie, ruht
   *  die Welt wie bei schritt() (weltFehler). */
  function versionLesen(w: Welt3D | null): number | null {
    if (!w || weltKaputt || typeof w.version !== 'function') return null
    try {
      return w.version()
    } catch (err) {
      weltFehler('version', err)
      return null
    }
  }

  /** Treppen, Fahrzeuge und Dinge der Welt lesen (E87); Fahrzeuge und
   *  Dinge uebernimmt der Motor (siehe welt()). */
  function weltTeileLesen(w: Welt3D | null) {
    treppen.setzen(w ? w.treppen : null, ebenen)
    if (treppen.verworfen) console.warn(`[3d] Welt: ${treppen.verworfen} Treppen mit ungueltigen Angaben uebergangen`)
    const fz = w && Array.isArray(w.fahrzeuge) ? w.fahrzeuge : []
    const di = w && Array.isArray(w.dinge) ? w.dinge : []
    teileAbgleichen(fz, di)
    // E87b: gemerkte Lagen, deren Kennung jetzt fehlt, an dingErzeugen.
    erzeugenAlleVormerken()
  }

  /* ------------------------------- Dinge einzeln bauen lassen (E87b) */

  /** Kann die Welt Dinge einzeln bauen (dingErzeugen), und laeuft sie? */
  function erzeugenGeht(): boolean {
    const w = weltJetzt
    return !!w && !weltKaputt && typeof w.dingErzeugen === 'function'
  }

  /** Fehlt die Kennung in der Welt (weder Ding noch Fahrzeug), und ist eine
   *  Lage dafuer gemerkt? */
  const dingFehlt = (id: string): boolean => !weltDingNachId.has(id) && !fzNachId.has(id) && lagenMerk.has(id)

  /** Kennung id vormerken, wenn sie fehlt (dingFehlt) und die Welt Dinge
   *  einzeln bauen kann; je Welt hoechstens einmal (ErzeugenListe). */
  function erzeugenVormerken(id: string) {
    if (erzeugenGeht() && dingFehlt(id)) erzeugen.vormerken(id)
  }

  /** Alle gemerkten Lagen pruefen (neue Welt, neue version()). */
  function erzeugenAlleVormerken() {
    if (!erzeugenGeht()) return
    for (const id of lagenMerk.keys()) if (dingFehlt(id)) erzeugen.vormerken(id)
  }

  /** dingErzeugen der Welt fuer eine Kennung; true, wenn sie etwas gebaut
   *  hat. Wirft sie, steht das in der Konsole (die naechste kommt dran). */
  const erzeugenFrag = (id: string): boolean => {
    const w = weltJetzt
    if (!w || typeof w.dingErzeugen !== 'function') return false
    try {
      return w.dingErzeugen(id) != null
    } catch (err) {
      console.error(`[3d] Welt.dingErzeugen(${id}):`, err)
      return false
    }
  }

  /** Ein Bild: die Welt fuer vorgemerkte Kennungen fragen, hoechstens
   *  ERZEUGEN_JE_BILD gebaute und ERZEUGEN_FRAGEN_JE_BILD Fragen. Was sie
   *  baut, steht danach in dinge (version() zaehlt hoch): weltVersionPruefen
   *  nimmt es, dingNehmen setzt die gemerkte Lage. Steht etwas Gebautes
   *  danach nicht in dinge, einmal eine Warnung. true, solange noch welche
   *  warten (die Schleife laeuft weiter). */
  function erzeugenSchritt(): boolean {
    if (!erzeugen.laenge) return false
    if (!erzeugenGeht()) {
      erzeugen.neu()
      return false
    }
    const gefragt = erzeugen.schritt(dingFehlt, erzeugenFrag, ERZEUGEN_JE_BILD, ERZEUGEN_FRAGEN_JE_BILD, erzeugtJetzt)
    if (gefragt > 0) {
      weltVersionPruefen()
      for (const id of erzeugtJetzt) {
        if (weltDingNachId.has(id) || fzNachId.has(id) || erzeugtFehlt.has(id)) continue
        erzeugtFehlt.add(id)
        console.warn(`[3d] Welt.dingErzeugen(${id}): gebaut, steht aber nicht in dinge (version() nicht hochgezaehlt?)`)
      }
    }
    return erzeugen.laenge > 0
  }

  /** Auf Treppe mit Kennung id bleiben (E87), wenn es sie noch gibt, man
   *  auf ihr steht und eine ihrer Ebenen die aktive (i) ist. */
  function treppeWiederfinden(id: string | null, i: number): number {
    if (id === null || !gehen || haltungJetzt !== 'stehen') return -1
    const t = treppen.index(id)
    if (t < 0 || !treppen.drauf(t, camera.position)) return -1
    return treppen.von[t] === i || treppen.nach[t] === i ? t : -1
  }

  /** Beim Begehen in jedem Bild (und vor springen, ebeneWechseln, begehen):
   *  hat die Welt neue Daten (version() anders), alles neu lesen. Ebenen
   *  kommen nur hinten dazu; neu gerastert wird nur, wo die Hindernisse
   *  neu sind. Man bleibt auf der Ebene mit derselben Kennung, an derselben
   *  Stelle, auf einer Treppe, wenn es sie noch gibt. */
  function weltVersionPruefen() {
    const w = weltJetzt
    if (!w || weltKaputt || typeof w.version !== 'function') return
    const v = versionLesen(w)
    if (v === null || Object.is(v, weltVersion)) return
    weltVersion = v
    const merk = ebeneMerken()
    const treppeId = treppeJetzt >= 0 ? treppen.liste[treppeJetzt].id : null
    const neu = ebenen.aktualisieren(Array.isArray(w.ebenen) ? w.ebenen : [])
    if (ebenen.verworfen) console.warn(`[3d] Welt: ${ebenen.verworfen} Hindernisse mit ungueltigen Zahlen uebergangen`)
    weltTeileLesen(w)
    // Was man haelt oder worin man sitzt, ist entweder noch da oder entladen.
    teilePruefen(true)
    treppeJetzt = -1
    if (!gehen) return
    if (fahrt) {
      // Im Fahrzeug (E87): auf seiner Ebene bleiben, die Kamera fuehrt es.
      const fi = fahrt.e.ebene
      if (fi >= 0 && ebenen.gibt(fi)) ebenen.wechseln(fi)
      else ebenen.wechseln(ebeneWiederfinden(ebenen, merk))
      bodenY = ebenen.boden()
      ebeneMelden(false)
      anstossen()
      return
    }
    if (ebeneWarten) {
      // E87b: wartet man auf eine Ebene, ist sie vielleicht jetzt da; sonst
      // bleibt man stehen (die aktive ist nur die naechste nach der Hoehe,
      // ohne dass sie einen schiebt).
      wartenPruefen()
      if (ebeneWarten) ebenen.wechseln(ebeneWiederfinden(ebenen, merk))
      ebeneMelden(false)
      anstossen()
      return
    }
    const i = ebeneWiederfinden(ebenen, merk)
    treppeJetzt = treppeWiederfinden(treppeId, i)
    // Neue Hindernisse koennen dort stehen, wo man steht: heraus (ausser auf der Treppe).
    if (i !== ebenen.index || neu !== 0) ebeneAktivieren(i, fussUeberAuf(i))
    if (!(aufzug.an && aufzug.mit)) hoeheGleiten()
    ebeneMelden(false)
    anstossen()
  }

  /** Wo man gerade steht, fuer ebeneWiederfinden (E84). Beim Gleiten zaehlt
   *  der Boden des Ziels. */
  function ebeneMerken(): EbeneMerk {
    const i = ebenen.index
    // E87b: wartet man auf eine Ebene, zaehlt sie (auch fuer die naechste Welt).
    if (ebeneWarten) return { id: ebeneWarten.id, index: -1, y: ebeneWarten.y, wohnung: false }
    return {
      id: i >= 0 && i < ebenen.liste.length ? ebenen.liste[i].id : null,
      index: i,
      y: uebergang.an ? uebergang.nach : bodenY,
      wohnung: ebenen.aufWohnung,
    }
  }

  /** Die Ebene, auf der man beim Begehen steht, melden (nur Aenderungen,
   *  ausser erzwingen). Ohne Begehen oder ohne Ebenen: null; ebenso, solange
   *  auf eine Ebene gewartet wird (E87b: die aktive ist dann nur ein
   *  Platzhalter). */
  function ebeneMelden(erzwingen: boolean) {
    if (!ebeneFn) return
    const i = ebenen.index
    const e = gehen && i >= 0 && !ebeneWarten ? ebenen.liste[i] : null
    const key = e ? `${i}|${e.id}|${e.name}` : '-'
    if (!erzwingen && key === ebeneZuletzt) return
    ebeneZuletzt = key
    ebeneFn(e ? { index: i, id: e.id, name: e.name } : null)
  }

  /** Wartet man auf eine Ebene (E87b, ebeneWarten): ist sie da, steht man
   *  auf ihr (auf der Treppe von vorher, wenn es sie gibt) und kommt aus
   *  neuen Hindernissen heraus; ist die Frist um, wie ohne Warten
   *  (ebeneWiederfinden, also nach der Hoehe). Sonst bleibt alles. Ohne
   *  Begehen oder im Fahrzeug endet das Warten still. */
  function wartenPruefen() {
    const w = ebeneWarten
    if (!w) return
    if (!gehen || fahrt) {
      ebeneWarten = null
      return
    }
    const r = ebeneWartenPruefen(ebenen, w, performance.now())
    if (r === -1) return
    ebeneWarten = null
    const i = r >= 0 ? r : ebeneWiederfinden(ebenen, { id: w.id, index: -1, y: w.y, wohnung: false })
    treppeJetzt = treppeWiederfinden(w.treppe, i)
    ebeneAktivieren(i, fussUeberAuf(i))
    hoeheGleiten()
    ebeneMelden(false)
    anstossen()
  }

  /** Ein Bild, waehrend auf eine Ebene gewartet wird (E87b): Stelle und
   *  Hoehe bleiben, man faellt nicht und nichts schiebt (gehen ruht); nur
   *  Umschauen, das Ding in der Hand und die eigene Stellung laufen. true:
   *  die Schleife laeuft weiter, bis die Ebene da oder die Frist um ist. */
  function wartenBild(dt: number, zeit: number): boolean {
    vx = 0
    vz = 0
    blickSchritt(dt)
    camera.rotation.set(neigung, gier, 0, 'YXZ')
    if (halt.ding) haltSchritt(zeit)
    poseMelden(zeit, false)
    return true
  }

  /** Auf Ebene i umschalten (Raster) und dort aus allem heraus, worin man
   *  an derselben Stelle steht. Wer sitzt oder liegt, bleibt auf seinem
   *  Platz (der steckt im Moebel), wer auf einer Treppe steht, auf ihr
   *  (dort gelten keine Hindernisse der Ebenen). fuss (E87): Hoehe der
   *  Fuesse ueber dem Gelaende; Niedrigeres schiebt nicht. Die Hoehe macht
   *  der Aufrufer. */
  function ebeneAktivieren(i: number, fuss = 0) {
    ebenen.wechseln(i)
    // Im Fahrzeug (E87) steht man nicht: die Kamera fuehrt der Wagen.
    if (fahrt || haltungJetzt !== 'stehen' || wechsel.an || treppeJetzt >= 0 || treppeMerk !== null) return
    const p = camera.position
    stelle.x = p.x
    stelle.z = p.z
    ebenen.aktiv.herausdruecken(stelle, KOERPER_RADIUS_M, fuss, fzZusatz())
    p.x = stelle.x
    p.z = stelle.z
  }

  /** Wie hoch die Fuesse ueber dem Gelaende der aktiven Ebene an der
   *  Kamera stehen (E87); fuer kollision.ts (Niedriges haelt nicht auf). */
  function fussUeber(): number {
    const p = camera.position
    return fussJetzt() - (bodenY + ebenen.gelaende(ebenen.index, p.x, p.z))
  }

  /** Dasselbe fuer Ebene i (bevor man auf ihr steht): ihr Boden statt des
   *  Zwischenstands. */
  function fussUeberAuf(i: number): number {
    const p = camera.position
    return fussJetzt() - (ebenen.boden(i) + ebenen.gelaende(i, p.x, p.z))
  }

  /** Hoehe der Fuesse (Welt); solange sie noch nicht an die Kamera
   *  angeglichen sind (nach Sitzen oder Liegen), aus der Kamera. */
  function fussJetzt(): number {
    return senkFrei ? camera.position.y - AUGE_M : senk.fuss
  }

  /** Hoechste Lage der Fuesse unter der Decke (E87): in der Wohnung (ihre
   *  Ebene, im Grundriss ihrer Waende) die Decke weniger KOPF_M, sonst
   *  unendlich (Ebenen der Welt kennen keine Decke). */
  function deckeFuss(x: number, z: number): number {
    if (!ebenen.aufWohnung || decke.y === Infinity) return Infinity
    if (x < decke.x0 || x > decke.x1 || z < decke.z0 || z > decke.z1) return Infinity
    // Die Wohnung liegt immer bei 0, ihre Waende stehen dort.
    return decke.y - KOPF_M
  }

  /** Treppe verlassen (E87) zur Seite aus (1 vorne: auf nach, -1 hinten:
   *  auf von): dort ist man jetzt, auf ihrem Boden, und aus allem heraus. */
  function treppeVerlassen(aus: -1 | 1) {
    const t = treppeJetzt
    if (t < 0) return
    treppeJetzt = -1
    const ziel = aus > 0 ? treppen.nach[t] : treppen.von[t]
    if (ebenen.gibt(ziel)) ebeneAktivieren(ziel)
    bodenY = ebenen.boden()
    uebergang.an = false
    ebeneMelden(false)
  }

  /** Die Hoehe gleitet in EBENE_MS zum Boden der aktiven Ebene. */
  function hoeheGleiten() {
    const ziel = ebenen.boden()
    if (Math.abs(ziel - bodenY) <= 1e-4) {
      bodenY = ziel
      uebergang.an = false
      return
    }
    uebergang.an = true
    uebergang.start = performance.now()
    uebergang.von = bodenY
    uebergang.nach = ziel
  }

  /** Sofort stehen (fuer einen Ebenenwechsel): wer sitzt oder liegt, steht
   *  dort, wo er vorher stand; wer gerade aufsteht, steht am Ziel. */
  function sofortStehen() {
    if (haltungJetzt === 'stehen' && !wechsel.an) return
    const p = camera.position
    if (haltungJetzt === 'stehen') {
      p.x = wechsel.nx
      p.z = wechsel.nz
    } else {
      p.x = stehX
      p.z = stehZ
      neigungZiel = 0
    }
    wechsel.an = false
    platzJetzt = null
    vx = 0
    vz = 0
    haltungSetzen('stehen')
  }

  function ebeneWechseln(index: number) {
    // Im Fahrzeug (E87) bleibt man auf seiner Ebene.
    if (!gehen || fahrt || (aufzug.an && aufzug.mit)) return
    // Ebenen der Welt koennen seit dem letzten Bild dazugekommen sein (E87).
    weltVersionPruefen()
    if (!ebenen.gibt(index)) return
    // Wer auf eine Ebene wartet (E87b), waehlt selbst: das Warten endet,
    // auch auf der Ebene, die gerade nur Platzhalter ist.
    const warte = ebeneWarten !== null
    ebeneWarten = null
    if (index === ebenen.index && !warte) return
    sofortStehen()
    // Von der Treppe herunter, ein Sprung endet (E87); die Hoehe gleitet.
    treppeJetzt = -1
    senk.luft = false
    senk.vy = 0
    ebeneAktivieren(index)
    hoeheGleiten()
    ebeneMelden(false)
    anstossen()
  }

  /** Aufzug: faehrt man mit, ist der eigene Boden der der Kabine (Regeln
   *  in Mitfahrt). Ist die Fahrt vorbei, gilt ihr Ziel (E84: Index, nicht
   *  Hoehe; Regeln in ankunftsEbene). true, solange gefahren wird. */
  function aufzugSchritt(): boolean {
    const f = fahrtLesen()
    // Das Ziel merken: am Ende meldet fahrt() schon null.
    if (f) fahrtZiel = Number.isInteger(f.ziel) ? f.ziel : -1
    const p = camera.position
    // Mit faehrt nur, wer steht und in der Kabine ist (E84); wer hinausgeht,
    // ist ausgestiegen.
    const drin = !f || inKabine((weltJetzt as WeltMitFahrt | null)?.kabine, p.x, p.z)
    const warMit = aufzug.an && aufzug.mit
    // Wer springt oder auf einer Treppe steht, faehrt nicht mit (E87).
    const r = aufzug.schritt(f ? f.y : null, p.x, p.z, bodenY, haltungJetzt === 'stehen' && !wechsel.an && drin && !senk.luft && treppeJetzt < 0)
    if (r === 1) {
      if (f && aufzug.mit) {
        bodenY = f.y
        uebergang.an = false
      } else if (warMit && aufzug.gefahren) {
        // Eben ausgestiegen, etwa waehrend die Tueren am Ziel aufgehen: gleich
        // (einmal) auf die Ebene, auf deren Boden man steht, nicht erst am
        // Ende der Fahrt (sonst hielten so lange die Hindernisse der alten).
        const i = ankunftsEbene(ebenen, fahrtZiel, bodenY)
        if (i !== ebenen.index && Math.abs(ebenen.boden(i) - bodenY) <= AUFZUG_BODEN_M) {
          ebeneAktivieren(i)
          hoeheGleiten()
          ebeneMelden(false)
        }
      }
      return true
    }
    const ziel = fahrtZiel
    fahrtZiel = -1
    if (r === 0) return false
    // Angekommen: auf die Ebene des Ziels (gleiche Hoehen in mehreren Haeusern).
    const i = ankunftsEbene(ebenen, ziel, bodenY)
    if (i !== ebenen.index) ebeneAktivieren(i)
    hoeheGleiten()
    ebeneMelden(false)
    return true
  }

  /** Boden fuer dieses Bild: Wechsel und Aufzug. true, solange er sich bewegt. */
  function bodenSchritt(zeit: number): boolean {
    let unruhig = false
    if (uebergang.an) {
      const a = anteil(zeit, uebergang.start, EBENE_MS)
      bodenY = uebergang.von + (uebergang.nach - uebergang.von) * glatt(a)
      if (a >= 1) {
        uebergang.an = false
        bodenY = uebergang.nach
      }
      unruhig = true
    }
    if (aufzugSchritt()) unruhig = true
    return unruhig
  }

  /* ---------------------------------------------------- Springen (E84) */

  /** Ein Sprung beim Begehen: Ziel und Ablauf. In der ersten Haelfte blendet
   *  das Bild ab, in der Mitte steht man am Ziel (getauscht), dann blendet
   *  es wieder auf. */
  const sprung = { an: false, start: 0, ebene: 0, x: 0, z: 0, gier: 0, getauscht: false }
  /** Blende ueber dem Bild, nur fuer Spruenge; beim ersten gebaut. */
  let blende: HTMLDivElement | null = null

  /** Deckkraft der Blende (0 = weg). Farbe: der Hintergrund der Szene. */
  function blendeSetzen(deck: number) {
    if (deck <= 0.001) {
      if (blende) blende.style.visibility = 'hidden'
      return
    }
    if (!blende) {
      blende = document.createElement('div')
      blende.setAttribute('aria-hidden', 'true')
      const s = blende.style
      s.position = 'absolute'
      s.inset = '0'
      s.pointerEvents = 'none'
      host.appendChild(blende)
    }
    blende.style.background = (himmel ?? hintergrund) ? `#${hintergrundFarbe.getHexString()}` : '#000'
    blende.style.opacity = String(deck)
    blende.style.visibility = 'visible'
  }

  function sprungAbbrechen() {
    sprung.an = false
    blendeSetzen(0)
  }

  /** Beim Begehen sofort am Ziel stehen: Ding ablegen, aufstehen, aus dem
   *  Aufzug, Stelle (aus Hindernissen heraus), Ebene, Hoehe und Blick, dann
   *  melden. false, wenn es die Ebene nicht (mehr) gibt. */
  function sprungAusfuehren(ebene: number, x: number, z: number, blick: number): boolean {
    if (!ebenen.gibt(ebene)) return false
    // Aus dem Fahrzeug (E87): es bleibt stehen, wo es ist.
    if (fahrt) fahrtEnde(null, true)
    if (halt.ding) ablegen()
    sofortStehen()
    // Eine laufende Fahrt geht ohne einen weiter; ihr Ende aendert nichts.
    if (aufzug.an) {
      aufzug.mit = false
      aufzug.gefahren = false
    }
    weltMerk = null
    // Ein Sprung beendet das Warten auf eine Ebene (E87b).
    ebeneWarten = null
    uebergang.an = false
    // Von jeder Treppe herunter, ein Sprung in die Hoehe endet (E87).
    treppeJetzt = -1
    treppeMerk = null
    const p = camera.position
    p.x = x
    p.z = z
    ebeneAktivieren(ebene)
    bodenY = ebenen.boden()
    stehenAufBoden()
    stehX = p.x
    stehZ = p.z
    gier = blick
    gierZiel = blick
    neigung = 0
    neigungZiel = 0
    vx = 0
    vz = 0
    camera.rotation.set(neigung, gier, 0, 'YXZ')
    ebeneMelden(false)
    poseMelden(performance.now(), true)
    weltKamera()
    anstossen()
    return true
  }

  /** Ein Bild Springen: Blende und in der Mitte der Ortswechsel. true,
   *  solange der Sprung laeuft. */
  function sprungSchritt(zeit: number): boolean {
    if (!sprung.an) return false
    const a = anteil(zeit, sprung.start, SPRUNG_MS)
    if (a >= 0.5 && !sprung.getauscht) {
      sprung.getauscht = true
      sprungAusfuehren(sprung.ebene, sprung.x, sprung.z, sprung.gier)
    }
    if (a >= 1) {
      sprungAbbrechen()
      return false
    }
    blendeSetzen(a < 0.5 ? glatt(a * 2) : 1 - glatt(a * 2 - 1))
    return true
  }

  function springen(ebene: number, x: number, z: number, blick: number) {
    // Ebenen der Welt koennen inzwischen dazugekommen sein (E87).
    weltVersionPruefen()
    if (!Number.isFinite(x) || !Number.isFinite(z) || !Number.isFinite(blick) || !ebenen.gibt(ebene)) return
    if (!gehen) {
      gehenStarten(ebene, x, z, blick)
      return
    }
    if (wenigBewegung()) {
      sprungAbbrechen()
      sprungAusfuehren(ebene, x, z, blick)
      return
    }
    const jetzt = performance.now()
    if (!sprung.an) {
      sprung.an = true
      sprung.start = jetzt
    } else if (sprung.getauscht) {
      // Schon am alten Ziel und beim Aufblenden: von der jetzigen Deckkraft
      // aus wieder abblenden (glatt ist symmetrisch um die Mitte).
      sprung.start = jetzt - (1 - anteil(jetzt, sprung.start, SPRUNG_MS)) * SPRUNG_MS
    }
    sprung.getauscht = false
    sprung.ebene = ebene
    sprung.x = x
    sprung.z = z
    sprung.gier = blick
    anstossen()
  }

  /** Ist o samt allen Eltern sichtbar? (Strahlen in three fragen nicht danach.) */
  function sichtbar(o: Object3D | null): boolean {
    for (let x = o; x; x = x.parent) if (!x.visible) return false
    return true
  }

  /** Das antippbare Ding der Welt unter dem Strahl (strahl ist gesetzt):
   *  das eingetragene Objekt (der getroffene Teil oder sein Vorfahr in
   *  objekte) und der Abstand. Sonst null. */
  function interaktivTreffer(i: Interaktiv3D): { objekt: Object3D; abstand: number } | null {
    if (!i.objekte.length) return null
    const eingetragen = new Set(i.objekte)
    for (const hit of strahl.intersectObjects(i.objekte, true)) {
      if (!sichtbar(hit.object)) continue
      let o: Object3D | null = hit.object
      while (o && !eingetragen.has(o)) o = o.parent
      if (o) return { objekt: o, abstand: hit.distance }
    }
    return null
  }

  /** Steht ein deckendes Teil der Wohnung naeher als abstand im Strahl?
   *  Glas, halbdurchsichtige Waende und das Ding in der Hand zaehlen nicht. */
  function wohnungDavor(abstand: number): boolean {
    for (const hit of strahl.intersectObjects(gruppe.children, false)) {
      if (hit.distance >= abstand) return false
      if (!hit.object.visible) continue
      const u = daten(hit.object)
      if (u.glas || (halt.id !== null && u.ding === halt.id)) continue
      const mat = (hit.object as Mesh).material as MeshLambertMaterial | undefined
      if (mat && mat.opacity >= 0.5) return true
    }
    return false
  }

  /** Tipp zuerst auf die antippbaren Dinge der Welt (Aufzugknoepfe), beim
   *  Begehen und in der Rundumsicht. true, wenn eins getroffen war. */
  function weltTippen(): boolean {
    const i = weltJetzt?.interaktiv
    if (!i) return false
    const t = interaktivTreffer(i)
    if (!t || wohnungDavor(t.abstand)) return false
    // Die Welt bekommt in den naechsten Bildern schritt(), auch ohne Begehen.
    weltLaeuft = true
    anstossen()
    try {
      i.tippen(t.objekt)
    } catch (err) {
      console.error('[3d] Welt.tippen:', err)
    }
    return true
  }

  /** Ein Bild in der Hoehe beim Stehen (E87, Rechnung in physik.ts): auf
   *  der Treppe ihre Linie; im Aufzug und beim Wechsel der Ebene fuehrt der
   *  Boden; sonst Gelaende, Stufen, Sprung und Fall. Das Auge folgt am
   *  Boden geglaettet, starr in der Luft, im Aufzug und beim Wechsel; beim
   *  Landen (Stufe "voll") sinkt es kurz ein. true, solange sich in der
   *  Hoehe noch etwas tut. */
  function hoeheSchritt(dt: number, zeit: number): boolean {
    const p = camera.position
    if (senkFrei) {
      // Nach Sitzen, Liegen oder Aufstehen: Fuesse und Auge von der Kamera aus.
      senkFrei = false
      senkrechtSetzen(senk, p.y - AUGE_M)
      augeFuss = senk.fuss
    }
    const vorher = senk.fuss
    const fuehrt = (aufzug.an && aufzug.mit) || uebergang.an
    if (treppeJetzt >= 0) {
      senkrechtSetzen(senk, treppen.hoehe(treppeJetzt, p, ebenen))
    } else {
      const g = grundAn(ebenen, ebenen.index, bodenY, p.x, p.z, senk.fuss)
      if (fuehrt) senkrechtSetzen(senk, g)
      else {
        senkrechtSchritt(senk, g, dt, deckeFuss(p.x, p.z))
        if (senk.aufprall > 0) {
          if (vollBewegung()) {
            delleStart = zeit
            delleT = delleTiefe(senk.aufprall)
          }
          // Gelandet: was jetzt aufhaelt (neben der Mauer hinunter), schiebt hinaus.
          stelle.x = p.x
          stelle.z = p.z
          ebenen.aktiv.herausdruecken(stelle, KOERPER_RADIUS_M, fussUeber(), fzZusatz())
          p.x = stelle.x
          p.z = stelle.z
        }
      }
    }
    augeFuss = augeFolgen(augeFuss, vorher, senk.fuss, dt, senk.luft || fuehrt)
    const d = delle((zeit - delleStart) / 1000, delleT)
    p.y = augeFuss + AUGE_M + d
    return senk.luft || augeFuss !== senk.fuss || d !== 0
  }

  /** Ruhig auf dem Boden an der Kamera stehen (E87): Fuesse und Auge dort,
   *  kein Sprung, keine Delle; die Kamera in Augenhoehe. */
  function stehenAufBoden() {
    const p = camera.position
    const g = grundAn(ebenen, ebenen.index, bodenY, p.x, p.z, bodenY)
    senkrechtSetzen(senk, g)
    augeFuss = g
    senkFrei = false
    delleT = 0
    p.y = g + AUGE_M
  }

  /** Springen ginge jetzt grundsaetzlich (fuer moeglich()): beim Begehen,
   *  stehend, nicht auf einer Treppe, nicht mitfahrend im Aufzug, nicht
   *  beim Warten auf eine Ebene (E87b). */
  function hupfenMoeglich(): boolean {
    return gehen && !fahrt && haltungJetzt === 'stehen' && !wechsel.an && treppeJetzt < 0 && !(aufzug.an && aufzug.mit) && !ebeneWarten
  }

  /** Abspringen (Leertaste, Knopf). Zusaetzlich nicht ohne Eingabe, nicht
   *  in der Luft (kein zweiter Sprung), nicht waehrend eines Sprungs an
   *  einen Ort oder eines Ebenenwechsels. */
  function hupfen() {
    if (!eingabeAn || !hupfenMoeglich() || sprung.an || uebergang.an || senkFrei) return
    if (hupfenStart(senk)) anstossen()
  }

  /** moeglich() melden, nur bei Aenderung (oder erzwingen). Laeuft jedes
   *  Bild, darum als Bitmaske ohne neues Objekt, solange sich nichts aendert. */
  function moeglichPruefen(erzwingen: boolean) {
    if (!moeglichFn) return
    const h = hupfenMoeglich()
    const ein = einsteigenZiel() !== null
    const aus = fahrt !== null
    const haelt = halt.ding !== null
    const hin = haelt && vorschau.ok
    const key = (h ? 1 : 0) | (ein ? 2 : 0) | (aus ? 4 : 0) | (haelt ? 8 : 0) | (hin ? 16 : 0)
    if (!erzwingen && key === moeglichZuletzt) return
    moeglichZuletzt = key
    moeglichFn({ einsteigen: ein, aussteigen: aus, halten: haelt, hinstellen: hin, hupfen: h })
  }

  /** Umschauen weich zum Ziel (gierZiel, neigungZiel). true, solange der
   *  Blick noch gleitet. */
  function blickSchritt(dt: number): boolean {
    const kb = 1 - Math.exp(-dt / BLICK_S)
    const dg = gierZiel - gier
    const dn = neigungZiel - neigung
    if (Math.abs(dg) > 1e-4 || Math.abs(dn) > 1e-4) {
      gier += dg * kb
      neigung += dn * kb
      return true
    }
    gier = gierZiel
    neigung = neigungZiel
    return false
  }

  /** Ein Bild Gehen: Eingabe lesen, weich beschleunigen, gleiten, umschauen.
   *  true, solange sich etwas bewegt oder eine Taste gehalten wird. */
  function gehSchritt(dt: number, zeit: number, echt: boolean): boolean {
    let vor = 0
    let seit = 0
    let staerke = 0
    if (eingabeAn) {
      const tasteVor = (halten.has('vor') ? 1 : 0) - (halten.has('zurueck') ? 1 : 0)
      const tasteSeit = (halten.has('rechts') ? 1 : 0) - (halten.has('links') ? 1 : 0)
      vor = Math.max(-1, Math.min(1, tasteVor + stick.y))
      seit = Math.max(-1, Math.min(1, tasteSeit + stick.x))
      // Tasten gehen voll, der Knueppel so weit, wie er gedrueckt ist.
      staerke = tasteVor || tasteSeit ? 1 : Math.min(1, Math.hypot(stick.x, stick.y))
    }
    const will = (vor !== 0 || seit !== 0) && staerke >= 0.05
    let unruhig = false
    const p = camera.position
    if (wechsel.an) {
      wechselSchritt(zeit)
      unruhig = true
    } else if (haltungJetzt !== 'stehen') {
      // Wer sitzt oder liegt und gehen will, steht zuerst auf.
      vx = 0
      vz = 0
      if (will) {
        aufstehen()
        unruhig = true
      }
    } else {
      let zx = 0
      let zz = 0
      if (will) {
        // Vorwaerts ist die Blickrichtung am Boden, rechts quer dazu.
        const dx = -Math.sin(gier) * vor + Math.cos(gier) * seit
        const dz = -Math.cos(gier) * vor - Math.sin(gier) * seit
        const l = Math.hypot(dx, dz)
        const v = (rennen ? RENNEN_M_S : GEHEN_M_S) * staerke
        if (l > 1e-6) {
          zx = (dx / l) * v
          zz = (dz / l) * v
        }
      }
      // Weich anfahren und abbremsen.
      const k = 1 - Math.exp(-dt / TRAEGHEIT_S)
      vx += (zx - vx) * k
      vz += (zz - vz) * k
      const tempo = Math.hypot(vx, vz)
      if (!will && tempo < 0.02) {
        vx = 0
        vz = 0
      } else if (dt > 0) {
        stelle.x = p.x
        stelle.z = p.z
        let aus: -1 | 0 | 1 = 0
        if (treppeJetzt >= 0) {
          // Auf der Treppe (E87): keine Hindernisse der Ebenen, nur das Gelaender.
          aus = treppen.gehen(treppeJetzt, stelle, vx * dt, vz * dt, KOERPER_RADIUS_M)
        } else {
          // Es halten nur die Hindernisse der Ebene auf, auf der man steht
          // (E83); Niedriges steigt man hinauf, abgestellte Fahrzeuge halten
          // auf (E87).
          ebenen.aktiv.bewegen(stelle, vx * dt, vz * dt, KOERPER_RADIUS_M, fussUeber(), fzZusatz())
          // Ueber die Kante einer Treppe dieser Ebene getreten: auf ihr.
          const t = treppen.betreten(ebenen.index, p.x, p.z, stelle, KOERPER_RADIUS_M)
          if (t >= 0) treppeJetzt = t
        }
        // Was an der Wand verloren ging, ist auch aus der Geschwindigkeit
        // weg: so springt man nach einer Ecke nicht mit altem Schwung los.
        const ax = (stelle.x - p.x) / dt
        const az = (stelle.z - p.z) / dt
        const la = Math.hypot(ax, az)
        const f = la > tempo && la > 0 ? tempo / la : 1
        vx = ax * f
        vz = az * f
        p.x = stelle.x
        p.z = stelle.z
        if (aus !== 0) treppeVerlassen(aus)
        unruhig = true
        if (echt) tempoMessen(dt)
      }
    }
    // Boden (E83): Wechsel der Ebene und Aufzug. Stehend stehen die Fuesse
    // auf Boden, Gelaende, Stufe oder Treppe, oder sie springen und fallen
    // (E87); Sitzen und Liegen fuehrt der Wechsel.
    if (bodenSchritt(zeit)) unruhig = true
    if (haltungJetzt === 'stehen' && !wechsel.an) {
      if (hoeheSchritt(dt, zeit)) unruhig = true
    } else senkFrei = true
    if (!wechsel.an && blickSchritt(dt)) unruhig = true
    camera.rotation.set(neigung, gier, 0, 'YXZ')
    if (halt.ding && haltSchritt(zeit)) unruhig = true
    poseMelden(zeit, false)
    return unruhig || will
  }

  /** Die eigene Figur an die Stelle der Kamera (nur im Spiegel zu sehen). */
  let ichFigur: Figur3D | null = null
  const aufEbeneEins = (o: Object3D) => o.layers.set(1)
  /** Kamerahoehe ueber Boden, Sitz- oder Liegeflaeche je Haltung. Figuren
   *  stehen mit den Fuessen (sitzen, liegen) dort, wo die Kamera des
   *  Senders steht minus diese Hoehe, nicht minus ihre eigene Augenhoehe:
   *  sonst schwebt eine kleine Figur und eine grosse steckt im Boden (E82,
   *  Pruefung). Der Kopf liegt dafuer je nach Groesse etwas hoeher oder tiefer. */
  const KAMERA_AUGE: Record<Haltung, number> = { stehen: AUGE_M, sitz: SITZ_AUGE_M, liegen: LIEGE_AUGE_M }
  function ichSchritt(zeit: number) {
    const f = ichFigur
    // Im Fahrzeug (E87) ist die eigene Figur nicht zu sehen.
    if (!f || !gehen || fahrt) return
    const p = camera.position
    // Fuesse auf dem Boden, Gesaess auf dem Sitz, Ruecken auf der Liegeflaeche
    // (E87: stehend auf den echten Fuessen, ohne Glaettung des Auges).
    const y = poseY() - KAMERA_AUGE[haltungJetzt]
    f.gruppe.position.set(p.x, y, p.z)
    f.gruppe.rotation.y = gier
    f.pose(haltungJetzt, tempoJetzt(), zeit / 1000)
  }

  /* Die anderen Leute (E82). */
  const leuteNachUid = new Map<string, Person>()
  let leuteListe: Person[] = []

  /** Leute gleiten weich zu ihrer letzten Stellung. true, solange sich
   *  jemand bewegt. */
  function leuteSchritt(dt: number, zeit: number): boolean {
    let unruhig = false
    const k = 1 - Math.exp(-12 * dt)
    for (let i = 0; i < leuteListe.length; i++) {
      const m = leuteListe[i]
      if (!m.hat) continue
      const z = m.ziel
      // Lange nichts gehoert: die Beine halten an.
      const zielTempo = zeit - m.zuletzt > 1500 ? 0 : z.tempo
      m.x += (z.x - m.x) * k
      m.y += (z.y - m.y) * k
      m.z += (z.z - m.z) * k
      const dg = winkelDiff(z.gier, m.gier)
      m.gier += dg * k
      m.tempo += (zielTempo - m.tempo) * k
      m.haltung = z.haltung
      if (Math.abs(z.x - m.x) > 0.001 || Math.abs(z.y - m.y) > 0.001 || Math.abs(z.z - m.z) > 0.001 || Math.abs(dg) > 0.002 || m.tempo > 0.02) unruhig = true
      const f = m.figur
      const e = personFz(m)
      if (e) {
        // Lenkt ein Fahrzeug, das es hier gibt (E87): das Fahrzeug gleitet,
        // die Figur ist nicht zu sehen. Kam es eben erst (neue Welt), faehrt
        // es ab jetzt mit (E87b), sofern es niemand sonst lenkt.
        if (!e.fern.an) fernFolgen(m, e)
        if (f.gruppe.visible) f.gruppe.visible = false
        if (e.fern.an && e.fern.uid === m.uid && fernSchritt(e, k, zeit)) unruhig = true
        continue
      }
      // Sonst (auch wer ein Fahrzeug lenkt, das es hier nicht gibt, E87b)
      // ist die Figur an ihrer Stellung zu sehen.
      if (!f.gruppe.visible) f.gruppe.visible = true
      f.gruppe.position.set(m.x, m.y - KAMERA_AUGE[m.haltung], m.z)
      f.gruppe.rotation.y = m.gier
      f.pose(m.haltung, m.tempo, zeit / 1000)
    }
    return unruhig
  }

  /* ------------------------------------------------------- Die Schleife */

  /** Ein Bild: alles weiterrechnen und im selben Bild zeichnen. */
  function bild(zeit: number) {
    lauf = 0
    if (weg) return
    if (geraeteUhr) {
      window.clearTimeout(geraeteUhr)
      geraeteUhr = 0
    }
    const echt = letzteZeit > 0
    const dt = echt ? Math.min(DT_MAX, Math.max(0, (zeit - letzteZeit) / 1000)) : 1 / 60
    letzteZeit = zeit
    let weiter = false
    // E87: ging die Welt weg und kam keine neue, ist ein Ding der Welt in
    // der Hand still weg, und aus einem Fahrzeug steigt man aus.
    teilePruefen(true)
    // Die Welt ging beim Begehen weg und keine neue kam (E84): erst jetzt auf
    // die Wohnung allein und hinunter auf ihren Boden.
    // Ebenso eine Treppe, auf der man stand (E87): ohne neue Welt ist sie
    // weg, und man kommt aus allem heraus, was dort auf der Ebene steht.
    if (treppeMerk !== null) {
      treppeMerk = null
      if (gehen && !weltMerk) ebeneAktivieren(ebenen.index, fussUeber())
    }
    if (weltMerk) {
      weltMerk = null
      // Ohne Welt wartet man auf keine Ebene mehr (E87b).
      ebeneWarten = null
      if (gehen) {
        ebeneAktivieren(ebenen.index)
        hoeheGleiten()
        ebeneMelden(false)
      }
    }
    // Die Welt (E83) zuerst: so ist die Kabine schon weiter, wenn gehSchritt
    // fahrt() liest, und die Kamera hinkt ihr kein Bild hinterher.
    if (weltSchritt(dt)) weiter = true
    // Neue Daten der Welt (E87: ein Haus innen nachgeladen) vor dem Gehen;
    // auch ohne Begehen, damit Fahrzeuge und Dinge stimmen.
    weltVersionPruefen()
    // E87b: Frist beim Warten auf eine Ebene; Dinge fuer gemerkte Lagen
    // einzeln bauen lassen (wenige je Bild).
    wartenPruefen()
    if (erzeugenSchritt()) weiter = true
    if (gehen) {
      // Ein Sprung (E84) tauscht die Stelle vor dem Gehen dieses Bilds.
      if (sprungSchritt(zeit)) weiter = true
      // Im Fahrzeug (E87) faehrt man statt zu gehen; wartet man auf eine
      // Ebene (E87b), steht man still.
      if (fahrt) {
        if (fahrBild(dt, zeit, echt)) weiter = true
      } else if (ebeneWarten) {
        if (wartenBild(dt, zeit)) weiter = true
      } else if (gehSchritt(dt, zeit, echt)) weiter = true
    } else {
      // Beim Begehen fuehrt gehSchritt die Kamera; update() wuerde sie zum
      // Ziel zurueckdrehen. Laeuft die Daempfung, meldet update() 'change'.
      controls.update()
    }
    if (tuerenSchritt(zeit)) weiter = true
    if (tuerBewegt) {
      // Geht eine Tuer zu, wo man steht, schiebt sie einen hinaus (nur auf
      // der Ebene der Wohnung; anderswo stehen ihre Tueren nicht im Weg).
      if (gehen && !fahrt && haltungJetzt === 'stehen' && !wechsel.an && ebenen.aufWohnung && treppeJetzt < 0 && !ebeneWarten) {
        stelle.x = camera.position.x
        stelle.z = camera.position.z
        ebenen.aktiv.herausdruecken(stelle, KOERPER_RADIUS_M, fussUeber(), fzZusatz())
        camera.position.x = stelle.x
        camera.position.z = stelle.z
      }
    }
    // Die Welt erfaehrt die Stelle der Kamera vor dem Zeichnen (E84). Hat
    // sie dabei etwas entladen (E87), nimmt der Motor es noch vor dem
    // Zeichnen aus der Szene (die Welt gibt seine Geometrie frei).
    if (gehen) {
      weltKamera()
      weltVersionPruefen()
    }
    if (schubSchritt(zeit)) weiter = true
    if (leuteSchritt(dt, zeit)) weiter = true
    ichSchritt(zeit)
    spiegelPruefen()
    const geraete = geraeteSchritt(zeit)
    waendePruefen()
    // E87: Vorschau des Dings in der Hand, Fahrzeuge in der Ferne, Blaulicht.
    vorschauSchritt()
    teileSichtbar()
    if (blaulichtLaeuft()) weiter = true
    // Was man tun kann (E87), nur bei Aenderung gemeldet.
    moeglichPruefen(false)
    renderer.render(scene, camera)
    if (weiter) anstossen()
    else if (!lauf && geraete) geraeteUhr = window.setTimeout(anstossen, GERAETE_PAUSE_MS)
    // Ruht die Schleife, rechnet das naechste Bild nicht mit der Pause.
    if (!lauf && !geraeteUhr) letzteZeit = 0
  }

  /* ---------------------------------------------------- Eingabe Begehen */

  const TASTEN: Record<string, GehRichtung> = {
    KeyW: 'vor',
    ArrowUp: 'vor',
    KeyS: 'zurueck',
    ArrowDown: 'zurueck',
    KeyA: 'links',
    ArrowLeft: 'links',
    KeyD: 'rechts',
    ArrowRight: 'rechts',
  }
  const tasteRunter = (e: KeyboardEvent) => {
    if (!gehen || !eingabeAn) return
    const ziel = e.target as HTMLElement | null
    if (ziel && (ziel.tagName === 'INPUT' || ziel.tagName === 'TEXTAREA' || ziel.isContentEditable)) return
    rennen = e.shiftKey
    const r = TASTEN[e.code]
    if (!r) return
    e.preventDefault()
    halten.add(r)
    sitzendGehen()
    anstossen()
  }
  const tasteHoch = (e: KeyboardEvent) => {
    rennen = e.shiftKey
    const r = TASTEN[e.code]
    if (r) halten.delete(r)
  }
  // Fenster verliert den Fokus: sonst liefe man mit "gedrueckter" Taste weiter.
  const fokusWeg = () => {
    halten.clear()
    stick.x = 0
    stick.y = 0
    bremse = false
  }
  window.addEventListener('keydown', tasteRunter)
  window.addEventListener('keyup', tasteHoch)
  window.addEventListener('blur', fokusWeg)

  /* Leertaste springt (E87), im Fahrzeug bremst sie; E steigt ein und aus,
   * V wechselt die Sicht, B schaltet das Blaulicht, R dreht das Ding in der
   * Hand (Umschalt+R zurueck). In der Einfang-Phase am Fenster, vor allen
   * anderen: die Seite rollt nicht, ein Knopf mit Fokus (etwa der zum
   * Begehen) loest nicht aus, und der Zeichner darunter schaltet nicht auf
   * die Hand oder ein Werkzeug (er kennt V, R, B und E). Nicht beim Tippen
   * in Feldern, nicht mit Strg, Alt oder Cmd (Neu laden bleibt) und nicht,
   * wenn ein anderes Fenster offen ist (dort gehoert die Taste ihm). */
  const SONDER_TASTEN = new Set(['Space', 'KeyE', 'KeyV', 'KeyB', 'KeyR'])
  function fremdesFenster(): boolean {
    try {
      return Array.from(document.querySelectorAll('[aria-modal="true"]')).some((d) => !d.contains(host) && !host.contains(d))
    } catch {
      return false
    }
  }
  function sonderTasteGilt(e: KeyboardEvent): boolean {
    if (!SONDER_TASTEN.has(e.code) || !gehen || !eingabeAn || e.ctrlKey || e.metaKey || e.altKey) return false
    const ziel = e.target as HTMLElement | null
    if (ziel && (ziel.tagName === 'INPUT' || ziel.tagName === 'TEXTAREA' || ziel.tagName === 'SELECT' || ziel.isContentEditable)) return false
    return !fremdesFenster()
  }
  const sonderRunter = (e: KeyboardEvent) => {
    if (!sonderTasteGilt(e)) return
    e.preventDefault()
    e.stopPropagation()
    if (e.code === 'Space') {
      if (fahrt) {
        bremse = true
        anstossen()
      } else if (!e.repeat) hupfen() // gehalten springt man nur einmal
      return
    }
    // Gehalten zaehlt jede dieser Tasten nur einmal.
    if (e.repeat) return
    if (e.code === 'KeyE') {
      if (fahrt) aussteigen()
      else einsteigen()
    } else if (e.code === 'KeyV') {
      if (fahrt) fahrSichtSetzen(fahrt.sicht === 'innen' ? 'hinten' : 'innen')
    } else if (e.code === 'KeyB') {
      if (fahrt) blaulichtSetzen(!fahrt.e.blau)
    } else if (e.code === 'KeyR') drehen(e.shiftKey ? -1 : 1)
  }
  const sonderHoch = (e: KeyboardEvent) => {
    // Die Bremse loest sich immer (auch wenn der Fokus inzwischen woanders ist).
    if (e.code === 'Space') bremse = false
    if (!sonderTasteGilt(e)) return
    e.preventDefault()
    e.stopPropagation()
  }
  window.addEventListener('keydown', sonderRunter, true)
  window.addEventListener('keyup', sonderHoch, true)

  /** Wer sitzt oder liegt und gehen will, steht sofort auf, auch wenn die
   *  Taste kuerzer gedrueckt war als ein Bild dauert (langsame Geraete). */
  function sitzendGehen() {
    if (gehen && haltungJetzt !== 'stehen' && !wechsel.an) aufstehen()
  }

  function schauenLoslassen() {
    if (schauen && renderer.domElement.hasPointerCapture(schauen.id)) renderer.domElement.releasePointerCapture(schauen.id)
    schauen = null
  }

  // Umschauen: gedrueckt ziehen, wie bei einem Rundblick-Foto.
  const schauRunter = (e: PointerEvent) => {
    if (!gehen || schauen || !eingabeAn) return
    schauen = { x: e.clientX, y: e.clientY, id: e.pointerId }
    renderer.domElement.setPointerCapture(e.pointerId)
    e.preventDefault()
  }
  const schauBewegen = (e: PointerEvent) => {
    if (!gehen || !schauen || e.pointerId !== schauen.id) return
    const dx = e.clientX - schauen.x
    const dy = e.clientY - schauen.y
    schauen.x = e.clientX
    schauen.y = e.clientY
    gierZiel += dx * 0.0045
    neigungZiel = Math.max(-1.2, Math.min(1.2, neigungZiel + dy * 0.0045))
    anstossen()
  }
  const schauHoch = (e: PointerEvent) => {
    if (!schauen || e.pointerId !== schauen.id) return
    schauenLoslassen()
  }
  renderer.domElement.addEventListener('pointerdown', schauRunter)
  renderer.domElement.addEventListener('pointermove', schauBewegen)
  renderer.domElement.addEventListener('pointerup', schauHoch)
  renderer.domElement.addEventListener('pointercancel', schauHoch)

  /* Zeigen (E87): wo die Maus steht und ob mit den Fingern bedient wird
   * (hinstellen.ts, zeigePunkt). Mit einem Ding in der Hand folgt die
   * Vorschau der Maus. */
  const zeigerLage = (e: PointerEvent) => {
    const touch = e.pointerType === 'touch' || e.pointerType === 'pen'
    zeige.touch = touch
    if (touch) return
    const r = renderer.domElement.getBoundingClientRect()
    mausPunkt.x = e.clientX - r.left
    mausPunkt.y = e.clientY - r.top
    zeige.maus = mausPunkt
    if (gehen && halt.ding && !fahrt) anstossen()
  }
  const zeigerWeg = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    zeige.maus = null
    if (gehen && halt.ding && !fahrt) anstossen()
  }
  renderer.domElement.addEventListener('pointerdown', zeigerLage)
  renderer.domElement.addEventListener('pointermove', zeigerLage)
  renderer.domElement.addEventListener('pointerleave', zeigerWeg)

  /* ------------------------------------------------------------ Tippen */

  /** Ein kurzer Klick (ohne Ziehen). Tueren, Schluessel, Schalter und
   *  Schubladen schalten; beim Begehen auch Geraete, Dinge und Plaetze.
   *  Davor stehende halbdurchsichtige Waende zaehlen nicht. */
  let tipp: { x: number; y: number; zeit: number } | null = null
  let tippFn: ((xCm: number, yCm: number, treffer: Treffer3D | null) => void) | null = null
  const ndcTipp = { x: 0, y: 0 }
  const tippRunter = (e: PointerEvent) => {
    tipp = e.button === 0 && eingabeAn ? { x: e.clientX, y: e.clientY, zeit: performance.now() } : null
  }
  const tippHoch = (e: PointerEvent) => {
    const t = tipp
    tipp = null
    if (!t || !eingabeAn || Math.hypot(e.clientX - t.x, e.clientY - t.y) > 5 || performance.now() - t.zeit > 500) return
    strahl.setFromCamera(zeigerNdc(e), camera)
    // Im Fahrzeug (E87) tippt man nichts an; Umschauen geht weiter.
    if (gehen && fahrt) return
    // Antippbares der Welt (Aufzugknoepfe, E83) zuerst, auch mit einem Ding
    // in der Hand.
    if (weltTippen()) return
    if (gehen) {
      // E87: ein Fahrzeug, dessen Fahrertuer nah genug ist: einsteigen.
      const fz = fahrzeugUnterStrahl()
      if (fz && einsteigenGeht() && einsteigbar(fz) && tuerAbstand(fz.f, fz.zust, camera.position.x, camera.position.z) <= EINSTEIGEN_M) {
        einsteigenIn(fz)
        return
      }
      // Mit einem Ding in der Hand: dorthin stellen, wo getippt wurde, wenn
      // es passt (sonst bleibt es in der Hand); ins Leere oder zu weit
      // getippt legt es wie bisher ab.
      if (halt.ding) {
        const r = renderer.domElement.getBoundingClientRect()
        tippPunkt(e.clientX - r.left, e.clientY - r.top, r.width, r.height, ndcTipp)
        hinstellenBei(ndcTipp.x, ndcTipp.y, true)
        return
      }
      // E87: ein Ding der Welt aufheben (nah genug, nicht verdeckt).
      const wd = weltDingUnterStrahl()
      if (wd) {
        aufheben(wd)
        return
      }
    }
    // Sitzen und Liegen nur auf der Ebene der Wohnung (E83), nicht beim
    // Warten auf eine Ebene (E87b: die aktive ist nur Platzhalter).
    const wohnen = ebenen.aufWohnung && !ebeneWarten
    for (const hit of strahl.intersectObjects(gruppe.children, false)) {
      const o = hit.object
      if (!o.visible) continue
      const u = daten(o)
      if (u.tuer) {
        tuerTippen(u.tuer.gruppe, u.tuer.schluessel)
        return
      }
      if (u.schalterRaum && schalterFn) {
        schalterFn(u.schalterRaum)
        return
      }
      if (u.schub) {
        schubUmschalten(u.schub)
        return
      }
      if (gehen) {
        if (u.geraet) {
          geraetUmschalten(u.geraet.id)
          return
        }
        const d = u.ding ? dinge.get(u.ding) : undefined
        if (d) {
          aufheben(d)
          return
        }
        const pl = wohnen ? (u.platz ?? (u.objektId ? naechsterPlatz(u.objektId, hit.point.x, hit.point.z) : null)) : null
        if (pl) {
          platzNehmen(pl)
          return
        }
      }
      // Kisten zaehlen auch gedaempft (E82): erst die Kiste, dann die Deckkraft.
      if (tippFn && u.kisteId) {
        tippFn(Math.round(hit.point.x * 100), Math.round(hit.point.z * 100), { objekt: u.objektId, kiste: u.kisteId })
        return
      }
      const mat = (o as Mesh).material as MeshLambertMaterial | undefined
      if (mat && mat.opacity >= 0.5) {
        // Auf ein Moebel oder Regal: die Stelle darauf. Sonst (Wand) zaehlt
        // der Boden unter dem Zeiger.
        if (tippFn && u.objektId) {
          tippFn(Math.round(hit.point.x * 100), Math.round(hit.point.z * 100), { objekt: u.objektId, kiste: u.kisteId })
          return
        }
        break
      }
    }
    if (!tippFn) return
    const p = bodenPunkt(e)
    if (p) tippFn(Math.round(p.x * 100), Math.round(p.z * 100), null)
  }
  renderer.domElement.addEventListener('pointerdown', tippRunter)
  renderer.domElement.addEventListener('pointerup', tippHoch)

  /* ------------------------------------------------ Begehen an und aus */

  /** Begehen beginnen: auf Ebene ebene (Index in welt().ebenen) an der
   *  Stelle x, z (Meter, Welt; in einem Moebel: zur naechsten freien
   *  Stelle), Blick blick oder, bei null, dorthin, wohin die Kamera eben
   *  geschaut hat. */
  function gehenStarten(ebene: number, x: number, z: number, blick: number | null) {
    vorher = { pos: camera.position.clone(), ziel: controls.target.clone(), fov: camera.fov }
    if (blick === null) {
      // In die Richtung schauen, in die die Kamera eben geschaut hat.
      const dx = controls.target.x - camera.position.x
      const dz = controls.target.z - camera.position.z
      gier = Math.hypot(dx, dz) > 0.01 ? Math.atan2(-dx, -dz) : 0
    } else gier = blick
    neigung = 0
    gierZiel = gier
    neigungZiel = 0
    vx = 0
    vz = 0
    wechsel.an = false
    haltungJetzt = 'stehen'
    platzJetzt = null
    gehen = true
    controls.enabled = false
    clearTimeout(ruheUhr)
    bewegt = false
    // Aufloesung fuer die ganze Runde: einmal hier, nie im Gehen.
    ratioSetzen(ratioGehen)
    messZeit = 0
    messBilder = 0
    ebenen.wechseln(ebene)
    bodenY = ebenen.boden()
    uebergang.an = false
    aufzug.ruhe()
    fahrtZiel = -1
    weltMerk = null
    ebeneWarten = null
    sprungAbbrechen()
    treppeJetzt = -1
    treppeMerk = null
    stelle.x = x
    stelle.z = z
    ebenen.aktiv.herausdruecken(stelle, KOERPER_RADIUS_M, 0, fzZusatz())
    camera.position.set(stelle.x, bodenY + AUGE_M, stelle.z)
    // Auf Gelaende und Stufe an dieser Stelle (E87).
    stehenAufBoden()
    stehX = stelle.x
    stehZ = stelle.z
    camera.fov = FOV_GEHEN
    camera.updateProjectionMatrix()
    camera.rotation.set(neigung, gier, 0, 'YXZ')
    ichGruppe.visible = true
    poseMelden(performance.now(), true)
    ebeneMelden(false)
    weltKamera()
    pulsPruefen()
    moeglichPruefen(false)
    anstossen()
  }

  function gehenAn(an: boolean, start: [number, number] | null) {
    if (an === gehen) return
    if (an) {
      // Neue Daten der Welt seit dem letzten Begehen (E87) zuerst lesen.
      weltVersionPruefen()
      // Begehen beginnt hier immer in der Wohnung, also auf ihrer Ebene (E83).
      gehenStarten(ebenen.wohnIndex, start ? start[0] / 100 : controls.target.x, start ? start[1] / 100 : controls.target.z, null)
      return
    }
    // Aus dem Fahrzeug (E87; es bleibt stehen), was in der Hand ist, wird
    // abgelegt; wer sitzt, steht auf.
    if (fahrt) fahrtEnde(null, true)
    if (halt.ding) ablegen()
    gehen = false
    bremse = false
    // Keine Treppe, kein Sprung mehr (E87).
    treppeJetzt = -1
    treppeMerk = null
    senkrechtSetzen(senk, bodenY)
    senkFrei = true
    delleT = 0
    uebergang.an = false
    aufzug.ruhe()
    fahrtZiel = -1
    weltMerk = null
    ebeneWarten = null
    sprungAbbrechen()
    ebeneMelden(false)
    halten.clear()
    stick.x = 0
    stick.y = 0
    vx = 0
    vz = 0
    schauenLoslassen()
    wechsel.an = false
    platzJetzt = null
    if (haltungJetzt !== 'stehen') {
      haltungJetzt = 'stehen'
      haltungFn?.('stehen')
    }
    ichGruppe.visible = false
    pulsPruefen()
    controls.enabled = true
    if (vorher) {
      camera.position.copy(vorher.pos)
      controls.target.copy(vorher.ziel)
      camera.fov = vorher.fov
      camera.updateProjectionMatrix()
    }
    controls.update()
    // Die Welt kann das Innere der Wohnungen wieder ausschalten (E84).
    weltKamera()
    ratioSetzen(ratioStand)
    moeglichPruefen(false)
    anstossen()
  }

  function blick(b: Blick) {
    if (gehen) gehenAn(false, null)
    const r = szeneRahmen(koerperJetzt)
    if (!r) return
    const mitte: Vec3 = [(r.x0 + r.x1) / 2, 0, (r.z0 + r.z1) / 2]
    const breite = Math.max(r.x1 - r.x0, 1)
    const tiefe = Math.max(r.z1 - r.z0, 1)
    const halbFov = (camera.fov * Math.PI) / 360
    // Abstand, bei dem die ganze Flaeche ins Bild passt (Hoehe und Breite des Bilds).
    const passt = Math.max(tiefe / 2 / Math.tan(halbFov), breite / 2 / (Math.tan(halbFov) * camera.aspect))
    /* Hochformat (Handy, E76): die Wohnung um 90 Grad gedreht zeigen, damit
     * ihre lange Seite die Hoehe des Bildschirms nutzt statt winzig quer zu
     * liegen. Dafuer tauschen Breite und Tiefe ihre Rolle. */
    const hoch = camera.aspect < 0.85 && breite > tiefe
    const passtHoch = Math.max(breite / 2 / Math.tan(halbFov), tiefe / 2 / (Math.tan(halbFov) * camera.aspect))
    if (b === 'oben') {
      zielen(mitte, (hoch ? passtHoch : passt) * 1.12 + r.hoehe, 0.0001, hoch ? -Math.PI / 2 : 0)
    } else if (b === 'schraeg') {
      zielen([mitte[0], r.hoehe * 0.2, mitte[2]], (hoch ? passtHoch * 1.75 : passt * 1.25) + r.hoehe, 0.95, hoch ? -0.55 - Math.PI / 2 : -0.55)
    } else {
      const k = hervorMitte(koerperJetzt)
      if (!k) return
      // Die Richtung der Kamera bleibt, nur naeher an die Kiste.
      const dx = camera.position.x - controls.target.x
      const dz = camera.position.z - controls.target.z
      // Steil von oben, damit Tuerblaetter und Moebel davor nicht verdecken.
      zielen(k, 4.2, 0.62, Math.hypot(dx, dz) > 0.01 ? Math.atan2(dx, dz) : -0.55)
    }
  }

  /* ------------------------------------------- Hintergrund, Aussenwelt */

  const hintergrundFarbe = new Color()
  let hintergrund: string | null = null
  let himmel: string | null = null
  /** Aussenwelt aus umgebung() (E82). Die aus welt() (E83) steht daneben in
   *  weltJetzt; jede Art nimmt nur ihre eigene wieder weg. */
  let umgebungJetzt: { gruppe: Object3D; nebel: Fog | null; himmel: string | null } | null = null
  function hintergrundSetzen() {
    const f = himmel ?? hintergrund
    if (!f) return
    hintergrundFarbe.set(f)
    scene.background = hintergrundFarbe
  }
  /** Nebel und Himmel: die der Welt, sonst die der Umgebung, sonst keine. */
  function aussenSetzen() {
    const a = weltJetzt ?? umgebungJetzt
    scene.fog = a?.nebel ?? null
    himmel = a?.himmel ?? null
    hintergrundSetzen()
  }

  function weltSetzen(w: Welt3D | null) {
    // E87b: geht die Welt, waehrend man faehrt, zuerst die Lage des
    // Fahrzeugs melden, wenn sie neu ist: noch in den Metern der alten Welt,
    // solange die Seite sie kennt (kommt keine neue, steigt man im naechsten
    // Bild aus, wird man abgebaut, ebenso). Kommt es in der neuen Welt
    // wieder, faehrt man weiter.
    if (fahrt && weltJetzt && w !== weltJetzt) fahrzeugLageMelden(fahrt.e)
    // Wo man beim Begehen steht, bevor die Ebenen neu kommen (E84); ging die
    // Welt eben erst weg (welt(null)), zaehlt die Stelle von davor.
    const vorher = gehen ? (weltMerk ?? ebeneMerken()) : null
    // Die Treppe, auf der man steht (E87), ueber ihre Kennung (E87b: auch
    // die, auf die man mit der Ebene wartet).
    const treppeId = gehen ? (treppeJetzt >= 0 ? treppen.liste[treppeJetzt].id : (treppeMerk ?? ebeneWarten?.treppe ?? null)) : null
    // E87b: wartete man schon auf eine Ebene, gilt fuer dieselbe die alte
    // Frist. Ohne neue Welt bleibt das Warten bis zum naechsten Bild stehen
    // (dort endet es mit weltMerk, wenn keine kam).
    const wartenAlt = ebeneWarten
    if (w) ebeneWarten = null
    weltMerk = null
    treppeMerk = null
    treppeJetzt = -1
    if (weltJetzt) scene.remove(weltJetzt.gruppe)
    // E87b: dingErzeugen fragt jede neue Welt wieder (einmal je Kennung).
    if (w !== weltJetzt) erzeugen.neu()
    weltJetzt = w
    weltKaputt = false
    weltLaeuft = false
    aufzug.ruhe()
    fahrtZiel = -1
    if (w) scene.add(w.gruppe)
    aussenSetzen()
    ebenen.setzen(w && Array.isArray(w.ebenen) ? w.ebenen : [])
    if (ebenen.verworfen) console.warn(`[3d] Welt: ${ebenen.verworfen} Hindernisse mit ungueltigen Zahlen uebergangen`)
    // E87: Stand der Daten, Treppen, Fahrzeuge und Dinge. Ding in der Hand
    // und Fahrzeug unter derselben Kennung in der neuen Welt weiter; ohne
    // Welt erst im naechsten Bild endgueltig (kommt bis dahin eine neue).
    weltVersion = versionLesen(w)
    weltTeileLesen(w)
    teilePruefen(w !== null)
    if (vorher) {
      // Ohne Welt: kommt vor dem naechsten Bild eine neue, steht man wieder
      // auf derselben Treppe.
      if (!w) treppeMerk = treppeId
      if (!w && !vorher.wohnung) {
        // Erst im naechsten Bild hinunter: kommt bis dahin eine neue Welt,
        // steht man dort wieder auf derselben Ebene, ohne Ruck.
        weltMerk = vorher
      } else {
        // E87b: gibt es die Ebene (noch) nicht, etwa ein Geschoss eines
        // Hauses der Stadt, das die neue Welt erst baut, darauf warten:
        // Stelle und Hoehe bleiben, nichts schiebt, nicht fallen. Aktiv ist
        // solange die naechste nach der Hoehe, nur als Platzhalter.
        const warten = w && !fahrt ? ebeneWartenAb(ebenen, vorher, typeof w.version === 'function', treppeId, performance.now(), wartenAlt) : null
        if (warten) {
          ebeneWarten = warten
          ebenen.wechseln(ebeneWiederfinden(ebenen, vorher))
          uebergang.an = false
          bodenY = warten.y
          vx = 0
          vz = 0
        } else {
          // Auf derselben Ebene bleiben (Kennung, nicht Hoehe: Haeuser haben
          // Geschosse gleicher Hoehe) und aus neuen Hindernissen heraus.
          const i = ebeneWiederfinden(ebenen, vorher)
          treppeJetzt = treppeWiederfinden(treppeId, i)
          ebeneAktivieren(i, fussUeberAuf(i))
          hoeheGleiten()
        }
      }
    }
    if (fahrt && fahrt.e.ebene >= 0 && ebenen.gibt(fahrt.e.ebene)) {
      // Im Fahrzeug (E87): auf seiner Ebene, ohne Gleiten.
      ebenen.wechseln(fahrt.e.ebene)
      treppeJetzt = -1
      uebergang.an = false
      bodenY = ebenen.boden()
    }
    ebeneMelden(false)
    anstossen()
  }

  const ro = new ResizeObserver(groesse)
  ro.observe(host)
  groesse()

  return {
    setzen(liste, farbe, ausrichten) {
      koerperJetzt = liste
      hintergrund = farbe
      hintergrundSetzen()
      bauen(liste)
      if (ausrichten) blick('schraeg')
      else anstossen()
    },
    blick,
    /* E87: Springen (Paket Physik), Fahren und Hinstellen. */
    hupfen,
    einsteigen,
    // E87b: true, wenn man danach zu Fuss ist; false, wenn kein Platz war.
    aussteigen,
    fahrSicht: fahrSichtSetzen,
    blaulicht: blaulichtSetzen,
    fahrzeug(fn) {
      fahrzeugFn = fn
      fzGemeldet.an = false
      fahrzeugMelden(performance.now(), true)
    },
    moeglich(fn) {
      moeglichFn = fn
      moeglichZuletzt = -1
      moeglichPruefen(true)
    },
    drehen,
    hinstellen() {
      hinstellenBei(null, null, false)
    },
    lage: lageSetzen,
    bewegt(fn) {
      bewegtFn = fn
    },
    waendeHalb(an) {
      halb = an
      anstossen()
    },
    hand(an) {
      handAn = an
      if (!an) renderer.domElement.style.cursor = ''
      controls.mouseButtons = an
        ? { LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE }
        : { LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN }
      controls.touches = an ? { ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_ROTATE } : { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN }
    },
    ziehen(fn, t) {
      ziehFn = fn
      traeger = t
      if (!fn) renderer.domElement.style.cursor = ''
    },
    begehen: gehenAn,
    lichter: lichterSetzen,
    lichtModus: modusSetzen,
    lichtRaeume,
    schalter(fn) {
      schalterFn = fn
    },
    tippen(fn) {
      tippFn = fn
    },
    gehenStick(x, y) {
      if (!eingabeAn) return
      stick.x = Math.max(-1, Math.min(1, x))
      stick.y = Math.max(-1, Math.min(1, y))
      if (gehen && Math.hypot(stick.x, stick.y) >= 0.05) {
        sitzendGehen()
        anstossen()
      }
    },
    gehenKnopf(richtung, an) {
      if (!gehen) return
      if (an && eingabeAn) {
        halten.add(richtung)
        sitzendGehen()
        anstossen()
      } else halten.delete(richtung)
    },
    eingabe(an) {
      eingabeAn = an
      if (!an) {
        halten.clear()
        stick.x = 0
        stick.y = 0
        bremse = false
        schauenLoslassen()
        tipp = null
      }
      anstossen()
    },
    haltung(fn) {
      haltungFn = fn
    },
    aufstehen,
    inHand(fn) {
      inHandFn = fn
    },
    ablegen,
    umgebung(u) {
      if (umgebungJetzt) scene.remove(umgebungJetzt.gruppe)
      umgebungJetzt = u ? { gruppe: u.gruppe, nebel: u.nebel ?? null, himmel: u.himmel ?? null } : null
      if (u) scene.add(u.gruppe)
      aussenSetzen()
      anstossen()
    },
    welt: weltSetzen,
    ebeneJetzt(fn) {
      ebeneFn = fn
      ebeneMelden(true)
    },
    ebeneWechseln,
    springen,
    leute(liste) {
      const neu = new Map<string, Figur3D>()
      for (const l of liste) neu.set(l.uid, l.figur)
      for (const [uid, m] of leuteNachUid) {
        const f = neu.get(uid)
        if (f === m.figur) continue
        leuteGruppe.remove(m.figur.gruppe)
        m.figur.dispose()
        if (f) {
          // Neue Figur fuer dieselbe Person: Stellung bleibt (wer ein
          // Fahrzeug lenkt, das es hier gibt, ist nicht zu sehen, E87b).
          m.figur = f
          f.gruppe.visible = m.hat && !personFz(m)
          leuteGruppe.add(f.gruppe)
        } else {
          // Weg: ein Fahrzeug, das sie lenkte, bleibt, wo es ist (E87).
          fernAus(m)
          leuteNachUid.delete(uid)
        }
      }
      for (const [uid, f] of neu) {
        if (leuteNachUid.has(uid)) continue
        f.gruppe.visible = false
        leuteGruppe.add(f.gruppe)
        leuteNachUid.set(uid, {
          uid,
          figur: f,
          ziel: { x: 0, y: AUGE_M, z: 0, gier: 0, neigung: 0, haltung: 'stehen', tempo: 0 },
          x: 0,
          y: AUGE_M,
          z: 0,
          gier: 0,
          tempo: 0,
          haltung: 'stehen',
          hat: false,
          zuletzt: 0,
          fahrzeug: null,
          lenkt: { x: 0, y: 0, z: 0, gier: 0 },
        })
      }
      leuteListe = [...leuteNachUid.values()]
      anstossen()
    },
    leutePose(uid, p) {
      const m = leuteNachUid.get(uid)
      if (!m) return
      const z = m.ziel
      z.x = p.x
      z.y = p.y
      z.z = p.z
      z.gier = p.gier
      z.neigung = p.neigung
      z.haltung = p.haltung
      z.tempo = p.tempo
      m.zuletzt = performance.now()
      // E87: lenkt sie ein Fahrzeug, faehrt es weich mit, und die Figur ist
      // nicht zu sehen; lenkt sie keins mehr, bleibt es stehen. E87b: nur,
      // wenn es das Fahrzeug hier gibt (und man nicht selbst darin sitzt);
      // sonst sitzt die Figur an ihrer Stellung, bis es kommt.
      const l = p.lenkt
      const lenkt = !!l && typeof l.id === 'string' && Number.isFinite(l.x) && Number.isFinite(l.y) && Number.isFinite(l.z) && Number.isFinite(l.gier)
      if (lenkt && l) {
        if (m.fahrzeug && m.fahrzeug !== l.id) fernAus(m)
        m.fahrzeug = l.id
        m.lenkt.x = l.x
        m.lenkt.y = l.y
        m.lenkt.z = l.z
        m.lenkt.gier = l.gier
        const e = personFz(m)
        if (e) fernFolgen(m, e)
      } else if (m.fahrzeug) {
        fernAus(m)
      }
      if (!m.hat) {
        // Die erste Stellung: gleich dort, ohne Gleiten.
        m.hat = true
        m.x = p.x
        m.y = p.y
        m.z = p.z
        m.gier = p.gier
        m.tempo = p.tempo
        m.haltung = p.haltung
      }
      m.figur.gruppe.visible = !personFz(m)
      anstossen()
    },
    ich(figur) {
      if (figur === ichFigur) return
      if (ichFigur) ichGruppe.remove(ichFigur.gruppe)
      ichFigur = figur
      if (figur) {
        figur.gruppe.traverse(aufEbeneEins)
        ichGruppe.add(figur.gruppe)
      }
      anstossen()
    },
    eigenePose(fn) {
      poseFn = fn
      if (fn && gehen) poseMelden(performance.now(), true)
      pulsPruefen()
    },
    spiegel(an) {
      spiegelAn = an
      anstossen()
    },
    dispose() {
      if (weg) return
      // E87b: zuerst melden, was man bewegt hat, solange die Abnehmer
      // (bewegt(): Speichern und Mitspieler) noch angeschlossen sind: aus
      // dem Fahrzeug aussteigen (es bleibt stehen, seine Lage geht hinaus)
      // und ein Ding in der Hand ablegen. Geht dabei etwas schief, wird
      // trotzdem abgebaut, aber nicht still.
      try {
        if (fahrt) fahrtEnde(null, true)
        if (halt.ding) ablegen()
      } catch (err) {
        console.error('[3d] Abbau: Fahrzeug oder Ding in der Hand nicht gemeldet:', err)
      }
      weg = true
      if (lauf) cancelAnimationFrame(lauf)
      lauf = 0
      window.clearTimeout(geraeteUhr)
      window.clearInterval(pulsUhr)
      window.removeEventListener('keydown', tasteRunter)
      window.removeEventListener('keyup', tasteHoch)
      window.removeEventListener('blur', fokusWeg)
      window.removeEventListener('keydown', sonderRunter, true)
      window.removeEventListener('keyup', sonderHoch, true)
      moeglichFn = null
      renderer.domElement.removeEventListener('pointerdown', schauRunter)
      renderer.domElement.removeEventListener('pointerdown', tippRunter)
      renderer.domElement.removeEventListener('pointerup', tippHoch)
      for (const l of punktLichter) l.dispose()
      for (const mat of leuchteMats.values()) mat.dispose()
      renderer.domElement.removeEventListener('pointermove', schauBewegen)
      renderer.domElement.removeEventListener('pointerup', schauHoch)
      renderer.domElement.removeEventListener('pointercancel', schauHoch)
      renderer.domElement.removeEventListener('pointerdown', zeigerLage)
      renderer.domElement.removeEventListener('pointermove', zeigerLage)
      renderer.domElement.removeEventListener('pointerleave', zeigerWeg)
      window.clearTimeout(ruheUhr)
      host.removeEventListener('pointerdown', ziehRunter, { capture: true })
      host.removeEventListener('pointermove', ziehBewegen, { capture: true })
      host.removeEventListener('pointerup', ziehHoch, { capture: true })
      host.removeEventListener('pointercancel', ziehHoch, { capture: true })
      controls.removeEventListener('start', anfang)
      controls.removeEventListener('end', ende)
      ro.disconnect()
      host.removeEventListener('wheel', radStopp)
      controls.removeEventListener('change', anstossen)
      controls.dispose()
      // E87: Fahrzeuge und Dinge der Welt zurueckgeben (die Welt gibt sie
      // frei), Vorschau aus.
      fahrt = null
      fahrzeugFn = null
      bewegtFn = null
      inHandFn = null
      geistAus()
      teileAbgleichen([], [])
      geistMatOk?.dispose()
      geistMatNein?.dispose()
      leeren()
      // Die Leute gehoeren dem Motor, die eigene Figur und die Aussenwelt
      // dem Aufrufer: nur herausnehmen.
      for (const m of leuteNachUid.values()) {
        leuteGruppe.remove(m.figur.gruppe)
        m.figur.dispose()
      }
      leuteNachUid.clear()
      leuteListe = []
      if (ichFigur) ichGruppe.remove(ichFigur.gruppe)
      ichFigur = null
      if (umgebungJetzt) scene.remove(umgebungJetzt.gruppe)
      umgebungJetzt = null
      if (weltJetzt) scene.remove(weltJetzt.gruppe)
      weltJetzt = null
      ebeneFn = null
      weltMerk = null
      ebeneWarten = null
      erzeugen.neu()
      blende?.remove()
      blende = null
      scene.fog = null
      tvTextur?.dispose()
      wasserTextur?.dispose()
      einheit.dispose()
      kanten.dispose()
      for (const g of formen.values()) g.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    },
  }
}

/** Geometrien und Materialien eines Objekts freigeben (die geteilten
 *  Einheits-Geometrien bleiben bis zum Ende). */
function wegwerfen(o: Object3D, ...geteilt: BufferGeometry[]) {
  o.traverse((x) => {
    const g = (x as Mesh).geometry as BufferGeometry | undefined
    if (g && !geteilt.includes(g)) g.dispose()
    const m = (x as Mesh).material as Material | Material[] | undefined
    if (Array.isArray(m)) m.forEach((y) => y.dispose())
    else m?.dispose()
  })
}
