// Prueft die Bedienung beim Begehen, das Kontextmenue und den Grundriss am Handy ohne Browser:
//  1. Welche Knoepfe bei welchem Zustand stehen (Moeglich3D, FahrzeugJetzt,
//     Haltung, Ding in der Hand, Handy oder Computer), wann einer aus ist,
//     was er beim Motor ausloest (Sicht und Blaulicht schalten um).
//  2. Tasten am Knopf und der Satz in der Leiste: richtiger Schluessel
//     da, die Tasten stehen im Satz.
//  3. Lage am Bildschirm aus denselben Zahlen wie das style: Knueppel,
//     Knopfgruppe, Spalte und Kreuz ueberdecken sich nicht,
//     hochkant 360 x 640, quer 800 x 360 und 640 x 360, auch nicht die
//     Leiste oben im Vollbild, und alles liegt im Bild.
//  4. E92, Kontextmenue und Moebelkarte: welche Eintraege das Menue je
//     Zustand hat, wo es steht (am Zeiger, ganz im Bild, nie ueber den
//     Rand), Masse, Preis, Shop (nur http und https), Kisten darauf oder
//     darin (auch gestapelt); Menue und Karte gerendert
//     (Name, Masse, Preis, Link mit noopener in neuem Tab, veraltet, ohne
//     Angaben, ungueltiger Link), der Vertrag zwischen Motor und Raum3D
//     (Rechtsklick hebt nichts mehr an, Esc der Reihe nach, Eingabe ruht
//     bei offener Karte) und die Woerter.
//  5. E94, der Grundriss gross am Handy: Messen als reine Rechnung (Tipp 1
//     ist A, Tipp 2 B, Tipp 3 beginnt neu, Fangweite aus dem Massstab,
//     Namen wie im Zeichner, Lichte, Schnellmasse nur an Enden von
//     Oeffnungen, Neu), Antippen beim Ansehen (Messen oeffnet nie eine
//     Karte), gerendert (Knopf unter Ansehen, Ebene mit
//     Leiste und Schalter, Blatt mit der Moebelkarte, Raum, Tuer, Leiste
//     beim Messen, Zeichnung im Plan), die Adresse (ansicht=gross) und
//     dass das Handy keinen Zeichner-Code laedt. Nacharbeit nach der
//     Pruefung: X nach Zurueck ohne doppelten Eintrag (state im Verlauf),
//     kein verhinderter Klick ausser in der grossen Ansicht, Tuer mit
//     "Frei fuer Moebel" und Maueroeffnung statt Lichte, links und rechts
//     drueben aus dem Nachbarraum (mit Blick zur Wand) und im Plan
//     gezeichnet, Blatt quer neben dem Plan, Fokus in der Ebene und zurueck,
//     Raumhoehe arabisch wie die Flaeche, Titel bricht um.
// Alle Namen und Zahlen sind erfunden. Aufruf im Projektordner:
//   node scripts/bedienung-pruefen.mjs
// Ausgabe "ok" oder die abweichenden Faelle, Exit 1 bei Fehlern.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createMemoryRouter, MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'

let fehler = 0
function wahr(name, ist) {
  if (!ist) {
    console.log('ABWEICHUNG', name, 'ist nicht wahr')
    fehler++
  }
}
const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const lesen = (p) => fs.readFileSync(p, 'utf8')
const warten = () => new Promise((r) => setTimeout(r, 0))

/* ------------------------------------------------ Module laden */

const vite = await createServer({
  cacheDir: path.join(os.tmpdir(), 'kistly-bedienung-pruefen'),
  server: { middlewareMode: true, hmr: false, ws: false },
  appType: 'custom',
  logLevel: 'error',
  optimizeDeps: { noDiscovery: true, include: [] },
})
let R
let I
let W
let P3
let MI
let MK
let MM
let HM
let PG
let PD
let PB
let HI
let ZW
let MP
try {
  R = await vite.ssrLoadModule('/src/components/plan3d/Raum3D.tsx')
  I = await vite.ssrLoadModule('/src/lib/i18n/index.tsx')
  W = await vite.ssrLoadModule('/src/lib/i18n/woerter.ts')
  P3 = await vite.ssrLoadModule('/src/lib/i18n/bausteine/plan3d.ts')
  MI = await vite.ssrLoadModule('/src/components/plan3d/moebelInfo.ts')
  MK = await vite.ssrLoadModule('/src/components/plan3d/MoebelKarte.tsx')
  MM = await vite.ssrLoadModule('/src/components/plan3d/MoebelMenue.tsx')
  HM = await vite.ssrLoadModule('/src/components/plan/handyMessen.ts')
  PG = await vite.ssrLoadModule('/src/components/plan/PlanGross.tsx')
  PD = await vite.ssrLoadModule('/src/components/plan/PlanDetails.tsx')
  PB = await vite.ssrLoadModule('/src/components/plan/PlanBild.tsx')
  HI = await vite.ssrLoadModule('/src/components/plan/hilfe.ts')
  ZW = await vite.ssrLoadModule('/src/lib/i18n/bausteine/zeichner.ts')
  MP = await vite.ssrLoadModule('/src/zeichner/messpunkte.ts')
} finally {
  await vite.close()
}

// E94: die Seite Grundriss (Ansehen) mit einem erfundenen Umzug statt
// ProjectLayout; i18n aus demselben Lauf, damit der Sprach-Kontext passt.
globalThis.__projekt = { project: { id: 'p1', name: 'Erfunden' }, canEdit: false, members: [], tags: [], rooms: [], people: [] }
const viteSeite = await createServer({
  cacheDir: path.join(os.tmpdir(), 'kistly-bedienung-pruefen-seite'),
  server: { middlewareMode: true, hmr: false, ws: false },
  appType: 'custom',
  logLevel: 'error',
  optimizeDeps: { noDiscovery: true, include: [] },
  plugins: [
    {
      name: 'erfundenes-projekt',
      enforce: 'pre',
      load(id) {
        if (id.replace(/\\/g, '/').endsWith('/src/pages/ProjectLayout.tsx')) {
          return 'export function useProject() { return globalThis.__projekt }\nexport function useProjektOptional() { return globalThis.__projekt }\nexport default function ProjectLayout() { return null }\n'
        }
        return null
      },
    },
  ],
})
let GS
let IS
try {
  GS = await viteSeite.ssrLoadModule('/src/pages/Grundriss.tsx')
  IS = await viteSeite.ssrLoadModule('/src/lib/i18n/index.tsx')
} finally {
  await viteSeite.close()
}
W.woerterNachladen(P3.plan3dWoerter)

/* ------------------------------------------------ 1. Knoepfe */

const M0 = R.MOEGLICH_START
const mit = (x) => ({ ...M0, ...x })
const z = (x) => ({ moeglich: M0, fahrzeug: null, haltung: 'stehen', haelt: false, beruehren: true, ...x })

wahr('Start: zu Fuss, stehend, Springen geht', gleich(M0, { einsteigen: false, aussteigen: false, halten: false, hinstellen: false, hupfen: true }))
wahr('Handy: nur Springen', gleich(R.bedienKnoepfe(z({})), ['springen']))
wahr('Computer: kein Knopf (Leertaste)', gleich(R.bedienKnoepfe(z({ beruehren: false })), []))
wahr('Auto nah: Einsteigen', gleich(R.bedienKnoepfe(z({ moeglich: mit({ einsteigen: true }) })), ['springen', 'einsteigen']))
wahr('Auto nah am Computer: nur Einsteigen', gleich(R.bedienKnoepfe(z({ beruehren: false, moeglich: mit({ einsteigen: true }) })), ['einsteigen']))
wahr('Ding in der Hand: Hinstellen, Drehen, Ablegen', gleich(R.bedienKnoepfe(z({ haelt: true })), ['springen', 'hinstellen', 'drehen', 'ablegen']))
wahr('Moeglich3D.halten reicht auch', gleich(R.bedienKnoepfe(z({ moeglich: mit({ halten: true }) })), ['springen', 'hinstellen', 'drehen', 'ablegen']))
wahr('Ding und Auto: fuenf Knoepfe', gleich(R.bedienKnoepfe(z({ haelt: true, moeglich: mit({ einsteigen: true }) })), ['springen', 'einsteigen', 'hinstellen', 'drehen', 'ablegen']))
wahr('Sitzend: Aufstehen statt Springen', gleich(R.bedienKnoepfe(z({ haltung: 'sitz' })), ['aufstehen']))
wahr('Liegend am Computer: Aufstehen', gleich(R.bedienKnoepfe(z({ haltung: 'liegen', beruehren: false })), ['aufstehen']))
for (const art of ['auto', 'kombi', 'transporter', 'bus']) {
  wahr(`Fahren (${art}): ohne Blaulicht`, gleich(R.bedienKnoepfe(z({ fahrzeug: { art }, moeglich: mit({ aussteigen: true, hupfen: false }) })), ['kmh', 'aussteigen', 'sicht']))
}
for (const art of ['feuerwehr', 'rettung', 'polizei']) {
  wahr(`Fahren (${art}): mit Blaulicht`, gleich(R.bedienKnoepfe(z({ fahrzeug: { art } })), ['kmh', 'aussteigen', 'sicht', 'blaulicht']))
  wahr(`Blaulicht: ${art} hat eins`, R.hatBlaulicht(art))
}
wahr('Blaulicht: Auto nicht', !R.hatBlaulicht('auto') && !R.hatBlaulicht('bus'))
wahr('Aussteigen gemeldet, Fahrzeug noch nicht: Fahrknoepfe', gleich(R.bedienKnoepfe(z({ moeglich: mit({ aussteigen: true }) })), ['kmh', 'aussteigen', 'sicht']))
wahr('Im Fahrzeug kein Springen, kein Ding', !R.bedienKnoepfe(z({ fahrzeug: { art: 'auto' }, haelt: true, moeglich: mit({ einsteigen: true }) })).some((k) => ['springen', 'hinstellen', 'einsteigen'].includes(k)))
{
  // Alle Zustaende: nie mehr als maxKnoepfe, nie doppelt.
  let max = 0
  let doppelt = false
  const arten = [null, 'auto', 'feuerwehr', 'bus', 'polizei']
  for (let bits = 0; bits < 32; bits++) {
    for (const haltung of ['stehen', 'sitz', 'liegen']) {
      for (const art of arten) {
        for (const beruehren of [true, false]) {
          for (const haelt of [true, false]) {
            const m = { einsteigen: !!(bits & 1), aussteigen: !!(bits & 2), halten: !!(bits & 4), hinstellen: !!(bits & 8), hupfen: !!(bits & 16) }
            const k = R.bedienKnoepfe({ moeglich: m, fahrzeug: art ? { art } : null, haltung, haelt, beruehren })
            max = Math.max(max, k.length)
            if (new Set(k).size !== k.length) doppelt = true
          }
        }
      }
    }
  }
  wahr(`hoechstens ${R.BEDIEN_MASS.maxKnoepfe} Knoepfe (gesehen ${max})`, max === R.BEDIEN_MASS.maxKnoepfe)
  wahr('kein Knopf doppelt', !doppelt)
}
wahr('Springen aus, wenn der Motor es nicht erlaubt', R.knopfAus('springen', mit({ hupfen: false })) && !R.knopfAus('springen', M0))
wahr('Hinstellen aus, wenn es dort nicht passt', R.knopfAus('hinstellen', M0) && !R.knopfAus('hinstellen', mit({ hinstellen: true })))
wahr('Andere Knoepfe nie aus', ['einsteigen', 'aussteigen', 'sicht', 'blaulicht', 'drehen', 'ablegen', 'aufstehen'].every((k) => !R.knopfAus(k, { einsteigen: false, aussteigen: false, halten: false, hinstellen: false, hupfen: false })))

{
  const aufrufe = []
  const motor = new Proxy({}, { get: (_z, name) => (...args) => aufrufe.push([name, ...args]) })
  const tun = (k, fahrt = null) => {
    aufrufe.length = 0
    R.knopfAusfuehren(k, motor, fahrt)
    return JSON.stringify(aufrufe)
  }
  wahr('Springen: hupfen()', tun('springen') === '[["hupfen"]]')
  wahr('Aufstehen: aufstehen()', tun('aufstehen') === '[["aufstehen"]]')
  wahr('Einsteigen: einsteigen()', tun('einsteigen') === '[["einsteigen"]]')
  wahr('Aussteigen: aussteigen()', tun('aussteigen') === '[["aussteigen"]]')
  wahr('Sicht: von innen nach hinten', tun('sicht', { sicht: 'innen', blaulicht: false }) === '[["fahrSicht","hinten"]]')
  wahr('Sicht: von hinten nach innen', tun('sicht', { sicht: 'hinten', blaulicht: false }) === '[["fahrSicht","innen"]]')
  wahr('Sicht: ohne Meldung nach hinten', tun('sicht') === '[["fahrSicht","hinten"]]')
  wahr('Blaulicht: an', tun('blaulicht', { sicht: 'innen', blaulicht: false }) === '[["blaulicht",true]]')
  wahr('Blaulicht: aus', tun('blaulicht', { sicht: 'innen', blaulicht: true }) === '[["blaulicht",false]]')
  wahr('Hinstellen: hinstellen()', tun('hinstellen') === '[["hinstellen"]]')
  wahr('Drehen: 45 Grad weiter', tun('drehen') === '[["drehen",1]]')
  wahr('Ablegen: ablegen()', tun('ablegen') === '[["ablegen"]]')
  wahr('Tacho: nichts', tun('kmh') === '[]')
  // E87b: ging es nicht (kein Platz zum Aussteigen), meldet der Knopf false.
  wahr('Knopf: geklappt meldet true', R.knopfAusfuehren('aussteigen', motor, null) === true && R.knopfAusfuehren('springen', motor, null) === true && R.knopfAusfuehren('kmh', motor, null) === true)
  const klemmt = { ...Object.fromEntries(['hupfen', 'aufstehen', 'einsteigen', 'fahrSicht', 'blaulicht', 'hinstellen', 'drehen', 'ablegen'].map((n) => [n, () => {}])), aussteigen: () => false }
  wahr('Knopf: kein Platz zum Aussteigen meldet false', R.knopfAusfuehren('aussteigen', klemmt, null) === false)
  wahr('Knopf: alter Motor ohne Antwort gilt als geklappt', R.knopfAusfuehren('aussteigen', { ...klemmt, aussteigen: () => undefined }, null) === true)
}

/* ------------------------------------------------ 2. Tasten und Saetze */

const T = I.tg
wahr('Tasten: E, E, V, B, R, Esc', gleich(R.BEDIEN_TASTE, { einsteigen: 'E', aussteigen: 'E', sicht: 'V', blaulicht: 'B', drehen: 'R', aufstehen: 'Esc' }))
wahr('Tasten: Springen und Hinstellen ohne Buchstaben (Leertaste und Klick stehen im Satz)', !('springen' in R.BEDIEN_TASTE) && !('hinstellen' in R.BEDIEN_TASTE))
{
  const h = (x) => R.bedienHinweis({ gehen: true, faehrt: false, haelt: false, beruehren: false, kannZiehen: false, hand: false, ...x })
  wahr('Satz: Begehen am Computer', h({}) === 'plan3d.begehen_bedienung')
  wahr('Satz: Begehen am Handy', h({ beruehren: true }) === 'plan3d.begehen_bedienung_handy')
  wahr('Satz: Fahren am Computer', h({ faehrt: true }) === 'plan3d.fahren_bedienung')
  wahr('Satz: Fahren am Handy', h({ faehrt: true, beruehren: true }) === 'plan3d.fahren_bedienung_handy')
  wahr('Satz: Fahren geht vor Halten', h({ faehrt: true, haelt: true }) === 'plan3d.fahren_bedienung')
  wahr('Satz: Halten am Computer', h({ haelt: true }) === 'plan3d.halten_bedienung')
  wahr('Satz: Halten am Handy', h({ haelt: true, beruehren: true }) === 'plan3d.halten_bedienung_handy')
  wahr('Satz: ohne Begehen wie bisher', h({ gehen: false }) === 'plan3d.bedienung' && h({ gehen: false, hand: true }) === 'plan3d.bedienung_hand')
  wahr('Satz: ohne Begehen am Handy', h({ gehen: false, beruehren: true }) === 'plan3d.bedienung_handy')
  wahr('Satz: ohne Begehen im Zeichner', h({ gehen: false, kannZiehen: true, hand: true }) === 'plan3d.bedienung_ziehen_hand')
  const alle = new Set()
  for (const gehen of [true, false])
    for (const faehrt of [true, false])
      for (const haelt of [true, false])
        for (const beruehren of [true, false])
          for (const kannZiehen of [true, false]) for (const hand of [true, false]) alle.add(R.bedienHinweis({ gehen, faehrt, haelt, beruehren, kannZiehen, hand }))
  for (const k of alle) wahr(`Satz ${k} steht in plan3d.ts`, !!P3.plan3dWoerter[k])
}
{
  const w = P3.plan3dWoerter
  const beide = (k, teile) => teile.every((x) => w[k].de.includes(x))
  wahr('Begehen: Leertaste und E im Satz', w['plan3d.begehen_bedienung'].de.includes('Leertaste springt') && beide('plan3d.begehen_bedienung', ['W A S D', 'E', 'Esc']))
  wahr('Fahren: E, V, B, Esc in beiden Sprachen', beide('plan3d.fahren_bedienung', ['E', 'V', 'B', 'Esc', 'W', 'S', 'A', 'D']))
  wahr('Halten: R und Mausrad', beide('plan3d.halten_bedienung', ['R', 'Esc']) && w['plan3d.halten_bedienung'].de.includes('Mausrad'))
  wahr('Handy: Knoepfe genannt', w['plan3d.begehen_bedienung_handy'].de.includes('springen') && w['plan3d.fahren_bedienung_handy'].de.includes('Blaulicht'))
  for (const k of Object.values(R.BEDIEN_NAME)) wahr(`Knopfname ${k} steht in plan3d.ts`, !!w[k])
  for (const k of ['plan3d.sicht_hinten', 'plan3d.aktionen', 'plan3d.knueppel_fahren']) wahr(`${k} steht in plan3d.ts`, !!w[k])
  wahr('Deutsch: Einsteigen', T('plan3d.einsteigen') === 'Einsteigen')
}

/* ------------------------------------------------ 3. Lage am Bildschirm */

{
  const B = R.BEDIEN_MASS
  // Alles in rem wie Tailwind; die App-Schrift je rem steht in index.css (html). Die Zahlen passen zum CSS: Knueppel h-32 w-32 =
  // 8 rem, Spalte w-[7.5rem], Kreuz h-6 w-6 = 1,5 rem.
  const css = lesen('src/index.css')
  const remM = /html \{\s*font-size: ([\d.]+)(px|%);/.exec(css)
  wahr('index.css: Schriftgroesse je rem steht fest', !!remM)
  wahr('Knueppel ist 8 rem (Knueppel.tsx h-32 w-32)', B.knueppel === 8 && /h-32 w-32/.test(lesen('src/components/plan3d/Knueppel.tsx')))
  const raumTxt = lesen('src/components/plan3d/Raum3D.tsx')
  wahr('Spalte am Handy 7,5 rem (Breite fuer die Knopfgruppe)', B.spalte === 7.5)
  wahr('Kreuz 1,5 rem (h-6 w-6)', B.kreuz === 1.5 && raumTxt.includes('data-fadenkreuz="" className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-6 w-6'))
  wahr('Hochkant: zwei Knoepfe je Reihe passen ueber den Knueppel', 2 * B.knopfB + B.luecke <= B.knueppel)
  const hoch = R.knopfGruppeStil(false)
  wahr('style hochkant: links 1, unten 9,5, 8 breit (rem)', hoch.left.includes('+ 1rem') && hoch.bottom.includes('+ 9.5rem') && hoch.width === '8rem' && !('right' in hoch))
  const quer = R.knopfGruppeStil(true)
  wahr('style quer: links 9,5, rechts 9, unten 1 (rem)', quer.left.includes('+ 9.5rem') && quer.right.includes('+ 9rem') && quer.bottom.includes('+ 1rem') && !('width' in quer))
  wahr('style: sichere Zone des Handys', hoch.left.startsWith('calc(env(safe-area-inset-left') && quer.right.startsWith('calc(env(safe-area-inset-right') && hoch.bottom.startsWith('calc(env(safe-area-inset-bottom'))
  wahr('Knueppel und Spalte aus denselben Zahlen', R.KNUEPPEL_STIL.left.includes('+ 1rem') && R.SPALTE_STIL.right.includes('+ 1rem'))
  wahr('quer: Medienabfrage fuer flache Bildschirme', R.QUER_MEDIA === '(orientation: landscape) and (max-height: 500px)')

  // Im Browser gemessen (Handy 375 x 812, 18 px je rem): Minikarte 135 x
  // 172 px; dazu Luecke und die Zeile mit Mikrofon (2,5 rem), aufgerundet.
  const REM = remM ? (remM[2] === '%' ? (16 * Number(remM[1])) / 100 : Number(remM[1])) : 18
  const spalte = B.spalte * REM
  const spalteH = 172 + B.luecke * REM + 2.5 * REM + 1
  // Leiste oben im Vollbild: hochkant und quer unter md zwei Reihen
  // (0,5 + 2,5 + 0,25 + 2,5 + 0,5 rem), ab md (768 px) eine (3,5 rem).
  const zweiReihen = 6.25 * REM
  const eineReihe = 3.5 * REM
  const faelle = [
    { name: 'hochkant 360 x 640', b: 360, h: 640, quer: false, leiste: zweiReihen },
    { name: 'quer 800 x 360', b: 800, h: 360, quer: true, leiste: eineReihe },
    { name: 'quer 640 x 360', b: 640, h: 360, quer: true, leiste: zweiReihen },
    { name: 'hochkant 412 x 915', b: 412, h: 915, quer: false, leiste: zweiReihen },
  ]
  for (const f of faelle) {
    for (let n = 1; n <= B.maxKnoepfe; n++) {
      const r = R.bedienRechtecke(f.b, f.h, { quer: f.quer, rem: REM, spalte, spalteH, knoepfe: n, fadenkreuz: true })
      const teile = Object.entries(r).filter(([, x]) => x)
      const leiste = { x0: 0, y0: 0, x1: f.b, y1: f.leiste }
      for (let i = 0; i < teile.length; i++) {
        for (let j = i + 1; j < teile.length; j++) {
          wahr(`${f.name}, ${n} Knoepfe: ${teile[i][0]} und ${teile[j][0]} getrennt`, !R.ueberdecken(teile[i][1], teile[j][1]))
        }
        const x = teile[i][1]
        wahr(`${f.name}, ${n} Knoepfe: ${teile[i][0]} im Bild`, x.x0 >= 0 && x.y0 >= 0 && x.x1 <= f.b && x.y1 <= f.h)
        wahr(`${f.name}, ${n} Knoepfe: ${teile[i][0]} unter der Leiste`, !R.ueberdecken(x, leiste))
      }
    }
  }
  // Hochkant zwei je Reihe (drei Reihen bei fuenf), quer alle in einer.
  const h5 = R.bedienRechtecke(360, 640, { quer: false, rem: REM, spalte, spalteH, knoepfe: 5, fadenkreuz: false }).knoepfe
  wahr('hochkant: fuenf Knoepfe in drei Reihen', h5.y1 - h5.y0 === (3 * B.knopfH + 2 * B.luecke) * REM)
  const q5 = R.bedienRechtecke(800, 360, { quer: true, rem: REM, spalte, spalteH, knoepfe: 5, fadenkreuz: false }).knoepfe
  wahr('quer: fuenf Knoepfe in einer Reihe', q5.y1 - q5.y0 === B.knopfH * REM)
  // Wie im Browser gemessen (375 x 812 hochkant, 3D-Flaeche ab y 113,
  // fuenf Knoepfe): Knueppel 18..162 / 650..794, Gruppe 18..162 / 461..641,
  // Kreuz um 187,5 / 462,5.
  const g = R.bedienRechtecke(375, 699, { quer: false, rem: REM, spalte, spalteH, knoepfe: 5, fadenkreuz: true })
  const um = (x) => [x.x0, x.y0 + 113, x.x1, x.y1 + 113].map((v) => Math.round(v))
  // Gemessen wurde bei 18 px je rem; bei anderer Schriftgroesse gelten diese Zahlen nicht.
  if (REM === 18) wahr('wie gemessen: Knueppel', gleich(um(g.knueppel), [18, 650, 162, 794]))
  if (REM === 18) wahr('wie gemessen: Gruppe', gleich(um(g.knoepfe), [18, 461, 162, 641]))
  if (REM === 18) wahr('wie gemessen: Kreuz', gleich(um(g.fadenkreuz), [174, 449, 201, 476]))
  wahr('Ueberdecken: Beruehren zaehlt nicht', !R.ueberdecken({ x0: 0, y0: 0, x1: 10, y1: 10 }, { x0: 10, y0: 0, x1: 20, y1: 10 }) && R.ueberdecken({ x0: 0, y0: 0, x1: 10, y1: 10 }, { x0: 9, y0: 9, x1: 20, y1: 20 }))
}

/* ------------------------------------------------ 8. Kontextmenue und Moebelkarte (E92) */

{
  // Eintraege je Zustand: Details immer, Verschieben nur tragbar, Hinsetzen nur sitzbar.
  wahr('Menue: nur Details', gleich(MI.menueEintraege({ tragbar: false, sitzbar: false }), ['details']))
  wahr('Menue: Details, Verschieben', gleich(MI.menueEintraege({ tragbar: true, sitzbar: false }), ['details', 'verschieben']))
  wahr('Menue: Details, Hinsetzen', gleich(MI.menueEintraege({ tragbar: false, sitzbar: true }), ['details', 'hinsetzen']))
  wahr('Menue: alle drei in fester Reihenfolge', gleich(MI.menueEintraege({ tragbar: true, sitzbar: true }), ['details', 'verschieben', 'hinsetzen']))
  // Nacharbeit E92: gesperrt (Mauer, Spiegel, Geraet) zeigt Verschieben mit Grund, ein Bett heisst Hinlegen.
  wahr('Menue: gesperrt, Verschieben bleibt (ausgegraut)', gleich(MI.menueEintraege({ tragbar: false, gesperrt: true, sitzbar: false }), ['details', 'verschieben']))
  wahr('Menue: Bett, Hinlegen statt Hinsetzen', gleich(MI.menueEintraege({ tragbar: true, sitzbar: true, liegen: true }), ['details', 'verschieben', 'hinlegen']))
  wahr('Menue: ohne Platz kein Hinlegen', gleich(MI.menueEintraege({ tragbar: false, sitzbar: false, liegen: true }), ['details']))

  // Lage: am Zeiger, sonst links davon oder darueber, nie ueber den Rand.
  const R8 = MI.MENUE_RAND_PX
  wahr('Lage: Rand 8 px', R8 === 8)
  wahr('Lage: Platz rechts unten, am Zeiger', gleich(MI.menueLage(100, 120, 160, 120, 800, 600), { links: 100, oben: 120 }))
  wahr('Lage: rechts zu wenig, links vom Zeiger', gleich(MI.menueLage(700, 120, 160, 120, 800, 600), { links: 540, oben: 120 }))
  wahr('Lage: unten zu wenig, ueber dem Zeiger', gleich(MI.menueLage(100, 550, 160, 120, 800, 600), { links: 100, oben: 430 }))
  wahr('Lage: Ecke rechts unten, links oben vom Zeiger', gleich(MI.menueLage(790, 590, 160, 120, 800, 600), { links: 630, oben: 470 }))
  wahr('Lage: links oben am Rand bleibt im Bild', gleich(MI.menueLage(0, 0, 160, 120, 800, 600), { links: 8, oben: 8 }))
  wahr('Lage: Flaeche kleiner als das Menue, oben links am Rand', gleich(MI.menueLage(50, 40, 300, 200, 200, 150), { links: 8, oben: 8 }))
  wahr('Lage: kaputte Zahlen, trotzdem eine Lage', gleich(MI.menueLage(Number.NaN, Infinity, 160, 120, 800, 600), { links: 8, oben: 8 }))
  // Handy hochkant, quer und Rechner: an jeder Stelle liegt das Menue ganz im Bild.
  let drin = true
  for (const [fb, fh] of [
    [360, 640],
    [640, 360],
    [1280, 720],
  ]) {
    for (let x = -20; x <= fb + 20; x += 37) {
      for (let y = -20; y <= fh + 20; y += 29) {
        const l = MI.menueLage(x, y, 168, 124, fb, fh)
        if (l.links < R8 || l.oben < R8 || l.links + 168 > fb - R8 || l.oben + 124 > fh - R8) drin = false
      }
    }
  }
  wahr('Lage: immer ganz im Bild (360 x 640, 640 x 360, 1280 x 720)', drin)

  // Masse, Preis, Shop.
  wahr('Masse: ganze cm, B x T x H', MI.masseText({ breite_cm: 120, tiefe_cm: 80.4, hoehe_cm: 74.6 }) === '120 x 80 x 75 cm')
  wahr('Preis: wie im Zeichner', MI.preisText(129900) === '1.299,00 €' && MI.preisText(4995) === '49,95 €' && MI.preisText(0) === '0,00 €')
  wahr('Preis: fehlt oder kaputt: null', MI.preisText(null) === null && MI.preisText(undefined) === null && MI.preisText(-5) === null && MI.preisText(Number.NaN) === null)
  const ikea = MI.shopLink('https://www.ikea.com/at/de/p/stuhl-00000000/')
  wahr('Shop: Name ohne www', ikea?.host === 'ikea.com' && ikea?.href === 'https://www.ikea.com/at/de/p/stuhl-00000000/')
  wahr('Shop: http geht auch', MI.shopLink('http://moebel.example/tisch')?.host === 'moebel.example')
  for (const boese of ['javascript:alert(1)', 'JAVASCRIPT:alert(1)', 'data:text/html,x', 'ftp://moebel.example/x', 'kein link', '', null, undefined, 'https://']) {
    wahr(`Shop: kein Link aus ${JSON.stringify(boese)}`, MI.shopLink(boese) === null)
  }

  // Kisten darauf oder darin, auch gestapelt; am Boden zaehlt keine, ein Kreis haengt nicht.
  const kiste = (id, art, objekt, auf) => ({ id, unterlage_art: art, unterlage_objekt_id: objekt, unterlage_item_id: auf })
  const kisten = [
    kiste('k1', 'objekt', 'tisch', null),
    kiste('k2', 'kiste', null, 'k1'),
    kiste('k3', 'fach', 'schrank', null),
    kiste('k4', 'boden', null, null),
    kiste('k5', 'kiste', null, 'k4'),
    kiste('k6', 'kiste', null, 'k7'),
    kiste('k7', 'kiste', null, 'k6'),
  ]
  const tr = MI.traegerKarte(kisten)
  wahr('Kisten: auf dem Tisch zwei (eine gestapelt)', MI.kistenAuf(tr, 'tisch') === 2)
  wahr('Kisten: im Schrank eine', MI.kistenAuf(tr, 'schrank') === 1)
  wahr('Kisten: Stuhl keine, Boden und Kreis ohne Traeger', MI.kistenAuf(tr, 'stuhl') === 0 && !tr.has('k6') && !tr.has('k4') && !tr.has('k5'))
  const raum8 = lesen('src/components/plan3d/Raum3D.tsx')
  wahr('Raum3D: Traeger nur aus moebelInfo (eine Stelle)', !raum8.includes('function traegerKarte') && raum8.includes('traegerKarte(daten.kisten)'))

  // Menue gerendert: Eintraege, Rollen, Fokus, Sprache.
  function rendern(element, sprache) {
    const daten = { 'kistly.lang': sprache }
    globalThis.localStorage = { getItem: (k) => (k in daten ? daten[k] : null), setItem: () => {}, removeItem: () => {} }
    try {
      return renderToStaticMarkup(h(I.SpracheProvider, null, element))
    } finally {
      delete globalThis.localStorage
    }
  }
  const nichts = () => {}
  const menue = (tragbar, sitzbar, sprache = 'de', mehr = {}) => rendern(h(MM.default, { x: 40, y: 50, tragbar, sitzbar, name: 'Stuhl Eiche', onWahl: nichts, onZu: nichts, ...mehr }), sprache)
  const eintraegeIn = (html) => [...html.matchAll(/data-menue="([a-z]+)"/g)].map((m) => m[1])
  for (const [tragbar, sitzbar] of [
    [false, false],
    [true, false],
    [false, true],
    [true, true],
  ]) {
    wahr(`Menue gerendert (${tragbar}, ${sitzbar}): Eintraege wie menueEintraege`, gleich(eintraegeIn(menue(tragbar, sitzbar)), MI.menueEintraege({ tragbar, sitzbar })))
  }
  const mDe = menue(true, true)
  wahr('Menue: role menu und menuitem, Name fuer Vorleser', mDe.includes('role="menu"') && (mDe.match(/role="menuitem"/g) ?? []).length === 3 && mDe.includes('aria-label="Möbel: Stuhl Eiche"'))
  wahr('Menue: nur der erste Eintrag mit Tab erreichbar', (mDe.match(/tabindex="0"/g) ?? []).length === 1 && (mDe.match(/tabindex="-1"/g) ?? []).length === 2 && mDe.indexOf('tabindex="0"') < mDe.indexOf('data-menue="verschieben"'))
  wahr('Menue: Woerter de', mDe.includes('>Details<') && mDe.includes('>Verschieben<') && mDe.includes('>Hinsetzen<'))
  wahr('Menue: Eintraege frei, nichts ausgegraut', !mDe.includes('aria-disabled') && !mDe.includes('data-menue-grund'))
  // Nacharbeit E92: Mauer (gesperrt) und Bett (Liegeplatz).
  const mauer = menue(false, false, 'de', { gesperrt: true })
  const verschieben = mauer.slice(mauer.indexOf('data-menue="verschieben"'))
  wahr('Menue gesperrt: Verschieben ausgegraut mit Grund', gleich(eintraegeIn(mauer), ['details', 'verschieben']) && mauer.includes('aria-disabled="true"') && verschieben.includes('>Das lässt sich nicht verschieben<'))
  const bett = menue(true, true, 'de', { liegen: true })
  wahr('Menue Bett: Hinlegen statt Hinsetzen', gleich(eintraegeIn(bett), ['details', 'verschieben', 'hinlegen']) && bett.includes('>Hinlegen<') && !bett.includes('>Hinsetzen<'))
  wahr('Menue: vor dem Messen unsichtbar am Zeiger (links und oben)', mDe.includes('left:40px') && mDe.includes('top:50px') && mDe.includes('visibility:hidden') && !mDe.includes('right:'))

  // Karte gerendert.
  const objekt = {
    id: 'o1',
    raum_id: 'r1',
    art: 'moebel',
    name: 'Stuhl Eiche',
    farbe: '#8a6a4a',
    item_id: 'i1',
    item_code: 'M-1-007',
    item_title: null,
    link: 'https://www.ikea.com/at/de/p/stuhl-00000000/',
    preis_cent: 129900,
    material: 'holz',
    x: 0,
    y: 0,
    breite_cm: 45,
    tiefe_cm: 52,
    hoehe_cm: 88,
    drehung: 0,
    form: 'rechteck',
    ausschnitt_breite_cm: null,
    ausschnitt_tiefe_cm: null,
    ausschnitt_ecke: null,
    brett_cm: null,
    spalten: 1,
    boden_cm: 0,
  }
  const karte = (o, mehr = {}, sprache = 'de') =>
    rendern(h(MK.default, { objekt: o, raumName: 'Küche', kisten: 3, seite: '/app/p/p1/moebel/i1', onZurueck: nichts, onSeite: nichts, ...mehr }), sprache)
  const kDe = karte(objekt)
  wahr('Karte: Dialog mit Titel', kDe.includes('role="dialog"') && /aria-labelledby="[^"]+"/.test(kDe) && kDe.includes('data-moebel-name=""'))
  wahr('Karte: Name dir auto, Zimmer', /dir="auto" data-moebel-name="" class="[^"]*">Stuhl Eiche</.test(kDe) && kDe.includes('>Küche<'))
  wahr('Karte: Art', kDe.includes('>Möbel<'))
  wahr('Karte: Masse ltr', /<span dir="ltr" data-moebel-masse="" class="t-serial">45 x 52 x 88 cm<\/span>/.test(kDe) && kDe.includes('Breite x Tiefe x Höhe'))
  wahr('Karte: steht auf dem Boden (kein haengt)', !kDe.includes('data-moebel-haengt'))
  wahr('Karte: Material', kDe.includes('>Holz<'))
  wahr('Karte: Preis ltr', /<span dir="ltr" data-moebel-preis="" class="t-serial">1\.299,00 €<\/span>/.test(kDe))
  const a = kDe.match(/<a [^>]*data-moebel-shop=""[^>]*>/)?.[0] ?? ''
  wahr('Karte: Shop als Link in neuem Tab mit noopener', a.includes('href="https://www.ikea.com/at/de/p/stuhl-00000000/"') && a.includes('target="_blank"') && a.includes('rel="noopener noreferrer"') && kDe.includes('>ikea.com<'))
  wahr('Karte: Kisten darauf oder darin', kDe.includes('data-moebel-kisten="3"') && kDe.includes('>3 Kisten<'))
  wahr('Karte: Nummer des Eintrags ltr, Moebelseite da', kDe.includes('dir="ltr" data-moebel-nummer=""') && kDe.includes('>M-1-007<') && kDe.includes('data-moebel-seite=""') && kDe.includes('Möbelseite öffnen'))
  wahr('Karte: alle Angaben da, kein Satz "nicht eingetragen"', !kDe.includes('nicht eingetragen'))
  wahr('Karte: zurueck zur Begehung', kDe.includes(W.WOERTER['schnell.zur_begehung'].de) && kDe.includes(`>${W.WOERTER['aktion.zurueck'].de}<`))
  const haengt = karte({ ...objekt, art: 'schrank', boden_cm: 140.2 })
  wahr('Karte: haengt 140 cm, Art Schrank', haengt.includes('hängt 140 cm über dem Boden') && haengt.includes('>Schrank<'))
  const leer = karte({ ...objekt, art: 'regal', link: null, preis_cent: null, material: null, item_id: null, item_code: null }, { kisten: 0, seite: null })
  wahr('Karte ohne Angaben: Satz statt leerer Zeilen', leer.includes('Preis, Material und Shop sind nicht eingetragen.') && !leer.includes('data-moebel-preis') && !leer.includes('data-moebel-shop') && leer.includes('>Regal<'))
  wahr('Karte ohne Kisten: keine', leer.includes('data-moebel-kisten="0"') && leer.includes('>keine<'))
  wahr('Karte ohne Eintrag oder Umzug: kein Weg zur Moebelseite', !leer.includes('data-moebel-seite') && !leer.includes('data-moebel-nummer'))
  const boese = karte({ ...objekt, link: 'javascript:alert(1)' })
  wahr('Karte: ungueltiger Link wird kein Link, steht aber da', !boese.includes('href="javascript') && !boese.includes('data-moebel-shop') && boese.includes('Kein gültiger Link: javascript:alert(1)'))
  const weg = karte(null, { seite: null, kisten: 0 })
  wahr('Karte veraltet: klarer Satz, keine Angaben', weg.includes('data-moebel-weg=""') && weg.includes('Dieses Möbelstück gibt es im Plan nicht mehr.') && !weg.includes('data-moebel-name') && !weg.includes('data-moebel-seite'))
  // Material: jede Art aus types.ts hat ein Wort in plan3d.ts; die Art des
  // Objekts und die geteilten Woerter laden immer (woerter.ts).
  const typen = lesen('src/lib/types.ts')
  const materialien = [...(typen.match(/export type Material = ([^\n]+)/)?.[1] ?? '').matchAll(/'([a-z]+)'/g)].map((m) => m[1])
  wahr('Material: sieben Arten in types.ts', materialien.length === 7)
  for (const m of materialien) {
    const e = P3.plan3dWoerter[`plan3d.material.${m}`]
    wahr(`Material ${m}: de`, !!e?.de)
  }
  for (const k of ['plan.moebel', 'plan.regal', 'plan.schrank', 'moebel.masse', 'moebel.masse_platzhalter', 'begriff.kisten_anzahl.eins', 'begriff.kisten_anzahl.viele', 'aktion.zurueck', 'schnell.zur_begehung', 'schnell.zur_ansicht']) {
    wahr(`${k} laedt immer (de)`, !!W.WOERTER[k]?.de)
  }

  // Vertrag zwischen Motor und Raum3D.
  const motor = lesen('src/components/plan3d/motor.ts')
  const raum = raum8
  for (const m of ['moebelKontext', 'moebelKontextZu', 'moebelAnheben', 'moebelHinsetzen']) {
    wahr(`Motor: ${m} im Vertrag und gebaut`, new RegExp(`\\n  ${m}\\(`).test(motor) && new RegExp(`\\n    ${m}\\(`).test(motor))
  }
  wahr('Motor: MoebelKontext3D mit objektId, x, y, tragbar, gesperrt, sitzbar, liegen', /export interface MoebelKontext3D \{\s*objektId: string\s*x: number\s*y: number\s*tragbar: boolean\s*gesperrt: boolean\s*sitzbar: boolean\s*liegen: boolean\s*\}/.test(motor))
  wahr('Motor: gesperrt nur, wenn Tragen ginge; liegen aus der Art des Platzes', motor.includes("tragbar: traegt, gesperrt: !traegt && tragenGeht(), sitzbar: pl !== null, liegen: pl?.art === 'liegen' })"))
  wahr('Raum3D: gesperrt und liegen ans Menue (sachlich nur Details, src/lib/ansicht.ts)', raum8.includes('gesperrt={!SACHLICH && menue.gesperrt}') && raum8.includes('liegen={!SACHLICH && menue.liegen}'))
  // Nacharbeit E92: der Zeiger, der das Menue oeffnete, schaut bis zum Loslassen nicht um.
  const schauB = motor.slice(motor.indexOf('const schauBewegen = '), motor.indexOf('const schauHoch = '))
  const schauH = motor.slice(motor.indexOf('const schauHoch = '), motor.indexOf("addEventListener('pointerdown', schauRunter)"))
  wahr('Motor: Kontext merkt sich den Zeiger, der noch unten ist', motor.includes('neigung: neigungZiel, zeiger: schauen?.id ?? null }'))
  wahr('Motor: dieser Zeiger dreht den Blick nicht', /if \(kontextOffen && kontextOffen\.zeiger === e\.pointerId\) return\s*gierZiel \+= dx \* 0\.0045/.test(schauB))
  wahr('Motor: ab dem Loslassen zaehlt Umschauen wieder', /if \(kontextOffen && kontextOffen\.zeiger === e\.pointerId\) \{\s*kontextOffen\.zeiger = null\s*kontextOffen\.gier = gierZiel\s*kontextOffen\.neigung = neigungZiel\s*\}/.test(schauH))
  const rechts = motor.slice(motor.indexOf('const rechtsKlick = '), motor.indexOf("addEventListener('contextmenu', rechtsKlick)"))
  wahr('Motor: Rechtsklick oeffnet das Menue, mit getragenem legt er zurueck', /if \(trag\) \{\s*zuruecklegen\(\)\s*return\s*\}\s*kontextBei\(e\.clientX, e\.clientY\)/.test(rechts) && !rechts.includes('aufnehmen(') && !rechts.includes('anheben('))
  wahr('Motor: langes Druecken oeffnet das Menue', /uhr: window\.setTimeout\(\(\) => \{\s*langDruck = null\s*kontextBei\(x, y\)\s*\}, LANG_DRUECKEN_MS\)/.test(motor))
  wahr('Motor: angehoben wird nur ueber moebelAnheben', (motor.match(/\baufnehmen\(/g) ?? []).length === 2 && (motor.match(/\banheben\(s, /g) ?? []).length === 1)
  wahr('Motor: Druck aufs Bild schliesst das Menue, ohne anzutippen', /const tippRunter = \(e: PointerEvent\) => \{[\s\S]*?if \(kontextOffen\) \{\s*kontextAus\(true\)\s*tipp = null\s*return\s*\}/.test(motor))
  wahr('Motor: Gehen und Umschauen schliessen es (in jedem Bild)', motor.includes('    kontextPruefen()\n') && /halten\.size > 0 \|\|\s*stick\.x !== 0 \|\|\s*stick\.y !== 0/.test(motor) && motor.includes('Math.abs(gierZiel - k.gier) > KONTEXT_BLICK_RAD'))
  wahr('Motor: neuer Bau, Ende des Begehens, eingabe(false) melden null', (motor.match(/kontextAus\(true\)\s*kontextLetzt = null/g) ?? []).length === 2 && /schauenLoslassen\(\)\s*tipp = null\s*\/\/ E92[^\n]*\n\s*kontextAus\(true\)/.test(motor))
  wahr('Motor: Kiste meldet sich wie ein Linksklick (Karte)', /if \(t\.art === 'kiste'\) \{[\s\S]*?tippFn\(Math\.round\(t\.x \* 100\), Math\.round\(t\.z \* 100\), \{ objekt: t\.objekt, kiste: t\.kiste \}\)/.test(motor))
  wahr('Motor: Hinsetzen wie Linksklick, nicht mit Ding in der Hand', motor.includes('const pl = halt.ding ? null : (t.platz ?? naechsterPlatz(s.id, t.x, t.z))'))
  wahr('Motor: x, y vom host aus', /const r = host\.getBoundingClientRect\(\)\s*kontextMelden\(\{ objektId: s\.id, x: clientX - r\.left, y: clientY - r\.top/.test(motor))
  wahr('Raum3D: moebelKontext an und ab, Karte und Menue zu beim Ende', /m\.moebelKontext\(\(k\) => setMenue\(k\)\)\s*return \(\) => \{\s*m\.moebelKontext\(null\)\s*setMenue\(null\)\s*setMoebelKarte\(null\)/.test(raum))
  wahr('Raum3D: Esc zuerst Menue, dann Moebelkarte, vor Kistenkarte und Tragen', /if \(z\.menue \|\| z\.moebelKarte\) \{\s*if \(z\.menue\) \{\s*setMenue\(null\)\s*motor\.current\?\.moebelKontextZu\(\)\s*\} else setMoebelKarte\(null\)/.test(raum) && raum.indexOf('if (z.menue || z.moebelKarte)') < raum.indexOf('if (!z.karte && z.gehen && z.traegt)'))
  wahr('Raum3D: Eingabe ruht bei offener Karte (Kiste oder Moebel)', raum.includes('motor.current?.eingabe(karte === null && moebelKarte === null)'))
  wahr('Raum3D: Wahl im Menue', /m\.moebelKontextZu\(\)\s*if \(w === 'details'\) setMoebelKarte\(k\.objektId\)\s*else if \(w === 'verschieben'\) m\.moebelAnheben\(k\.objektId\)\s*else m\.moebelHinsetzen\(k\.objektId\)/.test(raum))
  wahr('Raum3D: daneben, Mausrad, Rollen und Groesse schliessen', raum.includes("document.addEventListener('pointerdown', druck, true)") && raum.includes("window.addEventListener('wheel', menueZu, { capture: true, passive: true })") && raum.includes("window.addEventListener('scroll', menueZu, true)") && raum.includes("window.addEventListener('resize', menueZu)"))
  const flaecheAb = raum.indexOf('<div dir="ltr" className="relative min-h-0 flex-1"')
  wahr('Raum3D: Menue und Moebelkarte in der 3D-Flaeche (ltr, auch im Vollbild)', flaecheAb > 0 && raum.indexOf('<MoebelMenue') > flaecheAb && raum.indexOf('<MoebelKarte') > flaecheAb)
  wahr('Raum3D: Moebelseite nur mit Eintrag und genau diesem Umzug, Weg ueber zielFuerItem', /karteObjekt\?\.item_id && projekt && projekt\.project\.id === projectId\s*\? zielFuerItem\(projectId, \{ id: karteObjekt\.item_id, kind: 'furniture' \} as Item\)\s*: null/.test(raum))
  const appTxt = lesen('src/App.tsx')
  const itemRow = lesen('src/components/ItemRow.tsx')
  // E104: Moebel sind aus dem Programm genommen, die alte Adresse leitet auf das Lager um.
  wahr('Weg: moebel/:id leitet auf das Lager um (E104)', appTxt.includes('moebel/:id') && appTxt.includes('Navigate'))
  for (const d of ['src/components/plan3d/MoebelKarte.tsx', 'src/components/plan3d/MoebelMenue.tsx']) wahr(`${d}: ohne Portal (Vollbild)`, !lesen(d).includes('createPortal'))
}

/* ------------------------------------------------ 9. Grundriss gross am Handy (E94) */

{
  // Erfundene Wohnung: Kinderzimmer mit Tuer zur Diele (die Diele ist
  // kuerzer, darum hat die Tuer auf der anderen Wandseite andere
  // Abstaende), ein Fenster, ein Bett mit Eintrag und Link, ein Regal mit
  // einer Kiste im Fach.
  const raum9 = (id, name, punkte) => ({
    id, grundriss_id: 'g9', project_id: 'p1', tag_id: null, name, art: 'innen', punkte, hoehe_cm: 250,
    bodenfarbe: null, wandfarben: null, sort: 0, tag_name: null, tag_short: null, tag_color: null,
  })
  const objekt9 = (id, art, name, x, y, b, t, hh, mehr = {}) => ({
    id, raum_id: 'ki', art, name, farbe: null, item_id: null, item_code: null, item_title: null, x, y, breite_cm: b, tiefe_cm: t, hoehe_cm: hh,
    drehung: 0, form: 'rechteck', ausschnitt_breite_cm: null, ausschnitt_tiefe_cm: null, ausschnitt_ecke: null, brett_cm: null, spalten: 1, ...mehr,
  })
  const tuer9 = (id, raumId, art, kante, abstand, breite) => ({ id, raum_id: raumId, art, kante, abstand_cm: abstand, breite_cm: breite, hoehe_cm: 200, bruestung_cm: 0, anschlag: 'links', aufschlag: 'innen' })
  const d9 = {
    grundriss: { id: 'g9', project_id: 'p1', name: 'Erfundene Wohnung', sort: 0, version: 1, created_at: '', updated_at: '' },
    raeume: [raum9('ki', 'Kinderzimmer', [[0, 0], [400, 0], [400, 300], [0, 300]]), raum9('di', 'Diele', [[400, 0], [600, 0], [600, 200], [400, 200]])],
    oeffnungen: [tuer9('td', 'ki', 'tuer', 1, 50, 80), tuer9('fk', 'ki', 'fenster', 2, 100, 120)],
    objekte: [
      objekt9('bett', 'moebel', 'Bett', 20, 80, 140, 200, 45, { item_id: 'i-bett', item_code: 'M-1-009', link: 'https://moebel.example/bett', preis_cent: 25000, material: 'holz' }),
      objekt9('regal', 'regal', 'Regal', 200, 10, 100, 30, 150, { brett_cm: [50, 100] }),
    ],
    kisten: [
      {
        id: 'k9', code: 'ZZ-2-009', prefix: 'ZZ', size: 2, seq: 9, kind: 'box', status: 'open', title: null, room_id: null, room_color: null, mark_color: null,
        eigene_groesse_name: null, platz_raum_id: 'ki', platz_x: 250, platz_y: 25, platz_drehung: 0, unterlage_art: 'fach', unterlage_item_id: null,
        unterlage_objekt_id: 'regal', fach_ebene: 1, fach_spalte: null, laenge_cm: 40, breite_cm: 30, hoehe_cm: 30, unten_cm: 52, oben_cm: 82,
        grenze_cm: 100, wurzel_art: 'fach', nr: 1,
      },
    ],
  }
  const tDe = (k, v) => I.uebersetzen('de', k, v)
  const kurz9 = (m) => (m ? `${m.art}:${m.p.join(',')}${m.ende ? ':' + m.ende : ''}${m.gegenueber ? ':g' : ''}` : null)

  // --- Fangweite: eine Fingerbreite, aus dem Massstab.
  wahr('Messen: Fingerbreite 24 Bildpunkte', HM.FINGER_PX === 24)
  wahr('Messen: Fangweite in cm aus dem Massstab', HM.fingerToleranz(0.5) === 48 && HM.fingerToleranz(1) === 24 && HM.fingerToleranz(2) === 12)
  wahr('Messen: kaputter Massstab gibt eine endliche Fangweite', [0, -1, Number.NaN, Infinity].every((x) => Number.isFinite(HM.fingerToleranz(x)) && HM.fingerToleranz(x) > 0))
  const bei1 = HM.messenTippen(d9, HM.MESSUNG_LEER, [374, 50], 1)
  const bei2 = HM.messenTippen(d9, HM.MESSUNG_LEER, [374, 50], 2)
  wahr('Messen: 20 cm neben dem Tuerende rastet bei 1 Bildpunkt je cm ein (24 cm)', kurz9(bei1.aPunkt) === 'tuer:394,50:links' && gleich(bei1.a, [394, 50]))
  wahr('Messen: bei 2 Bildpunkten je cm nicht mehr (12 cm), dann Raster 1', bei2.aPunkt === null && gleich(bei2.a, [374, 50]))

  // --- Tipp 1 = A, Tipp 2 = B, Tipp 3 beginnt neu.
  const m1 = HM.messenTippen(d9, HM.MESSUNG_LEER, [390, 52], 1)
  wahr('Messen: Tipp 1 setzt A am Tuerende, B leer', kurz9(m1.aPunkt) === 'tuer:394,50:links' && m1.b === null && m1.bPunkt === null)
  wahr('Messen: mit A allein kein Abstand, keine Lichte', HM.messAbstand(m1) === null && HM.messLichte(m1) === false)
  wahr('Messen: A am Tuerende zeigt die Schnellmasse dieser Tuer', HM.schnellOeffnung(m1) === 'td')
  const m2 = HM.messenTippen(d9, m1, [10, 10], 1)
  wahr('Messen: Tipp 2 setzt B an der Innenecke', kurz9(m2.bPunkt) === 'ecke:6,6' && gleich(m2.a, [394, 50]))
  wahr('Messen: Abstand A bis B', Math.abs(HM.messAbstand(m2) - Math.hypot(388, 44)) < 1e-9)
  wahr('Messen: mit B keine Schnellmasse mehr', HM.schnellOeffnung(m2) === null)
  const m3 = HM.messenTippen(d9, m2, [596, 196], 1)
  wahr('Messen: Tipp 3 beginnt neu (neues A, kein B)', kurz9(m3.aPunkt) === 'ecke:594,194' && m3.b === null && HM.messAbstand(m3) === null)
  wahr('Messen: A an einer Ecke zeigt keine Schnellmasse', HM.schnellOeffnung(m3) === null)
  const fenster = HM.messenTippen(d9, HM.MESSUNG_LEER, [300, 290], 1)
  wahr('Messen: A am Fensterende zeigt die Schnellmasse des Fensters', kurz9(fenster.aPunkt) === 'fenster:300,294:links' && HM.schnellOeffnung(fenster) === 'fk')
  const gegen = HM.messenTippen(d9, HM.MESSUNG_LEER, [408, 128], 1)
  wahr('Messen: A auf der anderen Wandseite gehoert auch zur Tuer', kurz9(gegen.aPunkt) === 'tuer:406,130:links:g' && HM.schnellOeffnung(gegen) === 'td')
  const frei = HM.messenTippen(d9, HM.MESSUNG_LEER, [200, 150], 1)
  wahr('Messen: mitten im Raum frei (Raster), keine Schnellmasse', frei.aPunkt === null && gleich(frei.a, [200, 150]) && HM.schnellOeffnung(frei) === null)

  // --- Lichte: beide Enden derselben Tuer.
  const lichte = HM.messenTippen(d9, HM.messenTippen(d9, HM.MESSUNG_LEER, [393, 51], 1), [393, 129], 1)
  wahr('Messen: beide Enden der Tuer sind die Lichte 80', HM.messLichte(lichte) && Math.round(HM.messAbstand(lichte)) === 80)
  wahr('Messen: Tuerende und Ecke sind keine Lichte', !HM.messLichte(m2))

  // --- Namen wie im Zeichner (eine Stelle: messpunktName).
  wahr('Namen: Tuerende', HM.punktName(tDe, m1.aPunkt) === 'Tür Kinderzimmer, links')
  wahr('Namen: Ecke', HM.punktName(tDe, m2.bPunkt) === 'Ecke')
  wahr('Namen: andere Wandseite', HM.punktName(tDe, gegen.aPunkt) === 'Tür Kinderzimmer, links, andere Wandseite')
  wahr('Namen: Fenster', HM.punktName(tDe, fenster.aPunkt) === 'Fenster Kinderzimmer, links')
  wahr('Namen: frei gesetzt heisst Punkt', HM.punktName(tDe, null) === 'Punkt')
  wahr('Namen: Zeichner und Handy aus messpunktName', HM.punktName(tDe, m1.aPunkt) === MP.messpunktName(tDe, m1.aPunkt))
  const leinwand = lesen('src/zeichner/Leinwand.tsx')
  wahr('Leinwand: Namen aus messpunkte.ts, keine eigene Fassung', leinwand.includes("import { messpunktName, type Messpunkt } from './messpunkte'") && !leinwand.includes('function messpunktName') && !leinwand.includes('function endeName') && leinwand.includes("t('plan.messen.lichte')"))
  for (const k of ['plan.messen.ecke', 'plan.messen.links', 'plan.messen.rechts', 'plan.messen.punkt', 'plan.messen.punkt_ohne_raum', 'plan.messen.gegenueber', 'plan.messen.lichte', 'plan.tuer', 'plan.fenster', 'plan.durchgang']) {
    wahr(`${k} laedt immer, auch am Handy (de)`, !!W.WOERTER[k]?.de && !(k in ZW.zeichnerWoerter))
  }
  wahr('zeichner.ts: die alten zeichner.messen.* sind weg', !Object.keys(ZW.zeichnerWoerter).some((k) => k.startsWith('zeichner.messen.')))

  // --- Schnellmasse als Zahlen fuer die Leiste.
  wahr('Schnellmasse Tuer: Maueroeffnung, frei fuer Moebel, beide Seiten bis zur Ecke, andere Wandseite', gleich(HM.schnellUebersicht(d9, 'td'), { lichte: 80, durchgang: 72, links: 44, rechts: 164, gegenueber: { links: 64, rechts: 44 } }))
  wahr('Schnellmasse Fenster: ohne andere Wandseite, ohne Zarge', gleich(HM.schnellUebersicht(d9, 'fk'), { lichte: 120, durchgang: null, links: 94, rechts: 174, gegenueber: null }))

  // --- Nacharbeit: Tuer mit DL 80 (breite_cm 88, E88). Die Enden sind die
  // Maueroeffnung, frei fuer Moebel ist, was zwischen der Zarge bleibt.
  const d9t = { ...d9, oeffnungen: [tuer9('td', 'ki', 'tuer', 1, 50, 88), d9.oeffnungen[1]] }
  wahr('Zarge: eine Stelle fuer 2D und 3D (hilfe.ts), 4 cm je Seite', HI.ZARGE_CM === 4 && HI.durchgangslichte({ art: 'tuer', breite_cm: 88 }) === 80 && HI.durchgangslichte({ art: 'tuer', breite_cm: 98 }) === 90 && HI.durchgangslichte({ art: 'fenster', breite_cm: 88 }) === 88 && HI.durchgangslichte({ art: 'durchgang', breite_cm: 88 }) === 88)
  wahr('Zarge: hoechstens ein Viertel der Breite', HI.zargeCm(8) === 2 && HI.durchgangslichte({ art: 'tuer', breite_cm: 8 }) === 4)
  const szeneTxt = lesen('src/components/plan3d/szene.ts')
  wahr('Zarge: 3D nimmt dieselbe Zahl (zargeCm), keine eigene', szeneTxt.includes('const z = zargeCm(l)') && !/const ZARGE_CM\s*=/.test(szeneTxt))
  wahr('Tuer DL 80: Maueroeffnung 88, frei fuer Moebel 80', gleich(HM.schnellUebersicht(d9t, 'td'), { lichte: 88, durchgang: 80, links: 44, rechts: 156, gegenueber: { links: 56, rechts: 44 } }))
  const lichte88 = HM.messenTippen(d9t, HM.messenTippen(d9t, HM.MESSUNG_LEER, [393, 51], 1), [393, 137], 1)
  wahr('Tuer DL 80: Messen der Lichte ist die Maueroeffnung 88, frei 80', HM.messLichte(lichte88) && Math.round(HM.messAbstand(lichte88)) === 88 && HM.messDurchgang(d9t, lichte88) === 80)
  wahr('Tuer DL 80: Tuerende und Ecke ist keine Lichte, kein Durchgang', HM.messDurchgang(d9t, HM.messenTippen(d9t, HM.messenTippen(d9t, HM.MESSUNG_LEER, [393, 51], 1), [10, 10], 1)) === null)
  const fensterLichte = HM.messenTippen(d9, HM.messenTippen(d9, HM.MESSUNG_LEER, [300, 293], 1), [180, 293], 1)
  wahr('Fenster: Lichte ohne Durchgang (keine Zarge)', HM.messLichte(fensterLichte) && HM.messDurchgang(d9, fensterLichte) === null)
  // Drueben bis zur Innenecke der Diele (194): die Lichte dort ist 74, frei
  // ist von der Zarge (4) bis zur Innenecke, also 70 statt 72.
  const d9e = { ...d9, oeffnungen: [tuer9('td', 'ki', 'tuer', 1, 120, 80), d9.oeffnungen[1]] }
  const drueben = HM.messenTippen(d9e, HM.messenTippen(d9e, HM.MESSUNG_LEER, [407, 121], 1), [407, 193], 1)
  wahr('Tuer drueben an der Innenecke: Lichte 74, frei 70', HM.messLichte(drueben) && Math.round(HM.messAbstand(drueben)) === 74 && HM.messDurchgang(d9e, drueben) === 70)
  const hueben = HM.messenTippen(d9e, HM.messenTippen(d9e, HM.MESSUNG_LEER, [393, 121], 1), [393, 199], 1)
  wahr('Tuer hueben: Lichte 80, frei 72', HM.messLichte(hueben) && Math.round(HM.messAbstand(hueben)) === 80 && HM.messDurchgang(d9e, hueben) === 72)

  // --- Nacharbeit: links und rechts gelten im jeweiligen Raum mit Blick zur
  // Wand. Wer in der Diele zur Tuer blickt (nach Westen), hat das "linke"
  // Ende links von sich, wer im Kinderzimmer zur Tuer blickt (nach Osten),
  // ebenso. Links von jemandem, der am Bildschirm (y nach unten) in
  // Richtung f blickt, ist (f[1], -f[0]).
  const linksVon = (f) => [f[1], -f[0]]
  const endenTd = MP.messpunkte(d9).filter((m) => m.oeffnungId === 'td')
  for (const [seite, blick] of [[false, [1, 0]], [true, [-1, 0]]]) {
    const li = endenTd.find((m) => !!m.gegenueber === seite && m.ende === 'links')
    const re = endenTd.find((m) => !!m.gegenueber === seite && m.ende === 'rechts')
    const l = linksVon(blick)
    wahr(`Links und rechts: ${seite ? 'in der Diele' : 'im Kinderzimmer'} mit Blick zur Tuer liegt "links" links`, !!li && !!re && (li.p[0] - re.p[0]) * l[0] + (li.p[1] - re.p[1]) * l[1] > 0)
  }
  const schnellTd = MP.schnellMasse(d9, 'td', 0).filter((m) => m.gegenueber)
  const linksDrueben = schnellTd.find((m) => m.art === 'links')
  wahr('Links und rechts: Schnellmass "links" drueben endet am linken Ende (aus der Diele)', !!linksDrueben && [linksDrueben.wandA, linksDrueben.wandB].some((q) => gleich(q, endenTd.find((m) => m.gegenueber && m.ende === 'links').p)))
  wahr('Schnellmasse: unbekannte Oeffnung null', HM.schnellUebersicht(d9, 'gibtsnicht') === null)

  // --- Grosse Ansicht: Antippen und Messen als Zustand.
  const start = HM.GROSS_START
  wahr('Gross: beginnt mit Ansehen, nichts gewaehlt, keine Messung', start.modus === 'ansehen' && start.tipp === null && start.messung.a === null && start.messung.b === null)
  const bettTreffer = HI.trefferAn(d9, [90, 180], 10)
  wahr('Gross: Bett wird getroffen', gleich(bettTreffer, { art: 'objekt', id: 'bett' }))
  const angetippt = HM.grossTippen(start, d9, [90, 180], bettTreffer, 1)
  wahr('Gross: Ansehen waehlt das Getroffene, misst nicht', gleich(angetippt.tipp, { art: 'objekt', id: 'bett' }) && angetippt.messung.a === null)
  wahr('Gross: daneben schliesst das Blatt', HM.grossTippen(angetippt, d9, [500, 100], null, 1).tipp === null)
  const messen = HM.grossModus(angetippt, 'messen')
  wahr('Gross: Umschalten auf Messen schliesst das Blatt', messen.modus === 'messen' && messen.tipp === null)
  const gemessen = HM.grossTippen(messen, d9, [90, 180], bettTreffer, 1)
  wahr('Gross: Messen oeffnet nie eine Karte, auch auf einem Moebel', gemessen.tipp === null && gemessen.messung.a !== null)
  const zwei = HM.grossTippen(gemessen, d9, [390, 52], HI.trefferAn(d9, [390, 52], 10), 1)
  wahr('Gross: zweiter Tipp beim Messen ist B, wieder ohne Karte', zwei.tipp === null && kurz9(zwei.messung.bPunkt) === 'tuer:394,50:links')
  wahr('Gross: zurueck zu Ansehen, die Messung bleibt bis Neu', gleich(HM.grossModus(zwei, 'ansehen').messung, zwei.messung))
  const neu = HM.messungNeu(zwei)
  wahr('Gross: Neu loescht die Messung, Messen bleibt', neu.modus === 'messen' && gleich(neu.messung, HM.MESSUNG_LEER))

  // --- Gerendert.
  function rendern9(element, sprache, I0 = I) {
    const daten = { 'kistly.lang': sprache }
    globalThis.localStorage = { getItem: (k) => (k in daten ? daten[k] : null), setItem: () => {}, removeItem: () => {} }
    try {
      return renderToStaticMarkup(h(I0.SpracheProvider, null, h(MemoryRouter, { initialEntries: ['/app/p/p1/grundriss/g9'] }, element)))
    } finally {
      delete globalThis.localStorage
    }
  }
  const nichts9 = () => {}
  const gross = (zustand, sprache = 'de', mehr = {}) =>
    rendern9(h(PG.GrossAnsicht, { daten: d9, projektId: 'p1', hervor: null, raumId: null, onZu: nichts9, onSeite: nichts9, start: zustand, ...mehr }), sprache)

  // Unter dem Plan (Ansehen der Seite): der Knopf, noch keine Ebene.
  const ansehen = (sprache) => rendern9(h(GS.Ansehen, { daten: d9, raumId: null, kisteId: null, begehen: false, onBegehen: nichts9, onGespeichert: nichts9 }), sprache, IS)
  const aDe = ansehen('de')
  const knopf = aDe.match(/<button[^>]*data-gross-knopf=""[^>]*>[\s\S]*?<\/button>/)?.[0] ?? ''
  wahr('Ansehen: Knopf "Groß ansehen" mit Symbol', knopf.includes('Groß ansehen') && knopf.includes('lucide-maximize') && knopf.includes('min-h-12'))
  wahr('Ansehen: Knopf vor dem Plan, Plan wie bisher, keine Ebene', aDe.indexOf('data-gross-knopf') < aDe.indexOf('data-tour="grundriss-plan"') && aDe.includes('aspect-ratio') && !aDe.includes('data-plan-gross'))
  wahr('Ansehen: ohne Tipp keine Karte', !aDe.includes('data-moebel-karte') && !aDe.includes('data-plan-kiste'))

  // Die Ebene.
  const gDe = gross(start)
  wahr('Gross: Ebene ueber allem, ganze Hoehe, Dialog', /role="dialog" aria-modal="true" aria-label="Erfundene Wohnung" dir="ltr" data-plan-gross="ansehen"/.test(gDe) && gDe.includes('fixed inset-0 z-50') && gDe.includes('h-dvh') && gDe.includes('safe-top'))
  wahr('Gross: Schliessen 44 px mit Namen fuer Vorleser', /<button type="button" aria-label="Große Ansicht schließen"[^>]*class="[^"]*h-11 w-11/.test(gDe))
  const schalter = gDe.match(/<div role="group" aria-label="Antippen zum Ansehen oder Messen"[\s\S]*?<\/div>/)?.[0] ?? ''
  wahr('Gross: Schalter Ansehen | Messen, Ansehen gedrueckt', /aria-pressed="true" data-modus="ansehen"[^>]*>[\s\S]*?Ansehen<\/button>/.test(schalter) && /aria-pressed="false" data-modus="messen"[^>]*>[\s\S]*?Messen<\/button>/.test(schalter) && (schalter.match(/min-h-11/g) ?? []).length === 2)
  wahr('Gross: Hinweis zum Antippen, keine Leiste beim Messen', gDe.includes('Tippe auf ein Möbel, eine Kiste, eine Tür oder einen Raum.') && !gDe.includes('data-mess-leiste'))
  wahr('Gross: Plan fuellt den Platz (kein Seitenverhaeltnis), links nach rechts, mit Zoom', /<div dir="ltr" class="relative w-full overflow-hidden h-full"/.test(gDe) && !gDe.includes('aspect-ratio') && gDe.includes('touch-action:none'))
  wahr('Gross: ohne Tipp kein Blatt', !gDe.includes('data-moebel-karte') && !gDe.includes('data-plan-blatt'))

  // Ein Tipp aufs Bett: das Blatt mit der Moebelkarte.
  const bett = gross(angetippt)
  wahr('Gross: Bett zeigt die Moebelkarte als Blatt', bett.includes('data-moebel-karte="blatt"') && /data-moebel-name=""[^>]*>Bett</.test(bett))
  wahr('Gross: Blatt in der Spalte unter dem Plan, hoechstens halb so hoch', bett.includes('max-h-[50%]') && !/data-moebel-karte="blatt"[^>]*class="[^"]*absolute/.test(bett) && bett.indexOf('data-moebel-karte') > bett.indexOf('<svg'))
  wahr('Gross: Karte mit Massen, Preis, Link, Zimmer, Nummer', bett.includes('140 x 200 x 45 cm') && bett.includes('250,00 €') && bett.includes('>moebel.example<') && bett.includes('>Kinderzimmer<') && bett.includes('>M-1-009<'))
  wahr('Gross: Knopf Schliessen statt Zurueck, Moebelseite da, keine Begehung', bett.includes('>Schließen</button>') && bett.includes('data-moebel-seite=""') && bett.includes('Möbelseite öffnen') && !bett.includes(W.WOERTER['schnell.zur_begehung'].de))
  wahr('Gross: das Bett bleibt markiert', bett.includes('plan-auswahl-ebene'))
  const fremd = rendern9(h(PG.GrossAnsicht, { daten: d9, projektId: 'anderer', hervor: null, raumId: null, onZu: nichts9, onSeite: nichts9, start: angetippt }), 'de')
  wahr('Gross: Plan eines anderen Umzugs ohne Weg zur Moebelseite', fremd.includes('data-moebel-karte="blatt"') && !fremd.includes('data-moebel-seite'))
  const regal = gross({ ...start, tipp: { art: 'objekt', id: 'regal' } })
  wahr('Gross: Regal mit Moebelkarte und Faechern, eine Kiste darin', regal.includes('data-moebel-karte="blatt"') && regal.includes('data-moebel-kisten="1"') && regal.includes('50 bis 98 cm'))
  const raumBlatt = gross({ ...start, tipp: { art: 'raum', id: 'di' } })
  wahr('Gross: Raum zeigt Name, Nutzflaeche (flaecheQm), Hoehe', raumBlatt.includes('data-plan-blatt="raum"') && raumBlatt.includes('>Diele</h2>') && raumBlatt.includes(`data-plan-flaeche="${HI.flaecheQm(d9.raeume[1].punkte)}"`) && raumBlatt.includes('Nutzfläche') && raumBlatt.includes('2,50 m'))
  const tuerBlatt = gross({ ...start, tipp: { art: 'oeffnung', id: 'td' } })
  wahr('Gross: Tuer zeigt Lichte und die Abstaende bis zur Ecke', tuerBlatt.includes('data-plan-blatt="oeffnung"') && tuerBlatt.includes('>Tür Kinderzimmer</h2>') && tuerBlatt.includes('data-schnell-mass="innen-lichte"') && tuerBlatt.includes('data-schnell-mass="gegen-rechts"') && tuerBlatt.includes('>64 cm</span>'))
  const zeilen9 = (html) => [...html.matchAll(/<dt class="[^"]*">([^<]*)<\/dt><dd[^>]*><span data-schnell-mass="([a-z-]+)"><span[^>]*>([^<]*)<\/span>/g)].map((x) => `${x[2]}=${x[1]} ${x[3]}`)
  const tuer88 = gross({ ...start, tipp: { art: 'oeffnung', id: 'td' } }, 'de', { daten: d9t })
  wahr('Tuer DL 80 im Blatt: frei fuer Moebel 80, Maueroeffnung 88, kein "Lichte"', gleich(zeilen9(tuer88), ['innen-durchgang=Frei für Möbel 80 cm', 'innen-lichte=Maueröffnung 88 cm', 'innen-links=links bis zur Ecke 44 cm', 'innen-rechts=rechts bis zur Ecke 156 cm', 'gegen-links=links bis zur Ecke 56 cm', 'gegen-rechts=rechts bis zur Ecke 44 cm']) && !/>Lichte</.test(tuer88), JSON.stringify(zeilen9(tuer88)))
  const fensterBlatt = gross({ ...start, tipp: { art: 'oeffnung', id: 'fk' } })
  wahr('Fenster im Blatt: weiter Lichte, ohne frei fuer Moebel', zeilen9(fensterBlatt)[0] === 'innen-lichte=Lichte 120 cm' && !fensterBlatt.includes('data-schnell-mass="innen-durchgang"'))
  wahr('Blatt: Satz, von wo aus links und rechts gelten', tuerBlatt.includes('data-schnell-blick=""') && tuerBlatt.includes('Links und rechts gelten im jeweiligen Raum, mit Blick zur Wand.'))
  wahr('Gross: beim Ansehen einer Tuer stehen ihre Schnellmasse im Plan (5 Linien), keine Messmarken', tuerBlatt.includes('data-schnell-zeichnung="td"') && (tuerBlatt.match(/data-schnell-linie=/g) ?? []).length === 5 && !tuerBlatt.includes('data-mess-marken'))
  wahr('Gross: beim Ansehen eines Moebels keine Schnellmasse im Plan', !bett.includes('data-schnell-zeichnung'))
  const kisteBlatt = gross({ ...start, tipp: { art: 'kiste', id: 'k9' } })
  wahr('Gross: Kiste zeigt ihre Karte im Blatt', kisteBlatt.includes('data-plan-blatt="kiste"') && kisteBlatt.includes('data-plan-kiste="k9"') && kisteBlatt.includes('href="/app/p/p1/kisten/k9"'))
  wahr('Gross: Blaetter mit Knopf Schliessen (44 px)', [raumBlatt, tuerBlatt, kisteBlatt].every((x) => /<button id="[^"]+" class="[^"]*min-h-12[^"]*">[\s\S]*?Schließen<\/button>/.test(x)))
  wahr('Gross: Titel im Blatt bricht um statt abgeschnitten zu werden', [raumBlatt, tuerBlatt, kisteBlatt].every((x) => /<h2 id="[^"]+" dir="auto" class="t-name min-w-0 flex-1 break-words">/.test(x) && !/<h2[^>]*truncate/.test(x)))
  wahr('Gross: Raumhoehe wie die Flaeche (de ltr)', /<span data-plan-hoehe="250" class="t-serial" style="direction:ltr">2,50 m<\/span>/.test(raumBlatt))

  // Quer mit wenig Hoehe: das Blatt neben dem Plan (wie ab md).
  const QUER = '[@media(orientation:landscape)_and_(max-height:30rem)]'
  wahr('Quer: Blatt als Leiste neben dem Plan, volle Hoehe, hoechstens halb so breit', ['max-h-none', 'w-72', 'max-w-[50%]', 'rounded-none', 'border-y-0', 'border-e-0'].every((k) => MI.BLATT_KLASSEN.split(' ').includes(`${QUER}:${k}`)))
  wahr('Quer: Spalte der grossen Ansicht nebeneinander', gDe.includes(`flex min-h-0 flex-1 flex-col md:flex-row ${QUER}:flex-row`))
  wahr('Quer: Moebelkarte als Blatt mit schmaler Fussleiste bei wenig Hoehe', /data-moebel-seite=""/.test(bett) && /<div class="[^"]*\[@media\(max-height:30rem\)\]:pt-2[^"]*\[@media\(max-height:30rem\)\]:pb-\[calc\(env\(safe-area-inset-bottom,0px\)\+0\.5rem\)\][^"]*"><button[^>]*data-moebel-seite/.test(bett))
  const raumMarkiert = gross(start, 'de', { raumId: 'di' })
  wahr('Gross: Raum aus der Adresse markiert, solange nichts angetippt ist', raumMarkiert.includes('plan-auswahl-ebene') && !gDe.includes('plan-auswahl-ebene'))

  // Unter dem Plan: dieselben Karten im Fluss.
  const block = (tipp, sprache = 'de') => rendern9(h(PD.TippDetails, { daten: d9, tipp, projektId: 'p1', hervor: null, form: 'block', onZu: nichts9, onSeite: nichts9 }), sprache)
  const bettBlock = block({ art: 'objekt', id: 'bett' })
  wahr('Ansehen: Bett zeigt die Moebelkarte unter dem Plan (im Fluss)', bettBlock.includes('data-moebel-karte="block"') && !bettBlock.includes('absolute') && bettBlock.includes('>Schließen</button>') && bettBlock.includes('Möbelseite öffnen'))
  wahr('Ansehen: Kiste wie bisher', block({ art: 'kiste', id: 'k9' }).includes('data-plan-kiste="k9"') && block({ art: 'kiste', id: 'k9' }).includes('Zur Kiste'))
  wahr('Ansehen: nichts angetippt, nichts da', block(null) === '')
  const tuerBlock = block({ art: 'oeffnung', id: 'td' })
  wahr('Ansehen: Tuer unter dem Plan mit Titel, Lichte und X zum Schliessen', tuerBlock.includes('data-plan-blatt="oeffnung"') && tuerBlock.includes('>Tür Kinderzimmer</h2>') && tuerBlock.includes('aria-label="Schließen"') && tuerBlock.includes('data-schnell-mass="innen-lichte"') && !tuerBlock.includes('max-h-[50%]'))

  // Messen: Leiste und Zeichnung.
  const mA = { ...start, modus: 'messen', messung: m1 }
  const mDe = gross(mA)
  const leiste = mDe.match(/<div data-mess-leiste=""[\s\S]*?<\/header>/)?.[0] ?? ''
  wahr('Messen: Schalter auf Messen, Leiste mit A', mDe.includes('data-plan-gross="messen"') && /aria-pressed="true" data-modus="messen"/.test(mDe) && leiste.includes('Tür Kinderzimmer, links') && leiste.includes('Jetzt den zweiten Punkt tippen.') && !leiste.includes('data-mess-zahl'))
  const schnell = [...leiste.matchAll(/data-schnell-mass="([a-z-]+)"[^>]*>([\s\S]*?)<\/span><\/span>/g)].map((x) => `${x[1]}=${x[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()}`)
  wahr('Messen: Schnellmasse in der Leiste (Tuer: frei fuer Moebel und Maueroeffnung)', gleich(schnell, ['innen-durchgang=Frei für Möbel 72 cm', 'innen-lichte=Maueröffnung 80 cm', 'innen-links=links 44 cm', 'innen-rechts=rechts 164 cm', 'gegen-links=links 64 cm', 'gegen-rechts=rechts 44 cm']), JSON.stringify(schnell))
  wahr('Messen: in der Leiste kein Wort "Lichte" bei einer Tuer', !/>Lichte</.test(leiste))
  wahr('Messen: Neu da (44 px), Name fuer Vorleser', /<button aria-label="Neue Messung" title="Neue Messung" data-mess-neu="" class="[^"]*min-h-11/.test(leiste) && leiste.includes('Neu</button>'))
  const marken = Number(mDe.match(/data-mess-marken="(\d+)"/)?.[1] ?? -1)
  wahr('Messen: alle Messpunkte als Marken im Plan', marken === MP.messpunkte(d9).length && marken === 14)
  wahr('Messen: Schnellmasse auch im Plan (5 Linien), A markiert', (mDe.match(/data-schnell-linie=/g) ?? []).length === 5 && mDe.includes('data-mess-punkt="A"') && !mDe.includes('data-mess-punkt="B"'))
  wahr('Messen: keine Karte, kein Blatt', !mDe.includes('data-moebel-karte') && !mDe.includes('data-plan-blatt'))
  const mAB = gross({ ...start, modus: 'messen', messung: m2 })
  wahr('Messen: A und B, Abstand gross in der Leiste und im Plan', mAB.includes(`data-mess-zahl="${Math.round(Math.hypot(388, 44))}"`) && mAB.includes('>Abstand</span>') && mAB.includes('data-mess-b=""') && mAB.includes('>Ecke</span>') && mAB.includes('data-mess-punkt="B"') && (mAB.match(/data-schnell-linie=/g) ?? []).length === 0)
  wahr('Messen: Zahl in der Leiste links nach rechts', /<span dir="ltr" data-mess-zahl="390" class="t-serial[^"]*">390 cm<\/span>/.test(mAB))
  const mLichte = gross({ ...start, modus: 'messen', messung: lichte })
  wahr('Messen: bei einer Tuer Maueroeffnung statt Abstand, dazu frei fuer Moebel', mLichte.includes('data-mess-zahl="80"') && /<span class="text-sm font-bold text-muted">Maueröffnung<\/span>/.test(mLichte) && /data-mess-durchgang="72"[\s\S]*?Frei für Möbel[\s\S]*?72 cm/.test(mLichte) && !/>Lichte</.test(mLichte))
  const mFenster = gross({ ...start, modus: 'messen', messung: fensterLichte })
  wahr('Messen: beim Fenster bleibt es die Lichte, ohne frei fuer Moebel', /<span class="text-sm font-bold text-muted">Lichte<\/span>/.test(mFenster) && !mFenster.includes('data-mess-durchgang'))
  const m88 = gross({ ...start, modus: 'messen', messung: lichte88 }, 'de', { daten: d9t })
  wahr('Messen: Tuer DL 80 zeigt Maueroeffnung 88 und frei 80', m88.includes('data-mess-zahl="88"') && m88.includes('data-mess-durchgang="80"'))
  const mLeer = gross({ ...start, modus: 'messen' })
  wahr('Messen: ohne A der Satz zum Anfangen, kein Neu', mLeer.includes('Tippe auf den ersten Punkt.') && !mLeer.includes('data-mess-neu') && mLeer.includes('data-mess-marken="14"'))

  // PlanBild: fuellen nur in der grossen Ansicht, sonst wie bisher.
  const pb = (mehr) => rendern9(h(PB.PlanBild, { daten: d9, ...mehr }), 'de')
  wahr('PlanBild: ohne fuellen Seitenverhaeltnis, Rahmen, maxHoehe wie bisher', /aspect-ratio:[^;"]+;max-height:68vh/.test(pb({ maxHoehe: '68vh' })) && pb({}).includes('rounded-2xl border border-line'))
  wahr('PlanBild: fuellen ohne Seitenverhaeltnis und Rahmen', !pb({ fuellen: true }).includes('aspect-ratio') && !pb({ fuellen: true }).includes('rounded-2xl'))
  const planBild = lesen('src/components/plan/PlanBild.tsx')
  wahr('PlanBild: onTipp bekommt den Massstab', planBild.includes('onTipp(p, trefferAn(daten, p, px(massstab, 10), ebenen?.kisten !== false), massstab)'))
  wahr('PlanBild: kein Klick nach dem Tipp mit dem Finger, nur in der grossen Ansicht (sonst behielte ein Eingabefeld den Fokus)', planBild.includes('onTouchEnd={fuellen && mitGesten ? (e) => e.cancelable && e.preventDefault() : undefined}'))

  // Adresse: ansicht=gross mit neuem Eintrag im Verlauf, Zurueck schliesst.
  const gr9 = lesen('src/pages/Grundriss.tsx')
  wahr('Grundriss: ansicht=gross aus der Adresse', gr9.includes("const gross = params.get('ansicht') === 'gross'"))
  wahr('Grundriss: Oeffnen schiebt einen Eintrag mit state in den Verlauf (raum, kiste bleiben)', /const q = new URLSearchParams\(params\)\s*q\.set\('ansicht', 'gross'\)\s*setParams\(q, \{ state: GROSS_SELBST \}\)\s*\}/.test(gr9))
  wahr('Grundriss: X geht einen Schritt zurueck, wenn der Eintrag es sagt, sonst nimmt es ansicht heraus', /if \(zuUnterwegs\.current\) return\s*if \(grossSelbstGeoeffnet\(ort\.state\)\) \{\s*zuUnterwegs\.current = true\s*nav\(-1\)\s*return\s*\}\s*const q = new URLSearchParams\(params\)\s*q\.delete\('ansicht'\)\s*setParams\(q, \{ replace: true \}\)/.test(gr9))
  wahr('Grundriss: ein zweites X vor dem Ankommen geht nicht weiter zurueck (bis zur naechsten Adresse)', /useEffect\(\(\) => \{\s*zuUnterwegs\.current = false\s*\}, \[ort\.key\]\)/.test(gr9))
  wahr('Grundriss: kein Merker in der Seite mehr (er war nach Zurueck und Neuladen weg)', !gr9.includes('selbstGeoeffnet'))
  wahr('Gross: state des Eintrags erkannt, Direktlink und fremder state nicht', HM.grossSelbstGeoeffnet(HM.GROSS_SELBST) && !HM.grossSelbstGeoeffnet(null) && !HM.grossSelbstGeoeffnet(undefined) && !HM.grossSelbstGeoeffnet({}) && !HM.grossSelbstGeoeffnet({ grossSelbst: 'ja' }) && !HM.grossSelbstGeoeffnet('gross'))
  {
    // Der Fehlerfall aus der Pruefung mit dem echten Router: Gross ansehen,
    // Moebelseite, Zurueck. Der state bleibt am Eintrag, das X geht zurueck.
    const router = createMemoryRouter([{ path: '*', element: null }], { initialEntries: ['/app/p/p1', '/app/p/p1/grundriss/g9'], initialIndex: 1 })
    await router.navigate('/app/p/p1/grundriss/g9?ansicht=gross', { state: HM.GROSS_SELBST })
    await router.navigate('/app/p/p1/moebel/i-bett')
    await router.navigate(-1)
    const zurueck = router.state.location
    wahr('Verlauf: nach Zurueck von der Moebelseite weiss der Eintrag, dass er selbst geoeffnet ist', zurueck.search === '?ansicht=gross' && HM.grossSelbstGeoeffnet(zurueck.state))
    await router.navigate(-1)
    wahr('Verlauf: das X (ein Schritt zurueck) landet auf dem Grundriss ohne ansicht', router.state.location.pathname === '/app/p/p1/grundriss/g9' && router.state.location.search === '')
    await router.navigate(-1)
    wahr('Verlauf: das naechste Zurueck verlaesst die Seite (kein doppelter Eintrag)', router.state.location.pathname === '/app/p/p1')
    router.dispose()
    const direkt = createMemoryRouter([{ path: '*', element: null }], { initialEntries: ['/app/p/p1/grundriss/g9?ansicht=gross'] })
    wahr('Verlauf: Direktlink ohne state, das X nimmt nur ansicht heraus', !HM.grossSelbstGeoeffnet(direkt.state.location.state))
    direkt.dispose()
  }
  wahr('Grundriss: Ebene nur mit Raeumen, mit Umzug und Weg zur Moebelseite', gr9.includes('{gross && daten.raeume.length > 0 ? (') && gr9.includes('<PlanGross daten={daten} projektId={project.id} hervor={kisteId} raumId={raumId} onZu={grossZu} onSeite={(pfad) => nav(pfad)} />'))
  const pg = lesen('src/components/plan/PlanGross.tsx')
  wahr('PlanGross: Portal an body, Seite rollt nicht, Escape erst Blatt dann Ebene', pg.includes('createPortal(<GrossAnsicht {...props} />, document.body)') && pg.includes("document.body.style.overflow = 'hidden'") && /if \(tippRef\.current\) setZ\(\(v\) => \(\{ \.\.\.v, tipp: null \}\)\)\s*else zuRef\.current\(\)/.test(pg))
  wahr('PlanGross: beim Oeffnen Fokus auf dem X in der Ebene', pg.includes('zuKnopf.current?.focus({ preventScroll: true })') && pg.includes('ref={zuKnopf}'))
  wahr('PlanGross: Seite darunter inert, solange offen, danach wieder frei', pg.includes("root?.setAttribute('inert', '')") && pg.includes("root?.removeAttribute('inert')") && pg.includes("document.getElementById('root')"))
  wahr('PlanGross: Fokus beim Schliessen zurueck, gemerkt vor dem X (Layout-Effekt)', /useLayoutEffect\(\(\) => \{\s*const fokus = document\.activeElement instanceof HTMLElement \? document\.activeElement : null/.test(pg) && pg.includes('if (fokus?.isConnected) fokus.focus({ preventScroll: true })'))
  wahr('Grundriss: unter dem Plan stehen die Schnellmasse einer angetippten Tuer im Plan', gr9.includes("const oeffnungId = tipp?.art === 'oeffnung' ? tipp.id : null") && gr9.includes('zusatz={oeffnungId ? (s) => <SchnellZeichnung daten={daten} oeffnungId={oeffnungId} s={s} /> : undefined}'))
  wahr('PlanGross: jedes Oeffnen beginnt mit GROSS_START (nur offen gerendert)', pg.includes('start = GROSS_START') && pg.includes('useState<GrossZustand>(start)'))

  // Das Handy laedt keinen Zeichner-Code: nur reine Rechnung aus src/zeichner.
  const importe = (datei) => [...lesen(datei).matchAll(/^import (?!type )[\s\S]*?from '([^']+)'/gm)].map((x) => x[1])
  for (const datei of ['src/pages/Grundriss.tsx', 'src/components/plan/PlanGross.tsx', 'src/components/plan/PlanDetails.tsx', 'src/components/plan/handyMessen.ts', 'src/components/plan3d/MoebelKarte.tsx', 'src/components/plan/PlanBild.tsx']) {
    const aus = importe(datei).filter((x) => x.includes('zeichner'))
    wahr(`${datei}: aus dem Zeichner nur messpunkte und typen`, aus.every((x) => /zeichner\/(messpunkte|werkzeuge\/typen)(\.ts)?$/.test(x)), JSON.stringify(aus))
  }
  wahr('Grundriss: der Zeichner nur per lazy import', gr9.includes("const Zeichner = lazy(() => import('../zeichner/Zeichner'))") && !/^import [^\n]*'\.\.\/zeichner\//m.test(gr9))
  for (const datei of ['src/zeichner/messpunkte.ts', 'src/zeichner/werkzeuge/typen.ts']) {
    const txt = lesen(datei)
    const werte = [...txt.matchAll(/^import (?!type )[\s\S]*?from '([^']+)'/gm)].map((x) => x[1])
    wahr(`${datei}: reine Rechnung (kein React, nichts aus dem Zeichner ausser Typen)`, !txt.includes("from 'react'") && werte.every((x) => /lib\/geometrie|components\/plan\/hilfe/.test(x)), JSON.stringify(werte))
  }

  // Woerter der neuen Teile: alle laden immer.
  for (const datei of ['src/components/plan/PlanGross.tsx', 'src/components/plan/PlanDetails.tsx', 'src/components/plan/handyMessen.ts', 'src/zeichner/messpunkte.ts', 'src/pages/Grundriss.tsx']) {
    for (const m of lesen(datei).matchAll(/\bt\(\s*'([a-z_]+\.[a-z0-9_.]+)'/g)) {
      const e = W.WOERTER[m[1]]
      wahr(`${m[1]} (${datei}) laedt immer`, !!e?.de)
    }
  }
  const LANG9 = String.fromCharCode(0x2014)
  for (const datei of ['src/components/plan/PlanGross.tsx', 'src/components/plan/PlanDetails.tsx', 'src/components/plan/handyMessen.ts', 'src/components/plan/PlanBild.tsx', 'src/zeichner/messpunkte.ts', 'src/lib/i18n/bausteine/grundriss.ts']) {
    const txt = lesen(datei)
    wahr(`${datei}: kein U+2014, keine Mail-Adresse, keine Koordinaten`, !txt.includes(LANG9) && !/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(txt) && !/\b(4[6-9]|5[0-5])\.\d{4,}\b/.test(txt))
  }
}

if (fehler) {
  console.log(`${fehler} Abweichung(en)`)
  process.exit(1)
}
console.log('ok')
