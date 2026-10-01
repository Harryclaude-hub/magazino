/* Produktseite lesen (E77).
 *
 * Nimmt einen Link zu einem IKEA-Produkt und holt von der Seite, was ein
 * Moebel im Grundriss braucht: Name, Preis, Masse und das Produktfoto
 * (klein, als data:-Adresse). Die Farbe rechnet danach der Browser aus
 * dem Foto aus; der Server rechnet keine Bilder (CPU-Grenze).
 *
 * Warum hier und nicht im Browser: IKEA erlaubt keinen Abruf von fremden
 * Seiten aus (CORS). Hier geht es, aber nur fuer ikea.com: jeder andere
 * Host wird abgelehnt, auch nach einer Weiterleitung, damit niemand diese
 * Funktion als Durchgang zu anderen Adressen benutzt.
 *
 * Es wird nichts gespeichert und nichts in der Datenbank gelesen. Wer
 * angemeldet ist, darf lesen (verify_jwt).
 *
 * Aufruf: POST { url }
 * Antwort: { name, preis_cent, masse: {name, wert_cm}[], breite_cm,
 *            tiefe_cm, hoehe_cm, bild, url }
 */

const ERLAUBT = /^(www\.)?ikea\.com$/i
const MAX_SEITE = 4_000_000
const MAX_BILD = 400_000
const ZEIT_MS = 9_000
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36'

const HERKUNFT_STANDARD = ['https://harryclaude-hub.github.io', 'http://localhost:5173', 'http://127.0.0.1:5173']

function corsFuer(req: Request): Record<string, string> {
  const erlaubt = (Deno.env.get('APP_ORIGINS') ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const liste = erlaubt.length > 0 ? erlaubt : HERKUNFT_STANDARD
  const herkunft = req.headers.get('Origin') ?? ''
  return {
    'Access-Control-Allow-Origin': liste.includes(herkunft) ? herkunft : liste[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

/** Nur https-Adressen auf ikea.com. */
function pruefen(roh: string): URL | null {
  try {
    const u = new URL(roh)
    if (u.protocol !== 'https:' || !ERLAUBT.test(u.hostname) || u.username || u.password || u.port) return null
    return u
  } catch {
    return null
  }
}

/** Holen, Weiterleitungen selbst verfolgen (hoechstens 3, jede geprueft),
 *  hoechstens `max` Bytes lesen. */
async function holen(adresse: URL, max: number, signal: AbortSignal): Promise<{ bytes: Uint8Array; typ: string; url: URL }> {
  let u = adresse
  for (let i = 0; i < 4; i++) {
    const r = await fetch(u, { redirect: 'manual', signal, headers: { 'User-Agent': UA, Accept: '*/*', 'Accept-Language': 'de-AT,de;q=0.9' } })
    if (r.status >= 300 && r.status < 400) {
      const weiter = r.headers.get('location')
      const neu = weiter ? pruefen(new URL(weiter, u).toString()) : null
      if (!neu) throw new Error('Weiterleitung auf eine andere Seite')
      u = neu
      continue
    }
    if (!r.ok || !r.body) throw new Error(`IKEA antwortete mit ${r.status}`)
    const leser = r.body.getReader()
    const teile: Uint8Array[] = []
    let laenge = 0
    while (true) {
      const { value, done } = await leser.read()
      if (done) break
      laenge += value.length
      if (laenge > max) {
        await leser.cancel()
        throw new Error('Seite zu gross')
      }
      teile.push(value)
    }
    const bytes = new Uint8Array(laenge)
    let pos = 0
    for (const t of teile) {
      bytes.set(t, pos)
      pos += t.length
    }
    return { bytes, typ: r.headers.get('content-type') ?? '', url: u }
  }
  throw new Error('Zu viele Weiterleitungen')
}

function entschluesseln(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

/** "75 cm", "1,5 m", "60x40 cm" -> cm als Zahl (erste Zahl). */
function inCm(wert: string): number | null {
  const m = wert.replace(',', '.').match(/(\d+(?:\.\d+)?)\s*(mm|cm|m)\b/)
  if (!m) return null
  const zahl = Number(m[1])
  const cm = m[2] === 'mm' ? zahl / 10 : m[2] === 'm' ? zahl * 100 : zahl
  return Number.isFinite(cm) && cm > 0 ? Math.round(cm) : null
}

function alsBase64(b: Uint8Array): string {
  let roh = ''
  for (let i = 0; i < b.length; i += 0x8000) roh += String.fromCharCode(...b.subarray(i, i + 0x8000))
  return btoa(roh)
}

Deno.serve(async (req) => {
  const cors = corsFuer(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
  if (req.method !== 'POST') return json({ error: 'Nur POST' }, 405)

  let body: { url?: unknown }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Kein JSON', code: 'eingabe' }, 400)
  }
  const ziel = typeof body.url === 'string' ? pruefen(body.url.trim()) : null
  if (!ziel || !/\/p\//.test(ziel.pathname)) {
    return json({ error: 'Nur Links zu einem IKEA-Produkt (ikea.com/.../p/...)', code: 'kein_ikea' }, 400)
  }

  const abbruch = new AbortController()
  const uhr = setTimeout(() => abbruch.abort(), ZEIT_MS)
  try {
    const seite = await holen(ziel, MAX_SEITE, abbruch.signal)
    const t = new TextDecoder().decode(seite.bytes)
    const titel = t.match(/property="og:title" content="([^"]*)"/)?.[1] ?? t.match(/og:title" content="([^"]*)"/)?.[1] ?? null
    const preis = t.match(/"price":"([0-9]+(?:\.[0-9]+)?)"/)?.[1] ?? t.match(/"price":\["?([0-9]+(?:\.[0-9]+)?)/)?.[1] ?? null
    const bildRoh = t.match(/property="og:image" content="([^"]*)"/)?.[1] ?? t.match(/og:image" content="([^"]*)"/)?.[1] ?? null

    const masse: { name: string; wert: string; cm: number | null }[] = []
    const mt = t.match(/"measurements":(\[\{"measure".*?\])/)
    if (mt) {
      try {
        for (const m of JSON.parse(mt[1]) as { name?: string; measure?: string }[]) {
          if (typeof m.name === 'string' && typeof m.measure === 'string') {
            masse.push({ name: m.name.replace(/:$/, ''), wert: m.measure, cm: inCm(m.measure) })
          }
        }
      } catch {
        /* Masse fehlen dann; Name und Preis kommen trotzdem. */
      }
    }

    // Masse auf Breite, Tiefe, Hoehe im Grundriss abbilden.
    const nimm = (re: RegExp, ohne?: RegExp) => masse.find((m) => re.test(m.name) && (!ohne || !ohne.test(m.name)) && m.cm !== null)?.cm ?? null
    // "... - IKEA Österreich" am Ende weg.
    const name = titel ? entschluesseln(titel).replace(/\s+-\s+IKEA.*$/i, '').trim() : null
    const istBett = !!name && /bett/i.test(name.split(',')[0])
    const breiteM = nimm(/^Breite$/i)
    const laenge = nimm(/^Länge$/i)
    const tiefeM = nimm(/^Tiefe$/i)
    const durchmesser = nimm(/^Durchmesser$/i)
    let breite = breiteM
    let tiefe = tiefeM
    if (tiefe === null && laenge !== null && breiteM !== null) {
      // Tisch, Teppich: Laenge ist die lange Seite. Bett: Breite quer, Laenge ist die Tiefe.
      breite = istBett ? breiteM : laenge
      tiefe = istBett ? laenge : breiteM
    }
    if (durchmesser !== null) {
      breite = breite ?? durchmesser
      tiefe = tiefe ?? durchmesser
    }
    const hoehe = nimm(/^Höhe inkl/i) ?? nimm(/^Höhe/i, /Sitz|Armlehne|Rückenstütze|frei|unter|Tisch|Kopf|Fuß/i) ?? nimm(/^Höhe/i)

    // Produktfoto klein holen (IKEA liefert Groessen ueber ?f=), fuer die Farbe.
    let bild: string | null = null
    const bildUrl = bildRoh ? pruefen(entschluesseln(bildRoh)) : null
    if (bildUrl) {
      bildUrl.search = '?f=xxs'
      try {
        const b = await holen(bildUrl, MAX_BILD, abbruch.signal)
        const typ = b.typ.split(';')[0].trim()
        if (/^image\/(jpeg|png|webp|avif)$/.test(typ)) bild = `data:${typ};base64,${alsBase64(b.bytes)}`
      } catch {
        /* Ohne Foto keine Farbe, der Rest gilt. */
      }
    }

    return json({
      url: seite.url.toString(),
      name,
      preis_cent: preis ? Math.round(Number(preis) * 100) : null,
      masse: masse.map((m) => ({ name: m.name, wert: m.wert })),
      breite_cm: breite,
      tiefe_cm: tiefe,
      hoehe_cm: hoehe,
      // Sofa mit Recamiere oder Ecksofa: die tiefe Seite (fuer die L-Form).
      tiefe_lang_cm: nimm(/^Tiefe (Récamiere|Recamiere|Ecke|Eckelement|Chaiselongue)/i),
      bild,
    })
  } catch (err) {
    const zeit = abbruch.signal.aborted
    return json({ error: zeit ? 'IKEA hat zu lange gebraucht' : err instanceof Error ? err.message : String(err), code: zeit ? 'zeit' : 'lesen' }, 502)
  } finally {
    clearTimeout(uhr)
  }
})
