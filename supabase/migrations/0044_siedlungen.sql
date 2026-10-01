-- 0044: Siedlungen (E83).
--
-- Eine Siedlung ist ein eigener Bereich neben den Umzuegen: die Haeuser
-- rundherum (Umriss in Metern, Geschosse, Stil, Dach), draussen Spielplatz,
-- Tiefgarage und Wege, und wo die eigene Wohnung darin liegt (ein Grundriss
-- aus einem Umzug, Haus, Geschoss, Lage, Drehung). Die Form steht in
-- src/lib/types.ts (Siedlung, SiedlungGebaeude, SiedlungWohnung,
-- SiedlungAussen); Koordinaten in Metern um (lat, lon), x nach Osten, z nach
-- Sueden.
--
-- Wo jemand wohnt, ist privat. Darum steht davon nichts im Code, nur hier
-- in der Datenbank, und jede Siedlung gehoert genau einem Konto
-- (owner_id). Lesen, aendern und loeschen darf der Besitzer, solange sein
-- Konto freigeschaltet ist (0036). Lesen duerfen ausserdem die Mitglieder
-- des Umzugs, dem der Grundriss der eigenen Wohnung gehoert: wer mit einem
-- in der Wohnung unterwegs ist (0043), sieht auch die Haeuser rundherum.
-- Auf einen Grundriss verweisen darf der Besitzer nur, wenn er selbst
-- Mitglied dieses Umzugs ist; sonst koennte er seine Siedlung in fremde
-- Umzuege schieben (Pruefung im Trigger, Kennung kistly:grundriss.grundriss_fehlt).
--
-- Die Datenbank prueft den Inhalt selbst (siedlung_*_gueltig), damit
-- kaputte Daten die 3D-Ansicht der anderen nie erreichen: nur bekannte
-- Schluessel, Zahlen in vernuenftigen Grenzen, hoechstens 200 Haeuser und
-- 400 kB. CASE statt AND, wo eine Umwandlung an falschen Typen scheitern
-- koennte (wie 0043).

-- --------------------------------------------------------- 1. Pruefungen

-- Eine Liste von Punkten [x, z] in Metern, p_min bis p_max Stueck, jeder
-- Wert hoechstens 5 km vom Mittelpunkt.
create function public.siedlung_punkte_gueltig(p jsonb, p_min int, p_max int) returns boolean
language sql immutable set search_path = '' as $fn$
  select coalesce(
    case
      when p is null or jsonb_typeof(p) <> 'array' then false
      when jsonb_array_length(p) < p_min or jsonb_array_length(p) > p_max then false
      else not exists (
        select 1 from jsonb_array_elements(p) e
        where case
          when jsonb_typeof(e) <> 'array' then true
          when jsonb_array_length(e) <> 2 then true
          when jsonb_typeof(e -> 0) <> 'number' or jsonb_typeof(e -> 1) <> 'number' then true
          else abs((e ->> 0)::numeric) > 5000 or abs((e ->> 1)::numeric) > 5000
        end)
    end,
    false)
$fn$;

-- Eine Zahl (jsonb) zwischen lo und hi; ganz = nur ganze Zahlen.
create function public.siedlung_zahl_gueltig(v jsonb, lo numeric, hi numeric, ganz boolean) returns boolean
language sql immutable set search_path = '' as $fn$
  select coalesce(
    case
      when v is null or jsonb_typeof(v) <> 'number' then false
      when (v #>> '{}')::numeric < lo or (v #>> '{}')::numeric > hi then false
      when ganz then (v #>> '{}')::numeric = trunc((v #>> '{}')::numeric)
      else true
    end,
    false)
$fn$;

-- Die Haeuser: eine Liste von hoechstens 200 Objekten mit genau den
-- Schluesseln von SiedlungGebaeude, jede id nur einmal, hoechstens 400 kB.
create function public.siedlung_gebaeude_gueltig(g jsonb) returns boolean
language sql immutable set search_path = '' as $fn$
  select coalesce(
    case
      when g is null or jsonb_typeof(g) <> 'array' then false
      when jsonb_array_length(g) > 200 then false
      when octet_length(g::text) > 400000 then false
      when (select count(distinct b ->> 'id') from jsonb_array_elements(g) b) <> jsonb_array_length(g) then false
      else not exists (
        select 1 from jsonb_array_elements(g) b
        where not coalesce(
          case
            when jsonb_typeof(b) <> 'object' then false
            when exists (
              select 1 from jsonb_object_keys(b) k
              where k not in ('id', 'name', 'umriss', 'geschosse', 'geschossHoehe', 'stil', 'dachGruen', 'pv', 'quelle')
            ) then false
            else
              jsonb_typeof(b -> 'id') = 'string' and length(b ->> 'id') between 1 and 64
              and jsonb_typeof(b -> 'name') = 'string' and length(b ->> 'name') <= 80
              and public.siedlung_punkte_gueltig(b -> 'umriss', 3, 500)
              and public.siedlung_zahl_gueltig(b -> 'geschosse', 1, 60, true)
              and public.siedlung_zahl_gueltig(b -> 'geschossHoehe', 2, 10, false)
              and jsonb_typeof(b -> 'stil') = 'string'
              and (b ->> 'stil') in ('weiss_loggia', 'holz', 'putz', 'grau')
              and jsonb_typeof(b -> 'dachGruen') = 'boolean'
              and jsonb_typeof(b -> 'pv') = 'boolean'
              and case
                when not (b ? 'quelle') then true
                when jsonb_typeof(b -> 'quelle') = 'null' then true
                when jsonb_typeof(b -> 'quelle') = 'string' then length(b ->> 'quelle') <= 200
                else false
              end
          end,
          false))
    end,
    false)
$fn$;

-- Die eigene Wohnung: null oder genau die Schluessel von SiedlungWohnung.
-- Geschoss 0 ist das Erdgeschoss, negativ der Keller.
create function public.siedlung_wohnung_gueltig(w jsonb) returns boolean
language sql immutable set search_path = '' as $fn$
  select coalesce(
    case
      when w is null then true
      when jsonb_typeof(w) <> 'object' then false
      when exists (
        select 1 from jsonb_object_keys(w) k
        where k not in ('grundrissId', 'gebaeudeId', 'geschoss', 'x', 'z', 'drehung')
      ) then false
      else
        jsonb_typeof(w -> 'grundrissId') = 'string'
        and (w ->> 'grundrissId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and jsonb_typeof(w -> 'gebaeudeId') = 'string' and length(w ->> 'gebaeudeId') between 1 and 64
        and public.siedlung_zahl_gueltig(w -> 'geschoss', -5, 60, true)
        and public.siedlung_zahl_gueltig(w -> 'x', -5000, 5000, false)
        and public.siedlung_zahl_gueltig(w -> 'z', -5000, 5000, false)
        and jsonb_typeof(w -> 'drehung') = 'number'
        and (w -> 'drehung') in ('0'::jsonb, '90'::jsonb, '180'::jsonb, '270'::jsonb)
    end,
    false)
$fn$;

-- Draussen: Spielplatz (Flaeche oder null), Tiefgarage (Rechteck oder
-- null), Wege (Linien). Fehlende Schluessel heissen: nichts davon.
create function public.siedlung_aussen_gueltig(a jsonb) returns boolean
language sql immutable set search_path = '' as $fn$
  select coalesce(
    case
      when a is null or jsonb_typeof(a) <> 'object' then false
      when octet_length(a::text) > 100000 then false
      when exists (
        select 1 from jsonb_object_keys(a) k where k not in ('spielplatz', 'tiefgarage', 'wege')
      ) then false
      else
        case
          when not (a ? 'spielplatz') or jsonb_typeof(a -> 'spielplatz') = 'null' then true
          else public.siedlung_punkte_gueltig(a -> 'spielplatz', 3, 200)
        end
        and case
          when not (a ? 'tiefgarage') or jsonb_typeof(a -> 'tiefgarage') = 'null' then true
          when jsonb_typeof(a -> 'tiefgarage') <> 'object' then false
          when exists (
            select 1 from jsonb_object_keys(a -> 'tiefgarage') k
            where k not in ('x', 'z', 'breite', 'laenge', 'drehung')
          ) then false
          else
            public.siedlung_zahl_gueltig(a -> 'tiefgarage' -> 'x', -5000, 5000, false)
            and public.siedlung_zahl_gueltig(a -> 'tiefgarage' -> 'z', -5000, 5000, false)
            and public.siedlung_zahl_gueltig(a -> 'tiefgarage' -> 'breite', 0.5, 200, false)
            and public.siedlung_zahl_gueltig(a -> 'tiefgarage' -> 'laenge', 0.5, 200, false)
            and public.siedlung_zahl_gueltig(a -> 'tiefgarage' -> 'drehung', -360, 360, false)
        end
        and case
          when not (a ? 'wege') then true
          when jsonb_typeof(a -> 'wege') <> 'array' then false
          when jsonb_array_length(a -> 'wege') > 100 then false
          else not exists (
            select 1 from jsonb_array_elements(a -> 'wege') l
            where not public.siedlung_punkte_gueltig(l, 2, 500)
          )
        end
    end,
    false)
$fn$;

-- Die Pruefungen laufen bei jedem Schreiben mit den Rechten des
-- Schreibenden. Ohne EXECUTE koennte niemand speichern (siehe 0006, 0043).
revoke execute on function
  public.siedlung_punkte_gueltig(jsonb, int, int),
  public.siedlung_zahl_gueltig(jsonb, numeric, numeric, boolean),
  public.siedlung_gebaeude_gueltig(jsonb),
  public.siedlung_wohnung_gueltig(jsonb),
  public.siedlung_aussen_gueltig(jsonb)
from public, anon;
grant execute on function
  public.siedlung_punkte_gueltig(jsonb, int, int),
  public.siedlung_zahl_gueltig(jsonb, numeric, numeric, boolean),
  public.siedlung_gebaeude_gueltig(jsonb),
  public.siedlung_wohnung_gueltig(jsonb),
  public.siedlung_aussen_gueltig(jsonb)
to authenticated, service_role;

-- ------------------------------------------------------------ 2. Tabelle

create table public.siedlungen (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null check (length(btrim(name)) between 1 and 80),
  lat        double precision not null check (lat between -90 and 90),
  lon        double precision not null check (lon between -180 and 180),
  gebaeude   jsonb not null default '[]'::jsonb,
  wohnung    jsonb,
  aussen     jsonb not null default '{"spielplatz": null, "tiefgarage": null, "wege": []}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint siedlungen_gebaeude_ok check (public.siedlung_gebaeude_gueltig(gebaeude)),
  constraint siedlungen_wohnung_ok check (public.siedlung_wohnung_gueltig(wohnung)),
  constraint siedlungen_aussen_ok check (public.siedlung_aussen_gueltig(aussen)),
  -- Die Wohnung liegt in einem Haus dieser Siedlung.
  constraint siedlungen_wohnung_haus check (
    wohnung is null
    or gebaeude @> jsonb_build_array(jsonb_build_object('id', wohnung -> 'gebaeudeId')))
);
create index siedlungen_owner_idx on public.siedlungen (owner_id, created_at);

create trigger siedlungen_touch before update on public.siedlungen
  for each row execute function public.touch_updated_at();

-- Hoechstens 20 Siedlungen je Konto, damit niemand die Datenbank fuellt.
-- Verweis auf einen Grundriss nur aus einem eigenen Umzug. Geprueft wird,
-- wenn der Verweis neu ist oder sich aendert; bleibt er gleich, darf der
-- Besitzer weiter speichern, auch wenn er den Umzug inzwischen verlassen
-- hat. Ohne angemeldetes Konto (SQL-Editor, Dienste) gibt es keine
-- Mitgliedschaft zu pruefen; dort arbeitet nur, wer die Datenbank verwaltet.
create function public.siedlungen_vorher()
returns trigger language plpgsql set search_path = public as $fn$
begin
  if auth.uid() is null then
    return new;
  end if;
  if tg_op = 'INSERT' and (select count(*) from public.siedlungen s where s.owner_id = new.owner_id) >= 20 then
    raise exception 'Hoechstens 20 Siedlungen je Konto'
      using errcode = 'check_violation';
  end if;
  if new.wohnung is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and (new.wohnung ->> 'grundrissId') is not distinct from (old.wohnung ->> 'grundrissId') then
    return new;
  end if;
  if not exists (
    select 1 from public.grundrisse g
     where g.id = public.try_uuid(new.wohnung ->> 'grundrissId')
       and public.is_member(g.project_id)
  ) then
    raise exception 'Dieser Grundriss gehoert zu keinem deiner Umzuege'
      using errcode = 'check_violation', hint = 'kistly:grundriss.grundriss_fehlt';
  end if;
  return new;
end $fn$;

create trigger siedlungen_vorher before insert or update on public.siedlungen
  for each row execute function public.siedlungen_vorher();

-- Trigger-Funktionen brauchen kein EXECUTE (0006).
revoke execute on function public.siedlungen_vorher() from public, anon;

-- ----------------------------------------------------- 3. Zeilen-Sicherheit

alter table public.siedlungen enable row level security;

create policy siedlungen_select on public.siedlungen for select to authenticated
  using (
    (owner_id = auth.uid() and public.ist_freigegeben())
    or exists (
      select 1 from public.grundrisse g
       where g.id = public.try_uuid(siedlungen.wohnung ->> 'grundrissId')
         and public.is_member(g.project_id)));
create policy siedlungen_insert on public.siedlungen for insert to authenticated
  with check (owner_id = auth.uid() and public.ist_freigegeben());
create policy siedlungen_update on public.siedlungen for update to authenticated
  using (owner_id = auth.uid() and public.ist_freigegeben())
  with check (owner_id = auth.uid() and public.ist_freigegeben());
create policy siedlungen_delete on public.siedlungen for delete to authenticated
  using (owner_id = auth.uid() and public.ist_freigegeben());

revoke all on public.siedlungen from anon;
