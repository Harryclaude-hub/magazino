import { useMemo, useState, type ReactNode } from 'react'
import { Check, ChevronDown, ChevronRight, Copy, KeyRound, Pencil, Plus, RefreshCw, Search, ShieldCheck, ShieldX, Trash2, Undo2, Users } from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import { Badge, Button, Card, Chip, ConfirmDialog, Empty, ErrorBox, Field, Input, Loading, Modal, SectionTitle, Select, useToast } from '../components/ui'
import {
  adminAdminSetzen,
  adminAktivitaet,
  adminFreigabeSetzen,
  adminKontoAnlegen,
  adminBlMitglieder,
  adminKontoLoeschen,
  adminNutzerAktivitaet,
  blMitgliedSetzen,
  blProjektAnlegen,
  blProjektLoeschen,
  blProjektUmbenennen,
  lagerAnlegen,
  ladeAdminUebersicht,
  listBlProjekte,
  listLagerImBl,
  listProjects,
  type BlMitglied,
  type BlProjekt,
  type Freigabe,
  type ProjectWithStats,
} from '../lib/api'
import { useAuth } from '../lib/auth'
import { useSprache } from '../lib/i18n'
import { passwortGenug } from '../lib/passwort'
import type { AdminAktivitaetZeile, AdminNutzer, AdminNutzerAktivitaet, AdminUebersicht } from '../lib/types'
import { appUrl, useAsync, type AsyncState } from '../lib/util'

/* Verwaltungsportal (0035, E103, 0054): Konten anlegen, Leute und ihr Zugang
 * je Bundeslandprojekt, Projekte mit ihren Lagern, Aktivitaet. Nur Admins; die
 * Datenbank lehnt alle anderen ab, die Ablehnung steht hier als Fehler. */

type Tab = 'konto' | 'leute' | 'projekte' | 'aktivitaet'
type Rolle = 'editor' | 'viewer'
type Zugang = Rolle | 'keine'

/* ------------------------------------------------------------- Helfer */

function datum(iso: string | null, lang: string): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar' : 'de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return iso.slice(0, 10)
  }
}

/** "vor 5 Minuten", in der Sprache der Oberflaeche; ab einer Woche das Datum. */
function relativ(iso: string | null, lang: string): string {
  if (!iso) return ''
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return ''
  try {
    const rtf = new Intl.RelativeTimeFormat(lang === 'ar' ? 'ar' : 'de', { numeric: 'auto' })
    const s = Math.round((ms - Date.now()) / 1000)
    const a = Math.abs(s)
    if (a < 45) return rtf.format(0, 'second')
    if (a < 3600) return rtf.format(Math.round(s / 60), 'minute')
    if (a < 86400) return rtf.format(Math.round(s / 3600), 'hour')
    if (a < 7 * 86400) return rtf.format(Math.round(s / 86400), 'day')
  } catch {
    /* ohne Intl.RelativeTimeFormat bleibt das Datum */
  }
  return datum(iso, lang)
}

function genauZeit(iso: string, lang: string): string {
  try {
    return new Date(iso).toLocaleString(lang === 'ar' ? 'ar' : 'de-DE', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return iso
  }
}

/* Gut lesbar: ohne 0, O, 1, l, I (und ohne Buchstaben, die leicht verwechselt werden). */
const BUCHSTABEN = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz'
const ZIFFERN = '23456789'
const PW_ALPHABET = BUCHSTABEN + ZIFFERN

function zufallZeichen(alphabet: string): string {
  // Ohne Modulo-Verzerrung: Werte oberhalb des vollen Vielfachen werden verworfen.
  const grenze = 256 - (256 % alphabet.length)
  const buf = new Uint8Array(1)
  for (;;) {
    crypto.getRandomValues(buf)
    if (buf[0] < grenze) return alphabet[buf[0] % alphabet.length]
  }
}

function passwortErzeugen(laenge = 12): string {
  for (;;) {
    let p = ''
    for (let i = 0; i < laenge; i++) p += zufallZeichen(PW_ALPHABET)
    if (passwortGenug(p)) return p
  }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function Zahl({ wert, wort }: { wert: number; wort: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-3 py-2.5 text-center">
      <div className="t-serial text-2xl font-black">{wert}</div>
      <div className="t-sub mt-0.5">{wort}</div>
    </div>
  )
}

function FehlerSatz({ text }: { text: string }) {
  return (
    <p role="alert" className="rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm font-semibold text-danger">
      {text}
    </p>
  )
}

/** Laden, Fehler, leer und Daten bleiben vier getrennte Zustaende. Beim
 *  erneuten Laden bleiben die alten Daten stehen. */
function Zustand<T>({ a, leer, children }: { a: AsyncState<T>; leer?: (d: T) => boolean; children: (d: T) => ReactNode }) {
  const { t } = useSprache()
  if (a.error && !a.data) return <ErrorBox error={a.error} onRetry={a.reload} />
  if (a.loading && !a.data) return <Loading label={t('adminkonten.laedt')} />
  if (!a.data) return null
  return (
    <>
      {a.error ? <FehlerSatz text={a.error} /> : null}
      {leer?.(a.data) ? <Empty icon={<Users size={30} />} title={t('adminkonten.leer')} /> : children(a.data)}
    </>
  )
}

const STATUS_FARBE: Record<Freigabe, string> = {
  wartet: 'var(--warn)',
  frei: 'var(--ok)',
  gesperrt: 'var(--danger)',
}

function ZugangWahl({ wert, onChange, disabled, label, mitKeine }: { wert: Zugang; onChange: (z: Zugang) => void; disabled?: boolean; label: string; mitKeine?: boolean }) {
  const { t } = useSprache()
  return (
    <Select value={wert} onChange={(e) => onChange(e.target.value as Zugang)} disabled={disabled} aria-label={label} className="min-h-12 sm:w-56">
      <option value="editor">{t('adminkonten.rolle_editor')}</option>
      <option value="viewer">{t('adminkonten.rolle_viewer')}</option>
      {mitKeine ? <option value="keine">{t('adminkonten.rolle_keine')}</option> : null}
    </Select>
  )
}

/* ------------------------------------------------------------ Aktivitaet */

function AktZeile({ z, mitPerson }: { z: AdminAktivitaetZeile; mitPerson: boolean }) {
  const { t, lang } = useSprache()
  const artWort = t(`adminkonten.art_${z.art}`)
  return (
    <li className="px-4 py-3">
      <p className="min-w-0 break-words">
        <span className="font-bold">{artWort.startsWith('adminkonten.') ? z.art : artWort}</span>
        {z.text ? <span>{': '}{z.text}</span> : null}
      </p>
      <p className="t-sub mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
        {mitPerson ? (
          <span className="break-all" dir="ltr">
            {z.email ?? t('adminkonten.system')}
          </span>
        ) : null}
        {z.lager ? <span>{z.lager}</span> : null}
        <span title={genauZeit(z.zeit, lang)}>{relativ(z.zeit, lang)}</span>
      </p>
    </li>
  )
}

function AktListe({ a, mitPerson }: { a: AsyncState<AdminAktivitaetZeile[]>; mitPerson: boolean }) {
  const { t } = useSprache()
  const sortiert = useMemo(() => [...(a.data ?? [])].sort((x, y) => Date.parse(y.zeit) - Date.parse(x.zeit)), [a.data])
  if (a.error && !a.data) return <ErrorBox error={a.error} onRetry={a.reload} />
  if (a.loading && !a.data) return <Loading label={t('adminkonten.laedt')} />
  if (!a.data) return null
  return (
    <>
      {a.error ? <FehlerSatz text={a.error} /> : null}
      {sortiert.length === 0 ? (
        <Empty icon={<RefreshCw size={30} />} title={t('adminkonten.akt_leer')} />
      ) : (
        <Card className="overflow-hidden">
          <ul className="zebra divide-y divide-line">
            {sortiert.map((z, i) => (
              <AktZeile key={`${z.zeit}-${i}`} z={z} mitPerson={mitPerson} />
            ))}
          </ul>
        </Card>
      )}
    </>
  )
}

function AktivitaetTab({ leute }: { leute: AsyncState<AdminNutzerAktivitaet[]> }) {
  const { t } = useSprache()
  const [person, setPerson] = useState('')
  const akt = useAsync(() => adminAktivitaet(100, person || undefined), [person])
  return (
    <section>
      <SectionTitle
        action={
          <Button size="sm" variant="outline" loading={akt.loading && !!akt.data} onClick={akt.reload}>
            <RefreshCw size={16} /> {t('adminkonten.aktualisieren')}
          </Button>
        }
      >
        {t('adminkonten.akt_titel')}
      </SectionTitle>
      <div className="mb-4">
        <Field label={t('adminkonten.akt_person')}>
          <Select value={person} onChange={(e) => setPerson(e.target.value)}>
            <option value="">{t('adminkonten.akt_alle')}</option>
            {(leute.data ?? []).map((n) => (
              <option key={n.user_id} value={n.user_id}>
                {n.name?.trim() ? `${n.name.trim()} (${n.email})` : n.email}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <AktListe a={akt} mitPerson={!person} />
    </section>
  )
}

/* ----------------------------------------------------------- Neues Konto */

interface Erfolg {
  email: string
  name: string
  passwort: string
  /** Konto steht, nur die Zuteilung fehlt. */
  halb: boolean
  grund: string
}

function ErfolgZeile({ label, wert }: { label: string; wert: string }) {
  return (
    <div className="rounded-xl border border-line bg-raised px-3 py-2.5">
      <div className="t-sub">{label}</div>
      <div className="mt-0.5 select-all break-all font-mono text-base font-bold" dir="ltr">
        {wert}
      </div>
    </div>
  )
}

function ErfolgDialog({ e, onClose }: { e: Erfolg; onClose: () => void }) {
  const { t } = useSprache()
  const toast = useToast()
  const [kopiert, setKopiert] = useState(false)
  const adresse = appUrl('')
  async function kopieren() {
    const text = t('adminkonten.kopier_text', { name: e.name || e.email, email: e.email, passwort: e.passwort, adresse })
    try {
      await navigator.clipboard.writeText(text)
      setKopiert(true)
      toast(t('adminkonten.kopiert'), 'ok')
    } catch {
      toast(t('adminkonten.kopieren_fehler'), 'error')
    }
  }
  return (
    <Modal
      open
      onClose={onClose}
      title={t(e.halb ? 'adminkonten.halb_titel' : 'adminkonten.erfolg_titel')}
      footer={
        <>
          <Button variant="outline" onClick={() => void kopieren()}>
            {kopiert ? <Check size={16} /> : <Copy size={16} />} {t(kopiert ? 'adminkonten.kopiert' : 'adminkonten.kopieren')}
          </Button>
          <Button onClick={onClose}>{t('adminkonten.fertig')}</Button>
        </>
      }
    >
      <div className="space-y-3">
        {e.halb ? (
          <FehlerSatz text={t('adminkonten.halb_text', { grund: e.grund })} />
        ) : (
          <p className="text-sm font-semibold text-ok">{t('adminkonten.erfolg_text')}</p>
        )}
        <ErfolgZeile label={t('adminkonten.email')} wert={e.email} />
        <ErfolgZeile label={t('adminkonten.startpasswort')} wert={e.passwort} />
        <ErfolgZeile label={t('adminkonten.adresse')} wert={adresse} />
        <p className="t-sub">{t('adminkonten.erfolg_hinweis')}</p>
      </div>
    </Modal>
  )
}

function NeuesKonto({ bl, onAngelegt }: { bl: AsyncState<BlProjekt[]>; onAngelegt: () => void }) {
  const { t } = useSprache()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [pw, setPw] = useState('')
  const [wahl, setWahl] = useState<Record<string, Rolle>>({})
  const [busy, setBusy] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [erfolg, setErfolg] = useState<Erfolg | null>(null)

  function umschalten(id: string, an: boolean) {
    setWahl((w) => {
      const n = { ...w }
      if (an) n[id] = 'editor'
      else delete n[id]
      return n
    })
  }

  async function anlegen() {
    const mail = email.trim().toLowerCase()
    if (!EMAIL.test(mail)) return setFehler(t('adminkonten.email_ungueltig'))
    if (!passwortGenug(pw)) return setFehler(t('adminkonten.passwort_schwach'))
    setFehler(null)
    setBusy(true)
    try {
      // Vorher nachsehen, ob es die Adresse schon gibt: nur so ist ein Fehler
      // nach dem Anlegen (Zuteilung fehlt) von "E-Mail vergeben" zu trennen.
      const vorher = new Set((await adminNutzerAktivitaet()).map((n) => n.email.toLowerCase()))
      try {
        await adminKontoAnlegen({
          email: mail,
          password: pw,
          name: name.trim(),
          bundeslaender: Object.entries(wahl).map(([blId, rolle]) => ({ blId, rolle })),
        })
      } catch (err) {
        const grund = err instanceof Error ? err.message : String(err)
        let halb = false
        if (!vorher.has(mail)) {
          try {
            halb = (await adminNutzerAktivitaet()).some((n) => n.email.toLowerCase() === mail)
          } catch {
            /* Nachpruefung fehlgeschlagen: der Fehlersatz unten bleibt stehen */
          }
        }
        if (!halb) return setFehler(grund)
        setErfolg({ email: mail, name: name.trim(), passwort: pw, halb: true, grund })
        onAngelegt()
        return
      }
      setErfolg({ email: mail, name: name.trim(), passwort: pw, halb: false, grund: '' })
      setEmail('')
      setName('')
      setPw('')
      setWahl({})
      onAngelegt()
    } catch (err) {
      setFehler(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <SectionTitle>{t('adminkonten.konto_titel')}</SectionTitle>
      <p className="t-sub mb-4">{t('adminkonten.konto_hinweis')}</p>
      <form
        className="space-y-4"
        onSubmit={(ev) => {
          ev.preventDefault()
          void anlegen()
        }}
      >
        <Field label={t('adminkonten.email')} required>
          <Input type="email" dir="ltr" autoComplete="off" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label={t('adminkonten.name')} hint={t('adminkonten.name_hinweis')}>
          <Input value={name} maxLength={60} autoComplete="off" onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label={t('adminkonten.startpasswort')} hint={t('adminkonten.passwort_hinweis')} required>
          <Input dir="ltr" autoComplete="off" spellCheck={false} className="font-mono" value={pw} onChange={(e) => setPw(e.target.value)} />
        </Field>
        <Button type="button" variant="outline" onClick={() => setPw(passwortErzeugen())}>
          <KeyRound size={16} /> {t('adminkonten.pw_erzeugen')}
        </Button>

        <div>
          <p className="mb-2 text-[0.9375rem] font-bold">{t('adminkonten.projekt_wahl')}</p>
          <Zustand a={bl} leer={(d) => d.length === 0}>
            {(d) => (
              <Card className="overflow-hidden">
                <ul className="divide-y divide-line">
                  {d.map((p) => {
                    const an = p.id in wahl
                    return (
                      <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                        <label className="flex min-h-12 min-w-0 flex-1 cursor-pointer items-center gap-3">
                          <input type="checkbox" className="h-6 w-6 shrink-0 accent-[var(--accent)]" checked={an} onChange={(e) => umschalten(p.id, e.target.checked)} />
                          <span className="t-name min-w-0 break-words">{p.name}</span>
                        </label>
                        {an ? (
                          <ZugangWahl
                            wert={wahl[p.id]}
                            label={t('adminkonten.rolle_fuer', { projekt: p.name })}
                            onChange={(z) => setWahl((w) => ({ ...w, [p.id]: z === 'viewer' ? 'viewer' : 'editor' }))}
                          />
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              </Card>
            )}
          </Zustand>
          <p className="t-sub mt-2">{t('adminkonten.rolle_erklaerung')}</p>
        </div>

        {fehler ? <FehlerSatz text={fehler} /> : null}
        <Button type="submit" size="lg" full loading={busy}>
          <Plus size={18} /> {t('adminkonten.anlegen')}
        </Button>
      </form>
      {erfolg ? <ErfolgDialog e={erfolg} onClose={() => setErfolg(null)} /> : null}
    </section>
  )
}

/* ----------------------------------------------------------------- Leute */

type Frage = 'admin_machen' | 'admin_entziehen' | 'sperren' | 'loeschen' | null

function PersonDialog({
  n,
  u,
  bl,
  blMit,
  onClose,
  onGeaendert,
}: {
  n: AdminNutzerAktivitaet
  u: AdminNutzer | undefined
  bl: AsyncState<BlProjekt[]>
  blMit: AsyncState<BlMitglied[]>
  onClose: () => void
  onGeaendert: () => void
}) {
  const { t, lang } = useSprache()
  const toast = useToast()
  const { user } = useAuth()
  const verlauf = useAsync(() => adminAktivitaet(100, n.user_id), [n.user_id])
  const [busy, setBusy] = useState(false)
  const [frage, setFrage] = useState<Frage>(null)
  const [lokal, setLokal] = useState<Record<string, Zugang>>({})
  const ich = user?.id === n.user_id
  const name = n.name?.trim() || n.email
  const freigabe = u?.freigabe
  const alleinige = u ? u.umzuege.filter((x) => x.eigentuemer && x.mitglieder <= 1).length : 0

  function aktuell(blId: string): Zugang {
    if (lokal[blId]) return lokal[blId]
    const m = (blMit.data ?? []).find((x) => x.bl_projekt_id === blId && x.user_id === n.user_id)
    return !m ? 'keine' : m.role === 'viewer' ? 'viewer' : 'editor'
  }

  async function ausfuehren(fn: () => Promise<void>, ok: string): Promise<boolean> {
    setBusy(true)
    try {
      await fn()
      toast(ok, 'ok')
      onGeaendert()
      return true
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function zugangSetzen(p: BlProjekt, z: Zugang) {
    const ok = await ausfuehren(() => blMitgliedSetzen(n.user_id, p.id, z), t('adminkonten.zugang_gesetzt', { name, projekt: p.name }))
    if (ok) setLokal((l) => ({ ...l, [p.id]: z }))
  }

  return (
    <>
      <Modal open onClose={onClose} title={name} wide>
        <div className="space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {n.ist_admin ? (
                <Badge>
                  <ShieldCheck size={14} /> {t('admin.ist_admin')}
                </Badge>
              ) : null}
              {freigabe ? (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-0.5 text-sm font-bold"
                  style={{ color: STATUS_FARBE[freigabe] }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: STATUS_FARBE[freigabe] }} />
                  {t(`admin.status_${freigabe}`)}
                </span>
              ) : null}
            </div>
            <p className="t-sub mt-1 break-all" dir="ltr">
              {n.email}
            </p>
            <p className="t-sub mt-1">
              {n.zuletzt_aktiv ? t('adminkonten.zuletzt_aktiv', { wann: relativ(n.zuletzt_aktiv, lang) }) : t('adminkonten.nie_aktiv')}
              {' · '}
              {t('adminkonten.buchungen', { n: n.buchungen })}
            </p>
          </div>

          <section>
            <SectionTitle>{t('adminkonten.zugang_titel')}</SectionTitle>
            {n.ist_admin ? (
              <p className="t-sub">{t('adminkonten.zugang_admin')}</p>
            ) : bl.error && !bl.data ? (
              <ErrorBox error={bl.error} onRetry={bl.reload} />
            ) : blMit.error && !blMit.data ? (
              <ErrorBox error={blMit.error} onRetry={blMit.reload} />
            ) : !bl.data || !blMit.data ? (
              <Loading label={t('adminkonten.laedt')} />
            ) : bl.data.length === 0 ? (
              <p className="t-sub">{t('adminkonten.keine_projekte')}</p>
            ) : (
              <ul className="space-y-2">
                {bl.data.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-2">
                    <span className="t-name min-w-0 flex-1 break-words">{p.name}</span>
                    <ZugangWahl
                      mitKeine
                      wert={aktuell(p.id)}
                      disabled={busy}
                      label={t('adminkonten.rolle_fuer', { projekt: p.name })}
                      onChange={(z) => void zugangSetzen(p, z)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <SectionTitle>{t('adminkonten.konto_aktionen')}</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {freigabe === 'wartet' ? (
                <Button size="sm" disabled={busy} onClick={() => void ausfuehren(() => adminFreigabeSetzen(n.user_id, 'frei'), t('admin.freigeschaltet', { name }))}>
                  <Check size={16} /> {t('admin.freischalten')}
                </Button>
              ) : null}
              {n.ist_admin ? (
                <Button size="sm" variant="outline" disabled={busy || ich} onClick={() => setFrage('admin_entziehen')}>
                  <ShieldX size={16} /> {t('adminkonten.admin_entziehen')}
                </Button>
              ) : (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => setFrage('admin_machen')}>
                  <ShieldCheck size={16} /> {t('adminkonten.admin_machen')}
                </Button>
              )}
              {!n.ist_admin && freigabe === 'gesperrt' ? (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => void ausfuehren(() => adminFreigabeSetzen(n.user_id, 'frei'), t('admin.entsperrt', { name }))}>
                  <Undo2 size={16} className="spiegeln" /> {t('admin.entsperren')}
                </Button>
              ) : null}
              {!n.ist_admin && freigabe && freigabe !== 'gesperrt' ? (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => setFrage('sperren')}>
                  <ShieldX size={16} /> {t('admin.sperren')}
                </Button>
              ) : null}
              {!n.ist_admin ? (
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => setFrage('loeschen')} className="text-danger">
                  <Trash2 size={16} /> {t('admin.loeschen')}
                </Button>
              ) : null}
            </div>
            {n.ist_admin ? <p className="t-sub mt-2">{t('adminkonten.admin_zuerst')}</p> : null}
          </section>

          <section>
            <SectionTitle>{t('adminkonten.verlauf_titel')}</SectionTitle>
            <AktListe a={verlauf} mitPerson={false} />
          </section>
        </div>
      </Modal>

      <ConfirmDialog
        open={frage !== null}
        danger={frage === 'loeschen' || frage === 'sperren' || frage === 'admin_entziehen'}
        title={frage ? t(`adminkonten.frage_${frage}_titel`, { name }) : ''}
        body={frage ? t(`adminkonten.frage_${frage}`, { n: alleinige, offen: n.offene_ausleihen }) : ''}
        confirmLabel={frage ? t(`adminkonten.frage_${frage}_ja`) : ''}
        onClose={() => setFrage(null)}
        onConfirm={async () => {
          const f = frage
          setFrage(null)
          if (f === 'admin_machen') await ausfuehren(() => adminAdminSetzen(n.user_id, true), t('adminkonten.admin_gemacht', { name }))
          else if (f === 'admin_entziehen') await ausfuehren(() => adminAdminSetzen(n.user_id, false), t('adminkonten.admin_entzogen', { name }))
          else if (f === 'sperren') await ausfuehren(() => adminFreigabeSetzen(n.user_id, 'gesperrt'), t('admin.gesperrt', { name }))
          else if (f === 'loeschen') {
            const ok = await ausfuehren(async () => {
              await adminKontoLoeschen(n.user_id)
            }, t('adminkonten.geloescht', { name }))
            if (ok) onClose()
          }
        }}
      />
    </>
  )
}

function LeuteTab({
  leute,
  uebersicht,
  bl,
  blMit,
  onGeaendert,
}: {
  leute: AsyncState<AdminNutzerAktivitaet[]>
  uebersicht: AsyncState<AdminUebersicht>
  bl: AsyncState<BlProjekt[]>
  blMit: AsyncState<BlMitglied[]>
  onGeaendert: () => void
}) {
  const { t, lang } = useSprache()
  const [q, setQ] = useState('')
  const [offen, setOffen] = useState<string | null>(null)
  const nutzerMap = useMemo(() => new Map((uebersicht.data?.nutzer ?? []).map((x) => [x.id, x])), [uebersicht.data])
  const liste = useMemo(() => {
    const alle = leute.data ?? []
    const s = q.trim().toLowerCase()
    const treffer = s ? alle.filter((n) => (n.name ?? '').toLowerCase().includes(s) || n.email.toLowerCase().includes(s)) : alle
    // Wer auf Freigabe wartet, steht oben.
    const rang = (n: AdminNutzerAktivitaet) => (nutzerMap.get(n.user_id)?.freigabe === 'wartet' && !n.ist_admin ? 0 : 1)
    return [...treffer].sort((a, b) => rang(a) - rang(b))
  }, [leute.data, q, nutzerMap])
  const gewaehlt = offen ? (leute.data ?? []).find((n) => n.user_id === offen) : undefined

  return (
    <section>
      <SectionTitle>{t('adminkonten.leute_titel')}</SectionTitle>
      <Zustand a={leute} leer={(d) => d.length === 0}>
        {() => (
          <>
            <div className="relative mb-4">
              <Search size={18} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('adminkonten.suchen')} aria-label={t('adminkonten.suchen')} className="ps-10" />
            </div>
            {liste.length === 0 ? (
              <Empty icon={<Search size={30} />} title={t('admin.keine_treffer')} />
            ) : (
              <Card className="overflow-hidden">
                <ul className="divide-y divide-line">
                  {liste.map((n) => {
                    const fg = nutzerMap.get(n.user_id)?.freigabe
                    return (
                      <li key={n.user_id}>
                        <button type="button" onClick={() => setOffen(n.user_id)} className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-start transition hover:bg-raised">
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="t-name min-w-0 break-words">{n.name?.trim() || n.email}</span>
                              {n.ist_admin ? (
                                <Badge>
                                  <ShieldCheck size={14} /> {t('admin.ist_admin')}
                                </Badge>
                              ) : null}
                              {fg && fg !== 'frei' && !n.ist_admin ? (
                                <span className="text-sm font-bold" style={{ color: STATUS_FARBE[fg] }}>
                                  {t(`admin.status_${fg}`)}
                                </span>
                              ) : null}
                            </span>
                            {n.name?.trim() ? (
                              <span className="t-sub block break-all" dir="ltr">
                                {n.email}
                              </span>
                            ) : null}
                            <span className="t-sub mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                              <span>{n.zuletzt_aktiv ? t('adminkonten.zuletzt_aktiv', { wann: relativ(n.zuletzt_aktiv, lang) }) : t('adminkonten.nie_aktiv')}</span>
                              <span>{t('adminkonten.buchungen', { n: n.buchungen })}</span>
                              {n.offene_ausleihen > 0 ? <span>{t('adminkonten.offen', { n: n.offene_ausleihen })}</span> : null}
                              {n.ueberfaellig > 0 ? <span className="font-bold text-danger">{t('adminkonten.ueberfaellig', { n: n.ueberfaellig })}</span> : null}
                              {n.drin_in ? <span className="font-bold text-ok">{t('adminkonten.drin_in', { lager: n.drin_in })}</span> : null}
                            </span>
                          </span>
                          <ChevronRight size={18} className="spiegeln shrink-0 text-muted" />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </Card>
            )}
          </>
        )}
      </Zustand>
      {gewaehlt ? (
        <PersonDialog
          key={gewaehlt.user_id}
          n={gewaehlt}
          u={nutzerMap.get(gewaehlt.user_id)}
          bl={bl}
          blMit={blMit}
          onClose={() => setOffen(null)}
          onGeaendert={onGeaendert}
        />
      ) : null}
    </section>
  )
}

/* --------------------------------------------------------------- Projekte */

/** Ein Name, ein Knopf: neues Bundeslandprojekt, Umbenennen, neues Lager.
 *  Der Dialog wird nur beim Oeffnen eingehaengt, der Zustand beginnt also immer neu. */
function NameDialog({
  titel,
  label,
  start,
  ja,
  onClose,
  onSpeichern,
}: {
  titel: string
  label: string
  start: string
  ja: string
  onClose: () => void
  onSpeichern: (name: string) => Promise<void>
}) {
  const { t } = useSprache()
  const [name, setName] = useState(start)
  const [busy, setBusy] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  async function speichern() {
    const n = name.trim()
    if (!n) return setFehler(t('adminkonten.name_fehlt'))
    setFehler(null)
    setBusy(true)
    try {
      await onSpeichern(n)
      onClose()
    } catch (err) {
      setFehler(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal
      open
      onClose={onClose}
      title={titel}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('aktion.abbrechen')}
          </Button>
          <Button loading={busy} onClick={() => void speichern()}>
            {ja}
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(ev) => {
          ev.preventDefault()
          void speichern()
        }}
      >
        <Field label={label} required>
          <Input value={name} maxLength={60} autoFocus onChange={(e) => setName(e.target.value)} />
        </Field>
        {fehler ? <FehlerSatz text={fehler} /> : null}
      </form>
    </Modal>
  )
}

function ProjektKarte({
  p,
  lagerZahl,
  leuteZahl,
  mitglieder,
  kisten,
  stand,
  onUmbenennen,
  onLoeschen,
  onNeuesLager,
}: {
  p: BlProjekt
  lagerZahl: number
  leuteZahl: number
  mitglieder: Map<string, number>
  kisten: Map<string, number>
  stand: number
  onUmbenennen: () => void
  onLoeschen: () => void
  onNeuesLager: () => void
}) {
  const { t } = useSprache()
  const [offen, setOffen] = useState(false)
  return (
    <li>
      <div className="flex items-center gap-1 px-2 py-1">
        <button
          type="button"
          aria-expanded={offen}
          onClick={() => setOffen((o) => !o)}
          className="flex min-h-16 min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-2 text-start transition hover:bg-raised"
        >
          {offen ? <ChevronDown size={18} className="shrink-0 text-muted" /> : <ChevronRight size={18} className="spiegeln shrink-0 text-muted" />}
          <span className="min-w-0 flex-1">
            <span className="t-name block break-words">{p.name}</span>
            <span className="t-sub block">{t('adminkonten.projekt_zeile', { lager: lagerZahl, leute: leuteZahl })}</span>
          </span>
        </button>
        <Button size="sm" variant="ghost" aria-label={t('adminkonten.umbenennen')} onClick={onUmbenennen}>
          <Pencil size={16} />
        </Button>
        <Button size="sm" variant="ghost" aria-label={t('adminkonten.projekt_loeschen')} className="text-danger" onClick={onLoeschen}>
          <Trash2 size={16} />
        </Button>
      </div>
      {offen ? <ProjektLager p={p} mitglieder={mitglieder} kisten={kisten} stand={stand} onNeuesLager={onNeuesLager} /> : null}
    </li>
  )
}

function ProjektLager({
  p,
  mitglieder,
  kisten,
  stand,
  onNeuesLager,
}: {
  p: BlProjekt
  mitglieder: Map<string, number>
  kisten: Map<string, number>
  stand: number
  onNeuesLager: () => void
}) {
  const { t } = useSprache()
  const a = useAsync(() => listLagerImBl(p.id), [p.id, stand])
  return (
    <div className="space-y-2 px-4 pb-4">
      {a.error && !a.data ? (
        <ErrorBox error={a.error} onRetry={a.reload} />
      ) : a.loading && !a.data ? (
        <Loading label={t('adminkonten.laedt')} />
      ) : (
        <>
          {a.error ? <FehlerSatz text={a.error} /> : null}
          {(a.data ?? []).length === 0 ? (
            <p className="t-sub">{t('adminkonten.projekt_leer')}</p>
          ) : (
            <ul className="space-y-2">
              {(a.data ?? []).map((l) => (
                <li key={l.id} className="rounded-2xl border border-line bg-surface px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="t-name min-w-0 break-words">{l.name}</span>
                    {l.archived ? <Badge>{t('admin.archiviert')}</Badge> : null}
                  </div>
                  <p className="t-sub mt-0.5">{t('adminkonten.lager_zeile', { mitglieder: mitglieder.get(l.id) ?? 0, kisten: kisten.get(l.id) ?? 0 })}</p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <Button size="sm" variant="outline" onClick={onNeuesLager}>
        <Plus size={16} /> {t('adminkonten.lager_neu')}
      </Button>
    </div>
  )
}

function ProjekteTab({
  bl,
  lager,
  blMit,
  uebersicht,
  stand,
  onGeaendert,
}: {
  bl: AsyncState<BlProjekt[]>
  lager: AsyncState<ProjectWithStats[]>
  blMit: AsyncState<BlMitglied[]>
  uebersicht: AsyncState<AdminUebersicht>
  stand: number
  onGeaendert: () => void
}) {
  const { t } = useSprache()
  const toast = useToast()
  const [neu, setNeu] = useState(false)
  const [umb, setUmb] = useState<BlProjekt | null>(null)
  const [weg, setWeg] = useState<BlProjekt | null>(null)
  const [lagerIn, setLagerIn] = useState<BlProjekt | null>(null)
  const kisten = useMemo(() => {
    const m = new Map<string, number>()
    for (const n of uebersicht.data?.nutzer ?? []) for (const x of n.umzuege) m.set(x.id, x.kisten)
    return m
  }, [uebersicht.data])
  const mitglieder = useMemo(() => new Map((lager.data ?? []).map((x) => [x.project.id, x.members])), [lager.data])
  const lagerJe = useMemo(() => {
    const m = new Map<string, number>()
    for (const x of lager.data ?? []) m.set(x.project.bl_projekt_id, (m.get(x.project.bl_projekt_id) ?? 0) + 1)
    return m
  }, [lager.data])
  const leuteJe = useMemo(() => {
    const m = new Map<string, number>()
    for (const x of blMit.data ?? []) m.set(x.bl_projekt_id, (m.get(x.bl_projekt_id) ?? 0) + 1)
    return m
  }, [blMit.data])

  return (
    <section>
      <SectionTitle
        action={
          <Button size="sm" onClick={() => setNeu(true)}>
            <Plus size={16} /> {t('adminkonten.projekt_neu')}
          </Button>
        }
      >
        {t('adminkonten.projekte_titel')}
      </SectionTitle>
      {uebersicht.data ? (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Zahl wert={uebersicht.data.nutzer.length} wort={t('admin.nutzer')} />
          <Zahl wert={lager.data?.length ?? uebersicht.data.umzuege} wort={t('adminkonten.lager')} />
          <Zahl wert={uebersicht.data.kisten} wort={t('admin.kisten')} />
          <Zahl wert={uebersicht.data.grundrisse} wort={t('admin.grundrisse')} />
        </div>
      ) : uebersicht.error ? (
        <div className="mb-4">
          <ErrorBox error={uebersicht.error} onRetry={uebersicht.reload} />
        </div>
      ) : null}
      <Zustand a={bl} leer={(d) => d.length === 0}>
        {(d) => (
          <Card className="overflow-hidden">
            <ul className="zebra divide-y divide-line">
              {d.map((p) => (
                <ProjektKarte
                  key={p.id}
                  p={p}
                  lagerZahl={lagerJe.get(p.id) ?? 0}
                  leuteZahl={leuteJe.get(p.id) ?? 0}
                  mitglieder={mitglieder}
                  kisten={kisten}
                  stand={stand}
                  onUmbenennen={() => setUmb(p)}
                  onLoeschen={() => setWeg(p)}
                  onNeuesLager={() => setLagerIn(p)}
                />
              ))}
            </ul>
          </Card>
        )}
      </Zustand>

      {neu ? (
        <NameDialog
          titel={t('adminkonten.projekt_neu')}
          label={t('adminkonten.projekt_name')}
          start=""
          ja={t('adminkonten.projekt_anlegen')}
          onClose={() => setNeu(false)}
          onSpeichern={async (name) => {
            await blProjektAnlegen(name)
            toast(t('adminkonten.projekt_angelegt', { name }), 'ok')
            onGeaendert()
          }}
        />
      ) : null}
      {umb ? (
        <NameDialog
          titel={t('adminkonten.umbenennen')}
          label={t('adminkonten.projekt_name')}
          start={umb.name}
          ja={t('aktion.speichern')}
          onClose={() => setUmb(null)}
          onSpeichern={async (name) => {
            await blProjektUmbenennen(umb.id, name)
            toast(t('adminkonten.projekt_umbenannt', { name }), 'ok')
            onGeaendert()
          }}
        />
      ) : null}
      {lagerIn ? (
        <NameDialog
          titel={t('adminkonten.lager_neu_in', { projekt: lagerIn.name })}
          label={t('adminkonten.lager_name')}
          start=""
          ja={t('adminkonten.lager_anlegen')}
          onClose={() => setLagerIn(null)}
          onSpeichern={async (name) => {
            await lagerAnlegen(lagerIn.id, name)
            toast(t('adminkonten.lager_angelegt', { name }), 'ok')
            onGeaendert()
          }}
        />
      ) : null}
      <ConfirmDialog
        open={weg !== null}
        danger
        title={weg ? t('adminkonten.frage_projekt_loeschen_titel', { name: weg.name }) : ''}
        body={t('adminkonten.frage_projekt_loeschen')}
        confirmLabel={t('adminkonten.frage_projekt_loeschen_ja')}
        onClose={() => setWeg(null)}
        onConfirm={async () => {
          const p = weg
          setWeg(null)
          if (!p) return
          try {
            await blProjektLoeschen(p.id)
            toast(t('adminkonten.projekt_geloescht', { name: p.name }), 'ok')
            onGeaendert()
          } catch (err) {
            toast(err instanceof Error ? err.message : String(err), 'error')
          }
        }}
      />
    </section>
  )
}

/* ------------------------------------------------------------------ Seite */

export default function Admin() {
  const { t } = useSprache()
  const [tab, setTab] = useState<Tab>('leute')
  const [stand, setStand] = useState(0)
  const leute = useAsync(() => adminNutzerAktivitaet(), [])
  const uebersicht = useAsync(() => ladeAdminUebersicht(), [])
  const lager = useAsync(() => listProjects(), [])
  const bl = useAsync(() => listBlProjekte(), [])
  const blMit = useAsync(() => adminBlMitglieder(), [])
  const alleNeu = () => {
    leute.reload()
    uebersicht.reload()
    lager.reload()
    bl.reload()
    blMit.reload()
    setStand((x) => x + 1)
  }
  const reiter: { id: Tab; wort: string }[] = [
    { id: 'konto', wort: t('adminkonten.tab_konto') },
    { id: 'leute', wort: t('adminkonten.tab_leute') },
    { id: 'projekte', wort: t('adminkonten.tab_projekte') },
    { id: 'aktivitaet', wort: t('adminkonten.tab_aktivitaet') },
  ]
  return (
    <>
      <AppHeader title={t('admin.titel')} subtitle={t('adminkonten.untertitel')} back="/app" />
      <Page>
        <div role="tablist" aria-label={t('admin.titel')} className="scrollbar-thin -mx-3 mb-5 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
          {reiter.map((r) => (
            <Chip key={r.id} active={tab === r.id} onClick={() => setTab(r.id)}>
              {r.wort}
            </Chip>
          ))}
        </div>
        {tab === 'konto' ? <NeuesKonto bl={bl} onAngelegt={alleNeu} /> : null}
        {tab === 'leute' ? <LeuteTab leute={leute} uebersicht={uebersicht} bl={bl} blMit={blMit} onGeaendert={alleNeu} /> : null}
        {tab === 'projekte' ? <ProjekteTab bl={bl} lager={lager} blMit={blMit} uebersicht={uebersicht} stand={stand} onGeaendert={alleNeu} /> : null}
        {tab === 'aktivitaet' ? <AktivitaetTab leute={leute} /> : null}
      </Page>
    </>
  )
}
