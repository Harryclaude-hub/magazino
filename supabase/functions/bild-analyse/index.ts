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
/** So lange wird auf ein Bild gewartet. Danach gilt es als gescheitert
 *  statt den ganzen Aufruf haengen zu lassen. */
const ZEIT_MS = 90_000
/** Genug fuer rund 60 Dinge mit zwei Namen und Suchwoertern. Reicht es
 *  nicht, meldet finish_reason 'length', und das wird gesagt, nicht als
 *  halbe Liste uebernommen. */
const MAX_TOKENS = 8000

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
    // Qwen3.5 denkt sonst erst lange nach, und das kostet. OVH nimmt den
    // Schalter enable_thinking nicht an (am 23.09.2026 ausprobiert: "feature
    // extra arguments is not currently supported"), darum der Kurzbefehl im
    // Text. Kommt trotzdem ein Denkblock, filtert jsonAus ihn heraus.
    '/no_think',
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

/** Aus der Antwort des Modells das JSON holen: ohne Denkblock, ohne
 *  Codezaun, vom ersten { bis zur letzten }. */
function jsonAus(inhalt: string): unknown {
  const ohneDenken = inhalt.replace(/<think>[\s\S]*?<\/think>/g, '')
  const start = ohneDenken.indexOf('{')
  const ende = ohneDenken.lastIndexOf('}')
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

async function erkennen(
  endpunkt: string,
  schluessel: string,
  modell: string,
  bild: Uint8Array,
  typ: string,
  was: Was,
  sprache: Sprache,
): Promise<Ding[]> {
  const abbruch = new AbortController()
  const uhr = setTimeout(() => abbruch.abort(), ZEIT_MS)
  let antwort: Response
  try {
    antwort = await fetch(endpunkt, {
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
  } catch (err) {
    if (abbruch.signal.aborted) {
      throw new BildFehler('zeit', 'Das Bildmodell hat zu lange gebraucht.')
    }
    throw err
  } finally {
    clearTimeout(uhr)
  }

  if (antwort.status === 429) {
    throw new BildFehler('dienst_voll', 'Der Erkennungsdienst ist gerade ausgelastet.')
  }
  if (antwort.status === 401 || antwort.status === 403) {
    throw new BildFehler('schluessel_falsch', 'Der Schlüssel für den Erkennungsdienst wird nicht angenommen.')
  }
  if (!antwort.ok) {
    const t = await antwort.text()
    throw new Error(`Bildmodell antwortete mit ${antwort.status}: ${t.slice(0, 300)}`)
  }

  const daten = (await antwort.json()) as {
    choices?: Array<{ finish_reason?: string; message?: { content?: string | null } }>
  }
  const wahl = daten.choices?.[0]
  if (wahl?.finish_reason === 'length') {
    throw new BildFehler(
      'zu_lang',
      'Die Antwort des Bildmodells war zu lang und wurde abgeschnitten. Fotografiere weniger auf einmal.',
    )
  }
  const inhalt = wahl?.message?.content ?? ''
  return aufraeumen(jsonAus(inhalt), sprache)
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

        const dinge = await erkennen(endpunkt, schluessel, modell, bytes, typ, was, sprache)

        const { error: speicherFehler } = await ich.from('photo_analyses').upsert(
          {
            project_id: body.project_id,
            photo_id: foto.id,
            sprache,
            status: 'fertig',
            modell,
            ergebnis: dinge,
            fehler: null,
            created_by: me.user.id,
          },
          { onConflict: 'photo_id,sprache' },
        )
        if (speicherFehler) console.warn('[bild-analyse] Ergebnis nicht gespeichert:', speicherFehler.message)
        ergebnisse.push({ photo_id: foto.id, status: 'fertig', aus_speicher: false, dinge })
      } catch (err) {
        const grund = err instanceof Error ? err.message : String(err)
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
            modell,
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
