import { useEffect, useRef } from 'react'
import { Button } from './ui'
import { useT } from '../lib/i18n'

/* Lange Listen werden stueckweise gezeigt: erst SCHRITT Zeilen, dann kommen
 * beim Herunterrollen die naechsten dazu (IntersectionObserver). Der Knopf
 * "Mehr anzeigen" bleibt als Rueckfall (Tastatur, alte Browser). Ein
 * 1.000-facher Aufbau findet so nie auf einmal statt. */

export function MehrAnzeigen({ rest, n, onMehr }: { rest: number; n: number; onMehr: () => void }) {
  const t = useT()
  const marke = useRef<HTMLDivElement>(null)
  const mehrRef = useRef(onMehr)
  useEffect(() => {
    mehrRef.current = onMehr
  })

  // Neu beobachten, sobald das Fenster gewachsen ist: ist die Marke danach
  // noch im Bild, meldet der Beobachter sofort wieder.
  useEffect(() => {
    const el = marke.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (eintraege) => {
        if (eintraege.some((e) => e.isIntersecting)) mehrRef.current()
      },
      { rootMargin: '600px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [n])

  if (rest <= 0) return null
  return (
    <div ref={marke} className="flex justify-center py-3">
      <Button variant="ghost" size="sm" onClick={onMehr}>
        {t('lager.mehr_anzeigen', { n: rest })}
      </Button>
    </div>
  )
}
