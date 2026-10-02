import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type Ref } from 'react'
import { ChevronDown, Map as KarteIcon, Minus, Plus } from 'lucide-react'
import { useSprache } from '../../lib/i18n'
import { initials } from '../../lib/util'
import type { Karte3D, KartenFlaeche, Pose3D, Sprungziel3D } from './vertrag3d'

/* Die Minikarte der Siedlung (E86), unten rechts in der 3D-Ansicht.
 *
 * Eine Ansicht von oben aus Welt3D.karte (Weltmeter, x nach Osten, z nach
 * Sueden, also Norden oben wie ein Plan): Haeuser mit Namen, Wege,
 * Strasse, Garten und Spielplatz. Dazu die eigene Stelle als Pfeil in
 * Blickrichtung und die anderen als Punkte mit Kuerzel; wer auf einem
 * anderen Stockwerk ist, steht blass. Oben steht das Stockwerk.
 *
 * Antippen eines Hauses fuehrt hin (Raum3D waehlt das Sprungziel, siehe
 * sprungImHaus); daneben passiert nichts. Mit Tasten geht es ueber die
 * Haeuser, die ein Ziel haben (Tab, dann Enter).
 *
 * Laeuft neben dem Bild her, ohne Raum3D neu zu zeichnen: die Lage kommt
 * ueber lage() (Refs in Raum3D) und wird hoechstens 5-mal je Sekunde
 * gelesen; neu gezeichnet wird nur die Karte und nur, wenn sich etwas
 * sichtbar bewegt hat. Eingeklappt bleibt nur ein runder Knopf, das merkt
 * sich das Geraet ('kistly.minikarte.zu'). E87: Ist die 3D-Flaeche zu
 * niedrig fuer die Karte (hoeheFrei, quer gehaltenes Handy ohne Vollbild),
 * steht ebenso nur der Knopf da, ohne es zu merken; so deckt sie nicht die
 * Leiste oben zu. Antippen zeigt sie trotzdem.
 *
 * E87: Die Karte kann ein ganzer Stadtteil sein (Tausende Haeuser,
 * Hunderte Strassen). Darum steht alles Feste in wenigen Pfaden, einer je
 * Art (Haeuser, jede Art Flaeche, jede Art und Breite Strasse als Linie
 * mit Breite in Metern), gebaut einmal je Karte (kartenPfade) und
 * gezeichnet in einer eigenen, gemerkten Ebene (KartenGrund, memo). Je
 * Takt bewegen sich nur der eigene Pfeil, die Punkte der anderen und der
 * Ausschnitt. Das zeichnet React nicht neu: React baut die Marken nur,
 * wenn jemand kommt oder geht (KartenMarken, markenGerippe), danach setzt
 * der Takt allein Attribute an den vorhandenen SVG-Elementen (markenSetzen,
 * viewBox), und nur die, die sich geaendert haben (attributSchreiber).
 * Erst eine neue Kachel fuer die Namen zeichnet wieder mit React. Der
 * Hintergrund und das N stehen fest und wandern nicht mit. Drei Stufen:
 * nah (120 m), mittel (400 m),
 * beide folgen einem selbst, Norden bleibt oben; ganz (der ganze Rahmen).
 * Knoepfe + und - wechseln, nur wenn es mehr als eine Stufe gibt (eine
 * Siedlung allein hat nur ganz). Namen von Orten (Geschaefte, Feuerwehr)
 * stehen nur nah und mittel da, und nur in der Naehe des Ausschnitts
 * (neu gesucht, wenn man ein halbes Bild weiter ist).
 *
 * Die Karte wird nie gespiegelt, auch nicht im Arabischen (sie liegt im
 * 3D-Behaelter mit dir=ltr, Norden bleibt oben, Osten rechts). Namen
 * stehen, wie sie gespeichert sind; ihre Schreibrichtung kommt wie bei
 * dir=auto aus dem ersten starken Zeichen (textRichtung), ein arabischer
 * Name laeuft also von rechts nach links und beginnt trotzdem rechts vom
 * Punkt des Orts.
 *
 * Die Rechnungen darunter sind ohne Browser pruefbar
 * (scripts/minikarte-pruefen.mjs). */

type P = [number, number]

/** Wo man steht und wo die anderen stehen; null ohne Begehen. */
export interface MinikarteLage {
  eigene: Pose3D | null
  andere: ReadonlyMap<string, Pose3D>
}

/** Eine Person fuer die Punkte: Name fuer das Kuerzel, Farbe wie die Figur. */
export interface MinikartePerson {
  uid: string
  name: string
  farbe: string
}

/** Hoechstens so oft je Sekunde wird die Lage gelesen. */
export const KARTE_TAKT_MS = 200
/** Schluessel im Speicher des Geraets: '1' heisst eingeklappt. */
export const KARTE_ZU_SCHLUESSEL = 'kistly.minikarte.zu'
/** Augenhoehe im Stehen (wie im Motor), um Stockwerke zu vergleichen. */
const AUGE_M = 1.64
/** Wer mehr als so viel hoeher oder tiefer steht, ist auf einem anderen Stockwerk. */
const STOCKWERK_M = 2
/** Ein Sprungziel gehoert zu einem Haus, wenn es hoechstens so weit vor dem
 *  Umriss liegt (Haustuer, Laubengang). */
export const HAUS_RAND_M = 4
/** Ein Meter Hoehenunterschied wiegt beim Waehlen des Ziels wie so viele
 *  Meter Weg (ein Stockwerk von 3 m also wie 12 m): das eigene Stockwerk
 *  gewinnt fast immer. */
const STOCKWERK_GEWICHT = 4
/** So weit neben einem Haus (in Bildpunkten) zaehlt ein Tippen noch. */
const TREFFER_PX = 10
/** So viel Hoehe (Bildpunkte) braucht die Karte ueber ihre Breite hinaus
 *  (Kopf, Rand, oben das Stockwerk), sonst steht nur der runde Knopf da. */
export const KARTE_EXTRA_PX = 100
/** Breite der Karte in Bildpunkten, bevor sie gemessen ist. */
const PX_START = 160
/** Hoechstens so viele Namen von Orten auf einmal. */
const ORTE_MAX = 40

/* ----------------------------------------------------- reine Rechnungen */

/** Der Ausschnitt der Karte als Quadrat in Weltmetern (x, y = z oben
 *  links, seite) mit etwas Rand. null bei kaputtem oder leerem Rahmen. */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export function kartenAusschnitt(rahmen: readonly number[] | null | undefined): { x: number; y: number; seite: number } | null {
  if (!Array.isArray(rahmen) || rahmen.length !== 4 || !rahmen.every((v) => typeof v === 'number' && Number.isFinite(v))) return null
  const x0 = Math.min(rahmen[0], rahmen[2])
  const x1 = Math.max(rahmen[0], rahmen[2])
  const z0 = Math.min(rahmen[1], rahmen[3])
  const z1 = Math.max(rahmen[1], rahmen[3])
  const roh = Math.max(x1 - x0, z1 - z0)
  if (!(roh >= 1)) return null
  const seite = roh * 1.08
  return { x: (x0 + x1) / 2 - seite / 2, y: (z0 + z1) / 2 - seite / 2, seite }
}

/** Liegt p im Vieleck (gerade-ungerade Regel)? */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export function imPolygon(p: readonly [number, number], poly: readonly (readonly [number, number])[]): boolean {
  let drin = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i]
    const [xj, zj] = poly[j]
    if (zi > p[1] !== zj > p[1] && p[0] < ((xj - xi) * (p[1] - zi)) / (zj - zi) + xi) drin = !drin
  }
  return drin
}

/** Abstand von p zum Umriss in Metern, 0 innen. */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export function abstandZumUmriss(p: readonly [number, number], poly: readonly (readonly [number, number])[]): number {
  if (poly.length === 0) return Infinity
  if (poly.length >= 3 && imPolygon(p, poly)) return 0
  let best = Infinity
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const dx = b[0] - a[0]
    const dz = b[1] - a[1]
    const l2 = dx * dx + dz * dz
    const t = l2 > 0 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2)) : 0
    best = Math.min(best, Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dz)))
  }
  return best
}

function flaeche(poly: readonly (readonly [number, number])[]): number {
  let f = 0
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    f += a[0] * b[1] - b[0] * a[1]
  }
  return Math.abs(f) / 2
}

/** Rechteck um ein Vieleck: x0, z0, x1, z1. Leer: alles NaN. */
function kasten(poly: readonly (readonly [number, number])[]): [number, number, number, number] {
  let x0 = Infinity
  let z0 = Infinity
  let x1 = -Infinity
  let z1 = -Infinity
  for (const q of poly) {
    if (q[0] < x0) x0 = q[0]
    if (q[0] > x1) x1 = q[0]
    if (q[1] < z0) z0 = q[1]
    if (q[1] > z1) z1 = q[1]
  }
  return poly.length > 0 ? [x0, z0, x1, z1] : [NaN, NaN, NaN, NaN]
}

const brauchbar = (h: { punkte?: unknown }): h is { punkte: [number, number][] } => Array.isArray(h.punkte) && h.punkte.length >= 3

/** Welches Haus liegt an der Stelle p (Weltmeter)? Erst eines, in dem p
 *  liegt (bei mehreren das kleinste), sonst das naechste bis toleranz
 *  Meter daneben. null: keines. Haeuser, deren Rechteck weiter weg ist,
 *  werden gar nicht erst genau gerechnet (Tausende Haeuser, E87). */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export function hausAn(karte: Karte3D, p: readonly [number, number], toleranz: number): number | null {
  let drin = -1
  let drinFlaeche = Infinity
  let nah = -1
  let nahAbstand = Infinity
  for (let i = 0; i < karte.haeuser.length; i++) {
    const h = karte.haeuser[i]
    if (!brauchbar(h)) continue
    const k = kasten(h.punkte)
    if (p[0] < k[0] - toleranz || p[0] > k[2] + toleranz || p[1] < k[1] - toleranz || p[1] > k[3] + toleranz) continue
    const a = abstandZumUmriss(p, h.punkte)
    if (a === 0) {
      const f = flaeche(h.punkte)
      if (f < drinFlaeche) {
        drin = i
        drinFlaeche = f
      }
    } else if (a <= toleranz && a < nahAbstand) {
      nah = i
      nahAbstand = a
    }
  }
  if (drin >= 0) return drin
  return nah >= 0 ? nah : null
}

/** Das Sprungziel fuer ein angetipptes Haus: eines, das im Umriss oder
 *  bis HAUS_RAND_M davor liegt, moeglichst auf dem eigenen Stockwerk und
 *  nah an der Stelle p. augeY: eigene Augenhoehe in der Welt (beim
 *  Begehen), sonst null, dann zaehlt das unterste Stockwerk. ebenenY: Boden
 *  jeder Ebene der Welt (Index wie Sprungziel3D.ebene). Ein Stockwerk
 *  Unterschied wiegt wie 12 m Weg. null: das Haus hat kein Ziel. */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export function sprungImHaus(
  haus: readonly (readonly [number, number])[],
  ziele: readonly Sprungziel3D[],
  ebenenY: readonly number[],
  p: readonly [number, number],
  augeY: number | null,
): number | null {
  const kandidaten: { i: number; y: number; weg: number }[] = []
  ziele.forEach((z, i) => {
    const y = ebenenY[z.ebene]
    if (!Number.isFinite(z.x) || !Number.isFinite(z.z) || typeof y !== 'number' || !Number.isFinite(y)) return
    if (abstandZumUmriss([z.x, z.z], haus) > HAUS_RAND_M) return
    kandidaten.push({ i, y, weg: Math.hypot(z.x - p[0], z.z - p[1]) })
  })
  if (kandidaten.length === 0) return null
  const bezug = augeY !== null && Number.isFinite(augeY) ? augeY : Math.min(...kandidaten.map((k) => k.y)) + AUGE_M
  let best = kandidaten[0]
  let bestWert = Infinity
  for (const k of kandidaten) {
    const wert = k.weg + STOCKWERK_GEWICHT * Math.abs(k.y + AUGE_M - bezug)
    if (wert < bestWert - 1e-9) {
      best = k
      bestWert = wert
    }
  }
  return best.i
}

/** Je Haus der Karte: hat es ein Sprungziel (im Umriss oder bis
 *  HAUS_RAND_M davor)? Wie vorher je Haus und Ziel abstandZumUmriss, aber
 *  erst ueber ein Gitter der Ziele, damit Tausende Haeuser mal Hunderte
 *  Ziele schnell bleiben (E87). */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export function springbarBerechnen(haeuser: Karte3D['haeuser'], ziele: readonly Sprungziel3D[]): boolean[] {
  const ZELLE = 32
  const gitter = new Map<string, [number, number][]>()
  for (const z of ziele) {
    if (!Number.isFinite(z.x) || !Number.isFinite(z.z)) continue
    const s = `${Math.floor(z.x / ZELLE)}|${Math.floor(z.z / ZELLE)}`
    const liste = gitter.get(s)
    if (liste) liste.push([z.x, z.z])
    else gitter.set(s, [[z.x, z.z]])
  }
  return haeuser.map((h) => {
    if (!Array.isArray(h.punkte) || h.punkte.length === 0) return false
    const k = kasten(h.punkte)
    if (!k.every(Number.isFinite)) return false
    const i0 = Math.floor((k[0] - HAUS_RAND_M) / ZELLE)
    const i1 = Math.floor((k[2] + HAUS_RAND_M) / ZELLE)
    const j0 = Math.floor((k[1] - HAUS_RAND_M) / ZELLE)
    const j1 = Math.floor((k[3] + HAUS_RAND_M) / ZELLE)
    // Riesige Umrisse (kaputte Daten): lieber ohne Gitter.
    if ((i1 - i0 + 1) * (j1 - j0 + 1) > 400) return ziele.some((z) => abstandZumUmriss([z.x, z.z], h.punkte) <= HAUS_RAND_M)
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const liste = gitter.get(`${i}|${j}`)
        if (liste && liste.some((q) => abstandZumUmriss(q, h.punkte) <= HAUS_RAND_M)) return true
      }
    }
    return false
  })
}

/** Drehung des Pfeils in Grad (SVG, im Uhrzeigersinn) fuer die
 *  Blickrichtung gier (0 = nach -z, also nach Norden, oben). */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export function pfeilGrad(gier: number): number {
  if (!Number.isFinite(gier)) return 0
  const g = (-gier * 180) / Math.PI
  return Math.round((((g % 360) + 540) % 360) - 180)
}

/** Was die Karte zeichnet, gerundet: neu gezeichnet wird nur, wenn sich
 *  schluessel aendert (10 cm, 5 Grad, Stockwerk). mitte: wohin nah und
 *  mittel schauen, die eigene Stelle oder (ohne Begehen) die zuletzt
 *  bekannte (E87). */
export interface KartenStand {
  ich: { x: number; z: number; grad: number } | null
  andere: { uid: string; x: number; z: number; blass: boolean }[]
  mitte: { x: number; z: number } | null
  schluessel: string
}

// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export function kartenStand(lage: MinikarteLage, mitteVorher: { x: number; z: number } | null = null): KartenStand {
  const r = (v: number) => Math.round(v * 10) / 10
  const e = lage.eigene
  const ich = e && Number.isFinite(e.x) && Number.isFinite(e.z) ? { x: r(e.x), z: r(e.z), grad: Math.round(pfeilGrad(e.gier) / 5) * 5 } : null
  const andere: KartenStand['andere'] = []
  for (const [uid, p] of lage.andere) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) continue
    const blass = !!e && Number.isFinite(e.y) && Number.isFinite(p.y) && Math.abs(p.y - e.y) > STOCKWERK_M
    andere.push({ uid, x: r(p.x), z: r(p.z), blass })
  }
  andere.sort((a, b) => (a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0))
  const schluessel = JSON.stringify([ich, andere])
  return { ich, andere, mitte: ich ? { x: ich.x, z: ich.z } : mitteVorher, schluessel }
}

/* ------------------------------------------------- E87: Stufen, Ansicht */

/** Stufen der Karte: nah und mittel folgen einem selbst (Norden oben),
 *  ganz zeigt den ganzen Rahmen. */
export type KartenZoom = 'nah' | 'mittel' | 'ganz'
/** Seite des Ausschnitts in Metern bei nah und mittel. */
// eslint-disable-next-line react/only-export-components -- reine Zahl, eigene Pruefung
export const ZOOM_SEITE_M = { nah: 120, mittel: 400 } as const
const ZOOM_REIHE: readonly KartenZoom[] = ['nah', 'mittel', 'ganz']

/** Die Stufen, die bei einem ganzen Ausschnitt dieser Seite (Meter) Sinn
 *  haben, von nah nach ganz: nah und mittel nur, wenn sie deutlich
 *  kleiner sind als das Ganze. Kaputte Seite: nur ganz. */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export function zoomStufen(ganzSeite: number): KartenZoom[] {
  if (!(ganzSeite > 0) || !Number.isFinite(ganzSeite)) return ['ganz']
  return ZOOM_REIHE.filter((z) => z === 'ganz' || ZOOM_SEITE_M[z] * 1.25 < ganzSeite)
}

/** Womit die Karte anfaengt: mittel, wenn es das gibt (Stadtteil), sonst ganz. */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export function zoomStart(stufen: readonly KartenZoom[]): KartenZoom {
  return stufen.includes('mittel') ? 'mittel' : 'ganz'
}

/** Eine Stufe naeher (richtung 1, Knopf +) oder weiter weg (-1, Knopf -).
 *  Am Ende bleibt es; eine unbekannte Stufe beginnt bei zoomStart. */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export function zoomSchritt(stufen: readonly KartenZoom[], jetzt: KartenZoom, richtung: 1 | -1): KartenZoom {
  const i = stufen.indexOf(jetzt)
  if (i < 0) return zoomStart(stufen)
  return stufen[Math.max(0, Math.min(stufen.length - 1, i - richtung))]
}

/** Ein quadratischer Ausschnitt in Weltmetern (x, y = z oben links). */
export interface KartenAnsicht {
  x: number
  y: number
  seite: number
}

/** Der Ausschnitt fuer eine Stufe: ganz wie kartenAusschnitt, nah und
 *  mittel um mitte herum (ohne mitte: um die Mitte des Ganzen). */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export function kartenAnsicht(zoom: KartenZoom, ganz: KartenAnsicht, mitte: { x: number; z: number } | null): KartenAnsicht {
  if (zoom === 'ganz') return ganz
  const seite = ZOOM_SEITE_M[zoom]
  const m = mitte && Number.isFinite(mitte.x) && Number.isFinite(mitte.z) ? mitte : { x: ganz.x + ganz.seite / 2, z: ganz.y + ganz.seite / 2 }
  return { x: m.x - seite / 2, y: m.z - seite / 2, seite }
}

/** Die Kachel, in der die Mitte eines Ausschnitts liegt (Kantenlaenge eine
 *  halbe Seite), als Schluessel: Namen werden erst neu gesucht, wenn er
 *  sich aendert. */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export function kachelSchluessel(a: KartenAnsicht): string {
  const h = a.seite / 2
  return `${a.seite}|${Math.floor((a.x + h) / h)}|${Math.floor((a.y + h) / h)}`
}

/** Das Fenster zu einem Kachelschluessel: doppelt so gross wie der
 *  Ausschnitt, um die Mitte der Kachel. Solange die Mitte des Ausschnitts
 *  in der Kachel bleibt, liegt er ganz im Fenster. */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export function kachelFenster(schluessel: string): KartenAnsicht | null {
  const [s, kx, kz] = schluessel.split('|').map(Number)
  if (![s, kx, kz].every(Number.isFinite) || !(s > 0)) return null
  const h = s / 2
  return { x: (kx + 0.5) * h - s, y: (kz + 0.5) * h - s, seite: 2 * s }
}

/** Zahl fuer einen Pfad: auf 10 cm, ohne unnoetige Stellen. */
function zahl(v: number): string {
  return String(Math.round(v * 10) / 10)
}

function ringPfad(poly: readonly (readonly [number, number])[], zu: boolean): string {
  let d = ''
  for (let i = 0; i < poly.length; i++) d += `${i === 0 ? 'M' : 'L'}${zahl(poly[i][0])} ${zahl(poly[i][1])}`
  return zu ? `${d}Z` : d
}

const punkteOk = (l: unknown, min: number): l is [number, number][] =>
  Array.isArray(l) && l.length >= min && l.every((q) => Array.isArray(q) && q.length === 2 && Number.isFinite(q[0]) && Number.isFinite(q[1]))

export type StrassenArt = NonNullable<Karte3D['strassen']>[number]['art']

/** Alles Feste der Karte als wenige Pfade (SVG d): eine Flaeche je Art,
 *  Strassen je Art und Breite (auf 0,5 m), alle Haeuser in einem. Kaputte
 *  Umrisse und Linien fallen weg. Einmal je Karte gerechnet. */
export interface KartenPfade {
  flaechen: { art: KartenFlaeche; d: string }[]
  strassen: { art: StrassenArt; breite: number; d: string }[]
  haeuser: string
  /** Zahl der Haeuser im Pfad (fuer Pruefung und Hinweise). */
  hausZahl: number
}

/** Reihenfolge der Flaechen beim Zeichnen: Grosses unten, Wege oben. */
const FLAECHE_REIHE: readonly KartenFlaeche[] = ['wald', 'wiese', 'acker', 'garten', 'gewerbe', 'sport', 'parkplatz', 'wasser', 'spielplatz', 'weg', 'strasse']
const STRASSE_REIHE: readonly StrassenArt[] = ['wasser', 'gleis', 'fuss', 'neben', 'haupt']

// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export function kartenPfade(karte: Karte3D): KartenPfade {
  const flaechenNach = new Map<KartenFlaeche, string[]>()
  for (const f of karte.flaechen ?? []) {
    if (!f || !punkteOk(f.punkte, 3)) continue
    const liste = flaechenNach.get(f.art) ?? []
    liste.push(ringPfad(f.punkte, true))
    flaechenNach.set(f.art, liste)
  }
  const flaechen: KartenPfade['flaechen'] = []
  const arten = [...FLAECHE_REIHE, ...[...flaechenNach.keys()].filter((a) => !FLAECHE_REIHE.includes(a))]
  for (const art of arten) {
    const liste = flaechenNach.get(art)
    if (liste) flaechen.push({ art, d: liste.join('') })
  }
  const strassenNach = new Map<string, { art: StrassenArt; breite: number; teile: string[] }>()
  for (const s of karte.strassen ?? []) {
    if (!s || !punkteOk(s.punkte, 2) || !STRASSE_REIHE.includes(s.art)) continue
    const breite = Number.isFinite(s.breite) && s.breite > 0 ? Math.max(0.5, Math.round(s.breite * 2) / 2) : 3
    const schluessel = `${s.art}|${breite}`
    const g = strassenNach.get(schluessel) ?? { art: s.art, breite, teile: [] }
    g.teile.push(ringPfad(s.punkte, false))
    strassenNach.set(schluessel, g)
  }
  const strassen = [...strassenNach.values()]
    .sort((a, b) => STRASSE_REIHE.indexOf(a.art) - STRASSE_REIHE.indexOf(b.art) || a.breite - b.breite)
    .map((g) => ({ art: g.art, breite: g.breite, d: g.teile.join('') }))
  const teile: string[] = []
  for (const h of karte.haeuser) if (h && punkteOk(h.punkte, 3)) teile.push(ringPfad(h.punkte, true))
  return { flaechen, strassen, haeuser: teile.join(''), hausZahl: teile.length }
}

/** Je Haus einmal gerechnet: Mitte und Breite (fuer Namen). */
interface HausInfo {
  mitte: P
  breite: number
}

function hausInfos(karte: Karte3D): (HausInfo | null)[] {
  return karte.haeuser.map((h) => {
    if (!h || !punkteOk(h.punkte, 3)) return null
    return { mitte: mitteVon(h.punkte), breite: breiteVon(h.punkte) }
  })
}

/** Ein Name auf der Karte. */
export interface KartenName {
  text: string
  x: number
  z: number
  art: 'haus' | 'ort'
  /** Der Text hat Platz (sonst steht beim Ort nur der Punkt). */
  mitText: boolean
  /** Schreibrichtung des Namens (textRichtung, wie dir=auto). */
  richtung: 'ltr' | 'rtl'
}

/** Schreibrichtung eines Namens wie bei dir=auto: das erste stark
 *  gerichtete Zeichen entscheidet. Arabisch, Hebraeisch und Verwandte
 *  laufen von rechts nach links, andere Buchstaben von links nach rechts,
 *  ohne Buchstaben (nur Zahlen und Zeichen) links nach rechts. Fuer SVG,
 *  das dir=auto nicht kennt. */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export function textRichtung(text: string): 'ltr' | 'rtl' {
  for (const z of text) {
    const c = z.codePointAt(0) ?? 0
    if ((c >= 0x0590 && c <= 0x08ff) || (c >= 0xfb1d && c <= 0xfdff) || (c >= 0xfe70 && c <= 0xfeff) || (c >= 0x10800 && c <= 0x10fff) || (c >= 0x1e800 && c <= 0x1efff)) return 'rtl'
    if (/\p{L}/u.test(z)) return 'ltr'
  }
  return 'ltr'
}

/** Welche Namen die Karte zeigt: Haeuser, deren Name ungefaehr ueber das
 *  Haus passt (u: Meter je Bildpunkt), und, nur nah und mittel, die Orte
 *  (hoechstens ORTE_MAX, ohne die, die schon als Haus dastehen). fenster:
 *  nur dort (nah und mittel), null: ueberall (ganz). Kein Text liegt auf
 *  einem anderen: wer keinen Platz mehr hat, faellt weg (Haus) oder steht
 *  nur als Punkt da (Ort). */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export function kartenNamen(karte: Karte3D, zoom: KartenZoom, fenster: KartenAnsicht | null, u: number): KartenName[] {
  const infos = hausInfos(karte)
  return namenAus(karte, infos, zoom, fenster, u)
}

function namenAus(karte: Karte3D, infos: readonly (HausInfo | null)[], zoom: KartenZoom, fenster: KartenAnsicht | null, u: number): KartenName[] {
  const drin = (x: number, z: number) => !fenster || (x >= fenster.x && x <= fenster.x + fenster.seite && z >= fenster.y && z <= fenster.y + fenster.seite)
  const out: KartenName[] = []
  // Schon beschriftete Flaechen in Metern (x0, z0, x1, z1).
  const belegt: [number, number, number, number][] = []
  const frei = (x0: number, z0: number, x1: number, z1: number) => {
    for (const b of belegt) if (x0 < b[2] && b[0] < x1 && z0 < b[3] && b[1] < z1) return false
    belegt.push([x0, z0, x1, z1])
    return true
  }
  const hoch = 10 * u
  karte.haeuser.forEach((h, i) => {
    const info = infos[i]
    if (!info || typeof h.name !== 'string' || !h.name) return
    if (!drin(info.mitte[0], info.mitte[1])) return
    if (h.name.length * 5.2 > (info.breite / Math.max(u, 1e-6)) * 1.4) return
    const w = h.name.length * 5.2 * u
    if (!frei(info.mitte[0] - w / 2, info.mitte[1] - hoch / 2, info.mitte[0] + w / 2, info.mitte[1] + hoch / 2)) return
    out.push({ text: h.name, x: info.mitte[0], z: info.mitte[1], art: 'haus', mitText: true, richtung: textRichtung(h.name) })
  })
  if (zoom !== 'ganz' && Array.isArray(karte.orte)) {
    let n = 0
    for (const o of karte.orte) {
      if (n >= ORTE_MAX) break
      if (!o || typeof o.name !== 'string' || !o.name || !Number.isFinite(o.x) || !Number.isFinite(o.z) || !drin(o.x, o.z)) continue
      if (out.some((q) => q.art === 'haus' && q.text === o.name && Math.hypot(q.x - o.x, q.z - o.z) < 30)) continue
      const text = o.name.length > 28 ? `${o.name.slice(0, 27)}…` : o.name
      const mitText = frei(o.x - 2.2 * u, o.z - hoch / 2, o.x + 4 * u + text.length * 4.9 * u, o.z + hoch / 2)
      out.push({ text, x: o.x, z: o.z, art: 'ort', mitText, richtung: textRichtung(text) })
      n++
    }
  }
  return out
}

/** Eingeklappt? Ohne Speicher (privates Fenster): offen. */
function zuLesen(): boolean {
  try {
    return localStorage.getItem(KARTE_ZU_SCHLUESSEL) === '1'
  } catch {
    return false
  }
}

function zuMerken(zu: boolean) {
  try {
    if (zu) localStorage.setItem(KARTE_ZU_SCHLUESSEL, '1')
    else localStorage.removeItem(KARTE_ZU_SCHLUESSEL)
  } catch {
    /* ohne Speicher gilt es bis zum Neuladen */
  }
}

const FLAECHE_FARBE: Record<KartenFlaeche, { fill: string; opacity: number }> = {
  garten: { fill: 'var(--ok)', opacity: 0.16 },
  weg: { fill: 'var(--plan-boden)', opacity: 1 },
  strasse: { fill: 'var(--plan-linie)', opacity: 0.85 },
  spielplatz: { fill: 'var(--plan-strom)', opacity: 0.35 },
  // E87: Flaechen der Stadt.
  wiese: { fill: 'var(--ok)', opacity: 0.12 },
  wald: { fill: 'var(--ok)', opacity: 0.3 },
  acker: { fill: 'var(--warn)', opacity: 0.12 },
  wasser: { fill: 'var(--plan-fenster)', opacity: 0.55 },
  parkplatz: { fill: 'var(--plan-linie)', opacity: 0.25 },
  sport: { fill: 'var(--ok)', opacity: 0.22 },
  gewerbe: { fill: 'var(--plan-linie)', opacity: 0.08 },
}

/** Strassen (E87): Farbe, Deckkraft und mindestens so viele Bildpunkte
 *  breit, damit auch schmale Wege bei ganz noch zu sehen sind. */
const STRASSE_STIL: Record<StrassenArt, { stroke: string; opacity: number; minPx: number; strich?: [number, number] }> = {
  haupt: { stroke: 'var(--plan-linie)', opacity: 0.85, minPx: 2 },
  neben: { stroke: 'var(--plan-linie)', opacity: 0.6, minPx: 1.2 },
  fuss: { stroke: 'var(--muted)', opacity: 0.35, minPx: 0.8 },
  gleis: { stroke: 'var(--muted)', opacity: 0.7, minPx: 1, strich: [4, 3] },
  wasser: { stroke: 'var(--plan-fenster)', opacity: 0.6, minPx: 1.2 },
}

/* ------------------------------------------------------------ Ansicht */

/** Das Feste der Karte (E87): Flaechen, Strassen, Haeuser. Gemerkt
 *  (memo): zeichnet nur neu, wenn sich die Karte oder die Stufe (u)
 *  aendert, nicht je Takt. Die Umrisse der Haeuser bleiben bei jeder
 *  Stufe gleich duenn (non-scaling-stroke). */
const KartenGrund = memo(function KartenGrund({ pfade, u }: { pfade: KartenPfade; u: number }) {
  return (
    <g pointerEvents="none" data-grund="">
      {pfade.flaechen.map((f) => (
        <path key={`f-${f.art}`} data-flaeche={f.art} d={f.d} fill={FLAECHE_FARBE[f.art]?.fill ?? 'var(--plan-boden)'} fillOpacity={FLAECHE_FARBE[f.art]?.opacity ?? 1} />
      ))}
      {pfade.strassen.map((s) => {
        const stil = STRASSE_STIL[s.art]
        return (
          <path
            key={`s-${s.art}-${s.breite}`}
            data-strasse={s.art}
            d={s.d}
            fill="none"
            stroke={stil.stroke}
            strokeOpacity={stil.opacity}
            strokeWidth={Math.max(s.breite, stil.minPx * u)}
            strokeLinecap={stil.strich ? 'butt' : 'round'}
            strokeLinejoin="round"
            strokeDasharray={stil.strich ? `${stil.strich[0] * u} ${stil.strich[1] * u}` : undefined}
          />
        )
      })}
      {pfade.haeuser ? (
        <path
          data-haeuser={pfade.hausZahl}
          d={pfade.haeuser}
          fill="var(--plan-wand-3d)"
          stroke="var(--plan-objekt-rand)"
          strokeWidth={1.2}
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        />
      ) : null}
    </g>
  )
})

/** Namen (Haeuser, Orte), gemerkt: neu nur mit neuer Kachel oder Stufe.
 *  Erst alle Punkte der Orte, dann die Texte darueber (mit Rand in der
 *  Farbe der Flaeche), damit kein Punkt mitten in einem Namen liegt. Jeder
 *  Name in seiner Richtung (textRichtung); der Name eines Orts beginnt
 *  immer rechts vom Punkt (von rechts nach links mit dem Ende dort). */
const KartenNamen = memo(function KartenNamen({ namen, u }: { namen: KartenName[]; u: number }) {
  return (
    <g pointerEvents="none" data-namen="">
      {namen.map((n, i) =>
        n.art === 'ort' ? (
          <circle key={`p${i}`} data-ort="" cx={n.x} cy={n.z} r={2.2 * u} fill="var(--plan-hervor)" stroke="var(--surface)" strokeWidth={0.8 * u}>
            <title>{n.text}</title>
          </circle>
        ) : null,
      )}
      {namen.map((n, i) =>
        !n.mitText ? null : n.art === 'ort' ? (
          <text
            key={`o${i}`}
            x={n.x + 4 * u}
            y={n.z}
            fontSize={8.5 * u}
            fontWeight={700}
            direction={n.richtung}
            textAnchor={n.richtung === 'rtl' ? 'end' : 'start'}
            dominantBaseline="central"
            fill="var(--ink)"
            stroke="var(--surface)"
            strokeWidth={2.2 * u}
            paintOrder="stroke"
          >
            {n.text}
          </text>
        ) : (
          <text
            key={`h${i}`}
            x={n.x}
            y={n.z}
            fontSize={9 * u}
            fontWeight={700}
            direction={n.richtung}
            textAnchor="middle"
            dominantBaseline="central"
            fill="var(--ink)"
            stroke="var(--surface)"
            strokeWidth={2.4 * u}
            paintOrder="stroke"
          >
            {n.text}
          </text>
        ),
      )}
    </g>
  )
})

/** Haeuser mit Ziel als Knoepfe fuer Tasten (Tab, Enter), unsichtbar
 *  ueber dem gezeichneten Pfad. Gemerkt: neu nur mit neuer Karte, neuer
 *  Liste der Ziele oder neuer Sprache. */
const HausKnoepfe = memo(function HausKnoepfe({
  karte,
  springbar,
  name,
  onWahl,
  onFokus,
}: {
  karte: Karte3D
  springbar?: readonly boolean[]
  name: (i: number) => string
  onWahl: (i: number) => void
  onFokus: (i: number, an: boolean) => void
}) {
  return (
    <g data-hausknoepfe="">
      {karte.haeuser.map((h, i) => {
        if (!brauchbar(h)) return null
        if (springbar && springbar[i] !== true) return null
        return (
          <polygon
            key={`h${i}`}
            data-haus={i}
            points={punkteText(h.punkte)}
            fill="transparent"
            pointerEvents="none"
            role="button"
            tabIndex={0}
            aria-label={name(i)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return
              e.preventDefault()
              e.stopPropagation()
              onWahl(i)
            }}
            onFocus={() => onFokus(i, true)}
            onBlur={() => onFokus(i, false)}
            className="outline-none"
          />
        )
      })}
    </g>
  )
})

const punkteText = (poly: readonly (readonly [number, number])[]) => poly.map((q) => `${q[0]},${q[1]}`).join(' ')

/* ------------------------------------- E87: Marken je Takt ohne React */

/** Transform des eigenen Pfeils: an die Stelle, in Blickrichtung, und so
 *  gross, dass er in jeder Stufe gleich viele Bildpunkte hat (u: Meter je
 *  Bildpunkt). Eine Stelle fuer React und den Takt. */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export function ichTransform(ich: NonNullable<KartenStand['ich']>, u: number): string {
  return `translate(${ich.x} ${ich.z}) rotate(${ich.grad}) scale(${u})`
}

/** Transform des Punkts einer Person, wie ichTransform ohne Drehung. */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export function personTransform(a: KartenStand['andere'][number], u: number): string {
  return `translate(${a.x} ${a.z}) scale(${u})`
}

/** Deckkraft des Punkts: blass auf einem anderen Stockwerk. */
const personDeckkraft = (a: KartenStand['andere'][number]) => (a.blass ? '0.45' : '1')

/** Was React an Marken baut: ob der eigene Pfeil da ist und wer als Punkt.
 *  Aendert es sich (jemand kommt, geht, man beginnt zu gehen), zeichnet
 *  React die Marken neu; sonst setzt der Takt nur Attribute. */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export function markenGerippe(stand: KartenStand): string {
  let s = stand.ich ? 'ich' : '-'
  for (const a of stand.andere) s += `|${a.uid}`
  return s
}

/** Ein Element, an dem der Takt Attribute setzt (im Browser ein SVG-Element). */
export interface MarkenElement {
  setAttribute(name: string, wert: string): void
}

/** Setzt ein Attribut, aber nur, wenn es sich seit dem letzten Mal
 *  geaendert hat (je Element und Name). vergessen(): beim naechsten Mal
 *  alles schreiben (nachdem React gezeichnet hat). zahl(): so viele
 *  Attribute wurden bisher wirklich geschrieben. */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export function attributSchreiber(): {
  schreiben(el: MarkenElement, name: string, wert: string): void
  vergessen(): void
  zahl(): number
} {
  let alt = new Map<MarkenElement, Map<string, string>>()
  let n = 0
  return {
    schreiben(el, name, wert) {
      let je = alt.get(el)
      if (!je) {
        je = new Map()
        alt.set(el, je)
      }
      if (je.get(name) === wert) return
      je.set(name, wert)
      el.setAttribute(name, wert)
      n++
    },
    vergessen() {
      alt = new Map()
    },
    zahl: () => n,
  }
}

/** Die Elemente der Marken, die React gebaut hat: der eigene Pfeil (oder
 *  null) und die Punkte je Kennung. */
export interface MarkenZiel {
  ich: MarkenElement | null
  andere: ReadonlyMap<string, MarkenElement>
}

/** Der Takt (E87): bringt Pfeil und Punkte an ihre Stelle, nur ueber
 *  Attribute (transform, opacity). Wer kein Element hat (React baut es
 *  gleich), bleibt aus. Haengt nicht an der Zahl der Haeuser. */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export function markenSetzen(ziel: MarkenZiel, stand: KartenStand, u: number, schreiben: (el: MarkenElement, name: string, wert: string) => void): void {
  if (ziel.ich && stand.ich) schreiben(ziel.ich, 'transform', ichTransform(stand.ich, u))
  for (const a of stand.andere) {
    const el = ziel.andere.get(a.uid)
    if (!el) continue
    schreiben(el, 'transform', personTransform(a, u))
    schreiben(el, 'opacity', personDeckkraft(a))
  }
}

/** Die Marken als SVG (E87): die anderen als Punkte mit Kuerzel (anderes
 *  Stockwerk blass) und der eigene Pfeil, je in einer Gruppe um den
 *  Ursprung, die der Takt nur verschiebt (markenSetzen). Gemerkt: React
 *  zeichnet sie nur neu, wenn sich markenGerippe, die Leute, die Stufe (u)
 *  oder die Sprache aendern. */
export const KartenMarken = memo(function KartenMarken({
  stand,
  leuteNach,
  u,
  duText,
  gruppe,
}: {
  stand: KartenStand
  leuteNach: ReadonlyMap<string, MinikartePerson>
  u: number
  duText: string
  /** Die Gruppe aller Marken, fuer den Takt. */
  gruppe?: Ref<SVGGElement>
}) {
  return (
    <g ref={gruppe} pointerEvents="none" data-marken="">
      {stand.andere.map((a) => {
        const wer = leuteNach.get(a.uid)
        return (
          <g key={a.uid} data-person={a.uid} transform={personTransform(a, u)} opacity={personDeckkraft(a)}>
            <circle r={8} fill={wer?.farbe ?? 'var(--muted)'} stroke="var(--surface)" strokeWidth={1.5} />
            <text fontSize={7.5} fontWeight={800} textAnchor="middle" dominantBaseline="central" fill="#ffffff">
              {initials(wer?.name, '?').slice(0, 2)}
            </text>
            <title>{wer?.name || '?'}</title>
          </g>
        )
      })}
      {stand.ich ? (
        <g data-ich="" transform={ichTransform(stand.ich, u)}>
          <path d="M0,-10 L7,8 L0,4 L-7,8 Z" fill="var(--plan-hervor)" stroke="var(--surface)" strokeWidth={1.6} strokeLinejoin="round" />
          <title>{duText}</title>
        </g>
      ) : null}
    </g>
  )
})

/** Die Elemente der Marken in einer gebauten Gruppe (nach jedem Zeichnen
 *  durch React neu gelesen). */
function markenZielAus(g: SVGGElement | null): MarkenZiel {
  const andere = new Map<string, MarkenElement>()
  if (!g) return { ich: null, andere }
  for (const el of Array.from(g.querySelectorAll('[data-person]'))) {
    const uid = el.getAttribute('data-person')
    if (uid) andere.set(uid, el)
  }
  return { ich: g.querySelector('[data-ich]'), andere }
}

export interface MinikarteProps {
  karte: Karte3D
  /** Liest die Lage (Refs); hoechstens alle KARTE_TAKT_MS gerufen. */
  lage: () => MinikarteLage
  /** Namen und Farben der anderen (fehlt jemand: '?' und grau). */
  leute: MinikartePerson[]
  /** Stockwerk beim Begehen (Name der Ebene), sonst null. */
  ebene: string | null
  /** Haeuser (Index in karte.haeuser) mit einem Ziel: nur sie sind mit
   *  Tasten erreichbar. Fehlt es, gelten alle. */
  springbar?: readonly boolean[]
  /** Ein Haus wurde angetippt, an der Stelle x, z (Weltmeter). */
  onHaus: (haus: number, x: number, z: number) => void
  /** E87: freie Hoehe der 3D-Flaeche in Bildpunkten. Reicht sie nicht fuer
   *  die Karte (quer gehaltenes Handy ohne Vollbild), steht nur der runde
   *  Knopf da, ohne es zu merken; Antippen zeigt sie trotzdem. Fehlt: Platz. */
  hoeheFrei?: number
}

/** Die Karte fuellt die Breite ihres Behaelters (Raum3D gibt sie vor:
 *  132 px am Handy, breiter ab sm und lg, quer am Handy immer 132 px). */
export default function Minikarte({ karte, lage, leute, ebene, springbar, onHaus, hoeheFrei }: MinikarteProps) {
  const { t } = useSprache()
  const [zu, setZu] = useState(zuLesen)
  // Zu wenig Hoehe: eingeklappt, bis man sie trotzdem aufmacht (E87).
  const [trotzdem, setTrotzdem] = useState(false)
  // Breite der Karte in Bildpunkten (gemessen, siehe unten).
  const [px, setPx] = useState(PX_START)
  const eng = !trotzdem && typeof hoeheFrei === 'number' && hoeheFrei < px + KARTE_EXTRA_PX
  const zeigt = !zu && !eng
  const ganz = useMemo(() => kartenAusschnitt(karte.rahmen), [karte])
  const pfade = useMemo(() => kartenPfade(karte), [karte])
  const infos = useMemo(() => hausInfos(karte), [karte])
  const lageRef = useRef(lage)
  useEffect(() => {
    lageRef.current = lage
  })
  // E87: stand ist die Lage, mit der React zuletzt gezeichnet hat; neu
  // gesetzt nur, wenn jemand kommt oder geht oder eine neue Kachel fuer die
  // Namen dran ist. Die juengste Lage schreibt der Takt nach standRef und
  // setzt danach nur Attribute (taktRef).
  const [stand, setStand] = useState<KartenStand>(() => kartenStand(lage()))
  const standRef = useRef(stand)
  const taktRef = useRef<() => void>(() => {})
  useEffect(() => {
    if (!zeigt) return
    const uhr = window.setInterval(() => {
      if (document.hidden) return
      const neu = kartenStand(lageRef.current(), standRef.current.mitte)
      if (neu.schluessel === standRef.current.schluessel) return
      standRef.current = neu
      taktRef.current()
    }, KARTE_TAKT_MS)
    return () => window.clearInterval(uhr)
  }, [zeigt])

  // Breite in Bildpunkten: Schrift, Punkte und Tippen bleiben gleich gross,
  // egal wie gross der Ausschnitt ist.
  const flaecheRef = useRef<SVGSVGElement>(null)
  const markenRef = useRef<SVGGElement>(null)
  const [schreiber] = useState(attributSchreiber)
  useEffect(() => {
    const el = flaecheRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      const w = el.getBoundingClientRect().width
      if (w > 0) setPx(Math.round(w))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [zeigt])

  useEffect(() => {
    if (!ganz) console.warn('[minikarte] Rahmen der Karte unbrauchbar, Karte bleibt weg')
  }, [ganz])

  // Stufe (E87): gewaehlt oder der Anfang (mittel im Stadtteil, sonst ganz).
  const stufen = useMemo(() => zoomStufen(ganz?.seite ?? 0), [ganz])
  const [zoomWahl, setZoomWahl] = useState<KartenZoom | null>(null)
  const zoom: KartenZoom = zoomWahl && stufen.includes(zoomWahl) ? zoomWahl : zoomStart(stufen)
  // Ohne eigene Stelle schauen nah und mittel auf den Ursprung (die
  // Siedlung), wenn er im Rahmen liegt, sonst auf die Mitte.
  const ursprung = ganz && 0 >= ganz.x && 0 <= ganz.x + ganz.seite && 0 >= ganz.y && 0 <= ganz.y + ganz.seite ? { x: 0, z: 0 } : null
  /** Ausschnitt fuer eine Lage: nah und mittel folgen einem selbst. */
  const ansichtVon = (s: KartenStand) => (ganz ? kartenAnsicht(zoom, ganz, s.mitte ?? ursprung) : null)
  const kachelVon = (a: KartenAnsicht | null) => (a && zoom !== 'ganz' ? kachelSchluessel(a) : 'ganz')
  const ansicht = ansichtVon(stand)
  const u = ansicht ? ansicht.seite / Math.max(40, px) : 1
  const kachel = kachelVon(ansicht)
  const namen = useMemo(() => namenAus(karte, infos, zoom, kachel === 'ganz' ? null : kachelFenster(kachel), u), [karte, infos, zoom, kachel, u])

  const leuteNach = useMemo(() => new Map(leute.map((l) => [l.uid, l])), [leute])

  // Nach jedem Zeichnen durch React (selten): die Elemente der Marken neu
  // lesen und den Takt fuer genau dieses Bild einrichten. Er setzt den
  // Ausschnitt (nah, mittel) und die Marken nur ueber Attribute; aendert
  // sich, was React bauen muss (Gerippe, Kachel), zeichnet React neu.
  useLayoutEffect(() => {
    const gerippe = markenGerippe(stand)
    const ziel = markenZielAus(markenRef.current)
    schreiber.vergessen()
    const takt = () => {
      const s = standRef.current
      const a = ansichtVon(s)
      if (markenGerippe(s) !== gerippe || kachelVon(a) !== kachel) {
        setStand(s)
        return
      }
      const svg = flaecheRef.current
      if (svg && a) schreiber.schreiben(svg, 'viewBox', `${a.x} ${a.y} ${a.seite} ${a.seite}`)
      markenSetzen(ziel, s, u, schreiber.schreiben)
    }
    taktRef.current = takt
    // Was React gezeichnet hat, ist die Lage beim Zeichnen; der Takt ist
    // vielleicht schon weiter.
    takt()
  })
  // Haus mit dem Tastenfokus: dicker Rand, weil SVG-Elemente keinen eigenen zeigen.
  const [fokus, setFokus] = useState<number | null>(null)
  // Fuer HausKnoepfe stabil (memo): der neueste Rueckruf liegt in einer Ref.
  const hausRueck = useRef(onHaus)
  useEffect(() => {
    hausRueck.current = onHaus
  })
  const wahl = useCallback(
    (i: number) => {
      const info = infos[i]
      if (info) hausRueck.current(i, info.mitte[0], info.mitte[1])
    },
    [infos],
  )
  const fokusSetzen = useCallback((i: number, an: boolean) => setFokus((v) => (an ? i : v === i ? null : v)), [])
  const hausName = useCallback((i: number) => t('siedlung.springen_zu', { name: karte.haeuser[i]?.name || t('siedlung.haus') }), [t, karte])

  if (!ganz || !ansicht) return null

  // Eingeklappt (gemerkt) oder zu wenig Hoehe (E87, nicht gemerkt).
  if (!zeigt) {
    return (
      <button
        type="button"
        data-eng={eng && !zu ? '' : undefined}
        aria-expanded={false}
        aria-label={t('siedlung.minikarte_auf')}
        title={t('siedlung.minikarte_auf')}
        onClick={() => {
          // Gleich mit der Lage von jetzt, nicht der vom Einklappen.
          const s = kartenStand(lageRef.current(), standRef.current.mitte)
          standRef.current = s
          setStand(s)
          if (zu) {
            setZu(false)
            zuMerken(false)
          }
          setTrotzdem(true)
        }}
        className="knopf flex h-10 w-10 items-center justify-center rounded-full border-2 border-line bg-surface/95 text-ink shadow"
      >
        <KarteIcon size={18} />
      </button>
    )
  }

  const tippen = (e: { clientX: number; clientY: number; currentTarget: SVGSVGElement }) => {
    const r = e.currentTarget.getBoundingClientRect()
    // Der Ausschnitt von jetzt (der Takt hat ihn vielleicht seit dem
    // letzten Zeichnen verschoben).
    const a = ansichtVon(standRef.current)
    if (!a || r.width <= 0 || r.height <= 0) return
    const x = a.x + ((e.clientX - r.left) / r.width) * a.seite
    const z = a.y + ((e.clientY - r.top) / r.height) * a.seite
    const haus = hausAn(karte, [x, z], TREFFER_PX * (a.seite / r.width))
    if (haus !== null) onHaus(haus, x, z)
  }
  const fokusHaus = fokus !== null ? karte.haeuser[fokus] : undefined
  const iZoom = stufen.indexOf(zoom)

  return (
    <div className="w-full overflow-hidden rounded-2xl border-2 border-line bg-surface/95 shadow-lg" data-zoom={zoom}>
      <div className="flex items-center gap-1 border-b border-line ps-2 pe-0.5">
        <span dir="auto" className="min-w-0 flex-1 truncate py-1 text-xs font-bold text-ink" title={ebene ?? undefined}>
          {ebene ?? t('siedlung.minikarte')}
        </span>
        <button
          type="button"
          aria-expanded
          aria-label={t('siedlung.minikarte_zu')}
          title={t('siedlung.minikarte_zu')}
          onClick={() => {
            setZu(true)
            zuMerken(true)
          }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-raised hover:text-ink"
        >
          <ChevronDown size={17} />
        </button>
      </div>
      <div className="relative">
        <svg
          ref={flaecheRef}
          viewBox={`${ansicht.x} ${ansicht.y} ${ansicht.seite} ${ansicht.seite}`}
          preserveAspectRatio="xMidYMid meet"
          role="group"
          aria-label={t('siedlung.minikarte_bild')}
          className="block aspect-square w-full cursor-pointer touch-manipulation select-none"
          // Der Grund als Hintergrund der Flaeche: wandert nicht mit dem Ausschnitt.
          style={{ background: 'var(--plan-boden-draussen)' }}
          onClick={tippen}
        >
          <KartenGrund pfade={pfade} u={u} />
          <HausKnoepfe karte={karte} springbar={springbar} name={hausName} onWahl={wahl} onFokus={fokusSetzen} />
          {fokusHaus && brauchbar(fokusHaus) ? (
            <polygon points={punkteText(fokusHaus.punkte)} fill="none" stroke="var(--ink)" strokeWidth={3} vectorEffect="non-scaling-stroke" strokeLinejoin="round" pointerEvents="none" />
          ) : null}
          <KartenNamen namen={namen} u={u} />
          <KartenMarken stand={stand} leuteNach={leuteNach} u={u} duText={t('siedlung.minikarte_du')} gruppe={markenRef} />
        </svg>
        {/* Norden oben, klein in der Ecke rechts (auch im Arabischen: die
            Karte wird nie gespiegelt). Steht fest, wandert nicht mit. */}
        <span aria-hidden="true" className="pointer-events-none absolute right-1.5 top-1 text-[0.5rem] font-extrabold leading-none text-muted">
          {t('siedlung.norden')}
        </span>
        {stufen.length > 1 ? (
          // Stufen: + naeher, - weiter weg; unten links in der Karte.
          <div className="absolute bottom-1 left-1 flex flex-col gap-0.5">
            <button
              type="button"
              aria-label={t('siedlung.minikarte_naeher')}
              title={t('siedlung.minikarte_naeher')}
              disabled={iZoom <= 0}
              onClick={() => setZoomWahl((v) => zoomSchritt(stufen, v && stufen.includes(v) ? v : zoomStart(stufen), 1))}
              className="flex h-6 w-6 items-center justify-center rounded-md border border-line bg-surface/95 text-ink shadow disabled:opacity-40"
            >
              <Plus size={14} />
            </button>
            <button
              type="button"
              aria-label={t('siedlung.minikarte_weiter')}
              title={t('siedlung.minikarte_weiter')}
              disabled={iZoom >= stufen.length - 1}
              onClick={() => setZoomWahl((v) => zoomSchritt(stufen, v && stufen.includes(v) ? v : zoomStart(stufen), -1))}
              className="flex h-6 w-6 items-center justify-center rounded-md border border-line bg-surface/95 text-ink shadow disabled:opacity-40"
            >
              <Minus size={14} />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function mitteVon(poly: readonly (readonly [number, number])[]): P {
  let x = 0
  let z = 0
  for (const q of poly) {
    x += q[0]
    z += q[1]
  }
  return [x / poly.length, z / poly.length]
}

function breiteVon(poly: readonly (readonly [number, number])[]): number {
  let lo = Infinity
  let hi = -Infinity
  for (const q of poly) {
    lo = Math.min(lo, q[0])
    hi = Math.max(hi, q[0])
  }
  return hi - lo
}
