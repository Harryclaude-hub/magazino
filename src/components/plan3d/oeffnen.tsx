import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Box } from 'lucide-react'
import { useZeichnen } from '../../lib/desktop'
import { useSprache } from '../../lib/i18n'
import { plan3dWoerter } from '../../lib/i18n/bausteine/plan3d'
import { woerterNachladen } from '../../lib/i18n/woerter'
import type { GrundrissDaten } from '../../lib/types'
import { Button, ErrorBox, Spinner } from '../ui'
import type { Raum3DProps } from './Raum3D'

// Die Saetze der 3D-Ansicht kommen mit diesem Teil (siehe plan3d.ts).
woerterNachladen(plan3dWoerter)

/* Die Wege in die 3D-Ansicht, ohne three: diese Datei ist klein und darf in
 * Lageplan und Zeichner stecken. three selbst (Raum3D.tsx, motor.ts) laedt
 * erst per import(), wenn jemand am Computer "3D" oeffnet. Am Handy
 * (useZeichnen() falsch) gibt es keinen Knopf, also auch keine Anfrage.
 *
 *  Knopf3D         Knopf "In 3D ansehen" plus grosses Fenster (Kistenseite, Suche)
 *  Ueberlagerung3D 3D ueber der Zeichenflaeche (Umschalter im Zeichner)
 *  Ansicht3D       Laden, Fehler, dann Raum3D
 */

type Props = Omit<Raum3DProps, 'className'>

let Teil = lazy(() => import('./Raum3D'))

class Fang extends Component<{ children: ReactNode; fallback: (fehler: Error) => ReactNode }, { fehler: Error | null }> {
  state: { fehler: Error | null } = { fehler: null }
  static getDerivedStateFromError(fehler: Error) {
    return { fehler }
  }
  render() {
    return this.state.fehler ? this.props.fallback(this.state.fehler) : this.props.children
  }
}

/** Laedt Raum3D als eigenen Code-Teil. Laden, Fehler (mit Nochmal) und
 *  die Ansicht sind drei Zustaende. */
export function Ansicht3D(props: Props) {
  const { t } = useSprache()
  const [versuch, setVersuch] = useState(0)
  return (
    <Fang
      key={versuch}
      fallback={(e) => (
        <div className="p-4">
          <ErrorBox error={t('plan3d.fehler', { fehler: e.message })} onRetry={() => {
              // Ein neuer Versuch braucht ein neues lazy(), das alte merkt sich den Fehler.
              Teil = lazy(() => import('./Raum3D'))
              setVersuch((v) => v + 1)
            }} />
        </div>
      )}
    >
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center gap-2 p-4 text-muted">
            <Spinner /> {t('plan3d.laedt')}
          </div>
        }
      >
        <Teil {...props} className="h-full" />
      </Suspense>
    </Fang>
  )
}

/** Knopf "In 3D ansehen" und das Fenster dazu. Nur am Computer (ab 1024 px
 *  und mit Maus), sonst nichts. */
export function Knopf3D({
  daten,
  raumId,
  hervor,
  className,
}: {
  daten: GrundrissDaten
  raumId?: string | null
  hervor?: string | null
  className?: string
}) {
  const { t } = useSprache()
  const zeichnen = useZeichnen()
  const [offen, setOffen] = useState(false)
  if (!zeichnen) return null
  return (
    <>
      <Button variant="outline" className={className ?? 'w-full justify-center'} onClick={() => setOffen(true)}>
        <Box size={18} /> {t('plan3d.oeffnen')}
      </Button>
      {offen ? (
        <Fenster3D titel={t('plan3d.titel')} onClose={() => setOffen(false)}>
          <Ansicht3D daten={daten} raumId={raumId} hervor={hervor} onSchliessen={() => setOffen(false)} />
        </Fenster3D>
      ) : null}
    </>
  )
}

/** Grosses Fenster ueber der Seite. Escape schliesst, jedes Oeffnen
 *  beginnt frisch (Raum3D wird neu aufgebaut). */
function Fenster3D({ titel, onClose, children }: { titel: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const taste = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', taste)
    const vorher = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', taste)
      document.body.style.overflow = vorher
    }
  }, [onClose])
  // Portal an body: sonst liegt das Fenster in einer sticky-Spalte unter der Kopfzeile.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-8">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titel}
        className="relative flex h-full max-h-[900px] w-full max-w-[1400px] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl"
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}

/** 3D ueber der Zeichenflaeche. Zeiger und Rad bleiben hier, damit der
 *  Zeichner darunter nichts davon abbekommt. Als (nicht modaler) Dialog
 *  ausgezeichnet: dann ruhen die Tasten des Zeichners (Entf, Strg+Z, Werkzeuge),
 *  solange 3D offen ist; Escape schaltet zurueck auf 2D. */
export function Ueberlagerung3D(props: Props) {
  const { t } = useSprache()
  const { onSchliessen } = props
  useEffect(() => {
    if (!onSchliessen) return
    const taste = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSchliessen()
    }
    document.addEventListener('keydown', taste)
    return () => document.removeEventListener('keydown', taste)
  }, [onSchliessen])
  const stopp = (e: { stopPropagation: () => void }) => e.stopPropagation()
  return (
    <div
      role="dialog"
      aria-label={t('plan3d.titel')}
      className="absolute inset-0 z-20 bg-paper"
      onPointerDown={stopp}
      onPointerMove={stopp}
      onPointerUp={stopp}
      onDoubleClick={stopp}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      <Ansicht3D {...props} />
    </div>
  )
}
