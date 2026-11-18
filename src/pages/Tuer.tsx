import { useState } from 'react'
import { LogIn, LogOut } from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import { Button, Card, Empty, ErrorBox, Loading, SectionTitle, useToast } from '../components/ui'
import { useProject } from './ProjectLayout'
import { lagerBetreten, lagerVerlassen, listZugang } from '../lib/api'
import { displayNameOf, useAuth } from '../lib/auth'
import { useT } from '../lib/i18n'
import { fmtDateTime, useAsync } from '../lib/util'
import type { LagerZugang } from '../lib/types'

/* Die Tuer (E103): ein grosser Knopf zum Ein- und Austragen.
 * Gebucht wird nur auf Knopfdruck, nie beim blossen Oeffnen der Seite. */
export default function Tuer() {
  const { project, members, canEdit, isOwner } = useProject()
  const { user } = useAuth()
  const t = useT()
  const toast = useToast()
  const pid = project.id

  const drin = useAsync(() => listZugang(pid, true, 200), [pid])
  // Das Protokoll sehen nur Bearbeiter. Fuer die anderen wird nichts geladen.
  const protokoll = useAsync(() => (canEdit ? listZugang(pid, false, 30) : Promise.resolve([] as LagerZugang[])), [pid, canEdit])
  const [busy, setBusy] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  const nameVon = (id: string) =>
    displayNameOf(members.find((m) => m.user_id === id)?.profile, t('umzuege.jemand'))

  const meiner = (drin.data ?? []).find((z) => z.user_id === user?.id)

  async function umschalten() {
    setFehler(null)
    setBusy(true)
    try {
      if (meiner) {
        await lagerVerlassen(pid)
        toast(t('lager.tuer_toast_aus'), 'ok')
      } else {
        await lagerBetreten(pid)
        toast(t('lager.tuer_toast_ein'), 'ok')
      }
      drin.reload()
      protokoll.reload()
    } catch (err) {
      setFehler(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <AppHeader title={t('lager.tuer_titel')} subtitle={project.name} back={`/app/p/${pid}`} />
      <Page>
        <div className="mx-auto max-w-lg space-y-5">
          {drin.loading && !drin.data ? (
            <Loading label={t('lager.tuer_laedt')} />
          ) : drin.error ? (
            <ErrorBox error={drin.error} onRetry={drin.reload} />
          ) : (
            <Card className="p-5 text-center">
              <p className="t-name-lg">
                {meiner
                  ? t('lager.tuer_status_drin', { zeit: fmtDateTime(meiner.rein_am) })
                  : t('lager.tuer_status_draussen')}
              </p>
              <Button
                size="lg"
                full
                variant={meiner ? 'outline' : 'primary'}
                loading={busy}
                onClick={umschalten}
                className="mt-4 min-h-20 text-2xl"
              >
                {meiner ? <LogOut size={28} /> : <LogIn size={28} />}
                {t(meiner ? 'lager.tuer_austragen' : 'lager.tuer_eintragen')}
              </Button>
              <p className="t-sub mt-4">{t('lager.tuer_hinweis')}</p>
              {isOwner ? <p className="t-sub mt-1">{t('lager.tuer_hinweis_besitzer')}</p> : null}
            </Card>
          )}

          {fehler ? <ErrorBox error={fehler} /> : null}

          {!drin.error && drin.data ? (
            <section>
              <SectionTitle>{t('lager.tuer_drin_titel')}</SectionTitle>
              {drin.data.length === 0 ? (
                <p className="t-sub">{t('lager.tuer_niemand')}</p>
              ) : (
                <Card className="divide-y divide-line">
                  {drin.data.map((z) => (
                    <div key={z.id} className="flex items-baseline justify-between gap-3 px-4 py-3">
                      <span className="t-name min-w-0 truncate">{nameVon(z.user_id)}</span>
                      <span className="t-sub shrink-0">{t('lager.tuer_seit', { zeit: fmtDateTime(z.rein_am) })}</span>
                    </div>
                  ))}
                </Card>
              )}
            </section>
          ) : null}

          {canEdit ? (
            <section>
              <SectionTitle>{t('lager.tuer_protokoll')}</SectionTitle>
              {protokoll.loading && !protokoll.data ? (
                <Loading />
              ) : protokoll.error ? (
                <ErrorBox error={protokoll.error} onRetry={protokoll.reload} />
              ) : (protokoll.data ?? []).length === 0 ? (
                <Empty title={t('lager.tuer_protokoll_leer')} zeichnung="keine" />
              ) : (
                <Card className="divide-y divide-line">
                  {(protokoll.data ?? []).map((z) => (
                    <div key={z.id} className="px-4 py-3">
                      <p className="t-name truncate">{nameVon(z.user_id)}</p>
                      <p className="t-sub">
                        {t('lager.tuer_von_bis', {
                          von: fmtDateTime(z.rein_am),
                          bis: z.raus_am ? fmtDateTime(z.raus_am) : t('lager.tuer_noch_drin'),
                        })}
                      </p>
                    </div>
                  ))}
                </Card>
              )}
            </section>
          ) : null}
        </div>
      </Page>
    </>
  )
}
