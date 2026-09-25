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
import { WERKZEUGE } from '../src/zeichner/werkzeuge/index.ts'
import { raumStart } from '../src/zeichner/werkzeuge/raum.ts'
import { KATALOG, REGAL_STANDARD, SCHRANK_STANDARD } from '../src/zeichner/katalog.ts'
import { BODEN_STANDARD, WANDFARBEN, kontrast } from '../src/lib/farben.ts'
import { faecherGueltig, flaeche2, zuUmriss, polygonFehler } from '../src/lib/geometrie.ts'
import { trefferAn, innenPunkt, objektUmriss, stapelVon } from '../src/components/plan/hilfe.ts'

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
  const d = rechteckDok()
  const r = spielen('auswahl', [{ runter: [200, 150] }, { bewegen: [257, 153] }, { hoch: [257, 153] }], d)
  gleich('Auswahl: Raum gezogen (90 Grad, Raster 5)', r.d.raeume[0].punkte[0], [55, 0])
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
