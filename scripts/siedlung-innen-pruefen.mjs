// Prueft src/lib/siedlungInnen.ts (E84) ohne Browser, mit einem erfundenen
// Wohnungstyp (Vorraum, L-foermiger Wohnraum, Bad, Balkon; Tueren,
// Fenster, Kueche und Bad) in einem erfundenen Haus:
// - wohnungAuslegen in allen acht Lagen (gespiegelt oder nicht, vier
//   Drehungen, frei verschoben): Raeume bleiben im Uhrzeigersinn und gleich
//   gross, jede Oeffnung deckt genau die mitbewegte Strecke ab, die Angel
//   sitzt am mitbewegten Punkt, die Tuer schlaegt zur selben Seite auf,
//   jedes Moebel deckt die mitbewegte Flaeche ab und hat die Rueckseite
//   an derselben Stelle, der Eingang wandert mit, das Sprungziel steht am
//   Eingang und schaut in jeder Drehung des Hauses genau zur Tuer,
// - Zahlen: Formel R aus dem Vertrag, Spiegeln, Geschoss in Siedlung,
//   Flaeche, Eingang vor der Tuer,
// - Ueberdeckung zweier Wohnungen (gemeinsame Wand zaehlt nicht),
// - siedlungInnenPruefen: das Haus ist gueltig, jede kaputte Abwandlung
//   meldet die erwartete Kennung an der erwarteten Stelle,
// - die Grenzen stehen gleich in supabase/migrations/0045_siedlung_innen.sql.
// Aufruf im Projektordner: node scripts/siedlung-innen-pruefen.mjs
// Ausgabe "ok" oder die abweichenden Faelle, Exit 1 bei Fehlern.
import { readFileSync } from 'node:fs'
import {
  EINGANG_ABSTAND_CM,
  INNEN_GRENZEN as G,
  eingangAussen,
  eingangSprungziel,
  geschossUeberlappungen,
  geschossZuSiedlung,
  jsonbTextLaenge,
  polygonQm,
  punktAuslegen,
  siedlungInnenPruefen,
  wohnungAuslegen,
} from '../src/lib/siedlungInnen.ts'

let fehler = 0
function wahr(name, ist) {
  if (!ist) {
    console.log('ABWEICHUNG', name)
    fehler++
  }
}
function nahe(name, ist, soll, tol = 0.011) {
  if (!(Math.abs(ist - soll) <= tol)) {
    console.log('ABWEICHUNG', name, 'ist', ist, 'soll', soll)
    fehler++
  }
}
const punktNahe = (a, b, tol = 0.011) => Math.abs(a[0] - b[0]) <= tol && Math.abs(a[1] - b[1]) <= tol
/** Zwei Punktmengen gleich (Reihenfolge egal). */
const mengeGleich = (a, b) => a.length === b.length && a.every((p) => b.some((q) => punktNahe(p, q)))

/* ------------------------------------------------ erfundener Typ */

const TYP = {
  raeume: [
    { name: 'Vorraum', art: 'innen', punkte: [[0, 0], [300, 0], [300, 200], [0, 200]] },
    { name: 'Wohnen', art: 'innen', punkte: [[300, 0], [800, 0], [800, 500], [500, 500], [500, 200], [300, 200]] },
    { name: 'Bad', art: 'innen', punkte: [[0, 200], [300, 200], [300, 450], [0, 450]] },
    { name: 'Balkon', art: 'draussen', punkte: [[500, 500], [800, 500], [800, 650], [500, 650]] },
  ],
  oeffnungen: [
    { raum: 0, art: 'tuer', kante: 0, abstand_cm: 100, breite_cm: 100, hoehe_cm: 210, bruestung_cm: 0, anschlag: 'links', aufschlag: 'innen', eingang: true },
    { raum: 0, art: 'durchgang', kante: 1, abstand_cm: 50, breite_cm: 100, hoehe_cm: 250, bruestung_cm: 0, anschlag: 'links', aufschlag: 'innen' },
    { raum: 2, art: 'tuer', kante: 0, abstand_cm: 180, breite_cm: 80, hoehe_cm: 210, bruestung_cm: 0, anschlag: 'rechts', aufschlag: 'aussen' },
    { raum: 1, art: 'fenster', kante: 1, abstand_cm: 100, breite_cm: 150, hoehe_cm: 150, bruestung_cm: 85, anschlag: 'links', aufschlag: 'innen' },
    { raum: 1, art: 'tuer', kante: 2, abstand_cm: 50, breite_cm: 100, hoehe_cm: 220, bruestung_cm: 0, anschlag: 'rechts', aufschlag: 'innen' },
  ],
  moebel: [
    { name: 'Kuechenzeile', x: 500, y: 0, breite_cm: 240, tiefe_cm: 60, drehung: 0 },
    { name: 'Badewanne', x: 6, y: 450, breite_cm: 170, tiefe_cm: 75, drehung: 270 },
    { name: 'WC', x: 300, y: 300, breite_cm: 40, tiefe_cm: 60, drehung: 90 },
  ],
}

/* ------------------------------------------------ Hilfen wie Kistly */

const flaeche2 = (p) => p.reduce((s, a, i) => {
  const b = p[(i + 1) % p.length]
  return s + a[0] * b[1] - b[0] * a[1]
}, 0)

/** Anfang und Ende einer Oeffnung (wie oeffnungPunkte in plan/hilfe.ts). */
function strecke(raeume, o) {
  const p = raeume[o.raum].punkte
  const a = p[o.kante]
  const b = p[(o.kante + 1) % p.length]
  const l = Math.hypot(b[0] - a[0], b[1] - a[1])
  const u = [(b[0] - a[0]) / l, (b[1] - a[1]) / l]
  const s = [a[0] + u[0] * o.abstand_cm, a[1] + u[1] * o.abstand_cm]
  return { s, e: [s[0] + u[0] * o.breite_cm, s[1] + u[1] * o.breite_cm], u, innen: [-u[1], u[0]] }
}
/** Wo die Angel sitzt und ein Punkt 10 cm vor der Tuermitte auf der Seite,
 *  zu der das Blatt aufschlaegt (szene.ts: aussen = Gegenrichtung von innen). */
function tuerLage(raeume, o) {
  const { s, e, innen } = strecke(raeume, o)
  const seite = o.aufschlag === 'aussen' ? -1 : 1
  const m = [(s[0] + e[0]) / 2, (s[1] + e[1]) / 2]
  return { angel: o.anschlag === 'rechts' ? e : s, aufschlag: [m[0] + innen[0] * seite * 10, m[1] + innen[1] * seite * 10] }
}
/** Ecken eines Moebels (objektGlobal in lib/geometrie.ts) und seine Rueckseite (lokal y = 0). */
function moebelEcken(m) {
  const g = (lx, ly) => {
    switch (m.drehung) {
      case 0: return [m.x + lx, m.y + ly]
      case 90: return [m.x - ly, m.y + lx]
      case 180: return [m.x - lx, m.y - ly]
      default: return [m.x + ly, m.y - lx]
    }
  }
  return { ecken: [g(0, 0), g(m.breite_cm, 0), g(m.breite_cm, m.tiefe_cm), g(0, m.tiefe_cm)], hinten: [g(0, 0), g(m.breite_cm, 0)] }
}

/* ------------------------------------------------ Zahlen */

{
  const p = punktAuslegen([100, 0], { x: 0, y: 0, spiegeln: false, drehung: 90 })
  wahr('R(90) dreht (100, 0) auf (0, 100)', punktNahe(p, [0, 100]))
  const q = punktAuslegen([100, 50], { x: 10, y: 20, spiegeln: true, drehung: 0 })
  wahr('spiegeln: x wird -x, dann verschieben', punktNahe(q, [-90, 70]))
  const r = punktAuslegen([100, 50], { x: 0, y: 0, spiegeln: true, drehung: 270 })
  wahr('erst spiegeln, dann drehen', punktNahe(r, [50, 100]))
  const s = geschossZuSiedlung({ x: 10, z: -5, drehung: 90 }, [100, 0])
  wahr('Geschoss (100, 0) cm bei Drehung 90 liegt 1 m suedlich', punktNahe(s, [10, -4], 1e-9))
  const s2 = geschossZuSiedlung({ x: 0, z: 0, drehung: 180 }, [250, 100])
  wahr('Geschoss bei Drehung 180', punktNahe(s2, [-2.5, -1], 1e-9))
  nahe('Flaeche Rechteck', polygonQm(TYP.raeume[0].punkte), 6)
  nahe('Flaeche L', polygonQm(TYP.raeume[1].punkte), 19)
  nahe('Flaeche gegen den Uhrzeigersinn', polygonQm([...TYP.raeume[0].punkte].reverse()), 6)
  const e = eingangAussen(TYP.raeume, TYP.oeffnungen[0], 90)
  wahr('Eingang 90 cm vor der Tuermitte, draussen', e && punktNahe(e, [150, -90]))
  const e2 = eingangAussen([{ punkte: [...TYP.raeume[0].punkte].reverse() }], { raum: 0, kante: 2, abstand_cm: 100, breite_cm: 100 }, 90)
  wahr('Eingang auch bei gegen den Uhrzeigersinn draussen', e2 && punktNahe(e2, [150, -90]))
  wahr('Eingang: fremder Raum ist null', eingangAussen(TYP.raeume, { ...TYP.oeffnungen[0], raum: 9 }, 90) === null)
  wahr('Eingang: fremde Kante ist null', eingangAussen(TYP.raeume, { ...TYP.oeffnungen[0], kante: 4 }, 90) === null)
}

/* ------------------------------------------------ alle acht Lagen */

const LAGEN = []
for (const spiegeln of [false, true]) {
  for (const drehung of [0, 90, 180, 270]) LAGEN.push({ x: 1234.5, y: -678, spiegeln, drehung })
}
for (const lage of LAGEN) {
  const name = `${lage.spiegeln ? 'gespiegelt' : 'gerade'} ${lage.drehung}`
  const w = wohnungAuslegen(TYP, lage, 'X01', 'T1')
  const mit = (p) => punktAuslegen(p, lage)
  wahr(`${name}: Top und Typ`, w.top === 'X01' && w.typ === 'T1')
  wahr(`${name}: gleich viele Teile`, w.raeume.length === 4 && w.oeffnungen.length === 5 && w.moebel.length === 3)
  TYP.raeume.forEach((r, i) => {
    const neu = w.raeume[i]
    wahr(`${name}: Raum ${i} im Uhrzeigersinn`, flaeche2(neu.punkte) > 0)
    nahe(`${name}: Raum ${i} gleich gross`, polygonQm(neu.punkte), polygonQm(r.punkte))
    wahr(`${name}: Raum ${i} mitbewegt`, mengeGleich(neu.punkte, r.punkte.map(mit)))
    wahr(`${name}: Raum ${i} Name und Art`, neu.name === r.name && neu.art === r.art)
  })
  TYP.oeffnungen.forEach((o, i) => {
    const neu = w.oeffnungen[i]
    wahr(`${name}: Oeffnung ${i} ohne Merker eingang`, !('eingang' in neu))
    wahr(`${name}: Oeffnung ${i} gleicher Raum, Art, Masse`, neu.raum === o.raum && neu.art === o.art && neu.breite_cm === o.breite_cm && neu.hoehe_cm === o.hoehe_cm && neu.bruestung_cm === o.bruestung_cm && neu.aufschlag === o.aufschlag)
    const alt = strecke(TYP.raeume, o)
    const jetzt = strecke(w.raeume, neu)
    wahr(`${name}: Oeffnung ${i} deckt die mitbewegte Strecke`, mengeGleich([jetzt.s, jetzt.e], [mit(alt.s), mit(alt.e)]))
    const t0 = tuerLage(TYP.raeume, o)
    const t1 = tuerLage(w.raeume, neu)
    wahr(`${name}: Oeffnung ${i} Angel am mitbewegten Punkt`, punktNahe(t1.angel, mit(t0.angel)))
    wahr(`${name}: Oeffnung ${i} schlaegt zur selben Seite auf`, punktNahe(t1.aufschlag, mit(t0.aufschlag)))
  })
  TYP.moebel.forEach((m, i) => {
    const alt = moebelEcken(m)
    const neu = moebelEcken(w.moebel[i])
    wahr(`${name}: Moebel ${i} deckt die mitbewegte Flaeche`, mengeGleich(neu.ecken, alt.ecken.map(mit)))
    wahr(`${name}: Moebel ${i} Rueckseite bleibt hinten`, mengeGleich(neu.hinten, alt.hinten.map(mit)))
    wahr(`${name}: Moebel ${i} Masse und Name`, w.moebel[i].breite_cm === m.breite_cm && w.moebel[i].tiefe_cm === m.tiefe_cm && w.moebel[i].name === m.name)
    wahr(`${name}: Moebel ${i} Drehung erlaubt`, [0, 90, 180, 270].includes(w.moebel[i].drehung))
  })
  const e0 = eingangAussen(TYP.raeume, TYP.oeffnungen[0], EINGANG_ABSTAND_CM)
  wahr(`${name}: Eingang wandert mit`, w.eingang && punktNahe(w.eingang, mit(e0)))
  // Sprungziel: am Eingang, Blick (-sin gier, -cos gier) genau zur Tuermitte, in jeder Drehung des Hauses.
  for (const hd of [0, 90, 180, 270]) {
    const h = { x: -12.5, z: 30, drehung: hd }
    const sp = eingangSprungziel(h, w)
    const ort = geschossZuSiedlung(h, w.eingang)
    const tuer = strecke(w.raeume, w.oeffnungen[0])
    const mitte = geschossZuSiedlung(h, [(tuer.s[0] + tuer.e[0]) / 2, (tuer.s[1] + tuer.e[1]) / 2])
    const l = Math.hypot(mitte[0] - ort[0], mitte[1] - ort[1])
    wahr(`${name}, Haus ${hd}: Sprungziel am Eingang`, sp && punktNahe([sp.x, sp.z], ort, 1e-9))
    wahr(`${name}, Haus ${hd}: Blick zur Tuer`, sp && punktNahe([-Math.sin(sp.gier), -Math.cos(sp.gier)], [(mitte[0] - ort[0]) / l, (mitte[1] - ort[1]) / l], 1e-9))
  }
  const haus = [{ gebaeudeId: 'haus-1', x: 3.5, z: -7, drehung: 0, geschosse: [{ geschoss: 0, wohnungen: [w], allgemein: [] }] }]
  const probleme = siedlungInnenPruefen(haus, ['haus-1'])
  wahr(`${name}: gueltig (${JSON.stringify(probleme)})`, probleme.length === 0)
}

{
  const ohne = wohnungAuslegen({ ...TYP, oeffnungen: TYP.oeffnungen.map(({ eingang: _e, ...o }) => o) }, LAGEN[0], 'X02', 'T1')
  wahr('ohne Wohnungstuer ist eingang null', ohne.eingang === null)
  wahr('ohne Eingang kein Sprungziel', eingangSprungziel({ x: 0, z: 0, drehung: 0 }, ohne) === null)
  const ohneTuer = { ...wohnungAuslegen(TYP, LAGEN[0], 'X02', 'T1'), oeffnungen: [] }
  wahr('ohne Tuer Blick nach -z', eingangSprungziel({ x: 0, z: 0, drehung: 0 }, ohneTuer)?.gier === 0)
  const nah = wohnungAuslegen(TYP, LAGEN[0], 'X03', 'T1', 30)
  const weit = wohnungAuslegen(TYP, LAGEN[0], 'X03', 'T1', 130)
  nahe('Eingang-Abstand wirkt', Math.hypot(weit.eingang[0] - nah.eingang[0], weit.eingang[1] - nah.eingang[1]), 100)
}

/* ------------------------------------------------ Ueberdeckung */

{
  const links = wohnungAuslegen(TYP, { x: 0, y: 0, spiegeln: false, drehung: 0 }, 'X01', 'T1')
  const rechts = wohnungAuslegen(TYP, { x: 1600, y: 0, spiegeln: true, drehung: 0 }, 'X02', 'T1')
  const gang = { art: 'gang', punkte: [[0, -200], [1600, -200], [1600, 0], [0, 0]] }
  const ok = geschossUeberlappungen({ wohnungen: [links, rechts], allgemein: [gang] })
  wahr(`Spiegelpaar mit gemeinsamer Wand ueberdeckt nichts (${JSON.stringify(ok)})`, ok.length === 0)
  const zuNah = wohnungAuslegen(TYP, { x: 700, y: 0, spiegeln: false, drehung: 0 }, 'X03', 'T1')
  const schlecht = geschossUeberlappungen({ wohnungen: [links, zuNah], allgemein: [gang] })
  wahr('verschobene Wohnung ueberdeckt', schlecht.some(([a, b]) => a.startsWith('X01/') && b.startsWith('X03/')))
  const gangDrin = geschossUeberlappungen({ wohnungen: [links], allgemein: [{ art: 'stiege', punkte: [[100, 100], [200, 100], [200, 150], [100, 150]] }] })
  wahr('Stiege in der Wohnung ueberdeckt', gangDrin.length === 1 && gangDrin[0].includes('allgemein/0'))
}

/* ------------------------------------------------ Pruefen */

const W = wohnungAuslegen(TYP, LAGEN[0], 'X01', 'T1')
const kopie = (v) => JSON.parse(JSON.stringify(v))
function haus(aendern = (h) => h) {
  const h = kopie({ gebaeudeId: 'haus-1', x: 3.5, z: -7, drehung: 90, geschosse: [{ geschoss: 0, wohnungen: [W], allgemein: [{ art: 'gang', punkte: [[0, 0], [100, 0], [100, 100]] }] }] })
  return aendern(h) ?? h
}
const IDS = ['haus-1', 'haus-2']
wahr('null ist gueltig', siedlungInnenPruefen(null, IDS).length === 0)
wahr('leere Liste ist gueltig', siedlungInnenPruefen([], IDS).length === 0)
wahr('Haus ist gueltig', siedlungInnenPruefen([haus()], IDS).length === 0)
wahr('ohne Liste der Haeuser wird gebaeudeId nicht verglichen', siedlungInnenPruefen([haus((h) => { h.gebaeudeId = 'fremd' })]).length === 0)

/** [Name, innen, Kennung, Pfad (Anfang)] */
const w0 = '[0].geschosse[0].wohnungen[0]'
const KAPUTT = [
  ['keine Liste', { a: 1 }, 'form', ''],
  ['21 Haeuser', Array.from({ length: 21 }, (_, i) => haus((h) => { h.gebaeudeId = `h${i}` })), 'anzahl', ''],
  ['zu gross', [haus((h) => {
    const raum = { name: 'R', art: 'innen', punkte: Array.from({ length: 200 }, (_, i) => [i * 400.25, i === 0 ? 0 : 99999.75]) }
    raum.punkte[199] = [0, 99999.75]
    h.geschosse[0].wohnungen = Array.from({ length: 100 }, (_, i) => ({ ...kopie(W), top: `T${i}`, raeume: Array.from({ length: 10 }, () => raum), oeffnungen: [] }))
  })], 'groesse', ''],
  ['Haus mit fremdem Schluessel', [haus((h) => { h.farbe = 'rot' })], 'form', '[0]'],
  ['Haus ohne geschosse', [haus((h) => { delete h.geschosse })], 'form', '[0].geschosse'],
  ['gebaeudeId leer', [haus((h) => { h.gebaeudeId = '' })], 'form', '[0].gebaeudeId'],
  ['gebaeudeId doppelt', [haus(), haus()], 'doppelt', ''],
  ['gebaeudeId unbekannt', [haus((h) => { h.gebaeudeId = 'haus-9' })], 'haus_fehlt', '[0].gebaeudeId'],
  ['Haus x zu weit', [haus((h) => { h.x = 6000 })], 'zahl', '[0].x'],
  ['Haus z kein Wert', [haus((h) => { h.z = null })], 'zahl', '[0].z'],
  ['Haus Drehung 45', [haus((h) => { h.drehung = 45 })], 'form', '[0].drehung'],
  ['61 Geschosse', [haus((h) => { h.geschosse = Array.from({ length: 61 }, (_, i) => ({ geschoss: i - 1, wohnungen: [], allgemein: [] })) })], 'anzahl', '[0].geschosse'],
  ['Geschoss doppelt', [haus((h) => { h.geschosse.push({ geschoss: 0, wohnungen: [], allgemein: [] }) })], 'doppelt', '[0].geschosse'],
  ['Geschoss 2,5', [haus((h) => { h.geschosse[0].geschoss = 2.5 })], 'zahl', '[0].geschosse[0].geschoss'],
  ['Geschoss 61', [haus((h) => { h.geschosse[0].geschoss = 61 })], 'zahl', '[0].geschosse[0].geschoss'],
  ['Geschoss mit fremdem Schluessel', [haus((h) => { h.geschosse[0].hoehe = 3 })], 'form', '[0].geschosse[0]'],
  ['allgemein Art treppe', [haus((h) => { h.geschosse[0].allgemein[0].art = 'treppe' })], 'form', '[0].geschosse[0].allgemein[0]'],
  ['allgemein zwei Punkte', [haus((h) => { h.geschosse[0].allgemein[0].punkte.pop() })], 'punkte', '[0].geschosse[0].allgemein[0].punkte'],
  ['Wohnung ohne eingang', [haus((h) => { delete h.geschosse[0].wohnungen[0].eingang })], 'form', `${w0}.eingang`],
  ['Wohnung eingang [1]', [haus((h) => { h.geschosse[0].wohnungen[0].eingang = [1] })], 'form', `${w0}.eingang`],
  ['Wohnung Top leer', [haus((h) => { h.geschosse[0].wohnungen[0].top = '' })], 'form', w0],
  ['Wohnung mit fremdem Schluessel', [haus((h) => { h.geschosse[0].wohnungen[0].besitzer = 'x' })], 'form', w0],
  ['Wohnung ohne Raeume', [haus((h) => { h.geschosse[0].wohnungen[0].raeume = []; h.geschosse[0].wohnungen[0].oeffnungen = [] })], 'anzahl', `${w0}.raeume`],
  ['Raum Art keller', [haus((h) => { h.geschosse[0].wohnungen[0].raeume[2].art = 'keller' })], 'form', `${w0}.raeume[2]`],
  ['Raum zwei Punkte', [haus((h) => { h.geschosse[0].wohnungen[0].raeume[3].punkte.splice(2) })], 'punkte', `${w0}.raeume[3].punkte`],
  ['Raum Punkt zu weit', [haus((h) => { h.geschosse[0].wohnungen[0].raeume[2].punkte[0] = [0, 200000] })], 'punkte', `${w0}.raeume[2].punkte`],
  ['Raum gegen den Uhrzeigersinn', [haus((h) => { h.geschosse[0].wohnungen[0].raeume[3].punkte.reverse() })], 'umlauf', `${w0}.raeume[3].punkte`],
  ['Oeffnung Raum 9', [haus((h) => { h.geschosse[0].wohnungen[0].oeffnungen[1].raum = 9 })], 'raum', `${w0}.oeffnungen[1].raum`],
  ['Oeffnung Raum 1,5', [haus((h) => { h.geschosse[0].wohnungen[0].oeffnungen[1].raum = 1.5 })], 'zahl', `${w0}.oeffnungen[1].raum`],
  ['Oeffnung Kante 4 bei vier Ecken', [haus((h) => { h.geschosse[0].wohnungen[0].oeffnungen[0].kante = 4 })], 'kante', `${w0}.oeffnungen[0].kante`],
  ['Oeffnung zu lang', [haus((h) => { h.geschosse[0].wohnungen[0].oeffnungen[0].abstand_cm = 250 })], 'oeffnung_zu_lang', `${w0}.oeffnungen[0]`],
  ['Oeffnung Breite 0', [haus((h) => { h.geschosse[0].wohnungen[0].oeffnungen[2].breite_cm = 0 })], 'zahl', `${w0}.oeffnungen[2].breite_cm`],
  ['Oeffnung Art luke', [haus((h) => { h.geschosse[0].wohnungen[0].oeffnungen[2].art = 'luke' })], 'form', `${w0}.oeffnungen[2]`],
  ['Oeffnung mit eingang-Merker', [haus((h) => { h.geschosse[0].wohnungen[0].oeffnungen[0].eingang = true })], 'form', `${w0}.oeffnungen[0]`],
  ['Moebel Drehung 45', [haus((h) => { h.geschosse[0].wohnungen[0].moebel[0].drehung = 45 })], 'form', `${w0}.moebel[0]`],
  ['Moebel Tiefe 3000', [haus((h) => { h.geschosse[0].wohnungen[0].moebel[1].tiefe_cm = 3000 })], 'zahl', `${w0}.moebel[1].tiefe_cm`],
  ['Moebel ohne Namen', [haus((h) => { h.geschosse[0].wohnungen[0].moebel[2].name = '' })], 'form', `${w0}.moebel[2]`],
  ['401 Oeffnungen', [haus((h) => { h.geschosse[0].wohnungen[0].oeffnungen = Array.from({ length: 401 }, () => kopie(W.oeffnungen[1])) })], 'anzahl', `${w0}.oeffnungen`],
]
for (const [name, innen, kennung, pfad] of KAPUTT) {
  const p = siedlungInnenPruefen(innen, IDS)
  wahr(`${name}: meldet ${kennung} bei '${pfad}' (ist ${JSON.stringify(p.slice(0, 3))})`, p.some((x) => x.kennung === kennung && x.pfad === pfad))
}

{
  // jsonbTextLaenge rechnet wie jsonb::text (', ' und ': ').
  wahr('Textlaenge Liste', jsonbTextLaenge([1, 2]) === '[1, 2]'.length)
  wahr('Textlaenge Objekt', jsonbTextLaenge({ a: 'x', b: null }) === '{"a": "x", "b": null}'.length)
  wahr('Textlaenge Umlaut in Bytes', jsonbTextLaenge('Kueche' + String.fromCharCode(0xfc)) === 10)
}

/* ------------------------------------------------ gleiche Grenzen in 0045 */

{
  const sql = readFileSync(new URL('../supabase/migrations/0045_siedlung_innen.sql', import.meta.url), 'utf8')
  const muss = [
    `jsonb_array_length(i) > ${G.haeuser} then false`,
    `octet_length(i::text) > ${G.bytes} then false`,
    `abs((e ->> 0)::numeric) > ${G.koordinate} or abs((e ->> 1)::numeric) > ${G.koordinate}`,
    `jsonb_array_length(r -> 'punkte') not between ${G.punkteMin} and ${G.punkteMax} then true`,
    `siedlung_innen_punkte_gueltig(a -> 'punkte', ${G.punkteMin}, ${G.punkteMax})`,
    `jsonb_array_length(w -> 'raeume') not between 1 and ${G.raeume} then false`,
    `jsonb_array_length(w -> 'oeffnungen') > ${G.oeffnungen} then false`,
    `jsonb_array_length(w -> 'moebel') > ${G.moebel} then false`,
    `jsonb_array_length(g -> 'wohnungen') > ${G.wohnungen} then false`,
    `jsonb_array_length(g -> 'allgemein') > ${G.allgemein} then false`,
    `jsonb_array_length(h -> 'geschosse') > ${G.geschosse} then false`,
    `siedlung_zahl_gueltig(g -> 'geschoss', ${G.geschossMin}, ${G.geschossMax}, true)`,
    `siedlung_zahl_gueltig(h -> 'x', -${G.lage}, ${G.lage}, false)`,
    `siedlung_zahl_gueltig(h -> 'z', -${G.lage}, ${G.lage}, false)`,
    `(o ->> 'raum')::numeric not between 0 and ${G.raeume - 1}`,
    `(o ->> 'kante')::numeric not between 0 and ${G.punkteMax - 1}`,
    `(o ->> 'abstand_cm')::numeric not between 0 and ${G.koordinate} then true`,
    `(o ->> 'breite_cm')::numeric not between 1 and ${G.breiteMax} then true`,
    `(o ->> 'hoehe_cm')::numeric not between 1 and ${G.hoeheMax} then true`,
    `(o ->> 'bruestung_cm')::numeric not between 0 and ${G.hoeheMax} then true`,
    `abs((m ->> 'x')::numeric) > ${G.koordinate} or abs((m ->> 'y')::numeric) > ${G.koordinate} then true`,
    `(m ->> 'breite_cm')::numeric not between 1 and ${G.breiteMax} then true`,
    `(m ->> 'tiefe_cm')::numeric not between 1 and ${G.breiteMax} then true`,
    `length(h ->> 'gebaeudeId') between 1 and ${G.textId}`,
    `length(r ->> 'name') > ${G.textName} then true`,
    `length(m ->> 'name') not between 1 and ${G.textName} then true`,
    `length(w ->> 'top') not between 1 and ${G.textTop} then false`,
    `length(w ->> 'typ') > ${G.textTyp} then false`,
  ]
  for (const m of muss) wahr(`0045 enthaelt: ${m}`, sql.includes(m))
  wahr('0045 ohne langen Gedankenstrich', !sql.includes(String.fromCharCode(0x2014)))
}

if (fehler) {
  console.log(`${fehler} Abweichung(en)`)
  process.exit(1)
}
console.log(`ok (${LAGEN.length} Lagen, ${KAPUTT.length} kaputte Faelle)`)
