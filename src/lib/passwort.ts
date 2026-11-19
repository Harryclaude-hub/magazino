/* Regel fuer neue Passwoerter, gleich wie die Einstellung in Supabase
 * (Authentication, Passwort: Mindestlaenge 10, "Letters and digits").
 * Supabase zaehlt dabei nur a bis z und A bis Z als Buchstaben, darum hier
 * auch. Beim Anmelden wird nichts geprueft: alte, kuerzere Passwoerter
 * gehen weiter. Der Satz dazu steht im Woerterbuch (konto.passwort_kurz). */

const PASSWORT_MIN = 10

export function passwortGenug(passwort: string): boolean {
  return passwort.length >= PASSWORT_MIN && /[A-Za-z]/.test(passwort) && /[0-9]/.test(passwort)
}
