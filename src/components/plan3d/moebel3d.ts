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
import { bankStuecke, type MoebelArt } from '../plan/moebelArt.ts'

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
  wand3d: string
  spiegel: string
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
  /** Eigener Glanz (Metall, Keramik, Kochfeld); sonst der des Materials. */
  glanz?: number
  /** Leuchtet, wenn das Licht im Raum an ist (LED, Lampenschirm), E74. */
  leuchte?: boolean
  /** Ecken abgerundet, Radius in cm (E81). Polster, Matratzen, Kissen weit,
   *  Holz und Fronten fein; ohne Angabe legt der Motor eine Fase an. */
  rund?: number
  /** Rund statt eckig (E81), im Quader x0..z1: Zylinder (oben: oberer
   *  Radius zum unteren, unter 1 ein Kegel nach oben spitz; achse hoch,
   *  laengs = Breite, quer = Tiefe) oder Kugel. */
  form?: { art: 'zylinder'; oben?: number; achse?: 'hoch' | 'laengs' | 'quer' } | { art: 'kugel' }
  /** Laesst sich oeffnen (E68). Beschrieben relativ zur langen und kurzen
   *  Seite des Teils, damit Spiegeln und Achsentausch es nicht aendern:
   *  Tuer: Angel am Anfang ('min') oder Ende ('max') der langen Seite,
   *  oeffnet nach auf (+1/-1 entlang der kurzen Seite). Schublade: faehrt
   *  weit cm nach auf; alle Teile derselben gruppe fahren mit. */
  front?: Front
}

export type Front = { art: 'tuer'; angel: 'min' | 'max'; auf: 1 | -1 } | { art: 'schub'; auf: 1 | -1; weit: number; gruppe: number }

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

type O = Pick<Objekt, 'breite_cm' | 'tiefe_cm' | 'hoehe_cm' | 'form' | 'ausschnitt_breite_cm' | 'ausschnitt_tiefe_cm' | 'ausschnitt_ecke' | 'farbe'> &
  Partial<Pick<Objekt, 'name' | 'material'>>

/** Rechteck in einem Rahmen mit der freien Ecke rechts oben ('ro') auf die
 *  echte Ecke spiegeln (wie das L-Zeichen in 2D). */
function spiegler(o: O) {
  const B = o.breite_cm
  const T = o.tiefe_cm
  const e = o.ausschnitt_ecke ?? 'ro'
  const sx = e === 'lo' || e === 'lu'
  const sy = e === 'ru' || e === 'lu'
  return (t: Teil): Teil => {
    let front = t.front
    if (front) {
      // Lange Seite entlang x: sx dreht die Angel, sy die Richtung; sonst umgekehrt.
      const breitX = t.x1 - t.x0 >= t.y1 - t.y0
      const lang = breitX ? sx : sy
      const kurz = breitX ? sy : sx
      const auf = (kurz ? -front.auf : front.auf) as 1 | -1
      front = front.art === 'tuer' ? { ...front, auf, angel: lang ? (front.angel === 'min' ? 'max' : 'min') : front.angel } : { ...front, auf }
    }
    return {
      ...t,
      x0: sx ? B - t.x1 : t.x0,
      x1: sx ? B - t.x0 : t.x1,
      y0: sy ? T - t.y1 : t.y0,
      y1: sy ? T - t.y0 : t.y1,
      front,
    }
  }
}

/** Fortlaufende Nummer der Schubladen in einem Moebel. */
let schubNr = 0

/** Tuer als Teil: Angel links (min) oder rechts (max), oeffnet nach auf. */
function tuer(x0: number, y0: number, x1: number, y1: number, z0: number, z1: number, farbe: string, angel: 'min' | 'max', auf: 1 | -1): Teil {
  return { ...t(x0, y0, x1, y1, z0, z1, farbe), front: { art: 'tuer', angel, auf } }
}

/** Schublade: Front und Schubkasten dahinter, beide fahren um weit heraus.
 *  Front bei y0..y1 (duenn), Kasten reicht tief in den Korpus. */
function schublade(x0: number, x1: number, frontY0: number, frontY1: number, z0: number, z1: number, tief: number, auf: 1 | -1, front: string, kasten: string): Teil[] {
  const gruppe = ++schubNr
  const f: Front = { art: 'schub', auf, weit: tief * 0.8, gruppe }
  const k0 = auf > 0 ? frontY0 - tief + 2 : frontY1
  const k1 = auf > 0 ? frontY0 : frontY1 + tief - 2
  return [
    { ...t(x0, frontY0, x1, frontY1, z0, z1, front), front: f },
    { ...t(x0 + 2, k0, x1 - 2, k1, z0 + 2, z1 - 4, kasten), front: f },
  ]
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

/** Abgerundet, Radius in cm (E81). */
const rd = (q: Teil, rund: number): Teil => ({ ...q, rund })
/** Als Zylinder im Quader des Teils (E81). */
const zyl = (q: Teil, oben = 1, achse: 'hoch' | 'laengs' | 'quer' = 'hoch'): Teil => ({ ...q, form: { art: 'zylinder', oben, achse } })
/** Als Kugel im Quader des Teils (E81). */
const kugel = (q: Teil): Teil => ({ ...q, form: { art: 'kugel' } })

/** Vier Beine an den Ecken, eingerueckt. rund: gedrechselt (Zylinder,
 *  nach unten etwas schmaler), sonst kantig. */
function beine(B: number, T: number, dicke: number, ein: number, oben: number, farbe: string, rund = false): Teil[] {
  const d = Math.min(dicke, B / 4, T / 4)
  const bein = (q: Teil) => (rund ? zyl(q, 1.35) : rd(q, 0.4))
  return [
    bein(t(ein, ein, ein + d, ein + d, 0, oben, farbe)),
    bein(t(B - ein - d, ein, B - ein, ein + d, 0, oben, farbe)),
    bein(t(ein, T - ein - d, ein + d, T - ein, 0, oben, farbe)),
    bein(t(B - ein - d, T - ein - d, B - ein, T - ein, 0, oben, farbe)),
  ]
}

/** Nebeneinander liegende Polster zwischen x0 und x1, mit Fuge. Weich
 *  gerundet (E81): so weit, wie das Polster dick ist, nur nicht ganz. */
function polster(x0: number, x1: number, n: number, y0: number, y1: number, z0: number, z1: number, farbe: string): Teil[] {
  const out: Teil[] = []
  const w = (x1 - x0) / n
  const rund = Math.min(7, (z1 - z0) * 0.42, (y1 - y0) * 0.42, w * 0.3)
  for (let i = 0; i < n; i++) out.push(rd(t(x0 + i * w + 0.6, y0, x0 + (i + 1) * w - 0.6, y1, z0, z1, farbe), rund))
  return out
}

function couch(B: number, T: number, H: number, stoff: string, f: MoebelFarben, einsitzer: boolean): Teil[] {
  const arm = Math.min(22, B * 0.14)
  const lehne = Math.min(22, T * 0.26)
  const sitzOben = Math.min(46, H * 0.55)
  const n = einsitzer ? 1 : B - 2 * arm > 170 ? 3 : 2
  return [
    ...beine(B, T, 5, 4, 8, f.holzDunkel, true),
    rd(t(0, 0, B, T, 8, sitzOben - 10, ton(stoff, 0.9)), 3),
    ...polster(arm, B - arm, n, lehne, T - 1, sitzOben - 10, sitzOben, ton(stoff, 1.08)),
    rd(t(0, 0, B, lehne, sitzOben - 10, H, stoff), 7),
    ...polster(arm, B - arm, n, lehne, lehne + Math.min(14, T * 0.16), sitzOben, H - 6, ton(stoff, 1.14)),
    rd(t(0, lehne - 4, arm, T, sitzOben - 10, sitzOben + 16, ton(stoff, 0.96)), Math.min(9, arm * 0.45)),
    rd(t(B - arm, lehne - 4, B, T, sitzOben - 10, sitzOben + 16, ton(stoff, 0.96)), Math.min(9, arm * 0.45)),
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
    rd(t(0, aT, B, T, 4, sitz - 10, ton(stoff, 0.9)), 3),
    rd(t(0, 0, schenkel, aT, 4, sitz - 10, ton(stoff, 0.9)), 3),
    rd(t(0, T - lehne, B, T, sitz - 10, H, stoff), 7),
    rd(t(0, 0, lehne, T - lehne, sitz - 10, H, stoff), 7),
    rd(t(0, 0, schenkel, arm, sitz - 10, sitz + 16, ton(stoff, 0.96)), Math.min(9, arm * 0.45)),
    rd(t(B - arm, aT, B, T - lehne, sitz - 10, sitz + 16, ton(stoff, 0.96)), Math.min(9, arm * 0.45)),
    ...polster(lehne, B - arm, Math.max(2, Math.round((B - arm - lehne) / 75)), aT, T - lehne, sitz - 10, sitz, polsterFarbe),
    rd(t(lehne, arm, schenkel - 0.5, aT - 0.5, sitz - 10, sitz, polsterFarbe), 5),
  ]
  return teile.map(spiegler(o))
}

function bett(B: number, T: number, stoff: string, f: MoebelFarben): Teil[] {
  const matratze = 52
  const out: Teil[] = [
    rd(t(0, 0, B, T, 0, 30, f.holz), 1.2),
    rd(t(0, 0, B, 6, 0, 100, ton(f.holz, 0.92)), 2),
    rd(t(3, 6, B - 3, T - 3, 30, matratze, f.waesche), 5),
    rd(t(2, T * 0.34, B - 2, T - 2, matratze, matratze + 6, stoff), 3),
  ]
  const kissen = B >= 130 ? 2 : 1
  const w = (B - 16) / kissen
  for (let i = 0; i < kissen; i++) out.push(rd(t(8 + i * w + 2, 10, 8 + (i + 1) * w - 2, Math.min(T * 0.3, 55), matratze, matratze + 11, ton(f.waesche, 1.05)), 5))
  return out
}

function tisch(B: number, T: number, H: number, holz: string): Teil[] {
  return [rd(t(0, 0, B, T, H - 4, H, holz), 1.2), ...beine(B, T, 6, 4, H - 4, ton(holz, 0.8))]
}

/** Stuhl (E77): Rahmen etwas dunkler als Sitz und Lehne (Eiche mit
 *  Rattan wie STOCKHOLM), Lehne aus zwei Pfosten, oberem Riegel und
 *  Flaeche. Ein Sitzkissen nur bei Stoff. H: Hoehe bis zur Oberkante. */
function stuhl(x0: number, y0: number, x1: number, y1: number, lehneBeiY0: boolean, holz: string, f: MoebelFarben, H = 90, kissen = false): Teil[] {
  const B = x1 - x0
  const T = y1 - y0
  const sitz = Math.min(46, H * 0.55)
  const lehne = Math.min(4, T * 0.1)
  const ly0 = lehneBeiY0 ? y0 : y1 - lehne
  const ly1 = lehneBeiY0 ? y0 + lehne : y1
  const rahmen = ton(holz, 0.72)
  const pfosten = 3.5
  const out: Teil[] = [
    ...beine(B, T, 3.5, 1.5, sitz - 3, rahmen, true).map((b) => ({ ...b, x0: b.x0 + x0, x1: b.x1 + x0, y0: b.y0 + y0, y1: b.y1 + y0 })),
    rd(t(x0, y0, x1, y1, sitz - 4, sitz - 1.5, rahmen), 1.2),
    rd(t(x0 + 2, y0 + 2, x1 - 2, y1 - 2, sitz - 1.5, sitz, holz), 1),
    t(x0 + 1.5, ly0, x0 + 1.5 + pfosten, ly1, sitz, H, rahmen),
    t(x1 - 1.5 - pfosten, ly0, x1 - 1.5, ly1, sitz, H, rahmen),
    t(x0 + 1.5, ly0, x1 - 1.5, ly1, H - 6, H, rahmen),
    t(x0 + 1.5 + pfosten, ly0 + 0.6, x1 - 1.5 - pfosten, ly1 - 0.6, sitz + 10, H - 6, holz),
  ]
  if (kissen) out.push(rd(t(x0 + B * 0.1, y0 + 2, x1 - B * 0.1, y1 - 2, sitz, sitz + 3, f.stoff), 1.4))
  return out
}

/** Kasten mit Sockel, Korpus und Fronten (Kommode, Sideboard, TV-Board). */
function kasten(B: number, T: number, H: number, korpus: string, reihen: number, spalten: number, f: MoebelFarben): Teil[] {
  const sockel = Math.min(8, H * 0.1)
  const out: Teil[] = [t(3, 0, B - 3, T - 3, 0, sockel, f.holzDunkel), t(0, 0, B, T - 1, sockel, H, korpus)]
  const hoch = (H - sockel - 2) / reihen
  const breit = (B - 2) / spalten
  const front = ton(korpus, 1.04)
  for (let r = 0; r < reihen; r++) {
    for (let s = 0; s < spalten; s++) {
      const x0 = 1 + s * breit + 0.4
      const x1 = 1 + (s + 1) * breit - 0.4
      const z0 = sockel + 1 + r * hoch + 0.4
      const z1 = sockel + 1 + (r + 1) * hoch - 0.4
      if (reihen > 1) out.push(...schublade(x0, x1, T - 1, T, z0, z1, T - 4, 1, front, ton(korpus, 0.9)))
      else out.push(tuer(x0, T - 1, x1, T, z0, z1, front, s % 2 === 0 ? 'min' : 'max', 1))
    }
  }
  return out
}

/** Eine gerade Kuechenzeile von x0 bis x1, Wand bei y = wandY, Front zur
 *  anderen Seite. Mit Sockel, Fronten (Fugen alle 60 cm), Arbeitsplatte,
 *  Rueckwand und Oberschraenken bis unter die Decke. */
function zeile(
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  wandBeiY0: boolean,
  H: number,
  decke: number,
  f: MoebelFarben,
  kochfeldX: [number, number] | null = null,
): Teil[] {
  const out: Teil[] = []
  const auf: 1 | -1 = wandBeiY0 ? 1 : -1
  const tief = y1 - y0
  const frontY0 = wandBeiY0 ? y1 - 1 : y0
  const frontY1 = wandBeiY0 ? y1 : y0 + 1
  const sockelY0 = wandBeiY0 ? y0 : y0 + 6
  const sockelY1 = wandBeiY0 ? y1 - 6 : y1
  out.push(t(x0, sockelY0, x1, sockelY1, 0, 10, ton(f.platte, 1.2)))
  out.push(t(x0, wandBeiY0 ? y0 : y0 + 1, x1, wandBeiY0 ? y1 - 1 : y1, 10, H - 4, ton(f.front, 0.95)))
  const n = Math.max(1, Math.round((x1 - x0) / 60))
  const w = (x1 - x0) / n
  for (let i = 0; i < n; i++) {
    const a = x0 + i * w + 0.3
    const b = x0 + (i + 1) * w - 0.3
    const mitte = (a + b) / 2
    if (kochfeldX && mitte > kochfeldX[0] && mitte < kochfeldX[1]) {
      // Unter dem Kochfeld drei Schubladen (unten hoch, oben flach), wie bei IKEA.
      const h = H - 4.5 - 10.5
      const stufen = [10.5, 10.5 + h * 0.42, 10.5 + h * 0.74, H - 4.5]
      for (let k = 0; k < 3; k++) out.push(...schublade(a, b, frontY0, frontY1, stufen[k] + 0.3, stufen[k + 1] - 0.3, tief - 6, auf, f.front, ton(f.front, 0.85)))
    } else out.push(tuer(a, frontY0, b, frontY1, 10.5, H - 4.5, f.front, i % 2 === 0 ? 'min' : 'max', auf))
  }
  // Arbeitsplatte mit 2 cm Ueberstand vorne.
  out.push(t(x0, wandBeiY0 ? y0 : y0 - 2, x1, wandBeiY0 ? y1 + 2 : y1, H - 4, H, f.platte))
  // Rueckwand und Oberschraenke an der Wand.
  const wy0 = wandBeiY0 ? y0 : y1 - 1.5
  const wy1 = wandBeiY0 ? y0 + 1.5 : y1
  const oben = Math.min(decke - 1, H + 55 + 90)
  out.push(t(x0, wy0, x1, wy1, H, H + 55, ton(f.platte, 1.1)))
  if (decke - (H + 55) >= 40) {
    const ob0 = wandBeiY0 ? y0 : y1 - Math.min(35, tief)
    const ob1 = wandBeiY0 ? y0 + Math.min(35, tief) : y1
    out.push(t(x0, ob0, x1, ob1, H + 55, oben, ton(f.front, 0.95)))
    // LED-Leiste unter den Oberschraenken, vorne: Licht auf die Arbeitsplatte.
    const ly0 = wandBeiY0 ? ob1 - 7 : ob0 + 4
    out.push({ ...t(x0 + 4, ly0, x1 - 4, ly0 + 3, H + 54, H + 55, f.waesche), leuchte: true })
    const fy0 = wandBeiY0 ? ob1 - 1 : ob0
    const fy1 = wandBeiY0 ? ob1 : ob0 + 1
    for (let i = 0; i < n; i++) {
      const a = x0 + i * w + 0.3
      const b = x0 + (i + 1) * w - 0.3
      const mitte = (a + b) / 2
      if (kochfeldX && mitte > kochfeldX[0] && mitte < kochfeldX[1]) {
        // Ueber dem Kochfeld: Dunstabzug unter einem flachen Oberschrank.
        out.push({ ...t(a, ob0, b, ob1, H + 55, H + 61, ton(f.metall, 1.2)), glanz: 0.6 })
        out.push(tuer(a, fy0, b, fy1, H + 61.5, oben - 0.5, f.front, 'min', auf))
      } else out.push(tuer(a, fy0, b, fy1, H + 55.5, oben - 0.5, f.front, i % 2 === 0 ? 'min' : 'max', auf))
    }
  }
  return out
}

function kochfeld(x0: number, y0: number, x1: number, y1: number, H: number, f: MoebelFarben): Teil {
  return { ...t(x0, y0, x1, y1, H, H + 0.6, f.schwarz), glanz: 0.7 }
}

/** Spuelbecken mit Hahn; der Hahn steht an der Wandseite (y0 oder x0). */
function becken(x0: number, y0: number, x1: number, y1: number, H: number, f: MoebelFarben, hahnBeiX0 = false): Teil[] {
  const mx = (x0 + x1) / 2
  const my = (y0 + y1) / 2
  const hahn = hahnBeiX0 ? t(x0 - 6, my - 2, x0 - 2, my + 2, H, H + 28, f.metall) : t(mx - 2, y0 - 6, mx + 2, y0 - 2, H, H + 28, f.metall)
  return [{ ...t(x0, y0, x1, y1, H, H + 0.6, ton(f.schwarz, 1.3)), glanz: 0.5 }, { ...hahn, glanz: 0.8 }]
}

function kueche(o: O, decke: number, f: MoebelFarben): Teil[] {
  const B = o.breite_cm
  const T = o.tiefe_cm
  const H = o.hoehe_cm
  if (o.form !== 'l' || !o.ausschnitt_breite_cm || !o.ausschnitt_tiefe_cm) {
    const kf = Math.min(60, B * 0.3)
    return [
      ...zeile(0, B, 0, T, true, H, decke, f, [B - kf - 10, B - 10]),
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
    ...zeile(0, B, aT, T, false, H, decke, f, [B - kf - 10, B - 10]),
    ...quer,
    kochfeld(B - kf - 10, aT + 8, B - 10, T - 8, H, f),
    ...becken(10, aT / 2 - bw / 2, schenkel - 10, aT / 2 + bw / 2, H, f, true),
  ]
  return teile.map(spiegler(o))
}

/** Die Teile eines Moebels; null = unbekannte Art, dann bleibt es ein Klotz. */
export function moebelTeile(o: O, art: MoebelArt | null, f: MoebelFarben, decke: number): Teil[] | null {
  schubNr = 0
  const B = o.breite_cm
  const T = o.tiefe_cm
  const H = o.hoehe_cm
  const eigen = o.farbe
  switch (art) {
    case 'mauer':
      // Ein Stueck Wand: ein Block bis unter die Decke, in der Wandfarbe.
      return [t(0, 0, B, T, 0, decke, eigen ?? f.wand3d)]
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
        zyl(t(0, 0, B, T, H - 4, H, holz)),
        zyl(t(B * 0.42, T * 0.42, B * 0.58, T * 0.58, 3, H - 4, ton(holz, 0.8)), 0.8),
        zyl(t(B * 0.28, T * 0.28, B * 0.72, T * 0.72, 0, 3, ton(holz, 0.8)), 0.92),
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
      return stuhl(0, 0, B, T, true, eigen ?? f.holz, f, H, o.material === 'stoff' || o.material === 'samt' || o.material === 'leder')
    case 'buerostuhl': {
      const s = eigen ?? f.schwarz
      return [
        rd(t(0, T * 0.45, B, T * 0.55, 0, 5, f.schwarz), 1.5),
        rd(t(B * 0.45, 0, B * 0.55, T, 0, 5, f.schwarz), 1.5),
        zyl(t(B * 0.45, T * 0.45, B * 0.55, T * 0.55, 5, 42, f.metall)),
        rd(t(B * 0.1, T * 0.15, B * 0.9, T * 0.9, 42, 50, s), 3.5),
        rd(t(B * 0.15, 0, B * 0.85, T * 0.12, 55, H, s), 3),
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
      const out: Teil[] = [rd(t(0, 0, B, T - 1, 0, H, ton(k, 0.96)), 2)]
      if (art === 'kuehlschrank' && H > 120) {
        out.push(tuer(0.5, T - 1, B - 0.5, T, 0.5, H * 0.35 - 0.5, k, 'max', 1), tuer(0.5, T - 1, B - 0.5, T, H * 0.35 + 0.5, H - 0.5, k, 'max', 1))
      } else out.push(tuer(0.5, T - 1, B - 0.5, T, 0.5, H - 0.5, k, 'max', 1))
      out.push(t(B - 6, T, B - 4, T + 2, H * 0.4, H * 0.6, f.metall))
      return out
    }
    case 'waschmaschine':
    case 'trockner':
      return [
        rd(t(0, 0, B, T - 1, 0, H, f.weiss), 2),
        zyl(t(B * 0.2, T - 1, B * 0.8, T + 0.5, H * 0.18, H * 0.18 + B * 0.6, art === 'trockner' ? ton(f.glas, 0.7) : ton(f.schwarz, 1.5)), 1, 'quer'),
        rd(t(B * 0.05, T - 1, B * 0.6, T, H * 0.84, H * 0.95, ton(f.weiss, 0.93)), 0.8),
      ]
    case 'geschirrspueler':
      return [t(0, 0, B, T - 1, 0, H, ton(f.front, 0.95)), t(0.3, T - 1, B - 0.3, T, 10, H - 0.5, f.front), t(0, 0, B, T, H - 4, H, f.platte)]
    case 'herd':
      return [...zeile(0, B, 0, T, true, H, 0, f).filter((q) => q.z1 <= H + 0.01), kochfeld(4, 6, B - 4, T - 8, H, f), t(3, T - 1, B - 3, T + 0.5, 20, H - 12, f.schwarz)]
    case 'spuele':
      return [...zeile(0, B, 0, T, true, H, 0, f).filter((q) => q.z1 <= H + 0.01), ...becken(8, 10, B - 8, T - 10, H, f)]
    case 'kuechenzeile':
      return kueche(o, decke, f)
    case 'bank': {
      // Sitzbank an der Wand (y = 0): Kasten mit Stauraum, Sitzpolster,
      // Rueckenkissen je 60 cm an der Wand. Als L (E73) je Kasten, der
      // Ausschnitt bleibt frei (Eckbank um einen Mauervorsprung).
      const korpus = eigen ?? f.weiss
      // KUDDARNA-Polster gibt es nur in hellem Graubeige (E77).
      const stoff = /kuddarna/i.test(o.name ?? '') ? '#cfc8ba' : f.stoff
      const sitz = Math.min(46, H)
      const out: Teil[] = []
      for (const s of bankStuecke(o)) {
        const w = s.x1 - s.x0
        const n = Math.max(1, Math.round(w / 60))
        out.push(
          t(s.x0 + 2, s.y0 + 2, s.x1 - 2, s.y1 - 4, 0, 8, ton(korpus, 0.8)),
          rd(t(s.x0, s.y0, s.x1, s.y1, 8, sitz - 8, korpus), 1),
          ...polster(s.x0, s.x1, n, s.y0, s.y1, sitz - 8, sitz, ton(stoff, 1.1)),
        )
        if (s.lehne && H > sitz + 10) out.push(...polster(s.x0, s.x1, n, 0, Math.min(14, T * 0.3), sitz, H, ton(stoff, 1.18)))
        // Fronten des Kastens als Klappen (Stauraum).
        for (let i = 0; i < n; i++) {
          out.push(tuer(s.x0 + (w / n) * i + 0.5, s.y1 - 1, s.x0 + (w / n) * (i + 1) - 0.5, s.y1, 9, sitz - 9, ton(korpus, 1.03), i % 2 === 0 ? 'min' : 'max', 1))
        }
      }
      return out
    }
    case 'haengelampe': {
      // Haengt von der Decke: Kabel oben, Schirm unten (rund aus zwei Kreuzstuecken).
      const schirm = Math.min(40, H * 0.45)
      const farbe = eigen ?? '#c8a574'
      return [
        zyl(t(B / 2 - 0.4, T / 2 - 0.4, B / 2 + 0.4, T / 2 + 0.4, schirm, H, f.schwarz)),
        zyl(t(0, 0, B, T, 0, schirm, farbe), 0.3),
        { ...zyl(t(B * 0.2, T * 0.2, B * 0.8, T * 0.8, -1, 0.5, f.waesche)), leuchte: true },
      ]
    }
    case 'hochschrank': {
      // Hochschrank mit Eichenfronten (z. B. mit eingebautem Kuehlschrank):
      // unten eine hohe Tuer, oben eine kurze, Sockel dunkel.
      const out: Teil[] = [t(0, 0, B, T - 1, 10, H, ton(f.front, 0.95)), t(3, 0, B - 3, T - 7, 0, 10, ton(f.platte, 1.2))]
      const teilung = Math.min(H - 40, 200)
      out.push(tuer(0.3, T - 1, B - 0.3, T, 10.5, teilung - 0.3, f.front, 'max', 1))
      out.push(tuer(0.3, T - 1, B - 0.3, T, teilung + 0.3, H - 0.5, f.front, 'max', 1))
      return out
    }
    case 'backofen': {
      const out: Teil[] = [t(0, 0, B, T - 1, 10, H, ton(f.front, 0.95)), t(3, 0, B - 3, T - 7, 0, 10, ton(f.platte, 1.2))]
      out.push(tuer(0.3, T - 1, B - 0.3, T, 10.5, 80, f.front, 'min', 1))
      out.push(t(1, T - 1, B - 1, T + 0.5, 82, 142, f.schwarz))
      out.push(t(1, T - 1, B - 1, T + 0.5, 144, 182, f.schwarz))
      if (H > 186) out.push(tuer(0.3, T - 1, B - 0.3, T, 184, H - 0.5, f.front, 'min', 1))
      return out
    }
    case 'wc':
      return [
        zyl(t(B * 0.22, T * 0.3, B * 0.78, T * 0.92, 0, 36, f.keramik), 1.35),
        zyl(t(B * 0.06, T * 0.25, B * 0.94, T, 36, 42, ton(f.keramik, 0.97))),
        rd(t(B * 0.05, 0, B * 0.95, T * 0.22, 0, Math.min(H, 82), f.keramik), 4),
      ]
    case 'waschbecken':
      return [
        rd(t(0, 0, B, T, H - 15, H, f.keramik), 5),
        zyl(t(B * 0.15, T * 0.2, B * 0.85, T * 0.85, H, H + 0.4, ton(f.keramik, 0.88))),
        { ...zyl(t(B / 2 - 1.5, 2, B / 2 + 1.5, 5, H, H + 20, f.metall)), glanz: 0.8 },
        rd(t(B * 0.4, 0, B * 0.6, T * 0.4, 0, H - 15, ton(f.keramik, 0.97)), 3),
      ]
    case 'badewanne':
      return [rd(t(0, 0, B, T, 0, H, f.keramik), 6), rd(t(6, 6, B - 6, T - 6, H, H + 0.4, ton(f.keramik, 0.88)), 0.2)]
    case 'dusche':
      return [t(0, 0, B, T, 0, Math.max(3, H), f.keramik), t(0, T - 1, B, T, H, 200, f.glas, 0.25), t(B - 1, 0, B, T, H, 200, f.glas, 0.25)]
    case 'teppich': {
      // Mit etwas dunklerem Rand, damit er sich vom Boden abhebt (E74).
      const farbe = eigen ?? f.teppich
      const h = Math.max(1, H)
      const r = Math.min(5, B * 0.06, T * 0.06)
      return [t(0, 0, B, T, 0, h, ton(farbe, 0.82)), t(r, r, B - r, T - r, h, h + 0.2, farbe)]
    }
    case 'spiegel': {
      // Flach an der Wand (y = 0): schmaler Rahmen, davor das Glas mit Glanz
      // (E74). Die Datenbank will mindestens 5 cm Tiefe, gezeichnet wird 2,5.
      const d = Math.min(T, 2.5)
      return [t(0, 0, B, d - 0.6, 0, H, eigen ?? f.weiss), { ...t(1.5, d - 0.6, B - 1.5, d, 1.5, H - 1.5, f.spiegel), glanz: 0.95 }]
    }
    case 'stehlampe': {
      // Messing, wenn der Name es sagt (AARSTID), sonst Metall.
      const fuss = /messing/i.test(o.name ?? '') ? '#b08d57' : f.metall
      return [
        { ...zyl(t(B * 0.22, T * 0.22, B * 0.78, T * 0.78, 0, 3, fuss), 0.85), glanz: 0.7 },
        { ...zyl(t(B * 0.47, T * 0.47, B * 0.53, T * 0.53, 3, H - 30, fuss)), glanz: 0.7 },
        zyl(t(B * 0.08, T * 0.08, B * 0.92, T * 0.92, H - 30, H, eigen ?? f.waesche), 0.78),
        { ...zyl(t(B * 0.18, T * 0.18, B * 0.82, T * 0.82, H - 31, H - 29.5, f.waesche)), leuchte: true },
      ]
    }
    case 'pflanze':
      return [
        zyl(t(B * 0.22, T * 0.22, B * 0.78, T * 0.78, 0, H * 0.3, f.topf), 1.2),
        kugel(t(0, 0, B, T, H * 0.26, H, eigen ?? f.gruen)),
      ]
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
        zyl(t(0, T * 0.47, r, T * 0.53, 0, r, f.schwarz), 1, 'quer'),
        zyl(t(B - r, T * 0.47, B, T * 0.53, 0, r, f.schwarz), 1, 'quer'),
        t(r * 0.5, T * 0.48, B - r * 0.5, T * 0.52, r * 0.55, r * 0.7, eigen ?? f.metall),
        t(B * 0.3, T * 0.3, B * 0.42, T * 0.7, H * 0.85, H * 0.9, f.schwarz),
      ]
    }
    default:
      return null
  }
}
