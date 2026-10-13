/* Die grosse Ansicht des Grundrisses am Handy (E94): Antippen und Messen
 * als reine Rechnung ohne React, wie messpunkte.ts, damit
 * scripts/bedienung-pruefen.mjs sie unter node prueft.
 *
 * Karam: "dass man den Grundriss in 2D auch voll sehen kann und ...
 * bestimmte Sachen anklicken kann und auch messen koennen, diese
 * Messpunkte". In der grossen Ansicht (PlanGross.tsx) tut ein Tipp auf den
 * Plan je nach Art (modus) etwas anderes:
 *   ansehen  Moebel, Kiste, Regal, Tuer oder Raum antippen: ein Blatt von
 *            unten sagt, was es ist (tipp); daneben tippen schliesst es.
 *   messen   wie das Messen im Zeichner (zeichner/werkzeuge/messen.ts):
 *            Tipp 1 setzt Punkt A, Tipp 2 Punkt B, ein dritter Tipp
 *            beginnt eine neue Messung. Ein Tipp oeffnet dabei nie eine
 *            Karte.
 * Eingerastet wird mit messFangen (Raster 1 cm) an den Messpunkten der
 * Wohnung (E90, seit E93 an der Innenseite der Wand), dann an der
 * Innenseite einer Wand. Die Fangweite ist eine Fingerbreite, FINGER_PX
 * Bildpunkte, mit dem Massstab in cm umgerechnet (der Zeichner nimmt 10
 * Bildpunkte fuer die Maus). Am Handy schwebt kein Zeiger ueber dem Plan:
 * die Schnellmasse einer Oeffnung stehen da, sobald A auf einem Ende einer
 * Tuer, eines Durchgangs oder eines Fensters liegt und B noch fehlt.
 *
 * Laedt nur messpunkte.ts aus dem Zeichner (reine Rechnung). Das Handy
 * laedt weiter keinen Zeichner-Code (kein Zeichner.tsx, keine Leinwand).
 */
import type { Punkt } from '../../lib/geometrie.ts'
import type { Oeffnung, Raum } from '../../lib/types'
import { istLichte, lichteVon, messFangen, messpunktName, schnellMasse, type Messpunkt } from '../../zeichner/messpunkte.ts'
import { durchgangslichte, oeffnungPunkte, zargeCm, type PlanTreffer } from './hilfe.ts'

/** Fangweite am Handy in Bildpunkten: etwa eine Fingerkuppe. */
export const FINGER_PX = 24

type MessDaten = { raeume: Raum[]; oeffnungen: Oeffnung[] }
type Uebersetzer = (key: string, vars?: Record<string, string | number>) => string

export interface HandyMessung {
  a: Punkt | null
  b: Punkt | null
  /** Die Messpunkte an A und B (null: frei an einer Wand oder im Raster). */
  aPunkt: Messpunkt | null
  bPunkt: Messpunkt | null
}

export const MESSUNG_LEER: HandyMessung = { a: null, b: null, aPunkt: null, bPunkt: null }

/** Die Fangweite in cm bei massstab Bildpunkten je cm. Ein kaputter oder
 *  winziger Massstab gibt keine unendliche Fangweite. */
export function fingerToleranz(massstab: number): number {
  const s = Number.isFinite(massstab) && massstab > 0.01 ? massstab : 0.01
  return FINGER_PX / s
}

/** Ein Tipp beim Messen an der Stelle p (Plan-cm): ohne A oder mit
 *  fertiger Messung ist er das neue A, sonst B. */
export function messenTippen(daten: MessDaten, s: HandyMessung, p: Punkt, massstab: number): HandyMessung {
  const f = messFangen(daten, p, { raster: 1, toleranz: fingerToleranz(massstab) })
  if (!s.a || s.b) return { a: f.p, b: null, aPunkt: f.messpunkt, bPunkt: null }
  return { ...s, b: f.p, bPunkt: f.messpunkt }
}

/** Abstand von A nach B in cm, oder null, solange B fehlt. */
export function messAbstand(s: HandyMessung): number | null {
  if (!s.a || !s.b) return null
  return Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1])
}

/** Liegen A und B an den beiden Enden derselben Oeffnung (Lichte)? */
export function messLichte(s: HandyMessung): boolean {
  return !!s.a && !!s.b && istLichte(s.aPunkt, s.bPunkt)
}

/** Messen A bis B die Lichte einer Tuer (Nacharbeit E94): was davon fuer
 *  Moebel frei ist, in cm, sonst null (keine Lichte, Fenster, Durchgang).
 *  Die Enden einer Tuer sind die Maueroeffnung (E88, E93); frei ist, was
 *  zwischen der Zarge bleibt (zargeCm an jeder Seite). Auf der anderen
 *  Wandseite kann die Lichte schon kleiner sein (Innenecke des
 *  Nachbarraums, E93): dann zaehlt an jeder Seite, was mehr wegnimmt,
 *  Zarge oder Innenecke. */
export function messDurchgang(daten: MessDaten, s: HandyMessung): number | null {
  if (!s.a || !s.b) return null
  const id = lichteVon(s.aPunkt, s.bPunkt)
  const o = id ? daten.oeffnungen.find((x) => x.id === id) : null
  const r = o ? daten.raeume.find((x) => x.id === o.raum_id) : null
  const ende = o && r ? oeffnungPunkte(r, o) : null
  if (!o || o.art !== 'tuer' || !ende) return null
  const [s0, s1] = ende
  const l = Math.hypot(s1[0] - s0[0], s1[1] - s0[1])
  if (l === 0) return 0
  // Lage entlang der Tuer, ab ihrem Anfang (A und B liegen auf Linien
  // parallel zur Kante, diesseits oder jenseits der Wand).
  const t = (p: Punkt) => ((p[0] - s0[0]) * (s1[0] - s0[0]) + (p[1] - s0[1]) * (s1[1] - s0[1])) / l
  const z = zargeCm(o.breite_cm)
  const von = Math.max(z, Math.min(t(s.a), t(s.b)))
  const bis = Math.min(o.breite_cm - z, Math.max(t(s.a), t(s.b)))
  return Math.max(0, bis - von)
}

/** Die Oeffnung, deren Schnellmasse jetzt zu sehen sind: A liegt auf
 *  einem Ende einer Tuer, eines Durchgangs oder eines Fensters (auch auf
 *  der anderen Wandseite) und B fehlt noch. Sonst null. */
export function schnellOeffnung(s: HandyMessung): string | null {
  if (!s.a || s.b || !s.aPunkt || s.aPunkt.art === 'ecke') return null
  return s.aPunkt.oeffnungId ?? null
}

export interface SchnellUebersicht {
  /** Breite der Oeffnung (Lichte; bei einer Tuer die Maueroeffnung),
   *  ganze cm. */
  lichte: number | null
  /** Nur bei einer Tuer: frei fuer Moebel, die Maueroeffnung weniger der
   *  Zarge an beiden Seiten (durchgangslichte, E88: 88 ergibt 80), ganze
   *  cm. Sonst null. */
  durchgang: number | null
  /** Vom linken und rechten Ende bis zur Innenecke, null wenn es keine
   *  gibt (Oeffnung in der Ecke). */
  links: number | null
  rechts: number | null
  /** Dasselbe auf der anderen Wandseite (nur Tueren und Durchgaenge mit
   *  Nachbarraum, und nur, wenn die Zahlen dort andere sind). Links und
   *  rechts dort aus dem Nachbarraum gesehen, mit Blick zur Wand. */
  gegenueber: { links: number | null; rechts: number | null } | null
}

/** Die Schnellmasse einer Oeffnung als Zahlen fuer die Leiste (dieselben
 *  wie im Plan, schnellMasse). null, wenn es die Oeffnung nicht gibt. */
export function schnellUebersicht(daten: MessDaten, oeffnungId: string): SchnellUebersicht | null {
  const masse = schnellMasse(daten, oeffnungId, 0)
  const o = daten.oeffnungen.find((x) => x.id === oeffnungId)
  if (masse.length === 0 || !o) return null
  const zahl = (art: 'breite' | 'links' | 'rechts', gegenueber: boolean) => {
    const m = masse.find((x) => x.art === art && x.gegenueber === gegenueber)
    return m ? Math.round(m.laenge) : null
  }
  return {
    lichte: zahl('breite', false),
    durchgang: o.art === 'tuer' ? Math.round(durchgangslichte(o)) : null,
    links: zahl('links', false),
    rechts: zahl('rechts', false),
    gegenueber: masse.some((m) => m.gegenueber) ? { links: zahl('links', true), rechts: zahl('rechts', true) } : null,
  }
}

/** Name eines Messpunkts fuer die Leiste, wie im Zeichner ("Tuer Bad,
 *  links", "Ecke"); frei gesetzt heisst er "Punkt". */
export function punktName(t: Uebersetzer, m: Messpunkt | null): string {
  return m ? messpunktName(t, m) : t('grundriss.messen_frei')
}

/* ------------------------------------------------- Grosse Ansicht */

export type GrossModus = 'ansehen' | 'messen'

export interface GrossZustand {
  modus: GrossModus
  /** Was beim Ansehen angetippt ist (das Blatt unten), oder null. */
  tipp: PlanTreffer | null
  messung: HandyMessung
}

/** So beginnt die grosse Ansicht bei jedem Oeffnen: Ansehen, nichts
 *  gewaehlt, keine Messung. */
export const GROSS_START: GrossZustand = { modus: 'ansehen', tipp: null, messung: MESSUNG_LEER }

/** Ein Tipp auf den Plan an p mit dem, was dort liegt (trefferAn). Beim
 *  Messen setzt er einen Punkt und schliesst jedes Blatt, beim Ansehen
 *  waehlt er das Getroffene (null: daneben, das Blatt geht zu). */
export function grossTippen(z: GrossZustand, daten: MessDaten, p: Punkt, treffer: PlanTreffer | null, massstab: number): GrossZustand {
  if (z.modus === 'messen') return { ...z, tipp: null, messung: messenTippen(daten, z.messung, p, massstab) }
  return { ...z, tipp: treffer }
}

/** Umschalten zwischen Ansehen und Messen schliesst das Blatt; eine
 *  Messung bleibt stehen, bis "Neu" sie loescht. */
export function grossModus(z: GrossZustand, modus: GrossModus): GrossZustand {
  return { ...z, modus, tipp: null }
}

/** "Neu": die Messung weg, die Art bleibt. */
export function messungNeu(z: GrossZustand): GrossZustand {
  return { ...z, messung: MESSUNG_LEER }
}

/** Der state des Eintrags im Verlauf, den "Gross ansehen" anlegt
 *  (Grundriss.tsx). Er gehoert zum Eintrag und bleibt bei Zurueck, Vor und
 *  Neuladen erhalten; ein Direktlink mit ansicht=gross hat ihn nicht. */
export const GROSS_SELBST = { grossSelbst: true } as const

/** Wurde die grosse Ansicht dieses Eintrags mit dem Knopf geoeffnet? Dann
 *  schliesst das X mit einem Schritt zurueck, sonst nimmt es nur ansicht
 *  aus der Adresse. */
export function grossSelbstGeoeffnet(state: unknown): boolean {
  return typeof state === 'object' && state !== null && (state as { grossSelbst?: unknown }).grossSelbst === true
}
