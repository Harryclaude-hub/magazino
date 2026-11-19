/* Zustand des Zeichners als reiner Reducer.
 *
 *  dok      was gezeichnet wird (lokal, sofort sichtbar)
 *  basis    was die Datenbank zuletzt bestaetigt hat
 *  version  Version von basis (Schutz gegen fremde Aenderungen)
 *  zurueck, vor  Verlauf der Sitzung, hoechstens 200 Staende
 *
 * Jede abgeschlossene Aktion legt den Vorher-Stand auf "zurueck"; der
 * Zeichner schickt dann sofort den Unterschied basis -> dok. Rueckgaengig
 * macht den Vorher-Stand zum Ziel und schickt wieder den Unterschied, als
 * neue Version (BAUPLAN 7.1 E23). Die Kisten des Ziels rechnet
 * verlaufZiel aus den jetzigen Kisten (sie stehen nicht im Verlauf).
 */
import { auswahlPruefen, dokRichten, gleicheLinien, verlaufZiel, type Auswahl, type Dok } from './dok.ts'
import { istLeer, unterschied } from './diff.ts'
import type { PlanKiste, PlanLinie, PlanSymbol } from '../lib/types'

const VERLAUF_MAX = 200

interface ZState {
  dok: Dok
  basis: Dok
  version: number
  zurueck: Dok[]
  vor: Dok[]
  auswahl: Auswahl
}

type ZAktion =
  | { typ: 'aendern'; dok: Dok; auswahl?: Auswahl }
  | { typ: 'waehlen'; auswahl: Auswahl }
  | { typ: 'zurueck' }
  | { typ: 'vor' }
  | { typ: 'gespeichert'; gesendet: Dok; antwort: Dok; version: number }
  | { typ: 'abgelehnt' }
  | { typ: 'neu_geladen'; daten: Dok }
  | { typ: 'kisten'; kisten: PlanKiste[] }
  | { typ: 'linien_gespeichert'; linien: PlanLinie[]; symbole: PlanSymbol[] }

export function zStart(daten: Dok): ZState {
  return { dok: daten, basis: daten, version: daten.grundriss.version, zurueck: [], vor: [], auswahl: null }
}

export function zReducer(z: ZState, a: ZAktion): ZState {
  switch (a.typ) {
    case 'aendern': {
      const dok = dokRichten(a.dok)
      if (dok === z.dok) return z
      return {
        ...z,
        dok,
        zurueck: [...z.zurueck, z.dok].slice(-VERLAUF_MAX),
        vor: [],
        auswahl: auswahlPruefen(dok, a.auswahl === undefined ? z.auswahl : a.auswahl),
      }
    }
    case 'waehlen':
      return { ...z, auswahl: auswahlPruefen(z.dok, a.auswahl) }
    case 'zurueck': {
      const ziel = z.zurueck[z.zurueck.length - 1]
      if (!ziel) return z
      const dok = verlaufZiel(z.dok, ziel)
      return {
        ...z,
        dok,
        zurueck: z.zurueck.slice(0, -1),
        vor: [z.dok, ...z.vor].slice(0, VERLAUF_MAX),
        auswahl: auswahlPruefen(dok, z.auswahl),
      }
    }
    case 'vor': {
      const ziel = z.vor[0]
      if (!ziel) return z
      const dok = verlaufZiel(z.dok, ziel)
      return {
        ...z,
        dok,
        zurueck: [...z.zurueck, z.dok].slice(-VERLAUF_MAX),
        vor: z.vor.slice(1),
        auswahl: auswahlPruefen(dok, z.auswahl),
      }
    }
    case 'gespeichert': {
      // Kam in der Zwischenzeit nichts dazu, gilt die Antwort (sie bringt
      // fertige Hoehen und Namen mit). Sonst bleibt der lokale Stand, und
      // der Zeichner schickt den Rest hinterher.
      // Die Hilfslinien speichert der Zeichner getrennt: die lokalen bleiben,
      // auch wenn die Antwort noch die alten mitbringt.
      const dok =
        z.dok !== a.gesendet
          ? z.dok
          : gleicheLinien(a.antwort, z.dok)
            ? a.antwort
            : { ...a.antwort, grundriss: { ...a.antwort.grundriss, linien: z.dok.grundriss.linien ?? [], symbole: z.dok.grundriss.symbole ?? [] } }
      return { ...z, basis: a.antwort, version: a.version, dok, auswahl: auswahlPruefen(dok, z.auswahl) }
    }
    case 'abgelehnt': {
      // Die Datenbank hat nichts uebernommen: zurueck auf den letzten
      // bestaetigten Stand. Verlaufsstaende, die genau diesem Stand
      // entsprechen, fallen weg, sonst taete Rueckgaengig scheinbar nichts.
      let zurueck = z.zurueck
      while (zurueck.length && istLeer(unterschied(z.basis, zurueck[zurueck.length - 1]))) {
        zurueck = zurueck.slice(0, -1)
      }
      return { ...z, dok: z.basis, zurueck, vor: [], auswahl: auswahlPruefen(z.basis, z.auswahl) }
    }
    case 'neu_geladen':
      return {
        dok: a.daten,
        basis: a.daten,
        version: a.daten.grundriss.version,
        zurueck: [],
        vor: [],
        auswahl: auswahlPruefen(a.daten, z.auswahl),
      }
    case 'linien_gespeichert':
      return { ...z, basis: { ...z.basis, grundriss: { ...z.basis.grundriss, linien: a.linien, symbole: a.symbole } } }
    case 'kisten':
      return {
        ...z,
        dok: { ...z.dok, kisten: a.kisten },
        basis: { ...z.basis, kisten: a.kisten },
      }
  }
}
