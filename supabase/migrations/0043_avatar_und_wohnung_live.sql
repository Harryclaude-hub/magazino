-- 0043: Figuren und gemeinsames Begehen der Wohnung in 3D (E82).
--
-- 1. profiles.avatar3d: wie die eigene Figur aussieht (Hautton, Haare,
--    Frisur, Kleidung, Groesse, Statur, Brille). Die Datenbank prueft den
--    Inhalt selbst (avatar3d_gueltig); dieselbe Regel steht in der App in
--    src/lib/avatar.ts (pruefeLook), scripts/avatar-pruefen.mjs vergleicht
--    beide. Lesen duerfen die Figur alle, die schon heute das Profil lesen
--    (profiles_select aus 0004: man selbst und wer einen Umzug mit einem
--    teilt). Schreiben nur man selbst (profiles_update).
--
-- 2. Live in der Wohnung: wer gerade im selben Umzug in 3D unterwegs ist,
--    wo er steht, und die Aushandlung fuer das Sprechen laufen ueber einen
--    privaten Realtime-Kanal 'wohnung:<Umzug>'. Private Kanaele fragt
--    Realtime bei realtime.messages: hinein und mithoeren darf nur, wer
--    Mitglied des Umzugs ist (is_member, also auch freigeschaltet, 0036).
--    Gespeichert wird dabei nichts; die Regeln entscheiden nur, wer den
--    Kanal betreten darf. Die bisherigen Kanaele (Chat, Anrufe) sind nicht
--    privat und bleiben unberuehrt.

-- ------------------------------------------------------------- 1. Figur

alter table public.profiles add column avatar3d jsonb;

-- Nur bekannte Schluessel, Farben als #rrggbb, Auswahl aus festen Listen,
-- Groesse 140 bis 210 cm, hoechstens 1024 Byte. Fehlt ein freiwilliges
-- Feld (groesse_cm, statur, brille), gilt der Standard der App. CASE
-- statt AND, wo eine Umwandlung sonst an falschen Typen scheitern koennte.
create function public.avatar3d_gueltig(a jsonb) returns boolean
language sql immutable set search_path = '' as $fn$
  select coalesce(
    case
      when a is null or jsonb_typeof(a) <> 'object' then false
      when octet_length(a::text) > 1024 then false
      when exists (
        select 1 from jsonb_object_keys(a) k
        where k not in ('v', 'haut', 'haare', 'haarform', 'oben', 'unten', 'schuhe', 'groesse_cm', 'statur', 'brille')
      ) then false
      else
        a -> 'v' = '1'::jsonb
        and jsonb_typeof(a -> 'haut') = 'string' and (a ->> 'haut') ~* '^#[0-9a-f]{6}$'
        and jsonb_typeof(a -> 'haare') = 'string' and (a ->> 'haare') ~* '^#[0-9a-f]{6}$'
        and jsonb_typeof(a -> 'oben') = 'string' and (a ->> 'oben') ~* '^#[0-9a-f]{6}$'
        and jsonb_typeof(a -> 'unten') = 'string' and (a ->> 'unten') ~* '^#[0-9a-f]{6}$'
        and jsonb_typeof(a -> 'schuhe') = 'string' and (a ->> 'schuhe') ~* '^#[0-9a-f]{6}$'
        and jsonb_typeof(a -> 'haarform') = 'string'
        and (a ->> 'haarform') in ('kurz', 'lang', 'zopf', 'glatze', 'locken')
        and case
          when not (a ? 'groesse_cm') then true
          when jsonb_typeof(a -> 'groesse_cm') = 'number' then (a ->> 'groesse_cm')::numeric between 140 and 210
          else false
        end
        and case
          when not (a ? 'statur') then true
          when jsonb_typeof(a -> 'statur') = 'string' then (a ->> 'statur') in ('schmal', 'mittel', 'breit')
          else false
        end
        and case
          when not (a ? 'brille') then true
          else jsonb_typeof(a -> 'brille') = 'boolean'
        end
    end,
    false)
$fn$;

-- Die Pruefung laeuft bei jedem Schreiben in profiles mit den Rechten des
-- Schreibenden. Ohne EXECUTE koennte niemand mehr sein Profil aendern
-- (siehe 0006). Der Anmelde-Trigger (handle_new_user) laeuft als Besitzer.
revoke execute on function public.avatar3d_gueltig(jsonb) from public, anon;
grant execute on function public.avatar3d_gueltig(jsonb) to authenticated, service_role;

alter table public.profiles add constraint profiles_avatar3d_ok
  check (avatar3d is null or public.avatar3d_gueltig(avatar3d));

-- ---------------------------------------------------- 2. Wohnung live
-- Kanalname 'wohnung:<project uuid>'. Kaputte Namen geben bei try_uuid
-- null (0005), is_member(null) ist falsch. broadcast traegt Stellungen
-- und Sprach-Aushandlung, presence sagt, wer da ist.

drop policy if exists wohnung_live_lesen on realtime.messages;
create policy wohnung_live_lesen on realtime.messages
  for select to authenticated
  using (
    realtime.messages.extension in ('broadcast', 'presence')
    and split_part(realtime.topic(), ':', 1) = 'wohnung'
    and public.is_member(public.try_uuid(split_part(realtime.topic(), ':', 2)))
  );

drop policy if exists wohnung_live_senden on realtime.messages;
create policy wohnung_live_senden on realtime.messages
  for insert to authenticated
  with check (
    realtime.messages.extension in ('broadcast', 'presence')
    and split_part(realtime.topic(), ':', 1) = 'wohnung'
    and public.is_member(public.try_uuid(split_part(realtime.topic(), ':', 2)))
  );
