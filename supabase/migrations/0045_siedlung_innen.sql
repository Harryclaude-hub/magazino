-- 0045: Die Siedlung innen (E84).
--
-- Wo die Plaene der Haeuser oeffentlich sind, zeigt eine Siedlung ihre
-- Haeuser auch innen: je Haus die Geschosse, je Geschoss die Wohnungen
-- (Raeume, Tueren und Fenster, Kueche und Bad wie im Plan, sonst leer) und
-- die allgemeinen Flaechen (Stiegenhaus, Aufzug, Gang, Laubengang). Die
-- Form steht in src/lib/types.ts (SiedlungInnenHaus und Verwandte):
-- Koordinaten in cm des Geschosses wie ein Kistly-Plan, die Lage des
-- Hauses in Metern der Siedlung wie die eigene Wohnung (0044).
--
-- Neu ist nur die Spalte public.siedlungen.innen (null = nichts innen).
-- Wer die Zeile lesen und aendern darf, regelt 0044 fuer die ganze Zeile;
-- an der Zeilen-Sicherheit und am Trigger aendert sich nichts. Welche
-- Wohnung die eigene ist, steht weiter nur in wohnung (0044), nie in
-- innen.
--
-- Die Datenbank prueft den Inhalt selbst (siedlung_innen_gueltig), mit
-- denselben Grenzen wie src/lib/siedlungInnen.ts (INNEN_GRENZEN,
-- siedlungInnenPruefen): nur bekannte Schluessel, Zahlen in Grenzen,
-- hoechstens 20 Haeuser und 2 MB. Die Groesse wird zuerst geprueft, danach
-- laeuft jede Ebene genau einmal ueber ihre Kinder; die Arbeit waechst also
-- mit der Groesse der Daten und nicht schneller. CASE statt AND, wo eine
-- Umwandlung an falschen Typen scheitern koennte (wie 0043, 0044), und
-- "is distinct from", wo ein fehlender Schluessel sonst als null durch
-- eine Bedingung rutschen wuerde. Raeume, Oeffnungen und Moebel prueft die
-- Wohnung selbst, ohne eigene Funktion je Teil: jeder Aufruf einer
-- Funktion mit festem search_path kostet Zeit, und eine Wohnung hat
-- Dutzende Teile (siehe Probelauf). Was Rechnen am Umriss braucht (Raum im
-- Uhrzeigersinn, Oeffnung passt auf ihre Kante), prueft nur die App.
--
-- Die Haeuser in innen muessen Haeuser der Siedlung sein (gebaeude, 0044);
-- wer ein Haus aus gebaeude loescht, muss es auch aus innen nehmen.

-- --------------------------------------------------------- 1. Pruefungen

-- Eine Liste von Punkten [x, y] in cm des Geschosses, p_min bis p_max
-- Stueck, jeder Wert hoechstens 1 km (100000 cm) vom Ursprung.
create function public.siedlung_innen_punkte_gueltig(p jsonb, p_min int, p_max int) returns boolean
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
          else abs((e ->> 0)::numeric) > 100000 or abs((e ->> 1)::numeric) > 100000
        end)
    end,
    false)
$fn$;

-- Eine Wohnung: genau die Schluessel von SiedlungInnenWohnung. eingang ist
-- null oder ein Punkt [x, y]. Darin:
--   Raum: genau name, art, punkte (3 bis 200 Punkte).
--   Oeffnung: Tuer, Fenster oder Durchgang; raum zeigt auf einen Raum der
--     Wohnung, kante auf eine Kante dieses Raums.
--   Moebel (Kueche, Bad): Ecke (x, y), Breite, Tiefe, Drehung.
-- Jede Bedingung meldet "kaputt" (true); erst wenn alle sechs Zahlen einer
-- Oeffnung Zahlen sind, wird umgewandelt (2.0 ueber numeric zu int).
create function public.siedlung_innen_wohnung_gueltig(w jsonb) returns boolean
language sql immutable set search_path = '' as $fn$
  select coalesce(
    case
      when w is null or jsonb_typeof(w) <> 'object' then false
      when exists (
        select 1 from jsonb_object_keys(w) k
        where k not in ('top', 'typ', 'raeume', 'oeffnungen', 'moebel', 'eingang')
      ) then false
      when not (w ? 'eingang') then false
      when jsonb_typeof(w -> 'raeume') is distinct from 'array'
        or jsonb_typeof(w -> 'oeffnungen') is distinct from 'array'
        or jsonb_typeof(w -> 'moebel') is distinct from 'array' then false
      when jsonb_array_length(w -> 'raeume') not between 1 and 100 then false
      when jsonb_array_length(w -> 'oeffnungen') > 400 then false
      when jsonb_array_length(w -> 'moebel') > 200 then false
      when jsonb_typeof(w -> 'top') is distinct from 'string' or length(w ->> 'top') not between 1 and 20 then false
      when jsonb_typeof(w -> 'typ') is distinct from 'string' or length(w ->> 'typ') > 40 then false
      when jsonb_typeof(w -> 'eingang') <> 'null'
        and not public.siedlung_innen_punkte_gueltig(jsonb_build_array(w -> 'eingang'), 1, 1) then false
      -- Raeume
      when exists (
        select 1 from jsonb_array_elements(w -> 'raeume') r
        where case
          when jsonb_typeof(r) <> 'object' then true
          when exists (
            select 1 from jsonb_object_keys(r) k where k not in ('name', 'art', 'punkte')
          ) then true
          when jsonb_typeof(r -> 'name') is distinct from 'string' or length(r ->> 'name') > 80 then true
          when jsonb_typeof(r -> 'art') is distinct from 'string' or (r ->> 'art') not in ('innen', 'draussen') then true
          when jsonb_typeof(r -> 'punkte') is distinct from 'array' then true
          when jsonb_array_length(r -> 'punkte') not between 3 and 200 then true
          else exists (
            select 1 from jsonb_array_elements(r -> 'punkte') e
            where case
              when jsonb_typeof(e) <> 'array' then true
              when jsonb_array_length(e) <> 2 then true
              when jsonb_typeof(e -> 0) <> 'number' or jsonb_typeof(e -> 1) <> 'number' then true
              else abs((e ->> 0)::numeric) > 100000 or abs((e ->> 1)::numeric) > 100000
            end)
        end) then false
      -- Oeffnungen
      when exists (
        select 1 from jsonb_array_elements(w -> 'oeffnungen') o
        where case
          when jsonb_typeof(o) <> 'object' then true
          when exists (
            select 1 from jsonb_object_keys(o) k
            where k not in ('raum', 'art', 'kante', 'abstand_cm', 'breite_cm', 'hoehe_cm', 'bruestung_cm', 'anschlag', 'aufschlag')
          ) then true
          when jsonb_typeof(o -> 'raum') is distinct from 'number'
            or jsonb_typeof(o -> 'kante') is distinct from 'number'
            or jsonb_typeof(o -> 'abstand_cm') is distinct from 'number'
            or jsonb_typeof(o -> 'breite_cm') is distinct from 'number'
            or jsonb_typeof(o -> 'hoehe_cm') is distinct from 'number'
            or jsonb_typeof(o -> 'bruestung_cm') is distinct from 'number' then true
          when (o ->> 'raum')::numeric not between 0 and 99
            or (o ->> 'raum')::numeric <> trunc((o ->> 'raum')::numeric) then true
          when (o ->> 'kante')::numeric not between 0 and 199
            or (o ->> 'kante')::numeric <> trunc((o ->> 'kante')::numeric) then true
          when (o ->> 'abstand_cm')::numeric not between 0 and 100000 then true
          when (o ->> 'breite_cm')::numeric not between 1 and 2000 then true
          when (o ->> 'hoehe_cm')::numeric not between 1 and 1000 then true
          when (o ->> 'bruestung_cm')::numeric not between 0 and 1000 then true
          when (o ->> 'raum')::numeric::int >= jsonb_array_length(w -> 'raeume') then true
          when jsonb_typeof(w -> 'raeume' -> ((o ->> 'raum')::numeric::int) -> 'punkte') is distinct from 'array' then true
          when (o ->> 'kante')::numeric::int >= jsonb_array_length(w -> 'raeume' -> ((o ->> 'raum')::numeric::int) -> 'punkte') then true
          when jsonb_typeof(o -> 'art') is distinct from 'string' or (o ->> 'art') not in ('tuer', 'fenster', 'durchgang') then true
          when jsonb_typeof(o -> 'anschlag') is distinct from 'string' or (o ->> 'anschlag') not in ('links', 'rechts') then true
          when jsonb_typeof(o -> 'aufschlag') is distinct from 'string' or (o ->> 'aufschlag') not in ('innen', 'aussen') then true
          else false
        end) then false
      -- Moebel
      when exists (
        select 1 from jsonb_array_elements(w -> 'moebel') m
        where case
          when jsonb_typeof(m) <> 'object' then true
          when exists (
            select 1 from jsonb_object_keys(m) k
            where k not in ('name', 'x', 'y', 'breite_cm', 'tiefe_cm', 'drehung')
          ) then true
          when jsonb_typeof(m -> 'name') is distinct from 'string' or length(m ->> 'name') not between 1 and 80 then true
          when jsonb_typeof(m -> 'x') is distinct from 'number'
            or jsonb_typeof(m -> 'y') is distinct from 'number'
            or jsonb_typeof(m -> 'breite_cm') is distinct from 'number'
            or jsonb_typeof(m -> 'tiefe_cm') is distinct from 'number'
            or jsonb_typeof(m -> 'drehung') is distinct from 'number' then true
          when abs((m ->> 'x')::numeric) > 100000 or abs((m ->> 'y')::numeric) > 100000 then true
          when (m ->> 'breite_cm')::numeric not between 1 and 2000 then true
          when (m ->> 'tiefe_cm')::numeric not between 1 and 2000 then true
          else (m -> 'drehung') not in ('0'::jsonb, '90'::jsonb, '180'::jsonb, '270'::jsonb)
        end) then false
      else true
    end,
    false)
$fn$;

-- Ein Geschoss: Nummer (0 = Erdgeschoss, negativ = Keller), hoechstens 100
-- Wohnungen und 50 allgemeine Flaechen.
create function public.siedlung_innen_geschoss_gueltig(g jsonb) returns boolean
language sql immutable set search_path = '' as $fn$
  select coalesce(
    case
      when g is null or jsonb_typeof(g) <> 'object' then false
      when exists (
        select 1 from jsonb_object_keys(g) k where k not in ('geschoss', 'wohnungen', 'allgemein')
      ) then false
      when jsonb_typeof(g -> 'wohnungen') is distinct from 'array'
        or jsonb_typeof(g -> 'allgemein') is distinct from 'array' then false
      when jsonb_array_length(g -> 'wohnungen') > 100 then false
      when jsonb_array_length(g -> 'allgemein') > 50 then false
      else
        public.siedlung_zahl_gueltig(g -> 'geschoss', -5, 60, true)
        and not exists (
          select 1 from jsonb_array_elements(g -> 'wohnungen') w
          where not public.siedlung_innen_wohnung_gueltig(w))
        and not exists (
          select 1 from jsonb_array_elements(g -> 'allgemein') a
          where not coalesce(
            case
              when jsonb_typeof(a) <> 'object' then false
              when exists (
                select 1 from jsonb_object_keys(a) k where k not in ('art', 'punkte')
              ) then false
              else
                jsonb_typeof(a -> 'art') = 'string'
                and (a ->> 'art') in ('stiege', 'aufzug', 'gang', 'laubengang')
                and public.siedlung_innen_punkte_gueltig(a -> 'punkte', 3, 200)
            end,
            false))
    end,
    false)
$fn$;

-- Die ganze Spalte: null oder eine Liste von hoechstens 20 Haeusern mit
-- genau den Schluesseln von SiedlungInnenHaus, jede gebaeudeId und jedes
-- Geschoss eines Hauses nur einmal, zusammen hoechstens 2 MB.
create function public.siedlung_innen_gueltig(i jsonb) returns boolean
language sql immutable set search_path = '' as $fn$
  select coalesce(
    case
      when i is null then true
      when jsonb_typeof(i) <> 'array' then false
      when jsonb_array_length(i) > 20 then false
      when octet_length(i::text) > 2000000 then false
      when (select count(distinct h ->> 'gebaeudeId') from jsonb_array_elements(i) h) <> jsonb_array_length(i) then false
      else not exists (
        select 1 from jsonb_array_elements(i) h
        where not coalesce(
          case
            when jsonb_typeof(h) <> 'object' then false
            when exists (
              select 1 from jsonb_object_keys(h) k
              where k not in ('gebaeudeId', 'x', 'z', 'drehung', 'geschosse')
            ) then false
            when jsonb_typeof(h -> 'geschosse') is distinct from 'array' then false
            when jsonb_array_length(h -> 'geschosse') > 60 then false
            when (select count(distinct g -> 'geschoss') from jsonb_array_elements(h -> 'geschosse') g)
                 <> jsonb_array_length(h -> 'geschosse') then false
            else
              jsonb_typeof(h -> 'gebaeudeId') = 'string' and length(h ->> 'gebaeudeId') between 1 and 64
              and public.siedlung_zahl_gueltig(h -> 'x', -5000, 5000, false)
              and public.siedlung_zahl_gueltig(h -> 'z', -5000, 5000, false)
              and jsonb_typeof(h -> 'drehung') = 'number'
              and (h -> 'drehung') in ('0'::jsonb, '90'::jsonb, '180'::jsonb, '270'::jsonb)
              and not exists (
                select 1 from jsonb_array_elements(h -> 'geschosse') g
                where not public.siedlung_innen_geschoss_gueltig(g))
          end,
          false))
    end,
    false)
$fn$;

-- Jedes Haus in innen ist ein Haus der Siedlung (gebaeude, 0044).
create function public.siedlung_innen_haeuser_da(i jsonb, g jsonb) returns boolean
language sql immutable set search_path = '' as $fn$
  select coalesce(
    case
      when i is null then true
      when jsonb_typeof(i) <> 'array' then false
      when g is null or jsonb_typeof(g) <> 'array' then false
      else not exists (
        select 1 from jsonb_array_elements(i) h
        where jsonb_typeof(h -> 'gebaeudeId') is distinct from 'string'
           or not (g @> jsonb_build_array(jsonb_build_object('id', h -> 'gebaeudeId'))))
    end,
    false)
$fn$;

-- Die Pruefungen laufen bei jedem Schreiben mit den Rechten des
-- Schreibenden. Ohne EXECUTE koennte niemand speichern (siehe 0006, 0043,
-- 0044).
revoke execute on function
  public.siedlung_innen_punkte_gueltig(jsonb, int, int),
  public.siedlung_innen_wohnung_gueltig(jsonb),
  public.siedlung_innen_geschoss_gueltig(jsonb),
  public.siedlung_innen_gueltig(jsonb),
  public.siedlung_innen_haeuser_da(jsonb, jsonb)
from public, anon;
grant execute on function
  public.siedlung_innen_punkte_gueltig(jsonb, int, int),
  public.siedlung_innen_wohnung_gueltig(jsonb),
  public.siedlung_innen_geschoss_gueltig(jsonb),
  public.siedlung_innen_gueltig(jsonb),
  public.siedlung_innen_haeuser_da(jsonb, jsonb)
to authenticated, service_role;

-- ------------------------------------------------------------ 2. Spalte

alter table public.siedlungen
  add column innen jsonb,
  add constraint siedlungen_innen_ok check (public.siedlung_innen_gueltig(innen)),
  add constraint siedlungen_innen_haus check (public.siedlung_innen_haeuser_da(innen, gebaeude));
