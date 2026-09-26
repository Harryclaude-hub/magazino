import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Crosshair, Eye, Hand, Layers, Map as KarteIcon, Rotate3d, X } from 'lucide-react'
import { useSprache } from '../../lib/i18n'
import type { GrundrissDaten } from '../../lib/types'
import { cx } from '../../lib/util'
import { Button } from '../ui'
import { motorStarten, type Blick, type Motor } from './motor'
import { baueSzene, FARB_TOKENS, hervorMitte, type Farben3D } from './szene'

/* Die 3D-Ansicht am Computer (START 5.5, BAUPLAN 5.4).
 *
 * Eigener Code-Teil samt three: geladen nur ueber oeffnen.tsx mit
 * lazy(), erst wenn jemand "3D" oeffnet. Am Handy dreht ein Finger, zwei
 * Finger verschieben und zoomen (OrbitControls).
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
  /** Moebel, Regal oder Schrank wurde um dx, dy cm gezogen (nur im
   *  Zeichner). Ohne diese Angabe laesst sich nichts ziehen. */
  onObjektZiehen?: (id: string, dxCm: number, dyCm: number) => void
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

/** Kiste -> Objekt, auf oder in dem ihr Stapel steht (ueber Kisten hinweg). */
function traegerKarte(daten: GrundrissDaten): Map<string, string> {
  const nachId = new Map(daten.kisten.map((k) => [k.id, k]))
  const out = new Map<string, string>()
  for (const k of daten.kisten) {
    let jetzt = nachId.get(k.id)
    for (let i = 0; jetzt && i < 50; i++) {
      if ((jetzt.unterlage_art === 'objekt' || jetzt.unterlage_art === 'fach') && jetzt.unterlage_objekt_id) {
        out.set(k.id, jetzt.unterlage_objekt_id)
        break
      }
      if (jetzt.unterlage_art !== 'kiste' || !jetzt.unterlage_item_id) break
      jetzt = nachId.get(jetzt.unterlage_item_id)
    }
  }
  return out
}

export default function Raum3D({ daten, raumId = null, hervor = null, onSchliessen, onObjektZiehen, className }: Raum3DProps) {
  const { t } = useSprache()
  const host = useRef<HTMLDivElement>(null)
  const motor = useRef<Motor | null>(null)
  const [geht, setGeht] = useState<'pruefen' | 'ja' | 'nein'>('pruefen')
  const [farben, setFarben] = useState<Farben3D>(farbenLesen)
  const [halb, setHalb] = useState(true)
  // Drehen (Standard) oder Hand (verschieben, Moebel greifen) fuer die linke
  // Maustaste; das Geraet merkt es sich. Neuer Schluessel, damit alle mit
  // Drehen anfangen.
  const [hand, setHand] = useState(() => {
    try {
      return localStorage.getItem('kistly.3d.hand') === '1'
    } catch {
      return false
    }
  })
  const handSetzen = (an: boolean) => {
    setHand(an)
    try {
      if (an) localStorage.setItem('kistly.3d.hand', '1')
      else localStorage.removeItem('kistly.3d.hand')
    } catch {
      /* ohne Speicher gilt es bis zum Neuladen */
    }
  }
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

  useEffect(() => {
    motor.current?.hand(hand)
  }, [hand, geht])

  // Der Rueckruf liegt in einer Ref, damit ein neuer Wert den Motor nicht neu anmeldet.
  const ziehRueck = useRef(onObjektZiehen)
  useLayoutEffect(() => {
    ziehRueck.current = onObjektZiehen
  })
  const kannZiehen = Boolean(onObjektZiehen)
  /** Bedienung mit Fingern (Handy, Tablet): anderer Hinweis. */
  const beruehren = useMemo(() => window.matchMedia('(pointer: coarse)').matches, [])
  const traeger = useMemo(() => traegerKarte(daten), [daten])
  useEffect(() => {
    motor.current?.ziehen(kannZiehen ? (id, dx, dy) => ziehRueck.current?.(id, dx, dy) : null, traeger)
  }, [kannZiehen, traeger, geht])

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
        <div className="flex rounded-xl border-2 border-line p-0.5" role="group" aria-label={t('plan3d.modus')}>
          <button
            type="button"
            aria-pressed={hand}
            onClick={() => handSetzen(true)}
            title={t('plan3d.hand_hilfe')}
            className={cx('flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-bold', hand ? 'bg-ink text-paper' : 'text-ink hover:bg-raised')}
          >
            <Hand size={15} /> {t('plan3d.hand')}
          </button>
          <button
            type="button"
            aria-pressed={!hand}
            onClick={() => handSetzen(false)}
            title={t('plan3d.drehen_hilfe')}
            className={cx('flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-bold', !hand ? 'bg-ink text-paper' : 'text-ink hover:bg-raised')}
          >
            <Rotate3d size={15} /> {t('plan3d.drehen')}
          </button>
        </div>
        <Button
          size="sm"
          variant={halb ? 'aktiv' : 'outline'}
          aria-pressed={halb}
          onClick={() => setHalb((v) => !v)}
          disabled={geht !== 'ja'}
        >
          <Layers size={16} /> {t('plan3d.waende_halb')}
        </Button>
        <p className="t-sub min-w-0 flex-1 truncate px-1">
          {geht === 'ja' ? t(`${beruehren ? 'plan3d.bedienung_handy' : kannZiehen ? 'plan3d.bedienung_ziehen' : 'plan3d.bedienung'}${hand ? '_hand' : ''}`) : null}
        </p>
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
