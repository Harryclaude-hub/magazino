-- =====================================================================
-- Kistly 0028_grundriss_modell
--
-- Neues Ortsmodell in ganzen Zentimetern (START 5.1, 5.2):
--   grundrisse  mehrere je Umzug
--   raeume      Polygon im Uhrzeigersinn, Hoehe, innen/draussen, Farben
--   oeffnungen  Tuer oder Fenster an (Raum, Kante, Abstand)
--   objekte     Moebel, Regal, Schrank; Regal und Schrank mit Faechern
--   items       Platz: Raum, Mittelpunkt, Drehung, genau eine Unterlage
--
-- Die Datenbank prueft jede Regel (Punkt im Polygon, Unterlage, Hoehe,
-- Faecher). Hoehen werden nie gespeichert, nur abgeleitet (kiste_basis).
-- Dieselben Regeln stehen als Spiegel in src/lib/geometrie.ts; Aenderungen
-- immer an beiden Stellen.
--
-- Das alte Raster (room_plans, regale, items.plan_*) bleibt unberuehrt;
-- 0029 rechnet es um und friert es ein, 0031 entfernt es.
-- =====================================================================

-- ============================================================ 1. Tabellen
create table public.grundrisse (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name       text not null check (length(btrim(name)) between 1 and 60),
  sort       int  not null default 0,
  version    int  not null default 0,   -- zaehlt nur grundriss_speichern hoch
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index grundrisse_project_idx on public.grundrisse (project_id, sort, created_at);

create table public.raeume (
  id           uuid primary key default gen_random_uuid(),
  grundriss_id uuid not null references public.grundrisse(id) on delete cascade,
  project_id   uuid not null references public.projects(id) on delete cascade,   -- setzt der Trigger
  tag_id       uuid references public.tags(id) on delete set null,                -- Kistly-Zimmer oder leer
  name         text not null default '' check (length(name) <= 60),               -- fuer Raeume ohne Zimmer
  art          text not null default 'innen' check (art in ('innen', 'draussen')),
  punkte       int[] not null,                                                     -- [x0,y0,x1,y1,...]
  hoehe_cm     int  not null default 250 check (hoehe_cm between 50 and 600),
  bodenfarbe   text check (bodenfarbe is null or bodenfarbe ~ '^#[0-9A-Fa-f]{6}$'),
  wandfarben   text[],                                                             -- je Kante, null = Standard
  sort         int  not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint raeume_punkte_form check (
    array_ndims(punkte) = 1 and array_length(punkte, 1) between 6 and 400
    and array_length(punkte, 1) % 2 = 0),
  constraint raeume_wandfarben_check check (
    wandfarben is null or array_length(wandfarben, 1) * 2 = array_length(punkte, 1))
);
-- Ein Zimmer hoechstens einmal je Grundriss; in alter und neuer Wohnung darf es je einmal vorkommen.
create unique index raeume_tag_je_grundriss on public.raeume (grundriss_id, tag_id) where tag_id is not null;
create index raeume_grundriss_idx on public.raeume (grundriss_id);
create index raeume_tag_idx on public.raeume (tag_id) where tag_id is not null;

create table public.oeffnungen (
  id           uuid primary key default gen_random_uuid(),
  raum_id      uuid not null references public.raeume(id) on delete cascade,
  project_id   uuid not null references public.projects(id) on delete cascade,
  art          text not null check (art in ('tuer', 'fenster')),   -- Farbe fest: Tuer orange, Fenster blau
  kante        int  not null check (kante >= 0),
  abstand_cm   int  not null check (abstand_cm >= 0),
  breite_cm    int  not null check (breite_cm between 20 and 600),
  hoehe_cm     int  not null check (hoehe_cm between 20 and 600),
  bruestung_cm int  not null default 0 check (bruestung_cm between 0 and 400),
  anschlag     text not null default 'links' check (anschlag in ('links', 'rechts')),   -- nur Zeichnung
  aufschlag    text not null default 'innen' check (aufschlag in ('innen', 'aussen')),  -- nur Zeichnung
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint oeffnungen_tuer_boden check (art = 'fenster' or bruestung_cm = 0)
);
create index oeffnungen_raum_idx on public.oeffnungen (raum_id, kante);

create table public.objekte (
  id                   uuid primary key default gen_random_uuid(),
  raum_id              uuid not null references public.raeume(id) on delete cascade,
  project_id           uuid not null references public.projects(id) on delete cascade,
  art                  text not null check (art in ('moebel', 'regal', 'schrank')),
  name                 text not null default '' check (length(name) <= 60),
  x                    int  not null check (x between 0 and 50000),   -- lokaler Ursprung
  y                    int  not null check (y between 0 and 50000),
  breite_cm            int  not null check (breite_cm between 5 and 2000),
  tiefe_cm             int  not null check (tiefe_cm  between 5 and 2000),
  hoehe_cm             int  not null check (hoehe_cm  between 1 and 600),
  drehung              smallint not null default 0 check (drehung in (0, 90, 180, 270)),
  form                 text not null default 'rechteck' check (form in ('rechteck', 'l')),
  ausschnitt_breite_cm int,
  ausschnitt_tiefe_cm  int,
  ausschnitt_ecke      text check (ausschnitt_ecke in ('lo', 'ro', 'ru', 'lu')),
  brett_cm             int[],                                  -- nur regal/schrank
  spalten              smallint not null default 1 check (spalten between 1 and 20),
  farbe                text check (farbe is null or farbe ~ '^#[0-9A-Fa-f]{6}$'),
  item_id              uuid references public.items(id) on delete set null,   -- Moebel-Eintrag
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint objekte_l_form_check check (
       (form = 'rechteck' and num_nonnulls(ausschnitt_breite_cm, ausschnitt_tiefe_cm, ausschnitt_ecke) = 0)
    or (form = 'l' and art = 'moebel'
        and ausschnitt_breite_cm between 1 and breite_cm - 1
        and ausschnitt_tiefe_cm  between 1 and tiefe_cm - 1
        and ausschnitt_ecke is not null)),
  constraint objekte_faecher_check check (
       (art = 'moebel' and brett_cm is null and spalten = 1)
    or (art in ('regal', 'schrank') and brett_cm is not null
        and array_ndims(brett_cm) = 1 and array_length(brett_cm, 1) between 1 and 30))
);
create index objekte_raum_idx on public.objekte (raum_id);
create unique index objekte_item_key on public.objekte (item_id) where item_id is not null;

-- ====================================================== 2. Platz an items
alter table public.items
  add column platz_raum_id       uuid references public.raeume(id) on delete set null,
  add column platz_x             int,
  add column platz_y             int,
  add column platz_drehung       smallint,
  add column unterlage_art       text,
  add column unterlage_item_id   uuid references public.items(id) on delete set null,
  add column unterlage_objekt_id uuid references public.objekte(id) on delete set null,
  add column fach_ebene          smallint,
  add column fach_spalte         smallint;

-- "on delete set null" trifft nur eine Spalte; items_platz_pruefen leert
-- dann den ganzen Platz, bevor dieser Check greift (Falle aus 0018/0019).
alter table public.items add constraint items_platz_check check (
  (platz_raum_id is null
     and num_nonnulls(platz_x, platz_y, platz_drehung, unterlage_art, unterlage_item_id,
                      unterlage_objekt_id, fach_ebene, fach_spalte) = 0)
  or (platz_raum_id is not null
     and platz_x between 0 and 50000 and platz_y between 0 and 50000
     and platz_drehung in (0, 90)
     and (   (unterlage_art = 'boden'  and num_nonnulls(unterlage_item_id, unterlage_objekt_id, fach_ebene, fach_spalte) = 0)
          or (unterlage_art = 'kiste'  and unterlage_item_id is not null
                                       and num_nonnulls(unterlage_objekt_id, fach_ebene, fach_spalte) = 0)
          or (unterlage_art = 'objekt' and unterlage_objekt_id is not null
                                       and num_nonnulls(unterlage_item_id, fach_ebene, fach_spalte) = 0)
          or (unterlage_art = 'fach'   and unterlage_objekt_id is not null and unterlage_item_id is null
                                       and fach_ebene >= 1 and fach_spalte >= 1))));

create index items_platz_raum_idx on public.items (platz_raum_id) where platz_raum_id is not null;
create index items_unterlage_item_idx on public.items (unterlage_item_id) where unterlage_item_id is not null;
create index items_unterlage_objekt_idx on public.items (unterlage_objekt_id) where unterlage_objekt_id is not null;

-- ==================================================== 3. Geometrie (Spiegel: src/lib/geometrie.ts)
-- Punkt i (0-basiert) steht in p[2i+1], p[2i+2]. Kante k: Punkt k -> Punkt (k+1) % n.

-- Doppelte vorzeichenbehaftete Flaeche. > 0 heisst: im Uhrzeigersinn am Bildschirm.
create function public.geo_flaeche2(p int[]) returns bigint
language sql immutable parallel safe set search_path = public as $fn$
  select coalesce(sum(p[2*i+1]::bigint * p[2*((i+1) % m.n)+2]
                    - p[2*((i+1) % m.n)+1]::bigint * p[2*i+2]), 0)
    from (select array_length(p, 1) / 2 as n) m, generate_series(0, m.n - 1) i
$fn$;

-- Beruehren oder schneiden sich zwei geschlossene Strecken?
create function public.geo_strecken_schneiden(
  p1x bigint, p1y bigint, p2x bigint, p2y bigint,
  q1x bigint, q1y bigint, q2x bigint, q2y bigint)
returns boolean language plpgsql immutable parallel safe set search_path = public as $fn$
declare
  d1 int := sign((q2x - q1x) * (p1y - q1y) - (q2y - q1y) * (p1x - q1x))::int;
  d2 int := sign((q2x - q1x) * (p2y - q1y) - (q2y - q1y) * (p2x - q1x))::int;
  d3 int := sign((p2x - p1x) * (q1y - p1y) - (p2y - p1y) * (q1x - p1x))::int;
  d4 int := sign((p2x - p1x) * (q2y - p1y) - (p2y - p1y) * (q2x - p1x))::int;
begin
  if d1 * d2 < 0 and d3 * d4 < 0 then return true; end if;
  if d1 = 0 and p1x between least(q1x, q2x) and greatest(q1x, q2x)
            and p1y between least(q1y, q2y) and greatest(q1y, q2y) then return true; end if;
  if d2 = 0 and p2x between least(q1x, q2x) and greatest(q1x, q2x)
            and p2y between least(q1y, q2y) and greatest(q1y, q2y) then return true; end if;
  if d3 = 0 and q1x between least(p1x, p2x) and greatest(p1x, p2x)
            and q1y between least(p1y, p2y) and greatest(p1y, p2y) then return true; end if;
  if d4 = 0 and q2x between least(p1x, p2x) and greatest(p1x, p2x)
            and q2y between least(p1y, p2y) and greatest(p1y, p2y) then return true; end if;
  return false;
end $fn$;

-- null = gueltig, sonst 'punkte' | 'bereich' | 'doppelt' | 'kreuzt' | 'umlauf'
-- (gleiche Kennungen, gleiche Reihenfolge wie polygonFehler in geometrie.ts)
create function public.geo_polygon_fehler(p int[]) returns text
language plpgsql immutable parallel safe set search_path = public as $fn$
declare
  n int; i int; j int; k int;
  x1 bigint; y1 bigint; x2 bigint; y2 bigint; x3 bigint; y3 bigint;
begin
  if p is null or array_ndims(p) <> 1 or array_length(p, 1) % 2 <> 0
     or array_length(p, 1) < 6 or array_length(p, 1) > 400 then
    return 'punkte';
  end if;
  n := array_length(p, 1) / 2;
  for i in 1 .. 2 * n loop
    if p[i] is null or p[i] < 0 or p[i] > 50000 then return 'bereich'; end if;
  end loop;
  for i in 0 .. n - 1 loop
    j := (i + 1) % n;
    if p[2*i+1] = p[2*j+1] and p[2*i+2] = p[2*j+2] then return 'doppelt'; end if;
  end loop;
  -- Zwei Nachbarkanten duerfen nicht aufeinander zuruecklaufen.
  for i in 0 .. n - 1 loop
    j := (i + 1) % n; k := (i + 2) % n;
    x1 := p[2*i+1]; y1 := p[2*i+2]; x2 := p[2*j+1]; y2 := p[2*j+2]; x3 := p[2*k+1]; y3 := p[2*k+2];
    if (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1) = 0
       and (x2 - x1) * (x3 - x2) + (y2 - y1) * (y3 - y2) < 0 then
      return 'kreuzt';
    end if;
  end loop;
  -- Nicht benachbarte Kanten beruehren sich nicht.
  for i in 0 .. n - 1 loop
    for j in i + 1 .. n - 1 loop
      if j = i + 1 or (i = 0 and j = n - 1) then continue; end if;
      if public.geo_strecken_schneiden(
           p[2*i+1], p[2*i+2], p[2*((i+1) % n)+1], p[2*((i+1) % n)+2],
           p[2*j+1], p[2*j+2], p[2*((j+1) % n)+1], p[2*((j+1) % n)+2]) then
        return 'kreuzt';
      end if;
    end loop;
  end loop;
  if public.geo_flaeche2(p) <= 0 then return 'umlauf'; end if;
  return null;
end $fn$;

-- 1 innen, 0 auf dem Rand, -1 aussen. f skaliert das Polygon (f = 2 fuer halbe cm).
create function public.geo_punkt_lage(p int[], px bigint, py bigint, f int default 1)
returns smallint language plpgsql immutable parallel safe set search_path = public as $fn$
declare
  n int := array_length(p, 1) / 2; i int; j int;
  xi bigint; yi bigint; xj bigint; yj bigint; k bigint;
  drin boolean := false;
begin
  for i in 0 .. n - 1 loop
    j := (i + n - 1) % n;
    xi := f::bigint * p[2*i+1]; yi := f::bigint * p[2*i+2];
    xj := f::bigint * p[2*j+1]; yj := f::bigint * p[2*j+2];
    if (xj - xi) * (py - yi) = (yj - yi) * (px - xi)
       and px between least(xi, xj) and greatest(xi, xj)
       and py between least(yi, yj) and greatest(yi, yj) then
      return 0;
    end if;
    if (yi > py) <> (yj > py) then
      k := (xj - xi) * (py - yi) - (px - xi) * (yj - yi);
      if (k > 0) = (yj > yi) then drin := not drin; end if;
    end if;
  end loop;
  return case when drin then 1 else -1 end;
end $fn$;

-- Rand zaehlt als drinnen.
create function public.geo_punkt_im_polygon(p int[], px int, py int) returns boolean
language sql immutable parallel safe set search_path = public as $fn$
  select public.geo_punkt_lage(p, px, py, 1) >= 0
$fn$;

-- Trifft die Strecke das OFFENE Rechteck (x0,x1) x (y0,y1)? Beruehren zaehlt nicht.
create function public.geo_strecke_trifft_offen(
  sx1 bigint, sy1 bigint, sx2 bigint, sy2 bigint,
  rx0 bigint, ry0 bigint, rx1 bigint, ry1 bigint)
returns boolean language sql immutable parallel safe set search_path = public as $fn$
  select not (
       greatest(sx1, sx2) <= rx0 or least(sx1, sx2) >= rx1
    or greatest(sy1, sy2) <= ry0 or least(sy1, sy2) >= ry1
    or least(s.a, s.b, s.c, s.d) >= 0 or greatest(s.a, s.b, s.c, s.d) <= 0)
  from (select
      sign((sx2 - sx1) * (ry0 - sy1) - (sy2 - sy1) * (rx0 - sx1)) as a,
      sign((sx2 - sx1) * (ry0 - sy1) - (sy2 - sy1) * (rx1 - sx1)) as b,
      sign((sx2 - sx1) * (ry1 - sy1) - (sy2 - sy1) * (rx1 - sx1)) as c,
      sign((sx2 - sx1) * (ry1 - sy1) - (sy2 - sy1) * (rx0 - sx1)) as d) s
$fn$;

-- Liegt das Rechteck ganz im Polygon (Beruehren der Wand erlaubt)?
-- Mitte echt innen UND keine Polygonkante im offenen Rechteck.
create function public.geo_rechteck_im_polygon(p int[], x0 int, y0 int, x1 int, y1 int)
returns boolean language plpgsql immutable parallel safe set search_path = public as $fn$
declare
  n int := array_length(p, 1) / 2; i int; j int;
begin
  if x0 >= x1 or y0 >= y1 then return false; end if;
  if public.geo_punkt_lage(p, x0::bigint + x1, y0::bigint + y1, 2) <> 1 then return false; end if;
  for i in 0 .. n - 1 loop
    j := (i + 1) % n;
    if public.geo_strecke_trifft_offen(p[2*i+1], p[2*i+2], p[2*j+1], p[2*j+2], x0, y0, x1, y1) then
      return false;
    end if;
  end loop;
  return true;
end $fn$;

-- Laenge von Kante k im Quadrat (keine Wurzel, ganzzahlig).
create function public.geo_kante_laenge2(p int[], k int) returns bigint
language plpgsql immutable parallel safe set search_path = public as $fn$
declare
  n int := array_length(p, 1) / 2;
  j int := (k + 1) % n;
  dx bigint := p[2*j+1] - p[2*k+1];
  dy bigint := p[2*j+2] - p[2*k+2];
begin
  return dx * dx + dy * dy;
end $fn$;

-- ======================================================= 4. Kisten
-- Liegt Punkt (px,py) ueber der Grundflaeche einer Kiste mit Mitte (ux,uy)?
create function public.kiste_traegt(p_ux int, p_uy int, p_udreh smallint,
  p_ulaenge int, p_ubreite int, p_x int, p_y int)
returns boolean language sql immutable parallel safe set search_path = public as $fn$
  select abs(2 * (p_x - p_ux)) <= case when p_udreh = 90 then p_ubreite else p_ulaenge end
     and abs(2 * (p_y - p_uy)) <= case when p_udreh = 90 then p_ulaenge else p_ubreite end
$fn$;

-- ======================================================= 5. Objekte
create function public.objekt_lokal(o public.objekte, p_x int, p_y int, out lx int, out ly int)
language sql immutable parallel safe set search_path = public as $fn$
  select case o.drehung when 0 then p_x - o.x when 90 then p_y - o.y
                        when 180 then o.x - p_x else o.y - p_y end,
         case o.drehung when 0 then p_y - o.y when 90 then o.x - p_x
                        when 180 then o.y - p_y else p_x - o.x end
$fn$;

create function public.objekt_global(o public.objekte, p_lx int, p_ly int, out x int, out y int)
language sql immutable parallel safe set search_path = public as $fn$
  select case o.drehung when 0 then o.x + p_lx when 90 then o.x - p_ly
                        when 180 then o.x - p_lx else o.x + p_ly end,
         case o.drehung when 0 then o.y + p_ly when 90 then o.y + p_lx
                        when 180 then o.y - p_ly else o.y - p_lx end
$fn$;

-- Punkt in der Objektflaeche (Rand zaehlt, echtes Inneres des L-Ausschnitts nicht).
create function public.objekt_enthaelt(o public.objekte, p_x int, p_y int) returns boolean
language sql immutable parallel safe set search_path = public as $fn$
  select l.lx between 0 and o.breite_cm and l.ly between 0 and o.tiefe_cm
     and not (o.form = 'l' and case o.ausschnitt_ecke
           when 'lo' then l.lx < o.ausschnitt_breite_cm and l.ly < o.ausschnitt_tiefe_cm
           when 'ro' then l.lx > o.breite_cm - o.ausschnitt_breite_cm and l.ly < o.ausschnitt_tiefe_cm
           when 'ru' then l.lx > o.breite_cm - o.ausschnitt_breite_cm and l.ly > o.tiefe_cm - o.ausschnitt_tiefe_cm
           else           l.lx < o.ausschnitt_breite_cm and l.ly > o.tiefe_cm - o.ausschnitt_tiefe_cm
         end)
    from public.objekt_lokal(o, p_x, p_y) l
$fn$;

-- Punkt in Spalte s eines Regals oder Schranks (und innerhalb der Tiefe).
create function public.objekt_im_fach(o public.objekte, p_spalte int, p_x int, p_y int) returns boolean
language sql immutable parallel safe set search_path = public as $fn$
  select l.ly between 0 and o.tiefe_cm
     and o.spalten * l.lx >= (p_spalte - 1) * (o.breite_cm + 2)
     and o.spalten * l.lx <= p_spalte * (o.breite_cm + 2) - 2 * o.spalten
    from public.objekt_lokal(o, p_x, p_y) l
$fn$;

-- Bis wohin eine Ebene reicht: Unterkante des naechsten Bretts (2 cm), oben 2 cm Deckel.
create function public.fach_decke(o public.objekte, p_ebene int) returns int
language sql immutable parallel safe set search_path = public as $fn$
  select case when p_ebene < array_length(o.brett_cm, 1)
              then o.brett_cm[p_ebene + 1] - 2 else o.hoehe_cm - 2 end
$fn$;

create function public.faecher_gueltig(p_brett int[], p_hoehe int) returns boolean
language plpgsql immutable parallel safe set search_path = public as $fn$
declare
  n int := coalesce(array_length(p_brett, 1), 0); i int;
begin
  if n < 1 or n > 30 or p_brett[1] is null or p_brett[1] < 0 then return false; end if;
  for i in 2 .. n loop
    if p_brett[i] is null or p_brett[i] - p_brett[i - 1] < 3 then return false; end if;
  end loop;
  return p_hoehe - p_brett[n] >= 3;
end $fn$;

-- Die Flaeche als achsparallele Rechtecke in Grundriss-cm (1 bei Rechteck, 2 bei L).
create function public.objekt_rechtecke(o public.objekte)
returns table (x0 int, y0 int, x1 int, y1 int)
language sql immutable parallel safe set search_path = public as $fn$
  with m as (
    select coalesce(o.ausschnitt_breite_cm, 0) as aw, coalesce(o.ausschnitt_tiefe_cm, 0) as ad,
           o.breite_cm as bw, o.tiefe_cm as bd),
  lokal as (
              select 0 as a, 0 as b, bw as c, bd as d from m where o.form = 'rechteck'
    union all select aw, 0, bw, ad        from m where o.form = 'l' and o.ausschnitt_ecke = 'lo'
    union all select 0, ad, bw, bd        from m where o.form = 'l' and o.ausschnitt_ecke = 'lo'
    union all select 0, 0, bw - aw, ad    from m where o.form = 'l' and o.ausschnitt_ecke = 'ro'
    union all select 0, ad, bw, bd        from m where o.form = 'l' and o.ausschnitt_ecke = 'ro'
    union all select 0, 0, bw, bd - ad    from m where o.form = 'l' and o.ausschnitt_ecke = 'ru'
    union all select 0, bd - ad, bw - aw, bd from m where o.form = 'l' and o.ausschnitt_ecke = 'ru'
    union all select 0, 0, bw, bd - ad    from m where o.form = 'l' and o.ausschnitt_ecke = 'lu'
    union all select aw, bd - ad, bw, bd  from m where o.form = 'l' and o.ausschnitt_ecke = 'lu')
  select least(p.x, q.x), least(p.y, q.y), greatest(p.x, q.x), greatest(p.y, q.y)
    from lokal
    cross join lateral public.objekt_global(o, lokal.a, lokal.b) p
    cross join lateral public.objekt_global(o, lokal.c, lokal.d) q
$fn$;

-- ================================================ 6. Fehler und Pruefmodus
create function public.grundriss_fehler(p_kennung text, p_werte jsonb default '{}'::jsonb)
returns jsonb language sql immutable set search_path = public as $fn$
  select jsonb_build_object('kennung', p_kennung, 'werte', coalesce(p_werte, '{}'::jsonb))
$fn$;

create function public.grundriss_werfen(p jsonb) returns void
language plpgsql set search_path = public as $fn$
begin
  if p is null then return; end if;
  raise exception 'Grundriss-Regel verletzt: % %', p->>'kennung', coalesce(p->'werte', '{}'::jsonb)::text
    using errcode = 'check_violation',
          hint    = 'kistly:grundriss.' || (p->>'kennung'),
          detail  = coalesce(p->'werte', '{}'::jsonb)::text;
end $fn$;

create function public.grundriss_spaeter() returns boolean
language sql stable set search_path = public as $fn$
  select coalesce(current_setting('kistly.spaeter', true), '') = 'an'
$fn$;

-- ================================================ 7. Hoehe einer Kiste
-- Unterkante, Grenze (Raumdecke oder Fachdecke der untersten Unterlage),
-- Art und Objekt der untersten Unterlage, Zahl der Kisten darunter.
-- DIE EINZIGE Hoehenrechnung (Spiegel: kisteBasis in geometrie.ts).
create function public.kiste_basis(p_item uuid,
  out unten_cm int, out grenze_cm int, out wurzel_art text, out wurzel_objekt uuid, out tiefe int)
language plpgsql stable set search_path = public as $fn$
declare
  r public.items;
  u public.items;
  o public.objekte;
  v_i int := 0;
begin
  unten_cm := 0; tiefe := 0;
  select * into r from public.items where id = p_item;
  if r.id is null or r.platz_raum_id is null then
    unten_cm := null;
    return;
  end if;
  loop
    v_i := v_i + 1;
    if v_i > 60 then unten_cm := null; grenze_cm := null; return; end if;   -- nie: Kreise lehnt platz_fehler ab
    if r.unterlage_art = 'kiste' then
      select * into u from public.items where id = r.unterlage_item_id;
      if u.id is null or u.platz_raum_id is null then unten_cm := null; return; end if;
      unten_cm := unten_cm + (public.kiste_masse(u.size, u.eigene_hoehe_cm, u.eigene_groesse_id)).hoehe_cm;
      tiefe := tiefe + 1;
      r := u;
      continue;
    end if;
    wurzel_art := r.unterlage_art;
    if r.unterlage_art = 'boden' then
      select hoehe_cm into grenze_cm from public.raeume where id = r.platz_raum_id;
    else
      select * into o from public.objekte where id = r.unterlage_objekt_id;
      wurzel_objekt := o.id;
      if r.unterlage_art = 'objekt' then
        unten_cm := unten_cm + o.hoehe_cm;
        select hoehe_cm into grenze_cm from public.raeume where id = r.platz_raum_id;
      else
        unten_cm := unten_cm + o.brett_cm[r.fach_ebene];
        grenze_cm := public.fach_decke(o, r.fach_ebene);
      end if;
    end if;
    return;
  end loop;
end $fn$;

-- ================================================ 8. Pruefungen
-- Alle Regeln fuer den Platz einer Kiste (START 5.2). k ist die Zeile, wie
-- sie werden soll. p_mit_baum: auch alles pruefen, was auf ihr liegt (bei
-- Groessenaenderung; beim Versetzen erledigt das platz_nachruecken).
create function public.platz_fehler(k public.items, p_mit_baum boolean default false)
returns jsonb language plpgsql stable set search_path = public as $fn$
declare
  r        public.raeume;
  u        public.items;
  o        public.objekte;
  m        record;
  mu       record;
  b        record;
  v_unten  int;
  v_grenze int;
  v_oben   int;
  v_id     uuid;
  v_i      int := 0;
  v_code   text;
  v_max    int;
begin
  if k.platz_raum_id is null then
    return null;
  end if;
  if k.kind = 'furniture' then
    return public.grundriss_fehler('moebel_kein_platz', jsonb_build_object('code', k.code));
  end if;
  select * into r from public.raeume where id = k.platz_raum_id;
  if r.id is null or r.project_id <> k.project_id then
    return public.grundriss_fehler('raum_fehlt', jsonb_build_object('code', k.code));
  end if;
  if not public.geo_punkt_im_polygon(r.punkte, k.platz_x, k.platz_y) then
    return public.grundriss_fehler('draussen', jsonb_build_object('code', k.code));
  end if;
  select * into m from public.kiste_masse(k.size, k.eigene_hoehe_cm, k.eigene_groesse_id);

  if k.unterlage_art = 'boden' then
    v_unten := 0;
    v_grenze := r.hoehe_cm;

  elsif k.unterlage_art = 'kiste' then
    select * into u from public.items where id = k.unterlage_item_id;
    if u.id is null or u.id = k.id or u.platz_raum_id is null then
      return public.grundriss_fehler('unterlage_fehlt', jsonb_build_object('code', k.code));
    end if;
    if u.platz_raum_id <> k.platz_raum_id then
      return public.grundriss_fehler('unterlage_anderer_raum', jsonb_build_object('code', k.code));
    end if;
    v_id := u.unterlage_item_id;                   -- kein Kreis in "liegt auf"
    while v_id is not null loop
      v_i := v_i + 1;
      if v_id = k.id or v_i > 60 then
        return public.grundriss_fehler('kreis', jsonb_build_object('code', k.code, 'unter', u.code));
      end if;
      select i.unterlage_item_id into v_id from public.items i where i.id = v_id;
    end loop;
    select * into mu from public.kiste_masse(u.size, u.eigene_hoehe_cm, u.eigene_groesse_id);
    if not public.kiste_traegt(u.platz_x, u.platz_y, u.platz_drehung, mu.laenge_cm, mu.breite_cm,
                               k.platz_x, k.platz_y) then
      return public.grundriss_fehler('nicht_darauf', jsonb_build_object('code', k.code, 'unter', u.code));
    end if;
    select * into b from public.kiste_basis(u.id);
    if b.unten_cm is null then
      return public.grundriss_fehler('unterlage_fehlt', jsonb_build_object('code', k.code));
    end if;
    v_unten := b.unten_cm + mu.hoehe_cm;
    v_grenze := b.grenze_cm;

  else   -- 'objekt' oder 'fach'
    select * into o from public.objekte where id = k.unterlage_objekt_id;
    if o.id is null then
      return public.grundriss_fehler('unterlage_fehlt', jsonb_build_object('code', k.code));
    end if;
    if o.raum_id <> k.platz_raum_id then
      return public.grundriss_fehler('unterlage_anderer_raum', jsonb_build_object('code', k.code));
    end if;
    if k.unterlage_art = 'objekt' then
      if not public.objekt_enthaelt(o, k.platz_x, k.platz_y) then
        return public.grundriss_fehler('nicht_darauf_objekt',
          jsonb_build_object('code', k.code, 'name', o.name, 'art', o.art));
      end if;
      v_unten := o.hoehe_cm;
      v_grenze := r.hoehe_cm;
    else
      if o.art = 'moebel' then
        return public.grundriss_fehler('kein_regal', jsonb_build_object('code', k.code, 'name', o.name));
      end if;
      if k.fach_ebene > coalesce(array_length(o.brett_cm, 1), 0) or k.fach_spalte > o.spalten then
        return public.grundriss_fehler('fach_fehlt',
          jsonb_build_object('code', k.code, 'name', o.name, 'ebene', k.fach_ebene, 'spalte', k.fach_spalte));
      end if;
      if not public.objekt_im_fach(o, k.fach_spalte, k.platz_x, k.platz_y) then
        return public.grundriss_fehler('nicht_im_fach',
          jsonb_build_object('code', k.code, 'name', o.name, 'ebene', k.fach_ebene, 'spalte', k.fach_spalte));
      end if;
      v_unten := o.brett_cm[k.fach_ebene];
      v_grenze := public.fach_decke(o, k.fach_ebene);
    end if;
  end if;

  v_oben := v_unten + m.hoehe_cm;
  if v_oben > v_grenze then
    return public.grundriss_fehler('zu_hoch',
      jsonb_build_object('code', k.code, 'oben', v_oben, 'grenze', v_grenze));
  end if;

  if p_mit_baum then
    select c.code into v_code from public.items c
     where c.unterlage_item_id = k.id and c.platz_raum_id is not null
       and (c.platz_raum_id <> k.platz_raum_id
            or not public.kiste_traegt(k.platz_x, k.platz_y, k.platz_drehung,
                                       m.laenge_cm, m.breite_cm, c.platz_x, c.platz_y))
     limit 1;
    if v_code is not null then
      return public.grundriss_fehler('nicht_darauf', jsonb_build_object('code', v_code, 'unter', k.code));
    end if;
    with recursive baum(id, code, oben, tiefe) as (
      select c.id, c.code, v_oben + (public.kiste_masse(c.size, c.eigene_hoehe_cm, c.eigene_groesse_id)).hoehe_cm, 1
        from public.items c
       where c.unterlage_item_id = k.id and c.platz_raum_id is not null
      union all
      select c.id, c.code, baum.oben + (public.kiste_masse(c.size, c.eigene_hoehe_cm, c.eigene_groesse_id)).hoehe_cm,
             baum.tiefe + 1
        from public.items c join baum on c.unterlage_item_id = baum.id
       where baum.tiefe < 60 and c.platz_raum_id is not null)
    select baum.code, baum.oben into v_code, v_max
      from baum where baum.oben > v_grenze order by baum.tiefe limit 1;
    if v_code is not null then
      return public.grundriss_fehler('zu_hoch',
        jsonb_build_object('code', v_code, 'oben', v_max, 'grenze', v_grenze));
    end if;
  end if;
  return null;
end $fn$;

create function public.objekt_fehler(o public.objekte, r public.raeume) returns jsonb
language plpgsql stable set search_path = public as $fn$
declare
  q record;
begin
  for q in select * from public.objekt_rechtecke(o) loop
    if not public.geo_rechteck_im_polygon(r.punkte, q.x0, q.y0, q.x1, q.y1) then
      return public.grundriss_fehler('objekt_draussen', jsonb_build_object('name', o.name, 'art', o.art));
    end if;
  end loop;
  if o.hoehe_cm > r.hoehe_cm then
    return public.grundriss_fehler('objekt_zu_hoch', jsonb_build_object('name', o.name, 'art', o.art));
  end if;
  return null;
end $fn$;

create function public.oeffnung_fehler(e public.oeffnungen, r public.raeume) returns jsonb
language plpgsql stable set search_path = public as $fn$
declare
  v_n    int := array_length(r.punkte, 1) / 2;
  v_ende bigint;
begin
  if e.kante >= v_n then
    return public.grundriss_fehler('oeffnung_kante', jsonb_build_object('art', e.art));
  end if;
  v_ende := e.abstand_cm::bigint + e.breite_cm;
  if v_ende * v_ende > public.geo_kante_laenge2(r.punkte, e.kante) then
    return public.grundriss_fehler('oeffnung_zu_breit', jsonb_build_object('art', e.art));
  end if;
  if e.bruestung_cm + e.hoehe_cm > r.hoehe_cm then
    return public.grundriss_fehler('oeffnung_zu_hoch', jsonb_build_object('art', e.art));
  end if;
  if exists (select 1 from public.oeffnungen x
              where x.raum_id = e.raum_id and x.kante = e.kante and x.id <> e.id
                and x.abstand_cm < e.abstand_cm + e.breite_cm
                and e.abstand_cm < x.abstand_cm + x.breite_cm) then
    return public.grundriss_fehler('oeffnungen_ueberlappen', jsonb_build_object('art', e.art));
  end if;
  return null;
end $fn$;

-- Passt alles im Raum zu diesem (neuen) Raum? Fuer Aenderungen an Umriss oder Hoehe.
create function public.raum_inhalt_fehler(r public.raeume) returns jsonb
language plpgsql stable set search_path = public as $fn$
declare
  v_n    int;
  v_code text;
  v_f    jsonb;
  o      public.objekte;
  e      public.oeffnungen;
begin
  select count(*), min(i.code) into v_n, v_code from public.items i
   where i.platz_raum_id = r.id and not public.geo_punkt_im_polygon(r.punkte, i.platz_x, i.platz_y);
  if v_n > 0 then
    return public.grundriss_fehler('kisten_draussen', jsonb_build_object('n', v_n, 'code', v_code));
  end if;
  select count(*), min(i.code) into v_n, v_code
    from public.items i cross join lateral public.kiste_basis(i.id) b
   where i.platz_raum_id = r.id and b.wurzel_art in ('boden', 'objekt')
     and b.unten_cm + (public.kiste_masse(i.size, i.eigene_hoehe_cm, i.eigene_groesse_id)).hoehe_cm > r.hoehe_cm;
  if v_n > 0 then
    return public.grundriss_fehler('zu_niedrig', jsonb_build_object('n', v_n, 'code', v_code));
  end if;
  for o in select * from public.objekte where raum_id = r.id loop
    v_f := public.objekt_fehler(o, r);
    if v_f is not null then return v_f; end if;
  end loop;
  for e in select * from public.oeffnungen where raum_id = r.id loop
    v_f := public.oeffnung_fehler(e, r);
    if v_f is not null then return v_f; end if;
  end loop;
  return null;
end $fn$;

-- Alle Verstoesse eines Raums (fuer Probelauf, Umrechnung und raum_fehler).
create function public.raum_verstoesse(p_raum uuid)
returns table (kiste_id uuid, kennung text, werte jsonb)
language plpgsql stable set search_path = public as $fn$
declare
  r   public.raeume;
  o   public.objekte;
  e   public.oeffnungen;
  k   public.items;
  v   jsonb;
  v_t text;
begin
  select * into r from public.raeume where id = p_raum;
  if r.id is null then return; end if;
  v_t := public.geo_polygon_fehler(r.punkte);
  if v_t is not null then
    kiste_id := null; kennung := 'raum_' || v_t; werte := '{}'::jsonb; return next;
  end if;
  for o in select * from public.objekte where raum_id = p_raum loop
    v := public.objekt_fehler(o, r);
    if v is not null then kiste_id := null; kennung := v->>'kennung'; werte := v->'werte'; return next; end if;
  end loop;
  for e in select * from public.oeffnungen where raum_id = p_raum loop
    v := public.oeffnung_fehler(e, r);
    if v is not null then kiste_id := null; kennung := v->>'kennung'; werte := v->'werte'; return next; end if;
  end loop;
  for k in select * from public.items where platz_raum_id = p_raum order by id loop
    v := public.platz_fehler(k, false);
    if v is not null then kiste_id := k.id; kennung := v->>'kennung'; werte := v->'werte'; return next; end if;
  end loop;
end $fn$;

create function public.raum_fehler(p_raum uuid) returns jsonb
language sql stable set search_path = public as $fn$
  select public.grundriss_fehler(v.kennung, v.werte) from public.raum_verstoesse(p_raum) v limit 1
$fn$;

-- ================================================ 9. Nachruecken
-- p_alt: die Kiste vorher, p_neu: nachher (null beim Loeschen). Kisten, die
-- auf ihr lagen und nicht mehr darauf liegen, uebernehmen ihre alte
-- Unterlage (START 5.2). Sie behalten ihren Mittelpunkt, wenn er dort
-- gilt, sonst nehmen sie den alten Mittelpunkt der Kiste darunter. Was auf
-- ihnen liegt, faehrt mit. Danach muss alles, was auf p_neu geblieben ist,
-- weiter unter die Grenze passen.
create function public.platz_nachruecken(p_alt public.items, p_neu public.items)
returns void language plpgsql set search_path = public as $fn$
declare
  c        public.items;
  v_try    public.items;
  v_k      public.items;
  d        record;
  v_f      jsonb;
  v_x      int;
  v_y      int;
  v_ml     int;       -- Masse von p_neu (bleiben null, wenn p_neu keinen Platz hat)
  v_mb     int;
  v_bleibt boolean;
begin
  if p_neu.id is not null and p_neu.platz_raum_id is not null then
    select laenge_cm, breite_cm into v_ml, v_mb
      from public.kiste_masse(p_neu.size, p_neu.eigene_hoehe_cm, p_neu.eigene_groesse_id);
  end if;
  for c in select * from public.items
            where unterlage_item_id = p_alt.id and platz_raum_id is not null order by id loop
    v_bleibt := false;
    if p_neu.id is not null and p_neu.platz_raum_id is not null
       and p_neu.platz_raum_id = c.platz_raum_id then
      v_bleibt := public.kiste_traegt(p_neu.platz_x, p_neu.platz_y, p_neu.platz_drehung,
                                      v_ml, v_mb, c.platz_x, c.platz_y);
    end if;
    if v_bleibt then
      continue;   -- liegt weiter darauf
    end if;
    v_try := c;
    v_try.platz_raum_id       := p_alt.platz_raum_id;
    v_try.unterlage_art       := p_alt.unterlage_art;
    v_try.unterlage_item_id   := p_alt.unterlage_item_id;
    v_try.unterlage_objekt_id := p_alt.unterlage_objekt_id;
    v_try.fach_ebene          := p_alt.fach_ebene;
    v_try.fach_spalte         := p_alt.fach_spalte;
    v_f := public.platz_fehler(v_try, false);
    if v_f is not null and (v_f->>'kennung') in ('draussen', 'nicht_darauf', 'nicht_darauf_objekt', 'nicht_im_fach') then
      v_x := p_alt.platz_x; v_y := p_alt.platz_y;
    else
      v_x := c.platz_x; v_y := c.platz_y;
    end if;
    update public.items
       set platz_raum_id = p_alt.platz_raum_id, platz_x = v_x, platz_y = v_y,
           unterlage_art = p_alt.unterlage_art, unterlage_item_id = p_alt.unterlage_item_id,
           unterlage_objekt_id = p_alt.unterlage_objekt_id,
           fach_ebene = p_alt.fach_ebene, fach_spalte = p_alt.fach_spalte
     where id = c.id;
    if v_x <> c.platz_x or v_y <> c.platz_y then
      for d in
        with recursive baum(id, tiefe) as (
          select i.id, 1 from public.items i where i.unterlage_item_id = c.id
          union all
          select i.id, baum.tiefe + 1 from public.items i join baum on i.unterlage_item_id = baum.id
           where baum.tiefe < 60)
        select baum.id from baum order by baum.tiefe, baum.id
      loop
        update public.items
           set platz_x = platz_x + (v_x - c.platz_x), platz_y = platz_y + (v_y - c.platz_y)
         where id = d.id;
      end loop;
    end if;
  end loop;
  if p_neu.id is not null and p_neu.platz_raum_id is not null then
    select * into v_k from public.items where id = p_neu.id;
    perform public.grundriss_werfen(public.platz_fehler(v_k, true));
  end if;
end $fn$;

-- ================================================ 10. Trigger
-- grundrisse: Version nur ueber grundriss_speichern.
create function public.grundrisse_vorher() returns trigger
language plpgsql set search_path = public as $fn$
begin
  new.updated_at := now();
  new.name := btrim(new.name);
  if tg_op = 'INSERT' then
    new.version := 0;
  else
    new.project_id := old.project_id;
    if not public.grundriss_spaeter() then
      new.version := old.version;
    end if;
  end if;
  return new;
end $fn$;
create trigger grundrisse_vorher before insert or update on public.grundrisse
  for each row execute function public.grundrisse_vorher();

-- raeume: Umzug aus dem Grundriss, Zimmer pruefen, Polygon pruefen, Inhalt pruefen.
create function public.raeume_vorher() returns trigger
language plpgsql set search_path = public as $fn$
declare
  v_projekt uuid;
  t         public.tags;
  v_t       text;
begin
  if tg_op = 'UPDATE' and not exists (select 1 from public.projects where id = old.project_id) then
    return new;   -- Kaskade beim Loeschen des Umzugs (0008)
  end if;
  new.updated_at := now();
  if tg_op = 'UPDATE' and new.grundriss_id <> old.grundriss_id then
    perform public.grundriss_werfen(public.grundriss_fehler('raum_umhaengen'));
  end if;
  select project_id into v_projekt from public.grundrisse where id = new.grundriss_id;
  if v_projekt is null then
    perform public.grundriss_werfen(public.grundriss_fehler('grundriss_fehlt'));
  end if;
  new.project_id := v_projekt;                       -- immer ueberschreiben (0014)
  perform public.raum_sperre(new.id, true);
  if new.tag_id is not null then
    select * into t from public.tags where id = new.tag_id;
    if t.id is null or t.project_id <> v_projekt or t.kind <> 'room' then
      perform public.grundriss_werfen(public.grundriss_fehler('zimmer_falsch'));
    end if;
    if exists (select 1 from public.raeume x
                where x.grundriss_id = new.grundriss_id and x.tag_id = new.tag_id and x.id <> new.id) then
      perform public.grundriss_werfen(public.grundriss_fehler('zimmer_doppelt', jsonb_build_object('name', t.name)));
    end if;
  end if;
  v_t := public.geo_polygon_fehler(new.punkte);
  if v_t is not null then
    perform public.grundriss_werfen(public.grundriss_fehler('raum_' || v_t));
  end if;
  if new.wandfarben is not null and exists (
       select 1 from unnest(new.wandfarben) f where f is not null and f !~ '^#[0-9A-Fa-f]{6}$') then
    perform public.grundriss_werfen(public.grundriss_fehler('farbe_ungueltig'));
  end if;
  if tg_op = 'UPDATE' and not public.grundriss_spaeter()
     and (new.punkte is distinct from old.punkte or new.hoehe_cm < old.hoehe_cm) then
    perform public.grundriss_werfen(public.raum_inhalt_fehler(new));
  end if;
  return new;
end $fn$;
create trigger raeume_vorher before insert or update on public.raeume
  for each row execute function public.raeume_vorher();

create function public.oeffnungen_vorher() returns trigger
language plpgsql set search_path = public as $fn$
declare
  r public.raeume;
begin
  if tg_op = 'UPDATE' and not exists (select 1 from public.projects where id = old.project_id) then
    return new;
  end if;
  new.updated_at := now();
  select * into r from public.raeume where id = new.raum_id;
  if r.id is null then
    perform public.grundriss_werfen(public.grundriss_fehler('raum_fehlt'));
  end if;
  new.project_id := r.project_id;
  if tg_op = 'UPDATE' and old.raum_id <> new.raum_id and old.raum_id::text < new.raum_id::text then
    perform public.raum_sperre(old.raum_id, true);
  end if;
  perform public.raum_sperre(new.raum_id, true);
  if tg_op = 'UPDATE' and old.raum_id <> new.raum_id and old.raum_id::text > new.raum_id::text then
    perform public.raum_sperre(old.raum_id, true);
  end if;
  if not public.grundriss_spaeter() then
    perform public.grundriss_werfen(public.oeffnung_fehler(new, r));
  end if;
  return new;
end $fn$;
create trigger oeffnungen_vorher before insert or update on public.oeffnungen
  for each row execute function public.oeffnungen_vorher();

create function public.objekte_vorher() returns trigger
language plpgsql set search_path = public as $fn$
declare
  r      public.raeume;
  v_alt  uuid;
begin
  if tg_op = 'UPDATE' and not exists (select 1 from public.projects where id = old.project_id) then
    return new;
  end if;
  new.updated_at := now();
  select * into r from public.raeume where id = new.raum_id;
  if r.id is null then
    perform public.grundriss_werfen(public.grundriss_fehler('raum_fehlt'));
  end if;
  new.project_id := r.project_id;
  if tg_op = 'UPDATE' and old.raum_id <> new.raum_id then
    select grundriss_id into v_alt from public.raeume where id = old.raum_id;
    if v_alt is distinct from r.grundriss_id then
      perform public.grundriss_werfen(public.grundriss_fehler('objekt_umhaengen'));
    end if;
    if old.raum_id::text < new.raum_id::text then perform public.raum_sperre(old.raum_id, true); end if;
    perform public.raum_sperre(new.raum_id, true);
    if old.raum_id::text > new.raum_id::text then perform public.raum_sperre(old.raum_id, true); end if;
  else
    perform public.raum_sperre(new.raum_id, true);
  end if;
  if new.art <> 'moebel' and not public.faecher_gueltig(new.brett_cm, new.hoehe_cm) then
    perform public.grundriss_werfen(public.grundriss_fehler('faecher_ungueltig', jsonb_build_object('name', new.name)));
  end if;
  if new.item_id is not null and (tg_op = 'INSERT' or new.item_id is distinct from old.item_id) then
    if not exists (select 1 from public.items i
                    where i.id = new.item_id and i.project_id = r.project_id and i.kind = 'furniture') then
      perform public.grundriss_werfen(public.grundriss_fehler('moebel_verknuepfung', jsonb_build_object('name', new.name)));
    end if;
    if exists (select 1 from public.objekte x where x.item_id = new.item_id and x.id <> new.id) then
      perform public.grundriss_werfen(public.grundriss_fehler('moebel_schon_verknuepft', jsonb_build_object('name', new.name)));
    end if;
  end if;
  if not public.grundriss_spaeter()
     and (tg_op = 'INSERT'
          or (new.raum_id, new.x, new.y, new.breite_cm, new.tiefe_cm, new.hoehe_cm, new.drehung,
              new.form, new.ausschnitt_breite_cm, new.ausschnitt_tiefe_cm, new.ausschnitt_ecke)
             is distinct from
             (old.raum_id, old.x, old.y, old.breite_cm, old.tiefe_cm, old.hoehe_cm, old.drehung,
              old.form, old.ausschnitt_breite_cm, old.ausschnitt_tiefe_cm, old.ausschnitt_ecke)) then
    perform public.grundriss_werfen(public.objekt_fehler(new, r));
  end if;
  return new;
end $fn$;
create trigger objekte_vorher before insert or update on public.objekte
  for each row execute function public.objekte_vorher();

-- Objekt versetzt, gedreht oder in einen anderen Raum: alles, was es traegt
-- (oben drauf, in Faechern, und was darauf liegt), faehrt mit. Bretter
-- geaendert: Kisten bleiben auf ihrer Brett-Hoehe, wenn es sie noch gibt.
create function public.objekte_nachher() returns trigger
language plpgsql set search_path = public as $fn$
declare
  k        public.items;
  l        record;
  g        record;
  v_diff   int;
  v_alt    int[];
begin
  v_alt := old.brett_cm;
  if (new.x, new.y, new.drehung, new.raum_id) is distinct from (old.x, old.y, old.drehung, old.raum_id) then
    v_diff := ((new.drehung - old.drehung) % 360 + 360) % 360;
    for k in
      with recursive traglast(id, tiefe) as (
        select i.id, 0 from public.items i
         where i.unterlage_objekt_id = new.id and i.platz_raum_id is not null
        union all
        select i.id, traglast.tiefe + 1 from public.items i join traglast on i.unterlage_item_id = traglast.id
         where traglast.tiefe < 60)
      select i.* from traglast join public.items i on i.id = traglast.id order by traglast.tiefe, i.id
    loop
      select * into l from public.objekt_lokal(old, k.platz_x, k.platz_y);
      select * into g from public.objekt_global(new, l.lx, l.ly);
      update public.items
         set platz_raum_id = new.raum_id, platz_x = g.x, platz_y = g.y,
             platz_drehung = case when v_diff in (90, 270) then 90 - k.platz_drehung else k.platz_drehung end
       where id = k.id;
    end loop;
  end if;
  if old.brett_cm is distinct from new.brett_cm and new.brett_cm is not null and v_alt is not null then
    update public.items i
       set fach_ebene = array_position(new.brett_cm, v_alt[i.fach_ebene])
     where i.unterlage_objekt_id = new.id and i.unterlage_art = 'fach'
       and array_position(new.brett_cm, v_alt[i.fach_ebene]) is not null
       and array_position(new.brett_cm, v_alt[i.fach_ebene]) <> i.fach_ebene;
  end if;
  if not public.grundriss_spaeter()
     and (new.x, new.y, new.drehung, new.raum_id, new.breite_cm, new.tiefe_cm, new.hoehe_cm, new.art,
          new.form, new.ausschnitt_breite_cm, new.ausschnitt_tiefe_cm, new.ausschnitt_ecke, new.brett_cm, new.spalten)
         is distinct from
         (old.x, old.y, old.drehung, old.raum_id, old.breite_cm, old.tiefe_cm, old.hoehe_cm, old.art,
          old.form, old.ausschnitt_breite_cm, old.ausschnitt_tiefe_cm, old.ausschnitt_ecke, old.brett_cm, old.spalten) then
    for k in
      with recursive traglast(id, tiefe) as (
        select i.id, 0 from public.items i
         where i.unterlage_objekt_id = new.id and i.platz_raum_id is not null
        union all
        select i.id, traglast.tiefe + 1 from public.items i join traglast on i.unterlage_item_id = traglast.id
         where traglast.tiefe < 60)
      select i.* from traglast join public.items i on i.id = traglast.id order by traglast.tiefe, i.id
    loop
      perform public.grundriss_werfen(public.platz_fehler(k, false));
    end loop;
  end if;
  return null;
end $fn$;
create trigger objekte_nachher after update on public.objekte
  for each row execute function public.objekte_nachher();

-- Objekt weg: was darauf oder darin stand, steht jetzt auf dem Boden
-- (Mittelpunkt bleibt; er lag im Objekt und damit im Raum).
create function public.objekte_weg() returns trigger
language plpgsql set search_path = public as $fn$
begin
  if not exists (select 1 from public.projects where id = old.project_id)
     or not exists (select 1 from public.raeume where id = old.raum_id) then
    return old;   -- Kaskade: der Raum oder der Umzug geht ohnehin
  end if;
  perform public.raum_sperre(old.raum_id, true);
  update public.items
     set unterlage_art = 'boden', unterlage_objekt_id = null, fach_ebene = null, fach_spalte = null
   where unterlage_objekt_id = old.id and platz_raum_id is not null;
  return old;
end $fn$;
create trigger objekte_weg before delete on public.objekte
  for each row execute function public.objekte_weg();

-- items: Sperre zuerst ('items_a_platz_sperre' < 'items_a_sperre' < 'items_ab_groesse' < 'items_bi').
create function public.items_a_platz_sperre() returns trigger
language plpgsql set search_path = public as $fn$
declare
  v_a uuid;
  v_b uuid;
begin
  if tg_op = 'UPDATE'
     and (new.platz_raum_id, new.platz_x, new.platz_y, new.platz_drehung, new.unterlage_art,
          new.unterlage_item_id, new.unterlage_objekt_id, new.fach_ebene, new.fach_spalte,
          new.size, new.eigene_hoehe_cm, new.eigene_groesse_id, new.kind)
         is not distinct from
         (old.platz_raum_id, old.platz_x, old.platz_y, old.platz_drehung, old.unterlage_art,
          old.unterlage_item_id, old.unterlage_objekt_id, old.fach_ebene, old.fach_spalte,
          old.size, old.eigene_hoehe_cm, old.eigene_groesse_id, old.kind) then
    return new;
  end if;
  if tg_op in ('UPDATE', 'DELETE') then v_a := old.platz_raum_id; end if;
  if tg_op in ('INSERT', 'UPDATE') then v_b := new.platz_raum_id; end if;
  if v_a is not null and v_b is not null and v_a::text > v_b::text then
    perform public.raum_sperre(v_b, true);
    perform public.raum_sperre(v_a, true);
  else
    perform public.raum_sperre(v_a, true);
    perform public.raum_sperre(v_b, true);
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $fn$;
create trigger items_a_platz_sperre before insert or update or delete on public.items
  for each row execute function public.items_a_platz_sperre();

-- Normalisieren und pruefen. Laeuft als letzter BEFORE-Trigger
-- ('items_platz' > 'items_plan'), nach Nummer und Stufe.
create function public.items_platz_pruefen() returns trigger
language plpgsql set search_path = public as $fn$
declare
  v_platz_gleich boolean := false;
begin
  if new.platz_raum_id is not null then
    new.unterlage_art := coalesce(new.unterlage_art, 'boden');
    new.platz_drehung := coalesce(new.platz_drehung, 0);
  end if;
  if new.kind = 'furniture' and new.platz_raum_id is not null
     and not (tg_op = 'UPDATE' and old.kind <> 'furniture') then
    perform public.grundriss_werfen(public.grundriss_fehler('moebel_kein_platz', jsonb_build_object('code', new.code)));
  end if;
  if new.kind = 'furniture' or new.platz_raum_id is null
     or (new.unterlage_art = 'kiste' and new.unterlage_item_id is null)
     or (new.unterlage_art in ('objekt', 'fach') and new.unterlage_objekt_id is null) then
    new.platz_raum_id := null; new.platz_x := null; new.platz_y := null; new.platz_drehung := null;
    new.unterlage_art := null; new.unterlage_item_id := null; new.unterlage_objekt_id := null;
    new.fach_ebene := null; new.fach_spalte := null;
    return new;
  end if;
  if new.unterlage_art <> 'kiste' then new.unterlage_item_id := null; end if;
  if new.unterlage_art in ('boden', 'kiste') then new.unterlage_objekt_id := null; end if;
  if new.unterlage_art <> 'fach' then
    new.fach_ebene := null; new.fach_spalte := null;
  else
    new.fach_spalte := coalesce(new.fach_spalte, 1);
  end if;
  if tg_op = 'UPDATE' then
    v_platz_gleich :=
      (new.platz_raum_id, new.platz_x, new.platz_y, new.platz_drehung, new.unterlage_art,
       new.unterlage_item_id, new.unterlage_objekt_id, new.fach_ebene, new.fach_spalte)
      is not distinct from
      (old.platz_raum_id, old.platz_x, old.platz_y, old.platz_drehung, old.unterlage_art,
       old.unterlage_item_id, old.unterlage_objekt_id, old.fach_ebene, old.fach_spalte);
    if v_platz_gleich
       and (new.size, new.eigene_hoehe_cm, new.eigene_groesse_id)
           is not distinct from (old.size, old.eigene_hoehe_cm, old.eigene_groesse_id) then
      return new;   -- nichts am Platz geaendert (Status, Titel, ...)
    end if;
  end if;
  if public.grundriss_spaeter() then
    return new;
  end if;
  -- Nur Groesse geaendert: der ganze Stapel darueber muss mitpassen.
  -- Platz geaendert: nur diese Kiste; was darauf lag, erledigt items_platz_nachher.
  perform public.grundriss_werfen(public.platz_fehler(new, v_platz_gleich));
  return new;
end $fn$;
create trigger items_platz before insert or update on public.items
  for each row execute function public.items_platz_pruefen();

create function public.items_platz_nachher() returns trigger
language plpgsql set search_path = public as $fn$
begin
  -- Nur, was ein Mensch ausloest. Das Nachruecken selbst kaeme sonst hier
  -- wieder an (Waechter wie 0022).
  if pg_trigger_depth() > 1 or public.grundriss_spaeter() then return null; end if;
  if old.platz_raum_id is null then return null; end if;
  if (new.platz_raum_id, new.platz_x, new.platz_y, new.platz_drehung, new.unterlage_art,
      new.unterlage_item_id, new.unterlage_objekt_id, new.fach_ebene, new.fach_spalte)
     is not distinct from
     (old.platz_raum_id, old.platz_x, old.platz_y, old.platz_drehung, old.unterlage_art,
      old.unterlage_item_id, old.unterlage_objekt_id, old.fach_ebene, old.fach_spalte) then
    return null;
  end if;
  perform public.platz_nachruecken(old, new);
  return null;
end $fn$;
create trigger items_platz_nachher after update on public.items
  for each row execute function public.items_platz_nachher();

-- Vor dem Loeschen rutscht nach, was auf der Kiste lag (sonst zeigte
-- unterlage_item_id ins Leere). Beim Loeschen des Umzugs nicht (0008).
create function public.items_platz_weg() returns trigger
language plpgsql set search_path = public as $fn$
begin
  if old.platz_raum_id is null then return old; end if;
  if not exists (select 1 from public.projects where id = old.project_id) then return old; end if;
  perform public.platz_nachruecken(old, null::public.items);
  return old;
end $fn$;
create trigger items_platz_weg before delete on public.items
  for each row execute function public.items_platz_weg();

-- eigene_groessen (ersetzt 0027): neu einstufen UND alle Plaetze pruefen.
create or replace function public.eigene_groessen_nachher()
returns trigger language plpgsql set search_path = public as $fn$
declare
  v_stufe smallint;
  v_raum  uuid;
  k       public.items;
begin
  if (new.laenge_cm, new.breite_cm, new.hoehe_cm)
     is not distinct from (old.laenge_cm, old.breite_cm, old.hoehe_cm) then
    return null;
  end if;
  for v_raum in
    select distinct i.platz_raum_id from public.items i
     where i.eigene_groesse_id = new.id and i.platz_raum_id is not null
     order by 1
  loop
    perform public.raum_sperre(v_raum, true);
  end loop;
  v_stufe := public.groesse_stufe(new.laenge_cm, new.breite_cm, new.hoehe_cm);
  update public.items set size = v_stufe where eigene_groesse_id = new.id and size <> v_stufe;
  for k in select * from public.items
            where eigene_groesse_id = new.id and platz_raum_id is not null order by id loop
    perform public.grundriss_werfen(public.platz_fehler(k, true));
  end loop;
  return null;
end $fn$;

-- ================================================ 11. Zeilen-Sicherheit
alter table public.grundrisse enable row level security;
alter table public.raeume     enable row level security;
alter table public.oeffnungen enable row level security;
alter table public.objekte    enable row level security;

create policy grundrisse_select on public.grundrisse for select to authenticated using (public.is_member(project_id));
create policy grundrisse_insert on public.grundrisse for insert to authenticated with check (public.is_editor(project_id));
create policy grundrisse_update on public.grundrisse for update to authenticated
  using (public.is_editor(project_id)) with check (public.is_editor(project_id));
create policy grundrisse_delete on public.grundrisse for delete to authenticated using (public.is_editor(project_id));

create policy raeume_select on public.raeume for select to authenticated using (public.is_member(project_id));
create policy raeume_insert on public.raeume for insert to authenticated with check (public.is_editor(project_id));
create policy raeume_update on public.raeume for update to authenticated
  using (public.is_editor(project_id)) with check (public.is_editor(project_id));
create policy raeume_delete on public.raeume for delete to authenticated using (public.is_editor(project_id));

create policy oeffnungen_select on public.oeffnungen for select to authenticated using (public.is_member(project_id));
create policy oeffnungen_insert on public.oeffnungen for insert to authenticated with check (public.is_editor(project_id));
create policy oeffnungen_update on public.oeffnungen for update to authenticated
  using (public.is_editor(project_id)) with check (public.is_editor(project_id));
create policy oeffnungen_delete on public.oeffnungen for delete to authenticated using (public.is_editor(project_id));

create policy objekte_select on public.objekte for select to authenticated using (public.is_member(project_id));
create policy objekte_insert on public.objekte for insert to authenticated with check (public.is_editor(project_id));
create policy objekte_update on public.objekte for update to authenticated
  using (public.is_editor(project_id)) with check (public.is_editor(project_id));
create policy objekte_delete on public.objekte for delete to authenticated using (public.is_editor(project_id));

revoke all on public.grundrisse, public.raeume, public.oeffnungen, public.objekte from anon;
-- items: die vorhandenen Policies (0004) gelten fuer die neuen Spalten.

-- ================================================ 12. Schnittstellen (alle security invoker)

-- Erster Grundriss des Umzugs; gibt es keinen, legt ein Bearbeiter
-- "Neue Wohnung" an (Name kommt aus dem Woerterbuch der App).
create function public.grundriss_sicherstellen(p_project uuid, p_name text default null)
returns uuid language plpgsql set search_path = public as $fn$
declare
  v_id uuid;
begin
  select id into v_id from public.grundrisse where project_id = p_project order by sort, created_at limit 1;
  if v_id is not null or not public.is_editor(p_project) then
    return v_id;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('grundriss-erster:' || p_project::text, 0));
  select id into v_id from public.grundrisse where project_id = p_project order by sort, created_at limit 1;
  if v_id is null then
    insert into public.grundrisse (project_id, name, sort)
    values (p_project, coalesce(nullif(btrim(p_name), ''), 'Neue Wohnung'), 0)
    returning id into v_id;
  end if;
  return v_id;
end $fn$;

-- Alles eines Grundrisses (oder nur eines Raums) mit fertigen Hoehen.
create function public.grundriss_laden(p_grundriss uuid, p_raum uuid default null)
returns jsonb language plpgsql stable set search_path = public as $fn$
declare
  g public.grundrisse;
begin
  select * into g from public.grundrisse where id = p_grundriss;
  if g.id is null then
    return null;
  end if;
  return jsonb_build_object(
    'grundriss', to_jsonb(g),
    'raeume', coalesce((
      select jsonb_agg(to_jsonb(r) || jsonb_build_object('tag_name', t.name, 'tag_short', t.short, 'tag_color', t.color)
                       order by r.sort, r.created_at)
        from public.raeume r left join public.tags t on t.id = r.tag_id
       where r.grundriss_id = g.id and (p_raum is null or r.id = p_raum)), '[]'::jsonb),
    'oeffnungen', coalesce((
      select jsonb_agg(to_jsonb(o) order by o.raum_id, o.kante, o.abstand_cm)
        from public.oeffnungen o join public.raeume r on r.id = o.raum_id
       where r.grundriss_id = g.id and (p_raum is null or r.id = p_raum)), '[]'::jsonb),
    'objekte', coalesce((
      select jsonb_agg(to_jsonb(o) || jsonb_build_object('item_code', i.code, 'item_title', i.title)
                       order by o.created_at)
        from public.objekte o join public.raeume r on r.id = o.raum_id
        left join public.items i on i.id = o.item_id
       where r.grundriss_id = g.id and (p_raum is null or r.id = p_raum)), '[]'::jsonb),
    'kisten', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', i.id, 'code', i.code, 'prefix', i.prefix, 'size', i.size, 'seq', i.seq,
               'kind', i.kind, 'status', i.status, 'title', i.title, 'room_id', i.room_id,
               'room_color', t.color, 'mark_color', i.mark_color, 'eigene_groesse_name', e.name,
               'platz_raum_id', i.platz_raum_id, 'platz_x', i.platz_x, 'platz_y', i.platz_y,
               'platz_drehung', i.platz_drehung, 'unterlage_art', i.unterlage_art,
               'unterlage_item_id', i.unterlage_item_id, 'unterlage_objekt_id', i.unterlage_objekt_id,
               'fach_ebene', i.fach_ebene, 'fach_spalte', i.fach_spalte,
               'laenge_cm', m.laenge_cm, 'breite_cm', m.breite_cm, 'hoehe_cm', m.hoehe_cm,
               'unten_cm', b.unten_cm, 'oben_cm', b.unten_cm + m.hoehe_cm, 'grenze_cm', b.grenze_cm,
               'wurzel_art', b.wurzel_art, 'nr', b.tiefe + 1)
             order by b.tiefe, i.code)
        from public.items i
        join public.raeume r on r.id = i.platz_raum_id
        left join public.tags t on t.id = i.room_id
        left join public.eigene_groessen e on e.id = i.eigene_groesse_id
        cross join lateral public.kiste_masse(i.size, i.eigene_hoehe_cm, i.eigene_groesse_id) m
        cross join lateral public.kiste_basis(i.id) b
       where r.grundriss_id = g.id and (p_raum is null or r.id = p_raum)), '[]'::jsonb));
end $fn$;

-- Wo steht eine Kiste (oder ein Moebel ueber sein Objekt)? null = kein Platz.
create function public.kiste_lage(p_item uuid)
returns jsonb language plpgsql stable set search_path = public as $fn$
declare
  i     public.items;
  u     public.items;
  o     public.objekte;
  r     public.raeume;
  g     public.grundrisse;
  v_tag text;
  m     record;
  b     record;
begin
  select * into i from public.items where id = p_item;
  if i.id is null then
    return null;
  end if;
  if i.kind = 'furniture' then
    select * into o from public.objekte where item_id = i.id;
    if o.id is null then return null; end if;
    select * into r from public.raeume where id = o.raum_id;
    select * into g from public.grundrisse where id = r.grundriss_id;
    select name into v_tag from public.tags where id = r.tag_id;
    return jsonb_build_object(
      'art', 'moebel',
      'grundriss', jsonb_build_object('id', g.id, 'name', g.name),
      'raum', jsonb_build_object('id', r.id, 'name', coalesce(nullif(r.name, ''), v_tag), 'tag_id', r.tag_id),
      'objekt', jsonb_build_object('id', o.id, 'name', o.name, 'art', o.art),
      'unten_cm', 0, 'oben_cm', o.hoehe_cm);
  end if;
  if i.platz_raum_id is null then
    return null;
  end if;
  select * into r from public.raeume where id = i.platz_raum_id;
  select * into g from public.grundrisse where id = r.grundriss_id;
  select name into v_tag from public.tags where id = r.tag_id;
  select * into m from public.kiste_masse(i.size, i.eigene_hoehe_cm, i.eigene_groesse_id);
  select * into b from public.kiste_basis(i.id);
  if i.unterlage_art = 'kiste' then
    select * into u from public.items where id = i.unterlage_item_id;
  elsif i.unterlage_art in ('objekt', 'fach') then
    select * into o from public.objekte where id = i.unterlage_objekt_id;
  end if;
  return jsonb_build_object(
    'art', 'kiste',
    'grundriss', jsonb_build_object('id', g.id, 'name', g.name),
    'raum', jsonb_build_object('id', r.id, 'name', coalesce(nullif(r.name, ''), v_tag), 'tag_id', r.tag_id),
    'platz_x', i.platz_x, 'platz_y', i.platz_y, 'drehung', i.platz_drehung,
    'unterlage_art', i.unterlage_art, 'unterlage_item_id', i.unterlage_item_id, 'unterlage_code', u.code,
    'objekt', case when o.id is null then null
                   else jsonb_build_object('id', o.id, 'name', o.name, 'art', o.art) end,
    'fach_ebene', i.fach_ebene, 'fach_spalte', i.fach_spalte,
    'laenge_cm', m.laenge_cm, 'breite_cm', m.breite_cm, 'hoehe_cm', m.hoehe_cm,
    'unten_cm', b.unten_cm, 'oben_cm', b.unten_cm + m.hoehe_cm, 'grenze_cm', b.grenze_cm,
    'nr', b.tiefe + 1,
    'auf_ihr', coalesce((select jsonb_agg(c.code order by c.code) from public.items c
                          where c.unterlage_item_id = i.id), '[]'::jsonb));
end $fn$;

-- Platz setzen (Handy, Zeichner). Die Datenbank prueft, die Antwort ist die neue Lage.
create function public.platz_setzen(p_item uuid, p_raum uuid, p_x int, p_y int,
  p_drehung int default 0, p_unterlage text default 'boden',
  p_unterlage_item uuid default null, p_unterlage_objekt uuid default null,
  p_ebene int default null, p_spalte int default null)
returns jsonb language plpgsql set search_path = public as $fn$
begin
  update public.items
     set platz_raum_id = p_raum, platz_x = p_x, platz_y = p_y, platz_drehung = p_drehung,
         unterlage_art = p_unterlage, unterlage_item_id = p_unterlage_item,
         unterlage_objekt_id = p_unterlage_objekt, fach_ebene = p_ebene, fach_spalte = p_spalte
   where id = p_item;
  if not found then
    raise exception 'Kiste nicht gefunden oder keine Rechte'
      using errcode = 'insufficient_privilege', hint = 'kistly:grundriss.keine_rechte';
  end if;
  return public.kiste_lage(p_item);
end $fn$;

-- Vom Platz nehmen. Was darauf lag, rutscht nach (items_platz_nachher).
create function public.platz_raeumen(p_item uuid)
returns void language plpgsql set search_path = public as $fn$
begin
  update public.items set platz_raum_id = null where id = p_item;
  if not found then
    raise exception 'Kiste nicht gefunden oder keine Rechte'
      using errcode = 'insufficient_privilege', hint = 'kistly:grundriss.keine_rechte';
  end if;
end $fn$;

create function public.grundriss_kisten_zahl(p_grundriss uuid)
returns int language sql stable set search_path = public as $fn$
  select count(*)::int from public.items i
    join public.raeume r on r.id = i.platz_raum_id
   where r.grundriss_id = p_grundriss
$fn$;

-- Speichern aus dem Zeichner: viele Aenderungen in einem Vorgang, am Ende
-- wird jeder beruehrte Raum vollstaendig geprueft. p_aenderung (alle Teile
-- freiwillig; ids vergibt der Browser mit crypto.randomUUID):
-- { "oeffnungen_loeschen": [uuid], "objekte_loeschen": [uuid], "raeume_loeschen": [uuid],
--   "raeume":     [{id, tag_id, name, art, punkte:[x0,y0,...], hoehe_cm, bodenfarbe, wandfarben:[..], sort}],
--   "verschieben":[{raum_id, dx, dy}],            -- Raum samt Inhalt verschieben
--   "objekte":    [{id, raum_id, art, name, x, y, breite_cm, tiefe_cm, hoehe_cm, drehung, form,
--                   ausschnitt_breite_cm, ausschnitt_tiefe_cm, ausschnitt_ecke, brett_cm:[..], spalten, farbe, item_id}],
--   "zuordnen":   [{von_raum_id, nach_raum_id}],  -- nach dem Teilen: Inhalt, der im neuen Raum liegt, umhaengen
--   "oeffnungen": [{id, raum_id, art, kante, abstand_cm, breite_cm, hoehe_cm, bruestung_cm, anschlag, aufschlag}] }
create function public.grundriss_speichern(p_grundriss uuid, p_version int, p_aenderung jsonb)
returns jsonb language plpgsql set search_path = public as $fn$
declare
  g        public.grundrisse;
  e        jsonb;
  v_raum   uuid;
  v_raeume uuid[] := '{}';
  v_ids    uuid[];
  v_neu    int;
  v_dx     int;
  v_dy     int;
  rv       public.raeume;
  rn       public.raeume;
  o        public.objekte;
  v_a      jsonb := coalesce(p_aenderung, '{}'::jsonb);
begin
  select * into g from public.grundrisse where id = p_grundriss;
  if g.id is null then
    perform public.grundriss_werfen(public.grundriss_fehler('grundriss_fehlt'));
  end if;
  if not public.is_editor(g.project_id) then
    perform public.grundriss_werfen(public.grundriss_fehler('keine_rechte'));
  end if;
  select * into g from public.grundrisse where id = p_grundriss for update;
  if g.version <> p_version then
    perform public.grundriss_werfen(public.grundriss_fehler('veraltet', jsonb_build_object('version', g.version)));
  end if;

  perform set_config('kistly.spaeter', 'an', true);
  for v_raum in select id from public.raeume where grundriss_id = p_grundriss order by id::text loop
    perform public.raum_sperre(v_raum, true);
  end loop;

  -- Fremde ids: nichts aus einem anderen Grundriss anfassen.
  if exists (select 1 from jsonb_array_elements(coalesce(v_a->'raeume', '[]')) el
               join public.raeume r on r.id = (el->>'id')::uuid
              where r.grundriss_id <> p_grundriss)
     or exists (select 1 from jsonb_array_elements(coalesce(v_a->'objekte', '[]')) el
               join public.objekte o2 on o2.id = (el->>'id')::uuid
               join public.raeume r on r.id = o2.raum_id
              where r.grundriss_id <> p_grundriss)
     or exists (select 1 from jsonb_array_elements(coalesce(v_a->'oeffnungen', '[]')) el
               join public.oeffnungen o3 on o3.id = (el->>'id')::uuid
               join public.raeume r on r.id = o3.raum_id
              where r.grundriss_id <> p_grundriss)
     or exists (select 1 from jsonb_array_elements(coalesce(v_a->'objekte', '[]') || coalesce(v_a->'oeffnungen', '[]')) el
              where (el->>'raum_id')::uuid not in (select id from public.raeume where grundriss_id = p_grundriss)
                and (el->>'raum_id')::uuid not in (
                      select (y->>'id')::uuid from jsonb_array_elements(coalesce(v_a->'raeume', '[]')) y)) then
    perform public.grundriss_werfen(public.grundriss_fehler('fremde_id'));
  end if;

  -- 1. Loeschen (Oeffnungen, Objekte: Getragenes faellt auf den Boden, Raeume: Plaetze leer)
  delete from public.oeffnungen o3 using public.raeume r
   where o3.raum_id = r.id and r.grundriss_id = p_grundriss
     and o3.id in (select (el #>> '{}')::uuid from jsonb_array_elements(coalesce(v_a->'oeffnungen_loeschen', '[]')) el);
  v_ids := array(select (el #>> '{}')::uuid from jsonb_array_elements(coalesce(v_a->'objekte_loeschen', '[]')) el);
  v_raeume := v_raeume || array(select o2.raum_id from public.objekte o2 where o2.id = any(v_ids));
  delete from public.objekte o2 using public.raeume r
   where o2.raum_id = r.id and r.grundriss_id = p_grundriss and o2.id = any(v_ids);
  delete from public.raeume
   where grundriss_id = p_grundriss
     and id in (select (el #>> '{}')::uuid from jsonb_array_elements(coalesce(v_a->'raeume_loeschen', '[]')) el);

  -- 2. Raeume anlegen oder aendern
  for e in select * from jsonb_array_elements(coalesce(v_a->'raeume', '[]')) loop
    insert into public.raeume as r (id, grundriss_id, tag_id, name, art, punkte, hoehe_cm, bodenfarbe, wandfarben, sort)
    values (coalesce((e->>'id')::uuid, gen_random_uuid()), p_grundriss, nullif(e->>'tag_id', '')::uuid,
            coalesce(e->>'name', ''), coalesce(e->>'art', 'innen'),
            array(select v::int from jsonb_array_elements_text(e->'punkte') with ordinality a(v, n) order by n),
            coalesce((e->>'hoehe_cm')::int, 250), nullif(e->>'bodenfarbe', ''),
            case when jsonb_typeof(e->'wandfarben') = 'array' then
              array(select v from jsonb_array_elements_text(e->'wandfarben') with ordinality a(v, n) order by n) end,
            coalesce((e->>'sort')::int, 0))
    on conflict (id) do update set
      tag_id = excluded.tag_id, name = excluded.name, art = excluded.art, punkte = excluded.punkte,
      hoehe_cm = excluded.hoehe_cm, bodenfarbe = excluded.bodenfarbe, wandfarben = excluded.wandfarben,
      sort = excluded.sort
    where r.grundriss_id = p_grundriss
    returning r.id into v_raum;
    v_raeume := v_raeume || v_raum;
  end loop;

  -- 3. Raum samt Inhalt verschieben. Bodenstapel wandern hier, Getragenes
  --    wandert mit seinem Objekt (objekte_nachher).
  for e in select * from jsonb_array_elements(coalesce(v_a->'verschieben', '[]')) loop
    v_raum := (e->>'raum_id')::uuid; v_dx := (e->>'dx')::int; v_dy := (e->>'dy')::int;
    if not exists (select 1 from public.raeume where id = v_raum and grundriss_id = p_grundriss) then
      perform public.grundriss_werfen(public.grundriss_fehler('fremde_id'));
    end if;
    v_ids := array(select i.id from public.items i cross join lateral public.kiste_basis(i.id) b
                    where i.platz_raum_id = v_raum and b.wurzel_art = 'boden');
    update public.raeume
       set punkte = array(select case when u.n % 2 = 1 then u.v + v_dx else u.v + v_dy end
                            from unnest(punkte) with ordinality u(v, n) order by u.n)
     where id = v_raum;
    update public.objekte set x = x + v_dx, y = y + v_dy where raum_id = v_raum;
    update public.items set platz_x = platz_x + v_dx, platz_y = platz_y + v_dy where id = any(v_ids);
    v_raeume := v_raeume || v_raum;
  end loop;

  -- 4. Objekte anlegen oder aendern
  v_raeume := v_raeume || array(select o2.raum_id from public.objekte o2
     where o2.id in (select (el->>'id')::uuid from jsonb_array_elements(coalesce(v_a->'objekte', '[]')) el));
  for e in select * from jsonb_array_elements(coalesce(v_a->'objekte', '[]')) loop
    insert into public.objekte as ob (id, raum_id, art, name, x, y, breite_cm, tiefe_cm, hoehe_cm, drehung, form,
                                      ausschnitt_breite_cm, ausschnitt_tiefe_cm, ausschnitt_ecke, brett_cm, spalten,
                                      farbe, item_id)
    values (coalesce((e->>'id')::uuid, gen_random_uuid()), (e->>'raum_id')::uuid, e->>'art', coalesce(e->>'name', ''),
            (e->>'x')::int, (e->>'y')::int, (e->>'breite_cm')::int, (e->>'tiefe_cm')::int, (e->>'hoehe_cm')::int,
            coalesce((e->>'drehung')::smallint, 0), coalesce(e->>'form', 'rechteck'),
            (e->>'ausschnitt_breite_cm')::int, (e->>'ausschnitt_tiefe_cm')::int, nullif(e->>'ausschnitt_ecke', ''),
            case when jsonb_typeof(e->'brett_cm') = 'array' then
              array(select v::int from jsonb_array_elements_text(e->'brett_cm') with ordinality a(v, n) order by n) end,
            coalesce((e->>'spalten')::smallint, 1), nullif(e->>'farbe', ''), nullif(e->>'item_id', '')::uuid)
    on conflict (id) do update set
      raum_id = excluded.raum_id, art = excluded.art, name = excluded.name, x = excluded.x, y = excluded.y,
      breite_cm = excluded.breite_cm, tiefe_cm = excluded.tiefe_cm, hoehe_cm = excluded.hoehe_cm,
      drehung = excluded.drehung, form = excluded.form, ausschnitt_breite_cm = excluded.ausschnitt_breite_cm,
      ausschnitt_tiefe_cm = excluded.ausschnitt_tiefe_cm, ausschnitt_ecke = excluded.ausschnitt_ecke,
      brett_cm = excluded.brett_cm, spalten = excluded.spalten, farbe = excluded.farbe, item_id = excluded.item_id;
    v_raeume := v_raeume || (e->>'raum_id')::uuid;
  end loop;

  -- 5. Nach dem Teilen: was ganz im neuen Raum liegt, gehoert ihm
  for e in select * from jsonb_array_elements(coalesce(v_a->'zuordnen', '[]')) loop
    select * into rv from public.raeume where id = (e->>'von_raum_id')::uuid and grundriss_id = p_grundriss;
    select * into rn from public.raeume where id = (e->>'nach_raum_id')::uuid and grundriss_id = p_grundriss;
    if rv.id is null or rn.id is null then
      perform public.grundriss_werfen(public.grundriss_fehler('fremde_id'));
    end if;
    for o in select * from public.objekte where raum_id = rv.id loop
      if not exists (select 1 from public.objekt_rechtecke(o) q
                      where not public.geo_rechteck_im_polygon(rn.punkte, q.x0, q.y0, q.x1, q.y1)) then
        update public.objekte set raum_id = rn.id where id = o.id;   -- Getragenes folgt (objekte_nachher)
      end if;
    end loop;
    with recursive wurzeln as (
      select i.id from public.items i
       where i.platz_raum_id = rv.id and i.unterlage_art = 'boden'
         and public.geo_punkt_im_polygon(rn.punkte, i.platz_x, i.platz_y)
         and not public.geo_punkt_im_polygon(rv.punkte, i.platz_x, i.platz_y)),
    baum(id, tiefe) as (
      select id, 0 from wurzeln
      union all
      select i.id, baum.tiefe + 1 from public.items i join baum on i.unterlage_item_id = baum.id
       where baum.tiefe < 60)
    update public.items set platz_raum_id = rn.id where id in (select id from baum);
    v_raeume := v_raeume || rv.id || rn.id;
  end loop;

  -- 6. Oeffnungen anlegen oder aendern
  v_raeume := v_raeume || array(select o3.raum_id from public.oeffnungen o3
     where o3.id in (select (el->>'id')::uuid from jsonb_array_elements(coalesce(v_a->'oeffnungen', '[]')) el));
  for e in select * from jsonb_array_elements(coalesce(v_a->'oeffnungen', '[]')) loop
    insert into public.oeffnungen as oe (id, raum_id, art, kante, abstand_cm, breite_cm, hoehe_cm, bruestung_cm,
                                         anschlag, aufschlag)
    values (coalesce((e->>'id')::uuid, gen_random_uuid()), (e->>'raum_id')::uuid, e->>'art', (e->>'kante')::int,
            (e->>'abstand_cm')::int, (e->>'breite_cm')::int, (e->>'hoehe_cm')::int,
            coalesce((e->>'bruestung_cm')::int, 0), coalesce(e->>'anschlag', 'links'), coalesce(e->>'aufschlag', 'innen'))
    on conflict (id) do update set
      raum_id = excluded.raum_id, art = excluded.art, kante = excluded.kante, abstand_cm = excluded.abstand_cm,
      breite_cm = excluded.breite_cm, hoehe_cm = excluded.hoehe_cm, bruestung_cm = excluded.bruestung_cm,
      anschlag = excluded.anschlag, aufschlag = excluded.aufschlag;
    v_raeume := v_raeume || (e->>'raum_id')::uuid;
  end loop;

  -- 7. Version hochzaehlen, Schalter aus, alles Beruehrte vollstaendig pruefen
  update public.grundrisse set version = version + 1 where id = p_grundriss returning version into v_neu;
  perform set_config('kistly.spaeter', '', true);
  for v_raum in select distinct ru from unnest(v_raeume) ru where ru is not null order by 1 loop
    perform public.grundriss_werfen(public.raum_fehler(v_raum));
  end loop;
  return jsonb_build_object('version', v_neu, 'daten', public.grundriss_laden(p_grundriss));
end $fn$;

-- ================================================ 13. Rechte
revoke execute on function
  public.geo_flaeche2(int[]),
  public.geo_strecken_schneiden(bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint),
  public.geo_polygon_fehler(int[]),
  public.geo_punkt_lage(int[], bigint, bigint, int),
  public.geo_punkt_im_polygon(int[], int, int),
  public.geo_strecke_trifft_offen(bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint),
  public.geo_rechteck_im_polygon(int[], int, int, int, int),
  public.geo_kante_laenge2(int[], int),
  public.kiste_traegt(int, int, smallint, int, int, int, int),
  public.objekt_lokal(public.objekte, int, int),
  public.objekt_global(public.objekte, int, int),
  public.objekt_enthaelt(public.objekte, int, int),
  public.objekt_im_fach(public.objekte, int, int, int),
  public.fach_decke(public.objekte, int),
  public.faecher_gueltig(int[], int),
  public.objekt_rechtecke(public.objekte),
  public.grundriss_fehler(text, jsonb),
  public.grundriss_werfen(jsonb),
  public.grundriss_spaeter(),
  public.kiste_basis(uuid),
  public.platz_fehler(public.items, boolean),
  public.objekt_fehler(public.objekte, public.raeume),
  public.oeffnung_fehler(public.oeffnungen, public.raeume),
  public.raum_inhalt_fehler(public.raeume),
  public.raum_verstoesse(uuid),
  public.raum_fehler(uuid),
  public.platz_nachruecken(public.items, public.items),
  public.grundriss_sicherstellen(uuid, text),
  public.grundriss_laden(uuid, uuid),
  public.kiste_lage(uuid),
  public.platz_setzen(uuid, uuid, int, int, int, text, uuid, uuid, int, int),
  public.platz_raeumen(uuid),
  public.grundriss_kisten_zahl(uuid),
  public.grundriss_speichern(uuid, int, jsonb),
  public.grundrisse_vorher(), public.raeume_vorher(), public.oeffnungen_vorher(),
  public.objekte_vorher(), public.objekte_nachher(), public.objekte_weg(),
  public.items_a_platz_sperre(), public.items_platz_pruefen(), public.items_platz_nachher(),
  public.items_platz_weg()
from public, anon;

grant execute on function
  public.geo_flaeche2(int[]),
  public.geo_strecken_schneiden(bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint),
  public.geo_polygon_fehler(int[]),
  public.geo_punkt_lage(int[], bigint, bigint, int),
  public.geo_punkt_im_polygon(int[], int, int),
  public.geo_strecke_trifft_offen(bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint),
  public.geo_rechteck_im_polygon(int[], int, int, int, int),
  public.geo_kante_laenge2(int[], int),
  public.kiste_traegt(int, int, smallint, int, int, int, int),
  public.objekt_lokal(public.objekte, int, int),
  public.objekt_global(public.objekte, int, int),
  public.objekt_enthaelt(public.objekte, int, int),
  public.objekt_im_fach(public.objekte, int, int, int),
  public.fach_decke(public.objekte, int),
  public.faecher_gueltig(int[], int),
  public.objekt_rechtecke(public.objekte),
  public.grundriss_fehler(text, jsonb),
  public.grundriss_werfen(jsonb),
  public.grundriss_spaeter(),
  public.kiste_basis(uuid),
  public.platz_fehler(public.items, boolean),
  public.objekt_fehler(public.objekte, public.raeume),
  public.oeffnung_fehler(public.oeffnungen, public.raeume),
  public.raum_inhalt_fehler(public.raeume),
  public.raum_verstoesse(uuid),
  public.raum_fehler(uuid),
  public.platz_nachruecken(public.items, public.items),
  public.grundriss_sicherstellen(uuid, text),
  public.grundriss_laden(uuid, uuid),
  public.kiste_lage(uuid),
  public.platz_setzen(uuid, uuid, int, int, int, text, uuid, uuid, int, int),
  public.platz_raeumen(uuid),
  public.grundriss_kisten_zahl(uuid),
  public.grundriss_speichern(uuid, int, jsonb),
  public.raum_sperre(uuid, boolean)
to authenticated;
