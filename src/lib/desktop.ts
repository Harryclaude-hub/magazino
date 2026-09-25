import { useSyncExternalStore } from 'react'

/* Ab dieser Breite gilt ein Bildschirm als Computer: Seitenleiste statt
 * unterer Leiste, Zeichner und 3D. Dieselbe Grenze wie Tailwinds `lg`. */
export const DESKTOP_AB = 1024

const abfrage = `(min-width: ${DESKTOP_AB}px)`
/* Zeichnen braucht zusaetzlich einen genauen Zeiger (Maus, Stift). Ein
 * grosses Tablet ohne Maus bekommt die Draufsicht, nicht den Zeichner. */
const zeichenAbfrage = `(min-width: ${DESKTOP_AB}px) and (any-pointer: fine)`

function abonnent(q: string) {
  return (melden: () => void): (() => void) => {
    if (typeof window === 'undefined') return () => {}
    const mq = window.matchMedia(q)
    mq.addEventListener('change', melden)
    return () => mq.removeEventListener('change', melden)
  }
}

function jetzt(q: string): () => boolean {
  return () => typeof window !== 'undefined' && window.matchMedia(q).matches
}

const abonnieren = abonnent(abfrage)
const istDesktop = jetzt(abfrage)
const abonnierenZeichnen = abonnent(zeichenAbfrage)
const kannZeichnen = jetzt(zeichenAbfrage)

/** true, solange das Fenster mindestens DESKTOP_AB Pixel breit ist. */
export function useIstDesktop(): boolean {
  return useSyncExternalStore(abonnieren, istDesktop, () => false)
}

/** true, wenn hier gezeichnet werden kann: mindestens DESKTOP_AB Pixel
 *  breit UND ein genauer Zeiger. Nur dann laedt der Zeichner. */
export function useZeichnen(): boolean {
  return useSyncExternalStore(abonnierenZeichnen, kannZeichnen, () => false)
}
