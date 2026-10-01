// Prueft src/lib/osm.ts ohne Browser und ohne Netz:
//  - Grad <-> Meter hin und zurueck (auf 500 m unter 1 cm) und die Formel
//    aus dem Vertrag (x = (lon - lon0) * 111320 * cos(lat0), z nach Sueden),
//  - building:levels lesen, Namen der Haeuser,
//  - eine Overpass-Antwort (erfundene Koordinaten) wird zu SiedlungGebaeude:
//    Schlusspunkt weg, Luecken und building=no uebersprungen, sortiert,
//  - Lage der Wohnung: planNachSiedlung und lageDerSiedlung passen in
//    three.js zusammen (Plan-Punkt landet in der Welt bei (px/100, 0, py/100)),
//  - die beiden Abrufe mit ersetztem fetch: Anfrage, Fehlerarten, Takt von
//    hoechstens einer Nominatim-Anfrage je Sekunde, Zwischenspeicher.
// Das Woerterbuch (src/lib/i18n) braucht React und JSX; fuer den Test
// ersetzt ein Lade-Haken es durch tg(key, vars) = 'key {json}'.
// Aufruf im Projektordner: node scripts/osm-pruefen.mjs
// Ausgabe "ok" oder die abweichenden Faelle, Exit 1 bei Fehlern.
import { registerHooks } from 'node:module'
import { Object3D, Vector3 } from 'three'

const ERSATZ_I18N =
  'data:text/javascript,' +
  encodeURIComponent('export function tg(k, v) { return v ? k + " " + JSON.stringify(v) : k }')
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === './i18n' && context.parentURL?.endsWith('/src/lib/osm.ts')) {
      return { url: ERSATZ_I18N, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
})
const osm = await import('../src/lib/osm.ts')

let fehler = 0
function nahe(name, ist, soll, tol = 1e-9) {
  if (!(Math.abs(ist - soll) <= tol)) {
    console.log('ABWEICHUNG', name, 'ist', ist, 'soll', soll)
    fehler++
  }
}
function gleich(name, ist, soll) {
  const a = JSON.stringify(ist)
  const b = JSON.stringify(soll)
  if (a !== b) {
    console.log('ABWEICHUNG', name, 'ist', a, 'soll', b)
    fehler++
  }
}
function wahr(name, ist) {
  if (!ist) {
    console.log('ABWEICHUNG', name, 'ist nicht wahr')
    fehler++
  }
}
async function wirft(name, fn, art) {
  try {
    await fn()
    console.log('ABWEICHUNG', name, 'wirft nicht')
    fehler++
  } catch (e) {
    if (!(e instanceof osm.OsmFehler) || e.art !== art) {
      console.log('ABWEICHUNG', name, 'wirft', e?.name, e?.art, e?.message, 'soll OsmFehler', art)
      fehler++
    } else if (!e.message) {
      console.log('ABWEICHUNG', name, 'ohne Nachricht')
      fehler++
    }
  }
}

// Fester Zufall, damit jeder Lauf dieselben Faelle prueft.
let saat = 20261001
function zufall() {
  saat = (saat * 1103515245 + 12345) % 2147483648
  return saat / 2147483648
}

/* ------------------------------------------------- 1. Grad <-> Meter */
for (const [lat0, lon0] of [[0, 0], [45, 10], [47.25, 11.4], [60.5, -3.25], [-33.9, 151.2], [52.52, 13.4]]) {
  const ort = osm.lokal(lat0, lon0)
  let schlimmsterM = 0
  let schlimmsterGrad = 0
  for (let i = 0; i < 400; i++) {
    const x = (zufall() * 2 - 1) * 500
    const z = (zufall() * 2 - 1) * 500
    const [lat, lon] = ort.nachGrad(x, z)
    const [x2, z2] = ort.nachMeter(lat, lon)
    schlimmsterM = Math.max(schlimmsterM, Math.hypot(x2 - x, z2 - z))
    const [x3, z3] = ort.nachMeter(lat + 1e-4, lon - 2e-4)
    const [lat4, lon4] = ort.nachGrad(x3, z3)
    schlimmsterGrad = Math.max(schlimmsterGrad, Math.abs(lat4 - lat - 1e-4), Math.abs(lon4 - lon + 2e-4))
  }
  wahr(`hin und zurueck ${lat0},${lon0}: ${schlimmsterM} m unter 1 cm`, schlimmsterM < 0.01)
  wahr(`zurueck und hin ${lat0},${lon0}: ${schlimmsterGrad} Grad`, schlimmsterGrad < 1e-9)
  // Formel aus dem Vertrag
  const [x, z] = ort.nachMeter(lat0 + 0.001, lon0 + 0.002)
  nahe(`x Osten ${lat0}`, x, 0.002 * 111320 * Math.cos((lat0 * Math.PI) / 180), 1e-6)
  nahe(`z Sueden ${lat0}`, z, -0.001 * 110574, 1e-6)
}
{
  const [x, z] = osm.lokal(45, 10).nachMeter(45, 10)
  gleich('Mittelpunkt liegt bei 0,0', [x, z], [0, 0])
}

/* ------------------------------------------------ 2. Geschosse, Namen */
const stufen = [
  [undefined, 3],
  [{}, 3],
  [{ 'building:levels': '5' }, 5],
  [{ 'building:levels': ' 4 ' }, 4],
  [{ 'building:levels': '2.5' }, 3],
  [{ 'building:levels': '3,4' }, 3],
  [{ 'building:levels': '3;4' }, 3],
  [{ 'building:levels': '0' }, 1],
  [{ 'building:levels': '-1' }, 3],
  [{ 'building:levels': 'drei' }, 3],
  [{ 'building:levels': '120' }, 60],
]
for (const [tags, soll] of stufen) gleich(`geschosseAus ${JSON.stringify(tags)}`, osm.geschosseAus(tags), soll)

gleich('Name aus name', osm.gebaeudeName({ name: ' Turm ', 'addr:street': 'Erfundene Gasse' }, 4), 'Turm')
gleich('Name aus Adresse', osm.gebaeudeName({ 'addr:street': 'Erfundene Gasse', 'addr:housenumber': '7b' }, 4), 'Erfundene Gasse 7b')
gleich('Name nur Nummer', osm.gebaeudeName({ 'addr:housenumber': '12' }, 4), '12')
gleich('Name ersatzweise', osm.gebaeudeName({ building: 'yes' }, 4), 'Haus 4')

/* ---------------------------------------------- 3. Overpass-Antwort */
// Erfundener Ort. Die Formen sind gewoehnliche Hausformen (L, Rechteck).
const LAT0 = 45
const LON0 = 10
const ort = osm.lokal(LAT0, LON0)
/** Ecken in Metern -> geometry von Overpass (Grad), Schlusspunkt wiederholt. */
function geom(meter, schliessen = true) {
  const g = meter.map(([x, z]) => {
    const [lat, lon] = ort.nachGrad(x, z)
    return { lat, lon }
  })
  return schliessen ? [...g, g[0]] : g
}
const L_FORM = [[40, 10], [40, 27], [63.4, 27.1], [63.5, -0.4], [51.4, -0.3], [51.2, 10]]
const RECHTECK = [[-20, -30], [-20, -18], [7.7, -18.2], [7.6, -30.4]]
const antwort = {
  version: 0.6,
  elements: [
    { type: 'way', id: 11, tags: { building: 'apartments', 'building:levels': '4' }, geometry: geom(RECHTECK) },
    { type: 'way', id: 12, tags: { building: 'yes', 'addr:street': 'Erfundene Gasse', 'addr:housenumber': '1a' }, geometry: geom(L_FORM) },
    { type: 'way', id: 13, tags: { building: 'no' }, geometry: geom(RECHTECK) },
    { type: 'way', id: 14, tags: { building: 'yes' }, geometry: [...geom(RECHTECK).slice(0, 2), null, ...geom(RECHTECK).slice(2)] },
    { type: 'way', id: 15, tags: { building: 'shed' }, geometry: geom([[1, 1], [2, 2]]) },
    { type: 'way', id: 16, tags: { highway: 'footway' }, geometry: geom(RECHTECK) },
    { type: 'node', id: 17, lat: 45, lon: 10, tags: { building: 'yes' } },
    { type: 'way', id: 18, tags: { building: 'garage', 'building:levels': '1' }, geometry: geom([[200, 200], [205, 200], [205, 206], [200, 206]], false) },
    { type: 'way', id: 19, tags: { building: 'yes' }, geometry: geom([[3, 3], [6, 3], [9, 3]]) },
    { type: 'way', id: 20, tags: { building: 'yes' }, geometry: geom([[4, 4], [4.5, 4], [4.5, 4.5], [4, 4.5]]) },
    { type: 'way', id: 11, tags: { building: 'apartments' }, geometry: geom(RECHTECK) },
  ],
}
const haeuser = osm.overpassZuGebaeude(antwort, LAT0, LON0)
gleich('Anzahl Haeuser', haeuser.length, 3)
gleich('Reihenfolge nach Abstand', haeuser.map((h) => h.id), ['osm-11', 'osm-12', 'osm-18'])
gleich('Namen', haeuser.map((h) => h.name), ['Haus 1', 'Erfundene Gasse 1a', 'Haus 3'])
gleich('Geschosse', haeuser.map((h) => h.geschosse), [4, 3, 1])
gleich('Quellen', haeuser.map((h) => h.quelle), ['osm:way/11', 'osm:way/12', 'osm:way/18'])
gleich('Vorgaben', haeuser.map((h) => [h.geschossHoehe, h.stil, h.dachGruen, h.pv]), [
  [3, 'putz', false, false],
  [3, 'putz', false, false],
  [3, 'putz', false, false],
])
gleich('Rechteck ohne Schlusspunkt', haeuser[0].umriss, RECHTECK)
gleich('L-Form ohne Schlusspunkt', haeuser[1].umriss, L_FORM)
gleich('offener Weg bleibt 4 Ecken', haeuser[2].umriss, [[200, 200], [205, 200], [205, 206], [200, 206]])
wahr('alle Ecken auf cm', haeuser.every((h) => h.umriss.every(([x, z]) => Math.round(x * 100) === x * 100 && Math.round(z * 100) === z * 100)))
wahr('kein -0', haeuser.every((h) => h.umriss.every(([x, z]) => !Object.is(x, -0) && !Object.is(z, -0))))

// Grenzen: hoechstens MAX_GEBAEUDE, die naechsten bleiben; viele Ecken werden ausgeduennt
{
  const viele = { elements: [] }
  for (let i = 0; i < osm.MAX_GEBAEUDE + 20; i++) {
    const x = (i % 20) * 30
    const z = Math.floor(i / 20) * 30
    viele.elements.push({ type: 'way', id: 1000 + i, tags: { building: 'yes' }, geometry: geom([[x, z], [x + 10, z], [x + 10, z + 10], [x, z + 10]]) })
  }
  const r = osm.overpassZuGebaeude(viele, LAT0, LON0)
  gleich('hoechstens MAX_GEBAEUDE', r.length, osm.MAX_GEBAEUDE)
  wahr('die fernsten fallen weg', !r.some((h) => h.id === `osm-${1000 + osm.MAX_GEBAEUDE + 19}`))
  gleich('Nummern danach', r.slice(0, 2).map((h) => h.name), ['Haus 1', 'Haus 2'])

  const kreis = []
  for (let i = 0; i < 1300; i++) kreis.push([Math.cos((i / 1300) * 2 * Math.PI) * 30, Math.sin((i / 1300) * 2 * Math.PI) * 30])
  const rund = osm.overpassZuGebaeude({ elements: [{ type: 'way', id: 5, tags: { building: 'yes' }, geometry: geom(kreis) }] }, LAT0, LON0)
  wahr(`Kreis ausgeduennt auf ${rund[0]?.umriss.length} Ecken`, rund.length === 1 && rund[0].umriss.length <= osm.MAX_ECKEN && rund[0].umriss.length >= 3)
}
for (const kaputt of [null, {}, { elements: 'x' }, []]) {
  try {
    osm.overpassZuGebaeude(kaputt, LAT0, LON0)
    console.log('ABWEICHUNG kaputte Antwort', JSON.stringify(kaputt), 'wirft nicht')
    fehler++
  } catch (e) {
    wahr('kaputte Antwort wirft OsmFehler antwort', e instanceof osm.OsmFehler && e.art === 'antwort')
  }
}

// Abfrage
gleich(
  'Overpass-Abfrage',
  osm.overpassAbfrage(45.123456789, 10.5, 150.4),
  '[out:json][timeout:25];way["building"](around:150,45.1234568,10.5000000);out tags geom;',
)
wahr('Radius unten begrenzt', osm.overpassAbfrage(45, 10, 1).includes(`around:${osm.RADIUS_MIN_M},`))
wahr('Radius oben begrenzt', osm.overpassAbfrage(45, 10, 99999).includes(`around:${osm.RADIUS_MAX_M},`))

/* --------------------------------------------- 4. Nominatim-Antwort */
gleich(
  'Nominatim-Treffer',
  osm.nominatimZuTreffern([
    { display_name: 'Erfundene Gasse 1, Musterort', lat: '45.0001', lon: '10.0002' },
    { display_name: 'kaputt', lat: 'x', lon: '10' },
    { display_name: 'zu weit', lat: '95', lon: '10' },
    { display_name: 'leer', lat: '', lon: '10' },
    { display_name: 'null', lat: null, lon: '10' },
    null,
    { lat: '-33.5', lon: '151.25' },
  ]),
  [
    { name: 'Erfundene Gasse 1, Musterort', lat: 45.0001, lon: 10.0002 },
    { name: '-33.50000, 151.25000', lat: -33.5, lon: 151.25 },
  ],
)
try {
  osm.nominatimZuTreffern({ error: 'x' })
  console.log('ABWEICHUNG Nominatim ohne Liste wirft nicht')
  fehler++
} catch (e) {
  wahr('Nominatim ohne Liste: OsmFehler antwort', e instanceof osm.OsmFehler && e.art === 'antwort')
}

/* ------------------------------------------------ 5. Lage der Wohnung */
const W = { x: -12.34, z: 5.67, geschoss: 2 }
const H = 3
const erwartet = {
  0: [[0, 0, -12.34, 5.67], [100, 0, -11.34, 5.67], [0, 100, -12.34, 6.67], [250, 400, -9.84, 9.67]],
  90: [[0, 0, -12.34, 5.67], [100, 0, -12.34, 6.67], [0, 100, -13.34, 5.67], [250, 400, -16.34, 8.17]],
  180: [[100, 0, -13.34, 5.67], [0, 100, -12.34, 4.67], [250, 400, -14.84, 1.67]],
  270: [[100, 0, -12.34, 4.67], [0, 100, -11.34, 5.67], [250, 400, -8.34, 3.17]],
}
for (const drehung of [0, 90, 180, 270]) {
  const w = { ...W, drehung }
  for (const [px, py, sx, sz] of erwartet[drehung]) {
    const [x, z] = osm.planNachSiedlung(w, px, py)
    nahe(`plan ${drehung} (${px},${py}) x`, x, sx, 1e-9)
    nahe(`plan ${drehung} (${px},${py}) z`, z, sz, 1e-9)
  }
  // In three.js: Gruppe der Siedlung so legen, wie lageDerSiedlung sagt.
  const lage = osm.lageDerSiedlung(w, H)
  const gruppe = new Object3D()
  gruppe.position.set(lage.x, lage.y, lage.z)
  gruppe.rotation.y = lage.drehY
  gruppe.updateMatrixWorld(true)
  for (let i = 0; i < 50; i++) {
    const px = Math.round(zufall() * 2000)
    const py = Math.round(zufall() * 1500)
    const [x, z] = osm.planNachSiedlung(w, px, py)
    const welt = new Vector3(x, w.geschoss * H, z).applyMatrix4(gruppe.matrixWorld)
    nahe(`Welt ${drehung} x`, welt.x, px / 100, 1e-9)
    nahe(`Welt ${drehung} y`, welt.y, 0, 1e-9)
    nahe(`Welt ${drehung} z`, welt.z, py / 100, 1e-9)
  }
}

/* --------------------------------------- 6. Abrufe mit ersetztem fetch */
const anfragen = []
let naechste = null
globalThis.fetch = async (url, init) => {
  anfragen.push({ url: String(url), init, zeit: Date.now() })
  const n = naechste
  if (typeof n === 'function') return n(url, init)
  return new Response(JSON.stringify(n), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

// Overpass
naechste = antwort
const geladen = await osm.gebaeudeLaden(LAT0, LON0, 120)
gleich('gebaeudeLaden wie overpassZuGebaeude', geladen, haeuser)
{
  const a = anfragen.at(-1)
  gleich('Overpass-Adresse', a.url, 'https://overpass-api.de/api/interpreter')
  gleich('Overpass per POST', a.init.method, 'POST')
  gleich('Overpass-Daten', a.init.body.get('data'), osm.overpassAbfrage(LAT0, LON0, 120))
  gleich('ohne Cookies', a.init.credentials, 'omit')
  wahr('mit Zeitgrenze', a.init.signal instanceof AbortSignal)
}
naechste = { elements: [], remark: 'runtime error: Query timed out in "query" at line 1 after 26 seconds.' }
await wirft('Overpass remark', () => osm.gebaeudeLaden(LAT0, LON0, 120), 'dienst')
naechste = () => new Response('zu viele', { status: 429 })
await wirft('Overpass 429', () => osm.gebaeudeLaden(LAT0, LON0, 120), 'dienst')
naechste = () => new Response('<html>', { status: 200 })
await wirft('Overpass kein JSON', () => osm.gebaeudeLaden(LAT0, LON0, 120), 'antwort')
naechste = () => Promise.reject(new TypeError('Failed to fetch'))
await wirft('ohne Netz', () => osm.gebaeudeLaden(LAT0, LON0, 120), 'verbindung')
naechste = () => Promise.reject(new DOMException('zu lange', 'TimeoutError'))
await wirft('Zeitgrenze', () => osm.gebaeudeLaden(LAT0, LON0, 120), 'zeit')
const vorher = anfragen.length
await wirft('kaputte Lage', () => osm.gebaeudeLaden(Number.NaN, LON0, 120), 'eingabe')
await wirft('Breite zu gross', () => osm.gebaeudeLaden(91, LON0, 120), 'eingabe')
gleich('kaputte Lage fragt nicht', anfragen.length, vorher)

// Nominatim: leer fragt nicht, Takt eine Sekunde, Speicher
gleich('leere Suche', await osm.adresseSuchen('   '), [])
gleich('leere Suche fragt nicht', anfragen.length, vorher)
naechste = [{ display_name: 'Erfundene Gasse 1, Musterort', lat: '45.0001', lon: '10.0002' }]
const start = anfragen.length
const drei = await Promise.all([osm.adresseSuchen('Erfundene Gasse 1'), osm.adresseSuchen('Musterort'), osm.adresseSuchen('Beispielweg 3')])
gleich('drei Suchen, drei Anfragen', anfragen.length - start, 3)
gleich('Treffer', drei[0], [{ name: 'Erfundene Gasse 1, Musterort', lat: 45.0001, lon: 10.0002 }])
{
  const zeiten = anfragen.slice(start).map((a) => a.zeit).sort((a, b) => a - b)
  // Die erste Anfrage kann eine Millisekunde nach ihrem Zeitpunkt
  // hinausgehen, darum 999 ms; zu frueh feuernde Zeitgeber faengt osm.ts ab.
  wahr(`Abstand ${zeiten[1] - zeiten[0]} ms`, zeiten[1] - zeiten[0] >= 999)
  wahr(`Abstand ${zeiten[2] - zeiten[1]} ms`, zeiten[2] - zeiten[1] >= 999)
  const u = new URL(anfragen[start].url)
  gleich('Nominatim-Adresse', u.origin + u.pathname, 'https://nominatim.openstreetmap.org/search')
  gleich('Nominatim-Parameter', [...u.searchParams.keys()].sort(), ['format', 'limit', 'q'])
  gleich('Nominatim-Format', [u.searchParams.get('format'), u.searchParams.get('limit')], ['json', '5'])
  wahr('Nominatim ohne Cookies', anfragen[start].init.credentials === 'omit')
}
const nochmal = await osm.adresseSuchen('  erfundene   GASSE 1 ')
gleich('gleicher Text aus dem Speicher', anfragen.length - start, 3)
gleich('Speicher liefert dasselbe', nochmal, drei[0])
nochmal[0].name = 'veraendert'
gleich('Speicher liefert Kopien', (await osm.adresseSuchen('Erfundene Gasse 1'))[0].name, 'Erfundene Gasse 1, Musterort')
naechste = () => new Response('{}', { status: 503 })
await wirft('Nominatim 503', () => osm.adresseSuchen('Anderer Ort'), 'dienst')

/* ----------------------------------------------------- 7. Hinweis */
gleich('OSM-Hinweis', osm.OSM_HINWEIS, '(c) OpenStreetMap-Mitwirkende')
wahr('Lizenzseite', osm.OSM_LIZENZ_URL.startsWith('https://www.openstreetmap.org/copyright'))

console.log(fehler === 0 ? 'ok' : `${fehler} Abweichungen`)
process.exit(fehler === 0 ? 0 : 1)
