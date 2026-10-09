// Prueft das Moebel-Tragen beim Begehen (E89) ohne Browser:
//  1. Starre Lage (tragen.ts): Drehung um k mal 90 Grad wie three
//     (Vector3.applyAxisAngle um die Hochachse) um die Mitte, dann
//     verschoben; Richtungen nur gedreht; Rechtecke bleiben achsparallel;
//     vom Original aus gesetzt kommt Zuruecksetzen genau zurueck.
//  2. Grundriss gegen Waende: Trennachsen (ueberlappt) gegen die Flaeche
//     der Schnittmenge, zufaellig; erfundene Wohnung aus szene.ts mit Wand,
//     Fenster (Bruestung, Scheibe) und Tuer (Zarge, Blatt) in kollision.ts:
//     Mitte des Raums ja, in der Wand nein, an der Wand ja, draussen nein,
//     Bruestung und Tuerblatt nein, Moebel darunter ja, Ecke eines L-Raums
//     nein; schrumpfFuer laesst ein Moebel, das schon im Plan in der Wand
//     steht, an ihr entlang gleiten.
//  3. Vorzeichen und Mitte gegen szene.ts: ein Moebel in Lage k (Motor,
//     starr um die Mitte seines Grundrisses) ist Teil fuer Teil dasselbe
//     wie das Objekt, das objektVersetzt daraus macht (planGrad, ganze cm)
//     und szene.ts neu baut: Ecken jedes Teils, Tueren (Angel, zu, auf),
//     Schubladen (Weg), Plaetze (Punkt, Blick), Rundformen (Achse),
//     Leuchten und Lichter. Stuhl, Kommode, Schrank mit Tueren, Regal,
//     Stehlampe, L-Sofa; alle vier Drehungen, alle vier Ausgangsdrehungen.
//  4. objektVerschieben.ts: Mitte wandert genau um (dx, dy) (ungerade
//     Masse bei Vierteldrehung hoechstens 0,5 cm), Drehung normiert,
//     ganze cm, Raum nach dem Versetzen, letzte Aenderung je Objekt gilt.
//  5. Zeiger: Strahl auf die Zugebene, Ebene mindestens 35 cm von den
//     Augen, hoechstens 6 m weit, ganze cm, Aenderung fuer das Speichern.
// Alle Zahlen und Namen sind erfunden.
// Aufruf im Projektordner: node scripts/moebel-tragen-pruefen.mjs
// Ausgabe "ok" oder die abweichenden Faelle, Exit 1 bei Fehlern.
import { Euler, Matrix4, Quaternion, Vector3 } from 'three'
import {
  aenderungAus,
  aufCm,
  imRaum,
  kastenDazu,
  kastenLage,
  kastenSchrumpfen,
  kastenVon,
  nahBegrenzen,
  planGrad,
  schrumpfFuer,
  stelleErlaubt,
  strahlAufEbene,
  stufe,
  tragFolgen,
  tragGleich,
  TRAGEN_SCHRUMPF_M,
  TRAGEN_WEIT_M,
  tragLageNeu,
  tragPunkt,
  tragRichtung,
  tragRuht,
  tragWinkel,
  ueberlappt,
  zugEbeneY,
  ZUG_ABSTAND_M,
} from '../src/components/plan3d/tragen.ts'
import { drehungNorm, moebelAnwenden, objektMitte, objektVersetzt, raumFuer } from '../src/components/plan/objektVerschieben.ts'
import { baueSzene, lichter } from '../src/components/plan3d/szene.ts'
import { Hindernisse } from '../src/components/plan3d/kollision.ts'
import { objektGlobal } from '../src/lib/geometrie.ts'

let fehler = 0
let faelle = 0
function wahr(name, ist, mehr = '') {
  faelle++
  if (!ist) {
    console.log('ABWEICHUNG', name, mehr)
    fehler++
  }
}
function nahe(name, ist, soll, tol = 1e-9) {
  wahr(name, Math.abs(ist - soll) <= tol, `ist ${ist} soll ${soll}`)
}
let saat = 8128
const zufall = () => {
  saat = (saat * 1103515245 + 12345) % 2147483648
  return saat / 2147483648
}
const winkelGleich = (a, b, tol = 1e-9) => {
  let d = a - b
  while (d > Math.PI) d -= 2 * Math.PI
  while (d < -Math.PI) d += 2 * Math.PI
  return Math.abs(d) <= tol
}

/* ------------------------------------------------ 1. Starre Lage */
{
  const Y = new Vector3(0, 1, 0)
  for (let k = 0; k < 4; k++) {
    for (let i = 0; i < 40; i++) {
      const l = { k, cx: zufall() * 8 - 2, cz: zufall() * 8 - 2, tx: aufCm(zufall() * 4 - 2), tz: aufCm(zufall() * 4 - 2) }
      const x = zufall() * 10 - 3
      const z = zufall() * 10 - 3
      const p = tragPunkt(l, x, z)
      const v = new Vector3(x - l.cx, 0, z - l.cz).applyAxisAngle(Y, (k * Math.PI) / 2)
      nahe(`Punkt wie three k=${k}`, p.x, l.cx + v.x + l.tx, 1e-12)
      nahe(`Punkt wie three z k=${k}`, p.z, l.cz + v.z + l.tz, 1e-12)
      const r = tragRichtung(l, x, z)
      const w = new Vector3(x, 0, z).applyAxisAngle(Y, (k * Math.PI) / 2)
      nahe(`Richtung wie three k=${k}`, r.x, w.x, 1e-12)
      nahe(`Richtung wie three z k=${k}`, r.z, w.z, 1e-12)
    }
    // tragWinkel ist der Winkel, um den three dreht (rotation.y).
    const q = new Quaternion().setFromAxisAngle(Y, tragWinkel(k))
    const x1 = new Vector3(1, 0, 0).applyQuaternion(q)
    const l = { k, cx: 0, cz: 0, tx: 0, tz: 0 }
    const r = tragRichtung(l, 1, 0)
    nahe(`tragWinkel passt zu tragRichtung k=${k}`, r.x, x1.x, 1e-12)
    nahe(`tragWinkel passt zu tragRichtung z k=${k}`, r.z, x1.z, 1e-12)
  }
  // Die Mitte bleibt bei jeder Drehung, wandert nur mit (tx, tz).
  const l = { k: 3, cx: 1.5, cz: 2.25, tx: 0.4, tz: -0.7 }
  const m = tragPunkt(l, 1.5, 2.25)
  nahe('Mitte wandert um t', m.x, 1.9, 1e-12)
  nahe('Mitte wandert um t z', m.z, 1.55, 1e-12)
  // Ruhe: genau das Original (Zuruecksetzen rechnet immer vom Original aus).
  const ruhe = tragLageNeu(3.3, 1.1)
  const o = tragPunkt(ruhe, 2.123456789, -0.987654321)
  wahr('Ruhe: Punkt exakt', o.x === 2.123456789 && o.z === -0.987654321)
  wahr('tragRuht', tragRuht(ruhe) && !tragRuht({ ...ruhe, k: 1 }) && !tragRuht({ ...ruhe, tx: 0.01 }))
  wahr('tragGleich', tragGleich(ruhe, { ...ruhe }) && !tragGleich(ruhe, { ...ruhe, tz: 0.01 }))
  // Rechtecke: bei Vierteldrehung achsparallel und gleich gross (getauscht).
  const a = { x0: 1, z0: 2, x1: 3, z1: 2.5 }
  for (let k = 0; k < 4; k++) {
    const b = kastenLage(a, { k, cx: 2, cz: 2.25, tx: 0.5, tz: 0 })
    const quer = k % 2 === 1
    nahe(`Kasten Breite k=${k}`, b.x1 - b.x0, quer ? 0.5 : 2, 1e-12)
    nahe(`Kasten Tiefe k=${k}`, b.z1 - b.z0, quer ? 2 : 0.5, 1e-12)
    nahe(`Kasten Mitte k=${k}`, (b.x0 + b.x1) / 2, 2.5, 1e-12)
  }
  const ks = kastenSchrumpfen({ x0: 0, z0: 0, x1: 1, z1: 0.03 }, 0.02)
  wahr('Schrumpfen nie verkehrt', ks.x1 >= ks.x0 && ks.z1 >= ks.z0 && Math.abs(ks.x0 - 0.02) < 1e-12)
  const kd = kastenDazu(null, { x0: 0, z0: 0, x1: 1, z1: 1 })
  const kd2 = kastenDazu(kd, { x0: -1, z0: 0.5, x1: 0.5, z1: 2 })
  wahr('kastenDazu', kd2.x0 === -1 && kd2.z1 === 2 && kd2.x1 === 1 && kd2.z0 === 0)
  const kv = kastenVon(1, 1, 2, 0.5, Math.PI / 2)
  nahe('kastenVon gedreht', kv.x1 - kv.x0, 0.5, 1e-12)
  wahr('stufe', stufe(-1) === 3 && stufe(5) === 1 && stufe(Number.NaN) === 0 && stufe(2) === 2)
}

/* -------------------------------------- 2. Grundriss gegen Waende */
// Flaeche der Schnittmenge eines gedrehten Rechtecks mit einem Kasten
// (Sutherland-Hodgman): unabhaengig von den Trennachsen.
function schnittFlaeche(a, mx, mz, ux, uz, hl, ht) {
  const tx = -uz
  const tz = ux
  let poly = [
    [mx + ux * hl + tx * ht, mz + uz * hl + tz * ht],
    [mx - ux * hl + tx * ht, mz - uz * hl + tz * ht],
    [mx - ux * hl - tx * ht, mz - uz * hl - tz * ht],
    [mx + ux * hl - tx * ht, mz + uz * hl - tz * ht],
  ]
  const kanten = [
    (p) => p[0] - a.x0,
    (p) => a.x1 - p[0],
    (p) => p[1] - a.z0,
    (p) => a.z1 - p[1],
  ]
  for (const f of kanten) {
    const neu = []
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i]
      const q = poly[(i + 1) % poly.length]
      const fp = f(p)
      const fq = f(q)
      if (fp >= 0) neu.push(p)
      if (fp >= 0 !== fq >= 0) {
        const t = fp / (fp - fq)
        neu.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t])
      }
    }
    poly = neu
    if (!poly.length) return 0
  }
  let s = 0
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]
    const q = poly[(i + 1) % poly.length]
    s += p[0] * q[1] - q[0] * p[1]
  }
  return Math.abs(s) / 2
}
{
  let gleich = 0
  let mit = 0
  for (let i = 0; i < 4000; i++) {
    const a = { x0: zufall() * 4, z0: zufall() * 4, x1: 0, z1: 0 }
    a.x1 = a.x0 + 0.05 + zufall() * 2
    a.z1 = a.z0 + 0.05 + zufall() * 2
    const w = zufall() < 0.5 ? Math.floor(zufall() * 4) * (Math.PI / 2) : zufall() * Math.PI * 2
    const ux = Math.cos(w)
    const uz = -Math.sin(w)
    const mx = zufall() * 6 - 1
    const mz = zufall() * 6 - 1
    const hl = 0.05 + zufall() * 2
    const ht = 0.03 + zufall() * 0.5
    const f = schnittFlaeche(a, mx, mz, ux, uz, hl, ht)
    // Fast nur Beruehren: nicht eindeutig, auslassen.
    if (f > 0 && f < 1e-7) continue
    const u = ueberlappt(a, mx, mz, ux, uz, hl, ht)
    if (u === f > 0) gleich++
    else console.log('ABWEICHUNG Trennachsen', JSON.stringify({ a, mx, mz, w, hl, ht, f, u }))
    if (f > 0) mit++
    faelle++
  }
  wahr('Trennachsen wie Schnittflaeche (alle)', gleich > 3500, `${gleich}`)
  wahr('Trennachsen: beide Faelle kommen vor', mit > 500 && mit < 3500, `${mit}`)
  // Beruehren zaehlt nicht.
  wahr('Beruehren zaehlt nicht', !ueberlappt({ x0: 0, z0: 0, x1: 1, z1: 1 }, 1.5, 0.5, 1, 0, 0.5, 0.5))
}

// Erfundene Wohnung: Wohnzimmer 0..500 x 0..400 cm, Flur 500..700 x 0..200,
// Tuer in der gemeinsamen Wand (x = 500, y 50..140), Fenster oben
// (y = 0, x 150..270), L-foermiges Bad unten rechts (700..900 x 0..300 ohne
// 800..900 x 200..300).
function raum(id, punkte, extra = {}) {
  return {
    id, grundriss_id: 'g1', project_id: 'p1', tag_id: null, name: id, art: 'innen', punkte,
    hoehe_cm: 250, bodenfarbe: null, wandfarben: null, sort: 0, tag_name: null, tag_short: null, tag_color: null,
    ...extra,
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
const F = new Proxy({}, { get: () => '#888888' })
const wohnung = {
  grundriss: { id: 'g1', project_id: 'p1', name: 'Erfunden', sort: 0, version: 1, created_at: '', updated_at: '' },
  raeume: [
    raum('w', [[0, 0], [500, 0], [500, 400], [0, 400]]),
    raum('f', [[500, 0], [700, 0], [700, 200], [500, 200]]),
    raum('b', [[700, 0], [900, 0], [900, 200], [800, 200], [800, 300], [700, 300]]),
  ],
  oeffnungen: [
    { id: 't1', raum_id: 'w', art: 'tuer', kante: 1, abstand_cm: 50, breite_cm: 90, hoehe_cm: 200, bruestung_cm: 0, anschlag: 'links', aufschlag: 'innen' },
    { id: 'f1', raum_id: 'w', art: 'fenster', kante: 0, abstand_cm: 150, breite_cm: 120, hoehe_cm: 120, bruestung_cm: 90, anschlag: 'links', aufschlag: 'innen' },
  ],
  objekte: [],
  kisten: [],
}
const WAND_ROLLEN = new Set(['wand', 'bruestung', 'scheibe', 'rahmen', 'zarge', 'tuerblatt'])
const koerper = baueSzene(wohnung, F)
const waende = new Hindernisse(1)
const wandNr = []
const rollenDa = new Set()
for (const k of koerper) {
  if (k.art !== 'quader' || !WAND_ROLLEN.has(k.rolle)) continue
  // Wie motor.ts (istHindernis): was unter 1,2 m beginnt.
  if (k.mitte[1] - k.masse[1] / 2 >= 1.2) continue
  wandNr.push(waende.dazu(k.mitte[0], k.mitte[2], k.masse[0], k.masse[2], k.drehY, true))
  rollenDa.add(k.rolle)
}
const raeumeM = koerper.filter((k) => k.art === 'flaeche').map((k) => k.punkte.flatMap(([x, z]) => [x, z]))
{
  wahr('Wohnung: Wand, Bruestung, Zarge, Blatt da', ['wand', 'bruestung', 'zarge', 'tuerblatt'].every((r) => rollenDa.has(r)), [...rollenDa].join(','))
  wahr('Wohnung: drei Boeden', raeumeM.length === 3)
  const tisch = (x0, z0, x1, z1) => ({ x0, z0, x1, z1 })
  const geht = (a, s) => stelleErlaubt(a, waende, wandNr, raeumeM, s)
  wahr('Mitte des Wohnzimmers: ja', geht(tisch(2, 1.5, 3.2, 2.3)))
  wahr('10 cm in der linken Wand: nein', !geht(tisch(-0.04, 1.5, 1.16, 2.3)))
  wahr('an der Innenseite der Wand (6 cm): ja', geht(tisch(0.06, 1.5, 1.26, 2.3)))
  wahr('2 cm in der Wand: ja (2 cm kleiner)', geht(tisch(0.04, 1.5, 1.24, 2.3)))
  wahr('draussen: nein', !geht(tisch(-3, 1.5, -1.8, 2.3)))
  wahr('unter dem Fenster in der Bruestung: nein', !geht(tisch(1.6, -0.05, 2.5, 0.5)))
  wahr('vor dem Fenster: ja', geht(tisch(1.6, 0.07, 2.5, 0.6)))
  wahr('in der Zarge der Tuer: nein', !geht(tisch(4.6, 0.3, 5.05, 1.0)))
  wahr('quer durch die Tuer: nein (zwei Raeume)', !geht(tisch(4.7, 0.7, 5.3, 1.0)))
  // Das Tuerblatt steht 25 Grad offen in das Wohnzimmer (Anschlag links).
  const blatt = koerper.find((k) => k.art === 'quader' && k.rolle === 'tuerblatt')
  wahr('Tuerblatt gefunden', !!blatt)
  if (blatt) {
    const [bx, , bz] = blatt.mitte
    wahr('auf dem Tuerblatt: nein', !geht(tisch(bx - 0.1, bz - 0.1, bx + 0.1, bz + 0.1)))
  }
  wahr('Flur: ja', geht(tisch(5.2, 0.5, 6.5, 1.5)))
  // L-Bad: ein Kasten ueber der weggeschnittenen Ecke ist nicht ganz im Raum.
  wahr('L-Raum: in der Ecke nein', !imRaum(kastenSchrumpfen(tisch(7.5, 1.5, 8.6, 2.6), TRAGEN_SCHRUMPF_M), raeumeM))
  wahr('L-Raum: im Bein ja', imRaum(kastenSchrumpfen(tisch(7.1, 2.1, 7.9, 2.9), TRAGEN_SCHRUMPF_M), raeumeM))
  // schrumpfFuer: im Plan bis an die Kante des Raums, also 6 cm in der
  // linken Wand (Beruehren der Innenseite zaehlt nicht).
  const plan = tisch(-0.0, 1.5, 0.8, 2.3)
  const s = schrumpfFuer(plan, waende, wandNr, raeumeM)
  nahe('schrumpfFuer: 6 cm Wand', s, 0.06, 1e-12)
  nahe('schrumpfFuer: 7 cm in der Wand', schrumpfFuer(tisch(-0.01, 1.5, 0.8, 2.3), waende, wandNr, raeumeM), 0.07, 1e-12)
  nahe('schrumpfFuer: tiefer als erlaubt 2 cm', schrumpfFuer(tisch(-0.2, 1.5, 0.8, 2.3), waende, wandNr, raeumeM), TRAGEN_SCHRUMPF_M, 1e-12)
  wahr('mit 2 cm passt es dort nicht', !geht(plan))
  wahr('mit schrumpfFuer an der Wand entlang: ja', geht(tisch(-0.0, 2.6, 0.8, 3.4), s))
  wahr('mit schrumpfFuer tiefer in die Wand: nein', !geht(tisch(-0.1, 2.6, 0.7, 3.4), s))
  nahe('schrumpfFuer: frei stehend 2 cm', schrumpfFuer(tisch(2, 1.5, 3.2, 2.3), waende, wandNr, raeumeM), TRAGEN_SCHRUMPF_M, 1e-12)
}

/* --------------------------- 3. Vorzeichen und Mitte gegen szene.ts */
const TRAGE_ROLLEN = new Set(['moebel', 'regal', 'brett', 'ding', 'spiegel', 'griff', 'front'])
const teileVon = (liste, id) => liste.filter((k) => k.art === 'quader' && ((k.id === id && TRAGE_ROLLEN.has(k.rolle)) || (k.rolle === 'leuchte' && k.objekt === id)))
const ecken = (pos, drehY, kx, kz, masse) => {
  const m = new Matrix4().compose(new Vector3(...pos), new Quaternion().setFromEuler(new Euler(kx, drehY, kz, 'YXZ')), new Vector3(...masse))
  const out = []
  for (const sx of [-0.5, 0.5]) for (const sy of [-0.5, 0.5]) for (const sz of [-0.5, 0.5]) out.push(new Vector3(sx, sy, sz).applyMatrix4(m))
  return out.map((v) => [v.x, v.y, v.z].map((z) => Math.round(z * 1e6) / 1e6).join(',')).sort()
}
const ACHSE = { x: [1, 0], z: [0, 1] }
{
  const raumGross = raum('r', [[0, 0], [2000, 0], [2000, 2000], [0, 2000]])
  const vorlagen = [
    objekt('stuhl', 'r', 'moebel', { name: 'Stuhl', breite_cm: 46, tiefe_cm: 52, hoehe_cm: 90 }),
    objekt('kommode', 'r', 'moebel', { name: 'Kommode', breite_cm: 100, tiefe_cm: 48, hoehe_cm: 80 }),
    objekt('sideboard', 'r', 'moebel', { name: 'Sideboard', breite_cm: 160, tiefe_cm: 44, hoehe_cm: 76 }),
    objekt('schrank', 'r', 'schrank', { breite_cm: 120, tiefe_cm: 60, hoehe_cm: 200, brett_cm: [0, 100], spalten: 2 }),
    objekt('regal', 'r', 'regal', { breite_cm: 80, tiefe_cm: 30, hoehe_cm: 180, brett_cm: [0, 40, 80], spalten: 2 }),
    objekt('lampe', 'r', 'moebel', { name: 'Stehlampe', breite_cm: 40, tiefe_cm: 40, hoehe_cm: 160 }),
    objekt('sofa', 'r', 'moebel', { name: 'Sofa', breite_cm: 220, tiefe_cm: 160, hoehe_cm: 80, form: 'l', ausschnitt_breite_cm: 120, ausschnitt_tiefe_cm: 70, ausschnitt_ecke: 'ro' }),
    objekt('tisch', 'r', 'moebel', { name: 'Esstisch', breite_cm: 140, tiefe_cm: 80, hoehe_cm: 75 }),
  ]
  const da = { tueren: 0, schuebe: 0, plaetze: 0, rund: 0, leuchten: 0, lichter: 0, kipp: 0 }
  for (const v of vorlagen) {
    for (const d0 of [0, 90, 180, 270]) {
      const o0 = { ...v, x: 800, y: 900, drehung: d0 }
      const teile0 = teileVon(baueSzene({ ...wohnung, raeume: [raumGross], oeffnungen: [], objekte: [o0] }, F), o0.id)
      const licht0 = lichter({ ...wohnung, raeume: [raumGross], oeffnungen: [], objekte: [o0], grundriss: { ...wohnung.grundriss, symbole: [] } }).filter((l) => l.objektId === o0.id)
      wahr(`${v.id} ${d0}: Teile da`, teile0.length > 0)
      const [mx, my] = objektMitte(o0)
      for (let k = 0; k < 4; k++) {
        const dx = 130
        const dy = -70
        const l = { k, cx: mx / 100, cz: my / 100, tx: dx / 100, tz: dy / 100 }
        const w = tragWinkel(k)
        const o1 = objektVersetzt(o0, { dxCm: dx, dyCm: dy, drehGrad: planGrad(k) })
        const name = `${v.id} ${d0} k=${k}`
        const teile1 = teileVon(baueSzene({ ...wohnung, raeume: [raumGross], oeffnungen: [], objekte: [o1] }, F), o1.id)
        if (teile1.length !== teile0.length) {
          wahr(`${name}: gleich viele Teile`, false, `${teile0.length} gegen ${teile1.length}`)
          continue
        }
        let ok = true
        let grund = ''
        for (let i = 0; i < teile0.length; i++) {
          const a = teile0[i]
          const b = teile1[i]
          if (a.rolle !== b.rolle) {
            ok = false
            grund = `Rolle ${i}`
            break
          }
          // Motor: Mitte starr versetzt, Drehung + w, Neigung bleibt.
          const p = tragPunkt(l, a.mitte[0], a.mitte[2])
          const ea = ecken([p.x, a.mitte[1], p.z], a.drehY + w, a.kipp?.x ?? 0, a.kipp?.z ?? 0, a.masse)
          const eb = ecken(b.mitte, b.drehY, b.kipp?.x ?? 0, b.kipp?.z ?? 0, b.masse)
          if (ea.join('|') !== eb.join('|')) {
            ok = false
            grund = `Ecken ${i} (${a.rolle}) ${ea[0]} gegen ${eb[0]}`
            break
          }
          if (a.kipp) da.kipp++
          if (a.tuer) {
            da.tueren++
            const g = tragPunkt(l, a.tuer.angel[0], a.tuer.angel[1])
            if (!b.tuer || Math.abs(g.x - b.tuer.angel[0]) > 1e-9 || Math.abs(g.z - b.tuer.angel[1]) > 1e-9 || !winkelGleich(a.tuer.zu + w, b.tuer.zu) || !winkelGleich(a.tuer.auf + w, b.tuer.auf)) {
              ok = false
              grund = `Tuer ${i}`
              break
            }
          }
          if (a.schub) {
            da.schuebe++
            const r = tragRichtung(l, a.schub.weg[0], a.schub.weg[1])
            if (!b.schub || Math.abs(r.x - b.schub.weg[0]) > 1e-9 || Math.abs(r.z - b.schub.weg[1]) > 1e-9) {
              ok = false
              grund = `Schublade ${i}`
              break
            }
          }
          if (a.platz) {
            da.plaetze++
            const q = tragPunkt(l, a.platz.punkt[0], a.platz.punkt[2])
            if (!b.platz || Math.abs(q.x - b.platz.punkt[0]) > 1e-9 || Math.abs(q.z - b.platz.punkt[2]) > 1e-9 || !winkelGleich(a.platz.blick + w, b.platz.blick)) {
              ok = false
              grund = `Platz ${i}`
              break
            }
          }
          if (a.form?.art === 'zylinder' && a.form.achse !== 'y') {
            da.rund++
            const r = tragRichtung(l, ...ACHSE[a.form.achse])
            const s = ACHSE[b.form?.achse] ?? [9, 9]
            if (Math.abs(Math.abs(r.x) - s[0]) > 1e-9 || Math.abs(Math.abs(r.z) - s[1]) > 1e-9) {
              ok = false
              grund = `Rundform ${i}`
              break
            }
          }
          if (a.rolle === 'leuchte') da.leuchten++
        }
        wahr(`${name}: Motor gleich Neubau`, ok, grund)
        const licht1 = lichter({ ...wohnung, raeume: [raumGross], oeffnungen: [], objekte: [o1], grundriss: { ...wohnung.grundriss, symbole: [] } }).filter((x) => x.objektId === o1.id)
        wahr(`${name}: Lichter gleich viele`, licht0.length === licht1.length)
        for (let i = 0; i < Math.min(licht0.length, licht1.length); i++) {
          da.lichter++
          const q = tragPunkt(l, licht0[i].pos[0], licht0[i].pos[2])
          wahr(`${name}: Licht ${i}`, Math.abs(q.x - licht1[i].pos[0]) < 1e-9 && Math.abs(q.z - licht1[i].pos[2]) < 1e-9 && licht0[i].pos[1] === licht1[i].pos[1])
        }
      }
    }
  }
  wahr('es kamen Tueren, Schubladen, Plaetze, Leuchten und Lichter vor', da.tueren > 0 && da.schuebe > 0 && da.plaetze > 0 && da.leuchten > 0 && da.lichter > 0, JSON.stringify(da))
  // Vorzeichen ausdruecklich: k = 1 (three +90, von oben gegen den
  // Uhrzeigersinn) ist im Plan 270, k = 3 ist 90.
  wahr('planGrad', planGrad(0) === 0 && planGrad(1) === 270 && planGrad(2) === 180 && planGrad(3) === 90)
  // Plan 90: lokal x zeigt nach +y (Welt +z); three dreht dafuer um -90 Grad.
  const g = objektGlobal({ x: 0, y: 0, drehung: 90 }, 1, 0)
  const r = tragRichtung({ k: 3, cx: 0, cz: 0, tx: 0, tz: 0 }, 1, 0)
  wahr('Plan 90 ist three k = 3', Math.abs(g[0] - r.x) < 1e-12 && Math.abs(g[1] - r.z) < 1e-12)
}

/* -------------------------------------------- 4. objektVerschieben */
{
  for (const form of ['rechteck', 'l']) {
    for (const ecke of ['lo', 'ro', 'ru', 'lu']) {
      if (form === 'rechteck' && ecke !== 'lo') continue
      for (const d0 of [0, 90, 180, 270]) {
        for (const drehGrad of [0, 90, 180, 270, -90, 450]) {
          const o = objekt('o', 'w', 'moebel', {
            x: 300, y: 200, breite_cm: 120, tiefe_cm: 60, drehung: d0, form,
            ...(form === 'l' ? { ausschnitt_breite_cm: 40, ausschnitt_tiefe_cm: 20, ausschnitt_ecke: ecke } : {}),
          })
          const n = objektVersetzt(o, { dxCm: 37, dyCm: -12, drehGrad })
          const [ax, ay] = objektMitte(o)
          const [bx, by] = objektMitte(n)
          const name = `${form} ${ecke} ${d0}+${drehGrad}`
          wahr(`${name}: Mitte genau`, bx - ax === 37 && by - ay === -12, `${bx - ax} ${by - ay}`)
          wahr(`${name}: Drehung`, n.drehung === drehungNorm(d0 + drehGrad) && [0, 90, 180, 270].includes(n.drehung))
          wahr(`${name}: ganze cm`, Number.isInteger(n.x) && Number.isInteger(n.y))
          wahr(`${name}: Rest bleibt`, n.breite_cm === 120 && n.form === form && n.raum_id === 'w')
        }
      }
    }
  }
  // Ungerade Masse und eine Vierteldrehung: hoechstens 0,5 cm daneben.
  const u = objekt('u', 'w', 'moebel', { x: 100, y: 100, breite_cm: 45, tiefe_cm: 60, drehung: 0 })
  for (const g of [90, 270]) {
    const n = objektVersetzt(u, { dxCm: 0, dyCm: 0, drehGrad: g })
    const [ax, ay] = objektMitte(u)
    const [bx, by] = objektMitte(n)
    wahr(`ungerade ${g}: hoechstens 0,5 cm`, Math.abs(bx - ax) <= 0.5 && Math.abs(by - ay) <= 0.5 && Number.isInteger(n.x))
  }
  wahr('drehungNorm', drehungNorm(-90) === 270 && drehungNorm(450) === 90 && drehungNorm(360) === 0 && drehungNorm(Number.NaN) === 0 && drehungNorm(89) === 90)
  // Raum nach dem Versetzen.
  const st = objekt('st', 'w', 'moebel', { x: 300, y: 100, breite_cm: 60, tiefe_cm: 60 })
  wahr('raumFuer: bleibt', raumFuer(wohnung.raeume, st) === 'w')
  wahr('raumFuer: ganz im Flur', raumFuer(wohnung.raeume, { ...st, x: 560, y: 60 }) === 'f')
  wahr('raumFuer: halb, Mitte im Flur', raumFuer(wohnung.raeume, { ...st, x: 480, y: 60 }) === 'f')
  wahr('raumFuer: draussen null', raumFuer(wohnung.raeume, { ...st, x: 1500, y: 60 }) === null)
  const liste = [st, objekt('x', 'w', 'moebel', { x: 50, y: 50 })]
  const neu = moebelAnwenden(liste, wohnung.raeume, [
    { id: 'st', dxCm: 100, dyCm: 0, drehGrad: 0 },
    { id: 'gibtsnicht', dxCm: 1, dyCm: 1, drehGrad: 0 },
    { id: 'st', dxCm: 280, dyCm: -30, drehGrad: 90 },
  ])
  wahr('moebelAnwenden: nur geaenderte, letzte gilt', neu.length === 1 && neu[0].id === 'st' && neu[0].drehung === 90)
  const [nx, ny] = objektMitte(neu[0])
  wahr('moebelAnwenden: Mitte und Raum', nx === 610 && ny === 100 && neu[0].raum_id === 'f', `${nx} ${ny} ${neu[0].raum_id}`)
  wahr('moebelAnwenden: Original unberuehrt', liste[0].x === 300 && liste[0].drehung === 0)
}

/* ------------------------------------------------------ 5. Zeiger */
{
  const o = { x: 0, z: 0 }
  wahr('Strahl parallel: nein', !strahlAufEbene(0, 1.64, 0, 1, 0, 0, 0.5, 100, o))
  wahr('Strahl nach oben auf tiefere Ebene: nein', !strahlAufEbene(0, 1.64, 0, 0, 1, 0, 0.5, 100, o))
  wahr('Strahl trifft', strahlAufEbene(0, 1.64, 0, 0, -1, -1, 0.64, 100, o) && Math.abs(o.z + 1) < 1e-12 && Math.abs(o.x) < 1e-12)
  wahr('Strahl zu weit: nein', !strahlAufEbene(0, 1.64, 0, 0, -0.01, -1, 0.64, 50, o))
  nahe('Zugebene: Tisch unter den Augen', zugEbeneY(0.75, 1.64), 0.75)
  nahe('Zugebene: fast auf Augenhoehe darunter', zugEbeneY(1.5, 1.64), 1.64 - ZUG_ABSTAND_M)
  nahe('Zugebene: Oberschrank darueber', zugEbeneY(1.8, 1.64), 1.64 + ZUG_ABSTAND_M)
  nahe('Zugebene: hoch oben', zugEbeneY(2.3, 1.64), 2.3)
  const b = nahBegrenzen(10, 0, 0, 0, TRAGEN_WEIT_M, { x: 0, z: 0 })
  nahe('hoechstens 6 m', Math.hypot(b.x, b.z), TRAGEN_WEIT_M, 1e-12)
  const ur = { k: 0, cx: 2, cz: 3, tx: 0, tz: 0 }
  const neu = tragFolgen(ur, 5, 2.4567, 3.0, 0.1, -0.2, 2, 3, { k: 0, cx: 0, cz: 0, tx: 0, tz: 0 })
  wahr('tragFolgen: Stufe, Mitte, ganze cm', neu.k === 1 && neu.cx === 2 && neu.cz === 3 && neu.tx === 0.56 && neu.tz === -0.2, JSON.stringify(neu))
  const weit = tragFolgen(ur, 0, 40, 3, 0, 0, 2, 3, { k: 0, cx: 0, cz: 0, tx: 0, tz: 0 })
  nahe('tragFolgen: hoechstens 6 m von den Augen', weit.tx, 6, 1e-9)
  wahr('aufCm', aufCm(0.004) === 0 && aufCm(-0.004) === 0 && Object.is(aufCm(-0.004), 0) && aufCm(1.236) === 1.24)
  wahr('aenderungAus: Ruhe null', aenderungAus('a', tragLageNeu(1, 1)) === null)
  const a = aenderungAus('a', { k: 1, cx: 1, cz: 1, tx: 0.13, tz: -0.4 })
  wahr('aenderungAus: Werte', !!a && a.dxCm === 13 && a.dyCm === -40 && a.drehGrad === 270, JSON.stringify(a))
  const nurDreh = aenderungAus('a', { k: 2, cx: 1, cz: 1, tx: 0, tz: 0 })
  wahr('aenderungAus: nur Drehung', !!nurDreh && nurDreh.dxCm === 0 && nurDreh.dyCm === 0 && nurDreh.drehGrad === 180)
}

if (fehler) {
  console.log(`${fehler} Abweichungen in ${faelle} Faellen`)
  process.exit(1)
}
console.log(`ok (${faelle} Faelle)`)
