import { lazy, type ComponentType } from 'react'

/* Andockstelle der Designschicht.
 *
 * Alles aus src/design kommt nur hier herein, und zwar ueber
 * import.meta.glob statt ueber einen festen Import. Fehlt der Ordner,
 * liefert glob einfach nichts: die Zeichnungen fallen weg, die Seiten
 * zeigen ihren schlichten Ersatz, und Build und App laufen weiter.
 *
 * Die Stylesheets der Designschicht bindet main.tsx genauso ein.
 */

type Zeichnung = ComponentType<{ className?: string }>
type Nichts = ComponentType

function erstes<T>(module: Record<string, T>): T | undefined {
  return Object.values(module)[0]
}

/* Klein und oft gebraucht (leere Zustaende): gleich mitladen. */
const kisten = erstes(
  import.meta.glob<Partial<Record<'Karton' | 'Plastikkiste' | 'Stapel', Zeichnung>>>(
    '../design/Kisten.tsx',
    { eager: true },
  ),
)
export const Karton: Zeichnung | null = kisten?.Karton ?? null
export const Plastikkiste: Zeichnung | null = kisten?.Plastikkiste ?? null
export const Stapel: Zeichnung | null = kisten?.Stapel ?? null

/* Ladeanzeige beim Bilderlesen. */
const lese = erstes(
  import.meta.glob<{ LeseBuehne?: Nichts }>('../design/LeseBuehne.tsx', { eager: true }),
)
export const LeseBuehne: Nichts | null = lese?.LeseBuehne ?? null

/* Nur die (abgeschaltete) Startseite braucht diese beiden. Sie laden erst,
 * wenn sie wirklich gezeigt werden, und belasten sonst niemanden. */
const buehneLader = erstes(import.meta.glob<{ Buehne: Nichts }>('../design/Buehne.tsx'))
export const Buehne: Nichts | null = buehneLader
  ? lazy(() => buehneLader().then((m) => ({ default: m.Buehne })))
  : null

const motionLader = erstes(import.meta.glob<{ MotionToggle: Nichts }>('../design/motion.tsx'))
export const MotionToggle: Nichts | null = motionLader
  ? lazy(() => motionLader().then((m) => ({ default: m.MotionToggle })))
  : null
