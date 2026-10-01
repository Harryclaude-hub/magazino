/* Sprechen in der Wohnung (E82): wer in 3D nah beieinander steht, hoert
 * sich. Jede Person ist mit jeder direkt verbunden (WebRTC, Masche); das
 * reicht fuer etwa sechs Leute. Die Aushandlung laeuft ueber den Kanal der
 * Wohnung (anwesenheit.ts: signal und onSignal), der Ton selbst direkt
 * zwischen den Geraeten. Wie in webrtc.ts gilt: ohne TURN-Server scheitert
 * die direkte Verbindung in manchen Mobilfunknetzen, dann steht das im
 * Zustand (fehler), statt still nichts zu tun.
 *
 * Hoeren geht auch mit eigenem Mikrofon aus: jede Verbindung hat von Anfang
 * an eine Tonspur, die erst nur empfaengt. Schaltet man das Mikrofon ein,
 * kommt die Spur hinein (replaceTrack) und die Richtung wird neu
 * ausgehandelt. Ausschalten stoppt die Spur ganz (das Mikrofon-Licht geht
 * aus).
 *
 * Aushandlung nach dem Muster "perfect negotiation": beide duerfen jederzeit
 * neu anbieten, bei Zusammenstoss gibt die hoefliche Seite nach. Hoeflich
 * ist die kleinere Kennung, die groessere legt die eine Tonspur an und
 * beginnt. Jede Seite gibt jedem Paar eine eigene Sitzungskennung (s) mit;
 * f ist die Sitzung der Gegenseite, an die eine Nachricht geht. So erkennt
 * jede Seite ein Neuladen der anderen und wirft Nachrichten an alte
 * Verbindungen weg.
 *
 * Naehe: jeder fremde Ton laeuft durch WebAudio mit eigenem Regler. Bis
 * 1,5 m volle Lautstaerke, dann weich (smoothstep) leiser bis 0 bei 12 m,
 * jede Aenderung in 100 ms. Ohne bekannten Abstand bleibt jemand stumm.
 * Chrome liefert einen fremden Strom nur dann an WebAudio, wenn er auch an
 * einem (stummen) audio-Element haengt; darum gibt es beides. Browser
 * starten Ton erst nach einer Beruehrung: der Zustand sagt das (tonGesperrt),
 * die naechste Beruehrung oder Taste gibt ihn frei. */
import { istKennung } from './avatar'
import { tg } from './i18n'
import { ICE_SERVERS } from './webrtc'

export interface SprechZustand {
  /** Das eigene Mikrofon sendet. */
  mikrofon: boolean
  /** Mit wem der Ton gerade direkt verbunden ist (Kennungen). */
  verbunden: string[]
  /** Letzter Fehler als Satz fuer den Nutzer, sonst null. */
  fehler: string | null
  /** Der Browser haelt den Ton an, bis jemand tippt oder eine Taste drueckt. */
  tonGesperrt: boolean
}

/** Hoechstens so viele direkte Verbindungen (Rechenzeit und Datenmenge). */
const MAX_PARTNER = 10
/** Neubeginn einer Verbindung je Absender hoechstens so oft (E82, Pruefung). */
const NEUSTART_MS = 2000
/** So viele alte Sitzungskennungen je Absender werden gemerkt. */
const ALT_MAX = 16
const SITZUNG = /^[A-Za-z0-9-]{8,64}$/
const SDP_MAX = 30_000
const VORGEMERKT_MS = 5000
const VORGEMERKT_JE_ABSENDER = 60
const ICE_WARTE_MAX = 100

/** Lautstaerke nach Abstand in Metern: 1 bis 1,5 m, 0 ab 12 m, dazwischen
 *  weich. Unbekannt (keine Zahl) heisst stumm. */
export function naehe(meter: number): number {
  if (!Number.isFinite(meter)) return 0
  if (meter <= 1.5) return 1
  if (meter >= 12) return 0
  const x = (meter - 1.5) / (12 - 1.5)
  return 1 - x * x * (3 - 2 * x)
}

type Inhalt =
  | { art: 'hallo' }
  | { art: 'tschuess' }
  | { art: 'sdp'; sdp: { type: 'offer' | 'answer'; sdp: string } }
  | { art: 'ice'; ice: RTCIceCandidateInit }

type Nachricht = Inhalt & { s: string; f: string | null }

function neueSitzung(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36)
  }
}

function kurzText(x: unknown, max: number): x is string {
  return typeof x === 'string' && x.length <= max
}

/** Fremde Nachricht streng lesen, sonst null. */
function lesen(d: unknown): Nachricht | null {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return null
  const o = d as Record<string, unknown>
  if (typeof o.s !== 'string' || !SITZUNG.test(o.s)) return null
  let f: string | null = null
  if (o.f !== undefined && o.f !== null) {
    if (typeof o.f !== 'string' || !SITZUNG.test(o.f)) return null
    f = o.f
  }
  const kopf = { s: o.s, f }
  if (o.art === 'hallo' || o.art === 'tschuess') return { ...kopf, art: o.art }
  if (o.art === 'sdp') {
    const b = o.sdp as Record<string, unknown> | null
    if (!b || typeof b !== 'object') return null
    if (b.type !== 'offer' && b.type !== 'answer') return null
    if (!kurzText(b.sdp, SDP_MAX) || !b.sdp) return null
    return { ...kopf, art: 'sdp', sdp: { type: b.type, sdp: b.sdp } }
  }
  if (o.art === 'ice') {
    const c = o.ice as Record<string, unknown> | null
    if (!c || typeof c !== 'object') return null
    if (!kurzText(c.candidate, 2000)) return null
    const ice: RTCIceCandidateInit = { candidate: c.candidate }
    if (c.sdpMid !== undefined && c.sdpMid !== null) {
      if (!kurzText(c.sdpMid, 64)) return null
      ice.sdpMid = c.sdpMid
    }
    if (c.sdpMLineIndex !== undefined && c.sdpMLineIndex !== null) {
      if (typeof c.sdpMLineIndex !== 'number' || !Number.isInteger(c.sdpMLineIndex) || c.sdpMLineIndex < 0 || c.sdpMLineIndex > 63) return null
      ice.sdpMLineIndex = c.sdpMLineIndex
    }
    if (c.usernameFragment !== undefined && c.usernameFragment !== null) {
      if (!kurzText(c.usernameFragment, 256)) return null
      ice.usernameFragment = c.usernameFragment
    }
    return { ...kopf, art: 'ice', ice }
  }
  return null
}

interface Partner {
  uid: string
  pc: RTCPeerConnection
  /** Kleinere Kennung: gibt bei Zusammenstoss nach. */
  hoeflich: boolean
  /** Eigene Sitzung fuer dieses Paar und die der Gegenseite. */
  meine: string
  ihre: string | null
  macheAngebot: boolean
  ignoriereAngebot: boolean
  antwortSetzen: boolean
  /** Nachrichten eines Paars laufen nacheinander. */
  kette: Promise<void>
  iceWarte: RTCIceCandidateInit[]
  transceiver: RTCRtpTransceiver | null
  spurId: string | null
  audio: HTMLAudioElement | null
  quelle: MediaStreamAudioSourceNode | null
  regler: GainNode | null
  zustand: RTCPeerConnectionState
}

type Weg = { signal(an: string, daten: unknown): void }

export class Sprechen {
  private readonly weg: Weg
  private readonly ich: string
  private partner = new Map<string, Partner>()
  /** Sitzungen der Gegenseite, die vorbei sind (Neuladen, Tschuess). */
  private alt = new Map<string, Set<string>>()
  /** Neubeginn je Absender hoechstens alle NEUSTART_MS (E82, Pruefung):
   *  sonst koennte ein Mitglied mit immer neuen Sitzungskennungen bei
   *  anderen hundert Verbindungen je Sekunde erzwingen. Was in der Sperre
   *  ankommt, wird gemerkt (nur das Letzte) und danach verarbeitet, damit
   *  ein echtes Neuladen nicht verloren geht. */
  private neustartZeit = new Map<string, number>()
  private neustartWarte = new Map<string, { n: Nachricht; uhr: ReturnType<typeof setTimeout> }>()
  private gewuenscht = new Set<string>()
  private vorgemerkt = new Map<string, { zeit: number; n: Nachricht }[]>()
  private ziele = new Map<string, number>()
  private mic: MediaStream | null = null
  private micAn = false
  private micWunsch = 0
  private ctx: AudioContext | null = null
  private fehler: string | null = null
  private handler: ((z: SprechZustand) => void) | null = null
  private zuletzt = ''
  private beendet = false
  private gewarnt = new Set<string>()
  private readonly geste: () => void

  constructor(weg: Weg, selfId: string) {
    this.weg = weg
    this.ich = selfId.toLowerCase()
    // Ton freigeben bei der naechsten Beruehrung oder Taste (Autoplay-Regel).
    this.geste = () => {
      void this.tonAn()
    }
    if (typeof document !== 'undefined') {
      for (const ereignis of ['pointerdown', 'keydown', 'touchend'] as const) {
        document.addEventListener(ereignis, this.geste, { capture: true, passive: true })
      }
    }
  }

  on(ereignis: 'zustand', fn: (z: SprechZustand) => void): this {
    if (ereignis === 'zustand') {
      this.handler = fn
      this.zuletzt = ''
      queueMicrotask(() => this.melden())
    }
    return this
  }

  /** Wer gerade da ist (ohne einen selbst). Zu allen anderen wird eine
   *  Verbindung aufgebaut, wer fehlt, wird getrennt. */
  leute(uids: string[]): void {
    if (this.beendet) return
    const soll = new Set<string>()
    for (const u of uids) {
      if (!istKennung(u)) continue
      const k = u.toLowerCase()
      if (k !== this.ich && soll.size < MAX_PARTNER) soll.add(k)
    }
    this.gewuenscht = soll
    for (const uid of [...this.partner.keys()]) if (!soll.has(uid)) this.trennen(uid, true)
    for (const uid of [...this.alt.keys()]) if (!soll.has(uid)) this.alt.delete(uid)
    for (const uid of [...this.neustartZeit.keys(), ...this.neustartWarte.keys()]) if (!soll.has(uid)) this.neustartVergessen(uid)
    for (const uid of soll) if (!this.partner.has(uid)) this.verbinden(uid)
    // Was vorher schon ankam, jetzt der Reihe nach verarbeiten.
    const jetzt = performance.now()
    for (const [uid, liste] of [...this.vorgemerkt]) {
      if (!soll.has(uid)) {
        if (liste.every((x) => jetzt - x.zeit > VORGEMERKT_MS)) this.vorgemerkt.delete(uid)
        continue
      }
      this.vorgemerkt.delete(uid)
      for (const x of liste) if (jetzt - x.zeit <= VORGEMERKT_MS) this.verarbeiten(uid, x.n)
    }
    this.melden()
  }

  /** Nachricht aus dem Kanal (onSignal von anwesenheit.ts). */
  empfangen(von: string, daten: unknown): void {
    if (this.beendet || !istKennung(von)) return
    const uid = von.toLowerCase()
    if (uid === this.ich) return
    const n = lesen(daten)
    if (!n) {
      this.warnen('Nachricht mit falschem Aufbau verworfen')
      return
    }
    if (!this.gewuenscht.has(uid)) {
      // Kommt vor, wenn die Nachricht schneller ist als die Liste der Leute.
      const liste = this.vorgemerkt.get(uid) ?? []
      if (liste.length < VORGEMERKT_JE_ABSENDER && (this.vorgemerkt.has(uid) || this.vorgemerkt.size < MAX_PARTNER * 2)) {
        liste.push({ zeit: performance.now(), n })
        this.vorgemerkt.set(uid, liste)
      }
      return
    }
    this.verarbeiten(uid, n)
  }

  /** Mikrofon an oder aus. Am besten direkt aus einem Tippen heraus rufen:
   *  dann gibt der Browser auch den Ton frei. Fehler stehen im Zustand. */
  async mikrofon(an: boolean): Promise<void> {
    if (this.beendet) return
    const nr = ++this.micWunsch
    // Noch innerhalb der Geste, vor dem ersten await.
    void this.tonAn()
    if (!an) {
      this.micAus()
      this.melden()
      return
    }
    if (this.micAn && this.mic) return
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.fehler = tg('fehler.mikrofon_fehlt', { grund: 'getUserMedia' })
      this.melden()
      return
    }
    let strom: MediaStream
    try {
      strom = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      })
    } catch (err) {
      if (nr !== this.micWunsch || this.beendet) return
      this.fehler =
        err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'SecurityError')
          ? tg('fehler.sprechen_mikrofon_abgelehnt')
          : tg('fehler.mikrofon_fehlt', { grund: err instanceof Error ? err.message : String(err) })
      this.melden()
      return
    }
    // Inzwischen wieder aus (oder beendet): Spur gleich stoppen.
    if (nr !== this.micWunsch || this.beendet) {
      strom.getTracks().forEach((t) => t.stop())
      return
    }
    this.mic = strom
    this.micAn = true
    this.fehler = null
    strom.getAudioTracks()[0]?.addEventListener('ended', () => {
      // Mikrofon abgezogen oder Freigabe entzogen.
      if (this.mic !== strom) return
      this.micAus()
      this.fehler = tg('fehler.mikrofon_fehlt', { grund: 'ended' })
      this.melden()
    })
    for (const p of this.partner.values()) this.spurSetzenSicher(p)
    this.melden()
  }

  /** Abstand zu einer Person in Metern (jedes Bild oder bei Bewegung). */
  lautstaerke(uid: string, meter: number): void {
    if (this.beendet || !istKennung(uid)) return
    const k = uid.toLowerCase()
    const ziel = naehe(meter)
    const vorher = this.ziele.get(k)
    if (vorher !== undefined && Math.abs(vorher - ziel) < 0.002) return
    this.ziele.set(k, ziel)
    const p = this.partner.get(k)
    if (p) this.reglerSetzen(p, ziel)
  }

  /** Alles schliessen, Mikrofon aus. Danach ohne Wirkung. */
  beenden(): void {
    if (this.beendet) return
    for (const uid of [...this.partner.keys()]) this.trennen(uid, true)
    this.micAus()
    this.beendet = true
    if (typeof document !== 'undefined') {
      for (const ereignis of ['pointerdown', 'keydown', 'touchend'] as const) {
        document.removeEventListener(ereignis, this.geste, { capture: true })
      }
    }
    const ctx = this.ctx
    this.ctx = null
    ctx?.close().catch((err: unknown) => console.warn('[sprechen] Ton schliessen:', err instanceof Error ? err.message : err))
    this.vorgemerkt.clear()
    this.gewuenscht.clear()
    for (const uid of [...this.neustartWarte.keys()]) this.neustartVergessen(uid)
    this.neustartZeit.clear()
    this.alt.clear()
    this.melden()
  }

  /* ------------------------------------------------------- intern */

  private warnen(grund: string) {
    if (this.gewarnt.has(grund)) return
    this.gewarnt.add(grund)
    console.warn('[sprechen]', grund)
  }

  private zustand(): SprechZustand {
    const verbunden = [...this.partner.values()].filter((p) => p.zustand === 'connected').map((p) => p.uid).sort()
    const tonGesperrt =
      !this.beendet &&
      (this.ctx
        ? this.ctx.state !== 'running' && this.partner.size > 0
        : [...this.partner.values()].some((p) => p.audio !== null && p.audio.paused))
    return { mikrofon: this.micAn, verbunden, fehler: this.fehler, tonGesperrt }
  }

  private melden() {
    if (!this.handler) return
    const z = this.zustand()
    const text = JSON.stringify(z)
    if (text === this.zuletzt) return
    this.zuletzt = text
    this.handler(z)
  }

  private senden(p: Partner, inhalt: Inhalt) {
    this.weg.signal(p.uid, { ...inhalt, s: p.meine, f: p.ihre })
  }

  private altVon(uid: string): Set<string> {
    let s = this.alt.get(uid)
    if (!s) {
      s = new Set()
      this.alt.set(uid, s)
    }
    // Hoechstens die letzten ALT_MAX Kennungen merken (Set behaelt die Reihenfolge).
    while (s.size >= ALT_MAX) {
      const erste = s.values().next().value
      if (erste === undefined) break
      s.delete(erste)
    }
    return s
  }

  private neustartVergessen(uid: string) {
    const w = this.neustartWarte.get(uid)
    if (w) clearTimeout(w.uhr)
    this.neustartWarte.delete(uid)
    this.neustartZeit.delete(uid)
  }

  private audioKontext(): AudioContext | null {
    if (this.ctx || this.beendet || typeof window === 'undefined') return this.ctx
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    try {
      this.ctx = new AC()
      this.ctx.onstatechange = () => this.melden()
    } catch (err) {
      this.warnen(`kein AudioContext: ${err instanceof Error ? err.message : String(err)}`)
      this.ctx = null
    }
    return this.ctx
  }

  /** Ton freigeben (innerhalb einer Nutzergeste aufrufen). */
  private async tonAn(): Promise<void> {
    if (this.beendet) return
    const ctx = this.audioKontext()
    const warten: Promise<unknown>[] = []
    if (ctx && ctx.state !== 'running' && ctx.state !== 'closed') warten.push(ctx.resume())
    for (const p of this.partner.values()) {
      if (p.audio && p.audio.paused) warten.push(p.audio.play())
    }
    if (!warten.length) return
    const ergebnis = await Promise.allSettled(warten)
    for (const e of ergebnis) {
      if (e.status === 'rejected') {
        const r: unknown = e.reason
        // NotAllowed heisst nur: noch keine Geste. Das zeigt tonGesperrt.
        if (!(r instanceof DOMException && r.name === 'NotAllowedError')) {
          this.warnen(`Ton nicht gestartet: ${r instanceof Error ? r.message : String(r)}`)
        }
      }
    }
    this.melden()
  }

  /** Neue Verbindung zu uid. meine: eigene Sitzung (neu, ausser nach einem
   *  Neubeginn der Gegenseite), ihre: deren Sitzung, falls schon bekannt. */
  private verbinden(uid: string, meine: string = neueSitzung(), ihre: string | null = null): Partner {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    const p: Partner = {
      uid,
      pc,
      hoeflich: this.ich < uid,
      meine,
      ihre,
      macheAngebot: false,
      ignoriereAngebot: false,
      antwortSetzen: false,
      kette: Promise.resolve(),
      iceWarte: [],
      transceiver: null,
      spurId: null,
      audio: null,
      quelle: null,
      regler: null,
      zustand: 'new',
    }
    this.partner.set(uid, p)
    const aktuell = () => this.partner.get(uid) === p

    pc.onicecandidate = (e) => {
      if (aktuell() && e.candidate) this.senden(p, { art: 'ice', ice: e.candidate.toJSON() })
    }
    pc.onnegotiationneeded = async () => {
      if (!aktuell()) return
      try {
        p.macheAngebot = true
        await pc.setLocalDescription()
        const b = pc.localDescription
        if (aktuell() && b && (b.type === 'offer' || b.type === 'answer')) this.senden(p, { art: 'sdp', sdp: { type: b.type, sdp: b.sdp } })
      } catch (err) {
        this.aushandlungFehler(p, err)
      } finally {
        p.macheAngebot = false
      }
    }
    pc.ontrack = (e) => {
      if (aktuell()) this.tonAnschliessen(p, e.track, e.streams[0] ?? null)
    }
    pc.onconnectionstatechange = () => {
      if (!aktuell()) return
      p.zustand = pc.connectionState
      if (p.zustand === 'failed') {
        this.fehler = tg('fehler.verbindung_direkt')
        // Neuer Versuch mit frischen Wegen; die Aushandlung laeuft von selbst.
        pc.restartIce()
      } else if (p.zustand === 'connected' && this.fehler === tg('fehler.verbindung_direkt')) {
        this.fehler = null
      }
      this.melden()
    }

    // Die unhoefliche Seite legt die eine Tonspur an und beginnt damit.
    if (!p.hoeflich) {
      p.transceiver = pc.addTransceiver('audio', { direction: 'recvonly' })
      this.spurSetzenSicher(p)
    }
    this.senden(p, { art: 'hallo' })
    return p
  }

  private trennen(uid: string, sagen: boolean) {
    const p = this.partner.get(uid)
    if (!p) return
    this.partner.delete(uid)
    if (sagen && !this.beendet) this.senden(p, { art: 'tschuess' })
    p.pc.onicecandidate = null
    p.pc.onnegotiationneeded = null
    p.pc.ontrack = null
    p.pc.onconnectionstatechange = null
    p.pc.close()
    this.tonAbbauen(p)
  }

  private verarbeiten(uid: string, n: Nachricht) {
    if (this.alt.get(uid)?.has(n.s)) return
    let p = this.partner.get(uid)
    // An eine fruehere Verbindung von uns gerichtet: veraltet.
    if (n.f !== null && (!p || n.f !== p.meine)) return
    if (n.art === 'tschuess') {
      if (p && (p.ihre === null || p.ihre === n.s)) {
        this.altVon(uid).add(n.s)
        this.trennen(uid, false)
        this.melden()
      }
      return
    }
    if (p && p.ihre !== null && p.ihre !== n.s) {
      // Die Gegenseite hat neu begonnen (etwa neu geladen): von vorn, mit
      // unserer bisherigen Sitzung, damit sie uns nicht ebenfalls neu beginnt.
      // Hoechstens einmal je NEUSTART_MS und Absender.
      const jetzt = performance.now()
      const seit = jetzt - (this.neustartZeit.get(uid) ?? -Infinity)
      if (seit < NEUSTART_MS) {
        const vorher = this.neustartWarte.get(uid)
        if (vorher) vorher.n = n
        else {
          const uhr = setTimeout(() => {
            const w = this.neustartWarte.get(uid)
            this.neustartWarte.delete(uid)
            if (w && !this.beendet && this.gewuenscht.has(uid)) this.verarbeiten(uid, w.n)
          }, NEUSTART_MS - seit)
          this.neustartWarte.set(uid, { n, uhr })
        }
        return
      }
      this.neustartZeit.set(uid, jetzt)
      this.altVon(uid).add(p.ihre)
      const meine = p.meine
      this.trennen(uid, false)
      p = this.verbinden(uid, meine, n.s)
    }
    if (!p) {
      if (this.partner.size >= MAX_PARTNER) return
      p = this.verbinden(uid, undefined, n.s)
    }
    if (p.ihre === null) p.ihre = n.s
    if (n.art === 'hallo') {
      // Die Gegenseite ist (wieder) bereit. Haengt unser Angebot noch ohne
      // Antwort, kam es vielleicht nie an: noch einmal schicken.
      const b = p.pc.localDescription
      if (!p.hoeflich && p.pc.signalingState === 'have-local-offer' && b && b.type === 'offer') {
        this.senden(p, { art: 'sdp', sdp: { type: 'offer', sdp: b.sdp } })
      }
      return
    }
    const ziel = p
    ziel.kette = ziel.kette
      .then(() => this.aushandeln(ziel, n))
      .catch((err: unknown) => this.aushandlungFehler(ziel, err))
  }

  private async aushandeln(p: Partner, n: Nachricht) {
    if (this.partner.get(p.uid) !== p || p.pc.signalingState === 'closed') return
    const pc = p.pc
    if (n.art === 'sdp') {
      const b = n.sdp
      // Eine Antwort ohne offenes Angebot ist eine doppelte: nichts zu tun.
      if (b.type === 'answer' && pc.signalingState !== 'have-local-offer') return
      const bereit = !p.macheAngebot && (pc.signalingState === 'stable' || p.antwortSetzen)
      const zusammenstoss = b.type === 'offer' && !bereit
      p.ignoriereAngebot = !p.hoeflich && zusammenstoss
      if (p.ignoriereAngebot) return
      p.antwortSetzen = b.type === 'answer'
      try {
        await pc.setRemoteDescription(b)
      } finally {
        p.antwortSetzen = false
      }
      for (const c of p.iceWarte.splice(0)) {
        await pc.addIceCandidate(c).catch((err: unknown) => this.warnen(`ICE abgelehnt: ${err instanceof Error ? err.message : String(err)}`))
      }
      if (b.type === 'offer') {
        // Die hoefliche Seite bekommt ihre Tonspur mit dem ersten Angebot.
        if (!p.transceiver) p.transceiver = pc.getTransceivers().find((t) => t.receiver.track.kind === 'audio') ?? null
        await this.spurSetzen(p)
        await pc.setLocalDescription()
        const antwort = pc.localDescription
        if (this.partner.get(p.uid) === p && antwort && antwort.type === 'answer') {
          this.senden(p, { art: 'sdp', sdp: { type: 'answer', sdp: antwort.sdp } })
        }
      }
      return
    }
    if (n.art === 'ice') {
      if (!pc.remoteDescription) {
        if (p.iceWarte.length < ICE_WARTE_MAX) p.iceWarte.push(n.ice)
        return
      }
      try {
        await pc.addIceCandidate(n.ice)
      } catch (err) {
        // Zu einem verworfenen Angebot gehoerig: erwartet, kein Fehler.
        if (!p.ignoriereAngebot) this.warnen(`ICE abgelehnt: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }

  private aushandlungFehler(p: Partner, err: unknown) {
    if (this.beendet || this.partner.get(p.uid) !== p) return
    console.warn('[sprechen] Aushandlung:', err instanceof Error ? err.message : err)
    this.fehler = tg('fehler.verbindung_direkt')
    this.melden()
  }

  /** Mikrofon-Spur und Richtung der Tonspur passend zum Schalter setzen.
   *  Eine neue Richtung loest von selbst eine neue Aushandlung aus. */
  private async spurSetzen(p: Partner) {
    const t = p.transceiver
    if (!t || p.pc.signalingState === 'closed') return
    const spur = this.micAn ? (this.mic?.getAudioTracks()[0] ?? null) : null
    if (t.sender.track !== spur) await t.sender.replaceTrack(spur)
    const richtung: RTCRtpTransceiverDirection = spur ? 'sendrecv' : 'recvonly'
    if (t.direction !== richtung) t.direction = richtung
  }

  private spurSetzenSicher(p: Partner) {
    this.spurSetzen(p).catch((err: unknown) => this.aushandlungFehler(p, err))
  }

  private micAus() {
    this.micAn = false
    const m = this.mic
    this.mic = null
    m?.getTracks().forEach((t) => t.stop())
    for (const p of this.partner.values()) this.spurSetzenSicher(p)
  }

  /** Fremden Ton anschliessen: audio-Element (stumm, fuer Chrome) und
   *  WebAudio mit Regler. Ohne WebAudio spielt das Element selbst. */
  private tonAnschliessen(p: Partner, spur: MediaStreamTrack, strom: MediaStream | null) {
    if (spur.kind !== 'audio' || p.spurId === spur.id) return
    this.tonAbbauen(p)
    p.spurId = spur.id
    const s = strom ?? new MediaStream([spur])
    const audio = new Audio()
    audio.autoplay = true
    audio.srcObject = s
    const ziel = this.ziele.get(p.uid) ?? 0
    const ctx = this.audioKontext()
    if (ctx) {
      audio.muted = true
      try {
        const quelle = ctx.createMediaStreamSource(s)
        const regler = ctx.createGain()
        regler.gain.value = ziel
        quelle.connect(regler).connect(ctx.destination)
        p.quelle = quelle
        p.regler = regler
      } catch (err) {
        // Ohne Regler lieber ueber das Element hoeren als gar nicht.
        this.warnen(`WebAudio nicht verfuegbar: ${err instanceof Error ? err.message : String(err)}`)
        audio.muted = false
        audio.volume = ziel
      }
    } else {
      audio.volume = ziel
    }
    p.audio = audio
    audio.play().catch((err: unknown) => {
      if (!(err instanceof DOMException && err.name === 'NotAllowedError')) {
        this.warnen(`Ton nicht gestartet: ${err instanceof Error ? err.message : String(err)}`)
      }
      this.melden()
    })
    this.melden()
  }

  private reglerSetzen(p: Partner, ziel: number) {
    const ctx = this.ctx
    if (p.regler && ctx) {
      const g = p.regler.gain
      const t = ctx.currentTime
      g.cancelScheduledValues(t)
      g.setValueAtTime(g.value, t)
      g.linearRampToValueAtTime(ziel, t + 0.1)
    } else if (p.audio && !p.audio.muted) {
      p.audio.volume = Math.min(1, Math.max(0, ziel))
    }
  }

  private tonAbbauen(p: Partner) {
    p.quelle?.disconnect()
    p.regler?.disconnect()
    p.quelle = null
    p.regler = null
    if (p.audio) {
      p.audio.pause()
      p.audio.srcObject = null
    }
    p.audio = null
    p.spurId = null
  }
}
