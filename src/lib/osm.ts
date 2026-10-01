/* Karten und Koordinaten fuer die Siedlung (E83).
 *
 * Zwei offene Dienste von OpenStreetMap, ohne Schluessel und ohne unsere
 * Datenbank:
 *   - Nominatim sucht eine Adresse und liefert ihre Lage in Grad.
 *   - Overpass liefert die Umrisse der Haeuser rund um einen Punkt.
 * Geschickt wird nur, was die Suche braucht: der eingetippte Text oder der
 * Punkt mit Radius. Keine Kennung, kein Konto, keine Cookies.
 *
 * Regeln der Dienste (operations.osmfoundation.org/policies/nominatim):
 * hoechstens eine Anfrage je Sekunde an Nominatim, keine Suche beim
 * Tippen (die Oberflaeche sucht erst auf Knopfdruck), Ergebnisse
 * zwischenspeichern. Daten von OpenStreetMap stehen unter der ODbL: wo sie
 * zu sehen sind, steht OSM_HINWEIS mit Verweis auf OSM_LIZENZ_URL.
 *
 * Koordinaten der Siedlung (wie src/lib/types.ts): Meter um den Mittelpunkt
 * (lat0, lon0), x nach Osten, z nach Sueden (wie der Plan: y nach unten),
 * y nach oben.
 *
 * Die reinen Rechnungen (lokal, Umwandeln der Antworten, Lage der Wohnung)
 * brauchen kein Netz; scripts/osm-pruefen.mjs prueft sie ohne Browser.
 */
import { tg } from './i18n'
import type { SiedlungGebaeude, SiedlungWohnung } from './types'

/** Pflichtangabe, wo Daten von OpenStreetMap zu sehen sind (ODbL). */
export const OSM_HINWEIS = '(c) OpenStreetMap-Mitwirkende'
export const OSM_LIZENZ_URL = 'https://www.openstreetmap.org/copyright'

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

/** Meter je Grad Breite und je Grad Laenge am Aequator. */
const M_JE_GRAD_BREITE = 110574
const M_JE_GRAD_LAENGE = 111320

/** Wie lange eine Anfrage hoechstens dauern darf. */
const WARTEN_MS = 20_000
/** Abstand zwischen zwei Anfragen an Nominatim (Regel des Dienstes). */
const NOMINATIM_TAKT_MS = 1000

/** Hoechstens so viele Haeuser je Siedlung (dieselbe Grenze prueft 0044). */
export const MAX_GEBAEUDE = 200
/** Hoechstens so viele Ecken je Umriss (dieselbe Grenze prueft 0044). */
export const MAX_ECKEN = 500
/** Radius fuer Overpass in Metern: kleiner wird zu klein, groesser zu schwer. */
export const RADIUS_MIN_M = 10
export const RADIUS_MAX_M = 600
/** Kleinere Umrisse (m2) sind Messrauschen oder eine Linie, kein Haus. */
const MIN_FLAECHE_M2 = 0.5

/** Geschosse, wenn OpenStreetMap keine nennt. */
const GESCHOSSE_STANDARD = 3
const GESCHOSS_HOEHE_STANDARD = 3

/* ======================================================== Koordinaten */

export interface Lokal {
  /** Grad in Meter um (lat0, lon0): [x nach Osten, z nach Sueden]. */
  nachMeter(lat: number, lon: number): [number, number]
  /** Meter zurueck in Grad: [lat, lon]. */
  nachGrad(x: number, z: number): [number, number]
}

/** Umrechnung fuer eine Siedlung mit dem Mittelpunkt (lat0, lon0).
 *  Eben gerechnet: auf ein paar hundert Metern liegt der Fehler weit unter
 *  einem Zentimeter gegenueber der Kugel, und hin und zurueck ist exakt. */
export function lokal(lat0: number, lon0: number): Lokal {
  const proGradLaenge = M_JE_GRAD_LAENGE * Math.cos((lat0 * Math.PI) / 180)
  return {
    nachMeter: (lat, lon) => [(lon - lon0) * proGradLaenge, -(lat - lat0) * M_JE_GRAD_BREITE],
    nachGrad: (x, z) => [lat0 - z / M_JE_GRAD_BREITE, lon0 + x / proGradLaenge],
  }
}

/* ============================================== Lage der eigenen Wohnung */

/** Ein Punkt des Plans (cm, y nach unten) in Metern der Siedlung:
 *  (w.x, w.z) + R(drehung) * (px / 100, py / 100), mit
 *  R(t) = [[cos t, -sin t], [sin t, cos t]] auf (x, z). */
export function planNachSiedlung(
  w: Pick<SiedlungWohnung, 'x' | 'z' | 'drehung'>,
  px: number,
  py: number,
): [number, number] {
  const t = (w.drehung * Math.PI) / 180
  const c = runden(Math.cos(t))
  const s = runden(Math.sin(t))
  const u = px / 100
  const v = py / 100
  return [w.x + c * u - s * v, w.z + s * u + c * v]
}

/** Wie die Gruppe der Siedlung in der Welt der Wohnung liegt. Die Wohnung
 *  steht dort im Ursprung mit dem Boden bei y = 0 (x = Plan-x / 100,
 *  z = Plan-y / 100). Also gilt die umgekehrte Lage, um das Geschoss
 *  abgesenkt. Fuer three.js: gruppe.position.set(x, y, z) und
 *  gruppe.rotation.y = drehY (Bogenmass); dann landet jeder Punkt der
 *  Siedlung dort, wo planNachSiedlung ihn hinrechnet. */
export function lageDerSiedlung(
  w: Pick<SiedlungWohnung, 'x' | 'z' | 'drehung' | 'geschoss'>,
  geschossHoehe: number,
): { x: number; y: number; z: number; drehY: number } {
  const t = (w.drehung * Math.PI) / 180
  const c = runden(Math.cos(t))
  const s = runden(Math.sin(t))
  // three.js dreht um y mit (x, z) -> (x cos a + z sin a, -x sin a + z cos a).
  // Mit a = t ist das genau R(-t), die Umkehrung von planNachSiedlung.
  return {
    x: -(c * w.x + s * w.z),
    y: -w.geschoss * geschossHoehe,
    z: -(-s * w.x + c * w.z),
    drehY: t,
  }
}

/** cos und sin von 90, 180, 270 Grad ohne Rest wie 6e-17. */
function runden(v: number): number {
  const r = Math.round(v)
  return Math.abs(v - r) < 1e-12 ? r : v
}

/* ============================================================ Fehler */

/** Ein Fehler beim Fragen der Dienste. art sagt der Oberflaeche, was los
 *  war, die Nachricht ist schon uebersetzt. */
export class OsmFehler extends Error {
  art: 'eingabe' | 'verbindung' | 'zeit' | 'dienst' | 'antwort'
  constructor(art: OsmFehler['art'], nachricht: string) {
    super(nachricht)
    this.art = art
    this.name = 'OsmFehler'
  }
}

/** Fragt einen Dienst und gibt das JSON zurueck. Jeder Fehlschlag wird zu
 *  einem OsmFehler mit lesbarem Satz, nichts wird verschluckt. */
async function holen(url: string, init: { method: 'GET' | 'POST'; body?: URLSearchParams }): Promise<unknown> {
  let res: Response
  try {
    res = await fetch(url, {
      ...init,
      credentials: 'omit',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(WARTEN_MS),
    })
  } catch (e) {
    const name = (e as { name?: string } | null)?.name
    if (name === 'TimeoutError' || name === 'AbortError') {
      throw new OsmFehler('zeit', tg('fehler.keine_verbindung'))
    }
    throw new OsmFehler('verbindung', tg('fehler.keine_verbindung'))
  }
  if (!res.ok) {
    throw new OsmFehler('dienst', tg('fehler.suchen', { grund: `HTTP ${res.status}` }))
  }
  try {
    return await res.json()
  } catch (e) {
    const name = (e as { name?: string } | null)?.name
    if (name === 'TimeoutError' || name === 'AbortError') {
      throw new OsmFehler('zeit', tg('fehler.keine_verbindung'))
    }
    throw new OsmFehler('antwort', tg('fehler.suchen', { grund: tg('fehler.keine_daten') }))
  }
}

/* ======================================================= Adresse suchen */

export interface AdressTreffer {
  name: string
  lat: number
  lon: number
}

/** Wann die letzte Anfrage an Nominatim hinausging (ms). */
let nominatimZuletzt = 0
/** Wartende Suchen reihen sich hier ein, darum halten auch zwei
 *  gleichzeitige Suchen den Abstand ein. */
let nominatimReihe: Promise<void> = Promise.resolve()
/** Letzte Antworten je Suchtext (Regel des Dienstes: zwischenspeichern). */
const nominatimSpeicher = new Map<string, AdressTreffer[]>()
const SPEICHER_MAX = 50

/** Wartet, bis seit der letzten Anfrage eine Sekunde vergangen ist, und
 *  merkt sich dann den neuen Zeitpunkt. Gemessen wird ab dem echten
 *  Abschicken: kommt eine Anfrage spaet hinaus, wartet die naechste
 *  entsprechend laenger. Zeitgeber feuern manchmal ein paar Millisekunden
 *  zu frueh (Windows bis etwa 16 ms), darum wird nachgewartet. */
function nominatimTakt(): Promise<void> {
  const dran = nominatimReihe.then(async () => {
    const rest = () => nominatimZuletzt + NOMINATIM_TAKT_MS - Date.now()
    while (rest() > 0) await new Promise((r) => setTimeout(r, rest()))
    nominatimZuletzt = Date.now()
  })
  nominatimReihe = dran
  return dran
}

/** Antwort von Nominatim (format=json) in Treffer. Eintraege ohne
 *  gueltige Lage fallen weg. Keine Liste: Fehler. */
export function nominatimZuTreffern(antwort: unknown): AdressTreffer[] {
  if (!Array.isArray(antwort)) {
    throw new OsmFehler('antwort', tg('fehler.suchen', { grund: tg('fehler.keine_daten') }))
  }
  const out: AdressTreffer[] = []
  for (const e of antwort as unknown[]) {
    if (!e || typeof e !== 'object') continue
    const r = e as { display_name?: unknown; lat?: unknown; lon?: unknown }
    const lat = zahlAus(r.lat)
    const lon = zahlAus(r.lon)
    if (!gueltigeLage(lat, lon)) continue
    const name = typeof r.display_name === 'string' ? r.display_name.trim() : ''
    out.push({ name: name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`, lat, lon })
  }
  return out
}

/** Sucht eine Adresse (hoechstens 5 Treffer). Nur auf Knopfdruck aufrufen,
 *  nicht beim Tippen. Leerer Text: keine Anfrage, leere Liste. */
export async function adresseSuchen(text: string): Promise<AdressTreffer[]> {
  const q = text.trim().replace(/\s+/g, ' ').slice(0, 200)
  if (!q) return []
  const schluessel = q.toLowerCase()
  const gemerkt = nominatimSpeicher.get(schluessel)
  if (gemerkt) return gemerkt.map((t) => ({ ...t }))

  await nominatimTakt()
  const url = `${NOMINATIM_URL}?${new URLSearchParams({ format: 'json', limit: '5', q })}`
  const treffer = nominatimZuTreffern(await holen(url, { method: 'GET' }))

  nominatimSpeicher.set(schluessel, treffer)
  if (nominatimSpeicher.size > SPEICHER_MAX) {
    const aeltester = nominatimSpeicher.keys().next().value
    if (aeltester !== undefined) nominatimSpeicher.delete(aeltester)
  }
  return treffer.map((t) => ({ ...t }))
}

/* ====================================================== Haeuser laden */

/** Ein Weg aus der Overpass-Antwort (out tags geom). */
interface OverpassElement {
  type?: unknown
  id?: unknown
  tags?: unknown
  geometry?: unknown
}

/** Die Abfrage fuer Overpass: alle Wege mit building im Umkreis. */
export function overpassAbfrage(lat: number, lon: number, radiusM: number): string {
  const r = Math.round(radiusBegrenzen(radiusM))
  return `[out:json][timeout:25];way["building"](around:${r},${lat.toFixed(7)},${lon.toFixed(7)});out tags geom;`
}

/** Geschosse aus building:levels: erste Zahl, gerundet, 1 bis 60.
 *  Fehlt sie oder ist sie unlesbar: 3. */
export function geschosseAus(tags: Record<string, string> | undefined): number {
  const roh = tags?.['building:levels']
  if (typeof roh !== 'string') return GESCHOSSE_STANDARD
  const m = /\d+(?:[.,]\d+)?/.exec(roh)
  if (!m || /^\s*-/.test(roh)) return GESCHOSSE_STANDARD
  const n = Math.round(Number(m[0].replace(',', '.')))
  if (!Number.isFinite(n)) return GESCHOSSE_STANDARD
  return Math.min(60, Math.max(1, n))
}

/** Wie das Haus heisst: sein Name, sonst Strasse und Hausnummer, sonst
 *  'Haus n' (n zaehlt ab 1). */
export function gebaeudeName(tags: Record<string, string> | undefined, n: number): string {
  const name = tags?.name?.trim()
  if (name) return name.slice(0, 80)
  const strasse = tags?.['addr:street']?.trim() ?? ''
  const nummer = tags?.['addr:housenumber']?.trim() ?? ''
  const adresse = [strasse, nummer].filter(Boolean).join(' ')
  if (adresse) return adresse.slice(0, 80)
  return `Haus ${n}`
}

/** Antwort von Overpass in Haeuser, Meter relativ zu (lat0, lon0).
 *  Uebersprungen werden: building=no, Umrisse mit Luecken (null) oder
 *  weniger als 3 Ecken. Die naechsten MAX_GEBAEUDE zur Mitte bleiben, nach
 *  Abstand sortiert; erst danach werden sie durchnummeriert. */
export function overpassZuGebaeude(antwort: unknown, lat0: number, lon0: number): SiedlungGebaeude[] {
  const elemente = (antwort as { elements?: unknown } | null)?.elements
  if (!Array.isArray(elemente)) {
    throw new OsmFehler('antwort', tg('fehler.suchen', { grund: tg('fehler.keine_daten') }))
  }
  const ort = lokal(lat0, lon0)
  const roh: { id: number; tags: Record<string, string>; umriss: [number, number][]; abstand: number }[] = []
  const gesehen = new Set<number>()
  for (const e of elemente as OverpassElement[]) {
    if (!e || e.type !== 'way' || typeof e.id !== 'number' || gesehen.has(e.id)) continue
    const tags = textTags(e.tags)
    if (!tags.building || tags.building === 'no') continue
    const umriss = umrissAus(e.geometry, ort)
    if (!umriss) continue
    gesehen.add(e.id)
    const mx = umriss.reduce((s, p) => s + p[0], 0) / umriss.length
    const mz = umriss.reduce((s, p) => s + p[1], 0) / umriss.length
    roh.push({ id: e.id, tags, umriss, abstand: Math.hypot(mx, mz) })
  }
  roh.sort((a, b) => a.abstand - b.abstand || a.id - b.id)
  return roh.slice(0, MAX_GEBAEUDE).map((r, i) => ({
    id: `osm-${r.id}`,
    name: gebaeudeName(r.tags, i + 1),
    umriss: r.umriss,
    geschosse: geschosseAus(r.tags),
    geschossHoehe: GESCHOSS_HOEHE_STANDARD,
    stil: 'putz',
    dachGruen: false,
    pv: false,
    quelle: `osm:way/${r.id}`,
  }))
}

/** Laedt die Haeuser im Umkreis von radiusM Metern (10 bis 600) um
 *  (lat, lon), in Metern relativ zu genau diesem Punkt. */
export async function gebaeudeLaden(lat: number, lon: number, radiusM: number): Promise<SiedlungGebaeude[]> {
  if (!gueltigeLage(lat, lon) || !Number.isFinite(radiusM)) {
    throw new OsmFehler('eingabe', tg('fehler.suchen', { grund: 'lat/lon' }))
  }
  const antwort = await holen(OVERPASS_URL, {
    method: 'POST',
    body: new URLSearchParams({ data: overpassAbfrage(lat, lon, radiusM) }),
  })
  // Overpass meldet eine Zeitueberschreitung mit Status 200 und remark.
  const bemerkung = (antwort as { remark?: unknown } | null)?.remark
  if (typeof bemerkung === 'string' && /error/i.test(bemerkung)) {
    throw new OsmFehler('dienst', tg('fehler.suchen', { grund: bemerkung.slice(0, 160) }))
  }
  return overpassZuGebaeude(antwort, lat, lon)
}

/* ============================================================ Hilfen */

function gueltigeLage(lat: number, lon: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
}

/** Nominatim schickt Zahlen als Text ("48.1"). Leer, null und anderes: NaN. */
function zahlAus(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string' && v.trim() !== '') return Number(v)
  return Number.NaN
}

function radiusBegrenzen(r: number): number {
  return Math.min(RADIUS_MAX_M, Math.max(RADIUS_MIN_M, r))
}

/** Nur Text-Tags, alles andere faellt weg. */
function textTags(t: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (!t || typeof t !== 'object') return out
  for (const [k, v] of Object.entries(t as Record<string, unknown>)) {
    if (typeof v === 'string') out[k] = v
  }
  return out
}

/** Umriss eines Weges in Metern, auf den Zentimeter gerundet: ohne den
 *  wiederholten Schlusspunkt und ohne doppelte Ecken. Mehr als MAX_ECKEN
 *  Ecken werden gleichmaessig ausgeduennt. null: unbrauchbar. */
function umrissAus(geom: unknown, ort: Lokal): [number, number][] | null {
  if (!Array.isArray(geom)) return null
  const pkt: [number, number][] = []
  for (const g of geom as unknown[]) {
    const p = g as { lat?: unknown; lon?: unknown } | null
    if (!p || typeof p.lat !== 'number' || typeof p.lon !== 'number' || !gueltigeLage(p.lat, p.lon)) return null
    const [x, z] = ort.nachMeter(p.lat, p.lon)
    const q: [number, number] = [cm(x), cm(z)]
    const vor = pkt[pkt.length - 1]
    if (!vor || vor[0] !== q[0] || vor[1] !== q[1]) pkt.push(q)
  }
  if (pkt.length > 1) {
    const a = pkt[0]
    const b = pkt[pkt.length - 1]
    if (a[0] === b[0] && a[1] === b[1]) pkt.pop()
  }
  const duenn = pkt.length <= MAX_ECKEN ? pkt : pkt.filter((_, i) => i % Math.ceil(pkt.length / MAX_ECKEN) === 0)
  // Weniger als 3 Ecken oder fast keine Flaeche (Linie, Punkt): kein Haus.
  return duenn.length >= 3 && Math.abs(flaeche(duenn)) >= MIN_FLAECHE_M2 ? duenn : null
}

/** Flaeche eines Umrisses (Gauss), mit Vorzeichen je Umlaufsinn. */
function flaeche(p: [number, number][]): number {
  let s = 0
  for (let i = 0; i < p.length; i++) {
    const [x0, z0] = p[i]
    const [x1, z1] = p[(i + 1) % p.length]
    s += x0 * z1 - x1 * z0
  }
  return s / 2
}

/** Auf den Zentimeter, ohne -0. */
function cm(v: number): number {
  return Math.round(v * 100) / 100 + 0
}
