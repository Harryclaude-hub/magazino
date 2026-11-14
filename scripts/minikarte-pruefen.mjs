// Prueft die gemeinsame Siedlung (E86, Oberflaeche) ohne Browser:
//  1. Die Rechnungen der Minikarte (src/components/plan3d/Minikarte.tsx):
//     Ausschnitt, Punkt im Umriss, Abstand zum Umriss, welches Haus an
//     einer Stelle liegt, welches Sprungziel ein Haus hat (eigenes
//     Stockwerk zuerst), Drehung des Pfeils (passt zur Blickrichtung des
//     Motors), was gezeichnet wird und wann neu.
//  2. Die Minikarte als HTML: Haeuser mit Namen, Flaechen, eigener Pfeil,
//     andere als Punkte mit Kuerzel (anderes Stockwerk blass), Stockwerk
//     oben, eingeklappt nur ein Knopf, kaputter Rahmen gar nichts, nie
//     gespiegelt. Auf Deutsch und auf Arabisch.
//  3. Der Dialog "Leute" (src/components/SiedlungLeute.tsx): Saetze je
//     Antwort beim Einladen, Reihenfolge, Besitzer und Gast, Laden, Fehler
//     und leer. E87b: Leute im Umzug ("im Umzug", nicht entfernbar, keine
//     Gaeste fuer die Grenze von 20, selbst so dabei: kein Verlassen).
//  4. Der Kanal (src/lib/anwesenheit.ts): nur 'wohnung:<Kennung>' und
//     'siedlung:<Kennung>', sonst ein sichtbarer Fehler.
//  5. Der Vertrag zwischen Seite, Raum3D und Minikarte, die Woerter und
//     dass in den neuen Dateien nichts Persoenliches steht.
//  6. E87, grosse Karten: Stufen nah, mittel, ganz (Knoepfe + und -),
//     Ausschnitt folgt einem selbst, Kacheln fuer Namen, feste Pfade je
//     Art (Haeuser, Flaechen, Strassen mit Breite in Metern), Orte nur nah
//     und mittel, Tippen und Ziele bei Tausenden Haeusern, und das
//     Zeitbudget: hoechstens 2 ms je Takt bei 4000 Haeusern und 20 Leuten
//     (erfundene Karte im Gitter). Je Takt zeichnet React nichts: der Takt
//     setzt nur Attribute an den Marken (markenSetzen) und nur die, die
//     sich geaendert haben; React baut die Marken nur, wenn jemand kommt
//     oder geht (markenGerippe). Namen von Orten in ihrer Richtung
//     (textRichtung, wie dir=auto).
// Alle Namen und Zahlen sind erfunden. Aufruf im Projektordner:
//   node scripts/minikarte-pruefen.mjs
// Ausgabe "ok" oder die abweichenden Faelle, Exit 1 bei Fehlern.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'

let fehler = 0
function wahr(name, ist) {
  if (!ist) {
    console.log('ABWEICHUNG', name, 'ist nicht wahr')
    fehler++
  }
}
function nahe(name, ist, soll, tol = 1e-9) {
  if (!(Math.abs(ist - soll) <= tol)) {
    console.log('ABWEICHUNG', name, 'ist', ist, 'soll', soll)
    fehler++
  }
}
const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const lesen = (p) => fs.readFileSync(p, 'utf8')
/** Ein erfundenes SVG-Element: haelt jede Zuweisung fest wie ein echtes. */
function element() {
  const attr = {}
  return {
    attr,
    setAttribute(n, v) {
      attr[n] = String(v)
    },
  }
}

// Eigener Zwischenspeicher im Temp-Ordner, wie die anderen Pruefungen.
const vite = await createServer({
  cacheDir: path.join(os.tmpdir(), 'kistly-minikarte-pruefen'),
  server: { middlewareMode: true, hmr: false, ws: false },
  appType: 'custom',
  logLevel: 'error',
  optimizeDeps: { noDiscovery: true, include: [] },
})
let M
let L
let A
let I
let W
let S
let U
try {
  M = await vite.ssrLoadModule('/src/components/plan3d/Minikarte.tsx')
  L = await vite.ssrLoadModule('/src/components/SiedlungLeute.tsx')
  A = await vite.ssrLoadModule('/src/lib/anwesenheit.ts')
  I = await vite.ssrLoadModule('/src/lib/i18n/index.tsx')
  W = await vite.ssrLoadModule('/src/lib/i18n/woerter.ts')
  S = await vite.ssrLoadModule('/src/lib/i18n/bausteine/siedlung.ts')
  U = await vite.ssrLoadModule('/src/components/ui.tsx')
} finally {
  await vite.close()
}
// Wie die Seite der Siedlung: ihre Saetze kommen nachgeladen dazu.
W.woerterNachladen(S.siedlungWoerter)

/** Rendert mit Sprache (aus dem vorgetaeuschten Speicher) und weiterem Speicher. */
function rendern(element, sprache = 'de', speicher = {}) {
  const daten = { 'kistly.lang': sprache, ...speicher }
  globalThis.localStorage = {
    getItem: (k) => (k in daten ? daten[k] : null),
    setItem: (k, v) => {
      daten[k] = String(v)
    },
    removeItem: (k) => {
      delete daten[k]
    },
  }
  try {
    return renderToStaticMarkup(h(I.SpracheProvider, null, element))
  } finally {
    delete globalThis.localStorage
  }
}

/* ------------------------------------------------------------ 1. Rechnen */

const quadrat = (x0, z0, x1, z1) => [
  [x0, z0],
  [x1, z0],
  [x1, z1],
  [x0, z1],
]

{
  const a = M.kartenAusschnitt([-50, -30, 70, 40])
  nahe('Ausschnitt: Seite mit Rand', a.seite, 120 * 1.08, 1e-9)
  nahe('Ausschnitt: links', a.x, 10 - (120 * 1.08) / 2, 1e-9)
  nahe('Ausschnitt: oben', a.y, 5 - (120 * 1.08) / 2, 1e-9)
  wahr('Ausschnitt: Reihenfolge der Ecken egal', gleich(M.kartenAusschnitt([70, 40, -50, -30]), a))
  wahr('Ausschnitt: NaN', M.kartenAusschnitt([0, 0, NaN, 10]) === null)
  wahr('Ausschnitt: drei Zahlen', M.kartenAusschnitt([0, 0, 10]) === null)
  wahr('Ausschnitt: ohne Flaeche', M.kartenAusschnitt([5, 5, 5, 5]) === null)
  wahr('Ausschnitt: null', M.kartenAusschnitt(null) === null)
  wahr('Ausschnitt: Text statt Zahl', M.kartenAusschnitt([0, 0, '10', 10]) === null)
}

{
  const q = quadrat(0, 0, 10, 10)
  wahr('im Umriss: Mitte', M.imPolygon([5, 5], q))
  wahr('im Umriss: aussen', !M.imPolygon([12, 5], q))
  // L-Form: die Ecke oben rechts fehlt.
  const l = [
    [0, 0],
    [6, 0],
    [6, 4],
    [10, 4],
    [10, 10],
    [0, 10],
  ]
  wahr('L-Form: in der Kerbe nicht drin', !M.imPolygon([8, 2], l))
  wahr('L-Form: im Fuss drin', M.imPolygon([8, 7], l))
  nahe('Abstand: innen 0', M.abstandZumUmriss([5, 5], q), 0)
  nahe('Abstand: 3 m rechts', M.abstandZumUmriss([13, 5], q), 3)
  nahe('Abstand: schraeg vor der Ecke', M.abstandZumUmriss([13, 14], q), 5)
  wahr('Abstand: leerer Umriss unendlich', M.abstandZumUmriss([0, 0], []) === Infinity)
}

const KARTE = {
  rahmen: [-60, -40, 60, 40],
  haeuser: [
    { name: 'Haus Nord', punkte: quadrat(-40, -30, 0, -5) },
    { name: 'Haus Sued', punkte: quadrat(10, 5, 50, 30) },
    { name: 'Hof', punkte: quadrat(-35, -25, -25, -15) },
    { name: 'kaputt', punkte: [[0, 0]] },
  ],
  flaechen: [
    { art: 'weg', punkte: quadrat(-60, -2, 60, 2) },
    { art: 'spielplatz', punkte: quadrat(-50, 10, -30, 25) },
    { art: 'strasse', punkte: quadrat(-60, 35, 60, 40) },
    { art: 'garten', punkte: quadrat(-60, -40, 60, 40) },
  ],
}

{
  wahr('Haus: drin', M.hausAn(KARTE, [-10, -10], 1) === 0)
  wahr('Haus: im kleineren von zweien', M.hausAn(KARTE, [-30, -20], 1) === 2)
  wahr('Haus: knapp daneben, mit Spielraum', M.hausAn(KARTE, [52, 20], 3) === 1)
  wahr('Haus: knapp daneben, ohne Spielraum', M.hausAn(KARTE, [52, 20], 1) === null)
  wahr('Haus: weit weg', M.hausAn(KARTE, [-55, 30], 2) === null)
  wahr('Haus: das naechste gewinnt', M.hausAn({ ...KARTE, haeuser: [KARTE.haeuser[0], { name: 'B', punkte: quadrat(3, -30, 20, -5) }] }, [1, -10], 3) === 0)
  wahr('Haus: zu wenige Punkte zaehlen nicht', M.hausAn({ ...KARTE, haeuser: [KARTE.haeuser[3]] }, [0, 0], 5) === null)
}

{
  const haus = quadrat(0, 0, 20, 10)
  const ebenenY = [0, 3, 6]
  const ziele = [
    { name: 'Top 1', ebene: 0, x: 5, z: 5, gier: 0 },
    { name: 'Top 4', ebene: 1, x: 5, z: 5, gier: 0 },
    { name: 'Haustuer', ebene: 0, x: 10, z: 11.5, gier: 0 },
    { name: 'Nachbar', ebene: 0, x: 40, z: 5, gier: 0 },
    { name: 'Top 7', ebene: 2, x: 15, z: 5, gier: 0 },
    { name: 'kaputt', ebene: 9, x: 6, z: 5, gier: 0 },
    { name: 'NaN', ebene: 0, x: NaN, z: 5, gier: 0 },
  ]
  wahr('Ziel: ohne Begehen das unterste Stockwerk', M.sprungImHaus(haus, ziele, ebenenY, [5, 5], null) === 0)
  wahr('Ziel: auf dem 1. Stock das dortige', M.sprungImHaus(haus, ziele, ebenenY, [5, 5], 3 + 1.64) === 1)
  wahr('Ziel: auf dem 2. Stock das dortige, auch etwas weiter weg', M.sprungImHaus(haus, ziele, ebenenY, [5, 5], 6 + 1.64) === 4)
  wahr('Ziel: an der Tuer die Haustuer (vor dem Umriss)', M.sprungImHaus(haus, ziele, ebenenY, [10, 11], null) === 2)
  wahr('Ziel: ein Nachbarhaus zaehlt nicht', M.sprungImHaus(haus, [ziele[3]], ebenenY, [19, 5], null) === null)
  wahr('Ziel: kein Ziel, nichts', M.sprungImHaus(haus, [], ebenenY, [5, 5], null) === null)
  wahr('Ziel: unbekannte Ebene und NaN zaehlen nicht', M.sprungImHaus(haus, [ziele[5], ziele[6]], ebenenY, [5, 5], null) === null)
  // Gleich gut: das erste in der Liste (fest, nicht zufaellig).
  const zwei = [
    { name: 'A', ebene: 0, x: 4, z: 5, gier: 0 },
    { name: 'B', ebene: 0, x: 6, z: 5, gier: 0 },
  ]
  wahr('Ziel: Gleichstand nimmt das erste', M.sprungImHaus(haus, zwei, ebenenY, [5, 5], null) === 0)
  wahr('Ziel: Augenhoehe NaN wie ohne Begehen', M.sprungImHaus(haus, ziele, ebenenY, [5, 5], NaN) === 0)
  wahr('Ziel: Rand des Hauses ist 4 m', M.HAUS_RAND_M === 4)
}

{
  nahe('Pfeil: Norden', M.pfeilGrad(0), 0)
  nahe('Pfeil: NaN', M.pfeilGrad(NaN), 0)
  nahe('Pfeil: halb links', M.pfeilGrad(Math.PI / 2), -90)
  nahe('Pfeil: halb rechts', M.pfeilGrad(-Math.PI / 2), 90)
  wahr('Pfeil: innerhalb -180 bis 180', [7, -7, 20, -20].every((g) => Math.abs(M.pfeilGrad(g)) <= 180))
  // Der Motor schaut bei gier g in Richtung (-sin g, -cos g) (x, z). Der
  // Pfeil zeigt ungedreht nach oben (0, -1); SVG dreht im Uhrzeigersinn.
  for (let g = -3; g <= 3; g += 0.37) {
    const w = (M.pfeilGrad(g) * Math.PI) / 180
    const px = Math.sin(w)
    const pz = -Math.cos(w)
    nahe(`Pfeil zeigt in Blickrichtung x (${g.toFixed(2)})`, px, -Math.sin(g), 0.02)
    nahe(`Pfeil zeigt in Blickrichtung z (${g.toFixed(2)})`, pz, -Math.cos(g), 0.02)
  }
}

const pose = (x, y, z, gier = 0) => ({ x, y, z, gier, neigung: 0, haltung: 'stehen', tempo: 0 })
const UID_A = '00000000-0000-4000-8000-00000000000a'
const UID_B = '00000000-0000-4000-8000-00000000000b'

{
  const leer = M.kartenStand({ eigene: null, andere: new Map() })
  wahr('Stand: ohne Begehen kein Pfeil', leer.ich === null && leer.andere.length === 0)
  const s = M.kartenStand({
    eigene: pose(1.234, 1.64, -2.26, 0.1),
    andere: new Map([
      [UID_B, pose(10, 4.64, 10)],
      [UID_A, pose(5.04, 1.64, 5)],
      ['kaputt', pose(NaN, 0, 0)],
    ]),
  })
  wahr('Stand: gerundet auf 10 cm', s.ich.x === 1.2 && s.ich.z === -2.3)
  wahr('Stand: Pfeil in 5-Grad-Stufen', s.ich.grad % 5 === 0)
  wahr('Stand: geordnet, ohne Kaputtes', gleich(s.andere.map((a) => a.uid), [UID_A, UID_B]))
  wahr('Stand: gleiches Stockwerk kraeftig', s.andere[0].blass === false)
  wahr('Stand: anderes Stockwerk blass', s.andere[1].blass === true)
  const fast = M.kartenStand({ eigene: pose(1.21, 1.64, -2.27, 0.11), andere: new Map([[UID_A, pose(5.02, 1.64, 5)], [UID_B, pose(10, 4.64, 10)]]) })
  wahr('Stand: kleine Bewegung zeichnet nicht neu', fast.schluessel === s.schluessel)
  const weiter = M.kartenStand({ eigene: pose(1.5, 1.64, -2.26, 0.1), andere: new Map([[UID_A, pose(5.04, 1.64, 5)], [UID_B, pose(10, 4.64, 10)]]) })
  wahr('Stand: 30 cm zeichnet neu', weiter.schluessel !== s.schluessel)
  const ohneIch = M.kartenStand({ eigene: null, andere: new Map([[UID_B, pose(10, 40, 10)]]) })
  wahr('Stand: ohne eigene Stelle niemand blass', ohneIch.andere[0].blass === false)
  wahr('Takt: hoechstens 5 je Sekunde', M.KARTE_TAKT_MS >= 200)
  wahr('Speicher: fester Schluessel', M.KARTE_ZU_SCHLUESSEL === 'kistly.minikarte.zu')
}

/* ------------------------------------------------------------ 2. Karte */

const LEUTE = [
  { uid: UID_A, name: 'Anna Beispiel', farbe: '#4f6d8f' },
  { uid: UID_B, name: 'Bernd Test', farbe: '#7a5c8e' },
]
const LAGE = { eigene: pose(-10, 1.64, -10, Math.PI / 2), andere: new Map([[UID_A, pose(20, 1.64, 20)], [UID_B, pose(30, 7.64, 20)]]) }
function karte(props = {}, sprache = 'de', speicher = {}) {
  return rendern(
    h(M.default, {
      karte: KARTE,
      lage: () => LAGE,
      leute: LEUTE,
      ebene: null,
      onHaus: () => {},
      ...props,
    }),
    sprache,
    speicher,
  )
}

{
  const html = karte()
  wahr('Karte: SVG da', html.includes('<svg'))
  wahr('Karte: alle brauchbaren Haeuser', html.includes('data-haus="0"') && html.includes('data-haus="1"') && html.includes('data-haus="2"') && !html.includes('data-haus="3"'))
  wahr('Karte: Namen der Haeuser', html.includes('>Haus Nord<') && html.includes('>Haus Sued<'))
  // E87: eine Flaeche je Art als Pfad, alle Haeuser in einem Pfad, dazu je
  // Haus mit Ziel ein unsichtbarer Knopf (Vieleck) fuer die Tasten.
  wahr('Karte: vier Flaechen als Pfade', (html.match(/data-flaeche="/g) ?? []).length === 4)
  wahr('Karte: Flaechen von unten nach oben (Garten unter Weg)', html.indexOf('data-flaeche="garten"') < html.indexOf('data-flaeche="weg"'))
  wahr('Karte: Haeuser in einem Pfad', (html.match(/data-haeuser="3"/g) ?? []).length === 1)
  wahr('Karte: Umriss gleich duenn in jeder Stufe', /data-haeuser="3"[^>]*vector-effect="non-scaling-stroke"/.test(html))
  wahr('Karte: Knoepfe nur als Vielecke', (html.match(/<polygon/g) ?? []).length === 3)
  wahr('Karte: Siedlung allein ohne Stufenknoepfe', !html.includes('aria-label="Näher heran"') && html.includes('data-zoom="ganz"'))
  wahr('Karte: eigener Pfeil mit Drehung', /data-ich=""[^>]*transform="translate\(-10 -10\) rotate\(-90\)/.test(html))
  wahr('Karte: Punkte der anderen', html.includes(`data-person="${UID_A}"`) && html.includes(`data-person="${UID_B}"`))
  wahr('Karte: Kuerzel', html.includes('>AB<') && html.includes('>BT<'))
  wahr('Karte: anderes Stockwerk blass', new RegExp(`data-person="${UID_B}"[^>]*opacity="0.45"`).test(html))
  wahr('Karte: gleiches Stockwerk kraeftig', new RegExp(`data-person="${UID_A}"[^>]*opacity="1"`).test(html))
  wahr('Karte: ohne Stockwerk steht "Karte"', html.includes('>Karte<'))
  wahr('Karte: Knopf zum Einklappen', html.includes('aria-label="Karte einklappen"'))
  wahr('Karte: Norden', html.includes('>N<'))
  wahr('Karte: ohne springbar ist jedes Haus ein Knopf', (html.match(/role="button"/g) ?? []).length === 3)
  wahr('Karte: Vorlesename des Hauses', html.includes('aria-label="Zu Haus Nord gehen"'))
  // Die Breite gibt seit E87 die Spalte in Raum3D vor (7,5 rem am Handy).
  wahr('Karte: fuellt ihre Spalte', html.includes('w-full overflow-hidden rounded-2xl'))
}
{
  const html = karte({ ebene: 'Haus Nord 2. OG', springbar: [true, false, false] })
  wahr('Karte: Stockwerk oben', html.includes('>Haus Nord 2. OG<'))
  wahr('Karte: nur Haeuser mit Ziel sind Knoepfe', (html.match(/role="button"/g) ?? []).length === 1 && /data-haus="0"[^>]*role="button"/.test(html))
}
{
  const html = karte({ lage: () => ({ eigene: null, andere: new Map() }) })
  wahr('Karte: ohne Begehen kein Pfeil, keine Punkte', !html.includes('data-ich') && !html.includes('data-person'))
  const fremd = karte({ leute: [] })
  wahr('Karte: Unbekannte mit ?', fremd.includes('>?<'))
}
{
  const html = karte({}, 'de', { 'kistly.minikarte.zu': '1' })
  wahr('eingeklappt: nur ein Knopf', !html.includes('data-haus') && !html.includes('role="group"') && html.includes('aria-label="Karte zeigen"') && html.includes('aria-expanded="false"'))
  wahr('kaputter Rahmen: nichts', karte({ karte: { ...KARTE, rahmen: [0, 0, NaN, 1] } }) === '')
  // E87: zu niedrige 3D-Flaeche (quer ohne Vollbild): nur der Knopf, nicht gemerkt.
  const eng = karte({ hoeheFrei: 120 })
  wahr('zu niedrig: nur ein Knopf', eng.includes('data-eng=""') && !eng.includes('data-haus') && eng.includes('aria-label="Karte zeigen"'))
  wahr('hoch genug: ganze Karte', karte({ hoeheFrei: 400 }).includes('data-haus="0"') && !karte({ hoeheFrei: 400 }).includes('data-eng'))
  wahr('ohne Angabe: ganze Karte', karte().includes('data-haus="0"'))
  wahr('eingeklappt und eng: kein Zeichen eng', !karte({ hoeheFrei: 120 }, 'de', { 'kistly.minikarte.zu': '1' }).includes('data-eng'))
  wahr('Grenze: Breite plus Kopf und Rand', M.KARTE_EXTRA_PX === 100 && karte({ hoeheFrei: 259 }).includes('data-eng') && !karte({ hoeheFrei: 260 }).includes('data-eng'))
}
{
  const de = karte()
  const ar = karte({}, 'ar')
  const box = (x) => /viewBox="([^"]+)"/.exec(x)?.[1]
  wahr('arabisch: gleicher Ausschnitt (nie gespiegelt)', box(de) === box(ar) && !ar.includes('scale(-1'))
  wahr('arabisch: Einklappen', ar.includes('aria-label="طي الخريطة"'))
  wahr('arabisch: Namen bleiben', ar.includes('>Haus Nord<'))
  wahr('arabisch: Norden', ar.includes('>ش<'))
}

/* ------------------------------------------------------------ 3. Leute */

const ICH = '00000000-0000-4000-8000-000000000001'
const GAST = '00000000-0000-4000-8000-000000000002'
{
  // Die Saetze laufen ueber die echte Uebersetzung (tg), Sprache Deutsch.
  const t = (k, v) => I.tg(k, v)
  const ok = L.einladungMeldung({ status: 'ok', name: 'Clara Muster' }, t)
  wahr('Einladen ok: Satz mit Name', ok.art === 'ok' && ok.text.includes('Clara Muster') && ok.text.includes('dabei'))
  const faelle = {
    nicht_gefunden: 'Magazino-Konto',
    mehrdeutig: 'mehrere',
    schon_drin: 'schon dabei',
    selbst: 'selbst',
    zu_viele: 'zu viele',
  }
  for (const [status, stueck] of Object.entries(faelle)) {
    const m = L.einladungMeldung({ status }, t)
    wahr(`Einladen ${status}: Hinweis`, m.art === 'hinweis' && m.text.includes(stueck))
  }
  const fremd = L.einladungMeldung({ status: 'komisch' }, t)
  wahr('Einladen unbekannt: Fehler mit Grund', fremd.art === 'fehler' && fremd.text.includes('komisch'))
  const texte = new Set(Object.keys(faelle).map((s) => L.einladungMeldung({ status: s }, t).text))
  wahr('Einladen: jeder Fall ein eigener Satz', texte.size === Object.keys(faelle).length)
}
{
  const liste = [
    { user_id: GAST, name: 'zora', avatar3d: null, rolle: 'gast' },
    { user_id: ICH, name: 'Xaver', avatar3d: null, rolle: 'besitzer' },
    { user_id: '00000000-0000-4000-8000-000000000003', name: 'Anton', avatar3d: null, rolle: 'gast' },
  ]
  wahr('Reihenfolge: Besitzer, dann nach Name', gleich(L.mitgliederOrdnen(liste).map((m) => m.name), ['Xaver', 'Anton', 'zora']))
  wahr('Reihenfolge: Liste bleibt unveraendert', liste[0].name === 'zora')
  // E87b: drei Rollen, Besitzer, dann im Umzug, dann Gaeste (der Vergleich
  // bleibt in jeder Reihenfolge der Eingabe gleich).
  const drei = [
    { user_id: '00000000-0000-4000-8000-000000000004', name: 'Berta', avatar3d: null, rolle: 'gast' },
    { user_id: '00000000-0000-4000-8000-000000000005', name: 'Yusuf', avatar3d: null, rolle: 'umzug' },
    ...liste,
    { user_id: '00000000-0000-4000-8000-000000000006', name: 'Carl', avatar3d: null, rolle: 'umzug' },
  ]
  const soll = ['Xaver', 'Carl', 'Yusuf', 'Anton', 'Berta', 'zora']
  wahr('Reihenfolge: Besitzer, im Umzug, Gaeste', gleich(L.mitgliederOrdnen(drei).map((m) => m.name), soll))
  wahr('Reihenfolge: unabhaengig von der Eingabe', gleich(L.mitgliederOrdnen([...drei].reverse()).map((m) => m.name), soll))
  wahr('Rollen: Namen im Woerterbuch', L.rolleName('besitzer') === 'siedlung.rolle_besitzer' && L.rolleName('gast') === 'siedlung.rolle_gast' && L.rolleName('umzug') === 'siedlung.rolle_umzug')
  wahr('Gaeste: hoechstens 20 (0046)', L.GAESTE_MAX === 20)
}

const BESITZER = { user_id: ICH, name: 'Xaver Muster', avatar3d: null, rolle: 'besitzer' }
const EIN_GAST = { user_id: GAST, name: 'Clara Beispiel', avatar3d: null, rolle: 'gast' }
function leute(props, sprache = 'de') {
  return rendern(
    h(
      MemoryRouter,
      null,
      h(
        U.ToastProvider,
        null,
        h(L.LeuteInhalt, {
          open: true,
          onClose: () => {},
          siedlungId: '00000000-0000-4000-8000-0000000000aa',
          siedlungName: 'Zuhause',
          ich: ICH,
          besitzer: true,
          mitglieder: { data: [BESITZER, EIN_GAST], loading: false, error: null, reload: () => {} },
          ...props,
        }),
      ),
    ),
    sprache,
  )
}
{
  const html = leute({})
  wahr('Besitzer: Feld E-Mail oder Name', html.includes('placeholder="E-Mail oder Name"'))
  wahr('Besitzer: Knopf Einladen', html.includes('Einladen'))
  wahr('Besitzer: Gast entfernbar', html.includes('aria-label="Clara Beispiel entfernen"'))
  wahr('Besitzer: sich selbst nicht entfernbar', !html.includes('aria-label="Xaver Muster entfernen"'))
  wahr('Besitzer: Du und Rollen', html.includes('>Du<') && html.includes('>Besitzer<') && html.includes('>Gast<'))
  wahr('Besitzer: Besitzer zuerst', html.indexOf('Xaver Muster') < html.indexOf('Clara Beispiel'))
  wahr('Besitzer: kein Verlassen', !html.includes('Siedlung verlassen'))
  wahr('Besitzer: Namen in eigener Richtung', html.includes('dir="auto"'))
}
{
  const html = leute({ mitglieder: { data: [BESITZER], loading: false, error: null, reload: () => {} } })
  wahr('Besitzer allein: Hinweis leer', html.includes('Noch niemand eingeladen.'))
  const laedt = leute({ mitglieder: { data: null, loading: true, error: null, reload: () => {} } })
  wahr('Laden: eigener Zustand', laedt.includes('Leute werden geladen') && !laedt.includes('<ul'))
  const kaputt = leute({ mitglieder: { data: null, loading: false, error: 'Netz weg', reload: () => {} } })
  wahr('Fehler: eigener Zustand mit Nochmal', kaputt.includes('role="alert"') && kaputt.includes('Netz weg') && kaputt.includes('Nochmal'))
  const neuLaden = leute({ mitglieder: { data: [BESITZER, EIN_GAST], loading: true, error: null, reload: () => {} } })
  wahr('Neu laden: Liste bleibt stehen', neuLaden.includes('Clara Beispiel'))
}
{
  const html = leute({ besitzer: false, ich: GAST })
  wahr('Gast: kein Feld zum Einladen', !html.includes('placeholder="E-Mail oder Name"'))
  wahr('Gast: Hinweis', html.includes('Du bist Gast in dieser Siedlung.'))
  wahr('Gast: niemand entfernbar', !html.includes('entfernen"'))
  wahr('Gast: Verlassen', html.includes('Siedlung verlassen'))
  wahr('Gast: kein Hinweis "niemand eingeladen"', !html.includes('Noch niemand eingeladen.'))
}
{
  // E87b: Leute im Umzug der eigenen Wohnung des Besitzers.
  const UMZUG = { user_id: '00000000-0000-4000-8000-000000000007', name: 'Ula Umzug', avatar3d: null, rolle: 'umzug' }
  const html = leute({ mitglieder: { data: [BESITZER, EIN_GAST, UMZUG], loading: false, error: null, reload: () => {} } })
  wahr('Umzug: als "im Umzug" gezeigt', html.includes('>im Umzug<'))
  wahr('Umzug: nicht entfernbar', !html.includes('aria-label="Ula Umzug entfernen"') && html.includes('aria-label="Clara Beispiel entfernen"'))
  wahr('Umzug: zaehlt nicht als Gast (Zahl ueber der Liste)', html.includes('data-gaeste-zahl=""') && html.includes('Gäste: 1 von 20'))
  wahr('Umzug: vor den Gaesten', html.indexOf('Ula Umzug') > html.indexOf('Xaver Muster') && html.indexOf('Ula Umzug') < html.indexOf('Clara Beispiel'))
  const nurUmzug = leute({ mitglieder: { data: [BESITZER, UMZUG], loading: false, error: null, reload: () => {} } })
  wahr('Umzug: ohne Gaeste weiter "niemand eingeladen", 0 von 20', nurUmzug.includes('Noch niemand eingeladen.') && nurUmzug.includes('Gäste: 0 von 20'))
  const selbst = leute({ besitzer: false, ich: UMZUG.user_id, mitglieder: { data: [BESITZER, EIN_GAST, UMZUG], loading: false, error: null, reload: () => {} } })
  wahr('Umzug selbst: eigener Satz, kein Verlassen, keine Zahl', selbst.includes('über den Umzug dieser Wohnung') && !selbst.includes('Siedlung verlassen') && !selbst.includes('Du bist Gast in dieser Siedlung.') && !selbst.includes('data-gaeste-zahl'))
  const gast = leute({ besitzer: false, ich: GAST, mitglieder: { data: [BESITZER, EIN_GAST, UMZUG], loading: false, error: null, reload: () => {} } })
  wahr('Gast neben Umzug: Verlassen bleibt, niemand entfernbar', gast.includes('Siedlung verlassen') && !gast.includes('entfernen"'))
  const ar = leute({ mitglieder: { data: [BESITZER, EIN_GAST, UMZUG], loading: false, error: null, reload: () => {} } }, 'ar')
  wahr('arabisch: im Umzug und Zahl', ar.includes('>في النقلة<') && ar.includes('الضيوف: 1 من 20'))
}
{
  const html = leute({}, 'ar')
  wahr('arabisch: Feld', html.includes('placeholder="البريد الإلكتروني أو الاسم"'))
  wahr('arabisch: Gast entfernen', html.includes('aria-label="إزالة Clara Beispiel"'))
  const gast = leute({ besitzer: false, ich: GAST }, 'ar')
  wahr('arabisch: Verlassen', gast.includes('مغادرة المجمّع السكني'))
}

/* ------------------------------------------------------------ 4. Kanal */

{
  const P = '00000000-0000-4000-8000-0000000000bb'
  wahr('Kanal: Standard ist die Wohnung', A.kanalName({ projectId: P }) === `wohnung:${P}`)
  wahr('Kanal: Siedlung', A.kanalName({ projectId: P, kanal: `siedlung:${P}` }) === `siedlung:${P}`)
  wahr('Kanal: klein geschrieben', A.kanalName({ projectId: P, kanal: `SIEDLUNG:${P.toUpperCase()}` }) === `siedlung:${P}`)
  wahr('Kanal: fremde Art nicht', A.kanalName({ projectId: P, kanal: `chat:${P}` }) === null)
  wahr('Kanal: zu kurz nicht', A.kanalName({ projectId: P, kanal: 'siedlung:123' }) === null)
  wahr('Kanal: mit Anhang nicht', A.kanalName({ projectId: P, kanal: `siedlung:${P}:x` }) === null)
  wahr('Kanal: Pfad nicht', A.kanalName({ projectId: P, kanal: `siedlung:../${P.slice(3)}` }) === null)
  wahr('Kanal: leer nicht', A.kanalName({ projectId: P, kanal: '' }) === null)
  wahr('Kanal: kaputter Umzug nicht', A.kanalName({ projectId: 'x' }) === null)
  // Ein falscher Kanal verbindet nicht und meldet sich sichtbar.
  const meldungen = []
  const warnungen = []
  const warnAlt = console.warn
  console.warn = (...x) => warnungen.push(x.join(' '))
  const v = A.wohnungBeitreten({
    projectId: P,
    grundrissId: P,
    uid: P,
    kanal: 'chat:offen',
    onWer: () => {},
    onPose: () => {},
    onSignal: () => {},
    onFehler: (text) => meldungen.push(text),
  })
  await new Promise((r) => setTimeout(r, 0))
  console.warn = warnAlt
  wahr('Kanal falsch: ein Fehler fuer den Nutzer', meldungen.length === 1 && meldungen[0].length > 10)
  wahr('Kanal falsch: Hinweis in der Konsole', warnungen.length === 1 && warnungen[0].includes('[wohnung]'))
  wahr('Kanal falsch: Verbindung tut nichts', typeof v.pose === 'function' && typeof v.verlassen === 'function')
  v.pose(pose(0, 1.64, 0))
  v.verlassen()
}

/* ------------------------------------------------------------ 5. Vertrag */

{
  const raum = lesen('src/components/plan3d/Raum3D.tsx')
  wahr('Raum3D: Angabe live', /live\?: Raum3DLive \| null/.test(raum))
  // E87b: dazu ohneListe (die Liste der Mitglieder liess sich nicht laden).
  wahr('Raum3D: Form von live', /export interface Raum3DLive \{\s*kanal: string\s*uid: string\s*leute: \{ uid: string; name: string; look: Avatar3D \| null \}\[\]\s*\/\*\*[\s\S]*?\*\/\s*ohneListe\?: boolean\s*\}/.test(raum))
  wahr('Raum3D: Kanal geht an anwesenheit', raum.includes('...(liveKanal ? { kanal: liveKanal } : {})'))
  wahr('Raum3D: Umzug wie bisher', raum.includes("!!uid && !!projekt && projekt.project.id === projectId"))
  wahr('Raum3D: Minikarte im 3D-Behaelter', raum.includes('<Minikarte') && (raum.match(/\{minikarte\}/g) ?? []).length === 2)
  const spalte = raum.indexOf('{minikarte}')
  // E87: Aufstehen und Ablegen sind Knoepfe der Gruppe links (BedienKachel),
  // in der Spalte rechts stehen Hinweise, die Minikarte und das Mikrofon.
  wahr('Raum3D: Minikarte ueber dem Mikrofon', spalte > 0 && spalte < raum.indexOf('<Mic size'))
  wahr('Raum3D: kein Knopf Aufstehen mehr in der Spalte', !raum.includes("<span dir=\"auto\">{t('plan3d.aufstehen')}</span>"))
  wahr('Raum3D: Spalte rechts unten, Knueppel links unten', raum.includes('style={SPALTE_STIL} data-spalte=""') && raum.includes('style={KNUEPPEL_STIL}'))
  wahr('Raum3D: Breite der Spalte am Handy 7,5 rem, quer immer', raum.includes("quer ? 'w-[7.5rem]' : 'w-[7.5rem] sm:w-44 lg:w-52'"))
  wahr('Raum3D: Ziele je Haus ueber das Gitter', raum.includes('springbarBerechnen(k.haeuser, sprungziele.current)'))
  wahr('Raum3D: Hoehe der 3D-Flaeche an die Minikarte', raum.includes('hoeheFrei={flaecheH}') && raum.includes('<div ref={flaeche} dir="ltr" className="relative min-h-0 flex-1"'))
  // Kein Neuzeichnen je Bild: der Abnehmer am Motor setzt keinen Zustand.
  const ab = raum.indexOf('m.eigenePose((p) => {')
  const bis = raum.indexOf('})', ab)
  wahr('Raum3D: eigene Stellung ohne setState', ab > 0 && !/\bset[A-Z]/.test(raum.slice(ab, bis)))
  wahr('Raum3D: Lage fuer die Karte aus Refs', raum.includes('({ eigene: eigeneLetzte.current, andere: andereRef.current })'))
  wahr('Raum3D: Springen ueber denselben Griff', raum.includes('if (i !== null) griff.springen(i)') && raum.includes('useImperativeHandle(steuer, () => griff, [griff])'))

  const karteTxt = lesen('src/components/plan3d/Minikarte.tsx')
  wahr('Minikarte: Speicher geschuetzt', /try \{\s*return localStorage\.getItem\(KARTE_ZU_SCHLUESSEL\) === '1'\s*\} catch/.test(karteTxt))
  wahr('Minikarte: Takt ueber setInterval', karteTxt.includes('window.setInterval(') && karteTxt.includes('KARTE_TAKT_MS)'))

  const seite = lesen('src/pages/SiedlungAnsicht.tsx')
  wahr('Seite: live an Ansicht3D', /<Ansicht3D[^>]*live=\{live\}/.test(seite))
  wahr('Seite: Kanal der Siedlung', seite.includes('kanal: `siedlung:${siedlungId}`'))
  wahr('Seite: Mitglieder aus api.ts', seite.includes('siedlungMitglieder(sid)') && /from '\.\.\/lib\/api'/.test(seite))
  // Seit E86 laedt die Seite keinen Grundriss: die eingerichtete Wohnung
  // gehoert in den Umzug, in der Siedlung ist sie fuer alle die geplante.
  wahr('Seite: kein Grundriss in der Siedlung', !seite.includes('ladeGrundriss') && seite.includes('wohnungRahmen: null') && seite.includes('daten={OHNE_WOHNUNG}'))
  wahr('Seite: Lage der Wohnung bleibt ohne Grundriss', seite.includes('s.gebaeude.some((g) => g.id === w.gebaeudeId)'))
  wahr('Seite: Dialog Leute', /<SiedlungLeute[\s\S]*?besitzer=\{besitzer\}/.test(seite))

  const anw = lesen('src/lib/anwesenheit.ts')
  wahr('anwesenheit: erlaubte Kanaele', anw.includes('/^(wohnung|siedlung):[0-9a-f-]{36}$/'))

  // Woerter: jeder Schluessel siedlung.* der neuen Dateien steht in
  // siedlung.ts, mit de und ar und denselben Platzhaltern.
  const woerter = S.siedlungWoerter
  for (const datei of ['src/components/plan3d/Minikarte.tsx', 'src/components/SiedlungLeute.tsx', 'src/lib/anwesenheit.ts', 'src/pages/SiedlungAnsicht.tsx', 'src/components/plan3d/Raum3D.tsx']) {
    for (const m of lesen(datei).matchAll(/'(siedlung\.[a-z0-9_.]+)'/g)) {
      const e = woerter[m[1]]
      wahr(`${m[1]} (${datei}) steht in siedlung.ts`, !!e)
      if (!e) continue
      const platz = (x) => [...x.matchAll(/\{(\w+)\}/g)].map((y) => y[1]).sort().join(',')
      wahr(`${m[1]}: de und ar mit denselben Platzhaltern`, !!e.de && !!e.ar && platz(e.de) === platz(e.ar))
    }
  }

  // Nichts Persoenliches und kein langer Gedankenstrich in den Dateien von E86.
  const NEU = [
    'scripts/bedienung-pruefen.mjs',
    'src/lib/i18n/bausteine/plan3d.ts',
    'src/components/plan3d/Minikarte.tsx',
    'src/components/SiedlungLeute.tsx',
    'src/lib/anwesenheit.ts',
    'src/pages/SiedlungAnsicht.tsx',
    'src/pages/Siedlungen.tsx',
    'src/components/plan3d/Raum3D.tsx',
    'src/lib/i18n/bausteine/siedlung.ts',
    'scripts/minikarte-pruefen.mjs',
  ]
  const LANGER_STRICH = String.fromCharCode(0x2014)
  for (const datei of NEU) {
    const txt = lesen(datei)
    wahr(`${datei}: kein U+2014`, !txt.includes(LANGER_STRICH))
    wahr(`${datei}: keine Mail-Adresse`, !/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(txt))
    // Kennungen nur als erfundene Nullen (Pruefung), nie echte.
    const ids = [...txt.matchAll(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi)].map((m) => m[0])
    wahr(`${datei}: keine echten Kennungen`, ids.every((id) => id.startsWith('00000000-0000-4000-8000-')))
    wahr(`${datei}: keine Koordinaten auf der Erde`, !/\b(4[6-9]|5[0-5])\.\d{4,}\b/.test(txt))
  }
}

/* ------------------------------------------------- 6. E87: grosse Karten */

{
  // Stufen: nah 120 m, mittel 400 m, ganz; nur, was kleiner ist als das Ganze.
  wahr('Stufen: Siedlung allein nur ganz', gleich(M.zoomStufen(130), ['ganz']))
  wahr('Stufen: mittlere Karte nah und ganz', gleich(M.zoomStufen(450), ['nah', 'ganz']))
  wahr('Stufen: Stadtteil alle drei', gleich(M.zoomStufen(3000), ['nah', 'mittel', 'ganz']))
  wahr('Stufen: kaputt nur ganz', gleich(M.zoomStufen(NaN), ['ganz']) && gleich(M.zoomStufen(-5), ['ganz']))
  wahr('Stufen: Seiten 120 und 400 m', M.ZOOM_SEITE_M.nah === 120 && M.ZOOM_SEITE_M.mittel === 400)
  wahr('Anfang: Stadtteil mittel', M.zoomStart(['nah', 'mittel', 'ganz']) === 'mittel')
  wahr('Anfang: sonst ganz', M.zoomStart(['nah', 'ganz']) === 'ganz' && M.zoomStart(['ganz']) === 'ganz')
  const alle = ['nah', 'mittel', 'ganz']
  wahr('Plus: naeher', M.zoomSchritt(alle, 'ganz', 1) === 'mittel' && M.zoomSchritt(alle, 'mittel', 1) === 'nah')
  wahr('Plus: am Ende bleibt es', M.zoomSchritt(alle, 'nah', 1) === 'nah')
  wahr('Minus: weiter weg', M.zoomSchritt(alle, 'nah', -1) === 'mittel' && M.zoomSchritt(alle, 'ganz', -1) === 'ganz')
  wahr('Schritt: unbekannte Stufe beginnt beim Anfang', M.zoomSchritt(['nah', 'ganz'], 'mittel', 1) === 'ganz')
}
{
  const ganz = { x: -100, y: -80, seite: 1000 }
  wahr('Ansicht: ganz ist das Ganze', gleich(M.kartenAnsicht('ganz', ganz, { x: 5, z: 5 }), ganz))
  wahr('Ansicht: nah um mich, Norden oben', gleich(M.kartenAnsicht('nah', ganz, { x: 10, z: -20 }), { x: -50, y: -80, seite: 120 }))
  wahr('Ansicht: mittel um mich', gleich(M.kartenAnsicht('mittel', ganz, { x: 0, z: 0 }), { x: -200, y: -200, seite: 400 }))
  wahr('Ansicht: ohne Stelle um die Mitte', gleich(M.kartenAnsicht('nah', ganz, null), { x: 340, y: 360, seite: 120 }))
  wahr('Ansicht: NaN wie ohne Stelle', gleich(M.kartenAnsicht('nah', ganz, { x: NaN, z: 0 }), { x: 340, y: 360, seite: 120 }))
  // Kacheln: solange die Mitte in der Kachel bleibt, liegt der Ausschnitt
  // ganz im Fenster der Namen.
  let ok = true
  let zufall = 7
  const z = () => {
    zufall = (zufall * 16807) % 2147483647
    return zufall / 2147483647
  }
  for (let i = 0; i < 2000; i++) {
    const seite = i % 2 ? 120 : 400
    const a = { x: z() * 4000 - 2000, y: z() * 4000 - 2000, seite }
    const f = M.kachelFenster(M.kachelSchluessel(a))
    if (!f || a.x < f.x - 1e-9 || a.y < f.y - 1e-9 || a.x + a.seite > f.x + f.seite + 1e-9 || a.y + a.seite > f.y + f.seite + 1e-9) ok = false
  }
  wahr('Kachel: Ausschnitt immer im Fenster der Namen', ok)
  const a = { x: -30, y: -30, seite: 120 }
  wahr('Kachel: kleine Bewegung, gleiche Kachel', M.kachelSchluessel(a) === M.kachelSchluessel({ ...a, x: a.x + 10, y: a.y - 5 }))
  wahr('Kachel: halbes Bild weiter, neue Kachel', M.kachelSchluessel(a) !== M.kachelSchluessel({ ...a, x: a.x + 60 }))
  wahr('Kachel: kaputter Schluessel', M.kachelFenster('x|y|z') === null && M.kachelFenster('0|1|1') === null)
}

const STADT = {
  rahmen: [-500, -400, 700, 600],
  haeuser: [
    { name: 'Haus Nord', punkte: quadrat(-40, -30, 0, -5) },
    { name: 'Laden Beispiel', punkte: quadrat(100, 100, 130, 120) },
    { name: '', punkte: quadrat(300, 300, 320, 320) },
    { name: 'kaputt', punkte: [[0, 0], [1, NaN], [2, 2]] },
  ],
  flaechen: [
    { art: 'wiese', punkte: quadrat(-500, -400, 700, 600) },
    { art: 'wasser', punkte: quadrat(200, -100, 260, -40) },
    { art: 'wald', punkte: quadrat(-480, 300, -300, 500) },
    { art: 'wiese', punkte: quadrat(0, 400, 50, 450) },
  ],
  strassen: [
    { art: 'haupt', breite: 7.2, punkte: [[-500, 0], [700, 0]] },
    { art: 'haupt', breite: 7.0, punkte: [[0, -400], [0, 600]] },
    { art: 'neben', breite: 5, punkte: [[-100, 200], [400, 200]] },
    { art: 'fuss', breite: 2, punkte: [[50, 50], [80, 90], [120, 90]] },
    { art: 'gleis', breite: 3, punkte: [[-500, 550], [700, 550]] },
    { art: 'wasser', breite: 4, punkte: [[600, -400], [600, 600]] },
    { art: 'neben', breite: 5, punkte: [[1, 1]] },
    { art: 'quatsch', breite: 5, punkte: [[0, 0], [9, 9]] },
  ],
  orte: [
    { name: 'Feuerwehr', x: 20, z: 30 },
    { name: 'Laden Beispiel', x: 115, z: 110 },
    { name: 'Spital Beispiel', x: 650, z: 550 },
    { name: '', x: 1, z: 1 },
  ],
}

{
  const p = M.kartenPfade(STADT)
  wahr('Pfade: Flaechen je Art einmal', gleich(p.flaechen.map((f) => f.art), ['wald', 'wiese', 'wasser']))
  wahr('Pfade: zwei Wiesen in einem Pfad', (p.flaechen[1].d.match(/M/g) ?? []).length === 2)
  wahr('Pfade: Strassen nach Art und Breite', gleich(p.strassen.map((s) => `${s.art} ${s.breite}`), ['wasser 4', 'gleis 3', 'fuss 2', 'neben 5', 'haupt 7']))
  wahr('Pfade: Hauptstrassen 7,0 und 7,2 m gleich breit (0,5 m)', (p.strassen.find((s) => s.art === 'haupt').d.match(/M/g) ?? []).length === 2)
  wahr('Pfade: Linien offen, Flaechen zu', !p.strassen.some((s) => s.d.includes('Z')) && p.flaechen.every((f) => f.d.endsWith('Z')))
  wahr('Pfade: kaputte Haeuser fallen weg', p.hausZahl === 3)
  wahr('Pfade: auf 10 cm', !/\d\.\d\d/.test(p.haeuser + p.strassen.map((s) => s.d).join('')))
  const leer = M.kartenPfade({ rahmen: [0, 0, 10, 10], haeuser: [], flaechen: [] })
  wahr('Pfade: leere Karte', leer.haeuser === '' && leer.flaechen.length === 0 && leer.strassen.length === 0)
}
{
  const u = 1000 / 160
  const ganz = M.kartenNamen(STADT, 'ganz', null, u)
  wahr('Namen: ganz keine Orte', !ganz.some((n) => n.art === 'ort'))
  const fenster = { x: -100, y: -100, seite: 400 }
  const mittel = M.kartenNamen(STADT, 'mittel', fenster, 400 / 160)
  wahr('Namen: mittel mit Orten im Fenster', mittel.some((n) => n.art === 'ort' && n.text === 'Feuerwehr'))
  wahr('Namen: Ort ausserhalb fehlt', !mittel.some((n) => n.text === 'Spital Beispiel'))
  wahr('Namen: Ort ohne Namen fehlt', !mittel.some((n) => n.text === ''))
  wahr('Namen: Haus und Ort mit gleichem Namen nur einmal', mittel.filter((n) => n.text === 'Laden Beispiel').length === 1)
  const viele = { ...STADT, orte: Array.from({ length: 100 }, (_, i) => ({ name: `Ort ${i}`, x: i, z: i })) }
  wahr('Namen: hoechstens 40 Orte', M.kartenNamen(viele, 'nah', { x: -10, y: -10, seite: 200 }, 1).filter((n) => n.art === 'ort').length === 40)
  // Kein Text auf einem anderen: dicht beieinander bleibt nur der Punkt.
  const dicht = { ...STADT, haeuser: [], orte: Array.from({ length: 30 }, (_, i) => ({ name: `Laden ${i}`, x: (i % 6) * 8, z: Math.floor(i / 6) * 6 })) }
  const nd = M.kartenNamen(dicht, 'mittel', { x: -50, y: -50, seite: 200 }, 2.5)
  const mitText = nd.filter((n) => n.mitText)
  wahr('Namen: dicht, alle Punkte da', nd.length === 30)
  wahr('Namen: dicht, nur ein Teil mit Text', mitText.length > 0 && mitText.length < 30)
  const kasten = (n) => [n.x - 2.2 * 2.5, n.z - 12.5, n.x + 4 * 2.5 + n.text.length * 4.9 * 2.5, n.z + 12.5]
  let schnitt = false
  for (let i = 0; i < mitText.length; i++)
    for (let j = i + 1; j < mitText.length; j++) {
      const a = kasten(mitText[i])
      const b = kasten(mitText[j])
      if (a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]) schnitt = true
    }
  wahr('Namen: kein Text auf einem anderen', !schnitt)
  const langerName = { ...STADT, orte: [{ name: 'Ein sehr langer Name fuer einen erfundenen Ort hier', x: 0, z: 0 }] }
  wahr('Namen: lange Namen gekuerzt', M.kartenNamen(langerName, 'nah', { x: -10, y: -10, seite: 200 }, 1).find((n) => n.art === 'ort').text.length === 28)
}
{
  // Der Stadtteil: beginnt bei mittel um den Ursprung (die Siedlung), mit
  // Strassen, Orten und den Knoepfen + und -.
  const html = karte({ karte: STADT, lage: () => ({ eigene: null, andere: new Map() }) })
  wahr('Stadt: beginnt bei mittel', html.includes('data-zoom="mittel"'))
  wahr('Stadt: Ausschnitt 400 m um den Ursprung', /viewBox="-200 -200 400 400"/.test(html))
  wahr('Stadt: Knoepfe naeher und weiter', html.includes('aria-label="Näher heran"') && html.includes('aria-label="Weiter weg"'))
  wahr('Stadt: Strassen als Linien', (html.match(/data-strasse="/g) ?? []).length === 5 && /data-strasse="haupt"[^>]*fill="none"/.test(html))
  // u = 400 m / 160 px = 2,5 m: Hauptstrasse mindestens 2 px = 5 m, sonst 7 m.
  wahr('Stadt: Breite in Metern', /data-strasse="haupt"[^>]*stroke-width="7"/.test(html))
  wahr('Stadt: schmale Wege mindestens sichtbar', /data-strasse="fuss"[^>]*stroke-width="2"/.test(html))
  wahr('Stadt: Gleis gestrichelt', /data-strasse="gleis"[^>]*stroke-dasharray=/.test(html))
  wahr('Stadt: Orte beschriftet', html.includes('>Feuerwehr</text>') && html.includes('data-ort'))
  wahr('Stadt: Orte mit Namen beim Zeigen', html.includes('<title>Feuerwehr</title>'))
  wahr('Stadt: Haeuser in einem Pfad', html.includes('data-haeuser="3"'))
  const nah = karte({ karte: STADT, lage: () => ({ eigene: pose(100, 1.64, 110), andere: new Map() }) })
  wahr('Stadt: folgt mir (mittel um meine Stelle)', /viewBox="-100 -90 400 400"/.test(nah))
  const ar = karte({ karte: STADT, lage: () => ({ eigene: null, andere: new Map() }) }, 'ar')
  wahr('Stadt arabisch: Knoepfe', ar.includes('aria-label="تقريب"') && ar.includes('aria-label="تبعيد"'))
  wahr('Stadt arabisch: nicht gespiegelt', /viewBox="-200 -200 400 400"/.test(ar) && !ar.includes('scale(-1'))
}

/** Eine erfundene grosse Karte: n Haeuser im Gitter (10 m gross, 16 m
 *  Abstand), Strassen dazwischen, Flaechen und Orte. */
function grosseKarte(n) {
  const seite = Math.ceil(Math.sqrt(n))
  const haeuser = []
  for (let i = 0; i < n; i++) {
    const x = (i % seite) * 16 - seite * 8
    const z = Math.floor(i / seite) * 16 - seite * 8
    haeuser.push({ name: i % 7 === 0 ? `Haus ${i}` : '', punkte: [[x, z], [x + 10, z], [x + 10, z + 8], [x + 4, z + 10], [x, z + 8]] })
  }
  const strassen = []
  for (let k = 0; k < 150; k++) {
    const q = k * 16 - seite * 8 - 3
    strassen.push({ art: k % 5 === 0 ? 'haupt' : 'neben', breite: k % 5 === 0 ? 7 : 5, punkte: [[q, -seite * 8], [q, seite * 8]] })
    strassen.push({ art: 'fuss', breite: 2, punkte: [[-seite * 8, q], [0, q + 3], [seite * 8, q]] })
  }
  const flaechen = []
  for (let k = 0; k < 500; k++) flaechen.push({ art: ['wiese', 'wald', 'acker', 'parkplatz', 'gewerbe'][k % 5], punkte: quadrat(k * 3, k * 2, k * 3 + 20, k * 2 + 15) })
  const orte = Array.from({ length: 300 }, (_, k) => ({ name: `Ort ${k}`, x: (k % 20) * 40 - 400, z: Math.floor(k / 20) * 40 - 300 }))
  const r = seite * 8 + 20
  return { rahmen: [-r, -r, r, r], haeuser, flaechen, strassen, orte }
}

{
  const gross = grosseKarte(4000)
  wahr('gross: 4000 Haeuser', gross.haeuser.length === 4000)
  let t0 = performance.now()
  const pfade = M.kartenPfade(gross)
  const pfadeMs = performance.now() - t0
  wahr(`gross: Pfade einmal unter 300 ms (${pfadeMs.toFixed(1)} ms)`, pfadeMs < 300)
  wahr('gross: alle Haeuser in einem Pfad', pfade.hausZahl === 4000 && pfade.flaechen.length === 5 && pfade.strassen.length === 3)

  // Der Takt (E87): Lage lesen, Stand, Ausschnitt, Kachel, und dann nur
  // Attribute an den vorhandenen Marken setzen (viewBox, je Person
  // transform und opacity, der eigene Pfeil), wie Minikarte im Browser.
  // React zeichnet dabei nichts; die Elemente sind hier erfundene, die
  // jede Zuweisung wie ein Element festhalten.
  const andere = new Map()
  for (let k = 0; k < 20; k++) andere.set(`00000000-0000-4000-8000-${String(k).padStart(12, '0')}`, pose(k * 5, 1.64, k * 3))
  const leuteNach = new Map([...andere.keys()].map((u, k) => [u, { uid: u, name: `Person ${k}`, farbe: '#4f6d8f' }]))
  const ganz = M.kartenAusschnitt(gross.rahmen)
  let stand = M.kartenStand({ eigene: pose(0, 1.64, 0), andere })
  const gerippe = M.markenGerippe(stand)
  const svg = element()
  const ziel = { ich: element(), andere: new Map([...andere.keys()].map((u) => [u, element()])) }
  const schreiber = M.attributSchreiber()
  const N = 400
  let schluessel = ''
  let neuGezeichnet = 0
  const takt = (i) => {
    const neu = M.kartenStand({ eigene: pose(i * 0.37, 1.64, i * 0.21, i * 0.05), andere }, stand.mitte)
    if (neu.schluessel === stand.schluessel) return
    stand = neu
    const ansicht = M.kartenAnsicht('mittel', ganz, stand.mitte)
    const k = M.kachelSchluessel(ansicht)
    // Neue Kachel: React zeichnet die Namen (selten, eigens gemessen).
    if (k !== schluessel) neuGezeichnet++
    schluessel = k
    if (M.markenGerippe(stand) !== gerippe) neuGezeichnet++
    schreiber.schreiben(svg, 'viewBox', `${ansicht.x} ${ansicht.y} ${ansicht.seite} ${ansicht.seite}`)
    M.markenSetzen(ziel, stand, ansicht.seite / 160, schreiber.schreiben)
  }
  // Zum Aufwaermen (der erste Lauf uebersetzt den Code), dann gemessen.
  for (let i = 0; i < 50; i++) takt(1000 + i)
  // Drei Durchgaenge, der beste zaehlt (andere Programme auf dem Rechner
  // sollen das Ergebnis nicht verfaelschen).
  let taktMs = Infinity
  let schreibenJeTakt = 0
  for (let durchgang = 0; durchgang < 3; durchgang++) {
    const vorher = schreiber.zahl()
    const a0 = performance.now()
    for (let i = 0; i < N; i++) takt(durchgang * N + i)
    const ms = (performance.now() - a0) / N
    if (ms < taktMs) taktMs = ms
    schreibenJeTakt = (schreiber.zahl() - vorher) / N
  }
  wahr(`gross: je Takt hoechstens 2 ms (${taktMs.toFixed(3)} ms)`, taktMs <= 2)
  // Was je Takt geschieht, haengt nicht an der Zahl der Haeuser und kaum an den Leuten.
  wahr(`gross: je Takt unter 0,2 ms (${taktMs.toFixed(3)} ms)`, taktMs < 0.2)
  wahr('gross: Kachel bekannt', typeof schluessel === 'string' && schluessel.startsWith('400|'))
  // Die anderen stehen still: je Takt nur viewBox und der eigene Pfeil.
  wahr(`gross: je Takt nur, was sich aendert (${schreibenJeTakt} Attribute)`, schreibenJeTakt === 2)
  wahr(`gross: React zeichnet je Takt nicht (${neuGezeichnet} neue Kacheln bei ${3 * N + 50} Takten)`, neuGezeichnet > 0 && neuGezeichnet < (3 * N + 50) / 10)
  wahr('gross: Pfeil und Punkte wie von React', ziel.ich.attr.transform === M.ichTransform(stand.ich, 400 / 160) && [...ziel.andere.values()].every((el) => el.attr.transform.startsWith('translate(') && el.attr.opacity === '1'))
  // Bewegen sich alle 20 Leute und gehen 10 davon ein Stockwerk hoeher,
  // kommen 20 transform und 10 opacity dazu, mehr nicht (man selbst steht).
  {
    const vorher = schreiber.zahl()
    const alle = new Map([...andere].map(([u, p], k) => [u, pose(p.x + 1, k < 10 ? 7.64 : p.y, p.z, 0)]))
    const ich = pose(stand.ich.x, 1.64, stand.ich.z, (-stand.ich.grad * Math.PI) / 180)
    const s = M.kartenStand({ eigene: ich, andere: alle }, stand.mitte)
    M.markenSetzen(ziel, s, 400 / 160, schreiber.schreiben)
    wahr(`gross: alle bewegen sich, 30 Attribute (${schreiber.zahl() - vorher})`, schreiber.zahl() - vorher === 30)
    wahr('gross: blass als opacity', [...ziel.andere.values()].filter((el) => el.attr.opacity === '0.45').length === 10)
  }
  // Wenn jemand kommt oder geht, baut React die Marken (selten): Zahl fuer den Bericht.
  let gerippeMs = Infinity
  for (let durchgang = 0; durchgang < 3; durchgang++) {
    const a0 = performance.now()
    for (let i = 0; i < 20; i++) renderToStaticMarkup(h(M.KartenMarken, { stand, leuteNach, u: 2.5, duText: 'Du' }))
    gerippeMs = Math.min(gerippeMs, (performance.now() - a0) / 20)
  }
  wahr(`gross: Marken neu bauen (jemand kommt) unter 50 ms (${gerippeMs.toFixed(2)} ms)`, gerippeMs < 50)

  // Namen neu nur bei neuer Kachel: auch das bleibt klein.
  t0 = performance.now()
  for (let i = 0; i < 20; i++) M.kartenNamen(gross, 'mittel', M.kachelFenster(`400|${i}|0`), 2.5)
  const namenMs = (performance.now() - t0) / 20
  wahr(`gross: Namen je neuer Kachel unter 15 ms (${namenMs.toFixed(2)} ms)`, namenMs < 15)

  // Tippen auf ein Haus unter Tausenden.
  t0 = performance.now()
  let treffer = 0
  for (let i = 0; i < 200; i++) if (M.hausAn(gross, [-seiteMitte(gross) + 5 + (i % 50) * 16, -seiteMitte(gross) + 4], 2) !== null) treffer++
  const tippMs = (performance.now() - t0) / 200
  wahr(`gross: Tippen unter 2 ms (${tippMs.toFixed(3)} ms)`, tippMs < 2)
  wahr('gross: Tippen trifft', treffer === 200)

  // Ziele je Haus ueber das Gitter: dasselbe wie einzeln gerechnet, schneller.
  const ziele = Array.from({ length: 400 }, (_, k) => ({ name: `Ziel ${k}`, ebene: 0, x: ((k * 37) % 1000) - 500, z: ((k * 53) % 1000) - 500, gier: 0 }))
  t0 = performance.now()
  const sb = M.springbarBerechnen(gross.haeuser, ziele)
  const sbMs = performance.now() - t0
  const einzeln = gross.haeuser.map((hh) => ziele.some((zz) => M.abstandZumUmriss([zz.x, zz.z], hh.punkte) <= M.HAUS_RAND_M))
  wahr('gross: Ziele je Haus wie einzeln gerechnet', gleich(sb, einzeln))
  wahr(`gross: Ziele je Haus unter 150 ms (${sbMs.toFixed(1)} ms)`, sbMs < 150)
  wahr('Ziele: kaputte Umrisse ohne Ziel', gleich(M.springbarBerechnen([{ name: 'x', punkte: [] }, { name: 'y', punkte: [[NaN, 0]] }], ziele), [false, false]))

  // Das erste Zeichnen der ganzen Karte (einmal): Zahl fuer den Bericht.
  t0 = performance.now()
  const html = karte({ karte: gross, lage: () => ({ eigene: pose(0, 1.64, 0), andere }), springbar: sb, leute: [...leuteNach.values()] })
  const ersteMs = performance.now() - t0
  wahr(`gross: erstes Zeichnen unter 1500 ms (${ersteMs.toFixed(0)} ms)`, ersteMs < 1500)
  wahr('gross: Knoepfe nur fuer Haeuser mit Ziel', (html.match(/role="button"/g) ?? []).length === sb.filter(Boolean).length)
  console.log(`Zeiten bei 4000 Haeusern: Pfade ${pfadeMs.toFixed(1)} ms einmal, Takt mit 20 Leuten ${taktMs.toFixed(3)} ms (${schreibenJeTakt} Attribute), Marken neu bauen ${gerippeMs.toFixed(2)} ms, Namen ${namenMs.toFixed(2)} ms je Kachel, Tippen ${tippMs.toFixed(3)} ms, Ziele ${sbMs.toFixed(1)} ms, erstes Zeichnen ${ersteMs.toFixed(0)} ms`)
}

function seiteMitte(k) {
  return Math.ceil(Math.sqrt(k.haeuser.length)) * 8
}

{
  // Marken je Takt ohne React (E87): dieselben Werte wie beim Zeichnen.
  const leute = new Map(LEUTE.map((l) => [l.uid, l]))
  const s = M.kartenStand(LAGE)
  const html = renderToStaticMarkup(h(M.KartenMarken, { stand: s, leuteNach: leute, u: 2, duText: 'Du' }))
  const attrVon = (sel, name) => new RegExp(`${sel}[^>]*${name}="([^"]*)"`).exec(html)?.[1]
  const ziel = { ich: element(), andere: new Map([[UID_A, element()], [UID_B, element()]]) }
  const sch = M.attributSchreiber()
  M.markenSetzen(ziel, s, 2, sch.schreiben)
  wahr('Takt: Pfeil wie von React', ziel.ich.attr.transform === attrVon('data-ich=""', 'transform'))
  wahr('Takt: Punkt wie von React', ziel.andere.get(UID_A).attr.transform === attrVon(`data-person="${UID_A}"`, 'transform'))
  wahr('Takt: blass wie von React', ziel.andere.get(UID_B).attr.opacity === attrVon(`data-person="${UID_B}"`, 'opacity') && ziel.andere.get(UID_B).attr.opacity === '0.45')
  wahr('Takt: Groesse in Bildpunkten (scale u)', ziel.andere.get(UID_A).attr.transform === 'translate(20 20) scale(2)' && /<circle r="8"/.test(html))
  wahr('Takt: erstes Mal alles geschrieben', sch.zahl() === 5)
  M.markenSetzen(ziel, s, 2, sch.schreiben)
  wahr('Takt: gleiche Lage schreibt nichts', sch.zahl() === 5)
  sch.vergessen()
  M.markenSetzen(ziel, s, 2, sch.schreiben)
  wahr('Takt: nach dem Zeichnen durch React alles neu', sch.zahl() === 10)
  // Jemand ohne Element (kommt gerade): bleibt aus, bis React es baut.
  const mitNeuem = M.kartenStand({ ...LAGE, andere: new Map([...LAGE.andere, ['00000000-0000-4000-8000-00000000000c', pose(1, 1.64, 1)]]) })
  M.markenSetzen(ziel, mitNeuem, 2, sch.schreiben)
  wahr('Takt: ohne Element nichts, kein Fehler', sch.zahl() === 10)
  // Gerippe: wer da ist und ob man selbst geht.
  wahr('Gerippe: neue Person', M.markenGerippe(mitNeuem) !== M.markenGerippe(s))
  wahr('Gerippe: Bewegung allein nicht', M.markenGerippe(M.kartenStand({ ...LAGE, eigene: pose(30, 1.64, 30, 1) })) === M.markenGerippe(s))
  wahr('Gerippe: Begehen endet', M.markenGerippe(M.kartenStand({ ...LAGE, eigene: null })) !== M.markenGerippe(s))
}
{
  // Richtung der Namen wie dir=auto: das erste starke Zeichen.
  wahr('Richtung: deutsch', M.textRichtung('Feuerwehr') === 'ltr')
  wahr('Richtung: arabisch', M.textRichtung('مخبز') === 'rtl')
  wahr('Richtung: Zahl vor arabisch', M.textRichtung('24 مخبز') === 'rtl')
  wahr('Richtung: lateinisch vor arabisch', M.textRichtung('Laden مخبز') === 'ltr')
  wahr('Richtung: nur Zahlen', M.textRichtung('12') === 'ltr' && M.textRichtung('') === 'ltr')
  wahr('Richtung: hebraeisch', M.textRichtung('שלום') === 'rtl')
  const ar = { ...STADT, orte: [{ name: 'مخبز الحي', x: 20, z: 30 }, { name: 'Feuerwehr', x: 60, z: -60 }] }
  const html = karte({ karte: ar, lage: () => ({ eigene: null, andere: new Map() }) })
  // Der arabische Name laeuft von rechts nach links und endet links am
  // Punkt (Anker end), der deutsche beginnt dort (Anker start).
  wahr('Richtung: arabischer Ort rtl, rechts vom Punkt', /direction="rtl" text-anchor="end"[^>]*>مخبز الحي<\/text>/.test(html))
  wahr('Richtung: deutscher Ort ltr', /direction="ltr" text-anchor="start"[^>]*>Feuerwehr<\/text>/.test(html))
  wahr('Richtung: Haeuser auch', /direction="ltr" text-anchor="middle"[^>]*>Haus Nord<\/text>/.test(karte()))
}

{
  // Das Feste ist gemerkt; je Takt zeichnet React nichts, nur Attribute.
  const txt = lesen('src/components/plan3d/Minikarte.tsx')
  const ab0 = txt.indexOf('const uhr = window.setInterval(() => {')
  const ab = ab0 + 40
  const bis = txt.indexOf('}, KARTE_TAKT_MS)', ab)
  wahr('Minikarte: Takt ohne setState, nur taktRef', ab0 > 0 && bis > ab && !/\bset[A-Z]\w*\(/.test(txt.slice(ab, bis)) && txt.slice(ab, bis).includes('taktRef.current()'))
  wahr('Minikarte: Takt setzt Attribute', txt.includes("schreiber.schreiben(svg, 'viewBox',") && txt.includes('markenSetzen(ziel, s, u, schreiber.schreiben)'))
  wahr('Minikarte: React nur bei neuem Gerippe oder neuer Kachel', txt.includes('if (markenGerippe(s) !== gerippe || kachelVon(a) !== kachel) {'))
  wahr('Minikarte: Marken gemerkt', txt.includes('export const KartenMarken = memo(function KartenMarken('))
  wahr('Minikarte: Grund und N wandern nicht mit', !/<rect x=\{ansicht/.test(txt) && txt.includes("style={{ background: 'var(--plan-boden-draussen)' }}"))
  wahr('Minikarte: Grund gemerkt', txt.includes('const KartenGrund = memo(function KartenGrund('))
  wahr('Minikarte: Namen gemerkt', txt.includes('const KartenNamen = memo(function KartenNamen('))
  wahr('Minikarte: Hausknoepfe gemerkt', txt.includes('const HausKnoepfe = memo(function HausKnoepfe('))
  wahr('Minikarte: Pfade einmal je Karte', txt.includes('useMemo(() => kartenPfade(karte), [karte])'))
  wahr('Minikarte: Rueckruf fuer Hausknoepfe stabil', txt.includes('hausRueck.current(i, info.mitte[0], info.mitte[1])'))
  wahr('Minikarte: Takt vergleicht vor dem Setzen', /if \(neu\.schluessel === standRef\.current\.schluessel\) return/.test(txt))
}

if (fehler) {
  console.log(`${fehler} Abweichung(en)`)
  process.exit(1)
}
console.log('ok')
