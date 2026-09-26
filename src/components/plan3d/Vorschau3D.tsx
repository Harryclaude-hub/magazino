import { useEffect, useMemo, useRef, useState } from 'react'
import { useSprache } from '../../lib/i18n'
import type { GrundrissDaten, Objekt } from '../../lib/types'
import { farbenLesen } from './farben3d'
import { motorStarten, type Motor } from './motor'
import { baueSzene, type Koerper } from './szene'

/* Kleines 3D-Modell eines Moebels im Katalog (E66): so sieht es aus, bevor
 * man es hinstellt. Eigener Code-Teil samt three, geladen erst, wenn im
 * Katalog etwas gewaehlt ist. Ziehen dreht, Rad zoomt. */

export interface Vorschau3DProps {
  objekt: Objekt
}

export default function Vorschau3D({ objekt }: Vorschau3DProps) {
  const { t } = useSprache()
  const host = useRef<HTMLDivElement>(null)
  const motor = useRef<Motor | null>(null)
  const [geht, setGeht] = useState<'pruefen' | 'ja' | 'nein'>('pruefen')

  useEffect(() => {
    const el = host.current
    if (!el) return
    const m = motorStarten(el)
    motor.current = m
    setGeht(m ? 'ja' : 'nein')
    return () => {
      m?.dispose()
      motor.current = null
    }
  }, [])

  const koerper = useMemo<Koerper[]>(() => {
    const f = farbenLesen()
    const daten = {
      grundriss: { id: 'vorschau', name: '', sort: 0, version: 0, project_id: '', linien: [], symbole: [] },
      raeume: [],
      oeffnungen: [],
      objekte: [objekt],
      kisten: [],
    } as unknown as GrundrissDaten
    const k = baueSzene(daten, f)
    // Ein Stueck Boden darunter, damit man Hoehe und Groesse sieht.
    const r = 0.3
    const x0 = objekt.x / 100 - r
    const z0 = objekt.y / 100 - r
    const x1 = (objekt.x + objekt.breite_cm) / 100 + r
    const z1 = (objekt.y + objekt.tiefe_cm) / 100 + r
    k.unshift({ art: 'flaeche', rolle: 'boden', punkte: [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], y: 0, farbe: f.boden3d, deckkraft: 1, id: 'boden' })
    return k
  }, [objekt])

  useEffect(() => {
    if (geht !== 'ja') return
    motor.current?.setzen(koerper, farbenLesen().grund, true)
  }, [koerper, geht])

  return (
    <div className="relative h-44 overflow-hidden rounded-xl border-2 border-line" style={{ background: 'var(--plan-grund)' }}>
      <div ref={host} className="absolute inset-0" role="img" aria-label={t('zeichner.katalog.vorschau')} />
      {geht === 'nein' ? <p className="absolute inset-0 flex items-center justify-center p-3 text-center text-sm">{t('plan3d.geht_nicht')}</p> : null}
    </div>
  )
}
