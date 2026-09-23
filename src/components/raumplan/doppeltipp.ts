import { useEffect, useRef } from 'react'

/** Zwei Tipper auf dasselbe Ziel innerhalb dieser Zeit sind ein
 *  Doppeltipp. Auf dem Telefon gibt es kein dblclick, auf das man sich
 *  verlassen koennte. */
export const DOPPEL_MS = 400

/**
 * Einfach- und Doppeltipp auf dasselbe Ziel auseinanderhalten.
 *
 * Mit `abwarten` wird der einfache Tipp erst nach DOPPEL_MS ausgefuehrt
 * und faellt weg, wenn ein zweiter kommt. Das braucht es, wenn der
 * einfache Tipp etwas schreibt, etwa eine Kiste setzt: sonst setzte ein
 * Doppeltipp erst eine Kiste und oeffnete dann eine andere. Ohne
 * `abwarten` wirkt der einfache Tipp sofort; das ist richtig, wenn er
 * nur markiert.
 */
export function useDoppeltipp<Ziel>(
  schluessel: (z: Ziel) => string,
  einfach: (z: Ziel) => void,
  doppelt: (z: Ziel) => void,
  abwarten: boolean,
): (z: Ziel) => void {
  const letzter = useRef<{ key: string; zeit: number } | null>(null)
  const wartet = useRef<{ uhr: ReturnType<typeof setTimeout>; ziel: Ziel } | null>(null)
  /* Ein aufgeschobener Tipp soll mit dem Stand ausgefuehrt werden, der
   * gilt, wenn er faellig wird, nicht mit dem von vor 400 ms. */
  const einfachJetzt = useRef(einfach)
  useEffect(() => {
    einfachJetzt.current = einfach
  })

  useEffect(
    () => () => {
      if (wartet.current) clearTimeout(wartet.current.uhr)
    },
    [],
  )

  return (z: Ziel) => {
    const key = schluessel(z)
    const jetzt = Date.now()
    const zweiter = letzter.current?.key === key && jetzt - letzter.current.zeit < DOPPEL_MS
    if (zweiter) {
      letzter.current = null
      if (wartet.current) {
        clearTimeout(wartet.current.uhr)
        wartet.current = null
      }
      doppelt(z)
      return
    }
    letzter.current = { key, zeit: jetzt }
    /* Wartet noch ein Tipp auf ein anderes Ziel, gilt er jetzt: wer
     * schnell hintereinander zwei Plaetze antippt, meint beide. */
    if (wartet.current) {
      clearTimeout(wartet.current.uhr)
      const frueher = wartet.current.ziel
      wartet.current = null
      einfachJetzt.current(frueher)
    }
    if (abwarten) {
      const uhr = setTimeout(() => {
        wartet.current = null
        einfachJetzt.current(z)
      }, DOPPEL_MS)
      wartet.current = { uhr, ziel: z }
    } else {
      einfach(z)
    }
  }
}
