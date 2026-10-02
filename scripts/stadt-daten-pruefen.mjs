// Prueft die Daten der Stadt (E87) ohne Browser, ohne Netz, ohne Datenbank
// und ohne echte Orte:
//  - scripts/stadt-aus-osm.mjs an einem erfundenen Auszug: Umrechnung wie
//    src/lib/osm.ts, Haeuser der Siedlung fallen weg, Arten (Feuerwehr,
//    Spital, Einkaufszentrum mit zwei Laeden, Supermarkt, Wohnhaeuser),
//    Geschosse, Daecher, Haustuer am Weg und am Eingang, Innenhof, Gelaende
//    eben um die Siedlung und am Hang, Kappen am Rahmen, Runden, Strassen
//    mit Treppe, Bruecke und Tunnel, Baeume, Wald, Orte, Groesse,
//  - der Aufruf als Programm (Datei rein, Datei raus, Deko bleibt),
//  - stadtPruefen (src/lib/stadt.ts) mit guten und kaputten Staedten,
//  - siedlungDateiLesen (src/lib/siedlungImport.ts) mit und ohne Stadt,
//  - api.ts, Migration 0047 und das Woerterbuch passen zusammen (am Text),
//  - Nacharbeit E87b: Haustuer nie auf einer Brandwand und bei Gleichstand
//    an der Fassade zum Weg (Reihenhaeuser, gemischte Umlaufrichtung,
//    schraeger Weg), Luecken in Zaeunen an Tor, Wegen und Strassen,
//    Flaechen mit Loechern als ein Ring mit Bruecken (gerade-ungerade,
//    nonzero, Rasterzeile), Wohnhaus mit shop= am Umriss, Haltestellen als
//    bus_stop, Hauskennungen im Zeichensatz der Ding-Kennungen, 0048 am Text.
// Alle Namen, Lagen und Kennungen hier sind erfunden.
// Das Woerterbuch (src/lib/i18n) braucht React; ein Lade-Haken ersetzt es
// durch tg(key, vars) = 'key {json}'.
// Aufruf im Projektordner: node scripts/stadt-daten-pruefen.mjs
// Ausgabe "ok" oder die abweichenden Faelle, Exit 1 bei Fehlern.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ERSATZ_I18N =
  'data:text/javascript,' + encodeURIComponent('export function tg(k, v) { return v ? k + " " + JSON.stringify(v) : k }')
registerHooks({
  resolve(specifier, context, nextResolve) {
    const von = context.parentURL ?? ''
    const ausLib = von.endsWith('/src/lib/siedlungImport.ts') || von.endsWith('/src/lib/osm.ts')
    if (specifier === './i18n' && ausLib) return { url: ERSATZ_I18N, shortCircuit: true }
    // Vite findet './stadt' ohne Endung, Node nicht.
    if (von.endsWith('/src/lib/siedlungImport.ts') && /^\.\/\w+$/.test(specifier)) return nextResolve(specifier + '.ts', context)
    return nextResolve(specifier, context)
  },
})
const osm = await import('../src/lib/osm.ts')
const { stadtPruefen, gelaendeHoehe, STADT_GRENZEN, HAUS_ID } = await import('../src/lib/stadt.ts')
const { siedlungDateiLesen } = await import('../src/lib/siedlungImport.ts')
const umwandler = await import('./stadt-aus-osm.mjs')

let fehler = 0
let geprueft = 0
function wahr(name, ist) {
  geprueft++
  if (!ist) {
    console.log('ABWEICHUNG', name)
    fehler++
  }
}
function gleich(name, ist, soll) {
  geprueft++
  const a = JSON.stringify(ist)
  const b = JSON.stringify(soll)
  if (a !== b) {
    console.log('ABWEICHUNG', name, 'ist', a, 'soll', b)
    fehler++
  }
}
function nahe(name, ist, soll, tol) {
  geprueft++
  if (!(Math.abs(ist - soll) <= tol)) {
    console.log('ABWEICHUNG', name, 'ist', ist, 'soll', soll, '+-', tol)
    fehler++
  }
}
function wirft(name, fn, teil) {
  geprueft++
  try {
    fn()
    console.log('ABWEICHUNG', name, 'wirft nicht')
    fehler++
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e)
    if (teil && !m.includes(teil)) {
      console.log('ABWEICHUNG', name, 'wirft', m, 'soll enthalten', teil)
      fehler++
    }
  }
}
const lesen = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const tiefKopie = (v) => JSON.parse(JSON.stringify(v))

/* ============================================ erfundener Auszug */

// Erfundener Ursprung (offenes Meer), nur fuer die Umrechnung.
const LAT0 = 0.5
const LON0 = 0.5
const ort = osm.lokal(LAT0, LON0)
const grad = ([x, z]) => {
  const [lat, lon] = ort.nachGrad(x, z)
  return { lat, lon }
}
let laufNr = 900000
const elemente = []
function weg(id, punkte, tags, zu = false) {
  const p = zu ? [...punkte, punkte[0]] : punkte
  const nodes = p.map(() => laufNr++)
  if (zu) nodes[nodes.length - 1] = nodes[0]
  elemente.push({ type: 'way', id, nodes, geometry: p.map(grad), tags })
}
const flaeche = (id, punkte, tags) => weg(id, punkte, tags, true)
function knoten(id, p, tags) {
  const { lat, lon } = grad(p)
  elemente.push({ type: 'node', id, lat, lon, tags })
}
const rechteck = (x0, z0, x1, z1) => [
  [x0, z0],
  [x1, z0],
  [x1, z1],
  [x0, z1],
]

// Die erfundene Siedlung: ein Haus, Spielplatz, ein Weg.
const SIEDLUNG = {
  name: 'Erfundene Siedlung',
  lat: LAT0,
  lon: LON0,
  gebaeude: [
    { id: 'haus-a', name: 'Haus A', umriss: rechteck(0, 0, 20, 12), geschosse: 4, geschossHoehe: 3, stil: 'putz', dachGruen: false, pv: false, quelle: 'osm:way/1001' },
  ],
  wohnung: null,
  aussen: { spielplatz: rechteck(25, 0, 35, 8), tiefgarage: null, wege: [[[0, 14], [35, 14]]] },
  innen: null,
}
const DATEI = {
  art: 'kistly-siedlung',
  v: 1,
  siedlung: SIEDLUNG,
  deko: { grundrissId: '00000000-0000-4000-8000-000000000001', objekte: [], symbole: [] },
}
// Kern der Siedlung mit 12 m Rand: x -12..47, z -12..26.

// Haeuser
flaeche(1001, rechteck(0, 0, 20, 12), { building: 'apartments' }) // dasselbe wie haus-a
flaeche(1002, rechteck(22, 2, 30, 10), { building: 'yes' }) // 2 m daneben
flaeche(2001, rechteck(100, 0, 110, 8), { building: 'house' }) // am Hang, Weg im Osten
flaeche(2002, rechteck(-100, -4, -95, 0), { building: 'yes' }) // 20 m2
flaeche(2003, rechteck(-60, -60, -40, -40), { building: 'apartments', 'building:colour': '#AABBCC' })
knoten(1, [-50, -50], { shop: 'bakery', name: 'Baeckerei Erfunden' })
flaeche(2004, rechteck(-60, -100, -50, -90), { building: 'apartments', 'building:colour': 'yellow' })
knoten(2, [-55, -90], { entrance: 'main' }) // Mitte der Suedkante (Kante 2)
flaeche(2005, rechteck(60, -100, 80, -80), { building: 'yes', 'building:levels': '7' })
flaeche(2006, rechteck(195, 0, 205, 5), { building: 'house' }) // ragt aus dem Rahmen
// Feuerwehr: Flaeche mit Namen, Haus darin ohne Namen, Schuppen daneben.
flaeche(3000, rechteck(-150, 40, -110, 80), { amenity: 'fire_station', name: 'Wache Erfunden' })
flaeche(3001, rechteck(-145, 45, -125, 60), { building: 'yes' })
flaeche(3002, rechteck(-120, 70, -116, 74), { building: 'shed' })
// Spital
flaeche(3100, rechteck(150, -150, 190, -110), { amenity: 'hospital', name: 'Spital Erfunden' })
flaeche(3101, rechteck(155, -145, 185, -125), { building: 'yes' })
// Einkaufszentrum mit zwei Laeden, Supermarkt nur als Knoten.
flaeche(4000, rechteck(-60, 100, 0, 140), { building: 'retail', shop: 'mall', name: 'Einkaufszentrum Erfunden' })
knoten(3, [-40, 120], { shop: 'clothes', name: 'Mode Erfunden' })
knoten(4, [-20, 120], { shop: 'supermarket', name: 'Markt Erfunden' })
flaeche(4100, rechteck(60, 100, 100, 130), { building: 'yes' })
knoten(5, [80, 115], { shop: 'supermarket', name: 'Nahversorger Erfunden' })
// Haus mit Innenhof als Multipolygon; der Aussenring aus zwei Wegen, einer
// davon falsch herum.
elemente.push({
  type: 'relation',
  id: 7000,
  tags: { type: 'multipolygon', building: 'yes' },
  members: [
    { type: 'way', ref: 7001, role: 'outer', geometry: [[-180, -180], [-140, -180], [-140, -140]].map(grad) },
    { type: 'way', ref: 7002, role: 'outer', geometry: [[-180, -180], [-180, -140], [-140, -140]].map(grad) },
    { type: 'way', ref: 7003, role: 'inner', geometry: [...rechteck(-170, -170, -150, -150), [-170, -170]].map(grad) },
  ],
})
// Strassen und Wege
weg(5000, [[-190, -10], [190, -10]], { highway: 'residential', name: 'Erfundene Gasse' })
weg(5001, [[130, 4], [112, 4]], { highway: 'footway' })
weg(5002, [[140, 4], [150, 4]], { highway: 'steps' })
weg(5003, [[-50, -150], [50, -150]], { highway: 'secondary', bridge: 'yes', layer: '1' })
weg(5004, [[-50, -170], [50, -170]], { highway: 'service', tunnel: 'yes' })
weg(5005, [[-300, 180], [300, 180]], { highway: 'primary' })
weg(5006, [[300, 0], [400, 0]], { highway: 'track' })
weg(5007, [[-200, 190], [200, 190]], { railway: 'rail' })
weg(5008, [[-200, 195], [200, 195]], { railway: 'abandoned' })
weg(5009, [[-10, 60], [10, 60]], { highway: 'footway', tunnel: 'building_passage' })
weg(5010, [[0, -30], [10, -30.1], [20, -30], [30, -29.95], [40, -30]], { highway: 'residential' })
weg(5011, [[0, -40], [10, -41], [20, -40]], { highway: 'residential' })
weg(5012, [[-190, 100], [-190, 160]], { highway: 'pedestrian', area: 'yes' })
// Natur
knoten(6, [50, 50], { natural: 'tree' })
knoten(7, [300, 300], { natural: 'tree' })
weg(6001, [[-100, 150], [-84, 150]], { natural: 'tree_row' })
flaeche(6000, rechteck(150, 0, 250, 60), { landuse: 'forest' })
flaeche(6002, rechteck(60, 40, 64, 44), { leisure: 'swimming_pool' })
flaeche(6003, rechteck(-100, 20, -70, 35), { amenity: 'parking' })
weg(6100, [[-195, -190], [-195, 190]], { waterway: 'stream' })
weg(6101, [[195, -190], [195, -150]], { waterway: 'river' })
weg(6102, [[-100, -190], [-100, -180]], { waterway: 'stream', tunnel: 'culvert' })
weg(6200, [[40, 60], [60, 60], [60, 80]], { barrier: 'hedge' })

/* ---------------------------------------- Nacharbeit E87b (erfunden) */

// Reihenhauszeile ohne Eingaenge, gemischte Umlaufrichtung, schraeger Weg
// im Norden: jede Tuer muss nach Norden, keine auf eine Brandwand.
flaeche(8001, [[110, 70], [118, 70], [118, 80], [110, 80]], { building: 'terrace' })
flaeche(8002, [[126, 70], [118, 70], [118, 80], [126, 80]], { building: 'terrace' })
flaeche(8003, [[126, 70], [134, 70], [134, 80], [126, 80]], { building: 'terrace' })
weg(8100, [[100, 66], [145, 61]], { highway: 'residential' })
// Zwei Haeuser Wand an Wand, Weg 6 m noerdlich, naechster Punkt an der Ecke
// (frueher Gleichstand Fassade gegen Seitenwand).
flaeche(8011, [[128, 110], [140, 110], [140, 100], [128, 100]], { building: 'house' })
flaeche(8012, [[140, 110], [152, 110], [152, 100], [140, 100]], { building: 'house' })
weg(8101, [[120, 94], [160, 94]], { highway: 'residential' })
// Eingezaeunte Anlage als geschlossener Ring: Tor-Knoten im Norden, ein
// Fussweg endet an einem Knoten des Zauns, eine Strasse kreuzt im Osten,
// ein Fussweg im Sueden.
{
  const ring = [[-130, -130], [-122, -130], [-115, -130], [-100, -130], [-100, -105], [-130, -105]]
  const ids = [8501, 8502, 8503, 8504, 8505, 8506]
  elemente.push({ type: 'way', id: 8500, nodes: [...ids, ids[0]], geometry: [...ring, ring[0]].map(grad), tags: { barrier: 'fence' } })
  elemente.push({ type: 'node', id: 8503, ...grad([-115, -130]), tags: { barrier: 'gate' } })
  elemente.push({ type: 'way', id: 8510, nodes: [8502, laufNr++], geometry: [[-122, -130], [-122, -140]].map(grad), tags: { highway: 'footway' } })
}
weg(8511, [[-110, -118], [-90, -118]], { highway: 'residential' })
weg(8512, [[-120, -115], [-120, -95]], { highway: 'footway' })
// Wald mit zwei Lichtungen als Multipolygon.
elemente.push({
  type: 'relation',
  id: 7100,
  tags: { type: 'multipolygon', natural: 'wood' },
  members: [
    { type: 'way', ref: 7101, role: 'outer', geometry: [...rechteck(-60, 150, -20, 175), [-60, 150]].map(grad) },
    { type: 'way', ref: 7102, role: 'inner', geometry: [...rechteck(-50, 155, -40, 165), [-50, 155]].map(grad) },
    { type: 'way', ref: 7103, role: 'inner', geometry: [...rechteck(-35, 158, -25, 168), [-35, 158]].map(grad) },
  ],
})
// Wohnhaus mit shop= am Umriss: bleibt Wohnhaus, der Laden steht in laeden.
flaeche(8300, rechteck(-60, 60, -45, 75), { building: 'apartments', shop: 'bakery', name: 'Baeckerei am Umriss' })
// Haltestelle: highway=bus_stop (mit Wartehaus) und der Bahnsteig daneben.
knoten(8, [30, -60], { highway: 'bus_stop', amenity: 'shelter', name: 'Haltestelle Erfunden' })
knoten(9, [30, -45], { public_transport: 'platform', bus: 'yes', name: 'Haltestelle Erfunden' })

// Gelaende: steigt nach Osten (0,1) und Sueden (0,02); Gitter alle 10 m.
const HOEHEN = { x0: -200, z0: -200, schritt: 10, nx: 41, nz: 41, m: [] }
const meer = (x, z) => 300 + 0.1 * x + 0.02 * z
for (let j = 0; j < 41; j++) for (let i = 0; i < 41; i++) HOEHEN.m.push(meer(-200 + i * 10, -200 + j * 10))
// Mittel unter haus-a (x 0..20, z 0..12): 300 + 1 + 0,12.
const REF = 301.12
const OSM = { version: 0.6, osm3s: { timestamp_osm_base: '2026-09-30T12:00:00Z' }, elements: elemente }

/* ============================================ 1. Umwandeln */

const { stadt, zahlen } = umwandler.stadtAusOsm({ osm: OSM, hoehen: HOEHEN, siedlung: SIEDLUNG })
const haus = (id) => stadt.haeuser.find((h) => h.id === id)

gleich('art, v, stand', [stadt.art, stadt.v, stadt.stand], ['kistly-stadt', 1, '2026-09-30'])
gleich('Rahmen = Gitter der Hoehen', stadt.rahmen, [-200, -200, 200, 200])
gleich('stadtPruefen findet nichts', stadtPruefen(stadt), [])

// Umrechnung genau wie osm.ts (x = (lon - lon0) * 111320 * cos(lat0), z nach Sueden).
gleich('Umriss am Hang in Metern zurueck', haus('w2001')?.umriss, rechteck(100, 0, 110, 8))
{
  const p = grad([123.4, -56.7])
  nahe('Formel x', (p.lon - LON0) * 111320 * Math.cos((LAT0 * Math.PI) / 180), 123.4, 1e-6)
  nahe('Formel z', -(p.lat - LAT0) * 110574, -56.7, 1e-6)
  const quelle = lesen('scripts/stadt-aus-osm.mjs')
  wahr('Umwandler rechnet mit lokal() aus osm.ts', /import\('\.\.\/src\/lib\/osm\.ts'\)/.test(quelle) && quelle.includes('lokal(siedlung.lat, siedlung.lon)'))
  wahr('Umwandler hat keine eigenen Konstanten fuer Grad', !/111320|110574/.test(quelle))
}

// Haeuser der Siedlung fallen weg (gleiche Kennung und 2 m daneben).
wahr('Haus der Siedlung (gleiche Kennung) weg', !haus('w1001'))
wahr('Haus 2 m neben der Siedlung weg', !haus('w1002'))
gleich('Zaehler weg wegen Siedlung', zahlen.wegenSiedlung, 2)
wahr('Haus ueber den Rahmen weg', !haus('w2006'))
gleich('Zaehler ausserhalb', zahlen.ausserhalb, 1)

// Arten, Geschosse, Hoehe, Dach
const ARTEN = {
  w2001: ['haus', 2, 3, 'sattel'],
  w2002: ['schuppen', 1, 3, 'flach'],
  w2003: ['wohnen', 4, 3, 'flach'],
  w2004: ['wohnen', 3, 3, 'flach'],
  w2005: ['wohnen', 7, 3, 'flach'],
  w3001: ['feuerwehr', 2, 3, 'flach'],
  w3002: ['schuppen', 1, 3, 'flach'],
  w3101: ['spital', 4, 3.4, 'flach'],
  w4000: ['einkaufszentrum', 2, 4.5, 'flach'],
  w4100: ['supermarkt', 1, 4.5, 'flach'],
  r7000: ['wohnen', 5, 3, 'flach'],
  w8001: ['haus', 2, 3, 'sattel'],
  w8002: ['haus', 2, 3, 'sattel'],
  w8003: ['haus', 2, 3, 'sattel'],
  w8011: ['haus', 2, 3, 'sattel'],
  w8012: ['haus', 2, 3, 'sattel'],
  w8300: ['wohnen', 3, 3, 'flach'],
}
for (const [id, soll] of Object.entries(ARTEN)) {
  const h = haus(id)
  gleich(`Haus ${id}: Art, Geschosse, Geschosshoehe, Dach`, h ? [h.art, h.geschosse, h.geschossHoehe, h.dach] : null, soll)
}
gleich('Zahl der Haeuser', stadt.haeuser.length, Object.keys(ARTEN).length)
gleich('Geschosse geschaetzt (Wohnhaus nach Grundflaeche)', [100, 249, 250, 599, 600].map((f) => umwandler.geschosseSchaetzen('wohnen', f)), [3, 3, 4, 4, 5])
gleich('Geschosse geschaetzt (Schule, Spital, Halle)', [umwandler.geschosseSchaetzen('schule', 800), umwandler.geschosseSchaetzen('schule', 2000), umwandler.geschosseSchaetzen('spital', 50), umwandler.geschosseSchaetzen('halle', 5000)], [2, 3, 4, 1])
{
  const leer = { bereiche: new Set(), knoten: [], landuse: null, geschosse: null }
  gleich('building=yes nach Groesse', [20, 120, 500, 5000].map((f) => umwandler.hausArt({ building: 'yes' }, { ...leer, flaeche: f })), ['schuppen', 'haus', 'wohnen', 'halle'])
  gleich('building=yes in Gewerbe und Industrie', ['commercial', 'industrial', 'retail'].map((l) => umwandler.hausArt({ building: 'yes' }, { ...leer, flaeche: 500, landuse: l })), ['buero', 'halle', 'laden'])
  gleich('Garage in der Feuerwehr bleibt Garage', umwandler.hausArt({ building: 'garage' }, { ...leer, flaeche: 300, bereiche: new Set(['feuerwehr']) }), 'garage')
  gleich('winziges Haus im Spital bleibt klein', umwandler.hausArt({ building: 'yes' }, { ...leer, flaeche: 20, bereiche: new Set(['spital']) }), 'schuppen')
  gleich('Laden im flachen Haus', umwandler.hausArt({ building: 'yes' }, { ...leer, flaeche: 150, knoten: [{ shop: 'bakery' }] }), 'laden')
  gleich('Laden im hohen Haus: Wohnhaus', umwandler.hausArt({ building: 'yes' }, { ...leer, flaeche: 150, geschosse: 4, knoten: [{ shop: 'bakery' }] }), 'wohnen')
  gleich('Schule, Kirche, Kindergarten', [{ amenity: 'school', building: 'yes' }, { building: 'church' }, { amenity: 'kindergarten', building: 'yes' }].map((t) => umwandler.hausArt(t, { ...leer, flaeche: 600 })), ['schule', 'kirche', 'kindergarten'])
}

// Namen, Laeden, Farbe
gleich('Feuerwehr: Name aus der Flaeche', haus('w3001')?.name, 'Wache Erfunden')
gleich('Spital: Name aus der Flaeche', haus('w3101')?.name, 'Spital Erfunden')
gleich('Einkaufszentrum: Name', haus('w4000')?.name, 'Einkaufszentrum Erfunden')
gleich('Einkaufszentrum: zwei Laeden, nach Namen', haus('w4000')?.laeden, [
  { name: 'Markt Erfunden', art: 'supermarket' },
  { name: 'Mode Erfunden', art: 'clothes' },
])
gleich('Supermarkt: Name aus dem Knoten', haus('w4100')?.name, 'Nahversorger Erfunden')
wahr('Wohnhaus ohne eigenen Namen bleibt ohne Namen', haus('w2003')?.name === undefined)
gleich('Wohnhaus mit Laden unten: laeden', haus('w2003')?.laeden, [{ name: 'Baeckerei Erfunden', art: 'bakery' }])
gleich('Farbe #rrggbb klein', haus('w2003')?.farbe, '#aabbcc')
wahr('Farbe als Wort faellt weg', haus('w2004')?.farbe === undefined)
gleich('Innenhof aus dem Multipolygon', haus('r7000')?.loecher, [rechteck(-170, -170, -150, -150)])
gleich('Aussenring aus zwei Wegen', haus('r7000')?.umriss.length, 4)

// Haustuer
gleich('Tuer am naechsten Weg (Ostkante, Mitte)', haus('w2001')?.tuer, { kante: 1, t: 0.5 })
gleich('Tuer am Eingang aus der Karte', haus('w2004')?.tuer, { kante: 2, t: 0.5 })
wahr('Zaehler Tuer am Eingang', zahlen.tuerEingang >= 1)
{
  const { tuerBreite } = await import('../src/components/plan3d/stadtMasse.ts')
  const schlecht = []
  for (const h of stadt.haeuser) {
    const a = h.umriss[h.tuer.kante]
    const b = h.umriss[(h.tuer.kante + 1) % h.umriss.length]
    const l = Math.hypot(b[0] - a[0], b[1] - a[1])
    const rand = tuerBreite(h.art) / 2 + 0.3
    if (l >= 2 * rand && (h.tuer.t * l < rand - 0.01 || (1 - h.tuer.t) * l < rand - 0.01)) schlecht.push([h.id, h.tuer, h.umriss])
  }
  gleich('jede Tuer passt auf ihre Kante', schlecht, [])
}

/* ============================================ 2. Gelaende */

const g = stadt.gelaende
gleich('Gitter', [g.x0, g.z0, g.schritt, g.nx, g.nz, g.dm.length], [-200, -200, 10, 41, 41, 41 * 41])
wahr('Gelaende in ganzen Dezimetern', g.dm.every(Number.isInteger))
{
  let max = 0
  for (const p of SIEDLUNG.gebaeude[0].umriss) max = Math.max(max, Math.abs(gelaendeHoehe(g, p[0], p[1])))
  for (let x = -12; x <= 47; x += 0.5) for (let z = -12; z <= 26; z += 0.5) max = Math.max(max, Math.abs(gelaendeHoehe(g, x, z)))
  gleich('Gelaende in der Siedlung und 12 m darum genau 0', max, 0)
}
nahe('weit weg: echtes Gelaende minus Bezug (Nordwest)', gelaendeHoehe(g, -200, -200), meer(-200, -200) - REF, 0.051)
nahe('weit weg: echtes Gelaende minus Bezug (Suedost)', gelaendeHoehe(g, 200, 200), meer(200, 200) - REF, 0.051)
nahe('nach Gitterschritt und 25 m Uebergang wieder echt', gelaendeHoehe(g, 90, 7), meer(90, 7) - REF, 0.051)
{
  let steigt = true
  let vorher = -Infinity
  for (let x = 47; x <= 120; x += 1) {
    const h = gelaendeHoehe(g, x, 7)
    if (h < vorher - 1e-9) steigt = false
    vorher = h
  }
  wahr('Uebergang steigt gleichmaessig an', steigt)
  wahr('Uebergang liegt zwischen eben und echt', gelaendeHoehe(g, 65, 7) > 0 && gelaendeHoehe(g, 65, 7) < meer(65, 7) - REF)
}
gleich('Boden am Hang = Gelaende an der Tuer', haus('w2001')?.boden, Math.round(gelaendeHoehe(g, 110, 4) * 10) / 10)
nahe('Boden am Hang etwa echt', haus('w2001')?.boden ?? NaN, meer(110, 4) - REF, 0.1)
gleich('Zaehler Gelaende', [zahlen.gelaendeMinM, zahlen.gelaendeMaxM], [Math.min(...g.dm) / 10, Math.max(...g.dm) / 10])

/* ============================================ 3. Strassen und Linien */

const strasse = (pred) => stadt.strassen.filter(pred)
gleich('Wohnstrasse mit Name', strasse((s) => s.name === 'Erfundene Gasse').map((s) => [s.art, s.breite]), [['wohn', 5.5]])
gleich('Fussweg', strasse((s) => s.art === 'fuss' && s.punkte[0][0] === 130).map((s) => s.breite), [2])
gleich('Treppe', strasse((s) => s.art === 'treppe').map((s) => [s.breite, s.punkte]), [[2, [[140, 4], [150, 4]]]])
gleich('Bruecke', strasse((s) => s.bruecke).map((s) => [s.art, s.breite]), [['haupt', 7]])
gleich('Tunnel', strasse((s) => s.tunnel).map((s) => [s.art, s.breite]), [['dienst', 3.5]])
gleich('Hauptstrasse am Rahmen gekappt', strasse((s) => s.art === 'haupt' && !s.bruecke).map((s) => s.punkte), [[[-200, 180], [200, 180]]])
gleich('Weg ganz draussen faellt weg', strasse((s) => s.art === 'feldweg').length, 0)
gleich('Gleis', strasse((s) => s.art === 'gleis').map((s) => s.breite), [1.5])
gleich('Durchgang unter einem Haus ist kein Tunnel', strasse((s) => s.punkte[0][1] === 60 && s.art === 'fuss').map((s) => s.tunnel ?? false), [false])
gleich('fast gerade Linie auf 2 Punkte vereinfacht (0,3 m)', strasse((s) => s.punkte[0][0] === 0 && s.punkte[0][1] === -30)[0]?.punkte, [[0, -30], [40, -30]])
gleich('Knick von 1 m bleibt', strasse((s) => s.punkte[0][0] === 0 && s.punkte[0][1] === -40)[0]?.punkte.length, 3)
gleich('Platz als Flaeche (area=yes) ist keine Linie', strasse((s) => s.punkte[0][0] === -190 && s.punkte[0][1] === 100).length, 0)
gleich('Gewaesser (Bach 3 m, Fluss 25 m, Durchlass weg)', stadt.gewaesser.map((w) => w.breite).sort((a, b) => a - b), [3, 25])
gleich('Hecke', stadt.zaeune.filter((z) => z.art === 'hecke').map((z) => [z.art, z.punkte.length]), [['hecke', 3]])

/* ============================================ 4. Flaechen, Baeume, Orte */

const wald = stadt.flaechen.find((f) => f.art === 'wald')
wahr('Wald am Rahmen gekappt', !!wald && Math.max(...wald.punkte.map((p) => p[0])) === 200 && Math.min(...wald.punkte.map((p) => p[0])) === 150)
wahr('Schwimmbad und Parkplatz', stadt.flaechen.some((f) => f.art === 'schwimmbad') && stadt.flaechen.some((f) => f.art === 'parkplatz'))
wahr('Feuerwehr- und Spitalflaeche sind keine Flaechen zum Zeichnen', stadt.flaechen.length === 4)
{
  const fl = stadt.flaechen.map((f) => Math.abs(umwandler.flaeche(f.punkte)))
  wahr('grosse Flaechen zuerst', fl.every((v, i) => i === 0 || v <= fl[i - 1]))
}
gleich('Baeume: Einzelbaum und Baumreihe alle 8 m, ausserhalb weg', [...stadt.baeume].sort((a, b) => a[0] - b[0] || a[1] - b[1]), [
  [-100, 150],
  [-92, 150],
  [-84, 150],
  [50, 50],
])
const orte = (name) => stadt.orte.filter((o) => o.name === name)
gleich('Ort im Einkaufszentrum', orte('Mode Erfunden').map((o) => [o.art, o.haus, o.x, o.z]), [['clothes', 'w4000', -40, 120]])
gleich('Ort Einkaufszentrum (Haus)', orte('Einkaufszentrum Erfunden').map((o) => [o.art, o.haus]), [['mall', 'w4000']])
gleich('Ort Baeckerei im Wohnhaus', orte('Baeckerei Erfunden').map((o) => o.haus), ['w2003'])
gleich('Feuerwehr einmal, am Haus', orte('Wache Erfunden').map((o) => [o.art, o.haus]), [['fire_station', 'w3001']])
gleich('Spital einmal, am Haus', orte('Spital Erfunden').map((o) => [o.art, o.haus]), [['hospital', 'w3101']])
wahr('Ort am Haus steht an der Tuer', (() => {
  const o = orte('Einkaufszentrum Erfunden')[0]
  const h = haus('w4000')
  if (!o || !h) return false
  const a = h.umriss[h.tuer.kante]
  const b = h.umriss[(h.tuer.kante + 1) % h.umriss.length]
  return Math.hypot(a[0] + h.tuer.t * (b[0] - a[0]) - o.x, a[1] + h.tuer.t * (b[1] - a[1]) - o.z) < 0.1
})())

/* ============================================ 4b. Nacharbeit E87b */

/** Tuerpunkt und Normale nach aussen (Flaeche > 0: Haus links der Kante). */
function tuerLage(h) {
  if (!h) return null
  const u = h.umriss
  const a = u[h.tuer.kante]
  const b = u[(h.tuer.kante + 1) % u.length]
  const l = Math.hypot(b[0] - a[0], b[1] - a[1])
  const s = umwandler.flaeche(u) > 0 ? 1 : -1
  return { p: [a[0] + h.tuer.t * (b[0] - a[0]), a[1] + h.tuer.t * (b[1] - a[1])], n: [(s * (b[1] - a[1])) / l, (-s * (b[0] - a[0])) / l] }
}
const imHaus = (q, h) => umwandler.imRing(q, h.umriss) && !(h.loecher ?? []).some((l) => umwandler.imRing(q, l))
/** Abstand Punkt zu Strecke. */
function abstandPS(q, a, b) {
  const dx = b[0] - a[0]
  const dz = b[1] - a[1]
  const l2 = dx * dx + dz * dz
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dz) / l2)) : 0
  return Math.hypot(q[0] - a[0] - t * dx, q[1] - a[1] - t * dz)
}
/** Umlaufzahl (fuer Fuellen nach nonzero, wie canvas und SVG). */
function umlauf(q, ring) {
  let w = 0
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]
    const b = ring[(i + 1) % ring.length]
    const kreuz = (b[0] - a[0]) * (q[1] - a[1]) - (q[0] - a[0]) * (b[1] - a[1])
    if (a[1] <= q[1] && b[1] > q[1] && kreuz > 0) w++
    else if (a[1] > q[1] && b[1] <= q[1] && kreuz < 0) w--
  }
  return w
}
/** Rasterzeile wie flaechenRaster in stadt3d.ts: ist x auf Hoehe z innen? */
function inZeile(x, z, ring) {
  const xs = []
  for (let a = 0, b = ring.length - 1; a < ring.length; b = a++) {
    const p0 = ring[a]
    const p1 = ring[b]
    if (p0[1] > z !== p1[1] > z) xs.push(p0[0] + ((z - p0[1]) * (p1[0] - p0[0])) / (p1[1] - p0[1]))
  }
  xs.sort((u, v) => u - v)
  for (let q = 0; q + 1 < xs.length; q += 2) if (x >= xs[q] && x <= xs[q + 1]) return true
  return false
}

// Haustuer: nie auf der Brandwand, bei Gleichstand die Fassade zum Weg.
for (const id of ['w8001', 'w8002', 'w8003', 'w8011', 'w8012']) {
  const t = tuerLage(haus(id))
  wahr(`Tuer ${id} an der Fassade zum Weg im Norden (ist ${JSON.stringify(haus(id)?.tuer)})`, !!t && t.n[1] < -0.99)
}
gleich('Wand an Wand, Weg 6 m noerdlich: Tuer auf Kante 2, nicht auf der Seitenwand', [haus('w8011')?.tuer.kante, haus('w8012')?.tuer.kante], [2, 2])
gleich(
  'vor keiner Tuer steht ein anderes Haus (0,9 m nach aussen)',
  stadt.haeuser
    .filter((h) => {
      const t = tuerLage(h)
      const q = [t.p[0] + t.n[0] * 0.9, t.p[1] + t.n[1] * 0.9]
      return stadt.haeuser.some((g) => g !== h && imHaus(q, g))
    })
    .map((h) => h.id),
  [],
)

// Zaeune: Luecken an Tor, Wegen und Strassen; der Ring wird zu Stuecken.
{
  const zaun = stadt.zaeune.filter((x) => x.art === 'zaun')
  const abstand = (q) => Math.min(...zaun.flatMap((x) => x.punkte.slice(1).map((p, i) => abstandPS(q, x.punkte[i], p))))
  gleich('eingezaeunter Ring: 4 Stuecke (Tor, Fussweg am Knoten, Strasse, Fussweg)', zaun.length, 4)
  wahr(`Tor offen (1,2 m), Abstand ${abstand([-115, -130]).toFixed(2)}`, abstand([-115, -130]) >= 0.5)
  wahr(`Fussweg am Knoten des Zauns offen, Abstand ${abstand([-122, -130]).toFixed(2)}`, abstand([-122, -130]) >= 0.9)
  wahr(`Strasse offen (5,5 m + 1 m), Abstand ${abstand([-100, -118]).toFixed(2)}`, abstand([-100, -118]) >= 3.1)
  wahr(`Fussweg durch den Zaun offen, Abstand ${abstand([-120, -105]).toFixed(2)}`, abstand([-120, -105]) >= 0.9)
  wahr('Zaun sonst durchgehend (Suedwestecke, Nordostecke)', abstand([-130, -105]) < 0.01 && abstand([-100, -130]) < 0.01)
  nahe('Laenge des Zauns = Umfang ohne Luecken', zaun.reduce((acc, x) => acc + x.punkte.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - x.punkte[i][0], p[1] - x.punkte[i][1]), 0), 0), 110 - (2 + 1.2 + 6.5 + 2), 0.5)
  wahr('Zaehler Luecken in Zaeunen', zahlen.zaunLuecken >= 4)
  const runden = (teile) => teile.map((t) => t.map((p) => [umwandler.r1(p[0]), umwandler.r1(p[1])]))
  gleich('linieTeilen: offene Linie, Luecke in der Mitte', runden(umwandler.linieTeilen([[0, 0], [10, 0]], [{ s: 5, halb: 1 }], false)), [[[0, 0], [4, 0]], [[6, 0], [10, 0]]])
  gleich('linieTeilen: offene Linie, Luecke am Ende', runden(umwandler.linieTeilen([[0, 0], [10, 0]], [{ s: 10, halb: 1 }], false)), [[[0, 0], [9, 0]]])
  const ring = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
  gleich('linieTeilen: Ring, Luecke ueber den Anfang', runden(umwandler.linieTeilen(ring, [{ s: 0, halb: 1 }], true)), [[[1, 0], [10, 0], [10, 10], [0, 10], [0, 1]]])
  gleich('linieTeilen: Ring, zwei Luecken, Stueck ueber den Anfang bleibt eines', runden(umwandler.linieTeilen(ring, [{ s: 5, halb: 1 }, { s: 25, halb: 1 }], true)), [
    [[6, 0], [10, 0], [10, 10], [6, 10]],
    [[4, 10], [0, 10], [0, 0], [4, 0]],
  ])
  gleich('linieTeilen: Luecke groesser als der Ring', umwandler.linieTeilen(ring, [{ s: 3, halb: 30 }], true), [])
  gleich('linieTeilen: ohne Luecken bleibt die Linie', umwandler.linieTeilen([[0, 0], [1, 0]], [], false), [[[0, 0], [1, 0]]])
}

// Flaechen mit Loechern: ein Ring mit Bruecken, Lichtungen bleiben frei.
{
  const imKasten = (f) => f.punkte.every((p) => p[0] >= -60 && p[0] <= -20 && p[1] >= 150 && p[1] <= 175)
  const w = stadt.flaechen.find((f) => f.art === 'wald' && imKasten(f))
  wahr('Wald mit zwei Lichtungen ist eine Flaeche', !!w)
  if (w) {
    nahe('Flaeche des Rings = Wald ohne Lichtungen (1000 - 100 - 100 m2)', umwandler.flaeche(w.punkte), 800, 1e-6)
    wahr('Lichtungen frei bei gerade-ungerade (Punkt im Vieleck)', !umwandler.imRing([-45, 160], w.punkte) && !umwandler.imRing([-30, 163], w.punkte))
    wahr('Wald drumherum und dazwischen innen', [[-55, 152], [-37.5, 160], [-22, 172], [-45, 170]].every((q) => umwandler.imRing(q, w.punkte)))
    gleich('Fuellen nach nonzero (canvas, SVG): Lichtung 0, Wald 1', [umlauf([-45, 160], w.punkte), umlauf([-30, 163], w.punkte), umlauf([-55, 152], w.punkte), umlauf([-37.5, 160], w.punkte)], [0, 0, 1, 1])
    wahr('Rasterzeile wie stadt3d: Lichtung frei, Wald daneben innen', !inZeile(-45, 160, w.punkte) && !inZeile(-30, 163.3, w.punkte) && inZeile(-55, 160, w.punkte) && inZeile(-37.5, 160, w.punkte))
  }
  wahr('alle Flaechen laufen positiv', stadt.flaechen.every((f) => umwandler.flaeche(f.punkte) > 0))
  gleich('Zaehler Loecher ohne Bruecke', zahlen.loecherOhneBruecke, 0)
  const zwei = umwandler.lochBruecken(rechteck(0, 0, 10, 10), [rechteck(2, 2, 4, 4), rechteck(6, 6, 8, 8)])
  gleich('lochBruecken: zwei Loecher, Punkte und Flaeche', [zwei.ohne, zwei.ring.length, umwandler.flaeche(zwei.ring)], [0, 16, 92])
  wahr('lochBruecken: Loecher frei, dazwischen innen', !umwandler.imRing([3, 3], zwei.ring) && !umwandler.imRing([7, 7], zwei.ring) && umwandler.imRing([5, 5], zwei.ring) && umwandler.imRing([1, 9], zwei.ring))
  const zuViel = umwandler.lochBruecken(rechteck(0, 0, 10, 10), [rechteck(4, 4, 6, 6)], 6)
  gleich('lochBruecken: ueber maxPunkte faellt das Loch weg (gezaehlt)', [zuViel.ohne, zuViel.ring.length], [1, 4])
  // Ein Loch im Loch (kaputte Karte): keine Bruecke kreuzt das grosse Loch,
  // also faellt das kleine weg (gezaehlt), das grosse bleibt frei.
  const imLoch = umwandler.lochBruecken(rechteck(0, 0, 30, 10), [rechteck(4, 2, 26, 8), rechteck(12, 4, 18, 6)])
  gleich('lochBruecken: Loch im Loch wird nicht verbunden, sondern gezaehlt', [imLoch.ohne, umwandler.imRing([15, 5], imLoch.ring), umwandler.imRing([8, 5], imLoch.ring), umwandler.imRing([2, 5], imLoch.ring)], [1, false, false, true])
  // Ein Loch hinter einem anderen: die naechste Bruecke kreuzte das erste.
  const hinten = umwandler.lochBruecken([[0, 0], [30, 0], [30, 10], [15, 10], [0, 10]], [rechteck(5, 2, 25, 8), rechteck(14, 0.5, 16, 1.5)])
  wahr('lochBruecken: Loch im Schatten eines anderen, Bruecke kreuzt nichts', hinten.ohne === 0 && !umwandler.imRing([15, 1], hinten.ring) && !umwandler.imRing([10, 5], hinten.ring) && umwandler.imRing([15, 9], hinten.ring) && umwandler.imRing([2, 1], hinten.ring))
}

// Wohnhaus mit shop= am Umriss, Haltestellen, Kennungen.
{
  const leer = { bereiche: new Set(), knoten: [], landuse: null, geschosse: null, flaeche: 300 }
  gleich(
    'hausArt: Wohnhaus mit shop= oder Gastro am Umriss bleibt Wohnhaus',
    [
      umwandler.hausArt({ building: 'apartments', shop: 'bakery' }, leer),
      umwandler.hausArt({ building: 'apartments', shop: 'supermarket' }, leer),
      umwandler.hausArt({ building: 'house', amenity: 'restaurant' }, leer),
      umwandler.hausArt({ building: 'residential', amenity: 'cafe' }, leer),
    ],
    ['wohnen', 'wohnen', 'haus', 'wohnen'],
  )
  gleich(
    'hausArt: offene Haeuser mit shop= bleiben Laden',
    [umwandler.hausArt({ building: 'yes', shop: 'bakery' }, leer), umwandler.hausArt({ building: 'retail', shop: 'clothes' }, leer), umwandler.hausArt({ building: 'yes', amenity: 'restaurant' }, leer), umwandler.hausArt({ building: 'yes', shop: 'supermarket' }, leer)],
    ['laden', 'laden', 'laden', 'supermarkt'],
  )
  gleich('Wohnhaus mit shop= am Umriss: Laden in laeden', haus('w8300')?.laeden, [{ name: 'Baeckerei am Umriss', art: 'bakery' }])
  gleich('Haltestelle (bus_stop mit Wartehaus und Bahnsteig) einmal, als bus_stop', orte('Haltestelle Erfunden').map((o) => [o.art, o.x, o.z, o.haus ?? null]), [['bus_stop', 30, -60, null]])
  wahr('alle Hauskennungen im Zeichensatz der Ding-Kennungen (HAUS_ID)', stadt.haeuser.every((h) => HAUS_ID.test(h.id)) && stadt.haeuser.every((h) => /^[A-Za-z0-9:._-]{1,120}$/.test(`stadt:${h.id}:d0:ding`)))
  gleich('keine Kennung ersetzt', zahlen.kennungErsetzt, 0)
  wahr('HAUS_ID: w123, r123_2 gut; Leerzeichen, Doppelpunkt, Umlaut, leer, 65 Zeichen schlecht', ['w123', 'r123_2', 'x0a1b2c3d_2'].every((k) => HAUS_ID.test(k)) && !['Haus 1', 'a:1', 'B' + String.fromCharCode(0xe4) + 'ckerei', '', 'x'.repeat(65)].some((k) => HAUS_ID.test(k)))
  // Ein von Hand gebauter Auszug mit Kennungen, die nicht passen.
  const hand = []
  const hausWeg = (id, r) => hand.push({ type: 'way', id, nodes: [1, 2, 3, 4, 1], geometry: [...r, r[0]].map(grad), tags: { building: 'yes' } })
  hausWeg('a b', rechteck(100, -60, 110, -50))
  hausWeg(77, rechteck(120, -60, 130, -50))
  hausWeg('c:d', rechteck(140, -60, 150, -50))
  const lauf = () => umwandler.stadtAusOsm({ osm: { elements: hand }, hoehen: HOEHEN, siedlung: SIEDLUNG })
  const h1 = lauf()
  const h2 = lauf()
  const ids1 = h1.stadt.haeuser.map((h) => h.id)
  wahr(`Hand-Auszug: Kennungen ersetzt und gueltig (${ids1.join(' ')})`, h1.zahlen.kennungErsetzt === 2 && ids1.includes('w77') && ids1.every((k) => HAUS_ID.test(k)) && new Set(ids1).size === 3)
  gleich('Hand-Auszug: ersetzte Kennungen bei jedem Lauf gleich', h2.stadt.haeuser.map((h) => h.id), ids1)
  gleich('Hand-Auszug: stadtPruefen', stadtPruefen(h1.stadt), [])
}

/* ============================================ 5. Runden und Rahmen */
{
  const alle = []
  for (const h of stadt.haeuser) alle.push(...h.umriss, ...(h.loecher ?? []).flat())
  for (const l of [...stadt.strassen, ...stadt.flaechen, ...stadt.gewaesser, ...stadt.zaeune]) alle.push(...l.punkte)
  alle.push(...stadt.baeume, ...stadt.orte.map((o) => [o.x, o.z]))
  const zehntel = (v) => Math.abs(v * 10 - Math.round(v * 10)) < 1e-6
  wahr(`alle ${alle.length} Punkte auf 0,1 m gerundet`, alle.every((p) => zehntel(p[0]) && zehntel(p[1])))
  wahr('alle Punkte im Rahmen', alle.every((p) => p[0] >= -200 && p[0] <= 200 && p[1] >= -200 && p[1] <= 200))
  wahr('Boden gerundet', stadt.haeuser.every((h) => zehntel(h.boden)))
  wahr('keine Linie mit doppelten Nachbarpunkten', [...stadt.strassen, ...stadt.gewaesser, ...stadt.zaeune].every((l) => l.punkte.every((p, i) => i === 0 || p[0] !== l.punkte[i - 1][0] || p[1] !== l.punkte[i - 1][1])))
}

/* ============================================ 6. Groesse */

gleich('Zaehler Byte = JSON', zahlen.bytes, Buffer.byteLength(JSON.stringify(stadt), 'utf8'))
wahr('unter der Zielgroesse', zahlen.bytes < umwandler.ZIEL_BYTES && umwandler.ZIEL_BYTES <= STADT_GRENZEN.bytes)
wirft('ohne Haeuser der Siedlung', () => umwandler.stadtAusOsm({ osm: OSM, hoehen: HOEHEN, siedlung: { ...SIEDLUNG, gebaeude: [] } }), 'keine Haeuser')
wirft('Hoehen passen nicht', () => umwandler.stadtAusOsm({ osm: OSM, hoehen: { ...HOEHEN, m: HOEHEN.m.slice(1) }, siedlung: SIEDLUNG }), 'Gitter')
{
  const klein = umwandler.stadtAusOsm({ osm: OSM, hoehen: HOEHEN, siedlung: SIEDLUNG, rahmen: [-100, -100, 100, 100] }).stadt
  gleich('Rahmen schneidet das Gitter zu', [klein.gelaende.x0, klein.gelaende.z0, klein.gelaende.nx, klein.gelaende.nz], [-100, -100, 21, 21])
  wahr('kleiner Rahmen: Spital draussen', !klein.haeuser.some((h) => h.id === 'w3101'))
  gleich('kleiner Rahmen: stadtPruefen', stadtPruefen(klein), [])
}
{
  // Ein Auszug, der auch vereinfacht zu gross bleibt: Fehler statt Datei.
  const viele = []
  for (let i = 0; i < 15000; i++) {
    const x = -195 + (i % 130) * 3
    const z = -195 + Math.floor(i / 130) * 3
    const ring = [...rechteck(x, z, x + 2.2, z + 2.2), [x, z]].map(grad)
    viele.push({ type: 'way', id: 800000 + i, nodes: ring.map((_, k) => (k === 4 ? 1 : k + 1)), geometry: ring, tags: { building: 'yes', name: 'Ein sehr langer erfundener Name, damit die Stadt viele Byte bekommt, Nummer ' + i } })
  }
  wirft('zu gross bleibt zu gross', () => umwandler.stadtAusOsm({ osm: { elements: viele }, hoehen: HOEHEN, siedlung: SIEDLUNG, rahmen: [-200, -200, 200, 200] }), 'zu gross')
}

/* ============================================ 7. als Programm */

const tmp = mkdtempSync(join(tmpdir(), 'kistly-stadt-'))
try {
  const pfad = (n) => join(tmp, n)
  writeFileSync(pfad('osm.json'), JSON.stringify(OSM))
  writeFileSync(pfad('hoehen.json'), JSON.stringify(HOEHEN))
  const dateiText = JSON.stringify(DATEI, null, 2)
  writeFileSync(pfad('siedlung.json'), dateiText)
  const skript = fileURLToPath(new URL('./stadt-aus-osm.mjs', import.meta.url))
  const aufruf = (...a) => execFileSync(process.execPath, [skript, '--osm', pfad('osm.json'), '--hoehen', pfad('hoehen.json'), '--siedlung', pfad('siedlung.json'), ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  const aus = aufruf('--aus', pfad('neu.json'))
  const neuText = readFileSync(pfad('neu.json'), 'utf8')
  const neu = JSON.parse(neuText)
  gleich('Programm: Stadt wie die Funktion', neu.siedlung.stadt, stadt)
  const ohne = tiefKopie(neu)
  delete ohne.siedlung.stadt
  gleich('Programm: alles andere unveraendert (auch deko)', ohne, DATEI)
  gleich('Programm: alte Datei bleibt', readFileSync(pfad('siedlung.json'), 'utf8'), dateiText)
  wahr('Programm druckt keine Namen', !/Erfunden|Wache|Spital Erf|Mode|Gasse/.test(aus))
  wahr('Programm druckt Zahlen', /Haeuser 17 /.test(aus) && /Byte/.test(aus))
  let abgelehnt = false
  try {
    execFileSync(process.execPath, [skript, '--osm', pfad('osm.json'), '--hoehen', pfad('hoehen.json'), '--siedlung', pfad('siedlung.json'), '--aus', pfad('siedlung.json')], { stdio: 'pipe' })
  } catch (e) {
    abgelehnt = e.status === 1
  }
  wahr('Programm: --aus = --siedlung abgelehnt', abgelehnt)
  gleich('Programm: alte Datei danach unveraendert', readFileSync(pfad('siedlung.json'), 'utf8'), dateiText)
  aufruf('--aus', pfad('klein.json'), '--rahmen', '-100,-100,100,100')
  gleich('Programm: --rahmen', JSON.parse(readFileSync(pfad('klein.json'), 'utf8')).siedlung.stadt.rahmen, [-100, -100, 100, 100])

  /* ========================================== 8. Datei-Import */
  const gelesen = siedlungDateiLesen(neuText)
  gleich('Import liest die Stadt', gelesen.siedlung.stadt, stadt)
  gleich('Import: Deko bleibt', gelesen.deko?.grundrissId, DATEI.deko.grundrissId)
  const ohneStadt = siedlungDateiLesen(dateiText)
  wahr('Import ohne Stadt: kein Schluessel stadt (gespeicherte bleibt)', !('stadt' in ohneStadt.siedlung))
  const mitNull = tiefKopie(DATEI)
  mitNull.siedlung.stadt = null
  gleich('Import mit stadt null', siedlungDateiLesen(JSON.stringify(mitNull)).siedlung.stadt, null)
  const kaputt = tiefKopie(neu)
  kaputt.siedlung.stadt.haeuser[0].tuer.kante = 99
  wirft('Import: kaputte Tuer', () => siedlungDateiLesen(JSON.stringify(kaputt)), 'stadt haeuser[0].tuer')
  const kaputteKennung = tiefKopie(neu)
  kaputteKennung.siedlung.stadt.haeuser[0].id = 'Haus 1'
  wirft('Import: Hauskennung mit Leerzeichen (E87b)', () => siedlungDateiLesen(JSON.stringify(kaputteKennung)), 'stadt haeuser[0].id')
  const falscheArt = tiefKopie(neu)
  falscheArt.siedlung.stadt.art = 'etwas'
  wirft('Import: falsche Art der Stadt', () => siedlungDateiLesen(JSON.stringify(falscheArt)), 'stadt art')
  wirft('Import: ueber 8 MB', () => siedlungDateiLesen(' '.repeat(8_000_001)), 'datei_zu_gross')
  const gross = tiefKopie(DATEI)
  gross.siedlung.stadt = { ...stadt, baeume: Array.from({ length: 2000 }, (_, i) => [i / 10, 0]) }
  wahr('Import: Datei ueber 3 MB (alte Grenze) geht', (() => {
    const t = JSON.stringify(gross) + ' '.repeat(3_100_000)
    return siedlungDateiLesen(t).siedlung.stadt?.baeume.length === 2000
  })())
} finally {
  rmSync(tmp, { recursive: true, force: true })
}

/* ============================================ 9. stadtPruefen */

const kaputt = (name, aendern, soll) => {
  const s = tiefKopie(stadt)
  aendern(s)
  const p = stadtPruefen(s)
  wahr(`stadtPruefen ${name}: ${soll} (ist ${JSON.stringify(p.slice(0, 3))})`, p.includes(soll))
}
gleich('stadtPruefen: kein Objekt', stadtPruefen(null), ['stadt'])
gleich('stadtPruefen: Liste', stadtPruefen([]), ['stadt'])
gleich('stadtPruefen: falsche Art', stadtPruefen({ ...stadt, art: 'x' }), ['art'])
gleich('stadtPruefen: falsche Fassung', stadtPruefen({ ...stadt, v: 2 }), ['art'])
kaputt('Tuer auf keiner Kante', (s) => (s.haeuser[0].tuer.kante = s.haeuser[0].umriss.length), 'haeuser[0].tuer')
kaputt('Tuer t > 1', (s) => (s.haeuser[0].tuer.t = 1.5), 'haeuser[0].tuer')
kaputt('Tuer auf Kante ohne Laenge', (s) => {
  s.haeuser[0].umriss[1] = [...s.haeuser[0].umriss[0]]
  s.haeuser[0].tuer = { kante: 0, t: 0.5 }
}, 'haeuser[0].tuer')
kaputt('Umriss mit 2 Punkten', (s) => (s.haeuser[0].umriss = s.haeuser[0].umriss.slice(0, 2)), 'haeuser[0].umriss')
kaputt('Umriss mit NaN', (s) => (s.haeuser[1].umriss[0] = [NaN, 0]), 'haeuser[1].umriss')
kaputt('Punkt zu weit weg', (s) => (s.haeuser[1].umriss[0] = [25000, 0]), 'haeuser[1].umriss')
kaputt('Innenhof zu klein', (s) => (s.haeuser.find((h) => h.loecher).loecher[0] = [[0, 0], [1, 1]]), `haeuser[${stadt.haeuser.findIndex((h) => h.loecher)}].loecher[0]`)
kaputt('unbekannte Art', (s) => (s.haeuser[0].art = 'burg'), 'haeuser[0].art')
kaputt('0 Geschosse', (s) => (s.haeuser[0].geschosse = 0), 'haeuser[0].geschosse')
kaputt('halbe Geschosse', (s) => (s.haeuser[0].geschosse = 2.5), 'haeuser[0].geschosse')
kaputt('Geschosshoehe 1 m', (s) => (s.haeuser[0].geschossHoehe = 1), 'haeuser[0].geschossHoehe')
kaputt('unbekanntes Dach', (s) => (s.haeuser[0].dach = 'kuppel'), 'haeuser[0].dach')
kaputt('Boden als Text', (s) => (s.haeuser[0].boden = '3'), 'haeuser[0].boden')
kaputt('Farbe als Wort', (s) => (s.haeuser[0].farbe = 'red'), 'haeuser[0].farbe')
kaputt('Kennung doppelt', (s) => (s.haeuser[1].id = s.haeuser[0].id), 'haeuser[1].id')
kaputt('Kennung mit Leerzeichen', (s) => (s.haeuser[1].id = 'Haus 12'), 'haeuser[1].id')
kaputt('Kennung mit Doppelpunkt', (s) => (s.haeuser[1].id = 'a:1'), 'haeuser[1].id')
kaputt('Kennung mit Umlaut', (s) => (s.haeuser[1].id = 'B' + String.fromCharCode(0xe4) + 'ckerei'), 'haeuser[1].id')
kaputt('Kennung mit 65 Zeichen', (s) => (s.haeuser[1].id = 'x'.repeat(65)), 'haeuser[1].id')
kaputt('Kennung als Zahl', (s) => (s.haeuser[1].id = 12), 'haeuser[1].id')
kaputt('Laden ohne Namen', (s) => (s.haeuser[0].laeden = [{ name: '', art: 'bakery' }]), 'haeuser[0].laeden[0]')
kaputt('Gelaende zu kurz', (s) => s.gelaende.dm.pop(), 'gelaende.dm')
kaputt('Gelaende mit Bruch', (s) => (s.gelaende.dm[7] = 1.5), 'gelaende.dm[7]')
kaputt('Gelaende ohne Schritt', (s) => (s.gelaende.schritt = 0), 'gelaende.schritt')
kaputt('Rahmen verkehrt', (s) => (s.rahmen = [10, 0, 0, 10]), 'rahmen')
kaputt('Strasse mit einem Punkt', (s) => (s.strassen[0].punkte = [[0, 0]]), 'strassen[0].punkte')
kaputt('Strasse mit Infinity', (s) => (s.strassen[0].punkte[0] = [Infinity, 0]), 'strassen[0].punkte')
kaputt('Strasse unbekannter Art', (s) => (s.strassen[0].art = 'autobahn'), 'strassen[0].art')
kaputt('Strasse ohne Breite', (s) => (s.strassen[0].breite = 0), 'strassen[0].breite')
kaputt('Bruecke als Text', (s) => (s.strassen[0].bruecke = 'ja'), 'strassen[0].bruecke')
kaputt('Flaeche unbekannter Art', (s) => (s.flaechen[0].art = 'mond'), 'flaechen[0].art')
kaputt('Gewaesser ohne Breite', (s) => (s.gewaesser[0].breite = -1), 'gewaesser[0].breite')
kaputt('Zaun unbekannter Art', (s) => (s.zaeune[0].art = 'graben'), 'zaeune[0].art')
kaputt('Baum mit drei Zahlen', (s) => (s.baeume[0] = [1, 2, 3]), 'baeume[0]')
kaputt('Ort in einem Haus, das es nicht gibt', (s) => (s.orte[0].haus = 'w0'), 'orte[0].haus')
kaputt('Ort ohne Namen', (s) => (s.orte[0].name = ''), 'orte[0].name')
kaputt('Liste fehlt', (s) => delete s.orte, 'orte')
kaputt('zu viele Haeuser', (s) => (s.haeuser = Array.from({ length: STADT_GRENZEN.haeuser + 1 }, () => s.haeuser[0])), 'haeuser.anzahl')
kaputt('zu viele Strassen', (s) => (s.strassen = Array.from({ length: STADT_GRENZEN.strassen + 1 }, () => s.strassen[0])), 'strassen.anzahl')
kaputt('ueber 6 MB', (s) => (s.anhang = 'x'.repeat(STADT_GRENZEN.bytes)), 'groesse')
kaputt('zu viele Baeume', (s) => (s.baeume = Array.from({ length: STADT_GRENZEN.baeume + 1 }, () => [1, 2])), 'baeume.anzahl')
gleich('stadtPruefen sammelt hoechstens 50', stadtPruefen({ ...stadt, baeume: Array.from({ length: 200 }, () => 'x') }).length, 50)
gleich('gelaendeHoehe unveraendert: Rand und Mitte', [gelaendeHoehe({ x0: 0, z0: 0, schritt: 10, nx: 2, nz: 2, dm: [0, 10, 20, 30] }, 5, 5), gelaendeHoehe({ x0: 0, z0: 0, schritt: 10, nx: 2, nz: 2, dm: [0, 10, 20, 30] }, -50, 99)], [1.5, 2])

/* ============================================ 10. api.ts, 0047, Woerterbuch */

const api = lesen('src/lib/api.ts')
const sql = lesen('supabase/migrations/0047_siedlung_stadt_dinge.sql')
const woerter = lesen('src/lib/i18n/bausteine/fehler.ts')
const code = sql.replace(/--[^\n]*/g, '')
const zwischen = (text, a, b) => text.slice(text.indexOf(a), b ? text.indexOf(b, text.indexOf(a)) : undefined)
const fnListe = zwischen(api, 'export async function listSiedlungen', 'export async function ladeSiedlung')
const fnLaden = zwischen(api, 'export async function ladeSiedlung', 'export class SiedlungStadtFehler')
const fnSpeichern = zwischen(api, 'export async function speichereSiedlung', 'export async function loescheSiedlung')
const e87 = zwischen(api, 'Siedlung E87 (0047)')
wahr('api: Liste ohne Stadt', fnListe.includes('select(SIEDLUNG_SPALTEN)') && !/SIEDLUNG_SPALTEN\s*=\s*'[^']*stadt/.test(api))
wahr('api: ladeSiedlung mit Stadt', fnLaden.includes('select(SIEDLUNG_SPALTEN_GANZ)') && /SIEDLUNG_SPALTEN_GANZ = `\$\{SIEDLUNG_SPALTEN_INNEN\}, stadt`/.test(api))
wahr('api: ladeSiedlung prueft die Stadt', fnLaden.includes('stadtLesen(z.stadt)') && api.includes('stadtPruefen(roh)'))
wahr('api: ohne 0047 ohne Stadt statt Fehler', fnLaden.includes("res.error?.code === '42703'"))
wahr('api: Stadt in eigener Anfrage nach der Siedlung', /update\(\{ stadt: s\.stadt \}\)\.eq\('id', zeile\.id\)\.select\('id'\)/.test(fnSpeichern) && fnSpeichern.indexOf('stadt: s.stadt') > fnSpeichern.indexOf('.insert(neu)'))
wahr('api: Fehler der Stadt sagt es', fnSpeichern.includes("new SiedlungStadtFehler(tg('fehler.siedlung_stadt', { grund }), zeile)"))
wahr('api: Siedlung selbst ohne Stadt geschrieben', !/werte\.stadt/.test(fnSpeichern))
wahr('api: keine Platzhalter mehr', !e87.includes('kommt mit Paket daten'))
wahr('api: Dinge in Seiten zu 1000', e87.includes('const DINGE_SEITE = 1000') && e87.includes('.range(von, von + DINGE_SEITE - 1)') && e87.includes(".order('ding_id')"))
{
  const spalten = (/select\('ding_id, art, x, y, z, gier, ebene'\)/.test(e87) ? 'ding_id, art, x, y, z, gier, ebene' : '').split(', ')
  const tabelle = zwischen(code, 'create table public.siedlung_dinge', ');')
  wahr('api: gelesene Spalten gibt es in 0047', spalten.length === 7 && spalten.every((s) => new RegExp(`\\n\\s*${s}\\s`).test(tabelle)))
  const sqlParameter = [...(zwischen(code, 'create function public.siedlung_ding_setzen(', ') returns void').matchAll(/(p_\w+)/g))].map((m) => m[1])
  const apiParameter = [...zwischen(e87, 'const werte = {', '}').matchAll(/(p_\w+):/g)].map((m) => m[1])
  gleich('api: Parameter von siedlung_ding_setzen', apiParameter, sqlParameter)
  wahr('api: ruft siedlung_ding_setzen', e87.includes("supabase.rpc('siedlung_ding_setzen', werte)"))
  wahr('api: grundrissDarf liest grundrisse unter RLS', e87.includes(".from('grundrisse').select('id, project_id').eq('id', grundrissId).maybeSingle()"))
}
wahr('0047: Spalte mit Pruefung', /add column stadt jsonb/.test(code) && /check \(public\.siedlung_stadt_gueltig\(stadt\)\)/.test(code) && code.includes('octet_length(s::text) > 8000000') && code.includes(`(s -> 'art') = '"kistly-stadt"'::jsonb`))
wahr('0047: Lesen nur ueber siedlung_darf_alle', /using \(siedlung_id in \(select public\.siedlung_darf_alle\(\)\)\)/.test(code) && /revoke insert, update, delete, truncate, references, trigger on public\.siedlung_dinge from authenticated/.test(code))
wahr('0047: Grenze 5000', code.includes('>= 5000'))
wahr('0047: nur angemeldet', /grant execute on function public\.siedlung_ding_setzen\([^)]*\)\s*to authenticated;/.test(code))
wahr('0047: Kennung der Dinge wie die Tabelle', (code.match(/\^\[A-Za-z0-9:\._-\]\{1,120\}\$/g) ?? []).length === 2)
for (const hint of new Set([...code.matchAll(/hint = 'kistly:([\w.]+)'/g)].map((m) => m[1]))) {
  const k = `'fehler.db.${hint}'`
  wahr(`Woerterbuch: ${k} mit de und ar`, new RegExp(`${k.replace(/\./g, '\\.')}: \\{\\s*de: '[^']+',\\s*ar: '[^']+'`).test(woerter))
}
for (const k of ['fehler.db.siedlung.stadt_ungueltig', 'fehler.siedlung_stadt', 'fehler.siedlung_dinge_laden', 'fehler.siedlung_ding_setzen']) {
  wahr(`Woerterbuch: ${k}`, woerter.includes(`'${k}'`))
}

// 0048 (E87b): Dinge mit erstellt_von, Grenze je Konto, Zuruecksetzen.
{
  const sql48 = lesen('supabase/migrations/0048_siedlung_nacharbeit.sql')
  const code48 = sql48.replace(/--[^\n]*/g, '')
  const flach48 = code48.replace(/\s+/g, ' ')
  const fn = (name) => flach48.match(new RegExp(`create (?:or replace )?function public\\.${name}\\(.*?\\$fn\\$(.*?)\\$fn\\$`))?.[1] ?? ''
  const setzen = fn('siedlung_ding_setzen')
  const zurueck = fn('siedlung_dinge_zuruecksetzen')
  const weg = fn('siedlung_entfernen')
  wahr('0048: erstellt_von neu, alte Zeilen aus geaendert_von', flach48.includes('alter table public.siedlung_dinge add column erstellt_von uuid references auth.users(id) on delete set null;') && flach48.includes('update public.siedlung_dinge set erstellt_von = geaendert_von where erstellt_von is null;'))
  wahr('0048: erstellt_von nur beim ersten Eintrag', /insert into public\.siedlung_dinge as d \([^)]*erstellt_von[^)]*\)/.test(setzen) && !/set [^;]*erstellt_von/.test(setzen.slice(setzen.indexOf('on conflict'))))
  wahr('0048: Grenzen 5000 je Siedlung und 500 je Konto unter der Sperre, ausser Besitzer', setzen.indexOf('pg_advisory_xact_lock') < setzen.indexOf('>= 5000') && setzen.indexOf('>= 5000') < setzen.indexOf('>= 500 then') && setzen.includes('d.erstellt_von = v_uid) >= 500') && setzen.includes('if not exists (select 1 from public.siedlungen s where s.id = p_siedlung and s.owner_id = v_uid)'))
  wahr('0048: Kennung der Dinge wie die Tabelle (0047)', (code48.match(/\^\[A-Za-z0-9:\._-\]\{1,120\}\$/g) ?? []).length === 1)
  wahr('0048: Zuruecksetzen nur Besitzer, freigeschaltet, eins oder alle, Zahl zurueck', zurueck.includes("hint = 'kistly:siedlung.nur_besitzer'") && zurueck.includes('public.ist_freigegeben() and exists (select 1 from public.siedlungen s where s.id = p_siedlung and s.owner_id = v_uid)') && zurueck.includes('(p_ding is null or d.ding_id = p_ding)') && zurueck.includes('get diagnostics v_n = row_count'))
  wahr('0048: Zuruecksetzen security definer, integer', /create function public\.siedlung_dinge_zuruecksetzen\(p_siedlung uuid, p_ding text default null\) returns integer language plpgsql security definer set search_path = public as/.test(flach48))
  wahr('0048: Herausnehmen nimmt die Dinge des Gastes mit (nach der Pruefung)', weg.indexOf('if not found then') < weg.indexOf('delete from public.siedlung_dinge d where d.siedlung_id = p_siedlung and d.erstellt_von = p_user'))
  for (const hint of new Set([...code48.matchAll(/hint = 'kistly:([\w.]+)'/g)].map((m) => m[1]))) {
    const k = `'fehler.db.${hint}'`
    wahr(`Woerterbuch (0048): ${k} mit de und ar`, new RegExp(`${k.replace(/\./g, '\\.')}: \\{\\s*de: '[^']+',\\s*ar: '[^']+'`).test(woerter))
  }
  for (const k of ['fehler.siedlung_dinge_zuruecksetzen', 'fehler.siedlung_ersetzen']) wahr(`Woerterbuch: ${k}`, woerter.includes(`'${k}'`))
  const sqlParameter = [...(flach48.match(/create function public\.siedlung_dinge_zuruecksetzen\(([^)]*)\)/)?.[1] ?? '').matchAll(/(p_\w+)/g)].map((m) => m[1])
  const fnApi = zwischen(api, 'export async function siedlungDingeZuruecksetzen', '\n}')
  gleich('api: Parameter von siedlung_dinge_zuruecksetzen', [...(fnApi.match(/rpc\('siedlung_dinge_zuruecksetzen', \{([^}]*)\}/)?.[1] ?? '').matchAll(/(p_\w+):/g)].map((m) => m[1]), sqlParameter)
  wahr('api: siedlungDingeZuruecksetzen wie vereinbart', /export async function siedlungDingeZuruecksetzen\(siedlungId: string, dingId\?: string \| null\): Promise<number>/.test(api))
  wahr('api: siedlungImportieren mit opt.ersetzeId', /export async function siedlungImportieren\(\s*d: import\('\.\/siedlungImport'\)\.SiedlungDatei,\s*opt\?: \{ ersetzeId\?: string \},\s*\)/.test(api))
}

for (const datei of [
  'scripts/stadt-aus-osm.mjs',
  'scripts/stadt-daten-pruefen.mjs',
  'src/lib/stadt.ts',
  'src/lib/siedlungImport.ts',
  'src/lib/api.ts',
  'src/lib/i18n/bausteine/fehler.ts',
  'supabase/migrations/0047_siedlung_stadt_dinge.sql',
  'supabase/migrations/0048_siedlung_nacharbeit.sql',
]) {
  wahr(`${datei} ohne langen Gedankenstrich`, !lesen(datei).includes(String.fromCharCode(0x2014)))
}
// Kein Ort im Umwandler: keine Gradzahlen mit vielen Stellen, keine OSM-Kennungen.
wahr('Umwandler ohne Koordinaten', !/\d+\.\d{4,}/.test(lesen('scripts/stadt-aus-osm.mjs')))

console.log(fehler ? `${fehler} Abweichungen` : `ok (${geprueft} Pruefungen, ${stadt.haeuser.length} erfundene Haeuser)`)
process.exit(fehler ? 1 : 0)
