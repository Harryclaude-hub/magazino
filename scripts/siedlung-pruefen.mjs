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
// Aufruf im Projektordner: node scripts/siedlung-pruefen.mjs
// Ausgabe "ok" oder die abweichenden Faelle, Exit 1 bei Fehlern.
import { BackSide, PerspectiveCamera, Vector3 } from 'three'
import { aufzugZiel, baueSiedlung } from '../src/components/plan3d/siedlung3d.ts'

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

/* ------------------------------------------------ Faelle */

function pruefen(name, wohnung, rahmen, aussen = AUSSEN) {
  const t0 = performance.now()
  const w = baueSiedlung({ siedlung: siedlung(wohnung, aussen), farben: F, wohnungRahmen: rahmen })
  const zeit = performance.now() - t0
  w.gruppe.updateMatrixWorld(true)
  const meshes = meshesVon(w.gruppe)
  const nach = new Map(meshes.map((m) => [m.name, m]))
  const haus = wohnung ? HAEUSER.find((h) => h.id === wohnung.gebaeudeId) : null

  // Meshes, Zeichenaufrufe, Dreiecke, Farben.
  for (const n of ['himmel', 'boden', 'gelaende', 'gruen', 'bauten']) wahr(`${name}: Mesh ${n} da`, nach.has(n))
  wahr(`${name}: Kabine und Tueren genau mit Wohnung`, nach.has('kabine') === !!wohnung && nach.has('aufzugTueren') === !!wohnung)
  const sichtbar = meshes.filter((m) => m.visible)
  wahr(`${name}: unter 25 Zeichenaufrufe (${sichtbar.length})`, sichtbar.length < 25)
  const summe = meshes.reduce((s, m) => s + dreiecke(m), 0)
  wahr(`${name}: unter 150 000 Dreiecke (${summe})`, summe < 150000)
  for (const m of meshes) {
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
    const gh = haus.geschossHoehe
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
          if (drin < 3) console.log('  in der Wohnung:', m.name, [a, b, c].map((v) => v.toArray().map((x) => +x.toFixed(3))))
          drin++
        }
      }
    }
    wahr(`${name}: kein Dreieck in der Wohnung (${drin})`, drin === 0)
  }

  // Ebenen.
  const E = w.ebenen
  if (haus) {
    const g = wohnung.geschoss
    const gh = haus.geschossHoehe
    wahr(`${name}: Ebenen = Geschosse + Garten (${E.length})`, E.length === haus.geschosse + 1)
    for (let k = 0; k < haus.geschosse; k++) {
      nahe(`${name}: Ebene ${k} Hoehe`, E[k].y, (k - g) * gh, 1e-9)
      wahr(`${name}: Ebene ${k} Name`, E[k].name === (k === 0 ? 'EG' : `${k}. OG`))
      wahr(`${name}: Ebene ${k} Kennung`, E[k].id === (k === g ? 'wohnung' : `geschoss-${k}`))
    }
    const garten = E[E.length - 1]
    wahr(`${name}: Garten zuletzt`, garten.id === 'garten' && garten.name === 'Garten')
    nahe(`${name}: Garten Hoehe`, garten.y, -g * gh, 1e-9)
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
  // Spielgeraete stehen als Hindernisse im Garten (Mitte im Spielplatz).
  if (aussen.spielplatz) {
    const garten = E[E.length - 1]
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
    }
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
function freigeben(name, w) {
  const offen = new Set()
  for (const m of meshesVon(w.gruppe)) {
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
  wahr(`${name}: Gruppe leer`, w.gruppe.children.length === 0)
  wahr(`${name}: nach dispose still`, w.schritt(0.1, 1.6) === false && w.fahrt() === null && aufzugZiel(w) === null)
  if (w.interaktiv) w.interaktiv.tippen(w.interaktiv.objekte[0])
}

let hoechst = 0
let hoechstAufrufe = 0
let langsamst = 0
for (const [name, wohnung, rahmen] of FAELLE) {
  const a = pruefen(name, wohnung, rahmen)
  const b = baueSiedlung({ siedlung: siedlung(wohnung), farben: F, wohnungRahmen: rahmen })
  // Vergleich mit einem frischen Bau (a ist durch die Fahrten veraendert).
  const c = baueSiedlung({ siedlung: siedlung(wohnung), farben: F, wohnungRahmen: rahmen })
  gleich(name, b, c)
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

// Unsinnige Daten werfen laut.
const wirft = (name, siedlungDaten, rahmen = RAHMEN) => {
  let geworfen = false
  try {
    baueSiedlung({ siedlung: siedlungDaten, farben: F, wohnungRahmen: rahmen })
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

if (fehler) {
  console.log(`${fehler} Abweichung(en)`)
  process.exit(1)
}
console.log(`ok (hoechstens ${hoechst} Dreiecke, ${hoechstAufrufe} Zeichenaufrufe, Bau hoechstens ${Math.round(langsamst)} ms)`)
