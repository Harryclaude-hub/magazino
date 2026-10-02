// Prueft die Siedlung in 3D (src/components/plan3d/siedlung3d.ts) ohne
// Browser, mit einer erfundenen Siedlung (Umrisse in Metern, frei
// verschoben, erfundene Lage):
// - unter 150 000 Dreiecke und unter 25 Zeichenaufrufe,
// - im Rechteck der eigenen Wohnung (Rand 15 cm) steht auf ihrem Geschoss
//   von -0,02 bis geschossHoehe - 0,05 kein Dreieck (Test je Dreieck gegen
//   den Kasten, in Weltkoordinaten),
// - Ebenen: Hoehen, Namen, die Wohnung bei 0, Garten zuletzt, jede mit
//   Hindernissen, Luecke im Gang vor der Wohnungstuer (nur auf ihrem
//   Geschoss), Gelaender am Gang, Drehung der Hindernisse wie die Fassade,
// - Aufzug: Ruf- und Fahrknoepfe je Geschoss, Fahrt mit Zeiten, fahrt()
//   und aufzugZiel() (genau einmal je Ankunft), Tueren gehen auf,
// - gleiche Daten geben Ecke fuer Ecke dieselbe Welt, dispose() gibt alles
//   frei, unsinnige Daten werfen laut.
// Innen (E84), mit einem erfundenen Haus mit Plaenen (zwei Wohnungen mit
// gemeinsamer Wand, Tueren, Fenster, Wohnungstueren, Gang, Stiege, Aufzug,
// zwei Geschosse) und einem grossen erfundenen Haus fuer Zeit und Menge:
// - gemeinsame Waende nur einmal (Dicke 10, 20, 30 cm), Tueren als Luecken
//   in den Hindernissen, Fenster mit Bruestung (Strahl gegen das Mesh),
// - gebaut wird erst nach kamera() im Haus, Huelle weg und innen da;
//   kamera(NaN) zeigt wieder nur Huellen,
// - die eigene Wohnung wird nicht doppelt gebaut (kein Dreieck dort),
// - Ebenen: Boden, Obergeschosse je Haus, Kennungen und Indizes; fahrt()
//   meldet den Index der Ziel-Ebene, aufzugZiel() genau einmal,
// - Sprungziele: Anzahl, vor der Wohnungstuer, Blick zur Tuer,
// - unter 120 000 Dreiecke und 12 Zeichenaufrufe je Haus, kein Bau-Schritt
//   ueber 30 ms, dispose() gibt auch das Innere frei.
// Gemeinsam (E86):
// - karte: jedes Haus mit Namen und Umriss in Weltmetern (genau wie die
//   Lage), Rahmen mit 5 m Rand um alles, die Strasse genau ueber die
//   Breite der Karte, Wege mit 1,5 m Puffer je Seite, Spielplatz, Garten,
//   Reihenfolge zum Malen; der Umriss eines Hauses liegt auf 0,1 m dort,
//   wo seine Huelle (Mesh) steht, auch gedreht,
// - Gaeste (siedlung.wohnung, aber wohnungRahmen null): dieselbe Lage,
//   dieselbe Karte, dieselben Hoehen und Haustueren wie beim Besitzer,
//   nichts ausgespart (Fassade zu, die geplante Wohnung steht), keine
//   Ebene 'wohnung', ihr Geschoss heisst wie die anderen,
// - das erste Sprungziel heisst 'Start' und steht vor der Haustuer des
//   Hauses der Wohnung (ohne Wohnung: des ersten Hauses), frei.
// Begehbar und Stadt (E87):
// - ohne Stadt wie vorher: Dreiecke je festem Mesh, Ebenen und
//   Sprungziele gegen einen Abdruck des Stands vor E87 (in 'bauten' fehlen
//   nur die Autos, die jetzt Fahrzeuge sind), neu nur Zwischenpodeste
//   hinten und das Ziel in der eigenen Wohnung,
// - Treppen in jedem Stiegenhaus (Kern des eigenen Hauses, Haeuser mit
//   Plaenen, ein grosses Haus mit dem Gang nur seitlich, eine Halle, ein
//   erfundenes Haus): jedes Geschoss mit dem naechsten verbunden, jeder
//   Lauf im Stiegenhaus, betretbar nur ueber seine zwei Kanten (Hindernisse
//   aus kollision.ts), seitlich zu, seine Linie auf den Stufen (Strahl),
// - Fahrzeuge und Dinge: Kennungen stabil und eindeutig, auf dem Boden,
//   frei; das Ziel in der eigenen Wohnung frei und in ihr,
// - E87b: Kennungen 'siedlung:f:<x>:<z>:<art>' aus dem Stellplatz und
//   'siedlung:d<n>:<art>', bei Besitzer und Gast gleich; rahmen rechnet
//   Weltmeter in Siedlungsmeter und zurueck (hin und zurueck gleich, auch
//   gedreht und abgesenkt, gier mit, Winkel in (-pi, pi]), Siedlungsmeter
//   haengen nicht an der Lage der Wohnung; dingErzeugen gibt Vorhandenes
//   zurueck, baut fehlende Dinge der Siedlung aus der Kennung und reicht
//   die der Stadt an die Stadt weiter, Unbekanntes gibt null,
// - Stadt (erfunden, mit der echten baueStadt und einer mitschreibenden
//   darum): Gelaende und Hindernisse am Boden, Ebenen hinten an, version,
//   kamera und schritt reichen weiter, Ziele mit der Ebene des Bodens,
//   Karte vereint, ohne eigene Strasse, Hecken und Nachbarn, Wiese nur auf
//   dem Grund und ueber -0,06, Himmel und Dunst bis 700 m; unbrauchbare
//   Stadt: Fehler, Siedlung wie ohne,
// - erfundene Wohnungen (innenGenerator, hier ein mitschreibender): Rahmen
//   und Umriss, Kern und Gang des eigenen Hauses, gebaut wie Plaene,
//   Fehler des Generators fallen weg,
// - Niedriges draussen mit Oberkante (Baenke 0,47, Sandkiste 0,3, Buesche
//   und Hecken bis gut einen Meter), Hohes ohne; mit Stadt: aussparen um den
//   eigenen Grund und die Grube der Rampe; laedt die Stadt ein Haus innen,
//   bleiben die Hindernisse am Boden dasselbe Feld mit denselben Rechtecken,
// - mit dem echten Generator (wohnhausInnen): jedes Haus hat Wohnungen,
//   Sprungziele je Wohnung, jedes Geschoss ist ueber die Treppen in der
//   Stiege erreichbar (Kanten, Seiten, Linie auf den Stufen), der Aufzug im
//   Kern des eigenen Hauses.
// Die Faelle davor laufen ohne erfundene Wohnungen (innenErfinden gibt null),
// wie die Siedlung vor E87 und ihr Abdruck; Fahrzeuge geben ihre geteilten
// Teile selbst frei (jedes dispose() wird geprueft).
// Aufruf im Projektordner: node scripts/siedlung-pruefen.mjs
// Ausgabe "ok" oder die abweichenden Faelle, Exit 1 bei Fehlern.
import { BackSide, PerspectiveCamera, Raycaster, Vector3 } from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { aufzugZiel, baueSiedlung } from '../src/components/plan3d/siedlung3d.ts'
import { baueStadt } from '../src/components/plan3d/stadt3d.ts'
import { Hindernisse, KOERPER_RADIUS_M } from '../src/components/plan3d/kollision.ts'
import { wohnhausInnen } from '../src/lib/innenGenerator.ts'
import { STUFE_M } from '../src/components/plan3d/vertrag3d.ts'

/** Ohne erfundene Wohnungen (wie vor E87): die Faelle bis zum Teil 'E87:
 *  echte erfundene Wohnungen' pruefen die Siedlung aus ihren Daten (mit
 *  Plaenen oder ohne), den Generator nur mitschreibend. Die echten
 *  erfundenen Wohnungen (innenGenerator.wohnhausInnen) prueft der Teil unten. */
const OHNE_ERFINDEN = () => null
const bau = (o) => baueSiedlung({ innenErfinden: OHNE_ERFINDEN, ...o })

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

// Farben wie in src/index.css (helles Schema, Auszug).
const F = {
  rasen: '#7f9a5c',
  weg: '#b9b2a4',
  baum: '#4f7340',
  stamm: '#6b5340',
  hecke: '#5d7f47',
  himmelOben: '#9cc3e4',
  himmelUnten: '#e4ecef',
  fassade: '#e9e4da',
  wand3d: '#e1dace',
  weiss: '#eeede9',
  metall: '#9aa0a6',
  schwarz: '#26272a',
  glas: '#9fc3d9',
  holz: '#b98c5a',
  holzDunkel: '#5c4430',
  spielRot: '#d0573f',
  spielBlau: '#4f7fb8',
  spielGelb: '#e3b341',
  gruen: '#56793f',
  rahmen3d: '#eeece8',
  platte: '#4a4a4c',
  spiegel: '#c3d0d6',
  wandKopf: '#cfc9bf',
  tuer3d: '#f4f2ed',
  zarge3d: '#d6d0c5',
  boden3d: '#bb9670',
  keramik: '#f6f6f3',
  front: '#d4b48a',
}

/* Erfundene Siedlung: fuenf Haeuser, Umrisse in Metern um einen frei
 * gewaehlten Mittelpunkt, Strasse im Osten. */
const HAEUSER = [
  { id: 'h1', name: 'Haus 1', geschosse: 3, stil: 'grau', umriss: [[4.99, 40.55], [4.91, 57.62], [28.33, 57.72], [28.44, 30.19], [16.31, 30.3], [16.1, 40.59]] },
  { id: 'h2', name: 'Haus 2', geschosse: 3, stil: 'putz', umriss: [[4.88, 30.23], [5.05, 3.45], [14.55, 3.51], [14.64, -10.89], [29.2, -10.8], [29.02, 17.04], [16.39, 16.98], [16.31, 30.3]] },
  { id: 'h3', name: 'Haus 3', geschosse: 3, stil: 'holz', umriss: [[5, -10.81], [4.99, -34.92], [29.83, -34.93], [29.84, -19.91], [14.7, -19.9], [14.64, -10.89]] },
  { id: 'h4', name: 'Haus 4', geschosse: 5, stil: 'weiss_loggia', umriss: [[4.56, -72.72], [4.38, -51.05], [27.22, -50.86], [27.41, -72.53]] },
  { id: 'h5', name: 'Haus 5', geschosse: 4, stil: 'weiss_loggia', umriss: [[-32.71, -38.76], [-32.63, -51.17], [-4.94, -50.98], [-5.02, -38.58]] },
].map((h) => ({ ...h, geschossHoehe: 3, dachGruen: true, pv: true, quelle: null }))

const kreis = (cx, cz, r, n) => Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * Math.PI * 2) * r, cz + Math.sin((i / n) * Math.PI * 2) * r])
const AUSSEN = {
  spielplatz: kreis(-20, -66, 11, 12),
  tiefgarage: { x: 19, z: -43, breite: 3.6, laenge: 14, drehung: 180 },
  wege: [
    [[31, -38.2], [2, -38.2], [-2, -44.5]],
    [[-2, -44.5], [-3, -57.5], [-10, -63]],
  ],
}

function siedlung(wohnung, aussen = AUSSEN) {
  return { id: 's1', owner_id: 'u1', name: 'Test', lat: 0, lon: 0, gebaeude: HAEUSER, wohnung, aussen, created_at: '', updated_at: '' }
}

/** Eine Wohnung von 10,5 x 7,2 m (Plan in cm ab 0,0), Rahmen wie umgebungRahmen.ts (12 cm Rand). */
const RAHMEN = [-0.12, -0.12, 10.62, 7.32]
const FAELLE = [
  ['Gang 1. OG', { grundrissId: 'g1', gebaeudeId: 'h5', geschoss: 1, x: -24, z: -50.96, drehung: 0 }, RAHMEN],
  ['Drehung 90, 3. OG', { grundrissId: 'g1', gebaeudeId: 'h4', geschoss: 3, x: 20, z: -72.5, drehung: 90 }, RAHMEN],
  ['Erdgeschoss, Drehung 180', { grundrissId: 'g1', gebaeudeId: 'h5', geschoss: 0, x: -6.5, z: -38.8, drehung: 180 }, RAHMEN],
  ['Oben, Drehung 270', { grundrissId: 'g1', gebaeudeId: 'h5', geschoss: 3, x: -31, z: -40.45, drehung: 270 }, RAHMEN],
  ['Ohne Wohnung', null, null],
]

/* ------------------------------------------------ Hilfen */

function meshesVon(gruppe) {
  const out = []
  gruppe.traverse((o) => {
    if (o.isMesh) out.push(o)
  })
  return out
}
/** Teil eines Fahrzeugs oder Dings (E87, bewegt der Motor)? */
function beweglich(o) {
  for (let x = o; x; x = x.parent) if (typeof x.name === 'string' && (x.name.startsWith('fahrzeug:') || x.name.startsWith('ding:'))) return true
  return false
}
const dreiecke = (m) => (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3

/** Lokal -> Welt wie in siedlung3d.ts (exakt fuer 0, 90, 180, 270 Grad). */
function lage(w) {
  const t = { 0: [1, 0], 90: [0, 1], 180: [-1, 0], 270: [0, -1] }[w.drehung]
  return {
    welt: ([x, z]) => [t[0] * (x - w.x) + t[1] * (z - w.z), -t[1] * (x - w.x) + t[0] * (z - w.z)],
    lokal: ([x, z]) => [w.x + t[0] * x - t[1] * z, w.z + t[1] * x + t[0] * z],
  }
}

/** Dreieck gegen achsenparallelen Kasten (Trennachsen, Akenine-Moeller). */
function dreieckImKasten(a, b, c, mitte, halb) {
  const v = [a, b, c].map((p) => [p[0] - mitte[0], p[1] - mitte[1], p[2] - mitte[2]])
  for (let i = 0; i < 3; i++) {
    const lo = Math.min(v[0][i], v[1][i], v[2][i])
    const hi = Math.max(v[0][i], v[1][i], v[2][i])
    if (lo > halb[i] || hi < -halb[i]) return false
  }
  const e = [0, 1, 2].map((i) => [0, 1, 2].map((j) => v[(i + 1) % 3][j] - v[i][j]))
  const achsen = []
  for (const k of e) {
    achsen.push([0, -k[2], k[1]], [k[2], 0, -k[0]], [-k[1], k[0], 0])
  }
  const n = [e[0][1] * e[1][2] - e[0][2] * e[1][1], e[0][2] * e[1][0] - e[0][0] * e[1][2], e[0][0] * e[1][1] - e[0][1] * e[1][0]]
  achsen.push(n)
  for (const ax of achsen) {
    const l = Math.hypot(...ax)
    if (l < 1e-12) continue
    const p = v.map((q) => q[0] * ax[0] + q[1] * ax[1] + q[2] * ax[2])
    const r = halb[0] * Math.abs(ax[0]) + halb[1] * Math.abs(ax[1]) + halb[2] * Math.abs(ax[2])
    if (Math.min(...p) > r || Math.max(...p) < -r) return false
  }
  return true
}

/** Abstand eines Punkts zu einem Hindernis (gedrehtes Rechteck). */
function abstandHindernis(h, x, z) {
  const ux = Math.cos(h.drehY)
  const uz = -Math.sin(h.drehY)
  const dx = x - h.x
  const dz = z - h.z
  const a = dx * ux + dz * uz
  const b = dx * -uz + dz * ux
  return Math.hypot(Math.max(0, Math.abs(a) - h.laenge / 2), Math.max(0, Math.abs(b) - h.tiefe / 2))
}
const frei = (ebene, x, z, r) => ebene.hindernisse.every((h) => abstandHindernis(h, x, z) > r)
function wegFrei(ebene, a, b, r) {
  const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.04)
  for (let i = 0; i <= n; i++) if (!frei(ebene, a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n, r)) return false
  return true
}

/** Kante des Umrisses, die am meisten nach Norden (-z) zeigt, mit Normale nach aussen. */
function gangKante(umriss) {
  let A = 0
  for (let i = 0; i < umriss.length; i++) {
    const p = umriss[i]
    const q = umriss[(i + 1) % umriss.length]
    A += p[0] * q[1] - q[0] * p[1]
  }
  let beste = null
  for (let i = 0; i < umriss.length; i++) {
    const a = umriss[i]
    const b = umriss[(i + 1) % umriss.length]
    const l = Math.hypot(b[0] - a[0], b[1] - a[1])
    const u = [(b[0] - a[0]) / l, (b[1] - a[1]) / l]
    const n = A > 0 ? [u[1], -u[0]] : [-u[1], u[0]]
    const w = -n[1] + l * 1e-4
    if (l >= 4 && (!beste || w > beste.w)) beste = { a, u, n, l, w }
  }
  return beste
}

/** Dreiecke im Kasten der eigenen Wohnung (Rahmen und 15 cm, Boden -0,02
 *  bis Geschosshoehe - 0,05, Welt). */
function inWohnung(meshes, rahmen, gh, leise = false) {
  const k = [rahmen[0] - 0.15, -0.02, rahmen[1] - 0.15, rahmen[2] + 0.15, gh - 0.05, rahmen[3] + 0.15]
  const mitte = [(k[0] + k[3]) / 2, (k[1] + k[4]) / 2, (k[2] + k[5]) / 2]
  const halb = [(k[3] - k[0]) / 2 - 1e-3, (k[4] - k[1]) / 2 - 1e-3, (k[5] - k[2]) / 2 - 1e-3]
  const a = new Vector3()
  const b = new Vector3()
  const c = new Vector3()
  let drin = 0
  for (const m of meshes) {
    if (m.name === 'himmel') continue
    const p = m.geometry.attributes.position
    const ix = m.geometry.index
    const n = ix ? ix.count : p.count
    for (let i = 0; i < n; i += 3) {
      const ia = ix ? ix.getX(i) : i
      const ib = ix ? ix.getX(i + 1) : i + 1
      const ic = ix ? ix.getX(i + 2) : i + 2
      a.fromBufferAttribute(p, ia).applyMatrix4(m.matrixWorld)
      b.fromBufferAttribute(p, ib).applyMatrix4(m.matrixWorld)
      c.fromBufferAttribute(p, ic).applyMatrix4(m.matrixWorld)
      if (dreieckImKasten([a.x, a.y, a.z], [b.x, b.y, b.z], [c.x, c.y, c.z], mitte, halb)) {
        if (drin < 3 && !leise) console.log('  in der Wohnung:', m.name, [a, b, c].map((v) => v.toArray().map((x) => +x.toFixed(3))))
        drin++
      }
    }
  }
  return drin
}

/* ------------------------------------------------ Karte und Start (E86) */

/** Reihenfolge der Flaechen zum Malen. */
const KARTE_REIHE = { strasse: 0, garten: 1, weg: 2, spielplatz: 3 }
/** Breite der Strasse: zwei Gehsteige, zwei Bordsteine, Fahrbahn. */
const STRASSE_TIEF = 2 * 2.0 + 2 * 0.15 + 6.5
const kastenAus = (punkte) => [
  Math.min(...punkte.map((p) => p[0])),
  Math.min(...punkte.map((p) => p[1])),
  Math.max(...punkte.map((p) => p[0])),
  Math.max(...punkte.map((p) => p[1])),
]
const punktGleich = (a, b, tol = 1e-9) => Math.abs(a[0] - b[0]) <= tol && Math.abs(a[1] - b[1]) <= tol
function imVieleck(p, poly) {
  let d = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    if (a[1] > p[1] !== b[1] > p[1] && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) d = !d
  }
  return d
}

/** Prueft w.karte. welt: lokal (Meter) -> Welt (x, z); garten: erwartete
 *  Gaerten (Weltpunkte je Garten) oder null. */
function kartePruefen(name, w, welt, aussen, garten = null) {
  const K = w.karte
  wahr(
    `${name}: Karte da`,
    !!K && Array.isArray(K.rahmen) && K.rahmen.length === 4 && K.rahmen.every(Number.isFinite) && K.rahmen[0] < K.rahmen[2] && K.rahmen[1] < K.rahmen[3],
  )
  if (!K) return
  const [x0, z0, x1, z1] = K.rahmen
  // Haeuser: Name und Umriss genau wie die Lage.
  wahr(`${name}: Karte: alle Haeuser mit Namen`, K.haeuser.length === HAEUSER.length && K.haeuser.every((h, i) => h.name === HAEUSER[i].name))
  wahr(
    `${name}: Karte: Umrisse in Weltmetern`,
    K.haeuser.every((h, i) => h.punkte.length === HAEUSER[i].umriss.length && h.punkte.every((p, j) => punktGleich(p, welt(HAEUSER[i].umriss[j])))),
  )
  wahr(`${name}: Karte: Flaechen gueltig`, K.flaechen.every((f) => f.art in KARTE_REIHE && f.punkte.length >= 3 && f.punkte.every((p) => p.length === 2 && p.every(Number.isFinite))))
  wahr(`${name}: Karte: Reihenfolge zum Malen`, K.flaechen.every((f, i) => i === 0 || KARTE_REIHE[K.flaechen[i - 1].art] <= KARTE_REIHE[f.art]))
  // Rahmen: alles drin, alles ausser der Strasse (die erste Flaeche) mit
  // 5 m Rand, nicht groesser als noetig (Vorgarten 2,6 m und Strasse).
  const alle = [...K.haeuser.flatMap((h) => h.punkte), ...K.flaechen.flatMap((f) => f.punkte)]
  wahr(`${name}: Karte: alles im Rahmen`, alle.every((p) => p[0] >= x0 - 1e-9 && p[0] <= x1 + 1e-9 && p[1] >= z0 - 1e-9 && p[1] <= z1 + 1e-9))
  const ohneStrasse = kastenAus([...K.haeuser.flatMap((h) => h.punkte), ...K.flaechen.slice(1).flatMap((f) => f.punkte)])
  wahr(
    `${name}: Karte: 5 m Rand`,
    ohneStrasse[0] - x0 >= 5 - 1e-9 && ohneStrasse[1] - z0 >= 5 - 1e-9 && x1 - ohneStrasse[2] >= 5 - 1e-9 && z1 - ohneStrasse[3] >= 5 - 1e-9,
  )
  const extra = 10 + 2.6 + STRASSE_TIEF + 1e-6
  wahr(
    `${name}: Karte: Rahmen nicht groesser als noetig (${(x1 - x0).toFixed(1)} x ${(z1 - z0).toFixed(1)} m)`,
    x1 - x0 <= ohneStrasse[2] - ohneStrasse[0] + extra && z1 - z0 <= ohneStrasse[3] - ohneStrasse[1] + extra,
  )
  // Die Strasse zuerst, genau ueber die Breite der Karte, so tief wie gebaut.
  const st = K.flaechen[0]
  wahr(`${name}: Karte: Strasse zuerst`, !!st && st.art === 'strasse' && st.punkte.length === 4)
  if (st) {
    const [sx0, sz0, sx1, sz1] = kastenAus(st.punkte)
    const laengsX = Math.abs(sx0 - x0) < 1e-9 && Math.abs(sx1 - x1) < 1e-9
    const laengsZ = Math.abs(sz0 - z0) < 1e-9 && Math.abs(sz1 - z1) < 1e-9
    wahr(`${name}: Karte: Strasse ueber die ganze Karte`, laengsX || laengsZ)
    nahe(`${name}: Karte: Strasse so tief wie gebaut`, laengsX ? sz1 - sz0 : sx1 - sx0, STRASSE_TIEF, 1e-6)
  }
  // Wege: je Strecke ein Rechteck mit 1,5 m je Seite um die Mittellinie.
  const wege = K.flaechen.filter((f) => f.art === 'weg')
  let strecken = 0
  let gefunden = 0
  for (const wg of aussen.wege) {
    for (let i = 0; i + 1 < wg.length; i++) {
      strecken++
      const a = welt(wg[i])
      const b = welt(wg[i + 1])
      const l = Math.hypot(b[0] - a[0], b[1] - a[1])
      const n = [-(b[1] - a[1]) / l, (b[0] - a[0]) / l]
      const mitte = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
      const passt = wege.some((f) => f.punkte.length === 4 && imVieleck(mitte, f.punkte) && f.punkte.every((p) => Math.abs(Math.abs((p[0] - a[0]) * n[0] + (p[1] - a[1]) * n[1]) - 1.5) < 1e-6))
      if (passt) gefunden++
    }
  }
  wahr(`${name}: Karte: jeder Weg mit 1,5 m Puffer (${gefunden} von ${strecken})`, gefunden === strecken)
  // Spielplatz genau an seinem Ort.
  const spiel = K.flaechen.filter((f) => f.art === 'spielplatz')
  if (aussen.spielplatz) {
    const soll = aussen.spielplatz.map(welt)
    wahr(`${name}: Karte: Spielplatz`, spiel.length === 1 && spiel[0].punkte.length === soll.length && spiel[0].punkte.every((p, i) => punktGleich(p, soll[i])))
  } else wahr(`${name}: Karte: kein Spielplatz`, spiel.length === 0)
  // Gaerten der Haeuser mit Plaenen.
  const gaerten = K.flaechen.filter((f) => f.art === 'garten')
  if (garten) {
    wahr(
      `${name}: Karte: Gaerten (${gaerten.length})`,
      gaerten.length === garten.length && garten.every((g) => gaerten.some((f) => f.punkte.length === g.length && g.every((p) => f.punkte.some((x) => punktGleich(p, x, 1e-6))))),
    )
  } else wahr(`${name}: Karte: ohne Plaene keine Gaerten`, gaerten.length === 0)
}

/** Das erste Sprungziel heisst 'Start': vor der Haustuer des Hauses der
 *  Wohnung, ohne Wohnung (oder ohne Eingang dort) des ersten Hauses mit
 *  Eingang; einmal, auf einer Ebene, frei. */
function startPruefen(name, w, wohnung) {
  const S = w.sprungziele
  const E = w.ebenen
  wahr(`${name}: Start zuerst und einmal`, S.length > 0 && S[0].name === 'Start' && S.filter((s) => s.name === 'Start').length === 1)
  const s = S[0]
  if (!s) return
  wahr(`${name}: Start auf einer Ebene`, Number.isInteger(s.ebene) && s.ebene >= 0 && s.ebene < E.length && [s.x, s.z, s.gier].every(Number.isFinite))
  if (E[s.ebene]) wahr(`${name}: Start frei`, frei(E[s.ebene], s.x, s.z, 0.2))
  const eingang = (id) => S.find((x) => x.name === `Eingang ${HAEUSER.find((h) => h.id === id).name}`)
  const vorbild = (wohnung && eingang(wohnung.gebaeudeId)) || HAEUSER.map((h) => eingang(h.id)).find(Boolean)
  wahr(`${name}: Start vor der Haustuer${vorbild ? ` (${vorbild.name})` : ''}`, !!vorbild && vorbild.ebene === s.ebene && vorbild.x === s.x && vorbild.z === s.z && vorbild.gier === s.gier)
}

/** Lage der Siedlung in der Welt (Matrix der Gruppe siedlungLage). */
const lageVon = (w) => w.gruppe.children.find((x) => x.name === 'siedlungLage')

/* ------------------------------------------------ Abdruck (E87) */
/* Ohne Stadt bleibt die Siedlung wie vor E87: Dreiecke je festem Mesh,
 * Ebenen (Kennung, Name, Hoehe) und Sprungziele vorne gleich. ABDRUCK_VORHER
 * ist mit dem Stand vor E87 gemessen (SIEDLUNG_ABDRUCK=1 druckt ihn neu). */
const fnv = (s) => {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16)
}
const r6 = (v) => (Math.abs(v) < 5e-7 ? 0 : v).toFixed(6)
const ebeneText = (e) => `${e.id}|${e.name}|${r6(e.y)}`
const zielText = (s) => `${s.name}|${s.ebene}|${r6(s.x)}|${r6(s.z)}|${r6(s.gier)}`
/** Dreiecke je festem Mesh (in siedlungLage), Ebenen und Sprungziele als Abdruck. */
function abdruck(w) {
  const tris = {}
  for (const m of meshesVon(lageVon(w))) tris[m.name] = (tris[m.name] ?? 0) + dreiecke(m)
  return { tris, ebenenListe: w.ebenen.map(ebeneText), zieleListe: w.sprungziele.map(zielText), autos: w.gruppe.userData.autos }
}
/** Kurz zum Speichern (ABDRUCK_VORHER). */
const abdruckKurz = (a) => ({
  tris: a.tris,
  ebenen: a.ebenenListe.length,
  ebenenHash: fnv(a.ebenenListe.join(';')),
  ziele: a.zieleListe.length,
  zieleHash: fnv(a.zieleListe.join(';')),
  autos: a.autos,
})
const ABDRUCK = {}

/* ------------------------------------------------ Treppen (E87) */

/** Punkt (u, v) einer Treppe3D in der Welt (Formel aus vertrag3d.ts). */
const anTreppe = (t, u, v) => [t.x + u * Math.cos(t.drehY) + v * Math.sin(t.drehY), t.z - u * Math.sin(t.drehY) + v * Math.cos(t.drehY)]
/** Hindernisse einer Ebene im Raster von kollision.ts (wie der Motor). */
function rasterVon(e) {
  const h = new Hindernisse(1)
  for (const x of e.hindernisse) h.dazu(x.x, x.z, x.laenge, x.tiefe, x.drehY)
  h.rastern()
  return h
}
/** Kommt der Koerper auf der Ebene (Raster h) von a nach b (frei am Start, am Ziel angekommen)? */
function kommtHin(h, a, b) {
  const r = KOERPER_RADIUS_M
  if (!h.frei(a[0], a[1], r)) return false
  const p = { x: a[0], z: a[1] }
  h.bewegen(p, b[0] - a[0], b[1] - a[1], r)
  return Math.hypot(p.x - b[0], p.z - b[1]) < 0.02
}

/**
 * Treppen eines Hauses (E87): jedes Geschoss ist mit dem naechsten ueber
 * eine Kette von Treppen verbunden; jeder Lauf liegt in einem der
 * Stiegenhaeuser (Welt-Vielecke), steigt um eine halbe Geschosshoehe, ist
 * auf seiner Ebene von nur ueber seine untere Kante, auf nach nur ueber
 * die obere zu betreten, seitlich auf keiner (Hindernisse in kollision.ts),
 * und seine Linie liegt auf den Stufen (Strahl von oben gegen meshes, eine
 * halbe Steigung Spiel).
 */
function treppenPruefen(name, w, haus) {
  const E = w.ebenen
  const T = w.treppen.filter((t) => t.id.startsWith(`${haus.id}:t`))
  wahr(`${name}: ${haus.id}: Treppen da (${T.length})`, T.length === 2 * (haus.geschosse.length - 1))
  const nb = new Map()
  const verbinden = (a, b) => {
    if (!nb.has(a)) nb.set(a, new Set())
    nb.get(a).add(b)
  }
  for (const t of T) {
    verbinden(t.von, t.nach)
    verbinden(t.nach, t.von)
  }
  for (let k = 0; k + 1 < haus.geschosse.length; k++) {
    const ziel = haus.geschosse[k + 1]
    const gesehen = new Set([haus.geschosse[k]])
    let rand = [haus.geschosse[k]]
    while (rand.length && !gesehen.has(ziel)) {
      const neu = []
      for (const x of rand) {
        for (const y of nb.get(x) ?? []) {
          if (gesehen.has(y)) continue
          gesehen.add(y)
          neu.push(y)
        }
      }
      rand = neu
    }
    wahr(`${name}: ${haus.id}: Geschoss ${k} und ${k + 1} ueber Treppen verbunden`, gesehen.has(ziel))
  }
  const strahl = new Raycaster()
  for (const t of T) {
    const von = E.find((e) => e.id === t.von)
    const nach = E.find((e) => e.id === t.nach)
    wahr(`${name}: ${t.id}: Ebenen ${t.von} und ${t.nach} da`, !!von && !!nach)
    if (!von || !nach) continue
    nahe(`${name}: ${t.id}: steigt eine halbe Geschosshoehe`, nach.y - von.y, haus.gh / 2, 1e-9)
    const L = t.laenge / 2
    const B = t.breite / 2
    const ecken = [anTreppe(t, -L + 0.01, -B + 0.01), anTreppe(t, L - 0.01, -B + 0.01), anTreppe(t, L - 0.01, B - 0.01), anTreppe(t, -L + 0.01, B - 0.01)]
    wahr(`${name}: ${t.id}: im Stiegenhaus`, haus.stiegen.some((poly) => ecken.every((p) => imVieleck(p, poly))))
    wahr(`${name}: ${t.id}: breit genug (${t.breite.toFixed(2)} m)`, t.breite >= 2 * KOERPER_RADIUS_M + 0.04 && t.stufen >= 3)
    const hv = rasterVon(von)
    const hn = rasterVon(nach)
    wahr(`${name}: ${t.id}: auf ${t.von} unten hinein`, kommtHin(hv, anTreppe(t, -L - 0.45, 0), anTreppe(t, -L + 0.35, 0)))
    wahr(`${name}: ${t.id}: auf ${t.nach} oben hinein`, kommtHin(hn, anTreppe(t, L + 0.45, 0), anTreppe(t, L - 0.35, 0)))
    wahr(`${name}: ${t.id}: auf ${t.von} oben zu`, !kommtHin(hv, anTreppe(t, L + 0.45, 0), anTreppe(t, L - 0.35, 0)))
    wahr(`${name}: ${t.id}: auf ${t.nach} unten zu`, !kommtHin(hn, anTreppe(t, -L - 0.45, 0), anTreppe(t, -L + 0.35, 0)))
    let seitlich = 0
    for (const h of [hv, hn]) for (const s of [-1, 1]) for (const u of [-0.5 * L, 0, 0.5 * L]) if (kommtHin(h, anTreppe(t, u, s * (B + 0.45)), anTreppe(t, u, s * (B - 0.3)))) seitlich++
    wahr(`${name}: ${t.id}: seitlich zu (${seitlich})`, seitlich === 0)
    // Die Linie der Treppe auf den Stufen.
    const steig = (nach.y - von.y) / t.stufen
    let daneben = 0
    for (let i = 1; i < 16; i++) {
      const f = i / 16
      const [x, z] = anTreppe(t, -L + 2 * L * f, 0)
      const y = von.y + (nach.y - von.y) * f
      strahl.set(new Vector3(x, y + 0.6, z), new Vector3(0, -1, 0))
      strahl.far = 1.4
      const hit = strahl.intersectObjects(haus.meshes, false)[0]
      if (!hit || Math.abs(hit.point.y - y) > steig / 2 + 0.05) {
        if (daneben < 2) console.log('  Stufe daneben:', t.id, f.toFixed(2), 'Linie', y.toFixed(3), 'Stufe', hit ? hit.point.y.toFixed(3) : '-')
        daneben++
      }
    }
    wahr(`${name}: ${t.id}: Linie auf den Stufen (${daneben} daneben)`, daneben === 0)
  }
}

/** Die beiden moeglichen Lagen des Kerns am Gang (Welt-Vielecke). */
function kernRechtecke(hausDaten, welt) {
  const gk = gangKante(hausDaten.umriss)
  const rechteck = (t0, t1, s0, s1) => [
    [t0, s0],
    [t1, s0],
    [t1, s1],
    [t0, s1],
  ].map(([t, s]) => welt([gk.a[0] + gk.u[0] * t + gk.n[0] * s, gk.a[1] + gk.u[1] * t + gk.n[1] * s]))
  return [rechteck(0, 6.8, 1.6, 4.4), rechteck(gk.l - 6.8, gk.l, 1.6, 4.4)]
}

/** Fahrzeuge und Dinge (E87): Kennungen, Lage, frei, gleich in a und b. */
function beweglichePruefen(name, a, b) {
  const E0 = a.ebenen[0]
  const F0 = a.fahrzeuge
  const D = a.dinge
  wahr(`${name}: so viele Fahrzeuge wie Autos (${F0.length})`, F0.length === a.gruppe.userData.autos && F0.length > 0)
  // E87b: Kennung aus dem Stellplatz (Siedlungsmeter in Dezimetern) und der Art.
  wahr(`${name}: Kennungen der Fahrzeuge aus Stellplatz und Art`, F0.every((f) => {
    const m = /^siedlung:f:(-?\d+):(-?\d+):([a-z]+)$/.exec(f.id)
    const [sx, , sz] = a.rahmen.zuSiedlung(f.x, 0, f.z, 0)
    return !!m && m[3] === f.art && Math.abs(Number(m[1]) / 10 - sx) <= 0.05 + 1e-9 && Math.abs(Number(m[2]) / 10 - sz) <= 0.05 + 1e-9
  }) && new Set(F0.map((f) => f.id)).size === F0.length)
  wahr(`${name}: Dinge (${D.length})`, D.length >= 8 && D.length <= 12 && new Set(D.map((d) => d.id)).size === D.length && D.every((d) => /^siedlung:d\d+:(ball|kuebel|schaufel|form|sessel)$/.test(d.id)))
  wahr(`${name}: Kennungen mit den Zeichen von siedlung_ding_setzen`, [...F0, ...D].every((x) => /^[A-Za-z0-9:._-]{1,120}$/.test(x.id)))
  for (const f of F0) {
    wahr(`${name}: ${f.id} auf dem Boden`, f.ebene === E0.id && f.gruppe.parent === a.gruppe && Math.abs(f.gruppe.position.y - E0.y) < 1e-9)
    wahr(`${name}: ${f.id} Lage`, Math.abs(f.gruppe.position.x - f.x) < 1e-9 && Math.abs(f.gruppe.position.z - f.z) < 1e-9 && Math.abs(f.gruppe.rotation.y - f.gier) < 1e-9)
    wahr(`${name}: ${f.id} Art`, f.art === 'auto' || f.art === 'kombi')
  }
  for (const d of D) {
    const o = d.objekt
    wahr(`${name}: ${d.id} auf dem Boden`, d.ebene === E0.id && o.parent === a.gruppe && Math.abs(o.position.y - E0.y) < 1e-9)
    o.geometry.computeBoundingBox()
    const bb = o.geometry.boundingBox
    wahr(`${name}: ${d.id} Ursprung unten (${bb.min.y.toFixed(3)})`, Math.abs(bb.min.y) < 0.005 && Math.abs(bb.max.y - d.hoehe) < 0.02)
    wahr(`${name}: ${d.id} frei`, frei(E0, o.position.x, o.position.z, Math.hypot(d.breite, d.tiefe) / 2 + 0.2))
    wahr(`${name}: ${d.id} Eckfarben`, !!o.geometry.attributes.color && o.material.vertexColors === true)
  }
  const lagen = (w) => JSON.stringify([...w.fahrzeuge.map((f) => [f.id, f.art, r6(f.x), r6(f.z), r6(f.gier)]), ...w.dinge.map((d) => [d.id, r6(d.objekt.position.x), r6(d.objekt.position.z)])])
  wahr(`${name}: Fahrzeuge und Dinge stabil`, lagen(a) === lagen(b))
}

/** Rahmen der Siedlung (E87b): Weltmeter <-> Siedlungsmeter. Siedlungsmeter
 *  sind die der Daten (Umrisse), y ueber dem Boden der Siedlung, gier wie
 *  Pose3D; hin und zurueck gleich, auch gedreht und abgesenkt. */
function rahmenPruefen(name, w) {
  const R = w.rahmen
  const boden = w.ebenen.find((e) => e.id === 'boden') ?? w.ebenen[0]
  wahr(`${name}: rahmen da`, !!R && typeof R.zuSiedlung === 'function' && typeof R.zuWelt === 'function')
  if (!R) return
  // Umrisse der Haeuser (Daten) liegen in der Welt genau dort, wo die Karte sie hat.
  let daneben = 0
  HAEUSER.forEach((h, i) => {
    const k = w.karte.haeuser[i]
    h.umriss.forEach((p, j) => {
      const [x, y, z] = R.zuWelt(p[0], 0, p[1], 0)
      if (Math.hypot(x - k.punkte[j][0], z - k.punkte[j][1]) > 1e-9 || Math.abs(y - boden.y) > 1e-9) daneben++
    })
  })
  wahr(`${name}: rahmen.zuWelt wie die Karte, Boden der Siedlung bei y ${boden.y} (${daneben} daneben)`, daneben === 0)
  // Hin und zurueck (zufaellige Stellen, Hoehen und Winkel).
  let r = 4711
  const zz = () => {
    r = (Math.imul(r, 1664525) + 1013904223) >>> 0
    return r / 4294967296
  }
  const winkelGleich = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < 1e-9
  let fehlHin = 0
  let fehlWinkel = 0
  for (let i = 0; i < 200; i++) {
    const p = [-150 + zz() * 300, -12 + zz() * 30, -150 + zz() * 300, -10 + zz() * 20]
    const s1 = R.zuSiedlung(...p)
    const w1 = R.zuWelt(...s1)
    const w2 = R.zuWelt(...p)
    const s2 = R.zuSiedlung(...w2)
    if ([0, 1, 2].some((k) => Math.abs(w1[k] - p[k]) > 1e-9 || Math.abs(s2[k] - p[k]) > 1e-9) || !winkelGleich(w1[3], p[3]) || !winkelGleich(s2[3], p[3])) fehlHin++
    for (const g of [s1[3], w1[3], w2[3], s2[3]]) if (!(g > -Math.PI - 1e-12 && g <= Math.PI + 1e-12)) fehlWinkel++
  }
  wahr(`${name}: rahmen hin und zurueck (${fehlHin} von 200 daneben)`, fehlHin === 0)
  wahr(`${name}: rahmen Winkel in (-pi, pi] (${fehlWinkel})`, fehlWinkel === 0)
  // gier: eine Richtung in den Daten (Kante eines Hauses) gibt in der Welt
  // die Richtung zwischen den beiden Weltpunkten.
  let fehlGier = 0
  for (const h of HAEUSER) {
    const [a, b] = h.umriss
    const gs = Math.atan2(-(b[0] - a[0]), -(b[1] - a[1]))
    const A = R.zuWelt(a[0], 0, a[1], 0)
    const B = R.zuWelt(b[0], 0, b[1], 0)
    const gw = Math.atan2(-(B[0] - A[0]), -(B[2] - A[2]))
    if (!winkelGleich(R.zuWelt(a[0], 0, a[1], gs)[3], gw) || !winkelGleich(R.zuSiedlung(A[0], 0, A[2], gw)[3], gs)) fehlGier++
  }
  wahr(`${name}: rahmen dreht gier mit der Siedlung (${fehlGier})`, fehlGier === 0)
  // Dinge am Boden: in Siedlungsmetern auf y 0.
  wahr(`${name}: Dinge am Boden in Siedlungsmetern bei y 0`, w.dinge.every((d) => d.ebene !== boden.id || Math.abs(R.zuSiedlung(d.objekt.position.x, d.objekt.position.y, d.objekt.position.z, 0)[1]) < 1e-9))
}

/** dingErzeugen der Siedlung (E87b): vorhandene gleich, fehlende aus der
 *  Kennung, Unbekanntes null. */
function erzeugenPruefen(name, w) {
  const D = w.dinge
  const v0 = w.version()
  wahr(`${name}: dingErzeugen gibt Vorhandenes zurueck`, D.every((d) => w.dingErzeugen(d.id) === d) && w.version() === v0)
  const n0 = w.dinge.length
  const neu = w.dingErzeugen('siedlung:d77:ball')
  wahr(`${name}: dingErzeugen baut ein fehlendes Ding der Siedlung`, !!neu && neu.id === 'siedlung:d77:ball' && w.dinge.length === n0 + 1 && w.dinge.includes(neu) && w.version() === v0 + 1)
  if (neu) {
    const E0 = w.ebenen[0]
    const s0 = w.sprungziele[0]
    wahr(`${name}: dingErzeugen: am Start auf dem Boden, in der Gruppe`, neu.ebene === E0.id && neu.objekt.parent === w.gruppe && Math.abs(neu.objekt.position.y - E0.y) < 1e-9 && Math.abs(neu.objekt.position.x - s0.x) < 1e-9 && Math.abs(neu.objekt.position.z - s0.z) < 1e-9)
    wahr(`${name}: dingErzeugen: Masse wie ein Ball`, Math.abs(neu.breite - 0.22) < 1e-9 && Math.abs(neu.hoehe - 0.22) < 1e-9)
    wahr(`${name}: dingErzeugen: zweimal dasselbe`, w.dingErzeugen('siedlung:d77:ball') === neu && w.version() === v0 + 1)
  }
  const v1 = w.version()
  const unsinn = ['siedlung:d0:rakete', 'siedlung:f:1:2:auto', 'siedlung:d:1:ball', 'garten', '', 'stadt:d:1:2:ballrot']
  wahr(`${name}: dingErzeugen: Unbekanntes (ohne Stadt auch die der Stadt) gibt null`, unsinn.every((id) => w.dingErzeugen(id) === null) && w.dingErzeugen(7) === null && w.version() === v1)
}

/** Das Ziel in der eigenen Wohnung (E87): ohne Rahmen da, auf dem
 *  Geschoss der Wohnung, frei, im Vieleck einer der Flaechen (Welt). */
function eigenePruefen(name, w, wohnung, rahmen, ebene, flaechen) {
  const i = w.eigeneWohnung
  if (!wohnung || rahmen) {
    wahr(`${name}: kein eigenes Ziel (${i})`, i === null)
    return
  }
  const s = Number.isInteger(i) ? w.sprungziele[i] : null
  wahr(`${name}: eigenes Ziel da (${i})`, !!s)
  if (!s) return
  wahr(`${name}: eigenes Ziel auf dem Geschoss der Wohnung (${s.ebene})`, s.ebene === ebene)
  wahr(`${name}: eigenes Ziel frei`, frei(w.ebenen[s.ebene], s.x, s.z, 0.3))
  wahr(`${name}: eigenes Ziel in der Wohnung (${s.name})`, flaechen.some((poly) => imVieleck([s.x, s.z], poly)))
}

/** Besitzer und Gast in derselben Welt: Lage, Karte, Hoehen, Haustueren,
 *  Start. Die Ebene der Wohnung heisst beim Gast wie jedes Geschoss. */
function gleicheWelt(name, besitzer, gast) {
  besitzer.gruppe.updateMatrixWorld(true)
  gast.gruppe.updateMatrixWorld(true)
  const a = lageVon(besitzer).matrixWorld.elements
  const b = lageVon(gast).matrixWorld.elements
  wahr(`${name}: gleiche Lage`, a.every((v, i) => v === b[i]))
  wahr(`${name}: gleiche Karte`, JSON.stringify(besitzer.karte) === JSON.stringify(gast.karte))
  const EB = besitzer.ebenen
  const EG = gast.ebenen
  wahr(`${name}: gleiche Ebenen (Zahl, Namen, Hoehen)`, EB.length === EG.length && EB.every((e, i) => e.name === EG[i].name && e.y === EG[i].y))
  const iw = EB.findIndex((e) => e.id === 'wohnung')
  wahr(`${name}: Besitzer hat die Ebene 'wohnung' bei 0`, iw >= 0 && Math.abs(EB[iw].y) < 1e-12)
  wahr(`${name}: Gast hat keine Ebene 'wohnung'`, EG.every((e) => e.id !== 'wohnung'))
  if (iw >= 0 && EG[iw]) wahr(`${name}: beim Gast heisst das Geschoss ${EG[iw].id}`, /^(geschoss-\d+|boden|.+:\d+)$/.test(EG[iw].id))
  wahr(`${name}: sonst gleiche Kennungen`, EB.every((e, i) => i === iw || e.id === EG[i]?.id))
  const ziele = (w) => w.sprungziele.filter((s) => s.name === 'Start' || s.name.startsWith('Eingang '))
  wahr(`${name}: gleicher Start und gleiche Haustueren`, JSON.stringify(ziele(besitzer)) === JSON.stringify(ziele(gast)))
  wahr(`${name}: Aufzug an derselben Stelle`, JSON.stringify(besitzer.kabine) === JSON.stringify(gast.kabine))
}

/* ------------------------------------------------ Faelle */

function pruefen(name, wohnung, rahmen, aussen = AUSSEN) {
  const t0 = performance.now()
  const w = bau({ siedlung: siedlung(wohnung, aussen), farben: F, wohnungRahmen: rahmen })
  const zeit = performance.now() - t0
  w.gruppe.updateMatrixWorld(true)
  ABDRUCK[name] = abdruck(w)
  const meshes = meshesVon(w.gruppe)
  const nach = new Map(meshes.map((m) => [m.name, m]))
  const haus = wohnung ? HAEUSER.find((h) => h.id === wohnung.gebaeudeId) : null

  // Meshes, Zeichenaufrufe, Dreiecke, Farben.
  for (const n of ['himmel', 'boden', 'gelaende', 'gruen', 'bauten']) wahr(`${name}: Mesh ${n} da`, nach.has(n))
  wahr(`${name}: Kabine und Tueren genau mit Wohnung`, nach.has('kabine') === !!wohnung && nach.has('aufzugTueren') === !!wohnung)
  // Die feste Welt; Fahrzeuge und Dinge (E87) zaehlen eigens (E87-Teil unten).
  const festeMeshes = meshes.filter((m) => !beweglich(m))
  const sichtbar = festeMeshes.filter((m) => m.visible)
  wahr(`${name}: unter 25 Zeichenaufrufe (${sichtbar.length})`, sichtbar.length < 25)
  const summe = meshes.reduce((s, m) => s + dreiecke(m), 0)
  wahr(`${name}: unter 150 000 Dreiecke (${summe})`, summe < 150000)
  for (const m of festeMeshes) {
    const pos = m.geometry.attributes.position.array
    wahr(`${name}: ${m.name} Lage endlich`, pos.every(Number.isFinite))
    const col = m.geometry.attributes.color
    if (m.name.startsWith('aufzugRuf') || m.name.startsWith('aufzugFahre')) continue
    wahr(`${name}: ${m.name} hat Eckfarben`, !!col && col.count === m.geometry.attributes.position.count)
    if (col) wahr(`${name}: ${m.name} Eckfarben gueltig`, Array.from(col.array).every((v) => Number.isFinite(v) && v >= 0 && v <= 1.5))
    if (m.name !== 'himmel') wahr(`${name}: ${m.name} Farben je Ecke`, m.material.vertexColors === true)
  }

  // Himmel und Dunst.
  const himmel = nach.get('himmel')
  if (himmel) {
    wahr(`${name}: Himmel von innen, ohne Dunst und Tiefe`, himmel.material.side === BackSide && himmel.material.fog === false && himmel.material.depthWrite === false)
    const treffer = []
    himmel.raycast({}, treffer)
    wahr(`${name}: Himmel nicht anklickbar`, treffer.length === 0)
    const kam = new PerspectiveCamera()
    kam.position.set(5, 7, -3)
    kam.updateMatrixWorld()
    himmel.onBeforeRender(null, null, kam, himmel.geometry, himmel.material, null)
    const e = himmel.matrixWorld.elements
    wahr(`${name}: Himmel folgt der Kamera`, e[12] === 5 && e[13] === 7 && e[14] === -3)
  }
  wahr(`${name}: Dunst und Hintergrund`, w.nebel.near === 80 && w.nebel.far === 270 && w.himmel === F.himmelUnten && '#' + w.nebel.color.getHexString() === F.himmelUnten)

  // Die Wohnung bleibt frei: kein Dreieck im Kasten (Welt).
  if (rahmen && haus) {
    const drin = inWohnung(meshes, rahmen, haus.geschossHoehe)
    wahr(`${name}: kein Dreieck in der Wohnung (${drin})`, drin === 0)
  }

  // Ebenen.
  const E = w.ebenen
  if (haus) {
    const g = wohnung.geschoss
    const gh = haus.geschossHoehe
    // E87: hinter dem Garten je Geschoss mit Treppe hinauf ein Zwischenpodest.
    wahr(`${name}: Ebenen = Geschosse + Garten + Zwischenpodeste (${E.length})`, E.length === 2 * haus.geschosse)
    for (let k = 0; k < haus.geschosse; k++) {
      nahe(`${name}: Ebene ${k} Hoehe`, E[k].y, (k - g) * gh, 1e-9)
      wahr(`${name}: Ebene ${k} Name`, E[k].name === (k === 0 ? 'EG' : `${k}. OG`))
      // Ohne Rahmen (Gast, E86) heisst auch das Geschoss der Wohnung wie die anderen.
      wahr(`${name}: Ebene ${k} Kennung`, E[k].id === (k === g && rahmen ? 'wohnung' : `geschoss-${k}`))
    }
    const garten = E[haus.geschosse]
    wahr(`${name}: Garten nach den Geschossen`, garten.id === 'garten' && garten.name === 'Garten')
    nahe(`${name}: Garten Hoehe`, garten.y, -g * gh, 1e-9)
    for (let k = 0; k + 1 < haus.geschosse; k++) {
      const e = E[haus.geschosse + 1 + k]
      wahr(`${name}: Zwischenpodest ${k}`, !!e && e.id === `${haus.id}:${k}.5` && e.name === `Zwischenpodest ${k === 0 ? 'EG' : `${k}. OG`}`)
      if (e) nahe(`${name}: Zwischenpodest ${k} Hoehe`, e.y, (k + 0.5 - g) * gh, 1e-9)
    }
    nahe(`${name}: Wohnung bei 0`, E[g].y, 0, 1e-12)
  } else {
    wahr(`${name}: nur Garten`, E.length === 1 && E[0].id === 'garten' && E[0].y === 0)
  }
  for (const e of E) {
    wahr(`${name}: ${e.name} hat Hindernisse (${e.hindernisse.length})`, e.hindernisse.length > 0)
    wahr(
      `${name}: ${e.name} Hindernisse gueltig`,
      e.hindernisse.every((h) => [h.x, h.z, h.laenge, h.tiefe, h.drehY].every(Number.isFinite) && h.laenge > 0 && h.tiefe > 0),
    )
  }
  // Treppen im Kern des eigenen Hauses (E87) und das Ziel in der Wohnung.
  if (haus) {
    const L = lage(wohnung)
    treppenPruefen(name, w, {
      id: haus.id,
      gh: haus.geschossHoehe,
      geschosse: E.slice(0, haus.geschosse).map((e) => e.id),
      stiegen: kernRechtecke(haus, L.welt),
      meshes: [nach.get('bauten'), nach.get('gelaende')],
    })
    eigenePruefen(name, w, wohnung, rahmen, wohnung.geschoss, [haus.umriss.map(L.welt)])
  } else eigenePruefen(name, w, wohnung, rahmen, -1, [])
  // Spielgeraete stehen als Hindernisse im Garten (Mitte im Spielplatz).
  if (aussen.spielplatz) {
    const garten = E.find((e) => e.id === 'garten')
    const L = wohnung ? lage(wohnung) : null
    const pw = aussen.spielplatz.map((p) => (L ? L.welt(p) : p))
    const innen = (p, poly) => {
      let d = false
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const a = poly[i]
        const b = poly[j]
        if (a[1] > p[1] !== b[1] > p[1] && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) d = !d
      }
      return d
    }
    if (L) {
      const imSpiel = garten.hindernisse.filter((h) => innen([h.x, h.z], pw)).length
      wahr(`${name}: Spielgeraete im Garten (${imSpiel})`, imSpiel >= 3)
      // E87: auf Baenke (Sitz 0,47 m) und die Sandkiste (Rahmen 0,3 m) kommt man hinauf.
      const baenke = garten.hindernisse.filter((h) => innen([h.x, h.z], pw) && h.oben === 0.47).length
      const sand = garten.hindernisse.filter((h) => innen([h.x, h.z], pw) && h.oben === 0.3).length
      wahr(`${name}: Baenke und Sandkiste mit Oberkante (${baenke}, ${sand})`, baenke >= 1 && sand === 1 && 0.3 <= STUFE_M)
      const hoch = garten.hindernisse.filter((h) => innen([h.x, h.z], pw) && h.oben === undefined).length
      wahr(`${name}: Schaukel und Turm ohne Oberkante (${hoch})`, hoch >= 1)
    }
    // Buesche (und ohne Stadt Hecken) mit Oberkante bis gut einen Meter.
    const gruen = garten.hindernisse.filter((h) => h.oben !== undefined && h.oben > 0.5 && h.oben <= 1.16)
    wahr(`${name}: Buesche und Hecken mit Oberkante (${gruen.length})`, gruen.length >= 3)
  }

  // Gang: Luecke vor der Wohnungstuer nur auf ihrem Geschoss, Gelaender.
  if (haus && rahmen) {
    const L = lage(wohnung)
    const gk = gangKante(haus.umriss)
    const ecken = [
      [rahmen[0], rahmen[1]],
      [rahmen[2], rahmen[1]],
      [rahmen[2], rahmen[3]],
      [rahmen[0], rahmen[3]],
    ]
      .map((p) => L.lokal(p))
      .map((p) => ({ t: (p[0] - gk.a[0]) * gk.u[0] + (p[1] - gk.a[1]) * gk.u[1], s: (p[0] - gk.a[0]) * gk.n[0] + (p[1] - gk.a[1]) * gk.n[1] }))
      .sort((x, y) => y.s - x.s)
    const tTuer = (ecken[0].t + ecken[1].t) / 2
    const punkt = (t, s) => L.welt([gk.a[0] + gk.u[0] * t + gk.n[0] * s, gk.a[1] + gk.u[1] * t + gk.n[1] * s])
    const g = wohnung.geschoss
    const wE = E[g]
    let luecke = true
    for (let t = tTuer - 0.55; t <= tTuer + 0.55; t += 0.05) {
      const p = punkt(t, -0.15)
      if (!frei(wE, p[0], p[1], 0)) luecke = false
    }
    wahr(`${name}: Luecke 1,2 m in der Fassade vor der Tuer`, luecke)
    const mitte = [(rahmen[0] + rahmen[2]) / 2, (rahmen[1] + rahmen[3]) / 2]
    wahr(`${name}: von der Wohnung auf den Gang frei`, wegFrei(wE, mitte, punkt(tTuer, 0.8), 0.23))
    // Ein anderes Obergeschoss: dort ist die Fassade an der Stelle zu.
    const andere = g === haus.geschosse - 1 ? g - 1 : g + 1
    const p = punkt(tTuer, -0.15)
    wahr(`${name}: auf Geschoss ${andere} keine Luecke`, !frei(E[andere], p[0], p[1], 0))
    // Gelaender: vom Gang nicht hinaus (Obergeschoss, weit weg vom Kern).
    const ob = g >= 1 ? g : 1
    const tG = Math.min(2.5, gk.l / 4)
    const tW = gk.u[0] > 0 ? tG : gk.l - tG
    wahr(`${name}: Gang frei (${ob}. OG)`, frei(E[ob], ...punkt(tW, 0.8), 0.23))
    wahr(`${name}: Gelaender haelt am Gang (${ob}. OG)`, !wegFrei(E[ob], punkt(tW, 0.8), punkt(tW, 2.6), 0.23))
    // Drehung: die Wand am Gang laeuft wie die Fassade.
    const fa = punkt(0, 0)
    const fb = punkt(gk.l, 0)
    const lang = E[andere].hindernisse.find((h) => Math.abs(h.laenge - gk.l) < 1e-6 && Math.abs(h.tiefe - 0.3) < 1e-6)
    wahr(`${name}: Wand am Gang als Hindernis`, !!lang)
    if (lang) {
      const d = [Math.cos(lang.drehY), -Math.sin(lang.drehY)]
      const f = [(fb[0] - fa[0]) / gk.l, (fb[1] - fa[1]) / gk.l]
      nahe(`${name}: Drehung der Wand wie die Fassade`, Math.abs(d[0] * f[0] + d[1] * f[1]), 1, 1e-6)
    }
  }

  // Aufzug.
  if (haus) {
    const N = haus.geschosse
    const g = wohnung.geschoss
    const I = w.interaktiv
    wahr(`${name}: Knoepfe da`, !!I)
    if (I) {
      const ruf = I.objekte.filter((o) => o.userData.aufzug === 'ruf')
      const fahre = I.objekte.filter((o) => o.userData.aufzug === 'fahre')
      wahr(`${name}: je Geschoss ein Rufknopf`, ruf.length === N && ruf.every((o, i) => o.userData.ebene === i))
      wahr(`${name}: je Geschoss ein Fahrknopf`, fahre.length === N && fahre.every((o, i) => o.userData.ebene === i))
      const v = new Vector3()
      for (const o of ruf) {
        o.getWorldPosition(v)
        nahe(`${name}: Rufknopf ${o.userData.ebene} auf Hoehe`, v.y - E[o.userData.ebene].y, 1.075, 1e-6)
      }
      wahr(`${name}: Kabine als Rechteck`, Array.isArray(w.kabine) && w.kabine.length === 4)
      const kab = nach.get('kabine')
      kab.getWorldPosition(v)
      nahe(`${name}: Kabine steht am Geschoss der Wohnung`, v.y, 0, 1e-9)
      const box = kab.geometry.boundingSphere
      const cw = box.center.clone().applyMatrix4(kab.matrixWorld)
      wahr(`${name}: Kabinenrechteck um die Kabine`, cw.x > w.kabine[0] && cw.x < w.kabine[2] && cw.z > w.kabine[1] && cw.z < w.kabine[3])
      wahr(`${name}: anfangs keine Fahrt`, w.fahrt() === null && aufzugZiel(w) === null && w.schritt(0.016, 1.6) === false)

      const tueren = nach.get('aufzugTueren')
      const tuerVorher = Float32Array.from(tueren.geometry.attributes.position.array)
      /** Bis zur Ruhe laufen lassen: Ankuenfte, Zeit, Hoehen der Fahrt. */
      const laufen = () => {
        const ank = []
        const ys = []
        let zeit = 0
        for (let i = 0; i < 4000; i++) {
          const weiter = w.schritt(1 / 60, 1.6)
          zeit += 1 / 60
          const f = w.fahrt()
          if (f) ys.push(f.y)
          const a = aufzugZiel(w)
          if (a !== null) ank.push(a)
          if (!weiter) break
        }
        return { ank, ys, zeit }
      }
      const ziel = g === 0 ? N - 1 : 0
      const knopf = fahre[ziel]
      I.tippen(knopf)
      wahr(`${name}: gedrueckter Knopf leuchtet`, knopf.material !== fahre[g].material)
      const f0 = w.fahrt()
      wahr(`${name}: Fahrt meldet Ziel`, !!f0 && f0.ziel === ziel)
      const r1 = laufen()
      wahr(`${name}: genau eine Ankunft (${r1.ank})`, r1.ank.length === 1 && r1.ank[0] === ziel)
      const soll = FAHRT_JE * Math.abs(ziel - g) + TUER
      nahe(`${name}: Dauer der Fahrt`, r1.zeit, soll, 0.1)
      const steigend = E[ziel].y > E[g].y
      wahr(`${name}: Hoehe laeuft in eine Richtung`, r1.ys.every((y, i) => i === 0 || (steigend ? y >= r1.ys[i - 1] - 1e-9 : y <= r1.ys[i - 1] + 1e-9)))
      nahe(`${name}: Fahrt endet auf der Ebene`, r1.ys[r1.ys.length - 1], E[ziel].y, 1e-9)
      kab.updateMatrixWorld(true)
      kab.getWorldPosition(v)
      nahe(`${name}: Kabine am Ziel`, v.y, E[ziel].y, 1e-9)
      wahr(`${name}: danach keine Fahrt`, w.fahrt() === null && aufzugZiel(w) === null)
      wahr(`${name}: Knopf wieder aus`, knopf.material === fahre[g].material)
      const tuerNach = tueren.geometry.attributes.position.array
      let bewegt = 0
      for (let i = 0; i < tuerNach.length; i++) if (Math.abs(tuerNach[i] - tuerVorher[i]) > 0.4) bewegt++
      wahr(`${name}: Tueren am Ziel offen (${bewegt})`, bewegt > 0)
      // Rufen am selben Geschoss bei offener Tuer: nichts faehrt.
      I.tippen(ruf[ziel])
      wahr(`${name}: Ruf am selben Geschoss faehrt nicht`, w.fahrt() === null && w.schritt(0.016, 1.6) === false && aufzugZiel(w) === null)
      // Zwei Wuensche hintereinander: erst der eine, dann der andere.
      const z1 = g
      const z2 = g === 0 ? 1 : g - 1 === ziel ? g : g - 1
      I.tippen(fahre[z1])
      I.tippen(ruf[z2])
      const r2 = laufen()
      wahr(`${name}: zwei Ankuenfte der Reihe nach (${r2.ank})`, r2.ank.length === (z1 === z2 ? 1 : 2) && r2.ank[0] === z1 && r2.ank[r2.ank.length - 1] === z2)
      // Unsinniges Tippen bleibt ohne Folgen.
      I.tippen({ userData: { aufzug: 'fahre', ebene: 99 } })
      I.tippen({ userData: {} })
      wahr(`${name}: unsinniges Tippen ohne Fahrt`, w.fahrt() === null && w.schritt(0.016, 1.6) === false)
    }
  } else {
    wahr(`${name}: ohne Wohnung keine Knoepfe`, w.interaktiv === null && w.fahrt() === null && w.kabine === null && w.schritt(0.016, 1.6) === false)
  }

  // Sprungziele (E84): Haustueren und Spielplatz, frei, auf gueltigen Ebenen.
  const S = w.sprungziele
  wahr(
    `${name}: Sprungziele gueltig`,
    Array.isArray(S) && S.every((s) => Number.isInteger(s.ebene) && s.ebene >= 0 && s.ebene < E.length && [s.x, s.z, s.gier].every(Number.isFinite)),
  )
  if (aussen.spielplatz) wahr(`${name}: Sprungziel Spielplatz`, S.filter((s) => s.name === 'Spielplatz').length === 1)
  const haustueren = S.filter((s) => s.name.startsWith('Eingang '))
  wahr(`${name}: Sprungziele vor den Haustueren (${haustueren.length})`, haustueren.length >= 4 && new Set(haustueren.map((s) => s.name)).size === haustueren.length)
  for (const s of S) wahr(`${name}: Sprungziel ${s.name} frei`, frei(E[s.ebene], s.x, s.z, 0.2))
  startPruefen(name, w, wohnung)

  // Karte (E86) in Weltmetern: lokal -> Welt ueber die Lage der Siedlung.
  {
    const LG = lageVon(w)
    const welt = (p) => {
      const v = new Vector3(p[0], 0, p[1]).applyMatrix4(LG.matrixWorld)
      return [v.x, v.z]
    }
    kartePruefen(name, w, welt, aussen)
    // Die Wohnung liegt im Umriss ihres Hauses (Mitte des Rahmens, Welt).
    if (haus && rahmen) {
      const k = w.karte.haeuser[HAEUSER.indexOf(haus)]
      wahr(`${name}: Karte: Wohnung im Umriss ihres Hauses`, !!k && imVieleck([(rahmen[0] + rahmen[2]) / 2, (rahmen[1] + rahmen[3]) / 2], k.punkte))
    }
  }
  // Ohne Plaene baut kamera() nichts und schaltet nichts um.
  w.kamera(0, 1.6, 0)
  wahr(`${name}: ohne Plaene nichts innen`, meshesVon(w.gruppe).every((m) => !m.name.startsWith('innen')) && w.gruppe.userData.innen === 0)

  // Was draussen steht.
  const u = w.gruppe.userData
  wahr(`${name}: Strasse im Osten (${u.strasse})`, u.strasse === 'ost')
  wahr(`${name}: Baeume (${u.baeume})`, u.baeume >= 12)
  wahr(`${name}: Hecken (${u.hecken})`, u.hecken >= 2)
  wahr(`${name}: Parkplatz (${u.parkplaetze}, ${u.autos} Autos)`, u.parkplaetze >= 4)
  if (aussen.spielplatz) wahr(`${name}: Spielgeraete (${u.spielgeraete})`, u.spielgeraete >= 4)
  wahr(`${name}: Kern genau mit Wohnung`, u.kern === !!wohnung)

  // Loch in der Wiese fuer die Rampe: kein Dreieck der Wiese mit Mitte darin.
  if (aussen.tiefgarage) {
    const t = aussen.tiefgarage
    const d = [Math.cos((t.drehung * Math.PI) / 180), Math.sin((t.drehung * Math.PI) / 180)]
    const boden = nach.get('boden')
    const p = boden.geometry.attributes.position
    const v = new Vector3()
    const L = wohnung ? lage(wohnung) : null
    // Ohne Wohnung ist die Siedlung nur verschoben (lokal = Welt - Lage).
    const verschub = w.gruppe.children.find((x) => x.name === 'siedlungLage').position
    let drin = 0
    for (let i = 0; i < p.count; i += 3) {
      let cx = 0
      let cz = 0
      for (let j = 0; j < 3; j++) {
        v.fromBufferAttribute(p, i + j).applyMatrix4(boden.matrixWorld)
        cx += v.x / 3
        cz += v.z / 3
      }
      // Welt -> lokal der Siedlung.
      const [lx, lz] = L ? L.lokal([cx, cz]) : [cx - verschub.x, cz - verschub.z]
      const a = (lx - t.x) * d[0] + (lz - t.z) * d[1]
      const b = -(lx - t.x) * d[1] + (lz - t.z) * d[0]
      if (Math.abs(a) < t.laenge / 2 - 0.05 && Math.abs(b) < t.breite / 2 - 0.05) drin++
    }
    wahr(`${name}: Wiese hat ein Loch fuer die Rampe (${drin})`, drin === 0)
  }

  return { w, summe, zeit, aufrufe: sichtbar.length }
}

const FAHRT_JE = 1.2
const TUER = 0.6

/** Ecke fuer Ecke gleich? */
function gleich(name, a, b) {
  const ma = meshesVon(a.gruppe)
  const mb = meshesVon(b.gruppe)
  wahr(`${name}: gleich viele Meshes`, ma.length === mb.length)
  ma.forEach((m, i) => {
    const n = mb[i]
    if (!n) return
    wahr(`${name}: gleiche Namen`, m.name === n.name)
    for (const attr of ['position', 'normal', 'color']) {
      const x = m.geometry.attributes[attr]?.array
      const y = n.geometry.attributes[attr]?.array
      if (!x && !y) continue
      let ok = !!x && !!y && x.length === y.length
      for (let k = 0; ok && k < x.length; k++) if (x[k] !== y[k]) ok = false
      wahr(`${name}: ${m.name} ${attr} gleich`, ok)
    }
  })
  wahr(`${name}: gleiche Ebenen`, JSON.stringify(a.ebenen) === JSON.stringify(b.ebenen))
}

/** dispose() gibt alles frei, auch zweimal; danach ist alles still. */
/** Fahrzeuge teilen Geometrie, Lack und Materialien ueber alle Welten
 *  (fahrzeug3d.ts, mit Zaehlern): die gibt ihr eigenes dispose() frei,
 *  wenn kein Fahrzeug sie mehr braucht. Hier zaehlt, was die Siedlung baut;
 *  dass sie jedes Fahrzeug freigibt, prueft fahrzeugeFrei. */
const istFahrzeug = (m) => {
  for (let x = m; x; x = x.parent) if (typeof x.name === 'string' && x.name.startsWith('fahrzeug:')) return true
  return false
}
function freigeben(name, w) {
  const offen = new Set()
  const fahrzeuge = Array.isArray(w.fahrzeuge) ? w.fahrzeuge.slice() : []
  const fzFrei = new Set()
  for (const f of fahrzeuge) {
    const alt = f.dispose.bind(f)
    f.dispose = () => {
      fzFrei.add(f)
      alt()
    }
  }
  for (const m of meshesVon(w.gruppe)) {
    if (istFahrzeug(m)) continue
    for (const x of [m.geometry, m.material]) {
      if (offen.has(x)) continue
      offen.add(x)
      x.addEventListener('dispose', () => offen.delete(x))
    }
  }
  try {
    w.dispose()
    w.dispose()
  } catch (e) {
    console.log('ABWEICHUNG', name, 'dispose wirft', e)
    fehler++
  }
  wahr(`${name}: alles freigegeben (${offen.size} offen)`, offen.size === 0)
  wahr(`${name}: jedes Fahrzeug freigegeben (${fzFrei.size} von ${fahrzeuge.length})`, fzFrei.size === fahrzeuge.length)
  wahr(`${name}: Gruppe leer`, w.gruppe.children.length === 0)
  wahr(`${name}: nach dispose still`, w.schritt(0.1, 1.6) === false && w.fahrt() === null && aufzugZiel(w) === null)
  if (w.interaktiv) w.interaktiv.tippen(w.interaktiv.objekte[0])
}

let hoechst = 0
let hoechstAufrufe = 0
let langsamst = 0
for (const [name, wohnung, rahmen] of FAELLE) {
  const a = pruefen(name, wohnung, rahmen)
  const b = bau({ siedlung: siedlung(wohnung), farben: F, wohnungRahmen: rahmen })
  // Vergleich mit einem frischen Bau (a ist durch die Fahrten veraendert).
  const c = bau({ siedlung: siedlung(wohnung), farben: F, wohnungRahmen: rahmen })
  gleich(name, b, c)
  beweglichePruefen(name, b, c)
  rahmenPruefen(name, b)
  erzeugenPruefen(name, c)
  hoechst = Math.max(hoechst, a.summe)
  hoechstAufrufe = Math.max(hoechstAufrufe, a.aufrufe)
  langsamst = Math.max(langsamst, a.zeit)
  freigeben(name, a.w)
  freigeben(`${name} (b)`, b)
  freigeben(`${name} (c)`, c)
}

// Ohne Draussen (kein Spielplatz, keine Rampe, keine Wege), Wohnung ohne Rahmen.
{
  const leer = { spielplatz: null, tiefgarage: null, wege: [] }
  const r = pruefen('Ohne Draussen', { grundrissId: 'g1', gebaeudeId: 'h5', geschoss: 1, x: -24, z: -50.96, drehung: 0 }, null, leer)
  freigeben('Ohne Draussen', r.w)
}

// Gaeste (E86): dieselbe Siedlung mit derselben Wohnung, aber ohne Rahmen
// (die eingerichtete Wohnung sieht nur der Besitzer). Gleiche Welt, nichts
// ausgespart, kein 'wohnung'.
for (const [name, wohnung, rahmen] of FAELLE) {
  if (!wohnung) continue
  const n = `${name}, Gast`
  const besitzer = bau({ siedlung: siedlung(wohnung), farben: F, wohnungRahmen: rahmen })
  const gast = pruefen(n, wohnung, null).w
  gleicheWelt(n, besitzer, gast)
  // E87b: dasselbe Auto hat bei Besitzer und Gast dieselbe Kennung (beim
  // Besitzer fehlen hoechstens welche neben der eingerichteten Wohnung).
  const gastFz = new Map(gast.fahrzeuge.map((f) => [f.id, f]))
  wahr(`${n}: Fahrzeuge des Besitzers beim Gast mit derselben Kennung an derselben Stelle`, besitzer.fahrzeuge.length > 0 && besitzer.fahrzeuge.every((f) => {
    const g = gastFz.get(f.id)
    return !!g && g.art === f.art && Math.abs(g.x - f.x) < 1e-9 && Math.abs(g.z - f.z) < 1e-9
  }))
  wahr(`${n}: Dinge des Besitzers beim Gast mit derselben Kennung`, besitzer.dinge.every((d) => gast.dinge.some((q) => q.id === d.id)))
  const haus = HAEUSER.find((h) => h.id === wohnung.gebaeudeId)
  const drin = inWohnung(meshesVon(gast.gruppe), rahmen, haus.geschossHoehe, true)
  wahr(`${n}: Fassade dort nicht ausgespart (${drin} Dreiecke)`, drin > 0)
  freigeben(`${n} (Besitzer)`, besitzer)
  freigeben(n, gast)
}

// E87b: Siedlungsmeter haengen nicht an der Wohnung. Dieselbe Siedlung mit
// Wohnungen an verschiedenen Stellen (gedreht, abgesenkt) und ohne: jedes
// Fahrzeug und Ding liegt in Siedlungsmetern gleich, die Welt nicht.
{
  const welten = FAELLE.map(([, wohnung, rahmen]) => bau({ siedlung: siedlung(wohnung), farben: F, wohnungRahmen: rahmen }))
  const inSiedlung = (w) => new Map([...w.fahrzeuge.map((f) => [f.id, [f.x, f.z, f.gier]]), ...w.dinge.map((d) => [d.id, [d.objekt.position.x, d.objekt.position.z, 0]])].map(([id, [x, z, g]]) => {
    const s1 = w.rahmen.zuSiedlung(x, 0, z, g)
    return [id, s1]
  }))
  const karten = welten.map(inSiedlung)
  let gemeinsam = 0
  let anders = 0
  let weltAnders = 0
  for (const [id, s0] of karten[0]) {
    for (let i = 1; i < karten.length; i++) {
      const s1 = karten[i].get(id)
      if (!s1) continue
      gemeinsam++
      if (Math.abs(s1[0] - s0[0]) > 1e-9 || Math.abs(s1[2] - s0[2]) > 1e-9 || (id.startsWith('siedlung:f') && Math.abs(Math.atan2(Math.sin(s1[3] - s0[3]), Math.cos(s1[3] - s0[3]))) > 1e-9)) anders++
      const f0 = welten[0].fahrzeuge.find((f) => f.id === id)
      const f1 = welten[i].fahrzeuge.find((f) => f.id === id)
      if (f0 && f1 && Math.hypot(f0.x - f1.x, f0.z - f1.z) > 0.5) weltAnders++
    }
  }
  wahr(`Siedlungsmeter gleich, egal wo die Wohnung liegt (${anders} von ${gemeinsam} anders)`, gemeinsam > 20 && anders === 0)
  wahr(`dabei liegen die Fahrzeuge in der Welt woanders (${weltAnders})`, weltAnders > 0)
  welten.forEach((w, i) => freigeben(`Siedlungsmeter ${i}`, w))
}

// Unsinnige Daten werfen laut.
const wirft = (name, siedlungDaten, rahmen = RAHMEN) => {
  let geworfen = false
  try {
    bau({ siedlung: siedlungDaten, farben: F, wohnungRahmen: rahmen })
  } catch {
    geworfen = true
  }
  wahr(`${name} wirft`, geworfen)
}
const w0 = FAELLE[0][1]
wirft('unbekanntes Haus', siedlung({ ...w0, gebaeudeId: 'gibt-es-nicht' }))
wirft('Geschoss zu hoch', siedlung({ ...w0, geschoss: 4 }))
wirft('Drehung 45', siedlung({ ...w0, drehung: 45 }))
wirft('Lage NaN', siedlung({ ...w0, x: Number.NaN }))
wirft('Rahmen NaN', siedlung(w0), [0, 0, Number.NaN, 1])
wirft('keine Haeuser', { ...siedlung(null), gebaeude: [] })
wirft('Umriss mit zwei Punkten', { ...siedlung(null), gebaeude: [{ ...HAEUSER[0], umriss: [[0, 0], [5, 0]] }] })
wirft('Umriss mit NaN', { ...siedlung(null), gebaeude: [{ ...HAEUSER[0], umriss: [[0, 0], [5, Number.NaN], [5, 5]] }] })
wirft('Geschosshoehe 0', { ...siedlung(null), gebaeude: [{ ...HAEUSER[0], geschossHoehe: 0 }] })
wirft('Weg mit einem Punkt', siedlung(null, { ...AUSSEN, wege: [[[0, 0]]] }))
wirft('Kennung doppelt', { ...siedlung(null), gebaeude: [HAEUSER[0], { ...HAEUSER[1], id: 'h1' }] })
wahr('aufzugZiel fremder Welt ist null', aufzugZiel({ gruppe: null, nebel: null, himmel: null, ebenen: [], interaktiv: null, dispose() {} }) === null)

/* ------------------------------------------------ Innen (E84) */

/* Erfundenes Haus mit Plaenen in Haus 5 (Plan in cm ab der Ecke
 * (-32,6; -51,0) m, nicht gedreht): Wohnung A (vier Raeume) und B (drei
 * Raeume und Terrasse oder Balkon) mit gemeinsamer Wand bei x = 1700, der
 * Gang davor, Stiege und Aufzug am Westende; zwei Geschosse. */
const oeff = (raum, art, kante, abstand_cm, breite_cm, extra = {}) => ({
  raum,
  art,
  kante,
  abstand_cm,
  breite_cm,
  hoehe_cm: art === 'fenster' ? 140 : 210,
  bruestung_cm: art === 'fenster' ? 90 : 0,
  anschlag: 'links',
  aufschlag: 'innen',
  ...extra,
})
function innenGeschoss(k) {
  const a = {
    top: `X${k}1`,
    typ: 'A',
    raeume: [
      { name: 'Wohnkueche', art: 'innen', punkte: [[700, 0], [1300, 0], [1300, 650], [700, 650]] },
      { name: 'Zimmer', art: 'innen', punkte: [[1300, 0], [1700, 0], [1700, 400], [1300, 400]] },
      { name: 'Bad', art: 'innen', punkte: [[1300, 400], [1500, 400], [1500, 650], [1300, 650]] },
      { name: 'VR', art: 'innen', punkte: [[1500, 400], [1700, 400], [1700, 650], [1500, 650]] },
    ],
    // Tuer VR-Zimmer, Wohnungstuer, Fenster, Durchgang, Tuer Bad-VR.
    oeffnungen: [oeff(3, 'tuer', 0, 60, 80), oeff(3, 'tuer', 2, 50, 100), oeff(0, 'fenster', 0, 50, 150), oeff(0, 'durchgang', 1, 100, 90), oeff(2, 'tuer', 1, 60, 80)],
    moebel: [
      { name: 'Kuechenzeile', x: 900, y: 6, breite_cm: 240, tiefe_cm: 60, drehung: 0 },
      { name: 'WC', x: 1440, y: 644, breite_cm: 40, tiefe_cm: 55, drehung: 180 },
      { name: 'Waschbecken', x: 1306, y: 600, breite_cm: 60, tiefe_cm: 45, drehung: 270 },
      { name: 'Badewanne', x: 1305, y: 405, breite_cm: 170, tiefe_cm: 75, drehung: 0 },
      // Moebel ausser Kueche und Bad werden nicht gebaut.
      { name: 'Bett', x: 1350, y: 50, breite_cm: 160, tiefe_cm: 200, drehung: 0 },
    ],
    eingang: [1600, 662],
  }
  const draussen =
    k === 0
      ? { name: 'Terrasse', art: 'draussen', punkte: [[1700, -300], [2700, -300], [2700, 0], [1700, 0]] }
      : { name: 'Balkon', art: 'draussen', punkte: [[1900, -150], [2300, -150], [2300, 0], [1900, 0]] }
  const b = {
    top: `X${k}2`,
    typ: 'B',
    raeume: [
      { name: 'Wohnkueche', art: 'innen', punkte: [[1700, 0], [2700, 0], [2700, 400], [1700, 400]] },
      { name: 'Bad', art: 'innen', punkte: [[1700, 400], [2000, 400], [2000, 650], [1700, 650]] },
      { name: 'VR', art: 'innen', punkte: [[2000, 400], [2700, 400], [2700, 650], [2000, 650]] },
      draussen,
    ],
    oeffnungen: [oeff(2, 'tuer', 2, 300, 100), oeff(2, 'tuer', 0, 100, 90), oeff(0, 'tuer', 0, 250, 100, { aufschlag: 'aussen' })],
    moebel: [{ name: 'Kuechenzeile', x: 2400, y: 6, breite_cm: 280, tiefe_cm: 60, drehung: 0 }],
    eingang: [2350, 662],
  }
  return {
    geschoss: k,
    wohnungen: [a, b],
    allgemein: [
      { art: 'gang', punkte: [[0, 650], [2700, 650], [2700, 900], [0, 900]] },
      { art: 'stiege', punkte: [[0, 100], [200, 100], [200, 650], [0, 650]] },
      { art: 'aufzug', punkte: [[200, 445], [410, 445], [410, 650], [200, 650]] },
    ],
  }
}
const INNEN = [{ gebaeudeId: 'h5', x: -32.6, z: -51.0, drehung: 0, geschosse: [innenGeschoss(0), innenGeschoss(1)] }]
/** Plan (cm) im Haus mit Plaenen -> lokal (m). */
const planLokal = ([x, y]) => [-32.6 + x / 100, -51.0 + y / 100]
const mitInnen = (wohnung, innen = INNEN) => ({ ...siedlung(wohnung), innen })

function sichtbarAlle(o) {
  for (let x = o; x; x = x.parent) if (!x.visible) return false
  return true
}
/** Zeichenaufrufe: sichtbare Meshes mit sichtbarem Material. */
function aufrufeVon(o) {
  let n = 0
  o.traverse((m) => {
    if (m.isMesh && sichtbarAlle(m) && m.material.visible !== false) n++
  })
  return n
}
function dreieckeVon(o) {
  let n = 0
  o.traverse((m) => {
    if (m.isMesh && m.material.visible !== false) n += dreiecke(m)
  })
  return n
}
const nachName = (w, name) => meshesVon(w.gruppe).find((m) => m.name === name) ?? null
/** Bis zur Ruhe schritt() rufen (Bau der uebrigen Geschosse, Aufzug). */
function ruhe(w, y = 1.6) {
  let n = 0
  while (w.schritt(1 / 60, y) && n < 5000) n++
  return n
}

const INNEN_FAELLE = [
  ['Innen, Wohnung im 1. OG', { grundrissId: 'g1', gebaeudeId: 'h5', geschoss: 1, x: -24, z: -50.96, drehung: 0 }, RAHMEN],
  ['Innen, ohne Wohnung', null, null],
  ['Innen, Wohnung in Haus 4', { grundrissId: 'g1', gebaeudeId: 'h4', geschoss: 3, x: 20, z: -72.5, drehung: 90 }, RAHMEN],
  ['Innen, Wohnung im EG gedreht', { grundrissId: 'g1', gebaeudeId: 'h5', geschoss: 0, x: -6.5, z: -38.8, drehung: 180 }, RAHMEN],
  // Gaeste (E86): dieselben Wohnungen ohne Rahmen.
  ['Innen, Gast, Wohnung im 1. OG', { grundrissId: 'g1', gebaeudeId: 'h5', geschoss: 1, x: -24, z: -50.96, drehung: 0 }, null],
  ['Innen, Gast, Wohnung im EG gedreht', { grundrissId: 'g1', gebaeudeId: 'h5', geschoss: 0, x: -6.5, z: -38.8, drehung: 180 }, null],
]
/** Gaerten der Haeuser mit Plaenen fuer die Karte: die Terrasse von B im EG. */
const INNEN_GAERTEN = [innenGeschoss(0).wohnungen[1].raeume[3].punkte]

function innenPruefen(name, wohnung, rahmen) {
  const w = bau({ siedlung: mitInnen(wohnung), farben: F, wohnungRahmen: rahmen })
  w.gruppe.updateMatrixWorld(true)
  ABDRUCK[name] = abdruck(w)
  const LG = w.gruppe.children.find((x) => x.name === 'siedlungLage')
  /** Lokal (Meter, Hoehe lokal) -> Welt als Vector3. */
  const welt3 = (p, y = 0) => new Vector3(p[0], y, p[1]).applyMatrix4(LG.matrixWorld)
  /** Plan (cm) -> Welt (x, z). */
  const plan = (p) => {
    const v = welt3(planLokal(p))
    return [v.x, v.z]
  }
  const gh = 3
  // Die Lage haengt an der Wohnung, die Ebene 'wohnung' auch am Rahmen (E86).
  const g = wohnung ? wohnung.geschoss : 0
  const eigen = !!wohnung && !!rahmen
  const E = w.ebenen

  /* Ebenen: Boden, dann je Haus die Obergeschosse. */
  const soll = [{ id: eigen && g === 0 ? 'wohnung' : 'boden', name: 'EG', y: -g * gh }]
  if (wohnung && wohnung.gebaeudeId !== 'h5') {
    const h = HAEUSER.find((x) => x.id === wohnung.gebaeudeId)
    for (let k = 1; k < h.geschosse; k++) soll.push({ id: eigen && k === g ? 'wohnung' : `${h.id}:${k}`, name: `${h.name} ${k}. OG`, y: (k - g) * gh })
  }
  soll.push({ id: eigen && wohnung.gebaeudeId === 'h5' && g === 1 ? 'wohnung' : 'h5:1', name: 'Haus 5 1. OG', y: (1 - g) * gh })
  // E87: dahinter die Zwischenpodeste (eigenes Haus ohne Plaene am Kern, dann Haus 5).
  const podeste = [...(wohnung && wohnung.gebaeudeId !== 'h5' ? [0, 1, 2, 3].map((k) => `${wohnung.gebaeudeId}:${k}.5`) : []), 'h5:0.5']
  wahr(
    `${name}: Ebenen ${E.map((e) => e.id).join(',')}`,
    E.length === soll.length + podeste.length &&
      soll.every((s, i) => E[i].id === s.id && E[i].name === s.name && Math.abs(E[i].y - s.y) < 1e-9) &&
      podeste.every((id, i) => E[soll.length + i].id === id),
  )
  const iOG = E.findIndex((e) => e.name === 'Haus 5 1. OG')
  for (const e of E) {
    wahr(`${name}: ${e.name} hat Hindernisse`, e.hindernisse.length > 0)
    wahr(`${name}: ${e.name} Hindernisse gueltig`, e.hindernisse.every((h) => [h.x, h.z, h.laenge, h.tiefe, h.drehY].every(Number.isFinite) && h.laenge > 0 && h.tiefe > 0))
  }

  /* Waende im EG: gemeinsame nur einmal, Dicken, Luecken. */
  const unten = E[0]
  const bodenFrei = unten.id === 'boden'
  if (bodenFrei) {
    const bei = (p) => unten.hindernisse.filter((h) => abstandHindernis(h, ...plan(p)) < 1e-6)
    const trenn = bei([1700, 250])
    wahr(`${name}: Wand zwischen A und B einmal (${trenn.length})`, trenn.length === 1)
    if (trenn[0]) nahe(`${name}: Wand zwischen Wohnungen 20 cm`, trenn[0].tiefe, 0.2, 1e-6)
    const inner = bei([1300, 300])
    wahr(`${name}: Wand in A einmal (${inner.length})`, inner.length === 1)
    if (inner[0]) nahe(`${name}: Wand in der Wohnung 10 cm`, inner[0].tiefe, 0.1, 1e-6)
    const aussen = bei([1000, 0])
    wahr(`${name}: Aussenwand einmal (${aussen.length})`, aussen.length === 1)
    if (aussen[0]) nahe(`${name}: Aussenwand 30 cm`, aussen[0].tiefe, 0.3, 1e-6)
    wahr(`${name}: Fenster bleibt zu`, bei([800, 0]).length === 1)
    wahr(`${name}: Durchgang offen`, bei([1300, 145]).length === 0)
    wahr(`${name}: durch die Wohnungstuer`, wegFrei(unten, plan([1600, 520]), plan([1600, 780]), 0.23))
    wahr(`${name}: durch die Tuer zum Zimmer`, wegFrei(unten, plan([1600, 520]), plan([1600, 250]), 0.23))
    wahr(`${name}: vom Bad nicht in den Gang`, !wegFrei(unten, plan([1400, 520]), plan([1400, 780]), 0.23))
    wahr(`${name}: vom Garten durch die Haustuer`, wegFrei(unten, plan([-250, 775]), plan([300, 775]), 0.23))
    wahr(`${name}: Stiege zu`, !frei(unten, ...plan([100, 300]), 0.1))
    wahr(`${name}: in den Aufzug`, wegFrei(unten, plan([305, 800]), plan([305, 560]), 0.23))
  }
  // Gelaender am Balkon im 1. OG (nicht im EG).
  wahr(`${name}: Gelaender am Balkon`, !frei(E[iOG], ...plan([2100, -140]), 0.02))

  /* Erst kamera() baut, und nur im Haus. */
  const innenMeshes = () => meshesVon(w.gruppe).filter((m) => /^innen:h5:|^innenGlas:h5$|^kabine:h5$|^aufzugTueren:h5$/.test(m.name))
  const huelle = nachName(w, 'huelle:h5')
  wahr(`${name}: vor kamera() nichts innen`, innenMeshes().length === 0 && !!huelle && huelle.visible)
  const draussenW = welt3([40, 40], 1.6)
  w.kamera(draussenW.x, draussenW.y, draussenW.z)
  wahr(`${name}: kamera() draussen baut nichts`, innenMeshes().length === 0 && huelle.visible)
  const imGang = welt3(planLokal([1600, 800]), 1.6)
  w.kamera(imGang.x, imGang.y, imGang.z)
  const gruppeH5 = w.gruppe.getObjectByName('innen:h5')
  // kamera() baut nicht selbst: bis das Geschoss fertig ist, bleibt die Huelle.
  wahr(`${name}: kamera() baut nicht im selben Bild`, innenMeshes().length === 0 && !!gruppeH5 && !gruppeH5.visible && huelle.visible)
  const schritte = ruhe(w)
  const stock0 = nachName(w, 'innen:h5:0')
  const stock1 = nachName(w, 'innen:h5:1')
  wahr(`${name}: schritt() baut alles (${schritte})`, !!stock0 && !!stock1)
  wahr(`${name}: innen sichtbar, Huelle weg`, gruppeH5.visible && !huelle.visible)
  // Reihenfolge: das Geschoss der Kamera, dann Glas und Aufzug, dann der Rest.
  const reihe = gruppeH5.children.map((x) => x.name)
  wahr(
    `${name}: Geschoss der Kamera zuerst (${reihe.join(',')})`,
    reihe.indexOf('innen:h5:0') === 0 && reihe.indexOf('innenGlas:h5') > 0 && reihe.indexOf('innenGlas:h5') < reihe.indexOf('innen:h5:1'),
  )
  w.kamera(Number.NaN, Number.NaN, Number.NaN)
  wahr(`${name}: kamera(NaN): nur Huellen`, !gruppeH5.visible && huelle.visible)
  const hoch = welt3(planLokal([1600, 800]), 60)
  w.kamera(hoch.x, hoch.y, hoch.z)
  wahr(`${name}: hoch ueber dem Dach: Huelle`, !gruppeH5.visible && huelle.visible)
  w.kamera(imGang.x, imGang.y, imGang.z)
  wahr(`${name}: wieder drin, nichts neu gebaut`, gruppeH5.visible && nachName(w, 'innen:h5:0') === stock0 && nachName(w, 'innen:h5:1') === stock1)
  w.gruppe.updateMatrixWorld(true)

  /* E87: die Treppe in Haus 5 (zwei Geschosse), die am Kern eines eigenen
   * Hauses ohne Plaene, das Ziel in der eigenen Wohnung. */
  treppenPruefen(name, w, {
    id: 'h5',
    gh,
    geschosse: [E[0].id, E[iOG].id],
    stiegen: [[[0, 100], [200, 100], [200, 650], [0, 650]].map(plan)],
    meshes: meshesVon(gruppeH5),
  })
  if (wohnung && wohnung.gebaeudeId !== 'h5') {
    const hd = HAEUSER.find((h) => h.id === wohnung.gebaeudeId)
    const weltXZ = (p) => {
      const v = welt3(p)
      return [v.x, v.z]
    }
    treppenPruefen(name, w, {
      id: hd.id,
      gh,
      geschosse: Array.from({ length: hd.geschosse }, (_, k) => (k === 0 ? E[0].id : (E.find((e) => e.id === `${hd.id}:${k}`) ?? E.find((e) => e.id === 'wohnung')).id)),
      stiegen: kernRechtecke(hd, weltXZ),
      meshes: [nachName(w, 'bauten'), nachName(w, 'gelaende')],
    })
  }
  {
    const h5 = HAEUSER.find((h) => h.id === 'h5')
    const imPlan = wohnung && wohnung.geschoss === 1 && wohnung.gebaeudeId === 'h5'
    const flaechen = imPlan ? innenGeschoss(1).wohnungen[0].raeume.map((r) => r.punkte.map(plan)) : [h5.umriss.map((p) => plan([(p[0] + 32.6) * 100, (p[1] + 51.0) * 100]))]
    eigenePruefen(name, w, wohnung, rahmen, wohnung && wohnung.geschoss === 1 ? iOG : 0, flaechen)
  }

  /* Menge: je Haus unter 120 000 Dreiecken und 12 Zeichenaufrufen. */
  const tris = dreieckeVon(gruppeH5)
  const auf = aufrufeVon(gruppeH5)
  wahr(`${name}: Haus innen ${tris} Dreiecke, ${auf} Zeichenaufrufe`, tris < 120000 && auf < 12)
  for (const m of meshesVon(gruppeH5)) {
    wahr(`${name}: ${m.name} Lage endlich`, m.geometry.attributes.position.array.every(Number.isFinite))
    if (m.material.visible === false) continue
    const col = m.geometry.attributes.color
    wahr(`${name}: ${m.name} Eckfarben`, !!col && col.count === m.geometry.attributes.position.count && m.material.vertexColors === true)
  }

  /* Fenster: Bruestung 90 cm, darueber offen (Glas eigenes Mesh), Sturz. */
  if (bodenFrei) {
    const strahl = new Raycaster()
    const trifft = (mesh, von, nach, y, weit) => {
      const a = welt3(planLokal(von), y)
      const b = welt3(planLokal(nach), y)
      strahl.set(a, b.sub(a).normalize())
      strahl.far = weit
      return strahl.intersectObject(mesh, false).length > 0
    }
    const glas = nachName(w, 'innenGlas:h5')
    wahr(`${name}: unter dem Fenster Wand`, trifft(stock0, [800, 100], [800, -100], 0.5, 1.5))
    wahr(`${name}: Fensterbank bis 90 cm`, trifft(stock0, [800, 100], [800, -100], 0.86, 1.5))
    wahr(`${name}: ueber der Bruestung offen`, !trifft(stock0, [800, 100], [800, -100], 0.98, 1.5) && !trifft(stock0, [800, 100], [800, -100], 1.6, 1.5))
    wahr(`${name}: im Fenster Glas`, !!glas && trifft(glas, [800, 100], [800, -100], 1.6, 1.5))
    wahr(`${name}: Sturz ueber dem Fenster`, trifft(stock0, [800, 100], [800, -100], 2.4, 1.5))
    wahr(`${name}: Wohnungstuer offen`, !trifft(stock0, [1600, 800], [1600, 500], 1.0, 2.5))
    wahr(`${name}: Sturz ueber der Tuer`, trifft(stock0, [1600, 800], [1600, 500], 2.25, 2.5))
    wahr(`${name}: Trennwand ohne Tuer`, trifft(stock0, [1600, 200], [1800, 200], 1.0, 2.5))
  }

  /* Die eigene Wohnung nicht doppelt: kein Dreieck in ihrem Kasten, und
   * die Wohnung A im 1. OG faellt im Fall 1 ganz weg (auch ausserhalb). */
  if (wohnung && rahmen) {
    const haus = HAEUSER.find((h) => h.id === wohnung.gebaeudeId)
    const drin = inWohnung(meshesVon(w.gruppe), rahmen, haus.geschossHoehe)
    wahr(`${name}: kein Dreieck in der Wohnung, auch innen (${drin})`, drin === 0)
  }
  const inA = (mesh, y0, y1) => {
    let n = 0
    const p = mesh.geometry.attributes.position
    const v = new Vector3()
    // Westwand von A und davor, ausserhalb der Aussparung der Wohnung.
    const [x0, z0] = planLokal([640, 10])
    const [x1, z1] = planLokal([800, 590])
    for (let i = 0; i < p.count; i += 3) {
      let cx = 0
      let cy = 0
      let cz = 0
      for (let j = 0; j < 3; j++) {
        v.fromBufferAttribute(p, i + j)
        cx += v.x / 3
        cy += v.y / 3
        cz += v.z / 3
      }
      if (cx > x0 && cx < x1 && cz > z0 && cz < z1 && cy > y0 && cy < y1) n++
    }
    return n
  }
  const aOben = inA(stock1, 3.05, 5.6)
  const aUnten = inA(stock0, 0.05, 2.6)
  if (eigen && wohnung.gebaeudeId === 'h5' && g === 1) wahr(`${name}: Wohnung A im 1. OG weg (${aOben}), im EG da (${aUnten})`, aOben === 0 && aUnten > 0)
  else if (wohnung && !rahmen && wohnung.gebaeudeId === 'h5' && g === 1) wahr(`${name}: Gast sieht die geplante Wohnung A im 1. OG (${aOben}, ${aUnten})`, aOben > 0 && aUnten > 0)
  else wahr(`${name}: Wohnung A in beiden Geschossen (${aOben}, ${aUnten})`, aOben > 0 && aUnten > 0)
  // Gaeste: im Kasten der (fremden) Wohnung steht die geplante Wohnung.
  if (wohnung && !rahmen) {
    const haus = HAEUSER.find((h) => h.id === wohnung.gebaeudeId)
    const drin = inWohnung(meshesVon(w.gruppe), RAHMEN, haus.geschossHoehe, true)
    wahr(`${name}: Gast: dort nichts ausgespart (${drin} Dreiecke)`, drin > 0)
  }

  /* Sprungziele: je Wohnung vor ihrer Tuer, mit Blick zur Tuer. */
  const S = w.sprungziele
  const gier = (von, nach) => {
    const a = welt3(planLokal(von))
    const b = welt3(planLokal(nach))
    return Math.atan2(-(b.x - a.x), -(b.z - a.z))
  }
  const winkel = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)))
  const wohnungen = [
    ['X01, EG', 0, [1600, 650]],
    ['X02, EG', 0, [2350, 650]],
    ['X11, 1. OG', iOG, [1600, 650]],
    ['X12, 1. OG', iOG, [2350, 650]],
  ]
  for (const [n, e, tuer] of wohnungen) {
    const s = S.filter((x) => x.name === n)
    wahr(`${name}: Sprungziel ${n} einmal`, s.length === 1)
    if (!s[0]) continue
    const [x, z] = plan([tuer[0], tuer[1] + 80])
    wahr(`${name}: Sprungziel ${n} auf Ebene ${s[0].ebene}`, s[0].ebene === e)
    nahe(`${name}: Sprungziel ${n} x`, s[0].x, x, 1e-6)
    nahe(`${name}: Sprungziel ${n} z`, s[0].z, z, 1e-6)
    nahe(`${name}: Sprungziel ${n} Blick zur Tuer`, winkel(s[0].gier, gier([tuer[0], tuer[1] + 80], tuer)), 0, 1e-6)
    wahr(`${name}: Sprungziel ${n} frei`, frei(E[s[0].ebene], s[0].x, s[0].z, 0.2))
  }
  const haus5 = S.filter((x) => x.name === 'Eingang Haus 5')
  wahr(`${name}: Sprungziel vor der Haustuer`, haus5.length === 1 && haus5[0].ebene === 0 && frei(E[0], haus5[0].x, haus5[0].z, 0.2))
  if (haus5[0] && bodenFrei) wahr(`${name}: von der Haustuer in den Gang`, wegFrei(E[0], [haus5[0].x, haus5[0].z], plan([1300, 775]), 0.23))
  const eingaenge = S.filter((x) => x.name.startsWith('Eingang '))
  // E87: ohne Rahmen dazu das Ziel in der eigenen (geplanten) Wohnung.
  const eigenesZiel = wohnung && !rahmen ? 1 : 0
  wahr(
    `${name}: Sprungziele: Start, 4 Wohnungen, ${eingaenge.length} Haustueren, Spielplatz${eigenesZiel ? ', eigene Wohnung' : ''} (${S.length})`,
    S.length === 1 + 4 + eingaenge.length + 1 + eigenesZiel && eingaenge.length === 5,
  )
  startPruefen(name, w, wohnung)
  kartePruefen(name, w, (p) => {
    const v = welt3(p)
    return [v.x, v.z]
  }, AUSSEN, INNEN_GAERTEN.map((gt) => gt.map(plan)))

  /* Aufzug in Haus 5: Kabine, Knoepfe je Geschoss, fahrt() meldet den
   * Index der Ziel-Ebene, aufzugZiel() genau einmal. */
  const I = w.interaktiv
  const kabineH5 = nachName(w, 'kabine:h5')
  wahr(`${name}: Kabine in Haus 5`, !!I && !!kabineH5)
  if (I && kabineH5) {
    const ruf = (k) => I.objekte.find((o) => o.name === `aufzugRuf:h5:${k}`)
    const fahre = (k) => I.objekte.find((o) => o.name === `aufzugFahre:h5:${k}`)
    wahr(`${name}: Knoepfe je Geschoss`, !!ruf(0) && !!ruf(1) && !!fahre(0) && !!fahre(1))
    wahr(`${name}: Knoepfe zeigen ihre Ebene`, fahre(1).userData.ebene === iOG && fahre(0).userData.ebene === 0 && fahre(1).userData.geschoss === 1)
    wahr(`${name}: Rufknopf nur im Geschoss der Kamera`, sichtbarAlle(ruf(0)) && !sichtbarAlle(ruf(1)))
    // In die Kabine (am Geschoss, an dem sie steht).
    const start = wohnung && wohnung.gebaeudeId === 'h5' ? g : 0
    const ziel = start === 0 ? 1 : 0
    const mitte = welt3(planLokal([305, 545]), start * gh + 1.6)
    w.kamera(mitte.x, mitte.y, mitte.z)
    const r = w.kabine
    wahr(`${name}: Kamera in der Kabine`, !!r && mitte.x > r[0] && mitte.x < r[2] && mitte.z > r[1] && mitte.z < r[3])
    wahr(`${name}: anfangs keine Fahrt`, w.fahrt() === null && aufzugZiel(w) === null)
    const farbeVorher = Float32Array.from(kabineH5.geometry.attributes.color.array)
    I.tippen(fahre(ziel))
    let anders = 0
    const farbeNach = kabineH5.geometry.attributes.color.array
    for (let i = 0; i < farbeNach.length; i++) if (Math.abs(farbeNach[i] - farbeVorher[i]) > 1e-6) anders++
    wahr(`${name}: gedrueckter Knopf leuchtet (${anders})`, anders > 0)
    const zielE = ziel === 1 ? iOG : 0
    const f0 = w.fahrt()
    wahr(`${name}: fahrt() meldet den Index der Ziel-Ebene (${f0 && f0.ziel})`, !!f0 && f0.ziel === zielE)
    // Fahren wie der Motor: die Kamera faehrt mit.
    const ank = []
    const ys = []
    for (let i = 0; i < 4000; i++) {
      const weiter = w.schritt(1 / 60, mitte.y)
      const f = w.fahrt()
      if (f) {
        ys.push(f.y)
        w.kamera(mitte.x, f.y + 1.6, mitte.z)
        if (f.ziel !== zielE) wahr(`${name}: Ziel bleibt`, false)
      }
      const a = aufzugZiel(w)
      if (a !== null) ank.push(a)
      if (!weiter) break
    }
    wahr(`${name}: genau eine Ankunft (${ank})`, ank.length === 1 && ank[0] === zielE)
    nahe(`${name}: Fahrt beginnt auf der Ebene`, ys[0], E[start === 0 ? 0 : iOG].y, 1e-9)
    nahe(`${name}: Fahrt endet auf der Ebene`, ys[ys.length - 1], E[zielE].y, 1e-9)
    kabineH5.updateMatrixWorld(true)
    const v = new Vector3()
    kabineH5.getWorldPosition(v)
    nahe(`${name}: Kabine am Ziel`, v.y, E[zielE].y, 1e-9)
    let zurueck = 0
    for (let i = 0; i < farbeNach.length; i++) if (Math.abs(farbeNach[i] - farbeVorher[i]) > 1e-6) zurueck++
    wahr(`${name}: Knopf wieder aus`, zurueck === 0)
    // Ausserhalb der Kabine meldet fahrt() nichts.
    w.kamera(imGang.x, imGang.y, imGang.z)
    I.tippen(ruf(0))
    wahr(`${name}: Fahrt ohne Kamera in der Kabine ist nicht ihre`, w.fahrt() === null)
    ruhe(w)
  }
  // Der Aufzug am Laubengang des eigenen Hauses ohne Plaene: Ziel als Index.
  if (wohnung && wohnung.gebaeudeId === 'h4') {
    const fahreH4 = I.objekte.find((o) => o.name === 'aufzugFahre1')
    const kab = nachName(w, 'kabine')
    wahr(`${name}: Aufzug am Laubengang da`, !!fahreH4 && !!kab)
    if (fahreH4 && kab) {
      // Mitte der Kabine (Welt), dort steht die Kamera.
      kab.updateMatrixWorld(true)
      const c = kab.geometry.boundingSphere.center.clone().applyMatrix4(kab.matrixWorld)
      w.kamera(c.x, 1.6, c.z)
      I.tippen(fahreH4)
      const f = w.fahrt()
      wahr(`${name}: Laubengang: Ziel ist die Ebene ${f && f.ziel}`, !!f && f.ziel === E.findIndex((e) => e.id === 'h4:1'))
      ruhe(w)
    }
  }
  return w
}

const innenWelten = []
for (const [name, wohnung, rahmen] of INNEN_FAELLE) innenWelten.push([name, innenPruefen(name, wohnung, rahmen)])

// Gleiche Daten, gleiche Welt, auch innen.
{
  const [, wohnung, rahmen] = INNEN_FAELLE[0]
  const bauen = () => {
    const w = bau({ siedlung: mitInnen(wohnung), farben: F, wohnungRahmen: rahmen })
    const LG = w.gruppe.children.find((x) => x.name === 'siedlungLage')
    w.gruppe.updateMatrixWorld(true)
    const p = new Vector3(...[planLokal([1600, 800])].map(([x, z]) => [x, 1.6, z])[0]).applyMatrix4(LG.matrixWorld)
    w.kamera(p.x, p.y, p.z)
    ruhe(w)
    return w
  }
  const a = bauen()
  const b = bauen()
  gleich('Innen', a, b)
  wahr('Innen: gleiche Sprungziele', JSON.stringify(a.sprungziele) === JSON.stringify(b.sprungziele))
  wahr('Innen: gleiche Karte', JSON.stringify(a.karte) === JSON.stringify(b.karte))
  freigeben('Innen (a)', a)
  freigeben('Innen (b)', b)
}

// Gaeste innen (E86): gleiche Welt wie beim Besitzer. Und der Umriss auf
// der Karte liegt dort, wo die Huelle des Hauses steht, auf 0,1 m (Haus 5
// hier grau verputzt: ohne Balkone und Loggien steht nichts weit vor der
// Fassade; Sockel und Fensterbaenke ragen bis 8 cm hinaus).
{
  const grau = HAEUSER.map((h) => (h.id === 'h5' ? { ...h, stil: 'grau' } : h))
  const i5 = HAEUSER.findIndex((h) => h.id === 'h5')
  for (const [name, wohnung, rahmen] of INNEN_FAELLE) {
    if (!wohnung || !rahmen) continue
    const n = `${name}, Gast`
    const daten = { ...mitInnen(wohnung), gebaeude: grau }
    const besitzer = bau({ siedlung: daten, farben: F, wohnungRahmen: rahmen })
    const gast = bau({ siedlung: daten, farben: F, wohnungRahmen: null })
    gleicheWelt(n, besitzer, gast)
    const kaesten = []
    for (const [wer, w] of [
      ['Besitzer', besitzer],
      ['Gast', gast],
    ]) {
      w.gruppe.updateMatrixWorld(true)
      const huelle = nachName(w, 'huelle:h5')
      const k = w.karte.haeuser[i5]
      wahr(`${n}: ${wer}: Huelle und Umriss von Haus 5 da`, !!huelle && !!k)
      if (!huelle || !k) continue
      huelle.geometry.computeBoundingBox()
      const box = huelle.geometry.boundingBox.clone().applyMatrix4(huelle.matrixWorld)
      const kk = kastenAus(k.punkte)
      const d = [box.min.x - kk[0], box.min.z - kk[1], box.max.x - kk[2], box.max.z - kk[3]]
      wahr(`${n}: ${wer}: Umriss auf der Karte wie die Huelle (${d.map((v) => v.toFixed(3)).join(', ')})`, d.every((v) => Math.abs(v) <= 0.1))
      kaesten.push(box)
    }
    // Ohne Aussparung (Wohnung in einem anderen Haus) genau gleich.
    if (wohnung.gebaeudeId !== 'h5' && kaesten.length === 2) wahr(`${n}: Huelle von Haus 5 genau gleich`, kaesten[0].equals(kaesten[1]))
    freigeben(`${n} (Besitzer)`, besitzer)
    freigeben(n, gast)
  }
}
for (const [name, w] of innenWelten) {
  freigeben(name, w)
  w.kamera(0, 1.6, 0)
  wahr(`${name}: nach dispose baut kamera() nichts`, w.gruppe.children.length === 0)
}

/* Ein grosses erfundenes Haus (Haus 4, fuenf Geschosse, je sechs Wohnungen
 * mit sieben Raeumen, Loggien, Gaerten): Menge und Zeit je Bau-Schritt. */
function grossesHaus() {
  const geschosse = []
  for (let k = 0; k < 5; k++) {
    const wohnungen = []
    for (let i = 0; i < 6; i++) {
      const sued = i >= 3
      const W = 690
      const x0 = (i % 3) * W
      // Nord: y 0..1000, Sued gespiegelt: y 2150..1150; der Gang dazwischen.
      const Y = (y) => (sued ? 2150 - y : y)
      const R = (xa, ya, xb, yb) => {
        const p = [[x0 + xa, Y(ya)], [x0 + xb, Y(ya)], [x0 + xb, Y(yb)], [x0 + xa, Y(yb)]]
        return sued ? p.reverse() : p
      }
      const raeume = [
        { name: 'Wohnkueche', art: 'innen', punkte: R(0, 0, W, 450) },
        { name: 'Zimmer', art: 'innen', punkte: R(0, 450, W / 2, 800) },
        { name: 'Zimmer', art: 'innen', punkte: R(W / 2, 450, W, 800) },
        { name: 'Bad', art: 'innen', punkte: R(0, 800, 230, 1000) },
        { name: 'WC', art: 'innen', punkte: R(230, 800, 370, 1000) },
        { name: 'VR', art: 'innen', punkte: R(370, 800, W, 1000) },
        k === 0 ? { name: 'Garten', art: 'draussen', punkte: R(0, -400, W, 0) } : { name: 'Loggia', art: 'draussen', punkte: R(0, -150, W, 0) },
      ]
      // Kanten: Index 0 laeuft entlang ya (Nordseite bei Nord-Wohnungen).
      const vorn = sued ? 2 : 0
      const hinten = sued ? 0 : 2
      const oeffnungen = [
        oeff(0, 'fenster', vorn, 380, 160),
        oeff(0, 'tuer', vorn, 150, 100, { aufschlag: 'aussen' }),
        oeff(1, 'fenster', 3, 120, 140),
        oeff(2, 'fenster', 1, 120, 140),
        oeff(5, 'tuer', hinten, 120, 100),
        oeff(5, 'tuer', vorn, 60, 80),
        oeff(5, 'durchgang', vorn, 200, 90),
        oeff(3, 'tuer', 1, 40, 80),
        oeff(4, 'tuer', 1, 40, 70),
        oeff(1, 'tuer', 1, 260, 80),
      ]
      const moebel = [
        { name: 'Kuechenzeile', x: x0 + 350, y: Y(sued ? 66 : 6), breite_cm: 300, tiefe_cm: 60, drehung: 0 },
        { name: 'Badewanne', x: x0 + 5, y: Y(sued ? 995 : 805), breite_cm: 170, tiefe_cm: 75, drehung: 0 },
        { name: 'Waschbecken', x: x0 + 180, y: Y(sued ? 995 : 950), breite_cm: 60, tiefe_cm: 45, drehung: 0 },
        { name: 'WC', x: x0 + 260, y: Y(sued ? 995 : 940), breite_cm: 40, tiefe_cm: 55, drehung: 0 },
        { name: 'Waschbecken', x: x0 + 300, y: Y(sued ? 870 : 810), breite_cm: 45, tiefe_cm: 35, drehung: 0 },
        { name: 'Waschmaschine', x: x0 + 620, y: Y(sued ? 995 : 935), breite_cm: 60, tiefe_cm: 60, drehung: 0 },
      ]
      wohnungen.push({ top: `G${k}${i}`, typ: 'G', raeume, oeffnungen, moebel, eingang: [x0 + 520, sued ? 1140 : 1010] })
    }
    geschosse.push({
      geschoss: k,
      wohnungen,
      allgemein: [
        { art: 'gang', punkte: [[0, 1000], [2070, 1000], [2070, 1150], [0, 1150]] },
        { art: 'stiege', punkte: [[2070, 900], [2270, 900], [2270, 1450], [2070, 1450]] },
        { art: 'aufzug', punkte: [[2070, 1450], [2280, 1450], [2280, 1655], [2070, 1655]] },
      ],
    })
  }
  return { gebaeudeId: 'h4', x: 4.5, z: -72.6, drehung: 0, geschosse }
}
{
  // Dreimal bauen und je Schritt die kuerzeste Zeit nehmen: so zaehlt die
  // Arbeit selbst, nicht, ob der Rechner gerade anderes tut.
  const DATEN = mitInnen(null, [INNEN[0], grossesHaus()])
  const laeufe = []
  let w = null
  for (let lauf = 0; lauf < 3; lauf++) {
    if (w) freigeben(`Grosses Haus (${lauf})`, w)
    w = bau({ siedlung: DATEN, farben: F, wohnungRahmen: null })
    w.gruppe.updateMatrixWorld(true)
    if (lauf === 0) ABDRUCK['Grosses Haus'] = abdruck(w)
    const LG = w.gruppe.children.find((x) => x.name === 'siedlungLage')
    const p = new Vector3(4.5 + 10, 1.6, -72.6 + 10.75).applyMatrix4(LG.matrixWorld)
    const zeiten = []
    let t = performance.now()
    w.kamera(p.x, p.y, p.z)
    zeiten.push(performance.now() - t)
    for (let i = 0; i < 200; i++) {
      t = performance.now()
      const weiter = w.schritt(1 / 60, p.y)
      zeiten.push(performance.now() - t)
      if (!weiter) break
    }
    laeufe.push(zeiten)
  }
  const n = Math.min(...laeufe.map((z) => z.length))
  const kuerzest = Array.from({ length: n }, (_, i) => Math.min(...laeufe.map((z) => z[i])))
  const langsam = Math.max(...kuerzest)
  const gruppe = w.gruppe.getObjectByName('innen:h4')
  const stock = meshesVon(gruppe).filter((m) => m.name.startsWith('innen:h4:'))
  const tris = dreieckeVon(gruppe)
  const auf = aufrufeVon(gruppe)
  wahr(`Grosses Haus: alle fuenf Geschosse gebaut (${stock.length})`, stock.length === 5)
  wahr(`Grosses Haus: ${tris} Dreiecke, ${auf} Zeichenaufrufe`, tris < 120000 && auf < 12)
  wahr(`Grosses Haus: laengster Bau-Schritt ${langsam.toFixed(1)} ms`, langsam < 30)
  wahr(`Grosses Haus: kamera() baut nicht (${kuerzest[0].toFixed(2)} ms)`, kuerzest[0] < 2)
  wahr(`Grosses Haus: Sprungziele (${w.sprungziele.length})`, w.sprungziele.filter((s) => /^G\d\d, /.test(s.name)).length === 30)
  wahr(`Grosses Haus: Ebenen (${w.ebenen.length})`, w.ebenen.length === 1 + 4 + 1 + 4 + 1)
  console.log(`  grosses Haus: ${tris} Dreiecke, ${auf} Zeichenaufrufe, ${n - 1} Bau-Schritte, der laengste ${langsam.toFixed(1)} ms`)
  // E87: die Treppe ueber fuenf Geschosse; der Gang liegt nur seitlich am
  // Stiegenhaus, davor ein Podest auf Geschosshoehe.
  {
    const LG = lageVon(w)
    const planG = ([x, y]) => {
      const v = new Vector3(4.5 + x / 100, 0, -72.6 + y / 100).applyMatrix4(LG.matrixWorld)
      return [v.x, v.z]
    }
    w.gruppe.updateMatrixWorld(true)
    treppenPruefen('Grosses Haus', w, {
      id: 'h4',
      gh: 3,
      geschosse: [w.ebenen[0].id, 'h4:1', 'h4:2', 'h4:3', 'h4:4'],
      stiegen: [[[2070, 900], [2270, 900], [2270, 1450], [2070, 1450]].map(planG)],
      meshes: meshesVon(gruppe),
    })
  }
  freigeben('Grosses Haus', w)
}

// Eine Halle, in der Stiege und Aufzug stehen (der Gang umfasst beide):
// ueber dem Schacht kein Boden, in der Halle keine Wand um die Stiege.
{
  const halle = (k) => {
    const g = innenGeschoss(k)
    return { ...g, allgemein: [{ art: 'gang', punkte: [[0, 100], [700, 100], [700, 650], [2700, 650], [2700, 900], [0, 900]] }, ...g.allgemein.slice(1)] }
  }
  const w = bau({ siedlung: mitInnen(null, [{ ...INNEN[0], geschosse: [halle(0), halle(1)] }]), farben: F, wohnungRahmen: null })
  w.gruppe.updateMatrixWorld(true)
  const LG = w.gruppe.children.find((x) => x.name === 'siedlungLage')
  const welt3 = (p, y) => new Vector3(...planLokal(p).flatMap((v, i) => (i === 0 ? [v, y] : [v]))).applyMatrix4(LG.matrixWorld)
  const im = welt3([500, 500], 4.6)
  w.kamera(im.x, im.y, im.z)
  ruhe(w)
  w.gruppe.updateMatrixWorld(true)
  const stock1 = nachName(w, 'innen:h5:1')
  const strahl = new Raycaster()
  const runter = (p) => {
    const a = welt3(p, 4.0)
    strahl.set(a, new Vector3(0, -1, 0))
    strahl.far = 1.5
    return !!stock1 && strahl.intersectObject(stock1, false).length > 0
  }
  wahr('Halle: im 1. OG gebaut', !!stock1)
  wahr('Halle: Boden in der Halle', runter([550, 300]))
  wahr('Halle: ueber dem Schacht kein Boden', !runter([305, 545]))
  const E = w.ebenen
  const og = E.find((e) => e.id === 'h5:1')
  const plan = (p) => {
    const v = welt3(p, 0)
    return [v.x, v.z]
  }
  wahr('Halle: Stiege zu, Halle frei', !frei(og, ...plan([100, 300]), 0.05) && frei(og, ...plan([550, 300]), 0.23))
  // Die Tuer zeigt in die Halle (nicht zur Stiege): von Osten hinein.
  wahr('Halle: in den Aufzug', wegFrei(og, plan([620, 547]), plan([330, 547]), 0.23))
  wahr('Halle: nicht von der Stiege her', !wegFrei(og, plan([305, 800]), plan([305, 560]), 0.23))
  // E87: die Treppe in der Halle (rundum Gang): nur ueber den Antritt.
  w.gruppe.updateMatrixWorld(true)
  treppenPruefen('Halle', w, {
    id: 'h5',
    gh: 3,
    geschosse: [E[0].id, 'h5:1'],
    stiegen: [[[0, 100], [200, 100], [200, 650], [0, 650]].map(plan)],
    meshes: meshesVon(w.gruppe.getObjectByName('innen:h5')),
  })
  freigeben('Halle', w)
}

// Unsinnige Plaene werfen laut.
{
  const g0 = innenGeschoss(0)
  const mit = (aenderung) => mitInnen(null, [{ ...INNEN[0], ...aenderung }])
  const wohnungMit = (w) => ({ geschosse: [{ ...g0, wohnungen: [{ ...g0.wohnungen[0], ...w }, g0.wohnungen[1]] }] })
  wirft('innen: unbekanntes Haus', mit({ gebaeudeId: 'gibt-es-nicht' }), null)
  wirft('innen: doppelt', mitInnen(null, [INNEN[0], INNEN[0]]), null)
  wirft('innen: Drehung 45', mit({ drehung: 45 }), null)
  wirft('innen: Lage NaN', mit({ x: Number.NaN }), null)
  wirft('innen: Geschoss zu hoch', mit({ geschosse: [{ ...g0, geschoss: 4 }] }), null)
  wirft('innen: Geschoss doppelt', mit({ geschosse: [g0, g0] }), null)
  wirft('innen: Raum mit zwei Punkten', mit(wohnungMit({ raeume: [{ name: 'Zimmer', art: 'innen', punkte: [[0, 0], [100, 0]] }] })), null)
  wirft('innen: Raum ohne Art', mit(wohnungMit({ raeume: [{ name: 'Zimmer', art: 'oben', punkte: [[0, 0], [100, 0], [100, 100]] }] })), null)
  wirft('innen: Oeffnung an einer Kante, die es nicht gibt', mit(wohnungMit({ oeffnungen: [oeff(0, 'tuer', 7, 10, 80)] })), null)
  wirft('innen: Oeffnung in einem Raum, den es nicht gibt', mit(wohnungMit({ oeffnungen: [oeff(9, 'tuer', 0, 10, 80)] })), null)
  wirft('innen: Oeffnung NaN', mit(wohnungMit({ oeffnungen: [oeff(0, 'tuer', 0, Number.NaN, 80)] })), null)
  wirft('innen: Moebel gedreht 45', mit(wohnungMit({ moebel: [{ name: 'WC', x: 0, y: 0, breite_cm: 40, tiefe_cm: 50, drehung: 45 }] })), null)
  wirft('innen: allgemein unbekannt', mit({ geschosse: [{ ...g0, allgemein: [{ art: 'keller', punkte: [[0, 0], [100, 0], [100, 100]] }] }] }), null)
  wirft('innen: keine Liste', { ...siedlung(null), innen: { a: 1 } }, null)
}


/* ------------------------------------------------ E87: wie vorher */
/* Gemessen mit dem Stand vor E87 (Vertrag E87, Teil 1), gleich nach dem
 * Bau jeder Siedlung oben (ohne Stadt). Ohne Stadt bleibt alles wie
 * vorher: dieselben Dreiecke in jedem festen Mesh, nur in 'bauten' fehlen
 * die Autos (sie sind jetzt Fahrzeuge: je Auto genau die Dreiecke des alten
 * Modells), gleich viele Autos, Ebenen und Sprungziele von vorher vorne
 * unveraendert; neu hinten sind nur Zwischenpodeste und das Ziel in der
 * eigenen Wohnung. */
const ABDRUCK_VORHER = {
  'Gang 1. OG': { tris: { boden: 10320, gelaende: 962, gruen: 14296, bauten: 53582, kabine: 168, aufzugFahre0: 108, aufzugFahre1: 108, aufzugFahre2: 108, aufzugFahre3: 108, aufzugTueren: 192, aufzugRuf0: 108, aufzugRuf1: 108, aufzugRuf2: 108, aufzugRuf3: 108 }, ebenen: 5, ebenenHash: '94460cd7', ziele: 7, zieleHash: 'ed274d20', autos: 6 },
  'Drehung 90, 3. OG': { tris: { boden: 10320, gelaende: 914, gruen: 14856, bauten: 49974, kabine: 168, aufzugFahre0: 108, aufzugFahre1: 108, aufzugFahre2: 108, aufzugFahre3: 108, aufzugFahre4: 108, aufzugTueren: 240, aufzugRuf0: 108, aufzugRuf1: 108, aufzugRuf2: 108, aufzugRuf3: 108, aufzugRuf4: 108 }, ebenen: 6, ebenenHash: '16799ce5', ziele: 7, zieleHash: '62b47ac1', autos: 5 },
  'Erdgeschoss, Drehung 180': { tris: { boden: 10320, gelaende: 950, gruen: 14296, bauten: 52834, kabine: 168, aufzugFahre0: 108, aufzugFahre1: 108, aufzugFahre2: 108, aufzugFahre3: 108, aufzugTueren: 192, aufzugRuf0: 108, aufzugRuf1: 108, aufzugRuf2: 108, aufzugRuf3: 108 }, ebenen: 5, ebenenHash: '9809fe9', ziele: 7, zieleHash: 'eb4084b5', autos: 6 },
  'Oben, Drehung 270': { tris: { boden: 10320, gelaende: 962, gruen: 14296, bauten: 52902, kabine: 168, aufzugFahre0: 108, aufzugFahre1: 108, aufzugFahre2: 108, aufzugFahre3: 108, aufzugTueren: 192, aufzugRuf0: 108, aufzugRuf1: 108, aufzugRuf2: 108, aufzugRuf3: 108 }, ebenen: 5, ebenenHash: '7c1d1753', ziele: 7, zieleHash: 'ecb34aba', autos: 6 },
  'Ohne Wohnung': { tris: { boden: 10320, gelaende: 926, gruen: 14776, bauten: 45258 }, ebenen: 1, ebenenHash: 'eeac85d9', ziele: 7, zieleHash: 'eedbe487', autos: 3 },
  'Ohne Draussen': { tris: { boden: 10312, gelaende: 660, gruen: 14296, bauten: 51624, kabine: 168, aufzugFahre0: 108, aufzugFahre1: 108, aufzugFahre2: 108, aufzugFahre3: 108, aufzugTueren: 192, aufzugRuf0: 108, aufzugRuf1: 108, aufzugRuf2: 108, aufzugRuf3: 108 }, ebenen: 5, ebenenHash: '53658cc6', ziele: 6, zieleHash: 'f7d22110', autos: 4 },
  'Gang 1. OG, Gast': { tris: { boden: 10320, gelaende: 962, gruen: 14296, bauten: 53610, kabine: 168, aufzugFahre0: 108, aufzugFahre1: 108, aufzugFahre2: 108, aufzugFahre3: 108, aufzugTueren: 192, aufzugRuf0: 108, aufzugRuf1: 108, aufzugRuf2: 108, aufzugRuf3: 108 }, ebenen: 5, ebenenHash: '53658cc6', ziele: 7, zieleHash: 'ed274d20', autos: 6 },
  'Drehung 90, 3. OG, Gast': { tris: { boden: 10320, gelaende: 914, gruen: 14856, bauten: 50002, kabine: 168, aufzugFahre0: 108, aufzugFahre1: 108, aufzugFahre2: 108, aufzugFahre3: 108, aufzugFahre4: 108, aufzugTueren: 240, aufzugRuf0: 108, aufzugRuf1: 108, aufzugRuf2: 108, aufzugRuf3: 108, aufzugRuf4: 108 }, ebenen: 6, ebenenHash: '4c15e6d0', ziele: 7, zieleHash: '62b47ac1', autos: 5 },
  'Erdgeschoss, Drehung 180, Gast': { tris: { boden: 10320, gelaende: 962, gruen: 14296, bauten: 53610, kabine: 168, aufzugFahre0: 108, aufzugFahre1: 108, aufzugFahre2: 108, aufzugFahre3: 108, aufzugTueren: 192, aufzugRuf0: 108, aufzugRuf1: 108, aufzugRuf2: 108, aufzugRuf3: 108 }, ebenen: 5, ebenenHash: '5f991b13', ziele: 7, zieleHash: 'eb4084b5', autos: 6 },
  'Oben, Drehung 270, Gast': { tris: { boden: 10320, gelaende: 962, gruen: 14296, bauten: 53608, kabine: 168, aufzugFahre0: 108, aufzugFahre1: 108, aufzugFahre2: 108, aufzugFahre3: 108, aufzugTueren: 192, aufzugRuf0: 108, aufzugRuf1: 108, aufzugRuf2: 108, aufzugRuf3: 108 }, ebenen: 5, ebenenHash: '46e9b7aa', ziele: 7, zieleHash: 'ecb34aba', autos: 6 },
  'Innen, Wohnung im 1. OG': { tris: { boden: 10320, gelaende: 1314, gruen: 14296, bauten: 39690, 'huelle:h5': 6570 }, ebenen: 2, ebenenHash: 'ba916f4d', ziele: 11, zieleHash: 'af0421e6', autos: 6 },
  'Innen, ohne Wohnung': { tris: { boden: 10320, gelaende: 1314, gruen: 14776, bauten: 38696, 'huelle:h5': 6634 }, ebenen: 2, ebenenHash: '81c571d2', ziele: 11, zieleHash: '3c7ed0e4', autos: 3 },
  'Innen, Wohnung in Haus 4': { tris: { boden: 10320, gelaende: 1302, gruen: 14856, bauten: 43412, 'huelle:h5': 6634, kabine: 168, aufzugFahre0: 108, aufzugFahre1: 108, aufzugFahre2: 108, aufzugFahre3: 108, aufzugFahre4: 108, aufzugTueren: 240, aufzugRuf0: 108, aufzugRuf1: 108, aufzugRuf2: 108, aufzugRuf3: 108, aufzugRuf4: 108 }, ebenen: 6, ebenenHash: '4a98a8d3', ziele: 11, zieleHash: '1e9c432', autos: 5 },
  'Innen, Wohnung im EG gedreht': { tris: { boden: 10320, gelaende: 1314, gruen: 14296, bauten: 39690, 'huelle:h5': 6206 }, ebenen: 2, ebenenHash: '218ea450', ziele: 11, zieleHash: '138de521', autos: 6 },
  'Innen, Gast, Wohnung im 1. OG': { tris: { boden: 10320, gelaende: 1314, gruen: 14296, bauten: 39690, 'huelle:h5': 6634 }, ebenen: 2, ebenenHash: '5899ad6f', ziele: 11, zieleHash: 'af0421e6', autos: 6 },
  'Innen, Gast, Wohnung im EG gedreht': { tris: { boden: 10320, gelaende: 1314, gruen: 14296, bauten: 39690, 'huelle:h5': 6634 }, ebenen: 2, ebenenHash: '81c571d2', ziele: 11, zieleHash: '138de521', autos: 6 },
  'Grosses Haus': { tris: { boden: 10320, gelaende: 1278, gruen: 14936, bauten: 26632, 'huelle:h5': 6634, 'huelle:h4': 12220 }, ebenen: 6, ebenenHash: '91a11937', ziele: 41, zieleHash: 'da51233e', autos: 3 },
}
{
  const rund = (r) => {
    const g = new RoundedBoxGeometry(1, 1, 1, 1, r)
    const n = (g.index ? g.index.count : g.attributes.position.count) / 3
    g.dispose()
    return n
  }
  // Das alte Auto: zwei runde Quader, vier Raeder (Walze mit 8 Seiten, 32 Dreiecke).
  const AUTO = rund(0.16) + rund(0.2) + 4 * 32
  for (const [name, v] of Object.entries(ABDRUCK_VORHER)) {
    const n = ABDRUCK[name]
    wahr(`wie vorher: ${name} gemessen`, !!n)
    if (!n) continue
    wahr(`wie vorher: ${name}: Autos (${n.autos})`, n.autos === v.autos)
    for (const m of new Set([...Object.keys(v.tris), ...Object.keys(n.tris)])) {
      const soll = m === 'bauten' ? v.tris[m] - v.autos * AUTO : v.tris[m]
      wahr(`wie vorher: ${name}: ${m} ${n.tris[m]} Dreiecke (soll ${soll})`, n.tris[m] === soll)
    }
    wahr(`wie vorher: ${name}: Ebenen vorne gleich`, n.ebenenListe.length >= v.ebenen && fnv(n.ebenenListe.slice(0, v.ebenen).join(';')) === v.ebenenHash)
    wahr(`wie vorher: ${name}: neu nur Zwischenpodeste`, n.ebenenListe.slice(v.ebenen).every((t) => /^[^|]+:\d+\.5\|/.test(t)))
    wahr(`wie vorher: ${name}: Sprungziele vorne gleich`, n.zieleListe.length >= v.ziele && fnv(n.zieleListe.slice(0, v.ziele).join(';')) === v.zieleHash)
    wahr(`wie vorher: ${name}: neu nur das Ziel in der eigenen Wohnung`, n.zieleListe.slice(v.ziele).every((t) => /, innen\|/.test(t)) && n.zieleListe.length - v.ziele <= 1)
  }
}

/* ------------------------------------------------ E87: Stadt */

/** Eine erfundene kleine Stadt um die erfundene Siedlung. */
const STADT = {
  art: 'kistly-stadt',
  v: 1,
  stand: '2026-01-01',
  rahmen: [-220, -220, 220, 220],
  gelaende: { x0: -220, z0: -220, schritt: 55, nx: 9, nz: 9, dm: Array.from({ length: 81 }, (_, i) => (i % 9 === 0 || i % 9 === 8 ? 25 : 0)) },
  haeuser: [{ id: 'w1', umriss: [[80, 80], [100, 80], [100, 95], [80, 95]], art: 'laden', geschosse: 2, geschossHoehe: 3.2, dach: 'flach', boden: 0, name: 'Probeladen', tuer: { kante: 0, t: 0.5 } }],
  strassen: [{ art: 'haupt', breite: 7, punkte: [[60, -150], [60, 150]], name: 'Probeweg' }],
  flaechen: [{ art: 'wald', punkte: [[-180, -180], [-120, -180], [-120, -120], [-180, -120]] }],
  gewaesser: [],
  zaeune: [],
  baeume: [[70, 0]],
  orte: [{ name: 'Probeladen', art: 'supermarket', x: 90, z: 78, haus: 'w1' }],
}
const ebeneGleich = (a, b) => a.id === b.id && a.name === b.name && a.y === b.y

/** Was fuer jede Stadt gilt (auch die echte aus stadt3d.ts): ohne ist
 *  dieselbe Siedlung ohne Stadt. */
function stadtWie(name, ohne, mit) {
  const E = mit.ebenen
  const EO = ohne.ebenen
  const u = mit.gruppe.userData
  wahr(`${name}: gebaut (${mit.stadtFehler})`, mit.stadtFehler === null && u.stadt === true && ohne.stadtFehler === null && ohne.gruppe.userData.stadt === false)
  wahr(`${name}: Sicht bis 700 m`, mit.nebel.near === 220 && mit.nebel.far === 700 && mit.himmel === F.himmelUnten)
  wahr(`${name}: eigene Ebenen vorne gleich`, E.length >= EO.length && EO.every((e, i) => ebeneGleich(e, E[i])))
  wahr(`${name}: Gelaende am Boden`, typeof E[0].hoehe === 'function' && Number.isFinite(E[0].hoehe(E[0].hindernisse[0].x, E[0].hindernisse[0].z)))
  const garten = E.findIndex((e) => e.id === 'garten')
  if (garten > 0) wahr(`${name}: Gelaende auch im Garten`, E[garten].hoehe === E[0].hoehe)
  wahr(`${name}: sonst kein Gelaende`, E.slice(1, EO.length).every((e, i) => i + 1 === garten || e.hoehe === undefined))
  // Obergeschosse haengen nicht an der Stadt.
  wahr(`${name}: Hindernisse oben gleich`, EO.every((e, i) => i === 0 || i === garten || JSON.stringify(e.hindernisse) === JSON.stringify(E[i].hindernisse)))
  wahr(`${name}: eigene Treppen gleich`, JSON.stringify(mit.treppen.slice(0, ohne.treppen.length)) === JSON.stringify(ohne.treppen))
  wahr(`${name}: eigene Fahrzeuge und Dinge`, ohne.fahrzeuge.every((f, i) => mit.fahrzeuge[i]?.id === f.id) && ohne.dinge.every((d, i) => mit.dinge[i]?.id === d.id))
  const SO = ohne.sprungziele
  // Mit Stadt liegen Ziele draussen auf der Ebene 0 (ohne Plaene mit eigenem Haus sonst im Garten).
  const ohneGarten = SO.map((s) => (s.ebene === garten ? { ...s, ebene: 0 } : s))
  wahr(`${name}: eigene Sprungziele vorne gleich`, JSON.stringify(mit.sprungziele.slice(0, SO.length)) === JSON.stringify(ohneGarten))
  wahr(`${name}: keine Ziele im Garten`, garten <= 0 || mit.sprungziele.every((s) => s.ebene !== garten))
  wahr(`${name}: Ziele der Stadt auf dem Boden`, mit.sprungziele.slice(SO.length).every((s) => s.ebene === 0))
  wahr(`${name}: eigenes Ziel gleich`, mit.eigeneWohnung === ohne.eigeneWohnung)
  // Karte: die eigene Strasse faellt weg, sonst die eigenen Flaechen wie ohne Stadt.
  const K = mit.karte
  const eigene = K.flaechen.slice(K.flaechen.length - (ohne.karte.flaechen.length - 1))
  wahr(`${name}: Karte ohne die eigene Strasse`, JSON.stringify(eigene) === JSON.stringify(ohne.karte.flaechen.slice(1)))
  wahr(`${name}: Karte: eigene Haeuser vorne`, JSON.stringify(K.haeuser.slice(0, ohne.karte.haeuser.length)) === JSON.stringify(ohne.karte.haeuser))
  const um = kastenAus([...ohne.karte.haeuser.flatMap((h) => h.punkte), ...eigene.flatMap((f) => f.punkte)])
  wahr(`${name}: Karte: Rahmen um alles Eigene`, K.rahmen[0] <= um[0] - 5 + 1e-9 && K.rahmen[1] <= um[1] - 5 + 1e-9 && K.rahmen[2] >= um[2] + 5 - 1e-9 && K.rahmen[3] >= um[3] + 5 - 1e-9)
  // Die weite Umgebung faellt weg; die Wiese bleibt auf dem Grund und ueber -0,06.
  wahr(`${name}: keine Hecken, Laternen, Nachbarn (${u.hecken}, ${u.nachbarn})`, u.hecken === 0 && u.nachbarn === 0)
  mit.gruppe.updateMatrixWorld(true)
  const LG = lageVon(mit)
  const v = new Vector3()
  const meshMit = (n) => meshesVon(LG).find((m) => m.name === n)
  const meshOhne = (n) => meshesVon(lageVon(ohne)).find((m) => m.name === n)
  wahr(`${name}: Wiese kleiner (${dreiecke(meshMit('boden'))} statt ${dreiecke(meshOhne('boden'))})`, dreiecke(meshMit('boden')) < dreiecke(meshOhne('boden')))
  const haeuserKasten = kastenAus(ohne.karte.haeuser.flatMap((h) => h.punkte))
  let weit = 0
  let tief = 0
  for (const n of ['boden', 'gelaende']) {
    const m = meshMit(n)
    const p = m.geometry.attributes.position
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld)
      if (v.x < haeuserKasten[0] - 40 || v.x > haeuserKasten[2] + 40 || v.z < haeuserKasten[1] - 40 || v.z > haeuserKasten[3] + 40) weit++
      if (n === 'boden' && v.y - E[0].y < -0.0501) tief++
    }
  }
  wahr(`${name}: Grund nur um die Siedlung (${weit} Ecken weiter als 40 m)`, weit === 0)
  wahr(`${name}: Wiese ueber -0,06 (${tief})`, tief === 0)
  // Himmel: weiter weg, und kleiner, wenn die Kamera nicht so weit sieht.
  const himmel = mit.gruppe.children.find((x) => x.name === 'himmel')
  himmel.geometry.computeBoundingSphere()
  nahe(`${name}: Himmel 760 m`, himmel.geometry.boundingSphere.radius, 760, 1)
  const kam = new PerspectiveCamera(60, 1, 0.05, 400)
  kam.updateMatrixWorld()
  himmel.onBeforeRender(null, null, kam, himmel.geometry, himmel.material, null)
  nahe(`${name}: Himmel passt in far 400`, himmel.matrixWorld.elements[0], (400 * 0.95) / 760, 1e-9)
  const ver = mit.version()
  wahr(`${name}: version() eine Zahl, ruhig`, Number.isInteger(ver) && mit.version() === ver)
  let wirft = false
  try {
    mit.kamera(E[0].hindernisse[0].x, E[0].y + 1.6, E[0].hindernisse[0].z)
    mit.kamera(Number.NaN, Number.NaN, Number.NaN)
    wahr(`${name}: schritt() eine Antwort`, typeof mit.schritt(0.016, 1.6) === 'boolean')
  } catch (e) {
    console.log('  wirft:', e)
    wirft = true
  }
  wahr(`${name}: kamera() und schritt() werfen nicht`, !wirft)
}

/** Eine Stadt zum Mitschreiben: die echte aus stadt3d.ts, dazu
 *  Hindernisse, Gelaende, Ebenen, Treppen, Ziele und Karte, die man kennt,
 *  und eine version(), die die Pruefung hochzaehlt. */
function spion() {
  const s = { optionen: null, kamera: [], weg: 0, version: 0, laeuft: false }
  const hoehe = () => 1.25
  const hindernis = (z) => ({ x: 90, z, laenge: 4, tiefe: 0.3, drehY: 0, oben: 0.6 })
  const ebene = (k) => ({ id: `w1:${k}`, name: `Probeladen ${k}`, y: k * 3.2, hindernisse: [{ x: 90, z: 87, laenge: 1, tiefe: 1, drehY: 0 }] })
  const bauen = (o) => {
    const echt = baueStadt(o)
    s.optionen = o
    return {
      ...echt,
      hindernisse: () => (s.version === 0 ? [hindernis(70)] : [hindernis(70), hindernis(75)]),
      hoehe,
      ebenen: () => Array.from({ length: 1 + s.version }, (_, k) => ebene(k)),
      treppen: () => (s.version === 0 ? [] : [{ id: 'w1:s', x: 90, z: 79.5, laenge: 1.2, breite: 1.5, drehY: 0, von: o.bodenEbene, nach: 'w1:0', stufen: 1 }]),
      fahrzeuge: () => [],
      dinge: () => [],
      sprungziele: [{ name: 'Probeladen', ebene: -1, x: 90, z: 78, gier: 0 }],
      karte: {
        rahmen: [-300, -250, 300, 260],
        haeuser: [{ name: 'Probeladen', punkte: [[80, 80], [100, 80], [100, 95], [80, 95]] }],
        flaechen: [{ art: 'wald', punkte: [[-180, -180], [-120, -180], [-120, -120], [-180, -120]] }],
        strassen: [{ art: 'haupt', breite: 7, punkte: [[60, -150], [60, 150]] }],
        orte: [{ name: 'Probeladen', x: 90, z: 87 }],
      },
      version: () => s.version,
      kamera: (x, y, z) => s.kamera.push([x, y, z]),
      schritt: () => s.laeuft,
      dispose: () => {
        s.weg++
        echt.dispose()
      },
    }
  }
  return { s, bauen, hoehe }
}

const STADT_FAELLE = [
  ['Stadt, Gast im 1. OG', () => siedlung(FAELLE[0][1]), null],
  ['Stadt, Besitzer im 1. OG', () => siedlung(FAELLE[0][1]), RAHMEN],
  ['Stadt, ohne Wohnung', () => siedlung(null), null],
  ['Stadt, mit Plaenen', () => mitInnen(null), null],
  ['Stadt, Gast mit Plaenen', () => mitInnen(FAELLE[0][1]), null],
]
for (const [name, daten, rahmen] of STADT_FAELLE) {
  // Mit der echten Stadt aus stadt3d.ts.
  const ohne = bau({ siedlung: daten(), farben: F, wohnungRahmen: rahmen })
  const mit = bau({ siedlung: { ...daten(), stadt: STADT }, farben: F, wohnungRahmen: rahmen })
  stadtWie(name, ohne, mit)
  freigeben(`${name} (mit)`, mit)

  // Mit der mitschreibenden: die Verdrahtung im Einzelnen.
  const { s, bauen, hoehe } = spion()
  const w = bau({ siedlung: { ...daten(), stadt: STADT }, farben: F, wohnungRahmen: rahmen, stadtBauen: bauen })
  const n = `${name}, mitgeschrieben`
  stadtWie(n, ohne, w)
  const E = w.ebenen
  const o = s.optionen
  w.gruppe.updateMatrixWorld(true)
  wahr(`${n}: Optionen`, !!o && o.stadt.art === 'kistly-stadt' && o.farben === F && o.bodenEbene === E[0].id && o.bodenY === E[0].y)
  const lm = lageVon(w).matrixWorld.elements
  wahr(`${n}: zuWelt wie die Lage der Siedlung`, !!o && o.zuWelt.elements.every((x, i) => Math.abs(x - lm[i]) < 1e-9))
  // aussparen (lokal): ein Rechteck um alle Haeuser, Spielplatz und Wege, dazu die Grube der Rampe.
  {
    const a = o?.aussparen ?? []
    const r = a[0] ?? []
    const xs = r.map((p) => p[0])
    const zs = r.map((p) => p[1])
    const imKern = (p) => p[0] > Math.min(...xs) && p[0] < Math.max(...xs) && p[1] > Math.min(...zs) && p[1] < Math.max(...zs)
    const d = daten()
    const alles = [...d.gebaeude.flatMap((h) => h.umriss), ...(d.aussen.spielplatz ?? []), ...d.aussen.wege.flat()]
    wahr(`${n}: aussparen um den eigenen Grund (${a.length})`, r.length === 4 && alles.every(imKern))
    wahr(`${n}: aussparen mit der Grube der Rampe`, a.length === 2 && a[1].length === 4 && a[1].every(imKern))
  }
  wahr(`${n}: Gelaende der Stadt am Boden`, E[0].hoehe === hoehe && E[0].hoehe(0, 0) === 1.25)
  const eigeneZahl = ohne.ebenen.length
  const bodenOhneStadt = E[0].hindernisse.length - 1
  wahr(`${n}: Hindernisse der Stadt am Boden`, JSON.stringify(E[0].hindernisse[E[0].hindernisse.length - 1]) === JSON.stringify({ x: 90, z: 70, laenge: 4, tiefe: 0.3, drehY: 0, oben: 0.6 }))
  wahr(`${n}: Ebenen der Stadt hinten an`, E.length === eigeneZahl + 1 && E[eigeneZahl].id === 'w1:0')
  wahr(`${n}: anfangs version 0`, w.version() === 0)
  const S = w.sprungziele
  const zs = S[S.length - 1]
  wahr(`${n}: Ziel der Stadt mit Ebene des Bodens`, zs.name === 'Probeladen' && zs.ebene === 0 && zs.x === 90 && zs.z === 78)
  const K = w.karte
  wahr(`${n}: Karte: Rahmen vereint`, K.rahmen[0] === -300 && K.rahmen[1] === -250 && K.rahmen[2] === 300 && K.rahmen[3] === 260)
  wahr(`${n}: Karte: Haus, Flaeche zuerst, Strassen, Orte`, K.haeuser[K.haeuser.length - 1].name === 'Probeladen' && K.flaechen[0].art === 'wald' && K.strassen.length === 1 && K.orte.length === 1)
  // Neues aus der Stadt (ein Haus innen nachgeladen).
  s.version = 1
  wahr(`${n}: version zaehlt mit`, w.version() === 1 && w.version() === 1)
  wahr(`${n}: neue Ebene hinten, alte am Platz`, E.length === eigeneZahl + 2 && E[eigeneZahl].id === 'w1:0' && E[eigeneZahl + 1].id === 'w1:1' && E === w.ebenen)
  wahr(`${n}: neue Hindernisse am Boden`, E[0].hindernisse.length === bodenOhneStadt + 2)
  const T = w.treppen
  wahr(`${n}: Treppen der Stadt hinten an`, T.length === ohne.treppen.length + 1 && T[T.length - 1].id === 'w1:s' && T[T.length - 1].von === E[0].id)
  // kamera() und schritt() reichen weiter.
  w.kamera(1, 2, 3)
  w.kamera(Number.NaN, Number.NaN, Number.NaN)
  const k2 = s.kamera.slice(-2)
  wahr(`${n}: kamera() reicht weiter`, k2.length === 2 && k2[0].join() === '1,2,3' && k2[1].every(Number.isNaN))
  wahr(`${n}: schritt() ruhig`, w.schritt(0.016, 1.6) === false)
  s.laeuft = true
  wahr(`${n}: schritt() meldet die Stadt`, w.schritt(0.016, 1.6) === true)
  s.laeuft = false
  const vorher = s.kamera.length
  freigeben(n, w)
  wahr(`${n}: dispose() gibt die Stadt frei`, s.weg === 1)
  w.kamera(1, 2, 3)
  wahr(`${n}: nach dispose still`, s.kamera.length === vorher && w.version() === 1)
  freigeben(`${name} (ohne)`, ohne)
}

/** f ausfuehren und console.warn mitschreiben: [Ergebnis, Warnungen]. */
function mitWarnungen(f) {
  const alt = console.warn
  const liste = []
  console.warn = (...a) => liste.push(a.map(String).join(' '))
  try {
    return [f(), liste]
  } finally {
    console.warn = alt
  }
}

// Unbrauchbare Stadt: ein Fehler zum Zeigen (und in der Konsole), die
// Siedlung steht wie ohne.
{
  const ohne = bau({ siedlung: siedlung(FAELLE[0][1]), farben: F, wohnungRahmen: null })
  const zuWelt = (w) => JSON.stringify([w.ebenen.map(ebeneText), w.sprungziele.map(zielText), abdruckKurz(abdruck(w)).tris, w.nebel.far])
  const [falsch, w1] = mitWarnungen(() => bau({ siedlung: { ...siedlung(FAELLE[0][1]), stadt: { ...STADT, art: 'falsch' } }, farben: F, wohnungRahmen: null }))
  wahr(`Stadt falsch: Fehler (${falsch.stadtFehler})`, typeof falsch.stadtFehler === 'string' && falsch.gruppe.userData.stadt === false && w1.length === 1)
  wahr('Stadt falsch: wie ohne Stadt', zuWelt(falsch) === zuWelt(ohne))
  const [kaputt, w2] = mitWarnungen(() =>
    bau({
      siedlung: { ...siedlung(FAELLE[0][1]), stadt: STADT },
      farben: F,
      wohnungRahmen: null,
      stadtBauen: () => {
        throw new Error('Probefehler')
      },
    }),
  )
  wahr(`Stadt wirft: Fehler (${kaputt.stadtFehler})`, typeof kaputt.stadtFehler === 'string' && kaputt.stadtFehler.includes('Probefehler') && w2.length === 1)
  wahr('Stadt wirft: wie ohne Stadt', zuWelt(kaputt) === zuWelt(ohne))
  wahr('ohne Stadt: kein Fehler, version 0', ohne.stadtFehler === null && ohne.version() === 0)
  for (const [n, w] of [
    ['Stadt falsch', falsch],
    ['Stadt wirft', kaputt],
    ['Stadt, Vergleich', ohne],
  ])
    freigeben(n, w)
}

/* ------------------------------------------------ E87: erfundene Wohnungen */

/** Ein Generator zum Mitschreiben: fuer die Haeuser in fuer zwei
 *  Wohnungen je Geschoss an einem Gang mit Stiege und Aufzug (oder, wenn
 *  ein Kern da ist, eine Wohnung ohne Gang), sonst null. */
function erfinder(fuer) {
  const log = []
  const erfinden = (e) => {
    log.push(e)
    if (!fuer.includes(e.gebaeudeId)) return null
    const xs = e.umrissCm.map((p) => p[0])
    const ys = e.umrissCm.map((p) => p[1])
    const [x0, y0, x1, y1] = [Math.min(...xs) + 80, Math.min(...ys) + 80, Math.max(...xs) - 80, Math.max(...ys) - 80]
    const R = (a, b, c, d) => [[a, b], [c, b], [c, d], [a, d]]
    const tuer = (kante) => ({ raum: 0, art: 'tuer', kante, abstand_cm: 100, breite_cm: 100, hoehe_cm: 210, bruestung_cm: 0, anschlag: 'links', aufschlag: 'innen' })
    const xm = (x0 + x1) / 2
    const ym = (y0 + y1) / 2
    const geschoss = (k) =>
      e.kern.length
        ? { geschoss: k, wohnungen: [{ top: `E${k}1`, typ: 'E', raeume: [{ name: 'Wohnen', art: 'innen', punkte: R(x0, y0, x1, y1) }], oeffnungen: [], moebel: [], eingang: null }], allgemein: [] }
        : {
            geschoss: k,
            wohnungen: [
              { top: `E${k}1`, typ: 'E', raeume: [{ name: 'Wohnen', art: 'innen', punkte: R(x0, y0, xm, ym - 100) }], oeffnungen: [tuer(2)], moebel: [], eingang: [xm - 150, ym - 80] },
              { top: `E${k}2`, typ: 'E', raeume: [{ name: 'Wohnen', art: 'innen', punkte: R(xm, y0, x1, ym - 100) }], oeffnungen: [tuer(2)], moebel: [], eingang: [x1 - 150, ym - 80] },
            ],
            allgemein: [
              { art: 'gang', punkte: R(x0, ym - 100, x1, ym + 100) },
              { art: 'stiege', punkte: R(x1 - 200, ym + 100, x1, ym + 650) },
              { art: 'aufzug', punkte: R(x1 - 450, ym + 100, x1 - 240, ym + 310) },
            ],
          }
    return { gebaeudeId: e.gebaeudeId, x: e.x, z: e.z, drehung: e.drehung, geschosse: Array.from({ length: e.geschosse }, (_, k) => geschoss(k)) }
  }
  return { erfinden, log }
}
/** Plan (cm) im Rahmen r (x, z, drehung) -> lokal (m), wie innenLesen. */
const ausRahmen = (r, [x, y]) => {
  const [c, s] = { 0: [1, 0], 90: [0, 1], 180: [-1, 0], 270: [0, -1] }[r.drehung]
  return [r.x + (c * x - s * y) / 100, r.z + (s * x + c * y) / 100]
}

// Ein Haus ohne Plaene (Haus 4) bekommt Wohnungen, Gang, Stiege und Aufzug.
{
  const { erfinden, log } = erfinder(['h4'])
  const w = bau({ siedlung: siedlung(null), farben: F, wohnungRahmen: null, innenErfinden: erfinden })
  const E = w.ebenen
  wahr(`Erfunden: fuer jedes Haus gefragt (${log.length})`, log.length === HAEUSER.length && HAEUSER.every((h) => log.some((e) => e.gebaeudeId === h.id)))
  const e4 = log.find((e) => e.gebaeudeId === 'h4')
  const h4 = HAEUSER.find((h) => h.id === 'h4')
  wahr('Erfunden: Rahmen und Umriss passen', !!e4 && e4.geschosse === 5 && e4.kern.length === 0 && e4.gang.length === 0 && e4.umrissCm.every((p, i) => punktGleich(ausRahmen(e4, p), h4.umriss[i], 2e-3)))
  wahr('Erfunden: Umriss beginnt bei 0', Math.abs(Math.min(...e4.umrissCm.map((p) => p[0]))) < 0.2 && Math.abs(Math.min(...e4.umrissCm.map((p) => p[1]))) < 0.2)
  wahr(`Erfunden: ein Haus innen (${w.gruppe.userData.innen}, ${w.gruppe.userData.innenFehler} Fehler)`, w.gruppe.userData.innen === 1 && w.gruppe.userData.innenFehler === 0)
  const ids = E.map((e) => e.id)
  wahr(`Erfunden: Ebenen ${ids.join(',')}`, ids.join(',') === 'boden,h4:1,h4:2,h4:3,h4:4,h4:0.5,h4:1.5,h4:2.5,h4:3.5')
  wahr('Erfunden: Sprungziele je Wohnung', w.sprungziele.filter((s) => /^E\d\d, /.test(s.name)).length === 10)
  w.gruppe.updateMatrixWorld(true)
  const LG = lageVon(w)
  const welt = (p) => {
    const v = new Vector3(p[0], 0, p[1]).applyMatrix4(LG.matrixWorld)
    return [v.x, v.z]
  }
  const plan4 = (p) => welt(ausRahmen(e4, p))
  // Hinein (zum Bauen), dann die Treppe ueber fuenf Geschosse.
  const xs = e4.umrissCm.map((p) => p[0])
  const ys = e4.umrissCm.map((p) => p[1])
  const mitte = plan4([(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2])
  w.kamera(mitte[0], E[0].y + 1.6, mitte[1])
  ruhe(w)
  w.gruppe.updateMatrixWorld(true)
  const stiege = erfinden(e4).geschosse[0].allgemein.find((a) => a.art === 'stiege').punkte.map(plan4)
  treppenPruefen('Erfunden', w, { id: 'h4', gh: 3, geschosse: ['boden', 'h4:1', 'h4:2', 'h4:3', 'h4:4'], stiegen: [stiege], meshes: meshesVon(w.gruppe.getObjectByName('innen:h4')) })
  wahr('Erfunden: gebaut wie Plaene', meshesVon(w.gruppe.getObjectByName('innen:h4')).filter((m) => /^innen:h4:\d$/.test(m.name)).length === 5)
  freigeben('Erfunden', w)
}

// Das eigene Haus ohne Plaene: der Generator bekommt Kern und Laubengang,
// daraus werden Stiege, Aufzug und Laubengang der Plaene.
{
  const wohnung = FAELLE[0][1]
  const h5 = HAEUSER.find((h) => h.id === 'h5')
  const { erfinden, log } = erfinder(['h5'])
  const w = bau({ siedlung: siedlung(wohnung), farben: F, wohnungRahmen: null, innenErfinden: erfinden })
  const E = w.ebenen
  const e5 = log.find((e) => e.gebaeudeId === 'h5')
  wahr('Eigenes erfunden: Kern und Gang mitgegeben', !!e5 && e5.kern.length === 1 && e5.gang.length === 1 && e5.kern[0].length === 4 && e5.gang[0].length === 4)
  const L = lage(wohnung)
  const kerne = kernRechtecke(h5, L.welt)
  const kernWelt = e5 ? e5.kern[0].map((p) => L.welt(ausRahmen(e5, p))) : []
  wahr('Eigenes erfunden: Kern am Gang', kerne.some((k) => kernWelt.every((p) => k.some((q) => punktGleich(p, q, 2e-3)))))
  wahr(`Eigenes erfunden: ein Haus mit Plaenen, kein Kern mehr (${w.gruppe.userData.kern})`, w.gruppe.userData.innen === 1 && w.gruppe.userData.kern === false)
  const ids = E.map((e) => e.id)
  wahr(`Eigenes erfunden: Ebenen ${ids.join(',')}`, ids.join(',') === 'boden,h5:1,h5:2,h5:3,h5:0.5,h5:1.5,h5:2.5')
  w.gruppe.updateMatrixWorld(true)
  // Auf die Treppe im Kern (vor der Fassade): das Haus baut sein Inneres.
  const t0 = w.treppen.find((t) => t.id === 'h5:t0a')
  wahr('Eigenes erfunden: Treppe im Kern', !!t0)
  if (t0) {
    const [x, z] = anTreppe(t0, t0.laenge / 2 - 0.1, 0)
    w.kamera(x, E[0].y + 1.5 + 1.6, z)
    ruhe(w)
    w.gruppe.updateMatrixWorld(true)
    const innenH5 = w.gruppe.getObjectByName('innen:h5')
    wahr('Eigenes erfunden: auf der Treppe vor der Fassade innen sichtbar', !!innenH5 && innenH5.visible)
    treppenPruefen('Eigenes erfunden', w, { id: 'h5', gh: 3, geschosse: ['boden', 'h5:1', 'h5:2', 'h5:3'], stiegen: kerne, meshes: meshesVon(innenH5) })
    wahr('Eigenes erfunden: Aufzug aus dem Kern', w.interaktiv.objekte.some((o) => o.name === 'aufzugFahre:h5:3'))
  }
  eigenePruefen('Eigenes erfunden', w, wohnung, null, E.findIndex((e) => e.id === 'h5:1'), [h5.umriss.map(L.welt)])
  freigeben('Eigenes erfunden', w)
}

// Haeuser mit Plaenen fragt niemand; Fehler des Generators fallen weg.
{
  const { erfinden, log } = erfinder(['h4', 'h5'])
  const w = bau({ siedlung: mitInnen(null), farben: F, wohnungRahmen: null, innenErfinden: erfinden })
  wahr('Erfunden: Haus mit Plaenen nicht gefragt', !log.some((e) => e.gebaeudeId === 'h5') && w.gruppe.userData.innen === 2)
  freigeben('Erfunden mit Plaenen', w)
  const normal = bau({ siedlung: siedlung(null), farben: F, wohnungRahmen: null })
  const wie = (x) => JSON.stringify([x.ebenen.map(ebeneText), x.sprungziele.map(zielText), abdruckKurz(abdruck(x)).tris])
  const [werfen, w1] = mitWarnungen(() =>
    bau({
      siedlung: siedlung(null),
      farben: F,
      wohnungRahmen: null,
      innenErfinden: () => {
        throw new Error('Probefehler')
      },
    }),
  )
  wahr(
    `Erfunden wirft: alles wie ohne (${werfen.gruppe.userData.innenFehler} Fehler, ${w1.length} Warnungen)`,
    werfen.gruppe.userData.innenFehler === HAEUSER.length && w1.length === HAEUSER.length && wie(werfen) === wie(normal),
  )
  const [unsinn, w2] = mitWarnungen(() =>
    bau({
      siedlung: siedlung(null),
      farben: F,
      wohnungRahmen: null,
      innenErfinden: (e) =>
        e.gebaeudeId === 'h4'
          ? { gebaeudeId: 'h4', x: e.x, z: e.z, drehung: e.drehung, geschosse: [{ geschoss: 0, wohnungen: [{ top: 'X' }], allgemein: [] }] }
          : e.gebaeudeId === 'h3'
            ? { gebaeudeId: 'h1', x: e.x, z: e.z, drehung: e.drehung, geschosse: [] }
            : null,
    }),
  )
  wahr(
    `Erfunden kaputt: verworfen (${unsinn.gruppe.userData.innenFehler} Fehler, ${w2.length} Warnungen)`,
    unsinn.gruppe.userData.innenFehler === 2 && w2.length === 2 && unsinn.gruppe.userData.innen === 0 && wie(unsinn) === wie(normal),
  )
  for (const [n, x] of [
    ['Erfunden, normal', normal],
    ['Erfunden wirft', werfen],
    ['Erfunden kaputt', unsinn],
  ])
    freigeben(n, x)
}

/* ------------------------------------------------ E87: echte erfundene Wohnungen */
/* Mit dem echten Generator (innenGenerator.wohnhausInnen, hier nur
 * mitgeschrieben): jedes Haus ohne Plaene bekommt Wohnungen, Gang, Stiege
 * und Treppen, gebaut wie Plaene; jedes Geschoss ist ueber Treppen in der
 * Stiege erreichbar (Kanten, Seiten, Linie auf den Stufen wie oben); das
 * eigene Haus behaelt Kern und Laubengang. */
for (const [name, wohnung, rahmen] of [
  ['Echt erfunden, Gang 1. OG', FAELLE[0][1], RAHMEN],
  ['Echt erfunden, Gast im 3. OG', FAELLE[1][1], null],
  ['Echt erfunden, ohne Wohnung', null, null],
]) {
  const log = []
  const erfinden = (e) => {
    const r = wohnhausInnen(e)
    log.push([e, r])
    return r
  }
  const t0 = performance.now()
  const w = baueSiedlung({ siedlung: siedlung(wohnung), farben: F, wohnungRahmen: rahmen, innenErfinden: erfinden })
  const ms = performance.now() - t0
  const u = w.gruppe.userData
  wahr(`${name}: jedes Haus mit Wohnungen (${u.innen} Haeuser, ${u.innenFehler} Fehler, ${Math.round(ms)} ms)`, u.innen === HAEUSER.length && u.innenFehler === 0 && log.length === HAEUSER.length && log.every(([, r]) => !!r))
  const E = w.ebenen
  const ids = E.map((e) => e.id)
  const eigen = wohnung ? wohnung.gebaeudeId : null
  wahr(`${name}: Boden zuerst (${ids[0]})`, ids[0] === (rahmen && wohnung.geschoss === 0 ? 'wohnung' : 'boden'))
  wahr(`${name}: Kennungen eindeutig`, new Set(ids).size === ids.length)
  const kennung = (h, k) => (k === 0 ? ids[0] : rahmen && h.id === eigen && k === wohnung.geschoss ? 'wohnung' : `${h.id}:${k}`)
  for (const h of HAEUSER) for (let k = 1; k < h.geschosse; k++) wahr(`${name}: Ebene ${kennung(h, k)} da`, ids.includes(kennung(h, k)))
  const flats = log.reduce((s, [, r]) => s + r.geschosse.reduce((a, g) => a + g.wohnungen.length, 0), 0)
  const ziele = w.sprungziele.filter((s) => /^Haus-[A-Z]-\d+, [^,]+$/.test(s.name)).length
  wahr(`${name}: Sprungziele je Wohnung mit Eingang (${ziele} von ${flats})`, ziele > 0 && ziele <= flats)
  w.gruppe.updateMatrixWorld(true)
  const LG = lageVon(w)
  const nachWelt = (p) => {
    const v = new Vector3(p[0], 0, p[1]).applyMatrix4(LG.matrixWorld)
    return [v.x, v.z]
  }
  for (const h of HAEUSER) {
    const [, roh] = log.find(([e]) => e.gebaeudeId === h.id)
    // Stiegen: aus dem Plan (cm im Rahmen des Geschosses) und, beim eigenen Haus, der Kern am Gang.
    const stiegen = roh.geschosse[0].allgemein.filter((a) => a.art === 'stiege').map((a) => a.punkte.map((p) => nachWelt(ausRahmen(roh, p))))
    if (h.id === eigen) stiegen.push(...kernRechtecke(h, lage(wohnung).welt))
    // Hinein: das Haus baut sein Inneres.
    const mitte = h.umriss.reduce((s, p) => [s[0] + p[0] / h.umriss.length, s[1] + p[1] / h.umriss.length], [0, 0])
    const [mx, mz] = nachWelt(mitte)
    w.kamera(mx, E[0].y + 1.6, mz)
    ruhe(w)
    w.gruppe.updateMatrixWorld(true)
    const innenH = w.gruppe.getObjectByName(`innen:${h.id}`)
    wahr(`${name}: ${h.id} innen gebaut`, !!innenH && innenH.visible)
    if (!innenH) continue
    const geschosse = Array.from({ length: h.geschosse }, (_, k) => kennung(h, k))
    treppenPruefen(`${name}`, w, { id: h.id, gh: h.geschossHoehe, geschosse, stiegen, meshes: meshesVon(innenH) })
  }
  // Der Aufzug des Kerns (eigenes Haus) ist da, sobald das Haus gebaut ist.
  wahr(`${name}: Aufzug im eigenen Haus`, !eigen || (!!w.interaktiv && w.interaktiv.objekte.some((x) => typeof x.name === 'string' && x.name.startsWith(`aufzugFahre:${eigen}`))))
  // Kein Boden doppelt: Gang und Kern des Generators sind durch die genauen Teile ersetzt.
  if (eigen) {
    const [, roh] = log.find(([e]) => e.gebaeudeId === eigen)
    wahr(`${name}: Generator bekam Kern und Gang`, roh.geschosse.every((g) => g.allgemein.some((a) => a.art === 'stiege') && g.allgemein.some((a) => a.art === 'gang')))
  }
  freigeben(name, w)
}

/* ------------------------------------------------ E87: Hindernisse am Boden bleiben dasselbe Feld */
/* Die Stadt laedt ein Haus innen (version zaehlt hoch): ihre Hindernisse
 * bleiben dasselbe Feld, also auch das am Boden der Siedlung (der Motor
 * rastert es nicht neu), mit denselben Rechtecken. */
{
  const w = bau({ siedlung: { ...siedlung(FAELLE[0][1]), stadt: STADT }, farben: F, wohnungRahmen: null })
  const E = w.ebenen
  const boden = E[0].hindernisse
  const eintraege = boden.slice()
  const garten = E.find((e) => e.id === 'garten')
  const gartenVorher = garten ? garten.hindernisse : null
  w.gruppe.updateMatrixWorld(true)
  const LG = lageVon(w)
  // Vor die Tuer des Probeladens (Ort bei 90, 78, Siedlungsmeter).
  const v = new Vector3(90, 0, 76).applyMatrix4(LG.matrixWorld)
  const v0 = w.version()
  w.kamera(v.x, E[0].y + 1.6, v.z)
  for (let i = 0; i < 600 && w.version() === v0; i++) w.schritt(1 / 60, E[0].y + 1.6)
  wahr(`Stadt laedt innen: version zaehlt (${v0} -> ${w.version()})`, w.version() > v0 && w.ebenen.some((e) => e.id.startsWith('stadt:w1:')))
  wahr('Stadt laedt innen: Hindernisse am Boden dasselbe Feld', E[0].hindernisse === boden && boden.length === eintraege.length && boden.every((h, i) => h === eintraege[i]))
  wahr('Stadt laedt innen: im Garten auch', !garten || garten.hindernisse === gartenVorher)
  // E87b: dingErzeugen reicht Kennungen der Stadt an die Stadt weiter.
  const dingStadt = w.dinge.find((d) => d.id.startsWith('stadt:w1:'))
  wahr('Stadt: Dinge im Laden mit Art in der Kennung', !!dingStadt && /^stadt:w1:d\d+:[a-z]+$/.test(dingStadt.id))
  const vA = w.version()
  wahr('Stadt: dingErzeugen gibt Vorhandenes der Stadt zurueck', !!dingStadt && w.dingErzeugen(dingStadt.id) === dingStadt && w.version() === vA)
  const draussen = w.dingErzeugen('stadt:d:300:-200:tonne')
  wahr('Stadt: dingErzeugen baut ein Ding der Stadt, version zaehlt', !!draussen && draussen.id === 'stadt:d:300:-200:tonne' && w.dinge.includes(draussen) && w.version() > vA)
  if (draussen) {
    const [x, y, z] = w.rahmen.zuSiedlung(draussen.objekt.position.x, draussen.objekt.position.y, draussen.objekt.position.z, 0)
    wahr('Stadt: das Ding liegt in Siedlungsmetern dort, wo die Kennung sagt', Math.abs(x - 30) < 1e-9 && Math.abs(z + 20) < 1e-9 && Number.isFinite(y))
  }
  wahr('Stadt: dingErzeugen mit unbekannter Kennung null', w.dingErzeugen('stadt:d:1:2:rakete') === null)
  freigeben('Stadt, Feld bleibt', w)
}

if (process.env.SIEDLUNG_ABDRUCK) console.log(JSON.stringify(Object.fromEntries(Object.entries(ABDRUCK).map(([k, v]) => [k, abdruckKurz(v)]))))

if (fehler) {
  console.log(`${fehler} Abweichung(en)`)
  process.exit(1)
}
console.log(`ok (hoechstens ${hoechst} Dreiecke, ${hoechstAufrufe} Zeichenaufrufe, Bau hoechstens ${Math.round(langsamst)} ms)`)
