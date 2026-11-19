/* Der eine Schalter des Zeichners (Karam, 19.11.2026).
 *
 * false: Im Zeichner gibt es nur Regale und Schraenke (setzen, verschieben,
 * drehen, Groesse und Faecher, loeschen), dazu Auswahl und Messen. Raeume,
 * Tueren und Fenster bleiben im Plan und in 3D sichtbar, lassen sich aber
 * nicht mehr bearbeiten; Claude zeichnet sie ueber Daten.
 *
 * true: alles wie vorher (Raum, Teilen, Nische, Tuer, Fenster, Hilfslinie,
 * Raum- und Wandeigenschaften). Der Code dafuer ist nicht geloescht.
 */
export const ZEICHNER_VOLL: boolean = false

let voll = ZEICHNER_VOLL

/** Gilt der volle Zeichner? (Normal gleich ZEICHNER_VOLL.) */
export function zeichnerVoll(): boolean {
  return voll
}

/** Nur fuer Pruefskripte: schaltet beide Zustaende durch. Die Seite ruft das nie. */
export function zeichnerVollSetzen(v: boolean): void {
  voll = v
}

/** Was im ausgeblendeten Zustand noch gewaehlt und bearbeitet werden darf. */
export function bearbeitbar(art: string | null | undefined): boolean {
  return voll || art === 'objekt' || art === 'kiste'
}
