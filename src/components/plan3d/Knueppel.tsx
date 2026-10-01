import { useRef, useState } from 'react'

/** Steuerknueppel zum Begehen am Handy (E81). Ein Kreis, darin ein Knopf,
 *  den der Daumen in jede Richtung schiebt: oben vor, unten zurueck,
 *  seitlich zur Seite. Je weiter geschoben, desto schneller. Loslassen
 *  bleibt stehen. Ersetzt die vier Pfeile: dort musste man fuer schraeg
 *  zwei Knoepfe halten, und langes Druecken markierte am iPhone die Seite.
 *  Die andere Hand (oder derselbe Daumen danach) zieht auf dem Bild zum
 *  Umschauen; das macht der Motor. */
export function Knueppel({ name, onLage }: { name: string; onLage: (x: number, y: number) => void }) {
  const kreis = useRef<HTMLDivElement>(null)
  const [lage, setLage] = useState<{ x: number; y: number } | null>(null)
  const finger = useRef<number | null>(null)

  function setzen(e: React.PointerEvent) {
    const r = kreis.current?.getBoundingClientRect()
    if (!r) return
    const radius = r.width / 2
    let dx = (e.clientX - (r.left + radius)) / radius
    let dy = (e.clientY - (r.top + radius)) / radius
    const l = Math.hypot(dx, dy)
    if (l > 1) {
      dx /= l
      dy /= l
    }
    // Kleiner toter Bereich in der Mitte, damit ein ruhender Daumen nicht schleicht.
    const tot = 0.15
    const wirk = l < tot ? 0 : (Math.min(1, l) - tot) / (1 - tot)
    const f = l > 0 ? wirk / Math.min(1, l) : 0
    setLage({ x: dx, y: dy })
    onLage(dx * f, -dy * f)
  }

  function loslassen() {
    finger.current = null
    setLage(null)
    onLage(0, 0)
  }

  return (
    <div
      ref={kreis}
      role="application"
      aria-label={name}
      title={name}
      dir="ltr"
      className="plan3d-steuer relative h-32 w-32 rounded-full border-2 border-line bg-surface/80 shadow-lg backdrop-blur-sm"
      style={{ touchAction: 'none' }}
      onPointerDown={(e) => {
        if (finger.current !== null) return
        e.preventDefault()
        finger.current = e.pointerId
        e.currentTarget.setPointerCapture(e.pointerId)
        setzen(e)
      }}
      onPointerMove={(e) => {
        if (finger.current === e.pointerId) setzen(e)
      }}
      onPointerUp={(e) => {
        if (finger.current === e.pointerId) loslassen()
      }}
      onPointerCancel={(e) => {
        if (finger.current === e.pointerId) loslassen()
      }}
      onLostPointerCapture={(e) => {
        if (finger.current === e.pointerId) loslassen()
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Vier Kerben als Hinweis auf die Richtungen. */}
      <span className="pointer-events-none absolute left-1/2 top-2 h-2 w-2 -translate-x-1/2 rotate-45 border-l-2 border-t-2 border-muted" />
      <span className="pointer-events-none absolute bottom-2 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-muted" />
      <span className="pointer-events-none absolute left-2 top-1/2 h-2 w-2 -translate-y-1/2 -rotate-45 border-l-2 border-t-2 border-muted" />
      <span className="pointer-events-none absolute right-2 top-1/2 h-2 w-2 -translate-y-1/2 rotate-[135deg] border-l-2 border-t-2 border-muted" />
      <span
        className="pointer-events-none absolute left-1/2 top-1/2 h-14 w-14 rounded-full border-2 border-ink bg-ink/85 shadow-md"
        style={{
          transform: `translate(calc(-50% + ${(lage?.x ?? 0) * 36}px), calc(-50% + ${(lage?.y ?? 0) * 36}px))`,
          transition: lage ? 'none' : 'transform 120ms ease-out',
        }}
      />
    </div>
  )
}
