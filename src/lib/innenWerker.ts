/* Innenraeume im Hintergrund rechnen (E87). innenPlanen kostet je Haus 30
 * bis 140 ms; das darf kein Bild beim Begehen aufhalten. Darum rechnet es
 * ein Web Worker: stadt3d.ts startet ihn mit
 *   new Worker(new URL('../../lib/innenWerker.ts', import.meta.url), { type: 'module' })
 * schickt { nr, eingabe } und bekommt { nr, plan } oder { nr, fehler }
 * zurueck. Der Plan ist reine Daten (kein three), er kommt als Kopie an.
 *
 * Ohne Worker (node, Pruefungen, alte Browser) ruft stadt3d.ts innenAntwort
 * gleich selbst auf; scripts/stadt-pruefen.mjs nutzt sie in einem Thread
 * von node, um den Worker nachzustellen. */
import { innenPlanen, type InnenEingabe, type InnenPlan } from './innenGenerator.ts'

/** Eine Anfrage an den Worker: nr kommt mit der Antwort zurueck. */
export interface InnenAnfrage {
  nr: number
  eingabe: InnenEingabe
}

/** Die Antwort: der Plan oder warum es keinen gibt. */
export type InnenAntwort = { nr: number; plan: InnenPlan; fehler?: undefined } | { nr: number; plan?: undefined; fehler: string }

/** Beantwortet eine Anfrage (rein; wirft nie, ein Fehler kommt als Text). */
export function innenAntwort(a: InnenAnfrage): InnenAntwort {
  const nr = a && typeof a.nr === 'number' ? a.nr : -1
  try {
    if (!a || !a.eingabe) throw new Error('innenWerker: Anfrage ohne Eingabe')
    return { nr, plan: innenPlanen(a.eingabe) }
  } catch (e) {
    return { nr, fehler: e instanceof Error ? `${e.message}` : String(e) }
  }
}

/* Im Worker: jede Nachricht beantworten. Auf der Seite selbst (oder in
 * node) geschieht hier nichts; dort zaehlt nur innenAntwort. */
interface WorkerUmgebung {
  WorkerGlobalScope?: unknown
  addEventListener(art: 'message', fn: (ev: MessageEvent<InnenAnfrage>) => void): void
  postMessage(nachricht: InnenAntwort): void
}
const umgebung = globalThis as unknown as WorkerUmgebung
if (typeof umgebung.WorkerGlobalScope !== 'undefined' && typeof umgebung.postMessage === 'function') {
  umgebung.addEventListener('message', (ev) => umgebung.postMessage(innenAntwort(ev.data)))
}
