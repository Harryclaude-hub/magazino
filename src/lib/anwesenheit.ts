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
 * ist der Umzug nach aussen, nicht jedes Mitglied vor jedem anderen. */
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Pose3D } from '../components/plan3d/vertrag3d'
import { istKennung, poseLesen, poseVerpacken } from './avatar'
import { tg } from './i18n'
import { supabase } from './supabase'

export interface WohnungVerbindung {
  /** Eigene Stellung melden. Darf jedes Bild gerufen werden, hinaus geht
   *  hoechstens alle 100 ms eine, die letzte kommt immer an. */
  pose(p: Pose3D): void
  /** Nachricht fuer sprechen.ts an genau eine Person. */
  signal(an: string, daten: unknown): void
  /** Kanal verlassen, alles aufraeumen. Danach ohne Wirkung. */
  verlassen(): void
}

export interface WohnungOptionen {
  projectId: string
  grundrissId: string
  uid: string
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

const NICHTS: WohnungVerbindung = { pose() {}, signal() {}, verlassen() {} }

export function wohnungBeitreten(o: WohnungOptionen): WohnungVerbindung {
  if (!istKennung(o.projectId) || !istKennung(o.grundrissId) || !istKennung(o.uid)) {
    // Programmfehler, aber sichtbar: ohne gueltige Kennungen kein Kanal.
    console.warn('[wohnung] ungueltige Kennung fuer Umzug, Grundriss oder Nutzer')
    queueMicrotask(() => o.onFehler(tg('fehler.wohnung_kanal')))
    return NICHTS
  }
  const ich = o.uid.toLowerCase()
  const grundriss = o.grundrissId.toLowerCase()
  const thema = `wohnung:${o.projectId.toLowerCase()}`

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

  function versenden(event: 'pose' | 'rtc', payload: unknown) {
    const k = kanal
    if (!k) return
    k.send({ type: 'broadcast', event, payload })
      .then((r) => {
        if (r !== 'ok') melden(tg('fehler.wohnung_kanal'))
      })
      .catch((err: unknown) => {
        console.warn('[wohnung] Senden fehlgeschlagen:', err instanceof Error ? err.message : err)
        melden(tg('fehler.wohnung_kanal'))
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
    const kern = `${n.x},${n.y},${n.z},${n.ga},${n.ne},${n.h},${n.t}`
    if (kern === letzterKern && !erzwingen && jetzt - letzteGesendet < PULS_MS) return
    nummer += 1
    n.n = nummer
    letzterKern = kern
    letzteGesendet = jetzt
    erzwingen = false
    versenden('pose', n)
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
    o.onPose(m.u, m.pose)
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
      melden(tg('fehler.wohnung_anmeldung', { grund: err instanceof Error ? err.message : String(err) }))
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
    k.subscribe((status, err) => {
      if (aus) return
      if (status === 'SUBSCRIBED') {
        verbunden = true
        gemeldet = null
        o.onVerbunden?.()
        k.track({ g: grundriss })
          .then((r) => {
            if (r !== 'ok') melden(tg('fehler.wohnung_kanal'))
          })
          .catch((e: unknown) => {
            console.warn('[wohnung] Anwesenheit nicht gemeldet:', e instanceof Error ? e.message : e)
            melden(tg('fehler.wohnung_kanal'))
          })
        for (const x of warteschlange.splice(0)) versenden('rtc', x)
        erzwingen = true
        planen()
        return
      }
      verbunden = false
      if (err) console.warn('[wohnung]', status, err.message)
      if (status === 'CHANNEL_ERROR') melden(tg('fehler.wohnung_kanal'))
      else if (status === 'TIMED_OUT') melden(tg('fehler.wohnung_zeit'))
      else if (status === 'CLOSED') melden(tg('fehler.wohnung_zu'))
    })
  }
  void starten()

  return {
    pose(p) {
      if (aus) return
      letztePose = { ...p }
      planen()
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
        else melden(tg('fehler.wohnung_kanal'))
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
