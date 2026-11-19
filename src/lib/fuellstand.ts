/* Fuellstand eines Eintrags (0033): 0 = leer, 100 = voll, null = nicht
 * angegeben. Hier steht nur die Rechnung; Balken und Eingabe stehen in
 * components/Fuellstand.tsx.
 *
 * Die Farbe laeuft stufenlos von gruen (leer) ueber gelb-orange (halb) zu
 * rot (voll). Die drei Ankerfarben stehen als Variablen in index.css
 * (--fuell-leer, --fuell-mitte, --fuell-voll), gemischt wird mit
 * color-mix. Rot ist hier ausdruecklich Karams Wunsch; im Plan zeigt
 * sich der Fuellstand deshalb nur als kleiner Balken, damit "voll" nie wie
 * "hier ist es" aussieht.
 */

/** Die grossen Tipp-Knoepfe. */
export const FUELL_STUFEN = [0, 25, 50, 75, 100] as const

/** Schritt des feinen Reglers. */
export const FUELL_SCHRITT = 5

/** CSS-Farbe fuer p Prozent, nur aus den Variablen gemischt. */
export function fuellFarbe(p: number): string {
  const w = Math.min(100, Math.max(0, p))
  if (w <= 50) return `color-mix(in oklab, var(--fuell-mitte) ${w * 2}%, var(--fuell-leer))`
  return `color-mix(in oklab, var(--fuell-voll) ${(w - 50) * 2}%, var(--fuell-mitte))`
}
