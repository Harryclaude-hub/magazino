// Prueft die Welt draussen (src/components/plan3d/aussen3d.ts) ohne
// Browser: unter 60 000 Dreiecke, kein Teil (ausser Wiese und Himmel) in
// der Wohnung (rahmen, ab 2 cm unter ihrem Boden aufwaerts) oder in einem
// freien Bereich (frei, jede Hoehe), Wiese unter 0, Himmel und Dunst wie
// verlangt, Strasse und Nachbarhaeuser im richtigen Abstand, gleiche
// Eingabe gibt Ecke fuer Ecke dieselbe Welt, dispose() gibt alles frei.
// Jedes verschmolzene Teil bleibt als Gruppe im Mesh, darum wird je Teil
// geprueft und nicht nur der Rahmen des ganzen Meshes.
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
  for (const n of ['himmel', 'boden', 'wege', 'gruen', 'bauten']) wahr(`${name}: Mesh ${n} da`, nach.has(n))
  wahr(`${name}: Fassade genau dann, wenn die Wohnung hoeher liegt`, nach.has('fassade') === h > 0.05)
  wahr(`${name}: hoechstens 6 Zeichenaufrufe`, meshes.length <= 6)
  wahr(`${name}: hoechstens 4 Materialien`, new Set(meshes.map((m) => m.material)).size <= 4)

  // Dreiecke.
  const summe = meshes.reduce((s, m) => s + dreiecke(m), 0)
  wahr(`${name}: unter 60 000 Dreiecke (${summe})`, summe < 60000)

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

  // Plattenweg ums Haus: Teile innerhalb von 3 m um die Wohnung.
  const wege = nach.get('wege')
  if (wege) {
    const ring = teilRahmen(wege).filter(
      (b) => b.x0 >= r.x0 - 3 - EPS && b.x1 <= r.x1 + 3 + EPS && b.z0 >= r.z0 - 3 - EPS && b.z1 <= r.z1 + 3 + EPS,
    )
    wahr(`${name}: Plattenweg ums Haus`, ring.length >= 2)
    // Strasse: das 6 m breite, lange Band, Mitte 12 bis 15 m vom Haus.
    const fahrbahn = teilRahmen(wege).filter((b) => {
      const lang = Math.max(b.x1 - b.x0, b.z1 - b.z0)
      const breit = Math.min(b.x1 - b.x0, b.z1 - b.z0)
      return lang > 300 && Math.abs(breit - 6) < 1e-3
    })
    wahr(`${name}: genau eine Fahrbahn (${fahrbahn.length})`, fahrbahn.length >= 1)
    for (const b of fahrbahn) {
      const laengsX = b.x1 - b.x0 > b.z1 - b.z0
      const mitte = laengsX ? (b.z0 + b.z1) / 2 : (b.x0 + b.x1) / 2
      const [a0, a1] = laengsX ? [r.z0, r.z1] : [r.x0, r.x1]
      const d = mitte > a1 ? mitte - a1 : a0 - mitte
      wahr(`${name}: Strasse 12 bis 15 m vom Haus (${d.toFixed(2)})`, d >= 12 - EPS && d <= 15 + EPS)
      wahr(`${name}: Strasse an einer Laengsseite`, laengsX === r.x1 - r.x0 >= r.z1 - r.z0)
    }
  }

  // Nachbarhaeuser: die hohen Koerper in bauten, 25 bis 45 m weg.
  const bauten = nach.get('bauten')
  if (bauten) {
    const haeuser = teilRahmen(bauten).filter((b) => b.y1 - b.y0 > 5 && b.x1 - b.x0 > 5)
    wahr(`${name}: 2 bis 4 Nachbarhaeuser (${haeuser.length})`, haeuser.length >= 2 && haeuser.length <= 4)
    wahr(`${name}: Zaehler Haeuser stimmt`, haeuser.length === w.gruppe.userData.haeuser)
    for (const b of haeuser) {
      const d = abstand(b, r)
      wahr(`${name}: Nachbarhaus 25 bis 45 m weg (${d.toFixed(1)})`, d >= 25 - EPS && d <= 45 + EPS)
    }
  }
  const u = w.gruppe.userData
  wahr(`${name}: 6 bis 10 Baeume (${u.baeume})`, u.baeume >= 6 && u.baeume <= 10)
  wahr(`${name}: ein paar Hecken (${u.hecken})`, u.hecken >= 2)

  // Fassade unter der Wohnung reicht bis zum Boden und endet 2 cm unter ihr.
  const fassade = nach.get('fassade')
  if (fassade) {
    const teile = teilRahmen(fassade)
    wahr(`${name}: Fassade endet bei -0,02`, Math.max(...teile.map((b) => b.y1)) <= -0.02 + 1e-6)
    wahr(`${name}: Fassade steht auf dem Boden`, Math.min(...teile.map((b) => b.y0)) <= -h - 0.02)
    // Duenne Stuecke (Fensterband, Sockel) muessen aus der Fassade ragen,
    // sonst laege ihre Aussenseite in der Fassade und flimmerte.
    const duenn = teile.filter((b) => Math.min(b.x1 - b.x0, b.z1 - b.z0) <= 0.1)
    wahr(`${name}: Fassade hat Fensterbaender`, h < 2 || duenn.length > 0)
    for (const b of duenn) {
      const ragt = b.x0 < r.x0 - 0.01 || b.z0 < r.z0 - 0.01 || b.x1 > r.x1 + 0.01 || b.z1 > r.z1 + 0.01
      if (!ragt) {
        console.log('ABWEICHUNG', name, 'Fensterband oder Sockel liegt in der Fassade', JSON.stringify(b))
        fehler++
      }
    }
  }

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
  const ga = meshesVon(a.gruppe).find((m) => m.name === 'gruen').geometry.attributes.position.array
  const gb = meshesVon(b.gruppe).find((m) => m.name === 'gruen').geometry.attributes.position.array
  wahr('andere Wohnung, andere Baeume', ga.length !== gb.length || ga.some((v, i) => v !== gb[i]))
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
