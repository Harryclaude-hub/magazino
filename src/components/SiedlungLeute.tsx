import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, UserMinus, UserPlus } from 'lucide-react'
import { siedlungEinladen, siedlungEntfernen } from '../lib/api'
import { useSprache } from '../lib/i18n'
import type { SiedlungEinladung, SiedlungMitglied } from '../lib/types'
import { Avatar, Badge, Button, ErrorBox, Field, IconButton, Input, Loading, Modal, useToast } from './ui'

/* Leute in der Siedlung (E86): einladen, sehen, wer dabei ist, entfernen
 * und verlassen.
 *
 * Der Besitzer laedt registrierte Magazino-Leute ein, per E-Mail oder per
 * Anzeigename (nur wenn genau eine Person so heisst; das prueft die
 * Datenbank). Jede Antwort steht als eigener Satz unter dem Feld. In der
 * Liste kann er Gaeste entfernen, nach einer Rueckfrage in der Zeile.
 * Ein Gast sieht die Liste und kann die Siedlung verlassen (Rueckfrage,
 * danach zur Startseite).
 *
 * Die Liste laedt die Seite (SiedlungAnsicht.tsx, auch fuer die Figuren in
 * 3D) und gibt sie mit Laden, Fehler und Daten herein; nach einer
 * Aenderung laedt sie neu (reload). Der Dialog entsteht bei jedem Oeffnen
 * neu, Feld, Meldung und Rueckfragen beginnen also leer. Tasten bleiben im
 * Dialog (ausser Esc), sonst ginge man mit den Pfeilen in 3D los.
 *
 * Was eingetippt wird (E-Mail oder Name), geht nur an siedlungEinladen in
 * api.ts, nie in die Konsole.
 *
 * E87b: Wer im Umzug der eigenen Wohnung des Besitzers ist (rolle
 * 'umzug'), steht als "im Umzug" in der Liste: kein Gast, laesst sich
 * nicht entfernen und zaehlt nicht zu den hoechstens GAESTE_MAX Gaesten
 * (die Zahl sieht der Besitzer ueber der Liste). Wer selbst so dabei ist,
 * sieht statt "Gast" einen eigenen Satz und kein Verlassen (er ist ueber
 * den Umzug dabei, nicht eingeladen). */

/** So viele Gaeste laesst die Datenbank je Siedlung zu (0046). */
// eslint-disable-next-line react/only-export-components -- reine Zahl, eigene Pruefung
export const GAESTE_MAX = 20

export interface SiedlungLeuteDaten {
  data: SiedlungMitglied[] | null
  loading: boolean
  error: string | null
  reload: () => void
}

export interface SiedlungLeuteProps {
  open: boolean
  onClose: () => void
  siedlungId: string
  siedlungName: string
  /** Eigene Kennung. */
  ich: string
  besitzer: boolean
  mitglieder: SiedlungLeuteDaten
}

type Meldung = { art: 'ok' | 'hinweis' | 'fehler'; text: string }
type Uebersetzer = (key: string, vars?: Record<string, string | number>) => string

/** Der Satz zur Antwort beim Einladen. Unbekannte Antworten gelten als
 *  Fehler und nennen sich, statt still zu verschwinden. */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export function einladungMeldung(r: SiedlungEinladung, t: Uebersetzer): Meldung {
  switch (r.status) {
    case 'ok':
      return { art: 'ok', text: t('siedlung.einladung_ok', { name: r.name || '?' }) }
    case 'nicht_gefunden':
      return { art: 'hinweis', text: t('siedlung.einladung_nicht_gefunden') }
    case 'mehrdeutig':
      return { art: 'hinweis', text: t('siedlung.einladung_mehrdeutig') }
    case 'schon_drin':
      return { art: 'hinweis', text: t('siedlung.einladung_schon_drin') }
    case 'selbst':
      return { art: 'hinweis', text: t('siedlung.einladung_selbst') }
    case 'zu_viele':
      return { art: 'hinweis', text: t('siedlung.einladung_zu_viele') }
    default:
      return { art: 'fehler', text: t('siedlung.einladen_fehler', { grund: String((r as { status?: unknown }).status) }) }
  }
}

/** Reihenfolge der Rollen in der Liste (E87b: drei, nicht mehr zwei). */
const ROLLEN_FOLGE: Record<SiedlungMitglied['rolle'], number> = { besitzer: 0, umzug: 1, gast: 2 }

/** Besitzer zuerst, dann die im Umzug, dann die Gaeste, je nach Name (wie
 *  man es liest, gross oder klein egal). Eine unbekannte Rolle zuletzt. */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export function mitgliederOrdnen(liste: readonly SiedlungMitglied[]): SiedlungMitglied[] {
  const rang = (m: SiedlungMitglied) => ROLLEN_FOLGE[m.rolle] ?? 3
  return [...liste].sort((a, b) => {
    if (rang(a) !== rang(b)) return rang(a) - rang(b)
    return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
  })
}

/** Name der Rolle (Woerterbuch siedlung). */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export function rolleName(rolle: SiedlungMitglied['rolle']): string {
  return rolle === 'besitzer' ? 'siedlung.rolle_besitzer' : rolle === 'umzug' ? 'siedlung.rolle_umzug' : 'siedlung.rolle_gast'
}

export default function SiedlungLeute(props: SiedlungLeuteProps) {
  const { t } = useSprache()
  // Nur offen im Baum: so beginnt jedes Oeffnen frisch.
  if (!props.open) return null
  return (
    <Modal open onClose={props.onClose} title={t('siedlung.leute_titel')}>
      <LeuteInhalt {...props} />
    </Modal>
  )
}

/** Der Inhalt des Dialogs, ohne Fenster (so auch ohne Browser pruefbar,
 *  scripts/minikarte-pruefen.mjs). */
export function LeuteInhalt({ siedlungId, siedlungName, ich, besitzer, mitglieder }: SiedlungLeuteProps) {
  const { t } = useSprache()
  const toast = useToast()
  const nav = useNavigate()
  const [eingabe, setEingabe] = useState('')
  const [laeuft, setLaeuft] = useState(false)
  const [meldung, setMeldung] = useState<Meldung | null>(null)
  /** Rueckfrage in der Zeile: wen entfernen, oder 'ich' fuer Verlassen. */
  const [frage, setFrage] = useState<string | null>(null)
  const wurzel = useRef<HTMLDivElement>(null)
  const feld = useRef<HTMLInputElement>(null)
  useEffect(() => {
    // Fokus in den Dialog, damit Pfeile nicht in 3D gehen. Am Computer
    // gleich ins Feld; am Handy nicht, sonst deckt die Tastatur alles zu.
    const fein = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: fine)').matches
    if (fein && feld.current) feld.current.focus()
    else wurzel.current?.focus({ preventScroll: true })
  }, [])

  async function einladen(e: FormEvent) {
    e.preventDefault()
    if (laeuft) return
    const wer = eingabe.trim()
    if (!wer) {
      setMeldung({ art: 'fehler', text: t('siedlung.einladen_leer') })
      return
    }
    setLaeuft(true)
    setMeldung(null)
    try {
      const r = await siedlungEinladen(siedlungId, wer)
      setMeldung(einladungMeldung(r, t))
      if (r.status === 'ok') {
        setEingabe('')
        mitglieder.reload()
      }
    } catch (err) {
      setMeldung({ art: 'fehler', text: t('siedlung.einladen_fehler', { grund: err instanceof Error ? err.message : String(err) }) })
    } finally {
      setLaeuft(false)
    }
  }

  async function entfernen(m: SiedlungMitglied) {
    if (laeuft) return
    setLaeuft(true)
    setMeldung(null)
    try {
      await siedlungEntfernen(siedlungId, m.user_id)
      setFrage(null)
      toast(t('siedlung.entfernt', { name: m.name || '?' }), 'ok')
      mitglieder.reload()
    } catch (err) {
      setFrage(null)
      setMeldung({ art: 'fehler', text: t('siedlung.aktion_fehler', { grund: err instanceof Error ? err.message : String(err) }) })
    } finally {
      setLaeuft(false)
    }
  }

  async function verlassen() {
    if (laeuft) return
    setLaeuft(true)
    setMeldung(null)
    try {
      await siedlungEntfernen(siedlungId, ich)
      toast(t('siedlung.verlassen_ok'), 'ok')
      // Ersetzen, nicht anhaengen: zurueck fuehrte sonst in eine Siedlung,
      // die man nicht mehr oeffnen darf (wie beim Verlassen eines Umzugs).
      nav('/app', { replace: true })
    } catch (err) {
      setFrage(null)
      setMeldung({ art: 'fehler', text: t('siedlung.aktion_fehler', { grund: err instanceof Error ? err.message : String(err) }) })
    } finally {
      setLaeuft(false)
    }
  }

  // Pfeile und Buchstaben bleiben im Dialog (sonst ginge man in 3D los);
  // Esc darf durch, damit das Fenster schliesst.
  const tastenHalten = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') e.stopPropagation()
  }

  const liste = mitglieder.data ? mitgliederOrdnen(mitglieder.data) : null
  // Nur Gaeste zaehlen fuer die Grenze (E87b): nicht der Besitzer, nicht die im Umzug.
  const gaeste = liste ? liste.filter((m) => m.rolle === 'gast') : []
  // Selbst ueber den Umzug dabei (E87b): kein Gast, also auch kein Verlassen.
  const ichImUmzug = !besitzer && !!liste && liste.some((m) => m.user_id === ich && m.rolle === 'umzug')

  return (
    <div ref={wurzel} tabIndex={-1} className="space-y-5 outline-none" onKeyDown={tastenHalten}>
      {besitzer ? (
        <form onSubmit={(e) => void einladen(e)} noValidate className="space-y-3">
          <h3 className="t-name">{t('siedlung.einladen_titel')}</h3>
          <Field label={t('siedlung.einladen_feld')} hint={t('siedlung.einladen_hinweis')}>
            <Input
              ref={feld}
              value={eingabe}
              onChange={(e) => setEingabe(e.target.value)}
              type="text"
              inputMode="email"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="send"
              maxLength={200}
              disabled={laeuft}
              placeholder={t('siedlung.einladen_feld')}
            />
          </Field>
          <Button type="submit" loading={laeuft} full>
            <UserPlus size={18} /> {t('siedlung.einladen')}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted">{t(ichImUmzug ? 'siedlung.umzug_hinweis' : 'siedlung.gast_hinweis')}</p>
      )}

      {meldung ? (
        <p
          dir="auto"
          role={meldung.art === 'fehler' ? 'alert' : 'status'}
          data-meldung={meldung.art}
          className={
            meldung.art === 'ok'
              ? 'rounded-knopf border-2 border-ok/30 bg-ok/8 px-3 py-2 text-sm font-bold text-ok'
              : meldung.art === 'fehler'
                ? 'rounded-knopf border-2 border-danger/30 bg-danger/8 px-3 py-2 text-sm font-bold text-danger'
                : 'rounded-knopf border-2 border-warn/30 bg-warn/8 px-3 py-2 text-sm font-bold text-warn'
          }
        >
          {meldung.text}
        </p>
      ) : null}

      <section aria-label={t('siedlung.mitglieder')} className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <h3 className="t-name">{t('siedlung.mitglieder')}</h3>
          {besitzer && liste ? (
            <span data-gaeste-zahl="" className="t-sub">
              {t('siedlung.gaeste_zahl', { n: gaeste.length, max: GAESTE_MAX })}
            </span>
          ) : null}
        </div>
        {mitglieder.loading && !liste ? (
          <Loading label={t('siedlung.mitglieder_laedt')} />
        ) : mitglieder.error ? (
          <ErrorBox error={mitglieder.error} onRetry={mitglieder.reload} />
        ) : !liste ? (
          <Loading label={t('siedlung.mitglieder_laedt')} />
        ) : (
          <>
            {besitzer && gaeste.length === 0 ? (
              <p role="status" className="text-sm text-muted">
                {t('siedlung.mitglieder_leer')}
              </p>
            ) : null}
            <ul className="divide-y divide-line overflow-hidden rounded-karte border border-line">
              {liste.map((m) => {
                const name = m.name || '?'
                const binIch = m.user_id === ich
                return (
                  <li key={m.user_id} data-mitglied={m.rolle} className="px-3 py-2">
                    <div className="flex items-center gap-3">
                      <Avatar name={name} size={34} />
                      <span dir="auto" className="min-w-0 flex-1 truncate font-bold text-ink">
                        {name}
                      </span>
                      {binIch ? <Badge>{t('siedlung.du')}</Badge> : null}
                      <Badge>{t(rolleName(m.rolle))}</Badge>
                      {/* Entfernen nur Gaeste; wer im Umzug ist, bleibt (E87b). */}
                      {besitzer && m.rolle === 'gast' && !binIch ? (
                        <IconButton
                          size="sm"
                          tone="danger"
                          label={t('siedlung.entfernen_name', { name })}
                          aria-expanded={frage === m.user_id}
                          disabled={laeuft}
                          onClick={() => setFrage((v) => (v === m.user_id ? null : m.user_id))}
                        >
                          <UserMinus size={17} />
                        </IconButton>
                      ) : null}
                    </div>
                    {frage === m.user_id ? (
                      <div role="group" aria-label={t('siedlung.entfernen_name', { name })} className="mt-2 rounded-knopf bg-danger/8 p-2">
                        <p dir="auto" className="text-sm text-ink">
                          {t('siedlung.entfernen_frage', { name })}
                        </p>
                        <div className="mt-2 flex flex-wrap justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setFrage(null)} disabled={laeuft}>
                            {t('aktion.abbrechen')}
                          </Button>
                          <Button size="sm" variant="danger" loading={laeuft} onClick={() => void entfernen(m)}>
                            {t('siedlung.entfernen')}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </section>

      {!besitzer && !ichImUmzug ? (
        <div className="border-t border-line pt-4">
          {frage === 'ich' ? (
            <div role="group" aria-label={t('siedlung.verlassen')} className="rounded-knopf bg-danger/8 p-3">
              <p dir="auto" className="text-sm text-ink">
                {t('siedlung.verlassen_frage', { name: siedlungName || t('siedlung.titel') })}
              </p>
              <div className="mt-2 flex flex-wrap justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setFrage(null)} disabled={laeuft}>
                  {t('aktion.abbrechen')}
                </Button>
                <Button size="sm" variant="danger" loading={laeuft} onClick={() => void verlassen()}>
                  <LogOut size={16} className="spiegeln" /> {t('siedlung.verlassen')}
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" full onClick={() => setFrage('ich')} disabled={laeuft}>
              <LogOut size={18} className="spiegeln" /> {t('siedlung.verlassen')}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  )
}
