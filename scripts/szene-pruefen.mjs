// Prueft die reine Rechnung der 3D-Ansicht (src/components/plan3d/szene.ts)
// ohne Browser und ohne three: Boden, Waende mit Loechern, Sturz,
// Bruestung, Tuer mit Blatt in der Stellung zu (E82, der Motor oeffnet),
// Klinken und Schluessel, Fenster blau mit Scheibe, Moebel (L = zwei
// Quader), Regal mit Seiten und Brettern, Kisten in echter Groesse ab
// unten_cm, gesuchte rot, andere gedaempft, offene Kiste, der Ausschnitt
// auf einen Raum; dazu E82: Moebelart am Namen, Teil-Felder (Platz, Ding,
// Geraet, Spiegel, Neigung, Griff), automatische Schalter, Balkon, Deko.
// Aufruf im Projektordner: node scripts/szene-pruefen.mjs
// Ausgabe "ok" oder die abweichenden Faelle, Exit 1 bei Fehlern.
import { baueSzene, blickAus, hervorMitte, lichter, moebelQuader, szeneRahmen, GEDAEMPFT, SCHEIBE_DECKKRAFT } from '../src/components/plan3d/szene.ts'
import { moebelTeile } from '../src/components/plan3d/moebel3d.ts'
import { autoSchalter, symbolAnWand } from '../src/components/plan/hilfe.ts'
import { DEKO_ARTEN, istDeko, moebelArt } from '../src/components/plan/moebelArt.ts'

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
  schalter3d: '#f6f4ef',
  spiegel: '#c3d0d6',
  griff: '#c9ced4',
  wasser: '#9fd3ee',
  bildschirm: '#14161a',
  rasen: '#7f9a5c',
  weg: '#b9b2a4',
  baum: '#4f7340',
  stamm: '#6b5340',
  hecke: '#5d7f47',
  himmelOben: '#9cc3e4',
  himmelUnten: '#e4ecef',
  fassade: '#e9e4da',
  pappe: '#c49a6c',
  leinen: '#e2dccf',
  spielRot: '#d0573f',
  spielBlau: '#4f7fb8',
  spielGelb: '#e3b341',
  spielGruen: '#6aa060',
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
  // Wand entlang +y (Kante 1: (400,0) -> (400,300)). E82: das Blatt ist in
  // der Stellung zu beschrieben, entlang der Wand; der Motor oeffnet es.
  const richtung = -blatt[0].drehY // Winkel in (x, z)
  const wandRichtung = Math.PI / 2
  nahe('Blatt zu: entlang der Wand', richtung, wandRichtung, 1e-9)
  nahe('Blatt zu: drehY ist tuer.zu', blatt[0].drehY, blatt[0].tuer.zu, 1e-12)
  nahe('Blatt zu: in der Wand', blatt[0].mitte[0], 4, 1e-9)
  // Mitte = Angel + halbe Laenge in Richtung zu (wie der Motor rechnet).
  nahe('Blatt zu: Mitte x aus Angel', blatt[0].mitte[0], blatt[0].tuer.angel[0] + (Math.cos(blatt[0].tuer.zu) * blatt[0].tuer.laenge) / 2, 1e-9)
  nahe('Blatt zu: Mitte z aus Angel', blatt[0].mitte[2], blatt[0].tuer.angel[1] - (Math.sin(blatt[0].tuer.zu) * blatt[0].tuer.laenge) / 2, 1e-9)
  // Offen zeigt das Blatt in x-Richtung cos(auf): nach innen (Wohnzimmer, -x).
  wahr('Blatt schlaegt nach innen auf', Math.cos(blatt[0].tuer.auf) < -0.99)
  const aussen = baueSzene({ ...daten, oeffnungen: [oeffnung('t2', 'w', 'tuer', 1, 100, 90, { aufschlag: 'aussen' })] }, F).find(
    (k) => k.rolle === 'tuerblatt',
  )
  wahr('Blatt schlaegt nach aussen auf', Math.cos(aussen.tuer.auf) > 0.99)
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

/* ------------------------------------------------------------ Schalter an der Wand (E74) */
{
  // Schalter 30 cm neben der Wand (y = 0) im Wohnzimmer, schaltet die Kueche.
  // Steckdose mitten im Raum: sitzt trotzdem an der naechsten Wand.
  const mit = {
    ...daten,
    grundriss: {
      ...daten.grundriss,
      symbole: [
        { id: 's1', art: 'schalter', x: 60, y: 30, schaltet: 'k' },
        { id: 's2', art: 'steckdose', x: 200, y: 160 },
        { id: 's3', art: 'schalter', x: 420, y: 150 },
      ],
    },
  }
  const k = baueSzene(mit, F)
  // Das Wohnzimmer hat keinen eigenen Schalter (s1 schaltet die Kueche): es
  // bekommt einen automatischen (E82, Id des Raums 'w'), siehe unten.
  const sch = k.filter((x) => x.rolle === 'schalter' && x.id === 'k')
  wahr('Schalter: zwei Platten je Schalter', sch.length === 4)
  gleich('automatischer Schalter im Wohnzimmer', k.filter((x) => x.rolle === 'schalter' && x.id === 'w').length, 2)
  wahr('Schalter an der Wand (Innenseite 6 cm)', sch.filter((x) => x.id === 'k' && x.mitte[2] < 0.1).every((x) => x.mitte[2] > 0.06 && x.mitte[2] < 0.08))
  wahr('Schalter schaltet laut Plan die Kueche', sch.some((x) => x.id === 'k' && x.mitte[0] < 1))
  wahr('Schalter in 105 cm', sch.every((x) => Math.abs(x.mitte[1] - 1.05) < 1e-9))
  wahr('Schalter unauffaellig weiss', sch.every((x) => x.farbe === F.schalter3d))
  const dose = k.filter((x) => x.rolle === 'moebel' && x.id === null && Math.abs(x.mitte[1] - 0.3) < 1e-9)
  wahr('Steckdose nicht mitten im Raum', dose.length === 1 && (dose[0].mitte[2] > 2.9 || dose[0].mitte[2] < 0.1))
  // s3 liegt in der Kueche vor der Tuer der gemeinsamen Wand (y 100..190): nicht in der Tuer.
  const k3 = sch.filter((x) => x.id === 'k' && x.mitte[0] > 4)
  wahr('Schalter nicht in einer Tuer', k3.length === 2 && k3.every((x) => x.mitte[2] < 1.0 || x.mitte[2] > 1.9 || x.mitte[0] > 4.2))
  // Teppiche lassen sich ausblenden.
  const mitTeppich = { ...daten, objekte: [...daten.objekte, objekt('Teppich', 'w', 'moebel', { x: 50, y: 50, breite_cm: 120, tiefe_cm: 80, hoehe_cm: 1 })] }
  wahr('Teppich sichtbar', baueSzene(mitTeppich, F).some((x) => x.id === 'Teppich'))
  wahr('Teppich ausgeblendet', !baueSzene(mitTeppich, F, { teppiche: false }).some((x) => x.id === 'Teppich'))
}

/* ------------------------------------------------------------ Eckbank und Mauer (E73) */
{
  // Eckbank als L um einen Mauervorsprung: Ausschnitt links unten (Front), 159 x 15.
  const bank = { breite_cm: 180, tiefe_cm: 65, hoehe_cm: 85, form: 'l', ausschnitt_breite_cm: 159, ausschnitt_tiefe_cm: 15, ausschnitt_ecke: 'lu', farbe: null }
  const teile = moebelTeile(bank, 'bank', F, 250)
  wahr('Eckbank: nichts im Ausschnitt', teile.every((q) => !(q.x0 < 159 - 0.01 && q.y1 > 50 + 0.01)))
  wahr('Eckbank: Spalte bis vorne', teile.some((q) => q.x0 >= 159 && q.y1 >= 65 - 0.01))
  wahr('Eckbank: Klappen an beiden Kaesten', teile.filter((q) => q.front?.art === 'tuer').some((q) => q.y1 === 50) && teile.filter((q) => q.front?.art === 'tuer').some((q) => q.y1 === 65))
  const mauer = moebelTeile({ breite_cm: 29, tiefe_cm: 65, hoehe_cm: 250, form: 'rechteck', farbe: null }, 'mauer', F, 250)
  gleich('Mauer: ein Block', mauer.length, 1)
  gleich('Mauer in der Wandfarbe', mauer[0].farbe, F.wand3d)
  gleich('Mauer bis zur Decke', mauer[0].z1, 250)
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

/* ------------------------------------------------------------ Moebelart am Namen (E82) */
{
  // Die Namen der echten Wohnung behalten ihre Art; Deko und Spielzeug
  // werden erkannt, auch wenn ihr Name ein Moebelwort enthaelt.
  const namen = [
    ['Küchenzeile', 'kuechenzeile'],
    ['Hochschrank mit Backofen und Mikrowelle', 'backofen'],
    ['Hochschrank mit Einbaukühlschrank', 'hochschrank'],
    ['Eckbank Nord BESTÅ 180 + KUDDARNA', 'bank'],
    ['TONSTAD Ausziehtisch', 'tisch'],
    ['STOCKHOLM 2025 Stuhl', 'stuhl'],
    ['SINNERLIG Hängeleuchte', 'haengelampe'],
    ['TIDTABELL Teppich', 'teppich'],
    ['VIMLE Sofa mit Récamiere', 'sofa'],
    ['HOLMERUD Couchtisch', 'couchtisch'],
    ['TONSTAD TV-Bank', 'tv_board'],
    ['Fernseher an der Wand', 'fernseher'],
    ['ÅRSTID Stehlampe', 'stehlampe'],
    ['FEJKA Ficus', 'pflanze'],
    ['SLÄKT/NATTAPA Juniorbett', 'kinderbett'],
    ['LÄTT Kindertisch', 'tisch'],
    ['LÄTT Kinderstuhl', 'stuhl'],
    ['ENHET Sockel mit Auszug', 'sockel'],
    ['NÄMMARÖ Klappstuhl', 'stuhl'],
    ['Pflanze MÅBÄRSBUSKE', 'pflanze'],
    ['LETTAN Spiegel', 'spiegel'],
    ['Handwaschbecken', 'waschbecken'],
    ['ALSTERN Badematte', 'teppich'],
    ['Elternbett', 'bett'],
    ['BRIMNES Nachttisch', 'nachttisch'],
    ['MICKE Schreibtisch', 'schreibtisch'],
    ['TOSSBERG Drehstuhl', 'buerostuhl'],
    ['STORKLINTA Kommode', 'kommode'],
    ['NÄMMARÖ Tisch', 'tisch'],
    ['Sofakissen', 'kissen'],
    ['Kinderküche Holz', 'spielkueche'],
    ['Blumenkasten Kräuter', 'blumenkasten'],
    ['Obstkorb', 'obstschale'],
    ['Wandbild Berge', 'bild'],
    ['Spielzeugkorb', 'spielzeugkiste'],
    ['Kuscheltier Bär', 'kuscheltier'],
    ['Wolldecke', 'wolldecke'],
    ['Vorhang Leinen', 'vorhang'],
    ['Bücherstapel', 'buecher'],
    // Gegenbeispiele aus der Pruefung (E82): kein Deko-Buch, keine Deko-Kissen-Bank.
    ['مكتب', null],
    ['مكتبة', null],
    ['خزانة كتب', null],
    ['Bücherregal', null],
    ['Bücherschrank', null],
    ['Sitzbank mit Kissen', 'bank'],
    ['Eckbankkissen', 'kissen'],
    ['Sitzkissen Baumwolle, outdoor', 'kissen'],
    ['Bücher', 'buecher'],
    ['Bilderbücher, Stapel', 'buecher'],
    ['كتب', 'buecher'],
    ['طاولة مكتب', 'schreibtisch'],
    ['Bauklötze Holz', 'bausteine'],
    // Fallen im Arabischen: "مكتب" enthaelt "كتب", "مغسلة" enthaelt "سلة".
    ['طاولة مكتب', 'schreibtisch'],
    ['كرسي مكتب', 'buerostuhl'],
    ['مغسلة يدين', 'waschbecken'],
    ['سلة', 'korb'],
    ['وسادة', 'kissen'],
    // Nie das blosse "bild": der Bildschirm ist kein Bild.
    ['Bildschirm', null],
  ]
  for (const [name, art] of namen) gleich(`Moebelart: ${name}`, moebelArt(name), art)
  wahr('Deko-Arten: Kissen ja, Sockel nein', DEKO_ARTEN.has('kissen') && !DEKO_ARTEN.has('sockel'))
  wahr('istDeko nur fuer Moebel', istDeko({ art: 'moebel', name: 'Wolldecke' }) && !istDeko({ art: 'regal', name: 'Bücherregal' }))
  wahr('Sockel ist keine Deko', !istDeko({ art: 'moebel', name: 'ENHET Sockel mit Auszug' }))
}

/* ------------------------------------------------------------ Teil-Felder (E82) */
// Blickrichtung wie die Kamera (drehY 0 = Blick nach -z): Richtung (-sin, -cos).
const blickRichtung = (b) => [-Math.sin(b), -Math.cos(b)]
// Drehung wie der Motor (Euler 'YXZ' mit drehY 0): erst um z, dann um x.
function drehe([x, y, z], k) {
  const cz = Math.cos(k.z)
  const sz = Math.sin(k.z)
  const x1 = x * cz - y * sz
  const y1 = x * sz + y * cz
  const cx = Math.cos(k.x)
  const sx = Math.sin(k.x)
  return [x1, y1 * cx - z * sx, y1 * sx + z * cx]
}
{
  nahe('blickAus: nach -z ist 0', blickAus(0, -1), 0, 1e-12)
  nahe('blickAus: nach +x ist -Pi/2', blickAus(1, 0), -Math.PI / 2, 1e-12)
  nahe('blickAus: nach +z ist Pi', blickAus(0, 1), Math.PI, 1e-12)
  // Ein Sitz in einem Moebel 80 x 60 an (200, 100): lokal x 10..70, y 10..50,
  // Oberseite 45 cm. Blick vorn = lokal +y.
  const sitz = { x0: 10, y0: 10, x1: 70, y1: 50, z0: 30, z1: 45, farbe: '#888888', platz: { art: 'sitz', blick: 'vorn' } }
  const vorn = { 0: [0, 1], 90: [-1, 0], 180: [0, -1], 270: [1, 0] }
  // Mitte der Oberseite (lokal 40, 30) im Plan, je Drehung.
  const mitte = { 0: [240, 130], 90: [170, 140], 180: [160, 70], 270: [230, 60] }
  for (const drehung of [0, 90, 180, 270]) {
    const o = objekt('s' + drehung, 'w', 'moebel', { x: 200, y: 100, breite_cm: 80, tiefe_cm: 60, hoehe_cm: 90, drehung })
    const q = moebelQuader(o, [sitz], F, null, false)[0]
    gleich(`Platz ${drehung}: Art`, q.platz.art, 'sitz')
    const [dx, dz] = blickRichtung(q.platz.blick)
    nahe(`Platz ${drehung}: Blick x`, dx, vorn[drehung][0], 1e-9)
    nahe(`Platz ${drehung}: Blick z`, dz, vorn[drehung][1], 1e-9)
    nahe(`Platz ${drehung}: Punkt x`, q.platz.punkt[0], mitte[drehung][0] / 100, 1e-9)
    nahe(`Platz ${drehung}: Punkt y oben`, q.platz.punkt[1], 0.45, 1e-9)
    nahe(`Platz ${drehung}: Punkt z`, q.platz.punkt[2], mitte[drehung][1] / 100, 1e-9)
    nahe(`Platz ${drehung}: Punkt = Oberseite des Quaders`, q.platz.punkt[1], q.mitte[1] + q.masse[1] / 2, 1e-9)
  }
  // Die anderen Blickrichtungen bei Drehung 0: links = -x, rechts = +x, hinten = -z.
  const o0 = objekt('s', 'w', 'moebel', { x: 0, y: 0, breite_cm: 80, tiefe_cm: 60, hoehe_cm: 90 })
  for (const [blick, soll] of [['links', [-1, 0]], ['rechts', [1, 0]], ['hinten', [0, -1]]]) {
    const q = moebelQuader(o0, [{ ...sitz, platz: { art: 'liegen', blick } }], F, null, false)[0]
    const [dx, dz] = blickRichtung(q.platz.blick)
    nahe(`Blick ${blick} x`, dx, soll[0], 1e-9)
    nahe(`Blick ${blick} z`, dz, soll[1], 1e-9)
    gleich(`Blick ${blick}: liegen`, q.platz.art, 'liegen')
  }

  // Ding, Geraet, Spiegel, Tuer mit Griff, Neigung; Moebel um 90 Grad gedreht.
  const o = objekt('tv', 'w', 'moebel', { x: 0, y: 0, breite_cm: 120, tiefe_cm: 40, hoehe_cm: 60, drehung: 90 })
  const teile = [
    { x0: 0, y0: 0, x1: 20, y1: 10, z0: 60, z1: 70, farbe: '#ff0000', ding: 'vase' },
    { x0: 0, y0: 0, x1: 100, y1: 5, z0: 0, z1: 60, farbe: '#000000', geraet: { art: 'tv', teil: 'aus', nr: 2 } },
    { x0: 0, y0: 0, x1: 4, y1: 4, z0: 60, z1: 80, farbe: '#9fd3ee', geraet: { art: 'wasser', teil: 'an' } },
    { x0: 0, y0: 0, x1: 60, y1: 2, z0: 0, z1: 80, farbe: '#cccccc', spiegel: true },
    { x0: 0, y0: 39, x1: 50, y1: 40, z0: 0, z1: 60, farbe: '#d4b48a', front: { art: 'tuer', angel: 'min', auf: 1, gruppe: 3 } },
    { x0: 44, y0: 40, x1: 46, y1: 42, z0: 25, z1: 35, farbe: '#c9ced4', front: { art: 'griff', gruppe: 3 } },
    { x0: 60, y0: 39, x1: 110, y1: 40, z0: 0, z1: 60, farbe: '#d4b48a', front: { art: 'tuer', angel: 'max', auf: 1 } },
  ]
  const q = moebelQuader(o, teile, F, null, false)
  const ding = q.find((x) => x.rolle === 'ding')
  wahr('Ding: Rolle und Kennung', !!ding && ding.ding === 'tv:vase' && ding.id === 'tv')
  const tv = q.find((x) => x.geraet?.art === 'tv')
  gleich('Geraet TV', tv?.geraet, { id: 'tv:g2', art: 'tv', teil: 'aus' })
  gleich('Geraet Wasser ohne nr', q.find((x) => x.geraet?.art === 'wasser')?.geraet, { id: 'tv:g0', art: 'wasser', teil: 'an' })
  const spiegel = q.find((x) => x.rolle === 'spiegel')
  // Lokal +y bei 90 Grad: Plan (-1, 0), also Welt -x.
  wahr('Spiegel: Normale lokal +y in der Welt', !!spiegel && Math.abs(spiegel.normale[0] + 1) < 1e-12 && Math.abs(spiegel.normale[1]) < 1e-12)
  const tueren = q.filter((x) => x.rolle === 'front' && x.tuer)
  gleich('Tuer mit gruppe heisst nach ihr', tueren.map((x) => x.tuer.id), ['tv:t3', 'tv:t6'])
  const tuer = tueren[0]
  nahe('Moebeltuer zu beschrieben', tuer.drehY, tuer.tuer.zu, 1e-12)
  const griff = q.find((x) => x.rolle === 'griff')
  gleich('Griff dreht mit seiner Tuer', griff?.tuer, tuer.tuer)
  // In der Stellung zu: an seinem Platz (lokal 45, 41 -> Plan -41, 45), nicht gedreht.
  wahr('Griff zu beschrieben', !!griff && Math.abs(griff.mitte[0] + 0.41) < 1e-9 && Math.abs(griff.mitte[2] - 0.45) < 1e-9 && griff.drehY === 0)

  // Neigung: die Oberkante wandert bei laengs nach lokal -y, bei quer nach lokal +x.
  const richtungen = { 0: { y: [0, 1], x: [1, 0] }, 90: { y: [-1, 0], x: [0, 1] }, 180: { y: [0, -1], x: [-1, 0] }, 270: { y: [1, 0], x: [0, -1] } }
  const w = (10 * Math.PI) / 180
  for (const drehung of [0, 90, 180, 270]) {
    const od = objekt('k' + drehung, 'w', 'moebel', { x: 50, y: 50, breite_cm: 100, tiefe_cm: 60, hoehe_cm: 90, drehung })
    for (const [achse, ziel] of [['laengs', richtungen[drehung].y.map((v) => -v)], ['quer', richtungen[drehung].x]]) {
      const t = moebelQuader(od, [{ x0: 0, y0: 0, x1: 100, y1: 10, z0: 40, z1: 90, farbe: '#888888', kipp: { [achse]: 10 } }], F, null, false)[0]
      const oben = drehe([0, 1, 0], t.kipp)
      nahe(`Neigung ${achse} ${drehung}: Oberkante x`, oben[0], ziel[0] * Math.sin(w), 1e-9)
      nahe(`Neigung ${achse} ${drehung}: Oberkante z`, oben[2], ziel[1] * Math.sin(w), 1e-9)
    }
  }
}

/* ------------------------------------------------------------ Klinken und Schluessel (E82) */
{
  const blatt = alle.find((k) => k.rolle === 'tuerblatt')
  const teile = alle.filter((k) => k.tuer?.id === 't1' && k !== blatt)
  const griffe = teile.filter((k) => k.rolle === 'griff')
  const schluessel = teile.filter((k) => k.rolle === 'schluessel')
  gleich('Beschlag: je Seite Rosette, Hals, Klinke, Schlossrosette', griffe.length, 8)
  gleich('Schluessel: Bart und Reide', schluessel.length, 2)
  for (const q of [...griffe, ...schluessel]) {
    nahe('Beschlag in der Stellung zu', q.drehY, blatt.tuer.zu, 1e-12)
    gleich('Beschlag dreht mit dem Blatt', q.tuer, blatt.tuer)
    gleich('Beschlag ohne Innenseite', q.innen, null)
    gleich('Beschlag silbern', q.farbe, F.griff)
    wahr('Beschlag glaenzt', q.glanz >= 0.8)
    wahr('Beschlag rund', !!q.form || q.rund > 0)
  }
  // Innenseite des Wohnzimmers ist -x, das Blatt steht bei x = 4.
  const seiten = new Set(griffe.map((q) => Math.sign(q.mitte[0] - 4)))
  wahr('Beschlag auf beiden Seiten', seiten.has(1) && seiten.has(-1))
  // Angel bei y = 104 (Zarge 4 cm), Schlosskante bei 186: Achse 65 mm davor.
  const rosetten = griffe.filter((q) => q.form?.art === 'zylinder' && Math.abs(q.masse[0] - 0.052) < 1e-9)
  gleich('vier Rosetten', rosetten.length, 4)
  wahr('Rosetten auf der Achse', rosetten.every((q) => Math.abs(q.mitte[2] - (1.86 - 0.065)) < 1e-9))
  nahe('Rosette 8 mm', rosetten[0].masse[2], 0.008, 1e-12)
  const klinken = griffe.filter((q) => Math.abs(q.masse[0] - 0.125) < 1e-9)
  gleich('zwei Klinken', klinken.length, 2)
  wahr('Klinke auf 105 cm', klinken.every((q) => Math.abs(q.mitte[1] - 1.05) < 1e-9))
  wahr('Klinke zeigt zur Angel', klinken.every((q) => q.mitte[2] < 1.795 && q.mitte[2] - q.masse[0] / 2 > 1.04))
  wahr('Schlossrosette 72 mm unter der Klinke', rosetten.filter((q) => Math.abs(q.mitte[1] - (1.05 - 0.072)) < 1e-9).length === 2)
  wahr('Schluessel auf der Raumseite', schluessel.every((q) => q.mitte[0] < 4 - 0.02))
  const raus = Math.max(...schluessel.map((q) => 4 - q.mitte[0] + q.masse[2] / 2)) - 0.02
  wahr('Schluessel etwa 6 cm', raus > 0.05 && raus < 0.075)
  // Kein Hindernis: Rollen griff und schluessel.
  wahr('Beschlag kein Hindernis', [...griffe, ...schluessel].every((q) => q.rolle === 'griff' || q.rolle === 'schluessel'))

  // Wohnungstuer (Aussenwand x = 0): der Schluessel steckt innen.
  const eingang = baueSzene({ ...daten, oeffnungen: [oeffnung('e', 'w', 'tuer', 3, 100, 90)] }, F)
  wahr('Wohnungstuer: Schluessel innen', eingang.filter((k) => k.rolle === 'schluessel').every((k) => k.mitte[0] > 0.02))
  // Tuer, die zur Loggia gehoert: der Schluessel steckt in der Wohnung.
  const loggia = raum('l', [[0, 300], [400, 300], [400, 450], [0, 450]], { art: 'draussen' })
  const lt = baueSzene({ ...daten, raeume: [wohn, kueche, loggia], oeffnungen: [oeffnung('lt', 'l', 'tuer', 0, 150, 90)] }, F)
  const ls = lt.filter((k) => k.rolle === 'schluessel')
  wahr('Loggiatuer: Schluessel in der Wohnung', ls.length === 2 && ls.every((k) => k.mitte[2] < 3 - 0.02))
}

/* ------------------------------------------------------------ Automatische Schalter (E82) */
{
  // Nur die Kueche hat einen Schalter.
  const d = { ...daten, grundriss: { ...daten.grundriss, symbole: [{ id: 's1', art: 'schalter', x: 420, y: 150 }] } }
  const a = autoSchalter(d)
  gleich('autoSchalter: genau einer', a.length, 1)
  gleich('autoSchalter: Id und Raum', [a[0].id, a[0].art, a[0].schaltet, a[0].auto], ['auto:w', 'schalter', 'w', true])
  gleich('autoSchalter: sitzt im Wohnzimmer', symbolAnWand([a[0].x, a[0].y], d)?.raumId, 'w')
  // Tuer t1: Angel links bei y = 100, Schloss bei 190; 15 cm daneben, innen an der Wand x = 400.
  nahe('autoSchalter: an der Tuerwand innen', a[0].x, 394, 1e-9)
  nahe('autoSchalter: Griffseite, 15 cm neben der Zarge', a[0].y, 205, 1e-9)
  // Tuer rechts angeschlagen: dann auf der anderen Seite.
  const r = autoSchalter({ ...d, oeffnungen: [oeffnung('t1', 'w', 'tuer', 1, 100, 90, { anschlag: 'rechts' }), daten.oeffnungen[1]] })
  nahe('autoSchalter: rechts angeschlagen, Griffseite oben', r[0].y, 85, 1e-9)
  // Jeder Raum hat einen: keiner dazu. Auch "schaltet" zaehlt.
  gleich('autoSchalter: keiner, wenn jeder Raum einen hat', autoSchalter({ ...d, grundriss: { ...d.grundriss, symbole: [...d.grundriss.symbole, { id: 's2', art: 'schalter', x: 50, y: 30 }] } }).length, 0)
  const ueber = { ...d, grundriss: { ...d.grundriss, symbole: [{ id: 's3', art: 'schalter', x: 50, y: 30, schaltet: 'k' }] } }
  gleich('autoSchalter: schaltet zaehlt fuer den geschalteten Raum', autoSchalter(ueber).map((x) => x.schaltet), ['w'])
  gleich('autoSchalter: ohne Schalter je Raum einer', autoSchalter({ ...daten, grundriss: { ...daten.grundriss, symbole: [] } }).length, 2)
  // Loggia (draussen) ohne Schalter bekommt einen, in sich.
  const loggia = raum('l', [[0, 300], [400, 300], [400, 450], [0, 450]], { art: 'draussen' })
  const mitLoggia = { ...d, raeume: [wohn, kueche, loggia], oeffnungen: [...daten.oeffnungen, oeffnung('lt', 'l', 'tuer', 0, 150, 90)] }
  const al = autoSchalter(mitLoggia).find((x) => x.schaltet === 'l')
  gleich('autoSchalter: Loggia', al && symbolAnWand([al.x, al.y], mitLoggia)?.raumId, 'l')
  // 3D: zwei Platten auf 105 cm, sie schalten das Wohnzimmer.
  const k = baueSzene(d, F).filter((x) => x.rolle === 'schalter' && x.id === 'w')
  gleich('autoSchalter in 3D: zwei Platten', k.length, 2)
  wahr('autoSchalter in 3D: 105 cm', k.every((x) => Math.abs(x.mitte[1] - 1.05) < 1e-9))
}

/* ------------------------------------------------------------ Balkon (E82) */
const balkonDaten = {
  ...daten,
  grundriss: { ...daten.grundriss, symbole: [] },
  raeume: [raum('b', [[0, 0], [360, 0], [360, 150], [0, 150]], { art: 'draussen' })],
  oeffnungen: [],
  objekte: [],
  kisten: [],
}
const balkon = baueSzene(balkonDaten, F)
{
  gleich('Balkon: keine Wand', balkon.filter((x) => x.rolle === 'wand').length, 0)
  const br = balkon.filter((x) => x.rolle === 'bruestung')
  const pfosten = br.filter((x) => Math.abs(x.masse[0] - 0.04) < 1e-9 && Math.abs(x.masse[2] - 0.04) < 1e-9)
  // 360 cm: 3 Felder je 120 (4 Pfosten), 150 cm: 2 Felder je 75 (3 Pfosten); je zwei Seiten.
  gleich('Balkon: Pfosten', pfosten.length, 14)
  wahr('Pfosten rund, Metall, bis 1 m', pfosten.every((x) => x.rund > 0 && x.farbe === F.metall && Math.abs(x.mitte[1] + x.masse[1] / 2 - 1) < 1e-9))
  const lauf = br.filter((x) => x.form?.art === 'zylinder')
  gleich('Handlauf rund je Seite', lauf.length, 4)
  wahr('Handlauf entlang der Kante', lauf.every((x) => x.form.achse === 'x' && x.innen === null))
  nahe('Handlauf 45 mm', lauf[0].masse[1], 0.045, 1e-12)
  wahr('Handlauf oben 1,00 bis 1,05 m', lauf.every((x) => x.mitte[1] + x.masse[1] / 2 >= 1 && x.mitte[1] + x.masse[1] / 2 <= 1.05))
  const glas = br.filter((x) => x.deckkraft < 1)
  gleich('Glas zwischen den Pfosten', glas.length, 10)
  wahr('Glas ist das Hindernis (Bruestung mit Innenseite)', glas.every((x) => x.deckkraft === 0.22 && Array.isArray(x.innen)))
  wahr('Fussleiste unten', br.some((x) => !x.form && x.masse[0] > 1 && x.mitte[1] < 0.15))
  const boden = balkon.filter((x) => x.art === 'quader' && x.rolle === 'boden')
  const platte = boden.filter((x) => Math.abs(x.masse[1] - 0.16) < 1e-9)
  wahr('Balkonplatte 16 cm, Oberkante bei 0', platte.length >= 1 && platte.every((x) => Math.abs(x.mitte[1] + x.masse[1] / 2) < 0.01))
  wahr('Platte steht ueber den Rand', platte.some((x) => x.mitte[0] - x.masse[0] / 2 < -0.03))
  const dielen = boden.filter((x) => Math.abs(x.masse[1] - 0.02) < 1e-9)
  // 150 cm quer im Raster 14,5: 11 Dielen (die letzte schmaler), entlang der langen Seite (x).
  gleich('Dielen', dielen.length, 11)
  wahr('Dielen 14 cm, entlang x', dielen.every((x) => Math.abs(x.masse[0] - 3.6) < 1e-9 && x.masse[2] <= 0.14 + 1e-9))
  wahr('Dielen mit Fuge', Math.abs(dielen[1].mitte[2] - dielen[0].mitte[2] - 0.145) < 1e-9)
  wahr('Dielen kein Hindernis, unter 0,3 m', dielen.every((x) => x.mitte[1] + x.masse[1] / 2 < 0.3))
  wahr('Dielen im Holzton', dielen.every((x) => /^#[0-9a-f]{6}$/.test(x.farbe) && x.farbe !== F.holz))
  // Wandleuchte an der Hauswand statt Deckenplatte (Loggia am Wohnzimmer).
  const loggia = raum('l', [[0, 300], [400, 300], [400, 450], [0, 450]], { art: 'draussen' })
  const ld = { ...daten, grundriss: { ...daten.grundriss, symbole: [] }, raeume: [wohn, kueche, loggia] }
  const licht = lichter(ld).find((l) => l.raumId === 'l')
  wahr('Loggia: Wandleuchte', !!licht && Array.isArray(licht.wand) && Math.abs(licht.wand[1] - 1) < 1e-12)
  nahe('Loggia: Licht vor der Hauswand', licht.pos[2], 3 + 0.06 + 0.15, 1e-9)
  const leuchten = baueSzene(ld, F).filter((x) => x.rolle === 'leuchte' && x.id === 'l')
  wahr('Loggia: Leuchte auf 2 m an der Wand', leuchten.length === 1 && Math.abs(leuchten[0].mitte[1] - 1.99) < 0.02 && leuchten[0].mitte[2] < 3.2)
  wahr('Loggia: keine Deckenplatte', !baueSzene(ld, F).some((x) => x.rolle === 'leuchte' && x.id === 'l' && Math.abs(x.masse[0] - 0.34) < 1e-9))
}

/* ------------------------------------------------------------ Offene Kiste (E82) */
const offen = baueSzene(daten, F, { offeneKiste: 'a' })
{
  const teile = offen.filter((x) => x.id === 'a')
  wahr('offene Kiste: alles Kiste mit ihrer Id', teile.length > 10 && teile.every((x) => x.rolle === 'kiste' && x.id === 'a'))
  wahr('offene Kiste: Pappe', teile.some((x) => x.farbe === F.pappe))
  const klappen = teile.filter((x) => x.kipp)
  gleich('offene Kiste: vier Klappen', klappen.length, 4)
  wahr('Klappen 115 Grad', klappen.every((x) => Math.abs(Math.abs(x.kipp.x) + Math.abs(x.kipp.z) - (115 * Math.PI) / 180) < 1e-9))
  // Kiste a: 60 x 40 x 40 bei (300, 150), unten 0. Oberkante der Waende 39,75 cm,
  // Waende 5 mm innen am Rand (Kiste 59,5 x 39,5).
  const oben = 0.3975
  for (const q of klappen) {
    const e = q.kipp.x ? [0, 0, q.masse[2] / 2] : [q.masse[0] / 2, 0, 0]
    const enden = [e, e.map((v) => -v)].map((v) => drehe(v, q.kipp)).map((v) => [q.mitte[0] + v[0], q.mitte[1] + v[1], q.mitte[2] + v[2]])
    // Waagrechte Lage der Wand, zu der die Klappe gehoert.
    const wandLage = q.kipp.x ? (q.mitte[2] > 1.5 ? 1.5 + 0.195 : 1.5 - 0.195) : q.mitte[0] > 3 ? 3 + 0.295 : 3 - 0.295
    const quer = (v) => (q.kipp.x ? v[2] : v[0])
    const innen = enden.reduce((p, v) => (Math.abs(p[1] - oben) + Math.abs(quer(p) - wandLage) < Math.abs(v[1] - oben) + Math.abs(quer(v) - wandLage) ? p : v))
    const spitze = enden.find((v) => v !== innen)
    nahe('Klappe: innere Kante auf der Wandoberkante (Hoehe)', innen[1], oben, 1e-9)
    nahe('Klappe: innere Kante auf der Wand', quer(innen), wandLage, 1e-9)
    wahr('Klappe steht hoch und nach aussen', spitze[1] > oben + 0.1 && Math.abs(quer(spitze) - 1.5 - (q.kipp.x ? 0 : 1.5)) > Math.abs(wandLage - 1.5 - (q.kipp.x ? 0 : 1.5)))
  }
  const fuellung = teile.filter((x) => x.kante === null && Math.abs(x.masse[1] - 0.01) < 1e-9)
  gleich('Fuellung: eine Platte', fuellung.length, 1)
  // Ohne Fuellstand 70 Prozent: 0,25 + 0,5 + 1 + 38 * 0,7 = 28,35 cm Oberkante.
  nahe('Fuellung bei 70 Prozent', fuellung[0].mitte[1] + fuellung[0].masse[1] / 2, 0.2835, 1e-9)
  wahr('Fuellung dunkler', fuellung[0].farbe !== F.pappe)
  const inhalt = teile.filter((x) => x.kante === null && x !== fuellung[0] && x.glanz === undefined)
  wahr('Inhalt: vier bis sechs Bloecke', inhalt.length >= 4 && inhalt.length <= 6)
  wahr('Inhalt liegt auf der Fuellung', inhalt.every((x) => Math.abs(x.mitte[1] - x.masse[1] / 2 - 0.2835) < 1e-9))
  gleich('Klebeband an den Stirnseiten', teile.filter((x) => x.glanz === 0.6).length, 2)
  const halb = baueSzene({ ...daten, kisten: daten.kisten.map((k) => (k.id === 'a' ? { ...k, fuellstand: 20 } : k)) }, F, { offeneKiste: 'a' })
  const f20 = halb.filter((x) => x.id === 'a' && x.kante === null && Math.abs(x.masse[1] - 0.01) < 1e-9)[0]
  nahe('Fuellung bei 20 Prozent', f20.mitte[1] + f20.masse[1] / 2, 0.0175 + 0.38 * 0.2, 1e-9)
  gleich('andere Kisten bleiben zu', offen.filter((x) => x.id === 'b').length, 1)
  gleich('ohne offeneKiste ein Quader', alle.filter((x) => x.id === 'a').length, 1)
}

/* ------------------------------------------------------------ Deko ausblenden (E82) */
{
  const mitDeko = {
    ...daten,
    objekte: [
      ...daten.objekte,
      objekt('Sofakissen', 'w', 'moebel', { x: 100, y: 100, breite_cm: 45, tiefe_cm: 45, hoehe_cm: 15 }),
      objekt('Bücherregal', 'w', 'regal', { x: 150, y: 20, breite_cm: 80, tiefe_cm: 30, hoehe_cm: 200, brett_cm: [0, 100] }),
    ],
  }
  wahr('Deko sichtbar', baueSzene(mitDeko, F).some((x) => x.id === 'Sofakissen'))
  const ohne = baueSzene(mitDeko, F, { deko: false })
  wahr('Deko ausgeblendet', !ohne.some((x) => x.id === 'Sofakissen'))
  wahr('Regal mit Buechern im Namen bleibt', ohne.some((x) => x.id === 'Bücherregal'))
  wahr('Moebel bleiben', ohne.some((x) => x.id === 'sofa'))
}

/* ------------------------------------------------------------ Zahlen */
for (const k of [...alle, ...balkon, ...offen]) {
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
