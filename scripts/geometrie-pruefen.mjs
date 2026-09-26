// Prueft src/lib/geometrie.ts gegen die gemeinsamen Testfaelle aus
// docs/grundriss/BAUPLAN.md Abschnitt 3.4. Derselbe Satz steht als Teil B0
// im Probelauf 0028; eine Regel aendert sich nur an allen drei Stellen.
// Aufruf im Projektordner: node scripts/geometrie-pruefen.mjs
// Ausgabe "ok" oder die abweichenden Faelle, Exit 1 bei Fehlern.
// Node entfernt die Typen der .ts-Datei selbst.
import * as g from '../src/lib/geometrie.ts'

let fehler = 0
function gleich(name, ist, soll) {
  const a = JSON.stringify(ist)
  const b = JSON.stringify(soll)
  if (a !== b) {
    console.log('ABWEICHUNG', name, 'ist', a, 'soll', b)
    fehler++
  }
}

const R = [0, 0, 400, 0, 400, 300, 0, 300]
const L = [0, 0, 400, 0, 400, 200, 200, 200, 200, 400, 0, 400]

gleich('punktLage R innen', g.punktLage(R, 200, 150), 1)
gleich('punktLage R Rand links', g.punktLage(R, 0, 150), 0)
gleich('punktLage R Ecke', g.punktLage(R, 400, 300), 0)
gleich('punktLage R rechts aussen', g.punktLage(R, 401, 150), -1)
gleich('punktLage R links aussen', g.punktLage(R, -1, 0), -1)

gleich('punktLage L Ausschnitt', g.punktLage(L, 300, 300), -1)
gleich('punktLage L innen', g.punktLage(L, 100, 300), 1)
gleich('punktLage L Rand senkrecht', g.punktLage(L, 200, 300), 0)
gleich('punktLage L Rand waagrecht', g.punktLage(L, 300, 200), 0)

gleich('rechteckImPolygon L links', g.rechteckImPolygon(L, { x0: 10, y0: 10, x1: 190, y1: 390 }), true)
gleich('rechteckImPolygon L oben voll', g.rechteckImPolygon(L, { x0: 0, y0: 0, x1: 400, y1: 200 }), true)
gleich('rechteckImPolygon L Ecke innen', g.rechteckImPolygon(L, { x0: 150, y0: 150, x1: 250, y1: 250 }), false)
gleich('rechteckImPolygon L Ausschnitt', g.rechteckImPolygon(L, { x0: 250, y0: 250, x1: 350, y1: 350 }), false)

gleich('polygonFehler umlauf', g.polygonFehler([0, 0, 0, 300, 400, 300, 400, 0]), 'umlauf')
gleich('polygonFehler kreuzt Schleife', g.polygonFehler([0, 0, 400, 300, 400, 0, 0, 300]), 'kreuzt')
gleich('polygonFehler kreuzt zurueck', g.polygonFehler([0, 0, 400, 0, 300, 0, 300, 300, 0, 300]), 'kreuzt')
gleich('polygonFehler doppelt', g.polygonFehler([0, 0, 0, 0, 400, 0, 400, 300]), 'doppelt')
gleich('polygonFehler punkte', g.polygonFehler([0, 0, 400, 0]), 'punkte')
gleich('polygonFehler gueltig R', g.polygonFehler(R), null)
gleich('polygonFehler gueltig L', g.polygonFehler(L), null)

gleich('flaeche2 L', g.flaeche2(L), 240000)
gleich('kanteLaenge2', g.kanteLaenge2([0, 0, 300, 0, 300, 400], 2), 250000)

const objekt = (drehung) => ({
  x: 100, y: 50, breite_cm: 80, tiefe_cm: 30, hoehe_cm: 100, drehung, form: 'rechteck',
  ausschnitt_breite_cm: null, ausschnitt_tiefe_cm: null, ausschnitt_ecke: null, brett_cm: null, spalten: 1,
})
gleich('objektLokal 0', g.objektLokal(objekt(0), 150, 60), [50, 10])
gleich('objektRechtecke 90', g.objektRechtecke(objekt(90)), [{ x0: 70, y0: 50, x1: 100, y1: 130 }])
gleich('objektLokal 90', g.objektLokal(objekt(90), 90, 60), [10, 10])
gleich('objektGlobal 90 zurueck', g.objektGlobal(objekt(90), 10, 10), [90, 60])

const couch = {
  x: 0, y: 0, breite_cm: 250, tiefe_cm: 160, hoehe_cm: 80, drehung: 0, form: 'l',
  ausschnitt_breite_cm: 90, ausschnitt_tiefe_cm: 70, ausschnitt_ecke: 'ro', brett_cm: null, spalten: 1,
}
gleich('objektEnthaelt Couch Ausschnitt', g.objektEnthaelt(couch, 200, 30), false)
gleich('objektEnthaelt Couch unten', g.objektEnthaelt(couch, 200, 100), true)
gleich('objektEnthaelt Couch Rand Ausschnitt', g.objektEnthaelt(couch, 160, 30), true)
gleich('objektRechtecke Couch', g.objektRechtecke(couch), [
  { x0: 0, y0: 0, x1: 160, y1: 70 },
  { x0: 0, y0: 70, x1: 250, y1: 160 },
])

const regal = {
  x: 0, y: 0, breite_cm: 80, tiefe_cm: 30, hoehe_cm: 180, drehung: 0, form: 'rechteck',
  ausschnitt_breite_cm: null, ausschnitt_tiefe_cm: null, ausschnitt_ecke: null, brett_cm: [0, 40, 80, 120], spalten: 2,
}
gleich('objektImFach 1 39', g.objektImFach(regal, 1, 39, 10), true)
gleich('objektImFach 1 40', g.objektImFach(regal, 1, 40, 10), false)
gleich('objektImFach 2 40', g.objektImFach(regal, 2, 40, 10), false)
gleich('objektImFach 2 41', g.objektImFach(regal, 2, 41, 10), true)

gleich('fachDecke 2', g.fachDecke({ brett_cm: [0, 40, 80, 120], hoehe_cm: 180 }, 2), 78)
gleich('fachDecke 4', g.fachDecke({ brett_cm: [0, 40, 80, 120], hoehe_cm: 180 }, 4), 178)

gleich('faecherGueltig ok', g.faecherGueltig([0, 40, 80, 120], 180), true)
gleich('faecherGueltig eng', g.faecherGueltig([0, 2], 100), false)
gleich('faecherGueltig oben', g.faecherGueltig([0, 40], 42), false)

const k = { x: 200, y: 150, drehung: 0, laenge: 44, breite: 33 }
gleich('kisteTraegt Rand', g.kisteTraegt(k, 222, 150), true)
gleich('kisteTraegt daneben', g.kisteTraegt(k, 223, 150), false)
gleich('kisteTraegt gedreht', g.kisteTraegt({ ...k, drehung: 90 }, 200, 172), true)

gleich('faecherAusAbstaenden', g.faecherAusAbstaenden([30, 35, 35, 40]), { brett_cm: [0, 32, 69, 106], hoehe_cm: 148 })

const laengen = ['3,45', '3.45', '345', '0,8', '3 m 45', '٣٫٤٥', '3,456', '', '-3']
gleich('laengeLesen', laengen.map((t) => g.laengeLesen(t)), [345, 345, 345, 80, 345, 345, 346, null, null])

// Zusaetzlich zur Tabelle: Hoehe und Platz im Zusammenspiel.
const daten = {
  raeume: [{ id: 'r', punkte: g.zuPunkten(R), hoehe_cm: 250 }],
  objekte: [{ ...regal, id: 'o', raum_id: 'r', art: 'regal', name: 'Regal', x: 300, y: 0 }],
  kisten: [
    { id: 'a', code: 'W-5-001', platz_raum_id: 'r', platz_x: 100, platz_y: 100, platz_drehung: 0,
      unterlage_art: 'boden', unterlage_item_id: null, unterlage_objekt_id: null, fach_ebene: null, fach_spalte: null,
      laenge_cm: 60, breite_cm: 40, hoehe_cm: 40 },
    { id: 'b', code: 'W-5-002', platz_raum_id: 'r', platz_x: 110, platz_y: 100, platz_drehung: 0,
      unterlage_art: 'kiste', unterlage_item_id: 'a', unterlage_objekt_id: null, fach_ebene: null, fach_spalte: null,
      laenge_cm: 60, breite_cm: 40, hoehe_cm: 40 },
  ],
}
gleich('kisteBasis Stapel', g.kisteBasis(daten.kisten[1], daten), {
  unten_cm: 40, grenze_cm: 250, wurzel_art: 'boden', wurzel_objekt: null, tiefe: 1,
})
gleich('platzFehler ok', g.platzFehler(daten.kisten[1], daten), null)
gleich('platzFehler draussen', g.platzFehler({ ...daten.kisten[0], platz_x: 500 }, daten)?.kennung, 'draussen')
gleich('platzFehler kreis', g.platzFehler({ ...daten.kisten[0], unterlage_art: 'kiste', unterlage_item_id: 'b' }, daten)?.kennung, 'kreis')
gleich('platzFehler zu_hoch im Fach', g.platzFehler({ ...daten.kisten[0], platz_x: 310, platz_y: 10,
  unterlage_art: 'fach', unterlage_objekt_id: 'o', fach_ebene: 1, fach_spalte: 1 }, daten),
  { kennung: 'zu_hoch', werte: { code: 'W-5-001', oben: 40, grenze: 38 } })

// Ueberstand im Fach (0033). Dieselben Faelle stehen als Teil B1 im Probelauf 0033.
const fach = (drehung, x, y) => ({ ...regal, spalten: 1, brett_cm: [0, 40], drehung, x, y })
gleich('kisteUeberstand2 Mitte', g.kisteUeberstand2(fach(0, 0, 0), 40, 15, { drehung: 0, laenge: 40, breite: 30 }), 0)
gleich('kisteUeberstand2 vorne 25', g.kisteUeberstand2(fach(0, 0, 0), 40, 30, { drehung: 0, laenge: 40, breite: 50 }), 50)
gleich('kisteUeberstand2 Kiste 90 halb', g.kisteUeberstand2(fach(0, 0, 0), 40, 30, { drehung: 90, laenge: 81, breite: 20 }), 81)
gleich('kisteUeberstand2 Regal 90 Kiste 0', g.kisteUeberstand2(fach(90, 300, 100), 270, 140, { drehung: 0, laenge: 82, breite: 20 }), 82)
gleich('kisteUeberstand2 Regal 90 Kiste 90', g.kisteUeberstand2(fach(90, 300, 100), 270, 140, { drehung: 90, laenge: 82, breite: 20 }), 20)
gleich('kisteUeberstand2 Regal 180 hinten', g.kisteUeberstand2(fach(180, 90, 40), 50, 10, { drehung: 0, laenge: 40, breite: 50 }), 50)
gleich('ueberstandCm', [0, 50, 80, 81, 82].map(g.ueberstandCm), [0, 25, 40, 41, 41])

const mitFach = {
  raeume: daten.raeume,
  objekte: [{ ...fach(0, 10, 10), id: 'f', raum_id: 'r', art: 'regal', name: 'Billy' }],
  kisten: [],
}
const inFach = (laenge, breite, drehung) => ({
  ...daten.kisten[0], platz_x: 50, platz_y: 40, platz_drehung: drehung, unterlage_art: 'fach',
  unterlage_objekt_id: 'f', fach_ebene: 1, fach_spalte: 1, laenge_cm: laenge, breite_cm: breite, hoehe_cm: 30,
})
gleich('platzFehler Ueberstand 40 ok', g.platzFehler(inFach(80, 20, 90), mitFach), null)
gleich('platzFehler Ueberstand 41', g.platzFehler(inFach(82, 20, 90), mitFach),
  { kennung: 'ueberstand_zu_gross', werte: { code: 'W-5-001', name: 'Billy', cm: 41, max: 40 } })
gleich('platzFehler Ueberstand 40,5', g.platzFehler(inFach(40, 81, 0), mitFach)?.werte.cm, 41)
const an = (l, b, d) => g.unterlagenAn({ ...mitFach, kisten: [] }, 'r', 50, 40, { laenge_cm: l, breite_cm: b, hoehe_cm: 30, drehung: d })
  .filter((u) => u.art === 'fach').map((u) => [u.ueberstand_cm, u.passt, u.grund ?? null])
gleich('unterlagenAn Fach 25', an(40, 50, 0), [[25, true, null], [25, true, null]])
gleich('unterlagenAn Fach 41', an(82, 20, 90), [[41, false, 'ueberstand'], [41, false, 'ueberstand']])

if (fehler) {
  console.log('Abweichungen:', fehler)
  process.exit(1)
}
console.log('ok')
