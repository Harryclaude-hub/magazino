/* Die Siedlung in 3D (E83). Ein eigener Bereich neben den Umzuegen: die
 * Haeuser rund um die eigene Wohnung, die Wohnung selbst darin, begehbar
 * mit Laubengang, Stiegenhaus und Aufzug. Alles kommt aus den Daten der
 * Siedlung (Datenbank); welche Haeuser, wo und welche Wohnung steht nie im
 * Code.
 *
 * Koordinaten: die Siedlung rechnet lokal in Metern um ihren Mittelpunkt,
 * x nach Osten, z nach Sueden, y nach oben, Gelaende bei y = 0. Die Wohnung
 * liegt in der Welt am Ursprung, ihr Boden bei y = 0 (wie szene.ts). Darum
 * steckt alles in einer Gruppe, die die Lage der Wohnung umkehrt: gedreht
 * um drehung, verschoben und um geschoss * geschossHoehe abgesenkt. Ohne
 * Wohnung steht die Siedlung mittig, das Gelaende bei 0. Ebenen,
 * Hindernisse und die Kabine des Aufzugs kommen in Weltkoordinaten heraus.
 *
 * Was entsteht:
 * - Himmel und Dunst wie in aussen3d.ts, eine Wiese (mit Loch fuer die
 *   Rampe der Tiefgarage), die Strasse mit Gehsteigen und Bordsteinen an
 *   der Seite, an der die meisten Haeuser in einer Flucht stehen, Hecken
 *   davor, Wege aus aussen.wege, ein Parkplatz mit Autos, die Rampe mit
 *   Seitenwaenden und Gelaender, der Spielplatz (Schaukel, Sandkiste,
 *   Spielturm, Baenke), Baeume mit runden Kronen in Herbstfarben, Buesche,
 *   Laternen und ein paar schlichte Nachbarhaeuser.
 * - Jedes Haus aus seinem Umriss: Waende je Geschoss, Sockel, Attika,
 *   Flachdach (begruent, mit Photovoltaik und Lichtkuppeln), Fenster etwa
 *   alle 2,6 m mit Abstand zu den Ecken, ein Eingang zur Strasse. Stil
 *   weiss_loggia: weisser Putz, Eckloggien mit gelben Innenwaenden,
 *   Balkone mit Metallgelaender; holz: rotbraune senkrechte Schalung,
 *   weniger Fenster, eine Loggia; putz und grau: heller Putz, putz mit
 *   eingeschnittenen Loggien.
 * - Das eigene Haus (das der Wohnung) dazu mit offenem Laubengang an der
 *   Nordseite in jedem Obergeschoss (Platte, Gelaender, Saeulen), einem
 *   Kern aus Stiegenhaus und Aufzug an einem Ende des Gangs (Schacht mit
 *   Tueren, Kabine mit Knoepfen) und Wohnungstueren am Gang. Wo die eigene
 *   Wohnung liegt (wohnungRahmen und 15 cm Rand, auf ihrem Geschoss von
 *   -0,02 bis geschossHoehe - 0,05), steht nichts davon: dort zeigt die
 *   Szene der Wohnung ihre echten Waende.
 *
 * Billig fuers Handy: keine Texturen, Farben je Ecke, alles Starre in
 * wenigen Meshes (7 Zeichenaufrufe und zwei je Geschoss fuer die Knoepfe),
 * unter 150 000 Dreiecke. Gleiche Daten geben dieselbe Welt (Zufall mit
 * Saat aus den Umrissen, kein Math.random). Pruefung ohne Browser:
 * node scripts/siedlung-pruefen.mjs
 *
 * Einbau (Motor): gruppe in die Szene, scene.fog = nebel, Hintergrund
 * himmel, Ebenen und Knoepfe wie in vertrag3d.ts. Ebenen: zuerst die
 * Geschosse des eigenen Hauses (Index = Geschoss, 0 = EG, die Ebene der
 * Wohnung heisst 'wohnung' und liegt bei 0), zuletzt 'garten' (Gelaende,
 * gleiche Hoehe wie das EG). Jedes Bild schritt(dt, kameraY) rufen; true
 * heisst, der Aufzug bewegt sich noch. Zusaetzlich traegt das Ergebnis:
 * - fahrt(): waehrend einer Fahrt (Tueren zu, fahren, Tueren auf am Ziel)
 *   { ziel, y } mit dem Index der Ziel-Ebene und der Bodenhoehe der Kabine
 *   in Weltmetern (wie Ebene3D.y), sonst null. Steht die Kamera in der
 *   Kabine, setzt der Motor ihre Hoehe auf y plus Augenhoehe.
 * - kabine: Grundriss der Kabine innen in Weltmetern (x0, z0, x1, z1) oder
 *   null ohne Aufzug, damit der Motor weiss, ob die Kamera mitfaehrt.
 * aufzugZiel(w) meldet genau einmal je Ankunft den Index der Ebene, an der
 * die Tueren aufgehen; steht die Kamera in der Kabine, wechselt der Motor
 * dann auf diese Ebene. Die Hindernisse sind fest: die Luecke in der
 * Schachtwand an der Tuer ist immer offen, auch wenn die Kabine woanders
 * ist. Beim Abbau dispose().
 *
 * Innen (E84): Haeuser mit Plaenen (siedlung.innen) sind 1:1 begehbar,
 * jede Wohnung leer bis auf Kueche und Bad, mit Gang, Laubengang, Stiege
 * und eigenem Aufzug je Haus. Aus den Raeumen werden Waende (jede
 * gemeinsame Kante nur einmal: 10 cm in der Wohnung, 20 cm zwischen
 * Wohnungen und zu Gang und Stiege, 30 cm aussen und zu Loggia, Balkon,
 * Laubengang), Tueren mit Zarge und offenem Blatt (80 Grad, an der Angel
 * wie in Fundkiste: links = am Anfang der Kante), Wohnungstueren mit breiter
 * Zarge, Fenster mit Bruestung, Rahmen und Glas, Durchgaenge als Luecken,
 * Boeden je Raum (Eiche, Fliesen in Bad, WC und Vorraum, Holzdeck,
 * Beton, Pflaster, Rasen), Decken, Gelaender, Treppenlaeufe und Schaechte.
 * Gerechnet wird beim Bauen der Welt nur das Noetige fuer Ebenen und
 * Sprungziele; die Meshes eines Hauses entstehen erst, wenn die Kamera
 * hineingeht (kamera()), Stueck fuer Stueck in schritt() (je Bild
 * hoechstens BAU_MS, das Geschoss der Kamera zuerst). Solange die Kamera in
 * einem Haus (oder bis 2 m davor, oder in seinem Garten) ist, zeigt es sein
 * Inneres und die Fassade (Huelle) ist weg; das Dach bleibt. Auf dem
 * Geschoss der eigenen Wohnung fallen Wohnungen weg, die zu mehr als 40 %
 * in ihrem Rechteck liegen, und alles im Rechteck wird ausgespart.
 *
 * Ebenen mit Plaenen: zuerst 'boden' (Garten und alle Erdgeschosse, durch
 * die Haustuer hinein; liegt die Wohnung im EG, heisst sie 'wohnung'),
 * dann die Obergeschosse des eigenen Hauses, dann je Haus mit Plaenen
 * '<gebaeudeId>:<k>' (die der Wohnung heisst 'wohnung', bei y = 0). Ohne
 * Plaene bleibt alles wie oben (E83). fahrt() meldet den Aufzug, in dessen
 * Kabine die Kamera steht; ziel ist immer der Index in ebenen: nach der
 * Fahrt genau auf diese Ebene wechseln (Haeuser haben gleiche Hoehen).
 * sprungziele: je Wohnung mit Eingang 0,8 m vor ihrer Tuer mit Blick
 * darauf, je Haus vor der Haustuer, der Spielplatz. Der Motor ruft jedes
 * Bild beim Begehen kamera(x, y, z) mit der Kamera in Weltmetern, beim
 * Verlassen des Begehens kamera(NaN, NaN, NaN).
 *
 * Gemeinsam (E86): Gaeste sehen die Siedlung ohne die eingerichtete
 * Wohnung des Besitzers. Sie bekommen dieselbe siedlung.wohnung, aber
 * wohnungRahmen null. Die Lage (Drehung, Verschiebung, Absenkung) haengt
 * nur an siedlung.wohnung, so stehen alle in derselben Welt; nur ohne
 * siedlung.wohnung steht die Siedlung mittig. Ohne Rahmen wird nichts
 * ausgespart: die Fassade bleibt zu, die geplante (leere) Wohnung aus
 * siedlung.innen bleibt stehen, und die Ebene dieses Geschosses heisst wie
 * jede andere ('geschoss-<k>', 'boden' oder '<gebaeudeId>:<k>'); 'wohnung'
 * heisst sie nur mit Rahmen. Das erste Sprungziel heisst immer 'Start':
 * vor der Haustuer des Hauses der Wohnung (sonst des ersten Hauses mit
 * Eingang, sonst auf dem Gehsteig vor der Mitte), dort beginnen Gaeste.
 * karte: Umrisse fuer die Minikarte in Weltmetern (x, z), siehe Karte3D;
 * Flaechen in der Reihenfolge zum Malen (Strasse und Parkplatz, Gaerten,
 * Wege, Spielplatz), Wege aus aussen.wege mit 1,5 m Puffer je Seite, die
 * Strasse nur so lang wie die Karte breit, der Rahmen mit 5 m Rand um
 * alles. Sie haengt nicht am Rahmen der Wohnung.
 *
 * Begehbar (E87): Treppen in jedem Stiegenhaus als Treppe3D, zwei Laeufe
 * je Geschoss mit Zwischenpodest; jedes Podest ist eine eigene Ebene
 * '<gebaeudeId>:<k>.5', hinten an die Ebenen gehaengt (die Indizes davor
 * bleiben). Im Kern des eigenen Hauses ohne Plaene sind es die Laeufe, die
 * er immer schon zeigt; in Haeusern mit Plaenen legt treppeLegen sie in
 * die Stiege (Antritt an der Seite zum Gang, sonst ein Podest davor). Eine
 * Stiege ohne passende Treppe (zu schmal, zu kurz, ohne Gang) bleibt zu.
 * Haeuser ohne Plaene fragen innenGenerator.ts nach erfundenen Wohnungen
 * und werden dann gebaut wie Haeuser mit Plaenen (das eigene mit Kern und
 * Laubengang als allgemeinen Flaechen). Die Autos am Parkplatz sind
 * Fahrzeuge (fahrzeug3d.ts, 'siedlung:f:<x>:<z>:<art>' aus dem Stellplatz),
 * dazu etwa zehn Dinge zum Aufheben auf dem Spielplatz und in Gaerten
 * ('siedlung:d<n>:<art>', n die Stelle in einer festen Liste), beide in
 * Weltkoordinaten direkt in gruppe und ohne Hindernisse (die kennt der
 * Motor). dingErzeugen baut ein Ding allein aus seiner Kennung (die der
 * Stadt baut die Stadt); rahmen rechnet Weltmeter in Siedlungsmeter und
 * zurueck, unabhaengig von der Lage der Wohnung (E87b). eigeneWohnung: ein
 * freies Ziel in der geplanten Wohnung, in der die eigene liegt (nur ohne
 * Rahmen). Mit siedlung.stadt baut stadt3d.ts
 * die Umgebung: ihre Gruppe in gruppe, Gelaende (hoehe) und Hindernisse
 * auf der Ebene des Bodens (Index 0, ohne Plaene mit eigenem Haus auch auf
 * 'garten'; die eigenen Ziele draussen liegen dann auch auf Index 0), ihre
 * Ebenen, Treppen, Fahrzeuge, Dinge und Sprungziele hinter den eigenen,
 * die Karte vereint; version() zaehlt hoch, wenn die Stadt
 * Neues hat, kamera() und schritt() reichen weiter. Die Hindernisse am
 * Boden bleiben dasselbe Feld, solange die Stadt ihres behaelt (der Motor
 * rastert sie dann nicht neu). Unter dem eigenen Grund (um Haeuser,
 * Spielplatz und Wege) und in der Grube der Rampe zeichnet die Stadt kein
 * Gelaende (aussparen). Niedriges draussen (Baenke, Sandkiste, Buesche,
 * Hecken) hat eine Oberkante: hinaufsteigen oder -springen geht. Dann faellt die eigene
 * weite Umgebung weg (Strasse, Hecken, Laternen, erfundene Nachbarn, Wiese
 * bis 300 m), Dunst und Himmel reichen bis etwa 700 m. Laesst sich die
 * Stadt nicht bauen, steht die Siedlung wie ohne und stadtFehler sagt
 * warum. Ohne Stadt bleibt alles wie zuvor; scripts/siedlung-pruefen.mjs
 * vergleicht dazu mit einem Abdruck des Stands vor E87. */
import {
  BackSide,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Fog,
  Group,
  IcosahedronGeometry,
  Matrix3,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  ShapeUtils,
  Sphere,
  SphereGeometry,
  Vector2,
  Vector3,
  type Material,
  type Object3D,
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { Siedlung, SiedlungGebaeude, SiedlungInnenGeschoss, SiedlungInnenHaus, SiedlungStil } from '../../lib/types'
import { wohnhausInnen } from '../../lib/innenGenerator.ts'
import { stadtPruefen } from '../../lib/stadt.ts'
import { baueFahrzeug } from './fahrzeug3d.ts'
import type { Farben3D } from './szene.ts'
import { baueStadt, type StadtOptionen, type StadtWelt } from './stadt3d.ts'
import type { Ebene3D, Fahrzeug3D, FahrzeugArt, Hindernis3D, Interaktiv3D, Karte3D, Sprungziel3D, Treppe3D, Welt3D, WeltDing3D } from './vertrag3d.ts'

export interface SiedlungOptionen {
  siedlung: Siedlung
  farben: Farben3D
  /** Umriss der eigenen Wohnung in Weltmetern (x0, z0, x1, z1) um die
   *  Fassade dort auszusparen. null ohne Wohnung und fuer Gaeste (E86):
   *  die Lage bleibt die von siedlung.wohnung, ausgespart wird nichts. */
  wohnungRahmen: [number, number, number, number] | null
  /** Nur fuer Pruefungen (E87): statt baueStadt aus stadt3d.ts. */
  stadtBauen?: (o: StadtOptionen) => StadtWelt
  /** Nur fuer Pruefungen (E87): statt wohnhausInnen aus innenGenerator.ts. */
  innenErfinden?: typeof wohnhausInnen
}

/** Was baueSiedlung zurueckgibt: eine Welt3D mit Aufzuegen und Kamera. */
export interface SiedlungWelt3D extends Welt3D {
  /** Waehrend einer Fahrt des Aufzugs, in dessen Kabine die Kamera steht
   *  (ohne kamera(): des ersten Aufzugs): ziel ist der Index der Ebene in
   *  ebenen, zu der er faehrt, y der Boden der Kabine (Weltmeter, wie
   *  Ebene3D.y). Sonst null. */
  fahrt(): { ziel: number; y: number } | null
  /** Kabine innen (Weltmeter x0, z0, x1, z1): die, in der die Kamera steht,
   *  sonst die naechste; ohne kamera() die des ersten Aufzugs; null ohne. */
  readonly kabine: [number, number, number, number] | null
  /** Die Kamera beim Begehen (Weltmeter, y = Augenhoehe), jedes Bild. Ist
   *  sie in einem Haus mit Plaenen (oder bis 2 m davor), zeigt es sein
   *  Inneres (beim ersten Mal gebaut) statt der Fassade. NaN (etwa beim
   *  Verlassen des Begehens): nur Fassaden. */
  kamera(x: number, y: number, z: number): void
  /** Das erste heisst 'Start' (E86). */
  sprungziele: Sprungziel3D[]
  /** Fuer die Minikarte (E86), immer da. */
  karte: Karte3D
  /* E87 */
  /** Index in sprungziele eines freien Ziels in der geplanten (leeren)
   *  Wohnung, in der die eigene liegt (siedlung.wohnung), wenn kein
   *  wohnungRahmen da ist; null ohne Wohnung oder mit Rahmen (dann zeigt
   *  die Szene die eingerichtete Wohnung selbst, Ebene 'wohnung'). */
  readonly eigeneWohnung: number | null
  /** Treppen der Siedlung (Stiegenhaeuser), dahinter die der Stadt. */
  readonly treppen: Treppe3D[]
  /** Autos am Parkplatz, dahinter die der Stadt. */
  readonly fahrzeuge: Fahrzeug3D[]
  /** Dinge auf Spielplatz und in Gaerten, dahinter die der Stadt. */
  readonly dinge: WeltDing3D[]
  version(): number
  /** Die Stadt ringsum (siedlung.stadt) liess sich nicht bauen: warum.
   *  Dann steht die Siedlung wie ohne Stadt. Sonst null. */
  readonly stadtFehler: string | null
  /** E87b: Umrechnung Weltmeter <-> Siedlungsmeter. siedlung_dinge
   *  speichert Lagen in Siedlungsmetern; die Oberflaeche rechnet beim Laden
   *  (zuWelt) und Speichern (zuSiedlung) damit um. */
  readonly rahmen: SiedlungRahmen
  /** E87b: wie Welt3D.dingErzeugen; Dinge der Siedlung
   *  ('siedlung:d<n>:<art>') baut sie selbst, die der Stadt die Stadt. */
  dingErzeugen(id: string): WeltDing3D | null
}

/** Weltmeter <-> Siedlungsmeter (E87b). Siedlungsmeter: x Osten, z Sueden
 *  (wie die Daten der Siedlung und der Stadt), y ueber dem Boden der
 *  Siedlung (0), gier wie Pose3D (0 = Blick nach -z), Winkel in (-pi, pi].
 *  Beide Richtungen geben [x, y, z, gier]. */
export interface SiedlungRahmen {
  zuSiedlung(x: number, y: number, z: number, gier: number): [number, number, number, number]
  zuWelt(x: number, y: number, z: number, gier: number): [number, number, number, number]
}

/* ------------------------------------------------ Zahlen */

/** Hoechstens so viele Dinge baut dingErzeugen der Siedlung dazu (E87b;
 *  jedes kostet einen Zeichenaufruf). */
const EIGENE_DINGE_MAX = 100

/** Dunst: ab hier beginnt er, hier ist alles Himmelfarbe (Meter). */
const NEBEL_NAH = 80
const NEBEL_FERN = 270
/** Himmelskugel (folgt der Kamera, der Motor hat far 400) und Wiese. */
const HIMMEL_R = 280
const WIESE_R = 300
/** Mit Stadt (E87): Sicht bis etwa 700 m, die Himmelskugel dahinter. Sie
 *  schrumpft, wenn die Kamera nicht so weit sieht (far). */
const NEBEL_STADT_NAH = 220
const NEBEL_STADT_FERN = 700
const HIMMEL_R_STADT = 760
/** Mit Stadt: so weit reicht der eigene Grund (Wiese) ueber alles hinaus,
 *  was die Siedlung baut, und so weit die eigenen Baeume (Meter). */
const GRUND_RAND = 6
const BAUM_RAND_STADT = 4
/** Mit Stadt: um Haeuser, Spielplatz und Wege bis hier (Meter, kleiner als
 *  GRUND_RAND, also ganz unter der eigenen Wiese) zeichnet die Stadt kein
 *  Gelaende (StadtOptionen.aussparen). */
const KERN_RAND = 2
/** Oberkante jeder Gehflaeche (Gang, Wege, Stiegenhaus) unter ihrer Ebene. */
const GEH = -0.02
/** Wiese, darunter (die Gehflaechen liegen 2 cm darueber). */
const WIESE_Y = -0.04
const WAND = 0.3
/** So viel groesser als wohnungRahmen bleibt die Wohnung frei. */
const RAND = 0.15
/** Tiefe des Laubengangs ab der Fassade. */
const GANG = 1.6
/** Deckenplatten im Gang: von GEH - PLATTE bis GEH. */
const PLATTE = 0.28
const ATTIKA = 0.75
/** Oberkante des Dachaufbaus ueber der Hoehe des Hauses. */
const DACH = 0.25
const FENSTER_ABSTAND = 2.6
const ECKE_FREI = 1.3
/** Luecke in der Fassade am Gang vor der Wohnungstuer (Hindernisse). */
const TUER_LUECKE = 1.2
/** Aufzug: Tueren auf oder zu, Fahrt je Geschoss, Halt bei weiteren Wuenschen. */
const TUER_ZEIT = 0.6
const FAHRT_JE_GESCHOSS = 1.2
const HALTE_ZEIT = 2.5
/** Strasse: halbe Laenge, Vorgarten, Gehsteig, Bordstein, Fahrbahn (Meter). */
const STRASSE_HALB = 200
const VORGARTEN = 2.6
const GEHSTEIG = 2.0
const BORD = 0.15
const FAHRBAHN = 6.5
const WEG_BREIT = 1.8
/** Minikarte (E86): Rand um alles, Puffer der Wege je Seite (Meter). */
const KARTE_RAND = 5
const KARTE_WEG = 1.5
const EPS = 1e-6

/* Kern aus Aufzug und Stiegenhaus am Ende des Laubengangs: x laengs des
 * Gangs vom aeusseren Ende des Kerns, s quer von der Fassade nach aussen.
 * Schacht x 0 bis 2,3 mit Tuer 0,65 bis 1,65; Geschosspodest 2,3 bis 3,4;
 * zwei Laeufe (je 9 Steigungen) bis 5,48, Zwischenpodest bis 6,6, Wand
 * bis 6,8. Der Kern steht vor dem Gang, s 1,6 bis 4,4. */
const K_LAENGE = 6.8
const K_S0 = GANG
const K_S1 = GANG + 2.8
const K_WAND = 0.2
const K_SCHACHT = 2.3
const K_TUER0 = 0.65
const K_TUER1 = 1.65
const K_TUER_H = 2.15
const K_PODEST = 3.4
const K_LAUF = 5.48
const K_ZWISCHEN = 6.6
const K_LAUF_A: [number, number] = [1.65, 2.85]
const K_LAUF_B: [number, number] = [2.95, 4.15]
/** Kabine aussen: x0, x1, s0, s1. */
const KAB: [number, number, number, number] = [0.25, 2.05, 1.9, 4.1]
const KAB_H = 2.3
/** Treppen im Kern zum Begehen (E87): Auftritt der Stufen; jeder Lauf
 *  (Treppe3D) beginnt einen halben Auftritt vor der ersten Stufe und endet
 *  einen halben hinter der letzten, so laeuft seine Linie durch die Mitten
 *  der Stufen (hoechstens eine halbe Steigung daneben). */
const K_TRITT = 0.26
const K_T0 = K_PODEST - K_TRITT / 2
const K_T1 = K_LAUF + K_TRITT / 2

const STILE: SiedlungStil[] = ['weiss_loggia', 'holz', 'putz', 'grau']

/* ------------------------------------------------ Formen */

/** Punkt im Plan (x, z), Meter. */
type P = [number, number]
type V3 = [number, number, number]
/** Eine Farbe fuer alles oder je Seite eines Quaders eine (Puffer.quader). */
type Farbe = Color | readonly Color[]
/** Rechteck im Plan: x0, z0, x1, z1. */
type Kasten = [number, number, number, number]

/** Eine gerade Linie mit Richtung u und Normale n (Einheitsvektoren). An
 *  einer Hauswand zeigt n nach aussen. t misst laengs, s quer. */
interface Kante {
  a: P
  u: P
  n: P
  laenge: number
}

/** Rechteck an einer Kante (t0..t1 laengs, s0..s1 quer). */
interface KRechteck {
  k: Kante
  t0: number
  t1: number
  s0: number
  s1: number
  /** E87: Oberkante (Meter ueber dem Boden) fuer Niedriges, auf das man
   *  steigen oder springen kann (Bank, Sandkiste, Busch, Hecke); fehlt: wie
   *  eine Wand (Hindernis3D.oben). */
  oben?: number
}

/** Was frei bleibt: Rechteck im Plan und Hoehen, beides lokal. */
interface Schnitt {
  r: Kasten
  y0: number
  y1: number
}

interface Haus {
  g: SiedlungGebaeude
  stil: SiedlungStil
  poly: P[]
  kanten: Kante[]
  gh: number
  n: number
  H: number
}

interface Rampe {
  x: number
  z: number
  breite: number
  laenge: number
  drehung: number
}

function zahl(v: unknown, was: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`Siedlung: ${was} ist keine endliche Zahl`)
  return v
}

function ordnen(r: readonly number[], was: string): Kasten {
  if (!Array.isArray(r) || r.length !== 4) throw new Error(`Siedlung: ${was} braucht vier Zahlen`)
  for (let i = 0; i < 4; i++) zahl(r[i], `${was}[${i}]`)
  return [Math.min(r[0], r[2]), Math.min(r[1], r[3]), Math.max(r[0], r[2]), Math.max(r[1], r[3])]
}

function punkt(v: unknown, was: string): P {
  if (!Array.isArray(v) || v.length < 2) throw new Error(`Siedlung: ${was} ist kein Punkt`)
  return [zahl(v[0], `${was} x`), zahl(v[1], `${was} z`)]
}

/** Flaeche mit Vorzeichen (Schnuersenkel in x und z). */
function flaecheVon(poly: P[]): number {
  let a = 0
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]
    const q = poly[(i + 1) % poly.length]
    a += p[0] * q[1] - q[0] * p[1]
  }
  return a / 2
}

function innen(p: P, poly: P[]): boolean {
  let drin = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    if (a[1] > p[1] !== b[1] > p[1] && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) drin = !drin
  }
  return drin
}

function abstandStrecke(p: P, a: P, b: P): number {
  const dx = b[0] - a[0]
  const dz = b[1] - a[1]
  const l2 = dx * dx + dz * dz
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2)) : 0
  return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dz * t)
}

/** Schneiden sich die Strecken ab und cd echt (ohne blosses Beruehren)? */
function kreuzen(a: P, b: P, c: P, d: P): boolean {
  const o = (p: P, q: P, r: P) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
  const d1 = o(c, d, a)
  const d2 = o(c, d, b)
  const d3 = o(a, b, c)
  const d4 = o(a, b, d)
  return d1 > 0 !== d2 > 0 && d3 > 0 !== d4 > 0 && d1 !== 0 && d2 !== 0 && d3 !== 0 && d4 !== 0
}

/** Kleinster Abstand zweier Linienzuege (geschlossen ab drei Punkten, sonst
 *  eine Strecke); 0, wenn sie sich ueberlappen oder schneiden. */
function abstandFormen(a: P[], b: P[]): number {
  const kanten = (f: P[]): [P, P][] => (f.length < 3 ? [[f[0], f[f.length - 1]]] : f.map((p, i) => [p, f[(i + 1) % f.length]]))
  const ka = kanten(a)
  const kb = kanten(b)
  if (b.length >= 3 && a.some((p) => innen(p, b))) return 0
  if (a.length >= 3 && b.some((p) => innen(p, a))) return 0
  for (const [p, q] of ka) for (const [r, s] of kb) if (kreuzen(p, q, r, s)) return 0
  let d = Infinity
  for (const p of a) for (const [r, s] of kb) d = Math.min(d, abstandStrecke(p, r, s))
  for (const p of b) for (const [r, s] of ka) d = Math.min(d, abstandStrecke(p, r, s))
  return d
}

/** Konvexes Vieleck auf der Seite nx * x + nz * z >= d halten. */
function halbebene(poly: P[], nx: number, nz: number, d: number): P[] {
  const out: P[] = []
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const fa = nx * a[0] + nz * a[1] - d
    const fb = nx * b[0] + nz * b[1] - d
    if (fa >= 0) out.push(a)
    if (fa >= 0 !== fb >= 0) {
      const t = fa / (fa - fb)
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
    }
  }
  return out
}

function kp(k: Kante, t: number, s: number): P {
  return [k.a[0] + k.u[0] * t + k.n[0] * s, k.a[1] + k.u[1] * t + k.n[1] * s]
}

/** Kante von a nach b; n ist ohne Angabe u um 90 Grad gedreht. */
function kanteVon(a: P, b: P, n?: P): Kante {
  const l = Math.hypot(b[0] - a[0], b[1] - a[1])
  const u: P = l > 0 ? [(b[0] - a[0]) / l, (b[1] - a[1]) / l] : [1, 0]
  return { a, u, n: n ?? [u[1], -u[0]], laenge: l }
}

/** Querkante bei t: laengs zeigt sie nach aussen (n der Kante), quer nach +t. */
function quer(k: Kante, t: number, s = 0): Kante {
  return { a: kp(k, t, s), u: k.n, n: k.u, laenge: 0 }
}

/** Dieselbe Kante, um s nach aussen verschoben. */
function versetzt(k: Kante, s: number): Kante {
  return { a: kp(k, 0, s), u: k.u, n: k.n, laenge: k.laenge }
}

function rechteckForm(r: KRechteck): P[] {
  return [kp(r.k, r.t0, r.s0), kp(r.k, r.t1, r.s0), kp(r.k, r.t1, r.s1), kp(r.k, r.t0, r.s1)]
}

function kastenRechteck(x0: number, z0: number, x1: number, z1: number): KRechteck {
  return { k: { a: [x0, z0], u: [1, 0], n: [0, 1], laenge: x1 - x0 }, t0: 0, t1: x1 - x0, s0: 0, s1: z1 - z0 }
}

function wachsen(r: KRechteck, d: number): KRechteck {
  return { k: r.k, t0: r.t0 - d, t1: r.t1 + d, s0: r.s0 - d, s1: r.s1 + d }
}

/** Kanten eines Umrisses mit Normale nach aussen. */
function kantenVon(poly: P[]): Kante[] {
  const links = flaecheVon(poly) > 0
  return poly.map((a, i) => {
    const b = poly[(i + 1) % poly.length]
    const k = kanteVon(a, b)
    k.n = links ? [k.u[1], -k.u[0]] : [-k.u[1], k.u[0]]
    return k
  })
}

/** Wo das Rechteck r (lokal, achsenparallel) die Flaeche t0..t1, s0..s1 an
 *  der Kante k trifft, als Rahmen (ta, tb, sa, sb); null ohne Flaeche. */
function treffer(k: Kante, t0: number, t1: number, s0: number, s1: number, r: Kasten): [number, number, number, number] | null {
  let poly: P[] = (
    [
      [r[0], r[1]],
      [r[2], r[1]],
      [r[2], r[3]],
      [r[0], r[3]],
    ] as P[]
  ).map(([x, z]) => {
    const dx = x - k.a[0]
    const dz = z - k.a[1]
    return [dx * k.u[0] + dz * k.u[1], dx * k.n[0] + dz * k.n[1]] as P
  })
  poly = halbebene(poly, 1, 0, t0)
  poly = halbebene(poly, -1, 0, -t1)
  poly = halbebene(poly, 0, 1, s0)
  poly = halbebene(poly, 0, -1, -s1)
  if (poly.length < 3 || Math.abs(flaecheVon(poly)) < 1e-9) return null
  let ta = Infinity
  let tb = -Infinity
  let sa = Infinity
  let sb = -Infinity
  for (const [t, s] of poly) {
    ta = Math.min(ta, t)
    tb = Math.max(tb, t)
    sa = Math.min(sa, s)
    sb = Math.max(sb, s)
  }
  return [ta, tb, sa, sb]
}

/** Ein Rechteck ohne den Teil im Rechteck r (lokal), als Stuecke. */
function ohne(h: KRechteck, r: Kasten | null): KRechteck[] {
  if (!r) return [h]
  const tr = treffer(h.k, h.t0, h.t1, h.s0, h.s1, r)
  if (!tr) return [h]
  const [ta, tb, sa, sb] = tr
  return [
    { ...h, t1: ta },
    { ...h, t0: tb },
    { ...h, t0: ta, t1: tb, s1: sa },
    { ...h, t0: ta, t1: tb, s0: sb },
  ].filter((x) => x.t1 - x.t0 > 0.01 && x.s1 - x.s0 > 0.01)
}

/** Intervalle [a, b] ohne die Luecken. */
function abziehen(von: [number, number], weg: [number, number][]): [number, number][] {
  let stuecke: [number, number][] = [von]
  for (const [a, b] of weg) {
    const neu: [number, number][] = []
    for (const [x, y] of stuecke) {
      if (b <= x || a >= y) {
        neu.push([x, y])
        continue
      }
      if (a > x) neu.push([x, a])
      if (b < y) neu.push([b, y])
    }
    stuecke = neu
  }
  return stuecke.filter(([a, b]) => b - a > 0.01)
}

/** Kleiner Zufall mit Saat (mulberry32): gleiche Saat, gleiche Folge. */
function zufallMit(saat: number): () => number {
  let s = saat >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Saat aus Zahlen, auf ganze Zentimeter (FNV-1a). */
function saatAus(zahlen: number[]): number {
  let h = 0x811c9dc5
  for (const v of zahlen) {
    h ^= Math.round(v * 100) | 0
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/* ------------------------------------------------ Geometrie sammeln */

/** Ecken einer Vorlage (ohne Index), einmal gebaut und dann nur gelesen. */
interface Vorlage {
  lage: Float32Array
  richtung: Float32Array
  y0: number
  y1: number
}
const vorlagen = new Map<string, Vorlage>()
function vorlage(name: string, bau: () => BufferGeometry): Vorlage {
  let v = vorlagen.get(name)
  if (!v) {
    const geo = bau()
    const g = geo.index ? geo.toNonIndexed() : geo
    if (g !== geo) geo.dispose()
    const lage = Float32Array.from(g.getAttribute('position').array)
    const richtung = Float32Array.from(g.getAttribute('normal').array)
    g.dispose()
    let y0 = Infinity
    let y1 = -Infinity
    for (let i = 1; i < lage.length; i += 3) {
      y0 = Math.min(y0, lage[i])
      y1 = Math.max(y1, lage[i])
    }
    v = { lage, richtung, y0, y1 }
    vorlagen.set(name, v)
  }
  return v
}
const wuerfel = () => vorlage('wuerfel', () => new BoxGeometry(1, 1, 1))
const kugelFein = () => vorlage('kugel2', () => new IcosahedronGeometry(1, 2))
const kugelGrob = () => vorlage('kugel1', () => new IcosahedronGeometry(1, 1))
const walze = () => vorlage('walze8', () => new CylinderGeometry(1, 1, 1, 8))
const stammForm = () => vorlage('stamm7', () => new CylinderGeometry(0.6, 1, 1, 7, 1, true))

/** Dreiecke ohne Index: Lage, Richtung und Farbe je Ecke, in Feldern, die
 *  bei Bedarf doppelt so gross werden (schneller als Listen am Handy). */
class Puffer {
  private l: Float32Array
  private r: Float32Array
  private f: Float32Array
  private n = 0
  /** Ist er bekannt, spart bauen() das Durchrechnen der Huellkugel. */
  kugel: { x: number; y: number; z: number; r: number } | null = null

  /** platz: so viele Ecken passen anfangs hinein. */
  constructor(platz = 4096) {
    this.l = new Float32Array(3 * platz)
    this.r = new Float32Array(3 * platz)
    this.f = new Float32Array(3 * platz)
  }

  get ecken(): number {
    return this.n / 3
  }

  /** Eine Ecke anhaengen. */
  ecke(x: number, y: number, z: number, nx: number, ny: number, nz: number, cr: number, cg: number, cb: number): void {
    if (this.n + 3 > this.l.length) {
      const neu = (a: Float32Array) => {
        const b = new Float32Array(a.length * 2)
        b.set(a)
        return b
      }
      this.l = neu(this.l)
      this.r = neu(this.r)
      this.f = neu(this.f)
    }
    const i = this.n
    this.l[i] = x
    this.l[i + 1] = y
    this.l[i + 2] = z
    this.r[i] = nx
    this.r[i + 1] = ny
    this.r[i + 2] = nz
    this.f[i] = cr
    this.f[i + 1] = cg
    this.f[i + 2] = cb
    this.n = i + 3
  }

  /** Quader um c mit den Achsen ax (Laenge sx), ay (Hoehe sy), az (Tiefe
   *  sz), rechtshaendig. schatten: unten so viel dunkler. deckel: false
   *  laesst Ober- und Unterseite weg (Staebe, die man nie von dort sieht).
   *  f: eine Farbe oder je Seite eine (+ax, -ax, +ay, -ay, +az, -az). */
  quader(c: V3, ax: V3, ay: V3, az: V3, sx: number, sy: number, sz: number, f: Farbe, schatten = 0, deckel = true): void {
    const v = wuerfel()
    for (let i = 0; i < v.lage.length; i += 3) {
      // Ecken 12 bis 23 sind Ober- und Unterseite (Reihenfolge der BoxGeometry).
      if (!deckel && i >= 36 && i < 72) continue
      // Je Seite sechs Ecken (zwei Dreiecke), also 18 Zahlen.
      const fc = f instanceof Color ? f : f[Math.floor(i / 18)]
      const x = v.lage[i] * sx
      const y = v.lage[i + 1] * sy
      const z = v.lage[i + 2] * sz
      const nx = v.richtung[i]
      const ny = v.richtung[i + 1]
      const nz = v.richtung[i + 2]
      const k = schatten > 0 ? 1 - schatten * (0.5 - v.lage[i + 1]) : 1
      this.ecke(
        c[0] + ax[0] * x + ay[0] * y + az[0] * z,
        c[1] + ax[1] * x + ay[1] * y + az[1] * z,
        c[2] + ax[2] * x + ay[2] * y + az[2] * z,
        ax[0] * nx + ay[0] * ny + az[0] * nz,
        ax[1] * nx + ay[1] * ny + az[1] * nz,
        ax[2] * nx + ay[2] * ny + az[2] * nz,
        fc.r * k,
        fc.g * k,
        fc.b * k,
      )
    }
  }

  /** Flaches Rechteck um c (ax mal sx, ay mal sy), sichtbar zur Seite n. */
  viereck(c: V3, ax: V3, ay: V3, sx: number, sy: number, n: V3, f: Color): void {
    const p = (a: number, b: number): V3 => [c[0] + ax[0] * a * sx + ay[0] * b * sy, c[1] + ax[1] * a * sx + ay[1] * b * sy, c[2] + ax[2] * a * sx + ay[2] * b * sy]
    const w = kreuz(ax, ay)
    const vorn = w[0] * n[0] + w[1] * n[1] + w[2] * n[2] > 0
    const ecken = vorn
      ? [p(-0.5, -0.5), p(0.5, -0.5), p(0.5, 0.5), p(-0.5, -0.5), p(0.5, 0.5), p(-0.5, 0.5)]
      : [p(-0.5, -0.5), p(0.5, 0.5), p(0.5, -0.5), p(-0.5, -0.5), p(-0.5, 0.5), p(0.5, 0.5)]
    for (const e of ecken) this.ecke(e[0], e[1], e[2], n[0], n[1], n[2], f.r, f.g, f.b)
  }

  /** Achsenparalleler Quader. */
  kasten(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, f: Color, schatten = 0): void {
    this.quader([(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [1, 0, 0], [0, 1, 0], [0, 0, 1], x1 - x0, y1 - y0, z1 - z0, f, schatten)
  }

  /** Vorlage mit Matrix m. schatten nach der Hoehe in der Vorlage. */
  form(v: Vorlage, m: Matrix4, f: Color, schatten = 0): void {
    const e = m.elements
    const nm = new Matrix3().getNormalMatrix(m).elements
    const hoch = v.y1 - v.y0
    for (let i = 0; i < v.lage.length; i += 3) {
      const x = v.lage[i]
      const y = v.lage[i + 1]
      const z = v.lage[i + 2]
      const nx = v.richtung[i]
      const ny = v.richtung[i + 1]
      const nz = v.richtung[i + 2]
      const rx = nm[0] * nx + nm[3] * ny + nm[6] * nz
      const ry = nm[1] * nx + nm[4] * ny + nm[7] * nz
      const rz = nm[2] * nx + nm[5] * ny + nm[8] * nz
      const l = Math.hypot(rx, ry, rz) || 1
      const t = schatten > 0 && hoch > 0 ? (y - v.y0) / hoch : 1
      const k = 1 - schatten * (1 - t)
      this.ecke(
        e[0] * x + e[4] * y + e[8] * z + e[12],
        e[1] * x + e[5] * y + e[9] * z + e[13],
        e[2] * x + e[6] * y + e[10] * z + e[14],
        rx / l,
        ry / l,
        rz / l,
        f.r * k,
        f.g * k,
        f.b * k,
      )
    }
  }

  /** Ein flaches Dreieck bei Hoehe y, nach oben oder unten gewendet. */
  dreieck(a: P, b: P, c: P, y: number, fa: Color, fb: Color, fc: Color, oben = true): void {
    const ny = (b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1])
    if (Math.abs(ny) < 1e-12) return
    if (ny > 0 !== oben) {
      ;[b, c] = [c, b]
      ;[fb, fc] = [fc, fb]
    }
    const r = oben ? 1 : -1
    this.ecke(a[0], y, a[1], 0, r, 0, fa.r, fa.g, fa.b)
    this.ecke(b[0], y, b[1], 0, r, 0, fb.r, fb.g, fb.b)
    this.ecke(c[0], y, c[1], 0, r, 0, fc.r, fc.g, fc.b)
  }

  /** Ebenes Vieleck bei Hoehe y (darf nicht konvex sein). */
  flaeche(poly: P[], y: number, f: Color | ((p: P) => Color), oben = true): void {
    if (poly.length < 3) return
    const farbe = typeof f === 'function' ? f : () => f
    const dreiecke = ShapeUtils.triangulateShape(
      poly.map(([x, z]) => new Vector2(x, z)),
      [],
    )
    for (const [i, j, k] of dreiecke) this.dreieck(poly[i], poly[j], poly[k], y, farbe(poly[i]), farbe(poly[j]), farbe(poly[k]), oben)
  }

  /** Wie flaeche, aber konvexe Vielecke (die meisten Dielen und Fliesen)
   *  als Faecher, ohne die teure Zerlegung. */
  flaecheFix(poly: P[], y: number, f: Color, oben = true): void {
    const n = poly.length
    if (n < 3) return
    let plus = false
    let minus = false
    for (let i = 0; i < n; i++) {
      const a = poly[i]
      const b = poly[(i + 1) % n]
      const c = poly[(i + 2) % n]
      const k = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])
      if (k > 1e-12) plus = true
      else if (k < -1e-12) minus = true
    }
    if (plus && minus) {
      this.flaeche(poly, y, f, oben)
      return
    }
    for (let i = 1; i + 1 < n; i++) this.dreieck(poly[0], poly[i], poly[i + 1], y, f, f, f, oben)
  }

  bauen(): BufferGeometry | null {
    if (!this.n) return null
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(this.l.slice(0, this.n), 3))
    g.setAttribute('normal', new BufferAttribute(this.r.slice(0, this.n), 3))
    g.setAttribute('color', new BufferAttribute(this.f.slice(0, this.n), 3))
    if (this.kugel) g.boundingSphere = new Sphere(new Vector3(this.kugel.x, this.kugel.y, this.kugel.z), this.kugel.r)
    else g.computeBoundingSphere()
    return g
  }
}

/** Matrix aus Mitte, Achsen (rechtshaendig) und Groessen. */
function achsenMatrix(c: V3, ax: V3, ay: V3, az: V3, sx: number, sy: number, sz: number): Matrix4 {
  return new Matrix4().set(
    ax[0] * sx, ay[0] * sy, az[0] * sz, c[0],
    ax[1] * sx, ay[1] * sy, az[1] * sz, c[1],
    ax[2] * sx, ay[2] * sy, az[2] * sz, c[2],
    0, 0, 0, 1,
  )
}

function normiert(v: V3): V3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / l, v[1] / l, v[2] / l]
}

function kreuz(a: V3, b: V3): V3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}

/** Rechtshaendige Achsen mit ay entlang der Richtung d. */
function achsenUm(d: V3): [V3, V3, V3] {
  const ay = normiert(d)
  const hilfe: V3 = Math.abs(ay[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]
  const az = normiert(kreuz(hilfe, ay))
  const ax = kreuz(ay, az)
  return [ax, ay, az]
}

/** Quader an einer Kante: t laengs, s quer, y hoch (lokal). Trifft er die
 *  Aussparung sch, bleiben nur die Stuecke ausserhalb stehen. Farben je
 *  Seite wie in Puffer.quader (+u, -u, oben, unten, dann die beiden
 *  Seiten quer, siehe seitenFarben). */
function kq(p: Puffer, k: Kante, t0: number, t1: number, s0: number, s1: number, y0: number, y1: number, f: Farbe, sch: Schnitt | null, schatten = 0, deckel = true): void {
  if (t1 - t0 < 1e-3 || s1 - s0 < 1e-3 || y1 - y0 < 1e-3) return
  if (sch && y0 < sch.y1 - EPS && y1 > sch.y0 + EPS) {
    const h = treffer(k, t0, t1, s0, s1, sch.r)
    if (h) {
      const [ta, tb, sa, sb] = h
      kq(p, k, t0, ta, s0, s1, y0, y1, f, null, schatten, deckel)
      kq(p, k, tb, t1, s0, s1, y0, y1, f, null, schatten, deckel)
      kq(p, k, ta, tb, s0, sa, y0, y1, f, null, schatten, deckel)
      kq(p, k, ta, tb, sb, s1, y0, y1, f, null, schatten, deckel)
      kq(p, k, ta, tb, sa, sb, y0, Math.min(y1, sch.y0), f, null, schatten, deckel)
      kq(p, k, ta, tb, sa, sb, Math.max(y0, sch.y1), y1, f, null, schatten, deckel)
      return
    }
  }
  const tm = (t0 + t1) / 2
  const sm = (s0 + s1) / 2
  const c = kp(k, tm, sm)
  p.quader([c[0], (y0 + y1) / 2, c[1]], [k.u[0], 0, k.u[1]], [0, 1, 0], [-k.u[1], 0, k.u[0]], t1 - t0, y1 - y0, s1 - s0, f, schatten, deckel)
}

/** Farben je Seite fuer kq an der Kante k: plus zeigt nach +n, minus nach
 *  -n, ende an beiden Enden (laengs), oben auf der Oberkante und unten. */
function seitenFarben(k: Kante, plus: Color, minus: Color, ende: Color, oben: Color): Color[] {
  // kq legt die dritte Achse auf (-u.z, u.x); zeigt sie wie n, ist +az die Seite plus.
  const gleich = -k.u[1] * k.n[0] + k.u[0] * k.n[1] > 0
  return [ende, ende, oben, oben, gleich ? plus : minus, gleich ? minus : plus]
}

/** Flaeche an der Kante bei s (t0..t1, y0..y1), sichtbar nach aussen (n). */
function kf(p: Puffer, k: Kante, t0: number, t1: number, s: number, y0: number, y1: number, f: Color): void {
  const c = kp(k, (t0 + t1) / 2, s)
  p.viereck([c[0], (y0 + y1) / 2, c[1]], [k.u[0], 0, k.u[1]], [0, 1, 0], t1 - t0, y1 - y0, [k.n[0], 0, k.n[1]], f)
}

/** Trifft ein Teil an der Kante (mit Rand) die Aussparung? Dann faellt es
 *  ganz weg (Fenster, Balkone: halbe sehen falsch aus). */
function trifft(sch: Schnitt | null, k: Kante, t0: number, t1: number, s0: number, s1: number, y0: number, y1: number, rand = 0): boolean {
  if (!sch) return false
  if (!(y0 - rand < sch.y1 - EPS && y1 + rand > sch.y0 + EPS)) return false
  return treffer(k, t0 - rand, t1 + rand, s0 - rand, s1 + rand, sch.r) !== null
}

function trifftKasten(sch: Schnitt | null, x0: number, z0: number, x1: number, z1: number, y0: number, y1: number): boolean {
  if (!sch) return false
  if (!(y0 < sch.y1 - EPS && y1 > sch.y0 + EPS)) return false
  return x0 < sch.r[2] - EPS && x1 > sch.r[0] + EPS && z0 < sch.r[3] - EPS && z1 > sch.r[1] + EPS
}

/* ------------------------------------------------ Pruefen */

function umrissBereinigen(umriss: unknown, name: string): P[] {
  if (!Array.isArray(umriss)) throw new Error(`Siedlung: ${name} hat keinen Umriss`)
  const roh = umriss.map((p, i) => punkt(p, `${name}, Punkt ${i + 1}`))
  const out: P[] = []
  for (const p of roh) {
    const l = out[out.length - 1]
    if (!l || Math.hypot(p[0] - l[0], p[1] - l[1]) > 0.05) out.push(p)
  }
  while (out.length > 2 && Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) <= 0.05) out.pop()
  if (out.length < 3 || Math.abs(flaecheVon(out)) < 4) throw new Error(`Siedlung: ${name} hat keinen gueltigen Umriss`)
  return out
}

function hausPruefen(g: SiedlungGebaeude, i: number): Haus {
  const name = g && typeof g.name === 'string' && g.name ? g.name : `Haus ${i + 1}`
  if (!g || typeof g.id !== 'string' || !g.id) throw new Error(`Siedlung: ${name} hat keine Kennung`)
  const poly = umrissBereinigen(g.umriss, name)
  if (!Number.isInteger(g.geschosse) || g.geschosse < 1 || g.geschosse > 30) throw new Error(`Siedlung: ${name} hat keine gueltige Zahl an Geschossen`)
  const gh = zahl(g.geschossHoehe, `${name}: geschossHoehe`)
  if (gh < 2.2 || gh > 6) throw new Error(`Siedlung: ${name}: geschossHoehe ausserhalb von 2,2 bis 6 m`)
  // Ein neuer Stil, den diese Fassung noch nicht kennt, wird hell verputzt.
  const stil: SiedlungStil = STILE.includes(g.stil) ? g.stil : 'putz'
  return { g, stil, poly, kanten: kantenVon(poly), gh, n: g.geschosse, H: g.geschosse * gh }
}

/* ------------------------------------------------ Innen (E84): Zahlen */

/** Aussenwand: die Innenseite liegt 6 cm innerhalb der Raumkante (so legt
 *  Fundkiste die Kante in die Wand), der Rest ragt nach aussen. */
const IW_AUSSEN = 0.3
const IW_AUSSEN_IN = 0.06
/** Wand zwischen zwei Wohnungen oder zu Gang und Stiege; Wand in einer Wohnung. */
const IW_TRENN = 0.2
const IW_INNEN = 0.1
/** Liegen zwei Raumkanten auseinander, fuellt die Wand die Luecke und ragt
 *  je 6 cm in beide Raeume. */
const IW_FUGE = 0.12
/** Bis zu diesem Abstand (Meter) teilen sich zwei gegenlaeufige Kanten eine Wand. */
const IW_NACHBAR = 0.45
/** Decke (Platte) unter dem naechsten Geschoss: die Waende enden darunter. */
const DECKE = 0.3
const ZARGE = 0.06
const ZARGE_EINGANG = 0.11
const BLATT_DICK = 0.04
/** So weit stehen die Tuerblaetter offen. */
const TUER_AUF = (80 * Math.PI) / 180
/** Bis zu diesem Abstand zum Umriss zeigt ein Haus sein Inneres (Meter). */
const ZONE_RAND = 2
/** Sprungziel: so weit vor der Wohnungstuer, so weit vor der Haustuer. */
const SPRUNG_TUER = 0.8
const SPRUNG_HAUS = 1.5
/** So lange darf der Bau der Innenraeume je Bild dauern (ms); das
 *  Geschoss der Kamera wird immer sofort gebaut. */
const BAU_MS = 12
/** Dielen, Fliesen, Platten im Gang, Pflaster, Holzdeck (Meter). */
const DIELE = 0.2
const FLIESE = 0.3
const PLATTE_GANG = 0.6
const PFLASTER = 0.4
const DECK = 0.14
/** Aufzug im Haus: Tuerbreite, Schachtwand, Tuerhoehe. */
const A_TUER = 0.9
const A_WAND = 0.2
const A_TUER_H = 2.1
/** Treppen in Stiegenhaeusern mit Plaenen (E87): zwei Laeufe je Geschoss
 *  nebeneinander mit Zwischenpodest. Steigung etwa, Auftritt hoechstens
 *  und mindestens, Tiefe des Zwischenpodests mindestens, Laufbreite
 *  mindestens, Rand zur Wand, Mittelwand (Meter). */
const T_STEIGUNG = 0.175
const T_TRITT_MAX = 0.29
const T_TRITT_MIN = 0.17
const T_PODEST = 1.0
const T_LAUF_MIN = 0.5
const T_RAND = 0.1
const T_MITTE = 0.1
/** Podest am Antritt, wenn der Gang nur seitlich anliegt: mindestens so
 *  tief, und so viel Gang muss an ihm liegen (Meter). */
const T_ANTRITT = 0.9
const T_ZUGANG = 0.75

const DREH: Record<number, P> = { 0: [1, 0], 90: [0, 1], 180: [-1, 0], 270: [0, -1] }

/* ------------------------------------------------ Innen (E84): Formen */

/** Was eine Flaeche im Geschoss ist: Raum einer Wohnung (innen, draussen)
 *  oder allgemein (Stiege, Aufzug, Gang, Laubengang). */
type FArt = 'innen' | 'draussen' | 'stiege' | 'aufzug' | 'gang' | 'laubengang'
type Belag = 'eiche' | 'fliese' | 'deck' | 'beton' | 'pflaster' | 'rasen' | 'platten' | 'keiner'
type MoebelArt = 'kueche' | 'hochschrank' | 'kuehlschrank' | 'theke' | 'wc' | 'becken' | 'wanne' | 'dusche' | 'waschmaschine' | 'stuetze'
type LochArt = 'tuer' | 'eingang' | 'haustuer' | 'fenster' | 'durchgang'
type WandTyp = 'innen' | 'trenn' | 'fassade' | 'aussen' | 'sicht'
/** Dinge zum Aufheben (E87). */
type DingArt = 'ball' | 'kuebel' | 'schaufel' | 'form' | 'sessel'
const ARTEN_ALLGEMEIN: readonly string[] = ['stiege', 'aufzug', 'gang', 'laubengang']
const ARTEN_OEFFNUNG: readonly string[] = ['tuer', 'fenster', 'durchgang']
/** Diese Moebel stehen an der Wand: ihre Rueckseite sucht die naechste Wand. */
const AN_DER_WAND: readonly MoebelArt[] = ['kueche', 'hochschrank', 'kuehlschrank', 'wc', 'becken', 'waschmaschine']

/** Eine Flaeche eines Geschosses, lokal in Metern. */
interface IFlaeche {
  poly: P[]
  kanten: Kante[]
  /** Je Ecke: ragt sie nach aussen? Dort werden Waende verlaengert. */
  konvex: boolean[]
  r: Kasten
  art: FArt
  name: string
  /** Wohnung (Index im Geschoss), -1 fuer allgemeine Flaechen. */
  wohnung: number
  /** Gehoert zur eigenen Wohnung: nichts davon bauen (die Szene zeigt sie). */
  weg: boolean
  belag: Belag
}

/** Eine Oeffnung, lokal: von a nach b auf der Kante ihres Raums. */
interface IOeffnung {
  art: LochArt
  a: P
  b: P
  /** Angel bei a (sonst bei b). */
  angelA: boolean
  /** Dorthin schlaegt das Blatt auf (Einheitsvektor quer zur Wand). */
  auf: P
  /** Aus dem Raum hinaus (Einheitsvektor). */
  raus: P
  hoehe: number
  bruestung: number
  wohnung: number
}

interface IMoebel {
  art: MoebelArt
  /** Mitte; u laengs (Breite b), v nach vorn (Tiefe t), Meter. */
  c: P
  u: P
  v: P
  b: number
  t: number
  /** Oberschraenke (Kueche), nicht vor einem Fenster. */
  oben: boolean
}

interface IWohnung {
  top: string
  flaechen: number[]
  oeffnungen: IOeffnung[]
  moebel: IMoebel[]
  eingang: P | null
  /** Die Wohnungstuer (die Tuer naechst dem Eingang). */
  tuer: IOeffnung | null
  weg: boolean
}

/** Ein Stueck Wand an der Kante k (t laengs, s quer, y hoch, lokal). Die
 *  Seite +n gehoert zu plus, -n zu minus (Wandfarbe oder Fassade). */
interface IWand {
  k: Kante
  t0: number
  t1: number
  s0: number
  s1: number
  y0: number
  y1: number
  plus: 'wand' | 'fassade'
  minus: 'wand' | 'fassade'
  /** Wo draussen ist: +1 = +n, -1 = -n, 0 = beide Seiten drinnen. */
  aussen: number
  typ: WandTyp
  /** Ausschnitte: Tueren und Durchgaenge (vom Boden bis oben), Fenster. */
  tueren: { t0: number; t1: number; oben: number }[]
  fenster: { t0: number; t1: number; unten: number; oben: number }[]
}

/** Eine Oeffnung in ihrer Wand (ta, tb laengs der Wand). */
interface ILoch {
  o: IOeffnung
  w: IWand
  ta: number
  tb: number
}

interface IGeschoss {
  k: number
  /** Boden des Geschosses, lokal (k * Geschosshoehe). */
  y: number
  flaechen: IFlaeche[]
  wohnungen: IWohnung[]
  waende: IWand[]
  loecher: ILoch[]
  gelaender: { k: Kante; t0: number; t1: number }[]
  /** Raender der Platten (Loggia, Balkon, Laubengang) nach draussen. */
  raender: { k: Kante; t0: number; t1: number }[]
  hindernisse: KRechteck[]
  /** Haustueren (nur im EG, aus dem Gang nach draussen). */
  haustueren: ILoch[]
}

/** Der Aufzug eines Hauses: k laeuft an der Tuerseite (n in den Schacht). */
interface IAufzug {
  k: Kante
  breit: number
  tief: number
  halte: number[]
  /** Platz fuer Kabine und Tueren. */
  kabine: boolean
}

/** Ein Haus mit Plaenen, mit dem, was davon schon gebaut ist. */
interface InnenHaus {
  h: Haus
  geschosse: IGeschoss[]
  nachK: Map<number, IGeschoss>
  aufzug: IAufzug | null
  /** Rahmen der Zone (Umriss plus ZONE_RAND, dazu Gaerten und Terrassen), lokal. */
  zone: Kasten
  /** Gaerten und Terrassen im EG: wer dort steht, ist auch schon da. */
  vorne: P[][]
  /** Allgemeine Flaechen ausserhalb des Umrisses (E87: Laubengang, Stiege
   *  und Aufzug vor der Fassade): wer dort steht, ist auch schon da. */
  anbau: P[][]
  /** Fassade, Fenster, Balkone: weg, solange man drin ist (das Dach bleibt). */
  huelle: Puffer
  huelleMesh: Mesh | null
  /** Alles Innere; sichtbar, solange die Kamera drin ist. */
  gruppe: Group
  /** Gebaute Geschosse (null: es gab dort nichts zu bauen). */
  stock: Map<number, Mesh | null>
  /** Noch zu bauende Geschosse. */
  offen: number[]
  /** Halb gebaute Geschosse (Waende fertig, Boeden noch nicht). */
  halb: Map<number, Puffer>
  /** Bauzeit der ersten Haelfte je Geschoss (ms, fuer userData). */
  ms: Map<number, number>
  /** Glas und Aufzug sind gebaut. */
  teile: boolean
  lift: Lift | null
  /** Treppen je Stiegenhaus (E87); fehlt eins, bleibt es zu. */
  stiegen: Map<IFlaeche, Stiege>
}

/** Lage der Treppe in einem Stiegenhaus (E87), lokal: k beginnt an einer
 *  Ecke, t laeuft vom Antritt (der Seite zum Gang) hinein, s quer (n zeigt
 *  hinein). Bis p Podest auf Geschosshoehe, dann zwei Laeufe nebeneinander
 *  mit je R Steigungen (steig) und Auftritt a: Haelfte 1 (s < B/2) hinauf
 *  zum Zwischenpodest, Haelfte 2 (s > B/2) von dort zurueck hinauf zum
 *  Antritt des naechsten Geschosses. Die Stufe i (1 bis R - 1) des ersten
 *  Laufs liegt bei t = p + (i - 0,5) a bis p + (i + 0,5) a, das
 *  Zwischenpodest ab p + (R - 0,5) a bis L. Jeder Lauf als Treppe3D: t von
 *  p bis p + R a, seine Linie geht durch die Mitten der Stufen. */
interface TreppenLage {
  k: Kante
  L: number
  B: number
  p: number
  R: number
  a: number
  steig: number
}

/** Ein Stiegenhaus in einem Geschoss: seine Treppe, ob von hier ein Lauf
 *  hinauf geht und ob einer von unten ankommt. */
interface Stiege {
  lage: TreppenLage
  hoch: boolean
  runter: boolean
}

/** Ein Lauf lokal (E87): Mitte, Richtung hinauf, Laenge, Breite. */
interface Lauf {
  c: P
  u: P
  laenge: number
  breite: number
  stufen: number
}

/** Ein Aufzug zur Laufzeit (am Laubengang oder in einem Haus mit Plaenen). */
interface Lift {
  steuer: ReturnType<typeof aufzugSteuern>
  haus: Haus
  /** Index der Ebene je Geschoss des Hauses. */
  ebene: (k: number) => number
  /** Kabine innen in Weltmetern (x0, z0, x1, z1), solange sie gebaut ist. */
  welt: [number, number, number, number] | null
}

function umlaute(s: string): string {
  return s.toLowerCase().replace(/\u00e4/g, 'ae').replace(/\u00f6/g, 'oe').replace(/\u00fc/g, 'ue').replace(/\u00df/g, 'ss')
}

const istLoggia = (f: IFlaeche) => umlaute(f.name).includes('loggia')
const istBalkon = (f: IFlaeche) => umlaute(f.name).includes('balkon')
/** Geschlossen: ein Raum drinnen, Gang oder Stiege. */
const eng = (f: IFlaeche) => f.art === 'innen' || f.art === 'gang' || f.art === 'stiege'

/** Bodenbelag nach Art und Name (wie in der Baubeschreibung: Bad, WC und
 *  Vorraum gefliest, sonst Eiche; Loggia Holzdeck, Balkon Beton, Terrasse
 *  Pflaster, Garten Rasen). */
function belagVon(art: FArt, name: string): Belag {
  const n = umlaute(name).replace(/\s+/g, '')
  if (art === 'gang') return 'platten'
  if (art === 'stiege' || art === 'laubengang') return 'beton'
  if (art === 'aufzug') return 'keiner'
  if (art === 'draussen') {
    if (n.includes('garten')) return 'rasen'
    if (n.includes('terrasse')) return 'pflaster'
    if (n.includes('loggia')) return 'deck'
    return 'beton'
  }
  if (/bad|wc|dusche|^vr|vorraum/.test(n)) return 'fliese'
  return 'eiche'
}

/** Nur Kueche und Bad werden gebaut (die Wohnungen sind leer). */
function moebelArt(name: string): MoebelArt | null {
  const n = umlaute(name).trim()
  if (n.startsWith('kuechenzeile') || n.startsWith('kuechenblock')) return 'kueche'
  if (n.startsWith('hochschrank')) return 'hochschrank'
  if (n.startsWith('kuehlschrank')) return 'kuehlschrank'
  if (n.startsWith('theke')) return 'theke'
  if (n === 'wc' || n.startsWith('wc ') || n.startsWith('toilette')) return 'wc'
  if (n.startsWith('waschbecken') || n.startsWith('waschtisch')) return 'becken'
  if (n.startsWith('badewanne')) return 'wanne'
  if (n.startsWith('dusche')) return 'dusche'
  if (n.startsWith('waschmaschine')) return 'waschmaschine'
  if (n.startsWith('stuetze')) return 'stuetze'
  return null
}

function konvexVon(poly: P[]): boolean[] {
  const A = flaecheVon(poly)
  return poly.map((p, i) => {
    const a = poly[(i - 1 + poly.length) % poly.length]
    const b = poly[(i + 1) % poly.length]
    const c = (p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0])
    return c * A > 1e-9
  })
}

function flaecheAus(poly: P[], art: FArt, name: string, wohnung: number): IFlaeche {
  return { poly, kanten: kantenVon(poly), konvex: konvexVon(poly), r: kastenVon(poly), art, name, wohnung, weg: false, belag: belagVon(art, name) }
}

/** Vieleck auf das Rechteck r beschnitten (Flaeche ohne Vorzeichen stimmt
 *  auch fuer nicht konvexe Vielecke). */
function imKasten(poly: P[], r: Kasten): P[] {
  let q = halbebene(poly, 1, 0, r[0])
  q = halbebene(q, -1, 0, -r[2])
  q = halbebene(q, 0, 1, r[1])
  return halbebene(q, 0, -1, -r[3])
}

/** Vieleck ohne das Rechteck r, als Stuecke. */
function ohneKasten(poly: P[], r: Kasten): P[][] {
  const mitte = halbebene(halbebene(poly, 1, 0, r[0]), -1, 0, -r[2])
  return [halbebene(poly, -1, 0, -r[0]), halbebene(poly, 1, 0, r[2]), halbebene(mitte, 0, -1, -r[1]), halbebene(mitte, 0, 1, r[3])].filter(
    (q) => q.length >= 3 && Math.abs(flaecheVon(q)) > 1e-6,
  )
}

/** Das Rechteck um eine Flaeche, ausgerichtet an ihrer laengsten Kante:
 *  k.a ist eine Ecke, t laeuft entlang k.u von 0 bis L, s entlang k.n von
 *  0 bis B (n zeigt in das Rechteck). */
function kastenAn(f: IFlaeche): { k: Kante; L: number; B: number } {
  let e = f.kanten[0]
  for (const x of f.kanten) if (x.laenge > e.laenge) e = x
  const u = e.u
  const w: P = [-u[1], u[0]]
  let t0 = Infinity
  let t1 = -Infinity
  let s0 = Infinity
  let s1 = -Infinity
  for (const p of f.poly) {
    const dx = p[0] - e.a[0]
    const dz = p[1] - e.a[1]
    const t = dx * u[0] + dz * u[1]
    const s = dx * w[0] + dz * w[1]
    t0 = Math.min(t0, t)
    t1 = Math.max(t1, t)
    s0 = Math.min(s0, s)
    s1 = Math.max(s1, s)
  }
  const a: P = [e.a[0] + u[0] * t0 + w[0] * s0, e.a[1] + u[1] * t0 + w[1] * s0]
  return { k: { a, u, n: w, laenge: t1 - t0 }, L: t1 - t0, B: s1 - s0 }
}

/** Die Plaene eines Hauses lesen und pruefen: alles in lokale Meter
 *  (Siedlung = (x, z) + R(drehung) * Plan / 100). Unsinnige Daten werfen
 *  laut, mit Haus, Geschoss, Wohnung und Raum in der Meldung. */
function innenLesen(roh: SiedlungInnenHaus, h: Haus): IGeschoss[] {
  const was = `Siedlung: innen ${h.g.name || h.g.id}`
  const hx = zahl(roh.x, `${was}: x`)
  const hz = zahl(roh.z, `${was}: z`)
  if (![0, 90, 180, 270].includes(roh.drehung)) throw new Error(`${was}: drehung muss 0, 90, 180 oder 270 sein`)
  const [c, s] = DREH[roh.drehung]
  const lokal = (v: unknown, w: string): P => {
    const q = punkt(v, w)
    return [hx + (c * q[0] - s * q[1]) / 100, hz + (s * q[0] + c * q[1]) / 100]
  }
  const richtung = (dx: number, dy: number): P => [c * dx - s * dy, s * dx + c * dy]
  const polyAus = (v: unknown, w: string): P[] => {
    if (!Array.isArray(v) || v.length < 3) throw new Error(`${w}: braucht drei Punkte`)
    const poly = v.map((p, i) => lokal(p, `${w}, Punkt ${i + 1}`))
    if (Math.abs(flaecheVon(poly)) < 0.02) throw new Error(`${w}: hat keine Flaeche`)
    return poly
  }
  if (!Array.isArray(roh.geschosse)) throw new Error(`${was}: geschosse ist keine Liste`)
  const gesehen = new Set<number>()
  const out: IGeschoss[] = []
  for (const g of roh.geschosse) {
    const k = g ? g.geschoss : NaN
    if (!g || !Number.isInteger(k) || k < 0 || k >= h.n) throw new Error(`${was}: Geschoss ${String(k)} gibt es im Haus nicht`)
    if (gesehen.has(k)) throw new Error(`${was}: Geschoss ${k} doppelt`)
    gesehen.add(k)
    const wg = `${was}, Geschoss ${k}`
    if (!Array.isArray(g.wohnungen) || !Array.isArray(g.allgemein)) throw new Error(`${wg}: wohnungen oder allgemein ist keine Liste`)
    const flaechen: IFlaeche[] = []
    const wohnungen: IWohnung[] = []
    g.wohnungen.forEach((w, wi) => {
      const ww = `${wg}, Wohnung ${w && typeof w.top === 'string' && w.top ? w.top : wi + 1}`
      if (!w || typeof w.top !== 'string') throw new Error(`${ww}: top fehlt`)
      if (!Array.isArray(w.raeume) || w.raeume.length === 0) throw new Error(`${ww}: keine Raeume`)
      if (!Array.isArray(w.oeffnungen) || !Array.isArray(w.moebel)) throw new Error(`${ww}: oeffnungen oder moebel ist keine Liste`)
      const erste = flaechen.length
      w.raeume.forEach((r, ri) => {
        const wr = `${ww}, Raum ${ri + 1}`
        if (!r || (r.art !== 'innen' && r.art !== 'draussen')) throw new Error(`${wr}: art muss innen oder draussen sein`)
        flaechen.push(flaecheAus(polyAus(r.punkte, wr), r.art, typeof r.name === 'string' ? r.name : '', wi))
      })
      const oeffnungen: IOeffnung[] = w.oeffnungen.map((o, oi) => {
        const wo = `${ww}, Oeffnung ${oi + 1}`
        if (!o || !Number.isInteger(o.raum) || o.raum < 0 || o.raum >= w.raeume.length) throw new Error(`${wo}: den Raum gibt es nicht`)
        if (!ARTEN_OEFFNUNG.includes(o.art)) throw new Error(`${wo}: unbekannte art`)
        const raum = w.raeume[o.raum]
        const n = raum.punkte.length
        if (!Number.isInteger(o.kante) || o.kante < 0 || o.kante >= n) throw new Error(`${wo}: die Kante gibt es nicht`)
        const ab = zahl(o.abstand_cm, `${wo}: abstand_cm`)
        const br = zahl(o.breite_cm, `${wo}: breite_cm`)
        const ho = zahl(o.hoehe_cm, `${wo}: hoehe_cm`)
        const bu = zahl(o.bruestung_cm, `${wo}: bruestung_cm`)
        if (ab < 0 || br <= 0 || ho <= 0 || bu < 0) throw new Error(`${wo}: Masse ausserhalb`)
        if (o.anschlag !== 'links' && o.anschlag !== 'rechts') throw new Error(`${wo}: anschlag muss links oder rechts sein`)
        if (o.aufschlag !== 'innen' && o.aufschlag !== 'aussen') throw new Error(`${wo}: aufschlag muss innen oder aussen sein`)
        const pa = punkt(raum.punkte[o.kante], wo)
        const pb = punkt(raum.punkte[(o.kante + 1) % n], wo)
        const l = Math.hypot(pb[0] - pa[0], pb[1] - pa[1])
        if (l < 1e-6) throw new Error(`${wo}: die Kante hat keine Laenge`)
        const rx = (pb[0] - pa[0]) / l
        const ry = (pb[1] - pa[1]) / l
        const raus = flaechen[erste + o.raum].kanten[o.kante].n
        return {
          art: o.art,
          a: lokal([pa[0] + rx * ab, pa[1] + ry * ab], wo),
          b: lokal([pa[0] + rx * (ab + br), pa[1] + ry * (ab + br)], wo),
          angelA: o.anschlag === 'links',
          auf: o.aufschlag === 'innen' ? [-raus[0], -raus[1]] : [raus[0], raus[1]],
          raus: [raus[0], raus[1]],
          hoehe: ho / 100,
          bruestung: bu / 100,
          wohnung: wi,
        }
      })
      const moebel: IMoebel[] = []
      w.moebel.forEach((m, mi) => {
        const wm = `${ww}, Moebel ${mi + 1}`
        if (!m || typeof m.name !== 'string') throw new Error(`${wm}: name fehlt`)
        const x = zahl(m.x, `${wm}: x`)
        const y = zahl(m.y, `${wm}: y`)
        const b = zahl(m.breite_cm, `${wm}: breite_cm`) / 100
        const t = zahl(m.tiefe_cm, `${wm}: tiefe_cm`) / 100
        if (b <= 0 || t <= 0) throw new Error(`${wm}: Masse ausserhalb`)
        if (![0, 90, 180, 270].includes(m.drehung)) throw new Error(`${wm}: drehung muss 0, 90, 180 oder 270 sein`)
        const art = moebelArt(m.name)
        if (!art) return
        // Wie Fundkiste (objektGlobal): (x, y) ist die Ecke, lokal x laengs, y nach vorn.
        const [dc, ds] = DREH[m.drehung]
        const u = richtung(dc, ds)
        const v = richtung(-ds, dc)
        const A = lokal([x, y], wm)
        moebel.push({ art, c: [A[0] + (u[0] * b) / 2 + (v[0] * t) / 2, A[1] + (u[1] * b) / 2 + (v[1] * t) / 2], u, v, b, t, oben: true })
      })
      const eingang = w.eingang == null ? null : lokal(w.eingang, `${ww}: eingang`)
      // Die Wohnungstuer: die Tuer, deren Mitte dem Eingang am naechsten liegt.
      let tuer: IOeffnung | null = null
      if (eingang) {
        let beste = 1.2
        for (const o of oeffnungen) {
          if (o.art !== 'tuer') continue
          const d = Math.hypot((o.a[0] + o.b[0]) / 2 - eingang[0], (o.a[1] + o.b[1]) / 2 - eingang[1])
          if (d < beste) {
            beste = d
            tuer = o
          }
        }
        if (tuer) tuer.art = 'eingang'
      }
      wohnungen.push({ top: w.top, flaechen: w.raeume.map((_, i) => erste + i), oeffnungen, moebel, eingang, tuer, weg: false })
    })
    g.allgemein.forEach((a, ai) => {
      const wa = `${wg}, allgemein ${ai + 1}`
      if (!a || !ARTEN_ALLGEMEIN.includes(a.art)) throw new Error(`${wa}: unbekannte art`)
      flaechen.push(flaecheAus(polyAus(a.punkte, wa), a.art, a.art, -1))
    })
    out.push({ k, y: k * h.gh, flaechen, wohnungen, waende: [], loecher: [], gelaender: [], raender: [], hindernisse: [], haustueren: [] })
  }
  return out.sort((a, b) => a.k - b.k)
}

/** Wohnungen, die mehr als 40 % im Rechteck r liegen, werden nicht gebaut
 *  (dort steht die eigene Wohnung als Szene). */
function eigeneWeg(g: IGeschoss, r: Kasten): void {
  for (const w of g.wohnungen) {
    let ganz = 0
    let drin = 0
    for (const i of w.flaechen) {
      const f = g.flaechen[i]
      ganz += Math.abs(flaecheVon(f.poly))
      const q = imKasten(f.poly, r)
      if (q.length >= 3) drin += Math.abs(flaecheVon(q))
    }
    if (ganz > 0 && drin / ganz > 0.4) {
      w.weg = true
      for (const i of w.flaechen) g.flaechen[i].weg = true
    }
  }
}

/** Ein Stueck einer Kante und was dahinter liegt: q (Index der Flaeche,
 *  -1 = nichts) im Abstand d, gefunden ueber eine gegenlaeufige Kante
 *  ('kante') oder weil der Punkt dahinter in ihr liegt ('innen'). */
interface Abschnitt {
  t0: number
  t1: number
  q: number
  d: number
  ueber: 'kante' | 'innen' | 'frei'
}

/** Was hinter Kante j der Flaeche i liegt, Stueck fuer Stueck. */
function nachbarn(fl: IFlaeche[], i: number, j: number): Abschnitt[] {
  const E = fl[i].kanten[j]
  const L = E.laenge
  const e1 = kp(E, L, 0)
  const x0 = Math.min(E.a[0], e1[0]) - IW_NACHBAR
  const x1 = Math.max(E.a[0], e1[0]) + IW_NACHBAR
  const z0 = Math.min(E.a[1], e1[1]) - IW_NACHBAR
  const z1 = Math.max(E.a[1], e1[1]) + IW_NACHBAR
  const kand: { t0: number; t1: number; q: number; d: number }[] = []
  for (let q = 0; q < fl.length; q++) {
    if (q === i) continue
    const Q = fl[q]
    if (Q.r[0] > x1 || Q.r[2] < x0 || Q.r[1] > z1 || Q.r[3] < z0) continue
    for (const F of Q.kanten) {
      if (F.laenge < 0.02 || E.u[0] * F.u[0] + E.u[1] * F.u[1] > -0.985) continue
      const f1 = kp(F, F.laenge, 0)
      const da = (F.a[0] - E.a[0]) * E.n[0] + (F.a[1] - E.a[1]) * E.n[1]
      const db = (f1[0] - E.a[0]) * E.n[0] + (f1[1] - E.a[1]) * E.n[1]
      if (Math.min(da, db) < -0.06 || Math.max(da, db) > IW_NACHBAR) continue
      const ta = (F.a[0] - E.a[0]) * E.u[0] + (F.a[1] - E.a[1]) * E.u[1]
      const tb = (f1[0] - E.a[0]) * E.u[0] + (f1[1] - E.a[1]) * E.u[1]
      const t0 = Math.max(0, Math.min(ta, tb))
      const t1 = Math.min(L, Math.max(ta, tb))
      if (t1 - t0 < 0.02) continue
      kand.push({ t0, t1, q, d: Math.max(0, (da + db) / 2) })
    }
  }
  const schnitte = [0, L, ...kand.flatMap((c) => [c.t0, c.t1])].sort((a, b) => a - b)
  const out: Abschnitt[] = []
  for (let n = 0; n + 1 < schnitte.length; n++) {
    const a = schnitte[n]
    const b = schnitte[n + 1]
    if (b - a < 0.01) continue
    const m = (a + b) / 2
    let best: { q: number; d: number } | null = null
    for (const c of kand) if (c.t0 <= m && c.t1 >= m && (!best || c.d < best.d - 1e-9 || (Math.abs(c.d - best.d) <= 1e-9 && c.q < best.q))) best = c
    let ab: Abschnitt
    if (best) ab = { t0: a, t1: b, q: best.q, d: best.d, ueber: 'kante' }
    else {
      // Keine Kante gegenueber: liegt der Punkt dahinter in einer Flaeche
      // (eine Stiege mitten im Gang)?
      const p = kp(E, m, 0.2)
      let q = -1
      for (let x = 0; x < fl.length && q < 0; x++) if (x !== i && innen(p, fl[x].poly)) q = x
      ab = { t0: a, t1: b, q, d: 0, ueber: q >= 0 ? 'innen' : 'frei' }
    }
    const l = out[out.length - 1]
    if (l && l.q === ab.q && l.ueber === ab.ueber && Math.abs(l.d - ab.d) < 1e-6 && Math.abs(l.t1 - ab.t0) < 1e-6) l.t1 = ab.t1
    else out.push(ab)
  }
  return out
}

/** Welche Wand zwischen P und Q (null = nichts dahinter) im Geschoss k steht. */
function wandRegel(P: IFlaeche, Q: IFlaeche | null, k: number): { typ: WandTyp | 'gelaender' | null; dicke: number } {
  const keine = { typ: null, dicke: 0 }
  if (!Q) {
    if (P.art === 'aufzug') return keine
    if (P.art === 'laubengang' || P.art === 'draussen') {
      const offen = P.art === 'laubengang' || istLoggia(P) || istBalkon(P)
      return k >= 1 && offen ? { typ: 'gelaender', dicke: 0 } : keine
    }
    return { typ: 'aussen', dicke: IW_AUSSEN }
  }
  if (P.art === 'aufzug' || Q.art === 'aufzug') return keine
  if (P.wohnung < 0 && Q.wohnung < 0) return keine
  const ep = eng(P)
  const eq = eng(Q)
  if (P.wohnung === Q.wohnung) {
    if (ep && eq) return { typ: 'innen', dicke: IW_INNEN }
    return ep !== eq ? { typ: 'fassade', dicke: IW_AUSSEN } : keine
  }
  if (ep && eq) return { typ: 'trenn', dicke: IW_TRENN }
  if (ep !== eq) return { typ: 'fassade', dicke: IW_AUSSEN }
  return { typ: 'sicht', dicke: IW_TRENN }
}

/** Abstand eines Punkts zum Umriss. */
function abstandUmriss(p: P, poly: P[]): number {
  let d = Infinity
  for (let i = 0; i < poly.length; i++) d = Math.min(d, abstandStrecke(p, poly[i], poly[(i + 1) % poly.length]))
  return d
}

/** Ein Geschoss planen: Waende (jede gemeinsame Kante nur einmal), Tueren
 *  und Fenster darin, Gelaender, Moebel an der Wand, Hindernisse. Rechnet
 *  nur Zahlen; gebaut wird spaeter (stockBauen). */
function geschossPlanen(g: IGeschoss, h: Haus, aufzug: IAufzug | null, stiegen: Map<IFlaeche, Stiege>): void {
  const fl = g.flaechen
  const k = g.k
  const yF = g.y
  const extra: IOeffnung[] = []
  for (let i = 0; i < fl.length; i++) {
    const P = fl[i]
    if (P.art === 'aufzug') continue
    P.kanten.forEach((E, j) => {
      if (E.laenge < 0.02) return
      for (const ab of nachbarn(fl, i, j)) {
        const Q = ab.q >= 0 ? fl[ab.q] : null
        // Gemeinsame Kante: die Flaeche mit dem kleineren Index baut sie.
        if (ab.ueber === 'kante' && ab.q < i) continue
        if (P.weg && (!Q || Q.weg)) continue
        if (!Q && k >= 1 && (P.art === 'laubengang' || P.art === 'draussen')) g.raender.push({ k: E, t0: ab.t0, t1: ab.t1 })
        const r = wandRegel(P, Q, k)
        if (!r.typ) continue
        if (r.typ === 'gelaender') {
          if (P.weg) continue
          g.gelaender.push({ k: E, t0: ab.t0, t1: ab.t1 })
          g.hindernisse.push({ k: E, t0: ab.t0, t1: ab.t1, s0: -0.11, s1: -0.01 })
          continue
        }
        let s0: number
        let s1: number
        if (r.typ === 'aussen') {
          s0 = -IW_AUSSEN_IN
          s1 = IW_AUSSEN - IW_AUSSEN_IN
        } else if (r.typ === 'fassade' && Q) {
          // Fassade zu Loggia, Balkon oder Laubengang: liegt wie eine
          // Aussenwand, 6 cm im Raum drinnen und 24 cm nach draussen.
          if (eng(P)) {
            s0 = -IW_AUSSEN_IN
            s1 = Math.max(IW_AUSSEN - IW_AUSSEN_IN, ab.d)
          } else {
            s0 = Math.min(ab.d + IW_AUSSEN_IN - IW_AUSSEN, 0)
            s1 = ab.d + IW_AUSSEN_IN
          }
        } else {
          // Liegen die Kanten aufeinander (Wandmitte), gilt die Dicke allein.
          const T = ab.d > 0.01 ? Math.max(r.dicke, ab.d + IW_FUGE) : r.dicke
          s0 = ab.d / 2 - T / 2
          s1 = ab.d / 2 + T / 2
        }
        // An Ecken, die nach aussen ragen, laeuft die Wand bis zur Aussenkante weiter.
        let t0 = ab.t0
        let t1 = ab.t1
        if (t0 <= 1e-6 && P.konvex[j]) t0 -= Math.max(0, s1)
        if (t1 >= E.laenge - 1e-6 && P.konvex[(j + 1) % P.poly.length]) t1 += Math.max(0, s1)
        const hoch = r.typ === 'aussen' || r.typ === 'fassade'
        const loggia = istLoggia(P) || (Q !== null && istLoggia(Q))
        const y1 = hoch ? yF + h.gh : r.typ === 'sicht' && !loggia ? yF + 1.8 : yF + h.gh - DECKE
        const seite = (f: IFlaeche | null): 'wand' | 'fassade' => (f && eng(f) ? 'wand' : 'fassade')
        const w: IWand = {
          k: E,
          t0,
          t1,
          s0,
          s1,
          y0: hoch && k === 0 ? -0.35 : yF,
          y1,
          plus: seite(Q),
          minus: seite(P),
          aussen: r.typ === 'aussen' ? 1 : r.typ === 'fassade' ? (eng(P) ? 1 : -1) : 0,
          typ: r.typ,
          tueren: [],
          fenster: [],
        }
        g.waende.push(w)
        // Gang und Stiege nach draussen: im EG eine Haustuer (wenn es dort
        // aus dem Haus hinaus geht), oben eine Glasfront; Stiege mit Fenster.
        if (r.typ === 'aussen' && (P.art === 'gang' || P.art === 'stiege')) {
          const L = ab.t1 - ab.t0
          const tm = (ab.t0 + ab.t1) / 2
          const raus = kp(E, tm, 0.6)
          const nachDraussen = !innen(raus, h.poly) || abstandUmriss(raus, h.poly) < 0.6
          const neu = (art: LochArt, mitte: number, breit: number, hoehe: number, bruestung: number) =>
            extra.push({
              art,
              a: kp(E, mitte - breit / 2, 0),
              b: kp(E, mitte + breit / 2, 0),
              angelA: true,
              auf: [E.n[0], E.n[1]],
              raus: [E.n[0], E.n[1]],
              hoehe,
              bruestung,
              wohnung: -1,
            })
          if (P.art === 'gang' && k === 0 && L >= 1.4 && nachDraussen) neu('haustuer', tm, Math.min(1.8, L - 0.4), 2.3, 0)
          else if (P.art === 'gang' && k >= 1 && L >= 1.2) {
            // Lange Gaenge: ein Fenster etwa alle 3,2 m.
            const n = Math.max(1, Math.round(L / 3.2))
            const teil = L / n
            for (let i = 0; i < n; i++) neu('fenster', ab.t0 + teil * (i + 0.5), Math.min(1.8, teil - 0.6), Math.min(2.0, h.gh - DECKE - 0.6), 0.4)
          } else if (P.art === 'stiege' && L >= 1.6) neu('fenster', tm, Math.min(1.4, L - 0.6), 1.2, 1.0)
        }
      }
    })
  }
  /* Oeffnungen in ihre Wand (egal, welche Flaeche die Wand baut). */
  const alle = [...g.wohnungen.filter((w) => !w.weg).flatMap((w) => w.oeffnungen), ...extra]
  for (const o of alle) {
    const l = Math.hypot(o.b[0] - o.a[0], o.b[1] - o.a[1])
    if (l < 0.05) continue
    const ou: P = [(o.b[0] - o.a[0]) / l, (o.b[1] - o.a[1]) / l]
    const m: P = [(o.a[0] + o.b[0]) / 2, (o.a[1] + o.b[1]) / 2]
    let erste = true
    for (const w of g.waende) {
      if (Math.abs(ou[0] * w.k.u[0] + ou[1] * w.k.u[1]) < 0.985) continue
      const sm = (m[0] - w.k.a[0]) * w.k.n[0] + (m[1] - w.k.a[1]) * w.k.n[1]
      if (sm < w.s0 - 0.12 || sm > w.s1 + 0.12) continue
      const ta = (o.a[0] - w.k.a[0]) * w.k.u[0] + (o.a[1] - w.k.a[1]) * w.k.u[1]
      const tb = (o.b[0] - w.k.a[0]) * w.k.u[0] + (o.b[1] - w.k.a[1]) * w.k.u[1]
      const t0 = Math.max(w.t0, Math.min(ta, tb))
      const t1 = Math.min(w.t1, Math.max(ta, tb))
      if (t1 - t0 < 0.02) continue
      if (o.art === 'fenster') w.fenster.push({ t0, t1, unten: yF + o.bruestung, oben: Math.min(w.y1, yF + o.bruestung + o.hoehe) })
      else w.tueren.push({ t0, t1, oben: Math.min(w.y1, yF + o.hoehe) })
      if (erste) {
        const loch = { o, w, ta: Math.min(ta, tb), tb: Math.max(ta, tb) }
        g.loecher.push(loch)
        if (o.art === 'haustuer') g.haustueren.push(loch)
        erste = false
      }
    }
  }
  /* Hindernisse: Waende ohne Tueren und Durchgaenge (Fenster bleiben zu). */
  for (const w of g.waende) {
    for (const [a, b] of abziehen([w.t0, w.t1], w.tueren.map((d) => [d.t0, d.t1] as [number, number]))) g.hindernisse.push({ k: w.k, t0: a, t1: b, s0: w.s0, s1: w.s1 })
  }
  /* Moebel: die Rueckseite an die naechste Wand, als Hindernis. Vor einem
   * Fenster haengen keine Oberschraenke. */
  const kanten = fl.filter((f) => f.wohnung >= 0).flatMap((f) => f.kanten)
  const wandAb = (p: P) => kanten.reduce((d, e) => Math.min(d, abstandStrecke(p, e.a, kp(e, e.laenge, 0))), Infinity)
  for (const w of g.wohnungen) {
    if (w.weg) continue
    for (const m of w.moebel) {
      if (AN_DER_WAND.includes(m.art)) {
        const hinten = wandAb([m.c[0] - (m.v[0] * m.t) / 2, m.c[1] - (m.v[1] * m.t) / 2])
        const vorn = wandAb([m.c[0] + (m.v[0] * m.t) / 2, m.c[1] + (m.v[1] * m.t) / 2])
        if (vorn + 0.05 < hinten) m.v = [-m.v[0], -m.v[1]]
      }
      const a: P = [m.c[0] - (m.u[0] * m.b) / 2 - (m.v[0] * m.t) / 2, m.c[1] - (m.u[1] * m.b) / 2 - (m.v[1] * m.t) / 2]
      if (m.art === 'kueche') {
        for (const o of w.oeffnungen) {
          if (o.art !== 'fenster') continue
          const lage = (q: P): P => [(q[0] - a[0]) * m.u[0] + (q[1] - a[1]) * m.u[1], (q[0] - a[0]) * m.v[0] + (q[1] - a[1]) * m.v[1]]
          const [xa, ya] = lage(o.a)
          const [xb, yb] = lage(o.b)
          if (Math.max(xa, xb) > 0.05 && Math.min(xa, xb) < m.b - 0.05 && Math.max(ya, yb) < 0.3 && Math.min(ya, yb) > -0.5) m.oben = false
        }
      }
      g.hindernisse.push({ k: { a, u: m.u, n: m.v, laenge: m.b }, t0: 0, t1: m.b, s0: 0, s1: m.t })
    }
  }
  /* Stiegen: begehbar, wenn es eine Treppe gibt (E87), sonst zu wie
   * bisher (man geht mit dem Aufzug). Schaechte haben Waende. */
  for (const f of fl) {
    if (f.art === 'stiege') {
      const st = stiegen.get(f)
      if (st) g.hindernisse.push(...stiegeHindernisse(st))
      else {
        const b = kastenAn(f)
        g.hindernisse.push({ k: b.k, t0: 0, t1: b.L, s0: 0, s1: b.B })
      }
    } else if (f.art === 'aufzug' && !(aufzug && aufzug.halte.includes(k) && innen(mitteVon(f.poly), kastenPoly(aufzug)))) {
      // Ein zweiter Schacht ohne Kabine: rundum zu.
      const b = kastenAn(f)
      g.hindernisse.push({ k: b.k, t0: 0, t1: b.L, s0: 0, s1: b.B })
    }
  }
  if (aufzug && aufzug.halte.includes(k)) g.hindernisse.push(...schachtHindernisse(aufzug))
}

/** Mittelpunkt der Ecken. */
function mitteVon(poly: P[]): P {
  let x = 0
  let z = 0
  for (const p of poly) {
    x += p[0]
    z += p[1]
  }
  return [x / poly.length, z / poly.length]
}

/** Der Schacht als Vieleck (lokal). */
function kastenPoly(a: IAufzug): P[] {
  return rechteckForm({ k: a.k, t0: 0, t1: a.breit, s0: 0, s1: a.tief })
}

/** Waende des Schachts als Hindernisse, die Tuer ist immer offen. */
function schachtHindernisse(a: IAufzug): KRechteck[] {
  const tm = a.breit / 2
  const k = a.k
  return [
    { k, t0: 0, t1: tm - A_TUER / 2, s0: 0, s1: A_WAND },
    { k, t0: tm + A_TUER / 2, t1: a.breit, s0: 0, s1: A_WAND },
    { k, t0: 0, t1: a.breit, s0: a.tief - A_WAND, s1: a.tief },
    { k, t0: 0, t1: A_WAND, s0: A_WAND, s1: a.tief - A_WAND },
    { k, t0: a.breit - A_WAND, t1: a.breit, s0: A_WAND, s1: a.tief - A_WAND },
    // Ohne Kabine ist die Tuer zu.
    ...(a.kabine ? [] : [{ k, t0: tm - A_TUER / 2, t1: tm + A_TUER / 2, s0: 0, s1: A_WAND }]),
  ]
}

/** Den Aufzug eines Hauses finden: der erste Schacht von unten, seine
 *  Tuerseite dort, wo Gang, Laubengang oder Stiege davor liegen. */
function aufzugFinden(gs: IGeschoss[]): IAufzug | null {
  let ref: IFlaeche | null = null
  for (const g of gs) {
    ref = g.flaechen.find((f) => f.art === 'aufzug') ?? null
    if (ref) break
  }
  if (!ref) return null
  const { k, L, B } = kastenAn(ref)
  const imSchacht = (p: P) => {
    const dx = p[0] - k.a[0]
    const dz = p[1] - k.a[1]
    const t = dx * k.u[0] + dz * k.u[1]
    const s = dx * k.n[0] + dz * k.n[1]
    return t > -0.3 && t < L + 0.3 && s > -0.3 && s < B + 0.3
  }
  const halte = gs.filter((g) => g.flaechen.some((f) => f.art === 'aufzug' && imSchacht(mitteVon(f.poly)))).map((g) => g.k)
  const um = (u: P): P => [-u[0], -u[1]]
  const seiten: { a: P; u: P; n: P; breit: number; tief: number; mitte: P; raus: P }[] = [
    { a: k.a, u: k.u, n: k.n, breit: L, tief: B, mitte: kp(k, L / 2, 0), raus: um(k.n) },
    { a: kp(k, L, 0), u: k.n, n: um(k.u), breit: B, tief: L, mitte: kp(k, L, B / 2), raus: k.u },
    { a: kp(k, L, B), u: um(k.u), n: um(k.n), breit: L, tief: B, mitte: kp(k, L / 2, B), raus: k.n },
    { a: kp(k, 0, B), u: um(k.n), n: k.u, breit: B, tief: L, mitte: kp(k, 0, B / 2), raus: um(k.u) },
  ]
  // Vor der Tuer: Gang oder Laubengang (gut), Stiege oder Wohnung (schlecht).
  // Bei Gleichstand die Seite zur Mitte des Gangs hin.
  let beste = 0
  let wert = -Infinity
  seiten.forEach((sd, i) => {
    const p: P = [sd.mitte[0] + sd.raus[0] * 0.5, sd.mitte[1] + sd.raus[1] * 0.5]
    let w = sd.breit * 1e-4
    for (const g of gs) {
      if (!halte.includes(g.k)) continue
      for (const f of g.flaechen) {
        if (f.art === 'aufzug' || !innen(p, f.poly)) continue
        if (f.art === 'gang' || f.art === 'laubengang') {
          const m = mitteVon(f.poly)
          w += 2 - Math.min(1, Math.hypot(m[0] - p[0], m[1] - p[1]) * 0.01)
        } else w -= f.art === 'stiege' ? 1.5 : f.wohnung >= 0 ? 2 : 0
      }
    }
    if (w > wert + 1e-9) {
      wert = w
      beste = i
    }
  })
  const sd = seiten[beste]
  return {
    k: { a: sd.a, u: sd.u, n: sd.n, laenge: sd.breit },
    breit: sd.breit,
    tief: sd.tief,
    halte,
    kabine: sd.breit >= 1.5 && sd.tief >= 1.4,
  }
}

/* ------------------------------------------------ Treppen (E87) */

/** Wie tief das Podest am Antritt der Treppe (Kante k, Stiegenhaus L x B)
 *  sein muss, damit es im Geschoss g an Gang oder Laubengang grenzt: 0,
 *  wenn der Gang vor beiden Laeufen liegt; sonst so tief, dass genug Gang
 *  (T_ZUGANG) am Antritt oder an den Seiten des Podests liegt. null: kein
 *  Gang in der Naehe. */
function podestTiefe(k: Kante, L: number, B: number, g: IGeschoss): number | null {
  const gang = g.flaechen.filter((x) => x.art === 'gang' || x.art === 'laubengang')
  const vor = (q: P) => gang.some((x) => innen(q, x.poly))
  const S = 0.25
  let h1 = 0
  let h2 = 0
  for (let s = S / 2; s < B; s += S) {
    if (!vor(kp(k, -0.3, s))) continue
    if (s < B / 2) h1++
    else h2++
  }
  if (h1 * S >= 0.6 && h2 * S >= 0.6) return 0
  let n = h1 + h2
  if (n * S >= T_ZUGANG) return T_ANTRITT
  for (let t = S / 2; t < L; t += S) {
    if (vor(kp(k, t, -0.3))) n++
    if (vor(kp(k, t, B + 0.3))) n++
    if (n * S >= T_ZUGANG) return Math.max(T_ANTRITT, t + S / 2)
  }
  return null
}

/** Die Treppe in einem Stiegenhaus legen (E87): von den vier Seiten die,
 *  an der in allen Geschossen gs der Gang liegt, mit dem groessten
 *  Auftritt (bei Gleichstand dem kleinsten Podest). null: zu schmal fuer
 *  zwei Laeufe, zu kurz oder ohne Gang. */
function treppeLegen(f: IFlaeche, gs: IGeschoss[], gh: number): TreppenLage | null {
  const { k, L, B } = kastenAn(f)
  const mu: P = [-k.u[0], -k.u[1]]
  const mn: P = [-k.n[0], -k.n[1]]
  const seiten: { k: Kante; L: number; B: number }[] = [
    { k, L, B },
    { k: { a: kp(k, L, B), u: mu, n: mn, laenge: L }, L, B },
    { k: { a: kp(k, L, 0), u: k.n, n: mu, laenge: B }, L: B, B: L },
    { k: { a: kp(k, 0, B), u: mn, n: k.u, laenge: B }, L: B, B: L },
  ]
  const R = Math.max(3, Math.round(gh / 2 / T_STEIGUNG))
  let beste: TreppenLage | null = null
  for (const x of seiten) {
    if (x.B / 2 - T_RAND - T_MITTE / 2 < T_LAUF_MIN) continue
    let p = 0
    let ok = true
    for (const g of gs) {
      const pg = podestTiefe(x.k, x.L, x.B, g)
      if (pg === null) {
        ok = false
        break
      }
      p = Math.max(p, pg)
    }
    if (!ok) continue
    const a = Math.min(T_TRITT_MAX, (x.L - p - T_PODEST) / R)
    if (!(a >= T_TRITT_MIN)) continue
    if (!beste || a > beste.a + 1e-9 || (Math.abs(a - beste.a) <= 1e-9 && p < beste.p - 1e-9)) beste = { k: x.k, L: x.L, B: x.B, p, R, a, steig: gh / 2 / R }
  }
  return beste
}

/** Stiegen, die uebereinander liegen, bilden einen Stapel mit einer Lage
 *  fuer alle seine Geschosse (E87). Ein Stapel aus einem Geschoss oder ohne
 *  passende Lage hat keine Treppe (bleibt zu). gs: aufsteigend. */
function stiegenPlanen(gs: IGeschoss[], gh: number): Map<IFlaeche, Stiege> {
  const out = new Map<IFlaeche, Stiege>()
  const nachK = new Map(gs.map((g) => [g.k, g]))
  const gesehen = new Set<IFlaeche>()
  for (const g of gs) {
    for (const f of g.flaechen) {
      if (f.art !== 'stiege' || gesehen.has(f)) continue
      const stapel: { g: IGeschoss; f: IFlaeche }[] = [{ g, f }]
      gesehen.add(f)
      for (;;) {
        const letzte = stapel[stapel.length - 1]
        const oben = nachK.get(letzte.g.k + 1)
        const m = mitteVon(letzte.f.poly)
        const drueber = oben?.flaechen.find((x) => x.art === 'stiege' && !gesehen.has(x) && (innen(m, x.poly) || innen(mitteVon(x.poly), letzte.f.poly)))
        if (!oben || !drueber) break
        stapel.push({ g: oben, f: drueber })
        gesehen.add(drueber)
      }
      const lage = stapel.length >= 2 ? treppeLegen(f, stapel.map((x) => x.g), gh) : null
      if (lage) stapel.forEach((x, i) => out.set(x.f, { lage, hoch: i + 1 < stapel.length, runter: i > 0 }))
    }
  }
  return out
}

/** Hindernisse einer Stiege in ihrem Geschoss (E87): frei sind das Podest
 *  am Antritt und die Laeufe, die hier beginnen oder ankommen, betreten
 *  nur ueber den Antritt; zu sind das Loch zum Zwischenpodest, die Seiten
 *  und die Mittelwand, und eine Haelfte ohne Lauf. */
function stiegeHindernisse(st: Stiege): KRechteck[] {
  const { k, L, B, p, R, a } = st.lage
  const e = p + R * a
  const m = B / 2
  const out: KRechteck[] = [
    { k, t0: e, t1: L + 0.1, s0: -0.1, s1: B + 0.1 },
    { k, t0: p, t1: e, s0: m - T_MITTE / 2, s1: m + T_MITTE / 2 },
    { k, t0: p, t1: L, s0: -0.12, s1: T_RAND },
    { k, t0: p, t1: L, s0: B - T_RAND, s1: B + 0.12 },
  ]
  if (!st.hoch) out.push({ k, t0: p, t1: e, s0: T_RAND, s1: m })
  if (!st.runter) out.push({ k, t0: p, t1: e, s0: m, s1: B - T_RAND })
  return out
}

/** Hindernisse auf der Ebene des Zwischenpodests (E87): rundum zu, frei
 *  nur das Podest und die beiden Laeufe von seiner Seite her. */
function podestHindernisse(l: TreppenLage): KRechteck[] {
  const { k, L, B, p, R, a } = l
  const e = p + R * a
  const m = B / 2
  return [
    { k, t0: p - 0.5, t1: p, s0: -0.3, s1: B + 0.3 },
    { k, t0: p, t1: e, s0: m - T_MITTE / 2, s1: m + T_MITTE / 2 },
    { k, t0: p, t1: L + 0.3, s0: -0.3, s1: T_RAND },
    { k, t0: p, t1: L + 0.3, s0: B - T_RAND, s1: B + 0.3 },
    { k, t0: L - 0.1, t1: L + 0.3, s0: -0.3, s1: B + 0.3 },
  ]
}

/** Die beiden Laeufe einer Treppe (E87): hinauf zum Zwischenpodest und
 *  von dort weiter hinauf. */
function laeufeVon(l: TreppenLage): [Lauf, Lauf] {
  const { k, B, p, R, a } = l
  const m = B / 2
  const breite = m - T_MITTE / 2 - T_RAND
  const tm = p + (R * a) / 2
  return [
    { c: kp(k, tm, T_RAND + breite / 2), u: k.u, laenge: R * a, breite, stufen: R },
    { c: kp(k, tm, m + T_MITTE / 2 + breite / 2), u: [-k.u[0], -k.u[1]], laenge: R * a, breite, stufen: R },
  ]
}

/** Lokal (Meter) -> Plan (cm) im Rahmen x, z, drehung, umgekehrt wie
 *  innenLesen (Siedlung = (x, z) + R(drehung) * Plan / 100); auf mm. */
function cmVon(x: number, z: number, drehung: number): (p: P) => [number, number] {
  const [c, s] = DREH[drehung]
  const mm = (v: number) => Math.round(v * 10) / 10
  return (p: P) => {
    const dx = p[0] - x
    const dz = p[1] - z
    return [mm(100 * (c * dx + s * dz)), mm(100 * (-s * dx + c * dz))]
  }
}

/** Rahmen eines Geschosses fuer erfundene Wohnungen (E87): die x-Achse des
 *  Plans laengs der laengsten Kante (auf 90 Grad gerundet), der Ursprung
 *  so, dass der Umriss bei 0 beginnt. */
function geschossRahmen(h: Haus): { x: number; z: number; drehung: 0 | 90 | 180 | 270 } {
  let e = h.kanten[0]
  for (const k of h.kanten) if (k.laenge > e.laenge) e = k
  const viertel = (((Math.round(Math.atan2(e.u[1], e.u[0]) / (Math.PI / 2)) % 4) + 4) % 4) as 0 | 1 | 2 | 3
  const drehung = ([0, 90, 180, 270] as const)[viertel]
  const [c, s] = DREH[drehung]
  const mx = Math.min(...h.poly.map((p) => c * p[0] + s * p[1]))
  const my = Math.min(...h.poly.map((p) => -s * p[0] + c * p[1]))
  return { x: c * mx - s * my, z: s * mx + c * my, drehung }
}

/* ------------------------------------------------ Farben */

function farbenAus(f: Farben3D) {
  const c = (s: string) => new Color(s)
  const mix = (a: Color, b: Color, t: number) => a.clone().lerp(b, t)
  const b = {
    rasen: c(f.rasen),
    weg: c(f.weg),
    baum: c(f.baum),
    stamm: c(f.stamm),
    hecke: c(f.hecke),
    oben: c(f.himmelOben),
    unten: c(f.himmelUnten),
    fassade: c(f.fassade),
    wand: c(f.wand3d),
    weiss: c(f.weiss),
    metall: c(f.metall),
    schwarz: c(f.schwarz),
    glas: c(f.glas),
    holz: c(f.holz),
    holzDunkel: c(f.holzDunkel),
    rot: c(f.spielRot),
    blau: c(f.spielBlau),
    gelb: c(f.spielGelb),
    gruen: c(f.gruen),
    rahmen: c(f.rahmen3d),
    platte: c(f.platte),
    spiegel: c(f.spiegel),
    // Innen (E84): wie in der Szene der Wohnung.
    wandKopf: c(f.wandKopf),
    tuer3d: c(f.tuer3d),
    zarge3d: c(f.zarge3d),
    eiche: c(f.boden3d),
    keramik: c(f.keramik),
    front: c(f.front),
  }
  return {
    ...b,
    eicheToene: [0.95, 1.0, 1.05].map((k) => c(f.boden3d).multiplyScalar(k)),
    fliesen: [1.0, 0.97, 0.94].map((k) => mix(b.keramik, b.metall, 0.18).multiplyScalar(k)),
    gangPlatten: [1.0, 0.96].map((k) => mix(b.fassade, b.metall, 0.3).multiplyScalar(k)),
    pflasterToene: [1.0, 0.94, 0.97].map((k) => mix(b.weg, b.fassade, 0.25).multiplyScalar(k)),
    deckToene: [0.82, 0.9, 0.86].map((k) => mix(b.holz, b.holzDunkel, 0.25).multiplyScalar(k)),
    privatRasen: mix(b.rasen, b.gruen, 0.35),
    knopf: mix(b.metall, b.weiss, 0.35).multiplyScalar(1.05),
    knopfAn: mix(b.weiss, b.gelb, 0.75),
    fuellung: mix(b.metall, b.schwarz, 0.25),
    putzWeiss: mix(b.fassade, b.weiss, 0.55),
    putzBeige: mix(b.fassade, b.holz, 0.2),
    putzGrau: mix(b.fassade, b.metall, 0.35),
    holzFassade: mix(b.holz, b.rot, 0.25).multiplyScalar(0.8),
    loggiaGelb: mix(b.gelb, b.weiss, 0.45),
    loggiaWeiss: mix(b.fassade, b.weiss, 0.8),
    glasDunkel: mix(b.glas, b.schwarz, 0.62),
    bank: b.weiss.clone().multiplyScalar(0.9),
    gelaender: mix(b.metall, b.weiss, 0.35),
    beton: mix(b.fassade, b.metall, 0.25).multiplyScalar(0.9),
    sockel: b.wand.clone().multiplyScalar(0.72),
    substrat: mix(b.stamm, b.rasen, 0.35).multiplyScalar(0.8),
    kies: mix(b.weg, b.metall, 0.3),
    moos: mix(b.rasen, b.gruen, 0.5),
    sedum: mix(b.rot, b.stamm, 0.45).multiplyScalar(0.9),
    stroh: mix(b.weg, b.gelb, 0.4),
    pv: mix(b.schwarz, b.blau, 0.3),
    asphalt: b.weg.clone().multiplyScalar(0.36),
    bord: mix(b.weg, b.fassade, 0.5),
    pflaster: mix(b.weg, b.fassade, 0.25),
    sand: mix(b.gelb, b.weg, 0.6),
    tuer: mix(b.holzDunkel, b.holz, 0.3),
    trocken: mix(b.rasen, b.weg, 0.6),
    licht: mix(b.weiss, b.gelb, 0.12),
    kabine: mix(b.holz, b.weiss, 0.45),
    nachbar: mix(b.fassade, b.weiss, 0.35),
    laub: [
      mix(b.gelb, b.baum, 0.2),
      mix(b.gelb, b.rot, 0.45),
      mix(b.rot, b.stamm, 0.2),
      mix(b.baum, b.gelb, 0.4),
      b.baum.clone(),
      mix(b.gelb, b.rot, 0.25),
    ],
  }
}


/* ------------------------------------------------ Aufzug */

type Phase = 'ruhe' | 'zu' | 'fahrt' | 'auf' | 'halt'

/** Ein Tuerblatt: Ecken start bis ende im Mesh, gleitet um weg entlang richtung. */
interface Blatt {
  start: number
  ende: number
  richtung: P
  weg: number
}

interface Aufzug {
  phase: Phase
  etage: number
  pos: number
  ziel: number
  von: number
  zeit: number
  dauer: number
  tuer: number
  halt: number
  warte: number[]
  nachFahrt: boolean
  ankunft: number | null
}

/** Zum Abfragen der Ankunft (aufzugZiel), je gebauter Siedlung. */
const ANKUENFTE = new WeakMap<Welt3D, () => number | null>()

/** Index der Ebene, an der der Aufzug gerade angekommen ist und die Tueren
 *  aufgehen; genau einmal je Ankunft, sonst null. Fuer andere Welten null. */
export function aufzugZiel(w: Welt3D): number | null {
  const f = ANKUENFTE.get(w)
  return f ? f() : null
}

/** Was eine Aufzugsteuerung von ihrem Aufzug braucht. Geschosse k sind
 *  die des Hauses; halte sind die, an denen er haelt (aufsteigend). */
interface AufzugTeile {
  halte: number[]
  start: number
  /** Geschosshoehe (Meter): die Kabine steht bei pos * gh (lokal). */
  gh: number
  /** Gibt es die Kabine schon (Innenraeume werden spaeter gebaut)? */
  bereit(): boolean
  kabineY(y: number): void
  etageTueren(k: number, auf: number): void
  kabineTueren(auf: number): void
  leuchten(k: number, an: boolean): void
}

/** Steuerung eines Aufzugs: Tueren zu, fahren, Tueren auf, Halt bei
 *  weiteren Wuenschen. Fuer den Aufzug am Laubengang (E83) und die
 *  Aufzuege in Haeusern mit Plaenen (E84) dieselbe. */
function aufzugSteuern(t: AufzugTeile) {
  const az: Aufzug = { phase: 'ruhe', etage: t.start, pos: t.start, ziel: t.start, von: t.start, zeit: 0, dauer: 0, tuer: 0, halt: 0, warte: [], nachFahrt: false, ankunft: null }
  let gezeigt = az.etage
  const zeigen = () => {
    if (gezeigt !== az.etage) {
      t.etageTueren(gezeigt, 0)
      gezeigt = az.etage
    }
    t.etageTueren(az.etage, az.tuer)
    t.kabineTueren(az.tuer)
  }
  const starten = (k: number) => {
    az.ziel = k
    az.phase = 'zu'
  }
  const anfordern = (k: number) => {
    if (!Number.isInteger(k) || !t.halte.includes(k) || !t.bereit()) return
    if (az.phase !== 'fahrt' && k === az.etage) {
      if (az.phase === 'zu') {
        if (az.ziel !== az.etage) az.warte.unshift(az.ziel)
        az.phase = 'auf'
        az.nachFahrt = false
      } else if (az.phase === 'ruhe' && az.tuer < 1) {
        az.phase = 'auf'
        az.nachFahrt = false
      } else if (az.phase === 'halt') az.halt = HALTE_ZEIT
      return
    }
    if (az.warte.includes(k) || (az.phase === 'fahrt' && az.ziel === k) || (az.phase === 'zu' && az.ziel === k)) return
    t.leuchten(k, true)
    if (az.phase === 'ruhe') starten(k)
    else az.warte.push(k)
  }
  /** Ein Bild; true, solange sich etwas bewegt. */
  const schritt = (dtRoh: number): boolean => {
    if (!t.bereit()) return false
    const dt = Number.isFinite(dtRoh) ? Math.max(0, Math.min(0.1, dtRoh)) : 0
    if (az.phase === 'ruhe') return false
    if (az.phase === 'zu') {
      az.tuer = Math.max(0, az.tuer - dt / TUER_ZEIT)
      if (az.tuer <= 0) {
        if (az.ziel === az.etage) {
          az.phase = 'auf'
          az.nachFahrt = false
        } else {
          az.phase = 'fahrt'
          az.von = az.etage
          az.zeit = 0
          az.dauer = FAHRT_JE_GESCHOSS * Math.abs(az.ziel - az.von)
        }
      }
    } else if (az.phase === 'fahrt') {
      az.zeit += dt
      const p = Math.min(1, az.zeit / az.dauer)
      const e = p * p * (3 - 2 * p)
      az.pos = az.von + (az.ziel - az.von) * e
      if (p >= 1) {
        az.pos = az.ziel
        az.etage = az.ziel
        az.phase = 'auf'
        az.nachFahrt = true
        az.ankunft = az.ziel
        t.leuchten(az.ziel, false)
      }
      t.kabineY(az.pos * t.gh)
    } else if (az.phase === 'auf') {
      az.tuer = Math.min(1, az.tuer + dt / TUER_ZEIT)
      if (az.tuer >= 1) {
        az.nachFahrt = false
        if (az.warte.length) {
          az.phase = 'halt'
          az.halt = HALTE_ZEIT
        } else az.phase = 'ruhe'
      }
    } else if (az.phase === 'halt') {
      az.halt -= dt
      if (az.halt <= 0) {
        const k = az.warte.shift()
        if (k === undefined) az.phase = 'ruhe'
        else starten(k)
      }
    }
    zeigen()
    return az.phase !== 'ruhe'
  }
  /** Waehrend einer Fahrt: Ziel (Geschoss) und Lage (in Geschossen), sonst null. */
  const fahrt = (): { ziel: number; pos: number } | null => {
    if (!t.bereit()) return null
    const faehrt = az.phase === 'fahrt' || (az.phase === 'zu' && az.ziel !== az.etage) || (az.phase === 'auf' && az.nachFahrt)
    return faehrt ? { ziel: az.ziel, pos: az.pos } : null
  }
  /** Geschoss der letzten Ankunft, genau einmal; sonst null. */
  const ankunft = (): number | null => {
    const a = az.ankunft
    az.ankunft = null
    return a
  }
  return { az, anfordern, schritt, fahrt, ankunft, zeigen }
}

/* ------------------------------------------------ Aufbau */

export function baueSiedlung(o: SiedlungOptionen): SiedlungWelt3D {
  const sd = o.siedlung
  if (!sd || !Array.isArray(sd.gebaeude)) throw new Error('Siedlung: keine Daten')
  if (sd.gebaeude.length === 0) throw new Error('Siedlung: keine Haeuser')
  const haeuser = sd.gebaeude.map(hausPruefen)
  const ids = new Set<string>()
  for (const h of haeuser) {
    if (ids.has(h.g.id)) throw new Error(`Siedlung: Kennung ${h.g.id} doppelt`)
    ids.add(h.g.id)
  }

  /* Die eigene Wohnung. */
  let eigen: Haus | null = null
  let geschoss = 0
  let drehung = 0
  let wx = 0
  let wz = 0
  if (sd.wohnung) {
    const w = sd.wohnung
    eigen = haeuser.find((h) => h.g.id === w.gebaeudeId) ?? null
    if (!eigen) throw new Error('Siedlung: das Haus der Wohnung fehlt')
    if (!Number.isInteger(w.geschoss) || w.geschoss < 0 || w.geschoss >= eigen.n) throw new Error('Siedlung: das Geschoss der Wohnung gibt es im Haus nicht')
    if (![0, 90, 180, 270].includes(w.drehung)) throw new Error('Siedlung: drehung muss 0, 90, 180 oder 270 sein')
    geschoss = w.geschoss
    drehung = w.drehung
    wx = zahl(w.x, 'Lage der Wohnung x')
    wz = zahl(w.z, 'Lage der Wohnung z')
  }
  const gh = eigen ? eigen.gh : 3
  const absenk = eigen ? geschoss * gh : 0

  /* Draussen. */
  const a = sd.aussen ?? { spielplatz: null, tiefgarage: null, wege: [] }
  const spielPoly = a.spielplatz ? a.spielplatz.map((p, i) => punkt(p, `Spielplatz, Punkt ${i + 1}`)) : null
  if (spielPoly && (spielPoly.length < 3 || Math.abs(flaecheVon(spielPoly)) < 4)) throw new Error('Siedlung: der Spielplatz hat keine Flaeche')
  let rampe: Rampe | null = null
  if (a.tiefgarage) {
    const t = a.tiefgarage
    rampe = {
      x: zahl(t.x, 'Tiefgarage x'),
      z: zahl(t.z, 'Tiefgarage z'),
      breite: zahl(t.breite, 'Tiefgarage breite'),
      laenge: zahl(t.laenge, 'Tiefgarage laenge'),
      drehung: zahl(t.drehung, 'Tiefgarage drehung'),
    }
    if (rampe.breite < 2 || rampe.laenge < 4) throw new Error('Siedlung: die Rampe der Tiefgarage ist zu klein')
  }
  if (!Array.isArray(a.wege)) throw new Error('Siedlung: wege ist keine Liste')
  const wege: P[][] = a.wege.map((w, i) => {
    if (!Array.isArray(w) || w.length < 2) throw new Error(`Siedlung: Weg ${i + 1} braucht zwei Punkte`)
    return w.map((p, j) => punkt(p, `Weg ${i + 1}, Punkt ${j + 1}`))
  })

  /* Lage: lokal -> Welt dreht um drehung zurueck, verschiebt und senkt. */
  const alle = haeuser.flatMap((h) => h.poly)
  const bx0 = Math.min(...alle.map((p) => p[0]))
  const bx1 = Math.max(...alle.map((p) => p[0]))
  const bz0 = Math.min(...alle.map((p) => p[1]))
  const bz1 = Math.max(...alle.map((p) => p[1]))
  if (!eigen) {
    wx = (bx0 + bx1) / 2
    wz = (bz0 + bz1) / 2
  }
  const [cs, sn] = ({ 0: [1, 0], 90: [0, 1], 180: [-1, 0], 270: [0, -1] } as Record<number, [number, number]>)[drehung]
  const rad = (drehung * Math.PI) / 180
  const nachWelt = (p: P): P => {
    const dx = p[0] - wx
    const dz = p[1] - wz
    return [cs * dx + sn * dz, -sn * dx + cs * dz]
  }
  const nachLokal = (p: P): P => [wx + cs * p[0] - sn * p[1], wz + sn * p[0] + cs * p[1]]
  const kastenLokal = (r: Kasten): Kasten => {
    const e = [nachLokal([r[0], r[1]]), nachLokal([r[2], r[3]])]
    return [Math.min(e[0][0], e[1][0]), Math.min(e[0][1], e[1][1]), Math.max(e[0][0], e[1][0]), Math.max(e[0][1], e[1][1])]
  }
  /** Lokale Richtung in die Welt (ohne Verschiebung). */
  const richtungWelt = (d: P): P => [cs * d[0] + sn * d[1], -sn * d[0] + cs * d[1]]

  /* Die Aussparung fuer die Wohnung, lokal. */
  const rahmenWelt = o.wohnungRahmen ? ordnen(o.wohnungRahmen, 'wohnungRahmen') : null
  const rahmenLokal = rahmenWelt ? kastenLokal(rahmenWelt) : null
  const sch: Schnitt | null = rahmenLokal
    ? {
        r: [rahmenLokal[0] - RAND, rahmenLokal[1] - RAND, rahmenLokal[2] + RAND, rahmenLokal[3] + RAND],
        y0: absenk - 0.02,
        y1: absenk + gh - 0.05,
      }
    : null
  /** Die eingerichtete Wohnung steht in der Szene (Besitzer mit Rahmen).
   *  Gaeste (E86) haben siedlung.wohnung, aber keinen Rahmen: gleiche
   *  Lage, nichts ausgespart, keine Ebene 'wohnung'. */
  const wohnungDa = !!eigen && !!rahmenLokal

  /* ------------------------------------------------ Strassenseite */
  /* Die Seite der Siedlung (Ost, Sued, West, Nord), an der am meisten
   * Fassade in einer Flucht steht. Dort liegt die Strasse (ohne Stadt). */
  const SEITEN: { name: string; q: P }[] = [
    { name: 'ost', q: [1, 0] },
    { name: 'sued', q: [0, 1] },
    { name: 'west', q: [-1, 0] },
    { name: 'nord', q: [0, -1] },
  ]
  let seite = SEITEN[0]
  let besteWertung = -1
  for (const s of SEITEN) {
    const c0 = Math.max(...alle.map((p) => p[0] * s.q[0] + p[1] * s.q[1]))
    let w = 0
    for (const h of haeuser) {
      for (const k of h.kanten) {
        const m = kp(k, k.laenge / 2, 0)
        if (k.n[0] * s.q[0] + k.n[1] * s.q[1] > 0.97 && Math.abs(m[0] * s.q[0] + m[1] * s.q[1] - c0) <= 3) w += k.laenge
      }
    }
    if (w > besteWertung + EPS) {
      besteWertung = w
      seite = s
    }
  }
  const q = seite.q
  const l: P = [-q[1], q[0]]
  const qv = (p: P) => p[0] * q[0] + p[1] * q[1]
  const lv = (p: P) => p[0] * l[0] + p[1] * l[1]
  const c0 = Math.max(...alle.map(qv))
  const qmin = Math.min(...alle.map(qv))
  const lmin = Math.min(...alle.map(lv))
  const lmax = Math.max(...alle.map(lv))
  const lmitte = (lmin + lmax) / 2
  /** Kante entlang der Strasse: t ist die Lage laengs, s der Abstand quer. */
  const sk: Kante = { a: [0, 0], u: l, n: q, laenge: 0 }
  const strasseQ0 = c0 + VORGARTEN
  const strasseQ1 = strasseQ0 + 2 * GEHSTEIG + 2 * BORD + FAHRBAHN

  /* ------------------------------------------------ Rampe (Lage) */
  /* Die Grube der Tiefgarage; faellt weg, wenn sie die Wohnung trifft. */
  let rampeLage: { rk: Kante; d: P; L: number; B: number; W: number; unten: number; grube: KRechteck } | null = null
  let loch: P[] | null = null
  if (rampe) {
    const d: P = [Math.cos((rampe.drehung * Math.PI) / 180), Math.sin((rampe.drehung * Math.PI) / 180)]
    const rk: Kante = { a: [rampe.x, rampe.z], u: d, n: [-d[1], d[0]], laenge: rampe.laenge }
    const L = rampe.laenge
    const B = rampe.breite
    const T = Math.min(3.2, 0.16 * L)
    const W = 0.25
    const grube: KRechteck = { k: rk, t0: -L / 2, t1: L / 2 + W, s0: -B / 2 - W, s1: B / 2 + W }
    const form = rechteckForm(grube)
    const unten = -T - 0.02
    if (!trifftKasten(sch, ...kastenVon(form), unten - 0.4, 1.2)) {
      rampeLage = { rk, d, L, B, W, unten, grube }
      loch = form
    }
  }

  /* ------------------------------------------------ Laubengang und Kern (Lage) */
  /* Der Gang liegt an der Kante des eigenen Hauses, die am meisten nach
   * Norden zeigt, der Kern an dem Ende, das naeher an der Strasse liegt
   * (oder am anderen, wenn dort etwas im Weg steht). Hat das eigene Haus
   * Plaene (E84, auch erfundene, E87), kommen Gang, Stiege und Aufzug aus
   * ihnen. */
  const eigenPlaene = !!eigen && Array.isArray(sd.innen) && sd.innen.some((r) => !!r && r.gebaeudeId === eigen.g.id)
  let gang: Kante | null = null
  let kernEnde: 0 | 1 = 1
  let mitKern = false
  if (eigen && !eigenPlaene) {
    let beste = -Infinity
    for (const k of eigen.kanten) {
      if (k.laenge < 4) continue
      const w = -k.n[1] + k.laenge * 1e-4
      if (w > beste) {
        beste = w
        gang = k
      }
    }
    if (gang) {
      const g = gang
      const kernForm = (ende: 0 | 1) => {
        const t0 = ende === 1 ? g.laenge - K_LAENGE : 0
        return rechteckForm({ k: g, t0, t1: t0 + K_LAENGE, s0: K_S0, s1: K_S1 })
      }
      const ok = (ende: 0 | 1) => {
        const f = kernForm(ende)
        const andere = haeuser.filter((h) => h !== eigen).every((h) => abstandFormen(f, h.poly) >= 0.5)
        const spiel = !spielPoly || abstandFormen(f, spielPoly) >= 0.5
        const grube = !loch || abstandFormen(f, loch) >= 0.5
        const xs = f.map((p) => p[0])
        const zs = f.map((p) => p[1])
        const wohnung = !sch || !trifftKasten(sch, Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs), -1, 999)
        return { gut: andere && spiel && grube, wohnung }
      }
      const naeher: 0 | 1 = qv(kp(g, g.laenge, 0)) >= qv(kp(g, 0, 0)) ? 1 : 0
      const reihe: (0 | 1)[] = [naeher, naeher === 1 ? 0 : 1]
      const passend = reihe.find((e) => ok(e).gut && ok(e).wohnung) ?? reihe.find((e) => ok(e).wohnung)
      if (g.laenge >= K_LAENGE + 2 && passend !== undefined) {
        kernEnde = passend
        mitKern = true
      }
    }
  }
  /** Laengs am Gang: x im Kern (vom aeusseren Ende) als t an der Gangkante. */
  const kt = (x: number) => (gang && kernEnde === 1 ? gang.laenge - x : x)
  const ktSpanne = (x0: number, x1: number): [number, number] => {
    const a1 = kt(x0)
    const b1 = kt(x1)
    return [Math.min(a1, b1), Math.max(a1, b1)]
  }

  /* ------------------------------------------------ Innen (E84, E87) */
  /* Haeuser mit Plaenen: Geschosse, Waende, Tueren, Treppen, Aufzug und
   * Hindernisse werden hier gerechnet (nur Zahlen); gebaut wird ein Haus
   * erst, wenn die Kamera hineingeht (kamera()). Auf dem Geschoss der
   * eigenen Wohnung fallen Wohnungen weg, die in ihrem Rechteck liegen.
   * Haeuser ohne Plaene bekommen erfundene Wohnungen (innenGenerator.ts),
   * wenn er welche liefert; sonst bleiben sie wie bisher. */
  const rohe: { roh: SiedlungInnenHaus; h: Haus; erfunden: boolean }[] = []
  if (sd.innen != null) {
    if (!Array.isArray(sd.innen)) throw new Error('Siedlung: innen ist keine Liste')
    for (const roh of sd.innen) {
      const h = roh ? haeuser.find((x) => x.g.id === roh.gebaeudeId) : undefined
      if (!roh || !h) throw new Error(`Siedlung: innen fuer ein Haus, das es nicht gibt (${String(roh?.gebaeudeId)})`)
      if (rohe.some((x) => x.h === h)) throw new Error(`Siedlung: innen fuer ${h.g.name || h.g.id} doppelt`)
      rohe.push({ roh, h, erfunden: false })
    }
  }
  /** Erfundene Haeuser, die verworfen wurden (der Grund steht in der Konsole). */
  let innenFehler = 0
  {
    const erfinden = o.innenErfinden ?? wohnhausInnen
    for (const h of haeuser) {
      if (rohe.some((x) => x.h === h)) continue
      const fr = geschossRahmen(h)
      const nachCm = cmVon(fr.x, fr.z, fr.drehung)
      const kernCm: [number, number][][] = []
      const gangCm: [number, number][][] = []
      if (h === eigen && gang) {
        gangCm.push(rechteckForm({ k: gang, t0: 0, t1: gang.laenge, s0: 0, s1: GANG }).map(nachCm))
        if (mitKern) {
          const [t0, t1] = ktSpanne(0, K_LAENGE)
          kernCm.push(rechteckForm({ k: gang, t0, t1, s0: K_S0, s1: K_S1 }).map(nachCm))
        }
      }
      let roh: SiedlungInnenHaus | null = null
      try {
        roh = erfinden({ gebaeudeId: h.g.id, x: fr.x, z: fr.z, drehung: fr.drehung, umrissCm: h.poly.map(nachCm), geschosse: h.n, kern: kernCm, gang: gangCm })
      } catch (err) {
        console.warn(`[siedlung] Wohnungen fuer ${h.g.name || h.g.id} nicht erfunden:`, err)
        innenFehler++
        continue
      }
      if (!roh) continue
      if (roh.gebaeudeId !== h.g.id) {
        console.warn(`[siedlung] Wohnungen fuer ${h.g.name || h.g.id} verworfen: falsches Haus (${String(roh.gebaeudeId)})`)
        innenFehler++
        continue
      }
      rohe.push({ roh: h === eigen && gang ? kernDazu(roh, gang) : roh, h, erfunden: true })
    }
  }
  const innenListe: InnenHaus[] = []
  const innenNach = new Map<string, InnenHaus>()
  for (const { roh, h, erfunden } of rohe) {
    let ih: InnenHaus
    try {
      ih = innenHausAus(roh, h)
    } catch (err) {
      // Echte Plaene werfen laut; erfundene fallen weg, das Haus bleibt zu.
      if (!erfunden) throw err
      console.warn(`[siedlung] erfundene Wohnungen fuer ${h.g.name || h.g.id} verworfen:`, err)
      innenFehler++
      continue
    }
    innenListe.push(ih)
    innenNach.set(h.g.id, ih)
  }
  const eigenInnen = eigen ? (innenNach.get(eigen.g.id) ?? null) : null
  // Hat das eigene Haus jetzt (erfundene) Plaene, kommen Gang und Kern aus ihnen.
  if (eigenInnen) {
    gang = null
    mitKern = false
  }

  /** Ein Haus mit Plaenen lesen und planen (nur Zahlen). */
  function innenHausAus(roh: SiedlungInnenHaus, h: Haus): InnenHaus {
    const geschosse = innenLesen(roh, h)
    if (h === eigen && rahmenLokal) {
      const g = geschosse.find((x) => x.k === geschoss)
      if (g) eigeneWeg(g, rahmenLokal)
    }
    const aufzug = aufzugFinden(geschosse)
    const stiegen = stiegenPlanen(geschosse, h.gh)
    for (const g of geschosse) geschossPlanen(g, h, aufzug, stiegen)
    const vorne = (geschosse.find((g) => g.k === 0)?.flaechen ?? []).filter((f) => f.art === 'draussen' && !f.weg).map((f) => f.poly)
    const anbau = geschosse.flatMap((g) => g.flaechen.filter((f) => f.wohnung < 0 && !innen(mitteVon(f.poly), h.poly)).map((f) => f.poly))
    const [x0, z0, x1, z1] = kastenVon([...h.poly, ...vorne.flat(), ...anbau.flat()])
    const ih: InnenHaus = {
      h,
      geschosse,
      nachK: new Map(geschosse.map((g) => [g.k, g])),
      aufzug,
      zone: [x0 - ZONE_RAND, z0 - ZONE_RAND, x1 + ZONE_RAND, z1 + ZONE_RAND],
      vorne,
      anbau,
      huelle: new Puffer(),
      huelleMesh: null,
      gruppe: new Group(),
      stock: new Map(),
      offen: geschosse.map((g) => g.k),
      halb: new Map(),
      ms: new Map(),
      teile: false,
      lift: null,
      stiegen,
    }
    ih.gruppe.name = `innen:${h.g.id}`
    ih.gruppe.visible = false
    return ih
  }

  /** Kern und Laubengang (E83) als allgemeine Flaechen in erfundene Plaene
   *  des eigenen Hauses, wo dort noch keine solche liegt: so baut die
   *  Pipeline der Plaene Stiege mit Treppe, Aufzug und Laubengang; das
   *  Podest vor der Treppe gehoert zum Laubengang. */
  function kernDazu(roh: SiedlungInnenHaus, g: Kante): SiedlungInnenHaus {
    if (!Array.isArray(roh.geschosse) || ![0, 90, 180, 270].includes(roh.drehung) || !Number.isFinite(roh.x) || !Number.isFinite(roh.z)) return roh
    const nachCm = cmVon(roh.x, roh.z, roh.drehung)
    const [c, s] = DREH[roh.drehung]
    const ausCm = (v: unknown): P | null =>
      Array.isArray(v) && Number.isFinite(v[0]) && Number.isFinite(v[1]) ? [roh.x + (c * v[0] - s * v[1]) / 100, roh.z + (s * v[0] + c * v[1]) / 100] : null
    const neu: { art: 'stiege' | 'aufzug' | 'laubengang'; punkte: P[] }[] = [{ art: 'laubengang', punkte: rechteckForm({ k: g, t0: 0, t1: g.laenge, s0: 0, s1: GANG }) }]
    if (mitKern) {
      const teil = (x0: number, x1: number, art: 'stiege' | 'aufzug' | 'laubengang') => {
        const [t0, t1] = ktSpanne(x0, x1)
        return { art, punkte: rechteckForm({ k: g, t0, t1, s0: K_S0, s1: K_S1 }) }
      }
      neu.push(teil(0, K_SCHACHT, 'aufzug'), teil(K_SCHACHT, K_PODEST, 'laubengang'), teil(K_PODEST, K_LAENGE, 'stiege'))
    }
    const geschosse: SiedlungInnenGeschoss[] = roh.geschosse.map((gs) => {
      if (!gs || !Array.isArray(gs.allgemein)) return gs
      // Gang und Kern, die der Generator als ganze Flaechen uebernommen hat
      // ('gang' ueber dem Laubengang, 'stiege' ueber dem ganzen Kern),
      // ersetzen die genauen Teile; sonst laegen Boeden doppelt (Flimmern)
      // und die Treppe koennte im Schacht landen.
      const behalten = gs.allgemein.filter((a) => {
        if (!a || !Array.isArray(a.punkte) || a.punkte.length < 3) return true
        if (a.art !== 'gang' && a.art !== 'stiege' && a.art !== 'aufzug' && a.art !== 'laubengang') return true
        const poly = a.punkte.map(ausCm)
        if (!poly.every((x) => x !== null)) return true
        const p = poly as P[]
        return !neu.some((n) => innen(mitteVon(n.punkte), p) || innen(mitteVon(p), n.punkte))
      })
      const schon = (n: { art: string; punkte: P[] }) =>
        behalten.some((a) => {
          if (!a || a.art !== n.art || !Array.isArray(a.punkte) || a.punkte.length < 3) return false
          const poly = a.punkte.map(ausCm)
          return poly.every((x) => x !== null) && innen(mitteVon(n.punkte), poly as P[])
        })
      const dazu = neu.filter((n) => !schon(n)).map((n) => ({ art: n.art, punkte: n.punkte.map(nachCm) }))
      return dazu.length || behalten.length !== gs.allgemein.length ? { ...gs, allgemein: [...behalten, ...dazu] } : gs
    })
    return { ...roh, geschosse }
  }

  /* ------------------------------------------------ Stadt (E87) */
  /* Die Umgebung aus siedlung.stadt: ihre Gruppe, ihre Hindernisse und ihr
   * Gelaende auf der Ebene des Bodens (Kennung bodenId, immer Index 0),
   * ihre Ebenen hinter den eigenen. Mit Stadt faellt die eigene weite
   * Umgebung weg (Wiese bis 300 m, Strasse, Hecken, Laternen, erfundene
   * Nachbarn); es bleibt der Grund der Siedlung. Unbrauchbare Daten:
   * stadtFehler, und die Siedlung steht wie ohne Stadt. */
  const bodenId = innenListe.length ? (wohnungDa && geschoss === 0 ? 'wohnung' : 'boden') : eigen ? (wohnungDa && geschoss === 0 ? 'wohnung' : 'geschoss-0') : 'garten'
  let stadt: StadtWelt | null = null
  let stadtFehler: string | null = null
  if (sd.stadt != null) {
    const probleme = stadtPruefen(sd.stadt)
    if (probleme.length) stadtFehler = `Siedlung: die Stadt ist ungueltig (${probleme.slice(0, 3).join(', ')})`
    else {
      try {
        const zuWelt = new Matrix4().makeRotationY(rad).setPosition(-(cs * wx + sn * wz), -absenk, -(-sn * wx + cs * wz))
        // Kein Gelaende der Stadt, wo die Siedlung ihren Boden selbst zeichnet
        // (um Haeuser, Spielplatz und Wege, innerhalb der eigenen Wiese, kein
        // Flimmern) und in der Grube der Rampe (sonst laege es darueber).
        const kern = kastenVon([...alle, ...(spielPoly ?? []), ...wege.flat(), ...(loch ?? [])])
        const aussparen: [number, number][][] = [
          [
            [kern[0] - KERN_RAND, kern[1] - KERN_RAND],
            [kern[2] + KERN_RAND, kern[1] - KERN_RAND],
            [kern[2] + KERN_RAND, kern[3] + KERN_RAND],
            [kern[0] - KERN_RAND, kern[3] + KERN_RAND],
          ],
        ]
        if (loch) aussparen.push(loch.map((p): [number, number] => [p[0], p[1]]))
        stadt = (o.stadtBauen ?? baueStadt)({ stadt: sd.stadt, farben: o.farben, zuWelt, bodenEbene: bodenId, bodenY: -absenk, aussparen })
      } catch (err) {
        stadtFehler = `Siedlung: die Stadt laesst sich nicht bauen (${err instanceof Error ? err.message : String(err)})`
      }
    }
    if (stadtFehler) console.warn(`[siedlung] ${stadtFehler}`)
  }
  const stadtDa = stadt !== null

  const F = farbenAus(o.farben)
  const zz = zufallMit(
    saatAus([
      ...alle.flat(),
      ...haeuser.map((h) => h.n),
      ...(spielPoly ?? []).flat(),
      ...wege.flat(2),
      ...(rampe ? [rampe.x, rampe.z, rampe.laenge] : []),
    ]),
  )

  const bauten = new Puffer()
  /** Wohin Fassade, Fenster, Loggien und Balkone gehen: bauten, bei
   *  Haeusern mit Plaenen deren Huelle (E84). */
  let fp = bauten
  const gelaende = new Puffer()
  const gruen = new Puffer()
  const boden = new Puffer()

  /** Belegte Flaechen fuer das Verteilen von Baeumen, Parkplatz und Co.,
   *  mit Rahmen, damit weit Entferntes gleich wegfaellt. */
  const belegt: { form: P[]; r: Kasten }[] = []
  const belegen = (form: P[]) => {
    belegt.push({ form, r: kastenVon(form) })
  }
  const frei = (form: P[], d: number, ausser: P[] | null = null) => {
    const r = kastenVon(form)
    for (const b of belegt) {
      if (b.form === ausser) continue
      if (r[0] - b.r[2] >= d || b.r[0] - r[2] >= d || r[1] - b.r[3] >= d || b.r[1] - r[3] >= d) continue
      if (abstandFormen(form, b.form) < d) return false
    }
    return true
  }
  /** Hindernisse draussen (lokal). */
  const garten: KRechteck[] = []

  /* ------------------------------------------------ Strasse (ohne Stadt) */
  if (!stadtDa) {
    const t0 = lmitte - STRASSE_HALB
    const t1 = lmitte + STRASSE_HALB
    const baender: [number, number, number, Color][] = [
      [0, GEHSTEIG, 0.08, F.weg],
      [GEHSTEIG, GEHSTEIG + BORD, 0.1, F.bord],
      [GEHSTEIG + BORD, GEHSTEIG + BORD + FAHRBAHN, -0.025, F.asphalt],
      [GEHSTEIG + BORD + FAHRBAHN, GEHSTEIG + 2 * BORD + FAHRBAHN, 0.1, F.bord],
      [GEHSTEIG + 2 * BORD + FAHRBAHN, 2 * GEHSTEIG + 2 * BORD + FAHRBAHN, 0.08, F.weg],
    ]
    for (const [s0, s1, oben, f] of baender) kq(gelaende, sk, t0, t1, strasseQ0 + s0, strasseQ0 + s1, -0.2, oben, f, sch)
    belegen(rechteckForm({ k: sk, t0, t1, s0: strasseQ0, s1: strasseQ1 }))
  }

  /* ------------------------------------------------ Rampe der Tiefgarage */
  if (rampeLage) {
    const { rk, d, L, B, W, unten, grube } = rampeLage
    // Fahrbahn: schraege Platte von oben (Gelaende) nach unten.
    const ax = normiert([d[0] * L, unten - GEH, d[1] * L])
    let az: V3 = [-d[1], 0, d[0]]
    let ay = kreuz(az, ax)
    if (ay[1] < 0) {
      az = [-az[0], -az[1], -az[2]]
      ay = kreuz(az, ax)
    }
    const lang = Math.hypot(L, unten - GEH)
    const m: V3 = [rk.a[0] - ay[0] * 0.125, (GEH + unten) / 2 - ay[1] * 0.125, rk.a[1] - ay[2] * 0.125]
    gelaende.quader(m, ax, ay, az, lang, 0.25, B, F.asphalt)
    // Boden vor dem Tor, Seitenwaende, Stirnwand mit Tor, Gelaender.
    kq(gelaende, rk, L / 2 - 0.01, L / 2 + W, -B / 2, B / 2, unten - 0.3, unten, F.asphalt, null)
    for (const s of [-1, 1]) {
      const s0 = s < 0 ? -B / 2 - W : B / 2
      kq(bauten, rk, -L / 2, L / 2 + W, s0, s0 + W, unten - 0.3, 0.95, F.beton, null)
      gelaenderLinie(bauten, rk, -L / 2 + 0.1, L / 2 + W - 0.1, s0 + W / 2, 0.95, F.gelaender, null, 0.1, 0)
    }
    kq(bauten, rk, L / 2, L / 2 + W, -B / 2, B / 2, unten - 0.3, 0.95, F.beton, null)
    kq(bauten, rk, L / 2 - 0.03, L / 2, -B / 2 + 0.3, B / 2 - 0.3, unten, unten + 2.3, F.schwarz, null)
    gelaenderLinie(bauten, quer(rk, L / 2 + W / 2), -B / 2 - W, B / 2 + W, 0, 0.95, F.gelaender, null, 0.1, 0)
    belegen(rechteckForm(wachsen(grube, 0.5)))
    garten.push(grube)
  }

  /* ------------------------------------------------ Spielplatz */
  let spielgeraete = 0
  if (spielPoly) {
    belegen(spielPoly)
    const kanten = kantenVon(spielPoly)
    const ganz = spielPoly.flat()
    const xs = ganz.filter((_, i) => i % 2 === 0)
    const zs = ganz.filter((_, i) => i % 2 === 1)
    if (!trifftKasten(sch, Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs), -0.1, 3.5)) {
      gelaende.flaeche(spielPoly, -0.015, F.sand)
      for (const k of kanten) kq(gelaende, k, 0, k.laenge, -0.12, 0, -0.1, 0.06, F.holz, sch)
      spielgeraete = spielplatz(spielPoly, kanten)
    }
  }

  /* ------------------------------------------------ Wege */
  for (const w of wege) {
    for (let i = 0; i + 1 < w.length; i++) {
      const k = kanteVon(w[i], w[i + 1])
      if (k.laenge < 0.05) continue
      kq(gelaende, k, 0, k.laenge, -WEG_BREIT / 2, WEG_BREIT / 2, GEH - 0.05, GEH, F.pflaster, sch)
      belegen([w[i], w[i + 1]])
    }
    // Runde Stoesse an den Knicken.
    for (let i = 1; i + 1 < w.length; i++) {
      const [x, z] = w[i]
      if (trifftKasten(sch, x - 1, z - 1, x + 1, z + 1, GEH - 0.05, GEH)) continue
      gelaende.form(walze(), achsenMatrix([x, GEH - 0.025, z], [1, 0, 0], [0, 1, 0], [0, 0, 1], WEG_BREIT / 2, 0.05, WEG_BREIT / 2), F.pflaster)
    }
  }
  /** Abstand zu einem Weg (Mittellinie). */
  const wegAbstand = (form: P[]) => {
    let d = Infinity
    for (const w of wege) for (let i = 0; i + 1 < w.length; i++) d = Math.min(d, abstandFormen(form, [w[i], w[i + 1]]))
    return d
  }
  /* Laubengang und Kern: ihr Platz ist belegt. */
  if (gang) belegen(rechteckForm({ k: gang, t0: -0.5, t1: gang.laenge + 0.5, s0: 0, s1: mitKern ? K_S1 + 0.3 : GANG + 0.3 }))

  /* ------------------------------------------------ Haeuser */
  const fassadeVon = (h: Haus): Color =>
    h.stil === 'weiss_loggia' ? F.putzWeiss : h.stil === 'holz' ? F.holzFassade : h.stil === 'grau' ? F.putzGrau : F.putzBeige
  const innenVon = (h: Haus): Color => (h.stil === 'weiss_loggia' ? F.loggiaGelb : h.stil === 'holz' ? F.loggiaWeiss : F.loggiaWeiss)

  /** Fenster mit hellem Rahmen, dunklem Glas, Sprosse und Bank. */
  function fenster(k: Kante, t: number, y0: number, w: number, h: number, rahmen: Color = F.rahmen): boolean {
    if (trifft(sch, k, t - w / 2, t + w / 2, -WAND, 0.1, y0 - 0.12, y0 + h + 0.08, 0.05)) return false
    kq(fp, k, t - w / 2 - 0.06, t + w / 2 + 0.06, 0, 0.03, y0 - 0.06, y0 + h + 0.06, rahmen, null)
    kf(fp, k, t - w / 2, t + w / 2, 0.034, y0, y0 + h, F.glasDunkel)
    if (w > 1.05) kf(fp, k, t - 0.025, t + 0.025, 0.038, y0, y0 + h, rahmen)
    kq(fp, k, t - w / 2 - 0.08, t + w / 2 + 0.08, 0, 0.08, y0 - 0.1, y0 - 0.06, F.bank, null)
    return true
  }

  /** Tuer mit Rahmen (Wohnungstuer am Gang, Hauseingang). */
  function tuer(k: Kante, t: number, y0: number, w: number, h: number, blatt: Color): boolean {
    if (trifft(sch, k, t - w / 2, t + w / 2, -WAND, 0.1, y0 - 0.05, y0 + h + 0.08, 0.05)) return false
    kq(fp, k, t - w / 2 - 0.07, t + w / 2 + 0.07, 0, 0.03, y0, y0 + h + 0.07, F.rahmen, null)
    kf(fp, k, t - w / 2, t + w / 2, 0.034, y0, y0 + h, blatt)
    return true
  }

  /** Gelaender entlang einer Kante von t0 bis t1 bei s, Boden y0: Handlauf,
   *  Fussleiste, Pfosten und Staebe (Abstand stab; 0 ohne Staebe). */
  function gelaenderLinie(p: Puffer, k: Kante, t0: number, t1: number, s: number, y0: number, f: Color, schn: Schnitt | null, hoehe = 1.0, stab = 0.16): void {
    const lang = t1 - t0
    if (lang < 0.15) return
    kq(p, k, t0, t1, s - 0.025, s + 0.025, y0 + hoehe - 0.045, y0 + hoehe, f, schn)
    if (stab > 0) kq(p, k, t0, t1, s - 0.012, s + 0.012, y0 + 0.08, y0 + 0.12, f, schn)
    const pfosten = Math.max(1, Math.ceil(lang / 1.6))
    for (let i = 0; i <= pfosten; i++) {
      const t = t0 + (lang * i) / pfosten
      kq(p, k, t - 0.025, t + 0.025, s - 0.025, s + 0.025, y0, y0 + hoehe - 0.045, f, schn)
    }
    if (stab <= 0) return
    const n = Math.max(1, Math.round(lang / stab))
    for (let i = 1; i < n; i++) {
      const t = t0 + (lang * i) / n
      kq(p, k, t - 0.009, t + 0.009, s - 0.009, s + 0.009, y0 + 0.12, y0 + hoehe - 0.045, f, schn, 0, false)
    }
  }

  /** Eine Nische (Loggia) an der Kante k, t0..t1, Tiefe d, im Geschoss g
   *  des Hauses h. offen: welche Seite zur Nachbarfassade offen ist. */
  function nische(h: Haus, k: Kante, t0: number, t1: number, d: number, g: number, offen: 'anfang' | 'ende' | null, gelaender: boolean, decke: boolean): void {
    const y = g * h.gh
    const innen = innenVon(h)
    const fassade = fassadeVon(h)
    // Rueckwand und Seitenwaende.
    kq(fp, k, t0, t1, -d - 0.2, -d, y - 0.02, y + h.gh, innen, sch)
    if (offen !== 'anfang') kq(fp, k, t0 - 0.2, t0, -d - 0.2, -WAND, y - 0.02, y + h.gh, innen, sch)
    if (offen !== 'ende') kq(fp, k, t1, t1 + 0.2, -d - 0.2, -WAND, y - 0.02, y + h.gh, innen, sch)
    // Boden (Platte) und Decke darueber.
    kq(fp, k, t0, t1, -d, 0, y - 0.3, y + GEH, fassade, sch)
    if (g === h.n - 1) kq(fp, k, t0, t1, -d, 0, h.H - 0.3, h.H + DACH, fassade, sch)
    else if (decke) kq(fp, k, t0, t1, -d, 0, y + h.gh - 0.3, y + h.gh + GEH, fassade, sch)
    // Eckpfeiler der offenen Ecke.
    if (offen === 'anfang') kq(fp, k, t0, t0 + 0.35, -0.35, 0, y - 0.02, y + h.gh, fassade, sch)
    if (offen === 'ende') kq(fp, k, t1 - 0.35, t1, -0.35, 0, y - 0.02, y + h.gh, fassade, sch)
    // Fenstertuer in der Rueckwand.
    const rk = versetzt(k, -d)
    const breit = Math.min(2.2, (t1 - t0) * 0.6)
    tuer(rk, (t0 + t1) / 2 + (offen === 'anfang' ? 0.3 : offen === 'ende' ? -0.3 : 0), y + GEH, breit, 2.25, F.glasDunkel)
    if (!gelaender) return
    const a0 = offen === 'anfang' ? t0 + 0.35 : t0
    const a1 = offen === 'ende' ? t1 - 0.35 : t1
    gelaenderLinie(fp, k, a0, a1, -0.06, y + GEH, F.gelaender, sch)
    if (offen) {
      const qk = quer(k, offen === 'anfang' ? t0 + 0.06 : t1 - 0.06)
      // Laengs zeigt die Querkante nach aussen: von -d bis kurz vor die Ecke.
      gelaenderLinie(fp, qk, -d, -0.35, 0, y + GEH, F.gelaender, sch)
    }
  }

  /** Vorgestellter Balkon an der Kante k um tm, im Geschoss g. */
  function balkon(h: Haus, k: Kante, tm: number, g: number): boolean {
    const y = g * h.gh
    const w = 3.0
    const d = 1.5
    if (trifft(sch, k, tm - w / 2, tm + w / 2, -WAND, d, y - 0.3, y + h.gh, 0.5)) return false
    const form = rechteckForm({ k, t0: tm - w / 2, t1: tm + w / 2, s0: 0, s1: d })
    if (haeuser.some((x) => x !== h && abstandFormen(form, x.poly) < 0.5)) return false
    kq(fp, k, tm - w / 2, tm + w / 2, 0, d, y - 0.24, y + GEH, F.putzWeiss, null)
    gelaenderLinie(fp, k, tm - w / 2 + 0.04, tm + w / 2 - 0.04, d - 0.05, y + GEH, F.gelaender, null)
    for (const t of [tm - w / 2 + 0.05, tm + w / 2 - 0.05]) gelaenderLinie(fp, quer(k, t), 0.05, d - 0.05, 0, y + GEH, F.gelaender, null)
    tuer(k, tm, y + GEH, 2.2, 2.25, F.glasDunkel)
    return true
  }

  /** Begruentes Flachdach mit Photovoltaik und Lichtkuppeln. */
  function dach(h: Haus, frei0: Kasten[]): void {
    const oben = h.H + DACH
    const [x0, z0, x1, z1] = kastenVon(h.poly)
    const randAb = (p: P) => (innen(p, h.poly) ? h.kanten.reduce((m, k) => Math.min(m, abstandStrecke(p, k.a, kp(k, k.laenge, 0))), Infinity) : -1)
    /** Abstand zweier achsenparalleler Kaesten (0 bei Ueberlappung). */
    const kastenAbstand = (a1: Kasten, b1: Kasten) => Math.hypot(Math.max(0, a1[0] - b1[2], b1[0] - a1[2]), Math.max(0, a1[1] - b1[3], b1[1] - a1[3]))
    if (trifftKasten(sch, x0, z0, x1, z1, oben - 0.01, oben + 2)) return
    bauten.flaeche(h.poly, oben, h.g.dachGruen ? F.substrat : F.kies)
    const aussen: Kasten[] = [...frei0]
    // Lichtkuppeln: eine je angefangene 220 m2, hoechstens drei.
    const flaeche = Math.abs(flaecheVon(h.poly))
    const kuppeln = Math.min(3, Math.max(1, Math.round(flaeche / 220)))
    let gesetzt = 0
    for (let versuch = 0; versuch < 60 && gesetzt < kuppeln; versuch++) {
      const p: P = [x0 + (x1 - x0) * (0.2 + 0.6 * zz()), z0 + (z1 - z0) * (0.2 + 0.6 * zz())]
      const r: Kasten = [p[0] - 0.8, p[1] - 0.8, p[0] + 0.8, p[1] + 0.8]
      if (
        [
          [r[0], r[1]],
          [r[2], r[1]],
          [r[2], r[3]],
          [r[0], r[3]],
        ].some((e) => randAb(e as P) < 1.4)
      )
        continue
      if (aussen.some((b) => kastenAbstand(r, b) < 1.2)) continue
      bauten.kasten(p[0] - 0.65, oben, p[1] - 0.65, p[0] + 0.65, oben + 0.35, p[1] + 0.65, F.putzWeiss)
      bauten.kasten(p[0] - 0.55, oben + 0.35, p[1] - 0.55, p[0] + 0.55, oben + 0.45, p[1] + 0.55, F.glas)
      aussen.push(r)
      gesetzt++
    }
    if (h.g.dachGruen) {
      // Gruene Felder (1,25 m) mit Moos, Sedum und Stroh, ganz innen.
      const Z = 1.25
      const ph = [zz(), zz(), zz()].map((v) => v * Math.PI * 2)
      const ton = (p: P) => {
        const w = Math.sin(p[0] * 0.45 + ph[0]) * Math.sin(p[1] * 0.38 + ph[1]) + 0.5 * Math.sin((p[0] + p[1]) * 0.9 + ph[2])
        const c = F.moos.clone()
        if (w > 0.45) c.lerp(F.sedum, Math.min(1, (w - 0.45) * 1.4))
        else if (w < -0.6) c.lerp(F.stroh, Math.min(0.7, (-0.6 - w) * 1.2))
        return c.multiplyScalar(0.94 + 0.12 * zz())
      }
      for (let x = x0 + 0.35; x + Z <= x1 - 0.35 + EPS; x += Z) {
        for (let z = z0 + 0.35; z + Z <= z1 - 0.35 + EPS; z += Z) {
          const ecken: P[] = [
            [x, z],
            [x + Z, z],
            [x + Z, z + Z],
            [x, z + Z],
          ]
          if (ecken.some((e) => randAb(e) < 0.35)) continue
          if (aussen.some((b) => kastenAbstand([x, z, x + Z, z + Z], b) < 0.05)) continue
          const c = ton([x + Z / 2, z + Z / 2])
          bauten.dreieck(ecken[0], ecken[1], ecken[2], oben + 0.03, c, c, c)
          bauten.dreieck(ecken[0], ecken[2], ecken[3], oben + 0.03, c, c, c)
        }
      }
    }
    if (!h.g.pv) return
    // Photovoltaik in Reihen nach Sueden geneigt (15 Grad). Benachbarte
    // Module einer Reihe werden ein Streifen (Rahmen, Glas, zwei Stuetzen).
    const neig = (15 * Math.PI) / 180
    const ay: V3 = [0, Math.cos(neig), Math.sin(neig)]
    const az: V3 = [0, -Math.sin(neig), Math.cos(neig)]
    const y = oben + 0.35
    const streifen = (xa: number, xb: number, z: number) => {
      const xm = (xa + xb) / 2
      const lang = xb - xa
      bauten.quader([xm, y, z], [1, 0, 0], ay, az, lang, 0.04, 1.0, F.gelaender)
      bauten.viereck([xm, y + 0.021 * Math.cos(neig), z + 0.021 * Math.sin(neig)], [1, 0, 0], [0, -Math.sin(neig), Math.cos(neig)], lang - 0.08, 0.92, ay, F.pv)
      for (const xs1 of [xa + 0.3, xb - 0.35]) bauten.kasten(xs1, oben + 0.03, z - 0.45, xs1 + 0.05, y - 0.1, z - 0.4, F.metall)
    }
    for (let z = z0 + 1.8; z <= z1 - 1.8; z += 2.1) {
      let von: number | null = null
      let bis = 0
      for (let x = x0 + 1.7; x <= x1 - 1.7 + 1.78; x += 1.78) {
        const ok =
          x <= x1 - 1.7 &&
          ([
            [x - 0.89, z - 0.5],
            [x + 0.89, z - 0.5],
            [x + 0.89, z + 0.5],
            [x - 0.89, z + 0.5],
          ] as P[]).every((e) => randAb(e) >= 1.2) &&
          !aussen.some((b) => kastenAbstand([x - 0.89, z - 0.5, x + 0.89, z + 0.5], b) < 0.4)
        if (ok) {
          if (von === null) von = x - 0.88
          bis = x + 0.88
        } else if (von !== null) {
          streifen(von, bis, z)
          von = null
        }
      }
    }
  }

  /** Ein ganzes Haus. Bei einem Haus mit Plaenen (E84) geht die Fassade
   *  in seine Huelle, das Dach bleibt in bauten. */
  function haus(h: Haus): void {
    const ih = innenNach.get(h.g.id) ?? null
    fp = ih ? ih.huelle : bauten
    hausBauen(h, ih)
    fp = bauten
  }

  function hausBauen(h: Haus, ih: InnenHaus | null): void {
    const istEigen = h === eigen
    const fassade = fassadeVon(h)
    const nK = h.kanten.length
    /** Je Kante und Geschoss: wo die Wand fehlt und wo kein Fenster hin soll. */
    const luecken: [number, number][][][] = h.kanten.map(() => Array.from({ length: h.n }, () => []))
    const besetzt: [number, number][][][] = h.kanten.map(() => Array.from({ length: h.n }, () => []))
    const strassenSeite = (k: Kante) => k.n[0] * q[0] + k.n[1] * q[1]
    const gangIndex = istEigen && gang ? h.kanten.indexOf(gang) : -1

    /* Eckloggien (weiss_loggia): an den rechtwinkligen Ecken naechst der
     * Strasse, nicht am Gang. Die breite Seite (3,4 m) an der laengeren Kante. */
    const nischen: { k: number; t0: number; t1: number; d: number; offen: 'anfang' | 'ende' | null; ab: number }[] = []
    if (h.stil === 'weiss_loggia') {
      const ecken: { i: number; abstand: number }[] = []
      for (let i = 0; i < nK; i++) {
        const vor = h.kanten[(i - 1 + nK) % nK]
        const nach = h.kanten[i]
        if (i === gangIndex || (i - 1 + nK) % nK === gangIndex) continue
        if (Math.abs(vor.u[0] * nach.u[0] + vor.u[1] * nach.u[1]) > 0.17) continue
        if (vor.laenge < 7 || nach.laenge < 7) continue
        // Nur aussen liegende Ecken (Normale der Nachbarkante zeigt weg).
        if (vor.u[0] * nach.n[0] + vor.u[1] * nach.n[1] < 0) continue
        ecken.push({ i, abstand: c0 - qv(nach.a) })
      }
      ecken.sort((x, y) => x.abstand - y.abstand || x.i - y.i)
      for (const { i } of ecken.slice(0, 2)) {
        const vorI = (i - 1 + nK) % nK
        const nach = h.kanten[i]
        const vor = h.kanten[vorI]
        if (nach.laenge >= vor.laenge) nischen.push({ k: i, t0: 0, t1: 3.4, d: 2.0, offen: 'anfang', ab: 0 })
        else nischen.push({ k: vorI, t0: vor.laenge - 3.4, t1: vor.laenge, d: 2.0, offen: 'ende', ab: 0 })
      }
    }
    /* Eingeschnittene Loggien: putz an den zwei laengsten Kanten in den
     * Obergeschossen, holz eine in der Mitte der Strassenseite. */
    if (h.stil === 'putz' || h.stil === 'holz') {
      const reihe = h.kanten
        .map((k, i) => ({ k, i }))
        .filter(({ i, k }) => i !== gangIndex && k.laenge >= 14)
        .sort((x, y) => (h.stil === 'holz' ? strassenSeite(y.k) - strassenSeite(x.k) : y.k.laenge - x.k.laenge) || x.i - y.i)
      for (const { k, i } of reihe.slice(0, h.stil === 'holz' ? 1 : 2)) {
        if (h.stil === 'holz') nischen.push({ k: i, t0: k.laenge / 2 - 1.9, t1: k.laenge / 2 + 1.9, d: 1.6, offen: null, ab: 0 })
        else {
          const n = Math.max(1, Math.floor((k.laenge - 4) / 7.8))
          const abst = (k.laenge - 4) / n
          for (let j = 0; j < n; j++) {
            const tm = 2 + abst * (j + 0.5)
            nischen.push({ k: i, t0: tm - 1.6, t1: tm + 1.6, d: 1.6, offen: null, ab: 1 })
          }
        }
      }
    }
    /* Je Geschoss: Nische nur, wenn sie die Wohnung nicht beruehrt. Fehlt
     * sie darueber, bekommt sie eine eigene Decke. */
    for (const ni of nischen) {
      const k = h.kanten[ni.k]
      const da: number[] = []
      for (let g = ni.ab; g < h.n; g++) {
        const y = g * h.gh
        if (!trifft(sch, k, ni.t0 - 0.3, ni.t1 + 0.3, -ni.d - 0.3, 0.3, y - 0.3, y + h.gh, 0.3)) da.push(g)
      }
      for (const g of da) {
        luecken[ni.k][g].push([ni.t0, ni.t1])
        besetzt[ni.k][g].push([ni.t0 - 0.5, ni.t1 + 0.5])
        if (ni.offen) {
          const nb = ni.offen === 'anfang' ? (ni.k - 1 + nK) % nK : (ni.k + 1) % nK
          const L = h.kanten[nb].laenge
          const sp: [number, number] = ni.offen === 'anfang' ? [L - ni.d, L] : [0, ni.d]
          luecken[nb][g].push(sp)
          besetzt[nb][g].push([sp[0] - 0.5, sp[1] + 0.5])
        }
        nische(h, k, ni.t0, ni.t1, ni.d, g, ni.offen, g > 0, !da.includes(g + 1))
      }
    }

    /* Balkone (weiss_loggia) an der Kante, die am weitesten von der Strasse
     * weg zeigt (beim eigenen Haus gegenueber dem Gang), Terrassen im EG. */
    if (h.stil === 'weiss_loggia') {
      let bi = -1
      let bw = Infinity
      h.kanten.forEach((k, i) => {
        if (i === gangIndex || k.laenge < 8) return
        const w = gangIndex >= 0 ? k.n[1] * -1 : strassenSeite(k)
        if (w < bw - 1e-6) {
          bw = w
          bi = i
        }
      })
      if (bi >= 0) {
        const k = h.kanten[bi]
        const sperre = nischen.filter((n) => n.k === bi).map((n) => [n.t0 - 1.2, n.t1 + 1.2] as [number, number])
        // Auch Nischen der Nachbarkanten, die an dieser Kante enden.
        for (const n of nischen) {
          if (n.offen === 'anfang' && (n.k - 1 + nK) % nK === bi) sperre.push([k.laenge - n.d - 1.2, k.laenge])
          if (n.offen === 'ende' && (n.k + 1) % nK === bi) sperre.push([0, n.d + 1.2])
        }
        const stellen: number[] = []
        for (let t = 3.5; t <= k.laenge - 3.5; t += 7.0) if (!sperre.some(([a1, b1]) => t + 1.6 > a1 && t - 1.6 < b1)) stellen.push(t)
        for (const t of stellen) {
          for (let g = 1; g < h.n; g++) if (balkon(h, k, t, g)) besetzt[bi][g].push([t - 1.7, t + 1.7])
          // Terrasse vor dem Erdgeschoss (mit Plaenen: die echten, E84).
          const form = rechteckForm({ k, t0: t - 1.6, t1: t + 1.6, s0: 0, s1: 2.4 })
          if (!ih && !trifft(sch, k, t - 1.6, t + 1.6, 0, 2.4, GEH - 0.05, 2.3, 0.3) && frei(form, 0.3, h.poly)) {
            kq(gelaende, k, t - 1.6, t + 1.6, 0, 2.4, GEH - 0.05, GEH, F.pflaster, null)
            if (tuer(k, t, GEH, 2.2, 2.25, F.glasDunkel)) besetzt[bi][0].push([t - 1.7, t + 1.7])
            belegen(form)
          }
        }
      }
    }

    /* Eingang zur Strasse (nicht beim eigenen Haus: dort ist der Kern; mit
     * Plaenen kommt die Haustuer aus ihnen). */
    if (!istEigen && !ih) {
      let ei = 0
      let ew = -Infinity
      h.kanten.forEach((k, i) => {
        if (k.laenge < 3.5) return
        const w = strassenSeite(k) + k.laenge * 1e-3
        if (w > ew) {
          ew = w
          ei = i
        }
      })
      const k = h.kanten[ei]
      const kandidaten = [0.5, 0.35, 0.65, 0.2, 0.8].map((f) => k.laenge * f)
      const t = kandidaten.find((x) => !besetzt[ei][0].some(([a1, b1]) => x + 1.5 > a1 && x - 1.5 < b1) && x > 1.6 && x < k.laenge - 1.6)
      if (t !== undefined && tuer(k, t, GEH, 1.8, 2.4, F.glasDunkel)) {
        besetzt[ei][0].push([t - 1.6, t + 1.6])
        eingangSprung.set(h.g.id, { p: kp(k, t, SPRUNG_HAUS + 0.1), blick: [-k.n[0], -k.n[1]] })
        if (!trifft(sch, k, t - 1.4, t + 1.4, 0, 1.4, 2.7, 2.9, 0.1)) kq(fp, k, t - 1.4, t + 1.4, 0, 1.4, 2.72, 2.9, F.putzWeiss, null)
        // Weg vom Eingang zum Gehsteig, wenn er frei ist.
        const nq = strassenSeite(k)
        if (nq > 0.5) {
          const start = kp(k, t, 0)
          const lang = (strasseQ0 + 0.1 - qv(start)) / nq
          if (lang > 0.2 && lang < 30) {
            const form = rechteckForm({ k, t0: t - 0.8, t1: t + 0.8, s0: 0.05, s1: lang })
            const ok = haeuser.every((x) => x === h || abstandFormen(form, x.poly) >= 0.3) && (!loch || abstandFormen(form, loch) >= 0.3)
            if (ok && !trifft(sch, k, t - 0.8, t + 0.8, 0, lang, GEH - 0.05, GEH)) {
              kq(gelaende, k, t - 0.8, t + 0.8, 0, lang, GEH - 0.05, GEH, F.pflaster, null)
              belegen(form)
              eingaenge.push(form)
              karteWege.push(form)
            }
          }
        }
      }
    }

    /* Waende je Kante und Geschoss, ohne die Luecken; darueber die Attika. */
    h.kanten.forEach((k, i) => {
      for (let g = 0; g < h.n; g++) {
        const y0 = g === 0 ? -0.35 : g * h.gh
        for (const [t0, t1] of abziehen([0, k.laenge], luecken[i][g])) kq(fp, k, t0, t1, -WAND, 0, y0, (g + 1) * h.gh, fassade, sch)
      }
      // Die Attika gehoert zum Dach: sie bleibt, auch wenn man drin ist.
      kq(bauten, k, 0, k.laenge, -WAND, 0, h.H, h.H + ATTIKA, fassade, sch)
      kq(bauten, k, 0, k.laenge, -WAND - 0.04, 0.04, h.H + ATTIKA, h.H + ATTIKA + 0.06, F.gelaender, sch)
      // Sockel, ausser in den Luecken des Erdgeschosses.
      for (const [t0, t1] of abziehen([0, k.laenge], luecken[i][0])) kq(fp, k, t0, t1, 0, 0.025, -0.1, 0.4, F.sockel, sch)
    })
    // Hindernis draussen: jede Kante als 30 cm starkes Rechteck (mit
    // Plaenen halten die Waende innen auf, die Haustuer ist offen).
    if (!istEigen && !ih) for (const k of h.kanten) garten.push({ k, t0: 0, t1: k.laenge, s0: -WAND, s1: 0 })

    /* Fenster. holz: weniger und breiter; am Gang des eigenen Hauses
     * kleine Kuechenfenster und je Wohnung eine Tuer. */
    const abstand = h.stil === 'holz' ? 4.0 : h.stil === 'grau' ? 3.0 : FENSTER_ABSTAND
    const [fw, fh, fy] = h.stil === 'holz' ? [1.4, 1.5, 0.85] : h.stil === 'putz' ? [1.1, 1.45, 0.9] : [1.2, 1.45, 0.9]
    h.kanten.forEach((k, i) => {
      const nutz = k.laenge - 2 * ECKE_FREI
      if (nutz < 0.9) return
      const am = i === gangIndex
      const ab = am ? FENSTER_ABSTAND : abstand
      const n = Math.floor(nutz / ab) + 1
      const start = ECKE_FREI + (nutz - (n - 1) * ab) / 2
      for (let g = 0; g < h.n; g++) {
        const y = g * h.gh
        for (let j = 0; j < n; j++) {
          const t = start + j * ab
          if (besetzt[i][g].some(([a1, b1]) => t + 0.75 > a1 && t - 0.75 < b1)) continue
          if (luecken[i][g].some(([a1, b1]) => t + 0.75 > a1 && t - 0.75 < b1)) continue
          if (am) {
            if (j % 3 === 1) tuer(k, t, y + GEH, 1.0, 2.15, F.tuer)
            else fenster(k, t, y + 1.15, 1.1, 1.05)
          } else fenster(k, t, y + fy, fw, fh, h.stil === 'holz' ? F.weiss : F.rahmen)
        }
      }
    })

    /* Holzschalung: senkrechte Leisten, etwas heller und dunkler. */
    if (h.stil === 'holz') {
      const hell = F.holzFassade.clone().multiplyScalar(1.12)
      const dunkel = F.holzFassade.clone().multiplyScalar(0.86)
      h.kanten.forEach((k, i) => {
        const n = Math.floor(k.laenge / 0.24)
        for (let j = 1; j < n; j++) {
          const t = (k.laenge * j) / n
          // Zusammenhaengende Geschosse ohne Luecke werden eine Leiste.
          let von = -1
          for (let g = 0; g <= h.n; g++) {
            const offen = g < h.n && !luecken[i][g].some(([a1, b1]) => t > a1 - 0.05 && t < b1 + 0.05)
            if (offen && von < 0) von = g
            if (!offen && von >= 0) {
              kq(fp, k, t - 0.03, t + 0.03, 0, 0.022, von === 0 ? 0.4 : von * h.gh, g * h.gh, j % 3 === 0 ? dunkel : hell, sch)
              von = -1
            }
          }
        }
      })
    }

    /* Dach; beim eigenen Haus ohne Ueberfahrt (die steht auf dem Kern). */
    const dachFrei: Kasten[] = []
    if (!istEigen && h.n >= 4) {
      const p = innenPunkt(h.poly)
      if (!trifftKasten(sch, p[0] - 1.2, p[1] - 1.0, p[0] + 1.2, p[1] + 1.0, h.H, h.H + 2)) {
        bauten.kasten(p[0] - 1.2, h.H + DACH, p[1] - 1.0, p[0] + 1.2, h.H + 1.6, p[1] + 1.0, fassade)
        bauten.kasten(p[0] - 1.28, h.H + 1.6, p[1] - 1.08, p[0] + 1.28, h.H + 1.68, p[1] + 1.08, F.gelaender)
      }
      dachFrei.push([p[0] - 1.2, p[1] - 1.0, p[0] + 1.2, p[1] + 1.0])
    }
    dach(h, dachFrei)

    /* Eigenes Haus: Boden unter und Decke ueber dem Geschoss der Wohnung,
     * damit man durch Spalten nicht ins Leere sieht. Sie bleiben auch mit
     * Plaenen stehen (innen liegen Boeden und Decken knapp davor). */
    if (istEigen) {
      // 1 cm unter den Platten der Loggien, damit dort nichts flimmert.
      bauten.flaeche(h.poly, geschoss * h.gh + GEH - 0.01, F.beton, true)
      bauten.flaeche(h.poly, (geschoss + 1) * h.gh - 0.05, F.putzWeiss, false)
      if (geschoss + 1 < h.n) bauten.flaeche(h.poly, (geschoss + 1) * h.gh + GEH - 0.01, F.beton, true)
      if (!ih) laubengang(h)
    }
  }

  /** Ein Punkt sicher im Umriss (Schwerpunkt oder Mitte einer Zeile). */
  function innenPunkt(poly: P[]): P {
    const A = flaecheVon(poly)
    let cx = 0
    let cz = 0
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i]
      const r = poly[(i + 1) % poly.length]
      const f = p[0] * r[1] - r[0] * p[1]
      cx += (p[0] + r[0]) * f
      cz += (p[1] + r[1]) * f
    }
    const c: P = [cx / (6 * A), cz / (6 * A)]
    if (innen(c, poly)) return c
    const zs = poly.map((p) => p[1])
    const z = (Math.min(...zs) + Math.max(...zs)) / 2 + 0.013
    const xs: number[] = []
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i]
      const r = poly[(i + 1) % poly.length]
      if (p[1] > z !== r[1] > z) xs.push(p[0] + ((z - p[1]) * (r[0] - p[0])) / (r[1] - p[1]))
    }
    xs.sort((x, y) => x - y)
    let best: P = poly[0]
    let breit = -1
    for (let i = 0; i + 1 < xs.length; i += 2) {
      if (xs[i + 1] - xs[i] > breit) {
        breit = xs[i + 1] - xs[i]
        best = [(xs[i] + xs[i + 1]) / 2, z]
      }
    }
    return best
  }

  /* ------------------------------------------------ Gang, Kern, Aufzug */
  const kabine = new Puffer()
  const tueren = new Puffer()
  const blaetterKabine: Blatt[] = []
  const blaetterEtage: Blatt[][] = []
  /** Hindernisse je Geschoss des eigenen Hauses (ohne Waende und Garten). */
  const gangHindernisse: KRechteck[][] = []
  const kernHindernisse: KRechteck[] = []
  /** Treppe im Kern (E87): Hindernisse je Geschoss, auf jedem
   *  Zwischenpodest, und die beiden Laeufe (lokal, im Erdgeschoss). */
  const kernStufen: KRechteck[][] = []
  const kernPodest: KRechteck[] = []
  const kernLaeufe: [Lauf, Lauf][] = []
  const saeulen: KRechteck[] = []
  const eingaenge: P[][] = []
  /** Fuer die Minikarte (E86), lokal: Wege von Haustueren zum Gehsteig,
   *  Asphalt von Parkplatz und Zufahrt. */
  const karteWege: P[][] = []
  const karteAsphalt: P[][] = []
  /** Wo man vor der Haustuer steht und wohin man schaut (lokal), je Haus. */
  const eingangSprung = new Map<string, { p: P; blick: P }>()

  function laubengang(h: Haus): void {
    const g = gang
    if (!g) return
    const L = g.laenge
    const H = h.H
    const weiss = F.putzWeiss
    const [kt0, kt1] = mitKern ? ktSpanne(0, K_LAENGE) : [Infinity, -Infinity]
    const [vt0, vt1] = mitKern ? ktSpanne(0, K_PODEST) : [Infinity, -Infinity]
    for (let k = 0; k < h.n; k++) gangHindernisse.push([])
    /* Platten, Gelaender, Abschluesse je Obergeschoss, Dach ueber dem obersten. */
    for (let k = 1; k < h.n; k++) {
      const y = k * h.gh
      kq(bauten, g, 0, L, 0, GANG, y + GEH - PLATTE, y + GEH, weiss, sch)
      const offen = abziehen([0, L], mitKern ? [[vt0, vt1]] : [])
      for (const [t0, t1] of offen) {
        gelaenderLinie(bauten, g, t0, t1, GANG - 0.07, y + GEH, F.gelaender, sch)
        gangHindernisse[k].push({ k: g, t0, t1, s0: GANG - 0.13, s1: GANG })
      }
      for (const t of [0.04, L - 0.04]) gelaenderLinie(bauten, quer(g, t), 0, GANG - 0.1, 0, y + GEH, F.gelaender, sch)
      gangHindernisse[k].push({ k: g, t0: -0.12, t1: 0, s0: 0, s1: GANG }, { k: g, t0: L, t1: L + 0.12, s0: 0, s1: GANG })
    }
    kq(bauten, g, 0, L, 0, GANG, H - 0.05, H + DACH, weiss, sch)
    kq(bauten, g, 0, L, GANG - 0.15, GANG, H + DACH, H + 0.55, weiss, sch)
    kq(bauten, g, 0, L, GANG - 0.19, GANG + 0.04, H + 0.55, H + 0.6, F.gelaender, sch)
    /* Saeulen unter der Gangkante. */
    const n = Math.max(1, Math.ceil((L - 0.6) / 5.5))
    for (let i = 0; i <= n; i++) {
      const t = 0.3 + ((L - 0.6) * i) / n
      if (t > kt0 - 0.4 && t < kt1 + 0.4) continue
      kq(bauten, g, t - 0.11, t + 0.11, GANG - 0.24, GANG - 0.02, -0.35, H - 0.05, weiss, sch)
      saeulen.push({ k: g, t0: t - 0.11, t1: t + 0.11, s0: GANG - 0.24, s1: GANG - 0.02 })
    }
    /* Gehweg unter dem Gang im Erdgeschoss. */
    kq(gelaende, g, -0.5, L + 0.5, 0, GANG + 0.4, GEH - 0.06, GEH, F.pflaster, sch)
    if (mitKern) kern(h, g)
  }

  /** Kern: Aufzugsschacht mit Tueren, Stiegenhaus mit Laeufen, Kabine. */
  function kern(h: Haus, g: Kante): void {
    const H = h.H
    const weiss = F.putzWeiss
    const N = h.n
    /** Quader im Kern (x laengs vom aeusseren Ende, s quer, y). */
    const kk = (p: Puffer, x0: number, x1: number, s0: number, s1: number, y0: number, y1: number, f: Color, schn: Schnitt | null = sch) => {
      const [t0, t1] = ktSpanne(x0, x1)
      kq(p, g, t0, t1, s0, s1, y0, y1, f, schn)
    }
    const kr = (x0: number, x1: number, s0: number, s1: number): KRechteck => {
      const [t0, t1] = ktSpanne(x0, x1)
      return { k: g, t0, t1, s0, s1 }
    }
    /** Richtung von x im Lokalen. */
    const ex: P = kernEnde === 1 ? [-g.u[0], -g.u[1]] : [g.u[0], g.u[1]]

    /* Schacht. */
    const oben = H + 1.6
    kk(bauten, 0, K_WAND, K_S0, K_S1, -0.35, oben, weiss)
    kk(bauten, K_SCHACHT - K_WAND, K_SCHACHT, K_S0, K_S1, -0.35, oben, weiss)
    kk(bauten, 0, K_SCHACHT, K_S1 - K_WAND, K_S1, -0.35, oben, weiss)
    kk(bauten, K_WAND, K_TUER0, K_S0, K_S0 + K_WAND, -0.35, oben, weiss)
    kk(bauten, K_TUER1, K_SCHACHT - K_WAND, K_S0, K_S0 + K_WAND, -0.35, oben, weiss)
    kk(bauten, K_TUER0, K_TUER1, K_S0, K_S0 + K_WAND, -0.35, GEH, weiss)
    for (let k = 0; k < N; k++) {
      const y = k * h.gh
      kk(bauten, K_TUER0, K_TUER1, K_S0, K_S0 + K_WAND, y + K_TUER_H, k + 1 < N ? (k + 1) * h.gh + GEH : oben, weiss)
      // Zarge aus Metall um die Tuer, Platte mit Rufknopf daneben.
      kk(bauten, K_TUER0 - 0.08, K_TUER0, K_S0 - 0.03, K_S0, y + GEH, y + K_TUER_H + 0.08, F.gelaender)
      kk(bauten, K_TUER1, K_TUER1 + 0.08, K_S0 - 0.03, K_S0, y + GEH, y + K_TUER_H + 0.08, F.gelaender)
      kk(bauten, K_TUER0 - 0.08, K_TUER1 + 0.08, K_S0 - 0.03, K_S0, y + K_TUER_H, y + K_TUER_H + 0.08, F.gelaender)
      kk(bauten, 1.9, 2.04, K_S0 - 0.015, K_S0, y + 0.95, y + 1.2, F.gelaender)
      // Tuerblaetter (mittig oeffnend), je zwei; sie gleiten in die Wand.
      const blaetter: Blatt[] = []
      for (const [x0, x1, r] of [
        [K_TUER0 - 0.01, 1.16, -1],
        [1.14, K_TUER1 + 0.01, 1],
      ] as [number, number, number][]) {
        const start = tueren.ecken
        kk(tueren, x0, x1, K_S0 + 0.02, K_S0 + 0.06, y + GEH, y + K_TUER_H, F.metall, null)
        kk(tueren, x0 + 0.08, x1 - 0.08, K_S0 + 0.015, K_S0 + 0.02, y + 1.2, y + 1.9, F.glasDunkel, null)
        blaetter.push({ start, ende: tueren.ecken, richtung: [ex[0] * r, ex[1] * r], weg: 0.5 })
      }
      blaetterEtage.push(blaetter)
    }
    kk(bauten, 0, K_SCHACHT, K_S0, K_S1, oben, oben + 0.15, F.gelaender)

    /* Stiegenhaus: Rueckwand, Stirnwand, Dach, Wand zwischen den Laeufen. */
    kk(bauten, K_SCHACHT, K_LAENGE, K_S1 - K_WAND, K_S1, -0.35, H + ATTIKA, weiss)
    kk(bauten, K_LAENGE - K_WAND, K_LAENGE, K_S0, K_S1 - K_WAND, -0.35, H + ATTIKA, weiss)
    kk(bauten, K_SCHACHT, K_LAENGE - K_WAND, K_S0, K_S1 - K_WAND, H - 0.05, H + DACH, weiss)
    kk(bauten, K_SCHACHT, K_LAENGE - K_WAND, K_S0, K_S0 + 0.15, H + DACH, H + ATTIKA, weiss)
    kk(bauten, K_SCHACHT, K_LAENGE, K_S0 - 0.04, K_S1 + 0.04, H + ATTIKA, H + ATTIKA + 0.06, F.gelaender)
    kk(bauten, K_PODEST, K_LAUF, K_LAUF_A[1] + 0.02, K_LAUF_B[0] - 0.02, -0.35, H - 0.05, F.beton)
    const stufe = h.gh / 18
    for (let k = 0; k + 1 < N; k++) {
      const y = k * h.gh + GEH
      for (let j = 1; j <= 8; j++) {
        kk(bauten, K_PODEST + (j - 1) * 0.26, K_PODEST + j * 0.26, K_LAUF_A[0], K_LAUF_A[1], y + j * stufe - stufe - 0.12, y + j * stufe, F.beton)
        kk(bauten, K_LAUF - j * 0.26, K_LAUF - (j - 1) * 0.26, K_LAUF_B[0], K_LAUF_B[1], y + h.gh / 2 + j * stufe - stufe - 0.12, y + h.gh / 2 + j * stufe, F.beton)
      }
      kk(bauten, K_LAUF, K_ZWISCHEN, K_LAUF_A[0], K_LAUF_B[1], y + h.gh / 2 - 0.28, y + h.gh / 2, F.beton)
    }
    // Geschosspodeste; vor dem Treppenloch steht das Gelaender des Gangs.
    for (let k = 1; k < N; k++) kk(bauten, K_SCHACHT, K_PODEST, K_S0, K_S1 - K_WAND, k * h.gh + GEH - PLATTE, k * h.gh + GEH, weiss)
    // Pflaster unter dem Kern.
    kk(gelaende, 0, K_LAENGE, K_S0, K_S1, GEH - 0.06, GEH, F.pflaster)
    /* Grosse Fenster des Stiegenhauses: hinten und an der Stirn. */
    const hinten = versetzt(g, K_S1)
    const stirnA = kp(g, kt(K_LAENGE), K_S0)
    const stirn: Kante = { a: stirnA, u: g.n, n: ex, laenge: K_S1 - K_S0 }
    for (let k = 0; k < N; k++) {
      const y = k * h.gh
      fenster(hinten, kt((K_PODEST + K_ZWISCHEN) / 2), y + 0.7, 2.6, 1.9)
      fenster(stirn, (K_S1 - K_S0) / 2, y + 0.9, 1.4, 1.6)
    }
    /* Hindernisse des Kerns, in jedem Geschoss gleich: Schacht, Rueck- und
     * Stirnwand. */
    kernHindernisse.push(
      kr(0, K_WAND, K_S0, K_S1),
      kr(K_SCHACHT - K_WAND, K_SCHACHT, K_S0, K_S1),
      kr(0, K_SCHACHT, K_S1 - K_WAND, K_S1),
      kr(0, K_TUER0, K_S0, K_S0 + K_WAND),
      kr(K_TUER1, K_SCHACHT, K_S0, K_S0 + K_WAND),
      kr(K_SCHACHT, K_LAENGE, K_S1 - K_WAND, K_S1),
      kr(K_LAENGE - K_WAND, K_LAENGE, K_S0, K_S1),
    )
    /* Die Treppe zum Begehen (E87): zwei Laeufe je Geschoss, Haelfte A
     * (K_LAUF_A) hinauf zum Zwischenpodest, Haelfte B (K_LAUF_B) zurueck
     * hinauf zum Geschosspodest des naechsten Geschosses. Im Geschoss frei:
     * der Antritt am Geschosspodest; zu: das Loch zum Zwischenpodest, die
     * Seiten (Gelaender zum Gang, Rueckwand), die Mittelwand, unten die
     * Haelfte B (unter dem Lauf), oben die Haelfte A (kein Lauf hinauf). */
    const [a0, a1] = K_LAUF_A
    const [b0, b1] = K_LAUF_B
    for (let k = 0; k < N; k++) {
      const liste = [kr(K_T1, K_LAENGE, K_S0, K_S1), kr(K_T0, K_T1, a1, b0), kr(K_T0, K_LAENGE, K_S0 - 0.05, a0), kr(K_T0, K_LAENGE, b1, K_S1)]
      if (k === N - 1) liste.push(kr(K_T0, K_T1, a0, a1))
      if (k === 0) liste.push(kr(K_T0, K_T1, b0, b1))
      kernStufen.push(liste)
    }
    // Auf dem Zwischenpodest rundum zu, frei nur die Laeufe von ihm aus.
    kernPodest.push(
      kr(K_T0 - 0.5, K_T0, K_S0 - 0.3, K_S1 + 0.1),
      kr(K_T0, K_LAUF, a1, b0),
      kr(K_T0 - 0.5, K_LAENGE + 0.1, K_S0 - 0.3, a0),
      kr(K_T0 - 0.5, K_LAENGE + 0.1, b1, K_S1 + 0.3),
      kr(K_ZWISCHEN, K_LAENGE + 0.3, K_S0 - 0.3, K_S1 + 0.3),
    )
    const lauf = (s0: number, s1: number, rauf: P): Lauf => {
      const [t0, t1] = ktSpanne(K_T0, K_T1)
      return { c: kp(g, (t0 + t1) / 2, (s0 + s1) / 2), u: rauf, laenge: K_T1 - K_T0, breite: s1 - s0, stufen: 9 }
    }
    kernLaeufe.push([lauf(a0, a1, ex), lauf(b0, b1, [-ex[0], -ex[1]])])

    /* Kabine: Boden, Waende, Decke mit Licht, Spiegel, Handlauf, Tafel mit
     * Knoepfen, zwei Tuerblaetter. Gebaut fuer das Erdgeschoss; das Mesh
     * faehrt mit position.y. */
    const [x0, x1, s0, s1] = KAB
    const kb = (a0: number, a1: number, b0: number, b1: number, y0: number, y1: number, f: Color) => kk(kabine, a0, a1, b0, b1, y0, y1, f, null)
    kb(x0, x1, s0, s1, GEH - 0.1, GEH, F.platte)
    kb(x0, x0 + 0.04, s0, s1, GEH, KAB_H, F.kabine)
    kb(x1 - 0.04, x1, s0, s1, GEH, KAB_H, F.kabine)
    kb(x0, x1, s1 - 0.04, s1, GEH, KAB_H, F.kabine)
    kb(x0, K_TUER0, s0, s0 + 0.04, GEH, KAB_H, F.metall)
    kb(K_TUER1, x1, s0, s0 + 0.04, GEH, KAB_H, F.metall)
    kb(K_TUER0, K_TUER1, s0, s0 + 0.04, K_TUER_H, KAB_H, F.metall)
    kb(x0, x1, s0, s1, KAB_H, KAB_H + 0.06, F.metall)
    kb(0.7, 1.6, 2.6, 3.4, KAB_H - 0.03, KAB_H, F.licht)
    kb(0.6, 1.7, s1 - 0.06, s1 - 0.04, 0.9, 2.0, F.spiegel)
    kb(0.4, 1.9, s1 - 0.15, s1 - 0.11, 0.88, 0.92, F.gelaender)
    kb(x1 - 0.055, x1 - 0.04, 2.0, 2.3, 0.75, 0.9 + N * 0.1, F.gelaender)
    for (const [a0, a1, r] of [
      [K_TUER0 - 0.01, 1.16, -1],
      [1.14, K_TUER1 + 0.01, 1],
    ] as [number, number, number][]) {
      const start = kabine.ecken
      kb(a0, a1, s0 - 0.04, s0 - 0.01, GEH, K_TUER_H, F.metall)
      blaetterKabine.push({ start, ende: kabine.ecken, richtung: [ex[0] * r, ex[1] * r], weg: 0.5 })
    }
  }

  /* ------------------------------------------------ Haeuser bauen */
  for (const h of haeuser) {
    belegen(h.poly)
  }
  /* Haeuser mit Plaenen (E84): Gaerten und Terrassen im EG und der Platz
   * vor den Haustueren bleiben frei von Baeumen, Bueschen und Hecken. */
  for (const ih of innenListe) {
    const g0 = ih.nachK.get(0)
    if (!g0) continue
    for (const f of g0.flaechen) if (!f.weg && f.art === 'draussen') belegen(f.poly)
    for (const l of g0.haustueren) {
      const form = rechteckForm({ k: l.w.k, t0: l.ta - 0.3, t1: l.tb + 0.3, s0: 0.3, s1: 4 })
      belegen(form)
      eingaenge.push(form)
    }
  }
  for (const h of haeuser) haus(h)
  /* Gaerten und Terrassen im EG sieht man auch von draussen: gleich bauen. */
  for (const ih of innenListe) {
    const g0 = ih.nachK.get(0)
    if (!g0) continue
    for (const f of g0.flaechen) {
      if (f.weg || f.art !== 'draussen') continue
      if (f.belag === 'rasen') flaecheOhne(gelaende, f.poly, -0.03, F.privatRasen)
      else if (f.belag === 'pflaster') belagLegen(gelaende, f, -0.015, PFLASTER, PFLASTER, F.pflasterToene)
    }
  }

  /* ------------------------------------------------ Innen bauen (E84) */

  /** Flaeche bei Hoehe y, ohne den Teil in der Aussparung der Wohnung. */
  function flaecheOhne(p: Puffer, poly: P[], y: number, f: Color, oben = true, ohne: readonly Kasten[] = []): void {
    if (poly.length < 3) return
    const weg = sch && y > sch.y0 - EPS && y < sch.y1 + EPS ? [...ohne, sch.r] : ohne
    if (weg.length) {
      let stuecke = [poly]
      for (const r of weg) {
        stuecke = stuecke.flatMap((q2) => {
          const b = kastenVon(q2)
          return b[0] < r[2] && b[2] > r[0] && b[1] < r[3] && b[3] > r[1] ? ohneKasten(q2, r) : [q2]
        })
      }
      for (const q2 of stuecke) p.flaecheFix(q2, y, f, oben)
      return
    }
    p.flaecheFix(poly, y, f, oben)
  }

  /** Was im Gang oder Laubengang ausgespart bleibt: Schaechte immer,
   *  Stiegen (sie haben ihren eigenen Boden). */
  function loecherIm(f: IFlaeche, g: IGeschoss): Kasten[] {
    if (f.art !== 'gang' && f.art !== 'laubengang') return []
    return g.flaechen.filter((x) => x !== f && (x.art === 'aufzug' || x.art === 'stiege') && x.r[0] < f.r[2] && x.r[2] > f.r[0] && x.r[1] < f.r[3] && x.r[3] > f.r[1]).map((x) => x.r)
  }

  /** Belag in Streifen (lang null: Dielen ueber die ganze Laenge) oder in
   *  Feldern (Fliesen, Platten), ausgerichtet an der laengsten Kante. */
  function belagLegen(p: Puffer, f: IFlaeche, y: number, breite: number, lang: number | null, toene: Color[], ohne: readonly Kasten[] = []): void {
    let e = f.kanten[0]
    for (const x of f.kanten) if (x.laenge > e.laenge) e = x
    const u = e.u
    const w: P = [-u[1], u[0]]
    let t0 = Infinity
    let t1 = -Infinity
    let s0 = Infinity
    let s1 = -Infinity
    for (const pt of f.poly) {
      const t = pt[0] * u[0] + pt[1] * u[1]
      const s = pt[0] * w[0] + pt[1] * w[1]
      t0 = Math.min(t0, t)
      t1 = Math.max(t1, t)
      s0 = Math.min(s0, s)
      s1 = Math.max(s1, s)
    }
    // Rechteckige Raeume (die meisten): Felder direkt, ohne Zuschneiden.
    if (f.poly.length === 4 && Math.abs(Math.abs(flaecheVon(f.poly)) - (t1 - t0) * (s1 - s0)) < 1e-4) {
      const ecke = (t: number, s: number): P => [u[0] * t + w[0] * s, u[1] * t + w[1] * s]
      let jr = 0
      for (let s = s0; s < s1 - 1e-6; s += breite, jr++) {
        const sb = Math.min(s + breite, s1)
        const schritt = lang ?? t1 - t0
        let i = 0
        for (let t = t0; t < t1 - 1e-6; t += schritt, i++) {
          const tb = Math.min(t + schritt, t1)
          flaecheOhne(p, [ecke(t, s), ecke(tb, s), ecke(tb, sb), ecke(t, sb)], y, toene[(lang === null ? jr : i + 2 * jr) % toene.length], true, ohne)
        }
      }
      return
    }
    let j = 0
    for (let s = s0; s < s1 - 1e-6; s += breite, j++) {
      const band = halbebene(halbebene(f.poly, w[0], w[1], s), -w[0], -w[1], -(s + breite))
      if (band.length < 3) continue
      if (lang === null) {
        flaecheOhne(p, band, y, toene[j % toene.length], true, ohne)
        continue
      }
      let i = 0
      for (let t = t0; t < t1 - 1e-6; t += lang, i++) {
        const feld = halbebene(halbebene(band, u[0], u[1], t), -u[0], -u[1], -(t + lang))
        if (feld.length >= 3) flaecheOhne(p, feld, y, toene[(i + 2 * j) % toene.length], true, ohne)
      }
    }
  }

  /** Boden einer Flaeche (Gaerten und Terrassen im EG liegen schon). */
  function bodenLegen(p: Puffer, f: IFlaeche, g: IGeschoss): void {
    const y = g.y
    switch (f.belag) {
      case 'eiche':
        belagLegen(p, f, y, DIELE, null, F.eicheToene)
        break
      case 'deck':
        belagLegen(p, f, y - 0.02, DECK, null, F.deckToene)
        break
      case 'fliese':
        belagLegen(p, f, y, FLIESE, FLIESE, F.fliesen)
        break
      case 'platten':
        belagLegen(p, f, y, PLATTE_GANG, PLATTE_GANG, F.gangPlatten, loecherIm(f, g))
        break
      case 'pflaster':
        if (g.k > 0) belagLegen(p, f, y - 0.02, PFLASTER, PFLASTER, F.pflasterToene)
        break
      case 'rasen':
        if (g.k > 0) flaecheOhne(p, f.poly, y - 0.02, F.privatRasen)
        break
      case 'beton':
        // Die Stiege hat oben nur ihr Podest (treppeBauen).
        if (f.art !== 'stiege' || g.k === 0) flaecheOhne(p, f.poly, y - (f.art === 'draussen' ? 0.02 : 0), F.beton, true, loecherIm(f, g))
        break
      default:
        break
    }
  }

  /** Decke einer Flaeche: drinnen immer, draussen nur unter einem Geschoss darueber. */
  function deckeLegen(p: Puffer, f: IFlaeche, g: IGeschoss, ih: InnenHaus): void {
    if (f.art === 'aufzug') return
    const oben = ih.nachK.get(g.k + 1)
    if (f.art === 'stiege' && oben) return
    const y = g.y + ih.h.gh - DECKE
    if (f.art === 'draussen' && !istLoggia(f)) {
      // Terrasse und Balkon: Decke nur, wo darueber etwas liegt.
      if (!oben) return
      for (const x of oben.flaechen) {
        if (x.r[0] >= f.r[2] || x.r[2] <= f.r[0] || x.r[1] >= f.r[3] || x.r[3] <= f.r[1]) continue
        const q2 = imKasten(f.poly, x.r)
        if (q2.length >= 3 && Math.abs(flaecheVon(q2)) > 0.01) flaecheOhne(p, q2, y, F.weiss, false)
      }
      return
    }
    // Im Gang: ueber Schacht und Stiege keine Decke (die Stiege oben offen).
    const loecher = loecherIm(f, g).filter((r) => oben || g.flaechen.some((x) => x.art === 'aufzug' && x.r === r))
    flaecheOhne(p, f.poly, y, F.weiss, false, loecher)
  }

  /** Eine Wand mit ihren Ausschnitten: Stuecke daneben, Sturz ueber Tueren,
   *  Bruestung und Sturz bei Fenstern. */
  function wandBauen(p: Puffer, w: IWand, yF: number, fass: Color): void {
    const farbe = (s: 'wand' | 'fassade') => (s === 'wand' ? F.wand : fass)
    const f = seitenFarben(w.k, farbe(w.plus), farbe(w.minus), w.aussen ? fass : F.wand, w.aussen ? fass : F.wandKopf)
    const k = w.k
    const aus: [number, number][] = [...w.tueren.map((d) => [d.t0, d.t1] as [number, number]), ...w.fenster.map((x) => [x.t0, x.t1] as [number, number])]
    for (const [a, b] of abziehen([w.t0, w.t1], aus)) kq(p, k, a, b, w.s0, w.s1, w.y0, w.y1, f, sch)
    for (const d of w.tueren) {
      if (d.oben < w.y1 - 0.01) kq(p, k, d.t0, d.t1, w.s0, w.s1, d.oben, w.y1, f, sch)
      if (w.y0 < yF - 0.01) kq(p, k, d.t0, d.t1, w.s0, w.s1, w.y0, yF, f, sch)
    }
    for (const x of w.fenster) {
      if (x.unten > w.y0 + 0.01) kq(p, k, x.t0, x.t1, w.s0, w.s1, w.y0, x.unten, f, sch)
      if (x.oben < w.y1 - 0.01) kq(p, k, x.t0, x.t1, w.s0, w.s1, x.oben, w.y1, f, sch)
    }
  }

  /** Was in einer Oeffnung steckt: Fensterrahmen und Baenke, Zarge und
   *  offenes Blatt (Haustuer: zwei), Durchgang leer. Das Glas kommt in
   *  glasBauen. */
  function lochBauen(p: Puffer, l: ILoch, yF: number): void {
    const { o, w } = l
    const k = w.k
    const ta = Math.max(w.t0, l.ta)
    const tb = Math.min(w.t1, l.tb)
    if (tb - ta < 0.1) return
    const sm = (w.s0 + w.s1) / 2
    if (o.art === 'fenster') {
      const unten = yF + o.bruestung
      const oben = Math.min(w.y1, unten + o.hoehe)
      if (oben - unten < 0.12) return
      const r = F.rahmen
      kq(p, k, ta, tb, sm - 0.04, sm + 0.04, unten, unten + 0.05, r, sch)
      kq(p, k, ta, tb, sm - 0.04, sm + 0.04, oben - 0.05, oben, r, sch)
      kq(p, k, ta, ta + 0.05, sm - 0.04, sm + 0.04, unten + 0.05, oben - 0.05, r, sch)
      kq(p, k, tb - 0.05, tb, sm - 0.04, sm + 0.04, unten + 0.05, oben - 0.05, r, sch)
      if (tb - ta > 1.3) kq(p, k, (ta + tb) / 2 - 0.025, (ta + tb) / 2 + 0.025, sm - 0.03, sm + 0.03, unten + 0.05, oben - 0.05, r, sch)
      if (o.bruestung > 0.05 && w.aussen !== 0) {
        // Fensterbank drinnen, Blech draussen.
        const drinnen: [number, number] = w.aussen > 0 ? [w.s0 - 0.03, sm - 0.04] : [sm + 0.04, w.s1 + 0.03]
        const draussen: [number, number] = w.aussen > 0 ? [sm + 0.04, w.s1 + 0.04] : [w.s0 - 0.04, sm - 0.04]
        kq(p, k, ta - 0.02, tb + 0.02, drinnen[0], drinnen[1], unten - 0.03, unten, F.weiss, sch)
        kq(p, k, ta - 0.02, tb + 0.02, draussen[0], draussen[1], unten - 0.04, unten - 0.01, F.gelaender, sch)
      }
      return
    }
    // Schwelle unter Tuer und Durchgang: dort fehlt sonst der Boden in der Wanddicke.
    kq(p, k, ta, tb, w.s0, w.s1, yF - 0.04, yF + 0.004, w.aussen ? F.gelaender : F.eicheToene[1], sch)
    if (o.art === 'durchgang') return
    const top = Math.min(w.y1, yF + o.hoehe)
    const eingang = o.art === 'eingang'
    const haustuer = o.art === 'haustuer'
    const z = haustuer ? 0.08 : eingang ? ZARGE_EINGANG : ZARGE
    const zf = haustuer ? F.gelaender : eingang ? F.tuer : F.zarge3d
    if (tb - ta < 2 * z + 0.2 || top - yF < 0.5) return
    kq(p, k, ta, ta + z, w.s0 - 0.01, w.s1 + 0.01, yF, top, zf, sch)
    kq(p, k, tb - z, tb, w.s0 - 0.01, w.s1 + 0.01, yF, top, zf, sch)
    kq(p, k, ta + z, tb - z, w.s0 - 0.01, w.s1 + 0.01, top - z, top, zf, sch)
    // Blatt: an der Angel, um TUER_AUF zur Seite auf gedreht.
    const seite = o.auf[0] * k.n[0] + o.auf[1] * k.n[1] >= 0 ? 1 : -1
    const sAngel = seite > 0 ? w.s1 : w.s0
    const hoch = top - z - yF - 0.01
    const blatt = (tAngel: number, g: number, lang: number, farbe: Color) => {
      if (lang < 0.2) return
      const dt = g * Math.cos(TUER_AUF)
      const ds = seite * Math.sin(TUER_AUF)
      const ax: V3 = [k.u[0] * dt + k.n[0] * ds, 0, k.u[1] * dt + k.n[1] * ds]
      const a = kp(k, tAngel, sAngel)
      const e: P = [a[0] + ax[0] * lang, a[1] + ax[2] * lang]
      if (trifftKasten(sch, Math.min(a[0], e[0]) - 0.05, Math.min(a[1], e[1]) - 0.05, Math.max(a[0], e[0]) + 0.05, Math.max(a[1], e[1]) + 0.05, yF, top)) return
      p.quader([(a[0] + e[0]) / 2, yF + 0.005 + hoch / 2, (a[1] + e[1]) / 2], ax, [0, 1, 0], [-ax[2], 0, ax[0]], lang, hoch, BLATT_DICK, farbe)
    }
    if (haustuer) {
      const halb = (tb - ta - 2 * z) / 2
      blatt(ta + z, 1, halb, F.metall)
      blatt(tb - z, -1, halb, F.metall)
      return
    }
    const tA = (o.a[0] - k.a[0]) * k.u[0] + (o.a[1] - k.a[1]) * k.u[1]
    const tB = (o.b[0] - k.a[0]) * k.u[0] + (o.b[1] - k.a[1]) * k.u[1]
    const angel = o.angelA ? tA : tB
    const gegen = o.angelA ? tB : tA
    const g = gegen >= angel ? 1 : -1
    const tAngel = g > 0 ? Math.max(ta, Math.min(tb, angel)) + z : Math.min(tb, Math.max(ta, angel)) - z
    blatt(tAngel, g, tb - ta - 2 * z, eingang ? F.tuer : F.tuer3d)
  }

  /** Kueche und Bad (die Wohnungen sind sonst leer). Lokal: x laengs (u),
   *  y nach vorn (v, die Rueckseite steht an der Wand), z hoch. */
  function moebelBauen(p: Puffer, m: IMoebel, yF: number, gh: number): void {
    const { u, v, b, t } = m
    const o0: P = [m.c[0] - (u[0] * b) / 2 - (v[0] * t) / 2, m.c[1] - (u[1] * b) / 2 - (v[1] * t) / 2]
    const ecken: P[] = [o0, [o0[0] + u[0] * b, o0[1] + u[1] * b], [o0[0] + u[0] * b + v[0] * t, o0[1] + u[1] * b + v[1] * t], [o0[0] + v[0] * t, o0[1] + v[1] * t]]
    const [x0, z0, x1, z1] = kastenVon(ecken)
    if (trifftKasten(sch, x0, z0, x1, z1, yF, yF + 2.2)) return
    const ax: V3 = [u[0], 0, u[1]]
    const az: V3 = [-u[1], 0, u[0]]
    const mitte = (xa: number, xb: number, ya: number, yb: number): P => [
      o0[0] + (u[0] * (xa + xb)) / 2 + (v[0] * (ya + yb)) / 2,
      o0[1] + (u[1] * (xa + xb)) / 2 + (v[1] * (ya + yb)) / 2,
    ]
    const q2 = (xa: number, xb: number, ya: number, yb: number, za: number, zb: number, f: Color) => {
      if (xb - xa < 1e-3 || yb - ya < 1e-3 || zb - za < 1e-3) return
      const c = mitte(xa, xb, ya, yb)
      p.quader([c[0], yF + (za + zb) / 2, c[1]], ax, [0, 1, 0], az, xb - xa, zb - za, yb - ya, f)
    }
    const rund = (xa: number, xb: number, ya: number, yb: number, za: number, zb: number, f: Color, r: number) => {
      const sx = Math.round((xb - xa) * 100) / 100
      const sy = Math.round((zb - za) * 100) / 100
      const sz = Math.round((yb - ya) * 100) / 100
      if (sx < 0.02 || sy < 0.02 || sz < 0.02) return
      const rr = Math.round(Math.min(r, sx / 2 - 0.005, sy / 2 - 0.005, sz / 2 - 0.005) * 1000) / 1000
      const vl = vorlage(`rund:${sx}:${sy}:${sz}:${rr}`, () => new RoundedBoxGeometry(sx, sy, sz, 1, Math.max(0.001, rr)))
      const c = mitte(xa, xb, ya, yb)
      p.form(vl, achsenMatrix([c[0], yF + (za + zb) / 2, c[1]], ax, [0, 1, 0], az, 1, 1, 1), f)
    }
    const dunkel = F.keramik.clone().multiplyScalar(0.86)
    switch (m.art) {
      case 'kueche':
        q2(0, b, 0, t - 0.07, 0, 0.1, F.schwarz)
        q2(0, b, 0, t - 0.02, 0.1, 0.86, F.front)
        for (let x = 0.6; x < b - 0.1; x += 0.6) q2(x - 0.004, x + 0.004, t - 0.025, t - 0.015, 0.12, 0.84, F.holzDunkel)
        q2(0, b, 0, t + 0.01, 0.86, 0.9, F.platte)
        if (b >= 1) q2(0.15, 0.65, 0.08, Math.min(t - 0.08, 0.5), 0.9, 0.904, F.metall)
        if (b >= 1.6) q2(b - 0.75, b - 0.15, 0.06, Math.min(t - 0.06, 0.56), 0.9, 0.904, F.schwarz)
        if (m.oben) q2(0, b, 0, Math.min(0.35, t * 0.6), 1.45, 2.15, F.front)
        break
      case 'hochschrank':
        q2(0, b, 0, t, 0, 2.15, F.front)
        break
      case 'kuehlschrank':
        q2(0, b, 0, t, 0, 1.85, F.weiss)
        break
      case 'theke':
        q2(0, b, 0, t - 0.02, 0, 0.88, F.front)
        q2(0, b, 0, t, 0.88, 0.92, F.platte)
        break
      case 'wc': {
        const vw = Math.min(0.2, t * 0.4)
        q2(0.02, b - 0.02, 0, vw, 0, 1.1, F.wand)
        q2(b / 2 - 0.1, b / 2 + 0.1, vw, vw + 0.01, 0.9, 1.05, F.weiss)
        rund(b / 2 - 0.18, b / 2 + 0.18, vw, Math.max(vw + 0.3, t), 0.2, 0.42, F.keramik, 0.08)
        q2(b / 2 - 0.18, b / 2 + 0.18, vw + 0.02, Math.max(vw + 0.3, t) - 0.01, 0.42, 0.44, F.weiss)
        break
      }
      case 'becken':
        rund(0, b, 0, t, 0.7, 0.86, F.keramik, 0.04)
        q2(0.06, b - 0.06, 0.08, t - 0.06, 0.86, 0.862, dunkel)
        q2(b / 2 - 0.02, b / 2 + 0.02, 0.02, 0.12, 0.86, 1.0, F.metall)
        if (b >= 0.4) q2(0.05, b - 0.05, 0, 0.02, 1.05, 1.75, F.spiegel)
        break
      case 'wanne':
        rund(0, b, 0, t, 0, 0.56, F.keramik, 0.05)
        q2(0.07, b - 0.07, 0.07, t - 0.07, 0.56, 0.562, dunkel)
        break
      case 'dusche':
        q2(0, b, 0, t, 0, 0.05, F.keramik)
        q2(b - 0.08, b - 0.05, 0.02, 0.05, 0.05, 2.05, F.metall)
        q2(b - 0.28, b - 0.05, 0.02, 0.25, 1.96, 1.98, F.metall)
        break
      case 'waschmaschine': {
        q2(0.01, b - 0.01, 0, t - 0.01, 0, 0.85, F.weiss)
        const c = mitte(b / 2, b / 2, t - 0.01, t - 0.01)
        const vv: V3 = [v[0], 0, v[1]]
        p.form(walze(), achsenMatrix([c[0], yF + 0.5, c[1]], ax, vv, kreuz(ax, vv), 0.17, 0.03, 0.17), F.schwarz)
        break
      }
      case 'stuetze':
        q2(0, b, 0, t, 0, gh - DECKE, F.wand)
        break
    }
  }

  /** Treppe in der Flaeche einer Stiege (E87, siehe TreppenLage): im
   *  Geschoss das Podest am Antritt, dann, wenn es hinauf geht, die beiden
   *  Laeufe, das Zwischenpodest und die Mittelwand bis zum naechsten
   *  Geschoss; im obersten ein Gelaender um das Loch ueber dem ersten
   *  Lauf. Ohne Treppe (oder ohne Lauf von unten) ein Boden ueber das ganze
   *  Stiegenhaus, im EG legt ihn bodenLegen. */
  function treppeBauen(pf: Puffer, f: IFlaeche, g: IGeschoss, ih: InnenHaus): void {
    const yF = g.y
    const st = ih.stiegen.get(f)
    if ((!st || !st.runter) && g.k > 0) flaecheOhne(pf, f.poly, yF, F.beton)
    if (!st) return
    const { k, L, B, p, R, a, steig } = st.lage
    const kk = (t0: number, t1: number, s0: number, s1: number, y0: number, y1: number, c: Color) => kq(pf, k, t0, t1, s0, s1, y0, y1, c, sch)
    const m = B / 2
    const e = p + R * a
    if (st.runter) kk(0, p + a / 2, 0, B, yF - 0.2, yF, F.beton)
    if (!st.hoch) {
      if (st.runter) {
        bruestungBauen(pf, k, p, e, m, yF)
        bruestungBauen(pf, quer(k, p), 0, m, 0, yF)
      }
      return
    }
    const gh = ih.h.gh
    const [a0, a1] = [T_RAND, m - T_MITTE / 2]
    const [b0, b1] = [m + T_MITTE / 2, B - T_RAND]
    for (let i = 1; i < R; i++) {
      const y = yF + i * steig
      kk(p + (i - 0.5) * a, p + (i + 0.5) * a, a0, a1, y - steig - 0.12, y, F.beton)
      kk(e - (i + 0.5) * a, e - (i - 0.5) * a, b0, b1, y + gh / 2 - steig - 0.12, y + gh / 2, F.beton)
    }
    kk(p + (R - 0.5) * a, L, T_RAND / 2, B - T_RAND / 2, yF + gh / 2 - 0.2, yF + gh / 2, F.beton)
    kk(p, p + (R - 0.5) * a, a1, b0, yF, yF + gh, F.wand)
  }

  /** Gelaender innen, sparsam: Handlauf, Fuellung, Pfosten (statt Staeben). */
  function bruestungBauen(p: Puffer, k: Kante, t0: number, t1: number, s: number, y0: number): void {
    const lang = t1 - t0
    if (lang < 0.15) return
    kq(p, k, t0, t1, s - 0.025, s + 0.025, y0 + 0.955, y0 + 1.0, F.gelaender, sch)
    kq(p, k, t0, t1, s - 0.008, s + 0.008, y0 + 0.1, y0 + 0.9, F.fuellung, sch)
    const n = Math.max(1, Math.ceil(lang / 1.6))
    for (let i = 0; i <= n; i++) {
      const t = t0 + (lang * i) / n
      kq(p, k, t - 0.025, t + 0.025, s - 0.025, s + 0.025, y0, y0 + 0.955, F.gelaender, sch)
    }
  }

  /** Schacht des Aufzugs in Geschoss k: Waende (Tuer offen), Zarge,
   *  Platte fuer den Rufknopf, Grube unten, Deckel oben. */
  function schachtBauen(p: Puffer, A: IAufzug, k: number, gh: number): void {
    const y = k * gh
    const y1 = y + gh
    const W = A.breit
    const T = A.tief
    const tm = W / 2
    const kk = (t0: number, t1: number, s0: number, s1: number, a: number, b: number, c: Color) => kq(p, A.k, t0, t1, s0, s1, a, b, c, sch)
    kk(0, tm - A_TUER / 2, 0, A_WAND, y, y1, F.wand)
    kk(tm + A_TUER / 2, W, 0, A_WAND, y, y1, F.wand)
    kk(tm - A_TUER / 2, tm + A_TUER / 2, 0, A_WAND, y + A_TUER_H, y1, F.wand)
    kk(0, W, T - A_WAND, T, y, y1, F.wand)
    kk(0, A_WAND, A_WAND, T - A_WAND, y, y1, F.wand)
    kk(W - A_WAND, W, A_WAND, T - A_WAND, y, y1, F.wand)
    if (!A.kabine) kk(tm - A_TUER / 2, tm + A_TUER / 2, 0, A_WAND, y, y + A_TUER_H, F.wand)
    else {
      kk(tm - A_TUER / 2, tm + A_TUER / 2, 0, A_WAND, y - 0.04, y + 0.004, F.metall)
      kk(tm - A_TUER / 2 - 0.08, tm - A_TUER / 2, -0.03, 0, y, y + A_TUER_H + 0.08, F.gelaender)
      kk(tm + A_TUER / 2, tm + A_TUER / 2 + 0.08, -0.03, 0, y, y + A_TUER_H + 0.08, F.gelaender)
      kk(tm - A_TUER / 2 - 0.08, tm + A_TUER / 2 + 0.08, -0.03, 0, y + A_TUER_H, y + A_TUER_H + 0.08, F.gelaender)
      const tk = rufT(A)
      kk(tk - 0.07, tk + 0.07, -0.015, 0, y + 0.95, y + 1.2, F.gelaender)
    }
    if (k === A.halte[0]) kk(A_WAND, W - A_WAND, A_WAND, T - A_WAND, y - 0.12, y - 0.06, F.schwarz)
    if (k === A.halte[A.halte.length - 1]) kk(0, W, 0, T, y1 - DECKE, y1, F.wand)
  }

  /** Wo der Rufknopf neben der Schachttuer sitzt (laengs der Tuerseite). */
  function rufT(A: IAufzug): number {
    return A.breit / 2 + A_TUER / 2 + 0.3 <= A.breit - 0.05 ? A.breit / 2 + A_TUER / 2 + 0.22 : A.breit / 2 - A_TUER / 2 - 0.22
  }

  /* ------------------------------------------------ Parkplatz */
  let parkplaetze = 0
  let autos = 0
  /** Geparkte Autos (lokal, E87), gebaut werden sie mit der Welt. */
  const geparkt: { c: P; vorne: P; farbe: string; art: FahrzeugArt }[] = []
  /** Bester Platz fuer n Stellplaetze (Reihe von n * 2,5 m, 11 m tief mit
   *  Fahrgasse): frei von allem, moeglichst mittig in der Siedlung. */
  const parkplatzSuchen = (n: number): KRechteck | null => {
    const innenQ = c0 - 3
    let gefunden: KRechteck | null = null
    const lang = n * 2.5
    const tief = 11
    let beste = Infinity
    for (const laengsL of [true, false]) {
      const [lq, ll] = laengsL ? [tief, lang] : [lang, tief]
      for (let qc = qmin - 4 + lq / 2; qc + lq / 2 <= innenQ; qc += 1.5) {
        for (let lc = lmin - 4 + ll / 2; lc + ll / 2 <= lmax + 4; lc += 1.5) {
            const k: Kante = laengsL
              ? { a: [q[0] * (qc - lq / 2) + l[0] * (lc - ll / 2), q[1] * (qc - lq / 2) + l[1] * (lc - ll / 2)], u: l, n: q, laenge: lang }
              : { a: [q[0] * (qc - lq / 2) + l[0] * (lc + ll / 2), q[1] * (qc - lq / 2) + l[1] * (lc + ll / 2)], u: q, n: [-l[0], -l[1]], laenge: lang }
            const r: KRechteck = { k, t0: 0, t1: lang, s0: 0, s1: tief }
            const form = rechteckForm(r)
            const wert = Math.hypot(qc - (qmin + c0) / 2, lc - lmitte)
            if (wert >= beste) continue
            if (!frei(form, 2.5)) continue
            if (wegAbstand(form) < WEG_BREIT / 2 + 0.8) continue
            const xs = form.map((p) => p[0])
            const zs = form.map((p) => p[1])
            if (trifftKasten(sch, Math.min(...xs) - 1, Math.min(...zs) - 1, Math.max(...xs) + 1, Math.max(...zs) + 1, -1, 99)) continue
            beste = wert
            gefunden = r
          }
        }
      }
    return gefunden
  }
  {
    const gefunden = parkplatzSuchen(8) ?? parkplatzSuchen(6) ?? parkplatzSuchen(4)
    if (gefunden) {
      const r = gefunden
      const k = r.k
      parkplaetze = Math.round(r.t1 / 2.5)
      kq(gelaende, k, 0, r.t1, 0, r.s1, -0.12, -0.025, F.asphalt, sch)
      karteAsphalt.push(rechteckForm(r))
      for (let i = 0; i <= parkplaetze; i++) kq(gelaende, k, i * 2.5 - 0.05, i * 2.5 + 0.05, 0.3, 5.0, -0.12, -0.02, F.weiss, sch)
      kq(gelaende, k, 0, r.t1, -0.15, 0, -0.12, 0.08, F.bord, sch)
      for (let i = 0; i < parkplaetze; i++) {
        if (zz() > 0.62) continue
        const farbe = [F.weiss, F.schwarz, F.metall, F.rot, F.blau, F.putzGrau][Math.floor(zz() * 6)]
        if (parken(quer(k, (i + 0.5) * 2.5, 2.55), farbe, i % 3 === 2 ? 'kombi' : 'auto')) autos++
      }
      belegen(rechteckForm(wachsen(r, 0.5)))
      // Zufahrt zur Strasse, wenn der Weg frei ist (nur bei Lage laengs der Strasse).
      if (k.u === l) {
        const qa = qv(kp(k, 0, r.s1))
        const zr: KRechteck = { k, t0: r.t1 / 2 - 2.5, t1: r.t1 / 2 + 2.5, s0: r.s1, s1: r.s1 + (strasseQ0 + 0.1 - qa) }
        const form = rechteckForm(zr)
        const ok = zr.s1 - zr.s0 > 0.5 && haeuser.every((h) => abstandFormen(form, h.poly) >= 0.5) && (!loch || abstandFormen(form, loch) >= 0.5) && (!spielPoly || abstandFormen(form, spielPoly) >= 0.5)
        if (ok) {
          kq(gelaende, k, zr.t0, zr.t1, zr.s0, zr.s1, -0.12, -0.025, F.asphalt, sch)
          belegen(form)
          eingaenge.push(form)
          karteAsphalt.push(form)
        }
      }
    }
  }

  /** Ein geparktes Auto (E87: zum Einsteigen, Fahrzeug3D) laengs der Kante
   *  k, vorne zur Fahrgasse (+k.u), damit man vorwaerts ausparkt. Nicht im
   *  Rechteck der Wohnung. Kein Hindernis: Fahrzeuge kennt der Motor. */
  function parken(k: Kante, farbe: Color, art: FahrzeugArt): boolean {
    const xs = [-2.4, 2.4].flatMap((t) => [-0.95, 0.95].map((s) => kp(k, t, s)))
    const x0 = Math.min(...xs.map((p) => p[0]))
    const x1 = Math.max(...xs.map((p) => p[0]))
    const z0 = Math.min(...xs.map((p) => p[1]))
    const z1 = Math.max(...xs.map((p) => p[1]))
    if (trifftKasten(sch, x0, z0, x1, z1, -0.1, 1.6)) return false
    geparkt.push({ c: k.a, vorne: k.u, farbe: `#${farbe.getHexString()}`, art })
    return true
  }
  /* ------------------------------------------------ Hecken an der Strasse (ohne Stadt) */
  let hecken = 0
  if (!stadtDa) {
    const q0 = strasseQ0 - 1.3
    const q1 = strasseQ0 - 0.5
    for (const h of haeuser) {
      const qs = h.poly.map(qv)
      if (Math.max(...qs) < c0 - 3.5) continue
      const ls = h.poly.map(lv)
      const lucken: [number, number][] = []
      for (const f of [...eingaenge, ...(loch ? [loch] : [])]) {
        const fl = f.map(lv)
        const fq = f.map(qv)
        if (Math.max(...fq) < q0 - 0.5 || Math.min(...fq) > q1 + 0.5) continue
        lucken.push([Math.min(...fl) - 0.8, Math.max(...fl) + 0.8])
      }
      for (const w of wege) {
        for (let i = 0; i + 1 < w.length; i++) {
          const [p1, p2] = [w[i], w[i + 1]]
          const a1 = qv(p1)
          const a2 = qv(p2)
          if (Math.max(a1, a2) < q0 - 1 || Math.min(a1, a2) > q1 + 1) continue
          const lsP = [lv(p1), lv(p2)]
          lucken.push([Math.min(...lsP) - 1.4, Math.max(...lsP) + 1.4])
        }
      }
      for (const [t0, t1] of abziehen([Math.min(...ls) + 0.5, Math.max(...ls) - 0.5], lucken)) {
        // In Stuecken bis 6 m, jedes etwas anders im Ton.
        const n = Math.max(1, Math.ceil((t1 - t0) / 6))
        for (let i = 0; i < n; i++) {
          const a1 = t0 + ((t1 - t0) * i) / n
          const b1 = t0 + ((t1 - t0) * (i + 1)) / n
          if (b1 - a1 < 1.2) continue
          const r: KRechteck = { k: sk, t0: a1 + 0.05, t1: b1 - 0.05, s0: q0, s1: q1 }
          const form = rechteckForm(r)
          if (haeuser.some((x) => abstandFormen(form, x.poly) < 0.3)) continue
          const xs = form.map((p) => p[0])
          const zs = form.map((p) => p[1])
          if (trifftKasten(sch, Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs), -0.1, 1.1)) continue
          const hoch = 1.0 + zz() * 0.15
          rundTeil(gruen, sk, r, -0.05, hoch, F.hecke.clone().multiplyScalar(0.92 + zz() * 0.12), 0.28, 0.3)
          garten.push({ ...r, oben: Math.round(hoch * 100) / 100 })
          belegen(form)
          hecken++
        }
      }
    }
  }

  /** Runder Quader auf einem Rechteck an einer Kante. */
  function rundTeil(p: Puffer, k: Kante, r: KRechteck, y0: number, y1: number, f: Color, schatten: number, rund: number): void {
    const c = kp(k, (r.t0 + r.t1) / 2, (r.s0 + r.s1) / 2)
    const sx = r.t1 - r.t0
    const sz = r.s1 - r.s0
    const geo = new RoundedBoxGeometry(sx, y1 - y0, sz, 1, Math.min(rund, sx / 2 - 0.01, sz / 2 - 0.01, (y1 - y0) / 2 - 0.01))
    p.form(vorlageAusGeo(geo), achsenMatrix([c[0], (y0 + y1) / 2, c[1]], [k.u[0], 0, k.u[1]], [0, 1, 0], [-k.u[1], 0, k.u[0]], 1, 1, 1), f, schatten)
  }

  /* ------------------------------------------------ Laternen (ohne Stadt) */
  if (!stadtDa) {
    const qL = strasseQ0 + GEHSTEIG - 0.35
    for (let t = lmin - 6; t <= lmax + 6; t += 26) {
      const c = kp(sk, t, qL)
      const kopf = kp(sk, t, qL + 0.7)
      if (trifftKasten(sch, c[0] - 1, c[1] - 1, c[0] + 1, c[1] + 1, -0.1, 6)) continue
      gelaende.form(walze(), achsenMatrix([c[0], 2.7, c[1]], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.07, 5.4, 0.07), F.platte)
      gelaende.quader([(c[0] + kopf[0]) / 2, 5.35, (c[1] + kopf[1]) / 2], [q[0], 0, q[1]], [0, 1, 0], [-q[1], 0, q[0]], 0.9, 0.07, 0.07, F.platte)
      gelaende.quader([kopf[0], 5.28, kopf[1]], [q[0], 0, q[1]], [0, 1, 0], [-q[1], 0, q[0]], 0.55, 0.12, 0.26, F.licht)
      garten.push({ k: sk, t0: t - 0.12, t1: t + 0.12, s0: qL - 0.12, s1: qL + 0.12 })
    }
  }

  /* ------------------------------------------------ Nachbarhaeuser (ohne Stadt) */
  let nachbarn = 0
  if (!stadtDa) {
    const haus2 = (r: KRechteck, stock: number) => {
      const form = rechteckForm(r)
      if (!frei(form, 3) || wegAbstand(form) < 3) return
      const xs = form.map((p) => p[0])
      const zs = form.map((p) => p[1])
      if (trifftKasten(sch, Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs), -1, 99)) return
      const H = stock * 3 + 0.5
      rundTeil(bauten, r.k, r, -0.4, H, F.nachbar.clone().multiplyScalar(0.97 + zz() * 0.05), 0, 0.2)
      rundTeil(bauten, r.k, wachsen(r, 0.1), H - 0.05, H + 0.1, F.gelaender, 0, 0.05)
      garten.push(r)
      belegen(form)
      nachbarn++
    }
    // Gegenueber der Strasse.
    const q0 = strasseQ1 + 6 + zz() * 3
    let t = lmin - 8 - zz() * 6
    while (t < lmax + 6) {
      const lang = 20 + zz() * 12
      haus2({ k: sk, t0: t, t1: t + lang, s0: q0, s1: q0 + 12 + zz() * 3 }, 3 + Math.floor(zz() * 3))
      t += lang + 9 + zz() * 5
    }
    // Hinter der Siedlung.
    const qh = qmin - 16 - zz() * 4
    for (const f of [0.25, 0.72]) {
      const lang = 22 + zz() * 10
      const tm = lmin + (lmax - lmin) * f
      haus2({ k: sk, t0: tm - lang / 2, t1: tm + lang / 2, s0: qh - 13, s1: qh }, 3 + Math.floor(zz() * 2))
    }
  }

  /* ------------------------------------------------ Baeume und Buesche */
  let baeume = 0
  {
    const stamme: P[] = []
    const ziel = 26
    // Mit Stadt nur auf dem Grund der Siedlung (E87).
    const rand = stadtDa ? BAUM_RAND_STADT : 12
    const x0 = bx0 - rand
    const x1 = bx1 + rand
    const z0 = bz0 - rand
    const z1 = bz1 + rand
    for (let versuch = 0; versuch < 4000 && baeume < ziel; versuch++) {
      const p: P = [x0 + zz() * (x1 - x0), z0 + zz() * (z1 - z0)]
      const r0 = 1.5 + zz() * 1.1
      const stammH = 2.0 + zz() * 1.2
      if (qv(p) > strasseQ0 - 0.6 && qv(p) < strasseQ1 + 0.6) continue
      const punktForm: P[] = [
        [p[0] - 0.3, p[1] - 0.3],
        [p[0] + 0.3, p[1] - 0.3],
        [p[0] + 0.3, p[1] + 0.3],
        [p[0] - 0.3, p[1] + 0.3],
      ]
      if (haeuser.some((h) => abstandFormen(punktForm, h.poly) < r0 + 1.2)) continue
      if (!frei(punktForm, 1.0)) continue
      if (wegAbstand(punktForm) < WEG_BREIT / 2 + 0.6) continue
      if (stamme.some((s) => Math.hypot(s[0] - p[0], s[1] - p[1]) < 4.8)) continue
      const kroneY = stammH + r0 * 0.75
      if (trifftKasten(sch, p[0] - r0 * 1.6, p[1] - r0 * 1.6, p[0] + r0 * 1.6, p[1] + r0 * 1.6, -0.1, kroneY + r0 * 1.6)) continue
      stamme.push(p)
      gruen.form(stammForm(), achsenMatrix([p[0], (kroneY - 0.05) / 2, p[1]], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0.16 + zz() * 0.05, kroneY + 0.05, 0.16 + zz() * 0.05), F.stamm)
      const ton = F.laub[Math.floor(zz() * F.laub.length)].clone().multiplyScalar(0.92 + zz() * 0.14)
      gruen.form(kugelFein(), achsenMatrix([p[0], kroneY, p[1]], [1, 0, 0], [0, 1, 0], [0, 0, 1], r0, r0 * 1.05, r0), ton, 0.32)
      const neben = 2 + Math.floor(zz() * 3)
      const dreh = zz() * Math.PI * 2
      for (let i = 0; i < neben; i++) {
        const w = dreh + (i / neben) * Math.PI * 2 + (zz() - 0.5) * 0.6
        const d = r0 * (0.5 + zz() * 0.2)
        const r = r0 * (0.55 + zz() * 0.2)
        const c = ton.clone().multiplyScalar(0.92 + zz() * 0.14)
        gruen.form(kugelGrob(), achsenMatrix([p[0] + Math.cos(w) * d, kroneY + r0 * (zz() * 0.5 - 0.15), p[1] + Math.sin(w) * d], [1, 0, 0], [0, 1, 0], [0, 0, 1], r, r, r), c, 0.3)
      }
      garten.push(kastenRechteck(p[0] - 0.22, p[1] - 0.22, p[0] + 0.22, p[1] + 0.22))
      belegen(punktForm)
      baeume++
    }
    // Buesche nahe den Fassaden (nicht am Gang).
    let buesche = 0
    for (let versuch = 0; versuch < 1500 && buesche < 16; versuch++) {
      const h = haeuser[Math.floor(zz() * haeuser.length)]
      const k = h.kanten[Math.floor(zz() * h.kanten.length)]
      if (h === eigen && k === gang) continue
      if (k.laenge < 3) continue
      const p = kp(k, 1 + zz() * (k.laenge - 2), 1.3 + zz() * 1.2)
      const r = 0.45 + zz() * 0.35
      const form: P[] = [
        [p[0] - r, p[1] - r],
        [p[0] + r, p[1] - r],
        [p[0] + r, p[1] + r],
        [p[0] - r, p[1] + r],
      ]
      if (haeuser.some((x) => abstandFormen(form, x.poly) < 0.4)) continue
      if (!frei(form, 0.4, h.poly)) continue
      if (wegAbstand(form) < WEG_BREIT / 2 + 0.3) continue
      if (qv(p) > strasseQ0 - 1.4) continue
      if (trifftKasten(sch, p[0] - r, p[1] - r, p[0] + r, p[1] + r, -0.1, 1.2)) continue
      gruen.form(kugelGrob(), achsenMatrix([p[0], r * 0.55, p[1]], [1, 0, 0], [0, 1, 0], [0, 0, 1], r, r * 0.85, r), F.hecke.clone().lerp(F.laub[Math.floor(zz() * 4)], 0.25 * zz()), 0.3)
      garten.push({ ...kastenRechteck(p[0] - r * 0.8, p[1] - r * 0.8, p[0] + r * 0.8, p[1] + r * 0.8), oben: Math.round(r * 1.4 * 100) / 100 })
      belegen(form)
      buesche++
    }
  }

  /* ------------------------------------------------ Spielgeraete */
  function spielplatz(poly: P[], kanten: Kante[]): number {
    const laengste = kanten.reduce((m, k) => (k.laenge > m.laenge ? k : m), kanten[0])
    const e = laengste.u
    const f: P = [-e[1], e[0]]
    const mitte = innenPunkt(poly)
    const us = poly.map((p) => (p[0] - mitte[0]) * e[0] + (p[1] - mitte[1]) * e[1])
    const vs = poly.map((p) => (p[0] - mitte[0]) * f[0] + (p[1] - mitte[1]) * f[1])
    const hu = (Math.max(...us) - Math.min(...us)) / 2
    const hv = (Math.max(...vs) - Math.min(...vs)) / 2
    const um = (Math.max(...us) + Math.min(...us)) / 2
    const vm = (Math.max(...vs) + Math.min(...vs)) / 2
    const gesetzt: P[][] = []
    const platz = (lang: number, breit: number, kand: [number, number][], oben?: number): Kante | null => {
      for (const [fu, fv] of kand) {
        for (const s of [1, 0.75, 0.5, 0.25, 0]) {
          const c: P = [mitte[0] + e[0] * (um + fu * hu * s) + f[0] * (vm + fv * hv * s), mitte[1] + e[1] * (um + fu * hu * s) + f[1] * (vm + fv * hv * s)]
          const k: Kante = { a: c, u: e, n: f, laenge: lang }
          const form = rechteckForm({ k, t0: -lang / 2, t1: lang / 2, s0: -breit / 2, s1: breit / 2 })
          if (!form.every((p) => innen(p, poly))) continue
          if (form.some((p) => kanten.some((kk) => abstandStrecke(p, kk.a, kp(kk, kk.laenge, 0)) < 0.3))) continue
          if (gesetzt.some((g) => abstandFormen(form, g) < 0.9)) continue
          const xs = form.map((p) => p[0])
          const zs = form.map((p) => p[1])
          if (trifftKasten(sch, Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs), -0.1, 3.2)) continue
          gesetzt.push(form)
          garten.push({ k, t0: -lang / 2, t1: lang / 2, s0: -breit / 2, s1: breit / 2, ...(oben !== undefined ? { oben } : {}) })
          return k
        }
      }
      return null
    }
    let n = 0
    /** Stab (Walze) von a nach b, Radius r. */
    const stab = (a3: V3, b3: V3, r: number, farbe: Color) => {
      const d: V3 = [b3[0] - a3[0], b3[1] - a3[1], b3[2] - a3[2]]
      const [ax, ay, az] = achsenUm(d)
      bauten.form(walze(), achsenMatrix([(a3[0] + b3[0]) / 2, (a3[1] + b3[1]) / 2, (a3[2] + b3[2]) / 2], ax, ay, az, r, Math.hypot(...d), r), farbe)
    }
    const at = (k: Kante, t: number, s: number, y: number): V3 => {
      const p = kp(k, t, s)
      return [p[0], y, p[1]]
    }
    // Schaukel: zwei A-Boecke, Balken, zwei Sitze an Seilen.
    const sk1 = platz(3.8, 2.6, [
      [-0.5, 0],
      [0.5, 0],
      [0, -0.45],
      [0, 0.45],
    ])
    if (sk1) {
      for (const t of [-1.75, 1.75]) for (const s of [-1.1, 1.1]) stab(at(sk1, t, s, 0), at(sk1, t, 0, 2.3), 0.06, F.holz)
      stab(at(sk1, -1.9, 0, 2.3), at(sk1, 1.9, 0, 2.3), 0.07, F.holz)
      for (const t of [-0.75, 0.75]) {
        kq(bauten, sk1, t - 0.23, t + 0.23, -0.1, 0.1, 0.43, 0.48, F.rot, null)
        for (const dt of [-0.18, 0.18]) stab(at(sk1, t + dt, 0, 0.47), at(sk1, t + dt, 0, 2.28), 0.012, F.metall)
      }
      n++
    }
    // Spielturm mit Rutsche.
    const sk2 = platz(4.4, 2.0, [
      [0.5, 0],
      [-0.5, 0],
      [0, 0.45],
      [0, -0.45],
    ])
    if (sk2) {
      for (const t of [-2.1, -0.7]) for (const s of [-0.7, 0.7]) kq(bauten, sk2, t - 0.05, t + 0.05, s - 0.05, s + 0.05, 0, 2.65, F.holz, null)
      kq(bauten, sk2, -2.2, -0.6, -0.8, 0.8, 1.1, 1.2, F.holz, null)
      kq(bauten, sk2, -2.15, -0.65, 0.72, 0.76, 1.2, 1.85, F.gelb, null)
      kq(bauten, sk2, -2.15, -0.65, -0.76, -0.72, 1.2, 1.85, F.gelb, null)
      kq(bauten, sk2, -2.3, -0.5, -0.9, 0.9, 2.62, 2.76, F.rot, null)
      // Rutsche: schraege Bahn mit Raendern.
      const a3 = at(sk2, -0.6, 0, 1.2)
      const b3 = at(sk2, 2.1, 0, 0.22)
      const ax = normiert([b3[0] - a3[0], b3[1] - a3[1], b3[2] - a3[2]])
      let az: V3 = [sk2.n[0], 0, sk2.n[1]]
      let ay = kreuz(az, ax)
      if (ay[1] < 0) {
        az = [-az[0], 0, -az[2]]
        ay = kreuz(az, ax)
      }
      const lang = Math.hypot(b3[0] - a3[0], b3[1] - a3[1], b3[2] - a3[2])
      const m: V3 = [(a3[0] + b3[0]) / 2, (a3[1] + b3[1]) / 2, (a3[2] + b3[2]) / 2]
      bauten.quader(m, ax, ay, az, lang, 0.05, 0.5, F.blau)
      for (const s of [-0.26, 0.26]) bauten.quader([m[0] + az[0] * s + ay[0] * 0.07, m[1] + ay[1] * 0.07, m[2] + az[2] * s + ay[2] * 0.07], ax, ay, az, lang, 0.16, 0.03, F.blau)
      // Leiter.
      for (const s of [-0.3, 0.3]) stab(at(sk2, -2.45, s, 0), at(sk2, -2.2, s, 1.2), 0.03, F.holz)
      for (let j = 1; j <= 4; j++) stab(at(sk2, -2.45 + j * 0.05, -0.3, j * 0.24), at(sk2, -2.45 + j * 0.05, 0.3, j * 0.24), 0.02, F.holz)
      n++
    }
    // Sandkiste.
    const sk3 = platz(
      2.4,
      2.4,
      [
        [0, 0.45],
        [0, -0.45],
        [0, 0],
        [0.3, 0.3],
      ],
      0.3,
    )
    if (sk3) {
      kq(gelaende, sk3, -1.08, 1.08, -1.08, 1.08, -0.05, 0.16, F.sand.clone().multiplyScalar(1.08), null)
      for (const [t0, t1, s0, s1] of [
        [-1.2, 1.2, -1.2, -1.08],
        [-1.2, 1.2, 1.08, 1.2],
        [-1.2, -1.08, -1.08, 1.08],
        [1.08, 1.2, -1.08, 1.08],
      ]) kq(bauten, sk3, t0, t1, s0, s1, -0.05, 0.3, F.holz, null)
      n++
    }
    // Zwei Baenke am Rand, mit Blick zur Mitte.
    for (const [fu, fv] of [
      [0, -0.85],
      [0, 0.85],
    ] as [number, number][]) {
      // Auf die Sitzflaeche (0,47 m) kommt man hinauf.
      const kb = platz(
        1.8,
        0.7,
        [
          [fu, fv],
          [fu + 0.4, fv * 0.8],
          [fu - 0.4, fv * 0.8],
        ],
        0.47,
      )
      if (!kb) continue
      const zur = fv > 0 ? -1 : 1
      // Sitz, Lehne (hinten, weg von der Mitte), Fuesse.
      kq(bauten, kb, -0.9, 0.9, -0.21, 0.21, 0.42, 0.47, F.holz, null)
      kq(bauten, kb, -0.9, 0.9, -zur * 0.27 - 0.03, -zur * 0.27 + 0.03, 0.55, 0.88, F.holz, null)
      for (const t of [-0.75, 0.75]) kq(bauten, kb, t - 0.03, t + 0.03, -0.25, 0.25, 0, 0.42, F.platte, null)
      n++
    }
    return n
  }

  /* ------------------------------------------------ Wiese mit Loch */
  {
    const cx = (bx0 + bx1) / 2
    const cz = (bz0 + bz1) / 2
    const halb = Math.max(bx1 - bx0, bz1 - bz0) / 2 + 50
    // Mit Stadt (E87) nur der Grund der Siedlung: ein Rechteck um alles,
    // was sie baut; das Gelaende ringsum zeichnet die Stadt.
    const um = stadtDa ? kastenVon(belegt.flatMap((b): P[] => [[b.r[0], b.r[1]], [b.r[2], b.r[3]]])) : null
    const grund: Kasten | null = um ? [um[0] - GRUND_RAND, um[1] - GRUND_RAND, um[2] + GRUND_RAND, um[3] + GRUND_RAND] : null
    const Z = grund ? Math.max(ZELLE_MIN, Math.max(grund[2] - grund[0], grund[3] - grund[1]) / 70) : Math.max(ZELLE_MIN, (2 * halb) / 70)
    const ph = [zz(), zz(), zz(), zz()].map((v) => v * Math.PI * 2)
    const welle = (x: number, z: number) =>
      0.5 * Math.sin(x * 0.13 + ph[0]) * Math.sin(z * 0.11 + ph[1]) + 0.3 * Math.sin((x - z) * 0.05 + ph[2]) + 0.2 * Math.sin((x + 0.6 * z) * 0.31 + ph[3])
    const ton = (p: P) => {
      const w = welle(p[0], p[1])
      const w2 = welle(p[1] * 0.7 + 31, p[0] * 0.7 - 17)
      return F.rasen
        .clone()
        .lerp(F.trocken, 0.16 * (0.5 + 0.5 * w2))
        .multiplyScalar(1 + 0.07 * w)
    }
    // Halbebenen des Lochs (nach innen gerichtet).
    let lochEbenen: [number, number, number][] = []
    const lochR = loch ? kastenVon(loch) : null
    if (loch) {
      const lk = kantenVon(loch)
      lochEbenen = lk.map((k) => [-k.n[0], -k.n[1], -(k.n[0] * k.a[0] + k.n[1] * k.a[1])])
    }
    const n = Math.ceil((2 * halb) / Z)
    const nx = grund ? Math.max(1, Math.ceil((grund[2] - grund[0]) / Z)) : n
    const nz = grund ? Math.max(1, Math.ceil((grund[3] - grund[1]) / Z)) : n
    const x0 = grund ? grund[0] : cx - (n * Z) / 2
    const z0 = grund ? grund[1] : cz - (n * Z) / 2
    const fan = (poly: P[]) => {
      for (let i = 1; i + 1 < poly.length; i++) boden.dreieck(poly[0], poly[i], poly[i + 1], WIESE_Y, ton(poly[0]), ton(poly[i]), ton(poly[i + 1]))
    }
    // Farben je Gitterpunkt einmal rechnen.
    const gitter: Color[] = []
    for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) gitter.push(ton([x0 + i * Z, z0 + j * Z]))
    const gf = (i: number, j: number) => gitter[i * (nz + 1) + j]
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < nz; j++) {
        const zelle: P[] = [
          [x0 + i * Z, z0 + j * Z],
          [x0 + (i + 1) * Z, z0 + j * Z],
          [x0 + (i + 1) * Z, z0 + (j + 1) * Z],
          [x0 + i * Z, z0 + (j + 1) * Z],
        ]
        const aussen =
          !loch || !lochR || zelle[1][0] <= lochR[0] || zelle[0][0] >= lochR[2] || zelle[2][1] <= lochR[1] || zelle[0][1] >= lochR[3] || abstandFormen(zelle, loch) > 0
        if (aussen) {
          boden.dreieck(zelle[0], zelle[1], zelle[2], WIESE_Y, gf(i, j), gf(i + 1, j), gf(i + 1, j + 1))
          boden.dreieck(zelle[0], zelle[2], zelle[3], WIESE_Y, gf(i, j), gf(i + 1, j + 1), gf(i, j + 1))
          continue
        }
        // Zelle ohne Loch: je Seite des Lochs das Stueck draussen.
        let rest = zelle
        for (const [nx, nz, d] of lochEbenen) {
          const draussen = halbebene(rest, -nx, -nz, -d)
          if (draussen.length >= 3 && Math.abs(flaecheVon(draussen)) > 1e-6) fan(draussen)
          rest = halbebene(rest, nx, nz, d)
          if (rest.length < 3) break
        }
      }
    }
    // Ring bis 300 m, etwas tiefer unter dem Raster (nicht mit Stadt).
    const rIn = grund ? WIESE_R : halb - 1
    const ringe = [rIn]
    while (ringe[ringe.length - 1] < WIESE_R) ringe.push(Math.min(WIESE_R, ringe[ringe.length - 1] * 1.35))
    const TEILE = 64
    const punktAuf = (r: number, k: number): P => [cx + Math.cos((k / TEILE) * Math.PI * 2) * r, cz + Math.sin((k / TEILE) * Math.PI * 2) * r]
    for (let ri = 0; ri + 1 < ringe.length; ri++) {
      for (let k = 0; k < TEILE; k++) {
        const a1 = punktAuf(ringe[ri], k)
        const b1 = punktAuf(ringe[ri], k + 1)
        const c1 = punktAuf(ringe[ri + 1], k + 1)
        const d1 = punktAuf(ringe[ri + 1], k)
        boden.dreieck(a1, b1, c1, WIESE_Y - 0.01, ton(a1), ton(b1), ton(c1))
        boden.dreieck(a1, c1, d1, WIESE_Y - 0.01, ton(a1), ton(c1), ton(d1))
      }
    }
  }

  /* ------------------------------------------------ Ebenen */
  const ebenen: Ebene3D[] = []
  const nachHindernis = (h: KRechteck): Hindernis3D => {
    const m = nachWelt(kp(h.k, (h.t0 + h.t1) / 2, (h.s0 + h.s1) / 2))
    const out: Hindernis3D = { x: m[0], z: m[1], laenge: h.t1 - h.t0, tiefe: h.s1 - h.s0, drehY: Math.atan2(-h.k.u[1], h.k.u[0]) + rad }
    if (h.oben !== undefined) out.oben = h.oben
    return out
  }
  /** Ohne Aussparung: auf der Ebene der Wohnung bleibt ihr Rechteck frei. */
  const rahmenFrei = sch ? sch.r : null
  const gartenListe = (wohnungsEbene: boolean): KRechteck[] => (wohnungsEbene ? garten.flatMap((h) => ohne(h, rahmenFrei)) : garten.slice())
  /** Wo die Wohnungstuer auf den Gang trifft (t an der Gangkante). */
  let tuerT: number | null = null
  if (eigen && gang && rahmenLokal) {
    const g = gang
    const ecken = ([
      [rahmenLokal[0], rahmenLokal[1]],
      [rahmenLokal[2], rahmenLokal[1]],
      [rahmenLokal[2], rahmenLokal[3]],
      [rahmenLokal[0], rahmenLokal[3]],
    ] as P[])
      .map((p) => ({ t: (p[0] - g.a[0]) * g.u[0] + (p[1] - g.a[1]) * g.u[1], s: (p[0] - g.a[0]) * g.n[0] + (p[1] - g.a[1]) * g.n[1] }))
      .sort((x, y) => y.s - x.s)
    tuerT = (ecken[0].t + ecken[1].t) / 2
  }
  /** Waende eines Hauses ohne Plaene im Geschoss k: jede Kante als
   *  Rechteck, auf dem Geschoss der Wohnung mit der Luecke vor ihrer Tuer. */
  const huellWaende = (h: Haus, k: number): KRechteck[] => {
    const liste: KRechteck[] = []
    for (const kn of h.kanten) {
      const wand: KRechteck = { k: kn, t0: 0, t1: kn.laenge, s0: -WAND, s1: 0 }
      if (h === eigen && k === geschoss && kn === gang && tuerT !== null) {
        for (const [t0, t1] of abziehen([0, kn.laenge], [[tuerT - TUER_LUECKE / 2, tuerT + TUER_LUECKE / 2]])) liste.push({ ...wand, t0, t1 })
      } else liste.push(wand)
    }
    return liste
  }
  /** Index der Ebene je Haus und Geschoss; -1, wenn es keine gibt. */
  const ebeneIndex = new Map<string, number>()
  const ebeneVon = (id: string, k: number): number => ebeneIndex.get(`${id}|${k}`) ?? -1
  const hausName = (h: Haus) => h.g.name || h.g.id
  const ogName = (k: number) => (k === 0 ? 'EG' : `${k}. OG`)
  /** Die Ebene draussen (Garten, Spielplatz, Haustueren). */
  let gartenIndex = 0
  if (!innenListe.length) {
    /* Wie bisher (E83): die Geschosse des eigenen Hauses, zuletzt der Garten.
     * Ohne Rahmen (Gaeste, E86) heisst auch das Geschoss der Wohnung
     * 'geschoss-<k>'. */
    if (eigen) {
      const h = eigen
      for (let k = 0; k < h.n; k++) {
        const istWohnung = wohnungDa && k === geschoss
        const liste = huellWaende(h, k)
        liste.push(...(gangHindernisse[k] ?? []), ...kernHindernisse, ...(kernStufen[k] ?? []))
        if (k === 0) liste.push(...saeulen, ...garten)
        const fertig = istWohnung ? liste.flatMap((x) => ohne(x, rahmenFrei)) : liste
        ebeneIndex.set(`${h.g.id}|${k}`, ebenen.length)
        ebenen.push({
          id: istWohnung ? 'wohnung' : `geschoss-${k}`,
          name: ogName(k),
          y: (k - geschoss) * h.gh,
          hindernisse: fertig.map(nachHindernis),
        })
      }
      gartenIndex = ebenen.length
      ebenen.push({ id: 'garten', name: 'Garten', y: -geschoss * h.gh, hindernisse: ebenen[0].hindernisse.map((x) => ({ ...x })) })
    } else {
      ebenen.push({ id: 'garten', name: 'Garten', y: 0, hindernisse: gartenListe(!!sch).map(nachHindernis) })
    }
  } else {
    /* Mit Plaenen (E84): zuerst eine Ebene fuer den Boden (der Garten und
     * alle Erdgeschosse, so geht man durch die Haustuer hinein), dann je
     * Haus seine Obergeschosse: das eigene Haus zuerst, dann die Haeuser
     * mit Plaenen. Liegt die Wohnung im EG, ist der Boden ihre Ebene (nur
     * mit Rahmen; Gaeste haben dort 'boden' und '<gebaeudeId>:<k>'). */
    const unten: KRechteck[] = [...garten]
    if (eigen && !eigenInnen) unten.push(...huellWaende(eigen, 0), ...(gangHindernisse[0] ?? []), ...kernHindernisse, ...(kernStufen[0] ?? []), ...saeulen)
    for (const ih of innenListe) {
      const g0 = ih.nachK.get(0)
      unten.push(...(g0 ? g0.hindernisse : huellWaende(ih.h, 0)))
    }
    const bodenWohnung = wohnungDa && geschoss === 0
    ebenen.push({
      id: bodenWohnung ? 'wohnung' : 'boden',
      name: 'EG',
      y: -absenk,
      hindernisse: (bodenWohnung ? unten.flatMap((x) => ohne(x, rahmenFrei)) : unten).map(nachHindernis),
    })
    for (const h of haeuser) ebeneIndex.set(`${h.g.id}|0`, 0)
    const dazu = (h: Haus, k: number, liste: KRechteck[]) => {
      const istWohnung = wohnungDa && h === eigen && k === geschoss
      ebeneIndex.set(`${h.g.id}|${k}`, ebenen.length)
      ebenen.push({
        id: istWohnung ? 'wohnung' : `${h.g.id}:${k}`,
        name: `${hausName(h)} ${ogName(k)}`,
        y: k * h.gh - absenk,
        hindernisse: (istWohnung ? liste.flatMap((x) => ohne(x, rahmenFrei)) : liste).map(nachHindernis),
      })
    }
    if (eigen && !eigenInnen) for (let k = 1; k < eigen.n; k++) dazu(eigen, k, [...huellWaende(eigen, k), ...(gangHindernisse[k] ?? []), ...kernHindernisse, ...(kernStufen[k] ?? [])])
    for (const ih of innenListe) {
      for (let k = 1; k < ih.h.n; k++) {
        const g = ih.nachK.get(k)
        if (g) dazu(ih.h, k, g.hindernisse)
        else if (ih.h === eigen && k === geschoss) dazu(ih.h, k, huellWaende(ih.h, k))
      }
    }
  }
  /** Die Ebenen des Bodens (E87): Index 0, ohne Plaene mit eigenem Haus
   *  auch der Garten (gleiche Hoehe, gleiche Hindernisse). Dorthin kommen
   *  Gelaende und Hindernisse der Stadt. */
  const bodenEbenen = gartenIndex !== 0 ? [0, gartenIndex] : [0]
  /** Ebene der Ziele draussen: der Garten, mit Stadt immer Index 0, damit
   *  von dort auch Treppen und Schwellen der Stadt erreichbar sind. */
  const draussenIndex = stadtDa ? 0 : gartenIndex

  /* Zwischenpodeste (E87): je Haus und Geschoss mit Treppe eine Ebene
   * '<gebaeudeId>:<k>.5', hinten an (die Indizes davor bleiben), dazu die
   * Laeufe als Treppe3D: hinauf vom Geschoss zum Podest, vom Podest zum
   * naechsten Geschoss. */
  const meineTreppen: Treppe3D[] = []
  const laufWelt = (id: string, lf: Lauf, von: string, nach: string): Treppe3D => {
    const c = nachWelt(lf.c)
    const d = richtungWelt(lf.u)
    return { id, x: c[0], z: c[1], laenge: lf.laenge, breite: lf.breite, drehY: Math.atan2(-d[1], d[0]), von, nach, stufen: lf.stufen }
  }
  const kennungVon = (h: Haus, k: number): string | null => ebenen[ebeneVon(h.g.id, k)]?.id ?? null
  const podestEbene = (h: Haus, k: number, liste: KRechteck[], vorne: string): string => {
    const id = `${h.g.id}:${k}.5`
    ebenen.push({ id, name: `${vorne}Zwischenpodest ${ogName(k)}`, y: (k + 0.5) * h.gh - absenk, hindernisse: liste.map(nachHindernis) })
    return id
  }
  if (eigen && kernLaeufe.length && !eigenInnen) {
    const [hin, her] = kernLaeufe[0]
    for (let k = 0; k + 1 < eigen.n; k++) {
      const von = kennungVon(eigen, k)
      const nach = kennungVon(eigen, k + 1)
      if (!von || !nach) continue
      const pid = podestEbene(eigen, k, kernPodest, innenListe.length ? `${hausName(eigen)} ` : '')
      meineTreppen.push(laufWelt(`${eigen.g.id}:t${k}a`, hin, von, pid), laufWelt(`${eigen.g.id}:t${k}b`, her, pid, nach))
    }
  }
  for (const ih of innenListe) {
    for (const g of ih.geschosse) {
      const hoch = g.flaechen.filter((f) => f.art === 'stiege').flatMap((f) => {
        const st = ih.stiegen.get(f)
        return st && st.hoch ? [st] : []
      })
      if (!hoch.length) continue
      const von = kennungVon(ih.h, g.k)
      const nach = kennungVon(ih.h, g.k + 1)
      if (!von || !nach) continue
      const pid = podestEbene(ih.h, g.k, hoch.flatMap((st) => podestHindernisse(st.lage)), `${hausName(ih.h)} `)
      hoch.forEach((st, i) => {
        const [hin, her] = laeufeVon(st.lage)
        const nr = hoch.length > 1 ? `.${i}` : ''
        meineTreppen.push(laufWelt(`${ih.h.g.id}:t${g.k}${nr}a`, hin, von, pid), laufWelt(`${ih.h.g.id}:t${g.k}${nr}b`, her, pid, nach))
      })
    }
  }

  /* ------------------------------------------------ Meshes */
  const welt = new MeshLambertMaterial({ vertexColors: true })
  // Die Wiese weicht in der Tiefe, so flimmert nichts, was flach auf ihr liegt.
  const bodenMat = new MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 })
  const himmelMat = new MeshBasicMaterial({ vertexColors: true, side: BackSide, fog: false, depthWrite: false })
  const knopfMat = new MeshLambertMaterial({ color: F.gelaender.clone().multiplyScalar(1.05) })
  const knopfAnMat = new MeshLambertMaterial({ color: F.licht.clone(), emissive: F.gelb.clone(), emissiveIntensity: 0.75 })
  // Innen (E84): Glas der Fenster, durchsichtig; Knoepfe zum Antippen, unsichtbar.
  const glasMat = new MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.22, depthWrite: false, side: DoubleSide })
  const trefferMat = new MeshBasicMaterial({ visible: false })
  const materialien: Material[] = [welt, bodenMat, himmelMat, knopfMat, knopfAnMat, glasMat, trefferMat]
  const geometrien: BufferGeometry[] = []

  const gruppe = new Group()
  gruppe.name = 'siedlung'
  const lage = new Group()
  lage.name = 'siedlungLage'
  lage.rotation.y = rad
  lage.position.set(-(cs * wx + sn * wz), -absenk, -(-sn * wx + cs * wz))
  lage.updateMatrix()
  lage.matrixAutoUpdate = false
  gruppe.add(lage)

  const himmelR = stadtDa ? HIMMEL_R_STADT : HIMMEL_R
  const himmelGeo = himmelKugel(F.oben, F.unten, himmelR)
  geometrien.push(himmelGeo)
  const himmelMesh = new Mesh(himmelGeo, himmelMat)
  himmelMesh.name = 'himmel'
  himmelMesh.renderOrder = -1000
  himmelMesh.frustumCulled = false
  himmelMesh.raycast = () => undefined
  himmelMesh.onBeforeRender = (_r, _s, kamera) => {
    const e = kamera.matrixWorld.elements
    // Sieht die Kamera weniger weit als die Kugel reicht, schrumpft sie (E87).
    const weit = (kamera as { far?: number }).far
    const s = typeof weit === 'number' && weit > 0 ? Math.min(1, (weit * 0.95) / himmelR) : 1
    himmelMesh.matrixWorld.makeScale(s, s, s).setPosition(e[12], e[13], e[14])
  }
  gruppe.add(himmelMesh)

  const fest = (p: Puffer, name: string, mat: Material): Mesh | null => {
    const geo = p.bauen()
    if (!geo) return null
    geometrien.push(geo)
    const m = new Mesh(geo, mat)
    m.name = name
    m.matrixAutoUpdate = false
    lage.add(m)
    return m
  }
  fest(boden, 'boden', bodenMat)
  fest(gelaende, 'gelaende', welt)
  fest(gruen, 'gruen', welt)
  fest(bauten, 'bauten', welt)
  // Huellen der Haeuser mit Plaenen und ihre (noch leeren) Innenraeume.
  for (const ih of innenListe) {
    ih.huelleMesh = fest(ih.huelle, `huelle:${ih.h.g.id}`, welt)
    ih.gruppe.matrixAutoUpdate = false
    lage.add(ih.gruppe)
  }

  /* ------------------------------------------------ Fahrzeuge und Dinge (E87) */
  /* In Weltkoordinaten direkt in der Gruppe (der Motor setzt ihre Lage),
   * auf der Ebene des Bodens. Kennungen stabil (E87b), ohne Laufnummer der
   * Daten: 'siedlung:f:<x>:<z>:<art>' aus dem Stellplatz (Siedlungsmeter in
   * Dezimetern; Besitzer und Gast haben so dieselbe Kennung fuer dasselbe
   * Auto, auch wenn beim Besitzer eins neben der Wohnung fehlt),
   * 'siedlung:d<n>:<art>' mit n der Stelle in der festen Liste unten. Keine
   * Hindernisse: bewegliche Dinge kennt der Motor. */
  const bodenKennung = ebenen[0].id
  const bodenY = ebenen[0].y
  let fahrzeugFehler = 0
  const meineFahrzeuge: Fahrzeug3D[] = []
  const fzKennungen = new Set<string>()
  geparkt.forEach((a) => {
    const c = nachWelt(a.c)
    const d = richtungWelt(a.vorne)
    const gier = Math.atan2(-d[0], -d[1])
    const basis = `siedlung:f:${Math.round(a.c[0] * 10)}:${Math.round(a.c[1] * 10)}:${a.art}`
    let id = basis
    for (let k = 2; fzKennungen.has(id); k++) id = `${basis}:${k}`
    fzKennungen.add(id)
    let f: Fahrzeug3D
    try {
      f = baueFahrzeug(a.art, a.farbe, id, { x: c[0], z: c[1], gier, ebene: bodenKennung })
    } catch (err) {
      console.warn('[siedlung] Auto nicht gebaut:', err)
      fahrzeugFehler++
      return
    }
    f.gruppe.position.set(c[0], bodenY, c[1])
    f.gruppe.rotation.y = gier
    f.gruppe.name = `fahrzeug:${f.id}`
    gruppe.add(f.gruppe)
    meineFahrzeuge.push(f)
  })

  const meineDinge: WeltDing3D[] = []
  /** Die Dinge der Siedlung, feste Liste: die Stelle n ist ihre Kennung. */
  const dingListe: { art: DingArt; farbe: Color; wo: 'spiel' | 'garten' }[] = [
    { art: 'ball', farbe: F.rot, wo: 'spiel' },
    { art: 'kuebel', farbe: F.gelb, wo: 'spiel' },
    { art: 'schaufel', farbe: F.blau, wo: 'spiel' },
    { art: 'form', farbe: F.rot, wo: 'spiel' },
    { art: 'ball', farbe: F.blau, wo: 'spiel' },
    { art: 'kuebel', farbe: F.rot, wo: 'spiel' },
    { art: 'schaufel', farbe: F.gelb, wo: 'spiel' },
    { art: 'sessel', farbe: F.weiss, wo: 'garten' },
    { art: 'sessel', farbe: F.weiss, wo: 'garten' },
    { art: 'ball', farbe: F.gelb, wo: 'garten' },
  ]
  {
    const zd = zufallMit(saatAus([...alle.flat(), 87]))
    const boden0 = ebenen[0]
    /** Platz fuer ein Ding (lokal, Radius r): frei von allem am Boden, nicht
     *  im Haus, in der Grube, in der Wohnung oder auf der Strasse. */
    const gesetzt: P[] = []
    const passt = (p: P, r: number) => {
      if (haeuser.some((h) => innen(p, h.poly) || abstandUmriss(p, h.poly) < r + 0.5)) return false
      if (loch && (innen(p, loch) || abstandUmriss(p, loch) < r + 0.4)) return false
      if (trifftKasten(sch, p[0] - r, p[1] - r, p[0] + r, p[1] + r, -0.1, 1.0)) return false
      if (qv(p) > strasseQ0 - 0.8) return false
      if (gesetzt.some((x) => Math.hypot(x[0] - p[0], x[1] - p[1]) < r + 0.6)) return false
      const w = nachWelt(p)
      return boden0.hindernisse.every((hd) => hindernisAbstand(hd, w[0], w[1]) > r + 0.25)
    }
    /** Ein Punkt in poly, wenigstens rand vom Rand entfernt, der passt. */
    const inFlaeche = (poly: P[], rand: number, r: number): P | null => {
      const [x0, z0, x1, z1] = kastenVon(poly)
      for (let v = 0; v < 160; v++) {
        const p: P = [x0 + zd() * (x1 - x0), z0 + zd() * (z1 - z0)]
        if (innen(p, poly) && abstandUmriss(p, poly) >= rand && passt(p, r)) return p
      }
      return null
    }
    /** Sonst neben einem Haus, 1,6 bis 3,5 m vor einer Fassade. */
    const nebenHaus = (r: number): P | null => {
      for (let v = 0; v < 300; v++) {
        const h = haeuser[Math.floor(zd() * haeuser.length)]
        const k = h.kanten[Math.floor(zd() * h.kanten.length)]
        if (k.laenge < 3 || (h === eigen && k === gang)) continue
        const p = kp(k, 1 + zd() * (k.laenge - 2), 1.6 + zd() * 1.9)
        if (passt(p, r)) return p
      }
      return null
    }
    const spielDa = !!spielPoly && spielgeraete > 0
    const gaerten = innenListe.flatMap((ih) => (ih.nachK.get(0)?.flaechen ?? []).filter((f) => f.art === 'draussen' && !f.weg).map((f) => f.poly))
    dingListe.forEach((d, i) => {
      const form = dingForm(d.art, d.farbe)
      const r = Math.hypot(form.b, form.t) / 2
      let p: P | null = null
      if (d.wo === 'spiel' && spielDa && spielPoly) p = inFlaeche(spielPoly, 0.4, r)
      if (!p && gaerten.length) p = inFlaeche(gaerten[i % gaerten.length], 0.3, r)
      if (!p) p = nebenHaus(r)
      const geo = form.p.bauen()
      if (!p || !geo) {
        geo?.dispose()
        return
      }
      gesetzt.push(p)
      geometrien.push(geo)
      const id = `siedlung:d${i}:${d.art}`
      const m = new Mesh(geo, welt)
      m.name = `ding:${id}`
      const w = nachWelt(p)
      m.position.set(w[0], bodenY, w[1])
      m.rotation.y = zd() * Math.PI * 2
      gruppe.add(m)
      meineDinge.push({ id, objekt: m, breite: form.b, tiefe: form.t, hoehe: form.h, ebene: bodenKennung })
    })
  }
  /** Zahl der Dinge, die dingErzeugen dazugebaut hat (E87b): zaehlt mit in version(). */
  let eigeneDazu = 0
  let eigeneVoll = false
  /** Ein Ding der Siedlung allein aus seiner Kennung 'siedlung:d<n>:<art>'
   *  bauen (E87b), etwa wenn es beim Bau keinen Platz fand: Farbe aus der
   *  Liste an der Stelle n (passt die Art nicht, die erste dieser Art), am
   *  Start vor dem Haus; die Lage setzt danach der Motor. null: keine
   *  solche Kennung. */
  const eigenesDing = (id: string): WeltDing3D | null => {
    const m = /^siedlung:d(\d+):([a-z]+)$/.exec(id)
    if (!m) return null
    if (eigeneDazu >= EIGENE_DINGE_MAX) {
      if (!eigeneVoll) console.warn(`[siedlung] mehr als ${EIGENE_DINGE_MAX} Dinge aus Kennungen, weitere werden nicht gebaut`)
      eigeneVoll = true
      return null
    }
    const n = Number(m[1])
    const vorlage = dingListe[n]?.art === m[2] ? dingListe[n] : dingListe.find((x) => x.art === m[2])
    if (!vorlage) return null
    const form = dingForm(vorlage.art, vorlage.farbe)
    const geo = form.p.bauen()
    if (!geo) return null
    geometrien.push(geo)
    const objekt = new Mesh(geo, welt)
    objekt.name = `ding:${id}`
    const ziel = sprungziele[0]
    objekt.position.set(ziel ? ziel.x : 0, bodenY, ziel ? ziel.z : 0)
    gruppe.add(objekt)
    const ding: WeltDing3D = { id, objekt, breite: form.b, tiefe: form.t, hoehe: form.h, ebene: bodenKennung }
    meineDinge.push(ding)
    eigeneDazu++
    return ding
  }

  /** Ein Ding als ein Mesh (Eckfarben, Ursprung unten in der Mitte). */
  function dingForm(art: DingArt, farbe: Color): { p: Puffer; b: number; t: number; h: number } {
    const p = new Puffer(1024)
    const X: V3 = [1, 0, 0]
    const Y: V3 = [0, 1, 0]
    const Z: V3 = [0, 0, 1]
    switch (art) {
      case 'ball':
        p.form(kugelFein(), achsenMatrix([0, 0.11, 0], X, Y, Z, 0.11, 0.11, 0.11), farbe, 0.2)
        return { p, b: 0.22, t: 0.22, h: 0.22 }
      case 'kuebel':
        p.form(walze(), achsenMatrix([0, 0.1, 0], X, Y, Z, 0.1, 0.2, 0.1), farbe, 0.15)
        p.form(walze(), achsenMatrix([0, 0.205, 0], X, Y, Z, 0.108, 0.014, 0.108), farbe.clone().multiplyScalar(0.8))
        p.quader([0, 0.272, 0], X, Y, Z, 0.21, 0.012, 0.012, F.metall)
        for (const sx of [-0.1, 0.1]) p.quader([sx, 0.24, 0], X, Y, Z, 0.012, 0.07, 0.012, F.metall)
        return { p, b: 0.22, t: 0.22, h: 0.28 }
      case 'schaufel':
        p.quader([0, 0.015, 0.06], X, Y, Z, 0.03, 0.03, 0.22, farbe)
        p.quader([0, 0.012, -0.11], X, Y, Z, 0.11, 0.024, 0.12, farbe)
        return { p, b: 0.11, t: 0.34, h: 0.03 }
      case 'form':
        p.form(walze(), achsenMatrix([0, 0.035, 0], X, Y, Z, 0.07, 0.07, 0.07), farbe, 0.15)
        return { p, b: 0.14, t: 0.14, h: 0.07 }
      case 'sessel':
        for (const [sx, sz] of [
          [-0.2, -0.19],
          [0.2, -0.19],
          [-0.2, 0.19],
          [0.2, 0.19],
        ])
          p.quader([sx, 0.21, sz], X, Y, Z, 0.035, 0.42, 0.035, farbe)
        p.quader([0, 0.43, 0], X, Y, Z, 0.46, 0.04, 0.44, farbe)
        p.quader([0, 0.66, 0.205], X, Y, Z, 0.46, 0.42, 0.035, farbe)
        for (const sx of [-0.215, 0.215]) p.quader([sx, 0.63, 0], X, Y, Z, 0.035, 0.03, 0.42, farbe)
        return { p, b: 0.48, t: 0.46, h: 0.87 }
    }
  }

  if (stadt) gruppe.add(stadt.gruppe)

  /* ------------------------------------------------ Aufzuege */
  let weg = false
  /** Antippbare Knoepfe; die der Haeuser mit Plaenen kommen beim Bauen dazu. */
  const knoepfe: Object3D[] = []
  const lifts: Lift[] = []
  const blaetterSetzen = (mesh: Mesh | null, basis: Float32Array | null, blaetter: Blatt[], auf: number) => {
    if (!mesh || !basis) return
    const attr = mesh.geometry.getAttribute('position') as BufferAttribute
    const arr = attr.array as Float32Array
    for (const b of blaetter) {
      for (let v = b.start; v < b.ende; v++) {
        arr[v * 3] = basis[v * 3] + b.richtung[0] * b.weg * auf
        arr[v * 3 + 2] = basis[v * 3 + 2] + b.richtung[1] * b.weg * auf
      }
    }
    attr.needsUpdate = true
  }
  const drehNach = (d: P) => Math.atan2(d[0], d[1])
  const rechteckWelt = (a: P, b: P): [number, number, number, number] => {
    const e = [a, b].map(nachWelt)
    return [Math.min(e[0][0], e[1][0]), Math.min(e[0][1], e[1][1]), Math.max(e[0][0], e[1][0]), Math.max(e[0][1], e[1][1])]
  }

  /* Aufzug am Laubengang (E83). */
  let kabineMesh: Mesh | null = null
  if (eigen && gang && mitKern) {
    const h = eigen
    const g = gang
    const ex: P = kernEnde === 1 ? [-g.u[0], -g.u[1]] : [g.u[0], g.u[1]]
    const rufKnoepfe: Mesh[] = []
    const fahrKnoepfe: Mesh[] = []
    kabineMesh = fest(kabine, 'kabine', welt)
    const tuerMesh = fest(tueren, 'aufzugTueren', welt)
    let kabineBasis: Float32Array | null = null
    if (kabineMesh) {
      kabineMesh.matrixAutoUpdate = true
      kabineMesh.position.y = geschoss * h.gh
      kabineMesh.updateMatrix()
      kabineBasis = Float32Array.from(kabineMesh.geometry.getAttribute('position').array as Float32Array)
    }
    const tuerBasis = tuerMesh ? Float32Array.from(tuerMesh.geometry.getAttribute('position').array as Float32Array) : null
    const knopfGeo = new RoundedBoxGeometry(0.06, 0.06, 0.024, 1, 0.008)
    geometrien.push(knopfGeo)
    const nr = lifts.length
    for (let k = 0; k < h.n; k++) {
      const m = new Mesh(knopfGeo, knopfMat)
      const p = kp(g, kt(1.97), K_S0 - 0.027)
      m.position.set(p[0], k * h.gh + 1.075, p[1])
      m.rotation.y = drehNach(g.n)
      m.userData = { aufzug: 'ruf', ebene: ebeneVon(h.g.id, k), geschoss: k, lift: nr }
      m.name = `aufzugRuf${k}`
      m.updateMatrix()
      m.matrixAutoUpdate = false
      lage.add(m)
      rufKnoepfe.push(m)
      knoepfe.push(m)
    }
    if (kabineMesh) {
      for (let k = 0; k < h.n; k++) {
        const m = new Mesh(knopfGeo, knopfMat)
        const p = kp(g, kt(KAB[1] - 0.055 - 0.012), 2.15)
        m.position.set(p[0], 0.85 + k * 0.1, p[1])
        m.rotation.y = drehNach(ex)
        m.userData = { aufzug: 'fahre', ebene: ebeneVon(h.g.id, k), geschoss: k, lift: nr }
        m.name = `aufzugFahre${k}`
        m.updateMatrix()
        m.matrixAutoUpdate = false
        kabineMesh.add(m)
        fahrKnoepfe.push(m)
        knoepfe.push(m)
      }
      const km = kabineMesh
      lifts.push({
        steuer: aufzugSteuern({
          halte: Array.from({ length: h.n }, (_, k) => k),
          start: geschoss,
          gh: h.gh,
          bereit: () => !weg,
          kabineY: (y) => {
            km.position.y = y
          },
          etageTueren: (k, auf) => blaetterSetzen(tuerMesh, tuerBasis, blaetterEtage[k] ?? [], auf),
          kabineTueren: (auf) => blaetterSetzen(km, kabineBasis, blaetterKabine, auf),
          leuchten: (k, an) => {
            for (const m of [rufKnoepfe[k], fahrKnoepfe[k]]) if (m) m.material = an ? knopfAnMat : knopfMat
          },
        }),
        haus: h,
        ebene: (k) => ebeneVon(h.g.id, k),
        // Innenraum der Kabine in Weltmetern.
        welt: rechteckWelt(kp(g, kt(KAB[0] + 0.04), KAB[2] + 0.04), kp(g, kt(KAB[1] - 0.04), KAB[3] - 0.04)),
      })
    }
  }

  /* Aufzuege der Haeuser mit Plaenen (E84): die Steuerung gleich, Kabine,
   * Tueren und Knoepfe erst mit dem Haus (liftBauen). Die Knoepfe leuchten
   * ueber ihre Eckfarben; angetippt werden unsichtbare Kaesten davor. */
  const trefferGeo = new BoxGeometry(0.07, 0.07, 0.03)
  geometrien.push(trefferGeo)
  interface LiftTeile {
    kabine: Mesh | null
    tueren: Mesh | null
    kabineBasis: Float32Array | null
    tuerBasis: Float32Array | null
    etage: Map<number, Blatt[]>
    kabineBlaetter: Blatt[]
    ruf: Map<number, [number, number]>
    fahre: Map<number, [number, number]>
    rufTreffer: Map<number, Mesh>
  }
  const liftTeile = new Map<InnenHaus, LiftTeile>()
  const faerben = (m: Mesh | null, r: [number, number] | undefined, an: boolean) => {
    if (!m || !r) return
    const attr = m.geometry.getAttribute('color') as BufferAttribute
    const c = an ? F.knopfAn : F.knopf
    for (let v = r[0]; v < r[1]; v++) attr.setXYZ(v, c.r, c.g, c.b)
    attr.needsUpdate = true
  }
  /** Die Kabine innen (lokal): t von c0 bis c1, s von d0 bis d1 an der Tuerseite. */
  const kabinenMass = (A: IAufzug) => ({ c0: A_WAND + 0.05, c1: A.breit - A_WAND - 0.05, d0: A_WAND + 0.05, d1: A.tief - A_WAND - 0.05 })
  for (const ih of innenListe) {
    const A = ih.aufzug
    if (!A || !A.kabine || !A.halte.length) continue
    const h = ih.h
    const tl: LiftTeile = { kabine: null, tueren: null, kabineBasis: null, tuerBasis: null, etage: new Map(), kabineBlaetter: [], ruf: new Map(), fahre: new Map(), rufTreffer: new Map() }
    liftTeile.set(ih, tl)
    const { c0, c1, d0, d1 } = kabinenMass(A)
    ih.lift = {
      steuer: aufzugSteuern({
        halte: A.halte,
        start: h === eigen && A.halte.includes(geschoss) ? geschoss : A.halte[0],
        gh: h.gh,
        bereit: () => !weg && tl.kabine !== null,
        kabineY: (y) => {
          if (tl.kabine) tl.kabine.position.y = y
        },
        etageTueren: (k, auf) => blaetterSetzen(tl.tueren, tl.tuerBasis, tl.etage.get(k) ?? [], auf),
        kabineTueren: (auf) => blaetterSetzen(tl.kabine, tl.kabineBasis, tl.kabineBlaetter, auf),
        leuchten: (k, an) => {
          faerben(tl.tueren, tl.ruf.get(k), an)
          faerben(tl.kabine, tl.fahre.get(k), an)
        },
      }),
      haus: h,
      ebene: (k) => ebeneVon(h.g.id, k),
      welt: rechteckWelt(kp(A.k, c0 + 0.04, d0 + 0.04), kp(A.k, c1 - 0.04, d1 - 0.04)),
    }
    lifts.push(ih.lift)
  }

  /** Kabine, Schachttueren und Knoepfe eines Hauses mit Plaenen bauen. */
  function liftBauen(ih: InnenHaus): void {
    const A = ih.aufzug
    const L = ih.lift
    const tl = liftTeile.get(ih)
    if (!A || !L || !tl) return
    const D = A.k
    const tm = A.breit / 2
    const nr = lifts.indexOf(L)
    const tp = new Puffer()
    const kb = new Puffer()
    const kk = (p: Puffer, t0: number, t1: number, s0: number, s1: number, y0: number, y1: number, c: Color) => kq(p, D, t0, t1, s0, s1, y0, y1, c, null)
    const fluegel: [number, number, number][] = [
      [tm - A_TUER / 2 - 0.01, tm + 0.01, -1],
      [tm - 0.01, tm + A_TUER / 2 + 0.01, 1],
    ]
    const tk = rufT(A)
    for (const k of A.halte) {
      const y = k * ih.h.gh
      const bl: Blatt[] = []
      for (const [t0, t1, r] of fluegel) {
        const start = tp.ecken
        kk(tp, t0, t1, 0.02, 0.06, y, y + A_TUER_H, F.metall)
        kk(tp, t0 + 0.08, t1 - 0.08, 0.015, 0.02, y + 1.2, y + 1.9, F.glasDunkel)
        bl.push({ start, ende: tp.ecken, richtung: [D.u[0] * r, D.u[1] * r], weg: A_TUER / 2 - 0.02 })
      }
      tl.etage.set(k, bl)
      const s = tp.ecken
      kk(tp, tk - 0.03, tk + 0.03, -0.039, -0.015, y + 1.045, y + 1.105, F.knopf)
      tl.ruf.set(k, [s, tp.ecken])
      const m = new Mesh(trefferGeo, trefferMat)
      const pt = kp(D, tk, -0.027)
      m.position.set(pt[0], y + 1.075, pt[1])
      m.rotation.y = drehNach(D.n)
      m.userData = { aufzug: 'ruf', ebene: L.ebene(k), geschoss: k, lift: nr }
      m.name = `aufzugRuf:${ih.h.g.id}:${k}`
      m.updateMatrix()
      m.matrixAutoUpdate = false
      ih.gruppe.add(m)
      knoepfe.push(m)
      tl.rufTreffer.set(k, m)
    }
    // Kabine, gebaut fuer Geschoss 0; das Mesh faehrt mit position.y.
    const { c0, c1, d0, d1 } = kabinenMass(A)
    const kab = (t0: number, t1: number, s0: number, s1: number, y0: number, y1: number, c: Color) => kk(kb, t0, t1, s0, s1, y0, y1, c)
    kab(c0, c1, d0, d1, -0.1, 0, F.platte)
    kab(c0, c0 + 0.04, d0, d1, 0, KAB_H, F.kabine)
    kab(c1 - 0.04, c1, d0, d1, 0, KAB_H, F.kabine)
    kab(c0, c1, d1 - 0.04, d1, 0, KAB_H, F.kabine)
    kab(c0, tm - A_TUER / 2, d0, d0 + 0.04, 0, KAB_H, F.metall)
    kab(tm + A_TUER / 2, c1, d0, d0 + 0.04, 0, KAB_H, F.metall)
    kab(tm - A_TUER / 2, tm + A_TUER / 2, d0, d0 + 0.04, A_TUER_H, KAB_H, F.metall)
    kab(c0, c1, d0, d1, KAB_H, KAB_H + 0.06, F.metall)
    kab(tm - 0.4, tm + 0.4, (d0 + d1) / 2 - 0.3, (d0 + d1) / 2 + 0.3, KAB_H - 0.03, KAB_H, F.licht)
    kab(c0 + 0.2, c1 - 0.2, d1 - 0.06, d1 - 0.04, 0.9, 2.0, F.spiegel)
    kab(c0 + 0.1, c1 - 0.1, d1 - 0.15, d1 - 0.11, 0.88, 0.92, F.gelaender)
    kab(c1 - 0.055, c1 - 0.04, d0 + 0.15, d0 + 0.45, 0.75, 0.9 + A.halte.length * 0.1, F.gelaender)
    const fahrTreffer: Mesh[] = []
    A.halte.forEach((k, i) => {
      const s = kb.ecken
      kab(c1 - 0.079, c1 - 0.055, d0 + 0.27, d0 + 0.33, 0.82 + i * 0.1, 0.88 + i * 0.1, F.knopf)
      tl.fahre.set(k, [s, kb.ecken])
      const m = new Mesh(trefferGeo, trefferMat)
      const pt = kp(D, c1 - 0.067, d0 + 0.3)
      m.position.set(pt[0], 0.85 + i * 0.1, pt[1])
      m.rotation.y = drehNach([-D.u[0], -D.u[1]])
      m.userData = { aufzug: 'fahre', ebene: L.ebene(k), geschoss: k, lift: nr }
      m.name = `aufzugFahre:${ih.h.g.id}:${k}`
      m.updateMatrix()
      m.matrixAutoUpdate = false
      fahrTreffer.push(m)
    })
    for (const [t0, t1, r] of fluegel) {
      const start = kb.ecken
      kab(t0, t1, d0 - 0.04, d0 - 0.01, 0, A_TUER_H, F.metall)
      tl.kabineBlaetter.push({ start, ende: kb.ecken, richtung: [D.u[0] * r, D.u[1] * r], weg: A_TUER / 2 - 0.02 })
    }
    const geoT = tp.bauen()
    if (geoT) {
      geometrien.push(geoT)
      const m = new Mesh(geoT, welt)
      m.name = `aufzugTueren:${ih.h.g.id}`
      m.matrixAutoUpdate = false
      m.updateMatrix()
      ih.gruppe.add(m)
      tl.tueren = m
      tl.tuerBasis = Float32Array.from(geoT.getAttribute('position').array as Float32Array)
    }
    const geoK = kb.bauen()
    if (geoK) {
      geometrien.push(geoK)
      const m = new Mesh(geoK, welt)
      m.name = `kabine:${ih.h.g.id}`
      m.position.y = L.steuer.az.pos * ih.h.gh
      m.updateMatrix()
      for (const x of fahrTreffer) {
        m.add(x)
        knoepfe.push(x)
      }
      ih.gruppe.add(m)
      tl.kabine = m
      tl.kabineBasis = Float32Array.from(geoK.getAttribute('position').array as Float32Array)
    }
    L.steuer.zeigen()
  }

  /* ------------------------------------------------ Innen: Bau und Zonen */

  /** Glas aller Fenster eines Hauses in einem Mesh (durchsichtig). */
  function glasBauen(ih: InnenHaus): void {
    const gp = new Puffer()
    for (const g of ih.geschosse) {
      for (const l of g.loecher) {
        if (l.o.art !== 'fenster') continue
        const w = l.w
        const ta = Math.max(w.t0, l.ta) + 0.05
        const tb = Math.min(w.t1, l.tb) - 0.05
        const unten = g.y + l.o.bruestung + 0.05
        const oben = Math.min(w.y1, g.y + l.o.bruestung + l.o.hoehe) - 0.05
        if (tb - ta < 0.05 || oben - unten < 0.05) continue
        if (trifft(sch, w.k, ta, tb, w.s0, w.s1, unten, oben)) continue
        const c = kp(w.k, (ta + tb) / 2, (w.s0 + w.s1) / 2)
        gp.viereck([c[0], (unten + oben) / 2, c[1]], [w.k.u[0], 0, w.k.u[1]], [0, 1, 0], tb - ta, oben - unten, [w.k.n[0], 0, w.k.n[1]], F.glas)
      }
    }
    const geo = gp.bauen()
    if (!geo) return
    geometrien.push(geo)
    const m = new Mesh(geo, glasMat)
    m.name = `innenGlas:${ih.h.g.id}`
    m.matrixAutoUpdate = false
    m.updateMatrix()
    m.renderOrder = 1
    ih.gruppe.add(m)
  }

  /** Ein Stueck Bau eines Geschosses: zuerst Waende, Oeffnungen, Gelaender
   *  und Schacht; beim naechsten Mal Boeden, Decken, Treppen und Moebel,
   *  dann wird es ein Mesh. So bleibt jedes Stueck klein (ein Bild). */
  function stockSchritt(ih: InnenHaus, k: number): void {
    const g = ih.nachK.get(k)
    if (!g || weg || ih.stock.has(k)) {
      ih.offen = ih.offen.filter((x) => x !== k)
      return
    }
    const t0 = performance.now()
    const A = ih.aufzug
    const fass = fassadeVon(ih.h)
    let p = ih.halb.get(k)
    if (!p) {
      p = new Puffer(32768)
      // Huellkugel aus der Zone des Hauses und dem Geschoss (spart das Durchrechnen).
      const z = ih.zone
      p.kugel = { x: (z[0] + z[2]) / 2, y: g.y + ih.h.gh / 2, z: (z[1] + z[3]) / 2, r: Math.hypot(z[2] - z[0], z[3] - z[1], ih.h.gh + 1) / 2 }
      for (const w of g.waende) wandBauen(p, w, g.y, fass)
      for (const l of g.loecher) lochBauen(p, l, g.y)
      for (const r of g.raender) kq(p, r.k, r.t0, r.t1, -0.03, 0.01, g.y - DECKE, g.y, fass, sch)
      for (const gl of g.gelaender) bruestungBauen(p, gl.k, gl.t0, gl.t1, -0.06, g.y)
      if (A && A.halte.includes(k)) schachtBauen(p, A, k, ih.h.gh)
      ih.halb.set(k, p)
      ih.ms.set(k, performance.now() - t0)
      return
    }
    for (const f of g.flaechen) {
      if (f.weg) continue
      bodenLegen(p, f, g)
      deckeLegen(p, f, g, ih)
      if (f.art === 'stiege') treppeBauen(p, f, g, ih)
      else if (f.art === 'aufzug' && !(A && A.halte.includes(k) && innen(mitteVon(f.poly), kastenPoly(A)))) {
        // Ein zweiter Schacht: rundum zu.
        const b = kastenAn(f)
        for (const [ta, tb, sa, sb] of [
          [0, b.L, 0, A_WAND],
          [0, b.L, b.B - A_WAND, b.B],
          [0, A_WAND, A_WAND, b.B - A_WAND],
          [b.L - A_WAND, b.L, A_WAND, b.B - A_WAND],
        ])
          kq(p, b.k, ta, tb, sa, sb, g.y, g.y + ih.h.gh, F.wand, sch)
      }
    }
    for (const w of g.wohnungen) if (!w.weg) for (const m of w.moebel) moebelBauen(p, m, g.y, ih.h.gh)
    const geo = p.bauen()
    ih.halb.delete(k)
    ih.offen = ih.offen.filter((x) => x !== k)
    let mesh: Mesh | null = null
    if (geo) {
      geometrien.push(geo)
      mesh = new Mesh(geo, welt)
      mesh.name = `innen:${ih.h.g.id}:${k}`
      mesh.matrixAutoUpdate = false
      mesh.updateMatrix()
      mesh.userData = { haus: ih.h.g.id, geschoss: k, waende: g.waende.length, loecher: g.loecher.length, ms: (ih.ms.get(k) ?? 0) + performance.now() - t0 }
      ih.gruppe.add(mesh)
    }
    ih.stock.set(k, mesh)
  }

  /** Wo die Kamera ist (Welt und lokal); null: unbekannt oder Rundumsicht. */
  let kam: { x: number; z: number; lx: number; lz: number; ly: number } | null = null
  /** Das Haus, in dem die Kamera gerade ist. */
  let drinnen: InnenHaus | null = null
  /** Geschoss eines Hauses zur Augenhoehe ly (lokal). */
  const stockVon = (ih: InnenHaus, ly: number) => Math.max(0, Math.min(ih.h.n - 1, Math.floor((ly + 0.5) / ih.h.gh)))
  const inZone = (ih: InnenHaus, p: P, ly: number) => {
    const z = ih.zone
    if (p[0] < z[0] || p[0] > z[2] || p[1] < z[1] || p[1] > z[3]) return false
    if (ly < -1.5 || ly > ih.h.H + 1.5) return false
    return innen(p, ih.h.poly) || abstandUmriss(p, ih.h.poly) < ZONE_RAND || (ly < ih.h.gh && ih.vorne.some((v) => innen(p, v))) || ih.anbau.some((a) => innen(p, a))
  }
  /** Was als Naechstes gebaut wird: ein halb gebautes Geschoss fertig, dann
   *  das der Kamera, dann Glas und Aufzug, dann die uebrigen (nah zuerst). */
  const naechstes = (ih: InnenHaus, k: number): number | 'teile' | null => {
    for (const x of ih.halb.keys()) return x
    if (ih.offen.includes(k)) return k
    if (!ih.teile) return 'teile'
    if (!ih.offen.length) return null
    return ih.offen.reduce((b, x) => (Math.abs(x - k) < Math.abs(b - k) ? x : b), ih.offen[0])
  }
  /** Innen zeigen, wo die Kamera ist (die Huelle dort weg), sonst Huellen.
   *  Umgeschaltet wird, sobald das Geschoss der Kamera fertig ist. */
  const zeigen = () => {
    for (const ih of innenListe) {
      let an = false
      if (ih === drinnen && kam) {
        const k = stockVon(ih, kam.ly)
        an = ih.gruppe.visible || (ih.nachK.has(k) ? ih.stock.has(k) : ih.stock.size > 0)
      }
      ih.gruppe.visible = an
      if (ih.huelleMesh) ih.huelleMesh.visible = !an
      // Rufknoepfe nur im Geschoss der Kamera antippbar.
      const tl = liftTeile.get(ih)
      if (tl) {
        const k = an && kam ? stockVon(ih, kam.ly) : -1
        for (const [kk, m] of tl.rufTreffer) m.visible = kk === k
      }
    }
  }
  /** Die Kamera (Weltmeter) beim Begehen, jedes Bild; NaN: nicht beim
   *  Begehen (Rundumsicht), dann nur Huellen. Baut nichts selbst: das
   *  macht schritt() Stueck fuer Stueck, das Geschoss der Kamera zuerst. */
  const kamera = (x: number, y: number, z: number): void => {
    if (weg) return
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
      kam = null
      drinnen = null
      zeigen()
      return
    }
    const pl = nachLokal([x, z])
    const ly = y + absenk
    kam = { x, z, lx: pl[0], lz: pl[1], ly }
    let neu: InnenHaus | null = null
    let nah = Infinity
    for (const ih of innenListe) {
      if (!inZone(ih, pl, ly)) continue
      const d = innen(pl, ih.h.poly) ? 0 : abstandUmriss(pl, ih.h.poly)
      if (d < nah) {
        nah = d
        neu = ih
      }
    }
    drinnen = neu
    zeigen()
  }

  /** Der Aufzug, in dessen Kabine die Kamera steht; ohne Kamera der erste. */
  const liftJetzt = (): Lift | null => {
    if (!kam) return lifts[0] ?? null
    for (const L of lifts) {
      const r = L.welt
      if (!r || kam.x < r[0] || kam.x > r[2] || kam.z < r[1] || kam.z > r[3]) continue
      const boden = L.steuer.az.pos * L.haus.gh
      if (kam.ly > boden - 0.5 && kam.ly < boden + 2.6) return L
    }
    return null
  }
  const schritt = (dtRoh: number, _kameraY: number): boolean => {
    if (weg) return false
    let unruhig = false
    for (const L of lifts) if (L.steuer.schritt(dtRoh)) unruhig = true
    // Weiterbauen, solange das naechste Stueck (so lange wie das letzte)
    // noch in BAU_MS passt; wenigstens eins je Bild.
    const ih = drinnen
    if (ih) {
      const k = kam ? stockVon(ih, kam.ly) : 0
      const t0 = performance.now()
      let zuletzt = 0
      let was = naechstes(ih, k)
      while (was !== null) {
        const t1 = performance.now()
        if (was === 'teile') {
          ih.teile = true
          glasBauen(ih)
          liftBauen(ih)
        } else stockSchritt(ih, was)
        zuletzt = performance.now() - t1
        was = naechstes(ih, k)
        if (performance.now() - t0 + zuletzt >= BAU_MS) break
      }
      if (was !== null) unruhig = true
      zeigen()
    }
    return unruhig
  }
  const fahrt = (): { ziel: number; y: number } | null => {
    if (weg) return null
    const L = liftJetzt()
    const f = L ? L.steuer.fahrt() : null
    return L && f ? { ziel: L.ebene(f.ziel), y: f.pos * L.haus.gh - absenk } : null
  }
  const interaktiv: Interaktiv3D | null = lifts.length
    ? {
        objekte: knoepfe,
        tippen(o3: Object3D) {
          if (weg) return
          const d = o3.userData as { aufzug?: string; geschoss?: number; lift?: number }
          if ((d.aufzug === 'ruf' || d.aufzug === 'fahre') && typeof d.geschoss === 'number') lifts[d.lift ?? 0]?.steuer.anfordern(d.geschoss)
        },
      }
    : null

  /* ------------------------------------------------ Sprungziele */
  const sprungziele: Sprungziel3D[] = []
  const zielVon =(name: string, ebene: number, p: P, blick: P): Sprungziel3D => {
    const w = nachWelt(p)
    const d = richtungWelt(blick)
    return { name, ebene, x: w[0], z: w[1], gier: Math.atan2(-d[0], -d[1]) }
  }
  const ziel = (name: string, ebene: number, p: P, blick: P) => {
    if (ebene < 0 || ebene >= ebenen.length) return
    sprungziele.push(zielVon(name, ebene, p, blick))
  }
  // Jede Wohnung mit Eingang: vor ihrer Tuer, mit Blick zur Tuer.
  for (const ih of innenListe) {
    for (const g of ih.geschosse) {
      for (const w of g.wohnungen) {
        if (!w.eingang) continue
        const name = `${w.top}, ${ogName(g.k)}`
        const e = ebeneVon(ih.h.g.id, g.k)
        let raus: P
        let mitte: P
        if (w.tuer) {
          raus = w.tuer.raus
          mitte = [(w.tuer.a[0] + w.tuer.b[0]) / 2, (w.tuer.a[1] + w.tuer.b[1]) / 2]
        } else {
          // Ohne Tuer dort: am Eingang, vor der naechsten Wand der Wohnung.
          let beste = Infinity
          raus = [0, 1]
          for (const i of w.flaechen) {
            for (const kn of g.flaechen[i].kanten) {
              const d = abstandStrecke(w.eingang, kn.a, kp(kn, kn.laenge, 0))
              if (d < beste) {
                beste = d
                raus = kn.n
              }
            }
          }
          mitte = w.eingang
        }
        ziel(name, e, [mitte[0] + raus[0] * SPRUNG_TUER, mitte[1] + raus[1] * SPRUNG_TUER], [-raus[0], -raus[1]])
      }
    }
  }
  // Jedes Haus: vor der Haustuer (mit Plaenen die echte, sonst vor dem Aufzug).
  const hausEingang = (h: Haus): void => {
    const name = `Eingang ${hausName(h)}`
    const ih = innenNach.get(h.g.id)
    if (ih) {
      const l = ih.nachK.get(0)?.haustueren[0]
      const A = ih.aufzug
      if (l) {
        const m = kp(l.w.k, (l.ta + l.tb) / 2, 0)
        const n = l.w.k.n
        ziel(name, 0, [m[0] + n[0] * SPRUNG_HAUS, m[1] + n[1] * SPRUNG_HAUS], [-n[0], -n[1]])
        return
      }
      if (A && A.halte.includes(0)) {
        ziel(name, 0, kp(A.k, A.breit / 2, -1.2), A.k.n)
        return
      }
    }
    if (h === eigen && gang && mitKern) {
      ziel(name, ebeneVon(h.g.id, 0), kp(gang, kt(1.15), 0.5), gang.n)
      return
    }
    const e = eingangSprung.get(h.g.id)
    if (e) ziel(name, draussenIndex, e.p, e.blick)
  }
  /** Index des Sprungziels vor der Haustuer, je Haus mit einem. */
  const eingangIndex = new Map<Haus, number>()
  for (const h of haeuser) {
    const vorher = sprungziele.length
    hausEingang(h)
    if (sprungziele.length > vorher) eingangIndex.set(h, vorher)
  }
  // Der Spielplatz: an seinem Rand, der der Siedlung am naechsten liegt.
  if (spielPoly) {
    const mitte = innenPunkt(spielPoly)
    const cx = (bx0 + bx1) / 2
    const cz = (bz0 + bz1) / 2
    const draussen = ebenen[gartenIndex]
    const reihe = kantenVon(spielPoly)
      .filter((k) => k.laenge >= 1)
      .map((k) => ({ k, d: Math.hypot(kp(k, k.laenge / 2, 0)[0] - cx, kp(k, k.laenge / 2, 0)[1] - cz) }))
      .sort((a1, b1) => a1.d - b1.d)
    for (const { k } of reihe) {
      const p = kp(k, k.laenge / 2, 1.2)
      if (haeuser.some((h) => innen(p, h.poly))) continue
      const w = nachWelt(p)
      if (!draussen.hindernisse.every((hd) => hindernisAbstand(hd, w[0], w[1]) > 0.35)) continue
      const d = Math.hypot(mitte[0] - p[0], mitte[1] - p[1]) || 1
      ziel('Spielplatz', draussenIndex, p, [(mitte[0] - p[0]) / d, (mitte[1] - p[1]) / d])
      break
    }
  }
  // Start (E86), immer zuerst: vor der Haustuer des Hauses der Wohnung,
  // sonst des ersten Hauses mit Eingang, sonst auf dem Gehsteig vor der
  // Mitte der Siedlung mit Blick zu ihr. Haengt nicht am Rahmen.
  {
    const i = (eigen ? eingangIndex.get(eigen) : undefined) ?? haeuser.map((h) => eingangIndex.get(h)).find((x) => x !== undefined)
    const start =
      i !== undefined
        ? { ...sprungziele[i], name: 'Start' }
        : zielVon('Start', draussenIndex, kp(sk, lmitte, strasseQ0 + GEHSTEIG / 2), [-q[0], -q[1]])
    sprungziele.unshift(start)
  }
  /* Die eigene Wohnung (E87): ohne Rahmen ein freies Ziel in der geplanten
   * (leeren) Wohnung, in der siedlung.wohnung liegt, hinten an. Mit Plaenen
   * die Wohnung des Plans, in der der Ursprung der eigenen liegt (0,4 m
   * hinein; sonst die naechste bis 3 m), dort der groesste Raum; ohne Plaene
   * ein Punkt im Haus nahe dem Ursprung. Der Plan der eigenen Wohnung liegt
   * in der Welt am Ursprung, Planmeter sind Weltmeter. */
  let eigeneWohnung: number | null = null
  if (eigen && !rahmenLokal) {
    const ei = ebeneVon(eigen.g.id, geschoss)
    const E = ebenen[ei]
    const freiIn = (p: P) => {
      const w = nachWelt(p)
      return !!E && E.hindernisse.every((hd) => hindernisAbstand(hd, w[0], w[1]) > 0.35)
    }
    const ecke = nachLokal([0.4, 0.4])
    const g = eigenInnen?.nachK.get(geschoss) ?? null
    let ziel: { p: P; blick: P; name: string } | null = null
    if (g) {
      const abstandW = (w: IWohnung) => Math.min(...w.flaechen.map((i) => (innen(ecke, g.flaechen[i].poly) ? 0 : abstandUmriss(ecke, g.flaechen[i].poly))))
      const reihe = g.wohnungen.map((w) => ({ w, d: abstandW(w) })).filter((x) => x.d <= 3).sort((a1, b1) => a1.d - b1.d)
      const w = reihe[0]?.w
      if (w) {
        const raeume = w.flaechen.map((i) => g.flaechen[i]).filter((f) => f.art === 'innen').sort((a1, b1) => Math.abs(flaecheVon(b1.poly)) - Math.abs(flaecheVon(a1.poly)))
        const tuer: P | null = w.tuer ? [(w.tuer.a[0] + w.tuer.b[0]) / 2, (w.tuer.a[1] + w.tuer.b[1]) / 2] : null
        for (const f of raeume) {
          const m = innenPunkt(f.poly)
          const [x0, z0, x1, z1] = f.r
          const stellen: P[] = [m]
          for (let x = x0 + 0.4; x <= x1 - 0.4; x += 0.4) for (let z = z0 + 0.4; z <= z1 - 0.4; z += 0.4) stellen.push([x, z])
          stellen.sort((a1, b1) => Math.hypot(a1[0] - m[0], a1[1] - m[1]) - Math.hypot(b1[0] - m[0], b1[1] - m[1]))
          const p = stellen.find((s) => innen(s, f.poly) && abstandUmriss(s, f.poly) >= 0.4 && freiIn(s))
          if (!p) continue
          const weg0: P = tuer ? [p[0] - tuer[0], p[1] - tuer[1]] : [0, -1]
          const lw = Math.hypot(weg0[0], weg0[1]) || 1
          ziel = { p, blick: [weg0[0] / lw, weg0[1] / lw], name: `${w.top}, ${ogName(geschoss)}, innen` }
          break
        }
      }
    }
    // Ohne Plaene (oder keine Wohnung des Plans dort): im Haus nahe dem Ursprung.
    if (!ziel) {
      const m = innenPunkt(eigen.poly)
      const stellen: [number, number][] = []
      for (let x = 0.5; x <= 12; x += 0.5) for (let z = 0.5; z <= 12; z += 0.5) stellen.push([x, z])
      stellen.sort((a1, b1) => Math.hypot(a1[0] - 2, a1[1] - 2) - Math.hypot(b1[0] - 2, b1[1] - 2))
      for (const s of stellen) {
        const p = nachLokal(s)
        if (!innen(p, eigen.poly) || abstandUmriss(p, eigen.poly) < 0.6 || !freiIn(p)) continue
        const d: P = [m[0] - p[0], m[1] - p[1]]
        const ld = Math.hypot(d[0], d[1]) || 1
        ziel = { p, blick: ld > 0.01 ? [d[0] / ld, d[1] / ld] : [0, -1], name: `Wohnung, ${ogName(geschoss)}, innen` }
        break
      }
    }
    if (ziel && E) {
      sprungziele.push(zielVon(ziel.name, ei, ziel.p, ziel.blick))
      eigeneWohnung = sprungziele.length - 1
    }
  }
  // Die Orte der Stadt, auf der Ebene des Bodens (E87).
  if (stadt) for (const s of stadt.sprungziele) sprungziele.push({ ...s, ebene: 0 })

  /* ------------------------------------------------ Karte (E86) */
  /* Fuer die Minikarte: jedes Haus mit Namen und die Flaechen, zuerst lokal
   * gesammelt, in der Reihenfolge zum Malen. Der Rahmen umfasst alles
   * ausser der Laenge der Strasse (sie laeuft 400 m), dazu ihr Band quer,
   * und 5 m Rand; danach laeuft die Strasse genau ueber die Breite der
   * Karte. Nichts davon haengt an wohnungRahmen. */
  type KartenArt = Karte3D['flaechen'][number]['art']
  const karteLokal: { art: KartenArt; punkte: P[] }[] = []
  for (const f of karteAsphalt) karteLokal.push({ art: 'strasse', punkte: f })
  for (const ih of innenListe) {
    for (const f of ih.nachK.get(0)?.flaechen ?? []) if (f.art === 'draussen') karteLokal.push({ art: 'garten', punkte: f.poly })
  }
  // Wege mit Puffer je Seite; an Knicken um den Puffer verlaengert (keine
  // Kerbe), an den freien Enden buendig.
  for (const w of wege) {
    for (let i = 0; i + 1 < w.length; i++) {
      const k = kanteVon(w[i], w[i + 1])
      if (k.laenge < 0.05) continue
      const t0 = i > 0 ? -KARTE_WEG : 0
      const t1 = k.laenge + (i + 2 < w.length ? KARTE_WEG : 0)
      karteLokal.push({ art: 'weg', punkte: rechteckForm({ k, t0, t1, s0: -KARTE_WEG, s1: KARTE_WEG }) })
    }
  }
  for (const f of karteWege) karteLokal.push({ art: 'weg', punkte: f })
  if (spielPoly) karteLokal.push({ art: 'spielplatz', punkte: spielPoly })
  /** Die Strasse ueber die Breite des Kastens r (lokal; l ist eine Achse). */
  const strasseIn = (r: Kasten): P[] => {
    const t = [r[0] * l[0] + r[1] * l[1], r[2] * l[0] + r[3] * l[1]]
    return rechteckForm({ k: sk, t0: Math.min(...t), t1: Math.max(...t), s0: strasseQ0, s1: strasseQ1 })
  }
  let kr = kastenVon([...alle, ...karteLokal.flatMap((f) => f.punkte)])
  // Mit Stadt (E87) gibt es die eigene Strasse nicht; die Stadt bringt die echten.
  if (!stadtDa) kr = kastenVon([[kr[0], kr[1]], [kr[2], kr[3]], ...strasseIn(kr)])
  kr = [kr[0] - KARTE_RAND, kr[1] - KARTE_RAND, kr[2] + KARTE_RAND, kr[3] + KARTE_RAND]
  if (!stadtDa) karteLokal.unshift({ art: 'strasse', punkte: strasseIn(kr) })
  const karte: Karte3D = {
    rahmen: rechteckWelt([kr[0], kr[1]], [kr[2], kr[3]]),
    haeuser: haeuser.map((h) => ({ name: hausName(h), punkte: h.poly.map(nachWelt) })),
    flaechen: karteLokal.map((f) => ({ art: f.art, punkte: f.punkte.map(nachWelt) })),
  }
  // Mit Stadt: ihr Rahmen dazu, ihre Haeuser dahinter, ihre Flaechen
  // davor (zuerst gemalt), ihre Strassen und Orte.
  if (stadt) {
    const sr = stadt.karte.rahmen
    if (Array.isArray(sr) && sr.length === 4 && sr.every(Number.isFinite) && sr[2] > sr[0] && sr[3] > sr[1]) {
      const r = karte.rahmen
      karte.rahmen = [Math.min(r[0], sr[0]), Math.min(r[1], sr[1]), Math.max(r[2], sr[2]), Math.max(r[3], sr[3])]
    }
    karte.haeuser = [...karte.haeuser, ...stadt.karte.haeuser]
    karte.flaechen = [...stadt.karte.flaechen, ...karte.flaechen]
    karte.strassen = [...(stadt.karte.strassen ?? [])]
    karte.orte = [...(stadt.karte.orte ?? [])]
  }

  /* ------------------------------------------------ Stadt abgleichen (E87) */
  /* Die Stadt laedt Haeuser innen nach (version() zaehlt hoch): dann die
   * Hindernisse am Boden (eigene und ihre), ihre Ebenen hinter den eigenen
   * (am selben Index ersetzt, neue hinten an), Treppen, Fahrzeuge und Dinge
   * neu, und die eigene version() zaehlt hoch. */
  const bodenEigen = bodenEbenen.map((i) => ebenen[i].hindernisse)
  const meineEbenen = ebenen.length
  let stadtStand: number | null = null
  let stand = 0
  let treppenJetzt: Treppe3D[] = meineTreppen
  let fahrzeugeJetzt: Fahrzeug3D[] = meineFahrzeuge
  let dingeJetzt: WeltDing3D[] = meineDinge
  /** Die Hindernisse der Stadt beim letzten Abgleich (dasselbe Feld: nichts neu). */
  let stadtHindernisse: Hindernis3D[] | null = null
  /** eigeneDazu beim letzten Abgleich (dingErzeugen, E87b). */
  let eigeneStand = 0
  if (stadt) for (const i of bodenEbenen) ebenen[i].hoehe = stadt.hoehe
  const abgleichen = (): void => {
    if (weg) return
    let dingeNeu = false
    if (eigeneDazu !== eigeneStand) {
      eigeneStand = eigeneDazu
      dingeNeu = true
      stand++
    }
    if (stadt) {
      const v = stadt.version()
      if (v !== stadtStand) {
        const erstes = stadtStand === null
        stadtStand = v
        // Am Boden nur dann ein neues Feld, wenn die Stadt eins hat: der Motor
        // rastert eine Ebene neu, sobald ihr Feld ein anderes ist (zehntausende
        // Rechtecke), und die Stadt behaelt ihres (Tueren bleiben Hindernisse).
        const sh = stadt.hindernisse()
        if (sh !== stadtHindernisse) {
          stadtHindernisse = sh
          bodenEbenen.forEach((i, j) => {
            ebenen[i].hindernisse = bodenEigen[j].concat(sh)
          })
        }
        const se = stadt.ebenen()
        for (let i = 0; i < se.length; i++) ebenen[meineEbenen + i] = se[i]
        treppenJetzt = meineTreppen.concat(stadt.treppen())
        fahrzeugeJetzt = meineFahrzeuge.concat(stadt.fahrzeuge())
        dingeNeu = true
        if (!erstes) stand++
      }
    }
    if (dingeNeu) dingeJetzt = stadt ? meineDinge.concat(stadt.dinge()) : meineDinge
  }
  abgleichen()

  /* ------------------------------------------------ Rahmen der Siedlung (E87b) */
  /* Weltmeter <-> Siedlungsmeter (x Osten, z Sueden wie die Daten, y ueber
   * dem Boden der Siedlung = 0, gier wie Pose3D): unabhaengig davon, wo die
   * Wohnung liegt (x, z, drehung, geschoss) oder ob es eine gibt. So
   * speichert siedlung_dinge Lagen, die ein geaenderter Rahmen nicht
   * verschiebt. Winkel kommen in (-pi, pi]. */
  const winkelNorm = (a: number): number => {
    let w = a % (2 * Math.PI)
    if (w <= -Math.PI) w += 2 * Math.PI
    else if (w > Math.PI) w -= 2 * Math.PI
    return w
  }
  const rahmenSiedlung: SiedlungRahmen = {
    zuSiedlung(x: number, y: number, z: number, gier: number): [number, number, number, number] {
      const p = nachLokal([x, z])
      return [p[0], y + absenk, p[1], winkelNorm(gier - rad)]
    },
    zuWelt(x: number, y: number, z: number, gier: number): [number, number, number, number] {
      const p = nachWelt([x, z])
      return [p[0], y - absenk, p[1], winkelNorm(gier + rad)]
    },
  }

  gruppe.userData = {
    baeume,
    hecken,
    parkplaetze,
    autos,
    nachbarn,
    spielgeraete,
    strasse: seite.name,
    kern: !!kabineMesh,
    innen: innenListe.length,
    // E87
    treppen: meineTreppen.length,
    fahrzeuge: meineFahrzeuge.length,
    dinge: meineDinge.length,
    stadt: stadtDa,
    innenFehler,
    fahrzeugFehler,
  }

  const ergebnis: SiedlungWelt3D = {
    gruppe,
    nebel: stadtDa ? new Fog(o.farben.himmelUnten, NEBEL_STADT_NAH, NEBEL_STADT_FERN) : new Fog(o.farben.himmelUnten, NEBEL_NAH, NEBEL_FERN),
    himmel: o.farben.himmelUnten,
    ebenen,
    interaktiv,
    sprungziele,
    karte,
    schritt(dt: number, kameraY: number): boolean {
      const a = schritt(dt, kameraY)
      const b = stadt && !weg ? stadt.schritt(dt) : false
      abgleichen()
      return a || b
    },
    fahrt,
    kamera(x: number, y: number, z: number): void {
      kamera(x, y, z)
      if (stadt && !weg) stadt.kamera(x, y, z)
    },
    eigeneWohnung,
    get treppen() {
      abgleichen()
      return treppenJetzt
    },
    get fahrzeuge() {
      abgleichen()
      return fahrzeugeJetzt
    },
    get dinge() {
      abgleichen()
      return dingeJetzt
    },
    version() {
      abgleichen()
      return stand
    },
    dingErzeugen(id: string): WeltDing3D | null {
      if (weg || typeof id !== 'string') return null
      abgleichen()
      const da = dingeJetzt.find((d) => d.id === id)
      if (da) return da
      let neu: WeltDing3D | null = null
      try {
        if (id.startsWith('siedlung:')) neu = eigenesDing(id)
        else if (stadt) neu = stadt.dingErzeugen(id)
      } catch (e) {
        console.error(`[siedlung] Ding ${id} nicht gebaut:`, e)
        return null
      }
      abgleichen()
      return neu
    },
    rahmen: rahmenSiedlung,
    stadtFehler,
    get kabine() {
      if (weg) return null
      const L = liftJetzt()
      if (L) return L.welt
      if (!kam) return null
      // Sonst die naechste Kabine.
      const k = kam
      let beste: Lift | null = null
      let d = Infinity
      for (const x of lifts) {
        if (!x.welt) continue
        const dd = Math.hypot((x.welt[0] + x.welt[2]) / 2 - k.x, (x.welt[1] + x.welt[3]) / 2 - k.z)
        if (dd < d) {
          d = dd
          beste = x
        }
      }
      return beste ? beste.welt : null
    },
    dispose() {
      if (weg) return
      weg = true
      himmelMesh.onBeforeRender = () => undefined
      stadt?.dispose()
      for (const f of meineFahrzeuge) f.dispose()
      for (const g of geometrien) g.dispose()
      for (const m of materialien) m.dispose()
      kabineMesh?.clear()
      for (const ih of innenListe) {
        liftTeile.get(ih)?.kabine?.clear()
        ih.gruppe.clear()
        ih.stock.clear()
        ih.halb.clear()
        ih.offen = []
      }
      drinnen = null
      lage.clear()
      gruppe.clear()
      ANKUENFTE.delete(ergebnis)
    },
  }
  ANKUENFTE.set(ergebnis, () => {
    if (weg) return null
    const L = liftJetzt()
    // Ankuenfte anderer Aufzuege verfallen (dort ist die Kamera nicht).
    for (const x of lifts) if (x !== L) x.steuer.ankunft()
    const a1 = L ? L.steuer.ankunft() : null
    return L && a1 !== null ? L.ebene(a1) : null
  })
  return ergebnis
}

/** Abstand eines Punkts (Welt) zu einem Hindernis (gedrehtes Rechteck). */
function hindernisAbstand(h: Hindernis3D, x: number, z: number): number {
  const ux = Math.cos(h.drehY)
  const uz = -Math.sin(h.drehY)
  const dx = x - h.x
  const dz = z - h.z
  const a = dx * ux + dz * uz
  const b = -dx * uz + dz * ux
  return Math.hypot(Math.max(0, Math.abs(a) - h.laenge / 2), Math.max(0, Math.abs(b) - h.tiefe / 2))
}

/** Kleinste Kantenlaenge der Wiesenzellen (Meter). */
const ZELLE_MIN = 2.5

/** Vorlage aus einer einzelnen Geometrie (wird danach freigegeben). */
function vorlageAusGeo(geo: BufferGeometry): Vorlage {
  const g = geo.index ? geo.toNonIndexed() : geo
  if (g !== geo) geo.dispose()
  const lage = g.getAttribute('position').array as Float32Array
  const richtung = g.getAttribute('normal').array as Float32Array
  let y0 = Infinity
  let y1 = -Infinity
  for (let i = 1; i < lage.length; i += 3) {
    y0 = Math.min(y0, lage[i])
    y1 = Math.max(y1, lage[i])
  }
  const v = { lage: Float32Array.from(lage), richtung: Float32Array.from(richtung), y0, y1 }
  g.dispose()
  return v
}

/** Grenzen eines Vielecks als Kasten (x0, z0, x1, z1). */
function kastenVon(poly: P[]): [number, number, number, number] {
  const xs = poly.map((p) => p[0])
  const zs = poly.map((p) => p[1])
  return [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)]
}

/** Himmelskugel mit Radius r: Farbe nach der Hoehe, am Horizont schnell heller. */
function himmelKugel(oben: Color, unten: Color, r: number): BufferGeometry {
  const g = new SphereGeometry(r, 32, 24)
  g.deleteAttribute('uv')
  g.deleteAttribute('normal')
  const pos = g.getAttribute('position')
  const col = new Float32Array(pos.count * 3)
  const c = new Color()
  for (let i = 0; i < pos.count; i++) {
    const t = Math.max(0, pos.getY(i) / r)
    c.copy(unten).lerp(oben, 1 - (1 - t) ** 2.4)
    col[i * 3] = c.r
    col[i * 3 + 1] = c.g
    col[i * 3 + 2] = c.b
  }
  g.setAttribute('color', new BufferAttribute(col, 3))
  return g
}
