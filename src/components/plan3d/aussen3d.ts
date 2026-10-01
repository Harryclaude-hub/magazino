/* Die Welt draussen (E82). Karam: "draussen muss etwas sein, nicht
 * uebertrieben". Ruhig und einfach, damit es aus den Fenstern, vom Balkon
 * und von oben (Orbit) gut aussieht und am Handy fluessig bleibt:
 *
 * - Himmel: grosse Kugel von innen, unten hell (himmelUnten) und nach oben
 *   blauer (himmelOben). Sie wandert mit der Kamera, damit der Horizont
 *   immer auf Augenhoehe liegt, und wird zuerst und ohne Tiefe gemalt.
 * - Wiese: grosse Scheibe (300 m) in rasen mit sanften Flecken, Oberkante
 *   2 cm unter dem untersten Geschoss. Im Dunst geht sie in den Himmel ueber.
 * - Ein Plattenweg ums Haus, ein Zugang zur Strasse, eine ruhige Strasse
 *   mit Bordstein und Gehwegen an einer Laengsseite (12 bis 15 m weg).
 * - Sechs bis zehn Baeume mit runden Kronen, ein paar Hecken, eine Bank,
 *   zwei bis vier schlichte Nachbarhaeuser in 25 bis 45 m Abstand.
 * - Liegt die Wohnung hoeher (stockwerkHoehe > 0): darunter ein einfacher
 *   Fassadenblock bis zum Boden, damit sie nicht schwebt.
 *
 * Nichts davon steht in der Wohnung (rahmen, ab 2 cm unter ihrem Boden
 * aufwaerts) oder in einem freien Bereich (frei, in jeder Hoehe). Der
 * Platz ergibt sich aus dem rahmen ueber einen kleinen Zufall mit Saat:
 * gleiche Wohnung, gleiche Welt, ohne Math.random.
 *
 * Billig: keine Texturen, keine Schatten, drei Materialien, Farben je Ecke
 * (vertexColors), alles Gleichartige zu einem Mesh verschmolzen (sechs
 * Zeichenaufrufe), unter 20 000 Dreiecke. Pruefung ohne Browser:
 * node scripts/aussen-pruefen.mjs
 *
 * Masse in Metern, wie szene.ts: Plan-x ist x, Plan-y ist z, y ist oben,
 * der Boden der Wohnung liegt bei y = 0.
 *
 * Einbau (Motor): gruppe in die Szene (nicht in die Gruppe, die bei jedem
 * Neubau der Wohnung geleert wird), scene.fog = nebel, als Hintergrund
 * himmel. Beim Abbau dispose(). Die Kamera braucht far ueber 280 m
 * (Himmelskugel); was weiter weg liegt, ist ohnehin ganz im Dunst. */
import {
  BackSide,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  Fog,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  SphereGeometry,
  type Material,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { Farben3D } from './szene.ts'

export interface UmgebungOptionen {
  /** Umriss der Wohnung in Metern (Welt x0, z0, x1, z1). */
  rahmen: [number, number, number, number]
  /** Bereiche, die frei bleiben muessen (Treppenhaus am Eingang, Keller), Meter. */
  frei: [number, number, number, number][]
  farben: Pick<Farben3D, 'rasen' | 'weg' | 'baum' | 'stamm' | 'hecke' | 'himmelOben' | 'himmelUnten' | 'fassade' | 'wand3d'>
  /** Hoehe des Wohnungsbodens ueber dem Gelaende in Metern (0 = Erdgeschoss). */
  stockwerkHoehe?: number
}

/** Dunst: ab hier beginnt er, hier ist alles Himmelfarbe (Meter). */
const NEBEL_NAH = 45
const NEBEL_FERN = 220
/** Halbmesser der Himmelskugel. Sie folgt der Kamera, darum reicht ein far
 *  knapp darueber (der Motor hat 400). */
const HIMMEL_R = 280
/** Ringe der Wiese (Halbmesser in m): innen dicht fuer die Flecken, aussen grob. */
const BODEN_RINGE = [3, 6, 10, 15, 21, 28, 37, 48, 62, 80, 105, 140, 190, 245, 300]
const BODEN_TEILE = 64
/** Halbe Laenge der Strasse; ihre Enden liegen tief im Dunst. */
const STRASSE_HALB = 200
/** Oberkante der Wege ueber der Wiese (die Wiese weicht per polygonOffset). */
const WEG_DICKE = 0.015
/** Was unter der Wohnung stehen darf, endet hier (Oberkante Fassade). */
const UNTER_WOHNUNG = -0.02
const EPS = 1e-6

/** Rechteck im Grundriss der Welt: x0, z0, x1, z1 in Metern. */
type Rechteck = [number, number, number, number]

function ordnen(r: readonly number[], was: string): Rechteck {
  if (r.length !== 4 || !r.every((v) => Number.isFinite(v))) {
    throw new Error(`Aussenwelt: ${was} braucht vier endliche Zahlen`)
  }
  return [Math.min(r[0], r[2]), Math.min(r[1], r[3]), Math.max(r[0], r[2]), Math.max(r[1], r[3])]
}

/** Ueberlappen sich a und b mit echter Flaeche? Beruehren zaehlt nicht. */
function ueberlappt(a: Rechteck, b: Rechteck): boolean {
  return a[0] < b[2] - EPS && a[2] > b[0] + EPS && a[1] < b[3] - EPS && a[3] > b[1] + EPS
}

function wachsen(r: Rechteck, d: number): Rechteck {
  return [r[0] - d, r[1] - d, r[2] + d, r[3] + d]
}

/** r ohne die Rechtecke in weg, als achsenparallele Stuecke. Was duenner
 *  als 1 cm bleibt, faellt weg. */
function abziehen(r: Rechteck, weg: Rechteck[]): Rechteck[] {
  let stuecke: Rechteck[] = [r]
  for (const w of weg) {
    const neu: Rechteck[] = []
    for (const s of stuecke) {
      if (!ueberlappt(s, w)) {
        neu.push(s)
        continue
      }
      const ix0 = Math.max(s[0], w[0])
      const ix1 = Math.min(s[2], w[2])
      neu.push([s[0], s[1], ix0, s[3]]) // links daneben
      neu.push([ix1, s[1], s[2], s[3]]) // rechts daneben
      neu.push([ix0, s[1], ix1, w[1]]) // davor
      neu.push([ix0, w[3], ix1, s[3]]) // dahinter
    }
    stuecke = neu.filter((s) => s[2] - s[0] >= 0.01 && s[3] - s[1] >= 0.01)
  }
  return stuecke
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

/** Saat aus dem Umriss, auf ganze Zentimeter (FNV-1a). */
function saatAus(r: Rechteck): number {
  let h = 0x811c9dc5
  for (const v of r) {
    h ^= Math.round(v * 100)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/* ------------------------------------------------ Bausteine */

/** Ohne Index und ohne uv, damit alle Teile zusammenpassen. */
function roh(geo: BufferGeometry): BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo
  if (g !== geo) geo.dispose()
  g.deleteAttribute('uv')
  return g
}

/** Farben je Ecke aus den Hoehen (Schritt 3 im Feld lage). schatten: unten
 *  so viel dunkler (0 bis 1), wie unter einer Krone oder am Fuss einer
 *  Hecke Licht fehlt. */
function eckFarben(lage: ArrayLike<number>, c: Color, schatten: number): Float32Array {
  const n = lage.length / 3
  let y0 = Infinity
  let y1 = -Infinity
  if (schatten > 0) {
    for (let i = 0; i < n; i++) {
      y0 = Math.min(y0, lage[i * 3 + 1])
      y1 = Math.max(y1, lage[i * 3 + 1])
    }
  }
  const a = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const t = schatten > 0 && y1 > y0 ? (lage[i * 3 + 1] - y0) / (y1 - y0) : 1
    const f = 1 - schatten * (1 - t)
    a[i * 3] = c.r * f
    a[i * 3 + 1] = c.g * f
    a[i * 3 + 2] = c.b * f
  }
  return a
}

function faerben(g: BufferGeometry, c: Color, schatten = 0): BufferGeometry {
  g.setAttribute('color', new BufferAttribute(eckFarben(g.getAttribute('position').array, c, schatten), 3))
  return g
}

/* Wuerfel und Kugel werden sehr oft gebraucht (Fensterbaender, Kronen).
 * Sie entstehen einmal als Vorlage; jedes Teil streckt und verschiebt nur
 * deren Zahlen. Das spart am Handy die meiste Bauzeit. Die Richtungen
 * (normal) bleiben gleich: beim Quader zeigen sie entlang der Achsen, die
 * Kugel wird in allen Richtungen gleich gestreckt. */
interface Vorlage {
  lage: Float32Array
  richtung: Float32Array
}
let wuerfelVorlage: Vorlage | null = null
let kugelVorlage: Vorlage | null = null
function vorlage(geo: BufferGeometry): Vorlage {
  const g = roh(geo)
  const v = { lage: Float32Array.from(g.getAttribute('position').array), richtung: Float32Array.from(g.getAttribute('normal').array) }
  g.dispose()
  return v
}

function ausVorlage(v: Vorlage, sx: number, sy: number, sz: number, tx: number, ty: number, tz: number, c: Color, schatten = 0): BufferGeometry {
  const lage = new Float32Array(v.lage.length)
  for (let i = 0; i < lage.length; i += 3) {
    lage[i] = v.lage[i] * sx + tx
    lage[i + 1] = v.lage[i + 1] * sy + ty
    lage[i + 2] = v.lage[i + 2] * sz + tz
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(lage, 3))
  // Nur gelesen (beim Verschmelzen kopiert), darum darf die Vorlage geteilt werden.
  g.setAttribute('normal', new BufferAttribute(v.richtung, 3))
  g.setAttribute('color', new BufferAttribute(eckFarben(v.lage, c, schatten), 3))
  return g
}

function quader(r: Rechteck, y0: number, y1: number, c: Color): BufferGeometry {
  wuerfelVorlage ??= vorlage(new BoxGeometry(1, 1, 1))
  return ausVorlage(wuerfelVorlage, r[2] - r[0], y1 - y0, r[3] - r[1], (r[0] + r[2]) / 2, (y0 + y1) / 2, (r[1] + r[3]) / 2, c)
}

function rundQuader(r: Rechteck, y0: number, y1: number, rund: number, stufen: number, c: Color, schatten = 0): BufferGeometry {
  const g = roh(new RoundedBoxGeometry(r[2] - r[0], y1 - y0, r[3] - r[1], stufen, rund))
  g.translate((r[0] + r[2]) / 2, (y0 + y1) / 2, (r[1] + r[3]) / 2)
  return faerben(g, c, schatten)
}

function kugel(x: number, y: number, z: number, radius: number, c: Color, schatten: number): BufferGeometry {
  kugelVorlage ??= vorlage(new IcosahedronGeometry(1, 2))
  return ausVorlage(kugelVorlage, radius, radius, radius, x, y, z, c, schatten)
}

/** Baumstamm: offener Kegelstumpf, oben steckt er in der Krone. */
function stammTeil(x: number, z: number, y0: number, y1: number, rOben: number, rUnten: number, c: Color): BufferGeometry {
  const g = roh(new CylinderGeometry(rOben, rUnten, y1 - y0, 7, 1, true))
  g.translate(x, (y0 + y1) / 2, z)
  return faerben(g, c)
}

/** Die Wiese: Scheibe aus Ringen, Farbe je Ecke leicht verschieden. */
function wiese(cx: number, cz: number, y: number, rasen: Color, trocken: Color, zz: () => number): BufferGeometry {
  const p = [zz(), zz(), zz(), zz()].map((v) => v * Math.PI * 2)
  const welle = (x: number, z: number) =>
    0.5 * Math.sin(x * 0.13 + p[0]) * Math.sin(z * 0.11 + p[1]) +
    0.3 * Math.sin((x - z) * 0.05 + p[2]) +
    0.2 * Math.sin((x + 0.6 * z) * 0.31 + p[3])
  const n = 1 + BODEN_RINGE.length * BODEN_TEILE
  const pos = new Float32Array(n * 3)
  const nor = new Float32Array(n * 3)
  const col = new Float32Array(n * 3)
  const c = new Color()
  const setze = (i: number, x: number, z: number) => {
    pos[i * 3] = x
    pos[i * 3 + 1] = y
    pos[i * 3 + 2] = z
    nor[i * 3 + 1] = 1
    const w = welle(x, z)
    const w2 = welle(z * 0.7 + 31, x * 0.7 - 17)
    c.copy(rasen)
      .lerp(trocken, 0.16 * (0.5 + 0.5 * w2))
      .multiplyScalar(1 + 0.07 * w)
    col[i * 3] = c.r
    col[i * 3 + 1] = c.g
    col[i * 3 + 2] = c.b
  }
  setze(0, cx, cz)
  BODEN_RINGE.forEach((r, ring) => {
    for (let k = 0; k < BODEN_TEILE; k++) {
      const a = (k / BODEN_TEILE) * Math.PI * 2
      setze(1 + ring * BODEN_TEILE + k, cx + Math.cos(a) * r, cz + Math.sin(a) * r)
    }
  })
  // Dreiecke so herum, dass sie nach oben zeigen (gegen den Uhrzeiger von oben).
  const idx: number[] = []
  for (let k = 0; k < BODEN_TEILE; k++) idx.push(0, 1 + ((k + 1) % BODEN_TEILE), 1 + k)
  for (let ring = 1; ring < BODEN_RINGE.length; ring++) {
    const innen = 1 + (ring - 1) * BODEN_TEILE
    const aussen = 1 + ring * BODEN_TEILE
    for (let k = 0; k < BODEN_TEILE; k++) {
      const k2 = (k + 1) % BODEN_TEILE
      idx.push(innen + k, innen + k2, aussen + k)
      idx.push(innen + k2, aussen + k2, aussen + k)
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(pos, 3))
  g.setAttribute('normal', new BufferAttribute(nor, 3))
  g.setAttribute('color', new BufferAttribute(col, 3))
  g.setIndex(idx)
  g.computeBoundingSphere()
  return g
}

/** Himmelskugel: Farbe nach der Hoehe, am Horizont schnell heller. */
function himmelKugel(oben: Color, unten: Color): BufferGeometry {
  const g = new SphereGeometry(HIMMEL_R, 32, 24)
  g.deleteAttribute('uv')
  g.deleteAttribute('normal')
  const pos = g.getAttribute('position')
  const col = new Float32Array(pos.count * 3)
  const c = new Color()
  for (let i = 0; i < pos.count; i++) {
    const t = Math.max(0, pos.getY(i) / HIMMEL_R)
    c.copy(unten).lerp(oben, 1 - (1 - t) ** 2.4)
    col[i * 3] = c.r
    col[i * 3 + 1] = c.g
    col[i * 3 + 2] = c.b
  }
  g.setAttribute('color', new BufferAttribute(col, 3))
  return g
}

/** Teile zu einem Mesh verschmelzen. Jedes Teil bleibt als Gruppe (Bereich
 *  der Ecken) erkennbar, gezeichnet wird trotzdem in einem Aufruf, weil das
 *  Material keine Liste ist. */
function verschmelzen(teile: BufferGeometry[], name: string, mat: Material): Mesh | null {
  if (!teile.length) return null
  const geo = mergeGeometries(teile, true) as BufferGeometry | null
  for (const t of teile) t.dispose()
  if (!geo) throw new Error(`Aussenwelt: ${name} liess sich nicht zusammenfuegen`)
  geo.computeBoundingSphere()
  const mesh = new Mesh(geo, mat)
  mesh.name = name
  // Steht still: die Matrix bleibt die Einheit, das spart Rechnen je Bild.
  mesh.matrixAutoUpdate = false
  return mesh
}

/* ------------------------------------------------ Aufbau */

export function baueUmgebung(o: UmgebungOptionen): { gruppe: Group; nebel: Fog; himmel: string; dispose(): void } {
  const rahmen = ordnen(o.rahmen, 'rahmen')
  if (rahmen[2] - rahmen[0] < 0.1 || rahmen[3] - rahmen[1] < 0.1) throw new Error('Aussenwelt: rahmen ist kleiner als 10 cm')
  const frei = o.frei
    .map((f, i) => ordnen(f, `frei[${i}]`))
    .filter((f) => f[2] - f[0] > 0.01 && f[3] - f[1] > 0.01)
  const stock = o.stockwerkHoehe ?? 0
  if (!Number.isFinite(stock)) throw new Error('Aussenwelt: stockwerkHoehe ist keine Zahl')
  const h = Math.max(0, stock)
  /** Oberkante des Gelaendes. */
  const G = -h - 0.02
  const zz = zufallMit(saatAus(rahmen))

  const F = {
    rasen: new Color(o.farben.rasen),
    weg: new Color(o.farben.weg),
    baum: new Color(o.farben.baum),
    stamm: new Color(o.farben.stamm),
    hecke: new Color(o.farben.hecke),
    oben: new Color(o.farben.himmelOben),
    unten: new Color(o.farben.himmelUnten),
    fassade: new Color(o.farben.fassade),
    wand: new Color(o.farben.wand3d),
  }
  // Abgeleitete Toene, damit keine neuen Tokens noetig sind.
  const asphalt = F.weg.clone().multiplyScalar(0.36)
  const bord = F.weg.clone().lerp(F.fassade, 0.5)
  const glas = F.oben.clone().lerp(F.wand, 0.4).multiplyScalar(0.62)
  const sockel = F.wand.clone().multiplyScalar(0.8)
  const dach = F.wand.clone().multiplyScalar(0.9)
  const holz = F.stamm.clone().lerp(F.fassade, 0.3)
  const eisen = F.wand.clone().multiplyScalar(0.3)
  const trocken = F.rasen.clone().lerp(F.weg, 0.6)

  /* Eigene Achsen: u laengs der langen Seite, v quer, positiv zur Strasse. */
  const cx = (rahmen[0] + rahmen[2]) / 2
  const cz = (rahmen[1] + rahmen[3]) / 2
  const laengsX = rahmen[2] - rahmen[0] >= rahmen[3] - rahmen[1]
  const hu = (laengsX ? rahmen[2] - rahmen[0] : rahmen[3] - rahmen[1]) / 2
  const hv = (laengsX ? rahmen[3] - rahmen[1] : rahmen[2] - rahmen[0]) / 2
  // Die Strasse liegt auf der Seite des Eingangs (des freien Bereichs, der
  // am weitesten nach aussen reicht), sonst auf einer per Zufall.
  let seite = zz() < 0.5 ? -1 : 1
  let eingangU: number | null = null
  let weitesteQuer = 0.05
  for (const f of frei) {
    const fx = (f[0] + f[2]) / 2 - cx
    const fz = (f[1] + f[3]) / 2 - cz
    const quer = laengsX ? fz : fx
    if (Math.abs(quer) > weitesteQuer) {
      weitesteQuer = Math.abs(quer)
      seite = quer < 0 ? -1 : 1
      eingangU = laengsX ? fx : fz
    }
  }
  const punkt = (u: number, v: number): [number, number] => (laengsX ? [cx + u, cz + seite * v] : [cx + seite * v, cz + u])
  const R = (u0: number, v0: number, u1: number, v1: number): Rechteck => {
    const a = punkt(u0, v0)
    const b = punkt(u1, v1)
    return ordnen([a[0], a[1], b[0], b[1]], 'Stueck')
  }

  const wege: BufferGeometry[] = []
  const gruen: BufferGeometry[] = []
  const bauten: BufferGeometry[] = []
  const unten: BufferGeometry[] = []
  /** Belegte Flaechen, damit Hecken, Bank und Baeume Platz finden. */
  const belegt: Rechteck[] = []
  const freiRand = frei.map((f) => wachsen(f, 0.5))

  /* Plattenweg ums Haus, ausser in den freien Bereichen. */
  const ringB = 1.5 + zz() * 0.9
  const ring = wachsen(rahmen, ringB)
  for (const s of abziehen(ring, [rahmen, ...frei])) wege.push(quader(s, G - 0.03, G + WEG_DICKE, F.weg))
  belegt.push(ring)

  /* Ruhige Strasse an der Eingangsseite: Gehweg, Bordstein, Fahrbahn,
   * Bordstein, Gehweg. */
  const vs = hv + 12 + zz() * 3
  const gehwegNah = vs - 5.15
  const strassenBaender: [number, number, number, Color][] = [
    [vs - 5.15, vs - 3.15, G + 0.1, F.weg],
    [vs - 3.15, vs - 3.0, G + 0.12, bord],
    [vs - 3.0, vs + 3.0, G + WEG_DICKE, asphalt],
    [vs + 3.0, vs + 3.15, G + 0.12, bord],
    [vs + 3.15, vs + 5.15, G + 0.1, F.weg],
  ]
  for (const [v0, v1, oben, farbe] of strassenBaender) {
    for (const s of abziehen(R(-STRASSE_HALB, v0, STRASSE_HALB, v1), frei)) wege.push(quader(s, G - 0.05, oben, farbe))
  }
  belegt.push(R(-STRASSE_HALB, vs - 5.15, STRASSE_HALB, vs + 5.15))

  /* Zugang vom Gehweg zum Haus, zum Eingang hin, wenn es einen gibt. */
  const zufallU = (zz() - 0.5) * Math.max(0, 2 * hu - 3) * 0.6
  const randU = Math.max(0, hu - 0.8)
  const wegU = Math.max(-randU, Math.min(randU, eingangU ?? zufallU))
  const zugang = R(wegU - 0.8, hv + ringB, wegU + 0.8, gehwegNah)
  for (const s of abziehen(zugang, frei)) wege.push(quader(s, G - 0.03, G + WEG_DICKE, F.weg))
  belegt.push(zugang)

  /* Nachbarhaeuser: Quader mit runden Kanten, Sockel, Fensterbaender je
   * Stockwerk, Dachrand. */
  let haeuser = 0
  const haus = (r: Rechteck, stockwerke: number) => {
    const fassade = F.fassade.clone().lerp(F.wand, zz() * 0.3).multiplyScalar(0.96 + zz() * 0.06)
    if (ueberlappt(r, wachsen(rahmen, 20)) || frei.some((f) => ueberlappt(r, wachsen(f, 1)))) return
    const H = stockwerke * 3 + 0.4
    bauten.push(rundQuader(r, G - 0.4, G + H, 0.25, 1, fassade))
    bauten.push(rundQuader(wachsen(r, 0.05), G - 0.05, G + 0.55, 0.28, 1, sockel))
    bauten.push(rundQuader(wachsen(r, 0.14), G + H - 0.05, G + H + 0.35, 0.3, 1, dach))
    const [x0, z0, x1, z1] = r
    const e = 0.03
    const ein = 0.8
    for (let s = 0; s < stockwerke; s++) {
      const y0 = G + s * 3 + (s === 0 ? 1.1 : 0.95)
      const y1 = G + s * 3 + 2.25
      bauten.push(quader([x0 + ein, z0 - e, x1 - ein, z0 + e], y0, y1, glas))
      bauten.push(quader([x0 + ein, z1 - e, x1 - ein, z1 + e], y0, y1, glas))
      bauten.push(quader([x0 - e, z0 + ein, x0 + e, z1 - ein], y0, y1, glas))
      bauten.push(quader([x1 - e, z0 + ein, x1 + e, z1 - ein], y0, y1, glas))
    }
    belegt.push(wachsen(r, 2))
    haeuser++
  }
  // Gegenueber, hinter dem Vorgarten jenseits der Strasse.
  const vf = Math.max(hv + 25, vs + 5.15 + 4 + zz() * 3)
  // Hoechstens vier Stockwerke gegenueber, damit vom Fenster aus Himmel bleibt.
  const t1 = 10 + zz() * 3
  const l1 = 18 + zz() * 10
  const u1 = (zz() - 0.5) * 10
  haus(R(u1 - l1 / 2, vf, u1 + l1 / 2, vf + t1), 3 + Math.floor(zz() * 2))
  // Manchmal ein zweites daneben.
  if (zz() < 0.5) {
    const l2 = 16 + zz() * 8
    const luecke = 7 + zz() * 3
    const richtung = zz() < 0.5 ? -1 : 1
    const u2 = u1 + richtung * (l1 / 2 + luecke + l2 / 2)
    const vf2 = vf + zz() * 4
    const t2 = 10 + zz() * 2
    haus(R(u2 - l2 / 2, vf2, u2 + l2 / 2, vf2 + t2), 2 + Math.floor(zz() * 3))
  }
  // Hinter dem Haus.
  const vh = hv + 28 + zz() * 10
  const t3 = 11 + zz() * 3
  const l3 = 18 + zz() * 14
  const u3 = (zz() - 0.5) * 20
  haus(R(u3 - l3 / 2, -(vh + t3), u3 + l3 / 2, -vh), 3 + Math.floor(zz() * 3))
  // Meist eins an der Seite, quer gestellt, nie auf der Strasse.
  if (zz() < 0.7) {
    const s = zz() < 0.5 ? -1 : 1
    const ua = hu + 26 + zz() * 10
    const tu = 10 + zz() * 3
    const lv = 18 + zz() * 8
    const vc = Math.min((zz() - 0.5) * 10, vs - 7.5 - lv / 2)
    haus(R(s * ua, vc - lv / 2, s * (ua + tu), vc + lv / 2), 2 + Math.floor(zz() * 3))
  }

  /* Hecken: vorn am Gehweg (mit Luecke am Zugang), hinten, an einer Seite. */
  let hecken = 0
  const hecke = (r: Rechteck, hoehe: number) => {
    const farbe = F.hecke.clone().multiplyScalar(0.94 + zz() * 0.1)
    const weg = [...freiRand, wachsen(rahmen, 1), wachsen(zugang, 0.5), ...belegt]
    for (const s of abziehen(r, weg)) {
      const lang = Math.max(s[2] - s[0], s[3] - s[1])
      const kurz = Math.min(s[2] - s[0], s[3] - s[1])
      if (lang < 2 || kurz < 0.5) continue
      gruen.push(rundQuader(s, G - 0.1, G + hoehe, 0.3, 2, farbe, 0.28))
      belegt.push(wachsen(s, 0.3))
      hecken++
    }
  }
  // Vorn niedrig, damit man vom Erdgeschoss ueber sie auf die Strasse sieht.
  hecke(R(-(hu + 6), gehwegNah - 1.8, hu + 6, gehwegNah - 1.0), 0.8 + zz() * 0.15)
  const vb = hv + 10 + zz() * 3
  const lb = 10 + zz() * 6
  const ub = (zz() - 0.5) * 8
  hecke(R(ub - lb / 2, -(vb + 0.9), ub + lb / 2, -vb), 1.2 + zz() * 0.3)
  const sh = zz() < 0.5 ? -1 : 1
  const us = hu + 7 + zz() * 3
  hecke(R(sh * us, -(hv + 2), sh * (us + 0.8), hv + 2), 1.1)

  /* Bank hinter dem Haus, Blick vom Haus weg; die Lehne zeigt zum Haus. */
  let bank = false
  {
    const bu = (zz() - 0.5) * Math.max(0, 2 * hu - 3)
    const bv = -(hv + ringB + 2.2)
    const fuss = R(bu - 0.9, bv - 0.35, bu + 0.9, bv + 0.35)
    const frei0 = !frei.some((f) => ueberlappt(fuss, wachsen(f, 0.5))) && !ueberlappt(fuss, wachsen(rahmen, 0.5))
    if (frei0 && !belegt.some((b) => ueberlappt(fuss, b))) {
      bauten.push(quader(R(bu - 0.8, bv - 0.22, bu + 0.8, bv + 0.2), G + 0.42, G + 0.47, holz))
      bauten.push(quader(R(bu - 0.8, bv + 0.2, bu + 0.8, bv + 0.26), G + 0.52, G + 0.86, holz))
      for (const du of [-0.7, 0.7]) {
        bauten.push(quader(R(bu + du - 0.03, bv - 0.2, bu + du + 0.03, bv + 0.2), G - 0.02, G + 0.42, eisen))
        bauten.push(quader(R(bu + du - 0.03, bv + 0.2, bu + du + 0.03, bv + 0.26), G - 0.02, G + 0.86, eisen))
      }
      belegt.push(wachsen(fuss, 0.6))
      bank = true
    }
  }

  /* Baeume: runde Kronen aus ein paar Kugeln, etwas verschieden im Ton.
   * Sie halten so viel Abstand zur Wohnung, wie sie hoch sind, damit sie
   * den Blick von oben auf die Wohnung nicht verstellen. */
  const ziel = 6 + Math.floor(zz() * 5)
  const kronen: Rechteck[] = []
  for (let versuch = 0; versuch < 800 && kronen.length < ziel; versuch++) {
    const u = (zz() * 2 - 1) * (hu + 30)
    const v = -(hv + 30) + zz() * (gehwegNah + hv + 30)
    const r0 = 1.6 + zz() * 1.0
    const stammH = 1.9 + zz() * 0.8
    const hoehe = stammH + r0 * 1.9
    const rf = r0 * 1.45
    const [x, z] = punkt(u, v)
    const fuss: Rechteck = [x - rf, z - rf, x + rf, z + rf]
    if (ueberlappt(fuss, wachsen(rahmen, Math.max(5, 1.1 * hoehe)))) continue
    if (frei.some((f) => ueberlappt(fuss, wachsen(f, 1)))) continue
    if (belegt.some((b) => ueberlappt(fuss, b))) continue
    if (kronen.some((k) => ueberlappt(fuss, wachsen(k, -0.3)))) continue
    kronen.push(fuss)
    const kroneY = G + stammH + r0 * 0.75
    gruen.push(stammTeil(x, z, G - 0.05, kroneY, 0.09 + zz() * 0.04, 0.15 + zz() * 0.05, F.stamm))
    const ton = F.baum.clone().lerp(F.hecke, zz() * 0.35).multiplyScalar(0.92 + zz() * 0.14)
    gruen.push(kugel(x, kroneY, z, r0, ton, 0.3))
    const neben = 2 + Math.floor(zz() * 3)
    const dreh = zz() * Math.PI * 2
    for (let i = 0; i < neben; i++) {
      const w = dreh + (i / neben) * Math.PI * 2 + (zz() - 0.5) * 0.6
      const d = r0 * (0.45 + zz() * 0.2)
      const r = r0 * (0.55 + zz() * 0.2)
      const c = ton.clone().multiplyScalar(0.94 + zz() * 0.12)
      gruen.push(kugel(x + Math.cos(w) * d, kroneY + r0 * (zz() * 0.5 - 0.15), z + Math.sin(w) * d, r, c, 0.3))
    }
    gruen.push(kugel(x + (zz() - 0.5) * 0.4, kroneY + r0 * 0.55, z + (zz() - 0.5) * 0.4, r0 * 0.6, ton.clone().multiplyScalar(1.05), 0.25))
  }

  /* Liegt die Wohnung hoeher: Fassade darunter bis zum Boden, mit Sockel
   * und einem Fensterband je Stockwerk. Freie Bereiche bleiben offen. */
  if (h > 0.05) {
    for (const s of abziehen(rahmen, frei)) unten.push(quader(s, G - 0.05, UNTER_WOHNUNG, F.fassade))
    const [x0, z0, x1, z1] = rahmen
    /** Streifen aussen an den vier Kanten, Ecken ohne Doppel. */
    const kanten = (e: number, ein: number): Rechteck[] => [
      [x0 - e + ein, z0 - e, x1 + e - ein, z0 + e],
      [x0 - e + ein, z1 - e, x1 + e - ein, z1 + e],
      [x0 - e, z0 + e + ein, x0 + e, z1 - e - ein],
      [x1 - e, z0 + e + ein, x1 + e, z1 - e - ein],
    ]
    const gueltig = (r: Rechteck) => r[2] - r[0] > 0.05 && r[3] - r[1] > 0.05
    /* Freie Bereiche etwas breiter abziehen, damit an ihrem Rand kein
     * Splitter des Bands liegen bleibt. Ein Stueck, das nicht aus der
     * Fassade ragt, faellt weg: seine Aussenseite laege genau in der
     * Fassade und flimmerte. */
    const freiBand = frei.map((f) => wachsen(f, 0.05))
    const ragtHeraus = (s: Rechteck) => s[0] < x0 - 0.01 || s[1] < z0 - 0.01 || s[2] > x1 + 0.01 || s[3] > z1 + 0.01
    const baender = (e: number, ein: number) =>
      kanten(e, ein)
        .filter(gueltig)
        .flatMap((k) => abziehen(k, freiBand))
        .filter(ragtHeraus)
    const sockelOben = Math.min(G + 0.45, UNTER_WOHNUNG - 0.08)
    if (sockelOben > G + 0.05) {
      for (const s of baender(0.04, 0)) unten.push(quader(s, G - 0.05, sockelOben, sockel))
    }
    const geschosse = Math.max(1, Math.round(h / 2.9))
    const gh = h / geschosse
    for (let f = 0; f < geschosse; f++) {
      const boden = -h + f * gh
      const y0 = boden + 0.9
      const y1 = Math.min(boden + 2.2, boden + gh - 0.35)
      if (y1 - y0 < 0.5) continue
      for (const s of baender(0.03, 0.6)) unten.push(quader(s, y0, y1, glas))
    }
  }

  /* ------------------------------------------------ Meshes */
  const welt = new MeshLambertMaterial({ vertexColors: true })
  // Die Wiese weicht in der Tiefe, so flimmert nichts, was flach auf ihr liegt.
  const bodenMat = new MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 })
  const himmelMat = new MeshBasicMaterial({ vertexColors: true, side: BackSide, fog: false, depthWrite: false })
  const materialien: Material[] = [welt, bodenMat, himmelMat]

  const gruppe = new Group()
  gruppe.name = 'aussen'

  const himmelMesh = new Mesh(himmelKugel(F.oben, F.unten), himmelMat)
  himmelMesh.name = 'himmel'
  himmelMesh.renderOrder = -1000
  himmelMesh.frustumCulled = false
  // Nicht anklickbar: ein Strahl soll nie am Himmel haengen bleiben.
  himmelMesh.raycast = () => undefined
  // Mitte immer an der Kamera (ihre Weltlage), damit der Horizont auf
  // Augenhoehe liegt und die Kugel nie aus dem Sichtbereich faellt.
  himmelMesh.onBeforeRender = (_renderer, _szene, kamera) => {
    const e = kamera.matrixWorld.elements
    himmelMesh.matrixWorld.makeTranslation(e[12], e[13], e[14])
  }
  gruppe.add(himmelMesh)

  const boden = new Mesh(wiese(cx, cz, G, F.rasen, trocken, zz), bodenMat)
  boden.name = 'boden'
  boden.matrixAutoUpdate = false
  gruppe.add(boden)

  for (const m of [
    verschmelzen(wege, 'wege', welt),
    verschmelzen(gruen, 'gruen', welt),
    verschmelzen(bauten, 'bauten', welt),
    verschmelzen(unten, 'fassade', welt),
  ]) {
    if (m) gruppe.add(m)
  }
  gruppe.userData = { baeume: kronen.length, hecken, haeuser, bank }

  let weg = false
  return {
    gruppe,
    nebel: new Fog(o.farben.himmelUnten, NEBEL_NAH, NEBEL_FERN),
    himmel: o.farben.himmelUnten,
    dispose() {
      if (weg) return
      weg = true
      himmelMesh.onBeforeRender = () => undefined
      gruppe.traverse((x) => {
        if (x instanceof Mesh) (x.geometry as BufferGeometry).dispose()
      })
      for (const m of materialien) m.dispose()
      gruppe.clear()
    },
  }
}
