import type { Rahmen } from './media'
import type { ItemContent } from './types'

/** Der Rahmen eines Eintrags, oder null, wenn er keinen hat. Die
 *  Datenbank liefert numeric als Text; hier wird es zur Zahl. */
export function rahmenVon(e: Pick<ItemContent, 'box_x0' | 'box_y0' | 'box_x1' | 'box_y1'>): Rahmen | null {
  if (e.box_x0 === null || e.box_y0 === null || e.box_x1 === null || e.box_y1 === null) return null
  return { x0: Number(e.box_x0), y0: Number(e.box_y0), x1: Number(e.box_x1), y1: Number(e.box_y1) }
}
