import { useEffect, useMemo, useRef, useState } from 'react'
import { ErrorBox, Spinner } from '../ui'
import { Plan2D } from './Plan2D'
import { PlanSeite } from './PlanSeite'
import { ladeRaumplan, ladeRegale, ladeZimmerKisten } from '../../lib/api'
import { useKistenGroessenStand } from '../../lib/groessen'
import { useSprache } from '../../lib/i18n'
import { baueRaster, findeKiste } from '../../lib/raumplan'
import type { Item, Raumplan, Regal } from '../../lib/types'

/* Wo eine Kiste im Zimmer steht, im Kleinen: der Plan von oben mit der
 * Tuer und der Kiste hervorgehoben, darunter ihre Reihe von der Seite,
 * damit man die Hoehe sieht. Fuer die Suche.
 *
 * Hier aendert man nichts. Ein Tipp auf den Plan oeffnet den ganzen
 * Raumplan, dort geht alles andere.
 */

type Zustand = 'laedt' | 'da' | 'fehler'

interface Daten {
  plan: Raumplan | null
  kisten: Item[]
  regale: Regal[]
}

/** Hoeher als das wird die Seitenansicht nicht, sonst schiebt sie im
 *  Dialog alles andere weg. */
const SEITE_MAX_PX = 220

export function Fundort({
  projectId,
  roomId,
  itemId,
  farbe,
  angekommen,
  onOeffnen,
}: {
  projectId: string
  roomId: string
  itemId: string
  /** Farbe des Zimmers, fuer Kisten ohne eigene Markierung. */
  farbe: string
  /** Ist die Kiste schon da? Sonst zeigt der Plan ihr Ziel, nicht, wo
   *  sie jetzt steht, und die Legende sagt das. */
  angekommen: boolean
  /** Den ganzen Raumplan oeffnen. */
  onOeffnen: () => void
}) {
  const { t } = useSprache()
  /* Fehlen die Groessen, rechnet der Plan mit 40 cm je Kiste. Das steht
   * dann dabei, sonst widerspraeche die Seitenansicht der Hoehe darueber,
   * die aus der Datenbank kommt. */
  const { tabelle: groessen, fehler: groessenFehler } = useKistenGroessenStand()
  const [daten, setDaten] = useState<Daten | null>(null)
  const [zustand, setZustand] = useState<Zustand>('laedt')
  const [fehler, setFehler] = useState<string | null>(null)
  const [versuch, setVersuch] = useState(0)
  const [breite, setBreite] = useState(0)
  const flaeche = useRef<HTMLDivElement>(null)

  /* Laden. Wer schnell einen anderen Treffer oeffnet, soll nicht kurz das
   * Zimmer des vorigen sehen: darum von vorn und mit Abbruch. */
  useEffect(() => {
    let alive = true
    setDaten(null)
    setZustand('laedt')
    setFehler(null)
    Promise.all([ladeRaumplan(roomId), ladeZimmerKisten(projectId, roomId), ladeRegale(roomId)])
      .then(([plan, kisten, regale]) => {
        if (!alive) return
        setDaten({ plan, kisten, regale })
        setZustand('da')
      })
      .catch((err: unknown) => {
        if (!alive) return
        setFehler(err instanceof Error ? err.message : String(err))
        setZustand('fehler')
      })
    return () => {
      alive = false
    }
  }, [projectId, roomId, versuch])

  /* Die Zellgroesse richtet sich nach dem Platz, den der Dialog hat. */
  useEffect(() => {
    const el = flaeche.current
    if (!el) return
    const messen = () => setBreite(el.clientWidth)
    messen()
    const beobachter = new ResizeObserver(messen)
    beobachter.observe(el)
    return () => beobachter.disconnect()
  }, [zustand])

  const raster = useMemo(
    () => (daten?.plan ? baueRaster(daten.plan, daten.regale, daten.kisten, groessen) : null),
    [daten, groessen],
  )
  const fund = raster ? findeKiste(raster, itemId) : null

  if (zustand === 'laedt') {
    return (
      <div className="flex items-center gap-2 py-6 text-base text-muted">
        <Spinner />
        {t('zustand.laedt')}
      </div>
    )
  }
  if (zustand === 'fehler') {
    return <ErrorBox error={fehler ?? ''} onRetry={() => setVersuch((v) => v + 1)} />
  }
  if (!daten?.plan || !raster) {
    return <p className="t-sub">{t('raumplan.nur_lesen_leer')}</p>
  }

  const plan = daten.plan
  /* Platz im Knopf um den Plan: Rand 2 und Innenabstand 4 auf jeder
   * Seite. Die Karte von oben braucht 8 mehr als ihre Zellen, die
   * Seitenansicht 54 (links die Skala). */
  const platz = Math.max(0, breite - 12)
  const zelle = Math.max(12, Math.min(56, Math.floor((platz - 8) / raster.spalten)))
  /* Und die Seitenansicht darf nicht hoeher werden als SEITE_MAX_PX,
   * auch bei feinem Raster. */
  const zelleSeite = Math.max(
    8,
    Math.min(
      56,
      Math.floor((platz - 54) / raster.spalten),
      Math.floor((SEITE_MAX_PX * plan.raster_cm) / plan.hoehe_cm),
    ),
  )
  /* Die Plaene selbst tun beim Tippen nichts. Der Knopf um sie herum
   * oeffnet den Raumplan; riefe auch der Plan onOeffnen, liefe der
   * Sprung zweimal. */
  const nichts = () => {}

  return (
    <div ref={flaeche} className="space-y-3">
      <button
        type="button"
        onClick={onOeffnen}
        dir="ltr"
        aria-label={t('raumplan.zeigen')}
        className="block w-full overflow-auto rounded-2xl border-2 border-line bg-paper p-1 transition hover:border-ink"
      >
        {breite > 0 ? (
          <Plan2D
            plan={plan}
            raster={raster}
            zelle={zelle}
            farbe={farbe}
            hervor={fund ? itemId : null}
            auswahlZelle={null}
            tuerLabel={t('raumplan.tuer_hier')}
            hoeheText={(h) => t('raumplan.stapel_hoehe', { h })}
            abwarten={false}
            markeFarbe="var(--danger)"
            onTipp={nichts}
            onDoppel={nichts}
          />
        ) : null}
      </button>

      {/* Eine kleine Legende: im kleinen Plan sind die Schriften zu klein
          zum Lesen, die Zeichen nicht. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold text-muted">
        {plan.tuer_x !== null ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-5 rounded-full bg-danger" />
            {t('raumplan.tuer_hier')}
          </span>
        ) : null}
        {fund ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-4 w-4 rounded-sm border-[3px] border-danger" />
            {angekommen ? t('suche.legende_hier') : t('suche.legende_ziel')}
          </span>
        ) : (
          <span>{t('raumplan.kiste_ohne_platz')}</span>
        )}
      </div>

      {/* Die Reihe der Kiste von der Seite: hier sieht man die Hoehe. */}
      {fund ? (
        <div>
          {groessenFehler ? (
            <p className="mb-2 rounded-xl border-2 border-warn/40 bg-warn/10 px-3 py-2 text-sm font-bold text-warn">
              {t('raumplan.hoehen_geschaetzt')}
            </p>
          ) : null}
          <p className="t-sub mb-1.5">{t('suche.seite_titel', { n: fund.stapel.y + 1 })}</p>
          <button
            type="button"
            onClick={onOeffnen}
            dir="ltr"
            aria-label={t('raumplan.zeigen')}
            className="block w-full overflow-auto rounded-2xl border-2 border-line bg-paper p-1 transition hover:border-ink"
          >
            {breite > 0 ? (
              <PlanSeite
                plan={plan}
                raster={raster}
                reihe={fund.stapel.y}
                zelle={zelleSeite}
                farbe={farbe}
                hervor={itemId}
                tuerLabel={t('raumplan.tuer_hier')}
                deckeLabel={t('raumplan.decke', { h: plan.hoehe_cm })}
                abwarten={false}
                onTipp={nichts}
                onDoppel={nichts}
              />
            ) : null}
          </button>
        </div>
      ) : null}
    </div>
  )
}
