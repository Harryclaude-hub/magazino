import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Crosshair, LayoutDashboard, MapPinOff } from 'lucide-react'
import { platzRaeumen } from '../../lib/api'
import { useSprache } from '../../lib/i18n'
import type { KisteLage } from '../../lib/types'
import { Button, ConfirmDialog, Empty, useToast } from '../ui'
import { insel } from './lage'
import { Lageplan } from './Lageplan'

/* "Wo steht die Kiste" ganz unten auf der Kistenseite (START 5.8,
 * BAUPLAN 5.3), und "Wo steht das Moebel" auf der Moebelseite.
 *
 * Laedt als eigener Code-Teil erst, wenn der Abschnitt in die Naehe kommt
 * (NahLaden auf der Seite), damit Fotos und Inhalt zuerst da sind. Die
 * Karte selbst ist der Lageplan (Raum von oben, Tuer orange, Fenster
 * blau, Kiste rot, Regal oder Stapel von vorne); hier kommen die Wege
 * dazu: Platz waehlen oder aendern (Handy-Ablauf), vom Platz nehmen, im
 * Grundriss oeffnen. Der Knopf "3D" am Computer kommt mit Etappe 4 neben
 * "Im Grundriss zeigen".
 *
 * Zustaende: laedt, Fehler, kein Platz (mit "Platz waehlen"), da.
 */
export default function KistenLage({
  itemId,
  projectId,
  code,
  moebel = false,
  angekommen = true,
  canEdit,
}: {
  itemId: string
  projectId: string
  code: string
  /** Moebel-Eintrag: der Platz des verknuepften Objekts, kein eigener. */
  moebel?: boolean
  angekommen?: boolean
  canEdit: boolean
}) {
  const { t } = useSprache()
  const nav = useNavigate()
  const loc = useLocation()
  const toast = useToast()
  const [version, setVersion] = useState(0)
  const [raeumen, setRaeumen] = useState<string[] | null>(null)

  const platzWaehlen = () =>
    nav(`/app/p/${projectId}/kisten/${itemId}/platz`, { state: { zurueck: loc.pathname } })

  const leer = moebel ? (
    <Empty
      icon={<LayoutDashboard size={30} />}
      title={t('lage.kein_platz')}
      hint={t('lage.moebel_ohne_objekt')}
      action={
        <Link to={`/app/p/${projectId}/grundriss`}>
          <Button variant="outline">
            <LayoutDashboard size={18} /> {t('lage.grundriss_oeffnen')}
          </Button>
        </Link>
      }
    />
  ) : (
    <Empty
      icon={<Crosshair size={30} />}
      title={t('lage.kein_platz')}
      hint={canEdit ? t('lage.kein_platz_waehlen') : t('lage.kein_platz_hinweis')}
      action={
        canEdit ? (
          <Button size="lg" onClick={platzWaehlen}>
            <Crosshair size={20} /> {t('lage.platz_waehlen')}
          </Button>
        ) : undefined
      }
    />
  )

  const fuss = (lage: KisteLage) =>
    !moebel && canEdit && lage.art === 'kiste' ? (
      <div className="grid gap-2 sm:grid-cols-2">
        <Button full onClick={platzWaehlen}>
          <Crosshair size={18} /> {t('lage.platz_aendern')}
        </Button>
        <Button variant="outline" full onClick={() => setRaeumen(lage.auf_ihr ?? [])}>
          <MapPinOff size={18} /> {t('lage.vom_platz')}
        </Button>
      </div>
    ) : null

  return (
    <>
      <Lageplan
        itemId={itemId}
        projectId={projectId}
        angekommen={angekommen}
        mitLink
        leer={leer}
        fuss={fuss}
        version={version}
      />
      <ConfirmDialog
        open={raeumen !== null}
        title={t('lage.vom_platz_titel', { code: insel(code) })}
        body={
          t('lage.vom_platz_frage', { code: insel(code) }) +
          (raeumen && raeumen.length > 0 ? ` ${t('lage.rutscht_nach', { codes: raeumen.map(insel).join(', ') })}` : '')
        }
        confirmLabel={t('lage.vom_platz')}
        onClose={() => setRaeumen(null)}
        onConfirm={async () => {
          try {
            await platzRaeumen(itemId)
            toast(t('lage.vom_platz_fertig', { code: insel(code) }), 'ok')
            setVersion((v) => v + 1)
          } catch (err) {
            toast(err instanceof Error ? err.message : String(err), 'error')
          }
        }}
      />
    </>
  )
}
