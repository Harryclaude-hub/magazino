import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { Spinner } from './ui'

/* Zeigt seinen Inhalt erst, wenn er auf etwa 600 px an den sichtbaren
 * Bereich herankommt. Fuer schwere Teile ganz unten auf einer Seite (der
 * Lageplan der Kistenseite): so kommen Fotos und Inhalt zuerst, und wer
 * nie hinunterrollt, laedt den Plan nie. Ohne IntersectionObserver (sehr
 * alte Browser) gleich zeigen.
 */
export function NahLaden({
  children,
  platzhalter,
  abstand = 600,
}: {
  children: ReactNode
  /** Solange noch nichts geladen ist (auch waehrend der Code-Teil kommt). */
  platzhalter: ReactNode
  abstand?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [nah, setNah] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    if (nah) return
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (eintraege) => {
        if (eintraege.some((e) => e.isIntersecting)) {
          setNah(true)
          io.disconnect()
        }
      },
      { rootMargin: `${abstand}px 0px` },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [nah, abstand])

  return <div ref={ref}>{nah ? <Suspense fallback={platzhalter}>{children}</Suspense> : platzhalter}</div>
}

/** Der schlichte Platzhalter: Kreisel und ein Satz. */
export function NahPlatzhalter({ text }: { text: string }) {
  return (
    <div className="flex min-h-24 items-center gap-2 rounded-2xl border border-line p-4 text-muted">
      <Spinner /> {text}
    </div>
  )
}
