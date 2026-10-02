// Prueft die Bedienung beim Begehen und das Gemeinsame von E87 ohne Browser:
//  1. Welche Knoepfe bei welchem Zustand stehen (Moeglich3D, FahrzeugJetzt,
//     Haltung, Ding in der Hand, Handy oder Computer), wann einer aus ist,
//     was er beim Motor ausloest (Sicht und Blaulicht schalten um).
//  2. Tasten am Knopf und der Satz in der Leiste: richtiger Schluessel,
//     de und ar da, die Tasten stehen in beiden Sprachen.
//  3. Lage am Bildschirm aus denselben Zahlen wie das style: Knueppel,
//     Knopfgruppe, Spalte mit Minikarte und Kreuz ueberdecken sich nicht,
//     hochkant 360 x 640, quer 800 x 360 und 640 x 360, auch nicht die
//     Leiste oben im Vollbild, und alles liegt im Bild.
//  4. Der Kanal (src/lib/anwesenheit.ts) mit einem erfundenen Realtime:
//     lenkt geht mit der Stellung hinaus und kommt geprueft herein (kaputt:
//     nur lenkt faellt weg), das Ereignis 'ding' (vor dem Verbinden
//     gemerkt, nur von Anwesenden, nur im eigenen Grundriss, hoechstens 20
//     je Sekunde, kaputt verworfen), dazu die reinen Pruefungen.
//  5. Speichern der Dinge entprellt (400 ms je Ding, die letzte Lage
//     gewinnt, Reihenfolge je Ding, Fehler sichtbar, beim Verlassen sofort)
//     und die Knoepfe der Seite (eigene Wohnung, eingerichtet ansehen).
//     Nachtrag: Aus Datei aktualisieren (Toasts, Fehler bleibt stehen, nur
//     die Umgebung gescheitert: trotzdem gespeichert und neu geladen),
//     der Grund, wenn die Umgebung nicht gebaut wurde, und der Aufzug ohne
//     Zwischenpodeste. Im Vertrag dazu ?begehen=1 im Grundriss.
//  6. Der Vertrag zwischen Seite, Raum3D, Motor und Kanal, die Woerter und
//     dass in den Dateien nichts Persoenliches steht.
// Alle Namen und Zahlen sind erfunden. Aufruf im Projektordner:
//   node scripts/bedienung-pruefen.mjs
// Ausgabe "ok" oder die abweichenden Faelle, Exit 1 bei Fehlern.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
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
let S
let I
let W
let P3
let SW
let API
let IM
try {
  R = await vite.ssrLoadModule('/src/components/plan3d/Raum3D.tsx')
  S = await vite.ssrLoadModule('/src/pages/SiedlungAnsicht.tsx')
  I = await vite.ssrLoadModule('/src/lib/i18n/index.tsx')
  W = await vite.ssrLoadModule('/src/lib/i18n/woerter.ts')
  P3 = await vite.ssrLoadModule('/src/lib/i18n/bausteine/plan3d.ts')
  SW = await vite.ssrLoadModule('/src/lib/i18n/bausteine/siedlung.ts')
  API = await vite.ssrLoadModule('/src/lib/api.ts')
  IM = await vite.ssrLoadModule('/src/lib/siedlungImport.ts')
} finally {
  await vite.close()
}
W.woerterNachladen(P3.plan3dWoerter)
W.woerterNachladen(SW.siedlungWoerter)

// Der Kanal mit einem erfundenen Realtime: supabase.ts wird beim Laden
// durch ein Modul ersetzt, das den Kanal hier nachspielt.
const falsch = falschesSupabase()
globalThis.__falschesSupabase = falsch.supabase
const viteKanal = await createServer({
  cacheDir: path.join(os.tmpdir(), 'kistly-bedienung-pruefen-kanal'),
  server: { middlewareMode: true, hmr: false, ws: false },
  appType: 'custom',
  logLevel: 'error',
  optimizeDeps: { noDiscovery: true, include: [] },
  plugins: [
    {
      name: 'falsches-supabase',
      enforce: 'pre',
      load(id) {
        if (id.replace(/\\/g, '/').endsWith('/src/lib/supabase.ts')) return 'export const configError = null\nexport const supabase = globalThis.__falschesSupabase\n'
        return null
      },
    },
  ],
})
let A
try {
  A = await viteKanal.ssrLoadModule('/src/lib/anwesenheit.ts')
} finally {
  await viteKanal.close()
}

function falschesSupabase() {
  const zustand = { kanal: null }
  const supabase = {
    realtime: { setAuth: async () => {} },
    getChannels: () => [],
    removeChannel: async () => 'ok',
    channel(name, config) {
      const k = {
        topic: `realtime:${name}`,
        name,
        config,
        handler: [],
        gesendet: [],
        anwesend: {},
        rueckruf: null,
        on(art, filter, fn) {
          k.handler.push({ art, event: filter.event, fn })
          return k
        },
        subscribe(fn) {
          k.rueckruf = fn
          return k
        },
        track: async () => 'ok',
        untrack: async () => 'ok',
        presenceState: () => k.anwesend,
        send: async (m) => {
          k.gesendet.push(m)
          return 'ok'
        },
        ausloesen(art, event, daten) {
          for (const h of k.handler) if (h.art === art && h.event === event) h.fn(daten)
        },
      }
      zustand.kanal = k
      return k
    },
  }
  return { supabase, zustand }
}

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
}

/* ------------------------------------------------ 2. Tasten und Saetze */

const T = I.tg
const tAr = (k, v) => {
  const e = W.WOERTER?.[k] ?? P3.plan3dWoerter[k] ?? SW.siedlungWoerter[k]
  return e ? e.ar.replace(/\{(\w+)\}/g, (_, n) => String(v?.[n] ?? '')) : k
}
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
  const beide = (k, teile) => teile.every((x) => w[k].de.includes(x) && w[k].ar.includes(x))
  wahr('Begehen: Leertaste und E im Satz', w['plan3d.begehen_bedienung'].de.includes('Leertaste springt') && beide('plan3d.begehen_bedienung', ['W A S D', 'E', 'Esc']))
  wahr('Fahren: E, V, B, Esc in beiden Sprachen', beide('plan3d.fahren_bedienung', ['E', 'V', 'B', 'Esc', 'W', 'S', 'A', 'D']))
  wahr('Halten: R und Mausrad', beide('plan3d.halten_bedienung', ['R', 'Esc']) && w['plan3d.halten_bedienung'].de.includes('Mausrad'))
  wahr('Handy: Knoepfe genannt', w['plan3d.begehen_bedienung_handy'].de.includes('springen') && w['plan3d.fahren_bedienung_handy'].de.includes('Blaulicht'))
  for (const k of Object.values(R.BEDIEN_NAME)) wahr(`Knopfname ${k} steht in plan3d.ts`, !!w[k])
  for (const k of ['plan3d.sicht_hinten', 'plan3d.aktionen', 'plan3d.knueppel_fahren']) wahr(`${k} steht in plan3d.ts`, !!w[k])
  wahr('Deutsch: Einsteigen', T('plan3d.einsteigen') === 'Einsteigen')
  wahr('Arabisch: Einsteigen', tAr('plan3d.einsteigen') === 'اركب')
}

/* ------------------------------------------------ 3. Lage am Bildschirm */

{
  const B = R.BEDIEN_MASS
  // Alles in rem wie Tailwind; die App hat 18 px je rem (index.css, ab
  // 1024 px Breite 17 px). Die Zahlen passen zum CSS: Knueppel h-32 w-32 =
  // 8 rem, Spalte w-[7.5rem], Kreuz h-6 w-6 = 1,5 rem.
  const css = lesen('src/index.css')
  wahr('index.css: 18 px je rem', /html \{\s*font-size: 18px;/.test(css))
  wahr('Knueppel ist 8 rem (Knueppel.tsx h-32 w-32)', B.knueppel === 8 && /h-32 w-32/.test(lesen('src/components/plan3d/Knueppel.tsx')))
  const raumTxt = lesen('src/components/plan3d/Raum3D.tsx')
  wahr('Spalte am Handy 7,5 rem', B.spalte === 7.5 && raumTxt.includes("quer ? 'w-[7.5rem]'"))
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
  const REM = 18
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
  wahr('wie gemessen: Knueppel', gleich(um(g.knueppel), [18, 650, 162, 794]))
  wahr('wie gemessen: Gruppe', gleich(um(g.knoepfe), [18, 461, 162, 641]))
  wahr('wie gemessen: Kreuz', gleich(um(g.fadenkreuz), [174, 449, 201, 476]))
  wahr('Ueberdecken: Beruehren zaehlt nicht', !R.ueberdecken({ x0: 0, y0: 0, x1: 10, y1: 10 }, { x0: 10, y0: 0, x1: 20, y1: 10 }) && R.ueberdecken({ x0: 0, y0: 0, x1: 10, y1: 10 }, { x0: 9, y0: 9, x1: 20, y1: 20 }))
}

/* ------------------------------------------------ 4. Kanal */

const ICH = '00000000-0000-4000-8000-000000000001'
const ANDERE = '00000000-0000-4000-8000-000000000002'
const FREMD = '00000000-0000-4000-8000-000000000003'
const SIEDLUNG = '00000000-0000-4000-8000-0000000000aa'
const ANDERER_GRUNDRISS = '00000000-0000-4000-8000-0000000000bb'
const pose = (x, y, z, extra = {}) => ({ x, y, z, gier: 0, neigung: 0, haltung: 'stehen', tempo: 0, ...extra })
const ding = (extra = {}) => ({ id: 'ball-1', art: 'ding', x: 1.234, y: 0.5, z: -2.5, gier: 0.75, ebene: 'gelaende', ...extra })

{
  // Reine Pruefungen: Kennung, lenkt, Ding.
  wahr('Kennung: normal', A.textKennung('auto-12') && A.textKennung('w123:ding/4'))
  wahr('Kennung: leer nicht', !A.textKennung(''))
  wahr('Kennung: 120 Zeichen ja, 121 nicht', A.textKennung('x'.repeat(120)) && !A.textKennung('x'.repeat(121)) && A.KENNUNG_MAX === 120)
  wahr('Kennung: Steuerzeichen nicht', !A.textKennung('a\nb') && !A.textKennung('a\u0000'))
  wahr('Kennung: Zahl nicht', !A.textKennung(12))

  const l = { id: 'auto-3', x: 12.345, y: 0.5, z: -7.891, gier: 0.5 }
  const v = A.lenktVerpacken(l)
  wahr('lenkt: Zentimeter und Milliradiant', gleich(v, { i: 'auto-3', x: 1235, y: 50, z: -789, ga: 500 }))
  const zurueck = A.lenktLesen(v)
  wahr('lenkt: hin und zurueck', zurueck.id === 'auto-3' && zurueck.x === 12.35 && zurueck.y === 0.5 && zurueck.z === -7.89 && zurueck.gier === 0.5)
  wahr('lenkt: Winkel gefaltet', Math.abs(A.lenktVerpacken({ ...l, gier: 7 }).ga - Math.round((7 - 2 * Math.PI) * 1000)) <= 1)
  wahr('lenkt: Kommazahlen herein gehen auch (gerundet)', A.lenktLesen({ i: 'a', x: 100.4, y: 0, z: 0, ga: 0.2 }).x === 1)
  for (const [name, roh] of [
    ['null', null],
    ['Liste', [1, 2]],
    ['Kennung leer', { i: '', x: 0, y: 0, z: 0, ga: 0 }],
    ['Kennung zu lang', { i: 'x'.repeat(121), x: 0, y: 0, z: 0, ga: 0 }],
    ['Kennung Zahl', { i: 5, x: 0, y: 0, z: 0, ga: 0 }],
    ['x NaN', { i: 'a', x: NaN, y: 0, z: 0, ga: 0 }],
    ['z unendlich', { i: 'a', x: 0, y: 0, z: Infinity, ga: 0 }],
    ['ga fehlt', { i: 'a', x: 0, y: 0, z: 0 }],
    ['x als Text', { i: 'a', x: '1', y: 0, z: 0, ga: 0 }],
    ['zu weit weg', { i: 'a', x: 6_000_000, y: 0, z: 0, ga: 0 }],
    ['zu hoch', { i: 'a', x: 0, y: 600_000, z: 0, ga: 0 }],
  ]) {
    wahr(`lenkt kaputt (${name}): null`, A.lenktLesen(roh) === null)
  }
  wahr('lenkt: kaputtes geht nicht hinaus', A.lenktVerpacken({ ...l, x: NaN }) === null && A.lenktVerpacken(null) === null && A.lenktVerpacken({ ...l, id: '' }) === null)

  const d = A.dingVerpacken(ding())
  wahr('Ding: verpackt', gleich(d, { i: 'ball-1', a: 'ding', x: 123, y: 50, z: -250, ga: 750, e: 'gelaende' }))
  wahr('Ding: hin und zurueck', gleich(A.dingLesen(d), { id: 'ball-1', art: 'ding', x: 1.23, y: 0.5, z: -2.5, gier: 0.75, ebene: 'gelaende' }))
  wahr('Ding: Fahrzeug', A.dingLesen(A.dingVerpacken(ding({ art: 'fahrzeug', id: 'feuerwehr-1' }))).art === 'fahrzeug')
  wahr('Ding: weitere Felder fallen weg', gleich(Object.keys(A.dingLesen({ ...d, boese: 1, __proto__x: 2 })).sort(), ['art', 'ebene', 'gier', 'id', 'x', 'y', 'z']))
  for (const [name, roh] of [
    ['null', null],
    ['Text', 'ding'],
    ['Liste', [d]],
    ['Art falsch', { ...d, a: 'auto' }],
    ['Ebene fehlt', { ...d, e: undefined }],
    ['Ebene zu lang', { ...d, e: 'e'.repeat(121) }],
    ['Kennung zu lang', { ...d, i: 'x'.repeat(121) }],
    ['x NaN', { ...d, x: NaN }],
    ['y Text', { ...d, y: '0' }],
    ['ga unendlich', { ...d, ga: -Infinity }],
    ['zu weit weg', { ...d, z: -5_000_001 }],
  ]) {
    wahr(`Ding kaputt (${name}): null`, A.dingLesen(roh) === null)
  }
  wahr('Ding: kaputtes geht nicht hinaus', A.dingVerpacken(ding({ x: Infinity })) === null && A.dingVerpacken(ding({ ebene: '' })) === null && A.dingVerpacken(ding({ art: 'x' })) === null)
}

{
  // Der Kanal mit dem erfundenen Realtime.
  const posen = []
  const dinge = []
  const meldungen = []
  const warnungen = []
  const warnAlt = console.warn
  console.warn = (...x) => warnungen.push(x.join(' '))
  const v = A.wohnungBeitreten({
    projectId: SIEDLUNG,
    grundrissId: SIEDLUNG,
    uid: ICH,
    kanal: `siedlung:${SIEDLUNG}`,
    onWer: () => {},
    onPose: (u, p) => posen.push([u, p]),
    onSignal: () => {},
    onFehler: (t) => meldungen.push(t),
    onDing: (u, l) => dinge.push([u, l]),
  })
  // Vor dem Verbinden: gemerkt, je Ding die letzte Lage.
  v.ding(ding({ x: 1 }))
  v.ding(ding({ x: 2 }))
  v.ding(ding({ id: 'eimer-2', x: 3 }))
  v.ding(ding({ x: NaN }))
  await warten()
  const k = falsch.zustand.kanal
  wahr('Kanal: privat, Siedlung', k && k.name === `siedlung:${SIEDLUNG}` && k.config.config.private === true)
  wahr('Kanal: hoert auf ding', k.handler.some((x) => x.art === 'broadcast' && x.event === 'ding'))
  wahr('vor dem Verbinden nichts gesendet', k.gesendet.length === 0)
  wahr('kaputtes Ding nicht gesendet, Hinweis', warnungen.some((w) => w.includes('Ding mit falschem Aufbau nicht gesendet')))
  k.rueckruf('SUBSCRIBED')
  await warten()
  const dingeHinaus = k.gesendet.filter((m) => m.event === 'ding')
  wahr('nach dem Verbinden: zwei Dinge, je das letzte', dingeHinaus.length === 2 && dingeHinaus[0].payload.d.x === 200 && dingeHinaus[1].payload.d.i === 'eimer-2')
  wahr('Ding hinaus mit Absender und Grundriss', dingeHinaus[0].payload.u === ICH && dingeHinaus[0].payload.g === SIEDLUNG && dingeHinaus[0].type === 'broadcast')
  v.ding(ding({ x: 5 }))
  await warten()
  wahr('verbunden: Ding gleich hinaus', k.gesendet.filter((m) => m.event === 'ding').length === 3)

  // Stellung mit Fahrzeug hinaus.
  v.pose(pose(1, 1.64, 2, { lenkt: { id: 'auto-3', x: 1, y: 0, z: 2, gier: 0.5 } }))
  await warten()
  const pHinaus = k.gesendet.filter((m) => m.event === 'pose')
  wahr('Stellung mit lenkt hinaus', pHinaus.length === 1 && gleich(pHinaus[0].payload.l, { i: 'auto-3', x: 100, y: 0, z: 200, ga: 500 }))

  // Herein: nur von Anwesenden.
  const fremdePose = (u, n, extra = {}) => ({ u, n, g: SIEDLUNG, x: 100, y: 164, z: 200, ga: 0, ne: 0, h: 0, t: 0, ...extra })
  k.ausloesen('broadcast', 'pose', { payload: fremdePose(ANDERE, 1) })
  wahr('Stellung von Unbekannt verworfen', posen.length === 0)
  k.anwesend = { [ANDERE]: [{ g: SIEDLUNG }], [ICH]: [{ g: SIEDLUNG }] }
  k.ausloesen('presence', 'sync', {})
  k.ausloesen('broadcast', 'pose', { payload: fremdePose(ANDERE, 2, { l: { i: 'feuerwehr-1', x: 1000, y: 0, z: -500, ga: 1570 } }) })
  wahr('Stellung mit heilem lenkt', posen.length === 1 && gleich(posen[0][1].lenkt, { id: 'feuerwehr-1', x: 10, y: 0, z: -5, gier: 1.57 }))
  k.ausloesen('broadcast', 'pose', { payload: fremdePose(ANDERE, 3, { l: { i: 'x'.repeat(121), x: 0, y: 0, z: 0, ga: 0 } }) })
  wahr('Stellung mit kaputtem lenkt: Stellung gilt, lenkt faellt weg', posen.length === 2 && posen[1][1].lenkt === undefined && posen[1][1].x === 1)
  wahr('kaputtes lenkt: Hinweis in der Konsole', warnungen.some((w) => w.includes('Fahrzeug einer Stellung mit falschem Aufbau')))
  k.ausloesen('broadcast', 'pose', { payload: fremdePose(ANDERE, 4, { l: null }) })
  wahr('Stellung ohne lenkt: zu Fuss', posen.length === 3 && !('lenkt' in posen[2][1]))

  // Dinge herein.
  const hinein = (payload) => k.ausloesen('broadcast', 'ding', { payload })
  const dGut = A.dingVerpacken(ding({ id: 'roller-7', x: 4 }))
  hinein({ u: ANDERE, g: SIEDLUNG, d: dGut })
  wahr('Ding von Anwesenden: angenommen', dinge.length === 1 && dinge[0][0] === ANDERE && dinge[0][1].id === 'roller-7' && dinge[0][1].x === 4)
  hinein({ u: FREMD, g: SIEDLUNG, d: dGut })
  wahr('Ding von Unbekannt: verworfen', dinge.length === 1)
  hinein({ u: ICH, g: SIEDLUNG, d: dGut })
  wahr('eigenes Ding: verworfen', dinge.length === 1)
  hinein({ u: ANDERE, g: ANDERER_GRUNDRISS, d: dGut })
  wahr('Ding aus anderem Grundriss: verworfen', dinge.length === 1)
  hinein({ u: ANDERE, g: SIEDLUNG, d: { ...dGut, x: NaN } })
  hinein({ u: ANDERE, g: SIEDLUNG, d: { ...dGut, a: 'rakete' } })
  hinein({ u: 'kein-uuid', g: SIEDLUNG, d: dGut })
  hinein(null)
  hinein([1, 2])
  wahr('kaputte Dinge: verworfen, Hinweis', dinge.length === 1 && warnungen.some((w) => w.includes('Ding mit falschem Aufbau verworfen')))
  for (let i = 0; i < 30; i++) hinein({ u: ANDERE, g: SIEDLUNG, d: A.dingVerpacken(ding({ id: `d${i}` })) })
  wahr(`hoechstens 20 Dinge je Sekunde und Absender (angenommen ${dinge.length - 1})`, dinge.length - 1 === 19 && warnungen.some((w) => w.includes('zu viele Dinge')))
  wahr('kein Fehler fuer den Nutzer', meldungen.length === 0)
  v.verlassen()
  v.ding(ding({ x: 9 }))
  wahr('nach dem Verlassen: nichts mehr', k.gesendet.filter((m) => m.event === 'ding').length === 3)
  console.warn = warnAlt
}

/* ------------------------------------------------ 5. Speichern, Seite */

function falscheUhr() {
  let jetzt = 0
  let n = 0
  const auftraege = new Map()
  return {
    setTimeout(f, ms) {
      n += 1
      auftraege.set(n, { f, bei: jetzt + ms })
      return n
    },
    clearTimeout(h) {
      auftraege.delete(h)
    },
    async weiter(ms) {
      jetzt += ms
      for (const [h, a] of [...auftraege]) {
        if (a.bei <= jetzt) {
          auftraege.delete(h)
          a.f()
        }
      }
      for (let i = 0; i < 5; i++) await warten()
    },
    offen: () => auftraege.size,
  }
}

{
  wahr('Speichern: 400 ms Ruhe', S.DING_SPEICHERN_MS === 400)
  const gespeichert = []
  const meldungen = []
  const uhr = falscheUhr()
  const sp = S.dingSpeicherer(
    async (l) => {
      gespeichert.push(`${l.id}:${l.x}`)
    },
    (m) => meldungen.push(m),
    400,
    uhr,
  )
  sp.setzen(ding({ x: 1 }))
  await uhr.weiter(200)
  sp.setzen(ding({ x: 2 }))
  await uhr.weiter(399)
  wahr('Entprellen: vor 400 ms Ruhe nichts', gespeichert.length === 0 && sp.wartend() === 1)
  await uhr.weiter(1)
  wahr('Entprellen: dann nur die letzte Lage', gleich(gespeichert, ['ball-1:2']) && gleich(meldungen, [null]))
  sp.setzen(ding({ id: 'a', x: 1 }))
  sp.setzen(ding({ id: 'b', x: 1 }))
  await uhr.weiter(400)
  wahr('Entprellen: je Ding eigens', gespeichert.length === 3 && gespeichert.includes('a:1') && gespeichert.includes('b:1'))
  sp.setzen(ding({ id: 'c', x: 7 }))
  sp.beenden()
  for (let i = 0; i < 5; i++) await warten()
  wahr('Beenden: Wartendes sofort gespeichert', gespeichert.includes('c:7') && sp.wartend() === 0 && uhr.offen() === 0)
  const vorher = meldungen.length
  sp.setzen(ding({ id: 'd', x: 1 }))
  await uhr.weiter(1000)
  wahr('Beenden: danach nichts mehr, keine Meldung', !gespeichert.includes('d:1') && meldungen.length === vorher)
}
{
  // Fehler: sichtbar gemeldet und in der Konsole; danach wieder gut.
  const warnungen = []
  const warnAlt = console.warn
  console.warn = (...x) => warnungen.push(x.join(' '))
  const meldungen = []
  const uhr = falscheUhr()
  let kaputt = true
  const sp = S.dingSpeicherer(
    async () => {
      if (kaputt) throw new Error('Netz weg')
    },
    (m) => meldungen.push(m),
    400,
    uhr,
  )
  sp.setzen(ding())
  await uhr.weiter(400)
  wahr('Fehler: gemeldet mit Grund', gleich(meldungen, ['Netz weg']) && warnungen.some((w) => w.includes('Netz weg')))
  kaputt = false
  sp.setzen(ding({ x: 3 }))
  await uhr.weiter(400)
  wahr('Fehler: nach gelungenem Speichern weg', meldungen[meldungen.length - 1] === null)
  console.warn = warnAlt
}
{
  // Reihenfolge je Ding: das zweite Speichern wartet auf das erste.
  const log = []
  const uhr = falscheUhr()
  let freigeben = null
  const sp = S.dingSpeicherer(
    (l) =>
      new Promise((ok) => {
        log.push(`start ${l.x}`)
        if (l.x === 1) {
          freigeben = () => {
            log.push('ende 1')
            ok()
          }
        } else {
          log.push(`ende ${l.x}`)
          ok()
        }
      }),
    () => {},
    400,
    uhr,
  )
  sp.setzen(ding({ x: 1 }))
  await uhr.weiter(400)
  sp.setzen(ding({ x: 2 }))
  await uhr.weiter(400)
  wahr('Reihenfolge: zweites wartet', gleich(log, ['start 1']))
  freigeben()
  for (let i = 0; i < 5; i++) await warten()
  wahr('Reihenfolge: dann das zweite', gleich(log, ['start 1', 'ende 1', 'start 2', 'ende 2']))
  sp.beenden()
}
{
  const ziele = [
    { name: 'Start', ebene: 0, x: 0, z: 0, gier: 0 },
    { name: 'Top 1', ebene: 1, x: 5, z: 6, gier: 0 },
    { name: 'Top 2', ebene: 2, x: 5, z: 6, gier: 0 },
  ]
  wahr('eigene Wohnung: Nummer', S.eigeneWohnungIndex({ eigeneWohnung: 2 }, ziele) === 2)
  wahr('eigene Wohnung: Nummer ausserhalb', S.eigeneWohnungIndex({ eigeneWohnung: 3 }, ziele) === null && S.eigeneWohnungIndex({ eigeneWohnung: -1 }, ziele) === null && S.eigeneWohnungIndex({ eigeneWohnung: 1.5 }, ziele) === null)
  wahr('eigene Wohnung: das Ziel selbst', S.eigeneWohnungIndex({ eigeneWohnung: ziele[1] }, ziele) === 1)
  wahr('eigene Wohnung: gleiches Ziel', S.eigeneWohnungIndex({ eigeneWohnung: { ebene: 2, x: 5, z: 6 } }, ziele) === 2)
  wahr('eigene Wohnung: als Rueckgabe', S.eigeneWohnungIndex({ eigeneWohnung: () => 1 }, ziele) === 1)
  wahr('eigene Wohnung: fehlt oder null', S.eigeneWohnungIndex({}, ziele) === null && S.eigeneWohnungIndex({ eigeneWohnung: null }, ziele) === null && S.eigeneWohnungIndex(null, ziele) === null)
  const warnAlt = console.warn
  const warnungen = []
  console.warn = (...x) => warnungen.push(x.join(' '))
  wahr('eigene Wohnung: Fehler der Welt sichtbar', S.eigeneWohnungIndex({ eigeneWohnung: () => { throw new Error('kaputt') } }, ziele) === null && warnungen.length === 1)
  console.warn = warnAlt
  wahr('eingerichtet: Grundriss im Umzug', S.eingerichtetPfad('00000000-0000-4000-8000-0000000000cc', '00000000-0000-4000-8000-0000000000dd') === '/app/p/00000000-0000-4000-8000-0000000000cc/grundriss/00000000-0000-4000-8000-0000000000dd?begehen=1')
  wahr('eingerichtet: Kennungen verpackt', S.eingerichtetPfad('a/b', 'c?d').includes('a%2Fb') && S.eingerichtetPfad('a/b', 'c?d').includes('c%3Fd'))
}
{
  // E87, Nachtrag: Aus Datei aktualisieren. Toasts wie beim ersten Laden,
  // ein Fehler bleibt als Zeile stehen, scheitert nur die Umgebung, ist die
  // Siedlung trotzdem gespeichert und wird neu geladen.
  const t = (k, v) => I.tg(k, v)
  const SID = '00000000-0000-4000-8000-0000000000aa'
  const NEU = '00000000-0000-4000-8000-0000000000ab'
  const datei = { siedlung: { name: 'Zuhause' }, deko: null }
  const lesenOk = () => datei
  const warnAlt = console.warn
  const warnungen = []
  console.warn = (...x) => warnungen.push(x.join(' '))
  const arten = (r) => r.toasts.map((x) => x.art)
  const r1 = await S.ausDateiAktualisieren('{}', SID, t, lesenOk, async (d) => {
    wahr('Aus Datei: gelesener Inhalt geht an importieren', d === datei)
    return { siedlung: { id: SID }, deko: 'keine' }
  })
  wahr('Aus Datei: gleiche Siedlung, aktualisiert, neu laden', r1.id === SID && r1.fehler === null && gleich(arten(r1), ['ok']) && r1.toasts[0].text === 'Siedlung aktualisiert')
  const r2 = await S.ausDateiAktualisieren('{}', SID, t, lesenOk, async () => ({ siedlung: { id: SID }, deko: 'ok' }))
  wahr('Aus Datei: Deko ok', gleich(arten(r2), ['ok', 'ok']) && r2.toasts[1].text.includes('Deko'))
  const r3 = await S.ausDateiAktualisieren('{}', SID, t, lesenOk, async () => ({ siedlung: { id: SID }, deko: { fehler: 'Plan fehlt' } }))
  wahr('Aus Datei: Deko-Fehler sichtbar, Siedlung trotzdem da', r3.id === SID && gleich(arten(r3), ['ok', 'error']) && r3.toasts[1].text.includes('Plan fehlt'))
  const r4 = await S.ausDateiAktualisieren('{}', SID, t, lesenOk, async () => ({ siedlung: { id: NEU }, deko: 'keine' }))
  wahr('Aus Datei: andere Wohnung, neue Siedlung (dorthin)', r4.id === NEU && r4.toasts[0].text === 'Siedlung eingetragen')
  const stadt = new API.SiedlungStadtFehler(I.tg('fehler.siedlung_stadt', { grund: 'zu gross.' }), { id: SID })
  const r5 = await S.ausDateiAktualisieren('{}', SID, t, lesenOk, async () => {
    throw stadt
  })
  wahr('Aus Datei: nur die Umgebung scheitert, gespeichert und neu laden', r5.id === SID && r5.fehler === stadt.message && gleich(arten(r5), ['error']) && r5.fehler.includes('gespeichert'))
  const r6 = await S.ausDateiAktualisieren('kein json', SID, t, IM.siedlungDateiLesen, async () => {
    throw new Error('darf nicht gerufen werden')
  })
  wahr('Aus Datei: kaputte Datei, nichts gespeichert, Grund da', r6.id === null && r6.fehler.includes('keine JSON-Datei') && gleich(arten(r6), ['error']))
  const r7 = await S.ausDateiAktualisieren('{}', SID, t, lesenOk, async () => {
    throw new Error('Netz weg')
  })
  wahr('Aus Datei: Netz weg, sichtbar', r7.id === null && r7.fehler === 'Netz weg')
  console.warn = warnAlt
  wahr('Aus Datei: Fehler auch in der Konsole', warnungen.length === 3)
  const ar = await S.ausDateiAktualisieren('{}', SID, (k, v) => I.uebersetzen('ar', k, v), lesenOk, async () => ({ siedlung: { id: SID }, deko: 'keine' }))
  wahr('Aus Datei: arabisch', ar.toasts[0].text === 'تم تحديث المجمّع السكني')

  // Die Umgebung (Stadt) liess sich nicht bauen: der Grund aus der Welt.
  wahr('Umgebung: Grund aus der Welt', S.stadtFehlerVon({ stadtFehler: 'Stadt kaputt' }) === 'Stadt kaputt')
  wahr('Umgebung: sonst null', S.stadtFehlerVon({ stadtFehler: null }) === null && S.stadtFehlerVon({}) === null && S.stadtFehlerVon(null) === null && S.stadtFehlerVon({ stadtFehler: '  ' }) === null && S.stadtFehlerVon({ stadtFehler: 3 }) === null)

  // Aufzug: Zwischenpodeste sind keine Stockwerke zum Waehlen.
  const eb = [
    { id: 'boden', name: 'EG', y: 0 },
    { id: 'h1:1', name: 'Haus A 1. OG', y: 3 },
    { id: 'h1:0.5', name: 'Zwischenpodest EG', y: 1.5 },
    { id: 'h1:2', name: 'Haus A 2. OG', y: 6 },
    { id: 'h1:1.5', name: 'Zwischenpodest 1. OG', y: 4.5 },
    { id: 'stadt:x:0', name: 'Laden EG', y: 0.2 },
  ]
  const w = R.ebenenZumWaehlen(eb)
  wahr('Aufzug: ohne Zwischenpodeste', w.length === 4 && !w.some((e) => e.name.includes('Zwischenpodest')))
  wahr('Aufzug: oben die hoechste, Nummern bleiben', gleich(w.map((e) => e.i), [3, 1, 5, 0]))
  wahr('Podest erkannt', R.istPodest('h1:0.5') && R.istPodest('stadt:x:2.5') && !R.istPodest('h1:5') && !R.istPodest('h1:15') && !R.istPodest('boden'))
}

/* ------------------------------------------------ 6. Vertrag, Woerter */

{
  const raum = lesen('src/components/plan3d/Raum3D.tsx')
  const motor = lesen('src/components/plan3d/motor.ts')
  for (const m of ['hupfen', 'einsteigen', 'aussteigen', 'fahrSicht', 'blaulicht', 'fahrzeug', 'moeglich', 'drehen', 'hinstellen', 'lage', 'bewegt']) {
    wahr(`Motor kennt ${m}`, new RegExp(`\\n  ${m}\\(`).test(motor))
  }
  wahr('Raum3D: moeglich und fahrzeug angemeldet und abgemeldet', raum.includes('m.moeglich((x) =>') && raum.includes('m.fahrzeug((f) =>') && raum.includes('m.moeglich(null)') && raum.includes('m.fahrzeug(null)'))
  wahr('Raum3D: bewegt angemeldet und abgemeldet', raum.includes('m.bewegt((l) => {') && raum.includes('return () => m.bewegt(null)'))
  wahr('Raum3D: bewegt geht an Kanal und Seite', /m\.bewegt\(\(l\) => \{[\s\S]*?dingSenden\.current\?\.\(l\)[\s\S]*?dingRueck\.current\?\.\(l\)/.test(raum))
  wahr('Raum3D: Ankommendes setzt lage', /onDing: \(_von, l\) => \{[\s\S]*?motor\.current\?\.lage\(l\)/.test(raum))
  wahr('Raum3D: nach dem Neubau alle Lagen wieder', raum.includes('for (const l of lagen.current.values()) m.lage(l)'))
  wahr('Raum3D: Bewegtes gilt vor dingLagen', /for \(const l of dingLagen\) \{\s*if \(frisch\.current\.has\(l\.id\)\) continue/.test(raum))
  wahr('Raum3D: Esc beim Fahren steigt zuerst aus', /if \(z\.karte\) setKarte\(null\)\s*else if \(z\.gehen && z\.faehrt\) motor\.current\?\.aussteigen\(\)\s*else if \(z\.gehen && z\.haltung !== 'stehen'\)/.test(raum))
  wahr('Raum3D: Knoepfe ueber knopfAusfuehren', raum.includes('if (m) knopfAusfuehren(k, m, fahrt)'))
  wahr('Raum3D: Tasten liest der Motor, hier nur Esc', !/KeyE|KeyV|KeyB|KeyR|'Space'|e\.key === ' '/.test(raum))
  wahr('Raum3D: Knoepfe aus BEDIEN_MASS', raum.includes('style={knopfGruppeStil(quer)}') && raum.includes('const KNOPF_STIL: CSSProperties = { width: `${BEDIEN_MASS.knopfB}rem`, height: `${BEDIEN_MASS.knopfH}rem` }') && raum.split('style={KNOPF_STIL}').length === 3)
  wahr('Raum3D: Kreuz nur am Handy mit Ding', raum.includes('{beruehren && haelt ? (') && raum.includes('data-fadenkreuz'))
  wahr('Raum3D: Geschwindigkeit nicht im Zustand von Raum3D', raum.includes('for (const h of kmhHoerer.current) h(f.kmh)') && !/setFahrt\([^)]*kmh/.test(raum))
  wahr('Raum3D: neue Angaben', /dingLagen\?: readonly DingLage3D\[\] \| null/.test(raum) && /onDingBewegt\?: \(l: DingLage3D\) => void/.test(raum) && /seitenFehler\?: string \| null/.test(raum))
  wahr('Raum3D: Fehler der Seite als Hinweis', raum.includes('{seitenFehler}') && raum.includes('role="alert"'))
  // Hinweise und Fehler oben unter dem Stockwerk: die Spalte rechts bleibt
  // so hoch wie Minikarte und Mikrofon (die Zahl oben in Abschnitt 3).
  const spalteAb = raum.indexOf('data-spalte="">')
  wahr('Raum3D: in der Spalte nur Minikarte und Mikrofon', spalteAb > 0 && raum.slice(spalteAb, spalteAb + 80).includes('{minikarte}'))
  wahr('Raum3D: Hinweise oben in der Mitte', /data-hinweise=""[\s\S]*?\{hinweise\}/.test(raum) && raum.includes("key=\"seite\"") && raum.includes("key=\"welt\""))
  wahr('Raum3D: Luecken lassen Finger durch', (raum.match(/pointer-events-none absolute[^"]*\*:pointer-events-auto/g) ?? []).length === 4)
  wahr('Raum3D: Neue im Kanal bekommen eigene Dinge', raum.includes('if (hier.some((u) => !bekannt.has(u))) dingeNachreichen()'))

  const seite = lesen('src/pages/SiedlungAnsicht.tsx')
  wahr('Seite: Abfragen aus api.ts', /import \{[^}]*grundrissDarf[^}]*siedlungDinge[^}]*siedlungDingSetzen[^}]*\} from '\.\.\/lib\/api'/.test(seite))
  wahr('Seite: Angaben an Ansicht3D', /<Ansicht3D[\s\S]*?dingLagen=\{dingLagen\}[\s\S]*?onDingBewegt=\{dingBewegt\}[\s\S]*?seitenFehler=\{seitenFehler\}/.test(seite))
  wahr('Seite: Dinge erst mit gebauter Welt', seite.includes('if (!siedlungId || !weltGebaut || dingeGeladen.current === siedlungId) return'))
  wahr('Seite: Ohne grundrissDarf nur kein Knopf (console.info)', /grundrissDarf\(gid\)\.then\([\s\S]*?console\.info\(/.test(seite))
  wahr('Seite: Zu unserer Wohnung springt', seite.includes('onClick={() => steuer.current?.springen(unsere)}') && seite.includes('const unsere = besitzer &&'))
  wahr('Seite: Orte statt Wohnungen', seite.includes("t('siedlung.orte')") && !seite.includes("t('siedlung.wohnungen')"))
  wahr('Seite: Speichern beim Verlassen', /return \(\) => \{\s*sp\.beenden\(\)/.test(seite))
  wahr('Seite: Raum3D nur als Typ', !/^import (?!type)[^\n]* from '\.\.\/components\/plan3d\/Raum3D'/m.test(seite))
  // E87, Nachtrag: Aus Datei, Umgebung, ?begehen=1, Aufzug.
  wahr('Seite: Aus Datei nur fuer den Besitzer', /\{besitzer \? \(\s*<Button[\s\S]*?siedlung\.aus_datei/.test(seite) && /\{besitzer \? \(\s*<input[\s\S]*?type="file"/.test(seite))
  wahr('Seite: Aus Datei mit Ladezustand und ueber ausDateiAktualisieren', seite.includes('loading={ausDateiLaeuft}') && seite.includes('await ausDateiAktualisieren(text, sid, t, siedlungDateiLesen, siedlungImportieren)'))
  wahr('Seite: Aus Datei laedt neu, die alte Welt bleibt so lange', seite.includes('else zustand.reload()') && seite.includes('const ladeAnzeige = zustand.loading && !neuLaden') && seite.includes('{ladeAnzeige ? ('))
  wahr('Seite: Fehler bleibt als Zeile stehen', /\{ausDateiFehler \? \([\s\S]*?role="alert"/.test(seite))
  wahr('Seite: Umgebung-Hinweis mit Grund', seite.includes('data-stadt-fehler=""') && seite.includes("t('siedlung.umgebung_fehler')") && seite.includes("title={t('siedlung.umgebung_fehler_grund', { grund: stadtFehler })}"))
  wahr('Raum3D: startGehen einmal, sobald 3D laeuft', /startGehen\?: boolean/.test(raum) && raum.includes("if (!startGehen || startGegangen.current || geht !== 'ja' || (leer && !eigeneWelt)) return") && raum.includes('startGegangen.current = true'))
  wahr('Raum3D: Aufzug ohne Zwischenpodeste', raum.includes('const liste = ebenenZumWaehlen(w.ebenen)'))
  const oeffnen = lesen('src/components/plan3d/oeffnen.tsx')
  wahr('Knopf3D: begehen oeffnet gleich und geht, nur beim ersten Oeffnen', oeffnen.includes('const [offen, setOffen] = useState(begehen)') && oeffnen.includes('startGehen={startGehen}') && oeffnen.includes('useWunschAngenommen(begehen, onBegehen)') && /const zu = \(\) => \{\s*setOffen\(false\)\s*setStartGehen\(false\)/.test(oeffnen))
  const gr = lesen('src/pages/Grundriss.tsx')
  wahr('Grundriss: ?begehen=1 gelesen und aus der Adresse genommen', gr.includes("params.get('begehen') === '1' ? gid : null") && gr.includes("ohne.delete('begehen')") && gr.includes('setParams(ohne, { replace: true })'))
  wahr('Grundriss: an Ansehen und Zeichner, vergessen wenn angenommen', /<Ansehen[^>]*begehen=\{begehen\} onBegehen=\{begehenAngenommen\}/.test(gr) && /<Zeichner[\s\S]*?begehen=\{begehen\}\s*onBegehen=\{begehenAngenommen\}/.test(gr) && gr.includes('const begehenAngenommen = useCallback(() => setBegehenFuer(null), [])'))
  const zeichner = lesen('src/zeichner/Zeichner.tsx')
  wahr('Zeichner: 3D gleich an, Begehen nur beim ersten 3D', zeichner.includes('const [drei, setDrei] = useState(begehen)') && zeichner.includes('startGehen={dreiGehen}') && zeichner.includes('onSchliessen={dreiAus}'))

  const anw = lesen('src/lib/anwesenheit.ts')
  wahr('anwesenheit: ding im Vertrag', /ding\(l: DingLage3D\): void/.test(anw) && /onDing\?\(uid: string, l: DingLage3D\): void/.test(anw))
  wahr('anwesenheit: Takt fuer Dinge', anw.includes('DINGE_JE_SEKUNDE = 20') && anw.includes('imTakt(dingTakt, von, DINGE_JE_SEKUNDE)'))

  // Woerter: jeder Schluessel der Dateien von E87 steht da, mit de und ar
  // und denselben Platzhaltern.
  const alle = { ...P3.plan3dWoerter, ...SW.siedlungWoerter }
  const platz = (x) => [...x.matchAll(/\{(\w+)\}/g)].map((y) => y[1]).sort().join(',')
  for (const datei of ['src/components/plan3d/Raum3D.tsx', 'src/components/plan3d/Minikarte.tsx', 'src/pages/SiedlungAnsicht.tsx']) {
    for (const m of lesen(datei).matchAll(/'((?:plan3d|siedlung)\.[a-z0-9_.]+)'/g)) {
      const e = alle[m[1]]
      wahr(`${m[1]} (${datei}) steht im Woerterbuch`, !!e)
      if (e) wahr(`${m[1]}: de und ar mit denselben Platzhaltern`, !!e.de && !!e.ar && platz(e.de) === platz(e.ar))
    }
  }
  // Raum3D laedt mit oeffnen.tsx nur plan3d.ts: neue Knoepfe dort, nicht in siedlung.ts.
  for (const k of Object.values(R.BEDIEN_NAME)) wahr(`${k} in plan3d.ts (laedt mit 3D)`, k.startsWith('plan3d.'))

  const LANGER_STRICH = String.fromCharCode(0x2014)
  for (const datei of ['scripts/bedienung-pruefen.mjs', 'src/components/plan3d/Raum3D.tsx', 'src/lib/anwesenheit.ts', 'src/pages/SiedlungAnsicht.tsx', 'src/lib/i18n/bausteine/plan3d.ts', 'src/lib/i18n/bausteine/siedlung.ts', 'src/components/plan3d/oeffnen.tsx', 'src/pages/Grundriss.tsx', 'scripts/siedlung-wohnungen-pruefen.mjs']) {
    const txt = lesen(datei)
    wahr(`${datei}: kein U+2014`, !txt.includes(LANGER_STRICH))
    wahr(`${datei}: keine Mail-Adresse`, !/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(txt))
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
