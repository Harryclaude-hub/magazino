-- =====================================================================
-- Kistly 0032_raster_entfernen
--
-- Das alte 50-cm-Raster verschwindet (START 5.3, Etappe 4). Die alten
-- Werte jeder Kiste stehen seit 0029 in grundriss_umrechnung.alt; diese
-- Tabelle bleibt. raum_sperre bleibt (das neue Modell sperrt damit),
-- ebenso kisten_groessen und item_hoehe_cm (liest niemand mehr, schadet
-- nicht; eine spaetere Migration darf sie entfernen).
-- =====================================================================

drop trigger if exists items_plan on public.items;
drop trigger if exists items_plan_eingefroren on public.items;
drop trigger if exists items_a_sperre on public.items;
drop trigger if exists items_stapel_nachruecken on public.items;

drop index if exists public.items_plan_platz2;
alter table public.items drop constraint if exists items_regal_check;
alter table public.items drop constraint if exists items_plan_check;
alter table public.items drop column if exists regal_id;
alter table public.items drop column if exists regal_boden;
alter table public.items drop column if exists plan_x;
alter table public.items drop column if exists plan_y;
alter table public.items drop column if exists plan_z;

drop table if exists public.regale;       -- samt Triggern und Policies
drop table if exists public.room_plans;   -- samt Triggern und Policies

drop function if exists public.items_plan_pruefen();
drop function if exists public.items_plan_eingefroren();
drop function if exists public.items_a_sperre();
drop function if exists public.items_stapel_nachruecken();
drop function if exists public.raumplan_eingefroren();
drop function if exists public.regale_pruefen();
drop function if exists public.regale_plaetze_leeren();
drop function if exists public.regale_a_sperre();
drop function if exists public.room_plans_pruefen();
drop function if exists public.room_plans_plaetze_leeren();
drop function if exists public.room_plans_a_sperre();
drop function if exists public.zelle_sperre(uuid, int, int);
drop function if exists public.zelle_gesperrt(jsonb, int, int);
