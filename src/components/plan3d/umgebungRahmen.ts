/* Wo die Wohnung im Gelaende liegt (E82): der Rahmen fuer die Aussenwelt
 * (aussen3d.ts) und die Stellen, die frei bleiben muessen.
 *
 * Raeume, die nah beieinander liegen (Luecke hoechstens 50 cm), sind eine
 * Wohnung. Die groesste Gruppe ist die Wohnung; alles andere (ein Keller
 * irgendwo im Plan) bleibt frei, damit dort kein Baum waechst. Eine Tuer
 * in der Aussenwand der Wohnung ist der Eingang: davor liegt das
 * Treppenhaus, dort bleibt ein Streifen frei. Alles in Metern, Welt x und
 * z (z ist der Plan-y). Rein, ohne three. */
import type { GrundrissDaten } from '../../lib/types'
import { oeffnungPunkte } from '../plan/hilfe.ts'

type Kasten = [number, number, number, number]

export interface UmgebungRahmen {
  rahmen: Kasten
  frei: Kasten[]
}

const LUECKE_CM = 50
const TREPPENHAUS_TIEFE_CM = 400
const TREPPENHAUS_RAND_CM = 100

export function umgebungAus(daten: Pick<GrundrissDaten, 'raeume' | 'oeffnungen'>): UmgebungRahmen | null {
  const raeume = daten.raeume.filter((r) => r.punkte.length >= 3)
  if (raeume.length === 0) return null
  const kaesten: Kasten[] = raeume.map((r) => {
    const xs = r.punkte.map((p) => p[0])
    const ys = r.punkte.map((p) => p[1])
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
  })
  // Gruppen nah beieinander liegender Raeume (Union-Find).
  const eltern = raeume.map((_, i) => i)
  const wurzel = (i: number): number => (eltern[i] === i ? i : (eltern[i] = wurzel(eltern[i])))
  for (let i = 0; i < kaesten.length; i++) {
    for (let j = i + 1; j < kaesten.length; j++) {
      const a = kaesten[i]
      const b = kaesten[j]
      const dx = Math.max(0, Math.max(a[0], b[0]) - Math.min(a[2], b[2]))
      const dy = Math.max(0, Math.max(a[1], b[1]) - Math.min(a[3], b[3]))
      if (dx <= LUECKE_CM && dy <= LUECKE_CM) eltern[wurzel(i)] = wurzel(j)
    }
  }
  const flaeche = new Map<number, number>()
  kaesten.forEach((k, i) => {
    const w = wurzel(i)
    flaeche.set(w, (flaeche.get(w) ?? 0) + (k[2] - k[0]) * (k[3] - k[1]))
  })
  let haupt = -1
  let groesste = -1
  for (const [w, f] of flaeche) {
    if (f > groesste) {
      groesste = f
      haupt = w
    }
  }
  const umfasse = (liste: Kasten[]): Kasten => [
    Math.min(...liste.map((k) => k[0])),
    Math.min(...liste.map((k) => k[1])),
    Math.max(...liste.map((k) => k[2])),
    Math.max(...liste.map((k) => k[3])),
  ]
  const wohnung = umfasse(kaesten.filter((_, i) => wurzel(i) === haupt))
  const freiCm: Kasten[] = []
  // Andere Gruppen (Keller) mit einem Meter Abstand frei halten.
  const andere = new Map<number, Kasten[]>()
  kaesten.forEach((k, i) => {
    const w = wurzel(i)
    if (w === haupt) return
    andere.set(w, [...(andere.get(w) ?? []), k])
  })
  for (const liste of andere.values()) {
    const k = umfasse(liste)
    freiCm.push([k[0] - 100, k[1] - 100, k[2] + 100, k[3] + 100])
  }
  // Eingang: eine Tuer auf dem Rand der Wohnung, vor der kein Raum liegt.
  const hauptIds = new Set(raeume.filter((_, i) => wurzel(i) === haupt).map((r) => r.id))
  for (const o of daten.oeffnungen) {
    if (o.art !== 'tuer' || !hauptIds.has(o.raum_id)) continue
    const r = raeume.find((x) => x.id === o.raum_id)
    const s = r ? oeffnungPunkte(r, o) : null
    if (!s) continue
    const mx = (s[0][0] + s[1][0]) / 2
    const my = (s[0][1] + s[1][1]) / 2
    const breit = Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1]) / 2 + TREPPENHAUS_RAND_CM
    const tol = 20
    if (Math.abs(my - wohnung[1]) <= tol) freiCm.push([mx - breit, wohnung[1] - TREPPENHAUS_TIEFE_CM, mx + breit, wohnung[1]])
    else if (Math.abs(my - wohnung[3]) <= tol) freiCm.push([mx - breit, wohnung[3], mx + breit, wohnung[3] + TREPPENHAUS_TIEFE_CM])
    else if (Math.abs(mx - wohnung[0]) <= tol) freiCm.push([wohnung[0] - TREPPENHAUS_TIEFE_CM, my - breit, wohnung[0], my + breit])
    else if (Math.abs(mx - wohnung[2]) <= tol) freiCm.push([wohnung[2], my - breit, wohnung[2] + TREPPENHAUS_TIEFE_CM, my + breit])
  }
  // Waende stehen mittig auf den Raumkanten: 6 cm Rand dazu, dazu Fensterbaenke.
  const m = (v: number) => v / 100
  return {
    rahmen: [m(wohnung[0] - 12), m(wohnung[1] - 12), m(wohnung[2] + 12), m(wohnung[3] + 12)],
    frei: freiCm.map((k) => [m(k[0]), m(k[1]), m(k[2]), m(k[3])] as Kasten),
  }
}
