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
import { supabase, errText, pruefClientAnlegen } from './supabase'
import { appUrl } from './util'
import { pruefeLook } from './avatar'
import { tg } from './i18n'
import {
  linkVerbraucht,
  wiederherstellungAktiv,
  wiederherstellungBeenden,
  wiederherstellungMelden,
} from './linkstand'
import type { Profile } from './types'

/** Ergebnis von "Passwort vergessen". Ob es zur Adresse ein Konto gibt,
 *  steht absichtlich nicht darin. */
export type ResetAnfrage = 'verschickt' | 'zu_viele' | 'keine_verbindung'

/** Ergebnis des Knopfs "Weiter zum neuen Passwort". */
export type LinkBestaetigung =
  | { ok: true }
  | { ok: false; netz: true }
  | { ok: false; netz: false; code: string | null }

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
  neuesPasswortSetzen: (password: string) => Promise<void>
  wiederherstellungAbbrechen: () => Promise<void>
  passwortAendern: (aktuell: string, neu: string) => Promise<void>
  updateProfile: (patch: Partial<Pick<Profile, 'display_name' | 'avatar_path' | 'avatar3d'>>) => Promise<void>
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

async function linkPruefen(): Promise<{ fehlerCode: string | null }> {
  let fehlerCode: string | null = null
  try {
    const { error } = await supabase.auth.initialize()
    if (error) fehlerCode = (error as { code?: string }).code ?? 'unbekannt'
  } catch {
    fehlerCode = 'unbekannt'
  }
  /* Die Ereignisse aus dem Start (PASSWORD_RECOVERY) verteilt der Client
   * gleich nach dem Ende der Initialisierung. Einen Takt warten, damit der
   * Merker steht, bevor die Seite entscheidet. Kommt es spaeter, zeigt die
   * Seite das Formular trotzdem, sie haengt am Merker. */
  await new Promise((r) => setTimeout(r, 0))
  return { fehlerCode }
}

/* Erst der Klick loest den Link ein, nicht das Oeffnen der Seite. So
 * verbraucht ein Mail-Scanner, der Links vorab aufruft, ihn nicht, und es
 * klappt auch auf einem anderen Geraet als dem, auf dem er angefordert
 * wurde. */
async function wiederherstellungBestaetigen(tokenHash: string): Promise<LinkBestaetigung> {
  try {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
    if (error) {
      if (istNetzfehler(error)) return { ok: false, netz: true }
      linkVerbraucht()
      return { ok: false, netz: false, code: error.code ?? null }
    }
  } catch (err) {
    if (istNetzfehler(err)) return { ok: false, netz: true }
    linkVerbraucht()
    return { ok: false, netz: false, code: null }
  }
  // Das Ereignis setzt den Merker schon; das hier nur, falls es fehlt.
  wiederherstellungMelden()
  linkVerbraucht()
  return { ok: true }
}

/** Andere Geraete abmelden. Ein Fehler hier haelt nichts auf: das neue
 *  Passwort steht dann schon. */
async function andereGeraeteAbmelden(): Promise<void> {
  try {
    const { error } = await supabase.auth.signOut({ scope: 'others' })
    if (error) console.warn('[passwort] Andere Geraete nicht abgemeldet:', error.code ?? error.status)
  } catch (err) {
    console.warn('[passwort] Andere Geraete nicht abgemeldet:', err instanceof Error ? err.name : err)
  }
}

async function neuesPasswortSetzen(password: string): Promise<void> {
  // Nur nach einem in diesem Seitenaufruf eingeloesten Link.
  if (!wiederherstellungAktiv()) throw new Error(tg('konto.link_fehler'))
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw new Error(errText(error))
  await andereGeraeteAbmelden()
}

async function wiederherstellungAbbrechen(): Promise<void> {
  /* Nur diese Sitzung beenden. Schlaegt das fehl, bleibt der Merker an:
   * sonst waere man mit der Sitzung aus dem Link doch normal angemeldet. */
  const { error } = await supabase.auth.signOut({ scope: 'local' })
  if (error) throw new Error(errText(error))
  linkVerbraucht()
  wiederherstellungBeenden()
}

/** Das aktuelle Passwort pruefen, ohne die echte Sitzung anzufassen: mit
 *  einem eigenen Wegwerf-Client anmelden und gleich wieder abmelden. */
async function aktuellesPasswortPruefen(email: string, passwort: string): Promise<void> {
  const probe = pruefClientAnlegen()
  try {
    const { error } = await probe.auth.signInWithPassword({ email, password: passwort })
    if (error) {
      if (error.code === 'invalid_credentials' || error.message === 'Invalid login credentials') {
        throw new Error(tg('fehler.passwort_aktuell_falsch'))
      }
      throw new Error(errText(error))
    }
    const { error: abmelden } = await probe.auth.signOut({ scope: 'local' })
    if (abmelden) console.warn('[passwort] Probe-Sitzung nicht beendet:', abmelden.code ?? abmelden.status)
  } finally {
    await probe.auth.dispose().catch(() => undefined)
  }
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
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (error) throw new Error(errText(error))
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
      async passwortAendern(aktuell, neu) {
        const email = session?.user?.email
        if (!email) throw new Error(tg('fehler.sitzung_weg'))
        // Erst das aktuelle Passwort, sonst reicht ein offen liegendes Geraet.
        await aktuellesPasswortPruefen(email, aktuell)
        /* current_password kennt auth-js 2.116 (UserAttributes). Der Server
         * prueft es zusaetzlich, wenn das im Projekt eingeschaltet ist. Die
         * Pruefung, auf die sich die App verlaesst, ist die Probe darueber. */
        const { error } = await supabase.auth.updateUser({ password: neu, current_password: aktuell })
        if (error) throw new Error(errText(error))
        await andereGeraeteAbmelden()
      },
      async updateProfile(patch) {
        if (!session?.user) throw new Error('Nicht angemeldet')
        /* Die Figur (E82) prueft die Datenbank selbst (0043). Vorher hier
         * dieselbe Regel, damit ein kaputter Look gar nicht erst losgeht. */
        if (patch.avatar3d != null && !pruefeLook(patch.avatar3d)) {
          throw new Error(tg('fehler.figur_ungueltig'))
        }
        const { data, error } = await supabase
          .from('profiles')
          .update(patch)
          .eq('id', session.user.id)
          .select('*')
          .single()
        if (error) {
          const roh = `${error.message ?? ''} ${error.details ?? ''}`
          // CHECK aus 0043 abgelehnt.
          if (roh.includes('profiles_avatar3d_ok')) throw new Error(tg('fehler.figur_ungueltig'))
          // Spalte fehlt: Migration 0043 ist noch nicht eingespielt.
          if ('avatar3d' in patch && (error.code === 'PGRST204' || roh.includes("'avatar3d' column"))) {
            throw new Error(tg('fehler.figur_spalte_fehlt'))
          }
          throw new Error(errText(error))
        }
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
