/* Fahrzeuge zum Einsteigen (E87): Kleinwagen, Kombi, Transporter,
 * Feuerwehr, Rettung, Polizei und Bus, rund und genau genug, dass man sie
 * von aussen erkennt und vom Fahrersitz aus Lenkrad, Armaturen und Sitze
 * sieht. Keine Marken, keine Zeichen; Schriftzuege nur als schlichter Text
 * ("FEUERWEHR", "RETTUNG", "POLIZEI").
 *
 * Aufbau (Ursprung unten in der Mitte, vorne = -z, x rechts):
 *  - Karosserie aus Seitenprofilen, quer ausgezogen mit gerundeten Kanten
 *    (ExtrudeGeometry mit Fase): Vorderteil mit Haube, Tueren, Hinterteil
 *    oder Kasten, Radlaeufe ausgespart. Der Innenraum ist offen: zwischen
 *    den Tueren sieht man Boden, Sitze, Armaturenbrett und Lenkrad.
 *  - Glas als ein geschlossener Koerper ueber der Guertellinie, dunkel und
 *    leicht spiegelnd (Phong), halb durchsichtig. Nur Vorderseiten werden
 *    gezeichnet: von innen sieht man ungehindert hinaus.
 *  - Raeder: Reifen und Felge aus einem Drehkoerper (Felge mit Speichen aus
 *    Farben je Dreieck), je Rad ein eigenes Objekt mit rotation.order
 *    'YXZ': rotation.x dreht das Rad, rotation.y lenkt (fahren.ts,
 *    raederStellen). Linke Raeder sind gespiegelte Geometrie (Felge aussen).
 *  - Blaulicht (Feuerwehr, Rettung, Polizei): zwei Gruppen A und B blitzen
 *    abwechselnd doppelt. Das Umschalten (emissive) macht onBeforeRender
 *    des Lichts A mit performance.now(), ohne den Motor; der Motor muss nur
 *    weiterzeichnen, solange blaulichtAn(f) wahr ist. Dazu eine leise
 *    Sirene (WebAudio, Zweiklang), leiser mit dem Abstand zur Kamera.
 *
 * Geteilt wird, damit viele Fahrzeuge billig sind: die Geometrie je Art
 * (eine Vorlage, alle Teile gleichen Materials zu einem Mesh verschmolzen)
 * und der Lack je Farbe. Beides zaehlt mit (Referenzen): dispose() eines
 * Fahrzeugs gibt nur frei, was kein anderes mehr braucht. Glas, Teile mit
 * Farben je Ecke und Lichter haben je ein Material fuer alle; die bleiben,
 * solange die Seite lebt (klein, ohne Texturen). Eigen sind nur die zwei
 * Materialien des Blaulichts (blinken je Fahrzeug).
 *
 * Zeichenaufrufe je Fahrzeug: Lack, Glas, Teile, Lichter, Aufkleber, vier
 * Raeder (9), mit Blaulicht 11, mit Schrift je Seite einer mehr. Dreiecke:
 * Pkw und Transporter unter 4000, Feuerwehr und Bus unter 9000
 * (scripts/fahren-pruefen.mjs).
 *
 * Laeuft auch unter node (Pruefung): nur die Schrift braucht eine
 * Zeichenflaeche und entfaellt dort, die Sirene braucht WebAudio. */
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshPhongMaterial,
  PlaneGeometry,
  Quaternion,
  Shape,
  SRGBColorSpace,
  TorusGeometry,
  Vector2,
  Vector3,
  type Material,
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { FAHRZEUG_MASSE, type FahrzeugMasse } from './fahren.ts'
import type { Fahrzeug3D, FahrzeugArt } from './vertrag3d'

/* ------------------------------------------------------------ Farben */

/** Farben der Teile (nicht der Lack). */
const F = {
  reifen: '#1b1c1e',
  felge: '#c4c8cd',
  felgeDunkel: '#2a2d32',
  innen: '#2e3136',
  sitz: '#3c414a',
  himmel: '#cfccc4',
  kunststoff: '#25282c',
  schwarz: '#131416',
  chrom: '#b8bdc3',
  alu: '#cdd0d4',
  aluDunkel: '#9aa0a7',
  weiss: '#f3f3ef',
  kennzeichen: '#f2f2ed',
  euBlau: '#1f3f99',
  scheinwerfer: '#f5f2e6',
  ruecklicht: '#c3121c',
  blinker: '#ff9a1f',
  anzeige: '#86c9e3',
  bildschirm: '#1c2a3a',
  display: '#ffa53a',
  rot: '#c8102e',
  orange: '#f29a1d',
  polizeiBlau: '#1d4e9e',
  gelb: '#e5b51f',
  spiegel: '#4b5967',
  busSitz: '#33507f',
  milchglas: '#d9dee3',
} as const

/** Feste Lacke der Einsatzfahrzeuge (die Farbe beim Bauen gilt fuer sie nicht). */
const FESTER_LACK: Partial<Record<FahrzeugArt, string>> = {
  feuerwehr: '#c3121e',
  rettung: '#f4f4f1',
  polizei: '#f2f3f5',
}

/** Uebliche Lacke fuer Autos, Kombis, Transporter und Busse (zum Auswaehlen). */
export const FAHRZEUG_LACKE: readonly string[] = [
  '#c9cdd2', // silber
  '#f1f1ee', // weiss
  '#1d1f23', // schwarz
  '#5d636b', // grau
  '#1f3a66', // dunkelblau
  '#9c1f24', // rot
  '#2f5a3e', // dunkelgruen
  '#7a8a99', // taubenblau
  '#b8a68a', // sand
]

const FARBE_OK = /^#[0-9a-f]{6}$/i

/* ------------------------------------------------------------ Bausteine */

type P2 = [number, number]
/** Ecke eines Seitenprofils: z, y und Rundung (Meter, 0 = spitz). */
type Ecke = [number, number, number]
type V3 = [number, number, number]

/** Ohne Index und ohne uv, damit alle Teile zusammenpassen. */
function roh(g: BufferGeometry): BufferGeometry {
  const n = g.index ? g.toNonIndexed() : g
  if (n !== g) g.dispose()
  n.deleteAttribute('uv')
  return n
}

const farbeTmp = new Color()
/** Eine Farbe fuer alle Ecken (Teile mit Farben je Ecke). */
function farbig(g: BufferGeometry, hex: string): BufferGeometry {
  farbeTmp.set(hex)
  const n = g.getAttribute('position').count
  const a = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    a[i * 3] = farbeTmp.r
    a[i * 3 + 1] = farbeTmp.g
    a[i * 3 + 2] = farbeTmp.b
  }
  g.setAttribute('color', new BufferAttribute(a, 3))
  return g
}

/** Kasten von (x0, y0, z0) bis (x1, y1, z1). */
function quader(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): BufferGeometry {
  const g = roh(new BoxGeometry(Math.max(0.001, Math.abs(x1 - x0)), Math.max(0.001, Math.abs(y1 - y0)), Math.max(0.001, Math.abs(z1 - z0))))
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
  return g
}

/** Kasten mit runden Kanten (Radius r, hoechstens die halbe kuerzeste Seite). */
function rund(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, r: number, stufen = 1): BufferGeometry {
  const w = Math.max(0.002, Math.abs(x1 - x0))
  const h = Math.max(0.002, Math.abs(y1 - y0))
  const d = Math.max(0.002, Math.abs(z1 - z0))
  const rr = Math.max(0.0005, Math.min(r, w / 2 - 0.0005, h / 2 - 0.0005, d / 2 - 0.0005))
  const g = roh(new RoundedBoxGeometry(w, h, d, stufen, rr))
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
  return g
}

/** x-Bereich auf der Seite s (+1 rechts, -1 links) zwischen a und b (Betraege). */
function seite(s: number, a: number, b: number): [number, number] {
  return s > 0 ? [Math.min(a, b), Math.max(a, b)] : [-Math.max(a, b), -Math.min(a, b)]
}

const qTmp = new Quaternion()
const zAchse = new Vector3(0, 0, 1)
const richtungTmp = new Vector3()
/** Ein Balken von a nach b, Querschnitt breite (x) mal dicke. */
function balken(a: V3, b: V3, breite: number, dicke: number): BufferGeometry {
  richtungTmp.set(b[0] - a[0], b[1] - a[1], b[2] - a[2])
  const l = Math.max(0.001, richtungTmp.length())
  const g = roh(new BoxGeometry(breite, dicke, l))
  qTmp.setFromUnitVectors(zAchse, richtungTmp.normalize())
  g.applyQuaternion(qTmp)
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2)
  return g
}

/** Polygon mit runden Ecken: jede Ecke mit r > 0 wird zu einer Kurve aus
 *  n Stuecken (quadratisch, an beiden Nachbarkanten tangential). */
function rundProfil(ecken: readonly Ecke[], n = 3): P2[] {
  const out: P2[] = []
  const m = ecken.length
  for (let i = 0; i < m; i++) {
    const [z, y, r] = ecken[i]
    if (!(r > 0)) {
      out.push([z, y])
      continue
    }
    const [pz, py] = ecken[(i + m - 1) % m]
    const [nz, ny] = ecken[(i + 1) % m]
    const la = Math.hypot(pz - z, py - y)
    const lb = Math.hypot(nz - z, ny - y)
    if (la < 1e-6 || lb < 1e-6) {
      out.push([z, y])
      continue
    }
    const az = (pz - z) / la
    const ay = (py - y) / la
    const bz = (nz - z) / lb
    const by = (ny - y) / lb
    const winkel = Math.acos(Math.max(-1, Math.min(1, az * bz + ay * by)))
    if (winkel > Math.PI - 1e-3 || winkel < 1e-3) {
      out.push([z, y])
      continue
    }
    const d = Math.min(r / Math.tan(winkel / 2), la * 0.45, lb * 0.45)
    const z0 = z + az * d
    const y0 = y + ay * d
    const z2 = z + bz * d
    const y2 = y + by * d
    for (let k = 0; k <= n; k++) {
      const t = k / n
      const u = 1 - t
      out.push([u * u * z0 + 2 * u * t * z + t * t * z2, u * u * y0 + 2 * u * t * y + t * t * y2])
    }
  }
  // Doppelte Punkte hintereinander stoeren das Zerlegen in Dreiecke.
  const sauber: P2[] = []
  for (const p of out) {
    const q = sauber[sauber.length - 1]
    if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-5) sauber.push(p)
  }
  const a = sauber[0]
  const e = sauber[sauber.length - 1]
  if (sauber.length > 1 && Math.hypot(a[0] - e[0], a[1] - e[1]) <= 1e-5) sauber.pop()
  return sauber
}

/** Radlauf: Bogen um die Achse (z, Hoehe radR) mit Radius radR + 5 cm, von
 *  der Unterkante unten hinten ueber oben nach vorne (fuer Profile, die
 *  unten von hinten nach vorne laufen). */
function radlauf(achseZ: number, radR: number, unten: number, n = 7): Ecke[] {
  const r = radR + 0.05
  const dy = unten - radR
  if (Math.abs(dy) >= r) return []
  const a0 = Math.asin(dy / r)
  const pts: Ecke[] = []
  for (let k = 0; k <= n; k++) {
    const a = a0 + ((Math.PI - 2 * a0) * k) / n
    pts.push([achseZ + r * Math.cos(a), radR + r * Math.sin(a), 0])
  }
  return pts
}

/** Oberkante des Radlaufs (Meter). */
function radlaufOben(radR: number): number {
  return radR + radR + 0.05
}

/** Seitenprofil (z, y) quer von x0 bis x1 ausgezogen, Kanten mit Fase
 *  gerundet (stufen Stuecke). Normalen weich, wo Flaechen weniger als 34
 *  Grad knicken. */
function prisma(profil: readonly P2[], x0: number, x1: number, fase: number, stufen = 2): BufferGeometry {
  const shape = new Shape(profil.map(([z, y]) => new Vector2(-z, y)))
  const breite = x1 - x0
  const t = Math.max(0, Math.min(fase, breite / 2 - 0.002))
  const mitFase = t > 0.001
  const g0 = new ExtrudeGeometry(shape, {
    depth: Math.max(0.001, breite - 2 * (mitFase ? t : 0)),
    steps: 1,
    curveSegments: 1,
    bevelEnabled: mitFase,
    bevelThickness: t,
    bevelSize: t,
    bevelOffset: -t,
    bevelSegments: stufen,
  })
  // Form-x ist -z des Wagens, Auszug (Form-z) wird x.
  g0.rotateY(Math.PI / 2)
  g0.translate(x0 + (mitFase ? t : 0), 0, 0)
  const r = roh(g0)
  const g = toCreasedNormals(r, 0.6)
  if (g !== r) r.dispose()
  return g
}

/** Billiger Kasten mit abgeschraegten Kanten im Seitenprofil (z, y), quer
 *  gerade (28 Dreiecke) oder mit kleiner Fase auch quer (60): fuer Lichter,
 *  Grill, Spiegel, Stossfaenger und alles Kleine. */
function stumpf(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, r: number, fase = 0): BufferGeometry {
  const rr = Math.max(0, Math.min(r, Math.abs(y1 - y0) / 2 - 0.001, Math.abs(z1 - z0) / 2 - 0.001))
  const profil = rundProfil(
    [
      [Math.min(z0, z1), Math.min(y0, y1), rr],
      [Math.min(z0, z1), Math.max(y0, y1), rr],
      [Math.max(z0, z1), Math.max(y0, y1), rr],
      [Math.max(z0, z1), Math.min(y0, y1), rr],
    ],
    1,
  )
  return prisma(profil, Math.min(x0, x1), Math.max(x0, x1), fase, 1)
}

/** Wo die Linie y das Profil schneidet: vorderste (kleinste) oder hinterste z. */
function kante(profil: readonly P2[], y: number, vorne: boolean): number {
  let best = vorne ? Infinity : -Infinity
  for (let i = 0; i < profil.length; i++) {
    const [z0, y0] = profil[i]
    const [z1, y1] = profil[(i + 1) % profil.length]
    if ((y0 - y) * (y1 - y) > 0 || y0 === y1) continue
    const t = (y - y0) / (y1 - y0)
    const z = z0 + (z1 - z0) * t
    best = vorne ? Math.min(best, z) : Math.max(best, z)
  }
  return Number.isFinite(best) ? best : 0
}

/** Hoehe einer Linie aus Punkten (z aufsteigend) an der Stelle z. */
function linieY(punkte: readonly P2[], z: number): number {
  if (z <= punkte[0][0]) return punkte[0][1]
  for (let i = 1; i < punkte.length; i++) {
    const [z0, y0] = punkte[i - 1]
    const [z1, y1] = punkte[i]
    if (z <= z1) return z1 > z0 ? y0 + ((y1 - y0) * (z - z0)) / (z1 - z0) : y1
  }
  return punkte[punkte.length - 1][1]
}

/** Lenkrad mit Speichen, Nabe und Saeule. Mitte (cx, cy, cz), Radius r, die
 *  Achse steigt nach hinten um steil (rad ueber der Waagrechten). */
function lenkrad(cx: number, cy: number, cz: number, r: number, steil: number): BufferGeometry {
  const teile = [
    roh(new TorusGeometry(r, 0.022, 5, 14)),
    quader(-r, r, -0.016, 0.016, -0.012, 0.012),
    quader(-0.016, 0.016, -r, 0, -0.012, 0.012),
    quader(-0.06, 0.06, -0.05, 0.05, -0.03, 0.02),
  ]
  const saeule = roh(new CylinderGeometry(0.032, 0.04, 0.34, 8, 1, true))
  saeule.rotateX(Math.PI / 2)
  saeule.translate(0, 0, -0.19)
  teile.push(saeule)
  const g = mergeGeometries(teile, false)
  for (const t of teile) t.dispose()
  if (!g) throw new Error('Fahrzeug: Lenkrad liess sich nicht zusammenfuegen')
  g.rotateX(-steil)
  g.translate(cx, cy, cz)
  return farbig(g, F.schwarz)
}

/** Ein Sitz: Kissen (Oberkante sitzY, vorne bei z0, tief), Lehne nach
 *  hinten geneigt, Kopfstuetze, Sockel bis boden. */
function sitz(out: BufferGeometry[], cx: number, breite: number, sitzY: number, z0: number, tief: number, lehne: number, boden: number, farbe: string = F.sitz): void {
  const neig = 0.2
  out.push(farbig(rund(cx - breite / 2, cx + breite / 2, sitzY - 0.13, sitzY, z0, z0 + tief, 0.04), farbe))
  const l = rund(-breite / 2, breite / 2, 0, lehne, -0.06, 0.06, 0.04)
  l.rotateX(neig)
  l.translate(cx, sitzY - 0.05, z0 + tief - 0.03)
  out.push(farbig(l, farbe))
  const k = quader(-0.13, 0.13, 0, 0.17, -0.045, 0.045)
  k.rotateX(neig)
  k.translate(cx, sitzY - 0.05 + (lehne + 0.03) * Math.cos(neig), z0 + tief - 0.03 + (lehne + 0.03) * Math.sin(neig))
  out.push(farbig(k, farbe))
  if (sitzY - 0.13 > boden + 0.02) out.push(farbig(quader(cx - breite * 0.32, cx + breite * 0.32, boden, sitzY - 0.13, z0 + 0.06, z0 + tief - 0.06), F.kunststoff))
}

/* ------------------------------------------------------------ Teilelisten */

/** Wo eine Schrift sitzt: Mitte (y, z), Abstand der Flaeche von der Mitte
 *  quer (x, Betrag), Hoehe der Buchstaben, groesste Breite. vorne: statt
 *  an den Seiten an der Front (z ist dann die Flaeche, x die Mitte). */
interface SchriftPlatz {
  text: string
  farbe: string
  x: number
  y: number
  z: number
  hoehe: number
  maxBreite: number
  vorne?: boolean
}

interface Bau {
  /** Wagenfarbe. */
  lack: BufferGeometry[]
  glas: BufferGeometry[]
  /** Farben je Ecke (Innenraum, Kunststoff, Stossfaenger, Spiegel ...). */
  matt: BufferGeometry[]
  /** Leuchten, unbeleuchtet hell (Scheinwerfer, Rueckleuchten, Anzeigen). */
  licht: BufferGeometry[]
  /** Duenne Teile dicht auf der Haut (Streifen, Fugen, Kennzeichen): mit
   *  Tiefenversatz, damit sie von weitem nicht flackern. */
  deko: BufferGeometry[]
  blauA: BufferGeometry[]
  blauB: BufferGeometry[]
  schrift: SchriftPlatz[]
  auge: V3
  ausstieg: [number, number]
}

function neuerBau(): Bau {
  return { lack: [], glas: [], matt: [], licht: [], deko: [], blauA: [], blauB: [], schrift: [], auge: [0, 1.2, 0], ausstieg: [-1.5, 0] }
}

/** Gemeinsames vorne: Scheinwerfer, Grill, Stossfaenger, Kennzeichen. */
function front(b: Bau, profil: readonly P2[], hb: number, lichtY: [number, number], lichtX: [number, number], grillX: number, grillY: [number, number], stoss: [number, number]): void {
  const fz = (y: number) => kante(profil, y, true)
  const zl = Math.min(fz(lichtY[0]), fz(lichtY[1]))
  for (const s of [-1, 1]) {
    const [a, c] = seite(s, lichtX[0], lichtX[1])
    b.licht.push(farbig(stumpf(a, c, lichtY[0], lichtY[1], zl - 0.012, zl + 0.09, 0.03), F.scheinwerfer))
    const [a2, c2] = seite(s, lichtX[1] - 0.06, lichtX[1] + 0.01)
    b.licht.push(farbig(quader(a2, c2, lichtY[0] - 0.05, lichtY[0] - 0.015, fz(lichtY[0] - 0.03) - 0.01, fz(lichtY[0] - 0.03) + 0.05), F.blinker))
  }
  const zg = Math.min(fz(grillY[0]), fz(grillY[1]))
  b.matt.push(farbig(stumpf(-grillX, grillX, grillY[0], grillY[1], zg - 0.01, zg + 0.08, 0.02), F.kunststoff))
  const zs = Math.min(fz(stoss[1]), fz((stoss[0] + stoss[1]) / 2))
  b.matt.push(farbig(stumpf(-(hb - 0.05), hb - 0.05, stoss[0], stoss[1], zs - 0.012, zs + 0.28, 0.04, 0.03), F.kunststoff))
  const yk = stoss[1] - 0.02
  const zk = zs - 0.014
  b.deko.push(farbig(quader(-0.26, 0.26, yk - 0.11, yk, zk - 0.006, zk + 0.004), F.kennzeichen))
  b.deko.push(farbig(quader(-0.26, -0.215, yk - 0.11, yk, zk - 0.008, zk + 0.002), F.euBlau))
}

/** Gemeinsames hinten: Rueckleuchten, Stossfaenger, Kennzeichen. */
function heck(b: Bau, profil: readonly P2[], hb: number, lichtY: [number, number], lichtX: [number, number], stoss: [number, number]): void {
  const hz = (y: number) => kante(profil, y, false)
  const zr = Math.max(hz(lichtY[0]), hz(lichtY[1]))
  for (const s of [-1, 1]) {
    const [a, c] = seite(s, lichtX[0], lichtX[1])
    b.licht.push(farbig(stumpf(a, c, lichtY[0], lichtY[1], zr - 0.09, zr + 0.012, 0.025), F.ruecklicht))
  }
  const zs = Math.max(hz(stoss[1]), hz((stoss[0] + stoss[1]) / 2))
  b.matt.push(farbig(stumpf(-(hb - 0.05), hb - 0.05, stoss[0], stoss[1], zs - 0.28, zs + 0.012, 0.04, 0.03), F.kunststoff))
  const yk = stoss[1] + 0.13
  const zk = Math.max(hz(yk), hz(yk - 0.11)) + 0.004
  b.deko.push(farbig(quader(-0.26, 0.26, yk - 0.11, yk, zk - 0.004, zk + 0.006), F.kennzeichen))
  b.deko.push(farbig(quader(-0.26, -0.215, yk - 0.11, yk, zk - 0.002, zk + 0.008), F.euBlau))
}

/** Aussenspiegel links und rechts: Arm, Gehaeuse (Lack), Spiegelglas. */
function spiegel(b: Bau, hb: number, y: number, z: number, gross: boolean): void {
  const h = gross ? 0.3 : 0.12
  const w = gross ? 0.13 : 0.17
  for (const s of [-1, 1]) {
    const [a, c] = seite(s, hb - 0.03, hb + 0.07)
    b.matt.push(farbig(quader(a, c, y + 0.02, y + 0.05, z + 0.06, z + 0.12), F.kunststoff))
    const [a2, c2] = seite(s, hb + 0.04, hb + 0.04 + w)
    b.lack.push(stumpf(a2, c2, y, y + h, z, z + 0.13, 0.04, 0.02))
    const [a3, c3] = seite(s, hb + 0.05, hb + 0.03 + w)
    b.matt.push(farbig(quader(a3, c3, y + 0.015, y + h - 0.015, z + 0.13, z + 0.136), F.spiegel))
  }
}

/** Dunkler Kasten im Radlauf zwischen den Raedern (man sieht nicht durch). */
function radkaesten(b: Bau, m: FahrzeugMasse): void {
  for (const [achse, spur, rb] of [
    [m.vorneZ, m.spurVorne, m.radB],
    [m.hintenZ, m.spurHinten, m.radBHinten],
  ] as const) {
    const r = m.radR + 0.05
    const innen = spur / 2 - rb / 2 - 0.03
    b.matt.push(farbig(quader(-innen, innen, m.radR * 0.4, radlaufOben(m.radR) + 0.02, achse - r, achse + r), F.schwarz))
  }
}

/* ------------------------------------------------------------ Pkw */

interface PkwMass {
  unten: number
  gurt: number
  haube: number
  /** Fuss der Windschutzscheibe, Dach vorne und hinten, Dachhoehe. */
  wsZ: number
  dachVZ: number
  dachHZ: number
  dachY: number
  /** Fuss der Heckscheibe (Heckklappe) und Oberkante des Hecks. */
  hsZ: number
  hsY: number
  heckY: number
  /** Ende des Vorderteils (unter dem Armaturenbrett), Beginn des Hinterteils. */
  fwZ: number
  hbZ: number
  /** Dunkle Saeulen zwischen den Seitenscheiben (z). */
  saeulen: number[]
  /** Ab hier hinten ist die Seite Blech statt Glas. */
  blechZ: number
  auge: V3
  /** Vorderkante der Vordersitze, Mitte des Lenkrads (z). */
  sitzZ: number
  lenkZ: number
}

function pkw(b: Bau, m: FahrzeugMasse, p: PkwMass, art: FahrzeugArt): void {
  const zF = -m.laenge / 2
  const zH = m.laenge / 2
  const hb = m.breite / 2
  const xg = hb - 0.07

  // Vorderteil mit Haube und Radlauf.
  const vorne = rundProfil([
    [zF + 0.12, p.unten, 0.06],
    [zF, p.unten + 0.24, 0.1],
    [zF + 0.05, p.haube - 0.03, 0.12],
    [p.wsZ, p.gurt, 0],
    [p.fwZ, p.gurt, 0],
    [p.fwZ, p.unten, 0],
    ...radlauf(m.vorneZ, m.radR, p.unten),
  ])
  b.lack.push(prisma(vorne, -hb, hb, 0.07))
  // Hinterteil mit Heckklappe und Radlauf.
  const hinten = rundProfil([
    [p.hbZ, p.unten, 0],
    [p.hbZ, p.gurt, 0],
    [p.hsZ, p.hsY, 0],
    [zH - 0.03, p.heckY, 0.1],
    [zH, p.unten + 0.28, 0.1],
    [zH - 0.1, p.unten, 0.05],
    ...radlauf(m.hintenZ, m.radR, p.unten),
  ])
  b.lack.push(prisma(hinten, -hb, hb, 0.07))
  // Tueren: duenne Seitenwaende, dazwischen ist der Innenraum offen.
  const tuer: P2[] = [
    [p.fwZ, p.unten],
    [p.fwZ, p.gurt],
    [p.hbZ, p.gurt],
    [p.hbZ, p.unten],
  ]
  b.lack.push(prisma(tuer, -hb, -hb + 0.08, 0.025), prisma(tuer, hb - 0.08, hb, 0.025))

  // Glas ueber der Guertellinie.
  const oben: P2[] = [
    [p.wsZ, p.gurt - 0.01],
    [p.dachVZ, p.dachY - 0.06],
    [p.dachHZ, p.dachY - 0.07],
    [p.hsZ, p.hsY - 0.01],
  ]
  const unten: P2[] = [
    [p.wsZ, p.gurt - 0.01],
    [p.hbZ, p.gurt - 0.01],
    [p.hsZ, p.hsY - 0.01],
  ]
  b.glas.push(
    prisma(
      rundProfil([
        [p.wsZ + 0.01, p.gurt - 0.01, 0],
        [p.dachVZ, p.dachY - 0.06, 0.06],
        [p.dachHZ, p.dachY - 0.07, 0.08],
        [p.hsZ, p.hsY - 0.01, 0],
        [p.hbZ, p.gurt - 0.01, 0],
      ]),
      -xg,
      xg,
      0.03,
    ),
  )
  // Dach.
  b.lack.push(
    prisma(
      rundProfil([
        [p.dachVZ - 0.07, p.dachY - 0.085, 0],
        [p.dachVZ + 0.1, p.dachY, 0.1],
        [p.dachHZ - 0.1, p.dachY, 0.1],
        [p.dachHZ + 0.07, p.dachY - 0.095, 0],
        [p.dachHZ, p.dachY - 0.115, 0],
        [p.dachVZ, p.dachY - 0.115, 0],
      ]),
      -(hb - 0.06),
      hb - 0.06,
      0.04,
    ),
  )
  for (const s of [-1, 1]) {
    // A-Saeulen und die Kanten der Heckklappe.
    b.lack.push(balken([s * xg, p.gurt, p.wsZ + 0.02], [s * xg, p.dachY - 0.075, p.dachVZ + 0.03], 0.075, 0.07))
    b.lack.push(balken([s * xg, p.hsY, p.hsZ - 0.01], [s * xg, p.dachY - 0.08, p.dachHZ - 0.02], 0.07, 0.07))
    // Dunkle Saeulen zwischen den Scheiben.
    for (const zs of p.saeulen) {
      const [a, c] = seite(s, xg - 0.005, xg + 0.012)
      b.matt.push(farbig(quader(a, c, linieY(unten, zs), linieY(oben, zs) + 0.005, zs - 0.045, zs + 0.045), F.schwarz))
    }
    // Blech hinten an der Seite (C- oder D-Saeule).
    const blech: P2[] = [
      [p.blechZ, linieY(unten, p.blechZ)],
      [p.blechZ, linieY(oben, p.blechZ) + 0.01],
    ]
    if (p.blechZ < p.dachHZ) blech.push([p.dachHZ, p.dachY - 0.06])
    blech.push([p.hsZ + 0.01, p.hsY])
    const [a, c] = seite(s, xg - 0.004, xg + 0.014)
    b.lack.push(prisma(blech, a, c, 0))
    // Fugen und Griffe der Tueren.
    const [fa, fc] = seite(s, hb - 0.001, hb + 0.003)
    for (const zs of p.saeulen.filter((z) => z < p.hbZ)) {
      b.deko.push(farbig(quader(fa, fc, p.unten + 0.1, p.gurt - 0.02, zs - 0.005, zs + 0.005), F.schwarz))
    }
    const [ga, gc] = seite(s, hb, hb + 0.02)
    for (const zg of [p.saeulen[0] - 0.2, p.hbZ - 0.18]) {
      b.matt.push(farbig(quader(ga, gc, p.gurt - 0.13, p.gurt - 0.1, zg - 0.07, zg + 0.07), F.kunststoff))
    }
  }
  spiegel(b, hb, p.gurt - 0.01, p.wsZ + 0.12, false)

  // Vorne und hinten.
  front(b, vorne, hb, [p.haube - 0.17, p.haube - 0.06], [hb - 0.44, hb - 0.1], hb - 0.48, [p.unten + 0.28, p.haube - 0.13], [p.unten, p.unten + 0.14])
  heck(b, hinten, hb, [p.heckY - 0.2, p.heckY - 0.07], [hb - 0.32, hb - 0.06], [p.unten, p.unten + 0.16])
  radkaesten(b, m)

  // Innenraum.
  const [ax, ay, az] = p.auge
  b.matt.push(farbig(quader(-(hb - 0.08), hb - 0.08, p.unten, p.unten + 0.12, p.fwZ, p.hbZ), F.innen))
  const dashZ0 = p.wsZ + 0.06
  b.matt.push(farbig(rund(-(hb - 0.1), hb - 0.1, p.gurt - 0.3, p.gurt - 0.01, dashZ0, p.lenkZ - 0.17, 0.03), F.innen))
  // Verkleidung der Tueren innen (sonst saehe man innen den Lack).
  for (const s of [-1, 1]) {
    const [a, c] = seite(s, hb - 0.1, hb - 0.08)
    b.matt.push(farbig(quader(a, c, p.unten + 0.12, p.gurt - 0.005, p.fwZ + 0.01, p.hbZ - 0.01), F.innen))
    const [a2, c2] = seite(s, hb - 0.16, hb - 0.08)
    b.matt.push(farbig(quader(a2, c2, p.gurt - 0.28, p.gurt - 0.24, p.fwZ + 0.1, p.hbZ - 0.1), F.kunststoff))
  }
  b.matt.push(farbig(stumpf(ax - 0.16, ax + 0.16, p.gurt - 0.03, p.gurt + 0.04, p.lenkZ - 0.3, p.lenkZ - 0.15, 0.025), F.kunststoff))
  b.licht.push(farbig(quader(ax - 0.12, ax + 0.12, p.gurt - 0.022, p.gurt + 0.025, p.lenkZ - 0.152, p.lenkZ - 0.147), F.anzeige))
  b.licht.push(farbig(quader(-0.11, 0.11, p.gurt - 0.22, p.gurt - 0.08, p.lenkZ - 0.172, p.lenkZ - 0.166), F.bildschirm))
  b.matt.push(farbig(quader(-0.11, 0.11, p.unten + 0.12, p.gurt - 0.27, p.lenkZ - 0.2, p.sitzZ + 0.42), F.innen))
  b.matt.push(lenkrad(ax, p.gurt - 0.09, p.lenkZ, 0.18, 0.44))
  const sitzY = p.unten + 0.32
  for (const cx of [ax, -ax]) sitz(b.matt, cx, 0.5, sitzY, p.sitzZ, 0.48, 0.62, p.unten + 0.12)
  // Ruecksitzbank an der Wand des Hinterteils.
  b.matt.push(farbig(stumpf(-(hb - 0.14), hb - 0.14, sitzY - 0.16, sitzY - 0.02, p.hbZ - 0.42, p.hbZ - 0.08, 0.04), F.sitz))
  b.matt.push(farbig(stumpf(-(hb - 0.14), hb - 0.14, sitzY - 0.05, p.gurt + 0.06, p.hbZ - 0.12, p.hbZ - 0.005, 0.04), F.sitz))
  // Himmel, Ablage hinten.
  b.matt.push(farbig(quader(-(xg - 0.03), xg - 0.03, p.dachY - 0.13, p.dachY - 0.116, p.dachVZ + 0.04, p.dachHZ - 0.04), F.himmel))
  b.matt.push(farbig(quader(-(hb - 0.1), hb - 0.1, p.gurt, p.gurt + 0.015, p.hbZ, p.hsZ - 0.06), F.kunststoff))

  if (art === 'kombi') {
    // Dachreling.
    for (const s of [-1, 1]) {
      const [a, c] = seite(s, hb - 0.2, hb - 0.16)
      b.matt.push(farbig(stumpf(a, c, p.dachY - 0.01, p.dachY + 0.035, p.dachVZ + 0.25, p.dachHZ - 0.12, 0.015), F.chrom))
    }
  }
  if (art === 'polizei') {
    // Blauer Streifen ueber den Radlaeufen, Schrift, Lichtbalken, Blitzer im Grill.
    // Nur im flachen Teil der Seite (unter der Rundung oben, ab dem Fuss der
    // Scheibe, vor der Rundung hinten), sonst stuende er ab.
    const y0 = radlaufOben(m.radR) + 0.03
    const y1 = p.gurt - 0.08
    for (const s of [-1, 1]) {
      const [a, c] = seite(s, hb - 0.001, hb + 0.004)
      b.deko.push(farbig(quader(a, c, y0, y1, p.wsZ, zH - 0.42), F.polizeiBlau))
    }
    b.schrift.push({ text: 'POLIZEI', farbe: '#ffffff', x: hb + 0.006, y: (y0 + y1) / 2, z: (p.fwZ + p.hbZ) / 2, hoehe: (y1 - y0) * 0.72, maxBreite: 1.05 })
    const zb = p.dachVZ + 0.45
    b.matt.push(farbig(stumpf(-0.56, 0.56, p.dachY - 0.01, p.dachY + 0.03, zb, zb + 0.3, 0.015), F.kunststoff))
    b.blauA.push(stumpf(-0.54, -0.07, p.dachY + 0.025, m.hoehe - 0.002, zb + 0.02, zb + 0.28, 0.025, 0.015))
    b.blauB.push(stumpf(0.07, 0.54, p.dachY + 0.025, m.hoehe - 0.002, zb + 0.02, zb + 0.28, 0.025, 0.015))
    b.matt.push(farbig(quader(-0.07, 0.07, p.dachY + 0.025, m.hoehe - 0.012, zb + 0.04, zb + 0.26), F.weiss))
    const fz = kante(vorne, p.unten + 0.33, true)
    b.blauA.push(quader(-0.4, -0.28, p.unten + 0.31, p.unten + 0.36, fz - 0.02, fz + 0.02))
    b.blauB.push(quader(0.28, 0.4, p.unten + 0.31, p.unten + 0.36, fz - 0.02, fz + 0.02))
  }
  b.auge = [ax, ay, az]
  b.ausstieg = [-(hb + 0.55), az]
}

/* ------------------------------------------------------------ Kastenwagen */

interface KastenMass {
  unten: number
  gurt: number
  haube: number
  wsZ: number
  dachVZ: number
  /** Dach der Kabine (Hoehe), Ende des Vorderteils, Ende der Kabine. */
  kabY: number
  fwZ: number
  kabHZ: number
  /** Kasten: Beginn (z), Unterkante, Oberkante. */
  kastenVZ: number
  kastenUnten: number
  kastenY: number
  auge: V3
  sitzZ: number
  lenkZ: number
  lenkY: number
}

function kastenwagen(b: Bau, m: FahrzeugMasse, k: KastenMass, art: FahrzeugArt): void {
  const zF = -m.laenge / 2
  const zH = m.laenge / 2
  const hb = m.breite / 2
  const xg = hb - 0.06
  const koffer = art === 'rettung'

  const vorne = rundProfil([
    [zF + 0.1, k.unten, 0.06],
    [zF, k.unten + 0.3, 0.1],
    [zF + 0.06, k.haube, 0.14],
    [k.wsZ, k.gurt, 0],
    [k.fwZ, k.gurt, 0],
    [k.fwZ, k.unten, 0],
    ...radlauf(m.vorneZ, m.radR, k.unten),
  ])
  b.lack.push(prisma(vorne, -hb, hb, 0.07))
  const tuer: P2[] = [
    [k.fwZ, k.unten],
    [k.fwZ, k.gurt],
    [k.kabHZ + 0.03, k.gurt],
    [k.kabHZ + 0.03, k.unten],
  ]
  b.lack.push(prisma(tuer, -hb, -hb + 0.08, 0.025), prisma(tuer, hb - 0.08, hb, 0.025))
  const oben: P2[] = [
    [k.wsZ, k.gurt - 0.01],
    [k.dachVZ, k.kabY - 0.07],
    [k.kabHZ + 0.03, k.kabY - 0.07],
  ]
  b.glas.push(
    prisma(
      rundProfil([
        [k.wsZ + 0.01, k.gurt - 0.01, 0],
        [k.dachVZ, k.kabY - 0.07, 0.08],
        [k.kabHZ + 0.03, k.kabY - 0.07, 0],
        [k.kabHZ + 0.03, k.gurt - 0.01, 0],
      ]),
      -xg,
      xg,
      0.03,
    ),
  )
  b.lack.push(
    prisma(
      rundProfil([
        [k.dachVZ - 0.06, k.kabY - 0.095, 0],
        [k.dachVZ + 0.12, k.kabY, 0.1],
        [k.kabHZ + 0.06, k.kabY, 0],
        [k.kabHZ + 0.06, k.kabY - 0.125, 0],
        [k.dachVZ, k.kabY - 0.125, 0],
      ]),
      -(hb - 0.05),
      hb - 0.05,
      0.04,
    ),
  )
  // Kasten (Laderaum) oder Koffer (Rettung), mit Radlauf hinten.
  b.lack.push(
    prisma(
      rundProfil([
        [k.kastenVZ, k.kastenUnten, 0.03],
        [k.kastenVZ, k.kastenY, koffer ? 0.08 : 0],
        [zH - 0.02, k.kastenY, 0.14],
        [zH, k.kastenUnten + 0.2, 0.06],
        [zH - 0.08, k.kastenUnten, 0.03],
        ...radlauf(m.hintenZ, m.radR, k.kastenUnten),
      ]),
      -hb,
      hb,
      koffer ? 0.06 : 0.08,
    ),
  )
  for (const s of [-1, 1]) {
    b.lack.push(balken([s * xg, k.gurt, k.wsZ + 0.02], [s * xg, k.kabY - 0.08, k.dachVZ + 0.03], 0.08, 0.075))
    // Fensterrahmen der Tuer hinten (B-Saeule) dunkel.
    const [a, c] = seite(s, xg - 0.005, xg + 0.014)
    b.matt.push(farbig(quader(a, c, k.gurt - 0.01, linieY(oben, k.kabHZ) + 0.005, k.kabHZ - 0.02, k.kabHZ + 0.04), F.schwarz))
    const [ga, gc] = seite(s, hb, hb + 0.02)
    b.matt.push(farbig(quader(ga, gc, k.gurt - 0.15, k.gurt - 0.12, k.kabHZ - 0.2, k.kabHZ - 0.06), F.kunststoff))
  }
  spiegel(b, hb, k.gurt + 0.02, k.wsZ + 0.12, true)
  front(b, vorne, hb, [k.haube - 0.2, k.haube - 0.07], [hb - 0.42, hb - 0.08], hb - 0.46, [k.unten + 0.3, k.haube - 0.13], [k.unten, k.unten + 0.16])
  radkaesten(b, m)

  // Heck: Leuchten senkrecht an den Ecken, Fuge der Tueren, Stossfaenger.
  for (const s of [-1, 1]) {
    const [a, c] = seite(s, hb - 0.15, hb - 0.03)
    b.licht.push(farbig(stumpf(a, c, k.kastenUnten + 0.4, k.kastenUnten + 0.95, zH - 0.06, zH + 0.008, 0.02), F.ruecklicht))
  }
  b.deko.push(farbig(quader(-0.006, 0.006, k.kastenUnten + 0.12, k.kastenY - 0.12, zH, zH + 0.004), F.schwarz))
  b.matt.push(farbig(stumpf(-(hb - 0.05), hb - 0.05, k.unten - 0.02, k.unten + 0.14, zH - 0.25, zH + 0.01, 0.04, 0.03), F.kunststoff))
  b.deko.push(farbig(quader(-0.26, 0.26, k.kastenUnten + 0.22, k.kastenUnten + 0.33, zH - 0.002, zH + 0.008), F.kennzeichen))
  if (k.kastenUnten > k.unten + 0.05) {
    // Unter dem Koffer: Rahmen.
    b.matt.push(farbig(quader(-(hb - 0.4), hb - 0.4, k.unten - 0.02, k.kastenUnten + 0.01, k.kastenVZ + 0.05, zH - 0.3), F.schwarz))
  }

  // Innenraum der Kabine.
  const [ax, ay, az] = k.auge
  const boden = k.unten + 0.15
  b.matt.push(farbig(quader(-(hb - 0.08), hb - 0.08, k.unten, boden, k.fwZ, k.kabHZ + 0.02), F.innen))
  const trennZ = Math.min(k.kabHZ, k.kastenVZ)
  b.matt.push(farbig(quader(-(hb - 0.08), hb - 0.08, boden, k.kabY - 0.13, trennZ - 0.014, trennZ - 0.004), F.aluDunkel))
  b.matt.push(farbig(rund(-(hb - 0.1), hb - 0.1, k.gurt - 0.32, k.gurt + 0.01, k.wsZ + 0.08, k.lenkZ - 0.15, 0.03), F.innen))
  for (const s of [-1, 1]) {
    const [a, c] = seite(s, hb - 0.1, hb - 0.08)
    b.matt.push(farbig(quader(a, c, boden, k.gurt - 0.005, k.fwZ + 0.01, k.kabHZ), F.innen))
  }
  b.matt.push(farbig(stumpf(ax - 0.17, ax + 0.17, k.gurt + 0.03, k.gurt + 0.1, k.lenkZ - 0.3, k.lenkZ - 0.13, 0.025), F.kunststoff))
  b.licht.push(farbig(quader(ax - 0.13, ax + 0.13, k.gurt + 0.04, k.gurt + 0.085, k.lenkZ - 0.132, k.lenkZ - 0.127), F.anzeige))
  b.matt.push(lenkrad(ax, k.lenkY, k.lenkZ, 0.19, 0.7))
  const sitzY = boden + 0.45
  sitz(b.matt, ax, 0.5, sitzY, k.sitzZ, 0.46, 0.64, boden)
  sitz(b.matt, -ax + 0.05, 0.62, sitzY, k.sitzZ, 0.46, 0.64, boden)
  b.matt.push(farbig(quader(-(xg - 0.03), xg - 0.03, k.kabY - 0.14, k.kabY - 0.126, k.dachVZ + 0.05, trennZ - 0.02), F.himmel))

  if (art === 'transporter') {
    // Schiebetuer rechts (Fugen), Schiene, Fenster hinten.
    const x = hb + 0.002
    const y0 = k.kastenUnten + 0.1
    const y1 = k.kastenY - 0.32
    const z0 = k.kastenVZ + 0.2
    const z1 = k.kastenVZ + 1.4
    b.deko.push(farbig(quader(x - 0.004, x + 0.003, y0, y1, z0 - 0.006, z0 + 0.006), F.schwarz))
    b.deko.push(farbig(quader(x - 0.004, x + 0.003, y0, y1, z1 - 0.006, z1 + 0.006), F.schwarz))
    b.deko.push(farbig(quader(x - 0.004, x + 0.003, y1 - 0.006, y1 + 0.006, z0, z1), F.schwarz))
    b.matt.push(farbig(quader(x - 0.004, x + 0.012, k.gurt + 0.18, k.gurt + 0.21, z1, zH - 0.25), F.kunststoff))
    for (const s of [-1, 1]) {
      const [a, c] = seite(s, 0.06, hb - 0.2)
      b.matt.push(farbig(quader(a, c, k.kastenY - 0.75, k.kastenY - 0.22, zH - 0.004, zH + 0.006), F.schwarz))
    }
  } else {
    // Rettung: Streifen rot und orange, Schrift, Milchglasfenster, Blaulicht.
    const ya = radlaufOben(m.radR) + 0.02
    const yb = ya + 0.15
    const yc = yb + 0.15
    for (const s of [-1, 1]) {
      const [a, c] = seite(s, hb - 0.001, hb + 0.004)
      for (const [z0, z1] of [
        [k.fwZ + 0.03, k.kabHZ],
        [k.kastenVZ + 0.08, zH - 0.08],
      ] as const) {
        b.deko.push(farbig(quader(a, c, ya, yb, z0, z1), F.orange))
        b.deko.push(farbig(quader(a, c, yb, Math.min(yc, k.gurt - 0.02), z0, z1), F.rot))
      }
      const [ma, mc] = seite(s, hb - 0.002, hb + 0.005)
      b.deko.push(farbig(quader(ma, mc, k.kastenY - 0.85, k.kastenY - 0.42, k.kastenVZ + 0.35, k.kastenVZ + 0.95), F.milchglas))
    }
    b.deko.push(farbig(quader(-(hb - 0.1), hb - 0.1, ya, yb, zH - 0.001, zH + 0.004), F.orange))
    b.deko.push(farbig(quader(-(hb - 0.1), hb - 0.1, yb, yc, zH - 0.001, zH + 0.004), F.rot))
    b.schrift.push({ text: 'RETTUNG', farbe: F.rot, x: hb + 0.006, y: k.kastenY - 0.9 - 0.2, z: (k.kastenVZ + zH) / 2 + 0.35, hoehe: 0.26, maxBreite: 2 })
    for (const s of [-1, 1]) {
      const [a, c] = seite(s, hb - 0.38, hb - 0.04)
      const vorneLicht = stumpf(a, c, k.kastenY - 0.012, m.hoehe - 0.002, k.kastenVZ + 0.04, k.kastenVZ + 0.3, 0.03, 0.015)
      const hintenLicht = stumpf(a, c, k.kastenY - 0.012, m.hoehe - 0.002, zH - 0.3, zH - 0.05, 0.03, 0.015)
      if (s < 0) {
        b.blauA.push(vorneLicht)
        b.blauB.push(hintenLicht)
      } else {
        b.blauB.push(vorneLicht)
        b.blauA.push(hintenLicht)
      }
    }
    const fz = kante(vorne, k.unten + 0.36, true)
    b.blauA.push(quader(-0.45, -0.32, k.unten + 0.33, k.unten + 0.39, fz - 0.02, fz + 0.02))
    b.blauB.push(quader(0.32, 0.45, k.unten + 0.33, k.unten + 0.39, fz - 0.02, fz + 0.02))
  }
  b.auge = [ax, ay, az]
  b.ausstieg = [-(hb + 0.55), az]
}

/* ------------------------------------------------------------ Feuerwehr */

/** Rollladen: waagrechte Lamellen hell und dunkel abwechselnd, als duenne
 *  Flaeche auf der Seite s (x = Flaeche aussen) oder hinten (s = 0, z = x). */
function rollladen(out: BufferGeometry[], s: number, flaeche: number, a0: number, a1: number, y0: number, y1: number): void {
  const n = Math.max(2, Math.round((y1 - y0) / 0.09))
  const pos: number[] = []
  const col: number[] = []
  const nor: number[] = []
  const hell = new Color(F.alu)
  const dunkel = new Color(F.aluDunkel)
  for (let i = 0; i < n; i++) {
    const ya = y0 + ((y1 - y0) * i) / n
    const yb = y0 + ((y1 - y0) * (i + 1)) / n
    const c = i % 2 === 0 ? hell : dunkel
    // Ecken der Lamelle; die Reihenfolge zeigt nach aussen.
    let q: V3[]
    if (s > 0) q = [[flaeche, ya, a1], [flaeche, ya, a0], [flaeche, yb, a0], [flaeche, yb, a1]]
    else if (s < 0) q = [[-flaeche, ya, a0], [-flaeche, ya, a1], [-flaeche, yb, a1], [-flaeche, yb, a0]]
    else q = [[a0, ya, flaeche], [a1, ya, flaeche], [a1, yb, flaeche], [a0, yb, flaeche]]
    for (const k of [0, 1, 2, 0, 2, 3]) {
      pos.push(...q[k])
      col.push(c.r, c.g, c.b)
      nor.push(s > 0 ? 1 : s < 0 ? -1 : 0, 0, s === 0 ? 1 : 0)
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
  g.setAttribute('normal', new BufferAttribute(new Float32Array(nor), 3))
  g.setAttribute('color', new BufferAttribute(new Float32Array(col), 3))
  out.push(g)
}

function feuerwehr(b: Bau, m: FahrzeugMasse): void {
  const zF = -m.laenge / 2
  const zH = m.laenge / 2
  const hb = m.breite / 2
  const xg = hb - 0.04
  const kabHZ = -2.05
  const tuerVZ = -3.55
  const kabBoden = 1.35
  const gurt = 1.95
  const dachY = 2.95
  const aufbauVZ = -1.95
  const aufbauUnten = 0.6

  // Fahrerhaus unten: Front, Stufe des Armaturenbretts, Boden der Kabine.
  const kabine = rundProfil([
    [zF + 0.1, 0.55, 0.05],
    [zF, 0.78, 0.05],
    [zF, 1.72, 0.08],
    [zF + 0.35, 1.75, 0],
    [tuerVZ, 1.75, 0],
    [tuerVZ, kabBoden, 0],
    [kabHZ, kabBoden, 0],
    [kabHZ, 0.55, 0],
    ...radlauf(m.vorneZ, m.radR, 0.55),
  ])
  b.lack.push(prisma(kabine, -hb, hb, 0.08))
  const tuer = rundProfil([
    [tuerVZ, kabBoden, 0],
    [tuerVZ, gurt, 0],
    [kabHZ, gurt, 0.02],
    [kabHZ, kabBoden, 0],
  ])
  b.lack.push(prisma(tuer, -hb, -hb + 0.08, 0.025), prisma(tuer, hb - 0.08, hb, 0.025))
  b.glas.push(
    prisma(
      rundProfil([
        [zF + 0.03, 1.73, 0],
        [zF + 0.13, dachY - 0.09, 0.05],
        [kabHZ - 0.05, dachY - 0.09, 0],
        [kabHZ - 0.05, gurt - 0.02, 0],
        [tuerVZ + 0.05, gurt - 0.02, 0],
        [tuerVZ, 1.74, 0],
      ]),
      -xg,
      xg,
      0.03,
    ),
  )
  b.lack.push(
    prisma(
      rundProfil([
        [zF + 0.08, dachY - 0.11, 0],
        [zF + 0.2, dachY, 0.08],
        [kabHZ, dachY, 0],
        [kabHZ, dachY - 0.13, 0],
        [zF + 0.1, dachY - 0.13, 0],
      ]),
      -(hb - 0.03),
      hb - 0.03,
      0.04,
    ),
  )
  // Rueckwand der Kabine.
  b.lack.push(quader(-(hb - 0.03), hb - 0.03, kabBoden, dachY - 0.02, kabHZ - 0.09, kabHZ))
  for (const s of [-1, 1]) {
    b.lack.push(balken([s * xg, 1.74, zF + 0.04], [s * xg, dachY - 0.1, zF + 0.14], 0.09, 0.08))
    const [a, c] = seite(s, xg - 0.005, xg + 0.014)
    b.matt.push(farbig(quader(a, c, 1.74, dachY - 0.09, tuerVZ - 0.03, tuerVZ + 0.05), F.schwarz))
    // Stufen unter der Tuer.
    const [sa, sc] = seite(s, hb - 0.3, hb + 0.005)
    for (const y of [0.78, 1.08]) b.matt.push(farbig(quader(sa, sc, y - 0.03, y, tuerVZ + 0.15, tuerVZ + 0.6), F.aluDunkel))
    const [ga, gc] = seite(s, hb, hb + 0.02)
    b.matt.push(farbig(quader(ga, gc, gurt - 0.2, gurt - 0.17, kabHZ - 0.25, kabHZ - 0.1), F.kunststoff))
  }
  // Grosse Spiegel am Arm.
  for (const s of [-1, 1]) {
    const [a, c] = seite(s, hb - 0.02, hb + 0.1)
    b.matt.push(farbig(quader(a, c, 2.0, 2.04, zF + 0.1, zF + 0.14), F.kunststoff))
    const [a2, c2] = seite(s, hb + 0.08, hb + 0.24)
    b.matt.push(farbig(rund(a2, c2, 1.75, 2.3, zF + 0.08, zF + 0.17, 0.03), F.kunststoff))
    const [a3, c3] = seite(s, hb + 0.09, hb + 0.23)
    b.matt.push(farbig(quader(a3, c3, 1.77, 2.28, zF + 0.17, zF + 0.176), F.spiegel))
  }
  // Front: Grill, Scheinwerfer, Stossfaenger, Schrift.
  b.matt.push(farbig(rund(-0.8, 0.8, 0.95, 1.45, zF - 0.012, zF + 0.04, 0.02), F.kunststoff))
  for (const s of [-1, 1]) {
    const [a, c] = seite(s, 0.85, 1.12)
    b.licht.push(farbig(rund(a, c, 0.88, 1.03, zF - 0.012, zF + 0.04, 0.02), F.scheinwerfer))
    const [a2, c2] = seite(s, 0.85, 1.12)
    b.licht.push(farbig(quader(a2, c2, 0.8, 0.86, zF - 0.01, zF + 0.03), F.blinker))
  }
  b.matt.push(farbig(rund(-(hb - 0.02), hb - 0.02, 0.5, 0.76, zF - 0.008, zF + 0.3, 0.03), F.aluDunkel))
  b.deko.push(farbig(quader(-0.26, 0.26, 0.6, 0.71, zF - 0.012, zF - 0.006), F.kennzeichen))
  b.schrift.push({ text: 'FEUERWEHR', farbe: '#ffffff', x: 0, y: 1.6, z: zF - 0.008, hoehe: 0.15, maxBreite: 1.5, vorne: true })
  b.schrift.push({ text: 'FEUERWEHR', farbe: '#ffffff', x: hb + 0.006, y: 1.65, z: (tuerVZ + kabHZ) / 2, hoehe: 0.17, maxBreite: 1.3 })

  // Aufbau mit Geraeteraeumen.
  const aufbau = rundProfil([
    [aufbauVZ, aufbauUnten, 0],
    [aufbauVZ, dachY, 0.04],
    [zH - 0.02, dachY, 0.06],
    [zH, aufbauUnten + 0.02, 0.04],
    ...radlauf(m.hintenZ, m.radR, aufbauUnten),
  ])
  b.lack.push(prisma(aufbau, -(hb - 0.02), hb - 0.02, 0.06))
  const ra = radlaufOben(m.radR)
  const faecher: [number, number, number][] = [
    [aufbauVZ + 0.1, -0.25, 0.72],
    [-0.15, 1.45, 0.72],
    [1.55, 2.65, ra + 0.12],
    [2.75, zH - 0.12, 0.72],
  ]
  for (const s of [-1, 1]) {
    for (const [z0, z1, y0] of faecher) {
      rollladen(b.deko, s, hb - 0.012, z0, z1, y0, 2.84)
      const [a, c] = seite(s, hb - 0.012, hb + 0.012)
      b.matt.push(farbig(quader(a, c, y0 + 0.02, y0 + 0.06, z0 + 0.1, z1 - 0.1), F.kunststoff))
    }
    // Weisser Streifen unten (nicht ueber dem Radlauf).
    const [a, c] = seite(s, hb - 0.021, hb - 0.014)
    for (const [z0, z1] of [
      [aufbauVZ + 0.05, m.hintenZ - 0.6],
      [m.hintenZ + 0.6, zH - 0.05],
    ] as const) {
      b.deko.push(farbig(quader(a, c, aufbauUnten + 0.02, aufbauUnten + 0.09, z0, z1), F.weiss))
    }
  }
  // Heck: Rollladen, Leuchten, Stufe.
  rollladen(b.deko, 0, zH + 0.004, -(hb - 0.18), hb - 0.18, 0.8, 2.82)
  for (const s of [-1, 1]) {
    const [a, c] = seite(s, hb - 0.16, hb - 0.03)
    b.licht.push(farbig(quader(a, c, 0.7, 1.05, zH - 0.02, zH + 0.008), F.ruecklicht))
  }
  b.matt.push(farbig(quader(-(hb - 0.12), hb - 0.12, 0.42, 0.6, zH - 0.3, zH + 0.005), F.aluDunkel))
  b.matt.push(farbig(quader(-0.55, 0.55, 0.42, aufbauUnten + 0.01, kabHZ, zH - 0.3), F.schwarz))
  radkaesten(b, m)
  // Leiter auf dem Dach.
  for (const s of [-1, 1]) {
    const [a, c] = seite(s, 0.37, 0.43)
    b.matt.push(farbig(quader(a, c, 3.0, 3.1, -2.9, zH - 0.08), F.alu))
    for (const z of [-2.0, 0.5, 3.0]) b.matt.push(farbig(quader(a, c, dachY, 3.0, z - 0.05, z + 0.05), F.aluDunkel))
  }
  for (let z = -2.8; z <= zH - 0.15; z += 0.3) b.matt.push(farbig(quader(-0.37, 0.37, 3.03, 3.07, z - 0.02, z + 0.02), F.alu))
  // Blaulicht: Balken auf der Kabine, zwei hinten.
  b.matt.push(farbig(rund(-0.95, 0.95, dachY - 0.01, dachY + 0.05, -3.86, -3.58, 0.02), F.kunststoff))
  b.blauA.push(rund(-0.93, -0.12, dachY + 0.045, 3.15, -3.84, -3.6, 0.03))
  b.blauB.push(rund(0.12, 0.93, dachY + 0.045, 3.15, -3.84, -3.6, 0.03))
  b.blauB.push(rund(-(hb - 0.05), -(hb - 0.3), dachY - 0.01, 3.1, zH - 0.3, zH - 0.06, 0.03))
  b.blauA.push(rund(hb - 0.3, hb - 0.05, dachY - 0.01, 3.1, zH - 0.3, zH - 0.06, 0.03))
  b.blauA.push(quader(-0.75, -0.6, 1.3, 1.38, zF - 0.02, zF + 0.02))
  b.blauB.push(quader(0.6, 0.75, 1.3, 1.38, zF - 0.02, zF + 0.02))

  // Kabine innen.
  const auge: V3 = [-0.6, 2.52, -2.95]
  b.matt.push(farbig(rund(-(hb - 0.08), hb - 0.08, 1.75, 1.93, zF + 0.06, -3.47, 0.03), F.innen))
  for (const s of [-1, 1]) {
    const [a, c] = seite(s, hb - 0.1, hb - 0.08)
    b.matt.push(farbig(quader(a, c, kabBoden, gurt - 0.005, tuerVZ, kabHZ - 0.09), F.innen))
  }
  b.matt.push(farbig(rund(auge[0] - 0.2, auge[0] + 0.2, 1.92, 2.0, -3.68, -3.5, 0.025), F.kunststoff))
  b.licht.push(farbig(quader(auge[0] - 0.15, auge[0] + 0.15, 1.93, 1.99, -3.502, -3.497), F.anzeige))
  b.matt.push(lenkrad(auge[0], 2.1, -3.36, 0.24, 1.05))
  const sitzY = kabBoden + 0.48
  sitz(b.matt, auge[0], 0.52, sitzY, -3.28, 0.48, 0.66, kabBoden)
  sitz(b.matt, -auge[0], 0.52, sitzY, -3.28, 0.48, 0.66, kabBoden)
  b.matt.push(farbig(rund(-(hb - 0.15), hb - 0.15, sitzY - 0.15, sitzY, -2.62, -2.2, 0.04), F.sitz))
  b.matt.push(farbig(rund(-(hb - 0.15), hb - 0.15, sitzY, sitzY + 0.6, -2.24, -2.15, 0.04), F.sitz))
  b.matt.push(farbig(quader(-(xg - 0.03), xg - 0.03, dachY - 0.145, dachY - 0.131, zF + 0.15, kabHZ - 0.1), F.himmel))
  b.auge = auge
  b.ausstieg = [-(hb + 0.55), -2.85]
}

/* ------------------------------------------------------------ Bus */

function bus(b: Bau, m: FahrzeugMasse): void {
  const zF = -m.laenge / 2
  const zH = m.laenge / 2
  const hb = m.breite / 2
  const unten = 0.3
  const gurt = 1.1
  const dachY = 2.95
  const frontZ = zF + 0.35
  const heckZ = zH - 0.25
  const tueren: [number, number][] = [
    [frontZ, -4.5],
    [-0.55, 0.65],
    [4.55, 5.5],
  ]

  // Front unten, Heckwand, Seitenwaende unter den Fenstern.
  const front0 = rundProfil([
    [zF + 0.06, unten, 0.04],
    [zF, unten + 0.2, 0.05],
    [zF, 0.98, 0.04],
    [frontZ, 0.98, 0],
    [frontZ, unten, 0],
  ])
  b.lack.push(prisma(front0, -hb, hb, 0.08))
  const heckP = rundProfil([
    [heckZ, unten, 0],
    [heckZ, dachY - 0.05, 0],
    [zH - 0.01, dachY - 0.05, 0.08],
    [zH, unten + 0.15, 0.05],
    [zH - 0.06, unten, 0.03],
  ])
  b.lack.push(prisma(heckP, -hb, hb, 0.08))
  /** Seitenwand von z0 bis z1 mit den Radlaeufen darin. */
  const wand = (z0: number, z1: number): P2[] => {
    const ecken: Ecke[] = [
      [z0, unten, 0],
      [z0, gurt, 0],
      [z1, gurt, 0],
      [z1, unten, 0],
    ]
    for (const achse of [m.hintenZ, m.vorneZ]) {
      const r = m.radR + 0.05
      if (achse - r > z0 && achse + r < z1) ecken.push(...radlauf(achse, m.radR, unten))
    }
    return rundProfil(ecken)
  }
  b.lack.push(prisma(wand(frontZ, heckZ), -hb, -hb + 0.08, 0.03))
  let z = frontZ
  for (const [t0, t1] of tueren) {
    if (t0 > z + 0.05) b.lack.push(prisma(wand(z, t0), hb - 0.08, hb, 0.03))
    z = t1
  }
  if (heckZ > z + 0.05) b.lack.push(prisma(wand(z, heckZ), hb - 0.08, hb, 0.03))

  // Fensterband und Windschutzscheibe.
  const xg = hb - 0.03
  b.glas.push(
    prisma(
      rundProfil([
        [zF + 0.02, 0.98, 0],
        [zF + 0.06, 2.72, 0.05],
        [heckZ + 0.02, 2.72, 0],
        [heckZ + 0.02, gurt, 0],
        [frontZ, gurt, 0],
        [frontZ, 0.98, 0],
      ]),
      -xg,
      xg,
      0.03,
    ),
  )
  // Dach mit Klimageraet.
  b.lack.push(
    prisma(
      rundProfil([
        [zF + 0.03, 2.7, 0],
        [zF + 0.15, dachY, 0.12],
        [zH - 0.05, dachY, 0.1],
        [zH, 2.7, 0],
      ]),
      -hb,
      hb,
      0.08,
    ),
  )
  b.matt.push(farbig(rund(-0.8, 0.8, dachY - 0.02, m.hoehe - 0.002, -1.5, 1.2, 0.05), F.alu))
  // Fenstersaeulen in Wagenfarbe.
  for (const s of [-1, 1]) {
    for (let zs = zF + 1.25; zs < heckZ - 0.3; zs += 1.32) {
      if (s > 0 && tueren.some(([t0, t1]) => zs > t0 - 0.1 && zs < t1 + 0.1)) continue
      const [a, c] = seite(s, xg - 0.005, xg + 0.014)
      b.lack.push(quader(a, c, gurt, 2.72, zs - 0.05, zs + 0.05))
    }
    // Ecksaeulen vorne.
    b.matt.push(farbig(balken([s * (xg - 0.01), 0.98, zF + 0.04], [s * (xg - 0.01), 2.71, zF + 0.08], 0.08, 0.08), F.schwarz))
  }
  // Tueren rechts: Glas bis unten, dunkle Rahmen.
  const tx = hb - 0.02
  for (const [t0, t1] of tueren) {
    b.glas.push(quader(tx - 0.01, tx + 0.01, unten + 0.06, gurt + 0.01, t0 + 0.02, t1 - 0.02))
    const mitte = (t0 + t1) / 2
    for (const zr of [t0 + 0.02, mitte, t1 - 0.02]) b.matt.push(farbig(quader(tx - 0.01, tx + 0.025, unten + 0.04, 2.7, zr - 0.035, zr + 0.035), F.schwarz))
    b.matt.push(farbig(quader(tx - 0.01, tx + 0.025, 2.62, 2.7, t0, t1), F.schwarz))
    b.matt.push(farbig(quader(tx - 0.01, tx + 0.025, unten + 0.03, unten + 0.08, t0, t1), F.schwarz))
  }
  // Front: Scheinwerfer, Stossfaenger, Kennzeichen, Liniendisplay, Spiegel.
  for (const s of [-1, 1]) {
    const [a, c] = seite(s, 0.75, 1.15)
    b.licht.push(farbig(rund(a, c, 0.55, 0.68, zF - 0.01, zF + 0.04, 0.02), F.scheinwerfer))
    const [a2, c2] = seite(s, 1.0, 1.15)
    b.licht.push(farbig(quader(a2, c2, 0.48, 0.53, zF - 0.008, zF + 0.03), F.blinker))
  }
  b.matt.push(farbig(rund(-(hb - 0.03), hb - 0.03, unten, 0.46, zF - 0.01, zF + 0.25, 0.04), F.kunststoff))
  b.deko.push(farbig(quader(-0.26, 0.26, 0.32, 0.43, zF - 0.014, zF - 0.008), F.kennzeichen))
  b.matt.push(farbig(quader(-0.82, 0.82, 2.42, 2.68, zF + 0.12, zF + 0.2), F.schwarz))
  b.licht.push(farbig(quader(-0.75, 0.75, 2.47, 2.63, zF + 0.11, zF + 0.12), F.display))
  for (const s of [-1, 1]) {
    const [a, c] = seite(s, hb - 0.05, hb + 0.12)
    b.matt.push(farbig(quader(a, c, 2.5, 2.54, zF + 0.1, zF + 0.14), F.kunststoff))
    const [a2, c2] = seite(s, hb + 0.08, hb + 0.24)
    b.matt.push(farbig(rund(a2, c2, 2.05, 2.5, zF + 0.08, zF + 0.17, 0.03), F.kunststoff))
    const [a3, c3] = seite(s, hb + 0.09, hb + 0.23)
    b.matt.push(farbig(quader(a3, c3, 2.07, 2.48, zF + 0.17, zF + 0.176), F.spiegel))
  }
  // Heck: Leuchten, Fenster, Motorgitter.
  for (const s of [-1, 1]) {
    const [a, c] = seite(s, hb - 0.2, hb - 0.04)
    b.licht.push(farbig(rund(a, c, 0.55, 1.05, zH - 0.02, zH + 0.008, 0.02), F.ruecklicht))
  }
  b.matt.push(farbig(quader(-0.95, 0.95, 1.9, 2.6, zH - 0.004, zH + 0.006), F.schwarz))
  b.matt.push(farbig(quader(-0.8, 0.8, 0.65, 1.25, zH - 0.004, zH + 0.006), F.kunststoff))
  b.matt.push(farbig(rund(-(hb - 0.03), hb - 0.03, unten, 0.5, zH - 0.22, zH + 0.008, 0.04), F.kunststoff))
  b.deko.push(farbig(quader(-0.26, 0.26, 1.35, 1.46, zH + 0.006, zH + 0.01), F.kennzeichen))

  // Boden, Radkaesten, Sitze.
  const ri = m.radR + 0.05
  const vorneR: [number, number] = [m.vorneZ - ri, m.vorneZ + ri]
  const hintenR: [number, number] = [m.hintenZ - ri, m.hintenZ + ri]
  b.matt.push(farbig(quader(-0.62, 0.62, unten, unten + 0.08, frontZ, heckZ), F.innen))
  for (const s of [-1, 1]) {
    const [a, c] = seite(s, 0.62, hb - 0.08)
    for (const [z0, z1] of [
      [frontZ, vorneR[0]],
      [vorneR[1], hintenR[0]],
      [hintenR[1], heckZ],
    ] as const) {
      b.matt.push(farbig(quader(a, c, unten, unten + 0.08, z0, z1), F.innen))
    }
    const [va, vc] = seite(s, m.spurVorne / 2 - m.radB / 2 - 0.03, hb - 0.08)
    b.matt.push(farbig(quader(va, vc, unten, gurt, vorneR[0], vorneR[1]), F.kunststoff))
    const [ha, hc] = seite(s, m.spurHinten / 2 - m.radBHinten / 2 - 0.03, hb - 0.08)
    b.matt.push(farbig(quader(ha, hc, unten, gurt, hintenR[0], hintenR[1]), F.kunststoff))
  }
  radkaesten(b, m)
  const sitzReihe = (z0: number, xs: readonly number[]) => {
    for (const x of xs) {
      b.matt.push(farbig(quader(x - 0.2, x + 0.2, 0.74, 0.84, z0, z0 + 0.42), F.busSitz))
      b.matt.push(farbig(quader(x - 0.2, x + 0.2, 0.84, 1.4, z0 + 0.38, z0 + 0.45), F.busSitz))
      b.matt.push(farbig(quader(x - 0.12, x + 0.12, unten + 0.08, 0.74, z0 + 0.1, z0 + 0.3), F.kunststoff))
    }
  }
  const links = [-1.0, -0.56]
  const rechts = [0.56, 1.0]
  for (let zs = -4.25; zs < heckZ - 0.6; zs += 0.82) {
    const imRad = (r: [number, number]) => zs + 0.45 > r[0] - 0.05 && zs < r[1] + 0.05
    if (!imRad(vorneR) && !imRad(hintenR)) sitzReihe(zs, links)
    const anTuer = tueren.some(([t0, t1]) => zs + 0.45 > t0 - 0.3 && zs < t1 + 0.3)
    if (!anTuer && !imRad(vorneR) && !imRad(hintenR)) sitzReihe(zs, rechts)
  }
  for (const [t0, t1] of tueren) {
    for (const zr of [t0 - 0.1, t1 + 0.1]) {
      if (zr < frontZ + 0.05 || zr > heckZ - 0.05) continue
      b.matt.push(farbig(quader(hb - 0.33, hb - 0.29, unten + 0.08, 2.65, zr - 0.02, zr + 0.02), F.gelb))
    }
  }
  b.matt.push(farbig(quader(-(xg - 0.03), xg - 0.03, 2.69, 2.705, frontZ, heckZ - 0.05), F.himmel))
  // Verkleidung der Seitenwaende innen, rechts ohne die Tueren.
  b.matt.push(farbig(quader(-(hb - 0.08), -(hb - 0.1), unten + 0.08, gurt - 0.005, frontZ, heckZ), F.himmel))
  let zv = frontZ
  for (const [t0, t1] of [...tueren, [heckZ, heckZ] as [number, number]]) {
    if (t0 > zv + 0.05) b.matt.push(farbig(quader(hb - 0.1, hb - 0.08, unten + 0.08, gurt - 0.005, zv, t0), F.himmel))
    zv = t1
  }

  // Fahrerplatz.
  const auge: V3 = [-0.75, 1.95, -4.95]
  b.matt.push(farbig(quader(-1.2, -0.3, unten + 0.08, 0.7, -5.6, -4.45), F.kunststoff))
  b.matt.push(farbig(rund(-1.22, 0.25, 0.9, 1.25, zF + 0.08, -5.42, 0.04), F.innen))
  b.matt.push(farbig(rund(auge[0] - 0.22, auge[0] + 0.22, 1.24, 1.32, -5.62, -5.42, 0.025), F.kunststoff))
  b.licht.push(farbig(quader(auge[0] - 0.17, auge[0] + 0.17, 1.25, 1.31, -5.422, -5.417), F.anzeige))
  b.matt.push(lenkrad(auge[0], 1.45, -5.38, 0.25, 1.13))
  sitz(b.matt, auge[0], 0.52, 1.2, -5.25, 0.48, 0.68, 0.7)
  b.auge = auge
  b.ausstieg = [-(hb + 0.55), auge[2]]
}

/* ------------------------------------------------------------ Raeder */

/** Ein Rad: Drehkoerper aus Reifen und Felge, Achse entlang x, Felge nach
 *  aussen (+x). Speichen: Felgenflaeche in 15 Stuecken, jedes dritte dunkel.
 *  doppelt: Zwillingsreifen mit Rille in der Mitte. */
function radGeometrie(r: number, breite: number, doppelt: boolean): BufferGeometry {
  const w = breite / 2
  // Profil von innen (-w) nach aussen (+w): [Abstand zur Achse, Lage auf der Achse].
  const p: P2[] = [
    [0.001, -w + 0.03],
    [0.45 * r, -w + 0.02],
    [0.93 * r, -w],
    [r, -w + 0.05],
  ]
  if (doppelt) p.push([r, -0.03], [0.9 * r, -0.012], [0.9 * r, 0.012], [r, 0.03])
  p.push([r, w - 0.05], [0.93 * r, w], [0.74 * r, w - 0.012], [0.66 * r, w - 0.006], [0.6 * r, w - 0.03], [0.001, w - 0.035])
  const lathe = new LatheGeometry(
    p.map(([a, b]) => new Vector2(a, b)),
    15,
  )
  const g = roh(lathe)
  const pos = g.getAttribute('position')
  const col = new Float32Array(pos.count * 3)
  const reifen = new Color(F.reifen)
  const felge = new Color(F.felge)
  const dunkel = new Color(F.felgeDunkel)
  for (let i = 0; i < pos.count; i += 3) {
    let x = 0
    let y = 0
    let z = 0
    for (let k = 0; k < 3; k++) {
      x += pos.getX(i + k) / 3
      y += pos.getY(i + k) / 3
      z += pos.getZ(i + k) / 3
    }
    const rho = Math.hypot(x, z)
    let c = reifen
    if (y > 0 && rho < 0.69 * r) {
      const sektor = Math.floor(((Math.atan2(z, x) + Math.PI * 2) % (Math.PI * 2)) / ((Math.PI * 2) / 15))
      c = rho < 0.58 * r && sektor % 3 === 2 ? dunkel : felge
    } else if (y < 0 && rho < 0.5 * r) c = dunkel
    for (let k = 0; k < 3; k++) {
      col[(i + k) * 3] = c.r
      col[(i + k) * 3 + 1] = c.g
      col[(i + k) * 3 + 2] = c.b
    }
  }
  g.setAttribute('color', new BufferAttribute(col, 3))
  // Achse (y der Drehung) wird x: aussen = +x.
  g.rotateZ(-Math.PI / 2)
  g.computeBoundingSphere()
  return g
}

/** Spiegelbild an x = 0 (linke Raeder): x umdrehen, Dreiecke umdrehen. */
function gespiegelt(g: BufferGeometry): BufferGeometry {
  const s = g.clone()
  const pos = s.getAttribute('position')
  const nor = s.getAttribute('normal')
  for (let i = 0; i < pos.count; i++) {
    pos.setX(i, -pos.getX(i))
    nor.setX(i, -nor.getX(i))
  }
  for (const name of Object.keys(s.attributes)) {
    const a = s.getAttribute(name)
    for (let i = 0; i < a.count; i += 3) {
      for (let k = 0; k < a.itemSize; k++) {
        const t = a.getComponent(i + 1, k)
        a.setComponent(i + 1, k, a.getComponent(i + 2, k))
        a.setComponent(i + 2, k, t)
      }
    }
    a.needsUpdate = true
  }
  s.computeBoundingSphere()
  return s
}

/* ------------------------------------------------------------ Vorrat je Art */

/** Schrift als Bild (nur mit Zeichenflaeche, sonst null). */
function schriftBild(text: string, farbe: string): { tex: CanvasTexture; seitenverhaeltnis: number } | null {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const px = 96
  const schrift = `800 ${px}px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`
  ctx.font = schrift
  const w = Math.ceil(ctx.measureText(text).width) + 16
  const h = Math.round(px * 1.15)
  canvas.width = w
  canvas.height = h
  ctx.font = schrift
  ctx.fillStyle = farbe
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, w / 2, h / 2 + px * 0.05)
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 4
  return { tex, seitenverhaeltnis: w / h }
}

interface SchriftTeil {
  geo: PlaneGeometry
  mat: MeshLambertMaterial
  tex: CanvasTexture
  /** Lage und Drehung um y der Flaechen (eine je Seite). */
  lagen: [number, number, number, number][]
}

interface ArtVorrat {
  zaehler: number
  lack: BufferGeometry
  glas: BufferGeometry | null
  matt: BufferGeometry | null
  licht: BufferGeometry | null
  deko: BufferGeometry | null
  blauA: BufferGeometry | null
  blauB: BufferGeometry | null
  radVR: BufferGeometry
  radVL: BufferGeometry
  radHR: BufferGeometry
  radHL: BufferGeometry
  schrift: SchriftTeil[]
  auge: V3
  ausstieg: [number, number]
}

const vorrat = new Map<FahrzeugArt, ArtVorrat>()

function verschmolzen(teile: BufferGeometry[], name: string): BufferGeometry | null {
  if (!teile.length) return null
  const g = mergeGeometries(teile, false)
  for (const t of teile) t.dispose()
  if (!g) throw new Error(`Fahrzeug: ${name} liess sich nicht zusammenfuegen`)
  g.computeBoundingSphere()
  g.computeBoundingBox()
  return g
}

const PKW: Partial<Record<FahrzeugArt, PkwMass>> = {
  auto: {
    unten: 0.2, gurt: 0.92, haube: 0.78,
    wsZ: -0.95, dachVZ: -0.2, dachHZ: 0.95, dachY: 1.45,
    hsZ: 1.85, hsY: 1.0, heckY: 0.98,
    fwZ: -0.6, hbZ: 0.9, saeulen: [0.32], blechZ: 1.25,
    auge: [-0.38, 1.2, 0.08], sitzZ: -0.26, lenkZ: -0.38,
  },
  kombi: {
    unten: 0.2, gurt: 0.95, haube: 0.8,
    wsZ: -1.1, dachVZ: -0.35, dachHZ: 2.05, dachY: 1.46,
    hsZ: 2.3, hsY: 1.0, heckY: 0.98,
    fwZ: -0.75, hbZ: 1.0, saeulen: [0.22, 1.32], blechZ: 1.98,
    auge: [-0.4, 1.23, -0.02], sitzZ: -0.36, lenkZ: -0.5,
  },
  polizei: {
    unten: 0.2, gurt: 0.95, haube: 0.8,
    wsZ: -1.1, dachVZ: -0.35, dachHZ: 2.05, dachY: 1.42,
    hsZ: 2.3, hsY: 1.0, heckY: 0.98,
    fwZ: -0.75, hbZ: 1.0, saeulen: [0.22, 1.32], blechZ: 1.98,
    auge: [-0.4, 1.22, -0.02], sitzZ: -0.36, lenkZ: -0.5,
  },
}

const KASTEN: Partial<Record<FahrzeugArt, KastenMass>> = {
  transporter: {
    unten: 0.32, gurt: 1.12, haube: 0.98, wsZ: -1.95, dachVZ: -1.3, kabY: 2.3, fwZ: -1.25, kabHZ: -0.75,
    kastenVZ: -0.75, kastenUnten: 0.32, kastenY: 2.3,
    auge: [-0.5, 1.76, -0.95], sitzZ: -1.3, lenkZ: -1.47, lenkY: 1.38,
  },
  rettung: {
    unten: 0.35, gurt: 1.15, haube: 1.0, wsZ: -2.3, dachVZ: -1.65, kabY: 2.32, fwZ: -1.6, kabHZ: -1.1,
    kastenVZ: -1.15, kastenUnten: 0.48, kastenY: 2.62,
    auge: [-0.52, 1.8, -1.33], sitzZ: -1.68, lenkZ: -1.84, lenkY: 1.42,
  },
}

function vorratBauen(art: FahrzeugArt): ArtVorrat {
  const m = FAHRZEUG_MASSE[art]
  const b = neuerBau()
  const pk = PKW[art]
  const ks = KASTEN[art]
  if (pk) pkw(b, m, pk, art)
  else if (ks) kastenwagen(b, m, ks, art)
  else if (art === 'feuerwehr') feuerwehr(b, m)
  else bus(b, m)
  const lack = verschmolzen(b.lack, 'Lack')
  if (!lack) throw new Error('Fahrzeug: ohne Karosserie')
  const doppelt = m.radBHinten > m.radB + 0.1
  const radVR = radGeometrie(m.radR, m.radB, false)
  const radHR = doppelt || m.radBHinten !== m.radB ? radGeometrie(m.radR, m.radBHinten, doppelt) : radVR
  const schrift: SchriftTeil[] = []
  for (const s of b.schrift) {
    const bild = schriftBild(s.text, s.farbe)
    if (!bild) continue
    let h = s.hoehe
    let w = h * bild.seitenverhaeltnis
    if (w > s.maxBreite) {
      w = s.maxBreite
      h = w / bild.seitenverhaeltnis
    }
    const geo = new PlaneGeometry(w, h)
    const mat = new MeshLambertMaterial({ map: bild.tex, alphaTest: 0.5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 })
    // Rechts schaut die Flaeche nach +x (Drehung +90 Grad), links nach -x,
    // vorne nach -z (180 Grad): so laeuft die Schrift fuer den Betrachter
    // ueberall von links nach rechts.
    const lagen: [number, number, number, number][] = s.vorne
      ? [[s.x, s.y, s.z, Math.PI]]
      : [
          [s.x, s.y, s.z, Math.PI / 2],
          [-s.x, s.y, s.z, -Math.PI / 2],
        ]
    schrift.push({ geo, mat, tex: bild.tex, lagen })
  }
  return {
    zaehler: 0,
    lack,
    glas: verschmolzen(b.glas, 'Glas'),
    matt: verschmolzen(b.matt, 'Teile'),
    licht: verschmolzen(b.licht, 'Lichter'),
    deko: verschmolzen(b.deko, 'Aufkleber'),
    blauA: verschmolzen(b.blauA, 'Blaulicht A'),
    blauB: verschmolzen(b.blauB, 'Blaulicht B'),
    radVR,
    radVL: gespiegelt(radVR),
    radHR,
    radHL: radHR === radVR ? gespiegelt(radVR) : gespiegelt(radHR),
    schrift,
    auge: b.auge,
    ausstieg: b.ausstieg,
  }
}

function vorratHolen(art: FahrzeugArt): ArtVorrat {
  let v = vorrat.get(art)
  if (!v) {
    v = vorratBauen(art)
    vorrat.set(art, v)
  }
  v.zaehler++
  return v
}

function vorratLassen(art: FahrzeugArt): void {
  const v = vorrat.get(art)
  if (!v) return
  v.zaehler--
  if (v.zaehler > 0) return
  vorrat.delete(art)
  const geos = new Set<BufferGeometry | null>([v.lack, v.glas, v.matt, v.licht, v.deko, v.blauA, v.blauB, v.radVR, v.radVL, v.radHR, v.radHL])
  for (const g of geos) g?.dispose()
  for (const s of v.schrift) {
    s.geo.dispose()
    s.mat.dispose()
    s.tex.dispose()
  }
}

/* ------------------------------------------------------------ Materialien */

const lacke = new Map<string, { mat: MeshPhongMaterial; zaehler: number }>()

function lackHolen(farbe: string): MeshPhongMaterial {
  let l = lacke.get(farbe)
  if (!l) {
    l = { mat: new MeshPhongMaterial({ color: farbe, specular: 0x3c3c3c, shininess: 70 }), zaehler: 0 }
    lacke.set(farbe, l)
  }
  l.zaehler++
  return l.mat
}

function lackLassen(farbe: string): void {
  const l = lacke.get(farbe)
  if (!l) return
  l.zaehler--
  if (l.zaehler > 0) return
  lacke.delete(farbe)
  l.mat.dispose()
}

/** Materialien fuer alle Fahrzeuge (bleiben, solange die Seite lebt). */
let gemeinsam: { glas: MeshPhongMaterial; matt: MeshLambertMaterial; licht: MeshBasicMaterial; deko: MeshLambertMaterial } | null = null
function materialien() {
  gemeinsam ??= {
    glas: new MeshPhongMaterial({ color: 0x18222c, specular: 0xa4b6c8, shininess: 90, transparent: true, opacity: 0.55, depthWrite: false }),
    matt: new MeshLambertMaterial({ vertexColors: true }),
    licht: new MeshBasicMaterial({ vertexColors: true }),
    deko: new MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 }),
  }
  return gemeinsam
}

/** Wie viel geteilt bereitliegt (fuer Pruefungen): Arten und Lacke. */
export function fahrzeugVorrat(): { arten: number; lacke: number } {
  return { arten: vorrat.size, lacke: lacke.size }
}

/* ------------------------------------------------------------ Blaulicht und Sirene */

/** Blinkfolge: A und B blitzen abwechselnd doppelt, 0,6 s je Runde.
 *  Gibt 1 (A an), 2 (B an) oder 0. */
export function blinkMaske(ms: number): number {
  const t = ((ms % 600) + 600) % 600
  if (t < 60 || (t >= 110 && t < 170)) return 1
  if ((t >= 300 && t < 360) || (t >= 410 && t < 470)) return 2
  return 0
}

/** Leiser Zweiklang (WebAudio). null ohne WebAudio oder wenn stumm. */
interface Sirene {
  lautstaerke(abstand: number): void
  aus(): void
}

let tonKontext: AudioContext | null = null
let stumm = false
const sirenen = new Set<Sirene>()

/** Alle Sirenen stumm schalten (oder wieder erlauben); Blaulicht bleibt. */
export function sirenenStumm(an: boolean): void {
  stumm = an
  if (an) for (const s of [...sirenen]) s.aus()
}

function sireneStarten(art: FahrzeugArt): Sirene | null {
  if (stumm) return null
  const AC = (globalThis as { AudioContext?: typeof AudioContext }).AudioContext
  if (!AC) return null
  try {
    tonKontext ??= new AC()
    const k = tonKontext
    if (k.state === 'suspended') k.resume().catch((err: unknown) => console.warn('[fahrzeug] Ton laesst sich nicht starten:', err))
    // Feuerwehr tiefer, Rettung und Polizei hoeher; je Ton 0,6 s.
    const [f1, f2] = art === 'feuerwehr' ? [415, 554] : [466, 622]
    const ton = k.createOscillator()
    ton.type = 'square'
    ton.frequency.value = (f1 + f2) / 2
    const wechsel = k.createOscillator()
    wechsel.type = 'square'
    wechsel.frequency.value = 1 / 1.2
    const hub = k.createGain()
    hub.gain.value = (f2 - f1) / 2
    const filter = k.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 1600
    const laut = k.createGain()
    laut.gain.value = 0
    wechsel.connect(hub)
    hub.connect(ton.frequency)
    ton.connect(filter)
    filter.connect(laut)
    laut.connect(k.destination)
    ton.start()
    wechsel.start()
    let an = true
    const s: Sirene = {
      lautstaerke(abstand) {
        if (!an) return
        const v = 0.05 * Math.min(1, 8 / Math.max(8, abstand))
        laut.gain.setTargetAtTime(v, k.currentTime, 0.05)
      },
      aus() {
        if (!an) return
        an = false
        sirenen.delete(s)
        try {
          ton.stop()
          wechsel.stop()
        } catch (err) {
          console.warn('[fahrzeug] Sirene stoppen:', err)
        }
        ton.disconnect()
        wechsel.disconnect()
        hub.disconnect()
        filter.disconnect()
        laut.disconnect()
      },
    }
    sirenen.add(s)
    return s
  } catch (err) {
    console.warn('[fahrzeug] Sirene nicht moeglich:', err)
    return null
  }
}

interface BlauZustand {
  an: boolean
  sirene: Sirene | null
}
const blaulichter = new WeakMap<Fahrzeug3D, BlauZustand>()

/** Ist das Blaulicht dieses Fahrzeugs an? Solange ja, muss der Motor
 *  weiterzeichnen (das Blinken laeuft in onBeforeRender). */
export function blaulichtAn(f: Fahrzeug3D): boolean {
  return blaulichter.get(f)?.an ?? false
}

/* ------------------------------------------------------------ Bauen */

const weltTmp = new Vector3()
const kameraTmp = new Vector3()

/** Ein Fahrzeug der Art art in Farbe farbe (#rrggbb; Feuerwehr, Rettung und
 *  Polizei haben ihre feste Farbe), Lage x, z, gier auf Ebene ebene, auf
 *  Hoehe y (fehlt: 0). Die gruppe steht dort; Lage und Neigung setzt danach
 *  der Motor (fahren.ts, lageAnwenden). gruppe.userData.fahrzeug ist die
 *  Kennung (zum Antippen). dispose() gibt frei, was nur dieses Fahrzeug
 *  braucht, und nimmt es aus der Szene. */
export function baueFahrzeug(art: FahrzeugArt, farbe: string, id: string, lage: { x: number; z: number; gier: number; ebene: string; y?: number }): Fahrzeug3D {
  const a: FahrzeugArt = FAHRZEUG_MASSE[art] ? art : 'auto'
  if (a !== art) console.warn(`[fahrzeug] unbekannte Art ${String(art)}, baue ein Auto`)
  let lackFarbe = FESTER_LACK[a] ?? farbe
  if (!FARBE_OK.test(lackFarbe)) {
    console.warn(`[fahrzeug] Farbe ${String(farbe)} ist kein #rrggbb, nehme Silber`)
    lackFarbe = FAHRZEUG_LACKE[0]
  }
  lackFarbe = lackFarbe.toLowerCase()
  const m = FAHRZEUG_MASSE[a]
  const v = vorratHolen(a)
  const lack = lackHolen(lackFarbe)
  const mats = materialien()

  const gruppe = new Group()
  gruppe.name = `fahrzeug:${id}`
  gruppe.userData.fahrzeug = id
  const teil = (geo: BufferGeometry | null, mat: Material, name: string): Mesh | null => {
    if (!geo) return null
    const mesh = new Mesh(geo, mat)
    mesh.name = name
    mesh.userData.fahrzeug = id
    mesh.matrixAutoUpdate = false
    mesh.updateMatrix()
    gruppe.add(mesh)
    return mesh
  }
  teil(v.lack, lack, 'lack')
  teil(v.matt, mats.matt, 'teile')
  teil(v.licht, mats.licht, 'lichter')
  teil(v.deko, mats.deko, 'aufkleber')
  const glas = teil(v.glas, mats.glas, 'glas')
  if (glas) glas.renderOrder = 1
  for (const s of v.schrift) {
    for (const [x, y, z, ry] of s.lagen) {
      const mesh = new Mesh(s.geo, s.mat)
      mesh.name = 'schrift'
      mesh.userData.fahrzeug = id
      mesh.position.set(x, y, z)
      mesh.rotation.y = ry
      mesh.matrixAutoUpdate = false
      mesh.updateMatrix()
      gruppe.add(mesh)
    }
  }

  const raeder: Fahrzeug3D['raeder'] = []
  for (const [vorne, achse, spur] of [
    [true, m.vorneZ, m.spurVorne],
    [false, m.hintenZ, m.spurHinten],
  ] as const) {
    for (const s of [-1, 1]) {
      const geo = vorne ? (s > 0 ? v.radVR : v.radVL) : s > 0 ? v.radHR : v.radHL
      const rad = new Mesh(geo, mats.matt)
      rad.name = vorne ? 'rad-vorne' : 'rad-hinten'
      rad.userData.fahrzeug = id
      rad.position.set((s * spur) / 2, m.radR, achse)
      rad.rotation.order = 'YXZ'
      gruppe.add(rad)
      raeder.push({ teil: rad, vorne })
    }
  }

  // Blaulicht: zwei eigene Materialien, die abwechselnd leuchten.
  let blauMats: MeshLambertMaterial[] = []
  const zustand: BlauZustand = { an: false, sirene: null }
  if (v.blauA && v.blauB) {
    const matA = new MeshLambertMaterial({ color: 0x16306e, emissive: 0x3d7dff, emissiveIntensity: 0 })
    const matB = matA.clone()
    blauMats = [matA, matB]
    const lichtA = teil(v.blauA, matA, 'blaulicht')
    teil(v.blauB, matB, 'blaulicht')
    if (lichtA) {
      // Immer zeichnen, damit das Umschalten (und die Lautstaerke) jedes Bild laeuft.
      lichtA.frustumCulled = false
      lichtA.onBeforeRender = (_r, _s, kamera) => {
        const maske = zustand.an ? blinkMaske(performance.now()) : 0
        const ia = maske & 1 ? 2.4 : 0
        const ib = maske & 2 ? 2.4 : 0
        if (matA.emissiveIntensity !== ia) matA.emissiveIntensity = ia
        if (matB.emissiveIntensity !== ib) matB.emissiveIntensity = ib
        if (zustand.sirene) {
          lichtA.getWorldPosition(weltTmp)
          kameraTmp.setFromMatrixPosition(kamera.matrixWorld)
          zustand.sirene.lautstaerke(weltTmp.distanceTo(kameraTmp))
        }
      }
    }
  }

  gruppe.position.set(lage.x, Number.isFinite(lage.y) ? (lage.y as number) : 0, lage.z)
  gruppe.rotation.set(0, lage.gier, 0, 'YXZ')

  let frei = false
  const f: Fahrzeug3D = {
    id,
    art: a,
    gruppe,
    laenge: m.laenge,
    breite: m.breite,
    hoehe: m.hoehe,
    fahrerAuge: [...v.auge],
    ausstieg: [...v.ausstieg],
    raeder,
    hoechstKmh: m.kmh,
    ...(blauMats.length
      ? {
          blaulicht(an: boolean) {
            if (frei || zustand.an === an) return
            zustand.an = an
            if (an) zustand.sirene = sireneStarten(a)
            else {
              zustand.sirene?.aus()
              zustand.sirene = null
              for (const mat of blauMats) mat.emissiveIntensity = 0
            }
          },
        }
      : {}),
    x: lage.x,
    z: lage.z,
    gier: lage.gier,
    ebene: lage.ebene,
    dispose() {
      if (frei) return
      frei = true
      zustand.an = false
      zustand.sirene?.aus()
      zustand.sirene = null
      for (const mat of blauMats) mat.dispose()
      gruppe.removeFromParent()
      gruppe.clear()
      vorratLassen(a)
      lackLassen(lackFarbe)
    },
  }
  blaulichter.set(f, zustand)
  return f
}
