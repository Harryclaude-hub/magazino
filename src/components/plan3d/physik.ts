/* Der Koerper beim Begehen in der Hoehe (E87): Gelaende, Stufen, Springen
 * und Fallen, Treppen zwischen Ebenen und wie das Auge dem weich folgt.
 * Reine Rechnung ohne three und ohne Browser, damit Node sie pruefen kann
 * (scripts/physik-pruefen.mjs). Der Motor (motor.ts) ruft sie in jedem Bild
 * beim Begehen; waagrecht haelt weiter kollision.ts auf.
 *
 * Hoehen sind Meter in der Welt, wo nicht "ueber dem Gelaende" steht.
 *
 * Stehen: die Fuesse stehen auf dem Boden der Ebene plus Gelaende plus dem,
 * worauf man steht (Bordstein, Bank, Mauer, Tisch; Hindernisse mit
 * Oberkante, siehe kollision.ts). Steigt der Boden, gehen die Fuesse mit
 * (eine Stufe bis STUFE_M steigt man einfach hinauf), faellt er um
 * hoechstens STUFE_M, ebenso; faellt er weiter (von einer Mauer gegangen),
 * faellt man mit der Schwere hinunter.
 *
 * Springen: 4,6 m/s nach oben, Schwere 15 m/s2, also gut 0,7 m hoch und
 * 0,6 s in der Luft. Kein zweiter Sprung in der Luft. Gerechnet wird genau
 * fuer gleichbleibende Schwere, darum ist der Sprung gleich hoch, ob das
 * Geraet 30 oder 120 Bilder je Sekunde schafft.
 *
 * Auge: am Boden folgt es den Fuessen mit einer kurzen Zeitkonstante
 * (AUGE_TAU_S), damit Stufen, Treppenenden und die Knicke des Gelaendes an
 * den Gitterlinien (alle 25 m) nicht ruckeln. In der Luft, im Aufzug und
 * beim Wechsel der Ebene geht es genau mit (sonst bliebe der Sprung
 * flacher), ein Rest von vorher klingt dabei ab. Beim Landen kann es kurz
 * einsinken (delle), das entscheidet der Motor nach der Bewegungsstufe.
 *
 * Treppen (Treppe3D in vertrag3d.ts): wer mit der Mitte des Koerpers ueber
 * die Kante von (auf der Ebene von) oder nach (auf der Ebene nach) in das
 * Rechteck tritt, ist auf der Treppe. Dort gelten keine Hindernisse der
 * Ebenen, nur das Gelaender: seitlich bleibt man um den Koerperradius
 * innen. Die Fuesse stehen auf der geraden Linie vom Boden von (mit
 * Gelaende an der Mitte der Kante) zum Boden nach. Wer vorne hinausgeht,
 * steht auf nach, hinten auf von. Alles ohne neues Objekt je Bild. */
import { STUFE_M, type Treppe3D } from './vertrag3d.ts'
import { Hindernisse, type Ebenen, type Stelle } from './kollision.ts'

/** Schwere beim Springen und Fallen (m/s2): etwas mehr als die echte,
 *  damit der Sprung knackig wirkt und nicht schwebt. */
export const SCHWERE_M_S2 = 15
/** Tempo beim Absprung (m/s): gut 0,7 m hoch. */
export const HUPF_M_S = 4.6
/** Schneller faellt niemand (m/s). */
export const FALL_MAX_M_S = 30
/** Zeitkonstante, mit der das Auge am Boden den Fuessen folgt (s). */
export const AUGE_TAU_S = 0.07
/** So nah (m) am Ziel rastet das Auge ein (0,2 mm). */
export const AUGE_RAST_M = 2e-4
/** Einsinken beim Landen: Dauer (s) und tiefste Stelle (m). */
export const DELLE_S = 0.28
export const DELLE_MAX_M = 0.09
/** Von den Fuessen bis zum Scheitel (m): der Kopf stoesst an die Decke. */
export const KOPF_M = 1.75

/* ------------------------------------------------------------ Senkrecht */

/** Wie der Koerper gerade in der Hoehe ist. */
export interface Senkrecht {
  /** Hoehe der Fuesse (Meter, Welt). */
  fuss: number
  /** Tempo nach oben (m/s), negativ beim Fallen. */
  vy: number
  /** In der Luft (Sprung oder Fall). */
  luft: boolean
  /** Tempo beim Aufsetzen in diesem Bild (m/s, positiv), sonst 0. */
  aufprall: number
}

export function senkrechtNeu(fuss = 0): Senkrecht {
  return { fuss, vy: 0, luft: false, aufprall: 0 }
}

/** Ruhig auf fuss stellen (Start, Sprung an einen Ort, nach dem Sitzen). */
export function senkrechtSetzen(s: Senkrecht, fuss: number): void {
  s.fuss = Number.isFinite(fuss) ? fuss : 0
  s.vy = 0
  s.luft = false
  s.aufprall = 0
}

/** Abspringen. Nur vom Boden: in der Luft (auch beim Fallen) nichts, kein
 *  zweiter Sprung. true, wenn gesprungen. */
export function hupfenStart(s: Senkrecht): boolean {
  if (s.luft) return false
  s.vy = HUPF_M_S
  s.luft = true
  s.aufprall = 0
  return true
}

/** Ein Bild in der Hoehe. grund: Boden unter den Fuessen (Welt). Am Boden
 *  gehen die Fuesse mit, bis STUFE_M hinauf und hinunter, weiter hinunter
 *  beginnt ein Fall. In der Luft genau fuer gleichbleibende Schwere; wer
 *  den Boden erreicht (oder steigend unter ihn geriete, etwa auf eine
 *  Mauer), steht. deckeFuss: hoechste Lage der Fuesse unter einer Decke
 *  (Decke minus KOPF_M), der Kopf stoesst dort an; ueber dem Boden hat sie
 *  nichts zu sagen. aufprall sagt danach, wie hart gelandet wurde. */
export function senkrechtSchritt(s: Senkrecht, grund: number, dt: number, deckeFuss = Infinity): void {
  s.aufprall = 0
  if (!Number.isFinite(grund)) return
  const t = dt > 0 ? dt : 0
  if (!s.luft) {
    if (s.fuss - grund <= STUFE_M + 1e-9) {
      s.fuss = grund
      s.vy = 0
      return
    }
    // Ins Leere getreten: fallen.
    s.luft = true
    s.vy = 0
  }
  const f0 = s.fuss
  const v0 = s.vy
  s.fuss += s.vy * t - 0.5 * SCHWERE_M_S2 * t * t
  s.vy -= SCHWERE_M_S2 * t
  if (s.vy < -FALL_MAX_M_S) s.vy = -FALL_MAX_M_S
  const decke = Math.max(deckeFuss, grund)
  if (s.fuss > decke) {
    s.fuss = decke
    if (s.vy > 0) s.vy = 0
  }
  if (s.fuss <= grund) {
    if (s.vy < 0) {
      // Tempo genau am Boden (nicht am Ende des Bildes): aus der Energie.
      const v2 = v0 * v0 + 2 * SCHWERE_M_S2 * (f0 - grund)
      s.aufprall = Math.min(FALL_MAX_M_S, v2 > 0 ? Math.sqrt(v2) : -s.vy)
    }
    s.fuss = grund
    s.vy = 0
    s.luft = false
  }
}

/** Das Auge (eine geglaettete Hoehe der Fuesse) folgt den Fuessen: am
 *  Boden mit der Zeitkonstante AUGE_TAU_S, starr (in der Luft, im Aufzug,
 *  beim Wechsel der Ebene) genau mit, waehrend ein Rest von vorher
 *  abklingt. zielAlt und zielNeu: die Fuesse im letzten und in diesem Bild.
 *  Stetig in beiden Faellen und beim Wechsel zwischen ihnen. */
export function augeFolgen(auge: number, zielAlt: number, zielNeu: number, dt: number, starr: boolean): number {
  if (!Number.isFinite(zielNeu)) return auge
  if (!Number.isFinite(auge) || !Number.isFinite(zielAlt)) return zielNeu
  const k = dt > 0 ? Math.exp(-dt / AUGE_TAU_S) : 1
  const rest = (starr ? auge - zielAlt : auge - zielNeu) * k
  // Unter AUGE_RAST_M rastet es ein: unsichtbar, und die Bildschleife darf ruhen.
  return Math.abs(rest) < AUGE_RAST_M ? zielNeu : zielNeu + rest
}

/** Wie tief das Auge beim Landen mit diesem Tempo (m/s) einsinkt (m):
 *  unter 1 m/s gar nicht, ein Sprung aus dem Stand etwa 9 cm. */
export function delleTiefe(aufprall: number): number {
  return aufprall > 1 ? Math.min(DELLE_MAX_M, aufprall * 0.02) : 0
}

/** Das Einsinken t Sekunden nach dem Landen (Meter, 0 oder negativ): ein
 *  halber Sinus, hinunter und wieder hinauf in DELLE_S. */
export function delle(t: number, tiefe: number): number {
  if (!(tiefe > 0) || !(t >= 0) || t >= DELLE_S) return 0
  return -tiefe * Math.sin((Math.PI * t) / DELLE_S)
}

/** Boden unter den Fuessen an (x, z) auf Ebene i (-1: die Wohnung allein):
 *  boden (der der Ebene; beim Wechsel oder im Aufzug der Zwischenstand)
 *  plus Gelaende plus das, worauf man steht, gemessen an den Fuessen fuss
 *  (Welt). */
export function grundAn(eb: Ebenen, i: number, boden: number, x: number, z: number, fuss: number): number {
  const g = boden + eb.gelaende(i, x, z)
  return g + eb.rasterVon(i).stand(x, z, fuss - g)
}

/* -------------------------------------------------------------- Treppen */

/** Stelle in den Achsen einer Treppe: u entlang der Laufrichtung (von -L/2
 *  an der Kante von bis +L/2 an der Kante nach), v quer dazu. */
export interface TreppeLage {
  u: number
  v: number
}

/** Weltstelle (x, z) in die Achsen der Treppe t (Umkehrung von treppeWelt). */
export function treppeLokal(t: Treppe3D, x: number, z: number, out: TreppeLage): TreppeLage {
  const c = Math.cos(t.drehY)
  const s = Math.sin(t.drehY)
  const dx = x - t.x
  const dz = z - t.z
  out.u = dx * c - dz * s
  out.v = dx * s + dz * c
  return out
}

/** Punkt (u, v) der Treppe t in der Welt, wie im Vertrag:
 *  (x + u cos d + v sin d, z - u sin d + v cos d). */
export function treppeWelt(t: Treppe3D, u: number, v: number, out: Stelle): Stelle {
  const c = Math.cos(t.drehY)
  const s = Math.sin(t.drehY)
  out.x = t.x + u * c + v * s
  out.z = t.z - u * s + v * c
  return out
}

/** Wie weit oben auf der Treppe (0 an der Kante von, 1 an der Kante nach). */
export function treppeAnteil(t: Treppe3D, u: number): number {
  const a = (u + t.laenge / 2) / t.laenge
  return a > 0 ? (a < 1 ? a : 1) : 0
}

/** Hoehe der Fuesse bei u: gerade von hVon (Kante von) nach hNach (Kante
 *  nach); nach darf tiefer liegen. */
export function treppeHoehe(t: Treppe3D, u: number, hVon: number, hNach: number): number {
  return hVon + (hNach - hVon) * treppeAnteil(t, u)
}

/** Geht der Schritt von (u0, v0) nach (u1, v1) von aussen ueber die Kante
 *  seite (-1: von bei -L/2, 1: nach bei +L/2) hinein, innerhalb der Breite? */
export function treppeKreuzt(t: Treppe3D, u0: number, v0: number, u1: number, v1: number, seite: -1 | 1): boolean {
  const e = (seite * t.laenge) / 2
  const hinein = seite < 0 ? u0 < e && u1 >= e : u0 > e && u1 <= e
  if (!hinein) return false
  const v = v0 + ((v1 - v0) * (e - u0)) / (u1 - u0)
  return Math.abs(v) <= t.breite / 2
}

/** Seitlich zwischen den Gelaendern: v hoechstens halbe Breite weniger r
 *  von der Mitte (ist die Treppe schmaler als der Koerper, in der Mitte). */
export function treppeKlemmen(t: Treppe3D, v: number, r: number): number {
  const m = Math.max(0, t.breite / 2 - r)
  return v < -m ? -m : v > m ? m : v
}

/** Bei u hinaus? 1 vorne (nach), -1 hinten (von), 0 noch auf der Treppe. */
export function treppeAusgang(t: Treppe3D, u: number): -1 | 0 | 1 {
  const h = t.laenge / 2
  return u > h ? 1 : u < -h ? -1 : 0
}

/** Alle Treppen einer Welt mit einem Raster zum Suchen und den Ebenen an
 *  ihren Kanten (Index in Ebenen.liste). Eine Treppe, deren von oder nach
 *  es (noch) nicht gibt, ist zu: man betritt sie nicht (etwa ein Haus,
 *  dessen Inneres noch nicht geladen ist). */
export class Treppen {
  liste: Treppe3D[] = []
  /** Ebene an der Kante von und nach je Treppe, -1: gibt es nicht. */
  von: number[] = []
  nach: number[] = []
  /** Die Rechtecke der Treppen (Index wie liste), zum Suchen beim Gehen. */
  readonly raster = new Hindernisse(2)
  /** Treppen mit kaputten Angaben, die beim letzten setzen() wegfielen. */
  verworfen = 0
  private readonly lage: TreppeLage = { u: 0, v: 0 }
  private readonly kante: Stelle = { x: 0, z: 0 }

  /** Neue Treppen (fehlt: keine), ihre Ebenen ueber die Kennungen. */
  setzen(treppen: readonly Treppe3D[] | null | undefined, eb: Ebenen): void {
    this.liste = []
    this.raster.leeren()
    let verworfen = 0
    for (const t of Array.isArray(treppen) ? treppen : []) {
      const gut =
        !!t &&
        typeof t.id === 'string' &&
        typeof t.von === 'string' &&
        typeof t.nach === 'string' &&
        Number.isFinite(t.x) &&
        Number.isFinite(t.z) &&
        Number.isFinite(t.drehY) &&
        t.laenge > 0 &&
        t.laenge < 1e4 &&
        t.breite > 0 &&
        t.breite < 1e4
      if (!gut) {
        verworfen++
        continue
      }
      this.liste.push(t)
      this.raster.dazu(t.x, t.z, t.laenge, t.breite, t.drehY)
    }
    this.raster.rastern()
    this.verworfen = verworfen
    this.aufloesen(eb)
  }

  /** Die Ebenen an den Kanten neu suchen (nach neuen Ebenen). Gibt es eine
   *  Kennung mehrmals, zaehlt die erste, die sich betreten laesst. */
  aufloesen(eb: Ebenen): void {
    const nachId = new Map<string, number>()
    for (let i = 0; i < eb.liste.length; i++) {
      const id = eb.liste[i].id
      if (eb.gibt(i) && !nachId.has(id)) nachId.set(id, i)
    }
    this.von = this.liste.map((t) => nachId.get(t.von) ?? -1)
    this.nach = this.liste.map((t) => nachId.get(t.nach) ?? -1)
  }

  /** Index der Treppe mit dieser Kennung, -1 ohne. */
  index(id: string): number {
    for (let i = 0; i < this.liste.length; i++) if (this.liste[i].id === id) return i
    return -1
  }

  /** Liegt p (Mitte des Koerpers) auf Treppe i, mit etwas Spiel? Nach neuen
   *  Daten der Welt, ob man auf ihr bleiben kann. */
  drauf(i: number, p: Stelle): boolean {
    const t = this.liste[i]
    if (!t || this.von[i] < 0 || this.nach[i] < 0) return false
    const a = treppeLokal(t, p.x, p.z, this.lage)
    return Math.abs(a.u) <= t.laenge / 2 + 0.05 && Math.abs(a.v) <= t.breite / 2 + 0.05
  }

  /** Betritt man mit dem Schritt von (x0, z0) nach p auf Ebene ebene eine
   *  Treppe (ueber die Kante von, wenn ebene ihre Ebene von ist, oder
   *  ueber nach)? Dann steht p seitlich zwischen den Gelaendern (Radius r)
   *  und ihr Index kommt zurueck, sonst -1 und p bleibt. */
  betreten(ebene: number, x0: number, z0: number, p: Stelle, r: number): number {
    if (ebene < 0 || this.liste.length === 0) return -1
    const n = this.raster.abfrage(Math.min(x0, p.x), Math.min(z0, p.z), Math.max(x0, p.x), Math.max(z0, p.z))
    for (let j = 0; j < n; j++) {
      const i = this.raster.treffer[j]
      const von = this.von[i]
      const nach = this.nach[i]
      if (von < 0 || nach < 0 || (von !== ebene && nach !== ebene)) continue
      const t = this.liste[i]
      const a = treppeLokal(t, x0, z0, this.lage)
      const u0 = a.u
      const v0 = a.v
      const b = treppeLokal(t, p.x, p.z, this.lage)
      if ((von === ebene && treppeKreuzt(t, u0, v0, b.u, b.v, -1)) || (nach === ebene && treppeKreuzt(t, u0, v0, b.u, b.v, 1))) {
        treppeWelt(t, b.u, treppeKlemmen(t, b.v, r), p)
        return i
      }
    }
    return -1
  }

  /** Auf Treppe i gehen: p um (dx, dz) verschieben, ohne Hindernisse der
   *  Ebenen, seitlich zwischen den Gelaendern (Radius r). Gibt zurueck: 0
   *  noch auf der Treppe, 1 vorne hinaus (jetzt auf nach), -1 hinten
   *  hinaus (auf von). Gibt es die Ebene dort nicht (mehr), bleibt man an
   *  der Kante stehen (0). */
  gehen(i: number, p: Stelle, dx: number, dz: number, r: number): -1 | 0 | 1 {
    const t = this.liste[i]
    if (!t) return 0
    const a = treppeLokal(t, p.x + dx, p.z + dz, this.lage)
    let u = a.u
    const aus = treppeAusgang(t, u)
    if ((aus === 1 && this.nach[i] < 0) || (aus === -1 && this.von[i] < 0)) u = (aus * t.laenge) / 2
    treppeWelt(t, u, treppeKlemmen(t, a.v, r), p)
    if (aus === 1 && this.nach[i] >= 0) return 1
    if (aus === -1 && this.von[i] >= 0) return -1
    return 0
  }

  /** Die Treppe, die an (x, z) liegt und an Ebene ebene anschliesst (von
   *  oder nach ist sie), sonst -1 (E87: beim Zielen zum Hinstellen ist sie
   *  eine Flaeche, die nicht im Raster der Ebene steht). Ohne neues Objekt. */
  unter(ebene: number, x: number, z: number): number {
    if (ebene < 0 || this.liste.length === 0) return -1
    const n = this.raster.abfrage(x, z, x, z)
    for (let j = 0; j < n; j++) {
      const i = this.raster.treffer[j]
      if (this.von[i] < 0 || this.nach[i] < 0 || (this.von[i] !== ebene && this.nach[i] !== ebene)) continue
      const t = this.liste[i]
      const a = treppeLokal(t, x, z, this.lage)
      if (Math.abs(a.u) <= t.laenge / 2 && Math.abs(a.v) <= t.breite / 2) return i
    }
    return -1
  }

  /** Hoehe der Fuesse auf Treppe i an p (Welt): unten der Boden von mit
   *  Gelaende an der Mitte der Kante, oben der Boden nach (ebenso). */
  hoehe(i: number, p: Stelle, eb: Ebenen): number {
    const t = this.liste[i]
    if (!t) return 0
    const von = this.von[i]
    const nach = this.nach[i]
    treppeWelt(t, -t.laenge / 2, 0, this.kante)
    const hVon = eb.boden(von) + eb.gelaende(von, this.kante.x, this.kante.z)
    treppeWelt(t, t.laenge / 2, 0, this.kante)
    const hNach = eb.boden(nach) + eb.gelaende(nach, this.kante.x, this.kante.z)
    return treppeHoehe(t, treppeLokal(t, p.x, p.z, this.lage).u, hVon, hNach)
  }
}
