// Prueft die erfundenen Innenraeume der Stadt (E87) ohne Browser:
// src/lib/innenGenerator.ts (innenPlanen, wohnhausInnen) und
// src/components/plan3d/innen3d.ts (baueInnen), mit erfundenen Umrissen
// (Rechteck, L, U, Siebeneck, Innenhof, Schuppen 5 x 4 m, Einfamilienhaus,
// grosses Einkaufszentrum), frei gedreht und verschoben:
// - jede Art auf mehreren Umrissen: alles liegt im Umriss (Raeume, Moebel,
//   Dinge, Waende), nichts in einem Hof,
// - Begehbarkeit wie der Motor: Flutung ueber die Hindernisse jeder Ebene
//   mit Koerperradius, ueber die Schwelle an der Haustuer und alle Laeufe;
//   jeder Raum wird erreicht, jedes Geschoss auch,
// - Laeufe verbinden alle Geschosse; die richtige Kante ist frei, die
//   Seiten und das andere Ende sind gesperrt (auf beiden Ebenen),
// - Fenster genau an den Stellen von fensterReihe (im EG fensterOhneTuer),
//   als Glas im Mesh (Strahl), dazwischen Wand; die Tuer wie tuerLage
//   (weg von den Ecken, gleich wie die Fassade in stadt3d.ts),
// - kein Flimmern mit der Fassade: keine zweite Aussenseite der Wand (auch
//   keine Stirn einer Innenwand oder Empore auf dem Umriss), keine Leibung
//   der Haustuer, nichts ueber dem Dach, die oberste Decke DECKE_M darunter,
// - in Stuecken gebaut (innenBauen) dasselbe wie in einem Zug, kein Stueck
//   ueber 4 ms, Abbruch gibt frei; innenAntwort (Worker) gibt denselben
//   Plan oder den Fehler als Text; die Fahrzeuge im Inneren sind alle
//   vorgerechnet (INNEN_FAHRZEUGE),
// - Schwelle: von der Ebene draussen auf die Ebene des EG, Breite, Laenge,
//   Stufen, Lage vor der Aussenkante,
// - Oberkanten der Moebel als Hindernis (Tische, Betten, Theken; Regale ohne),
// - gleiche Eingabe gibt dasselbe (Plan und Ecken), Kennungen eindeutig,
//   5 bis 30 Dinge je Haus,
// - E87b: Dinge heissen '<praefix>:d<n>:<art>' (n die Stelle im Plan), die
//   Art steht am Ende; innenDingBauen baut aus der Kennung allein dasselbe
//   Ding (Masse, Ecken, Farben) wie im Haus,
// - Mengen: Zeichenaufrufe, Dreiecke, Bauzeit (Zahlen in der Ausgabe),
// - dispose() gibt alles frei,
// - wohnhausInnen: gueltig fuer siedlungInnenPruefen, keine Ueberdeckung
//   (auch nicht mit dem Kern), Eingang im Gang, Kueche und Bad, und
//   siedlung3d.ts baut das Ergebnis wie echte Plaene.
// Alle Umrisse, Namen und Zahlen sind erfunden.
// Aufruf im Projektordner: node scripts/innen-pruefen.mjs
// Ausgabe "ok" mit Kennzahlen oder die abweichenden Faelle, Exit 1 bei Fehlern.
import { readFileSync } from 'node:fs'
import { Matrix4, Mesh, MeshLambertMaterial, Raycaster, Vector3 } from 'three'
import { DECKE_M, INNEN_FAHRZEUGE, innenPlanen, tuerLage, wohnhausInnen } from '../src/lib/innenGenerator.ts'
import { innenAntwort } from '../src/lib/innenWerker.ts'
import { baueInnen, innenBauen, innenDingArt, innenDingBauen, innenDingKennung, innenVorbereiten } from '../src/components/plan3d/innen3d.ts'
import { baueSiedlung } from '../src/components/plan3d/siedlung3d.ts'
import { AUSSENWAND_M, FENSTER_BRUESTUNG, FENSTER_H, SCHWELLE_HINTER, SCHWELLE_VOR, fensterOhneTuer, fensterReihe, tuerBreite } from '../src/components/plan3d/stadtMasse.ts'
import { STUFE_M } from '../src/components/plan3d/vertrag3d.ts'
import { geschossUeberlappungen, geschossZuSiedlung, siedlungInnenPruefen } from '../src/lib/siedlungInnen.ts'

let fehler = 0
const meldungen = new Map()
function wahr(name, ist) {
  if (!ist) {
    // Gleiche Meldungen nur einmal zeigen, aber zaehlen.
    const k = name.replace(/[0-9.]+/g, '#')
    const n = (meldungen.get(k) ?? 0) + 1
    meldungen.set(k, n)
    if (n <= 3) console.log('ABWEICHUNG', name)
    fehler++
  }
}
function nahe(name, ist, soll, tol = 1e-6) {
  wahr(`${name}: ist ${ist}, soll ${soll}`, Math.abs(ist - soll) <= tol)
}

// Farben wie in src/index.css (helles Schema, Auszug).
const F = {
  rasen: '#7f9a5c', weg: '#b9b2a4', baum: '#4f7340', stamm: '#6b5340', hecke: '#5d7f47', himmelOben: '#9cc3e4', himmelUnten: '#e4ecef',
  fassade: '#e9e4da', wand3d: '#e1dace', weiss: '#eeede9', metall: '#9aa0a6', schwarz: '#26272a', glas: '#9fc3d9', holz: '#b98c5a',
  holzDunkel: '#5c4430', spielRot: '#d0573f', spielBlau: '#4f7fb8', spielGelb: '#e3b341', spielGruen: '#5aa469', gruen: '#56793f',
  rahmen3d: '#eeece8', platte: '#4a4a4c', spiegel: '#c3d0d6', wandKopf: '#cfc9bf', tuer3d: '#f4f2ed', zarge3d: '#d6d0c5',
  boden3d: '#bb9670', keramik: '#f6f6f3', front: '#d4b48a', stoff: '#8a8f99', waesche: '#f0eee8', topf: '#a0623e', teppich: '#9a7b6a',
  griff: '#77797d', wasser: '#8fc0d8', bildschirm: '#1c2a36', pappe: '#c8a476', leinen: '#e6dfd0', grund: '#ffffff', boden: '#eeeeee',
  bodenDraussen: '#dddddd', wand: '#333333', tuer: '#888888', fenster: '#99ccff', objekt: '#cccccc', objektRand: '#999999', fach: '#bbbbbb',
  kisteRand: '#aaaaaa', hervor: '#ff8800', strom: '#ffcc00', steckdose: '#cccccc', wandKante: '#999999', bodenDraussen3d: '#aaaaaa', schalter3d: '#eeeeee',
}

/* ------------------------------------------------ erfundene Umrisse */

const rechteck = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]
const FORMEN = {
  rechteck: { umriss: rechteck(0, 0, 24, 12) },
  L: { umriss: [[0, 0], [30, 0], [30, 10], [12, 10], [12, 24], [0, 24]] },
  U: { umriss: [[0, 0], [36, 0], [36, 22], [26, 22], [26, 9], [10, 9], [10, 22], [0, 22]] },
  sieben: { umriss: [[0, 0], [18, -3], [30, 4], [31, 15], [20, 22], [6, 20], [-3, 10]] },
  hof: { umriss: rechteck(0, 0, 40, 30), loecher: [rechteck(12, 10, 28, 20)] },
  schuppen: { umriss: rechteck(0, 0, 5, 4) },
  haus: { umriss: rechteck(0, 0, 11, 9) },
  gross: { umriss: [[0, 0], [110, 0], [120, 40], [100, 80], [0, 75]] },
}
const ARTEN = ['wohnen', 'haus', 'laden', 'supermarkt', 'einkaufszentrum', 'feuerwehr', 'spital', 'schule', 'kindergarten', 'kirche', 'buero', 'halle', 'garage', 'schuppen', 'sonst']

/** Umriss drehen (Grad, im Uhrzeigersinn egal) und verschieben; Umlauf wahlweise umkehren. */
function lege(form, grad, dx, dz, umkehren) {
  const a = (grad * Math.PI) / 180
  const t = (p) => [Math.round((p[0] * Math.cos(a) - p[1] * Math.sin(a) + dx) * 1000) / 1000, Math.round((p[0] * Math.sin(a) + p[1] * Math.cos(a) + dz) * 1000) / 1000]
  const r = (ring) => (umkehren ? ring.map(t).reverse() : ring.map(t))
  return { umriss: r(form.umriss), loecher: (form.loecher ?? []).map(r) }
}

/* ------------------------------------------------ Hilfen */

const inPoly = (p, poly) => {
  let drin = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    if (a[1] > p[1] !== b[1] > p[1] && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) drin = !drin
  }
  return drin
}
const abstandStrecke = (p, a, b) => {
  const dx = b[0] - a[0]
  const dz = b[1] - a[1]
  const l = dx * dx + dz * dz
  let t = l ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l : 0
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz)
}
const abstandRing = (p, ring) => {
  let d = Infinity
  for (let i = 0; i < ring.length; i++) d = Math.min(d, abstandStrecke(p, ring[i], ring[(i + 1) % ring.length]))
  return d
}
/** Im Haus: im Umriss (mit Toleranz am Rand) und in keinem Hof. */
const imHaus = (p, ringe, tol = 0.05) => {
  const drin = inPoly(p, ringe[0]) || abstandRing(p, ringe[0]) <= tol
  if (!drin) return false
  return ringe.slice(1).every((h) => !inPoly(p, h) || abstandRing(p, h) <= tol)
}
const median = (a) => {
  const s = [...a].sort((x, y) => x - y)
  return s[Math.floor(s.length / 2)]
}

/** Welt -> Haus (Umkehr von zuWelt: nur Drehung um y und Verschiebung). */
function hausVonWelt(M) {
  const e = M.elements
  return (x, z) => {
    const dx = x - e[12]
    const dz = z - e[14]
    // Inverse der Drehung = Transponierte.
    return [e[0] * dx + e[2] * dz, e[8] * dx + e[10] * dz]
  }
}
/** Drehung eines Hindernisses (three) in die Drehung im Haus. */
function drehImHaus(M, drehY) {
  const e = M.elements
  const phi = Math.atan2(-e[2], e[0])
  return drehY - phi
}
/** Abstand eines Punkts (Haus) zu einem Hindernis im Haus (0 = drin). */
function abstandHindernis(h, x, z) {
  const c = Math.cos(h.d)
  const s = Math.sin(h.d)
  const dx = x - h.x
  const dz = z - h.z
  // Achse der Laenge: (cos d, -sin d), Tiefe: (sin d, cos d).
  const u = dx * c - dz * s
  const v = dx * s + dz * c
  const au = Math.abs(u) - h.laenge / 2
  const av = Math.abs(v) - h.tiefe / 2
  return Math.hypot(Math.max(au, 0), Math.max(av, 0))
}

function meshesVon(g) {
  const out = []
  g.traverse((o) => o.isMesh && out.push(o))
  return out
}
const dreiecke = (g) => meshesVon(g).reduce((s, m) => s + m.geometry.getAttribute('position').count / 3, 0)

/* ------------------------------------------------ Begehbarkeit */

/** Flutet alle Ebenen ab der Schwelle (wie der Motor: Koerperkreis gegen
 *  Rechtecke, Stufen bis STUFE_M steigt man hinauf, Treppen nur ueber ihre
 *  Kanten). Gibt je Ebene das Raster der erreichten Zellen. */
function fluten(plan, teil, M, zelle = 0.1, radius = 0.2) {
  const haus = hausVonWelt(M)
  const ringe = plan.ringe
  let x0 = Infinity
  let x1 = -Infinity
  let z0 = Infinity
  let z1 = -Infinity
  for (const [x, z] of ringe[0]) {
    x0 = Math.min(x0, x)
    x1 = Math.max(x1, x)
    z0 = Math.min(z0, z)
    z1 = Math.max(z1, z)
  }
  x0 -= 1.5
  z0 -= 1.5
  x1 += 1.5
  z1 += 1.5
  const nx = Math.ceil((x1 - x0) / zelle)
  const nz = Math.ceil((z1 - z0) / zelle)
  const N = nx * nz
  const mitte = (i) => [x0 + ((i % nx) + 0.5) * zelle, z0 + (Math.floor(i / nx) + 0.5) * zelle]
  // Boden des Umrisses (einmal), ohne Hoefe.
  const imUmriss = new Uint8Array(N)
  for (let i = 0; i < N; i++) imUmriss[i] = inPoly(mitte(i), ringe[0]) && ringe.slice(1).every((h) => !inPoly(mitte(i), h)) ? 1 : 0
  const ebenen = teil.ebenen.map((E, k) => {
    const g = plan.geschosse[k]
    const geht = new Uint8Array(N)
    const zonen = g.boden
    for (let i = 0; i < N; i++) {
      if (!imUmriss[i]) continue
      const p = mitte(i)
      if (g.loecher.some((l) => inPoly(p, l))) continue
      if (zonen && !zonen.some((z) => inPoly(p, z))) continue
      geht[i] = 1
    }
    for (const h0 of E.hindernisse) {
      if (h0.oben !== undefined && h0.oben <= STUFE_M) continue
      const [hx, hz] = haus(h0.x, h0.z)
      const h = { x: hx, z: hz, laenge: h0.laenge, tiefe: h0.tiefe, d: drehImHaus(M, h0.drehY) }
      const r = Math.hypot(h.laenge, h.tiefe) / 2 + radius + zelle
      const i0 = Math.max(0, Math.floor((hx - r - x0) / zelle))
      const i1 = Math.min(nx - 1, Math.floor((hx + r - x0) / zelle))
      const j0 = Math.max(0, Math.floor((hz - r - z0) / zelle))
      const j1 = Math.min(nz - 1, Math.floor((hz + r - z0) / zelle))
      for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
          const q = j * nx + i
          if (!geht[q]) continue
          const p = mitte(q)
          if (abstandHindernis(h, p[0], p[1]) < radius) geht[q] = 0
        }
      }
    }
    return { id: E.id, geht, erreicht: new Uint8Array(N) }
  })
  const nachId = new Map(ebenen.map((e) => [e.id, e]))
  // Treppen im Haus: Mitte, Laufrichtung, Laenge, Breite.
  const treppen = teil.treppen.map((t) => {
    const [cx, cz] = haus(t.x, t.z)
    const d = drehImHaus(M, t.drehY)
    return { t, cx, cz, u: [Math.cos(d), -Math.sin(d)], v: [Math.sin(d), Math.cos(d)] }
  })
  const zellenAnKante = (T, ende) => {
    // Zellen knapp ausserhalb der Kante (ende -1: Anfang, +1: Ende), innerhalb der Breite.
    const out = []
    const s = ende * (T.t.laenge / 2 + 0.15)
    for (let w = -T.t.breite / 2 + 0.25; w <= T.t.breite / 2 - 0.25 + 1e-9; w += zelle) {
      const px = T.cx + T.u[0] * s + T.v[0] * w
      const pz = T.cz + T.u[1] * s + T.v[1] * w
      const i = Math.floor((px - x0) / zelle)
      const j = Math.floor((pz - z0) / zelle)
      if (i >= 0 && j >= 0 && i < nx && j < nz) out.push(j * nx + i)
    }
    return out
  }
  const schlange = []
  const saeen = (E, zellen) => {
    for (const q of zellen) {
      if (E.geht[q] && !E.erreicht[q]) {
        E.erreicht[q] = 1
        schlange.push([E, q])
      }
    }
  }
  // Start: hinter der Schwelle (Ende der Treppe von draussen).
  const schwelle = treppen.find((T) => T.t.id.endsWith(':schwelle'))
  if (schwelle) saeen(nachId.get(schwelle.t.nach), zellenAnKante(schwelle, 1))
  let runde = 0
  while (schlange.length && runde++ < 50) {
    while (schlange.length) {
      const [E, q] = schlange.pop()
      const i = q % nx
      for (const y of [i > 0 ? q - 1 : -1, i < nx - 1 ? q + 1 : -1, q - nx, q + nx]) {
        if (y < 0 || y >= N || !E.geht[y] || E.erreicht[y]) continue
        E.erreicht[y] = 1
        schlange.push([E, y])
      }
    }
    // Ueber die Treppen: wer an der richtigen Kante steht, kommt auf die andere Ebene.
    for (const T of treppen) {
      const von = nachId.get(T.t.von)
      const nach = nachId.get(T.t.nach)
      if (von && nach) {
        if (zellenAnKante(T, -1).some((q) => von.erreicht[q])) saeen(nach, zellenAnKante(T, 1))
        if (zellenAnKante(T, 1).some((q) => nach.erreicht[q])) saeen(von, zellenAnKante(T, -1))
      }
    }
  }
  return { ebenen, nx, nz, x0, z0, zelle, mitte }
}

/* ------------------------------------------------ ein Haus pruefen */

const kennzahlen = []

function hausPruefen(name, e, opts = {}) {
  const t0 = performance.now()
  const plan = innenPlanen(e)
  const tPlan = performance.now() - t0
  const M = new Matrix4().makeRotationY(opts.dreh ?? 0.7).setPosition(opts.x ?? 120, opts.y ?? 2.5, opts.z ?? -80)
  const praefix = `haus-${name}`
  const o = { plan, farben: F, zuWelt: M, praefix, name: `Test ${name}`, bodenEbene: 'boden', schwelleY: opts.schwelleY ?? 2.5 - 0.5 }
  const t1 = performance.now()
  const teil = baueInnen(o)
  const tBau = performance.now() - t1
  const n = Math.max(1, Math.round(e.geschosse))
  const gh = e.geschossHoehe
  const ty = M.elements[13]

  /* Gleich bei gleicher Eingabe. */
  const plan2 = innenPlanen(e)
  const ohneZeit = (p) => JSON.stringify({ ...p, ms: 0 })
  wahr(`${name}: gleiche Eingabe, gleicher Plan`, ohneZeit(plan) === ohneZeit(plan2))
  const teil2 = baueInnen({ ...o, plan: plan2 })
  const ecken = (t) => meshesVon(t.gruppe).filter((m) => m.name.startsWith('innen')).map((m) => Array.from(m.geometry.getAttribute('position').array.slice(0, 600)).join(','))
  wahr(`${name}: gleiche Ecken`, JSON.stringify(ecken(teil)) === JSON.stringify(ecken(teil2)))
  teil2.dispose()

  /* Geschosse, Ebenen, Kennungen. */
  wahr(`${name}: ${plan.geschosse.length} Geschosse, soll ${n}`, plan.geschosse.length === n)
  wahr(`${name}: ${teil.ebenen.length} Ebenen`, teil.ebenen.length === n)
  teil.ebenen.forEach((E, k) => {
    wahr(`${name}: Ebene ${k} Kennung ${E.id}`, E.id === `${praefix}:${k}`)
    wahr(`${name}: Ebene ${k} Name ${E.name}`, E.name === `Test ${name} · ${k === 0 ? 'EG' : k}`)
    nahe(`${name}: Ebene ${k} Hoehe`, E.y, k * gh + ty, 1e-9)
    wahr(`${name}: Ebene ${k} Hindernisse gueltig`, E.hindernisse.length > 0 && E.hindernisse.every((h) => [h.x, h.z, h.laenge, h.tiefe, h.drehY].every(Number.isFinite) && h.laenge > 0 && h.tiefe > 0))
  })
  const ids = [...teil.ebenen.map((x) => x.id), ...teil.treppen.map((x) => x.id), ...teil.dinge.map((x) => x.id)]
  wahr(`${name}: Kennungen eindeutig`, new Set(ids).size === ids.length)
  wahr(`${name}: ${teil.dinge.length} Dinge (5 bis 30)`, teil.dinge.length >= 5 && teil.dinge.length <= 30)
  // E87b: Kennung mit der Stelle im Plan und der Art; aus ihr allein
  // entsteht dasselbe Ding (Masse, Ecken, Farben) wie im Haus.
  const planArten = plan.geschosse.flatMap((g) => g.dinge.map((d) => d.art))
  wahr(`${name}: jedes Ding des Plans gebaut (${teil.dinge.length} von ${planArten.length})`, teil.dinge.length === planArten.length)
  const einzelMat = new MeshLambertMaterial({ vertexColors: true })
  teil.dinge.forEach((d, i) => {
    wahr(`${name}: Ding ${i} Kennung`, d.id === `${praefix}:d${i}:${planArten[i]}` && d.id === innenDingKennung(praefix, i, planArten[i]))
    wahr(`${name}: Ding ${i} Kennung mit Zeichen wie siedlung_ding_setzen`, /^[A-Za-z0-9:._-]{1,120}$/.test(d.id))
    wahr(`${name}: Ding ${i} Art aus der Kennung`, innenDingArt(d.id) === planArten[i])
    wahr(`${name}: Ding ${i} Ebene`, teil.ebenen.some((E) => E.id === d.ebene))
    wahr(`${name}: Ding ${i} Masse`, d.breite > 0.01 && d.tiefe > 0.01 && d.hoehe > 0.01 && d.breite < 1 && d.hoehe < 1)
    const e1 = innenDingBauen(d.id, F, einzelMat)
    const gleich = (n) => {
      const a = d.objekt.geometry.getAttribute(n).array
      const b = e1 && e1.objekt.geometry.getAttribute(n).array
      return !!b && a.length === b.length && a.every((v, j) => Math.abs(v - b[j]) < 1e-6)
    }
    wahr(`${name}: Ding ${i} einzeln aus der Kennung gleich (Masse, Ecken, Farben)`, !!e1 && e1.breite === d.breite && e1.tiefe === d.tiefe && e1.hoehe === d.hoehe && gleich('position') && gleich('normal') && gleich('color') && e1.objekt.name === d.id)
    e1?.objekt.geometry.dispose()
  })
  einzelMat.dispose()
  wahr(`${name}: keine Fahrzeuge zum Fahren`, teil.fahrzeuge.length === 0)

  /* Im Umriss: Raeume, Moebel, Dinge, Waende. */
  const ringe = plan.ringe
  for (const g of plan.geschosse) {
    for (const r of g.raeume) for (const q of r.rechtecke) for (const p of q) wahr(`${name}: Raum ${r.typ} im Umriss`, imHaus(p, ringe, 0.06))
    for (const m of g.moebel) {
      const d = [-m.u[1], m.u[0]]
      for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const p = [m.mitte[0] + (m.u[0] * a * m.b) / 2 + (d[0] * b * m.t) / 2, m.mitte[1] + (m.u[1] * a * m.b) / 2 + (d[1] * b * m.t) / 2]
        wahr(`${name}: Moebel ${m.art} im Umriss`, imHaus(p, ringe, 0.05))
      }
    }
    for (const d of g.dinge) wahr(`${name}: Ding ${d.art} im Umriss`, imHaus(d.mitte, ringe, 0))
    for (const w of g.waende) for (const p of [w.a, w.b]) wahr(`${name}: Wand im Umriss`, imHaus(p, ringe, AUSSENWAND_M + 0.05))
    for (const s of g.schilder) wahr(`${name}: Schild im Umriss`, imHaus(s.mitte, ringe, 0.05))
  }

  /* Oberkanten der Moebel. */
  const OBEN = { esstisch: 0.75, schreibtisch: 0.75, bett2: 0.5, bett1: 0.5, theke: 1.0 }
  for (const g of plan.geschosse) {
    for (const m of g.moebel) {
      if (m.art in OBEN) nahe(`${name}: Oberkante ${m.art}`, m.oben, OBEN[m.art], 1e-9)
      if (m.art === 'regal' || m.art === 'regalwand' || m.art === 'hochregal' || m.art === 'schrank') wahr(`${name}: ${m.art} ohne Oberkante`, m.oben === null)
    }
  }
  // Im Hindernis der Ebene steht die Oberkante (Stichprobe: alle Tische).
  plan.geschosse.forEach((g, k) => {
    for (const m of g.moebel.filter((x) => x.art === 'esstisch' || x.art === 'theke' || x.art === 'bett2')) {
      const E = teil.ebenen[k]
      const haus = hausVonWelt(M)
      const treffer = E.hindernisse.some((h) => {
        const [hx, hz] = haus(h.x, h.z)
        return Math.hypot(hx - m.mitte[0], hz - m.mitte[1]) < 1e-3 && h.oben === m.oben
      })
      wahr(`${name}: Hindernis ${m.art} mit Oberkante ${m.oben}`, treffer)
    }
  })

  /* Fenster an den Stellen von stadtMasse. */
  const soll = []
  ringe.forEach((ring, ri) => {
    for (let k = 0; k < ring.length; k++) {
      const a = ring[k]
      const b = ring[(k + 1) % ring.length]
      const L = Math.hypot(b[0] - a[0], b[1] - a[1])
      const alle = fensterReihe(L)
      const tuerHier = ri === 0 && plan.tuer && plan.tuer.kante === k
      const eg = tuerHier ? fensterOhneTuer(L, plan.tuer.t, plan.tuer.breite) : alle
      for (const t of alle) soll.push({ ring: ri, kante: k, t, eg: eg.some((x) => Math.abs(x - t) < 1e-9) })
    }
  })
  wahr(`${name}: Fenster wie fensterReihe (${plan.fenster.length}/${soll.length})`, JSON.stringify(plan.fenster) === JSON.stringify(soll))
  // Die Tuer genau dort, wo die Fassade (stadt3d.ts) sie hat: tuerLage.
  const lage = tuerLage(e.umriss, e.tuer, e.art)
  wahr(`${name}: Tuer wie tuerLage`, (!lage && !plan.tuer) || (!!lage && !!plan.tuer && lage.kante === plan.tuer.kante && Math.abs(lage.t - plan.tuer.t) < 1e-9 && Math.abs(lage.breite - plan.tuer.breite) < 1e-9))
  if (plan.tuer) {
    nahe(`${name}: Tuerbreite`, plan.tuer.breite, Math.min(tuerBreite(e.art), Math.hypot(...[0, 1].map((i) => ringe[0][(plan.tuer.kante + 1) % ringe[0].length][i] - ringe[0][plan.tuer.kante][i])) - 0.1), 1e-9)
  }
  // Fahrzeuge zum Anschauen: nur Arten und Farben, die innen3d vorrechnet.
  for (const g of plan.geschosse) for (const f of g.fahrzeuge) wahr(`${name}: Fahrzeug ${f.art} ${f.farbe} vorgerechnet`, INNEN_FAHRZEUGE.some((x) => x.art === f.art && x.farbe === f.farbe))

  /* Keine zweite Aussenseite (die zeichnet stadt3d.ts), keine Leibung der
   * Haustuer, nichts ueber dem Dach, die oberste Decke darunter. */
  {
    const haus = hausVonWelt(M)
    const phi = Math.atan2(-M.elements[2], M.elements[0])
    const c = Math.cos(phi)
    const s = Math.sin(phi)
    const kanten = []
    ringe.forEach((ring, ri) => {
      const A = ring.reduce((x, p, i) => x + p[0] * ring[(i + 1) % ring.length][1] - ring[(i + 1) % ring.length][0] * p[1], 0)
      ring.forEach((a, k) => {
        const b = ring[(k + 1) % ring.length]
        const L = Math.hypot(b[0] - a[0], b[1] - a[1])
        if (L < 1e-6) return
        const u = [(b[0] - a[0]) / L, (b[1] - a[1]) / L]
        // Nach aussen (weg vom Haus, beim Hof in den Hof).
        const aussenLinks = (A > 0) === (ri === 0)
        const n = aussenLinks ? [u[1], -u[0]] : [-u[1], u[0]]
        kanten.push({ a, u, n, L, ri, k })
      })
    })
    let aussen = 0
    let leibung = 0
    let hoch = -Infinity
    let decke = 0
    const oben = n * gh
    for (let k = 0; k < n; k++) {
      const m = teil.gruppe.getObjectByName(`innen:${k}`)
      if (!m) continue
      const pos = m.geometry.getAttribute('position')
      const nor = m.geometry.getAttribute('normal')
      for (let i = 0; i < pos.count; i += 3) {
        const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3
        const cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3 - ty
        const cz = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3
        const [hx, hz] = haus(cx, cz)
        // Normale in den Rahmen des Hauses (nur die Drehung um y).
        const wx = nor.getX(i)
        const wz = nor.getZ(i)
        const nx = c * wx - s * wz
        const nz = s * wx + c * wz
        hoch = Math.max(hoch, cy)
        if (Math.abs(cy - (oben - DECKE_M)) < 1e-3 && nor.getY(i) < -0.99) decke++
        for (const K of kanten) {
          const t = (hx - K.a[0]) * K.u[0] + (hz - K.a[1]) * K.u[1]
          const sAus = (hx - K.a[0]) * K.n[0] + (hz - K.a[1]) * K.n[1]
          if (t < -0.05 || t > K.L + 0.05 || sAus > 0.01 || sAus < -0.05) continue
          if (nx * K.n[0] + nz * K.n[1] > 0.9) aussen++
          // Leibung der Haustuer: senkrecht zur Wand, an den Seiten der Tuer, in der Wand.
          if (plan.tuer && K.ri === 0 && K.k === plan.tuer.kante && Math.abs(nx * K.u[0] + nz * K.u[1]) > 0.9 && cy < 2.2 && k === 0) {
            const t0 = plan.tuer.t - plan.tuer.breite / 2
            const t1 = plan.tuer.t + plan.tuer.breite / 2
            if (Math.abs(t - t0) < 0.02 || Math.abs(t - t1) < 0.02) leibung++
          }
        }
        if (plan.tuer && k === 0) {
          // Auch tiefer in der Wand (bis AUSSENWAND_M) keine Leibung der Haustuer.
          const K = kanten.find((x) => x.ri === 0 && x.k === plan.tuer.kante)
          const t = (hx - K.a[0]) * K.u[0] + (hz - K.a[1]) * K.u[1]
          const sAus = (hx - K.a[0]) * K.n[0] + (hz - K.a[1]) * K.n[1]
          const t0 = plan.tuer.t - plan.tuer.breite / 2
          const t1 = plan.tuer.t + plan.tuer.breite / 2
          // (Die Zarge innen an der Wand, um AUSSENWAND_M, zaehlt nicht.)
          if (sAus <= 0 && sAus > -AUSSENWAND_M + 0.05 && (Math.abs(t - t0) < 0.02 || Math.abs(t - t1) < 0.02) && Math.abs(nx * K.u[0] + nz * K.u[1]) > 0.9 && cy < 2.2) leibung++
        }
      }
    }
    wahr(`${name}: keine zweite Aussenseite der Wand (${aussen} Dreiecke)`, aussen === 0)
    wahr(`${name}: keine Leibung der Haustuer (zeichnet stadt3d, ${leibung})`, leibung === 0)
    wahr(`${name}: nichts ueber dem Dach (${hoch.toFixed(3)} <= ${oben})`, hoch <= oben + 1e-6)
    wahr(`${name}: oberste Decke DECKE_M unter dem Dach (${decke})`, decke > 0)
  }
  wahr(`${name}: je Geschoss ein Mesh (stockMeshes)`, teil.stockMeshes.length === n && teil.stockMeshes.every((m, k) => m && m.name === `innen:${k}` && m.parent === teil.fest))
  wahr(`${name}: Dinge direkt in der Gruppe`, teil.dinge.every((d) => d.objekt.parent === teil.gruppe))
  // Glas im Mesh genau dort (Strahl von innen), Wand zwischen zwei Fenstern.
  const ray = new Raycaster()
  const glasM = teil.gruppe.getObjectByName('innen:glas')
  let glasGeprueft = 0
  for (const k of [0, n - 1]) {
    const stock = teil.gruppe.getObjectByName(`innen:${k}`)
    if (!stock || !glasM) continue
    const g = plan.geschosse[k]
    const wandNah = (p) => g.waende.some((w) => w.art !== 'sperre' && abstandStrecke(p, w.a, w.b) < Math.max(0.15, w.dicke / 2 + 0.05))
    /** Steht ein hohes Moebel zwischen Start und Fenster (dann zaehlt das Fenster nicht)? */
    // Treppenlaeufe an der Fassade laufen auch vor Fenstern vorbei (Stufen, Handlauf).
    const laeufeHier = plan.laeufe.filter((l) => l.k === k || l.k === k - 1)
    /** Schneiden sich die Strecken a-b und c-d (oder kommen sich naeher als tol)? */
    const nah = (a, b, c2, d, tol) => {
      const kr = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
      const s1 = kr(a, b, c2)
      const s2 = kr(a, b, d)
      const s3 = kr(c2, d, a)
      const s4 = kr(c2, d, b)
      if (s1 * s2 < 0 && s3 * s4 < 0) return true
      return Math.min(abstandStrecke(c2, a, b), abstandStrecke(d, a, b), abstandStrecke(a, c2, d), abstandStrecke(b, c2, d)) < tol
    }
    const verstellt = (a, b) =>
      g.waende.some((w) => w.art !== 'sperre' && nah(a, b, w.a, w.b, w.dicke / 2 + 0.1)) ||
      g.moebel.some((m) => m.h > FENSTER_BRUESTUNG + 0.3 && abstandStrecke(m.mitte, a, b) < Math.max(m.b, m.t) / 2 + 0.25) ||
      laeufeHier.some((l) => abstandStrecke(b, l.a, [l.a[0] + l.u[0] * l.laenge, l.a[1] + l.u[1] * l.laenge]) < l.breite * 1.6 + 0.6)
    for (const f of plan.fenster) {
      if (k === 0 && !f.eg) continue
      const ring = ringe[f.ring]
      const a = ring[f.kante]
      const b = ring[(f.kante + 1) % ring.length]
      const L = Math.hypot(b[0] - a[0], b[1] - a[1])
      const u = [(b[0] - a[0]) / L, (b[1] - a[1]) / L]
      // Innen: der Punkt 1 m vor der Kante, der im Haus liegt.
      const m = [a[0] + u[0] * f.t, a[1] + u[1] * f.t]
      let nI = [-u[1], u[0]]
      if (!imHaus([m[0] + nI[0] * 1, m[1] + nI[1] * 1], ringe, 0)) nI = [u[1], -u[0]]
      const start = [m[0] + nI[0] * 1.0, m[1] + nI[1] * 1.0]
      if (!imHaus(start, ringe, 0) || wandNah(start) || wandNah([m[0] + nI[0] * 0.5, m[1] + nI[1] * 0.5]) || verstellt(start, m)) continue
      const y = g.y + FENSTER_BRUESTUNG + FENSTER_H / 2
      const o3 = new Vector3(start[0], y, start[1]).applyMatrix4(M)
      const z3 = new Vector3(m[0], y, m[1]).applyMatrix4(M)
      ray.set(o3, z3.clone().sub(o3).normalize())
      const hits = ray.intersectObjects([stock, glasM], false)
      const erster = hits[0]
      glasGeprueft++
      wahr(`${name}: Fenster ${f.ring}/${f.kante}/${f.t.toFixed(2)} im Geschoss ${k} ist Glas (${erster ? erster.object.name + ' ' + erster.distance.toFixed(2) : 'nichts'})`, !!erster && erster.object === glasM && Math.abs(erster.distance - (1.0 - 0.18)) < 0.03)
      // Darunter Bruestung (Wand oder Brett): auf 0,5 m Hoehe trifft der Strahl Undurchsichtiges.
      const yb = g.y + FENSTER_BRUESTUNG * 0.5
      ray.set(new Vector3(start[0], yb, start[1]).applyMatrix4(M), z3.clone().setY(yb).sub(new Vector3(start[0], yb, start[1]).applyMatrix4(M)).setY(0).normalize())
      const hb = ray.intersectObjects([stock, glasM], false)[0]
      wahr(`${name}: unter dem Fenster Bruestung`, !!hb && hb.object === stock)
    }
  }

  /* Laeufe: verbinden alle Geschosse; Kanten frei oder gesperrt. */
  const haus = hausVonWelt(M)
  const laeufe = teil.treppen.filter((t) => /:t\d+$/.test(t.id))
  wahr(`${name}: ${laeufe.length} Laeufe fuer ${n} Geschosse`, laeufe.length === Math.max(0, n - 1) || (n > 1 && plan.laeufe.length === 0 && plan.geschosse.slice(1).every((g) => g.raeume.length === 0)))
  for (let k = 0; k + 1 < n && laeufe.length; k++) {
    const t = laeufe.find((x) => x.von === `${praefix}:${k}`)
    wahr(`${name}: Lauf ab Geschoss ${k}`, !!t && t.nach === `${praefix}:${k + 1}` && t.id === `${praefix}:t${k}`)
    if (!t) continue
    wahr(`${name}: Lauf ${k} mindestens 1,1 m breit`, t.breite >= 1.1 - 1e-9)
    const steig = gh / t.stufen
    const tritt = t.laenge / t.stufen
    wahr(`${name}: Lauf ${k} Stufen ${steig.toFixed(3)} x ${tritt.toFixed(3)}`, steig >= 0.15 && steig <= 0.225 && tritt >= 0.19 && tritt <= 0.32)
    const [cx, cz] = haus(t.x, t.z)
    const d = drehImHaus(M, t.drehY)
    const u = [Math.cos(d), -Math.sin(d)]
    const v = [Math.sin(d), Math.cos(d)]
    const P = (s, w) => [cx + u[0] * s + v[0] * w, cz + u[1] * s + v[1] * w]
    const gedeckt = (E, p) => E.hindernisse.some((h) => {
      const [hx, hz] = haus(h.x, h.z)
      return abstandHindernis({ x: hx, z: hz, laenge: h.laenge, tiefe: h.tiefe, d: drehImHaus(M, h.drehY) }, p[0], p[1]) < 1e-9
    })
    const unten = teil.ebenen[k]
    const oben = teil.ebenen[k + 1]
    const L2 = t.laenge / 2
    const B2 = t.breite / 2
    for (const w of [-B2 / 2, 0, B2 / 2]) {
      wahr(`${name}: Lauf ${k} Antritt unten frei`, !gedeckt(unten, P(-L2 - 0.15, w)))
      wahr(`${name}: Lauf ${k} oberes Ende unten gesperrt`, gedeckt(unten, P(L2 + 0.04, w)))
      wahr(`${name}: Lauf ${k} Austritt oben frei`, !gedeckt(oben, P(L2 + 0.15, w)))
      wahr(`${name}: Lauf ${k} Anfang oben gesperrt`, gedeckt(oben, P(-L2 - 0.04, w)))
    }
    for (const s of [-L2 / 2, 0, L2 / 2]) {
      for (const seite of [-1, 1]) {
        wahr(`${name}: Lauf ${k} Seite unten gesperrt`, gedeckt(unten, P(s, seite * (B2 + 0.04))))
        wahr(`${name}: Lauf ${k} Seite oben gesperrt`, gedeckt(oben, P(s, seite * (B2 + 0.04))))
      }
    }
  }

  /* Schwelle an der Haustuer. */
  const sw = teil.treppen.find((t) => t.id === `${praefix}:schwelle`)
  wahr(`${name}: Schwelle da`, !!sw === !!plan.tuer)
  if (sw && plan.tuer) {
    wahr(`${name}: Schwelle von draussen nach EG`, sw.von === 'boden' && sw.nach === `${praefix}:0`)
    nahe(`${name}: Schwelle Laenge`, sw.laenge, SCHWELLE_VOR + SCHWELLE_HINTER, 1e-9)
    nahe(`${name}: Schwelle Breite`, sw.breite, Math.max(0.7, plan.tuer.breite - 0.1), 1e-9)
    const dy = ty - o.schwelleY
    wahr(`${name}: Schwelle Stufen`, sw.stufen === (Math.abs(dy) < 0.2 ? 0 : Math.round(Math.abs(dy) / 0.17)))
    // Anfang SCHWELLE_VOR vor der Aussenkante, Richtung ins Haus.
    const [cx, cz] = haus(sw.x, sw.z)
    const d = drehImHaus(M, sw.drehY)
    const u = [Math.cos(d), -Math.sin(d)]
    const anfang = [cx - (u[0] * sw.laenge) / 2, cz - (u[1] * sw.laenge) / 2]
    nahe(`${name}: Schwelle Anfang vor der Kante`, Math.hypot(anfang[0] - plan.tuer.mitte[0], anfang[1] - plan.tuer.mitte[1]), SCHWELLE_VOR, 1e-6)
    nahe(`${name}: Schwelle ins Haus`, u[0] * plan.tuer.n[0] + u[1] * plan.tuer.n[1], 1, 1e-9)
    // Die Luecke in der Aussenwand ist frei.
    const E0 = teil.ebenen[0]
    for (const w of [-0.3, 0, 0.3]) {
      const p = [plan.tuer.mitte[0] + plan.tuer.u[0] * w * plan.tuer.breite + plan.tuer.n[0] * 0.15, plan.tuer.mitte[1] + plan.tuer.u[1] * w * plan.tuer.breite + plan.tuer.n[1] * 0.15]
      const zu = E0.hindernisse.some((h) => {
        const [hx, hz] = haus(h.x, h.z)
        return abstandHindernis({ x: hx, z: hz, laenge: h.laenge, tiefe: h.tiefe, d: drehImHaus(M, h.drehY) }, p[0], p[1]) < 1e-9
      })
      wahr(`${name}: Haustuer offen`, !zu)
    }
  }

  /* Begehbarkeit: jeder Raum ab der Schwelle erreichbar. */
  const flut = fluten(plan, teil, M, plan.zelle > 0.5 ? 0.15 : 0.1)
  let raeume = 0
  let erreicht = 0
  plan.geschosse.forEach((g, k) => {
    const E = flut.ebenen[k]
    for (const r of g.raeume) {
      if (r.typ === 'schacht') continue
      raeume++
      let ok = false
      for (const q of r.rechtecke) {
        if (ok) break
        let a0 = Infinity
        let a1 = -Infinity
        let b0 = Infinity
        let b1 = -Infinity
        for (const [x, z] of q) {
          a0 = Math.min(a0, x)
          a1 = Math.max(a1, x)
          b0 = Math.min(b0, z)
          b1 = Math.max(b1, z)
        }
        const i0 = Math.max(0, Math.floor((a0 - flut.x0) / flut.zelle))
        const i1 = Math.min(flut.nx - 1, Math.floor((a1 - flut.x0) / flut.zelle))
        const j0 = Math.max(0, Math.floor((b0 - flut.z0) / flut.zelle))
        const j1 = Math.min(flut.nz - 1, Math.floor((b1 - flut.z0) / flut.zelle))
        for (let j = j0; j <= j1 && !ok; j++) {
          for (let i = i0; i <= i1 && !ok; i++) {
            const c = j * flut.nx + i
            if (E.erreicht[c] && inPoly(flut.mitte(c), q)) ok = true
          }
        }
      }
      if (ok) erreicht++
      wahr(`${name}: Geschoss ${k} ${r.typ} (${r.qm} m2) erreichbar`, ok)
    }
    wahr(`${name}: Geschoss ${k} erreicht`, g.raeume.length === 0 || E.erreicht.some((x) => x))
  })

  /* Mengen. */
  const auf = meshesVon(teil.gruppe).length
  const tri = dreiecke(teil.gruppe)
  kennzahlen.push({ name, auf, tri, tBau, tPlan, raeume, erreicht, dinge: teil.dinge.length, glas: glasGeprueft })
  wahr(`${name}: ${auf} Zeichenaufrufe (hoechstens 30)`, auf <= 30)
  // Typisch: bis 1500 m2 Geschossflaeche zusammen; groesser (und Einkaufszentrum, Spital) bis 60 000.
  const flaeche = plan.geschosse.reduce((s2, g) => s2 + g.raeume.reduce((a, r) => a + r.qm, 0), 0)
  const grossesHaus = e.art === 'einkaufszentrum' || e.art === 'spital' || flaeche > 1500
  const grenze = grossesHaus ? 60000 : 20000
  wahr(`${name}: ${tri} Dreiecke (hoechstens ${grenze}, ${Math.round(flaeche)} m2)`, tri <= grenze)
  for (const m of meshesVon(teil.gruppe)) wahr(`${name}: ${m.name} endlich`, m.geometry.getAttribute('position').array.every(Number.isFinite))

  /* dispose() gibt alles frei. */
  let geoFrei = 0
  let matFrei = 0
  const geos = new Set()
  const mats = new Set()
  for (const m of meshesVon(teil.gruppe)) {
    geos.add(m.geometry)
    mats.add(m.material)
  }
  for (const g of geos) g.addEventListener('dispose', () => geoFrei++)
  for (const m of mats) m.addEventListener('dispose', () => matFrei++)
  teil.dispose()
  wahr(`${name}: dispose gibt ${geoFrei}/${geos.size} Geometrien frei`, geoFrei === geos.size)
  wahr(`${name}: dispose gibt ${matFrei}/${mats.size} Materialien frei`, matFrei === mats.size)
  wahr(`${name}: Gruppe leer`, teil.gruppe.children.length === 0)
  return { plan, tPlan, tBau, tri, auf }
}

/* ------------------------------------------------ alle Arten, alle Umrisse */

const LAEDEN = [
  { name: 'Erfunden Mode', art: 'clothes' },
  { name: 'Erfunden Cafe', art: 'cafe' },
  { name: 'Erfunden Buch', art: 'books' },
]
let fall = 0
for (const art of ARTEN) {
  for (const [fn, gs] of [['rechteck', 3], ['L', 2], ['sieben', 3], ['hof', 2], ['haus', 2], ['schuppen', 1], ['U', 1]]) {
    fall++
    const lage = lege(FORMEN[fn], (fall * 37) % 360, (fall % 5) * 13 - 30, (fall % 7) * 11 - 20, fall % 2 === 1)
    const name = `${art}-${fn}-${gs}`
    try {
      hausPruefen(name, {
      id: `erfunden-${art}-${fn}`,
      art,
      umriss: lage.umriss,
      loecher: lage.loecher,
      geschosse: gs,
      geschossHoehe: art === 'feuerwehr' || art === 'halle' ? 4.2 : art === 'kirche' ? 4 : 3,
      tuer: { kante: fall % lage.umriss.length, t: 0.3 + (fall % 5) * 0.1 },
      name: `Erfunden ${fall}`,
      laeden: LAEDEN,
      }, { dreh: (fall * 0.37) % 6.28, schwelleY: fall % 3 === 0 ? 2.5 : 1.6 })
    } catch (err) {
      wahr(`${name}: ohne Fehler (${err && err.stack ? err.stack.split(String.fromCharCode(10)).slice(0, 3).join(' | ') : err})`, false)
    }
  }
}

/* Mengen und Zeiten fuer die Ziele: Wohnhaus mit 4 Geschossen, grosses Einkaufszentrum. */
function messen(name, e, wieOft) {
  const plan = []
  const bau = []
  let letzte = null
  for (let i = 0; i < wieOft; i++) {
    const t0 = performance.now()
    const p = innenPlanen({ ...e, id: `${e.id}-${i % 3}` })
    const t1 = performance.now()
    const teil = baueInnen({ plan: p, farben: F, zuWelt: new Matrix4().makeRotationY(0.3).setPosition(10, 1, 20), praefix: 'm', name: 'M', bodenEbene: 'boden', schwelleY: 0.5 })
    const t2 = performance.now()
    plan.push(t1 - t0)
    bau.push(t2 - t1)
    if (letzte) letzte.dispose()
    letzte = teil
  }
  const auf = meshesVon(letzte.gruppe).length
  const tri = dreiecke(letzte.gruppe)
  letzte.dispose()
  return { name, plan: median(plan.slice(3)), bau: median(bau.slice(3)), auf, tri }
}
const wohn = messen('Wohnhaus 24 x 12 m, 4 Geschosse', { id: 'mess-wohnen', art: 'wohnen', umriss: rechteck(0, 0, 24, 12), geschosse: 4, geschossHoehe: 3, tuer: { kante: 0, t: 0.45 } }, 15)
const mall = messen('Einkaufszentrum 120 x 80 m, 3 Geschosse', { id: 'mess-mall', art: 'einkaufszentrum', umriss: FORMEN.gross.umriss, geschosse: 3, geschossHoehe: 4, tuer: { kante: 0, t: 0.5 }, laeden: LAEDEN }, 8)
const spital = messen('Spital 40 x 26 m, 4 Geschosse', { id: 'mess-spital', art: 'spital', umriss: rechteck(0, 0, 40, 26), geschosse: 4, geschossHoehe: 3.2, tuer: { kante: 0, t: 0.5 } }, 8)
wahr(`Wohnhaus: Bauzeit ${wohn.bau.toFixed(1)} ms (hoechstens 15)`, wohn.bau <= 15)
wahr(`Wohnhaus: ${wohn.tri} Dreiecke (hoechstens 20000)`, wohn.tri <= 20000)
wahr(`Wohnhaus: ${wohn.auf} Zeichenaufrufe (hoechstens 30)`, wohn.auf <= 30)
wahr(`Einkaufszentrum: Bauzeit ${mall.bau.toFixed(1)} ms (hoechstens 60)`, mall.bau <= 60)
wahr(`Einkaufszentrum: ${mall.tri} Dreiecke (hoechstens 60000)`, mall.tri <= 60000)
wahr(`Einkaufszentrum: ${mall.auf} Zeichenaufrufe (hoechstens 30)`, mall.auf <= 30)
wahr(`Spital: ${spital.tri} Dreiecke (hoechstens 60000)`, spital.tri <= 60000)

/* tuerLage: weg von den Ecken, auf kurzen Kanten in der Mitte, sonst nichts. */
{
  const R = rechteck(0, 0, 12, 8)
  const ecke = AUSSENWAND_M + 0.15
  for (const t of [0, 1, -3, 7]) {
    const l = tuerLage(R, { kante: 0, t }, 'haus')
    wahr(`tuerLage t=${t}: auf der Kante, weg von der Ecke`, !!l && l.kante === 0 && l.t - l.breite / 2 >= ecke - 1e-9 && l.t + l.breite / 2 <= 12 - ecke + 1e-9)
  }
  const mitte = tuerLage(R, { kante: 0, t: 0.5 }, 'haus')
  nahe('tuerLage: in der Mitte bleibt sie', mitte.t, 6, 1e-9)
  nahe('tuerLage: Breite nach tuerBreite', mitte.breite, tuerBreite('haus'), 1e-9)
  const kurz = tuerLage([[0, 0], [1.5, 0], [1.5, 3], [0, 3]], { kante: 0, t: 0.1 }, 'einkaufszentrum')
  wahr('tuerLage: kurze Kante: schmaler, in der Mitte', !!kurz && Math.abs(kurz.t - 0.75) < 1e-9 && Math.abs(kurz.breite - 1.4) < 1e-9)
  wahr('tuerLage: Kante unter 0,8 m: keine Tuer', tuerLage([[0, 0], [0.7, 0], [0.7, 3], [0, 3]], { kante: 0, t: 0.5 }, 'haus') === null)
  wahr('tuerLage: Kante gerundet und zyklisch', tuerLage(R, { kante: 4.2, t: 0.5 }, 'haus').kante === 0 && tuerLage(R, { kante: -1, t: 0.5 }, 'haus').kante === 3)
  wahr('tuerLage: doppelter Endpunkt zaehlt nicht', JSON.stringify(tuerLage([...R, R[0]], { kante: 3, t: 0.2 }, 'laden')) === JSON.stringify(tuerLage(R, { kante: 3, t: 0.2 }, 'laden')))
  wahr('tuerLage: kaputte Angaben: keine Tuer', tuerLage(R, null, 'haus') === null && tuerLage(R, { kante: NaN, t: 0.5 }, 'haus') === null && tuerLage([[0, 0], [1, 0]], { kante: 0, t: 0.5 }, 'haus') === null)
  // Das Innere uebernimmt sie: Tuer in der Ecke gegeben, im Plan weggerueckt.
  const p = innenPlanen({ id: 'ecke', art: 'wohnen', umriss: rechteck(0, 0, 20, 10), geschosse: 2, geschossHoehe: 3, tuer: { kante: 2, t: 0 } })
  const l = tuerLage(rechteck(0, 0, 20, 10), { kante: 2, t: 0 }, 'wohnen')
  wahr('innenPlanen: Tuer aus der Ecke wie tuerLage', !!p.tuer && p.tuer.kante === 2 && Math.abs(p.tuer.t - l.t) < 1e-9 && p.tuer.t > 1)
}

/* In Stuecken bauen: dasselbe wie in einem Zug, kein Stueck lang, Abbruch gibt frei. */
{
  const e = { id: 'stuecke', art: 'spital', umriss: rechteck(0, 0, 40, 26), geschosse: 4, geschossHoehe: 3.2, tuer: { kante: 0, t: 0.5 } }
  const plan = innenPlanen(e)
  const o = { plan, farben: F, zuWelt: new Matrix4().makeRotationY(1.1).setPosition(4, 2, -9), praefix: 's', name: 'S', bodenEbene: 'boden', schwelleY: 1.5 }
  innenVorbereiten(F)
  const ganz = baueInnen(o)
  // Warm laufen lassen, dann messen.
  for (let i = 0; i < 2; i++) {
    const b = innenBauen(o)
    b.weiter(Infinity)
    b.teil.dispose()
  }
  // Dreimal, das beste zaehlt (der Muellsammler und andere Programme stoeren die Zeit).
  let bau = null
  let stuecke = 0
  let laengstes = Infinity
  for (let runde = 0; runde < 3; runde++) {
    bau?.teil?.dispose()
    bau = innenBauen(o)
    stuecke = 0
    let max = 0
    for (;;) {
      const t0 = performance.now()
      const fertig = bau.weiter(0)
      max = Math.max(max, performance.now() - t0)
      stuecke++
      if (fertig) break
    }
    laengstes = Math.min(laengstes, max)
  }
  const lagen = (t) => t.stockMeshes.map((m) => Array.from(m.geometry.getAttribute('position').array).join(','))
  wahr(`in Stuecken: dasselbe wie in einem Zug (${stuecke} Stuecke)`, stuecke > 20 && JSON.stringify(lagen(bau.teil)) === JSON.stringify(lagen(ganz)) && JSON.stringify(bau.teil.ebenen) === JSON.stringify(ganz.ebenen) && JSON.stringify(bau.teil.treppen) === JSON.stringify(ganz.treppen))
  wahr(`in Stuecken: laengstes Stueck ${laengstes.toFixed(2)} ms (hoechstens 4)`, laengstes <= 4)
  console.log(`  Spital in Stuecken: ${stuecke} Stuecke, laengstes ${laengstes.toFixed(2)} ms`)
  bau.teil.dispose()
  ganz.dispose()
  // Abbrechen mitten im Bau: alles bisher Gebaute frei, danach nichts mehr.
  const halb = innenBauen(o)
  for (let i = 0; i < 30; i++) halb.weiter(0)
  halb.abbrechen()
  wahr('abbrechen: kein Teil, weiter() ist fertig', halb.teil === null && halb.weiter(Infinity) === true && halb.teil === null)
  // Fahrzeuge werden in Stuecken eingebacken (ein Auto am Stueck kostete
  // kalt bis 17 ms): dasselbe wie in einem Zug, kein Stueck lang.
  const fw = innenPlanen({ id: 'stuecke-fw', art: 'feuerwehr', umriss: rechteck(0, 0, 24, 16), geschosse: 2, geschossHoehe: 4, tuer: { kante: 0, t: 0.5 } })
  const fwZahl = fw.geschosse.reduce((s, g) => s + g.fahrzeuge.length, 0)
  const ofw = { ...o, plan: fw, praefix: 'f' }
  const fwGanz = baueInnen(ofw)
  let fwBau = null
  let fwStuecke = 0
  let fwLaengstes = Infinity
  for (let runde = 0; runde < 3; runde++) {
    fwBau?.teil?.dispose()
    fwBau = innenBauen(ofw)
    fwStuecke = 0
    let max = 0
    for (;;) {
      const t0 = performance.now()
      const fertig = fwBau.weiter(0)
      max = Math.max(max, performance.now() - t0)
      fwStuecke++
      if (fertig) break
    }
    fwLaengstes = Math.min(fwLaengstes, max)
  }
  wahr(`Feuerwehr in Stuecken: dasselbe wie in einem Zug (${fwZahl} Fahrzeuge, ${fwStuecke} Stuecke)`, fwZahl >= 1 && fwStuecke >= 9 * fwZahl && JSON.stringify(lagen(fwBau.teil)) === JSON.stringify(lagen(fwGanz)))
  wahr(`Feuerwehr in Stuecken: laengstes Stueck ${fwLaengstes.toFixed(2)} ms (hoechstens 4)`, fwLaengstes <= 4)
  console.log(`  Feuerwehr in Stuecken: ${fwZahl} Fahrzeuge, ${fwStuecke} Stuecke, laengstes ${fwLaengstes.toFixed(2)} ms`)
  fwBau.teil.dispose()
  fwGanz.dispose()
}

/* Der Worker: innenAntwort gibt denselben Plan, Fehler als Text. */
{
  const e = { id: 'werker', art: 'laden', umriss: rechteck(0, 0, 14, 9), geschosse: 2, geschossHoehe: 3, tuer: { kante: 0, t: 0.5 } }
  const a = innenAntwort({ nr: 7, eingabe: e })
  const ohneZeit = (p) => JSON.stringify({ ...p, ms: 0 })
  wahr('innenAntwort: Nummer und Plan', a.nr === 7 && !!a.plan && ohneZeit(a.plan) === ohneZeit(innenPlanen(e)))
  wahr('innenAntwort: Plan als reine Daten (kopierbar)', ohneZeit(structuredClone(a.plan)) === ohneZeit(a.plan))
  const kaputt = innenAntwort({ nr: 8 })
  wahr(`innenAntwort: Fehler als Text (${kaputt.fehler})`, kaputt.nr === 8 && !kaputt.plan && typeof kaputt.fehler === 'string' && kaputt.fehler.length > 0)
}

/* Kaputte Eingaben: kein Absturz, nichts innen. */
for (const [n2, e] of [
  ['ohne Umriss', { id: 'x', art: 'wohnen', umriss: [], geschosse: 2, geschossHoehe: 3, tuer: { kante: 0, t: 0.5 } }],
  ['Linie', { id: 'x', art: 'wohnen', umriss: [[0, 0], [10, 0], [20, 0]], geschosse: 2, geschossHoehe: 3, tuer: { kante: 0, t: 0.5 } }],
  ['NaN', { id: 'x', art: 'wohnen', umriss: [[0, 0], [NaN, 0], [5, 5]], geschosse: 2, geschossHoehe: 3, tuer: { kante: 0, t: 0.5 } }],
]) {
  let p = null
  try {
    p = innenPlanen(e)
  } catch (err) {
    wahr(`kaputt (${n2}) wirft nicht: ${err}`, false)
  }
  wahr(`kaputt (${n2}): leer`, !!p && p.geschosse.length === 0)
  if (p) {
    const t = baueInnen({ plan: p, farben: F, zuWelt: new Matrix4(), praefix: 'k', name: 'K', bodenEbene: 'boden', schwelleY: 0 })
    wahr(`kaputt (${n2}): nichts gebaut`, t.ebenen.length === 0 && t.gruppe.children.length === 0)
    t.dispose()
  }
}

/* ------------------------------------------------ wohnhausInnen */

/** Ein erfundenes Siedlungshaus: Geschoss-Rahmen gedreht und verschoben. */
function wohnhausFall(name, umrissCm, kern, gang, geschosse, drehung) {
  const e = { gebaeudeId: `erfunden-${name}`, x: 12.5, z: -7.25, drehung, umrissCm, geschosse, kern, gang }
  const h = wohnhausInnen(e)
  wahr(`wohnhaus ${name}: Ergebnis`, !!h)
  if (!h) return null
  wahr(`wohnhaus ${name}: gleich bei gleicher Eingabe`, JSON.stringify(h) === JSON.stringify(wohnhausInnen(e)))
  const probleme = siedlungInnenPruefen([h], [e.gebaeudeId])
  wahr(`wohnhaus ${name}: gueltig (${JSON.stringify(probleme.slice(0, 3))})`, probleme.length === 0)
  wahr(`wohnhaus ${name}: ${h.geschosse.length} Geschosse`, h.geschosse.length === geschosse)
  for (const g of h.geschosse) {
    const ue = geschossUeberlappungen(g)
    wahr(`wohnhaus ${name}: Geschoss ${g.geschoss} ohne Ueberdeckung (${JSON.stringify(ue.slice(0, 3))})`, ue.length === 0)
    wahr(`wohnhaus ${name}: Geschoss ${g.geschoss} ${g.wohnungen.length} Wohnungen (2 bis 4)`, g.wohnungen.length >= 2 && g.wohnungen.length <= 4)
    const tops = g.wohnungen.map((w) => w.top)
    wahr(`wohnhaus ${name}: Tops eindeutig`, new Set(tops).size === tops.length && tops.every((t) => t.startsWith('Haus-')))
    const kerne = g.allgemein.filter((a) => a.art === 'stiege' || a.art === 'aufzug')
    const gaenge = g.allgemein.filter((a) => a.art === 'gang' || a.art === 'laubengang')
    wahr(`wohnhaus ${name}: Kern und Gang uebernommen`, (kern.length ? kerne.length === kern.length : true) && gaenge.length >= Math.max(1, gang.length))
    for (const w of g.wohnungen) {
      // Kein Raum im Kern (auch nicht teilweise): keine Ecke innen, keine Kernecke im Raum.
      for (const r of w.raeume) {
        for (const k of kerne) {
          wahr(`wohnhaus ${name}: ${w.top} ${r.name} nicht im Kern`, !r.punkte.some((p) => inPoly(p, k.punkte) && abstandRing(p, k.punkte) > 1) && !k.punkte.some((p) => inPoly(p, r.punkte) && abstandRing(p, r.punkte) > 1))
        }
      }
      wahr(`wohnhaus ${name}: ${w.top} Eingang`, Array.isArray(w.eingang))
      if (w.eingang) wahr(`wohnhaus ${name}: ${w.top} Eingang im Gang`, gaenge.some((a) => inPoly(w.eingang, a.punkte) || abstandRing(w.eingang, a.punkte) < 30))
      const namen = w.moebel.map((m) => m.name)
      wahr(`wohnhaus ${name}: ${w.top} Kueche (${namen.join(',')})`, namen.includes('Kuechenzeile'))
      wahr(`wohnhaus ${name}: ${w.top} Bad`, namen.includes('WC') || namen.includes('Waschbecken') || namen.includes('Badewanne') || namen.includes('Dusche'))
      wahr(`wohnhaus ${name}: ${w.top} Tuer`, w.oeffnungen.some((o) => o.art === 'tuer'))
      wahr(`wohnhaus ${name}: ${w.top} Fenster`, w.oeffnungen.some((o) => o.art === 'fenster'))
    }
  }
  return { e, h }
}
// Laubengang vor der Nordfassade, Kern am Ende (beides ausserhalb des Umrisses).
const laubengang = wohnhausFall(
  'Laubengang',
  rechteck(0, 0, 2400, 1150),
  [rechteck(-560, -440, 0, 0)],
  [rechteck(0, -160, 2400, 0)],
  4,
  90,
)
// Ohne Gang und Kern: der Generator legt Mittelgang und Stiege selbst an.
const ohne = wohnhausFall('ohne Gang', rechteck(0, 0, 2600, 1300), [], [], 3, 0)
// Siebeneck-artiger Umriss, Gang innen entlang.
wohnhausFall('schraeg', [[0, 0], [2200, 30], [2210, 1250], [0, 1240]], [], [], 2, 180)

/* siedlung3d.ts liest und baut das Ergebnis wie echte Plaene. */
for (const f of [ohne, laubengang]) {
  if (!f) continue
  const { e, h } = f
  const umrissM = e.umrissCm.map((p) => geschossZuSiedlung(h, p))
  const siedlung = {
    id: 's-erfunden',
    owner_id: 'u-erfunden',
    name: 'Erfundene Siedlung',
    lat: 0,
    lon: 0,
    gebaeude: [{ id: e.gebaeudeId, name: 'Haus Erfunden', umriss: umrissM, geschosse: e.geschosse, geschossHoehe: 3, stil: 'putz', dachGruen: false, pv: false, quelle: null }],
    wohnung: null,
    aussen: { spielplatz: null, tiefgarage: null, wege: [] },
    innen: [h],
    created_at: '',
    updated_at: '',
  }
  let w = null
  try {
    w = baueSiedlung({ siedlung, farben: F, wohnungRahmen: null })
  } catch (err) {
    wahr(`siedlung3d baut wohnhausInnen (${e.gebaeudeId}): ${err}`, false)
  }
  if (w) {
    const ids = w.ebenen.map((x) => x.id)
    for (let k = 1; k < e.geschosse; k++) wahr(`siedlung3d: Ebene ${e.gebaeudeId}:${k}`, ids.includes(`${e.gebaeudeId}:${k}`))
    // Kamera ins Haus: das Innere entsteht ohne Fehler.
    w.gruppe.updateMatrixWorld(true)
    const c = umrissM.reduce((s, p) => [s[0] + p[0] / umrissM.length, s[1] + p[1] / umrissM.length], [0, 0])
    const lage = w.gruppe.children.find((x) => x.name === 'siedlungLage')
    const p3 = new Vector3(c[0], 1.6, c[1])
    if (lage) p3.applyMatrix4(lage.matrixWorld)
    let schritte = 0
    try {
      w.kamera(p3.x, p3.y, p3.z)
      while (w.schritt(1 / 60, p3.y) && schritte < 3000) schritte++
    } catch (err) {
      wahr(`siedlung3d baut Inneres von ${e.gebaeudeId}: ${err}`, false)
    }
    const innen = []
    w.gruppe.traverse((o) => o instanceof Mesh && o.name.startsWith(`innen:${e.gebaeudeId}:`) && innen.push(o))
    wahr(`siedlung3d: Inneres von ${e.gebaeudeId} gebaut (${innen.length} Geschosse)`, innen.length >= 1)
    w.dispose()
  }
}

/* E87b: Kennungen der Dinge, Art am Ende, Bau aus der Kennung allein. */
{
  wahr('innenDingKennung', innenDingKennung('stadt:w7', 12, 'teddy') === 'stadt:w7:d12:teddy')
  wahr('innenDingArt: bekannte Art', innenDingArt('stadt:w7:d12:teddy') === 'teddy' && innenDingArt('stadt:a:b:d0:ball') === 'ball')
  wahr('innenDingArt: unbekannte Art, ohne Nummer, alte Form', innenDingArt('stadt:w7:d12:rakete') === null && innenDingArt('stadt:w7:dx:ball') === null && innenDingArt('stadt:w7:d3') === null && innenDingArt('') === null)
  const mat = new MeshLambertMaterial({ vertexColors: true })
  wahr('innenDingBauen: unbekannte Art gibt null', innenDingBauen('stadt:w7:d1:rakete', F, mat) === null && innenDingBauen('stadt:w7:d1', F, mat) === null)
  const a = innenDingBauen('stadt:w7:d1:tasse', F, mat)
  const b = innenDingBauen('stadt:w7:d1:tasse', F, mat)
  const c = innenDingBauen('stadt:w8:d1:tasse', F, mat)
  const farben = (x) => Array.from(x.objekt.geometry.getAttribute('color').array).join()
  wahr('innenDingBauen: gleiche Kennung, gleiches Ding', !!a && !!b && farben(a) === farben(b) && a.objekt.material === mat)
  wahr('innenDingBauen: Ursprung unten in der Mitte, Masse aus DING_MASSE', !!a && a.breite === 0.09 && a.tiefe === 0.09 && a.hoehe === 0.1 && (() => {
    a.objekt.geometry.computeBoundingBox()
    const bb = a.objekt.geometry.boundingBox
    return Math.abs(bb.min.y) < 1e-6 && Math.abs(bb.max.y - 0.1) < 0.01 && Math.abs(bb.min.x + bb.max.x) < 0.03
  })())
  // Farben haengen an der Kennung (viele Kennungen geben mehrere Farben).
  const viele = new Set()
  for (let i = 0; i < 40; i++) {
    const x = innenDingBauen(`stadt:w${i}:d0:ball`, F, mat)
    if (x) {
      viele.add(farben(x))
      x.objekt.geometry.dispose()
    }
  }
  wahr(`innenDingBauen: Farben je Kennung verschieden (${viele.size})`, viele.size >= 3)
  for (const x of [a, b, c]) x?.objekt.geometry.dispose()
  mat.dispose()
}

/* Kein langer Gedankenstrich und keine Testhaken in den neuen Dateien. */
for (const p of ['src/lib/innenGenerator.ts', 'src/lib/innenWerker.ts', 'src/components/plan3d/innen3d.ts', 'scripts/innen-pruefen.mjs']) {
  const t = readFileSync(new URL('../' + p, import.meta.url), 'utf8')
  wahr(`${p}: kein langer Gedankenstrich`, !t.includes(String.fromCharCode(0x2014)))
  wahr(`${p}: keine Testhaken`, !t.includes('DEBUG' + '-ANFANG') && !t.includes('__' + 'debug'))
}

/* Ausgabe. */
const k = kennzahlen
const proArt = new Map()
for (const x of k) {
  const art = x.name.split('-')[0]
  const a = proArt.get(art) ?? { tri: 0, auf: 0, bau: [], plan: [] }
  a.tri = Math.max(a.tri, x.tri)
  a.auf = Math.max(a.auf, x.auf)
  a.bau.push(x.tBau)
  a.plan.push(x.tPlan)
  proArt.set(art, a)
}
if (fehler) {
  for (const [m, n] of meldungen) if (n > 3) console.log(`(${n} mal) ${m}`)
  console.log(`${fehler} Abweichung(en)`)
  process.exit(1)
}
const raeume = k.reduce((s, x) => s + x.raeume, 0)
const glas = k.reduce((s, x) => s + x.glas, 0)
console.log(`ok (${k.length} Haeuser, ${raeume} Raeume alle erreichbar, ${glas} Fenster per Strahl geprueft)`)
for (const [art, a] of proArt) console.log(`  ${art.padEnd(16)} hoechstens ${String(a.tri).padStart(6)} Dreiecke, ${String(a.auf).padStart(2)} Aufrufe`)
for (const m of [wohn, mall, spital]) console.log(`  ${m.name}: Plan ${m.plan.toFixed(1)} ms, Bau ${m.bau.toFixed(1)} ms, ${m.tri} Dreiecke, ${m.auf} Aufrufe`)
