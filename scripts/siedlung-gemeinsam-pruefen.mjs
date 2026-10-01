// Prueft die gemeinsame Siedlung (E86) ohne Datenbank und ohne Browser:
// - supabase/migrations/0046_siedlung_gemeinsam.sql: Tabellen, Schluessel,
//   Zeilen-Sicherheit (nur Lesen fuer Clients), die alten Bedingungen von
//   siedlungen_select bleiben, jede Funktion security definer mit festem
//   search_path, EXECUTE nur fuer authenticated, Grenzen (20 Gaeste, 30
//   Versuche je Stunde), Kennungen der Ablehnungen, Kanalregeln fuer
//   'siedlung:<id>', keine E-Mail und keine Kennung in einer Antwort,
// - der Vertrag in src/lib/types.ts (SiedlungEinladung, SiedlungMitglied)
//   passt zu dem, was die Datenbank zurueckgibt,
// - src/lib/api.ts ruft die Funktionen mit genau den Namen ihrer Parameter
//   auf und kennt dieselben Antworten,
// - nirgends ein langer Gedankenstrich, keine echten Kennungen oder
//   E-Mails in der Migration.
// Was die Regeln wirklich tun, zeigt der Probelauf auf der Datenbank
// (do-Block mit raise exception), nicht dieses Skript.
// Aufruf im Projektordner: node scripts/siedlung-gemeinsam-pruefen.mjs
// Ausgabe "ok" oder die abweichenden Faelle, Exit 1 bei Fehlern.
import { readdirSync, readFileSync } from 'node:fs'

const lesen = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const MIG = 'supabase/migrations/0046_siedlung_gemeinsam.sql'
const sql = lesen(MIG)
const typen = lesen('src/lib/types.ts')
const api = lesen('src/lib/api.ts')

let fehler = 0
function wahr(name, ist) {
  if (!ist) {
    console.log('ABWEICHUNG', name)
    fehler++
  }
}
function gleich(name, ist, soll) {
  const a = JSON.stringify(ist)
  const b = JSON.stringify(soll)
  if (a !== b) {
    console.log('ABWEICHUNG', name, 'ist', a, 'soll', b)
    fehler++
  }
}
const menge = (xs) => [...new Set(xs)].sort()
/** Leerraum zusammenfassen, damit Zeilenumbrueche keine Rolle spielen. */
const flach = (s) => s.replace(/\s+/g, ' ')
/** SQL ohne Kommentare (-- bis Zeilenende), fuer Pruefungen am Code. */
const code = sql.replace(/--[^\n]*/g, '')
const codeFlach = flach(code)

/** Rumpf einer Funktion (zwischen den beiden $fn$). */
function rumpf(name) {
  const m = code.match(new RegExp(`create function public\\.${name}\\(([^)]*)\\)([\\s\\S]*?)\\$fn\\$([\\s\\S]*?)\\$fn\\$`))
  return m ? { parameter: m[1], kopf: flach(m[2]), text: m[3] } : null
}

/* ------------------------------------------------------------ Grundsaetze */

wahr('Migration ohne langen Gedankenstrich', !sql.includes(String.fromCharCode(0x2014)))
wahr('api.ts ohne langen Gedankenstrich', !api.includes(String.fromCharCode(0x2014)))
wahr('Migration ohne Kennung (uuid)', !/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(sql))
wahr('Migration ohne E-Mail-Adresse', !/[\w.+-]+@[\w-]+\.[\w.]+/.test(sql))
wahr('Migration ohne service_role-Schluessel', !/eyJ[\w-]{10,}/.test(sql))
gleich(
  'genau eine Migration 0046',
  readdirSync(new URL('../supabase/migrations/', import.meta.url)).filter((f) => f.startsWith('0046_')),
  ['0046_siedlung_gemeinsam.sql'],
)
wahr('Kopf nennt E86', sql.startsWith('-- 0046: Die Siedlung gemeinsam (E86).'))

/* ---------------------------------------------------------------- Tabellen */

const mitglieder = codeFlach.match(/create table public\.siedlung_mitglieder \((.*?)\);/)?.[1] ?? ''
wahr('siedlung_mitglieder angelegt', mitglieder !== '')
wahr('siedlung_id verweist auf siedlungen, loescht mit', mitglieder.includes('siedlung_id uuid not null references public.siedlungen(id) on delete cascade'))
wahr('user_id verweist auf auth.users, loescht mit', mitglieder.includes('user_id uuid not null references auth.users(id) on delete cascade'))
wahr('eingeladen_von vorhanden', /eingeladen_von uuid/.test(mitglieder))
wahr('created_at vorhanden', mitglieder.includes('created_at timestamptz not null default now()'))
wahr('Primaerschluessel (siedlung_id, user_id)', mitglieder.includes('primary key (siedlung_id, user_id)'))
wahr('Bremse als eigene Tabelle', /create table public\.siedlung_einladeversuche \(/.test(code))

/* ------------------------------------------------------ Zeilen-Sicherheit */

wahr('RLS an siedlung_mitglieder', code.includes('alter table public.siedlung_mitglieder enable row level security;'))
wahr('RLS an siedlung_einladeversuche', code.includes('alter table public.siedlung_einladeversuche enable row level security;'))
const regelnMitglieder = [...code.matchAll(/create policy (\w+) on public\.siedlung_mitglieder for (\w+)/g)].map((m) => `${m[1]}:${m[2]}`)
gleich('siedlung_mitglieder: nur eine Regel, nur Lesen', regelnMitglieder, ['siedlung_mitglieder_select:select'])
wahr('keine Regel an siedlung_einladeversuche', !/create policy \w+ on public\.siedlung_einladeversuche/.test(code))
const regelMitglieder = codeFlach.match(/create policy siedlung_mitglieder_select .*?\)\)\);/)?.[0] ?? ''
wahr('Gast sieht eigene Zeile', regelMitglieder.includes('user_id = auth.uid()'))
wahr('Besitzer sieht Zeilen seiner Siedlung', regelMitglieder.includes('s.id = siedlung_mitglieder.siedlung_id and s.owner_id = auth.uid()'))
wahr('Lesen nur freigeschaltet', regelMitglieder.includes('public.ist_freigegeben() and'))
wahr('Clients schreiben nicht direkt', code.includes('revoke insert, update, delete, truncate, references, trigger on public.siedlung_mitglieder from authenticated;'))
wahr('anon hat keinen Zugriff auf siedlung_mitglieder', code.includes('revoke all on public.siedlung_mitglieder from public, anon;'))
wahr('Bremse fuer niemanden lesbar', code.includes('revoke all on public.siedlung_einladeversuche from public, anon, authenticated;'))

// siedlungen_select: neu angelegt, alte Bedingungen aus 0044 bleiben.
const alt = flach(lesen('supabase/migrations/0044_siedlungen.sql').replace(/--[^\n]*/g, ''))
const altRegel = alt.match(/create policy siedlungen_select on public\.siedlungen for select to authenticated using \((.*?)\);/)?.[1] ?? ''
const neuRegel = codeFlach.match(/create policy siedlungen_select on public\.siedlungen for select to authenticated using \((.*?)\);/)?.[1] ?? ''
wahr('siedlungen_select vorher geloescht', code.includes('drop policy siedlungen_select on public.siedlungen;'))
wahr('alte Regel aus 0044 gefunden', altRegel.includes('owner_id = auth.uid()'))
/** Teilt eine Bedingung an den "or" der obersten Klammerebene. */
function oderTeile(s) {
  const teile = []
  let tiefe = 0
  let start = 0
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') tiefe++
    else if (s[i] === ')') tiefe--
    else if (tiefe === 0 && s.startsWith(' or ', i)) {
      teile.push(s.slice(start, i).trim())
      start = i + 4
    }
  }
  teile.push(s.slice(start).trim())
  return teile.map((t) => t.replace(/\( /g, '(').replace(/ \)/g, ')'))
}
const altTeile = oderTeile(altRegel)
const neuTeile = oderTeile(neuRegel)
gleich('alte Regel hat zwei Teile', altTeile.length, 2)
for (const teil of altTeile) wahr(`alte Bedingung bleibt unveraendert: ${teil.slice(0, 50)}`, neuTeile.includes(teil))
gleich('neu: genau ein Teil dazu, Besitzer und Gaeste ueber siedlung_darf', neuTeile.filter((t) => !altTeile.includes(t)), ['public.siedlung_darf(id)'])
wahr('die anderen Regeln von siedlungen bleiben unberuehrt', !/(drop|alter) policy siedlungen_(insert|update|delete)/.test(code))

/* -------------------------------------------------------------- Funktionen */

const FUNKTIONEN = {
  siedlung_darf: ['p_siedlung uuid'],
  siedlung_einladen: ['p_siedlung uuid', 'p_wer text'],
  siedlung_mitglieder_liste: ['p_siedlung uuid'],
  siedlung_entfernen: ['p_siedlung uuid', 'p_user uuid'],
}
const rumpfe = {}
for (const [name, parameter] of Object.entries(FUNKTIONEN)) {
  const r = rumpf(name)
  rumpfe[name] = r
  wahr(`${name} angelegt`, !!r)
  if (!r) continue
  gleich(`${name}: Parameter`, r.parameter.split(',').map((s) => s.trim()), parameter)
  wahr(`${name}: security definer`, r.kopf.includes('security definer'))
  wahr(`${name}: search_path = public`, r.kopf.includes('set search_path = public'))
}
wahr('siedlung_darf ist stable', rumpfe.siedlung_darf?.kopf.includes('stable'))
wahr('siedlung_darf verlangt Freigabe', rumpfe.siedlung_darf?.text.includes('public.ist_freigegeben() and exists'))
wahr('siedlung_darf: Besitzer', rumpfe.siedlung_darf?.text.includes('s.owner_id = auth.uid()'))
wahr('siedlung_darf: Gast', /m\.siedlung_id = s\.id and m\.user_id = auth\.uid\(\)/.test(rumpfe.siedlung_darf?.text ?? ''))

const signaturen = Object.entries(FUNKTIONEN).map(([n, p]) => `public.${n}(${p.map((x) => x.split(' ')[1]).join(', ')})`)
const revoke = codeFlach.match(/revoke execute on function (.*?) from (.*?);/)
gleich('EXECUTE entzogen fuer', revoke ? revoke[1].split(/,\s*(?=public\.)/).map((s) => s.trim()) : [], signaturen)
gleich('EXECUTE entzogen von', revoke ? revoke[2].split(',').map((s) => s.trim()) : [], ['public', 'anon', 'service_role'])
const grant = codeFlach.match(/grant execute on function (.*?) to (.*?);/)
gleich('EXECUTE erlaubt fuer', grant ? grant[1].split(/,\s*(?=public\.)/).map((s) => s.trim()) : [], signaturen)
gleich('EXECUTE erlaubt an', grant ? grant[2].trim() : '', 'authenticated')

/* --------------------------------------------------- Einladen im Einzelnen */

const ein = rumpfe.siedlung_einladen?.text ?? ''
const einFlach = flach(ein)
wahr('Einladen: nur angemeldet', einFlach.includes("if v_uid is null then raise exception 'Nicht angemeldet' using errcode = '42501';"))
wahr('Einladen: nur freigeschaltet', einFlach.includes("hint = 'kistly:konto.nicht_frei'"))
wahr('Einladen: nur der Besitzer', einFlach.includes('s.id = p_siedlung and s.owner_id = v_uid'))
wahr('Einladen: Eingabe getrimmt', ein.includes("btrim(coalesce(p_wer, ''))"))
wahr('Einladen: E-Mail erkannt am @', ein.includes("position('@' in v_wer) > 0"))
wahr('Einladen: E-Mail ohne Gross und Klein, genau', ein.includes('lower(u.email) = lower(v_wer)'))
wahr('Einladen: Name ohne Gross und Klein, genau', ein.includes('lower(btrim(p.display_name)) = lower(v_wer)'))
wahr('Einladen: keine geloeschten oder anonymen Konten', (ein.match(/u\.deleted_at is null/g) ?? []).length === 2 && (ein.match(/not coalesce\(u\.is_anonymous, false\)/g) ?? []).length === 2)
wahr('Einladen: hoechstens 20 Gaeste', /where m\.siedlung_id = p_siedlung\) >= 20 then/.test(einFlach))
wahr('Einladen: Bremse 30 je Stunde', einFlach.includes("v.am > now() - interval '1 hour') >= 30 then"))
wahr('Einladen: Bremse zaehlt jeden Versuch vor der Suche', ein.indexOf('insert into public.siedlung_einladeversuche') < ein.indexOf("position('@' in v_wer)"))
wahr('Einladen: Bremse vor dem Eintrag geprueft', ein.indexOf('>= 30 then') < ein.indexOf('insert into public.siedlung_einladeversuche'))
wahr('Einladen: Besitzerpruefung vor der Bremse', ein.indexOf('s.owner_id = v_uid') < ein.indexOf('>= 30 then'))
wahr('Einladen: alte Versuche werden weggeraeumt', einFlach.includes("v.am < now() - interval '1 day'"))
wahr('Einladen: gleichzeitige Aufrufe hintereinander', ein.includes('pg_advisory_xact_lock('))

// Antworten: nur status und name, nie E-Mail oder Kennung.
/** Teilt die Argumente einer Klammer an den Kommas der obersten Ebene. */
function argumente(s) {
  const teile = []
  let tiefe = 0
  let start = 0
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') tiefe++
    else if (s[i] === ')') tiefe--
    else if (s[i] === ',' && tiefe === 0) {
      teile.push(s.slice(start, i).trim())
      start = i + 1
    }
  }
  teile.push(s.slice(start).trim())
  return teile
}
const antworten = [...ein.matchAll(/jsonb_build_object\(([^;]*?)\);/g)].map((m) => argumente(m[1]))
wahr('Einladen: Antworten gefunden', antworten.length >= 5)
wahr('Einladen: jede Antwort Schluessel und Wert paarweise', antworten.every((a) => a.length % 2 === 0))
const schluessel = menge(antworten.flatMap((a) => a.filter((_, i) => i % 2 === 0)))
gleich('Einladen: Schluessel der Antworten', schluessel, ["'name'", "'status'"])
wahr('Einladen: keine E-Mail oder Kennung in einer Antwort', antworten.every((a) => !/email|v_ziel|v_treffer|v_uid|\.id\b/.test(a.join(','))))
const statusSql = menge(
  antworten.flatMap((a) => {
    const i = a.indexOf("'status'")
    return i < 0 ? [] : [...a[i + 1].matchAll(/'(\w+)'/g)].map((m) => m[1])
  }),
)

// Der Vertrag in types.ts
const vertragEinladung = flach(typen.match(/export type SiedlungEinladung =([\s\S]*?)\n\n|export type SiedlungEinladung =([\s\S]*)$/)?.[0] ?? '')
const statusTypen = menge([...vertragEinladung.matchAll(/'(\w+)'/g)].map((m) => m[1]))
gleich('Antworten der Datenbank = SiedlungEinladung', statusSql, statusTypen)
gleich('SiedlungEinladung kennt genau diese Antworten', statusTypen, menge(['ok', 'nicht_gefunden', 'mehrdeutig', 'schon_drin', 'selbst', 'zu_viele']))
wahr('ok traegt den Namen', /\{ status: 'ok'; name: string \}/.test(vertragEinladung))

/* -------------------------------------------------------- Mitgliederliste */

const liste = rumpfe.siedlung_mitglieder_liste
const spaltenSql = (code.match(/create function public\.siedlung_mitglieder_liste\(p_siedlung uuid\)\s*returns table \(([^)]*)\)/)?.[1] ?? '')
  .split(',')
  .map((s) => s.trim().split(' ')[0])
const vertragMitglied = typen.match(/export interface SiedlungMitglied \{([\s\S]*?)\}/)?.[1] ?? ''
const felder = [...vertragMitglied.matchAll(/^\s*(\w+):/gm)].map((m) => m[1])
gleich('Spalten der Liste = SiedlungMitglied', spaltenSql, felder)
const rollenTypen = menge([...(vertragMitglied.match(/rolle: ([^\n]*)/)?.[1] ?? '').matchAll(/'(\w+)'/g)].map((m) => m[1]))
const rollenSql = menge([...(liste?.text ?? '').matchAll(/'(\w+)'::text/g)].map((m) => m[1]))
gleich('Rollen der Liste = SiedlungMitglied.rolle', rollenSql, rollenTypen)
wahr('Liste: Besitzer zuerst', /order by x\.reihe, x\.seit/.test(liste?.text ?? '') && /'besitzer'::text as art, 0 as reihe/.test(liste?.text ?? ''))
wahr('Liste: nur mit siedlung_darf, sonst Ablehnung', flach(liste?.text ?? '').includes("if not public.siedlung_darf(p_siedlung) then raise exception"))
wahr('Liste: Name sonst Gast', (liste?.text ?? '').includes("coalesce(nullif(btrim(p.display_name), ''), 'Gast')"))
wahr('Liste: keine E-Mail', !/email/.test(liste?.text ?? ''))

/* --------------------------------------------------------------- Entfernen */

const weg = flach(rumpfe.siedlung_entfernen?.text ?? '')
wahr('Entfernen: fremde Person nur durch den Besitzer', weg.includes('if p_user is distinct from v_uid and not ( public.ist_freigegeben() and exists (select 1 from public.siedlungen s where s.id = p_siedlung and s.owner_id = v_uid) )'))
wahr('Entfernen: nichts geloescht ist ein Fehler', weg.includes('if not found then raise exception'))

/* -------------------------------------------------------- Kennungen (hint) */

const kennungen = menge([...code.matchAll(/hint = 'kistly:(siedlung\.\w+)'/g)].map((m) => m[1]))
gleich('Kennungen der Ablehnungen', kennungen, ['siedlung.kein_zugriff', 'siedlung.nicht_drin', 'siedlung.nur_besitzer', 'siedlung.zu_oft'])

/* ---------------------------------------------------------------- Realtime */

for (const [name, art, klausel] of [
  ['siedlung_live_lesen', 'select', 'using'],
  ['siedlung_live_senden', 'insert', 'with check'],
]) {
  const r = codeFlach.match(new RegExp(`create policy ${name} on realtime\\.messages for ${art} to authenticated ${klausel} \\((.*?)\\);`))?.[1] ?? ''
  wahr(`${name} angelegt`, r !== '')
  wahr(`${name}: vorher geloescht`, code.includes(`drop policy if exists ${name} on realtime.messages;`))
  wahr(`${name}: broadcast und presence`, r.includes("realtime.messages.extension in ('broadcast', 'presence')"))
  wahr(`${name}: Kanal siedlung:`, r.includes("split_part(realtime.topic(), ':', 1) = 'siedlung'"))
  wahr(`${name}: siedlung_darf ueber try_uuid`, r.includes("public.siedlung_darf(public.try_uuid(split_part(realtime.topic(), ':', 2)))"))
}
wahr('Kanaele der Wohnung (0043) bleiben unberuehrt', !/wohnung_live_/.test(code))

/* ------------------------------------------------------------------ api.ts */

const e86 = api.slice(api.indexOf('Siedlung gemeinsam (E86)'))
wahr('api.ts: Abschnitt E86 am Ende', api.indexOf('Siedlung gemeinsam (E86)') > api.indexOf('export async function siedlungImportieren'))
const aufrufe = Object.fromEntries(
  [...e86.matchAll(/supabase\.rpc\('(\w+)', \{([^}]*)\}\)/g)].map((m) => [
    m[1],
    [...m[2].matchAll(/(\w+):/g)].map((x) => x[1]),
  ]),
)
gleich('api.ts ruft genau diese Funktionen', Object.keys(aufrufe).sort(), ['siedlung_einladen', 'siedlung_entfernen', 'siedlung_mitglieder_liste'])
for (const [name, parameter] of Object.entries(aufrufe)) {
  gleich(`api.ts: Parameter von ${name}`, parameter, (FUNKTIONEN[name] ?? []).map((p) => p.split(' ')[0]))
}
wahr('api.ts: siedlungEinladen', /export async function siedlungEinladen\(siedlungId: string, wer: string\): Promise<SiedlungEinladungAntwort>/.test(e86))
wahr('api.ts: siedlungMitglieder', /export async function siedlungMitglieder\(siedlungId: string\): Promise<SiedlungMitgliedZeile\[\]>/.test(e86))
wahr('api.ts: siedlungEntfernen', /export async function siedlungEntfernen\(siedlungId: string, userId: string\): Promise<void>/.test(e86))
const andere = menge([...(e86.match(/const EINLADUNG_ANDERE[^=]*= \[([^\]]*)\]/)?.[1] ?? '').matchAll(/'(\w+)'/g)].map((m) => m[1]))
gleich('api.ts kennt dieselben Antworten', menge(['ok', ...andere]), statusTypen)
gleich('api.ts: Fehler ueber errText', (e86.match(/if \(res\.error\) throw new Error\(errText\(res\.error\)\)/g) ?? []).length, 3)
wahr('api.ts: unbekannte Antwort wird nicht geschluckt', e86.includes("throw new Error(tg('zustand.unbekannter_fehler'))"))

if (fehler) {
  console.log(`${fehler} Abweichung(en)`)
  process.exit(1)
}
console.log('ok')
