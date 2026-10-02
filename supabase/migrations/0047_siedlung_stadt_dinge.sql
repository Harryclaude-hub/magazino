-- 0047: Die Stadt um die Siedlung und Dinge zum Hinstellen (E87).
--
-- 1. siedlungen.stadt: die Umgebung einer Siedlung (Gelaende, Strassen,
--    Haeuser, Flaechen, Gewaesser, Zaeune, Baeume, Orte) aus OpenStreetMap
--    und einem Hoehenmodell, Form StadtDaten in src/lib/types.ts. Erzeugt
--    von scripts/stadt-aus-osm.mjs, eingetragen ueber den Datei-Import
--    (siedlungImport.ts, api.ts). Gross (einige MB), darum laedt die App
--    sie nur beim Oeffnen einer Siedlung, nie in der Liste. Die Datenbank
--    prueft nur Art und Groesse (siedlung_stadt_gueltig): ein Objekt mit
--    art 'kistly-stadt' und v 1, hoechstens 8 MB als Text. Den Aufbau
--    prueft die App (stadtPruefen in src/lib/stadt.ts) beim Import und beim
--    Laden; eine kaputte Stadt laesst sie weg, ohne die Siedlung zu
--    sperren. Wer die Zeile lesen und aendern darf, regeln 0044 und 0046
--    fuer die ganze Zeile; daran aendert sich nichts. Der Trigger
--    siedlungen_vorher (0044) sieht nur auf wohnung: ein Speichern der
--    Stadt allein laesst wohnung gleich und geht fuer den Besitzer durch.
--
-- 2. siedlung_dinge: wo Dinge und Fahrzeuge der Siedlung zuletzt
--    hingestellt wurden (DingLage3D in src/components/plan3d/vertrag3d.ts),
--    eine Zeile je bewegtes Ding. Welt-Meter, y = Unterkante, gier wie die
--    Blickrichtung, ebene = Kennung der Ebene in der Welt. Lesen duerfen
--    Besitzer und Gaeste (siedlung_darf, 0046); schreiben nur ueber
--    siedlung_ding_setzen, nie direkt. Geht die Siedlung, gehen ihre Dinge.
--
-- 3. siedlung_ding_setzen: prueft Zugang (kistly:siedlung.kein_zugriff),
--    Kennung und Zahlen (kistly:siedlung.ding_ungueltig) und hoechstens
--    5000 Dinge je Siedlung (kistly:siedlung.zu_viele_dinge) und schreibt
--    neu oder ueber die alte Lage. Wer zuletzt bewegt hat, steht in
--    geaendert_von. Was gleichzeitig die anderen sehen, laeuft wie die
--    Figuren ueber den Kanal 'siedlung:<Siedlung>' (0046); hier wird nur
--    gespeichert.

-- ------------------------------------------------------------ 1. Stadt

-- Null oder ein Objekt mit art 'kistly-stadt' und v 1, hoechstens 8 MB als
-- Text. Die Groesse vor dem Inhalt, CASE statt AND (wie 0044), und ein
-- fehlender Schluessel ergibt null und damit falsch (coalesce).
create function public.siedlung_stadt_gueltig(s jsonb) returns boolean
language sql immutable set search_path = '' as $fn$
  select coalesce(
    case
      when s is null then true
      when jsonb_typeof(s) <> 'object' then false
      when octet_length(s::text) > 8000000 then false
      else (s -> 'art') = '"kistly-stadt"'::jsonb and (s -> 'v') = '1'::jsonb
    end,
    false)
$fn$;

-- Die Pruefung laeuft bei jedem Schreiben mit den Rechten des Schreibenden.
-- Ohne EXECUTE koennte niemand speichern (siehe 0006, 0043, 0044).
revoke execute on function public.siedlung_stadt_gueltig(jsonb) from public, anon;
grant execute on function public.siedlung_stadt_gueltig(jsonb) to authenticated, service_role;

alter table public.siedlungen
  add column stadt jsonb,
  add constraint siedlungen_stadt_ok check (public.siedlung_stadt_gueltig(stadt));

-- ------------------------------------------------------------ 2. Dinge

-- Kennungen wie in der Welt ('ball-3', 'w123:g2:eimer'); Zahlen endlich
-- (NaN und unendlich fallen durch die Betragsgrenzen), in Metern hoechstens
-- 20 km vom Mittelpunkt und 2 km hoch.
create table public.siedlung_dinge (
  siedlung_id   uuid not null references public.siedlungen(id) on delete cascade,
  ding_id       text not null check (ding_id ~ '^[A-Za-z0-9:._-]{1,120}$'),
  art           text not null check (art in ('ding', 'fahrzeug')),
  x             double precision not null check (abs(x) <= 20000),
  y             double precision not null check (abs(y) <= 2000),
  z             double precision not null check (abs(z) <= 20000),
  gier          double precision not null check (abs(gier) < 'Infinity'::double precision),
  ebene         text not null check (length(ebene) <= 120),
  geaendert_von uuid references auth.users(id) on delete set null,
  updated_at    timestamptz not null default now(),
  primary key (siedlung_id, ding_id)
);

-- Die Siedlungen, in die das eigene Konto darf: dieselbe Regel wie
-- siedlung_darf (0046), aber alle auf einmal. Die Regel unten fragt so
-- einmal je Abfrage statt einmal je Zeile; der Probelauf brauchte mit
-- siedlung_darf je Zeile 1,7 s fuer 5000 Dinge.
create function public.siedlung_darf_alle() returns setof uuid
language sql stable security definer set search_path = public as $fn$
  select s.id from public.siedlungen s
   where s.owner_id = auth.uid() and public.ist_freigegeben()
  union
  select m.siedlung_id from public.siedlung_mitglieder m
   where m.user_id = auth.uid() and public.ist_freigegeben()
$fn$;

revoke execute on function public.siedlung_darf_alle() from public, anon, service_role;
grant execute on function public.siedlung_darf_alle() to authenticated;

alter table public.siedlung_dinge enable row level security;

-- Lesen: Besitzer und Gaeste (wie siedlung_darf, 0046). Schreiben nur ueber
-- siedlung_ding_setzen (security definer).
create policy siedlung_dinge_select on public.siedlung_dinge for select to authenticated
  using (siedlung_id in (select public.siedlung_darf_alle()));

revoke all on public.siedlung_dinge from public, anon;
revoke insert, update, delete, truncate, references, trigger on public.siedlung_dinge from authenticated;
grant select on public.siedlung_dinge to authenticated;

-- ------------------------------------------------------------ 3. Funktion

-- Ein Ding hinstellen: neu oder ueber die alte Lage desselben Dings. Nur
-- Besitzer und Gaeste mit freigeschaltetem Konto. Neue Kennungen ueber 5000
-- je Siedlung werden abgelehnt; eine Siedlung nach der anderen, damit zwei
-- gleichzeitige neue Dinge die Grenze nicht ueberholen.
create function public.siedlung_ding_setzen(
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
  end if;
  insert into public.siedlung_dinge as d (siedlung_id, ding_id, art, x, y, z, gier, ebene, geaendert_von, updated_at)
  values (p_siedlung, p_ding, p_art, p_x, p_y, p_z, p_gier, p_ebene, v_uid, now())
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

-- Ausfuehren duerfen nur angemeldete Konten (wie 0046).
revoke execute on function public.siedlung_ding_setzen(uuid, text, text, float8, float8, float8, float8, text)
from public, anon, service_role;
grant execute on function public.siedlung_ding_setzen(uuid, text, text, float8, float8, float8, float8, text)
to authenticated;
