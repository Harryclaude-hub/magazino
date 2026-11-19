import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ChevronRight, Landmark, Plus } from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import { InstallCard } from '../components/InstallCard'
import { Button, Empty, ErrorBox, Field, Input, Loading, Modal, Wordmark, useToast } from '../components/ui'
import { blProjektAnlegen, istAdmin, listBlProjekte, listProjects } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useSprache } from '../lib/i18n'
import { useAsync } from '../lib/util'

/* Startseite (E104): die Bundeslandprojekte als grosse, einfache Karten.
 * Gibt es insgesamt nur ein Lager, geht es direkt dorthin. */
export default function Dashboard() {
  const { profile } = useAuth()
  const { t, tn } = useSprache()
  const nav = useNavigate()
  const toast = useToast()
  const bl = useAsync(listBlProjekte, [])
  const lager = useAsync(listProjects, [])
  const admin = useAsync(istAdmin, [])
  const darfAnlegen = admin.data === true

  const [neuOffen, setNeuOffen] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  /** Der Dialog startet immer leer und ohne alten Fehler. */
  function neuOeffnen(v: boolean) {
    setFormError(null)
    if (v) setName('')
    setNeuOffen(v)
  }

  async function anlegen(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    setBusy(true)
    try {
      const b = await blProjektAnlegen(name.trim())
      toast(t('struktur.bl_angelegt'), 'ok')
      setNeuOffen(false)
      nav(`/app/bl/${b.id}`)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const laden = bl.loading || lager.loading
  const fehler = bl.error ?? lager.error
  const projekte = lager.data ?? []
  const liste = bl.data ?? []

  // Genau ein Lager: ohne Umweg hin. Admins behalten die Uebersicht, sie legen Neues an.
  if (!laden && !fehler && projekte.length === 1 && !darfAnlegen && admin.data !== null) {
    return <Navigate to={`/app/p/${projekte[0].project.id}`} replace />
  }

  return (
    <div className="min-h-screen bg-paper">
      <AppHeader title={<Wordmark size={24} />} />

      <Page>
        <h1 className="mb-4 text-2xl font-black tracking-tight">
          {profile?.display_name ? t('umzuege.hallo_name', { name: profile.display_name }) : t('umzuege.hallo')}
        </h1>

        {darfAnlegen ? (
          <div className="mb-5">
            <Button data-tour="umzuege-neu" size="lg" full className="sm:w-auto" onClick={() => neuOeffnen(true)}>
              <Plus size={20} /> {t('struktur.bl_neu')}
            </Button>
          </div>
        ) : null}
        {admin.error ? (
          <p className="t-sub mb-3 text-danger">{t('lager.admin_pruefen_fehler', { grund: admin.error })}</p>
        ) : null}

        <div className="mb-5">
          <InstallCard compact />
        </div>

        {laden ? (
          <Loading label={t('zustand.laedt')} />
        ) : fehler ? (
          <ErrorBox
            error={fehler}
            onRetry={() => {
              bl.reload()
              lager.reload()
            }}
          />
        ) : liste.length === 0 ? (
          darfAnlegen ? (
            <Empty icon={<Landmark size={30} />} title={t('struktur.bl_leer')} />
          ) : (
            <Empty icon={<Landmark size={30} />} title={t('struktur.kein_zugang')} />
          )
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {liste.map((b) => {
              const n = projekte.filter((p) => p.project.bl_projekt_id === b.id).length
              return (
                <Link
                  key={b.id}
                  data-tour="umzuege-karte"
                  to={`/app/bl/${b.id}`}
                  className="flex min-h-28 items-center gap-3 rounded-karte border border-line bg-surface p-5 shadow-karte transition hover:border-ink/25 active:scale-[0.99]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="t-name-lg block break-words">{b.name}</span>
                    <span className="t-sub mt-1 block">{tn('struktur.lager_anzahl', n)}</span>
                  </span>
                  <ChevronRight size={22} className="spiegeln shrink-0 text-muted" />
                </Link>
              )
            })}
          </div>
        )}

        <div className="h-6" />
      </Page>

      <Modal
        open={neuOffen}
        onClose={() => neuOeffnen(false)}
        title={t('struktur.bl_neu')}
        footer={
          <>
            <Button variant="ghost" onClick={() => neuOeffnen(false)}>
              {t('aktion.abbrechen')}
            </Button>
            <Button form="neues-bl" type="submit" loading={busy}>
              {t('aktion.anlegen')}
            </Button>
          </>
        }
      >
        <form id="neues-bl" onSubmit={anlegen} className="space-y-4">
          <Field label={t('begriff.name')} required>
            <Input
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('struktur.bl_name_platzhalter')}
            />
          </Field>
          {formError ? <ErrorBox error={formError} /> : null}
        </form>
      </Modal>
    </div>
  )
}
