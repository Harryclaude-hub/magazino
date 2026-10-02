/* Hinstellen (E87): ein Ding in der Hand wie in Minecraft genau dorthin
 * stellen, wohin man zeigt (Maus am Rechner, Mitte des Bildes am Handy).
 * Reine Rechnung ohne three, damit Node sie pruefen kann
 * (scripts/fahren-pruefen.mjs; Greifen, E87b: scripts/motor-fahren-pruefen.mjs).
 *
 * Regeln (in dieser Reihenfolge, der erste Grund gewinnt):
 *  - zu_weit: der Treffer liegt mehr als 4,5 m von den Augen weg, oder man
 *    zeigt ins Leere.
 *  - Zeigt man auf eine senkrechte Flaeche (Wand, Seite eines Moebels oder
 *    Dings) bis 1,2 m ueber dem Boden davor, kommt das Ding auf den Boden an
 *    diese Flaeche, mit der Rueckseite zu ihr (wie ein Block, der an die
 *    angeklickte Seite kommt). Hoeher, an der Decke: wand.
 *  - schraeg: die Flaeche ist steiler als etwa 41 Grad (Normale y < 0,75).
 *  - person: das Ding kaeme naeher als 35 cm an einen selbst (oder an andere
 *    Leute), auf derselben Hoehe.
 *  - wand: der gedrehte Grundriss ueberlappt eine Wand oder ein Hindernis,
 *    das hoeher ist als die Flaeche, auf der es stehen soll. Auf Tische,
 *    Baenke und Mauern (Hindernis3D.oben) darf es, und neben ihnen.
 *  - besetzt: es ueberlappt ein anderes Ding auf derselben Hoehe. Auf ein
 *    Ding drauf darf es: zeigt man auf dessen Oberseite, steht es auf ihm
 *    (gestapelt, y = seine Oberkante).
 * Drehung: zuerst schaut die Vorderseite (-z des Dings) zu einem, auf 45
 * Grad gerastert; jede Stufe (drehen +1 / -1) dreht 45 Grad weiter. Lage
 * auf 5 cm gerastert, damit Reihen gerade werden.
 *
 * ANSCHLUSS AN DEN MOTOR (motor.ts, seit E87 so gebaut):
 *  1. Beim Aufheben: stufe = stufeFuer(lageDesDings.gier, gier) (bleibt so
 *     gedreht, wie es stand). Als Raster dient das des Gehens der Ebene
 *     (ebenen.aktiv, kollision.ts) mit seinen Oberkanten (raster.ob,
 *     unendlich fuer Waende); stellRaster() baut ein eigenes aus einer
 *     Liste (fuer Pruefungen).
 *  2. Jedes Bild, solange man haelt (und bei Mausbewegung):
 *       zeigePunkt({ touch, ziehen, maus, breite, hoehe }, ndc)
 *       strahl.setFromCamera(ndc, camera); der erste Treffer, ohne das Ding
 *       in der Hand, Glas, Figuren und Fahrzeuge, aus drei Quellen:
 *         die Wohnung und die Dinge der Welt (three, Normale aus
 *         face.normal mit normalMatrix der Welt), dazu die Ebene mit
 *         strahlZiel() (Boden, Gelaende, Rechtecke mit Oberkante, Waende,
 *         Treppen). Gegen die Dreiecke der ganzen Stadt wird nicht
 *         gerechnet (Millisekunden je Bild).
 *         treffer = { x, y, z (Punkt), nx, ny, nz (Normale), art, ding }
 *         art: Boden einer Ebene 'boden', Oberseite von Moebel/Mauer 'oben',
 *         ein Ding 'ding' (ding = seine Kennung), Stufen 'treppe', sonst 'wand'.
 *       r = hinstellenPruefen({ treffer, ding: { breite, tiefe, hoehe },
 *             auge: camera.position, spieler: { x, z, boden: bodenY },
 *             gier, stufe, andere: Stellen der Mitspieler }, {
 *             raster, oben, boden: (x, z) => ebene.y + (ebene.hoehe?.(x, z) ?? 0),
 *             dinge: Lagen der Dinge dieser Ebene ohne das in der Hand })
 *       Vorschau: das Ding (halb durchsichtig) bei r.x, r.y, r.z, r.gier,
 *       gruen wenn r.ok, sonst rot oder gar nicht; Moeglich3D.hinstellen = r.ok.
 *  3. hinstellen() oder Klick/Tipp auf eine passende Stelle (dieselbe
 *     Rechnung mit tippPunkt): wenn r.ok, objekt.position.set(r.x, r.y,
 *     r.z), rotation.y = r.gier, nicht mehr in der Hand, bewegt() mit
 *     { id, art: 'ding', x, y, z, gier, ebene } melden.
 *  4. drehen(r): stufe = stufeDrehen(stufe, r).
 *  5. (E87b) Aufheben und Zielen auf ein Ding der Welt nur, wenn
 *     dingGreifbar(...) es im eigenen Geschoss findet: die Ebenen kennen
 *     keine Decke, sonst griffe man durch sie hindurch.
 *
 * Keine Allokation je Bild: Ergebnis und Punkt sind Objekte, die der Aufrufer
 * einmal anlegt und weiterreicht. */
import { Hindernisse } from './kollision.ts'
import type { Hindernis3D } from './vertrag3d.ts'

/** So weit (Meter) reicht der Arm, gemessen von den Augen bis zum Treffer. */
export const REICHWEITE_M = 4.5
/** Flaechen mit flacherer Normale (y darunter) sind zu schraeg. */
export const NORMALE_MIN_Y = 0.75
/** So nah (Meter) darf ein Ding einem Menschen hoechstens kommen. */
export const PERSON_ABSTAND_M = 0.35
/** Raster der Lage (Meter). */
export const RASTER_M = 0.05
/** Eine Drehstufe (rad) und wie viele es rundum gibt. */
export const DREH_STUFE_RAD = Math.PI / 4
export const DREH_STUFEN = 8
/** Zeigt man auf eine Wand bis zu dieser Hoehe (Meter) ueber dem Boden
 *  davor, kommt das Ding auf den Boden an die Wand. */
export const WAND_ANLEHNEN_M = 1.2

/** Groesse eines Menschen fuer die Pruefung, ob man ihm zu nahe kommt. */
const PERSON_HOEHE_M = 1.9
/** So viel Ueberlappung (Meter) gilt noch als Beruehren. */
const SPALT_M = 0.01
/** Abstand von der Wand beim Anlehnen (groesser als das halbe Raster). */
const WAND_ABSTAND_M = 0.03
/** Senkrecht ist eine Flaeche, deren Normale weniger als das nach oben zeigt. */
const SENKRECHT_Y = 0.3

export type StellGrund = 'zu_weit' | 'schraeg' | 'wand' | 'besetzt' | 'person'
/** Was getroffen wurde. 'treppe' (E87): Stufen einer Treppe, dort steht
 *  nichts (gilt als schraeg). */
export type TrefferArt = 'boden' | 'oben' | 'ding' | 'wand' | 'treppe'

/** Was der Strahl getroffen hat: Punkt und Normale (Welt), was es war und
 *  bei einem Ding seine Kennung. Was mit der Flaeche geht, sagt die Normale;
 *  art 'ding' mit ding braucht es zum Stapeln (Oberkante des Dings), die
 *  anderen Arten sind fuer den Aufrufer (Anzeige, Pruefung). */
export interface StellTreffer {
  x: number
  y: number
  z: number
  nx: number
  ny: number
  nz: number
  art?: TrefferArt
  ding?: string
}

/** Ein Ding, das schon steht: Mitte unten (x, y, z), Drehung, Masse. */
export interface StellDing {
  id: string
  x: number
  y: number
  z: number
  gier: number
  breite: number
  tiefe: number
  hoehe: number
}

/** Die Ebene, auf der man hinstellt: Raster der Hindernisse (kollision.ts),
 *  deren Oberkante je Index (Meter ueber dem Boden; fehlt oder Infinity:
 *  Wand), der Boden (Welt) und die anderen Dinge. */
export interface StellUmgebung {
  raster: Hindernisse | null
  oben?: ArrayLike<number> | ((i: number) => number) | null
  boden: (x: number, z: number) => number
  dinge: readonly StellDing[]
}

export interface StellAnfrage {
  treffer: StellTreffer | null
  /** Das Ding in der Hand. */
  ding: { breite: number; tiefe: number; hoehe: number }
  /** Augen (Welt), Stelle und Boden unter den Fuessen, Blickrichtung. */
  auge: { x: number; y: number; z: number }
  spieler: { x: number; z: number; boden: number }
  gier: number
  /** Drehstufe (ganze Zahl, je 45 Grad). */
  stufe: number
  /** Andere Leute in der Naehe (Stelle und Boden). */
  andere?: readonly { x: number; z: number; boden: number }[]
}

/** Wohin es kaeme (Mitte unten, Drehung) und ob es dort stehen darf; sonst
 *  warum nicht. Die Lage ist auch ohne ok gesetzt (fuer eine rote Vorschau). */
export interface StellErgebnis {
  ok: boolean
  x: number
  y: number
  z: number
  gier: number
  grund: StellGrund | null
}

export function stellErgebnis(): StellErgebnis {
  return { ok: false, x: 0, y: 0, z: 0, gier: 0, grund: null }
}

const zahl = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

function winkel(a: number): number {
  let d = a % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  else if (d <= -Math.PI) d += Math.PI * 2
  return d
}

function raster(v: number): number {
  return Math.round(v / RASTER_M) * RASTER_M
}

/** Grunddrehung: die Vorderseite schaut zu einem, auf 45 Grad gerastert. */
export function grundGier(spielerGier: number): number {
  const g = (zahl(spielerGier) ? spielerGier : 0) + Math.PI
  return winkel(Math.round(g / DREH_STUFE_RAD) * DREH_STUFE_RAD)
}

/** Drehstufe, mit der ein Ding so stehen bleibt, wie es stand (beim Aufheben). */
export function stufeFuer(dingGier: number, spielerGier: number): number {
  if (!zahl(dingGier)) return 0
  const s = Math.round(winkel(dingGier - grundGier(spielerGier)) / DREH_STUFE_RAD)
  return ((s % DREH_STUFEN) + DREH_STUFEN) % DREH_STUFEN
}

/** Eine Stufe weiter (+1) oder zurueck (-1), immer 0..7. */
export function stufeDrehen(stufe: number, richtung: number): number {
  const s = (zahl(stufe) ? Math.round(stufe) : 0) + (richtung < 0 ? -1 : 1)
  return ((s % DREH_STUFEN) + DREH_STUFEN) % DREH_STUFEN
}

/** Halbe Ausdehnung des gedrehten Grundrisses in Richtung (rx, rz). */
function ausdehnung(breite: number, tiefe: number, gier: number, rx: number, rz: number): number {
  // Achsen des Dings: lokal x -> (cos g, -sin g), lokal z -> (sin g, cos g).
  const c = Math.cos(gier)
  const s = Math.sin(gier)
  return (breite / 2) * Math.abs(c * rx - s * rz) + (tiefe / 2) * Math.abs(s * rx + c * rz)
}

/** Ueberlappen zwei gedrehte Rechtecke um mehr als SPALT_M? (Trennachsen) */
function rechteckeUeberlappen(
  ax: number,
  az: number,
  aux: number,
  auz: number,
  ahl: number,
  aht: number,
  bx: number,
  bz: number,
  bux: number,
  buz: number,
  bhl: number,
  bht: number,
): boolean {
  const dx = bx - ax
  const dz = bz - az
  const avx = -auz
  const avz = aux
  const bvx = -buz
  const bvz = bux
  for (let k = 0; k < 4; k++) {
    const nx = k === 0 ? aux : k === 1 ? avx : k === 2 ? bux : bvx
    const nz = k === 0 ? auz : k === 1 ? avz : k === 2 ? buz : bvz
    const ra = ahl * Math.abs(aux * nx + auz * nz) + aht * Math.abs(avx * nx + avz * nz)
    const rb = bhl * Math.abs(bux * nx + buz * nz) + bht * Math.abs(bvx * nx + bvz * nz)
    if (ra + rb - Math.abs(dx * nx + dz * nz) <= SPALT_M) return false
  }
  return true
}

/** Abstand (Meter) vom Punkt (px, pz) zum gedrehten Rechteck. */
function abstandZumRechteck(px: number, pz: number, x: number, z: number, ux: number, uz: number, hl: number, ht: number): number {
  const dx = px - x
  const dz = pz - z
  const lx = dx * ux + dz * uz
  const lz = -dx * uz + dz * ux
  const ex = Math.max(0, Math.abs(lx) - hl)
  const ez = Math.max(0, Math.abs(lz) - ht)
  return Math.hypot(ex, ez)
}

function obenVon(u: StellUmgebung, i: number): number {
  const o = u.oben
  if (!o) return Infinity
  const v = typeof o === 'function' ? o(i) : o[i]
  return typeof v === 'number' && !Number.isNaN(v) ? v : Infinity
}

/** Pruefen, ob das Ding in der Hand dort passt, wohin man zeigt. Aendert
 *  out (oder ein neues Ergebnis) und gibt es zurueck. */
export function hinstellenPruefen(a: StellAnfrage, u: StellUmgebung, out: StellErgebnis = stellErgebnis()): StellErgebnis {
  out.ok = false
  out.grund = null
  const stufe = zahl(a.stufe) ? Math.round(a.stufe) : 0
  const breite = Math.max(0.01, zahl(a.ding.breite) ? a.ding.breite : 0.3)
  const tiefe = Math.max(0.01, zahl(a.ding.tiefe) ? a.ding.tiefe : 0.3)
  const hoehe = Math.max(0.01, zahl(a.ding.hoehe) ? a.ding.hoehe : 0.3)
  let gier = winkel(grundGier(a.gier) + stufe * DREH_STUFE_RAD)
  const t = a.treffer
  if (!t || !zahl(t.x) || !zahl(t.y) || !zahl(t.z)) {
    // Ins Leere: Vorschau am Ende der Reichweite, auf dem Boden.
    const g = zahl(a.gier) ? a.gier : 0
    out.x = raster(a.auge.x - Math.sin(g) * REICHWEITE_M)
    out.z = raster(a.auge.z - Math.cos(g) * REICHWEITE_M)
    out.y = zahl(a.spieler.boden) ? a.spieler.boden : 0
    out.gier = gier
    out.grund = 'zu_weit'
    return out
  }
  let nx = zahl(t.nx) ? t.nx : 0
  let ny = zahl(t.ny) ? t.ny : 1
  let nz = zahl(t.nz) ? t.nz : 0
  const nl = Math.hypot(nx, ny, nz)
  if (nl > 1e-9) {
    nx /= nl
    ny /= nl
    nz /= nl
  } else {
    nx = 0
    ny = 1
    nz = 0
  }
  let x = t.x
  let z = t.z
  let y = t.y
  let grund: StellGrund | null = null
  // Was die Flaeche ist, sagt die Normale: nach unten (Decke) geht nichts,
  // senkrecht heisst an die Wand, schraeg ist zu schraeg, nach oben ist eine
  // Flaeche zum Draufstellen (auch die Oberseite einer Mauer, die der
  // Aufrufer 'wand' nennt). Stufen einer Treppe (E87) gelten als schraeg.
  if (t.art === 'treppe') {
    grund = 'schraeg'
  } else if (ny <= -SENKRECHT_Y) {
    grund = 'wand'
  } else if (ny < SENKRECHT_Y) {
    const hl = Math.hypot(nx, nz)
    if (hl > 1e-6) {
      // An die Wand stellen: auf den Boden davor, Rueckseite zur Wand
      // (Vorderseite schaut von der Wand weg, also entlang der Normale).
      const wx = nx / hl
      const wz = nz / hl
      gier = winkel(Math.atan2(-wx, -wz) + stufe * DREH_STUFE_RAD)
      const weg = ausdehnung(breite, tiefe, gier, wx, wz) + WAND_ABSTAND_M
      x = t.x + wx * weg
      z = t.z + wz * weg
      const b = u.boden(x, z)
      y = zahl(b) ? b : t.y
      if (t.y - y > WAND_ANLEHNEN_M || t.y < y - 0.05) grund = 'wand'
    } else {
      grund = 'wand'
    }
  } else if (ny < NORMALE_MIN_Y) {
    grund = 'schraeg'
  } else if (t.art === 'ding' && t.ding !== undefined) {
    // Stapeln: auf die Oberkante des Dings darunter.
    for (const d of u.dinge) {
      if (d.id === t.ding && zahl(d.y) && zahl(d.hoehe)) {
        y = d.y + d.hoehe
        break
      }
    }
  }
  x = raster(x)
  z = raster(z)
  out.x = x
  out.y = y
  out.z = z
  out.gier = gier
  const weit = Math.hypot(t.x - a.auge.x, t.y - a.auge.y, t.z - a.auge.z)
  if (!(weit <= REICHWEITE_M)) {
    out.grund = 'zu_weit'
    return out
  }
  if (grund) {
    out.grund = grund
    return out
  }

  // Grundriss des Dings: Mitte (x, z), Achsen und halbe Masse.
  const ux = Math.cos(gier)
  const uz = -Math.sin(gier)
  const hb = breite / 2
  const ht = tiefe / 2

  // Nicht in Leute hinein.
  const andere = a.andere ?? []
  for (let k = -1; k < andere.length; k++) {
    const p = k < 0 ? a.spieler : andere[k]
    if (!zahl(p.x) || !zahl(p.z)) continue
    const fuss = zahl(p.boden) ? p.boden : y
    const hoch = y < fuss + PERSON_HOEHE_M && y + hoehe > fuss + 0.02
    if (hoch && abstandZumRechteck(p.x, p.z, x, z, ux, uz, hb, ht) < PERSON_ABSTAND_M) {
      out.grund = 'person'
      return out
    }
  }

  // Waende und Hindernisse, die hoeher sind als die Flaeche darunter.
  const r = u.raster
  if (r && r.groesse > 0) {
    const b = u.boden(x, z)
    const yRel = y - (zahl(b) ? b : y)
    const ex = Math.abs(ux) * hb + Math.abs(uz) * ht
    const ez = Math.abs(uz) * hb + Math.abs(ux) * ht
    const n = r.abfrage(x - ex, z - ez, x + ex, z + ez)
    for (let j = 0; j < n; j++) {
      const i = r.treffer[j]
      if (!r.an[i]) continue
      if (obenVon(u, i) <= yRel + 0.02) continue
      if (rechteckeUeberlappen(x, z, ux, uz, hb, ht, r.mx[i], r.mz[i], r.ux[i], r.uz[i], r.hl[i], r.ht[i])) {
        out.grund = 'wand'
        return out
      }
    }
  }

  // Andere Dinge auf derselben Hoehe.
  for (const d of u.dinge) {
    if (!zahl(d.x) || !zahl(d.y) || !zahl(d.z) || !zahl(d.gier) || !zahl(d.breite) || !zahl(d.tiefe) || !zahl(d.hoehe)) continue
    if (!(y < d.y + d.hoehe - SPALT_M && y + hoehe > d.y + SPALT_M)) continue
    if (rechteckeUeberlappen(x, z, ux, uz, hb, ht, d.x, d.z, Math.cos(d.gier), -Math.sin(d.gier), d.breite / 2, d.tiefe / 2)) {
      out.grund = 'besetzt'
      return out
    }
  }
  out.ok = true
  return out
}

/** Raster und Oberkanten fuer hinstellenPruefen aus den Hindernissen einer
 *  Ebene (Indizes passen zueinander; kaputte Rechtecke fallen weg). */
export function stellRaster(liste: readonly Hindernis3D[], zelle = 1): { raster: Hindernisse; oben: Float64Array } {
  const h = new Hindernisse(zelle)
  const oben: number[] = []
  for (const r of liste) {
    if (![r.x, r.z, r.laenge, r.tiefe, r.drehY].every(zahl)) continue
    h.dazu(r.x, r.z, r.laenge, r.tiefe, r.drehY)
    oben.push(zahl(r.oben) ? r.oben : Infinity)
  }
  h.rastern()
  return { raster: h, oben: Float64Array.from(oben) }
}

/* ------------------------------------------------------------ Zielen in der Welt */

/** Wogegen strahlZiel rechnet (E87): die Ebene, auf der man steht, so wie
 *  der Motor sie fuer das Gehen ohnehin kennt. raster: ihre Rechtecke
 *  (kollision.ts) mit Oberkante in raster.ob (Meter ueber dem Gelaende,
 *  unendlich: Wand bis in den Himmel), boden: Boden samt Gelaende (Welt),
 *  flaeche: was sonst begehbar ist und nicht im Raster steht (Treppen):
 *  true und Hoehe (Welt) in out, mit stufig = true fuer Stufen. */
export interface StrahlWelt {
  raster: Hindernisse | null
  boden: (x: number, z: number) => number
  flaeche?: ((x: number, z: number, out: { y: number; stufig: boolean }) => boolean) | null
}

/** Ein Treffer von strahlZiel: wie StellTreffer, dazu der Abstand vom
 *  Ursprung des Strahls (Meter). */
export interface StrahlTreffer extends StellTreffer {
  abstand: number
}

export function strahlTreffer(): StrahlTreffer {
  return { x: 0, y: 0, z: 0, nx: 0, ny: 1, nz: 0, art: 'boden', abstand: 0 }
}

/** So lang (Meter) ist ein Stueck des Strahls, gegen das gerechnet wird. */
const STRAHL_STUECK_M = 0.2

/** Nach dem Halbieren: der Nulldurchgang zwischen lo (Wert a > 0) und hi
 *  (Wert b <= 0) gerade dazwischen; ohne brauchbare Werte hi. */
function sekante(lo: number, hi: number, a: number, b: number): number {
  if (!zahl(a) || !zahl(b) || !(a > b)) return hi
  const t = lo + ((hi - lo) * a) / (a - b)
  return t >= lo && t <= hi ? t : hi
}
/** Abstand (Meter) fuer die Neigung des Gelaendes aus Differenzen. */
const NEIGUNG_H_M = 0.25
const fl = { y: 0, stufig: false }

/** Wo der Strahl (Ursprung o, Richtung d) bis weit Meter zuerst auf etwas
 *  trifft, gegen die Ebene w gerechnet statt gegen Dreiecke (E87): eine
 *  Stadt hat Hunderttausende davon, ein Strahl darauf kostet am Rechner
 *  mehrere Millisekunden und am Handy ein Vielfaches. So sind es wenige
 *  Mikrosekunden: der Strahl laeuft in Stuecken von 20 cm; je Stueck die
 *  Rechtecke in der Naehe genau (Eintritt durch eine Seite unter der
 *  Oberkante: 'wand' mit der Normalen der Seite; von oben auf die
 *  Oberkante: 'oben'), der Boden und die Treppen durch Halbieren ('boden',
 *  Normale aus dem Gelaende; Treppen mit Stufen 'treppe'). Was im Raster
 *  ist, an dem der Strahl schon beginnt (man steht darin), zaehlt nicht.
 *  Gibt true und den ersten Treffer in out, sonst false. Ohne neues Objekt. */
export function strahlZiel(
  ox: number,
  oy: number,
  oz: number,
  dx0: number,
  dy0: number,
  dz0: number,
  weit: number,
  w: StrahlWelt,
  out: StrahlTreffer,
): boolean {
  const l = Math.hypot(dx0, dy0, dz0)
  if (!(l > 1e-9) || !(weit > 0) || !zahl(ox) || !zahl(oy) || !zahl(oz)) return false
  const dx = dx0 / l
  const dy = dy0 / l
  const dz = dz0 / l
  const r = w.raster && w.raster.groesse > 0 ? w.raster : null
  const boden = w.boden
  const flaeche = w.flaeche ?? null
  const n = Math.max(1, Math.ceil(weit / STRAHL_STUECK_M))
  let t0 = 0
  for (let s = 1; s <= n; s++) {
    const t1 = Math.min(weit, s * STRAHL_STUECK_M)
    const ax = ox + dx * t0
    const ay = oy + dy * t0
    const az = oz + dz * t0
    const bx = ox + dx * t1
    const by = oy + dy * t1
    const bz = oz + dz * t1
    let bestT = Infinity
    let art: TrefferArt = 'boden'
    let nx = 0
    let ny = 1
    let nz = 0
    // 1. Rechtecke der Ebene, genau (Liang-Barsky in ihren Achsen).
    if (r) {
      const gm = boden((ax + bx) / 2, (az + bz) / 2)
      const g = zahl(gm) ? gm : 0
      const k = r.abfrage(Math.min(ax, bx), Math.min(az, bz), Math.max(ax, bx), Math.max(az, bz))
      for (let j = 0; j < k; j++) {
        const i = r.treffer[j]
        if (!r.an[i]) continue
        const ux = r.ux[i]
        const uz = r.uz[i]
        const hl = r.hl[i]
        const ht = r.ht[i]
        const lx0 = (ax - r.mx[i]) * ux + (az - r.mz[i]) * uz
        const lz0 = -(ax - r.mx[i]) * uz + (az - r.mz[i]) * ux
        const lx1 = (bx - r.mx[i]) * ux + (bz - r.mz[i]) * uz
        const lz1 = -(bx - r.mx[i]) * uz + (bz - r.mz[i]) * ux
        let s0 = 0
        let s1 = 1
        // Seite des Eintritts: 0 keine (A liegt im Grundriss), 1 entlang u, 2 entlang v.
        let seite = 0
        let vz = 0
        let leer = false
        for (let a = 0; a < 2 && !leer; a++) {
          const p0 = a === 0 ? lx0 : lz0
          const dp = (a === 0 ? lx1 : lz1) - p0
          const h = a === 0 ? hl : ht
          if (Math.abs(dp) < 1e-12) {
            if (Math.abs(p0) > h) leer = true
            continue
          }
          let ta = (-h - p0) / dp
          let tb = (h - p0) / dp
          if (ta > tb) {
            const x = ta
            ta = tb
            tb = x
          }
          if (ta > s0) {
            s0 = ta
            seite = a + 1
            // Hinein durch die Seite, von der man kommt: Normale nach aussen.
            vz = dp > 0 ? -1 : 1
          }
          if (tb < s1) s1 = tb
          if (s0 > s1) leer = true
        }
        if (leer) continue
        const top = g + r.ob[i]
        const yEin = ay + (by - ay) * s0
        let hitS = NaN
        let hArt: TrefferArt = 'wand'
        if (seite > 0 && yEin < top) {
          hitS = s0
        } else if (yEin >= top && by < top && ay > by) {
          const sTop = (ay - top) / (ay - by)
          if (sTop >= s0 - 1e-9 && sTop <= s1 + 1e-9) {
            hitS = sTop
            hArt = 'oben'
          }
        }
        if (!(hitS >= 0)) continue
        const t = t0 + (t1 - t0) * hitS
        if (t >= bestT) continue
        bestT = t
        art = hArt
        if (hArt === 'oben') {
          nx = 0
          ny = 1
          nz = 0
        } else if (seite === 1) {
          nx = vz * ux
          ny = 0
          nz = vz * uz
        } else {
          nx = -vz * uz
          ny = 0
          nz = vz * ux
        }
      }
    }
    // 2. Boden: endet das Stueck darunter, halbieren.
    const gb = boden(bx, bz)
    if (zahl(gb) && by <= gb) {
      let lo = t0
      let hi = t1
      for (let k = 0; k < 12; k++) {
        const m = (lo + hi) / 2
        const b = boden(ox + dx * m, oz + dz * m)
        if (zahl(b) && oy + dy * m <= b) hi = m
        else lo = m
      }
      // Zuletzt gerade zwischen lo und hi (auf ebenem Boden genau).
      hi = sekante(lo, hi, oy + dy * lo - boden(ox + dx * lo, oz + dz * lo), oy + dy * hi - boden(ox + dx * hi, oz + dz * hi))
      if (hi < bestT) {
        bestT = hi
        art = 'boden'
        const hx = ox + dx * hi
        const hz = oz + dz * hi
        const gx = (boden(hx + NEIGUNG_H_M, hz) - boden(hx - NEIGUNG_H_M, hz)) / (2 * NEIGUNG_H_M)
        const gz = (boden(hx, hz + NEIGUNG_H_M) - boden(hx, hz - NEIGUNG_H_M)) / (2 * NEIGUNG_H_M)
        if (zahl(gx) && zahl(gz)) {
          const ln = Math.hypot(gx, 1, gz)
          nx = -gx / ln
          ny = 1 / ln
          nz = -gz / ln
        } else {
          nx = 0
          ny = 1
          nz = 0
        }
      }
    }
    // 3. Treppen (nicht im Raster): ebenso.
    if (flaeche && flaeche(bx, bz, fl) && by <= fl.y) {
      let lo = t0
      let hi = t1
      let stufig = fl.stufig
      for (let k = 0; k < 12; k++) {
        const m = (lo + hi) / 2
        if (flaeche(ox + dx * m, oz + dz * m, fl) && oy + dy * m <= fl.y) {
          hi = m
          stufig = fl.stufig
        } else lo = m
      }
      if (hi < bestT) {
        bestT = hi
        art = stufig ? 'treppe' : 'boden'
        const hx = ox + dx * hi
        const hz = oz + dz * hi
        const h0 = flaeche(hx, hz, fl) ? fl.y : NaN
        const hxp = flaeche(hx + NEIGUNG_H_M, hz, fl) ? fl.y : h0
        const hzp = flaeche(hx, hz + NEIGUNG_H_M, fl) ? fl.y : h0
        const gx = (hxp - h0) / NEIGUNG_H_M
        const gz = (hzp - h0) / NEIGUNG_H_M
        if (zahl(gx) && zahl(gz)) {
          const ln = Math.hypot(gx, 1, gz)
          nx = -gx / ln
          ny = 1 / ln
          nz = -gz / ln
        } else {
          nx = 0
          ny = 1
          nz = 0
        }
      }
    }
    if (bestT < Infinity) {
      out.x = ox + dx * bestT
      out.y = oy + dy * bestT
      out.z = oz + dz * bestT
      out.nx = nx
      out.ny = ny
      out.nz = nz
      out.art = art
      out.ding = undefined
      out.abstand = bestT
      return true
    }
    t0 = t1
  }
  return false
}

/* ------------------------------------------------------------ Greifen (E87b) */

/** So weit (Meter) unter dem eigenen Boden an seiner Stelle darf ein Ding
 *  liegen, das man greift (eine Schwelle tiefer, vom Haus hinaus). Ein
 *  Geschoss tiefer (ab 2,2 m) ist zu weit. */
export const GREIF_UNTEN_M = 1.6
/** So weit (Meter) ueber dem eigenen Boden an seiner Stelle darf ein Ding
 *  stehen (Moebel, Regal, Mauer). Dinge liegen in den Haeusern bis 1,3 m
 *  hoch; das Geschoss darueber beginnt fruehestens 2,2 m hoeher. */
export const GREIF_OBEN_M = 2.1
/** Boeden, die weiter als so viel (Meter) auseinander liegen, gehoeren zu
 *  verschiedenen Geschossen; naeher (Garten und Erdgeschoss, die Schwelle
 *  einer Haustuer) zum selben. */
export const GESCHOSS_ABSTAND_M = 1.0

/** Laesst sich ein Ding der Welt von hier aus greifen (E87b)? Die Ebenen
 *  kennen keine Decke, also prueft der Motor vor dem Aufheben (und Zielen
 *  auf ein Ding), ob es im eigenen Geschoss steht: unten ist seine
 *  Unterkante (Meter, Welt), dingBoden der Boden seiner Ebene samt Gelaende
 *  an seiner Stelle (null: Ebene unbekannt), eigene die Boeden der Ebenen,
 *  auf denen man steht, ebenfalls an der Stelle des Dings (die aktive, auf
 *  einer Treppe auch die am anderen Ende). Ja, wenn fuer einen davon die
 *  Unterkante zwischen GREIF_UNTEN_M darunter und GREIF_OBEN_M darueber
 *  liegt und die Ebene des Dings dasselbe Geschoss ist. Sichtlinie und
 *  Reichweite prueft der Motor dazu. Kaputte Zahlen: nein. */
export function dingGreifbar(unten: number, dingBoden: number | null, eigene: readonly number[]): boolean {
  if (!zahl(unten)) return false
  const bodenDa = dingBoden !== null && zahl(dingBoden)
  for (let i = 0; i < eigene.length; i++) {
    const b = eigene[i]
    if (!zahl(b)) continue
    if (unten < b - GREIF_UNTEN_M || unten > b + GREIF_OBEN_M) continue
    if (bodenDa && Math.abs((dingBoden as number) - b) > GESCHOSS_ABSTAND_M) continue
    return true
  }
  return false
}

/* ------------------------------------------------------------ Zeigen */

export interface ZeigeEingabe {
  /** Das Geraet wird mit den Fingern bedient (Handy, Tablet). */
  touch: boolean
  /** Gerade wird gezogen (Umschauen mit gedrueckter Maus oder Finger). */
  ziehen: boolean
  /** Letzte Stelle der Maus in Bildpunkten (links oben 0, 0), sonst null. */
  maus: { x: number; y: number } | null
  breite: number
  hoehe: number
}

/** Welche Stelle des Bildes zeigt (fuer Raycaster.setFromCamera, -1..1,
 *  y nach oben): am Rechner die Maus, solange nicht gezogen wird, sonst und
 *  am Handy die Mitte (dort ist das Fadenkreuz). */
export function zeigePunkt(e: ZeigeEingabe, out: { x: number; y: number } = { x: 0, y: 0 }): { x: number; y: number } {
  out.x = 0
  out.y = 0
  if (e.touch || e.ziehen || !e.maus) return out
  return tippPunkt(e.maus.x, e.maus.y, e.breite, e.hoehe, out)
}

/** Eine Stelle in Bildpunkten (Klick, Tipp) als -1..1 fuer den Strahl. */
export function tippPunkt(px: number, py: number, breite: number, hoehe: number, out: { x: number; y: number } = { x: 0, y: 0 }): { x: number; y: number } {
  if (!(breite > 0) || !(hoehe > 0) || !zahl(px) || !zahl(py)) {
    out.x = 0
    out.y = 0
    return out
  }
  out.x = Math.max(-1, Math.min(1, (px / breite) * 2 - 1))
  out.y = Math.max(-1, Math.min(1, 1 - (py / hoehe) * 2))
  return out
}
