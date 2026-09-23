import { useEffect, useState } from 'react'
import { Package } from 'lucide-react'
import { signedUrl, type Rahmen } from '../lib/media'
import { cx } from '../lib/util'

/* Das kleine Bild eines Dings.
 *
 * Liegt ein Ausschnitt im Speicher (item_contents.ausschnitt_pfad), wird
 * er gezeigt. Sonst, solange es nur Foto und Rahmen gibt, wird der Rahmen
 * live aus dem Foto geschnitten: als SVG mit dem Bild in echter Groesse
 * und einem Sichtfenster auf den Rahmen. So bleibt das Seitenverhaeltnis
 * richtig; ein Hintergrundbild mit getrennter Breite und Hoehe verzoege
 * das Ding.
 *
 * Ohne beides steht ein Platzhalter da, nie ein leerer Fleck.
 */
export function Ausschnitt({
  pfad,
  fotoUrl,
  rahmen,
  groesse = 48,
  alt,
  className,
}: {
  pfad: string | null
  fotoUrl: string | null
  rahmen: Rahmen | null
  groesse?: number
  alt: string
  className?: string
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [natur, setNatur] = useState<{ b: number; h: number } | null>(null)

  useEffect(() => {
    let alive = true
    setUrl(null)
    if (!pfad) return
    void signedUrl('item-photos', pfad).then((u) => {
      if (alive) setUrl(u)
    })
    return () => {
      alive = false
    }
  }, [pfad])

  /* Nur die Groesse des Fotos wird gebraucht, nicht der Rahmen selbst.
   * Darum haengt das Laden an einem Ja oder Nein, nicht am Rahmen-Objekt:
   * ein neues Objekt bei jedem Zeichnen luede das Bild sonst endlos neu. */
  const brauchtFoto = !pfad && Boolean(fotoUrl) && rahmen !== null
  useEffect(() => {
    setNatur(null)
    if (!brauchtFoto || !fotoUrl) return
    let alive = true
    const img = new Image()
    img.onload = () => {
      if (alive) setNatur({ b: img.naturalWidth, h: img.naturalHeight })
    }
    img.src = fotoUrl
    return () => {
      alive = false
    }
  }, [brauchtFoto, fotoUrl])

  const rahmenKlasse = cx(
    'shrink-0 overflow-hidden rounded-lg border border-line bg-raised',
    className,
  )
  const stil = { width: groesse, height: groesse }

  if (pfad && url) {
    return <img src={url} alt={alt} className={cx(rahmenKlasse, 'object-cover')} style={stil} />
  }

  if (!pfad && fotoUrl && rahmen && natur) {
    const x = rahmen.x0 * natur.b
    const y = rahmen.y0 * natur.h
    const w = Math.max(1, (rahmen.x1 - rahmen.x0) * natur.b)
    const h = Math.max(1, (rahmen.y1 - rahmen.y0) * natur.h)
    return (
      <svg
        role="img"
        aria-label={alt}
        viewBox={`${x} ${y} ${w} ${h}`}
        preserveAspectRatio="xMidYMid slice"
        className={rahmenKlasse}
        style={stil}
      >
        <image href={fotoUrl} width={natur.b} height={natur.h} />
      </svg>
    )
  }

  return (
    <span className={cx(rahmenKlasse, 'grid place-items-center text-muted')} style={stil} aria-label={alt}>
      <Package size={Math.round(groesse * 0.45)} />
    </span>
  )
}
