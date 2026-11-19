/* Anmelden mit E-Mail ODER Benutzernamen (E107).
 *
 * Supabase kennt Konten nur mit E-Mail-Adresse. Wer nur einen Benutzernamen
 * hat, bekommt intern <name>@magazino.invalid. Die Endung .invalid ist
 * weltweit reserviert und kann nie echte Post empfangen. Die Seite setzt sie
 * beim Anmelden selbst ein und blendet sie ueberall aus. Dieselben Regeln
 * stehen in den Server-Funktionen konto-anlegen und passwort-setzen. */

export const INTERN = '@magazino.invalid'

/** Aus dem, was jemand ins Feld tippt, die Adresse fuer die Anmeldung machen. */
export function loginZuEmail(eingabe: string): string {
  const t = eingabe.trim().toLowerCase()
  return t.includes('@') ? t : t + INTERN
}

/** Was die Seite zeigt: die interne Endung bleibt unsichtbar. */
export function emailAnzeige(email: string | null | undefined): string {
  if (!email) return ''
  return email.endsWith(INTERN) ? email.slice(0, -INTERN.length) : email
}

export function istInternesKonto(email: string | null | undefined): boolean {
  return !!email && email.endsWith(INTERN)
}

/** Kleinbuchstaben, Ziffern, Punkt, Binde- und Unterstrich; 3 bis 30 Zeichen; Anfang Buchstabe oder Ziffer. */
export function benutzernameGueltig(s: string): boolean {
  return /^[a-z0-9][a-z0-9._-]{2,29}$/.test(s.trim().toLowerCase())
}

const BEKANNT = [
  'passwort123', 'password123', 'magazino123', 'qwertz1234', 'qwerty1234', '1234567890', 'passwort12',
  'password12', 'willkommen1', 'willkommen123', 'abcdefgh12', 'abcd123456', 'test123456', 'admin12345',
]

export type PasswortFehler = 'schwach' | 'bekannt' | 'enthaelt_name'

/** Gleiche Regeln wie die Server-Funktionen: mindestens 10 Zeichen mit Buchstaben und
 *  Ziffern, kein bekanntes Allerwelts-Passwort, nicht der Name oder die Adresse. */
export function passwortPruefen(passwort: string, namen: string[] = []): PasswortFehler | null {
  if (passwort.length < 10 || passwort.length > 72 || !/[A-Za-z]/.test(passwort) || !/[0-9]/.test(passwort)) return 'schwach'
  const klein = passwort.toLowerCase()
  if (BEKANNT.some((b) => klein.includes(b)) || /^(.)\1+$/.test(passwort)) return 'bekannt'
  for (const n of namen) if (n.length >= 4 && klein.includes(n.toLowerCase())) return 'enthaelt_name'
  return null
}
