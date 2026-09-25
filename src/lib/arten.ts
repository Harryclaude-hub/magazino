import type { ItemKind } from './types'

/* Die Kistenarten in fester Reihenfolge. Die Woerter dazu stehen im
 * Woerterbuch unter art.box und so weiter. Stand frueher in Items.tsx;
 * eine Seite importiert nie aus einer anderen Seite. */
export const ARTEN: ItemKind[] = ['box', 'furniture', 'bag', 'other']

/** Welche Art eigener Groessen zu einer Kistenart passt: Moebel zu
 *  Moebeln, alles andere zu Kisten. */
export function groessenArt(kind: ItemKind): 'kiste' | 'moebel' {
  return kind === 'furniture' ? 'moebel' : 'kiste'
}
