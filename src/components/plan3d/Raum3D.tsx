import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowBigUp, ArrowDownToLine, ArrowUpFromLine, Car, Clock, Crosshair, Eye, Flower2, Footprints, Hand, Layers, ChevronUp, Lightbulb, LightbulbOff, LogOut, Map as KarteIcon, Maximize2, Minimize2, Moon, Rotate3d, RotateCw, Siren, SlidersHorizontal, Square, Sun, SwitchCamera, Target, X } from 'lucide-react'
import { useSprache } from '../../lib/i18n'
import type { GrundrissDaten, Item } from '../../lib/types'
import { cx } from '../../lib/util'
import { useProjektOptional } from '../../pages/ProjectLayout'
import { Button, useToast } from '../ui'
import { flaecheQm, innenPunkt, raumTitel } from '../plan/hilfe'
import { moebelArt } from '../plan/moebelArt'
import { objektMitte } from '../plan/objektVerschieben'
import { baueUmgebung } from './aussen3d'
import { zielFuerItem } from '../ItemRow'
import KistenKarte from './KistenKarte'
import MoebelKarte from './MoebelKarte'
import MoebelMenue from './MoebelMenue'
import { kistenAuf, traegerKarte, type MenueEintrag } from './moebelInfo'
import {
  motorStarten,
  type Blick,
  type Haltung,
  type MoebelAenderung,
  type MoebelKontext3D,
  type MoebelTragZustand,
  type Motor,
  type Treffer3D,
} from './motor'
import { Knueppel } from './Knueppel'
import { farbenLesen } from './farben3d'
import { baueSzene, hervorMitte, lichter, type Farben3D } from './szene'
import { umgebungAus } from './umgebungRahmen'
import type { FahrzeugArt, FahrzeugJetzt, Moeglich3D } from './vertrag3d'

/* Die 3D-Ansicht am Computer (START 5.5, BAUPLAN 5.4).
 *
 * Eigener Code-Teil samt three: geladen nur ueber oeffnen.tsx mit
 * lazy(), erst wenn jemand "3D" oeffnet. Am Handy dreht ein Finger, zwei
 * Finger verschieben und zoomen (OrbitControls).
 *
 * Massstab 1 = 1 m. Boden, Waende in Raumhoehe (Wandfarbe je Kante,
 * sonst --plan-wand-3d, Kopf in --plan-wand), Tueren orange, Fenster
 * blau, Moebel, Regale mit Brettern, Kisten in echter Groesse; die
 * gesuchte Kiste rot, die anderen gedaempft (szene.ts). Kamera drehen,
 * zoomen, verschieben; Waende, die zwischen Kamera und Raum stehen, werden
 * halbdurchsichtig.
 *
 * Begehen: in Augenhoehe durch die Wohnung (W A S D oder Pfeiltasten,
 * ziehen schaut umher, am Handy der Knueppel). Waende halten auf, Tueren
 * und Durchgaenge sind offen. Esc oder der Knopf beendet es.
 *
 * E82: Beim Begehen setzt man sich hin oder legt sich hin (Antippen),
 * hebt kleine Dinge auf, schaltet Fernseher und Wasser, schliesst Tueren
 * ab. Eine angetippte Kiste zeigt ihre Karte mit Zurueck zur Begehung.
 * Draussen gibt es eine ruhige Umgebung (aussen3d.ts).
 *
 * E87: Beim Begehen stehen Knoepfe fuer das, was gerade geht (der Motor
 * meldet es mit moeglich() und fahrzeug()): Springen (nur am Handy, am
 * Computer die Leertaste), Einsteigen, beim Fahren Aussteigen, Sicht,
 * Blaulicht (nur Feuerwehr, Rettung, Polizei) und die Geschwindigkeit;
 * mit einem Ding in der Hand Hinstellen (Mitte des Bildes, am Handy mit
 * Kreuz), Drehen und Ablegen; sitzend Aufstehen. Die Tasten (E, V, B, R,
 * Leertaste, Mausrad) liest der Motor selbst wie W A S D; hier steht nur
 * der Buchstabe am Knopf und im Hinweis. Esc beim Fahren steigt zuerst
 * aus. Die Knoepfe stehen hochkant ueber dem Knueppel, quer gehaltene
 * Handys unten zwischen Knueppel und Minikarte (BEDIEN_MASS, eine Stelle
 * fuer CSS und Pruefung, scripts/bedienung-pruefen.mjs); nichts deckt
 * Knueppel, Minikarte oder einander zu. 3D wird nie gespiegelt, auch die
 * Knoepfe bleiben im Arabischen, wo sie sind.
 *
 * E89: Beim Begehen der Wohnung (nicht in der Welt der Siedlung) hebt ein
 * Rechtsklick (am Handy langes Druecken; seit E92 ueber "Verschieben" im
 * Kontextmenue) ein Moebel an und traegt es
 * (motor.moebelTragen, Rechnung in tragen.ts); Mauern (moebelArt 'mauer')
 * sind gesperrt, und das Menue sagt es (Verschieben ausgegraut mit dem
 * Satz plan3d.moebel_gesperrt; der Motor meldet gesperrt, und hebt man es
 * doch an, kommt der Satz als Hinweis). Oben in der Mitte steht dann,
 * wie viele Moebel verschoben sind, mit Zuruecksetzen und, wenn die Seite
 * onMoebelSpeichern gibt, Speichern (die neuen Daten der Seite bauen die
 * Szene neu); beim Tragen ein Satz zur Bedienung, am Handy dazu Abstellen
 * und Drehen. Esc legt ein getragenes Moebel zurueck (nach der
 * Kistenkarte, vor allem anderen). Endet das Begehen (Knopf, 3D zu, Abbau)
 * mit ungespeicherten Verschiebungen, geht alles zurueck, und ein Hinweis
 * sagt "Verschiebungen verworfen"; ebenso, wenn ein Neubau der Szene sie
 * verwirft. Die Leiste steht im Arabischen nicht gespiegelt.
 *
 * E92: Rechtsklick (am Handy langes Druecken) auf ein Moebel, Regal oder
 * einen Schrank beim Begehen oeffnet ein kleines Menue am Zeiger
 * (MoebelMenue.tsx, gemeldet von motor.moebelKontext): "Details" immer,
 * "Verschieben", wenn es sich jetzt tragen laesst (motor.moebelAnheben,
 * weiter wie E89; gesperrt ausgegraut mit Grund), "Hinsetzen", wenn es
 * einen Platz hat, bei einem Liegeplatz (Bett) "Hinlegen"
 * (motor.moebelHinsetzen). Rechts auf eine Kiste zeigt ihre Karte. Das
 * Menue steht in der 3D-Flaeche, auch im Vollbild, ganz im Bild, nie
 * gespiegelt; Esc, ein Druck daneben, Gehen, Umschauen, Mausrad und Rollen
 * schliessen es. "Details" oeffnet die Karte des Moebels (MoebelKarte.tsx,
 * wie die Kistenkarte): Name, Art, Masse, Material, Zimmer, Preis, Shop,
 * Kisten darauf oder darin, mit Eintrag und offenem Umzug der Weg zur
 * Moebelseite; solange sie offen ist, ruht die Eingabe beim Motor. Esc der
 * Reihe nach: Menue, Moebelkarte, dann wie bisher. Ein Linksklick auf
 * einen Stuhl setzt wie bisher.
 *
 * Die Farben kommen aus den Tokens (getComputedStyle) und werden bei
 * Hell/Dunkel neu gelesen. Ohne WebGL steht ein Hinweis da, 2D bleibt.
 */

export interface Raum3DProps {
  daten: GrundrissDaten
  /** Nur diesen Raum zeigen (Kistenseite, Suche). */
  raumId?: string | null
  /** Item-Id der gesuchten oder gewaehlten Kiste (oder eines Moebels). */
  hervor?: string | null
  /** Knopf "3D schliessen" in der Leiste. */
  onSchliessen?: () => void
  /** Moebel, Regal oder Schrank wurde um dx, dy cm gezogen (nur im
   *  Zeichner). Ohne diese Angabe laesst sich nichts ziehen. */
  onObjektZiehen?: (id: string, dxCm: number, dyCm: number) => void
  /** Kurzer Klick in die Szene (nicht auf eine Tuer), Stelle im Plan in
   *  cm: der Zeichner stellt dort eine Kiste oder ein Moebel hin. */
  onTippen?: (xCm: number, yCm: number, treffer: Treffer3D | null) => void
  /** Gewaehltes Moebel (Objekt-Id): leuchtet in 3D auf. */
  markiert?: string | null
  /** E87: gleich begehen, sobald 3D laeuft (einmal je Ansicht), etwa wenn
   *  der Grundriss mit ?begehen=1 geoeffnet wurde. Spaeter wechseln wirkt
   *  nicht mehr; ohne Raeume und ohne Welt nichts. */
  startGehen?: boolean
  /** E89: beim Begehen verschobene Moebel speichern (Knopf Speichern). Je
   *  Moebel die Verschiebung der Mitte seines Grundrisses in Plan-cm und
   *  die Drehung in Grad wie Objekt.drehung (motor.moebelAenderungen,
   *  objektVerschieben.ts rechnet x und y). Ein Fehler (Ablehnung) steht
   *  in der Leiste, die Verschiebungen bleiben dann in der Szene. Gelingt
   *  es, kommen neue Daten, und der Neubau zeigt sie. Ohne diese Angabe
   *  gibt es nur Zuruecksetzen. */
  onMoebelSpeichern?: (aenderungen: MoebelAenderung[]) => Promise<void>
  className?: string
}

/** Wo das Begehen anfaengt: im gezeigten Raum, sonst im groessten Raum
 *  innen (meist Wohnzimmer oder Wohnkueche). Punkt im Plan in cm. */
function startPunkt(daten: GrundrissDaten, raumId: string | null): [number, number] | null {
  const kandidaten = raumId ? daten.raeume.filter((r) => r.id === raumId) : daten.raeume.filter((r) => r.art === 'innen')
  let best: (typeof daten.raeume)[number] | null = null
  for (const r of kandidaten) if (!best || flaecheQm(r.punkte) > flaecheQm(best.punkte)) best = r
  return best ? innenPunkt(best.punkte) : null
}

/** So lange (ms) steht der Hinweis "kein Platz zum Aussteigen"; so lange
 *  beendet ein zweites Esc das Begehen (E87b). */
const KEIN_PLATZ_MS = 5000

/** Moebel tragen (E89): nichts in der Hand, nichts verschoben. */
const TRAG_START: MoebelTragZustand = { traegt: null, ok: true, verschoben: 0, grund: null }

/* ------------------------------------------------ E87: Bedienung
 * Reine Rechnungen, ohne Browser pruefbar (scripts/bedienung-pruefen.mjs). */

/** Was man kann, bevor der Motor etwas meldet: zu Fuss und stehend. */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export const MOEGLICH_START: Moeglich3D = { einsteigen: false, aussteigen: false, halten: false, hinstellen: false, hupfen: true }

function gleichMoeglich(a: Moeglich3D, b: Moeglich3D): boolean {
  return a.einsteigen === b.einsteigen && a.aussteigen === b.aussteigen && a.halten === b.halten && a.hinstellen === b.hinstellen && a.hupfen === b.hupfen
}

/** Ein Knopf beim Begehen. kmh ist die Anzeige der Geschwindigkeit. */
type BedienKnopf = 'kmh' | 'springen' | 'aufstehen' | 'einsteigen' | 'aussteigen' | 'sicht' | 'blaulicht' | 'hinstellen' | 'drehen' | 'ablegen'

/** Hat ein Fahrzeug dieser Art Blaulicht? */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export function hatBlaulicht(art: FahrzeugArt | string): boolean {
  return art === 'feuerwehr' || art === 'rettung' || art === 'polizei'
}

interface BedienZustand {
  moeglich: Moeglich3D
  /** Das Fahrzeug, in dem man sitzt (motor.fahrzeug), sonst null. */
  fahrzeug: { art: FahrzeugArt } | null
  haltung: Haltung
  /** Man haelt etwas (motor.inHand oder Moeglich3D.halten). */
  haelt: boolean
  /** Finger statt Maus: Springen als Knopf (am Computer die Leertaste). */
  beruehren: boolean
}

/** Welche Knoepfe beim Begehen stehen, in dieser Reihenfolge (der erste
 *  unten, am naechsten zur Mitte). Im Fahrzeug: Geschwindigkeit,
 *  Aussteigen, Sicht, Blaulicht (nur wenn es eins hat). Zu Fuss: sitzend
 *  oder liegend Aufstehen, sonst am Handy Springen; Einsteigen, wenn ein
 *  Fahrzeug nah ist; mit einem Ding Hinstellen, Drehen, Ablegen.
 *  Hoechstens BEDIEN_MASS.maxKnoepfe. */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export function bedienKnoepfe(z: BedienZustand): BedienKnopf[] {
  if (z.fahrzeug || z.moeglich.aussteigen) {
    const out: BedienKnopf[] = ['kmh', 'aussteigen', 'sicht']
    if (z.fahrzeug && hatBlaulicht(z.fahrzeug.art)) out.push('blaulicht')
    return out
  }
  const out: BedienKnopf[] = []
  if (z.haltung !== 'stehen') out.push('aufstehen')
  else if (z.beruehren) out.push('springen')
  if (z.moeglich.einsteigen) out.push('einsteigen')
  if (z.haelt || z.moeglich.halten) out.push('hinstellen', 'drehen', 'ablegen')
  return out
}

/** Ist der Knopf gerade aus (sichtbar, aber ohne Wirkung)? Springen nur,
 *  wenn der Motor es erlaubt (nicht auf der Treppe, nicht im Aufzug),
 *  Hinstellen nur, wenn das Ding dort passt, wohin man zeigt. */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export function knopfAus(k: BedienKnopf, m: Moeglich3D): boolean {
  if (k === 'springen') return !m.hupfen
  if (k === 'hinstellen') return !m.hinstellen
  return false
}

/** Taste am Computer, steht klein am Knopf und im Titel. Der Motor liest
 *  sie (wie W A S D), Raum3D nur Esc. */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export const BEDIEN_TASTE: Partial<Record<BedienKnopf, string>> = {
  einsteigen: 'E',
  aussteigen: 'E',
  sicht: 'V',
  blaulicht: 'B',
  drehen: 'R',
  aufstehen: 'Esc',
}

/** Name des Knopfs (Woerterbuch plan3d). */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export const BEDIEN_NAME: Record<BedienKnopf, string> = {
  kmh: 'plan3d.kmh_name',
  springen: 'plan3d.springen',
  aufstehen: 'plan3d.aufstehen',
  einsteigen: 'plan3d.einsteigen',
  aussteigen: 'plan3d.aussteigen',
  sicht: 'plan3d.sicht',
  blaulicht: 'plan3d.blaulicht',
  hinstellen: 'plan3d.hinstellen',
  drehen: 'plan3d.ding_drehen',
  ablegen: 'plan3d.ablegen',
}

/** Was der Motor auf einen Knopf hin tut (eine Stelle, auch fuer die
 *  Pruefung). Sicht und Blaulicht schalten um, ausgehend von dem, was
 *  der Motor zuletzt gemeldet hat. E87b: false, wenn es nicht ging
 *  (Aussteigen ohne freien Platz: motor.aussteigen() meldet false), sonst
 *  true. */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export function knopfAusfuehren(
  k: BedienKnopf,
  m: Pick<Motor, 'hupfen' | 'aufstehen' | 'einsteigen' | 'aussteigen' | 'fahrSicht' | 'blaulicht' | 'hinstellen' | 'drehen' | 'ablegen'>,
  fahrt: Pick<FahrzeugJetzt, 'sicht' | 'blaulicht'> | null,
): boolean {
  switch (k) {
    case 'springen':
      m.hupfen()
      return true
    case 'aufstehen':
      m.aufstehen()
      return true
    case 'einsteigen':
      m.einsteigen()
      return true
    case 'aussteigen':
      return m.aussteigen() !== false
    case 'sicht':
      m.fahrSicht(fahrt?.sicht === 'hinten' ? 'innen' : 'hinten')
      return true
    case 'blaulicht':
      m.blaulicht(!fahrt?.blaulicht)
      return true
    case 'hinstellen':
      m.hinstellen()
      return true
    case 'drehen':
      m.drehen(1)
      return true
    case 'ablegen':
      m.ablegen()
      return true
    case 'kmh':
      return true
  }
}

/** Der Satz in der Leiste (Schluessel im Woerterbuch plan3d): ohne Begehen
 *  wie bisher, beim Begehen je nach Fahren, Halten und Geraet. */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export function bedienHinweis(z: { gehen: boolean; faehrt: boolean; haelt: boolean; beruehren: boolean; kannZiehen: boolean; hand: boolean }): string {
  if (!z.gehen) return `${z.beruehren ? 'plan3d.bedienung_handy' : z.kannZiehen ? 'plan3d.bedienung_ziehen' : 'plan3d.bedienung'}${z.hand ? '_hand' : ''}`
  if (z.faehrt) return z.beruehren ? 'plan3d.fahren_bedienung_handy' : 'plan3d.fahren_bedienung'
  if (z.haelt) return z.beruehren ? 'plan3d.halten_bedienung_handy' : 'plan3d.halten_bedienung'
  return z.beruehren ? 'plan3d.begehen_bedienung_handy' : 'plan3d.begehen_bedienung'
}

/** Masse der Bedienung beim Begehen in rem (wie Tailwind; die App hat 18 px
 *  je rem, ab 1024 px Breite 17 px, index.css): eine Stelle fuer die Lage
 *  am Bildschirm (style) und die Pruefung, dass sich nichts ueberdeckt.
 *  rand: Abstand zum Rand (dazu die sichere Zone des Handys), knueppel:
 *  Knueppel.tsx (h-32 w-32 = 8 rem), luecke: zwischen den Teilen, knopfB
 *  und knopfH: ein Knopf, spalte: Breite der Spalte rechts (Minikarte) am
 *  Handy und quer (w-[7.5rem]), kreuz: Kreuz in der Mitte (h-6 w-6),
 *  maxKnoepfe: hoechstens so viele Knoepfe (bedienKnoepfe). */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export const BEDIEN_MASS = { rand: 1, knueppel: 8, luecke: 0.5, knopfB: 3.75, knopfH: 3, spalte: 7.5, kreuz: 1.5, maxKnoepfe: 5 } as const

/** Quer gehaltenes Handy: wenig Hoehe. Dann stehen die Knoepfe unten
 *  zwischen Knueppel und Spalte und die Minikarte bleibt schmal. */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export const QUER_MEDIA = '(orientation: landscape) and (max-height: 500px)'

/** Lage der Knopfgruppe (rem ab links und unten, dazu die sichere
 *  Zone): hochkant ueber dem Knueppel und so breit wie er (zwei Knoepfe
 *  je Reihe), quer unten rechts neben dem Knueppel bis vor die Spalte.
 *  Die Reihen wachsen nach oben. */
function knopfGruppeLage(quer: boolean): { links: number; unten: number; breite: number | null; rechts: number | null } {
  const m = BEDIEN_MASS
  return quer
    ? { links: m.rand + m.knueppel + m.luecke, unten: m.rand, breite: null, rechts: m.rand + m.spalte + m.luecke }
    : { links: m.rand, unten: m.rand + m.knueppel + m.luecke, breite: m.knueppel, rechts: null }
}

/** Dasselbe als style fuer die Knopfgruppe. */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export function knopfGruppeStil(quer: boolean): CSSProperties {
  const l = knopfGruppeLage(quer)
  return {
    left: `calc(env(safe-area-inset-left, 0px) + ${l.links}rem)`,
    bottom: `calc(env(safe-area-inset-bottom, 0px) + ${l.unten}rem)`,
    ...(l.breite !== null ? { width: `${l.breite}rem` } : {}),
    ...(l.rechts !== null ? { right: `calc(env(safe-area-inset-right, 0px) + ${l.rechts}rem)` } : {}),
    gap: `${BEDIEN_MASS.luecke}rem`,
  }
}

/** Knueppel links unten, Spalte rechts unten (style). */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export const KNUEPPEL_STIL: CSSProperties = {
  left: `calc(env(safe-area-inset-left, 0px) + ${BEDIEN_MASS.rand}rem)`,
  bottom: `calc(env(safe-area-inset-bottom, 0px) + ${BEDIEN_MASS.rand}rem)`,
}
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export const SPALTE_STIL: CSSProperties = {
  right: `calc(env(safe-area-inset-right, 0px) + ${BEDIEN_MASS.rand}rem)`,
  bottom: `calc(env(safe-area-inset-bottom, 0px) + ${BEDIEN_MASS.rand}rem)`,
}
/** Ein Knopf (BedienKachel, Tacho). */
const KNOPF_STIL: CSSProperties = { width: `${BEDIEN_MASS.knopfB}rem`, height: `${BEDIEN_MASS.knopfH}rem` }

export interface Rechteck {
  x0: number
  y0: number
  x1: number
  y1: number
}

/** Wo die Teile der Bedienung bei einer Flaeche von breite mal hoehe
 *  Bildpunkten liegen (ohne sichere Zone), aus denselben Zahlen wie das
 *  style oben, mit rem Bildpunkten je rem: Knueppel, Knopfgruppe mit
 *  knoepfe Knoepfen (null ohne), Spalte rechts (spalte breit, spalteH hoch,
 *  beides in Bildpunkten, je nach Inhalt) und das Kreuz in der Mitte (nur
 *  mit fadenkreuz). Fuer die Pruefung, dass sich nichts ueberdeckt. */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export function bedienRechtecke(
  breite: number,
  hoehe: number,
  o: { quer: boolean; rem: number; spalte: number; spalteH: number; knoepfe: number; fadenkreuz: boolean },
): { knueppel: Rechteck; knoepfe: Rechteck | null; spalte: Rechteck; fadenkreuz: Rechteck | null } {
  const r = o.rem
  const m = BEDIEN_MASS
  const rand = m.rand * r
  const knueppel = { x0: rand, y0: hoehe - rand - m.knueppel * r, x1: rand + m.knueppel * r, y1: hoehe - rand }
  const spalte = { x0: breite - rand - o.spalte, y0: hoehe - rand - o.spalteH, x1: breite - rand, y1: hoehe - rand }
  let knoepfe: Rechteck | null = null
  if (o.knoepfe > 0) {
    const l = knopfGruppeLage(o.quer)
    const x0 = l.links * r
    const x1 = l.breite !== null ? (l.links + l.breite) * r : breite - (l.rechts ?? 0) * r
    const jeReihe = Math.max(1, Math.floor((x1 - x0 + m.luecke * r) / ((m.knopfB + m.luecke) * r)))
    const reihen = Math.ceil(o.knoepfe / jeReihe)
    const y1 = hoehe - l.unten * r
    knoepfe = { x0, y0: y1 - (reihen * m.knopfH + (reihen - 1) * m.luecke) * r, x1, y1 }
  }
  const k = (m.kreuz * r) / 2
  const fadenkreuz = o.fadenkreuz ? { x0: breite / 2 - k, y0: hoehe / 2 - k, x1: breite / 2 + k, y1: hoehe / 2 + k } : null
  return { knueppel, knoepfe, spalte, fadenkreuz }
}

/** Ueberdecken sich zwei Rechtecke (Beruehren zaehlt nicht)? */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export function ueberdecken(a: Rechteck, b: Rechteck): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1
}

/** Eine Medienabfrage als Zustand, folgt Aenderungen (Handy drehen). */
function useMedien(abfrage: string): boolean {
  const [an, setAn] = useState(() => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(abfrage).matches)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia(abfrage)
    const neu = () => setAn(mq.matches)
    neu()
    mq.addEventListener('change', neu)
    return () => mq.removeEventListener('change', neu)
  }, [abfrage])
  return an
}

export default function Raum3D({
  daten,
  raumId = null,
  hervor = null,
  markiert = null,
  onSchliessen,
  onObjektZiehen,
  onTippen,
  startGehen = false,
  onMoebelSpeichern,
  className,
}: Raum3DProps) {
  const { t } = useSprache()
  const nav = useNavigate()
  const toast = useToast()
  const projekt = useProjektOptional()
  const host = useRef<HTMLDivElement>(null)
  const motor = useRef<Motor | null>(null)
  const [geht, setGeht] = useState<'pruefen' | 'ja' | 'nein'>('pruefen')
  const [farben, setFarben] = useState<Farben3D>(farbenLesen)
  const [halb, setHalb] = useState(true)
  // Drehen (Standard) oder Hand (verschieben, Moebel greifen) fuer die linke
  // Maustaste; das Geraet merkt es sich. Neuer Schluessel, damit alle mit
  // Drehen anfangen.
  const [hand, setHand] = useState(() => {
    try {
      return localStorage.getItem('kistly.3d.hand') === '1'
    } catch {
      return false
    }
  })
  const handSetzen = (an: boolean) => {
    setHand(an)
    try {
      if (an) localStorage.setItem('kistly.3d.hand', '1')
      else localStorage.removeItem('kistly.3d.hand')
    } catch {
      /* ohne Speicher gilt es bis zum Neuladen */
    }
  }
  const ausgerichtet = useRef<string | null>(null)
  const [gehen, setGehen] = useState(false)
  // Vollbild (E76): die Ansicht fuellt den ganzen Bildschirm, am Handy auch
  // quer. Mit der Fullscreen-Schnittstelle, wo es sie gibt (Android, Computer);
  // sonst (iPhone) deckt sie die Seite als feste Ebene ab.
  const wurzel = useRef<HTMLDivElement>(null)
  const [vollbild, setVollbild] = useState(false)
  // Leiste einklappen (E78): dann bleibt nur ein kleiner Knopf zum Aufklappen.
  const [leisteZu, setLeisteZu] = useState(false)
  const vollbildUmschalten = () => {
    if (!vollbild) {
      setVollbild(true)
      const el = wurzel.current
      if (el && typeof el.requestFullscreen === 'function') void el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {})
    } else {
      setVollbild(false)
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
    }
  }
  useEffect(() => {
    // Mit der Zurueck-Geste oder Esc beendet: dann auch hier aus.
    const weg = () => {
      if (!document.fullscreenElement) setVollbild(false)
    }
    document.addEventListener('fullscreenchange', weg)
    return () => document.removeEventListener('fullscreenchange', weg)
  }, [])

  // Licht (E71): Automatisch nach Uhrzeit (7 bis 19 Uhr Tag), oder fest.
  const [licht, setLicht] = useState<'auto' | 'tag' | 'abend'>('auto')
  const [stunde, setStunde] = useState(() => new Date().getHours())
  useEffect(() => {
    const uhr = window.setInterval(() => setStunde(new Date().getHours()), 60_000)
    return () => window.clearInterval(uhr)
  }, [])
  const lichtJetzt: 'tag' | 'abend' = licht === 'auto' ? (stunde >= 7 && stunde < 19 ? 'tag' : 'abend') : licht
  // Licht je Raum (E74): ohne eigene Wahl folgt es Tag (aus) und Abend (an).
  // Ein Klick auf einen Schalter an der Wand oder in der Liste schaltet um.
  const [raumLicht, setRaumLicht] = useState<Record<string, boolean>>({})
  const [lichtListeAuf, setLichtListeAuf] = useState(false)
  const [teppiche, setTeppiche] = useState(true)
  // Deko und Spielzeug (E82): eigene Ebene wie die Teppiche.
  const [deko, setDeko] = useState(true)
  // Karte einer angetippten Kiste und die Kiste, die offen gezeigt wird (E82).
  const [karte, setKarte] = useState<string | null>(null)
  const [offeneKiste, setOffeneKiste] = useState<string | null>(null)
  // E92: Kontextmenue eines Moebels (vom Motor gemeldet) und die Karte
  // eines Moebels (Objekt-Id), die "Details" oeffnet.
  const [menue, setMenue] = useState<MoebelKontext3D | null>(null)
  const [moebelKarte, setMoebelKarte] = useState<string | null>(null)
  const kartenAuf = karte !== null || moebelKarte !== null
  // Beim Begehen: stehen, sitzen, liegen; und was man in der Hand haelt.
  const [haltung, setHaltung] = useState<Haltung>('stehen')
  const [inHand, setInHand] = useState<string | null>(null)
  // E87: was gerade geht (Knoepfe) und das Fahrzeug, in dem man sitzt. Die
  // Geschwindigkeit kommt bis 5-mal je Sekunde und geht darum nur an den
  // Tacho (eigene kleine Komponente), nicht in den Zustand von Raum3D.
  const [moeglich, setMoeglich] = useState<Moeglich3D>(MOEGLICH_START)
  const [fahrt, setFahrt] = useState<Omit<FahrzeugJetzt, 'kmh'> | null>(null)
  const kmhHoerer = useRef(new Set<(kmh: number) => void>())
  const kmhLetzt = useRef(0)
  const quer = useMedien(QUER_MEDIA)
  const inHandRef = useRef<string | null>(null)
  const lichtRaeumeListe = useMemo(
    () => daten.raeume.filter((r) => r.punkte.length >= 3 && (!raumId || r.id === raumId)),
    [daten.raeume, raumId],
  )
  const raumAn = (id: string) => raumLicht[id] ?? lichtJetzt === 'abend'
  const lichtAnSet = useMemo(
    () => new Set(lichtRaeumeListe.filter((r) => raumLicht[r.id] ?? lichtJetzt === 'abend').map((r) => r.id)),
    [lichtRaeumeListe, raumLicht, lichtJetzt],
  )
  const lichtJetztRef = useRef(lichtJetzt)
  useLayoutEffect(() => {
    lichtJetztRef.current = lichtJetzt
  })

  // Hell/Dunkel: die Klasse an <html> wechselt, die Tokens auch.
  useEffect(() => {
    const beob = new MutationObserver(() => setFarben(farbenLesen()))
    beob.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => beob.disconnect()
  }, [])

  useEffect(() => {
    const el = host.current
    if (!el) return
    const m = motorStarten(el)
    motor.current = m
    setGeht(m ? 'ja' : 'nein')
    return () => {
      m?.dispose()
      motor.current = null
      ausgerichtet.current = null
    }
  }, [])

  const koerper = useMemo(
    () => baueSzene(daten, farben, { raumId, hervor, markiert, teppiche, deko, offeneKiste }),
    [daten, farben, raumId, hervor, markiert, teppiche, deko, offeneKiste],
  )
  const hatKiste = useMemo(() => hervorMitte(koerper) !== null, [koerper])
  const leer = koerper.length === 0

  useEffect(() => {
    const m = motor.current
    if (!m || geht !== 'ja') return
    // Die Kamera nur beim ersten Bild und bei einem anderen Raum neu setzen,
    // sonst bleibt sie, wo man sie hingedreht hat (Zeichner aendert live).
    const schluessel = `${daten.grundriss.id}|${raumId ?? ''}`
    const neu = ausgerichtet.current !== schluessel && koerper.length > 0
    m.setzen(koerper, farben.grund, neu)
    if (neu) ausgerichtet.current = schluessel
  }, [koerper, farben.grund, geht, daten.grundriss.id, raumId])

  useEffect(() => {
    motor.current?.waendeHalb(halb)
  }, [halb, geht])

  const lichtListe = useMemo(() => lichter(daten, raumId), [daten, raumId])
  useEffect(() => {
    motor.current?.lichter(lichtListe)
  }, [lichtListe, geht])
  useEffect(() => {
    motor.current?.lichtModus(lichtJetzt)
  }, [lichtJetzt, geht])
  useEffect(() => {
    motor.current?.lichtRaeume(lichtAnSet)
  }, [lichtAnSet, geht])
  useEffect(() => {
    motor.current?.schalter((id) =>
      setRaumLicht((vorher) => ({ ...vorher, [id]: !(vorher[id] ?? lichtJetztRef.current === 'abend') })),
    )
  }, [geht])

  useEffect(() => {
    motor.current?.hand(hand)
  }, [hand, geht])

  // Der Rueckruf liegt in einer Ref, damit ein neuer Wert den Motor nicht neu anmeldet.
  const ziehRueck = useRef(onObjektZiehen)
  useLayoutEffect(() => {
    ziehRueck.current = onObjektZiehen
  })
  const kannZiehen = Boolean(onObjektZiehen)
  // Klicken zum Hinstellen: der Rueckruf in einer Ref wie beim Ziehen.
  const tippRueck = useRef(onTippen)
  useLayoutEffect(() => {
    tippRueck.current = onTippen
  })
  // Eine Kiste zeigt beim Begehen immer ihre Karte (E82), in der
  // Drehansicht nur dort, wo niemand sonst den Klick braucht (nicht im
  // Zeichner, der damit auswaehlt und hinstellt).
  const gehenRef = useRef(gehen)
  useLayoutEffect(() => {
    gehenRef.current = gehen
  })
  useEffect(() => {
    motor.current?.tippen((x, y, tr) => {
      if (tr?.kiste && (gehenRef.current || !tippRueck.current)) {
        setKarte(tr.kiste)
        return
      }
      tippRueck.current?.(x, y, tr)
    })
  }, [geht])
  // Solange eine Karte offen ist (Kiste oder, E92, Moebel), ruhen Gehen und Umschauen.
  useEffect(() => {
    motor.current?.eingabe(karte === null && moebelKarte === null)
  }, [karte, moebelKarte, geht])
  useEffect(() => {
    const m = motor.current
    if (!m) return
    m.haltung(setHaltung)
    m.inHand((id) => {
      inHandRef.current = id
      setInHand(id)
    })
    // E87: Knoepfe und Fahrzeug. Neu gesetzt nur bei echter Aenderung.
    m.moeglich((x) => setMoeglich((alt) => (gleichMoeglich(alt, x) ? alt : { ...x })))
    m.fahrzeug((f) => {
      if (f) {
        kmhLetzt.current = f.kmh
        for (const h of kmhHoerer.current) h(f.kmh)
      }
      setFahrt((alt) => {
        if (!f) return null
        if (alt && alt.id === f.id && alt.art === f.art && alt.sicht === f.sicht && alt.blaulicht === f.blaulicht) return alt
        return { id: f.id, art: f.art, sicht: f.sicht, blaulicht: f.blaulicht }
      })
    })
    return () => {
      m.haltung(null)
      m.inHand(null)
      m.moeglich(null)
      m.fahrzeug(null)
    }
  }, [geht])

  // Spiegel spiegeln echt, solange man geht (kostet Rechenzeit).
  useEffect(() => {
    motor.current?.spiegel(gehen)
  }, [gehen, geht])

  // Draussen (E82): Himmel, Wiese, Weg, Baeume, Nachbarhaeuser. Nur fuer die
  // ganze Wohnung, nicht beim Blick in einen einzelnen Raum.
  const umgebung = useMemo(
    () => (raumId ? null : umgebungAus({ raeume: daten.raeume, oeffnungen: daten.oeffnungen })),
    [daten.raeume, daten.oeffnungen, raumId],
  )
  useEffect(() => {
    const m = motor.current
    if (!m || geht !== 'ja' || !umgebung) return
    let aussen: ReturnType<typeof baueUmgebung>
    try {
      aussen = baueUmgebung({ rahmen: umgebung.rahmen, frei: umgebung.frei, farben, stockwerkHoehe: 0 })
    } catch (err) {
      // Ohne Aussenwelt geht die Wohnung weiter; der Fehler wird gezeigt.
      console.warn('[3d] Aussenwelt:', err)
      return
    }
    m.umgebung({ gruppe: aussen.gruppe, nebel: aussen.nebel, himmel: aussen.himmel })
    return () => {
      m.umgebung(null)
      aussen.dispose()
    }
  }, [umgebung, farben, geht])

  /** Bedienung mit Fingern (Handy, Tablet): anderer Hinweis. */
  const beruehren = useMemo(() => window.matchMedia('(pointer: coarse)').matches, [])
  const traeger = useMemo(() => traegerKarte(daten.kisten), [daten.kisten])
  useEffect(() => {
    motor.current?.ziehen(kannZiehen ? (id, dx, dy) => ziehRueck.current?.(id, dx, dy) : null, traeger)
  }, [kannZiehen, traeger, geht])

  const blick = (b: Blick) => {
    setGehen(false)
    motor.current?.blick(b)
  }

  // E87: gleich begehen (startGehen, etwa ?begehen=1), einmal, sobald der
  // Motor laeuft und es etwas zu begehen gibt. Wie ein Druck auf den Knopf.
  const startGegangen = useRef(false)
  useEffect(() => {
    if (!startGehen || startGegangen.current || geht !== 'ja' || leer) return
    startGegangen.current = true
    setGehen(true)
  }, [startGehen, geht, leer])

  // Begehen an und aus; der Motor merkt sich die Kamera von vorher.
  useEffect(() => {
    if (geht !== 'ja') return
    const m = motor.current
    if (!m) return
    const start = gehen ? startPunkt(daten, raumId) : null
    // E87: neues Begehen beginnt zu Fuss; was der Motor danach meldet, gilt.
    if (!gehen) {
      setMoeglich(MOEGLICH_START)
      setFahrt(null)
    }
    m.begehen(gehen, start)
    // Nur beim Umschalten, nicht bei jeder Aenderung am Plan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gehen, geht])

  // E87: im Fahrzeug, oder mit einem Ding in der Hand (fuer Knoepfe, Esc, Hinweis).
  const faehrt = gehen && (fahrt !== null || moeglich.aussteigen)
  const haelt = gehen && !faehrt && (inHand !== null || moeglich.halten)

  // ------------------------------------------------ E89: Moebel tragen
  // Nur beim Begehen der Wohnung. Mauern
  // lassen sich nicht tragen; jedes Moebel dreht um die Mitte seines
  // Grundrisses (Meter, Welt x und z), damit Speichern genau das trifft,
  // was man in 3D sieht.
  // Nur wer auch speichern darf (Admin): sonst bleibt alles ansehen.
  const tragenAn = gehen && geht === 'ja' && daten.raeume.length > 0 && Boolean(onMoebelSpeichern)
  const [trag, setTrag] = useState<MoebelTragZustand>(TRAG_START)
  const traegt = tragenAn ? trag.traegt : null
  const gesperrt = useMemo(() => new Set(daten.objekte.filter((o) => moebelArt(o.name ?? '') === 'mauer').map((o) => o.id)), [daten.objekte])
  const mitten = useMemo(() => {
    const m = new Map<string, readonly [number, number]>()
    for (const o of daten.objekte) {
      const [x, y] = objektMitte(o)
      m.set(o.id, [x / 100, y / 100])
    }
    return m
  }, [daten.objekte])
  const tragSaetze = useRef({ gesperrt, mitten })
  useLayoutEffect(() => {
    tragSaetze.current = { gesperrt, mitten }
  })
  // Zuletzt gemeldet: wie viele verschoben sind (fuer "verworfen").
  const verschobenRef = useRef(0)
  // Eigenes Zuruecksetzen verwirft nichts ungewollt; nach dem Speichern
  // verwirft der Neubau nur, was gespeichert ist (Zahl, -1: nichts).
  const eigenesZurueck = useRef(false)
  const gespeichertZahl = useRef(-1)
  const speichernRueck = useRef(onMoebelSpeichern)
  useLayoutEffect(() => {
    speichernRueck.current = onMoebelSpeichern
  })
  const kannSpeichern = Boolean(onMoebelSpeichern)
  const [speichert, setSpeichert] = useState(false)
  const speichertRef = useRef(false)
  const [speicherFehler, setSpeicherFehler] = useState<string | null>(null)
  const tragRueck = useRef<(z: MoebelTragZustand) => void>(() => {})
  useLayoutEffect(() => {
    tragRueck.current = (z) => {
      const vorher = verschobenRef.current
      verschobenRef.current = z.verschoben
      setTrag((alt) =>
        alt.traegt === z.traegt && alt.ok === z.ok && alt.verschoben === z.verschoben ? alt : { traegt: z.traegt, ok: z.ok, verschoben: z.verschoben, grund: null },
      )
      if (z.grund === 'gesperrt') toast(t('plan3d.moebel_gesperrt'), 'info')
      if (vorher > 0 && z.verschoben === 0 && !eigenesZurueck.current) {
        // Ein Neubau der Szene hat die Verschiebungen verworfen (neue Daten).
        const gespeichert = gespeichertZahl.current
        gespeichertZahl.current = -1
        if (gespeichert < vorher) toast(t('plan3d.verschiebungen_verworfen'), 'info')
      }
    }
  })
  useEffect(() => {
    const m = motor.current
    if (!m || !tragenAn) return
    const s = tragSaetze.current
    m.moebelTragen((z) => tragRueck.current(z), s.gesperrt, s.mitten)
    return () => {
      // Begehen zu Ende, 3D zu oder Abbau: Ungespeichertes geht zurueck,
      // und ein Hinweis sagt es (nach dem Abbau tut der Motor nichts mehr).
      const n = verschobenRef.current
      m.moebelTragen(null)
      eigenesZurueck.current = true
      m.moebelZuruecksetzen()
      eigenesZurueck.current = false
      verschobenRef.current = 0
      gespeichertZahl.current = -1
      setTrag(TRAG_START)
      setSpeicherFehler(null)
      if (n > 0) toast(t('plan3d.verschiebungen_verworfen'), 'info')
    }
    // Nur An und Aus zaehlen; toast und t sind stabil genug.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tragenAn])
  // Neue Daten (etwa nach dem Speichern): neue Mitten und Sperren.
  useEffect(() => {
    if (tragenAn) motor.current?.moebelTragen((z) => tragRueck.current(z), gesperrt, mitten)
  }, [tragenAn, gesperrt, mitten])
  const moebelZuruecksetzen = () => {
    const m = motor.current
    if (!m) return
    eigenesZurueck.current = true
    m.moebelZuruecksetzen()
    eigenesZurueck.current = false
    setSpeicherFehler(null)
  }
  const moebelSpeichern = async () => {
    const m = motor.current
    const fn = speichernRueck.current
    if (!m || !fn || speichertRef.current) return
    const liste = m.moebelAenderungen()
    if (liste.length === 0) return
    speichertRef.current = true
    setSpeichert(true)
    setSpeicherFehler(null)
    gespeichertZahl.current = liste.length
    try {
      await fn(liste)
    } catch (err) {
      // Abgelehnt (etwa veraltet): der Satz steht in der Leiste, die
      // Verschiebungen bleiben, Zuruecksetzen geht weiter.
      gespeichertZahl.current = -1
      const text = err instanceof Error ? err.message : String(err)
      setSpeicherFehler(text)
      toast(t('plan3d.moebel_speichern_fehler', { fehler: text }), 'error')
    } finally {
      speichertRef.current = false
      setSpeichert(false)
    }
  }

  // ------------------------------------------------ E92: Kontextmenue
  // Beim Begehen meldet der Motor Rechtsklick und langes Druecken auf ein
  // Moebel (moebelKontext), auch in der Welt der Siedlung (dort ohne
  // Verschieben, Tragen ist aus). null heisst: das Menue gilt nicht mehr
  // (Gehen, Umschauen, ein Druck auf das Bild, neuer Bau, Ende).
  useEffect(() => {
    const m = motor.current
    if (!m || !gehen || geht !== 'ja') return
    m.moebelKontext((k) => setMenue(k))
    return () => {
      m.moebelKontext(null)
      setMenue(null)
      setMoebelKarte(null)
    }
  }, [gehen, geht])
  const menueRef = useRef<HTMLDivElement>(null)
  /** Menue zu, ohne Wahl (Esc, daneben, Mausrad, Rollen). */
  const menueZu = useCallback(() => {
    setMenue(null)
    motor.current?.moebelKontextZu()
  }, [])
  // Ein Druck neben dem Menue schliesst es. Auf das Bild regelt das der
  // Motor (der Druck tippt dann nichts an, und er meldet null). Mausrad,
  // Rollen und eine neue Groesse schliessen es auch.
  useEffect(() => {
    if (!menue) return
    const druck = (e: PointerEvent) => {
      const ziel = e.target instanceof Node ? e.target : null
      if (ziel && (menueRef.current?.contains(ziel) || host.current?.contains(ziel))) return
      menueZu()
    }
    document.addEventListener('pointerdown', druck, true)
    window.addEventListener('wheel', menueZu, { capture: true, passive: true })
    window.addEventListener('scroll', menueZu, true)
    window.addEventListener('resize', menueZu)
    return () => {
      document.removeEventListener('pointerdown', druck, true)
      window.removeEventListener('wheel', menueZu, { capture: true })
      window.removeEventListener('scroll', menueZu, true)
      window.removeEventListener('resize', menueZu)
    }
  }, [menue, menueZu])
  /** Ein Eintrag gewaehlt: Details oeffnet die Karte, Verschieben hebt
   *  an, Hinsetzen setzt und Hinlegen legt (beides moebelHinsetzen, der
   *  Motor merkt sich die Stelle des Klicks und die Art des Platzes). */
  const menueWahl = (w: MenueEintrag) => {
    const k = menue
    const m = motor.current
    setMenue(null)
    if (!k || !m) return
    m.moebelKontextZu()
    if (w === 'details') setMoebelKarte(k.objektId)
    else if (w === 'verschieben') m.moebelAnheben(k.objektId)
    else m.moebelHinsetzen(k.objektId)
  }

  // E87b: Aussteigen ohne freien Platz (motor.aussteigen() meldet false):
  // ein Hinweis (Toast, im Vollbild auch oben in der Ansicht, wo Toasts
  // nicht zu sehen sind), KEIN_PLATZ_MS lang. Kam es von Esc, beendet ein
  // zweites Esc in dieser Zeit das Begehen (die Fahrt endet dabei mit).
  // Die Taste E liest der Motor selbst, sie meldet sich hier nicht.
  const [keinPlatz, setKeinPlatz] = useState<{ n: number; esc: boolean } | null>(null)
  const escKeinPlatz = useRef(false)
  const keinPlatzMelden = (esc: boolean) => {
    escKeinPlatz.current = esc
    toast(t(esc ? 'plan3d.aussteigen_kein_platz_esc' : 'plan3d.aussteigen_kein_platz'), 'error')
    setKeinPlatz((v) => ({ n: (v?.n ?? 0) + 1, esc }))
  }
  const keinPlatzRef = useRef(keinPlatzMelden)
  useLayoutEffect(() => {
    keinPlatzRef.current = keinPlatzMelden
  })
  useEffect(() => {
    if (!keinPlatz) return
    const h = window.setTimeout(() => {
      escKeinPlatz.current = false
      setKeinPlatz(null)
    }, KEIN_PLATZ_MS)
    return () => window.clearTimeout(h)
  }, [keinPlatz])
  // Wieder zu Fuss (oder Begehen aus): der Hinweis ist erledigt.
  const keinPlatzJetzt = faehrt ? keinPlatz : null
  useEffect(() => {
    if (!faehrt) escKeinPlatz.current = false
  }, [faehrt])

  // Esc der Reihe nach (E82): erst (E92) das Kontextmenue und die Karte
  // eines Moebels, dann die Kistenkarte, dann (E89) ein
  // getragenes Moebel zuruecklegen, dann (E87) beim Fahren aussteigen, dann
  // aufstehen, dann das Begehen beenden, dann das Vollbild; erst danach
  // schliesst 3D.
  const escLage = useRef({ karte, haltung, gehen, vollbild, faehrt, traegt, menue, moebelKarte })
  useLayoutEffect(() => {
    escLage.current = { karte, haltung, gehen, vollbild, faehrt, traegt, menue, moebelKarte }
  })
  useEffect(() => {
    const taste = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // Ein offenes Fenster ueber der Seite (etwa die Liste der Wohnungen
      // der Siedlung, E84) schliesst zuerst. Eines, in dem diese Ansicht
      // selbst steckt (Fenster3D) oder das in ihr liegt, zaehlt nicht.
      const w = wurzel.current
      const fremd = Array.from(document.querySelectorAll('[aria-modal="true"]')).some((d) => !!w && !d.contains(w) && !w.contains(d))
      if (fremd) return
      const z = escLage.current
      // E92: zuerst das Kontextmenue, dann die Karte eines Moebels.
      if (z.menue || z.moebelKarte) {
        if (z.menue) {
          setMenue(null)
          motor.current?.moebelKontextZu()
        } else setMoebelKarte(null)
        e.stopPropagation()
        e.preventDefault()
        return
      }
      // E89: nach der Kistenkarte ein getragenes Moebel zurueck, wo es vor
      // dem Anheben stand, vor allem anderen.
      if (!z.karte && z.gehen && z.traegt) {
        motor.current?.moebelZuruecklegen()
        e.stopPropagation()
        e.preventDefault()
        return
      }
      if (z.karte) setKarte(null)
      else if (z.gehen && z.faehrt && escKeinPlatz.current) setGehen(false)
      else if (z.gehen && z.faehrt) {
        if (motor.current?.aussteigen() === false) keinPlatzRef.current(true)
      } else if (z.gehen && z.haltung !== 'stehen') motor.current?.aufstehen()
      else if (z.gehen) setGehen(false)
      else if (z.vollbild) setVollbild(false)
      else return
      e.stopPropagation()
      e.preventDefault()
    }
    window.addEventListener('keydown', taste, true)
    return () => window.removeEventListener('keydown', taste, true)
  }, [])

  const projectId = daten.grundriss.project_id

  const karteKiste = karte ? (daten.kisten.find((k) => k.id === karte) ?? null) : null
  const karteRaum = karteKiste?.platz_raum_id ? daten.raeume.find((r) => r.id === karteKiste.platz_raum_id) : null
  // E92: das Moebel der offenen Karte (null: nicht mehr im Plan), sein
  // Zimmer, die Kisten darauf oder darin und der Weg zur Moebelseite (nur
  // mit Eintrag und offenem Umzug, und nur, wenn dieser Plan zu genau dem
  // offenen Umzug gehoert).
  const karteObjekt = moebelKarte ? (daten.objekte.find((o) => o.id === moebelKarte) ?? null) : null
  const karteObjektRaum = karteObjekt ? (daten.raeume.find((r) => r.id === karteObjekt.raum_id) ?? null) : null
  const karteObjektSeite =
    karteObjekt?.item_id && projekt && projekt.project.id === projectId
      ? zielFuerItem(projectId, { id: karteObjekt.item_id, kind: 'furniture' } as Item)
      : null
  const menueName = menue ? (daten.objekte.find((o) => o.id === menue.objektId)?.name ?? '') : ''

  // Knoepfe beim Begehen (E87): was gerade geht, in fester Reihenfolge.
  const knoepfe = gehen ? bedienKnoepfe({ moeglich, fahrzeug: fahrt, haltung, haelt, beruehren }) : []
  const knopfGruppe =
    knoepfe.length > 0 ? (
      <div
        role="toolbar"
        aria-label={t('plan3d.aktionen')}
        data-knoepfe={knoepfe.join(' ')}
        // Erster Knopf rechts unten (am naechsten zur Mitte), Reihen wachsen nach oben.
        // Nur die Knoepfe fangen Finger und Maus, die Luecken dazwischen nicht.
        className="pointer-events-none absolute z-20 flex flex-row-reverse flex-wrap-reverse content-start *:pointer-events-auto"
        style={knopfGruppeStil(quer)}
      >
        {knoepfe.map((k) =>
          k === 'kmh' ? (
            <Tacho key={k} hoerer={kmhHoerer.current} start={kmhLetzt.current} name={t(BEDIEN_NAME.kmh)} />
          ) : (
            <BedienKachel
              key={k}
              knopf={k}
              // Sicht ist ein Schalter: gedrueckt heisst von hinten.
              name={t(k === 'sicht' ? 'plan3d.sicht_hinten' : BEDIEN_NAME[k])}
              kurz={t(BEDIEN_NAME[k])}
              taste={beruehren ? null : (BEDIEN_TASTE[k] ?? null)}
              an={k === 'blaulicht' ? !!fahrt?.blaulicht : k === 'sicht' ? fahrt?.sicht === 'hinten' : undefined}
              aus={knopfAus(k, moeglich)}
              onClick={() => {
                const m = motor.current
                // E87b: ging es nicht (kein Platz zum Aussteigen), ein Hinweis statt Stille.
                if (m && !knopfAusfuehren(k, m, fahrt)) keinPlatzMelden(false)
              }}
            />
          ),
        )}
      </div>
    ) : null
  // Hinweise und Fehler (E87): oben in der Mitte unter dem Stockwerk, nicht
  // mehr rechts unten. So bleibt die Spalte mit der Minikarte gleich hoch
  // und deckt auch quer am Handy nichts zu; ein Fehler ist trotzdem immer
  // zu sehen, auch im Vollbild.
  const chip = 'max-w-md rounded-xl border bg-surface/95 px-3 py-2 text-center text-sm font-bold shadow'
  // E89: Einzahl und Mehrzahl ausgeschrieben (wie tn), damit jeder
  // Schluessel im Woerterbuch zu finden ist.
  const verschobenSatz = t(trag.verschoben === 1 ? 'plan3d.moebel_verschoben.eins' : 'plan3d.moebel_verschoben.viele', { n: trag.verschoben })
  const hinweise = [
    // E89: verschobene Moebel und, beim Tragen, wie es geht. Der Behaelter
    // erbt ltr (nicht gespiegelt), nur die Saetze richten sich nach ihrer
    // Sprache.
    tragenAn && (trag.traegt || trag.verschoben > 0) ? (
      <div key="moebel" data-moebel-leiste="" className={cx(chip, 'flex flex-col items-center gap-2 border-line text-ink')} role="group" aria-label={verschobenSatz}>
        {trag.traegt ? (
          <p dir="auto" data-moebel-hinweis="" role="status" className={cx('max-w-full', !trag.ok && 'text-danger')}>
            {t(beruehren ? 'plan3d.moebel_tragen_hinweis_handy' : 'plan3d.moebel_tragen_hinweis')}
            {trag.ok ? null : ` ${t('plan3d.moebel_hier_nicht')}`}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span dir="auto" data-moebel-zahl={trag.verschoben} className="px-1">
            {verschobenSatz}
          </span>
          {beruehren && trag.traegt ? (
            <>
              <Button size="sm" variant="primary" data-moebel-abstellen="" disabled={!trag.ok} onClick={() => motor.current?.moebelAbstellen()}>
                {t('plan3d.moebel_abstellen')}
              </Button>
              <Button size="sm" variant="outline" data-moebel-drehen="" onClick={() => motor.current?.drehen(1)}>
                <RotateCw size={15} /> {t('plan3d.ding_drehen')}
              </Button>
            </>
          ) : null}
          <Button size="sm" variant="outline" data-moebel-zuruecksetzen="" title={t('plan3d.moebel_zuruecksetzen_hilfe')} onClick={moebelZuruecksetzen}>
            {t('plan3d.moebel_zuruecksetzen')}
          </Button>
          {kannSpeichern ? (
            <Button
              size="sm"
              variant="primary"
              data-moebel-speichern=""
              title={t('plan3d.moebel_speichern_hilfe')}
              loading={speichert}
              disabled={trag.verschoben === 0 || trag.traegt !== null}
              onClick={() => void moebelSpeichern()}
            >
              {t('aktion.speichern')}
            </Button>
          ) : null}
        </div>
        {speicherFehler ? (
          <p dir="auto" role="alert" data-moebel-fehler="" className="max-w-full text-danger">
            {t('plan3d.moebel_speichern_fehler', { fehler: speicherFehler })}
          </p>
        ) : null}
      </div>
    ) : null,
    // E87b: kein Platz zum Aussteigen. Der Toast ist im Vollbild nicht zu
    // sehen, darum dort auch hier.
    vollbild && keinPlatzJetzt ? (
      <p key={`platz-${keinPlatzJetzt.n}`} dir="auto" className={cx(chip, 'border-warn text-ink')} role="status">
        {t(keinPlatzJetzt.esc ? 'plan3d.aussteigen_kein_platz_esc' : 'plan3d.aussteigen_kein_platz')}
      </p>
    ) : null,
  ].filter(Boolean)

  return (
    <div
      ref={wurzel}
      className={cx(
        // plan3d-flaeche: langes Druecken markiert nichts und oeffnet kein
        // Menue (E81, am iPhone wurde beim Gehen die ganze Seite blau).
        'plan3d-flaeche flex min-h-0 flex-col overflow-hidden bg-paper',
        vollbild ? 'fixed inset-0 z-[70]' : 'relative h-full',
        className && !vollbild ? className : null,
      )}
    >
      {/* Knopfleiste. Am Handy nur Zeichen, gleich gross, in genau zwei
          Reihen (E78): oben Ansicht und Bewegen, unten Licht und Anzeige.
          Ab sm eine Reihe mit Namen. Sie beginnt unter der Statusleiste des
          Handys (safe-area), im Vollbild liegt sie halbdurchsichtig ueber
          dem Bild, und sie laesst sich einklappen. */}
      {leisteZu ? null : (
      <div
        className={cx(
          // Hochkant zwei Reihen, quer (ab md) eine Reihe nur mit Zeichen, ab lg mit Namen.
          // Abstand zur Kamera-Aussparung oben und, quer gehalten, links und rechts.
          'flex flex-col items-center gap-1 pb-2 pe-[calc(env(safe-area-inset-right,0px)+0.5rem)] ps-[calc(env(safe-area-inset-left,0px)+0.5rem)] pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] md:flex-row md:flex-wrap md:justify-center md:gap-1.5 lg:justify-start lg:gap-2 lg:pt-2',
          vollbild ? 'absolute inset-x-0 top-0 z-20 bg-surface/85 backdrop-blur' : 'border-b border-line bg-surface',
        )}
      >
        <div className="flex items-center justify-center gap-1 md:contents">
          <Knopf zeichen={KarteIcon} name={t('plan3d.ansicht_oben')} onClick={() => blick('oben')} disabled={geht !== 'ja' || leer} />
          <Knopf zeichen={Eye} name={t('plan3d.ansicht_schraeg')} onClick={() => blick('schraeg')} disabled={geht !== 'ja' || leer} />
          {hatKiste ? (
            <Knopf zeichen={Crosshair} farbe="var(--plan-hervor)" name={t('plan3d.zur_kiste')} onClick={() => blick('kiste')} disabled={geht !== 'ja'} />
          ) : null}
          <Knopf
            zeichen={Footprints}
            name={t(gehen ? 'plan3d.begehen_ende' : 'plan3d.begehen')}
            hilfe={t('plan3d.begehen_hilfe')}
            an={gehen}
            onClick={() => setGehen((v) => !v)}
            // Mit eigener Welt (Siedlung ohne Wohnung) geht man auch ohne Raeume.
            disabled={geht !== 'ja' || leer}
          />
          <div className={cx('flex rounded-xl border-2 border-line p-0.5', gehen && 'pointer-events-none opacity-40')} role="group" aria-label={t('plan3d.modus')}>
            <Teil zeichen={Hand} name={t('plan3d.hand')} hilfe={t('plan3d.hand_hilfe')} an={hand} onClick={() => handSetzen(true)} />
            <Teil zeichen={Rotate3d} name={t('plan3d.drehen')} hilfe={t('plan3d.drehen_hilfe')} an={!hand} onClick={() => handSetzen(false)} />
          </div>
          <Knopf
            zeichen={vollbild ? Minimize2 : Maximize2}
            name={t(vollbild ? 'plan3d.vollbild_ende' : 'plan3d.vollbild')}
            an={vollbild}
            onClick={vollbildUmschalten}
          />
        </div>
        <div className="flex items-center justify-center gap-1 md:contents">
          <div className="flex rounded-xl border-2 border-line p-0.5" role="group" aria-label={t('plan3d.licht')}>
            {(
              [
                ['tag', Sun, 'plan3d.licht_tag'],
                ['abend', Moon, 'plan3d.licht_abend'],
                ['auto', Clock, 'plan3d.licht_auto'],
              ] as const
            ).map(([wert, Zeichen, schluessel]) => (
              <Teil
                key={wert}
                zeichen={Zeichen}
                name={t(schluessel)}
                an={licht === wert}
                onClick={() => {
                  // Tag, Abend oder Automatisch gilt wieder fuer alle Raeume.
                  setLicht(wert)
                  setRaumLicht({})
                }}
              />
            ))}
          </div>
          <Knopf
            zeichen={Lightbulb}
            name={t('plan3d.licht_raeume')}
            hilfe={t('plan3d.licht_schalter_hilfe')}
            an={lichtListeAuf}
            aufklapp
            onClick={() => setLichtListeAuf((v) => !v)}
            disabled={geht !== 'ja' || leer}
          />
          <Knopf zeichen={Layers} name={t('plan3d.waende_halb')} an={halb} onClick={() => setHalb((v) => !v)} disabled={geht !== 'ja'} />
          <Knopf zeichen={Square} name={t('plan3d.teppiche')} an={teppiche} onClick={() => setTeppiche((v) => !v)} disabled={geht !== 'ja'} />
          <Knopf zeichen={Flower2} name={t('plan3d.deko')} an={deko} onClick={() => setDeko((v) => !v)} disabled={geht !== 'ja'} />
          <p className="t-sub hidden min-w-0 flex-1 truncate px-1 lg:block" title={geht === 'ja' ? t(bedienHinweis({ gehen, faehrt, haelt, beruehren, kannZiehen, hand })) : undefined}>
            {geht !== 'ja' ? null : t(bedienHinweis({ gehen, faehrt, haelt, beruehren, kannZiehen, hand }))}
          </p>
          <Knopf zeichen={ChevronUp} name={t('plan3d.leiste_zu')} onClick={() => setLeisteZu(true)} />
          {onSchliessen && !vollbild ? <Knopf zeichen={X} name={t('plan3d.schliessen')} onClick={onSchliessen} /> : null}
        </div>
      </div>
      )}
      {/* Plaene werden nie gespiegelt, auch nicht im Arabischen. */}
      <div dir="ltr" className="relative min-h-0 flex-1" style={{ background: 'var(--plan-grund)' }}>
        <div
          ref={host}
          className={cx('absolute inset-0', geht === 'nein' && 'hidden')}
          role="img"
          aria-label={t('plan3d.leinwand')}
        />
        {leisteZu ? (
          <div className="absolute start-[calc(env(safe-area-inset-left,0px)+0.5rem)] top-[calc(env(safe-area-inset-top,0px)+0.5rem)] z-30 flex gap-1">
            <Knopf zeichen={SlidersHorizontal} name={t('plan3d.leiste_auf')} onClick={() => setLeisteZu(false)} />
            {onSchliessen && !vollbild ? <Knopf zeichen={X} name={t('plan3d.schliessen')} onClick={onSchliessen} /> : null}
          </div>
        ) : null}
        {geht === 'ja' && lichtListeAuf && !leer ? (
          // Licht je Raum: an, aus, alle. Auch ein Klick auf einen Schalter an der Wand schaltet.
          <div
            dir="auto"
            className={cx(
              // right statt end: der Behaelter hat dir=auto, die Liste soll im
              // Arabischen nicht nach links springen (3D wird nie gespiegelt).
              'absolute right-3 z-30 w-64 max-w-[calc(100%-1.5rem)] rounded-2xl border border-line bg-surface/95 p-2 shadow-lg',
              vollbild && !leisteZu ? 'top-28 md:top-16' : 'top-3',
            )}
          >
            <p className="t-sub px-1 pb-1">{t('plan3d.licht_schalter_hilfe')}</p>
            <div className="flex flex-wrap gap-1 pb-1">
              <Button size="sm" variant="outline" onClick={() => setRaumLicht(Object.fromEntries(lichtRaeumeListe.map((r) => [r.id, true])))}>
                {t('plan3d.licht_alle_an')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setRaumLicht(Object.fromEntries(lichtRaeumeListe.map((r) => [r.id, false])))}>
                {t('plan3d.licht_alle_aus')}
              </Button>
            </div>
            <ul className="max-h-72 overflow-y-auto">
              {lichtRaeumeListe.map((r) => {
                const an = raumAn(r.id)
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      aria-pressed={an}
                      onClick={() => setRaumLicht((vorher) => ({ ...vorher, [r.id]: !an }))}
                      className={cx('flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start text-sm font-bold hover:bg-raised', an ? 'text-ink' : 'text-muted')}
                    >
                      {an ? <Lightbulb size={16} style={{ color: 'var(--plan-strom)' }} /> : <LightbulbOff size={16} />}
                      <span className="min-w-0 flex-1 truncate">{raumTitel(r)}</span>
                      <span className="t-sub">{t(an ? 'plan3d.licht_an' : 'plan3d.licht_aus')}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}
        {geht === 'nein' ? (
          <div dir="auto" className="absolute inset-0 flex items-center justify-center p-6">
            <p className="max-w-md rounded-2xl border border-line bg-surface p-4 text-center font-bold text-ink" role="status">
              {t('plan3d.geht_nicht')}
            </p>
          </div>
        ) : geht === 'ja' && gehen && !kartenAuf ? (
          <>
            {/* Gehen per Steuerknueppel (E81): schieben, loslassen bleibt
                stehen; im Fahrzeug Gas und Lenken (E87). Lage aus BEDIEN_MASS. */}
            <div className="absolute" style={KNUEPPEL_STIL}>
              <Knueppel name={t(faehrt ? 'plan3d.knueppel_fahren' : 'plan3d.knueppel')} onLage={(x, y) => motor.current?.gehenStick(x, y)} />
            </div>
            {/* Knoepfe fuer das, was gerade geht (E87): hochkant ueber dem
                Knueppel, quer zwischen Knueppel und Spalte. */}
            {knopfGruppe}
            {/* Mit einem Ding in der Hand am Handy: das Kreuz zeigt, wohin
                Hinstellen es stellt (Mitte des Bildes). */}
            {beruehren && haelt ? (
              <div aria-hidden="true" data-fadenkreuz="" className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-6 w-6 -translate-x-1/2 -translate-y-1/2">
                <span className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 rounded-full bg-ink shadow-[0_0_0_1px_var(--surface)]" />
                <span className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 rounded-full bg-ink shadow-[0_0_0_1px_var(--surface)]" />
              </div>
            ) : null}
          </>
        ) : geht === 'ja' && leer ? (
          <div dir="auto" className="pointer-events-none absolute inset-x-0 top-6 flex justify-center">
            <p className="rounded-xl border border-line bg-surface px-3 py-2 text-muted">{t('plan3d.leer')}</p>
          </div>
        ) : null}
        {/* Hinweise und Fehler (E87): oben in der Mitte. */}
        {hinweise.length > 0 && !kartenAuf ? (
          <div
            data-hinweise=""
            className={cx(
              'pointer-events-none absolute inset-x-0 z-20 flex flex-col items-center gap-1 px-3 *:pointer-events-auto',
              vollbild && !leisteZu ? 'top-28 md:top-16' : 'top-3',
            )}
          >
            {hinweise}
          </div>
        ) : null}
        {karteKiste ? (
          // Karte der angetippten Kiste (E82): im 3D-Behaelter, damit sie auch
          // im Vollbild zu sehen ist. Zurueck fuehrt in die Begehung.
          <div className={cx('absolute inset-x-0 bottom-0 z-40', vollbild && !leisteZu ? 'top-28 md:top-16' : 'top-0')}>
            <KistenKarte
              kiste={karteKiste}
              raumName={karteRaum ? raumTitel(karteRaum) : null}
              projectId={projectId}
              offen={offeneKiste === karteKiste.id}
              begehen={gehen}
              onOeffnen={() => setOffeneKiste((v) => (v === karteKiste.id ? null : karteKiste.id))}
              onZurueck={() => setKarte(null)}
              onGanzOeffnen={(pfad) => {
                setKarte(null)
                if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
                onSchliessen?.()
                nav(pfad)
              }}
            />
          </div>
        ) : null}
        {moebelKarte !== null ? (
          // E92: Karte eines Moebels (Details aus dem Kontextmenue), am
          // selben Platz wie die Kistenkarte. Zurueck fuehrt in die Begehung.
          <div className={cx('absolute inset-x-0 bottom-0 z-40', vollbild && !leisteZu ? 'top-28 md:top-16' : 'top-0')}>
            <MoebelKarte
              objekt={karteObjekt}
              raumName={karteObjektRaum ? raumTitel(karteObjektRaum) : null}
              kisten={karteObjekt ? kistenAuf(traeger, karteObjekt.id) : 0}
              seite={karteObjektSeite}
              begehen={gehen}
              onZurueck={() => setMoebelKarte(null)}
              onSeite={(pfad) => {
                setMoebelKarte(null)
                if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
                onSchliessen?.()
                nav(pfad)
              }}
            />
          </div>
        ) : null}
        {menue && gehen && !kartenAuf ? (
          // E92: Kontextmenue am Zeiger, in der 3D-Flaeche (ltr, auch im
          // Vollbild). Der Rahmen nur fuer "daneben gedrueckt?".
          <div ref={menueRef} className="contents">
            <MoebelMenue
              key={`${menue.objektId}|${menue.x}|${menue.y}`}
              x={menue.x}
              y={menue.y}
              tragbar={menue.tragbar}
              gesperrt={menue.gesperrt}
              sitzbar={menue.sitzbar}
              liegen={menue.liegen}
              name={menueName}
              onWahl={menueWahl}
              onZu={menueZu}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** Ein Knopf der 3D-Leiste: am Handy nur das Zeichen (Name als Hilfe und
 *  fuer Vorleser), ab sm mit Namen. an: gedrueckt (dunkel). */
function Knopf({
  zeichen: Zeichen,
  name,
  hilfe,
  an,
  aufklapp,
  farbe,
  onClick,
  disabled,
}: {
  zeichen: typeof Sun
  name: string
  hilfe?: string
  an?: boolean
  aufklapp?: boolean
  farbe?: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <Button
      size="sm"
      variant={an ? 'aktiv' : 'outline'}
      aria-pressed={an === undefined ? undefined : an}
      aria-expanded={aufklapp ? an : undefined}
      aria-label={name}
      title={hilfe ?? name}
      onClick={onClick}
      disabled={disabled}
      className="h-10 w-10 justify-center px-0 lg:w-auto lg:min-w-10 lg:px-3.5"
    >
      <Zeichen size={17} style={farbe ? { color: farbe } : undefined} />
      <span className="hidden lg:inline">{name}</span>
    </Button>
  )
}

const KACHEL_ZEICHEN: Record<Exclude<BedienKnopf, 'kmh'>, typeof Sun> = {
  springen: ArrowBigUp,
  aufstehen: ArrowUpFromLine,
  einsteigen: Car,
  aussteigen: LogOut,
  sicht: SwitchCamera,
  blaulicht: Siren,
  hinstellen: Target,
  drehen: RotateCw,
  ablegen: ArrowDownToLine,
}

/** Ein Knopf beim Begehen (E87): Zeichen und kurzer Name darunter, so
 *  gross wie BEDIEN_MASS.knopfB mal knopfH. Am Computer steht die Taste
 *  klein in der Ecke und im Titel. an: eingeschaltet (Blaulicht, Sicht
 *  von hinten), aus: gerade ohne Wirkung. */
function BedienKachel({
  knopf,
  name,
  kurz,
  taste,
  an,
  aus,
  onClick,
}: {
  knopf: Exclude<BedienKnopf, 'kmh'>
  name: string
  kurz: string
  taste: string | null
  an?: boolean
  aus: boolean
  onClick: () => void
}) {
  const Zeichen = KACHEL_ZEICHEN[knopf]
  return (
    <button
      type="button"
      data-knopf={knopf}
      aria-label={name}
      aria-pressed={an === undefined ? undefined : an}
      aria-disabled={aus || undefined}
      title={taste ? `${name} (${taste})` : name}
      onClick={() => {
        if (!aus) onClick()
      }}
      style={KNOPF_STIL}
      className={cx(
        'knopf relative flex shrink-0 touch-manipulation select-none flex-col items-center justify-center gap-0.5 rounded-xl border-2 px-0.5 shadow',
        an ? 'border-ink bg-ink text-paper' : 'border-line bg-surface/95 text-ink',
        aus && 'opacity-45',
        knopf === 'blaulicht' && an && 'text-[var(--plan-fenster)]',
      )}
    >
      <Zeichen size={20} aria-hidden="true" />
      <span dir="auto" className="max-w-full truncate text-[0.5625rem] font-bold leading-none">
        {kurz}
      </span>
      {taste ? (
        <span aria-hidden="true" className="absolute right-0.5 top-0.5 rounded px-0.5 text-[0.5625rem] font-black leading-none opacity-70">
          {taste}
        </span>
      ) : null}
    </button>
  )
}

/** Die Geschwindigkeit beim Fahren (E87): hoert selbst auf den Motor
 *  (bis 5-mal je Sekunde), damit nicht ganz Raum3D neu zeichnet. */
function Tacho({ hoerer, start, name }: { hoerer: Set<(kmh: number) => void>; start: number; name: string }) {
  const [kmh, setKmh] = useState(() => Math.max(0, Math.round(start)))
  useEffect(() => {
    const neu = (v: number) => setKmh(Number.isFinite(v) ? Math.max(0, Math.round(Math.abs(v))) : 0)
    hoerer.add(neu)
    return () => {
      hoerer.delete(neu)
    }
  }, [hoerer])
  return (
    <div
      data-knopf="kmh"
      title={name}
      style={KNOPF_STIL}
      className="flex shrink-0 flex-col items-center justify-center rounded-xl border-2 border-line bg-surface/95 text-ink shadow"
    >
      <span className="t-serial text-lg font-black leading-none">{kmh}</span>
      <span className="text-[0.625rem] font-bold leading-none text-muted">km/h</span>
    </div>
  )
}

/** Ein Teil einer Gruppe (Hand oder Drehen, Tag, Abend, Automatisch). */
function Teil({
  zeichen: Zeichen,
  name,
  hilfe,
  an,
  onClick,
}: {
  zeichen: typeof Sun
  name: string
  hilfe?: string
  an: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={an}
      aria-label={name}
      onClick={onClick}
      title={hilfe ?? name}
      className={cx(
        'flex h-8 min-w-8 items-center justify-center gap-1 rounded-lg px-1.5 text-sm font-bold leading-tight lg:px-2',
        an ? 'bg-ink text-paper' : 'text-ink hover:bg-raised',
      )}
    >
      <Zeichen size={15} /> <span className="hidden lg:inline">{name}</span>
    </button>
  )
}
