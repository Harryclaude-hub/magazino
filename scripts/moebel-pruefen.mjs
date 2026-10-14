// Prueft die Moebel in 3D (src/components/plan3d/moebel3d.ts und
// moebelDeko3d.ts) ohne Browser und ohne three (E82): jede Moebelart in
// ueblicher Groesse, dazu Abarten (Klappstuhl, Kinderstuhl, Juniorbett,
// Fernseher an der Wand, Einbaukuehlschrank ...) und die L-Formen in
// allen vier Ecken.
//
// Geprueft wird: Zahlen endlich, x0 < x1, y0 < y1, z0 < z1; jedes Teil
// (mit Neigung und oben weiterem Zylinder) im Kasten B x T x H plus 0,5 cm,
// mit diesen Ausnahmen:
//   - Griffe (Farbe griff) stehen bis 4 cm vor, Kuechenteile ebenso
//     (Ofengriff mit Geschirrtuch);
//   - Kuechenzeile bis zur Decke (Oberschraenke), Herd, Spuele und
//     Geschirrspueler bis 1 cm ueber H (Kochfeld, Beckenrand);
//   - Armaturen und Wasserstrahl (geraet wasser) bis 30 cm ueber H;
//   - Bett mit H als Liegehoehe (unter 75): Kopfteil, Decke und Kissen bis
//     46 cm ueber H; WC: der hochgeklappte Deckel bis 20 cm ueber H;
//     Handtuch auf dem Wannenrand bis 6 cm ueber H;
//   - Mauer bis zur Decke, Dusche mit Glas bis 200, Teppich 3 mm ueber H,
//     Haengelampe mit dem Licht 1,5 cm unter der Unterkante.
// Ausserdem: nichts im Ausschnitt einer L-Form; Plaetze bei allem zum
// Sitzen und Liegen; zu jedem geraet 'an' ein 'koerper'; jede Griff-
// gruppe hat genau eine Tuer; alle Teile einer Schublade gleich
// ausgerichtet; Dinge mit demselben Namen haengen zusammen; Teilebudget
// (Stuhl 40, Kuechenzeile 200); kleine Deko ganz aufhebbar; eigene Farbe
// wird genutzt; die Szene baut alles ohne kaputte Zahlen.
// E95: Schienenregal (Schienenzahl nach Breite, alles im Kasten, auch die
// Keile der 45-Grad-Enden, je Brett eine Konsole an jeder Schiene, keine
// kaputten Zahlen bei winzigen Massen, hoechstens 2000 Dreiecke).
// E91: die BESTA-Eckbank (Tueren, Sitzplaetze, Rueckenpolster), die Deko
// fuer Bad und WC mit ihren Abarten, Farben aus dem Namen, hoechstens 1500
// Dreiecke je Stueck (so gezaehlt, wie der Motor die Formen baut), weicher
// Stoff ohne Kantenlinie, Gruenlilie und Haengepflanze.
//
// Aufruf im Projektordner: node scripts/moebel-pruefen.mjs
// Ausgabe "ok" oder die abweichenden Faelle, Exit 1 bei Fehlern.
import { readFileSync } from 'node:fs'
import { moebelTeile } from '../src/components/plan3d/moebel3d.ts'
import { misch } from '../src/components/plan3d/moebelDeko3d.ts'
import { baueSzene, moebelQuader } from '../src/components/plan3d/szene.ts'
import { DEKO_ARTEN, moebelArt } from '../src/components/plan/moebelArt.ts'
import { brettTiefe, brettUmriss, schienenregal, schienenTeile, schienenX, schienenZahl } from '../src/components/plan/schienenregal.ts'
import { schienenQuader } from '../src/components/plan3d/szene.ts'

let fehler = 0
function wahr(name, ist) {
  if (!ist) {
    console.log('ABWEICHUNG', name)
    fehler++
  }
}

// Die Farben wie in scripts/szene-pruefen.mjs (Palette F).
const F = {
  grund: '#d3c9b6', boden: '#e6dccb', bodenDraussen: '#d9e2cf', wand: '#3f3931', wand3d: '#b9ad98', tuer: '#e0700f',
  fenster: '#2b78c9', objekt: '#cbbfa9', objektRand: '#6b6253', fach: '#b8ab93', kisteRand: '#1d1b16', hervor: '#b23a2e',
  strom: '#a16207', steckdose: '#dc2626', wandKopf: '#cfc9bf', wandKante: '#a9a296', tuer3d: '#f4f2ed', zarge3d: '#d6d0c5',
  rahmen3d: '#eeece8', boden3d: '#c9a77c', bodenDraussen3d: '#b7b3aa', holz: '#b98c5a', holzDunkel: '#5c4430',
  stoff: '#7f858c', waesche: '#f1eee7', keramik: '#f6f6f3', metall: '#9aa0a6', schwarz: '#26272a', front: '#d4b48a',
  platte: '#4a4a4c', weiss: '#eeede9', gruen: '#56793f', topf: '#b0643c', teppich: '#a48a73', glas: '#9fc3d9',
  schalter3d: '#f6f4ef', spiegel: '#c3d0d6', griff: '#c9ced4', wasser: '#9fd3ee', bildschirm: '#14161a', rasen: '#7f9a5c',
  weg: '#b9b2a4', baum: '#4f7340', stamm: '#6b5340', hecke: '#5d7f47', himmelOben: '#9cc3e4', himmelUnten: '#e4ecef',
  fassade: '#e9e4da', pappe: '#c49a6c', leinen: '#e2dccf', spielRot: '#d0573f', spielBlau: '#4f7fb8', spielGelb: '#e3b341',
  spielGruen: '#6aa060',
}

/* ------------------------------------------------------------ Faelle */

// Uebliche Groesse je Art (B x T x H), wie im Katalog oder bei IKEA.
const GROESSE = {
  wc: [40, 65, 80], waschbecken: [60, 45, 85], badewanne: [170, 75, 58], dusche: [90, 90, 5],
  geschirrspueler: [60, 60, 87], waschmaschine: [60, 60, 85], trockner: [60, 60, 85], spuele: [80, 60, 90],
  herd: [60, 60, 90], kuehlschrank: [60, 65, 180], kuechenzeile: [240, 60, 90], bett: [140, 200, 45],
  sofa: [200, 90, 85], fernseher: [160, 40, 50], kommode: [100, 45, 80], tisch: [160, 90, 75], sessel: [80, 85, 90],
  couchtisch: [110, 60, 45], sideboard: [180, 45, 80], esstisch_rund: [110, 110, 75], buerostuhl: [60, 60, 110],
  stuhl: [45, 50, 90], teppich: [200, 140, 1], stehlampe: [35, 35, 170], pflanze: [45, 45, 120], klavier: [150, 60, 125],
  nachttisch: [45, 40, 55], kinderbett: [70, 140, 90], schreibtisch: [140, 70, 75], schuhschrank: [80, 35, 100],
  garderobe: [100, 35, 180], gefrierschrank: [60, 65, 145], fahrrad: [180, 60, 100], tv_board: [180, 40, 45],
  essgruppe: [200, 170, 90], backofen: [60, 60, 220], hochschrank: [60, 60, 220], bank: [180, 45, 85],
  haengelampe: [45, 45, 90], mauer: [30, 60, 250], spiegel: [60, 5, 80],
  spielzeugkiste: [60, 40, 45], kuscheltier: [30, 25, 38], bausteine: [40, 30, 15], spielkueche: [72, 40, 109],
  buecher: [60, 22, 26], bild: [50, 3, 70], kissen: [45, 45, 15], wolldecke: [50, 35, 8], korb: [40, 40, 35],
  vorhang: [140, 15, 250], obstschale: [35, 35, 12], blumenkasten: [80, 20, 30], sockel: [60, 40, 15],
  // E91: BESTA-Eckbank, Deko fuer Bad und WC.
  besta_bank: [180, 42, 85], handtuch: [70, 10, 65], handtuchstapel: [35, 30, 20], badaccessoires: [28, 10, 19],
  seifenschale: [12, 9, 3], kerzen: [26, 14, 16], duftstaebchen: [9, 9, 28], badewannenablage: [72, 18, 11],
  klopapierhalter: [30, 13, 13], klobuerste: [11, 11, 38], bademantel: [60, 20, 110], wandregal: [45, 15, 38],
}

// E91: die Deko fuer Bad und WC.
const BAD_DEKO = ['handtuch', 'handtuchstapel', 'badaccessoires', 'seifenschale', 'kerzen', 'duftstaebchen', 'badewannenablage', 'klopapierhalter', 'klobuerste', 'bademantel', 'wandregal']

// Jede Art aus dem Typ MoebelArt muss oben stehen (neue Arten fallen auf).
{
  const quelle = readFileSync(new URL('../src/components/plan/moebelArt.ts', import.meta.url), 'utf8')
  const block = quelle.slice(quelle.indexOf('export type MoebelArt'), quelle.indexOf('/** Reihenfolge'))
  const arten = [...block.matchAll(/\|\s*'([a-z_]+)'/g)].map((m) => m[1])
  wahr('MoebelArt gelesen', arten.length >= 50)
  for (const a of arten) wahr(`Groesse fuer ${a} im Test`, a in GROESSE)
  for (const a of Object.keys(GROESSE)) wahr(`${a} ist eine MoebelArt`, arten.includes(a))
}

const DECKE = 250
let nr = 0
function objekt(art, [B, T, H], mehr = {}) {
  return {
    id: `o${++nr}`, raum_id: 'r', art: 'moebel', name: mehr.name ?? art, farbe: null, item_id: null, item_code: null, item_title: null,
    x: 20, y: 20, breite_cm: B, tiefe_cm: T, hoehe_cm: H, drehung: 0, form: 'rechteck',
    ausschnitt_breite_cm: null, ausschnitt_tiefe_cm: null, ausschnitt_ecke: null, brett_cm: null, spalten: 1,
    ...mehr,
  }
}

const faelle = []
const fall = (name, art, masse, mehr = {}) => faelle.push({ name, art, o: objekt(art, masse, mehr) })
for (const [art, masse] of Object.entries(GROESSE)) fall(art, art, masse)
// Abarten.
fall('Klappstuhl', 'stuhl', [45, 48, 80], { name: 'Klappstuhl' })
fall('Kinderstuhl LAETT', 'stuhl', [28, 28, 50], { name: 'Kinderstuhl LÄTT' })
fall('Stuhl mit Kissen', 'stuhl', [45, 50, 90], { material: 'stoff' })
fall('Juniorbett', 'kinderbett', [96, 206, 78])
fall('Juniorbett entlang x', 'kinderbett', [206, 96, 78])
fall('Gitterbett entlang x', 'kinderbett', [140, 70, 90])
fall('Bett 180', 'bett', [180, 200, 45])
fall('Bett 90 mit Kopfteilhoehe', 'bett', [90, 200, 95])
fall('Fernseher an der Wand', 'fernseher', [145, 6, 84])
fall('Einbaukuehlschrank', 'hochschrank', [60, 60, 220], { name: 'Hochschrank mit Einbaukühlschrank' })
fall('Kleiner Kuehlschrank', 'kuehlschrank', [55, 60, 85])
fall('Backofen niedrig', 'backofen', [60, 60, 150])
fall('Handwaschbecken', 'waschbecken', [40, 25, 85])
fall('WC Wand', 'wc', [36, 55, 65])
for (const B of [60, 120, 180, 300, 360]) fall(`Kuechenzeile ${B}`, 'kuechenzeile', [B, 60, 90])
fall('Buecherstapel', 'buecher', [25, 18, 20])
fall('Kissen drei stehend', 'kissen', [130, 15, 45])
fall('Korb gross eckig', 'korb', [70, 40, 30])
// E92: Korb mit Deckel, Waeschekorb und kleiner Korb ohne Decke.
fall('Waeschekorb mit Deckel', 'korb', [42, 40, 55], { name: 'Wäschekorb Seegras mit Deckel' })
fall('Korb eckig mit Deckel', 'korb', [50, 30, 30], { name: 'Korb mit Deckel' })
fall('Waeschekorb offen', 'korb', [45, 35, 50], { name: 'Wäschekorb Seegras' })
fall('Korb klein', 'korb', [24, 25, 20], { name: 'Aufbewahrungskorb Seegras, klein' })
fall('Stoffbox', 'spielzeugkiste', [40, 30, 30], { material: 'stoff' })
fall('Vorhang schmal', 'vorhang', [80, 6, 220])
fall('Sockel mit zwei Schubladen', 'sockel', [80, 40, 52])
// E91: die Eckbank der Wohnung (Namen wie in der Datenbank) und die Abarten der Bad-Deko.
fall('Eckbank Nord', 'besta_bank', [180, 42, 85], { name: 'Eckbank Nord: BESTÅ 180x42x38 mit Türen, Polster extra' })
fall('Eckbank Ost', 'besta_bank', [120, 42, 85], { name: 'Eckbank Ost: BESTÅ 120x42x38 mit Türen, Polster extra' })
fall('BESTÅ ohne Ruecken', 'besta_bank', [120, 42, 44])
fall('Handtuchstange schmal', 'handtuch', [40, 8, 55])
fall('Handtuchstange breit', 'handtuch', [100, 10, 70], { name: 'Handtuchstange mit drei Handtüchern terrakotta, salbeigrün, grau' })
fall('Handtuecher zwei Farben', 'handtuch', [70, 10, 65], { name: 'Handtuchhalter mit Handtüchern salbeigrün und weiß' })
fall('Handtuch am Haken', 'handtuch', [30, 10, 55], { name: 'Gästehandtuch am Haken' })
fall('Handtuecher gerollt', 'handtuchstapel', [35, 30, 20], { name: 'Handtücher gerollt' })
fall('Doppelrollenhalter', 'klopapierhalter', [32, 13, 13])
fall('Einzelrollenhalter', 'klopapierhalter', [18, 12, 13])
fall('Wandbrett', 'wandregal', [60, 15, 18])
fall('Bademantel grau', 'bademantel', [55, 18, 105], { name: 'Bademantel grau am Haken' })
fall('Gruenlilie', 'pflanze', [30, 30, 35], { name: 'Grünlilie im Topf' })
fall('Gruenlilie klein', 'pflanze', [20, 12, 22], { name: 'Grünlilie im Topf' })
fall('Efeutute', 'pflanze', [25, 25, 40], { name: 'Efeutute (Hängepflanze)' })
fall('Efeutute klein', 'pflanze', [15, 12, 20], { name: 'Efeutute (Hängepflanze)' })
fall('Efeutute gross', 'pflanze', [38, 38, 90], { name: 'Efeutute (Zimmerpflanze) im Tontopf' })
// L-Formen in allen vier Ecken.
const L = {
  kuechenzeile: [[270, 180, 90], 210, 120],
  sofa: [[250, 160, 85], 90, 70],
  bank: [[180, 65, 85], 159, 15],
  besta_bank: [[180, 65, 85], 159, 15],
}
for (const [art, [masse, aB, aT]] of Object.entries(L)) {
  for (const ecke of ['ro', 'lo', 'ru', 'lu']) {
    fall(`${art} L ${ecke}`, art, masse, { form: 'l', ausschnitt_breite_cm: aB, ausschnitt_tiefe_cm: aT, ausschnitt_ecke: ecke })
  }
}

/* ------------------------------------------------------------ Hilfen */

const KUECHE = new Set(['kuechenzeile', 'herd', 'spuele', 'geschirrspueler', 'kuehlschrank', 'gefrierschrank', 'hochschrank', 'backofen'])
const rad = (g) => (g * Math.PI) / 180

/** Huelle eines Teils: oben weitere Zylinder ragen oben hinaus, geneigte
 *  Teile drehen um ihre Mitte (laengs in y-z, quer in x-z). */
function huelle(q) {
  let hx = (q.x1 - q.x0) / 2
  let hy = (q.y1 - q.y0) / 2
  let hz = (q.z1 - q.z0) / 2
  const cx = (q.x0 + q.x1) / 2
  const cy = (q.y0 + q.y1) / 2
  const cz = (q.z0 + q.z1) / 2
  if (q.form?.art === 'zylinder' && (q.form.oben ?? 1) > 1) {
    const k = q.form.oben
    const a = q.form.achse ?? 'hoch'
    if (a === 'hoch') [hx, hy] = [hx * k, hy * k]
    else if (a === 'laengs') [hy, hz] = [hy * k, hz * k]
    else [hx, hz] = [hx * k, hz * k]
  }
  const l = rad(q.kipp?.laengs ?? 0)
  const u = rad(q.kipp?.quer ?? 0)
  ;[hy, hz] = [Math.abs(Math.cos(l)) * hy + Math.abs(Math.sin(l)) * hz, Math.abs(Math.sin(l)) * hy + Math.abs(Math.cos(l)) * hz]
  ;[hx, hz] = [Math.abs(Math.cos(u)) * hx + Math.abs(Math.sin(u)) * hz, Math.abs(Math.sin(u)) * hx + Math.abs(Math.cos(u)) * hz]
  return { x0: cx - hx, x1: cx + hx, y0: cy - hy, y1: cy + hy, z0: cz - hz, z1: cz + hz }
}

/** Erlaubter Raum fuer ein Teil (siehe Ausnahmen oben). */
function erlaubt(art, o, q) {
  const B = o.breite_cm
  const T = o.tiefe_cm
  const H = o.hoehe_cm
  const seit = q.farbe === F.griff || KUECHE.has(art) ? 4.1 : 0.5
  let z1 = H
  let z0 = 0
  if (art === 'kuechenzeile' || art === 'mauer') z1 = DECKE
  if (art === 'herd' || art === 'spuele' || art === 'geschirrspueler') z1 = H + 1
  if (q.geraet?.art === 'wasser') z1 = Math.max(z1, H + 30)
  if (art === 'badewanne' && q.ding === 'handtuch') z1 = H + 6
  if (art === 'bett' && H < 75) z1 = H + 46
  if (art === 'wc') z1 = H + 20
  if (art === 'dusche') z1 = 200
  if (art === 'teppich') z1 = H + 0.3
  if (art === 'haengelampe') z0 = -1.5
  return { x0: -seit, x1: B + seit, y0: -seit, y1: T + seit, z0: z0 - 0.5, z1: z1 + 0.5 }
}

/** Ausschnitt einer L-Form in lokalen Koordinaten. */
function ausschnitt(o) {
  if (o.form !== 'l') return null
  const B = o.breite_cm
  const T = o.tiefe_cm
  const aB = o.ausschnitt_breite_cm
  const aT = o.ausschnitt_tiefe_cm
  const e = o.ausschnitt_ecke ?? 'ro'
  const links = e[0] === 'l'
  const oben = e[1] === 'o'
  return { x0: links ? 0 : B - aB, x1: links ? aB : B, y0: oben ? 0 : T - aT, y1: oben ? aT : T }
}

const beruehren = (a, b, tol) => a.x0 <= b.x1 + tol && b.x0 <= a.x1 + tol && a.y0 <= b.y1 + tol && b.y0 <= a.y1 + tol && a.z0 <= b.z1 + tol && b.z0 <= a.z1 + tol

/** Haengen die Teile zusammen (Huellen beruehren sich bis auf tol)? */
function zusammen(teile, tol) {
  const h = teile.map(huelle)
  const gesehen = new Set([0])
  const offen = [0]
  while (offen.length) {
    const i = offen.pop()
    for (let j = 0; j < h.length; j++) {
      if (!gesehen.has(j) && beruehren(h[i], h[j], tol)) {
        gesehen.add(j)
        offen.push(j)
      }
    }
  }
  return gesehen.size === h.length
}

/* ------------------------------------------------------------ Pruefen */

const SITZEN = new Set(['sofa', 'sessel', 'stuhl', 'bank', 'besta_bank', 'buerostuhl', 'wc', 'bett', 'kinderbett', 'essgruppe'])
const GANZ = new Set(['kuscheltier', 'bausteine', 'buecher', 'kissen', 'obstschale', 'wolldecke', 'handtuchstapel', 'seifenschale', 'kerzen', 'duftstaebchen', 'klobuerste'])
const BUDGET = { stuhl: 40, buerostuhl: 40, kuechenzeile: 200, essgruppe: 100 }
const ergebnis = new Map()

for (const { name, art, o } of faelle) {
  const teile = moebelTeile(o, art, F, DECKE)
  ergebnis.set(name, teile)
  if (!teile) {
    wahr(`${name}: hat Teile`, false)
    continue
  }
  wahr(`${name}: mindestens ein Teil`, teile.length > 0)
  const budget = BUDGET[art] ?? 120
  wahr(`${name}: ${teile.length} Teile, hoechstens ${budget}`, teile.length <= budget)
  const raus = ausschnitt(o)
  const tolL = KUECHE.has(art) ? 4.1 : 0.5
  for (const [i, q] of teile.entries()) {
    const wo = `${name} Teil ${i}`
    const zahlen = [q.x0, q.x1, q.y0, q.y1, q.z0, q.z1]
    if (!zahlen.every(Number.isFinite)) {
      wahr(`${wo}: endliche Zahlen ${JSON.stringify(zahlen)}`, false)
      continue
    }
    wahr(`${wo}: x0 < x1, y0 < y1, z0 < z1 ${JSON.stringify(zahlen.map((v) => Math.round(v * 100) / 100))}`, q.x0 < q.x1 && q.y0 < q.y1 && q.z0 < q.z1)
    wahr(`${wo}: Farbe ${q.farbe}`, /^#[0-9a-f]{6}$/i.test(q.farbe))
    if (q.deckkraft !== undefined) wahr(`${wo}: Deckkraft 0..1`, q.deckkraft > 0 && q.deckkraft <= 1)
    if (q.rund !== undefined) wahr(`${wo}: Rundung >= 0`, Number.isFinite(q.rund) && q.rund >= 0)
    if (q.kipp) {
      for (const v of [q.kipp.laengs, q.kipp.quer]) if (v !== undefined) wahr(`${wo}: Neigung endlich und hoechstens 45 Grad`, Number.isFinite(v) && Math.abs(v) <= 45)
    }
    const h = huelle(q)
    const e = erlaubt(art, o, q)
    const drin = h.x0 >= e.x0 && h.x1 <= e.x1 && h.y0 >= e.y0 && h.y1 <= e.y1 && h.z0 >= e.z0 && h.z1 <= e.z1
    wahr(`${wo}: im Kasten ${JSON.stringify(Object.values(h).map((v) => Math.round(v * 10) / 10))} erlaubt ${JSON.stringify(Object.values(e).map((v) => Math.round(v * 10) / 10))}`, drin)
    if (raus) {
      const r = { x0: raus.x0 + tolL, x1: raus.x1 - tolL, y0: raus.y0 + tolL, y1: raus.y1 - tolL }
      const im = h.x0 < r.x1 && h.x1 > r.x0 && h.y0 < r.y1 && h.y1 > r.y0
      wahr(`${wo}: nichts im Ausschnitt`, !im)
    }
  }

  // Plaetze zum Sitzen und Liegen.
  const plaetze = teile.filter((q) => q.platz)
  for (const q of plaetze) wahr(`${name}: Platz gueltig`, ['sitz', 'liegen'].includes(q.platz.art) && ['vorn', 'hinten', 'links', 'rechts'].includes(q.platz.blick))
  if (SITZEN.has(art)) wahr(`${name}: hat einen Platz`, plaetze.length > 0)

  // Geraete: zu jedem 'an' ein 'koerper' derselben Art und Nummer.
  for (const q of teile.filter((x) => x.geraet?.teil === 'an')) {
    wahr(`${name}: zum Geraet ${q.geraet.art} gibt es einen Koerper`, teile.some((x) => x.geraet?.teil === 'koerper' && x.geraet.art === q.geraet.art && x.geraet.nr === q.geraet.nr))
    if (q.geraet.art === 'wasser') wahr(`${name}: Wasserstrahl in Wasserfarbe, halb durchsichtig`, q.farbe === F.wasser && q.deckkraft === 0.55)
  }

  // Griffe drehen mit genau einer Tuer derselben Gruppe.
  const tueren = teile.filter((q) => q.front?.art === 'tuer' && q.front.gruppe !== undefined)
  const tuerGruppen = tueren.map((q) => q.front.gruppe)
  wahr(`${name}: jede Tuer hat ihre eigene Gruppe`, new Set(tuerGruppen).size === tuerGruppen.length)
  for (const q of teile.filter((x) => x.front?.art === 'griff')) wahr(`${name}: Griff ${q.front.gruppe} hat eine Tuer`, tuerGruppen.includes(q.front.gruppe))
  // Schubladen: alle Teile einer Gruppe gleich ausgerichtet, gleiche Richtung und Weite, keine Tuer derselben Nummer.
  const schuebe = new Map()
  for (const q of teile.filter((x) => x.front?.art === 'schub')) {
    const g = q.front.gruppe
    if (!schuebe.has(g)) schuebe.set(g, [])
    schuebe.get(g).push(q)
  }
  for (const [g, liste] of schuebe) {
    const breit = liste.map((q) => q.x1 - q.x0 >= q.y1 - q.y0)
    wahr(`${name}: Schublade ${g} faehrt in eine Richtung`, breit.every((b) => b === breit[0]))
    wahr(`${name}: Schublade ${g} einheitlich`, liste.every((q) => q.front.auf === liste[0].front.auf && q.front.weit === liste[0].front.weit && q.front.weit > 0))
    wahr(`${name}: Schublade ${g} ist keine Tuer`, !tuerGruppen.includes(g))
  }

  // Dinge: derselbe Name gehoert zu einem Ding, das zusammenhaengt.
  const dinge = new Map()
  for (const q of teile.filter((x) => x.ding)) {
    if (!dinge.has(q.ding)) dinge.set(q.ding, [])
    dinge.get(q.ding).push(q)
  }
  for (const [d, liste] of dinge) if (d !== 'ganz') wahr(`${name}: Ding ${d} ist ein Stueck`, zusammen(liste, 1))
  if (GANZ.has(art) || (art === 'korb' && o.breite_cm <= 60 && o.tiefe_cm <= 60)) wahr(`${name}: ganz aufhebbar`, teile.every((q) => q.ding === 'ganz'))
  if (!GANZ.has(art) && art !== 'korb') wahr(`${name}: nur kleine Deko ist ganz aufhebbar`, teile.every((q) => q.ding !== 'ganz'))
}

/* ------------------------------------------------------------ Andere Groessen */

// Jede Art 0,6- bis 1,6-fach in jeder Richtung (feste Saat, immer gleich),
// auch als L und mit den Namen der Abarten: nur gueltige Teile, und ohne L
// alles im Kasten (mit den Ausnahmen von oben).
{
  let saat = 12345
  const zz = () => ((saat = (saat * 16807) % 2147483647) - 1) / 2147483646
  // E91: die Namen treffen auch die Abarten der Pflanze, des Handtuchs
  // (Haken) und des Handtuchstapels (gerollt). Vier Namen, damit jede Art
  // mit jedem Namen vorkommt.
  const namen = ['', 'Klappstuhl', 'Kinderstuhl Grünlilie', 'Hochschrank mit Einbaukühlschrank, Efeutute am Haken gerollt']
  const arten = Object.keys(GROESSE)
  const kaputt = new Map()
  let geprueft = 0
  for (let i = 0; i < 4000; i++) {
    const art = arten[i % arten.length]
    const [b, tt, h] = GROESSE[art]
    const B = Math.max(1, Math.round(b * (0.6 + zz())))
    const T = Math.max(1, Math.round(tt * (0.6 + zz())))
    const H = Math.max(1, Math.round(h * (0.6 + zz())))
    const l = zz() < 0.3
    const mehr = { name: namen[i % 4] }
    if (l) Object.assign(mehr, { form: 'l', ausschnitt_breite_cm: Math.round(B * (0.2 + zz() * 0.7)), ausschnitt_tiefe_cm: Math.round(T * (0.2 + zz() * 0.7)), ausschnitt_ecke: ['ro', 'lo', 'ru', 'lu'][i % 4] })
    const o = objekt(art, [B, T, H], mehr)
    const teile = moebelTeile(o, art, F, DECKE)
    if (!teile || teile.length === 0) {
      kaputt.set(art, `${B} x ${T} x ${H}: keine Teile`)
      continue
    }
    geprueft += teile.length
    for (const q of teile) {
      const zahlen = [q.x0, q.x1, q.y0, q.y1, q.z0, q.z1]
      const gueltig = zahlen.every(Number.isFinite) && q.x0 < q.x1 && q.y0 < q.y1 && q.z0 < q.z1
      let drin = true
      if (gueltig && !l) {
        const h2 = huelle(q)
        const e = erlaubt(art, o, q)
        drin = h2.x0 >= e.x0 && h2.x1 <= e.x1 && h2.y0 >= e.y0 && h2.y1 <= e.y1 && h2.z0 >= e.z0 && h2.z1 <= e.z1
      }
      if ((!gueltig || !drin) && !kaputt.has(art)) kaputt.set(art, `${B} x ${T} x ${H}${l ? ' L' : ''} ${o.name}: ${gueltig ? 'ragt hinaus' : 'ungueltig'} ${JSON.stringify(zahlen.map((v) => Math.round(v * 10) / 10))}`)
    }
  }
  for (const [art, was] of kaputt) wahr(`andere Groesse ${art}: ${was}`, false)
  wahr(`andere Groessen: ${geprueft} Teile geprueft`, geprueft > 40000)
  console.log(`Andere Groessen: 4000 Moebel, ${geprueft} Teile`)
}

/* ------------------------------------------------------------ Einzelnes */

const teile = (name) => ergebnis.get(name) ?? []
const zahl = (name, pred) => teile(name).filter(pred).length

// Sitzen und Liegen mit Blick.
wahr('Stuhl: ein Platz mit Blick nach vorn', zahl('stuhl', (q) => q.platz?.art === 'sitz' && q.platz.blick === 'vorn') === 1)
wahr('Stuhl mit Kissen: der Platz ist das Kissen', zahl('Stuhl mit Kissen', (q) => q.platz) === 1 && teile('Stuhl mit Kissen').find((q) => q.platz).farbe === F.stoff)
wahr('Essgruppe: zwei Stuehle vorn, zwei hinten', zahl('essgruppe', (q) => q.platz?.blick === 'vorn') === 2 && zahl('essgruppe', (q) => q.platz?.blick === 'hinten') === 2)
wahr('Stuhl: Hinterbeine 8 Grad nach hinten', zahl('stuhl', (q) => Math.abs((q.kipp?.laengs ?? 0) - 8) < 0.5) >= 2)
wahr('Essgruppe: hintere Stuehle andersherum geneigt', zahl('essgruppe', (q) => (q.kipp?.laengs ?? 0) < -7) >= 4 && zahl('essgruppe', (q) => (q.kipp?.laengs ?? 0) > 7) >= 4)
wahr('Klappstuhl: ein Platz, geneigte Beine vorn und hinten', zahl('Klappstuhl', (q) => q.platz) === 1 && zahl('Klappstuhl', (q) => (q.kipp?.laengs ?? 0) > 15) >= 2)
wahr('Kinderstuhl: ein Platz, Sitz unter 35 cm', zahl('Kinderstuhl LAETT', (q) => q.platz && q.z1 <= 35) === 1)
wahr('Buerostuhl: ein Platz, vier Rollen, Lehne geneigt', zahl('buerostuhl', (q) => q.platz) === 1 && zahl('buerostuhl', (q) => q.form?.art === 'zylinder' && q.z0 === 0) === 4 && zahl('buerostuhl', (q) => (q.kipp?.laengs ?? 0) > 3) >= 2)
wahr('WC: Brille ist ein Platz, Deckel geneigt', zahl('wc', (q) => q.platz?.art === 'sitz' && q.platz.blick === 'vorn') === 1 && zahl('wc', (q) => q.kipp?.laengs > 0) === 1)
wahr('Sofa: Sitzpolster mit Blick nach vorn', zahl('sofa', (q) => q.platz?.blick === 'vorn') >= 2)
wahr('Sessel: ein Platz', zahl('sessel', (q) => q.platz) === 1)
wahr('Bank: Sitzpolster', zahl('bank', (q) => q.platz?.art === 'sitz') >= 2)
wahr('L-Sofa ro: langer Teil schaut nach -y, Schenkel nach +x', zahl('sofa L ro', (q) => q.platz?.blick === 'hinten') >= 2 && zahl('sofa L ro', (q) => q.platz?.blick === 'rechts') === 1)
wahr('L-Sofa lu: gespiegelt', zahl('sofa L lu', (q) => q.platz?.blick === 'vorn') >= 2 && zahl('sofa L lu', (q) => q.platz?.blick === 'links') === 1)
wahr('Bett 140: eine Matratze zum Liegen, Blick zum Fussende', zahl('bett', (q) => q.platz?.art === 'liegen' && q.platz.blick === 'vorn') === 1)
wahr('Bett 180: zwei Matratzen', zahl('Bett 180', (q) => q.platz?.art === 'liegen') === 2)
wahr('Bett: Liegeflaeche auf Liegehoehe', teile('bett').find((q) => q.platz).z1 === 45)
wahr('Gitterbett: Platz und Staebe', zahl('kinderbett', (q) => q.platz?.art === 'liegen') === 1 && zahl('kinderbett', (q) => q.form?.art === 'zylinder') >= 20)
wahr('Juniorbett: Platz, Absturzsicherung, keine Gitterstaebe', zahl('Juniorbett', (q) => q.platz?.art === 'liegen') === 1 && zahl('Juniorbett', (q) => q.form) === 0 && teile('Juniorbett').length <= 15)
wahr('Juniorbett entlang x: Blick nach +x', zahl('Juniorbett entlang x', (q) => q.platz?.blick === 'rechts') === 1)
wahr('Gitterbett entlang x: Blick nach +x', zahl('Gitterbett entlang x', (q) => q.platz?.blick === 'rechts') === 1)

// Geraete.
for (const n of ['fernseher', 'Fernseher an der Wand']) {
  const tv = teile(n)
  const an = tv.find((q) => q.geraet?.teil === 'an')
  const aus = tv.find((q) => q.geraet?.teil === 'aus' && q.farbe === F.schwarz)
  wahr(`${n}: Bildschirm an und aus`, !!an && !!aus && an.farbe === F.bildschirm)
  if (an && aus) {
    wahr(`${n}: an so gross wie aus, 1 mm davor`, an.x0 === aus.x0 && an.x1 === aus.x1 && an.z0 === aus.z0 && an.z1 === aus.z1 && Math.abs(an.y1 - aus.y1 - 0.1) < 1e-9)
    const kante = Math.max(...tv.filter((q) => q.geraet?.teil === 'koerper' && q.z1 > aus.z0 + 1).map((q) => q.y1))
    wahr(`${n}: Bildschirm 2 mm hinter dem Rahmen`, Math.abs(kante - aus.y1 - 0.2) < 1e-9)
  }
  wahr(`${n}: Bereitschaftsleuchte`, tv.filter((q) => q.geraet?.teil === 'aus').length === 2)
  wahr(`${n}: alles am Geraet`, tv.every((q) => q.geraet?.art === 'tv'))
}
wahr('Fernseher an der Wand: hoechstens 6 cm tief', teile('Fernseher an der Wand').every((q) => q.y1 <= 6))
for (const n of ['kuechenzeile', 'spuele', 'waschbecken', 'badewanne', 'Handwaschbecken', 'kuechenzeile L ro']) {
  wahr(`${n}: Mischer mit Strahl`, zahl(n, (q) => q.geraet?.art === 'wasser' && q.geraet.teil === 'koerper') >= 4 && zahl(n, (q) => q.geraet?.teil === 'an') === 1)
}

// Kueche.
{
  const k = teile('kuechenzeile')
  const namen = new Set(k.filter((q) => q.ding).map((q) => q.ding))
  for (const d of ['kaffeemaschine', 'tasse', 'wasserkocher', 'messerblock', 'kellen', 'oel', 'essig', 'brett', 'spuelmittel']) wahr(`Kuechenzeile: ${d} auf der Platte`, namen.has(d))
  wahr('Kuechenzeile: Geschirrtuch am Ofengriff', k.some((q) => q.farbe === F.leinen && q.y1 > 60 && !q.ding))
  wahr('Kuechenzeile: Kochfeld mit vier Zonen', k.filter((q) => q.form?.art === 'zylinder' && q.z0 >= 90.6 && q.z1 <= 90.81).length === 8)
  wahr('Kuechenzeile: Arbeitsplatte 3,8 cm, um das Becken ausgeschnitten', k.filter((q) => q.farbe === F.platte && q.z0 === 90 - 3.8 && q.z1 === 90).length === 4)
  wahr('Kuechenzeile: Becken 18 cm tief', k.some((q) => q.farbe === F.metall && q.z0 === 72))
  wahr('Kuechenzeile: Sockel 10 cm, 5 cm hinter den Fronten', k.some((q) => q.z0 === 0 && q.z1 === 10 && Math.abs(q.y1 - (60 - 2 - 5)) < 1e-9))
  const tueren = k.filter((q) => q.front?.art === 'tuer')
  wahr('Kuechenzeile: jede Tuer mit Gruppe und Griff', tueren.length >= 6 && tueren.every((q) => k.some((g) => g.front?.art === 'griff' && g.front.gruppe === q.front.gruppe)))
  wahr('Kuechenzeile: 3 mm Fuge zwischen Fronten', tueren.every((q) => Math.abs(((q.x1 - q.x0) % 60) - 59.7) < 0.01 || Math.abs(q.x1 - q.x0 - 59.7) < 0.01))
  wahr('Kuechenzeile: Schublade mit Griff', [...new Set(k.filter((q) => q.front?.art === 'schub').map((q) => q.front.gruppe))].every((g) => k.some((q) => q.front?.art === 'schub' && q.front.gruppe === g && q.farbe === F.griff)))
  wahr('Kuechenzeile: Einlegeboeden (unten und oben)', k.filter((q) => q.farbe === '#e2e1dd' && Math.abs(q.z1 - q.z0 - 1.8) < 1e-9 && q.x1 - q.x0 > 40).length >= 6)
  wahr('Kuechenzeile: Glaeser durchsichtig', k.some((q) => q.farbe === F.glas && q.deckkraft === 0.5))
  wahr('Kuechenzeile: Licht unter den Oberschraenken und in der Haube', k.filter((q) => q.leuchte).length === 2)
  const namenL = (ecke) => [...new Set(teile(`kuechenzeile L ${ecke}`).filter((q) => q.ding).map((q) => q.ding))].sort().join()
  wahr('L-Kueche: Dinge in allen Ecken gleich und einmal', ['lo', 'ru', 'lu'].every((e) => namenL(e) === namenL('ro')) && namenL('ro').split(',').length >= 9)
  console.log(`Teile: Kuechenzeile 240 ${k.length}, 360 ${teile('Kuechenzeile 360').length}, L ${teile('kuechenzeile L ro').length}, Stuhl ${teile('stuhl').length}, Buerostuhl ${teile('buerostuhl').length}, Essgruppe ${teile('essgruppe').length}`)
}
wahr('Kuehlschrank: Tuerfaecher drehen mit der Tuer', zahl('kuehlschrank', (q) => q.front?.art === 'griff' && q.farbe === F.glas) === 3)
wahr('Einbaukuehlschrank: Glasboeden und Tuerfaecher', zahl('Einbaukuehlschrank', (q) => q.farbe === F.glas && !q.front) >= 4 && zahl('Einbaukuehlschrank', (q) => q.front?.art === 'griff' && q.farbe === F.glas) === 3)
wahr('Hochschrank ohne Kuehlschrank: keine Glasboeden', zahl('hochschrank', (q) => q.farbe === F.glas) === 0)
wahr('Backofen: Fenster und Griffstange', zahl('backofen', (q) => q.form?.achse === 'laengs' && q.x1 - q.x0 > 40) === 1)
wahr('Gefrierschrank: Faecher', zahl('gefrierschrank', (q) => q.farbe === F.glas) >= 3)
wahr('Spiegel: Spiegelflaeche', zahl('spiegel', (q) => q.spiegel === true) === 1)
wahr('Sockel: Schublade mit Griff', zahl('sockel', (q) => q.front?.art === 'schub') === 5)
wahr('Spielkueche: zwei Tueren mit Griff', zahl('spielkueche', (q) => q.front?.art === 'tuer') === 2 && zahl('spielkueche', (q) => q.front?.art === 'griff') === 3)
wahr('Spielzeugkiste: Spielsachen zum Herausnehmen', ['ball-rot', 'ball-blau', 'klotz', 'auto'].every((d) => zahl('spielzeugkiste', (q) => q.ding === d) > 0))
wahr('Badewanne: Handtuch zum Aufheben', zahl('badewanne', (q) => q.ding === 'handtuch') === 2)
wahr('Buecher: Reihe stehend, Stapel liegend', teile('buecher').every((q) => q.z0 === 0) && teile('Buecherstapel').some((q) => q.z0 > 0))
wahr('Kissen: drei nebeneinander', teile('Kissen drei stehend').length === 6)
wahr('Grosser Korb: nicht aufhebbar', teile('Korb gross eckig').every((q) => !q.ding))
{
  // E92: die eingerollte Decke nur im offenen Korb ab 30 cm, der Deckel schliesst oben ab.
  const decke = misch(F.spielRot, F.leinen, 0.5)
  const hatDecke = (n) => teile(n).some((q) => q.farbe === decke)
  wahr('Korb: Decke im gewoehnlichen Korb', hatDecke('korb') && hatDecke('Korb gross eckig'))
  wahr('Korb: keine Decke mit Deckel, im Waeschekorb, im kleinen Korb', ['Waeschekorb mit Deckel', 'Korb eckig mit Deckel', 'Waeschekorb offen', 'Korb klein'].every((n) => !hatDecke(n)))
  for (const [n, H] of [['Waeschekorb mit Deckel', 55], ['Korb eckig mit Deckel', 30]]) {
    const oben = Math.max(...teile(n).map((q) => q.z1))
    wahr(`${n}: Griff reicht bis H, Deckel liegt darunter`, Math.abs(oben - H) < 1e-9 && teile(n).some((q) => q.z0 > H - 6 && q.z1 < H && q.x1 - q.x0 > 30))
  }
}

// Klappstuhl, Kinderstuhl und Einbaukuehlschrank sind ueber den Namen erreichbar.
wahr('Name Klappstuhl ist ein Stuhl', moebelArt('Klappstuhl') === 'stuhl')
wahr('Name Kinderstuhl ist ein Stuhl', moebelArt('Kinderstuhl LÄTT') === 'stuhl')
wahr('Name Hochschrank mit Einbaukuehlschrank', moebelArt('Hochschrank mit Einbaukühlschrank') === 'hochschrank')
wahr('Unbekannte Art: null', moebelTeile(objekt('x', [50, 50, 50]), null, F, DECKE) === null)
wahr('DEKO_ARTEN ohne Sockel', DEKO_ARTEN.size === 23 && !DEKO_ARTEN.has('sockel'))
wahr('DEKO_ARTEN: Bad-Deko ja, BESTÅ-Bank nein', BAD_DEKO.every((a) => DEKO_ARTEN.has(a)) && !DEKO_ARTEN.has('besta_bank'))

// Eigene Farbe traegt der Hauptteil.
for (const art of ['spielzeugkiste', 'kuscheltier', 'spielkueche', 'buecher', 'bild', 'kissen', 'wolldecke', 'korb', 'vorhang', 'obstschale', 'blumenkasten', 'sockel', 'kinderbett', 'stuhl', 'buerostuhl', 'bett', 'sofa', 'besta_bank', ...BAD_DEKO]) {
  const eigen = '#3366aa'
  const t = moebelTeile(objekt(art, GROESSE[art], { farbe: eigen }), art, F, DECKE)
  wahr(`${art}: eigene Farbe genutzt`, !!t && t.some((q) => q.farbe === eigen))
}

// L-Formen: in allen Ecken gleich viele Teile und Plaetze (die Eckbank
// nicht: ihr zweiter Kasten hat nur an der Wand eine Lehne, E73).
for (const art of ['kuechenzeile', 'sofa']) {
  const n = ['ro', 'lo', 'ru', 'lu'].map((e) => teile(`${art} L ${e}`))
  wahr(`${art} L: gleich viele Teile in allen Ecken`, n.every((x) => x.length === n[0].length))
  wahr(`${art} L: gleich viele Plaetze in allen Ecken`, n.every((x) => x.filter((q) => q.platz).length === n[0].filter((q) => q.platz).length))
}

/* ------------------------------------------------------------ E91: Eckbank BESTA */

{
  for (const [name, n] of [['Eckbank Nord', 3], ['Eckbank Ost', 2]]) {
    const b = teile(name)
    const B = n === 3 ? 180 : 120
    const tueren = b.filter((q) => q.front?.art === 'tuer')
    wahr(`${name}: ${n} Tueren LAPPVIKEN ohne Griff`, tueren.length === n && !b.some((q) => q.front?.art === 'griff' || q.farbe === F.griff))
    wahr(`${name}: Tueren 60 cm mit 3 mm Fuge, vorn bei 42, vom Boden bis 38`, tueren.every((q) => Math.abs(q.x1 - q.x0 - (B / n - 0.3)) < 1e-9 && q.y1 === 42 && q.z0 < 0.5 && Math.abs(q.z1 - 38) < 0.5))
    wahr(`${name}: Korpus 38 hoch, weiss`, b.some((q) => !q.front && q.z1 === 38 && q.x1 - q.x0 === B && q.farbe === F.weiss))
    const sitze = b.filter((q) => q.platz)
    wahr(`${name}: ${n} Sitzpolster, Blick nach vorn, Oberkante 44, fast so tief wie die Bank`, sitze.length === n && sitze.every((q) => q.platz.art === 'sitz' && q.platz.blick === 'vorn' && q.z0 === 38 && q.z1 === 44 && q.y1 - q.y0 >= 40))
    const ruecken = b.filter((q) => q.kipp?.laengs > 0)
    wahr(`${name}: ${n} Rueckenpolster, leicht angelehnt`, ruecken.length === n && ruecken.every((q) => q.kipp.laengs === 10 && q.x1 - q.x0 <= 62 && q.y1 - q.y0 === 10))
    const oben = Math.max(...ruecken.map((q) => huelle(q).z1))
    const unten = Math.min(...ruecken.map((q) => huelle(q).z0))
    wahr(`${name}: Rueckenpolster vom Sitz (44) bis H (85)`, Math.abs(oben - 85) < 0.01 && Math.abs(unten - 44) < 0.01)
    wahr(`${name}: Rueckenpolster an der Wand`, ruecken.every((q) => Math.abs(huelle(q).y0 - 0.3) < 0.01))
    wahr(`${name}: KUDDARNA graubeige`, sitze.every((q) => /^#d[0-9a-f]/.test(q.farbe)) && b.filter((q) => q.kipp).every((q) => q.farbe !== F.stoff))
  }
  wahr('BESTÅ ohne Ruecken (H 44): keine Rueckenpolster, Sitz auf 44', teile('BESTÅ ohne Ruecken').every((q) => !q.kipp) && teile('BESTÅ ohne Ruecken').filter((q) => q.platz).every((q) => q.z1 === 44))
  const l = teile('besta_bank L ro')
  wahr('BESTÅ als L: zwei Kaesten, Rueckenpolster nur an der Wand', l.filter((q) => q.front?.art === 'tuer').length >= 3 && l.filter((q) => q.kipp).every((q) => q.y0 < 20))
}

/* ------------------------------------------------------------ E91: Deko fuer Bad und WC */

// Dreiecke je Teil so, wie der Motor die Formen baut (motor.ts form()):
// Kugel 32 x 20, Zylinder 40 Seiten, Quader mit Rundung 1, 2 oder 4
// Segmenten (unter 2 mm: glatter Quader), Moebelteile ohne Rundung mit Fase.
const FASE_ROLLEN = new Set(['moebel', 'front', 'regal', 'brett', 'kiste'])
function dreiecke(k) {
  if (k.form?.art === 'keil') return 8
  if (k.form?.art === 'kugel') return 32 * 20 * 2 - 2 * 32
  if (k.form?.art === 'zylinder') return 40 * 4
  const klein = Math.min(...k.masse)
  const r = Math.min(k.rund ?? (FASE_ROLLEN.has(k.rolle) ? Math.min(0.008, klein * 0.25) : 0), klein / 2)
  if (r < 0.002) return 12
  const s = 2 * (r >= 0.02 ? 4 : r >= 0.008 ? 2 : 1) + 1
  return 6 * s * s * 2
}
const dreieckeVon = (name, art) => {
  const x = faelle.find((c) => c.name === name)
  return moebelQuader(x.o, ergebnis.get(name), F, art, false).reduce((s, k) => s + dreiecke(k), 0)
}
{
  const zahlen = []
  for (const x of faelle.filter((c) => BAD_DEKO.includes(c.art))) {
    const d = dreieckeVon(x.name, x.art)
    zahlen.push(`${x.name} ${d}`)
    wahr(`${x.name}: ${d} Dreiecke, hoechstens 1500`, d <= 1500)
    wahr(`${x.name}: keine Kugel`, ergebnis.get(x.name).every((q) => q.form?.art !== 'kugel'))
  }
  console.log(`Dreiecke Bad-Deko: ${zahlen.join(', ')}`)
  console.log(`Dreiecke Eckbank: Nord ${dreieckeVon('Eckbank Nord', 'besta_bank')}, Ost ${dreieckeVon('Eckbank Ost', 'besta_bank')}`)
}
{
  // Handtuecher: Stange mit Haltern, ein bis drei Tuecher je Breite, jedes zum Abnehmen, Farben aus dem Namen.
  const tuecher = (name) => [...new Set(teile(name).filter((q) => q.ding).map((q) => q.ding))]
  wahr('Handtuch 40: ein Tuch', tuecher('Handtuchstange schmal').length === 1)
  wahr('Handtuch 70: zwei Tuecher', tuecher('handtuch').length === 2)
  wahr('Handtuch 100: drei Tuecher', tuecher('Handtuchstange breit').length === 3)
  wahr('Handtuch: Stange aus Metall, laengs, kein Ding', zahl('handtuch', (q) => q.form?.achse === 'laengs' && q.farbe === F.metall && !q.ding) === 1)
  const farbe = (name, d) => teile(name).find((q) => q.ding === d && q.form?.art === 'zylinder').farbe
  wahr('Handtuecher salbeigruen und weiss in der Reihenfolge des Namens', farbe('Handtuecher zwei Farben', 'handtuch1') === misch(F.gruen, F.leinen, 0.62) && farbe('Handtuecher zwei Farben', 'handtuch2') === misch(F.waesche, F.leinen, 0.12))
  wahr('Handtuecher terrakotta, salbeigruen, grau', ['handtuch1', 'handtuch2', 'handtuch3'].map((d) => farbe('Handtuchstange breit', d)).join() === [misch(F.topf, F.leinen, 0.32), misch(F.gruen, F.leinen, 0.62), misch(F.stoff, F.leinen, 0.38)].join())
  wahr('Handtuch ohne Farbwort: beige', farbe('handtuch', 'handtuch1') === misch(F.leinen, F.pappe, 0.28))
  wahr('Handtuch am Haken: ein Haken, ein Tuch, oben zusammengerafft', zahl('Handtuch am Haken', (q) => q.form?.achse === 'quer' && q.farbe === F.metall) === 2 && tuecher('Handtuch am Haken').length === 1 && zahl('Handtuch am Haken', (q) => q.ding && q.form?.oben < 0.3) === 2)
  wahr('Handtuchstapel: vier gefaltete Lagen je 5 cm mit Bordure', zahl('handtuchstapel', (q) => q.z1 - q.z0 > 4) === 4 && zahl('handtuchstapel', (q) => q.z1 - q.z0 < 1) === 4 && teile('handtuchstapel').every((q) => !q.form))
  wahr('Handtuecher gerollt: drei Rollen in zwei Reihen, vorn die Wicklung', zahl('Handtuecher gerollt', (q) => q.form?.achse === 'quer' && q.y1 - q.y0 > 20) === 3 && zahl('Handtuecher gerollt', (q) => q.form?.achse === 'quer' && q.y1 - q.y0 < 1) === 3 && zahl('Handtuecher gerollt', (q) => q.z0 > 5) === 2)
  {
    const flach = moebelTeile(objekt('handtuchstapel', [45, 30, 12], { name: 'Handtücher gerollt' }), 'handtuchstapel', F, DECKE).filter((q) => q.y1 - q.y0 > 20)
    wahr('Handtuecher gerollt flach: eine Reihe von drei', flach.length === 3 && flach.every((q) => q.z0 === 0))
  }
  // Becher, Spender, Seifenschale.
  for (const d of ['becher', 'spender', 'seife']) wahr(`Badaccessoires: ${d}`, zahl('badaccessoires', (q) => q.ding === d) > 0)
  wahr('Badaccessoires: zwei Zahnbuersten geneigt', zahl('badaccessoires', (q) => q.ding === 'becher' && q.kipp?.quer) === 4)
  wahr('Badaccessoires schmal: ohne Seifenschale', moebelTeile(objekt('badaccessoires', [20, 9, 18]), 'badaccessoires', F, DECKE).every((q) => q.ding !== 'seife'))
  // Kerzen: drei (zwei bei schmalem Tablett), Flamme glimmt leise, verschieden hoch.
  const flammen = (name) => teile(name).filter((q) => q.glut)
  wahr('Kerzen: drei Flammen mit Glut', flammen('kerzen').length === 3 && flammen('kerzen').every((q) => q.glut > 0.5 && q.glut <= 1 && q.form?.art === 'zylinder' && q.form.oben < 0.5))
  wahr('Kerzen: verschieden hoch', new Set(flammen('kerzen').map((q) => Math.round(q.z0 * 10))).size === 3)
  wahr('Kerzen schmal: zwei', moebelTeile(objekt('kerzen', [15, 10, 14]), 'kerzen', F, DECKE).filter((q) => q.glut).length === 2)
  wahr('Duftstaebchen: acht Staebchen geneigt, Flasche durchscheinend', zahl('duftstaebchen', (q) => q.kipp) === 8 && zahl('duftstaebchen', (q) => q.deckkraft !== undefined && q.deckkraft < 1) === 2)
  wahr('Wannenablage: Kerze mit Flamme und Buch zum Nehmen', zahl('badewannenablage', (q) => q.ding === 'kerze' && q.glut) === 1 && zahl('badewannenablage', (q) => q.ding === 'buch') === 4)
  wahr('Doppelrollenhalter: zwei Rollen, die Ersatzrolle zum Nehmen', zahl('Doppelrollenhalter', (q) => q.form?.achse === 'laengs' && q.farbe === misch(F.waesche, F.keramik, 0.5)) === 2 && zahl('Doppelrollenhalter', (q) => q.ding === 'ersatzrolle') === 2)
  wahr('Einzelrollenhalter: eine Rolle', zahl('Einzelrollenhalter', (q) => q.form?.achse === 'laengs' && q.farbe === misch(F.waesche, F.keramik, 0.5)) === 1 && zahl('Einzelrollenhalter', (q) => q.ding) === 0)
  wahr('Klobuerste: Halter, Stiel, Knauf', teile('klobuerste').length === 5 && teile('klobuerste').every((q) => q.form?.art === 'zylinder'))
  wahr('Bademantel: Haken fest, Mantel zum Abnehmen, Aermel und Kragen', zahl('bademantel', (q) => !q.ding) === 2 && zahl('bademantel', (q) => q.ding === 'bademantel' && q.kipp?.quer) === 4)
  wahr('Bademantel grau', teile('Bademantel grau').some((q) => q.farbe === misch(F.stoff, F.leinen, 0.38)))
  wahr('Wandregal: zwei Bretter, zwei Seiten, Kante vorn und Stange hinten', teile('wandregal').length === 6 && zahl('wandregal', (q) => q.form?.achse === 'laengs') === 1)
  // Pflanzen (E91): Gruenlilie und Haengepflanze eigen, auch klein; alle anderen wie bisher.
  wahr('Gruenlilie: Topf, Erde, 14 Blaetter aus zwei Stuecken', teile('Gruenlilie').length === 30 && zahl('Gruenlilie', (q) => q.kipp) === 28)
  wahr('Efeutute: Topf, Erde, Busch und fuenf Ranken mit Blaettern', teile('Efeutute').length === 2 + 20 + 25 && zahl('Efeutute', (q) => q.z1 < 40 * 0.45) >= 10)
  wahr('Andere Pflanze wie bisher: Topf und runde Krone', teile('pflanze').length === 2 && teile('pflanze')[1].form?.art === 'kugel')
  // Nacharbeit E91: eine grosse Efeutute am Boden ist kein Geruest aus Staeben.
  wahr('Efeutute gross (90 cm): Topf und runde Krone wie bisher', teile('Efeutute gross').length === 2 && teile('Efeutute gross')[1].form?.art === 'kugel')
  for (const n of ['Gruenlilie', 'Gruenlilie klein', 'Efeutute', 'Efeutute klein']) {
    const d = dreieckeVon(n, 'pflanze')
    wahr(`${n}: ${d} Dreiecke, hoechstens 1500, keine Kugel`, d <= 1500 && ergebnis.get(n).every((q) => q.form?.art !== 'kugel'))
  }
  wahr('Wandbrett: ein Brett auf zwei Konsolen', teile('Wandbrett').length === 5 && zahl('Wandbrett', (q) => q.kipp?.laengs) === 2)
  wahr('Seifenschale: Schale und Seife', teile('seifenschale').length === 3)
  // Weicher Stoff ohne Kantenlinie, Holz und Moebel wie bisher mit.
  const linien = (name, art) => moebelQuader(faelle.find((c) => c.name === name).o, ergebnis.get(name), F, art, false).filter((k) => k.kante).length
  wahr('Stoff ohne Kantenlinie: Handtuecher, Stapel, Bademantel', linien('handtuch', 'handtuch') === 0 && linien('handtuchstapel', 'handtuchstapel') === 0 && teile('bademantel').filter((q) => q.ding).every((q) => q.weich))
  wahr('Holz und Kaesten mit Kantenlinie wie bisher', linien('wandregal', 'wandregal') > 0 && linien('sideboard', 'sideboard') > 0 && linien('vorhang', 'vorhang') > 0)
}

/* ------------------------------------------------------------ E95: Schienenregal */
{
  const regal = (name, B, T, H, brett) => ({ ...objekt(null, [B, T, H]), art: 'regal', name, brett_cm: brett, spalten: 1 })
  // Schienenzahl: unter 80 zwei, unter 130 drei, sonst vier; Eckbrett keine.
  const ohne = { links: false, rechts: false, ecke: false }
  for (const [B, n] of [[40, 2], [79, 2], [80, 3], [129, 3], [130, 4], [300, 4]]) wahr(`Schienenregal ${B} cm: ${n} Schienen`, schienenZahl(B, ohne) === n && schienenX(B, 40, ohne).length === n)
  wahr('Schienenregal Ecke: keine Schienen', schienenZahl(60, { ...ohne, ecke: true }) === 0)
  const faelleS = [
    ['Schienenregal hinten', 300, 40, 200, [0, 40, 80, 120, 160, 197]],
    ['Schienenregal links, 45 links', 160, 40, 200, [0, 40, 80, 120, 160, 197]],
    ['Schienenregal rechts, 45 rechts', 120, 40, 200, [0, 35, 75]],
    ['Schienenregal 45 beide', 100, 40, 180, [10, 60, 120]],
    ['Schienenregal 45 beide schmal', 50, 40, 180, [10, 60]],
    ['Schienenregal Ecke, 45 rechts', 40, 40, 200, [0, 40, 80, 120, 160]],
    ['Schienenregal 45 links schmal', 30, 40, 180, [50]],
  ]
  for (const [name, B, T, H, brett] of faelleS) {
    const o = regal(name, B, T, H, brett)
    const s = schienenregal(o)
    wahr(`${name}: erkannt`, !!s)
    const teile = schienenTeile(o, s)
    const fin = teile.every((q) => [q.x0, q.x1, q.y0, q.y1, q.z0, q.z1].every(Number.isFinite) && q.x0 < q.x1 && q.y0 < q.y1 && q.z0 < q.z1)
    wahr(`${name}: Zahlen endlich, Masse positiv`, fin)
    wahr(`${name}: alles im Kasten B x T x H`, teile.every((q) => q.x0 >= -1e-9 && q.x1 <= B + 1e-9 && q.y0 >= -1e-9 && q.y1 <= T + 1e-9 && q.z0 >= -1e-9 && q.z1 <= H + 1e-9))
    // Jeder Keil liegt im Umriss: seine drei Ecken haben hoechstens die Brett-Tiefe an ihrer Stelle.
    const keile = teile.filter((q) => q.keil)
    const ecken = (q) => (q.keil === 'links' ? [[q.x0, q.y0], [q.x1, q.y0], [q.x1, q.y1]] : [[q.x0, q.y0], [q.x1, q.y0], [q.x0, q.y1]])
    wahr(`${name}: Keile im Umriss`, keile.every((q) => ecken(q).every(([x, y]) => y <= brettTiefe(x, B, T, s) + 1e-9)))
    // Die Flaeche der Brettteile ist die des Umrisses.
    const u = brettUmriss(B, T, s)
    let fl = 0
    for (let i = 0; i < u.length; i++) fl += u[i][0] * u[(i + 1) % u.length][1] - u[(i + 1) % u.length][0] * u[i][1]
    const bretter = brett.filter((b) => b >= 2.7 && b <= H)
    const teilFl = teile.filter((q) => q.art === 'brett').reduce((a, q) => a + (q.x1 - q.x0) * (q.y1 - q.y0) * (q.keil ? 0.5 : 1), 0)
    wahr(`${name}: Brettflaeche wie der Umriss (${Math.round(teilFl)} zu ${Math.round(Math.abs(fl / 2) * bretter.length)})`, Math.abs(teilFl - Math.abs(fl / 2) * bretter.length) < 0.01)
    const n = schienenZahl(B, s)
    wahr(`${name}: ${n} Schienen ueber die volle Hoehe`, teile.filter((q) => q.art === 'schiene').length === n && teile.filter((q) => q.art === 'schiene').every((q) => q.z0 === 0 && q.z1 === H && q.y0 === 0))
    // Konsolen: je Brett (ab 6,2 cm) eine an jeder Schiene, direkt darunter.
    const arme = teile.filter((q) => q.art === 'arm')
    const mitArm = brett.filter((b) => b >= 6.2 && b <= H)
    if (!name.includes('schmal')) wahr(`${name}: ${mitArm.length} x ${n} Konsolen`, arme.length === mitArm.length * n && mitArm.every((b) => arme.filter((q) => Math.abs(q.z1 - (b - 2.7)) < 1e-9).length === n))
    const welt = schienenQuader({ ...o, id: 'sr', x: 100, y: 100, drehung: 270, raum_id: 'r' }, s, F, false)
    wahr(`${name}: Quader endlich`, welt.every((k) => [...k.mitte, ...k.masse, k.drehY].every(Number.isFinite) && k.masse.every((v) => v > 0)))
    wahr(`${name}: Keil-Form nur an Keilen`, welt.filter((k) => k.form?.art === 'keil').length === keile.length)
    const d = welt.reduce((a, k) => a + dreiecke(k), 0)
    if (name === 'Schienenregal hinten') console.log(`Dreiecke Schienenregal 300 cm, 5 Bretter: ${d}`)
    wahr(`${name}: ${d} Dreiecke, hoechstens 2000`, d <= 2000)
  }
  // Winzige und kaputte Masse: keine kaputten Zahlen.
  for (const [B, T, H] of [[1, 1, 1], [0.5, 40, 100], [100, 0.4, 100], [3, 3, 3], [0, 40, 100]]) {
    for (const name of ['Schienenregal 45 beide', 'Schienenregal 45 links', 'Schienenregal']) {
      const o = regal(name, B, T, H, [0, 1, 2.8, 5, 50])
      const s = schienenregal(o)
      const teile = schienenTeile(o, s)
      wahr(`${name} ${B}x${T}x${H}: keine kaputten Zahlen`, teile.every((q) => [q.x0, q.x1, q.y0, q.y1, q.z0, q.z1].every(Number.isFinite) && q.x0 < q.x1 && q.y0 < q.y1 && q.z0 < q.z1 && q.x1 <= B + 1e-9 && q.y1 <= T + 1e-9 && q.z1 <= H + 1e-9))
      wahr(`${name} ${B}x${T}x${H}: Umriss endlich`, brettUmriss(B, T, s).every((p) => p.every(Number.isFinite)))
    }
  }
}

// Die Szene baut alles ohne kaputte Zahlen.
{
  const raum = { id: 'r', grundriss_id: 'g', project_id: 'p', tag_id: null, name: 'r', art: 'innen', punkte: [[0, 0], [2000, 0], [2000, 1200], [0, 1200]], hoehe_cm: DECKE, bodenfarbe: null, wandfarben: null, sort: 0, tag_name: null, tag_short: null, tag_color: null }
  const objekte = faelle.map((x, i) => ({ ...x.o, x: 30 + (i % 10) * 190, y: 30 + Math.floor(i / 10) * 260 > 1100 ? 30 : 30 + Math.floor(i / 10) * 260, drehung: [0, 90, 180, 270][i % 4] }))
  const daten = { grundriss: { id: 'g', project_id: 'p', name: 'g', sort: 0, version: 1, created_at: '', updated_at: '' }, raeume: [raum], oeffnungen: [], objekte, kisten: [] }
  const k = baueSzene(daten, F).filter((x) => x.art === 'quader')
  wahr('Szene: Moebel gebaut', k.filter((x) => x.rolle === 'moebel' || x.rolle === 'front').length > 1000)
  wahr('Szene: alle Zahlen endlich, Masse positiv', k.every((x) => [...x.mitte, ...x.masse, x.drehY].every(Number.isFinite) && x.masse.every((v) => v > 0)))
}

console.log(fehler ? `${fehler} Abweichungen` : 'ok')
process.exit(fehler ? 1 : 0)
