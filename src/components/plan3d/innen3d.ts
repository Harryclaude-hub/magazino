/* Ein erfundenes Inneres bauen (E87). Aus dem Plan von innenGenerator.ts
 * (Raeume, Waende, Moebel, Laeufe, Dinge) entstehen Meshes, begehbare
 * Ebenen mit Hindernissen, Treppen und Dinge zum Aufheben.
 *
 * Billig fuers Handy: keine Texturen (ausser der Schrift auf Schildern),
 * Farben je Ecke, alles Starre je Geschoss in einem Mesh, Glas aller
 * Geschosse in einem, Schrift in einem, dazu je Ding eines (ein Material).
 * Unterseiten von Kaesten fehlen (sieht man nie).
 *
 * Koordinaten: der Plan rechnet im Rahmen des Hauses (Meter, x Osten, z
 * Sueden, EG-Boden bei y 0); o.zuWelt (nur Drehung um die Hochachse und
 * Verschiebung) bringt alles in die Welt. Die Gruppe selbst bleibt bei der
 * Einheitsmatrix: Ecken, Hindernisse, Ebenen, Treppen und Dinge stehen in
 * Weltkoordinaten, so kann der Motor Dinge direkt per position setzen.
 *
 * Was entsteht:
 * - Boden je Geschoss (Umriss ohne Hoefe und Treppenloecher, Empore nur in
 *   ihren Zonen), darueber je Raum sein Belag; Decke (nur nach unten
 *   sichtbar) unter dem naechsten Geschoss, im obersten unter dem Dach.
 * - Innenseite der Aussenwand (AUSSENWAND_M dick, an den Ecken auf Gehrung)
 *   mit Fenstern genau an den Stellen von stadtMasse.fensterReihe (im EG
 *   fensterOhneTuer), Leibungen, Fensterbrett und Glas, die Haustuer offen.
 *   Die Aussenseite (Fassade auf dem Umriss), Leibung und Sturz der
 *   Haustuer und die Stufen davor zeichnet stadt3d.ts; hier gibt es sie
 *   nicht ein zweites Mal (sonst flimmert es). Die oberste Decke liegt
 *   DECKE_M unter dem Dach von stadt3d.ts und zeigt nach unten.
 * - Innenwaende mit Luecken fuer Tueren (mit Zarge), Durchgaenge und
 *   Ladenfronten, Gelaender; Sperren sind nur Hindernisse.
 * - Laeufe als Stufen mit Untersicht und Handlauf.
 * - Moebel je Art, Schilder, Fahrzeuge zum Anschauen (eingebacken; je Art
 *   und Farbe einmal aus fahrzeug3d.ts gerechnet und dann in Stuecken
 *   kopiert).
 *
 * Bauen in Stuecken: innenBauen(o) gibt ein InnenBau, dessen weiter(bis)
 * baut, bis die Zeit um ist (stadt3d.ts gibt je Bild ein paar
 * Millisekunden); baueInnen(o) baut alles in einem Zug.
 *
 * Ebenen: `${praefix}:${k}`, Name o.name + ' · ' + EG oder k, y der Boden in
 * der Welt. Hindernisse je Ebene: Aussenwand (im EG mit Luecke an der
 * Haustuer), Innenwaende ohne die Luecken, Gelaender und Sperren, Moebel
 * mit Oberkante (Tische 0,75, Betten 0,5, Theken 1,0; Regale ohne).
 * Treppen: die Schwelle von o.bodenEbene auf `${praefix}:0` und je Paar
 * Geschosse ein Lauf `${praefix}:t${k}`. Dinge `${praefix}:d${n}:${art}`
 * (E87b: n die Stelle im Plan, die Art am Ende; die Farbe kommt aus der
 * Kennung, so baut innenDingBauen ein weggetragenes Ding allein aus ihr,
 * genau wie im Haus).
 * Pruefung ohne Browser: node scripts/innen-pruefen.mjs */
import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Group,
  LinearFilter,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  SRGBColorSpace,
  ShapeUtils,
  Sphere,
  Vector2,
  Vector3,
  type Material,
  type Object3D,
} from 'three'
import type { Farben3D } from './szene'
import type { Ebene3D, Fahrzeug3D, Hindernis3D, Treppe3D, WeltDing3D } from './vertrag3d'
import { DECKE_M, DING_MASSE, INNEN_FAHRZEUGE, type BodenArt, type DingArt, type InnenDing, type InnenGeschoss, type InnenMoebel, type InnenPlan, type InnenWand, type MoebelArt } from '../../lib/innenGenerator.ts'
import { AUSSENWAND_M, FENSTER_B, FENSTER_BRUESTUNG, FENSTER_H, SCHWELLE_HINTER, SCHWELLE_VOR, TUER_H } from './stadtMasse.ts'
import { baueFahrzeug } from './fahrzeug3d.ts'

export interface InnenOptionen {
  plan: InnenPlan
  farben: Farben3D
  /** Rahmen des Hauses (Meter, EG-Boden bei y 0) -> Welt. Nur Drehung um
   *  die Hochachse und Verschiebung. */
  zuWelt: Matrix4
  /** Kennungen: Ebenen heissen `${praefix}:${geschoss}`, Dinge
   *  `${praefix}:d${n}:${art}` (innenDingKennung). */
  praefix: string
  /** Name des Hauses fuer die Ebenen ('Haus A · 1'), sonst die Art. */
  name: string
  /** Ebene des Gelaendes vor der Tuer (Kennung) und Hoehe des Gelaendes an
   *  der Schwelle aussen (Welt, Meter): die Schwelle fuehrt von dort auf den
   *  Boden des EG. */
  bodenEbene: string
  schwelleY: number
}

export interface InnenTeil {
  gruppe: Group
  /** Die festen Meshes (Geschosse, Glas, Schrift) als eigene Gruppe in
   *  gruppe: stadt3d.ts blendet sie aus, solange man weit weg ist. Die Dinge
   *  haengen direkt in gruppe (sie bleiben zu sehen, auch weggetragen). */
  fest: Group
  /** Das Mesh je Geschoss (Index = Geschoss, in fest), null ohne: so
   *  zeigt stadt3d.ts nur die Geschosse, die man sehen kann. */
  stockMeshes: (Mesh | null)[]
  ebenen: Ebene3D[]
  treppen: Treppe3D[]
  dinge: WeltDing3D[]
  fahrzeuge: Fahrzeug3D[]
  dispose(): void
}

type P = [number, number]

/* ------------------------------------------------ Welt */

/** Rahmen des Hauses in die Welt: nur Drehung um y und Verschiebung. */
interface Welt {
  e: Float64Array
}

function weltVon(m: Matrix4): Welt {
  return { e: Float64Array.from(m.elements) }
}

/* ------------------------------------------------ Puffer */

/** Dreiecke ohne Index in Weltkoordinaten: Lage, Richtung und Farbe je Ecke
 *  (und auf Wunsch uv), in Feldern, die bei Bedarf doppelt so gross werden. */
class Puffer {
  l: Float32Array
  r: Float32Array
  f: Float32Array
  uv: Float32Array | null
  n = 0
  w: Welt | null

  constructor(w: Welt | null, platz = 4096, mitUv = false) {
    this.w = w
    this.l = new Float32Array(3 * platz)
    this.r = new Float32Array(3 * platz)
    this.f = new Float32Array(3 * platz)
    this.uv = mitUv ? new Float32Array(2 * platz) : null
  }

  get dreiecke(): number {
    return this.n / 9
  }

  private platz(): void {
    if (this.n + 3 <= this.l.length) return
    const neu = (a: Float32Array, k = 1) => {
      const b = new Float32Array(a.length * 2 * k)
      b.set(a)
      return b
    }
    this.l = neu(this.l)
    this.r = neu(this.r)
    this.f = neu(this.f)
    if (this.uv) {
      const b = new Float32Array(this.l.length / 3 * 2)
      b.set(this.uv)
      this.uv = b
    }
  }

  /** Platz fuer so viele weitere Ecken auf einmal. */
  platzFuer(ecken: number): void {
    const noetig = this.n + 3 * ecken
    if (noetig <= this.l.length) return
    let laenge = Math.max(3, this.l.length)
    while (laenge < noetig) laenge *= 2
    const neu = (a: Float32Array, n: number) => {
      const b = new Float32Array(n)
      b.set(a)
      return b
    }
    this.l = neu(this.l, laenge)
    this.r = neu(this.r, laenge)
    this.f = neu(this.f, laenge)
    if (this.uv) this.uv = neu(this.uv, (laenge / 3) * 2)
  }

  /** Die Ecken einer Vorlage (lokal: l Lage, r Richtung, f Farbe) um gier
   *  gedreht (three: x' = c x + s z, z' = -s x + c z) und nach (mx, my, mz)
   *  im Haus geschoben, ohne Farbobjekte; nur die Zahlen [von, bis) (je
   *  Ecke drei), damit ein langes Stueck geteilt werden kann. */
  vorlage(l: Float32Array, r: Float32Array, f: Float32Array, mx: number, my: number, mz: number, c: number, s: number, von = 0, bis = l.length): void {
    const n = (bis - von) / 3
    this.platzFuer(n)
    const e = this.w ? this.w.e : null
    const L = this.l
    const R = this.r
    const Fa = this.f
    let j = this.n
    for (let i = von; i < bis; i += 3) {
      const x = mx + c * l[i] + s * l[i + 2]
      const y = my + l[i + 1]
      const z = mz - s * l[i] + c * l[i + 2]
      const nx = c * r[i] + s * r[i + 2]
      const ny = r[i + 1]
      const nz = -s * r[i] + c * r[i + 2]
      if (e) {
        L[j] = e[0] * x + e[4] * y + e[8] * z + e[12]
        L[j + 1] = e[1] * x + e[5] * y + e[9] * z + e[13]
        L[j + 2] = e[2] * x + e[6] * y + e[10] * z + e[14]
        R[j] = e[0] * nx + e[4] * ny + e[8] * nz
        R[j + 1] = e[1] * nx + e[5] * ny + e[9] * nz
        R[j + 2] = e[2] * nx + e[6] * ny + e[10] * nz
      } else {
        L[j] = x
        L[j + 1] = y
        L[j + 2] = z
        R[j] = nx
        R[j + 1] = ny
        R[j + 2] = nz
      }
      Fa[j] = f[i]
      Fa[j + 1] = f[i + 1]
      Fa[j + 2] = f[i + 2]
      j += 3
    }
    this.n = j
  }

  /** Eine Ecke im Rahmen des Hauses. */
  ecke(x: number, y: number, z: number, nx: number, ny: number, nz: number, c: Color, k = 1, u = 0, v = 0): void {
    this.platz()
    const i = this.n
    const w = this.w
    if (w) {
      const e = w.e
      this.l[i] = e[0] * x + e[4] * y + e[8] * z + e[12]
      this.l[i + 1] = e[1] * x + e[5] * y + e[9] * z + e[13]
      this.l[i + 2] = e[2] * x + e[6] * y + e[10] * z + e[14]
      this.r[i] = e[0] * nx + e[4] * ny + e[8] * nz
      this.r[i + 1] = e[1] * nx + e[5] * ny + e[9] * nz
      this.r[i + 2] = e[2] * nx + e[6] * ny + e[10] * nz
    } else {
      this.l[i] = x
      this.l[i + 1] = y
      this.l[i + 2] = z
      this.r[i] = nx
      this.r[i + 1] = ny
      this.r[i + 2] = nz
    }
    this.f[i] = c.r * k
    this.f[i + 1] = c.g * k
    this.f[i + 2] = c.b * k
    if (this.uv) {
      const j = (i / 3) * 2
      this.uv[j] = u
      this.uv[j + 1] = v
    }
    this.n = i + 3
  }

  /** Viereck a, b, c, d (gegen den Uhrzeigersinn von der Seite n gesehen). */
  viereck(a: number[], b: number[], c: number[], d: number[], n: number[], f: Color, k = 1): void {
    this.ecke(a[0], a[1], a[2], n[0], n[1], n[2], f, k)
    this.ecke(b[0], b[1], b[2], n[0], n[1], n[2], f, k)
    this.ecke(c[0], c[1], c[2], n[0], n[1], n[2], f, k)
    this.ecke(a[0], a[1], a[2], n[0], n[1], n[2], f, k)
    this.ecke(c[0], c[1], c[2], n[0], n[1], n[2], f, k)
    this.ecke(d[0], d[1], d[2], n[0], n[1], n[2], f, k)
  }

  bauen(): BufferGeometry | null {
    if (!this.n) return null
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(this.l.slice(0, this.n), 3))
    g.setAttribute('normal', new BufferAttribute(this.r.slice(0, this.n), 3))
    g.setAttribute('color', new BufferAttribute(this.f.slice(0, this.n), 3))
    if (this.uv) g.setAttribute('uv', new BufferAttribute(this.uv.slice(0, (this.n / 3) * 2), 2))
    g.computeBoundingSphere()
    return g
  }
}

/** Ein lokaler Rahmen fuer Kaesten: Ursprung (ox, oy, oz) im Haus, Achse U
 *  (waagrecht), D = (-U.z, U.x) nach vorn, y nach oben. */
interface Rahmen {
  ox: number
  oy: number
  oz: number
  ux: number
  uz: number
}

/** Seiten eines Kastens: bit 1 +x, 2 -x, 4 +y, 8 -y, 16 +z, 32 -z. */
const OHNE_UNTEN = 1 | 2 | 4 | 16 | 32
const ALLE = 63

/** Kasten [x0, x1] x [y0, y1] x [z0, z1] im Rahmen R. */
function kasten(p: Puffer, R: Rahmen, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, f: Color, seiten = OHNE_UNTEN): void {
  if (x1 - x0 < 1e-4 || y1 - y0 < 1e-4 || z1 - z0 < 1e-4) return
  const ux = R.ux
  const uz = R.uz
  const dx = -uz
  const dz = ux
  const pt = (x: number, y: number, z: number) => [R.ox + ux * x + dx * z, R.oy + y, R.oz + uz * x + dz * z]
  const a000 = pt(x0, y0, z0)
  const a100 = pt(x1, y0, z0)
  const a010 = pt(x0, y1, z0)
  const a110 = pt(x1, y1, z0)
  const a001 = pt(x0, y0, z1)
  const a101 = pt(x1, y0, z1)
  const a011 = pt(x0, y1, z1)
  const a111 = pt(x1, y1, z1)
  if (seiten & 1) p.viereck(a101, a100, a110, a111, [ux, 0, uz], f, 0.9)
  if (seiten & 2) p.viereck(a000, a001, a011, a010, [-ux, 0, -uz], f, 0.9)
  if (seiten & 4) p.viereck(a011, a111, a110, a010, [0, 1, 0], f, 1)
  if (seiten & 8) p.viereck(a000, a100, a101, a001, [0, -1, 0], f, 0.75)
  if (seiten & 16) p.viereck(a001, a101, a111, a011, [dx, 0, dz], f, 0.96)
  if (seiten & 32) p.viereck(a100, a000, a010, a110, [-dx, 0, -dz], f, 0.85)
}

/** Stehender Zylinder um (cx, cz) im Rahmen R, n Seiten. */
function walze(p: Puffer, R: Rahmen, cx: number, cz: number, r: number, y0: number, y1: number, f: Color, n = 8, deckel = true): void {
  const ux = R.ux
  const uz = R.uz
  const dx = -uz
  const dz = ux
  const pt = (x: number, y: number, z: number) => [R.ox + ux * x + dx * z, R.oy + y, R.oz + uz * x + dz * z]
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2
    const a1 = ((i + 1) / n) * Math.PI * 2
    const x0 = cx + Math.cos(a0) * r
    const z0 = cz + Math.sin(a0) * r
    const x1 = cx + Math.cos(a1) * r
    const z1 = cz + Math.sin(a1) * r
    const am = (a0 + a1) / 2
    const nl = [Math.cos(am), Math.sin(am)]
    const nw = [ux * nl[0] + dx * nl[1], 0, uz * nl[0] + dz * nl[1]]
    p.viereck(pt(x1, y0, z1), pt(x0, y0, z0), pt(x0, y1, z0), pt(x1, y1, z1), nw, f, 0.92)
    if (deckel) {
      const m = pt(cx, y1, cz)
      p.ecke(m[0], m[1], m[2], 0, 1, 0, f)
      const b = pt(x1, y1, z1)
      p.ecke(b[0], b[1], b[2], 0, 1, 0, f)
      const a = pt(x0, y1, z0)
      p.ecke(a[0], a[1], a[2], 0, 1, 0, f)
    }
  }
}

/** Kugel (grob, 20 Flaechen) um (cx, cy, cz) im Rahmen R. */
const IKO: number[][] = (() => {
  const t = (1 + Math.sqrt(5)) / 2
  const v = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ].map((x) => {
    const l = Math.hypot(x[0], x[1], x[2])
    return [x[0] / l, x[1] / l, x[2] / l]
  })
  const f = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ]
  return f.flatMap((t3) => t3.map((i) => v[i]))
})()

function kugel(p: Puffer, R: Rahmen, cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, f: Color): void {
  const ux = R.ux
  const uz = R.uz
  const dx = -uz
  const dz = ux
  for (const q of IKO) {
    const x = cx + q[0] * rx
    const y = cy + q[1] * ry
    const z = cz + q[2] * rz
    const nx = q[0] / rx
    const ny = q[1] / ry
    const nz = q[2] / rz
    const l = Math.hypot(nx, ny, nz) || 1
    p.ecke(R.ox + ux * x + dx * z, R.oy + y, R.oz + uz * x + dz * z, (ux * nx + dx * nz) / l, ny / l, (uz * nx + dz * nz) / l, f, 0.8 + 0.2 * Math.max(0, q[1]))
  }
}

/* ------------------------------------------------ Farben */

function farbenAus(f: Farben3D) {
  const c = (s: string) => new Color(s || '#888888')
  const mix = (a: Color, b: Color, t: number) => a.clone().lerp(b, t)
  const b = {
    wand: c(f.wand3d),
    weiss: c(f.weiss),
    holz: c(f.holz),
    holzDunkel: c(f.holzDunkel),
    stoff: c(f.stoff),
    waesche: c(f.waesche),
    keramik: c(f.keramik),
    metall: c(f.metall),
    schwarz: c(f.schwarz),
    front: c(f.front),
    platte: c(f.platte),
    gruen: c(f.gruen),
    topf: c(f.topf),
    teppich: c(f.teppich),
    glas: c(f.glas),
    spiegel: c(f.spiegel),
    griff: c(f.griff),
    wasser: c(f.wasser),
    bildschirm: c(f.bildschirm),
    fassade: c(f.fassade),
    pappe: c(f.pappe),
    leinen: c(f.leinen),
    rot: c(f.spielRot),
    blau: c(f.spielBlau),
    gelb: c(f.spielGelb),
    gruenSpiel: c(f.spielGruen),
    zarge: c(f.zarge3d),
    wandKopf: c(f.wandKopf),
    boden: c(f.boden3d),
    weg: c(f.weg),
  }
  return {
    ...b,
    decke: mix(b.weiss, b.wand, 0.3),
    leibung: mix(b.wand, b.weiss, 0.4),
    estrich: mix(b.weg, b.metall, 0.4),
    beton: mix(b.fassade, b.metall, 0.35).multiplyScalar(0.92),
    gelaender: mix(b.metall, b.weiss, 0.35),
    feuerRot: new Color('#c4302b'),
    belag: {
      parkett: b.boden,
      fliese: mix(b.keramik, b.metall, 0.2),
      stein: mix(b.weg, b.fassade, 0.45),
      beton: mix(b.fassade, b.metall, 0.4).multiplyScalar(0.9),
      linol: mix(b.weiss, b.gruen, 0.12).multiplyScalar(0.93),
      teppich: mix(b.teppich, b.metall, 0.35),
      dielen: mix(b.holz, b.holzDunkel, 0.3),
    } as Record<BodenArt, Color>,
    bunt: [b.rot, b.blau, b.gelb, c(f.spielGruen), b.stoff, b.front, b.teppich, mix(b.rot, b.gelb, 0.5)],
  }
}

type FF = ReturnType<typeof farbenAus>

/* ------------------------------------------------ Bauen */

const EPS = 1e-6
/** Nach so vielen neuen Zahlen im Puffer (Ecken mal drei) kommt ein yield. */
const STUECK_ECKEN = 6000

/** Ein Inneres, das Stueck fuer Stueck entsteht (E87), damit kein Bild
 *  lange wartet. weiter(bis) baut, bis performance.now() bis erreicht ist
 *  (mindestens ein Stueck je Aufruf; ein Stueck kostet je nach Haus 0,1 bis
 *  3 ms), und gibt true, wenn alles da ist: dann steht es in teil.
 *  abbrechen() gibt alles bisher Gebaute frei (auch ein fertiges Teil);
 *  danach gibt weiter() true und teil bleibt null. */
export interface InnenBau {
  weiter(bis: number): boolean
  readonly teil: InnenTeil | null
  abbrechen(): void
}

/** Alles in einem Zug (Pruefungen; beim Begehen innenBauen). */
export function baueInnen(o: InnenOptionen): InnenTeil {
  const b = innenBauen(o)
  b.weiter(Infinity)
  if (!b.teil) throw new Error('innen3d: Inneres nicht fertig gebaut')
  return b.teil
}

/** Was beim Bauen entsteht und beim Abbrechen frei wird. */
interface Vorrat {
  geos: BufferGeometry[]
  mats: Material[]
  texturen: CanvasTexture[]
  gruppe: Group | null
}

export function innenBauen(o: InnenOptionen): InnenBau {
  const vorrat: Vorrat = { geos: [], mats: [], texturen: [], gruppe: null }
  const schritte = bauSchritte(o, vorrat)
  let teil: InnenTeil | null = null
  let aus = false
  return {
    weiter(bis: number): boolean {
      if (teil || aus) return true
      for (;;) {
        const r = schritte.next()
        if (r.done) {
          teil = r.value
          return true
        }
        if (performance.now() >= bis) return false
      }
    },
    get teil() {
      return aus ? null : teil
    },
    abbrechen(): void {
      if (aus) return
      aus = true
      if (teil) {
        teil.dispose()
        return
      }
      for (const x of vorrat.geos) x.dispose()
      for (const x of vorrat.mats) x.dispose()
      for (const x of vorrat.texturen) x.dispose()
      vorrat.gruppe?.clear()
    },
  }
}

/** Die Schritte des Baus; nach jedem Stueck ein yield. */
function* bauSchritte(o: InnenOptionen, vorrat: Vorrat): Generator<void, InnenTeil, void> {
  const plan = o.plan
  const gruppe = new Group()
  gruppe.name = 'innen'
  vorrat.gruppe = gruppe
  /** Die festen Meshes (Geschosse, Glas, Schrift); die Dinge haengen direkt in gruppe. */
  const fest = new Group()
  fest.name = 'innen:fest'
  const W = weltVon(o.zuWelt)
  const e = W.e
  const ty = e[13]
  const F = farbenAus(o.farben)
  const gh = plan.geschossHoehe
  const n = plan.geschosse.length
  const ebenen: Ebene3D[] = []
  const treppen: Treppe3D[] = []
  const dinge: WeltDing3D[] = []
  if (!n || !plan.ringe.length) return { gruppe, fest, stockMeshes: [], ebenen, treppen, dinge, fahrzeuge: [], dispose() {} }
  const { geos, mats, texturen } = vorrat
  const opak = new MeshLambertMaterial({ vertexColors: true })
  const glasMat = new MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.24, depthWrite: false, side: DoubleSide })
  mats.push(opak, glasMat)
  const glas = new Puffer(W, 1024)
  const zuWeltP = (x: number, z: number): P => [e[0] * x + e[8] * z + e[12], e[2] * x + e[10] * z + e[14]]
  /** Drehung (three) einer Richtung (ux, uz) im Haus, in der Welt. */
  const drehVon = (ux: number, uz: number) => {
    const wx = e[0] * ux + e[8] * uz
    const wz = e[2] * ux + e[10] * uz
    return Math.atan2(-wz, wx)
  }
  /** Hindernis: Rechteck mit Mitte (x, z) im Haus, Laenge entlang (ux, uz). */
  const hindernis = (liste: Hindernis3D[], x: number, z: number, ux: number, uz: number, laenge: number, tiefe: number, oben?: number | null) => {
    if (laenge < 0.02 || tiefe < 0.02) return
    const [wx, wz] = zuWeltP(x, z)
    const h: Hindernis3D = { x: wx, z: wz, laenge, tiefe, drehY: drehVon(ux, uz) }
    if (oben !== undefined && oben !== null) h.oben = oben
    liste.push(h)
  }
  // Schilder: Schrift auf einer gemeinsamen Zeichenflaeche (nur im Browser).
  const schriftPuffer = new Puffer(W, 256, true)
  const atlas = schriftAtlas(plan.geschosse.flatMap((g) => g.schilder.map((s) => s.text)))
  yield
  // Moebel: bei sehr vielen schlichter.
  const moebelGesamt = plan.geschosse.reduce((s, g) => s + g.moebel.length, 0)
  const schlicht = moebelGesamt > 700
  const stockPuffer: Puffer[] = []
  for (const g of plan.geschosse) {
    const p = new Puffer(W, 8192)
    stockPuffer.push(p)
    const yk = g.y
    const hind: Hindernis3D[] = []
    yield* bodenSchritte(p, plan, g, F)
    yield
    deckeBauen(p, plan, g, F)
    yield
    yield* aussenwandSchritte(p, glas, plan, g, F, hind, hindernis)
    // Ein Stueck: zwoelf Waende oder zehn Moebel, frueher, wenn schon viele Ecken dazukamen.
    let marke = p.n
    for (let i = 0; i < g.waende.length; i++) {
      wandBauen(p, g.waende[i], yk, gh, F, hind, hindernis, plan.ringe)
      if (i % 12 === 11 || p.n - marke > STUECK_ECKEN) {
        marke = p.n
        yield
      }
    }
    yield
    marke = p.n
    for (let i = 0; i < g.moebel.length; i++) {
      const m = g.moebel[i]
      moebelBauen(p, glas, m, yk, F, schlicht)
      if (m.hindernis) hindernis(hind, m.mitte[0], m.mitte[1], m.u[0], m.u[1], m.b, m.t, m.oben)
      if (i % 10 === 9 || p.n - marke > STUECK_ECKEN) {
        marke = p.n
        yield
      }
    }
    for (const s of g.schilder) schildBauen(p, schriftPuffer, s, yk, F, atlas)
    yield
    for (const f of g.fahrzeuge) {
      yield* fahrzeugEinbacken(p, glas, f.art, f.farbe, f.mitte, yk, f.gier)
      const v: P = [-Math.sin(f.gier), -Math.cos(f.gier)]
      const lb = f.art === 'feuerwehr' ? [8, 2.5] : f.art === 'rettung' ? [6, 2.1] : f.art === 'transporter' ? [5.3, 2] : f.art === 'bus' ? [12, 2.55] : [4.5, 1.85]
      hindernis(hind, f.mitte[0], f.mitte[1], v[0], v[1], lb[0], lb[1])
      yield
    }
    ebenen.push({ id: `${o.praefix}:${g.k}`, name: `${o.name} · ${g.k === 0 ? 'EG' : String(g.k)}`, y: yk + ty, hindernisse: hind })
  }
  // Laeufe: Geometrie im Geschoss, in dem sie beginnen, und Treppe3D.
  for (const l of plan.laeufe) {
    const p = stockPuffer[l.k]
    if (!p) continue
    laufBauen(p, l, gh, F)
    const mx = l.a[0] + (l.u[0] * l.laenge) / 2
    const mz = l.a[1] + (l.u[1] * l.laenge) / 2
    const [wx, wz] = zuWeltP(mx, mz)
    treppen.push({ id: `${o.praefix}:t${l.k}`, x: wx, z: wz, laenge: l.laenge, breite: l.breite, drehY: drehVon(l.u[0], l.u[1]), von: `${o.praefix}:${l.k}`, nach: `${o.praefix}:${l.k + 1}`, stufen: l.stufen })
    yield
  }
  // Schwelle an der Haustuer: vom Gelaende (aussen) auf den Boden des EG.
  // Die Stufen davor zeichnet stadt3d.ts (auch bei geschlossener Tuer).
  const t = plan.tuer
  if (t) {
    const breite = Math.max(0.7, t.breite - 0.1)
    const dy = ty - o.schwelleY
    const stufen = Math.abs(dy) < 0.2 ? 0 : Math.round(Math.abs(dy) / 0.17)
    const lang = SCHWELLE_VOR + SCHWELLE_HINTER
    const mitte = (SCHWELLE_HINTER - SCHWELLE_VOR) / 2
    const cx = t.mitte[0] + t.n[0] * mitte
    const cz = t.mitte[1] + t.n[1] * mitte
    const [wx, wz] = zuWeltP(cx, cz)
    treppen.push({ id: `${o.praefix}:schwelle`, x: wx, z: wz, laenge: lang, breite, drehY: drehVon(t.n[0], t.n[1]), von: o.bodenEbene, nach: `${o.praefix}:0`, stufen })
  }
  // Meshes.
  const stockMeshes: (Mesh | null)[] = stockPuffer.map(() => null)
  for (let k = 0; k < stockPuffer.length; k++) {
    const p = stockPuffer[k]
    const geo = p.bauen()
    if (!geo) continue
    geos.push(geo)
    const m = new Mesh(geo, opak)
    m.name = `innen:${k}`
    m.userData.dreiecke = p.dreiecke
    m.matrixAutoUpdate = false
    fest.add(m)
    stockMeshes[k] = m
    yield
  }
  const gg = glas.bauen()
  if (gg) {
    geos.push(gg)
    const m = new Mesh(gg, glasMat)
    m.name = 'innen:glas'
    m.renderOrder = 2
    m.userData.dreiecke = glas.dreiecke
    m.matrixAutoUpdate = false
    fest.add(m)
  }
  if (atlas) {
    const sg = schriftPuffer.bauen()
    if (sg) {
      geos.push(sg)
      const tex = new CanvasTexture(atlas.leinwand)
      tex.colorSpace = SRGBColorSpace
      tex.minFilter = LinearFilter
      tex.generateMipmaps = false
      texturen.push(tex)
      const sm = new MeshBasicMaterial({ map: tex, transparent: true })
      mats.push(sm)
      const m = new Mesh(sg, sm)
      m.name = 'innen:schrift'
      m.matrixAutoUpdate = false
      fest.add(m)
    }
  }
  gruppe.add(fest)
  yield
  // Dinge zum Aufheben. Kennung mit der Stelle im Plan (jedes Ding zaehlt,
  // auch eins ohne Geometrie) und der Art; die Farbe kommt aus der Kennung,
  // damit innenDingBauen dasselbe Ding allein aus ihr bauen kann (E87b).
  const dingMat = new MeshLambertMaterial({ vertexColors: true })
  mats.push(dingMat)
  let dn = 0
  for (const g of plan.geschosse) {
    for (const d of g.dinge) {
      const id = innenDingKennung(o.praefix, dn++, d.art)
      if (dn % 8 === 0) yield
      const geo = dingGeometrie(d.art, d.b, d.t, d.h, tonAus(id), F)
      if (!geo) continue
      geos.push(geo)
      const m = new Mesh(geo, dingMat)
      const [wx, wz] = zuWeltP(d.mitte[0], d.mitte[1])
      m.position.set(wx, g.y + d.y + ty, wz)
      // gier im Haus plus Drehung des Hauses.
      m.rotation.y = d.gier + drehVon(1, 0)
      m.name = id
      m.userData.ding = id
      gruppe.add(m)
      dinge.push({ id, objekt: m, breite: d.b, tiefe: d.t, hoehe: d.h, ebene: `${o.praefix}:${g.k}` })
    }
  }
  gruppe.updateMatrixWorld(true)
  return {
    gruppe,
    fest,
    stockMeshes,
    ebenen,
    treppen,
    dinge,
    fahrzeuge: [],
    dispose() {
      for (const x of geos) x.dispose()
      for (const x of mats) x.dispose()
      for (const x of texturen) x.dispose()
      fest.clear()
      gruppe.clear()
    },
  }
}


/* ------------------------------------------------ Boden und Decke */

/** Dreiecke eines Vielecks mit Loechern bei Hoehe y, nach oben oder unten. */
function flaecheMitLoechern(p: Puffer, aussen: P[], loecher: P[][], y: number, f: Color, oben: boolean): void {
  if (aussen.length < 3) return
  const kontur = aussen.map((q) => new Vector2(q[0], q[1]))
  const hl = loecher.filter((l) => l.length >= 3).map((l) => l.map((q) => new Vector2(q[0], q[1])))
  const alle = [...kontur, ...hl.flat()]
  let dreiecke: number[][]
  try {
    dreiecke = ShapeUtils.triangulateShape(kontur, hl)
  } catch {
    return
  }
  const ny = oben ? 1 : -1
  for (const [i, j, k] of dreiecke) {
    const a = alle[i]
    let b = alle[j]
    let c = alle[k]
    // Kreuzprodukt in (x, z): y-Anteil von (b - a) x (c - a).
    const kr = (b.y - a.y) * (c.x - a.x) - (b.x - a.x) * (c.y - a.y)
    if (kr > 0 !== oben) {
      const t = b
      b = c
      c = t
    }
    p.ecke(a.x, y, a.y, 0, ny, 0, f)
    p.ecke(b.x, y, b.y, 0, ny, 0, f)
    p.ecke(c.x, y, c.y, 0, ny, 0, f)
  }
}

function bodenVielecke(plan: InnenPlan, g: InnenGeschoss): { aussen: P[]; loecher: P[][] }[] {
  if (g.boden) return g.boden.map((z) => ({ aussen: zoneImUmriss(z, plan.ringe[0]), loecher: g.loecher.filter((l) => l.every((q) => punktIn(q, z))) })).filter((x) => x.aussen.length >= 3)
  return [{ aussen: plan.ringe[0], loecher: [...plan.ringe.slice(1), ...g.loecher] }]
}

function punktIn(p: P, poly: P[]): boolean {
  let drin = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    if (a[1] > p[1] !== b[1] > p[1] && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) drin = !drin
  }
  return drin
}

/** Umriss auf eine konvexe Zone beschnitten (Sutherland-Hodgman). */
function zoneImUmriss(zone: P[], umriss: P[]): P[] {
  let poly = umriss.slice()
  // Zone im gleichen Umlauf wie gegen den Uhrzeigersinn (Mathe) behandeln.
  let s = 0
  for (let i = 0; i < zone.length; i++) {
    const a = zone[i]
    const b = zone[(i + 1) % zone.length]
    s += a[0] * b[1] - b[0] * a[1]
  }
  const z = s >= 0 ? zone : zone.slice().reverse()
  for (let i = 0; i < z.length && poly.length; i++) {
    const a = z[i]
    const b = z[(i + 1) % z.length]
    const innen = (q: P) => (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]) >= -EPS
    const out: P[] = []
    for (let k = 0; k < poly.length; k++) {
      const p0 = poly[k]
      const p1 = poly[(k + 1) % poly.length]
      const i0 = innen(p0)
      const i1 = innen(p1)
      if (i0) out.push(p0)
      if (i0 !== i1) {
        const d0 = (b[0] - a[0]) * (p0[1] - a[1]) - (b[1] - a[1]) * (p0[0] - a[0])
        const d1 = (b[0] - a[0]) * (p1[1] - a[1]) - (b[1] - a[1]) * (p1[0] - a[0])
        const t = d0 / (d0 - d1)
        out.push([p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t])
      }
    }
    poly = out
  }
  return poly
}

/** Boden eines Geschosses; yield nach dem Estrich und je acht Raeumen. */
function* bodenSchritte(p: Puffer, plan: InnenPlan, g: InnenGeschoss, F: FF): Generator<void, void, void> {
  // Estrich knapp unter den Raeumen, dort wo keine Zelle liegt (unter Waenden, an schraegen Kanten).
  for (const v of bodenVielecke(plan, g)) flaecheMitLoechern(p, v.aussen, v.loecher, g.y - 0.012, F.estrich, true)
  yield
  // Belag je Raum.
  for (let i = 0; i < g.raeume.length; i++) {
    const r = g.raeume[i]
    const f = F.belag[r.boden] ?? F.belag.parkett
    for (const q of r.rechtecke) flaecheMitLoechern(p, q, [], g.y, f, true)
    if (i % 8 === 7) yield
  }
}

function deckeBauen(p: Puffer, plan: InnenPlan, g: InnenGeschoss, F: FF): void {
  const n = plan.geschosse.length
  const gh = plan.geschossHoehe
  const oben = plan.geschosse[g.k + 1]
  const y = (g.k + 1) * gh - DECKE_M
  if (oben) {
    for (const v of bodenVielecke(plan, oben)) {
      flaecheMitLoechern(p, v.aussen, v.loecher, y, F.decke, false)
      // Kanten der Loecher (Treppen) und Ränder der Emporen: Plattenstirn.
      for (const l of v.loecher.filter((x) => oben.loecher.includes(x))) stirn(p, l, y, y + DECKE_M, F.decke, true)
      // Raender der Emporen; nicht dort, wo sie in der Aussenwand liegen (die Fassade ist davor).
      if (oben.boden) stirn(p, v.aussen, y, y + DECKE_M, F.decke, false, plan.ringe)
    }
  }
  if (g.k === n - 1) flaecheMitLoechern(p, plan.ringe[0], plan.ringe.slice(1), n * gh - DECKE_M, F.decke, false)
}

/** Senkrechte Flaechen entlang eines Vielecks (Plattenkante), nach innen oder aussen. */
function stirn(p: Puffer, poly: P[], y0: number, y1: number, f: Color, nachInnen: boolean, ohneIn: P[][] | null = null): void {
  let s = 0
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    s += a[0] * b[1] - b[0] * a[1]
  }
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const L = Math.hypot(b[0] - a[0], b[1] - a[1])
    if (L < 1e-6) continue
    if (ohneIn && abstandRinge(ohneIn, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2) < AUSSENWAND_M) continue
    // Linke Normale (-dz, dx) zeigt bei positiver Flaeche nach innen.
    let nx = -(b[1] - a[1]) / L
    let nz = (b[0] - a[0]) / L
    if (s < 0) {
      nx = -nx
      nz = -nz
    }
    if (!nachInnen) {
      nx = -nx
      nz = -nz
    }
    // Ecken so ordnen, dass die Seite n vorne liegt.
    const kr = (b[0] - a[0]) * nz - (b[1] - a[1]) * nx
    const [q0, q1] = kr > 0 ? [a, b] : [b, a]
    p.viereck([q0[0], y0, q0[1]], [q1[0], y0, q1[1]], [q1[0], y1, q1[1]], [q0[0], y1, q0[1]], [nx, 0, nz], f, 0.9)
  }
}

/* ------------------------------------------------ Aussenwand */

/** Innenseite der Aussenwand eines Geschosses; nach jeder Kante ein yield. */
function* aussenwandSchritte(
  p: Puffer,
  glas: Puffer,
  plan: InnenPlan,
  g: InnenGeschoss,
  F: FF,
  hind: Hindernis3D[],
  hindernis: (l: Hindernis3D[], x: number, z: number, ux: number, uz: number, laenge: number, tiefe: number, oben?: number | null) => void,
): Generator<void, void, void> {
  const gh = plan.geschossHoehe
  const y0 = g.y
  const y1 = g.y + gh
  const AW = AUSSENWAND_M
  // Die Aussenseite zeichnet stadt3d.ts (Fassade auf dem Umriss, s = 0):
  // hier nur Innenseite, Leibungen und Bretter, keine zweite Aussenseite.
  const S0 = 0
  for (let ri = 0; ri < plan.ringe.length; ri++) {
    const ring = plan.ringe[ri]
    const nR = ring.length
    let s = 0
    for (let i = 0; i < nR; i++) {
      const a = ring[i]
      const b = ring[(i + 1) % nR]
      s += a[0] * b[1] - b[0] * a[1]
    }
    // Innen: Umriss links bei positiver Flaeche; Hof umgekehrt.
    const vz = (s > 0 ? 1 : -1) * (ri === 0 ? 1 : -1)
    const kanten = ring.map((a, i) => {
      const b = ring[(i + 1) % nR]
      const L = Math.hypot(b[0] - a[0], b[1] - a[1])
      const u: P = L > 1e-9 ? [(b[0] - a[0]) / L, (b[1] - a[1]) / L] : [1, 0]
      const nn: P = [-u[1] * vz, u[0] * vz]
      return { a, b, L, u, n: nn }
    })
    // Gehrung: Schnitt der inneren Linien benachbarter Kanten (begrenzt).
    const gehrung = (i: number): P => {
      const k0 = kanten[(i - 1 + nR) % nR]
      const k1 = kanten[i]
      const p0: P = [k0.a[0] + k0.n[0] * AW, k0.a[1] + k0.n[1] * AW]
      const p1: P = [k1.a[0] + k1.n[0] * AW, k1.a[1] + k1.n[1] * AW]
      const den = k0.u[0] * k1.u[1] - k0.u[1] * k1.u[0]
      if (Math.abs(den) < 1e-6) return p1
      const t = ((p1[0] - p0[0]) * k1.u[1] - (p1[1] - p0[1]) * k1.u[0]) / den
      const q: P = [p0[0] + k0.u[0] * t, p0[1] + k0.u[1] * t]
      const ecke = ring[i]
      const d = Math.hypot(q[0] - ecke[0], q[1] - ecke[1])
      if (d > AW * 4) return [ecke[0] + ((q[0] - ecke[0]) / d) * AW * 4, ecke[1] + ((q[1] - ecke[1]) / d) * AW * 4]
      return q
    }
    for (let i = 0; i < kanten.length; i++) {
      const K = kanten[i]
      if (K.L < 0.02) continue
      const g0 = gehrung(i)
      const g1 = gehrung((i + 1) % nR)
      // Innen-Anfang und -Ende entlang u (ab K.a).
      const ti0 = (g0[0] - K.a[0]) * K.u[0] + (g0[1] - K.a[1]) * K.u[1]
      const ti1 = (g1[0] - K.a[0]) * K.u[0] + (g1[1] - K.a[1]) * K.u[1]
      // Oeffnungen auf dieser Kante.
      const off: { t0: number; t1: number; u0: number; u1: number; glas: boolean }[] = []
      for (const f of plan.fenster) {
        if (f.ring !== ri || f.kante !== i) continue
        if (g.k === 0 && !f.eg) continue
        off.push({ t0: f.t - FENSTER_B / 2, t1: f.t + FENSTER_B / 2, u0: FENSTER_BRUESTUNG, u1: FENSTER_BRUESTUNG + FENSTER_H, glas: true })
      }
      const tuer = g.k === 0 && ri === 0 && plan.tuer && plan.tuer.kante === i ? plan.tuer : null
      // Haustuer so hoch wie die Luecke in der Fassade (stadt3d.ts).
      if (tuer) off.push({ t0: tuer.t - tuer.breite / 2, t1: tuer.t + tuer.breite / 2, u0: 0, u1: Math.min(TUER_H, gh), glas: false })
      off.sort((a, b) => a.t0 - b.t0)
      // Punkte: t entlang, s nach innen (0 Umriss, AW Innenseite).
      const pt = (t: number, sq: number, y: number) => [K.a[0] + K.u[0] * t + K.n[0] * sq, y, K.a[1] + K.u[1] * t + K.n[1] * sq]
      const N3 = [K.n[0], 0, K.n[1]]
      /** Ein Stueck Wand von t0 bis t1 (innen auf [ti0, ti1] begrenzt), Hoehe ya..yb. */
      const stueck = (t0: number, t1: number, ya: number, yb: number, rand0: boolean, rand1: boolean, deckelOben: boolean, deckelUnten: boolean) => {
        const ia = Math.max(t0, ti0)
        const ib = Math.min(t1, ti1)
        if (ib - ia < 1e-4 || yb - ya < 1e-4) return
        // Innenseite (Blick ins Haus: Normale n). Ecken gegen den Uhrzeigersinn von n aus gesehen.
        const quad = (a: number[], b: number[], c: number[], d: number[], nn: number[], f: Color, k = 1) => {
          // Orientierung pruefen und notfalls umdrehen.
          const ux = b[0] - a[0]
          const uy = b[1] - a[1]
          const uz = b[2] - a[2]
          const vx = d[0] - a[0]
          const vy = d[1] - a[1]
          const vz2 = d[2] - a[2]
          const cx = uy * vz2 - uz * vy
          const cy = uz * vx - ux * vz2
          const cz = ux * vy - uy * vx
          if (cx * nn[0] + cy * nn[1] + cz * nn[2] >= 0) p.viereck(a, b, c, d, nn, f, k)
          else p.viereck(a, d, c, b, nn, f, k)
        }
        quad(pt(ia, AW, ya), pt(ib, AW, ya), pt(ib, AW, yb), pt(ia, AW, yb), N3, F.wand)
        const L3 = [-K.u[0], 0, -K.u[1]]
        const R3 = [K.u[0], 0, K.u[1]]
        // Leibung am Anfang schaut zur Oeffnung davor (-u), am Ende zur Oeffnung danach (+u).
        if (rand0) quad(pt(t0, S0, ya), pt(t0, AW, ya), pt(t0, AW, yb), pt(t0, S0, yb), L3, F.leibung, 0.95)
        if (rand1) quad(pt(t1, S0, ya), pt(t1, AW, ya), pt(t1, AW, yb), pt(t1, S0, yb), R3, F.leibung, 0.95)
        if (deckelOben) quad(pt(Math.max(t0, 0), S0, yb), pt(Math.min(t1, K.L), S0, yb), pt(ib, AW, yb), pt(ia, AW, yb), [0, 1, 0], F.leibung)
        if (deckelUnten) quad(pt(Math.max(t0, 0), S0, ya), pt(Math.min(t1, K.L), S0, ya), pt(ib, AW, ya), pt(ia, AW, ya), [0, -1, 0], F.leibung, 0.85)
      }
      // Leibung und Sturz der Haustuer zeichnet stadt3d.ts (sonst doppelt).
      let t = -1e3
      let randVorher = false
      for (const q of off) {
        stueck(t, q.t0, y0, y1, randVorher, q.glas, false, false)
        if (q.u0 > 0) stueck(q.t0, q.t1, y0, y0 + q.u0, false, false, true, false)
        stueck(q.t0, q.t1, y0 + q.u1, y1, false, false, false, q.glas)
        if (q.glas) {
          const gs = 0.18
          glas.viereck(pt(q.t0, gs, y0 + q.u0), pt(q.t1, gs, y0 + q.u0), pt(q.t1, gs, y0 + q.u1), pt(q.t0, gs, y0 + q.u1), N3, F.glas)
          // Fensterbrett innen.
          const R: Rahmen = { ox: K.a[0] + K.u[0] * (q.t0 + q.t1) / 2 + K.n[0] * AW, oy: y0, oz: K.a[1] + K.u[1] * (q.t0 + q.t1) / 2 + K.n[1] * AW, ux: -K.n[1], uz: K.n[0] }
          // In R zeigt D = (-uz, ux) = -n: x laengs der Wand, z nach aussen (Glas bei z = 0,12).
          // Nur oben und vorn sichtbar: die Leibung rahmt das Glas.
          kasten(p, R, -(q.t1 - q.t0) / 2 - 0.04, (q.t1 - q.t0) / 2 + 0.04, q.u0 - 0.035, q.u0 + 0.005, -0.06, 0.12, F.weiss, 4 | 32)
        } else {
          // Haustuer: Zarge innen.
          const R: Rahmen = { ox: K.a[0] + K.u[0] * (q.t0 + q.t1) / 2 + K.n[0] * AW, oy: y0, oz: K.a[1] + K.u[1] * (q.t0 + q.t1) / 2 + K.n[1] * AW, ux: -K.n[1], uz: K.n[0] }
          const h = (q.t1 - q.t0) / 2
          kasten(p, R, -h - 0.08, -h, 0, q.u1 + 0.08, -0.03, 0.03, F.zarge)
          kasten(p, R, h, h + 0.08, 0, q.u1 + 0.08, -0.03, 0.03, F.zarge)
          kasten(p, R, -h, h, q.u1, q.u1 + 0.08, -0.03, 0.03, F.zarge)
        }
        t = q.t1
        randVorher = q.glas
      }
      stueck(t, 1e3, y0, y1, randVorher, false, false, false)
      // Hindernisse: die Kante entlang, im EG mit Luecke an der Haustuer.
      const lang = K.L + 0.3
      const mz = (a0: number, a1: number) => {
        const tm = (a0 + a1) / 2
        hindernis(hind, K.a[0] + K.u[0] * tm + K.n[0] * (AW / 2), K.a[1] + K.u[1] * tm + K.n[1] * (AW / 2), K.u[0], K.u[1], a1 - a0, AW)
      }
      if (tuer) {
        mz(-0.15, tuer.t - tuer.breite / 2)
        mz(tuer.t + tuer.breite / 2, K.L + 0.15)
      } else mz(-0.15, -0.15 + lang)
      yield
    }
  }
}

/* ------------------------------------------------ Innenwaende */

function wandBauen(
  p: Puffer,
  w: InnenWand,
  yk: number,
  gh: number,
  F: FF,
  hind: Hindernis3D[],
  hindernis: (l: Hindernis3D[], x: number, z: number, ux: number, uz: number, laenge: number, tiefe: number, oben?: number | null) => void,
  ringe: P[][] | null = null,
): void {
  const L = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1])
  if (L < 0.02) return
  const ux = (w.b[0] - w.a[0]) / L
  const uz = (w.b[1] - w.a[1]) / L
  // Rahmen: U entlang der Wand, D = (-uz, ux) quer.
  const R: Rahmen = { ox: w.a[0], oy: yk, oz: w.a[1], ux, uz }
  const luecken = [...w.luecken].sort((a, b) => a.t0 - b.t0)
  const stuecke: [number, number][] = []
  let t = 0
  for (const l of luecken) {
    if (l.t0 > t) stuecke.push([t, l.t0])
    t = Math.max(t, l.t1)
  }
  if (t < L) stuecke.push([t, L])
  if (w.art === 'sperre') {
    for (const [a, b] of stuecke) hindernis(hind, w.a[0] + ux * (a + b) / 2, w.a[1] + uz * (a + b) / 2, ux, uz, b - a, Math.max(0.08, w.dicke))
    return
  }
  if (w.art === 'gelaender') {
    for (const [a, b] of stuecke) {
      if (b - a < 0.05) continue
      kasten(p, R, a, b, 0.96, 1.0, -0.025, 0.025, F.gelaender, ALLE)
      kasten(p, R, a, b, 0.08, 0.12, -0.012, 0.012, F.gelaender, ALLE)
      const nP = Math.max(1, Math.ceil((b - a) / 1.4))
      for (let i = 0; i <= nP; i++) {
        const x = a + ((b - a) * i) / nP
        kasten(p, R, x - 0.02, x + 0.02, 0, 0.96, -0.02, 0.02, F.gelaender, 1 | 2 | 16 | 32)
      }
      hindernis(hind, w.a[0] + ux * (a + b) / 2, w.a[1] + uz * (a + b) / 2, ux, uz, b - a, 0.08)
    }
    return
  }
  const d = w.dicke / 2
  const oben = gh - DECKE_M
  // Gezeichnet nur bis an die Innenseite der Aussenwand: weiter draussen
  // laege die Stirn auf der Fassade von stadt3d.ts (Flimmern) oder in einer
  // Fensterleibung. Als Hindernis bleibt die Wand ganz.
  const [ta, tb] = ringe ? wandInnen(ringe, w.a, ux, uz, L) : [0, L]
  for (const [a, b] of stuecke) {
    const a1 = Math.max(a, ta)
    const b1 = Math.min(b, tb)
    if (b1 - a1 > 1e-3) kasten(p, R, a1, b1, 0, oben, -d, d, F.wand, 1 | 2 | 16 | 32)
    hindernis(hind, w.a[0] + ux * (a + b) / 2, w.a[1] + uz * (a + b) / 2, ux, uz, b - a, Math.max(0.1, w.dicke))
  }
  for (const l of luecken) {
    const h = Math.min(l.hoehe, oben)
    if (h < oben - 0.01) kasten(p, R, l.t0, l.t1, h, oben, -d, d, F.wand, 1 | 2 | 8 | 16 | 32)
    if (l.art === 'tuer') {
      // Zarge: zwei Pfosten und ein Kaempfer, etwas breiter als die Wand.
      const z = d + 0.015
      kasten(p, R, l.t0 - 0.06, l.t0, 0, h + 0.06, -z, z, F.zarge, 1 | 2 | 4 | 16 | 32)
      kasten(p, R, l.t1, l.t1 + 0.06, 0, h + 0.06, -z, z, F.zarge, 1 | 2 | 4 | 16 | 32)
      kasten(p, R, l.t0, l.t1, h, h + 0.06, -z, z, F.zarge, 8 | 16 | 32)
    } else if (l.art === 'front') {
      // Ladenfront: schmaler Rahmen.
      kasten(p, R, l.t0 - 0.05, l.t0, 0, h, -d - 0.02, d + 0.02, F.metall, 1 | 2 | 16 | 32)
      kasten(p, R, l.t1, l.t1 + 0.05, 0, h, -d - 0.02, d + 0.02, F.metall, 1 | 2 | 16 | 32)
    }
  }
}

/** Abstand eines Punkts zu den Ringen (Umriss und Hoefe). */
function abstandRinge(ringe: P[][], x: number, z: number): number {
  let m = Infinity
  for (const r of ringe) {
    for (let i = 0; i < r.length; i++) {
      const a = r[i]
      const b = r[(i + 1) % r.length]
      const dx = b[0] - a[0]
      const dz = b[1] - a[1]
      const l2 = dx * dx + dz * dz
      const t = l2 > 0 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2)) : 0
      m = Math.min(m, Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t))
    }
  }
  return m
}

/** Wo eine Innenwand (ab a in Richtung u, Laenge L) innerhalb der
 *  Aussenwand liegt: [ta, tb], die Teile davor und danach reichen in die
 *  Aussenwand (naeher als AUSSENWAND_M am Umriss). */
function wandInnen(ringe: P[][], a: P, ux: number, uz: number, L: number): [number, number] {
  const grenze = AUSSENWAND_M - 0.01
  const ende = (von: number, nach: number): number => {
    const ab = (t: number) => abstandRinge(ringe, a[0] + ux * t, a[1] + uz * t)
    if (ab(von) >= grenze) return von
    let lo = von
    let hi = von + Math.sign(nach - von) * Math.min(Math.abs(nach - von) / 2, 1.5)
    if (ab(hi) < grenze) return von
    for (let i = 0; i < 14; i++) {
      const m = (lo + hi) / 2
      if (ab(m) < grenze) lo = m
      else hi = m
    }
    return hi
  }
  return [ende(0, L), ende(L, 0)]
}

/* ------------------------------------------------ Treppen */

function laufBauen(p: Puffer, l: { k: number; a: P; u: P; laenge: number; breite: number; stufen: number }, gh: number, F: FF): void {
  const n = Math.max(1, l.stufen)
  const auftritt = l.laenge / n
  const steig = gh / n
  const y0 = l.k * gh
  // Rahmen: U quer (Breite), D entlang der Laufrichtung: D = (-uz, ux) soll l.u sein, also U = (l.u.z, -l.u.x).
  const R: Rahmen = { ox: l.a[0], oy: y0, oz: l.a[1], ux: l.u[1], uz: -l.u[0] }
  const hb = l.breite / 2
  for (let j = 0; j < n; j++) {
    const z0 = j * auftritt
    const z1 = (j + 1) * auftritt
    // Oberkante wie die Rampe in der Mitte des Auftritts.
    const top = (j + 0.5) * steig
    kasten(p, R, -hb, hb, Math.max(0, top - steig - 0.16), top, z0, z1, F.beton, 1 | 2 | 4 | 32)
  }
  // Untersicht schraeg.
  const unten = (z: number) => (z / l.laenge) * gh - 0.2
  const pt = (x: number, y: number, z: number) => [R.ox + R.ux * x - R.uz * z, R.oy + y, R.oz + R.uz * x + R.ux * z]
  p.viereck(pt(-hb, unten(0), 0), pt(hb, unten(0), 0), pt(hb, unten(l.laenge), l.laenge), pt(-hb, unten(l.laenge), l.laenge), [0, -1, 0], F.beton, 0.8)
  // Handlaeufe auf beiden Seiten (schraeg, 0,9 m ueber den Stufen) mit Pfosten.
  for (const x of [-hb + 0.04, hb - 0.04]) {
    const n2 = 6
    for (let i = 0; i < n2; i++) {
      const za = (l.laenge * i) / n2
      const zb = (l.laenge * (i + 1)) / n2
      const ya = (za / l.laenge) * gh + 0.9
      const yb = (zb / l.laenge) * gh + 0.9
      kasten(p, R, x - 0.025, x + 0.025, Math.min(ya, yb) - 0.02, Math.max(ya, yb) + 0.02, za, zb, F.gelaender, ALLE)
    }
    for (const z of [0.15, l.laenge / 2, l.laenge - 0.15]) {
      const y = (z / l.laenge) * gh
      kasten(p, R, x - 0.02, x + 0.02, y, y + 0.9, z - 0.02, z + 0.02, F.gelaender, 1 | 2 | 16 | 32)
    }
  }
}

/* ------------------------------------------------ Schilder */

interface Atlas {
  leinwand: HTMLCanvasElement
  zeile: Map<string, number>
  zeilen: number
}

function schriftAtlas(texte: string[]): Atlas | null {
  if (typeof document === 'undefined' || !texte.length) return null
  const eindeutig = [...new Set(texte.map((t) => t.trim()).filter(Boolean))].slice(0, 64)
  if (!eindeutig.length) return null
  const leinwand = document.createElement('canvas')
  const ZH = 64
  leinwand.width = 512
  leinwand.height = ZH * eindeutig.length
  const ctx = leinwand.getContext('2d')
  if (!ctx) return null
  const zeile = new Map<string, number>()
  eindeutig.forEach((t, i) => {
    ctx.clearRect(0, i * ZH, 512, ZH)
    let px = 40
    ctx.font = `700 ${px}px system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans Arabic", Tahoma, sans-serif`
    while (px > 14 && ctx.measureText(t).width > 490) {
      px -= 2
      ctx.font = `700 ${px}px system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans Arabic", Tahoma, sans-serif`
    }
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(t, 256, i * ZH + ZH / 2 + 2)
    zeile.set(t, i)
  })
  return { leinwand, zeile, zeilen: eindeutig.length }
}

function schildBauen(p: Puffer, schrift: Puffer, s: { text: string; mitte: P; u: P; n: P; breite: number; hoehe: number; y: number }, yk: number, F: FF, atlas: Atlas | null): void {
  // Brett: x entlang u, z zum Betrachter (n).
  const R: Rahmen = { ox: s.mitte[0], oy: yk, oz: s.mitte[1], ux: s.u[0], uz: s.u[1] }
  // In R zeigt D = (-u.z, u.x) zum Betrachter, wenn u = (n.z, -n.x) (so legt es der Generator an).
  const dz = -s.u[1] * s.n[0] + s.u[0] * s.n[1] >= 0 ? 1 : -1
  const hb = s.breite / 2
  kasten(p, R, -hb, hb, s.y, s.y + s.hoehe, dz > 0 ? 0 : -0.05, dz > 0 ? 0.05 : 0, F.schwarz, ALLE)
  if (!atlas) return
  const z = atlas.zeile.get(s.text.trim())
  if (z === undefined) return
  const v0 = 1 - (z + 1) / atlas.zeilen
  const v1 = 1 - z / atlas.zeilen
  const zz = dz * 0.052
  const pt = (x: number, y: number) => [R.ox + R.ux * x - R.uz * zz, R.oy + y, R.oz + R.uz * x + R.ux * zz]
  // Leserichtung: von links nach rechts, wenn man auf die Seite n schaut.
  const links = pt(-hb + 0.04, s.y + 0.04)
  const rechts = pt(hb - 0.04, s.y + 0.04)
  const rechtsO = pt(hb - 0.04, s.y + s.hoehe - 0.04)
  const linksO = pt(-hb + 0.04, s.y + s.hoehe - 0.04)
  const w = new Color(1, 1, 1)
  const nn = [s.n[0], 0, s.n[1]]
  const e = (q: number[], u: number, v: number) => schrift.ecke(q[0], q[1], q[2], nn[0], nn[1], nn[2], w, 1, u, v)
  // u ist die Leserichtung fuer den, der auf die Seite n schaut (u = (n.z, -n.x)).
  e(links, 0, v0)
  e(rechts, 1, v0)
  e(rechtsO, 1, v1)
  e(links, 0, v0)
  e(rechtsO, 1, v1)
  e(linksO, 0, v1)
}

/* ------------------------------------------------ Fahrzeuge (eingebacken) */

/** Ein Fahrzeug als Dreiecke (lokal, Ursprung unten in der Mitte, vorne
 *  -z): Lage, Richtung und Farbe je Ecke, undurchsichtig und Glas. */
interface FahrzeugVorlage {
  opak: { l: Float32Array; r: Float32Array; f: Float32Array }
  glas: { l: Float32Array; r: Float32Array; f: Float32Array }
}

/** Einmal je Art und Farbe aus fahrzeug3d.ts gerechnet (kostet beim ersten
 *  Mal einige Millisekunden, danach nur das Kopieren). Klein (reine Zahlen),
 *  hoechstens VORLAGEN_MAX Stueck. */
const vorlagen = new Map<string, FahrzeugVorlage>()
const VORLAGEN_MAX = 12

function fahrzeugVorlage(art: Fahrzeug3D['art'], farbe: string): FahrzeugVorlage {
  const key = `${art}|${farbe}`
  const alt = vorlagen.get(key)
  if (alt) {
    vorlagen.delete(key)
    vorlagen.set(key, alt)
    return alt
  }
  const f = baueFahrzeug(art, farbe, 'deko', { x: 0, z: 0, gier: 0, ebene: '' })
  let neu: FahrzeugVorlage
  try {
    f.gruppe.position.set(0, 0, 0)
    f.gruppe.rotation.set(0, 0, 0)
    f.gruppe.updateMatrixWorld(true)
    // Erst zaehlen, dann gleich in die Felder schreiben.
    const teile: { m: Mesh; glas: boolean }[] = []
    let nOpak = 0
    let nGlas = 0
    f.gruppe.traverse((obj: Object3D) => {
      const m = obj as Mesh
      if (!m.isMesh || !m.geometry || !m.geometry.getAttribute('position')) return
      const mat = (Array.isArray(m.material) ? m.material[0] : m.material) as MeshLambertMaterial
      const glas = !!mat && mat.transparent && mat.opacity < 0.95
      const geo = m.geometry as BufferGeometry
      const anzahl = geo.index ? geo.index.count : geo.getAttribute('position').count
      if (glas) nGlas += anzahl
      else nOpak += anzahl
      teile.push({ m, glas })
    })
    const feld = (n: number) => ({ l: new Float32Array(3 * n), r: new Float32Array(3 * n), f: new Float32Array(3 * n) })
    neu = { opak: feld(nOpak), glas: feld(nGlas) }
    let iOpak = 0
    let iGlas = 0
    const grau = new Color(0.6, 0.6, 0.6)
    for (const { m, glas } of teile) {
      const geo = m.geometry as BufferGeometry
      const pos = geo.getAttribute('position')
      const nor = geo.getAttribute('normal')
      const farben = geo.getAttribute('color')
      const mat = (Array.isArray(m.material) ? m.material[0] : m.material) as MeshLambertMaterial
      const grund = mat && (mat as { color?: Color }).color ? (mat as { color: Color }).color : grau
      const ziel = glas ? neu.glas : neu.opak
      const idx = geo.index
      const anzahl = idx ? idx.count : pos.count
      const e = m.matrixWorld.elements
      let j = glas ? iGlas : iOpak
      for (let k = 0; k < anzahl; k++) {
        const i = idx ? idx.getX(k) : k
        const x = pos.getX(i)
        const y = pos.getY(i)
        const z = pos.getZ(i)
        ziel.l[j] = e[0] * x + e[4] * y + e[8] * z + e[12]
        ziel.l[j + 1] = e[1] * x + e[5] * y + e[9] * z + e[13]
        ziel.l[j + 2] = e[2] * x + e[6] * y + e[10] * z + e[14]
        const nx = nor ? nor.getX(i) : 0
        const ny = nor ? nor.getY(i) : 1
        const nz = nor ? nor.getZ(i) : 0
        ziel.r[j] = e[0] * nx + e[4] * ny + e[8] * nz
        ziel.r[j + 1] = e[1] * nx + e[5] * ny + e[9] * nz
        ziel.r[j + 2] = e[2] * nx + e[6] * ny + e[10] * nz
        ziel.f[j] = grund.r * (farben ? farben.getX(i) : 1)
        ziel.f[j + 1] = grund.g * (farben ? farben.getY(i) : 1)
        ziel.f[j + 2] = grund.b * (farben ? farben.getZ(i) : 1)
        j += 3
      }
      if (glas) iGlas = j
      else iOpak = j
    }
  } finally {
    f.dispose()
  }
  vorlagen.set(key, neu)
  while (vorlagen.size > VORLAGEN_MAX) {
    const erst = vorlagen.keys().next().value
    if (erst === undefined) break
    vorlagen.delete(erst)
  }
  return neu
}

/** Die Vorlagen aller Fahrzeuge, die innenPlanen hinstellen kann, schon
 *  jetzt rechnen (stadt3d.ts beim Laden der Stadt), damit das erste Haus mit
 *  Fahrzeug spaeter kein Bild aufhaelt. Dauert einige Millisekunden. */
export function innenVorbereiten(farben: Farben3D): void {
  for (const { art, farbe } of INNEN_FAHRZEUGE) fahrzeugVorlage(art, farbe)
  // Einmal ein kleines Probehaus mit jedem Moebel und jedem Ding bauen und
  // gleich wieder freigeben: so sind die Bauteile schon uebersetzt, wenn das
  // erste echte Haus kommt (sonst kostet das erste Stueck ein Vielfaches).
  if (vorbereitet) return
  vorbereitet = true
  baueInnen({ plan: probePlan(), farben, zuWelt: new Matrix4(), praefix: 'probe', name: 'Probe', bodenEbene: 'boden', schwelleY: -0.5 }).dispose()
}
let vorbereitet = false

/* Alle Arten (Record: der Uebersetzer meldet, wenn eine fehlt). */
const ALLE_MOEBEL: Record<MoebelArt, true> = {
  bett2: true, bett1: true, nachttisch: true, schrank: true, kommode: true, sofa: true, sessel: true, couchtisch: true, tv: true,
  esstisch: true, stuhl: true, kueche: true, kuehlschrank: true, wanne: true, dusche: true, wc: true, becken: true, waschmaschine: true,
  garderobe: true, regal: true, schreibtisch: true, buerostuhl: true, pflanze: true, teppich: true, theke: true, regalwand: true,
  gondel: true, kuehlregal: true, kasse: true, auslage: true, kleiderstaender: true, cafetisch: true, bank: true, spind: true,
  schlauch: true, werkbank: true, empfang: true, wartestuhl: true, spitalbett: true, vorhang: true, liege: true, schulbank: true,
  lehrertisch: true, tafel: true, kindertisch: true, spielregal: true, matte: true, kirchenbank: true, altar: true, podest: true,
  ambo: true, orgel: true, aktenschrank: true, hochregal: true, werkzeugwand: true, rasenmaeher: true, schubkarre: true, kisten: true,
  lift: true,
}
const ALLE_DINGE: Record<DingArt, true> = {
  ball: true, buch: true, tasse: true, karton: true, flasche: true, apfel: true, dose: true, packung: true, teddy: true, spielauto: true,
  helm: true, erstehilfe: true, globus: true, kerze: true, laptop: true, werkzeugkiste: true, giesskanne: true, blumentopf: true,
  kissen: true, vase: true, tuete: true,
}

/** Ein Probehaus (30 x 20 m, ein Geschoss) mit jedem Moebel und Ding einmal
 *  und einem Auto. */
function probePlan(): InnenPlan {
  const R = (x0: number, z0: number, x1: number, z1: number): P[] => [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ]
  const moebel: InnenMoebel[] = (Object.keys(ALLE_MOEBEL) as MoebelArt[]).map((art, i) => ({
    art,
    mitte: [2 + (i % 12) * 2.2, 2 + Math.floor(i / 12) * 2.6],
    u: [1, 0],
    b: 1.2,
    t: 0.6,
    h: 1.6,
    oben: i % 2 ? 0.75 : null,
    hindernis: true,
    ton: (i % 7) / 7,
    ablage: 0.9,
    ...(i === 0 ? { text: 'Probe' } : {}),
  }))
  const dinge: InnenDing[] = (Object.keys(ALLE_DINGE) as DingArt[]).map((art, i) => ({ art, mitte: [2 + i, 18], y: 0, gier: 0, b: 0.2, t: 0.2, h: 0.2, ton: (i % 5) / 5 }))
  const g: InnenGeschoss = {
    k: 0,
    y: 0,
    raeume: [{ typ: 'zimmer', name: 'Probe', einheit: -1, qm: 560, rechtecke: [R(0.3, 0.3, 29.7, 19.7)], frei: [1, 1], boden: 'parkett' }],
    waende: [
      { a: [15, 0.3], b: [15, 19.7], dicke: 0.1, art: 'wand', luecken: [{ t0: 1, t1: 2, art: 'tuer', hoehe: 2.1 }, { t0: 3, t1: 4, art: 'durchgang', hoehe: 2.1 }, { t0: 5, t1: 7, art: 'front', hoehe: 2.5 }] },
      { a: [0.3, 10], b: [8, 10], dicke: 0.06, art: 'gelaender', luecken: [] },
      { a: [8, 10], b: [12, 10], dicke: 0.1, art: 'sperre', luecken: [] },
    ],
    moebel,
    dinge,
    // Ein Auto: so kennt der Uebersetzer auch das Kopieren der Vorlagen.
    fahrzeuge: [{ art: 'auto', farbe: INNEN_FAHRZEUGE[INNEN_FAHRZEUGE.length - 1].farbe, mitte: [26, 16], gier: 0 }],
    schilder: [{ text: 'Probe', mitte: [10, 0.5], u: [1, 0], n: [0, 1], breite: 1.5, hoehe: 0.4, y: 2.2 }],
    boden: null,
    loecher: [],
    start: 0,
  }
  return {
    id: 'probe',
    art: 'sonst',
    ringe: [R(0, 0, 30, 20)],
    geschossHoehe: 3,
    geschosse: [g],
    laeufe: [{ k: 0, a: [25, 5], u: [0, 1], laenge: 4.5, breite: 1.2, stufen: 17 }],
    tuer: { kante: 0, t: 20, mitte: [20, 0], u: [1, 0], n: [0, 1], breite: 1.2 },
    fenster: [{ ring: 0, kante: 0, t: 5, eg: true }],
    zelle: 0.3,
    ms: 0,
  }
}

/** So viele Zahlen (Ecken mal drei) einer Vorlage je Stueck: das Kopieren
 *  ist schnell, solange der Uebersetzer es kennt, sonst bis gut 1 Mikro-
 *  sekunde je Ecke (ein Auto am Stueck kostete beim Vorbeifahren bis 17 ms). */
const VORLAGE_STUECK = 3 * 2048

/** Ein Fahrzeug zum Anschauen in die Puffer des Geschosses: um gier
 *  gedreht (three: x' = c x + s z, z' = -s x + c z), bei mitte, auf yk;
 *  nach je VORLAGE_STUECK Zahlen ein yield. */
function* fahrzeugEinbacken(p: Puffer, glas: Puffer, art: Fahrzeug3D['art'], farbe: string, mitte: P, yk: number, gier: number): Generator<void, void, void> {
  const v = fahrzeugVorlage(art, farbe)
  const c = Math.cos(gier)
  const s = Math.sin(gier)
  p.platzFuer(v.opak.l.length / 3)
  for (let von = 0; von < v.opak.l.length; von += VORLAGE_STUECK) {
    p.vorlage(v.opak.l, v.opak.r, v.opak.f, mitte[0], yk, mitte[1], c, s, von, Math.min(v.opak.l.length, von + VORLAGE_STUECK))
    yield
  }
  glas.vorlage(v.glas.l, v.glas.r, v.glas.f, mitte[0], yk, mitte[1], c, s)
}

/* ------------------------------------------------ Dinge */

/** Kennung eines Dings im Inneren (E87b): `${praefix}:d${n}:${art}`. n ist
 *  die Stelle im Plan (alle Geschosse der Reihe nach, jedes Ding zaehlt),
 *  gleich fuer denselben Plan; die Art am Ende reicht, um das Ding allein
 *  aus der Kennung zu bauen (innenDingBauen), auch wenn sein Haus gerade
 *  nicht geladen ist. */
export function innenDingKennung(praefix: string, n: number, art: DingArt): string {
  return `${praefix}:d${n}:${art}`
}

/** Die Art am Ende der Kennung eines Dings im Inneren, sonst null. */
export function innenDingArt(id: string): DingArt | null {
  const m = typeof id === 'string' ? /:d\d+:([a-z]+)$/.exec(id) : null
  if (!m) return null
  return Object.prototype.hasOwnProperty.call(ALLE_DINGE, m[1]) ? (m[1] as DingArt) : null
}

/** Farbe und Spielart eines Dings (0..1) aus seiner Kennung (FNV-1a): im
 *  Haus und einzeln gebaut gleich. */
function tonAus(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 1000) / 1000
}

/** Farben je Farbschema nur einmal rechnen (innenDingBauen laeuft einzeln). */
const farbenVorrat = new WeakMap<Farben3D, FF>()

/** Ein Ding im Inneren allein aus seiner Kennung bauen (E87b): Art aus der
 *  Kennung, Masse aus DING_MASSE, Farbe aus der Kennung, also genau wie es
 *  im Haus steht. Ursprung unten in der Mitte, ohne Lage (setzt, wer es
 *  braucht). Die Geometrie gehoert dem Rufer (objekt.geometry.dispose()),
 *  das Material bringt er mit. null: keine Kennung eines Dings im Inneren. */
export function innenDingBauen(id: string, farben: Farben3D, mat: Material): { objekt: Mesh; breite: number; tiefe: number; hoehe: number } | null {
  const art = innenDingArt(id)
  if (!art) return null
  const [b, t, h] = DING_MASSE[art]
  let F = farbenVorrat.get(farben)
  if (!F) {
    F = farbenAus(farben)
    farbenVorrat.set(farben, F)
  }
  const geo = dingGeometrie(art, b, t, h, tonAus(id), F)
  if (!geo) return null
  const m = new Mesh(geo, mat)
  m.name = id
  m.userData.ding = id
  return { objekt: m, breite: b, tiefe: t, hoehe: h }
}

function dingGeometrie(art: DingArt, b: number, t: number, h: number, ton: number, F: FF): BufferGeometry | null {
  const p = new Puffer(null, 256)
  const R: Rahmen = { ox: 0, oy: 0, oz: 0, ux: 1, uz: 0 }
  const d = { art, ton }
  const bunt = F.bunt[Math.floor(d.ton * F.bunt.length) % F.bunt.length]
  switch (d.art) {
    case 'ball':
      kugel(p, R, 0, h / 2, 0, b / 2, h / 2, t / 2, bunt)
      break
    case 'apfel':
      kugel(p, R, 0, h / 2, 0, b / 2, h / 2, t / 2, d.ton > 0.5 ? F.rot : F.gruen)
      kasten(p, R, -0.004, 0.004, h * 0.9, h * 1.12, -0.004, 0.004, F.holzDunkel)
      break
    case 'buch':
      kasten(p, R, -b / 2, b / 2, 0, h, -t / 2, t / 2, bunt, ALLE)
      kasten(p, R, -b / 2 + 0.006, b / 2, 0.004, h - 0.004, -t / 2 + 0.004, t / 2 - 0.004, F.weiss, 1 | 16 | 32)
      break
    case 'tasse':
      walze(p, R, 0, 0, b / 2 - 0.01, 0, h, d.ton > 0.5 ? F.weiss : bunt, 10)
      kasten(p, R, b / 2 - 0.012, b / 2 + 0.015, h * 0.3, h * 0.75, -0.006, 0.006, d.ton > 0.5 ? F.weiss : bunt, ALLE)
      break
    case 'karton':
    case 'packung':
      kasten(p, R, -b / 2, b / 2, 0, h, -t / 2, t / 2, d.art === 'karton' ? F.pappe : bunt, ALLE)
      kasten(p, R, -b / 2 + 0.01, b / 2 - 0.01, h, h + 0.003, -0.02, 0.02, d.art === 'karton' ? F.holzDunkel : F.weiss)
      break
    case 'flasche':
      walze(p, R, 0, 0, b / 2, 0, h * 0.65, d.ton > 0.5 ? F.gruen : F.glas, 8)
      walze(p, R, 0, 0, b / 5, h * 0.65, h, d.ton > 0.5 ? F.gruen : F.glas, 6)
      break
    case 'dose':
      walze(p, R, 0, 0, b / 2, 0, h, bunt, 10)
      break
    case 'teddy':
      kugel(p, R, 0, h * 0.3, 0, b * 0.4, h * 0.3, t * 0.4, F.holz)
      kugel(p, R, 0, h * 0.75, 0, b * 0.3, h * 0.25, t * 0.3, F.holz)
      kugel(p, R, -b * 0.22, h * 0.95, 0, 0.03, 0.03, 0.03, F.holzDunkel)
      kugel(p, R, b * 0.22, h * 0.95, 0, 0.03, 0.03, 0.03, F.holzDunkel)
      break
    case 'spielauto':
      kasten(p, R, -b / 2, b / 2, 0.02, h * 0.6, -t / 2, t / 2, bunt, ALLE)
      kasten(p, R, -b / 4, b / 4, h * 0.6, h, -t / 2 + 0.01, t / 2 - 0.01, F.glas, ALLE)
      for (const x of [-b / 3, b / 3]) for (const z of [-t / 2, t / 2]) kugel(p, R, x, 0.02, z, 0.02, 0.02, 0.012, F.schwarz)
      break
    case 'helm':
      kugel(p, R, 0, 0, 0, b / 2, h, t / 2, F.feuerRot)
      kasten(p, R, -b / 2, b / 2, 0, 0.02, -t / 2, t / 2, F.schwarz, ALLE)
      break
    case 'erstehilfe':
      kasten(p, R, -b / 2, b / 2, 0, h, -t / 2, t / 2, F.weiss, ALLE)
      kasten(p, R, -0.05, 0.05, h * 0.42, h * 0.58, t / 2, t / 2 + 0.003, F.rot)
      kasten(p, R, -0.015, 0.015, h * 0.25, h * 0.75, t / 2, t / 2 + 0.003, F.rot)
      break
    case 'globus':
      walze(p, R, 0, 0, 0.08, 0, 0.03, F.holzDunkel, 8)
      kasten(p, R, -0.01, 0.01, 0.03, h * 0.35, -0.01, 0.01, F.metall)
      kugel(p, R, 0, h * 0.65, 0, b / 2 - 0.02, b / 2 - 0.02, b / 2 - 0.02, F.blau)
      break
    case 'kerze':
      walze(p, R, 0, 0, b / 2, 0, h * 0.85, F.weiss, 8)
      kugel(p, R, 0, h * 0.92, 0, 0.012, 0.03, 0.012, F.gelb)
      break
    case 'laptop':
      kasten(p, R, -b / 2, b / 2, 0, h, -t / 2, t / 2, F.metall, ALLE)
      break
    case 'werkzeugkiste':
      kasten(p, R, -b / 2, b / 2, 0, h * 0.8, -t / 2, t / 2, F.rot, ALLE)
      kasten(p, R, -b / 4, b / 4, h * 0.8, h, -0.01, 0.01, F.schwarz, ALLE)
      break
    case 'giesskanne':
      walze(p, R, -b * 0.15, 0, t / 2, 0, h * 0.7, F.gruen, 8)
      kasten(p, R, 0, b / 2, h * 0.4, h * 0.5, -0.015, 0.015, F.gruen, ALLE)
      kasten(p, R, -b * 0.4, -b * 0.1, h * 0.85, h, -0.012, 0.012, F.gruen, ALLE)
      break
    case 'blumentopf':
      walze(p, R, 0, 0, b / 2 - 0.02, 0, h * 0.4, F.topf, 8)
      kugel(p, R, 0, h * 0.68, 0, b / 2, h * 0.32, t / 2, F.gruen)
      break
    case 'kissen':
      kugel(p, R, 0, h / 2, 0, b / 2, h / 2, t / 2, bunt)
      break
    case 'vase':
      walze(p, R, 0, 0, b / 2, 0, h, bunt, 8)
      break
    case 'tuete':
      kasten(p, R, -b / 2, b / 2, 0, h * 0.8, -t / 2, t / 2, bunt, ALLE)
      kasten(p, R, -b / 4, b / 4, h * 0.8, h, -0.004, 0.004, bunt, ALLE)
      break
    default:
      kasten(p, R, -b / 2, b / 2, 0, h, -t / 2, t / 2, bunt, ALLE)
  }
  const g = p.bauen()
  if (g) g.boundingSphere = new Sphere(new Vector3(0, h / 2, 0), Math.hypot(b, h, t) / 2 + 0.02)
  return g
}

/* ------------------------------------------------ Moebel */

function moebelBauen(p: Puffer, glas: Puffer, m: InnenMoebel, yk: number, F: FF, schlicht: boolean): void {
  const R: Rahmen = { ox: m.mitte[0], oy: yk, oz: m.mitte[1], ux: m.u[0], uz: m.u[1] }
  const b = m.b
  const t = m.t
  const h = m.h
  const x0 = -b / 2
  const x1 = b / 2
  const z0 = -t / 2
  const z1 = t / 2
  const K = (xa: number, xb: number, ya: number, yb: number, za: number, zb: number, f: Color, s = OHNE_UNTEN) => kasten(p, R, xa, xb, ya, yb, za, zb, f, s)
  const ton = m.ton
  const bunt = F.bunt[Math.floor(ton * F.bunt.length) % F.bunt.length]
  const holz = ton > 0.5 ? F.holz : F.holzDunkel
  if (schlicht && m.art !== 'teppich' && m.art !== 'matte') {
    // Viele Moebel (grosse Haeuser): ein Kasten je Moebel, Regale mit bunter Front.
    K(x0, x1, 0, h, z0, z1, m.art === 'regalwand' || m.art === 'gondel' || m.art === 'kleiderstaender' ? bunt : m.oben === null ? F.front : holz)
    return
  }
  const beine = (yb: number, r = 0.025, f: Color = F.metall) => {
    for (const x of [x0 + 0.05, x1 - 0.05]) for (const z of [z0 + 0.05, z1 - 0.05]) K(x - r, x + r, 0, yb, z - r, z + r, f, 1 | 2 | 16 | 32)
  }
  /** Waren oder Buecher in einem Fach: hoechstens drei bunte Bloecke (sparsam). */
  const buecher = (ya: number, yb: number, za: number, zb: number) => {
    const n = Math.min(3, Math.max(1, Math.floor((x1 - x0) / 0.45)))
    const breit = (x1 - x0 - 0.08) / n
    for (let i = 0; i < n; i++) {
      const xa = x0 + 0.04 + i * breit + 0.02
      const hh = (yb - ya) * (0.65 + ((i * 13 + Math.floor(ton * 7)) % 5) * 0.07)
      K(xa, xa + breit - 0.04, ya, ya + hh, za, zb, F.bunt[(i + Math.floor(ton * 7)) % F.bunt.length], 1 | 2 | 4 | 16 | 32)
    }
  }
  switch (m.art) {
    case 'bett2':
    case 'bett1':
    case 'spitalbett': {
      const spital = m.art === 'spitalbett'
      K(x0, x1, spital ? 0.3 : 0.1, 0.32, z0, z1, spital ? F.metall : holz)
      if (spital) beine(0.32, 0.03)
      K(x0 + 0.03, x1 - 0.03, 0.32, 0.5, z0 + 0.05, z1 - 0.03, F.waesche)
      K(x0, x1, 0, spital ? 1.0 : 0.95, z0, z0 + 0.06, spital ? F.metall : holz)
      const kissen = m.art === 'bett2' ? [x0 + 0.08, 0, x1 - 0.08] : [x0 + 0.08, x1 - 0.08]
      for (let i = 0; i + 1 < kissen.length; i++) K(kissen[i] + 0.02, kissen[i + 1] - 0.02, 0.5, 0.6, z0 + 0.1, z0 + 0.5, F.weiss, ALLE)
      K(x0 + 0.02, x1 - 0.02, 0.5, 0.54, z0 + 0.65, z1 - 0.02, spital ? F.leinen : bunt, ALLE)
      break
    }
    case 'nachttisch':
      K(x0, x1, 0, h, z0, z1, holz)
      K(x0 + 0.03, x1 - 0.03, h * 0.45, h * 0.5, z1, z1 + 0.01, F.griff)
      break
    case 'schrank':
    case 'aktenschrank':
    case 'garderobe':
    case 'spind': {
      const f = m.art === 'spind' ? F.metall : m.art === 'aktenschrank' ? F.weiss : F.front
      K(x0, x1, 0, h, z0, z1, f)
      const n = Math.max(1, Math.round(b / (m.art === 'spind' ? 0.4 : 0.55)))
      for (let i = 1; i < n; i++) {
        const x = x0 + (b * i) / n
        K(x - 0.006, x + 0.006, 0.05, h - 0.05, z1, z1 + 0.005, F.schwarz)
      }
      for (let i = 0; i < n; i++) {
        const x = x0 + (b * (i + 0.5)) / n + 0.12
        K(x - 0.01, x + 0.01, h * 0.45, h * 0.6, z1, z1 + 0.025, F.griff)
      }
      if (m.art === 'garderobe') for (let i = 0; i < 3; i++) K(x0 + 0.15 + i * 0.3, x0 + 0.35 + i * 0.3, 0.9, 1.5, z1 + 0.02, z1 + 0.12, F.bunt[(i + Math.floor(ton * 5)) % F.bunt.length], ALLE)
      break
    }
    case 'kommode':
      K(x0, x1, 0.08, h, z0, z1, holz)
      for (let i = 1; i < 3; i++) K(x0 + 0.03, x1 - 0.03, (h * i) / 3, (h * i) / 3 + 0.01, z1, z1 + 0.005, F.schwarz)
      beine(0.08, 0.02, F.holzDunkel)
      break
    case 'sofa':
    case 'sessel': {
      const f = bunt.clone().lerp(F.stoff, 0.55)
      K(x0, x1, 0.08, 0.42, z0, z1, f)
      K(x0, x1, 0.42, h, z0, z0 + 0.22, f)
      K(x0, x0 + 0.16, 0.42, 0.62, z0 + 0.22, z1, f)
      K(x1 - 0.16, x1, 0.42, 0.62, z0 + 0.22, z1, f)
      beine(0.08, 0.025, F.holzDunkel)
      break
    }
    case 'couchtisch':
    case 'esstisch':
    case 'lehrertisch':
    case 'kindertisch':
    case 'schreibtisch': {
      const dick = 0.04
      K(x0, x1, h - dick, h, z0, z1, m.art === 'lehrertisch' || m.art === 'schreibtisch' ? F.weiss.clone().lerp(holz, 0.4) : holz, ALLE)
      beine(h - dick, 0.025, m.art === 'esstisch' ? F.holzDunkel : F.metall)
      if (m.art === 'schreibtisch') {
        K(-0.25, 0.25, h, h + 0.02, z0 + 0.12, z0 + 0.3, F.schwarz, ALLE)
        K(-0.02, 0.02, h, h + 0.18, z0 + 0.18, z0 + 0.22, F.schwarz)
        K(-0.28, 0.28, h + 0.18, h + 0.5, z0 + 0.17, z0 + 0.2, F.bildschirm.clone().lerp(F.schwarz, 0.6), ALLE)
      }
      break
    }
    case 'stuhl':
    case 'buerostuhl': {
      const f = m.art === 'buerostuhl' ? F.schwarz : holz
      const sitz = m.art === 'stuhl' && h < 0.7 ? 0.32 : 0.46
      K(x0 + 0.03, x1 - 0.03, sitz - 0.04, sitz, z0 + 0.03, z1 - 0.03, f, ALLE)
      K(x0 + 0.03, x1 - 0.03, sitz, h, z1 - 0.06, z1 - 0.03, f, ALLE)
      if (m.art === 'buerostuhl') {
        K(-0.025, 0.025, 0.08, sitz - 0.04, -0.025, 0.025, F.metall, 1 | 2 | 16 | 32)
        K(x0 + 0.05, x1 - 0.05, 0, 0.08, -0.025, 0.025, F.metall)
        K(-0.025, 0.025, 0, 0.08, z0 + 0.05, z1 - 0.05, F.metall)
      } else
        for (const x of [x0 + 0.06, x1 - 0.06]) for (const z of [z0 + 0.06, z1 - 0.06]) K(x - 0.015, x + 0.015, 0, sitz - 0.04, z - 0.015, z + 0.015, f, 1 | 2 | 16 | 32)
      break
    }
    case 'tv':
      K(x0, x1, 0.12, 0.5, z0, z1, F.holzDunkel.clone().lerp(F.weiss, 0.3))
      K(-Math.min(0.6, b / 2 - 0.05), Math.min(0.6, b / 2 - 0.05), 0.55, 1.25, z0 + 0.15, z0 + 0.19, F.schwarz, ALLE)
      K(-0.05, 0.05, 0.5, 0.56, z0 + 0.12, z0 + 0.22, F.schwarz)
      break
    case 'kueche': {
      K(x0, x1, 0.1, 0.86, z0, z1 - 0.02, F.front)
      K(x0, x1, 0, 0.1, z0, z1 - 0.08, F.schwarz)
      K(x0, x1, 0.86, 0.92, z0, z1, F.platte, ALLE)
      const n = Math.max(1, Math.round(b / 0.6))
      for (let i = 1; i < n; i++) K(x0 + (b * i) / n - 0.004, x0 + (b * i) / n + 0.004, 0.12, 0.84, z1 - 0.02, z1 - 0.012, F.schwarz)
      K(x0 + 0.2, x0 + 0.7, 0.88, 0.925, z0 + 0.1, z0 + 0.45, F.metall, ALLE)
      if (b > 1.6) K(x1 - 0.75, x1 - 0.15, 0.92, 0.93, z0 + 0.06, z0 + 0.55, F.schwarz)
      // Oberschraenke nur bei der hohen Kueche (an einer Innenwand).
      if (h > 1.5) K(x0, x1, 1.45, Math.min(h, 2.15), z0, z0 + 0.35, F.front, ALLE)
      break
    }
    case 'kuehlschrank':
      K(x0, x1, 0, h, z0, z1, F.weiss)
      K(x0 + 0.04, x1 - 0.04, h * 0.6, h * 0.6 + 0.01, z1, z1 + 0.005, F.metall)
      K(x1 - 0.1, x1 - 0.07, h * 0.3, h * 0.55, z1, z1 + 0.03, F.metall)
      break
    case 'wanne':
      K(x0, x1, 0, h, z0, z1, F.keramik, 1 | 2 | 16 | 32)
      K(x0, x1, h - 0.04, h, z0, z0 + 0.06, F.keramik, 4)
      K(x0, x1, h - 0.04, h, z1 - 0.06, z1, F.keramik, 4)
      K(x0, x0 + 0.06, h - 0.04, h, z0, z1, F.keramik, 4)
      K(x1 - 0.06, x1, h - 0.04, h, z0, z1, F.keramik, 4)
      K(x0 + 0.06, x1 - 0.06, 0.1, h - 0.12, z0 + 0.06, z1 - 0.06, F.wasser, 4)
      break
    case 'dusche': {
      K(x0, x1, 0, 0.05, z0, z1, F.keramik)
      const pt = (x: number, y: number, z: number) => [R.ox + R.ux * x - R.uz * z, R.oy + y, R.oz + R.uz * x + R.ux * z]
      glas.viereck(pt(x0, 0.05, z1), pt(x1, 0.05, z1), pt(x1, 2.0, z1), pt(x0, 2.0, z1), [-R.uz, 0, R.ux], F.glas)
      K(x0 + 0.1, x0 + 0.13, 1.4, 2.0, z0 + 0.05, z0 + 0.08, F.metall, ALLE)
      break
    }
    case 'wc':
      walze(p, R, 0, z1 - 0.2, Math.min(b, t) / 2 - 0.02, 0, 0.4, F.keramik, 10)
      K(x0 + 0.02, x1 - 0.02, 0.35, 0.8, z0, z0 + 0.18, F.keramik)
      break
    case 'becken':
      K(x0, x1, h - 0.18, h, z0, z1, F.keramik, ALLE)
      K(x0 + 0.06, x1 - 0.06, h - 0.02, h + 0.002, z0 + 0.08, z1 - 0.06, F.wasser.clone().lerp(F.keramik, 0.5))
      K(-0.08, 0.08, 0, h - 0.18, z0, z0 + 0.15, F.keramik)
      K(x0 + 0.02, x1 - 0.02, h + 0.3, h + 1.0, z0, z0 + 0.02, F.spiegel, ALLE)
      break
    case 'waschmaschine':
      K(x0, x1, 0, h, z0, z1, F.weiss)
      K(-0.17, 0.17, h * 0.22, h * 0.62, z1, z1 + 0.01, F.glas.clone().lerp(F.schwarz, 0.5))
      break
    case 'regal':
    case 'regalwand':
    case 'spielregal':
    case 'gondel': {
      const f = m.art === 'spielregal' ? F.weiss : m.art === 'regal' ? holz : F.weiss.clone().lerp(F.metall, 0.3)
      const doppel = m.art === 'gondel'
      K(x0, x0 + 0.03, 0, h, z0, z1, f)
      K(x1 - 0.03, x1, 0, h, z0, z1, f)
      K(x0, x1, 0, h, doppel ? -0.02 : z0, doppel ? 0.02 : z0 + 0.02, f)
      const n = Math.max(2, Math.round(h / 0.38))
      for (let i = 0; i <= n; i++) {
        const y = (h * i) / n
        K(x0 + 0.03, x1 - 0.03, y, y + 0.025, z0, z1, f, ALLE)
        if (i < n && i > 0) {
          const hh = Math.min(0.3, h / n - 0.06)
          if (doppel) {
            buecher(y + 0.025, y + 0.025 + hh, z0 + 0.03, -0.04)
            buecher(y + 0.025, y + 0.025 + hh, 0.04, z1 - 0.03)
          } else buecher(y + 0.025, y + 0.025 + hh, z0 + 0.04, z1 - 0.03)
        }
      }
      break
    }
    case 'pflanze':
      walze(p, R, 0, 0, Math.min(b, t) / 2 - 0.05, 0, h * 0.3, F.topf, 8)
      kugel(p, R, 0, h * 0.62, 0, b / 2, h * 0.38, t / 2, F.gruen)
      break
    case 'teppich':
    case 'matte':
      K(x0, x1, 0.002, m.art === 'matte' ? 0.04 : 0.012, z0, z1, m.art === 'matte' ? bunt : F.teppich.clone().lerp(bunt, 0.25), ALLE)
      break
    case 'theke':
    case 'empfang':
    case 'kasse': {
      K(x0, x1, 0, h - 0.04, z0, z1, F.front)
      K(x0 - 0.02, x1 + 0.02, h - 0.04, h, z0 - 0.02, z1 + 0.02, F.platte, ALLE)
      if (m.art === 'kasse') K(x0 + 0.1, x1 - 0.7, h, h + 0.01, z0 + 0.15, z1 - 0.15, F.schwarz)
      K(x1 - 0.5, x1 - 0.15, h, h + 0.25, z0 + 0.15, z0 + 0.45, F.schwarz, ALLE)
      break
    }
    case 'kuehlregal': {
      K(x0, x1, 0, h, z0, z0 + 0.12, F.weiss)
      K(x0, x0 + 0.04, 0, h, z0, z1, F.weiss)
      K(x1 - 0.04, x1, 0, h, z0, z1, F.weiss)
      K(x0, x1, h - 0.15, h, z0, z1, F.weiss, ALLE)
      K(x0, x1, 0, 0.25, z0, z1, F.weiss)
      for (const y of [0.6, 1.0, 1.4]) {
        K(x0 + 0.04, x1 - 0.04, y, y + 0.02, z0 + 0.12, z1 - 0.05, F.metall, ALLE)
        buecher(y + 0.02, y + 0.25, z0 + 0.15, z1 - 0.1)
      }
      const pt = (x: number, y: number, z: number) => [R.ox + R.ux * x - R.uz * z, R.oy + y, R.oz + R.uz * x + R.ux * z]
      glas.viereck(pt(x0, 0.25, z1), pt(x1, 0.25, z1), pt(x1, h - 0.15, z1), pt(x0, h - 0.15, z1), [-R.uz, 0, R.ux], F.glas)
      break
    }
    case 'auslage':
      K(x0, x1, h - 0.04, h, z0, z1, holz, ALLE)
      beine(h - 0.04)
      break
    case 'kleiderstaender': {
      K(x0, x0 + 0.04, 0, h, -0.02, 0.02, F.metall)
      K(x1 - 0.04, x1, 0, h, -0.02, 0.02, F.metall)
      K(x0, x1, h - 0.04, h, -0.02, 0.02, F.metall, ALLE)
      K(x0, x0 + 0.04, 0, 0.03, z0, z1, F.metall)
      K(x1 - 0.04, x1, 0, 0.03, z0, z1, F.metall)
      let x = x0 + 0.08
      let i = 0
      while (x < x1 - 0.1) {
        K(x, x + 0.14, h - 0.85 - (i % 3) * 0.08, h - 0.06, z0 + 0.05, z1 - 0.05, F.bunt[(i + Math.floor(ton * 9)) % F.bunt.length], 1 | 2 | 16 | 32)
        x += 0.2
        i++
      }
      break
    }
    case 'cafetisch':
      walze(p, R, 0, 0, Math.min(b, t) / 2, h - 0.03, h, F.weiss, 12)
      walze(p, R, 0, 0, 0.03, 0, h - 0.03, F.metall, 6, false)
      walze(p, R, 0, 0, 0.22, 0, 0.02, F.metall, 8)
      break
    case 'bank':
    case 'kirchenbank': {
      const kirche = m.art === 'kirchenbank'
      K(x0, x1, 0.42, 0.46, z0 + (kirche ? 0.1 : 0), z1, holz, ALLE)
      if (kirche) {
        K(x0, x1, 0.46, h, z0, z0 + 0.05, holz, ALLE)
        K(x0, x0 + 0.05, 0, h, z0, z1, holz)
        K(x1 - 0.05, x1, 0, h, z0, z1, holz)
      } else beine(0.42, 0.03, F.metall)
      break
    }
    case 'schlauch':
      K(x0, x1, 0, h, z0, z0 + 0.04, F.metall)
      for (let i = 0; i < 3; i++) walze(p, { ...R }, x0 + (b * (i + 0.5)) / 3, 0, Math.min(0.2, b / 7), 0.6 + (i % 2) * 0.5, 0.6 + (i % 2) * 0.5 + 0.12, F.feuerRot, 10)
      break
    case 'werkbank': {
      // Platte auf Ablagehoehe, dahinter ein Werkzeugbrett bis h.
      const pl = m.ablage ?? 0.9
      K(x0, x1, pl - 0.06, pl, z0, z1, holz, ALLE)
      beine(pl - 0.06, 0.03)
      K(x0 + 0.05, x1 - 0.05, 0.15, 0.18, z0 + 0.05, z1 - 0.05, F.metall, ALLE)
      if (h > pl + 0.2) K(x0, x1, pl, h, z0, z0 + 0.03, F.holzDunkel)
      break
    }
    case 'wartestuhl': {
      K(x0, x1, 0.38, 0.42, z0 + 0.05, z0 + 0.1, F.metall, ALLE)
      const n = Math.max(1, Math.round(b / 0.55))
      for (let i = 0; i < n; i++) {
        const xa = x0 + (b * i) / n + 0.03
        const xb = x0 + (b * (i + 1)) / n - 0.03
        K(xa, xb, 0.42, 0.46, z0, z1, bunt, ALLE)
        K(xa, xb, 0.46, h, z0, z0 + 0.04, bunt, ALLE)
      }
      for (const x of [x0 + 0.1, x1 - 0.1]) K(x - 0.02, x + 0.02, 0, 0.38, z0 + 0.06, z0 + 0.1, F.metall)
      break
    }
    case 'vorhang': {
      // Schiene oben rundum (nur drei Seiten offen zur Wand) und ein halber Vorhang.
      const y = 2.15
      K(x0, x1, y, y + 0.02, z1 - 0.01, z1 + 0.01, F.metall, ALLE)
      K(x0, x0 + 0.02, y, y + 0.02, z0 + 0.3, z1, F.metall, ALLE)
      K(x1 - 0.02, x1, y, y + 0.02, z0 + 0.3, z1, F.metall, ALLE)
      K(x1 - 0.015, x1 + 0.015, 0.3, y, z0 + 0.3, z0 + 0.3 + (t - 0.3) * 0.55, F.leinen.clone().lerp(F.blau, 0.15), 1 | 2 | 4 | 16 | 32)
      break
    }
    case 'liege':
      K(x0, x1, 0.62, h, z0, z1, F.stoff.clone().lerp(F.blau, 0.3), ALLE)
      beine(0.62, 0.03)
      K(x0, x1, h, h + 0.005, z0 + 0.4, z1 - 0.02, F.weiss)
      break
    case 'schulbank': {
      const tisch = 0.55
      K(x0, x1, 0.72, 0.75, z1 - tisch, z1, holz, ALLE)
      for (const x of [x0 + 0.04, x1 - 0.04]) K(x - 0.02, x + 0.02, 0, 0.72, z1 - tisch + 0.05, z1 - 0.05, F.metall, 1 | 2 | 16 | 32)
      for (const x of [x0 + b / 4, x1 - b / 4]) {
        K(x - 0.2, x + 0.2, 0.42, 0.45, z0 + 0.03, z0 + 0.38, holz, ALLE)
        K(x - 0.2, x + 0.2, 0.45, 0.8, z0 + 0.03, z0 + 0.06, holz, ALLE)
        K(x - 0.02, x + 0.02, 0, 0.42, z0 + 0.18, z0 + 0.22, F.metall, 1 | 2 | 16 | 32)
      }
      break
    }
    case 'tafel':
      K(x0, x1, 0.85, 2.15, z0, z1, F.gruen.clone().lerp(F.schwarz, 0.6), ALLE)
      K(x0 - 0.03, x1 + 0.03, 0.82, 0.85, z0, z1 + 0.06, F.metall, ALLE)
      break
    case 'altar':
      K(x0, x1, 0, h, z0, z1, F.weiss.clone().lerp(F.holz, 0.15))
      K(x0 - 0.03, x1 + 0.03, h, h + 0.02, z0 - 0.03, z1 + 0.03, F.weiss, ALLE)
      for (const x of [x0 + 0.2, x1 - 0.2]) {
        walze(p, R, x, 0, 0.04, h + 0.02, h + 0.1, F.gelb, 6)
        walze(p, R, x, 0, 0.02, h + 0.1, h + 0.35, F.weiss, 6)
      }
      break
    case 'podest':
      K(x0, x1, 0, h, z0, z1, F.weg.clone().lerp(F.weiss, 0.3), ALLE)
      break
    case 'ambo':
      K(-0.2, 0.2, 0, h - 0.1, -0.15, 0.15, holz)
      K(x0, x1, h - 0.1, h, z0, z1, holz, ALLE)
      break
    case 'orgel': {
      K(x0, x1, 0, 1.0, z0, z1, F.holzDunkel)
      const n = Math.max(3, Math.round(b / 0.14))
      for (let i = 0; i < n; i++) {
        const x = x0 + (b * (i + 0.5)) / n
        const hh = 1.0 + (h - 1.0) * (0.55 + 0.45 * Math.sin((i / (n - 1)) * Math.PI))
        walze(p, R, x, z0 + 0.15, 0.05, 1.0, hh, F.metall, 6)
      }
      break
    }
    case 'hochregal': {
      const f = F.blau.clone().lerp(F.metall, 0.3)
      const pfosten = [x0, x1 - 0.08]
      if (b > 2) pfosten.push(-0.04)
      for (const x of pfosten) for (const z of [z0, z1 - 0.08]) K(x, x + 0.08, 0, h, z, z + 0.08, f, 1 | 2 | 4 | 16 | 32)
      const lagen = Math.max(1, Math.floor(h / 1.2))
      for (let i = 0; i < lagen; i++) {
        const y = 0.15 + i * 1.2
        K(x0, x1, y, y + 0.1, z0, z0 + 0.06, F.gelb.clone().lerp(F.rot, 0.4), ALLE)
        K(x0, x1, y, y + 0.1, z1 - 0.06, z1, F.gelb.clone().lerp(F.rot, 0.4), ALLE)
        K(x0 + 0.1, x1 - 0.1, y + 0.1, y + 0.24, z0 + 0.05, z1 - 0.05, F.holz)
        K(x0 + 0.15, x1 - 0.15, y + 0.24, y + 0.24 + 0.7, z0 + 0.08, z1 - 0.08, F.pappe)
      }
      break
    }
    case 'werkzeugwand':
      K(x0, x1, 0.4, h + 0.4, z0, z0 + 0.03, F.holz)
      for (let i = 0; i < 6; i++) {
        const x = x0 + 0.12 + i * ((b - 0.24) / 5)
        K(x - 0.015, x + 0.015, 0.6, 1.6, z0 + 0.03, z0 + 0.06, i % 2 ? F.holzDunkel : F.metall, ALLE)
      }
      break
    case 'rasenmaeher':
      K(x0, x1, 0.08, 0.35, z0 + 0.35, z1, F.gruen.clone().lerp(F.rot, 0.2))
      for (const x of [x0 + 0.03, x1 - 0.03]) K(x - 0.015, x + 0.015, 0.3, 0.9, z0 + 0.05, z0 + 0.4, F.metall, ALLE)
      K(x0, x1, 0.86, 0.9, z0 + 0.03, z0 + 0.07, F.schwarz, ALLE)
      break
    case 'schubkarre':
      K(x0 + 0.05, x1 - 0.05, 0.35, 0.65, z0 + 0.4, z1 - 0.05, F.gruen)
      walze(p, R, 0, z1 - 0.1, 0.15, 0, 0.3, F.schwarz, 8)
      for (const x of [x0 + 0.08, x1 - 0.08]) K(x - 0.015, x + 0.015, 0.5, 0.56, z0, z0 + 0.5, F.metall, ALLE)
      break
    case 'kisten': {
      const n = Math.max(1, Math.round(b / 0.45))
      for (let i = 0; i < n; i++) {
        const xa = x0 + (b * i) / n + 0.02
        const xb = x0 + (b * (i + 1)) / n - 0.02
        const hh = 0.35 + ((i * 7 + Math.floor(ton * 10)) % 3) * 0.2
        K(xa, xb, 0, Math.min(h, hh), z0, z1, F.pappe, ALLE)
      }
      break
    }
    case 'lift':
      K(x0 - 0.1, x1 + 0.1, 0, 2.25, z0, z1, F.metall)
      K(x0, -0.01, 0, 2.1, z1, z1 + 0.01, F.metall.clone().lerp(F.weiss, 0.3))
      K(0.01, x1, 0, 2.1, z1, z1 + 0.01, F.metall.clone().lerp(F.weiss, 0.3))
      K(x1 + 0.15, x1 + 0.25, 1.0, 1.25, z0, z1 + 0.02, F.weiss, ALLE)
      break
    default:
      K(x0, x1, 0, h, z0, z1, holz)
  }
}

