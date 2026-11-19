/* Magazino konto-anlegen
 *
 * Ein Admin legt ein Konto an, mit E-Mail ODER nur mit Benutzernamen.
 * Konten gibt es nur so: die Seite hat kein Registrieren, und in Supabase
 * ist die freie Anmeldung abgeschaltet.
 *
 * Benutzername statt E-Mail: Supabase kennt Konten nur mit E-Mail-Adresse.
 * Wer nur einen Namen hat, bekommt intern die Adresse
 * <name>@magazino.invalid (die Endung .invalid ist weltweit reserviert und
 * kann nie echte Post empfangen, es geht also nie eine Mail an Fremde).
 * Angemeldet wird mit dem Namen; die Seite setzt die Adresse selbst ein.
 * Ein Passwort-per-Mail-zuruecksetzen gibt es fuer solche Konten nicht, nur
 * der Admin kann ein neues Startpasswort setzen (Funktion passwort-setzen).
 *
 * Warum eine Server-Funktion: Ein Konto erzeugen darf nur der Dienstschluessel
 * (auth.admin.createUser). Der liegt als Umgebungsvariable beim Hoster, er
 * steht in keiner Datei und kommt nie zum Browser. Er wird hier fuer genau
 * einen Schritt benutzt, das Erzeugen. Alles Weitere (freischalten, einem
 * Bundeslandprojekt zuteilen) macht der Browser danach mit dem eigenen Token
 * des Admins ueber Datenbankfunktionen, die selbst pruefen, ob ein Admin
 * handelt.
 *
 * Passwoerter: Es wird nie eines gespeichert, geloggt oder zurueckgegeben.
 * Supabase legt nur einen Hash ab; niemand, auch kein Admin, kann ein
 * Passwort auslesen, nur ein neues setzen.
 *
 * Aufruf: POST { email? | benutzername?, password, name? } mit dem Token eines Admins.
 * Antwort: { user_id, login } oder { error } mit einer Kennung.
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

/* Gleiche Regeln wie src/lib/passwort.ts: mindestens 10 Zeichen mit Buchstaben
 * und Ziffern; zusaetzlich nicht der Name, nicht die Adresse und nichts, was
 * jeder als Erstes raet. */
const BEKANNT = [
  'passwort123', 'password123', 'magazino123', 'qwertz1234', 'qwerty1234', '1234567890', 'passwort12',
  'password12', 'willkommen1', 'willkommen123', 'abcdefgh12', 'abcd123456', 'test123456', 'admin12345',
]

function passwortFehler(p: string, namen: string[]): string | null {
  if (p.length < 10 || p.length > 72 || !/[A-Za-z]/.test(p) || !/[0-9]/.test(p)) return 'passwort_schwach'
  const klein = p.toLowerCase()
  if (BEKANNT.some((b) => klein.includes(b))) return 'passwort_bekannt'
  if (/^(.)\1+$/.test(p)) return 'passwort_bekannt'
  for (const n of namen) {
    if (n.length >= 4 && klein.includes(n.toLowerCase())) return 'passwort_enthaelt_name'
  }
  return null
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const BENUTZERNAME = /^[a-z0-9][a-z0-9._-]{2,29}$/
const INTERN = '@magazino.invalid'

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
    const body = (await req.json().catch(() => null)) as
      | { email?: unknown; benutzername?: unknown; password?: unknown; name?: unknown }
      | null
    const emailRoh = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const nutzerRoh = typeof body?.benutzername === 'string' ? body.benutzername.trim().toLowerCase() : ''
    const password = typeof body?.password === 'string' ? body.password : ''
    const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 60) : ''

    let email = ''
    let benutzername: string | null = null
    if (emailRoh) {
      if (!EMAIL.test(emailRoh) || emailRoh.length > 120 || emailRoh.endsWith(INTERN)) return json({ error: 'email_ungueltig' }, 400)
      email = emailRoh
    } else if (nutzerRoh) {
      if (!BENUTZERNAME.test(nutzerRoh)) return json({ error: 'benutzername_ungueltig' }, 400)
      benutzername = nutzerRoh
      email = nutzerRoh + INTERN
    } else {
      return json({ error: 'login_fehlt' }, 400)
    }
    const fehler = passwortFehler(password, [email.split('@')[0], benutzername ?? '', ...name.split(/\s+/)])
    if (fehler) return json({ error: fehler }, 400)

    // 3. Konto erzeugen. Die Adresse gilt als bestaetigt (der Admin kennt sie
    //    oder sie ist rein intern), es gibt keine Bestaetigungsmail.
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false },
    })
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: name || benutzername || null, benutzername, passwort_aendern: true },
    })
    if (error || !data?.user) {
      const msg = (error?.message ?? '').toLowerCase()
      if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
        return json({ error: benutzername ? 'benutzername_vergeben' : 'email_vergeben' }, 409)
      }
      console.error('[konto-anlegen]', error?.message)
      return json({ error: 'anlegen_fehlgeschlagen' }, 500)
    }
    // Das Startpasswort sofort merken (Hash, nie das Passwort): erst damit sperrt die Datenbank das Konto, bis die Person
    // ein eigenes gesetzt hat (0058). Gelingt das nicht, wird das Konto wieder entfernt, damit kein Konto mit einem
    // dem Admin bekannten, dauerhaft gueltigen Passwort entsteht.
    const { error: merkErr } = await admin.rpc('startpasswort_merken_dienst', { p_user: data.user.id })
    if (merkErr) {
      console.error('[konto-anlegen] merken:', merkErr.message)
      await admin.auth.admin.deleteUser(data.user.id)
      return json({ error: 'anlegen_fehlgeschlagen' }, 500)
    }
    return json({ user_id: data.user.id, login: benutzername ?? email })
  } catch (err) {
    console.error('[konto-anlegen]', err)
    return json({ error: 'serverfehler' }, 500)
  }
})
