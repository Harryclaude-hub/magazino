import { useSyncExternalStore } from 'react'

/* Ab dieser Breite gilt ein Bildschirm als Computer: Seitenleiste statt
 * unterer Leiste, Zeichner und 3D. Dieselbe Grenze wie Tailwinds `lg`. */
export const DESKTOP_AB = 1024

const abfrage = `(min-width: ${DESKTOP_AB}px)`

function abonnieren(melden: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const mq = window.matchMedia(abfrage)
  mq.addEventListener('change', melden)
  return () => mq.removeEventListener('change', melden)
}

function jetzt(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(abfrage).matches
}

/** true, solange das Fenster mindestens DESKTOP_AB Pixel breit ist. */
export function useIstDesktop(): boolean {
  return useSyncExternalStore(abonnieren, jetzt, () => false)
}
