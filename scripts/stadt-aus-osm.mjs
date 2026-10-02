// Wandelt einen Auszug aus OpenStreetMap und ein Hoehenmodell in die Stadt
// um eine Siedlung um (E87, StadtDaten in src/lib/types.ts) und haengt sie
// an eine Siedlungs-Datei (src/lib/siedlungImport.ts) an. Die App traegt
// die Datei danach ueber den Datei-Import ein.
//
// Aufruf im Projektordner:
//   node scripts/stadt-aus-osm.mjs --osm <Overpass-JSON> --hoehen <Gitter-JSON>
//        --siedlung <Siedlungs-Datei> --aus <neue Siedlungs-Datei>
//        [--rahmen x0,z0,x1,z1]
//
// Eingaben (liegen beim Besitzer, nie im Repo):
//   --osm      Antwort von Overpass mit "out geom": Wege mit geometry,
//              Relationen (multipolygon) mit members[].geometry, Knoten mit
//              lat/lon. Daten von OpenStreetMap stehen unter der ODbL.
//   --hoehen   { x0, z0, schritt, nx, nz, m }: Meter ueber dem Meer auf einem
//              Gitter in Siedlungsmetern (x Osten, z Sueden), Wert m[j*nx + i].
//   --siedlung Siedlungs-Datei (art 'kistly-siedlung'): lat/lon ist der
//              Ursprung, ihre Haeuser und Flaechen bleiben eben und ohne
//              Doppel aus der Karte.
//   --rahmen   Bereich in Siedlungsmetern; ohne: das Gitter der Hoehen.
// Ausgabe: dieselbe Datei mit siedlung.stadt, alles andere unveraendert
// (auch deko). Die alte Datei bleibt, --aus muss eine andere sein.
//
// Gedruckt werden nur Zahlen und Groessen, nie Namen oder Koordinaten. Hier
// steht kein Ort: alles kommt aus den Eingaben. scripts/stadt-daten-pruefen.mjs
// prueft das Ganze an einem erfundenen Auszug.
import { readFileSync, writeFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { resolve as pfadAufloesen } from 'node:path'
import { fileURLToPath } from 'node:url'

// Die Umrechnung Grad -> Meter kommt aus src/lib/osm.ts selbst, damit die
// Stadt genau dort liegt, wo die Haeuser der Siedlung liegen. osm.ts holt
// das Woerterbuch (React); hier reicht ein Ersatz, der nie gebraucht wird.
const ERSATZ_I18N =
  'data:text/javascript,' + encodeURIComponent('export function tg(k, v) { return v ? k + " " + JSON.stringify(v) : k }')
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === './i18n' && context.parentURL?.endsWith('/src/lib/osm.ts')) {
      return { url: ERSATZ_I18N, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
})
const { lokal } = await import('../src/lib/osm.ts')
const { gelaendeHoehe, stadtPruefen } = await import('../src/lib/stadt.ts')
const { tuerBreite } = await import('../src/components/plan3d/stadtMasse.ts')

/* ============================================================ Regeln */

/** Toleranz beim Vereinfachen von Linien und Umrissen (Meter). */
export const VEREINFACHEN_M = 0.3
/** Haeuser aus der Karte so nah an einem Haus der Siedlung fallen weg (Meter). */
export const SIEDLUNG_ABSTAND_M = 3
/** Rand um die Siedlung, auf dem das Gelaende eben bleibt (Meter). */
export const EBEN_RAND_M = 12
/** Danach steigt es so lange zum echten Gelaende an (Meter). */
export const UEBERGANG_M = 25
/** So gross darf die Stadt als JSON hoechstens werden (Byte). */
export const ZIEL_BYTES = 2_500_000
/** Kanten fuer eine Tuer muessen so viel laenger sein als die Tuer (Meter). */
const TUER_SPIEL_M = 0.6
/** Namen werden hier abgeschnitten (Zeichen). */
const NAME_MAX = 80
/** Baeume in einer Baumreihe (Abstand in Metern). */
const BAUMREIHE_M = 8

/* Strassen: highway= -> Art und Breite (Meter). */
const STRASSEN = {
  motorway: ['haupt', 9],
  trunk: ['haupt', 8.5],
  primary: ['haupt', 7.5],
  secondary: ['haupt', 7],
  tertiary: ['neben', 6.5],
  residential: ['wohn', 5.5],
  unclassified: ['wohn', 5.5],
  living_street: ['wohn', 5],
  road: ['wohn', 5],
  service: ['dienst', 3.5],
  track: ['feldweg', 3],
  footway: ['fuss', 2],
  path: ['fuss', 2],
  pedestrian: ['fuss', 2],
  bridleway: ['fuss', 2],
  cycleway: ['rad', 2],
  steps: ['treppe', 2],
}
/** Gleise: railway= mit Schienen. */
const GLEISE = new Set(['rail', 'narrow_gauge', 'light_rail', 'tram', 'subway', 'monorail', 'funicular'])
/** Wege, an denen eine Haustuer liegen kann (fahren oder gehen). */
const TUER_WEGE = new Set([
  'primary',
  'secondary',
  'tertiary',
  'residential',
  'unclassified',
  'living_street',
  'road',
  'service',
  'track',
  'footway',
  'path',
  'pedestrian',
  'cycleway',
  'steps',
])

/* Haeuser: building= in Gruppen. */
const WOHN = new Set(['apartments', 'residential', 'dormitory', 'flats'])
const HAUS = new Set(['house', 'detached', 'semidetached_house', 'terrace', 'bungalow', 'villa', 'farm', 'farmhouse', 'cabin', 'static_caravan'])
const GARAGE = new Set(['garage', 'garages', 'carport', 'parking'])
const SCHUPPEN = new Set([
  'shed',
  'hut',
  'greenhouse',
  'allotment_house',
  'container',
  'transformer_tower',
  'toilets',
  'boathouse',
  'roof',
  'shelter',
  'service',
  'shrine',
  'kiosk_shelter',
])
const KIRCHE = new Set(['church', 'chapel', 'cathedral', 'mosque', 'synagogue', 'temple', 'religious', 'monastery'])
const BUERO = new Set(['office', 'commercial', 'government', 'public', 'civic', 'townhall', 'bank', 'police'])
const HALLE = new Set([
  'industrial',
  'warehouse',
  'manufacture',
  'factory',
  'hall',
  'sports_centre',
  'sports_hall',
  'train_station',
  'transportation',
  'hangar',
  'riding_hall',
  'grandstand',
  'stadium',
  'barn',
  'stable',
  'cowshed',
  'farm_auxiliary',
])
const SONST = new Set(['ruins', 'construction', 'bunker', 'bridge'])
/* amenity= am Haus. */
const LADEN_AMENITY = new Set([
  'restaurant',
  'cafe',
  'fast_food',
  'pub',
  'bar',
  'ice_cream',
  'pharmacy',
  'fuel',
  'car_wash',
  'nightclub',
  'biergarten',
  'food_court',
])
const BUERO_AMENITY = new Set([
  'townhall',
  'public_building',
  'police',
  'post_office',
  'bank',
  'courthouse',
  'community_centre',
  'social_facility',
  'library',
  'doctors',
  'dentist',
  'driving_school',
  'funeral_home',
  'prison',
  'crematorium',
])
const HALLE_AMENITY = new Set(['theatre', 'arts_centre', 'cinema', 'events_venue', 'social_centre', 'music_venue', 'conference_centre'])
const HALLE_LEISURE = new Set(['sports_centre', 'sports_hall', 'stadium', 'ice_rink', 'swimming_pool', 'fitness_centre'])
/** Arten, die erst mit einem Erdgeschoss allein hohe Raeume haben. */
const HOHES_EG = new Set(['laden', 'supermarkt', 'einkaufszentrum', 'halle', 'kirche', 'feuerwehr'])
/** Art eines Orts fuer ein Haus ohne shop= oder amenity= (wie in OSM). */
const ORT_ART = {
  feuerwehr: 'fire_station',
  spital: 'hospital',
  einkaufszentrum: 'mall',
  supermarkt: 'supermarket',
  schule: 'school',
  kindergarten: 'kindergarten',
  kirche: 'place_of_worship',
}
/** Bevorzugte Eingaenge (entrance=). */
const EINGANG_RANG = { main: 0, yes: 1, staircase: 2, home: 2, shop: 3, service: 4 }

/* ====================================================== Rechnen in 2D */

/** Auf 0,1 m, ohne -0. */
export const r1 = (v) => {
  const r = Math.round(v * 10) / 10
  return r === 0 ? 0 : r
}
const r3 = (v) => {
  const r = Math.round(v * 1000) / 1000
  return r === 0 ? 0 : r
}

/** Flaeche mit Vorzeichen (Schnuersenkel). */
export function flaeche(ring) {
  let s = 0
  for (let i = 0, n = ring.length; i < n; i++) {
    const a = ring[i]
    const b = ring[(i + 1) % n]
    s += a[0] * b[1] - b[0] * a[1]
  }
  return s / 2
}

function schwerpunkt(ring) {
  const f = flaeche(ring)
  if (Math.abs(f) < 1e-9) {
    let x = 0
    let z = 0
    for (const p of ring) {
      x += p[0]
      z += p[1]
    }
    return [x / ring.length, z / ring.length]
  }
  let cx = 0
  let cz = 0
  for (let i = 0, n = ring.length; i < n; i++) {
    const a = ring[i]
    const b = ring[(i + 1) % n]
    const k = a[0] * b[1] - b[0] * a[1]
    cx += (a[0] + b[0]) * k
    cz += (a[1] + b[1]) * k
  }
  return [cx / (6 * f), cz / (6 * f)]
}

/** Liegt p im Ring (Strahl nach rechts)? */
export function imRing(p, ring) {
  let innen = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i]
    const [xj, zj] = ring[j]
    if (zi > p[1] !== zj > p[1] && p[0] < ((xj - xi) * (p[1] - zi)) / (zj - zi) + xi) innen = !innen
  }
  return innen
}

/** Im Umriss und in keinem Loch. */
function imPolygon(p, aussen, loecher) {
  if (!imRing(p, aussen)) return false
  for (const l of loecher ?? []) if (imRing(p, l)) return false
  return true
}

/** Ein Punkt, der sicher im Ring liegt (Schwerpunkt, sonst Mitte einer
 *  waagrechten Linie durch den Ring). */
function innenPunkt(ring) {
  const c = schwerpunkt(ring)
  if (imRing(c, ring)) return c
  const b = box(ring)
  const zm = (b[1] + b[3]) / 2
  const xs = []
  for (let i = 0, n = ring.length; i < n; i++) {
    const a = ring[i]
    const e = ring[(i + 1) % n]
    if (a[1] > zm !== e[1] > zm) xs.push(a[0] + ((zm - a[1]) * (e[0] - a[0])) / (e[1] - a[1]))
  }
  xs.sort((p, q) => p - q)
  return xs.length >= 2 ? [(xs[0] + xs[1]) / 2, zm] : ring[0]
}

export function box(punkte) {
  let x0 = Infinity
  let z0 = Infinity
  let x1 = -Infinity
  let z1 = -Infinity
  for (const [x, z] of punkte) {
    if (x < x0) x0 = x
    if (x > x1) x1 = x
    if (z < z0) z0 = z
    if (z > z1) z1 = z
  }
  return [x0, z0, x1, z1]
}
const boxenNah = (a, b, rand) => a[0] - rand <= b[2] && b[0] - rand <= a[2] && a[1] - rand <= b[3] && b[1] - rand <= a[3]
const inBox = (p, b) => p[0] >= b[0] && p[0] <= b[2] && p[1] >= b[1] && p[1] <= b[3]

/** Abstand von p zur Strecke a-b und Anteil t des naechsten Punkts. */
function punktStrecke(p, a, b) {
  const dx = b[0] - a[0]
  const dz = b[1] - a[1]
  const l2 = dx * dx + dz * dz
  let t = l2 > 0 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2 : 0
  t = Math.max(0, Math.min(1, t))
  return { d: Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dz)), t }
}

/** Schnittpunkt der Strecken a-b und c-d als Anteil auf a-b, sonst null. */
function schnitt(a, b, c, d) {
  const rx = b[0] - a[0]
  const rz = b[1] - a[1]
  const sx = d[0] - c[0]
  const sz = d[1] - c[1]
  const den = rx * sz - rz * sx
  if (Math.abs(den) < 1e-12) return null
  const qx = c[0] - a[0]
  const qz = c[1] - a[1]
  const t = (qx * sz - qz * sx) / den
  const u = (qx * rz - qz * rx) / den
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : null
}

/** Kleinster Abstand zwischen den Strecken a-b und c-d, mit dem Anteil t
 *  des naechsten Punkts auf a-b. */
function streckeStrecke(a, b, c, d) {
  const s = schnitt(a, b, c, d)
  if (s !== null) return { d: 0, t: s }
  let best = { d: punktStrecke(a, c, d).d, t: 0 }
  const e = punktStrecke(b, c, d).d
  if (e < best.d) best = { d: e, t: 1 }
  const f = punktStrecke(c, a, b)
  if (f.d < best.d) best = f
  const g = punktStrecke(d, a, b)
  if (g.d < best.d) best = g
  return best
}

/** Abstand zweier Ringe; 0, wenn sie sich schneiden oder einer im anderen liegt. */
export function ringAbstand(a, b) {
  if (imRing(a[0], b) || imRing(b[0], a)) return 0
  let min = Infinity
  for (let i = 0; i < a.length; i++) {
    const p = a[i]
    const q = a[(i + 1) % a.length]
    for (let j = 0; j < b.length; j++) {
      const d = streckeStrecke(p, q, b[j], b[(j + 1) % b.length]).d
      if (d < min) min = d
      if (min === 0) return 0
    }
  }
  return min
}

function laenge(p) {
  let s = 0
  for (let i = 1; i < p.length; i++) s += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1])
  return s
}

/** Douglas-Peucker fuer eine offene Linie. */
export function vereinfachen(p, tol) {
  const n = p.length
  if (n <= 2) return p.slice()
  const behalten = new Uint8Array(n)
  behalten[0] = 1
  behalten[n - 1] = 1
  const stapel = [[0, n - 1]]
  while (stapel.length) {
    const [a, b] = stapel.pop()
    let max = -1
    let idx = -1
    for (let i = a + 1; i < b; i++) {
      const d = punktStrecke(p[i], p[a], p[b]).d
      if (d > max) {
        max = d
        idx = i
      }
    }
    if (idx >= 0 && max > tol) {
      behalten[idx] = 1
      stapel.push([a, idx], [idx, b])
    }
  }
  return p.filter((_, i) => behalten[i])
}

/** Douglas-Peucker fuer einen Ring (ohne doppelten Endpunkt): geteilt am
 *  ersten Punkt und dem Punkt, der am weitesten davon weg ist. */
export function vereinfachenRing(ring, tol) {
  if (ring.length < 4) return ring.slice()
  let weit = 0
  let max = -1
  for (let i = 1; i < ring.length; i++) {
    const d = Math.hypot(ring[i][0] - ring[0][0], ring[i][1] - ring[0][1])
    if (d > max) {
      max = d
      weit = i
    }
  }
  const a = vereinfachen(ring.slice(0, weit + 1), tol)
  const b = vereinfachen([...ring.slice(weit), ring[0]], tol)
  return [...a.slice(0, -1), ...b.slice(0, -1)]
}

/** Runden auf 0,1 m und Doppelte weg (bei Ringen auch der Schlusspunkt). */
export function saeubern(p, ring) {
  const out = []
  for (const q of p) {
    const r = [r1(q[0]), r1(q[1])]
    const l = out[out.length - 1]
    if (!l || l[0] !== r[0] || l[1] !== r[1]) out.push(r)
  }
  if (ring) {
    while (out.length > 1 && out[0][0] === out[out.length - 1][0] && out[0][1] === out[out.length - 1][1]) out.pop()
  }
  return out
}

/** Strecke a-b auf das Rechteck kappen (Liang-Barsky). null = ganz draussen. */
function streckeKappen(a, b, [x0, z0, x1, z1]) {
  let t0 = 0
  let t1 = 1
  const dx = b[0] - a[0]
  const dz = b[1] - a[1]
  const p = [-dx, dx, -dz, dz]
  const q = [a[0] - x0, x1 - a[0], a[1] - z0, z1 - a[1]]
  for (let k = 0; k < 4; k++) {
    if (p[k] === 0) {
      if (q[k] < 0) return null
    } else {
      const r = q[k] / p[k]
      if (p[k] < 0) {
        if (r > t1) return null
        if (r > t0) t0 = r
      } else {
        if (r < t0) return null
        if (r < t1) t1 = r
      }
    }
  }
  return { a: [a[0] + t0 * dx, a[1] + t0 * dz], b: [a[0] + t1 * dx, a[1] + t1 * dz], vonA: t0 === 0, bisB: t1 === 1 }
}

/** Eine Linie auf das Rechteck kappen: die Stuecke innen. */
export function linieKappen(p, rahmen) {
  const teile = []
  let akt = null
  for (let i = 0; i + 1 < p.length; i++) {
    const s = streckeKappen(p[i], p[i + 1], rahmen)
    if (!s) {
      if (akt) teile.push(akt)
      akt = null
      continue
    }
    if (akt && !s.vonA) {
      teile.push(akt)
      akt = null
    }
    if (!akt) akt = [s.a]
    akt.push(s.b)
    if (!s.bisB) {
      teile.push(akt)
      akt = null
    }
  }
  if (akt) teile.push(akt)
  return teile.filter((t) => t.length >= 2)
}

/** Einen Ring auf das Rechteck kappen (Sutherland-Hodgman). */
export function ringKappen(ring, [x0, z0, x1, z1]) {
  const sx = (a, b, x) => [x, a[1] + ((x - a[0]) / (b[0] - a[0])) * (b[1] - a[1])]
  const sz = (a, b, z) => [a[0] + ((z - a[1]) / (b[1] - a[1])) * (b[0] - a[0]), z]
  const kanten = [
    [(p) => p[0] >= x0, (a, b) => sx(a, b, x0)],
    [(p) => p[0] <= x1, (a, b) => sx(a, b, x1)],
    [(p) => p[1] >= z0, (a, b) => sz(a, b, z0)],
    [(p) => p[1] <= z1, (a, b) => sz(a, b, z1)],
  ]
  let out = ring
  for (const [innen, schnittpunkt] of kanten) {
    const ein = out
    out = []
    for (let i = 0; i < ein.length; i++) {
      const a = ein[(i + ein.length - 1) % ein.length]
      const b = ein[i]
      if (innen(b)) {
        if (!innen(a)) out.push(schnittpunkt(a, b))
        out.push(b)
      } else if (innen(a)) out.push(schnittpunkt(a, b))
    }
    if (!out.length) break
  }
  return out
}

/** Raster fuer schnelles Suchen nach Lage (Zelle in Metern). */
class Raster {
  constructor(zelle) {
    this.zelle = zelle
    this.karte = new Map()
  }
  einfuegen(b, wert) {
    const z = this.zelle
    for (let cx = Math.floor(b[0] / z); cx <= Math.floor(b[2] / z); cx++) {
      for (let cz = Math.floor(b[1] / z); cz <= Math.floor(b[3] / z); cz++) {
        const k = cx + ',' + cz
        const l = this.karte.get(k)
        if (l) l.push(wert)
        else this.karte.set(k, [wert])
      }
    }
  }
  suchen(b) {
    const z = this.zelle
    const out = new Set()
    for (let cx = Math.floor(b[0] / z); cx <= Math.floor(b[2] / z); cx++) {
      for (let cz = Math.floor(b[1] / z); cz <= Math.floor(b[3] / z); cz++) {
        for (const w of this.karte.get(cx + ',' + cz) ?? []) out.add(w)
      }
    }
    return out
  }
}

/* ====================================================== Lesen der Karte */

/** Ein Name: getrimmt, Leerraum zusammengefasst, hoechstens n Zeichen. */
function kurz(s, n = NAME_MAX) {
  if (typeof s !== 'string') return undefined
  const t = Array.from(s.trim().replace(/\s+/g, ' '))
  if (!t.length) return undefined
  return t.slice(0, n).join('').trim()
}

/** Geschosse aus building:levels, sonst aus height (3 m je Geschoss). */
function geschosseAusKarte(tags) {
  const l = /^\s*(\d+(?:[.,]\d+)?)/.exec(tags['building:levels'] ?? '')
  if (l) return Math.min(60, Math.max(1, Math.round(Number(l[1].replace(',', '.')))))
  const h = /^\s*(\d+(?:\.\d+)?)\s*(m)?\s*$/.exec(tags.height ?? '')
  if (h) return Math.min(60, Math.max(1, Math.round(Number(h[1]) / 3)))
  return null
}

/** Ringe aus Teilstuecken (Mitglieder einer Relation) zusammensetzen. */
function ringeBauen(teile) {
  const key = (p) => p.lat + ',' + p.lon
  const offen = teile.filter((t) => Array.isArray(t) && t.length >= 2 && t.every((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lon)))
  const ringe = []
  while (offen.length) {
    let ring = offen.shift().slice()
    for (let schutz = 0; key(ring[0]) !== key(ring[ring.length - 1]) && schutz < 100000; schutz++) {
      const ende = key(ring[ring.length - 1])
      const i = offen.findIndex((t) => key(t[0]) === ende || key(t[t.length - 1]) === ende)
      if (i < 0) break
      const t = offen.splice(i, 1)[0]
      ring = ring.concat(key(t[0]) === ende ? t.slice(1) : t.slice().reverse().slice(1))
    }
    if (ring.length >= 4 && key(ring[0]) === key(ring[ring.length - 1])) ringe.push(ring.slice(0, -1))
  }
  return ringe
}

/** Alle Flaechen der Karte: geschlossene Wege und Multipolygone, in Metern. */
function flaechenLesen(elemente, zuM) {
  const out = []
  for (const e of elemente) {
    const tags = e.tags ?? {}
    if (e.type === 'way') {
      const g = e.geometry
      if (!Array.isArray(g) || g.length < 4) continue
      const zu = Array.isArray(e.nodes) && e.nodes.length >= 4 ? e.nodes[0] === e.nodes[e.nodes.length - 1] : g[0]?.lat === g[g.length - 1]?.lat && g[0]?.lon === g[g.length - 1]?.lon
      if (!zu || g.some((p) => !p || !Number.isFinite(p.lat) || !Number.isFinite(p.lon))) continue
      out.push({ id: 'w' + e.id, osmWeg: e.id, tags, polys: [{ aussen: g.slice(0, -1).map(zuM), loecher: [] }] })
    } else if (e.type === 'relation' && (tags.type === 'multipolygon' || tags.type === 'building') && Array.isArray(e.members)) {
      const weg = (rolle) => e.members.filter((m) => m.type === 'way' && m.role === rolle).map((m) => m.geometry)
      const aussen = ringeBauen(weg('outer')).map((r) => r.map(zuM))
      const innen = ringeBauen(weg('inner')).map((r) => r.map(zuM))
      if (!aussen.length) continue
      const polys = aussen.map((a) => ({ aussen: a, loecher: [] }))
      for (const l of innen) {
        const p = polys.find((x) => imRing(l[0], x.aussen))
        if (p) p.loecher.push(l)
      }
      out.push({ id: 'r' + e.id, osmWeg: null, tags, polys })
    }
  }
  return out
}

/* ====================================================== Arten */

const istGebaeude = (t) => typeof t.building === 'string' && t.building !== 'no' && t.location !== 'underground'

/** Flaechen, deren Haeuser zu etwas gehoeren (Spital, Feuerwehr, ...). */
function bereichArt(t) {
  if (t.amenity === 'hospital' || t.healthcare === 'hospital') return 'spital'
  if (t.amenity === 'fire_station') return 'feuerwehr'
  if (t.shop === 'mall') return 'einkaufszentrum'
  if (t.amenity === 'school' || t.amenity === 'college' || t.amenity === 'university') return 'schule'
  if (t.amenity === 'kindergarten' || t.amenity === 'childcare') return 'kindergarten'
  if (t.amenity === 'place_of_worship') return 'kirche'
  return null
}
const LANDUSE_HAUS = new Set(['industrial', 'commercial', 'retail', 'residential', 'farmyard', 'garages'])
/** Kleinere Haeuser in einer solchen Flaeche (m2) bleiben, was sie sind. */
const BEREICH_MIN_M2 = 80

/** Art eines Hauses aus seinen Tags, den Flaechen, in denen es liegt
 *  (u.bereiche), den Orten darin (u.knoten), der Nutzung ringsum
 *  (u.landuse), seiner Grundflaeche (u.flaeche) und den Geschossen aus der
 *  Karte (u.geschosse, sonst null). gemischt: Wohnhaus mit Geschaeften. */
export function hausArt(t, u) {
  const b = t.building
  const a = t.amenity
  const s = t.shop
  const nAmenity = new Set(u.knoten.map((k) => k.amenity).filter(Boolean))
  const nShop = u.knoten.map((k) => k.shop).filter((x) => x && x !== 'vacant')
  const nGastro = u.knoten.some((k) => LADEN_AMENITY.has(k.amenity))
  const wohnt = WOHN.has(b) || HAUS.has(b)
  const klein = GARAGE.has(b) || SCHUPPEN.has(b)
  const offen = !wohnt && !klein
  // In einer Flaeche (Spital, Feuerwehr ...) zaehlen nur Haeuser, die kein
  // Wohnhaus, keine Garage, kein Schuppen und nicht winzig sind.
  const drin = (art) => offen && u.flaeche >= BEREICH_MIN_M2 && u.bereiche.has(art)
  if (a === 'fire_station' || b === 'fire_station' || nAmenity.has('fire_station') || drin('feuerwehr')) return 'feuerwehr'
  if (a === 'hospital' || t.healthcare === 'hospital' || b === 'hospital' || nAmenity.has('hospital') || drin('spital')) return 'spital'
  if (a === 'clinic' || t.healthcare === 'clinic' || b === 'clinic') return 'spital'
  if (s === 'mall' || b === 'mall' || drin('einkaufszentrum')) return 'einkaufszentrum'
  if (s === 'supermarket' || b === 'supermarket') return 'supermarkt'
  if (b === 'school' || b === 'college' || b === 'university' || a === 'school' || a === 'college' || a === 'university') return 'schule'
  if (drin('schule')) return 'schule'
  if (b === 'kindergarten' || a === 'kindergarten' || a === 'childcare' || drin('kindergarten')) return 'kindergarten'
  if (KIRCHE.has(b) || a === 'place_of_worship' || drin('kirche')) return 'kirche'
  if (s && s !== 'vacant') return 'laden'
  if (LADEN_AMENITY.has(a)) return 'laden'
  if (BUERO_AMENITY.has(a)) return 'buero'
  if (HALLE_AMENITY.has(a) || HALLE_LEISURE.has(t.leisure)) return 'halle'
  if (a === 'parking') return 'garage'
  // Geschaefte darin: ein flaches Haus ist ein Laden, ein hohes ein
  // Wohnhaus mit Geschaeften unten (die stehen dann in laeden).
  if (offen && !SONST.has(b) && (nShop.length || nGastro)) {
    // Supermaerkte sind auch gross meist flach; nur mit 3 Geschossen aus
    // der Karte ist es ein Wohnhaus mit Markt unten.
    if (nShop.includes('supermarket') && !(u.geschosse !== null && u.geschosse >= 3)) return 'supermarkt'
    const hoch = u.geschosse !== null ? u.geschosse >= 3 : u.flaeche >= 400 && b !== 'retail' && u.landuse !== 'retail' && u.landuse !== 'commercial'
    if (!hoch) return 'laden'
  }
  if (WOHN.has(b)) return 'wohnen'
  if (HAUS.has(b)) return 'haus'
  if (GARAGE.has(b)) return 'garage'
  if (SCHUPPEN.has(b)) return 'schuppen'
  if (b === 'retail' || b === 'kiosk') return 'laden'
  if (BUERO.has(b)) return 'buero'
  if (HALLE.has(b)) return 'halle'
  if (SONST.has(b)) return 'sonst'
  // building=yes und Unbekanntes: Nutzung ringsum und Groesse.
  if (u.landuse === 'industrial') return 'halle'
  if (u.landuse === 'commercial') return 'buero'
  if (u.landuse === 'retail') return 'laden'
  if (u.landuse === 'garages') return 'garage'
  const f = u.flaeche
  if (f < 30) return 'schuppen'
  if (u.geschosse === 1 && f > 300) return 'halle'
  if (u.landuse === 'farmyard') return f < 250 ? 'haus' : 'halle'
  if (f < 220) return u.geschosse !== null && u.geschosse >= 3 ? 'wohnen' : 'haus'
  if (u.geschosse === null && f > 3000) return 'halle'
  return 'wohnen'
}

/** Geschosse ohne Angabe in der Karte, nach Art und Grundflaeche (m2). */
export function geschosseSchaetzen(art, f) {
  switch (art) {
    case 'garage':
    case 'schuppen':
    case 'kindergarten':
    case 'kirche':
    case 'halle':
    case 'laden':
    case 'supermarkt':
      return 1
    case 'haus':
      return 2
    case 'wohnen':
      return f < 250 ? 3 : f < 600 ? 4 : 5
    case 'einkaufszentrum':
      return 2
    case 'spital':
      return 4
    case 'schule':
      return f < 1500 ? 2 : 3
    case 'feuerwehr':
      return 2
    case 'buero':
      return f < 300 ? 2 : 3
    default:
      return f < 30 ? 1 : f < 150 ? 2 : f < 500 ? 3 : 4
  }
}

function geschossHoehe(art, geschosse) {
  if (art === 'spital') return 3.4
  if (art === 'einkaufszentrum') return 4.5
  if (geschosse === 1 && HOHES_EG.has(art)) return 4.5
  return 3
}

function dachArt(t, art) {
  switch (t['roof:shape']) {
    case 'flat':
    case 'many':
    case 'dome':
    case 'onion':
      return 'flach'
    case 'gabled':
    case 'half-hipped':
    case 'skillion':
    case 'gambrel':
    case 'saltbox':
    case 'round':
    case 'side_hipped':
      return 'sattel'
    case 'hipped':
    case 'pyramidal':
    case 'mansard':
    case 'cone':
      return 'walm'
    default:
      return art === 'haus' || art === 'kirche' ? 'sattel' : 'flach'
  }
}

function flaechenArt(t) {
  if (istGebaeude(t)) return null
  if (t.leisure === 'swimming_pool' || t.leisure === 'water_park') return 'schwimmbad'
  if (['pitch', 'sports_centre', 'stadium', 'track', 'ice_rink', 'miniature_golf', 'fitness_station', 'golf_course'].includes(t.leisure)) return 'sport'
  if (t.leisure === 'playground') return 'spielplatz'
  if (['park', 'garden', 'dog_park'].includes(t.leisure)) return 'park'
  if (t.amenity === 'parking' && t.parking !== 'underground' && t.parking !== 'multi-storey' && t.parking !== 'rooftop') return 'parkplatz'
  if (t.landuse === 'cemetery' || t.amenity === 'grave_yard') return 'friedhof'
  if (t.landuse === 'forest' || t.natural === 'wood' || t.natural === 'scrub') return 'wald'
  if (['grass', 'meadow', 'village_green'].includes(t.landuse) || t.natural === 'grassland' || t.natural === 'heath') return 'wiese'
  if (t.landuse === 'recreation_ground' || t.landuse === 'allotments') return 'park'
  if (['farmland', 'orchard', 'vineyard', 'plant_nursery'].includes(t.landuse)) return 'acker'
  if (t.natural === 'water' || t.landuse === 'basin' || t.landuse === 'reservoir' || t.waterway === 'riverbank') return 'wasser'
  if (['commercial', 'retail', 'industrial'].includes(t.landuse)) return 'gewerbe'
  if (t.landuse === 'residential') return 'wohngebiet'
  if (['cliff', 'bare_rock', 'shingle', 'scree', 'rock'].includes(t.natural)) return 'fels'
  if (t.landuse === 'garages') return 'parkplatz'
  return null
}

const ZAUN = { wall: 'mauer', retaining_wall: 'mauer', city_wall: 'mauer', fence: 'zaun', hedge: 'hecke' }

/* ====================================================== Gelaende */

/** Rechteck um alles, was zur Siedlung gehoert (Haeuser, Spielplatz, Wege,
 *  Tiefgarage), mit EBEN_RAND_M Rand. */
export function siedlungsBox(s) {
  const pts = []
  for (const g of s.gebaeude ?? []) pts.push(...g.umriss)
  const a = s.aussen ?? {}
  if (Array.isArray(a.spielplatz)) pts.push(...a.spielplatz)
  for (const w of a.wege ?? []) pts.push(...w)
  if (a.tiefgarage) {
    const t = a.tiefgarage
    const r = Math.hypot(t.breite, t.laenge) / 2
    pts.push([t.x - r, t.z - r], [t.x + r, t.z + r])
  }
  const b = box(pts)
  return [b[0] - EBEN_RAND_M, b[1] - EBEN_RAND_M, b[2] + EBEN_RAND_M, b[3] + EBEN_RAND_M]
}

/** Mittlere Hoehe unter den Haeusern der Siedlung (Gitter von 2 m in
 *  jedem Umriss; zu kleine Umrisse mit ihren Ecken). */
function referenzHoehe(ringe, meer) {
  let summe = 0
  let n = 0
  for (const ring of ringe) {
    const [x0, z0, x1, z1] = box(ring)
    let k = 0
    for (let x = x0 + 1; x < x1; x += 2) {
      for (let z = z0 + 1; z < z1; z += 2) {
        if (imRing([x, z], ring)) {
          summe += meer(x, z)
          n++
          k++
        }
      }
    }
    if (!k) {
      for (const p of ring) {
        summe += meer(p[0], p[1])
        n++
      }
    }
  }
  return summe / n
}

/** Wie viel vom echten Gelaende an einem Gitterpunkt bleibt (0..1). Eben
 *  ist jeder Gitterpunkt, dessen Zelle die Siedlung beruehren kann (naeher
 *  als ein Gitterschritt in x und z): dann ist auch das bilinear
 *  gerechnete Gelaende ueberall in der Siedlung genau 0. Danach steigt es
 *  ueber UEBERGANG_M gerade an. */
function gelaendeAnteil(x, z, kern, schritt) {
  const dx = Math.max(kern[0] - x, 0, x - kern[2])
  const dz = Math.max(kern[1] - z, 0, z - kern[3])
  if (dx < schritt && dz < schritt) return 0
  return Math.min(Math.hypot(Math.max(dx - schritt, 0), Math.max(dz - schritt, 0)) / UEBERGANG_M, 1)
}

/* ====================================================== Umwandeln */

function eingabenPruefen(osm, hoehen, s) {
  if (!osm || !Array.isArray(osm.elements)) throw new Error('--osm: keine Overpass-Antwort (elements fehlt)')
  const h = hoehen
  if (!h || !(h.schritt > 0) || !Number.isInteger(h.nx) || !Number.isInteger(h.nz) || h.nx < 2 || h.nz < 2) throw new Error('--hoehen: Gitter unvollstaendig')
  if (!Number.isFinite(h.x0) || !Number.isFinite(h.z0) || !Array.isArray(h.m) || h.m.length !== h.nx * h.nz) throw new Error('--hoehen: Gitter passt nicht zu nx, nz')
  if (!h.m.every(Number.isFinite)) throw new Error('--hoehen: Werte ohne Zahl')
  if (!s || !Number.isFinite(s.lat) || !Number.isFinite(s.lon)) throw new Error('--siedlung: lat/lon fehlt')
  if (!Array.isArray(s.gebaeude) || !s.gebaeude.length) throw new Error('--siedlung: keine Haeuser')
}

/** Baut die Stadt. Eingaben wie oben (schon gelesen), rahmen optional.
 *  Gibt { stadt, zahlen } zurueck; zahlen sind nur Zaehler, nie Namen
 *  oder Koordinaten. Wirft, wenn die Stadt auch verkleinert zu gross ist. */
export function stadtAusOsm({ osm, hoehen, siedlung, rahmen: rahmenWunsch = null, stand = null }) {
  eingabenPruefen(osm, hoehen, siedlung)
  const ort = lokal(siedlung.lat, siedlung.lon)
  const zuM = (p) => ort.nachMeter(p.lat, p.lon)
  const z = {
    haeuserArt: {},
    wegenSiedlung: 0,
    ausserhalb: 0,
    zuKlein: 0,
    tuerEingang: 0,
    tuerWeg: 0,
    tuerNotfall: 0,
    gemischt: 0,
  }

  /* ---------------------------------------------- 1. Gelaende */
  const s = hoehen.schritt
  // Hoehe ueber dem Meer, bilinear wie die App (Meter als Dezimeter).
  const roh = { x0: hoehen.x0, z0: hoehen.z0, schritt: s, nx: hoehen.nx, nz: hoehen.nz, dm: hoehen.m.map((v) => v * 10) }
  const meer = (x, zz) => gelaendeHoehe(roh, x, zz)
  const sRinge = siedlung.gebaeude.map((g) => g.umriss)
  const ref = referenzHoehe(sRinge, meer)
  const kern = siedlungsBox(siedlung)
  const gitterRahmen = [hoehen.x0, hoehen.z0, hoehen.x0 + (hoehen.nx - 1) * s, hoehen.z0 + (hoehen.nz - 1) * s]
  const rahmen = (rahmenWunsch ?? gitterRahmen).map(r1)
  // Das Gitter auf den Rahmen zuschneiden (ganze Zellen, die ihn decken).
  const i0 = Math.max(0, Math.floor((rahmen[0] - hoehen.x0) / s))
  const i1 = Math.min(hoehen.nx - 1, Math.ceil((rahmen[2] - hoehen.x0) / s))
  const j0 = Math.max(0, Math.floor((rahmen[1] - hoehen.z0) / s))
  const j1 = Math.min(hoehen.nz - 1, Math.ceil((rahmen[3] - hoehen.z0) / s))
  if (i1 <= i0 || j1 <= j0) throw new Error('--rahmen liegt nicht im Gitter der Hoehen')
  const dm = []
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      const x = hoehen.x0 + i * s
      const zz = hoehen.z0 + j * s
      const v = Math.round((hoehen.m[j * hoehen.nx + i] - ref) * gelaendeAnteil(x, zz, kern, s) * 10)
      dm.push(Math.max(-20000, Math.min(20000, v)) || 0)
    }
  }
  const gelaende = { x0: hoehen.x0 + i0 * s, z0: hoehen.z0 + j0 * s, schritt: s, nx: i1 - i0 + 1, nz: j1 - j0 + 1, dm }
  const boden = (x, zz) => gelaendeHoehe(gelaende, x, zz)

  /* ---------------------------------------------- 2. Karte lesen */
  const elemente = osm.elements
  const flaechenRoh = flaechenLesen(elemente, zuM)
  const siedlungWege = new Set()
  for (const g of siedlung.gebaeude) {
    const m = /osm:way\/(\d+)/.exec(g.quelle ?? '')
    if (m) siedlungWege.add(Number(m[1]))
  }
  const sBoxen = sRinge.map(box)

  // Bereiche (Spital, Feuerwehr, Einkaufszentrum ...) und Nutzung ringsum.
  const bereiche = []
  const nutzung = []
  for (const f of flaechenRoh) {
    const art = istGebaeude(f.tags) ? null : bereichArt(f.tags)
    const lu = LANDUSE_HAUS.has(f.tags.landuse) ? f.tags.landuse : null
    for (const p of f.polys) {
      const eintrag = { art, landuse: lu, tags: f.tags, aussen: p.aussen, loecher: p.loecher, box: box(p.aussen), flaeche: Math.abs(flaeche(p.aussen)) }
      if (art) bereiche.push(eintrag)
      if (lu) nutzung.push(eintrag)
    }
  }
  const bereichRaster = new Raster(100)
  bereiche.forEach((b, i) => bereichRaster.einfuegen(b.box, i))
  const nutzungRaster = new Raster(100)
  nutzung.forEach((b, i) => nutzungRaster.einfuegen(b.box, i))

  // Knoten: Orte (shop, amenity), Eingaenge, Baeume.
  const orteRoh = []
  const eingaenge = []
  const baeumeRoh = []
  for (const e of elemente) {
    if (e.type !== 'node' || !e.tags || !Number.isFinite(e.lat) || !Number.isFinite(e.lon)) continue
    const p = zuM(e)
    if (e.tags.natural === 'tree') baeumeRoh.push(p)
    if (typeof e.tags.entrance === 'string' && e.tags.entrance !== 'no') eingaenge.push({ p, rang: EINGANG_RANG[e.tags.entrance] ?? 5 })
    if (e.tags.shop || e.tags.amenity || e.tags.healthcare) orteRoh.push({ p, tags: e.tags, haus: null })
  }
  const eingangRaster = new Raster(50)
  eingaenge.forEach((g, i) => eingangRaster.einfuegen([g.p[0], g.p[1], g.p[0], g.p[1]], i))

  /* ---------------------------------------------- 3. Haeuser */
  const kandidaten = []
  for (const f of flaechenRoh) {
    if (!istGebaeude(f.tags)) continue
    if (f.osmWeg !== null && siedlungWege.has(f.osmWeg)) {
      z.wegenSiedlung += f.polys.length
      continue
    }
    f.polys.forEach((p, k) => {
      const b = box(p.aussen)
      const nahSiedlung = sRinge.some((r, i) => boxenNah(b, sBoxen[i], SIEDLUNG_ABSTAND_M) && ringAbstand(p.aussen, r) <= SIEDLUNG_ABSTAND_M)
      if (nahSiedlung) {
        z.wegenSiedlung++
        return
      }
      if (!p.aussen.every((q) => inBox(q, rahmen))) {
        z.ausserhalb++
        return
      }
      kandidaten.push({ id: k === 0 ? f.id : `${f.id}_${k + 1}`, tags: f.tags, aussen: p.aussen, loecher: p.loecher, box: b, knoten: [] })
    })
  }
  const hausRaster = new Raster(50)
  kandidaten.forEach((h, i) => hausRaster.einfuegen(h.box, i))
  // Orte in Haeusern.
  for (const o of orteRoh) {
    for (const i of hausRaster.suchen([o.p[0], o.p[1], o.p[0], o.p[1]])) {
      const h = kandidaten[i]
      if (imPolygon(o.p, h.aussen, h.loecher)) {
        h.knoten.push(o.tags)
        o.haus = h
        break
      }
    }
  }

  // Wege fuer die Tuer: alle Strecken befahrbarer oder begehbarer Wege.
  const wegStrecken = []
  const wegRaster = new Raster(40)
  for (const e of elemente) {
    if (e.type !== 'way' || !TUER_WEGE.has(e.tags?.highway) || !Array.isArray(e.geometry)) continue
    if (e.tags.tunnel && e.tags.tunnel !== 'no' && e.tags.tunnel !== 'building_passage') continue
    const p = e.geometry.filter(Boolean).map(zuM)
    for (let i = 0; i + 1 < p.length; i++) {
      wegRaster.einfuegen(box([p[i], p[i + 1]]), wegStrecken.length)
      wegStrecken.push([p[i], p[i + 1]])
    }
  }

  /** Die Haustuer: ein Eingang aus der Karte auf dem Umriss, sonst die
   *  Stelle des Umrisses, die dem naechsten Weg am naechsten ist (nur
   *  Kanten, auf die die Tuer passt), sonst die Mitte der laengsten Kante. */
  function tuerFinden(umriss, art, hb) {
    const tb = tuerBreite(art)
    const n = umriss.length
    const kanten = []
    for (let k = 0; k < n; k++) {
      const a = umriss[k]
      const b = umriss[(k + 1) % n]
      kanten.push({ k, a, b, l: Math.hypot(b[0] - a[0], b[1] - a[1]) })
    }
    const passen = (e, t) => {
      const rand = (tb / 2 + 0.3) / e.l
      return rand >= 0.5 ? 0.5 : Math.min(Math.max(t, rand), 1 - rand)
    }
    // 1. Eingang aus der Karte (hoechstens 1 m neben dem vereinfachten Umriss).
    let best = null
    for (const i of eingangRaster.suchen([hb[0] - 1, hb[1] - 1, hb[2] + 1, hb[3] + 1])) {
      const g = eingaenge[i]
      for (const e of kanten) {
        if (e.l < tb) continue
        const r = punktStrecke(g.p, e.a, e.b)
        if (r.d > 1) continue
        if (!best || g.rang < best.rang || (g.rang === best.rang && r.d < best.d)) best = { rang: g.rang, d: r.d, k: e.k, t: passen(e, r.t) }
      }
    }
    if (best) {
      z.tuerEingang++
      return { kante: best.k, t: r3(best.t) }
    }
    // 2. Naechster Weg.
    const lang = kanten.filter((e) => e.l >= tb + TUER_SPIEL_M)
    for (const weit of [60, 250]) {
      if (!lang.length) break
      const strecken = wegRaster.suchen([hb[0] - weit, hb[1] - weit, hb[2] + weit, hb[3] + weit])
      if (!strecken.size) continue
      let min = null
      for (const e of lang) {
        for (const si of strecken) {
          const [c, d] = wegStrecken[si]
          const r = streckeStrecke(e.a, e.b, c, d)
          if (!min || r.d < min.d - 1e-9) min = { d: r.d, k: e.k, t: passen(e, r.t) }
        }
      }
      if (min) {
        z.tuerWeg++
        return { kante: min.k, t: r3(min.t) }
      }
    }
    // 3. Mitte der laengsten Kante.
    z.tuerNotfall++
    const l = kanten.reduce((x, y) => (y.l > x.l ? y : x))
    return { kante: l.k, t: 0.5 }
  }

  const haeuser = []
  const hausFertig = new Map()
  for (const h of kandidaten) {
    const umriss = saeubern(vereinfachenRing(h.aussen, VEREINFACHEN_M), true)
    if (umriss.length < 3 || Math.abs(flaeche(umriss)) < 2) {
      z.zuKlein++
      continue
    }
    const loecher = h.loecher.map((l) => saeubern(vereinfachenRing(l, VEREINFACHEN_M), true)).filter((l) => l.length >= 3 && Math.abs(flaeche(l)) >= 1)
    const grund = Math.abs(flaeche(h.aussen)) - h.loecher.reduce((acc, l) => acc + Math.abs(flaeche(l)), 0)
    const mitte = innenPunkt(h.aussen)
    const inBereichen = new Set()
    const bereichNamen = new Map()
    for (const i of bereichRaster.suchen([mitte[0], mitte[1], mitte[0], mitte[1]])) {
      const b = bereiche[i]
      if (imPolygon(mitte, b.aussen, b.loecher)) {
        inBereichen.add(b.art)
        const n = kurz(b.tags.name)
        if (n && !bereichNamen.has(b.art)) bereichNamen.set(b.art, n)
      }
    }
    let landuse = null
    let landuseFlaeche = Infinity
    for (const i of nutzungRaster.suchen([mitte[0], mitte[1], mitte[0], mitte[1]])) {
      const b = nutzung[i]
      if (b.flaeche < landuseFlaeche && imPolygon(mitte, b.aussen, b.loecher)) {
        landuse = b.landuse
        landuseFlaeche = b.flaeche
      }
    }
    const ausKarte = geschosseAusKarte(h.tags)
    const art = hausArt(h.tags, { bereiche: inBereichen, knoten: h.knoten, landuse, flaeche: grund, geschosse: ausKarte })
    const geschosse = ausKarte ?? geschosseSchaetzen(art, grund)
    const tuer = tuerFinden(umriss, art, h.box)
    const a = umriss[tuer.kante]
    const b = umriss[(tuer.kante + 1) % umriss.length]
    const tuerPunkt = [a[0] + tuer.t * (b[0] - a[0]), a[1] + tuer.t * (b[1] - a[1])]
    const haus = {
      id: h.id,
      umriss,
      ...(loecher.length ? { loecher } : {}),
      art,
      geschosse,
      geschossHoehe: geschossHoehe(art, geschosse),
      dach: dachArt(h.tags, art),
      boden: r1(boden(tuerPunkt[0], tuerPunkt[1])),
    }
    // Name: eigener, sonst der der Flaeche ringsum, wenn das Haus dazu
    // gehoert (Einkaufszentrum, Feuerwehr, Spital ...), sonst (nicht bei
    // Wohnhaeusern) der eines Orts darin.
    const wohnArt = art === 'wohnen' || art === 'haus'
    const benannt = h.knoten.filter((k) => kurz(k.name) && k.shop !== 'vacant')
    const vorrang = (k) => (k.amenity === 'fire_station' || k.amenity === 'hospital' ? 0 : k.shop === 'supermarket' ? 1 : k.shop ? 2 : 3)
    const knotenName = wohnArt ? undefined : kurz(benannt.slice().sort((x, y) => vorrang(x) - vorrang(y) || kurz(x.name).localeCompare(kurz(y.name)))[0]?.name)
    const name = kurz(h.tags.name) ?? bereichNamen.get(art) ?? knotenName
    if (name) haus.name = name
    // Geschaefte: im Einkaufszentrum und in Wohnhaeusern mit Laeden unten.
    if (art === 'einkaufszentrum' || (wohnArt && h.knoten.some((k) => k.shop))) {
      const gesehen = new Set()
      const laeden = []
      for (const k of h.knoten) {
        const n = kurz(k.name)
        const sa = typeof k.shop === 'string' ? k.shop.split(';')[0].trim().slice(0, 60) : ''
        if (!n || !sa || sa === 'vacant' || gesehen.has(n + '|' + sa)) continue
        gesehen.add(n + '|' + sa)
        laeden.push({ name: n, art: sa })
      }
      laeden.sort((x, y) => x.name.localeCompare(y.name))
      if (laeden.length) {
        haus.laeden = laeden.slice(0, 200)
        if (wohnArt) z.gemischt++
      }
    }
    haus.tuer = tuer
    const farbe = h.tags['building:colour']
    if (typeof farbe === 'string' && /^#[0-9a-fA-F]{6}$/.test(farbe.trim())) haus.farbe = farbe.trim().toLowerCase()
    haeuser.push(haus)
    hausFertig.set(h, { haus, tuerPunkt })
    z.haeuserArt[art] = (z.haeuserArt[art] ?? 0) + 1
  }

  /* ---------------------------------------------- 4. Strassen und Linien */
  const strassen = []
  const gewaesser = []
  const zaeune = []
  const baumreihen = []
  /** Linie in Metern -> vereinfacht, gekappt, gerundet; Stuecke ab 0,5 m. */
  const linie = (geo) => {
    const p = geo.filter((q) => q && Number.isFinite(q.lat) && Number.isFinite(q.lon)).map(zuM)
    if (p.length < 2) return []
    return linieKappen(vereinfachen(p, VEREINFACHEN_M), rahmen)
      .map((t) => saeubern(t, false))
      .filter((t) => t.length >= 2 && laenge(t) >= 0.5)
  }
  for (const e of elemente) {
    if (e.type !== 'way' || !e.tags || !Array.isArray(e.geometry)) continue
    const t = e.tags
    const name = kurz(t.name)
    const bruecke = typeof t.bridge === 'string' && t.bridge !== 'no'
    const tunnel = typeof t.tunnel === 'string' && t.tunnel !== 'no' && t.tunnel !== 'building_passage'
    const hw = STRASSEN[t.highway?.replace(/_link$/, '')]
    const istGleis = GLEISE.has(t.railway)
    if ((hw && t.area !== 'yes' && t.indoor !== 'yes') || istGleis) {
      const [art, breite] = istGleis ? ['gleis', 1.5] : hw
      for (const punkte of linie(e.geometry)) {
        strassen.push({ art, breite, punkte, ...(name ? { name } : {}), ...(bruecke ? { bruecke: true } : {}), ...(tunnel ? { tunnel: true } : {}) })
      }
    }
    const ww = t.waterway
    if (ww && !tunnel && !['weir', 'dam', 'lock_gate', 'riverbank', 'dock', 'boatyard', 'waterfall'].includes(ww)) {
      const breite = ww === 'river' ? 25 : ww === 'stream' ? 3 : 2
      for (const punkte of linie(e.geometry)) gewaesser.push({ breite, punkte })
    }
    if (ZAUN[t.barrier]) {
      for (const punkte of linie(e.geometry)) zaeune.push({ art: ZAUN[t.barrier], punkte })
    }
    if (t.natural === 'tree_row') baumreihen.push(e.geometry.filter(Boolean).map(zuM))
  }

  /* ---------------------------------------------- 5. Flaechen */
  const flaechen = []
  for (const f of flaechenRoh) {
    const art = flaechenArt(f.tags)
    if (!art) continue
    for (const p of f.polys) {
      const ring = saeubern(ringKappen(vereinfachenRing(p.aussen, VEREINFACHEN_M), rahmen), true)
      if (ring.length >= 3 && Math.abs(flaeche(ring)) >= 1) flaechen.push({ art, punkte: ring })
    }
  }
  // Grosse zuerst, damit kleine beim Zeichnen oben liegen.
  flaechen.sort((a, b) => Math.abs(flaeche(b.punkte)) - Math.abs(flaeche(a.punkte)))

  /* ---------------------------------------------- 6. Baeume */
  const baeume = []
  const baumGesehen = new Set()
  const baum = (p) => {
    if (!inBox(p, rahmen)) return
    const q = [r1(p[0]), r1(p[1])]
    const k = q[0] + ',' + q[1]
    if (baumGesehen.has(k)) return
    baumGesehen.add(k)
    baeume.push(q)
  }
  for (const p of baeumeRoh) baum(p)
  for (const r of baumreihen) {
    for (let i = 0; i + 1 < r.length; i++) {
      const l = Math.hypot(r[i + 1][0] - r[i][0], r[i + 1][1] - r[i][1])
      for (let d = 0; d < l; d += BAUMREIHE_M) baum([r[i][0] + ((r[i + 1][0] - r[i][0]) * d) / l, r[i][1] + ((r[i + 1][1] - r[i][1]) * d) / l])
    }
    if (r.length) baum(r[r.length - 1])
  }

  /* ---------------------------------------------- 7. Orte */
  const orte = []
  const ortGesehen = []
  const ortDazu = (name, art, p, haus) => {
    if (!name || !art || !inBox(p, rahmen)) return
    const a = String(art).split(';')[0].trim().slice(0, 60)
    if (!a || a === 'vacant') return
    if (ortGesehen.some((o) => o.name === name && o.art === a && Math.hypot(o.x - p[0], o.z - p[1]) < 50)) return
    const o = { name, art: a, x: r1(p[0]), z: r1(p[1]), ...(haus ? { haus } : {}) }
    ortGesehen.push(o)
    orte.push(o)
  }
  // Haeuser mit Namen (vor der Tuer), dann Knoten, dann Flaechen.
  for (const [h, { haus, tuerPunkt }] of hausFertig) {
    if (!haus.name) continue
    const art = h.tags.shop ?? h.tags.amenity ?? h.tags.leisure ?? ORT_ART[haus.art] ?? h.tags.building
    ortDazu(haus.name, art, tuerPunkt, haus.id)
  }
  for (const o of orteRoh) {
    const fertig = o.haus ? hausFertig.get(o.haus) : null
    ortDazu(kurz(o.tags.name), o.tags.shop ?? o.tags.amenity ?? o.tags.healthcare, o.p, fertig?.haus.id)
  }
  for (const f of flaechenRoh) {
    if (istGebaeude(f.tags)) continue
    const art = f.tags.shop ?? f.tags.amenity ?? (['park', 'sports_centre', 'stadium', 'playground', 'swimming_pool', 'water_park'].includes(f.tags.leisure) ? f.tags.leisure : null)
    const name = kurz(f.tags.name)
    if (!art || !name) continue
    const p = innenPunkt(f.polys[0].aussen)
    let haus
    for (const i of hausRaster.suchen([p[0], p[1], p[0], p[1]])) {
      const h = kandidaten[i]
      if (hausFertig.has(h) && imPolygon(p, h.aussen, h.loecher)) haus = hausFertig.get(h).haus.id
    }
    ortDazu(name, art, p, haus)
  }

  const stadt = {
    art: 'kistly-stadt',
    v: 1,
    stand: standAus(stand, osm),
    rahmen,
    gelaende,
    haeuser,
    strassen,
    flaechen,
    gewaesser,
    zaeune,
    baeume: baeume.slice(0, 50000),
    orte: orte.slice(0, 5000),
  }
  const bytes = verkleinern(stadt)

  let dmMin = Infinity
  let dmMax = -Infinity
  for (const v of dm) {
    if (v < dmMin) dmMin = v
    if (v > dmMax) dmMax = v
  }
  const zahlen = {
    ...z,
    haeuser: haeuser.length,
    maxGeschosse: haeuser.reduce((m, h) => Math.max(m, h.geschosse), 0),
    strassen: stadt.strassen.length,
    flaechen: stadt.flaechen.length,
    gewaesser: stadt.gewaesser.length,
    zaeune: stadt.zaeune.length,
    baeume: stadt.baeume.length,
    orte: stadt.orte.length,
    gitter: `${gelaende.nx}x${gelaende.nz}`,
    gelaendeMinM: dmMin / 10,
    gelaendeMaxM: dmMax / 10,
    bytes,
  }
  return { stadt, zahlen }
}

function standAus(stand, osm) {
  if (typeof stand === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(stand)) return stand
  const t = osm?.osm3s?.timestamp_osm_base
  if (typeof t === 'string' && /^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10)
  return new Date().toISOString().slice(0, 10)
}

const groesse = (stadt) => Buffer.byteLength(JSON.stringify(stadt), 'utf8')

/** Ist die Stadt groesser als ZIEL_BYTES, wird sie stufenweise groeber:
 *  Flaechen, Zaeune und kleine Wege staerker vereinfacht, dann winzige
 *  Flaechen weg. Haeuser, Strassen und Orte bleiben genau. Gibt die
 *  Groesse zurueck; wirft, wenn es nicht reicht. */
function verkleinern(stadt) {
  let bytes = groesse(stadt)
  const stufen = [
    () => {
      stadt.flaechen = stadt.flaechen.map((f) => ({ ...f, punkte: saeubern(vereinfachenRing(f.punkte, 1), true) })).filter((f) => f.punkte.length >= 3)
    },
    () => {
      stadt.zaeune = stadt.zaeune.map((x) => ({ ...x, punkte: saeubern(vereinfachen(x.punkte, 1), false) })).filter((x) => x.punkte.length >= 2)
      stadt.flaechen = stadt.flaechen.filter((f) => Math.abs(flaeche(f.punkte)) >= 25)
    },
    () => {
      stadt.flaechen = stadt.flaechen.map((f) => ({ ...f, punkte: saeubern(vereinfachenRing(f.punkte, 2.5), true) })).filter((f) => f.punkte.length >= 3)
      stadt.strassen = stadt.strassen.map((x) => (x.art === 'fuss' || x.art === 'dienst' || x.art === 'feldweg' ? { ...x, punkte: saeubern(vereinfachen(x.punkte, 1), false) } : x))
    },
  ]
  for (const stufe of stufen) {
    if (bytes <= ZIEL_BYTES) break
    stufe()
    bytes = groesse(stadt)
  }
  if (bytes > ZIEL_BYTES) throw new Error(`Die Stadt ist mit ${bytes} Byte zu gross (hoechstens ${ZIEL_BYTES}); --rahmen kleiner waehlen`)
  return bytes
}

/* ====================================================== Aufruf */

function argumente(argv) {
  const a = {}
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i]
    if (!k.startsWith('--') || i + 1 >= argv.length) throw new Error(`Argument ohne Wert: ${k}`)
    a[k.slice(2)] = argv[++i]
  }
  for (const n of ['osm', 'hoehen', 'siedlung', 'aus']) if (!a[n]) throw new Error(`--${n} fehlt`)
  if (pfadAufloesen(a.aus) === pfadAufloesen(a.siedlung)) throw new Error('--aus muss eine andere Datei sein als --siedlung (die alte bleibt)')
  if (a.rahmen !== undefined) {
    const r = a.rahmen.split(',').map(Number)
    if (r.length !== 4 || !r.every(Number.isFinite) || !(r[0] < r[2] && r[1] < r[3])) throw new Error('--rahmen braucht x0,z0,x1,z1 mit x0 < x1 und z0 < z1')
    a.rahmen = r
  }
  return a
}

export function hauptprogramm(argv) {
  const a = argumente(argv)
  const datei = JSON.parse(readFileSync(a.siedlung, 'utf8'))
  if (!datei || datei.art !== 'kistly-siedlung' || datei.v !== 1 || !datei.siedlung) throw new Error('--siedlung ist keine Siedlungs-Datei von Kistly')
  const osm = JSON.parse(readFileSync(a.osm, 'utf8'))
  const hoehen = JSON.parse(readFileSync(a.hoehen, 'utf8'))
  const { stadt, zahlen } = stadtAusOsm({ osm, hoehen, siedlung: datei.siedlung, rahmen: a.rahmen ?? null })
  const probleme = stadtPruefen(stadt)
  if (probleme.length) throw new Error(`Die Stadt besteht stadtPruefen nicht: ${probleme.slice(0, 10).join(', ')}`)
  const text = JSON.stringify({ ...datei, siedlung: { ...datei.siedlung, stadt } })
  writeFileSync(a.aus, text)
  console.log('Haeuser', zahlen.haeuser, JSON.stringify(zahlen.haeuserArt))
  console.log('  weg wegen Siedlung', zahlen.wegenSiedlung, '| ausserhalb', zahlen.ausserhalb, '| zu klein', zahlen.zuKlein, '| mit Laeden unten', zahlen.gemischt)
  console.log('  Tuer: Eingang', zahlen.tuerEingang, '| am Weg', zahlen.tuerWeg, '| Notfall', zahlen.tuerNotfall, '| max. Geschosse', zahlen.maxGeschosse)
  console.log('Strassen', zahlen.strassen, '| Flaechen', zahlen.flaechen, '| Gewaesser', zahlen.gewaesser, '| Zaeune', zahlen.zaeune, '| Baeume', zahlen.baeume, '| Orte', zahlen.orte)
  console.log('Gelaende', zahlen.gitter, '| relativ', zahlen.gelaendeMinM, 'bis', zahlen.gelaendeMaxM, 'm')
  console.log('Stadt', zahlen.bytes, 'Byte | Datei', Buffer.byteLength(text, 'utf8'), 'Byte')
  return zahlen
}

if (process.argv[1] && pfadAufloesen(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    hauptprogramm(process.argv.slice(2))
  } catch (e) {
    console.error('FEHLER', e instanceof Error ? e.message : String(e))
    process.exit(1)
  }
}
