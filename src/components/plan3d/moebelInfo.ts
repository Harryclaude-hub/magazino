/* Kontextmenue und Moebelkarte beim Begehen (E92): reine Rechnung ohne
 * React und three, damit scripts/bedienung-pruefen.mjs sie unter node
 * prueft.
 *
 *  menueEintraege  was im Menue steht (Details immer, Verschieben nur, wenn
 *                  es sich jetzt tragen laesst oder gesperrt ist, Hinsetzen
 *                  mit Sitzplatz, Hinlegen mit Liegeplatz)
 *  menueLage       wo das Menue steht: am Zeiger, ganz in der Flaeche
 *  masseText       Breite x Tiefe x Hoehe in ganzen cm
 *  preisText       Preis wie im Zeichner (euroText) mit Euro-Zeichen
 *  shopLink        Link zum Shop, nur http und https, mit Namen des Shops
 *  traegerKarte    Kiste -> Objekt, auf oder in dem ihr Stapel steht
 *  kistenAuf       wie viele Kisten auf oder in einem Objekt stehen
 *  BLATT_KLASSEN   E94: Lage der Moebelkarte und der anderen Blaetter in
 *                  der grossen Ansicht des Grundrisses (PlanDetails.tsx),
 *                  quer mit wenig Hoehe neben dem Plan
 */
import { euroText } from '../../lib/preis'
import type { Objekt, PlanKiste } from '../../lib/types'

export type MenueEintrag = 'details' | 'verschieben' | 'hinsetzen' | 'hinlegen'

/** Die Eintraege des Kontextmenues in fester Reihenfolge. Nacharbeit E92:
 *  gesperrt (Tragen geht, aber nicht dieses: Mauer, Spiegel, Geraet) zeigt
 *  Verschieben trotzdem, das Menue dann ausgegraut mit dem Grund (wie der
 *  Hinweis aus E89); liegen (der Platz ist ein Liegeplatz, etwa ein Bett)
 *  heisst Hinlegen statt Hinsetzen. */
export function menueEintraege(k: { tragbar: boolean; sitzbar: boolean; gesperrt?: boolean; liegen?: boolean }): MenueEintrag[] {
  const out: MenueEintrag[] = ['details']
  if (k.tragbar || k.gesperrt) out.push('verschieben')
  if (k.sitzbar) out.push(k.liegen ? 'hinlegen' : 'hinsetzen')
  return out
}

/** Abstand des Menues zum Rand der Flaeche (CSS-Pixel). */
export const MENUE_RAND_PX = 8

/** Linke obere Ecke des Menues (CSS-Pixel in der Flaeche): rechts unter
 *  dem Zeiger (x, y), passt es dort nicht, links davon oder darueber; nie
 *  ueber den Rand. Ist die Flaeche kleiner als das Menue, steht es am
 *  Rand oben links. Links und rechts sind hier immer die des Bildschirms
 *  (die 3D-Flaeche wird im Arabischen nicht gespiegelt). */
export function menueLage(
  x: number,
  y: number,
  breite: number,
  hoehe: number,
  flaecheB: number,
  flaecheH: number,
  rand: number = MENUE_RAND_PX,
): { links: number; oben: number } {
  const zahl = (v: number) => (Number.isFinite(v) ? v : 0)
  const px = zahl(x)
  const py = zahl(y)
  const b = Math.max(0, zahl(breite))
  const h = Math.max(0, zahl(hoehe))
  const fb = Math.max(0, zahl(flaecheB))
  const fh = Math.max(0, zahl(flaecheH))
  let links = px + b + rand <= fb ? px : px - b
  let oben = py + h + rand <= fh ? py : py - h
  links = Math.max(rand, Math.min(links, fb - b - rand))
  oben = Math.max(rand, Math.min(oben, fh - h - rand))
  return { links: Math.round(links), oben: Math.round(oben) }
}

/** "120 x 80 x 75 cm" (Breite x Tiefe x Hoehe, ganze cm). */
export function masseText(o: Pick<Objekt, 'breite_cm' | 'tiefe_cm' | 'hoehe_cm'>): string {
  return `${Math.round(o.breite_cm)} x ${Math.round(o.tiefe_cm)} x ${Math.round(o.hoehe_cm)} cm`
}

/** Preis wie im Zeichner ("1.299,00 €"), oder null, wenn er fehlt oder
 *  keine brauchbare Zahl ist. */
export function preisText(cent: number | null | undefined): string | null {
  if (cent === null || cent === undefined || !Number.isFinite(cent) || cent < 0) return null
  return `${euroText(Math.round(cent))} €`
}

/** Der Link zum Shop, wenn er http oder https ist (alles andere, etwa
 *  javascript:, wird nie ein Link), mit dem Namen des Shops (Host ohne
 *  "www."). Sonst null. */
export function shopLink(link: string | null | undefined): { href: string; host: string } | null {
  if (!link) return null
  let u: URL
  try {
    u = new URL(link.trim())
  } catch {
    return null
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
  const host = u.hostname.replace(/^www\./i, '')
  if (!host) return null
  return { href: u.href, host }
}

/** Kiste -> Objekt, auf oder in dem ihr Stapel steht (ueber Kisten
 *  hinweg, hoechstens 50 Kisten hoch). Kisten am Boden fehlen. */
export function traegerKarte(kisten: readonly PlanKiste[]): Map<string, string> {
  const nachId = new Map(kisten.map((k) => [k.id, k]))
  const out = new Map<string, string>()
  for (const k of kisten) {
    let jetzt = nachId.get(k.id)
    for (let i = 0; jetzt && i < 50; i++) {
      if ((jetzt.unterlage_art === 'objekt' || jetzt.unterlage_art === 'fach') && jetzt.unterlage_objekt_id) {
        out.set(k.id, jetzt.unterlage_objekt_id)
        break
      }
      if (jetzt.unterlage_art !== 'kiste' || !jetzt.unterlage_item_id) break
      jetzt = nachId.get(jetzt.unterlage_item_id)
    }
  }
  return out
}

/** Wie viele Kisten auf oder in dem Objekt stehen, auch gestapelte. */
export function kistenAuf(traeger: ReadonlyMap<string, string>, objektId: string): number {
  let n = 0
  for (const o of traeger.values()) if (o === objektId) n++
  return n
}

/** E94: das Blatt in der grossen Ansicht des Grundrisses (Moebelkarte in
 *  form 'blatt' und die Blaetter in PlanDetails.tsx): unten in der Spalte
 *  unter dem Plan, hoechstens halb so hoch, oben rund; ab md eine Leiste
 *  neben dem Plan mit Rand nur zum Plan hin. Nur Klassen, keine Farben.
 *  Nacharbeit: quer mit wenig Hoehe (Handy quer, unter md) ebenso eine
 *  Leiste daneben, hoechstens halb so breit wie die Ansicht. Unter dem
 *  Plan blieben dort fuer Name und Masse nur wenige Bildpunkte, Kopf und
 *  Fuss der Karte nahmen den Rest (PlanGross.tsx stellt die Spalte dann
 *  ebenfalls nebeneinander, mit derselben Medienabfrage). Tailwind braucht
 *  die Klassen ausgeschrieben. */
export const BLATT_KLASSEN =
  'relative z-10 max-h-[50%] shrink-0 rounded-t-3xl border-b-0 md:max-h-none md:w-96 md:rounded-none md:border-y-0 md:border-e-0 ' +
  '[@media(orientation:landscape)_and_(max-height:30rem)]:max-h-none [@media(orientation:landscape)_and_(max-height:30rem)]:w-72 ' +
  '[@media(orientation:landscape)_and_(max-height:30rem)]:max-w-[50%] [@media(orientation:landscape)_and_(max-height:30rem)]:rounded-none ' +
  '[@media(orientation:landscape)_and_(max-height:30rem)]:border-y-0 [@media(orientation:landscape)_and_(max-height:30rem)]:border-e-0'
