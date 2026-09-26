-- 0040: Link, Preis und Material an jedem Moebel im Grundriss (E67).
--
--   link       wo man es kauft (http oder https, hoechstens 2000 Zeichen)
--   preis_cent Preis in Cent (0 bis 10 Mio. Euro), leer = unbekannt
--   material   wie es in 3D aussieht: stoff, leder, samt, holz, metall,
--              glas, keramik oder leer (Standard je Moebelart)
--
-- grundriss_speichern nimmt die drei Felder an (fehlen sie, bleiben sie
-- leer); grundriss_laden liefert sie ueber to_jsonb(o) mit. Wie in 0039
-- ersetzt umbau() genau die genannten Stellen der jetzigen Fassung.

alter table public.objekte
  add column link text
    constraint objekte_link_check check (link is null or (length(link) <= 2000 and link ~ '^https?://')),
  add column preis_cent int
    constraint objekte_preis_check check (preis_cent is null or preis_cent between 0 and 1000000000),
  add column material text
    constraint objekte_material_check check (material is null or material in ('stoff', 'leder', 'samt', 'holz', 'metall', 'glas', 'keramik'));

create function pg_temp.umbau(p_fn regprocedure, p_alt text[], p_neu text[]) returns void
language plpgsql as $f$
declare
  d text := pg_get_functiondef(p_fn);
  i int;
  n int;
begin
  for i in 1 .. array_length(p_alt, 1) loop
    n := (length(d) - length(replace(d, p_alt[i], ''))) / length(p_alt[i]);
    if n <> 1 then
      raise exception '0040: in % kommt die Stelle %-mal vor statt einmal: %', p_fn, n, p_alt[i];
    end if;
    d := replace(d, p_alt[i], p_neu[i]);
  end loop;
  execute d;
end $f$;

select pg_temp.umbau('public.grundriss_speichern(uuid,integer,jsonb)',
  array[
    'farbe, item_id, boden_cm)',
    'coalesce((e->>''boden_cm'')::int, 0))',
    'boden_cm = excluded.boden_cm;'
  ],
  array[
    'farbe, item_id, boden_cm, link, preis_cent, material)',
    'coalesce((e->>''boden_cm'')::int, 0), nullif(e->>''link'', ''''), (e->>''preis_cent'')::int, nullif(e->>''material'', ''''))',
    'boden_cm = excluded.boden_cm, link = excluded.link, preis_cent = excluded.preis_cent, material = excluded.material;'
  ]);

drop function pg_temp.umbau(regprocedure, text[], text[]);
