import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthShell } from '../components/AuthShell'
import { Button, ErrorBox, Field, Loading, PasswordInput } from '../components/ui'
import { useAuth } from '../lib/auth'
import { useT } from '../lib/i18n'
import { passwortGenug } from '../lib/passwort'
import {
  linkAusAdresseEntfernen,
  linkStand,
  useWiederherstellung,
  wiederherstellungBeenden,
} from '../lib/linkstand'

/* Neues Passwort ueber den Link aus der Mail.
 *
 * Das Formular erscheint NUR, wenn dieser Tab in diesem Seitenaufruf eine
 * Wiederherstellung eingeloest hat (Merker aus linkstand; ein
 * PASSWORD_RECOVERY aus einem anderen Tab zaehlt nicht). Nur angemeldet
 * sein reicht nie. Im Formular steht, fuer welches Konto das neue Passwort
 * gilt; war vor dem Klick ein anderes Konto angemeldet, sagt ein Hinweis
 * das deutlich.
 *
 * Reihenfolge, nachdem der Client die Adresse ausgewertet hat (pruefen):
 *   Merker gesetzt                    Formular (auch, solange Speichern
 *                                     oder Abbrechen noch laeuft)
 *   Merker war an, ist aus            Vorgang beendet (anderer Tab hat
 *                                     abgemeldet oder ein Passwort gesetzt)
 *   (a) error/error_code im Link,     Meldung und "Neuen Link anfordern"
 *       ?code= nicht einloesbar oder
 *       der Klick auf (b) schlug fehl
 *   (b) token_hash mit type=recovery  Knopf "Weiter zum neuen Passwort";
 *                                     erst der Klick ruft verifyOtp
 *   (d) ?code= ohne Einloesen         im selben Browser oeffnen
 *   (e) nichts                        ungueltig; wer angemeldet ist,
 *                                     wird zu den Einstellungen geschickt
 */

const ABGELAUFEN = new Set(['otp_expired', 'flow_state_expired', 'flow_state_not_found', 'bad_code_verifier'])

type Fehlerart = 'abgelaufen' | 'anderer_browser' | 'allgemein'

function fehlerart(code: string | null): Fehlerart {
  if (code && ABGELAUFEN.has(code)) return 'abgelaufen'
  if (code === 'pkce_code_verifier_not_found') return 'anderer_browser'
  return 'allgemein'
}

export default function ResetConfirm() {
  const { session, linkPruefen, wiederherstellungBestaetigen, neuesPasswortSetzen, wiederherstellungAbbrechen } =
    useAuth()
  const nav = useNavigate()
  const t = useT()
  const aktiv = useWiederherstellung()
  // Einmal beim ersten Rendern gelesen; danach aendert sich der Stand nicht.
  const [stand] = useState(linkStand)

  const [geprueft, setGeprueft] = useState(false)
  const [startFehler, setStartFehler] = useState<string | null>(null)
  const [klickFehler, setKlickFehler] = useState<Fehlerart | null>(null)
  const [netzFehler, setNetzFehler] = useState(false)
  const [busyWeiter, setBusyWeiter] = useState(false)

  // Nach dem Klick: zu welchem Konto der Link gehoert und ob vorher ein anderes angemeldet war.
  const [bestaetigt, setBestaetigt] = useState<{ email: string | null; anderesKonto: boolean } | null>(null)
  /* War der Merker auf dieser Seite schon einmal an? Beim Rendern
   * nachgezogen statt in einem Effekt (React: Wert aus frueheren Renders). */
  const [warAktiv, setWarAktiv] = useState(false)
  if (aktiv && !warAktiv) setWarAktiv(true)

  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [andereAbgemeldet, setAndereAbgemeldet] = useState(true)
  const [busy, setBusy] = useState(false)
  const [busyAbbrechen, setBusyAbbrechen] = useState(false)

  useEffect(() => {
    let alive = true
    void linkPruefen().then(({ fehlerCode }) => {
      if (!alive) return
      setStartFehler(fehlerCode)
      setGeprueft(true)
      /* Erst jetzt aufraeumen: einen ?code= hat der Client bis hierher
       * eingeloest (und selbst entfernt) oder gar nicht angefasst. */
      linkAusAdresseEntfernen()
    })
    return () => {
      alive = false
    }
  }, [linkPruefen])

  async function weiter() {
    if (!stand.tokenHash) return
    setBusyWeiter(true)
    setNetzFehler(false)
    try {
      const r = await wiederherstellungBestaetigen(stand.tokenHash)
      if (r.ok) {
        setBestaetigt({ email: r.email, anderesKonto: r.anderesKonto })
        return
      }
      if (r.netz) setNetzFehler(true)
      else setKlickFehler(fehlerart(r.code))
    } finally {
      setBusyWeiter(false)
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!passwortGenug(password)) {
      setError(t('konto.passwort_kurz'))
      return
    }
    if (password !== repeat) {
      setError(t('konto.passwoerter_ungleich'))
      return
    }
    setBusy(true)
    try {
      const r = await neuesPasswortSetzen(password)
      setPassword('')
      setRepeat('')
      setAndereAbgemeldet(r.andereAbgemeldet)
      setOk(true)
      /* Den Merker hat USER_UPDATED schon beendet (supabase.ts); das
       * Formular blieb nur stehen, weil busy noch an war. Das hier ist nur
       * die Absicherung. */
      wiederherstellungBeenden()
      // Konnten die anderen Geraete nicht abgemeldet werden, bleibt Zeit zum Lesen.
      setTimeout(() => nav('/app', { replace: true }), r.andereAbgemeldet ? 1500 : 6000)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function abbrechen() {
    setBusyAbbrechen(true)
    setError(null)
    try {
      await wiederherstellungAbbrechen()
      nav('/login', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyAbbrechen(false)
    }
  }

  const neuerLink = (
    <Link to="/passwort-vergessen" className="mt-4 block">
      <Button variant="outline" size="lg" full>
        {t('konto.neuen_link')}
      </Button>
    </Link>
  )

  function hinweis(titel: string, text: string, unten: ReactNode = neuerLink) {
    return (
      <div className="rounded-2xl border border-warn/40 bg-warn/10 p-4">
        <p className="t-name">{titel}</p>
        <p className="mt-1.5 text-base text-ink/80">{text}</p>
        {unten}
      </div>
    )
  }

  function fehlerHinweis(art: Fehlerart) {
    if (art === 'anderer_browser') {
      return hinweis(t('konto.link_anderes_geraet_titel'), t('fehler.link_anderer_browser'))
    }
    return hinweis(
      t('konto.link_ungueltig'),
      art === 'abgelaufen' ? t('fehler.link_abgelaufen') : t('konto.link_fehler'),
    )
  }

  /* Das Formular bleibt stehen, solange Speichern oder Abbrechen laeuft:
   * USER_UPDATED (Speichern) und SIGNED_OUT (Abbrechen) beenden den Merker
   * schon mitten im Vorgang. */
  const formular = !ok && (aktiv || busy || busyAbbrechen)
  // Fuer welches Konto: nach dem Klick aus dem Link selbst, sonst aus der Sitzung.
  const kontoEmail = bestaetigt?.email ?? session?.user?.email ?? null
  // Die Adresse laeuft auch im arabischen Satz von links nach rechts.
  const kontoEmailIsoliert = kontoEmail ? '\u2068' + kontoEmail + '\u2069' : ''

  let inhalt: ReactNode
  if (ok) {
    inhalt = (
      <div className="rounded-2xl border border-ok/30 bg-ok/10 p-4" role="status">
        <p className="t-name">{t('konto.passwort_geaendert')}</p>
        <p className="mt-1.5 text-base text-ink/80">
          {andereAbgemeldet ? t('konto.andere_abgemeldet') : t('konto.andere_nicht_abgemeldet')}
        </p>
        <p className="mt-1 text-base text-ink/80">{t('konto.weiter_geht_es')}</p>
      </div>
    )
  } else if (formular) {
    inhalt = (
      <form onSubmit={onSubmit} className="space-y-5">
        {kontoEmail ? (
          <p className="t-name break-words">{t('konto.passwort_fuer', { email: kontoEmailIsoliert })}</p>
        ) : null}
        {bestaetigt?.anderesKonto ? (
          <div className="rounded-2xl border border-warn/40 bg-warn/10 p-4" role="alert">
            <p className="t-name">{t('konto.anderes_konto_titel')}</p>
            <p className="mt-1.5 text-base text-ink/80">
              {t('konto.anderes_konto_text', { email: kontoEmailIsoliert })}
            </p>
          </div>
        ) : null}
        {/* Fuer Passwort-Manager: zu welchem Konto das neue Passwort gehoert. */}
        <input
          type="email"
          name="username"
          autoComplete="username"
          value={kontoEmail ?? ''}
          readOnly
          hidden
        />
        <Field label={t('konto.neues_passwort')} hint={t('konto.passwort_min')}>
          <PasswordInput
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Field label={t('konto.passwort_nochmal')}>
          <PasswordInput
            autoComplete="new-password"
            required
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
          />
        </Field>
        {error ? <ErrorBox error={error} /> : null}
        <Button type="submit" full size="lg" loading={busy} disabled={busyAbbrechen}>
          {t('konto.passwort_speichern')}
        </Button>
      </form>
    )
  } else if (warAktiv) {
    // Der Vorgang lief schon und wurde anderswo beendet (anderer Tab).
    inhalt = hinweis(t('konto.link_beendet_titel'), t('konto.link_beendet_text'))
  } else if (!geprueft) {
    inhalt = <Loading label={t('konto.link_wird_geprueft')} />
  } else if (klickFehler) {
    inhalt = fehlerHinweis(klickFehler)
  } else if (stand.error || stand.errorCode) {
    inhalt = fehlerHinweis(fehlerart(stand.errorCode))
  } else if (stand.code && startFehler) {
    inhalt = fehlerHinweis(fehlerart(startFehler))
  } else if (stand.tokenHash && stand.type === 'recovery') {
    inhalt = (
      <div className="space-y-4">
        <p className="text-base text-ink/80">{t('konto.link_weiter_text')}</p>
        {netzFehler ? <ErrorBox error={t('fehler.keine_verbindung')} /> : null}
        <Button type="button" full size="lg" loading={busyWeiter} onClick={() => void weiter()}>
          {t('konto.link_weiter')}
        </Button>
      </div>
    )
  } else if (stand.code) {
    inhalt = hinweis(t('konto.link_anderes_geraet_titel'), t('fehler.link_anderer_browser'))
  } else if (session) {
    // Normal angemeldet, aber ohne gueltigen Link: das Passwort aendert
    // man in den Einstellungen, mit dem aktuellen Passwort.
    inhalt = hinweis(
      t('konto.link_ungueltig'),
      t('konto.angemeldet_einstellungen'),
      <Link to="/app/einstellungen" className="mt-4 block">
        <Button variant="outline" size="lg" full>
          {t('konto.zu_den_einstellungen')}
        </Button>
      </Link>,
    )
  } else {
    inhalt = hinweis(t('konto.link_ungueltig'), t('konto.link_ungueltig_text'))
  }

  let fuss: ReactNode = null
  if (formular) {
    // Ohne neues Passwort raus: nur diese Sitzung beenden. Nicht mitten im Speichern.
    fuss = (
      <Button
        type="button"
        variant="outline"
        size="lg"
        loading={busyAbbrechen}
        disabled={busy}
        onClick={() => void abbrechen()}
      >
        {t('konto.abbrechen_abmelden')}
      </Button>
    )
  } else if (!ok) {
    fuss = (
      <Link to="/login" className="inline-block">
        <Button type="button" variant="outline" size="lg">
          {t('konto.zurueck_anmeldung')}
        </Button>
      </Link>
    )
  }

  return (
    <AuthShell
      title={t('konto.neues_passwort')}
      subtitle={formular ? t('konto.neues_passwort_unter') : undefined}
      footer={fuss}
    >
      {inhalt}
    </AuthShell>
  )
}
