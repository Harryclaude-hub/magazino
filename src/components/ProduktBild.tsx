import { useState } from 'react'
import { Package } from 'lucide-react'

/* Foto eines Produkts (Bestand.bild_pfad, 0056). Der Pfad liegt in der App
 * (public/produkte), nie ein fremder Link. Fehlt das Foto oder laedt es
 * nicht, steht eine ruhige Kachel mit Symbol da, damit Listen gleich hoch
 * bleiben. */
export function ProduktBild({ pfad, groesse = 64 }: { pfad: string | null | undefined; groesse?: number }) {
  const [fehler, setFehler] = useState(false)
  const stil = { width: groesse, height: groesse }
  if (!pfad || fehler) {
    return (
      <span
        aria-hidden="true"
        style={stil}
        className="flex shrink-0 items-center justify-center rounded-xl bg-raised text-muted"
      >
        <Package size={Math.round(groesse * 0.4)} strokeWidth={1.75} />
      </span>
    )
  }
  const base = import.meta.env.BASE_URL || '/'
  return (
    <img
      src={`${base}${pfad}`}
      alt=""
      width={groesse}
      height={groesse}
      loading="lazy"
      decoding="async"
      style={stil}
      onError={() => setFehler(true)}
      className="shrink-0 rounded-xl bg-raised object-cover"
    />
  )
}
