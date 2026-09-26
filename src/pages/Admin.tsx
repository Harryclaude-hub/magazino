import { useMemo, useState } from 'react'
import { Search, ShieldCheck, Users } from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import { Badge, Card, Empty, ErrorBox, Input, Loading } from '../components/ui'
import { ladeAdminUebersicht } from '../lib/api'
import { useSprache } from '../lib/i18n'
import type { AdminNutzer, AdminUmzug } from '../lib/types'
import { useAsync } from '../lib/util'

/* Admin-Portal (0035): alle Nutzer und ihre Umzuege, nur zum Ansehen.
 * Wer kein Admin ist, bekommt von der Datenbank eine Ablehnung, die hier
 * als Fehler steht; der Menuepunkt erscheint ohnehin nur fuer Admins. */

function datum(iso: string | null, lang: string): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar' : 'de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return iso.slice(0, 10)
  }
}

function Zahl({ wert, wort }: { wert: number; wort: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-3 py-2.5 text-center">
      <div className="t-serial text-2xl font-black">{wert}</div>
      <div className="t-sub mt-0.5">{wort}</div>
    </div>
  )
}

function UmzugZeile({ u }: { u: AdminUmzug }) {
  const { t, lang } = useSprache()
  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="t-name min-w-0 break-words">{u.name}</span>
        <Badge>{u.eigentuemer ? t('admin.eigentuemer') : t(`admin.rolle_${u.rolle}`)}</Badge>
        {u.archiviert ? <Badge>{t('admin.archiviert')}</Badge> : null}
        {u.umzugstag ? <span className="t-sub">{t('admin.umzugstag', { datum: datum(u.umzugstag, lang) })}</span> : null}
      </div>
      <p className="t-sub mt-1">
        {t('admin.zahlen', {
          kisten: u.kisten,
          angekommen: u.angekommen,
          grundrisse: u.grundrisse,
          raeume: u.raeume,
          mitglieder: u.mitglieder,
        })}
      </p>
    </li>
  )
}

function NutzerKarte({ n }: { n: AdminNutzer }) {
  const { t, lang } = useSprache()
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start gap-3 border-b border-line p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="t-name break-words">{n.name?.trim() || t('admin.ohne_name')}</h2>
            {n.admin ? (
              <Badge>
                <ShieldCheck size={14} /> {t('admin.ist_admin')}
              </Badge>
            ) : null}
          </div>
          {n.email ? (
            <p className="t-sub mt-0.5 break-all" dir="ltr">
              {n.email}
            </p>
          ) : null}
        </div>
        <div className="t-sub text-end">
          <div>{t('admin.seit', { datum: datum(n.erstellt, lang) })}</div>
          <div>{n.zuletzt ? t('admin.zuletzt', { datum: datum(n.zuletzt, lang) }) : t('admin.nie')}</div>
        </div>
      </div>
      {n.umzuege.length === 0 ? (
        <p className="t-sub px-4 py-3">{t('admin.keine_umzuege')}</p>
      ) : (
        <ul className="zebra divide-y divide-line">
          {n.umzuege.map((u) => (
            <UmzugZeile key={u.id} u={u} />
          ))}
        </ul>
      )}
    </Card>
  )
}

export default function Admin() {
  const { t } = useSprache()
  const daten = useAsync(() => ladeAdminUebersicht(), [])
  const [q, setQ] = useState('')

  const liste = useMemo(() => {
    const alle = daten.data?.nutzer ?? []
    const s = q.trim().toLowerCase()
    if (!s) return alle
    return alle.filter(
      (n) =>
        (n.name ?? '').toLowerCase().includes(s) ||
        (n.email ?? '').toLowerCase().includes(s) ||
        n.umzuege.some((u) => u.name.toLowerCase().includes(s)),
    )
  }, [daten.data, q])

  return (
    <>
      <AppHeader title={t('admin.titel')} subtitle={t('admin.untertitel')} back="/app" />
      <Page>
        {daten.loading ? (
          <Loading label={t('admin.laedt')} />
        ) : daten.error ? (
          <ErrorBox error={daten.error} onRetry={daten.reload} />
        ) : daten.data ? (
          <>
            <div data-tour="admin-zahlen" className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Zahl wert={daten.data.nutzer.length} wort={t('admin.nutzer')} />
              <Zahl wert={daten.data.umzuege} wort={t('admin.umzuege')} />
              <Zahl wert={daten.data.kisten} wort={t('admin.kisten')} />
              <Zahl wert={daten.data.grundrisse} wort={t('admin.grundrisse')} />
            </div>
            <p className="t-sub mb-4">{t('admin.hinweis')}</p>
            <div className="relative mb-4">
              <Search size={18} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
              <Input
                data-tour="admin-suche"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('admin.suchen')}
                aria-label={t('admin.suchen')}
                className="ps-10"
              />
            </div>
            {daten.data.nutzer.length === 0 ? (
              <Empty icon={<Users size={30} />} title={t('admin.leer')} />
            ) : liste.length === 0 ? (
              <Empty icon={<Search size={30} />} title={t('admin.keine_treffer')} />
            ) : (
              <div className="space-y-4">
                {liste.map((n) => (
                  <NutzerKarte key={n.id} n={n} />
                ))}
              </div>
            )}
          </>
        ) : null}
      </Page>
    </>
  )
}
