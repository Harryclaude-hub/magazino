/* Moebel tragen beim Begehen (E89). Reine Rechnung ohne three, damit Node
 * sie pruefen kann (scripts/moebel-tragen-pruefen.mjs).
 *
 * Ein Moebel des Grundrisses (Moebel, Regal, Schrank samt Tueren,
 * Schubladen, Griffen, kleinen Dingen und den Kisten darauf oder darin)
 * bewegt sich beim Tragen starr: Drehung um die Hochachse um k mal 90 Grad
 * (Objekte kennen nur 0, 90, 180 und 270) um seine Mitte, danach um
 * (tx, tz) verschoben. Gemerkt wird diese Lage gegenueber dem Original
 * (TragLage); jedes Setzen rechnet vom Original aus. So landet
 * Zuruecksetzen genau dort, wo der letzte Bau der Szene alles hingestellt
 * hat, ohne dass sich Rundungen ansammeln.
 *
 * Drehung wie three (rotation.y): positiv dreht x nach -z, also
 * x' = x cos + z sin, z' = -x sin + z cos. Im Grundriss (x nach rechts,
 * y = Welt z) dreht Objekt.drehung im Uhrzeigersinn des Bildschirms: +90
 * Grad im Plan sind -90 Grad in three (objektGlobal in lib/geometrie.ts,
 * drehTuer in szene.ts). planGrad rechnet um.
 *
 * Erlaubt ist eine Stelle, wenn der Grundriss des Moebels (achsparalleles
 * Rechteck seiner Teile, TRAGEN_SCHRUMPF_M kleiner) keine Wand, Bruestung,
 * Scheibe, Zarge und kein Tuerblatt ueberlappt und ganz in einem Raum
 * liegt (rechteckImPolygon, wie geo_rechteck_im_polygon der Datenbank).
 * Andere Moebel duerfen darunter oder daneben (der Stuhl unter den Tisch). */
import { rechteckImPolygon, type Umriss } from '../../lib/geometrie.ts'

/** So viel kleiner (Meter, je Seite) ist der Grundriss beim Pruefen:
 *  Griffe und Tueren ragen ein wenig vor, und an der Wand stehen darf ein
 *  Moebel. */
export const TRAGEN_SCHRUMPF_M = 0.02
/** Hoechstens so weit (Meter, waagrecht) von den Augen folgt ein Moebel dem
 *  Zeiger, und so weit greift man eins. */
export const TRAGEN_WEIT_M = 6
/** Langes Druecken am Handy: so lange (ms) ohne mehr als LANG_DRUECKEN_PX
 *  Bildpunkte zu wandern hebt ein Moebel an. */
export const LANG_DRUECKEN_MS = 500
export const LANG_DRUECKEN_PX = 8
/** Die waagrechte Ebene, auf der ein Moebel dem Zeiger folgt, liegt in der
 *  Hoehe der Stelle, an der man es griff, aber mindestens so weit (Meter)
 *  ueber oder unter den Augen: sonst liefe der Strahl fast parallel. */
export const ZUG_ABSTAND_M = 0.35
/** Meldungen, ob die Stelle passt, hoechstens so oft (ms). */
export const TRAGEN_MELDEN_MS = 150

/** Eine starre Lage gegenueber dem Original: Drehung um k mal 90 Grad (wie
 *  three) um die Mitte (cx, cz), dann verschoben um (tx, tz). Meter. */
export interface TragLage {
  k: 0 | 1 | 2 | 3
  cx: number
  cz: number
  tx: number
  tz: number
}

/** Was ein verschobenes Moebel gegenueber dem Original ist, fuer das
 *  Speichern (E89): Verschiebung der Mitte seines Grundrisses in cm (x =
 *  Welt x mal 100, y = Welt z mal 100) und Drehung in Grad wie
 *  Objekt.drehung (0, 90, 180, 270). */
export interface MoebelAenderung {
  id: string
  dxCm: number
  dyCm: number
  drehGrad: number
}

/** Stellung x, z (Meter), ohne neues Objekt je Bild. */
export interface Punkt2 {
  x: number
  z: number
}

/** Achsparalleles Rechteck in Metern (x und z). */
export interface Kasten2 {
  x0: number
  z0: number
  x1: number
  z1: number
}

const COS = [1, 0, -1, 0]
const SIN = [0, 1, 0, -1]
const WINKEL = [0, Math.PI / 2, Math.PI, -Math.PI / 2]

/** Drehstufe 0 bis 3 aus einer beliebigen ganzen Zahl (auch negativ);
 *  kaputte Zahlen sind 0. */
export function stufe(k: number): 0 | 1 | 2 | 3 {
  if (!Number.isFinite(k)) return 0
  return ((((Math.round(k) % 4) + 4) % 4) as 0 | 1 | 2 | 3)
}

/** Die Lage ohne Bewegung um die Mitte (cx, cz). */
export function tragLageNeu(cx: number, cz: number): TragLage {
  return { k: 0, cx, cz, tx: 0, tz: 0 }
}

/** Drehwinkel der Lage wie three (rad): 0, pi/2, pi, -pi/2. */
export function tragWinkel(k: number): number {
  return WINKEL[stufe(k)]
}

/** Punkt (x, z) des Originals in der Lage l (nach out). */
export function tragPunkt(l: TragLage, x: number, z: number, out: Punkt2 = { x: 0, z: 0 }): Punkt2 {
  const c = COS[l.k]
  const s = SIN[l.k]
  const rx = x - l.cx
  const rz = z - l.cz
  out.x = l.cx + rx * c + rz * s + l.tx
  out.z = l.cz - rx * s + rz * c + l.tz
  return out
}

/** Richtung (x, z) des Originals in der Lage l: nur gedreht (nach out). */
export function tragRichtung(l: TragLage, x: number, z: number, out: Punkt2 = { x: 0, z: 0 }): Punkt2 {
  const c = COS[l.k]
  const s = SIN[l.k]
  out.x = x * c + z * s
  out.z = -x * s + z * c
  return out
}

/** Ruht die Lage (keine Drehung, keine Verschiebung)? */
export function tragRuht(l: TragLage): boolean {
  return l.k === 0 && l.tx === 0 && l.tz === 0
}

/** Dieselbe Lage (gleiche Mitte, Drehung und Verschiebung)? */
export function tragGleich(a: TragLage, b: TragLage): boolean {
  return a.k === b.k && a.cx === b.cx && a.cz === b.cz && a.tx === b.tx && a.tz === b.tz
}

/** Auf ganze Zentimeter (Meter rein, Meter raus): so sieht man in 3D, was
 *  gespeichert wird. -0 wird 0. */
export function aufCm(v: number): number {
  const r = Math.round(v * 100) / 100
  return r === 0 ? 0 : r
}

/** Drehung der Lage in Grad wie Objekt.drehung (Plan): k = 1 (three +90)
 *  sind im Plan 270, k = 3 sind 90. */
export function planGrad(k: number): 0 | 90 | 180 | 270 {
  return ((((-stufe(k) * 90) % 360) + 360) % 360) as 0 | 90 | 180 | 270
}

/** Die Aenderung einer Lage fuer das Speichern, null, wenn sie ruht. */
export function aenderungAus(id: string, l: TragLage): MoebelAenderung | null {
  const dx = Math.round(l.tx * 100)
  const dy = Math.round(l.tz * 100)
  const g = planGrad(l.k)
  if (dx === 0 && dy === 0 && g === 0) return null
  return { id, dxCm: dx === 0 ? 0 : dx, dyCm: dy === 0 ? 0 : dy, drehGrad: g }
}

/* ------------------------------------------------------------ Grundriss */

/** Achsparalleles Rechteck um ein gedrehtes Rechteck (Mitte x, z, laenge
 *  entlang drehY, tiefe quer dazu, Drehung wie three). */
export function kastenVon(x: number, z: number, laenge: number, tiefe: number, drehY: number): Kasten2 {
  const c = Math.abs(Math.cos(drehY))
  const s = Math.abs(Math.sin(drehY))
  const ex = (c * laenge + s * tiefe) / 2
  const ez = (s * laenge + c * tiefe) / 2
  return { x0: x - ex, z0: z - ez, x1: x + ex, z1: z + ez }
}

/** Beide Rechtecke zusammen (a darf null sein). */
export function kastenDazu(a: Kasten2 | null, b: Kasten2): Kasten2 {
  if (!a) return { ...b }
  return { x0: Math.min(a.x0, b.x0), z0: Math.min(a.z0, b.z0), x1: Math.max(a.x1, b.x1), z1: Math.max(a.z1, b.z1) }
}

/** Das Rechteck des Originals in der Lage l (bei 90 Grad wieder
 *  achsparallel). */
export function kastenLage(a: Kasten2, l: TragLage): Kasten2 {
  const p = tragPunkt(l, a.x0, a.z0)
  const q = tragPunkt(l, a.x1, a.z1)
  return { x0: Math.min(p.x, q.x), z0: Math.min(p.z, q.z), x1: Math.max(p.x, q.x), z1: Math.max(p.z, q.z) }
}

/** Je Seite um m kleiner (nie kleiner als ein Punkt in der Mitte). */
export function kastenSchrumpfen(a: Kasten2, m: number): Kasten2 {
  const mx = Math.min(m, (a.x1 - a.x0) / 2)
  const mz = Math.min(m, (a.z1 - a.z0) / 2)
  return { x0: a.x0 + mx, z0: a.z0 + mz, x1: a.x1 - mx, z1: a.z1 - mz }
}

/** Ueberlappt das achsparallele Rechteck a das gedrehte Rechteck (Mitte mx,
 *  mz, Richtung der Laenge ux, uz, halbe Laenge hl, halbe Tiefe ht; wie in
 *  kollision.ts)? Trennachsen; Beruehren zaehlt nicht. Ohne neues Objekt. */
export function ueberlappt(a: Kasten2, mx: number, mz: number, ux: number, uz: number, hl: number, ht: number): boolean {
  const eps = 1e-6
  // Achsen des gedrehten Rechtecks: Laenge (ux, uz), Tiefe (-uz, ux).
  const ax = Math.abs(ux)
  const az = Math.abs(uz)
  // 1. Welt-x und Welt-z: halbe Ausdehnung des gedrehten Rechtecks.
  const ex = ax * hl + az * ht
  const ez = az * hl + ax * ht
  const kx = (a.x0 + a.x1) / 2
  const kz = (a.z0 + a.z1) / 2
  const hx = (a.x1 - a.x0) / 2
  const hz = (a.z1 - a.z0) / 2
  const dx = mx - kx
  const dz = mz - kz
  if (Math.abs(dx) >= hx + ex - eps) return false
  if (Math.abs(dz) >= hz + ez - eps) return false
  // 2. Laenge und Tiefe des gedrehten Rechtecks: halbe Ausdehnung von a.
  const pl = hx * ax + hz * az
  if (Math.abs(dx * ux + dz * uz) >= pl + hl - eps) return false
  const pt = hx * az + hz * ax
  if (Math.abs(-dx * uz + dz * ux) >= pt + ht - eps) return false
  return true
}

/** Liegt a ganz in einem der Raeume (Umriss flach x, z, x, z ... in
 *  Metern)? Wie geo_rechteck_im_polygon: Beruehren der Wand erlaubt. */
export function imRaum(a: Kasten2, raeume: readonly Umriss[]): boolean {
  const r = { x0: a.x0, y0: a.z0, x1: a.x1, y1: a.z1 }
  for (const u of raeume) if (u.length >= 6 && rechteckImPolygon(u, r)) return true
  return false
}

/** Waende fuer die Pruefung: Felder wie in kollision.ts (Hindernisse) und
 *  die Nummern der Rechtecke, die zaehlen. */
interface WandFelder {
  mx: readonly number[]
  mz: readonly number[]
  ux: readonly number[]
  uz: readonly number[]
  hl: readonly number[]
  ht: readonly number[]
}

/** Darf ein Moebel mit diesem Grundriss (schon in seiner neuen Lage, noch
 *  nicht geschrumpft) hier stehen? Um schrumpf (Meter) kleiner ueberlappt
 *  es keine der Waende waende (Nummern in w) und liegt ganz in einem Raum. */
export function stelleErlaubt(
  abdruck: Kasten2,
  w: WandFelder,
  waende: readonly number[],
  raeume: readonly Umriss[],
  schrumpf: number = TRAGEN_SCHRUMPF_M,
): boolean {
  const a = kastenSchrumpfen(abdruck, schrumpf)
  for (let j = 0; j < waende.length; j++) {
    const i = waende[j]
    if (ueberlappt(a, w.mx[i], w.mz[i], w.ux[i], w.uz[i], w.hl[i], w.ht[i])) return false
  }
  return imRaum(a, raeume)
}

/** Hoechstens so viel (Meter) schrumpft ein Moebel, das schon im Plan ein
 *  Stueck in einer Wand steht (schrumpfFuer). Waende stehen mittig auf der
 *  Kante des Raums (12 cm, also 6 cm in den Raum), und der Zeichner
 *  erlaubt Moebel bis an die Kante. */
const TRAGEN_SCHRUMPF_MAX_M = 0.08

/** Wie viel ein Moebel beim Pruefen kleiner sein muss (TRAGEN_SCHRUMPF_M
 *  bis TRAGEN_SCHRUMPF_MAX_M, in ganzen cm), damit es dort passt, wo es im
 *  Plan steht (abdruck in der Lage wie gebaut). Steht es dort schon bis zu
 *  6 cm in einer Wand, darf es das auch an anderen Waenden; so laesst es
 *  sich an seiner Wand entlang schieben. Passt es auch dann nicht,
 *  TRAGEN_SCHRUMPF_M (zurueck an seinen Platz geht trotzdem immer). */
export function schrumpfFuer(abdruck: Kasten2, w: WandFelder, waende: readonly number[], raeume: readonly Umriss[]): number {
  const von = Math.round(TRAGEN_SCHRUMPF_M * 100)
  const bis = Math.round(TRAGEN_SCHRUMPF_MAX_M * 100)
  for (let cm = von; cm <= bis; cm++) if (stelleErlaubt(abdruck, w, waende, raeume, cm / 100)) return cm / 100
  return TRAGEN_SCHRUMPF_M
}

/* ------------------------------------------------------------ Zeiger */

/** Wo der Strahl (Ursprung o, Richtung d) die waagrechte Ebene in Hoehe y
 *  vor sich trifft (nach out). false, wenn er sie nicht trifft (parallel
 *  oder dahinter) oder weiter als weit (Meter, waagrecht) weg. */
export function strahlAufEbene(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  y: number,
  weit: number,
  out: Punkt2,
): boolean {
  if (!(Math.abs(dy) > 1e-6)) return false
  const t = (y - oy) / dy
  if (!(t > 0) || !Number.isFinite(t)) return false
  const x = ox + dx * t
  const z = oz + dz * t
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false
  if (Math.hypot(x - ox, z - oz) > weit) return false
  out.x = x
  out.z = z
  return true
}

/** Hoehe der Ebene, auf der ein Moebel dem Zeiger folgt: die der Stelle,
 *  an der man es griff (trefferY), mindestens ZUG_ABSTAND_M von den Augen
 *  weg (darueber gegriffen: darueber, sonst darunter). */
export function zugEbeneY(trefferY: number, augeY: number): number {
  if (!Number.isFinite(trefferY)) return 0
  if (trefferY > augeY) return Math.max(trefferY, augeY + ZUG_ABSTAND_M)
  return Math.min(trefferY, augeY - ZUG_ABSTAND_M)
}

/** Die Stelle (x, z) hoechstens weit (Meter, waagrecht) von (ax, az) weg:
 *  weiter weg wird sie auf den Kreis gezogen (nach out). */
export function nahBegrenzen(x: number, z: number, ax: number, az: number, weit: number, out: Punkt2): Punkt2 {
  const dx = x - ax
  const dz = z - az
  const d = Math.hypot(dx, dz)
  if (d <= weit || !(d > 0)) {
    out.x = x
    out.z = z
    return out
  }
  out.x = ax + (dx / d) * weit
  out.z = az + (dz / d) * weit
  return out
}

const folgenHilf: Punkt2 = { x: 0, z: 0 }

/** Neue Lage beim Tragen: die Mitte folgt dem Punkt p auf der Zugebene mit
 *  dem beim Greifen gemerkten Versatz (vx, vz), hoechstens TRAGEN_WEIT_M von
 *  den Augen (ax, az), auf ganze cm; Drehstufe k. Schreibt in out, ohne
 *  neues Objekt (laeuft in jedem Bild beim Tragen). */
export function tragFolgen(
  ur: TragLage,
  k: number,
  px: number,
  pz: number,
  vx: number,
  vz: number,
  ax: number,
  az: number,
  out: TragLage,
): TragLage {
  const m = nahBegrenzen(px + vx, pz + vz, ax, az, TRAGEN_WEIT_M, folgenHilf)
  out.k = stufe(k)
  out.cx = ur.cx
  out.cz = ur.cz
  out.tx = aufCm(m.x - ur.cx)
  out.tz = aufCm(m.z - ur.cz)
  return out
}
