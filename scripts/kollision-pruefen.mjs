// Prueft die Zusammenstoesse beim Begehen (src/components/plan3d/kollision.ts)
// ohne Browser und ohne three: Kreis aus Rechteck herausdruecken (auch
// gedreht und mit der Mitte darin), an einer schraegen Wand entlang
// gleiten ohne stehenzubleiben, rennend nicht durch eine 12-cm-Wand,
// Ecken, enge Stellen, Tueren (an, aus, gedreht) und das Raster.
// Aufruf im Projektordner: node scripts/kollision-pruefen.mjs
// Ausgabe "ok" oder die abweichenden Faelle, Exit 1 bei Fehlern.
import { Hindernisse, KOERPER_RADIUS_M, TEILSCHRITT_M } from '../src/components/plan3d/kollision.ts'

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

const R = KOERPER_RADIUS_M
nahe('Radius 23 cm', R, 0.23)
wahr('Teilschritt kuerzer als halber Koerper', TEILSCHRITT_M < R / 2)

/** Ein Frame Gehen wie im Motor: Geschwindigkeit mal dt, dt hoechstens 0,1. */
function gehen(h, p, vx, vz, dt, bilder) {
  for (let i = 0; i < bilder; i++) h.bewegen(p, vx * dt, vz * dt, R)
}

/* ------------------------------------------------ Herausdruecken */
{
  const h = new Hindernisse()
  h.dazu(0, 0, 1, 1, 0)
  h.rastern()
  const p = { x: 0.6, z: 0 }
  wahr('ueberlappt vorher', h.tiefe(0, p.x, p.z, R) > 0)
  nahe('Tiefe 13 cm', h.tiefe(0, p.x, p.z, R), 0.13)
  h.herausdruecken(p, R)
  nahe('nach rechts hinaus', p.x, 0.5 + R, 1e-3)
  nahe('quer bleibt', p.z, 0, 1e-9)
  wahr('danach frei', h.frei(p.x, p.z, R))
  // Mitte im Rechteck: zur naechsten Kante (rechts, 10 cm) hinaus.
  const q = { x: 0.4, z: 0.05 }
  h.herausdruecken(q, R)
  nahe('Mitte drin: rechts hinaus', q.x, 0.5 + R, 1e-3)
  nahe('Mitte drin: z bleibt', q.z, 0.05, 1e-9)
  // An der Ecke: schraeg hinaus, Abstand zur Ecke = Radius.
  const e = { x: 0.6, z: 0.6 }
  h.herausdruecken(e, R)
  nahe('Ecke: Abstand zur Ecke', Math.hypot(e.x - 0.5, e.z - 0.5), R, 1e-3)
  nahe('Ecke: schraeg 45 Grad', e.x, e.z, 1e-9)
  // Weit weg: nichts passiert.
  const w = { x: 3, z: 3 }
  h.herausdruecken(w, R)
  wahr('weit weg bleibt', w.x === 3 && w.z === 3)
}

/* Gedrehtes Rechteck (drehY 30 Grad): Abstand zur Flaeche danach = Radius. */
{
  const h = new Hindernisse()
  const d = (30 * Math.PI) / 180
  h.dazu(2, 1, 2, 0.12, d)
  h.rastern()
  // Normale der langen Seite: Tiefe-Achse (sin d, cos d).
  const nx = Math.sin(d)
  const nz = Math.cos(d)
  const p = { x: 2 + nx * 0.15, z: 1 + nz * 0.15 }
  h.herausdruecken(p, R)
  const abstand = (p.x - 2) * nx + (p.z - 1) * nz
  nahe('gedreht: Abstand zur Mitte = halbe Dicke + Radius', abstand, 0.06 + R, 1e-3)
  const laengs = (p.x - 2) * Math.cos(d) - (p.z - 1) * Math.sin(d)
  nahe('gedreht: laengs bleibt', laengs, 0, 1e-6)
}

/* ------------------------------------------- Gleiten an schraeger Wand */
{
  const h = new Hindernisse()
  // Wand 8 m lang, 12 cm dick, 30 Grad gedreht, Mitte im Ursprung.
  const d = (30 * Math.PI) / 180
  h.dazu(0, 0, 8, 0.12, d)
  h.rastern()
  const ux = Math.cos(d)
  const uz = -Math.sin(d)
  const nx = Math.sin(d)
  const nz = Math.cos(d)
  // Start vor der Wand (Normalseite), laengs bei -2 m.
  const p = { x: ux * -2 + nx * 0.5, z: uz * -2 + nz * 0.5 }
  // Gehen schraeg in die Wand: 60 % laengs, 80 % hinein, 1,4 m/s.
  const vx = (0.6 * ux - 0.8 * nx) * 1.4
  const vz = (0.6 * uz - 0.8 * nz) * 1.4
  let stand = (p.x * ux + p.z * uz)
  let stillstand = 0
  let tiefsteDurch = Infinity
  for (let i = 0; i < 120; i++) {
    h.bewegen(p, vx / 60, vz / 60, R)
    const jetzt = p.x * ux + p.z * uz
    if (jetzt - stand < 1e-5) stillstand++
    stand = jetzt
    tiefsteDurch = Math.min(tiefsteDurch, p.x * nx + p.z * nz)
  }
  wahr('gleitet ohne stehenzubleiben', stillstand === 0)
  // 2 s mal 1,4 m/s mal 0,6 laengs = 1,68 m; der Anlauf bis zur Wand zaehlt mit.
  nahe('laengs weit genug geglitten', stand - -2, 1.68, 0.02)
  wahr('nie in der Wand', tiefsteDurch >= 0.06 + R - 1e-3)
  wahr('frei am Ende', h.frei(p.x, p.z, R))
}

/* --------------------------------------------- Kein Durchrutschen */
{
  const h = new Hindernisse()
  // 12 cm dick (entlang x), 10 m lang (entlang z): laenge 0,12, tiefe 10.
  h.dazu(0, 0, 0.12, 10, 0)
  h.rastern()
  for (const start of [-0.3, -0.5, -1.0]) {
    const p = { x: start, z: 0.3 }
    let maxX = -Infinity
    // Rennen 2,8 m/s, dt 0,1 (Obergrenze im Motor), 30 Bilder.
    for (let i = 0; i < 30; i++) {
      h.bewegen(p, 2.8 * 0.1, 0, R)
      maxX = Math.max(maxX, p.x)
    }
    wahr(`rennt nicht durch die Wand (Start ${start})`, maxX <= -0.06 - R + 1e-3)
    nahe(`steht an der Wand (Start ${start})`, p.x, -0.06 - R, 2e-3)
  }
  // Auch ein Riesenschritt (1 m in einem Bild) bleibt davor.
  const p = { x: -0.5, z: 0 }
  h.bewegen(p, 1, 0, R)
  wahr('Riesenschritt bleibt davor', p.x < -0.06)
  // Und von der anderen Seite.
  const q = { x: 0.6, z: 0 }
  gehen(h, q, -2.8, 0, 0.1, 20)
  wahr('von rechts bleibt rechts', q.x >= 0.06 + R - 1e-3)
}

/* ------------------------------------------------ Ecke und Enge */
{
  const h = new Hindernisse()
  // Innenecke: Wand entlang x bei z = 0 und entlang z bei x = 0.
  h.dazu(2, -0.06, 4, 0.12, 0)
  h.dazu(-0.06, 2, 0.12, 4, 0)
  h.rastern()
  const p = { x: 1, z: 1 }
  gehen(h, p, -1.4, -1.4, 1 / 60, 120)
  nahe('Ecke: x an der Wand', p.x, R, 2e-3)
  nahe('Ecke: z an der Wand', p.z, R, 2e-3)
  const vorher = { x: p.x, z: p.z }
  gehen(h, p, -1.4, -1.4, 1 / 60, 30)
  wahr('Ecke: zittert nicht', Math.hypot(p.x - vorher.x, p.z - vorher.z) < 1e-3)
  // Aus der Ecke laengs der Wand hinaus geht es weiter.
  gehen(h, p, 1.4, -0.5, 1 / 60, 60)
  wahr('aus der Ecke heraus', p.x > 1.3)
}
{
  // Zwei Moebel 40 cm auseinander: zu eng fuer 46 cm Schulterbreite.
  const h = new Hindernisse()
  h.dazu(-0.7, 0, 1, 2, 0)
  h.dazu(0.7, 0, 1, 2, 0)
  h.rastern()
  const p = { x: 0, z: 2 }
  gehen(h, p, 0, -1.4, 1 / 60, 120)
  wahr('zu eng: bleibt vor der Luecke', p.z > 1 + 0.1)
  // Wer schon drinsteckt (Start), kommt wieder heraus.
  const q = { x: 0, z: 0 }
  gehen(h, q, 0, 1.4, 1 / 60, 120)
  wahr('festgesteckt: kommt heraus', q.z > 1)
}
{
  // 60 cm Luecke: man passt durch.
  const h = new Hindernisse()
  h.dazu(-0.8, 0, 1, 2, 0)
  h.dazu(0.8, 0, 1, 2, 0)
  h.rastern()
  const p = { x: 0.05, z: 2 }
  gehen(h, p, 0, -1.4, 1 / 60, 240)
  wahr('60 cm: durch', p.z < -1.2)
}

/* ------------------------------------------------------- Tueren */
{
  const h = new Hindernisse()
  // Wand mit 90 cm Oeffnung bei x 0..0.9, Wand entlang x bei z = 0.
  h.dazu(-2, 0, 4, 0.12, 0)
  h.dazu(2.9, 0, 4, 0.12, 0)
  // Tuerblatt zu: Angel bei (0, 0), 0,9 m lang entlang x, 4 cm dick.
  const angel = [0, 0]
  const laenge = 0.9
  const tuer = h.dazu(angel[0] + laenge / 2, angel[1], laenge, 0.04, 0, true)
  const reich = laenge + 0.03
  h.bereich(tuer, angel[0] - reich, angel[1] - reich, angel[0] + reich, angel[1] + reich)
  h.rastern()
  const p = { x: 0.45, z: 1 }
  gehen(h, p, 0, -1.4, 1 / 60, 120)
  wahr('Tuer zu: haelt auf', p.z >= 0.02 + R - 2e-3)
  // Tuer auf: Rechtecks aus. Jetzt geht man durch.
  h.aktiv(tuer, false)
  gehen(h, p, 0, -1.4, 1 / 60, 120)
  wahr('Tuer offen (aus): durch', p.z < -1)
  // Tuer um 90 Grad aufgedreht und wieder an: liegt jetzt quer (entlang z)
  // in der Oeffnung an der Angel; die Abfrage findet sie in der neuen Lage.
  const w = Math.PI / 2
  h.lage(tuer, angel[0] + (Math.cos(w) * laenge) / 2, angel[1] - (Math.sin(w) * laenge) / 2, w)
  h.aktiv(tuer, true)
  nahe('gedrehte Tuer: Mitte z', h.mz[tuer], -0.45, 1e-9)
  const n = h.abfrage(-0.1, -0.5, 0.1, -0.4)
  let gefunden = false
  for (let i = 0; i < n; i++) if (h.treffer[i] === tuer) gefunden = true
  wahr('Raster findet die gedrehte Tuer', gefunden)
  wahr('neben der offenen Tuer nicht frei', !h.frei(0.1, -0.45, R))
  wahr('in der Mitte der Oeffnung frei', h.frei(0.6, 0.4, R) && h.frei(0.6, -0.4, R) === true)
  // Zugehende Tuer schiebt einen hinaus.
  h.lage(tuer, angel[0] + laenge / 2, angel[1], 0)
  const q = { x: 0.5, z: 0.01 }
  h.herausdruecken(q, R)
  wahr('zugehende Tuer schiebt hinaus', Math.abs(q.z) >= 0.02 + R - 1e-3)
}

/* ------------------------------------------------------- Raster */
{
  // Zufall mit festem Samen, damit jeder Lauf gleich ist.
  let s = 12345
  const zufall = () => {
    s = (s * 1103515245 + 12345) % 2147483648
    return s / 2147483648
  }
  for (const zelle of [0.5, 1, 2.5]) {
    const h = new Hindernisse(zelle)
    const n = 300
    for (let i = 0; i < n; i++) {
      h.dazu(zufall() * 30 - 15, zufall() * 30 - 15, 0.05 + zufall() * 5, 0.05 + zufall() * 1.5, zufall() * 7 - 3.5, zufall() > 0.2)
    }
    h.rastern()
    wahr(`Raster ${zelle}: Groesse`, h.groesse === n)
    let fehlend = 0
    let doppelt = 0
    let zuviel = 0
    for (let a = 0; a < 200; a++) {
      const x0 = zufall() * 34 - 17
      const z0 = zufall() * 34 - 17
      const x1 = x0 + zufall() * 4
      const z1 = z0 + zufall() * 4
      const k = h.abfrage(x0, z0, x1, z1)
      const set = new Set()
      for (let i = 0; i < k; i++) {
        if (set.has(h.treffer[i])) doppelt++
        set.add(h.treffer[i])
      }
      for (let i = 0; i < n; i++) {
        const soll = !(h.bx1[i] < x0 || h.bx0[i] > x1 || h.bz1[i] < z0 || h.bz0[i] > z1)
        if (soll && !set.has(i)) fehlend++
        if (!soll && set.has(i)) zuviel++
      }
      // frei() stimmt mit der Pruefung aller Rechtecke ueberein.
      const px = (x0 + x1) / 2
      const pz = (z0 + z1) / 2
      let alle = true
      for (let i = 0; i < n; i++) if (h.an[i] && h.tiefe(i, px, pz, R) > 0.002) alle = false
      if (alle !== h.frei(px, pz, R)) fehlend++
    }
    wahr(`Raster ${zelle}: nichts fehlt`, fehlend === 0)
    wahr(`Raster ${zelle}: nichts doppelt`, doppelt === 0)
    wahr(`Raster ${zelle}: nichts zu viel`, zuviel === 0)
  }
  // Leere Szene: keine Treffer, alles frei, Gehen geht.
  const leer = new Hindernisse()
  leer.rastern()
  wahr('leer: keine Treffer', leer.abfrage(-1, -1, 1, 1) === 0)
  wahr('leer: frei', leer.frei(0, 0, R))
  const p = { x: 0, z: 0 }
  leer.bewegen(p, 0.5, 0, R)
  nahe('leer: geht', p.x, 0.5, 1e-9)
  leer.leeren()
  wahr('geleert: Groesse 0', leer.groesse === 0)
}

/* Zahlen: kein NaN bei Nullschritt und Nullrechteck. */
{
  const h = new Hindernisse()
  h.dazu(0, 0, 0, 0, 0)
  h.rastern()
  const p = { x: 0, z: 0 }
  h.bewegen(p, 0, 0, R)
  h.herausdruecken(p, R)
  wahr('Nullfall ohne NaN', Number.isFinite(p.x) && Number.isFinite(p.z))
}

if (fehler) {
  console.log(`${fehler} Abweichungen`)
  process.exit(1)
}
console.log('ok')
