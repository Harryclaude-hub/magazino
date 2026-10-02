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
//     und leer.
//  4. Der Kanal (src/lib/anwesenheit.ts): nur 'wohnung:<Kennung>' und
//     'siedlung:<Kennung>', sonst ein sichtbarer Fehler.
//  5. Der Vertrag zwischen Seite, Raum3D und Minikarte, die Woerter und
//     dass in den neuen Dateien nichts Persoenliches steht.
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
  wahr('Karte: vier Flaechen', (html.match(/<polygon/g) ?? []).length === 4 + 3)
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
  wahr('Karte: am Handy klein', html.includes('w-[132px]'))
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
    nicht_gefunden: 'Kistly-Konto',
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
  wahr('Raum3D: Form von live', /export interface Raum3DLive \{\s*kanal: string\s*uid: string\s*leute: \{ uid: string; name: string; look: Avatar3D \| null \}\[\]\s*\}/.test(raum))
  wahr('Raum3D: Kanal geht an anwesenheit', raum.includes('...(liveKanal ? { kanal: liveKanal } : {})'))
  wahr('Raum3D: Umzug wie bisher', raum.includes("!!uid && !!projekt && projekt.project.id === projectId"))
  wahr('Raum3D: Minikarte im 3D-Behaelter', raum.includes('<Minikarte') && (raum.match(/\{minikarte\}/g) ?? []).length === 2)
  const spalte = raum.indexOf('{minikarte}')
  wahr('Raum3D: Minikarte ueber Aufstehen, Ablegen, Mikrofon', spalte > 0 && spalte < raum.indexOf("t('plan3d.aufstehen')") && spalte < raum.indexOf("t('plan3d.ablegen')") && spalte < raum.indexOf('<Mic size'))
  wahr('Raum3D: Spalte rechts unten, Knueppel links unten', /end-\[calc\(env\(safe-area-inset-right,0px\)\+1rem\)\] z-20 flex max-w-\[60%\] flex-col/.test(raum))
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
  wahr('Seite: Gast ohne Fehlerzustand fuer die Wohnung', /if \(!besitzer\) \{[\s\S]*?catch \(err\) \{[\s\S]*?wohnungFehlt: false/.test(seite))
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
    'src/components/plan3d/Minikarte.tsx',
    'src/components/SiedlungLeute.tsx',
    'src/lib/anwesenheit.ts',
    'src/pages/SiedlungAnsicht.tsx',
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

if (fehler) {
  console.log(`${fehler} Abweichung(en)`)
  process.exit(1)
}
console.log('ok')
