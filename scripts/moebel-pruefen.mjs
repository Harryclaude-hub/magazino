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
//
// Aufruf im Projektordner: node scripts/moebel-pruefen.mjs
// Ausgabe "ok" oder die abweichenden Faelle, Exit 1 bei Fehlern.
import { readFileSync } from 'node:fs'
import { moebelTeile } from '../src/components/plan3d/moebel3d.ts'
import { baueSzene } from '../src/components/plan3d/szene.ts'
import { DEKO_ARTEN, moebelArt } from '../src/components/plan/moebelArt.ts'

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
}

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
fall('Stoffbox', 'spielzeugkiste', [40, 30, 30], { material: 'stoff' })
fall('Vorhang schmal', 'vorhang', [80, 6, 220])
fall('Sockel mit zwei Schubladen', 'sockel', [80, 40, 52])
// L-Formen in allen vier Ecken.
const L = {
  kuechenzeile: [[270, 180, 90], 210, 120],
  sofa: [[250, 160, 85], 90, 70],
  bank: [[180, 65, 85], 159, 15],
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

const SITZEN = new Set(['sofa', 'sessel', 'stuhl', 'bank', 'buerostuhl', 'wc', 'bett', 'kinderbett', 'essgruppe'])
const GANZ = new Set(['kuscheltier', 'bausteine', 'buecher', 'kissen', 'obstschale', 'wolldecke'])
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
  const namen = ['', 'Klappstuhl', 'Kinderstuhl', 'Hochschrank mit Einbaukühlschrank']
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

// Klappstuhl, Kinderstuhl und Einbaukuehlschrank sind ueber den Namen erreichbar.
wahr('Name Klappstuhl ist ein Stuhl', moebelArt('Klappstuhl') === 'stuhl')
wahr('Name Kinderstuhl ist ein Stuhl', moebelArt('Kinderstuhl LÄTT') === 'stuhl')
wahr('Name Hochschrank mit Einbaukuehlschrank', moebelArt('Hochschrank mit Einbaukühlschrank') === 'hochschrank')
wahr('Unbekannte Art: null', moebelTeile(objekt('x', [50, 50, 50]), null, F, DECKE) === null)
wahr('DEKO_ARTEN ohne Sockel', DEKO_ARTEN.size === 12 && !DEKO_ARTEN.has('sockel'))

// Eigene Farbe traegt der Hauptteil.
for (const art of ['spielzeugkiste', 'kuscheltier', 'spielkueche', 'buecher', 'bild', 'kissen', 'wolldecke', 'korb', 'vorhang', 'obstschale', 'blumenkasten', 'sockel', 'kinderbett', 'stuhl', 'buerostuhl', 'bett', 'sofa']) {
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
