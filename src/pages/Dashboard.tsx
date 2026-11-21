import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, Landmark, Package, Plus, ScanLine, Warehouse } from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import { InstallCard } from '../components/InstallCard'
import { LagerStatus } from '../components/LagerStatus'
import { StartSuche } from '../components/StartSuche'
import { Button, Empty, ErrorBox, Field, Input, Loading, Modal, SectionTitle, useToast } from '../components/ui'
import { blProjektAnlegen, istAdmin, listBlProjekte, listProjects } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useSprache } from '../lib/i18n'
import { useAsync } from '../lib/util'

const KARTE =
  'flex min-h-16 items-center gap-3 rounded-karte border border-line bg-surface p-4 shadow-karte transition hover:border-ink/25 active:scale-[0.99]'
/** Kleiner Schnellzugriff neben der Suche, nur am Computer. */
const SCHNELL =
  'knopf inline-flex min-h-10 items-center gap-2 rounded-knopf bg-feld px-4 text-[0.9375rem] font-semibold text-ink hover:brightness-[0.96]'

/* Startbildschirm (E105, E109): ganz oben "Im Lager" (eintragen und gehen),
 * darunter die Suche (tolerant bei Tippfehlern, optional mit Bereichsfilter,
 * Treffer zum Mitnehmen), dann die Bundeslandprojekte als Karten. Scannen,
 * Bestand, Unterwegs, Kisten, Grundriss und Verlauf stehen nicht als grosse
 * Knoepfe da, sondern in der unteren Leiste und im Menue; am Computer gibt es
 * Scannen und Bestand als kleine Schnellzugriffe neben der Suche. Ist man nur
 * in einem Bundeslandprojekt, stehen gleich dessen Lager da. */
export default function Dashboard() {
  const { profile } = useAuth()
  const { t, tn } = useSprache()
  const nav = useNavigate()
  const toast = useToast()
  const bl = useAsync(listBlProjekte, [])
  const lager = useAsync(listProjects, [])
  const admin = useAsync(istAdmin, [])
  const darfAnlegen = admin.data === true

  const [bestandWahl, setBestandWahl] = useState(false)
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
  // Nur ein Bundeslandprojekt: gleich seine Lager zeigen.
  const einziges = liste.length === 1 ? liste[0] : null
  const lagerDesBl = einziges ? projekte.filter((p) => p.project.bl_projekt_id === einziges.id) : []

  return (
    <div className="min-h-screen bg-paper">
      {/* Nur ein Logo: das in der Kopfzeile (fuehrt zum Start). */}
      <AppHeader title={null} />

      <Page>
        {!laden && !fehler && projekte.length > 0 ? (
          <LagerStatus projekte={projekte.map((p) => p.project)} name={profile?.display_name} />
        ) : (
          <h1 className="mb-4 text-2xl font-black tracking-tight">
            {profile?.display_name ? t('umzuege.hallo_name', { name: profile.display_name }) : t('umzuege.hallo')}
          </h1>
        )}

        <StartSuche
          projekte={laden || fehler ? null : projekte.map((p) => p.project)}
          knoepfe={
            <div className="mb-5 hidden items-center gap-2 lg:flex">
              <Link data-tour="start-scannen" to="/app/scan" className={SCHNELL}>
                <ScanLine size={18} /> {t('nav.scannen')}
              </Link>
              {projekte.length === 1 ? (
                <Link to={`/app/p/${projekte[0].project.id}/bestand`} className={SCHNELL}>
                  <Package size={18} /> {t('lager.nav_bestand')}
                </Link>
              ) : (
                <button
                  type="button"
                  disabled={projekte.length === 0}
                  onClick={() => setBestandWahl(true)}
                  className={`${SCHNELL} disabled:opacity-45`}
                >
                  <Package size={18} /> {t('lager.nav_bestand')}
                </button>
              )}
            </div>
          }
        >
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
            <Empty
              icon={<Landmark size={30} />}
              title={darfAnlegen ? t('struktur.bl_leer') : t('struktur.kein_zugang')}
            />
          ) : einziges ? (
            <>
              <SectionTitle
                action={
                  darfAnlegen ? (
                    <Link to={`/app/bl/${einziges.id}`} className="t-sub font-bold underline">
                      {t('lager.start_verwalten')}
                    </Link>
                  ) : null
                }
              >
                {einziges.name}
              </SectionTitle>
              {lagerDesBl.length === 0 ? (
                <Empty icon={<Warehouse size={30} />} title={t(darfAnlegen ? 'struktur.lager_leer' : 'struktur.kein_zugang')} />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {lagerDesBl.map((p) => (
                    <Link
                      key={p.project.id}
                      data-tour="umzuege-karte"
                      to={`/app/p/${p.project.id}`}
                      className={KARTE}
                    >
                      <Warehouse size={28} className="shrink-0 text-muted" />
                      <span className="min-w-0 flex-1">
                        <span className="t-name-lg block break-words">{p.project.name}</span>
                        {p.project.note ? (
                          <span className="t-sub mt-1 block break-words">{p.project.note}</span>
                        ) : null}
                      </span>
                      <ChevronRight size={22} className="spiegeln shrink-0 text-muted" />
                    </Link>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {liste.map((b) => {
                const n = projekte.filter((p) => p.project.bl_projekt_id === b.id).length
                return (
                  <Link key={b.id} data-tour="umzuege-karte" to={`/app/bl/${b.id}`} className={KARTE}>
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
        </StartSuche>

        <div className="mt-6">
          <InstallCard compact />
        </div>

        {darfAnlegen ? (
          <div className="mt-5">
            <Button data-tour="umzuege-neu" size="lg" full className="sm:w-auto" onClick={() => neuOeffnen(true)}>
              <Plus size={20} /> {t('struktur.bl_neu')}
            </Button>
          </div>
        ) : null}
        {admin.error ? (
          <p className="t-sub mt-3 text-danger">{t('lager.admin_pruefen_fehler', { grund: admin.error })}</p>
        ) : null}

        <div className="h-6" />
      </Page>

      <Modal open={bestandWahl} onClose={() => setBestandWahl(false)} title={t('lager.start_welches_lager')}>
        <div className="space-y-2">
          {projekte.map((p) => (
            <Link
              key={p.project.id}
              to={`/app/p/${p.project.id}/bestand`}
              className="flex min-h-14 items-center gap-3 rounded-karte border border-line bg-surface px-4 py-3 transition active:scale-[0.99]"
            >
              <Warehouse size={22} className="shrink-0 text-muted" />
              <span className="t-name min-w-0 flex-1 break-words">{p.project.name}</span>
              <ChevronRight size={20} className="spiegeln shrink-0 text-muted" />
            </Link>
          ))}
        </div>
      </Modal>

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
