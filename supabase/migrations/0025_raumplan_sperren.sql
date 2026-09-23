-- =====================================================================
-- Kistly 0025_raumplan_sperren
--
-- Nachbesserung zu 0022, gefunden bei der Gegenpruefung vom 23.09.2026.
--
-- 1. Das Nachruecken (items_stapel_nachruecken) las den Stapel, ohne die
--    Zelle zu sperren. Setzte jemand gleichzeitig eine Kiste oben auf
--    denselben Stapel, konnte eine Luecke bleiben; danach wies die
--    Datenbank jede neue Kiste auf dieser Zelle als "schwebt" ab.
--
-- 2. Ein Regal aufstellen, den Umriss oder die Masse aendern und einen Plan
--    loeschen prueften gegen die Kisten im Zimmer, ohne dass gleichzeitiges
--    Setzen warten musste. Beides zusammen konnte eine Kiste unter ein neues
--    Regal oder auf eine gerade gesperrte Zelle bringen.
--
-- Loesung: zwei Stufen von Sperren, jeweils fuer die Dauer des Vorgangs.
--  - Wer eine Kiste setzt, wegnimmt, umzieht oder ihre Groesse aendert,
--    haelt das Zimmer geteilt und die betroffenen Zellen allein. Zwei
--    Leute auf verschiedenen Zellen stoeren sich nicht, auf derselben
--    Zelle wartet der zweite.
--  - Wer den Plan oder ein Regal aendert oder loescht, haelt das Zimmer
--    allein. Solange wartet jedes Setzen in diesem Zimmer, und umgekehrt.
--
-- Die Sperren sitzen in eigenen Triggern, die als erste laufen (ihr Name
-- beginnt mit "a_", Trigger derselben Zeit laufen alphabetisch). Die
-- Pruefungen aus 0022 bleiben, wie sie sind.
-- =====================================================================

create or replace function public.raum_sperre(p_room uuid, p_allein boolean)
returns void language plpgsql as $fn$
begin
  if p_room is null then
    return;
  end if;
  if p_allein then
    perform pg_advisory_xact_lock(hashtextextended('raum:' || p_room::text, 0));
  else
    perform pg_advisory_xact_lock_shared(hashtextextended('raum:' || p_room::text, 0));
  end if;
end $fn$;

alter function public.raum_sperre(uuid, boolean) set search_path = public;

-- Derselbe Schluessel wie in items_plan_pruefen (0022), damit beide auf
-- dieselbe Sperre warten.
create or replace function public.zelle_sperre(p_room uuid, p_x int, p_y int)
returns void language plpgsql as $fn$
begin
  if p_room is null or p_x is null or p_y is null then
    return;
  end if;
  perform pg_advisory_xact_lock(
    hashtextextended(p_room::text || ':' || p_x || ':' || p_y, 0));
end $fn$;

alter function public.zelle_sperre(uuid, int, int) set search_path = public;

-- ------------------------------------------------- 1. Kisten: Zellen
create or replace function public.items_a_sperre()
returns trigger language plpgsql as $fn$
declare
  v_alt_raum uuid;
  v_alt_x    int;
  v_alt_y    int;
  v_neu_raum uuid;
  v_neu_x    int;
  v_neu_y    int;
begin
  if tg_op in ('UPDATE', 'DELETE') and old.plan_x is not null then
    v_alt_raum := old.room_id; v_alt_x := old.plan_x; v_alt_y := old.plan_y;
  end if;
  if tg_op in ('INSERT', 'UPDATE') and new.plan_x is not null then
    v_neu_raum := new.room_id; v_neu_x := new.plan_x; v_neu_y := new.plan_y;
  end if;

  -- Nichts am Platz geaendert: keine Sperre noetig.
  if tg_op = 'UPDATE'
     and new.room_id         is not distinct from old.room_id
     and new.plan_x          is not distinct from old.plan_x
     and new.plan_y          is not distinct from old.plan_y
     and new.plan_z          is not distinct from old.plan_z
     and new.regal_id        is not distinct from old.regal_id
     and new.regal_boden     is not distinct from old.regal_boden
     and new.size            is not distinct from old.size
     and new.eigene_hoehe_cm is not distinct from old.eigene_hoehe_cm
     and new.kind            is not distinct from old.kind then
    return new;
  end if;

  if v_alt_raum is null and v_neu_raum is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  -- Erst die Zimmer geteilt, dann die Zellen, immer in derselben
  -- Reihenfolge, damit sich zwei Vorgaenge nicht gegenseitig festhalten.
  if v_alt_raum is not null and v_neu_raum is not null and v_alt_raum::text > v_neu_raum::text then
    perform public.raum_sperre(v_neu_raum, false);
    perform public.raum_sperre(v_alt_raum, false);
  else
    perform public.raum_sperre(v_alt_raum, false);
    perform public.raum_sperre(v_neu_raum, false);
  end if;

  if v_alt_raum is not null and v_neu_raum is not null
     and (v_alt_raum::text || ':' || v_alt_x || ':' || v_alt_y)
         > (v_neu_raum::text || ':' || v_neu_x || ':' || v_neu_y) then
    perform public.zelle_sperre(v_neu_raum, v_neu_x, v_neu_y);
    perform public.zelle_sperre(v_alt_raum, v_alt_x, v_alt_y);
  else
    perform public.zelle_sperre(v_alt_raum, v_alt_x, v_alt_y);
    perform public.zelle_sperre(v_neu_raum, v_neu_x, v_neu_y);
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end $fn$;

alter function public.items_a_sperre() set search_path = public;

drop trigger if exists items_a_sperre on public.items;
create trigger items_a_sperre
  before insert or update or delete on public.items
  for each row execute function public.items_a_sperre();

-- ------------------------------------------ 2. Plan und Regale: Zimmer
create or replace function public.room_plans_a_sperre()
returns trigger language plpgsql as $fn$
begin
  if tg_op = 'DELETE' then
    perform public.raum_sperre(old.tag_id, true);
    return old;
  end if;
  perform public.raum_sperre(new.tag_id, true);
  return new;
end $fn$;

alter function public.room_plans_a_sperre() set search_path = public;

drop trigger if exists room_plans_a_sperre on public.room_plans;
create trigger room_plans_a_sperre
  before insert or update or delete on public.room_plans
  for each row execute function public.room_plans_a_sperre();

create or replace function public.regale_a_sperre()
returns trigger language plpgsql as $fn$
begin
  if tg_op = 'DELETE' then
    perform public.raum_sperre(old.tag_id, true);
    return old;
  end if;
  perform public.raum_sperre(new.tag_id, true);
  return new;
end $fn$;

alter function public.regale_a_sperre() set search_path = public;

drop trigger if exists regale_a_sperre on public.regale;
create trigger regale_a_sperre
  before insert or update or delete on public.regale
  for each row execute function public.regale_a_sperre();
