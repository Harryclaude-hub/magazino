-- 0046: Die Siedlung gemeinsam (E86).
--
-- Der Besitzer einer Siedlung (0044) laedt registrierte Kistly-Konten ein,
-- per E-Mail oder per Anzeigename (nur wenn der Name eindeutig ist). Gaeste
-- oeffnen die Siedlung, sehen alle Haeuser und die Wohnungen innen (0045)
-- und gehen gleichzeitig mit hinein: Figuren, Stellungen und Sprechen ueber
-- einen privaten Realtime-Kanal 'siedlung:<Siedlung>' (wie 'wohnung:' aus
-- 0043).
--
-- Die eingerichtete eigene Wohnung bleibt im Umzug des Besitzers: an der
-- Zeilen-Sicherheit der Grundrisse aendert sich nichts. Ein Gast liest die
-- Zeile der Siedlung, aber den Grundriss, auf den wohnung zeigt, nur, wenn
-- er selbst Mitglied dieses Umzugs ist (grundriss_laden gibt sonst null).
--
-- 1. siedlung_mitglieder: wer Gast in welcher Siedlung ist. Lesen darf der
--    Besitzer der Siedlung und der Gast seine eigene Zeile. Schreiben geht
--    nur ueber die Funktionen unten, nie direkt.
-- 2. siedlung_darf(Siedlung): Besitzer oder Gast, und das eigene Konto ist
--    freigeschaltet (0036). Daran haengen das Lesen der Siedlung und der
--    Kanal. security definer, damit die Regeln von siedlungen und
--    siedlung_mitglieder nicht im Kreis aufeinander zeigen.
-- 3. siedlungen_select: wie bisher, dazu jeder mit siedlung_darf.
-- 4. siedlung_einladen, siedlung_mitglieder_liste, siedlung_entfernen: die
--    einzigen Wege, Gaeste einzutragen, zu sehen und herauszunehmen.
--    Einladen sagt nur, ob es geklappt hat (und den Anzeigenamen des
--    Eingeladenen), nie E-Mails oder Kennungen anderer Konten. Hoechstens
--    20 Gaeste je Siedlung und 30 Einladeversuche je Besitzer und Stunde
--    (auch erfolglose), damit niemand per Ausprobieren Konten absucht.
-- 5. Realtime: in den Kanal 'siedlung:<Siedlung>' hinein und mithoeren
--    darf nur, wer siedlung_darf hat. Gespeichert wird dabei nichts.

-- ------------------------------------------------------------ 1. Tabellen

create table public.siedlung_mitglieder (
  siedlung_id    uuid not null references public.siedlungen(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  eingeladen_von uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  primary key (siedlung_id, user_id)
);
create index siedlung_mitglieder_user_idx on public.siedlung_mitglieder (user_id);

-- Die Bremse beim Einladen: ein Eintrag je Versuch. Niemand liest oder
-- schreibt sie direkt; Eintraege aelter als ein Tag raeumt das Einladen
-- selbst weg.
create table public.siedlung_einladeversuche (
  id      bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  am      timestamptz not null default now()
);
create index siedlung_einladeversuche_idx on public.siedlung_einladeversuche (user_id, am);

-- ------------------------------------------------------ 2. Wer darf hinein

-- Besitzer oder Gast, das eigene Konto freigeschaltet. Ohne Siedlung (auch
-- bei null aus try_uuid) falsch.
create function public.siedlung_darf(p_siedlung uuid) returns boolean
language sql stable security definer set search_path = public as $fn$
  select public.ist_freigegeben() and exists (
    select 1 from public.siedlungen s
     where s.id = p_siedlung
       and (s.owner_id = auth.uid()
            or exists (
              select 1 from public.siedlung_mitglieder m
               where m.siedlung_id = s.id and m.user_id = auth.uid())))
$fn$;

-- ---------------------------------------------------- 3. Zeilen-Sicherheit

alter table public.siedlung_mitglieder enable row level security;

-- Der Gast sieht seine eigene Zeile, der Besitzer alle Zeilen seiner
-- Siedlung. Die Abfrage auf siedlungen laeuft durch deren Regel, und die
-- fragt siedlung_mitglieder nur ueber siedlung_darf (security definer):
-- kein Kreis.
create policy siedlung_mitglieder_select on public.siedlung_mitglieder for select to authenticated
  using (
    public.ist_freigegeben() and (
      user_id = auth.uid()
      or exists (
        select 1 from public.siedlungen s
         where s.id = siedlung_mitglieder.siedlung_id and s.owner_id = auth.uid())));

-- Kein insert, update, delete fuer Clients: das geht nur ueber die
-- Funktionen unten (security definer).
revoke all on public.siedlung_mitglieder from public, anon;
revoke insert, update, delete, truncate, references, trigger on public.siedlung_mitglieder from authenticated;
grant select on public.siedlung_mitglieder to authenticated;

alter table public.siedlung_einladeversuche enable row level security;
revoke all on public.siedlung_einladeversuche from public, anon, authenticated;

-- Lesen der Siedlung: die Bedingungen aus 0044 bleiben, dazu Besitzer und
-- Gaeste ueber siedlung_darf.
drop policy siedlungen_select on public.siedlungen;
create policy siedlungen_select on public.siedlungen for select to authenticated
  using (
    (owner_id = auth.uid() and public.ist_freigegeben())
    or exists (
      select 1 from public.grundrisse g
       where g.id = public.try_uuid(siedlungen.wohnung ->> 'grundrissId')
         and public.is_member(g.project_id))
    or public.siedlung_darf(id));

-- ----------------------------------------------------------- 4. Funktionen

-- Einladen. p_wer mit '@' ist eine E-Mail (genau, ohne Gross und Klein),
-- sonst ein Anzeigename (genau, ohne Gross und Klein, Leerzeichen am Rand
-- zaehlen nicht). Das eigene Konto zaehlt beim Namen nicht mit: wer
-- denselben Namen traegt wie der Besitzer, ist trotzdem eindeutig.
-- Antwort wie SiedlungEinladung in src/lib/types.ts:
--   {"status": "ok", "name": ...} oder {"status": "nicht_gefunden" |
--   "mehrdeutig" | "schon_drin" | "selbst" | "zu_viele"}.
-- Nur der Besitzer, nur freigeschaltet. Zu viele Versuche: Ablehnung
-- (kistly:siedlung.zu_oft).
create function public.siedlung_einladen(p_siedlung uuid, p_wer text) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare
  v_uid     uuid := auth.uid();
  v_wer     text := btrim(coalesce(p_wer, ''));
  v_treffer uuid[];
  v_selbst  boolean;
  v_ziel    uuid;
  v_name    text;
begin
  if v_uid is null then
    raise exception 'Nicht angemeldet' using errcode = '42501';
  end if;
  if not public.ist_freigegeben() then
    raise exception 'Konto nicht freigeschaltet' using errcode = '42501', hint = 'kistly:konto.nicht_frei';
  end if;
  if not exists (select 1 from public.siedlungen s where s.id = p_siedlung and s.owner_id = v_uid) then
    raise exception 'Nur der Besitzer der Siedlung darf einladen'
      using errcode = '42501', hint = 'kistly:siedlung.nur_besitzer';
  end if;
  -- Leer oder unsinnig lang: niemand, ohne zu suchen.
  if v_wer = '' or length(v_wer) > 320 then
    return jsonb_build_object('status', 'nicht_gefunden');
  end if;

  -- Ein Besitzer nach dem anderen: Bremse und Zahl der Gaeste koennen so
  -- nicht durch zwei gleichzeitige Aufrufe ueberholt werden.
  perform pg_advisory_xact_lock(hashtextextended('siedlung_einladen:' || v_uid::text, 0));
  delete from public.siedlung_einladeversuche v
   where v.user_id = v_uid and v.am < now() - interval '1 day';
  if (select count(*) from public.siedlung_einladeversuche v
       where v.user_id = v_uid and v.am > now() - interval '1 hour') >= 30 then
    raise exception 'Zu viele Einladungen in kurzer Zeit'
      using errcode = 'P0001', hint = 'kistly:siedlung.zu_oft';
  end if;
  insert into public.siedlung_einladeversuche (user_id) values (v_uid);

  if position('@' in v_wer) > 0 then
    select coalesce(array_agg(u.id), '{}') into v_treffer
      from auth.users u
     where lower(u.email) = lower(v_wer)
       and u.deleted_at is null
       and not coalesce(u.is_anonymous, false);
  else
    select coalesce(array_agg(p.id), '{}') into v_treffer
      from public.profiles p
      join auth.users u on u.id = p.id
     where lower(btrim(p.display_name)) = lower(v_wer)
       and u.deleted_at is null
       and not coalesce(u.is_anonymous, false);
  end if;

  v_selbst := v_uid = any (v_treffer);
  v_treffer := array_remove(v_treffer, v_uid);
  if cardinality(v_treffer) = 0 then
    return jsonb_build_object('status', case when v_selbst then 'selbst' else 'nicht_gefunden' end);
  end if;
  if cardinality(v_treffer) > 1 then
    return jsonb_build_object('status', 'mehrdeutig');
  end if;
  v_ziel := v_treffer[1];

  if exists (select 1 from public.siedlung_mitglieder m where m.siedlung_id = p_siedlung and m.user_id = v_ziel) then
    return jsonb_build_object('status', 'schon_drin');
  end if;
  if (select count(*) from public.siedlung_mitglieder m where m.siedlung_id = p_siedlung) >= 20 then
    return jsonb_build_object('status', 'zu_viele');
  end if;

  insert into public.siedlung_mitglieder (siedlung_id, user_id, eingeladen_von)
  values (p_siedlung, v_ziel, v_uid);

  select nullif(btrim(p.display_name), '') into v_name from public.profiles p where p.id = v_ziel;
  return jsonb_build_object('status', 'ok', 'name', coalesce(v_name, 'Gast'));
end $fn$;

-- Wer gehoert dazu: der Besitzer zuerst, dann die Gaeste in der
-- Reihenfolge der Einladung. Name aus dem Profil (sonst 'Gast'), Figur
-- (0043). Nur fuer Besitzer und Gaeste; alle anderen bekommen eine
-- Ablehnung (kistly:siedlung.kein_zugriff), keine leere Liste.
create function public.siedlung_mitglieder_liste(p_siedlung uuid)
returns table (user_id uuid, name text, avatar3d jsonb, rolle text)
language plpgsql stable security definer set search_path = public as $fn$
#variable_conflict use_column
begin
  if not public.siedlung_darf(p_siedlung) then
    raise exception 'Kein Zugriff auf diese Siedlung'
      using errcode = '42501', hint = 'kistly:siedlung.kein_zugriff';
  end if;
  return query
    select x.uid, coalesce(nullif(btrim(p.display_name), ''), 'Gast'), p.avatar3d, x.art
      from (
        select s.owner_id as uid, 'besitzer'::text as art, 0 as reihe, s.created_at as seit
          from public.siedlungen s
         where s.id = p_siedlung
        union all
        select m.user_id, 'gast'::text, 1, m.created_at
          from public.siedlung_mitglieder m
         where m.siedlung_id = p_siedlung
      ) x
      left join public.profiles p on p.id = x.uid
     order by x.reihe, x.seit, x.uid;
end $fn$;

-- Herausnehmen: der Besitzer nimmt einen Gast heraus, oder ein Gast geht
-- selbst (das geht auch, wenn sein Konto inzwischen gesperrt ist). War die
-- Person nicht drin, ist das eine Ablehnung (kistly:siedlung.nicht_drin),
-- kein stilles Nichts.
create function public.siedlung_entfernen(p_siedlung uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public as $fn$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Nicht angemeldet' using errcode = '42501';
  end if;
  if p_user is distinct from v_uid and not (
    public.ist_freigegeben()
    and exists (select 1 from public.siedlungen s where s.id = p_siedlung and s.owner_id = v_uid)
  ) then
    raise exception 'Nur der Besitzer der Siedlung darf Gaeste herausnehmen'
      using errcode = '42501', hint = 'kistly:siedlung.nur_besitzer';
  end if;
  delete from public.siedlung_mitglieder m
   where m.siedlung_id = p_siedlung and m.user_id = p_user;
  if not found then
    raise exception 'Nicht in dieser Siedlung'
      using errcode = 'P0002', hint = 'kistly:siedlung.nicht_drin';
  end if;
end $fn$;

-- Ausfuehren duerfen nur angemeldete Konten (die Regeln fragen
-- siedlung_darf mit deren Rechten).
revoke execute on function
  public.siedlung_darf(uuid),
  public.siedlung_einladen(uuid, text),
  public.siedlung_mitglieder_liste(uuid),
  public.siedlung_entfernen(uuid, uuid)
from public, anon, service_role;
grant execute on function
  public.siedlung_darf(uuid),
  public.siedlung_einladen(uuid, text),
  public.siedlung_mitglieder_liste(uuid),
  public.siedlung_entfernen(uuid, uuid)
to authenticated;

-- ------------------------------------------------------ 5. Siedlung live
-- Kanalname 'siedlung:<siedlung uuid>'. Kaputte Namen geben bei try_uuid
-- null (0005), siedlung_darf(null) ist falsch. broadcast traegt Stellungen
-- und Sprach-Aushandlung, presence sagt, wer da ist (wie 0043).

drop policy if exists siedlung_live_lesen on realtime.messages;
create policy siedlung_live_lesen on realtime.messages
  for select to authenticated
  using (
    realtime.messages.extension in ('broadcast', 'presence')
    and split_part(realtime.topic(), ':', 1) = 'siedlung'
    and public.siedlung_darf(public.try_uuid(split_part(realtime.topic(), ':', 2)))
  );

drop policy if exists siedlung_live_senden on realtime.messages;
create policy siedlung_live_senden on realtime.messages
  for insert to authenticated
  with check (
    realtime.messages.extension in ('broadcast', 'presence')
    and split_part(realtime.topic(), ':', 1) = 'siedlung'
    and public.siedlung_darf(public.try_uuid(split_part(realtime.topic(), ':', 2)))
  );
