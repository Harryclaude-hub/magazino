import type { GroessenTabelle } from './groessen'
import type { Item, Raumplan, Regal, TuerSeite } from './types'

/* Rechnen im Raumplan, ohne Anzeige.
 *
 * Die Datenbank prueft jeden Platz selbst (Migration 0022). Was hier
 * gerechnet wird, dient der Anzeige und dem Vorab-Hinweis: wer sieht,
 * dass ein Stapel voll ist, soll nicht erst tippen und dann eine
 * Ablehnung lesen. Entscheiden tut die Datenbank.
 *
 * Hoehen in Zentimetern. Eine Kiste ist so hoch wie ihre Groesse (0021),
 * ausser sie hat eine eigene Hoehe. Wo eine Kiste in der Hoehe steht,
 * ergibt sich aus den Kisten darunter; gespeichert wird es nirgends.
 */

/** Falls die Groessen noch nicht geladen sind. Dieselbe Zahl steht als
 *  Rueckfall in item_hoehe_cm (0022). */
export const HOEHE_RUECKFALL = 40

export function zelleKey(x: number, y: number): string {
  return `${x},${y}`
}

/** Ein Stapel steht auf einer Zelle, auf dem Boden (brett null) oder auf
 *  einem Brett eines Regals. */
export function stapelKey(x: number, y: number, brett: number | null): string {
  return `${x},${y},${brett ?? 0}`
}

export function kisteHoehe(item: Item, tabelle: GroessenTabelle | null): number {
  return item.eigene_hoehe_cm ?? tabelle?.get(item.size)?.hoehe_cm ?? HOEHE_RUECKFALL
}

export interface KisteImStapel {
  item: Item
  /** Unterkante und Oberkante in cm ueber dem Zimmerboden. */
  unten: number
  oben: number
  /** Lage im Stapel, 1 ist unten. */
  lage: number
}

export interface Stapel {
  key: string
  x: number
  y: number
  regal: Regal | null
  /** Brett 1, 2, ... oder null fuer den Zimmerboden. */
  brett: number | null
  /** Worauf der Stapel steht, in cm ueber dem Boden. */
  grund: number
  /** Bis wohin er reichen darf: das naechste Brett oder die Decke. */
  grenze: number
  kisten: KisteImStapel[]
  /** Oberkante des Stapels. */
  oben: number
}

export interface Raster {
  spalten: number
  reihen: number
  gesperrt: Set<string>
  /** Welches Regal auf welcher Zelle steht. */
  regalAuf: Map<string, Regal>
  stapel: Map<string, Stapel>
}

export function rasterMasse(plan: Pick<Raumplan, 'breite_cm' | 'tiefe_cm' | 'raster_cm'>): {
  spalten: number
  reihen: number
} {
  return {
    spalten: Math.ceil(plan.breite_cm / plan.raster_cm),
    reihen: Math.ceil(plan.tiefe_cm / plan.raster_cm),
  }
}

/** Unterkante und Grenze eines Bretts. Das oberste Brett reicht bis zur
 *  Decke, jedes andere bis zum naechsten Brett. */
export function brettBereich(
  regal: Regal,
  brett: number,
  plan: Pick<Raumplan, 'hoehe_cm'>,
): { grund: number; grenze: number } {
  const b = regal.boeden_cm
  return {
    grund: b[brett - 1] ?? 0,
    grenze: brett < b.length ? b[brett] : plan.hoehe_cm,
  }
}

export function baueRaster(
  plan: Raumplan,
  regale: Regal[],
  kisten: Item[],
  tabelle: GroessenTabelle | null,
): Raster {
  const { spalten, reihen } = rasterMasse(plan)
  const gesperrt = new Set(plan.gesperrt.map(([x, y]) => zelleKey(x, y)))

  const regalAuf = new Map<string, Regal>()
  const regalNachId = new Map<string, Regal>()
  for (const r of regale) {
    regalNachId.set(r.id, r)
    for (let dx = 0; dx < r.breite; dx++)
      for (let dy = 0; dy < r.tiefe; dy++) regalAuf.set(zelleKey(r.x + dx, r.y + dy), r)
  }

  // Erst sammeln, dann je Stapel nach Lage sortieren und hochrechnen.
  const roh = new Map<string, Item[]>()
  for (const k of kisten) {
    if (k.plan_x === null || k.plan_y === null || k.plan_z === null) continue
    const key = stapelKey(k.plan_x, k.plan_y, k.regal_boden)
    const liste = roh.get(key) ?? []
    liste.push(k)
    roh.set(key, liste)
  }

  const stapel = new Map<string, Stapel>()
  for (const [key, liste] of roh) {
    liste.sort((a, b) => (a.plan_z ?? 0) - (b.plan_z ?? 0))
    const erste = liste[0]
    const regal = erste.regal_id ? (regalNachId.get(erste.regal_id) ?? null) : null
    const brett = erste.regal_boden
    const bereich =
      regal && brett ? brettBereich(regal, brett, plan) : { grund: 0, grenze: plan.hoehe_cm }
    let h = bereich.grund
    const mitHoehe = liste.map((item, i) => {
      const unten = h
      h += kisteHoehe(item, tabelle)
      return { item, unten, oben: h, lage: i + 1 }
    })
    stapel.set(key, {
      key,
      x: erste.plan_x ?? 0,
      y: erste.plan_y ?? 0,
      regal,
      brett,
      grund: bereich.grund,
      grenze: bereich.grenze,
      kisten: mitHoehe,
      oben: h,
    })
  }

  return { spalten, reihen, gesperrt, regalAuf, stapel }
}

/** Der Stapel, in dem eine Kiste steht, und ihr Eintrag darin. */
export function findeKiste(
  raster: Raster,
  id: string,
): { stapel: Stapel; kiste: KisteImStapel } | null {
  for (const s of raster.stapel.values()) {
    const kiste = s.kisten.find((k) => k.item.id === id)
    if (kiste) return { stapel: s, kiste }
  }
  return null
}

/** Ein leerer Stapel an einer Stelle, falls dort noch nichts steht. */
export function stapelAn(
  raster: Raster,
  plan: Raumplan,
  x: number,
  y: number,
  regal: Regal | null,
  brett: number | null,
): Stapel {
  const vorhanden = raster.stapel.get(stapelKey(x, y, brett))
  if (vorhanden) return vorhanden
  const bereich =
    regal && brett ? brettBereich(regal, brett, plan) : { grund: 0, grenze: plan.hoehe_cm }
  return {
    key: stapelKey(x, y, brett),
    x,
    y,
    regal,
    brett,
    grund: bereich.grund,
    grenze: bereich.grenze,
    kisten: [],
    oben: bereich.grund,
  }
}

/** Passt diese Kiste noch oben auf den Stapel? */
export function passtDrauf(stapel: Stapel, hoehe: number): boolean {
  return stapel.oben + hoehe <= stapel.grenze
}

/** Alle Stapel einer Zelle, vom Boden aufwaerts. */
export function stapelDerZelle(raster: Raster, x: number, y: number): Stapel[] {
  const out: Stapel[] = []
  for (const s of raster.stapel.values()) if (s.x === x && s.y === y) out.push(s)
  return out.sort((a, b) => a.grund - b.grund)
}

/** Liegt die Zelle an einer Wand? Das heisst: hinter der Seite ist kein
 *  Zimmer mehr, weil das Raster endet oder die Nachbarzelle gesperrt ist.
 *  So geht auch die Innenecke eines Zimmers in L-Form. Dieselbe Regel
 *  prueft room_plans_pruefen (0022). */
export function anWand(
  x: number,
  y: number,
  seite: TuerSeite,
  spalten: number,
  reihen: number,
  gesperrt: Set<string>,
): boolean {
  const nx = x + (seite === 'west' ? -1 : seite === 'ost' ? 1 : 0)
  const ny = y + (seite === 'nord' ? -1 : seite === 'sued' ? 1 : 0)
  if (nx < 0 || ny < 0 || nx >= spalten || ny >= reihen) return true
  return gesperrt.has(zelleKey(nx, ny))
}

/** An welcher Wand liegt diese Zelle? Die naechste zuerst. null heisst:
 *  mitten im Zimmer. */
export function randSeite(
  x: number,
  y: number,
  spalten: number,
  reihen: number,
  gesperrt: Set<string>,
): TuerSeite | null {
  const seiten: TuerSeite[] = ['nord', 'sued', 'west', 'ost']
  const abstand: Record<TuerSeite, number> = {
    nord: y,
    sued: reihen - 1 - y,
    west: x,
    ost: spalten - 1 - x,
  }
  const moeglich = seiten.filter((s) => anWand(x, y, s, spalten, reihen, gesperrt))
  if (moeglich.length === 0) return null
  return moeglich.sort((a, b) => abstand[a] - abstand[b])[0]
}

/* zahlLesen und brettListeLesen wohnen seit Etappe 1 in geometrie.ts. Der
 * alte Raumplan importiert sie bis Etappe 2 weiter von hier. */
export { zahlLesen, brettListeLesen } from './geometrie'
