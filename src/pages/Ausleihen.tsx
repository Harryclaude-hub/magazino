import { memo, useCallback, useMemo, useState } from 'react'
import { CalendarPlus, Check, ChevronDown, ChevronRight } from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import { KalenderVerbindung } from '../components/KalenderVerbindung'
import { MehrAnzeigen } from '../components/MehrAnzeigen'
import { ProduktBild } from '../components/ProduktBild'
import { Button, Empty, ErrorBox, Loading, Modal, Segmented, useToast } from '../components/ui'
import { useProject } from './ProjectLayout'
import { ausleiheZurueck, listAusleihen, listBestand } from '../lib/api'
import { displayNameOf, useAuth } from '../lib/auth'
import { useIstDesktop } from '../lib/desktop'
import { useFenster } from '../lib/fenster'
import { useT } from '../lib/i18n'
import { faelligInfo, mengeText } from '../lib/lager'
import { icsHerunterladen, type KalenderTermin } from '../lib/kalender'
import { cx, fmtDateTime, useAsync } from '../lib/util'
import type { Ausleihe, Bestand } from '../lib/types'

/* Unterwegs (E103, E109; vorher "Ausleihen"): was gerade mitgenommen ist und
 * zurueckkommt. Jeder sieht seine; Bearbeiter koennen auf "Alle" umschalten.
 * Dichte Zeilen mit Faelligkeit ("heute 18:00", "ueberfaellig seit 2 Tagen"
 * in Rot); Tippen oeffnet das Blatt mit "Zurueckgebracht" und Kalender. Am
 * Computer steht "Zurueckgebracht" gleich in der Zeile. Die Route bleibt
 * /ausleihen, die Datenbank und die Funktionen heissen weiter so. */

type Wahl = 'meine' | 'alle'

interface ZeilenDaten {
  a: Ausleihe
  ding: string
  einheit: string
  bild: string | null
  wer: string
}

const Zeile = memo(function Zeile({
  d,
  zeigeWer,
  desktop,
  busy,
  onTipp,
  onZurueck,
}: {
  d: ZeilenDaten
  zeigeWer: boolean
  desktop: boolean
  busy: boolean
  onTipp: (a: Ausleihe) => void
  onZurueck: (a: Ausleihe) => void
}) {
  const t = useT()
  const f = faelligInfo(d.a.faellig_am, t)
  return (
    <li className="lz-li">
      <div className="flex min-h-[60px] items-center">
        <button
          type="button"
          onClick={() => onTipp(d.a)}
          className="lz-zeile flex min-h-[60px] min-w-0 flex-1 items-center gap-3 ps-4 pe-3 py-2 text-start"
        >
          <ProduktBild pfad={d.bild} groesse={40} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-base font-semibold leading-tight">{d.ding}</span>
            <span className={cx('block truncate text-[0.8125rem] leading-snug', f.ueberfaellig ? 'font-semibold text-danger' : 'text-muted')}>
              {f.text}
              {zeigeWer ? ` · ${d.wer}` : ''}
            </span>
          </span>
          <span className="shrink-0 text-end text-base font-bold tabular-nums" dir="ltr">
            {mengeText(d.a.menge)} <span className="text-[0.8125rem] font-medium text-muted">{d.einheit}</span>
          </span>
          {desktop ? null : <ChevronRight size={16} className="spiegeln -ms-1 shrink-0 text-muted/60" aria-hidden="true" />}
        </button>
        {desktop ? (
          <div className="shrink-0 pe-4">
            <Button size="sm" variant="outline" loading={busy} onClick={() => onZurueck(d.a)}>
              <Check size={16} /> {t('lager.zurueckgebracht')}
            </Button>
          </div>
        ) : null}
      </div>
    </li>
  )
})

export default function Ausleihen() {
  const { project, members, canEdit } = useProject()
  const { user } = useAuth()
  const t = useT()
  const toast = useToast()
  const desktop = useIstDesktop()
  const pid = project.id

  const daten = useAsync(async () => {
    const [offen, bestand] = await Promise.all([listAusleihen(pid, true), listBestand(pid)])
    return { offen, bestand }
  }, [pid])

  const [wahl, setWahl] = useState<Wahl>('meine')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [blattId, setBlattId] = useState<string | null>(null)
  // Die zurueckgebrachten werden erst geladen, wenn jemand sie sehen will.
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

  const nameVon = useCallback(
    (id: string) => displayNameOf(members.find((m) => m.user_id === id)?.profile, t('umzuege.jemand')),
    [members, t],
  )
  const offenAlle = useMemo(() => daten.data?.offen ?? [], [daten.data])
  const meine = useMemo(() => offenAlle.filter((a) => a.user_id === user?.id), [offenAlle, user?.id])
  const zeigeAlle = canEdit && wahl === 'alle'
  const liste = zeigeAlle ? offenAlle : meine

  const zeilen = useMemo<ZeilenDaten[]>(
    () =>
      liste.map((a) => {
        const b = bestandVon.get(a.bestand_id)
        return { a, ding: b?.name ?? t('lager.unbekanntes_ding'), einheit: b?.einheit ?? '', bild: b?.bild_pfad ?? null, wer: nameVon(a.user_id) }
      }),
    [liste, bestandVon, nameVon, t],
  )
  const { n, mehr } = useFenster(zeilen)
  const sichtbar = useMemo(() => zeilen.slice(0, n), [zeilen, n])
  const blatt = blattId ? (zeilen.find((z) => z.a.id === blattId) ?? null) : null

  function termin(d: ZeilenDaten): KalenderTermin {
    return {
      id: d.a.id,
      titel: t('lager.kal_titel', { ding: d.ding, lager: project.name }),
      beschreibung: t('lager.kal_beschreibung', {
        menge: mengeText(d.a.menge),
        einheit: d.einheit,
        ding: d.ding,
        lager: project.name,
      }),
      faellig: d.a.faellig_am,
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

  const zurueck = useCallback(
    async (a: Ausleihe) => {
      setFehler(null)
      setBusyId(a.id)
      try {
        await ausleiheZurueck(a.id)
        toast(t('lager.toast_zurueck'), 'ok')
        setBlattId(null)
        daten.reload()
        if (erledigtAuf) erledigt.reload()
      } catch (err) {
        setFehler(err instanceof Error ? err.message : String(err))
      } finally {
        setBusyId(null)
      }
    },
    // daten und erledigt wechseln mit jedem Laden; die Funktionen darin bleiben gleich.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [erledigtAuf, t, toast],
  )
  const tippen = useCallback((a: Ausleihe) => setBlattId(a.id), [])

  const fertige = (erledigt.data ?? [])
    .filter((a) => a.zurueck_am !== null && (canEdit || a.user_id === user?.id))
    .sort((x, y) => (y.zurueck_am ?? '').localeCompare(x.zurueck_am ?? ''))
    .slice(0, 30)

  return (
    <>
      <AppHeader title={t('lager.ausleihen_titel')} subtitle={project.name} back={`/app/p/${pid}`} />
      <Page>
        <div className="mx-auto max-w-3xl space-y-5">
          {daten.loading && !daten.data ? (
            <Loading label={t('lager.ausleihen_laedt')} />
          ) : daten.error ? (
            <ErrorBox error={daten.error} onRetry={daten.reload} />
          ) : (
            <section className="space-y-3">
              {canEdit ? (
                <Segmented<Wahl>
                  label={t('lager.ausleihen_titel')}
                  value={wahl}
                  onChange={setWahl}
                  options={[
                    { value: 'meine', label: `${t('lager.meine_offenen')} (${meine.length})` },
                    { value: 'alle', label: `${t('lager.alle_offenen')} (${offenAlle.length})` },
                  ]}
                />
              ) : null}

              {fehler ? <ErrorBox error={fehler} /> : null}

              {zeilen.length === 0 ? (
                <Empty zeichnung="keine" title={t(zeigeAlle ? 'lager.keine_alle' : 'lager.keine_meine')} />
              ) : (
                <>
                  <ul className="lz overflow-hidden rounded-karte bg-surface">
                    {sichtbar.map((d) => (
                      <Zeile
                        key={d.a.id}
                        d={d}
                        zeigeWer={zeigeAlle}
                        desktop={desktop}
                        busy={busyId === d.a.id}
                        onTipp={tippen}
                        onZurueck={zurueck}
                      />
                    ))}
                  </ul>
                  <MehrAnzeigen rest={zeilen.length - n} n={n} onMehr={mehr} />
                </>
              )}

              {meine.length > 0 ? (
                <Button
                  variant="outline"
                  full
                  onClick={() =>
                    kalender(
                      meine.map((a) => {
                        const b = bestandVon.get(a.bestand_id)
                        return termin({ a, ding: b?.name ?? t('lager.unbekanntes_ding'), einheit: b?.einheit ?? '', bild: null, wer: '' })
                      }),
                      'rueckgabe-alle.ics',
                    )
                  }
                >
                  <CalendarPlus size={18} /> {t('lager.alle_in_kalender')}
                </Button>
              ) : null}
              <KalenderVerbindung />
            </section>
          )}

          <section>
            <button
              type="button"
              onClick={() => setErledigtAuf((v) => !v)}
              aria-expanded={erledigtAuf}
              className="knopf -mx-1 flex w-full items-center justify-between gap-3 rounded-xl px-1 py-2 text-start"
            >
              <span className="text-[1.18rem] font-bold leading-tight tracking-[-0.024em] text-ink">{t('lager.erledigt_titel')}</span>
              <ChevronDown
                size={20}
                className={cx('shrink-0 text-muted transition-transform', erledigtAuf && 'rotate-180')}
                aria-hidden="true"
              />
            </button>
            {!erledigtAuf ? null : erledigt.loading && !erledigt.data ? (
              <Loading />
            ) : erledigt.error ? (
              <ErrorBox error={erledigt.error} onRetry={erledigt.reload} />
            ) : fertige.length === 0 ? (
              <p className="t-sub">{t('lager.erledigt_leer')}</p>
            ) : (
              <ul className="lz overflow-hidden rounded-karte bg-surface">
                {fertige.map((a) => {
                  const b = bestandVon.get(a.bestand_id)
                  return (
                    <li key={a.id} className="lz-li">
                      <div className="flex min-h-[60px] items-center gap-3 px-4 py-2">
                        <ProduktBild pfad={b?.bild_pfad} groesse={40} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-base font-semibold leading-tight">{b?.name ?? t('lager.unbekanntes_ding')}</span>
                          <span className="block truncate text-[0.8125rem] leading-snug text-muted">
                            {t('lager.zurueck_am', { zeit: fmtDateTime(a.zurueck_am) })} · {nameVon(a.user_id)}
                          </span>
                        </span>
                        <span className="shrink-0 text-end text-base font-bold tabular-nums text-muted" dir="ltr">
                          {mengeText(a.menge)} <span className="text-[0.8125rem] font-medium">{b?.einheit ?? ''}</span>
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
        <div className="h-6" />
      </Page>

      {blatt ? (
        <Modal open onClose={() => setBlattId(null)} title={blatt.ding}>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <ProduktBild pfad={blatt.bild} groesse={56} />
              <div className="min-w-0 flex-1">
                <p
                  className={cx(
                    'text-base font-semibold',
                    faelligInfo(blatt.a.faellig_am, t).ueberfaellig ? 'text-danger' : 'text-ink',
                  )}
                >
                  {faelligInfo(blatt.a.faellig_am, t).text}
                </p>
                <p className="t-sub">{t('lager.von_wem', { name: blatt.wer })}</p>
              </div>
              <p className="shrink-0 text-3xl font-black tabular-nums" dir="ltr">
                {mengeText(blatt.a.menge)} <span className="text-base font-bold text-muted">{blatt.einheit}</span>
              </p>
            </div>
            <Button size="lg" full loading={busyId === blatt.a.id} onClick={() => void zurueck(blatt.a)}>
              <Check size={20} /> {t('lager.zurueckgebracht')}
            </Button>
            <Button variant="outline" full onClick={() => kalender([termin(blatt)], 'rueckgabe.ics')}>
              <CalendarPlus size={18} /> {t('lager.in_kalender')}
            </Button>
            {fehler ? <ErrorBox error={fehler} /> : null}
          </div>
        </Modal>
      ) : null}
    </>
  )
}
