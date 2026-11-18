import { useMemo, useState } from 'react'
import { CalendarPlus, Check } from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import { Badge, Button, Card, Chip, Empty, ErrorBox, Loading, SectionTitle, useToast } from '../components/ui'
import { useProject } from './ProjectLayout'
import { ausleiheZurueck, listAusleihen, listBestand } from '../lib/api'
import { displayNameOf, useAuth } from '../lib/auth'
import { useT } from '../lib/i18n'
import { mengeText } from '../lib/lager'
import { icsHerunterladen, type KalenderTermin } from '../lib/kalender'
import { fmtDateTime, useAsync } from '../lib/util'
import type { Ausleihe, Bestand } from '../lib/types'

/* Ausleihen (E103): was ich noch zurueckbringen muss. */
export default function Ausleihen() {
  const { project, members, canEdit } = useProject()
  const { user } = useAuth()
  const t = useT()
  const toast = useToast()
  const pid = project.id

  const daten = useAsync(async () => {
    const [offen, bestand] = await Promise.all([listAusleihen(pid, true), listBestand(pid)])
    return { offen, bestand }
  }, [pid])

  const [alle, setAlle] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  // Die erledigten werden erst geladen, wenn jemand sie sehen will.
  const [erledigtAuf, setErledigtAuf] = useState(false)
  const erledigt = useAsync(
    () => (erledigtAuf ? listAusleihen(pid, false) : Promise.resolve([] as Ausleihe[])),
    [pid, erledigtAuf],
  )

  const bestandVon = useMemo(() => {
    const m = new Map<string, Bestand>()
    for (const b of daten.data?.bestand ?? []) m.set(b.id, b)
    return m
  }, [daten.data])

  const nameVon = (id: string) => displayNameOf(members.find((m) => m.user_id === id)?.profile, t('umzuege.jemand'))
  const jetzt = Date.now()
  const offenAlle = daten.data?.offen ?? []
  const meine = offenAlle.filter((a) => a.user_id === user?.id)
  const liste = canEdit && alle ? offenAlle : meine
  const zeigeWer = canEdit && alle

  const dingName = (a: Ausleihe) => bestandVon.get(a.bestand_id)?.name ?? t('lager.unbekanntes_ding')
  const einheit = (a: Ausleihe) => bestandVon.get(a.bestand_id)?.einheit ?? ''

  function termin(a: Ausleihe): KalenderTermin {
    const ding = dingName(a)
    return {
      id: a.id,
      titel: t('lager.kal_titel', { ding, lager: project.name }),
      beschreibung: t('lager.kal_beschreibung', {
        menge: mengeText(a.menge),
        einheit: einheit(a),
        ding,
        lager: project.name,
      }),
      faellig: a.faellig_am,
    }
  }

  function kalender(termine: KalenderTermin[], datei: string) {
    try {
      icsHerunterladen(termine, datei)
      toast(t('lager.toast_kalender'), 'ok')
    } catch (err) {
      setFehler(err instanceof Error ? err.message : String(err))
    }
  }

  async function zurueck(a: Ausleihe) {
    setFehler(null)
    setBusyId(a.id)
    try {
      await ausleiheZurueck(a.id)
      toast(t('lager.toast_zurueck'), 'ok')
      daten.reload()
      if (erledigtAuf) erledigt.reload()
    } catch (err) {
      setFehler(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyId(null)
    }
  }

  function zeile(a: Ausleihe, offen: boolean) {
    const ueberfaellig = offen && new Date(a.faellig_am).getTime() < jetzt
    return (
      <Card key={a.id} className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="t-name-lg break-words">{dingName(a)}</h3>
            <p className="t-sub mt-0.5 break-words">
              {zeigeWer || !offen ? t('lager.von_wem', { name: nameVon(a.user_id) }) : ''}
            </p>
          </div>
          <p className="shrink-0 text-xl font-black tabular-nums" dir="ltr">
            {mengeText(a.menge)} <span className="text-base font-bold text-muted">{einheit(a)}</span>
          </p>
        </div>
        {offen ? (
          <p className={ueberfaellig ? 'mt-2 font-bold text-danger' : 'mt-2 text-base'}>
            {ueberfaellig ? <Badge className="me-2 bg-danger text-paper">{t('lager.ueberfaellig')}</Badge> : null}
            {t('lager.faellig', { zeit: fmtDateTime(a.faellig_am) })}
          </p>
        ) : (
          <p className="t-sub mt-2">{t('lager.zurueck_am', { zeit: fmtDateTime(a.zurueck_am) })}</p>
        )}
        {offen ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button className="flex-1" loading={busyId === a.id} onClick={() => void zurueck(a)}>
              <Check size={18} /> {t('lager.zurueckgebracht')}
            </Button>
            <Button variant="outline" onClick={() => kalender([termin(a)], 'rueckgabe.ics')}>
              <CalendarPlus size={18} /> {t('lager.in_kalender')}
            </Button>
          </div>
        ) : null}
      </Card>
    )
  }

  const fertige = (erledigt.data ?? [])
    .filter((a) => a.zurueck_am !== null && (canEdit || a.user_id === user?.id))
    .sort((x, y) => (y.zurueck_am ?? '').localeCompare(x.zurueck_am ?? ''))
    .slice(0, 30)

  return (
    <>
      <AppHeader title={t('lager.ausleihen_titel')} subtitle={project.name} back={`/app/p/${pid}`} />
      <Page>
        <div className="mx-auto max-w-2xl space-y-5">
          {daten.loading && !daten.data ? (
            <Loading label={t('lager.ausleihen_laedt')} />
          ) : daten.error ? (
            <ErrorBox error={daten.error} onRetry={daten.reload} />
          ) : (
            <section className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Chip active={!alle} onClick={() => setAlle(false)}>
                  {t('lager.meine_offenen')} ({meine.length})
                </Chip>
                {canEdit ? (
                  <Chip active={alle} onClick={() => setAlle(true)}>
                    {t('lager.alle_offenen')} ({offenAlle.length})
                  </Chip>
                ) : null}
              </div>

              {fehler ? <ErrorBox error={fehler} /> : null}

              {liste.length === 0 ? (
                <Empty zeichnung="keine" title={t(zeigeWer ? 'lager.keine_alle' : 'lager.keine_meine')} />
              ) : (
                <ul className="space-y-3">
                  {liste.map((a) => (
                    <li key={a.id}>{zeile(a, true)}</li>
                  ))}
                </ul>
              )}

              {meine.length > 0 ? (
                <Button variant="outline" full onClick={() => kalender(meine.map(termin), 'rueckgabe-alle.ics')}>
                  <CalendarPlus size={18} /> {t('lager.alle_in_kalender')}
                </Button>
              ) : null}
            </section>
          )}

          <section>
            <SectionTitle>{t('lager.erledigt_titel')}</SectionTitle>
            {!erledigtAuf ? (
              <Button variant="outline" onClick={() => setErledigtAuf(true)}>
                {t('lager.erledigt_zeigen')}
              </Button>
            ) : erledigt.loading && !erledigt.data ? (
              <Loading />
            ) : erledigt.error ? (
              <ErrorBox error={erledigt.error} onRetry={erledigt.reload} />
            ) : fertige.length === 0 ? (
              <p className="t-sub">{t('lager.erledigt_leer')}</p>
            ) : (
              <ul className="space-y-3">
                {fertige.map((a) => (
                  <li key={a.id}>{zeile(a, false)}</li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <div className="h-6" />
      </Page>
    </>
  )
}
