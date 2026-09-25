import { useEffect, useMemo, useRef, useState } from 'react'
import { Crosshair, Eye, Layers, Map as KarteIcon, X } from 'lucide-react'
import { useSprache } from '../../lib/i18n'
import type { GrundrissDaten } from '../../lib/types'
import { cx } from '../../lib/util'
import { Button } from '../ui'
import { motorStarten, type Blick, type Motor } from './motor'
import { baueSzene, FARB_TOKENS, hervorMitte, type Farben3D } from './szene'

/* Die 3D-Ansicht am Computer (START 5.5, BAUPLAN 5.4).
 *
 * Eigener Code-Teil samt three: geladen nur ueber oeffnen.tsx mit
 * lazy(), nur wenn useZeichnen() gilt und jemand "3D" oeffnet. Das Handy
 * laedt nichts davon.
 *
 * Massstab 1 = 1 m. Boden, Waende in Raumhoehe (Wandfarbe je Kante,
 * sonst --plan-wand-3d, Kopf in --plan-wand), Tueren orange, Fenster
 * blau, Moebel, Regale mit Brettern, Kisten in echter Groesse; die
 * gesuchte Kiste rot, die anderen gedaempft (szene.ts). Kamera drehen,
 * zoomen, verschieben; Waende, die zwischen Kamera und Raum stehen, werden
 * halbdurchsichtig.
 *
 * Die Farben kommen aus den Tokens (getComputedStyle) und werden bei
 * Hell/Dunkel neu gelesen. Ohne WebGL steht ein Hinweis da, 2D bleibt.
 */

export interface Raum3DProps {
  daten: GrundrissDaten
  /** Nur diesen Raum zeigen (Kistenseite, Suche). */
  raumId?: string | null
  /** Item-Id der gesuchten oder gewaehlten Kiste (oder eines Moebels). */
  hervor?: string | null
  /** Knopf "3D schliessen" in der Leiste. */
  onSchliessen?: () => void
  className?: string
}

function farbenLesen(): Farben3D {
  const stil = getComputedStyle(document.documentElement)
  const out = {} as Farben3D
  for (const [k, token] of Object.entries(FARB_TOKENS) as [keyof Farben3D, string][]) {
    out[k] = stil.getPropertyValue(token).trim() || '#888888'
  }
  return out
}

export default function Raum3D({ daten, raumId = null, hervor = null, onSchliessen, className }: Raum3DProps) {
  const { t } = useSprache()
  const host = useRef<HTMLDivElement>(null)
  const motor = useRef<Motor | null>(null)
  const [geht, setGeht] = useState<'pruefen' | 'ja' | 'nein'>('pruefen')
  const [farben, setFarben] = useState<Farben3D>(farbenLesen)
  const [halb, setHalb] = useState(true)
  const ausgerichtet = useRef<string | null>(null)

  // Hell/Dunkel: die Klasse an <html> wechselt, die Tokens auch.
  useEffect(() => {
    const beob = new MutationObserver(() => setFarben(farbenLesen()))
    beob.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => beob.disconnect()
  }, [])

  useEffect(() => {
    const el = host.current
    if (!el) return
    const m = motorStarten(el)
    motor.current = m
    setGeht(m ? 'ja' : 'nein')
    return () => {
      m?.dispose()
      motor.current = null
      ausgerichtet.current = null
    }
  }, [])

  const koerper = useMemo(() => baueSzene(daten, farben, { raumId, hervor }), [daten, farben, raumId, hervor])
  const hatKiste = useMemo(() => hervorMitte(koerper) !== null, [koerper])
  const leer = koerper.length === 0

  useEffect(() => {
    const m = motor.current
    if (!m || geht !== 'ja') return
    // Die Kamera nur beim ersten Bild und bei einem anderen Raum neu setzen,
    // sonst bleibt sie, wo man sie hingedreht hat (Zeichner aendert live).
    const schluessel = `${daten.grundriss.id}|${raumId ?? ''}`
    const neu = ausgerichtet.current !== schluessel && koerper.length > 0
    m.setzen(koerper, farben.grund, neu)
    if (neu) ausgerichtet.current = schluessel
  }, [koerper, farben.grund, geht, daten.grundriss.id, raumId])

  useEffect(() => {
    motor.current?.waendeHalb(halb)
  }, [halb, geht])

  const blick = (b: Blick) => motor.current?.blick(b)

  return (
    <div className={cx('relative flex h-full min-h-0 flex-col overflow-hidden bg-paper', className)}>
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface px-3 py-2">
        <Button size="sm" variant="outline" onClick={() => blick('oben')} disabled={geht !== 'ja' || leer}>
          <KarteIcon size={16} /> {t('plan3d.ansicht_oben')}
        </Button>
        <Button size="sm" variant="outline" onClick={() => blick('schraeg')} disabled={geht !== 'ja' || leer}>
          <Eye size={16} /> {t('plan3d.ansicht_schraeg')}
        </Button>
        {hatKiste ? (
          <Button size="sm" variant="outline" onClick={() => blick('kiste')} disabled={geht !== 'ja'}>
            <Crosshair size={16} style={{ color: 'var(--plan-hervor)' }} /> {t('plan3d.zur_kiste')}
          </Button>
        ) : null}
        <Button
          size="sm"
          variant={halb ? 'aktiv' : 'outline'}
          aria-pressed={halb}
          onClick={() => setHalb((v) => !v)}
          disabled={geht !== 'ja'}
        >
          <Layers size={16} /> {t('plan3d.waende_halb')}
        </Button>
        <p className="t-sub min-w-0 flex-1 truncate px-1">{geht === 'ja' ? t('plan3d.bedienung') : null}</p>
        {onSchliessen ? (
          <Button size="sm" variant="outline" onClick={onSchliessen}>
            <X size={16} /> {t('plan3d.schliessen')}
          </Button>
        ) : null}
      </div>
      {/* Plaene werden nie gespiegelt, auch nicht im Arabischen. */}
      <div dir="ltr" className="relative min-h-0 flex-1" style={{ background: 'var(--plan-grund)' }}>
        <div
          ref={host}
          className={cx('absolute inset-0', geht === 'nein' && 'hidden')}
          role="img"
          aria-label={t('plan3d.leinwand')}
        />
        {geht === 'nein' ? (
          <div dir="auto" className="absolute inset-0 flex items-center justify-center p-6">
            <p className="max-w-md rounded-2xl border border-line bg-surface p-4 text-center font-bold text-ink" role="status">
              {t('plan3d.geht_nicht')}
            </p>
          </div>
        ) : geht === 'ja' && leer ? (
          <div dir="auto" className="pointer-events-none absolute inset-x-0 top-6 flex justify-center">
            <p className="rounded-xl border border-line bg-surface px-3 py-2 text-muted">{t('plan3d.leer')}</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
