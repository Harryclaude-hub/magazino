/* Bilderkennung fuer Kistly, mit einem offenen Modell.
 *
 * Nimmt Fotos, die schon im Speicher liegen, und laesst ein Bildmodell
 * sagen, was darauf zu sehen ist: je Ding ein Name auf Deutsch und auf
 * Arabisch, Suchwoerter, und ein Rahmen um das Ding. Aus dem Rahmen
 * schneidet der Browser spaeter ein kleines Bild aus. Das Ergebnis wird
 * in photo_analyses abgelegt, damit dasselbe Bild nicht zweimal kostet.
 *
 * Modell: Qwen3.5-9B (Apache 2.0) bei OVHcloud AI Endpoints in
 * Frankreich, ueber die OpenAI-kompatible Schnittstelle. So hat Karam es
 * am 23.09.2026 entschieden. Endpunkt und Modell lassen sich ueber die
 * Geheimnisse BILD_ENDPUNKT und BILD_MODELL tauschen, ohne neu
 * auszuliefern (etwa auf Qwen3-VL, falls die Rahmen schlecht sitzen).
 *
 * Warum hier und nicht im Browser:
 *  - Der Schluessel (OVH_AI_ENDPOINTS_TOKEN, ein Function Secret) bleibt
 *    auf dem Server. Im Browser waere er fuer jeden lesbar.
 *  - Die Mitgliedschaft wird geprueft, bevor irgendetwas gelesen wird.
 *
 * Ohne Dienstschluessel (Karams Regel, seit 0023): alles laeuft mit der
 * Anmeldung dessen, der fragt. Die Zeilen-Sicherheit greift bei jedem
 * Lesen und Schreiben, und die Kostenbremse bucht bild_lesen_buchen in
 * einem Schritt.
 *
 * Was hier NICHT passiert: es wird nichts in die Inhaltsliste
 * geschrieben. Die Funktion liefert Vorschlaege, uebernommen wird im
 * Browser, Zeile fuer Zeile, von Hand.
 *
 * Aufruf:
 *   POST { project_id, photo_ids: string[], sprache: 'de'|'ar', was }
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

/** Mehr Bilder auf einmal kosten mehr und dauern laenger. Dieselbe Zahl
 *  steht als MAX_BILDER_JE_LAUF in src/lib/bildki.ts. */
const MAX_BILDER = 4
/** Die App verkleinert schon vor dem Hochladen, das ist die Rueckfallgrenze. */
const MAX_BYTES = 5 * 1024 * 1024
const ENDPUNKT_STANDARD = 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/chat/completions'
const MODELL_STANDARD = 'Qwen3.5-9B'
/** Das Ersatzmodell, wenn das erste nachdenkt statt zu antworten.
 *  Qwen3.8-27B ist das einzige Bildmodell im OVH-Katalog, bei dem
 *  reasoning_effort "none" ausdruecklich gelistet ist (Stand 24.09.2026).
 *  Teurer (0,40 / 2,70 EUR je Mio. Token statt 0,10 / 0,15), darum nur
 *  als Ersatz. Ueberschreibbar ueber das Geheimnis BILD_MODELL_ERSATZ. */
const ERSATZ_STANDARD = 'Qwen3.8-27B'
/** Zeitrahmen fuer ein Foto, ab dem Eingang der Anfrage. Supabase beendet
 *  einen Aufruf nach 150 Sekunden hart (Free-Plan), darum bleibt Luft fuer
 *  Anmeldung, Herunterladen und Speichern. Die App schickt je Aufruf nur
 *  EIN Foto. */
const RAHMEN_MS = 125_000
/** Fuer das Speichern nach der Antwort freigehalten. */
const SPEICHERN_MS = 6_000
/** Faengt das Modell so lange nicht mit der Liste an und hat es schon
 *  nachgedacht, wird dieser Versuch abgebrochen. Ohne Nachdenken beginnt
 *  die Liste nach wenigen Sekunden. */
const DENKGRENZE_MS = 25_000
/** Kam bis hierhin gar nichts an (Warteschlange, langsames Bild), wird
 *  der Versuch ebenfalls abgebrochen, damit fuer das Ersatzmodell noch
 *  Zeit bleibt. */
const LANGSAM_MS = 45_000
/** Reicht fuer rund 30 Dinge mit zwei Namen und Suchwoertern. Reicht es
 *  nicht, meldet finish_reason 'length', und das wird gesagt, nicht als
 *  halbe Liste uebernommen. Weniger als frueher (8000): denkt ein Modell
 *  doch, ist es so schneller am Ende statt an der Zeitgrenze. */
const MAX_TOKENS = 4000

/* Wer darf diese Funktion von einer Seite aus aufrufen. Ueberschreibbar
 * ueber das Geheimnis APP_ORIGINS. */
const HERKUNFT_STANDARD = [
  'https://harryclaude-hub.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]

function corsFuer(req: Request): Record<string, string> {
  const erlaubt = (Deno.env.get('APP_ORIGINS') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const liste = erlaubt.length > 0 ? erlaubt : HERKUNFT_STANDARD
  const herkunft = req.headers.get('Origin') ?? ''
  return {
    'Access-Control-Allow-Origin': liste.includes(herkunft) ? herkunft : liste[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

type Sprache = 'de' | 'ar'
type Was = 'kiste' | 'moebel' | 'zimmer'

interface Body {
  project_id?: string
  photo_ids?: string[]
  sprache?: Sprache
  was?: Was
}

/** Ein erkanntes Ding, so wie es an die App geht. Koordinaten als Anteil
 *  des Bildes, 0 ist links und oben, 1 rechts und unten. */
interface Ding {
  /** Der Name in der Sprache, in der gefragt wurde. */
  text: string
  name_de: string | null
  name_ar: string | null
  suchwoerter: string[]
  menge: number
  sicherheit: number
  hinweis: string | null
  /** Mitte des Rahmens. Fehlt der Rahmen, fehlt auch der Punkt: ein
   *  erfundener Punkt saehe aus wie ein gefundener. */
  x: number | null
  y: number | null
  x0: number | null
  y0: number | null
  x1: number | null
  y1: number | null
}

/** Ein Fehler mit Kennung, die die App in einen eigenen Satz uebersetzt. */
class BildFehler extends Error {
  code: string
  constructor(code: string, text: string) {
    super(text)
    this.code = code
  }
}

/* ------------------------------------------------------------ Anweisung */

const SPRACHNAME: Record<Sprache, string> = { de: 'Deutsch', ar: 'Arabisch' }

function anweisung(was: Was, sprache: Sprache): string {
  const ziel = SPRACHNAME[sprache]
  const worum =
    was === 'moebel'
      ? 'Auf dem Bild ist ein Möbelstück, das für einen Umzug erfasst wird. Nenne das Stück selbst und die einzelnen Teile, die zu sehen sind (Bretter, Beine, Schrauben, Schlüssel, Beschläge).'
      : was === 'zimmer'
        ? 'Auf dem Bild ist ein Zimmer, das umgezogen werden soll. Nenne die Möbel und die größeren Gegenstände darin. Kleinkram wie einzelne Stifte gehört nicht dazu.'
        : 'Auf dem Bild ist der Inhalt einer Umzugskiste, oder eine offene Kiste von oben. Finde JEDEN einzelnen Gegenstand, der zu sehen ist, auch kleine.'
  return [
    worum,
    'Antworte nur mit JSON, ohne Text davor oder danach, genau in dieser Form:',
    '{"dinge":[{"name":"...","name_de":"...","name_ar":"...","suchwoerter":["..."],"menge":1,"sicherheit":0.9,"hinweis":"","bbox_2d":[x1,y1,x2,y2]}]}',
    `name ist der Name auf ${ziel}. name_de ist der Name auf Deutsch, name_ar auf Arabisch.`,
    'Benutze alltägliche Wörter, wie man sie auf einen Zettel schreibt, keine Fachsprache.',
    'Text, der im Bild selbst steht (Marken, Aufdrucke, Modellnamen), übernimmst du Zeichen für Zeichen, ohne ihn zu übersetzen: aus UHU wird nie etwas anderes.',
    'suchwoerter sind 3 bis 8 Wörter auf Deutsch und auf Arabisch, unter denen jemand das Ding suchen würde, dazu Oberbegriffe. Beispiel UHU-Tube: Kleber, Klebstoff, Leim, UHU, صمغ, غراء.',
    'bbox_2d ist der Rahmen eng um das Ding: x1,y1 links oben, x2,y2 rechts unten, in Promille des Bildes, also 0 bis 1000, x vom linken und y vom oberen Rand.',
    'Fasse gleiche Dinge zusammen: zehn Bücher sind ein Eintrag mit menge 10 und einem Rahmen um die Gruppe.',
    'sicherheit ist 0 bis 1. Bist du unsicher, nimm das Ding trotzdem auf, mit niedriger sicherheit. Weglassen wäre schlimmer.',
    'hinweis nur, wenn es beim Tragen zählt, etwa zerbrechlich oder schwer, sonst leer.',
    'Zähle nur, was du wirklich siehst. Rate nicht, was darunter liegen könnte.',
    // Kein "/no_think" mehr: Qwen3.5 unterstuetzt den Kurzbefehl laut
    // Modellkarte nicht. Das Nachdenken schaltet reasoning_effort "none"
    // in der Anfrage ab (siehe erkennen), und was trotzdem kommt, filtert
    // jsonAus heraus.
  ].join('\n')
}

/* --------------------------------------------------------------- Modell */

function alsBase64(bild: Uint8Array): string {
  // btoa auf sehr grossen Zeichenketten sprengt den Stapel, darum in
  // Haeppchen umwandeln.
  let roh = ''
  const schritt = 0x8000
  for (let i = 0; i < bild.length; i += schritt) {
    roh += String.fromCharCode(...bild.subarray(i, i + schritt))
  }
  return btoa(roh)
}

/** Welche Bildart die Datei wirklich ist, an den ersten Bytes erkannt.
 *  Ein iPhone-Foto im HEIC-Format kann mit der Endung .jpg ankommen, und
 *  das Modell saehe dann nur Datenmuell. */
function bildArt(b: Uint8Array): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png'
  if (
    b.length > 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) {
    return 'image/webp'
  }
  return null
}

function text(v: unknown, max = 200): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t ? t.slice(0, max) : null
}

/** Promille zu Anteil, nur fuer echte Zahlen. null, leere Texte und
 *  Unsinn bleiben null und werden nie zu 0. */
function promille(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.max(0, Math.min(1000, v))
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) {
    return Math.max(0, Math.min(1000, Number(v)))
  }
  return null
}

/** Was nach dem Nachdenken kommt. Bei Qwen3.5 steht das oeffnende <think>
 *  schon in der Vorlage, in der Antwort steht dann nur das schliessende.
 *  Darum alles bis einschliesslich zum LETZTEN </think> weg. */
function nachDemDenken(inhalt: string): string {
  const ende = inhalt.lastIndexOf('</think>')
  return ende >= 0 ? inhalt.slice(ende + '</think>'.length) : inhalt
}

/** Hat die eigentliche Liste schon angefangen? Dann denkt das Modell
 *  nicht mehr, sondern schreibt. */
function listeBegonnen(inhalt: string): boolean {
  const rest = nachDemDenken(inhalt).trimStart()
  if (inhalt.includes('<think>') && !inhalt.includes('</think>')) return false
  return rest.startsWith('{') || rest.startsWith('[') || rest.startsWith('```')
}

/** Aus der Antwort des Modells das JSON holen: ohne Denkblock, ohne
 *  Codezaun, vom ersten { bis zur letzten }. */
function jsonAus(inhalt: string): unknown {
  const ohneDenken = nachDemDenken(inhalt)
  /* Ein Objekt {"dinge":[...]} oder gleich eine Liste [...]: je nachdem,
   * was zuerst kommt, bis zur passenden letzten Klammer. */
  const auf = ohneDenken.indexOf('{')
  const eckig = ohneDenken.indexOf('[')
  const liste = eckig >= 0 && (auf < 0 || eckig < auf)
  const start = liste ? eckig : auf
  const ende = liste ? ohneDenken.lastIndexOf(']') : ohneDenken.lastIndexOf('}')
  if (start < 0 || ende <= start) {
    throw new BildFehler('unlesbar', 'Das Bildmodell hat keine verwertbare Liste geliefert.')
  }
  try {
    return JSON.parse(ohneDenken.slice(start, ende + 1))
  } catch {
    throw new BildFehler('unlesbar', 'Das Bildmodell hat keine verwertbare Liste geliefert.')
  }
}

function aufraeumen(roh: unknown, sprache: Sprache): Ding[] {
  const liste = Array.isArray(roh)
    ? roh
    : roh && typeof roh === 'object' && Array.isArray((roh as { dinge?: unknown }).dinge)
      ? (roh as { dinge: unknown[] }).dinge
      : null
  if (!liste) {
    throw new BildFehler('unlesbar', 'Das Bildmodell hat keine verwertbare Liste geliefert.')
  }
  const out: Ding[] = []
  for (const eintrag of liste) {
    if (!eintrag || typeof eintrag !== 'object') continue
    const d = eintrag as Record<string, unknown>
    const nameDe = text(d.name_de)
    const nameAr = text(d.name_ar)
    const name = (sprache === 'ar' ? nameAr : nameDe) ?? text(d.name) ?? nameDe ?? nameAr
    if (!name) continue

    // Der Rahmen: vier echte Zahlen, sonst keiner. Vertauschte Ecken
    // werden gerichtet, ein Rahmen ohne Flaeche verworfen.
    let x0: number | null = null
    let y0: number | null = null
    let x1: number | null = null
    let y1: number | null = null
    const bb = Array.isArray(d.bbox_2d) ? d.bbox_2d : null
    if (bb && bb.length === 4) {
      const [a, b, c, e] = bb.map(promille)
      if (a !== null && b !== null && c !== null && e !== null) {
        const lx = Math.min(a, c)
        const rx = Math.max(a, c)
        const oy = Math.min(b, e)
        const uy = Math.max(b, e)
        if (rx - lx >= 5 && uy - oy >= 5) {
          x0 = lx / 1000
          x1 = rx / 1000
          y0 = oy / 1000
          y1 = uy / 1000
        }
      }
    }

    const woerter = Array.isArray(d.suchwoerter)
      ? [...new Set(d.suchwoerter.map((w) => text(w, 60)).filter((w): w is string => w !== null))].slice(0, 20)
      : []
    const menge = Number(d.menge)
    const sicherheit = Number(d.sicherheit)
    out.push({
      text: name,
      name_de: nameDe,
      name_ar: nameAr,
      suchwoerter: woerter,
      menge: Number.isFinite(menge) ? Math.max(1, Math.min(999, Math.round(menge))) : 1,
      sicherheit: Number.isFinite(sicherheit) ? Math.max(0, Math.min(1, sicherheit)) : 0.5,
      hinweis: text(d.hinweis),
      x: x0 !== null && x1 !== null ? (x0 + x1) / 2 : null,
      y: y0 !== null && y1 !== null ? (y0 + y1) / 2 : null,
      x0,
      y0,
      x1,
      y1,
    })
    if (out.length >= 60) break
  }
  return out
}

/** Was ein Versuch zurueckgibt: die Dinge und die Zahlen fuers Protokoll. */
interface Versuch {
  dinge: Ding[]
  modell: string
}

/** Denkt ein Modell trotz Schalter nach, heisst der Fehler so. Dann
 *  kommt das Ersatzmodell dran. */
const DENKT = 'denkt'

/** Diese Modelle haben reasoning_effort im OVH-Schema (am 24.09.2026
 *  nachgesehen). Nur ihnen wird der Schalter geschickt, nach Namen, nicht
 *  nach Muster. Lehnt OVH ihn trotzdem ab, wird ohne wiederholt. */
const SCHALTER_MODELLE = new Set(['Qwen3.5-9B', 'Qwen3.5-397B-A17B', 'Qwen3.6-27B', 'Qwen3.8-27B'])

/** Der Schalter wurde abgelehnt: dann dasselbe Modell ohne ihn. */
const SCHALTER = 'schalter'
/** Es kam nach LANGSAM_MS noch gar nichts an. */
const LANGSAM = 'langsam'
/** Der Dienst hat mit einem Fehler geantwortet, nicht mit einer Liste. */
const MODELL_FEHLER = 'modell_fehler'

/** Einen Fehler des Dienstes in eine Kennung uebersetzen. */
function dienstFehler(status: number, text: string, modell: string, mitSchalter: boolean): BildFehler {
  if (status === 429) return new BildFehler('dienst_voll', 'Der Erkennungsdienst ist gerade ausgelastet.')
  if (status === 401 || status === 403) {
    return new BildFehler('schluessel_falsch', 'Der Schlüssel für den Erkennungsdienst wird nicht angenommen.')
  }
  const kurz = text.slice(0, 300)
  if ((status === 400 || status === 422) && mitSchalter && /reasoning|extra|argument/i.test(kurz)) {
    return new BildFehler(SCHALTER, `${modell} nimmt reasoning_effort nicht an: ${kurz}`)
  }
  return new BildFehler(MODELL_FEHLER, `${modell} antwortete mit ${status}: ${kurz}`)
}

async function erkennen(
  endpunkt: string,
  schluessel: string,
  modell: string,
  bild: Uint8Array,
  typ: string,
  was: Was,
  sprache: Sprache,
  frist: number,
  mitSchalter: boolean,
  /** Beim Ersatzmodell aus: nach ihm kommt nichts mehr, es darf bis zur
   *  Frist brauchen. */
  mitDenkgrenze: boolean,
): Promise<Versuch> {
  const abbruch = new AbortController()
  const start = Date.now()
  const uhr = setTimeout(() => abbruch.abort(), Math.max(1_000, frist - start))
  /* Was beim Lesen passiert, fuer das Protokoll der Funktion. Ohne diese
   * Zahlen sieht man bei "hat zu lange gebraucht" nicht, ob das Modell
   * nachgedacht, langsam geschrieben oder gar nicht angefangen hat. */
  const tempo = {
    modell,
    bytes: bild.length,
    ms_bis_erstes: null as number | null,
    ms_bis_liste: null as number | null,
    ms_gesamt: 0,
    denken_zeichen: 0,
    antwort_zeichen: 0,
    ende: null as string | null,
  }
  let inhalt = ''
  // Mit 'as' deklariert: die Uhren aendern den Wert, das sieht TypeScript sonst nicht.
  let grund = 'zeit' as 'zeit' | typeof DENKT | typeof LANGSAM
  /* Eigene Uhren fuer das Nachdenken, unabhaengig davon, ob gerade etwas
   * ankommt: wer nichts schickt, wird sonst nie abgebrochen. */
  const denkUhren: number[] = []
  if (mitDenkgrenze) {
    denkUhren.push(
      setTimeout(() => {
        if (tempo.ms_bis_liste !== null) return
        // Nur wer schon nachgedacht hat, gilt hier als denkend. Wer gar
        // nichts geschickt hat, bekommt bis LANGSAM_MS.
        if (tempo.denken_zeichen > 0 || inhalt.length > 0) {
          grund = DENKT
          abbruch.abort()
        }
      }, DENKGRENZE_MS),
      setTimeout(() => {
        if (tempo.ms_bis_liste !== null) return
        grund = tempo.denken_zeichen > 0 || inhalt.length > 0 ? DENKT : LANGSAM
        abbruch.abort()
      }, LANGSAM_MS),
    )
  }
  try {
    const antwort = await fetch(endpunkt, {
      method: 'POST',
      signal: abbruch.signal,
      headers: {
        Authorization: `Bearer ${schluessel}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modell,
        max_tokens: MAX_TOKENS,
        temperature: 0.2,
        // Nicht nachdenken. OVH nimmt chat_template_kwargs nicht an, dieses
        // Feld steht aber im OVH-Schema der Qwen3-Modelle.
        ...(mitSchalter ? { reasoning_effort: 'none' } : {}),
        // Gestreamt, damit man sieht, was das Modell tut, solange es noch
        // nicht fertig ist, und frueh abbrechen kann, wenn es nachdenkt.
        stream: true,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:${typ};base64,${alsBase64(bild)}` } },
              { type: 'text', text: anweisung(was, sprache) },
            ],
          },
        ],
      }),
    })

    if (!antwort.ok) {
      throw dienstFehler(antwort.status, await antwort.text(), modell, mitSchalter)
    }

    const art = antwort.headers.get('content-type') ?? ''
    if (!art.includes('text/event-stream')) {
      // Der Dienst hat das Streamen ignoriert und alles auf einmal geschickt.
      const daten = (await antwort.json()) as {
        choices?: Array<{
          finish_reason?: string
          message?: { content?: string | null; reasoning_content?: string | null; reasoning?: string | null }
        }>
      }
      const wahl = daten.choices?.[0]
      inhalt = wahl?.message?.content ?? ''
      tempo.denken_zeichen = (wahl?.message?.reasoning ?? wahl?.message?.reasoning_content ?? '').length
      tempo.ende = wahl?.finish_reason ?? null
      tempo.ms_bis_erstes = Date.now() - start
    } else {
      const leser = antwort.body!.pipeThrough(new TextDecoderStream()).getReader()
      let puffer = ''
      lesen: while (true) {
        const { value, done } = await leser.read()
        if (done) break
        puffer += value
        let umbruch: number
        while ((umbruch = puffer.indexOf('\n')) >= 0) {
          const zeile = puffer.slice(0, umbruch).trim()
          puffer = puffer.slice(umbruch + 1)
          if (!zeile.startsWith('data:')) continue
          const daten = zeile.slice(5).trim()
          if (daten === '[DONE]') break lesen
          let stueck: {
            object?: string
            error?: { message?: string; code?: number | string } | string
            message?: string
            code?: number | string
            choices?: Array<{
              finish_reason?: string | null
              delta?: { content?: string | null; reasoning_content?: string | null; reasoning?: string | null }
            }>
          }
          try {
            stueck = JSON.parse(daten)
          } catch {
            continue
          }
          // Ein Fehler mitten im Strom kommt als eigenes Ereignis. Er wird
          // gemeldet, nicht als leere Antwort uebergangen.
          if (stueck.error || stueck.object === 'error') {
            const f = typeof stueck.error === 'object' ? stueck.error : null
            const nachricht = (typeof stueck.error === 'string' ? stueck.error : f?.message) ?? stueck.message ?? daten
            const status = Number(f?.code ?? stueck.code ?? 500)
            throw dienstFehler(Number.isFinite(status) ? status : 500, String(nachricht), modell, mitSchalter)
          }
          const wahl = stueck.choices?.[0]
          if (!wahl) continue
          const denken = wahl.delta?.reasoning ?? wahl.delta?.reasoning_content ?? ''
          const teil = wahl.delta?.content ?? ''
          const jetzt = Date.now()
          if ((denken || teil) && tempo.ms_bis_erstes === null) tempo.ms_bis_erstes = jetzt - start
          tempo.denken_zeichen += denken.length
          inhalt += teil
          if (wahl.finish_reason) tempo.ende = wahl.finish_reason
          if (tempo.ms_bis_liste === null && listeBegonnen(inhalt)) tempo.ms_bis_liste = jetzt - start
        }
      }
    }
  } catch (err) {
    if (!abbruch.signal.aborted) throw err
  } finally {
    clearTimeout(uhr)
    for (const u of denkUhren) clearTimeout(u)
  }

  const imText = inhalt.lastIndexOf('</think>')
  if (imText >= 0) tempo.denken_zeichen += imText
  tempo.ms_gesamt = Date.now() - start
  tempo.antwort_zeichen = inhalt.length

  if (abbruch.signal.aborted) {
    console.warn('[bild-analyse] tempo', JSON.stringify({ ...tempo, ende: grund }))
    throw new BildFehler(
      grund,
      `${modell}: ${grund === DENKT ? 'denkt nach statt zu antworten' : grund === LANGSAM ? 'antwortet nicht' : 'zu langsam'} ` +
        `(${Math.round(tempo.ms_gesamt / 1000)} s, ${tempo.denken_zeichen} Zeichen Nachdenken, ` +
        `${inhalt.length} Zeichen Antwort).`,
    )
  }
  console.log('[bild-analyse] tempo', JSON.stringify(tempo))

  if (tempo.ende === 'length') {
    // Hat das Modell nachgedacht, hat das Denken die Tokens verbraucht,
    // nicht die Liste. Dann ist es ein Fall fuers Ersatzmodell.
    if (tempo.denken_zeichen > 0) {
      throw new BildFehler(DENKT, `${modell}: Nachdenken hat alle Tokens verbraucht (${tempo.denken_zeichen} Zeichen).`)
    }
    throw new BildFehler(
      'zu_lang',
      'Die Antwort des Bildmodells war zu lang und wurde abgeschnitten. Fotografiere weniger auf einmal.',
    )
  }
  return { dinge: aufraeumen(jsonAus(inhalt), sprache), modell }
}

/* ------------------------------------------------------------------ Lauf */

Deno.serve(async (req: Request) => {
  const cors = corsFuer(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })

  const eingang = Date.now()
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

    const auth = req.headers.get('Authorization') ?? ''
    if (!auth.startsWith('Bearer ')) return json({ error: 'Nicht angemeldet' }, 401)

    const body = (await req.json()) as Body
    const sprache: Sprache = body.sprache === 'ar' ? 'ar' : 'de'
    const was: Was = body.was === 'moebel' || body.was === 'zimmer' ? body.was : 'kiste'
    if (!body.project_id || !Array.isArray(body.photo_ids) || body.photo_ids.length === 0) {
      return json({ error: 'project_id und photo_ids sind Pflicht' }, 400)
    }
    if (body.photo_ids.length > MAX_BILDER) {
      return json({ error: `Höchstens ${MAX_BILDER} Bilder auf einmal`, code: 'zu_viele' }, 400)
    }

    /* Alles mit dem Token des Aufrufers. Kein Dienstschluessel. */
    const ich = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false },
    })
    const { data: me } = await ich.auth.getUser()
    if (!me?.user) return json({ error: 'Nicht angemeldet' }, 401)

    const { data: mitglied, error: mitgliedFehler } = await ich
      .from('project_members')
      .select('role')
      .eq('project_id', body.project_id)
      .eq('user_id', me.user.id)
      .maybeSingle()
    if (mitgliedFehler) return json({ error: mitgliedFehler.message }, 400)
    if (!mitglied) return json({ error: 'Kein Mitglied dieses Umzugs', code: 'kein_mitglied' }, 403)
    if (mitglied.role !== 'owner' && mitglied.role !== 'editor') {
      return json({ error: 'Nur Bearbeiter dürfen Bilder auswerten lassen', code: 'nur_lesen' }, 403)
    }

    const { data: fotos, error: fotoFehler } = await ich
      .from('item_photos')
      .select('id, path, project_id')
      .in('id', body.photo_ids)
      .eq('project_id', body.project_id)
    if (fotoFehler) return json({ error: fotoFehler.message }, 400)
    const meine = fotos ?? []
    if (meine.length === 0) {
      return json({ error: 'Keine passenden Bilder gefunden', code: 'foto_weg' }, 404)
    }

    const schluessel = Deno.env.get('OVH_AI_ENDPOINTS_TOKEN')
    const endpunkt = Deno.env.get('BILD_ENDPUNKT') || ENDPUNKT_STANDARD
    const modell = Deno.env.get('BILD_MODELL') || MODELL_STANDARD
    const ersatz = Deno.env.get('BILD_MODELL_ERSATZ') || ERSATZ_STANDARD
    /* Der Zeitrahmen beginnt mit der Anfrage, nicht erst beim Modell:
     * Anmeldung und Herunterladen zaehlen bei Supabase mit. */
    const frist = eingang + RAHMEN_MS - SPEICHERN_MS
    if (!schluessel) {
      return json(
        {
          error:
            'OVH_AI_ENDPOINTS_TOKEN fehlt. Den Schlüssel einmal als Function Secret in Supabase eintragen. ' +
            'Ohne Schlüssel kann kein Bild ausgewertet werden.',
          code: 'kein_schluessel',
        },
        503,
      )
    }

    const ergebnisse: Array<{
      photo_id: string
      status: 'fertig' | 'fehler'
      aus_speicher: boolean
      dinge: Ding[]
      fehler?: string
      code?: string
    }> = []
    let uebersprungen_wegen_grenze = 0

    for (const foto of meine) {
      // Schon ausgewertet? Dann nicht noch einmal bezahlen.
      const { data: schon } = await ich
        .from('photo_analyses')
        .select('status, ergebnis')
        .eq('photo_id', foto.id)
        .eq('sprache', sprache)
        .maybeSingle()
      if (schon && schon.status === 'fertig') {
        await ich.rpc('bild_lesen_buchen', {
          p_project: body.project_id,
          p_photo: foto.id,
          p_modell: modell,
          p_bezahlt: false,
        })
        ergebnisse.push({
          photo_id: foto.id,
          status: 'fertig',
          aus_speicher: true,
          dinge: (schon.ergebnis ?? []) as Ding[],
        })
        continue
      }

      /* Die Bremse bucht VOR jedem bezahlten Bild, in einem Schritt mit
       * der Pruefung. Sonst liesse ein Aufruf mit vier Bildern die Grenze
       * ueberlaufen. */
      const { data: darf, error: bremsFehler } = await ich.rpc('bild_lesen_buchen', {
        p_project: body.project_id,
        p_photo: foto.id,
        p_modell: modell,
        p_bezahlt: true,
      })
      if (bremsFehler) return json({ error: bremsFehler.message }, 400)
      if (darf !== true) {
        uebersprungen_wegen_grenze++
        continue
      }

      /* Welches Modell zuletzt gefragt wurde, und was vorher schiefging.
       * Beides kommt bei einem Fehlschlag in photo_analyses. */
      let letztesModell = modell
      const fehlerKette: string[] = []
      try {
        const { data: datei, error: ladeFehler } = await ich.storage
          .from('item-photos')
          .download(foto.path)
        if (ladeFehler || !datei) {
          throw new Error(ladeFehler?.message ?? 'Bild nicht im Speicher gefunden')
        }
        const bytes = new Uint8Array(await datei.arrayBuffer())
        if (bytes.length > MAX_BYTES) {
          throw new BildFehler('zu_gross', 'Das Bild ist zu groß für die Auswertung.')
        }
        const typ = bildArt(bytes)
        if (!typ) {
          throw new BildFehler(
            'format',
            'Das Bild hat ein Format, das die Erkennung nicht lesen kann. Nimm das Foto neu auf.',
          )
        }

        /* Ein Modell versuchen. Lehnt OVH den Schalter gegen das Nachdenken
         * ab, dasselbe Modell noch einmal ohne ihn. */
        const versuchen = async (m: string, mitDenkgrenze: boolean): Promise<Versuch> => {
          letztesModell = m
          const schalter = SCHALTER_MODELLE.has(m)
          try {
            return await erkennen(endpunkt, schluessel, m, bytes, typ, was, sprache, frist, schalter, mitDenkgrenze)
          } catch (err) {
            if (!(err instanceof BildFehler) || err.code !== SCHALTER || frist - Date.now() < 20_000) throw err
            fehlerKette.push(err.message)
            console.warn('[bild-analyse] ohne Schalter weiter:', err.message)
            return await erkennen(endpunkt, schluessel, m, bytes, typ, was, sprache, frist, false, mitDenkgrenze)
          }
        }

        /* Erst das guenstige Modell. Denkt es nach statt zu antworten, ist
         * es zu langsam, liefert es nichts Lesbares oder einen Fehler, und
         * ist noch genug Zeit, kommt das Ersatzmodell dran. Es wird eigens
         * gebucht, denn es kostet eigens. */
        let versuch: Versuch
        try {
          versuch = await versuchen(modell, true)
        } catch (err) {
          const nochZeit = frist - Date.now() > 30_000
          const wechseln =
            err instanceof BildFehler &&
            [DENKT, LANGSAM, 'zeit', 'unlesbar', MODELL_FEHLER, SCHALTER].includes(err.code)
          if (!wechseln || !nochZeit || ersatz === modell) throw err
          fehlerKette.push((err as Error).message)
          const { data: darfErsatz } = await ich.rpc('bild_lesen_buchen', {
            p_project: body.project_id,
            p_photo: foto.id,
            p_modell: ersatz,
            p_bezahlt: true,
          })
          if (darfErsatz !== true) throw err
          console.warn('[bild-analyse] Ersatzmodell', ersatz, 'nach', (err as Error).message)
          versuch = await versuchen(ersatz, false)
        }
        const dinge = versuch.dinge

        const { error: speicherFehler } = await ich.from('photo_analyses').upsert(
          {
            project_id: body.project_id,
            photo_id: foto.id,
            sprache,
            status: 'fertig',
            modell: versuch.modell,
            ergebnis: dinge,
            fehler: null,
            created_by: me.user.id,
          },
          { onConflict: 'photo_id,sprache' },
        )
        if (speicherFehler) console.warn('[bild-analyse] Ergebnis nicht gespeichert:', speicherFehler.message)
        ergebnisse.push({ photo_id: foto.id, status: 'fertig', aus_speicher: false, dinge })
      } catch (err) {
        const grund = [...fehlerKette, err instanceof Error ? err.message : String(err)].join(' | ')
        const code = err instanceof BildFehler ? err.code : 'unbekannt'
        /* Der Fehlschlag wird festgehalten, nicht verschwiegen. Beim
         * naechsten Versuch wird es erneut probiert, weil nur ein fertiger
         * Stand aus dem Speicher genommen wird. Gebucht ist er schon:
         * gefragt wurde, und das kann kosten. */
        await ich.from('photo_analyses').upsert(
          {
            project_id: body.project_id,
            photo_id: foto.id,
            sprache,
            status: 'fehler',
            modell: letztesModell,
            ergebnis: [],
            fehler: grund.slice(0, 500),
            created_by: me.user.id,
          },
          { onConflict: 'photo_id,sprache' },
        )
        ergebnisse.push({
          photo_id: foto.id,
          status: 'fehler',
          aus_speicher: false,
          dinge: [],
          fehler: grund,
          code,
        })
      }
    }

    // Bilder, die es nicht gibt oder die zu einem anderen Umzug gehoeren,
    // werden gemeldet statt still uebergangen.
    const uebergangen = body.photo_ids.filter((id) => !meine.some((f) => f.id === id))

    const { data: restNachher } = await ich.rpc('bild_lesen_rest', {
      p_project: body.project_id,
      p_user: me.user.id,
    })
    const restEnde = Array.isArray(restNachher) ? restNachher[0] : restNachher

    return json({
      ergebnisse,
      uebergangen,
      uebersprungen_wegen_grenze,
      rest_projekt: Number(restEnde?.rest_projekt ?? 0),
      rest_nutzer: Number(restEnde?.rest_nutzer ?? 0),
      modell,
      sprache,
    })
  } catch (err) {
    console.error('[bild-analyse]', err)
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
