// Prueft den Koerper beim Begehen in der Hoehe (E87): src/components/plan3d/
// physik.ts zusammen mit kollision.ts, ohne Browser und ohne three.
//   Sprung: Hoehe, Dauer, Aufprall, kein zweiter Sprung, gleich bei 30,
//     60 und 120 Bildern je Sekunde, Kopf an der Decke.
//   Stufen: hinauf und hinunter bis STUFE_M, weiter hinunter faellt man.
//   Auge: am Boden geglaettet (Stufe, Knicke des Gelaendes im 25-m-Gitter),
//     in der Luft genau, Einsinken beim Landen.
//   Hindernisse mit Oberkante: Bordstein, Bank, Mauer, Wand; hinaufspringen,
//     oben stehen, hinuntergehen und fallen.
//   Treppen: Achsen wie im Vertrag, Hoehe, Betreten nur ueber die Kanten von
//     und nach, Gelaender, Verlassen auf die andere Ebene, gedreht, nach
//     unten, mehrere, rennend, mit Tasten und Knueppel, Ebenen, die es (noch)
//     nicht gibt, kaputte Angaben.
//   Treppe unter einer Stelle (Treppen.unter, E87: Zielen beim Hinstellen).
//   Zweites Raster beim Gehen (E87, abgestellte Fahrzeuge): haelt auf,
//     gleiten, frei, herausdruecken, darueber frei, leer wie ohne.
//   Ebenen.aktualisieren: nur neue Raster, Identitaet bleibt, Gelaende.
//   Leistung: 40 000 Hindernisse auf dem Gelaende rastern (Ziel hoechstens
//     60 ms) und darin gehen (Ziel hoechstens 0,3 ms je Bild).
// Alle Orte, Haeuser und Zahlen sind erfunden.
// Aufruf im Projektordner: node scripts/physik-pruefen.mjs
// Ausgabe "ok" (mit den Messwerten) oder die abweichenden Faelle, Exit 1 bei Fehlern.
import { Ebenen, Hindernisse, KOERPER_RADIUS_M, STAND_R_M } from '../src/components/plan3d/kollision.ts'
import {
  AUGE_TAU_S,
  augeFolgen,
  delle,
  DELLE_MAX_M,
  DELLE_S,
  delleTiefe,
  grundAn,
  HUPF_M_S,
  hupfenStart,
  KOPF_M,
  SCHWERE_M_S2,
  senkrechtNeu,
  senkrechtSchritt,
  senkrechtSetzen,
  treppeAnteil,
  treppeAusgang,
  treppeHoehe,
  treppeKlemmen,
  treppeKreuzt,
  treppeLokal,
  Treppen,
  treppeWelt,
} from '../src/components/plan3d/physik.ts'
import { STUFE_M } from '../src/components/plan3d/vertrag3d.ts'
/** Hoehe des Gelaendes an (x, z) in Metern, bilinear zwischen den Gitterpunkten
 *  (hier im Skript, die Siedlung mit stadt.ts ist aus Magazino entfernt). */
function gelaendeHoehe(g, x, z) {
  const { x0, z0, schritt, nx, nz, dm } = g
  if (!(nx >= 1 && nz >= 1 && schritt > 0) || dm.length < nx * nz) return 0
  const fx = Math.min(Math.max((x - x0) / schritt, 0), nx - 1)
  const fz = Math.min(Math.max((z - z0) / schritt, 0), nz - 1)
  const i = Math.min(Math.floor(fx), Math.max(nx - 2, 0))
  const j = Math.min(Math.floor(fz), Math.max(nz - 2, 0))
  const tx = nx > 1 ? fx - i : 0
  const tz = nz > 1 ? fz - j : 0
  const w = (a, b) => dm[Math.min(b, nz - 1) * nx + Math.min(a, nx - 1)] / 10
  const a = w(i, j) * (1 - tx) + w(i + 1, j) * tx
  const b = w(i, j + 1) * (1 - tx) + w(i + 1, j + 1) * tx
  return a * (1 - tz) + b * tz
}

let fehler = 0
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
const messung = []

const R = KOERPER_RADIUS_M
const SCHEITEL = (HUPF_M_S * HUPF_M_S) / (2 * SCHWERE_M_S2)
const FLUG = (2 * HUPF_M_S) / SCHWERE_M_S2

/* ======================================================= Sprung und Fall */

nahe('Vertrag: Stufe 35 cm', STUFE_M, 0.35)
nahe('Sprung gut 0,7 m hoch', SCHEITEL, 0.7053, 1e-3)

/** Ein Sprung auf ebenem Boden bei fps Bildern je Sekunde: hoechste Stelle,
 *  Bilder in der Luft, Aufprall. */
function sprung(fps, grund = 0, decke = Infinity) {
  const s = senkrechtNeu(grund)
  const dt = 1 / fps
  wahr(`${fps} fps: Absprung vom Boden`, hupfenStart(s))
  let hoch = s.fuss
  let bilder = 0
  let aufprall = 0
  let zweiter = false
  let unter = false
  while (s.luft && bilder < 10 * fps) {
    senkrechtSchritt(s, grund, dt, decke)
    bilder++
    hoch = Math.max(hoch, s.fuss)
    if (s.fuss < grund - 1e-12) unter = true
    if (s.luft && hupfenStart(s)) zweiter = true
    if (s.aufprall > 0) aufprall = s.aufprall
  }
  return { hoch: hoch - grund, zeit: bilder / fps, aufprall, zweiter, unter, s }
}
for (const fps of [30, 60, 120]) {
  const r = sprung(fps)
  nahe(`${fps} fps: Scheitel`, r.hoch, SCHEITEL, 0.012)
  nahe(`${fps} fps: Flugzeit`, r.zeit, FLUG, 1 / fps + 1e-9)
  nahe(`${fps} fps: Aufprall wie Absprung`, r.aufprall, HUPF_M_S, 1e-9)
  wahr(`${fps} fps: kein zweiter Sprung in der Luft`, !r.zweiter)
  wahr(`${fps} fps: nie unter dem Boden`, !r.unter)
  wahr(`${fps} fps: steht danach`, !r.s.luft && r.s.fuss === 0 && r.s.vy === 0)
}
{
  // Laengstes Bild im Motor (0,1 s): landet trotzdem genau auf dem Boden.
  const r = sprung(10, 2.5)
  wahr('0,1 s je Bild: landet auf dem Boden', !r.unter && r.s.fuss === 2.5 && !r.s.luft)
  // Wieder springen geht nach der Landung.
  wahr('nach der Landung wieder springen', hupfenStart(r.s))
}
{
  // Kopf an der Decke: die Fuesse bleiben unter deckeFuss.
  const r = sprung(60, 0, 0.4)
  wahr('Decke: Fuesse hoechstens 0,4', r.hoch <= 0.4 + 1e-9)
  wahr('Decke: landet wieder', !r.s.luft && r.s.fuss === 0)
  // Unter einer Decke, die tiefer liegt als der Boden (auf einem Tisch): der Boden gilt.
  const s = senkrechtNeu(0.75)
  senkrechtSchritt(s, 0.75, 1 / 60, 0.7)
  wahr('Decke unter dem Boden: steht auf dem Boden', s.fuss === 0.75 && !s.luft)
  // Raum 2,5 m hoch: am Boden ganz springen (Kopf bei gut 2,45 m), vom Tisch
  // (75 cm) nicht mehr hinauf.
  nahe('Kopf 1,75 m ueber den Fuessen', KOPF_M, 1.75)
  const r2 = sprung(60, 0, 2.5 - KOPF_M)
  nahe('Raum 2,5 m: am Boden voller Sprung', r2.hoch, SCHEITEL, 0.012)
  const r3 = sprung(60, 0.75, 2.5 - KOPF_M)
  wahr('Raum 2,5 m: vom Tisch nicht hoeher', r3.hoch <= 1e-9 && !r3.s.luft && r3.s.fuss === 0.75)
}
{
  // Kaputte Zahlen aendern nichts und werfen nicht.
  const s = senkrechtNeu(1)
  senkrechtSchritt(s, NaN, 1 / 60)
  wahr('Boden NaN: bleibt', s.fuss === 1 && !s.luft)
  senkrechtSchritt(s, 1, NaN)
  wahr('dt NaN am Boden: steht', s.fuss === 1 && !s.luft)
  senkrechtSetzen(s, NaN)
  wahr('setzen NaN: 0', s.fuss === 0)
}

/* ------------------------------------------------------------- Stufen */
{
  const s = senkrechtNeu(0)
  senkrechtSchritt(s, 0.3, 1 / 60)
  wahr('Stufe 30 cm hinauf: sofort oben, am Boden', s.fuss === 0.3 && !s.luft)
  senkrechtSchritt(s, 0, 1 / 60)
  wahr('30 cm hinunter: am Boden mit', s.fuss === 0 && !s.luft)
  senkrechtSchritt(s, -STUFE_M, 1 / 60)
  wahr('genau STUFE_M hinunter: am Boden mit', s.fuss === -STUFE_M && !s.luft)
  senkrechtSetzen(s, 0.6)
  senkrechtSchritt(s, 0, 1 / 60)
  wahr('60 cm hinunter: faellt', s.luft && s.fuss < 0.6 && s.fuss > 0)
  let t = 1 / 60
  while (s.luft && t < 2) {
    senkrechtSchritt(s, 0, 1 / 60)
    t += 1 / 60
  }
  nahe('60 cm Fall dauert sqrt(2h/g)', t, Math.sqrt((2 * 0.6) / SCHWERE_M_S2), 1 / 60 + 1e-9)
  wahr('nach dem Fall am Boden', s.fuss === 0 && !s.luft)
  // Steigend in einen hoeheren Boden (Mauer beim Sprung): steht oben, ohne Aufprall.
  const m = senkrechtNeu(0)
  hupfenStart(m)
  senkrechtSchritt(m, 0, 1 / 60)
  senkrechtSchritt(m, 0.6, 1 / 60)
  wahr('steigend auf die Mauer: steht oben', m.fuss === 0.6 && !m.luft && m.aufprall === 0)
}

/* ---------------------------------------------------------------- Auge */
{
  // Stufe 30 cm am Boden: das Auge folgt weich, ohne Ueberschwingen.
  let auge = 0
  let fuss = 0
  const verlauf = []
  for (let i = 0; i < 60; i++) {
    const vorher = fuss
    fuss = 0.3
    auge = augeFolgen(auge, vorher, fuss, 1 / 60, false)
    verlauf.push(auge)
  }
  wahr('Stufe: erstes Bild noch unten', verlauf[0] < 0.3 * 0.3)
  wahr('Stufe: nie ueber der Stufe, stetig steigend', verlauf.every((a, i) => a <= 0.3 + 1e-12 && (i === 0 || a >= verlauf[i - 1])))
  nahe('Stufe: nach 0,35 s fast oben (5 Zeitkonstanten)', verlauf[20], 0.3, 0.3 * Math.exp(-0.35 / AUGE_TAU_S) + 1e-3)
  nahe('Stufe: nach 1 s genau oben', verlauf[59], 0.3, 1e-9)
  // Starr (Luft, Aufzug): das Auge geht genau mit, ein Rest klingt ab.
  let a = 1
  a = augeFolgen(a, 1, 1.5, 1 / 60, true)
  nahe('starr: geht genau mit', a, 1.5)
  a = augeFolgen(1.2, 1, 1.5, 1 / 60, true)
  nahe('starr: Rest klingt ab', a, 1.5 + 0.2 * Math.exp(-1 / 60 / AUGE_TAU_S), 1e-9)
  // Kaputt: springt auf das Ziel.
  nahe('Auge NaN: aufs Ziel', augeFolgen(NaN, 0, 2, 1 / 60, false), 2)
  nahe('Ziel NaN: bleibt', augeFolgen(1, 0, NaN, 1 / 60, false), 1)
}
{
  // Gelaende im Gitter von 25 m (erfunden): Huegel und Mulden bis 8 m, dazu
  // Unebenheiten bis 1,6 m je Gitterpunkt (Steigung bis etwa 15 %). Gehend
  // ueber die Gitterlinien knickt die Hoehe der Fuesse; das Auge glaettet die
  // Knicke und bleibt dicht an den Fuessen (Abstand hoechstens Steigung mal
  // Tempo mal AUGE_TAU_S).
  const nx = 9
  const nz = 9
  const dm = []
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) dm.push(Math.round(80 * Math.sin(i * 0.3) * Math.cos(j * 0.25) + 4 * ((i * 7 + j * 3) % 5)))
  const g = { x0: -100, z0: -100, schritt: 25, nx, nz, dm }
  let fuss = gelaendeHoehe(g, -90, -60)
  let auge = fuss
  const roh = []
  const glatt = []
  let maxAbstand = 0
  for (let i = 0; i < 60 * 60; i++) {
    const t = i / 60
    const x = -90 + 2.8 * t
    const z = -60 + 1.1 * t
    const vorher = fuss
    fuss = gelaendeHoehe(g, x, z)
    auge = augeFolgen(auge, vorher, fuss, 1 / 60, false)
    roh.push(fuss)
    glatt.push(auge)
    maxAbstand = Math.max(maxAbstand, Math.abs(auge - fuss))
  }
  const knick = (f) => {
    let m = 0
    for (let i = 2; i < f.length; i++) m = Math.max(m, Math.abs(f[i] - 2 * f[i - 1] + f[i - 2]))
    return m
  }
  const kRoh = knick(roh)
  const kGlatt = knick(glatt)
  wahr('Gelaende: die Fuesse knicken an den Gitterlinien', kRoh > 1e-4)
  wahr(`Gelaende: das Auge knickt hoechstens ein Viertel so stark (${(kGlatt / kRoh).toFixed(3)})`, kGlatt < kRoh / 4)
  wahr(`Gelaende: das Auge bleibt dicht an den Fuessen (${(maxAbstand * 100).toFixed(1)} cm)`, maxAbstand < 0.03)
  messung.push(`Gelaende: Knick der Augenhoehe ${(kGlatt / kRoh).toFixed(3)} des rohen, hoechstens ${(maxAbstand * 100).toFixed(1)} cm hinter den Fuessen`)
}
{
  // Einsinken beim Landen.
  nahe('Delle: Sprung aus dem Stand', delleTiefe(HUPF_M_S), DELLE_MAX_M, 1e-9)
  nahe('Delle: sanft gelandet keine', delleTiefe(0.8), 0)
  nahe('Delle: am Anfang 0', delle(0, 0.09), 0)
  nahe('Delle: in der Mitte am tiefsten', delle(DELLE_S / 2, 0.09), -0.09, 1e-12)
  nahe('Delle: danach 0', delle(DELLE_S, 0.09), 0)
  nahe('Delle: ohne Tiefe 0', delle(0.1, 0), 0)
  let tiefste = 0
  for (let t = 0; t <= DELLE_S; t += 0.001) tiefste = Math.min(tiefste, delle(t, 0.09))
  wahr('Delle: nie tiefer als die Tiefe', tiefste >= -0.09 - 1e-12)
}

/* ================================================ Hindernisse mit Oberkante */
{
  const h = new Hindernisse()
  const BORD = h.dazu(0, -3, 10, 0.3, 0, true, 0.15)
  const BANK = h.dazu(0, 0, 1.6, 0.5, 0, true, 0.45)
  const MAUER = h.dazu(0, 3, 10, 0.3, 0, true, 0.6)
  const WAND = h.dazu(0, 6, 10, 0.3, 0)
  const KAPUTT = h.dazu(0, 9, 10, 0.3, 0, true, NaN)
  const MINUS = h.dazu(0, 12, 10, 0.3, 0, true, -1)
  h.rastern()
  nahe('Oberkante: Bordstein', h.ob[BORD], 0.15)
  nahe('Oberkante: Mauer', h.ob[MAUER], 0.6)
  wahr('Oberkante: Wand ohne Angabe unendlich', h.ob[WAND] === Infinity)
  wahr('Oberkante: NaN zaehlt als Wand', h.ob[KAPUTT] === Infinity)
  nahe('Oberkante: unter 0 zaehlt als 0', h.ob[MINUS], 0)
  wahr('Bordstein haelt nicht auf', h.frei(0, -3, R))
  wahr('Bank haelt am Boden auf', !h.frei(0, 0, R))
  wahr('Bank haelt nicht auf, wenn die Fuesse 15 cm hoch sind', h.frei(0, 0, R, 0.15))
  wahr('Mauer haelt auf bis 25 cm Fusshoehe', !h.frei(0, 3, R, 0.24) && h.frei(0, 3, R, 0.26))
  for (const f of [0, 1, 100, NaN, Infinity, -Infinity]) wahr(`Wand haelt immer auf (Fuesse ${f})`, !h.frei(0, 6, R, f))
  wahr('NaN-Oberkante haelt auf wie eine Wand', !h.frei(0, 9, R, 5))
  nahe('stand: auf dem Bordstein', h.stand(0, -3, 0), 0.15)
  nahe('stand: neben dem Bordstein (Mitte 11 cm daneben) nicht', h.stand(0, -3 + 0.15 + STAND_R_M + 0.01, 0), 0)
  nahe('stand: am Boden nicht auf der Bank', h.stand(0, 0, 0), 0)
  nahe('stand: mit 20 cm Fusshoehe auf der Bank', h.stand(0, 0, 0.2), 0.45)
  nahe('stand: nie auf einer Wand', h.stand(0, 6, 1e5), 0)
  nahe('stand: mit sehr hohen Fuessen alles Endliche', h.stand(0, 3, 1e5), 0.6)
  h.aktiv(BANK, false)
  nahe('stand: ausgeschaltet zaehlt nicht', h.stand(0, 0, 0.2), 0)
}

/** Ein Laeufer wie im Motor (gehSchritt und hoeheSchritt in motor.ts, in
 *  derselben Reihenfolge): waagrecht auf der Ebene oder der Treppe, dann
 *  Treppe betreten oder verlassen, dann die Hoehe und das Auge. */
class Laeufer {
  constructor(eb, tr, ebene, x, z) {
    this.eb = eb
    this.tr = tr
    this.p = { x, z }
    eb.wechseln(ebene)
    this.boden = eb.boden()
    this.s = senkrechtNeu(grundAn(eb, eb.index, this.boden, x, z, this.boden))
    this.auge = this.s.fuss
    this.treppe = -1
    this.wechsel = []
    this.decke = Infinity
    this.groessterSprung = 0
  }
  fussUeber() {
    return this.s.fuss - (this.boden + this.eb.gelaende(this.eb.index, this.p.x, this.p.z))
  }
  schritt(vx, vz, dt) {
    const p = this.p
    const x0 = p.x
    const z0 = p.z
    let aus = 0
    if (this.treppe >= 0) aus = this.tr.gehen(this.treppe, p, vx * dt, vz * dt, R)
    else {
      this.eb.aktiv.bewegen(p, vx * dt, vz * dt, R, this.fussUeber())
      const t = this.tr.betreten(this.eb.index, x0, z0, p, R)
      if (t >= 0) this.treppe = t
    }
    if (aus !== 0) {
      const t = this.treppe
      this.treppe = -1
      const ziel = aus > 0 ? this.tr.nach[t] : this.tr.von[t]
      this.eb.wechseln(ziel)
      this.eb.aktiv.herausdruecken(p, R, 0)
      this.boden = this.eb.boden()
      this.wechsel.push(ziel)
    }
    const vorher = this.s.fuss
    if (this.treppe >= 0) senkrechtSetzen(this.s, this.tr.hoehe(this.treppe, p, this.eb))
    else {
      const g = grundAn(this.eb, this.eb.index, this.boden, p.x, p.z, this.s.fuss)
      senkrechtSchritt(this.s, g, dt, this.decke)
      if (this.s.aufprall > 0) this.eb.aktiv.herausdruecken(p, R, this.fussUeber())
    }
    if (!this.s.luft) this.groessterSprung = Math.max(this.groessterSprung, Math.abs(this.s.fuss - vorher))
    this.auge = augeFolgen(this.auge, vorher, this.s.fuss, dt, this.s.luft)
  }
  /** Mit Tempo v (m/s) zum Punkt (x, z) gehen, hoechstens sek Sekunden. */
  gehe(x, z, v = 1.4, sek = 30, dt = 1 / 60) {
    for (let t = 0; t < sek; t += dt) {
      const dx = x - this.p.x
      const dz = z - this.p.z
      const l = Math.hypot(dx, dz)
      if (l < 0.02) return true
      const w = Math.min(v, l / dt)
      this.schritt((dx / l) * w, (dz / l) * w, dt)
    }
    return false
  }
  /** Knueppel: Richtung (x, z) mit Staerke, n Bilder. */
  knueppel(x, z, staerke, bilder, dt = 1 / 60) {
    const l = Math.hypot(x, z)
    for (let i = 0; i < bilder; i++) this.schritt((x / l) * 1.4 * staerke, (z / l) * 1.4 * staerke, dt)
  }
}

/* ------------------------------------- Auf eine Mauer springen und herunter */
{
  const wohnung = new Hindernisse()
  wohnung.rastern()
  const eb = new Ebenen(wohnung)
  eb.wohnungFertig()
  eb.setzen([
    {
      id: 'hof',
      name: 'Hof',
      y: 0,
      hindernisse: [
        { x: 0, z: 0, laenge: 8, tiefe: 0.3, drehY: 0, oben: 0.6 },
        { x: 0, z: 4, laenge: 8, tiefe: 0.3, drehY: 0, oben: 1.2 },
        { x: 20, z: 0, laenge: 8, tiefe: 0.3, drehY: 0, oben: 1.0 },
        { x: 40, z: 0, laenge: 8, tiefe: 0.3, drehY: 0, oben: 1.1 },
        { x: 60, z: 0, laenge: 8, tiefe: 0.3, drehY: 0, oben: 0.3 },
      ],
    },
  ])
  const tr = new Treppen()
  tr.setzen([], eb)
  const l = new Laeufer(eb, tr, 0, 0, -2)
  // Gegen die Mauer (60 cm) gehen: haelt auf.
  l.gehe(0, 2, 1.4, 3)
  nahe('Mauer 60 cm: haelt am Boden auf', l.p.z, -0.15 - R, 2e-3)
  nahe('Mauer 60 cm: Fuesse am Boden', l.s.fuss, 0)
  // Springen und dabei weiter gegen die Mauer: oben stehen.
  wahr('Mauer: abspringen', hupfenStart(l.s))
  for (let i = 0; i < 60 && (l.s.luft || l.s.fuss === 0); i++) l.schritt(0, 1.4, 1 / 60)
  nahe('Mauer: steht oben', l.s.fuss, 0.6)
  wahr('Mauer: am Boden (nicht in der Luft)', !l.s.luft)
  wahr('Mauer: Mitte auf der Mauer', Math.abs(l.p.z) <= 0.15 + STAND_R_M + 1e-9)
  // Oben entlang (laengs der Mauer) bleibt man oben.
  for (let i = 0; i < 60; i++) l.schritt(1.4, 0, 1 / 60)
  wahr('Mauer: oben entlang bleibt oben', l.s.fuss === 0.6 && !l.s.luft && l.p.x > 1.3)
  // Oben weiter: hinunter auf der anderen Seite (faellt, landet, nicht in der Mauer).
  let geflogen = false
  for (let i = 0; i < 60; i++) {
    l.schritt(0, 1.4, 1 / 60)
    if (l.s.luft) geflogen = true
  }
  wahr('Mauer: auf der anderen Seite hinunter gefallen', geflogen && !l.s.luft && l.s.fuss === 0)
  wahr('Mauer: danach nicht in der Mauer', eb.aktiv.frei(l.p.x, l.p.z, R))
  // Vor der hohen Mauer (1,2 m): springen hilft nicht.
  l.gehe(0, 3.5, 1.4, 3)
  hupfenStart(l.s)
  let hoechste = 0
  for (let i = 0; i < 60; i++) {
    l.schritt(0, 1.4, 1 / 60)
    hoechste = Math.max(hoechste, l.s.fuss)
  }
  wahr('Mauer 1,2 m: kommt nicht hinauf', l.s.fuss === 0 && hoechste < 1.2 && l.p.z < 4 - 0.15 - R + 2e-3)
  // 1,0 m geht mit Sprung, 1,1 m nicht (Scheitel 0,705 plus STUFE_M).
  for (const [x, oben, soll] of [
    [20, 1.0, true],
    [40, 1.1, false],
  ]) {
    const m = new Laeufer(eb, tr, 0, x, -1)
    m.gehe(x, -0.4, 1.4, 3)
    hupfenStart(m.s)
    let oberste = 0
    for (let i = 0; i < 60; i++) {
      m.schritt(0, 1.4, 1 / 60)
      if (!m.s.luft) oberste = Math.max(oberste, m.s.fuss)
    }
    wahr(`Mauer ${oben} m: ${soll ? 'oben gestanden' : 'nie oben'}`, soll ? oberste === oben : oberste === 0)
  }
  // 30 cm (unter STUFE_M): einfach hinauf und wieder hinunter, ohne Sprung und ohne Fall.
  const n = new Laeufer(eb, tr, 0, 60, -1)
  let luft = false
  for (let i = 0; i < 90; i++) {
    n.schritt(0, 1.4, 1 / 60)
    if (n.s.luft) luft = true
    if (Math.abs(n.p.z) < 0.1) nahe('Stufe 30 cm: oben beim Darueber', n.s.fuss, 0.3)
  }
  wahr('Stufe 30 cm: hinueber ohne Sprung', n.p.z > 0.5 && !luft && n.s.fuss === 0)
}

/* ================================================================ Treppen */

/* Erfundenes Haus an erfundenem Hang. Ebenen: Gelaende (mit Hoehe), EG
 * (Boden 0,5), OG (3,5), Keller (-2,5). Treppen: Schwelle vom Gelaende ins
 * EG (gedreht), Treppe EG -> OG (anders gedreht), Kellertreppe EG -> Keller
 * (nach unten), eine Treppe zu einer Ebene, die es noch nicht gibt. */
const HANG = { x0: -60, z0: -60, schritt: 25, nx: 6, nz: 6, dm: [] }
for (let j = 0; j < 6; j++) for (let i = 0; i < 6; i++) HANG.dm.push(i * 3 + j * 2)
const hang = (x, z) => gelaendeHoehe(HANG, x, z)
function hausWelt() {
  return [
    { id: 'gelaende', name: 'Gelaende', y: 0, hindernisse: [], hoehe: hang },
    { id: 'h:0', name: 'EG', y: 0.5, hindernisse: [{ x: 30, z: 30, laenge: 2, tiefe: 2, drehY: 0 }] },
    { id: 'h:1', name: 'OG', y: 3.5, hindernisse: [] },
    { id: 'h:-1', name: 'Keller', y: -2.5, hindernisse: [] },
  ]
}
const SCHWELLE = { id: 's', x: 2, z: 3, laenge: 1.5, breite: 1.4, drehY: 0.6, von: 'gelaende', nach: 'h:0', stufen: 2 }
const INNEN = { id: 'i', x: 10, z: 10, laenge: 5, breite: 1.2, drehY: 2.1, von: 'h:0', nach: 'h:1', stufen: 16 }
const KELLER = { id: 'k', x: -10, z: 8, laenge: 4, breite: 1, drehY: -0.4, von: 'h:0', nach: 'h:-1', stufen: 14 }
const ZU = { id: 'z', x: 20, z: -10, laenge: 2, breite: 1.2, drehY: 0, von: 'gelaende', nach: 'nachbar:0', stufen: 3 }
const KAPUTT = [
  { id: 'n', x: NaN, z: 0, laenge: 1, breite: 1, drehY: 0, von: 'gelaende', nach: 'h:0', stufen: 1 },
  { id: 'l', x: 0, z: 0, laenge: 0, breite: 1, drehY: 0, von: 'gelaende', nach: 'h:0', stufen: 1 },
  { id: 'v', x: 0, z: 0, laenge: 1, breite: 1, drehY: 0, nach: 'h:0', stufen: 1 },
  null,
]
function hausAufbauen() {
  const wohnung = new Hindernisse()
  wohnung.rastern()
  const eb = new Ebenen(wohnung)
  eb.wohnungFertig()
  eb.setzen(hausWelt())
  const tr = new Treppen()
  tr.setzen([SCHWELLE, INNEN, KELLER, ZU, ...KAPUTT], eb)
  return { eb, tr }
}
const G = 0
const EG = 1
const OG = 2
const KE = 3

/* Achsen und Hoehe. */
{
  const lage = { u: 0, v: 0 }
  const st = { x: 0, z: 0 }
  let rund = 0
  let vertrag = 0
  let s = 777
  const zufall = () => {
    s = (s * 1103515245 + 12345) % 2147483648
    return s / 2147483648
  }
  for (let k = 0; k < 500; k++) {
    const t = { x: zufall() * 40 - 20, z: zufall() * 40 - 20, laenge: 1 + zufall() * 6, breite: 0.5 + zufall() * 2, drehY: zufall() * 14 - 7 }
    const u = zufall() * 10 - 5
    const v = zufall() * 4 - 2
    treppeWelt(t, u, v, st)
    // Vertrag: (x + u cos d + v sin d, z - u sin d + v cos d).
    vertrag = Math.max(vertrag, Math.hypot(st.x - (t.x + u * Math.cos(t.drehY) + v * Math.sin(t.drehY)), st.z - (t.z - u * Math.sin(t.drehY) + v * Math.cos(t.drehY))))
    treppeLokal(t, st.x, st.z, lage)
    rund = Math.max(rund, Math.abs(lage.u - u), Math.abs(lage.v - v))
  }
  wahr('Treppe: Welt wie im Vertrag', vertrag < 1e-9)
  wahr('Treppe: lokal ist die Umkehrung', rund < 1e-9)
  const t = { x: 0, z: 0, laenge: 4, breite: 1, drehY: 0.3 }
  nahe('Hoehe an der Kante von', treppeHoehe(t, -2, 0.2, 3.2), 0.2)
  nahe('Hoehe an der Kante nach', treppeHoehe(t, 2, 0.2, 3.2), 3.2)
  nahe('Hoehe in der Mitte', treppeHoehe(t, 0, 0.2, 3.2), 1.7)
  nahe('Hoehe davor bleibt unten', treppeHoehe(t, -3, 0.2, 3.2), 0.2)
  nahe('Hoehe dahinter bleibt oben', treppeHoehe(t, 5, 0.2, 3.2), 3.2)
  nahe('nach unten: Mitte', treppeHoehe(t, 0, 0.5, -2.5), -1)
  nahe('Anteil', treppeAnteil(t, 1), 0.75)
  wahr('kreuzt von aussen ueber die Kante von', treppeKreuzt(t, -2.1, 0, -1.9, 0.1, -1))
  wahr('kreuzt nicht von innen nach aussen', !treppeKreuzt(t, -1.9, 0, -2.1, 0, -1))
  wahr('kreuzt nicht neben der Breite', !treppeKreuzt(t, -2.1, 0.6, -1.9, 0.6, -1))
  wahr('kreuzt nicht ueber die Seite', !treppeKreuzt(t, 0, 0.7, 0, 0.3, -1) && !treppeKreuzt(t, 0, 0.7, 0, 0.3, 1))
  wahr('kreuzt die Kante nach von vorne', treppeKreuzt(t, 2.2, -0.2, 1.8, -0.2, 1))
  wahr('Kante nach zaehlt nicht fuer von', !treppeKreuzt(t, 2.2, -0.2, 1.8, -0.2, -1))
  nahe('Gelaender: halbe Breite weniger Radius', treppeKlemmen(t, 0.49, R), 0.5 - R, 1e-12)
  nahe('Gelaender: andere Seite', treppeKlemmen(t, -9, R), -(0.5 - R), 1e-12)
  nahe('Gelaender: schmaler als der Koerper: Mitte', treppeKlemmen({ ...t, breite: 0.3 }, 0.1, R), 0)
  wahr('Ausgang: vorne, hinten, drauf', treppeAusgang(t, 2.01) === 1 && treppeAusgang(t, -2.01) === -1 && treppeAusgang(t, 2) === 0)
}

/* E87: Treppe unter einer Stelle (Zielen beim Hinstellen). */
{
  const { eb, tr } = hausAufbauen()
  const st = { x: 0, z: 0 }
  treppeWelt(INNEN, 1, 0.3, st)
  wahr('unter: Treppe EG -> OG vom EG aus', tr.unter(EG, st.x, st.z) === 1)
  wahr('unter: dieselbe vom OG aus', tr.unter(OG, st.x, st.z) === 1)
  wahr('unter: nicht vom Gelaende aus (schliesst dort nicht an)', tr.unter(G, st.x, st.z) === -1)
  treppeWelt(INNEN, 1, 0.7, st)
  wahr('unter: neben der Breite keine', tr.unter(EG, st.x, st.z) === -1)
  treppeWelt(INNEN, 2.6, 0, st)
  wahr('unter: hinter der Kante keine', tr.unter(EG, st.x, st.z) === -1)
  treppeWelt(ZU, 0, 0, st)
  wahr('unter: zu (Ebene fehlt) keine', tr.unter(G, st.x, st.z) === -1)
  wahr('unter: ohne Ebene (-1) keine', tr.unter(-1, 10, 10) === -1)
  treppeWelt(INNEN, 0, 0, st)
  nahe('unter: Hoehe in der Mitte', tr.hoehe(tr.unter(EG, st.x, st.z), st, eb), (0.5 + 3.5) / 2, 1e-9)
}

/* E87: ein zweites Raster (abgestellte Fahrzeuge) haelt beim Gehen ebenso auf. */
{
  const ebene = new Hindernisse()
  ebene.dazu(0, -6, 10, 0.3, 0)
  ebene.rastern()
  const fz = new Hindernisse(4)
  // Ein Auto quer vor einem (Breite 1,8 entlang x, Laenge 4,3 entlang z), oben 1,45.
  fz.dazu(0, -3, 4.3, 1.8, 0, true, 1.45)
  fz.rastern()
  const p = { x: 0, z: 0 }
  ebene.bewegen(p, 0, -5, R, 0, fz)
  nahe('dazu: vor dem Auto stehen geblieben', p.z, -3 + 0.9 + R, 2e-3)
  const q = { x: 0, z: 0 }
  ebene.bewegen(q, 0, -7, R, 0, null)
  nahe('ohne dazu: bis zur Wand', q.z, -6 + 0.15 + R, 2e-3)
  // Schraeg dagegen: am Auto entlang gleiten.
  const s = { x: 0, z: 0 }
  ebene.bewegen(s, -3, -3, R, 0, fz)
  wahr('dazu: gleitet am Auto entlang, nie hinein', s.x < -2.3 && ebene.frei(s.x, s.z, R, 0, fz))
  wahr('frei mit dazu', !ebene.frei(0, -3, R, 0, fz) && ebene.frei(0, -3, R, 0, null) && ebene.frei(4, -3, R, 0, fz))
  const d = { x: 0.2, z: -3.1 }
  const rest = ebene.herausdruecken(d, R, 0, fz)
  wahr('herausdruecken mit dazu: aus dem Auto heraus', rest === 0 && ebene.frei(d.x, d.z, R, 0, fz))
  // Auf dem Auto (Fuesse 1,5 m hoch) haelt es nicht auf, ein leeres dazu stoert nicht.
  wahr('dazu: hoch darueber frei', ebene.frei(0, -3, R, 1.5, fz))
  const leer = new Hindernisse(4)
  leer.rastern()
  const l = { x: 0, z: 0 }
  ebene.bewegen(l, 0, -7, R, 0, leer)
  nahe('leeres dazu wie ohne', l.z, q.z, 1e-12)
}

/* Treppen einer Welt: kaputte fallen weg, Ebenen ueber die Kennung. */
{
  const { eb, tr } = hausAufbauen()
  wahr('Treppen: vier gute, vier kaputte', tr.liste.length === 4 && tr.verworfen === 4)
  wahr('Treppen: Ebenen ueber die Kennung', tr.von[0] === G && tr.nach[0] === EG && tr.von[1] === EG && tr.nach[1] === OG && tr.nach[2] === KE)
  wahr('Treppen: Ebene fehlt -> zu', tr.nach[3] === -1)
  wahr('Treppen: Index ueber Kennung', tr.index('i') === 1 && tr.index('weg') === -1)
  // Leer und Unsinn: keine Treppen, kein Fehler.
  const leer = new Treppen()
  leer.setzen(undefined, eb)
  wahr('Treppen: ohne Angabe keine', leer.liste.length === 0 && leer.betreten(0, 0, 0, { x: 1, z: 1 }, R) === -1)
  leer.setzen('kaputt', eb)
  wahr('Treppen: kein Feld keine', leer.liste.length === 0)
}

/** Stelle auf Treppe t bei (u, v), als { x, z }. */
function auf(t, u, v) {
  return treppeWelt(t, u, v, { x: 0, z: 0 })
}

/* Schwelle: vom Hang ueber die Kante von ins EG, gedreht. */
{
  const { eb, tr } = hausAufbauen()
  const vor = auf(SCHWELLE, -SCHWELLE.laenge / 2 - 1.5, 0.3)
  const l = new Laeufer(eb, tr, G, vor.x, vor.z)
  nahe('Schwelle: vorher auf dem Hang', l.s.fuss, hang(vor.x, vor.z), 1e-9)
  const ziel = auf(SCHWELLE, SCHWELLE.laenge / 2 + 1, 0.3)
  let drauf = false
  let maxSchritt = 0
  let vorher = l.s.fuss
  const dt = 1 / 60
  for (let t = 0; t < 6; t += dt) {
    const dx = ziel.x - l.p.x
    const dz = ziel.z - l.p.z
    const d = Math.hypot(dx, dz)
    if (d < 0.02) break
    const w = Math.min(1.4, d / dt)
    l.schritt((dx / d) * w, (dz / d) * w, dt)
    if (l.treppe === 0) drauf = true
    maxSchritt = Math.max(maxSchritt, Math.abs(l.s.fuss - vorher))
    vorher = l.s.fuss
  }
  wahr('Schwelle: betreten', drauf)
  wahr('Schwelle: verlassen ins EG', l.treppe === -1 && eb.index === EG && l.wechsel.join() === String(EG))
  nahe('Schwelle: Fuesse auf dem Boden des EG', l.s.fuss, 0.5, 1e-9)
  wahr(`Schwelle: Fuesse ohne Sprung (hoechstens ${(maxSchritt * 100).toFixed(1)} cm je Bild)`, maxSchritt < 0.06)
  // Zurueck: im EG ueber die Kante nach, hinaus auf den Hang.
  l.gehe(vor.x, vor.z, 1.4, 8)
  wahr('Schwelle zurueck: auf dem Hang', eb.index === G && l.treppe === -1)
  nahe('Schwelle zurueck: Fuesse auf dem Hang', l.s.fuss, hang(l.p.x, l.p.z), 1e-9)
}

/* Von der Seite und von der falschen Ebene kommt man nicht auf die Treppe. */
{
  const { eb, tr } = hausAufbauen()
  const seite = auf(SCHWELLE, 0, 2)
  const l = new Laeufer(eb, tr, G, seite.x, seite.z)
  const gegen = auf(SCHWELLE, 0, -2)
  l.gehe(gegen.x, gegen.z, 1.4, 4)
  wahr('von der Seite: nicht auf der Treppe', l.treppe === -1 && eb.index === G && l.wechsel.length === 0)
  // Im OG ueber die Kante von der Innentreppe (die gehoert zum EG): nichts.
  const vorVon = auf(INNEN, -INNEN.laenge / 2 - 1, 0)
  const m = new Laeufer(eb, tr, OG, vorVon.x, vorVon.z)
  const drin = auf(INNEN, 0, 0)
  m.gehe(drin.x, drin.z, 1.4, 4)
  wahr('falsche Ebene: nicht auf der Treppe', m.treppe === -1 && eb.index === OG)
  // Treppe zu einer Ebene, die es nicht gibt: zu.
  const vorZu = auf(ZU, -ZU.laenge / 2 - 1, 0)
  const n = new Laeufer(eb, tr, G, vorZu.x, vorZu.z)
  const hinter = auf(ZU, ZU.laenge / 2 + 1, 0)
  n.gehe(hinter.x, hinter.z, 1.4, 4)
  wahr('Ebene fehlt: Treppe zu', n.treppe === -1 && n.wechsel.length === 0 && eb.index === G)
}

/* Innentreppe EG -> OG und zurueck, mit Gelaender. */
{
  const { eb, tr } = hausAufbauen()
  const vor = auf(INNEN, -INNEN.laenge / 2 - 0.8, 0)
  const l = new Laeufer(eb, tr, EG, vor.x, vor.z)
  // Schraeg hinein und schraeg weiter: das Gelaender haelt.
  const schraeg = auf(INNEN, INNEN.laenge / 2 + 0.6, 3)
  let maxV = 0
  const lage = { u: 0, v: 0 }
  let hoehen = []
  for (let t = 0; t < 10 && eb.index === EG; t += 1 / 60) {
    const dx = schraeg.x - l.p.x
    const dz = schraeg.z - l.p.z
    const d = Math.hypot(dx, dz)
    if (d < 0.02) break
    l.schritt((dx / d) * 1.4, (dz / d) * 1.4, 1 / 60)
    if (l.treppe >= 0) {
      treppeLokal(INNEN, l.p.x, l.p.z, lage)
      maxV = Math.max(maxV, Math.abs(lage.v))
      hoehen.push(l.s.fuss)
    }
  }
  wahr('Innentreppe: oben im OG', eb.index === OG && l.treppe === -1)
  nahe('Innentreppe: Fuesse im OG', l.s.fuss, 3.5, 1e-9)
  wahr(`Innentreppe: Gelaender haelt (|v| hoechstens ${maxV.toFixed(3)})`, maxV <= INNEN.breite / 2 - R + 1e-9)
  wahr('Innentreppe: Hoehe steigt stetig', hoehen.length > 10 && hoehen.every((h, i) => i === 0 || (h >= hoehen[i - 1] - 1e-9 && h - hoehen[i - 1] < 0.05)))
  // Hinunter: im OG ueber die Kante nach, unten hinaus ins EG.
  const unten = auf(INNEN, -INNEN.laenge / 2 - 0.8, 0)
  l.gehe(unten.x, unten.z, 1.4, 10)
  wahr('Innentreppe hinunter: im EG', eb.index === EG && l.treppe === -1)
  nahe('Innentreppe hinunter: Fuesse im EG', l.s.fuss, 0.5, 1e-9)
  wahr('Innentreppe: Wechsel OG, dann EG', l.wechsel.join() === `${OG},${EG}`)
  // Auf halber Treppe umdrehen: man kommt dort hinaus, wo man hineinkam.
  const halb = auf(INNEN, 0.5, 0)
  l.gehe(halb.x, halb.z, 1.4, 6)
  wahr('halbe Treppe: drauf, noch Ebene EG', l.treppe === 1 && eb.index === EG)
  const da = treppeLokal(INNEN, l.p.x, l.p.z, { u: 0, v: 0 })
  nahe('halbe Treppe: Hoehe auf der Linie', l.s.fuss, 0.5 + 3 * treppeAnteil(INNEN, da.u), 1e-9)
  nahe('halbe Treppe: etwa 60 % hoch', treppeAnteil(INNEN, da.u), 0.6, 0.01)
  l.gehe(unten.x, unten.z, 1.4, 6)
  wahr('halbe Treppe: zurueck im EG', eb.index === EG && l.treppe === -1)
}

/* Kellertreppe nach unten, rennend und mit dem Knueppel. */
{
  const { eb, tr } = hausAufbauen()
  const vor = auf(KELLER, -KELLER.laenge / 2 - 0.5, 0)
  const l = new Laeufer(eb, tr, EG, vor.x, vor.z)
  const ende = auf(KELLER, KELLER.laenge / 2 + 1, 0)
  // Rennen (2,8 m/s) mit dem laengsten Bild des Motors (0,1 s).
  l.gehe(ende.x, ende.z, 2.8, 10, 0.1)
  wahr('Keller rennend: unten', eb.index === KE && l.treppe === -1)
  nahe('Keller rennend: Fuesse unten', l.s.fuss, -2.5, 1e-9)
  // Mit dem Knueppel halb gedrueckt zurueck (Richtung -u).
  const c = Math.cos(KELLER.drehY)
  const s = Math.sin(KELLER.drehY)
  l.knueppel(-c, s, 0.5, 60 * 12)
  wahr('Keller Knueppel: wieder im EG', eb.index === EG && l.treppe === -1 && l.wechsel.join() === `${KE},${EG}`)
}

/* Ebene kommt spaeter (Haus innen nachgeladen): die Treppe geht auf. */
{
  const wohnung = new Hindernisse()
  wohnung.rastern()
  const eb = new Ebenen(wohnung)
  eb.wohnungFertig()
  const welt = hausWelt()
  eb.setzen(welt)
  const tr = new Treppen()
  tr.setzen([ZU], eb)
  wahr('spaeter: erst zu', tr.nach[0] === -1)
  welt.push({ id: 'nachbar:0', name: 'Nachbar EG', y: 0.2, hindernisse: [] })
  eb.wechseln(G)
  const neu = eb.aktualisieren(welt)
  wahr('spaeter: nur die neue Ebene gerastert, aktive bleibt', neu === 1 && eb.index === G)
  tr.aufloesen(eb)
  wahr('spaeter: jetzt offen', tr.nach[0] === 4)
  const vor = auf(ZU, -ZU.laenge / 2 - 1, 0)
  const l = new Laeufer(eb, tr, G, vor.x, vor.z)
  const hinter = auf(ZU, ZU.laenge / 2 + 1, 0)
  l.gehe(hinter.x, hinter.z, 1.4, 6)
  wahr('spaeter: drueben auf der neuen Ebene', eb.index === 4 && l.s.fuss === 0.2)
  wahr('drauf(): auf und neben der Treppe', tr.drauf(0, auf(ZU, 0.2, 0.3)) && !tr.drauf(0, auf(ZU, 0, 2)))
}

/* Zwei Treppen nebeneinander: man kommt auf die, deren Kante man kreuzt. */
{
  const wohnung = new Hindernisse()
  wohnung.rastern()
  const eb = new Ebenen(wohnung)
  eb.wohnungFertig()
  eb.setzen(hausWelt())
  const tr = new Treppen()
  const A = { id: 'a', x: 0, z: 0, laenge: 3, breite: 1, drehY: 0, von: 'h:0', nach: 'h:1', stufen: 10 }
  const B = { id: 'b', x: 0, z: 1.2, laenge: 3, breite: 1, drehY: Math.PI, von: 'h:0', nach: 'h:-1', stufen: 10 }
  tr.setzen([A, B], eb)
  const l = new Laeufer(eb, tr, EG, -2.5, 0)
  l.gehe(2.5, 0, 1.4, 6)
  wahr('nebeneinander: A fuehrt ins OG', eb.index === OG)
  const m = new Laeufer(eb, tr, EG, 2.5, 1.2)
  m.gehe(-2.5, 1.2, 1.4, 6)
  wahr('nebeneinander: B (umgedreht) in den Keller', eb.index === KE)
}

/* ====================================================== Ebenen.aktualisieren */
{
  const wohnung = new Hindernisse()
  wohnung.dazu(0, 0, 4, 0.2, 0)
  const eb = new Ebenen(wohnung)
  eb.wohnungFertig()
  const welt = [
    { id: 'boden', name: 'Boden', y: -3, hindernisse: [{ x: 5, z: 5, laenge: 1, tiefe: 1, drehY: 0 }] },
    { id: 'wohnung', name: '1', y: 0, hindernisse: [{ x: 0, z: -3, laenge: 6, tiefe: 0.2, drehY: 0 }] },
    { id: 'og', name: '2', y: 3, hindernisse: [] },
  ]
  eb.setzen(welt)
  eb.wechseln(2)
  const vorher = eb.liste.map((e) => e.raster)
  wahr('aktualisieren: gleiche Felder, nichts neu', eb.aktualisieren(welt) === 0 && eb.liste.every((e, i) => e.raster === vorher[i]) && eb.index === 2)
  // Neu zusammengestellte Felder mit denselben Objekten: auch nichts neu.
  const kopie = welt.map((e) => ({ ...e, hindernisse: [...e.hindernisse] }))
  wahr('aktualisieren: neue Felder, gleiche Objekte, nichts neu', eb.aktualisieren(kopie) === 0 && eb.liste.every((e, i) => e.raster === vorher[i]))
  // Nur der Boden bekommt neue Hindernisse.
  const welt2 = [{ ...welt[0], hindernisse: [{ x: 9, z: 9, laenge: 1, tiefe: 1, drehY: 0 }] }, welt[1], welt[2]]
  wahr('aktualisieren: eine neu', eb.aktualisieren(welt2) === 1)
  wahr('aktualisieren: nur ihr Raster neu', eb.liste[0].raster !== vorher[0] && eb.liste[1].raster === vorher[1] && eb.liste[2].raster === vorher[2])
  wahr('aktualisieren: neue Hindernisse gelten', !eb.liste[0].raster.frei(9, 9, R) && eb.liste[0].raster.frei(5, 5, R))
  wahr('aktualisieren: aktive bleibt', eb.index === 2)
  // Neue Ebene hinten, neuer Name, Gelaende ohne neues Raster.
  const welt3 = [welt2[0], welt2[1], { ...welt2[2], name: 'Dach' }, { id: 'keller', name: 'K', y: -6, hindernisse: [] }]
  welt3[0] = { ...welt2[0], hoehe: () => 1.5 }
  wahr('aktualisieren: neue Ebene hinten', eb.aktualisieren(welt3) === 1 && eb.liste.length === 4 && eb.liste[3].id === 'keller')
  wahr('aktualisieren: Name und Gelaende ohne neues Raster', eb.liste[2].name === 'Dach' && eb.gelaende(0, 1, 1) === 1.5)
  // Ebene der Wohnung neu: die Wohnung selbst bleibt dabei.
  const welt4 = [...welt3]
  welt4[1] = { ...welt3[1], hindernisse: [{ x: 0, z: -5, laenge: 6, tiefe: 0.2, drehY: 0 }] }
  wahr('aktualisieren: Ebene der Wohnung neu', eb.aktualisieren(welt4) === 1)
  wahr('aktualisieren: Wohnung plus neuer Gang', !wohnung.frei(0, 0, R) && !wohnung.frei(0, -5, R) && wohnung.frei(0, -3, R) && wohnung.groesse === 2)
  // Weniger Ebenen oder eine andere Kennung an altem Platz: alles neu (-1).
  eb.wechseln(2)
  wahr('aktualisieren: weniger Ebenen wie setzen', eb.aktualisieren(welt4.slice(0, 2)) === -1 && eb.index === eb.wohnIndex)
  const anders = [{ ...welt4[0], id: 'anders' }, welt4[1]]
  wahr('aktualisieren: andere Kennung wie setzen', eb.aktualisieren(anders) === -1 && eb.liste[0].id === 'anders')
}
{
  // Gelaende: wirft die Funktion, einmal gemeldet und ab dann eben; NaN zaehlt 0.
  const wohnung = new Hindernisse()
  wohnung.rastern()
  const eb = new Ebenen(wohnung)
  eb.wohnungFertig()
  let geworfen = 0
  eb.setzen([
    {
      id: 'a',
      name: 'A',
      y: 0,
      hindernisse: [],
      hoehe: () => {
        geworfen++
        throw new Error('erfunden')
      },
    },
    { id: 'b', name: 'B', y: 0, hindernisse: [], hoehe: () => NaN },
  ])
  const alt = console.error
  let gemeldet = 0
  console.error = () => gemeldet++
  const a = eb.gelaende(0, 1, 1)
  const b = eb.gelaende(0, 2, 2)
  console.error = alt
  wahr('Gelaende wirft: 0, einmal gemeldet, dann eben', a === 0 && b === 0 && gemeldet === 1 && geworfen === 1)
  wahr('Gelaende NaN: 0', eb.gelaende(1, 1, 1) === 0)
  wahr('Gelaende -1 und unbekannt: 0', eb.gelaende(-1, 1, 1) === 0 && eb.gelaende(9, 1, 1) === 0)
}

/* =============================================================== Leistung */

/** Eine erfundene Stadt: Haeuser mit 4 bis 8 Waenden in einem Gitter von
 *  45 m, gedreht, Gartenmauern, Baeume, Baenke, Bordsteine entlang der
 *  Strassen. Genau 40 000 Hindernisse. Dazu je Haus eine Schwelle zu
 *  seinem EG (die ersten 200 Haeuser haben eins, die anderen noch nicht). */
function stadt() {
  let s = 4242
  const zufall = () => {
    s = (s * 1103515245 + 12345) % 2147483648
    return s / 2147483648
  }
  const liste = []
  const treppen = []
  const mitten = []
  const wand = (ax, az, bx, bz, oben) => {
    liste.push({ x: (ax + bx) / 2, z: (az + bz) / 2, laenge: Math.hypot(bx - ax, bz - az), tiefe: 0.3, drehY: -Math.atan2(bz - az, bx - ax), oben })
  }
  let nr = 0
  for (let gx = -26; gx <= 26; gx++) {
    for (let gz = -26; gz <= 26; gz++) {
      const cx = gx * 45 + (zufall() - 0.5) * 6
      const cz = gz * 45 + (zufall() - 0.5) * 6
      const w = 8 + zufall() * 10
      const d = 8 + zufall() * 8
      const r = zufall() * Math.PI
      const c = Math.cos(r)
      const sn = Math.sin(r)
      const n = 4 + Math.floor(zufall() * 5)
      const pts = []
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2
        const px = (Math.cos(a) * w) / 2
        const pz = (Math.sin(a) * d) / 2
        pts.push([cx + px * c - pz * sn, cz + px * sn + pz * c])
      }
      for (let k = 0; k < n; k++) wand(pts[k][0], pts[k][1], pts[(k + 1) % n][0], pts[(k + 1) % n][1])
      // Schwelle vor der ersten Wand, nach aussen.
      const [ax, az] = pts[0]
      const [bx, bz] = pts[1 % n]
      const mx = (ax + bx) / 2
      const mz = (az + bz) / 2
      const ox = mx - cx
      const oz = mz - cz
      const ol = Math.hypot(ox, oz) || 1
      treppen.push({ id: `t${nr}`, x: mx + (ox / ol) * 0.15, z: mz + (oz / ol) * 0.15, laenge: 1.5, breite: 1.4, drehY: -Math.atan2(-oz, -ox), von: 'gelaende', nach: `h${nr}:0`, stufen: 2 })
      if (zufall() < 0.6) {
        const m = w / 2 + 2.5
        const q = d / 2 + 2.5
        const e = [
          [-m, -q],
          [m, -q],
          [m, q],
          [-m, q],
        ].map(([px, pz]) => [cx + px * c - pz * sn, cz + px * sn + pz * c])
        for (let k = 0; k < 4; k++) wand(e[k][0], e[k][1], e[(k + 1) % 4][0], e[(k + 1) % 4][1], zufall() < 0.5 ? 0.6 : 1.2)
      }
      for (let k = 0; k < 2; k++) liste.push({ x: cx + (zufall() - 0.5) * 24, z: cz + (zufall() - 0.5) * 24, laenge: 0.5, tiefe: 0.5, drehY: zufall() * 3 })
      liste.push({ x: gx * 45 + 22.5 + 3.5, z: cz, laenge: 1.6, tiefe: 0.5, drehY: Math.PI / 2, oben: 0.45 })
      mitten.push([cx, cz])
      nr++
    }
  }
  for (let t = -1200; t < 1200 && liste.length < 40000; t += 20) {
    for (let g = -26; g <= 26 && liste.length < 40000; g++) {
      liste.push({ x: g * 45 + 22.5 - 4, z: t + 10, laenge: 20, tiefe: 0.2, drehY: Math.PI / 2, oben: 0.15 })
      if (liste.length < 40000) liste.push({ x: t + 10, z: g * 45 + 22.5 - 4, laenge: 20, tiefe: 0.2, drehY: 0, oben: 0.15 })
    }
  }
  while (liste.length < 40000) liste.push({ x: 1500 + liste.length, z: 1500, laenge: 0.5, tiefe: 0.5, drehY: 0 })
  return { liste: liste.slice(0, 40000), treppen, mitten }
}
{
  const { liste, treppen, mitten } = stadt()
  wahr('Stadt: 40 000 Hindernisse', liste.length === 40000)
  const huegel = { x0: -1300, z0: -1300, schritt: 25, nx: 105, nz: 105, dm: [] }
  for (let j = 0; j < 105; j++) for (let i = 0; i < 105; i++) huegel.dm.push(Math.round(80 * Math.sin(i * 0.11) * Math.cos(j * 0.07)))
  const hoehe = (x, z) => gelaendeHoehe(huegel, x, z)
  const haeuser = []
  for (let k = 0; k < 200; k++) haeuser.push({ id: `h${k}:0`, name: `Haus ${k}`, y: 0.3, hindernisse: [{ x: 0, z: 0, laenge: 1, tiefe: 1, drehY: 0 }] })
  const welt = [{ id: 'gelaende', name: 'Gelaende', y: 0, hindernisse: liste, hoehe }, ...haeuser]

  // Bauen: die Ebene mit 40 000 Hindernissen, fuenfmal, der Median zaehlt.
  const zeiten = []
  let eb = null
  for (let k = 0; k < 5; k++) {
    const wohnung = new Hindernisse()
    wohnung.rastern()
    const e = new Ebenen(wohnung)
    e.wohnungFertig()
    const t0 = performance.now()
    e.setzen(welt)
    zeiten.push(performance.now() - t0)
    eb = e
  }
  const sortiert = [...zeiten].sort((a, b) => a - b)
  const median = sortiert[2]
  wahr(`Leistung: 40 000 Hindernisse rastern hoechstens 60 ms (Median ${median.toFixed(1)} ms)`, median <= 60)
  const g = eb.liste[0].raster
  messung.push(`Bauen: 40 000 Hindernisse plus 200 Haeuser in ${median.toFixed(1)} ms (Median aus 5, erster Lauf ${zeiten[0].toFixed(1)} ms), Zellen ${g.zelle} m, ${g.zellenZahl} Zellen, ${g.eintraege.length} Eintraege`)
  // Gleiche Daten noch einmal (version() ohne neue Hindernisse): fast nichts zu tun.
  const t1 = performance.now()
  const neu = eb.aktualisieren(welt)
  const tAkt = performance.now() - t1
  wahr(`Leistung: aktualisieren ohne Neues unter 2 ms (${tAkt.toFixed(2)} ms)`, neu === 0 && tAkt < 2)
  // Ein Haus kommt innen dazu: nur seine Ebene.
  const welt2 = [...welt, { id: 'neu:0', name: 'Neu', y: 0.3, hindernisse: [{ x: 1, z: 1, laenge: 1, tiefe: 1, drehY: 0 }] }]
  const t2 = performance.now()
  const neu2 = eb.aktualisieren(welt2)
  const tAkt2 = performance.now() - t2
  wahr(`Leistung: ein Haus dazu unter 2 ms (${tAkt2.toFixed(2)} ms)`, neu2 === 1 && tAkt2 < 2)
  // Das Gelaende neu zusammengestellt, dieselben Objekte: kein Neubau.
  const welt3 = [{ ...welt2[0], hindernisse: [...liste] }, ...welt2.slice(1)]
  const t4 = performance.now()
  const neu3 = eb.aktualisieren(welt3)
  const tAkt3 = performance.now() - t4
  wahr(`Leistung: Gelaende neu zusammengestellt, gleiche Objekte: kein Neubau (${tAkt3.toFixed(2)} ms)`, neu3 === 0 && tAkt3 < 5)
  // Ein Rechteck des Gelaendes wirklich neu (Tuer offen): ganzes Gelaende
  // neu. Dreimal mit je einem anderen Rechteck, der Median zaehlt.
  const neuZeiten = []
  let nurGelaende = true
  for (let k = 0; k < 3; k++) {
    const anders = [...liste]
    anders[7 + k] = { ...anders[7 + k], x: anders[7 + k].x + 0.5 }
    const welt4 = [{ ...welt3[0], hindernisse: anders }, ...welt3.slice(1)]
    const t5 = performance.now()
    if (eb.aktualisieren(welt4) !== 1) nurGelaende = false
    neuZeiten.push(performance.now() - t5)
  }
  const tAkt4 = [...neuZeiten].sort((a, b) => a - b)[1]
  wahr(`Leistung: ein Rechteck neu: nur das Gelaende, hoechstens 60 ms (Median ${tAkt4.toFixed(1)} ms)`, nurGelaende && tAkt4 <= 60)
  messung.push(`aktualisieren: ohne Neues ${tAkt.toFixed(2)} ms, ein Haus dazu ${tAkt2.toFixed(2)} ms, Gelaende gleiche Objekte ${tAkt3.toFixed(2)} ms, ein Rechteck des Gelaendes neu ${tAkt4.toFixed(1)} ms`)
  // Treppen: je Haus eine Schwelle.
  const tr = new Treppen()
  let tTr = Infinity
  for (let k = 0; k < 3; k++) {
    const t3 = performance.now()
    tr.setzen(treppen, eb)
    tTr = Math.min(tTr, performance.now() - t3)
  }
  wahr(`Leistung: Treppen lesen unter 10 ms (${tTr.toFixed(1)} ms)`, tTr < 10)
  messung.push(`Treppen: ${tr.liste.length} Schwellen in ${tTr.toFixed(1)} ms (bestes aus 3), davon ${tr.nach.filter((i) => i >= 0).length} offen`)
  wahr('Treppen: 200 offen', tr.nach.filter((i) => i >= 0).length === 200)

  // Gehen durch die Stadt: Strassen entlang und um die Ecken, rennend, mit
  // allem wie im Motor (Gelaende, Hindernisse mit Oberkante, Treppen suchen,
  // Boden, Sprung, Auge). Zeit je Bild.
  const l = new Laeufer(eb, tr, 0, 22.5, -600)
  const punkte = []
  for (let k = 0; k < 12; k++) {
    const sx = (k % 2 ? 1 : -1) * 400
    punkte.push([22.5 + 45 * k, sx], [22.5 + 45 * (k + 1), sx])
  }
  const dt = 1 / 60
  const je = []
  let weg = 0
  let bilder = 0
  for (const [px, pz] of punkte) {
    let fest = 0
    for (let i = 0; i < 60 * 400; i++) {
      const dx = px - l.p.x
      const dz = pz - l.p.z
      const d = Math.hypot(dx, dz)
      if (d < 0.5) break
      const x0 = l.p.x
      const z0 = l.p.z
      if (bilder % 240 === 0) hupfenStart(l.s)
      const t0 = performance.now()
      l.schritt((dx / d) * 2.8, (dz / d) * 2.8, dt)
      je.push(performance.now() - t0)
      bilder++
      const s = Math.hypot(l.p.x - x0, l.p.z - z0)
      weg += s
      fest = s < 1e-4 ? fest + 1 : 0
      if (fest > 30) break
    }
  }
  je.sort((a, b) => a - b)
  const mittel = je.reduce((a, b) => a + b, 0) / je.length
  const p99 = je[Math.floor(je.length * 0.99)]
  wahr(`Leistung: Gehen hoechstens 0,3 ms je Bild (Mittel ${(mittel * 1000).toFixed(1)} us, 99 % unter ${(p99 * 1000).toFixed(1)} us)`, mittel <= 0.3 && p99 <= 0.3)
  wahr(`Stadt: weit gegangen (${Math.round(weg)} m in ${bilder} Bildern)`, weg > 2000)
  messung.push(`Gehen in der Stadt: ${bilder} Bilder, ${Math.round(weg)} m, Mittel ${(mittel * 1000).toFixed(1)} us, 99 % unter ${(p99 * 1000).toFixed(1)} us, laengstes ${(je[je.length - 1] * 1000).toFixed(0)} us je Bild`)

  // Ungunstig: kreuz und quer zwischen Haeusern, Gartenmauern und Baeumen,
  // fast immer an einer Wand entlang, alle 2 s eine neue Richtung, springend.
  let s = 99
  const zufall = () => {
    s = (s * 1103515245 + 12345) % 2147483648
    return s / 2147483648
  }
  // Mitten in einem Haus: rundum Waende ohne Tuer.
  const q = new Laeufer(eb, tr, 0, mitten[1400][0], mitten[1400][1])
  const je2 = []
  let vx = 0
  let vz = 0
  let anWand = 0
  for (let i = 0; i < 30000; i++) {
    if (i % 120 === 0) {
      const a = zufall() * Math.PI * 2
      vx = Math.cos(a) * 2.8
      vz = Math.sin(a) * 2.8
      hupfenStart(q.s)
    }
    const x0 = q.p.x
    const z0 = q.p.z
    const t0 = performance.now()
    q.schritt(vx, vz, dt)
    je2.push(performance.now() - t0)
    if (Math.hypot(q.p.x - x0, q.p.z - z0) < 2.8 * dt * 0.95) anWand++
  }
  je2.sort((a, b) => a - b)
  const mittel2 = je2.reduce((a, b) => a + b, 0) / je2.length
  const p992 = je2[Math.floor(je2.length * 0.99)]
  wahr(`Leistung: an Waenden hoechstens 0,3 ms je Bild (Mittel ${(mittel2 * 1000).toFixed(1)} us, 99 % unter ${(p992 * 1000).toFixed(1)} us)`, mittel2 <= 0.3 && p992 <= 0.3)
  messung.push(`Kreuz und quer an Waenden: ${je2.length} Bilder, ${Math.round((anWand / je2.length) * 100)} % davon aufgehalten, Mittel ${(mittel2 * 1000).toFixed(1)} us, 99 % unter ${(p992 * 1000).toFixed(1)} us je Bild`)
}

if (fehler) {
  console.log(`${fehler} Abweichungen`)
  process.exit(1)
}
for (const m of messung) console.log(m)
console.log('ok')
