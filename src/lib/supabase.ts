import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { tg, type Vars } from './i18n'
/* Muss vor createClient geladen sein: linkstand liest die Adresse, bevor
 * der Client einen Passwort-Link einloest und die Parameter entfernt. */
import { startEinloesenFertig, wiederherstellungBeenden, wiederherstellungMelden } from './linkstand'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/* Fehlt die Konfiguration, wird das sichtbar gemeldet statt als leere
 * weisse Seite zu enden. Stiller Fehlschlag ist hier verboten.
 *
 * Dieser eine Satz bleibt deutsch. Er wird beim Laden des Moduls berechnet,
 * also bevor die Sprachwahl feststeht, und er richtet sich ohnehin an den,
 * der die Datei .env.local anlegt, nicht an den Nutzer. */
export const configError: string | null =
  !url || !key
    ? 'VITE_SUPABASE_URL oder VITE_SUPABASE_ANON_KEY fehlt. Lege .env.local nach dem Muster von .env.example an.'
    : null

export const supabase: SupabaseClient = createClient(
  url ?? 'https://placeholder.supabase.co',
  key ?? 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
    realtime: { params: { eventsPerSecond: 20 } },
  },
)

/* Gleich nach dem Anlegen, damit kein Ereignis aus dem Start verloren geht:
 * PASSWORD_RECOVERY kommt, wenn der Client einen Passwort-Link (?code=)
 * eingeloest hat oder verifyOtp mit type recovery durchging, ABER auch,
 * wenn ein anderer Tab das tat (BroadcastChannel von supabase-js). Ob es
 * zaehlt, entscheidet linkstand: nur solange dieser Tab selbst einloest.
 * SIGNED_OUT und USER_UPDATED (neues Passwort gesetzt, auch in einem
 * anderen Tab) beenden den Vorgang; USER_UPDATED ist das Sicherheitsnetz,
 * falls ein Weg das Beenden vergisst. Der Rueckruf bleibt synchron und
 * ruft selbst nichts bei Supabase auf. */
supabase.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') wiederherstellungMelden()
  else if (event === 'SIGNED_OUT' || event === 'USER_UPDATED') wiederherstellungBeenden()
})

/** Erfuellt, sobald der Client die Adresse beim Start ausgewertet hat und
 *  die Ereignisse daraus verteilt sind. fehlerCode: der Code, wenn er einen
 *  ?code= nicht einloesen konnte, sonst null.
 *
 *  Hier und nicht erst auf der Seite Passwort neu: das Startfenster fuer
 *  PASSWORD_RECOVERY muss sich auf jeder Seite schliessen, sonst bliebe es
 *  fuer Meldungen anderer Tabs offen. Das zweite initialize() startet
 *  nichts neu, es wartet nur auf das erste aus createClient. Die Ereignisse
 *  aus dem Start verteilt der Client gleich nach der Initialisierung, eines
 *  davon in einem setTimeout(0): darum noch einen Takt warten. */
export const startAusgewertet: Promise<{ fehlerCode: string | null }> = (async () => {
  let fehlerCode: string | null = null
  try {
    const { error } = await supabase.auth.initialize()
    if (error) fehlerCode = (error as { code?: string }).code ?? 'unbekannt'
  } catch {
    fehlerCode = 'unbekannt'
  }
  await new Promise((r) => setTimeout(r, 0))
  startEinloesenFertig(fehlerCode !== null)
  return { fehlerCode }
})()

/** Ein Wegwerf-Client nur zum Pruefen des aktuellen Passworts (Einstellungen).
 *  Er speichert keine Sitzung, erneuert nichts, liest keine Adresse und hat
 *  einen eigenen Speicherschluessel. So beruehrt die Probe-Anmeldung die
 *  echte Sitzung nicht, auch nicht in anderen Tabs. Nach Gebrauch abmelden
 *  (scope local) und dispose() aufrufen. */
export function pruefClientAnlegen(): SupabaseClient {
  return createClient(url ?? 'https://placeholder.supabase.co', key ?? 'placeholder', {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: `kistly-passwort-pruefen-${crypto.randomUUID()}`,
    },
  })
}

export const VAPID_PUBLIC_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ?? ''

/** Die Platzhalter einer Ablehnung aus details lesen. Nur Zahlen und
 *  Text werden uebernommen. Ist {name} leer (Objekt ohne Namen), steht
 *  dort das Wort der Art, damit der Satz nicht mit einer Luecke beginnt. */
function dbWerte(details: unknown): Vars | undefined {
  if (typeof details !== 'string' || !details.trim().startsWith('{')) return undefined
  let roh: unknown
  try {
    roh = JSON.parse(details)
  } catch {
    return undefined
  }
  if (!roh || typeof roh !== 'object' || Array.isArray(roh)) return undefined
  const werte: Vars = {}
  for (const [k, v] of Object.entries(roh as Record<string, unknown>)) {
    if (typeof v === 'string' || typeof v === 'number') werte[k] = v
  }
  /* Seriennummern laufen immer von links nach rechts, auch mitten im
   * arabischen Satz: als eigene Richtungsinsel (FSI ... PDI). */
  for (const k of ['code', 'unter']) {
    if (typeof werte[k] === 'string') werte[k] = `\u2068${werte[k]}\u2069`
  }
  if ('name' in werte && String(werte.name).trim() === '') {
    const art = String(werte.art ?? '')
    werte.name = ['moebel', 'regal', 'schrank'].includes(art)
      ? tg(`fehler.objekt_art.${art}`)
      : tg('fehler.objekt_art.objekt')
  }
  return werte
}

/** Supabase-Fehler in einen Satz uebersetzen, den man lesen kann.
 *
 *  Laeuft ausserhalb von React, darum tg und nicht useT. Die englischen
 *  Originalmeldungen bleiben als Erkennungsmerkmal stehen, uebersetzt wird
 *  nur, was danach herauskommt. */
export function errText(err: unknown): string {
  if (!err) return tg('zustand.unbekannter_fehler')
  if (typeof err === 'string') return err
  const e = err as {
    message?: string
    error_description?: string
    details?: string
    hint?: string
    code?: string
    error_code?: string
    name?: string
    status?: number
    reasons?: unknown
  }
  const raw = e.error_description || e.message || e.details || ''
  const code = e.error_code || e.code || ''

  /* Die Datenbank gibt ihren Ablehnungen eine Kennung mit (seit 0022):
   * hint = 'kistly:grundriss.zu_hoch'. Der Satz dazu steht im Woerterbuch
   * unter fehler.db.grundriss.zu_hoch, auf Deutsch und Arabisch. Sonst
   * stuende der deutsche Satz der Datenbank auch im arabischen Satz.
   * Seit 0027 stehen die Platzhalter als JSON in details
   * ({"code":"W-3-007","n":2}). Fehlt es oder ist es kaputt, kommt der
   * Satz ohne Werte. */
  if (typeof e.hint === 'string' && e.hint.startsWith('kistly:')) {
    const key = 'fehler.db.' + e.hint.slice(7)
    const text = tg(key, dbWerte(e.details))
    if (text !== key) return text
  }

  /* Eindeutige Indizes aus 0027 und 0028. Sie melden sich ohne Kennung,
   * nur mit ihrem Namen in der Meldung. */
  if (raw.includes('eigene_groessen_name_key')) return tg('fehler.db.groesse.name_doppelt')
  // CHECK aus 0033: Fuellstand 0 bis 100.
  if (raw.includes('items_fuellstand_check')) return tg('fehler.db.fuellstand')
  if (raw.includes('raeume_tag_je_grundriss')) {
    return tg('fehler.db.grundriss.zimmer_doppelt', { name: tg('fehler.dieses_zimmer') })
  }
  if (raw.includes('objekte_item_key')) return tg('fehler.db.grundriss.moebel_schon_verknuepft')
  if (code === '42501') return tg('fehler.keine_berechtigung')
  // Verklemmung zweier gleichzeitiger Vorgaenge: einfach nochmal.
  if (code === '40P01') return tg('fehler.bitte_nochmal')

  /* Supabase verschickt beim Registrieren eine Bestaetigungsmail, solange in
   * der Projektverwaltung "Confirm email" aktiv ist. Der eingebaute
   * Mailversand ist dabei auf wenige Mails pro Stunde begrenzt. Die
   * englische Originalmeldung sagt niemandem, was zu tun ist. */
  if (code === 'over_email_send_rate_limit' || raw.toLowerCase().includes('email rate limit')) {
    return tg('fehler.mail_limit')
  }
  if (code === 'over_request_rate_limit' || raw.includes('For security purposes')) {
    return tg('fehler.zu_viele_versuche')
  }
  if (code === 'signup_disabled' || raw.includes('Signups not allowed')) {
    return tg('fehler.registrierung_aus')
  }

  /* Passwort-Link und Passwort aendern. Die Codes kommen von Supabase Auth
   * (auth-js 2.116, lib/error-codes). Abgelaufen, schon benutzt oder der
   * Anmeldevorgang dazu ist weg: fuer den Nutzer alles dasselbe. */
  if (
    code === 'otp_expired' ||
    code === 'flow_state_expired' ||
    code === 'flow_state_not_found' ||
    code === 'bad_code_verifier'
  ) {
    return tg('fehler.link_abgelaufen')
  }
  // PKCE: der Link wurde in einem anderen Browser geoeffnet als angefordert.
  if (code === 'pkce_code_verifier_not_found') return tg('fehler.link_anderer_browser')
  if (code === 'weak_password') {
    const gruende = Array.isArray(e.reasons) ? e.reasons : []
    return gruende.includes('pwned') ? tg('fehler.passwort_geleakt') : tg('fehler.passwort_schwach')
  }
  if (code === 'same_password') return tg('fehler.passwort_gleich')
  if (code === 'reauthentication_needed' || code === 'reauthentication_not_valid') {
    return tg('fehler.neu_anmelden_noetig')
  }
  // Kein Netz: auth-js meldet das als AuthRetryableFetchError mit Status 0.
  if (e.name === 'AuthRetryableFetchError' && !e.status) return tg('fehler.keine_verbindung')

  /* Die Tabelle bildet die englische Meldung auf einen Schluessel ab. Der
   * Satz selbst steht im Woerterbuch, hier steht nur, welcher es ist. */
  const map: Record<string, string> = {
    'Invalid login credentials': 'fehler.login_falsch',
    'User already registered': 'fehler.mail_vergeben',
    'Email not confirmed': 'fehler.mail_unbestaetigt',
    'Password should be at least 6 characters': 'fehler.passwort_kurz',
    'New password should be different from the old password': 'fehler.passwort_gleich',
    'Auth session missing!': 'fehler.sitzung_weg',
  }
  if (map[raw]) return tg(map[raw])
  if (raw.includes('duplicate key') && raw.includes('tags_project_short_key'))
    return tg('fehler.kuerzel_vergeben')
  if (raw.includes('duplicate key')) return tg('fehler.eintrag_doppelt')
  if (raw.includes('row-level security')) return tg('fehler.keine_berechtigung')
  if (raw.includes('Failed to fetch')) return tg('fehler.keine_verbindung')
  return raw || tg('zustand.unbekannter_fehler')
}
