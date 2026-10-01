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
 * alle Zahlen liegen in Feldern, die Treffer in einem festen Puffer. */

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

/** Stelle in der Ebene (Meter, Welt): x und z. Wird beim Gehen veraendert. */
export interface Stelle {
  x: number
  z: number
}

export class Hindernisse {
  /** Kantenlaenge einer Rasterzelle in Metern. */
  zelle: number
  /* Ein Rechteck je Index: Mitte, Richtung der Laenge (ux, uz), halbe
   * Laenge und halbe Tiefe, an oder aus. */
  mx: number[] = []
  mz: number[] = []
  ux: number[] = []
  uz: number[] = []
  hl: number[] = []
  ht: number[] = []
  an: boolean[] = []
  /* Bereich fuer das Raster: die Lage beim Bauen, bei Tueren und
   * Schubladen alles, was sie je ueberstreichen koennen. */
  bx0: number[] = []
  bz0: number[] = []
  bx1: number[] = []
  bz1: number[] = []
  /** Zelle -> Indizes der Rechtecke darin. */
  raster = new Map<number, number[]>()
  /** Treffer der letzten Abfrage (die ersten anzahl Eintraege gelten). */
  treffer: Int32Array = new Int32Array(0)
  anzahl = 0
  /** Fuer doppelte Treffer: Nummer der Abfrage, in der ein Index schon kam. */
  marke: Int32Array = new Int32Array(0)
  nr = 0

  constructor(zelle = 1) {
    this.zelle = zelle
  }

  /** Wie viele Rechtecke es gibt. */
  get groesse(): number {
    return this.mx.length
  }

  /** Alles weg (neue Szene). */
  leeren(): void {
    for (const f of [this.mx, this.mz, this.ux, this.uz, this.hl, this.ht, this.bx0, this.bz0, this.bx1, this.bz1]) f.length = 0
    this.an.length = 0
    this.raster.clear()
    this.treffer = new Int32Array(0)
    this.marke = new Int32Array(0)
    this.anzahl = 0
    this.nr = 0
  }

  /** Neues Rechteck: Mitte (x, z), laenge entlang drehY, tiefe quer dazu
   *  (wie Quader.masse[0] und [2]), drehY wie three (positiv dreht x nach
   *  -z). Gibt den Index zurueck. Vor raster() aufrufen. */
  dazu(x: number, z: number, laenge: number, tiefe: number, drehY: number, aktiv = true): number {
    const i = this.mx.length
    this.mx.push(x)
    this.mz.push(z)
    this.ux.push(Math.cos(drehY))
    this.uz.push(-Math.sin(drehY))
    this.hl.push(Math.max(0, laenge / 2))
    this.ht.push(Math.max(0, tiefe / 2))
    this.an.push(aktiv)
    const [ex, ez] = this.ausdehnung(i)
    this.bx0.push(x - ex)
    this.bz0.push(z - ez)
    this.bx1.push(x + ex)
    this.bz1.push(z + ez)
    return i
  }

  /** Halbe Ausdehnung des Rechtecks i entlang x und z. */
  ausdehnung(i: number): [number, number] {
    const ax = Math.abs(this.ux[i])
    const az = Math.abs(this.uz[i])
    return [ax * this.hl[i] + az * this.ht[i], az * this.hl[i] + ax * this.ht[i]]
  }

  /** Rasterbereich von i um das Rechteck (x0, z0)-(x1, z1) erweitern
   *  (Tuer: der Kreis, den sie um die Angel ueberstreicht). Vor raster(). */
  bereich(i: number, x0: number, z0: number, x1: number, z1: number): void {
    this.bx0[i] = Math.min(this.bx0[i], x0)
    this.bz0[i] = Math.min(this.bz0[i], z0)
    this.bx1[i] = Math.max(this.bx1[i], x1)
    this.bz1[i] = Math.max(this.bz1[i], z1)
  }

  /** Rasterbereich von i um die eigene Lage, verschoben um (dx, dz),
   *  erweitern (Schublade ganz offen). Vor raster(). */
  bereichVerschoben(i: number, dx: number, dz: number): void {
    const [ex, ez] = this.ausdehnung(i)
    this.bereich(i, this.mx[i] + dx - ex, this.mz[i] + dz - ez, this.mx[i] + dx + ex, this.mz[i] + dz + ez)
  }

  /** Neue Lage eines Rechtecks (Tuer dreht, Schublade faehrt). Es muss im
   *  Bereich bleiben, der beim Bauen angegeben war. Ohne neues Objekt. */
  lage(i: number, x: number, z: number, drehY: number): void {
    this.mx[i] = x
    this.mz[i] = z
    this.ux[i] = Math.cos(drehY)
    this.uz[i] = -Math.sin(drehY)
  }

  aktiv(i: number, an: boolean): void {
    this.an[i] = an
  }

  private schluessel(ix: number, iz: number): number {
    return (ix + 50000) * 100000 + (iz + 50000)
  }

  /** Raster aus allen Rechtecken bauen. Nach dem letzten dazu(). */
  rastern(): void {
    this.raster.clear()
    const n = this.mx.length
    this.treffer = new Int32Array(Math.max(1, n))
    this.marke = new Int32Array(Math.max(1, n))
    this.nr = 0
    const c = this.zelle
    for (let i = 0; i < n; i++) {
      const ix0 = Math.floor(this.bx0[i] / c)
      const ix1 = Math.floor(this.bx1[i] / c)
      const iz0 = Math.floor(this.bz0[i] / c)
      const iz1 = Math.floor(this.bz1[i] / c)
      for (let ix = ix0; ix <= ix1; ix++) {
        for (let iz = iz0; iz <= iz1; iz++) {
          const k = this.schluessel(ix, iz)
          let liste = this.raster.get(k)
          if (!liste) {
            liste = []
            this.raster.set(k, liste)
          }
          liste.push(i)
        }
      }
    }
  }

  /** Alle Rechtecke, deren Rasterbereich das Feld (x0, z0)-(x1, z1)
   *  beruehren koennte, in treffer[0..anzahl). Jedes hoechstens einmal.
   *  Gibt anzahl zurueck. Ohne neues Objekt. */
  abfrage(x0: number, z0: number, x1: number, z1: number): number {
    this.anzahl = 0
    if (this.mx.length === 0) return 0
    this.nr++
    if (this.nr > 2_000_000_000) {
      this.marke.fill(0)
      this.nr = 1
    }
    const c = this.zelle
    const ix0 = Math.floor(x0 / c)
    const ix1 = Math.floor(x1 / c)
    const iz0 = Math.floor(z0 / c)
    const iz1 = Math.floor(z1 / c)
    for (let ix = ix0; ix <= ix1; ix++) {
      for (let iz = iz0; iz <= iz1; iz++) {
        const liste = this.raster.get(this.schluessel(ix, iz))
        if (!liste) continue
        for (let j = 0; j < liste.length; j++) {
          const i = liste[j]
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

  /** Groesste Ueberlappung mit den aktiven Rechtecken aus der letzten Abfrage. */
  private restTiefe(p: Stelle, r: number): number {
    let max = 0
    for (let j = 0; j < this.anzahl; j++) {
      const i = this.treffer[j]
      if (!this.an[i]) continue
      const t = this.tiefe(i, p.x, p.z, r)
      if (t > max) max = t
    }
    return max
  }

  /** Mit den Treffern der letzten Abfrage herausdruecken. Gibt die
   *  verbleibende groesste Ueberlappung zurueck. */
  private loesen(p: Stelle, r: number): number {
    for (let d = 0; d < DURCHGAENGE; d++) {
      let geschoben = false
      for (let j = 0; j < this.anzahl; j++) {
        const i = this.treffer[j]
        if (this.an[i] && this.schieben(i, p, r)) geschoben = true
      }
      if (!geschoben) return 0
    }
    return this.restTiefe(p, r)
  }

  /** Ueberlappt der Kreis (x, z, r) ein aktives Rechteck? */
  frei(x: number, z: number, r: number): boolean {
    this.abfrage(x - r, z - r, x + r, z + r)
    for (let j = 0; j < this.anzahl; j++) {
      const i = this.treffer[j]
      if (this.an[i] && this.tiefe(i, x, z, r) > RESTUEBERLAPP_M) return false
    }
    return true
  }

  /** Den Kreis an p aus allem herausdruecken, was er ueberlappt (eine Tuer
   *  ist zugegangen, Start im Moebel). Aendert p. Gibt die verbleibende
   *  Ueberlappung zurueck (0 = frei). */
  herausdruecken(p: Stelle, r: number): number {
    const rand = r + 0.4
    this.abfrage(p.x - rand, p.z - rand, p.x + rand, p.z + rand)
    return this.loesen(p, r)
  }

  /** Gehen: p um (dx, dz) verschieben, an Hindernissen entlang gleiten.
   *  Lange Wege in Teilschritten, damit nichts durchrutscht. Steckt der
   *  Kreis nach einem Teilschritt fest (zu eng), bleibt er davor stehen;
   *  wer schon feststeckt, darf sich herausbewegen. Aendert p. */
  bewegen(p: Stelle, dx: number, dz: number, r: number): void {
    const l = Math.hypot(dx, dz)
    if (!(l > 0)) return
    // Eine Abfrage fuer den ganzen Weg, mit Rand fuer das Herausdruecken.
    const rand = r + 0.4
    this.abfrage(Math.min(p.x, p.x + dx) - rand, Math.min(p.z, p.z + dz) - rand, Math.max(p.x, p.x + dx) + rand, Math.max(p.z, p.z + dz) + rand)
    const n = Math.max(1, Math.ceil(l / TEILSCHRITT_M))
    const sx = dx / n
    const sz = dz / n
    for (let s = 0; s < n; s++) {
      const ax = p.x
      const az = p.z
      const vorher = this.restTiefe(p, r)
      p.x += sx
      p.z += sz
      const rest = this.loesen(p, r)
      if (rest > RESTUEBERLAPP_M && rest > vorher + 1e-4) {
        // Steckte man schon vorher fest, zaehlt der gerade Schritt, wenn er
        // nicht tiefer hineinfuehrt: so kommt man aus der Enge heraus.
        if (vorher > RESTUEBERLAPP_M) {
          p.x = ax + sx
          p.z = az + sz
          if (this.restTiefe(p, r) <= vorher + 1e-4) continue
        }
        p.x = ax
        p.z = az
        return
      }
    }
  }
}
