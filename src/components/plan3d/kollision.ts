/* Zusammenstoesse beim Begehen (E82). Reine Rechnung in der Ebene, ohne
 * three, damit Node sie pruefen kann (scripts/kollision-pruefen.mjs).
 *
 * Der Koerper ist ein Kreis am Boden (Radius KOERPER_RADIUS_M), jedes
 * Hindernis ein gedrehtes Rechteck in x und z (Grundriss des Teils). Der
 * Motor sammelt sie beim Bauen der Szene: Waende immer, Moebel nur, wenn
 * sie in Knie- bis Brusthoehe reichen. Tueren und Schubladen bewegen
 * sich; ihre Rechtecke wandern mit (lage) und lassen sich an- und
 * ausschalten (aktiv).
 *
 * Gehen: der Kreis wird in kurzen Teilschritten verschoben und nach jedem
 * aus allem herausgedrueckt, was er ueberlappt, entlang der Normalen der
 * naechsten Stelle. Was quer zur Wand lag, geht verloren, was laengs lag,
 * bleibt: so gleitet man an Waenden jeder Richtung entlang und um Ecken
 * herum, statt haengen zu bleiben. Die Teilschritte sind kuerzer als der
 * halbe Koerper, darum rutscht man auch rennend durch keine duenne Wand.
 *
 * Gesucht wird in einem gleichmaessigen Raster (Zellen von 1 m), das beim
 * Bauen einmal entsteht. Waehrend des Gehens entsteht kein neues Objekt:
 * alle Zahlen liegen in Feldern, die Treffer in einem festen Puffer.
 *
 * Ebenen (E83): in einer Siedlung gibt es mehrere begehbare Boeden
 * (Geschosse, Gelaende). Jede Ebene hat ihr eigenes Raster, und es gilt
 * immer nur das der Ebene, auf der man steht (Ebenen). Die Ebene der
 * Wohnung (Boden bei 0) teilt sich das Raster mit der Wohnung selbst.
 *
 * Hoehe (E87): ein Rechteck kann eine Oberkante haben (oben, Meter ueber
 * dem Gelaende an der Stelle, an der man steht). Wer mit den Fuessen
 * hoechstens STUFE_M darunter ist, wird nicht aufgehalten und steigt
 * hinauf (stand() sagt, wie hoch); was hoeher ist, haelt auf, bis man
 * darueber springt. Waende haben keine Oberkante und halten immer auf.
 *
 * Raster (E87): eine Zelle kennt nur die Rechtecke, die sie wirklich
 * beruehrt, auch gedrehte (sonst stuende eine schraege Wand von 20 m in
 * 200 Zellen). Tueren und Schubladen (bereich()) stehen in allen Zellen
 * ihres Bereichs, weil sie sich bewegen. Gespeichert als zwei Felder statt
 * vieler kleiner Listen: 40 000 Rechtecke einer Stadt rastern in wenigen
 * Millisekunden.
 *
 * Dazu (E87): bewegen(), frei() und herausdruecken() nehmen auf Wunsch ein
 * zweites, kleines Raster mit (dazu), das in derselben Rechnung aufhaelt:
 * die abgestellten Fahrzeuge einer Ebene. Sie bewegen sich, darum stehen
 * sie nicht im grossen Raster der Ebene (das neu zu rastern dauert bei
 * einer Stadt zu lange), sondern in einem eigenen mit wenigen Rechtecken,
 * das der Motor neu baut, wenn sich eins bewegt. */
import { STUFE_M } from './vertrag3d.ts'

/** Halbe Schulterbreite eines Mannes mit 1,75 m (wie seit E77). */
export const KOERPER_RADIUS_M = 0.23
/** Laengster Teilschritt in Metern. */
export const TEILSCHRITT_M = 0.08
/** So weit bleibt der Koerper nach dem Herausdruecken von der Kante weg. */
const HAUT_M = 1e-4
/** Rest-Ueberlappung, ab der ein Schritt als blockiert gilt. */
const RESTUEBERLAPP_M = 0.002
/** Durchgaenge beim Herausdruecken (Ecken brauchen zwei, enge Stellen mehr). */
const DURCHGAENGE = 5
/** Worauf man steht, zaehlt, wenn die Mitte des Koerpers hoechstens so weit
 *  (Meter) neben der Flaeche ist (E87): man steht mit den Fuessen, nicht
 *  mit den Schultern auf einer Mauer. */
export const STAND_R_M = 0.1
/** Zellen je Richtung fuer den Schluessel (E87): bis +-16 384 Zellen (bei
 *  1 m +-16 km) bleibt er eine kleine Ganzzahl, und die Map ist schnell.
 *  Was weiter draussen liegt, faellt in die Randzellen: richtig, nur
 *  langsamer. */
const KANTE = 16384
/** So viele Rechtecke rastert eine Ebene in Zellen der Grundgroesse; mehr
 *  in Zellen von 2 m, ueber SEHR_VIELE (eine ganze Stadt) von 4 m: viel
 *  weniger Eintraege, kaum langsamer beim Gehen (E87, gemessen in
 *  scripts/physik-pruefen.mjs). */
const VIELE_RECHTECKE = 4000
const SEHR_VIELE_RECHTECKE = 20000

/** Zellgroesse fuer n Rechtecke bei Grundgroesse basis (E87). */
function zelleFuer(n: number, basis: number): number {
  if (n > SEHR_VIELE_RECHTECKE) return Math.max(basis, 4)
  if (n > VIELE_RECHTECKE) return Math.max(basis, 2)
  return basis
}

/** Zwei Felder mit denselben Rechtecken (dasselbe Feld, oder gleich lang
 *  mit denselben Objekten an jeder Stelle): dann braucht es kein neues
 *  Raster (E87; eine Welt darf ihre Liste neu zusammenstellen). */
function gleicheRechtecke(a: readonly Rechteck[], b: readonly Rechteck[]): boolean {
  if (a === b) return true
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

/** Stelle in der Ebene (Meter, Welt): x und z. Wird beim Gehen veraendert. */
export interface Stelle {
  x: number
  z: number
}

/** Ein Rechteck von aussen (wie Hindernis3D in vertrag3d.ts): Mitte,
 *  Laenge entlang x vor der Drehung, Tiefe entlang z, Drehung wie three.
 *  oben (E87): Oberkante ueber dem Gelaende in Metern; fehlt: eine Wand. */
export interface Rechteck {
  x: number
  z: number
  laenge: number
  tiefe: number
  drehY: number
  oben?: number
}

/** Eine begehbare Ebene (wie Ebene3D in vertrag3d.ts, ohne three): y ist
 *  die Bodenhoehe in Metern, die Wohnung liegt bei 0. hoehe (E87): das
 *  Gelaende an (x, z) relativ zu y; fehlt: eben. */
interface EbeneDaten {
  id: string
  name: string
  y: number
  hindernisse: readonly Rechteck[]
  hoehe?: (x: number, z: number) => number
}

/** Oberkante aus den Daten: fehlt oder kaputt ist eine Wand (unendlich),
 *  unter 0 zaehlt als 0. */
function obenAus(o: number | undefined): number {
  if (typeof o !== 'number' || o !== o) return Infinity
  return o < 0 ? 0 : o
}

/** Fusshoehe fuer die Rechnung: kaputt oder unendlich zaehlt als 0, damit
 *  Waende (oben unendlich) immer aufhalten. */
function fussAus(f: number): number {
  return f > -1e6 && f < 1e6 ? f : 0
}

/** So nah an 0 (Meter) gilt ein Boden als der Boden der Wohnung. */
const WOHNUNG_BODEN_M = 0.05
/** Aufzug: mit faehrt, wer beim Abfahren hoechstens so weit ueber oder
 *  unter dem Boden der Kabine steht ... */
export const AUFZUG_BODEN_M = 0.5
/** ... und waehrend der Fahrt hoechstens so weit (waagrecht) von der
 *  Stelle bleibt, an der die Fahrt begann. Weiter weg ist man ausgestiegen. */
export const AUFZUG_NAH_M = 1.2

export class Hindernisse {
  /** Kantenlaenge einer Rasterzelle in Metern. */
  zelle: number
  /* Ein Rechteck je Index: Mitte, Richtung der Laenge (ux, uz), halbe
   * Laenge und halbe Tiefe, an oder aus, Oberkante (E87; unendlich ist
   * eine Wand). */
  mx: number[] = []
  mz: number[] = []
  ux: number[] = []
  uz: number[] = []
  hl: number[] = []
  ht: number[] = []
  an: boolean[] = []
  ob: number[] = []
  /* Bereich fuer das Raster: die Lage beim Bauen, bei Tueren und
   * Schubladen alles, was sie je ueberstreichen koennen. */
  bx0: number[] = []
  bz0: number[] = []
  bx1: number[] = []
  bz1: number[] = []
  /** Bewegt sich (bereich() wurde gerufen): steht im Raster in allen Zellen
   *  seines Bereichs, nicht nur in denen, die es gerade beruehrt. */
  beweglich: boolean[] = []
  /** Raster (E87) als offene Streutabelle: tabKey[h] ist der Schluessel
   *  der Zelle plus 1 (0 = frei), tabZelle[h] ihre Nummer k. Die Rechtecke
   *  der Zelle k stehen in eintraege[anfang[k]] bis vor
   *  eintraege[anfang[k + 1]]. Ohne Map: 40 000 Rechtecke einer Stadt
   *  rastern so in wenigen Millisekunden statt in einer Zehntelsekunde. */
  tabKey: Int32Array = new Int32Array(2)
  tabZelle: Int32Array = new Int32Array(2)
  private maske = 1
  private schieb = 31
  /** Wie viele Zellen etwas enthalten. */
  zellenZahl = 0
  anfang: Int32Array = new Int32Array(1)
  eintraege: Int32Array = new Int32Array(0)
  /** Treffer der letzten Abfrage (die ersten anzahl Eintraege gelten). */
  treffer: Int32Array = new Int32Array(0)
  anzahl = 0
  /** Fuer doppelte Treffer: Nummer der Abfrage, in der ein Index schon kam. */
  marke: Int32Array = new Int32Array(0)
  nr = 0
  /** Was hoeher ist (Oberkante in Metern), haelt in der laufenden Rechnung
   *  auf: Fusshoehe plus STUFE_M (E87). */
  private grenze = STUFE_M

  constructor(zelle = 1) {
    this.zelle = zelle
  }

  /** Wie viele Rechtecke es gibt. */
  get groesse(): number {
    return this.mx.length
  }

  /** Alles weg (neue Szene). */
  leeren(): void {
    for (const f of [this.mx, this.mz, this.ux, this.uz, this.hl, this.ht, this.ob, this.bx0, this.bz0, this.bx1, this.bz1]) f.length = 0
    this.an.length = 0
    this.beweglich.length = 0
    this.rasterLeeren()
    this.treffer = new Int32Array(0)
    this.marke = new Int32Array(0)
    this.anzahl = 0
    this.nr = 0
  }

  private rasterLeeren(): void {
    this.tabKey = new Int32Array(2)
    this.tabZelle = new Int32Array(2)
    this.maske = 1
    this.schieb = 31
    this.zellenZahl = 0
    this.anfang = new Int32Array(1)
    this.eintraege = new Int32Array(0)
  }

  /** Stelle in der Streutabelle, an der Schluessel k steht oder hingehoert
   *  (multiplikativ gestreut, dann linear weiter). */
  private platz(k: number): number {
    let h = Math.imul(k, 0x9e3779b1) >>> this.schieb
    const kk = k + 1
    const tab = this.tabKey
    for (;;) {
      const v = tab[h]
      if (v === kk || v === 0) return h
      h = (h + 1) & this.maske
    }
  }

  /** Neues Rechteck: Mitte (x, z), laenge entlang drehY, tiefe quer dazu
   *  (wie Quader.masse[0] und [2]), drehY wie three (positiv dreht x nach
   *  -z). oben (E87): Oberkante ueber dem Gelaende in Metern, ohne Angabe
   *  eine Wand. Gibt den Index zurueck. Vor rastern() aufrufen. */
  dazu(x: number, z: number, laenge: number, tiefe: number, drehY: number, aktiv = true, oben?: number): number {
    const i = this.mx.length
    const ux = Math.cos(drehY)
    const uz = -Math.sin(drehY)
    const hl = Math.max(0, laenge / 2)
    const ht = Math.max(0, tiefe / 2)
    this.mx.push(x)
    this.mz.push(z)
    this.ux.push(ux)
    this.uz.push(uz)
    this.hl.push(hl)
    this.ht.push(ht)
    this.an.push(aktiv)
    this.ob.push(obenAus(oben))
    this.beweglich.push(false)
    const ax = Math.abs(ux)
    const az = Math.abs(uz)
    const ex = ax * hl + az * ht
    const ez = az * hl + ax * ht
    this.bx0.push(x - ex)
    this.bz0.push(z - ez)
    this.bx1.push(x + ex)
    this.bz1.push(z + ez)
    return i
  }

  /** Viele Rechtecke auf einmal (die einer Ebene). Rechtecke mit
   *  kaputten Zahlen (NaN, unendlich) kommen nicht hinein. Gibt zurueck,
   *  wie viele das waren. Vor rastern(). */
  alle(liste: readonly Rechteck[]): number {
    let verworfen = 0
    for (let k = 0; k < liste.length; k++) {
      const r = liste[k]
      if (!r || !Number.isFinite(r.x) || !Number.isFinite(r.z) || !Number.isFinite(r.laenge) || !Number.isFinite(r.tiefe) || !Number.isFinite(r.drehY)) {
        verworfen++
        continue
      }
      this.dazu(r.x, r.z, r.laenge, r.tiefe, r.drehY, true, r.oben)
    }
    return verworfen
  }

  /** Nur die ersten n Rechtecke behalten (die Wohnung ohne die Rechtecke
   *  ihrer Ebene). Danach rastern(). */
  kuerzen(n: number): void {
    const k = Math.max(0, Math.min(Math.floor(n), this.mx.length))
    for (const f of [this.mx, this.mz, this.ux, this.uz, this.hl, this.ht, this.ob, this.bx0, this.bz0, this.bx1, this.bz1]) f.length = k
    this.an.length = k
    this.beweglich.length = k
    this.rasterLeeren()
    this.anzahl = 0
  }

  /** Halbe Ausdehnung des Rechtecks i entlang x und z. */
  ausdehnung(i: number): [number, number] {
    const ax = Math.abs(this.ux[i])
    const az = Math.abs(this.uz[i])
    return [ax * this.hl[i] + az * this.ht[i], az * this.hl[i] + ax * this.ht[i]]
  }

  /** Rasterbereich von i um das Rechteck (x0, z0)-(x1, z1) erweitern
   *  (Tuer: der Kreis, den sie um die Angel ueberstreicht). Nur damit darf
   *  sich i spaeter bewegen (lage()). Vor rastern(). */
  bereich(i: number, x0: number, z0: number, x1: number, z1: number): void {
    this.bx0[i] = Math.min(this.bx0[i], x0)
    this.bz0[i] = Math.min(this.bz0[i], z0)
    this.bx1[i] = Math.max(this.bx1[i], x1)
    this.bz1[i] = Math.max(this.bz1[i], z1)
    this.beweglich[i] = true
  }

  /** Rasterbereich von i um die eigene Lage, verschoben um (dx, dz),
   *  erweitern (Schublade ganz offen). Vor raster(). */
  bereichVerschoben(i: number, dx: number, dz: number): void {
    const [ex, ez] = this.ausdehnung(i)
    this.bereich(i, this.mx[i] + dx - ex, this.mz[i] + dz - ez, this.mx[i] + dx + ex, this.mz[i] + dz + ez)
  }

  /** Rasterbereich von i neu setzen, statt ihn zu erweitern (E89: ein
   *  Moebel wurde getragen und steht jetzt woanders). beweglich bleibt, wie
   *  es war. Danach rastern(), sonst steht i im Raster noch an der alten
   *  Stelle. */
  bereichSetzen(i: number, x0: number, z0: number, x1: number, z1: number): void {
    this.bx0[i] = Math.min(x0, x1)
    this.bz0[i] = Math.min(z0, z1)
    this.bx1[i] = Math.max(x0, x1)
    this.bz1[i] = Math.max(z0, z1)
  }

  /** Neue Lage eines Rechtecks (Tuer dreht, Schublade faehrt). Es muss im
   *  Bereich bleiben, der beim Bauen mit bereich() angegeben war. Ohne
   *  neues Objekt. */
  lage(i: number, x: number, z: number, drehY: number): void {
    this.mx[i] = x
    this.mz[i] = z
    this.ux[i] = Math.cos(drehY)
    this.uz[i] = -Math.sin(drehY)
  }

  aktiv(i: number, an: boolean): void {
    this.an[i] = an
  }

  /** Zellnummer auf den Bereich des Schluessels begrenzt (NaN bleibt NaN:
   *  dann laeuft keine Schleife). */
  private static klemm(i: number): number {
    return i < -KANTE ? -KANTE : i > KANTE - 1 ? KANTE - 1 : i
  }

  /** Schluessel der Zelle (ix, iz), beide schon geklemmt: eine Ganzzahl
   *  unter 2^30, schnell in einer Map. */
  private static schluessel(ix: number, iz: number): number {
    return (ix + KANTE) * (2 * KANTE) + (iz + KANTE)
  }

  /** Raster aus allen Rechtecken bauen. Nach dem letzten dazu(). Jede
   *  Zelle bekommt die Rechtecke, die sie beruehrt (gedrehte genau, Zeile
   *  fuer Zeile), bewegliche alle Zellen ihres Bereichs. */
  rastern(): void {
    const n = this.mx.length
    this.treffer = new Int32Array(Math.max(1, n))
    this.marke = new Int32Array(Math.max(1, n))
    this.nr = 0
    /* Erst alle Eintraege (Schluessel der Zelle, Rechteck) sammeln, dann
     * die Zellen in die Streutabelle, zuletzt nach Zellen geordnet. */
    let platzE = Math.max(16, n * 4)
    let eKey = new Int32Array(platzE)
    let eRecht = new Int32Array(platzE)
    let e = 0
    const eintragen = (ix: number, iz: number, i: number) => {
      if (e === platzE) {
        platzE *= 2
        const k2 = new Int32Array(platzE)
        k2.set(eKey)
        eKey = k2
        const r2 = new Int32Array(platzE)
        r2.set(eRecht)
        eRecht = r2
      }
      eKey[e] = Hindernisse.schluessel(ix, iz)
      eRecht[e] = i
      e++
    }
    const c = this.zelle
    const weit = (KANTE - 1) * c
    const cx = new Float64Array(4)
    const cz = new Float64Array(4)
    for (let i = 0; i < n; i++) {
      const x0 = this.bx0[i]
      const x1 = this.bx1[i]
      const z0 = this.bz0[i]
      const z1 = this.bz1[i]
      if (this.beweglich[i] || !(x0 > -weit && x1 < weit && z0 > -weit && z1 < weit)) {
        // Kasten: der ganze Bereich (bewegt sich, oder liegt am Rand des Schluessels).
        const ix0 = Hindernisse.klemm(Math.floor(x0 / c))
        const ix1 = Hindernisse.klemm(Math.floor(x1 / c))
        const iz0 = Hindernisse.klemm(Math.floor(z0 / c))
        const iz1 = Hindernisse.klemm(Math.floor(z1 / c))
        for (let ix = ix0; ix <= ix1; ix++) for (let iz = iz0; iz <= iz1; iz++) eintragen(ix, iz, i)
        continue
      }
      // Genau: die vier Ecken (Laenge u, Tiefe t = (-uz, ux)) im Umlauf.
      const mx = this.mx[i]
      const mz = this.mz[i]
      const lx = this.ux[i] * this.hl[i]
      const lz = this.uz[i] * this.hl[i]
      const tx = -this.uz[i] * this.ht[i]
      const tz = this.ux[i] * this.ht[i]
      cx[0] = mx + lx + tx
      cz[0] = mz + lz + tz
      cx[1] = mx - lx + tx
      cz[1] = mz - lz + tz
      cx[2] = mx - lx - tx
      cz[2] = mz - lz - tz
      cx[3] = mx + lx - tx
      cz[3] = mz + lz - tz
      const zMin = Math.min(cz[0], cz[1], cz[2], cz[3])
      const zMax = Math.max(cz[0], cz[1], cz[2], cz[3])
      const iz0 = Math.floor(zMin / c)
      const iz1 = Math.floor(zMax / c)
      for (let iz = iz0; iz <= iz1; iz++) {
        const za = iz * c
        const zb = za + c
        let lo = Infinity
        let hi = -Infinity
        for (let k = 0; k < 4; k++) {
          // Ecken in der Zeile.
          const ex = cx[k]
          const ez = cz[k]
          if (ez >= za && ez <= zb) {
            if (ex < lo) lo = ex
            if (ex > hi) hi = ex
          }
          // Kanten durch den oberen und unteren Rand der Zeile.
          const m = (k + 1) & 3
          const fz = cz[m]
          if (fz === ez) continue
          if ((ez - za) * (fz - za) < 0) {
            const x = ex + ((za - ez) * (cx[m] - ex)) / (fz - ez)
            if (x < lo) lo = x
            if (x > hi) hi = x
          }
          if ((ez - zb) * (fz - zb) < 0) {
            const x = ex + ((zb - ez) * (cx[m] - ex)) / (fz - ez)
            if (x < lo) lo = x
            if (x > hi) hi = x
          }
        }
        if (!(lo <= hi)) continue
        const ix1 = Math.floor(hi / c)
        for (let ix = Math.floor(lo / c); ix <= ix1; ix++) eintragen(ix, iz, i)
      }
    }
    // Streutabelle: hoechstens so viele Zellen wie Eintraege, Fuellung unter 3/4.
    let bits = 1
    while (1 << bits < e * 1.4 + 2 && bits < 30) bits++
    this.tabKey = new Int32Array(1 << bits)
    this.tabZelle = new Int32Array(1 << bits)
    this.maske = (1 << bits) - 1
    this.schieb = 32 - bits
    const zahl = new Int32Array(Math.max(1, e))
    let zellenN = 0
    for (let j = 0; j < e; j++) {
      const k = eKey[j]
      const h = this.platz(k)
      let s: number
      if (this.tabKey[h] === 0) {
        this.tabKey[h] = k + 1
        s = zellenN++
        this.tabZelle[h] = s
      } else s = this.tabZelle[h]
      // Ab hier steht in eKey die Zellnummer des Eintrags.
      eKey[j] = s
      zahl[s]++
    }
    const anfang = new Int32Array(zellenN + 1)
    for (let s = 0; s < zellenN; s++) anfang[s + 1] = anfang[s] + zahl[s]
    const pos = anfang.slice(0, Math.max(1, zellenN))
    const eintraege = new Int32Array(e)
    for (let j = 0; j < e; j++) eintraege[pos[eKey[j]]++] = eRecht[j]
    this.zellenZahl = zellenN
    this.anfang = anfang
    this.eintraege = eintraege
  }

  /** Rechtecke, die das Feld (x0, z0)-(x1, z1) beruehren koennten (Zelle
   *  getroffen und Bereich ueberlappt das Feld), in treffer[0..anzahl).
   *  Jedes hoechstens einmal. Gibt anzahl zurueck. Ohne neues Objekt. */
  abfrage(x0: number, z0: number, x1: number, z1: number): number {
    this.anzahl = 0
    if (this.mx.length === 0) return 0
    this.nr++
    if (this.nr > 2_000_000_000) {
      this.marke.fill(0)
      this.nr = 1
    }
    const c = this.zelle
    const ix0 = Hindernisse.klemm(Math.floor(x0 / c))
    const ix1 = Hindernisse.klemm(Math.floor(x1 / c))
    const iz0 = Hindernisse.klemm(Math.floor(z0 / c))
    const iz1 = Hindernisse.klemm(Math.floor(z1 / c))
    const anfang = this.anfang
    const eintraege = this.eintraege
    for (let ix = ix0; ix <= ix1; ix++) {
      for (let iz = iz0; iz <= iz1; iz++) {
        const h = this.platz(Hindernisse.schluessel(ix, iz))
        if (this.tabKey[h] === 0) continue
        const s = this.tabZelle[h]
        const bis = anfang[s + 1]
        for (let j = anfang[s]; j < bis; j++) {
          const i = eintraege[j]
          if (this.marke[i] === this.nr) continue
          this.marke[i] = this.nr
          if (this.bx1[i] < x0 || this.bx0[i] > x1 || this.bz1[i] < z0 || this.bz0[i] > z1) continue
          this.treffer[this.anzahl++] = i
        }
      }
    }
    return this.anzahl
  }

  /** Wie tief der Kreis (x, z, r) in Rechteck i steckt (0 = frei). */
  tiefe(i: number, x: number, z: number, r: number): number {
    const dx = x - this.mx[i]
    const dz = z - this.mz[i]
    const ux = this.ux[i]
    const uz = this.uz[i]
    // In die Achsen des Rechtecks: lx entlang der Laenge, lz entlang der Tiefe.
    const lx = dx * ux + dz * uz
    const lz = -dx * uz + dz * ux
    const hl = this.hl[i]
    const ht = this.ht[i]
    const ex = lx - Math.max(-hl, Math.min(hl, lx))
    const ez = lz - Math.max(-ht, Math.min(ht, lz))
    const d2 = ex * ex + ez * ez
    if (d2 >= r * r) return 0
    if (d2 > 1e-12) return r - Math.sqrt(d2)
    // Mitte im Rechteck: bis zur naechsten Kante plus Radius.
    return Math.min(hl - Math.abs(lx), ht - Math.abs(lz)) + r
  }

  /** Haelt Rechteck i in der laufenden Rechnung auf? An und hoeher als
   *  die Grenze (Fusshoehe plus STUFE_M, E87). */
  private sperrt(i: number): boolean {
    return this.an[i] && this.ob[i] > this.grenze
  }

  private grenzeSetzen(fuss: number): void {
    this.grenze = fussAus(fuss) + STUFE_M
  }

  /** Den Kreis aus Rechteck i schieben, wenn er darin steckt. Aendert p.
   *  true, wenn geschoben wurde. */
  private schieben(i: number, p: Stelle, r: number): boolean {
    const dx = p.x - this.mx[i]
    const dz = p.z - this.mz[i]
    const ux = this.ux[i]
    const uz = this.uz[i]
    const lx = dx * ux + dz * uz
    const lz = -dx * uz + dz * ux
    const hl = this.hl[i]
    const ht = this.ht[i]
    const ex = lx - Math.max(-hl, Math.min(hl, lx))
    const ez = lz - Math.max(-ht, Math.min(ht, lz))
    const d2 = ex * ex + ez * ez
    if (d2 >= r * r) return false
    let nlx: number
    let nlz: number
    let weit: number
    if (d2 > 1e-12) {
      // Normale von der naechsten Stelle des Rechtecks zur Mitte des Kreises.
      const d = Math.sqrt(d2)
      nlx = ex / d
      nlz = ez / d
      weit = r - d
    } else {
      // Mitte im Rechteck: zur naechsten Kante hinaus.
      const px = hl - Math.abs(lx)
      const pz = ht - Math.abs(lz)
      if (px < pz) {
        nlx = lx >= 0 ? 1 : -1
        nlz = 0
        weit = px + r
      } else {
        nlx = 0
        nlz = lz >= 0 ? 1 : -1
        weit = pz + r
      }
    }
    weit += HAUT_M
    // Zurueck in die Welt: Laenge (ux, uz), Tiefe (-uz, ux).
    p.x += (nlx * ux - nlz * uz) * weit
    p.z += (nlx * uz + nlz * ux) * weit
    return true
  }

  /** Groesste Ueberlappung mit den sperrenden Rechtecken aus der letzten Abfrage. */
  private restTiefe(p: Stelle, r: number): number {
    let max = 0
    for (let j = 0; j < this.anzahl; j++) {
      const i = this.treffer[j]
      if (!this.sperrt(i)) continue
      const t = this.tiefe(i, p.x, p.z, r)
      if (t > max) max = t
    }
    return max
  }

  /** Mit den Treffern der letzten Abfrage herausdruecken (E87: dazu die
   *  der letzten Abfrage von b, etwa abgestellte Fahrzeuge). Gibt die
   *  verbleibende groesste Ueberlappung zurueck. */
  private loesen(p: Stelle, r: number, b: Hindernisse | null = null): number {
    for (let d = 0; d < DURCHGAENGE; d++) {
      let geschoben = false
      for (let j = 0; j < this.anzahl; j++) {
        const i = this.treffer[j]
        if (this.sperrt(i) && this.schieben(i, p, r)) geschoben = true
      }
      if (b) {
        for (let j = 0; j < b.anzahl; j++) {
          const i = b.treffer[j]
          if (b.sperrt(i) && b.schieben(i, p, r)) geschoben = true
        }
      }
      if (!geschoben) return 0
    }
    return this.tiefeMit(p, r, b)
  }

  /** Groesste Ueberlappung mit den Treffern der letzten Abfragen von
   *  diesem Raster und b (E87). */
  private tiefeMit(p: Stelle, r: number, b: Hindernisse | null): number {
    const t = this.restTiefe(p, r)
    return b ? Math.max(t, b.restTiefe(p, r)) : t
  }

  /** Das zweite Raster (E87) fuer eine Rechnung: nur, wenn es Rechtecke
   *  hat; dann mit derselben Grenze wie dieses und abgefragt im Feld. */
  private dazuAbfragen(dazu: Hindernisse | null | undefined, fuss: number, x0: number, z0: number, x1: number, z1: number): Hindernisse | null {
    if (!dazu || dazu === this || dazu.groesse === 0) return null
    dazu.grenzeSetzen(fuss)
    dazu.abfrage(x0, z0, x1, z1)
    return dazu
  }

  /** Ueberlappt der Kreis (x, z, r) ein Rechteck, das aufhaelt? fuss
   *  (E87): Fusshoehe ueber dem Gelaende; was hoechstens STUFE_M darueber
   *  endet, haelt nicht auf. dazu (E87): ein zweites Raster, das ebenso
   *  zaehlt (abgestellte Fahrzeuge). */
  frei(x: number, z: number, r: number, fuss = 0, dazu: Hindernisse | null = null): boolean {
    this.grenzeSetzen(fuss)
    this.abfrage(x - r, z - r, x + r, z + r)
    for (let j = 0; j < this.anzahl; j++) {
      const i = this.treffer[j]
      if (this.sperrt(i) && this.tiefe(i, x, z, r) > RESTUEBERLAPP_M) return false
    }
    const b = this.dazuAbfragen(dazu, fuss, x - r, z - r, x + r, z + r)
    if (b) {
      for (let j = 0; j < b.anzahl; j++) {
        const i = b.treffer[j]
        if (b.sperrt(i) && b.tiefe(i, x, z, r) > RESTUEBERLAPP_M) return false
      }
    }
    return true
  }

  /** Den Kreis an p aus allem herausdruecken, was er ueberlappt (eine Tuer
   *  ist zugegangen, Start im Moebel). Aendert p. Gibt die verbleibende
   *  Ueberlappung zurueck (0 = frei). fuss und dazu wie bei frei(). */
  herausdruecken(p: Stelle, r: number, fuss = 0, dazu: Hindernisse | null = null): number {
    this.grenzeSetzen(fuss)
    const rand = r + 0.4
    this.abfrage(p.x - rand, p.z - rand, p.x + rand, p.z + rand)
    const b = this.dazuAbfragen(dazu, fuss, p.x - rand, p.z - rand, p.x + rand, p.z + rand)
    return this.loesen(p, r, b)
  }

  /** Gehen: p um (dx, dz) verschieben, an Hindernissen entlang gleiten.
   *  Lange Wege in Teilschritten, damit nichts durchrutscht. Steckt der
   *  Kreis nach einem Teilschritt fest (zu eng), bleibt er davor stehen;
   *  wer schon feststeckt, darf sich herausbewegen. Aendert p. fuss wie
   *  bei frei(): Niedriges steigt man hinauf statt anzustossen. dazu
   *  (E87): ein zweites Raster, das ebenso aufhaelt (abgestellte
   *  Fahrzeuge der Ebene). */
  bewegen(p: Stelle, dx: number, dz: number, r: number, fuss = 0, dazu: Hindernisse | null = null): void {
    const l = Math.hypot(dx, dz)
    if (!(l > 0)) return
    this.grenzeSetzen(fuss)
    // Eine Abfrage fuer den ganzen Weg, mit Rand fuer das Herausdruecken.
    const rand = r + 0.4
    const x0 = Math.min(p.x, p.x + dx) - rand
    const z0 = Math.min(p.z, p.z + dz) - rand
    const x1 = Math.max(p.x, p.x + dx) + rand
    const z1 = Math.max(p.z, p.z + dz) + rand
    this.abfrage(x0, z0, x1, z1)
    const b = this.dazuAbfragen(dazu, fuss, x0, z0, x1, z1)
    const n = Math.max(1, Math.ceil(l / TEILSCHRITT_M))
    const sx = dx / n
    const sz = dz / n
    for (let s = 0; s < n; s++) {
      const ax = p.x
      const az = p.z
      const vorher = this.tiefeMit(p, r, b)
      p.x += sx
      p.z += sz
      const rest = this.loesen(p, r, b)
      if (rest > RESTUEBERLAPP_M && rest > vorher + 1e-4) {
        // Steckte man schon vorher fest, zaehlt der gerade Schritt, wenn er
        // nicht tiefer hineinfuehrt: so kommt man aus der Enge heraus.
        if (vorher > RESTUEBERLAPP_M) {
          p.x = ax + sx
          p.z = az + sz
          if (this.tiefeMit(p, r, b) <= vorher + 1e-4) continue
        }
        p.x = ax
        p.z = az
        return
      }
    }
  }

  /** Worauf man an (x, z) steht (E87): die hoechste Oberkante (Meter ueber
   *  dem Gelaende) der Rechtecke, die an sind, hoechstens STUFE_M ueber den
   *  Fuessen (fuss, Meter ueber dem Gelaende) enden und den Kreis (x, z, r)
   *  beruehren; sonst 0 (das Gelaende). Waende zaehlen nie. */
  stand(x: number, z: number, fuss = 0, r = STAND_R_M): number {
    const g = fussAus(fuss) + STUFE_M
    this.abfrage(x - r, z - r, x + r, z + r)
    let best = 0
    for (let j = 0; j < this.anzahl; j++) {
      const i = this.treffer[j]
      if (!this.an[i]) continue
      const o = this.ob[i]
      if (!(o <= g) || o <= best) continue
      if (this.tiefe(i, x, z, r) > 0) best = o
    }
    return best
  }
}

/** Mitfahren im Aufzug (E83), ohne three. Die Welt meldet je Bild den
 *  Boden der Kabine (oder null, wenn sie steht). Mit faehrt, wer beim
 *  Abfahren steht und auf ihrem Boden steht (wer sie von einem anderen
 *  Geschoss ruft, bleibt, wo er ist), und nur, solange er nahe der Stelle
 *  bleibt, an der die Fahrt begann; wer sich weiter entfernt oder sich
 *  setzt, ist ausgestiegen und bleibt es fuer diese Fahrt. */
export class Mitfahrt {
  /** Eine Fahrt laeuft. */
  an = false
  /** Man faehrt gerade mit: der eigene Boden ist der der Kabine. */
  mit = false
  /** In dieser Fahrt wenigstens ein Bild mitgefahren. */
  gefahren = false
  /** Wo man beim Abfahren stand. */
  x = 0
  z = 0

  /** Ein Bild. kabine: Boden der Kabine (Meter) oder null; x, z: wo man
   *  steht; boden: der eigene Boden; stehend: man steht (sitzt nicht, kein
   *  Hinsetzen oder Aufstehen im Gang). Gibt zurueck: 0 keine Fahrt, 1 die
   *  Fahrt laeuft (mit sagt, ob man mitfaehrt), 2 die Fahrt ist eben zu
   *  Ende, nachdem man mitgefahren ist: jetzt gilt die naechste Ebene. */
  schritt(kabine: number | null, x: number, z: number, boden: number, stehend: boolean): 0 | 1 | 2 {
    if (kabine !== null && Number.isFinite(kabine)) {
      if (!this.an) {
        this.an = true
        this.gefahren = false
        this.x = x
        this.z = z
        this.mit = stehend && Math.abs(kabine - boden) <= AUFZUG_BODEN_M
      }
      if (this.mit) {
        if (!stehend || Math.hypot(x - this.x, z - this.z) > AUFZUG_NAH_M) this.mit = false
        else this.gefahren = true
      }
      return 1
    }
    if (!this.an) return 0
    const gefahren = this.gefahren
    this.ruhe()
    return gefahren ? 2 : 0
  }

  /** Keine Fahrt (Begehen an oder aus, neue Welt). */
  ruhe(): void {
    this.an = false
    this.mit = false
    this.gefahren = false
  }
}

/** Index der Ebene der Wohnung: Boden bei 0, bei mehreren die mit der
 *  Kennung 'wohnung', sonst die erste. -1, wenn keine bei 0 liegt. */
export function wohnungsEbene(ebenen: readonly EbeneDaten[]): number {
  let erste = -1
  for (let i = 0; i < ebenen.length; i++) {
    if (!(Math.abs(ebenen[i].y) <= WOHNUNG_BODEN_M)) continue
    if (ebenen[i].id === 'wohnung') return i
    if (erste < 0) erste = i
  }
  return erste
}

/** Eine Ebene mit ihrem Raster. Ohne gueltigen Boden (y kaputt) ist sie
 *  nicht betretbar, behaelt aber ihren Platz, damit die Indizes zu denen
 *  der Welt passen. */
interface EbeneRaster {
  id: string
  name: string
  y: number
  raster: Hindernisse
  /** Die Hindernisse, aus denen raster gebaut ist (E87): bleibt das Feld
   *  dasselbe, braucht es kein neues Raster (aktualisieren()). */
  quelle: readonly Rechteck[]
  /** Gelaende relativ zu y (E87), null: eben. */
  hoehe: ((x: number, z: number) => number) | null
}

/** Die Hindernisse einer Ebene, kaputt (kein Feld) als leer. */
function hindernisseVon(e: EbeneDaten): readonly Rechteck[] {
  return Array.isArray(e.hindernisse) ? e.hindernisse : []
}

/** Das Gelaende einer Ebene, wenn es eine Funktion ist. */
function hoeheVon(e: EbeneDaten): ((x: number, z: number) => number) | null {
  return typeof e.hoehe === 'function' ? e.hoehe : null
}

/** Begehbare Ebenen fuer den Zusammenstoss (E83). Jede Ebene hat ihr
 *  eigenes Raster, und es gilt nur das der aktiven: was auf einer Ebene
 *  steht, haelt auf keiner anderen auf. Die Ebene der Wohnung benutzt das
 *  Raster der Wohnung selbst (Waende, Tueren, Moebel zuerst, dahinter die
 *  Rechtecke der Ebene wie Gang und Aufzug). Liegt keine Ebene bei 0, steht
 *  die Wohnung allein als Index -1 da, mit Boden 0. */
export class Ebenen {
  /** Raster der Wohnung; dasselbe Objekt, das der Motor beim Bauen fuellt. */
  readonly wohnung: Hindernisse
  /** Zellgroesse der Raster aller anderen Ebenen (Meter). */
  readonly zelle: number
  liste: EbeneRaster[] = []
  /** Index der Ebene der Wohnung, -1 ohne. */
  wohnIndex = -1
  /** Aktive Ebene, -1 = die Wohnung allein. */
  index = -1
  /** Rechtecke, die beim letzten setzen() wegen kaputter Zahlen wegfielen. */
  verworfen = 0
  /** Wie viele Rechtecke im Raster der Wohnung ihr selbst gehoeren. */
  private eigene = 0
  /** Die Rechtecke der Ebene der Wohnung (nach jedem Neubau wieder dazu). */
  private wohnRechtecke: readonly Rechteck[] = []
  /** Zellgroesse des Rasters der Wohnung, wie es kam (E87: liegt die Stadt
   *  auf der Ebene der Wohnung, rastert sie in groesseren Zellen). */
  private readonly wohnZelle: number

  constructor(wohnung: Hindernisse, zelle = 1) {
    this.wohnung = wohnung
    this.zelle = zelle
    this.wohnZelle = wohnung.zelle
  }

  /** Die Wohnung ist neu gebaut (leeren(), dazu() ...): haengt die
   *  Rechtecke ihrer Ebene an und rastert. Statt wohnung.rastern(). */
  wohnungFertig(): void {
    this.eigene = this.wohnung.groesse
    this.wohnungRastern()
  }

  private wohnungRastern(): number {
    this.wohnung.kuerzen(this.eigene)
    const verworfen = this.wohnung.alle(this.wohnRechtecke)
    this.wohnung.zelle = zelleFuer(this.wohnung.groesse, this.wohnZelle)
    this.wohnung.rastern()
    return verworfen
  }

  /** Neue Ebenen (leer: keine). Jede bekommt ihr Raster; aktiv ist danach
   *  die Ebene der Wohnung. */
  setzen(ebenen: readonly EbeneDaten[]): void {
    this.wohnIndex = wohnungsEbene(ebenen)
    let verworfen = 0
    this.liste = ebenen.map((e, i) => {
      const r = this.ebeneBauen(e, i === this.wohnIndex)
      verworfen += r.verworfen
      return r.ebene
    })
    this.wohnRechtecke = this.wohnIndex >= 0 ? hindernisseVon(ebenen[this.wohnIndex]) : []
    verworfen += this.wohnungRastern()
    this.verworfen = verworfen
    this.index = this.wohnIndex
  }

  /** Raster einer Ebene (die der Wohnung: nur der Eintrag, ihr Raster macht
   *  wohnungRastern()). Grosse Ebenen (eine Stadt) in groesseren Zellen. */
  private ebeneBauen(e: EbeneDaten, wohnung: boolean): { ebene: EbeneRaster; verworfen: number } {
    const quelle = hindernisseVon(e)
    const hoehe = hoeheVon(e)
    if (wohnung) return { ebene: { id: e.id, name: e.name, y: e.y, raster: this.wohnung, quelle, hoehe }, verworfen: 0 }
    const h = new Hindernisse(zelleFuer(quelle.length, this.zelle))
    const verworfen = h.alle(quelle)
    h.rastern()
    return { ebene: { id: e.id, name: e.name, y: e.y, raster: h, quelle, hoehe }, verworfen }
  }

  /** Dieselbe Welt mit neuen Daten (E87, version() der Welt): Ebenen
   *  kommen nur hinten dazu, Hindernisse einer Ebene duerfen neu sein.
   *  Neu gerastert wird nur, wo das Feld der Hindernisse ein anderes ist
   *  und nicht genau dieselben Objekte enthaelt (oder die Ebene neu ist);
   *  wer ein Rechteck aendert, gibt ein neues Objekt. Name, Boden und
   *  Gelaende gelten sofort. Die
   *  aktive Ebene bleibt. Passt das nicht (weniger Ebenen, eine andere
   *  Kennung an einem alten Index, eine andere Ebene der Wohnung), wie
   *  setzen(): dann ist die Ebene der Wohnung aktiv, und der Aufrufer sucht
   *  die alte ueber ihre Kennung (ebeneWiederfinden in motor.ts). Gibt die
   *  Zahl der neu gerasterten Ebenen zurueck, -1 nach setzen(). verworfen
   *  zaehlt dann nur die neu gerasterten. */
  aktualisieren(ebenen: readonly EbeneDaten[]): number {
    let passt = ebenen.length >= this.liste.length && wohnungsEbene(ebenen) === this.wohnIndex
    for (let i = 0; passt && i < this.liste.length; i++) if (ebenen[i].id !== this.liste[i].id) passt = false
    if (!passt) {
      this.setzen(ebenen)
      return -1
    }
    let neu = 0
    let verworfen = 0
    for (let i = 0; i < ebenen.length; i++) {
      const e = ebenen[i]
      const alt = this.liste[i]
      const quelle = hindernisseVon(e)
      if (alt && gleicheRechtecke(alt.quelle, quelle)) {
        alt.quelle = quelle
        if (i === this.wohnIndex) this.wohnRechtecke = quelle
        alt.name = e.name
        alt.y = e.y
        alt.hoehe = hoeheVon(e)
        continue
      }
      const wohnung = i === this.wohnIndex
      const r = this.ebeneBauen(e, wohnung)
      if (alt) this.liste[i] = r.ebene
      else this.liste.push(r.ebene)
      verworfen += r.verworfen
      if (wohnung) {
        this.wohnRechtecke = quelle
        verworfen += this.wohnungRastern()
      }
      neu++
    }
    this.verworfen = verworfen
    if (!this.gibt(this.index) && this.index !== this.wohnIndex) this.index = this.wohnIndex
    return neu
  }

  /** Gelaende der Ebene i an (x, z) relativ zu ihrem Boden (E87), 0 ohne
   *  Gelaende, fuer -1 und bei kaputten Zahlen. Wirft die Funktion der
   *  Welt, meldet es das einmal in der Konsole und rechnet die Ebene ab
   *  dann eben. */
  gelaende(i: number, x: number, z: number): number {
    const e = i >= 0 && i < this.liste.length ? this.liste[i] : null
    const f = e?.hoehe
    if (!e || !f) return 0
    let h: number
    try {
      h = f(x, z)
    } catch (err) {
      console.error(`[3d] Ebene ${e.id}: hoehe() wirft, ab jetzt eben:`, err)
      e.hoehe = null
      return 0
    }
    return typeof h === 'number' && Number.isFinite(h) ? h : 0
  }

  /** Das Raster, das gerade gilt. */
  get aktiv(): Hindernisse {
    return this.index >= 0 ? this.liste[this.index].raster : this.wohnung
  }

  /** Das Raster der Ebene i (E87); -1 und unbekannte: das der Wohnung. */
  rasterVon(i: number): Hindernisse {
    return i >= 0 && i < this.liste.length ? this.liste[i].raster : this.wohnung
  }

  /** Steht man auf der Ebene der Wohnung (oder der Wohnung allein)? */
  get aufWohnung(): boolean {
    return this.index === this.wohnIndex
  }

  /** Bodenhoehe der Ebene i, ohne Angabe der aktiven; -1 ist 0. */
  boden(i = this.index): number {
    return i >= 0 && i < this.liste.length ? this.liste[i].y : 0
  }

  /** Laesst sich Ebene i betreten? -1 nur, wenn die Wohnung allein steht. */
  gibt(i: number): boolean {
    if (i === -1) return this.wohnIndex === -1
    return Number.isInteger(i) && i >= 0 && i < this.liste.length && Number.isFinite(this.liste[i].y)
  }

  /** Auf Ebene i wechseln. false (und nichts aendert sich), wenn es sie nicht gibt. */
  wechseln(i: number): boolean {
    if (!this.gibt(i)) return false
    this.index = i
    return true
  }

  /** Die Ebene, deren Boden y am naechsten liegt (bei Gleichstand die
   *  erste); die Wohnung allein (-1, Boden 0) zaehlt mit, wenn keine Ebene
   *  bei 0 liegt. Kaputtes y: die aktive. */
  naechste(y: number): number {
    if (!Number.isFinite(y)) return this.index
    let best = this.index
    let abstand = Infinity
    if (this.wohnIndex === -1) {
      best = -1
      abstand = Math.abs(y)
    }
    for (let i = 0; i < this.liste.length; i++) {
      if (!this.gibt(i)) continue
      const d = Math.abs(this.liste[i].y - y)
      if (d < abstand) {
        abstand = d
        best = i
      }
    }
    return best
  }
}
