// Prueft Fahren, Hinstellen und die Fahrzeugmodelle (E87) ohne Browser:
//  - fahren.ts: Anfahren bis zum Hoechsttempo in glaubhafter Zeit, halbes
//    Gas halbes Tempo, Bremsweg aus 50 km/h 12 bis 20 m (alle Arten),
//    Wendekreis des Autos 10 bis 12 m (Ecke aussen vorne), Lenkung mit dem
//    Tempo kleiner, rueckwaerts, keine Fahrt durch eine 30-cm-Wand mit
//    25 m/s (auch bei 10 Bildern je Sekunde und schraeg), frontal v mal
//    -0,2 und gemeldeter Stoss, Gleiten an einer Wand im Winkel von 30 Grad
//    (dreht sich zur Wand, behaelt Tempo, steckt nicht in ihr), Gas gegen
//    die Wand laesst das Tempo nicht steigen, Bordstein (oben 0,15) wird
//    ueberfahren, Bank (oben 0,45) haelt auf, zu enge Luecke: fest, wer in
//    einem Hindernis steht, kommt heraus, Raeder (Drehung aus dem Weg,
//    Ackermann vorne, hinten gerade), Hang (Neigung, Hoehe, rollt erst bei
//    steilem Hang), Kamera hinten (hinter dem Wagen, vor einer Wand naeher)
//    und vom Fahrersitz, Ein- und Aussteigen, Hindernis eines Fahrzeugs.
//  - hinstellen.ts: jeder Grund (zu_weit, schraeg, wand, besetzt, person),
//    an die Wand stellen, auf Tisch und Bank, neben dem Tisch, stapeln,
//    Raster 5 cm, Drehstufen, Punkt zum Zeigen (Maus, Mitte, Tipp).
//  - Anschluss an den Motor (E87): das Raster des Gehens (mit Oberkanten)
//    taugt zum Fahren und fuer die Kamera wie fahrHindernisse(), ein zweites
//    Raster (andere Fahrzeuge) haelt ebenso auf, fahrBoden stellt auf den
//    Hang, aussteigenSuchen (links, rechts, hinten, rundherum, nie durch eine
//    Wand, rundum zu: sitzen bleiben), strahlZiel (Boden, Tisch von oben,
//    Seite, Wand, duenner Zaun, gedreht, von der Bank aus, Hang, Treppe und
//    Rampe, kaputte Eingaben, Zeit je Strahl), Stufen sind schraeg.
//  - fahrzeug3d.ts: jede Art baut, Dreiecke (Pkw und Transporter unter 4000,
//    Feuerwehr und Bus unter 9000), Masse passen, vier Raeder auf dem Boden
//    mit Reihenfolge YXZ, Augen des Fahrers in der Kabine (im Glas, Blick
//    nach vorne frei, unten Armaturen, links Tuer, oben Himmel), Aussteigen
//    ausserhalb, geteilte Geometrie und Lacke mit Zaehler (dispose gibt nur
//    frei, was keiner mehr braucht), Blaulicht und Blinkfolge.
// Aufruf im Projektordner: node scripts/fahren-pruefen.mjs
// Ausgabe "ok" oder die abweichenden Faelle, Exit 1 bei Fehlern.
import { Box3, Mesh, Object3D, Raycaster, Vector3 } from 'three'
import {
  BORDSTEIN_M,
  EINSTEIGEN_M,
  KAMERA_HINDERNIS_M,
  aussteigenSuchen,
  fahrBoden,
  FAHR_NEIGUNG_INNEN,
  FAHRZEUG_ARTEN,
  FAHRZEUG_MASSE,
  TEILSCHRITT_FAHREN_M,
  ausstiegWelt,
  fahrErgebnis,
  fahrHindernisse,
  fahrSchritt,
  fahrWerte,
  fahrZustand,
  fahrerSicht,
  fahrzeugHindernis,
  kastenFrei,
  lageAnwenden,
  lenkGrenze,
  lokalZuWelt,
  radDrehen,
  radEinschlag,
  raederStellen,
  tempoKmh,
  tuerAbstand,
  verfolgen,
  verfolger,
  winkelDiff,
} from '../src/components/plan3d/fahren.ts'
import {
  DREH_STUFE_RAD,
  PERSON_ABSTAND_M,
  REICHWEITE_M,
  grundGier,
  hinstellenPruefen,
  stellErgebnis,
  stellRaster,
  strahlTreffer,
  strahlZiel,
  stufeDrehen,
  stufeFuer,
  tippPunkt,
  zeigePunkt,
} from '../src/components/plan3d/hinstellen.ts'
import { Hindernisse, KOERPER_RADIUS_M } from '../src/components/plan3d/kollision.ts'
import { baueFahrzeug, blaulichtAn, blinkMaske, fahrzeugVorrat } from '../src/components/plan3d/fahrzeug3d.ts'

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
function zwischen(name, ist, lo, hi) {
  if (!(ist >= lo && ist <= hi)) {
    console.log('ABWEICHUNG', name, 'ist', ist, 'soll zwischen', lo, 'und', hi)
    fehler++
  }
}

const DT = 1 / 60
const GAS = { gas: 1, lenk: 0, bremse: false }
const LEER = { gas: 0, lenk: 0, bremse: false }
const zahlen = {}

/* ================================================================ Fahren */

/* ------------------------------------------------ Werte */
for (const art of FAHRZEUG_ARTEN) {
  const w = fahrWerte(art)
  const m = FAHRZEUG_MASSE[art]
  nahe(`${art}: Hoechsttempo hoechstens 60 km/h`, w.hoechst, Math.min(m.kmh, 60) / 3.6, 1e-9)
  zwischen(`${art}: Radstand rund 0,6 x Laenge`, w.radstand / m.laenge, 0.58, 0.62)
  wahr(`${art}: Achsen im Wagen`, m.vorneZ < 0 && m.hintenZ > 0 && m.vorneZ - m.radR > -m.laenge / 2 && m.hintenZ + m.radR < m.laenge / 2)
  wahr(`${art}: Raeder in der Breite`, m.spurVorne / 2 + m.radB / 2 <= m.breite / 2 && m.spurHinten / 2 + m.radBHinten / 2 <= m.breite / 2)
}
nahe('Grenze 120: Auto bis 120', fahrWerte('auto', 120).hoechst, 120 / 3.6, 1e-9)
nahe('Grenze 120: Bus bleibt bei 80', fahrWerte('bus', 120).hoechst, 80 / 3.6, 1e-9)
nahe('kaputte Grenze: 60', fahrWerte('auto', Number.NaN).hoechst, 60 / 3.6, 1e-9)

/* ------------------------------------------------ Anfahren */
const anfahrt = {}
for (const art of FAHRZEUG_ARTEN) {
  const w = fahrWerte(art)
  const z = fahrZustand(0, 0, 0)
  let t = 0
  while (z.v < w.hoechst - 1e-6 && t < 30) {
    fahrSchritt(z, GAS, w, DT, null)
    t += DT
  }
  anfahrt[art] = t
  wahr(`${art}: erreicht Hoechsttempo`, z.v >= w.hoechst - 1e-6)
  nahe(`${art}: nicht schneller als erlaubt`, z.v, w.hoechst, 1e-6)
  wahr(`${art}: faehrt nach vorne (-z)`, z.z < -10 && Math.abs(z.x) < 1e-6)
}
zwischen('Auto 0 bis 60 km/h (s)', anfahrt.auto, 4, 8)
zwischen('Kombi 0 bis 60 km/h (s)', anfahrt.kombi, 4, 8.5)
zwischen('Polizei 0 bis 60 km/h (s)', anfahrt.polizei, 3.5, 7)
zwischen('Transporter 0 bis 60 km/h (s)', anfahrt.transporter, 6, 11)
zwischen('Feuerwehr 0 bis 60 km/h (s)', anfahrt.feuerwehr, 7, 13)
zwischen('Bus 0 bis 60 km/h (s)', anfahrt.bus, 9, 16)
zahlen.anfahrtAuto = anfahrt.auto.toFixed(1)
zahlen.anfahrtBus = anfahrt.bus.toFixed(1)
{
  const w = fahrWerte('auto')
  const z = fahrZustand(0, 0, 0)
  for (let i = 0; i < 60 * 15; i++) fahrSchritt(z, { gas: 0.5, lenk: 0, bremse: false }, w, DT, null)
  nahe('halbes Gas: halbes Hoechsttempo', z.v, w.hoechst / 2, 1e-6)
  // Ausrollen ohne Gas.
  for (let i = 0; i < 60 * 30; i++) fahrSchritt(z, LEER, w, DT, null)
  nahe('rollt ohne Gas aus', z.v, 0, 1e-9)
}

/* ------------------------------------------------ Bremsen */
const bremswege = []
for (const art of FAHRZEUG_ARTEN) {
  const w = fahrWerte(art)
  const z = fahrZustand(0, 0, 0)
  z.v = 50 / 3.6
  let t = 0
  while (z.v > 0 && t < 10) {
    fahrSchritt(z, { gas: 0, lenk: 0, bremse: true }, w, DT, null)
    t += DT
  }
  bremswege.push(-z.z)
  zwischen(`${art}: Bremsweg aus 50 km/h (m)`, -z.z, 12, 20)
  nahe(`${art}: steht nach dem Bremsen`, z.v, 0, 1e-9)
}
zahlen.bremsweg = `${Math.min(...bremswege).toFixed(1)}-${Math.max(...bremswege).toFixed(1)}`
{
  // Gas zurueck bremst erst (nicht sofort rueckwaerts).
  const w = fahrWerte('auto')
  const z = fahrZustand(0, 0, 0)
  z.v = 50 / 3.6
  fahrSchritt(z, { gas: -1, lenk: 0, bremse: false }, w, DT, null)
  wahr('zurueck bei Fahrt bremst', z.v > 0 && z.v < 50 / 3.6 - 0.1)
}

/* ------------------------------------------------ Rueckwaerts */
{
  const w = fahrWerte('auto')
  const z = fahrZustand(0, 0, 0)
  for (let i = 0; i < 60 * 6; i++) fahrSchritt(z, { gas: -1, lenk: 0, bremse: false }, w, DT, null)
  nahe('rueckwaerts hoechstens 15 km/h', z.v, -15 / 3.6, 1e-6)
  wahr('rueckwaerts faehrt nach +z', z.z > 5)
  nahe('Anzeige km/h ohne Vorzeichen', tempoKmh(z), 15, 1e-6)
  // Rueckwaerts mit Lenkung nach rechts: das Heck schwenkt nach links,
  // die Nase nach rechts (gier nimmt zu wie beim Rueckwaertseinparken).
  const r = fahrZustand(0, 0, 0)
  for (let i = 0; i < 60 * 2; i++) fahrSchritt(r, { gas: -0.5, lenk: 1, bremse: false }, w, DT, null)
  wahr('rueckwaerts rechts gelenkt: gier waechst', r.gier > 0.1)
}

/* ------------------------------------------------ Lenken und Wendekreis */
{
  const w = fahrWerte('auto')
  const z = fahrZustand(0, 0, 0)
  const ecke = { x: 0, y: 0, z: 0 }
  const punkte = []
  const mitte = []
  for (let i = 0; i < 60 * 25; i++) {
    fahrSchritt(z, { gas: 0.12, lenk: 1, bremse: false }, w, DT, null)
    if (i < 60 * 3) continue
    // Rechtskurve: aussen ist die linke vordere Ecke.
    lokalZuWelt(z, -w.breite / 2, 0, -w.laenge / 2, ecke)
    punkte.push([ecke.x, ecke.z])
    mitte.push([z.x, z.z])
  }
  const durchmesser = (p) => {
    let d = 0
    for (let i = 0; i < p.length; i += 3) for (let j = i + 1; j < p.length; j += 3) d = Math.max(d, Math.hypot(p[i][0] - p[j][0], p[i][1] - p[j][1]))
    return d
  }
  const wende = durchmesser(punkte)
  zwischen('Auto: Wendekreis (Ecke aussen, m)', wende, 10, 12)
  zwischen('Auto: Kreis der Mitte (m)', durchmesser(mitte), 7, 9.5)
  nahe('volle Lenkung langsam: 0,6 rad', z.lenk, 0.6, 1e-9)
  zahlen.wendekreis = wende.toFixed(1)
  // Rechts gelenkt dreht nach rechts: gier nimmt ab.
  const r = fahrZustand(0, 0, 0)
  for (let i = 0; i < 30; i++) fahrSchritt(r, { gas: 0.5, lenk: 1, bremse: false }, w, DT, null)
  wahr('rechts lenken: gier nimmt ab', r.gier < 0)
  // Mit Tempo weniger Einschlag, Querbeschleunigung begrenzt.
  const g50 = lenkGrenze(w, 50 / 3.6)
  zwischen('Lenkgrenze bei 50 km/h (rad)', g50, 0.05, 0.15)
  wahr('Lenkgrenze im Stand 0,6', lenkGrenze(w, 0) === 0.6)
  const q = ((50 / 3.6) ** 2 * Math.tan(g50)) / w.radstand
  wahr('Querbeschleunigung bei 50 km/h begrenzt', q <= w.querMax + 1e-6)
  const s = fahrZustand(0, 0, 0)
  s.v = 50 / 3.6
  for (let i = 0; i < 60; i++) fahrSchritt(s, { gas: 0.84, lenk: 1, bremse: false }, w, DT, null)
  wahr('schnell: Einschlag nur bis zur Grenze', Math.abs(s.lenk) <= lenkGrenze(w, s.v) + 1e-9)
  // Loslassen: Lenkung kommt zur Mitte zurueck.
  for (let i = 0; i < 30; i++) fahrSchritt(s, { gas: 0.84, lenk: 0, bremse: false }, w, DT, null)
  nahe('Lenkung zurueck zur Mitte', s.lenk, 0, 1e-9)
}

/* ------------------------------------------------ Raeder */
{
  const w = fahrWerte('auto')
  const z = fahrZustand(0, 0, 0)
  z.v = 1
  const r = fahrErgebnis()
  fahrSchritt(z, LEER, w, 0.1, null, null, r)
  nahe('Raddrehung aus dem Weg', z.radWinkel, winkelDiff(-r.weg / w.radR, 0), 1e-9)
  wahr('vorwaerts: Rad dreht rueckwaerts um x (Winkel nimmt ab)', z.radWinkel < 0)
  nahe('radDrehen ganze Umdrehung', radDrehen(0, 2 * Math.PI * 0.3, 0.3), 0, 1e-9)
  z.lenk = 0.4
  const rechts = radEinschlag(z, w, 1)
  const links = radEinschlag(z, w, -1)
  wahr('rechts lenken: Vorderraeder nach rechts (rotation.y < 0)', rechts < 0 && links < 0)
  wahr('Ackermann: inneres (rechtes) Rad mehr', Math.abs(rechts) > Math.abs(links))
  zwischen('Mittel der Raeder nahe am Einschlag', (Math.abs(rechts) + Math.abs(links)) / 2, 0.38, 0.42)
  z.lenk = -0.4
  wahr('links lenken: linkes Rad innen', Math.abs(radEinschlag(z, w, -1)) > Math.abs(radEinschlag(z, w, 1)) && radEinschlag(z, w, -1) > 0)
  z.lenk = 0
  nahe('geradeaus: kein Einschlag', radEinschlag(z, w, 1), 0, 1e-12)
  const teile = [
    { teil: { rotation: { x: 0, y: 0 }, position: { x: 0.8 } }, vorne: true },
    { teil: { rotation: { x: 0, y: 0 }, position: { x: -0.8 } }, vorne: true },
    { teil: { rotation: { x: 0, y: 9 }, position: { x: 0.8 } }, vorne: false },
  ]
  z.lenk = 0.3
  z.radWinkel = 1.25
  raederStellen(teile, z, w)
  nahe('raederStellen: Drehung x', teile[0].teil.rotation.x, 1.25)
  nahe('raederStellen: vorne rechts lenkt', teile[0].teil.rotation.y, radEinschlag(z, w, 1))
  nahe('raederStellen: vorne links lenkt', teile[1].teil.rotation.y, radEinschlag(z, w, -1))
  nahe('raederStellen: hinten gerade', teile[2].teil.rotation.y, 0)
}

/* ------------------------------------------------ Wand und Durchrutschen */
function wandProbe(dt, tempo, gier, name) {
  // Wand quer bei z = -20, 30 cm dick, 40 m lang (auch schraeg anfahren).
  const w = fahrWerte('auto', 120)
  const raster = fahrHindernisse([{ x: 0, z: -20, laenge: 400, tiefe: 0.3, drehY: 0 }])
  const z = fahrZustand(0, 0, gier)
  z.v = tempo
  const r = fahrErgebnis()
  let stoss = 0
  let stossV = null
  let tiefsteZ = Infinity
  for (let i = 0; i < Math.ceil(3 / dt); i++) {
    const vorher = z.v
    fahrSchritt(z, LEER, w, dt, raster, null, r)
    if (r.stoss > stoss) {
      stoss = r.stoss
      stossV = { vorher, nachher: z.v }
    }
    // Vorderste Stelle des Wagens (Ecken).
    for (const [lx, lz] of [[-0.9, -2.15], [0.9, -2.15], [-0.9, 2.15], [0.9, 2.15]]) {
      const p = lokalZuWelt(z, lx, 0, lz, { x: 0, y: 0, z: 0 })
      tiefsteZ = Math.min(tiefsteZ, p.z)
    }
  }
  wahr(`${name}: nicht durch die Wand`, z.z > -20)
  wahr(`${name}: steckt nicht in der Wand (Ecke ${tiefsteZ.toFixed(3)})`, tiefsteZ > -19.85 - 0.01)
  wahr(`${name}: Stoss gemeldet`, stoss > 1)
  return { z, stoss, stossV }
}
{
  const a = wandProbe(DT, 25, 0, '25 m/s, 60 Bilder')
  nahe('frontal: Stoss mit dem Tempo davor', a.stoss, a.stossV.vorher, 0.05)
  zwischen('frontal: Tempo am Ende der Anfahrt (m/s)', a.stoss, 24, 25)
  nahe('frontal: v mal -0,2', a.stossV.nachher / a.stossV.vorher, -0.2, 0.01)
  wahr('frontal: danach rueckwaerts', a.z.v <= 0)
  zahlen.stoss = a.stoss.toFixed(1)
  wandProbe(0.1, 25, 0, '25 m/s, 10 Bilder')
  wandProbe(0.1, 25, 0.5, '25 m/s schraeg, 10 Bilder')
  wandProbe(DT, 25, -0.9, '25 m/s sehr schraeg')
  wahr('Teilschritt hoechstens 8 cm', TEILSCHRITT_FAHREN_M <= 0.08)
}
{
  // Gleiten: Wand laengs bei z = -10, der Wagen kommt im Winkel von 30 Grad.
  const w = fahrWerte('auto')
  const hindernis = [{ x: 50, z: -10, laenge: 200, tiefe: 0.3, drehY: 0 }]
  const raster = fahrHindernisse(hindernis)
  const z = fahrZustand(0, 0, -Math.PI / 3)
  z.v = 12
  const r = fahrErgebnis()
  let vorStoss = 0
  let nachStoss = 0
  let stoss = 0
  let eckeMin = Infinity
  for (let i = 0; i < 60 * 4; i++) {
    const v0 = z.v
    fahrSchritt(z, GAS, w, DT, raster, null, r)
    if (r.stoss > 0 && !stoss) {
      stoss = r.stoss
      vorStoss = v0
      nachStoss = z.v
    }
    for (const [lx, lz] of [[-0.9, -2.15], [0.9, -2.15], [-0.9, 2.15], [0.9, 2.15]]) eckeMin = Math.min(eckeMin, lokalZuWelt(z, lx, 0, lz, { x: 0, y: 0, z: 0 }).z)
  }
  wahr('Gleiten: Stoss gemeldet', stoss > 1)
  zwischen('Gleiten: Tempo nach dem Stoss (Anteil)', nachStoss / vorStoss, 0.6, 0.8)
  wahr('Gleiten: weit an der Wand entlang', z.x > 25)
  nahe('Gleiten: zur Wand gedreht', winkelDiff(z.gier, -Math.PI / 2), 0, 0.05)
  wahr('Gleiten: Tempo bleibt', z.v > 8)
  wahr(`Gleiten: nie in der Wand (Ecke ${eckeMin.toFixed(3)})`, eckeMin > -9.85 - 0.01)
  wahr('Gleiten: danach frei', kastenFrei(raster, z.x, z.z, z.gier, w.laenge, w.breite))
  zahlen.gleiten = `${(nachStoss / vorStoss).toFixed(2)}`
}
{
  // Gas frontal gegen die Wand: das Tempo steigt nicht.
  const w = fahrWerte('auto')
  const raster = fahrHindernisse([{ x: 0, z: -6, laenge: 20, tiefe: 0.3, drehY: 0 }])
  const z = fahrZustand(0, 0, 0)
  let hoechst = 0
  for (let i = 0; i < 60 * 6; i++) {
    fahrSchritt(z, GAS, w, DT, raster)
    if (i > 60 * 3) hoechst = Math.max(hoechst, Math.abs(z.v))
  }
  wahr(`Gas gegen die Wand: Tempo bleibt klein (${hoechst.toFixed(2)})`, hoechst < 1)
  wahr('Gas gegen die Wand: steht davor', z.z - 2.15 > -6 + 0.15 - 0.01)
}
{
  // Bordstein und Bank.
  const w = fahrWerte('auto')
  const liste = [
    { x: 0, z: -10, laenge: 20, tiefe: 0.3, drehY: 0, oben: 0.15 },
    { x: 30, z: -10, laenge: 20, tiefe: 0.6, drehY: 0, oben: 0.45 },
  ]
  const raster = fahrHindernisse(liste)
  nahe('Raster: Bordstein nicht drin', raster.groesse, 1)
  wahr('Bordsteinhoehe 25 cm', BORDSTEIN_M === 0.25)
  const a = fahrZustand(0, 0, 0)
  const r = fahrErgebnis()
  let stossA = 0
  for (let i = 0; i < 60 * 3; i++) {
    fahrSchritt(a, GAS, w, DT, raster, null, r)
    stossA = Math.max(stossA, r.stoss)
  }
  wahr('Bordstein: drueber gefahren', a.z < -15 && stossA === 0)
  const b = fahrZustand(30, 0, 0)
  let stossB = 0
  for (let i = 0; i < 60 * 3; i++) {
    fahrSchritt(b, GAS, w, DT, raster, null, r)
    stossB = Math.max(stossB, r.stoss)
  }
  wahr('Bank: haelt auf', b.z > -10 && stossB > 1)
  // Kamera-Raster: nur hohe Dinge.
  nahe('Kamera-Raster ab 2 m: nichts', fahrHindernisse(liste, 2).groesse, 0)
  nahe('kaputte Rechtecke fallen weg', fahrHindernisse([{ x: Number.NaN, z: 0, laenge: 1, tiefe: 1, drehY: 0 }]).groesse, 0)
}
{
  // Zu enge Luecke (1,6 m fuer 1,8 m Breite): bleibt davor.
  const w = fahrWerte('auto')
  const raster = fahrHindernisse([
    { x: -1.3, z: -10, laenge: 1, tiefe: 6, drehY: 0 },
    { x: 1.3, z: -10, laenge: 1, tiefe: 6, drehY: 0 },
  ])
  const z = fahrZustand(0, 0, 0)
  const r = fahrErgebnis()
  for (let i = 0; i < 60 * 4; i++) fahrSchritt(z, GAS, w, DT, raster, null, r)
  wahr('enge Luecke: nicht hindurch', z.z > -10)
  wahr('enge Luecke: Tempo klein', Math.abs(z.v) < 1)
  // Trichter: die Luecke wird von 2,7 m auf 1,7 m enger.
  const trichter = fahrHindernisse([
    { x: -1.25, z: -6, laenge: 0.3, tiefe: 12.2, drehY: -Math.atan(0.5 / 12) },
    { x: 1.25, z: -6, laenge: 0.3, tiefe: 12.2, drehY: Math.atan(0.5 / 12) },
  ])
  const t = fahrZustand(0, 1, 0)
  for (let i = 0; i < 60 * 6; i++) fahrSchritt(t, GAS, w, DT, trichter, null, r)
  wahr('Trichter: nicht hindurch', t.z > -12)
  wahr('Trichter: steckt nicht tief', kastenFrei(trichter, t.x, t.z, t.gier, w.laenge - 0.1, w.breite - 0.1))
  wahr('Trichter: steht', Math.abs(t.v) < 1)
  // Schon eingeklemmt (so abgestellt): tiefer hinein geht nicht (fest),
  // rueckwaerts heraus schon.
  const k = fahrZustand(0, -9.3, 0)
  let fest = false
  for (let i = 0; i < 30; i++) {
    fahrSchritt(k, GAS, w, DT, trichter, null, r)
    if (r.fest) fest = true
  }
  wahr('eingeklemmt: fest gemeldet', fest)
  wahr('eingeklemmt: nicht tiefer', k.z >= -9.3 - 0.01)
  for (let i = 0; i < 60 * 3; i++) fahrSchritt(k, { gas: -1, lenk: 0, bremse: false }, w, DT, trichter, null, r)
  wahr('eingeklemmt: rueckwaerts heraus', k.z > -6)
  // Wer in einem Hindernis steht (so abgestellt), kommt heraus.
  const drin = fahrHindernisse([{ x: 0, z: 0, laenge: 3, tiefe: 3, drehY: 0 }])
  const d = fahrZustand(0, 1.2, 0)
  for (let i = 0; i < 60 * 3; i++) fahrSchritt(d, { gas: -1, lenk: 0, bremse: false }, w, DT, drin)
  wahr('aus dem Hindernis heraus', kastenFrei(drin, d.x, d.z, d.gier, w.laenge, w.breite))
}

/* ------------------------------------------------ Hang */
{
  const w = fahrWerte('auto')
  // Steigt nach vorne (-z) um 10 Prozent.
  const hang = (x, z) => 2 - 0.1 * z
  const z = fahrZustand(0, 0, 0)
  fahrSchritt(z, { gas: 0, lenk: 0, bremse: true }, w, DT, null, hang)
  nahe('Hang: Hoehe am Ursprung', z.y, hang(0, z.z), 1e-6)
  nahe('Hang: Nase hoch', z.neigung, Math.atan(0.1), 1e-6)
  nahe('Hang: nicht gekippt', z.kippen, 0, 1e-9)
  for (let i = 0; i < 60 * 3; i++) fahrSchritt(z, LEER, w, DT, null, hang)
  nahe('10 % Hang: bleibt stehen', z.v, 0, 1e-9)
  const steil = (x, zz) => -0.35 * zz
  const s = fahrZustand(0, 0, 0)
  fahrSchritt(s, { gas: 0, lenk: 0, bremse: true }, w, DT, null, steil)
  for (let i = 0; i < 60 * 2; i++) fahrSchritt(s, LEER, w, DT, null, steil)
  wahr('35 % Hang: rollt zurueck', s.v < -0.3 && s.z > 0.2)
  // Quer: rechts hoeher kippt rechts hoch (rotation.z > 0).
  const quer = (x) => 0.1 * x
  const q = fahrZustand(0, 0, 0)
  fahrSchritt(q, { gas: 0, lenk: 0, bremse: true }, w, DT, null, quer)
  nahe('quer: kippen', q.kippen, Math.atan(0.1), 1e-6)
  // lokalZuWelt passt zu three (Reihenfolge YXZ).
  const o = new Object3D()
  const zt = fahrZustand(3, -2, 0.7, 1.5)
  zt.neigung = 0.12
  zt.kippen = -0.08
  lageAnwenden(o, zt)
  wahr('lageAnwenden: Reihenfolge YXZ', o.rotation.order === 'YXZ')
  o.updateMatrixWorld(true)
  const soll = o.localToWorld(new Vector3(-0.4, 1.2, 0.3))
  const ist = lokalZuWelt(zt, -0.4, 1.2, 0.3, { x: 0, y: 0, z: 0 })
  nahe('lokalZuWelt x wie three', ist.x, soll.x, 1e-9)
  nahe('lokalZuWelt y wie three', ist.y, soll.y, 1e-9)
  nahe('lokalZuWelt z wie three', ist.z, soll.z, 1e-9)
}

/* ------------------------------------------------ Kameras, Ein- und Aussteigen */
{
  const w = fahrWerte('auto')
  const z = fahrZustand(5, 5, 0.8)
  const k = verfolger()
  verfolgen(k, z, w, DT)
  const fx = -Math.sin(z.gier)
  const fz = -Math.cos(z.gier)
  const dx = k.x - z.x
  const dz = k.z - z.z
  wahr('Kamera hinten: hinter dem Wagen', dx * fx + dz * fz < -5)
  zwischen('Kamera hinten: Abstand', Math.hypot(dx, dz), 7, 8.5)
  wahr('Kamera hinten: ueber dem Dach', k.y > w.hoehe + 1)
  wahr('Kamera hinten: schaut zum Wagen', Math.abs(winkelDiff(k.gier, z.gier)) < 0.05 && k.neigung < 0)
  // Wand 3 m hinter dem Wagen: die Kamera kommt naeher.
  const hinter = fahrHindernisse([{ x: 5 + Math.sin(0.8) * 3.5, z: 5 + Math.cos(0.8) * 3.5, laenge: 10, tiefe: 0.4, drehY: 0.8 }], 2)
  const k2 = verfolger()
  verfolgen(k2, z, w, DT, hinter)
  wahr('Kamera vor der Wand naeher', k2.abstand < 3.6)
  // Fahrersicht: Augen im Ursprung = fahrerAuge.
  const s = fahrerSicht(fahrZustand(0, 0, 0), [-0.4, 1.2, 0.1], { x: 0, y: 0, z: 0, gier: 0, neigung: 0, kippen: 0 })
  wahr('Fahrersicht: Augen', s.x === -0.4 && s.y === 1.2 && s.z === 0.1)
  nahe('Fahrersicht: leicht nach unten', s.neigung, FAHR_NEIGUNG_INNEN)
  // Tuer und Aussteigen.
  const f = { breite: 1.8, fahrerAuge: [-0.38, 1.2, 0.08], ausstieg: [-1.45, 0.08] }
  const lage = { x: 10, z: -4, gier: Math.PI / 2 }
  // gier 90 Grad: vorne ist -x, links ist +z.
  nahe('Tuer: Abstand an der Tuer', tuerAbstand(f, lage, 10 + 0.08 * Math.sin(lage.gier), -4 + 0.9), 0, 1e-6)
  wahr('Einsteigen in 3 m', EINSTEIGEN_M === 3 && tuerAbstand(f, lage, 10, -4 + 3.5) < EINSTEIGEN_M)
  const p = ausstiegWelt(f, lage, 1, { x: 0, z: 0 })
  wahr('Aussteigen links (Fahrerseite)', p.z > -4 + 1.4)
  const q = ausstiegWelt(f, lage, -1, { x: 0, z: 0 })
  wahr('Aussteigen rechts gespiegelt', q.z < -4 - 1.4)
  const h = fahrzeugHindernis({ laenge: 4.3, breite: 1.8, hoehe: 1.45 }, lage)
  wahr('Hindernis des Fahrzeugs: quer x, laengs z, Hoehe', h.laenge === 1.8 && h.tiefe === 4.3 && h.drehY === lage.gier && h.oben === 1.45)
}

/* ================================================================ Hinstellen */

const ERG = stellErgebnis()
const KISTE = { breite: 0.4, tiefe: 0.3, hoehe: 0.3 }
const boden0 = () => 0
function anfrage(treffer, extra = {}) {
  return {
    treffer,
    ding: KISTE,
    auge: { x: 0, y: 1.64, z: 0 },
    spieler: { x: 0, z: 0, boden: 0 },
    gier: 0,
    stufe: 0,
    ...extra,
  }
}
const leer = { raster: null, oben: null, boden: boden0, dinge: [] }
{
  // Boden vor einem: passt, Raster 5 cm, Vorderseite zu einem.
  const r = hinstellenPruefen(anfrage({ x: 0.43, y: 0, z: -2.02, nx: 0, ny: 1, nz: 0, art: 'boden' }), leer, ERG)
  wahr('Boden: passt', r.ok && r.grund === null)
  nahe('Boden: x auf 5 cm', r.x, 0.45, 1e-9)
  nahe('Boden: z auf 5 cm', r.z, -2.0, 1e-9)
  nahe('Boden: y', r.y, 0)
  nahe('Boden: schaut zu einem (gier pi)', Math.abs(r.gier), Math.PI, 1e-9)
  // Ohne art: aus der Normale.
  wahr('ohne art: Boden', hinstellenPruefen(anfrage({ x: 0, y: 0, z: -2, nx: 0, ny: 2, nz: 0 }), leer).ok)
}
{
  // zu_weit.
  const r = hinstellenPruefen(anfrage({ x: 0, y: 0, z: -4.4, nx: 0, ny: 1, nz: 0, art: 'boden' }), leer)
  wahr('zu weit (4,7 m von den Augen)', !r.ok && r.grund === 'zu_weit')
  const n = hinstellenPruefen(anfrage(null), leer)
  wahr('ins Leere: zu_weit mit Vorschau', !n.ok && n.grund === 'zu_weit' && Math.abs(n.z + REICHWEITE_M) < 0.03)
  wahr('Reichweite 4,5 m', REICHWEITE_M === 4.5)
}
{
  // schraeg: Normale y 0,6.
  const r = hinstellenPruefen(anfrage({ x: 0, y: 0.2, z: -2, nx: 0, ny: 0.6, nz: 0.8, art: 'boden' }), leer)
  wahr('schraeg', !r.ok && r.grund === 'schraeg')
  const g = hinstellenPruefen(anfrage({ x: 0, y: 0.2, z: -2, nx: 0, ny: 0.76, nz: 0.65, art: 'boden' }), leer)
  wahr('gerade noch flach genug (0,76)', g.ok)
}
const wandListe = [{ x: 0, z: -3, laenge: 6, tiefe: 0.2, drehY: 0 }]
const wandR = stellRaster(wandListe)
const mitWand = { raster: wandR.raster, oben: wandR.oben, boden: boden0, dinge: [] }
{
  // Auf die Wand zeigen, unten: auf den Boden davor, Rueckseite zur Wand.
  const r = hinstellenPruefen(anfrage({ x: 0.31, y: 0.5, z: -2.9, nx: 0, ny: 0, nz: 1, art: 'wand' }), mitWand)
  wahr('an die Wand: passt', r.ok)
  nahe('an die Wand: auf dem Boden', r.y, 0)
  wahr('an die Wand: davor, nicht drin', r.z - KISTE.tiefe / 2 >= -2.9 - 1e-9 && r.z - KISTE.tiefe / 2 < -2.84)
  nahe('an die Wand: Vorderseite von der Wand weg (gier pi)', Math.abs(r.gier), Math.PI, 1e-9)
  // Hoch an der Wand: wand.
  const h = hinstellenPruefen(anfrage({ x: 0, y: 1.6, z: -2.9, nx: 0, ny: 0, nz: 1, art: 'wand' }), mitWand)
  wahr('hoch an der Wand: wand', !h.ok && h.grund === 'wand')
  // Decke: wand.
  const d = hinstellenPruefen(anfrage({ x: 0, y: 2.4, z: -1, nx: 0, ny: -1, nz: 0 }), mitWand)
  wahr('Decke: wand', !d.ok && d.grund === 'wand')
  // Auf den Boden zu dicht an der Wand: der Grundriss steckt in ihr.
  const z = hinstellenPruefen(anfrage({ x: 0, y: 0, z: -2.85, nx: 0, ny: 1, nz: 0, art: 'boden' }), mitWand)
  wahr('zu dicht an der Wand: wand', !z.ok && z.grund === 'wand')
  // 15 cm vor der Wand: die Tiefe (30 cm) passt gerade, um 90 Grad gedreht
  // (Breite 40 cm quer) reicht es in die Wand.
  const g = hinstellenPruefen(anfrage({ x: 0, y: 0, z: -2.75, nx: 0, ny: 1, nz: 0, art: 'boden' }), mitWand)
  wahr('Rueckseite an der Wand: passt', g.ok)
  const g2 = hinstellenPruefen(anfrage({ x: 0, y: 0, z: -2.75, nx: 0, ny: 1, nz: 0, art: 'boden' }, { stufe: 2 }), mitWand)
  wahr('90 Grad gedreht: reicht in die Wand', !g2.ok && g2.grund === 'wand')
}
{
  // Tisch (oben 0,75) und Bank (oben 0,45): drauf ja, daneben ja, darunter nein.
  const liste = [
    { x: 0, z: -2, laenge: 1.2, tiefe: 0.8, drehY: 0, oben: 0.75 },
    { x: 2, z: -2, laenge: 1.5, tiefe: 0.4, drehY: 0.3, oben: 0.45 },
    { x: Number.NaN, z: 0, laenge: 1, tiefe: 1, drehY: 0 },
    { x: -2, z: -2, laenge: 0.4, tiefe: 0.4, drehY: 0 },
  ]
  const sr = stellRaster(liste)
  nahe('stellRaster: kaputtes Rechteck weg', sr.raster.groesse, 3)
  wahr('stellRaster: Oberkanten passen zu den Indizes', sr.oben[0] === 0.75 && sr.oben[1] === 0.45 && sr.oben[2] === Infinity)
  const u = { raster: sr.raster, oben: sr.oben, boden: boden0, dinge: [] }
  const auf = hinstellenPruefen(anfrage({ x: 0.1, y: 0.75, z: -2.1, nx: 0, ny: 1, nz: 0, art: 'oben' }), u)
  wahr('auf den Tisch: passt', auf.ok)
  nahe('auf den Tisch: Hoehe', auf.y, 0.75)
  const bank = hinstellenPruefen(anfrage({ x: 2, y: 0.45, z: -2, nx: 0, ny: 1, nz: 0, art: 'oben' }), u)
  wahr('auf die Bank: passt', bank.ok)
  const unter = hinstellenPruefen(anfrage({ x: 0.3, y: 0, z: -2.2, nx: 0, ny: 1, nz: 0, art: 'boden' }), u)
  wahr('unter den Tisch (Boden): wand', !unter.ok && unter.grund === 'wand')
  const neben = hinstellenPruefen(anfrage({ x: 0.85, y: 0, z: -2, nx: 0, ny: 1, nz: 0, art: 'boden' }), u)
  wahr('neben den Tisch: passt', neben.ok)
  // Funktion statt Feld fuer die Oberkanten.
  const fn = hinstellenPruefen(anfrage({ x: 0.1, y: 0.75, z: -2.1, nx: 0, ny: 1, nz: 0, art: 'oben' }), { ...u, oben: (i) => sr.oben[i] })
  wahr('Oberkanten als Funktion', fn.ok)
  // Ohne Oberkanten gilt alles als Wand.
  const ohne = hinstellenPruefen(anfrage({ x: 0.1, y: 0.75, z: -2.1, nx: 0, ny: 1, nz: 0, art: 'oben' }), { ...u, oben: null })
  wahr('ohne Oberkanten: wand', !ohne.ok && ohne.grund === 'wand')
  // Oberseite einer Mauer (oben 0,6), vom Aufrufer 'wand' genannt: drauf.
  const mauer = stellRaster([{ x: 0, z: -2, laenge: 3, tiefe: 0.4, drehY: 0, oben: 0.6 }])
  const m = hinstellenPruefen(anfrage({ x: 0.1, y: 0.6, z: -2, nx: 0, ny: 1, nz: 0, art: 'wand' }), { raster: mauer.raster, oben: mauer.oben, boden: boden0, dinge: [] })
  wahr('auf die Mauer (Normale nach oben): passt', m.ok && m.y === 0.6)
  // Tisch an der Seite angezeigt (unter 1,2 m): daneben auf den Boden.
  const seite = hinstellenPruefen(anfrage({ x: 0.6, y: 0.5, z: -2, nx: 1, ny: 0, nz: 0, art: 'wand' }), u)
  wahr('Seite des Tischs: daneben auf den Boden', seite.ok && seite.y === 0 && seite.x - KISTE.tiefe / 2 >= 0.6 - 1e-9)
}
{
  // Andere Dinge: besetzt, stapeln.
  const ding = { id: 'd1', x: 0, y: 0, z: -2, gier: 0, breite: 0.5, tiefe: 0.5, hoehe: 0.4 }
  const u = { raster: null, oben: null, boden: boden0, dinge: [ding] }
  const b = hinstellenPruefen(anfrage({ x: 0.2, y: 0, z: -2.3, nx: 0, ny: 1, nz: 0, art: 'boden' }), u)
  wahr('neben ein Ding, ueberlappt: besetzt', !b.ok && b.grund === 'besetzt')
  const s = hinstellenPruefen(anfrage({ x: 0.05, y: 0.4, z: -2.05, nx: 0, ny: 1, nz: 0, art: 'ding', ding: 'd1' }), u)
  wahr('stapeln: passt', s.ok)
  nahe('stapeln: auf der Oberkante', s.y, 0.4)
  const ok = hinstellenPruefen(anfrage({ x: 0.7, y: 0, z: -2, nx: 0, ny: 1, nz: 0, art: 'boden' }), u)
  wahr('mit Abstand zum Ding: passt', ok.ok)
  // Ein Ding hoch oben (auf einem Regal) stoert unten nicht.
  const hoch = { ...ding, id: 'd2', y: 1.5 }
  const unten = hinstellenPruefen(anfrage({ x: 0, y: 0, z: -2, nx: 0, ny: 1, nz: 0, art: 'boden' }), { ...u, dinge: [hoch] })
  wahr('Ding hoch darueber: passt', unten.ok)
}
{
  // person: zu nah an einem selbst und an anderen.
  const r = hinstellenPruefen(anfrage({ x: 0, y: 0, z: -0.3, nx: 0, ny: 1, nz: 0, art: 'boden' }), leer)
  wahr('zu nah an einem selbst: person', !r.ok && r.grund === 'person')
  const r2 = hinstellenPruefen(anfrage({ x: 0, y: 0, z: -0.65, nx: 0, ny: 1, nz: 0, art: 'boden' }), leer)
  wahr('mit 50 cm Abstand: passt', r2.ok)
  const r3 = hinstellenPruefen(anfrage({ x: 1, y: 0, z: -2, nx: 0, ny: 1, nz: 0, art: 'boden' }, { andere: [{ x: 1.2, z: -2.1, boden: 0 }] }), leer)
  wahr('in einen Mitspieler: person', !r3.ok && r3.grund === 'person')
  const r4 = hinstellenPruefen(anfrage({ x: 1, y: 0, z: -2, nx: 0, ny: 1, nz: 0, art: 'boden' }, { andere: [{ x: 1.2, z: -2.1, boden: 3 }] }), leer)
  wahr('Mitspieler ein Stockwerk hoeher: passt', r4.ok)
  wahr('Abstand zu Leuten 35 cm', PERSON_ABSTAND_M === 0.35)
}
{
  // Drehstufen.
  wahr('drehen +1', stufeDrehen(0, 1) === 1)
  wahr('drehen -1 von 0 ist 7', stufeDrehen(0, -1) === 7)
  wahr('drehen +1 von 7 ist 0', stufeDrehen(7, 1) === 0)
  nahe('Stufe 45 Grad', DREH_STUFE_RAD, Math.PI / 4)
  nahe('Grund gerastert: Blick 0,3 -> pi', Math.abs(grundGier(0.3)), Math.PI, 1e-9)
  nahe('Grund gerastert: Blick 0,5 -> pi + 45 Grad', winkelDiff(grundGier(0.5), Math.PI + Math.PI / 4), 0, 1e-9)
  let alle = true
  for (let s = 0; s < 8; s++) {
    const r = hinstellenPruefen(anfrage({ x: 0, y: 0, z: -2, nx: 0, ny: 1, nz: 0, art: 'boden' }, { stufe: s, gier: 0.2 }), leer)
    if (Math.abs(winkelDiff(r.gier, grundGier(0.2) + s * DREH_STUFE_RAD)) > 1e-9) alle = false
  }
  wahr('jede Stufe dreht 45 Grad weiter', alle)
  // Beim Aufheben bleibt die Drehung.
  for (const [dg, sg] of [[0.785398, 0.1], [-2.3, 1.2], [3, -0.4]]) {
    const st = stufeFuer(dg, sg)
    const g = grundGier(sg) + st * DREH_STUFE_RAD
    wahr(`stufeFuer ${dg}: Drehung bleibt (auf 22,5 Grad)`, Math.abs(winkelDiff(g, dg)) <= Math.PI / 8 + 1e-9 && st >= 0 && st < 8)
  }
}
{
  // Zeigen: Maus am Rechner, Mitte beim Ziehen und am Handy.
  const p = zeigePunkt({ touch: false, ziehen: false, maus: { x: 300, y: 100 }, breite: 800, hoehe: 400 })
  nahe('Maus: x', p.x, -0.25)
  nahe('Maus: y', p.y, 0.5)
  const z = zeigePunkt({ touch: false, ziehen: true, maus: { x: 300, y: 100 }, breite: 800, hoehe: 400 })
  wahr('beim Ziehen: Mitte', z.x === 0 && z.y === 0)
  const h = zeigePunkt({ touch: true, ziehen: false, maus: { x: 300, y: 100 }, breite: 800, hoehe: 400 })
  wahr('Handy: Mitte', h.x === 0 && h.y === 0)
  const o = zeigePunkt({ touch: false, ziehen: false, maus: null, breite: 800, hoehe: 400 })
  wahr('ohne Maus: Mitte', o.x === 0 && o.y === 0)
  const t = tippPunkt(800, 400, 800, 400)
  wahr('Tipp rechts unten', t.x === 1 && t.y === -1)
  const k = tippPunkt(5, 5, 0, 400)
  wahr('Tipp ohne Groesse: Mitte', k.x === 0 && k.y === 0)
}

/* ================================================================ Anschluss an den Motor (E87) */

/** Ein Raster wie das des Gehens (kollision.ts) aus einer Liste mit Oberkanten. */
function gehRaster(liste) {
  const h = new Hindernisse(1)
  for (const r of liste) h.dazu(r.x, r.z, r.laenge, r.tiefe, r.drehY, true, r.oben)
  h.rastern()
  return h
}
{
  // Das Raster des Gehens taugt zum Fahren: Bordstein (0,15) ueberfahren,
  // Bank (0,45) und Wand halten auf, wie mit fahrHindernisse().
  const liste = [
    { x: 0, z: -10, laenge: 6, tiefe: 0.3, drehY: 0, oben: 0.15 },
    { x: 0, z: -20, laenge: 6, tiefe: 0.4, drehY: 0, oben: 0.45 },
    { x: 8, z: -20, laenge: 6, tiefe: 0.3, drehY: 0 },
  ]
  const w = fahrWerte('auto')
  const fahrt = (raster, x) => {
    const z = fahrZustand(x, 0, 0)
    for (let i = 0; i < 60 * 8; i++) fahrSchritt(z, GAS, w, DT, raster)
    return z
  }
  const g = gehRaster(liste)
  const f = fahrHindernisse(liste)
  const a = fahrt(g, 0)
  const b = fahrt(f, 0)
  wahr('Raster des Gehens: ueber den Bordstein, vor der Bank stehen', a.z > -20 + 0.2 + 2.15 - 0.01 && a.z < -20 + 0.2 + 2.15 + 0.3)
  nahe('Raster des Gehens: wie fahrHindernisse (Bank)', a.z, b.z, 1e-9)
  const c = fahrt(g, 8)
  wahr('Raster des Gehens: Wand ohne Oberkante haelt auf', c.z > -20 + 0.15 + 2.15 - 0.01 && c.z < -20 + 0.15 + 2.15 + 0.3)
  wahr('kastenFrei mit dem Raster des Gehens: auf dem Bordstein frei, auf der Bank nicht', kastenFrei(g, 0, -10, 0, 4.3, 1.8) && !kastenFrei(g, 0, -20, 0, 4.3, 1.8))
}
{
  // Zweites Raster (dazu): die anderen Fahrzeuge halten ebenso auf.
  const w = fahrWerte('auto')
  const andere = gehRaster([fahrzeugHindernis({ laenge: 4.3, breite: 1.8, hoehe: 1.45 }, { x: 0.3, z: -15, gier: 0.2 })])
  const z = fahrZustand(0, 0, 0)
  const erg = fahrErgebnis()
  let stoss = 0
  for (let i = 0; i < 60 * 6; i++) {
    fahrSchritt(z, GAS, w, DT, null, null, erg, andere)
    stoss = Math.max(stoss, erg.stoss)
  }
  wahr('anderes Fahrzeug (dazu) haelt auf', z.z > -15 + 2.15 + 2.15 - 0.6)
  wahr('anderes Fahrzeug: Stoss gemeldet', stoss > 1)
  const o = fahrZustand(0, 0, 0)
  for (let i = 0; i < 60 * 6; i++) fahrSchritt(o, GAS, w, DT, null, null, erg, null)
  wahr('ohne dazu: faehrt durch', o.z < -30)
  wahr('kastenFrei mit dazu', !kastenFrei(gehRaster([]), 0.3, -15, 0, 4.3, 1.8, andere) && kastenFrei(gehRaster([]), 5, -15, 0, 4.3, 1.8, andere))
}
{
  // Kamera hinten mit dem Raster des Gehens: eine niedrige Mauer (1,2 m)
  // hinter dem Wagen zieht sie nicht heran, eine Wand schon.
  const w = fahrWerte('auto')
  const z = fahrZustand(5, 5, 0.8)
  const hinten = (oben) => gehRaster([{ x: 5 + Math.sin(0.8) * 3.5, z: 5 + Math.cos(0.8) * 3.5, laenge: 10, tiefe: 0.4, drehY: 0.8, oben }])
  const k1 = verfolger()
  verfolgen(k1, z, w, DT, hinten(1.2))
  const k2 = verfolger()
  verfolgen(k2, z, w, DT, hinten(undefined))
  wahr('Kamera: niedrige Mauer stoert nicht, Wand schon', k1.abstand > 7 && k2.abstand < 3.6)
  nahe('Kamera: ab 2 m Hoehe', KAMERA_HINDERNIS_M, 2)
}
{
  // fahrBoden: am Hang Hoehe, Neigung und Kippen, ohne zu bewegen.
  const w = fahrWerte('auto')
  const z = fahrZustand(3, -4, 0)
  fahrBoden(z, w, (x, zz) => 0.1 * -zz + 0.05 * x)
  wahr('fahrBoden: Nase hoch am Hang nach -z', z.neigung > 0.09 && z.neigung < 0.11)
  wahr('fahrBoden: rechts hoeher (x steigt)', z.kippen > 0.04 && z.kippen < 0.06)
  nahe('fahrBoden: Hoehe am Ursprung', z.y, 0.1 * 4 + 0.05 * 3, 0.02)
  wahr('fahrBoden: Stelle bleibt', z.x === 3 && z.z === -4 && z.v === 0)
}
{
  // Aussteigen suchen: links, rechts, hinten, rundherum, nie durch die Wand.
  const f = { laenge: 4.3, breite: 1.8, fahrerAuge: [-0.38, 1.2, 0.08], ausstieg: [-1.45, 0.08] }
  const lage = { x: 0, z: 0, gier: 0 }
  const R = KOERPER_RADIUS_M
  const mit = (liste) => {
    const g = gehRaster(liste)
    const auto = gehRaster([fahrzeugHindernis({ ...f, hoehe: 1.45 }, lage)])
    const s = { x: 0, z: 0 }
    return {
      frei: (x, z) => g.frei(x, z, R, 0, auto),
      weg: (x0, z0, x1, z1) => {
        s.x = x0
        s.z = z0
        g.bewegen(s, x1 - x0, z1 - z0, R, 0)
        return Math.hypot(s.x - x1, s.z - z1) < 0.05
      },
    }
  }
  const p = { x: 0, z: 0 }
  let m = mit([])
  wahr('Aussteigen frei: links (Fahrerseite)', aussteigenSuchen(f, lage, m.frei, m.weg, p) && p.x < -1.3 && Math.abs(p.z - 0.08) < 0.01)
  // Wand dicht an der Fahrerseite.
  m = mit([{ x: -1.05, z: 0, laenge: 0.2, tiefe: 8, drehY: 0 }])
  wahr('Wand links: rechts aussteigen', aussteigenSuchen(f, lage, m.frei, m.weg, p) && p.x > 1.3)
  // Enge Garage: links und rechts Wand, hinten offen.
  m = mit([
    { x: -1.05, z: 0, laenge: 0.2, tiefe: 8, drehY: 0 },
    { x: 1.05, z: 0, laenge: 0.2, tiefe: 8, drehY: 0 },
    { x: 0, z: -2.5, laenge: 2.3, tiefe: 0.2, drehY: 0 },
  ])
  wahr('enge Garage: hinter dem Wagen', aussteigenSuchen(f, lage, m.frei, m.weg, p) && p.z > 2.15 + 0.3 && Math.abs(p.x) < 0.01)
  // Rundum zu: man bleibt sitzen.
  m = mit([
    { x: -1.05, z: 0, laenge: 0.2, tiefe: 5, drehY: 0 },
    { x: 1.05, z: 0, laenge: 0.2, tiefe: 5, drehY: 0 },
    { x: 0, z: -2.4, laenge: 2.3, tiefe: 0.2, drehY: 0 },
    { x: 0, z: 2.4, laenge: 2.3, tiefe: 0.2, drehY: 0 },
  ])
  wahr('rundum zu: kein Platz (sitzen bleiben)', !aussteigenSuchen(f, lage, m.frei, m.weg, p))
  // Links Wand am Wagen, rechts eine Mauer 30 cm daneben, vorne und hinten
  // Hecken: nie hinter die Mauer (durch sie hindurch).
  m = mit([
    { x: -1.05, z: 0, laenge: 0.2, tiefe: 12, drehY: 0 },
    { x: 1.4, z: 0, laenge: 0.2, tiefe: 12, drehY: 0 },
    { x: 0.2, z: -2.6, laenge: 2.6, tiefe: 0.2, drehY: 0 },
  ])
  const ok = aussteigenSuchen(f, lage, m.frei, m.weg, p)
  wahr('nie durch eine Wand: hinter dem Wagen statt jenseits der Mauer', ok && p.x > -0.95 && p.x < 1.3 && p.z > 2.15, JSON.stringify(p))
}
{
  // strahlZiel: Boden, Tisch, Wand, Hang, Treppe, Rampe, duenner Zaun.
  const tr = strahlTreffer()
  const eben = { raster: null, boden: () => 0 }
  wahr('strahlZiel: Boden', strahlZiel(0, 1.6, 0, 0, -1, -1, 10, eben, tr) && tr.art === 'boden' && Math.abs(tr.y) < 1e-6 && Math.abs(tr.z + 1.6) < 1e-3 && tr.ny === 1)
  nahe('strahlZiel: Abstand', tr.abstand, Math.hypot(1.6, 1.6), 1e-3)
  wahr('strahlZiel: zu kurz fuer den Boden', !strahlZiel(0, 1.6, 0, 0, -1, -1, 2, eben, tr))
  wahr('strahlZiel: in den Himmel', !strahlZiel(0, 1.6, 0, 0, 1, -1, 10, eben, tr))
  const tisch = gehRaster([
    { x: 0, z: -2, laenge: 1.2, tiefe: 0.8, drehY: 0, oben: 0.75 },
    { x: 0, z: -5, laenge: 6, tiefe: 0.2, drehY: 0 },
    { x: 3, z: -2, laenge: 0.05, tiefe: 3, drehY: 0, oben: 1.0 },
  ])
  const mitTisch = { raster: tisch, boden: () => 0 }
  wahr('strahlZiel: von oben auf den Tisch', strahlZiel(0, 1.6, 0, 0, -0.85, -2, 10, mitTisch, tr) && tr.art === 'oben' && Math.abs(tr.y - 0.75) < 1e-6 && tr.ny === 1)
  wahr('strahlZiel: Seite des Tischs (Normale +z)', strahlZiel(0, 0.5, 0, 0, 0, -1, 10, mitTisch, tr) && tr.art === 'wand' && Math.abs(tr.z + 1.6) < 1e-6 && tr.nz === 1 && tr.ny === 0)
  wahr('strahlZiel: Wand hinten (Normale +z)', strahlZiel(0.9, 1.6, 0, 0, 0, -1, 10, mitTisch, tr) && tr.art === 'wand' && Math.abs(tr.z + 4.9) < 1e-6 && tr.nz === 1)
  wahr('strahlZiel: duenner Zaun (5 cm) seitlich (Normale -x)', strahlZiel(0, 0.5, -2, 1, 0, 0, 10, mitTisch, tr) && tr.art === 'wand' && Math.abs(tr.x - 2.975) < 1e-6 && tr.nx === -1)
  wahr('strahlZiel: ueber den Zaun hinweg', !strahlZiel(0, 1.5, -2, 1, 0, 0, 10, { raster: tisch, boden: () => -5 }, tr))
  // Gedrehte Wand: Normale zeigt zur Kamera.
  const schraeg = gehRaster([{ x: 0, z: -3, laenge: 6, tiefe: 0.2, drehY: 0.5 }])
  wahr('strahlZiel: gedrehte Wand, Normale wie drehY', strahlZiel(0, 1, 0, 0, 0, -1, 10, { raster: schraeg, boden: () => 0 }, tr) && Math.abs(tr.nx - Math.sin(0.5)) < 1e-9 && Math.abs(tr.nz - Math.cos(0.5)) < 1e-9)
  // Im Rechteck beginnen (man steht auf der Bank): zaehlt nicht.
  const bank = gehRaster([{ x: 0, z: 0, laenge: 2, tiefe: 2, drehY: 0, oben: 0.45 }])
  wahr('strahlZiel: von der Bank aus auf ihre Oberseite', strahlZiel(0, 2.1, 0, 0, -1, -0.3, 10, { raster: bank, boden: () => 0 }, tr) && tr.art === 'oben' && Math.abs(tr.y - 0.45) < 1e-6)
  // Hang: Normale aus dem Gelaende.
  const hang = { raster: null, boden: (x) => 0.5 * x }
  wahr('strahlZiel: Hang, Normale aus dem Gelaende', strahlZiel(0, 2, 0, 0, -1, 0, 10, hang, tr) && Math.abs(tr.nx + 0.5 / Math.hypot(0.5, 1)) < 1e-6 && Math.abs(tr.ny - 1 / Math.hypot(0.5, 1)) < 1e-6)
  // Treppe und Rampe.
  const treppe = (stufig) => ({
    raster: null,
    boden: () => 0,
    flaeche: (x, z, o) => {
      if (Math.abs(x) > 0.6 || z > -1 || z < -4) return false
      o.y = (-1 - z) * 0.4
      o.stufig = stufig
      return true
    },
  })
  wahr('strahlZiel: Stufen sind treppe', strahlZiel(0, 2, 0, 0, -0.3, -1, 10, treppe(true), tr) && tr.art === 'treppe' && tr.z < -1)
  wahr('strahlZiel: Rampe ist boden (Normale geneigt)', strahlZiel(0, 2, 0, 0, -0.3, -1, 10, treppe(false), tr) && tr.art === 'boden' && tr.nz > 0.3 && tr.ny > 0.9)
  const t = hinstellenPruefen(anfrage({ x: 0, y: 0.4, z: -2, nx: 0, ny: 1, nz: 0, art: 'treppe' }), leer)
  wahr('Stufen einer Treppe: schraeg', !t.ok && t.grund === 'schraeg')
  // Kaputte Eingaben.
  wahr('strahlZiel: Richtung 0', !strahlZiel(0, 1, 0, 0, 0, 0, 10, eben, tr))
  wahr('strahlZiel: Ursprung NaN', !strahlZiel(Number.NaN, 1, 0, 0, -1, 0, 10, eben, tr))
  // Viele Strahlen schnell.
  const t0 = performance.now()
  let n = 0
  for (let i = 0; i < 20000; i++) {
    const a = (i * 0.37) % (Math.PI * 2)
    if (strahlZiel(0, 1.6, -1, Math.sin(a), -0.4, Math.cos(a), 4.6, mitTisch, tr)) n++
  }
  const us = ((performance.now() - t0) / 20000) * 1000
  zahlen.strahl = us.toFixed(1)
  wahr(`strahlZiel unter 30 us je Strahl (${us.toFixed(1)})`, us < 30 && n > 0)
}

/* ================================================================ Modelle */

function dreiecke(objekt) {
  let n = 0
  objekt.traverse((o) => {
    if (o instanceof Mesh) n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3
  })
  return n
}
const PKW = new Set(['auto', 'kombi', 'transporter', 'rettung', 'polizei'])
const dreieckeJe = {}
const warnung = console.warn
for (const art of FAHRZEUG_ARTEN) {
  const f = baueFahrzeug(art, '#3366aa', `t-${art}`, { x: 0, z: 0, gier: 0, ebene: 'boden' })
  const m = FAHRZEUG_MASSE[art]
  f.gruppe.updateMatrixWorld(true)
  const n = dreiecke(f.gruppe)
  dreieckeJe[art] = n
  if (PKW.has(art)) wahr(`${art}: hoechstens 4000 Dreiecke (${n})`, n <= 4000)
  else wahr(`${art}: hoechstens 9000 Dreiecke (${n})`, n <= 9000)
  wahr(`${art}: Masse aus der Tabelle`, f.laenge === m.laenge && f.breite === m.breite && f.hoehe === m.hoehe && f.hoechstKmh === m.kmh)
  wahr(`${art}: Kennung am Modell`, f.gruppe.userData.fahrzeug === `t-${art}`)
  // Alles innerhalb der Masse (Spiegel bis 25 cm seitlich).
  const box = new Box3()
  let kaputt = false
  f.gruppe.traverse((o) => {
    if (!(o instanceof Mesh)) return
    const pos = o.geometry.attributes.position
    for (let i = 0; i < pos.count; i++) if (!Number.isFinite(pos.getX(i) + pos.getY(i) + pos.getZ(i))) kaputt = true
    box.expandByObject(o)
  })
  wahr(`${art}: keine kaputten Zahlen`, !kaputt)
  wahr(`${art}: Breite (mit Spiegeln) ${box.min.x.toFixed(2)}..${box.max.x.toFixed(2)}`, box.min.x >= -m.breite / 2 - 0.25 && box.max.x <= m.breite / 2 + 0.25)
  wahr(`${art}: Laenge ${box.min.z.toFixed(3)}..${box.max.z.toFixed(3)}`, box.min.z >= -m.laenge / 2 - 0.03 && box.max.z <= m.laenge / 2 + 0.03)
  wahr(`${art}: Hoehe ${box.min.y.toFixed(3)}..${box.max.y.toFixed(3)}`, box.min.y >= -0.03 && box.max.y <= m.hoehe + 0.01 && box.max.y >= m.hoehe - 0.15)
  // Raeder.
  wahr(`${art}: vier Raeder`, f.raeder.length === 4)
  wahr(`${art}: zwei vorne, zwei hinten`, f.raeder.filter((r) => r.vorne).length === 2)
  for (const r of f.raeder) {
    const t = r.teil
    wahr(`${art}: Rad mit Reihenfolge YXZ`, t.rotation.order === 'YXZ')
    wahr(`${art}: Rad vorne/hinten passt`, r.vorne === t.position.z < 0)
    const rb = new Box3().setFromObject(t)
    nahe(`${art}: Rad steht auf dem Boden`, rb.min.y, 0, 0.012)
    nahe(`${art}: Radius wie die Physik`, (rb.max.y - rb.min.y) / 2, m.radR, 0.012)
    wahr(`${art}: Rad im Wagen`, Math.abs(t.position.x) + 0.05 < m.breite / 2 && rb.max.x <= m.breite / 2 + 0.001 && rb.min.x >= -m.breite / 2 - 0.001)
  }
  // Ein Rad gedreht bleibt ein Rad auf seiner Achse.
  const rad = f.raeder[0].teil
  rad.rotation.x = 1.1
  rad.rotation.y = -0.3
  rad.updateMatrixWorld(true)
  const rb2 = new Box3().setFromObject(rad, true)
  nahe(`${art}: gedrehtes Rad bleibt auf dem Boden`, rb2.min.y, 0, 0.03)
  rad.rotation.set(0, 0, 0)
  rad.updateMatrixWorld(true)

  // Augen des Fahrers: links, im Glas (ueber der Guertellinie, unter dem Dach).
  const [ax, ay, az] = f.fahrerAuge
  const glas = f.gruppe.children.find((o) => o.name === 'glas')
  wahr(`${art}: Glas da`, !!glas)
  const gb = new Box3().setFromObject(glas)
  wahr(`${art}: Fahrer links`, ax < -0.2)
  wahr(`${art}: Augen im Glas (x)`, ax > gb.min.x + 0.15 && ax < gb.max.x - 0.15)
  wahr(`${art}: Augen im Glas (y ${ay} in ${gb.min.y.toFixed(2)}..${gb.max.y.toFixed(2)})`, ay > gb.min.y + 0.15 && ay < gb.max.y - 0.08)
  wahr(`${art}: Augen im Glas (z)`, az > gb.min.z + 0.3 && az < gb.max.z - 0.1)
  // Blick vom Fahrersitz (Strahlen gegen Lack und Teile, Glas zaehlt nicht).
  const fest = f.gruppe.children.filter((o) => o instanceof Mesh && (o.name === 'lack' || o.name === 'teile'))
  const strahl = new Raycaster()
  const auge = new Vector3(ax, ay, az)
  const blick = (gier, neigung, weit) => {
    const d = new Vector3(-Math.sin(gier) * Math.cos(neigung), Math.sin(neigung), -Math.cos(gier) * Math.cos(neigung))
    strahl.set(auge, d)
    strahl.far = weit
    const t = strahl.intersectObjects(fest, false)
    return t.length ? t[0] : null
  }
  wahr(`${art}: nach vorne frei`, blick(0, FAHR_NEIGUNG_INNEN, 30) === null)
  const tiefer = blick(0, FAHR_NEIGUNG_INNEN - 0.17, 30)
  wahr(`${art}: 10 Grad tiefer frei oder die Haube`, tiefer === null || (tiefer.object.name === 'lack' && tiefer.distance > 1))
  const unten = blick(0, -0.65, 1.5)
  wahr(`${art}: vorne unten Armaturen oder Lenkrad`, unten !== null && unten.object.name === 'teile')
  const tuer = blick(Math.PI / 2, -1.1, 1.5)
  wahr(`${art}: links unten Tuer innen verkleidet`, tuer !== null && tuer.object.name === 'teile')
  const himmel = blick(0, Math.PI / 2 - 0.01, 1)
  wahr(`${art}: oben Himmel oder Dach`, himmel !== null)
  // Lenkrad: ein Treffer der Teile knapp unter dem Blick, vor den Augen.
  let lenkradDa = false
  for (let n = -0.2; n >= -0.75 && !lenkradDa; n -= 0.02) {
    const t = blick(0, n, 0.9)
    if (t && t.object.name === 'teile' && t.distance < 0.9) lenkradDa = true
  }
  wahr(`${art}: Lenkrad oder Armaturen vor einem`, lenkradDa)
  // Aussteigen ausserhalb (Koerper mit 23 cm Radius frei von allem).
  const [sx, sz] = f.ausstieg
  wahr(`${art}: Aussteigen links aussen (${sx})`, -sx - 0.23 > -box.min.x)
  wahr(`${art}: Aussteigen auf Hoehe der Kabine`, Math.abs(sz - az) < 0.5)
  // Blaulicht.
  const blau = art === 'feuerwehr' || art === 'rettung' || art === 'polizei'
  const hatBlaulicht = typeof f.blaulicht === 'function'
  wahr(`${art}: Blaulicht ${blau ? 'da' : 'nicht da'}`, hatBlaulicht === blau)
  if (blau) {
    const lichter = f.gruppe.children.filter((o) => o.name === 'blaulicht')
    wahr(`${art}: zwei Blaulichtgruppen`, lichter.length === 2 && lichter[0].material !== lichter[1].material)
    const kam = new Object3D()
    kam.position.set(0, 2, 10)
    kam.updateMatrixWorld(true)
    const a = lichter.find((o) => o.frustumCulled === false)
    wahr(`${art}: Blaulicht A wird immer gezeichnet`, !!a)
    a.onBeforeRender(null, null, kam)
    wahr(`${art}: aus: dunkel`, lichter.every((o) => o.material.emissiveIntensity === 0))
    f.blaulicht(true)
    wahr(`${art}: blaulichtAn`, blaulichtAn(f))
    const vor = blinkMaske(performance.now())
    a.onBeforeRender(null, null, kam)
    const nach = blinkMaske(performance.now())
    const ia = lichter[0].material === a.material ? 0 : 1
    const an = (lichter[ia].material.emissiveIntensity > 0 ? 1 : 0) | (lichter[1 - ia].material.emissiveIntensity > 0 ? 2 : 0)
    wahr(`${art}: an: blinkt nach der Folge`, an === vor || an === nach)
    f.blaulicht(false)
    a.onBeforeRender(null, null, kam)
    wahr(`${art}: wieder aus`, !blaulichtAn(f) && lichter.every((o) => o.material.emissiveIntensity === 0))
  } else {
    wahr(`${art}: ohne Blaulicht nie an`, !blaulichtAn(f))
  }
  f.dispose()
}
zahlen.dreiecke = Object.entries(dreieckeJe)
  .map(([a, n]) => `${a} ${n}`)
  .join(', ')
{
  // Blinkfolge: nie beide, je zweimal je Runde.
  let beide = false
  let a = 0
  let b = 0
  let vorher = 0
  for (let t = 0; t < 600; t++) {
    const m = blinkMaske(t)
    if (m === 3) beide = true
    if (m === 1 && vorher !== 1) a++
    if (m === 2 && vorher !== 2) b++
    vorher = m
  }
  wahr('Blinkfolge: nie beide zugleich', !beide)
  wahr('Blinkfolge: A und B je zweimal', a === 2 && b === 2)
  wahr('Blinkfolge: wiederholt sich', blinkMaske(30) === blinkMaske(630) && blinkMaske(-570) === blinkMaske(30))
}
{
  // Geteilte Geometrie und Lacke mit Zaehler.
  const vorher = fahrzeugVorrat()
  const a = baueFahrzeug('auto', '#aa3333', 'a', { x: 0, z: 0, gier: 0, ebene: 'b' })
  const b = baueFahrzeug('auto', '#AA3333', 'b', { x: 5, z: 0, gier: 0, ebene: 'b', y: 1.5 })
  const c = baueFahrzeug('auto', '#33aa33', 'c', { x: 10, z: 0, gier: 1, ebene: 'b' })
  const lack = (f) => f.gruppe.children.find((o) => o.name === 'lack')
  wahr('gleiche Art: gleiche Geometrie', lack(a).geometry === lack(b).geometry && lack(a).geometry === lack(c).geometry)
  wahr('gleiche Farbe (Gross/klein egal): gleicher Lack', lack(a).material === lack(b).material)
  wahr('andere Farbe: anderer Lack', lack(a).material !== lack(c).material)
  nahe('Hoehe aus der Lage', b.gruppe.position.y, 1.5)
  nahe('Drehung aus der Lage', c.gruppe.rotation.y, 1)
  let frei = 0
  lack(a).geometry.addEventListener('dispose', () => frei++)
  let lackFrei = 0
  lack(c).material.addEventListener('dispose', () => lackFrei++)
  const eltern = new Object3D()
  eltern.add(a.gruppe)
  a.dispose()
  a.dispose()
  wahr('dispose nimmt aus der Szene', eltern.children.length === 0)
  wahr('dispose: geteilte Geometrie bleibt fuer die anderen', frei === 0)
  c.dispose()
  wahr('dispose: Lack, den keiner mehr braucht, ist frei', lackFrei === 1)
  b.dispose()
  wahr('dispose: letzte des Typs gibt die Geometrie frei', frei === 1)
  const nachher = fahrzeugVorrat()
  wahr('Vorrat wieder wie vorher', nachher.arten === vorher.arten && nachher.lacke === vorher.lacke)
  // Feste Farben der Einsatzfahrzeuge; kaputte Farbe und Art mit Warnung.
  const meldungen = []
  console.warn = (...x) => meldungen.push(x.join(' '))
  const p = baueFahrzeug('polizei', '#000000', 'p', { x: 0, z: 0, gier: 0, ebene: 'b' })
  const k = baueFahrzeug('auto', 'rot', 'k', { x: 0, z: 0, gier: 0, ebene: 'b' })
  const u = baueFahrzeug('rakete', '#123456', 'u', { x: 0, z: 0, gier: 0, ebene: 'b' })
  console.warn = warnung
  wahr('Polizei bleibt weiss', lack(p).material.color.getHexString() !== '000000')
  wahr('kaputte Farbe: Warnung und Silber', meldungen.some((m) => m.includes('rot')) && lack(k).material.color.getHexString() === lack(k).material.color.getHexString())
  wahr('unbekannte Art: Warnung, ein Auto', u.art === 'auto' && meldungen.some((m) => m.includes('rakete')))
  for (const f of [p, k, u]) f.dispose()
  wahr('alles wieder frei', fahrzeugVorrat().arten === vorher.arten && fahrzeugVorrat().lacke === vorher.lacke)
}

console.log(
  fehler
    ? `Fehler: ${fehler}`
    : `ok (0-60 km/h Auto ${zahlen.anfahrtAuto} s, Bus ${zahlen.anfahrtBus} s; Bremsweg aus 50 km/h ${zahlen.bremsweg} m; Wendekreis Auto ${zahlen.wendekreis} m; Stoss ${zahlen.stoss} m/s; Gleiten behaelt ${zahlen.gleiten}; strahlZiel ${zahlen.strahl} us; Dreiecke: ${zahlen.dreiecke})`,
)
process.exit(fehler ? 1 : 0)
