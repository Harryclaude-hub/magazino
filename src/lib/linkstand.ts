import { useSyncExternalStore } from 'react'

/* Passwort-Link aus der Mail.
 *
 * 1. Was beim Laden der Seite in der Adresse stand (Abfrage UND Anker):
 *    token_hash, type, code, error, error_code, error_description. Gelesen
 *    wird einmal beim Laden dieses Moduls. supabase.ts importiert es, darum
 *    laeuft das, bevor der Supabase-Client entsteht und die Adresse
 *    aufraeumt.
 * 2. Ob in diesem Seitenaufruf eine Wiederherstellung bestaetigt wurde
 *    (Ereignis PASSWORD_RECOVERY). Der Merker liegt nur im Speicher, nie in
 *    localStorage oder sessionStorage: ein neuer Seitenaufruf beginnt ohne
 *    ihn, und kein anderer Tab kann ihn setzen.
 *
 * Gelesen wird nur. error_description wird nie angezeigt: jeder kann einen
 * Link mit beliebigem Text darin verschicken.
 */

export interface LinkStand {
  tokenHash: string | null
  type: string | null
  code: string | null
  error: string | null
  errorCode: string | null
  errorDescription: string | null
}

const LEER: LinkStand = {
  tokenHash: null,
  type: null,
  code: null,
  error: null,
  errorCode: null,
  errorDescription: null,
}

function lesen(): LinkStand {
  if (typeof window === 'undefined') return LEER
  try {
    const abfrage = new URLSearchParams(window.location.search)
    const anker = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const wert = (k: string): string | null => {
      const v = abfrage.get(k) ?? anker.get(k)
      return v && v.trim() ? v.trim() : null
    }
    return {
      tokenHash: wert('token_hash'),
      type: wert('type'),
      code: wert('code'),
      error: wert('error'),
      errorCode: wert('error_code'),
      errorDescription: wert('error_description'),
    }
  } catch {
    return LEER
  }
}

const BEIM_LADEN: LinkStand = Object.freeze(lesen())

/** Stand das beim Laden nach einem Link aus einer Auth-Mail aus? */
export const LINK_BEIM_LADEN: boolean = Boolean(
  BEIM_LADEN.code ||
    BEIM_LADEN.tokenHash ||
    BEIM_LADEN.type === 'recovery' ||
    BEIM_LADEN.error ||
    BEIM_LADEN.errorCode,
)

let verbraucht = false

/** Der Stand aus der Adresse beim Laden. Nach linkVerbraucht() leer, damit
 *  ein zweiter Besuch der Seite im selben Aufruf nicht denselben Link
 *  noch einmal anbietet. */
export function linkStand(): LinkStand {
  return verbraucht ? LEER : BEIM_LADEN
}

export function linkVerbraucht(): void {
  verbraucht = true
}

/* Parameter, die nach dem Lesen aus der Adresse verschwinden. Die
 * Sitzungswerte im Anker gehoeren dazu, falls doch einmal ein alter Link
 * mit #access_token=... kommt: Tokens haben in der Adresszeile (und damit
 * im Verlauf) nichts verloren. */
const WEG = [
  'token_hash',
  'type',
  'code',
  'sb_flow_id',
  'error',
  'error_code',
  'error_description',
  'access_token',
  'refresh_token',
  'expires_in',
  'expires_at',
  'token_type',
  'provider_token',
  'provider_refresh_token',
]

/** Die Link-Parameter aus der Adresszeile nehmen, ohne neu zu laden und
 *  ohne einen Eintrag im Verlauf. Alles andere in der Adresse bleibt. */
export function linkAusAdresseEntfernen(): void {
  if (typeof window === 'undefined') return
  try {
    const url = new URL(window.location.href)
    let geaendert = false
    for (const k of WEG) {
      if (url.searchParams.has(k)) {
        url.searchParams.delete(k)
        geaendert = true
      }
    }
    const anker = new URLSearchParams(url.hash.replace(/^#/, ''))
    let ankerGeaendert = false
    for (const k of WEG) {
      if (anker.has(k)) {
        anker.delete(k)
        ankerGeaendert = true
      }
    }
    if (ankerGeaendert) {
      const rest = anker.toString()
      url.hash = rest ? `#${rest}` : ''
      geaendert = true
    }
    if (geaendert) window.history.replaceState(window.history.state, '', url.toString())
  } catch (err) {
    console.warn('[passwort] Adresse nicht aufgeraeumt:', err instanceof Error ? err.message : err)
  }
}

/* ------------------------------------------------------------------ Merker */

let aktiv = false
const hoerer = new Set<() => void>()

function setzen(wert: boolean): void {
  if (aktiv === wert) return
  aktiv = wert
  for (const h of hoerer) h()
}

/** Aus onAuthStateChange bei PASSWORD_RECOVERY. Zaehlt nur, wenn dieser
 *  Seitenaufruf selbst mit einem Link begann; meldet ein anderer Tab das
 *  Ereignis ueber den gemeinsamen Kanal, bleibt der Merker hier aus. */
export function wiederherstellungMelden(): void {
  if (LINK_BEIM_LADEN && !verbraucht) setzen(true)
}

/** Nach dem neuen Passwort, beim Abbrechen und beim Abmelden. */
export function wiederherstellungBeenden(): void {
  setzen(false)
}

export function wiederherstellungAktiv(): boolean {
  return aktiv
}

function abonnieren(h: () => void): () => void {
  hoerer.add(h)
  return () => {
    hoerer.delete(h)
  }
}

/** true, solange ein Passwort-Link eingeloest, das neue Passwort aber
 *  noch nicht gesetzt ist. */
export function useWiederherstellung(): boolean {
  return useSyncExternalStore(abonnieren, wiederherstellungAktiv, () => false)
}
