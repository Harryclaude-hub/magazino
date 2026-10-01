/* Deko und Spielzeug in 3D (E82) und die kleinen Bausteine, aus denen
 * auch moebel3d.ts seine Moebel baut.
 *
 * Deko: Spielzeugkiste, Kuscheltier, Bausteine, Spielkueche (wie DUKTIG),
 * Buecher, Bild, Kissen, Wolldecke, Korb, Vorhang, Obstschale und
 * Blumenkasten. Alles rund, in echten Groessen innerhalb von B x T x H,
 * in der eigenen Farbe des Objekts oder in einem ruhigen Token-Ton.
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
 *  eingerollte Decke. */
function korb(B: number, T: number, H: number, eigen: string | null, f: MoebelFarben): Teil[] {
  const farbe = eigen ?? misch(f.pappe, f.leinen, 0.35)
  const dunkel = ton(farbe, 0.78)
  const innen = ton(farbe, 0.5)
  const decke = misch(f.spielRot, f.leinen, 0.5)
  const rolle = H >= 20 && Math.min(B, T) >= 20
  const hk = rolle ? H * 0.8 : H
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
      zyl(t(cx - B * 0.44, cy - T * 0.44, cx + B * 0.44, cy + T * 0.44, hk, hk + 0.15, innen)),
    )
    if (rolle) out.push(zyl(t(cx - B * 0.2, cy - T * 0.2, cx + B * 0.2, cy + T * 0.2, hk * 0.4, H, decke)))
  } else {
    out.push(
      rd(t(0.4, 0.4, B - 0.4, T - 0.4, 0, hk, farbe), 3),
      rd(t(0, 0, B, T, hk - 2.5, hk, dunkel), 1.2),
      rd(t(0, 0, B, T, hk * 0.3, hk * 0.3 + 1.2, dunkel), 0.6),
      rd(t(0, 0, B, T, hk * 0.62, hk * 0.62 + 1.2, dunkel), 0.6),
      t(2, 2, B - 2, T - 2, hk, hk + 0.15, innen),
      rd(t(0, T * 0.36, 0.5, T * 0.64, hk * 0.68, hk * 0.84, innen), 0.2),
      rd(t(B - 0.5, T * 0.36, B, T * 0.64, hk * 0.68, hk * 0.84, innen), 0.2),
    )
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
      const teile = korb(B, T, H, eigen, f)
      return B <= 60 && T <= 60 ? alsDing(teile, 'ganz') : teile
    }
    case 'vorhang':
      return vorhang(B, T, H, eigen, f)
    case 'obstschale':
      return alsDing(obstschale(B, T, H, eigen, f), 'ganz')
    case 'blumenkasten':
      return blumenkasten(B, T, H, eigen, f)
    default:
      return null
  }
}
