-- 0037: Steckdosen, Lichter und Schalter im Grundriss (E52).
--
-- Reine Anzeige wie die Hilfslinien (0034): ein Symbol an einer Stelle des
-- Grundrisses. Gespeichert als jsonb-Feld am Grundriss:
-- [{ "id": "...", "art": "steckdose" | "licht" | "schalter", "x": .., "y": .. }]
-- in cm. grundriss_laden liefert es ueber to_jsonb(g) mit. Geschrieben mit
-- einem normalen update (nur Bearbeiter); die Version bleibt stehen.

create function public.symbole_gueltig(p jsonb) returns boolean
language sql immutable set search_path = public as $fn$
  select jsonb_typeof(p) = 'array'
     and jsonb_array_length(p) <= 1000
     and not exists (
       select 1
         from jsonb_array_elements(p) e
        where not coalesce(
                jsonb_typeof(e) = 'object'
            and jsonb_typeof(e -> 'id') = 'string'
            and length(e ->> 'id') between 1 and 64
            and (e ->> 'art') in ('steckdose', 'licht', 'schalter')
            and jsonb_typeof(e -> 'x') = 'number'
            and jsonb_typeof(e -> 'y') = 'number'
            and (e ->> 'x')::numeric between -50000 and 100000
            and (e ->> 'y')::numeric between -50000 and 100000,
              false)
     )
$fn$;

alter table public.grundrisse
  add column symbole jsonb not null default '[]'::jsonb
  constraint grundrisse_symbole_check check (public.symbole_gueltig(symbole));

revoke execute on function public.symbole_gueltig(jsonb) from public, anon;
grant  execute on function public.symbole_gueltig(jsonb) to authenticated;
