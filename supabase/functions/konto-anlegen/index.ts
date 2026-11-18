/* Magazino konto-anlegen
 *
 * Ein Admin legt ein Konto an (E-Mail und Startpasswort). Konten gibt es
 * nur so: die Seite hat kein Registrieren, und in Supabase ist die freie
 * Anmeldung abgeschaltet.
 *
 * Warum eine Server-Funktion: Ein Konto erzeugen darf nur der Dienstschluessel
 * (auth.admin.createUser). Der liegt als Umgebungsvariable beim Hoster, er
 * steht in keiner Datei und kommt nie zum Browser. Er wird hier fuer genau
 * einen Schritt benutzt, das Erzeugen. Alles Weitere (freischalten, einem
 * Lager zuteilen) macht der Browser danach mit dem eigenen Token des Admins
 * ueber Datenbankfunktionen, die selbst pruefen, ob ein Admin handelt.
 *
 * Aufruf: POST { email, password, name? } mit dem Token eines Admins.
 * Antwort: { user_id } oder { error } mit einem Kennwort aus kontoFehler.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2'

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

/* Gleiche Regel wie src/lib/passwort.ts (Supabase: mindestens 10 Zeichen,
 * Buchstaben und Ziffern). */
function passwortGenug(p: string): boolean {
  return p.length >= 10 && p.length <= 72 && /[A-Za-z]/.test(p) && /[0-9]/.test(p)
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

Deno.serve(async (req) => {
  const cors = corsFuer(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
  if (req.method !== 'POST') return json({ error: 'methode' }, 405)

  try {
    const auth = req.headers.get('Authorization') ?? ''
    if (!auth.startsWith('Bearer ')) return json({ error: 'nicht_angemeldet' }, 401)

    // 1. Wer ruft auf? Mit dem eigenen Token, damit die Datenbank entscheidet.
    const asUser = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false },
    })
    const { data: me } = await asUser.auth.getUser()
    if (!me?.user) return json({ error: 'nicht_angemeldet' }, 401)
    const { data: istAdmin, error: adminErr } = await asUser.rpc('ist_admin')
    if (adminErr) return json({ error: 'pruefung_fehlgeschlagen' }, 500)
    if (istAdmin !== true) return json({ error: 'kein_admin' }, 403)

    // 2. Eingaben pruefen.
    const body = (await req.json().catch(() => null)) as { email?: unknown; password?: unknown; name?: unknown } | null
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body?.password === 'string' ? body.password : ''
    const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 60) : ''
    if (!EMAIL.test(email) || email.length > 120) return json({ error: 'email_ungueltig' }, 400)
    if (!passwortGenug(password)) return json({ error: 'passwort_schwach' }, 400)

    // 3. Konto erzeugen. E-Mail gilt als bestaetigt, weil der Admin sie kennt
    //    und es keine Bestaetigungsmail gibt.
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false },
    })
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: name || null, passwort_aendern: true },
    })
    if (error || !data?.user) {
      const msg = (error?.message ?? '').toLowerCase()
      if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
        return json({ error: 'email_vergeben' }, 409)
      }
      console.error('[konto-anlegen]', error?.message)
      return json({ error: 'anlegen_fehlgeschlagen' }, 500)
    }
    return json({ user_id: data.user.id })
  } catch (err) {
    console.error('[konto-anlegen]', err)
    return json({ error: 'serverfehler' }, 500)
  }
})
