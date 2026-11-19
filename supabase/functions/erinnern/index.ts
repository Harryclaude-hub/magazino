/* Magazino erinnern
 *
 * Laeuft alle 30 Minuten (Datenbank-Zeitplan pg_cron, Migration 0053) und
 * schickt Push-Nachrichten:
 *   1. an Ausleiher: Rueckgabe in den naechsten 2 Stunden oder ueberfaellig
 *      ("Hast du es zurueckgebracht?"), hoechstens alle 12 Stunden
 *   2. an die Zustaendigen des Bereichs (sonst die Besitzer des Lagers):
 *      etwas ist seit 12 Stunden ueberfaellig, einmal
 *   3. an dieselben: eine Menge ist unter die Mindestmenge gefallen, einmal
 *
 * Aufruf ohne Nutzer-Token (der Zeitplan hat keinen), darum geschuetzt durch
 * ein geheimes Zeichen (ERINNERN_TOKEN in private.config), das mitgeschickt
 * wird (Kopfzeile x-cron-token). Das Zeichen steht nur in der Datenbank.
 * Wer es nicht kennt, bekommt 401 und es passiert nichts.
 *
 * Die Verschluesselung (RFC 8291) und der VAPID-Kopf (RFC 8292) sind hier
 * aus push-send uebernommen, damit push-send unberuehrt bleibt.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2'

const enc = new TextEncoder()

/* ----------------------------------------------------------- base64url */
function b64uToBytes(s: string): Uint8Array {
  const pad = '='.repeat((4 - (s.length % 4)) % 4)
  const bin = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function bytesToB64u(b: Uint8Array | ArrayBuffer): string {
  const bytes = b instanceof Uint8Array ? b : new Uint8Array(b)
  let s = ''
  for (const byte of bytes) s += String.fromCharCode(byte)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const len = parts.reduce((n, p) => n + p.length, 0)
  const out = new Uint8Array(len)
  let off = 0
  for (const p of parts) {
    out.set(p, off)
    off += p.length
  }
  return out
}

/* --------------------------------------------------------------- HKDF */
async function hmac(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ])
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data))
}

async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number,
): Promise<Uint8Array> {
  const prk = await hmac(salt, ikm)
  const okm = await hmac(prk, concat(info, new Uint8Array([1])))
  return okm.slice(0, length)
}

/* --------------------------------------------------------------- VAPID */
async function vapidHeaders(
  endpoint: string,
  publicKey: string,
  privateKey: string,
  subject: string,
): Promise<Record<string, string>> {
  const aud = new URL(endpoint).origin
  const header = bytesToB64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const payload = bytesToB64u(
    enc.encode(
      JSON.stringify({
        aud,
        exp: Math.floor(Date.now() / 1000) + 12 * 3600,
        sub: subject,
      }),
    ),
  )
  const unsigned = `${header}.${payload}`

  const pub = b64uToBytes(publicKey)
  const jwk: JsonWebKey = {
    kty: 'EC',
    crv: 'P-256',
    x: bytesToB64u(pub.slice(1, 33)),
    y: bytesToB64u(pub.slice(33, 65)),
    d: privateKey,
    ext: true,
  }
  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    enc.encode(unsigned),
  )
  return {
    Authorization: `vapid t=${unsigned}.${bytesToB64u(sig)}, k=${publicKey}`,
  }
}

/* ------------------------------------------------- Nutzlast verschluesseln */
async function encryptPayload(
  plaintext: Uint8Array,
  uaPublicB64: string,
  authSecretB64: string,
): Promise<Uint8Array> {
  const uaPublic = b64uToBytes(uaPublicB64)
  const authSecret = b64uToBytes(authSecretB64)

  const ephemeral = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits'],
  )
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', ephemeral.publicKey))

  const uaKey = await crypto.subtle.importKey(
    'raw',
    uaPublic,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  )
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, ephemeral.privateKey, 256),
  )

  // IKM nach RFC 8291
  const keyInfo = concat(enc.encode('WebPush: info\0'), uaPublic, asPublic)
  const ikm = await hkdf(authSecret, shared, keyInfo, 32)

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16)
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12)

  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt'])
  // 0x02 schliesst den einzigen Datensatz ab.
  const record = concat(plaintext, new Uint8Array([2]))
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, aesKey, record),
  )

  const rs = new Uint8Array(4)
  new DataView(rs.buffer).setUint32(0, 4096)
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, ciphertext)
}



/* Nur die Push-Dienste der Browser (https), nie eine beliebige Adresse. */
function pushAdresseErlaubt(adresse: string): boolean {
  try {
    const u = new URL(adresse)
    return u.protocol === 'https:' && /^(fcm\.googleapis\.com|android\.googleapis\.com|([a-z0-9-]+\.)+push\.services\.mozilla\.com|([a-z0-9-]+\.)*push\.apple\.com|([a-z0-9-]+\.)+notify\.windows\.com)$/.test(u.hostname)
  } catch {
    return false
  }
}

/* ---------------------------------------------------------------- Server */
type Admin = ReturnType<typeof createClient>

interface Nachricht {
  title: string
  body: string
  url: string
  tag: string
}

async function konfig(admin: Admin): Promise<Record<string, string | undefined>> {
  const out: Record<string, string | undefined> = {
    VAPID_PUBLIC_KEY: Deno.env.get('VAPID_PUBLIC_KEY') ?? undefined,
    VAPID_PRIVATE_KEY: Deno.env.get('VAPID_PRIVATE_KEY') ?? undefined,
    VAPID_SUBJECT: Deno.env.get('VAPID_SUBJECT') ?? undefined,
  }
  const { data, error } = await admin.rpc('app_config')
  if (error) {
    console.warn('[erinnern] app_config nicht lesbar:', error.message)
    return out
  }
  for (const row of (data ?? []) as Array<{ key: string; value: string }>) {
    out[row.key] = out[row.key] ?? row.value
  }
  return out
}

/** Gleiches Zeichen in gleicher Zeit vergleichen (kein Zeitleck). */
function gleich(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

/** Schickt eine Nachricht an alle Geraete der Personen. Wer "Dinge" in den
 *  Benachrichtigungen abgeschaltet hat, bekommt nichts. Gibt die Zahl der
 *  zugestellten Nachrichten zurueck. */
async function schicken(
  admin: Admin,
  personen: string[],
  n: Nachricht,
  vapid: { pub: string; priv: string; subject: string },
): Promise<number> {
  const ids = [...new Set(personen)]
  if (ids.length === 0) return 0
  const { data: prefs } = await admin.from('notification_prefs').select('user_id, items').in('user_id', ids)
  const aus = new Set((prefs ?? []).filter((p) => (p as { items: boolean | null }).items === false).map((p) => (p as { user_id: string }).user_id))
  const ziele = ids.filter((id) => !aus.has(id))
  if (ziele.length === 0) return 0
  const { data: subs } = await admin.from('push_subscriptions').select('*').in('user_id', ziele)
  if (!subs || subs.length === 0) return 0
  const nutzlast = enc.encode(JSON.stringify({ title: n.title, body: n.body, url: n.url, tag: n.tag, type: 'item', data: { url: n.url } }))
  let gesendet = 0
  await Promise.all(
    subs.map(async (sub) => {
      try {
        if (!pushAdresseErlaubt(sub.endpoint)) return
        const verschluesselt = await encryptPayload(nutzlast, sub.p256dh, sub.auth)
        const kopf = await vapidHeaders(sub.endpoint, vapid.pub, vapid.priv, vapid.subject)
        const res = await fetch(sub.endpoint, {
          method: 'POST',
          headers: { ...kopf, 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '86400', Urgency: 'normal' },
          body: verschluesselt,
        })
        if (res.ok) gesendet++
        else if (res.status === 404 || res.status === 410) await admin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      } catch (err) {
        console.error('[erinnern] Push fehlgeschlagen:', String(err).slice(0, 200))
      }
    }),
  )
  return gesendet
}

/** Die Zustaendigen eines Bereichs, sonst die Besitzer des Lagers. */
async function zustaendige(admin: Admin, projectId: string, kategorieId: string | null): Promise<string[]> {
  if (kategorieId) {
    const { data } = await admin.from('lager_kategorien').select('zustaendig_id').eq('id', kategorieId).maybeSingle()
    const z = (data as { zustaendig_id: string | null } | null)?.zustaendig_id
    if (z) return [z]
  }
  const { data: owner } = await admin.from('project_members').select('user_id').eq('project_id', projectId).eq('role', 'owner')
  return ((owner ?? []) as Array<{ user_id: string }>).map((o) => o.user_id)
}

const uhr = (iso: string) =>
  new Date(iso).toLocaleString('de-AT', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Vienna' })

Deno.serve(async (req) => {
  const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
  if (req.method !== 'POST') return json({ error: 'methode' }, 405)
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
    const conf = await konfig(admin)
    const token = conf.ERINNERN_TOKEN ?? ''
    const gegeben = req.headers.get('x-cron-token') ?? ''
    if (!token || !gleich(token, gegeben)) return json({ error: 'nicht_erlaubt' }, 401)
    if (!conf.VAPID_PUBLIC_KEY || !conf.VAPID_PRIVATE_KEY) return json({ error: 'VAPID fehlt' }, 500)
    const vapid = {
      pub: conf.VAPID_PUBLIC_KEY,
      priv: conf.VAPID_PRIVATE_KEY,
      subject: conf.VAPID_SUBJECT ?? 'mailto:magazino@users.noreply.github.com',
    }
    const jetzt = Date.now()
    const iso = (ms: number) => new Date(ms).toISOString()
    let ausleiher = 0
    let eskaliert = 0
    let knapp = 0

    // 1. Ausleiher erinnern: faellig in den naechsten 2 Stunden oder ueberfaellig.
    const { data: bald } = await admin
      .from('ausleihen')
      .select('id, project_id, user_id, menge, faellig_am, bestand:bestand_id(name, einheit)')
      .is('zurueck_am', null)
      .lte('faellig_am', iso(jetzt + 2 * 3600_000))
      .or(`erinnert_am.is.null,erinnert_am.lt.${iso(jetzt - 12 * 3600_000)}`)
      .limit(200)
    for (const a of (bald ?? []) as unknown as Array<{ id: string; project_id: string; user_id: string; menge: number; faellig_am: string; bestand: { name: string; einheit: string } | null }>) {
      const ueber = new Date(a.faellig_am).getTime() < jetzt
      const n = await schicken(admin, [a.user_id], {
        title: ueber ? 'Noch nicht zurueckgebracht?' : 'Bald zurueckbringen',
        body: `${a.menge} ${a.bestand?.einheit ?? ''} ${a.bestand?.name ?? ''}: faellig ${uhr(a.faellig_am)}. Schon zurueckgebracht? Dann bitte abhaken.`,
        url: `/app/p/${a.project_id}/ausleihen`,
        tag: `ausleihe-${a.id}`,
      }, vapid)
      ausleiher += n
      // Auch ohne Geraet als erinnert merken, sonst kommt dieselbe Zeile alle 30 Minuten wieder.
      await admin.from('ausleihen').update({ erinnert_am: iso(jetzt) }).eq('id', a.id)
    }

    // 2. Eskalation: seit 12 Stunden ueberfaellig, einmal an die Zustaendigen.
    const { data: spaet } = await admin
      .from('ausleihen')
      .select('id, project_id, user_id, menge, faellig_am, bestand:bestand_id(name, einheit, kategorie_id)')
      .is('zurueck_am', null)
      .is('eskaliert_am', null)
      .lt('faellig_am', iso(jetzt - 12 * 3600_000))
      .limit(200)
    for (const a of (spaet ?? []) as unknown as Array<{ id: string; project_id: string; user_id: string; menge: number; faellig_am: string; bestand: { name: string; einheit: string; kategorie_id: string | null } | null }>) {
      const wer = (await zustaendige(admin, a.project_id, a.bestand?.kategorie_id ?? null)).filter((u) => u !== a.user_id)
      const { data: profil } = await admin.from('profiles').select('display_name, email').eq('id', a.user_id).maybeSingle()
      const name = (profil as { display_name: string | null; email: string | null } | null)?.display_name || (profil as { email: string | null } | null)?.email || 'Jemand'
      eskaliert += await schicken(admin, wer, {
        title: 'Rueckgabe ueberfaellig',
        body: `${name} hat ${a.menge} ${a.bestand?.einheit ?? ''} ${a.bestand?.name ?? ''} noch nicht zurueckgebracht (faellig ${uhr(a.faellig_am)}).`,
        url: `/app/p/${a.project_id}/ausleihen`,
        tag: `spaet-${a.id}`,
      }, vapid)
      await admin.from('ausleihen').update({ eskaliert_am: iso(jetzt) }).eq('id', a.id)
    }

    // 3. Knapper Bestand: einmal pro Unterschreitung.
    const { data: wenig } = await admin
      .from('bestand')
      .select('id, project_id, kategorie_id, name, einheit, menge, mindestmenge')
      .not('knapp_seit', 'is', null)
      .is('knapp_push_am', null)
      .limit(200)
    for (const b of (wenig ?? []) as Array<{ id: string; project_id: string; kategorie_id: string | null; name: string; einheit: string; menge: number; mindestmenge: number }>) {
      const wer = await zustaendige(admin, b.project_id, b.kategorie_id)
      knapp += await schicken(admin, wer, {
        title: 'Es wird knapp',
        body: `${b.name}: nur noch ${Number(b.menge)} ${b.einheit} da (Mindestmenge ${Number(b.mindestmenge)}). Bitte nachholen.`,
        url: `/app/p/${b.project_id}/bestand`,
        tag: `knapp-${b.id}`,
      }, vapid)
      await admin.from('bestand').update({ knapp_push_am: iso(jetzt) }).eq('id', b.id)
    }

    return json({ ausleiher, eskaliert, knapp })
  } catch (err) {
    console.error('[erinnern]', err)
    return json({ error: 'serverfehler' }, 500)
  }
})
