/* Deko und Spielzeug in 3D (E82) und die kleinen Bausteine, aus denen
 * auch moebel3d.ts seine Moebel baut.
 *
 * Deko: Spielzeugkiste, Kuscheltier, Bausteine, Spielkueche (wie DUKTIG),
 * Buecher, Bild, Kissen, Wolldecke, Korb, Vorhang, Obstschale und
 * Blumenkasten. Alles rund, in echten Groessen innerhalb von B x T x H,
 * in der eigenen Farbe des Objekts oder in einem ruhigen Token-Ton.
 * E91 fuer Bad und WC: Handtuecher an Stange oder Haken, Handtuchstapel,
 * Becher mit Zahnbuersten und Seifenspender, Seifenschale, Kerzen mit
 * leise gluehender Flamme, Duftstaebchen, Wannenablage, Klopapierhalter,
 * Klobuerste, Bademantel und ein Wandregal aus Bambus.
 *
 * Lokale Koordinaten wie in moebel3d.ts (cm): x entlang der Breite B, y
 * entlang der Tiefe T (y = 0 an der Wand, vorne y = T), z nach oben ab
 * der Unterkante. Kleine Dinge (Kuscheltier, Bausteine, Buecher, Kissen,
 * Obstschale, Wolldecke, kleiner Korb) tragen an allen Teilen ding
 * 'ganz': man hebt sie als Ganzes auf.
 *
 * Die Bausteine (Quader, Rundung, Zylinder, Kegel, Kugel, Farbton) stehen
 * hier und nicht in moebel3d.ts, damit die beiden Dateien nicht im Kreis
 * voneinander abhaengen; moebel3d.ts reicht ton() weiter. */
import type { Objekt } from '../../lib/types'
import type { MoebelArt } from '../plan/moebelArt.ts'
import type { Front, MoebelFarben, Teil } from './moebel3d.ts'

/* ------------------------------------------------------------ Bausteine */

function rgb(hex: string): [number, number, number] | null {
  if (!hex || hex.length < 7) return null
  const n = parseInt(hex.slice(1, 7), 16)
  if (Number.isNaN(n)) return null
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function hex([r, g, b]: [number, number, number]): string {
  const k = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  return `#${((k(r) << 16) | (k(g) << 8) | k(b)).toString(16).padStart(6, '0')}`
}

/** Farbe heller (faktor > 1) oder dunkler (< 1). */
export function ton(farbe: string, faktor: number): string {
  const c = rgb(farbe)
  if (!c) return farbe
  const k = (v: number) => (faktor >= 1 ? v + (255 - v) * (faktor - 1) : v * faktor)
  return hex([k(c[0]), k(c[1]), k(c[2])])
}

/** Zwei Farben mischen: k = 0 ergibt a, k = 1 ergibt b (E82). */
export function misch(a: string, b: string, k: number): string {
  const x = rgb(a)
  const y = rgb(b)
  if (!x || !y) return a
  return hex([x[0] + (y[0] - x[0]) * k, x[1] + (y[1] - x[1]) * k, x[2] + (y[2] - x[2]) * k])
}

/** Ein Quader x0..x1, y0..y1, z0..z1 (cm). */
export const t = (x0: number, y0: number, x1: number, y1: number, z0: number, z1: number, farbe: string, deckkraft?: number): Teil => ({
  x0,
  y0,
  x1,
  y1,
  z0,
  z1,
  farbe,
  deckkraft,
})

/** Abgerundet, Radius in cm (E81). */
export const rd = (q: Teil, rund: number): Teil => ({ ...q, rund })
/** Als Zylinder im Quader des Teils (E81). oben > 1: oben weiter, der
 *  Quader ist dann der untere Kreis und oben ragt es um diesen Faktor
 *  hinaus (so wie three es zeichnet). */
export const zyl = (q: Teil, oben = 1, achse: 'hoch' | 'laengs' | 'quer' = 'hoch'): Teil => ({ ...q, form: { art: 'zylinder', oben, achse } })
/** Als Kugel im Quader des Teils (E81). */
export const kugel = (q: Teil): Teil => ({ ...q, form: { art: 'kugel' } })
/** Stehender runder Kegelstumpf um (cx, cy): unten und oben als Radius. */
export function kegel(cx: number, cy: number, unten: number, oben: number, z0: number, z1: number, farbe: string, deckkraft?: number): Teil {
  return zyl(t(cx - unten, cy - unten, cx + unten, cy + unten, z0, z1, farbe, deckkraft), oben / unten)
}
/** Alle Teile als ein Ding zum Aufheben (E82). */
export function alsDing(teile: Teil[], name: string): Teil[] {
  return teile.map((q) => ({ ...q, ding: name }))
}
/** Teile verschieben (cm). */
export function schieben(teile: Teil[], dx: number, dy: number, dz = 0): Teil[] {
  return teile.map((q) => ({ ...q, x0: q.x0 + dx, x1: q.x1 + dx, y0: q.y0 + dy, y1: q.y1 + dy, z0: q.z0 + dz, z1: q.z1 + dz }))
}

/** Zufall mit fester Saat: dasselbe Objekt sieht jedes Mal gleich aus. */
function zufall(saat: number): () => number {
  let s = Math.floor(Math.abs(saat * 7919)) % 2147483647 || 1
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

const tuerFront = (angel: 'min' | 'max', gruppe: number): Front => ({ art: 'tuer', angel, auf: 1, gruppe })
const griffFront = (gruppe: number): Front => ({ art: 'griff', gruppe })

/* ------------------------------------------------------------ Spielzeug */

/** Spielzeugkiste aus Holz (oder ein Stoffkorb): offen, schon voll, oben
 *  schauen zwei Baelle, ein Klotz und ein Holzauto heraus. Die Spielsachen
 *  kann man einzeln herausnehmen. */
function spielzeugkiste(B: number, T: number, H: number, eigen: string | null, stoffig: boolean, f: MoebelFarben): Teil[] {
  const farbe = eigen ?? (stoffig ? f.leinen : ton(f.holz, 1.12))
  const w = Math.min(stoffig ? 1.2 : 1.8, B / 8, T / 8)
  const r = stoffig ? 2.4 : 0.8
  const rand = H * 0.82
  const voll = Math.max(2, rand - 9)
  const out: Teil[] = [
    rd(t(0, 0, B, w, 0, rand, farbe), r),
    rd(t(0, T - w, B, T, 0, rand, farbe), r),
    rd(t(0, w, w, T - w, 0, rand, ton(farbe, 0.95)), r),
    rd(t(B - w, w, B, T - w, 0, rand, ton(farbe, 0.95)), r),
    // Darunter schon voll: man sieht nur, was obenauf liegt.
    t(w, w, B - w, T - w, 0, voll, ton(farbe, 0.6)),
  ]
  const innenB = B - 2 * w
  const innenT = T - 2 * w
  const frei = H - voll
  const d1 = Math.max(3, Math.min(16, innenB * 0.3, innenT * 0.8, frei))
  const d2 = d1 * 0.72
  const c = Math.max(2.5, Math.min(9, innenB * 0.16, innenT * 0.45, frei * 0.75))
  const mitteY = T / 2
  out.push({ ...kugel(t(w + 0.5, mitteY - d1 / 2, w + 0.5 + d1, mitteY + d1 / 2, voll, voll + d1, f.spielRot)), ding: 'ball-rot' })
  out.push({ ...kugel(t(B - w - 0.5 - d2, mitteY - d2 / 2, B - w - 0.5, mitteY + d2 / 2, voll, voll + d2, f.spielBlau)), ding: 'ball-blau' })
  // Klotz schraeg zwischen den Baellen, hinten.
  const kx = w + 0.5 + d1 + 1
  out.push({ ...rd(t(kx, w + 1.5, kx + c, w + 1.5 + c, voll, voll + c, f.spielGelb), c * 0.12), kipp: { laengs: 18 }, ding: 'klotz' })
  // Holzauto vorn, auf dem, was darunter liegt.
  const al = Math.max(5, Math.min(14, innenB * 0.3))
  const ab = al * 0.5
  const ax = Math.min(B - w - 0.5 - d2 - al - 0.5, kx + 1)
  const ay = Math.max(w + 0.5, T - w - 1 - ab)
  const az = voll + 5
  const rad = al * 0.24
  if (ax > w && innenT > ab + 1) {
    out.push(
      ...alsDing(
        [
          rd(t(ax, ay, ax + al, ay + ab, az, az + al * 0.26, ton(f.holz, 1.05)), al * 0.08),
          rd(t(ax + al * 0.3, ay + 0.5, ax + al * 0.72, ay + ab - 0.5, az + al * 0.26, az + al * 0.48, f.spielRot), al * 0.07),
          zyl(t(ax + al * 0.08, ay - 0.3, ax + al * 0.08 + rad, ay + ab + 0.3, az - rad * 0.55, az + rad * 0.45, f.schwarz), 1, 'quer'),
          zyl(t(ax + al * 0.92 - rad, ay - 0.3, ax + al * 0.92, ay + ab + 0.3, az - rad * 0.55, az + rad * 0.45, f.schwarz), 1, 'quer'),
        ],
        'auto',
      ),
    )
  }
  return out
}

/** Teddy, sitzend mit Blick nach vorn (+y): Koerper, heller Bauch, Kopf,
 *  Ohren, Schnauze, Nase, Augen, Arme, Beine nach vorn, Sohlen. */
function kuscheltier(B: number, T: number, H: number, eigen: string | null, f: MoebelFarben): Teil[] {
  const fell = eigen ?? misch(f.holz, f.pappe, 0.45)
  const hell = ton(fell, 1.4)
  const s = Math.max(4, Math.min(B, T / 0.75, H / 1.1))
  const cx = B / 2
  const y0 = (T - 0.75 * s) / 2
  const k = (xa: number, xb: number, ya: number, yb: number, za: number, zb: number, farbe: string): Teil =>
    kugel(t(cx + xa * s, y0 + ya * s, cx + xb * s, y0 + yb * s, za * s, zb * s, farbe))
  const paar = (xa: number, xb: number, ya: number, yb: number, za: number, zb: number, farbe: string): Teil[] => [
    k(xa, xb, ya, yb, za, zb, farbe),
    k(-xb, -xa, ya, yb, za, zb, farbe),
  ]
  return [
    k(-0.3, 0.3, 0.05, 0.6, 0.04, 0.62, fell),
    k(-0.18, 0.18, 0.4, 0.62, 0.12, 0.5, hell),
    k(-0.26, 0.26, 0.1, 0.56, 0.54, 1.02, fell),
    ...paar(0.14, 0.3, 0.24, 0.38, 0.9, 1.07, fell),
    k(-0.11, 0.11, 0.45, 0.63, 0.66, 0.82, hell),
    k(-0.04, 0.04, 0.6, 0.66, 0.76, 0.81, f.schwarz),
    ...paar(0.07, 0.12, 0.5, 0.555, 0.83, 0.88, f.schwarz),
    ...paar(0.2, 0.42, 0.24, 0.6, 0.24, 0.54, fell),
    ...paar(0.07, 0.3, 0.3, 0.75, 0, 0.24, fell),
    ...paar(0.1, 0.27, 0.71, 0.75, 0.03, 0.21, hell),
  ]
}

/** Ein kleiner Haufen Holzbausteine: Wuerfel, Walzen, ein Turm mit Dach
 *  und eine Bruecke, in gedaempften Spielfarben und Natur. */
function bausteine(B: number, T: number, H: number, f: MoebelFarben): Teil[] {
  // Gebaut in Einheiten u (Kantenlaenge eines Wuerfels) in 6 x 3.1 x 2.2 u.
  const u = Math.max(1, Math.min(6, B / 6, T / 3.1, H / 2.2))
  const ox = (B - 6 * u) / 2
  const oy = (T - 3.1 * u) / 2
  const natur = ton(f.holz, 1.18)
  const q = (xa: number, ya: number, xb: number, yb: number, za: number, zb: number, farbe: string): Teil =>
    t(ox + xa * u, oy + ya * u, ox + xb * u, oy + yb * u, za * u, zb * u, farbe)
  const r = u * 0.1
  return [
    rd(q(0.1, 0.2, 1.1, 1.2, 0, 1, f.spielRot), r),
    rd(q(1.3, 0.3, 2.3, 1.3, 0, 1, f.spielBlau), r),
    rd(q(0.25, 0.3, 1.05, 1.1, 1, 1.8, f.spielGelb), r),
    zyl(q(2.6, 0.4, 3.5, 1.3, 0, 1.2, f.spielGruen)),
    zyl(q(2.55, 0.35, 3.55, 1.35, 1.2, 2.2, f.spielRot), 0.04),
    rd(q(3.9, 0.3, 4.5, 1.3, 0, 1.4, natur), r),
    rd(q(5.3, 0.3, 5.9, 1.3, 0, 1.4, natur), r),
    rd(q(3.8, 0.3, 6, 1.3, 1.4, 1.9, f.spielBlau), r),
    rd(q(0.6, 2, 2.6, 2.8, 0, 0.8, natur), r),
    rd(q(3.2, 2.2, 4, 3, 0, 0.8, f.spielGruen), r),
    zyl(q(4.4, 2.4, 5.8, 3.1, 0, 0.7, f.spielGelb), 1, 'laengs'),
    rd(q(1.2, 2.05, 1.9, 2.75, 0.8, 1.5, f.spielRot), r),
  ]
}

/** Spielkueche wie IKEA DUKTIG (72 x 40 x 109): Unterbau auf Fuesschen,
 *  Arbeitsplatte aus Birke mit zwei Kochplatten und Becken mit Hahn, links
 *  ein Ofen mit Fenster, rechts ein Schrank, oben Rueckwand mit Regal,
 *  Knoepfen und Haube. Ofen- und Schranktuer gehen auf. */
function spielkueche(B: number, T: number, H: number, eigen: string | null, f: MoebelFarben, neueGruppe: () => number): Teil[] {
  const korpus = eigen ?? f.weiss
  const birke = ton(f.holz, 1.25)
  const hu = Math.min(54, H * 0.5)
  const d = Math.min(1.6, B / 20)
  const out: Teil[] = []
  for (const [x, y] of [
    [1, 1],
    [B - 4, 1],
    [1, T - 4],
    [B - 4, T - 4],
  ])
    out.push(zyl(t(x, y, x + 3, y + 3, 0, 4, birke)))
  const fach = (hu + 4) / 2
  out.push(
    rd(t(0, 0, d, T - 1.6, 4, hu - 2, korpus), 0.5),
    rd(t(B - d, 0, B, T - 1.6, 4, hu - 2, korpus), 0.5),
    t(d, 0, B - d, T - 1.6, 4, 5.6, korpus),
    t(d, 0, B - d, 1, 5.6, hu - 2, ton(korpus, 0.96)),
    t(B / 2 - 0.8, 1, B / 2 + 0.8, T - 1.6, 5.6, hu - 2, korpus),
    t(B / 2 + 0.8, 1, B - d, T - 3, fach - 0.8, fach + 0.8, korpus),
    rd(t(0, 0, B, T, hu - 2, hu, birke), 0.6),
  )
  // Ofen links mit Fenster und Griffleiste, Schrank rechts mit Knopf.
  const g1 = neueGruppe()
  out.push(
    { ...rd(t(d + 0.3, T - 1.6, B / 2 - 0.3, T - 0.2, 5, hu - 3, ton(korpus, 1.02)), 0.5), front: tuerFront('min', g1) },
    { ...rd(t(d + 4, T - 0.2, B / 2 - 4, T, 10, hu - 13, ton(f.schwarz, 1.4)), 0.6), front: griffFront(g1) },
    { ...rd(t(d + 6, T - 0.2, B / 2 - 6, T + 1.4, hu - 9, hu - 7, f.griff), 0.8), front: griffFront(g1) },
  )
  const g2 = neueGruppe()
  out.push(
    { ...rd(t(B / 2 + 0.3, T - 1.6, B - d - 0.3, T - 0.2, 5, hu - 3, ton(korpus, 1.02)), 0.5), front: tuerFront('max', g2) },
    { ...kugel(t(B / 2 + 2.5, T - 0.4, B / 2 + 5, T + 1.8, hu * 0.6, hu * 0.6 + 2.5, f.griff)), front: griffFront(g2) },
  )
  // Zwei Kochplatten links, Becken mit Hahn rechts.
  const dr = Math.min(13, B * 0.18, T * 0.6)
  for (const cx of [B * 0.15, B * 0.35]) {
    out.push(zyl(t(cx - dr / 2, T * 0.5 - dr / 2, cx + dr / 2, T * 0.5 + dr / 2, hu, hu + 0.4, f.schwarz)))
    out.push(zyl(t(cx - dr / 4, T * 0.5 - dr / 4, cx + dr / 4, T * 0.5 + dr / 4, hu + 0.4, hu + 0.5, ton(f.schwarz, 1.5))))
  }
  const sx = B * 0.72
  const sy = T * 0.55
  const sr = Math.min(B * 0.12, T * 0.3)
  out.push(
    { ...zyl(t(sx - sr, sy - sr * 0.8, sx + sr, sy + sr * 0.8, hu - 0.2, hu + 0.3, f.metall)), glanz: 0.8 },
    zyl(t(sx - sr * 0.78, sy - sr * 0.62, sx + sr * 0.78, sy + sr * 0.62, hu + 0.3, hu + 0.36, ton(f.metall, 0.62))),
    { ...zyl(t(sx - 1, 1.5, sx + 1, 3.5, hu, hu + 13, f.metall)), glanz: 0.8 },
    { ...zyl(t(sx - 0.8, 2.5, sx + 0.8, sy - sr * 0.3, hu + 11, hu + 12.6, f.metall), 1, 'quer'), glanz: 0.8 },
  )
  // Oben: Rueckwand mit Knoepfen, Seitenstaender, Regal und Haube.
  const ph = Math.min(T * 0.5, 20)
  const hs = hu + (H - 6 - hu) * 0.55
  out.push(
    rd(t(d, 0, B - d, 1.4, hu, H - 6, korpus), 0.4),
    rd(t(0, 0, d, ph, hu, H - 6, korpus), 0.5),
    rd(t(B - d, 0, B, ph, hu, H - 6, korpus), 0.5),
    rd(t(0, 0, B, ph, H - 6, H, korpus), 0.8),
    rd(t(d, 1.4, B - d, ph - 1, hs, hs + 1.6, birke), 0.4),
    ...[B * 0.15, B * 0.35].map((x) => zyl(t(x - 1.5, 1.4, x + 1.5, 3.2, hu + 5, hu + 8, f.metall), 1, 'quer')),
    kegel(B * 0.3, ph * 0.5, 2.4, 2.8, hs + 1.6, hs + 7.6, f.spielRot),
    { ...kegel(B * 0.62, ph * 0.5, 4, 4, hs + 1.6, hs + 6.6, f.metall), glanz: 0.7 },
  )
  return out
}

/* ------------------------------------------------------------ Wohnen */

/** Gedaempfte Buchfarben (oder Toene der eigenen Farbe). */
function buchFarben(eigen: string | null, f: MoebelFarben): string[] {
  if (eigen) return [eigen, ton(eigen, 0.8), ton(eigen, 1.25), ton(eigen, 0.65), ton(eigen, 1.4)]
  return [
    misch(f.spielRot, f.leinen, 0.45),
    misch(f.spielBlau, f.leinen, 0.4),
    misch(f.spielGruen, f.leinen, 0.45),
    misch(f.spielGelb, f.leinen, 0.35),
    misch(f.holzDunkel, f.leinen, 0.25),
    misch(f.schwarz, f.leinen, 0.3),
    misch(f.spielBlau, f.schwarz, 0.4),
  ]
}

/** Buecher: eine Reihe stehender (deutlich breiter als tief oder ueber
 *  45 cm breit) oder ein Stapel. */
function buecher(B: number, T: number, H: number, eigen: string | null, f: MoebelFarben): Teil[] {
  const zz = zufall(B * 7 + T * 13 + H * 17)
  const toene = buchFarben(eigen, f)
  const farbe = () => toene[Math.floor(zz() * toene.length) % toene.length]
  const out: Teil[] = []
  if (B >= 1.5 * T || B > 45) {
    let x = 0
    for (let i = 0; i < 18; i++) {
      const dick = Math.min(1.6 + zz() * 3, B)
      if (x + dick > B + 0.01) break
      const hoch = H * (0.72 + zz() * 0.28)
      const tief = T * (0.78 + zz() * 0.22)
      out.push(rd(t(x, T - tief, x + dick, T, 0, hoch, farbe()), 0.25))
      x += dick + 0.05
    }
  } else {
    let z = 0
    for (let i = 0; i < 9; i++) {
      const dick = Math.min(1.8 + zz() * 3.2, H)
      if (z + dick > H + 0.01) break
      const bw = B * (0.78 + zz() * 0.22)
      const bt = T * (0.8 + zz() * 0.2)
      const ox = (B - bw) * zz()
      const oy = (T - bt) * zz()
      out.push(rd(t(ox, oy, ox + bw, oy + bt, z, z + dick, farbe()), 0.3))
      z += dick + 0.02
    }
  }
  return out
}

/** Bild flach an der Wand (y = 0): Rahmen, Passepartout und ein ruhiges
 *  Motiv aus Himmel, Sonne und zwei Huegeln in gedaempften Toenen. */
function bild(B: number, T: number, H: number, eigen: string | null, f: MoebelFarben): Teil[] {
  const d = Math.max(1.2, Math.min(T, 3))
  const rahmen = eigen ?? ton(f.schwarz, 1.4)
  const fw = Math.max(0.8, Math.min(5, Math.min(B, H) * 0.06))
  const pm = Math.min(B, H) * 0.1
  const ix0 = fw + pm
  const ix1 = B - fw - pm
  const iz0 = fw + pm
  const iz1 = H - fw - pm
  const iw = ix1 - ix0
  const ih = iz1 - iz0
  const s = Math.min(iw, ih) * 0.2
  const huegelHinten = misch(f.gruen, f.leinen, 0.45)
  const huegelVorn = misch(f.spielGruen, f.leinen, 0.55)
  return [
    rd(t(0, 0, B, d - 1, 0, H, ton(rahmen, 0.85)), 0.3),
    rd(t(0, d - 1, B, d, H - fw, H, rahmen), 0.3),
    rd(t(0, d - 1, B, d, 0, fw, rahmen), 0.3),
    rd(t(0, d - 1, fw, d, fw, H - fw, rahmen), 0.3),
    rd(t(B - fw, d - 1, B, d, fw, H - fw, rahmen), 0.3),
    t(fw, d - 1, B - fw, d - 0.8, fw, H - fw, misch(f.weiss, f.leinen, 0.3)),
    t(ix0, d - 0.8, ix1, d - 0.7, iz0, iz1, misch(f.spielBlau, f.leinen, 0.72)),
    // Sonne vorn, ueber dem vorderen Huegel: nichts liegt in derselben Ebene.
    zyl(t(ix0 + iw * 0.62, d - 0.62, ix0 + iw * 0.62 + s, d - 0.58, iz0 + ih * 0.62, iz0 + ih * 0.62 + s, misch(f.spielGelb, f.leinen, 0.35)), 1, 'quer'),
    zyl(t(ix0, d - 0.7, ix0 + iw * 0.75, d - 0.66, iz0, iz0 + ih * 0.75, huegelHinten), 1, 'quer'),
    zyl(t(ix0 + iw * 0.35, d - 0.66, ix1, d - 0.62, iz0, iz0 + ih * 0.55, huegelVorn), 1, 'quer'),
    t(ix0, d - 0.66, ix1, d - 0.62, iz0, iz0 + ih * 0.28, huegelVorn),
  ]
}

/** Kissen: prall, an den Ecken flacher (Quader mit Bauch). Breiter als 60
 *  cm: zwei oder drei nebeneinander. Hoeher als tief: stehend. */
function kissen(B: number, T: number, H: number, eigen: string | null, f: MoebelFarben): Teil[] {
  const basis = eigen ?? f.leinen
  const n = B > 110 ? 3 : B > 60 ? 2 : 1
  const toene = [basis, ton(basis, 0.88), misch(basis, f.spielGelb, 0.35)]
  const w = B / n
  const stehend = H > T * 1.3
  const out: Teil[] = []
  for (let i = 0; i < n; i++) {
    const x0 = i * w + (n > 1 ? 0.5 : 0)
    const x1 = (i + 1) * w - (n > 1 ? 0.5 : 0)
    const b = x1 - x0
    const farbe = toene[i % toene.length]
    if (stehend) {
      const r = Math.min(b, T * 0.8, H) * 0.45
      out.push(rd(t(x0, T * 0.1, x1, T * 0.9, 0, H, farbe), r), kugel(t(x0 + b * 0.12, 0, x1 - b * 0.12, T, H * 0.1, H * 0.92, farbe)))
    } else {
      const r = Math.min(b, T, H * 0.8) * 0.45
      out.push(rd(t(x0, 0.5, x1, T - 0.5, 0, H * 0.8, farbe), r), kugel(t(x0 + b * 0.12, T * 0.12, x1 - b * 0.12, T * 0.88, H * 0.05, H, farbe)))
    }
  }
  return out
}

/** Gefaltete Wolldecke: weiche Lagen leicht versetzt, Fransen an der
 *  kurzen Seite. */
function wolldecke(B: number, T: number, H: number, eigen: string | null, f: MoebelFarben): Teil[] {
  const farbe = eigen ?? misch(f.leinen, f.holzDunkel, 0.18)
  const n = Math.max(2, Math.min(4, Math.round(H / 2.5)))
  const h = H / n
  const fr = Math.min(3, B * 0.08)
  const out: Teil[] = []
  for (let i = 0; i < n; i++) {
    const ein = i * 0.6
    out.push(rd(t(fr + ein * 0.5, ein * 0.6, B - ein, T - ein * 0.3, i * h, (i + 1) * h, i % 2 ? ton(farbe, 0.92) : farbe), h * 0.48))
  }
  const k = Math.max(3, Math.min(8, Math.round(T / 5)))
  for (let j = 0; j < k; j++) {
    const y = (T * (j + 0.5)) / k
    out.push(rd(t(0, y - 0.6, fr + 1, y + 0.6, 0, Math.min(1.2, h), ton(farbe, 1.12)), 0.3))
  }
  return out
}

/** Geflochtener Korb (Seegras, Jute): rund und unten schmaler oder als
 *  runder Kasten, mit Rand und zwei dunkleren Flechtbaendern; darin eine
 *  eingerollte Decke. Mit "Deckel" im Namen geschlossen (flacher Deckel
 *  mit Griff), ein Waeschekorb und ein kleiner Korb (unter 30 cm) ohne
 *  Decke (E92). */
function korb(B: number, T: number, H: number, name: string, eigen: string | null, f: MoebelFarben): Teil[] {
  const farbe = eigen ?? misch(f.pappe, f.leinen, 0.35)
  const dunkel = ton(farbe, 0.78)
  const innen = ton(farbe, 0.5)
  const decke = misch(f.spielRot, f.leinen, 0.5)
  const n = name.toLowerCase()
  const deckel = /deckel|غطاء/.test(n)
  const ohneDecke = deckel || /wäsche|waesche|غسيل/.test(n) || Math.min(B, T) < 30
  const rolle = !ohneDecke && H >= 20 && Math.min(B, T) >= 20
  // Deckel und Griff oben im Kasten, der Korb darunter entsprechend niedriger.
  const dh = deckel ? Math.max(0.3, Math.min(2.5, H * 0.06)) : 0
  const gh = deckel ? Math.max(0.3, Math.min(2.5, H * 0.05)) : 0
  const hk = rolle ? H * 0.8 : H - dh - gh
  const rund = Math.abs(B - T) <= 0.15 * Math.max(B, T)
  const out: Teil[] = []
  if (rund) {
    // Unten schmaler; der Rand oben steht etwas ueber und fuellt B x T.
    const oben = 1.12
    const rand = 1.025
    const rx = B / 2 / oben / rand
    const ry = T / 2 / oben / rand
    const cx = B / 2
    const cy = T / 2
    // Ein Band um den Korb, so weit wie der Korb an seiner Oberkante.
    const ring = (z: number, h: number, faktor: number, farbe: string): Teil => {
      const k = 1 + ((oben - 1) * Math.min(hk, z + h)) / hk
      return zyl(t(cx - rx * k * faktor, cy - ry * k * faktor, cx + rx * k * faktor, cy + ry * k * faktor, z, z + h, farbe))
    }
    out.push(
      zyl(t(cx - rx, cy - ry, cx + rx, cy + ry, 0, hk, farbe), oben),
      ring(hk - 2.5, 2.5, rand, dunkel),
      ring(hk * 0.3, 1.2, 1.015, dunkel),
      ring(hk * 0.62, 1.2, 1.015, dunkel),
    )
    if (deckel) {
      // So weit wie der Rand, darauf ein runder Knauf.
      out.push(
        zyl(t(cx - B * 0.495, cy - T * 0.495, cx + B * 0.495, cy + T * 0.495, hk, hk + dh, farbe)),
        zyl(t(cx - B * 0.47, cy - T * 0.47, cx + B * 0.47, cy + T * 0.47, hk + dh, hk + dh + 0.06, dunkel)),
        zyl(t(cx - 2.2, cy - 2.2, cx + 2.2, cy + 2.2, hk + dh, H, dunkel), 0.8),
      )
    } else {
      out.push(zyl(t(cx - B * 0.44, cy - T * 0.44, cx + B * 0.44, cy + T * 0.44, hk, hk + 0.15, innen)))
    }
    if (rolle) out.push(zyl(t(cx - B * 0.2, cy - T * 0.2, cx + B * 0.2, cy + T * 0.2, hk * 0.4, H, decke)))
  } else {
    out.push(
      rd(t(0.4, 0.4, B - 0.4, T - 0.4, 0, hk, farbe), 3),
      rd(t(0, 0, B, T, hk - 2.5, hk, dunkel), 1.2),
      rd(t(0, 0, B, T, hk * 0.3, hk * 0.3 + 1.2, dunkel), 0.6),
      rd(t(0, 0, B, T, hk * 0.62, hk * 0.62 + 1.2, dunkel), 0.6),
      rd(t(0, T * 0.36, 0.5, T * 0.64, hk * 0.68, hk * 0.84, innen), 0.2),
      rd(t(B - 0.5, T * 0.36, B, T * 0.64, hk * 0.68, hk * 0.84, innen), 0.2),
    )
    if (deckel) {
      // Flacher Deckel mit einem Griff quer in der Mitte.
      out.push(
        rd(t(0, 0, B, T, hk, hk + dh, farbe), Math.min(1, dh * 0.4)),
        rd(t(B * 0.38, T / 2 - 1, B * 0.62, T / 2 + 1, hk + dh, H, dunkel), Math.min(0.4, gh * 0.3)),
      )
    } else {
      out.push(t(2, 2, B - 2, T - 2, hk, hk + 0.15, innen))
    }
    if (rolle) {
      const dm = Math.min(T * 0.45, 2 * (H - hk))
      out.push(zyl(t(B * 0.15, T / 2 - dm / 2, B * 0.85, T / 2 + dm / 2, hk - dm / 2, hk + dm / 2, decke), 1, 'laengs'))
    }
  }
  return out
}

/** Vorhang an der Wand (y = 0): runde Stange mit Endkugeln an zwei
 *  Haltern, darunter ein oder zwei bodenlange Schals mit weichen Falten
 *  (schmale runde Bahnen, abwechselnd vor und zurueck). */
function vorhang(B: number, T: number, H: number, eigen: string | null, f: MoebelFarben): Teil[] {
  const stoff = eigen ?? f.leinen
  const d = Math.max(4, Math.min(T, 16))
  const yr = d * 0.6
  const stange = f.metall
  const out: Teil[] = [
    { ...zyl(t(2, yr - 1.25, B - 2, yr + 1.25, H - 3.75, H - 1.25, stange), 1, 'laengs'), glanz: 0.6 },
    { ...kugel(t(0, yr - 2, 4, yr + 2, H - 4.5, H - 0.5, stange)), glanz: 0.6 },
    { ...kugel(t(B - 4, yr - 2, B, yr + 2, H - 4.5, H - 0.5, stange)), glanz: 0.6 },
    rd(t(B * 0.08, 0, B * 0.08 + 1.5, yr, H - 3, H - 2, stange), 0.4),
    rd(t(B * 0.92 - 1.5, 0, B * 0.92, yr, H - 3, H - 2, stange), 0.4),
  ]
  const schals: [number, number][] = B >= 90 ? [[1, B * 0.39], [B * 0.61, B - 1]] : [[1, B - 1]]
  const hinten: [number, number] = [Math.max(0, yr - 3.2), Math.max(0.6, yr - 1)]
  const vorn: [number, number] = [Math.max(0.4, yr - 1.4), Math.min(d, yr + 0.8)]
  for (const [a, b] of schals) {
    const k = Math.max(3, Math.min(10, Math.round((b - a) / 9)))
    const w = (b - a) / k
    for (let i = 0; i < k; i++) {
      const [y0, y1] = i % 2 === 0 ? hinten : vorn
      const farbe = i % 2 === 0 ? ton(stoff, 0.9) : ton(stoff, 1.03)
      out.push(rd(t(a + i * w - (i ? 0.5 : 0), y0, a + (i + 1) * w + (i < k - 1 ? 0.5 : 0), y1, 1, H - 6.5, farbe), (y1 - y0) / 2))
    }
    // Kopfband unter der Stange.
    out.push(rd(t(a, hinten[0], b, vorn[1], H - 7, H - 4, stoff), 0.8))
  }
  return out
}

/** Obstschale: flache Schale (oben weiter) mit Aepfeln, Orange, Zitrone,
 *  Banane und Trauben; das Obst liegt halb in der Schale. */
function obstschale(B: number, T: number, H: number, eigen: string | null, f: MoebelFarben): Teil[] {
  const schale = eigen ?? f.keramik
  const cx = B / 2
  const cy = T / 2
  const hb = Math.max(2, Math.min(H * 0.45, 9))
  const fs = Math.max(2, Math.min(Math.min(B, T) * 0.2, (H - hb) / 0.95))
  const z0 = hb - fs * 0.3
  const k = (x: number, y: number, bx: number, by: number, bz: number, dz: number, farbe: string): Teil =>
    kugel(t(cx + x * B - bx / 2, cy + y * T - by / 2, cx + x * B + bx / 2, cy + y * T + by / 2, z0 + dz, z0 + dz + bz, farbe))
  const traube = misch(misch(f.spielBlau, f.spielRot, 0.45), f.schwarz, 0.3)
  const banane = ton(f.spielGelb, 1.1)
  return [
    zyl(t(cx - B / 3.2, cy - T / 3.2, cx + B / 3.2, cy + T / 3.2, 1, hb, schale), 1.6),
    zyl(t(cx - B * 0.16, cy - T * 0.16, cx + B * 0.16, cy + T * 0.16, 0, 1, ton(schale, 0.92))),
    zyl(t(cx - B * 0.43, cy - T * 0.43, cx + B * 0.43, cy + T * 0.43, hb, hb + 0.12, ton(schale, 0.9))),
    k(-0.2, -0.05, fs, fs, fs * 0.95, 0, ton(f.spielRot, 0.95)),
    k(0.05, 0.16, fs, fs, fs * 0.95, 0, ton(f.spielGruen, 1.15)),
    k(0.2, -0.1, fs, fs, fs, 0, misch(f.spielGelb, f.spielRot, 0.35)),
    k(-0.02, -0.2, fs * 1.25, fs * 0.85, fs * 0.85, 0, ton(f.spielGelb, 1.05)),
    k(-0.13, 0.08, fs * 1.4, fs * 0.42, fs * 0.42, fs * 0.5, banane),
    k(0.06, 0.1, fs * 1.3, fs * 0.42, fs * 0.42, fs * 0.6, banane),
    k(0.24, 0.12, fs * 0.42, fs * 0.42, fs * 0.42, fs * 0.15, traube),
    k(0.2, 0.17, fs * 0.42, fs * 0.42, fs * 0.42, fs * 0.2, traube),
    k(0.22, 0.2, fs * 0.42, fs * 0.42, fs * 0.42, fs * 0.5, traube),
  ]
}

/** Blumenkasten fuer den Balkon: Kasten mit Rand und Erde, darin Kraeuter
 *  (gruene Bueschel) und Blumen (Stiel, Blatt, Bluete). */
function blumenkasten(B: number, T: number, H: number, eigen: string | null, f: MoebelFarben): Teil[] {
  const kasten = eigen ?? f.topf
  const hp = H < 30 ? H * 0.55 : Math.min(H * 0.45, 20)
  const out: Teil[] = [
    rd(t(0.5, 0.5, B - 0.5, T - 0.5, 0, hp - 2, kasten), 1.2),
    rd(t(0, 0, B, T, hp - 2, hp, ton(kasten, 0.92)), 0.8),
    t(1.5, 1.5, B - 1.5, T - 1.5, hp, hp + 0.3, ton(f.holzDunkel, 0.7)),
  ]
  const k = Math.max(2, Math.min(8, Math.round(B / 13)))
  const w = B / k
  const gruen = [f.gruen, ton(f.gruen, 1.15), misch(f.gruen, f.spielGruen, 0.5)]
  const blueten = [misch(f.spielRot, f.weiss, 0.35), f.spielGelb, misch(f.spielBlau, f.weiss, 0.3), misch(f.spielRot, f.weiss, 0.6)]
  const raum = H - hp - 0.3
  const cs = Math.max(2, Math.min(w * 0.95, T * 0.9, 12, raum))
  for (let i = 0; i < k; i++) {
    const cx = w * (i + 0.5)
    const cy = T / 2
    if (i % 3 === 1 && raum > 6) {
      const bl = Math.min(5, cs * 0.6)
      const top = H - bl
      out.push(
        kugel(t(cx - cs * 0.4, cy - cs * 0.35, cx + cs * 0.4, cy + cs * 0.35, hp, hp + cs * 0.45, gruen[i % 3])),
        zyl(t(cx - 0.3, cy - 0.3, cx + 0.3, cy + 0.3, hp, top + bl * 0.3, ton(f.gruen, 0.85))),
        kugel(t(cx - bl / 2, cy - bl / 2, cx + bl / 2, cy + bl / 2, top, H, blueten[i % blueten.length])),
      )
    } else {
      const hoch = hp + raum * (0.75 + 0.25 * ((i * 37) % 3) / 2)
      out.push(kugel(t(cx - cs / 2, cy - Math.min(cs, T * 0.9) / 2, cx + cs / 2, cy + Math.min(cs, T * 0.9) / 2, hp - 0.5, hoch, gruen[i % 3])))
    }
  }
  return out
}

/* ------------------------------------------------------------ Bad und WC (E91) */

/* Alles klein und ruhig: jedes Stueck unter etwa 1500 Dreiecken (Zylinder
 * statt Kugeln, Quader mit kleiner Rundung, siehe scripts/moebel-pruefen.mjs).
 * Rund unter 0,2 cm zeichnet der Motor als glatten Quader. */

type StoffTon = 'beige' | 'salbei' | 'weiss' | 'terrakotta' | 'grau'

/** Ruhige Stofffarben aus den Tokens (E91). */
function stoffToene(f: MoebelFarben): Record<StoffTon, string> {
  return {
    beige: misch(f.leinen, f.pappe, 0.28),
    salbei: misch(f.gruen, f.leinen, 0.62),
    weiss: misch(f.waesche, f.leinen, 0.12),
    terrakotta: misch(f.topf, f.leinen, 0.32),
    grau: misch(f.stoff, f.leinen, 0.38),
  }
}

const FARB_WOERTER: [StoffTon, RegExp][] = [
  ['beige', /beige|sand|natur|creme|بيج/],
  ['salbei', /salbei|grün|gruen|mint|oliv|أخضر|مريمية/],
  ['weiss', /weiß|weiss|أبيض/],
  ['terrakotta', /terrakotta|terracotta|ziegel|تراكوتا|طيني/],
  ['grau', /grau|anthrazit|رمادي/],
]

/** Die Stofffarben, die der Name nennt, in seiner Reihenfolge; ohne: die
 *  eigene Farbe des Objekts, sonst standard. */
function tuchFarben(name: string, eigen: string | null, standard: StoffTon, f: MoebelFarben): string[] {
  const n = name.toLowerCase()
  const toene = stoffToene(f)
  const treffer = FARB_WOERTER.map(([k, re]) => ({ k, i: n.search(re) }))
    .filter((x) => x.i >= 0)
    .sort((a, b) => a.i - b.i)
  return treffer.length ? treffer.map((x) => toene[x.k]) : [eigen ?? toene[standard]]
}

/** Warme Flamme mit leiser Glut (E91): ein Kegel ueber dem Docht. */
function flamme(cx: number, cy: number, z: number, h: number, f: MoebelFarben): Teil[] {
  const r = h * 0.24
  return [
    rd(t(cx - 0.12, cy - 0.12, cx + 0.12, cy + 0.12, z, z + 0.6, ton(f.schwarz, 1.2)), 0.05),
    { ...zyl(t(cx - r, cy - r, cx + r, cy + r, z + 0.35, z + 0.35 + h, misch(f.spielGelb, f.waesche, 0.3)), 0.12), glut: 0.9 },
  ]
}

/** Stumpenkerze auf z mit Docht und Flamme; die Flamme ragt um fh ueber hc. */
function kerze(cx: number, cy: number, d: number, z: number, hc: number, fh: number, wachs: string, f: MoebelFarben): Teil[] {
  return [zyl(t(cx - d / 2, cy - d / 2, cx + d / 2, cy + d / 2, z, z + hc, wachs)), ...flamme(cx, cy, z + hc, fh, f)]
}

/** Richtung eines geneigten Stabs (lokal x, y, z): quer kippt die Spitze
 *  nach +x, laengs nach -y, so wie szene.ts und der Motor drehen. */
function richtung(quer: number, laengs: number): [number, number, number] {
  const a = (laengs * Math.PI) / 180
  const b = (quer * Math.PI) / 180
  return [Math.sin(b), -Math.cos(b) * Math.sin(a), Math.cos(b) * Math.cos(a)]
}

/** Gerader duenner Stab ab dem Fusspunkt (x, y, z), l lang, b x c im
 *  Querschnitt (c in y), geneigt wie richtung(). */
function stabAb(x: number, y: number, z: number, l: number, b: number, c: number, quer: number, laengs: number, farbe: string, rund = 0.1): Teil {
  const [dx, dy, dz] = richtung(quer, laengs)
  const cx = x + (dx * l) / 2
  const cy = y + (dy * l) / 2
  const cz = z + (dz * l) / 2
  const q = rd(t(cx - b / 2, cy - c / 2, cx + b / 2, cy + c / 2, cz - l / 2, cz + l / 2, farbe), rund)
  const k: { laengs?: number; quer?: number } = {}
  if (laengs) k.laengs = laengs
  if (quer) k.quer = quer
  return k.laengs || k.quer ? { ...q, kipp: k } : q
}

/** Teile aus weichem Stoff: ohne Kantenlinie (Teil.weich). */
function stoffig(teile: Teil[]): Teil[] {
  return teile.map((q) => ({ ...q, weich: true }))
}

/** Duenner Stab von p nach q (q hoeher als p), b x c im Querschnitt. */
function stabVonBis(p: [number, number, number], q: [number, number, number], b: number, c: number, farbe: string): Teil {
  const l = Math.max(0.1, Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]))
  const quer = Math.asin(Math.max(-1, Math.min(1, (q[0] - p[0]) / l)))
  const laengs = -Math.asin(Math.max(-1, Math.min(1, (q[1] - p[1]) / l / Math.cos(quer))))
  return stabAb(p[0], p[1], p[2], l, b, c, (quer * 180) / Math.PI, (laengs * 180) / Math.PI, farbe)
}

/** Flaches Blatt als Raute (w x h, duenn, Flaeche nach vorn) um die Mitte;
 *  vor neigt die Spitze zur Wand (positiv) oder nach vorn (negativ). */
function blatt(x: number, y: number, z: number, w: number, h: number, vor: number, farbe: string): Teil {
  return { ...rd(t(x - w / 2, y - 0.12, x + w / 2, y + 0.12, z - h / 2, z + h / 2, farbe), 0.1), kipp: { quer: 45, laengs: vor } }
}

/** Topf (oben weiter, Rand oben rTop) mit Erde, Hoehe hp, um (cx, cy). */
function topfMitErde(cx: number, cy: number, rTop: number, hp: number, f: MoebelFarben): Teil[] {
  const r = rTop / 1.12
  return [zyl(t(cx - r, cy - r, cx + r, cy + r, 0, hp, f.topf), 1.12), zyl(t(cx - rTop * 0.93, cy - rTop * 0.93, cx + rTop * 0.93, cy + rTop * 0.93, hp, hp + 0.05, ton(f.holzDunkel, 0.7)))]
}

/** Gruenlilie (E91): Topf und Erde, darauf 14 schmale, bogig nach aussen
 *  fallende Blaetter aus zwei Stuecken, gruen und hell gestreift. */
function gruenlilie(B: number, T: number, H: number, eigen: string | null, f: MoebelFarben): Teil[] {
  const cx = B / 2
  const cy = T / 2
  const R = Math.min(B, T) / 2
  const hp = Math.max(2, Math.min(H * 0.38, R * 1.05))
  const gruen = eigen ?? misch(f.gruen, f.spielGruen, 0.35)
  const hell = misch(gruen, f.leinen, 0.45)
  const out = topfMitErde(cx, cy, R * 0.5, hp, f)
  const rad = (g: number) => (g * Math.PI) / 180
  const n = 14
  for (let i = 0; i < n; i++) {
    const phi = (i * 360) / n + (i % 2) * 9
    const steil = i % 3 === 0
    const t1 = steil ? 10 : 22
    const t2 = steil ? 30 : 45
    // So lang, dass die Spitze im Kasten bleibt.
    const l1 = Math.max(0.5, Math.min((R - 1) / (Math.sin(rad(t1)) + 0.8 * Math.sin(rad(t2))), (H - hp - 0.5) / (Math.cos(rad(t1)) + 0.8 * Math.cos(rad(t2))))) * [1, 0.78, 0.9, 0.7, 0.95][i % 5]
    const p = rad(phi)
    const p0: [number, number, number] = [cx + Math.cos(p) * 0.6, cy + Math.sin(p) * 0.6, hp]
    const p1: [number, number, number] = [p0[0] + l1 * Math.sin(rad(t1)) * Math.cos(p), p0[1] + l1 * Math.sin(rad(t1)) * Math.sin(p), p0[2] + l1 * Math.cos(rad(t1))]
    const l2 = l1 * 0.8
    const p2: [number, number, number] = [p1[0] + l2 * Math.sin(rad(t2)) * Math.cos(p), p1[1] + l2 * Math.sin(rad(t2)) * Math.sin(p), p1[2] + l2 * Math.cos(rad(t2))]
    const farbe = i % 2 ? hell : gruen
    out.push(stabVonBis(p0, p1, 1.1, 0.3, farbe), stabVonBis(p1, p2, 0.9, 0.25, farbe))
  }
  return out
}

/** Haengepflanze wie die Efeutute (E91): Topf und Erde, oben ein Busch
 *  aus Blaettern an kurzen Stielen, ueber den Rand fuenf Ranken mit
 *  Blaettern bis hinunter zum Fuss des Topfs. */
function haengepflanze(B: number, T: number, H: number, eigen: string | null, f: MoebelFarben): Teil[] {
  const cx = B / 2
  const cy = T / 2
  const R = Math.min(B, T) / 2
  const rTop = R * 0.5
  const hp = Math.max(2, Math.min(H * 0.45, R * 1.1))
  const gruen = eigen ?? f.gruen
  const gold = misch(gruen, f.spielGelb, 0.3)
  const stiel = ton(gruen, 0.8)
  const lb = Math.max(1.2, Math.min(4.2, R * 0.32))
  const rand = lb * 0.75 + 0.3
  const inX = (x: number) => Math.max(rand, Math.min(B - rand, x))
  const inY = (y: number) => Math.max(rand, Math.min(T - rand, y))
  const out = topfMitErde(cx, cy, rTop, hp, f)
  const rad = (g: number) => (g * Math.PI) / 180
  // Busch: zehn Stiele schraeg nach aussen, an jedem ein Blatt.
  for (let i = 0; i < 10; i++) {
    const phi = i * 36 + (i % 2) * 12
    const p = rad(phi)
    const tau = 22 + (i % 3) * 8
    const rr = rTop * (i % 2 ? 0.55 : 0.2)
    const l = Math.max(0.5, ((H - 0.4 - lb * 0.7 - hp) / Math.cos(rad(tau))) * [0.55, 0.85, 0.7][i % 3])
    const p0: [number, number, number] = [cx + rr * Math.cos(p), cy + rr * Math.sin(p), hp]
    const p1: [number, number, number] = [inX(p0[0] + l * Math.sin(rad(tau)) * Math.cos(p)), inY(p0[1] + l * Math.sin(rad(tau)) * Math.sin(p)), p0[2] + l * Math.cos(rad(tau))]
    out.push(stabVonBis(p0, p1, 0.3, 0.3, stiel), blatt(p1[0], p1[1], p1[2], lb * 0.85, lb, Math.sin(p) > 0 ? -35 : 35, i % 3 === 1 ? gold : gruen))
  }
  // Ranken ueber den Rand nach unten, vorn mehr als hinten.
  for (const [j, phi] of [60, 105, 150, 230, 320].entries()) {
    const p = rad(phi)
    const oben: [number, number, number] = [cx + rTop * 1.02 * Math.cos(p), cy + rTop * 1.02 * Math.sin(p), hp - 0.3]
    const rb = Math.min(R - rand, rTop + 2.5)
    const zb = Math.max(lb * 0.7, hp * (j % 2 ? 0.35 : 0.08))
    const unten: [number, number, number] = [inX(cx + rb * Math.cos(p)), inY(cy + rb * Math.sin(p)), zb]
    out.push(stabVonBis(unten, oben, 0.3, 0.3, stiel))
    for (const [k, u] of [0.2, 0.48, 0.76, 1].entries()) {
      const s = k % 2 ? 1 : -1
      const x = inX(oben[0] + (unten[0] - oben[0]) * u - Math.sin(p) * lb * 0.45 * s)
      const y = inY(oben[1] + (unten[1] - oben[1]) * u + Math.cos(p) * lb * 0.45 * s)
      const z = Math.max(lb * 0.6, oben[2] + (unten[2] - oben[2]) * u)
      out.push(blatt(x, y, z, lb * 0.75, lb * 0.85, Math.sin(p) > 0 ? -15 : 15, (j + k) % 3 === 0 ? gold : gruen))
    }
  }
  return out
}

/** Hoeher als das (cm) ist eine Pflanze keine Haengepflanze im Regal
 *  mehr: die Stiele des Buschs wachsen mit H, die Blaetter nicht, und
 *  eine grosse Efeutute am Boden wuerde zum Geruest aus Staeben. */
const HAENGE_MAX_H = 50

/** Pflanze (E91 nach Namen): Gruenlilie und Haengepflanzen eigen, alle
 *  anderen wie bisher Topf und runde Krone. Haengepflanzen ueber
 *  HAENGE_MAX_H (etwa eine grosse Efeutute im Topf am Boden) behalten
 *  ebenfalls Topf und Krone. */
export function pflanzeTeile(B: number, T: number, H: number, name: string, eigen: string | null, f: MoebelFarben): Teil[] {
  const n = name.toLowerCase()
  if (/grünlilie|gruenlilie|chlorophytum|العنكبوت/.test(n)) return gruenlilie(B, T, H, eigen, f)
  if (H <= HAENGE_MAX_H && /efeutute|efeu|hängepflanze|haengepflanze|ampel|pothos|متدلية/.test(n)) return haengepflanze(B, T, H, eigen, f)
  return [zyl(t(B * 0.22, T * 0.22, B * 0.78, T * 0.78, 0, H * 0.3, f.topf), 1.2), kugel(t(0, 0, B, T, H * 0.26, H, eigen ?? f.gruen))]
}

/** Handtuch ueber der Stange (lokal: Stange laengs bei yr, zr, Radius rs)
 *  von x0 bis x1: vorne eine Lage bis z = 0 mit einer weichen Falte in der
 *  Mitte und einer Bordure, oben um die Stange gerundet, hinten kuerzer. */
function tuchUeberStange(x0: number, x1: number, yr: number, zr: number, rs: number, farbe: string): Teil[] {
  const dt = 0.7
  const m = (x0 + x1) / 2
  const yv = yr + rs
  const bord = ton(farbe, 0.88)
  const zb = Math.min(9, zr * 0.16)
  return stoffig([
    zyl(t(x0, yr - rs - dt, x1, yr + rs + dt, zr - rs - dt, zr + rs + dt, farbe), 1, 'laengs'),
    rd(t(x0, yv, m + 0.5, yv + dt, 0, zr, farbe), 0.35),
    rd(t(m - 0.5, yv + 0.35, x1, yv + 0.35 + dt, 0.4, zr, ton(farbe, 1.04)), 0.35),
    rd(t(x0 + 0.4, yv + dt, m, yv + dt + 0.06, zb, zb + 2.6, bord), 0.1),
    rd(t(m + 0.5, yv + 0.35 + dt, x1 - 0.4, yv + 0.41 + dt, zb + 0.4, zb + 3, bord), 0.1),
    rd(t(x0 + 0.3, yr - rs - dt, x1 - 0.3, yr - rs, zr * 0.35, zr, ton(farbe, 0.95)), 0.1),
  ])
}

/** Handtuecher an der Wand (E91): runde Stange ueber die Breite an zwei
 *  Haltern, oben in H; darueber je nach Breite ein bis drei Handtuecher
 *  (tuchUeberStange) in den Farben des Namens. Mit "Haken" im Namen ein
 *  Haken mit einem Gaestetuch an seiner Schlaufe. Jedes Tuch laesst sich
 *  abnehmen. */
function handtuch(B: number, T: number, H: number, name: string, eigen: string | null, f: MoebelFarben): Teil[] {
  const farben = tuchFarben(name, eigen, 'beige', f)
  if (/haken|خطاف|علاقة/.test(name.toLowerCase())) return handtuchAmHaken(B, T, H, farben[0], f)
  const rs = Math.max(0.5, Math.min(1, H * 0.04))
  const yr = Math.max(rs + 1.2, Math.min(T * 0.42, 5))
  const zr = H - rs - 0.8
  const halter = Math.min(4, B * 0.08)
  const out: Teil[] = [{ ...zyl(t(0.3, yr - rs, B - 0.3, yr + rs, zr - rs, zr + rs, f.metall), 1, 'laengs'), glanz: 0.8 }]
  for (const x of [halter, B - halter]) {
    out.push({ ...rd(t(x - 0.8, 0.6, x + 0.8, yr, zr - 0.8, zr + 0.8, f.metall), 0.15), glanz: 0.8 })
    out.push({ ...rd(t(x - 1.8, 0, x + 1.8, 0.6, zr - 1.8, zr + 1.8, f.metall), 0.15), glanz: 0.8 })
  }
  const n = B < 45 ? 1 : B < 85 ? 2 : 3
  const a = halter + 1.6
  const e = B - halter - 1.6
  const g = 2.5
  const tw = Math.min(55, (e - a - (n - 1) * g) / n)
  if (tw < 2) return out
  const start = (a + e) / 2 - (n * tw + (n - 1) * g) / 2
  for (let i = 0; i < n; i++) {
    const x0 = start + i * (tw + g)
    const farbe = farben.length > 1 ? farben[i % farben.length] : ton(farben[0], [1, 0.94, 1.05][i])
    out.push(...alsDing(tuchUeberStange(x0, x0 + tw, yr, zr, rs, farbe), `handtuch${i + 1}`))
  }
  return out
}

/** Haken an der Wand mit einem Gaestetuch an der Schlaufe: das Tuch haengt
 *  oben zusammengerafft und faellt unten weit (flacher Kegel), davor eine
 *  weiche Falte, unten die Bordure. */
function handtuchAmHaken(B: number, T: number, H: number, farbe: string, f: MoebelFarben): Teil[] {
  const cx = B / 2
  const hz = H - 2
  const hy = Math.max(2.2, Math.min(T * 0.5, 5))
  const out: Teil[] = [
    { ...zyl(t(cx - 1.6, 0, cx + 1.6, 0.7, hz - 1.6, hz + 1.6, f.metall), 1, 'quer'), glanz: 0.8 },
    { ...zyl(t(cx - 0.55, 0.7, cx + 0.55, hy + 0.8, hz - 0.55, hz + 0.55, f.metall), 1, 'quer'), glanz: 0.8 },
  ]
  const tw = Math.max(4, Math.min(B - 1, 34))
  const zo = hz - 1.2
  const z0 = 0.3
  const dd = Math.min(3.4, 2 * hy - 0.4)
  const oben = 0.16
  // Breite und Tiefe des Kegels in der Hoehe z.
  const k = (z: number) => 1 - ((1 - oben) * (z - z0)) / (zo - z0)
  const zb = z0 + Math.min(6, (zo - z0) * 0.12)
  const hb = Math.min(2.6, (zo - z0) * 0.06)
  const kb = k(zb) * 1.03
  // Die Falte: schmaler Kegel vor dem Tuch, auch mit Bordure.
  const fz0 = z0 + 1
  const fz1 = zo - 1.5
  const fy = hy + (dd * 0.4 + 0.9) / 2
  const fd = (dd * 0.6 + 0.9) / 2
  const fk = (z: number) => 1 - ((1 - 0.22) * (z - fz0)) / (fz1 - fz0)
  const fkb = fk(zb) * 1.04
  const bord = ton(farbe, 0.88)
  const tuch: Teil[] = [
    rd(t(cx - 0.4, hy - 0.3, cx + 0.4, hy + 0.3, zo - 0.5, hz + 0.4, ton(farbe, 0.9)), 0.1),
    zyl(t(cx - tw / 2, hy - dd / 2, cx + tw / 2, hy + dd / 2, z0, zo, farbe), oben),
    zyl(t(cx - tw * 0.28, fy - fd, cx + tw * 0.28, fy + fd, fz0, fz1, ton(farbe, 1.05)), 0.22),
    zyl(t(cx - (tw / 2) * kb, hy - (dd / 2) * kb, cx + (tw / 2) * kb, hy + (dd / 2) * kb, zb, zb + hb, bord), k(zb + hb) / k(zb)),
    zyl(t(cx - tw * 0.28 * fkb, fy - fd * fkb, cx + tw * 0.28 * fkb, fy + fd * fkb, zb, zb + hb, bord), fk(zb + hb) / fk(zb)),
  ]
  out.push(...alsDing(tuch, 'handtuch1'))
  return out
}

/** Handtuchstapel (E91): zwei bis vier gefaltete Handtuecher, je etwa 5 cm
 *  hoch, leicht versetzt und verschieden breit, vorn die runde Faltkante
 *  mit Bordure; mit "gerollt" im Namen gerollte Tuecher mit sichtbarer
 *  Wicklung an der Stirn, eine Reihe (bis vier) oder zwei uebereinander. */
function handtuchstapel(B: number, T: number, H: number, name: string, eigen: string | null, f: MoebelFarben): Teil[] {
  const farben = tuchFarben(name, eigen, 'beige', f)
  const ton2 = (i: number) => (farben.length > 1 ? farben[i % farben.length] : ton(farben[0], [1, 0.95, 1.04, 0.97][i % 4]))
  const out: Teil[] = []
  if (/gerollt|rolle|ملفوفة/.test(name.toLowerCase())) {
    // Zwei Reihen, wenn Rollen von mindestens 8 cm uebereinander passen.
    const zwei = H >= 15 && B >= 16 && T >= 8
    const d = Math.max(3, Math.min(13, zwei ? B / 2 : B, zwei ? H / 1.87 : H, T))
    const k1 = Math.max(1, Math.min(zwei ? 2 : 4, Math.floor(B / d)))
    const reihen = zwei && k1 > 1 ? [k1, k1 - 1] : [k1]
    const l = Math.min(T, 40)
    const y0 = (T - l) / 2
    reihen.forEach((k, r) => {
      const z = r * d * 0.86
      const x0 = (B - k * d) / 2
      for (let i = 0; i < k; i++) {
        const c = ton2(i + r)
        const ya = y0 + (i % 2) * 0.4
        const yb = y0 + l - 0.4 + (i % 2) * 0.4
        const mx = x0 + (i + 0.5) * d
        const mz = z + d / 2
        out.push(
          zyl(t(x0 + i * d, ya, x0 + (i + 1) * d, yb, z, z + d, c), 1, 'quer'),
          // Wicklung vorn: eine etwas dunklere Mitte, leicht ausser der Achse.
          zyl(t(mx - d * 0.24 + 0.3, yb - 0.2, mx + d * 0.24 + 0.3, yb + 0.06, mz - d * 0.24 - 0.2, mz + d * 0.24 - 0.2, ton(c, 0.9)), 1, 'quer'),
        )
      }
    })
    return out
  }
  const n = Math.max(2, Math.min(4, Math.round(H / 5)))
  const h = H / n
  const m = 0.8
  for (let i = 0; i < n; i++) {
    const ex = (((i * 37) % 3) - 1) * 0.6
    const ey = (((i * 53) % 3) - 1) * 0.5
    const x0 = m + ex
    const x1 = B - m + ex - ((i * 29) % 4) * 0.35
    const y1 = T - m + ey
    const c = ton2(i)
    const z = i * h
    out.push(
      ...stoffig([
        rd(t(x0, m + ey, x1, y1, z, z + h - 0.06, c), Math.min(1.9, h * 0.38)),
        rd(t(x0 + 1.4, y1 - 0.1, x1 - 1.4, y1 + 0.06, z + h * 0.44, z + h * 0.56, ton(c, 0.88)), 0.1),
      ]),
    )
  }
  return out
}

/** Zahnputzbecher mit zwei Zahnbuersten, Seifenspender mit Pumpe und, ab
 *  24 cm Breite, eine Seifenschale mit Seife dazwischen (E91). Keramik
 *  beige (eigene Farbe) und weiss; jedes Teil laesst sich nehmen. */
function badaccessoires(B: number, T: number, H: number, eigen: string | null, f: MoebelFarben): Teil[] {
  const beige = eigen ?? misch(f.keramik, f.leinen, 0.4)
  const weiss = f.keramik
  const out: Teil[] = []
  const cy = T / 2
  // Becher links, oben etwas weiter, innen dunkel.
  const dc = Math.max(2, Math.min(8, T * 0.85, B * 0.3))
  const hc = Math.max(2, Math.min(10.5, H * 0.52))
  const rb = dc / 2 / 1.08
  const bx = dc / 2 + 0.2
  const becher: Teil[] = [
    { ...zyl(t(bx - rb, cy - rb, bx + rb, cy + rb, 0, hc, beige), 1.08), glanz: 0.5 },
    zyl(t(bx - dc * 0.4, cy - dc * 0.4, bx + dc * 0.4, cy + dc * 0.4, hc, hc + 0.05, ton(beige, 0.55))),
  ]
  const bl = Math.max(2, Math.min(19, H - 2.8))
  const buersten: [number, number, string][] = [
    [-9, 4, misch(f.spielBlau, f.leinen, 0.35)],
    [8, -5, misch(f.spielGruen, f.leinen, 0.35)],
  ]
  for (const [quer, laengs, farbe] of buersten) {
    const fx = bx - (quer > 0 ? 1 : -1) * dc * 0.15
    const fy = cy + (laengs > 0 ? 1 : -1) * dc * 0.12
    becher.push(stabAb(fx, fy, 1.5, bl, 0.9, 0.55, quer, laengs, farbe, 0.15))
    const [dx, dy, dz] = richtung(quer, laengs)
    const kx = fx + dx * (bl - 1.6)
    const ky = fy + dy * (bl - 1.6)
    const kz = 1.5 + dz * (bl - 1.6)
    becher.push({ ...rd(t(kx - 0.55, ky + 0.25, kx + 0.55, ky + 1.2, kz - 1.3, kz + 1.3, ton(f.waesche, 1.02)), 0.15), kipp: { quer, laengs } })
  }
  out.push(...alsDing(becher, 'becher'))
  // Spender rechts: Koerper, Kragen und Pumpe mit Auslauf nach vorn.
  const dd = Math.max(2, Math.min(7, T * 0.8, B * 0.28))
  const hd = Math.max(2, Math.min(13, H * 0.62))
  const sx = B - dd / 2 - 0.2
  const kr = dd * 0.2
  const kopf = Math.max(0.5, Math.min(2.2, H - hd - 1.8))
  out.push(
    ...alsDing(
      [
        { ...zyl(t(sx - dd / 2, cy - dd / 2, sx + dd / 2, cy + dd / 2, 0, hd, weiss), 0.9), glanz: 0.55 },
        { ...zyl(t(sx - kr, cy - kr, sx + kr, cy + kr, hd, hd + 1.4, f.metall)), glanz: 0.8 },
        { ...zyl(t(sx - kr * 1.25, cy - kr * 1.25, sx + kr * 1.25, cy + kr * 1.25, hd + 1.4, hd + 1.4 + kopf, f.metall)), glanz: 0.8 },
        { ...rd(t(sx - 0.45, cy, sx + 0.45, Math.min(T, cy + dd * 0.55), hd + 0.9 + kopf, hd + 1.3 + kopf, f.metall), 0.15), glanz: 0.8 },
      ],
      'spender',
    ),
  )
  // Seifenschale in der Mitte, wenn Platz ist.
  const frei = sx - dd / 2 - (bx + dc / 2) - 1
  if (B >= 24 && frei >= 6) {
    const mx = (bx + dc / 2 + sx - dd / 2) / 2
    const sw = Math.min(10, frei) / 2
    const st = Math.min(T * 0.42, 3.5)
    out.push(...alsDing(seifenschaleTeile(mx - sw, cy - st, mx + sw, cy + st, Math.min(3.2, H * 0.2), weiss, f), 'seife'))
  }
  return out
}

/** Flache Seifenschale (oben weiter) mit einem Stueck Seife, im Kasten
 *  x0..x1, y0..y1, 0..h. */
function seifenschaleTeile(x0: number, y0: number, x1: number, y1: number, h: number, keramik: string, f: MoebelFarben): Teil[] {
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  const rx = (x1 - x0) / 2 / 1.15
  const ry = (y1 - y0) / 2 / 1.15
  const hs = Math.min(1.6, h * 0.5)
  const seife = misch(f.spielGruen, f.leinen, 0.72)
  return [
    { ...zyl(t(cx - rx, cy - ry, cx + rx, cy + ry, 0, hs, keramik), 1.15), glanz: 0.6 },
    zyl(t(cx - rx * 0.92, cy - ry * 0.92, cx + rx * 0.92, cy + ry * 0.92, hs, hs + 0.04, ton(keramik, 0.94))),
    rd(t(cx - rx * 0.62, cy - ry * 0.58, cx + rx * 0.62, cy + ry * 0.58, hs - 0.4, h, seife), Math.min(0.6, (h - hs + 0.4) * 0.4)),
  ]
}

/** Zwei oder drei Stumpenkerzen verschieden hoch auf einem kleinen
 *  Tablett, jede mit Docht und leise gluehender Flamme (E91). */
function kerzen(B: number, T: number, H: number, eigen: string | null, f: MoebelFarben): Teil[] {
  const wachs = eigen ?? misch(f.waesche, f.leinen, 0.45)
  const zt = Math.min(1.2, H * 0.1)
  const out: Teil[] = [rd(t(0, 0, B, T, 0, zt, misch(f.holz, f.holzDunkel, 0.35)), Math.min(0.5, zt * 0.45))]
  const n = B >= 18 ? 3 : 2
  const d = Math.max(1.5, Math.min(8, T * 0.62, (B / n) * 0.86))
  const fh = Math.max(0.8, Math.min(2.4, d * 0.32))
  const frei = Math.max(1, H - zt - fh - 0.4)
  const lage = n === 3 ? [[0.2, 0.58, 0.64], [0.5, 0.42, 1], [0.8, 0.6, 0.44]] : [[0.3, 0.5, 1], [0.72, 0.5, 0.66]]
  for (const [fx, fy, fh2] of lage) {
    const cx = Math.max(d / 2, Math.min(B - d / 2, B * fx))
    const cy = Math.max(d / 2, Math.min(T - d / 2, T * fy))
    out.push(...kerze(cx, cy, d, zt, frei * fh2, fh, wachs, f))
  }
  return out
}

/** Glasflasche mit Duft und Rattanstaebchen, die nach allen Seiten
 *  auseinander stehen (E91). */
function duftstaebchen(B: number, T: number, H: number, eigen: string | null, f: MoebelFarben): Teil[] {
  const glas = eigen ?? misch(f.glas, f.waesche, 0.35)
  const duft = misch(f.pappe, f.holzDunkel, 0.3)
  const cx = B / 2
  const cy = T / 2
  const d = Math.max(2, Math.min(9, B * 0.62, T * 0.62))
  const hb = Math.max(2, Math.min(11, H * 0.38))
  const hn = hb + Math.min(2.2, H * 0.08)
  const out: Teil[] = [
    { ...zyl(t(cx - d / 2, cy - d / 2, cx + d / 2, cy + d / 2, 0, hb, glas, 0.72), 0.92), glanz: 0.85 },
    zyl(t(cx - d * 0.4, cy - d * 0.4, cx + d * 0.4, cy + d * 0.4, 0.3, hb * 0.55, duft)),
    { ...zyl(t(cx - d * 0.16, cy - d * 0.16, cx + d * 0.16, cy + d * 0.16, hb, hn, glas, 0.72)), glanz: 0.85 },
    { ...zyl(t(cx - d * 0.21, cy - d * 0.21, cx + d * 0.21, cy + d * 0.21, hn - 1, hn, misch(f.holzDunkel, f.holz, 0.4))), glanz: 0.3 },
  ]
  const stab = misch(f.holz, f.leinen, 0.45)
  // So weit gefaechert, wie die Spitzen im Kasten bleiben.
  const hoch = Math.max(1, H - 0.3 - hn)
  const grenze = (w: number, platz: number) => Math.sign(w) * Math.min(Math.abs(w), (Math.atan(Math.max(0, platz) / hoch) * 180) / Math.PI)
  const winkel: [number, number][] = [[-15, 4], [-9, -7], [-4, 9], [0, -3], [5, 8], [10, -8], [15, 2], [2, 13]]
  for (const [q0, l0] of winkel) {
    const quer = grenze(q0, B / 2 - 0.9)
    const laengs = grenze(l0, T / 2 - 0.9)
    const l = hoch / richtung(quer, laengs)[2]
    out.push(stabAb(cx + quer * 0.02, cy - laengs * 0.02, hn, l, 0.35, 0.35, quer, laengs, stab))
  }
  return out
}

/** Bambusablage quer ueber der Wanne (E91): zwei Laengsholme, zwei
 *  Querstuecke an den Enden, Latten dazwischen; darauf eine Kerze und ein
 *  kleines Buch, beide zum Nehmen. */
function badewannenablage(B: number, T: number, H: number, eigen: string | null, f: MoebelFarben): Teil[] {
  const bambus = eigen ?? misch(f.holz, f.leinen, 0.38)
  const hb = Math.max(1, Math.min(2.2, H * 0.25))
  const hr = Math.min(1.6, T * 0.12)
  const out: Teil[] = [rd(t(0, 0, B, hr, 0, hb, bambus), 0.35), rd(t(0, T - hr, B, T, 0, hb, bambus), 0.35)]
  const qb = Math.min(3, B * 0.06)
  out.push(rd(t(0.3, hr, qb, T - hr, 0, hb * 0.5, ton(bambus, 0.92)), 0.15), rd(t(B - qb, hr, B - 0.3, T - hr, 0, hb * 0.5, ton(bambus, 0.92)), 0.15))
  const k = Math.max(2, Math.min(4, Math.round((T - 2 * hr) / 3.4)))
  const lw = (T - 2 * hr - (k + 1) * 0.6) / k
  for (let i = 0; i < k; i++) {
    const y = hr + 0.6 + i * (lw + 0.6)
    out.push(rd(t(0.6, y, B - 0.6, y + lw, hb * 0.5, hb * 0.92, ton(bambus, i % 2 ? 1.03 : 0.98)), 0.3))
  }
  const oben = hb * 0.92
  // Kerze links der Mitte.
  const dc = Math.max(1.5, Math.min(7, T * 0.5, B * 0.15))
  const fh = Math.max(0.8, Math.min(2.2, dc * 0.32))
  const hc = Math.max(1, Math.min(8, H - oben - fh - 0.4))
  out.push(...alsDing(kerze(B * 0.32, T / 2, dc, oben, hc, fh, misch(f.waesche, f.leinen, 0.45), f), 'kerze'))
  // Kleines Buch rechts der Mitte: Deckel, Seiten, Ruecken.
  const bw = Math.max(2, Math.min(13, B * 0.22))
  const bt = Math.max(2, Math.min(T * 0.8, 18))
  const bd = Math.max(0.6, Math.min(2.2, H - oben))
  const bx = B * 0.6
  const by = (T - bt) / 2
  const deckel = misch(f.spielBlau, f.leinen, 0.45)
  out.push(
    ...alsDing(
      [
        rd(t(bx, by, bx + bw, by + bt, oben, oben + 0.25, deckel), 0.1),
        rd(t(bx, by, bx + bw, by + bt, oben + bd - 0.25, oben + bd, deckel), 0.1),
        rd(t(bx, by, bx + 0.3, by + bt, oben + 0.25, oben + bd - 0.25, ton(deckel, 0.9)), 0.1),
        t(bx + 0.3, by + 0.25, bx + bw - 0.25, by + bt - 0.25, oben + 0.25, oben + bd - 0.25, misch(f.waesche, f.leinen, 0.3)),
      ],
      'buch',
    ),
  )
  return out
}

/** Klopapierhalter an der Wand (E91), gebuerstetes Metall: Rosette, Arm
 *  von der Wand und Stange, darauf die Rolle mit Papphuelse. Ab doppelter
 *  Rollenbreite geht die Stange zu beiden Seiten durch, rechts haengt die
 *  Ersatzrolle (zum Nehmen). */
function klopapierhalter(B: number, T: number, H: number, eigen: string | null, f: MoebelFarben): Teil[] {
  const stahl = eigen ?? f.metall
  const papier = misch(f.waesche, f.keramik, 0.5)
  const huelse = ton(f.pappe, 1.12)
  const dr = Math.max(2, Math.min(11.5, H - 1, T - 1.6))
  const lr = Math.max(2, Math.min(10.5, B - 5))
  const doppelt = B >= 2 * lr + 7
  const zr = H - dr / 2 - 0.3
  const yr = Math.min(T - dr / 2, 1.2 + dr / 2 + 0.4)
  const px = doppelt ? B / 2 : 1.8
  const out: Teil[] = [
    { ...rd(t(px - 1.8, 0, px + 1.8, 1.2, zr - 3, zr + 3, stahl), 0.5), glanz: 0.55 },
    { ...zyl(t(px - 0.8, 1.2, px + 0.8, yr + 0.8, zr - 0.8, zr + 0.8, stahl), 1, 'quer'), glanz: 0.55 },
  ]
  const ba = doppelt ? px - lr - 2.2 : px
  const be = px + lr + 2.2
  out.push({ ...zyl(t(ba, yr - 0.7, be, yr + 0.7, zr - 0.7, zr + 0.7, stahl), 1, 'laengs'), glanz: 0.55 })
  const rolle = (x0: number): Teil[] => [
    zyl(t(x0, yr - dr / 2, x0 + lr, yr + dr / 2, zr - dr / 2, zr + dr / 2, papier), 1, 'laengs'),
    zyl(t(x0 - 0.1, yr - 2, x0 + lr + 0.1, yr + 2, zr - 2, zr + 2, huelse), 1, 'laengs'),
  ]
  out.push(...rolle(px + 1.4))
  if (doppelt) out.push(...alsDing(rolle(px - 1.4 - lr), 'ersatzrolle'))
  return out
}

/** Klobuerste im stehenden Halter (E91): Becher aus gebuerstetem Metall
 *  mit schwarzem Einsatz, Stiel und Knauf. */
function klobuerste(B: number, T: number, H: number, eigen: string | null, f: MoebelFarben): Teil[] {
  const stahl = eigen ?? f.metall
  const cx = B / 2
  const cy = T / 2
  const d = Math.max(2, Math.min(B, T) * 0.94)
  const hh = Math.max(2, Math.min(16, H * 0.42))
  const r = d / 2
  return [
    { ...zyl(t(cx - r, cy - r, cx + r, cy + r, 0, hh, stahl)), glanz: 0.5 },
    zyl(t(cx - r * 0.93, cy - r * 0.93, cx + r * 0.93, cy + r * 0.93, hh, hh + 0.5, ton(f.schwarz, 1.35))),
    zyl(t(cx - r * 0.62, cy - r * 0.62, cx + r * 0.62, cy + r * 0.62, hh + 0.5, hh + 0.55, f.schwarz)),
    { ...zyl(t(cx - 0.55, cy - 0.55, cx + 0.55, cy + 0.55, hh - 2, H - 2.4, stahl)), glanz: 0.7 },
    { ...zyl(t(cx - 1.3, cy - 1.3, cx + 1.3, cy + 1.3, H - 2.6, H, stahl), 0.75), glanz: 0.7 },
  ]
}

/** Bademantel am Haken (E91): Haken an der Wand, der Mantel haengt an
 *  seiner Schlaufe, unten weiter als an den Schultern (flacher Kegel),
 *  runde Schultern, Schalkragen, Guertel mit Enden, aufgesetzte Taschen
 *  und Aermel an den Seiten. Farbe aus dem Namen, sonst weiss. Der Mantel
 *  laesst sich abnehmen. */
function bademantel(B: number, T: number, H: number, name: string, eigen: string | null, f: MoebelFarben): Teil[] {
  const stoff = tuchFarben(name, eigen, 'weiss', f)[0]
  const dunkler = ton(stoff, 0.9)
  const cx = B / 2
  const hz = H - 3
  const hy = Math.max(2, Math.min(T * 0.4, 6))
  const out: Teil[] = [
    { ...zyl(t(cx - 1.8, 0, cx + 1.8, 0.8, hz - 1.8, hz + 1.8, f.metall), 1, 'quer'), glanz: 0.8 },
    { ...zyl(t(cx - 0.6, 0.8, cx + 0.6, hy, hz - 0.6, hz + 0.6, f.metall), 1, 'quer'), glanz: 0.8 },
  ]
  const tief = Math.max(2, Math.min(T - 1, 18))
  const yb = 0.5
  const yc = yb + tief / 2
  const ws = Math.max(1, Math.min(13, B * 0.18))
  const bu = Math.max(2, Math.min(B - ws - 1, 64))
  const oben = 0.74
  const zs = Math.max(2, H - 12)
  // Halbe Breite und Tiefe des Koerpers in der Hoehe z.
  const k = (z: number) => 1 - ((1 - oben) * Math.min(z, zs)) / zs
  const vorn = (z: number) => yc + (tief / 2) * k(z)
  const zw = H * 0.47
  const mantel: Teil[] = [
    zyl(t(cx - bu / 2, yb, cx + bu / 2, yb + tief, 0, zs, stoff), oben),
    zyl(t(cx - (bu * oben) / 2, yc - (tief * oben) / 2, cx + (bu * oben) / 2, yc + (tief * oben) / 2, zs, H - 3.2, ton(stoff, 1.02)), 0.42),
    // Schalkragen: zwei Streifen, oben am Hals zusammen.
    ...[-1, 1].map((s) => {
      const z0 = zw + 2
      const z1 = H - 5
      const y = vorn((z0 + z1) / 2) - 0.6
      return { ...rd(t(cx + s * 3.6 - 2.6, y, cx + s * 3.6 + 2.6, y + 1.4, z0, z1, ton(stoff, 1.06)), 0.4), kipp: { quer: s * -9 } }
    }),
    // Guertel um die Taille, die Enden haengen vorn.
    zyl(t(cx - (bu / 2) * k(zw) * 1.03, yc - (tief / 2) * k(zw) * 1.03, cx + (bu / 2) * k(zw) * 1.03, yc + (tief / 2) * k(zw) * 1.03, zw - 1.8, zw + 1.8, dunkler)),
    rd(t(cx - 4.5, vorn(zw - 10), cx - 1.5, vorn(zw - 10) + 0.8, zw - 24, zw - 1, dunkler), 0.15),
    rd(t(cx + 1.2, vorn(zw - 9), cx + 4, vorn(zw - 9) + 0.8, zw - 20, zw - 1, dunkler), 0.15),
    // Taschen vorn.
    ...[-1, 1].map((s) => rd(t(cx + s * bu * 0.24 - bu * 0.1, vorn(zw - 14) - 0.2, cx + s * bu * 0.24 + bu * 0.1, vorn(zw - 14) + 0.25, zw - 26, zw - 10, ton(stoff, 0.95)), 0.1)),
  ]
  // Aermel an den Seiten, an der Manschette etwas weiter, leicht nach innen.
  const za = H * 0.36
  for (const s of [-1, 1]) {
    const x = cx + s * ((bu / 2) * k((za + zs) / 2) + ws * 0.15)
    const ds = Math.min(tief * 0.8, 12)
    mantel.push({ ...zyl(t(x - ws / 2, yc - ds / 2, x + ws / 2, yc + ds / 2, za, zs + 1, ton(stoff, 0.97)), 0.82), kipp: { quer: s * -3 } })
  }
  out.push(...alsDing(stoffig(mantel), 'bademantel'))
  return out
}

/** Wandregal aus Bambus (E91), ohne Inhalt: unter 22 cm Hoehe ein Brett
 *  auf zwei Konsolen, sonst zwei bis fuenf Bretter zwischen zwei Seiten,
 *  jedes mit einer niedrigen Kante vorn. */
function wandregal(B: number, T: number, H: number, eigen: string | null, f: MoebelFarben): Teil[] {
  const bambus = eigen ?? misch(f.holz, f.leinen, 0.38)
  const kante = ton(bambus, 0.92)
  const db = Math.max(0.6, Math.min(1.8, H * 0.12))
  if (H < 22) {
    const out: Teil[] = [rd(t(0, 0, B, T, H - db, H, bambus), 0.3)]
    // Konsole: Leiste an der Wand und eine Strebe darunter, hoechstens 40
    // Grad schraeg.
    const za = Math.min(2, H * 0.2)
    const zb = H - db - 0.6
    const yb = Math.max(1.2, Math.min(T * 0.7, (zb - za) * Math.tan((40 * Math.PI) / 180)))
    for (const x of [B * 0.15, B * 0.85]) {
      out.push(rd(t(x - 1, 0, x + 1, 1, 0, H - db, kante), 0.15), stab(x - 0.9, x + 0.9, 0.6, za, yb, zb, 1.2, kante, 0.15))
    }
    return out
  }
  const ds = Math.min(1.4, B * 0.05)
  const n = Math.max(2, Math.min(5, Math.round(H / 30) + 1))
  const out: Teil[] = [rd(t(0, 0, ds, T, 0, H, bambus), 0.3), rd(t(B - ds, 0, B, T, 0, H, bambus), 0.3)]
  const abstand = (H - db) / (n - 1)
  for (let i = 0; i < n; i++) {
    const z = i === n - 1 ? H - db : abstand * i
    out.push(rd(t(ds, 0, B - ds, T, z, z + db, ton(bambus, i % 2 ? 1.03 : 1)), 0.3))
    if (i === n - 1) continue
    // Vorn eine niedrige Kante, hinten eine runde Stange zwischen den Seiten.
    out.push(rd(t(ds, T - 0.9, B - ds, T, z + db, z + db + Math.min(2, H * 0.06), kante), 0.2))
    const zs = z + db + Math.min(8, (abstand - db) * 0.4)
    out.push(zyl(t(ds, 0.6, B - ds, 1.8, zs - 0.6, zs + 0.6, kante), 1, 'laengs'))
  }
  return out
}

/** Schraeger Stab in der y-z-Ebene (wie stab in moebel3d.ts) von (ya, za)
 *  nach (yb, zb), dy dick. */
function stab(x0: number, x1: number, ya: number, za: number, yb: number, zb: number, dy: number, farbe: string, rund: number): Teil {
  const l = Math.hypot(yb - ya, zb - za)
  const yc = (ya + yb) / 2
  const zc = (za + zb) / 2
  const grad = (Math.atan2(ya - yb, zb - za) * 180) / Math.PI
  const q = rd(t(x0, yc - dy / 2, x1, yc + dy / 2, zc - l / 2, zc + l / 2, farbe), rund)
  return Math.abs(grad) > 0.01 ? { ...q, kipp: { laengs: grad } } : q
}

/* ------------------------------------------------------------ Auswahl */

type DekoObjekt = Pick<Objekt, 'breite_cm' | 'tiefe_cm' | 'hoehe_cm' | 'farbe'> & Partial<Pick<Objekt, 'name' | 'material'>>

/** Die Teile der Deko- und Spielzeugarten (E82); null fuer jede andere
 *  Art. neueGruppe vergibt die Nummern fuer Tueren und ihre Griffe. */
export function dekoTeile(art: MoebelArt | null, o: DekoObjekt, f: MoebelFarben, neueGruppe: () => number): Teil[] | null {
  const B = o.breite_cm
  const T = o.tiefe_cm
  const H = o.hoehe_cm
  const eigen = o.farbe ?? null
  switch (art) {
    case 'spielzeugkiste':
      return spielzeugkiste(B, T, H, eigen, o.material === 'stoff' || /stoff|textil|filz|قماش/i.test(o.name ?? ''), f)
    case 'kuscheltier':
      return alsDing(kuscheltier(B, T, H, eigen, f), 'ganz')
    case 'bausteine':
      return alsDing(bausteine(B, T, H, f), 'ganz')
    case 'spielkueche':
      return spielkueche(B, T, H, eigen, f, neueGruppe)
    case 'buecher':
      return alsDing(buecher(B, T, H, eigen, f), 'ganz')
    case 'bild':
      return bild(B, T, H, eigen, f)
    case 'kissen':
      return alsDing(kissen(B, T, H, eigen, f), 'ganz')
    case 'wolldecke':
      return alsDing(wolldecke(B, T, H, eigen, f), 'ganz')
    case 'korb': {
      const teile = korb(B, T, H, o.name ?? '', eigen, f)
      return B <= 60 && T <= 60 ? alsDing(teile, 'ganz') : teile
    }
    case 'vorhang':
      return vorhang(B, T, H, eigen, f)
    case 'obstschale':
      return alsDing(obstschale(B, T, H, eigen, f), 'ganz')
    case 'blumenkasten':
      return blumenkasten(B, T, H, eigen, f)
    /* E91: Bad und WC. */
    case 'handtuch':
      return handtuch(B, T, H, o.name ?? '', eigen, f)
    case 'handtuchstapel':
      return alsDing(handtuchstapel(B, T, H, o.name ?? '', eigen, f), 'ganz')
    case 'badaccessoires':
      return badaccessoires(B, T, H, eigen, f)
    case 'seifenschale':
      return alsDing(seifenschaleTeile(0, 0, B, T, H, eigen ?? f.keramik, f), 'ganz')
    case 'kerzen':
      return alsDing(kerzen(B, T, H, eigen, f), 'ganz')
    case 'duftstaebchen':
      return alsDing(duftstaebchen(B, T, H, eigen, f), 'ganz')
    case 'badewannenablage':
      return badewannenablage(B, T, H, eigen, f)
    case 'klopapierhalter':
      return klopapierhalter(B, T, H, eigen, f)
    case 'klobuerste':
      return alsDing(klobuerste(B, T, H, eigen, f), 'ganz')
    case 'bademantel':
      return bademantel(B, T, H, o.name ?? '', eigen, f)
    case 'wandregal':
      return wandregal(B, T, H, eigen, f)
    default:
      return null
  }
}
