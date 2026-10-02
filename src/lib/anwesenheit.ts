/* Live in der Wohnung (E82): wer gerade im selben Umzug in 3D unterwegs
 * ist, wo er steht, und die Aushandlung fuer das Sprechen (sprechen.ts).
 *
 * Realtime laeuft wie webrtc.ts ausserhalb von api.ts: das ist kein
 * Datenbankzugriff, sondern ein Kanal zwischen den Geraeten. Gespeichert
 * wird nichts.
 *
 * Der Kanal 'wohnung:<Umzug>' ist privat: Realtime laesst nur Mitglieder
 * des Umzugs hinein (Regeln auf realtime.messages, Migration 0043). Fehlt
 * die Migration oder ist man kein Mitglied, meldet sich das ueber onFehler,
 * nie still. Eine Verbindung je Umzug und Tab: wer neu beitritt, ersetzt
 * eine alte zum selben Umzug.
 *
 * Was hinausgeht: die eigene Kennung, der Grundriss und die Stellung als
 * ganze Zahlen (poseVerpacken in avatar.ts), hoechstens 10 je Sekunde und
 * nicht, solange die Seite verdeckt ist. Keine Namen, keine Mail.
 *
 * Was hereinkommt, ist fremd und wird streng gelesen (poseLesen): nur ganze
 * Zahlen in festen Grenzen, der Absender muss gerade da sein und darf nicht
 * man selbst sein, die laufende Nummer steigt, hoechstens 20 Stellungen je
 * Sekunde und Absender, und nur aus dem eigenen Grundriss.
 *
 * Grenze, die man kennen muss: hinein kommt nur ein Mitglied des Umzugs,
 * aber die Kennung u in einer Nachricht setzt der Absender selbst. Ein
 * Mitglied koennte sich darin als ein anderes Mitglied ausgeben. Geschuetzt
 * ist der Umzug nach aussen, nicht jedes Mitglied vor jedem anderen.
 *
 * E86: Dieselbe Verbindung traegt auch die gemeinsame Siedlung. Mit kanal
 * 'siedlung:<Siedlung>' laesst Realtime nur den Besitzer und die
 * eingeladenen Gaeste hinein (eigene Regeln auf realtime.messages, aus dem
 * Datenpaket von E86). Alles andere bleibt gleich; die Saetze fuer Fehler
 * sprechen dann von der Siedlung statt von der Wohnung. Als grundrissId
 * geben dort alle dieselbe Kennung (die der Siedlung), sonst saehen sie
 * sich nicht.
 *
 * E87: Wer ein Fahrzeug lenkt, schickt dessen Lage mit der Stellung mit
 * (Pose3D.lenkt, im Feld l: Kennung des Fahrzeugs, Zentimeter und
 * Milliradiant). Hereinkommend wird l streng gelesen (lenktLesen); ist es
 * kaputt, faellt nur l weg, die Stellung gilt. Dazu das Ereignis 'ding':
 * jemand hat ein Ding hingestellt oder ein Fahrzeug abgestellt
 * (DingLage3D, dingLesen). Auch dafuer muss der Absender gerade da sein,
 * im selben Grundriss, hoechstens 20 je Sekunde. Gespeichert wird hier
 * nichts; das tut die Seite ueber api.ts.
 *
 * E87b: Die Kennung eines Dings oder Fahrzeugs im Ereignis 'ding' folgt
 * denselben Regeln wie in der Datenbank (siedlung_dinge, 0047: Buchstaben,
 * Ziffern und : . _ -, 1 bis 120 Zeichen), und alle Lagen liegen in deren
 * Grenzen (20 km zur Seite, 2 km hoch). Was die Datenbank ohnehin
 * ablehnen wuerde, geht so gar nicht erst hinaus und kommt nicht herein.
 * Ob ein Absender (noch) dazugehoert, prueft Raum3D gegen die Liste der
 * Mitglieder; hier zaehlt nur, wer gerade im Kanal ist. */
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { DingLage3D, Pose3D } from '../components/plan3d/vertrag3d'
import { istKennung, poseLesen, poseVerpacken } from './avatar'
import { tg } from './i18n'
import { supabase } from './supabase'

export interface WohnungVerbindung {
  /** Eigene Stellung melden. Darf jedes Bild gerufen werden, hinaus geht
   *  hoechstens alle 100 ms eine, die letzte kommt immer an. */
  pose(p: Pose3D): void
  /** Nachricht fuer sprechen.ts an genau eine Person. */
  signal(an: string, daten: unknown): void
  /** E87: Ein Ding oder Fahrzeug steht jetzt woanders: an alle anderen im
   *  Kanal. Kaputtes geht nicht hinaus (Hinweis in der Konsole). Vor dem
   *  Verbinden wird je Ding die letzte Lage gemerkt und dann gesendet. */
  ding(l: DingLage3D): void
  /** Kanal verlassen, alles aufraeumen. Danach ohne Wirkung. */
  verlassen(): void
}

export interface WohnungOptionen {
  projectId: string
  grundrissId: string
  uid: string
  /** Name des Kanals (E86), sonst 'wohnung:<projectId>'. Erlaubt sind nur
   *  'wohnung:<Kennung>' und 'siedlung:<Kennung>'; alles andere meldet sich
   *  ueber onFehler und verbindet nicht. */
  kanal?: string
  /** Wer ausser einem selbst gerade im Umzug in 3D ist, und in welchem
   *  Grundriss (null, wenn unbekannt). */
  onWer(leute: { uid: string; grundrissId: string | null }[]): void
  /** Stellung einer anderen Person im eigenen Grundriss. */
  onPose(uid: string, p: Pose3D): void
  /** Nachricht fuer sprechen.ts, nur die an einen selbst. */
  onSignal(von: string, daten: unknown): void
  /** Ein Satz fuer den Nutzer, schon uebersetzt. */
  onFehler(text: string): void
  /** Die Verbindung steht (wieder): eine gezeigte Fehlermeldung kann weg. */
  onVerbunden?(): void
  /** E87: Jemand anderes im eigenen Grundriss hat ein Ding oder Fahrzeug
   *  bewegt (geprueft wie die Stellungen). */
  onDing?(uid: string, l: DingLage3D): void
}

/** Hoechstens 10 Stellungen je Sekunde hinaus. */
const POSE_ABSTAND_MS = 100
/** Unveraenderte Stellung trotzdem alle 2 s, falls etwas verloren ging. */
const PULS_MS = 2000
const POSEN_JE_SEKUNDE = 20
const SIGNALE_JE_SEKUNDE = 100
/** Signale, bevor der Kanal steht, oder von jemandem, den die Anwesenheit
 *  noch nicht kennt (die Liste kommt manchmal kurz nach der Nachricht). */
const WARTESCHLANGE = 100
const VORAUS_MS = 5000
const VORAUS_JE_ABSENDER = 50
const VORAUS_ABSENDER = 20
/** E87: hoechstens so viele Dinge je Sekunde und Absender herein, und so
 *  viele verschiedene Dinge warten hoechstens auf die Verbindung. */
const DINGE_JE_SEKUNDE = 20
const DINGE_WARTEN = 200

/* ------------------------------------------------ E87: Fahrzeuge, Dinge */

/** Laengste Kennung eines Dings, Fahrzeugs oder einer Ebene. */
export const KENNUNG_MAX = 120
/** Weiter als so viele Meter vom Ursprung liegt nichts (Stadtteil mit Rand;
 *  E87b: dieselbe Grenze wie in der Datenbank, 0047). */
const WELT_XZ_M = 20_000
/** Hoehe zwischen -WELT_Y_M und +WELT_Y_M Metern (wie in der Datenbank). */
const WELT_Y_M = 2_000
/** Kennung eines Dings im Ereignis 'ding' (E87b): wie in der Datenbank. */
const DING_KENNUNG = /^[A-Za-z0-9:._-]{1,120}$/

/** Eine Kennung fuer Dinge, Fahrzeuge und Ebenen: Text mit 1 bis
 *  KENNUNG_MAX Zeichen, ohne Steuerzeichen. */
export function textKennung(x: unknown): x is string {
  // eslint-disable-next-line no-control-regex -- genau die sollen nicht hinein
  return typeof x === 'string' && x.length > 0 && x.length <= KENNUNG_MAX && !/[\u0000-\u001f\u007f]/.test(x)
}

/** Kennung eines Dings oder Fahrzeugs, wie siedlung_dinge sie annimmt
 *  (E87b): nur Buchstaben, Ziffern und : . _ -, 1 bis 120 Zeichen. */
export function dingKennung(x: unknown): x is string {
  return typeof x === 'string' && DING_KENNUNG.test(x)
}

function endlich(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

/** Auf -pi bis pi falten (was schon darin liegt, bleibt genau so). */
function winkelFalten(w: number): number {
  if (w >= -Math.PI && w <= Math.PI) return w
  const voll = Math.PI * 2
  let a = ((w % voll) + voll) % voll
  if (a > Math.PI) a -= voll
  return a
}

/** Ort in Metern innerhalb der Welt? */
function imRahmen(x: number, y: number, z: number): boolean {
  return Math.abs(x) <= WELT_XZ_M && Math.abs(z) <= WELT_XZ_M && Math.abs(y) <= WELT_Y_M
}

/** Was im Kanal fuer Pose3D.lenkt steht: i Kennung des Fahrzeugs, x y z in
 *  Zentimetern, ga in Milliradiant (ganze Zahlen). */
export interface LenktNachricht {
  i: string
  x: number
  y: number
  z: number
  ga: number
}

/** lenkt zum Senden verpacken. Fehlt es oder ist es kaputt: null (dann
 *  geht die Stellung ohne Fahrzeug hinaus). */
export function lenktVerpacken(l: Pose3D['lenkt']): LenktNachricht | null {
  if (!l || typeof l !== 'object') return null
  if (!textKennung(l.id) || !endlich(l.x) || !endlich(l.y) || !endlich(l.z) || !endlich(l.gier)) return null
  if (!imRahmen(l.x, l.y, l.z)) return null
  return { i: l.id, x: Math.round(l.x * 100), y: Math.round(l.y * 100), z: Math.round(l.z * 100), ga: Math.round(winkelFalten(l.gier) * 1000) }
}

/** Das Feld l einer fremden Stellung streng lesen: Kennung 1 bis 120
 *  Zeichen, jede Zahl endlich und in der Welt. Was nicht passt: null. */
export function lenktLesen(roh: unknown): NonNullable<Pose3D['lenkt']> | null {
  if (!roh || typeof roh !== 'object' || Array.isArray(roh)) return null
  const o = roh as Record<string, unknown>
  if (!textKennung(o.i) || !endlich(o.x) || !endlich(o.y) || !endlich(o.z) || !endlich(o.ga)) return null
  const x = Math.round(o.x) / 100
  const y = Math.round(o.y) / 100
  const z = Math.round(o.z) / 100
  if (!imRahmen(x, y, z)) return null
  return { id: o.i, x, y, z, gier: winkelFalten(Math.round(o.ga) / 1000) }
}

/** Was im Kanal fuer ein bewegtes Ding steht (Ereignis 'ding', Feld d):
 *  i Kennung, a Art, x y z Zentimeter, ga Milliradiant, e Ebene. */
export interface DingNachricht {
  i: string
  a: DingLage3D['art']
  x: number
  y: number
  z: number
  ga: number
  e: string
}

/** Eine Lage zum Senden verpacken; kaputt: null. */
export function dingVerpacken(l: DingLage3D): DingNachricht | null {
  if (!l || typeof l !== 'object') return null
  if (!dingKennung(l.id) || !textKennung(l.ebene) || (l.art !== 'ding' && l.art !== 'fahrzeug')) return null
  if (!endlich(l.x) || !endlich(l.y) || !endlich(l.z) || !endlich(l.gier) || !imRahmen(l.x, l.y, l.z)) return null
  return {
    i: l.id,
    a: l.art,
    x: Math.round(l.x * 100),
    y: Math.round(l.y * 100),
    z: Math.round(l.z * 100),
    ga: Math.round(winkelFalten(l.gier) * 1000),
    e: l.ebene,
  }
}

/** Ein fremdes Ding streng lesen (Feld d): Kennung wie in der Datenbank
 *  (dingKennung), Ebene 1 bis 120 Zeichen, Art 'ding' oder 'fahrzeug',
 *  jede Zahl endlich und in der Welt. Was nicht passt: null. Heraus kommt
 *  eine neue DingLage3D in Metern, ohne weitere Felder. */
export function dingLesen(roh: unknown): DingLage3D | null {
  if (!roh || typeof roh !== 'object' || Array.isArray(roh)) return null
  const o = roh as Record<string, unknown>
  if (!dingKennung(o.i) || !textKennung(o.e) || (o.a !== 'ding' && o.a !== 'fahrzeug')) return null
  if (!endlich(o.x) || !endlich(o.y) || !endlich(o.z) || !endlich(o.ga)) return null
  const x = Math.round(o.x) / 100
  const y = Math.round(o.y) / 100
  const z = Math.round(o.z) / 100
  if (!imRahmen(x, y, z)) return null
  return { id: o.i, art: o.a, x, y, z, gier: winkelFalten(Math.round(o.ga) / 1000), ebene: o.e }
}

const NICHTS: WohnungVerbindung = { pose() {}, signal() {}, ding() {}, verlassen() {} }

/** Erlaubte Kanaele (E86): Wohnung eines Umzugs oder gemeinsame Siedlung. */
const KANAL = /^(wohnung|siedlung):[0-9a-f-]{36}$/

/** Der Name des Kanals: kanal (klein geschrieben), sonst
 *  'wohnung:<projectId>'. null, wenn er nicht erlaubt ist. */
export function kanalName(o: { projectId: string; kanal?: string }): string | null {
  const name = o.kanal !== undefined ? String(o.kanal).toLowerCase() : `wohnung:${String(o.projectId).toLowerCase()}`
  return KANAL.test(name) ? name : null
}

/** Saetze fuer Fehler je Art des Kanals. Die der Siedlung stehen in
 *  bausteine/siedlung.ts, das mit der Seite der Siedlung laedt (nur sie
 *  gibt einen solchen Kanal). */
const SAETZE = {
  wohnung: { anmeldung: 'fehler.wohnung_anmeldung', kanal: 'fehler.wohnung_kanal', zeit: 'fehler.wohnung_zeit', zu: 'fehler.wohnung_zu' },
  siedlung: { anmeldung: 'siedlung.live_anmeldung', kanal: 'siedlung.live_kanal', zeit: 'siedlung.live_zeit', zu: 'siedlung.live_zu' },
} as const

export function wohnungBeitreten(o: WohnungOptionen): WohnungVerbindung {
  const name = kanalName(o)
  const satz = name?.startsWith('siedlung:') ? SAETZE.siedlung : SAETZE.wohnung
  if (!name || !istKennung(o.projectId) || !istKennung(o.grundrissId) || !istKennung(o.uid)) {
    // Programmfehler, aber sichtbar: ohne gueltige Kennungen kein Kanal.
    console.warn('[wohnung] ungueltiger Kanal oder ungueltige Kennung fuer Umzug, Grundriss oder Nutzer')
    queueMicrotask(() => o.onFehler(tg(satz.kanal)))
    return NICHTS
  }
  const thema: string = name
  const ich = o.uid.toLowerCase()
  const grundriss = o.grundrissId.toLowerCase()

  let kanal: RealtimeChannel | null = null
  let aus = false
  let verbunden = false
  let gemeldet: string | null = null

  // Die Nummer beginnt bei der Uhrzeit in ms und steigt um eins je
  // Nachricht (hoechstens 10 je Sekunde). Nach einem Neuladen beginnt sie
  // also immer hoeher als zuvor, und die anderen nehmen sie weiter an.
  let nummer = Date.now()
  let letztePose: Pose3D | null = null
  let letzterKern = ''
  let letzteGesendet = -Infinity
  let erzwingen = true
  let nachzuegler: ReturnType<typeof setTimeout> | null = null

  const anwesend = new Map<string, string | null>()
  let werZuletzt = ''
  const nummern = new Map<string, number>()
  const posenTakt = new Map<string, number[]>()
  const signalTakt = new Map<string, number[]>()
  const dingTakt = new Map<string, number[]>()
  // Dinge, die vor dem Verbinden bewegt wurden: je Kennung die letzte Lage.
  const dingeWarten = new Map<string, DingNachricht>()
  const warteschlange: { u: string; an: string; d: unknown }[] = []
  const voraus = new Map<string, { zeit: number; d: unknown }[]>()
  const gewarnt = new Set<string>()

  function melden(text: string) {
    if (aus || gemeldet === text) return
    gemeldet = text
    o.onFehler(text)
  }

  function warnenEinmal(grund: string) {
    if (gewarnt.has(grund)) return
    gewarnt.add(grund)
    console.warn('[wohnung]', grund)
  }

  /** Gleitendes Fenster von einer Sekunde je Absender. */
  function imTakt(karte: Map<string, number[]>, wer: string, max: number): boolean {
    const jetzt = performance.now()
    const liste = (karte.get(wer) ?? []).filter((t) => jetzt - t < 1000)
    const frei = liste.length < max
    if (frei) liste.push(jetzt)
    karte.set(wer, liste)
    return frei
  }

  function versenden(event: 'pose' | 'rtc' | 'ding', payload: unknown) {
    const k = kanal
    if (!k) return
    k.send({ type: 'broadcast', event, payload })
      .then((r) => {
        if (r !== 'ok') melden(tg(satz.kanal))
      })
      .catch((err: unknown) => {
        console.warn('[wohnung] Senden fehlgeschlagen:', err instanceof Error ? err.message : err)
        melden(tg(satz.kanal))
      })
  }

  /* ------------------------------------------------------ Stellung */

  function planen() {
    if (aus || !verbunden || !letztePose) return
    if (typeof document !== 'undefined' && document.hidden) return
    const jetzt = performance.now()
    const warten = letzteGesendet + POSE_ABSTAND_MS - jetzt
    if (warten > 0) {
      // Die letzte Stellung nachreichen, damit das Stehenbleiben ankommt.
      if (!nachzuegler) {
        nachzuegler = setTimeout(() => {
          nachzuegler = null
          planen()
        }, warten)
      }
      return
    }
    const n = poseVerpacken(letztePose, ich, 0, grundriss)
    // E87: das gelenkte Fahrzeug faehrt mit (kaputt: ohne, zu Fuss).
    const l = lenktVerpacken(letztePose.lenkt)
    if (letztePose.lenkt && !l) warnenEinmal('eigenes Fahrzeug mit falschem Aufbau, Stellung ohne Fahrzeug gesendet')
    const kern = `${n.x},${n.y},${n.z},${n.ga},${n.ne},${n.h},${n.t}|${l ? `${l.i},${l.x},${l.y},${l.z},${l.ga}` : ''}`
    if (kern === letzterKern && !erzwingen && jetzt - letzteGesendet < PULS_MS) return
    nummer += 1
    n.n = nummer
    letzterKern = kern
    letzteGesendet = jetzt
    erzwingen = false
    versenden('pose', l ? { ...n, l } : n)
  }

  const puls = setInterval(planen, PULS_MS)
  const sichtwechsel = () => {
    if (document.hidden) return
    erzwingen = true
    planen()
  }
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', sichtwechsel)

  /* ---------------------------------------------------- Anwesenheit */

  function werLesen() {
    const k = kanal
    if (aus || !k) return
    const stand = k.presenceState<{ g?: unknown }>()
    const neu = new Map<string, string | null>()
    for (const [schluessel, eintraege] of Object.entries(stand)) {
      if (!istKennung(schluessel)) continue
      const wer = schluessel.toLowerCase()
      if (wer === ich) continue
      // Mehrere Tabs desselben Kontos: der juengste Eintrag zaehlt.
      const letzter = eintraege[eintraege.length - 1]
      const g = letzter && istKennung(letzter.g) ? letzter.g.toLowerCase() : null
      neu.set(wer, g)
    }
    let jemandNeu = false
    for (const wer of neu.keys()) if (!anwesend.has(wer)) jemandNeu = true
    for (const wer of anwesend.keys()) {
      if (!neu.has(wer)) {
        nummern.delete(wer)
        posenTakt.delete(wer)
        signalTakt.delete(wer)
        dingTakt.delete(wer)
      }
    }
    anwesend.clear()
    for (const [wer, g] of neu) anwesend.set(wer, g)

    const liste = [...anwesend].map(([uid, grundrissId]) => ({ uid, grundrissId })).sort((a, b) => (a.uid < b.uid ? -1 : 1))
    const text = JSON.stringify(liste)
    if (text !== werZuletzt) {
      werZuletzt = text
      o.onWer(liste)
    }
    // Wer neu da ist, bekommt die eigene Stellung sofort, nicht erst beim Puls.
    if (jemandNeu) {
      erzwingen = true
      planen()
    }
    // Signale, die vor der Anwesenheit ankamen, jetzt zustellen.
    const jetzt = performance.now()
    for (const [wer, liste2] of voraus) {
      if (!anwesend.has(wer)) {
        if (liste2.every((x) => jetzt - x.zeit > VORAUS_MS)) voraus.delete(wer)
        continue
      }
      voraus.delete(wer)
      for (const x of liste2) if (jetzt - x.zeit <= VORAUS_MS) o.onSignal(wer, x.d)
    }
  }

  /* ------------------------------------------------------- Empfang */

  function poseEmpfangen(payload: unknown) {
    const m = poseLesen(payload)
    if (!m) {
      warnenEinmal('Stellung mit falschem Aufbau verworfen')
      return
    }
    if (m.u === ich || !anwesend.has(m.u)) return
    if (m.g !== grundriss) return
    const vorher = nummern.get(m.u)
    if (vorher !== undefined && m.n <= vorher) return
    if (!imTakt(posenTakt, m.u, POSEN_JE_SEKUNDE)) {
      warnenEinmal('zu viele Stellungen von einem Absender, Rest verworfen')
      return
    }
    nummern.set(m.u, m.n)
    // E87: lenkt nur, wenn es da und heil ist; kaputt faellt nur lenkt weg.
    const roh = (payload as Record<string, unknown>).l
    if (roh === undefined || roh === null) {
      o.onPose(m.u, m.pose)
      return
    }
    const lenkt = lenktLesen(roh)
    if (!lenkt) warnenEinmal('Fahrzeug einer Stellung mit falschem Aufbau verworfen')
    o.onPose(m.u, lenkt ? { ...m.pose, lenkt } : m.pose)
  }

  function dingEmpfangen(payload: unknown) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      warnenEinmal('Ding mit falschem Aufbau verworfen')
      return
    }
    const { u, g, d } = payload as Record<string, unknown>
    if (!istKennung(u) || !istKennung(g)) {
      warnenEinmal('Ding mit falschem Aufbau verworfen')
      return
    }
    const von = u.toLowerCase()
    if (von === ich || !anwesend.has(von) || g.toLowerCase() !== grundriss) return
    const l = dingLesen(d)
    if (!l) {
      warnenEinmal('Ding mit falschem Aufbau verworfen')
      return
    }
    if (!imTakt(dingTakt, von, DINGE_JE_SEKUNDE)) {
      warnenEinmal('zu viele Dinge von einem Absender, Rest verworfen')
      return
    }
    o.onDing?.(von, l)
  }

  function signalEmpfangen(payload: unknown) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return
    const { u, an, d } = payload as Record<string, unknown>
    if (!istKennung(u) || !istKennung(an)) return
    const von = u.toLowerCase()
    if (an.toLowerCase() !== ich || von === ich) return
    if (!imTakt(signalTakt, von, SIGNALE_JE_SEKUNDE)) {
      warnenEinmal('zu viele Signale von einem Absender, Rest verworfen')
      return
    }
    if (anwesend.has(von)) {
      o.onSignal(von, d)
      return
    }
    // Noch nicht in der Anwesenheit: kurz aufheben.
    const liste = voraus.get(von) ?? []
    if (!voraus.has(von) && voraus.size >= VORAUS_ABSENDER) return
    if (liste.length >= VORAUS_JE_ABSENDER) return
    liste.push({ zeit: performance.now(), d })
    voraus.set(von, liste)
  }

  /* --------------------------------------------------------- Start */

  async function starten() {
    try {
      // Private Kanaele pruefen das Zugangstoken: vorher frisch setzen.
      await supabase.realtime.setAuth()
      // Ein alter Kanal zum selben Umzug (etwa nach schnellem Neu-Oeffnen)
      // wuerde sonst wiederverwendet und nie neu beitreten.
      const alt = supabase.getChannels().find((c) => c.topic === `realtime:${thema}`)
      if (alt) await supabase.removeChannel(alt)
    } catch (err) {
      melden(tg(satz.anmeldung, { grund: err instanceof Error ? err.message : String(err) }))
      return
    }
    if (aus) return

    const k = supabase.channel(thema, {
      config: { private: true, broadcast: { self: false, ack: false }, presence: { key: ich, enabled: true } },
    })
    kanal = k
    k.on('presence', { event: 'sync' }, werLesen)
      .on('presence', { event: 'join' }, () => queueMicrotask(werLesen))
      .on('presence', { event: 'leave' }, () => queueMicrotask(werLesen))
      .on('broadcast', { event: 'pose' }, ({ payload }) => poseEmpfangen(payload))
      .on('broadcast', { event: 'rtc' }, ({ payload }) => signalEmpfangen(payload))
      .on('broadcast', { event: 'ding' }, ({ payload }) => dingEmpfangen(payload))
    k.subscribe((status, err) => {
      if (aus) return
      if (status === 'SUBSCRIBED') {
        verbunden = true
        gemeldet = null
        o.onVerbunden?.()
        k.track({ g: grundriss })
          .then((r) => {
            if (r !== 'ok') melden(tg(satz.kanal))
          })
          .catch((e: unknown) => {
            console.warn('[wohnung] Anwesenheit nicht gemeldet:', e instanceof Error ? e.message : e)
            melden(tg(satz.kanal))
          })
        for (const x of warteschlange.splice(0)) versenden('rtc', x)
        for (const d of dingeWarten.values()) versenden('ding', { u: ich, g: grundriss, d })
        dingeWarten.clear()
        erzwingen = true
        planen()
        return
      }
      verbunden = false
      if (err) console.warn('[wohnung]', status, err.message)
      if (status === 'CHANNEL_ERROR') melden(tg(satz.kanal))
      else if (status === 'TIMED_OUT') melden(tg(satz.zeit))
      else if (status === 'CLOSED') melden(tg(satz.zu))
    })
  }
  void starten()

  return {
    pose(p) {
      if (aus) return
      // Eigene Kopie, auch von lenkt: der Motor darf seine Objekte weiter benutzen.
      letztePose = { ...p, ...(p.lenkt ? { lenkt: { ...p.lenkt } } : {}) }
      planen()
    },
    ding(l) {
      if (aus) return
      const d = dingVerpacken(l)
      if (!d) {
        warnenEinmal('Ding mit falschem Aufbau nicht gesendet')
        return
      }
      if (!verbunden || !kanal) {
        // Je Ding nur die letzte Lage; zu viele verschiedene: sichtbar melden.
        if (dingeWarten.has(d.i) || dingeWarten.size < DINGE_WARTEN) dingeWarten.set(d.i, d)
        else melden(tg(satz.kanal))
        return
      }
      versenden('ding', { u: ich, g: grundriss, d })
    },
    signal(an, daten) {
      if (aus) return
      if (!istKennung(an)) {
        warnenEinmal('Signal an ungueltige Kennung verworfen')
        return
      }
      const nachricht = { u: ich, an: an.toLowerCase(), d: daten }
      if (!verbunden || !kanal) {
        if (warteschlange.length < WARTESCHLANGE) warteschlange.push(nachricht)
        else melden(tg(satz.kanal))
        return
      }
      versenden('rtc', nachricht)
    },
    verlassen() {
      if (aus) return
      aus = true
      verbunden = false
      clearInterval(puls)
      if (nachzuegler) clearTimeout(nachzuegler)
      nachzuegler = null
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', sichtwechsel)
      warteschlange.length = 0
      dingeWarten.clear()
      voraus.clear()
      const k = kanal
      kanal = null
      if (k) {
        k.untrack().catch((err: unknown) => console.warn('[wohnung] Abmelden:', err instanceof Error ? err.message : err))
        supabase.removeChannel(k).catch((err: unknown) => console.warn('[wohnung] Kanal schliessen:', err instanceof Error ? err.message : err))
      }
    },
  }
}
