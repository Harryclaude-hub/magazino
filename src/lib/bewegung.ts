import { useCallback, useEffect, useState } from 'react'
import { Gauge, Sparkles, Waves } from 'lucide-react'

/* Bewegungsstufe.
 *
 * Die Stufe ist eine Einstellung wie Sprache und Theme und liegt darum hier
 * und nicht in der Designschicht. Sie setzt nur ein Attribut auf dem
 * html-Element (data-motion). Was bei welcher Stufe passiert, entscheiden
 * allein die Stylesheets in src/design. Fehlt der Ordner, bleibt der
 * Schalter in den Einstellungen stehen und bewirkt nichts Sichtbares.
 */

export type Stufe = 'ruhig' | 'normal' | 'voll'

const KEY = 'kistly.motion'
export const STUFEN: Stufe[] = ['ruhig', 'normal', 'voll']

export const STUFE_SYMBOL = { ruhig: Gauge, normal: Waves, voll: Sparkles }

function lesen(): Stufe {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'ruhig' || v === 'normal' || v === 'voll' ? v : 'normal'
  } catch {
    return 'normal'
  }
}

/** Setzt das Attribut. main.tsx setzt es beim Start schon einmal selbst,
 *  damit nichts kurz in der falschen Stufe aufblitzt. */
function stufeAnwenden(s: Stufe): void {
  document.documentElement.dataset.motion = s
}

export function useMotion(): { stufe: Stufe; setStufe: (s: Stufe) => void } {
  const [stufe, setState] = useState<Stufe>(() => lesen())

  useEffect(() => {
    stufeAnwenden(stufe)
  }, [stufe])

  const setStufe = useCallback((s: Stufe) => {
    setState(s)
    try {
      localStorage.setItem(KEY, s)
    } catch {
      /* privater Modus, dann gilt die Stufe eben nur fuer diesen Besuch */
    }
  }, [])

  return { stufe, setStufe }
}
