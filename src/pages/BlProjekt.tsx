import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronRight, Pencil, Plus, Trash2, Warehouse } from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import { Button, Empty, ErrorBox, Field, IconButton, Input, Loading, Modal, useToast } from '../components/ui'
import { blProjektLoeschen, blProjektUmbenennen, istAdmin, lagerAnlegen, listBlProjekte, listLagerImBl } from '../lib/api'
import { useSprache } from '../lib/i18n'
import { useAsync } from '../lib/util'

type Dialog = null | 'lager' | 'umbenennen' | 'loeschen'

/* Ein Bundeslandprojekt (E104): seine Lager als grosse Karten. Nur ein Admin
 * legt Lager an, benennt um und loescht (nur ein leeres, die Datenbank
 * prueft es selbst und ihr Satz wird gezeigt). */
export default function BlProjekt() {
  const { blId = '' } = useParams()
  const { t, tn } = useSprache()
  const nav = useNavigate()
  const toast = useToast()
  const bl = useAsync(listBlProjekte, [])
  const lager = useAsync(() => listLagerImBl(blId), [blId])
  const admin = useAsync(istAdmin, [])
  const darf = admin.data === true

  const [dialog, setDialog] = useState<Dialog>(null)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const aktuell = (bl.data ?? []).find((b) => b.id === blId) ?? null
  const liste = lager.data ?? []

  /** Jeder Dialog startet mit frischem Zustand, nie mit dem Rest des letzten. */
  function oeffnen(d: Dialog) {
    setFormError(null)
    setName(d === 'umbenennen' ? (aktuell?.name ?? '') : '')
    setDialog(d)
  }

  /** Eine Aktion mit Ladezustand; ein Fehler bleibt im Dialog sichtbar. */
  async function ausfuehren(tun: () => Promise<void>) {
    setFormError(null)
    setBusy(true)
    try {
      await tun()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const lagerAnlegenAbsenden = (e: FormEvent) => {
    e.preventDefault()
    void ausfuehren(async () => {
      const p = await lagerAnlegen(blId, name.trim())
      toast(t('struktur.lager_angelegt'), 'ok')
      setDialog(null)
      nav(`/app/p/${p.id}`)
    })
  }

  const umbenennenAbsenden = (e: FormEvent) => {
    e.preventDefault()
    void ausfuehren(async () => {
      await blProjektUmbenennen(blId, name.trim())
      toast(t('struktur.bl_umbenannt'), 'ok')
      setDialog(null)
      bl.reload()
    })
  }

  const loeschenAbsenden = () =>
    void ausfuehren(async () => {
      await blProjektLoeschen(blId)
      toast(t('struktur.bl_geloescht'), 'ok')
      setDialog(null)
      nav('/app', { replace: true })
    })

  const laden = bl.loading || lager.loading
  const fehler = bl.error ?? lager.error

  return (
    <div className="min-h-screen bg-paper">
      <AppHeader
        title={aktuell?.name ?? t('zustand.laedt')}
        back="/app"
        actions={
          darf && aktuell ? (
            <>
              <IconButton label={t('struktur.umbenennen')} onClick={() => oeffnen('umbenennen')}>
                <Pencil size={18} />
              </IconButton>
              {!laden && liste.length === 0 ? (
                <IconButton label={t('aktion.loeschen')} tone="danger" onClick={() => oeffnen('loeschen')}>
                  <Trash2 size={18} />
                </IconButton>
              ) : null}
            </>
          ) : undefined
        }
      />

      <Page>
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
        ) : !aktuell ? (
          <Empty icon={<Warehouse size={30} />} title={t('struktur.bl_fehlt')} />
        ) : (
          <>
            {darf ? (
              <div className="mb-5">
                <Button size="lg" full className="sm:w-auto" onClick={() => oeffnen('lager')}>
                  <Plus size={20} /> {t('struktur.lager_neu')}
                </Button>
              </div>
            ) : null}
            {liste.length === 0 ? (
              <Empty icon={<Warehouse size={30} />} title={t(darf ? 'struktur.lager_leer' : 'struktur.kein_zugang')} />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {liste.map((p) => (
                  <Link
                    key={p.id}
                    to={`/app/p/${p.id}`}
                    className="flex min-h-28 items-center gap-3 rounded-karte border border-line bg-surface p-5 shadow-karte transition hover:border-ink/25 active:scale-[0.99]"
                  >
                    <Warehouse size={28} className="shrink-0 text-muted" />
                    <span className="min-w-0 flex-1">
                      <span className="t-name-lg block break-words">{p.name}</span>
                      {p.note ? <span className="t-sub mt-1 block break-words">{p.note}</span> : null}
                    </span>
                    <ChevronRight size={22} className="spiegeln shrink-0 text-muted" />
                  </Link>
                ))}
              </div>
            )}
            <p className="t-sub mt-4">{tn('struktur.lager_anzahl', liste.length)}</p>
          </>
        )}
        <div className="h-6" />
      </Page>

      <Modal
        open={dialog === 'lager'}
        onClose={() => setDialog(null)}
        title={t('struktur.lager_neu')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialog(null)}>
              {t('aktion.abbrechen')}
            </Button>
            <Button form="neues-lager" type="submit" loading={busy}>
              {t('aktion.anlegen')}
            </Button>
          </>
        }
      >
        <form id="neues-lager" onSubmit={lagerAnlegenAbsenden} className="space-y-4">
          <Field label={t('begriff.name')} required>
            <Input
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('struktur.lager_name_platzhalter')}
            />
          </Field>
          {formError ? <ErrorBox error={formError} /> : null}
        </form>
      </Modal>

      <Modal
        open={dialog === 'umbenennen'}
        onClose={() => setDialog(null)}
        title={t('struktur.umbenennen')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialog(null)}>
              {t('aktion.abbrechen')}
            </Button>
            <Button form="bl-umbenennen" type="submit" loading={busy}>
              {t('aktion.speichern')}
            </Button>
          </>
        }
      >
        <form id="bl-umbenennen" onSubmit={umbenennenAbsenden} className="space-y-4">
          <Field label={t('begriff.name')} required>
            <Input required autoFocus value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          {formError ? <ErrorBox error={formError} /> : null}
        </form>
      </Modal>

      <Modal
        open={dialog === 'loeschen'}
        onClose={() => setDialog(null)}
        title={t('aktion.loeschen')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialog(null)}>
              {t('aktion.abbrechen')}
            </Button>
            <Button variant="danger" loading={busy} onClick={loeschenAbsenden}>
              {t('aktion.loeschen')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-base">{t('struktur.bl_loeschen_frage', { name: aktuell?.name ?? '' })}</p>
          {formError ? <ErrorBox error={formError} /> : null}
        </div>
      </Modal>
    </div>
  )
}
