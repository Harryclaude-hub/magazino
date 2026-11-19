/* Fahren (E87): Fahrphysik fuer Auto, Kombi, Transporter, Feuerwehr,
 * Rettung, Polizei und Bus als reine Rechnung, ohne three, damit Node sie
 * pruefen kann (scripts/fahren-pruefen.mjs).
 *
 * Arcade, nicht Simulation: Gas, Bremse und Lenkung greifen sofort und
 * gutmuetig, aber mit echten Groessen (Meter, Sekunden, km/h).
 *  - Laengs: Beschleunigung je Art, oben weicher (bei Hoechsttempo noch die
 *    Haelfte); Bremse (Leertaste) bremst voll; Gas gegen die Fahrtrichtung
 *    bremst erst und faehrt dann rueckwaerts; ohne Gas rollt der Wagen aus.
 *    Hoechsttempo ist die Art (hoechstKmh), hoechstens eine Grenze (Vorgabe
 *    60 km/h). Am Hang zieht die Schwerkraft gedaempft mit.
 *  - Quer: Einspurmodell (Fahrrad): der Wagen dreht um die Mitte der
 *    Hinterachse, Radstand rund 0,6 x Laenge, Lenkeinschlag hoechstens
 *    0,6 rad (Bus 0,7), mit dem Tempo kleiner (Querbeschleunigung begrenzt).
 *  - Zusammenstoss: der Wagen ist ein gedrehtes Rechteck (Laenge x Breite).
 *    Es wird in Teilschritten von hoechstens 8 cm bewegt (auch die Ecken
 *    beim Drehen) und nach jedem aus den Rechtecken des Rasters
 *    (kollision.ts, Hindernisse) geschoben, entlang der Achse mit der
 *    kleinsten Ueberlappung (Trennachsen). So rutscht auch mit 25 m/s nichts
 *    durch eine 30-cm-Wand, und an schraegen Waenden gleitet der Wagen
 *    entlang und dreht sich dabei zur Wand. Frontal prallt er zurueck
 *    (v mal -0,2), schraeg verliert er nur den Anteil gegen die Wand.
 *    Bordsteine und alles bis 25 cm (Hindernis3D.oben) halten nicht auf:
 *    fahrHindernisse() laesst sie beim Bauen des Rasters weg.
 *    Warum Rechteck statt drei Kreisen: Kreise mit halber Breite schneiden
 *    die Ecken um rund 37 cm ab; beim Einparken sah man den Wagen in der Wand.
 *
 * ANSCHLUSS AN DEN MOTOR (motor.ts, seit E87 so gebaut; fahrzeug3d.ts baut
 * die Modelle):
 *  1. Einsteigen (Taste E, Knopf, Tipp aufs Fahrzeug): unter den
 *     Fahrzeugen der Welt auf der Ebene, auf der man steht, das mit dem
 *     kleinsten tuerAbstand(f, zust, x, z) <= EINSTEIGEN_M; zust ist die
 *     Lage, die der Motor fuehrt (Fahrzeug3D.x, z, gier gelten nur beim
 *     Bauen). Ding in der Hand vorher ablegen.
 *       werte = fahrWerte(f.art, min(GRENZE_KMH, f.hoechstKmh))
 *       raster = das Raster des Gehens der Ebene (kollision.ts): es haelt
 *                nur auf, was hoeher als BORDSTEIN_M ist, wie ein Raster
 *                aus fahrHindernisse(); so muss beim Einsteigen nichts neu
 *                gerastert werden (eine Stadt hat Zehntausende Rechtecke).
 *       dazu   = die anderen Fahrzeuge der Ebene als kleines eigenes
 *                Raster (fahrzeugHindernis), ohne das eigene.
 *     Die eigene Figur ausblenden, Pose3D.lenkt setzen.
 *  2. Jedes Bild beim Fahren (statt gehSchritt):
 *       eingabe.gas    = W/S (+1/-1) plus Knueppel y (vor = +)
 *       eingabe.lenk   = D/A (+1/-1) plus Knueppel x (rechts = +)
 *       eingabe.bremse = Leertaste (Springen gibt es im Wagen nicht)
 *       fahrSchritt(zust, eingabe, werte, dt, raster, boden, erg, dazu)
 *         boden(x, z) = ebene.y + (ebene.hoehe?.(x, z) ?? 0)   (Welt)
 *       lageAnwenden(f.gruppe, zust); raederStellen(f.raeder, zust, werte)
 *       erg.stoss > 0: Aufprall, die Kamera wackelt kurz.
 *     Kamera innen: fahrerSicht(zust, f.fahrerAuge, sicht), dazu das
 *       Umschauen (g, n) des Fahrers; Sichtfeld FAHR_FOV_INNEN (danach
 *       zurueck).
 *     Kamera hinten: verfolgen(kam, zust, werte, dt, raster, boden) mit dem
 *       Raster des Gehens (es zaehlt nur, was hoeher als KAMERA_HINDERNIS_M
 *       ist); Umschauen dreht die Kamera um den Wagen. Beim Wechsel der
 *       Sicht und beim Einsteigen kam.an = false.
 *     Faehrt der Wagen, kehrt das Umschauen weich nach vorne zurueck.
 *     Motor.fahrzeug() hoechstens 5-mal je Sekunde mit kmh =
 *     Math.round(tempoKmh(zust)). Pose3D: Augen des Fahrers, lenkt =
 *     { id, x: zust.x, y: zust.y, z: zust.z, gier: zust.gier }.
 *     Leute zu Fuss sind kein Hindernis fuer das Fahren (sie weichen aus).
 *  3. Aussteigen (Taste E): aussteigenSuchen() mit frei = Raster des Gehens
 *     und alle Fahrzeuge (auch das eigene), weg = gehen von innen ohne
 *     Wand. Gefunden: dort stehen, bewegt() mit { id, art: 'fahrzeug', x,
 *     y, z, gier, ebene } aus zust; sonst sitzen bleiben (Warnung).
 *  4. Fremde Fahrzeuge (Pose3D.lenkt anderer Leute): Lage weich setzen,
 *     fahrBoden() fuer Hoehe und Neigung, Raeder mit radDrehen mitdrehen.
 *  5. Taste B: f.blaulicht?.(!an); Taste V: Sicht innen/hinten.
 *
 * Keine Allokation je Bild: Zustand, Ergebnis und Kamera sind Objekte, die
 * der Aufrufer einmal anlegt und weiterreicht. */
import { Hindernisse } from './kollision.ts'
import { STUFE_M, type FahrzeugArt } from './vertrag3d.ts'

/** Was hoechstens so hoch ist (Meter), haelt Fahrzeuge nicht auf. */
const BORDSTEIN_M = 0.25
/** Was hoeher ist (Meter), steht der Kamera hinter dem Wagen im Weg. */
const KAMERA_HINDERNIS_M = 2
/** Laengster Weg (Meter) eines Punkts des Wagens je Teilschritt. */
const TEILSCHRITT_FAHREN_M = 0.08
/** Tempogrenze in der Siedlung (km/h), wenn nichts anderes gesagt ist. */
export const GRENZE_KMH = 60
/** Einsteigen: so weit (Meter) darf man hoechstens von der Fahrertuer weg sein. */
export const EINSTEIGEN_M = 3
/** Sichtfeld (Grad, senkrecht) vom Fahrersitz: weiter als zu Fuss, damit
 *  Lenkrad und Armaturen zu sehen sind. */
export const FAHR_FOV_INNEN = 65
/** Vom Fahrersitz leicht nach unten schauen (rad). */
const FAHR_NEIGUNG_INNEN = -0.1

const G = 9.81
/** So viel der Hangabtriebskraft wirkt (Arcade: gedaempft). */
const HANG_ANTEIL = 0.5
/** Abstand, den der Wagen nach dem Herausschieben von der Kante haelt. */
const HAUT_M = 1e-4
/** Rest-Ueberlappung, ab der der Wagen als festgefahren gilt. */
const FEST_M = 0.01
/** Ab diesem Tempo gegen ein Hindernis (m/s) zaehlt eine Beruehrung. */
const ANSTOSS_M_S = 0.3
/** Ab diesem Tempo gegen ein Hindernis (m/s) prallt man auch beim Gleiten,
 *  wenn die Wand eine andere Richtung hat (Kosinus kleiner als NEUE_WAND_COS). */
const NEUER_STOSS_M_S = 2.5
const NEUE_WAND_COS = 0.85
/** So lange (s) nach der letzten Beruehrung gilt dieselbe Wand noch als
 *  beruehrt: beim Gleiten liegt der Wagen nicht in jedem Teilschritt an. */
const WAND_GEDAECHTNIS_S = 0.25
/** Ab diesem Tempo (m/s) meldet fahrSchritt einen Aufprall. */
const STOSS_MELDEN_M_S = 1
/** Reibung beim Gleiten an der Wand (m/s^2, mal Anteil gegen die Wand). */
const GLEIT_REIBUNG = 6
/** So schnell dreht sich der Wagen beim Gleiten zur Wand (rad je Meter). */
const AUSRICHTEN_RAD_M = 0.6

/* ------------------------------------------------------------ Masse je Art */

/** Was Physik und Modell (fahrzeug3d.ts) gemeinsam brauchen. Masse in
 *  Metern, lokal wie das Modell: x rechts, y hoch, vorne = -z. */
interface FahrzeugMasse {
  laenge: number
  breite: number
  hoehe: number
  /** Hoechsttempo der Art (km/h). */
  kmh: number
  /** Radius und Breite der Raeder; hinten breiter bei Zwillingsreifen. */
  radR: number
  radB: number
  radBHinten: number
  /** Achsen (lokales z, Mitte der Raeder) und Abstand der Radmitten quer. */
  vorneZ: number
  hintenZ: number
  spurVorne: number
  spurHinten: number
  /** Anfahren (m/s^2 aus dem Stand), Vollbremsung, Ausrollen. */
  beschl: number
  bremse: number
  rollen: number
  /** Rueckwaerts hoechstens (km/h). */
  rueckKmh: number
  /** Groesster Lenkeinschlag im Stand (rad) und groesste Querbeschleunigung (m/s^2). */
  lenkMax: number
  querMax: number
}

/** Spur aus Breite und Reifen: Radmitte 3 cm innerhalb der Aussenkante. */
const spur = (breite: number, radB: number) => breite - radB - 0.06

const FAHRZEUG_MASSE: Record<FahrzeugArt, FahrzeugMasse> = {
  // Kleinwagen mit Heckklappe.
  auto: {
    laenge: 4.3, breite: 1.8, hoehe: 1.45, kmh: 120,
    radR: 0.32, radB: 0.2, radBHinten: 0.2,
    vorneZ: -1.3, hintenZ: 1.28, spurVorne: spur(1.8, 0.2), spurHinten: spur(1.8, 0.2),
    beschl: 4, bremse: 7.5, rollen: 1, rueckKmh: 15, lenkMax: 0.6, querMax: 7.5,
  },
  kombi: {
    laenge: 4.7, breite: 1.85, hoehe: 1.5, kmh: 120,
    radR: 0.33, radB: 0.21, radBHinten: 0.21,
    vorneZ: -1.4, hintenZ: 1.42, spurVorne: spur(1.85, 0.21), spurHinten: spur(1.85, 0.21),
    beschl: 3.8, bremse: 7.5, rollen: 1, rueckKmh: 15, lenkMax: 0.6, querMax: 7.5,
  },
  transporter: {
    laenge: 5.3, breite: 2.0, hoehe: 2.3, kmh: 100,
    radR: 0.36, radB: 0.23, radBHinten: 0.23,
    vorneZ: -1.7, hintenZ: 1.48, spurVorne: spur(2.0, 0.23), spurHinten: spur(2.0, 0.23),
    beschl: 3, bremse: 6.8, rollen: 1, rueckKmh: 15, lenkMax: 0.6, querMax: 6,
  },
  feuerwehr: {
    laenge: 8.0, breite: 2.5, hoehe: 3.2, kmh: 90,
    radR: 0.5, radB: 0.32, radBHinten: 0.5,
    vorneZ: -2.7, hintenZ: 2.1, spurVorne: spur(2.5, 0.32) - 0.02, spurHinten: spur(2.5, 0.5) - 0.02,
    beschl: 2.4, bremse: 5.8, rollen: 0.9, rueckKmh: 12, lenkMax: 0.6, querMax: 5,
  },
  rettung: {
    laenge: 6.0, breite: 2.1, hoehe: 2.7, kmh: 110,
    radR: 0.38, radB: 0.24, radBHinten: 0.24,
    vorneZ: -2.1, hintenZ: 1.5, spurVorne: spur(2.1, 0.24), spurHinten: spur(2.1, 0.24),
    beschl: 3.2, bremse: 6.8, rollen: 1, rueckKmh: 15, lenkMax: 0.6, querMax: 6,
  },
  polizei: {
    laenge: 4.7, breite: 1.85, hoehe: 1.5, kmh: 140,
    radR: 0.33, radB: 0.21, radBHinten: 0.21,
    vorneZ: -1.4, hintenZ: 1.42, spurVorne: spur(1.85, 0.21), spurHinten: spur(1.85, 0.21),
    beschl: 4.5, bremse: 7.8, rollen: 1, rueckKmh: 15, lenkMax: 0.6, querMax: 8,
  },
  bus: {
    laenge: 12.0, breite: 2.55, hoehe: 3.1, kmh: 80,
    radR: 0.5, radB: 0.3, radBHinten: 0.55,
    vorneZ: -3.4, hintenZ: 3.8, spurVorne: spur(2.55, 0.3) - 0.02, spurHinten: spur(2.55, 0.55) - 0.02,
    beschl: 1.8, bremse: 5.8, rollen: 0.8, rueckKmh: 12, lenkMax: 0.7, querMax: 4.5,
  },
}

/* ------------------------------------------------------------ Typen */

/** Werte eines Fahrzeugs fuer die Rechnung (aus fahrWerte). Tempi in m/s. */
export interface FahrWerte extends FahrzeugMasse {
  art: FahrzeugArt
  radstand: number
  /** Hoechsttempo vorwaerts und rueckwaerts (m/s), mit der Grenze. */
  hoechst: number
  rueck: number
  /** Lenkgeschwindigkeit (rad/s) beim Einschlagen und zurueck zur Mitte. */
  lenkTempo: number
  lenkZurueck: number
}

/** Wo der Wagen ist und was er tut. x, z, y: Ursprung (unten in der Mitte,
 *  Welt); gier wie Pose3D (0 = vorne nach -z); v in m/s (negativ =
 *  rueckwaerts); lenk: Einschlag des gedachten Mittelrads (rad, positiv =
 *  nach rechts); radWinkel: Drehung der Raeder um ihre Achse (rad, fuer
 *  rotation.x); neigung: Nase hoch positiv (rotation.x des Wagens); kippen:
 *  rechte Seite hoch positiv (rotation.z). seitWand: Sekunden seit der
 *  letzten Beruehrung eines Hindernisses (Infinity: noch nie), wandX/wandZ:
 *  Richtung von dort weg. An derselben Wand gleitet er dann eine Weile,
 *  statt bei jedem Antippen erneut zu prallen. */
export interface FahrZustand {
  x: number
  y: number
  z: number
  gier: number
  v: number
  lenk: number
  radWinkel: number
  neigung: number
  kippen: number
  seitWand: number
  wandX: number
  wandZ: number
}

/** Eingabe je Bild: gas -1..1 (vor/zurueck), lenk -1..1 (rechts = +),
 *  bremse (Leertaste). */
export interface FahrEingabe {
  gas: number
  lenk: number
  bremse: boolean
}

/** Was ein Bild ergab. stoss: Tempo gegen das Hindernis beim staerksten
 *  Aufprall (m/s, 0 = keiner), an der Stelle stossX, stossZ (Welt). weg:
 *  gefahrener Weg laengs (Meter, mit Vorzeichen). fest: der Wagen steckte
 *  fest und blieb stehen. */
interface FahrErgebnis {
  stoss: number
  stossX: number
  stossZ: number
  weg: number
  fest: boolean
}

/** Bodenhoehe (Welt, Meter) an der Stelle x, z. */
type BodenFn = (x: number, z: number) => number

/* ------------------------------------------------------------ Hilfen */

function klemmen(a: number, lo: number, hi: number): number {
  return a < lo ? lo : a > hi ? hi : a
}

/** a zu ziel hin, hoechstens um schritt (>= 0). */
function hin(a: number, ziel: number, schritt: number): number {
  if (a < ziel) return Math.min(ziel, a + schritt)
  if (a > ziel) return Math.max(ziel, a - schritt)
  return a
}

/** Kleinster Winkel von b nach a (-pi..pi]. */
export function winkelDiff(a: number, b: number): number {
  let d = (a - b) % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  else if (d <= -Math.PI) d += Math.PI * 2
  return d
}

const zahl = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/* ------------------------------------------------------------ Werte */

/** Werte fuer die Art, Hoechsttempo hoechstens grenzeKmh (Vorgabe 60). */
export function fahrWerte(art: FahrzeugArt, grenzeKmh: number = GRENZE_KMH): FahrWerte {
  const m = FAHRZEUG_MASSE[art] ?? FAHRZEUG_MASSE.auto
  const grenze = zahl(grenzeKmh) && grenzeKmh > 0 ? grenzeKmh : GRENZE_KMH
  return {
    ...m,
    art: FAHRZEUG_MASSE[art] ? art : 'auto',
    radstand: m.hintenZ - m.vorneZ,
    hoechst: Math.min(m.kmh, grenze) / 3.6,
    rueck: Math.min(m.rueckKmh, grenze) / 3.6,
    lenkTempo: 2.2,
    lenkZurueck: 3.5,
  }
}

/** Ein stehender Wagen an der Stelle x, z mit Blick gier, Boden y. */
export function fahrZustand(x: number, z: number, gier: number, y = 0): FahrZustand {
  return {
    x: zahl(x) ? x : 0,
    y: zahl(y) ? y : 0,
    z: zahl(z) ? z : 0,
    gier: zahl(gier) ? gier : 0,
    v: 0,
    lenk: 0,
    radWinkel: 0,
    neigung: 0,
    kippen: 0,
    seitWand: Infinity,
    wandX: 0,
    wandZ: 0,
  }
}

export function fahrErgebnis(): FahrErgebnis {
  return { stoss: 0, stossX: 0, stossZ: 0, weg: 0, fest: false }
}

/** Tempo in km/h (Betrag), fuer die Anzeige. */
export function tempoKmh(z: FahrZustand): number {
  return Math.abs(z.v) * 3.6
}

/** Groesster Lenkeinschlag bei Tempo v (m/s): im Stand lenkMax, schnell so
 *  viel, dass die Querbeschleunigung querMax nicht uebersteigt. */
function lenkGrenze(w: FahrWerte, v: number): number {
  const a = Math.abs(v)
  if (a < 0.5) return w.lenkMax
  return Math.max(0.03, Math.min(w.lenkMax, Math.atan((w.radstand * w.querMax) / (a * a))))
}

/* ------------------------------------------------------------ Rechteck gegen Raster */

/** Ein Wagen als Rechteck: Mitte, Richtung, halbe Laenge und Breite. */
interface Kasten {
  x: number
  z: number
  gier: number
  hl: number
  hb: number
}

/** Schub aus dem letzten Loesen: Summe der Schuebe und Ecke des Wagens
 *  dort, wo er anlag. */
const schub = { x: 0, z: 0 }
const kasten: Kasten = { x: 0, z: 0, gier: 0, hl: 1, hb: 1 }

/** Wie tief Rechteck i und der Kasten ueberlappen (0 = frei), und die
 *  Richtung, in die der Kasten hinaus muss (in aus). Trennachsen: die zwei
 *  Achsen des Kastens und die zwei des Rechtecks. */
function ueberlappung(h: Hindernisse, i: number, k: Kasten, aus: { x: number; z: number }): number {
  const fx = -Math.sin(k.gier)
  const fz = -Math.cos(k.gier)
  const rx = -fz
  const rz = fx
  const ux = h.ux[i]
  const uz = h.uz[i]
  const vx = -uz
  const vz = ux
  const bl = h.hl[i]
  const bt = h.ht[i]
  const dx = k.x - h.mx[i]
  const dz = k.z - h.mz[i]
  let best = Infinity
  let nx = 0
  let nz = 0
  for (let a = 0; a < 4; a++) {
    const ax = a === 0 ? fx : a === 1 ? rx : a === 2 ? ux : vx
    const az = a === 0 ? fz : a === 1 ? rz : a === 2 ? uz : vz
    const ra = k.hl * Math.abs(fx * ax + fz * az) + k.hb * Math.abs(rx * ax + rz * az)
    const rb = bl * Math.abs(ux * ax + uz * az) + bt * Math.abs(vx * ax + vz * az)
    const d = dx * ax + dz * az
    const o = ra + rb - Math.abs(d)
    if (o <= 0) return 0
    if (o < best) {
      best = o
      const s = d >= 0 ? 1 : -1
      nx = ax * s
      nz = az * s
    }
  }
  aus.x = nx
  aus.z = nz
  return best
}

const aus = { x: 0, z: 0 }

/** Haelt Rechteck i des Rasters den Wagen auf? An und hoeher als ein
 *  Bordstein (E87: so taugt auch das Raster des Gehens, kollision.ts, mit
 *  seinen Oberkanten; in einem Raster aus fahrHindernisse() haben alle
 *  Rechtecke keine Oberkante und halten auf). */
function haelt(h: Hindernisse, i: number): boolean {
  return h.an[i] && h.ob[i] > BORDSTEIN_M
}

/** Rechtecke um den Kasten abfragen (mit Rand); 0 = keins in der Naehe. */
function kastenAbfrage(h: Hindernisse | null, k: Kasten): Hindernisse | null {
  if (!h || h.groesse === 0) return null
  const fx = Math.abs(Math.sin(k.gier))
  const fz = Math.abs(Math.cos(k.gier))
  const ex = fx * k.hl + fz * k.hb + 0.3
  const ez = fz * k.hl + fx * k.hb + 0.3
  return h.abfrage(k.x - ex, k.z - ez, k.x + ex, k.z + ez) > 0 ? h : null
}

/** Den Kasten einmal aus allen Treffern von h schieben. true, wenn geschoben. */
function kastenSchieben(h: Hindernisse, k: Kasten): boolean {
  let geschoben = false
  for (let j = 0; j < h.anzahl; j++) {
    const i = h.treffer[j]
    if (!haelt(h, i)) continue
    const o = ueberlappung(h, i, k, aus)
    if (o <= 0) continue
    const w = o + HAUT_M
    k.x += aus.x * w
    k.z += aus.z * w
    schub.x += aus.x * w
    schub.z += aus.z * w
    geschoben = true
  }
  return geschoben
}

/** Die Raster der letzten Loesung (nach kastenLoesen gilt ihre Abfrage). */
let loesA: Hindernisse | null = null
let loesB: Hindernisse | null = null

/** Den Kasten aus allen Rechtecken in der Naehe schieben, die aufhalten
 *  (bis zu vier Durchgaenge, Ecken brauchen zwei), aus a und b (E87: b
 *  sind die anderen Fahrzeuge). Aendert k.x, k.z; summiert in schub. Gibt
 *  die verbleibende groesste Ueberlappung zurueck. */
function kastenLoesen(a: Hindernisse | null, b: Hindernisse | null, k: Kasten): number {
  schub.x = 0
  schub.z = 0
  loesA = kastenAbfrage(a, k)
  loesB = kastenAbfrage(b, k)
  if (!loesA && !loesB) return 0
  for (let d = 0; d < 4; d++) {
    let geschoben = false
    if (loesA && kastenSchieben(loesA, k)) geschoben = true
    if (loesB && kastenSchieben(loesB, k)) geschoben = true
    if (!geschoben) return 0
  }
  return kastenTiefe(k)
}

/** Groesste Ueberlappung des Kastens mit den Treffern der letzten Abfrage von h. */
function tiefeIn(h: Hindernisse | null, k: Kasten): number {
  if (!h) return 0
  let rest = 0
  for (let j = 0; j < h.anzahl; j++) {
    const i = h.treffer[j]
    if (!haelt(h, i)) continue
    rest = Math.max(rest, ueberlappung(h, i, k, aus))
  }
  return rest
}

/** Groesste Ueberlappung des Kastens mit den Treffern der letzten Loesung. */
function kastenTiefe(k: Kasten): number {
  return Math.max(tiefeIn(loesA, k), tiefeIn(loesB, k))
}

/* ------------------------------------------------------------ Gelaende */

/** Den Wagen auf den Boden stellen (E87): Hoehe, Neigung und Kippen aus
 *  dem Boden unter den vier Raedern, ohne ihn zu bewegen. Fuer abgestellte
 *  und von anderen gelenkte Fahrzeuge (beim Fahren macht es fahrSchritt). */
export function fahrBoden(z: FahrZustand, w: FahrWerte, boden: BodenFn): void {
  gelaendeSetzen(z, w, boden)
}

/** Hoehe, Neigung und Kippen aus dem Boden unter den vier Raedern. */
function gelaendeSetzen(z: FahrZustand, w: FahrWerte, boden: BodenFn): void {
  const s = Math.sin(z.gier)
  const c = Math.cos(z.gier)
  // Lokal (lx, lz) -> Welt (x + lx c + lz s, z - lx s + lz c).
  const h = (lx: number, lz: number) => {
    const v = boden(z.x + lx * c + lz * s, z.z - lx * s + lz * c)
    return zahl(v) ? v : z.y
  }
  const sv = w.spurVorne / 2
  const sh = w.spurHinten / 2
  const vl = h(-sv, w.vorneZ)
  const vr = h(sv, w.vorneZ)
  const hl = h(-sh, w.hintenZ)
  const hr = h(sh, w.hintenZ)
  const vorne = (vl + vr) / 2
  const hinten = (hl + hr) / 2
  // Hoehe am Ursprung (lokal z = 0) zwischen den Achsen.
  const t = (0 - w.vorneZ) / w.radstand
  z.y = vorne + (hinten - vorne) * t
  z.neigung = Math.atan2(vorne - hinten, w.radstand)
  const spurMittel = (w.spurVorne + w.spurHinten) / 2
  z.kippen = Math.atan2((vr + hr) / 2 - (vl + hl) / 2, spurMittel)
}

/* ------------------------------------------------------------ Ein Bild */

/** Ein Bild Fahren: Lenkung, Tempo, Bewegung in Teilschritten mit
 *  Zusammenstoss, dann Hoehe, Neigung und Raeder. dt in Sekunden (hoechstens
 *  0,1 zaehlt). raster: Rechtecke, die aufhalten (fahrHindernisse, oder
 *  seit E87 auch das Raster des Gehens einer Ebene: dort halten nur
 *  Rechtecke hoeher als BORDSTEIN_M), oder null. boden: Bodenhoehe (Welt)
 *  fuer Hang und Neigung, sonst bleibt y. dazu (E87): ein zweites Raster,
 *  das ebenso aufhaelt (die anderen Fahrzeuge der Ebene). Aendert z; out
 *  (oder ein neues Ergebnis) sagt, was geschah. */
export function fahrSchritt(
  z: FahrZustand,
  e: FahrEingabe,
  w: FahrWerte,
  dt: number,
  raster: Hindernisse | null,
  boden?: BodenFn | null,
  out: FahrErgebnis = fahrErgebnis(),
  dazu: Hindernisse | null = null,
): FahrErgebnis {
  out.stoss = 0
  out.stossX = z.x
  out.stossZ = z.z
  out.weg = 0
  out.fest = false
  const t = zahl(dt) ? klemmen(dt, 0, 0.1) : 0
  if (t <= 0) return out
  const gas = zahl(e.gas) ? klemmen(e.gas, -1, 1) : 0
  const lenkIn = zahl(e.lenk) ? klemmen(e.lenk, -1, 1) : 0

  // Lenkung: zum Ziel, das mit dem Tempo kleiner wird; zurueck schneller.
  const grenze = lenkGrenze(w, z.v)
  const ziel = lenkIn * grenze
  const zurueck = Math.abs(ziel) < Math.abs(z.lenk) || ziel * z.lenk < 0
  z.lenk = hin(z.lenk, ziel, (zurueck ? w.lenkZurueck : w.lenkTempo) * t)
  z.lenk = klemmen(z.lenk, -grenze, grenze)

  // Tempo.
  if (boden) z.v -= G * Math.sin(z.neigung) * HANG_ANTEIL * t
  if (e.bremse) {
    z.v = hin(z.v, 0, w.bremse * t)
  } else if (gas > 0.02) {
    if (z.v < -0.05) z.v = hin(z.v, 0, w.bremse * gas * t)
    else {
      const zielV = w.hoechst * gas
      if (z.v < zielV) z.v = Math.min(zielV, z.v + w.beschl * gas * (1 - (0.5 * z.v) / w.hoechst) * t)
      else z.v = hin(z.v, zielV, w.rollen * t)
    }
  } else if (gas < -0.02) {
    const g = -gas
    if (z.v > 0.05) z.v = hin(z.v, 0, w.bremse * g * t)
    else {
      const zielV = -w.rueck * g
      if (z.v > zielV) z.v = Math.max(zielV, z.v - w.beschl * 0.6 * g * t)
      else z.v = hin(z.v, zielV, w.rollen * t)
    }
  } else {
    z.v = hin(z.v, 0, w.rollen * t)
  }
  // Nie schneller als erlaubt (etwa am Hang).
  z.v = klemmen(z.v, -w.rueck * 1.5, w.hoechst * 1.15)

  // Bewegung: Teilschritte so klein, dass kein Punkt weiter als 8 cm kommt.
  const tanL = Math.tan(z.lenk)
  // Der Wagen dreht um die Hinterachse: am weitesten weg ist die Ecke vorne.
  const halb = Math.hypot(Math.abs(w.hintenZ) + w.laenge / 2, w.breite / 2)
  const wegGesamt = Math.abs(z.v) * t
  const drehGesamt = (wegGesamt * Math.abs(tanL)) / w.radstand
  const n = Math.max(1, Math.ceil((wegGesamt + drehGesamt * halb) / TEILSCHRITT_FAHREN_M))
  const tt = t / n
  kasten.hl = w.laenge / 2
  kasten.hb = w.breite / 2
  for (let s = 0; s < n; s++) {
    if (z.v === 0) break
    const ox = z.x
    const oz = z.z
    const og = z.gier
    const schritt = z.v * tt
    const dreh = (-schritt * tanL) / w.radstand
    // Einspurmodell um die Mitte der Hinterachse (lokal z = hintenZ).
    const gm = og + dreh / 2
    const ax = ox + w.hintenZ * Math.sin(og) - Math.sin(gm) * schritt
    const az = oz + w.hintenZ * Math.cos(og) - Math.cos(gm) * schritt
    const g2 = og + dreh
    z.gier = g2
    z.x = ax - w.hintenZ * Math.sin(g2)
    z.z = az - w.hintenZ * Math.cos(g2)
    if (raster || dazu) {
      kasten.x = z.x
      kasten.z = z.z
      kasten.gier = z.gier
      const rest = kastenLoesen(raster, dazu, kasten)
      let fest = rest > FEST_M
      if (fest) {
        // Steckte der Wagen schon vorher fest (etwa so abgestellt oder
        // zwischen zwei Waenden), zaehlt der gerade Schritt ohne
        // Herausschieben, wenn er nicht tiefer hineinfuehrt: so kommt er
        // heraus (wie beim Gehen in kollision.ts).
        kasten.x = ox
        kasten.z = oz
        kasten.gier = og
        const vorher = kastenTiefe(kasten)
        kasten.x = z.x
        kasten.z = z.z
        kasten.gier = z.gier
        if (vorher > 1e-4 && kastenTiefe(kasten) <= vorher + 1e-6) {
          fest = false
          schub.x = 0
          schub.z = 0
        }
      }
      if (fest) {
        // Festgefahren (zu eng): zurueck und stehen bleiben.
        z.x = ox
        z.z = oz
        z.gier = og
        if (Math.abs(z.v) > STOSS_MELDEN_M_S && Math.abs(z.v) > out.stoss) {
          out.stoss = Math.abs(z.v)
          out.stossX = z.x
          out.stossZ = z.z
        }
        z.v = 0
        out.fest = true
        break
      }
      const sl = Math.hypot(schub.x, schub.z)
      if (sl > 1e-5) {
        z.x = kasten.x
        z.z = kasten.z
        const nx = schub.x / sl
        const nz = schub.z / sl
        const fx = -Math.sin(z.gier)
        const fz = -Math.cos(z.gier)
        const c = fx * nx + fz * nz
        const vn = z.v * c
        if (vn < 0) {
          // Neu ist ein Stoss ohne vorige Beruehrung oder gegen eine Wand
          // anderer Richtung (Ecke, naechstes Hindernis).
          const andereWand = z.wandX * nx + z.wandZ * nz < NEUE_WAND_COS
          const frisch = z.seitWand > WAND_GEDAECHTNIS_S
          if (-vn > ANSTOSS_M_S && (frisch || (andereWand && -vn > NEUER_STOSS_M_S))) {
            // Aufprall: der Anteil gegen die Wand prallt (ab 1 m/s) mit 0,2
            // zurueck, laengs der Wand bleibt; der Wagen faehrt nur in seiner
            // Laengsrichtung, darum v mal (1 - 1,2 c^2): frontal -0,2.
            if (-vn > out.stoss && -vn >= STOSS_MELDEN_M_S) {
              out.stoss = -vn
              const ausdehnung = kasten.hl * Math.abs(c) + kasten.hb * Math.abs(-fz * nx + fx * nz)
              out.stossX = z.x - nx * ausdehnung
              out.stossZ = z.z - nz * ausdehnung
            }
            z.v *= 1 - (-vn >= STOSS_MELDEN_M_S ? 1.2 : 1) * c * c
          } else if (Math.abs(c) > 0.7) {
            // Steil gegen die Wand gedrueckt: der Anteil gegen sie ist weg
            // (sonst stiege das Tempo mit Gas, ohne dass sich etwas bewegt).
            z.v *= 1 - c * c
          } else {
            // Gleiten an der Wand: etwas Reibung.
            z.v = hin(z.v, 0, GLEIT_REIBUNG * Math.abs(c) * tt)
          }
          // Zur Wand drehen (nicht frontal): die Laengsachse dreht zu ihrem
          // Anteil laengs der Wand, vorwaerts wie rueckwaerts.
          if (Math.abs(c) < 0.95) {
            const tx = fx - c * nx
            const tz = fz - c * nz
            const rx = -fz
            const rz = fx
            // Winkel von f nach t: gier waechst nach links (-r).
            const wnk = Math.atan2(-(tx * rx + tz * rz), tx * fx + tz * fz)
            const grenzeDreh = AUSRICHTEN_RAD_M * Math.abs(schritt)
            z.gier += klemmen(wnk, -grenzeDreh, grenzeDreh)
          }
        }
        z.seitWand = 0
        z.wandX = nx
        z.wandZ = nz
      } else {
        z.seitWand += tt
      }
    }
    // Weg laengs (fuer Raeder und Anzeige).
    out.weg += (z.x - ox) * -Math.sin(z.gier) + (z.z - oz) * -Math.cos(z.gier)
  }
  if (Math.abs(z.v) < 1e-3 && gas === 0) z.v = 0
  z.gier = winkelDiff(z.gier, 0)
  z.radWinkel = radDrehen(z.radWinkel, out.weg, w.radR)
  if (boden) gelaendeSetzen(z, w, boden)
  return out
}

/** Raeder drehen: weg (Meter, vorwaerts positiv) bei Radius r. Vorwaerts
 *  dreht ein Rad um seine x-Achse rueckwaerts (oben nach vorne). */
export function radDrehen(winkel: number, weg: number, r: number): number {
  if (!zahl(weg) || !(r > 0)) return winkel
  return winkelDiff(winkel - weg / r, 0)
}

/** Einschlag eines Vorderrads (rad, fuer rotation.y; positiv = nach links)
 *  auf der Seite seite (+1 rechts, -1 links), mit Ackermann: das innere Rad
 *  schlaegt staerker ein. */
function radEinschlag(z: FahrZustand, w: FahrWerte, seite: number): number {
  const t = Math.tan(z.lenk)
  const nenner = w.radstand - Math.sign(seite) * (w.spurVorne / 2) * t
  return -Math.atan2(w.radstand * t, nenner)
}

/** Raeder des Modells stellen: alle drehen um x (radWinkel), vordere lenken
 *  um y. Die Raeder haben rotation.order 'YXZ' (fahrzeug3d.ts). */
export function raederStellen(
  raeder: readonly { teil: { rotation: { x: number; y: number }; position: { x: number } }; vorne: boolean }[],
  z: FahrZustand,
  w: FahrWerte,
): void {
  for (const r of raeder) {
    r.teil.rotation.x = z.radWinkel
    r.teil.rotation.y = r.vorne ? radEinschlag(z, w, r.teil.position.x >= 0 ? 1 : -1) : 0
  }
}

/** Lage des Wagens auf das Modell (gruppe) uebertragen. */
export function lageAnwenden(
  o: { position: { set(x: number, y: number, z: number): unknown }; rotation: { set(x: number, y: number, z: number, order?: 'YXZ'): unknown } },
  z: FahrZustand,
): void {
  o.position.set(z.x, z.y, z.z)
  o.rotation.set(z.neigung, z.gier, z.kippen, 'YXZ')
}

/* ------------------------------------------------------------ Kamera */

/** Ein Punkt (lx, ly, lz) im Wagen in der Welt, mit Neigung und Kippen
 *  (Drehung wie three mit Reihenfolge 'YXZ'). */
function lokalZuWelt(z: FahrZustand, lx: number, ly: number, lz: number, out: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  const ck = Math.cos(z.kippen)
  const sk = Math.sin(z.kippen)
  const x1 = lx * ck - ly * sk
  const y1 = lx * sk + ly * ck
  const cn = Math.cos(z.neigung)
  const sn = Math.sin(z.neigung)
  const y2 = y1 * cn - lz * sn
  const z2 = y1 * sn + lz * cn
  const cg = Math.cos(z.gier)
  const sg = Math.sin(z.gier)
  out.x = z.x + x1 * cg + z2 * sg
  out.y = z.y + y2
  out.z = z.z - x1 * sg + z2 * cg
  return out
}

/** Sicht vom Fahrersitz: Stelle der Augen (Welt) und der Grundblick
 *  (gier, neigung, kippen fuer camera.rotation mit 'YXZ'); das Umschauen
 *  des Fahrers kommt dazu. */
export interface FahrerSicht {
  x: number
  y: number
  z: number
  gier: number
  neigung: number
  kippen: number
}

export function fahrerSicht(z: FahrZustand, auge: readonly [number, number, number], out: FahrerSicht): FahrerSicht {
  lokalZuWelt(z, auge[0], auge[1], auge[2], out)
  out.gier = z.gier
  out.neigung = z.neigung + FAHR_NEIGUNG_INNEN
  out.kippen = z.kippen
  return out
}

/** Kamera hinter dem Wagen. an = false: beim naechsten verfolgen() ohne
 *  Weichzeichnen hinter den Wagen springen. */
export interface Verfolger {
  an: boolean
  x: number
  y: number
  z: number
  gier: number
  neigung: number
  /** Richtung, aus der die Kamera schaut (folgt der des Wagens weich). */
  richtung: number
  abstand: number
}

export function verfolger(): Verfolger {
  return { an: false, x: 0, y: 0, z: 0, gier: 0, neigung: 0, richtung: 0, abstand: 0 }
}

/** Freier Abstand hinter dem Wagen bis zur ersten Wand (Schritte von 0,5 m).
 *  Es zaehlt nur, was hoeher als KAMERA_HINDERNIS_M ist (E87: so taugt
 *  auch das Raster des Gehens mit seinen Oberkanten). */
function freierAbstand(h: Hindernisse, x: number, z: number, richtung: number, soll: number): number {
  const bx = Math.sin(richtung)
  const bz = Math.cos(richtung)
  for (let d = 1.5; d <= soll + 1e-6; d += 0.5) {
    if (!h.frei(x + bx * d, z + bz * d, 0.3, KAMERA_HINDERNIS_M - STUFE_M)) return Math.max(1.5, d - 0.5)
  }
  return soll
}

/** Verfolgerkamera: hinter und ueber dem Wagen, die Richtung folgt weich
 *  (rueckwaerts dreht sie nicht um), der Abstand waechst leicht mit dem
 *  Tempo. Mit raster (fahrHindernisse(..., 2) oder seit E87 das Raster des
 *  Gehens; es zaehlt nur, was hoeher als KAMERA_HINDERNIS_M ist) rueckt sie
 *  vor Waenden naeher heran, mit boden bleibt sie ueber dem Gelaende. */
export function verfolgen(k: Verfolger, z: FahrZustand, w: FahrWerte, dt: number, raster?: Hindernisse | null, boden?: BodenFn | null): Verfolger {
  const t = zahl(dt) ? klemmen(dt, 0, 0.1) : 0
  const soll = w.laenge * 0.75 + 4.5 + Math.min(3, Math.abs(z.v) * 0.12)
  if (!k.an) {
    k.an = true
    k.richtung = z.gier
    k.abstand = soll
  } else {
    k.richtung += winkelDiff(z.gier, k.richtung) * (1 - Math.exp(-t / 0.35))
  }
  let ziel = soll
  if (raster) ziel = Math.min(ziel, freierAbstand(raster, z.x, z.z, k.richtung, soll))
  // Naeher sofort (nie in der Wand), weiter weg langsam.
  k.abstand = ziel < k.abstand ? ziel : k.abstand + (ziel - k.abstand) * (1 - Math.exp(-t / 0.6))
  k.x = z.x + Math.sin(k.richtung) * k.abstand
  k.z = z.z + Math.cos(k.richtung) * k.abstand
  k.y = z.y + w.hoehe + 1.5
  if (boden) {
    const b = boden(k.x, k.z)
    if (zahl(b)) k.y = Math.max(k.y, b + 1.2)
  }
  // Blick auf einen Punkt etwas vor dem Wagen, auf zwei Dritteln der Hoehe.
  const px = z.x - Math.sin(z.gier) * 2
  const pz = z.z - Math.cos(z.gier) * 2
  const py = z.y + w.hoehe * 0.7
  k.gier = Math.atan2(-(px - k.x), -(pz - k.z))
  k.neigung = Math.atan2(py - k.y, Math.hypot(px - k.x, pz - k.z))
  return k
}

/* ------------------------------------------------------------ Ein- und Aussteigen */

/** Lage eines Fahrzeugs in der Ebene. */
interface FahrLage {
  x: number
  z: number
  gier: number
}

/** Ein Punkt (lx, lz) des Wagens in der Welt (eben, ohne Neigung). */
function flachZuWelt(lage: FahrLage, lx: number, lz: number, out: { x: number; z: number }): { x: number; z: number } {
  const c = Math.cos(lage.gier)
  const s = Math.sin(lage.gier)
  out.x = lage.x + lx * c + lz * s
  out.z = lage.z - lx * s + lz * c
  return out
}

const tuer = { x: 0, z: 0 }

/** Abstand (Meter) von (x, z) zur Mitte der Fahrertuer (links, auf Hoehe
 *  der Augen des Fahrers). */
export function tuerAbstand(f: { breite: number; fahrerAuge: readonly [number, number, number] }, lage: FahrLage, x: number, z: number): number {
  flachZuWelt(lage, -f.breite / 2, f.fahrerAuge[2], tuer)
  return Math.hypot(x - tuer.x, z - tuer.z)
}

/** Wo man nach dem Aussteigen steht (Welt): seite 1 wie das Modell sagt
 *  (links, Fahrerseite), -1 gespiegelt auf die andere Seite. */
function ausstiegWelt(f: { ausstieg: readonly [number, number] }, lage: FahrLage, seite: 1 | -1, out: { x: number; z: number }): { x: number; z: number } {
  return flachZuWelt(lage, f.ausstieg[0] * seite, f.ausstieg[1], out)
}

/** Ringe (Meter ueber die halbe Diagonale des Wagens hinaus), auf denen
 *  aussteigenSuchen zuletzt sucht, je mit AUSSTIEG_RICHTUNGEN Stellen. */
const AUSSTIEG_RINGE = [0.45, 0.9, 1.5, 2.3, 3.3, 4.6, 6]
const AUSSTIEG_RICHTUNGEN = 16
const ausS = { x: 0, z: 0 }

/** Wohin man beim Aussteigen tritt (E87), der Reihe nach: neben die
 *  Fahrertuer (ausstieg), gespiegelt auf die andere Seite, hinter und vor
 *  den Wagen, zuletzt auf Ringen rundherum bis gut 6 m. frei(x, z): kann
 *  man dort stehen (nicht in einer Wand, einem anderen Fahrzeug oder dem
 *  Wagen selbst)? weg(x0, z0, x1, z1): kommt man von x0, z0 (im Wagen) ohne
 *  Wand dorthin (nicht durch die Mauer, an der er steht)? Gibt true und die
 *  Stelle in out, sonst false: dann ist rundherum kein Platz. */
export function aussteigenSuchen(
  f: { laenge: number; breite: number; fahrerAuge: readonly [number, number, number]; ausstieg: readonly [number, number] },
  lage: FahrLage,
  frei: (x: number, z: number) => boolean,
  weg: (x0: number, z0: number, x1: number, z1: number) => boolean,
  out: { x: number; z: number },
): boolean {
  const innen = Math.max(0, f.breite / 2 - 0.35)
  const hl = f.laenge / 2
  // Seite 1 und -1: neben der Fahrertuer; Start innen auf Hoehe des Sitzes.
  for (const seite of [1, -1] as const) {
    ausstiegWelt(f, lage, seite, out)
    flachZuWelt(lage, Math.sign(f.ausstieg[0] || -1) * seite * innen, f.fahrerAuge[2], ausS)
    if (frei(out.x, out.z) && weg(ausS.x, ausS.z, out.x, out.z)) return true
  }
  // Hinter und vor den Wagen.
  for (const s of [1, -1]) {
    flachZuWelt(lage, 0, s * (hl + 0.6), out)
    flachZuWelt(lage, 0, s * Math.max(0, hl - 0.4), ausS)
    if (frei(out.x, out.z) && weg(ausS.x, ausS.z, out.x, out.z)) return true
  }
  // Ringe um die Mitte.
  const diag = Math.hypot(hl, f.breite / 2)
  for (const d of AUSSTIEG_RINGE) {
    const r = diag + d
    for (let k = 0; k < AUSSTIEG_RICHTUNGEN; k++) {
      // Von der Fahrerseite (links, -x) aus abwechselnd nach vorne und hinten.
      const halb = (k + 1) >> 1
      const w = Math.PI + (k % 2 === 0 ? 1 : -1) * halb * ((2 * Math.PI) / AUSSTIEG_RICHTUNGEN)
      flachZuWelt(lage, Math.cos(w) * r, Math.sin(w) * r, out)
      if (frei(out.x, out.z) && weg(lage.x, lage.z, out.x, out.z)) return true
    }
  }
  return false
}

