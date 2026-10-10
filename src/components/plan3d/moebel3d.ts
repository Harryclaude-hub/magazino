/* Moebel in 3D mit Form statt als Klotz: Couch mit Sockel, Sitz- und
 * Rueckenpolstern, Armlehnen und Fuessen; Bett mit Rahmen, Matratze,
 * Kissen und Decke; Tisch mit Beinen; Kueche mit Sockel, Fronten,
 * Arbeitsplatte, Rueckwand und Oberschraenken; Bad in Keramik usw.
 *
 * E82 ("1 zu 1"): Esszimmerstuhl wie STOCKHOLM 2025, Klapp-, Kinder- und
 * Buerostuhl; Kueche nach IKEA-Mass mit hohlen Korpussen, Einlegeboeden,
 * etwas Geschirr, Stangengriffen, Becken mit Mischer und Wasserstrahl,
 * Kochfeld, Backofen, Haube, Kuehlschrank mit Innenleben und Geraeten auf
 * der Arbeitsplatte; Bad mit echtem Becken, WC mit Brille und Deckel,
 * Wanne mit Armatur und Handtuch; Fernseher zum Einschalten; Plaetze zum
 * Sitzen und Liegen; Juniorbett; ENHET-Sockel. Deko und Spielzeug stehen
 * in moebelDeko3d.ts.
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
import { alsDing, dekoTeile, kegel, kugel, misch, pflanzeTeile, rd, schieben, t, ton, zyl } from './moebelDeko3d.ts'

export { ton }

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
  /* E82 */
  griff: string
  wasser: string
  bildschirm: string
  pappe: string
  leinen: string
  spielRot: string
  spielBlau: string
  spielGelb: string
  spielGruen: string
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
   *  laengs = Breite, quer = Tiefe) oder Kugel. Bei oben > 1 ist der
   *  Quader der untere Kreis, oben ragt der Zylinder um diesen Faktor
   *  hinaus (so zeichnet ihn der Motor). */
  form?: { art: 'zylinder'; oben?: number; achse?: 'hoch' | 'laengs' | 'quer' } | { art: 'kugel' }
  /** Laesst sich oeffnen (E68). Beschrieben relativ zur langen und kurzen
   *  Seite des Teils, damit Spiegeln und Achsentausch es nicht aendern:
   *  Tuer: Angel am Anfang ('min') oder Ende ('max') der langen Seite,
   *  oeffnet nach auf (+1/-1 entlang der kurzen Seite). Schublade: faehrt
   *  weit cm nach auf; alle Teile derselben gruppe fahren mit. */
  front?: Front
  /* ------------------------------------------------------------ E82 */
  /** Hier kann man sitzen oder liegen; die Oberseite des Teils ist die
   *  Flaeche. blick lokal: 'vorn' = +y (weg von der Wand), 'hinten' = -y,
   *  'links' = -x, 'rechts' = +x. */
  platz?: { art: 'sitz' | 'liegen'; blick: 'vorn' | 'hinten' | 'links' | 'rechts' }
  /** Kleines Ding zum Aufheben; Teile mit demselben Namen gehoeren zusammen. */
  ding?: string
  /** Teil eines Geraets (Quader.geraet); nr trennt mehrere Geraete in einem Moebel. */
  geraet?: { art: 'tv' | 'wasser'; teil: 'koerper' | 'an' | 'aus'; nr?: number }
  /** Spiegelflaeche, die Vorderseite zeigt nach lokal +y. */
  spiegel?: true
  /** Geneigt um die eigene Mitte, Grad: laengs = um die lokale x-Achse
   *  (Lehne nach hinten), quer = um die lokale y-Achse. Vorzeichen, wie
   *  moebel3d.ts es meint: laengs positiv kippt die Oberkante nach hinten
   *  (-y, zur Wand), quer positiv kippt sie nach rechts (+x). */
  kipp?: { laengs?: number; quer?: number }
  /** Glimmt von selbst in der eigenen Farbe, 0 bis 1, auch bei Licht aus
   *  (Kerzenflamme, E91). Leise: das Licht im Raum aendert es nicht. */
  glut?: number
  /** Weicher Stoff ohne Kantenlinie, auch mit kleiner Rundung (E91:
   *  Handtuecher, Bademantel); die Linie saesse sonst neben der Rundung. */
  weich?: true
}

/** Tuer: gruppe verbindet sie mit ihrem Griff (art 'griff', gleiche
 *  gruppe), der dann mit ihr dreht (E82). Ein Griff ist alles, was an der
 *  Tuer haengt: der Griff selbst, aber auch Tuerfaecher eines
 *  Kuehlschranks samt Flasche darin. Alle Teile sind in der Stellung zu
 *  beschrieben. */
export type Front =
  | { art: 'tuer'; angel: 'min' | 'max'; auf: 1 | -1; gruppe?: number }
  | { art: 'schub'; auf: 1 | -1; weit: number; gruppe: number }
  | { art: 'griff'; gruppe: number }

type O = Pick<Objekt, 'breite_cm' | 'tiefe_cm' | 'hoehe_cm' | 'form' | 'ausschnitt_breite_cm' | 'ausschnitt_tiefe_cm' | 'ausschnitt_ecke' | 'farbe'> &
  Partial<Pick<Objekt, 'name' | 'material'>>

type Blick = NonNullable<Teil['platz']>['blick']

/* ------------------------------------------------------------ Spiegeln und Tauschen */

const BLICK_X: Record<Blick, Blick> = { vorn: 'vorn', hinten: 'hinten', links: 'rechts', rechts: 'links' }
const BLICK_Y: Record<Blick, Blick> = { vorn: 'hinten', hinten: 'vorn', links: 'links', rechts: 'rechts' }
const BLICK_TAUSCH: Record<Blick, Blick> = { vorn: 'rechts', rechts: 'vorn', hinten: 'links', links: 'hinten' }

/** Front nach dem Spiegeln an einer Achse. Lange Seite entlang der
 *  Spiegelachse: die Angel wechselt die Seite; sonst dreht die Richtung. */
function frontGespiegelt(q: Teil, achse: 'x' | 'y'): Front | undefined {
  const fr = q.front
  if (!fr || fr.art === 'griff') return fr
  const breitX = q.x1 - q.x0 >= q.y1 - q.y0
  const lang = breitX === (achse === 'x')
  const auf = (lang ? fr.auf : -fr.auf) as 1 | -1
  if (fr.art === 'schub') return { ...fr, auf }
  return { ...fr, auf, angel: lang ? (fr.angel === 'min' ? 'max' : 'min') : fr.angel }
}

function neigung(laengs: number | undefined, quer: number | undefined): Teil['kipp'] {
  const k: { laengs?: number; quer?: number } = {}
  if (laengs) k.laengs = laengs
  if (quer) k.quer = quer
  return k.laengs || k.quer ? k : undefined
}

/** Spiegeln an x = um. Was am Teil eine Richtung hat, spiegelt mit:
 *  Fronten, Neigung quer, Blick links und rechts. */
function spiegelX(q: Teil, um: number): Teil {
  const r: Teil = { ...q, x0: um - q.x1, x1: um - q.x0 }
  if (q.front) r.front = frontGespiegelt(q, 'x')
  if (q.kipp) r.kipp = neigung(q.kipp.laengs, q.kipp.quer ? -q.kipp.quer : undefined)
  if (q.platz) r.platz = { ...q.platz, blick: BLICK_X[q.platz.blick] }
  return r
}

/** Spiegeln an y = um (Fronten, Neigung laengs, Blick vorn und hinten). */
function spiegelY(q: Teil, um: number): Teil {
  const r: Teil = { ...q, y0: um - q.y1, y1: um - q.y0 }
  if (q.front) r.front = frontGespiegelt(q, 'y')
  if (q.kipp) r.kipp = neigung(q.kipp.laengs ? -q.kipp.laengs : undefined, q.kipp.quer)
  if (q.platz) r.platz = { ...q.platz, blick: BLICK_Y[q.platz.blick] }
  return r
}

/** x und y tauschen (Kuechenschenkel, Bett entlang x). Fronten bleiben,
 *  weil sie an langer und kurzer Seite haengen; Zylinderachse, Neigung
 *  und Blick tauschen mit. */
function tausch(q: Teil): Teil {
  const r: Teil = { ...q, x0: q.y0, x1: q.y1, y0: q.x0, y1: q.x1 }
  const fo = q.form
  if (fo && fo.art === 'zylinder' && fo.achse && fo.achse !== 'hoch') r.form = { ...fo, achse: fo.achse === 'laengs' ? 'quer' : 'laengs' }
  if (q.kipp) r.kipp = neigung(q.kipp.quer ? -q.kipp.quer : undefined, q.kipp.laengs ? -q.kipp.laengs : undefined)
  if (q.platz) r.platz = { ...q.platz, blick: BLICK_TAUSCH[q.platz.blick] }
  return r
}

/** Um 90 Grad nach links drehen (+y wird -x), um den Nullpunkt. Nur fuer
 *  Teile ohne Front, Platz und Neigung (Armatur der Wanne). */
function drehLinks(q: Teil): Teil {
  const r: Teil = { ...q, x0: -q.y1, x1: -q.y0, y0: q.x0, y1: q.x1 }
  const fo = q.form
  if (fo && fo.art === 'zylinder' && fo.achse && fo.achse !== 'hoch') r.form = { ...fo, achse: fo.achse === 'laengs' ? 'quer' : 'laengs' }
  return r
}

/** Rechteck in einem Rahmen mit der freien Ecke rechts oben ('ro') auf die
 *  echte Ecke spiegeln (wie das L-Zeichen in 2D). */
function spiegler(o: O) {
  const B = o.breite_cm
  const T = o.tiefe_cm
  const e = o.ausschnitt_ecke ?? 'ro'
  const sx = e === 'lo' || e === 'lu'
  const sy = e === 'ru' || e === 'lu'
  return (q: Teil): Teil => {
    let r = q
    if (sx) r = spiegelX(r, B)
    if (sy) r = spiegelY(r, T)
    return r
  }
}

/* ------------------------------------------------------------ Kleine Helfer */

/** Fortlaufende Nummer der Schubladen und Tueren mit Griff in einem
 *  Moebel; Tuer und Griff teilen sich eine (E82). */
let frontNr = 0
const neueGruppe = () => ++frontNr

const sitzPlatz = (q: Teil, blick: Blick = 'vorn'): Teil => ({ ...q, platz: { art: 'sitz', blick } })
const liegePlatz = (q: Teil, blick: Blick = 'vorn'): Teil => ({ ...q, platz: { art: 'liegen', blick } })

/** Tuer als Teil: Angel links (min) oder rechts (max), oeffnet nach auf. */
function tuer(x0: number, y0: number, x1: number, y1: number, z0: number, z1: number, farbe: string, angel: 'min' | 'max', auf: 1 | -1): Teil {
  return { ...t(x0, y0, x1, y1, z0, z1, farbe), front: { art: 'tuer', angel, auf } }
}

/** Stangengriff (E82): Stange 12 mm, Lochabstand 128 mm (bei lang 16), auf
 *  zwei Stuetzen vor der Front, deren Vorderseite bei y = vorn liegt.
 *  Senkrecht an Tueren, waagrecht an Schubladen; unter 20 cm Frontbreite
 *  ein Knopf. front: dreht mit der Tuer (griff) oder faehrt mit der
 *  Schublade (schub). Jedes Teil ist mindestens so breit (x) wie tief (y):
 *  szene.ts nimmt die Richtung der Schublade je Teil aus seiner Form. */
function griff(cx: number, vorn: number, cz: number, senkrecht: boolean, f: MoebelFarben, front?: Front, breite = 99, lang = 16): Teil[] {
  const farbe = f.griff
  const loch = lang / 2 - 1.6
  let teile: Teil[]
  if (breite < 20) teile = [kugel(t(cx - 1.3, vorn, cx + 1.3, vorn + 2.4, cz - 1.3, cz + 1.3, farbe))]
  else if (senkrecht)
    teile = [
      zyl(t(cx - 0.6, vorn + 1.5, cx + 0.6, vorn + 2.7, cz - lang / 2, cz + lang / 2, farbe)),
      ...[-loch, loch].map((d) => zyl(t(cx - 0.8, vorn, cx + 0.8, vorn + 1.5, cz + d - 0.8, cz + d + 0.8, farbe), 1, 'quer')),
    ]
  else
    teile = [
      zyl(t(cx - lang / 2, vorn + 1.5, cx + lang / 2, vorn + 2.7, cz - 0.6, cz + 0.6, farbe), 1, 'laengs'),
      ...[-loch, loch].map((d) => zyl(t(cx + d - 0.8, vorn, cx + d + 0.8, vorn + 1.5, cz - 0.8, cz + 0.8, farbe), 1, 'quer')),
    ]
  return teile.map((q) => ({ ...q, ...(front ? { front } : {}), glanz: 0.75 }))
}

/** Tuer mit Griff (E82): die Tuer liegt entlang x, vorne bei y1, geht nach
 *  +y auf; der Griff sitzt gegenueber der Angel, oben (Unterschrank),
 *  unten (Oberschrank) oder mittig. Beide in der Stellung zu, verbunden
 *  ueber die gruppe. */
function tuerMitGriff(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  z0: number,
  z1: number,
  farbe: string,
  angel: 'min' | 'max',
  f: MoebelFarben,
  lage: 'oben' | 'unten' | 'mitte' = 'oben',
  gruppe = neueGruppe(),
  lang = 16,
): Teil[] {
  const b = x1 - x0
  const h = z1 - z0
  const cx = b < 20 ? (x0 + x1) / 2 : angel === 'min' ? x1 - 3.5 : x0 + 3.5
  const rand = lang / 2 + 3
  const cz = h < 2 * rand + 2 ? (z0 + z1) / 2 : lage === 'oben' ? z1 - rand : lage === 'unten' ? z0 + rand : (z0 + z1) / 2
  return [
    { ...rd(t(x0, y0, x1, y1, z0, z1, farbe), 0.25), front: { art: 'tuer', angel, auf: 1, gruppe } },
    ...griff(cx, y1, cz, true, f, { art: 'griff', gruppe }, b, Math.min(lang, h - 6)),
  ]
}

/** Eine oder zwei Tueren zwischen x0 und x1 (ueber 70 cm zwei). */
function tueren(x0: number, y0: number, x1: number, y1: number, z0: number, z1: number, angel: 'min' | 'max', f: MoebelFarben, lage: 'oben' | 'unten'): Teil[] {
  if (x1 - x0 <= 70) return tuerMitGriff(x0, y0, x1, y1, z0, z1, f.front, angel, f, lage)
  const m = (x0 + x1) / 2
  return [...tuerMitGriff(x0, y0, m - 0.15, y1, z0, z1, f.front, 'min', f, lage), ...tuerMitGriff(m + 0.15, y0, x1, y1, z0, z1, f.front, 'max', f, lage)]
}

/** Schublade: Front, Schubkasten dahinter und Griff fahren zusammen um
 *  weit heraus. Front bei frontY0..frontY1 (duenn), der Kasten reicht in
 *  den Korpus, hoechstens so tief wie breit (sonst schoebe szene.ts ihn
 *  quer, siehe griff). */
function schublade(
  x0: number,
  x1: number,
  frontY0: number,
  frontY1: number,
  z0: number,
  z1: number,
  tief: number,
  auf: 1 | -1,
  front: string,
  kasten: string,
  f: MoebelFarben,
  mitGriff = true,
): Teil[] {
  const gruppe = neueGruppe()
  const kt = Math.max(2, Math.min(tief, x1 - x0 - 5))
  const fr: Front = { art: 'schub', auf, weit: kt * 0.8, gruppe }
  const k0 = auf > 0 ? frontY0 - kt + 2 : frontY1
  const k1 = auf > 0 ? frontY0 : frontY1 + kt - 2
  const out: Teil[] = [
    { ...rd(t(x0, frontY0, x1, frontY1, z0, z1, front), 0.25), front: fr },
    { ...t(x0 + 2, k0, x1 - 2, k1, z0 + 2, Math.max(z0 + 3, z1 - 4), kasten), front: fr },
  ]
  if (mitGriff && auf > 0) out.push(...griff((x0 + x1) / 2, frontY1, z1 - z0 > 14 ? z1 - 4 : (z0 + z1) / 2, false, f, fr, x1 - x0))
  return out
}

/** Gerader Stab von (ya, za) nach (yb, zb) in der y-z-Ebene, x von x0 bis
 *  x1, dy dick; liegt er schraeg, ist er mit kipp laengs geneigt (oben
 *  nach -y positiv). */
function stab(x0: number, x1: number, ya: number, za: number, yb: number, zb: number, dy: number, farbe: string, rund: number): Teil {
  const l = Math.hypot(yb - ya, zb - za)
  const yc = (ya + yb) / 2
  const zc = (za + zb) / 2
  const grad = (Math.atan2(ya - yb, zb - za) * 180) / Math.PI
  const q = rd(t(x0, yc - dy / 2, x1, yc + dy / 2, zc - l / 2, zc + l / 2, farbe), rund)
  return Math.abs(grad) > 0.01 ? { ...q, kipp: { laengs: grad } } : q
}

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

/* ------------------------------------------------------------ Sitzen und Liegen */

/** Couch und Sessel: die Sitzpolster sind Plaetze mit Blick nach vorn. */
function couch(B: number, T: number, H: number, stoff: string, f: MoebelFarben, einsitzer: boolean): Teil[] {
  const arm = Math.min(22, B * 0.14)
  const lehne = Math.min(22, T * 0.26)
  const sitzOben = Math.min(46, H * 0.55)
  const n = einsitzer ? 1 : B - 2 * arm > 170 ? 3 : 2
  return [
    ...beine(B, T, 5, 4, 8, f.holzDunkel, true),
    rd(t(0, 0, B, T, 8, sitzOben - 10, ton(stoff, 0.9)), 3),
    ...polster(arm, B - arm, n, lehne, T - 1, sitzOben - 10, sitzOben, ton(stoff, 1.08)).map((q) => sitzPlatz(q)),
    rd(t(0, 0, B, lehne, sitzOben - 10, H, stoff), 7),
    ...polster(arm, B - arm, n, lehne, lehne + Math.min(14, T * 0.16), sitzOben, H - 6, ton(stoff, 1.14)),
    rd(t(0, lehne - 4, arm, T, sitzOben - 10, sitzOben + 16, ton(stoff, 0.96)), Math.min(9, arm * 0.45)),
    rd(t(B - arm, lehne - 4, B, T, sitzOben - 10, sitzOben + 16, ton(stoff, 0.96)), Math.min(9, arm * 0.45)),
  ]
}

/** L-Couch: Lehne an den beiden Aussenseiten, Armlehnen an den freien
 *  Enden. Auf dem langen Teil sitzt man mit Blick weg von seiner Lehne
 *  (-y), auf dem Schenkel nach +x (im Rahmen mit freier Ecke rechts oben). */
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
    ...polster(lehne, B - arm, Math.max(2, Math.round((B - arm - lehne) / 75)), aT, T - lehne, sitz - 10, sitz, polsterFarbe).map((q) => sitzPlatz(q, 'hinten')),
  ]
  if (aT - 0.5 > arm + 5) teile.push(sitzPlatz(rd(t(lehne, arm, schenkel - 0.5, aT - 0.5, sitz - 10, sitz, polsterFarbe), 5), 'rechts'))
  return teile.map(spiegler(o))
}

/** Bett (E82): Kopfteil an der Wand bei y = 0, Fussende bei y = T. Man
 *  liegt mit dem Kopf am Kopfteil und schaut zum Fussende (blick 'vorn').
 *  H ist die Liegehoehe (Katalog 45; Kopfteil, Decke und Kissen ragen
 *  dann darueber hinaus); ab 75 cm gilt H als Hoehe des Kopfteils. Ab 160
 *  cm Breite zwei Matratzen, jede ein Platz. */
function bett(B: number, T: number, H: number, stoff: string, f: MoebelFarben): Teil[] {
  const liegen = H >= 75 ? 50 : Math.max(25, H)
  const kopf = H >= 75 ? H : liegen + 45
  const mt = Math.min(20, liegen * 0.4)
  const rahmenOben = liegen - mt + 6
  const out: Teil[] = [
    ...[
      [2, 8],
      [B - 7, 8],
      [2, T - 7],
      [B - 7, T - 7],
    ].map(([x, y]) => kegel(x + 2.5, y + 2.5, 2, 2.5, 0, 8.5, f.holzDunkel)),
    rd(t(0, 6, B, T, 8, rahmenOben, f.holz), 1.2),
    rd(t(0, 0, B, 6, 0, kopf, ton(f.holz, 0.92)), 2),
  ]
  const n = B >= 160 ? 2 : 1
  const mw = (B - 6) / n
  for (let i = 0; i < n; i++) {
    const fuge = n > 1 ? 0.2 : 0
    out.push(liegePlatz(rd(t(3 + i * mw + fuge, 7, 3 + (i + 1) * mw - fuge, T - 3, liegen - mt, liegen, f.waesche), 5)))
  }
  const dy = T * 0.34
  out.push(rd(t(1.5, dy, B - 1.5, T - 1.5, liegen, liegen + 6, stoff), 3), rd(t(1.5, dy - 3, B - 1.5, dy + 8, liegen, liegen + 8, ton(stoff, 1.1)), 4))
  if (T >= 120) out.push(rd(t(1, T - 48, B - 1, T - 26, liegen + 6, liegen + 7.2, misch(stoff, f.holzDunkel, 0.35)), 0.6))
  const kissen = B >= 130 ? 2 : 1
  const w = (B - 16) / kissen
  for (let i = 0; i < kissen; i++) out.push(rd(t(8 + i * w + 2, 10, 8 + (i + 1) * w - 2, Math.min(T * 0.3, 55), liegen, liegen + 11, ton(f.waesche, 1.05)), 5))
  return out
}

/** Gitterbett in Bettkoordinaten (Breite W entlang x, Laenge L entlang y,
 *  Kopfende bei y = 0): Pfosten, Kopf- und Fussteil, Staebe an den
 *  langen Seiten, Matratze (Platz zum Liegen) und eine Decke. */
function gitterbett(W: number, L: number, H: number, farbe: string, f: MoebelFarben): Teil[] {
  const p = 4
  const z0 = Math.min(22, H * 0.25)
  const out: Teil[] = []
  for (const [u, v] of [
    [0, 0],
    [W - p, 0],
    [0, L - p],
    [W - p, L - p],
  ])
    out.push(rd(t(u, v, u + p, v + p, 0, H, farbe), 1))
  out.push(rd(t(p, 0.5, W - p, 3, z0, H - 3, farbe), 1), rd(t(p, L - 3, W - p, L - 0.5, z0, H - 3, farbe), 1))
  const k = Math.max(2, Math.round((L - 2 * p) / 9.5))
  const schritt = (L - 2 * p) / k
  for (const u of [0.5, W - 3.5]) {
    out.push(rd(t(u, p, u + 3, L - p, H - 4, H - 1, farbe), 1), rd(t(u, p, u + 3, L - p, z0 - 2, z0 + 1, farbe), 0.8))
    for (let i = 1; i < k; i++) out.push(zyl(t(u + 0.5, p + schritt * i - 1, u + 2.5, p + schritt * i + 1, z0 + 1, H - 4, farbe)))
  }
  out.push(t(p, p, W - p, L - p, z0 - 1, z0 + 1, ton(farbe, 0.9)))
  out.push(liegePlatz(rd(t(p + 0.5, p + 0.5, W - p - 0.5, L - p - 0.5, z0 + 1, z0 + 11, f.waesche), 3)))
  out.push(rd(t(p + 2, L * 0.45, W - p - 2, L - p - 2, z0 + 11, z0 + 13, misch(f.spielBlau, f.weiss, 0.55)), 1.5))
  return out
}

/** Juniorbett wie SLAEKT oder NATTAPA (96 x 206 x 78) in Bettkoordinaten:
 *  Holzrahmen, Lattenrost (am Fussende zu sehen), Matratze als Platz,
 *  eine kurze Absturzsicherung an der offenen langen Seite (x = W) am
 *  Kopfende, Kissen und Decke. */
function juniorbett(W: number, L: number, H: number, farbe: string, f: MoebelFarben): Teil[] {
  const mz1 = Math.min(36, H - 6)
  const decke = misch(f.spielBlau, f.weiss, 0.5)
  return [
    rd(t(0, 0, W, 2.4, 0, H, farbe), 1.2),
    rd(t(0, L - 2.4, W, L, 0, Math.min(H, Math.max(40, H * 0.6)), farbe), 1.2),
    rd(t(0, 2.4, 2.4, L - 2.4, 10, 26, farbe), 0.8),
    rd(t(W - 2.4, 2.4, W, L - 2.4, 10, 26, farbe), 0.8),
    t(2.4, 2.4, W - 2.4, L - 2.4, 20, 22, ton(f.holz, 1.15)),
    liegePlatz(rd(t(2.6, 2.6, W - 2.6, L - 6, 22, mz1, f.waesche), 4)),
    rd(t(W - 2.4, 6, W, Math.min(L * 0.45, 90), 24, mz1 + 12, farbe), 1),
    rd(t(W * 0.18, 5, W * 0.82, 38, mz1, mz1 + 10, ton(f.waesche, 1.04)), 4),
    rd(t(1.6, 42, W - 1.6, L - 6, mz1, mz1 + 5, decke), 2.5),
    rd(t(1.6, 40, W - 1.6, 50, mz1, mz1 + 7, ton(decke, 1.1)), 3),
  ]
}

/** Kinderbett (E82): ab 80 x 160 ein niedriges Juniorbett, sonst ein
 *  Gitterbett. Kopfende bei y = 0, laeuft das Bett entlang x bei x = 0;
 *  man liegt mit Blick zum Fussende. */
function kinderbett(B: number, T: number, H: number, farbe: string, f: MoebelFarben): Teil[] {
  const laengsY = T >= B
  const W = laengsY ? B : T
  const L = laengsY ? T : B
  const teile = W >= 80 && L >= 160 ? juniorbett(W, L, H, farbe, f) : gitterbett(W, L, H, farbe, f)
  return laengsY ? teile : teile.map(tausch)
}

function tisch(B: number, T: number, H: number, holz: string): Teil[] {
  return [rd(t(0, 0, B, T, H - 4, H, holz), 1.2), ...beine(B, T, 6, 4, H - 4, ton(holz, 0.8))]
}

/** Esszimmerstuhl wie STOCKHOLM 2025 (E82) im eigenen Rahmen B x T x H:
 *  Lehne an der Wand (y = 0), man sitzt mit Blick nach vorn (+y).
 *  Hinterbeine in einem Stueck vom Boden bis zum oberen Riegel, 8 Grad
 *  nach hinten geneigt; Vorderbeine gedrechselt, nach unten schmaler;
 *  Zargen rundum auf etwa 15 cm; Sitz in 46 cm mit hellerem Rattangeflecht
 *  (einige dunklere Streifen), Lehne aus rundem Riegel und drei Sprossen,
 *  so geneigt wie die Hinterbeine. Der Rahmen traegt die eigene Farbe
 *  (sonst Eiche). Mit Stoff ein Sitzkissen. */
function esszimmerstuhl(B: number, T: number, H: number, holz: string, f: MoebelFarben, kissen: boolean): Teil[] {
  const rahmen = holz
  const rattan = misch(f.pappe, f.leinen, 0.3)
  const sitz = Math.min(46, H * 0.55)
  const tan = Math.tan((8 * Math.PI) / 180)
  const d = Math.min(3.6, B / 10, T / 10)
  // Mittellinie der Hinterbeine: oben kurz vor der Wand, unten weiter vorn.
  const yBei = (z: number) => d / 2 + 0.4 + (H - z) * tan
  const schraeg = (x0: number, x1: number, za: number, zb: number, dy: number, farbe: string, rund: number) =>
    stab(x0, x1, yBei(za), za, yBei(zb), zb, dy, farbe, rund)
  const xl = 1.4
  const xr = B - 1.4 - d
  const out: Teil[] = [schraeg(xl, xl + d, 0.4, H - 0.4, d, rahmen, 1), schraeg(xr, xr + d, 0.4, H - 0.4, d, rahmen, 1)]
  // Vorderbeine gedrechselt, unten schmaler.
  const rv = Math.min(1.9, B / 22)
  const vy = T - 1.6 - rv
  const mitten = [xl + d / 2, xr + d / 2]
  for (const cx of mitten) out.push(kegel(cx, vy, rv * 0.76, rv, 0, sitz - 6, rahmen))
  // Zargen auf etwa 15 cm: seitlich, vorn und hinten.
  const zs = Math.min(14, sitz * 0.3)
  for (const cx of mitten) out.push(zyl(t(cx - 0.8, yBei(zs + 0.8), cx + 0.8, vy, zs, zs + 1.6, rahmen), 1, 'quer'))
  const yh = yBei(zs + 3.8)
  out.push(zyl(t(mitten[0], vy - 0.8, mitten[1], vy + 0.8, zs + 3, zs + 4.6, rahmen), 1, 'laengs'))
  out.push(zyl(t(mitten[0], yh - 0.8, mitten[1], yh + 0.8, zs + 3, zs + 4.6, rahmen), 1, 'laengs'))
  // Sitz: Zarge, darauf das Geflecht mit Streifen.
  const sy0 = yBei(sitz) - d / 2
  out.push(rd(t(1, sy0, B - 1, T - 1, sitz - 6.5, sitz - 2, rahmen), 0.9))
  const geflecht = rd(t(2.4, sy0 + 1.4, B - 2.4, T - 2.4, sitz - 2, sitz - 0.4, rattan), 0.6)
  out.push(kissen ? geflecht : sitzPlatz(geflecht))
  for (let i = 0; i < 4; i++) {
    const x = 2.4 + ((B - 4.8) * (i + 0.5)) / 4 - 0.45
    out.push(rd(t(x, sy0 + 2, x + 0.9, T - 3, sitz - 0.4, sitz, ton(rattan, 0.86)), 0.3))
  }
  // Lehne: runder oberer Riegel und drei Sprossen.
  const rz0 = H - 8.5
  out.push(schraeg(1, B - 1, rz0, H - 0.6, d + 0.4, rahmen, 1.7))
  for (const dx of [-0.17, 0, 0.17]) {
    const cx = B / 2 + dx * B
    out.push(schraeg(cx - 1.6, cx + 1.6, sitz + 2, rz0 + 0.5, 1.4, rahmen, 0.5))
  }
  if (kissen) out.push(sitzPlatz(rd(t(3, sy0 + 2, B - 3, T - 3, sitz, sitz + 3, f.stoff), 1.4)))
  return out
}

/** Kinderstuhl wie LAETT (E82): niedrig und stabil, gerade Beine, die
 *  hinteren bis zur Lehne, Sitz und Lehnbrett aus Kiefer. */
function kinderstuhl(B: number, T: number, H: number, gestell: string, f: MoebelFarben): Teil[] {
  const kiefer = ton(f.holz, 1.2)
  const sitz = Math.min(33, H * 0.58)
  const d = Math.min(3.2, B / 8, T / 8)
  const out: Teil[] = []
  for (const x of [0.6, B - 0.6 - d]) {
    out.push(
      rd(t(x, 0.6, x + d, 0.6 + d, 0, H, gestell), 0.8),
      rd(t(x, T - 0.6 - d, x + d, T - 0.6, 0, sitz - 1.8, gestell), 0.8),
      rd(t(x + d * 0.2, 0.6 + d, x + d * 0.8, T - 0.6 - d, sitz * 0.3, sitz * 0.3 + 2, gestell), 0.4),
    )
  }
  out.push(
    sitzPlatz(rd(t(0.3, 0.6, B - 0.3, T - 0.3, sitz - 1.8, sitz, kiefer), 0.8)),
    rd(t(0.6 + d, 0.9, B - 0.6 - d, 0.3 + d, H - Math.min(12, (H - sitz) * 0.55), H - 1.5, kiefer), 0.6),
  )
  return out
}

/** Klappstuhl (E82): Sitz und Lehne aus Latten. Von der Seite ein A: der
 *  hintere Rahmen laeuft vom Fuss hinten bis zur Lehne oben, die
 *  Vorderbeine vom Fuss vorn schraeg nach hinten unter den Sitz. */
function klappstuhl(B: number, T: number, H: number, holz: string): Teil[] {
  const rahmen = ton(holz, 0.85)
  const sitz = Math.min(45, H * 0.53)
  const d = Math.min(2.4, B / 14)
  const yf = Math.max(4, T * 0.3)
  const yv = T - 2
  const ym = T * 0.45
  // Mittellinie des hinteren Rahmens.
  const yR = (z: number) => yf + ((2 - yf) * (z - 0.4)) / (H - 0.8)
  const out: Teil[] = []
  for (const x of [0.4, B - 0.4 - d]) out.push(stab(x, x + d, yR(0.4), 0.4, yR(H - 0.4), H - 0.4, 3.4, rahmen, 0.8))
  const xi = 0.4 + d + 0.2
  // Steile Vorderbeine: unten so weit hoch, dass die Kante nicht im Boden steckt.
  const fz = 0.4 + 1.5 * Math.sin(Math.atan2(yv - ym, sitz - 3.4))
  for (const x of [xi, B - xi - d]) {
    out.push(stab(x, x + d, yv, fz, ym, sitz - 3, 3, rahmen, 0.8), rd(t(x, 3, x + d, T - 1.5, sitz - 4.5, sitz - 1.8, rahmen), 0.6))
  }
  const yq = yv - ((yv - ym) * 7.6) / (sitz - 3.4)
  out.push(zyl(t(xi + d / 2, yq - 0.8, B - xi - d / 2, yq + 0.8, 7.2, 8.8, rahmen), 1, 'laengs'))
  const n = 5
  const sl = (T - 4.5 - (n - 1)) / n
  for (let i = 0; i < n; i++) {
    const y = 3 + i * (sl + 1)
    const latte = rd(t(1, y, B - 1, y + sl, sitz - 1.8, sitz, holz), 0.5)
    out.push(i === Math.floor(n / 2) ? sitzPlatz(latte) : latte)
  }
  for (let i = 0; i < 3; i++) {
    const zb = H - 2.5 - i * 6.5
    const za = zb - 4.5
    out.push(stab(0.4 + d - 0.3, B - 0.4 - d + 0.3, yR(za), za, yR(zb), zb, 1.6, holz, 0.5))
  }
  return out
}

/** Buerostuhl (E82): Fusskreuz aus vier gerundeten Armen mit Nabe und
 *  Rollen, Gasfeder, Sitz mit runder Vorderkante, geschwungene Lehne an
 *  einem Buegel (unten steiler, oben weiter nach hinten) und Armlehnen. */
function buerostuhl(B: number, T: number, H: number, bezug: string, f: MoebelFarben): Teil[] {
  const s = f.schwarz
  const cx = B / 2
  const cy = T / 2
  const sitzU = Math.min(41, H * 0.38)
  const sitz = sitzU + 7
  const huelle = Math.max(11, Math.min(25, sitzU - 8))
  const arm = Math.min(5, B / 10)
  const out: Teil[] = [
    rd(t(2.5, cy - arm / 2, B - 2.5, cy + arm / 2, 5, 8.5, s), 1.6),
    rd(t(cx - arm / 2, 2.5, cx + arm / 2, T - 2.5, 5, 8.5, s), 1.6),
    zyl(t(cx - 4, cy - 4, cx + 4, cy + 4, 5, 10, s), 0.8),
  ]
  for (const [x, y] of [
    [3.6, cy],
    [B - 3.6, cy],
    [cx, 3.6],
    [cx, T - 3.6],
  ])
    out.push(zyl(t(x - 1.3, y - 2.5, x + 1.3, y + 2.5, 0, 5, ton(s, 1.25)), 1, 'laengs'))
  out.push(
    zyl(t(cx - 2.6, cy - 2.6, cx + 2.6, cy + 2.6, 10, huelle, s), 0.9),
    { ...zyl(t(cx - 1.4, cy - 1.4, cx + 1.4, cy + 1.4, huelle, sitzU - 3, f.metall)), glanz: 0.8 },
    rd(t(cx - 9, cy - 11, cx + 9, cy + 7, sitzU - 3, sitzU, s), 1),
    sitzPlatz(rd(t(B * 0.08, T * 0.18, B * 0.92, T * 0.97, sitzU, sitz, bezug), 3.5)),
    // Buegel unter dem Sitz nach hinten und hinter der Lehne hoch.
    rd(t(cx - 2.5, 4, cx + 2.5, cy - 9, sitzU - 3, sitzU - 0.6, s), 1),
    stab(cx - 2.5, cx + 2.5, 6.5, sitzU - 3, 6.8, sitz + 16, 2.2, s, 1),
    // Lehne aus zwei Stuecken: Lende steiler, oben weiter nach hinten.
    stab(B * 0.14, B * 0.86, 12, sitz + 5, 10.5, sitz + 21, 5.5, bezug, 2.6),
    stab(B * 0.12, B * 0.88, 10.5, sitz + 19, 3.6, H - 1, 5, bezug, 2.4),
  )
  for (const x of [B * 0.03, B * 0.97 - 2.6]) {
    out.push(rd(t(x, cy - 4, x + 2.6, cy + 2, sitzU - 1, sitz + 16, s), 1), rd(t(x - 0.9, cy - 11, x + 3.5, cy + 8, sitz + 16, sitz + 18.5, ton(s, 1.15)), 1.2))
  }
  return out
}

/** Der passende Stuhl im eigenen Rahmen (Lehne bei y = 0): Klappstuhl am
 *  Namen, Kinderstuhl bis 65 cm Hoehe oder am Namen, sonst der
 *  Esszimmerstuhl. */
function stuhlTeile(B: number, T: number, H: number, holz: string, f: MoebelFarben, o: Pick<O, 'name' | 'material' | 'farbe'>): Teil[] {
  const name = (o.name ?? '').toLowerCase()
  if (/klapp|قابل للطي/.test(name)) return klappstuhl(B, T, H, holz)
  if (H <= 65 || /kinder|lätt|laett|أطفال/.test(name)) return kinderstuhl(B, T, H, o.farbe ?? f.weiss, f)
  return esszimmerstuhl(B, T, H, holz, f, o.material === 'stoff' || o.material === 'samt' || o.material === 'leder')
}

/* ------------------------------------------------------------ Kaesten */

/** Kasten mit Sockel, Korpus und Fronten (Kommode, Sideboard, TV-Board),
 *  E82 mit Stangengriffen an jeder Tuer und Schublade. */
function kasten(B: number, T: number, H: number, korpus: string, reihen: number, spalten: number, f: MoebelFarben): Teil[] {
  const sockel = Math.min(8, H * 0.1)
  const out: Teil[] = [rd(t(3, 0, B - 3, T - 3, 0, sockel, f.holzDunkel), 0.4), rd(t(0, 0, B, T - 1, sockel, H, korpus), 0.6)]
  const hoch = (H - sockel - 2) / reihen
  const breit = (B - 2) / spalten
  const front = ton(korpus, 1.04)
  for (let r = 0; r < reihen; r++) {
    for (let s = 0; s < spalten; s++) {
      const x0 = 1 + s * breit + 0.4
      const x1 = 1 + (s + 1) * breit - 0.4
      const z0 = sockel + 1 + r * hoch + 0.4
      const z1 = sockel + 1 + (r + 1) * hoch - 0.4
      if (reihen > 1) out.push(...schublade(x0, x1, T - 1, T, z0, z1, T - 4, 1, front, ton(korpus, 0.9), f))
      else out.push(...tuerMitGriff(x0, T - 1, x1, T, z0, z1, front, s % 2 === 0 ? 'min' : 'max', f, H > 100 ? 'mitte' : 'oben'))
    }
  }
  return out
}

/** Sockel wie IKEA ENHET (E82): niedriger hohler Korpus auf Fuesschen mit
 *  einer Schublade je etwa 25 cm Hoehe, Stangengriff an jeder Front. */
function sockel(B: number, T: number, H: number, korpus: string, f: MoebelFarben): Teil[] {
  const fuss = Math.min(2, H * 0.12)
  const ty = T - BRETT
  const out: Teil[] = []
  for (const [x, y] of [
    [2, 2],
    [B - 5, 2],
    [2, T - 5],
    [B - 5, T - 5],
  ])
    out.push(zyl(t(x, y, x + 3, y + 3, 0, fuss, ton(korpus, 0.82))))
  out.push(
    rd(t(0, 0, BRETT, ty, fuss, H, korpus), 0.4),
    rd(t(B - BRETT, 0, B, ty, fuss, H, korpus), 0.4),
    rd(t(BRETT, 0, B - BRETT, ty, H - BRETT, H, korpus), 0.4),
    t(BRETT, 0, B - BRETT, ty, fuss, fuss + BRETT, korpus),
    t(BRETT, 0, B - BRETT, 1, fuss + BRETT, H - BRETT, korpus),
  )
  const n = Math.max(1, Math.round((H - fuss) / 25))
  const h = (H - fuss) / n
  for (let i = 0; i < n; i++) {
    out.push(...schublade(FUGE / 2, B - FUGE / 2, ty, T, fuss + i * h + FUGE / 2, fuss + (i + 1) * h - FUGE / 2, ty - 3, 1, ton(korpus, 1.03), ton(korpus, 0.9), f))
  }
  return out
}

/** KUDDARNA-Polster gibt es nur in hellem Graubeige (E77). */
const KUDDARNA = '#cfc8ba'

/** Eckbank aus IKEA BESTA (E91): TV-Bank 180 x 42 x 38 mit drei Tueren
 *  oder Regal 120 x 42 x 38 mit zwei, je Tuer 60 cm; Tueren LAPPVIKEN
 *  weiss, flach und ohne Griff (Druck zum Oeffnen), schmale Fugen; der
 *  Korpus weiss, hohl (Boden, Deckel, Seiten, Rueckwand, Mittelwaende, ein
 *  Einlegeboden je Feld) und ohne Sockel direkt auf dem Boden. Obenauf
 *  KUDDARNA in hellem Graubeige: Sitzpolster 6 cm ueber die ganze Laenge
 *  und fast die ganze Tiefe, eines je Tuerfeld, jedes ein Platz mit Blick
 *  nach vorn; an der Wand Rueckenpolster (62 x 44, etwa 10 cm dick, 10
 *  Grad angelehnt), so viele wie auf die Laenge passen, vom Sitz bis H. Der
 *  Korpus ist 38 hoch (bei kleinem H weniger), der Deckel ist das
 *  Hindernis mit Oberkante. Als L (bankStuecke) je Kasten. */
function bestaBank(o: O, f: MoebelFarben): Teil[] {
  const H = o.hoehe_cm
  const korpus = o.farbe ?? f.weiss
  const tuerFarbe = ton(korpus, 1.02)
  const innenFarbe = ton(korpus, 0.95)
  const sitz = Math.min(44, H)
  const kh = sitz - Math.min(6, sitz * 0.15)
  const out: Teil[] = []
  for (const s of bankStuecke(o)) {
    const w = s.x1 - s.x0
    const tief = s.y1 - s.y0
    if (w < 2 * BRETT + 1 || tief < 2 * BRETT + 1) continue
    const d = BRETT
    const fy = s.y1 - d
    const n = Math.max(1, Math.round(w / 60))
    const fw = w / n
    // Korpus: Boden und Deckel ueber die ganze Breite, Seiten dazwischen.
    out.push(
      rd(t(s.x0, s.y0, s.x1, fy, 0, d, korpus), 0.3),
      rd(t(s.x0, s.y0, s.x1, fy, kh - d, kh, korpus), 0.3),
      rd(t(s.x0, s.y0, s.x0 + d, fy, d, kh - d, korpus), 0.3),
      rd(t(s.x1 - d, s.y0, s.x1, fy, d, kh - d, korpus), 0.3),
      rd(t(s.x0 + d, s.y0, s.x1 - d, s.y0 + 0.8, d, kh - d, innenFarbe), 0.1),
    )
    for (let i = 0; i < n; i++) {
      const a = s.x0 + i * fw
      if (i > 0) out.push(rd(t(a - d / 2, s.y0 + 0.8, a + d / 2, fy, d, kh - d, korpus), 0.1))
      const ia = a + (i > 0 ? d / 2 : d)
      const ib = a + fw - (i < n - 1 ? d / 2 : d)
      if (kh > 20 && ib - ia > 4) out.push(rd(t(ia + 0.2, s.y0 + 0.8, ib - 0.2, fy - 1, kh / 2 - d / 2, kh / 2 + d / 2, innenFarbe), 0.1))
      // Tuer LAPPVIKEN: ueber dem Korpus, Fuge 3 mm, links angeschlagen
      // in der linken Haelfte, sonst rechts.
      out.push({ ...rd(t(a + FUGE / 2, fy, a + fw - FUGE / 2, s.y1, FUGE / 2, kh - FUGE / 2, tuerFarbe), 0.15), front: { art: 'tuer', angel: i < n / 2 ? 'min' : 'max', auf: 1 } })
    }
    // Sitzpolster: je Feld eins, fast so tief wie die Bank.
    out.push(...polster(s.x0, s.x1, n, s.y0 + 0.5, s.y1 - 1, kh, sitz, ton(KUDDARNA, 1.03)).map((q) => sitzPlatz(q)))
    // Rueckenpolster an der Wand, leicht angelehnt: die gekippte Huelle
    // reicht genau vom Sitz bis H und liegt an der Wand an.
    if (!s.lehne || H < sitz + 10) continue
    const neig = 10
    const sn = Math.sin((neig * Math.PI) / 180)
    const cs = Math.cos((neig * Math.PI) / 180)
    const dk = Math.min(10, tief * 0.3)
    const hk = Math.min(44, (H - sitz - dk * sn) / cs)
    const zc = sitz + (hk * cs + dk * sn) / 2
    const yc = s.y0 + 0.3 + (dk * cs + hk * sn) / 2
    const nk = Math.max(1, Math.round(w / 62))
    const kw = Math.min(62, w / nk - 0.6)
    for (let i = 0; i < nk; i++) {
      const cx = s.x0 + (w / nk) * (i + 0.5)
      out.push({ ...rd(t(cx - kw / 2, yc - dk / 2, cx + kw / 2, yc + dk / 2, zc - hk / 2, zc + hk / 2, ton(KUDDARNA, i % 2 ? 1.07 : 1.1)), Math.min(4.5, dk * 0.45)), kipp: { laengs: neig } })
    }
  }
  return out
}

/* ------------------------------------------------------------ Kueche */

/** Kueche nach IKEA-Mass (E82), cm. */
const SOCKEL = 10 // Sockel unter den Unterschraenken, 5 cm hinter den Fronten
const PLATTE = 3.8 // Arbeitsplatte
const BRETT = 1.8 // Korpusplatten und Fronten
const FUGE = 0.3 // zwischen den Fronten
const UEBERSTAND = 2 // Arbeitsplatte vor den Fronten
const OBER_ABSTAND = 55 // Arbeitsplatte bis Unterkante Oberschrank
const OBER_TIEF = 37 // Tiefe der Oberschraenke

type ModulTyp = 'tuer' | 'spuele' | 'herd' | 'gs' | 'blind'
/** Ein Feld der Kuechenzeile von a bis b (cm entlang der Zeile): Schrank
 *  mit Tuer, Spuele, Herd (Backofen, Schublade, Kochfeld, Haube darueber),
 *  Geschirrspueler oder blind (Ecke unter dem anderen Schenkel). angel:
 *  Tueranschlag fest (an der Ecke weg von der Ecke), sonst abwechselnd. */
interface Modul {
  typ: ModulTyp
  a: number
  b: number
  angel?: 'min' | 'max'
}
/** Geraete fuer die freien Felder: a Kaffeemaschine und Wasserkocher, b
 *  Messerblock, Kellen, Oel, Essig und Schneidebrett. */
type GeraeteGruppe = 'a' | 'b'
interface ZeileWahl {
  /** Rueckwand, Oberschraenke, Haube und Licht (die ganze Kuechenzeile). */
  oben: boolean
  /** Gruppen fuer die freien Felder (Tuer, Geschirrspueler) der Reihe nach. */
  geraete: GeraeteGruppe[]
  /** Spuelmittel am Becken und Geschirrtuch am Backofengriff. */
  zubehoer: boolean
  /** Geschirr in Feld i: bei langen Kuechen nur in jedem zweiten. */
  inhalt: (i: number) => boolean
  /** Lange Kueche: je Schrank ein Teil Geschirr weniger (Teilebudget). */
  wenig?: boolean
}

/** Gleich breite Felder von von bis bis, etwa 60 cm. */
function felder(von: number, bis: number, typen: (n: number, w: number) => ModulTyp[]): Modul[] {
  const n = Math.max(1, Math.round((bis - von) / 60))
  const w = (bis - von) / n
  return typen(n, w).map((typ, i) => ({ typ, a: von + i * w, b: von + (i + 1) * w }))
}

/** Gerade Zeile: Spuele vorn (ab vier Feldern im zweiten, daneben der
 *  Geschirrspueler), Herd am anderen Ende, dazwischen Schraenke. */
function zeilenTypen(n: number, w: number): ModulTyp[] {
  const typ: ModulTyp[] = Array.from({ length: n }, () => 'tuer')
  if (w < 40) return typ
  const s = n >= 4 ? 1 : 0
  typ[s] = 'spuele'
  if (n >= 4) typ[s + 1] = 'gs'
  if (n >= 2 && w >= 45) typ[n >= 6 ? n - 2 : n - 1] = 'herd'
  return typ
}

/** Seiten eines Korpus: aussen an den Enden (in Frontfarbe), innen an
 *  jeder Grenze zwischen zwei Feldern. */
function seiten(L: number, module: Modul[], tief: number, z0: number, z1: number, korpus: string, aussen: string): Teil[] {
  const out: Teil[] = [t(0, 0, BRETT, tief, z0, z1, aussen), t(L - BRETT, 0, L, tief, z0, z1, aussen)]
  for (const m of module) if (m.b < L - 0.01) out.push(t(m.b - BRETT / 2, 0, m.b + BRETT / 2, tief, z0, z1, korpus))
  return out
}

/** Innen frei zwischen den Seiten eines Feldes. */
function innen(m: Modul, L: number): [number, number] {
  return [m.a + (m.a <= 0.01 ? BRETT : BRETT / 2), m.b - (m.b >= L - 0.01 ? BRETT : BRETT / 2)]
}

/** Etwas Geschirr im Unterschrank: Topf mit Deckel und Schuesseln, oder
 *  Salatschuessel und zwei Vorratsglaeser. Hoechstens drei Teile, wenig:
 *  zwei. */
function unterInhalt(ia: number, ib: number, boden: number, regal: number, i: number, f: MoebelFarben, wenig = false): Teil[] {
  if (ib - ia < 30) return []
  const out: Teil[] =
    i % 2 === 0
      ? [
          kegel(ia + 12, 16, 6, 9, regal, regal + 8, misch(f.keramik, f.spielBlau, 0.25)),
          { ...kegel(ia + 13, 18, 11, 11, boden, boden + 13, f.metall), glanz: 0.7 },
          { ...kegel(ia + 13, 18, 11.4, 11.4, boden + 13, boden + 14, ton(f.metall, 0.85)), glanz: 0.7 },
        ]
      : [
          kegel(ia + 14, 18, 8, 12, boden, boden + 11, f.keramik),
          { ...kegel(ia + 8, 12, 4.5, 4.5, regal, regal + 14, f.glas, 0.6), glanz: 0.8 },
          { ...kegel(ia + 19, 12, 4.5, 4.5, regal, regal + 10, f.glas, 0.6), glanz: 0.8 },
        ]
  return wenig ? out.slice(0, 2) : out
}

/** Geschirr im Oberschrank: Tellerstapel unten, Glaeser oder Tassen auf
 *  dem ersten Brett, Schuesseln auf dem zweiten. Hoechstens vier Teile,
 *  wenig: ohne Schuesseln. */
function oberInhalt(ia: number, ib: number, z0: number, z1: number, z2: number, i: number, f: MoebelFarben, wenig = false): Teil[] {
  if (ib - ia < 32) return []
  const out: Teil[] = [zyl(t(ia + 2, 4, ia + 28, 30, z0, z0 + 7, f.keramik))]
  if (i % 2 === 0) {
    for (const x of [ia + 6, ia + 15]) out.push({ ...zyl(t(x, 20, x + 7, 27, z1, z1 + 11, f.glas, 0.5), 1.12), glanz: 0.85 })
  } else {
    const tasse = misch(f.spielGelb, f.keramik, 0.55)
    for (const x of [ia + 6, ia + 16]) out.push(zyl(t(x, 18, x + 8.5, 26.5, z1, z1 + 9.5, tasse)))
  }
  if (!wenig) out.push(kegel(ia + (ib - ia) * 0.62, 16, 5.5, 8, z2, z2 + 7, misch(f.keramik, f.spielGruen, 0.25)))
  return out
}

/** Einbaubackofen (E82) zwischen a und b, von z0 bis z1:
 *  dunkle Blende mit zwei Knebeln, Tuer mit dunklem Glasfenster und
 *  Griffstange. vorn: Vorderkante des Korpus, die Front schliesst mit den
 *  Tueren ab. tuch: ein Geschirrtuch haengt ueber der Stange. */
function ofen(a: number, b: number, vorn: number, z0: number, z1: number, f: MoebelFarben, tuch: boolean): Teil[] {
  const inox = ton(f.metall, 1.12)
  const glas = f.schwarz
  const blende = Math.min(9, (z1 - z0) * 0.16)
  const hz = z1 - blende - 3.5
  const out: Teil[] = [
    t(a + 0.2, BRETT, b - 0.2, vorn, z0, z1, ton(f.schwarz, 1.25)),
    { ...rd(t(a + 0.4, vorn, b - 0.4, vorn + 0.6, z1 - blende, z1, glas), 0.3), glanz: 0.9 },
    ...[a + 7, b - 7].map((x): Teil => ({ ...zyl(t(x - 1.7, vorn + 0.6, x + 1.7, vorn + 2.2, z1 - blende / 2 - 1.7, z1 - blende / 2 + 1.7, inox), 1, 'quer'), glanz: 0.7 })),
    { ...rd(t(a + 0.4, vorn, b - 0.4, vorn + 1.6, z0 + 0.4, z1 - blende - 0.3, inox), 0.6), glanz: 0.7 },
    { ...rd(t(a + 6, vorn + 1.6, b - 6, vorn + 1.75, z0 + 6, hz - 6, glas), 0.6), glanz: 0.95 },
    { ...zyl(t(a + 5, vorn + 3.6, b - 5, vorn + 4.8, hz - 0.6, hz + 0.6, inox), 1, 'laengs'), glanz: 0.8 },
    ...[a + 7, b - 7].map((x): Teil => ({ ...zyl(t(x - 0.8, vorn + 1.6, x + 0.8, vorn + 3.6, hz - 0.8, hz + 0.8, inox), 1, 'quer'), glanz: 0.8 })),
  ]
  if (tuch && b - a >= 40) {
    const x0 = a + (b - a) * 0.2
    const x1 = x0 + Math.min(20, (b - a) * 0.34)
    const lein = f.leinen
    out.push(
      rd(t(x0, vorn + 1.8, x1, vorn + 3.5, hz - 15, hz + 0.6, ton(lein, 0.94)), 0.3),
      rd(t(x0, vorn + 3.4, x1, vorn + 5.4, hz + 0.5, hz + 1.5, lein), 0.5),
      rd(t(x0, vorn + 4.85, x1, vorn + 5.5, Math.max(z0 + 2, hz - 28), hz + 1, lein), 0.3),
      t(x0, vorn + 5.5, x1, vorn + 5.62, Math.max(z0 + 3, hz - 24), Math.max(z0 + 6, hz - 21), misch(f.spielRot, f.leinen, 0.3)),
    )
  }
  return out
}

/** Mikrowelle (E82): dunkle Glastuer mit Fenster und kleiner Anzeige. */
function mikrowelle(a: number, b: number, vorn: number, z0: number, z1: number, f: MoebelFarben): Teil[] {
  const glas = f.schwarz
  return [
    t(a + 0.2, BRETT, b - 0.2, vorn, z0, z1, ton(f.schwarz, 1.25)),
    { ...rd(t(a + 0.4, vorn, b - 0.4, vorn + 1.4, z0 + 0.4, z1 - 0.4, ton(glas, 1.15)), 0.5), glanz: 0.9 },
    { ...rd(t(a + 3, vorn + 1.4, b - 14, vorn + 1.5, z0 + 4, z1 - 4, glas), 0.4), glanz: 0.95 },
    rd(t(b - 11, vorn + 1.4, b - 3, vorn + 1.5, z1 - 10, z1 - 5, ton(f.bildschirm, 1.6)), 0.3),
  ]
}

/** Glaskeramik-Kochfeld (E82): schwarze Platte, vier Kochzonen als helle
 *  Ringe (zwei grosse, zwei kleine) und vorn die Bedienleiste. */
function kochfeld(a: number, b: number, T: number, H: number, f: MoebelFarben): Teil[] {
  const x0 = a + 2
  const x1 = b - 2
  const y0 = 5
  const y1 = T - 7
  const w = x1 - x0
  const d = y1 - y0
  const glas = f.schwarz
  const gross = Math.max(6, Math.min(18, w * 0.36, d * 0.36))
  const klein = gross * 0.8
  const out: Teil[] = [{ ...rd(t(x0, y0, x1, y1, H, H + 0.6, glas), 0.5), glanz: 0.85 }]
  const zonen: [number, number, number][] = [
    [x0 + w * 0.27, y0 + gross / 2 + 2.5, gross],
    [x0 + w * 0.73, y0 + klein / 2 + 3, klein],
    [x0 + w * 0.27, y1 - 8 - klein / 2, klein],
    [x0 + w * 0.73, y1 - 8 - gross / 2, gross],
  ]
  for (const [cx, cy, dm] of zonen) {
    out.push({ ...zyl(t(cx - dm / 2, cy - dm / 2, cx + dm / 2, cy + dm / 2, H + 0.6, H + 0.7, ton(glas, 1.3))), glanz: 0.85 })
    out.push({ ...zyl(t(cx - dm / 2 + 0.8, cy - dm / 2 + 0.8, cx + dm / 2 - 0.8, cy + dm / 2 - 0.8, H + 0.7, H + 0.8, glas)), glanz: 0.85 })
  }
  out.push(rd(t(x0 + w / 2 - Math.min(11, w * 0.2), y1 - 5.5, x0 + w / 2 + Math.min(11, w * 0.2), y1 - 3.5, H + 0.6, H + 0.68, ton(glas, 1.45)), 0.3))
  return out
}

/** Dunstabzug (E82) unter einem flachen Oberschrank: Gehaeuse, vorn eine
 *  tiefer gezogene Blende, darunter Filter und Licht. */
function haube(a: number, b: number, WT: number, WU: number, oben: number, f: MoebelFarben): Teil[] {
  const cx = (a + b) / 2
  return [
    { ...rd(t(a + 0.5, BRETT, b - 0.5, WT - 2, WU, oben, f.metall), 0.6), glanz: 0.6 },
    { ...rd(t(a + 0.5, WT - 3, b - 0.5, WT, WU - 1.5, oben - 1, ton(f.metall, 1.15)), 0.5), glanz: 0.65 },
    t(a + 3, 4, b - 3, WT - 4, WU - 0.3, WU, ton(f.schwarz, 1.4)),
    { ...t(cx - 5, WT - 9, cx + 5, WT - 6, WU - 0.6, WU - 0.3, f.waesche), leuchte: true },
  ]
}

/** Einhebelmischer (E82) mit dem Fuss bei (cx, cy) auf Hoehe z: runder
 *  Fuss, senkrechter Koerper, Auslauf lang cm nach vorn (+y; nachLinks:
 *  nach -x) mit Spitze nach unten, oben der Hebel. Dazu der Wasserstrahl
 *  bis boden (geraet 'an': nur bei laufendem Wasser zu sehen). */
function mischer(cx: number, cy: number, z: number, lang: number, hoch: number, boden: number, f: MoebelFarben, nachLinks = false): Teil[] {
  const m = f.metall
  const koerper: Teil[] = [
    zyl(t(-2.75, -2.75, 2.75, 2.75, z, z + 1.5, m)),
    zyl(t(-1.6, -1.6, 1.6, 1.6, z + 1.5, z + hoch, m), 0.9),
    zyl(t(-1.1, 0, 1.1, lang, z + hoch - 3.4, z + hoch - 1.2, m), 1, 'quer'),
    zyl(t(-1.1, lang - 2.2, 1.1, lang, z + hoch - 5.5, z + hoch - 1.6, m)),
    rd(t(-0.7, -1.4, 0.7, 5, z + hoch, z + hoch + 1.1, m), 0.5),
  ].map((q): Teil => ({ ...q, glanz: 0.85, geraet: { art: 'wasser', teil: 'koerper' } }))
  const strahl: Teil = { ...zyl(t(-0.45, lang - 1.55, 0.45, lang - 0.65, boden, z + hoch - 5.5, f.wasser, 0.55)), geraet: { art: 'wasser', teil: 'an' } }
  return schieben(
    [...koerper, strahl].map((q) => (nachLinks ? drehLinks(q) : q)),
    cx,
    cy,
  )
}

/** Spuele (E82): Edelstahlbecken 18 cm tief mit Waenden, Boden und
 *  Ablauf, die Arbeitsplatte ausgeschnitten; Mischer an der Wandseite,
 *  der Strahl faellt ins Becken; im Schrank darunter ein Eimer. Spuelmittel
 *  hinter dem Becken (zubehoer). loch: Ausschnitt fuer die Platte. */
function spuelFeld(m: Modul, ia: number, T: number, H: number, f: MoebelFarben, zubehoer: boolean): { teile: Teil[]; loch: { x0: number; x1: number; y0: number; y1: number } } {
  const cx = (m.a + m.b) / 2
  const bi = Math.max(14, Math.min(m.b - m.a - 16, 50))
  const di = Math.max(16, Math.min(T - 22, 40))
  const bx0 = cx - bi / 2 - 1
  const bx1 = cx + bi / 2 + 1
  const by0 = 9
  const by1 = by0 + di + 2
  const zb = H - 18
  const st = f.metall
  const g = (q: Teil): Teil => ({ ...q, glanz: 0.8 })
  const ty = (1.5 + by0) / 2
  const teile: Teil[] = [
    g(rd(t(bx0, by0, bx0 + 1, by1, zb, H + 0.2, st), 0.3)),
    g(rd(t(bx1 - 1, by0, bx1, by1, zb, H + 0.2, st), 0.3)),
    g(rd(t(bx0 + 1, by0, bx1 - 1, by0 + 1, zb, H + 0.2, st), 0.3)),
    g(rd(t(bx0 + 1, by1 - 1, bx1 - 1, by1, zb, H + 0.2, st), 0.3)),
    g(rd(t(bx0 + 1, by0 + 1, bx1 - 1, by1 - 1, zb, zb + 1, ton(st, 0.95)), 0.6)),
    zyl(t(cx - 2.2, (by0 + by1) / 2 - 2.2, cx + 2.2, (by0 + by1) / 2 + 2.2, zb + 1, zb + 1.12, ton(st, 0.55))),
    ...mischer(cx, ty, H, by0 + 1 + di * 0.38 - ty, 24, zb + 1, f),
    zyl(t(ia + 3, 10, ia + 25, 32, SOCKEL + BRETT, SOCKEL + BRETT + Math.min(32, zb - SOCKEL - BRETT - 4), ton(f.schwarz, 1.6))),
  ]
  if (zubehoer) {
    const sx = cx + bi * 0.3
    teile.push(...alsDing([{ ...kegel(sx, 5.3, 2.6, 2.4, H, H + 15, misch(f.spielGruen, f.glas, 0.3), 0.85), glanz: 0.8 }, zyl(t(sx - 1, 4.3, sx + 1, 6.3, H + 15, H + 17.5, f.weiss))], 'spuelmittel'))
  }
  return { teile, loch: { x0: bx0, x1: bx1, y0: by0, y1: by1 } }
}

/** Arbeitsplatte 3,8 cm, Kanten 3 mm gerundet, um die Becken ausgeschnitten. */
function arbeitsplatte(L: number, T: number, z0: number, z1: number, loecher: { x0: number; x1: number; y0: number; y1: number }[], f: MoebelFarben): Teil[] {
  const p = (x0: number, y0: number, x1: number, y1: number): Teil => rd(t(x0, y0, x1, y1, z0, z1, f.platte), 0.3)
  const out: Teil[] = []
  let x = 0
  for (const l of [...loecher].sort((a, b) => a.x0 - b.x0)) {
    if (l.x0 > x + 0.01) out.push(p(x, 0, l.x0, T))
    if (l.y0 > 0.01) out.push(p(l.x0, 0, l.x1, l.y0))
    if (l.y1 < T - 0.01) out.push(p(l.x0, l.y1, l.x1, T))
    x = l.x1
  }
  if (x < L - 0.01) out.push(p(x, 0, L, T))
  return out
}

/** Kaffeevollautomat mit Tasse unter dem Auslauf. */
function kaffeemaschine(x: number, H: number, f: MoebelFarben): Teil[] {
  const k = ton(f.schwarz, 1.18)
  return [
    ...alsDing(
      [
        rd(t(x, 3, x + 24, 36, H, H + 34, k), 2.5),
        { ...rd(t(x + 2, 32, x + 22, 38, H, H + 2.2, f.metall), 0.6), glanz: 0.7 },
        rd(t(x + 8, 33, x + 16, 37.5, H + 15, H + 19, ton(k, 0.85)), 1),
      ],
      'kaffeemaschine',
    ),
    { ...kegel(x + 12, 34.5, 2.5, 2.9, H + 2.2, H + 8.5, f.keramik), ding: 'tasse' },
  ]
}

/** Wasserkocher: Sockel, Kanne (oben schmaler), Deckel, Griff. */
function wasserkocher(x: number, H: number, f: MoebelFarben): Teil[] {
  const dunkel = ton(f.schwarz, 1.3)
  return alsDing(
    [
      zyl(t(x, 7.5, x + 17, 24.5, H, H + 1.6, dunkel)),
      { ...kegel(x + 8.5, 16, 8, 6.6, H + 1.6, H + 22, f.metall), glanz: 0.8 },
      zyl(t(x + 3.5, 11, x + 13.5, 21, H + 22, H + 23.4, dunkel)),
      rd(t(x + 15.5, 13.5, x + 19.5, 18.5, H + 5, H + 21, dunkel), 1.5),
    ],
    'wasserkocher',
  )
}

/** Messerblock mit drei Griffen. */
function messerblock(x: number, H: number, f: MoebelFarben): Teil[] {
  return alsDing(
    [rd(t(x, 4, x + 11, 18, H, H + 20, f.holzDunkel), 1.5), ...[0, 1, 2].map((k) => rd(t(x + 1.8 + k * 2.8, 8, x + 3.6 + k * 2.8, 11, H + 20, H + 29 - k * 1.5, f.schwarz), 0.6))],
    'messerblock',
  )
}

/** Steinguttopf mit Holzloeffel, Pfannenwender und Schneebesen. */
function kellen(x: number, H: number, f: MoebelFarben): Teil[] {
  const cx = x + 6
  const cy = 11
  const top = H + 15
  return alsDing(
    [
      kegel(cx, cy, 5.2, 6, H, top, misch(f.keramik, f.topf, 0.35)),
      rd(t(cx - 2.4, cy - 0.7, cx - 1, cy + 0.7, H + 4, top + 12, f.holz), 0.5),
      kugel(t(cx - 3.4, cy - 0.8, cx, cy + 0.8, top + 11, top + 17, f.holz)),
      { ...rd(t(cx + 0.4, cy - 0.25, cx + 3.4, cy + 0.25, H + 4, top + 14, f.schwarz), 0.2), kipp: { laengs: -8 } },
      { ...zyl(t(cx - 0.4, cy + 1.6, cx + 0.4, cy + 2.4, H + 4, top + 8, f.metall)), glanz: 0.8 },
      { ...kugel(t(cx - 2, cy, cx + 2, cy + 4, top + 6, top + 16, f.metall)), glanz: 0.8 },
    ],
    'kellen',
  )
}

/** Flasche (Oel oder Essig) mit Hals und Korken. */
function flasche(x: number, H: number, farbe: string, name: string, f: MoebelFarben): Teil[] {
  return alsDing(
    [
      { ...kegel(x + 3, 9, 3, 3, H, H + 19, farbe, 0.78), glanz: 0.85 },
      { ...kegel(x + 3, 9, 1.2, 1, H + 19, H + 25, farbe, 0.78), glanz: 0.85 },
      zyl(t(x + 1.9, 7.9, x + 4.1, 10.1, H + 25, H + 26.5, ton(f.holzDunkel, 1.2))),
    ],
    name,
  )
}

/** Kuechengeraete auf der Arbeitsplatte (Oberseite H) im freien Feld a..b,
 *  an die Rueckwand geschoben. Jedes Ding hat einen eigenen Namen; was
 *  nicht passt, bleibt weg. */
function geraete(g: GeraeteGruppe, a: number, b: number, H: number, T: number, f: MoebelFarben): Teil[] {
  if (T < 45) return []
  const out: Teil[] = []
  let x = a
  const passt = (w: number) => x + w <= b
  if (g === 'a') {
    if (passt(24)) {
      out.push(...kaffeemaschine(x, H, f))
      x += 26
    }
    if (passt(19.5)) out.push(...wasserkocher(x, H, f))
  } else {
    if (passt(11)) {
      out.push(...messerblock(x, H, f))
      x += 14
    }
    if (passt(12)) {
      out.push(...kellen(x, H, f))
      x += 15
    }
    if (passt(6)) {
      out.push(...flasche(x, H, misch(f.spielGelb, f.holz, 0.3), 'oel', f))
      x += 8
    }
    if (passt(6)) out.push(...flasche(x, H, misch(f.spielRot, f.schwarz, 0.45), 'essig', f))
    if (b - a >= 42 && T >= 56) out.push({ ...rd(t(a + 2, 30, a + 40, 52, H, H + 2, ton(f.holz, 1.08)), 0.8), ding: 'brett' })
  }
  return out
}

/** Oberer Teil einer Zeile: Rueckwand, Oberschraenke (hohl, zwei
 *  Einlegeboeden, Tuer mit Griff unten, etwas Geschirr), ueber dem Herd
 *  die Haube unter einem flachen Schrank, LED-Leiste darunter. */
function oberteil(L: number, T: number, H: number, decke: number, module: Modul[], f: MoebelFarben, wahl: ZeileWahl): Teil[] {
  const WU = H + OBER_ABSTAND
  const out: Teil[] = [t(0, 0, L, 1.5, H, Math.min(WU, decke), ton(f.platte, 1.1))]
  if (decke - WU < 40) return out
  const WO = Math.min(decke - 1, WU + 90)
  const WT = Math.min(OBER_TIEF, T)
  const WK = WT - BRETT
  const korpus = ton(f.weiss, 0.95)
  out.push(
    ...seiten(L, module, WK, WU, WO, korpus, f.front),
    t(BRETT, BRETT, L - BRETT, WK, WU, WU + BRETT, korpus),
    t(BRETT, BRETT, L - BRETT, WK, WO - BRETT, WO, korpus),
    t(BRETT, 0, L - BRETT, BRETT, WU, WO, korpus),
  )
  // LED-Leiste unter den Oberschraenken, vorne: Licht auf die Arbeitsplatte.
  if (L > 12) out.push({ ...t(4, WT - 7, L - 4, WT - 4, WU - 1, WU, f.waesche), leuchte: true })
  module.forEach((m, i) => {
    const [ia, ib] = innen(m, L)
    const fa = m.a + FUGE / 2
    const fb = m.b - FUGE / 2
    const angel = m.angel ?? (i % 2 === 0 ? 'min' : 'max')
    if (m.typ === 'herd') {
      const hu = WU + 6
      const mitte = (hu + WO) / 2
      out.push(
        ...haube(m.a, m.b, WT, WU, hu, f),
        t(ia, BRETT, ib, WK, hu, hu + BRETT, korpus),
        t(ia, BRETT, ib, WK - 2, mitte - BRETT / 2, mitte + BRETT / 2, korpus),
        ...tueren(fa, WK, fb, WT, hu + 0.5, WO - FUGE / 2, angel, f, 'unten'),
      )
      return
    }
    const frei = WO - WU - 2 * BRETT
    const r1 = WU + BRETT + frei / 3
    const r2 = WU + BRETT + (2 * frei) / 3
    out.push(
      ...tueren(fa, WK, fb, WT, WU + FUGE / 2, WO - FUGE / 2, angel, f, 'unten'),
      t(ia, BRETT, ib, WK - 2, r1 - BRETT / 2, r1 + BRETT / 2, korpus),
      t(ia, BRETT, ib, WK - 2, r2 - BRETT / 2, r2 + BRETT / 2, korpus),
    )
    if (wahl.inhalt(i) && frei > 36 && WK >= 31) out.push(...oberInhalt(ia, ib, WU + BRETT, r1 + BRETT / 2, r2 + BRETT / 2, i, f, wahl.wenig))
  })
  return out
}

/** Eine gerade Kuechenzeile von x = 0 bis L, Wand bei y = 0, Front bei
 *  y = T (E82, nach IKEA-Mass): Sockel 10 cm, 5 cm zurueck; hohle
 *  Korpusse aus 1,8-cm-Platten mit einem Einlegeboden; Fronten mit 3 mm
 *  Fuge und Stangengriffen; Arbeitsplatte 3,8 cm mit 2 cm Ueberstand;
 *  darueber Rueckwand und Oberschraenke (wahl.oben). */
function zeile(L: number, T: number, H: number, decke: number, f: MoebelFarben, alle: Modul[], wahl: ZeileWahl): Teil[] {
  const ober = H - PLATTE
  // Unter 25 cm Tiefe (oder sehr niedrig) passt kein Schrank: ein Block mit Platte.
  if (T < 25 || ober < SOCKEL + 15) return [rd(t(0, 0, L, T, 0, ober, f.front), 0.3), rd(t(0, 0, L, T, ober, H, f.platte), 0.3)]
  // Spuele und Herd brauchen 40 cm Tiefe.
  const module = alle.map((m): Modul => (T < 40 && (m.typ === 'spuele' || m.typ === 'herd') ? { ...m, typ: 'tuer' } : m))
  const out: Teil[] = []
  const FY = T - UEBERSTAND
  const KT = FY - BRETT
  const korpus = ton(f.weiss, 0.95)
  const fz0 = SOCKEL + FUGE / 2
  const fz1 = ober - FUGE / 2
  const regal = (SOCKEL + BRETT + ober) / 2
  out.push(
    t(0, 0, L, FY - 5, 0, SOCKEL, ton(f.platte, 1.2)),
    ...seiten(L, module, KT, SOCKEL, ober, korpus, f.front),
    t(BRETT, BRETT, L - BRETT, KT, SOCKEL, SOCKEL + BRETT, korpus),
    t(BRETT, 0, L - BRETT, BRETT, SOCKEL + BRETT, ober, korpus),
  )
  const loecher: { x0: number; x1: number; y0: number; y1: number }[] = []
  const freie: Modul[] = []
  module.forEach((m, i) => {
    const [ia, ib] = innen(m, L)
    const fa = m.a + FUGE / 2
    const fb = m.b - FUGE / 2
    const angel = m.angel ?? (i % 2 === 0 ? 'min' : 'max')
    switch (m.typ) {
      case 'tuer':
        out.push(...tueren(fa, KT, fb, FY, fz0, fz1, angel, f, 'oben'), t(ia, BRETT, ib, KT - 2, regal - BRETT / 2, regal + BRETT / 2, korpus))
        if (wahl.inhalt(i) && KT >= 32 && regal - SOCKEL > 20) out.push(...unterInhalt(ia, ib, SOCKEL + BRETT, regal + BRETT / 2, i, f, wahl.wenig))
        freie.push(m)
        break
      case 'gs':
        // Geschirrspueler hinter einer Front: klappt nach unten, bleibt hier zu.
        out.push(rd(t(fa, KT, fb, FY, fz0, fz1, f.front), 0.25), ...griff((m.a + m.b) / 2, FY, fz1 - 4.5, false, f))
        freie.push(m)
        break
      case 'spuele': {
        out.push(...tueren(fa, KT, fb, FY, fz0, fz1, angel, f, 'oben'))
        const s = spuelFeld(m, ia, T, H, f, wahl.zubehoer)
        out.push(...s.teile)
        loecher.push(s.loch)
        break
      }
      case 'herd': {
        // Backofen unter dem Kochfeld, darunter eine Schublade.
        const oz1 = fz1
        const oz0 = Math.max(SOCKEL + 12, oz1 - 59.5)
        out.push(...ofen(fa, fb, KT, oz0, oz1, f, wahl.zubehoer))
        if (oz0 - SOCKEL > 8) out.push(...schublade(fa, fb, KT, FY, fz0, oz0 - FUGE / 2, KT - BRETT - 1, 1, f.front, ton(f.front, 0.85), f))
        out.push(...kochfeld(m.a, m.b, T, H, f))
        break
      }
      default:
        // Ecke unter dem anderen Schenkel: nur eine Blende.
        out.push(rd(t(fa, KT, fb, FY, fz0, fz1, f.front), 0.25))
    }
  })
  out.push(...arbeitsplatte(L, T, ober, H, loecher, f))
  if (wahl.oben) out.push(...oberteil(L, T, H, decke, module, f, wahl))
  wahl.geraete.forEach((g, k) => {
    const m = freie[k]
    if (m) out.push(...geraete(g, m.a + 3, m.b - 3, H, T, f))
  })
  return out
}

/** Die Kuechenzeile: gerade, oder als L zwei Zeilen (E82). Im Rahmen mit
 *  freier Ecke rechts oben liegt der lange Schenkel unten an der Wand
 *  (y = T) mit dem Herd zum freien Ende, die Ecke darin ist blind; der
 *  kurze Schenkel links an der Wand (x = 0) traegt die Spuele. */
function kueche(o: O, decke: number, f: MoebelFarben): Teil[] {
  const B = o.breite_cm
  const T = o.tiefe_cm
  const H = o.hoehe_cm
  const gerade = o.form !== 'l' || !o.ausschnitt_breite_cm || !o.ausschnitt_tiefe_cm || o.ausschnitt_breite_cm >= B || o.ausschnitt_tiefe_cm >= T
  if (gerade) {
    const mod = felder(0, B, zeilenTypen)
    const lang = mod.length > 5
    return zeile(B, T, H, decke, f, mod, { oben: true, geraete: ['a', 'b'], zubehoer: true, inhalt: (i) => !lang || i % 2 === 0, wenig: lang })
  }
  const aB = o.ausschnitt_breite_cm ?? 0
  const aT = o.ausschnitt_tiefe_cm ?? 0
  const schenkel = B - aB
  const armT = T - aT
  const rest = felder(schenkel, B, (n, w) => {
    const typ: ModulTyp[] = Array.from({ length: n }, () => 'tuer')
    if (w >= 45) typ[n >= 4 ? n - 2 : n - 1] = 'herd'
    return typ
  })
  const lang: Modul[] = [{ typ: 'blind', a: 0, b: schenkel, angel: 'max' }, ...rest]
  const quer = felder(0, aT, (n, w) => {
    if (w < 40) return Array.from({ length: n }, () => 'tuer')
    if (n === 1) return ['spuele']
    if (n === 2) return ['spuele', 'tuer']
    return ['tuer', 'spuele', 'gs', ...Array.from({ length: n - 3 }, (): ModulTyp => 'tuer')]
  })
  quer[quer.length - 1].angel = 'min'
  const frei = lang.filter((m) => m.typ === 'tuer' || m.typ === 'gs').length
  const gruppen: GeraeteGruppe[] = ['a', 'b']
  const viele = lang.length + quer.length > 6
  const inhalt = (i: number) => !viele || i % 2 === 0
  // Der lange Schenkel entsteht wie eine gerade Zeile und wird an y
  // gespiegelt (Wand bei y = T); der kurze durch Tauschen der Achsen.
  const teile: Teil[] = [
    ...zeile(B, armT, H, decke, f, lang, { oben: true, geraete: gruppen.slice(0, frei), zubehoer: true, inhalt, wenig: viele }).map((q) => spiegelY(q, T)),
    ...zeile(aT, schenkel, H, decke, f, quer, { oben: true, geraete: gruppen.slice(frei), zubehoer: true, inhalt, wenig: viele }).map(tausch),
  ]
  return teile.map(spiegler(o))
}

/** Das Innere eines Kuehlschranks zwischen x0..x1, y0..yt (yt: Rueckseite
 *  der Tuer), z0..z1: Glasboeden, Gemuesefach, Milch, Glas und Butter,
 *  dazu Tuerfaecher mit einer Flasche, die an der Tuer (gruppe) haengen. */
function kuehlInnen(x0: number, x1: number, y0: number, yt: number, z0: number, z1: number, f: MoebelFarben, gruppe: number): Teil[] {
  const glas = f.glas
  const h = z1 - z0
  const ys = yt - 7
  const out: Teil[] = []
  const boeden = h > 80 ? [0.3, 0.55, 0.78] : [0.45]
  const lagen = [...boeden.map((k) => z0 + h * k + 0.3), z1]
  for (const k of boeden) out.push({ ...t(x0 + 0.5, y0 + 1, x1 - 0.5, ys, z0 + h * k - 0.3, z0 + h * k + 0.3, glas, 0.5), glanz: 0.8 })
  const gh = Math.min(18, h * boeden[0] - 2)
  out.push({ ...rd(t(x0 + 1, y0 + 2, x1 - 1, ys - 1, z0 + 0.5, z0 + 0.5 + gh, glas, 0.6), 1), glanz: 0.7 })
  const frei = (i: number) => lagen[i + 1] - lagen[i] - 2
  out.push(
    rd(t(x0 + 3, y0 + 6, x0 + 10, y0 + 13, lagen[0], lagen[0] + Math.min(19, frei(0)), f.weiss), 0.6),
    kegel(x1 - 8, y0 + 10, 3.5, 3.5, lagen[0], lagen[0] + Math.min(10, frei(0)), misch(f.spielRot, f.glas, 0.4)),
  )
  const lb = boeden.length > 1 ? 1 : 0
  out.push(rd(t(x0 + 12, y0 + 5, x0 + 26, y0 + 14, lagen[lb], lagen[lb] + Math.min(6, frei(lb)), misch(f.spielGelb, f.weiss, 0.5)), 1))
  const an: Front = { art: 'griff', gruppe }
  const stufen = h > 80 ? [0.12, 0.45, 0.75] : [0.2, 0.6]
  for (const k of stufen) out.push({ ...rd(t(x0 + 1.5, yt - 6, x1 - 1.5, yt - 0.3, z0 + h * k, z0 + h * k + 6, glas, 0.6), 0.5), front: an, glanz: 0.7 })
  const zf = z0 + h * stufen[0] + 0.5
  out.push({ ...kegel(x0 + 6, yt - 3.2, 2.8, 2.8, zf, zf + Math.min(24, h * (stufen[1] - stufen[0]) - 3), ton(f.gruen, 1.25), 0.8), front: an })
  return out
}

/** Gefrierfaecher: n durchscheinende Schubkaesten uebereinander. */
function gefrierFaecher(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, n: number, f: MoebelFarben): Teil[] {
  const h = (z1 - z0) / n
  return Array.from({ length: n }, (_, i) => rd(t(x0 + 1, y0 + 1, x1 - 1, y1 - 2, z0 + i * h + 0.5, z0 + i * h + h * 0.88, f.glas, 0.7), 1))
}

/** Kuehlschrank oder Gefrierschrank (E82), frei stehend: Gehaeuse,
 *  dicke Tuer mit langem Griff. Kuehlschrank ueber 120 cm mit
 *  Gefrierteil unten; innen Glasboeden, Gemuesefach, Lebensmittel und
 *  Tuerfaecher, die mit der Tuer drehen. */
function kuehlschrank(B: number, T: number, H: number, k: string, f: MoebelFarben, gefrier: boolean): Teil[] {
  const innenFarbe = ton(f.weiss, 1.06)
  const wand = Math.min(3, B / 12)
  const ty1 = T - 0.5
  const ty0 = ty1 - Math.min(4, T * 0.08)
  const out: Teil[] = [
    rd(t(0, 0, wand, ty0, 0, H, k), 1),
    rd(t(B - wand, 0, B, ty0, 0, H, k), 1),
    rd(t(wand, 0, B - wand, ty0, H - 4, H, k), 1),
    t(wand, 0, B - wand, ty0, 0, 7, ton(k, 0.9)),
    t(wand, 0, B - wand, 4, 7, H - 4, innenFarbe),
  ]
  const tuerTeile = (z0: number, z1: number, lage: 'oben' | 'unten', gruppe: number) =>
    tuerMitGriff(0.5, ty0, B - 0.5, ty1, z0, z1, k, 'max', f, lage, gruppe, Math.min(30, (z1 - z0) * 0.45))
  if (gefrier) {
    out.push(...tuerTeile(0.5, H - 0.5, 'oben', neueGruppe()), ...gefrierFaecher(wand, B - wand, 4, ty0, 7, H - 4, Math.max(2, Math.min(5, Math.round((H - 11) / 30))), f))
    return out
  }
  const g = neueGruppe()
  if (H > 120) {
    const zf = Math.round(H * 0.35)
    out.push(
      t(wand, 4, B - wand, ty0, zf - 2, zf + 2, innenFarbe),
      ...tuerTeile(0.5, zf - 0.5, 'oben', neueGruppe()),
      ...gefrierFaecher(wand, B - wand, 4, ty0, 7, zf - 2, 2, f),
      ...tuerTeile(zf + 0.5, H - 0.5, 'unten', g),
      ...kuehlInnen(wand, B - wand, 4, ty0, zf + 2, H - 4, f, g),
    )
    return out
  }
  out.push(
    ...tuerTeile(0.5, H - 0.5, 'oben', g),
    rd(t(wand + 1.5, 5, B - wand - 1.5, ty0 - 8, H - 18, H - 5, innenFarbe), 0.8),
    ...kuehlInnen(wand, B - wand, 4, ty0, 7, H - 19, f, g),
  )
  return out
}

/** Hoher Korpus auf Sockel mit Fronten in Kuechenflucht (E82): Sockel,
 *  Seiten aussen in Frontfarbe, Boden, Deckel und Rueckwand. */
function hochKorpus(B: number, T: number, H: number, f: MoebelFarben): Teil[] {
  const FY = T - UEBERSTAND
  const KT = FY - BRETT
  const korpus = ton(f.weiss, 0.95)
  return [
    t(3, 0, B - 3, FY - 5, 0, SOCKEL, ton(f.platte, 1.2)),
    t(0, 0, BRETT, KT, SOCKEL, H, f.front),
    t(B - BRETT, 0, B, KT, SOCKEL, H, f.front),
    t(BRETT, BRETT, B - BRETT, KT, SOCKEL, SOCKEL + BRETT, korpus),
    t(BRETT, BRETT, B - BRETT, KT, H - BRETT, H, korpus),
    t(BRETT, 0, B - BRETT, BRETT, SOCKEL + BRETT, H - BRETT, korpus),
  ]
}

/** Hochschrank (E82): unten eine hohe Tuer, oben eine kurze. Mit
 *  Einbaukuehlschrank (am Namen) steht hinter der unteren Tuer ein
 *  Kuehlschrank, sonst Einlegeboeden. */
function hochschrank(B: number, T: number, H: number, f: MoebelFarben, kuehl: boolean): Teil[] {
  const FY = T - UEBERSTAND
  const KT = FY - BRETT
  const korpus = ton(f.weiss, 0.95)
  const teilung = Math.min(H - 40, 200)
  const out: Teil[] = [...hochKorpus(B, T, H, f), t(BRETT, BRETT, B - BRETT, KT, teilung - BRETT / 2, teilung + BRETT / 2, korpus)]
  const g = neueGruppe()
  out.push(...tuerMitGriff(FUGE / 2, KT, B - FUGE / 2, FY, SOCKEL + FUGE / 2, teilung - FUGE / 2, f.front, 'max', f, 'oben', g))
  if (kuehl) out.push(...kuehlInnen(BRETT, B - BRETT, BRETT, KT, SOCKEL + BRETT, teilung - BRETT / 2, f, g))
  else {
    for (const k of [0.25, 0.5, 0.75]) {
      const z = SOCKEL + (teilung - SOCKEL) * k
      out.push(t(BRETT, BRETT, B - BRETT, KT - 2, z - BRETT / 2, z + BRETT / 2, korpus))
    }
  }
  if (H - teilung > 15) {
    const z = (teilung + H) / 2
    out.push(...tuerMitGriff(FUGE / 2, KT, B - FUGE / 2, FY, teilung + FUGE / 2, H - FUGE / 2, f.front, 'max', f, 'unten'), t(BRETT, BRETT, B - BRETT, KT - 2, z - BRETT / 2, z + BRETT / 2, korpus))
  }
  return out
}

/** Hochschrank mit Backofen (E82): unten eine Tuer mit Brett, darueber
 *  Backofen und Mikrowelle, oben eine kurze Tuer. Bei wenig Hoehe faellt
 *  zuerst die obere Tuer, dann die Mikrowelle weg (Blende statt dessen). */
function backofenschrank(B: number, T: number, H: number, f: MoebelFarben): Teil[] {
  const FY = T - UEBERSTAND
  const KT = FY - BRETT
  const korpus = ton(f.weiss, 0.95)
  const fa = FUGE / 2
  const fb = B - FUGE / 2
  const zo = Math.max(SOCKEL + 20, Math.min(82, H - 64))
  const out: Teil[] = [
    ...hochKorpus(B, T, H, f),
    ...tuerMitGriff(fa, KT, fb, FY, SOCKEL + FUGE / 2, zo - 2 - FUGE / 2, f.front, 'min', f, 'oben'),
    t(BRETT, BRETT, B - BRETT, KT - 2, (SOCKEL + zo) / 2 - BRETT / 2, (SOCKEL + zo) / 2 + BRETT / 2, korpus),
    t(BRETT, BRETT, B - BRETT, KT, zo - 2, zo - 2 + BRETT, korpus),
    ...ofen(fa, fb, KT, zo, Math.min(H - 1.5, zo + 59.5), f, false),
  ]
  const zm = zo + 62
  let frei = zo + 60
  if (H >= zm + 40) {
    out.push(...mikrowelle(fa, fb, KT, zm, zm + 38, f), t(BRETT, BRETT, B - BRETT, KT, zm + 38, zm + 38 + BRETT, korpus))
    frei = zm + 40
  }
  if (H - frei >= 25) {
    const z = (frei + H) / 2
    out.push(...tuerMitGriff(fa, KT, fb, FY, frei + FUGE / 2, H - FUGE / 2, f.front, 'min', f, 'unten'), t(BRETT, BRETT, B - BRETT, KT - 2, z - BRETT / 2, z + BRETT / 2, korpus))
  } else if (H - frei > 1) out.push(rd(t(fa, KT, fb, FY, frei + FUGE / 2, H - FUGE / 2, f.front), 0.25))
  return out
}

/** Geschirrspueler zum Einbauen (E82): Geraet hinter einer Front mit Griff,
 *  Sockel und Arbeitsplatte darueber. */
function geschirrspueler(B: number, T: number, H: number, f: MoebelFarben): Teil[] {
  const FY = T - UEBERSTAND
  const ober = H - PLATTE
  return [
    t(3, 0, B - 3, FY - 5, 0, SOCKEL, ton(f.platte, 1.2)),
    { ...rd(t(0.3, 0, B - 0.3, FY - BRETT, SOCKEL, ober, f.metall), 0.4), glanz: 0.5 },
    rd(t(FUGE / 2, FY - BRETT, B - FUGE / 2, FY, SOCKEL + FUGE / 2, ober - FUGE / 2, f.front), 0.25),
    ...griff(B / 2, FY, ober - 4.8, false, f),
    rd(t(0, 0, B, T, ober, H, f.platte), 0.5),
  ]
}

/* ------------------------------------------------------------ Bad */

/** Waschbecken (E82): Keramik mit Ablage hinten, Rand, Becken mit Boden
 *  und Ablauf, Saeule darunter, Mischer mit Strahl. */
function waschbecken(B: number, T: number, H: number, f: MoebelFarben): Teil[] {
  const k = f.keramik
  const tief = Math.min(14, H * 0.2)
  const zb = H - tief
  const deck = Math.min(11, T * 0.26)
  const r = Math.min(3.5, B * 0.07)
  const boden = zb + 2
  const cx = B / 2
  const cyb = (deck + T - r) / 2
  const cy = deck / 2
  return [
    rd(t(0, 0, B, deck, zb, H, k), 1.6),
    rd(t(0, T - r, B, T, zb, H, k), 1.4),
    rd(t(0, deck, r, T - r, zb, H, k), 1.2),
    rd(t(B - r, deck, B, T - r, zb, H, k), 1.2),
    rd(t(r, deck, B - r, T - r, zb, boden, ton(k, 0.97)), 2.2),
    { ...zyl(t(cx - 1.8, cyb - 1.8, cx + 1.8, cyb + 1.8, boden, boden + 0.12, f.metall)), glanz: 0.8 },
    rd(t(B * 0.38, 0, B * 0.62, T * 0.38, 0, zb, ton(k, 0.97)), 3),
    ...mischer(cx, cy, H, Math.min(12, cyb - cy - 1), 16, boden, f),
  ]
}

/** WC (E82): Fuss (nach oben weiter), Becken, Brille als Platz zum Sitzen
 *  (Blick weg von der Wand), dunkle Oeffnung, Deckel hochgeklappt und
 *  leicht nach hinten an den Spuelkasten gelehnt (ragt dabei bis 20 cm
 *  ueber H).
 *  Ab 70 cm ein Spuelkasten mit Taste, sonst eine Druckplatte an der Wand. */
function wc(B: number, T: number, H: number, f: MoebelFarben): Teil[] {
  const k = f.keramik
  const cx = B / 2
  const rand = Math.min(40, H * 0.5)
  const sitz = rand + 2.2
  const kasten = H >= 70
  const kt = kasten ? Math.min(17, T * 0.26) : 2
  const out: Teil[] = []
  if (kasten) {
    out.push(
      rd(t(B * 0.06, 0, B * 0.94, kt, rand, H - 2.5, k), 3),
      rd(t(B * 0.04, 0, B * 0.96, kt + 1, H - 2.5, H - 0.6, ton(k, 0.98)), 1.2),
      { ...zyl(t(cx - 2.2, kt / 2 - 2.2, cx + 2.2, kt / 2 + 2.2, H - 0.6, H, f.metall)), glanz: 0.8 },
    )
  } else if (H >= 60) {
    out.push(rd(t(cx - 12, 0, cx + 12, 1.2, H - 16, H, f.weiss), 0.5), { ...rd(t(cx - 5, 1.2, cx + 5, 1.8, H - 11, H - 5, f.metall), 0.4), glanz: 0.8 })
  }
  const y0 = kasten ? 4 : 2
  // Fuss: oben (1,25-fach) so weit wie das Becken, mit 4 cm Rand.
  const fy = (y0 + T) / 2
  const fr = (T - y0 - 8) / 2 / 1.25
  out.push(
    zyl(t(cx - B * 0.24, fy - fr, cx + B * 0.24, fy + fr, 0, rand - 10, k), 1.25),
    zyl(t(B * 0.08, y0, B * 0.92, T - 1, rand - 10, rand, k)),
    sitzPlatz(zyl(t(B * 0.06, kt + 2, B * 0.94, T, rand, sitz, f.weiss))),
    zyl(t(B * 0.24, kt + 8, B * 0.76, T - 7, sitz, sitz + 0.12, misch(f.keramik, f.wasser, 0.45))),
  )
  const dl = Math.max(10, Math.min(46, T - kt - 4, H + 18 - sitz))
  const neig = 5
  const lz = sitz + (dl / 2) * Math.cos((neig * Math.PI) / 180)
  const ly = kt + 3
  out.push({ ...zyl(t(B * 0.07, ly - 1, B * 0.93, ly + 1, lz - dl / 2, lz + dl / 2, f.weiss), 1, 'quer'), kipp: { laengs: neig } })
  return out
}

/** Badewanne (E82): Waende rundum (Kopfende x = 0 schmal, Fussende mit der
 *  Armatur breiter), gerundeter Boden mit Ablauf, Mischer mit Auslauf nach
 *  -x und Strahl, ein gefaltetes Handtuch auf dem vorderen Rand. */
function badewanne(B: number, T: number, H: number, f: MoebelFarben): Teil[] {
  const k = f.keramik
  const rl = Math.min(9, T * 0.12)
  const rk = Math.min(12, B * 0.08)
  const rf = Math.min(15, B * 0.1)
  const tief = Math.max(5, Math.min(42, H - 10))
  const boden = H - tief
  const out: Teil[] = [
    rd(t(0, 0, B, rl, 0, H, k), 2.5),
    rd(t(0, T - rl, B, T, 0, H, k), 2.5),
    rd(t(0, rl, rk, T - rl, 0, H, k), 2.5),
    rd(t(B - rf, rl, B, T - rl, 0, H, k), 2.5),
    rd(t(rk, rl, B - rf, T - rl, 0, boden, ton(k, 0.97)), 4),
    { ...zyl(t(B - rf - 9, T / 2 - 2.4, B - rf - 4.2, T / 2 + 2.4, boden, boden + 0.12, f.metall)), glanz: 0.8 },
    ...mischer(B - rf / 2, T / 2, H, rf / 2 + 5, 14, boden, f, true),
  ]
  if (rl >= 6 && B >= 100) {
    const tuch = misch(f.spielBlau, f.leinen, 0.6)
    out.push(
      ...alsDing(
        [rd(t(rk + 8, T - rl + 0.5, rk + 40, T - 0.5, H, H + 2.6, tuch), 1.2), rd(t(rk + 9, T - rl + 0.8, rk + 39, T - 0.8, H + 2.6, H + 5, ton(tuch, 1.06)), 1.1)],
        'handtuch',
      ),
    )
  }
  return out
}

/* ------------------------------------------------------------ Fernseher */

/** Fernseher-Paneel von x0 bis x1, Rueckseite bei y0, d tief, z0 bis z1:
 *  Gehaeuse hinten, Platte, schmaler Rahmen, der Bildschirm 2 mm hinter
 *  der Rahmenkante (schwarz glaenzend, geraet 'aus'), 1 mm davor der
 *  leuchtende (geraet 'an'), unten die rote Bereitschaftsleuchte (aus). */
function tvPaneel(x0: number, x1: number, y0: number, d: number, z0: number, z1: number, f: MoebelFarben): Teil[] {
  const koerper = { art: 'tv', teil: 'koerper' } as const
  const rahmen = ton(f.schwarz, 1.12)
  const yv = y0 + d
  const w = x1 - x0
  const h = z1 - z0
  const bz = Math.min(0.9, w * 0.01)
  const bu = Math.min(1.8, h * 0.03)
  const cx = (x0 + x1) / 2
  return [
    { ...rd(t(x0 + w * 0.12, y0, x1 - w * 0.12, yv - 1.2, z0 + h * 0.15, z1 - h * 0.15, ton(rahmen, 0.9)), 1.5), geraet: koerper },
    { ...rd(t(x0, yv - 1.2, x1, yv - 0.5, z0, z1, rahmen), 0.4), geraet: koerper },
    { ...rd(t(x0, yv - 0.6, x1, yv, z1 - bz, z1, rahmen), 0.25), geraet: koerper },
    { ...rd(t(x0, yv - 0.6, x1, yv, z0, z0 + bu, rahmen), 0.25), geraet: koerper },
    { ...rd(t(x0, yv - 0.6, x0 + bz, yv, z0 + bu, z1 - bz, rahmen), 0.25), geraet: koerper },
    { ...rd(t(x1 - bz, yv - 0.6, x1, yv, z0 + bu, z1 - bz, rahmen), 0.25), geraet: koerper },
    { ...t(x0 + bz, yv - 0.5, x1 - bz, yv - 0.2, z0 + bu, z1 - bz, f.schwarz), glanz: 0.95, geraet: { art: 'tv', teil: 'aus' } },
    { ...t(x0 + bz, yv - 0.4, x1 - bz, yv - 0.1, z0 + bu, z1 - bz, f.bildschirm), glanz: 0.2, geraet: { art: 'tv', teil: 'an' } },
    { ...t(cx - 0.4, yv - 0.05, cx + 0.4, yv + 0.05, z0 + bu * 0.3, z0 + bu * 0.3 + 0.4, ton(f.spielRot, 0.9)), geraet: { art: 'tv', teil: 'aus' } },
  ]
}

/** Fernseher (E82): bis 12 cm Tiefe flach an der Wand (y = 0), sonst auf
 *  einem Fuss mit Platte und Hals. Antippen schaltet ihn (Motor). */
function fernseher(B: number, T: number, H: number, f: MoebelFarben): Teil[] {
  if (T <= 12) return tvPaneel(0, B, 0, Math.min(T, 6) - 0.1, 0, H, f)
  const fuss = ton(f.schwarz, 1.3)
  const d = Math.min(6, T * 0.3)
  const z0 = Math.min(H * 0.12, 12)
  const koerper = { art: 'tv', teil: 'koerper' } as const
  return [
    { ...rd(t(B * 0.34, T * 0.18, B * 0.66, T * 0.82, 0, 1.6, fuss), 0.8), glanz: 0.5, geraet: koerper },
    { ...rd(t(B * 0.47, T / 2 - 2, B * 0.53, T / 2 + 1, 1.6, z0 + 4, fuss), 0.8), geraet: koerper },
    ...tvPaneel(0, B, T / 2 - d / 2, d, z0, H, f),
  ]
}

/* ------------------------------------------------------------ Auswahl */

/** Die Teile eines Moebels; null = unbekannte Art, dann bleibt es ein Klotz. */
export function moebelTeile(o: O, art: MoebelArt | null, f: MoebelFarben, decke: number): Teil[] | null {
  frontNr = 0
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
      return bett(B, T, H, eigen ?? f.stoff, f)
    case 'kinderbett':
      return kinderbett(B, T, H, eigen ?? f.weiss, f)
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
      // Tisch in der Mitte, je zwei Stuehle an den langen Seiten mit Blick
      // zum Tisch: vorn gebaut wie ein Stuhl an der Wand, hinten gespiegelt.
      const holz = eigen ?? f.holz
      const tx0 = B * 0.1
      const tx1 = B * 0.9
      const ty0 = T * 0.27
      const ty1 = T * 0.73
      const out: Teil[] = schieben(tisch(tx1 - tx0, ty1 - ty0, Math.min(75, H), holz), tx0, ty0)
      const c = Math.min(45, T * 0.3)
      const ch = Math.min(H, 95)
      for (const cx of [B * 0.3, B * 0.7]) {
        out.push(...schieben(esszimmerstuhl(c, c, ch, holz, f, false), cx - c / 2, 0))
        out.push(
          ...schieben(
            esszimmerstuhl(c, c, ch, holz, f, false).map((q) => spiegelY(q, c)),
            cx - c / 2,
            T - c,
          ),
        )
      }
      return out
    }
    case 'stuhl':
      return stuhlTeile(B, T, H, eigen ?? f.holz, f, o)
    case 'buerostuhl':
      return buerostuhl(B, T, H, eigen ?? ton(f.schwarz, 1.15), f)
    case 'fernseher':
      return fernseher(B, T, H, f)
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
    case 'gefrierschrank':
      return kuehlschrank(B, T, H, eigen ?? f.weiss, f, art === 'gefrierschrank')
    case 'waschmaschine':
    case 'trockner': {
      // Bullauge hoechstens so gross, dass es unter der Blende bleibt.
      const d = Math.min(B * 0.6, H * 0.62)
      return [
        rd(t(0, 0, B, T - 1, 0, H, f.weiss), 2),
        zyl(t(B / 2 - d / 2, T - 1, B / 2 + d / 2, T + 0.5, H * 0.18, H * 0.18 + d, art === 'trockner' ? ton(f.glas, 0.7) : ton(f.schwarz, 1.5)), 1, 'quer'),
        rd(t(B * 0.05, T - 1, B * 0.6, T, H * 0.84, H * 0.95, ton(f.weiss, 0.93)), 0.8),
      ]
    }
    case 'geschirrspueler':
      return geschirrspueler(B, T, H, f)
    case 'herd':
      return zeile(B, T, H, 0, f, [{ typ: B >= 45 ? 'herd' : 'tuer', a: 0, b: B }], { oben: false, geraete: [], zubehoer: false, inhalt: () => false })
    case 'spuele':
      return zeile(B, T, H, 0, f, [{ typ: B >= 40 ? 'spuele' : 'tuer', a: 0, b: B }], { oben: false, geraete: [], zubehoer: false, inhalt: () => false })
    case 'kuechenzeile':
      return kueche(o, decke, f)
    case 'bank': {
      // Sitzbank an der Wand (y = 0): Kasten mit Stauraum, Sitzpolster
      // (Plaetze, Blick nach vorn), Rueckenkissen je 60 cm an der Wand. Als
      // L (E73) je Kasten, der Ausschnitt bleibt frei (Eckbank um einen
      // Mauervorsprung).
      const korpus = eigen ?? f.weiss
      const stoff = /kuddarna/i.test(o.name ?? '') ? KUDDARNA : f.stoff
      const sitz = Math.min(46, H)
      const out: Teil[] = []
      for (const s of bankStuecke(o)) {
        const w = s.x1 - s.x0
        const n = Math.max(1, Math.round(w / 60))
        if (s.y1 - s.y0 > 8 && w > 6) out.push(t(s.x0 + 2, s.y0 + 2, s.x1 - 2, s.y1 - 4, 0, 8, ton(korpus, 0.8)))
        out.push(
          rd(t(s.x0, s.y0, s.x1, s.y1, 8, sitz - 8, korpus), 1),
          ...polster(s.x0, s.x1, n, s.y0, s.y1, sitz - 8, sitz, ton(stoff, 1.1)).map((q) => sitzPlatz(q)),
        )
        if (s.lehne && H > sitz + 10) out.push(...polster(s.x0, s.x1, n, 0, Math.min(14, T * 0.3), sitz, H, ton(stoff, 1.18)))
        // Fronten des Kastens als Klappen (Stauraum).
        for (let i = 0; i < n; i++) {
          out.push(tuer(s.x0 + (w / n) * i + 0.5, s.y1 - 1, s.x0 + (w / n) * (i + 1) - 0.5, s.y1, 9, sitz - 9, ton(korpus, 1.03), i % 2 === 0 ? 'min' : 'max', 1))
        }
      }
      return out
    }
    case 'besta_bank':
      return bestaBank(o, f)
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
    case 'hochschrank':
      // Hochschrank mit Eichenfronten, z. B. mit eingebautem Kuehlschrank.
      return hochschrank(B, T, H, f, H >= 120 && /k(ü|ue)hl|ثلاجة/i.test(o.name ?? ''))
    case 'backofen':
      return backofenschrank(B, T, H, f)
    case 'wc':
      return wc(B, T, H, f)
    case 'waschbecken':
      return waschbecken(B, T, H, f)
    case 'badewanne':
      return badewanne(B, T, H, f)
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
      // (E74), als Spiegelflaeche nach vorn (E82). Die Datenbank will
      // mindestens 5 cm Tiefe, gezeichnet wird 2,5.
      const d = Math.min(T, 2.5)
      return [t(0, 0, B, d - 0.6, 0, H, eigen ?? f.weiss), { ...t(1.5, d - 0.6, B - 1.5, d, 1.5, H - 1.5, f.spiegel), glanz: 0.95, spiegel: true }]
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
      // E91: Gruenlilie und Haengepflanzen am Namen, sonst Topf und Krone.
      return pflanzeTeile(B, T, H, o.name ?? '', eigen ?? null, f)
    case 'klavier':
      return [t(0, 0, B, T * 0.55, 0, H, eigen ?? f.schwarz), t(0, T * 0.55, B, T, 62, 72, eigen ?? f.schwarz), t(3, T * 0.58, B - 3, T * 0.95, 72, 73, f.weiss)]
    case 'garderobe':
      return [
        t(0, 0, B, 2, 90, H, eigen ?? f.holz),
        ...[0.2, 0.4, 0.6, 0.8].map((x) => t(B * x - 1.5, 2, B * x + 1.5, Math.min(10, T), Math.min(160, H - 6), Math.min(163, H - 3), f.metall)),
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
    case 'sockel':
      return sockel(B, T, H, eigen ?? f.weiss, f)
    default:
      // Deko und Spielzeug (E82), sonst null.
      return dekoTeile(art, o, f, neueGruppe)
  }
}
