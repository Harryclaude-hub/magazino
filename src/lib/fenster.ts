import { useState } from 'react'

/* Lange Listen werden stueckweise gezeigt (siehe MehrAnzeigen): erst SCHRITT
 * Zeilen, dann kommen die naechsten dazu. */

export const SCHRITT = 50

/** Wie viele Zeilen gerade sichtbar sind. Aendert sich die Liste (neuer
 *  Filter, neue Suche, neue Sortierung), beginnt das Fenster wieder bei
 *  SCHRITT. `fuer` ist die Liste selbst: gleiche Liste, gleiches Fenster. */
export function useFenster(fuer: unknown): { n: number; mehr: () => void } {
  const [fenster, setFenster] = useState<{ n: number; fuer: unknown }>({ n: SCHRITT, fuer })
  const n = fenster.fuer === fuer ? fenster.n : SCHRITT
  return { n, mehr: () => setFenster({ n: n + SCHRITT, fuer }) }
}
