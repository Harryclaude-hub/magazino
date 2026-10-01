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
import { hervorMitte, szeneRahmen, TUER_OFFEN_GRAD, type Koerper, type Licht3D, type Quader, type Vec3 } from './szene'
import { Hindernisse, KOERPER_RADIUS_M, type Stelle } from './kollision'
import type { Figur3D, Haltung, Pose3D } from './vertrag3d'

export type { Haltung, Pose3D, Figur3D } from './vertrag3d'

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

interface Ding {
  id: string
  teile: DingTeil[]
  cx: number
  cy: number
  cz: number
}

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
  /** Woran man beim Begehen stoesst (E82: Rechtecke in der Ebene). */
  const kollision = new Hindernisse(1)
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

  function groesse() {
    const w = Math.max(1, host.clientWidth)
    const h = Math.max(1, host.clientHeight)
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
  // Das Mausrad gehoert hier der Kamera, nicht der Seite oder dem Zeichner darunter.
  const radStopp = (e: WheelEvent) => e.stopPropagation()
  host.addEventListener('wheel', radStopp)

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

  function bauen(liste: Koerper[]) {
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

      const hindernis = istHindernis(k) ? kollision.dazu(k.mitte[0], k.mitte[2], k.masse[0], k.masse[2], k.drehY) : -1

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
          d = { id: k.ding, teile: [], cx: 0, cy: 0, cz: 0 }
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

    kollision.rastern()

    // Ein Ding in der Hand bleibt in der Hand, auch nach dem Neubau.
    if (halt.id) {
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

  /* Eigene Stellung melden (E82). */
  let poseFn: ((p: Pose3D) => void) | null = null
  const gemeldet = { x: 0, y: 0, z: 0, gier: 0, neigung: 0, haltung: 'stehen' as Haltung, tempo: 0, zeit: -Infinity }
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

  function poseMelden(jetzt: number, erzwingen: boolean) {
    if (!poseFn || !gehen) return
    const p = camera.position
    if (!erzwingen) {
      if (jetzt - gemeldet.zeit < POSE_MS) return
      const weiter = Math.hypot(p.x - gemeldet.x, p.y - gemeldet.y, p.z - gemeldet.z) > 0.02
      const gedreht = Math.abs(winkelDiff(gier, gemeldet.gier)) > POSE_DREH_RAD || Math.abs(neigung - gemeldet.neigung) > POSE_DREH_RAD
      // Stehengeblieben: einmal melden, damit die Beine der Figur anhalten.
      const steht = gemeldet.tempo > 0 && tempoJetzt() === 0
      if (!weiter && !gedreht && !steht && haltungJetzt === gemeldet.haltung && jetzt - gemeldet.zeit < POSE_PULS_MS) return
    }
    gemeldet.x = p.x
    gemeldet.y = p.y
    gemeldet.z = p.z
    gemeldet.gier = gier
    gemeldet.neigung = neigung
    gemeldet.haltung = haltungJetzt
    gemeldet.tempo = tempoJetzt()
    gemeldet.zeit = jetzt
    poseFn({ x: p.x, y: p.y, z: p.z, gier: winkelDiff(gier, 0), neigung, haltung: haltungJetzt, tempo: gemeldet.tempo })
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
      if (kollision.frei(tx, tz, KOERPER_RADIUS_M)) {
        x = tx
        z = tz
      }
    }
    platzJetzt = null
    wechselStarten(x, AUGE_M, z, gier, 0)
    haltungSetzen('stehen')
  }

  /** Ding in Lage (Mitte cx, cy, cz, Drehung dd gegenueber der Beschreibung). */
  function dingAnwenden(d: Ding, cx: number, cy: number, cz: number, dd: number) {
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
    if (halt.ding) return
    const lage = dingLage.get(d.id)
    halt.vonX = lage ? lage.x : d.cx
    halt.vonY = lage ? lage.y : d.cy
    halt.vonZ = lage ? lage.z : d.cz
    halt.vonD = lage ? lage.d : 0
    halt.relD = halt.vonD - gier
    halt.id = d.id
    halt.ding = d
    halt.laeuft = true
    halt.start = performance.now()
    inHandFn?.(d.id)
    anstossen()
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

  /** Ablegen: senkrecht unter der Hand auf das, was dort steht (ohne Glas
   *  und ohne das Ding selbst), sonst auf den Boden. Drehung bleibt. */
  function ablegen() {
    const d = halt.ding
    if (!d) return
    dingAnwenden(d, halt.x, halt.y, halt.z, halt.d)
    kasten.makeEmpty()
    for (const t of d.teile) {
      t.mesh.updateWorldMatrix(true, true)
      kasten.expandByObject(t.mesh, false)
    }
    const unten = kasten.isEmpty() ? halt.y : kasten.min.y
    hilf.set(halt.x, halt.y, halt.z)
    strahl.set(hilf, RUNTER)
    let boden = 0
    for (const hit of strahl.intersectObjects(gruppe.children, false)) {
      const u = daten(hit.object)
      if (!hit.object.visible || u.ding === d.id || u.glas) continue
      boden = Math.max(0, hit.point.y)
      break
    }
    halt.y += boden - unten
    dingAnwenden(d, halt.x, halt.y, halt.z, halt.d)
    dingLage.set(d.id, { x: halt.x, y: halt.y, z: halt.z, d: halt.d })
    halt.id = null
    halt.ding = null
    halt.laeuft = false
    inHandFn?.(null)
    anstossen()
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
        kollision.bewegen(stelle, vx * dt, vz * dt, KOERPER_RADIUS_M)
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
        unruhig = true
        if (echt) tempoMessen(dt)
      }
    }
    if (!wechsel.an) {
      const kb = 1 - Math.exp(-dt / BLICK_S)
      const dg = gierZiel - gier
      const dn = neigungZiel - neigung
      if (Math.abs(dg) > 1e-4 || Math.abs(dn) > 1e-4) {
        gier += dg * kb
        neigung += dn * kb
        unruhig = true
      } else {
        gier = gierZiel
        neigung = neigungZiel
      }
    }
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
    if (!f || !gehen) return
    const p = camera.position
    // Fuesse auf dem Boden, Gesaess auf dem Sitz, Ruecken auf der Liegeflaeche.
    const y = p.y - KAMERA_AUGE[haltungJetzt]
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
    if (gehen) {
      if (gehSchritt(dt, zeit, echt)) weiter = true
    } else {
      // Beim Begehen fuehrt gehSchritt die Kamera; update() wuerde sie zum
      // Ziel zurueckdrehen. Laeuft die Daempfung, meldet update() 'change'.
      controls.update()
    }
    if (tuerenSchritt(zeit)) weiter = true
    if (tuerBewegt) {
      // Geht eine Tuer zu, wo man steht, schiebt sie einen hinaus.
      if (gehen && haltungJetzt === 'stehen' && !wechsel.an) {
        stelle.x = camera.position.x
        stelle.z = camera.position.z
        kollision.herausdruecken(stelle, KOERPER_RADIUS_M)
        camera.position.x = stelle.x
        camera.position.z = stelle.z
      }
    }
    if (schubSchritt(zeit)) weiter = true
    if (leuteSchritt(dt, zeit)) weiter = true
    ichSchritt(zeit)
    spiegelPruefen()
    const geraete = geraeteSchritt(zeit)
    waendePruefen()
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
  }
  window.addEventListener('keydown', tasteRunter)
  window.addEventListener('keyup', tasteHoch)
  window.addEventListener('blur', fokusWeg)

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

  /* ------------------------------------------------------------ Tippen */

  /** Ein kurzer Klick (ohne Ziehen). Tueren, Schluessel, Schalter und
   *  Schubladen schalten; beim Begehen auch Geraete, Dinge und Plaetze.
   *  Davor stehende halbdurchsichtige Waende zaehlen nicht. */
  let tipp: { x: number; y: number; zeit: number } | null = null
  let tippFn: ((xCm: number, yCm: number, treffer: Treffer3D | null) => void) | null = null
  const tippRunter = (e: PointerEvent) => {
    tipp = e.button === 0 && eingabeAn ? { x: e.clientX, y: e.clientY, zeit: performance.now() } : null
  }
  const tippHoch = (e: PointerEvent) => {
    const t = tipp
    tipp = null
    if (!t || !eingabeAn || Math.hypot(e.clientX - t.x, e.clientY - t.y) > 5 || performance.now() - t.zeit > 500) return
    // Mit einem Ding in der Hand legt jeder Tipp es ab.
    if (gehen && halt.ding) {
      ablegen()
      return
    }
    strahl.setFromCamera(zeigerNdc(e), camera)
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
        const pl = u.platz ?? (u.objektId ? naechsterPlatz(u.objektId, hit.point.x, hit.point.z) : null)
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

  function gehenAn(an: boolean, start: [number, number] | null) {
    if (an === gehen) return
    if (an) {
      vorher = { pos: camera.position.clone(), ziel: controls.target.clone(), fov: camera.fov }
      // In die Richtung schauen, in die die Kamera eben geschaut hat.
      const dx = controls.target.x - camera.position.x
      const dz = controls.target.z - camera.position.z
      gier = Math.hypot(dx, dz) > 0.01 ? Math.atan2(-dx, -dz) : 0
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
      stelle.x = start ? start[0] / 100 : controls.target.x
      stelle.z = start ? start[1] / 100 : controls.target.z
      // Start mitten in einem Moebel: zur naechsten freien Stelle.
      kollision.herausdruecken(stelle, KOERPER_RADIUS_M)
      camera.position.set(stelle.x, AUGE_M, stelle.z)
      stehX = stelle.x
      stehZ = stelle.z
      camera.fov = 70
      camera.updateProjectionMatrix()
      camera.rotation.set(neigung, gier, 0, 'YXZ')
      ichGruppe.visible = true
      poseMelden(performance.now(), true)
      pulsPruefen()
      anstossen()
      return
    }
    // Was in der Hand ist, wird abgelegt; wer sitzt, steht auf.
    if (halt.ding) ablegen()
    gehen = false
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
    ratioSetzen(ratioStand)
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
  let umgebungJetzt: Object3D | null = null
  function hintergrundSetzen() {
    const f = himmel ?? hintergrund
    if (!f) return
    hintergrundFarbe.set(f)
    scene.background = hintergrundFarbe
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
      if (umgebungJetzt) scene.remove(umgebungJetzt)
      umgebungJetzt = u ? u.gruppe : null
      if (u) {
        scene.add(u.gruppe)
        scene.fog = u.nebel ?? null
        himmel = u.himmel ?? null
      } else {
        scene.fog = null
        himmel = null
      }
      hintergrundSetzen()
      anstossen()
    },
    leute(liste) {
      const neu = new Map<string, Figur3D>()
      for (const l of liste) neu.set(l.uid, l.figur)
      for (const [uid, m] of leuteNachUid) {
        const f = neu.get(uid)
        if (f === m.figur) continue
        leuteGruppe.remove(m.figur.gruppe)
        m.figur.dispose()
        if (f) {
          // Neue Figur fuer dieselbe Person: Stellung bleibt.
          m.figur = f
          f.gruppe.visible = m.hat
          leuteGruppe.add(f.gruppe)
        } else leuteNachUid.delete(uid)
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
      if (!m.hat) {
        // Die erste Stellung: gleich dort, ohne Gleiten.
        m.hat = true
        m.x = p.x
        m.y = p.y
        m.z = p.z
        m.gier = p.gier
        m.tempo = p.tempo
        m.haltung = p.haltung
        m.figur.gruppe.visible = true
      }
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
      weg = true
      if (lauf) cancelAnimationFrame(lauf)
      lauf = 0
      window.clearTimeout(geraeteUhr)
      window.clearInterval(pulsUhr)
      window.removeEventListener('keydown', tasteRunter)
      window.removeEventListener('keyup', tasteHoch)
      window.removeEventListener('blur', fokusWeg)
      renderer.domElement.removeEventListener('pointerdown', schauRunter)
      renderer.domElement.removeEventListener('pointerdown', tippRunter)
      renderer.domElement.removeEventListener('pointerup', tippHoch)
      for (const l of punktLichter) l.dispose()
      for (const mat of leuchteMats.values()) mat.dispose()
      renderer.domElement.removeEventListener('pointermove', schauBewegen)
      renderer.domElement.removeEventListener('pointerup', schauHoch)
      renderer.domElement.removeEventListener('pointercancel', schauHoch)
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
      if (umgebungJetzt) scene.remove(umgebungJetzt)
      umgebungJetzt = null
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
