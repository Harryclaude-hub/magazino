import { useEffect, useState } from 'react'
import { ladeKistenGroessen } from './api'
import type { Lang, Vars } from './i18n'
import type { ItemKind, KistenGroesse } from './types'

/* Kistengroessen in Litern.
 *
 * Die Zahlen stehen nur in der Datenbank (Migration 0021). Hier wird die
 * Tabelle einmal geholt und fuer alle Seiten behalten; es sind zehn feste
 * Zeilen, die sich ohne neue Migration nie aendern.
 *
 * Solange die Liter nicht da sind, oder wenn sie nicht kommen, steht das
 * Wort zur Groesse da (winzig bis sperrig). Das ist nicht falsch, nur
 * ungenauer. Die Groesse selbst haengt nie an dieser Tabelle: sie steht
 * in der Kiste und in ihrer Nummer.
 */

export type GroessenTabelle = Map<number, KistenGroesse>

let tabelle: GroessenTabelle | null = null
let unterwegs: Promise<GroessenTabelle> | null = null

function holen(): Promise<GroessenTabelle> {
  if (tabelle) return Promise.resolve(tabelle)
  if (!unterwegs) {
    unterwegs = ladeKistenGroessen()
      .then((liste) => {
        tabelle = new Map(liste.map((g) => [g.stufe, g]))
        return tabelle
      })
      .catch((err: unknown) => {
        // Beim naechsten Mal neu versuchen, nicht den Fehler behalten.
        unterwegs = null
        throw err
      })
  }
  return unterwegs
}

export interface GroessenStand {
  /** Die Tabelle, oder null, solange sie nicht da ist. */
  tabelle: GroessenTabelle | null
  /** Warum sie nicht kam. null, solange sie laedt oder da ist. */
  fehler: string | null
  nochmal: () => void
}

/** Die Tabelle mit ihren drei Zustaenden: laedt, da, Fehler. Fuer Seiten,
 *  die ohne Liter nicht sinnvoll sind oder es sagen muessen. */
export function useKistenGroessenStand(): GroessenStand {
  const [wert, setWert] = useState<GroessenTabelle | null>(tabelle)
  const [fehler, setFehler] = useState<string | null>(null)
  const [versuch, setVersuch] = useState(0)
  useEffect(() => {
    if (tabelle) {
      setWert(tabelle)
      return
    }
    let alive = true
    setFehler(null)
    holen()
      .then((t) => {
        if (alive) setWert(t)
      })
      .catch((err: unknown) => {
        const text = err instanceof Error ? err.message : String(err)
        console.warn('[groessen] Liter nicht geladen:', text)
        if (alive) setFehler(text)
      })
    return () => {
      alive = false
    }
  }, [versuch])
  return { tabelle: wert, fehler, nochmal: () => setVersuch((v) => v + 1) }
}

/** Nur die Tabelle, oder null. Fuer Stellen, an denen das Wort zur
 *  Groesse ein brauchbarer Ersatz ist. */
export function useKistenGroessen(): GroessenTabelle | null {
  return useKistenGroessenStand().tabelle
}

/** Moebel haben keine Liter, alles andere schon. */
export function hatLiter(kind: ItemKind): boolean {
  return kind !== 'furniture'
}

/** Liter in der Schreibweise der Sprache: 22,4 im deutschen Satz, 22.4 im
 *  arabischen, beide mit lateinischen Ziffern wie die Seriennummern. */
export function literText(liter: number, lang: Lang): string {
  return new Intl.NumberFormat(lang === 'ar' ? 'ar-u-nu-latn' : 'de-DE', {
    maximumFractionDigits: 1,
  }).format(liter)
}

/** Welche Stufe ein Karton mit so vielen Litern hat. Die Grenzen kommen
 *  aus der Datenbank, hier wird nur nachgeschlagen. */
export function stufeFuerLiter(liter: number, t: GroessenTabelle): number | null {
  if (!Number.isFinite(liter) || liter <= 0) return null
  const stufen = [...t.values()].sort((a, b) => a.stufe - b.stufe)
  for (const g of stufen) {
    if (g.bis_liter === null || liter < g.bis_liter) return g.stufe
  }
  return null
}

type Uebersetzer = (key: string, vars?: Vars) => string

/** Der Satz zur Groesse, ueberall derselbe: bei Kisten mit Litern, bei
 *  Moebeln mit dem Wort. */
export function groesseSatz(
  t: Uebersetzer,
  lang: Lang,
  n: number,
  kind: ItemKind,
  tab: GroessenTabelle | null,
): string {
  const g = hatLiter(kind) ? tab?.get(n) : undefined
  return g
    ? t('groesse.von_zehn_liter', { n, liter: literText(g.liter, lang) })
    : t('groesse.von_zehn', { n, wort: t(`groesse.${n}`) })
}
