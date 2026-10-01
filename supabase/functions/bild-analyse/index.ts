/* Bilderkennung fuer Kistly, mit einem offenen Modell.
 *
 * Nimmt ein Foto (oder eine verkleinerte Fassung davon aus der App) und
 * laesst ein Bildmodell sagen, was darauf zu sehen ist: je Ding ein Name
 * auf Deutsch und auf Arabisch, Suchwoerter, und ein Rahmen um das Ding.
 * Das Ergebnis wird in photo_analyses abgelegt, damit dasselbe Bild nicht
 * zweimal kostet.
 *
 * Modell: Qwen bei OVHcloud AI Endpoints in Frankreich, ueber die
 * OpenAI-kompatible Schnittstelle (Karam, 23.09.2026). Endpunkt, Modelle
 * und Schluessel lassen sich ueber Geheimnisse tauschen, ohne neu
 * auszuliefern: BILD_ENDPUNKT, BILD_MODELL, BILD_MODELL_ERSATZ, und
 * BILD_SCHLUESSEL (sonst OVH_AI_ENDPOINTS_TOKEN). So geht auch jeder
 * andere Dienst mit derselben Schnittstelle, etwa Mistral in Paris.
 *
 * Zeit (E75): hoechstens 20 Sekunden je Foto, von Tippen bis Liste. Darum
 *  - schickt die App ein verkleinertes Bild mit (1024 Pixel, schneller
 *    gelesen als das gespeicherte Foto),
 *  - antwortet das Modell in kurzen Zeilen statt in langem JSON,
 *  - laeuft ein zweites Modell mit, wenn das erste nach ERSATZ_AB_MS noch
 *    kein Ding geschrieben hat, und es gilt das bessere Ergebnis,
 *  - zaehlt eine feste Frist: was bis dahin ganz geschrieben ist, gilt,
 *    und die App sagt dazu, dass vielleicht nicht alles drin ist.
 *
 * Ohne Dienstschluessel (Karams Regel, seit 0023): alles laeuft mit der
 * Anmeldung dessen, der fragt. Die Zeilen-Sicherheit greift bei jedem
 * Lesen und Schreiben, und die Kostenbremse bucht bild_lesen_buchen in
 * einem Schritt.
 *
 * Aufruf:
 *   POST { project_id, photo_ids: string[], sprache: 'de'|'ar', was, bild? }
 *   bild: optional, data:image/jpeg;base64,... des ersten Fotos.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

/** Mehr Bilder auf einmal kosten mehr und dauern laenger. Dieselbe Zahl
 *  steht als MAX_BILDER_JE_LAUF in src/lib/bildki.ts. */
const MAX_BILDER = 4
/** Die App verkleinert schon vor dem Hochladen, das ist die Rueckfallgrenze. */
const MAX_BYTES = 5 * 1024 * 1024
/** Das mitgeschickte, verkleinerte Bild darf hoechstens so gross sein. */
const MAX_MITGESCHICKT = 1_500_000
const ENDPUNKT_STANDARD = 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/chat/completions'
const MODELL_STANDARD = 'Qwen3.5-9B'
/** Laeuft mit, wenn das erste Modell zu spaet anfaengt. */
const ERSATZ_STANDARD = 'Qwen3.8-27B'
/** Ab Eingang der Anfrage bis zur Antwort an die App. Die App wartet 20
 *  Sekunden; Hin- und Rueckweg und Speichern brauchen den Rest. */
const FRIST_MS = 16_500
/** Hat das erste Modell bis hierhin kein Ding geschrieben, startet das
 *  zweite daneben. */
const ERSATZ_AB_MS = 4_500
/** Reicht fuer rund 40 Dinge im Zeilenformat. */
const MAX_TOKENS = 2500

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
  bild?: string
}

/** Ein erkanntes Ding, so wie es an die App geht. Koordinaten als Anteil
 *  des Bildes, 0 ist links und oben, 1 rechts und unten. */
interface Ding {
  text: string
  name_de: string | null
  name_ar: string | null
  suchwoerter: string[]
  menge: number
  sicherheit: number
  hinweis: string | null
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

function anweisung(was: Was, _sprache: Sprache): string {
  /* Kiste (E81): nur was IN der Kiste liegt. Zuerst die Kiste finden und
   * ihren Rahmen als erste Zeile nennen; was ausserhalb liegt (Boden,
   * Tisch, Hand, die Kiste daneben), zaehlt nicht. Die Zeile KISTE prueft
   * dingeAus nach: Dinge, deren Mitte ausserhalb liegt, fallen weg. */
  const worum =
    was === 'moebel'
      ? ['Auf dem Bild ist ein Möbelstück, das für einen Umzug erfasst wird. Nenne das Stück selbst und die einzelnen Teile, die zu sehen sind (Bretter, Beine, Schrauben, Schlüssel, Beschläge).']
      : was === 'zimmer'
        ? ['Auf dem Bild ist ein Zimmer, das umgezogen werden soll. Nenne die Möbel und die größeren Gegenstände darin. Kleinkram wie einzelne Stifte gehört nicht dazu.']
        : [
            'Auf dem Bild ist eine Umzugskiste (Karton, Kiste, Box, Korb, Wanne oder Tasche). Es zählt NUR, was IN dieser Kiste liegt.',
            'Schritt 1: Finde die Kiste. Die ERSTE Zeile ist genau: KISTE|x1,y1,x2,y2 mit dem Rahmen um die Öffnung der Kiste. Sind mehrere Kisten zu sehen, nimm die größte in der Mitte. Ist gar keine Kiste zu sehen, schreibe KISTE|keine.',
            'Schritt 2: Nenne die Gegenstände, die du in dieser Kiste klar erkennst, auch kleine, wenn sie deutlich zu sehen sind.',
            'NICHT nennen: die Kiste selbst, Deckel, Klebeband, Aufkleber, Etikett, Polster, Zeitungspapier, Luftpolsterfolie, und alles außerhalb der Kiste: Boden, Tisch, Möbel, Wand, Hände, Füße, Menschen, Tiere, andere Kisten und was daneben liegt.',
          ]
  return [
    ...worum,
    'Antworte NUR mit Zeilen, eine Zeile je Ding, ohne Einleitung, ohne Nummern, ohne Codeblock, genau so:',
    'menge|Name auf Deutsch|Name auf Arabisch|x1,y1,x2,y2|Suchwort, Suchwort, Suchwort|Hinweis',
    'Beispiel: 1|UHU Alleskleber|غراء UHU|412,130,520,388|Kleber, Klebstoff, صمغ|',
    'Die größten und wichtigsten Dinge zuerst.',
    'Kurze, alltägliche Namen, wie man sie auf einen Zettel schreibt.',
    'Text, der im Bild steht (Marken, Aufdrucke), übernimmst du Zeichen für Zeichen.',
    '3 bis 5 Suchwörter auf Deutsch und Arabisch, unter denen jemand das Ding suchen würde, mit Oberbegriff.',
    'x1,y1,x2,y2 ist der Rahmen eng um das Ding in Promille des Bildes (0 bis 1000), x vom linken, y vom oberen Rand.',
    'Gleiche Dinge zusammen: zehn Bücher sind eine Zeile mit menge 10.',
    'Hinweis nur, wenn es beim Tragen zählt (zerbrechlich, schwer), sonst leer.',
    'Zähle nur, was du wirklich siehst.',
    // E82: lieber weglassen als raten (Karam: nicht übertreiben, nur die Produkte ablesen).
    'Nichts erfinden und nichts vermuten: was verdeckt, unscharf oder nur zu ahnen ist, lässt du weg. Lieber eine Zeile zu wenig als eine falsche.',
    'Jedes Ding genau einmal. Teile eines Dings (Deckel, Kappe, Etikett, Verpackung) sind keine eigenen Zeilen.',
    'Keine Sammelzeilen wie Verschiedenes, Kleinkram oder Sachen.',
    'Ist ein Produktname oder eine Marke lesbar, heißt die Zeile so (zum Beispiel Nivea Creme), sonst der einfache Name des Dings.',
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

/** Was nach dem Nachdenken kommt. Bei Qwen steht das oeffnende <think>
 *  schon in der Vorlage, in der Antwort steht dann nur das schliessende.
 *  Darum alles bis einschliesslich zum LETZTEN </think> weg. */
function nachDemDenken(inhalt: string): string {
  if (inhalt.includes('<think>') && !inhalt.includes('</think>')) return ''
  const ende = inhalt.lastIndexOf('</think>')
  return ende >= 0 ? inhalt.slice(ende + '</think>'.length) : inhalt
}

/** Ein Ding aus seinen Teilen bauen. null, wenn kein Name da ist. */
function dingAus(
  sprache: Sprache,
  roh: { name?: unknown; name_de?: unknown; name_ar?: unknown; menge?: unknown; sicherheit?: unknown; hinweis?: unknown; bbox?: unknown; suchwoerter?: unknown },
): Ding | null {
  const nameDe = text(roh.name_de)
  const nameAr = text(roh.name_ar)
  const name = (sprache === 'ar' ? nameAr : nameDe) ?? text(roh.name) ?? nameDe ?? nameAr
  if (!name) return null
  // Der Rahmen: vier echte Zahlen, sonst keiner. Vertauschte Ecken werden
  // gerichtet, ein Rahmen ohne Flaeche verworfen.
  let x0: number | null = null
  let y0: number | null = null
  let x1: number | null = null
  let y1: number | null = null
  const bb = Array.isArray(roh.bbox) ? roh.bbox : null
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
  const woerter = Array.isArray(roh.suchwoerter)
    ? [...new Set(roh.suchwoerter.map((w) => text(w, 60)).filter((w): w is string => w !== null))].slice(0, 20)
    : []
  const menge = Number(roh.menge)
  const sicherheit = Number(roh.sicherheit)
  return {
    text: name,
    name_de: nameDe,
    name_ar: nameAr,
    suchwoerter: woerter,
    menge: Number.isFinite(menge) ? Math.max(1, Math.min(999, Math.round(menge))) : 1,
    sicherheit: Number.isFinite(sicherheit) ? Math.max(0, Math.min(1, sicherheit)) : 0.7,
    hinweis: text(roh.hinweis),
    x: x0 !== null && x1 !== null ? (x0 + x1) / 2 : null,
    y: y0 !== null && y1 !== null ? (y0 + y1) / 2 : null,
    x0,
    y0,
    x1,
    y1,
  }
}

/** Die fertigen Zeilen der Antwort lesen (E75). Eine Zeile je Ding:
 *    menge|Name Deutsch|Name Arabisch|x1,y1,x2,y2|wort, wort, wort|hinweis
 *  Gelesen werden nur Zeilen, die mit einem Umbruch abgeschlossen sind,
 *  ausser `ende` ist gesetzt (dann auch die letzte). So liefert ein
 *  abgebrochener Lauf alle Dinge, die bis dahin ganz geschrieben waren.
 *  Schreibt ein Modell trotzdem JSON, wird das JSON gelesen. */
function dingeAus(inhalt: string, sprache: Sprache, ende: boolean): Ding[] {
  const rest = nachDemDenken(inhalt).replace(/```[a-z]*\n?/gi, '')
  const ersteZeichen = rest.trimStart()[0]
  if (ersteZeichen === '{' || ersteZeichen === '[') {
    if (!ende) return []
    try {
      const auf = rest.indexOf(ersteZeichen)
      const zu = rest.lastIndexOf(ersteZeichen === '{' ? '}' : ']')
      const roh = JSON.parse(rest.slice(auf, zu + 1)) as unknown
      const liste = Array.isArray(roh) ? roh : (roh as { dinge?: unknown[] }).dinge ?? []
      return liste
        .map((d) => {
          const e = d as Record<string, unknown>
          return dingAus(sprache, { ...e, bbox: e.bbox_2d ?? e.bbox })
        })
        .filter((d): d is Ding => d !== null)
        .slice(0, 60)
    } catch {
      return []
    }
  }
  const zeilen = rest.split('\n')
  if (!ende) zeilen.pop()
  const out: Ding[] = []
  let kiste: Rahmen | null = null
  for (const z of zeilen) {
    const teile = z.split('|').map((s) => s.trim())
    if (/^\W*kiste\W*$/i.test(teile[0] ?? '')) {
      kiste = kistenRahmen(teile[1] ?? '')
      continue
    }
    if (teile.length < 3) continue
    const menge = Number(teile[0].replace(/[^\d]/g, ''))
    const bbox = (teile[3] ?? '').split(/[,\s]+/).filter(Boolean).map(Number)
    const d = dingAus(sprache, {
      name_de: teile[1].replace(/^[-*\d.\s]+/, ''),
      name_ar: teile[2],
      menge: Number.isFinite(menge) && menge > 0 ? menge : 1,
      bbox: bbox.length === 4 ? bbox : null,
      suchwoerter: (teile[4] ?? '').split(/[,،;]/).map((w) => w.trim()),
      hinweis: teile[5] ?? null,
    })
    if (d && inDerKiste(d, kiste)) {
      // Dasselbe Ding zweimal genannt (E82): eine Zeile, Mengen zusammen.
      const gleich = out.find((x) => x.text.toLocaleLowerCase() === d.text.toLocaleLowerCase())
      if (gleich) gleich.menge = Math.min(999, gleich.menge + d.menge)
      else out.push(d)
    }
    if (out.length >= 60) break
  }
  return out
}

interface Rahmen {
  x0: number
  y0: number
  x1: number
  y1: number
}

/** Der Rahmen der Kiste aus "x1,y1,x2,y2" (Promille), oder null bei
 *  "keine" oder Unsinn. Zu kleine Rahmen (unter 5 % des Bildes) gelten
 *  nicht: dann hat das Modell eher ein Etikett gemeint als die Kiste. */
function kistenRahmen(roh: string): Rahmen | null {
  const z = roh.split(/[,\s]+/).filter(Boolean).map(promille)
  if (z.length !== 4 || z.some((v) => v === null)) return null
  const [a, b, c, e] = z as number[]
  const r = { x0: Math.min(a, c) / 1000, y0: Math.min(b, e) / 1000, x1: Math.max(a, c) / 1000, y1: Math.max(b, e) / 1000 }
  if ((r.x1 - r.x0) * (r.y1 - r.y0) < 0.05) return null
  return r
}

/** Gehoert das Ding zur Kiste? Ohne Kistenrahmen oder ohne eigenen Rahmen
 *  ja (nichts zum Pruefen). Sonst muss seine Mitte im Rahmen liegen (mit
 *  4 % Spiel, Dinge ragen oft ueber den Rand), und ein Ding, das fast so
 *  gross ist wie die Kiste, ist meist die Kiste selbst. */
function inDerKiste(d: Ding, k: Rahmen | null): boolean {
  if (!k || d.x === null || d.y === null) return true
  const spiel = 0.04
  if (d.x < k.x0 - spiel || d.x > k.x1 + spiel || d.y < k.y0 - spiel || d.y > k.y1 + spiel) return false
  if (d.x0 !== null && d.x1 !== null && d.y0 !== null && d.y1 !== null) {
    const ding = (d.x1 - d.x0) * (d.y1 - d.y0)
    const kiste = (k.x1 - k.x0) * (k.y1 - k.y0)
    if (ding >= kiste * 0.85) return false
  }
  return true
}

/** Was ein Versuch zurueckgibt. fertig: das Modell hat von selbst
 *  aufgehoert (nicht die Uhr). */
interface Versuch {
  dinge: Ding[]
  modell: string
  fertig: boolean
  tempo: Record<string, unknown>
}

/** Diese Modelle haben reasoning_effort im OVH-Schema (am 24.09.2026
 *  nachgesehen). Nur ihnen wird der Schalter geschickt. */
const SCHALTER_MODELLE = new Set(['Qwen3.5-9B', 'Qwen3.5-397B-A17B', 'Qwen3.6-27B', 'Qwen3.8-27B'])

/** Einen Fehler des Dienstes in eine Kennung uebersetzen. */
function dienstFehler(status: number, text: string, modell: string): BildFehler {
  if (status === 429) return new BildFehler('dienst_voll', 'Der Erkennungsdienst ist gerade ausgelastet.')
  if (status === 401 || status === 403) {
    return new BildFehler('schluessel_falsch', 'Der Schlüssel für den Erkennungsdienst wird nicht angenommen.')
  }
  return new BildFehler('modell_fehler', `${modell} antwortete mit ${status}: ${text.slice(0, 300)}`)
}

/**
 * Ein Modell lesen lassen, gestreamt, bis zur Frist. Was bis dahin ganz
 * geschrieben ist, kommt zurueck, auch wenn das Modell noch nicht fertig
 * war (E75: hoechstens 20 Sekunden, dann gilt, was da ist).
 * `stopp` bricht von aussen ab (das andere Modell war schneller).
 */
async function erkennen(
  endpunkt: string,
  schluessel: string,
  modell: string,
  bildUrl: string,
  was: Was,
  sprache: Sprache,
  frist: number,
  stopp: AbortSignal,
  onErstesDing: () => void,
): Promise<Versuch> {
  const abbruch = new AbortController()
  const start = Date.now()
  const uhr = setTimeout(() => abbruch.abort(), Math.max(500, frist - start))
  const weiter = () => abbruch.abort()
  stopp.addEventListener('abort', weiter)
  const tempo = { modell, ms_bis_erstes: null as number | null, ms_bis_ding: null as number | null, ms_gesamt: 0, zeichen: 0, ende: null as string | null }
  let inhalt = ''
  let fertig = false
  const anfrage = async (mitSchalter: boolean) =>
    await fetch(endpunkt, {
      method: 'POST',
      signal: abbruch.signal,
      headers: { Authorization: `Bearer ${schluessel}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modell,
        max_tokens: MAX_TOKENS,
        temperature: 0.1,
        ...(mitSchalter ? { reasoning_effort: 'none' } : {}),
        stream: true,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: bildUrl } },
              { type: 'text', text: anweisung(was, sprache) },
            ],
          },
        ],
      }),
    })
  try {
    let antwort = await anfrage(SCHALTER_MODELLE.has(modell))
    if (!antwort.ok && (antwort.status === 400 || antwort.status === 422) && SCHALTER_MODELLE.has(modell)) {
      // Den Schalter nicht angenommen: dasselbe Modell ohne ihn.
      const grund = await antwort.text()
      if (/reasoning|extra|argument/i.test(grund)) antwort = await anfrage(false)
      else throw dienstFehler(antwort.status, grund, modell)
    }
    if (!antwort.ok) throw dienstFehler(antwort.status, await antwort.text(), modell)
    const art = antwort.headers.get('content-type') ?? ''
    if (!art.includes('text/event-stream')) {
      const daten = (await antwort.json()) as { choices?: Array<{ finish_reason?: string; message?: { content?: string | null } }> }
      inhalt = daten.choices?.[0]?.message?.content ?? ''
      tempo.ende = daten.choices?.[0]?.finish_reason ?? null
      fertig = true
    } else {
      const leser = antwort.body!.pipeThrough(new TextDecoderStream()).getReader()
      let puffer = ''
      lesen: while (true) {
        const { value, done } = await leser.read()
        if (done) {
          fertig = true
          break
        }
        puffer += value
        let umbruch: number
        while ((umbruch = puffer.indexOf('\n')) >= 0) {
          const zeile = puffer.slice(0, umbruch).trim()
          puffer = puffer.slice(umbruch + 1)
          if (!zeile.startsWith('data:')) continue
          const daten = zeile.slice(5).trim()
          if (daten === '[DONE]') {
            fertig = true
            break lesen
          }
          let stueck: {
            object?: string
            error?: { message?: string; code?: number | string } | string
            choices?: Array<{ finish_reason?: string | null; delta?: { content?: string | null } }>
          }
          try {
            stueck = JSON.parse(daten)
          } catch {
            continue
          }
          if (stueck.error || stueck.object === 'error') {
            const f = typeof stueck.error === 'object' ? stueck.error : null
            const status = Number(f?.code ?? 500)
            throw dienstFehler(Number.isFinite(status) ? status : 500, String((typeof stueck.error === 'string' ? stueck.error : f?.message) ?? daten), modell)
          }
          const wahl = stueck.choices?.[0]
          if (!wahl) continue
          const teil = wahl.delta?.content ?? ''
          if (teil && tempo.ms_bis_erstes === null) tempo.ms_bis_erstes = Date.now() - start
          inhalt += teil
          if (tempo.ms_bis_ding === null && teil.includes('\n') && dingeAus(inhalt, sprache, false).length > 0) {
            tempo.ms_bis_ding = Date.now() - start
            onErstesDing()
          }
          if (wahl.finish_reason) tempo.ende = wahl.finish_reason
        }
      }
    }
  } catch (err) {
    if (!abbruch.signal.aborted) throw err
  } finally {
    clearTimeout(uhr)
    stopp.removeEventListener('abort', weiter)
  }
  tempo.ms_gesamt = Date.now() - start
  tempo.zeichen = inhalt.length
  // Bei 'length' ist die letzte Zeile womoeglich halb: dann wie abgebrochen lesen.
  const ganz = fertig && tempo.ende !== 'length'
  const dinge = dingeAus(inhalt, sprache, ganz)
  console.log('[bild-analyse] tempo', JSON.stringify({ ...tempo, fertig: ganz, dinge: dinge.length }))
  return { dinge, modell, fertig: ganz, tempo }
}

/* ------------------------------------------------------------------ Lauf */

const schlafen = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

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

    const schluessel = Deno.env.get('BILD_SCHLUESSEL') || Deno.env.get('OVH_AI_ENDPOINTS_TOKEN')
    const endpunkt = Deno.env.get('BILD_ENDPUNKT') || ENDPUNKT_STANDARD
    const modell = Deno.env.get('BILD_MODELL') || MODELL_STANDARD
    const ersatz = Deno.env.get('BILD_MODELL_ERSATZ') || ERSATZ_STANDARD
    if (!schluessel) {
      return json(
        {
          error:
            'Der Schlüssel für den Erkennungsdienst fehlt. Ihn einmal als Function Secret in Supabase eintragen ' +
            '(OVH_AI_ENDPOINTS_TOKEN oder BILD_SCHLUESSEL).',
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
      /** Die Frist kam vor dem Ende der Liste: vielleicht fehlt etwas. */
      unvollstaendig?: boolean
      fehler?: string
      code?: string
    }> = []
    let uebersprungen_wegen_grenze = 0

    for (const [nr, foto] of meine.entries()) {
      // Schon ausgewertet? Dann nicht noch einmal bezahlen.
      const { data: schon } = await ich
        .from('photo_analyses')
        .select('status, ergebnis')
        .eq('photo_id', foto.id)
        .eq('sprache', sprache)
        .maybeSingle()
      if (schon && schon.status === 'fertig') {
        await ich.rpc('bild_lesen_buchen', { p_project: body.project_id, p_photo: foto.id, p_modell: modell, p_bezahlt: false })
        ergebnisse.push({ photo_id: foto.id, status: 'fertig', aus_speicher: true, dinge: (schon.ergebnis ?? []) as Ding[] })
        continue
      }

      /* Die Bremse bucht VOR jedem bezahlten Bild, in einem Schritt mit
       * der Pruefung. */
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

      const frist = eingang + FRIST_MS
      let letztesModell = modell
      try {
        /* Das Bild: die verkleinerte Fassung aus der App, wenn sie da ist
         * und taugt (nur fuer das erste Foto), sonst das gespeicherte. */
        let bildUrl: string | null = null
        const mit = typeof body.bild === 'string' && nr === 0 ? body.bild : null
        if (mit && mit.length <= MAX_MITGESCHICKT * 1.4 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(mit)) {
          bildUrl = mit
        } else {
          const { data: datei, error: ladeFehler } = await ich.storage.from('item-photos').download(foto.path)
          if (ladeFehler || !datei) throw new Error(ladeFehler?.message ?? 'Bild nicht im Speicher gefunden')
          const bytes = new Uint8Array(await datei.arrayBuffer())
          if (bytes.length > MAX_BYTES) throw new BildFehler('zu_gross', 'Das Bild ist zu groß für die Auswertung.')
          const typ = bildArt(bytes)
          if (!typ) throw new BildFehler('format', 'Das Bild hat ein Format, das die Erkennung nicht lesen kann. Nimm das Foto neu auf.')
          bildUrl = `data:${typ};base64,${alsBase64(bytes)}`
        }

        /* Erst das guenstige Modell. Hat es nach ERSATZ_AB_MS noch kein Ding
         * geschrieben, laeuft das zweite daneben (eigens gebucht). Ist eines
         * ganz fertig, hoert das andere auf. Am Ende gilt das bessere. */
        const stopp = new AbortController()
        const versuche: Versuch[] = []
        const fehler: BildFehler[] = []
        let erstesDing = false
        const laufen = (p: Promise<Versuch>) =>
          p.then(
            (v) => {
              versuche.push(v)
              if (v.fertig && v.dinge.length > 0) stopp.abort()
            },
            (e) => {
              fehler.push(e instanceof BildFehler ? e : new BildFehler('unbekannt', e instanceof Error ? e.message : String(e)))
            },
          )
        const erster = laufen(erkennen(endpunkt, schluessel, modell, bildUrl, was, sprache, frist, stopp.signal, () => (erstesDing = true)))
        const laeufe = [erster]
        await Promise.race([erster, schlafen(Math.max(0, eingang + ERSATZ_AB_MS - Date.now()))])
        const ersterFertig = versuche.some((v) => v.fertig && v.dinge.length > 0)
        if (!ersterFertig && !erstesDing && ersatz !== modell && frist - Date.now() > 5_000) {
          const { data: darfErsatz } = await ich.rpc('bild_lesen_buchen', {
            p_project: body.project_id,
            p_photo: foto.id,
            p_modell: ersatz,
            p_bezahlt: true,
          })
          if (darfErsatz === true) {
            console.warn('[bild-analyse] Ersatzmodell laeuft mit:', ersatz)
            laeufe.push(laufen(erkennen(endpunkt, schluessel, ersatz, bildUrl, was, sprache, frist, stopp.signal, () => {})))
          }
        }
        await Promise.all(laeufe)

        // Das bessere: erst ganz fertige, dann die meisten Dinge.
        versuche.sort((a, b) => Number(b.fertig) - Number(a.fertig) || b.dinge.length - a.dinge.length)
        const best = versuche.find((v) => v.dinge.length > 0)
        if (!best) {
          const ernst = fehler.find((f) => ['kein_schluessel', 'schluessel_falsch', 'dienst_voll'].includes(f.code))
          if (ernst) throw ernst
          if (fehler.length > 0 && versuche.length === 0) throw fehler[0]
          throw new BildFehler(
            'zeit',
            `In ${Math.round(FRIST_MS / 1000)} Sekunden wurde nichts erkannt (${versuche.map((v) => JSON.stringify(v.tempo)).join(' / ')}).`,
          )
        }
        letztesModell = best.modell

        const { error: speicherFehler } = await ich.from('photo_analyses').upsert(
          {
            project_id: body.project_id,
            photo_id: foto.id,
            sprache,
            status: 'fertig',
            modell: best.modell,
            ergebnis: best.dinge,
            fehler: best.fertig ? null : 'Frist erreicht, Liste vielleicht unvollständig',
            created_by: me.user.id,
          },
          { onConflict: 'photo_id,sprache' },
        )
        if (speicherFehler) console.warn('[bild-analyse] Ergebnis nicht gespeichert:', speicherFehler.message)
        ergebnisse.push({ photo_id: foto.id, status: 'fertig', aus_speicher: false, dinge: best.dinge, unvollstaendig: !best.fertig })
      } catch (err) {
        const grund = err instanceof Error ? err.message : String(err)
        const code = err instanceof BildFehler ? err.code : 'unbekannt'
        /* Der Fehlschlag wird festgehalten, nicht verschwiegen. */
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
        ergebnisse.push({ photo_id: foto.id, status: 'fehler', aus_speicher: false, dinge: [], fehler: grund, code })
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
      ms: Date.now() - eingang,
    })
  } catch (err) {
    console.error('[bild-analyse]', err)
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
