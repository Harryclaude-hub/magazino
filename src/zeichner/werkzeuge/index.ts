/* Alle Werkzeuge mit ihrer Taste (event.code, gleich auf jeder Tastatur). */
import { auswahlWerkzeug } from './auswahl.ts'
import { kisteWerkzeug } from './kiste.ts'
import { messenWerkzeug } from './messen.ts'
import { objektWerkzeug } from './objekt.ts'
import { oeffnungWerkzeug } from './oeffnung.ts'
import { raumWerkzeug } from './raum.ts'
import { teilenWerkzeug } from './teilen.ts'
import type { Werkzeug, WerkzeugName } from './typen.ts'

export const WERKZEUGE: Record<WerkzeugName, Werkzeug<unknown>> = {
  auswahl: auswahlWerkzeug as Werkzeug<unknown>,
  raum: raumWerkzeug as Werkzeug<unknown>,
  teilen: teilenWerkzeug as Werkzeug<unknown>,
  tuer: oeffnungWerkzeug('tuer') as Werkzeug<unknown>,
  fenster: oeffnungWerkzeug('fenster') as Werkzeug<unknown>,
  moebel: objektWerkzeug('moebel') as Werkzeug<unknown>,
  regal: objektWerkzeug('regal') as Werkzeug<unknown>,
  schrank: objektWerkzeug('schrank') as Werkzeug<unknown>,
  kiste: kisteWerkzeug as Werkzeug<unknown>,
  messen: messenWerkzeug as Werkzeug<unknown>,
}

export const REIHENFOLGE: WerkzeugName[] = [
  'auswahl',
  'raum',
  'teilen',
  'tuer',
  'fenster',
  'moebel',
  'regal',
  'schrank',
  'kiste',
  'messen',
]

export const TASTEN: Record<WerkzeugName, string> = {
  auswahl: 'KeyV',
  raum: 'KeyR',
  teilen: 'KeyT',
  tuer: 'KeyD',
  fenster: 'KeyF',
  moebel: 'KeyM',
  regal: 'KeyK',
  schrank: 'KeyJ',
  kiste: 'KeyB',
  messen: 'KeyA',
}

/** Buchstabe fuer die Anzeige ("V"), immer lateinisch. */
export function tastenZeichen(name: WerkzeugName): string {
  return TASTEN[name].slice(3)
}
