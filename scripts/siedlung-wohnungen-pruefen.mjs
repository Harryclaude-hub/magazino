// Prueft die Liste der Wohnungen der Siedlung (E84) ohne Browser:
//  1. Der Inhalt der Liste (WohnungenListe in src/pages/SiedlungAnsicht.tsx)
//     als HTML: ohne Ziele ein Hinweis, ohne Treffer ein anderer, sonst
//     Gruppen in der gegebenen Reihenfolge, eine Ueberschrift je Wechsel
//     der Ebene (mit ihrem Namen, unbekannte Ebene ohne), die Nummer jedes
//     Ziels bleibt die in der ganzen Liste, die Suche verlangt jedes Wort
//     im Namen (gross oder klein egal). Auf Deutsch und auf Arabisch.
//  2. Der Vertrag zwischen Seite und Raum3D: steuer.springen, onSprungziele,
//     erst begehen, dann springen; der Name oben kommt aus den Daten.
// Alle Namen sind erfunden. Aufruf im Projektordner:
//   node scripts/siedlung-wohnungen-pruefen.mjs
// Ausgabe "ok" oder die abweichenden Faelle, Exit 1 bei Fehlern.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

let fehler = 0
function wahr(name, ist) {
  if (!ist) {
    console.log('ABWEICHUNG', name, 'ist nicht wahr')
    fehler++
  }
}
const lesen = (p) => fs.readFileSync(p, 'utf8')

// Eigener Zwischenspeicher im Temp-Ordner, wie siedlung-ui-pruefen.
const vite = await createServer({
  cacheDir: path.join(os.tmpdir(), 'kistly-siedlung-wohnungen-pruefen'),
  server: { middlewareMode: true, hmr: false, ws: false },
  appType: 'custom',
  logLevel: 'error',
  optimizeDeps: { noDiscovery: true, include: [] },
})
let S
let I
try {
  S = await vite.ssrLoadModule('/src/pages/SiedlungAnsicht.tsx')
  I = await vite.ssrLoadModule('/src/lib/i18n/index.tsx')
} finally {
  await vite.close()
}

/* ------------------------------------------------------------ 1. Liste */

/** Rendert die Liste in einer Sprache (die Sprache liest der Provider
 *  aus dem Speicher, hier vorgetaeuscht). */
function liste(ziele, ebenen, suche, sprache = 'de') {
  globalThis.localStorage = { getItem: () => sprache, setItem: () => {}, removeItem: () => {} }
  try {
    return renderToStaticMarkup(
      createElement(I.SpracheProvider, null, createElement(S.WohnungenListe, { ziele, ebenen, suche, onWahl: () => {} })),
    )
  } finally {
    delete globalThis.localStorage
  }
}
const nummern = (html) => [...html.matchAll(/data-ziel="(\d+)"/g)].map((m) => Number(m[1]))
const ueberschriften = (html) => [...html.matchAll(/<h3[^>]*>([^<]*)<\/h3>/g)].map((m) => m[1])
const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b)

const ebenen = ['Haus Nord, EG', 'Haus Nord, 1. OG', 'Haus Sued, EG']
const ziel = (name, ebene) => ({ name, ebene, x: 1.5, z: -2.25, gier: 0 })
const ziele = [
  ziel('Haus Nord Top 1', 0),
  ziel('Haus Nord Top 2', 0),
  ziel('Haus Nord Top 3', 1),
  ziel('Haus Sued Top 4', 2),
  ziel('Eingang West', 7),
]

{
  const html = liste([], ebenen, '')
  wahr('leer: Hinweis', html.includes('In dieser Siedlung gibt es noch keine Wohnungen zum Hingehen.'))
  wahr('leer: kein Knopf', nummern(html).length === 0)
  wahr('leer: Hinweis auch mit Suche', liste([], ebenen, 'Top').includes('noch keine Wohnungen'))
}
{
  const html = liste(ziele, ebenen, '')
  wahr('alle: Reihenfolge und Nummern', gleich(nummern(html), [0, 1, 2, 3, 4]))
  wahr('alle: eine Ueberschrift je Ebene, unbekannte ohne', gleich(ueberschriften(html), ebenen))
  wahr('alle: vier Gruppen (die letzte ohne Ueberschrift)', (html.match(/<section/g) ?? []).length === 4)
  wahr('alle: Name als Text', html.includes('>Haus Sued Top 4<'))
  wahr('alle: Vorlesename', html.includes('aria-label="Zu Haus Nord Top 1 gehen"'))
  wahr('nur Leerzeichen gilt als keine Suche', gleich(nummern(liste(ziele, ebenen, '   ')), [0, 1, 2, 3, 4]))
}
{
  const html = liste(ziele, ebenen, 'TOP 3')
  wahr('Suche: jedes Wort, gross und klein egal', gleich(nummern(html), [2]))
  wahr('Suche: nur die passende Ueberschrift', gleich(ueberschriften(html), ['Haus Nord, 1. OG']))
  wahr('Suche: ein Wort', gleich(nummern(liste(ziele, ebenen, 'sued')), [3]))
  wahr('Suche: alle Woerter muessen passen', gleich(nummern(liste(ziele, ebenen, 'nord 4')), []))
}
{
  const html = liste(ziele, ebenen, 'xyz')
  wahr('kein Treffer: eigener Hinweis mit dem Suchwort', html.includes('Keine Wohnung passt zu „xyz“.'))
  wahr('kein Treffer: kein Knopf', nummern(html).length === 0)
  wahr('kein Treffer: Suchwort ohne Leerzeichen', liste(ziele, ebenen, '  xyz ').includes('„xyz“'))
}
{
  // Faellt dazwischen eine andere Ebene weg, wird es eine Gruppe.
  const z = [ziel('A 1', 0), ziel('B 1', 1), ziel('A 2', 0)]
  const html = liste(z, ebenen, 'a')
  wahr('zusammen: Nummern bleiben', gleich(nummern(html), [0, 2]))
  wahr('zusammen: eine Ueberschrift', gleich(ueberschriften(html), ['Haus Nord, EG']))
  // Ohne Suche wechselt die Ebene zweimal: drei Gruppen.
  wahr('ohne Suche: drei Gruppen', gleich(ueberschriften(liste(z, ebenen, '')), ['Haus Nord, EG', 'Haus Nord, 1. OG', 'Haus Nord, EG']))
}
{
  const leer = liste([], ebenen, '', 'ar')
  wahr('arabisch: Hinweis leer', leer.includes('لا توجد في هذا المجمّع شقق يمكن الانتقال إليها بعد.'))
  const keiner = liste(ziele, ebenen, 'xyz', 'ar')
  wahr('arabisch: kein Treffer', keiner.includes('لا توجد شقة تطابق «xyz».'))
  const alle = liste(ziele, ebenen, '', 'ar')
  wahr('arabisch: Vorlesename', alle.includes('aria-label="الانتقال إلى Haus Nord Top 1"'))
  wahr('arabisch: Namen bleiben, wie sie sind', alle.includes('>Haus Nord Top 1<'))
}

/* ------------------------------------------------------------ 2. Vertrag */

{
  const raum = lesen('src/components/plan3d/Raum3D.tsx')
  wahr('Raum3DSteuer.springen', /export interface Raum3DSteuer \{[\s\S]*?springen\(index: number\): void[\s\S]*?\n\}/.test(raum))
  wahr('Raum3DProps.onSprungziele', /onSprungziele\?: \(ziele: Sprungziel3D\[\], ebenen: string\[\]\) => void/.test(raum))
  wahr('Motor.springen ueber die freiwillige Angabe', /springen\?: \(ebene: number, x: number, z: number, gier: number\) => void/.test(raum))
  const anfang = raum.indexOf('springen(index: number) {')
  const begehen = raum.indexOf('m.begehen(true, startPunkt(daten, raumId))', anfang)
  const sprung = raum.indexOf('mw.springen(ziel.ebene, ziel.x, ziel.z, ziel.gier)', anfang)
  wahr('springen: erst begehen, dann springen', anfang > 0 && begehen > anfang && sprung > begehen)
  wahr('springen: Leiste geht mit (setGehen)', raum.slice(anfang, sprung).includes('setGehen(true)'))
  wahr('Welt meldet ihre Ziele', raum.includes("sprungRueck.current?.(sprungziele.current, w.ebenen.map((x) => x.name))"))

  const seite = lesen('src/pages/SiedlungAnsicht.tsx')
  wahr('Seite gibt onSprungziele weiter', /<Ansicht3D[^>]*onSprungziele=\{zieleMelden\}/.test(seite))
  wahr('Seite: Name oben aus den Daten', seite.includes("title={siedlung?.name || t('siedlung.titel')}"))
  wahr('Seite: Knopf aus, bis die Welt gebaut ist', /disabled=\{!sprung\}/.test(seite))
  wahr('Seite: Tippen schliesst und springt', /setListeFuer\(null\)\s*\n\s*steuer\.current\?\.springen\(i\)/.test(seite))
  // welt ist eine Funktion; direkt an den Setzer gegeben, riefe React sie auf.
  wahr('Seite: Liste merkt sich die Welt verpackt', seite.includes('setListeFuer(() => welt)') && !/setListeFuer\(welt\)/.test(seite))
}

if (fehler) {
  console.log(`${fehler} Abweichung(en)`)
  process.exit(1)
}
console.log('ok')
