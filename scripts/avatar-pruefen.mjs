// Prueft die Figuren der 3D-Wohnung (E82) ohne Browser:
//  - pruefeLook nimmt die Standardfiguren von 50 Kennungen an und lehnt
//    kaputte Looks ab (falsche Farbe, fremder Schluessel, Groesse ausserhalb,
//    falsche Auswahl),
//  - pruefeLook und avatar3d_gueltig (Migration 0043) haben dieselben
//    Schluessel, Auswahlen, Farbregel und Groessengrenzen,
//  - poseVerpacken und poseLesen (Kanal der Wohnung) runden sauber und
//    lehnen Unsinn ab; seit E87 reicht die Stellung fuer einen ganzen
//    Stadtteil (x und z bis 10 km, Augen zwischen -1 km und +1 km),
//    weiter draussen wird auf die Grenze gesetzt,
//  - baueFigur baut jede Frisur, jede Haltung laeuft, unter 3000 Dreiecken,
//    die Augen liegen dort, wo auge() es sagt, dispose gibt alles frei.
// Aufruf im Projektordner: node scripts/avatar-pruefen.mjs
// Ausgabe "ok" oder die abweichenden Faelle, Exit 1 bei Fehlern.
// Node entfernt die Typen der .ts-Dateien selbst; three laeuft ohne
// Browser, nur das Namensschild (Zeichenflaeche) entfaellt.
import fs from 'node:fs'
import { Mesh, Vector3 } from 'three'
import {
  FARBEN,
  GROESSE_MAX,
  GROESSE_MIN,
  HAARFORMEN,
  STATUREN,
  gleicherLook,
  poseLesen,
  poseVerpacken,
  pruefeLook,
  standardLook,
} from '../src/lib/avatar.ts'
import { baueFigur } from '../src/components/plan3d/avatar3d.ts'

let fehler = 0
function gleich(name, ist, soll) {
  const a = JSON.stringify(ist)
  const b = JSON.stringify(soll)
  if (a !== b) {
    console.log('ABWEICHUNG', name, 'ist', a, 'soll', b)
    fehler++
  }
}
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

// ------------------------------------------------------------ Looks
// Feste Kennungen, damit jeder Lauf dasselbe prueft.
const uids = Array.from({ length: 50 }, (_, i) => {
  const h = (i * 2654435761 + 12345).toString(16).padStart(12, '0').slice(-12)
  return `${(i * 97 + 4096).toString(16).padStart(8, '0')}-1234-4abc-8def-${h}`
})
const formen = new Set()
for (const uid of uids) {
  const look = standardLook(uid)
  gleich(`standardLook fest ${uid}`, standardLook(uid), look)
  gleich(`pruefeLook nimmt Standard ${uid}`, pruefeLook(look), look)
  formen.add(look.haarform)
  wahr(`Hose ungleich Oberteil ${uid}`, look.oben !== look.unten)
  for (const k of ['oben', 'unten', 'schuhe']) wahr(`${k} aus der Palette ${uid}`, FARBEN.kleidung.includes(look[k]))
  wahr(`Haut aus der Palette ${uid}`, FARBEN.haut.includes(look.haut))
  wahr(`Haare aus der Palette ${uid}`, FARBEN.haare.includes(look.haare))
}
wahr('mindestens drei Frisuren unter 50 Standardfiguren', formen.size >= 3)
gleich('Palettengroessen', [FARBEN.haut.length, FARBEN.haare.length, FARBEN.kleidung.length], [6, 6, 10])

const gut = { v: 1, haut: '#E9BF9D', haare: '#2a2522', haarform: 'lang', oben: '#4f6d8f', unten: '#2f3b4c', schuhe: '#6b6f73' }
gleich('ohne freiwillige Felder', pruefeLook(gut), { ...gut, haut: '#e9bf9d' })
gleich('mit allen Feldern', pruefeLook({ ...gut, groesse_cm: 140, statur: 'breit', brille: true })?.groesse_cm, 140)
gleich('Groesse 210', pruefeLook({ ...gut, groesse_cm: 210 })?.groesse_cm, 210)
gleich('Groesse mit Komma', pruefeLook({ ...gut, groesse_cm: 172.5 })?.groesse_cm, 172.5)
gleich('undefined zaehlt als fehlend', pruefeLook({ ...gut, brille: undefined, fremd: undefined })?.brille, undefined)

const schlecht = {
  'Farbe zu kurz': { ...gut, haut: '#12345' },
  'Farbe zu lang': { ...gut, oben: '#1234567' },
  'Farbe als Name': { ...gut, unten: 'red' },
  'Farbe ohne Raute': { ...gut, schuhe: '123456' },
  'Farbe mit g': { ...gut, haare: '#gggggg' },
  'fremder Schluessel': { ...gut, name: 'Karam' },
  'Groesse 139': { ...gut, groesse_cm: 139 },
  'Groesse 211': { ...gut, groesse_cm: 211 },
  'Groesse als Text': { ...gut, groesse_cm: '175' },
  'Groesse NaN': { ...gut, groesse_cm: Number.NaN },
  'Groesse unendlich': { ...gut, groesse_cm: Number.POSITIVE_INFINITY },
  'Frisur unbekannt': { ...gut, haarform: 'mittel' },
  'Statur unbekannt': { ...gut, statur: 'dick' },
  'Statur null': { ...gut, statur: null },
  'Brille als Text': { ...gut, brille: 'ja' },
  'Brille null': { ...gut, brille: null },
  'Version 2': { ...gut, v: 2 },
  'Version als Text': { ...gut, v: '1' },
  'Pflichtfeld fehlt': { v: 1, haut: '#ffffff', haare: '#000000', haarform: 'kurz', oben: '#ffffff', unten: '#000000' },
  'Liste': [gut],
  'null': null,
  'Text': 'kurz',
}
for (const [name, x] of Object.entries(schlecht)) gleich(`lehnt ab: ${name}`, pruefeLook(x), null)

wahr('gleicherLook mit Standardwerten', gleicherLook(gut, { ...gut, haut: '#e9bf9d', groesse_cm: 175, statur: 'mittel', brille: false }))
wahr('gleicherLook merkt Brille', !gleicherLook(gut, { ...gut, brille: true }))

// ------------------------------------- dieselbe Regel in der Datenbank
const sql = fs.readFileSync('supabase/migrations/0043_avatar_und_wohnung_live.sql', 'utf8')
const liste = (re) => {
  const m = sql.match(re)
  return m ? [...m[1].matchAll(/'([a-z_0-9]+)'/g)].map((x) => x[1]).sort() : null
}
gleich('SQL Schluessel', liste(/k not in \(([^)]*)\)/), ['v', 'haut', 'haare', 'haarform', 'oben', 'unten', 'schuhe', 'groesse_cm', 'statur', 'brille'].sort())
gleich('SQL Frisuren', liste(/'haarform'\) in \(([^)]*)\)/), [...HAARFORMEN].sort())
gleich('SQL Staturen', liste(/'statur'\) in \(([^)]*)\)/), [...STATUREN].sort())
const grenzen = sql.match(/'groesse_cm'\)::numeric between (\d+) and (\d+)/)
gleich('SQL Groesse', grenzen ? [Number(grenzen[1]), Number(grenzen[2])] : null, [GROESSE_MIN, GROESSE_MAX])
gleich('SQL Farbregel fuenfmal, ohne Gross und Klein', (sql.match(/~\* '\^#\[0-9a-f\]\{6\}\$'/g) ?? []).length, 5)
wahr('SQL v = 1', sql.includes("a -> 'v' = '1'::jsonb"))
wahr('SQL 1024 Byte', sql.includes('octet_length(a::text) > 1024'))
wahr('SQL Check an profiles', /add constraint profiles_avatar3d_ok\s+check \(avatar3d is null or public\.avatar3d_gueltig\(avatar3d\)\)/.test(sql))
wahr('SQL EXECUTE fuer authenticated', sql.includes('grant execute on function public.avatar3d_gueltig(jsonb) to authenticated'))
wahr('kein langer Gedankenstrich in der Migration', !sql.includes(String.fromCharCode(0x2014)))

// ------------------------------------------------ Stellung im Kanal
const U = uids[0]
const G = uids[1]
const p = { x: 3.456, y: 1.64, z: -2.004, gier: Math.PI * 3 + 0.25, neigung: -0.3, haltung: 'sitz', tempo: 1.26 }
const nachricht = poseVerpacken(p, U, 7, G)
gleich('poseVerpacken', nachricht, { u: U, n: 7, g: G, x: 346, y: 164, z: -200, ga: -2892, ne: -300, h: 1, t: 13 })
const zurueck = poseLesen(nachricht)
gleich('poseLesen Kopf', [zurueck?.u, zurueck?.n, zurueck?.g], [U, 7, G])
gleich('poseLesen Stellung', zurueck?.pose, { x: 3.46, y: 1.64, z: -2, gier: -2.892, neigung: -0.3, haltung: 'sitz', tempo: 1.3 })
gleich('poseVerpacken Unsinn', poseVerpacken({ x: Number.NaN, y: 1e9, z: -1e9, gier: Infinity, neigung: 9, haltung: 'stehen', tempo: -1 }, U, 1, G), {
  u: U, n: 1, g: G, x: 0, y: 100000, z: -1000000, ga: 0, ne: 1571, h: 0, t: 0,
})
gleich('poseLesen klemmt', poseLesen({ ...nachricht, x: 500_000_000, t: 99, ga: -9000 })?.pose, { x: 10000, y: 1.64, z: -2, gier: -3.142, neigung: -0.3, haltung: 'sitz', tempo: 2 })
// E87: ein ganzer Stadtteil. 9,5 km vom Ursprung und Augen auf -80 m (Hang)
// oder +120 m (Hochhaus auf dem Huegel) kommen unveraendert an.
const weit = poseLesen(poseVerpacken({ x: 9500.25, y: -80.5, z: -9499.75, gier: 0, neigung: 0, haltung: 'stehen', tempo: 0 }, U, 2, G))?.pose
gleich('Stadtteil: 9,5 km und -80 m bleiben', [weit?.x, weit?.y, weit?.z], [9500.25, -80.5, -9499.75])
const hoch = poseLesen(poseVerpacken({ x: -1200, y: 120.4, z: 3000, gier: 0, neigung: 0, haltung: 'stehen', tempo: 0 }, U, 3, G))?.pose
gleich('Stadtteil: Augen auf 120 m bleiben', [hoch?.x, hoch?.y, hoch?.z], [-1200, 120.4, 3000])
gleich('Stadtteil: 10 km ist die Grenze', poseVerpacken({ x: 12_000, y: 2000, z: -12_000, gier: 0, neigung: 0, haltung: 'stehen', tempo: 0 }, U, 4, G).x, 1_000_000)
const kaputt = {
  'Kommazahl': { ...nachricht, x: 1.5 },
  'Text statt Zahl': { ...nachricht, y: '164' },
  'Haltung 3': { ...nachricht, h: 3 },
  'Nummer negativ': { ...nachricht, n: -1 },
  'Nummer zu gross': { ...nachricht, n: 2 ** 60 },
  'u keine Kennung': { ...nachricht, u: 'Karam' },
  'g fehlt': { ...nachricht, g: undefined },
  'unendlich': { ...nachricht, z: Infinity },
  'Liste': [nachricht],
}
for (const [name, x] of Object.entries(kaputt)) gleich(`poseLesen lehnt ab: ${name}`, poseLesen(x), null)

// ------------------------------------------------------------ Figuren
const welt = new Vector3()
function dreiecke(objekt) {
  let n = 0
  objekt.traverse((o) => {
    if (o instanceof Mesh) {
      const g = o.geometry
      n += g.index ? g.index.count / 3 : g.attributes.position.count / 3
    }
  })
  return n
}
function augenHoehe(f) {
  f.gruppe.updateMatrixWorld(true)
  const ys = []
  f.gruppe.traverse((o) => {
    if (o.name === 'auge') ys.push(o.getWorldPosition(welt).y)
  })
  return ys
}
function weltPunkt(f, name) {
  f.gruppe.updateMatrixWorld(true)
  let p = null
  f.gruppe.traverse((o) => {
    if (!p && o.name === name) p = o.getWorldPosition(new Vector3())
  })
  return p
}
function endlich(f) {
  f.gruppe.updateMatrixWorld(true)
  let ok = true
  f.gruppe.traverse((o) => {
    if (o.matrixWorld.elements.some((e) => !Number.isFinite(e))) ok = false
  })
  return ok
}

let meisteDreiecke = 0
for (const haarform of HAARFORMEN) {
  for (const brille of [false, true]) {
    for (const statur of STATUREN) {
      for (const groesse_cm of [140, 175, 210]) {
        const look = { ...standardLook('a'), haarform, brille, statur, groesse_cm }
        const name = `${haarform}/${brille ? 'Brille' : 'ohne'}/${statur}/${groesse_cm}`
        const f = baueFigur(look, 'Karam', '#4f6d8f')
        const h = groesse_cm / 100
        meisteDreiecke = Math.max(meisteDreiecke, dreiecke(f.gruppe))
        nahe(`auge stehen ${name}`, f.auge('stehen'), 0.935 * h)
        nahe(`auge sitz ${name}`, f.auge('sitz'), (0.78 * h) / 1.75)
        nahe(`auge liegen ${name}`, f.auge('liegen'), 0.2)
        for (const haltung of ['stehen', 'sitz', 'liegen']) {
          f.pose(haltung, 0, 0)
          const ys = augenHoehe(f)
          gleich(`zwei Augen ${name}`, ys.length, 2)
          for (const y of ys) nahe(`Augen bei auge(${haltung}) ${name}`, y, f.auge(haltung), 0.002)
          for (const tempo of [0, 0.5, 1, 2]) {
            for (const zeit of [0, 0.13, 0.5, 1.7, 1000.25]) {
              f.pose(haltung, tempo, zeit)
              wahr(`endlich ${haltung} ${tempo} ${zeit} ${name}`, endlich(f))
            }
          }
        }
        // Sitzen: Knie vor der Huefte (nach -z), Fuesse unter der Sitzflaeche.
        f.pose('sitz', 0, 0)
        const knie = weltPunkt(f, 'knie-l')
        wahr(`sitz Knie vorn ${name}`, knie && knie.z < -0.3 * h / 1.75 && Math.abs(knie.y) < 0.1)
        const schuhSitz = weltPunkt(f, 'schuh')
        wahr(`sitz Fuesse unten ${name}`, schuhSitz && schuhSitz.y < -0.3)
        // Liegen: Kopf ueber dem Ursprung, Fuesse nach -z, Gesicht oben.
        f.pose('liegen', 0, 0)
        const kopf = weltPunkt(f, 'kopfkugel')
        const schuhLiegen = weltPunkt(f, 'schuh')
        wahr(`liegen Kopf am Ursprung ${name}`, kopf && Math.abs(kopf.z) < 0.01 && Math.abs(kopf.x) < 0.01)
        wahr(`liegen Fuesse nach -z ${name}`, schuhLiegen && schuhLiegen.z < -1.3 * h / 1.75)
        const nase = weltPunkt(f, 'nase')
        wahr(`liegen Gesicht nach oben ${name}`, nase && kopf && nase.y > kopf.y + 0.08)
        // Stehen: Schuhsohle auf dem Boden, Gesicht nach -z.
        f.pose('stehen', 0, 0)
        const nase2 = weltPunkt(f, 'nase')
        const kopf2 = weltPunkt(f, 'kopfkugel')
        wahr(`stehen Gesicht nach -z ${name}`, nase2 && kopf2 && nase2.z < kopf2.z - 0.08)
        let tiefste = Infinity
        f.gruppe.updateMatrixWorld(true)
        f.gruppe.traverse((o) => {
          if (o.name === 'schuh') {
            o.geometry.computeBoundingBox()
            const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld)
            tiefste = Math.min(tiefste, b.min.y)
          }
        })
        nahe(`stehen Sohle am Boden ${name}`, tiefste, 0, 0.005)

        // dispose: jede Geometrie und jedes Material genau einmal frei.
        const geos = new Set()
        const mats = new Set()
        f.gruppe.traverse((o) => {
          if (o instanceof Mesh) {
            geos.add(o.geometry)
            mats.add(o.material)
          }
        })
        let freiG = 0
        let freiM = 0
        geos.forEach((g) => g.addEventListener('dispose', () => freiG++))
        mats.forEach((m) => m.addEventListener('dispose', () => freiM++))
        f.dispose()
        f.dispose()
        gleich(`dispose Geometrien ${name}`, freiG, geos.size)
        gleich(`dispose Materialien ${name}`, freiM, mats.size)
        gleich(`dispose leert die Gruppe ${name}`, f.gruppe.children.length, 0)
        f.pose('stehen', 1, 1) // nach dispose still ohne Wirkung
      }
    }
  }
}
wahr(`unter 3000 Dreiecken (hoechstens ${meisteDreiecke})`, meisteDreiecke < 3000)

// Ohne Look oder mit kaputtem Look: neutrale Figur, Oberteil in der Ersatzfarbe.
for (const [name, look] of [['ohne Look', null], ['kaputter Look', { v: 9 }]]) {
  const f = baueFigur(look, '', '#a8586b')
  let oben = null
  f.gruppe.traverse((o) => {
    if (o.name === 'rumpf') oben = '#' + o.material.color.getHexString()
  })
  wahr(`${name}: Figur gebaut`, dreiecke(f.gruppe) > 500)
  nahe(`${name}: 1,75 m`, f.auge('stehen'), 0.935 * 1.75)
  gleich(`${name}: Oberteil in Ersatzfarbe`, oben, '#a8586b')
  f.dispose()
}
const fremd = baueFigur(null, 'x', 'rot')
let obenFremd = null
fremd.gruppe.traverse((o) => {
  if (o.name === 'rumpf') obenFremd = '#' + o.material.color.getHexString()
})
gleich('kaputte Ersatzfarbe gibt Blau', obenFremd, '#4f6d8f')
fremd.dispose()

console.log(fehler ? `Fehler: ${fehler}` : `ok (hoechstens ${meisteDreiecke} Dreiecke je Figur)`)
process.exit(fehler ? 1 : 0)
