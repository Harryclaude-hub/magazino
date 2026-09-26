-- 0034: Gestrichelte Hilfslinien im Grundriss (E45).
--
-- Reine Anzeige: eine Linie markiert etwas, das keine Wand ist (Treppe,
-- Stufe, Bereich, Teppich). Sie haengt am Grundriss, nicht an einem Raum,
-- und nichts prueft Kisten oder Moebel gegen sie.
--
-- Gespeichert als jsonb-Feld am Grundriss: [{ "id": "...", "a": [x, y],
-- "b": [x, y] }, ...] in cm. grundriss_laden liefert es ueber to_jsonb(g)
-- ohne Aenderung mit. Geschrieben wird es mit einem normalen update (Rechte
-- wie beim Umbenennen: nur Bearbeiter). Die Version des Grundrisses zaehlt
-- dabei nicht hoch (grundrisse_vorher), der Zeichner speichert Raeume und
-- Linien also unabhaengig voneinander.

create function public.hilfslinien_gueltig(p jsonb) returns boolean
language sql immutable set search_path = public as $fn$
  select jsonb_typeof(p) = 'array'
     and jsonb_array_length(p) <= 500
     and not exists (
       select 1
         from jsonb_array_elements(p) e
        where not coalesce(
                jsonb_typeof(e) = 'object'
            and jsonb_typeof(e -> 'id') = 'string'
            and length(e ->> 'id') between 1 and 64
            and jsonb_typeof(e -> 'a') = 'array'
            and jsonb_typeof(e -> 'b') = 'array'
            and jsonb_array_length(e -> 'a') = 2
            and jsonb_array_length(e -> 'b') = 2
            and jsonb_typeof(e -> 'a' -> 0) = 'number'
            and jsonb_typeof(e -> 'a' -> 1) = 'number'
            and jsonb_typeof(e -> 'b' -> 0) = 'number'
            and jsonb_typeof(e -> 'b' -> 1) = 'number'
            and (e -> 'a' ->> 0)::numeric between -50000 and 100000
            and (e -> 'a' ->> 1)::numeric between -50000 and 100000
            and (e -> 'b' ->> 0)::numeric between -50000 and 100000
            and (e -> 'b' ->> 1)::numeric between -50000 and 100000,
              false)
     )
$fn$;

alter table public.grundrisse
  add column linien jsonb not null default '[]'::jsonb
  constraint grundrisse_linien_check check (public.hilfslinien_gueltig(linien));

revoke execute on function public.hilfslinien_gueltig(jsonb) from public, anon;
grant  execute on function public.hilfslinien_gueltig(jsonb) to authenticated;
