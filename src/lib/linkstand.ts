import { useSyncExternalStore } from 'react'

/* Passwort-Link aus der Mail.
 *
 * 1. Was beim Laden der Seite in der Adresse stand (Abfrage UND Anker):
 *    token_hash, type, code, error, error_code, error_description. Gelesen
 *    wird einmal beim Laden dieses Moduls. supabase.ts importiert es, darum
 *    laeuft das, bevor der Supabase-Client entsteht und die Adresse
 *    aufraeumt.
 * 2. Ob DIESER Tab in diesem Seitenaufruf eine Wiederherstellung
 *    eingeloest hat (Merker). Er liegt nur im Speicher, nie in localStorage
 *    oder sessionStorage: ein neuer Seitenaufruf beginnt ohne ihn.
 *
 *    Vorsicht: supabase-js meldet Ereignisse anderer Tabs ueber einen
 *    BroadcastChannel an dasselbe onAuthStateChange. Ein PASSWORD_RECOVERY
 *    allein beweist also nicht, dass dieser Tab etwas eingeloest hat.
 *    Darum zaehlt es nur, solange dieser Tab selbst einloest (Erwartung):
 *    - beim Start, wenn die Adresse ?code= oder #access_token mit
 *      type=recovery trug, bis der Client sie ausgewertet hat
 *      (startEinloesenFertig aus supabase.ts),
 *    - waehrend des eigenen verifyOtp (eigenesEinloesenBeginnen/-Ende).
 *    Jede Erwartung nimmt hoechstens ein Ereignis an. Schlaegt das eigene
 *    Einloesen fehl, kam ein Ereignis in diesem Fenster von anderswo: der
 *    Merker geht wieder aus. Ein restliches Fenster bleibt: kommt genau
 *    waehrend des eigenen Starts ein PASSWORD_RECOVERY eines anderen Tabs
 *    und war der eigene ?code= keiner zum Zuruecksetzen, gilt es.
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

/* Steht eine Sitzung in der Adresse (alter Link mit #access_token=...)?
 * Nur ob, nie der Wert: Tokens werden hier nicht aufbewahrt. */
function sitzungInAdresse(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const abfrage = new URLSearchParams(window.location.search)
    const anker = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    return Boolean(abfrage.get('access_token') || anker.get('access_token'))
  } catch {
    return false
  }
}

/* Loest der Client beim Start selbst etwas ein? ?code= (PKCE) oder eine
 * Sitzung im Anker mit type=recovery. Ein Link mit nur token_hash wird
 * erst per Klick eingeloest, ein Link mit nur error gar nicht. */
const START_EINLOESEN: boolean = Boolean(
  BEIM_LADEN.code || (sitzungInAdresse() && BEIM_LADEN.type === 'recovery'),
)

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

/* ------------------------------------------------------------ Erwartungen */

/** Ein Fenster, in dem dieser Tab selbst einloest. */
export interface Erwartung {
  angenommen: boolean
}

let offen: Erwartung | null = null

function oeffnen(): Erwartung {
  const e: Erwartung = { angenommen: false }
  offen = e
  return e
}

function schliessen(e: Erwartung, fehlgeschlagen: boolean): void {
  if (offen === e) offen = null
  /* Das eigene Einloesen ging schief. Ein Ereignis, das in diesem Fenster
   * angenommen wurde, kam dann von einem anderen Tab. */
  if (fehlgeschlagen && e.angenommen) setzen(false)
}

// Beim Laden geoeffnet, geschlossen von startEinloesenFertig.
const START: Erwartung | null = START_EINLOESEN ? oeffnen() : null

/** Aus supabase.ts, sobald der Client die Adresse beim Start ausgewertet
 *  und die Ereignisse daraus verteilt hat. fehlgeschlagen: initialize()
 *  meldete einen Fehler (?code= nicht einloesbar). Ein Erfolg setzt den
 *  Merker hier nicht: ein ?code= kann auch aus einer Bestaetigungsmail
 *  stammen, ob es ein Passwort-Link war, sagt nur das Ereignis. */
export function startEinloesenFertig(fehlgeschlagen: boolean): void {
  if (START) schliessen(START, fehlgeschlagen)
}

/** Unmittelbar vor dem eigenen verifyOtp mit type recovery. */
export function eigenesEinloesenBeginnen(): Erwartung {
  return oeffnen()
}

/** Gleich danach, auch bei Fehlern. eingeloest: verifyOtp ging durch und
 *  lieferte eine Sitzung. Dann war es sicher dieser Tab, auch falls das
 *  Ereignis fehlte. */
export function eigenesEinloesenEnde(e: Erwartung, eingeloest: boolean): void {
  schliessen(e, !eingeloest)
  if (eingeloest) setzen(true)
}

/** Aus onAuthStateChange bei PASSWORD_RECOVERY. Zaehlt nur, solange eine
 *  Erwartung offen ist, und dann genau einmal. Ausserhalb (Ereignis aus
 *  einem anderen Tab, zweite Meldung desselben Starts) bleibt alles, wie
 *  es ist. */
export function wiederherstellungMelden(): void {
  const e = offen
  if (!e) return
  offen = null
  e.angenommen = true
  setzen(true)
}

/** Nach dem neuen Passwort, beim Abbrechen, beim Abmelden und bei
 *  USER_UPDATED (Sicherheitsnetz, auch aus einem anderen Tab). */
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
