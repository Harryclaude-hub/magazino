/* Die Welt draussen. Karam: schlicht, nur ein Bretterzaun. Also:
 *
 * - Himmel: grosse Kugel von innen, unten hell (himmelUnten) und nach oben
 *   blauer (himmelOben). Sie wandert mit der Kamera, damit der Horizont
 *   immer auf Augenhoehe liegt, und wird zuerst und ohne Tiefe gemalt.
 * - Boden: eine ebene, ruhige Scheibe (300 m) in hellem Rasen-Kies-Ton,
 *   Oberkante 2 cm unter dem untersten Geschoss. Im Dunst geht sie in den
 *   Himmel ueber.
 * - Ein Bretterzaun ringsum, 3 m von den Aussenwaenden weg, 1,5 m hoch:
 *   senkrechte Bretter mit kleinen Abstaenden, zwei waagerechte Latten
 *   innen, Pfosten alle paar Meter. Freie Bereiche (Eingang, Keller)
 *   bleiben offen, dort ist ein Tor.
 *
 * Keine Baeume, Hecken, Wege, Strassen, Autos oder Nachbarhaeuser. Nichts
 * steht in der Wohnung (rahmen) oder in einem freien Bereich (frei).
 *
 * Billig: keine Texturen, keine Schatten, zwei Materialien, Farben je Ecke
 * (vertexColors), alle Bretter zu einem Mesh verschmolzen (drei
 * Zeichenaufrufe). Pruefung ohne Browser: node scripts/aussen-pruefen.mjs
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
  Fog,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  SphereGeometry,
  type Material,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { Farben3D } from './szene.ts'

export interface UmgebungOptionen {
  /** Umriss der Wohnung in Metern (Welt x0, z0, x1, z1). */
  rahmen: [number, number, number, number]
  /** Bereiche, die frei bleiben muessen (Treppenhaus am Eingang, Keller), Meter. */
  frei: [number, number, number, number][]
  farben: Pick<Farben3D, 'rasen' | 'weg' | 'stamm' | 'himmelOben' | 'himmelUnten' | 'fassade'>
  /** Hoehe des Wohnungsbodens ueber dem Gelaende in Metern (0 = Erdgeschoss). */
  stockwerkHoehe?: number
}

/** Dunst: ab hier beginnt er, hier ist alles Himmelfarbe (Meter). */
const NEBEL_NAH = 45
const NEBEL_FERN = 220
/** Halbmesser der Himmelskugel. Sie folgt der Kamera, darum reicht ein far
 *  knapp darueber (der Motor hat 400). */
const HIMMEL_R = 280
/** Ringe des Bodens (Halbmesser in m): wenige, er ist eben. */
const BODEN_RINGE = [20, 60, 140, 300]
const BODEN_TEILE = 48
const EPS = 1e-6

/** Abstand des Zauns zu den Aussenwaenden, Hoehe, Brettbreite und Luecke (m). */
export const ZAUN_ABSTAND = 3
export const ZAUN_HOEHE = 1.5
const BRETT_BREIT = 0.1
const BRETT_LUECKE = 0.03
const BRETT_DICK = 0.025
const LATTE_DICK = 0.04
const PFOSTEN = 0.1
const PFOSTEN_HOEHE = 1.65
const PFOSTEN_ABSTAND = 2.6
/** Obergrenze fuer Bretter, damit auch ein riesiger Umriss schnell bleibt. */
const BRETTER_MAX = 2400

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

/* Der Quader entsteht einmal als Vorlage; jedes Brett streckt und
 * verschiebt nur deren Zahlen. Das spart am Handy die meiste Bauzeit. */
interface Vorlage {
  lage: Float32Array
  richtung: Float32Array
}
let wuerfelVorlage: Vorlage | null = null
function vorlage(geo: BufferGeometry): Vorlage {
  const g = roh(geo)
  const v = { lage: Float32Array.from(g.getAttribute('position').array), richtung: Float32Array.from(g.getAttribute('normal').array) }
  g.dispose()
  return v
}

function quader(r: Rechteck, y0: number, y1: number, c: Color): BufferGeometry {
  wuerfelVorlage ??= vorlage(new BoxGeometry(1, 1, 1))
  const v = wuerfelVorlage
  const sx = r[2] - r[0]
  const sy = y1 - y0
  const sz = r[3] - r[1]
  const tx = (r[0] + r[2]) / 2
  const ty = (y0 + y1) / 2
  const tz = (r[1] + r[3]) / 2
  const lage = new Float32Array(v.lage.length)
  const farbe = new Float32Array(v.lage.length)
  for (let i = 0; i < lage.length; i += 3) {
    lage[i] = v.lage[i] * sx + tx
    lage[i + 1] = v.lage[i + 1] * sy + ty
    lage[i + 2] = v.lage[i + 2] * sz + tz
    farbe[i] = c.r
    farbe[i + 1] = c.g
    farbe[i + 2] = c.b
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(lage, 3))
  // Nur gelesen (beim Verschmelzen kopiert), darum darf die Vorlage geteilt werden.
  g.setAttribute('normal', new BufferAttribute(v.richtung, 3))
  g.setAttribute('color', new BufferAttribute(farbe, 3))
  return g
}

/** Der Boden: ebene Scheibe aus wenigen Ringen in einer Farbe. */
function boden(cx: number, cz: number, y: number, farbe: Color): BufferGeometry {
  const n = 1 + BODEN_RINGE.length * BODEN_TEILE
  const pos = new Float32Array(n * 3)
  const nor = new Float32Array(n * 3)
  const col = new Float32Array(n * 3)
  const setze = (i: number, x: number, z: number) => {
    pos[i * 3] = x
    pos[i * 3 + 1] = y
    pos[i * 3 + 2] = z
    nor[i * 3 + 1] = 1
    col[i * 3] = farbe.r
    col[i * 3 + 1] = farbe.g
    col[i * 3 + 2] = farbe.b
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

  const rasen = new Color(o.farben.rasen)
  const oben = new Color(o.farben.himmelOben)
  const unten = new Color(o.farben.himmelUnten)
  // Ruhiger, heller Boden: Rasen etwas Richtung Kies. Das Holz des Zauns
  // kommt aus dem Ton der Stammfarbe, aufgehellt zur Fassade.
  const bodenFarbe = rasen.clone().lerp(new Color(o.farben.weg), 0.45)
  const holz = new Color(o.farben.stamm).lerp(new Color(o.farben.fassade), 0.3)

  /* Der Zaun: ein Rechteck 3 m um die Aussenwaende. Jede Seite ist eine
   * Strecke; Stuecke in freien Bereichen (Tor) fallen weg. */
  const z0 = wachsen(rahmen, ZAUN_ABSTAND)
  const sperren = frei.map((f) => wachsen(f, 0.2))
  const zaun: BufferGeometry[] = []
  const umfang = 2 * (z0[2] - z0[0] + (z0[3] - z0[1]))
  const teilung = Math.max(BRETT_BREIT + BRETT_LUECKE, umfang / BRETTER_MAX)
  const brettB = teilung - BRETT_LUECKE
  const imTor = (r: Rechteck) => sperren.some((f) => ueberlappt(r, f))
  const dunkel = holz.clone().multiplyScalar(0.8)
  /** Eine Seite entlang einer Achse; innen (1 oder -1) zeigt zur Wohnung. */
  const seite = (laengsX: boolean, fest: number, von: number, bis: number, innen: 1 | -1) => {
    const lang = bis - von
    const n = Math.max(1, Math.floor(lang / teilung))
    const rest = (lang - n * teilung) / 2
    const kasten = (a0: number, a1: number, d0: number, d1: number): Rechteck =>
      laengsX ? [a0, fest + d0, a1, fest + d1] : [fest + d0, a0, fest + d1, a1]
    for (let i = 0; i < n; i++) {
      const a0 = von + rest + i * teilung + BRETT_LUECKE / 2
      const r = kasten(a0, a0 + brettB, -BRETT_DICK / 2, BRETT_DICK / 2)
      if (imTor(r)) continue
      const hoehe = ZAUN_HOEHE * (0.97 + zz() * 0.03)
      zaun.push(quader(r, G, G + hoehe, holz.clone().multiplyScalar(0.92 + zz() * 0.14)))
    }
    // Zwei Latten innen, in Stuecken ohne Tor.
    const lattenAb = BRETT_DICK / 2
    const latte = (y0: number, y1: number) => {
      const band = innen === 1 ? kasten(von, bis, lattenAb, lattenAb + LATTE_DICK) : kasten(von, bis, -lattenAb - LATTE_DICK, -lattenAb)
      for (const st of abziehen(band, sperren)) zaun.push(quader(st, G + y0, G + y1, dunkel))
    }
    latte(0.25, 0.33)
    latte(1.05, 1.13)
    // Pfosten alle paar Meter, ebenfalls nicht im Tor.
    const np = Math.max(1, Math.round(lang / PFOSTEN_ABSTAND))
    const mitte = innen * (lattenAb + LATTE_DICK)
    for (let i = 0; i <= np; i++) {
      const a = von + (lang * i) / np
      const r = kasten(a - PFOSTEN / 2, a + PFOSTEN / 2, mitte - PFOSTEN / 2, mitte + PFOSTEN / 2)
      if (!imTor(r)) zaun.push(quader(r, G, G + PFOSTEN_HOEHE, dunkel))
    }
  }
  seite(true, z0[1], z0[0], z0[2], 1)
  seite(true, z0[3], z0[0], z0[2], -1)
  seite(false, z0[0], z0[1], z0[3], 1)
  seite(false, z0[2], z0[1], z0[3], -1)

  /* ------------------------------------------------ Meshes */
  const zaunMat = new MeshLambertMaterial({ vertexColors: true })
  // Der Boden weicht in der Tiefe, so flimmert nichts, was flach auf ihm liegt.
  const bodenMat = new MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 })
  const himmelMat = new MeshBasicMaterial({ vertexColors: true, side: BackSide, fog: false, depthWrite: false })
  const materialien: Material[] = [zaunMat, bodenMat, himmelMat]

  const gruppe = new Group()
  gruppe.name = 'aussen'

  const himmelMesh = new Mesh(himmelKugel(oben, unten), himmelMat)
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

  const bodenMesh = new Mesh(boden((rahmen[0] + rahmen[2]) / 2, (rahmen[1] + rahmen[3]) / 2, G, bodenFarbe), bodenMat)
  bodenMesh.name = 'boden'
  bodenMesh.matrixAutoUpdate = false
  gruppe.add(bodenMesh)

  const zaunMesh = verschmelzen(zaun, 'zaun', zaunMat)
  if (zaunMesh) gruppe.add(zaunMesh)
  gruppe.userData = { teile: zaun.length }

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
