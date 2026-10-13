// Prueft die reine Logik des Zeichners ohne Browser: Dokument-Operationen
// (src/zeichner/dok.ts), den Unterschied fuer grundriss_speichern (diff.ts),
// den Verlauf (zustand.ts), das Einrasten (fangen.ts), die Werkzeuge
// (werkzeuge/*.ts) und die Wandfarben (lib/farben.ts).
// Aufruf im Projektordner: node scripts/zeichner-pruefen.mjs
// Ausgabe "ok" oder die abweichenden Faelle, Exit 1 bei Fehlern.
// Node entfernt die Typen der .ts-Dateien selbst.
import * as dok from '../src/zeichner/dok.ts'
import { unterschied, istLeer, geloeschteMitKisten } from '../src/zeichner/diff.ts'
import { zReducer, zStart } from '../src/zeichner/zustand.ts'
import { fangen, weiterFangen } from '../src/zeichner/fangen.ts'
import { messpunkte, messFangen, schnellMasse, istLichte } from '../src/zeichner/messpunkte.ts'
import { WERKZEUGE } from '../src/zeichner/werkzeuge/index.ts'
import { textLage } from '../src/zeichner/werkzeuge/typen.ts'
import { raumStart } from '../src/zeichner/werkzeuge/raum.ts'
import { zielAn } from '../src/zeichner/werkzeuge/auswahl.ts'
import { KATALOG, REGAL_STANDARD, SCHRANK_STANDARD, gehoertZu } from '../src/zeichner/katalog.ts'
import { BODEN_STANDARD, WANDFARBEN, kontrast } from '../src/lib/farben.ts'
import { faecherGueltig, flaeche2, zuUmriss, polygonFehler, wandStuecke } from '../src/lib/geometrie.ts'
import { trefferAn, innenPunkt, objektUmriss, stapelVon, flaecheQm } from '../src/components/plan/hilfe.ts'
import * as ans from '../src/components/plan/ansicht.ts'

let fehler = 0
function gleich(name, ist, soll) {
  const a = JSON.stringify(ist)
  const b = JSON.stringify(soll)
  if (a !== b) {
    console.log('ABWEICHUNG', name, 'ist', a, 'soll', b)
    fehler++
  }
}
function wahr(name, ist) {
  if (!ist) {
    console.log('ABWEICHUNG', name, 'ist nicht wahr')
    fehler++
  }
}

let zaehler = 0
const neueId = () => `id-${++zaehler}`

function leer() {
  return {
    grundriss: { id: 'g1', project_id: 'p1', name: 'Neue Wohnung', sort: 0, version: 0, created_at: '', updated_at: '' },
    raeume: [],
    oeffnungen: [],
    objekte: [],
    kisten: [],
  }
}

function kiste(id, code, raumId, x, y, extra = {}) {
  return {
    id, code, prefix: code.slice(0, 1), size: 3, seq: 1, kind: 'box', status: 'open', title: null,
    room_id: null, room_color: null, mark_color: null, eigene_groesse_name: null,
    platz_raum_id: raumId, platz_x: x, platz_y: y, platz_drehung: 0,
    unterlage_art: 'boden', unterlage_item_id: null, unterlage_objekt_id: null, fach_ebene: null, fach_spalte: null,
    laenge_cm: 40, breite_cm: 30, hoehe_cm: 30, unten_cm: 0, oben_cm: 30, grenze_cm: 250, wurzel_art: 'boden', nr: 1,
    ...extra,
  }
}

function kontext(d, extra = {}) {
  return { dok: d, raster: 5, winkel: true, massstab: 1, auswahl: null, neueId, vorlage: null, kiste: null, ...extra }
}

/** Werkzeug-Aktionen der Reihe nach ausfuehren wie der Zeichner. */
function spielen(name, schritte, startDok, extra = {}, start) {
  const w = WERKZEUGE[name]
  let s = start ?? w.start()
  let d = startDok
  let auswahl = null
  const hinweise = []
  for (const x of schritte) {
    const k = kontext(d, { auswahl, ...extra })
    let r
    if (x.runter) r = w.runter(k, { p: x.runter, frei: !!x.frei }, s)
    else if (x.bewegen) r = w.bewegen(k, { p: x.bewegen, frei: !!x.frei }, s)
    else if (x.hoch) r = w.hoch(k, { p: x.hoch, frei: !!x.frei }, s)
    else if (x.doppel) r = w.doppel(k, { p: x.doppel, frei: false }, s)
    else if (x.tippen) {
      for (const ch of x.tippen) {
        const code = ch === '\t' ? 'Tab' : ch === '\n' ? 'Enter' : /\d/.test(ch) ? `Digit${ch}` : 'Other'
        const rr = w.taste(kontext(d, { auswahl, ...extra }), code, ch, false, s)
        if (rr) {
          s = rr.s
          for (const a of rr.aktionen ?? []) {
            if (a.typ === 'aendern') {
              d = dok.dokRichten(a.dok)
              if (a.auswahl !== undefined) auswahl = a.auswahl
            } else if (a.typ === 'waehlen') auswahl = a.auswahl
            else if (a.typ === 'hinweis') hinweise.push(a.schluessel)
          }
        }
      }
      continue
    } else if (x.taste) r = w.taste(kontext(d, { auswahl, ...extra }), x.taste, x.key ?? '', !!x.frei, s)
    if (!r) continue
    s = r.s
    for (const a of r.aktionen ?? []) {
      if (a.typ === 'aendern') {
        d = dok.dokRichten(a.dok)
        if (a.auswahl !== undefined) auswahl = a.auswahl
      } else if (a.typ === 'waehlen') auswahl = a.auswahl
      else if (a.typ === 'hinweis') hinweise.push(a.schluessel)
    }
  }
  return { d, s, auswahl, hinweise, vorschau: w.vorschau(kontext(d, { auswahl, ...extra }), s) }
}

/* ------------------------------------------------------ Raum anlegen */

{
  const r = dok.raumAnlegen(leer(), 'r1', [[0, 0], [0, 300], [400, 300], [400, 0]])
  wahr('raumAnlegen gegen Uhrzeiger ok', r.fehler === null)
  wahr('raumAnlegen danach im Uhrzeigersinn', flaeche2(zuUmriss(r.dok.raeume[0].punkte)) > 0)
  gleich('raumAnlegen Standardhoehe', r.dok.raeume[0].hoehe_cm, 250)
  const k = dok.raumAnlegen(leer(), 'r2', [[0, 0], [400, 300], [400, 0], [0, 300]])
  gleich('raumAnlegen kreuzt', k.fehler, 'kreuzt')
  const g = dok.raumAnlegen(leer(), 'r3', [[0, 0], [200, 0], [400, 0], [400, 300], [0, 300]])
  gleich('raumAnlegen gerade Ecke faellt weg', g.dok.raeume[0].punkte.length, 4)
}

/* --------------------------------------------- Raum-Werkzeug (Tastatur) */

{
  const { d, auswahl } = spielen('raum', [
    { bewegen: [101, 99] },
    { runter: [101, 99] },
    { bewegen: [500, 104] },
    { tippen: '3,45\n' },
    { bewegen: [445, 400] },
    { tippen: '200\n' },
    { bewegen: [50, 300] },
    { tippen: '3.45\n' },
    { tippen: '\n' },
  ], leer())
  gleich('Raum per Tastatur: Punkte', d.raeume[0]?.punkte, [[100, 100], [445, 100], [445, 300], [100, 300]])
  gleich('Raum per Tastatur: gewaehlt', auswahl?.art, 'raum')
}

{
  const { d } = spielen('raum', [
    { runter: [0, 0] },
    { bewegen: [100, 100] },
    { tippen: '4,20\t3,85\n' },
  ], leer(), {}, raumStart('rechteck'))
  gleich('Rechteck 4,20 x 3,85', d.raeume[0]?.punkte, [[0, 0], [420, 0], [420, 385], [0, 385]])
}

{
  // Klick auf den Startpunkt schliesst.
  const { d } = spielen('raum', [
    { runter: [0, 0] }, { bewegen: [300, 0] }, { runter: [300, 0] },
    { bewegen: [300, 200] }, { runter: [300, 200] },
    { bewegen: [2, 1] }, { runter: [2, 1] },
  ], leer())
  gleich('Klick auf Start schliesst Dreieck', d.raeume[0]?.punkte.length, 3)
}

/* --------------------------------------------------------- Fangen */

{
  const d = dok.raumAnlegen(leer(), 'r1', [[100, 100], [500, 100], [500, 400], [100, 400]]).dok
  gleich('fangen: Ecke gewinnt', fangen(d, [503, 97], { raster: 5, toleranz: 8 }).p, [500, 100])
  gleich('fangen: Raster', fangen(d, [253, 251], { raster: 5, toleranz: 8 }).p, [255, 250])
  gleich('fangen: auf Wand', fangen(d, [251, 103], { raster: 5, toleranz: 8, kanten: true }).p, [250, 100])
  gleich('weiterFangen: 90 Grad', weiterFangen(d, [0, 0], [207, 18], { raster: 5, toleranz: 4, winkel: true, frei: false }).p, [205, 0])
  gleich('weiterFangen: frei', weiterFangen(d, [0, 0], [207, 18], { raster: 5, toleranz: 4, winkel: true, frei: true }).p, [205, 20])
}

/* ------------------------------------------- Messpunkte (E90, E93) */
// E93: Alle Messpunkte liegen auf der Innenseite der Wand (Kante plus 6 cm
// in den eigenen Raum), die Wanddicke zaehlt nicht mit.

function tuer(id, raumId, kante, abstand, breite, art = 'tuer') {
  return { id, raum_id: raumId, art, kante, abstand_cm: abstand, breite_cm: breite, hoehe_cm: 200, bruestung_cm: art === 'fenster' ? 90 : 0, anschlag: 'links', aufschlag: 'innen' }
}
function benannt(d, namen) {
  return { ...d, raeume: d.raeume.map((r) => ({ ...r, tag_name: namen[r.id] ?? null })) }
}
const kurz = (m) => `${m.art}:${m.p[0]},${m.p[1]}${m.ende ? ':' + m.ende : ''}${m.gegenueber ? ':g' : ''}`

/** Liegt p echt in einer gezeichneten Wand? Unabhaengig von messpunkte.ts
 *  aus wandStuecke wie PlanBild: 12 cm mittig mit eckigen Enden (6 cm
 *  ueber die Strecke hinaus), Fuellungen dicker Waende buendig. 0,4 cm
 *  Spiel: ein Punkt auf dem Rand der Wand liegt nicht darin. */
function inWand(d, p) {
  const e = 0.4
  return wandStuecke(d.raeume, d.oeffnungen).some((s) => {
    const l = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1])
    if (l === 0) return false
    const ux = (s.b[0] - s.a[0]) / l
    const uy = (s.b[1] - s.a[1]) / l
    const t = (p[0] - s.a[0]) * ux + (p[1] - s.a[1]) * uy
    const quer = Math.abs((p[0] - s.a[0]) * uy - (p[1] - s.a[1]) * ux)
    const ueber = s.dicke ? 0 : 6
    return quer < (s.dicke ?? 12) / 2 - e && t > -ueber + e && t < l + ueber - e
  })
}
/** Wie weit p von der naechsten gezeichneten Wand weg ist (0: darin oder
 *  auf ihrem Rand), aus wandStuecke wie inWand. */
function wandAbstand(d, p) {
  let beste = Infinity
  for (const s of wandStuecke(d.raeume, d.oeffnungen)) {
    const l = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1])
    if (l === 0) continue
    const ux = (s.b[0] - s.a[0]) / l
    const uy = (s.b[1] - s.a[1]) / l
    const t = (p[0] - s.a[0]) * ux + (p[1] - s.a[1]) * uy
    const quer = Math.abs((p[0] - s.a[0]) * uy - (p[1] - s.a[1]) * ux)
    const ueber = s.dicke ? 0 : 6
    const entlang = Math.max(-ueber - t, t - l - ueber, 0)
    beste = Math.min(beste, Math.hypot(entlang, Math.max(quer - (s.dicke ?? 12) / 2, 0)))
  }
  return beste
}
/** Die Zeiger auf einem Gitter (je 1 cm) im Rechteck von bis, die
 *  messFangen auf die Innenseite einer Wand zieht (kein Messpunkt, nicht
 *  das Raster des Zeigers) und dort schlecht ablegt: in einer gezeichneten
 *  Wand oder weiter als weit cm von jeder. */
function schlechtGezogen(d, von, bis, o, weit = Infinity) {
  const out = []
  for (let x = von[0]; x <= bis[0]; x++) {
    for (let y = von[1]; y <= bis[1]; y++) {
      const f = messFangen(d, [x, y], o)
      if (f.messpunkt) continue
      if (f.p[0] === Math.round(x / o.raster) * o.raster && f.p[1] === Math.round(y / o.raster) * o.raster) continue
      if (inWand(d, f.p) || wandAbstand(d, f.p) > weit) out.push(`${x},${y} -> ${f.p.join(',')}`)
    }
  }
  return out
}
/** Abstand von p zur Strecke a-b. */
function streckeAbstand(p, a, b) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const l2 = dx * dx + dy * dy
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2))
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy)
}
/** Eine Innenecke von r: keiner Kante naeher als 6 - 0,5 cm und von
 *  mindestens zwei Kantenlinien (ihren eigenen) genau 6 cm, auf der
 *  Innenseite (r im Uhrzeigersinn, innen rechts der Kante). */
function eckeOk(r, p) {
  const n = r.punkte.length
  let genau = 0
  for (let k = 0; k < n; k++) {
    const a = r.punkte[k]
    const b = r.punkte[(k + 1) % n]
    if (streckeAbstand(p, a, b) < 5.5) return false
    const innen = ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) / Math.hypot(b[0] - a[0], b[1] - a[1])
    if (Math.abs(innen - 6) < 1e-9) genau++
  }
  return genau >= 2
}

// Wohnung A: Flur oben, Bad darunter an derselben Kante (duenne Wand).
// Tuer im Bad oben 50 cm von der Ecke, 80 breit; Fenster unten.
function wohnungA() {
  let d = dok.raumAnlegen(leer(), 'flur', [[0, 0], [400, 0], [400, 100], [0, 100]]).dok
  d = dok.raumAnlegen(d, 'bad', [[100, 100], [300, 100], [300, 300], [100, 300]]).dok
  d = benannt(d, { flur: 'Flur', bad: 'Bad' })
  d.oeffnungen = [tuer('tb', 'bad', 0, 50, 80), tuer('fb', 'bad', 2, 60, 60, 'fenster')]
  return d
}
// Wohnung B: Zimmer und Kueche mit 24 cm dicker Wand dazwischen. Tuer im
// Zimmer unten, ein Fenster 0,3 cm neben der Innenecke (faellt mit ihr
// zusammen).
function wohnungB() {
  let d = dok.raumAnlegen(leer(), 'zi', [[0, 0], [300, 0], [300, 200], [0, 200]]).dok
  d = dok.raumAnlegen(d, 'ku', [[50, 224], [250, 224], [250, 400], [50, 400]]).dok
  d = benannt(d, { zi: 'Zimmer', ku: 'Kueche' })
  d.oeffnungen = [tuer('tz', 'zi', 2, 100, 90), tuer('fz', 'zi', 0, 6.3, 100, 'fenster')]
  return d
}

{
  const d = wohnungA()
  const mp = messpunkte(d)
  gleich('Messpunkte A: Anzahl (2 Tuer, 2 Fenster, 2 Gegenseite, 8 Ecken)', mp.length, 14)
  gleich('Messpunkte A: Tuer und Fenster zuerst, an der Innenseite', mp.slice(0, 6).map(kurz), [
    'tuer:150,106:links', 'tuer:230,106:rechts', 'fenster:240,294:links', 'fenster:180,294:rechts',
    'tuer:150,94:rechts:g', 'tuer:230,94:links:g',
  ])
  gleich('Messpunkte A: Innenecken 6 cm in jedem Raum', mp.filter((m) => m.art === 'ecke').map(kurz), [
    'ecke:6,6', 'ecke:394,6', 'ecke:394,94', 'ecke:6,94', 'ecke:106,106', 'ecke:294,106', 'ecke:294,294', 'ecke:106,294',
  ])
  gleich('Messpunkte A: Raumname an der Tuer', mp[0].raum, 'Bad')
  // Gemeinsame Kante: diese und die andere Wandseite liegen 12 cm auseinander.
  gleich('Messpunkte A: gemeinsame Kante, Innenseiten 12 cm auseinander', mp[0].p[1] - mp[4].p[1], 12)
  wahr('Messpunkte A: kein Punkt in einer gezeichneten Wand', mp.every((m) => !inWand(d, m.p)))
  wahr('Messpunkte A: Innenecken genau 6 cm von ihren Kanten', mp.filter((m) => m.art === 'ecke').every((m) => eckeOk(d.raeume.find((r) => r.id === m.raumId), m.p)))
  wahr('Messpunkte A: gleiche Liste beim zweiten Mal', messpunkte(d) === mp)
  const d2 = { ...d, oeffnungen: d.oeffnungen.slice(0, 1) }
  gleich('Messpunkte A: neue Oeffnungsliste rechnet neu', messpunkte(d2).length, 12)
}

{
  const d = wohnungB()
  const mp = messpunkte(d)
  const k = mp.map(kurz)
  gleich('Messpunkte B: Anzahl (2 Tuer, 2 Fenster, 2 Gegenseite, 8 Ecken weniger 1)', mp.length, 13)
  wahr('Messpunkte B: Tuerenden an der Innenseite', k.includes('tuer:200,194:links') && k.includes('tuer:110,194:rechts'))
  wahr('Messpunkte B: Gegenseite an der Innenseite der Kueche', k.includes('tuer:200,230:rechts:g') && k.includes('tuer:110,230:links:g'))
  wahr('Messpunkte B: Fenster bleibt, Innenecke 0,3 cm daneben faellt weg', k.includes('fenster:6.3,6:links') && !k.includes('ecke:6,6'))
  wahr('Messpunkte B: keine zwei Punkte naeher als 0,5 cm', mp.every((a, i) => mp.every((b, j) => i === j || Math.hypot(a.p[0] - b.p[0], a.p[1] - b.p[1]) >= 0.5)))
  wahr('Messpunkte B: kein Punkt in einer gezeichneten Wand', mp.every((m) => !inWand(d, m.p)))
  // Weiter als 40 cm: keine Gegenseite mehr.
  const weit = { ...d, raeume: d.raeume.map((r) => (r.id === 'ku' ? { ...r, punkte: r.punkte.map(([x, y]) => [x, y + 20]) } : r)) }
  wahr('Messpunkte B: 44 cm Abstand, keine Gegenseite', !messpunkte(weit).some((m) => m.gegenueber))
}

{
  // Einrasten: Messpunkt vor Innenseite der Wand vor Raster, der naechste gewinnt.
  const d = wohnungA()
  const o = { raster: 1, toleranz: 10 }
  const an = (p) => {
    const f = messFangen(d, p, o)
    return [f.p, f.messpunkt ? kurz(f.messpunkt) : null]
  }
  gleich('messFangen: Tuerende', an([153, 103]), [[150, 106], 'tuer:150,106:links'])
  gleich('messFangen: Innenecke', an([104, 104]), [[106, 106], 'ecke:106,106'])
  gleich('messFangen: sonst Innenseite der Wand', an([60, 103]), [[60, 94], null])
  gleich('messFangen: sonst Raster', an([60.4, 50.6]), [[60, 51], null])
  // Innenecke 3 cm, Tuerende 1 cm weit: das Tuerende gewinnt.
  const n = { ...d, oeffnungen: [tuer('tn', 'bad', 0, 8, 80)] }
  gleich('messFangen: naechster gewinnt', messFangen(n, [109, 106], o).messpunkt?.oeffnungId, 'tn')
}

{
  // E93: Einrasten an der Innenseite der Wand, nie an der Kante (Wandmitte).
  const d = wohnungA()
  const f = (p, raster, toleranz) => messFangen(d, p, { raster, toleranz }).p
  gleich('Innenseite: Koordinate exakt, entlang gerastert', f([61.4, 97.3], 5, 10), [60, 94])
  gleich('Innenseite: Raster 1', f([61.4, 97.3], 1, 10), [61, 94])
  gleich('Innenseite: Bad oben', f([200.6, 109], 1, 10), [201, 106])
  gleich('Innenseite: von der Wandmitte auf die Innenseite', f([60, 100], 1, 10), [60, 94])
  // Nahe der Ecke der Kanten (100,100), aber keine Innenecke und keine
  // Innenseite in Reichweite: Raster, nicht die Wandmitte wie bei fangen.
  gleich('Innenseite: keine Wandmitte, Raster', f([101, 101], 1, 5), [101, 101])
  gleich('Innenseite: fangen haette die Wandmitte genommen', fangen(d, [101, 101], { raster: 1, toleranz: 5, kanten: true }).p, [100, 100])
}

{
  // Messen-Werkzeug: beide Enden derselben Tuer sind die Lichte.
  const d = wohnungA()
  const zwei = spielen('messen', [{ runter: [152, 105] }, { runter: [228, 105] }], d)
  gleich('Messen: Punkte an den Tuerenden', [zwei.s.a, zwei.s.b], [[150, 106], [230, 106]])
  // Der Zeiger steht noch ueber der Tuer: ihre Schnellmasse stehen davor,
  // die Messung selbst zuletzt.
  gleich('Messen: Lichte 80', zwei.vorschau.texte?.at(-1), { p: [190, 106], text: '80', lichte: true, weg: [0, -1] })
  gleich('Messen: Schnellmasse der Tuer dabei', zwei.vorschau.texte?.length, 6)
  const ecke = spielen('messen', [{ runter: [152, 105] }, { runter: [104, 104] }], d)
  gleich('Messen: Tuer bis Innenecke 50 - 6, keine Lichte', ecke.vorschau.texte, [{ p: [128, 106], text: '44', lichte: false, weg: [0, -1] }])
  const halb = spielen('messen', [{ runter: [152, 105] }, { bewegen: [229, 105] }], d)
  gleich('Messen: Lichte schon in der Vorschau', halb.vorschau.texte?.[0]?.lichte, true)
  gleich('Messen: Marken an', halb.vorschau.messpunkte?.alle.length, 14)
  gleich('Messen: Punkt unter dem Zeiger', halb.vorschau.messpunkte?.an && kurz(halb.vorschau.messpunkte.an), 'tuer:230,106:rechts')
  gleich('Messen: Anfang der halben Messung fuer den Namen', halb.vorschau.messpunkte?.von, [150, 106])
  gleich('Messen: fertige Messung, Name wieder frei', zwei.vorschau.messpunkte?.von, null)
  // Gemeinsame Kante: von dieser zur anderen Wandseite die ganze Wand.
  const quer = spielen('messen', [{ runter: [150, 104] }, { runter: [150, 96] }], d)
  gleich('Messen: gemeinsame Kante, Wanddicke 12', quer.vorschau.texte?.at(-1), { p: [150, 100], text: '12', lichte: false })
  const b = wohnungB()
  const mpB = (p) => messFangen(b, p, { raster: 1, toleranz: 5 }).messpunkt
  gleich('Messen: Lichte auf der Gegenseite', istLichte(mpB([200, 230]), mpB([110, 230])), true)
  gleich('Messen: Wanddicke ist keine Lichte', istLichte(mpB([200, 194]), mpB([200, 230])), false)
  const dick = spielen('messen', [{ runter: [200, 195] }, { runter: [200, 229] }], b)
  gleich('Messen: Wanddicke 24 plus 12', dick.vorschau.texte?.[0]?.text, '36')
}

{
  // Zwei Oeffnungen stossen aneinander (Nacharbeit E90): Tuer bei 50,
  // Fenster gleich daneben bei 130, beide 80 breit. Der gemeinsame Punkt
  // zaehlt einmal, das linke Ende des Fensters steht in auch.
  let d = dok.raumAnlegen(leer(), 'ra', [[0, 0], [300, 0], [300, 200], [0, 200]]).dok
  d = benannt(d, { ra: 'A' })
  d.oeffnungen = [tuer('t1', 'ra', 0, 50, 80), tuer('t2', 'ra', 0, 130, 80, 'fenster')]
  const mp = messpunkte(d)
  const dort = mp.filter((m) => Math.hypot(m.p[0] - 130, m.p[1] - 6) < 0.5)
  gleich('Aneinander: gemeinsamer Punkt einmal', dort.map(kurz), ['tuer:130,6:rechts'])
  gleich('Aneinander: Fensterende in auch', dort[0]?.auch?.map((e) => `${e.art}:${e.oeffnungId}:${e.ende}`), ['fenster:t2:links'])
  const an = (p) => messFangen(d, p, { raster: 1, toleranz: 5 }).messpunkt
  gleich('Aneinander: Lichte des Fensters', istLichte(an([130, 6]), an([210, 6])), true)
  gleich('Aneinander: Lichte des Fensters, andersherum', istLichte(an([210, 6]), an([130, 6])), true)
  gleich('Aneinander: Lichte der Tuer bleibt', istLichte(an([50, 6]), an([130, 6])), true)
  gleich('Aneinander: ueber beide hinweg keine Lichte', istLichte(an([50, 6]), an([210, 6])), false)
  const zwei = spielen('messen', [{ runter: [131, 5] }, { runter: [209, 5] }], d)
  gleich('Aneinander: Werkzeug zeigt Lichte 80', zwei.vorschau.texte?.at(-1), { p: [170, 6], text: '80', lichte: true, weg: [0, -1] })
}

{
  // Schnellmasse: Breite und Abstaende bis zur Innenecke, beidseits, alles
  // auf der Innenseite der Wand.
  const kurzM = (m) => `${m.art}${m.gegenueber ? ':g' : ''} ${m.laenge} ${m.a.join(',')}-${m.b.join(',')}`
  gleich('Schnellmasse A: Tuer im Bad', schnellMasse(wohnungA(), 'tb', 20).map(kurzM), [
    'breite 80 150,126-230,126',
    'links 44 106,126-150,126',
    'rechts 64 230,126-294,126',
    'rechts:g 144 6,74-150,74',
    'links:g 164 230,74-394,74',
  ])
  gleich('Schnellmasse A: Fenster nur innen', schnellMasse(wohnungA(), 'fb', 20).map(kurzM), [
    'breite 60 240,274-180,274',
    'links 54 294,274-240,274',
    'rechts 74 180,274-106,274',
  ])
  gleich('Schnellmasse B: dicke Wand, Gegenseite in der Kueche', schnellMasse(wohnungB(), 'tz', 20).map(kurzM), [
    'breite 90 200,174-110,174',
    'links 94 294,174-200,174',
    'rechts 104 110,174-6,174',
    'rechts:g 44 244,250-200,250',
    'links:g 54 110,250-56,250',
  ])
  gleich('Schnellmasse: Hilfsstrich an der Innenseite', schnellMasse(wohnungA(), 'tb', 20)[0].wandA, [150, 106])
  gleich('Schnellmasse: unbekannte Oeffnung', schnellMasse(wohnungA(), 'gibtsnicht', 20), [])
  // Werkzeug: Zeiger ueber der Tuer zeigt sie, mitten in einer Messung nicht.
  const ueber = spielen('messen', [{ bewegen: [190, 101] }], wohnungA())
  gleich('Schnellmasse im Werkzeug: Texte', ueber.vorschau.texte?.map((x) => `${x.lichte ? 'Lichte ' : ''}${x.text}`), ['Lichte 80', '44', '64', '144', '164'])
  gleich('Schnellmasse im Werkzeug: Linien mit Hilfsstrichen', ueber.vorschau.linien?.length, 15)
  // Masslinie 36 Bildpunkte vor der Innenseite (Massstab 1: 36 cm), nicht 42.
  gleich('Schnellmasse im Werkzeug: 36 vor der Innenseite', ueber.vorschau.linien?.[0], { a: [150, 142], b: [230, 142], art: 'mass' })
  const mitten = spielen('messen', [{ runter: [20, 20] }, { bewegen: [190, 101] }], wohnungA())
  gleich('Schnellmasse: nicht mitten in der Messung', mitten.vorschau.texte?.length, 1)
  const fertig = spielen('messen', [{ runter: [20, 20] }, { runter: [60, 20] }, { bewegen: [190, 101] }], wohnungA())
  gleich('Schnellmasse: nach fertiger Messung wieder da', fertig.vorschau.texte?.length, 6)
  // Gleich breite Raeume an einer Kante: die Gegenseite haette dieselben
  // Zahlen und fehlt; ihre Messpunkte bleiben.
  let g = dok.raumAnlegen(leer(), 'o1', [[0, 0], [300, 0], [300, 200], [0, 200]]).dok
  g = dok.raumAnlegen(g, 'o2', [[0, 200], [300, 200], [300, 400], [0, 400]]).dok
  g.oeffnungen = [tuer('tg', 'o1', 2, 100, 90)]
  gleich('Schnellmasse: gleiche Gegenseite fehlt', schnellMasse(g, 'tg', 20).map((m) => `${m.art}${m.gegenueber ? ':g' : ''} ${m.laenge}`), ['breite 90', 'links 94', 'rechts 104'])
  gleich('Schnellmasse: Gegenseite als Messpunkte trotzdem da', messpunkte(g).filter((m) => m.gegenueber).map(kurz), ['tuer:200,206:rechts:g', 'tuer:110,206:links:g'])
}

{
  // E93 Rechteck: Innenecken 6 cm von beiden Kanten, Tuerenden auf der
  // Innenseite, Tuerende bis Innenecke abstand - 6, die Lichte bleibt.
  const d = dok.raumAnlegen(leer(), 're', [[0, 0], [400, 0], [400, 300], [0, 300]]).dok
  d.oeffnungen = [tuer('tr', 're', 0, 100, 90)]
  const mp = messpunkte(d)
  gleich('Rechteck: Punkte', mp.map(kurz), ['tuer:100,6:links', 'tuer:190,6:rechts', 'ecke:6,6', 'ecke:394,6', 'ecke:394,294', 'ecke:6,294'])
  wahr('Rechteck: Innenecken genau 6 cm von ihren Kanten', mp.filter((m) => m.art === 'ecke').every((m) => eckeOk(d.raeume[0], m.p)))
  wahr('Rechteck: kein Punkt in einer gezeichneten Wand', mp.every((m) => !inWand(d, m.p)))
  const zug = spielen('messen', [{ runter: [101, 8] }, { runter: [8, 8] }], d)
  gleich('Rechteck: Tuerende bis Innenecke 100 - 6', [zug.s.a, zug.s.b, zug.vorschau.texte?.at(-1)?.text], [[100, 6], [6, 6], '94'])
  const licht = spielen('messen', [{ runter: [101, 8] }, { runter: [189, 8] }], d)
  gleich('Rechteck: Lichte bleibt 90', licht.vorschau.texte?.at(-1), { p: [145, 6], text: '90', lichte: true, weg: [0, -1] })
  gleich('Rechteck: Schnellmasse', schnellMasse(d, 'tr', 20).map((m) => `${m.art} ${m.laenge}`), ['breite 90', 'links 94', 'rechts 204'])
}

{
  // E93 Nachbarraum 1 cm und 28 cm entfernt (dicke Wand): von dieser zur
  // anderen Wandseite misst man die ganze gezeichnete Wand, Abstand plus 12.
  for (const [luecke, dicke] of [[1, 13], [28, 40]]) {
    let d = dok.raumAnlegen(leer(), 'zi', [[0, 0], [300, 0], [300, 200], [0, 200]]).dok
    d = dok.raumAnlegen(d, 'nb', [[0, 200 + luecke], [300, 200 + luecke], [300, 400], [0, 400]]).dok
    d.oeffnungen = [tuer('tz', 'zi', 2, 100, 90)]
    const mp = messpunkte(d)
    const k = mp.map(kurz)
    const y = 206 + luecke
    wahr(`Abstand ${luecke}: Tuerenden auf der Innenseite`, k.includes('tuer:200,194:links') && k.includes('tuer:110,194:rechts'))
    wahr(`Abstand ${luecke}: Gegenseite auf der Innenseite des Nachbarn`, k.includes(`tuer:200,${y}:rechts:g`) && k.includes(`tuer:110,${y}:links:g`))
    wahr(`Abstand ${luecke}: kein Punkt in einer gezeichneten Wand`, mp.every((m) => !inWand(d, m.p)))
    const quer = spielen('messen', [{ runter: [200, 195] }, { runter: [200, y - 1] }], d)
    gleich(`Abstand ${luecke}: Wanddicke ${dicke}`, quer.vorschau.texte?.at(-1)?.text, String(dicke))
    gleich(`Abstand ${luecke}: Lichte auf der anderen Seite`, istLichte(messFangen(d, [200, y], { raster: 1, toleranz: 5 }).messpunkt, messFangen(d, [110, y], { raster: 1, toleranz: 5 }).messpunkt), true)
  }
}

{
  // E93 L-Raum: an der einspringenden Ecke treffen sich die Innenseiten im
  // Raum, 6 cm vor beiden Kanten; dorthin messen auch die Schnellmasse.
  const d = dok.raumAnlegen(leer(), 'el', [[0, 0], [400, 0], [400, 200], [200, 200], [200, 350], [0, 350]]).dok
  d.oeffnungen = [tuer('te', 'el', 2, 150, 30)]
  const mp = messpunkte(d)
  const ecken = mp.filter((m) => m.art === 'ecke')
  gleich('L-Raum: Innenecken', ecken.map(kurz), ['ecke:6,6', 'ecke:394,6', 'ecke:394,194', 'ecke:194,194', 'ecke:194,344', 'ecke:6,344'])
  wahr('L-Raum: Innenecken genau 6 cm von ihren Kanten', ecken.every((m) => eckeOk(d.raeume[0], m.p)))
  wahr('L-Raum: kein Punkt in einer gezeichneten Wand', mp.every((m) => !inWand(d, m.p)))
  gleich('L-Raum: Schnellmasse bis zur einspringenden Ecke', schnellMasse(d, 'te', 20).map((m) => `${m.art} ${m.laenge}`), ['breite 30', 'links 144', 'rechts 26'])
  const zug = spielen('messen', [{ runter: [221, 193] }, { runter: [195, 193] }], d)
  gleich('L-Raum: Tuerende bis einspringende Ecke', [zug.s.a, zug.s.b, zug.vorschau.texte?.at(-1)?.text], [[220, 194], [194, 194], '26'])
}

// E93 T-Flur mit 3 cm Versprung in der oberen Wand und einem 3 cm
// schmalen, 10 cm tiefen Schlitz in der unteren.
function tFlur() {
  return dok.raumAnlegen(leer(), 'tf', [
    [0, 0], [300, 0], [300, 3], [600, 3], [600, 120], [370, 120], [370, 400],
    [250, 400], [250, 120], [103, 120], [103, 130], [100, 130], [100, 120], [0, 120],
  ]).dok
}

{
  // E93 T-Flur: jede Innenecke liegt auf der sichtbaren Wand, keine in
  // einer gezeichneten Wand. Die beiden Ecken am Boden des Schlitzes fallen
  // weg (dort ist nur Wand).
  const d = tFlur()
  const r = d.raeume[0]
  gleich('T-Flur: angelegt', r?.punkte.length, 14)
  const ecken = messpunkte(d).filter((m) => m.art === 'ecke')
  gleich('T-Flur: Innenecken', ecken.map(kurz), [
    'ecke:6,6', 'ecke:294,6', 'ecke:294,9', 'ecke:594,9', 'ecke:594,114', 'ecke:364,114', 'ecke:364,394',
    'ecke:256,394', 'ecke:256,114', 'ecke:97,114', 'ecke:106,114', 'ecke:6,114',
  ])
  wahr('T-Flur: jede Innenecke 6 cm von ihren Kanten, keiner naeher als 5,5', ecken.every((m) => eckeOk(r, m.p)))
  wahr('T-Flur: keine Innenecke in einer gezeichneten Wand', ecken.every((m) => !inWand(d, m.p)))
  wahr('T-Flur: im Schlitz keine Innenecke', !ecken.some((m) => m.p[0] > 90 && m.p[0] < 110 && m.p[1] > 114))
  // Einrasten am Versprung: die Innenseite rechts davon liegt 3 cm tiefer.
  gleich('T-Flur: Innenseite hinter dem Versprung', messFangen(d, [450, 12], { raster: 1, toleranz: 10 }).p, [450, 9])
  gleich('T-Flur: Innenseite vor dem Versprung', messFangen(d, [150, 12], { raster: 1, toleranz: 10 }).p, [150, 6])
}

{
  // E93 Schraeger Raum (3-4-5 gedreht, 300 x 200): Innenecken 6 cm von
  // beiden Kanten, Tuerenden auf der Innenseite, Einrasten bleibt auf ihr.
  const d = dok.raumAnlegen(leer(), 'sr', [[200, 0], [440, 180], [320, 340], [80, 160]]).dok
  d.oeffnungen = [tuer('ts', 'sr', 0, 50, 80)]
  const r = d.raeume[0]
  const mp = messpunkte(d)
  const nah = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 1e-9
  // t entlang Kante 0 (0,8; 0,6), w in den Raum (-0,6; 0,8).
  const bei = (t, w) => [200 + 0.8 * t - 0.6 * w, 0.6 * t + 0.8 * w]
  const ecken = mp.filter((m) => m.art === 'ecke')
  wahr('Schraeg: Innenecken', ecken.length === 4 && [bei(6, 6), bei(294, 6), bei(294, 194), bei(6, 194)].every((q, i) => nah(ecken[i].p, q)))
  wahr('Schraeg: Innenecken genau 6 cm von ihren Kanten', ecken.every((m) => eckeOk(r, m.p)))
  wahr('Schraeg: Tuerenden auf der Innenseite', nah(mp[0].p, bei(50, 6)) && nah(mp[1].p, bei(130, 6)))
  wahr('Schraeg: kein Punkt in einer gezeichneten Wand', mp.every((m) => !inWand(d, m.p)))
  gleich('Schraeg: Schnellmasse', schnellMasse(d, 'ts', 20).map((m) => `${m.art} ${Math.round(m.laenge * 1e6) / 1e6}`), ['breite 80', 'links 44', 'rechts 164'])
  const zug = spielen('messen', [{ runter: bei(51, 7) }, { runter: bei(7, 7) }], d)
  gleich('Schraeg: Tuerende bis Innenecke 50 - 6', zug.vorschau.texte?.at(-1)?.text, '44')
  const licht = spielen('messen', [{ runter: bei(51, 7) }, { runter: bei(129, 7) }], d)
  gleich('Schraeg: Lichte bleibt 80', [licht.vorschau.texte?.at(-1)?.text, licht.vorschau.texte?.at(-1)?.lichte], ['80', true])
  // Auf der schraegen Innenseite: Abstand zur Innenecke auf ganze cm, der
  // Punkt bleibt genau auf der Innenseite.
  const f = messFangen(d, bei(100.3, 7), { raster: 1, toleranz: 10 })
  wahr('Schraeg: Einrasten auf der Innenseite', f.messpunkt === null && nah(f.p, bei(100, 6)))
}

{
  // E93 Spitzer Winkel: eine Spitze mit 20 Grad hat ihre Innenecke
  // 6 / sin 10 Grad = 34,6 cm vor der Ecke; unter 10 Grad gibt es keine.
  const d = dok.raumAnlegen(leer(), 'sp', [[0, 0], [1000, 0], [940, 342]]).dok
  const ecken = messpunkte(d).filter((m) => m.art === 'ecke')
  const spitze = ecken.find((m) => Math.hypot(m.p[0], m.p[1]) < 100)
  const soll = 6 / Math.sin(Math.atan2(342, 940) / 2)
  wahr('Spitz 20 Grad: Innenecke 34,6 cm vor der Ecke', !!spitze && Math.abs(Math.hypot(spitze.p[0], spitze.p[1]) - soll) < 1e-6)
  wahr('Spitz 20 Grad: alle drei Innenecken genau 6 cm von ihren Kanten', ecken.length === 3 && ecken.every((m) => eckeOk(d.raeume[0], m.p)))
  wahr('Spitz 20 Grad: keine Innenecke in einer gezeichneten Wand', ecken.every((m) => !inWand(d, m.p)))
  const z = dok.raumAnlegen(leer(), 'zp', [[0, 0], [1000, 0], [1000, 80]]).dok
  const zp = messpunkte(z).filter((m) => m.art === 'ecke')
  wahr('Spitz 4,6 Grad: an der Spitze keine Innenecke', zp.length === 2 && !zp.some((m) => m.p[0] < 500))
  wahr('Spitz 4,6 Grad: die anderen beiden bleiben', zp.every((m) => eckeOk(z.raeume[0], m.p)))
}

{
  // E93 Draussen (Balkon hinter 24 cm Aussenwand): dieselbe Regel, der Plan
  // zeichnet die Wand auch dort.
  let d = dok.raumAnlegen(leer(), 'wz', [[0, 0], [400, 0], [400, 300], [0, 300]]).dok
  d = dok.raumAnlegen(d, 'ba', [[50, 324], [350, 324], [350, 450], [50, 450]]).dok
  d = { ...d, raeume: d.raeume.map((r) => (r.id === 'ba' ? { ...r, art: 'draussen' } : r)) }
  d.oeffnungen = [tuer('tba', 'wz', 2, 150, 100)]
  const mp = messpunkte(d)
  const k = mp.map(kurz)
  gleich('Draussen: Innenecken des Balkons', mp.filter((m) => m.raumId === 'ba').map(kurz), ['ecke:56,330', 'ecke:344,330', 'ecke:344,444', 'ecke:56,444'])
  wahr('Draussen: Balkontuer innen und auf dem Balkon', k.includes('tuer:250,294:links') && k.includes('tuer:250,330:rechts:g') && k.includes('tuer:150,330:links:g'))
  wahr('Draussen: kein Punkt in einer gezeichneten Wand', mp.every((m) => !inWand(d, m.p)))
  gleich('Draussen: Schnellmasse auf dem Balkon', schnellMasse(d, 'tba', 20).filter((m) => m.gegenueber).map((m) => `${m.art} ${m.laenge}`), ['rechts 94', 'links 94'])
}

{
  // Nacharbeit E93: Die Tuer im Flur (300 breit) reicht auf der anderen
  // Seite ueber die Innenecke des Bads (200 breit) hinaus. Die Gegenseite
  // endet an dieser Innenecke, nie in der quer stehenden Badwand; offen
  // sind auf der Badseite nur 84 cm (110 bis 194).
  for (const luecke of [0, 3]) {
    let d = dok.raumAnlegen(leer(), 'fl', [[0, 0], [300, 0], [300, 200], [0, 200]]).dok
    d = dok.raumAnlegen(d, 'ba', [[0, 200 + luecke], [200, 200 + luecke], [200, 400], [0, 400]]).dok
    d.oeffnungen = [tuer('tf', 'fl', 2, 100, 90)]
    const mp = messpunkte(d)
    const y = 206 + luecke
    wahr(`Ueberstand ${luecke}: kein Punkt in einer gezeichneten Wand`, mp.every((m) => !inWand(d, m.p)))
    gleich(`Ueberstand ${luecke}: Gegenseite bis zur Innenecke des Bads`, mp.filter((m) => m.gegenueber).map(kurz), [`tuer:194,${y}:rechts:g`, `tuer:110,${y}:links:g`])
    const zug = spielen('messen', [{ runter: [195, y + 1] }, { runter: [111, y + 1] }], d)
    gleich(`Ueberstand ${luecke}: Lichte auf der Badseite`, [zug.vorschau.texte?.at(-1)?.text, zug.vorschau.texte?.at(-1)?.lichte], ['84', true])
    gleich(`Ueberstand ${luecke}: Schnellmasse`, schnellMasse(d, 'tf', 20).map((m) => `${m.art}${m.gegenueber ? ':g' : ''} ${m.laenge} ${m.wandA.join(',')}-${m.wandB.join(',')}`), [
      'breite 90 200,194-110,194', 'links 94 294,194-200,194', 'rechts 104 110,194-6,194', `links:g 104 110,${y}-6,${y}`,
    ])
  }
}

{
  // Nacharbeit E93: Einspringende Ecken ueber 270 Grad. Die Innenseiten
  // treffen sich dort hinter den eckigen Enden der gezeichneten Waende (der
  // Plan zeichnet die Spitze stumpf, gemauert trifft sich die Wand dort).
  // Die Innenecke bleibt, die Schnellmasse enden auf ihr.
  const r2 = (v) => Math.round(v * 100) / 100
  const d = dok.raumAnlegen(leer(), 'lr', [[0, 0], [400, 0], [400, 200], [200, 200], [213, 350], [0, 350]]).dok
  d.oeffnungen = [tuer('tl', 'lr', 2, 100, 80)]
  const mp = messpunkte(d)
  gleich('275 Grad: Innenecken', mp.filter((m) => m.art === 'ecke').map((m) => m.p.map(r2).join(',')), ['6,6', '394,6', '394,194', '193.46,194', '206.46,344', '6,344'])
  const re = schnellMasse(d, 'tl', 20).find((m) => m.art === 'rechts')
  gleich('275 Grad: Schnellmass bis zur Innenecke', re && [r2(re.laenge), re.wandB.map(r2)], [26.54, [193.46, 194]])
  wahr('275 Grad: Schnellmass endet auf einem Messpunkt', !!re && mp.some((m) => Math.hypot(m.p[0] - re.wandB[0], m.p[1] - re.wandB[1]) < 1e-9))
  // Pfeiler mit 45 Grad Spitze, ein Fenster an seiner Seite: die Innenecke
  // liegt 6 / sin 22,45 Grad = 15,7 cm vor der Spitze, das Mass endet dort.
  const k = dok.raumAnlegen(leer(), 'kp', [[0, 0], [400, 0], [400, 300], [250, 300], [200, 179], [150, 300], [0, 300]]).dok
  k.oeffnungen = [tuer('fk', 'kp', 3, 30, 60, 'fenster')]
  const kp = messpunkte(k)
  const spitze = kp.find((m) => m.art === 'ecke' && Math.abs(m.p[0] - 200) < 1 && m.p[1] < 179)
  wahr('45 Grad: Innenecke vor der Spitze', !!spitze && Math.abs(spitze.p[0] - 200) < 1e-9 && Math.abs(179 - spitze.p[1] - 6 / Math.sin(Math.atan2(50, 121))) < 1e-9)
  const kr = schnellMasse(k, 'fk', 20).find((m) => m.art === 'rechts')
  wahr('45 Grad: Schnellmass endet auf der Innenecke', !!kr && !!spitze && Math.hypot(kr.wandB[0] - spitze.p[0], kr.wandB[1] - spitze.p[1]) < 1e-9)
  wahr('45 Grad: kein Punkt in einer gezeichneten Wand', kp.every((m) => !inWand(k, m.p)))
}

{
  // Nacharbeit E93: Einrasten zieht nie in eine gezeichnete Wand. Die
  // Seiten eines Schlitzes (3 cm, T-Flur) und einer Nische (8 cm) liegen
  // ganz in der Wand der anderen Seite: dort gibt es keine Innenseite, wer
  // daneben zeigt, bleibt im Raster.
  const tf = tFlur()
  gleich('Schlitz: links daneben bleibt im Raster', messFangen(tf, [98, 122], { raster: 2, toleranz: 5 }).p, [98, 122])
  gleich('Schlitz: rechts daneben bleibt im Raster', messFangen(tf, [105, 121], { raster: 1, toleranz: 5 }).p, [105, 121])
  const ni = dok.raumAnlegen(leer(), 'ni', [[0, 30], [100, 30], [100, 0], [108, 0], [108, 30], [300, 30], [300, 230], [0, 230]]).dok
  gleich('Nische: angelegt', ni.raeume[0]?.punkte.length, 8)
  gleich('Nische: links daneben bleibt im Raster', messFangen(ni, [93, 20], { raster: 1, toleranz: 10 }).p, [93, 20])
  gleich('Nische: rechts daneben bleibt im Raster', messFangen(ni, [115, 15], { raster: 1, toleranz: 10 }).p, [115, 15])
  for (const o of [{ raster: 1, toleranz: 5 }, { raster: 2, toleranz: 5 }, { raster: 1, toleranz: 10 }, { raster: 5, toleranz: 10 }]) {
    gleich(`Schlitz: nie in die Wand gezogen (Raster ${o.raster}, Fangweite ${o.toleranz})`, schlechtGezogen(tf, [85, 105], [120, 140], o), [])
    gleich(`Nische: nie in die Wand gezogen (Raster ${o.raster}, Fangweite ${o.toleranz})`, schlechtGezogen(ni, [85, -10], [125, 45], o), [])
  }
}

{
  // Nacharbeit E93: Duenner Zipfel (4 cm breit, 150 hoch) im Raum. An
  // seiner Spitze gibt es keine Innenecke (spitzer als 10 Grad), seine
  // Innenseiten enden dort mit der gezeichneten Wand und laufen nicht Meter
  // weiter in den Raum.
  const d = dok.raumAnlegen(leer(), 'zf', [[0, 0], [400, 0], [400, 300], [202, 300], [200, 150], [198, 300], [0, 300]]).dok
  gleich('Zipfel: angelegt', d.raeume[0]?.punkte.length, 7)
  gleich('Zipfel: 90 cm ueber der Spitze bleibt im Raster', messFangen(d, [207, 60], { raster: 1, toleranz: 10 }).p, [207, 60])
  gleich('Zipfel: an der oberen Wand die Innenseite', messFangen(d, [204, 1], { raster: 1, toleranz: 10 }).p, [204, 6])
  gleich('Zipfel: eingerastet immer an einer gezeichneten Wand', schlechtGezogen(d, [150, -20], [250, 310], { raster: 1, toleranz: 10 }, 0.5), [])
}

{
  // Nacharbeit E93: Die Zahl einer Messung entlang der Innenseite steht in
  // der Wand. Im Raum steht 12 Bildpunkte vor der Innenseite schon das Mass
  // der Wand (Leinwand, wandMasse); an der unteren Wand lag die Zahl der
  // lichten Breite genau darauf.
  const d = dok.raumAnlegen(leer(), 're', [[0, 0], [400, 0], [400, 300], [0, 300]]).dok
  const zahl = (a, b) => spielen('messen', [{ runter: a }, { runter: b }], d).vorschau.texte?.at(-1)
  const unten = zahl([8, 292], [392, 292])
  gleich('Messzahl: untere Wand, Zahl zur Wand hin', unten, { p: [200, 294], text: '388', lichte: false, weg: [0, 1] })
  gleich('Messzahl: obere Wand', zahl([8, 8], [392, 8])?.weg, [0, -1])
  gleich('Messzahl: linke Wand', zahl([8, 8], [8, 292])?.weg, [-1, 0])
  gleich('Messzahl: rechte Wand', zahl([392, 8], [392, 292])?.weg, [1, 0])
  gleich('Messzahl: quer durch den Raum wie bisher', zahl([100, 100], [200, 150])?.weg, undefined)
  // Lage wie in der Leinwand (Schrift 12 / s, ohne weg Grundlinie unter der
  // Schrift, mit weg mittig) gegen das Wandmass der unteren Kante (Schrift
  // 11 / s, mittig 6 + 12 / s ueber der Kante y 300), je eine halbe Zeile hoch.
  const hoehe = (l, fs) => (l.mitte ? [l.p[1] - fs / 2, l.p[1] + fs / 2] : [l.p[1] - 0.8 * fs, l.p[1]])
  for (const s of [0.5, 0.75, 1, 1.5, 2]) {
    const [z0, z1] = hoehe(textLage(unten, s, 12 / s), 12 / s)
    const m = 300 - (6 + 12 / s)
    wahr(`Messzahl: untere Wand, nicht auf dem Wandmass (Massstab ${s})`, z1 < m - 5.5 / s || z0 > m + 5.5 / s)
  }
  const links = textLage(zahl([8, 8], [8, 292]), 1, 12)
  gleich('Messzahl: linke Wand gedreht wie das Wandmass, in der Wand', [links.winkel, links.p[0] < 6 - 8, links.p[1]], [90, true, 150])
  gleich('Messzahl: ohne weg wie bisher 8 Bildpunkte darueber', textLage({ p: [10, 20] }, 2, 6), { p: [10, 16], winkel: 0, mitte: false })
}

/* ---------------------------------------------------------- Teilen */

function rechteckDok() {
  let d = dok.raumAnlegen(leer(), 'r1', [[0, 0], [400, 0], [400, 300], [0, 300]]).dok
  d = { ...d, raeume: d.raeume.map((r) => ({ ...r, tag_id: 't1', tag_name: 'Wohnzimmer' })) }
  d.oeffnungen = [
    { id: 'tuer', raum_id: 'r1', art: 'tuer', kante: 0, abstand_cm: 200, breite_cm: 80, hoehe_cm: 200, bruestung_cm: 0, anschlag: 'links', aufschlag: 'innen' },
    { id: 'fenster', raum_id: 'r1', art: 'fenster', kante: 2, abstand_cm: 300, breite_cm: 80, hoehe_cm: 120, bruestung_cm: 90, anschlag: 'links', aufschlag: 'innen' },
  ]
  d.kisten = [kiste('k1', 'W-3-001', 'r1', 60, 150), kiste('k2', 'W-3-002', 'r1', 300, 150)]
  return d
}

{
  const d = rechteckDok()
  const r = dok.raumTeilen(d, [150, 0], [150, 300], 'r2')
  wahr('Teilen klappt', !('fehler' in r))
  const gross = r.dok.raeume.find((x) => x.id === 'r1')
  const klein = r.dok.raeume.find((x) => x.id === 'r2')
  gleich('Teilen: groesserer Teil behaelt Zimmer', [gross.tag_id, klein.tag_id], ['t1', null])
  gleich('Teilen: Flaechen', [flaeche2(zuUmriss(gross.punkte)) / 2, flaeche2(zuUmriss(klein.punkte)) / 2], [75000, 45000])
  const tuer = r.dok.oeffnungen.find((o) => o.id === 'tuer')
  const fenster = r.dok.oeffnungen.find((o) => o.id === 'fenster')
  gleich('Teilen: Tuer bleibt im grossen Raum', tuer.raum_id, 'r1')
  gleich('Teilen: Fenster wandert in den kleinen Raum', fenster.raum_id, 'r2')
  const kl = klein.punkte
  const fk = kl[fenster.kante]
  const fk2 = kl[(fenster.kante + 1) % kl.length]
  wahr('Teilen: Fenster liegt auf der unteren Wand', fk[1] === 300 && fk2[1] === 300)
  gleich('Teilen: Kiste links zieht um', r.dok.kisten.map((k) => k.platz_raum_id), ['r2', 'r1'])
  const a = unterschied(d, r.dok)
  gleich('Teilen: zuordnen', a.zuordnen, [{ von_raum_id: 'r1', nach_raum_id: 'r2' }])
  gleich('Teilen: zwei Raeume gesendet', a.raeume?.map((x) => x.id).sort(), ['r1', 'r2'])
  wahr('Teilen: kein Loeschen', !a.raeume_loeschen && !a.oeffnungen_loeschen)
  const quer = dok.raumTeilen(d, [500, 10], [600, 10], 'r3')
  gleich('Teilen ausserhalb', quer.fehler, 'zeichner.teilen_kein_raum')
  // L-Raum quer teilen
  const l = dok.raumAnlegen(leer(), 'L', [[0, 0], [400, 0], [400, 200], [200, 200], [200, 400], [0, 400]]).dok
  const lr = dok.raumTeilen(l, [0, 200], [200, 200], 'L2')
  wahr('L-Raum teilen', !('fehler' in lr) && lr.dok.raeume.every((x) => polygonFehler(zuUmriss(x.punkte)) === null))
}

/* ------------------------------------------------------ Diff */

{
  const d = rechteckDok()
  d.objekte = [
    { id: 'o1', raum_id: 'r1', art: 'moebel', name: 'Kommode', x: 10, y: 10, breite_cm: 100, tiefe_cm: 45, hoehe_cm: 80, drehung: 0, form: 'rechteck', ausschnitt_breite_cm: null, ausschnitt_tiefe_cm: null, ausschnitt_ecke: null, brett_cm: null, spalten: 1, farbe: null, item_id: null, item_code: null, item_title: null },
  ]
  gleich('Diff: gleich ist leer', istLeer(unterschied(d, d)), true)
  const v = dok.raumVerschieben(d, 'r1', 100, 0)
  const a = unterschied(d, v)
  gleich('Diff: Verschieben', a.verschieben, [{ raum_id: 'r1', dx: 100, dy: 0 }])
  wahr('Diff: Verschieben ohne raeume und objekte', !a.raeume && !a.objekte)
  gleich('Verschieben nimmt Moebel und Kisten mit', [v.objekte[0].x, v.kisten[0].platz_x], [110, 160])
  const v2 = dok.raumAendern(v, 'r1', { hoehe_cm: 260 })
  const a2 = unterschied(d, v2)
  gleich('Diff: Verschieben plus Hoehe sendet alten Umriss', a2.raeume?.[0].punkte, d.raeume[0].punkte)
  const ohne = dok.loeschen(d, { art: 'raum', id: 'r1' })
  const a3 = unterschied(d, ohne)
  gleich('Diff: Raum loeschen', a3.raeume_loeschen, ['r1'])
  wahr('Diff: Kaskade, keine Einzel-Loeschungen', !a3.objekte_loeschen && !a3.oeffnungen_loeschen)
  gleich('Loeschen mit Kisten wird erkannt', geloeschteMitKisten(d, a3).map((x) => x.codes.length), [2])
  const ohneObjekt = dok.loeschen(d, { art: 'objekt', id: 'o1' })
  gleich('Diff: Objekt loeschen', unterschied(d, ohneObjekt).objekte_loeschen, ['o1'])
}

/* ------------------------------------------- Ecken und Kanten */

{
  let d = dok.raumAnlegen(leer(), 'r1', [[0, 0], [400, 0], [400, 300], [0, 300]]).dok
  d.oeffnungen = [{ id: 't', raum_id: 'r1', art: 'tuer', kante: 1, abstand_cm: 50, breite_cm: 80, hoehe_cm: 200, bruestung_cm: 0, anschlag: 'links', aufschlag: 'innen' }]
  const e = dok.eckeEinfuegen(d, 'r1', 0, [200, 2])
  gleich('Ecke einfuegen: 5 Punkte', e.raeume[0].punkte.length, 5)
  gleich('Ecke einfuegen: Tuer rutscht auf Kante 2', [e.oeffnungen[0].kante, e.oeffnungen[0].abstand_cm], [2, 50])
  const w = dok.eckeEntfernen(e, 'r1', 1)
  gleich('Ecke entfernen: zurueck', [w.raeume[0].punkte, w.oeffnungen[0].kante], [[[0, 0], [400, 0], [400, 300], [0, 300]], 1])
  gleich('Ecke entfernen: Dreieck bleibt', dok.eckeEntfernen(dok.raumAnlegen(leer(), 'x', [[0, 0], [100, 0], [0, 100]]).dok, 'x', 0), null)
  const l = dok.kanteLaengeSetzen(d, 'r1', 0, 450)
  gleich('Wandlaenge setzen: Rechteck bleibt Rechteck', l.raeume[0].punkte, [[0, 0], [450, 0], [450, 300], [0, 300]])
  const k = dok.kanteVerschieben(d, 'r1', 1, 20)
  gleich('Kante nach innen', k.raeume[0].punkte, [[0, 0], [380, 0], [380, 300], [0, 300]])
  d = { ...d, raeume: d.raeume.map((r) => ({ ...r, wandfarben: ['#3f3931', null, null, null] })) }
  const f = dok.eckeEinfuegen(d, 'r1', 0, [100, 0])
  gleich('Wandfarbe beim Einfuegen auf beiden Haelften', f.raeume[0].wandfarben, ['#3f3931', '#3f3931', null, null, null])
}

/* ----------------------------------------------------- Objekte */

{
  const o = { x: 100, y: 50, breite_cm: 80, tiefe_cm: 30, hoehe_cm: 100, drehung: 0, form: 'rechteck', ausschnitt_breite_cm: null, ausschnitt_tiefe_cm: null, ausschnitt_ecke: null, brett_cm: null, spalten: 1 }
  const g = dok.objektGedreht(o, 1)
  const b0 = dok.objektBox(o)
  const b1 = dok.objektBox(g)
  gleich('Drehen: 90 Grad', g.drehung, 90)
  gleich('Drehen auf der Stelle', [(b1.x0 + b1.x1) / 2, (b1.y0 + b1.y1) / 2], [(b0.x0 + b0.x1) / 2, (b0.y0 + b0.y1) / 2])
  gleich('Drehen: Masse getauscht', [b1.x1 - b1.x0, b1.y1 - b1.y0], [30, 80])
  const lsofa = KATALOG.find((v) => v.schluessel === 'l_sofa')
  gleich('L-Sofa Umriss hat 6 Ecken', objektUmriss({ ...lsofa, x: 0, y: 0, drehung: 0 }).length, 6)
  wahr('Regal-Vorlage gueltig', faecherGueltig(REGAL_STANDARD.brett_cm, REGAL_STANDARD.hoehe_cm))
  wahr('Schrank-Vorlage gueltig', faecherGueltig(SCHRANK_STANDARD.brett_cm, SCHRANK_STANDARD.hoehe_cm))
}

{
  // Katalog zaehlt die Moebel im Plan (Nacharbeit E91): die BESTA-Eckbaenke
  // sind seit E91 eine eigene Art, gehoeren aber weiter zur Sitzbank.
  const sitzbank = KATALOG.find((v) => v.schluessel === 'sitzbank')
  const bank = (name) => ({ art: 'moebel', name, breite_cm: 180, tiefe_cm: 42, hoehe_cm: 85, form: 'rechteck' })
  const nord = bank('Eckbank Nord: BESTÅ 180x42x38 mit Türen, Polster extra')
  const ost = bank('Eckbank Ost: BESTÅ 120x42x38 mit Türen, Polster extra')
  wahr('Katalog: Eckbaenke zaehlen bei der Sitzbank', gehoertZu(nord, sitzbank, 'Sitzbank mit Stauraum') && gehoertZu(ost, sitzbank, 'Sitzbank mit Stauraum'))
  wahr('Katalog: auch auf Arabisch', gehoertZu(nord, sitzbank, 'مقعد طويل مع تخزين'))
  wahr('Katalog: Sitzbank zaehlt weiter', gehoertZu(bank('Sitzbank Flur'), sitzbank, 'Sitzbank mit Stauraum'))
  const sofa = KATALOG.find((v) => v.schluessel === 'sofa')
  wahr('Katalog: Eckbank ist kein Sofa', !gehoertZu(nord, sofa, 'Sofa'))
}

{
  // Moebel-Werkzeug: rastet an der Wand ein, passt, wird gesetzt.
  const d = dok.raumAnlegen(leer(), 'r1', [[0, 0], [400, 0], [400, 300], [0, 300]]).dok
  const vorlage = { ...KATALOG.find((v) => v.schluessel === 'kommode'), name: 'Kommode' }
  const { d: n, auswahl } = spielen('moebel', [{ bewegen: [58, 30] }, { runter: [58, 30] }], d, { vorlage })
  const o = n.objekte[0]
  gleich('Moebel an der Wand eingerastet', [o?.x, o?.y], [0, 0])
  gleich('Moebel gewaehlt', auswahl?.art, 'objekt')
  const draussen = spielen('moebel', [{ runter: [600, 600] }], d, { vorlage })
  gleich('Moebel ausserhalb: Hinweis', draussen.hinweise, ['zeichner.objekt_in_raum'])
  const q = spielen('moebel', [{ taste: 'KeyE' }, { bewegen: [200, 150] }], d, { vorlage })
  gleich('Moebel Q/E dreht den Geist', q.vorschau.objekt?.o.drehung, 90)
}

/* ------------------------------------------ Tuer und Fenster */

{
  const d = dok.raumAnlegen(leer(), 'r1', [[0, 0], [400, 0], [400, 300], [0, 300]]).dok
  const t1 = spielen('tuer', [{ bewegen: [203, 4] }, { runter: [203, 4] }], d)
  const tuer = t1.d.oeffnungen[0]
  gleich('Tuer auf Wand 0 mittig', [tuer?.kante, tuer?.abstand_cm, tuer?.breite_cm], [0, 165, 80])
  const t2 = spielen('tuer', [{ bewegen: [203, 4] }, { runter: [203, 4] }], t1.d)
  gleich('Zweite Tuer am selben Ort: abgelehnt', [t2.d.oeffnungen.length, t2.hinweise], [1, ['zeichner.tuer_passt_nicht']])
  const t3 = spielen('fenster', [{ bewegen: [395, 250] }, { tippen: '20\n' }], d)
  const f = t3.d.oeffnungen[0]
  gleich('Fenster: getippter Abstand zur naeheren Ecke', [f?.kante, f?.abstand_cm, f?.bruestung_cm], [1, 180, 90])
}

/* ------------------------------------------------- Auswahl */

{
  // Ausgeblendete Deko (Nacharbeit E91): auch was auf ihr steht, laesst
  // sich nicht greifen, etwa die Efeutute auf dem Wandregal.
  const d = rechteckDok()
  const m = (id, name, x, extra) => ({ id, raum_id: 'r1', art: 'moebel', name, x, y: 60, breite_cm: 60, tiefe_cm: 18, hoehe_cm: 18, drehung: 0, form: 'rechteck', ausschnitt_breite_cm: null, ausschnitt_tiefe_cm: null, ausschnitt_ecke: null, brett_cm: null, spalten: 1, farbe: null, item_id: null, item_code: null, item_title: null, ...extra })
  d.objekte = [m('regal', 'Wandregal Bambus', 100, { boden_cm: 120 }), m('efeu', 'Efeutute (Hängepflanze)', 110, { breite_cm: 25, tiefe_cm: 25, hoehe_cm: 40, boden_cm: 138 })]
  gleich('Deko an: Efeutute greifbar', zielAn(kontext(d), [120, 70]), { art: 'objekt', id: 'efeu' })
  wahr('Deko aus: Efeutute auf dem Regal nicht greifbar', zielAn(kontext(d, { ohneDeko: true }), [120, 70])?.art !== 'objekt')
}

{
  const d = rechteckDok()
  const r = spielen('auswahl', [{ runter: [200, 150] }, { bewegen: [257, 153] }, { hoch: [257, 153] }], d)
  // Raeume gehen frei in beide Richtungen (Raster 5), mit Umschalt nur in einer Achse.
  gleich('Auswahl: Raum gezogen (frei, Raster 5)', r.d.raeume[0].punkte[0], [55, 5])
  const ra = spielen('auswahl', [{ runter: [200, 150] }, { bewegen: [257, 153], frei: true }, { hoch: [257, 153], frei: true }], d)
  gleich('Auswahl: Raum gezogen mit Umschalt (eine Achse)', ra.d.raeume[0].punkte[0], [55, 0])
  // Magnet: ein zweiter Raum rastet buendig an die Wand des ersten.
  const zwei = dok.raumAnlegen(d, 'r2', [[420, 0], [700, 0], [700, 300], [420, 300]]).dok
  const m = spielen('auswahl', [{ runter: [560, 150] }, { bewegen: [545, 150] }, { hoch: [545, 150] }], zwei)
  gleich('Auswahl: Magnet an der Nachbarwand', m.d.raeume.find((x) => x.id === 'r2').punkte.map((q) => q[0]).sort((a, b) => a - b)[0], 400)
  const e = spielen('auswahl', [{ runter: [398, 2] }, { bewegen: [452, 1] }, { hoch: [452, 1] }], d)
  gleich('Auswahl: Ecke gezogen', e.d.raeume[0].punkte[1], [450, 0])
  const dop = spielen('auswahl', [{ doppel: [100, 300] }], d)
  gleich('Doppelklick auf Kante fuegt Ecke ein', dop.d.raeume[0].punkte.length, 5)
  const pf = spielen('auswahl', [{ runter: [200, 150] }, { hoch: [200, 150] }, { taste: 'ArrowRight', frei: true }], d)
  gleich('Pfeil mit Umschalt: 10 cm', pf.d.raeume[0].punkte[0], [10, 0])
}

/* -------------------------------------------------- Verlauf */

{
  const d0 = dok.raumAnlegen(leer(), 'r1', [[0, 0], [400, 0], [400, 300], [0, 300]]).dok
  let z = zStart(d0)
  const schritte = []
  let d = d0
  for (let i = 1; i <= 20; i++) {
    d = dok.raumVerschieben(d, 'r1', 5, 0)
    schritte.push(d)
    z = zReducer(z, { typ: 'aendern', dok: d })
  }
  gleich('Verlauf: 20 Schritte', z.zurueck.length, 20)
  for (let i = 0; i < 20; i++) z = zReducer(z, { typ: 'zurueck' })
  gleich('Verlauf: 20x zurueck = Anfang', z.dok.raeume[0].punkte, d0.raeume[0].punkte)
  z = zReducer(z, { typ: 'vor' })
  gleich('Verlauf: vor', z.dok.raeume[0].punkte[0], [5, 0])
  const gesendet = z.dok
  const antwort = { ...gesendet, grundriss: { ...gesendet.grundriss, version: 1 } }
  z = zReducer(z, { typ: 'gespeichert', gesendet, antwort, version: 1 })
  gleich('Gespeichert: Antwort gilt', [z.dok === antwort, z.version], [true, 1])
  const vorher = z.dok
  z = zReducer(z, { typ: 'aendern', dok: dok.raumVerschieben(z.dok, 'r1', 5, 0) })
  z = zReducer(z, { typ: 'abgelehnt' })
  gleich('Abgelehnt: zurueck auf bestaetigten Stand', z.dok === z.basis && z.dok === vorher, true)
  wahr('Abgelehnt: kein leerer Rueckgaengig-Schritt', istLeer(unterschied(z.basis, z.zurueck[z.zurueck.length - 1] ?? leer())) === false || z.zurueck.length === 0)
}

/* ------------------------------ Verlauf mit Kisten (Fehler 1 und 2) */

function regal(id, raumId, x, y) {
  return { id, raum_id: raumId, art: 'regal', name: 'Billy', x, y, breite_cm: 80, tiefe_cm: 30, hoehe_cm: 180, drehung: 0, form: 'rechteck', ausschnitt_breite_cm: null, ausschnitt_tiefe_cm: null, ausschnitt_ecke: null, brett_cm: [0, 40, 80, 120], spalten: 1, farbe: null, item_id: null, item_code: null, item_title: null }
}
const bestaetigt = (z, version) => zReducer(z, { typ: 'gespeichert', gesendet: z.dok, antwort: z.dok, version })
const vorab = (z) => dok.kistenDraussen(z.dok, dok.umrissGeaendert(z.basis, z.dok))

{
  // 1. Raum mit Kisten und Regal verschieben, dann rueckgaengig und wiederholen.
  const d0 = rechteckDok()
  d0.objekte = [regal('o1', 'r1', 300, 10)]
  d0.kisten.push(kiste('k3', 'W-3-003', 'r1', 340, 25, { unterlage_art: 'fach', unterlage_objekt_id: 'o1', fach_ebene: 2, fach_spalte: 1 }))
  let z = zStart(d0)
  z = zReducer(z, { typ: 'aendern', dok: dok.raumVerschieben(d0, 'r1', 100, 0) })
  z = bestaetigt(z, 1)
  z = zReducer(z, { typ: 'zurueck' })
  gleich('Verschieben rueckgaengig: Kisten fahren mit zurueck', z.dok.kisten.map((k) => k.platz_x), [60, 300, 340])
  gleich('Verschieben rueckgaengig: Regal zurueck', z.dok.objekte[0].x, 300)
  const a = unterschied(z.basis, z.dok)
  gleich('Verschieben rueckgaengig: geht als verschieben', a.verschieben, [{ raum_id: 'r1', dx: -100, dy: 0 }])
  wahr('Verschieben rueckgaengig: ohne raeume und objekte', !a.raeume && !a.objekte)
  gleich('Verschieben rueckgaengig: Vorab-Pruefung laesst durch', vorab(z), [])
  gleich('Verschieben rueckgaengig: auch ohne Raumfilter nichts draussen', dok.kistenDraussen(z.dok), [])
  z = bestaetigt(z, 2)
  z = zReducer(z, { typ: 'vor' })
  gleich('Verschieben wiederholen: Kisten fahren mit', z.dok.kisten.map((k) => k.platz_x), [160, 400, 440])
  gleich('Verschieben wiederholen: geht als verschieben', unterschied(z.basis, z.dok).verschieben, [{ raum_id: 'r1', dx: 100, dy: 0 }])
  gleich('Verschieben wiederholen: Vorab-Pruefung laesst durch', vorab(z), [])
}

{
  // 2. Teilen mit Stapel und Kiste im Fach, dann rueckgaengig und wiederholen.
  const d0 = rechteckDok()
  d0.objekte = [regal('o1', 'r1', 10, 10)]
  d0.kisten.push(kiste('k3', 'W-3-003', 'r1', 50, 25, { unterlage_art: 'fach', unterlage_objekt_id: 'o1', fach_ebene: 2, fach_spalte: 1 }))
  d0.kisten.push(kiste('k4', 'W-3-004', 'r1', 62, 150, { unterlage_art: 'kiste', unterlage_item_id: 'k1', unten_cm: 30, oben_cm: 60, nr: 2 }))
  let z = zStart(d0)
  const t = dok.raumTeilen(d0, [150, 0], [150, 300], 'r2')
  z = zReducer(z, { typ: 'aendern', dok: t.dok })
  gleich('Teilen: Linkes zieht in den neuen Raum', z.dok.kisten.map((k) => k.platz_raum_id), ['r2', 'r1', 'r2', 'r2'])
  z = bestaetigt(z, 1)
  z = zReducer(z, { typ: 'zurueck' })
  gleich('Teilen rueckgaengig: Kisten wieder im alten Raum', z.dok.kisten.map((k) => k.platz_raum_id), ['r1', 'r1', 'r1', 'r1'])
  const a = unterschied(z.basis, z.dok)
  gleich('Teilen rueckgaengig: umhaengen', a.umhaengen, [{ von_raum_id: 'r2', nach_raum_id: 'r1' }])
  gleich('Teilen rueckgaengig: abgeteilten Raum loeschen', a.raeume_loeschen, ['r2'])
  gleich('Teilen rueckgaengig: alter Raum mit altem Umriss', a.raeume?.map((r) => [r.id, r.punkte]), [['r1', d0.raeume[0].punkte]])
  wahr('Teilen rueckgaengig: Regal nicht einzeln', !a.objekte)
  gleich('Teilen rueckgaengig: Tuer und Fenster zurueck an den alten Raum', a.oeffnungen?.map((o) => [o.id, o.raum_id]).sort(), [['fenster', 'r1'], ['tuer', 'r1']])
  gleich('Teilen rueckgaengig: keine Frage nach Kisten', geloeschteMitKisten(z.basis, a), [])
  gleich('Teilen rueckgaengig: Vorab-Pruefung laesst durch', vorab(z), [])
  z = bestaetigt(z, 2)
  z = zReducer(z, { typ: 'vor' })
  gleich('Teilen wiederholen: wieder im neuen Raum', z.dok.kisten.map((k) => k.platz_raum_id), ['r2', 'r1', 'r2', 'r2'])
  const b = unterschied(z.basis, z.dok)
  gleich('Teilen wiederholen: zuordnen', b.zuordnen, [{ von_raum_id: 'r1', nach_raum_id: 'r2' }])
  wahr('Teilen wiederholen: kein umhaengen', !b.umhaengen)
  gleich('Teilen wiederholen: Vorab-Pruefung laesst durch', vorab(z), [])
  // Ein Raum mit Kisten, der wirklich geloescht wird: kein umhaengen, die Frage bleibt.
  const ohne = dok.loeschen(z.dok, { art: 'raum', id: 'r2' })
  const c = unterschied(z.dok, ohne)
  wahr('Raum loeschen: kein umhaengen', !c.umhaengen)
  gleich('Raum loeschen: Frage nach drei Kisten', geloeschteMitKisten(z.dok, c).map((x) => x.codes.length), [3])
}

/* ------------------------------------------------ Anzeige-Hilfen */

{
  const l = [[0, 0], [400, 0], [400, 100], [100, 100], [100, 400], [0, 400]]
  const [x, y] = innenPunkt(l)
  wahr('Beschriftung im L-Raum liegt innen', x > 0 && x < 400 && y > 0 && y < 400 && !(x > 100 && y > 100))
  const d = rechteckDok()
  d.kisten = [
    kiste('a', 'A-1-001', 'r1', 100, 100),
    kiste('b', 'A-1-002', 'r1', 100, 100, { unterlage_art: 'kiste', unterlage_item_id: 'a', unten_cm: 30, oben_cm: 60, nr: 2 }),
  ]
  gleich('Treffer: oberste Kiste', trefferAn(d, [100, 100]), { art: 'kiste', id: 'b' })
  gleich('Treffer: Raum', trefferAn(d, [300, 250]), { art: 'raum', id: 'r1' })
  gleich('Stapel von unten nach oben', stapelVon(d.kisten[1], d.kisten).map((k) => k.id), ['a', 'b'])
}

/* ------------------------------------------------------ Ansicht */

{
  const nah = (a, b) => Math.abs(a - b) < 1e-9
  // Bildschirm <-> cm hin und zurueck, auch weit draussen und stark verkleinert.
  for (const a of [{ x: 0, y: 0, s: 1 }, { x: -500, y: 1200, s: 0.03 }, { x: 49000, y: 49500, s: 7.5 }]) {
    const [cx, cy] = ans.zuCm(a, 123, 456)
    const [px, py] = ans.zuPx(a, cx, cy)
    wahr(`Umrechnung hin und zurueck bei s=${a.s}`, nah(px, 123) && nah(py, 456))
  }
  gleich('zuCm bei s=2', ans.zuCm({ x: 100, y: -50, s: 2 }, 40, 10), [120, -45])

  // Einpassen: Raeume 0 bis 800 und ein Keller bei 3000, Flaeche 880 x 800.
  const box = { x0: 0, y0: 0, x1: 3400, y1: 400 }
  const e = ans.einpassen(box, 880, 800, 48)
  const [l] = ans.zuPx(e, box.x0, 0)
  const [r] = ans.zuPx(e, box.x1, 0)
  wahr('Einpassen: links Rand', nah(l, 48))
  wahr('Einpassen: rechts Rand', nah(r, 880 - 48))
  const [, oben] = ans.zuPx(e, 0, box.y0)
  const [, unten] = ans.zuPx(e, 0, box.y1)
  wahr('Einpassen: senkrecht mittig', nah(oben, 800 - unten))
  // Leer: sinnvoller Startausschnitt um LEER_BOX.
  const leer = ans.einpassen(null, 1000, 700)
  const m = ans.zuCm(leer, 500, 350)
  wahr('Einpassen leer: Mitte des Startausschnitts', nah(m[0], 550) && nah(m[1], 350))
  wahr('Einpassen: Zoom begrenzt', ans.einpassen({ x0: 0, y0: 0, x1: 1, y1: 1 }, 5000, 5000).s <= ans.ZOOM_MAX)

  // Zoom am Zeiger: der Punkt unter dem Zeiger bleibt.
  const a0 = { x: 300, y: -200, s: 0.5 }
  const vor = ans.zuCm(a0, 200, 150)
  const z1 = ans.zoomAm(a0, 1.7, 200, 150)
  const nach = ans.zuCm(z1, 200, 150)
  wahr('Zoom am Zeiger haelt den Punkt', nah(vor[0], nach[0]) && nah(vor[1], nach[1]))
  gleich('Zoom-Grenze oben', ans.zoomAm(a0, 1e6, 0, 0).s, ans.ZOOM_MAX)
  gleich('Zoom-Grenze unten', ans.zoomAm(a0, 1e-6, 0, 0).s, ans.ZOOM_MIN)

  // Verschieben ohne Grenzen: der Plan folgt dem Zeiger.
  const v = ans.verschieben({ x: 0, y: 0, s: 2 }, 100, -40)
  gleich('Verschieben', v, { x: -50, y: 20, s: 2 })
  const weit = ans.verschieben({ x: 0, y: 0, s: 0.02 }, -2000, -2000)
  gleich('Verschieben weit ueber 50000 hinaus', weit.x, 100000)

  // Rad: hoch/runter zoomt immer, seitliches Wischen verschiebt, Strg zoomt.
  const rad = (deltaX, deltaY, extra = {}) => ({ deltaX, deltaY, deltaMode: 0, ctrlKey: false, metaKey: false, ...extra })
  gleich('Mausrad zoomt', ans.radArt(rad(0, 100)), 'zoom')
  gleich('Mausrad in Zeilen zoomt', ans.radArt(rad(0, 3, { deltaMode: 1 })), 'zoom')
  gleich('Feines Rad zoomt (Windows-Skalierung)', ans.radArt(rad(0, 83.33)), 'zoom')
  gleich('Umschalt+Rad verschiebt', ans.radArt(rad(0, 100, { shiftKey: true })), 'schieben')
  gleich('Trackpad schraeg verschiebt', ans.radArt(rad(12, 60)), 'schieben')
  gleich('Trackpad-Folge bleibt verschieben', ans.radArt(rad(0, 120), true), 'schieben')
  gleich('Strg+Rad zoomt', ans.radArt(rad(0, 4, { ctrlKey: true })), 'zoom')
  wahr('Rad nach oben vergroessert', ans.radFaktor(rad(0, -100)) > 1)
  wahr('Pinch auf wirkt deutlich', ans.radFaktor(rad(0, -10, { ctrlKey: true })) > 1.05)

  // Raster fuellt die Sicht, auch links und oberhalb von 0,0.
  const rl = ans.rasterLinien({ x: -1234, y: -567, s: 0.5 }, 800, 600)
  wahr('Raster beginnt links der Sicht', rl.xs[0] <= -1234 && rl.xs[0] > -1234 - rl.schritt)
  wahr('Raster beginnt oberhalb der Sicht', rl.ys[0] <= -567)
  wahr('Raster reicht bis rechts', rl.xs[rl.xs.length - 1] + rl.schritt > -1234 + 800 / 0.5)
  wahr('Raster: Linien mindestens 14 px', rl.schritt * 0.5 >= 14)
  const fern = ans.rasterLinien({ x: 48000, y: 49000, s: 0.02 }, 1440, 900)
  wahr('Raster weit weg und klein: wenige Linien', fern.xs.length < 100 && fern.ys.length < 100)
}

/* ------------------------------------------------ Nische und Linie */

{
  const d = dok.raumAnlegen(leer(), 'r1', [[0, 0], [400, 0], [400, 300], [0, 300]]).dok
  const r = d.raeume[0]
  const k0 = r.punkte.findIndex((q, i) => {
    const n = r.punkte[(i + 1) % r.punkte.length]
    return q[1] === 0 && n[1] === 0
  })
  const start = r.punkte[k0]
  const flaeche = (dd) => flaeche2(zuUmriss(dd.raeume[0].punkte)) / 2

  // Nische in der Mitte der oberen Wand: 100 breit, 50 tief nach innen.
  const n = dok.nischeFormen(d, 'r1', k0, 150, 250, 50)
  wahr('Nische: angenommen', n.fehler === null)
  gleich('Nische: acht Ecken', n.dok.raeume[0].punkte.length, 8)
  gleich('Nische: Flaeche kleiner', flaeche(n.dok), 400 * 300 - 100 * 50)

  // Ecke wegschneiden: ab der Ecke 100 breit, 80 tief -> L-Form mit sechs Ecken.
  const e = dok.nischeFormen(d, 'r1', k0, 0, 100, 80)
  wahr('Ecke weg: angenommen', e.fehler === null)
  gleich('Ecke weg: sechs Ecken', e.dok.raeume[0].punkte.length, 6)
  gleich('Ecke weg: Flaeche', flaeche(e.dok), 400 * 300 - 100 * 80)
  wahr('Ecke weg: alte Ecke fehlt', !e.dok.raeume[0].punkte.some((q) => q[0] === start[0] && q[1] === start[1]))

  // Vorsprung nach aussen braucht Platz ueber 0: Raum weiter unten.
  const d2 = dok.raumAnlegen(leer(), 'r2', [[0, 100], [400, 100], [400, 400], [0, 400]]).dok
  const r2 = d2.raeume[0]
  const k2 = r2.punkte.findIndex((q, i) => q[1] === 100 && r2.punkte[(i + 1) % r2.punkte.length][1] === 100)
  const v = dok.nischeFormen(d2, 'r2', k2, 100, 300, -60)
  wahr('Vorsprung: angenommen', v.fehler === null)
  gleich('Vorsprung: Flaeche groesser', flaeche2(zuUmriss(v.dok.raeume[0].punkte)) / 2, 400 * 300 + 200 * 60)

  // Zu tief (durch den ganzen Raum): abgelehnt.
  wahr('Nische zu tief: abgelehnt', dok.nischeFormen(d, 'r1', k0, 150, 250, 400).fehler !== null)
  gleich('Nische ohne Tiefe: leer', dok.nischeFormen(d, 'r1', k0, 150, 250, 0).fehler, 'leer')

  // Werkzeug: zwei Klicks auf die Wand, Maus nach innen, dritter Klick.
  const innen = [start[0] === 0 ? 1 : -1, 1]
  const p1 = [start[0] === 0 ? 150 : 250, 0]
  const p2 = [start[0] === 0 ? 250 : 150, 0]
  const w = spielen('nische', [{ runter: p1 }, { runter: p2 }, { bewegen: [200, 50] }, { runter: [200, 50] }], d)
  gleich('Nische-Werkzeug: acht Ecken', w.d.raeume[0].punkte.length, 8)
  gleich('Nische-Werkzeug: Flaeche', flaeche(w.d), 400 * 300 - 100 * 50)
  wahr('Nische-Werkzeug: innen', innen.length === 2)
  const wt = spielen('nische', [{ runter: p1 }, { runter: p2 }, { bewegen: [200, 20] }, { tippen: '40\n' }], d)
  gleich('Nische-Werkzeug getippt: Flaeche', flaeche(wt.d), 400 * 300 - 100 * 40)
  const daneben = spielen('nische', [{ runter: [200, 150] }], d)
  gleich('Nische-Werkzeug: Klick in den Raum', daneben.hinweise, ['zeichner.nische_auf_wand'])

  // Linie: zwei Klicks, danach gewaehlt; Auswahl verschiebt und loescht.
  const li = spielen('linie', [{ runter: [50, 50] }, { runter: [250, 50] }], d)
  gleich('Linie: eine', dok.linienVon(li.d).length, 1)
  gleich('Linie: Punkte', [dok.linienVon(li.d)[0].a, dok.linienVon(li.d)[0].b], [[50, 50], [250, 50]])
  gleich('Linie: gewaehlt', li.auswahl?.art, 'linie')
  wahr('Linie: getroffen', dok.linieAn(li.d, [150, 52], 5) !== null)
  const lz = spielen('auswahl', [{ runter: [150, 50] }, { bewegen: [150, 90] }, { hoch: [150, 90] }], li.d)
  gleich('Linie gezogen', dok.linienVon(lz.d)[0].a, [50, 90])
  const lw = dok.loeschen(lz.d, { art: 'linie', id: dok.linienVon(lz.d)[0].id })
  gleich('Linie geloescht', dok.linienVon(lw).length, 0)
  wahr('Linien vergleichen', !dok.gleicheLinien(d, li.d) && dok.gleicheLinien(li.d, li.d))
  // Gespeichert: lokale Linien bleiben, auch wenn die Antwort sie noch nicht hat.
  const z0 = zStart(d)
  const z1 = zReducer(z0, { typ: 'aendern', dok: li.d })
  const z2 = zReducer(z1, { typ: 'gespeichert', gesendet: z1.dok, antwort: d, version: 1 })
  gleich('Linien bleiben nach Antwort', dok.linienVon(z2.dok).length, 1)
  const z3 = zReducer(z2, { typ: 'linien_gespeichert', linien: dok.linienVon(z2.dok) })
  wahr('Linien gespeichert: gleich', dok.gleicheLinien(z3.basis, z3.dok))
}

/* ------------------------------------------ Flaeche und dicke Waende */

{
  // Nutzflaeche innen bis an die 12-cm-Waende (6 cm je Seite).
  gleich('Flaeche innen Rechteck', flaecheQm([[0, 0], [400, 0], [400, 300], [0, 300]]), 11.17)
  gleich('Flaeche innen L', flaecheQm([[0, 0], [400, 0], [400, 200], [200, 200], [200, 400], [0, 400]]), 11.05)
  // Zwei Zimmer mit 32 cm dicker Wand: jede Seite ihre Kante, 20 cm Luecke.
  const links = { id: 'a', punkte: [[0, 0], [300, 0], [300, 400], [0, 400]] }
  const rechts = { id: 'b', punkte: [[320, 0], [700, 0], [700, 400], [320, 400]] }
  const w = wandStuecke([links, rechts], [])
  wahr('Luecke an der Fassade geschlossen', w.some((s) => s.a[1] === 400 && s.b[1] === 400 && Math.min(s.a[0], s.b[0]) === 300 && Math.max(s.a[0], s.b[0]) === 320))
  wahr('Luecke oben geschlossen', w.some((s) => s.a[1] === 0 && Math.min(s.a[0], s.b[0]) === 300 && Math.max(s.a[0], s.b[0]) === 320))
  // Tuer im linken Raum geht auch durch die parallele Kante des rechten.
  const mitTuer = wandStuecke([links, rechts], [{ raum_id: 'a', kante: 1, abstand_cm: 100, breite_cm: 90 }])
  const rechteWand = mitTuer.filter((s) => s.raumId === 'b' && s.a[0] === 320 && s.b[0] === 320)
  wahr('Tuer durch dicke Wand', rechteWand.length === 2)
  // Weiter als 40 cm auseinander: nicht mehr.
  const weit = { id: 'c', punkte: [[350, 0], [700, 0], [700, 400], [350, 400]] }
  wahr('Weit weg: keine Luecke geschlossen', !wandStuecke([links, weit], []).some((s) => Math.min(s.a[0], s.b[0]) === 300 && Math.max(s.a[0], s.b[0]) === 350))
}

/* ------------------------------------------------------ Strom */

{
  const d = dok.raumAnlegen(leer(), 'r1', [[0, 0], [400, 0], [400, 300], [0, 300]]).dok
  const st = spielen('strom', [{ runter: [52, 48] }], d, { symbolArt: 'licht' })
  gleich('Strom: Licht gesetzt (Raster 5)', dok.symboleVon(st.d).map((x) => [x.art, x.x, x.y]), [['licht', 50, 50]])
  gleich('Strom: gewaehlt', st.auswahl?.art, 'symbol')
  const zug = spielen('auswahl', [{ runter: [50, 50] }, { bewegen: [90, 70] }, { hoch: [90, 70] }], st.d)
  gleich('Strom: Symbol gezogen', dok.symboleVon(zug.d).map((x) => [x.x, x.y]), [[90, 70]])
  const weg = spielen('auswahl', [{ runter: [90, 70] }, { taste: 'Delete' }], zug.d)
  gleich('Strom: Symbol geloescht', dok.symboleVon(weg.d).length, 0)
  wahr('Strom: vergleicht mit', !dok.gleicheLinien(d, st.d))
}

/* ------------------------------------------------------ Sperre */

{
  const d = dok.raumAnlegen(leer(), 'r1', [[0, 0], [400, 0], [400, 300], [0, 300]]).dok
  // Nichts freigegeben: Ziehen waehlt nur, der Raum bleibt stehen.
  const zu = spielen('auswahl', [{ runter: [200, 150] }, { bewegen: [260, 150] }, { hoch: [260, 150] }], d, { entsperrt: null })
  gleich('Sperre: gesperrt bleibt stehen', zu.d.raeume[0].punkte[0], [0, 0])
  gleich('Sperre: trotzdem gewaehlt', zu.auswahl, { art: 'raum', id: 'r1' })
  // Freigegeben: der Raum laesst sich ziehen, auch an seiner Wand.
  const auf = spielen('auswahl', [{ runter: [200, 150] }, { bewegen: [260, 150] }, { hoch: [260, 150] }], d, { entsperrt: 'raum:r1' })
  gleich('Sperre: freigegeben verschiebt', auf.d.raeume[0].punkte[0], [60, 0])
  const doppelZu = spielen('auswahl', [{ doppel: [200, 0] }], d, { entsperrt: null })
  gleich('Sperre: Doppelklick gesperrt fuegt keine Ecke ein', doppelZu.d.raeume[0].punkte.length, 4)
}

/* ------------------------------------------------------ Farben */

for (const f of WANDFARBEN) {
  const k = kontrast(f.hex, BODEN_STANDARD)
  if (k === null || k < 3) {
    console.log('ABWEICHUNG Wandfarbe', f.schluessel, f.hex, 'Kontrast', k)
    fehler++
  }
}
gleich('Acht Wandfarben', WANDFARBEN.length, 8)

if (fehler) {
  console.log(`${fehler} Abweichungen`)
  process.exit(1)
}
console.log('ok')
