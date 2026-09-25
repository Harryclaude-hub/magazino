import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Map as KarteIcon } from 'lucide-react'
import { ladeGrundriss, ladeKisteLage } from '../../lib/api'
import { useSprache } from '../../lib/i18n'
import type { GrundrissDaten, KisteLage } from '../../lib/types'
import { Button, Empty, ErrorBox, Spinner } from '../ui'
import { FachAnsicht } from './FachAnsicht'
import { stapelObjekt, stapelVon, stapelWurzel } from './hilfe'
import { lageOrt, lageSatz } from './lage'
import { PlanBild, PlanLegende } from './PlanBild'
import { StapelSeite } from './StapelSeite'

/* Kleine Nur-Lese-Karte: wo steht diese Kiste (oder dieses Moebel)?
 * Satz ("Neue Wohnung, Wohnzimmer / Regal Billy, Fach 2 (Ebene 2), 44 bis
 * 78 cm ueber dem Boden"), darunter der Raum von oben mit der Kiste in
 * Rot, Tuer orange, Fenster blau, und je nach Unterlage die Vorderansicht
 * des Regals oder die Seitenansicht des Stapels.
 *
 * Laedt selbst (kiste_lage, dann nur diesen Raum aus grundriss_laden), damit
 * Suche, Kistenseite und Handy dieselbe Karte ohne eigene Abfrage zeigen.
 * Vier getrennte Zustaende: laedt, Fehler, kein Platz, da. Die Kistenseite
 * haengt ueber leer und fuss ihre Knoepfe an (KistenLage.tsx).
 */

type Stand =
  | { art: 'laedt' }
  | { art: 'fehler'; text: string }
  | { art: 'leer' }
  | { art: 'da'; lage: KisteLage; daten: GrundrissDaten | null }

export function Lageplan({
  itemId,
  projectId,
  angekommen = true,
  mitLink = false,
  leer,
  fuss,
  version = 0,
}: {
  itemId: string
  projectId: string
  /** Nicht angekommen: der Plan zeigt, wo die Kiste hinkommt. */
  angekommen?: boolean
  /** Knopf "Im Grundriss zeigen" unter der Karte. */
  mitLink?: boolean
  /** Statt des schlichten Leer-Hinweises (kein Platz). */
  leer?: ReactNode
  /** Unter der Karte, mit der geladenen Lage (Knoepfe der Kistenseite). */
  fuss?: (lage: KisteLage) => ReactNode
  /** Hochzaehlen laedt neu (nach "Vom Platz nehmen"). */
  version?: number
}) {
  const { t } = useSprache()
  const [stand, setStand] = useState<Stand>({ art: 'laedt' })
  const [versuch, setVersuch] = useState(0)

  useEffect(() => {
    let alive = true
    setStand({ art: 'laedt' })
    ;(async () => {
      const lage = await ladeKisteLage(itemId)
      if (!lage) return { art: 'leer' } as Stand
      const daten = await ladeGrundriss(lage.grundriss.id, lage.raum.id)
      return { art: 'da', lage, daten } as Stand
    })()
      .then((s) => alive && setStand(s))
      .catch((err: unknown) => alive && setStand({ art: 'fehler', text: err instanceof Error ? err.message : String(err) }))
    return () => {
      alive = false
    }
  }, [itemId, versuch, version])

  if (stand.art === 'laedt') {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-line p-4 text-muted">
        <Spinner /> {t('lage.laedt')}
      </div>
    )
  }
  if (stand.art === 'fehler') return <ErrorBox error={stand.text} onRetry={() => setVersuch((v) => v + 1)} />
  if (stand.art === 'leer') return <>{leer ?? <Empty title={t('lage.kein_platz')} hint={t('lage.kein_platz_hinweis')} />}</>

  const { lage, daten } = stand
  const kiste = daten?.kisten.find((k) => k.id === itemId) ?? null
  const wurzel = kiste && daten ? stapelWurzel(kiste, daten.kisten) : null
  const objekt = kiste && daten ? stapelObjekt(kiste, daten) : null
  const stapel = kiste && daten ? stapelVon(kiste, daten.kisten) : []
  const link = `/app/p/${projectId}/grundriss/${lage.grundriss.id}?raum=${lage.raum.id}&kiste=${itemId}`
  /* Die Spaltenzahl des Regals, damit der Satz die Spalte nur nennt, wenn
   * es mehr als eine gibt. */
  const fachObjekt =
    lage.art === 'kiste' && lage.objekt ? (daten?.objekte.find((o) => o.id === lage.objekt?.id) ?? null) : null

  return (
    <div className="space-y-3">
      <div>
        <p className="t-sub">{lageOrt(lage, t)}</p>
        <p className="t-name">{lageSatz(lage, t, fachObjekt?.spalten)}</p>
        {!angekommen ? <p className="t-sub mt-1">{t('lage.noch_nicht_da')}</p> : null}
      </div>
      {daten ? (
        <PlanBild
          daten={daten}
          ausschnitt={{ raumId: lage.raum.id }}
          hervor={itemId}
          maxHoehe="46vh"
          label={t('lage.titel')}
        />
      ) : (
        <ErrorBox error={t('lage.plan_fehlt')} onRetry={() => setVersuch((v) => v + 1)} />
      )}
      {kiste && wurzel && objekt && wurzel.unterlage_art === 'fach' && daten ? (
        <FachAnsicht objekt={objekt} kisten={daten.kisten} hervor={itemId} />
      ) : kiste && wurzel ? (
        <StapelSeite
          kisten={stapel}
          objekt={wurzel.unterlage_art === 'objekt' ? objekt : null}
          grenze={kiste.grenze_cm}
          hervor={itemId}
        />
      ) : null}
      <PlanLegende />
      {mitLink ? (
        <Link to={link} className="block">
          <Button variant="outline" full>
            <KarteIcon size={18} /> {t('lage.im_grundriss')}
          </Button>
        </Link>
      ) : null}
      {fuss ? fuss(lage) : null}
    </div>
  )
}
