import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Building2, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import SiedlungEinrichten, { geschossName } from '../components/SiedlungEinrichten'
import { Button, Card, ConfirmDialog, Empty, ErrorBox, IconButton, Skelett, useToast } from '../components/ui'
import { listSiedlungen, loescheSiedlung } from '../lib/api'
import { useSprache } from '../lib/i18n'
import { siedlungWoerter } from '../lib/i18n/bausteine/siedlung'
import { woerterNachladen } from '../lib/i18n/woerter'
import type { Siedlung } from '../lib/types'
import { useAsync } from '../lib/util'

// Die Saetze der Siedlung kommen erst mit dieser Seite (siehe siedlung.ts).
woerterNachladen(siedlungWoerter)

/* Die Siedlungen (E83): eigener Bereich neben den Umzuegen, erreichbar
 * ueber den Knopf oben rechts. Liste, Anlegen, Bearbeiten, Loeschen.
 * Laden, Fehler und leer sind drei Zustaende; leer erklaert, was eine
 * Siedlung ist. Die 3D-Ansicht ist eine eigene Seite (SiedlungAnsicht). */

export default function Siedlungen() {
  const { t } = useSprache()
  const nav = useNavigate()
  const toast = useToast()
  const liste = useAsync(listSiedlungen, [])
  // Einrichten: jedes Oeffnen haengt den Dialog neu ein (nr), er beginnt frisch.
  const [einrichten, setEinrichten] = useState<{ nr: number; vorher: Siedlung | null } | null>(null)
  const [loeschen, setLoeschen] = useState<Siedlung | null>(null)

  const oeffnen = (vorher: Siedlung | null) => setEinrichten((alt) => ({ nr: (alt?.nr ?? 0) + 1, vorher }))
  const daten = liste.data ?? []

  return (
    <div className="min-h-screen bg-paper">
      <AppHeader title={t('siedlung.titel')} back="/app" />
      <Page>
        <div className="mb-5">
          <h1 className="text-2xl font-black tracking-tight">{t('siedlung.titel')}</h1>
          <p className="t-sub mt-1 max-w-2xl">{t('siedlung.intro')}</p>
          {!liste.loading && !liste.error && daten.length > 0 ? (
            <Button size="lg" full className="mt-4 sm:w-auto" onClick={() => oeffnen(null)}>
              <Plus size={20} /> {t('siedlung.anlegen')}
            </Button>
          ) : null}
        </div>

        {liste.loading ? (
          <Skelett label={t('siedlung.laedt')} anzahl={2} />
        ) : liste.error ? (
          <ErrorBox error={liste.error} onRetry={liste.reload} />
        ) : daten.length === 0 ? (
          <Empty
            zeichnung="keine"
            icon={<Building2 size={34} />}
            title={t('siedlung.leer_titel')}
            hint={t('siedlung.leer_hinweis')}
            action={
              <Button size="lg" onClick={() => oeffnen(null)}>
                <Plus size={20} /> {t('siedlung.anlegen')}
              </Button>
            }
          />
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {daten.map((s) => {
              const haus = s.wohnung ? s.gebaeude.find((g) => g.id === s.wohnung?.gebaeudeId) : undefined
              return (
                <li key={s.id}>
                  <Card className="flex items-stretch gap-2 p-2">
                    <Link
                      to={`/app/siedlung/${s.id}`}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-knopf p-2 transition hover:bg-raised"
                    >
                      <Building2 size={26} className="shrink-0 text-muted" />
                      <span className="min-w-0 flex-1">
                        <span className="t-name block break-words">{s.name}</span>
                        <span className="t-sub block">{t('siedlung.haeuser_zahl', { n: s.gebaeude.length })}</span>
                        <span className="t-sub block">
                          {s.wohnung && haus
                            ? t('siedlung.wohnung_in', { haus: haus.name, stock: geschossName(t, s.wohnung.geschoss) })
                            : t('siedlung.ohne_wohnung')}
                        </span>
                      </span>
                      <span className="sr-only">{t('siedlung.ansehen')}</span>
                      <ChevronRight size={20} className="spiegeln shrink-0 text-muted" />
                    </Link>
                    <div className="flex shrink-0 flex-col justify-center gap-1.5">
                      <IconButton size="sm" label={t('aktion.bearbeiten')} onClick={() => oeffnen(s)}>
                        <Pencil size={17} />
                      </IconButton>
                      <IconButton size="sm" tone="danger" label={t('aktion.loeschen')} onClick={() => setLoeschen(s)}>
                        <Trash2 size={17} />
                      </IconButton>
                    </div>
                  </Card>
                </li>
              )
            })}
          </ul>
        )}
      </Page>

      {einrichten ? (
        <SiedlungEinrichten
          key={einrichten.nr}
          vorher={einrichten.vorher}
          onClose={() => setEinrichten(null)}
          onGespeichert={(s) => {
            const neu = !einrichten.vorher
            setEinrichten(null)
            if (neu) nav(`/app/siedlung/${s.id}`)
            else liste.reload()
          }}
        />
      ) : null}

      <ConfirmDialog
        open={loeschen !== null}
        title={t('siedlung.loeschen_titel')}
        body={t('siedlung.loeschen_text', { name: loeschen?.name ?? '' })}
        onClose={() => setLoeschen(null)}
        onConfirm={async () => {
          if (!loeschen) return
          try {
            await loescheSiedlung(loeschen.id)
            toast(t('siedlung.geloescht'), 'ok')
            liste.reload()
          } catch (err) {
            // Der Dialog schliesst trotzdem; der Fehler steht als rote Meldung da.
            toast(err instanceof Error ? err.message : String(err), 'error')
          }
        }}
      />
    </div>
  )
}
