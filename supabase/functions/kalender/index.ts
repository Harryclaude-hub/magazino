/* Magazino Kalender-Feed
 *
 * Wird von Apple Kalender, Google Kalender und Outlook als Abo-Adresse
 * abgeholt (GET ?z=<Zeichen>). Kein Nutzer-Token: das 64 Zeichen lange
 * Zeichen ist das Geheimnis, die Datenbank kennt es (Migration 0064).
 * Gelesen wird nur mit dem anon-Schluessel ueber kalender_feed(); es gibt
 * keine Rechte darueber hinaus und keinen service_role-Schluessel.
 *
 * Bereitgestellt werden die offenen Rueckgaben des Kontos, zwei Erinnerungen
 * je Termin (3 Stunden und 30 Minuten vorher). Den Aufbau der Datei teilt
 * sich diese Funktion mit src/lib/kalender.ts (bewusst kopiert, weil die
 * Funktion nicht aus src importieren kann; bei Aenderungen beide anpassen).
 * Deploy: supabase functions deploy kalender --no-verify-jwt
 */
import { createClient } from 'jsr:@supabase/supabase-js@2'

const CRLF = '\r\n'
const enc = new TextEncoder()

const zwei = (n: number) => (n < 10 ? `0${n}` : String(n))

function icsZeit(d: Date): string {
  return (
    `${d.getUTCFullYear()}${zwei(d.getUTCMonth() + 1)}${zwei(d.getUTCDate())}` +
    `T${zwei(d.getUTCHours())}${zwei(d.getUTCMinutes())}${zwei(d.getUTCSeconds())}Z`
  )
}

function icsText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n')
}

function falten(zeile: string): string {
  if (enc.encode(zeile).length <= 75) return zeile
  const teile: string[] = []
  let aktuell = ''
  let bytes = 0
  let grenze = 75
  for (const zeichen of zeile) {
    const n = enc.encode(zeichen).length
    if (bytes + n > grenze) {
      teile.push(aktuell)
      aktuell = ''
      bytes = 0
      grenze = 74
    }
    aktuell += zeichen
    bytes += n
  }
  if (aktuell) teile.push(aktuell)
  return teile.join(CRLF + ' ')
}

const alarm = (trigger: string, text: string) => [
  'BEGIN:VALARM',
  'ACTION:DISPLAY',
  `DESCRIPTION:${icsText(text)}`,
  `TRIGGER:${trigger}`,
  'END:VALARM',
]

interface Zeile {
  id: string
  ding: string
  einheit: string
  menge: number
  lager: string
  faellig_am: string
}

function feedBauen(zeilen: Zeile[]): string {
  const stempel = icsZeit(new Date())
  const out: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Magazino//Lager//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Magazino Rückgaben',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
  ]
  for (const z of zeilen) {
    const start = new Date(z.faellig_am)
    if (Number.isNaN(start.getTime())) continue
    const ende = new Date(start.getTime() + 30 * 60000)
    const titel = `Zurückbringen: ${z.ding} (${z.lager})`
    out.push(
      'BEGIN:VEVENT',
      `UID:${z.id}@magazino`,
      `DTSTAMP:${stempel}`,
      `DTSTART:${icsZeit(start)}`,
      `DTEND:${icsZeit(ende)}`,
      `SUMMARY:${icsText(titel)}`,
      `DESCRIPTION:${icsText(`${z.menge} ${z.einheit} ${z.ding} ins Lager ${z.lager} zurückbringen.`)}`,
      ...alarm('-PT3H', titel),
      ...alarm('-PT30M', titel),
      'END:VEVENT',
    )
  }
  out.push('END:VCALENDAR')
  return out.map(falten).join(CRLF) + CRLF
}

Deno.serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('Nicht erlaubt', { status: 405 })
  const zeichen = new URL(req.url).searchParams.get('z') ?? ''
  // Falsche Form: gar nicht erst fragen.
  if (!/^[0-9a-f]{64}$/.test(zeichen)) return new Response('Nicht gefunden', { status: 404 })

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await db.rpc('kalender_feed', { p_zeichen: zeichen })
  if (error) return new Response('Fehler', { status: 502 })
  // Unbekanntes Zeichen und leerer Feed sehen gleich aus: ein leerer Kalender.
  const body = feedBauen((data ?? []) as Zeile[])
  return new Response(req.method === 'HEAD' ? null : body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'private, max-age=300',
      'Content-Disposition': 'inline; filename="magazino.ics"',
    },
  })
})
