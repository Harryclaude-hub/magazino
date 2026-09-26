/* Moebel in 3D mit Form statt als Klotz: Couch mit Sockel, Sitz- und
 * Rueckenpolstern, Armlehnen und Fuessen; Bett mit Rahmen, Matratze,
 * Kissen und Decke; Tisch mit Beinen; Kueche mit Sockel, Fronten,
 * Arbeitsplatte, Rueckwand und Oberschraenken; Bad in Keramik usw.
 *
 * Alles in den lokalen Koordinaten des Moebels (cm): x entlang der
 * Breite, y entlang der Tiefe (y = 0 an der Wand), z nach oben ab der
 * Unterkante. szene.ts dreht und stellt es an seinen Platz.
 *
 * Die Farben kommen aus den Tokens (Farben3D). Hat das Moebel eine eigene
 * Farbe, traegt sie der Hauptteil (Stoff der Couch, Korpus der Kommode);
 * Polster und Kanten sind leicht hellere oder dunklere Toene davon. */
import type { Objekt } from '../../lib/types'
import type { MoebelArt } from '../plan/moebelArt.ts'

/** Die Farben, die dieser Teil braucht (Auszug aus Farben3D). */
export interface MoebelFarben {
  objekt: string
  holz: string
  holzDunkel: string
  stoff: string
  waesche: string
  keramik: string
  metall: string
  schwarz: string
  front: string
  platte: string
  weiss: string
  gruen: string
  topf: string
  teppich: string
  glas: string
}

/** Ein Quader im Moebel: x0..x1, y0..y1 (lokal), z0..z1 (Hoehe), cm. */
export interface Teil {
  x0: number
  y0: number
  x1: number
  y1: number
  z0: number
  z1: number
  farbe: string
  deckkraft?: number
}

/** Farbe heller (faktor > 1) oder dunkler (< 1). */
export function ton(hex: string, faktor: number): string {
  if (!hex || hex.length < 7) return hex
  const n = parseInt(hex.slice(1, 7), 16)
  if (Number.isNaN(n)) return hex
  const k = (v: number) => {
    const w = faktor >= 1 ? v + (255 - v) * (faktor - 1) : v * faktor
    return Math.max(0, Math.min(255, Math.round(w)))
  }
  const r = k((n >> 16) & 255)
  const g = k((n >> 8) & 255)
  const b = k(n & 255)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

type O = Pick<Objekt, 'breite_cm' | 'tiefe_cm' | 'hoehe_cm' | 'form' | 'ausschnitt_breite_cm' | 'ausschnitt_tiefe_cm' | 'ausschnitt_ecke' | 'farbe'>

/** Rechteck in einem Rahmen mit der freien Ecke rechts oben ('ro') auf die
 *  echte Ecke spiegeln (wie das L-Zeichen in 2D). */
function spiegler(o: O) {
  const B = o.breite_cm
  const T = o.tiefe_cm
  const e = o.ausschnitt_ecke ?? 'ro'
  const sx = e === 'lo' || e === 'lu'
  const sy = e === 'ru' || e === 'lu'
  return (t: Teil): Teil => ({
    ...t,
    x0: sx ? B - t.x1 : t.x0,
    x1: sx ? B - t.x0 : t.x1,
    y0: sy ? T - t.y1 : t.y0,
    y1: sy ? T - t.y0 : t.y1,
  })
}

const t = (x0: number, y0: number, x1: number, y1: number, z0: number, z1: number, farbe: string, deckkraft?: number): Teil => ({
  x0,
  y0,
  x1,
  y1,
  z0,
  z1,
  farbe,
  deckkraft,
})

/** Vier Beine an den Ecken, eingerueckt. */
function beine(B: number, T: number, dicke: number, ein: number, oben: number, farbe: string): Teil[] {
  const d = Math.min(dicke, B / 4, T / 4)
  return [
    t(ein, ein, ein + d, ein + d, 0, oben, farbe),
    t(B - ein - d, ein, B - ein, ein + d, 0, oben, farbe),
    t(ein, T - ein - d, ein + d, T - ein, 0, oben, farbe),
    t(B - ein - d, T - ein - d, B - ein, T - ein, 0, oben, farbe),
  ]
}

/** Nebeneinander liegende Polster zwischen x0 und x1, mit Fuge. */
function polster(x0: number, x1: number, n: number, y0: number, y1: number, z0: number, z1: number, farbe: string): Teil[] {
  const out: Teil[] = []
  const w = (x1 - x0) / n
  for (let i = 0; i < n; i++) out.push(t(x0 + i * w + 0.5, y0, x0 + (i + 1) * w - 0.5, y1, z0, z1, farbe))
  return out
}

function couch(B: number, T: number, H: number, stoff: string, f: MoebelFarben, einsitzer: boolean): Teil[] {
  const arm = Math.min(22, B * 0.14)
  const lehne = Math.min(22, T * 0.26)
  const sitzOben = Math.min(46, H * 0.55)
  const n = einsitzer ? 1 : B - 2 * arm > 170 ? 3 : 2
  return [
    ...beine(B, T, 5, 3, 8, f.holzDunkel),
    t(0, 0, B, T, 8, sitzOben - 10, ton(stoff, 0.9)),
    ...polster(arm, B - arm, n, lehne, T - 1, sitzOben - 10, sitzOben, ton(stoff, 1.08)),
    t(0, 0, B, lehne, sitzOben - 10, H, stoff),
    ...polster(arm, B - arm, n, lehne, lehne + Math.min(14, T * 0.16), sitzOben, H - 6, ton(stoff, 1.14)),
    t(0, lehne, arm, T, sitzOben - 10, sitzOben + 16, ton(stoff, 0.96)),
    t(B - arm, lehne, B, T, sitzOben - 10, sitzOben + 16, ton(stoff, 0.96)),
  ]
}

/** L-Couch: Lehne an den beiden Aussenseiten, Armlehnen an den freien Enden. */
function lCouch(o: O, stoff: string): Teil[] {
  const B = o.breite_cm
  const T = o.tiefe_cm
  const H = o.hoehe_cm
  const aB = o.ausschnitt_breite_cm ?? 0
  const aT = o.ausschnitt_tiefe_cm ?? 0
  const schenkel = B - aB
  const lehne = Math.min(22, schenkel * 0.3, (T - aT) * 0.3)
  const arm = Math.min(20, schenkel * 0.2)
  const sitz = Math.min(46, H * 0.55)
  const polsterFarbe = ton(stoff, 1.08)
  // Rahmen mit freier Ecke rechts oben: langer Teil unten (y aT..T), Schenkel links (x 0..schenkel).
  const teile: Teil[] = [
    t(0, aT, B, T, 4, sitz - 10, ton(stoff, 0.9)),
    t(0, 0, schenkel, aT, 4, sitz - 10, ton(stoff, 0.9)),
    t(0, T - lehne, B, T, sitz - 10, H, stoff),
    t(0, 0, lehne, T - lehne, sitz - 10, H, stoff),
    t(0, 0, schenkel, arm, sitz - 10, sitz + 16, ton(stoff, 0.96)),
    t(B - arm, aT, B, T - lehne, sitz - 10, sitz + 16, ton(stoff, 0.96)),
    ...polster(lehne, B - arm, Math.max(2, Math.round((B - arm - lehne) / 75)), aT, T - lehne, sitz - 10, sitz, polsterFarbe),
    t(lehne, arm, schenkel - 0.5, aT - 0.5, sitz - 10, sitz, polsterFarbe),
  ]
  return teile.map(spiegler(o))
}

function bett(B: number, T: number, stoff: string, f: MoebelFarben): Teil[] {
  const matratze = 52
  const out: Teil[] = [
    t(0, 0, B, T, 0, 30, f.holz),
    t(0, 0, B, 6, 0, 100, ton(f.holz, 0.92)),
    t(3, 6, B - 3, T - 3, 30, matratze, f.waesche),
    t(2, T * 0.34, B - 2, T - 2, matratze, matratze + 6, stoff),
  ]
  const kissen = B >= 130 ? 2 : 1
  const w = (B - 16) / kissen
  for (let i = 0; i < kissen; i++) out.push(t(8 + i * w + 2, 10, 8 + (i + 1) * w - 2, Math.min(T * 0.3, 55), matratze, matratze + 11, ton(f.waesche, 1.05)))
  return out
}

function tisch(B: number, T: number, H: number, holz: string): Teil[] {
  return [t(0, 0, B, T, H - 4, H, holz), ...beine(B, T, 6, 4, H - 4, ton(holz, 0.8))]
}

function stuhl(x0: number, y0: number, x1: number, y1: number, lehneBeiY0: boolean, holz: string, f: MoebelFarben): Teil[] {
  const B = x1 - x0
  const T = y1 - y0
  const lehne = Math.min(5, T * 0.12)
  const ly0 = lehneBeiY0 ? y0 : y1 - lehne
  const ly1 = lehneBeiY0 ? y0 + lehne : y1
  return [
    ...beine(B, T, 3.5, 2, 44, ton(holz, 0.8)).map((b) => ({ ...b, x0: b.x0 + x0, x1: b.x1 + x0, y0: b.y0 + y0, y1: b.y1 + y0 })),
    t(x0, y0, x1, y1, 44, 48, holz),
    t(x0, ly0, x1, ly1, 48, 90, holz),
    t(x0 + B * 0.1, y0 + 2, x1 - B * 0.1, y1 - 2, 48, 50, f.stoff),
  ]
}

/** Kasten mit Sockel, Korpus und Fronten (Kommode, Sideboard, TV-Board). */
function kasten(B: number, T: number, H: number, korpus: string, reihen: number, spalten: number, f: MoebelFarben): Teil[] {
  const sockel = Math.min(8, H * 0.1)
  const out: Teil[] = [t(3, 0, B - 3, T - 3, 0, sockel, f.holzDunkel), t(0, 0, B, T - 1, sockel, H, korpus)]
  const hoch = (H - sockel - 2) / reihen
  const breit = (B - 2) / spalten
  for (let r = 0; r < reihen; r++) {
    for (let s = 0; s < spalten; s++) {
      out.push(t(1 + s * breit + 0.4, T - 1, 1 + (s + 1) * breit - 0.4, T, sockel + 1 + r * hoch + 0.4, sockel + 1 + (r + 1) * hoch - 0.4, ton(korpus, 1.04)))
    }
  }
  return out
}

/** Eine gerade Kuechenzeile von x0 bis x1, Wand bei y = wandY, Front zur
 *  anderen Seite. Mit Sockel, Fronten (Fugen alle 60 cm), Arbeitsplatte,
 *  Rueckwand und Oberschraenken bis unter die Decke. */
function zeile(x0: number, x1: number, y0: number, y1: number, wandBeiY0: boolean, H: number, decke: number, f: MoebelFarben): Teil[] {
  const out: Teil[] = []
  const tief = y1 - y0
  const frontY0 = wandBeiY0 ? y1 - 1 : y0
  const frontY1 = wandBeiY0 ? y1 : y0 + 1
  const sockelY0 = wandBeiY0 ? y0 : y0 + 6
  const sockelY1 = wandBeiY0 ? y1 - 6 : y1
  out.push(t(x0, sockelY0, x1, sockelY1, 0, 10, ton(f.platte, 1.2)))
  out.push(t(x0, wandBeiY0 ? y0 : y0 + 1, x1, wandBeiY0 ? y1 - 1 : y1, 10, H - 4, ton(f.front, 0.95)))
  const n = Math.max(1, Math.round((x1 - x0) / 60))
  const w = (x1 - x0) / n
  for (let i = 0; i < n; i++) out.push(t(x0 + i * w + 0.3, frontY0, x0 + (i + 1) * w - 0.3, frontY1, 10.5, H - 4.5, f.front))
  out.push(t(x0, y0, x1, y1, H - 4, H, f.platte))
  // Rueckwand und Oberschraenke an der Wand.
  const wy0 = wandBeiY0 ? y0 : y1 - 1.5
  const wy1 = wandBeiY0 ? y0 + 1.5 : y1
  const oben = Math.min(decke - 1, H + 55 + 90)
  out.push(t(x0, wy0, x1, wy1, H, H + 55, ton(f.platte, 1.1)))
  if (decke - (H + 55) >= 40) {
    const ob0 = wandBeiY0 ? y0 : y1 - Math.min(35, tief)
    const ob1 = wandBeiY0 ? y0 + Math.min(35, tief) : y1
    out.push(t(x0, ob0, x1, ob1, H + 55, oben, ton(f.front, 0.95)))
    const fy0 = wandBeiY0 ? ob1 - 1 : ob0
    const fy1 = wandBeiY0 ? ob1 : ob0 + 1
    for (let i = 0; i < n; i++) out.push(t(x0 + i * w + 0.3, fy0, x0 + (i + 1) * w - 0.3, fy1, H + 55.5, oben - 0.5, f.front))
  }
  return out
}

function kochfeld(x0: number, y0: number, x1: number, y1: number, H: number, f: MoebelFarben): Teil {
  return t(x0, y0, x1, y1, H, H + 0.6, f.schwarz)
}

/** Spuelbecken mit Hahn; der Hahn steht an der Wandseite (y0 oder x0). */
function becken(x0: number, y0: number, x1: number, y1: number, H: number, f: MoebelFarben, hahnBeiX0 = false): Teil[] {
  const mx = (x0 + x1) / 2
  const my = (y0 + y1) / 2
  const hahn = hahnBeiX0 ? t(x0 - 6, my - 2, x0 - 2, my + 2, H, H + 28, f.metall) : t(mx - 2, y0 - 6, mx + 2, y0 - 2, H, H + 28, f.metall)
  return [t(x0, y0, x1, y1, H, H + 0.6, ton(f.schwarz, 1.3)), hahn]
}

function kueche(o: O, decke: number, f: MoebelFarben): Teil[] {
  const B = o.breite_cm
  const T = o.tiefe_cm
  const H = o.hoehe_cm
  if (o.form !== 'l' || !o.ausschnitt_breite_cm || !o.ausschnitt_tiefe_cm) {
    const kf = Math.min(60, B * 0.3)
    return [
      ...zeile(0, B, 0, T, true, H, decke, f),
      kochfeld(B - kf - 10, 6, B - 10, T - 8, H, f),
      ...becken(12, 12, 12 + Math.min(60, B * 0.25), T - 10, H, f),
    ]
  }
  // Rahmen mit freier Ecke rechts oben: langer Teil unten an der Wand (y = T),
  // Schenkel links an der Wand (x = 0). Kochfeld im langen Teil, Spuele im Schenkel.
  const aB = o.ausschnitt_breite_cm
  const aT = o.ausschnitt_tiefe_cm
  const schenkel = B - aB
  const kf = Math.min(60, aB * 0.8)
  // Der Schenkel laeuft quer: aus einer geraden Zeile (Wand bei y = 0)
  // durch Tauschen der Achsen, Wand dann bei x = 0, Front bei x = schenkel.
  const quer = zeile(0, aT, 0, schenkel, true, H, decke, f).map((q) => ({ ...q, x0: q.y0, x1: q.y1, y0: q.x0, y1: q.x1 }))
  const bw = Math.min(50, aT * 0.4)
  const teile: Teil[] = [
    ...zeile(0, B, aT, T, false, H, decke, f),
    ...quer,
    kochfeld(B - kf - 10, aT + 8, B - 10, T - 8, H, f),
    ...becken(10, aT / 2 - bw / 2, schenkel - 10, aT / 2 + bw / 2, H, f, true),
  ]
  return teile.map(spiegler(o))
}

/** Die Teile eines Moebels; null = unbekannte Art, dann bleibt es ein Klotz. */
export function moebelTeile(o: O, art: MoebelArt | null, f: MoebelFarben, decke: number): Teil[] | null {
  const B = o.breite_cm
  const T = o.tiefe_cm
  const H = o.hoehe_cm
  const eigen = o.farbe
  switch (art) {
    case 'sofa':
      if (o.form === 'l' && o.ausschnitt_breite_cm && o.ausschnitt_tiefe_cm) return lCouch(o, eigen ?? f.stoff)
      return couch(B, T, H, eigen ?? f.stoff, f, false)
    case 'sessel':
      return couch(B, T, H, eigen ?? f.stoff, f, true)
    case 'bett':
      return bett(B, T, eigen ?? f.stoff, f)
    case 'kinderbett': {
      const weiss = eigen ?? f.weiss
      const out: Teil[] = [t(0, 0, B, T, 25, 30, weiss), t(3, 3, B - 3, T - 3, 30, 40, f.waesche)]
      for (const [x0, y0] of [[0, 0], [B - 4, 0], [0, T - 4], [B - 4, T - 4]]) out.push(t(x0, y0, x0 + 4, y0 + 4, 0, H, weiss))
      out.push(t(0, 0, B, 3, H - 4, H, weiss), t(0, T - 3, B, T, H - 4, H, weiss))
      for (let x = 10; x < B - 6; x += 9) {
        out.push(t(x, 0.5, x + 2, 2.5, 30, H - 4, weiss), t(x, T - 2.5, x + 2, T - 0.5, 30, H - 4, weiss))
      }
      return out
    }
    case 'tisch':
    case 'couchtisch':
    case 'schreibtisch': {
      const holz = eigen ?? f.holz
      const out = tisch(B, T, H, holz)
      if (art === 'couchtisch') out.push(t(4, 4, B - 4, T - 4, 10, 12, ton(holz, 0.9)))
      return out
    }
    case 'esstisch_rund': {
      const holz = eigen ?? f.holz
      return [
        t(B * 0.15, 0, B * 0.85, T, H - 4, H, holz),
        t(0, T * 0.15, B, T * 0.85, H - 4, H, holz),
        t(B * 0.44, T * 0.44, B * 0.56, T * 0.56, 3, H - 4, ton(holz, 0.8)),
        t(B * 0.3, T * 0.3, B * 0.7, T * 0.7, 0, 3, ton(holz, 0.8)),
      ]
    }
    case 'essgruppe': {
      const holz = eigen ?? f.holz
      const tx0 = B * 0.1
      const tx1 = B * 0.9
      const ty0 = T * 0.27
      const ty1 = T * 0.73
      const out: Teil[] = tisch(tx1 - tx0, ty1 - ty0, 75, holz).map((q) => ({ ...q, x0: q.x0 + tx0, x1: q.x1 + tx0, y0: q.y0 + ty0, y1: q.y1 + ty0 }))
      const c = Math.min(45, T * 0.3)
      for (const cx of [B * 0.3, B * 0.7]) {
        out.push(...stuhl(cx - c / 2, 0, cx + c / 2, c, true, holz, f))
        out.push(...stuhl(cx - c / 2, T - c, cx + c / 2, T, false, holz, f))
      }
      return out
    }
    case 'stuhl':
      return stuhl(0, 0, B, T, true, eigen ?? f.holz, f)
    case 'buerostuhl': {
      const s = eigen ?? f.schwarz
      return [
        t(0, T * 0.45, B, T * 0.55, 0, 5, f.schwarz),
        t(B * 0.45, 0, B * 0.55, T, 0, 5, f.schwarz),
        t(B * 0.45, T * 0.45, B * 0.55, T * 0.55, 5, 42, f.metall),
        t(B * 0.1, T * 0.15, B * 0.9, T * 0.9, 42, 50, s),
        t(B * 0.15, 0, B * 0.85, T * 0.12, 55, H, s),
      ]
    }
    case 'fernseher': {
      if (T <= 12) return [t(0, 0, B, Math.min(T, 6), 0, H, f.schwarz)]
      return [
        t(B * 0.35, T * 0.2, B * 0.65, T * 0.8, 0, 2, f.metall),
        t(B * 0.47, T * 0.45, B * 0.53, T * 0.55, 2, H * 0.15, f.metall),
        t(0, T * 0.44, B, T * 0.56, H * 0.15, H, f.schwarz),
      ]
    }
    case 'tv_board':
      return kasten(B, T, H, eigen ?? f.weiss, 1, Math.max(2, Math.round(B / 60)), f)
    case 'kommode':
      return kasten(B, T, H, eigen ?? f.holz, Math.max(2, Math.round(H / 25)), B > 120 ? 2 : 1, f)
    case 'sideboard':
      return kasten(B, T, H, eigen ?? f.holz, 1, Math.max(2, Math.round(B / 50)), f)
    case 'schuhschrank':
      return kasten(B, T, H, eigen ?? f.weiss, 2, 1, f)
    case 'nachttisch':
      return kasten(B, T, H, eigen ?? f.holz, 2, 1, f)
    case 'kuehlschrank':
    case 'gefrierschrank': {
      const k = eigen ?? f.weiss
      const out: Teil[] = [t(0, 0, B, T - 1, 0, H, ton(k, 0.96))]
      if (art === 'kuehlschrank' && H > 120) {
        out.push(t(0.5, T - 1, B - 0.5, T, 0.5, H * 0.35 - 0.5, k), t(0.5, T - 1, B - 0.5, T, H * 0.35 + 0.5, H - 0.5, k))
      } else out.push(t(0.5, T - 1, B - 0.5, T, 0.5, H - 0.5, k))
      out.push(t(B - 6, T, B - 4, T + 2, H * 0.4, H * 0.6, f.metall))
      return out
    }
    case 'waschmaschine':
    case 'trockner':
      return [
        t(0, 0, B, T - 1, 0, H, f.weiss),
        t(B * 0.2, T - 1, B * 0.8, T, H * 0.2, H * 0.62, art === 'trockner' ? ton(f.glas, 0.7) : ton(f.schwarz, 1.5)),
        t(B * 0.05, T - 1, B * 0.6, T, H * 0.84, H * 0.95, ton(f.weiss, 0.93)),
      ]
    case 'geschirrspueler':
      return [t(0, 0, B, T - 1, 0, H, ton(f.front, 0.95)), t(0.3, T - 1, B - 0.3, T, 10, H - 0.5, f.front), t(0, 0, B, T, H - 4, H, f.platte)]
    case 'herd':
      return [...zeile(0, B, 0, T, true, H, 0, f).filter((q) => q.z1 <= H + 0.01), kochfeld(4, 6, B - 4, T - 8, H, f), t(3, T - 1, B - 3, T + 0.5, 20, H - 12, f.schwarz)]
    case 'spuele':
      return [...zeile(0, B, 0, T, true, H, 0, f).filter((q) => q.z1 <= H + 0.01), ...becken(8, 10, B - 8, T - 10, H, f)]
    case 'kuechenzeile':
      return kueche(o, decke, f)
    case 'backofen': {
      const out: Teil[] = [t(0, 0, B, T - 1, 0, H, ton(f.front, 0.95)), t(3, 0, B - 3, T - 7, 0, 10, ton(f.platte, 1.2))]
      out.push(t(0.3, T - 1, B - 0.3, T, 10.5, 80, f.front))
      out.push(t(1, T - 1, B - 1, T + 0.5, 82, 142, f.schwarz))
      out.push(t(1, T - 1, B - 1, T + 0.5, 144, 182, f.schwarz))
      if (H > 186) out.push(t(0.3, T - 1, B - 0.3, T, 184, H - 0.5, f.front))
      return out
    }
    case 'wc':
      return [
        t(B * 0.3, T * 0.3, B * 0.7, T * 0.85, 0, 36, f.keramik),
        t(B * 0.08, T * 0.25, B * 0.92, T, 36, 42, ton(f.keramik, 0.97)),
        t(B * 0.05, 0, B * 0.95, T * 0.22, 0, Math.min(H, 82), f.keramik),
      ]
    case 'waschbecken':
      return [
        t(0, 0, B, T, H - 15, H, f.keramik),
        t(B * 0.15, T * 0.2, B * 0.85, T * 0.85, H, H + 0.4, ton(f.keramik, 0.9)),
        t(B / 2 - 2, 2, B / 2 + 2, 8, H, H + 20, f.metall),
        t(B * 0.4, 0, B * 0.6, T * 0.4, 0, H - 15, ton(f.keramik, 0.97)),
      ]
    case 'badewanne':
      return [t(0, 0, B, T, 0, H, f.keramik), t(6, 6, B - 6, T - 6, H, H + 0.4, ton(f.keramik, 0.9))]
    case 'dusche':
      return [t(0, 0, B, T, 0, Math.max(3, H), f.keramik), t(0, T - 1, B, T, H, 200, f.glas, 0.25), t(B - 1, 0, B, T, H, 200, f.glas, 0.25)]
    case 'teppich':
      return [t(0, 0, B, T, 0, Math.max(1, H), eigen ?? f.teppich)]
    case 'stehlampe':
      return [
        t(B * 0.25, T * 0.25, B * 0.75, T * 0.75, 0, 3, f.metall),
        t(B * 0.46, T * 0.46, B * 0.54, T * 0.54, 3, H - 30, f.metall),
        t(B * 0.1, T * 0.1, B * 0.9, T * 0.9, H - 30, H, eigen ?? f.waesche),
      ]
    case 'pflanze':
      return [t(B * 0.25, T * 0.25, B * 0.75, T * 0.75, 0, H * 0.3, f.topf), t(0, 0, B, T, H * 0.3, H, eigen ?? f.gruen)]
    case 'klavier':
      return [
        t(0, 0, B, T * 0.55, 0, H, eigen ?? f.schwarz),
        t(0, T * 0.55, B, T, 62, 72, eigen ?? f.schwarz),
        t(3, T * 0.58, B - 3, T * 0.95, 72, 73, f.weiss),
      ]
    case 'garderobe':
      return [
        t(0, 0, B, 2, 90, H, eigen ?? f.holz),
        ...[0.2, 0.4, 0.6, 0.8].map((x) => t(B * x - 1.5, 2, B * x + 1.5, 10, 160, 163, f.metall)),
        t(0, 0, B, T, 40, 45, eigen ?? f.holz),
        t(0, 0, 3, T, 0, 40, eigen ?? f.holz),
        t(B - 3, 0, B, T, 0, 40, eigen ?? f.holz),
      ]
    case 'fahrrad': {
      const r = Math.min(H * 0.66, B * 0.36)
      return [
        t(0, T * 0.47, r, T * 0.53, 0, r, f.schwarz),
        t(B - r, T * 0.47, B, T * 0.53, 0, r, f.schwarz),
        t(r * 0.5, T * 0.48, B - r * 0.5, T * 0.52, r * 0.55, r * 0.7, eigen ?? f.metall),
        t(B * 0.3, T * 0.3, B * 0.42, T * 0.7, H * 0.85, H * 0.9, f.schwarz),
      ]
    }
    default:
      return null
  }
}
