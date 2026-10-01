import type { Avatar3D } from './types'
import type { Haltung, Pose3D } from '../components/plan3d/vertrag3d'

/* Aussehen der Figur in der 3D-Wohnung (E82).
 *
 * pruefeLook ist dieselbe Regel wie avatar3d_gueltig in der Datenbank
 * (Migration 0043): dieselben Schluessel, dieselben Farben (#rrggbb, gross
 * oder klein), dieselben Auswahlen, Groesse 140 bis 210 cm. Aendert sich
 * die eine, aendert sich die andere mit; scripts/avatar-pruefen.mjs
 * vergleicht beide.
 *
 * Die Groessengrenze der Datenbank (1024 Byte) steht hier nicht: ein Look,
 * der alle anderen Regeln erfuellt, ist hoechstens rund 250 Byte gross.
 *
 * Auch die Stellung, die andere ueber den Kanal schicken (anwesenheit.ts),
 * wird hier gelesen. So laesst sich beides ohne Browser pruefen.
 *
 * Keine Abhaengigkeit zu three oder React, nur Typen. */

export type Haarform = Avatar3D['haarform']
export type Statur = NonNullable<Avatar3D['statur']>

export const HAARFORMEN: readonly Haarform[] = ['kurz', 'lang', 'zopf', 'glatze', 'locken']
export const STATUREN: readonly Statur[] = ['schmal', 'mittel', 'breit']
export const GROESSE_MIN = 140
export const GROESSE_MAX = 210
export const GROESSE_STANDARD = 175

/** Die Auswahl im Editor. Natuerliche Hauttoene von hell nach dunkel,
 *  Haarfarben, gedeckte Kleiderfarben. Alles klein geschrieben, so wie
 *  pruefeLook es zurueckgibt. */
export const FARBEN = {
  haut: ['#f5d7c4', '#e9bf9d', '#d6a179', '#b47b52', '#8a5738', '#5c3a26'],
  haare: ['#2a2522', '#4b3324', '#7b5233', '#d2b06c', '#a4472c', '#a7a39c'],
  kleidung: [
    '#4f6d8f', // Blau
    '#3e5a4a', // Tannengruen
    '#8a9a5b', // Oliv
    '#b5654a', // Terrakotta
    '#c9a54a', // Senf
    '#7a5c8e', // Pflaume
    '#a8586b', // Altrosa
    '#2f3b4c', // Marine
    '#6b6f73', // Grau
    '#e6e0d4', // Creme
  ],
} as const

const SCHLUESSEL = new Set(['v', 'haut', 'haare', 'haarform', 'oben', 'unten', 'schuhe', 'groesse_cm', 'statur', 'brille'])
const FARBE = /^#[0-9a-f]{6}$/i

function farbe(x: unknown): string | null {
  return typeof x === 'string' && FARBE.test(x) ? x.toLowerCase() : null
}

/** Prueft einen Look so streng wie die Datenbank. Zurueck kommt eine
 *  saubere Kopie (Farben klein) oder null. Ein Feld mit dem Wert
 *  undefined zaehlt als fehlend, denn so kommt es auch beim Speichern an
 *  (JSON laesst es weg). */
export function pruefeLook(x: unknown): Avatar3D | null {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return null
  const o = x as Record<string, unknown>
  for (const k of Object.keys(o)) {
    if (o[k] !== undefined && !SCHLUESSEL.has(k)) return null
  }
  if (o.v !== 1) return null
  const haut = farbe(o.haut)
  const haare = farbe(o.haare)
  const oben = farbe(o.oben)
  const unten = farbe(o.unten)
  const schuhe = farbe(o.schuhe)
  if (!haut || !haare || !oben || !unten || !schuhe) return null
  if (typeof o.haarform !== 'string' || !(HAARFORMEN as readonly string[]).includes(o.haarform)) return null
  const look: Avatar3D = { v: 1, haut, haare, haarform: o.haarform as Haarform, oben, unten, schuhe }
  if (o.groesse_cm !== undefined) {
    const g = o.groesse_cm
    if (typeof g !== 'number' || !Number.isFinite(g) || g < GROESSE_MIN || g > GROESSE_MAX) return null
    look.groesse_cm = g
  }
  if (o.statur !== undefined) {
    if (typeof o.statur !== 'string' || !(STATUREN as readonly string[]).includes(o.statur)) return null
    look.statur = o.statur as Statur
  }
  if (o.brille !== undefined) {
    if (typeof o.brille !== 'boolean') return null
    look.brille = o.brille
  }
  return look
}

/** Gleich im Sinn der Anzeige: fehlende Angaben zaehlen wie ihr Standard. */
export function gleicherLook(a: Avatar3D | null, b: Avatar3D | null): boolean {
  if (!a || !b) return a === b
  return (
    a.haut.toLowerCase() === b.haut.toLowerCase() &&
    a.haare.toLowerCase() === b.haare.toLowerCase() &&
    a.haarform === b.haarform &&
    a.oben.toLowerCase() === b.oben.toLowerCase() &&
    a.unten.toLowerCase() === b.unten.toLowerCase() &&
    a.schuhe.toLowerCase() === b.schuhe.toLowerCase() &&
    (a.groesse_cm ?? GROESSE_STANDARD) === (b.groesse_cm ?? GROESSE_STANDARD) &&
    (a.statur ?? 'mittel') === (b.statur ?? 'mittel') &&
    (a.brille ?? false) === (b.brille ?? false)
  )
}

/* Kleiner, fester Zufall aus der Nutzerkennung: dieselbe Kennung gibt auf
 * jedem Geraet dieselbe Figur. FNV-1a als Saat, mulberry32 als Folge. */
function saat(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

function folge(s: number): () => number {
  let a = s >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function eins<T>(liste: readonly T[], z: number): T {
  return liste[Math.min(liste.length - 1, Math.floor(z * liste.length))]
}

/** Standardfigur fuer jemanden ohne eigene Wahl, fest aus der Kennung.
 *  Nur Farben aus FARBEN, Hose und Oberteil nie gleich. */
export function standardLook(uid: string): Avatar3D {
  const z = folge(saat(uid || 'kistly'))
  const k = FARBEN.kleidung
  const oben = eins(k, z())
  // Hosen und Schuhe aus den ruhigen Farben: Marine, Grau, Blau, Tannengruen, Creme.
  const hosen = [k[7], k[8], k[0], k[1]].filter((f) => f !== oben)
  const unten = eins(hosen, z())
  const schuhe = eins([k[7], k[8], k[9]], z())
  return {
    v: 1,
    haut: eins(FARBEN.haut, z()),
    haare: eins(FARBEN.haare, z()),
    haarform: eins<Haarform>(['kurz', 'kurz', 'lang', 'zopf', 'locken', 'glatze'], z()),
    oben,
    unten,
    schuhe,
    groesse_cm: 160 + Math.floor(z() * 31),
    statur: eins<Statur>(['schmal', 'mittel', 'mittel', 'breit'], z()),
    brille: z() < 0.2,
  }
}

/* --------------------------------------------------- Stellung im Kanal */

/** Was eine Stellung im Kanal ist: nur ganze Zahlen, kurz benannt.
 *  u Kennung, n laufende Nummer, g Grundriss, x y z Zentimeter, ga und ne
 *  Milliradiant, h 0 steht, 1 sitzt, 2 liegt, t Tempo mal 10. */
export interface PoseNachricht {
  u: string
  n: number
  g: string
  x: number
  y: number
  z: number
  ga: number
  ne: number
  h: 0 | 1 | 2
  t: number
}

const HALTUNG_NR: Record<Haltung, 0 | 1 | 2> = { stehen: 0, sitz: 1, liegen: 2 }
const NR_HALTUNG: Haltung[] = ['stehen', 'sitz', 'liegen']
/** Wohnungen sind kleiner als ein Kilometer, Augen niedriger als 100 m. */
const XZ_CM = 100_000
const Y_MIN_CM = -1_000
const Y_MAX_CM = 10_000
const PI_MRAD = 3142
const HALB_PI_MRAD = 1571
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Ist das eine Kennung (uuid)? Alles andere wird im Kanal nicht
 *  angenommen. */
export function istKennung(x: unknown): x is string {
  return typeof x === 'string' && ID.test(x)
}

function grenze(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x))
}

function winkel(w: number): number {
  // Auf -pi bis pi falten, damit die Zahl klein bleibt.
  const voll = Math.PI * 2
  let a = ((w % voll) + voll) % voll
  if (a > Math.PI) a -= voll
  return a
}

/** Stellung in die Nachricht verpacken (beim Senden). */
export function poseVerpacken(p: Pose3D, u: string, n: number, g: string): PoseNachricht {
  const zahl = (v: number, f: number, lo: number, hi: number) => (Number.isFinite(v) ? grenze(Math.round(v * f), lo, hi) : 0)
  return {
    u,
    n,
    g,
    x: zahl(p.x, 100, -XZ_CM, XZ_CM),
    y: zahl(p.y, 100, Y_MIN_CM, Y_MAX_CM),
    z: zahl(p.z, 100, -XZ_CM, XZ_CM),
    ga: zahl(winkel(Number.isFinite(p.gier) ? p.gier : 0), 1000, -PI_MRAD, PI_MRAD),
    ne: zahl(p.neigung, 1000, -HALB_PI_MRAD, HALB_PI_MRAD),
    h: HALTUNG_NR[p.haltung] ?? 0,
    t: zahl(p.tempo, 10, 0, 20),
  }
}

/** Eine fremde Nachricht streng lesen: jedes Feld eine ganze Zahl (n bis
 *  2^53), u und g Kennungen, h 0 bis 2. Werte ausserhalb der Grenzen
 *  werden auf die Grenze gesetzt. Was nicht passt, gibt null. Ob der
 *  Absender da ist und die Nummer steigt, prueft anwesenheit.ts. */
export function poseLesen(roh: unknown): { u: string; n: number; g: string; pose: Pose3D } | null {
  if (!roh || typeof roh !== 'object' || Array.isArray(roh)) return null
  const o = roh as Record<string, unknown>
  if (!istKennung(o.u) || !istKennung(o.g)) return null
  const ganz = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v)
  if (!ganz(o.n) || o.n < 0) return null
  if (!ganz(o.x) || !ganz(o.y) || !ganz(o.z) || !ganz(o.ga) || !ganz(o.ne) || !ganz(o.h) || !ganz(o.t)) return null
  if (o.h < 0 || o.h > 2) return null
  return {
    u: o.u.toLowerCase(),
    n: o.n,
    g: o.g.toLowerCase(),
    pose: {
      x: grenze(o.x, -XZ_CM, XZ_CM) / 100,
      y: grenze(o.y, Y_MIN_CM, Y_MAX_CM) / 100,
      z: grenze(o.z, -XZ_CM, XZ_CM) / 100,
      gier: grenze(o.ga, -PI_MRAD, PI_MRAD) / 1000,
      neigung: grenze(o.ne, -HALB_PI_MRAD, HALB_PI_MRAD) / 1000,
      haltung: NR_HALTUNG[o.h],
      tempo: grenze(o.t, 0, 20) / 10,
    },
  }
}
