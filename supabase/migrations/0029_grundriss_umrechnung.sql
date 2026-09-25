-- =====================================================================
-- Kistly 0029_grundriss_umrechnung
--
-- Der alte Raumplan (Raster, 0017 bis 0025) wird ins neue Modell (0028)
-- uebertragen und danach eingefroren (START 5.3):
--  - jeder room_plan ein Rechteck-Raum im ersten Grundriss des Umzugs
--    ("Neue Wohnung"), nebeneinander mit 100 cm Abstand; gesperrte Zellen
--    werden nicht nachgebildet, ihre Zahl steht im Bericht
--  - die Tuer eine Oeffnung auf der Kante ihrer Seite, mittig auf ihrer
--    Zelle, 80 cm breit (bei kurzer Kante so breit wie die Kante)
--  - jedes Regal ein Objekt "regal", brett_cm = boeden_cm
--  - jede Kiste auf die Mitte ihrer Zelle; Stapel werden Ketten "liegt
--    auf", Regalplaetze Faecher (Ebene = Brett, Spalte 1)
-- Bericht und Sicherung stehen in grundriss_umrechnung. Die alten
-- Tabellen bleiben bis 0031 stehen (nur lesbar), items.plan_* werden
-- geleert. Selbstpruefung: jede alte Kiste genau einmal gesetzt oder im
-- Bericht, gleiche Unterkante, keine Verstoesse. Sonst Abbruch.
-- =====================================================================

create table public.grundriss_umrechnung (
  id         bigserial primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  art        text not null check (art in ('raum', 'tuer', 'regal', 'kiste')),
  alt_id     uuid,          -- Zimmer-Tag, Regal oder Kiste
  neu_id     uuid,          -- Raum, Objekt, bei Kisten der Raum
  ergebnis   text not null check (ergebnis in ('uebernommen', 'nicht_uebernommen', 'hinweis')),
  grund      text,
  alt        jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index grundriss_umrechnung_project_idx on public.grundriss_umrechnung (project_id, art);
alter table public.grundriss_umrechnung enable row level security;
create policy grundriss_umrechnung_select on public.grundriss_umrechnung for select to authenticated
  using (public.is_member(project_id));
revoke all on public.grundriss_umrechnung from anon;
revoke insert, update, delete on public.grundriss_umrechnung from authenticated;

create function public.grundriss_umrechnen() returns void
language plpgsql set search_path = public as $fn$
declare
  v_projekt   uuid;
  v_grundriss uuid;
  v_raum      uuid;
  v_objekt    uuid;
  v_unter     uuid;
  v_item      uuid;
  rp          record;
  g           record;
  k           record;
  d           record;
  v_ox int; v_oy int; v_zeile int;
  v_b int; v_t int; v_ras int; v_spalten int; v_reihen int;
  v_cx int; v_cy int; v_kante int; v_breite int; v_abstand int;
  v_bw int; v_bd int; v_runde int := 0; v_zahl int;
  v_kennung text; v_code text;
begin
  lock table public.items, public.room_plans, public.regale in share row exclusive mode;
  perform set_config('kistly.spaeter', 'an', true);

  create temporary table umr_raum (tag_id uuid primary key, raum_id uuid not null,
    ox int not null, oy int not null, raster int not null, breite int not null, tiefe int not null) on commit drop;
  create temporary table umr_regal (regal_id uuid primary key, objekt_id uuid not null) on commit drop;
  create temporary table umr_kiste (item_id uuid primary key, alt jsonb not null,
    alt_unten int, grund text) on commit drop;

  -- 1. Jede Kiste mit altem Platz, mit alter Unterkante (Formel aus 0026;
  --    Hoehe ueber kiste_masse, damit eine schon vergebene eigene Groesse
  --    keinen Scheinfehler ausloest).
  insert into umr_kiste (item_id, alt, alt_unten)
  select i.id,
         jsonb_build_object('code', i.code, 'room_id', i.room_id, 'plan_x', i.plan_x, 'plan_y', i.plan_y,
                            'plan_z', i.plan_z, 'regal_id', i.regal_id, 'regal_boden', i.regal_boden),
         coalesce(rg.boeden_cm[i.regal_boden], 0) + coalesce((
           select sum(m.hoehe_cm)::int
             from public.items u
             cross join lateral public.kiste_masse(u.size, u.eigene_hoehe_cm, u.eigene_groesse_id) m
            where u.room_id = i.room_id and u.plan_x = i.plan_x and u.plan_y = i.plan_y
              and coalesce(u.regal_boden, 0) = coalesce(i.regal_boden, 0) and u.plan_z < i.plan_z), 0)
    from public.items i
    left join public.regale rg on rg.id = i.regal_id
   where i.plan_x is not null;

  -- 2. Raeume und Tueren
  for v_projekt in select distinct p.project_id from public.room_plans p order by 1 loop
    select id into v_grundriss from public.grundrisse
     where project_id = v_projekt order by sort, created_at limit 1;
    if v_grundriss is null then
      insert into public.grundrisse (project_id, name) values (v_projekt, 'Neue Wohnung')
      returning id into v_grundriss;
    end if;
    select coalesce(max(u.v) + 100, 0) into v_ox
      from public.raeume r cross join lateral unnest(r.punkte) with ordinality u(v, n)
     where r.grundriss_id = v_grundriss and u.n % 2 = 1;
    v_oy := 0; v_zeile := 0;

    for rp in select p.* from public.room_plans p join public.tags t on t.id = p.tag_id
               where p.project_id = v_projekt order by t.sort, t.name loop
      if exists (select 1 from public.raeume where grundriss_id = v_grundriss and tag_id = rp.tag_id) then
        insert into public.grundriss_umrechnung (project_id, art, alt_id, ergebnis, grund, alt)
        values (v_projekt, 'raum', rp.tag_id, 'nicht_uebernommen', 'zimmer_schon_gezeichnet', to_jsonb(rp));
        continue;
      end if;
      v_b := rp.breite_cm; v_t := rp.tiefe_cm; v_ras := rp.raster_cm;
      if v_ox > 0 and v_ox + v_b > 20000 then          -- neue Reihe
        v_ox := 0; v_oy := v_oy + v_zeile + 100; v_zeile := 0;
      end if;
      insert into public.raeume (grundriss_id, tag_id, punkte, hoehe_cm)
      values (v_grundriss, rp.tag_id,
              array[v_ox, v_oy, v_ox + v_b, v_oy, v_ox + v_b, v_oy + v_t, v_ox, v_oy + v_t], rp.hoehe_cm)
      returning id into v_raum;
      insert into umr_raum values (rp.tag_id, v_raum, v_ox, v_oy, v_ras, v_b, v_t);
      insert into public.grundriss_umrechnung (project_id, art, alt_id, neu_id, ergebnis, grund, alt)
      values (v_projekt, 'raum', rp.tag_id, v_raum, 'uebernommen',
              case when jsonb_array_length(rp.gesperrt) > 0 then 'gesperrte_zellen_nicht_nachgebildet' end,
              jsonb_build_object('breite_cm', v_b, 'tiefe_cm', v_t, 'hoehe_cm', rp.hoehe_cm, 'raster_cm', v_ras,
                                 'gesperrt', jsonb_array_length(rp.gesperrt), 'tuer_x', rp.tuer_x,
                                 'tuer_y', rp.tuer_y, 'tuer_seite', rp.tuer_seite));

      if rp.tuer_x is not null then
        v_spalten := ceil(v_b::numeric / v_ras);
        v_reihen  := ceil(v_t::numeric / v_ras);
        v_cx := (rp.tuer_x * v_ras + least((rp.tuer_x + 1) * v_ras, v_b)) / 2;   -- Zellmitte im Raum
        v_cy := (rp.tuer_y * v_ras + least((rp.tuer_y + 1) * v_ras, v_t)) / 2;
        -- Kanten des Rechtecks: 0 oben (nord), 1 rechts (ost), 2 unten (sued, laeuft nach links),
        -- 3 links (west, laeuft nach oben)
        case rp.tuer_seite
          when 'nord' then v_kante := 0; v_breite := least(80, v_b);
                           v_abstand := greatest(0, least(v_cx - v_breite / 2, v_b - v_breite));
          when 'ost'  then v_kante := 1; v_breite := least(80, v_t);
                           v_abstand := greatest(0, least(v_cy - v_breite / 2, v_t - v_breite));
          when 'sued' then v_kante := 2; v_breite := least(80, v_b);
                           v_abstand := greatest(0, least((v_b - v_cx) - v_breite / 2, v_b - v_breite));
          else             v_kante := 3; v_breite := least(80, v_t);
                           v_abstand := greatest(0, least((v_t - v_cy) - v_breite / 2, v_t - v_breite));
        end case;
        insert into public.oeffnungen (raum_id, art, kante, abstand_cm, breite_cm, hoehe_cm)
        values (v_raum, 'tuer', v_kante, v_abstand, v_breite, least(200, rp.hoehe_cm));
        -- Sass die Tuer an einer inneren Zellkante (neben gesperrten Zellen), steht sie jetzt auf der
        -- Aussenkante derselben Seite. Das meldet der Bericht (Bewertung "Korrektheit").
        if not ((rp.tuer_seite = 'nord' and rp.tuer_y = 0) or (rp.tuer_seite = 'sued' and rp.tuer_y = v_reihen - 1)
             or (rp.tuer_seite = 'west' and rp.tuer_x = 0) or (rp.tuer_seite = 'ost' and rp.tuer_x = v_spalten - 1)) then
          insert into public.grundriss_umrechnung (project_id, art, alt_id, neu_id, ergebnis, grund, alt)
          values (v_projekt, 'tuer', rp.tag_id, v_raum, 'hinweis', 'tuer_war_innen',
                  jsonb_build_object('tuer_x', rp.tuer_x, 'tuer_y', rp.tuer_y, 'tuer_seite', rp.tuer_seite));
        end if;
      end if;
      v_zeile := greatest(v_zeile, v_t);
      v_ox := v_ox + v_b + 100;
    end loop;
  end loop;

  -- 3. Regale
  for g in select rg.*, u.raum_id as n_raum, u.ox as n_ox, u.oy as n_oy, u.raster as n_raster,
                  u.breite as n_breite, u.tiefe as n_tiefe
             from public.regale rg join umr_raum u on u.tag_id = rg.tag_id loop
    v_bw := least((g.x + g.breite) * g.n_raster, g.n_breite) - g.x * g.n_raster;
    v_bd := least((g.y + g.tiefe) * g.n_raster, g.n_tiefe) - g.y * g.n_raster;
    if v_bw < 5 or v_bd < 5 or not public.faecher_gueltig(g.boeden_cm, g.hoehe_cm) then
      insert into public.grundriss_umrechnung (project_id, art, alt_id, ergebnis, grund, alt)
      values (g.project_id, 'regal', g.id, 'nicht_uebernommen',
              case when v_bw < 5 or v_bd < 5 then 'regal_zu_schmal' else 'bretter_passen_nicht' end,
              jsonb_build_object('name', g.name, 'x', g.x, 'y', g.y, 'breite', g.breite, 'tiefe', g.tiefe,
                                 'hoehe_cm', g.hoehe_cm, 'boeden_cm', g.boeden_cm));
      continue;
    end if;
    insert into public.objekte (raum_id, art, name, x, y, breite_cm, tiefe_cm, hoehe_cm, brett_cm, spalten)
    values (g.n_raum, 'regal', g.name, g.n_ox + g.x * g.n_raster, g.n_oy + g.y * g.n_raster,
            v_bw, v_bd, g.hoehe_cm, g.boeden_cm, 1)
    returning id into v_objekt;
    insert into umr_regal values (g.id, v_objekt);
    insert into public.grundriss_umrechnung (project_id, art, alt_id, neu_id, ergebnis, alt)
    values (g.project_id, 'regal', g.id, v_objekt, 'uebernommen',
            jsonb_build_object('name', g.name, 'x', g.x, 'y', g.y, 'breite', g.breite, 'tiefe', g.tiefe,
                               'hoehe_cm', g.hoehe_cm, 'boeden_cm', g.boeden_cm));
  end loop;

  -- 4. Kisten, Stapel von unten nach oben
  for k in
    select i.id, i.room_id, i.plan_x, i.plan_y, i.plan_z, i.regal_id, i.regal_boden,
           u.raum_id as n_raum, u.ox as n_ox, u.oy as n_oy, u.raster as n_raster,
           u.breite as n_breite, u.tiefe as n_tiefe, ur.objekt_id as n_objekt
      from umr_kiste uk
      join public.items i on i.id = uk.item_id
      left join umr_raum u on u.tag_id = i.room_id
      left join umr_regal ur on ur.regal_id = i.regal_id
     order by i.room_id, i.plan_x, i.plan_y, coalesce(i.regal_boden, 0), i.plan_z
  loop
    if k.n_raum is null then
      update umr_kiste set grund = 'zimmer_nicht_uebernommen' where item_id = k.id;
      continue;
    end if;
    if k.regal_id is not null and k.n_objekt is null then
      update umr_kiste set grund = 'regal_nicht_uebernommen' where item_id = k.id;
      continue;
    end if;
    v_cx := k.n_ox + (k.plan_x * k.n_raster + least((k.plan_x + 1) * k.n_raster, k.n_breite)) / 2;
    v_cy := k.n_oy + (k.plan_y * k.n_raster + least((k.plan_y + 1) * k.n_raster, k.n_tiefe)) / 2;
    if k.plan_z > 0 then
      select i2.id into v_unter from public.items i2
       where i2.room_id = k.room_id and i2.plan_x = k.plan_x and i2.plan_y = k.plan_y
         and coalesce(i2.regal_boden, 0) = coalesce(k.regal_boden, 0) and i2.plan_z = k.plan_z - 1;
      if v_unter is null or not exists (select 1 from public.items where id = v_unter and platz_raum_id is not null) then
        update umr_kiste set grund = 'darunter_nicht_uebernommen' where item_id = k.id;
        continue;
      end if;
      update public.items
         set platz_raum_id = k.n_raum, platz_x = v_cx, platz_y = v_cy, platz_drehung = 0,
             unterlage_art = 'kiste', unterlage_item_id = v_unter
       where id = k.id;
    elsif k.regal_id is not null then
      update public.items
         set platz_raum_id = k.n_raum, platz_x = v_cx, platz_y = v_cy, platz_drehung = 0,
             unterlage_art = 'fach', unterlage_objekt_id = k.n_objekt,
             fach_ebene = k.regal_boden, fach_spalte = 1
       where id = k.id;
    else
      update public.items
         set platz_raum_id = k.n_raum, platz_x = v_cx, platz_y = v_cy, platz_drehung = 0,
             unterlage_art = 'boden'
       where id = k.id;
    end if;
  end loop;

  -- 5. Aufraeumen: eine Kiste, die gegen eine Regel verstoesst, kommt mit
  --    allem, was darauf liegt, in den Bericht (von oben nach unten leeren).
  loop
    v_runde := v_runde + 1;
    if v_runde > 1000 then
      raise exception 'Umrechnung: Aufraeumen endet nicht';
    end if;
    v_item := null;
    select v.kiste_id, v.kennung into v_item, v_kennung
      from umr_raum u cross join lateral public.raum_verstoesse(u.raum_id) v
     where v.kiste_id is not null
     limit 1;
    exit when v_item is null;
    for d in
      with recursive baum(id, tiefe) as (
        select v_item, 0
        union all
        select i.id, baum.tiefe + 1 from public.items i join baum on i.unterlage_item_id = baum.id
         where baum.tiefe < 60)
      select baum.id from baum order by baum.tiefe desc
    loop
      update public.items set platz_raum_id = null where id = d.id;
      update umr_kiste
         set grund = case when d.id = v_item then v_kennung else 'darunter_' || v_kennung end
       where item_id = d.id;
    end loop;
  end loop;

  -- 6. Selbstpruefung
  select count(*) into v_zahl
    from umr_raum u cross join lateral public.raum_verstoesse(u.raum_id) v
   where v.kiste_id is null;
  if v_zahl > 0 then
    raise exception 'Umrechnung: % Verstoesse an Raeumen, Tueren oder Regalen', v_zahl;
  end if;
  select count(*) into v_zahl
    from umr_kiste uk join public.items i on i.id = uk.item_id
   where (i.platz_raum_id is not null) = (uk.grund is not null);
  if v_zahl > 0 then
    raise exception 'Umrechnung: % Kisten ohne eindeutiges Ergebnis', v_zahl;
  end if;
  select count(*), min(i.code) into v_zahl, v_code
    from umr_kiste uk join public.items i on i.id = uk.item_id
    cross join lateral public.kiste_basis(i.id) b
   where i.platz_raum_id is not null and b.unten_cm is distinct from uk.alt_unten;
  if v_zahl > 0 then
    raise exception 'Umrechnung: % Kisten mit anderer Unterkante, zuerst %', v_zahl, v_code;
  end if;
  if (select count(*) from umr_raum)
     <> (select count(*) from public.room_plans)
      - (select count(*) from public.grundriss_umrechnung where art = 'raum' and ergebnis = 'nicht_uebernommen') then
    raise exception 'Umrechnung: Zahl der Raeume passt nicht zur Zahl der Plaene';
  end if;

  -- 7. Bericht je Kiste (mit den alten Werten als Sicherung)
  insert into public.grundriss_umrechnung (project_id, art, alt_id, neu_id, ergebnis, grund, alt)
  select i.project_id, 'kiste', i.id, i.platz_raum_id,
         case when uk.grund is null then 'uebernommen' else 'nicht_uebernommen' end,
         uk.grund, uk.alt || jsonb_build_object('alt_unten', uk.alt_unten)
    from umr_kiste uk join public.items i on i.id = uk.item_id;

  perform set_config('kistly.spaeter', '', true);
end $fn$;

-- Aufruf. Im Probelauf steht hier: perform public.grundriss_umrechnen();
select public.grundriss_umrechnen();

drop function public.grundriss_umrechnen();

-- ------------------------------------------------ Altes Raster einfrieren
drop trigger if exists items_stapel_nachruecken on public.items;

update public.items
   set plan_x = null, plan_y = null, plan_z = null, regal_id = null, regal_boden = null
 where plan_x is not null or regal_id is not null;

-- Setzen lehnt der Waechter ab, Leeren nicht (Kaskaden beim Loeschen von
-- Zimmer oder Umzug laufen weiter). Alte, noch zwischengespeicherte Apps
-- bekommen einen zweisprachigen Satz ueber fehler.db.raumplan.eingefroren.
create function public.items_plan_eingefroren() returns trigger
language plpgsql set search_path = public as $fn$
begin
  if (tg_op = 'INSERT' and num_nonnulls(new.plan_x, new.plan_y, new.plan_z, new.regal_id, new.regal_boden) > 0)
     or (tg_op = 'UPDATE' and (
          (new.plan_x is not null and new.plan_x is distinct from old.plan_x)
       or (new.plan_y is not null and new.plan_y is distinct from old.plan_y)
       or (new.plan_z is not null and new.plan_z is distinct from old.plan_z)
       or (new.regal_id is not null and new.regal_id is distinct from old.regal_id)
       or (new.regal_boden is not null and new.regal_boden is distinct from old.regal_boden))) then
    raise exception 'Der alte Raumplan ist abgeloest. Bitte die App neu laden.'
      using errcode = 'check_violation', hint = 'kistly:raumplan.eingefroren';
  end if;
  return new;
end $fn$;
create trigger items_plan_eingefroren before insert or update on public.items
  for each row execute function public.items_plan_eingefroren();

create function public.raumplan_eingefroren() returns trigger
language plpgsql set search_path = public as $fn$
begin
  raise exception 'Der alte Raumplan ist abgeloest. Bitte die App neu laden.'
    using errcode = 'check_violation', hint = 'kistly:raumplan.eingefroren';
end $fn$;
create trigger room_plans_eingefroren before insert or update on public.room_plans
  for each row execute function public.raumplan_eingefroren();
create trigger regale_eingefroren before insert or update on public.regale
  for each row execute function public.raumplan_eingefroren();

revoke execute on function public.items_plan_eingefroren(), public.raumplan_eingefroren() from public, anon;

-- --------------------------- Suche uebergangsweise auf das neue Modell
-- Gleiche Signatur und Spalten wie 0026, damit die App bis Etappe 3
-- unveraendert weiter sucht: plan_x/plan_y tragen den Mittelpunkt in cm,
-- plan_z die Zahl der Kisten darunter, regal_name/regal_boden das Objekt
-- und die Ebene eines Fachs. 0030 ersetzt das durch die endgueltige Fassung.
create or replace function public.inhalt_suchen(p_q text, p_max int default 60)
returns table (
  content_id uuid, inhalt text, menge int, schicht smallint, photo_id uuid, foto_pfad text,
  box_x0 numeric, box_y0 numeric, box_x1 numeric, box_y1 numeric, punkt_x numeric, punkt_y numeric,
  ausschnitt_pfad text, bestaetigt boolean,
  item_id uuid, item_code text, item_kind text, item_title text, item_status text,
  project_id uuid, project_name text,
  room_id uuid, room_name text, room_color text,
  plan_x int, plan_y int, plan_z int, regal_name text, regal_boden smallint,
  hoehe_von int, hoehe_bis int, treffer real)
language sql stable security invoker set search_path = public, extensions as $fn$
  with q as (select public.such_normal(p_q) as n)
  select
    c.id, c.text, c.qty, c.schicht, c.photo_id, f.path,
    c.box_x0, c.box_y0, c.box_x1, c.box_y1, c.punkt_x, c.punkt_y,
    c.ausschnitt_pfad, c.bestaetigt,
    i.id, i.code, i.kind::text, i.title, i.status::text,
    p.id, p.name,
    t.id, t.name, t.color,
    i.platz_x, i.platz_y, case when i.platz_raum_id is null then null else b.tiefe end,
    case when i.unterlage_art = 'fach' then o.name end,
    case when i.unterlage_art = 'fach' then i.fach_ebene end,
    b.unten_cm, b.unten_cm + m.hoehe_cm,
    (case
      when c.such_text = q.n then 1.0
      when strpos(' ' || c.such_text || ' ', ' ' || q.n || ' ') > 0 then 0.95
      when strpos(' ' || c.such_text, ' ' || q.n) > 0 then 0.9
      when strpos(c.such_text, q.n) > 0 then 0.8
      else least(extensions.word_similarity(q.n, c.such_text), 0.79)
    end)::real
  from q
  join public.item_contents c
    on strpos(c.such_text, q.n) > 0
    or extensions.word_similarity(q.n, c.such_text) >= 0.45
  join public.items i on i.id = c.item_id
  join public.projects p on p.id = i.project_id
  left join public.item_photos f on f.id = c.photo_id
  left join public.tags t on t.id = i.room_id
  left join public.objekte o on o.id = i.unterlage_objekt_id
  left join lateral public.kiste_basis(i.id) b on true
  left join lateral public.kiste_masse(i.size, i.eigene_hoehe_cm, i.eigene_groesse_id) m on true
  where length(q.n) >= 2
  order by 32 desc, length(c.text), c.text
  limit least(greatest(coalesce(p_max, 60), 1), 200)
$fn$;

revoke execute on function public.inhalt_suchen(text, int) from public, anon;
grant  execute on function public.inhalt_suchen(text, int) to authenticated;
