/* Ein Moebel, das beim Begehen in 3D getragen wurde (E89), im Grundriss
 * versetzen. Reine Rechnung, geprueft in scripts/moebel-tragen-pruefen.mjs.
 *
 * Der Motor meldet je Moebel, wie weit die Mitte seines Grundrisses
 * gewandert ist (cm) und um wie viel Grad es gedreht ist (wie
 * Objekt.drehung). Die Mitte ist das Bild der lokalen Mitte (breite/2,
 * tiefe/2), also die Mitte des umschliessenden Rechtecks, auch bei der
 * L-Form. In 3D dreht das Moebel genau um diesen Punkt (Raum3D gibt ihn
 * dem Motor mit, objektMitte). Hier entsteht daraus die neue Drehung und
 * der neue Ursprung (x, y), so dass die Mitte genau dort liegt, wo sie in
 * 3D stand. Kein Einrasten auf das Raster des Zeichners: das schoebe die
 * Mitte weg von der Stelle, die man in 3D gesehen hat. x und y sind ganze
 * cm wie in der Datenbank (bei ungerader Breite oder Tiefe und einer
 * Vierteldrehung hoechstens 0,5 cm daneben).
 *
 * Liegt das Moebel danach ganz in einem anderen Raum, gehoert es ihm
 * (raum_id), sonst bleibt der Raum. Was darauf oder darin steht, faehrt
 * mit: im Zeichner objektSetzen (dok.ts), in der Datenbank objekte_nachher. */
import { objektGlobal, objektRechtecke, punktImPolygon, rechteckImPolygon, zuUmriss, type Drehung, type ObjektForm, type Punkt } from '../../lib/geometrie.ts'
import type { Objekt, Raum } from '../../lib/types'
import type { MoebelAenderung } from '../plan3d/tragen.ts'

/** Grad auf 0, 90, 180 oder 270 (naechste Vierteldrehung, auch negativ). */
export function drehungNorm(g: number): Drehung {
  if (!Number.isFinite(g)) return 0
  return ((((Math.round(g / 90) * 90) % 360) + 360) % 360) as Drehung
}

/** Mitte des Grundrisses eines Objekts in Plan-cm. */
export function objektMitte(o: Pick<ObjektForm, 'x' | 'y' | 'drehung' | 'breite_cm' | 'tiefe_cm'>): Punkt {
  return objektGlobal(o, o.breite_cm / 2, o.tiefe_cm / 2)
}

/** Das Objekt nach der Aenderung a: Drehung drehung + drehGrad, Ursprung so,
 *  dass die Mitte um (dxCm, dyCm) gewandert ist (ganze cm). Alles andere
 *  bleibt (auch raum_id, siehe raumFuer). */
export function objektVersetzt<T extends Pick<ObjektForm, 'x' | 'y' | 'drehung' | 'breite_cm' | 'tiefe_cm'>>(
  o: T,
  a: Pick<MoebelAenderung, 'dxCm' | 'dyCm' | 'drehGrad'>,
): T {
  const d = drehungNorm(o.drehung + a.drehGrad)
  const [mx, my] = objektMitte(o)
  const zx = mx + a.dxCm
  const zy = my + a.dyCm
  // objektGlobal(neu, B/2, T/2) = (x, y) + gedrehte halbe Masse.
  const [rx, ry] = objektGlobal({ x: 0, y: 0, drehung: d }, o.breite_cm / 2, o.tiefe_cm / 2)
  const x = Math.round(zx - rx)
  const y = Math.round(zy - ry)
  return { ...o, x: x === 0 ? 0 : x, y: y === 0 ? 0 : y, drehung: d }
}

/** Der Raum, in dem das Objekt jetzt liegt: ganz (alle Rechtecke im
 *  Umriss, wie objekt_fehler der Datenbank), sonst der, in dem seine Mitte
 *  liegt; null, wenn keiner passt. */
export function raumFuer(raeume: readonly Pick<Raum, 'id' | 'punkte'>[], o: ObjektForm): string | null {
  const rechtecke = objektRechtecke(o)
  for (const r of raeume) {
    if (r.punkte.length < 3) continue
    const u = zuUmriss(r.punkte)
    if (rechtecke.length && rechtecke.every((q) => rechteckImPolygon(u, q))) return r.id
  }
  const [mx, my] = objektMitte(o)
  for (const r of raeume) {
    if (r.punkte.length >= 3 && punktImPolygon(zuUmriss(r.punkte), mx, my)) return r.id
  }
  return null
}

/** Die Aenderungen auf die Objekte anwenden. Gibt nur die geaenderten
 *  Objekte zurueck (in der Reihenfolge der Aenderungen, jedes einmal, die
 *  letzte Aenderung je Objekt gilt), mit dem Raum, in dem sie jetzt
 *  liegen. Unbekannte Kennungen fallen weg. */
export function moebelAnwenden(objekte: readonly Objekt[], raeume: readonly Pick<Raum, 'id' | 'punkte'>[], aenderungen: readonly MoebelAenderung[]): Objekt[] {
  const nachId = new Map<string, Objekt>()
  for (const a of aenderungen) {
    const o = objekte.find((x) => x.id === a.id)
    if (!o) continue
    const neu = objektVersetzt(o, a)
    nachId.set(o.id, { ...neu, raum_id: raumFuer(raeume, neu) ?? o.raum_id })
  }
  return [...nachId.values()]
}
