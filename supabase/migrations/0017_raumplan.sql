-- =====================================================================
-- Kistly 0017_raumplan
--
-- Jedes Zimmer bekommt einen Plan: wie gross es ist, wo die Tuer ist,
-- welche Ecken nicht dazugehoeren, und wo genau jede Kiste steht.
--
-- Der Platz einer Kiste steht in der Kiste selbst (plan_x, plan_y,
-- plan_z) und nicht in einer zweiten Tabelle. Eine Kiste ist in genau
-- einem Zimmer, also hat sie genau einen Platz. Eine eigene Tabelle
-- waere eine zweite Fassung derselben Angabe, und zwei Fassungen laufen
-- irgendwann auseinander.
--
-- Die Zellen sind ganze Zahlen ab 0. x geht nach rechts, y nach hinten,
-- z nach oben. Eine Zelle ist raster_cm breit und tief. Eine Kiste
-- belegt genau eine Zelle, wie ein Bauklotz.
--
-- Was hier geprueft wird, darf die Oberflaeche nicht allein pruefen:
-- was die Datenbank nicht verbietet, passiert irgendwann.
-- =====================================================================

-- ------------------------------------------------------- 1. Der Plan
create table if not exists public.room_plans (
  -- Ein Plan je Zimmer. Der Schluessel ist das Zimmer selbst, damit es
  -- keine zwei Plaene zu einem Zimmer geben kann.
  tag_id     uuid primary key references public.tags(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  breite_cm  int  not null default 400 check (breite_cm between 50 and 2000),
  tiefe_cm   int  not null default 400 check (tiefe_cm  between 50 and 2000),
  hoehe_cm   int  not null default 250 check (hoehe_cm  between 50 and 600),
  raster_cm  int  not null default 50  check (raster_cm between 25 and 200),
  -- Zellen, die nicht zum Zimmer gehoeren. So entsteht ein Umriss, der
  -- kein Rechteck ist: man nimmt Ecken weg. Liste von [x,y].
  gesperrt   jsonb not null default '[]'::jsonb
             check (jsonb_typeof(gesperrt) = 'array' and jsonb_array_length(gesperrt) <= 2500),
  -- Die Tuer sitzt an einer Zelle und an einer ihrer vier Seiten.
  tuer_x     int check (tuer_x >= 0),
  tuer_y     int check (tuer_y >= 0),
  tuer_seite text check (tuer_seite in ('nord','ost','sued','west')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint room_plans_tuer_check check (num_nonnulls(tuer_x, tuer_y, tuer_seite) in (0, 3))
);

create index if not exists room_plans_project_idx on public.room_plans(project_id);

-- Prueft den Plan selbst: gehoert das Zimmer zum Umzug, ist das Raster
-- noch darstellbar, liegt die Tuer im Zimmer, sind die gesperrten Zellen
-- brauchbare Paare.
create or replace function public.room_plans_pruefen()
returns trigger language plpgsql as $fn$
declare
  v_spalten int;
  v_reihen  int;
  v_zelle   jsonb;
  v_x       int;
  v_y       int;
begin
  new.updated_at := now();
  -- Wirft von selbst, wenn das Zimmer fehlt, zu einem anderen Umzug
  -- gehoert oder gar kein Zimmer ist, sondern eine Person.
  perform public.assert_tag(new.tag_id, new.project_id, 'room');

  v_spalten := ceil(new.breite_cm::numeric / new.raster_cm);
  v_reihen  := ceil(new.tiefe_cm::numeric  / new.raster_cm);
  if v_spalten * v_reihen > 2500 then
    raise exception 'Das Raster ist zu fein für dieses Zimmer. Nimm größere Zellen.'
      using errcode = 'check_violation';
  end if;

  if new.tuer_x is not null and (new.tuer_x >= v_spalten or new.tuer_y >= v_reihen) then
    raise exception 'Die Tür liegt außerhalb des Zimmers' using errcode = 'check_violation';
  end if;

  for v_zelle in select * from jsonb_array_elements(new.gesperrt) loop
    if jsonb_typeof(v_zelle) <> 'array' or jsonb_array_length(v_zelle) <> 2 then
      raise exception 'Eine gesperrte Zelle braucht genau zwei Zahlen'
        using errcode = 'check_violation';
    end if;
    v_x := (v_zelle->>0)::int;
    v_y := (v_zelle->>1)::int;
    if v_x < 0 or v_y < 0 or v_x >= v_spalten or v_y >= v_reihen then
      raise exception 'Eine gesperrte Zelle liegt außerhalb des Zimmers'
        using errcode = 'check_violation';
    end if;
  end loop;

  return new;
end $fn$;

alter function public.room_plans_pruefen() set search_path = public;

drop trigger if exists room_plans_pruefen on public.room_plans;
create trigger room_plans_pruefen
  before insert or update on public.room_plans
  for each row execute function public.room_plans_pruefen();

alter table public.room_plans enable row level security;

drop policy if exists room_plans_select on public.room_plans;
create policy room_plans_select on public.room_plans for select to authenticated
  using (public.is_member(project_id));

drop policy if exists room_plans_insert on public.room_plans;
create policy room_plans_insert on public.room_plans for insert to authenticated
  with check (public.is_editor(project_id));

drop policy if exists room_plans_update on public.room_plans;
create policy room_plans_update on public.room_plans for update to authenticated
  using (public.is_editor(project_id)) with check (public.is_editor(project_id));

drop policy if exists room_plans_delete on public.room_plans;
create policy room_plans_delete on public.room_plans for delete to authenticated
  using (public.is_editor(project_id));

-- --------------------------------------------- 2. Der Platz der Kiste
alter table public.items add column if not exists plan_x int;
alter table public.items add column if not exists plan_y int;
alter table public.items add column if not exists plan_z int;

do $$ begin
  alter table public.items add constraint items_plan_check
    check (
      num_nonnulls(plan_x, plan_y, plan_z) in (0, 3)
      and (plan_x is null or (plan_x >= 0 and plan_y >= 0 and plan_z between 0 and 30))
    );
exception when duplicate_object then null; end $$;

-- Auf einem Platz steht eine Kiste, nicht zwei. Die Datenbank haelt das
-- fest, nicht die Oberflaeche: zwei Leute koennen gleichzeitig legen.
create unique index if not exists items_plan_platz
  on public.items(room_id, plan_x, plan_y, plan_z)
  where plan_x is not null;

create or replace function public.items_plan_pruefen()
returns trigger language plpgsql as $fn$
declare
  p         public.room_plans;
  v_spalten int;
  v_reihen  int;
  v_ebenen  int;
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
    end if;
  end if;

  if new.plan_x is null then
    return new;
  end if;

  select * into p from public.room_plans where tag_id = new.room_id;
  if p.tag_id is null then
    raise exception 'Für dieses Zimmer gibt es noch keinen Plan'
      using errcode = 'no_data_found';
  end if;

  v_spalten := ceil(p.breite_cm::numeric / p.raster_cm);
  v_reihen  := ceil(p.tiefe_cm::numeric  / p.raster_cm);
  -- Eine Lage rechnet mit 40 cm. Genauer geht nicht, solange die Kisten
  -- keine echte Hoehe haben, und zu hoch gestapelt faellt es ohnehin um.
  v_ebenen  := greatest(1, floor(p.hoehe_cm::numeric / 40));

  if new.plan_x >= v_spalten or new.plan_y >= v_reihen then
    raise exception 'Der Platz liegt außerhalb des Zimmers'
      using errcode = 'check_violation';
  end if;
  if new.plan_z >= v_ebenen then
    raise exception 'So hoch ist das Zimmer nicht' using errcode = 'check_violation';
  end if;
  if p.gesperrt @> jsonb_build_array(jsonb_build_array(new.plan_x, new.plan_y)) then
    raise exception 'Dieser Platz gehört nicht zum Zimmer'
      using errcode = 'check_violation';
  end if;

  return new;
end $fn$;

alter function public.items_plan_pruefen() set search_path = public;

-- Laeuft nach items_bi und items_bu: Trigger derselben Zeit laufen in
-- alphabetischer Reihenfolge ihres Namens, und items_plan steht hinter
-- items_bi, items_bu und items_deckbild. So ist das Zimmer schon
-- geprueft, bevor hier der Platz darin geprueft wird.
drop trigger if exists items_plan on public.items;
create trigger items_plan
  before insert or update on public.items
  for each row execute function public.items_plan_pruefen();
