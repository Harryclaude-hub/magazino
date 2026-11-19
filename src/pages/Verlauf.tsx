import { useMemo, useState, type ReactNode } from 'react'
import { HandHelping, LogIn, LogOut, PackageMinus, PackagePlus, Pencil, ShieldCheck, Trash2, Undo2, Circle } from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import { Chip, Empty, ErrorBox, Loading } from '../components/ui'
import { useProject } from './ProjectLayout'
import { listVerlauf, listZugang } from '../lib/api'
import { displayNameOf } from '../lib/auth'
import { useSprache } from '../lib/i18n'
import { useAsync } from '../lib/util'

/* Der Verlauf (E104): wer kam, ging, nahm, brachte. Jedes Mitglied sieht ihn.
 * Nur lesen: kein Posten, kein Antworten. Der Satz kommt fertig aus der
 * Datenbank und wird unveraendert gezeigt. */

type Filter = 'alle' | 'ein_aus' | 'entnommen' | 'ausgeliehen'

const FILTER_ARTEN: Record<Filter, string[] | null> = {
  alle: null,
  ein_aus: ['betreten', 'verlassen'],
  entnommen: ['entnahme'],
  ausgeliehen: ['ausleihe', 'rueckgabe'],
}

const BEKANNT = ['betreten', 'verlassen', 'entnahme', 'zugang', 'ausleihe', 'rueckgabe', 'korrektur', 'entfernt', 'admin']

const SYMBOL: Record<string, ReactNode> = {
  betreten: <LogIn size={18} />,
  verlassen: <LogOut size={18} />,
  entnahme: <PackageMinus size={18} />,
  zugang: <PackagePlus size={18} />,
  ausleihe: <HandHelping size={18} />,
  rueckgabe: <Undo2 size={18} />,
  korrektur: <Pencil size={18} />,
  entfernt: <Trash2 size={18} />,
  admin: <ShieldCheck size={18} />,
}

/** "vor 5 Minuten" in der Sprache der Oberflaeche; ab einer Woche das Datum. */
function relativ(iso: string, lang: string): string {
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return ''
  const ort = lang === 'ar' ? 'ar' : 'de-DE'
  try {
    const rtf = new Intl.RelativeTimeFormat(lang === 'ar' ? 'ar' : 'de', { numeric: 'auto' })
    const s = Math.round((ms - Date.now()) / 1000)
    const a = Math.abs(s)
    if (a < 45) return rtf.format(0, 'second')
    if (a < 3600) return rtf.format(Math.round(s / 60), 'minute')
    if (a < 86400) return rtf.format(Math.round(s / 3600), 'hour')
    if (a < 7 * 86400) return rtf.format(Math.round(s / 86400), 'day')
    return new Date(ms).toLocaleDateString(ort, { dateStyle: 'medium' })
  } catch {
    /* ohne Intl.RelativeTimeFormat bleibt das Datum */
    return iso.slice(0, 10)
  }
}

function genau(iso: string, lang: string): string {
  try {
    return new Date(iso).toLocaleString(lang === 'ar' ? 'ar' : 'de-DE', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return iso
  }
}

export default function Verlauf() {
  const { project, members } = useProject()
  const { t, lang } = useSprache()
  const pid = project.id
  const [filter, setFilter] = useState<Filter>('alle')

  const verlauf = useAsync(() => listVerlauf(pid, 150), [pid])
  const drin = useAsync(() => listZugang(pid, true, 200), [pid])

  const nameVon = (id: string | null) =>
    id ? displayNameOf(members.find((m) => m.user_id === id)?.profile, t('umzuege.jemand')) : ''

  const sichtbar = useMemo(() => {
    const arten = FILTER_ARTEN[filter]
    const alle = verlauf.data ?? []
    return arten ? alle.filter((z) => arten.includes(z.art)) : alle
  }, [verlauf.data, filter])

  const chips: { id: Filter; label: string }[] = [
    { id: 'alle', label: t('aktion.alle') },
    { id: 'ein_aus', label: t('struktur.filter_ein_aus') },
    { id: 'entnommen', label: t('struktur.filter_entnommen') },
    { id: 'ausgeliehen', label: t('struktur.filter_ausgeliehen') },
  ]

  return (
    <>
      <AppHeader title={t('struktur.verlauf')} subtitle={project.name} back={`/app/p/${pid}`} />
      <Page>
        <div className="mx-auto max-w-2xl space-y-5">
          {/* Gerade drin */}
          <section aria-label={t('struktur.gerade_drin')}>
            <h2 className="t-sub mb-2 font-bold uppercase tracking-wide">{t('struktur.gerade_drin')}</h2>
            {drin.error ? (
              <ErrorBox error={drin.error} onRetry={drin.reload} />
            ) : drin.data === null ? (
              <p className="t-sub">{t('zustand.laedt')}</p>
            ) : drin.data.length === 0 ? (
              <p className="t-sub">{t('struktur.niemand_drin')}</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {drin.data.map((z) => (
                  <li
                    key={z.id}
                    className="inline-flex min-h-10 items-center gap-2 rounded-full border-2 border-line bg-surface px-3.5 text-[0.9375rem] font-bold"
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-ok" aria-hidden="true" />
                    {nameVon(z.user_id)}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Filter */}
          <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label={t('aktion.filter')}>
            {chips.map((c) => (
              <Chip key={c.id} active={filter === c.id} onClick={() => setFilter(c.id)}>
                {c.label}
              </Chip>
            ))}
          </div>

          {/* Liste: laedt, Fehler und leer sind drei Zustaende */}
          {verlauf.loading && !verlauf.data ? (
            <Loading label={t('struktur.verlauf_laedt')} />
          ) : verlauf.error ? (
            <ErrorBox error={verlauf.error} onRetry={verlauf.reload} />
          ) : sichtbar.length === 0 ? (
            <Empty
              icon={<Circle size={30} />}
              zeichnung="keine"
              title={t(filter === 'alle' ? 'struktur.verlauf_leer' : 'struktur.verlauf_leer_filter')}
            />
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-karte border border-line bg-surface">
              {sichtbar.map((z) => {
                const art = BEKANNT.includes(z.art) ? z.art : 'sonst'
                const wer = nameVon(z.user_id)
                return (
                  <li key={z.id} className="flex items-start gap-3 px-4 py-3">
                    <span
                      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-raised text-muted"
                      title={t(`struktur.art.${art}`)}
                    >
                      {SYMBOL[art] ?? <Circle size={18} />}
                      <span className="sr-only">{t(`struktur.art.${art}`)}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      {wer ? <span className="t-name block truncate">{wer}</span> : null}
                      <span className="block break-words text-base text-ink/85">{z.text}</span>
                    </span>
                    <time dateTime={z.zeit} title={genau(z.zeit, lang)} className="shrink-0 text-sm text-muted">
                      {relativ(z.zeit, lang)}
                    </time>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <div className="h-6" />
      </Page>
    </>
  )
}
