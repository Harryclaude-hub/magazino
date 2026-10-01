import { Component, lazy, Suspense, useId, useMemo, useState, type ReactNode } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import { displayNameOf, useAuth } from '../lib/auth'
import {
  FARBEN,
  GROESSE_MAX,
  GROESSE_MIN,
  GROESSE_STANDARD,
  HAARFORMEN,
  STATUREN,
  gleicherLook,
  pruefeLook,
  standardLook,
  type Haarform,
  type Statur,
} from '../lib/avatar'
import { useT } from '../lib/i18n'
import type { Avatar3D } from '../lib/types'
import { contrastOn, cx } from '../lib/util'
import { Button, ErrorBox, Spinner, Switch, useToast } from './ui'

/* "Meine Figur in der Wohnung" (E82): so sieht man fuer die anderen aus,
 * wenn man gemeinsam in 3D durch die Wohnung geht. Steht in der Profilkarte
 * der Einstellungen unter dem Anzeigenamen.
 *
 * Der Entwurf beginnt beim gespeicherten Look (oder der Standardfigur aus
 * der eigenen Kennung) und springt dorthin zurueck, sobald sich der
 * gespeicherte Look aendert (gespeichert, anderes Konto). Gespeichert wird
 * erst mit dem Knopf. Die 3D-Vorschau ist ein eigener Code-Teil (three),
 * geladen per lazy() wie in plan3d/oeffnen.tsx. */

let Vorschau = lazy(() => import('./plan3d/AvatarVorschau'))

class Fang extends Component<{ children: ReactNode; fallback: (fehler: Error) => ReactNode }, { fehler: Error | null }> {
  state: { fehler: Error | null } = { fehler: null }
  static getDerivedStateFromError(fehler: Error) {
    return { fehler }
  }
  render() {
    return this.state.fehler ? this.props.fallback(this.state.fehler) : this.props.children
  }
}

const FRISUR_KEY: Record<Haarform, string> = {
  kurz: 'einstellungen.figur_frisur_kurz',
  lang: 'einstellungen.figur_frisur_lang',
  zopf: 'einstellungen.figur_frisur_zopf',
  glatze: 'einstellungen.figur_frisur_glatze',
  locken: 'einstellungen.figur_frisur_locken',
}

const STATUR_KEY: Record<Statur, string> = {
  schmal: 'einstellungen.figur_statur_schmal',
  mittel: 'einstellungen.figur_statur_mittel',
  breit: 'einstellungen.figur_statur_breit',
}

/** Ueberschrift einer Auswahl, gleich gesetzt wie Field. */
function Titel({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="mb-2 text-[0.9375rem] font-bold">
      {children}
    </p>
  )
}

/** Farbtupfer zum Antippen. Der gewaehlte traegt einen Haken, damit die
 *  Wahl nicht nur an der Farbe haengt. */
function Farbwahl({
  titel,
  farben,
  wert,
  onWahl,
}: {
  titel: string
  farben: readonly string[]
  wert: string
  onWahl: (farbe: string) => void
}) {
  const t = useT()
  const id = useId()
  return (
    <div>
      <Titel id={id}>{titel}</Titel>
      <div role="group" aria-labelledby={id} className="flex flex-wrap gap-2">
        {farben.map((f, i) => {
          const an = f.toLowerCase() === wert.toLowerCase()
          return (
            <button
              key={f}
              type="button"
              aria-pressed={an}
              aria-label={t('einstellungen.figur_farbe', { n: i + 1, von: farben.length })}
              title={t('einstellungen.figur_farbe', { n: i + 1, von: farben.length })}
              onClick={() => onWahl(f)}
              className={cx(
                'flex h-11 w-11 items-center justify-center rounded-full border-2 transition',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
                an ? 'border-ink ring-2 ring-ink ring-offset-2 ring-offset-surface' : 'border-black/15 hover:border-ink/50',
              )}
              style={{ background: f }}
            >
              {an ? <Check size={20} strokeWidth={3} color={contrastOn(f)} aria-hidden="true" /> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Knopfreihe fuer eine Auswahl aus Woertern (Frisur, Statur). */
function Wortwahl<W extends string>({
  titel,
  werte,
  wert,
  schluessel,
  onWahl,
}: {
  titel: string
  werte: readonly W[]
  wert: W
  schluessel: Record<W, string>
  onWahl: (w: W) => void
}) {
  const t = useT()
  const id = useId()
  return (
    <div>
      <Titel id={id}>{titel}</Titel>
      <div role="group" aria-labelledby={id} className="flex flex-wrap gap-2">
        {werte.map((w) => (
          <button
            key={w}
            type="button"
            aria-pressed={wert === w}
            onClick={() => onWahl(w)}
            className={cx(
              'min-h-11 min-w-0 rounded-xl border-2 px-3.5 py-2 text-base font-bold leading-tight transition',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
              wert === w ? 'border-ink bg-ink text-paper' : 'border-line hover:bg-raised',
            )}
          >
            {t(schluessel[w])}
          </button>
        ))}
      </div>
    </div>
  )
}

export function AvatarEditor() {
  const { user, profile, updateProfile } = useAuth()
  const t = useT()
  const toast = useToast()
  const uid = user?.id ?? ''
  const name = displayNameOf(profile, '')

  // Was gespeichert ist (gelesen wie in der Datenbank), sonst die Standardfigur.
  const gespeichert = useMemo(() => pruefeLook(profile?.avatar3d ?? null), [profile?.avatar3d])
  const ausgang = useMemo(() => gespeichert ?? standardLook(uid), [gespeichert, uid])
  // Fester Schluessel statt Objekt: ein neu geladenes Profil mit demselben
  // Look setzt den Entwurf nicht zurueck, ein anderer Look schon.
  const ausgangKey = `${uid}|${JSON.stringify(ausgang)}`

  const [entwurf, setEntwurf] = useState<Avatar3D>(ausgang)
  const [stand, setStand] = useState(ausgangKey)
  const [speichert, setSpeichert] = useState(false)
  const [versuch, setVersuch] = useState(0)

  // Zuruecksetzen schon beim Rendern (nicht erst im Effekt), damit nie
  // kurz der alte Entwurf zu sehen ist.
  if (stand !== ausgangKey) {
    setStand(ausgangKey)
    setEntwurf(ausgang)
  }

  const geaendert = !gespeichert || !gleicherLook(entwurf, gespeichert)
  const istStandard = gleicherLook(entwurf, standardLook(uid))
  const setze = (patch: Partial<Avatar3D>) => setEntwurf((e) => ({ ...e, ...patch }))
  const groesse = entwurf.groesse_cm ?? GROESSE_STANDARD
  const titelId = useId()
  const groesseId = useId()

  async function speichern() {
    const sauber = pruefeLook(entwurf)
    if (!sauber) {
      toast(t('fehler.figur_ungueltig'), 'error')
      return
    }
    setSpeichert(true)
    try {
      await updateProfile({ avatar3d: sauber })
      toast(t('einstellungen.figur_gespeichert'), 'ok')
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error')
    } finally {
      setSpeichert(false)
    }
  }

  return (
    <section aria-labelledby={titelId} className="mt-6 border-t-2 border-line pt-5">
      <h3 id={titelId} className="t-name">
        {t('einstellungen.figur')}
      </h3>
      <p className="t-sub mt-1">{t('einstellungen.figur_hinweis')}</p>

      <div className="mt-4 grid gap-5 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
        {/* Vorschau: Laden, Fehler (mit Nochmal), dann die Figur. */}
        <div className="relative h-64 overflow-hidden rounded-xl border-2 border-line" style={{ background: 'var(--plan-grund)' }}>
          <Fang
            key={versuch}
            fallback={(e) => (
              <div className="p-3">
                <ErrorBox
                  error={t('einstellungen.figur_vorschau_fehler', { fehler: e.message })}
                  onRetry={() => {
                    // Ein neuer Versuch braucht ein neues lazy(), das alte merkt sich den Fehler.
                    Vorschau = lazy(() => import('./plan3d/AvatarVorschau'))
                    setVersuch((v) => v + 1)
                  }}
                />
              </div>
            )}
          >
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center gap-2 p-3 text-sm text-muted">
                  <Spinner /> {t('einstellungen.figur_laedt')}
                </div>
              }
            >
              <Vorschau look={entwurf} name={name} />
            </Suspense>
          </Fang>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Farbwahl titel={t('einstellungen.figur_haut')} farben={FARBEN.haut} wert={entwurf.haut} onWahl={(haut) => setze({ haut })} />
          <Farbwahl titel={t('einstellungen.figur_haare')} farben={FARBEN.haare} wert={entwurf.haare} onWahl={(haare) => setze({ haare })} />
          <Wortwahl
            titel={t('einstellungen.figur_frisur')}
            werte={HAARFORMEN}
            wert={entwurf.haarform}
            schluessel={FRISUR_KEY}
            onWahl={(haarform) => setze({ haarform })}
          />
          <Farbwahl titel={t('einstellungen.figur_oben')} farben={FARBEN.kleidung} wert={entwurf.oben} onWahl={(oben) => setze({ oben })} />
          <Farbwahl titel={t('einstellungen.figur_unten')} farben={FARBEN.kleidung} wert={entwurf.unten} onWahl={(unten) => setze({ unten })} />
          <Farbwahl titel={t('einstellungen.figur_schuhe')} farben={FARBEN.kleidung} wert={entwurf.schuhe} onWahl={(schuhe) => setze({ schuhe })} />

          <div>
            <label htmlFor={groesseId} className="mb-2 flex items-baseline justify-between gap-3 text-[0.9375rem] font-bold">
              <span>{t('einstellungen.figur_groesse')}</span>
              <span className="tabular-nums">{t('einstellungen.figur_groesse_wert', { cm: groesse })}</span>
            </label>
            <input
              id={groesseId}
              type="range"
              min={GROESSE_MIN}
              max={GROESSE_MAX}
              step={1}
              value={groesse}
              aria-valuetext={t('einstellungen.figur_groesse_wert', { cm: groesse })}
              onChange={(e) => setze({ groesse_cm: Number(e.target.value) })}
              className="h-11 w-full cursor-pointer accent-accent"
            />
          </div>

          <Wortwahl
            titel={t('einstellungen.figur_statur')}
            werte={STATUREN}
            wert={entwurf.statur ?? 'mittel'}
            schluessel={STATUR_KEY}
            onWahl={(statur) => setze({ statur })}
          />

          <div className="border-t border-line pt-1">
            <Switch checked={entwurf.brille ?? false} onChange={(brille) => setze({ brille })} label={t('einstellungen.figur_brille')} />
          </div>
        </div>
      </div>

      {!gespeichert ? <p className="t-sub mt-4">{t('einstellungen.figur_ungespeichert')}</p> : null}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button size="lg" className="w-full justify-center sm:w-auto" loading={speichert} disabled={!geaendert} onClick={() => void speichern()}>
          {t('einstellungen.figur_speichern')}
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="w-full justify-center sm:w-auto"
          disabled={istStandard || speichert}
          onClick={() => setEntwurf(standardLook(uid))}
        >
          <RotateCcw size={18} aria-hidden="true" /> {t('einstellungen.figur_standard')}
        </Button>
      </div>
    </section>
  )
}
