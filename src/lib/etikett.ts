/* Etiketten: Papierformate und die Rechnung, wie viel auf ein Etikett passt.
 *
 * Reine Rechnung, keine Oberflaeche und keine Datenabfrage. Alle Masse sind
 * Millimeter. Die Seite (pages/Labels.tsx) und das Etikett
 * (components/etikett/Etikett.tsx) holen sich von hier, wie gross was wird,
 * damit nichts ueberlaeuft: Schrift und Zeilenzahl folgen dem Platz, nicht
 * umgekehrt. */

export type FormatId = 'a4' | 'a5' | 'a6' | 'a7' | 'r2x4' | 'r3x7' | 'r4x10'
export type Ausrichtung = 'hoch' | 'quer'

export interface FormatDef {
  id: FormatId
  /** Ein Etikett pro Blatt oder ein Bogen mit Raster auf A4. */
  art: 'einzel' | 'raster'
  /** Blatt im Hochformat. */
  breite: number
  hoehe: number
  /** Rand um das Raster oder das einzelne Etikett. */
  rand: number
  spalten: number
  zeilen: number
  /** Nur Nummer und QR-Code. */
  mini: boolean
}

export const FORMATE: readonly FormatDef[] = [
  { id: 'a4', art: 'einzel', breite: 210, hoehe: 297, rand: 6, spalten: 1, zeilen: 1, mini: false },
  { id: 'a5', art: 'einzel', breite: 148, hoehe: 210, rand: 5, spalten: 1, zeilen: 1, mini: false },
  { id: 'a6', art: 'einzel', breite: 105, hoehe: 148, rand: 4, spalten: 1, zeilen: 1, mini: false },
  { id: 'a7', art: 'einzel', breite: 74, hoehe: 105, rand: 4, spalten: 1, zeilen: 1, mini: false },
  { id: 'r2x4', art: 'raster', breite: 210, hoehe: 297, rand: 8, spalten: 2, zeilen: 4, mini: false },
  { id: 'r3x7', art: 'raster', breite: 210, hoehe: 297, rand: 8, spalten: 3, zeilen: 7, mini: false },
  { id: 'r4x10', art: 'raster', breite: 210, hoehe: 297, rand: 8, spalten: 4, zeilen: 10, mini: true },
]

export const FORMAT_IDS: readonly FormatId[] = FORMATE.map((f) => f.id)

export function formatVon(id: FormatId): FormatDef {
  return FORMATE.find((f) => f.id === id) ?? FORMATE[0]
}

export interface Blatt {
  /** Blattgroesse nach der Ausrichtung. */
  seitenB: number
  seitenH: number
  rand: number
  spalten: number
  zeilen: number
  /** Ein Etikett (Zelle des Rasters oder ganzes Nutzfeld). */
  zelleB: number
  zelleH: number
  proSeite: number
  mini: boolean
}

/** Abrunden auf 0,1 mm, damit das Raster sicher in das Nutzfeld passt und der
 *  Drucker keine leere Folgeseite auswirft. */
function ab(n: number): number {
  return Math.floor(n * 10) / 10
}

export function blattmass(f: FormatDef, ausrichtung: Ausrichtung): Blatt {
  // Raster liegen immer hoch auf A4: so ist der Bogen im Drucker zu Hause.
  const quer = f.art === 'einzel' && ausrichtung === 'quer'
  const seitenB = quer ? f.hoehe : f.breite
  const seitenH = quer ? f.breite : f.hoehe
  return {
    seitenB,
    seitenH,
    rand: f.rand,
    spalten: f.spalten,
    zeilen: f.zeilen,
    zelleB: ab((seitenB - 2 * f.rand) / f.spalten),
    zelleH: ab((seitenH - 2 * f.rand) / f.zeilen),
    proSeite: f.spalten * f.zeilen,
    mini: f.mini,
  }
}

function klemme(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

/* ------------------------------------------------------------ Kistenetikett */

export interface InhaltsZeile {
  text: string
  menge: number
}

export interface PlanEingabe {
  w: number
  h: number
  mini: boolean
  code: string
  titel: string | null
  bereich: boolean
  inhalt: InhaltsZeile[]
  zeigeInhalt: boolean
  zeigeFuss: boolean
}

export interface Plan {
  mini: boolean
  /** Querformat: QR links, alles andere rechts daneben. */
  quer: boolean
  pad: number
  luecke: number
  /** Kantenlaenge des QR-Codes. */
  qr: number
  /** Breite der Textspalte neben dem QR-Code. */
  kopfB: number
  fsCode: number
  fsBereich: number
  fsTitel: number
  titelZeilen: number
  fsInhalt: number
  /** Breite und Hoehe des Inhaltsfeldes. */
  inhaltB: number
  inhaltH: number
  inhaltSpalten: number
  zeilenProSpalte: number
  /** Wie viele Zeilen gezeigt werden (ohne die Zeile "+ n weitere"). */
  sichtbar: number
  /** Wie viele Zeilen fehlen. 0 heisst: alles ist da. */
  weitere: number
  fsFuss: number
  fussH: number
}

/** Breite einer Mono-Ziffer in Schriftgroessen, mit dem engen Zeichenabstand
 *  von t-serial. Eher zu gross als zu klein angesetzt. */
const MONO = 0.6
/** Mittlere Zeichenbreite der Normalschrift, ebenfalls eher grosszuegig. */
const TEXT = 0.55

export function planeEtikett(e: PlanEingabe): Plan {
  const { w, h } = e
  const pad = klemme(Math.min(w, h) * 0.055, 1.2, 6)
  const luecke = klemme(pad * 0.9, 1, 4.5)
  const iw = w - 2 * pad
  const ih = h - 2 * pad
  const len = Math.max(4, e.code.length)
  const quer = iw / ih >= 1.3

  const leer: Plan = {
    mini: e.mini,
    quer,
    pad,
    luecke,
    qr: 0,
    kopfB: 0,
    fsCode: 0,
    fsBereich: 0,
    fsTitel: 0,
    titelZeilen: 0,
    fsInhalt: 0,
    inhaltB: 0,
    inhaltH: 0,
    inhaltSpalten: 1,
    zeilenProSpalte: 0,
    sichtbar: 0,
    weitere: 0,
    fsFuss: 0,
    fussH: 0,
  }

  /* Mini: nur Nummer und QR-Code. Quer liegen sie nebeneinander, sonst
   * untereinander. */
  if (e.mini) {
    if (quer) {
      const qr = Math.min(ih, iw * 0.5)
      const kopfB = iw - qr - luecke
      return { ...leer, qr, kopfB, fsCode: Math.min(kopfB / (len * MONO), ih * 0.4) }
    }
    const fsCode = Math.min(iw / (len * MONO), ih * 0.2)
    const qr = Math.min(iw, ih - fsCode * 1.2 - luecke)
    return { ...leer, qr, kopfB: iw, fsCode }
  }

  const u = Math.sqrt(iw * ih)
  const fsFuss = klemme(u * 0.026, 2.2, 3.6)
  const fussH = e.zeigeFuss ? fsFuss * 1.3 + luecke * 0.5 + 0.3 : 0

  let qr: number
  let kopfB: number
  let kopfH: number
  let fsCode: number
  if (quer) {
    qr = Math.min(ih, iw * 0.42)
    kopfB = iw - qr - luecke
    kopfH = ih
    fsCode = Math.min(kopfB / (len * MONO), ih * 0.24, u * 0.17)
  } else {
    qr = Math.min(iw * 0.5, ih * 0.36)
    kopfB = iw - qr - luecke
    kopfH = qr
    fsCode = Math.min(kopfB / (len * MONO), qr * 0.34)
  }
  const fsBereich = klemme(fsCode * 0.42, 2.5, 6.5)
  const fsTitel = klemme(fsCode * 0.62, 2.8, 10)

  /* Kopf: Nummer, Bereich, Titel. Der Titel bekommt so viele Zeilen, wie er
   * braucht und wie neben dem QR-Code Platz haben. */
  const codeH = fsCode * 1.05
  const bereichH = e.bereich ? fsBereich * 1.3 + luecke * 0.5 : 0
  const titel = (e.titel ?? '').trim()
  let titelZeilen = 0
  if (titel) {
    const gebraucht = Math.max(1, Math.ceil((titel.length * fsTitel * TEXT) / kopfB))
    const frei = kopfH - codeH - bereichH - luecke * 0.5
    const passt = Math.floor(frei / (fsTitel * 1.2))
    titelZeilen = Math.max(0, Math.min(gebraucht, quer ? 2 : 3, passt))
  }
  const titelH = titelZeilen > 0 ? titelZeilen * fsTitel * 1.2 + luecke * 0.5 : 0

  /* Inhaltsfeld: bei Querformat unter dem Titel in der Textspalte, sonst
   * unter dem Kopf ueber die ganze Breite. */
  let inhaltB: number
  let inhaltH: number
  if (quer) {
    inhaltB = kopfB
    inhaltH = ih - codeH - bereichH - titelH - fussH - luecke * 0.5
  } else {
    inhaltB = iw
    inhaltH = ih - qr - luecke - (e.zeigeFuss ? fussH + luecke : 0)
  }
  /* Die Schrift ist die groesste, bei der der ganze Inhalt auf das Feld passt,
   * bevorzugt in einer Spalte und ohne Kuerzen. Gelingt das nicht, zaehlt nur,
   * dass alle Zeilen Platz haben (zwei Spalten, Kuerzen mit "..."). Reicht
   * selbst die kleinste Schrift nicht, kommt "+ n weitere". */
  const fsMin = klemme(u * 0.04, 2.5, 5)
  // Der Inhalt bleibt kleiner als der Titel, damit die Rangfolge stimmt.
  const fsMax = Math.max(fsMin, Math.min(klemme(u * 0.075, 2.5, 8.5), fsTitel * 0.9))
  const n0 = e.inhalt.length
  const laengste = e.inhalt.reduce((m, z) => Math.max(m, z.text.length + (z.menge !== 1 ? 3 : 0)), 0)
  const spaltenWahl = inhaltB >= 110 ? [1, 2] : [1]
  let fsInhalt = fsMin
  let inhaltSpalten = 1
  if (e.zeigeInhalt && n0 > 0) {
    let gefunden = false
    for (const streng of [true, false]) {
      for (let f = fsMax; f >= fsMin && !gefunden; f -= 0.25) {
        for (const sp of spaltenWahl) {
          const spaltenB = (inhaltB - luecke * (sp - 1)) / sp
          const passtZeilen = Math.floor(inhaltH / (f * 1.4)) * sp >= n0
          const passtBreite = !streng || laengste * f * TEXT <= spaltenB
          if (passtZeilen && passtBreite) {
            fsInhalt = f
            inhaltSpalten = sp
            gefunden = true
            break
          }
        }
      }
      if (gefunden) break
    }
    // Nichts passt: kleinste Schrift, so viele Spalten wie moeglich.
    if (!gefunden) inhaltSpalten = spaltenWahl[spaltenWahl.length - 1]
  }
  const zeilenH = fsInhalt * 1.4
  const zeilenProSpalte = e.zeigeInhalt ? Math.max(0, Math.floor(inhaltH / zeilenH)) : 0
  const kapazitaet = zeilenProSpalte * inhaltSpalten
  const n = e.inhalt.length
  let sichtbar = 0
  let weitere = 0
  if (kapazitaet > 0 && n > 0) {
    if (n <= kapazitaet) {
      sichtbar = n
    } else {
      // Eine Zeile bleibt fuer "+ n weitere" frei.
      sichtbar = Math.max(0, kapazitaet - 1)
      weitere = n - sichtbar
    }
  }

  return {
    ...leer,
    qr,
    kopfB,
    fsCode,
    fsBereich,
    fsTitel,
    titelZeilen,
    fsInhalt,
    inhaltB,
    inhaltH,
    inhaltSpalten,
    zeilenProSpalte,
    sichtbar,
    weitere,
    fsFuss,
    fussH,
  }
}

/* ---------------------------------------------------------- Tuer-Etikett */

export interface TuerPlan {
  quer: boolean
  pad: number
  luecke: number
  qr: number
  textB: number
  fsName: number
  fsKopf: number
  fsFuss: number
  nameZeilen: number
}

export function planeTuer(w: number, h: number, name: string, mini: boolean): TuerPlan {
  const pad = klemme(Math.min(w, h) * 0.06, 1.2, 8)
  const luecke = klemme(pad * 1.1, 1, 6)
  const iw = w - 2 * pad
  const ih = h - 2 * pad
  const quer = iw / ih >= 1.3
  const len = Math.max(6, name.length)
  if (quer) {
    const qr = Math.min(ih, iw * (mini ? 0.5 : 0.46))
    const textB = iw - qr - luecke
    const fsName = klemme(Math.min(textB / (Math.min(len, 14) * TEXT), ih * 0.2), 2.6, 16)
    return {
      quer,
      pad,
      luecke,
      qr,
      textB,
      fsName,
      fsKopf: klemme(fsName * 0.62, 2.4, 9),
      fsFuss: klemme(fsName * 0.42, 2.2, 5),
      nameZeilen: Math.max(1, Math.min(3, Math.ceil((len * fsName * TEXT) / textB))),
    }
  }
  const fsName = klemme(Math.min(iw / (Math.min(len, 14) * TEXT), ih * 0.1), 2.6, 16)
  const nameZeilen = Math.max(1, Math.min(2, Math.ceil((len * fsName * TEXT) / iw)))
  const fsKopf = klemme(fsName * 0.62, 2.4, 9)
  const fsFuss = klemme(fsName * 0.42, 2.2, 5)
  const text = nameZeilen * fsName * 1.15 + fsKopf * 1.3 + fsFuss * 1.3 + luecke * 3
  const qr = Math.max(0, Math.min(iw, ih - text))
  return { quer, pad, luecke, qr, textB: iw, fsName, fsKopf, fsFuss, nameZeilen }
}

/* --------------------------------------------------------------- Bogen */

/** Etiketten auf Seiten verteilen. Bei einem Etikett pro Blatt ist jede
 *  Seite eines. */
export function aufSeiten<T>(liste: readonly T[], proSeite: number): T[][] {
  const out: T[][] = []
  const n = Math.max(1, proSeite)
  for (let i = 0; i < liste.length; i += n) out.push(liste.slice(i, i + n))
  return out
}
