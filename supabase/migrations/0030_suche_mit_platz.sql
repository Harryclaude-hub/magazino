-- =====================================================================
-- Kistly 0030_suche_mit_platz
--
-- inhalt_suchen liefert jetzt Grundriss, Raum, Unterlage, Objekt, Fach und
-- Hoehe von und bis, auch fuer Dinge in Moebeln (Platz des verknuepften
-- Objekts, Hoehe 0 bis Objekthoehe). Treffer, Punkte und Sortierung wie
-- 0026. room_* bleibt das Zimmer der Kiste (Kuerzel), raum_* ist, wo sie
-- wirklich steht.
-- =====================================================================

drop function public.inhalt_suchen(text, int);

create function public.inhalt_suchen(p_q text, p_max int default 60)
returns table (
  content_id uuid, inhalt text, menge int, schicht smallint, photo_id uuid, foto_pfad text,
  box_x0 numeric, box_y0 numeric, box_x1 numeric, box_y1 numeric, punkt_x numeric, punkt_y numeric,
  ausschnitt_pfad text, bestaetigt boolean,
  item_id uuid, item_code text, item_kind text, item_title text, item_status text,
  project_id uuid, project_name text,
  room_id uuid, room_name text, room_color text,
  grundriss_id uuid, grundriss_name text,
  raum_id uuid, raum_name text,
  unterlage_art text,          -- boden | kiste | objekt | fach | moebel (Ding in einem Moebel)
  unterlage_code text,         -- bei kiste: Nummer der Kiste darunter
  objekt_id uuid, objekt_name text, objekt_art text,
  objekt_spalten smallint,     -- Spalten des Regals, damit "Fach 2/1" eindeutig ist
  fach_ebene smallint, fach_spalte smallint,
  platz_x int, platz_y int,
  stapel_nr int,               -- 1 = unten
  hoehe_von int, hoehe_bis int,
  treffer real)
language sql stable security invoker set search_path = public, extensions as $fn$
  with q as (select public.such_normal(p_q) as n)
  select
    c.id, c.text, c.qty, c.schicht, c.photo_id, f.path,
    c.box_x0, c.box_y0, c.box_x1, c.box_y1, c.punkt_x, c.punkt_y,
    c.ausschnitt_pfad, c.bestaetigt,
    i.id, i.code, i.kind::text, i.title, i.status::text,
    p.id, p.name,
    t.id, t.name, t.color,
    gr.id, gr.name,
    r.id, coalesce(nullif(r.name, ''), rt.name),
    case when mo.id is not null then 'moebel' else i.unterlage_art end,
    ui.code,
    coalesce(uo.id, mo.id), coalesce(uo.name, mo.name), coalesce(uo.art, mo.art),
    coalesce(uo.spalten, mo.spalten),
    i.fach_ebene, i.fach_spalte,
    i.platz_x, i.platz_y,
    case when i.platz_raum_id is not null then b.tiefe + 1 end,
    case when mo.id is not null then 0 else b.unten_cm end,
    case when mo.id is not null then mo.hoehe_cm else b.unten_cm + m.hoehe_cm end,
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
  left join public.objekte mo on mo.item_id = i.id and i.kind = 'furniture'
  left join public.raeume r on r.id = coalesce(i.platz_raum_id, mo.raum_id)
  left join public.tags rt on rt.id = r.tag_id
  left join public.grundrisse gr on gr.id = r.grundriss_id
  left join public.objekte uo on uo.id = i.unterlage_objekt_id
  left join public.items ui on ui.id = i.unterlage_item_id
  left join lateral public.kiste_basis(i.id) b on true
  left join lateral public.kiste_masse(i.size, i.eigene_hoehe_cm, i.eigene_groesse_id) m on true
  where length(q.n) >= 2
  order by 42 desc, length(c.text), c.text
  limit least(greatest(coalesce(p_max, 60), 1), 200)
$fn$;

revoke execute on function public.inhalt_suchen(text, int) from public, anon;
grant  execute on function public.inhalt_suchen(text, int) to authenticated;
