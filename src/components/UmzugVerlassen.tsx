import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { Button, ConfirmDialog, useToast } from './ui'
import { useProject } from '../pages/ProjectLayout'
import { leaveProject } from '../lib/api'
import { useT } from '../lib/i18n'

/* Einen Umzug verlassen.
 *
 * Das ist etwas anderes als loeschen: der Umzug bleibt bestehen, man ist
 * nur nicht mehr dabei. Was man angelegt hat, bleibt auch da, denn es
 * gehoert dem Umzug und nicht der Person.
 *
 * Der Knopf steht an zwei Stellen: im Team, wo man die Mitglieder sieht,
 * und in den Einstellungen, wo man ihn neben dem Loeschen sucht. Darum
 * liegt er hier als eine Komponente. Zwei Umsetzungen waeren zwei Orte,
 * an denen die Regel zum letzten Besitzer auseinanderlaufen kann.
 */
export function UmzugVerlassen() {
  const { project, members, isOwner } = useProject()
  const t = useT()
  const toast = useToast()
  const nav = useNavigate()
  const [offen, setOffen] = useState(false)
  const [busy, setBusy] = useState(false)

  /* Nur der LETZTE Besitzer darf nicht gehen. Sind zwei Besitzer da, darf
   * jeder von beiden. Die Datenbank verhindert es ohnehin (guard_last_owner),
   * aber der Grund gehoert vorher hin und nicht erst in eine Fehlermeldung. */
  const besitzer = members.filter((m) => m.role === 'owner').length
  const letzterBesitzer = isOwner && besitzer <= 1

  return (
    <>
      <Button
        variant="outline"
        size="lg"
        full
        className="sm:w-auto"
        disabled={letzterBesitzer}
        onClick={() => setOffen(true)}
      >
        <LogOut size={20} className="spiegeln" /> {t('team.verlassen_knopf')}
      </Button>
      {letzterBesitzer ? <p className="t-sub mt-2">{t('team.verlassen_besitzer')}</p> : null}

      <ConfirmDialog
        open={offen}
        title={t('team.verlassen_titel')}
        confirmLabel={t('team.verlassen_bestaetigen')}
        body={t('team.verlassen_text', { name: project.name })}
        onClose={() => setOffen(false)}
        onConfirm={async () => {
          if (busy) return
          setBusy(true)
          try {
            await leaveProject(project.id)
            toast(t('team.verlassen_ok'), 'ok')
            /* Ersetzen, nicht anhaengen. Zurueck fuehrt sonst wieder in
             * einen Umzug, in dem man nicht mehr drin ist, und dort steht
             * dann eine Fehlermeldung statt einer Seite. */
            nav('/app', { replace: true })
          } catch (err) {
            toast(err instanceof Error ? err.message : String(err), 'error')
          } finally {
            setBusy(false)
            setOffen(false)
          }
        }}
      />
    </>
  )
}
