// Prueft den Anschluss von Fahren und Hinstellen an den Motor (E87) ohne
// Browser:
//  - strahlZiel (hinstellen.ts) trifft genau dort, wo ein Strahl von three
//    auf dieselbe Szene als Dreiecke trifft: Boden, gedrehte Waende, Tische,
//    Baenke, Zaun, und ein Hang. Zufaellige Strahlen aus erfundenen
//    Stellen; Abstand auf 2 mm, Art und Normale gleich.
//  - Aussteigen mit den echten Modellen (fahrzeug3d.ts) jeder Art: frei
//    neben der Fahrertuer (links), an einer Wand auf der anderen Seite,
//    nie im Wagen.
//  - motor.ts haelt den Vertrag: jede Methode von E87 gebaut (kein leerer
//    Platzhalter), E V B R und Leertaste in der Einfang-Phase, Fahrzeuge
//    und Dinge mit scene.attach uebernommen und mit scene.remove abgegeben
//    (die Regel steht bei welt()), weiter als 150 m nicht zu sehen, beim
//    Fahren kein neues Raster der Ebene (fahrHindernisse), Hinstellen nie
//    gegen die ganze Welt als Dreiecke.
// Alle Zahlen und Orte sind erfunden.
// Aufruf im Projektordner: node scripts/motor-fahren-pruefen.mjs
// Ausgabe "ok" (mit Messwerten) oder die abweichenden Faelle, Exit 1 bei Fehlern.
import fs from 'node:fs'
import { BoxGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, PlaneGeometry, Raycaster, Vector3 } from 'three'
import { aussteigenSuchen, fahrzeugHindernis } from '../src/components/plan3d/fahren.ts'
import { strahlTreffer, strahlZiel } from '../src/components/plan3d/hinstellen.ts'
import { Hindernisse, KOERPER_RADIUS_M } from '../src/components/plan3d/kollision.ts'
import { baueFahrzeug } from '../src/components/plan3d/fahrzeug3d.ts'
import { FAHRZEUG_ARTEN } from '../src/components/plan3d/fahren.ts'

let fehler = 0
function wahr(name, ist, mehr = '') {
  if (!ist) {
    console.log('ABWEICHUNG', name, mehr)
    fehler++
  }
}
const messung = []
let s = 4242
const zufall = () => {
  s = (s * 1103515245 + 12345) % 2147483648
  return s / 2147483648
}

/* ============================================ strahlZiel gegen Dreiecke */

/** Ein Raster wie das des Gehens und dieselbe Szene aus Dreiecken. */
function szene(liste, bodenY = 0) {
  const h = new Hindernisse(1)
  const g = new Group()
  const mat = new MeshBasicMaterial({ side: DoubleSide })
  const boden = new Mesh(new PlaneGeometry(200, 200), mat)
  boden.rotation.x = -Math.PI / 2
  boden.position.y = bodenY
  boden.userData.art = 'boden'
  g.add(boden)
  for (const r of liste) {
    h.dazu(r.x, r.z, r.laenge, r.tiefe, r.drehY, true, r.oben)
    // Waende ohne Oberkante: hoch wie der Himmel (der Strahl reicht 4,6 m).
    const hoch = r.oben ?? 50
    const m = new Mesh(new BoxGeometry(r.laenge, hoch, r.tiefe), mat)
    m.position.set(r.x, bodenY + hoch / 2, r.z)
    m.rotation.y = r.drehY
    m.userData.art = r.oben === undefined ? 'wand' : 'kasten'
    g.add(m)
  }
  h.rastern()
  g.updateMatrixWorld(true)
  return { h, g }
}

const LISTE = [
  { x: 0, z: -4, laenge: 8, tiefe: 0.25, drehY: 0 },
  { x: -3.5, z: 0, laenge: 0.2, tiefe: 8, drehY: 0 },
  { x: 2.5, z: 1, laenge: 5, tiefe: 0.15, drehY: 0.7 },
  { x: 0.5, z: -1.5, laenge: 1.4, tiefe: 0.8, drehY: 0.2, oben: 0.75 },
  { x: -1.8, z: 1.6, laenge: 1.6, tiefe: 0.45, drehY: -0.4, oben: 0.45 },
  { x: 1.6, z: 2.6, laenge: 2.5, tiefe: 0.05, drehY: 1.2, oben: 1.0 },
  { x: -1, z: -2.6, laenge: 0.6, tiefe: 0.6, drehY: 0.785, oben: 0.3 },
]
{
  const { h, g } = szene(LISTE)
  const welt = { raster: h, boden: () => 0 }
  const ray = new Raycaster()
  ray.far = 4.6
  const tr = strahlTreffer()
  let n = 0
  let gleich = 0
  let beide = 0
  let maxAbw = 0
  const abweichend = []
  const n3 = new Vector3()
  for (let k = 0; k < 6000; k++) {
    // Stelle der Augen: frei (nicht in einem Rechteck), 1,2 bis 2,2 m hoch.
    const ox = (zufall() - 0.5) * 6
    const oz = (zufall() - 0.5) * 6
    if (!h.frei(ox, oz, 0.05)) continue
    const oy = 1.2 + zufall()
    const gier = zufall() * Math.PI * 2
    const neig = -1.2 + zufall() * 1.5
    const d = new Vector3(-Math.sin(gier) * Math.cos(neig), Math.sin(neig), -Math.cos(gier) * Math.cos(neig))
    ray.set(new Vector3(ox, oy, oz), d)
    const hits = ray.intersectObject(g, true)
    const a = hits[0] ?? null
    const b = strahlZiel(ox, oy, oz, d.x, d.y, d.z, 4.6, welt, tr)
    n++
    if (!a && !b) {
      gleich++
      continue
    }
    if (!a || !b) {
      // Am Rand der Reichweite (auf 1 mm) zaehlt beides.
      const rand = (a && a.distance > 4.599) || (b && tr.abstand > 4.599)
      if (rand) gleich++
      else if (abweichend.length < 5) abweichend.push(`nur ${a ? 'three' : 'strahlZiel'} trifft (${ox.toFixed(2)}, ${oy.toFixed(2)}, ${oz.toFixed(2)})`)
      continue
    }
    beide++
    const abw = Math.abs(a.distance - tr.abstand)
    maxAbw = Math.max(maxAbw, abw)
    n3.copy(a.face.normal).transformDirection(a.object.matrixWorld)
    if (n3.dot(d) > 0) n3.negate()
    const artThree = a.object.userData.art === 'boden' ? 'boden' : n3.y > 0.7 ? 'oben' : 'wand'
    const normal = Math.abs(n3.x - tr.nx) < 1e-6 && Math.abs(n3.y - tr.ny) < 1e-6 && Math.abs(n3.z - tr.nz) < 1e-6
    if (abw < 2e-3 && artThree === tr.art && normal) gleich++
    else if (abweichend.length < 5) abweichend.push(`Abstand ${a.distance.toFixed(4)} gegen ${tr.abstand.toFixed(4)}, ${artThree} gegen ${tr.art}`)
  }
  wahr(`strahlZiel wie three: ${gleich} von ${n} Strahlen gleich`, gleich === n, abweichend.join('; '))
  wahr('genug Treffer geprueft', beide > 3000, `${beide}`)
  messung.push(`strahlZiel gegen Dreiecke: ${n} Strahlen, ${beide} Treffer, groesste Abweichung ${(maxAbw * 1000).toFixed(3)} mm`)
}
{
  // Ein Hang (Ebene, die nach +x steigt) und eine Mauer darauf.
  const steig = 0.25
  const boden = (x) => steig * x
  const h = new Hindernisse(1)
  h.dazu(1.5, -1, 0.3, 4, 0, true, 0.6)
  h.rastern()
  const mat = new MeshBasicMaterial({ side: DoubleSide })
  const g = new Group()
  const ebene = new Mesh(new PlaneGeometry(40, 40), mat)
  // Erst waagrecht (um x), dann um z geneigt: steigt nach +x.
  ebene.rotation.set(-Math.PI / 2, 0, Math.atan(steig), 'ZYX')
  ebene.userData.art = 'boden'
  g.add(ebene)
  g.updateMatrixWorld(true)
  const ray = new Raycaster()
  ray.far = 4.6
  const tr = strahlTreffer()
  let n = 0
  let gleich = 0
  for (let k = 0; k < 2000; k++) {
    const ox = (zufall() - 0.5) * 4
    const oz = (zufall() - 0.5) * 4
    const oy = boden(ox) + 1.6
    const gier = zufall() * Math.PI * 2
    const neig = -1.3 + zufall() * 0.9
    const d = new Vector3(-Math.sin(gier) * Math.cos(neig), Math.sin(neig), -Math.cos(gier) * Math.cos(neig))
    ray.set(new Vector3(ox, oy, oz), d)
    const a = ray.intersectObject(g, true)[0] ?? null
    const b = strahlZiel(ox, oy, oz, d.x, d.y, d.z, 4.6, { raster: null, boden }, tr)
    n++
    if (!a && !b) gleich++
    else if (a && b && Math.abs(a.distance - tr.abstand) < 2e-3 && Math.abs(tr.ny - Math.cos(Math.atan(steig))) < 1e-3) gleich++
    else if ((a && a.distance > 4.599) || (b && tr.abstand > 4.599)) gleich++
  }
  wahr(`Hang: ${gleich} von ${n} Strahlen gleich`, gleich === n)
  // Mauer auf dem Hang: Oberkante 0,6 ueber dem Gelaende an der Stelle.
  const tr2 = strahlTreffer()
  const ok = strahlZiel(1.5, boden(1.5) + 2, 0.5, 0, -1, -0.2, 4.6, { raster: h, boden }, tr2)
  wahr('Mauer am Hang: von oben auf ihre Oberkante', ok && tr2.art === 'oben' && Math.abs(tr2.y - (boden(1.5) + 0.6)) < 1e-3, JSON.stringify(tr2))
}

/* ============================================ Aussteigen mit den Modellen */

{
  const R = KOERPER_RADIUS_M
  for (const art of FAHRZEUG_ARTEN) {
    const f = baueFahrzeug(art, '#5d636b', `p:${art}`, { x: 0, z: 0, gier: 0, ebene: 'b' })
    const lage = { x: 4, z: -3, gier: 0.6 }
    const fzR = new Hindernisse(4)
    const hd = fahrzeugHindernis(f, lage)
    fzR.dazu(hd.x, hd.z, hd.laenge, hd.tiefe, hd.drehY, true, hd.oben)
    fzR.rastern()
    // Frei: links neben der Fahrertuer.
    const leer = new Hindernisse(1)
    leer.rastern()
    const st = { x: 0, z: 0 }
    const weg = (raster) => (x0, z0, x1, z1) => {
      st.x = x0
      st.z = z0
      raster.bewegen(st, x1 - x0, z1 - z0, R, 0)
      return Math.hypot(st.x - x1, st.z - z1) < 0.05
    }
    const p = { x: 0, z: 0 }
    const ok = aussteigenSuchen(f, lage, (x, z) => leer.frei(x, z, R, 0, fzR), weg(leer), p)
    // Lokal: links ist -x.
    const lx = (p.x - lage.x) * Math.cos(lage.gier) - (p.z - lage.z) * Math.sin(lage.gier)
    wahr(`${art}: frei links aussteigen`, ok && lx < -f.breite / 2 - R + 0.01, `lx ${lx.toFixed(2)}`)
    wahr(`${art}: nicht im Wagen`, fzR.frei(p.x, p.z, R))
    // Wand an der Fahrerseite: rechts.
    const c = Math.cos(lage.gier)
    const s2 = Math.sin(lage.gier)
    const wand = new Hindernisse(1)
    const wx = -f.breite / 2 - 0.12
    wand.dazu(lage.x + wx * c, lage.z - wx * s2, 0.2, f.laenge + 4, lage.gier)
    wand.rastern()
    const q = { x: 0, z: 0 }
    const ok2 = aussteigenSuchen(f, lage, (x, z) => wand.frei(x, z, R, 0, fzR), weg(wand), q)
    const qx = (q.x - lage.x) * c - (q.z - lage.z) * s2
    wahr(`${art}: Wand links, rechts aussteigen`, ok2 && qx > f.breite / 2 + R - 0.01, `qx ${qx.toFixed(2)}`)
    f.dispose()
  }
}

/* ============================================ Vertrag im Motor */

{
  const motor = fs.readFileSync('src/components/plan3d/motor.ts', 'utf8')
  for (const m of ['einsteigen', 'aussteigen', 'fahrSicht', 'blaulicht', 'fahrzeug', 'drehen', 'hinstellen', 'lage', 'bewegt']) {
    wahr(`Motor: ${m} gebaut (kein leerer Platzhalter)`, !new RegExp(`\\n    ${m}\\(\\) \\{\\},`).test(motor))
  }
  wahr('Motor: Tasten E V B R Leertaste', /SONDER_TASTEN = new Set\(\['Space', 'KeyE', 'KeyV', 'KeyB', 'KeyR'\]\)/.test(motor))
  wahr('Motor: Tasten in der Einfang-Phase', motor.includes("window.addEventListener('keydown', sonderRunter, true)") && motor.includes("window.addEventListener('keyup', sonderHoch, true)"))
  wahr('Motor: Tasten wieder abgemeldet', motor.includes("window.removeEventListener('keydown', sonderRunter, true)") && motor.includes("window.removeEventListener('keyup', sonderHoch, true)"))
  wahr('Motor: nicht in Feldern und fremden Fenstern', /function sonderTasteGilt[\s\S]*?INPUT[\s\S]*?TEXTAREA[\s\S]*?SELECT[\s\S]*?isContentEditable[\s\S]*?fremdesFenster/.test(motor))
  wahr('Motor: Fahrzeuge mit scene.attach', motor.includes('scene.attach(f.gruppe)') && /if \(e\.f\.gruppe\.parent === scene\) scene\.remove\(e\.f\.gruppe\)/.test(motor))
  wahr('Motor: Dinge mit scene.attach', motor.includes('scene.attach(o)') && /if \(o\.parent === scene\) scene\.remove\(o\)/.test(motor))
  wahr('Motor: Regel bei welt()', /E87, wem Fahrzeuge und Dinge gehoeren: Fahrzeug3D\.gruppe und\s+\*\s+WeltDing3D\.objekt nimmt der Motor mit scene\.attach\(\)/.test(motor))
  wahr('Motor: 150 m Sichtweite', motor.includes('const FAHRZEUG_SICHT_M = 150'))
  wahr('Motor: beim Fahren kein neues Raster der Ebene', !motor.includes('fahrHindernisse('))
  wahr('Motor: Hinstellen nicht gegen die ganze Welt als Dreiecke', !/zielStrahl\.intersectObject\(weltJetzt|zielStrahl\.intersectObjects\(\[?weltJetzt/.test(motor) && motor.includes('strahlZiel(o.x, o.y, o.z, r.x, r.y, r.z, best, strahlWelt, ebeneTreffer)'))
  wahr('Motor: Mausrad nicht passiv (dreht das Ding)', motor.includes("host.addEventListener('wheel', radStopp, { passive: false })"))
  wahr('Motor: kein langer Gedankenstrich', !motor.includes(String.fromCharCode(0x2014)))
}

if (fehler) {
  console.log(`${fehler} Abweichung(en)`)
  process.exit(1)
}
for (const m of messung) console.log(m)
console.log('ok')
