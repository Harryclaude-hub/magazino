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
//  - Nacharbeit nach der Pruefung (E87b), je Befund:
//      Greifen durch die Decke: dingGreifbar (hinstellen.ts) mit Geschossen,
//        Treppe, Schwelle, Garten, kaputten Zahlen; der Motor fragt es beim
//        Aufheben und Zielen.
//      Sichtbarkeit: dingSichtbarkeit laesst das Ausblenden der Welt stehen
//        (ein Ding auf einem ausgeblendeten Geschoss bleibt nach vielen
//        Bildern unsichtbar), zeigt bewegte, folgt einem ausgeschalteten
//        Elternteil und nimmt nur das eigene Ausblenden zurueck.
//      Neubau der Welt: lageGleich (1 cm, ueber +-pi, Ebene, kaputte Zahlen);
//        lage() laesst das Ding in der Hand und ein fremd gelenktes
//        Fahrzeug bei derselben Lage, wie sie sind.
//      Abbau beim Fahren: dispose meldet zuerst (Fahrzeug, Ding in der
//        Hand), ebenso welt(null) beim Fahren; nichts doppelt.
//      Mitspieler mit unbekanntem Fahrzeug: Figur bleibt zu sehen.
//      Neubau im Stadthaus: ebeneWartenAb und ebeneWartenPruefen mit echten
//        Ebenen (kollision.ts): warten, Ebene kommt mit neuer Version,
//        Frist 5 s, alte Frist bei neuer Welt, kein Absturz bei Index -1.
//      dingErzeugen: ErzeugenListe fragt je Welt einmal, wenige je Bild,
//        laesst Vorhandenes weg, neue Welt fragt wieder.
//      aussteigen() gibt true oder false zurueck.
// Alle Zahlen und Orte sind erfunden.
// Aufruf im Projektordner: node scripts/motor-fahren-pruefen.mjs
// Ausgabe "ok" (mit Messwerten) oder die abweichenden Faelle, Exit 1 bei Fehlern.
import fs from 'node:fs'
import { BoxGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, PlaneGeometry, Raycaster, Vector3 } from 'three'
import { aussteigenSuchen, fahrzeugHindernis } from '../src/components/plan3d/fahren.ts'
import { dingGreifbar, GESCHOSS_ABSTAND_M, GREIF_OBEN_M, GREIF_UNTEN_M, strahlTreffer, strahlZiel } from '../src/components/plan3d/hinstellen.ts'
import { Ebenen, Hindernisse, KOERPER_RADIUS_M } from '../src/components/plan3d/kollision.ts'
import { dingSichtbarkeit, EBENE_WARTEN_MS, ebeneWartenAb, ebeneWartenPruefen, ebeneWiederfinden, ErzeugenListe, lageGleich } from '../src/components/plan3d/motor.ts'
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

/* ============================================ E87b: Greifen durch die Decke */

{
  // Ein Haus der Stadt: Erdgeschoss 0,6 m ueber dem Gelaende davor (die
  // Schwelle), Geschosse 2,5 m hoch (das Wenigste in der Stadt); dazu eine
  // Siedlung mit 2,2 m (das Wenigste dort).
  const eg = 0.6
  const gh = 2.5
  wahr('Greifen: Grenzen unter einem Geschoss', GREIF_UNTEN_M < 2.2 && GREIF_OBEN_M < 2.2 && GREIF_OBEN_M >= 2 && GESCHOSS_ABSTAND_M >= eg && GESCHOSS_ABSTAND_M < 2.2)
  wahr('Greifen: Ding am Boden im eigenen Geschoss', dingGreifbar(eg, eg, [eg]))
  wahr('Greifen: auf dem Tisch', dingGreifbar(eg + 0.75, eg, [eg]))
  wahr('Greifen: im Regal (1,3 m)', dingGreifbar(eg + 1.3, eg, [eg]))
  wahr('Greifen: Geschoss darueber, nicht durch die Decke', !dingGreifbar(eg + gh, eg + gh, [eg]))
  wahr('Greifen: Geschoss darueber auf dem Tisch', !dingGreifbar(eg + gh + 0.75, eg + gh, [eg]))
  wahr('Greifen: Geschoss darueber, Ebene unbekannt', !dingGreifbar(eg + gh, null, [eg]))
  wahr('Greifen: Siedlung 2,2 m, Geschoss darueber', !dingGreifbar(2.2, 2.2, [0]) && !dingGreifbar(2.2, null, [0]))
  wahr('Greifen: Geschoss darunter (Treppenauge)', !dingGreifbar(eg, eg, [eg + gh]))
  wahr('Greifen: auf der Treppe oben und unten', dingGreifbar(eg + gh, eg + gh, [eg, eg + gh]) && dingGreifbar(eg, eg, [eg, eg + gh]))
  wahr('Greifen: ueber die Schwelle hinaus und hinein', dingGreifbar(0, 0, [eg]) && dingGreifbar(eg, eg, [0]))
  wahr('Greifen: Garten und Erdgeschoss gleich hoch', dingGreifbar(0.05, 0, [0]))
  wahr('Greifen: Ebene eines anderen Geschosses', !dingGreifbar(eg + 1, eg + gh, [eg]))
  wahr('Greifen: am Hang (Boden an der Stelle des Dings)', dingGreifbar(1.8, 1.8, [1.8]))
  wahr('Greifen: kaputte Zahlen', !dingGreifbar(NaN, 0, [0]) && !dingGreifbar(0, 0, [NaN]) && !dingGreifbar(0, 0, []) && !dingGreifbar(Infinity, null, [0]))
  wahr('Greifen: Ebene mit kaputtem Boden zaehlt als unbekannt', dingGreifbar(0, NaN, [0]))

  // Der Befund mit echten Ebenen (kollision.ts) wie im Motor
  // (dingErreichbar): man steht im EG, das Ding liegt im 1. OG genau
  // darueber. Der Strahl nach oben trifft auf der Ebene nichts (sie kennt
  // keine Decke), also haelt nur die Regel das Aufheben auf.
  const wohnung = new Hindernisse(1)
  const eb = new Ebenen(wohnung, 1)
  eb.wohnungFertig()
  eb.setzen([
    { id: 'boden', name: 'EG', y: 0, hindernisse: [] },
    { id: 'stadt:h7:0', name: 'Haus EG', y: eg, hindernisse: [] },
    { id: 'stadt:h7:1', name: 'Haus 1', y: eg + gh, hindernisse: [] },
  ])
  eb.wechseln(1)
  const auge = eg + 1.64
  const tr = strahlTreffer()
  const trifft = strahlZiel(2, auge, 3, 0, 1, 0, 6, { raster: eb.aktiv, boden: (x, z) => eb.boden(eb.index) + eb.gelaende(eb.index, x, z) }, tr)
  wahr('Greifen: die Ebene haelt den Strahl zur Decke nicht auf', !trifft)
  const j = 2
  const dingUnten = eb.boden(j)
  const abstand = dingUnten - auge
  wahr('Greifen: das Ding oben liegt in Reichweite', abstand > 0 && abstand < 6)
  wahr('Greifen: der Motor greift es nicht', !dingGreifbar(dingUnten, eb.boden(j) + eb.gelaende(j, 2, 3), [eb.boden(eb.index) + eb.gelaende(eb.index, 2, 3)]))
}

/* ============================================ E87b: Sichtbarkeit der Dinge */

{
  // Die Welt blendet ein Ding auf einem Geschoss aus, das man nicht sieht.
  const o = { visible: false }
  const d = { versteckt: false }
  for (let i = 0; i < 100; i++) dingSichtbarkeit(o, d, false, true)
  wahr('Sicht: Ding auf ausgeblendetem Geschoss bleibt nach 100 Bildern aus', o.visible === false && d.versteckt === false)
  o.visible = true
  for (let i = 0; i < 3; i++) dingSichtbarkeit(o, d, false, true)
  wahr('Sicht: zeigt die Welt es wieder, bleibt es an', o.visible === true)
  // Bewegt oder in der Hand: immer zu sehen, auch wenn die Welt es ausblendet.
  const b = { visible: false }
  const bd = { versteckt: false }
  dingSichtbarkeit(b, bd, true, false)
  wahr('Sicht: bewegt ist zu sehen', b.visible === true && bd.versteckt === false)
  b.visible = false
  dingSichtbarkeit(b, bd, true, true)
  wahr('Sicht: bewegt bleibt zu sehen, auch nach dem Ausblenden der Welt', b.visible === true)
  // Elternteil aus (etwa eine Gruppe je Geschoss): aus, und wieder an.
  const c = { visible: true }
  const cd = { versteckt: false }
  dingSichtbarkeit(c, cd, false, false)
  dingSichtbarkeit(c, cd, false, false)
  wahr('Sicht: Elternteil aus, Ding aus', c.visible === false && cd.versteckt === true)
  dingSichtbarkeit(c, cd, false, true)
  wahr('Sicht: Elternteil wieder an, eigenes Ausblenden zurueck', c.visible === true && cd.versteckt === false)
  // Was die Welt selbst ausgeblendet hatte, bleibt aus, auch wenn ihr
  // Elternteil zwischendurch aus war.
  const e = { visible: false }
  const ed = { versteckt: false }
  dingSichtbarkeit(e, ed, false, false)
  dingSichtbarkeit(e, ed, false, true)
  wahr('Sicht: von der Welt ausgeblendet bleibt aus', e.visible === false && ed.versteckt === false)
}

/* ============================================ E87b: dieselbe Lage */

{
  const l = (x, y, z, gier, ebene = 'boden', art = 'ding', id = 'stadt:h7:d3:tasse') => ({ id, art, x, y, z, gier, ebene })
  const a = l(10, 0.6, -4, 1.2)
  wahr('Lage: gleich', lageGleich(a, l(10, 0.6, -4, 1.2)))
  wahr('Lage: unter 1 cm gleich', lageGleich(a, l(10.009, 0.609, -4.009, 1.209)))
  wahr('Lage: 1,1 cm daneben nicht', !lageGleich(a, l(10.011, 0.6, -4, 1.2)) && !lageGleich(a, l(10, 0.6, -4.011, 1.2)))
  wahr('Lage: 2 cm hoeher nicht', !lageGleich(a, l(10, 0.62, -4, 1.2)))
  wahr('Lage: gedreht nicht', !lageGleich(a, l(10, 0.6, -4, 1.22)))
  wahr('Lage: ueber +-pi gleich', lageGleich(l(0, 0, 0, Math.PI - 0.002), l(0, 0, 0, -Math.PI + 0.003)))
  wahr('Lage: andere Ebene nicht', !lageGleich(a, l(10, 0.6, -4, 1.2, 'stadt:h7:1')))
  wahr('Lage: Ebene fehlt auf einer Seite', lageGleich(a, l(10, 0.6, -4, 1.2, '')))
  wahr('Lage: andere Art oder Kennung nicht', !lageGleich(a, l(10, 0.6, -4, 1.2, 'boden', 'fahrzeug')) && !lageGleich(a, l(10, 0.6, -4, 1.2, 'boden', 'ding', 'x')))
  wahr('Lage: kaputte Zahlen nicht (und kein Haengen)', !lageGleich(a, l(NaN, 0.6, -4, 1.2)) && !lageGleich(a, l(10, 0.6, -4, Infinity)) && !lageGleich(l(0, 0, 0, NaN), l(0, 0, 0, NaN)))
}

/* ============================================ E87b: Warten auf eine Ebene */

{
  const wohnung = new Hindernisse(1)
  const eb = new Ebenen(wohnung, 1)
  eb.wohnungFertig()
  const alt = [
    { id: 'boden', name: 'EG', y: 0, hindernisse: [] },
    { id: 'g1:1', name: 'Haus A 1', y: 3, hindernisse: [] },
    { id: 'stadt:h7:1', name: 'Haus B 1', y: 3, hindernisse: [] },
  ]
  eb.setzen(alt)
  eb.wechseln(2)
  const merk = { id: 'stadt:h7:1', index: 2, y: 3, wohnung: false }
  // Neue Welt (Farbschema): das Haus der Stadt ist noch nicht gebaut.
  const neu = [alt[0], alt[1]]
  eb.setzen(neu)
  wahr('Warten: ohne Warten fiele man in ein fremdes Haus gleicher Hoehe', ebeneWiederfinden(eb, merk) === 1)
  const t0 = 1000
  const w = ebeneWartenAb(eb, merk, true, 'treppe:7', t0, null)
  wahr('Warten: beginnt', !!w && w.id === merk.id && w.y === 3 && w.treppe === 'treppe:7' && w.bis === t0 + EBENE_WARTEN_MS && EBENE_WARTEN_MS === 5000)
  wahr('Warten: nicht ohne version()', ebeneWartenAb(eb, merk, false, null, t0, null) === null)
  wahr('Warten: nicht von der Wohnung', ebeneWartenAb(eb, { ...merk, wohnung: true }, true, null, t0, null) === null)
  wahr('Warten: nicht, wenn es die Kennung gibt', ebeneWartenAb(eb, { ...merk, id: 'g1:1' }, true, null, t0, null) === null)
  wahr('Warten: nicht ohne Kennung', ebeneWartenAb(eb, { ...merk, id: null }, true, null, t0, null) === null)
  wahr('Warten: kaputte Uhr', ebeneWartenAb(eb, merk, true, null, NaN, null) === null)
  wahr('Warten: noch nicht da', ebeneWartenPruefen(eb, w, t0 + 4999) === -1)
  wahr('Warten: Frist um', ebeneWartenPruefen(eb, w, t0 + EBENE_WARTEN_MS) === -2)
  // Noch eine neue Welt mitten im Warten: der Merker beim Warten hat Index
  // -1; dieselbe Kennung behaelt die Frist, eine andere bekommt eine neue.
  const merkW = { id: w.id, index: -1, y: w.y, wohnung: false }
  const w2 = ebeneWartenAb(eb, merkW, true, null, t0 + 3000, w)
  wahr('Warten: neue Welt, alte Frist', !!w2 && w2.bis === w.bis)
  const w3 = ebeneWartenAb(eb, { ...merkW, id: 'stadt:h8:2' }, true, null, t0 + 3000, w)
  wahr('Warten: andere Ebene, neue Frist', !!w3 && w3.bis === t0 + 3000 + EBENE_WARTEN_MS)
  // Das Haus ist fertig: version() zaehlt hoch, seine Ebene kommt hinten dazu.
  eb.aktualisieren([...neu, alt[2]])
  wahr('Warten: Ebene kommt mit neuer Version', ebeneWartenPruefen(eb, w, t0 + 1200) === 2 && eb.liste[2].id === 'stadt:h7:1')
  wahr('Warten: Wiederfinden mit dem Merker beim Warten findet die gekommene Ebene', ebeneWiederfinden(eb, merkW) === 2)
  // Merker mit Index -1, ohne Ebene bei 0 (Wohnung allein, wohnIndex -1):
  // kein Absturz in ebeneWiederfinden.
  const eb2 = new Ebenen(new Hindernisse(1), 1)
  eb2.wohnungFertig()
  eb2.setzen([{ id: 'x:1', name: '1', y: 6, hindernisse: [] }])
  let heil = eb2.wohnIndex === -1
  try {
    heil = heil && ebeneWiederfinden(eb2, { id: 'weg', index: -1, y: 6, wohnung: false }) === 0
  } catch {
    heil = false
  }
  wahr('Warten: Index -1 ohne Ebene der Wohnung', heil)
}

/* ============================================ E87b: dingErzeugen */

{
  const liste = new ErzeugenListe()
  const da = new Set(['stadt:h1:d0:tasse'])
  const lagen = new Set(['stadt:h1:d0:tasse', 'stadt:h2:d1:karton', 'stadt:h2:d2:ball', 'x:unbekannt'])
  const fehlt = (id) => !da.has(id) && lagen.has(id)
  const gefragt = []
  const baut = (id) => {
    gefragt.push(id)
    if (id === 'x:unbekannt') return false
    da.add(id)
    return true
  }
  for (const id of lagen) if (fehlt(id)) liste.vormerken(id)
  liste.vormerken('stadt:h2:d1:karton')
  wahr('Erzeugen: vorgemerkt ohne Vorhandenes und doppelt', liste.laenge === 3)
  const gebaut = []
  const n1 = liste.schritt(fehlt, baut, 1, 50, gebaut)
  wahr('Erzeugen: hoechstens jeBild gebaut', gebaut.length === 1 && n1 >= 1 && liste.laenge >= 1)
  let runden = 1
  while (liste.laenge && runden < 10) {
    liste.schritt(fehlt, baut, 1, 50, gebaut)
    runden++
  }
  wahr('Erzeugen: jede fehlende Kennung genau einmal gefragt', gefragt.length === 3 && new Set(gefragt).size === 3 && !gefragt.includes('stadt:h1:d0:tasse'))
  // Dieselbe Welt: nicht noch einmal, auch nicht die unbekannte.
  liste.vormerken('x:unbekannt')
  liste.vormerken('stadt:h2:d1:karton')
  wahr('Erzeugen: je Welt einmal', liste.laenge === 0 && liste.schonGefragt('x:unbekannt'))
  // Hoechstens fragen Fragen je Bild.
  const viele = new ErzeugenListe()
  for (let i = 0; i < 120; i++) viele.vormerken(`x:${i}`)
  const g2 = []
  const n2 = viele.schritt(() => true, () => false, 3, 50, g2)
  wahr('Erzeugen: hoechstens 50 Fragen je Bild', n2 === 50 && viele.laenge === 70)
  // Inzwischen von der Welt gebaut (ihr Haus kam): faellt still weg.
  const weg = new ErzeugenListe()
  weg.vormerken('stadt:h3:d0:ball')
  const n3 = weg.schritt(() => false, () => true, 3, 50, g2)
  wahr('Erzeugen: inzwischen da, nicht gefragt', n3 === 0 && weg.laenge === 0 && !weg.schonGefragt('stadt:h3:d0:ball'))
  // Neue Welt: jede Kennung darf wieder.
  liste.neu()
  liste.vormerken('x:unbekannt')
  wahr('Erzeugen: neue Welt fragt wieder', liste.laenge === 1 && !liste.schonGefragt('x:unbekannt'))
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

  // E87b, je Befund der Pruefung: so ist es im Motor angeschlossen.
  /** Rumpf einer Funktion im Motor (bis zur naechsten auf gleicher Stufe). */
  const rumpf = (kopf) => {
    const a = motor.indexOf(kopf)
    if (a < 0) return ''
    const b = motor.indexOf('\n  }\n', a)
    return b < 0 ? '' : motor.slice(a, b)
  }
  // Abbau beim Fahren: zuerst melden, dann abbauen.
  const abbau = motor.slice(motor.indexOf('    dispose() {\n      if (weg) return'))
  const melden = abbau.indexOf('if (fahrt) fahrtEnde(null, true)')
  const ablegenIdx = abbau.indexOf('if (halt.ding) ablegen()')
  wahr('Abbau: Fahrzeug und Ding in der Hand melden, bevor abgebaut wird', melden > 0 && ablegenIdx > melden && abbau.indexOf('weg = true') > ablegenIdx && abbau.indexOf('bewegtFn = null') > ablegenIdx)
  wahr('Abbau: Fehler beim Melden in die Konsole', /try \{\s*if \(fahrt\) fahrtEnde\(null, true\)\s*if \(halt\.ding\) ablegen\(\)\s*\} catch \(err\) \{\s*console\.error\(/.test(abbau))
  wahr('Welt geht beim Fahren: Lage zuerst melden', /function weltSetzen\(w: Welt3D \| null\) \{[\s\S]{0,600}?if \(fahrt && weltJetzt && w !== weltJetzt\) fahrzeugLageMelden\(fahrt\.e\)/.test(motor))
  wahr('Fahrzeug entladen: aussteigen und melden', rumpf('function fahrtPruefen(').includes('if (endgueltig) fahrtEnde(null, true)'))
  wahr('Fahrzeug: dieselbe Lage nicht doppelt melden', /function fahrzeugLageMelden[\s\S]*?if \(alt && lageGleich\(alt, l\)\) return[\s\S]*?bewegtFn\?\.\(\{ \.\.\.l \}\)/.test(motor) && rumpf('function fahrtEnde(').includes('if (melden) fahrzeugLageMelden(e)'))
  // Sichtbarkeit: die Regel steht in dingSichtbarkeit, teileSichtbar ruft sie.
  const sicht = rumpf('function teileSichtbar(')
  wahr('Sicht: teileSichtbar zwingt Unbewegtes nicht mehr an', sicht.includes('dingSichtbarkeit(o, d, bewegt, bewegt || sichtbar(d.herkunft))') && !sicht.includes('d.verlegt || sichtbar(d.herkunft)'))
  // Greifen: Aufheben und Zielen fragen dingErreichbar.
  wahr('Greifen: Aufheben fragt dingErreichbar', rumpf('function weltDingUnterStrahl(').includes('if (!d || !dingErreichbar(d)) continue'))
  wahr('Greifen: Zielen fragt dingErreichbar', rumpf('function zielTreffen(').includes('!dingErreichbar(d)'))
  wahr('Greifen: dingErreichbar rechnet mit dingGreifbar', rumpf('function dingErreichbar(').includes('return dingGreifbar(d.ly, dingBoden, greifBoeden)'))
  // Neubau der Welt: dieselbe Lage laesst das Ding in der Hand.
  const lageR = rumpf('function lageSetzen(')
  wahr('Neubau: dieselbe Lage laesst das Ding in der Hand', /if \(halt\.ding === d\) \{[\s\S]*?if \(wieGemerkt \|\| lageGleich\(vorher, neu\)\) return\s*handLeeren\(\)/.test(lageR))
  wahr('Neubau: dieselbe Lage laesst ein fremd gelenktes Fahrzeug', lageR.includes('if (wieGemerkt && e.fern.an) return'))
  wahr('Neubau: verglichen mit der Lage vor dem Ueberschreiben', lageR.indexOf('const alt = lagenMerk.get(l.id)') >= 0 && lageR.indexOf('const alt = lagenMerk.get(l.id)') < lageR.indexOf('lagenMerk.set(l.id, neu)'))
  // Mitspieler mit unbekanntem Fahrzeug: Figur zu sehen.
  const leuteR = rumpf('function leuteSchritt(')
  wahr('Mitspieler: nur mit vorhandenem Fahrzeug unsichtbar', leuteR.includes('const e = personFz(m)') && /if \(e\) \{[\s\S]*?continue\s*\}\s*\/\/[\s\S]*?if \(!f\.gruppe\.visible\) f\.gruppe\.visible = true/.test(leuteR) && !leuteR.includes('if (m.fahrzeug) {'))
  wahr('Mitspieler: Stellung zeigt die Figur, wenn das Fahrzeug fehlt', motor.includes('m.figur.gruppe.visible = !personFz(m)') && motor.includes('f.gruppe.visible = m.hat && !personFz(m)') && !motor.includes('m.figur.gruppe.visible = false\n'))
  wahr('Mitspieler: Hinstellen kennt die sitzende Figur', rumpf('function stellUmgebungFuellen(').includes('!m.hat || personFz(m)'))
  // Warten auf eine Ebene.
  wahr('Warten: weltSetzen beginnt es', /const warten = w && !fahrt \? ebeneWartenAb\(ebenen, vorher, typeof w\.version === 'function', treppeId, performance\.now\(\), wartenAlt\) : null/.test(motor))
  wahr('Warten: im Bild ruht das Gehen', /\} else if \(ebeneWarten\) \{\s*if \(wartenBild\(dt, zeit\)\) weiter = true\s*\} else if \(gehSchritt\(dt, zeit, echt\)\) weiter = true/.test(motor))
  wahr('Warten: jede neue Version prueft', /if \(ebeneWarten\) \{\s*\/\/[\s\S]*?wartenPruefen\(\)/.test(rumpf('function weltVersionPruefen(')))
  wahr('Warten: kein Fallen und kein Schieben', !rumpf('function wartenBild(').includes('hoeheSchritt') && !rumpf('function wartenBild(').includes('herausdruecken') && !rumpf('function wartenBild(').includes('bewegen('))
  wahr('Warten: Springen, Ebene, Begehen beenden es', rumpf('function sprungAusfuehren(').includes('ebeneWarten = null') && rumpf('function ebeneWechseln(').includes('ebeneWarten = null') && rumpf('function gehenStarten(').includes('ebeneWarten = null') && rumpf('function gehenAn(').includes('ebeneWarten = null'))
  // dingErzeugen: im Bild, je Welt neu, mit gefangenen Fehlern.
  wahr('Erzeugen: im Bild', motor.includes('if (erzeugenSchritt()) weiter = true'))
  wahr('Erzeugen: neue Welt fragt wieder', motor.includes('if (w !== weltJetzt) erzeugen.neu()'))
  wahr('Erzeugen: Fehler der Welt in der Konsole', /try \{\s*return w\.dingErzeugen\(id\) != null\s*\} catch \(err\) \{\s*console\.error\(/.test(motor))
  wahr('Erzeugen: unbekannte Kennung aus lage() vorgemerkt', (lageR.match(/erzeugenVormerken\(l\.id\)/g) || []).length === 2)
  wahr('Erzeugen: nach jeder neuen Version vorgemerkt', /teileAbgleichen\(fz, di\)\s*\/\/[^\n]*\n\s*erzeugenAlleVormerken\(\)/.test(motor))
  // aussteigen() meldet Erfolg wirklich.
  wahr('Aussteigen: gibt true oder false', motor.includes('function aussteigen(): boolean') && /    aussteigen,\n/.test(motor) && !motor.includes('return !fahrt') && /console\.warn\(`\[3d\] Aussteigen: rund um[^\n]*\n\s*return false/.test(motor))
}

if (fehler) {
  console.log(`${fehler} Abweichung(en)`)
  process.exit(1)
}
for (const m of messung) console.log(m)
console.log('ok')
