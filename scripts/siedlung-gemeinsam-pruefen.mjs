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
// Dazu die Nacharbeit E87b (supabase/migrations/0048_siedlung_nacharbeit.sql):
// - wer im Umzug der eigenen Wohnung ist, darf hinein wie ein Gast (dieselbe
//   Bedingung wie siedlungen_select aus 0044), steht mit Rolle 'umzug' in
//   der Liste (nicht Besitzer, nicht Gast), Einladen sagt 'schon_drin';
//   alles, was 0046 fuer Einladen, Liste und Herausnehmen zusichert, gilt
//   fuer die neuen Fassungen weiter; EXECUTE nur fuer authenticated,
// - api.ts gegen ein erfundenes Supabase: "Aus Datei aktualisieren" ersetzt
//   genau die eigene Siedlung (ersetzeId) und legt nie eine zweite an, die
//   Rolle 'umzug' kommt an, siedlungDingeZuruecksetzen ruft mit den
//   richtigen Namen und meldet jede kaputte Antwort.
// Was die Regeln wirklich tun, zeigt der Probelauf auf der Datenbank
// (do-Block mit raise exception), nicht dieses Skript.
// Aufruf im Projektordner: node scripts/siedlung-gemeinsam-pruefen.mjs
// Ausgabe "ok" oder die abweichenden Faelle, Exit 1 bei Fehlern.
import { readdirSync, readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createServer } from 'vite'

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
gleich('Rollen der Liste (0046) = SiedlungMitglied.rolle ohne umzug (kommt mit 0048)', rollenSql, rollenTypen.filter((r) => r !== 'umzug'))
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

// Nur der Abschnitt E86 (bis zum Abschnitt E87 mit den Dingen).
const e86 = api.slice(api.indexOf('Siedlung gemeinsam (E86)'), api.indexOf('Siedlung E87 (0047)'))
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

/* ================================================== 0048 (E87b) */

const MIG48 = 'supabase/migrations/0048_siedlung_nacharbeit.sql'
const sql48 = lesen(MIG48)
const code48 = sql48.replace(/--[^\n]*/g, '')
const flach48 = flach(code48)
/** Wie oderTeile: Leerraum an Klammern weg, damit Texte vergleichbar sind. */
const norm = (s) => flach(s).replace(/\( /g, '(').replace(/ \)/g, ')').trim()

wahr('0048 ohne langen Gedankenstrich', !sql48.includes(String.fromCharCode(0x2014)))
wahr('0048 ohne Kennung (uuid)', !/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(sql48))
wahr('0048 ohne E-Mail-Adresse', !/[\w.+-]+@[\w-]+\.[\w.]+/.test(sql48))
wahr('0048 ohne service_role-Schluessel', !/eyJ[\w-]{10,}/.test(sql48))
gleich('genau eine Migration 0048', readdirSync(new URL('../supabase/migrations/', import.meta.url)).filter((f) => f.startsWith('0048_')), ['0048_siedlung_nacharbeit.sql'])
wahr('0048: Kopf nennt E87b', sql48.startsWith('-- 0048: Nacharbeit an der Siedlung nach der Pruefung (E87b).'))
{
  const ohneRuempfe = code48.replace(/\$fn\$[\s\S]*?\$fn\$/g, '')
  wahr('0048: im Probelauf unveraendert einsetzbar (kein $$, kein begin/commit, kein nacktes select)', !code48.includes('$$') && !/^\s*(begin|commit)\s*;/im.test(ohneRuempfe) && !/^\s*select\b/im.test(ohneRuempfe))
  wahr('0048: aendert keine Regel und nur die Tabelle siedlung_dinge', !/(create|drop|alter) policy/i.test(code48) && [...code48.matchAll(/alter table (\S+)/g)].every((m) => m[1] === 'public.siedlung_dinge'))
}

/** Rumpf einer Funktion in 0048 (create oder create or replace). */
function rumpf48(name) {
  const m = code48.match(new RegExp(`create (?:or replace )?function public\\.${name}\\(([^)]*)\\)([\\s\\S]*?)\\$fn\\$([\\s\\S]*?)\\$fn\\$`))
  return m ? { parameter: m[1], kopf: flach(m[2]), text: m[3] } : null
}
const SETZEN_PARAMETER = ['p_siedlung uuid', 'p_ding text', 'p_art text', 'p_x float8', 'p_y float8', 'p_z float8', 'p_gier float8', 'p_ebene text']
const FUNKTIONEN48 = {
  siedlung_darf: FUNKTIONEN.siedlung_darf,
  siedlung_darf_alle: [],
  siedlung_ding_setzen: SETZEN_PARAMETER,
  siedlung_dinge_zuruecksetzen: ['p_siedlung uuid', 'p_ding text default null'],
  siedlung_mitglieder_liste: FUNKTIONEN.siedlung_mitglieder_liste,
  siedlung_einladen: FUNKTIONEN.siedlung_einladen,
  siedlung_entfernen: FUNKTIONEN.siedlung_entfernen,
}
const r48 = {}
for (const [name, parameter] of Object.entries(FUNKTIONEN48)) {
  const r = rumpf48(name)
  r48[name] = r
  wahr(`0048: ${name} angelegt`, !!r)
  if (!r) continue
  gleich(`0048: ${name}: Parameter (gleich wie vorher)`, r.parameter.split(',').map((s) => s.trim()).filter(Boolean), parameter)
  wahr(`0048: ${name}: security definer`, r.kopf.includes('security definer'))
  wahr(`0048: ${name}: search_path = public`, r.kopf.includes('set search_path = public'))
}
gleich('0047: siedlung_ding_setzen hatte dieselben Parameter', flach(lesen('supabase/migrations/0047_siedlung_stadt_dinge.sql').match(/create function public\.siedlung_ding_setzen\(([^)]*)\)/)?.[1] ?? '').split(',').map((s) => s.trim()), SETZEN_PARAMETER)
{
  const signaturen = Object.entries(FUNKTIONEN48).map(([n, p]) => `public.${n}(${p.map((x) => x.split(' ')[1]).join(', ')})`)
  const rv = flach48.match(/revoke execute on function (.*?) from (.*?);/)
  gleich('0048: EXECUTE entzogen fuer', rv ? rv[1].split(/,\s*(?=public\.)/).map((s) => s.trim()) : [], signaturen)
  gleich('0048: EXECUTE entzogen von', rv ? rv[2].split(',').map((s) => s.trim()) : [], ['public', 'anon', 'service_role'])
  const gr = flach48.match(/grant execute on function (.*?) to (.*?);/)
  gleich('0048: EXECUTE erlaubt fuer', gr ? gr[1].split(/,\s*(?=public\.)/).map((s) => s.trim()) : [], signaturen)
  gleich('0048: EXECUTE erlaubt an', gr ? gr[2].trim() : '', 'authenticated')
}

// Wer darf hinein: Besitzer und Gast wie 0046, dazu der Umzug der eigenen
// Wohnung mit derselben Bedingung wie siedlungen_select (0044).
{
  const darf = norm(r48.siedlung_darf?.text ?? '')
  const umzug = norm(altTeile[1] ?? '').replace('siedlungen.wohnung', 's.wohnung')
  wahr('0048: siedlung_darf verlangt Freigabe', darf.includes('public.ist_freigegeben() and exists'))
  wahr('0048: siedlung_darf: Besitzer', darf.includes('s.owner_id = auth.uid()'))
  wahr('0048: siedlung_darf: Gast', /m\.siedlung_id = s\.id and m\.user_id = auth\.uid\(\)/.test(darf))
  wahr(`0048: siedlung_darf: Umzug wie siedlungen_select (${umzug.slice(0, 60)})`, umzug.includes('is_member(g.project_id)') && darf.includes(umzug))
  wahr('0048: siedlung_darf ist stable', r48.siedlung_darf?.kopf.includes('stable'))
  const alle = norm(r48.siedlung_darf_alle?.text ?? '')
  gleich('0048: siedlung_darf_alle in drei Teilen', alle.split(' union ').length, 3)
  wahr('0048: siedlung_darf_alle: Besitzer und Gast nur freigeschaltet', alle.includes('s.owner_id = auth.uid() and public.ist_freigegeben()') && alle.includes('m.user_id = auth.uid() and public.ist_freigegeben()'))
  wahr('0048: siedlung_darf_alle: Umzug ueber is_member', alle.includes("join public.grundrisse g on g.id = public.try_uuid(s.wohnung ->> 'grundrissId') where public.is_member(g.project_id)"))
}

// Liste: Rollen wie der Vertrag, Umzug ohne Besitzer und ohne Gaeste.
{
  const liste48 = r48.siedlung_mitglieder_liste?.text ?? ''
  const f = norm(liste48)
  gleich('0048: Rollen der Liste = SiedlungMitglied.rolle', menge([...liste48.matchAll(/'(\w+)'::text/g)].map((m) => m[1])), rollenTypen)
  gleich('0048: Spalten der Liste = SiedlungMitglied', (code48.match(/function public\.siedlung_mitglieder_liste\(p_siedlung uuid\)\s*returns table \(([^)]*)\)/)?.[1] ?? '').split(',').map((s) => s.trim().split(' ')[0]), felder)
  wahr('0048: Liste: Besitzer zuerst, dann Gaeste, dann Umzug', /'besitzer'::text as art, 0 as reihe/.test(liste48) && /'gast'::text, 1,/.test(liste48) && /'umzug'::text, 2,/.test(liste48) && /order by x\.reihe, x\.seit/.test(liste48))
  wahr('0048: Liste: Umzug nicht der Besitzer', f.includes('pm.user_id <> s.owner_id'))
  wahr('0048: Liste: Umzug nicht, wer schon Gast ist', f.includes('not exists (select 1 from public.siedlung_mitglieder m2 where m2.siedlung_id = s.id and m2.user_id = pm.user_id)'))
  wahr('0048: Liste: nur mit siedlung_darf, sonst Ablehnung', f.includes('if not public.siedlung_darf(p_siedlung) then raise exception'))
  wahr('0048: Liste: Name sonst Gast, keine E-Mail', liste48.includes("coalesce(nullif(btrim(p.display_name), ''), 'Gast')") && !/email/.test(liste48))
}

// Einladen: alles aus 0046 bleibt, Umzug ist schon drin.
{
  const e48 = r48.siedlung_einladen?.text ?? ''
  const ef = flach(e48)
  const alt = rumpfe.siedlung_einladen?.text ?? ''
  // Jede Zeile der alten Fassung steht unveraendert in der neuen.
  const fehlend = alt.split('\n').map((z) => z.trim()).filter(Boolean).filter((z) => !e48.split('\n').map((x) => x.trim()).includes(z))
  gleich('0048: Einladen enthaelt jede Zeile von 0046', fehlend, [])
  wahr('0048: Einladen: Umzug der eigenen Wohnung ist schon_drin', ef.includes("join public.project_members pm on pm.project_id = g.project_id where s.id = p_siedlung and pm.user_id = v_ziel ) then return jsonb_build_object('status', 'schon_drin');"))
  wahr('0048: Einladen: Umzug geprueft vor der Grenze von 20', e48.indexOf('pm.user_id = v_ziel') > 0 && e48.indexOf('pm.user_id = v_ziel') < e48.indexOf('>= 20 then'))
  const antworten48 = [...e48.matchAll(/jsonb_build_object\(([^;]*?)\);/g)].map((m) => argumente(m[1]))
  gleich('0048: Einladen: Schluessel der Antworten', menge(antworten48.flatMap((a) => a.filter((_, i) => i % 2 === 0))), ["'name'", "'status'"])
  wahr('0048: Einladen: keine E-Mail oder Kennung in einer Antwort', antworten48.every((a) => !/email|v_ziel|v_treffer|v_uid|\.id\b/.test(a.join(','))))
  gleich(
    '0048: Einladen: Antworten = SiedlungEinladung',
    menge(antworten48.flatMap((a) => {
      const i = a.indexOf("'status'")
      return i < 0 ? [] : [...a[i + 1].matchAll(/'(\w+)'/g)].map((m) => m[1])
    })),
    statusTypen,
  )
}

// Herausnehmen: wie 0046, dazu die Dinge des Gastes.
{
  const w48 = flach(r48.siedlung_entfernen?.text ?? '')
  wahr('0048: Entfernen: fremde Person nur durch den Besitzer', w48.includes('if p_user is distinct from v_uid and not ( public.ist_freigegeben() and exists (select 1 from public.siedlungen s where s.id = p_siedlung and s.owner_id = v_uid) )'))
  wahr('0048: Entfernen: nur aus siedlung_mitglieder, nichts geloescht ist ein Fehler', w48.includes('delete from public.siedlung_mitglieder m where m.siedlung_id = p_siedlung and m.user_id = p_user; if not found then raise exception'))
  wahr('0048: Entfernen: danach die Dinge, die die Person als Erste hingestellt hat', w48.indexOf('if not found then') < w48.indexOf('delete from public.siedlung_dinge d where d.siedlung_id = p_siedlung and d.erstellt_von = p_user;'))
}
gleich(
  '0048: Kennungen der Ablehnungen',
  menge([...code48.matchAll(/hint = 'kistly:(\w+\.\w+)'/g)].map((m) => m[1])),
  ['konto.nicht_frei', 'siedlung.ding_ungueltig', 'siedlung.kein_zugriff', 'siedlung.nicht_drin', 'siedlung.nur_besitzer', 'siedlung.zu_oft', 'siedlung.zu_viele_dinge', 'siedlung.zu_viele_eigene_dinge'],
)
gleich('api.ts: Rollen der Mitglieder = SiedlungMitglied.rolle', menge([...(e86.match(/const MITGLIED_ROLLEN[^=]*= \[([^\]]*)\]/)?.[1] ?? '').matchAll(/'(\w+)'/g)].map((m) => m[1])), rollenTypen)

/* ======================================= api.ts mit erfundenem Supabase */

// supabase.ts wird beim Laden durch ein Modul ersetzt, das jede Anfrage
// mitschreibt und die Antwort aus antwort() holt. Alle Kennungen erfunden.
const ICH = '00000000-0000-4000-8000-0000000000a1'
const FREMD = '00000000-0000-4000-8000-0000000000b2'
const ZIEL = '00000000-0000-4000-8000-0000000000c3'
const ANDERE = '00000000-0000-4000-8000-0000000000d4'
const GRUNDRISS = '00000000-0000-4000-8000-0000000000e5'
const falsch = { uid: ICH, aufrufe: [], antwort: () => ({ data: null, error: null }) }
function anfrage(tabelle) {
  const q = { tabelle, art: 'select', werte: null, filter: [] }
  const fertig = (ende) => {
    q.ende = ende
    falsch.aufrufe.push(q)
    return Promise.resolve(falsch.antwort(q))
  }
  const kette = {
    select() {
      return kette
    },
    insert(w) {
      q.art = 'insert'
      q.werte = w
      return kette
    },
    update(w) {
      q.art = 'update'
      q.werte = w
      return kette
    },
    delete() {
      q.art = 'delete'
      return kette
    },
    eq(k, v) {
      q.filter.push([k, v])
      return kette
    },
    order() {
      return kette
    },
    range() {
      return kette
    },
    maybeSingle: () => fertig('maybeSingle'),
    single: () => fertig('single'),
    then: (gut, schlecht) => fertig('liste').then(gut, schlecht),
  }
  return kette
}
globalThis.__falschesSupabase48 = {
  auth: { getUser: async () => ({ data: { user: falsch.uid ? { id: falsch.uid } : null }, error: null }) },
  from: (t) => anfrage(t),
  rpc: async (name, args) => {
    const q = { rpc: name, args }
    falsch.aufrufe.push(q)
    return falsch.antwort(q)
  },
}
const vite = await createServer({
  cacheDir: path.join(os.tmpdir(), 'kistly-siedlung-gemeinsam-pruefen'),
  server: { middlewareMode: true, hmr: false, ws: false },
  appType: 'custom',
  logLevel: 'error',
  optimizeDeps: { noDiscovery: true, include: [] },
  plugins: [
    {
      name: 'falsches-supabase',
      enforce: 'pre',
      load(id) {
        if (id.replace(/\\/g, '/').endsWith('/src/lib/supabase.ts')) {
          return 'export const configError = null\nexport const supabase = globalThis.__falschesSupabase48\nexport function errText(e) { return (e && (e.message || e.hint)) || "?" }\n'
        }
        return null
      },
    },
  ],
})
let API
let I18N
try {
  API = await vite.ssrLoadModule('/src/lib/api.ts')
  I18N = await vite.ssrLoadModule('/src/lib/i18n/index.tsx')
} finally {
  await vite.close()
}
const tg = I18N.tg
const zeile = (id, owner, wohnung = null) => ({ id, owner_id: owner, name: 'Erfundene Siedlung', lat: 0.5, lon: 0.5, gebaeude: [], wohnung, aussen: {}, created_at: '2026-01-01', updated_at: '2026-01-01' })
const DATEI = {
  siedlung: { name: 'Erfundene Siedlung', lat: 0.5, lon: 0.5, gebaeude: [], wohnung: null, aussen: { spielplatz: null, tiefgarage: null, wege: [] }, innen: null },
  deko: null,
}
const mitWohnung = { ...DATEI, siedlung: { ...DATEI.siedlung, wohnung: { grundrissId: GRUNDRISS, gebaeudeId: 'h1', geschoss: 0, x: 0, z: 0, drehung: 0 } } }
/** Fuehrt fn mit einer Antwort-Regel aus; gibt Ergebnis oder Fehler und die Aufrufe zurueck. */
async function mit(antwort, fn, uid = ICH) {
  falsch.aufrufe = []
  falsch.antwort = antwort
  falsch.uid = uid
  try {
    return { ok: await fn(), aufrufe: falsch.aufrufe }
  } catch (e) {
    return { fehler: e instanceof Error ? e.message : String(e), aufrufe: falsch.aufrufe }
  }
}
const schreibt = (r) => r.aufrufe.filter((q) => q.art === 'insert' || q.art === 'update').map((q) => `${q.art}:${q.filter.map((f) => f.join('=')).join(',')}`)
/** Datenbank mit Siedlungen (id -> Zeile); update trifft nur vorhandene. */
const db = (zeilen, weg = new Set()) => (q) => {
  if (q.tabelle !== 'siedlungen') return { data: null, error: null }
  const id = q.filter.find((f) => f[0] === 'id')?.[1]
  if (q.art === 'select' && q.ende === 'liste') return { data: Object.values(zeilen), error: null }
  if (q.art === 'select') return { data: zeilen[id] ? { id, owner_id: zeilen[id].owner_id } : null, error: null }
  if (q.art === 'update') return { data: zeilen[id] && !weg.has(id) ? zeilen[id] : null, error: null }
  if (q.art === 'insert') return { data: zeile('00000000-0000-4000-8000-0000000000f6', ICH), error: null }
  return { data: null, error: null }
}
const nichtErsetzt = (grund) => tg('fehler.siedlung_ersetzen', { grund })
{
  const zeilen = { [ZIEL]: zeile(ZIEL, ICH), [ANDERE]: zeile(ANDERE, FREMD), [GRUNDRISS]: undefined }
  delete zeilen[GRUNDRISS]
  let r = await mit(db(zeilen), () => API.siedlungImportieren(DATEI, { ersetzeId: ZIEL }))
  gleich('Import mit ersetzeId: genau die eigene Siedlung, auch ohne Wohnung', [r.ok?.siedlung.id, r.fehler ?? null, schreibt(r)], [ZIEL, null, [`update:id=${ZIEL}`]])
  r = await mit(db(zeilen), () => API.siedlungImportieren(mitWohnung, { ersetzeId: ZIEL }))
  gleich('Import mit ersetzeId: Wohnung der Datei entscheidet nicht', [r.ok?.siedlung.id, schreibt(r)], [ZIEL, [`update:id=${ZIEL}`]])
  r = await mit(db(zeilen), () => API.siedlungImportieren(DATEI, { ersetzeId: ANDERE }))
  gleich('Import mit fremder ersetzeId: Fehler, nichts geschrieben', [r.fehler, schreibt(r)], [nichtErsetzt(tg('fehler.db.siedlung.nur_besitzer')), []])
  r = await mit(db(zeilen), () => API.siedlungImportieren(DATEI, { ersetzeId: '00000000-0000-4000-8000-000000000999' }))
  gleich('Import mit verschwundener ersetzeId: Fehler, keine zweite Siedlung', [r.fehler, schreibt(r)], [nichtErsetzt(tg('zustand.nichts_gefunden')), []])
  r = await mit(db(zeilen), () => API.siedlungImportieren(DATEI, { ersetzeId: 'kaputt' }))
  gleich('Import mit kaputter ersetzeId: Fehler ohne Anfrage', [r.fehler, r.aufrufe.length], [nichtErsetzt(tg('zustand.nichts_gefunden')), 0])
  r = await mit(db(zeilen, new Set([ZIEL])), () => API.siedlungImportieren(DATEI, { ersetzeId: ZIEL }))
  gleich('Import: Ziel waehrenddessen weg: Fehler, kein Neuanlegen', [r.fehler, schreibt(r)], [tg('zustand.nichts_gefunden'), [`update:id=${ZIEL}`]])
  r = await mit(db(zeilen), () => API.siedlungImportieren(DATEI, { ersetzeId: ZIEL }), null)
  gleich('Import mit ersetzeId ohne Anmeldung: Fehler, nichts geschrieben', [typeof r.fehler, schreibt(r)], ['string', []])
  // Ohne ersetzeId (erstes Laden): wie bisher ueber die Wohnung.
  const mitPlan = { ...zeilen, [ZIEL]: zeile(ZIEL, ICH, { grundrissId: GRUNDRISS }), [ANDERE]: zeile(ANDERE, FREMD, { grundrissId: GRUNDRISS }) }
  r = await mit(db(mitPlan), () => API.siedlungImportieren(mitWohnung))
  gleich('Import ohne ersetzeId: eigene Siedlung mit derselben Wohnung wird ersetzt', schreibt(r), [`update:id=${ZIEL}`])
  r = await mit(db(zeilen), () => API.siedlungImportieren(DATEI))
  gleich('Import ohne ersetzeId und ohne Treffer: neu angelegt', schreibt(r), ['insert:'])
}
{
  const rpc = (data, error = null) => () => ({ data, error })
  let r = await mit(rpc([
    { user_id: ICH, name: 'Xaver', avatar3d: null, rolle: 'besitzer' },
    { user_id: FREMD, name: 'Gast', avatar3d: null, rolle: 'gast' },
    { user_id: ANDERE, name: 'Mitzieher', rolle: 'umzug' },
  ]), () => API.siedlungMitglieder(ZIEL))
  gleich('siedlungMitglieder: Rolle umzug kommt an', r.ok?.map((m) => [m.rolle, m.avatar3d]), [['besitzer', null], ['gast', null], ['umzug', null]])
  r = await mit(rpc([{ user_id: ICH, name: 'X', avatar3d: null, rolle: 'chef' }]), () => API.siedlungMitglieder(ZIEL))
  gleich('siedlungMitglieder: unbekannte Rolle ist ein Fehler, kein Gast', r.fehler, tg('zustand.unbekannter_fehler'))
  r = await mit(rpc(3), () => API.siedlungDingeZuruecksetzen(ZIEL))
  gleich('siedlungDingeZuruecksetzen: alle (p_ding null), Zahl zurueck', [r.ok, r.aufrufe.map((q) => [q.rpc, q.args])], [3, [['siedlung_dinge_zuruecksetzen', { p_siedlung: ZIEL, p_ding: null }]]])
  r = await mit(rpc(1), () => API.siedlungDingeZuruecksetzen(ZIEL, 'stadt:w1:d0:ball'))
  gleich('siedlungDingeZuruecksetzen: ein Ding', [r.ok, r.aufrufe[0]?.args], [1, { p_siedlung: ZIEL, p_ding: 'stadt:w1:d0:ball' }])
  r = await mit(rpc(null, { message: 'abgelehnt' }), () => API.siedlungDingeZuruecksetzen(ZIEL, null))
  gleich('siedlungDingeZuruecksetzen: Fehler der Datenbank sichtbar', r.fehler, tg('fehler.siedlung_dinge_zuruecksetzen', { grund: 'abgelehnt' }))
  for (const kaputt of [null, '3', -1, 1.5]) {
    r = await mit(rpc(kaputt), () => API.siedlungDingeZuruecksetzen(ZIEL))
    gleich(`siedlungDingeZuruecksetzen: kaputte Antwort ${JSON.stringify(kaputt)} ist ein Fehler`, r.fehler, tg('zustand.unbekannter_fehler'))
  }
}

if (fehler) {
  console.log(`${fehler} Abweichung(en)`)
  process.exit(1)
}
console.log('ok')
