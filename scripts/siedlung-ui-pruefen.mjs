// Prueft die Oberflaeche der Siedlung (E83) ohne Browser:
//  1. Rechnen im Einrichten (src/components/SiedlungEinrichten.tsx): Plan
//     in die Siedlung wie im Vertrag (types.ts), Drehen um die Mitte,
//     Mitte setzen, Punkt im Umriss, Wohnung im Haus, Mittelpunkt verlegen
//     (jeder Punkt bleibt auf der Erde, wo er war), Namen der Stockwerke.
//  2. Der Schalter fuer den Knopf (src/components/AppShell.tsx): an ohne
//     Wahl, aus und an, meldet jede Aenderung, ohne Speicher bis zum
//     Neuladen.
//  3. Woerter: jeder Schluessel siedlung.* aus den Dateien der Siedlung
//     steht in bausteine/siedlung.ts; was schon beim Start zu sehen ist
//     (Knopf, Schalter), steht in umzuege.ts und nicht im nachgeladenen
//     Baustein; Kopfzeile, Einstellungen und App benutzen keinen
//     nachgeladenen Schluessel.
//  4. Nichts laedt beim Start: App.tsx holt die Seiten nur per lazy(), die
//     Dateien des Starts holen weder three noch die Siedlung; im fertigen
//     Bau (dist, vorher npm run build) erreicht der Start keinen Teil mit
//     three oder mit den Saetzen der Siedlung, wohl aber den Knopf.
// Die Zahlen sind erfunden. Aufruf im Projektordner:
//   npm run build && node scripts/siedlung-ui-pruefen.mjs
// Ausgabe "ok" oder die abweichenden Faelle, Exit 1 bei Fehlern.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createServer } from 'vite'

let fehler = 0
function nahe(name, ist, soll, tol = 1e-9) {
  if (!(Math.abs(ist - soll) <= tol)) {
    console.log('ABWEICHUNG', name, 'ist', ist, 'soll', soll)
    fehler++
  }
}
function wahr(name, ist) {
  if (!ist) {
    console.log('ABWEICHUNG', name, 'ist nicht wahr')
    fehler++
  }
}
const lesen = (p) => fs.readFileSync(p, 'utf8')

// Module mit JSX laedt Vite (ohne Browser, ohne Netz). Eigener Zwischenspeicher
// im Temp-Ordner, damit der des Entwicklungsservers unberuehrt bleibt.
const vite = await createServer({
  cacheDir: path.join(os.tmpdir(), 'kistly-siedlung-ui-pruefen'),
  server: { middlewareMode: true, hmr: false, ws: false },
  appType: 'custom',
  logLevel: 'error',
  optimizeDeps: { noDiscovery: true, include: [] },
})
let R
let K
try {
  R = await vite.ssrLoadModule('/src/components/SiedlungEinrichten.tsx')
  // Der Schalter liest window und localStorage erst beim Aufruf.
  K = await vite.ssrLoadModule('/src/components/AppShell.tsx')
} finally {
  await vite.close()
}

/* ------------------------------------------------------------ 1. Rechnen */

// Vertrag: (x, z) = (w.x, w.z) + R(t) * (px/100, py/100), R(t) = [[cos, -sin], [sin, cos]].
function vertrag(w, px, py) {
  const t = (w.drehung * Math.PI) / 180
  const x = px / 100
  const y = py / 100
  return [w.x + Math.cos(t) * x - Math.sin(t) * y, w.z + Math.sin(t) * x + Math.cos(t) * y]
}
const planPunkte = [
  [0, 0],
  [100, 0],
  [0, 100],
  [523, -187],
  [-260, 941],
  [1234.5, 77.25],
]
for (const drehung of [0, 90, 180, 270]) {
  const w = { x: 12.34, z: -56.78, drehung }
  for (const [px, py] of planPunkte) {
    const [x, z] = R.planNachSiedlung(w, px, py)
    const [sx, sz] = vertrag(w, px, py)
    nahe(`plan ${drehung} (${px},${py}) x`, x, sx, 1e-9)
    nahe(`plan ${drehung} (${px},${py}) z`, z, sz, 1e-9)
  }
}
// Positiv dreht im Uhrzeigersinn: Osten des Plans zeigt nach Sueden (z+).
{
  const [x, z] = R.planNachSiedlung({ x: 0, z: 0, drehung: 90 }, 100, 0)
  nahe('90 Grad: Osten wird Sueden x', x, 0)
  nahe('90 Grad: Osten wird Sueden z', z, 1)
}

// Mitte setzen: die Mitte des Plans landet auf dem Ziel (auf den cm gerundet).
const mitteCm = [437, 289]
for (const drehung of [0, 90, 180, 270]) {
  const l = R.mitteSetzen(drehung, mitteCm, [-20.5, 33.25])
  const [x, z] = R.planNachSiedlung(l, mitteCm[0], mitteCm[1])
  nahe(`mitteSetzen ${drehung} x`, x, -20.5, 0.006)
  nahe(`mitteSetzen ${drehung} z`, z, 33.25, 0.006)
  wahr(`mitteSetzen ${drehung} Drehung`, l.drehung === drehung)
}

// Drehen um die Mitte: die Mitte bleibt, viermal ist einmal herum.
{
  const start = { x: 3.21, z: -7.65, drehung: 0 }
  const [mx, mz] = R.planNachSiedlung(start, mitteCm[0], mitteCm[1])
  let l = start
  for (let i = 1; i <= 4; i++) {
    l = R.drehenUmMitte(l, mitteCm, 90)
    const [x, z] = R.planNachSiedlung(l, mitteCm[0], mitteCm[1])
    nahe(`drehen ${i}x Mitte x`, x, mx, 0.011)
    nahe(`drehen ${i}x Mitte z`, z, mz, 0.011)
    wahr(`drehen ${i}x Drehung`, l.drehung === (i * 90) % 360)
  }
  nahe('viermal herum x', l.x, start.x, 0.021)
  nahe('viermal herum z', l.z, start.z, 0.021)
  const hin = R.drehenUmMitte(start, mitteCm, -90)
  wahr('links von 0 ist 270', hin.drehung === 270)
  const zurueck = R.drehenUmMitte(hin, mitteCm, 90)
  nahe('links und rechts x', zurueck.x, start.x, 0.011)
  nahe('links und rechts z', zurueck.z, start.z, 0.011)
}

// Rahmen.
{
  const r = R.rahmenVon([
    [3, -2],
    [-1, 5],
    [4, 1],
  ])
  wahr('rahmenVon', JSON.stringify(r) === JSON.stringify([-1, -2, 4, 5]))
  wahr('rahmenVon leer', R.rahmenVon([]) === null)
}

// Punkt im Umriss: Quadrat in beiden Richtungen, ein L (nicht konvex).
{
  const quadrat = [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
  ]
  const andersrum = [...quadrat].reverse()
  for (const [name, u] of [
    ['im Uhrzeigersinn', quadrat],
    ['dagegen', andersrum],
  ]) {
    wahr(`Quadrat ${name} innen`, R.punktImUmriss([5, 5], u))
    wahr(`Quadrat ${name} aussen`, !R.punktImUmriss([15, 5], u))
    wahr(`Quadrat ${name} aussen links`, !R.punktImUmriss([-0.1, 5], u))
  }
  const L = [
    [0, 0],
    [20, 0],
    [20, 8],
    [8, 8],
    [8, 20],
    [0, 20],
  ]
  wahr('L innen unten', R.punktImUmriss([15, 4], L))
  wahr('L innen links', R.punktImUmriss([4, 15], L))
  wahr('L in der Ecke aussen', !R.punktImUmriss([15, 15], L))
}

// Wohnung im Haus: ein langes Haus 40 x 12 m, eine Wohnung 10 x 8 m.
{
  const haus = [
    [-20, -6],
    [20, -6],
    [20, 6],
    [-20, 6],
  ]
  const rahmenCm = [0, 0, 1000, 800]
  const mitte = [500, 400]
  const drin = R.mitteSetzen(0, mitte, [0, 0])
  wahr('Wohnung mittig drin', R.wohnungImHaus(drin, rahmenCm, haus))
  wahr('Wohnung buendig an der Wand drin', R.wohnungImHaus(R.mitteSetzen(0, mitte, [15, 2]), rahmenCm, haus))
  wahr('Wohnung ragt hinaus', !R.wohnungImHaus(R.mitteSetzen(0, mitte, [17, 0]), rahmenCm, haus))
  // Quer gedreht ist sie 10 m tief, das Haus nur 12 m: passt noch, 14 m nicht.
  wahr('gedreht passt', R.wohnungImHaus(R.mitteSetzen(90, mitte, [0, 0]), rahmenCm, haus))
  wahr('gedreht zu tief', !R.wohnungImHaus(R.mitteSetzen(90, [500, 400], [0, 0]), [0, 0, 1400, 800], haus))
}

// Mittelpunkt verlegen: erfundener Ort, jeder Punkt bleibt, wo er auf der Erde ist.
{
  const lat0 = 46.2
  const lon0 = 11.7
  const geo = (lat, lon, [x, z]) => [lat - z / 110574, lon + x / (111320 * Math.cos((lat * Math.PI) / 180))]
  const ort = {
    lat: lat0,
    lon: lon0,
    gebaeude: [
      { id: 'a', name: 'Haus 1', umriss: [[30, -40], [70, -40], [70, -28], [30, -28]], geschosse: 4, geschossHoehe: 3, stil: 'putz', dachGruen: true, pv: true, quelle: null },
      { id: 'b', name: 'Haus 2', umriss: [[-55, 10], [-35, 10], [-35, 45], [-55, 45]], geschosse: 2, geschossHoehe: 3, stil: 'holz', dachGruen: false, pv: false, quelle: null },
    ],
    wohnung: { grundrissId: 'g', gebaeudeId: 'a', geschoss: 2, x: 41.5, z: -37.25, drehung: 90 },
    aussen: {
      spielplatz: [[0, 0], [10, 0], [10, 10]],
      tiefgarage: { x: 5, z: -5, breite: 20, laenge: 40, drehung: 0 },
      wege: [[[-10, -10], [10, 10]]],
    },
  }
  const kopie = JSON.stringify(ort)
  const dx = 7.5
  const dz = -12.25
  const neu = R.mitteVerlegen(ort, dx, dz)
  wahr('mitteVerlegen aendert die Eingabe nicht', JSON.stringify(ort) === kopie)
  const paare = [
    ...ort.gebaeude.flatMap((g, i) => g.umriss.map((p, j) => [p, neu.gebaeude[i].umriss[j]])),
    [[ort.wohnung.x, ort.wohnung.z], [neu.wohnung.x, neu.wohnung.z]],
    ...ort.aussen.spielplatz.map((p, j) => [p, neu.aussen.spielplatz[j]]),
    [[ort.aussen.tiefgarage.x, ort.aussen.tiefgarage.z], [neu.aussen.tiefgarage.x, neu.aussen.tiefgarage.z]],
    ...ort.aussen.wege[0].map((p, j) => [p, neu.aussen.wege[0][j]]),
  ]
  // 1 cm auf der Erde: so viel Grad.
  const cmLat = 0.01 / 110574
  const cmLon = 0.01 / (111320 * Math.cos((lat0 * Math.PI) / 180))
  paare.forEach(([alt, jetzt], i) => {
    const [la, lo] = geo(lat0, lon0, alt)
    const [lb, lob] = geo(neu.lat, neu.lon, jetzt)
    nahe(`Punkt ${i} bleibt (Breite)`, lb, la, cmLat)
    nahe(`Punkt ${i} bleibt (Laenge)`, lob, lo, cmLon)
  })
  wahr('Drehung, Haus und Stockwerk bleiben', neu.wohnung.drehung === 90 && neu.wohnung.gebaeudeId === 'a' && neu.wohnung.geschoss === 2)
  wahr('ohne Wohnung bleibt ohne', R.mitteVerlegen({ ...ort, wohnung: null }, 1, 1).wohnung === null)
}

// Stockwerke.
{
  const t = (k, v) => (k === 'siedlung.geschoss_eg' ? 'EG' : `${v.n}.`)
  wahr('Stockwerk 0', R.geschossName(t, 0) === 'EG')
  wahr('Stockwerk 2', R.geschossName(t, 2) === '2.')
}

/* ------------------------------------------------------------ 2. Schalter */

{
  const speicher = new Map()
  let gesperrt = false
  globalThis.localStorage = {
    getItem: (k) => {
      if (gesperrt) throw new Error('gesperrt')
      return speicher.has(k) ? speicher.get(k) : null
    },
    setItem: (k, v) => {
      if (gesperrt) throw new Error('gesperrt')
      speicher.set(k, String(v))
    },
    removeItem: (k) => {
      if (gesperrt) throw new Error('gesperrt')
      speicher.delete(k)
    },
  }
  globalThis.window = new EventTarget()
  let gemeldet = 0
  window.addEventListener('kistly:siedlung-knopf', () => gemeldet++)
  wahr('Knopf ohne Wahl an', K.siedlungKnopfAn() === true)
  K.siedlungKnopfSetzen(false)
  wahr('Knopf aus', K.siedlungKnopfAn() === false && speicher.get('kistly.siedlung.knopf') === '0')
  K.siedlungKnopfSetzen(true)
  wahr('Knopf wieder an', K.siedlungKnopfAn() === true && speicher.get('kistly.siedlung.knopf') === '1')
  wahr('jede Aenderung gemeldet', gemeldet === 2)
  gesperrt = true
  K.siedlungKnopfSetzen(false)
  wahr('ohne Speicher gilt die Wahl der Sitzung', K.siedlungKnopfAn() === false)
  gesperrt = false
  delete globalThis.localStorage
  delete globalThis.window
}

/* ------------------------------------------------------------ 3. Woerter */

function schluessel(datei) {
  const txt = lesen(datei)
  const re = /'([a-z_]+\.[a-z0-9_.]+)':\s*\{\s*de:/g
  return new Set([...txt.matchAll(re)].map((m) => m[1]))
}
const nachgeladen = schluessel('src/lib/i18n/bausteine/siedlung.ts')
const beimStart = schluessel('src/lib/i18n/bausteine/umzuege.ts')
const SIEDLUNG_DATEIEN = [
  'src/pages/Siedlungen.tsx',
  'src/pages/SiedlungAnsicht.tsx',
  'src/components/SiedlungEinrichten.tsx',
  'src/components/plan3d/Raum3D.tsx',
]
for (const datei of SIEDLUNG_DATEIEN) {
  for (const m of lesen(datei).matchAll(/'(siedlung\.[a-z0-9_.]+)'/g)) {
    wahr(`${m[1]} (${datei}) steht in siedlung.ts`, nachgeladen.has(m[1]))
  }
}
for (const k of ['nav.siedlung', 'einstellungen.siedlung_knopf', 'einstellungen.siedlung_knopf_hinweis']) {
  wahr(`${k} steht in umzuege.ts (beim Start da)`, beimStart.has(k))
  wahr(`${k} nicht im nachgeladenen Baustein`, !nachgeladen.has(k))
}
for (const datei of ['src/components/AppShell.tsx', 'src/pages/Settings.tsx', 'src/App.tsx']) {
  wahr(`${datei} benutzt keinen nachgeladenen Schluessel`, !/'siedlung\.[a-z0-9_.]+'/.test(lesen(datei)))
}
wahr('woerter.ts laedt siedlung.ts nicht beim Start', !/bausteine\/siedlung/.test(lesen('src/lib/i18n/woerter.ts')))

/* ------------------------------------------------------------ 4. Nichts beim Start */

{
  const app = lesen('src/App.tsx')
  wahr('App.tsx: Siedlungen nur per lazy()', /lazy\(\(\) => import\('\.\/pages\/Siedlungen'\)\)/.test(app))
  wahr('App.tsx: SiedlungAnsicht nur per lazy()', /lazy\(\(\) => import\('\.\/pages\/SiedlungAnsicht'\)\)/.test(app))
  wahr('App.tsx: kein fester Import der Siedlung', !/^import .* from '\.\/pages\/Siedlung/m.test(app))
  for (const datei of ['src/App.tsx', 'src/components/AppShell.tsx', 'src/pages/Settings.tsx', 'src/pages/AppLayout.tsx']) {
    const txt = lesen(datei)
    wahr(`${datei}: kein three, keine Siedlung beim Start`, !/from '(three|[^']*siedlung3d|[^']*\/osm|[^']*Siedlung(en|Ansicht|Einrichten))'/.test(txt))
  }
  const ansicht = lesen('src/pages/SiedlungAnsicht.tsx')
  wahr('SiedlungAnsicht: siedlung3d nur per import()', /import\('\.\.\/components\/plan3d\/siedlung3d'\)/.test(ansicht) && !/^import \{[^}]*\} from '\.\.\/components\/plan3d\/siedlung3d'/m.test(ansicht))
  wahr('SiedlungAnsicht: Raum3D nur als Typ', !/^import (?!type)[^\n]* from '\.\.\/components\/plan3d\/Raum3D'/m.test(ansicht))
  for (const datei of ['src/pages/Siedlungen.tsx', 'src/components/SiedlungEinrichten.tsx']) {
    wahr(`${datei}: ohne three`, !/from 'three'|plan3d\/(Raum3D|motor|siedlung3d)'/.test(lesen(datei)))
  }
}

// Der fertige Bau: alles, was der Start fest laedt (Einstieg und seine
// festen Importe, ohne import()), frei von three und Siedlung.
{
  const html = 'dist/index.html'
  if (!fs.existsSync(html)) {
    console.log('ABWEICHUNG dist/index.html fehlt: erst npm run build')
    fehler++
  } else {
    const einstieg = /<script[^>]*type="module"[^>]*src="([^"]+)"/.exec(lesen(html))?.[1]
    wahr('Einstieg im Bau gefunden', !!einstieg)
    const ordner = 'dist'
    const gesehen = new Set()
    const offen = einstieg ? [path.join(ordner, einstieg.replace(/^.*\/assets\//, 'assets/'))] : []
    while (offen.length) {
      const datei = offen.pop()
      if (gesehen.has(datei) || !fs.existsSync(datei)) continue
      gesehen.add(datei)
      const txt = lesen(datei)
      // Feste Importe: from"./x.js" und import"./x.js", nicht import("./x.js").
      for (const m of txt.matchAll(/(?:from|import)\s*"(\.\/[^"]+\.js)"/g)) offen.push(path.join(path.dirname(datei), m[1]))
    }
    const start = [...gesehen].map((d) => [d, lesen(d)])
    wahr('Start besteht aus mehreren Teilen', start.length >= 1)
    for (const [d, txt] of start) {
      wahr(`${d}: kein three beim Start`, !txt.includes('WebGLRenderer'))
      wahr(`${d}: keine Saetze der Siedlung beim Start`, !txt.includes('siedlung.leer_titel') && !txt.includes('siedlung.zur_wohnung'))
    }
    wahr('Knopf und Schalter sind beim Start da', start.some(([, txt]) => txt.includes('kistly.siedlung.knopf')) && start.some(([, txt]) => txt.includes('nav.siedlung')))
    const alle = fs.readdirSync(path.join(ordner, 'assets')).filter((f) => f.endsWith('.js'))
    wahr('die Seiten der Siedlung liegen in eigenen Teilen', alle.some((f) => lesen(path.join(ordner, 'assets', f)).includes('siedlung.leer_titel')))
  }
}

if (fehler) {
  console.log(`${fehler} Abweichung(en)`)
  process.exit(1)
}
console.log('ok')
