/* Gemeinsame Formen fuer Begehen, Figuren und Mitspieler (E82).
 *
 * Der Motor (motor.ts), die Figuren (avatar3d.ts) und die Verbindung zu
 * den anderen Leuten im Umzug (lib/anwesenheit.ts) sprechen ueber diese
 * Typen miteinander. Nur Typen, kein Code, damit jede Seite fuer sich
 * gebaut und geprueft werden kann. */
import type { Object3D } from 'three'

/** Wie jemand gerade ist: steht (und geht), sitzt oder liegt. */
export type Haltung = 'stehen' | 'sitz' | 'liegen'

/** Stellung einer Person in der Wohnung. x und z in Metern (Welt, z ist
 *  der Plan-y), y die Augenhoehe ueber dem Boden in Metern. gier ist die
 *  Blickrichtung um die Hochachse (0 = Blick nach -z, wie die Kamera),
 *  neigung hoch und runter (positiv = nach oben). tempo: 0 steht, 1 geht
 *  normal, 2 rennt; fuer die Beinbewegung der Figur. */
export interface Pose3D {
  x: number
  y: number
  z: number
  gier: number
  neigung: number
  haltung: Haltung
  tempo: number
}

/** Eine Figur in der Szene. Ursprung der gruppe: zwischen den Fuessen
 *  (stehend) auf dem Boden, Gesicht nach -z bei rotation.y = 0. Der Motor
 *  setzt Lage und Drehung, die Figur bewegt nur ihre Glieder. */
export interface Figur3D {
  gruppe: Object3D
  /** Glieder setzen: Haltung, Gehtempo (0..2) und Zeit in Sekunden fuer
   *  das Schwingen der Beine. */
  pose(haltung: Haltung, tempo: number, zeit: number): void
  /** Augenhoehe ueber dem Ursprung in dieser Haltung (Meter). Damit setzt
   *  der Motor die Figur so, dass ihre Augen bei Pose3D.y liegen. */
  auge(haltung: Haltung): number
  dispose(): void
}
