/* Magazino passwort-setzen
 *
 * Nur ein Admin kann einer anderen Person ein NEUES Startpasswort setzen
 * (zum Beispiel, wenn sie ihr Passwort vergessen hat oder nur einen
 * Benutzernamen ohne echte E-Mail hat). Ein bestehendes Passwort kann
 * niemand sehen oder abrufen: Supabase speichert nur einen Hash.
 *
 * Ablauf: Aufrufer pruefen (Token, ist_admin), Ziel pruefen (kein Admin,
 * damit ein Admin nicht ein anderes Admin-Konto uebernimmt), Passwort pruefen,
 * setzen, Merker passwort_aendern (die Person muss beim naechsten Anmelden
 * ein eigenes setzen), danach alle offenen Sitzungen der Person beenden
 * (Datenbankfunktion admin_sitzungen_beenden mit dem Token des Admins).
 *
 * Aufruf: POST { user_id, password }. Antwort: { ok: true } oder { error }.
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

Deno.serve(async (req) => {
  const cors = corsFuer(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
  if (req.method !== 'POST') return json({ error: 'methode' }, 405)

  try {
    const auth = req.headers.get('Authorization') ?? ''
    if (!auth.startsWith('Bearer ')) return json({ error: 'nicht_angemeldet' }, 401)
    const asUser = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false },
    })
    const { data: me } = await asUser.auth.getUser()
    if (!me?.user) return json({ error: 'nicht_angemeldet' }, 401)
    const { data: istAdmin, error: adminErr } = await asUser.rpc('ist_admin')
    if (adminErr) return json({ error: 'pruefung_fehlgeschlagen' }, 500)
    if (istAdmin !== true) return json({ error: 'kein_admin' }, 403)

    const body = (await req.json().catch(() => null)) as { user_id?: unknown; password?: unknown } | null
    const userId = typeof body?.user_id === 'string' ? body.user_id : ''
    const password = typeof body?.password === 'string' ? body.password : ''
    if (!UUID.test(userId)) return json({ error: 'konto_unbekannt' }, 400)
    if (userId === me.user.id) return json({ error: 'nicht_selbst' }, 400)

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false },
    })
    const { data: ziel, error: zielErr } = await admin.auth.admin.getUserById(userId)
    if (zielErr || !ziel?.user) return json({ error: 'konto_unbekannt' }, 404)
    // Ein Admin-Konto setzt nur sein Besitzer selbst (ueber die Einstellungen).
    const { data: zielAdmin } = await admin.from('app_admins').select('user_id').eq('user_id', userId).maybeSingle()
    if (zielAdmin) return json({ error: 'ziel_ist_admin' }, 403)

    const meta = (ziel.user.user_metadata ?? {}) as Record<string, unknown>
    const fehler = passwortFehler(password, [
      (ziel.user.email ?? '').split('@')[0],
      typeof meta.benutzername === 'string' ? meta.benutzername : '',
      ...String(meta.display_name ?? '').split(/\s+/),
    ])
    if (fehler) return json({ error: fehler }, 400)

    const { error } = await admin.auth.admin.updateUserById(userId, {
      password,
      user_metadata: { ...meta, passwort_aendern: true },
    })
    if (error) {
      console.error('[passwort-setzen]', error.message)
      return json({ error: 'setzen_fehlgeschlagen' }, 500)
    }
    // Das neue Startpasswort sofort merken (Hash), sonst bliebe es dauerhaft gueltig (0058). Zweiter Versuch bei Fehler.
    let merkErr = (await admin.rpc('startpasswort_merken_dienst', { p_user: userId })).error
    if (merkErr) merkErr = (await admin.rpc('startpasswort_merken_dienst', { p_user: userId })).error
    if (merkErr) {
      console.error('[passwort-setzen] merken:', merkErr.message)
      return json({ error: 'merken_fehlgeschlagen' }, 500)
    }
    // Offene Sitzungen beenden (mit dem Token des Admins, die Funktion prueft ihn selbst).
    const { error: sitzErr } = await asUser.rpc('admin_sitzungen_beenden', { p_user: userId })
    if (sitzErr) console.error('[passwort-setzen] Sitzungen:', sitzErr.message)
    return json({ ok: true })
  } catch (err) {
    console.error('[passwort-setzen]', err)
    return json({ error: 'serverfehler' }, 500)
  }
})
