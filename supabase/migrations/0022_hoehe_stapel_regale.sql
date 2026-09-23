-- =====================================================================
-- Kistly 0022_hoehe_stapel_regale
--
-- Der Raumplan rechnet ab jetzt in Zentimetern statt in Lagen zu je 40 cm,
-- und ein Zimmer kann Regale haben.
--
-- 1. Echte Hoehe. Jede Kiste ist so hoch wie ihre Groesse (0021), ausser
--    sie hat eine eigene Hoehe (items.eigene_hoehe_cm, etwa eine
--    Kleiderbox). plan_z bleibt die Reihenfolge im Stapel, 0 ist unten. Wo
--    eine Kiste in der Hoehe steht, wird aus den Kisten darunter
--    abgeleitet und nie gespeichert: sonst gaebe es eine zweite Fassung,
--    die nicht mitwandert, wenn eine untere Kiste groesser wird.
--
-- 2. Regale. Ein Regal steht auf einer oder mehreren Zellen und hat
--    Bretter in bestimmter Hoehe (boeden_cm, aufsteigend, Brett 1 ist das
--    unterste). Auf jedem Brett stapeln sich Kisten bis unter das naechste
--    Brett; auf dem obersten bis unter die Decke. Auf den Boden einer
--    Regalzelle darf nichts: wer den Platz unter dem Regal nutzen will,
--    legt ein Brett bei 0 cm an.
--
-- 3. Nachruecken. Verlaesst eine Kiste einen Stapel (anderes Zimmer, vom
--    Platz genommen, anderer Platz, geloescht), rutschen die Kisten
--    darueber nach. Das macht jetzt die Datenbank in einem Vorgang, nicht
--    mehr der Browser mit mehreren einzelnen Schreibvorgaengen.
--
-- 4. Pruefungen mit Kennung. Jede Ablehnung traegt einen Hinweis der
--    Form 'kistly:raumplan.xyz'. Die App schlaegt damit den Satz im
--    Woerterbuch nach, auf Deutsch und Arabisch. Vorher stand der deutsche
--    Text der Datenbank auch im arabischen Satz.
--
-- 5. Der Plan selbst prueft mehr: die Tuer liegt an einer Wand, das
--    Raster laesst sich nur aendern, solange nichts im Plan steht, und ein
--    kleineres oder niedrigeres Zimmer wird abgelehnt, solange Kisten oder
--    Regale dann draussen oder zu hoch stuenden.
--
-- 6. Moebel stehen nicht im Raumplan. Ein Eintrag, der zu Moebel wird,
--    verliert seinen Platz.
--
-- 7. Gefunden beim Probelauf dieser Datei: 0017 fragte "ist diese Zelle
--    gesperrt?" mit gesperrt @> [[x, y]]. Fuer jsonb heisst das aber
--    "sind x und y irgendwo in einer gesperrten Zelle enthalten", wie bei
--    Mengen. Mit [[1,0]] galten so auch (0,0), (0,1) und (1,1) als
--    gesperrt. Jetzt fragt zelle_gesperrt genau nach dem Paar.
--
-- Was hier geprueft wird, darf die Oberflaeche nicht allein pruefen: zwei
-- Leute koennen gleichzeitig legen.
-- =====================================================================

-- ----------------------------------------- 0. Ist diese Zelle gesperrt?
create or replace function public.zelle_gesperrt(p_gesperrt jsonb, p_x int, p_y int)
returns boolean language sql immutable as $fn$
  select exists (
    select 1 from jsonb_array_elements(p_gesperrt) z
     where jsonb_typeof(z) = 'array'
       and (z->>0)::int = p_x
       and (z->>1)::int = p_y
  )
$fn$;

alter function public.zelle_gesperrt(jsonb, int, int) set search_path = public;

-- ------------------------------------------------ 1. Hoehe einer Kiste
alter table public.items add column if not exists eigene_hoehe_cm smallint;

do $$ begin
  alter table public.items add constraint items_eigene_hoehe_check
    check (eigene_hoehe_cm is null or eigene_hoehe_cm between 5 and 300);
exception when duplicate_object then null; end $$;

-- Die Hoehe, mit der eine Kiste im Raumplan rechnet. Eine Fassung fuer
-- alle Pruefungen. 40 nur, falls die Groesse fehlt, was 0001 verbietet.
create or replace function public.item_hoehe_cm(p_size smallint, p_eigen smallint)
returns int language sql stable as $fn$
  select coalesce(
    p_eigen::int,
    (select g.hoehe_cm::int from public.kisten_groessen g where g.stufe = p_size),
    40
  )
$fn$;

alter function public.item_hoehe_cm(smallint, smallint) set search_path = public;
revoke execute on function public.item_hoehe_cm(smallint, smallint) from public, anon;
grant  execute on function public.item_hoehe_cm(smallint, smallint) to authenticated;

-- ------------------------------------------------------------ 2. Regale
create table if not exists public.regale (
  id         uuid primary key default gen_random_uuid(),
  -- Ein Regal gehoert zum Plan eines Zimmers. Faellt der Plan, fallen die
  -- Regale mit (ihre Kisten verlieren vorher den Platz, siehe unten).
  tag_id     uuid not null references public.room_plans(tag_id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  name       text not null default '' check (length(name) <= 60),
  -- Linke hintere Zelle und Ausdehnung in Zellen.
  x          int  not null check (x >= 0),
  y          int  not null check (y >= 0),
  breite     int  not null default 1 check (breite between 1 and 40),
  tiefe      int  not null default 1 check (tiefe  between 1 and 40),
  hoehe_cm   int  not null check (hoehe_cm between 20 and 600),
  -- Hoehe der Bretter in cm, aufsteigend. Brett 1 ist das unterste.
  boeden_cm  int[] not null
             check (array_length(boeden_cm, 1) between 1 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists regale_tag_idx on public.regale(tag_id);

alter table public.items add column if not exists regal_id uuid
  references public.regale(id) on delete set null;
alter table public.items add column if not exists regal_boden smallint;

do $$ begin
  alter table public.items add constraint items_regal_check
    check (
      num_nonnulls(regal_id, regal_boden) in (0, 2)
      and (regal_boden is null or regal_boden between 1 and 20)
      -- Ein Regal nur zusammen mit einem Platz.
      and (regal_id is null or plan_x is not null)
    );
exception when duplicate_object then null; end $$;

-- Ein Platz je Kiste. Neu: das Brett gehoert zum Platz, 0 ist der Boden.
drop index if exists public.items_plan_platz;
create unique index if not exists items_plan_platz2
  on public.items(room_id, plan_x, plan_y, coalesce(regal_boden, 0), plan_z)
  where plan_x is not null;

-- ------------------------------------------- 3. Der Platz einer Kiste
create or replace function public.items_plan_pruefen()
returns trigger language plpgsql as $fn$
declare
  p         public.room_plans;
  r         public.regale;
  v_spalten int;
  v_reihen  int;
  v_brett   int;   -- Hoehe, auf der der Stapel steht
  v_grenze  int;   -- bis wohin er reichen darf
  v_rest    int;   -- Hoehe aller anderen Kisten im selben Stapel
begin
  -- Ohne Zimmer gibt es keinen Platz im Zimmer.
  if new.room_id is null then
    new.plan_x := null; new.plan_y := null; new.plan_z := null;
  end if;

  -- Zieht die Kiste in ein anderes Zimmer, gilt der alte Platz nicht
  -- mehr. Wer gleichzeitig einen neuen Platz mitgibt, behaelt ihn.
  if tg_op = 'UPDATE' and new.room_id is distinct from old.room_id then
    if new.plan_x is not distinct from old.plan_x
       and new.plan_y is not distinct from old.plan_y
       and new.plan_z is not distinct from old.plan_z then
      new.plan_x := null; new.plan_y := null; new.plan_z := null;
      new.regal_id := null; new.regal_boden := null;
    end if;
  end if;

  -- Moebel haben keinen Platz im Raumplan.
  if new.kind = 'furniture' then
    new.plan_x := null; new.plan_y := null; new.plan_z := null;
  end if;

  if new.plan_x is null then
    new.regal_id := null; new.regal_boden := null;
    return new;
  end if;

  -- Steht die Kiste, wie sie stand, gibt es nichts zu pruefen. Sonst
  -- scheiterte jede andere Aenderung an ihr (0020).
  if tg_op = 'UPDATE'
     and new.room_id         is not distinct from old.room_id
     and new.plan_x          is not distinct from old.plan_x
     and new.plan_y          is not distinct from old.plan_y
     and new.plan_z          is not distinct from old.plan_z
     and new.regal_id        is not distinct from old.regal_id
     and new.regal_boden     is not distinct from old.regal_boden
     and new.size            is not distinct from old.size
     and new.eigene_hoehe_cm is not distinct from old.eigene_hoehe_cm then
    return new;
  end if;

  select * into p from public.room_plans where tag_id = new.room_id;
  if p.tag_id is null then
    raise exception 'Für dieses Zimmer gibt es noch keinen Plan'
      using errcode = 'no_data_found', hint = 'kistly:raumplan.kein_plan';
  end if;

  v_spalten := ceil(p.breite_cm::numeric / p.raster_cm);
  v_reihen  := ceil(p.tiefe_cm::numeric  / p.raster_cm);

  if new.plan_x >= v_spalten or new.plan_y >= v_reihen then
    raise exception 'Der Platz liegt außerhalb des Zimmers'
      using errcode = 'check_violation', hint = 'kistly:raumplan.platz_draussen';
  end if;
  if public.zelle_gesperrt(p.gesperrt, new.plan_x, new.plan_y) then
    raise exception 'Dieser Platz gehört nicht zum Zimmer'
      using errcode = 'check_violation', hint = 'kistly:raumplan.platz_gesperrt';
  end if;

  -- Wer gleichzeitig auf dieselbe Zelle legt, wartet hier auf den anderen.
  -- Sonst saehen beide denselben Stapel und zusammen waere er zu hoch.
  perform pg_advisory_xact_lock(
    hashtextextended(new.room_id::text || ':' || new.plan_x || ':' || new.plan_y, 0));

  if new.regal_id is null then
    if exists (
      select 1 from public.regale g
       where g.tag_id = new.room_id
         and new.plan_x between g.x and g.x + g.breite - 1
         and new.plan_y between g.y and g.y + g.tiefe - 1
    ) then
      raise exception 'Hier steht ein Regal. Wähle ein Brett.'
        using errcode = 'check_violation', hint = 'kistly:raumplan.regal_hier';
    end if;
    v_brett  := 0;
    v_grenze := p.hoehe_cm;
  else
    select * into r from public.regale where id = new.regal_id;
    if r.id is null or r.tag_id <> new.room_id then
      raise exception 'Das Regal steht in einem anderen Zimmer'
        using errcode = 'check_violation', hint = 'kistly:raumplan.regal_anderes_zimmer';
    end if;
    if new.plan_x not between r.x and r.x + r.breite - 1
       or new.plan_y not between r.y and r.y + r.tiefe - 1 then
      raise exception 'Diese Zelle gehört nicht zum Regal'
        using errcode = 'check_violation', hint = 'kistly:raumplan.regal_zelle';
    end if;
    if new.regal_boden > array_length(r.boeden_cm, 1) then
      raise exception 'Dieses Brett gibt es nicht'
        using errcode = 'check_violation', hint = 'kistly:raumplan.regal_brett';
    end if;
    v_brett := r.boeden_cm[new.regal_boden];
    v_grenze := case
      when new.regal_boden < array_length(r.boeden_cm, 1) then r.boeden_cm[new.regal_boden + 1]
      else p.hoehe_cm
    end;
  end if;

  -- Kein Klotz schwebt: unter jeder Kiste steht eine, ausser ganz unten.
  if new.plan_z > 0 and not exists (
    select 1 from public.items i
     where i.id <> new.id
       and i.room_id = new.room_id
       and i.plan_x = new.plan_x and i.plan_y = new.plan_y
       and coalesce(i.regal_boden, 0) = coalesce(new.regal_boden, 0)
       and i.plan_z = new.plan_z - 1
  ) then
    raise exception 'Darunter steht nichts'
      using errcode = 'check_violation', hint = 'kistly:raumplan.schwebt';
  end if;

  -- Der ganze Stapel mit dieser Kiste muss unter die Decke oder unter das
  -- naechste Brett passen. Auch die Kisten darueber zaehlen: wird eine
  -- untere Kiste groesser, wandern sie mit nach oben.
  select coalesce(sum(public.item_hoehe_cm(i.size, i.eigene_hoehe_cm)), 0) into v_rest
    from public.items i
   where i.id <> new.id
     and i.room_id = new.room_id
     and i.plan_x = new.plan_x and i.plan_y = new.plan_y
     and coalesce(i.regal_boden, 0) = coalesce(new.regal_boden, 0);

  if v_brett + v_rest + public.item_hoehe_cm(new.size, new.eigene_hoehe_cm) > v_grenze then
    raise exception 'So hoch geht es hier nicht'
      using errcode = 'check_violation', hint = 'kistly:raumplan.zu_hoch';
  end if;

  return new;
end $fn$;

alter function public.items_plan_pruefen() set search_path = public;

-- ------------------------------------------------------ 4. Nachruecken
create or replace function public.items_stapel_nachruecken()
returns trigger language plpgsql as $fn$
declare
  k record;
begin
  -- Nur die Aenderung, die ein Mensch ausloest. Das Nachruecken selbst
  -- aendert plan_z und kaeme sonst hier wieder an. Wird ein Plan oder ein
  -- Regal geloescht, leeren deren Trigger ohnehin alle Plaetze.
  if pg_trigger_depth() > 1 then
    return null;
  end if;
  if old.plan_x is null then
    return null;
  end if;
  if tg_op = 'UPDATE'
     and new.room_id     is not distinct from old.room_id
     and new.plan_x      is not distinct from old.plan_x
     and new.plan_y      is not distinct from old.plan_y
     and new.plan_z      is not distinct from old.plan_z
     and new.regal_boden is not distinct from old.regal_boden then
    return null;
  end if;

  -- Von unten nach oben, damit jeder Platz frei ist, bevor die naechste
  -- Kiste darauf rutscht.
  for k in
    select i.id, i.plan_z from public.items i
     where i.room_id = old.room_id
       and i.plan_x = old.plan_x and i.plan_y = old.plan_y
       and coalesce(i.regal_boden, 0) = coalesce(old.regal_boden, 0)
       and i.plan_z > old.plan_z
     order by i.plan_z
  loop
    update public.items set plan_z = k.plan_z - 1 where id = k.id;
  end loop;
  return null;
end $fn$;

alter function public.items_stapel_nachruecken() set search_path = public;

drop trigger if exists items_stapel_nachruecken on public.items;
create trigger items_stapel_nachruecken
  after update or delete on public.items
  for each row execute function public.items_stapel_nachruecken();

-- ------------------------------------------- 5. Das Regal selbst pruefen
create or replace function public.regale_pruefen()
returns trigger language plpgsql as $fn$
declare
  p         public.room_plans;
  v_spalten int;
  v_reihen  int;
  v_i       int;
begin
  new.updated_at := now();

  select * into p from public.room_plans where tag_id = new.tag_id;
  if p.project_id is distinct from new.project_id then
    raise exception 'Das Regal gehört zu einem anderen Umzug'
      using errcode = 'check_violation', hint = 'kistly:raumplan.regal_anderes_zimmer';
  end if;

  v_spalten := ceil(p.breite_cm::numeric / p.raster_cm);
  v_reihen  := ceil(p.tiefe_cm::numeric  / p.raster_cm);

  if new.x + new.breite > v_spalten or new.y + new.tiefe > v_reihen then
    raise exception 'Das Regal ragt aus dem Zimmer'
      using errcode = 'check_violation', hint = 'kistly:raumplan.regal_draussen';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p.gesperrt) z
     where (z->>0)::int between new.x and new.x + new.breite - 1
       and (z->>1)::int between new.y and new.y + new.tiefe - 1
  ) then
    raise exception 'Das Regal steht auf einer Zelle, die nicht zum Zimmer gehört'
      using errcode = 'check_violation', hint = 'kistly:raumplan.regal_draussen';
  end if;
  if p.tuer_x is not null
     and p.tuer_x between new.x and new.x + new.breite - 1
     and p.tuer_y between new.y and new.y + new.tiefe - 1 then
    raise exception 'Vor der Tür steht kein Regal'
      using errcode = 'check_violation', hint = 'kistly:raumplan.regal_tuer';
  end if;
  if exists (
    select 1 from public.regale g
     where g.tag_id = new.tag_id and g.id <> new.id
       and g.x < new.x + new.breite and new.x < g.x + g.breite
       and g.y < new.y + new.tiefe  and new.y < g.y + g.tiefe
  ) then
    raise exception 'Dort steht schon ein Regal'
      using errcode = 'check_violation', hint = 'kistly:raumplan.regal_ueberlappt';
  end if;

  if new.hoehe_cm > p.hoehe_cm then
    raise exception 'Das Regal ist höher als das Zimmer'
      using errcode = 'check_violation', hint = 'kistly:raumplan.regal_zu_hoch';
  end if;
  -- Bretter aufsteigend, jedes im Regal.
  for v_i in 1 .. array_length(new.boeden_cm, 1) loop
    if new.boeden_cm[v_i] is null
       or new.boeden_cm[v_i] < 0
       or new.boeden_cm[v_i] >= new.hoehe_cm
       or (v_i > 1 and new.boeden_cm[v_i] <= new.boeden_cm[v_i - 1]) then
      raise exception 'Die Bretter müssen von unten nach oben steigen und im Regal liegen'
        using errcode = 'check_violation', hint = 'kistly:raumplan.regal_boeden';
    end if;
  end loop;

  -- Auf dem Boden unter dem neuen Regal darf keine Kiste stehen.
  if exists (
    select 1 from public.items i
     where i.room_id = new.tag_id and i.plan_x is not null and i.regal_id is null
       and i.plan_x between new.x and new.x + new.breite - 1
       and i.plan_y between new.y and new.y + new.tiefe - 1
  ) then
    raise exception 'Auf diesen Zellen stehen Kisten. Nimm sie zuerst vom Platz.'
      using errcode = 'check_violation', hint = 'kistly:raumplan.regal_auf_kisten';
  end if;

  -- Stehen Kisten auf dem Regal, darf es nur seinen Namen aendern. Sonst
  -- stuenden sie danach neben dem Regal oder zwischen zwei Brettern.
  if tg_op = 'UPDATE'
     and (new.x <> old.x or new.y <> old.y or new.breite <> old.breite
          or new.tiefe <> old.tiefe or new.hoehe_cm <> old.hoehe_cm
          or new.boeden_cm <> old.boeden_cm)
     and exists (select 1 from public.items i where i.regal_id = new.id) then
    raise exception 'Auf dem Regal stehen Kisten. Nimm sie zuerst herunter.'
      using errcode = 'check_violation', hint = 'kistly:raumplan.regal_belegt';
  end if;

  return new;
end $fn$;

alter function public.regale_pruefen() set search_path = public;

drop trigger if exists regale_pruefen on public.regale;
create trigger regale_pruefen
  before insert or update on public.regale
  for each row execute function public.regale_pruefen();

-- Regal weg: die Kisten darauf verlieren ihren Platz, nicht ihr Zimmer.
-- Vor dem Loeschen, sonst traefe "on delete set null" nur regal_id und die
-- Pruefung schluege zu (dieselbe Falle wie 0018 und 0019).
create or replace function public.regale_plaetze_leeren()
returns trigger language plpgsql as $fn$
begin
  update public.items
     set plan_x = null, plan_y = null, plan_z = null, regal_id = null, regal_boden = null
   where regal_id = old.id;
  return old;
end $fn$;

alter function public.regale_plaetze_leeren() set search_path = public;

drop trigger if exists regale_plaetze_leeren on public.regale;
create trigger regale_plaetze_leeren
  before delete on public.regale
  for each row execute function public.regale_plaetze_leeren();

alter table public.regale enable row level security;

drop policy if exists regale_select on public.regale;
create policy regale_select on public.regale for select to authenticated
  using (public.is_member(project_id));

drop policy if exists regale_insert on public.regale;
create policy regale_insert on public.regale for insert to authenticated
  with check (public.is_editor(project_id));

drop policy if exists regale_update on public.regale;
create policy regale_update on public.regale for update to authenticated
  using (public.is_editor(project_id)) with check (public.is_editor(project_id));

drop policy if exists regale_delete on public.regale;
create policy regale_delete on public.regale for delete to authenticated
  using (public.is_editor(project_id));

-- Plan weg: auch die Regalfelder der Kisten leeren (0020 kannte sie noch
-- nicht).
create or replace function public.room_plans_plaetze_leeren()
returns trigger language plpgsql as $fn$
begin
  update public.items
     set plan_x = null, plan_y = null, plan_z = null, regal_id = null, regal_boden = null
   where room_id = old.tag_id
     and plan_x is not null;
  return old;
end $fn$;

alter function public.room_plans_plaetze_leeren() set search_path = public;

-- ---------------------------------------------- 6. Den Plan pruefen
create or replace function public.room_plans_pruefen()
returns trigger language plpgsql as $fn$
declare
  v_spalten int;
  v_reihen  int;
  v_zelle   jsonb;
  v_x       int;
  v_y       int;
  v_nx      int;
  v_ny      int;
begin
  new.updated_at := now();
  -- Wirft von selbst, wenn das Zimmer fehlt, zu einem anderen Umzug
  -- gehoert oder gar kein Zimmer ist, sondern eine Person.
  perform public.assert_tag(new.tag_id, new.project_id, 'room');

  v_spalten := ceil(new.breite_cm::numeric / new.raster_cm);
  v_reihen  := ceil(new.tiefe_cm::numeric  / new.raster_cm);
  if v_spalten * v_reihen > 2500 then
    raise exception 'Das Raster ist zu fein für dieses Zimmer. Nimm größere Zellen.'
      using errcode = 'check_violation', hint = 'kistly:raumplan.raster_zu_fein';
  end if;

  for v_zelle in select * from jsonb_array_elements(new.gesperrt) loop
    if jsonb_typeof(v_zelle) <> 'array' or jsonb_array_length(v_zelle) <> 2 then
      raise exception 'Eine gesperrte Zelle braucht genau zwei Zahlen'
        using errcode = 'check_violation', hint = 'kistly:raumplan.gesperrt_draussen';
    end if;
    v_x := (v_zelle->>0)::int;
    v_y := (v_zelle->>1)::int;
    if v_x < 0 or v_y < 0 or v_x >= v_spalten or v_y >= v_reihen then
      raise exception 'Eine gesperrte Zelle liegt außerhalb des Zimmers'
        using errcode = 'check_violation', hint = 'kistly:raumplan.gesperrt_draussen';
    end if;
  end loop;

  if new.tuer_x is not null then
    if new.tuer_x >= v_spalten or new.tuer_y >= v_reihen then
      raise exception 'Die Tür liegt außerhalb des Zimmers'
        using errcode = 'check_violation', hint = 'kistly:raumplan.tuer_draussen';
    end if;
    if public.zelle_gesperrt(new.gesperrt, new.tuer_x, new.tuer_y) then
      raise exception 'Die Tür liegt auf einer Zelle, die nicht zum Zimmer gehört'
        using errcode = 'check_violation', hint = 'kistly:raumplan.tuer_draussen';
    end if;
    -- An der Wand heisst: hinter der Tuerseite ist kein Zimmer mehr, weil
    -- das Raster dort endet oder die Zelle gesperrt ist. So geht auch die
    -- Innenecke eines Zimmers in L-Form.
    v_nx := new.tuer_x + case new.tuer_seite when 'west' then -1 when 'ost' then 1 else 0 end;
    v_ny := new.tuer_y + case new.tuer_seite when 'nord' then -1 when 'sued' then 1 else 0 end;
    if v_nx >= 0 and v_ny >= 0 and v_nx < v_spalten and v_ny < v_reihen
       and not public.zelle_gesperrt(new.gesperrt, v_nx, v_ny) then
      raise exception 'Die Tür muss an einer Wand liegen'
        using errcode = 'check_violation', hint = 'kistly:raumplan.tuer_wand';
    end if;
    -- Vor einer Tuer steht kein Regal, auch nicht, wenn die Tuer spaeter
    -- dorthin wandert.
    if exists (
      select 1 from public.regale g
       where g.tag_id = new.tag_id
         and new.tuer_x between g.x and g.x + g.breite - 1
         and new.tuer_y between g.y and g.y + g.tiefe - 1
    ) then
      raise exception 'Vor der Tür steht kein Regal'
        using errcode = 'check_violation', hint = 'kistly:raumplan.regal_tuer';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    -- Die Zellgroesse ist der Massstab aller Plaetze. Aendert sie sich,
    -- stuende jede Kiste und jedes Regal woanders. Also nur, solange
    -- nichts im Plan steht.
    if new.raster_cm <> old.raster_cm and (
         exists (select 1 from public.items i where i.room_id = new.tag_id and i.plan_x is not null)
         or exists (select 1 from public.regale g where g.tag_id = new.tag_id)) then
      raise exception 'Die Zellgröße lässt sich nur ändern, solange nichts im Plan steht'
        using errcode = 'check_violation', hint = 'kistly:raumplan.raster_fest';
    end if;

    if exists (
      select 1 from public.items i
       where i.room_id = new.tag_id and i.plan_x is not null
         and (i.plan_x >= v_spalten or i.plan_y >= v_reihen
              or public.zelle_gesperrt(new.gesperrt, i.plan_x, i.plan_y))
    ) then
      raise exception 'Kisten stünden danach außerhalb des Zimmers'
        using errcode = 'check_violation', hint = 'kistly:raumplan.kisten_draussen';
    end if;

    if exists (
      select 1 from public.regale g
       where g.tag_id = new.tag_id
         and (g.x + g.breite > v_spalten or g.y + g.tiefe > v_reihen
              or exists (
                select 1 from jsonb_array_elements(new.gesperrt) z
                 where (z->>0)::int between g.x and g.x + g.breite - 1
                   and (z->>1)::int between g.y and g.y + g.tiefe - 1))
    ) then
      raise exception 'Ein Regal stünde danach außerhalb des Zimmers'
        using errcode = 'check_violation', hint = 'kistly:raumplan.regal_draussen';
    end if;

    if new.hoehe_cm < old.hoehe_cm and (
         exists (select 1 from public.regale g where g.tag_id = new.tag_id and g.hoehe_cm > new.hoehe_cm)
         or exists (
           -- Stapel auf dem Boden und auf dem obersten Brett reichen bis
           -- zur Decke. Die anderen Bretter haengen nicht an der Decke.
           select 1
             from public.items i
             left join public.regale g on g.id = i.regal_id
            where i.room_id = new.tag_id and i.plan_x is not null
              and (i.regal_id is null or i.regal_boden = array_length(g.boeden_cm, 1))
            group by i.plan_x, i.plan_y, coalesce(i.regal_boden, 0), g.boeden_cm
           having coalesce(max(g.boeden_cm[i.regal_boden]), 0)
                  + sum(public.item_hoehe_cm(i.size, i.eigene_hoehe_cm)) > new.hoehe_cm
         )) then
      raise exception 'So niedrig passt nicht mehr alles hinein'
        using errcode = 'check_violation', hint = 'kistly:raumplan.zu_niedrig';
    end if;
  end if;

  return new;
end $fn$;

alter function public.room_plans_pruefen() set search_path = public;

-- ------------------------------------------- 7. Moebel vom Platz nehmen
-- Moebel stehen nicht im Raumplan. Was schon steht, geht vom Platz. Erst
-- hier am Ende, damit das Nachruecken schon greift und keine Kiste ueber
-- einem Moebelstueck in der Luft bleibt.
update public.items
   set plan_x = null, plan_y = null, plan_z = null
 where kind = 'furniture' and plan_x is not null;
