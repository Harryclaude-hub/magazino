-- =====================================================================
-- Kistly 0027_eigene_groessen
--
-- Karam kann je Umzug eigene Groessen speichern (Name, Laenge, Breite,
-- Hoehe in cm, bei Moebeln optional L-Form) und sie beim Anlegen mit
-- einem Tipp waehlen (START 5.1a).
--
-- 1. Die Stufe 1 bis 10 in der Nummer setzt bei einer eigenen Groesse die
--    Datenbank selbst: Laenge mal Breite mal Hoehe durch 1000 sind Liter,
--    eingeordnet nach kisten_groessen.bis_liter (0021). Das geschieht im
--    Trigger items_ab_groesse, der alphabetisch vor items_bi/items_bu
--    laeuft, damit die Nummer schon mit der richtigen Stufe entsteht.
-- 2. kiste_masse ist ab jetzt die einzige Regel fuer Laenge, Breite und
--    Hoehe einer Kiste: eigene Groesse, sonst eigene Hoehe (nur Hoehe),
--    sonst kisten_groessen, sonst 60 x 40 x 40.
-- 3. Eine benutzte Groesse laesst sich nicht loeschen; die Ablehnung nennt
--    die Zahl der Kisten und Moebel. Aendern der Masse stuft alle Kisten
--    mit dieser Groesse neu ein (neue Nummer, der alte Code bleibt
--    scannbar). Die Pruefung der Plaetze kommt mit 0028 dazu.
-- =====================================================================

create table public.eigene_groessen (
  id                   uuid primary key default gen_random_uuid(),
  project_id           uuid not null references public.projects(id) on delete cascade,
  name                 text not null check (length(btrim(name)) between 1 and 60),
  art                  text not null default 'kiste' check (art in ('kiste', 'moebel')),
  laenge_cm            int  not null check (laenge_cm between 1 and 1000),
  breite_cm            int  not null check (breite_cm between 1 and 1000),
  hoehe_cm             int  not null check (hoehe_cm  between 1 and 1000),
  -- nur Moebel: L-Form als Rechteck mit rechteckigem Ausschnitt
  ausschnitt_breite_cm int,
  ausschnitt_tiefe_cm  int,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint eigene_groessen_l_check check (
    num_nonnulls(ausschnitt_breite_cm, ausschnitt_tiefe_cm) in (0, 2)
    and (ausschnitt_breite_cm is null or (
          art = 'moebel'
      and ausschnitt_breite_cm between 1 and laenge_cm - 1
      and ausschnitt_tiefe_cm  between 1 and breite_cm - 1)))
);

create unique index eigene_groessen_name_key
  on public.eigene_groessen (project_id, lower(btrim(name)));
create index eigene_groessen_project_idx
  on public.eigene_groessen (project_id, art, name);

alter table public.items
  add column eigene_groesse_id uuid references public.eigene_groessen(id) on delete set null;
create index items_eigene_groesse_idx on public.items (eigene_groesse_id)
  where eigene_groesse_id is not null;

-- ------------------------------------------------ Stufe aus dem Volumen
create function public.groesse_stufe(p_laenge int, p_breite int, p_hoehe int)
returns smallint language sql stable set search_path = public as $fn$
  select coalesce(
    (select min(g.stufe) from public.kisten_groessen g
      where g.bis_liter is not null
        and (p_laenge::numeric * p_breite * p_hoehe / 1000) < g.bis_liter),
    10)::smallint
$fn$;

-- ------------------------------------------- Masse einer Kiste, eine Regel
create function public.kiste_masse(p_size smallint, p_eigene_hoehe smallint, p_groesse uuid,
  out laenge_cm int, out breite_cm int, out hoehe_cm int)
language sql stable set search_path = public as $fn$
  select coalesce(e.laenge_cm, g.laenge_cm::int, 60),
         coalesce(e.breite_cm, g.breite_cm::int, 40),
         coalesce(e.hoehe_cm, p_eigene_hoehe::int, g.hoehe_cm::int, 40)
    from (select 1) d
    left join public.eigene_groessen e on e.id = p_groesse
    left join public.kisten_groessen g on g.stufe = p_size
$fn$;

-- --------------------------------------------- Trigger an eigene_groessen
create function public.eigene_groessen_vorher()
returns trigger language plpgsql set search_path = public as $fn$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    new.project_id := old.project_id;   -- eine Groesse wandert nie in einen anderen Umzug
  end if;
  new.name := btrim(new.name);
  return new;
end $fn$;

create trigger eigene_groessen_vorher
  before insert or update on public.eigene_groessen
  for each row execute function public.eigene_groessen_vorher();

create function public.eigene_groessen_weg()
returns trigger language plpgsql set search_path = public as $fn$
declare
  v_kisten int;
  v_moebel int;
begin
  -- Wird der ganze Umzug geloescht, ist die Projektzeile schon weg (0008).
  if not exists (select 1 from public.projects where id = old.project_id) then
    return old;
  end if;
  select count(*) filter (where kind <> 'furniture'),
         count(*) filter (where kind = 'furniture')
    into v_kisten, v_moebel
    from public.items where eigene_groesse_id = old.id;
  if v_kisten + v_moebel > 0 then
    raise exception 'Diese Groesse wird noch benutzt (% Kisten, % Moebel)', v_kisten, v_moebel
      using errcode = 'check_violation', hint = 'kistly:groesse.benutzt',
            detail = json_build_object('kisten', v_kisten, 'moebel', v_moebel)::text;
  end if;
  return old;
end $fn$;

create trigger eigene_groessen_weg
  before delete on public.eigene_groessen
  for each row execute function public.eigene_groessen_weg();

-- Masse geaendert: alle Kisten mit dieser Groesse neu einstufen. Die
-- Nummer aendert sich dann ueber items_bu, der alte Code bleibt scannbar.
-- 0028 ersetzt den Koerper und prueft zusaetzlich die Plaetze.
create function public.eigene_groessen_nachher()
returns trigger language plpgsql set search_path = public as $fn$
declare
  v_stufe smallint;
begin
  if (new.laenge_cm, new.breite_cm, new.hoehe_cm)
     is not distinct from (old.laenge_cm, old.breite_cm, old.hoehe_cm) then
    return null;
  end if;
  v_stufe := public.groesse_stufe(new.laenge_cm, new.breite_cm, new.hoehe_cm);
  update public.items set size = v_stufe
   where eigene_groesse_id = new.id and size <> v_stufe;
  return null;
end $fn$;

create trigger eigene_groessen_nachher
  after update on public.eigene_groessen
  for each row execute function public.eigene_groessen_nachher();

-- --------------------------------------------------- Trigger an items
-- Laeuft vor items_bi/items_bu ('items_ab' < 'items_bi'), damit die Nummer
-- mit der Stufe der eigenen Groesse entsteht. Die Oberflaeche rechnet die
-- Stufe nie selbst.
create function public.items_ab_groesse()
returns trigger language plpgsql set search_path = public as $fn$
declare
  e public.eigene_groessen;
  v_projekt uuid;
begin
  if new.eigene_groesse_id is null then
    return new;
  end if;
  v_projekt := case when tg_op = 'UPDATE' then old.project_id else new.project_id end;
  select * into e from public.eigene_groessen where id = new.eigene_groesse_id;
  if e.id is null or e.project_id <> v_projekt then
    raise exception 'Diese Groesse gehoert zu einem anderen Umzug'
      using errcode = 'check_violation', hint = 'kistly:groesse.anderer_umzug';
  end if;
  new.size := public.groesse_stufe(e.laenge_cm, e.breite_cm, e.hoehe_cm);
  return new;
end $fn$;

create trigger items_ab_groesse
  before insert or update on public.items
  for each row execute function public.items_ab_groesse();

-- ------------------------------ Vorschau vor dem Aendern (Oberflaeche fragt)
create function public.eigene_groesse_folgen(p_id uuid, p_laenge int, p_breite int, p_hoehe int)
returns jsonb language sql stable set search_path = public as $fn$
  select jsonb_build_object(
    'kisten', count(*) filter (where i.kind <> 'furniture'),
    'moebel', count(*) filter (where i.kind = 'furniture'),
    'stufe_neu', public.groesse_stufe(p_laenge, p_breite, p_hoehe),
    'neue_nummer', count(*) filter (where i.size <> public.groesse_stufe(p_laenge, p_breite, p_hoehe)))
    from public.items i
   where i.eigene_groesse_id = p_id
$fn$;

-- ------------------------------------------------------------------ RLS
alter table public.eigene_groessen enable row level security;

create policy eigene_groessen_select on public.eigene_groessen for select to authenticated
  using (public.is_member(project_id));
create policy eigene_groessen_insert on public.eigene_groessen for insert to authenticated
  with check (public.is_editor(project_id));
create policy eigene_groessen_update on public.eigene_groessen for update to authenticated
  using (public.is_editor(project_id)) with check (public.is_editor(project_id));
create policy eigene_groessen_delete on public.eigene_groessen for delete to authenticated
  using (public.is_editor(project_id));
revoke all on public.eigene_groessen from anon;

-- ---------------------------------------------------------------- Rechte
revoke execute on function public.groesse_stufe(int, int, int) from public, anon;
grant  execute on function public.groesse_stufe(int, int, int) to authenticated;
revoke execute on function public.kiste_masse(smallint, smallint, uuid) from public, anon;
grant  execute on function public.kiste_masse(smallint, smallint, uuid) to authenticated;
revoke execute on function public.eigene_groesse_folgen(uuid, int, int, int) from public, anon;
grant  execute on function public.eigene_groesse_folgen(uuid, int, int, int) to authenticated;
revoke execute on function public.eigene_groessen_vorher() from public, anon;
revoke execute on function public.eigene_groessen_weg() from public, anon;
revoke execute on function public.eigene_groessen_nachher() from public, anon;
revoke execute on function public.items_ab_groesse() from public, anon;
