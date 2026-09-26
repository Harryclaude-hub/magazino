// Prueft die reine Rechnung der 3D-Ansicht (src/components/plan3d/szene.ts)
// ohne Browser und ohne three: Boden, Waende mit Loechern, Sturz,
// Bruestung, Tuer orange mit Blatt 25 Grad offen, Fenster blau mit
// Scheibe, Moebel (L = zwei Quader), Regal mit Seiten und Brettern,
// Kisten in echter Groesse ab unten_cm, gesuchte rot, andere gedaempft,
// und der Ausschnitt auf einen Raum.
// Aufruf im Projektordner: node scripts/szene-pruefen.mjs
// Ausgabe "ok" oder die abweichenden Faelle, Exit 1 bei Fehlern.
import { baueSzene, hervorMitte, szeneRahmen, GEDAEMPFT, SCHEIBE_DECKKRAFT, TUER_OFFEN_GRAD } from '../src/components/plan3d/szene.ts'

let fehler = 0
function gleich(name, ist, soll) {
  const a = JSON.stringify(ist)
  const b = JSON.stringify(soll)
  if (a !== b) {
    console.log('ABWEICHUNG', name, 'ist', a, 'soll', b)
    fehler++
  }
}
function nahe(name, ist, soll, tol = 1e-6) {
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

const F = {
  grund: '#d3c9b6',
  boden: '#e6dccb',
  bodenDraussen: '#d9e2cf',
  wand: '#3f3931',
  wand3d: '#b9ad98',
  tuer: '#e0700f',
  fenster: '#2b78c9',
  objekt: '#cbbfa9',
  objektRand: '#6b6253',
  fach: '#b8ab93',
  kisteRand: '#1d1b16',
  hervor: '#b23a2e',
  strom: '#a16207',
  steckdose: '#dc2626',
  wandKopf: '#cfc9bf',
  wandKante: '#a9a296',
  tuer3d: '#f4f2ed',
  zarge3d: '#d6d0c5',
  rahmen3d: '#eeece8',
  boden3d: '#c9a77c',
  bodenDraussen3d: '#b7b3aa',
  holz: '#b98c5a',
  holzDunkel: '#5c4430',
  stoff: '#7f858c',
  waesche: '#f1eee7',
  keramik: '#f6f6f3',
  metall: '#9aa0a6',
  schwarz: '#26272a',
  front: '#d4b48a',
  platte: '#4a4a4c',
  weiss: '#eeede9',
  gruen: '#56793f',
  topf: '#b0643c',
  teppich: '#a48a73',
  glas: '#9fc3d9',
}

function raum(id, punkte, extra = {}) {
  return {
    id, grundriss_id: 'g1', project_id: 'p1', tag_id: null, name: id, art: 'innen', punkte,
    hoehe_cm: 250, bodenfarbe: null, wandfarben: null, sort: 0, tag_name: null, tag_short: null, tag_color: null,
    ...extra,
  }
}
function oeffnung(id, raumId, art, kante, abstand, breite, extra = {}) {
  return {
    id, raum_id: raumId, art, kante, abstand_cm: abstand, breite_cm: breite,
    hoehe_cm: art === 'tuer' ? 200 : 120, bruestung_cm: art === 'tuer' ? 0 : 90,
    anschlag: 'links', aufschlag: 'innen', ...extra,
  }
}
function objekt(id, raumId, art, extra = {}) {
  return {
    id, raum_id: raumId, art, name: id, farbe: null, item_id: null, item_code: null, item_title: null,
    x: 0, y: 0, breite_cm: 100, tiefe_cm: 40, hoehe_cm: 180, drehung: 0, form: 'rechteck',
    ausschnitt_breite_cm: null, ausschnitt_tiefe_cm: null, ausschnitt_ecke: null, brett_cm: null, spalten: 1,
    ...extra,
  }
}
function kiste(id, raumId, x, y, extra = {}) {
  return {
    id, code: id, prefix: 'W', size: 3, seq: 1, kind: 'box', status: 'open', title: null,
    room_id: null, room_color: '#2563EB', mark_color: null, eigene_groesse_name: null,
    platz_raum_id: raumId, platz_x: x, platz_y: y, platz_drehung: 0,
    unterlage_art: 'boden', unterlage_item_id: null, unterlage_objekt_id: null, fach_ebene: null, fach_spalte: null,
    laenge_cm: 60, breite_cm: 40, hoehe_cm: 40, unten_cm: 0, oben_cm: 40, grenze_cm: 250, wurzel_art: 'boden', nr: 1,
    ...extra,
  }
}

// Zwei Raeume nebeneinander, Uhrzeigersinn am Bildschirm (y nach unten).
// Wohnzimmer 0..400 x 0..300, Kueche 400..700 x 0..300 (gemeinsame Wand x = 400).
const wohn = raum('w', [[0, 0], [400, 0], [400, 300], [0, 300]], { wandfarben: ['#3e5f7a', null, null, null] })
const kueche = raum('k', [[400, 0], [700, 0], [700, 300], [400, 300]], { hoehe_cm: 240 })
const daten = {
  grundriss: { id: 'g1', project_id: 'p1', name: 'Neue Wohnung', sort: 0, version: 1, created_at: '', updated_at: '' },
  raeume: [wohn, kueche],
  oeffnungen: [
    oeffnung('t1', 'w', 'tuer', 1, 100, 90), // gemeinsame Wand x = 400, y 100..190
    oeffnung('f1', 'w', 'fenster', 0, 150, 120), // oben, x 150..270
  ],
  objekte: [
    objekt('sofa', 'w', 'moebel', {
      x: 20, y: 200, breite_cm: 200, tiefe_cm: 90, hoehe_cm: 80, form: 'l',
      ausschnitt_breite_cm: 100, ausschnitt_tiefe_cm: 40, ausschnitt_ecke: 'ro',
    }),
    objekt('billy', 'w', 'regal', { x: 20, y: 20, breite_cm: 80, tiefe_cm: 30, hoehe_cm: 200, brett_cm: [0, 40, 80, 120], spalten: 2 }),
    objekt('schrank', 'k', 'schrank', { x: 600, y: 20, brett_cm: [0, 100], item_id: 'm1' }),
  ],
  kisten: [
    kiste('a', 'w', 300, 150),
    kiste('b', 'w', 300, 150, { unterlage_art: 'kiste', unterlage_item_id: 'a', unten_cm: 40, oben_cm: 80, mark_color: '#16A34A' }),
    kiste('c', 'k', 500, 200, { platz_drehung: 90 }),
  ],
}

const alle = baueSzene(daten, F, { hervor: 'b' })
const nach = (r) => alle.filter((k) => k.rolle === r)

/* ------------------------------------------------------------ Boden */
{
  const b = nach('boden')
  gleich('zwei Boeden', b.length, 2)
  gleich('Boden in Metern', b[0].punkte, [[0, 0], [4, 0], [4, 3], [0, 3]])
  gleich('Boden Farbe (Eiche in 3D)', b[0].farbe, F.boden3d)
  const draussen = baueSzene({ ...daten, raeume: [raum('b', [[0, 0], [100, 0], [100, 100], [0, 100]], { art: 'draussen' })] }, F)
  gleich('Balkon Farbe', draussen.find((k) => k.rolle === 'boden').farbe, F.bodenDraussen3d)
  const eigen = baueSzene({ ...daten, raeume: [raum('b', [[0, 0], [100, 0], [100, 100], [0, 100]], { bodenfarbe: '#b08a5a' })] }, F)
  gleich('eigene Bodenfarbe', eigen.find((k) => k.rolle === 'boden').farbe, '#b08a5a')
}

/* ------------------------------------------------------------ Waende */
{
  const w = nach('wand')
  // Wohnzimmer: Kante 0 zweigeteilt (Fenster), Kante 1 zweigeteilt (Tuer), 2, 3 ganz = 6.
  // Kueche: Kante 3 (x = 400) ist dieselbe Linie, schon da; 0, 1, 2 ganz = 3.
  gleich('neun Wandstuecke', w.length, 9)
  gleich('zu jeder Wand ein Kopf', nach('wandkopf').length >= w.length, true)
  for (const x of w) {
    wahr('Wand steht auf dem Boden', Math.abs(x.mitte[1] - x.masse[1] / 2) < 1e-9)
    wahr('Wand hat Innenseite', Array.isArray(x.innen) && Math.abs(Math.hypot(...x.innen) - 1) < 1e-9)
    nahe('Wand 12 cm', x.masse[2], 0.12)
  }
  const hoch = w.filter((x) => Math.abs(x.mitte[1] + x.masse[1] / 2 - 2.48) < 1e-9)
  wahr('Wohnzimmerwaende bis 250 cm (Kopf 2 cm)', hoch.length >= 6)
  // Kante 0 des Wohnzimmers ist taubenblau, die anderen ohne Farbe.
  const oben = w.filter((x) => Math.abs(x.mitte[2]) < 1e-9 && x.mitte[0] < 4)
  gleich('obere Wand: zwei Stuecke', oben.length, 2)
  wahr('obere Wand taubenblau', oben.every((x) => x.farbe === '#3e5f7a'))
  wahr('Wand ohne Farbe', w.some((x) => x.farbe === F.wand3d))
  // Innenseite der oberen Wand zeigt nach +z (in den Raum).
  gleich('Innenseite oben', oben[0].innen.map((v) => Math.round(v)), [0, 1])
  // Ecke geschlossen: linkes Stueck der oberen Wand beginnt bei x = -6 cm.
  const links = oben.reduce((p, q) => (q.mitte[0] < p.mitte[0] ? q : p))
  nahe('Ecke um halbe Wand verlaengert', links.mitte[0] - links.masse[0] / 2, -0.06)
  nahe('Stueck endet am Fenster', links.mitte[0] + links.masse[0] / 2, 1.5)
  // Gegen den Uhrzeigersinn gezeichnet: Innenseite trotzdem nach innen.
  const gegen = baueSzene({ ...daten, raeume: [raum('g', [[0, 0], [0, 300], [400, 300], [400, 0]])], oeffnungen: [], objekte: [], kisten: [] }, F)
  const linksWand = gegen.find((k) => k.rolle === 'wand' && Math.abs(k.mitte[0]) < 1e-9)
  gleich('Innenseite bei Gegenlauf', linksWand.innen.map((v) => Math.round(v)), [1, 0])
}

/* ------------------------------------------------------------ Tuer */
{
  const sturz = nach('sturz')
  const tuerSturz = sturz.find((x) => Math.abs(x.mitte[0] - 4) < 1e-9)
  wahr('Sturz ueber der Tuer', !!tuerSturz)
  nahe('Sturz ab Tuerhoehe', tuerSturz.mitte[1] - tuerSturz.masse[1] / 2, 2.0)
  nahe('Sturz bis unter den Kopf', tuerSturz.mitte[1] + tuerSturz.masse[1] / 2, 2.48)
  nahe('Sturz so breit wie die Tuer', tuerSturz.masse[0], 0.9)
  const zarge = nach('zarge')
  gleich('Zarge: zwei Pfosten und oben', zarge.length, 3)
  wahr('Zarge etwas dunkler als das Blatt', zarge.every((x) => x.farbe === F.zarge3d))
  const blatt = nach('tuerblatt')
  gleich('ein Tuerblatt', blatt.length, 1)
  gleich('Blatt weiss', blatt[0].farbe, F.tuer3d)
  // Wand entlang +y (Kante 1: (400,0) -> (400,300)), Blatt 25 Grad zur Innenseite (-x).
  const richtung = -blatt[0].drehY // Winkel in (x, z)
  const wandRichtung = Math.PI / 2
  nahe('Blatt 25 Grad offen', Math.abs(richtung - wandRichtung), (TUER_OFFEN_GRAD * Math.PI) / 180, 1e-9)
  wahr('Blatt schlaegt nach innen auf', blatt[0].mitte[0] < 4)
  const aussen = baueSzene({ ...daten, oeffnungen: [oeffnung('t2', 'w', 'tuer', 1, 100, 90, { aufschlag: 'aussen' })] }, F).find(
    (k) => k.rolle === 'tuerblatt',
  )
  wahr('Blatt schlaegt nach aussen auf', aussen.mitte[0] > 4)
  // Die Tuer ist ein Loch in der gemeinsamen Wand: kein Wandstueck bei y 100..190 auf x = 400.
  const imLoch = nach('wand').filter((x) => Math.abs(x.mitte[0] - 4) < 1e-9 && x.mitte[2] > 1.0 && x.mitte[2] < 1.9)
  gleich('Loch in der gemeinsamen Wand', imLoch.length, 0)
}

/* ------------------------------------------------------------ Fenster */
{
  const scheibe = nach('scheibe')
  gleich('eine Scheibe', scheibe.length, 1)
  gleich('Scheibe blau', scheibe[0].farbe, F.fenster)
  gleich('Scheibe halbdurchsichtig', scheibe[0].deckkraft, SCHEIBE_DECKKRAFT)
  const br = nach('bruestung')
  gleich('eine Bruestung', br.length, 1)
  nahe('Bruestung 90 cm', br[0].masse[1], 0.9)
  gleich('Bruestung in der Wandfarbe', br[0].farbe, '#3e5f7a')
  const sturz = nach('sturz').find((x) => Math.abs(x.mitte[2]) < 1e-9)
  nahe('Fenstersturz ab 210 cm', sturz.mitte[1] - sturz.masse[1] / 2, 2.1)
  wahr('Fensterrahmen weiss', nach('rahmen').length === 4 && nach('rahmen').every((x) => x.farbe === F.rahmen3d))
}

/* ------------------------------------------------------------ Moebel, Regal */
{
  const sofa = alle.filter((k) => k.id === 'sofa')
  // Mit Form (E64): Sockel, Lehnen, Armlehnen, Polster; nichts ragt ueber 80 cm.
  wahr('L-Sofa aus mehreren Teilen', sofa.length >= 8)
  wahr('Sofa hoechstens 80 cm hoch', sofa.every((x) => x.mitte[1] + x.masse[1] / 2 <= 0.8 + 1e-9))
  wahr('Sofa im Stoffton', sofa.some((x) => x.farbe === F.stoff))
  const billy = alle.filter((k) => k.id === 'billy')
  // 2 Seiten + Deckel + 1 Teiler + 3 Bretter (40, 80, 120; 0 steht auf dem Boden).
  gleich('Regal: Seiten, Deckel, Teiler', billy.filter((x) => x.rolle === 'regal').length, 4)
  const bretter = billy.filter((x) => x.rolle === 'brett')
  gleich('Regal: drei Bretter', bretter.length, 3)
  wahr('Bretter in Fachfarbe', bretter.every((x) => x.farbe === F.fach))
  gleich(
    'Brett-Oberkanten',
    bretter.map((x) => Math.round((x.mitte[1] + x.masse[1] / 2) * 100)),
    [40, 80, 120],
  )
  nahe('Brett ueber die ganze Breite', bretter[0].masse[0], 0.8)
  const teiler = billy.find((x) => x.rolle === 'regal' && Math.abs(x.masse[0] - 0.02) < 1e-9 && x.mitte[0] > 0.3 && x.mitte[0] < 0.9)
  wahr('Teiler in der Mitte', !!teiler)
}

/* ------------------------------------------------------------ Kisten */
{
  const a = alle.find((k) => k.id === 'a')
  const b = alle.find((k) => k.id === 'b')
  const c = alle.find((k) => k.id === 'c')
  nahe('Kiste a steht auf dem Boden', a.mitte[1] - a.masse[1] / 2, 0.0025)
  nahe('Kiste b ab 40 cm', b.mitte[1] - b.masse[1] / 2, 0.4025)
  nahe('Kiste echte Laenge', a.masse[0], 0.595)
  nahe('gedreht: Laenge entlang z', c.masse[2], 0.595)
  gleich('gesuchte Kiste rot', b.farbe, F.hervor)
  gleich('gesuchte Kiste deckend', b.deckkraft, 1)
  gleich('gesuchte Kiste mit Kante', b.kante, F.kisteRand)
  gleich('andere gedaempft', a.deckkraft, GEDAEMPFT)
  gleich('andere in Zimmerfarbe', a.farbe, '#2563EB')
  gleich('hervorMitte', hervorMitte(alle), b.mitte)
  const ohne = baueSzene(daten, F)
  wahr('ohne Suche alle deckend', ohne.filter((k) => k.rolle === 'kiste').every((k) => k.deckkraft === 1))
  gleich('ohne Suche keine Mitte', hervorMitte(ohne), null)
  const moebel = baueSzene(daten, F, { hervor: 'm1' })
  wahr('Moebel-Eintrag: Schrank rot', moebel.filter((k) => k.id === 'schrank' && k.rolle === 'regal').every((k) => k.farbe === F.hervor))
}

/* ------------------------------------------------------------ Ausschnitt */
{
  const w = baueSzene(daten, F, { raumId: 'w', hervor: 'b' })
  gleich('nur ein Boden', w.filter((k) => k.rolle === 'boden').length, 1)
  wahr('keine Kiste der Kueche', !w.some((k) => k.id === 'c'))
  wahr('kein Schrank der Kueche', !w.some((k) => k.id === 'schrank'))
  // Wohnzimmer: 6 Stuecke, die gemeinsame Wand in seiner Hoehe (250).
  gleich('Waende des Wohnzimmers', w.filter((k) => k.rolle === 'wand').length, 6)
  wahr('keine Kuechenwand', !w.some((k) => k.rolle === 'wand' && k.mitte[0] > 4.1))
  const r = szeneRahmen(w)
  wahr('Rahmen um den Raum', r.x0 < 0 && r.x1 > 4 && r.x1 < 4.2 && r.hoehe === 2.5)
  gleich('leere Szene', szeneRahmen([]), null)
  const k = baueSzene(daten, F, { raumId: 'k' })
  // Die Tuer gehoert zum Wohnzimmer, liegt aber auf der Kuechenwand: sie gehoert dazu.
  gleich('Tuer des Nachbarn auf der Wand', k.filter((x) => x.rolle === 'tuerblatt').length, 1)
  const unbekannt = baueSzene(daten, F, { raumId: 'gibtsnicht' })
  gleich('unbekannter Raum zeigt alles', unbekannt.filter((x) => x.rolle === 'boden').length, 2)
}

/* ------------------------------------------------------------ Zahlen */
for (const k of alle) {
  const zahlen = k.art === 'quader' ? [...k.mitte, ...k.masse, k.drehY, k.deckkraft] : k.punkte.flat()
  if (!zahlen.every(Number.isFinite)) {
    console.log('ABWEICHUNG keine Zahl in', k.rolle, k.id)
    fehler++
  }
  if (k.art === 'quader' && !k.masse.every((v) => v > 0)) {
    console.log('ABWEICHUNG leerer Quader', k.rolle, k.id)
    fehler++
  }
}

if (fehler) {
  console.log(`${fehler} Abweichungen`)
  process.exit(1)
}
console.log('ok')
