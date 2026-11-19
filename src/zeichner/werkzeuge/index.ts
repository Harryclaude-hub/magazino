/* Alle Werkzeuge mit ihrer Taste (event.code, gleich auf jeder Tastatur). */
import { auswahlWerkzeug } from './auswahl.ts'
import { kisteWerkzeug } from './kiste.ts'
import { linieWerkzeug } from './linie.ts'
import { messenWerkzeug } from './messen.ts'
import { nischeWerkzeug } from './nische.ts'
import { objektWerkzeug } from './objekt.ts'
import { oeffnungWerkzeug } from './oeffnung.ts'
import { raumWerkzeug } from './raum.ts'
import { stromWerkzeug } from './strom.ts'
import { teilenWerkzeug } from './teilen.ts'
import { SACHLICH } from '../../lib/ansicht.ts'
import { ZEICHNER_VOLL } from '../schalter.ts'
import type { Werkzeug, WerkzeugName } from './typen.ts'

export const WERKZEUGE: Record<WerkzeugName, Werkzeug<unknown>> = {
  auswahl: auswahlWerkzeug as Werkzeug<unknown>,
  raum: raumWerkzeug as Werkzeug<unknown>,
  teilen: teilenWerkzeug as Werkzeug<unknown>,
  nische: nischeWerkzeug as Werkzeug<unknown>,
  tuer: oeffnungWerkzeug('tuer') as Werkzeug<unknown>,
  fenster: oeffnungWerkzeug('fenster') as Werkzeug<unknown>,
  moebel: objektWerkzeug('moebel') as Werkzeug<unknown>,
  regal: objektWerkzeug('regal') as Werkzeug<unknown>,
  schrank: objektWerkzeug('schrank') as Werkzeug<unknown>,
  kiste: kisteWerkzeug as Werkzeug<unknown>,
  messen: messenWerkzeug as Werkzeug<unknown>,
  linie: linieWerkzeug as Werkzeug<unknown>,
  strom: stromWerkzeug as Werkzeug<unknown>,
}

/* Die Leiste des Zeichners. Solange ZEICHNER_VOLL (../schalter.ts) false ist,
 * nur Auswahl, Regal, Schrank und Messen, mit SACHLICH (src/lib/ansicht.ts)
 * nur Auswahl, Regal und Messen (der Schrank bleibt als Code und seine
 * Taste tut nichts; vorhandene Schraenke lassen sich weiter waehlen); Raum, Teilen, Nische, Tuer, Fenster
 * und Linie bleiben als Code (Pruefskripte, spaeteres Einschalten), stehen
 * aber nicht in der Leiste, und ihre Tasten tun nichts. Moebel, Strom und
 * Kiste setzen stehen schon laenger nicht in der Leiste. */
export const REIHENFOLGE: WerkzeugName[] = ZEICHNER_VOLL
  ? ['auswahl', 'raum', 'teilen', 'nische', 'tuer', 'fenster', 'regal', 'schrank', 'messen', 'linie']
  : SACHLICH
    ? ['auswahl', 'regal', 'messen']
    : ['auswahl', 'regal', 'schrank', 'messen']

export const TASTEN: Record<WerkzeugName, string> = {
  auswahl: 'KeyV',
  raum: 'KeyR',
  teilen: 'KeyT',
  nische: 'KeyN',
  tuer: 'KeyD',
  fenster: 'KeyF',
  moebel: 'KeyM',
  regal: 'KeyK',
  schrank: 'KeyJ',
  kiste: 'KeyB',
  messen: 'KeyA',
  linie: 'KeyL',
  strom: 'KeyS',
}

/** Buchstabe fuer die Anzeige ("V"), immer lateinisch. */
export function tastenZeichen(name: WerkzeugName): string {
  return TASTEN[name].slice(3)
}
