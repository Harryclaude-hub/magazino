import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, errText, startAusgewertet } from './supabase'
import { appUrl } from './util'
import { loginZuEmail } from './konto'
import { tg } from './i18n'
import {
  eigenesEinloesenBeginnen,
  eigenesEinloesenEnde,
  linkVerbraucht,
  wiederherstellungAktiv,
  wiederherstellungBeenden,
} from './linkstand'
import type { Profile } from './types'

/** Ergebnis von "Passwort vergessen". Ob es zur Adresse ein Konto gibt,
 *  steht absichtlich nicht darin. */
export type ResetAnfrage = 'verschickt' | 'zu_viele' | 'keine_verbindung'

/** Ergebnis des Knopfs "Weiter zum neuen Passwort". email: das Konto aus
 *  dem Link. anderesKonto: vorher war hier ein ANDERES Konto angemeldet. */
type LinkBestaetigung =
  | { ok: true; email: string | null; anderesKonto: boolean }
  | { ok: false; netz: true }
  | { ok: false; netz: false; code: string | null }

/** Nach dem neuen Passwort: ob die anderen Geraete wirklich abgemeldet
 *  sind. false heisst, das Passwort steht, das Abmelden schlug fehl. */
interface PasswortGesetzt {
  andereAbgemeldet: boolean
}

interface AuthValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  ready: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName?: string) => Promise<{ needsConfirm: boolean }>
  signOut: () => Promise<void>
  sendReset: (email: string) => Promise<ResetAnfrage>
  /** Wartet, bis der Client die Adresse beim Start ausgewertet hat. Liefert
   *  den Fehlercode, wenn er einen ?code= nicht einloesen konnte. */
  linkPruefen: () => Promise<{ fehlerCode: string | null }>
  wiederherstellungBestaetigen: (tokenHash: string) => Promise<LinkBestaetigung>
  neuesPasswortSetzen: (password: string) => Promise<PasswortGesetzt>
  wiederherstellungAbbrechen: () => Promise<void>
  passwortAendern: (neu: string) => Promise<PasswortGesetzt>
  updateProfile: (patch: Partial<Pick<Profile, 'display_name' | 'avatar_path'>>) => Promise<void>
  refreshProfile: () => Promise<void>
}

const Ctx = createContext<AuthValue | null>(null)

/* ------------------------------------------------------- Passwort-Wege
 * Die Wege rund ums Passwort brauchen keinen Zustand aus React, darum
 * stehen sie hier ausserhalb des Providers. */

function istNetzfehler(err: unknown): boolean {
  if (err instanceof TypeError) return true
  const e = err as { name?: string; status?: number } | null
  return Boolean(e && e.name === 'AuthRetryableFetchError' && !e.status)
}

async function linkAnfordern(email: string): Promise<ResetAnfrage> {
  let fehler: unknown = null
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: appUrl('passwort-neu'),
    })
    fehler = error
  } catch (err) {
    fehler = err
  }
  if (!fehler) return 'verschickt'
  const f = fehler as { status?: number; code?: string }
  if (f.status === 429 || f.code === 'over_email_send_rate_limit' || f.code === 'over_request_rate_limit') {
    return 'zu_viele'
  }
  if (istNetzfehler(fehler)) return 'keine_verbindung'
  /* Alles andere sieht fuer den Nutzer aus wie verschickt. Sonst liesse
   * sich an der Antwort ablesen, ob es zur Adresse ein Konto gibt. In der
   * Konsole steht nur der Code, nie die Adresse. */
  console.warn('[passwort] Link anfordern abgelehnt:', f.code ?? f.status ?? 'unbekannt')
  return 'verschickt'
}

/* Die Auswertung der Adresse beim Start und das Schliessen des
 * Startfensters stehen in supabase.ts (startAusgewertet), damit sie auf
 * jeder Seite laufen. Die Seite Passwort neu wartet nur darauf. */
function linkPruefen(): Promise<{ fehlerCode: string | null }> {
  return startAusgewertet
}

/** Wer ist auf diesem Geraet gerade angemeldet? Nur die Kennung. */
async function angemeldeteKennung(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession()
    return data.session?.user?.id ?? null
  } catch {
    return null
  }
}

/* Erst der Klick loest den Link ein, nicht das Oeffnen der Seite. So
 * verbraucht ein Mail-Scanner, der Links vorab aufruft, ihn nicht, und es
 * klappt auch auf einem anderen Geraet als dem, auf dem er angefordert
 * wurde.
 *
 * Vorher merken, wer hier angemeldet war: verifyOtp ersetzt diese Sitzung
 * durch die aus dem Link. Gehoert der Link zu einem anderen Konto, sagt die
 * Seite das deutlich, statt still das Passwort eines fremden Kontos setzen
 * zu lassen.
 *
 * Um verifyOtp herum ist die Erwartung offen: nur in diesem Fenster zaehlt
 * PASSWORD_RECOVERY (linkstand). */
async function wiederherstellungBestaetigen(tokenHash: string): Promise<LinkBestaetigung> {
  const vorher = await angemeldeteKennung()
  const erwartung = eigenesEinloesenBeginnen()
  let eingeloest = false
  try {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
    if (error) {
      if (istNetzfehler(error)) return { ok: false, netz: true }
      linkVerbraucht()
      return { ok: false, netz: false, code: error.code ?? null }
    }
    const sitzung = data.session
    if (!sitzung) {
      // Ohne Sitzung laesst sich kein Passwort setzen.
      linkVerbraucht()
      return { ok: false, netz: false, code: null }
    }
    eingeloest = true
    linkVerbraucht()
    return {
      ok: true,
      email: sitzung.user?.email ?? data.user?.email ?? null,
      anderesKonto: vorher !== null && vorher !== sitzung.user?.id,
    }
  } catch (err) {
    if (istNetzfehler(err)) return { ok: false, netz: true }
    linkVerbraucht()
    return { ok: false, netz: false, code: null }
  } finally {
    eigenesEinloesenEnde(erwartung, eingeloest)
  }
}

/** Andere Geraete abmelden. Ein Fehler hier haelt nichts auf, das neue
 *  Passwort steht dann schon. Aber er wird gemeldet (false), damit die
 *  Seite nicht behauptet, die anderen Geraete seien abgemeldet. */
async function andereGeraeteAbmelden(): Promise<boolean> {
  try {
    const { error } = await supabase.auth.signOut({ scope: 'others' })
    if (!error) return true
    console.warn('[passwort] Andere Geraete nicht abgemeldet:', error.code ?? error.status)
  } catch (err) {
    console.warn('[passwort] Andere Geraete nicht abgemeldet:', err instanceof Error ? err.name : err)
  }
  return false
}

async function neuesPasswortSetzen(password: string): Promise<PasswortGesetzt> {
  // Nur nach einem in diesem Seitenaufruf eingeloesten Link.
  if (!wiederherstellungAktiv()) throw new Error(tg('konto.link_fehler'))
  /* updateUser meldet USER_UPDATED, das beendet den Merker schon hier
   * (supabase.ts). Die Seite haelt das Formular, bis das hier fertig ist. */
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw new Error(errText(error))
  return { andereAbgemeldet: await andereGeraeteAbmelden() }
}

async function wiederherstellungAbbrechen(): Promise<void> {
  /* Nur diese Sitzung beenden. Schlaegt das fehl, bleibt der Merker an:
   * sonst waere man mit der Sitzung aus dem Link doch normal angemeldet. */
  const { error } = await supabase.auth.signOut({ scope: 'local' })
  if (error) throw new Error(errText(error))
  linkVerbraucht()
  wiederherstellungBeenden()
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [ready, setReady] = useState(false)

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (error) {
      console.warn('[auth] Profil konnte nicht geladen werden:', error.message)
      return
    }
    if (data) {
      setProfile(data as Profile)
      return
    }
    // Der Trigger legt das Profil an. Fehlt es trotzdem, hier nachziehen,
    // statt die App ohne Profil weiterlaufen zu lassen.
    const { data: created } = await supabase
      .from('profiles')
      .insert({ id: userId })
      .select('*')
      .maybeSingle()
    if (created) setProfile(created as Profile)
  }, [])

  useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return
      setSession(data.session)
      setReady(true)
      if (data.session?.user) void loadProfile(data.session.user.id)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      if (next?.user) void loadProfile(next.user.id)
      else setProfile(null)
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  const value = useMemo<AuthValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      ready,
      /* Der Parameter heisst email, ist aber E-Mail ODER Benutzername. Die
       * Umrechnung (loginZuEmail) steht nur hier. Falsche Daten melden immer
       * denselben Satz, egal ob es den Namen gibt. */
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({
          email: loginZuEmail(email),
          password,
        })
        if (error) {
          if (error.code === 'invalid_credentials' || error.message === 'Invalid login credentials') {
            throw new Error(tg('konto.login_falsch'))
          }
          throw new Error(errText(error))
        }
      },
      async signUp(email, password, displayName) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: displayName?.trim() ? { display_name: displayName.trim() } : undefined,
            emailRedirectTo: appUrl('login'),
          },
        })
        if (error) throw new Error(errText(error))
        // Ohne Session heisst: das Projekt verlangt noch eine Bestaetigung.
        return { needsConfirm: !data.session }
      },
      async signOut() {
        const { error } = await supabase.auth.signOut()
        if (error) throw new Error(errText(error))
      },
      sendReset: linkAnfordern,
      linkPruefen,
      wiederherstellungBestaetigen,
      neuesPasswortSetzen,
      wiederherstellungAbbrechen,
      async passwortAendern(neu) {
        /* Angemeldet reicht (E110): das aktuelle Passwort wird weder gezeigt
         * noch abgefragt, nur ein neues gesetzt. War es ein Startpasswort vom
         * Admin (passwort_aendern), faellt der Merker im selben Aufruf:
         * entweder beides oder nichts. */
        if (!session?.user) throw new Error(tg('fehler.sitzung_weg'))
        const zwang = session.user.user_metadata?.passwort_aendern === true
        const { error } = await supabase.auth.updateUser({
          password: neu,
          ...(zwang ? { data: { passwort_aendern: false } } : {}),
        })
        if (error) throw new Error(errText(error))
        return { andereAbgemeldet: await andereGeraeteAbmelden() }
      },
      async updateProfile(patch) {
        if (!session?.user) throw new Error('Nicht angemeldet')
        const { data, error } = await supabase
          .from('profiles')
          .update(patch)
          .eq('id', session.user.id)
          .select('*')
          .single()
        if (error) throw new Error(errText(error))
        setProfile(data as Profile)
      },
      async refreshProfile() {
        if (session?.user) await loadProfile(session.user.id)
      },
    }),
    [session, profile, ready, loadProfile],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth ausserhalb von AuthProvider benutzt')
  return v
}

export function displayNameOf(p: Profile | null | undefined, fallback = 'Unbekannt'): string {
  if (!p) return fallback
  return p.display_name?.trim() || p.email?.split('@')[0] || fallback
}
