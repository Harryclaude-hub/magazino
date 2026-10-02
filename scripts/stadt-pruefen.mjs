// Prueft die Stadt in 3D (src/components/plan3d/stadt3d.ts) ohne Browser,
// mit einer erfundenen Stadt am Hang (alle Namen, Lagen und Zahlen sind
// erfunden) unter einer gedrehten und verschobenen Matrix:
// - hoehe() (Welt) gleich gelaendeHoehe (Siedlung) auf 1 cm, das Gelaende
//   liegt an den Gitterpunkten genau 6 cm tiefer und nirgends hoeher
//   (Strahl von oben gegen das Mesh), bodenY gilt vor der Hoehe von zuWelt,
// - je Kante jedes Hauses ein Rechteck innen am Umriss (Lage, Laenge,
//   Tiefe AUSSENWAND_M, Drehung in der Welt), an der Tuer (tuerLage aus
//   innenGenerator, weg von den Ecken) eine Luecke mit einem festen
//   Rechteck am Ende der Liste; hindernisse() ist immer dasselbe Feld mit
//   denselben Rechtecken, auch beim Laden und Entladen,
// - Laden mit einem Planer wie der Worker (von Hand weitergeschaltet):
//   Plaene ab 60 m, gebaut ab INNEN_LADEN_M in Stuecken; innenBauen bekommt
//   Rahmen, Kennung, Ebene und Schwelle richtig; die Schwelle liegt quer
//   ueber dem Tuerrechteck; Ebenen kommen nur hinten dazu, beim Entladen
//   bleiben sie, die Dinge gehen weg; erneut geladen dieselben Ebenen
//   (Objekte), Treppen und Kennungen, der Plan aus dem Vorrat; wer ein Ding
//   wegtraegt, haelt sein Haus geladen; weit weg ist das Innere aus und die
//   Tuer zu, nah offen,
// - ohne Worker (node) rechnet die Stadt selbst, je Bild hoechstens ein Plan,
// - Fenster: nah als Glas genau nach fensterReihe und fensterOhneTuer (je
//   Kante und Geschoss), fern nur das Muster, ganz fern freigegeben,
// - Stufen vor der Tuer immer da (offen wie zu), vom Gelaende 0,9 m vor der
//   Kante bis zum Boden des EG; das Tuerblatt nur zu,
// - Ausschnitte (aussparen): dort kein Gelaende, sonst ueberall; ein Haus
//   am Hang bekommt beim Laden einen Ausschnitt (kein Gelaende ueber seinem
//   Boden), beim Entladen ist er wieder weg,
// - Sprungziele frei von Hindernissen, vor der Tuer mit Blick darauf,
//   sortiert, hoechstens 80; die Karte in Weltmetern,
// - Fahrzeuge: zwei Loeschfahrzeuge vor jeder Feuerwehr, zwei
//   Rettungswagen vor dem hoechsten Spital, ein Polizeiauto beim
//   groessten Einkaufszentrum, ein Bus an der Haltestelle, hoechstens 25
//   geparkte, alle bis 700 m um die Siedlung, keins in einem Haus,
//   Kennungen 'stadt:f<n>'; Dinge auf Spielplatz und Park,
// - gleiche Daten geben dieselbe Welt, unsinnige Daten werfen laut,
// - Budget an einer erfundenen Stadt mit 4000 Haeusern und 2500 Strassen:
//   Bauzeit, Dreiecke, Zeichenaufrufe; Gehen und Fahren mit dem echten
//   Worker-Code in einem Thread von node: kamera() und schritt() im Mittel
//   unter 2 ms, kein Bild ueber 16 ms (Zahlen werden ausgegeben),
// - dispose() gibt alles frei (ausser den Materialien, die fahrzeug3d.ts
//   fuer alle Fahrzeuge der Seite behaelt), auch zweimal.
// Aufruf im Projektordner: node scripts/stadt-pruefen.mjs
// Ausgabe "ok" oder die abweichenden Faelle, Exit 1 bei Fehlern.
import fs from 'node:fs'
import { registerHooks } from 'node:module'
import v8 from 'node:v8'
import vm from 'node:vm'
import { PerformanceObserver } from 'node:perf_hooks'
import { Worker as NodeWorker } from 'node:worker_threads'
import { Frustum, Matrix4, PerspectiveCamera, Raycaster, Sphere, Vector3 } from 'three'

/* Das Innere mitzaehlen: Aufrufe, fertige Teile, Freigaben, Bauzeit je Stueck. */
const ECHT_INNEN = new URL('../src/components/plan3d/innen3d.ts', import.meta.url).href
const HUELLE =
  'data:text/javascript,' +
  encodeURIComponent(`
import * as echt from ${JSON.stringify(ECHT_INNEN)};
export const innenVorbereiten = echt.innenVorbereiten;
export function innenBauen(o) {
  const g = globalThis.__innen;
  g.aufrufe.push(o);
  const bau = echt.innenBauen(o);
  return {
    weiter(bis) {
      const t0 = performance.now();
      const fertig = bau.weiter(bis);
      g.stueck = Math.max(g.stueck, performance.now() - t0 - Math.max(0, bis - t0));
      const teil = bau.teil;
      if (fertig && teil && !g.gesehen.has(teil)) {
        g.gesehen.add(teil);
        const alt = teil.dispose.bind(teil);
        teil.dispose = () => { g.freigegeben++; alt(); };
        g.teile.set(o.praefix, teil);
      }
      return fertig;
    },
    get teil() { return bau.teil; },
    abbrechen() { g.abgebrochen++; bau.abbrechen(); },
  };
}
`)
/* Fahrzeuge mitzaehlen (Art, Farbe, Kennung). */
const ECHT_FAHRZEUG = new URL('../src/components/plan3d/fahrzeug3d.ts', import.meta.url).href
const FZ_HUELLE =
  'data:text/javascript,' +
  encodeURIComponent(`
import * as echt from ${JSON.stringify(ECHT_FAHRZEUG)};
export function baueFahrzeug(art, farbe, id, lage) {
  globalThis.__fahrzeuge.set(id, { art, farbe });
  return echt.baueFahrzeug(art, farbe, id, lage);
}
`)
globalThis.__fahrzeuge = new Map()
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === './innen3d.ts' && context.parentURL?.endsWith('/plan3d/stadt3d.ts')) return { url: HUELLE, shortCircuit: true }
    if (specifier === './fahrzeug3d.ts' && context.parentURL?.endsWith('/plan3d/stadt3d.ts')) return { url: FZ_HUELLE, shortCircuit: true }
    return nextResolve(specifier, context)
  },
})
globalThis.__innen = { aufrufe: [], teile: new Map(), gesehen: new WeakSet(), freigegeben: 0, abgebrochen: 0, stueck: 0 }

const { baueStadt } = await import('../src/components/plan3d/stadt3d.ts')
const { gelaendeHoehe } = await import('../src/lib/stadt.ts')
const { tuerLage } = await import('../src/lib/innenGenerator.ts')
const { innenAntwort } = await import('../src/lib/innenWerker.ts')
const { baueFahrzeug } = await import('../src/components/plan3d/fahrzeug3d.ts')
const masse = await import('../src/components/plan3d/stadtMasse.ts')
const { KOERPER_RADIUS_M } = await import('../src/components/plan3d/kollision.ts')
const { AUSSENWAND_M, fensterReihe, fensterOhneTuer, INNEN_ENTLADEN_M, SCHWELLE_VOR, SCHWELLE_HINTER, FENSTER_B, FENSTER_H, FENSTER_BRUESTUNG } = masse

let fehler = 0
function wahr(name, ist) {
  if (!ist) {
    console.log('ABWEICHUNG', name)
    fehler++
  }
}
function nahe(name, ist, soll, tol = 1e-6) {
  if (!(Math.abs(ist - soll) <= tol)) {
    console.log('ABWEICHUNG', name, 'ist', ist, 'soll', soll)
    fehler++
  }
}

// Farben wie in src/index.css (helles Schema).
const F = {
  grund: '#f4f2ed', boden: '#e9e4da', bodenDraussen: '#dcd6c8', wand: '#3a3a3c', wand3d: '#e1dace', tuer: '#8a6a4a',
  fenster: '#9fc3d9', objekt: '#d4c4a8', objektRand: '#8c7a5c', fach: '#c9b896', kisteRand: '#8a6a4a', hervor: '#e3b341',
  strom: '#d0573f', steckdose: '#eeede9', wandKopf: '#cfc9bf', wandKante: '#bdb6aa', tuer3d: '#f4f2ed', zarge3d: '#d6d0c5',
  rahmen3d: '#eeece8', boden3d: '#bb9670', bodenDraussen3d: '#a9a39a', holz: '#b98c5a', holzDunkel: '#5c4430', stoff: '#8c9aa6',
  waesche: '#f0eee8', keramik: '#f6f6f3', metall: '#9aa0a6', schwarz: '#26272a', front: '#d4b48a', platte: '#4a4a4c',
  weiss: '#eeede9', gruen: '#56793f', topf: '#a0644a', teppich: '#b7a58a', glas: '#9fc3d9', schalter3d: '#f2f1ec',
  spiegel: '#c3d0d6', griff: '#8f9296', wasser: '#6aa5d8', bildschirm: '#1d1f22', rasen: '#7f9a5c', weg: '#b9b2a4',
  baum: '#4f7340', stamm: '#6b5340', hecke: '#5d7f47', himmelOben: '#9cc3e4', himmelUnten: '#e4ecef', fassade: '#e9e4da',
  pappe: '#c8a77a', leinen: '#e6e0d2', spielRot: '#d0573f', spielBlau: '#4f7fb8', spielGelb: '#e3b341', spielGruen: '#6aa84f',
}

/* ------------------------------------------------ Planer wie der Worker */

/** Ein Planer wie der Web Worker, den die Pruefung von Hand weiterschaltet:
 *  planen() merkt sich die Anfrage, rechnen() beantwortet alle mit
 *  innenAntwort aus innenWerker.ts (ausserhalb der Bilder). */
function handPlaner() {
  const offen = []
  const p = {
    nebenher: true,
    anfragen: [],
    weg: false,
    planen(e, fertig) {
      p.anfragen.push(e.id)
      offen.push([e, fertig])
    },
    rechnen() {
      while (offen.length) {
        const [e, fertig] = offen.shift()
        const a = innenAntwort({ nr: 1, eingabe: e })
        if (a.plan) fertig(a.plan, null)
        else fertig(null, a.fehler)
      }
    },
    get offen() {
      return offen.length
    },
    dispose() {
      p.weg = true
    },
  }
  return p
}

/** Der echte Code des Workers (innenAntwort) in einem Thread von node: so
 *  rechnet es wirklich nebenher, wie im Browser. Die Antworten kommen nur
 *  an, wenn die Pruefung der Ereignisschleife Zeit laesst (await). */
function threadPlaner() {
  const code = `import { parentPort } from 'node:worker_threads'
import { innenAntwort } from ${JSON.stringify(new URL('../src/lib/innenWerker.ts', import.meta.url).href)}
parentPort.on('message', (a) => parentPort.postMessage(innenAntwort(a)))`
  const w = new NodeWorker(new URL('data:text/javascript,' + encodeURIComponent(code)))
  const offen = new Map()
  let nr = 0
  w.on('message', (a) => {
    const f = offen.get(a.nr)
    if (!f) return
    offen.delete(a.nr)
    if (a.plan) f(a.plan, null)
    else f(null, a.fehler)
  })
  w.on('error', (e) => {
    console.log('ABWEICHUNG Thread des Planers:', e)
    fehler++
  })
  return {
    nebenher: true,
    planen(e, fertig) {
      offen.set(++nr, fertig)
      w.postMessage({ nr, eingabe: e })
    },
    get offen() {
      return offen.size
    },
    dispose() {
      w.terminate()
    },
  }
}
/** Muell jetzt einsammeln (node mit --expose-gc, hier zur Laufzeit eingeschaltet). */
v8.setFlagsFromString('--expose-gc')
const aufraeumen = vm.runInNewContext('gc')
/** Wann der Muellsammler lief (Anfang, Ende in ms wie performance.now()). */
const gcZeiten = []
const gcBeobachter = new PerformanceObserver((liste) => {
  for (const e of liste.getEntries()) gcZeiten.push([e.startTime, e.startTime + e.duration])
})
gcBeobachter.observe({ entryTypes: ['gc'] })
/** Zwischen zwei Bildern etwas Zeit (wie im Browser, wo ein Bild 16 ms dauert). */
const pause = (ms = 4) => new Promise((r) => setTimeout(r, ms))

/* ------------------------------------------------ Erfundene Stadt am Hang */

const SCHRITT = 10
const NX = 201
const NZ = 181
const X0 = -1000
const Z0 = -900
const hangDm = (x, z) => Math.round(10 * (0.035 * x + 0.02 * z + 2.5 * Math.sin(x / 70) * Math.cos(z / 55) + 1))
function gelaende() {
  const dm = []
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) dm.push(hangDm(X0 + i * SCHRITT, Z0 + j * SCHRITT))
  return { x0: X0, z0: Z0, schritt: SCHRITT, nx: NX, nz: NZ, dm }
}
const GEL = gelaende()
const hs = (x, z) => gelaendeHoehe(GEL, x, z)

/** Rechteck um (cx, cz), Breite b (entlang der Drehung), Tiefe t, Drehung w. */
function rechteck(cx, cz, b, t, w) {
  const c = Math.cos(w)
  const s = Math.sin(w)
  return [
    [-b / 2, -t / 2],
    [b / 2, -t / 2],
    [b / 2, t / 2],
    [-b / 2, t / 2],
  ].map(([x, z]) => [cx + x * c - z * s, cz + x * s + z * c])
}
function haus(id, art, umriss, mehr = {}) {
  let cx = 0
  let cz = 0
  for (const [x, z] of umriss) {
    cx += x
    cz += z
  }
  cx /= umriss.length
  cz /= umriss.length
  return { id, art, umriss, geschosse: 3, geschossHoehe: 3, dach: 'flach', boden: Math.round(hs(cx, cz) * 10) / 10 + 0.3, tuer: { kante: 0, t: 0.5 }, ...mehr }
}

const HAEUSER = [
  haus('a1', 'wohnen', rechteck(40, 30, 20, 12, 0.15), { geschosse: 4, name: 'Wohnhof Erlenweg' }),
  haus('a2', 'laden', rechteck(-35, 40, 14, 10, -0.1), { dach: 'sattel', geschosse: 2, name: 'Bäckerei Sonnenkorn' }),
  haus('a3', 'feuerwehr', rechteck(120, -60, 30, 18, 0.05), { geschosse: 2, name: 'Feuerwache Nord' }),
  haus('a4', 'spital', rechteck(-150, -120, 50, 22, 0.3), { geschosse: 5, name: 'Klinik Lindenhöhe' }),
  haus('a5', 'spital', rechteck(-220, 60, 24, 14, 0), { geschosse: 2 }),
  haus('a6', 'einkaufszentrum', rechteck(200, 150, 60, 40, -0.2), {
    geschosse: 2,
    geschossHoehe: 4.5,
    name: 'Einkaufszentrum Mühlbach',
    laeden: [
      { name: 'Schuhe Kranich', art: 'shoes' },
      { name: 'Drogerie Morgentau', art: 'chemist' },
    ],
  }),
  haus('a7', 'einkaufszentrum', rechteck(320, -150, 30, 20, 0), { geschosse: 1, geschossHoehe: 4 }),
  haus('a8', 'haus', [[-80, -40], [-60, -40], [-60, -25], [-70, -25], [-70, -10], [-80, -10]], { dach: 'walm', geschosse: 2, tuer: { kante: 1, t: 0.4 } }),
  haus('a9', 'buero', [[60, -150], [100, -150], [100, -110], [60, -110]], { geschosse: 3, loecher: [[[72, -138], [88, -138], [88, -122], [72, -122]]], name: 'Bürohaus Am Ring' }),
  haus('a10', 'schuppen', rechteck(15, -45, 3, 2.5, 0.4), { geschosse: 1, geschossHoehe: 2.6, dach: 'sattel' }),
  haus('a11', 'laden', rechteck(-10, 95, 12, 9, 0.6), { farbe: '#a0522d', name: 'مخبز الحي', geschosse: 1, tuer: { kante: 2, t: 0.3 } }),
  haus('a12', 'kirche', rechteck(-300, -300, 18, 34, 0.2), { dach: 'sattel', geschosse: 1, geschossHoehe: 8, name: 'Kapelle am Feld' }),
  haus('a13', 'wohnen', rechteck(700, 400, 16, 12, 0), { geschosse: 3, name: 'Fernhaus' }),
  // Tuer ganz in der Ecke (t = 0): tuerLage rueckt sie weg.
  haus('a14', 'haus', rechteck(-150, 150, 10, 8, 0), { geschosse: 2, tuer: { kante: 1, t: 0 } }),
  // Am Hang, der Boden auf der Hoehe des Gelaendes an der Tuer (wie die echten Daten).
  haus('a15', 'wohnen', rechteck(-60, -120, 16, 12, 0), { geschosse: 2, boden: Math.round(hs(-60, -126) * 10) / 10 }),
]

const STRASSEN = [
  { art: 'haupt', breite: 7.5, punkte: [[-950, 0], [-400, 5], [0, 0], [400, -8], [950, 0]], name: 'Hauptstrasse' },
  { art: 'haupt', breite: 7.5, punkte: [[0, -850], [5, -400], [0, 0], [-5, 400], [0, 850]] },
  { art: 'neben', breite: 6, punkte: [[-300, 120], [300, 120]] },
  { art: 'wohn', breite: 5.5, punkte: [[-200, -40], [-100, -40], [-40, -70], [60, -80]] },
  { art: 'wohn', breite: 5.5, punkte: [[150, 60], [150, 260]] },
  { art: 'wohn', breite: 4.5, punkte: [[-250, 200], [-120, 260]] },
  { art: 'wohn', breite: 5.5, punkte: [[850, -300], [880, 300]] },
  { art: 'dienst', breite: 3.5, punkte: [[90, -30], [90, -45], [130, -45]] },
  { art: 'fuss', breite: 2, punkte: [[-60, 60], [-20, 70], [20, 60]] },
  { art: 'rad', breite: 2.5, punkte: [[-400, -200], [-200, -210]] },
  { art: 'treppe', breite: 2, punkte: [[30, -20], [30, -8]] },
  { art: 'feldweg', breite: 3, punkte: [[-600, -500], [-400, -420], [-250, -460]] },
  { art: 'gleis', breite: 3, punkte: [[-900, -700], [900, -650]] },
  { art: 'neben', breite: 6, punkte: [[-520, 300], [-480, 300]], bruecke: true },
  { art: 'neben', breite: 6, punkte: [[-480, 330], [-440, 330]], tunnel: true },
]
const kreis = (cx, cz, r, n) => Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * Math.PI * 2) * r, cz + Math.sin((i / n) * Math.PI * 2) * r])
const FLAECHEN = [
  { art: 'wohngebiet', punkte: [[-400, -300], [400, -300], [400, 300], [-400, 300]] },
  { art: 'parkplatz', punkte: rechteck(205, 205, 50, 30, -0.2) },
  { art: 'parkplatz', punkte: rechteck(-60, 160, 30, 20, 0) },
  { art: 'spielplatz', punkte: kreis(-30, -15, 9, 12) },
  { art: 'park', punkte: rechteck(-120, 30, 40, 30, 0) },
  { art: 'wald', punkte: [[-800, -800], [-500, -800], [-500, -550], [-800, -550]] },
  { art: 'wasser', punkte: kreis(500, -400, 40, 16) },
  { art: 'wiese', punkte: rechteck(450, 300, 100, 80, 0) },
  { art: 'acker', punkte: rechteck(-600, 500, 200, 150, 0.1) },
  { art: 'sport', punkte: rechteck(250, -300, 90, 60, 0) },
  { art: 'friedhof', punkte: rechteck(-300, -360, 60, 40, 0) },
  { art: 'gewerbe', punkte: rechteck(330, -150, 80, 60, 0) },
  { art: 'fels', punkte: kreis(700, -700, 30, 10) },
  { art: 'schwimmbad', punkte: rechteck(260, -300, 25, 12, 0) },
]
const STADT = {
  art: 'kistly-stadt',
  v: 1,
  stand: '2026-01-01',
  rahmen: [-1000, -900, 1000, 900],
  gelaende: GEL,
  haeuser: HAEUSER,
  strassen: STRASSEN,
  flaechen: FLAECHEN,
  gewaesser: [{ breite: 6, punkte: [[-950, 280], [-500, 310], [-300, 380], [200, 420]] }],
  zaeune: [
    { art: 'mauer', punkte: [[-140, 0], [-100, 0], [-100, 12]] },
    { art: 'zaun', punkte: [[-45, -30], [-15, -30], [-15, -2]] },
    { art: 'hecke', punkte: [[60, 50], [90, 52]] },
  ],
  baeume: [[-40, 20], [70, 70], [-200, -10], [41, 31]],
  orte: [
    { name: 'Bäckerei Sonnenkorn', art: 'bakery', x: -35, z: 40, haus: 'a2' },
    { name: 'Rettungsstelle', art: 'hospital', x: -220, z: 60, haus: 'a5' },
    { name: 'Haltestelle Erlenweg', art: 'bus_stop', x: 60, z: -8 },
    { name: 'Brunnen', art: 'fountain', x: -100, z: 100 },
  ],
}

const RAD = 0.6
const ZU = new Matrix4().makeRotationY(RAD).setPosition(12, -3, -7)
const BODEN_Y = -3
const PLANER = handPlaner()
const OPT = { stadt: STADT, farben: F, zuWelt: ZU, bodenEbene: 'boden', bodenY: BODEN_Y, planer: PLANER }

/* ------------------------------------------------ Hilfen */

const M = ZU.clone()
M.elements[13] = BODEN_Y
const welt = ([x, z]) => {
  const v = new Vector3(x, 0, z).applyMatrix4(M)
  return [v.x, v.z]
}
const siedlung = ([x, z]) => {
  const v = new Vector3(x, BODEN_Y, z).applyMatrix4(M.clone().invert())
  return [v.x, v.z]
}
const ecken = (h) => {
  const c = Math.cos(h.drehY)
  const s = Math.sin(h.drehY)
  return [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([a, b]) => [h.x + (a * h.laenge * c) / 2 + (b * h.tiefe * s) / 2, h.z - (a * h.laenge * s) / 2 + (b * h.tiefe * c) / 2])
}
/** Abstand eines Punkts zum Hindernis (Welt), innen negativ. */
function abstandH(h, x, z) {
  const ux = Math.cos(h.drehY)
  const uz = -Math.sin(h.drehY)
  const dx = x - h.x
  const dz = z - h.z
  const a = Math.abs(dx * ux + dz * uz) - h.laenge / 2
  const b = Math.abs(-dx * uz + dz * ux) - h.tiefe / 2
  if (a <= 0 && b <= 0) return Math.max(a, b)
  return Math.hypot(Math.max(a, 0), Math.max(b, 0))
}
function imVieleck(x, z, poly) {
  let drin = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    if (a[1] > z !== b[1] > z && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]) drin = !drin
  }
  return drin
}
const flaeche = (poly) => poly.reduce((s, p, i) => s + p[0] * poly[(i + 1) % poly.length][1] - poly[(i + 1) % poly.length][0] * p[1], 0) / 2
/** Kanten eines Hauses wie stadt3d: a, u, n nach aussen, L. */
function kantenVon(h) {
  const out = []
  const ringe = [[h.umriss, true], ...(h.loecher ?? []).map((r) => [r, false])]
  for (const [ring, aussen] of ringe) {
    const pos = flaeche(ring) > 0
    const links = aussen ? pos : !pos
    ring.forEach((a, k) => {
      const b = ring[(k + 1) % ring.length]
      const L = Math.hypot(b[0] - a[0], b[1] - a[1])
      const ux = (b[0] - a[0]) / L
      const uz = (b[1] - a[1]) / L
      out.push({ a, b, ux, uz, nx: links ? uz : -uz, nz: links ? -ux : ux, L, idx: aussen ? k : -1 })
    })
  }
  return out
}
/** Die Tuer wie stadt3d und innenGenerator (tuerLage). */
function tuerVon(h) {
  const lage = tuerLage(h.umriss, h.tuer, h.art)
  const k = kantenVon(h)[lage.kante]
  return { k, t: lage.t, b: lage.breite, x: k.a[0] + k.ux * lage.t, z: k.a[1] + k.uz * lage.t }
}
const winkelGleich = (a, b, tol = 1e-6) => {
  const d = Math.abs(((((a - b) % Math.PI) + Math.PI) % Math.PI))
  return d < tol || Math.PI - d < tol
}
function meshesVon(o) {
  const out = []
  o.traverse((m) => {
    if (m.isMesh) out.push(m)
  })
  return out
}
function sichtbarAlle(o) {
  for (let x = o; x; x = x.parent) if (!x.visible) return false
  return true
}
const dreieckeVon = (m) => ((m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3) * (m.isInstancedMesh ? m.count : 1)
function zaehlen(o, ohne = new Set()) {
  let aufrufe = 0
  let dreiecke = 0
  o.traverse((m) => {
    if (!m.isMesh || !sichtbarAlle(m) || m.material.visible === false) return
    for (let x = m; x; x = x.parent) if (ohne.has(x)) return
    aufrufe++
    dreiecke += dreieckeVon(m)
  })
  return { aufrufe, dreiecke }
}
/** schritt() bis Ruhe; der Planer von Hand rechnet dazwischen. */
function ruhe(w, planer = PLANER) {
  let n = 0
  for (;;) {
    planer.rechnen?.()
    if (!w.schritt(1 / 60) || n >= 5000) break
    n++
  }
  return n
}
const gelaendeVon = (w) => meshesVon(w.gruppe).filter((m) => m.name === 'gelaende')
/** Hoechster Treffer von oben auf das Gelaende bei (Welt x, z), sonst null. */
function gelaendeTreffer(w, x, z, strahl = new Raycaster()) {
  w.gruppe.updateMatrixWorld(true)
  strahl.set(new Vector3(x, 500, z), new Vector3(0, -1, 0))
  strahl.far = Infinity
  const h = strahl.intersectObjects(gelaendeVon(w), false)[0]
  return h ? h.point.y : null
}

/* ------------------------------------------------ 1. Hoehe und Gelaende */

const w = baueStadt(OPT)
w.gruppe.updateMatrixWorld(true)
{
  let groesste = 0
  let r = 12345
  const zz = () => {
    r = (r * 1103515245 + 12345) % 2147483648
    return r / 2147483648
  }
  for (let i = 0; i < 500; i++) {
    const xs = X0 - 50 + zz() * (NX * SCHRITT + 100)
    const zs = Z0 - 50 + zz() * (NZ * SCHRITT + 100)
    const [xw, zw] = welt([xs, zs])
    groesste = Math.max(groesste, Math.abs(w.hoehe(xw, zw) - hs(xs, zs)))
  }
  wahr(`hoehe() wie gelaendeHoehe (groesste Abweichung ${groesste.toExponential(2)} m)`, groesste < 0.01)
  // Gelaende: an den Gitterpunkten 6 cm unter hoehe(), in der Welt bei bodenY.
  const gel = gelaendeVon(w)
  wahr('Gelaende hat Meshes', gel.length > 0)
  let fehlHoehe = 0
  const v = new Vector3()
  for (const m of gel) {
    const pos = m.geometry.attributes.position
    for (let i = 0; i < pos.count; i += 37) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld)
      const soll = BODEN_Y + w.hoehe(v.x, v.z) - 0.06
      fehlHoehe = Math.max(fehlHoehe, Math.abs(v.y - soll))
    }
  }
  wahr(`Gelaende-Ecken 6 cm unter hoehe() (Abweichung ${fehlHoehe.toExponential(2)})`, fehlHoehe < 1e-4)
  // Strahlen von oben: das Gelaende ragt nirgends ueber hoehe() - 6 cm.
  const ray = new Raycaster()
  let hoeher = 0
  let treffer = 0
  for (let i = 0; i < 150; i++) {
    const xs = -300 + zz() * 600
    const zs = -300 + zz() * 600
    const [xw, zw] = welt([xs, zs])
    ray.set(new Vector3(xw, 500, zw), new Vector3(0, -1, 0))
    const h = ray.intersectObjects(gel, false)[0]
    if (!h) continue
    treffer++
    hoeher = Math.max(hoeher, h.point.y - (BODEN_Y + w.hoehe(xw, zw) - 0.06))
  }
  wahr(`Strahlen treffen das Gelaende (${treffer})`, treffer > 140)
  wahr(`Gelaende nie ueber hoehe() - 6 cm (hoechstens ${hoeher.toFixed(5)} m)`, hoeher < 1e-4)
  // bodenY gilt, nicht die Hoehe von zuWelt.
  const w2 = baueStadt({ ...OPT, zuWelt: new Matrix4().makeRotationY(RAD).setPosition(12, 5, -7) })
  w2.gruppe.updateMatrixWorld(true)
  const g2 = gelaendeVon(w2)[0]
  v.fromBufferAttribute(g2.geometry.attributes.position, 0).applyMatrix4(g2.matrixWorld)
  nahe('bodenY statt y von zuWelt', v.y, BODEN_Y + w2.hoehe(v.x, v.z) - 0.06, 1e-4)
  w2.dispose()
}

/* ------------------------------------------------ 2. Waende als Hindernisse */

const H0 = w.hindernisse()
const geschlossen = HAEUSER.length // jedes Haus hat eine Tuer
{
  wahr('hindernisse() ist eine Liste', Array.isArray(H0) && H0.length > 0)
  wahr('hindernisse() immer dasselbe Feld', w.hindernisse() === H0)
  let fehlend = 0
  let zuDick = 0
  for (const h of HAEUSER) {
    const tuer = tuerVon(h)
    for (const k of kantenVon(h)) {
      // Erwartete Stuecke (an der Tuer zwei und das Tuerrechteck).
      const stuecke = []
      if (k.idx === tuer.k.idx && k.idx >= 0) {
        const d0 = Math.max(0, tuer.t - tuer.b / 2)
        const d1 = Math.min(k.L, tuer.t + tuer.b / 2)
        if (d0 > 0.01) stuecke.push([0, d0])
        if (k.L - d1 > 0.01) stuecke.push([d1, k.L])
        stuecke.push([d0, d1])
      } else stuecke.push([0, k.L])
      for (const [t0, t1] of stuecke) {
        const tm = (t0 + t1) / 2
        const [x, z] = welt([k.a[0] + k.ux * tm - (k.nx * AUSSENWAND_M) / 2, k.a[1] + k.uz * tm - (k.nz * AUSSENWAND_M) / 2])
        const dreh = Math.atan2(-k.uz, k.ux) + RAD
        const r = H0.find((q) => Math.abs(q.x - x) < 1e-6 && Math.abs(q.z - z) < 1e-6 && Math.abs(q.laenge - (t1 - t0)) < 1e-6 && winkelGleich(q.drehY, dreh))
        if (!r) {
          fehlend++
          continue
        }
        if (Math.abs(r.tiefe - AUSSENWAND_M) > 1e-9 || r.oben !== undefined) zuDick++
        // Die Aussenseite des Rechtecks liegt genau auf dem Umriss.
        const aussen = welt([k.a[0] + k.ux * tm, k.a[1] + k.uz * tm])
        nahe(`${h.id}: Rechteck aussen auf dem Umriss`, Math.abs(abstandH(r, aussen[0], aussen[1])), 0, 1e-6)
        const innen = welt([k.a[0] + k.ux * tm - k.nx * 0.15, k.a[1] + k.uz * tm - k.nz * 0.15])
        wahr(`${h.id}: Rechteck innen am Umriss`, abstandH(r, innen[0], innen[1]) <= 0)
        // Alle Ecken im Haus (oder auf dem Umriss), keine im Hof.
        const amRand = (q, ring) => ring.some((a, i) => {
          const b = ring[(i + 1) % ring.length]
          const dx = b[0] - a[0]
          const dz = b[1] - a[1]
          const t = Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dz) / (dx * dx + dz * dz)))
          return Math.hypot(q[0] - a[0] - dx * t, q[1] - a[1] - dz * t) < 1e-6
        })
        const imHaus = ecken(r).map(siedlung).every((q) => (imVieleck(q[0], q[1], h.umriss) || amRand(q, h.umriss)) && (h.loecher ?? []).every((l) => !imVieleck(q[0], q[1], l) || amRand(q, l)))
        if (!imHaus) zuDick++
      }
    }
  }
  wahr(`jede Kante hat ihr Rechteck (${fehlend} fehlen)`, fehlend === 0)
  wahr(`Waende AUSSENWAND_M dick, ohne Oberkante, innen am Umriss (${zuDick})`, zuDick === 0)
  // Zaeune mit Oberkante.
  const oben = H0.filter((q) => q.oben !== undefined).map((q) => q.oben)
  wahr('Mauer 1,0, Zaun 1,1, Hecke 1,3', oben.includes(1.0) && oben.includes(1.1) && oben.includes(1.3) && oben.length === 2 + 2 + 1)
  // Die Tuerrechtecke stehen am Ende, je Haus eins, in der Breite von tuerLage.
  const ende = H0.slice(-geschlossen)
  wahr(`Tuerrechtecke am Ende (${geschlossen})`, HAEUSER.every((h, i) => Math.abs(ende[i].laenge - tuerVon(h).b) < 1e-6))
  // tuerLage: die Tuer in der Ecke ist weggerueckt, die Luecke dort.
  const a14 = HAEUSER.find((h) => h.id === 'a14')
  const t14 = tuerVon(a14)
  wahr(`a14: Tuer weg von der Ecke (Mitte ${t14.t.toFixed(2)} m)`, t14.t - t14.b / 2 >= AUSSENWAND_M + 0.1)
}

/* ------------------------------------------------ 3. Laden: Plan im Worker, Bau in Stuecken */

const A1 = HAEUSER[0]
const T1 = tuerVon(A1)
const tuerInnen = welt([T1.x - T1.k.nx * 0.15, T1.z - T1.k.nz * 0.15])
const vorDer = (h, ab) => {
  const t = tuerVon(h)
  return welt([t.x + t.k.nx * ab, t.z + t.k.nz * ab])
}
let ebenenErst = null
let dingErst = null
let treppenErst = null
{
  wahr('Tuer: der Punkt in der Luecke ist versperrt (fest)', H0.some((q) => abstandH(q, tuerInnen[0], tuerInnen[1]) <= 0))
  const v0 = w.version()
  // 55 m vor der Tuer: nur der Plan wird angefragt, gebaut wird nichts.
  const [px, pz] = vorDer(A1, 55)
  w.kamera(px, BODEN_Y + 1.6, pz)
  w.schritt(1 / 60)
  for (let i = 0; i < 10 && !PLANER.anfragen.includes('a1'); i++) {
    PLANER.rechnen()
    w.schritt(1 / 60)
  }
  wahr(`ab 60 m: Plan angefragt (${PLANER.anfragen.join(',')})`, PLANER.anfragen.includes('a1'))
  wahr('ab 60 m: noch nicht gebaut', w.version() === v0 && !globalThis.__innen.aufrufe.some((o) => o.praefix === 'stadt:a1'))
  wahr(`hoechstens zwei Plaene zugleich (${PLANER.offen})`, PLANER.offen <= 2)
  PLANER.rechnen()
  // Davor: der Plan liegt bereit, gebaut wird in Stuecken.
  const [kx, kz] = vorDer(A1, 5)
  w.kamera(kx, BODEN_Y + 1.6, kz)
  let n = 0
  let laengstes = 0
  while (w.version() === v0 && n < 400) {
    const t0 = performance.now()
    w.schritt(1 / 60)
    laengstes = Math.max(laengstes, performance.now() - t0)
    PLANER.rechnen()
    n++
  }
  wahr(`version() zaehlt nach dem Laden hoch (${n} Bilder)`, w.version() > v0)
  wahr(`Bau in Stuecken: laengstes Bild ${laengstes.toFixed(1)} ms (hoechstens 16)`, laengstes < 16)
  const H1 = w.hindernisse()
  wahr('Hindernisse: dasselbe Feld nach dem Laden', H1 === H0)
  wahr('Tuerrechteck bleibt (fest)', H1.some((q) => abstandH(q, tuerInnen[0], tuerInnen[1]) <= 0))
  const auf = globalThis.__innen.aufrufe.find((o) => o.praefix === 'stadt:a1')
  wahr('innenBauen fuer a1 gerufen', !!auf)
  if (auf) {
    wahr('bodenEbene weitergereicht', auf.bodenEbene === 'boden')
    wahr('Name des Hauses', auf.name === 'Wohnhof Erlenweg')
    const p = new Vector3(A1.umriss[0][0], 0, A1.umriss[0][1]).applyMatrix4(auf.zuWelt)
    const [ex, ez] = welt(A1.umriss[0])
    nahe('Rahmen des Hauses: x', p.x, ex)
    nahe('Rahmen des Hauses: z', p.z, ez)
    nahe('Rahmen des Hauses: EG-Boden', p.y, BODEN_Y + A1.boden)
    const sx = T1.x + T1.k.nx * SCHWELLE_VOR
    const sz = T1.z + T1.k.nz * SCHWELLE_VOR
    nahe('schwelleY: Gelaende vor der Tuer', auf.schwelleY, BODEN_Y + hs(sx, sz), 1e-9)
    wahr('Plan mit Kennung und Art', auf.plan && auf.plan.id === 'a1' && auf.plan.art === 'wohnen')
    wahr('Plan: Tuer wie die Fassade (tuerLage)', auf.plan.tuer && auf.plan.tuer.kante === T1.k.idx && Math.abs(auf.plan.tuer.t - T1.t) < 1e-9 && Math.abs(auf.plan.tuer.breite - T1.b) < 1e-9)
  }
  const eb = w.ebenen()
  wahr('Ebenen des Hauses mit Praefix', eb.length > 0 && eb.every((e) => e.id.startsWith('stadt:')))
  ebenenErst = eb.filter((e) => e.id.startsWith('stadt:a1:'))
  wahr(`Ebenen von a1 da (${ebenenErst.length})`, ebenenErst.length === A1.geschosse)
  const teilA1 = globalThis.__innen.teile.get('stadt:a1')
  treppenErst = teilA1.treppen.map((t) => t.id)
  wahr('Treppen von a1 da', treppenErst.length >= 1 && treppenErst.every((id) => w.treppen().some((t) => t.id === id)))
  // Die Schwelle: quer ueber das Tuerrechteck, von draussen auf das EG.
  const sw = w.treppen().find((t) => t.id === 'stadt:a1:schwelle')
  wahr('Schwelle da', !!sw && sw.von === 'boden' && sw.nach === 'stadt:a1:0')
  if (sw) {
    const anTreppe = (u) => [sw.x + u * Math.cos(sw.drehY), sw.z - u * Math.sin(sw.drehY)]
    /** Lage (u laengs, v quer) eines Weltpunkts auf der Schwelle. */
    const aufTreppe = (x, z) => {
      const dx = x - sw.x
      const dz = z - sw.z
      return [dx * Math.cos(sw.drehY) - dz * Math.sin(sw.drehY), dx * Math.sin(sw.drehY) + dz * Math.cos(sw.drehY)]
    }
    const [ax, az] = anTreppe(-sw.laenge / 2)
    const [bx, bz] = anTreppe(sw.laenge / 2)
    const [dx, dz] = welt([T1.x, T1.z])
    nahe('Schwelle beginnt SCHWELLE_VOR vor der Tuer', Math.hypot(ax - dx, az - dz), SCHWELLE_VOR, 1e-6)
    nahe('Schwelle endet SCHWELLE_HINTER dahinter', Math.hypot(bx - dx, bz - dz), SCHWELLE_HINTER, 1e-6)
    // Das Tuerrechteck (fest) liegt quer auf der Schwelle: die Linie der Treppe geht hindurch.
    const tr = H0.slice(-geschlossen).find((q) => abstandH(q, tuerInnen[0], tuerInnen[1]) <= 0)
    const [u, v] = aufTreppe(tuerInnen[0], tuerInnen[1])
    wahr('Schwelle quer ueber dem Tuerrechteck', !!tr && Math.abs(u) < sw.laenge / 2 && Math.abs(v) < 1e-6)
    wahr('Schwelle: Tuerrechteck so breit wie die Tuer, Schwelle schmaler', !!tr && Math.abs(tr.laenge - T1.b) < 1e-6 && sw.breite <= T1.b)
    wahr('Schwelle draussen frei', !H0.some((q) => abstandH(q, ax, az) < KOERPER_RADIUS_M))
  }
  dingErst = teilA1.dinge.map((d) => d.id)
  wahr('Dinge von a1 da (Kennungen mit Praefix)', dingErst.length > 0 && dingErst.every((id) => id.startsWith('stadt:a1:') && w.dinge().some((d) => d.id === id)))
  wahr('Inneres haengt in der Gruppe', w.gruppe.children.includes(teilA1.gruppe))
  // Nah davor: das Erdgeschoss ist zu sehen (durch die offene Tuer), oben nichts.
  const stock = (d) => Number(d.ebene.split(':').pop())
  const sieht = (k0, k1) =>
    teilA1.fest.visible &&
    teilA1.stockMeshes.every((m, k) => !m || m.visible === (k >= k0 && k <= k1)) &&
    teilA1.dinge.every((d) => d.objekt.visible === (stock(d) >= k0 && stock(d) <= k1))
  wahr('nah davor: nur das Erdgeschoss zu sehen', sieht(0, 0))
  // Drinnen im 2. OG: das Geschoss und je eins darueber und darunter.
  const mitte = welt([(A1.umriss[0][0] + A1.umriss[2][0]) / 2, (A1.umriss[0][1] + A1.umriss[2][1]) / 2])
  w.kamera(mitte[0], BODEN_Y + A1.boden + 2 * A1.geschossHoehe + 1.64, mitte[1])
  w.schritt(1 / 60)
  wahr('drinnen im 2. OG: Geschosse 1 bis 3 zu sehen', sieht(1, 3))
  w.kamera(mitte[0], BODEN_Y + A1.boden + 1.64, mitte[1])
  w.schritt(1 / 60)
  wahr('drinnen im EG: Geschosse 0 und 1 zu sehen', sieht(0, 1))
  w.kamera(kx, BODEN_Y + 1.6, kz)
  ruhe(w)
}

/* ------------------------------------------------ 4. Fenster nah und fern */
{
  w.gruppe.updateMatrixWorld(true)
  const fenster = meshesVon(w.gruppe).filter((m) => m.name.startsWith('fenster:'))
  wahr(`nah: Fenster als Glas (${fenster.length} Kacheln)`, fenster.length > 0 && fenster.every((m) => m.visible))
  const kacheln = meshesVon(w.gruppe).filter((m) => m.name.startsWith('kachel:'))
  wahr('nah ohne Muster, fern mit Muster', kacheln.some((m) => !m.material.map) && kacheln.some((m) => !!m.material.map))
  // Glas genau nach fensterReihe/fensterOhneTuer: Mitten der dunklen Vierecke.
  const glasMitten = []
  for (const m of fenster) {
    const pos = m.geometry.attributes.position
    const col = m.geometry.attributes.color
    for (let i = 0; i + 3 < pos.count; i += 4) {
      // Glas ist das dunklere der zwei Vierecke je Fenster.
      if (col.getX(i) > 0.5) continue
      let x = 0
      let y = 0
      let z = 0
      const v = new Vector3()
      for (let k = 0; k < 4; k++) {
        v.fromBufferAttribute(pos, i + k).applyMatrix4(m.matrixWorld)
        x += v.x / 4
        y += v.y / 4
        z += v.z / 4
      }
      glasMitten.push([x, y, z])
    }
  }
  for (const h of [HAEUSER[0], HAEUSER[1], HAEUSER[10]]) {
    const t = tuerVon(h)
    let soll = 0
    let gefunden = 0
    for (const k of kantenVon(h)) {
      const reihe = fensterReihe(k.L)
      for (let g = 0; g < h.geschosse; g++) {
        const wo = g === 0 && k.idx === t.k.idx ? fensterOhneTuer(k.L, t.t, t.b) : reihe
        for (const c of wo) {
          soll++
          const [x, z] = welt([k.a[0] + k.ux * c + k.nx * 0.03, k.a[1] + k.uz * c + k.nz * 0.03])
          const y = BODEN_Y + h.boden + g * h.geschossHoehe + FENSTER_BRUESTUNG + FENSTER_H / 2
          if (glasMitten.some((q) => Math.abs(q[0] - x) < 1e-3 && Math.abs(q[1] - y) < 1e-3 && Math.abs(q[2] - z) < 1e-3)) gefunden++
        }
      }
    }
    wahr(`${h.id}: Glas genau an jedem Fenster (${gefunden} von ${soll})`, soll > 0 && gefunden === soll)
  }
  nahe('Fensterbreite aus stadtMasse', FENSTER_B, 1.2)
}

/* ------------------------------------------------ 5. Entladen und wieder laden */
{
  const ebenenVorher = w.ebenen().slice()
  const teilA1 = globalThis.__innen.teile.get('stadt:a1')
  // Zwischen SICHT_M und INNEN_ENTLADEN_M: geladen, aber aus, die Tuer zu.
  const [mx, mz] = vorDer(A1, 50)
  w.kamera(mx, BODEN_Y + 1.6, mz)
  ruhe(w)
  wahr('mittel weit: noch geladen, Inneres aus', globalThis.__innen.teile.get('stadt:a1') === teilA1 && !teilA1.fest.visible && teilA1.dinge.every((d) => !d.objekt.visible))
  const v0 = w.version()
  const [fx, fz] = vorDer(A1, INNEN_ENTLADEN_M + 40)
  w.kamera(fx, BODEN_Y + 1.6, fz)
  ruhe(w)
  wahr('fern: version() zaehlt hoch (entladen)', w.version() > v0)
  wahr('fern: Hindernisse dasselbe Feld', w.hindernisse() === H0)
  wahr('fern: keine Ebene weg oder umsortiert', ebenenVorher.every((e, i) => w.ebenen()[i] === e))
  wahr('fern: dieselben Ebenen-Objekte', ebenenErst.every((e) => w.ebenen().includes(e)))
  wahr('fern: Treppen bleiben', treppenErst.every((id) => w.treppen().some((t) => t.id === id)))
  wahr('fern: Dinge weg', !w.dinge().some((d) => dingErst.includes(d.id)))
  // Ganz fern: Glas freigegeben.
  const [gx, gz] = welt([900, 800])
  w.kamera(gx, BODEN_Y + 1.6, gz)
  ruhe(w)
  const fensterFern = meshesVon(w.gruppe).filter((m) => m.name.startsWith('fenster:') && m.name !== 'fenster:x')
  const naheKachel = fensterFern.filter((m) => {
    const s = m.geometry.boundingSphere.clone().applyMatrix4(m.matrixWorld)
    return Math.hypot(s.center.x - gx, s.center.z - gz) > 600
  })
  wahr(`ganz fern: kein Glas der Mitte mehr (${naheKachel.length})`, naheKachel.length === 0)
  // Zurueck: der Plan kommt aus dem Vorrat, dieselben Ebenen und Dinge.
  const anfragenVorher = PLANER.anfragen.filter((id) => id === 'a1').length
  const v1 = w.version()
  const [kx, kz] = vorDer(A1, 3)
  w.kamera(kx, BODEN_Y + 1.6, kz)
  ruhe(w)
  wahr('zurueck: wieder geladen', w.version() > v1 && globalThis.__innen.teile.get('stadt:a1') !== teilA1)
  wahr('zurueck: Plan aus dem Vorrat (keine neue Anfrage)', PLANER.anfragen.filter((id) => id === 'a1').length === anfragenVorher)
  wahr('zurueck: keine Ebene doppelt', new Set(w.ebenen().map((e) => e.id)).size === w.ebenen().length)
  wahr('zurueck: keine Ebene weg oder umsortiert', ebenenVorher.every((e, i) => w.ebenen()[i] === e))
  const eb2 = w.ebenen().filter((e) => e.id.startsWith('stadt:a1:'))
  wahr('zurueck: dieselben Ebenen-Objekte', eb2.length === ebenenErst.length && eb2.every((e, i) => e === ebenenErst[i]))
  wahr('zurueck: dieselben Dinge (Kennungen)', JSON.stringify(globalThis.__innen.teile.get('stadt:a1').dinge.map((d) => d.id)) === JSON.stringify(dingErst) && dingErst.every((id) => w.dinge().some((d) => d.id === id)))
  wahr('zurueck: Treppen nicht doppelt', new Set(w.treppen().map((t) => t.id)).size === w.treppen().length)
  wahr('zurueck: Hindernisse dasselbe Feld', w.hindernisse() === H0)
  // Ding weggetragen: das Haus bleibt geladen, das Ding zu sehen.
  const ding = w.dinge().find((d) => dingErst.includes(d.id))
  if (ding) {
    const [wx, wz] = welt([-300, 250])
    ding.objekt.position.set(wx, 0, wz)
    ding.objekt.updateMatrixWorld(true)
    w.kamera(fx, BODEN_Y + 1.6, fz)
    ruhe(w)
    wahr('Ding weggetragen: Haus bleibt geladen', w.dinge().some((d) => d.id === ding.id))
    wahr('Ding weggetragen: bleibt zu sehen, das Haus innen aus', ding.objekt.visible && !globalThis.__innen.teile.get('stadt:a1').fest.visible)
  } else wahr('a1 hat innen Dinge', false)
}

/* ------------------------------------------------ 5b. Stufen immer, Tuerblatt nur zu */
{
  const A2 = HAEUSER[1]
  const t = tuerVon(A2)
  const lageGruppe = w.gruppe.children.find((c) => c.name === 'stadtLage')
  const strahl = new Raycaster()
  const blick = (weit = Infinity, ab = 0.15) => {
    w.gruppe.updateMatrixWorld(true)
    strahl.far = weit
    // Von oben auf den Tritt bei ab vor der Kante.
    const [sx, sz] = welt([t.x + t.k.nx * ab, t.z + t.k.nz * ab])
    strahl.set(new Vector3(sx, BODEN_Y + A2.boden + 1, sz), new Vector3(0, -1, 0))
    const unten = strahl.intersectObject(lageGruppe, true)[0]
    // Waagrecht von vorn auf die Tuer.
    const [vx, vz] = welt([t.x + t.k.nx * 3, t.z + t.k.nz * 3])
    const [dx, dz] = welt([t.x, t.z])
    strahl.set(new Vector3(vx, BODEN_Y + A2.boden + 1, vz), new Vector3(dx - vx, 0, dz - vz).normalize())
    const vorn = strahl.intersectObject(lageGruppe, true)[0]
    return { stufeY: unten ? unten.point.y : -Infinity, blatt: vorn ? vorn.distance : Infinity }
  }
  // Nah (Kachel mit Glas), aber nicht nah genug zum Laden: Blatt und Stufen da.
  const [mx, mz] = vorDer(A2, 100)
  w.kamera(mx, BODEN_Y + 1.6, mz)
  ruhe(w)
  const zu = blick()
  nahe('zu: oberster Tritt auf dem Boden des Erdgeschosses', zu.stufeY, BODEN_Y + A2.boden, 0.01)
  nahe('zu: Tuerblatt 12 cm hinter der Aussenkante', zu.blatt, 3.12, 0.01)
  const unten = hs(t.x + t.k.nx * SCHWELLE_VOR, t.z + t.k.nz * SCHWELLE_VOR)
  const vorne = blick(Infinity, SCHWELLE_VOR - 0.05).stufeY
  wahr(`zu: unterster Tritt kurz vor SCHWELLE_VOR knapp ueber dem Gelaende (${(vorne - BODEN_Y - unten).toFixed(2)} m)`, vorne - BODEN_Y - unten > 0 && vorne - BODEN_Y - unten <= 0.17 + 1e-6)
  // Strahlen mit Weite: was weiter weg ist, trifft nichts; in Reichweite wie oben.
  nahe('Strahl bis 4 m trifft das Tuerblatt', blick(4).blatt, 3.12, 0.01)
  wahr('Strahl bis 2 m trifft nichts', blick(2).blatt === Infinity && blick(0.5).stufeY === -Infinity)
  const [kx, kz] = vorDer(A2, 4)
  w.kamera(kx, BODEN_Y + 1.6, kz)
  ruhe(w)
  const offen = blick()
  nahe('offen: Stufen bleiben (oberster Tritt)', offen.stufeY, BODEN_Y + A2.boden, 0.01)
  wahr(`offen: kein Tuerblatt mehr (${offen.blatt.toFixed(2)})`, offen.blatt > 4)
}

/* ------------------------------------------------ 5c. Gelaende im Haus am Hang */
{
  // a15 steht am Hang, sein Boden auf der Hoehe des Gelaendes an der Tuer:
  // im Umriss liegt das Gelaende teils hoeher. Zu ist das egal (man sieht
  // nicht hinein), offen ist dort kein Gelaende mehr, ringsum schon.
  const A2 = HAEUSER.find((h) => h.id === 'a15')
  const umriss = A2.umriss
  {
    const [kx, kz] = vorDer(A2, 4)
    w.kamera(kx, BODEN_Y + 1.6, kz)
    ruhe(w)
  }
  const proben = []
  for (let i = 1; i < 10; i++) for (let j = 1; j < 10; j++) {
    const f = i / 10
    const g = j / 10
    const a = [umriss[0][0] + (umriss[1][0] - umriss[0][0]) * f, umriss[0][1] + (umriss[1][1] - umriss[0][1]) * f]
    const b = [umriss[3][0] + (umriss[2][0] - umriss[3][0]) * f, umriss[3][1] + (umriss[2][1] - umriss[3][1]) * f]
    proben.push([a[0] + (b[0] - a[0]) * g, a[1] + (b[1] - a[1]) * g])
  }
  const hoeher = proben.filter(([x, z]) => hs(x, z) - 0.06 > A2.boden - 0.03)
  wahr(`a15: Gelaende im Haus teils ueber dem Boden (${hoeher.length} von ${proben.length})`, hoeher.length > 0)
  wahr('a15: geladen', w.ebenen().some((e) => e.id === 'stadt:a15:0'))
  const ueber = (w0) => proben.filter(([x, z]) => {
    const [xw, zw] = welt([x, z])
    const y = gelaendeTreffer(w0, xw, zw)
    return y !== null && y > BODEN_Y + A2.boden - 0.012
  }).length
  wahr(`a15 offen: kein Gelaende ueber dem Boden im Haus (${ueber(w)})`, ueber(w) === 0)
  // Ringsum bleibt das Gelaende (ein Meter vor jeder Kante).
  let draussenFehlt = 0
  for (const k of kantenVon(A2)) {
    for (const f of [0.25, 0.5, 0.75]) {
      const [xw, zw] = welt([k.a[0] + k.ux * k.L * f + k.nx, k.a[1] + k.uz * k.L * f + k.nz])
      if (gelaendeTreffer(w, xw, zw) === null) draussenFehlt++
    }
  }
  wahr(`a15 offen: ringsum Gelaende (${draussenFehlt} fehlen)`, draussenFehlt === 0)
  // Weit weg (entladen): das Gelaende ist wieder ganz.
  const [fx, fz] = vorDer(A2, INNEN_ENTLADEN_M + 50)
  w.kamera(fx, BODEN_Y + 1.6, fz)
  ruhe(w)
  wahr(`a15 entladen: Gelaende wieder ganz (${ueber(w)} Treffer ueber dem Boden)`, ueber(w) > 0)
}

/* ------------------------------------------------ 6. Sprungziele und Karte */
{
  const sz = w.sprungziele
  const benannt = HAEUSER.filter((h) => h.name || STADT.orte.some((o) => o.haus === h.id))
  wahr(`Sprungziele je benanntem Haus (${sz.length} von ${benannt.length})`, sz.length === benannt.length && sz.length <= 80)
  wahr('Sprungziele: Ebene -1', sz.every((s) => s.ebene === -1))
  const H = w.hindernisse()
  wahr('Sprungziele frei von Hindernissen', sz.every((s) => H.every((q) => abstandH(q, s.x, s.z) > KOERPER_RADIUS_M)))
  const ursprung = welt([0, 0])
  const d = sz.map((s) => Math.hypot(s.x - ursprung[0], s.z - ursprung[1]))
  wahr('Sprungziele nach Abstand zur Siedlung', d.every((x, i) => i === 0 || x >= d[i - 1] - 1e-9))
  for (const h of benannt) {
    const name = h.name || STADT.orte.find((o) => o.haus === h.id).name
    const s = sz.find((q) => q.name === name)
    const t = tuerVon(h)
    const [dx, dz] = welt([t.x, t.z])
    if (!s) {
      wahr(`Sprungziel ${name}`, false)
      continue
    }
    nahe(`${name}: 1,5 m vor der Tuer`, Math.hypot(s.x - dx, s.z - dz), 1.5, 1e-6)
    // Blick (0 = -z) zeigt auf die Tuer.
    const bx = -Math.sin(s.gier)
    const bz = -Math.cos(s.gier)
    nahe(`${name}: Blick zur Tuer`, bx * (dx - s.x) + bz * (dz - s.z), 1.5, 1e-6)
  }
  const k = w.karte
  const a1 = k.haeuser.find((h) => h.name === 'Wohnhof Erlenweg')
  wahr('Karte: Haus mit Namen', !!a1)
  wahr('Karte: Umriss in Weltmetern', !!a1 && a1.punkte.every((p, i) => Math.hypot(p[0] - welt(A1.umriss[i])[0], p[1] - welt(A1.umriss[i])[1]) < 1e-9))
  wahr('Karte: Haeuser ohne Namen mit leerem Namen', k.haeuser.some((h) => h.name === ''))
  wahr('Karte: alle Haeuser', k.haeuser.length === HAEUSER.length)
  const alle = k.haeuser.flatMap((h) => h.punkte)
  wahr('Karte: Rahmen umfasst die Haeuser', alle.every(([x, z]) => x >= k.rahmen[0] && x <= k.rahmen[2] && z >= k.rahmen[1] && z <= k.rahmen[3]))
  const arten = new Set(k.flaechen.map((f) => f.art))
  wahr('Karte: Flaechen umgesetzt (park, friedhof -> wiese, fels -> acker, schwimmbad -> wasser)', ['wiese', 'wald', 'acker', 'wasser', 'parkplatz', 'sport', 'spielplatz', 'gewerbe'].every((a) => arten.has(a)))
  wahr('Karte: wohngebiet faellt weg', k.flaechen.length === FLAECHEN.length - 1)
  const park = k.flaechen.filter((f) => f.art === 'parkplatz')[0]
  wahr('Karte: Flaeche in Weltmetern', Math.hypot(park.punkte[0][0] - welt(FLAECHEN[1].punkte[0])[0], park.punkte[0][1] - welt(FLAECHEN[1].punkte[0])[1]) < 1e-9)
  const st = new Map()
  for (const s of k.strassen) st.set(s.art, (st.get(s.art) ?? 0) + 1)
  wahr(`Karte: Strassen nach Art (${JSON.stringify([...st])})`, st.get('haupt') === 4 && st.get('neben') === 6 && st.get('fuss') === 3 && st.get('gleis') === 1 && st.get('wasser') === 1)
  wahr('Karte: Orte in Weltmetern', k.orte.length === STADT.orte.length && Math.hypot(k.orte[3].x - welt([-100, 100])[0], k.orte[3].z - welt([-100, 100])[1]) < 1e-9)
}

/* ------------------------------------------------ 7. Fahrzeuge und Dinge */
{
  const fz = w.fahrzeuge().filter((f) => f.id.startsWith('stadt:f'))
  wahr('Kennungen der Fahrzeuge der Reihe nach', fz.every((f, i) => f.id === `stadt:f${i}`))
  wahr('Fahrzeuge auf bodenEbene', fz.every((f) => f.ebene === 'boden'))
  wahr('Fahrzeuge haengen in der Gruppe', fz.every((f) => f.gruppe.parent === w.gruppe))
  wahr('Fahrzeuge auf dem Gelaende', fz.every((f) => Math.abs(f.gruppe.position.y - (BODEN_Y + w.hoehe(f.x, f.z))) < 1e-6))
  wahr('Fahrzeuge: Lage wie gebaut', fz.every((f) => Math.abs(f.gruppe.position.x - f.x) < 1e-9 && Math.abs(f.gruppe.position.z - f.z) < 1e-9 && Math.abs(f.gruppe.rotation.y - f.gier) < 1e-9))
  const vorTuer = (h, f) => {
    const t = tuerVon(h)
    const [dx, dz] = welt([t.x, t.z])
    const n = welt([t.x + t.k.nx, t.z + t.k.nz])
    const nx = n[0] - dx
    const nz = n[1] - dz
    const vorne = (f.x - dx) * nx + (f.z - dz) * nz
    const blick = -Math.sin(f.gier) * nx + -Math.cos(f.gier) * nz
    return { vorne, blick, d: Math.hypot(f.x - dx, f.z - dz) }
  }
  const fw = fz.filter((f) => f.art === 'feuerwehr')
  wahr(`zwei Loeschfahrzeuge je Feuerwehr (${fw.length})`, fw.length === 2 * HAEUSER.filter((h) => h.art === 'feuerwehr').length)
  for (const f of fw) {
    const r = vorTuer(HAEUSER[2], f)
    wahr(`${f.id}: vor der Tuer, draussen`, r.vorne > 1 && r.d < 20)
    wahr(`${f.id}: Blick von der Tuer weg`, r.blick > 0.999)
  }
  const rt = fz.filter((f) => f.art === 'rettung')
  wahr(`zwei Rettungswagen (${rt.length})`, rt.length === 2)
  for (const f of rt) {
    const r = vorTuer(HAEUSER[3], f)
    wahr(`${f.id}: vor dem hoechsten Spital`, r.vorne > 1 && r.d < 20 && r.blick > 0.999)
  }
  const po = fz.filter((f) => f.art === 'polizei')
  wahr(`ein Polizeiauto (${po.length})`, po.length === 1)
  if (po[0]) wahr('Polizei beim groessten Einkaufszentrum', vorTuer(HAEUSER[5], po[0]).d < 30 && vorTuer(HAEUSER[5], po[0]).vorne > 0)
  const bus = fz.filter((f) => f.art === 'bus')
  wahr(`ein Bus (${bus.length})`, bus.length === 1)
  if (bus[0]) {
    const [hx, hz] = welt([60, -8])
    wahr('Bus an der Haltestelle', Math.hypot(bus[0].x - hx, bus[0].z - hz) < 30)
  }
  const geparkt = fz.filter((f) => f.art === 'auto' || f.art === 'kombi' || f.art === 'transporter')
  wahr(`geparkte Autos: einige, hoechstens 25 (${geparkt.length})`, geparkt.length > 3 && geparkt.length <= 25)
  wahr('geparkte Autos bis 700 m um die Siedlung', geparkt.every((f) => Math.hypot(...siedlung([f.x, f.z])) <= 700))
  wahr('kein Fahrzeug in einem Haus', fz.every((f) => !HAEUSER.some((h) => imVieleck(...siedlung([f.x, f.z]), h.umriss))))
  const frei = geparkt.every((a) => geparkt.every((b) => a === b || Math.hypot(a.x - b.x, a.z - b.z) > 1.5))
  wahr('geparkte Autos stehen nicht ineinander', frei)
  const parkplaetze = FLAECHEN.filter((f) => f.art === 'parkplatz').map((f) => f.punkte)
  wahr('geparkte Autos auf einem Parkplatz', geparkt.some((f) => parkplaetze.some((p) => imVieleck(...siedlung([f.x, f.z]), p))))
  const amRand = geparkt.filter((f) => !parkplaetze.some((p) => imVieleck(...siedlung([f.x, f.z]), p)))
  const randStrassen = STRASSEN.filter((s) => s.art === 'wohn' || s.art === 'neben' || s.art === 'dienst')
  const abstandLinie = ([x, z], pts) => Math.min(...pts.slice(1).map((b, i) => {
    const a = pts[i]
    const dx = b[0] - a[0]
    const dz = b[1] - a[1]
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)))
    return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t)
  }))
  wahr(`geparkte Autos am Strassenrand (${amRand.length})`, amRand.length > 0 && amRand.every((f) => randStrassen.some((s) => abstandLinie(siedlung([f.x, f.z]), s.punkte) < s.breite / 2 + 1.5)))
  const farben = new Set(geparkt.map((f) => globalThis.__fahrzeuge.get(f.id)?.farbe))
  wahr(`geparkte Autos in verschiedenen Farben (${farben.size})`, farben.size >= 3 && [...farben].every((c) => /^#[0-9a-f]{6}$/.test(c)))
  wahr('Feuerwehr rot', fw.every((f) => globalThis.__fahrzeuge.get(f.id)?.farbe === '#c8102e'))
  const dinge = w.dinge().filter((d) => /^stadt:d\d+$/.test(d.id))
  wahr(`Dinge draussen: einige, hoechstens 15 (${dinge.length})`, dinge.length > 3 && dinge.length <= 15)
  wahr('Dinge: Kennungen der Reihe nach', dinge.every((d, i) => d.id === `stadt:d${i}`))
  const spiel = [FLAECHEN[3].punkte, FLAECHEN[4].punkte]
  wahr('Dinge auf Spielplatz oder im Park', dinge.every((d) => spiel.some((p) => imVieleck(...siedlung([d.objekt.position.x, d.objekt.position.z]), p))))
  wahr('Dinge mit echter Groesse', dinge.every((d) => d.breite > 0.1 && d.breite < 1 && d.hoehe > 0.1 && d.hoehe < 1 && d.ebene === 'boden'))
  wahr('Dinge auf dem Gelaende', dinge.every((d) => Math.abs(d.objekt.position.y - (BODEN_Y + w.hoehe(d.objekt.position.x, d.objekt.position.z))) < 1e-6))
}

/* ------------------------------------------------ 8. Gleiche Daten, gleiche Welt; Unsinn wirft */
{
  const a = baueStadt(OPT)
  const b = baueStadt(OPT)
  const bild = (x) =>
    JSON.stringify({
      h: x.hindernisse(),
      s: x.sprungziele,
      k: x.karte,
      f: x.fahrzeuge().map((f) => [f.id, f.art, f.x, f.z, f.gier]),
      d: x.dinge().map((d) => [d.id, d.objekt.position.toArray()]),
    })
  wahr('gleiche Daten, gleiche Welt', bild(a) === bild(b))
  const geoA = meshesVon(a.gruppe).filter((m) => m.name.startsWith('kachel:')).map((m) => Array.from(m.geometry.attributes.position.array.slice(0, 300)).join())
  const geoB = meshesVon(b.gruppe).filter((m) => m.name.startsWith('kachel:')).map((m) => Array.from(m.geometry.attributes.position.array.slice(0, 300)).join())
  wahr('gleiche Daten, gleiche Ecken', geoA.join('|') === geoB.join('|'))
  a.dispose()
  b.dispose()
  const wirft = (name, stadt) => {
    try {
      baueStadt({ ...OPT, stadt })
      wahr(`${name} wirft`, false)
    } catch (e) {
      wahr(`${name} wirft mit Text`, e instanceof Error && e.message.startsWith('stadt3d:'))
    }
  }
  wirft('falsche Art', { ...STADT, art: 'etwas' })
  wirft('ohne Haeuser', { ...STADT, haeuser: null })
  wirft('Punkt ohne Zahl', { ...STADT, haeuser: [{ ...HAEUSER[0], umriss: [[0, 0], [NaN, 1], [1, 1]] }] })
  wirft('ohne Gelaende', { ...STADT, gelaende: null })
  // Kaputtes Gitter: eben, aber kein Fehler.
  const eben = baueStadt({ ...OPT, stadt: { ...STADT, gelaende: { x0: 0, z0: 0, schritt: 0, nx: 0, nz: 0, dm: [] } } })
  wahr('kaputtes Gitter: eben', eben.hoehe(3, 4) === 0)
  eben.dispose()
  // Winzige Haeuser fallen weg und werden gezaehlt.
  const klein = baueStadt({ ...OPT, stadt: { ...STADT, haeuser: [...HAEUSER, haus('z', 'haus', [[0, 0], [0.5, 0], [0.5, 0.5]])] } })
  wahr('winziges Haus uebersprungen und gezaehlt', klein.gruppe.userData.uebersprungen === 1)
  klein.dispose()
}

/* ------------------------------------------------ 8b. Ausschnitte (aussparen) */
{
  // Ein konvexes Viereck und ein Dreieck in unrunder Lage; das zweite ist
  // als Punktwolke gegeben (die konvexe Huelle zaehlt).
  const grube = [[-14, 8], [-2, 6], [0, 11], [-12, 13]]
  const wolke = [[30, -30], [52, -26], [40, -10], [41, -22], [35, -25]]
  const mit = baueStadt({ ...OPT, aussparen: [grube, wolke] })
  let drin = 0
  let draussenFehlt = 0
  const inWolke = (x, z) => imVieleck(x, z, [[30, -30], [52, -26], [40, -10]])
  for (let i = 0; i < 400; i++) {
    const x = -20 + (i % 20) * 4 + 0.37
    const z = -35 + Math.floor(i / 20) * 2.5 + 0.21
    const [xw, zw] = welt([x, z])
    const y = gelaendeTreffer(mit, xw, zw)
    const aus = imVieleck(x, z, grube) || inWolke(x, z)
    const rand = [grube, [[30, -30], [52, -26], [40, -10]]].some((p) => p.some((a, k) => {
      const b = p[(k + 1) % p.length]
      const dx = b[0] - a[0]
      const dz = b[1] - a[1]
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)))
      return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) < 0.05
    }))
    if (rand) continue
    if (aus && y !== null) drin++
    if (!aus && y === null) draussenFehlt++
  }
  wahr(`aussparen: kein Gelaende in den Flaechen (${drin})`, drin === 0)
  wahr(`aussparen: sonst ueberall Gelaende (${draussenFehlt} fehlen)`, draussenFehlt === 0)
  // Die Ecken der Teile liegen in der Ebene der alten Dreiecke (nie hoeher).
  let hoeher = 0
  const v = new Vector3()
  for (const m of gelaendeVon(mit)) {
    const pos = m.geometry.attributes.position
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld)
      hoeher = Math.max(hoeher, v.y - (BODEN_Y + mit.hoehe(v.x, v.z) - 0.06))
    }
  }
  wahr(`aussparen: neue Ecken nie ueber dem Gelaende (${hoeher.toExponential(2)})`, hoeher < 1e-4)
  mit.dispose()
}

/* ------------------------------------------------ 8c. Ohne Worker: die Stadt rechnet selbst */
{
  const ohne = baueStadt({ ...OPT, planer: undefined })
  const [kx, kz] = vorDer(HAEUSER[10], 4)
  const v0 = ohne.version()
  ohne.kamera(kx, BODEN_Y + 1.6, kz)
  let n = 0
  while (ohne.version() === v0 && n < 300) {
    ohne.schritt(1 / 60)
    n++
  }
  wahr(`ohne Worker: geladen (${n} Bilder)`, ohne.version() > v0 && ohne.ebenen().some((e) => e.id === 'stadt:a11:0'))
  ohne.dispose()
}

/* ------------------------------------------------ 8d. Fehler im Plan: laut, das Haus bleibt zu */
{
  const fehlerPlaner = { nebenher: true, planen(_e, fertig) { setTimeout(() => fertig(null, 'Probefehler'), 0) }, dispose() {} }
  const alt = console.error
  const meldungen = []
  console.error = (...a) => meldungen.push(a.map(String).join(' '))
  try {
    const x = baueStadt({ ...OPT, stadt: { ...STADT, haeuser: [haus('pf', 'wohnen', rechteck(400, 400, 14, 10, 0), { geschosse: 2 })] }, planer: fehlerPlaner })
    const [kx, kz] = welt([400, 412])
    x.kamera(kx, BODEN_Y + 1.6, kz)
    x.schritt(1 / 60)
    await new Promise((r) => setTimeout(r, 5))
    for (let i = 0; i < 10; i++) x.schritt(1 / 60)
    wahr(`Plan mit Fehler: gemeldet (${meldungen.length})`, meldungen.some((m) => m.includes('Probefehler')) && x.gruppe.userData.innenFehler === 1)
    wahr('Plan mit Fehler: kein Inneres, Tuer zu', x.ebenen().length === 0 && x.version() === 0)
    x.dispose()
  } finally {
    console.error = alt
  }
}

/* ------------------------------------------------ 9. dispose */
/* Glas, Teile mit Farben je Ecke und Lichter der Fahrzeuge haben je ein
 * Material fuer alle Fahrzeuge der Seite (fahrzeug3d.ts); die bleiben. */
const geteilt = new Set()
{
  const probe = baueFahrzeug('auto', '#123456', 'probe', { x: 0, z: 0, gier: 0, ebene: '' })
  const offen = new Set()
  probe.gruppe.traverse((m) => {
    if (!m.isMesh) return
    const mats = Array.isArray(m.material) ? m.material : [m.material]
    for (const x of mats) {
      offen.add(x)
      x.addEventListener('dispose', () => offen.delete(x))
    }
  })
  probe.dispose()
  for (const x of offen) geteilt.add(x)
}
function freigeben(name, x) {
  const offen = new Set()
  x.gruppe.traverse((m) => {
    if (!m.isMesh) return
    for (const y of [m.geometry, ...(Array.isArray(m.material) ? m.material : [m.material])]) {
      if (offen.has(y) || geteilt.has(y)) continue
      offen.add(y)
      y.addEventListener('dispose', () => offen.delete(y))
    }
    if (m.material.map && !offen.has(m.material.map)) {
      const t = m.material.map
      offen.add(t)
      t.addEventListener('dispose', () => offen.delete(t))
    }
  })
  const anzahl = offen.size
  try {
    x.dispose()
    x.dispose()
  } catch (e) {
    console.log('ABWEICHUNG', name, 'dispose wirft', e)
    fehler++
  }
  wahr(`${name}: alles freigegeben (${anzahl} Teile, ${offen.size} offen)`, offen.size === 0)
  wahr(`${name}: Gruppe leer`, x.gruppe.children.length === 0)
  x.kamera(0, 0, 0)
  wahr(`${name}: nach dispose still`, x.schritt(0.1) === false && x.hindernisse().length === 0 && x.dinge().length === 0)
  return anzahl
}
wahr(`geteilte Materialien der Fahrzeuge (${geteilt.size})`, geteilt.size <= 4)
const teileFrei = freigeben('Stadt', w)
wahr('Inneres beim dispose freigegeben', globalThis.__innen.freigegeben >= 2)
wahr('Planer der Pruefung nicht freigegeben (gehoert ihr)', !PLANER.weg)

/* ------------------------------------------------ 10. Budget: grosse erfundene Stadt */

function grosseStadt() {
  let r = 987654321
  const zz = () => {
    r = (Math.imul(r, 1664525) + 1013904223) >>> 0
    return r / 4294967296
  }
  const N = 1240
  const schritt = 10
  const nx = Math.round((2 * N) / schritt) + 1
  const dm = []
  for (let j = 0; j < nx; j++) for (let i = 0; i < nx; i++) dm.push(Math.round(10 * (6 * Math.sin((-N + i * schritt) / 210) * Math.cos((-N + j * schritt) / 170) + 0.01 * (-N + i * schritt))))
  const gel = { x0: -N, z0: -N, schritt, nx, nz: nx, dm }
  const h = (x, z) => gelaendeHoehe(gel, x, z)
  const RASTER = 70
  const linien = []
  const L = 35
  const lage = (i) => -1190 + i * RASTER
  for (let i = 0; i < L; i++) {
    const art = i % 5 === 0 ? 'haupt' : i % 5 === 2 ? 'neben' : 'wohn'
    const breite = art === 'haupt' ? 7.5 : art === 'neben' ? 6 : 5.5
    for (let j = 0; j + 1 < L; j++) {
      linien.push({ art, breite, punkte: [[lage(i), lage(j)], [lage(i) + (zz() - 0.5) * 2, (lage(j) + lage(j + 1)) / 2], [lage(i), lage(j + 1)]] })
      linien.push({ art, breite, punkte: [[lage(j), lage(i)], [(lage(j) + lage(j + 1)) / 2, lage(i) + (zz() - 0.5) * 2], [lage(j + 1), lage(i)]] })
    }
  }
  while (linien.length < 2500) {
    const x = -1100 + zz() * 2200
    const z = -1100 + zz() * 2200
    linien.push({ art: zz() < 0.7 ? 'fuss' : 'rad', breite: 2, punkte: [[x, z], [x + 15 + zz() * 30, z + zz() * 20], [x + 40, z + 30]] })
  }
  const haeuser = []
  const arten = ['wohnen', 'wohnen', 'wohnen', 'haus', 'haus', 'laden', 'buero', 'garage', 'schuppen', 'halle']
  for (let bi = 0; bi + 1 < L && haeuser.length < 4000; bi++) {
    for (let bj = 0; bj + 1 < L && haeuser.length < 4000; bj++) {
      const x0 = lage(bi) + 8
      const z0 = lage(bj) + 8
      const plaetze = [
        [x0 + 14, z0 + 14],
        [x0 + 40, z0 + 14],
        [x0 + 14, z0 + 40],
        [x0 + 40, z0 + 40],
      ]
      for (const [cx, cz] of plaetze) {
        if (haeuser.length >= 4000) break
        const art = arten[Math.floor(zz() * arten.length)]
        const b = 9 + zz() * 13
        const t = 8 + zz() * 9
        let umriss = rechteck(cx, cz, b, t, (zz() - 0.5) * 0.3)
        if (zz() < 0.25) {
          // L-Form
          const c = umriss
          const m1 = [(c[1][0] + c[2][0]) / 2, (c[1][1] + c[2][1]) / 2]
          const m2 = [(c[2][0] + c[3][0]) / 2, (c[2][1] + c[3][1]) / 2]
          const mitte = [(c[0][0] + c[2][0]) / 2, (c[0][1] + c[2][1]) / 2]
          umriss = [c[0], c[1], m1, mitte, m2, c[3]]
        }
        const klein = art === 'garage' || art === 'schuppen'
        const g = klein ? 1 : 1 + Math.floor(zz() * 6)
        haeuser.push({
          id: `g${haeuser.length}`,
          art,
          umriss,
          geschosse: g,
          geschossHoehe: art === 'halle' ? 6 : 3,
          dach: ['flach', 'sattel', 'walm'][Math.floor(zz() * 3)],
          boden: Math.round(h(cx, cz) * 10) / 10 + 0.2,
          tuer: { kante: 0, t: 0.5 },
          ...(zz() < 0.08 ? { name: `Laden ${haeuser.length}` } : {}),
        })
      }
    }
  }
  const flaechen = []
  for (let i = 0; i < 160; i++) {
    const art = ['park', 'wald', 'parkplatz', 'spielplatz', 'wiese', 'sport', 'acker'][i % 7]
    flaechen.push({ art, punkte: kreis(-1100 + zz() * 2200, -1100 + zz() * 2200, 15 + zz() * 40, 10) })
  }
  const baeume = []
  for (let i = 0; i < 2000; i++) baeume.push([-1200 + zz() * 2400, -1200 + zz() * 2400])
  const zaeune = []
  for (let i = 0; i < 400; i++) {
    const x = -1100 + zz() * 2200
    const z = -1100 + zz() * 2200
    zaeune.push({ art: ['mauer', 'zaun', 'hecke'][i % 3], punkte: [[x, z], [x + 20, z], [x + 20, z + 15]] })
  }
  const orte = haeuser.filter((x) => x.name).map((x) => ({ name: x.name, art: 'shop', x: x.umriss[0][0], z: x.umriss[0][1], haus: x.id }))
  return { art: 'kistly-stadt', v: 1, stand: '2026-01-01', rahmen: [-N, -N, N, N], gelaende: gel, haeuser, strassen: linien.slice(0, 2500), flaechen, gewaesser: [], zaeune, baeume, orte }
}
{
  const gross = grosseStadt()
  wahr(`grosse Stadt: 4000 Haeuser, 2500 Strassen (${gross.haeuser.length}, ${gross.strassen.length})`, gross.haeuser.length === 4000 && gross.strassen.length === 2500)
  // Einmal warmlaufen (JIT), dann messen.
  baueStadt({ ...OPT, stadt: grosseStadt() }).dispose()
  const planer = threadPlaner()
  const t0 = performance.now()
  const g = baueStadt({ ...OPT, stadt: gross, planer })
  const ms = performance.now() - t0
  g.gruppe.updateMatrixWorld(true)
  // Ohne Fahrzeuge und die Dinge draussen (beides bewegt der Motor); das
  // Innere der Haeuser mit seinen Dingen zaehlt mit.
  const fahrzeugGruppen = new Set(g.fahrzeuge().map((f) => f.gruppe))
  const ohneFz = new Set([...fahrzeugGruppen, ...g.dinge().map((d) => d.objekt)])
  const anfang = zaehlen(g.gruppe, ohneFz)
  // Kamera in der Mitte, alles nachgebaut (der Thread rechnet die Plaene).
  const [mx, mz] = welt([0, 0])
  g.kamera(mx, BODEN_Y + 1.6, mz)
  for (let i = 0; i < 4000; i++) {
    const weiter = g.schritt(1 / 60)
    await pause()
    if (!weiter && planer.offen === 0) break
  }
  g.gruppe.updateMatrixWorld(true)
  const nah = zaehlen(g.gruppe, ohneFz)
  const mitFz = zaehlen(g.gruppe)
  const geladenZahl = g.ebenen().filter((e) => e.id.endsWith(':0')).length
  // Im Bild: Kamera wie beim Begehen (far 400), Blick nach Norden.
  const cam = new PerspectiveCamera(70, 16 / 9, 0.05, 400)
  cam.position.set(mx, BODEN_Y + g.hoehe(mx, mz) + 1.6, mz)
  cam.lookAt(mx, cam.position.y, mz - 10)
  cam.updateMatrixWorld(true)
  const fr = new Frustum().setFromProjectionMatrix(new Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse))
  let imBild = 0
  let imBildDreiecke = 0
  const kugel = new Sphere()
  g.gruppe.traverse((m) => {
    if (!m.isMesh || !sichtbarAlle(m) || m.material.visible === false) return
    if (m.isInstancedMesh) {
      if (!m.boundingSphere) m.computeBoundingSphere()
      kugel.copy(m.boundingSphere).applyMatrix4(m.matrixWorld)
    } else {
      if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere()
      kugel.copy(m.geometry.boundingSphere).applyMatrix4(m.matrixWorld)
    }
    if (!fr.intersectsSphere(kugel)) return
    imBild++
    imBildDreiecke += dreieckeVon(m)
  })
  // Speicher der Geometrien (Bytes der Felder).
  let bytes = 0
  const gesehen = new Set()
  g.gruppe.traverse((m) => {
    if (!m.isMesh || gesehen.has(m.geometry)) return
    gesehen.add(m.geometry)
    for (const a of Object.values(m.geometry.attributes)) bytes += a.array.byteLength
    if (m.geometry.index) bytes += m.geometry.index.array.byteLength
    if (m.isInstancedMesh) bytes += m.instanceMatrix.array.byteLength + (m.instanceColor ? m.instanceColor.array.byteLength : 0)
  })
  const u = g.gruppe.userData
  console.log(
    `  grosse Stadt: Bau ${Math.round(ms)} ms; ${u.haeuser} Haeuser, ${u.strassen} Strassen, ${u.baeume} Baeume, ${u.laternen} Laternen, ${u.kacheln} Kacheln, ${u.gelaende} Gelaendestuecke, ${g.fahrzeuge().length} Fahrzeuge, ${g.dinge().length} Dinge`,
  )
  console.log(`  ohne Kamera: ${anfang.dreiecke} Dreiecke, ${anfang.aufrufe} Zeichenaufrufe (ohne Fahrzeuge und Dinge draussen)`)
  console.log(`  Kamera in der Mitte (${geladenZahl} Haeuser innen geladen): ${nah.dreiecke} Dreiecke, ${nah.aufrufe} Zeichenaufrufe; mit Fahrzeugen ${mitFz.dreiecke} Dreiecke, ${mitFz.aufrufe} Zeichenaufrufe`)
  console.log(`  im Bild (far 400, Blick nach Norden): ${imBild} Zeichenaufrufe, ${imBildDreiecke} Dreiecke; Geometrie ${(bytes / 1e6).toFixed(1)} MB`)
  wahr(`Bau hoechstens 1500 ms (${Math.round(ms)})`, ms <= 1500)
  wahr(`in der Mitte Haeuser innen geladen (${geladenZahl})`, geladenZahl >= 3)
  wahr(`hoechstens 700 000 Dreiecke (${nah.dreiecke})`, nah.dreiecke <= 700000 && anfang.dreiecke <= 700000)
  wahr(`hoechstens 300 Zeichenaufrufe ohne Fahrzeuge (${nah.aufrufe})`, nah.aufrufe <= 300 && anfang.aufrufe <= 300)
  wahr(`im Bild hoechstens 300 Zeichenaufrufe mit Fahrzeugen (${imBild})`, imBild <= 300)
  wahr('ferne Kacheln ohne Glas', meshesVon(g.gruppe).filter((m) => m.name.startsWith('fenster:')).every((m) => {
    const s = m.geometry.boundingSphere.clone().applyMatrix4(m.matrixWorld)
    return Math.hypot(s.center.x - mx, s.center.z - mz) < 350 + 200
  }))
  // kamera() und schritt() bleiben billig: drei Wege (der Thread rechnet nebenher).
  const weg = async (name, bilder, stelle) => {
    // Aufraeumen vorher: grosse Pausen des Muellsammlers von node (die
    // vorigen Staedte) sollen nicht als Bildzeit der Stadt zaehlen.
    aufraeumen()
    await pause(20)
    gcZeiten.length = 0
    globalThis.__innen.stueck = 0
    const v0 = g.version()
    const bildZeiten = []
    for (let i = 0; i < bilder; i++) {
      const [x, z] = welt(stelle(i))
      const ti = performance.now()
      g.kamera(x, BODEN_Y + 1.6, z)
      g.schritt(1 / 60)
      bildZeiten.push([ti, performance.now()])
      await pause()
    }
    await pause(50)
    // Die Zeit des Muellsammlers von node in einem Bild abziehen (Eintraege
    // 'gc' aus perf_hooks): sie haengt an node, nicht an der Stadt.
    let summe = 0
    let summeNetto = 0
    let laengstes = 0
    let laengstesNetto = 0
    let gcBilder = 0
    for (const [a, b] of bildZeiten) {
      let gc = 0
      for (const [s, e] of gcZeiten) gc += Math.max(0, Math.min(b, e) - Math.max(a, s))
      if (gc > 0) gcBilder++
      summe += b - a
      summeNetto += b - a - gc
      laengstes = Math.max(laengstes, b - a)
      laengstesNetto = Math.max(laengstesNetto, b - a - gc)
    }
    const mittel = summeNetto / bilder
    console.log(
      `  ${name}: kamera() und schritt() im Mittel ${mittel.toFixed(2)} ms je Bild, laengstes ${laengstesNetto.toFixed(1)} ms (mit dem Muellsammler von node: ${(summe / bilder).toFixed(2)} und ${laengstes.toFixed(1)} ms, er lief in ${gcBilder} Bildern); ${g.version() - v0} neue Versionen; laengstes Baustueck ${globalThis.__innen.stueck.toFixed(1)} ms ueber der Zeit`,
    )
    wahr(`${name}: im Mittel unter 2 ms (${mittel.toFixed(2)})`, mittel < 2)
    wahr(`${name}: kein Bild ueber 16 ms (${laengstesNetto.toFixed(1)})`, laengstesNetto < 16)
  }
  // Gehen (1,4 m/s) eine Strasse entlang, an Haeusern vorbei.
  await weg('Gehen', 1800, (i) => [-260 + i * (1.4 / 60), -260 + 35])
  // Fahren (50 km/h) quer durch.
  await weg('Fahren', 1200, (i) => [-600 + i * (13.9 / 60), 100 + 35])
  // Sprunghaft (wie bisher): weite Saetze.
  await weg('Springen', 600, (i) => [Math.sin(i / 50) * 300, i * 0.5])
  const H = g.hindernisse()
  wahr('grosse Stadt: Hindernisse immer dasselbe Feld', g.hindernisse() === H)
  console.log(`  ${H.length} Hindernisse (fest), ${g.ebenen().length} Ebenen bisher`)
  freigeben('grosse Stadt', g)
  planer.dispose()
}

/* ------------------------------------------------ 11. Nichts Persoenliches */
{
  const LANGER_STRICH = String.fromCharCode(0x2014)
  for (const datei of ['src/components/plan3d/stadt3d.ts', 'src/lib/innenWerker.ts', 'scripts/stadt-pruefen.mjs']) {
    const txt = fs.readFileSync(datei, 'utf8')
    wahr(`${datei}: kein U+2014`, !txt.includes(LANGER_STRICH))
    wahr(`${datei}: keine Mail-Adresse`, !/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(txt))
    wahr(`${datei}: keine Koordinaten auf der Erde`, !/\b(4[6-9]|5[0-5])\.\d{4,}\b/.test(txt))
  }
}

if (fehler) {
  gcBeobachter.disconnect()
  console.log(`${fehler} Abweichung(en)`)
  process.exit(1)
}
gcBeobachter.disconnect()
console.log(`ok (${teileFrei} Teile freigegeben)`)
process.exit(0)
