-- 0039: Moebel, Regale und Schraenke koennen haengen (E62).
--
-- Neue Spalte objekte.boden_cm: wie hoch die Unterkante ueber dem Boden
-- liegt (Haengeschrank, Wandregal). 0 = steht auf dem Boden, wie bisher.
-- Alle Hoehenangaben, die bisher bei 0 anfingen, rechnen sie jetzt mit:
--   objekt_fehler      Unterkante + Hoehe <= Raumhoehe
--   kiste_basis        Kiste auf oder in einem Objekt beginnt hoeher
--   platz_fehler       dasselbe beim Abstellen
--   kiste_lage         Hoehe eines Moebels mit Eintrag (Suche, Anzeige)
--   inhalt_suchen      dasselbe in der Inhaltssuche
--   objekte_vorher     Aenderung von boden_cm loest die Pruefung aus
--   objekte_nachher    dasselbe fuer die Kisten darauf und darin
--   grundriss_speichern nimmt boden_cm an (fehlt es, gilt 0)
-- grundriss_laden liefert es ueber to_jsonb(o) mit.
--
-- Die Funktionen werden nicht neu abgeschrieben: umbau() liest die jetzige
-- Fassung, ersetzt genau die genannten Stellen (jede muss genau einmal
-- vorkommen, sonst bricht alles ab) und legt sie neu an.

alter table public.objekte
  add column boden_cm int not null default 0
  constraint objekte_boden_cm_check check (boden_cm between 0 and 1000);

comment on column public.objekte.boden_cm is
  'Unterkante ueber dem Boden in cm (0 = steht auf dem Boden). 0039.';

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
      raise exception '0039: in % kommt die Stelle %-mal vor statt einmal: %', p_fn, n, p_alt[i];
    end if;
    d := replace(d, p_alt[i], p_neu[i]);
  end loop;
  execute d;
end $f$;

select pg_temp.umbau('public.grundriss_speichern(uuid,integer,jsonb)',
  array[
    'farbe, item_id)',
    'nullif(e->>''item_id'', '''')::uuid)',
    'item_id = excluded.item_id;'
  ],
  array[
    'farbe, item_id, boden_cm)',
    'nullif(e->>''item_id'', '''')::uuid, coalesce((e->>''boden_cm'')::int, 0))',
    'item_id = excluded.item_id, boden_cm = excluded.boden_cm;'
  ]);

select pg_temp.umbau('public.objekt_fehler(public.objekte,public.raeume)',
  array['if o.hoehe_cm > r.hoehe_cm then'],
  array['if o.boden_cm + o.hoehe_cm > r.hoehe_cm then']);

select pg_temp.umbau('public.kiste_basis(uuid)',
  array[
    'unten_cm := unten_cm + o.hoehe_cm;',
    'unten_cm := unten_cm + o.brett_cm[r.fach_ebene];',
    'grenze_cm := public.fach_decke(o, r.fach_ebene);'
  ],
  array[
    'unten_cm := unten_cm + o.boden_cm + o.hoehe_cm;',
    'unten_cm := unten_cm + o.boden_cm + o.brett_cm[r.fach_ebene];',
    'grenze_cm := o.boden_cm + public.fach_decke(o, r.fach_ebene);'
  ]);

select pg_temp.umbau('public.platz_fehler(public.items,boolean)',
  array[
    'v_unten := o.hoehe_cm;',
    'v_unten := o.brett_cm[k.fach_ebene];',
    'v_grenze := public.fach_decke(o, k.fach_ebene);'
  ],
  array[
    'v_unten := o.boden_cm + o.hoehe_cm;',
    'v_unten := o.boden_cm + o.brett_cm[k.fach_ebene];',
    'v_grenze := o.boden_cm + public.fach_decke(o, k.fach_ebene);'
  ]);

select pg_temp.umbau('public.kiste_lage(uuid)',
  array['''unten_cm'', 0, ''oben_cm'', o.hoehe_cm,'],
  array['''unten_cm'', o.boden_cm, ''oben_cm'', o.boden_cm + o.hoehe_cm,']);

select pg_temp.umbau('public.inhalt_suchen(text,integer)',
  array[
    'case when mo.id is not null then 0 else b.unten_cm end',
    'case when mo.id is not null then mo.hoehe_cm else b.unten_cm + m.hoehe_cm end'
  ],
  array[
    'case when mo.id is not null then mo.boden_cm else b.unten_cm end',
    'case when mo.id is not null then mo.boden_cm + mo.hoehe_cm else b.unten_cm + m.hoehe_cm end'
  ]);

select pg_temp.umbau('public.objekte_vorher()',
  array[
    '(new.raum_id, new.x, new.y, new.breite_cm, new.tiefe_cm, new.hoehe_cm, new.drehung,',
    '(old.raum_id, old.x, old.y, old.breite_cm, old.tiefe_cm, old.hoehe_cm, old.drehung,'
  ],
  array[
    '(new.raum_id, new.x, new.y, new.breite_cm, new.tiefe_cm, new.hoehe_cm, new.boden_cm, new.drehung,',
    '(old.raum_id, old.x, old.y, old.breite_cm, old.tiefe_cm, old.hoehe_cm, old.boden_cm, old.drehung,'
  ]);

select pg_temp.umbau('public.objekte_nachher()',
  array[
    '(new.x, new.y, new.drehung, new.raum_id, new.breite_cm, new.tiefe_cm, new.hoehe_cm, new.art,',
    '(old.x, old.y, old.drehung, old.raum_id, old.breite_cm, old.tiefe_cm, old.hoehe_cm, old.art,'
  ],
  array[
    '(new.x, new.y, new.drehung, new.raum_id, new.breite_cm, new.tiefe_cm, new.hoehe_cm, new.boden_cm, new.art,',
    '(old.x, old.y, old.drehung, old.raum_id, old.breite_cm, old.tiefe_cm, old.hoehe_cm, old.boden_cm, old.art,'
  ]);

drop function pg_temp.umbau(regprocedure, text[], text[]);
