/* Hilfen fuer die Stadt (E87), rein und ohne three.
 *
 * gelaendeHoehe liest das Gelaende, stadtPruefen prueft eine Stadt aus der
 * Datei (siedlungImport.ts), aus der Datenbank (api.ts) und aus dem
 * Umwandler (scripts/stadt-aus-osm.mjs). Die Datenbank selbst prueft nur
 * Art und Groesse (0047); alles andere steht hier, an einer Stelle. */
import type { StadtDaten, StadtFlaechenArt, StadtHausArt, StadtStrassenArt } from './types'

/** Hoehe des Gelaendes an (x, z) Siedlungsmetern in Metern ueber dem Boden
 *  der Siedlung, bilinear zwischen den Gitterpunkten; ausserhalb des
 *  Gitters der Wert am Rand. */
export function gelaendeHoehe(g: StadtDaten['gelaende'], x: number, z: number): number {
  const { x0, z0, schritt, nx, nz, dm } = g
  if (!(nx >= 1 && nz >= 1 && schritt > 0) || dm.length < nx * nz) return 0
  const fx = Math.min(Math.max((x - x0) / schritt, 0), nx - 1)
  const fz = Math.min(Math.max((z - z0) / schritt, 0), nz - 1)
  const i = Math.min(Math.floor(fx), Math.max(nx - 2, 0))
  const j = Math.min(Math.floor(fz), Math.max(nz - 2, 0))
  const tx = nx > 1 ? fx - i : 0
  const tz = nz > 1 ? fz - j : 0
  const w = (a: number, b: number) => dm[Math.min(b, nz - 1) * nx + Math.min(a, nx - 1)] / 10
  const a = w(i, j) * (1 - tx) + w(i + 1, j) * tx
  const b = w(i, j + 1) * (1 - tx) + w(i + 1, j + 1) * tx
  return a * (1 - tz) + b * tz
}

/* ============================================================ Pruefung */

/** Grenzen einer Stadt. Groesser wird kein Stadtteil; was darueber liegt,
 *  ist kaputt oder Absicht. Die Datei darf bis 8 MB haben (Siedlung mit
 *  innen und Stadt), die Stadt allein hoechstens bytes. */
export const STADT_GRENZEN = {
  haeuser: 20000,
  strassen: 20000,
  flaechen: 20000,
  gewaesser: 5000,
  zaeune: 20000,
  baeume: 50000,
  orte: 5000,
  /** Punkte je Umriss oder Linie. */
  punkte: 5000,
  /** Innenhoefe je Haus. */
  loecher: 100,
  /** Geschaefte je Haus. */
  laeden: 200,
  /** Gitterpunkte des Gelaendes (nx * nz). */
  gitter: 1_000_000,
  /** Betrag jeder Koordinate x, z (Meter vom Mittelpunkt der Siedlung). */
  koordinate: 20000,
  /** Betrag jeder Hoehe (Meter ueber dem Boden der Siedlung). */
  hoehe: 2000,
  /** Laenge von Namen. */
  text: 120,
  /** Laenge von Arten aus der Karte (shop=..., amenity=...). */
  artText: 60,
  /** Groesse als JSON (UTF-8). */
  bytes: 6_000_000,
} as const

/** Mehr Probleme werden nicht gesammelt: eine kaputte Datei hat sonst
 *  Tausende, und eines reicht, um sie abzulehnen. */
const MAX_PROBLEME = 50

const HAUS_ARTEN: readonly StadtHausArt[] = [
  'wohnen',
  'haus',
  'laden',
  'supermarkt',
  'einkaufszentrum',
  'feuerwehr',
  'spital',
  'schule',
  'kindergarten',
  'kirche',
  'buero',
  'halle',
  'garage',
  'schuppen',
  'sonst',
]
const STRASSEN_ARTEN: readonly StadtStrassenArt[] = ['haupt', 'neben', 'wohn', 'dienst', 'fuss', 'rad', 'treppe', 'feldweg', 'gleis']
const FLAECHEN_ARTEN: readonly StadtFlaechenArt[] = [
  'wiese',
  'park',
  'wald',
  'acker',
  'wasser',
  'parkplatz',
  'sport',
  'spielplatz',
  'friedhof',
  'gewerbe',
  'wohngebiet',
  'fels',
  'schwimmbad',
]
const DAECHER: readonly string[] = ['flach', 'sattel', 'walm']
const ZAUN_ARTEN: readonly string[] = ['mauer', 'zaun', 'hecke']
const FARBE = /^#[0-9a-fA-F]{6}$/

const istObjekt = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const zahl = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const ganz = (v: unknown, lo: number, hi: number): v is number => Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi
const imBereich = (v: unknown, lo: number, hi: number): v is number => zahl(v) && v >= lo && v <= hi
const text = (v: unknown, min: number, max: number): v is string => typeof v === 'string' && v.length >= min && v.length <= max

/** Ein Punkt [x, z] mit endlichen Zahlen in den Grenzen. */
function punkt(v: unknown): v is [number, number] {
  const k = STADT_GRENZEN.koordinate
  return Array.isArray(v) && v.length === 2 && imBereich(v[0], -k, k) && imBereich(v[1], -k, k)
}

/** Eine Liste von min bis STADT_GRENZEN.punkte Punkten. */
function punkte(v: unknown, min: number): v is [number, number][] {
  if (!Array.isArray(v) || v.length < min || v.length > STADT_GRENZEN.punkte) return false
  for (const p of v) if (!punkt(p)) return false
  return true
}

/** Laenge eines Textes in UTF-8, ohne ihn zu kopieren. */
function utf8Laenge(s: string): number {
  let n = 0
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    // Ein Ersatzpaar (4 Byte) zaehlt je Haelfte 2.
    n += c < 0x80 ? 1 : c < 0x800 ? 2 : c >= 0xd800 && c <= 0xdfff ? 2 : 3
  }
  return n
}

/** Prueft eine Stadt aus Datei oder Datenbank; gibt die Probleme zurueck
 *  (leer = in Ordnung), jedes als Pfad wie 'haeuser[3].tuer' oder
 *  'gelaende.dm'. Geprueft wird der Aufbau: Typen, endliche Zahlen in
 *  Grenzen, Umrisse mit mindestens 3 Punkten, Tueren auf einer echten
 *  Kante, Gitter passend zu nx und nz, Orte nur in Haeusern, die es gibt,
 *  hoechstens STADT_GRENZEN. Unbekannte Schluessel stoeren nicht. Ob ein
 *  Umriss sich selbst schneidet, prueft niemand (das zeichnet nur schief). */
export function stadtPruefen(s: unknown): string[] {
  if (!istObjekt(s)) return ['stadt']
  if (s.art !== 'kistly-stadt' || s.v !== 1) return ['art']
  // Zuerst die Groesse: was zu gross ist, wird gar nicht erst durchsucht.
  let json: string
  try {
    json = JSON.stringify(s)
  } catch {
    return ['stadt']
  }
  if (utf8Laenge(json) > STADT_GRENZEN.bytes) return ['groesse']

  const p: string[] = []
  const melde = (pfad: string) => {
    if (p.length < MAX_PROBLEME) p.push(pfad)
  }
  const voll = () => p.length >= MAX_PROBLEME
  const K = STADT_GRENZEN.koordinate
  const H = STADT_GRENZEN.hoehe

  if (!text(s.stand, 0, 40)) melde('stand')
  const r = s.rahmen
  if (!Array.isArray(r) || r.length !== 4 || !r.every((v) => imBereich(v, -K, K)) || !(r[0] < r[2] && r[1] < r[3])) melde('rahmen')

  // Gelaende: Gitter mit ganzen Dezimetern.
  const g = s.gelaende
  if (!istObjekt(g)) melde('gelaende')
  else {
    if (!imBereich(g.x0, -K, K)) melde('gelaende.x0')
    if (!imBereich(g.z0, -K, K)) melde('gelaende.z0')
    if (!(zahl(g.schritt) && g.schritt > 0 && g.schritt <= 1000)) melde('gelaende.schritt')
    const nxOk = ganz(g.nx, 1, STADT_GRENZEN.gitter)
    const nzOk = ganz(g.nz, 1, STADT_GRENZEN.gitter)
    if (!nxOk) melde('gelaende.nx')
    if (!nzOk) melde('gelaende.nz')
    if (nxOk && nzOk && (g.nx as number) * (g.nz as number) > STADT_GRENZEN.gitter) melde('gelaende.nx')
    if (!Array.isArray(g.dm)) melde('gelaende.dm')
    else if (nxOk && nzOk && g.dm.length !== (g.nx as number) * (g.nz as number)) melde('gelaende.dm')
    else {
      const dm = g.dm as unknown[]
      for (let i = 0; i < dm.length; i++) {
        if (!ganz(dm[i], -H * 10, H * 10)) {
          melde(`gelaende.dm[${i}]`)
          break
        }
      }
    }
  }

  /** Eine Liste mit Obergrenze; ruft je Eintrag pruefe auf, bis genug
   *  Probleme da sind. */
  function liste(name: string, max: number, pruefe: (v: unknown, pfad: string) => void) {
    const l = (s as Record<string, unknown>)[name]
    if (!Array.isArray(l)) return melde(name)
    if (l.length > max) return melde(`${name}.anzahl`)
    for (let i = 0; i < l.length && !voll(); i++) pruefe(l[i], `${name}[${i}]`)
  }

  // Haeuser: erst die Kennungen, damit Orte darauf zeigen koennen.
  const ids = new Set<string>()
  liste('haeuser', STADT_GRENZEN.haeuser, (h, pfad) => {
    if (!istObjekt(h)) return melde(pfad)
    if (!text(h.id, 1, 64) || ids.has(h.id)) melde(`${pfad}.id`)
    else ids.add(h.id)
    const umrissOk = punkte(h.umriss, 3)
    if (!umrissOk) melde(`${pfad}.umriss`)
    if (h.loecher !== undefined) {
      if (!Array.isArray(h.loecher) || h.loecher.length > STADT_GRENZEN.loecher) melde(`${pfad}.loecher`)
      else
        h.loecher.forEach((l, j) => {
          if (!punkte(l, 3)) melde(`${pfad}.loecher[${j}]`)
        })
    }
    if (!HAUS_ARTEN.includes(h.art as StadtHausArt)) melde(`${pfad}.art`)
    if (!ganz(h.geschosse, 1, 60)) melde(`${pfad}.geschosse`)
    if (!imBereich(h.geschossHoehe, 2, 10)) melde(`${pfad}.geschossHoehe`)
    if (!DAECHER.includes(h.dach as string)) melde(`${pfad}.dach`)
    if (!imBereich(h.boden, -H, H)) melde(`${pfad}.boden`)
    if (h.name !== undefined && !text(h.name, 0, STADT_GRENZEN.text)) melde(`${pfad}.name`)
    if (h.laeden !== undefined) {
      if (!Array.isArray(h.laeden) || h.laeden.length > STADT_GRENZEN.laeden) melde(`${pfad}.laeden`)
      else
        h.laeden.forEach((l, j) => {
          if (!istObjekt(l) || !text(l.name, 1, STADT_GRENZEN.text) || !text(l.art, 1, STADT_GRENZEN.artText)) melde(`${pfad}.laeden[${j}]`)
        })
    }
    // Die Tuer liegt auf einer Kante des Umrisses, die eine Laenge hat.
    const t = h.tuer
    const u = h.umriss as [number, number][]
    if (!istObjekt(t) || !imBereich(t.t, 0, 1) || !umrissOk || !ganz(t.kante, 0, u.length - 1)) melde(`${pfad}.tuer`)
    else {
      const a = u[t.kante as number]
      const b = u[((t.kante as number) + 1) % u.length]
      if (a[0] === b[0] && a[1] === b[1]) melde(`${pfad}.tuer`)
    }
    if (h.farbe !== undefined && !(typeof h.farbe === 'string' && FARBE.test(h.farbe))) melde(`${pfad}.farbe`)
  })

  liste('strassen', STADT_GRENZEN.strassen, (x, pfad) => {
    if (!istObjekt(x)) return melde(pfad)
    if (!STRASSEN_ARTEN.includes(x.art as StadtStrassenArt)) melde(`${pfad}.art`)
    if (!imBereich(x.breite, 0.1, 60)) melde(`${pfad}.breite`)
    if (!punkte(x.punkte, 2)) melde(`${pfad}.punkte`)
    if (x.name !== undefined && !text(x.name, 0, STADT_GRENZEN.text)) melde(`${pfad}.name`)
    if (x.bruecke !== undefined && typeof x.bruecke !== 'boolean') melde(`${pfad}.bruecke`)
    if (x.tunnel !== undefined && typeof x.tunnel !== 'boolean') melde(`${pfad}.tunnel`)
  })

  liste('flaechen', STADT_GRENZEN.flaechen, (f, pfad) => {
    if (!istObjekt(f)) return melde(pfad)
    if (!FLAECHEN_ARTEN.includes(f.art as StadtFlaechenArt)) melde(`${pfad}.art`)
    if (!punkte(f.punkte, 3)) melde(`${pfad}.punkte`)
  })

  liste('gewaesser', STADT_GRENZEN.gewaesser, (w, pfad) => {
    if (!istObjekt(w)) return melde(pfad)
    if (!(zahl(w.breite) && w.breite > 0 && w.breite <= 500)) melde(`${pfad}.breite`)
    if (!punkte(w.punkte, 2)) melde(`${pfad}.punkte`)
  })

  liste('zaeune', STADT_GRENZEN.zaeune, (z, pfad) => {
    if (!istObjekt(z)) return melde(pfad)
    if (!ZAUN_ARTEN.includes(z.art as string)) melde(`${pfad}.art`)
    if (!punkte(z.punkte, 2)) melde(`${pfad}.punkte`)
  })

  liste('baeume', STADT_GRENZEN.baeume, (b, pfad) => {
    if (!punkt(b)) melde(pfad)
  })

  liste('orte', STADT_GRENZEN.orte, (o, pfad) => {
    if (!istObjekt(o)) return melde(pfad)
    if (!text(o.name, 1, STADT_GRENZEN.text)) melde(`${pfad}.name`)
    if (!text(o.art, 1, STADT_GRENZEN.artText)) melde(`${pfad}.art`)
    if (!imBereich(o.x, -K, K) || !imBereich(o.z, -K, K)) melde(`${pfad}.lage`)
    if (o.haus !== undefined && !(typeof o.haus === 'string' && ids.has(o.haus))) melde(`${pfad}.haus`)
  })

  return p
}
