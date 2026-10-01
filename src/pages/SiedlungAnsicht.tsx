import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Building2, House, Map as KarteIcon } from 'lucide-react'
import { AppHeader } from '../components/AppShell'
import { Ansicht3D } from '../components/plan3d/oeffnen'
import type { Raum3DSteuer } from '../components/plan3d/Raum3D'
import type { Farben3D } from '../components/plan3d/szene'
import { umgebungAus } from '../components/plan3d/umgebungRahmen'
import type { Welt3D } from '../components/plan3d/vertrag3d'
import { Button, Empty, ErrorBox, Loading } from '../components/ui'
import { ladeGrundriss, ladeSiedlung } from '../lib/api'
import { useSprache } from '../lib/i18n'
import { siedlungWoerter } from '../lib/i18n/bausteine/siedlung'
import { woerterNachladen } from '../lib/i18n/woerter'
import { OSM_HINWEIS } from '../lib/osm'
import type { GrundrissDaten } from '../lib/types'
import { useAsync } from '../lib/util'

// Die Saetze der Siedlung kommen erst mit dieser Seite (siehe siedlung.ts).
woerterNachladen(siedlungWoerter)

/* Eine Siedlung in 3D (E83).
 *
 * Laedt die Siedlung und, wenn eine eigene Wohnung darin liegt, deren
 * Grundriss. Die Wohnung ist die Szene, die Raum3D immer zeigt (Ursprung
 * des Plans bei 0, Boden bei 0); die Siedlung kommt als eigene Welt dazu
 * (siedlung3d.ts) und wird dort um die Wohnung herum gelegt. Ohne Wohnung
 * steht man in der Mitte der Siedlung.
 *
 * Nichts davon laedt beim Start der App: diese Seite ist ein eigener Teil
 * (App.tsx), three kommt mit Raum3D (oeffnen.tsx) und siedlung3d.ts hier
 * per import(), beides erst, wenn die Seite offen ist. Laden, Fehler und
 * "gibt es nicht" sind eigene Zustaende. */

/** Ohne eigene Wohnung: eine leere Szene, nur die Welt drumherum. */
const OHNE_WOHNUNG: GrundrissDaten = {
  grundriss: { id: 'siedlung-ohne-wohnung', project_id: '', name: '', sort: 0, version: 0, created_at: '', updated_at: '' },
  raeume: [],
  oeffnungen: [],
  objekte: [],
  kisten: [],
}

type Teil = typeof import('../components/plan3d/siedlung3d')
type TeilLaden = { art: 'laedt' } | { art: 'fehler'; text: string } | { art: 'fertig'; teil: Teil }

export default function SiedlungAnsicht() {
  const { t } = useSprache()
  const nav = useNavigate()
  const { sid = '' } = useParams()

  const zustand = useAsync(async () => {
    const siedlung = await ladeSiedlung(sid)
    if (!siedlung) return null
    if (!siedlung.wohnung) return { siedlung, daten: null, wohnungFehlt: false }
    const daten = await ladeGrundriss(siedlung.wohnung.grundrissId)
    return { siedlung, daten, wohnungFehlt: !daten }
  }, [sid])

  // Der Bau der Haeuser (mit three) laedt gleichzeitig mit den Daten.
  const [teil, setTeil] = useState<TeilLaden>({ art: 'laedt' })
  const [versuch, setVersuch] = useState(0)
  useEffect(() => {
    let alive = true
    import('../components/plan3d/siedlung3d')
      .then((m) => alive && setTeil({ art: 'fertig', teil: m }))
      .catch((err: unknown) => alive && setTeil({ art: 'fehler', text: err instanceof Error ? err.message : String(err) }))
    return () => {
      alive = false
    }
  }, [versuch])

  const ergebnis = zustand.data
  const daten = ergebnis?.daten ?? null
  // Fehlt der Grundriss, wird die Siedlung ohne Wohnung gezeigt.
  const siedlung = useMemo(
    () => (ergebnis ? (ergebnis.daten ? ergebnis.siedlung : { ...ergebnis.siedlung, wohnung: null }) : null),
    [ergebnis],
  )
  const wohnungRahmen = useMemo(
    () => (daten ? (umgebungAus({ raeume: daten.raeume, oeffnungen: daten.oeffnungen })?.rahmen ?? null) : null),
    [daten],
  )
  const baue = teil.art === 'fertig' ? teil.teil.baueSiedlung : null
  // Stabil, damit Raum3D die Welt nur bei neuen Daten oder Farben neu baut.
  const welt = useMemo(
    () => (baue && siedlung ? (farben: Farben3D): Welt3D => baue({ siedlung, farben, wohnungRahmen }) : undefined),
    [baue, siedlung, wohnungRahmen],
  )

  const steuer = useRef<Raum3DSteuer>(null)
  const [ebene, setEbene] = useState<string | null>(null)

  const wohnung = siedlung?.wohnung ?? null
  const haus = wohnung ? siedlung?.gebaeude.find((g) => g.id === wohnung.gebaeudeId) : undefined
  const stock = wohnung ? (wohnung.geschoss === 0 ? t('siedlung.geschoss_eg') : t('siedlung.geschoss_n', { n: wohnung.geschoss })) : null
  // Unter dem Namen: beim Gehen das Stockwerk, sonst Haus und Stockwerk der
  // Wohnung (kurz, die Zeile ist am Handy schmal).
  const unterzeile = ebene
    ? t('siedlung.ebene_jetzt', { name: ebene })
    : wohnung && haus && stock
      ? t('siedlung.haus_stock', { haus: haus.name, stock })
      : null
  const bereit = Boolean(welt) && !!siedlung

  return (
    // Die Hoehe laesst der unteren Leiste (Handy) und der Suchzeile (Computer)
    // ihren Platz, wie im Chat.
    <div className="flex h-[calc(100dvh-var(--nav-h,6rem))] flex-col lg:h-[calc(100dvh-3rem-1px)]">
      <AppHeader
        title={siedlung?.name || t('siedlung.titel')}
        subtitle={unterzeile}
        back="/app/siedlung"
        sticky={false}
        actions={
          // Von oben braucht die Wohnung als Rahmen; ohne sie dreht man selbst.
          bereit && wohnung ? (
            <>
              <Button
                size="sm"
                variant="outline"
                aria-label={t('siedlung.zur_wohnung')}
                title={t('siedlung.zur_wohnung')}
                onClick={() => steuer.current?.zurWohnung()}
              >
                <House size={18} />
                <span className="hidden sm:inline">{t('siedlung.zur_wohnung')}</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                aria-label={t('siedlung.von_oben')}
                title={t('siedlung.von_oben')}
                onClick={() => steuer.current?.vonOben()}
              >
                <KarteIcon size={18} />
                <span className="hidden sm:inline">{t('siedlung.von_oben')}</span>
              </Button>
            </>
          ) : null
        }
      />
      <div className="flex min-h-0 flex-1 flex-col">
        {zustand.loading ? (
          <Loading label={t('siedlung.ansicht_laedt')} />
        ) : zustand.error ? (
          <div className="p-4">
            <ErrorBox error={zustand.error} onRetry={zustand.reload} />
          </div>
        ) : !siedlung ? (
          <div className="p-4">
            <Empty
              zeichnung="keine"
              icon={<Building2 size={34} />}
              title={t('siedlung.nicht_gefunden')}
              action={
                <Button variant="outline" onClick={() => nav('/app/siedlung')}>
                  {t('siedlung.zur_liste')}
                </Button>
              }
            />
          </div>
        ) : teil.art === 'fehler' ? (
          <div className="p-4">
            <ErrorBox
              error={t('siedlung.3d_fehler', { fehler: teil.text })}
              onRetry={() => {
                setTeil({ art: 'laedt' })
                setVersuch((v) => v + 1)
              }}
            />
          </div>
        ) : !bereit ? (
          <Loading label={t('siedlung.ansicht_laedt')} />
        ) : (
          <>
            {ergebnis?.wohnungFehlt ? (
              <p role="status" className="shrink-0 border-b border-line bg-surface px-3 py-2 text-sm font-bold text-warn">
                {t('siedlung.wohnung_fehlt')}
              </p>
            ) : null}
            <div className="min-h-0 flex-1">
              <Ansicht3D daten={daten ?? OHNE_WOHNUNG} welt={welt} onEbene={setEbene} steuer={steuer} />
            </div>
            {/* Pflichtangabe der Kartendaten (ODbL), unter dem Bild statt darauf. */}
            <p dir="ltr" className="shrink-0 border-t border-line bg-surface px-3 py-1 text-[0.6875rem] text-muted">
              {OSM_HINWEIS}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
