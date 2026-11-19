// Prueft die Welt draussen (src/components/plan3d/aussen3d.ts) ohne
// Browser: nur Himmel, ebener Boden und ein Bretterzaun (kein Baum, keine
// Strasse, kein Haus), unter 30 000 Dreiecke, kein Teil in der Wohnung oder
// in einem freien Bereich, Zaun etwa 3 m weg und 1,5 m hoch, Himmel und
// Dunst wie verlangt, gleiche Eingabe gibt Ecke fuer Ecke dieselbe Welt,
// dispose() gibt alles frei. Jedes verschmolzene Teil bleibt als Gruppe im
// Mesh, darum wird je Teil geprueft.
// Aufruf im Projektordner: node scripts/aussen-pruefen.mjs
// Ausgabe "ok" oder die abweichenden Faelle, Exit 1 bei Fehlern.
import { BackSide, Color, PerspectiveCamera } from 'three'
import { baueUmgebung } from '../src/components/plan3d/aussen3d.ts'

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

// Die Farben wie in src/index.css (Auszug, den die Aussenwelt braucht).
const F = {
  rasen: '#7f9a5c',
  weg: '#b9b2a4',
  baum: '#4f7340',
  stamm: '#6b5340',
  hecke: '#5d7f47',
  himmelOben: '#9cc3e4',
  himmelUnten: '#e4ecef',
  fassade: '#e9e4da',
  wand3d: '#b9ad98',
}

const EPS = 1e-4
/** Plan-Ueberlappung zweier Rahmen {x0, z0, x1, z1} mit echter Flaeche. */
function ueberlapptPlan(a, b) {
  return a.x0 < b.x1 - EPS && a.x1 > b.x0 + EPS && a.z0 < b.z1 - EPS && a.z1 > b.z0 + EPS
}
const alsRahmen = (r) => ({ x0: Math.min(r[0], r[2]), z0: Math.min(r[1], r[3]), x1: Math.max(r[0], r[2]), z1: Math.max(r[1], r[3]) })

function meshesVon(gruppe) {
  const out = []
  gruppe.traverse((o) => {
    if (o.isMesh) out.push(o)
  })
  return out
}

function dreiecke(mesh) {
  const g = mesh.geometry
  return (g.index ? g.index.count : g.attributes.position.count) / 3
}

/** Rahmen je Teil (Gruppe) eines Meshes; ohne Gruppen das ganze Mesh. */
function teilRahmen(mesh) {
  const g = mesh.geometry
  const pos = g.attributes.position
  const idx = g.index
  const bereiche = g.groups.length ? g.groups : [{ start: 0, count: idx ? idx.count : pos.count }]
  return bereiche.map(({ start, count }) => {
    const b = { x0: Infinity, y0: Infinity, z0: Infinity, x1: -Infinity, y1: -Infinity, z1: -Infinity }
    for (let i = start; i < start + count; i++) {
      const k = idx ? idx.getX(i) : i
      const x = pos.getX(k)
      const y = pos.getY(k)
      const z = pos.getZ(k)
      b.x0 = Math.min(b.x0, x)
      b.x1 = Math.max(b.x1, x)
      b.y0 = Math.min(b.y0, y)
      b.y1 = Math.max(b.y1, y)
      b.z0 = Math.min(b.z0, z)
      b.z1 = Math.max(b.z1, z)
    }
    return b
  })
}

/** Abstand zweier Rahmen im Plan (0, wenn sie sich beruehren oder ueberlappen). */
function abstand(a, b) {
  const dx = Math.max(0, a.x0 - b.x1, b.x0 - a.x1)
  const dz = Math.max(0, a.z0 - b.z1, b.z0 - a.z1)
  return Math.hypot(dx, dz)
}

function pruefen(name, optionen) {
  const h = Math.max(0, optionen.stockwerkHoehe ?? 0)
  const w = baueUmgebung({ farben: F, ...optionen })
  const r = alsRahmen(optionen.rahmen)
  const frei = optionen.frei.map(alsRahmen)
  const meshes = meshesVon(w.gruppe)
  const nach = new Map(meshes.map((m) => [m.name, m]))

  // Welche Meshes es gibt: Fassade nur, wenn die Wohnung hoeher liegt.
  for (const n of ['himmel', 'boden', 'zaun']) wahr(`${name}: Mesh ${n} da`, nach.has(n))
  for (const n of ['wege', 'gruen', 'bauten', 'fassade']) wahr(`${name}: kein Mesh ${n}`, !nach.has(n))
  wahr(`${name}: genau 3 Zeichenaufrufe`, meshes.length === 3)
  wahr(`${name}: hoechstens 3 Materialien`, new Set(meshes.map((m) => m.material)).size <= 3)

  // Dreiecke.
  const summe = meshes.reduce((s, m) => s + dreiecke(m), 0)
  wahr(`${name}: unter 30 000 Dreiecke (${summe})`, summe < 30000)

  // Farben je Ecke, keine kaputten Zahlen.
  for (const m of meshes) {
    wahr(`${name}: ${m.name} hat vertexColors`, m.material.vertexColors === true)
    const col = m.geometry.attributes.color
    wahr(`${name}: ${m.name} hat Eckfarben`, !!col && col.count === m.geometry.attributes.position.count)
    if (col) wahr(`${name}: ${m.name} Eckfarben endlich und hell genug`, Array.from(col.array).every((v) => Number.isFinite(v) && v >= 0 && v <= 1.5))
    wahr(`${name}: ${m.name} Lage endlich`, Array.from(m.geometry.attributes.position.array).every(Number.isFinite))
  }

  // Wiese: Oberkante 2 cm unter dem untersten Geschoss, unter 0, gross, zeigt nach oben.
  const boden = nach.get('boden')
  if (boden) {
    boden.geometry.computeBoundingBox()
    const bb = boden.geometry.boundingBox
    nahe(`${name}: Wiese Oberkante`, bb.max.y, -h - 0.02, 1e-6)
    wahr(`${name}: Wiese unter 0`, bb.max.y < 0)
    wahr(`${name}: Wiese etwa 300 m Halbmesser`, bb.max.x - bb.min.x > 590 && bb.max.z - bb.min.z > 590)
    wahr(`${name}: Wiese weicht in der Tiefe`, boden.material.polygonOffset === true && boden.material.polygonOffsetFactor > 0)
    const p = boden.geometry.attributes.position
    const ix = boden.geometry.index
    let alleOben = true
    for (let t = 0; t < ix.count; t += 3) {
      const [a, b, c] = [ix.getX(t), ix.getX(t + 1), ix.getX(t + 2)]
      const ux = p.getX(b) - p.getX(a)
      const uz = p.getZ(b) - p.getZ(a)
      const vx = p.getX(c) - p.getX(a)
      const vz = p.getZ(c) - p.getZ(a)
      // y der Normalen (u x v)
      if (!(uz * vx - ux * vz > 0)) alleOben = false
    }
    wahr(`${name}: alle Dreiecke der Wiese zeigen nach oben`, alleOben)
  }

  // Himmel: von innen, ohne Dunst, ohne Tiefe, zuerst, nicht anklickbar, folgt der Kamera.
  const himmel = nach.get('himmel')
  if (himmel) {
    const mat = himmel.material
    wahr(`${name}: Himmel von innen`, mat.side === BackSide)
    wahr(`${name}: Himmel ohne Dunst`, mat.fog === false)
    wahr(`${name}: Himmel schreibt keine Tiefe`, mat.depthWrite === false)
    wahr(`${name}: Himmel wird zuerst gemalt`, meshes.every((m) => m === himmel || m.renderOrder > himmel.renderOrder))
    const treffer = []
    himmel.raycast({}, treffer)
    wahr(`${name}: Himmel nicht anklickbar`, treffer.length === 0)
    const kam = new PerspectiveCamera()
    kam.position.set(5, 7, -3)
    kam.updateMatrixWorld()
    himmel.onBeforeRender(null, null, kam, himmel.geometry, mat, null)
    const e = himmel.matrixWorld.elements
    wahr(`${name}: Himmel folgt der Kamera`, e[12] === 5 && e[13] === 7 && e[14] === -3)
    // Unten hell (himmelUnten), oben blauer (himmelOben).
    const pos = himmel.geometry.attributes.position
    const col = himmel.geometry.attributes.color
    let iOben = 0
    let iUnten = 0
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) > pos.getY(iOben)) iOben = i
      if (pos.getY(i) < pos.getY(iUnten)) iUnten = i
    }
    const oben = new Color(F.himmelOben)
    const unten = new Color(F.himmelUnten)
    nahe(`${name}: Himmel oben blau`, col.getZ(iOben), oben.b, 1e-6)
    nahe(`${name}: Himmel unten hell`, col.getX(iUnten), unten.r, 1e-6)
  }

  // Dunst und Hintergrund.
  wahr(`${name}: Dunst ab 45 m`, w.nebel.near === 45)
  wahr(`${name}: Dunst voll bei 220 m`, w.nebel.far === 220)
  wahr(`${name}: Dunst in himmelUnten`, '#' + w.nebel.color.getHexString() === F.himmelUnten)
  wahr(`${name}: Hintergrund himmelUnten`, w.himmel === F.himmelUnten)

  // Kein Teil in der Wohnung oder in einem freien Bereich.
  const wohnungAb = -0.02
  for (const m of meshes) {
    if (m.name === 'boden' || m.name === 'himmel') continue
    teilRahmen(m).forEach((b, i) => {
      if (ueberlapptPlan(b, r) && b.y1 > wohnungAb + EPS) {
        console.log('ABWEICHUNG', name, `${m.name} Teil ${i} steht in der Wohnung`, JSON.stringify(b))
        fehler++
      }
      frei.forEach((f, j) => {
        if (ueberlapptPlan(b, f)) {
          console.log('ABWEICHUNG', name, `${m.name} Teil ${i} steht im freien Bereich ${j}`, JSON.stringify(b))
          fehler++
        }
      })
    })
  }

  // Bretterzaun: 3 m um die Wohnung, 1,5 m hoch, nichts weiter weg als 3,2 m.
  const zaun = nach.get('zaun')
  if (zaun) {
    const teile = teilRahmen(zaun)
    wahr(`${name}: Zaun hat Teile (${teile.length})`, teile.length > 20)
    const hoch = Math.max(...teile.map((b) => b.y1)) - (-h - 0.02)
    wahr(`${name}: Zaun hoechstens 1,7 m hoch (${hoch.toFixed(2)})`, hoch <= 1.7 + EPS && hoch >= 1.45)
    for (const b of teile) {
      const dx = Math.max(r.x0 - b.x1, b.x0 - r.x1, 0)
      const dz = Math.max(r.z0 - b.z1, b.z0 - r.z1, 0)
      if (Math.max(dx, dz) > 3.2 || Math.max(dx, dz) < 2.7) {
        console.log('ABWEICHUNG', name, 'Zaunteil nicht etwa 3 m von der Wohnung', JSON.stringify(b))
        fehler++
        break
      }
    }
    // Senkrechte Bretter: schmal, hoch.
    const bretter = teile.filter((b) => b.y1 - b.y0 > 1.3 && Math.max(b.x1 - b.x0, b.z1 - b.z0) < 0.2)
    wahr(`${name}: senkrechte Bretter da (${bretter.length})`, bretter.length > 20)
    // Zwei waagerechte Latten je Seite (lang, niedrig).
    const latten = teile.filter((b) => b.y1 - b.y0 < 0.2 && Math.max(b.x1 - b.x0, b.z1 - b.z0) > 1)
    wahr(`${name}: waagerechte Latten da (${latten.length})`, latten.length >= 8 || frei.length > 0)
  }
  wahr(`${name}: keine Baeume, Hecken, Haeuser`, w.gruppe.userData.baeume === undefined && w.gruppe.userData.haeuser === undefined)

  return { welt: w, summe }
}

/** Ecke fuer Ecke gleich? */
function gleicheWelt(name, a, b) {
  const ma = meshesVon(a.gruppe)
  const mb = meshesVon(b.gruppe)
  wahr(`${name}: gleich viele Meshes`, ma.length === mb.length)
  ma.forEach((m, i) => {
    const n = mb[i]
    if (!n) return
    wahr(`${name}: gleiche Namen`, m.name === n.name)
    for (const attr of ['position', 'color']) {
      const x = m.geometry.attributes[attr].array
      const y = n.geometry.attributes[attr].array
      wahr(`${name}: ${m.name} ${attr} gleich viele`, x.length === y.length)
      let gleich = x.length === y.length
      for (let k = 0; gleich && k < x.length; k++) if (x[k] !== y[k]) gleich = false
      wahr(`${name}: ${m.name} ${attr} gleich`, gleich)
    }
    wahr(`${name}: ${m.name} gleiche Gruppen`, JSON.stringify(m.geometry.groups) === JSON.stringify(n.geometry.groups))
  })
}

/** dispose() gibt jede Geometrie und jedes Material frei und darf zweimal laufen. */
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
}

// Faelle: Erdgeschoss mit Treppenhaus vor dem Eingang und Keller in der
// Wohnung, dieselbe Wohnung im dritten Stock, eine lange Wohnung quer
// (laengs z) mit Treppenhaus an der Seite, eine kleine ohne freie
// Bereiche und eine grosse weit oben.
const FAELLE = [
  ['Erdgeschoss', { rahmen: [0, 0, 10.2, 7.4], frei: [[3.0, 7.4, 5.6, 10.0], [8.0, 1.0, 10.2, 3.5]], stockwerkHoehe: 0 }],
  ['Dritter Stock', { rahmen: [0, 0, 10.2, 7.4], frei: [[3.0, 7.4, 5.6, 10.0], [8.0, 1.0, 10.2, 3.5]], stockwerkHoehe: 8.4 }],
  ['Laengs z', { rahmen: [3.5, 2, -4.5, -12], frei: [[-6.6, -3, -4.5, -0.5]], stockwerkHoehe: 2.9 }],
  ['Klein', { rahmen: [0, 0, 3, 2.5], frei: [] }],
  ['Gross hoch', { rahmen: [-12, -8, 12, 8], frei: [[-1.5, 8, 1.5, 11]], stockwerkHoehe: 15 }],
  ['Hochparterre', { rahmen: [1, 1, 9, 6], frei: [[4, 6, 6, 8.5]], stockwerkHoehe: 0.3 }],
]

let hoechste = 0
for (const [name, opt] of FAELLE) {
  const a = pruefen(name, opt)
  const b = pruefen(`${name} (nochmal)`, opt)
  hoechste = Math.max(hoechste, a.summe)
  gleicheWelt(name, a.welt, b.welt)
  freigeben(name, a.welt)
  freigeben(`${name} (nochmal)`, b.welt)
}

// Andere Wohnung, andere Welt (die Saat haengt am Umriss).
{
  const a = baueUmgebung({ farben: F, rahmen: [0, 0, 10.2, 7.4], frei: [] })
  const b = baueUmgebung({ farben: F, rahmen: [0, 0, 10.4, 7.4], frei: [] })
  const ga = meshesVon(a.gruppe).find((m) => m.name === 'zaun').geometry.attributes.position.array
  const gb = meshesVon(b.gruppe).find((m) => m.name === 'zaun').geometry.attributes.position.array
  wahr('andere Wohnung, anderer Zaun', ga.length !== gb.length || ga.some((v, i) => v !== gb[i]))
  a.dispose()
  b.dispose()
}

// Unsinnige Eingaben werfen laut, statt still eine falsche Welt zu bauen.
const wirft = (name, opt) => {
  let geworfen = false
  try {
    baueUmgebung({ farben: F, rahmen: [0, 0, 5, 5], frei: [], ...opt })
  } catch {
    geworfen = true
  }
  wahr(`${name} wirft`, geworfen)
}
wirft('rahmen mit NaN', { rahmen: [0, Number.NaN, 5, 5] })
wirft('frei mit Unendlich', { frei: [[0, 0, Infinity, 1]] })
wirft('stockwerkHoehe NaN', { stockwerkHoehe: Number.NaN })
wirft('rahmen ohne Flaeche', { rahmen: [0, 0, 0, 5] })

if (fehler) {
  console.log(`${fehler} Abweichung(en)`)
  process.exit(1)
}
console.log(`ok (hoechstens ${hoechste} Dreiecke)`)
