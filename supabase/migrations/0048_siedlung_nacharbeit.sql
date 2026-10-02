-- 0048: Nacharbeit an der Siedlung nach der Pruefung (E87b).
--
-- 1. siedlung_dinge.erstellt_von: wer ein Ding als Erster hingestellt hat.
--    Gesetzt nur beim ersten Eintrag, nie beim Ueberschreiben; schon
--    vorhandene Zeilen bekommen geaendert_von. Danach zaehlt die Grenze je
--    Konto (2.), und das Herausnehmen eines Gastes (4.) weiss, was er
--    hingestellt hat.
-- 2. siedlung_ding_setzen: neue Kennungen hoechstens 500 je Konto und
--    Siedlung (kistly:siedlung.zu_viele_eigene_dinge), gezaehlt ueber
--    erstellt_von unter derselben Sperre wie die Grenze von 5000 je
--    Siedlung (kistly:siedlung.zu_viele_dinge, gilt weiter fuer alle). Der
--    Besitzer hat keine eigene Grenze, nur die 5000. So kann ein einzelner
--    Gast die Siedlung nicht mehr allein voll machen.
-- 3. siedlung_dinge_zuruecksetzen(Siedlung, Ding oder null): der Weg
--    zurueck. Nur der Besitzer mit freigeschaltetem Konto
--    (kistly:siedlung.nur_besitzer); loescht ein Ding (es steht danach
--    wieder am Startplatz) oder alle Dinge der Siedlung und gibt die Zahl
--    der geloeschten Zeilen zurueck (0: es war keins bewegt).
-- 4. siedlung_entfernen: nimmt auch die Dinge weg, die der Gast als Erster
--    hingestellt hat (erstellt_von), ob der Besitzer ihn herausnimmt oder er
--    selbst geht.
-- 5. Wer im Umzug der eigenen Wohnung des Besitzers ist (siedlungen.wohnung
--    ->> 'grundrissId' -> grundrisse.project_id, is_member), darf hinein wie
--    ein Gast. Lesen durfte er die Zeile schon (siedlungen_select, 0044);
--    jetzt auch siedlung_darf und siedlung_darf_alle und damit die Dinge
--    lesen und hinstellen, die Liste und den Kanal 'siedlung:<Siedlung>'.
--    Die Liste zeigt ihn einmal mit der Rolle 'umzug' (nicht, wenn er
--    Besitzer oder Gast ist), Einladen sagt 'schon_drin'. Herausnehmen als
--    Gast geht nicht (kistly:siedlung.nicht_drin): er gehoert ueber den
--    Umzug dazu, nicht ueber eine Einladung.
-- 6. Lagen in siedlung_dinge sind ab E87b Siedlungsmeter (x nach Osten, z
--    nach Sueden, y ueber dem Boden der Siedlung = 0, gier wie Pose3D), nicht
--    mehr Weltmeter: die Oberflaeche rechnet beim Laden und Speichern um
--    (SiedlungWelt3D.rahmen in src/components/plan3d/siedlung3d.ts). Die
--    Grenzen der Spalten bleiben. Diese Migration rechnet keine schon
--    gespeicherte Zeile um.
--
-- Was 0046 und 0047 zusichern, bleibt: Lesen der Dinge nur ueber
-- siedlung_darf_alle, Schreiben nur ueber die Funktionen (security definer),
-- EXECUTE nur fuer authenticated, Kennung der Dinge ^[A-Za-z0-9:._-]{1,120}$,
-- Zahlen endlich und in den Grenzen, 20 Gaeste, 30 Einladeversuche je
-- Stunde, nie E-Mails oder Kennungen anderer Konten in einer Antwort.

-- ------------------------------------------------------- 1. erstellt_von

alter table public.siedlung_dinge
  add column erstellt_von uuid references auth.users(id) on delete set null;

update public.siedlung_dinge set erstellt_von = geaendert_von where erstellt_von is null;

-- Die Grenze je Konto zaehlt hier entlang.
create index siedlung_dinge_erstellt_idx on public.siedlung_dinge (siedlung_id, erstellt_von);

-- ------------------------------------------------------ 5. Wer darf hinein

-- Besitzer, Gast oder im Umzug der eigenen Wohnung (dieselbe Bedingung wie
-- der zweite Teil von siedlungen_select, 0044), das eigene Konto
-- freigeschaltet. Ohne Siedlung (auch bei null aus try_uuid) falsch.
create or replace function public.siedlung_darf(p_siedlung uuid) returns boolean
language sql stable security definer set search_path = public as $fn$
  select public.ist_freigegeben() and exists (
    select 1 from public.siedlungen s
     where s.id = p_siedlung
       and (s.owner_id = auth.uid()
            or exists (
              select 1 from public.siedlung_mitglieder m
               where m.siedlung_id = s.id and m.user_id = auth.uid())
            or exists (
              select 1 from public.grundrisse g
               where g.id = public.try_uuid(s.wohnung ->> 'grundrissId')
                 and public.is_member(g.project_id))))
$fn$;

-- Dasselbe fuer alle Siedlungen auf einmal (fuer die Regel an
-- siedlung_dinge, 0047).
create or replace function public.siedlung_darf_alle() returns setof uuid
language sql stable security definer set search_path = public as $fn$
  select s.id from public.siedlungen s
   where s.owner_id = auth.uid() and public.ist_freigegeben()
  union
  select m.siedlung_id from public.siedlung_mitglieder m
   where m.user_id = auth.uid() and public.ist_freigegeben()
  union
  select s.id from public.siedlungen s
    join public.grundrisse g on g.id = public.try_uuid(s.wohnung ->> 'grundrissId')
   where public.is_member(g.project_id) and public.ist_freigegeben()
$fn$;

-- ----------------------------------------------------------- 2. Hinstellen

-- Ein Ding hinstellen: neu oder ueber die alte Lage desselben Dings. Wer
-- hinein darf (siedlung_darf). Neue Kennungen: hoechstens 5000 je Siedlung
-- und, ausser fuer den Besitzer, hoechstens 500 je Konto und Siedlung;
-- eine Siedlung nach der anderen, damit gleichzeitige neue Dinge keine
-- Grenze ueberholen. erstellt_von nur beim ersten Eintrag.
create or replace function public.siedlung_ding_setzen(
  p_siedlung uuid,
  p_ding text,
  p_art text,
  p_x float8,
  p_y float8,
  p_z float8,
  p_gier float8,
  p_ebene text
) returns void
language plpgsql security definer set search_path = public as $fn$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Nicht angemeldet' using errcode = '42501';
  end if;
  if not public.siedlung_darf(p_siedlung) then
    raise exception 'Kein Zugriff auf diese Siedlung'
      using errcode = '42501', hint = 'kistly:siedlung.kein_zugriff';
  end if;
  -- Null, NaN und unendlich fallen hier durch (coalesce: null ist falsch).
  if not coalesce(
       p_ding ~ '^[A-Za-z0-9:._-]{1,120}$'
       and p_art in ('ding', 'fahrzeug')
       and abs(p_x) <= 20000 and abs(p_z) <= 20000 and abs(p_y) <= 2000
       and abs(p_gier) < 'Infinity'::float8
       and length(p_ebene) <= 120,
       false) then
    raise exception 'Ding mit ungueltiger Kennung oder Lage'
      using errcode = 'check_violation', hint = 'kistly:siedlung.ding_ungueltig';
  end if;
  if not exists (
    select 1 from public.siedlung_dinge d where d.siedlung_id = p_siedlung and d.ding_id = p_ding
  ) then
    perform pg_advisory_xact_lock(hashtextextended('siedlung_dinge:' || p_siedlung::text, 0));
    if (select count(*) from public.siedlung_dinge d where d.siedlung_id = p_siedlung) >= 5000 then
      raise exception 'Hoechstens 5000 bewegte Dinge je Siedlung'
        using errcode = 'check_violation', hint = 'kistly:siedlung.zu_viele_dinge';
    end if;
    if not exists (select 1 from public.siedlungen s where s.id = p_siedlung and s.owner_id = v_uid)
       and (select count(*) from public.siedlung_dinge d
             where d.siedlung_id = p_siedlung and d.erstellt_von = v_uid) >= 500 then
      raise exception 'Hoechstens 500 neue Dinge je Konto und Siedlung'
        using errcode = 'check_violation', hint = 'kistly:siedlung.zu_viele_eigene_dinge';
    end if;
  end if;
  insert into public.siedlung_dinge as d (siedlung_id, ding_id, art, x, y, z, gier, ebene, geaendert_von, erstellt_von, updated_at)
  values (p_siedlung, p_ding, p_art, p_x, p_y, p_z, p_gier, p_ebene, v_uid, v_uid, now())
  on conflict (siedlung_id, ding_id) do update
    set art = excluded.art,
        x = excluded.x,
        y = excluded.y,
        z = excluded.z,
        gier = excluded.gier,
        ebene = excluded.ebene,
        geaendert_von = excluded.geaendert_von,
        updated_at = excluded.updated_at;
end $fn$;

-- ------------------------------------------------------- 3. Zuruecksetzen

-- Nur der Besitzer, nur freigeschaltet. p_ding null: alle Dinge der
-- Siedlung. Gibt die Zahl der geloeschten Zeilen zurueck.
create function public.siedlung_dinge_zuruecksetzen(p_siedlung uuid, p_ding text default null)
returns integer
language plpgsql security definer set search_path = public as $fn$
declare
  v_uid uuid := auth.uid();
  v_n   integer;
begin
  if v_uid is null then
    raise exception 'Nicht angemeldet' using errcode = '42501';
  end if;
  if not (
    public.ist_freigegeben()
    and exists (select 1 from public.siedlungen s where s.id = p_siedlung and s.owner_id = v_uid)
  ) then
    raise exception 'Nur der Besitzer der Siedlung darf Dinge zuruecksetzen'
      using errcode = '42501', hint = 'kistly:siedlung.nur_besitzer';
  end if;
  delete from public.siedlung_dinge d
   where d.siedlung_id = p_siedlung
     and (p_ding is null or d.ding_id = p_ding);
  get diagnostics v_n = row_count;
  return v_n;
end $fn$;

-- --------------------------------------------------- 5. Liste, Einladen

-- Wer gehoert dazu: der Besitzer zuerst, dann die Gaeste in der
-- Reihenfolge der Einladung, dann die Mitglieder im Umzug der eigenen
-- Wohnung (Rolle 'umzug', jedes Konto nur einmal, nicht der Besitzer und
-- kein Gast). Name aus dem Profil (sonst 'Gast'), Figur (0043). Nur fuer
-- wer hinein darf; alle anderen bekommen eine Ablehnung
-- (kistly:siedlung.kein_zugriff), keine leere Liste.
create or replace function public.siedlung_mitglieder_liste(p_siedlung uuid)
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
        union all
        select pm.user_id, 'umzug'::text, 2, pm.created_at
          from public.siedlungen s
          join public.grundrisse g on g.id = public.try_uuid(s.wohnung ->> 'grundrissId')
          join public.project_members pm on pm.project_id = g.project_id
         where s.id = p_siedlung
           and pm.user_id <> s.owner_id
           and not exists (
             select 1 from public.siedlung_mitglieder m2
              where m2.siedlung_id = s.id and m2.user_id = pm.user_id)
      ) x
      left join public.profiles p on p.id = x.uid
     order by x.reihe, x.seit, x.uid;
end $fn$;

-- Einladen wie 0046. Neu: wer im Umzug der eigenen Wohnung ist, gehoert
-- schon dazu ('schon_drin'), ohne Eintrag als Gast.
create or replace function public.siedlung_einladen(p_siedlung uuid, p_wer text) returns jsonb
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
  if exists (
    select 1 from public.siedlungen s
      join public.grundrisse g on g.id = public.try_uuid(s.wohnung ->> 'grundrissId')
      join public.project_members pm on pm.project_id = g.project_id
     where s.id = p_siedlung and pm.user_id = v_ziel
  ) then
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

-- ------------------------------------------------------- 4. Herausnehmen

-- Wie 0046: der Besitzer nimmt einen Gast heraus, oder ein Gast geht
-- selbst (auch mit gesperrtem Konto). War die Person nicht als Gast drin,
-- ist das eine Ablehnung (kistly:siedlung.nicht_drin). Neu: die Dinge, die
-- sie als Erste hingestellt hat, gehen mit.
create or replace function public.siedlung_entfernen(p_siedlung uuid, p_user uuid) returns void
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
  delete from public.siedlung_dinge d
   where d.siedlung_id = p_siedlung and d.erstellt_von = p_user;
end $fn$;

-- ------------------------------------------------------------ Rechte

-- Ausfuehren duerfen nur angemeldete Konten (wie 0046 und 0047). Neu
-- angelegte Funktionen bekommen sonst EXECUTE fuer alle; die ersetzten
-- behalten ihre Rechte, hier steht es noch einmal ausdruecklich.
revoke execute on function
  public.siedlung_darf(uuid),
  public.siedlung_darf_alle(),
  public.siedlung_ding_setzen(uuid, text, text, float8, float8, float8, float8, text),
  public.siedlung_dinge_zuruecksetzen(uuid, text),
  public.siedlung_mitglieder_liste(uuid),
  public.siedlung_einladen(uuid, text),
  public.siedlung_entfernen(uuid, uuid)
from public, anon, service_role;
grant execute on function
  public.siedlung_darf(uuid),
  public.siedlung_darf_alle(),
  public.siedlung_ding_setzen(uuid, text, text, float8, float8, float8, float8, text),
  public.siedlung_dinge_zuruecksetzen(uuid, text),
  public.siedlung_mitglieder_liste(uuid),
  public.siedlung_einladen(uuid, text),
  public.siedlung_entfernen(uuid, uuid)
to authenticated;
