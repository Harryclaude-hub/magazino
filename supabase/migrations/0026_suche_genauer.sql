-- =====================================================================
-- Kistly 0026_suche_genauer
--
-- Zwei Fehler aus der Gegenpruefung von inhalt_suchen (0024):
--
-- 1. Die Anfrage lief ungeschuetzt in ein LIKE. "__" oder "%%" passten auf
--    jede Zeile, "100%" auf alles mit 100 darin. Jetzt sucht strpos nach
--    genau dem Text, den man eingetippt hat. Einen Index verliert das
--    nicht: unter der Zeilen-Sicherheit konnte das LIKE ohnehin keinen
--    benutzen.
--
-- 2. Jeder Treffer im Text bekam 1,0, ob das ganze Wort passte oder nur
--    ein Stueck ("uhr" in "Schuhregal"). Bei vielen Treffern entschied das
--    Alphabet, wer in die ersten 60 kam. Jetzt in Stufen:
--      1,00  der ganze Name ist das Suchwort
--      0,95  ein ganzes Wort ist das Suchwort
--      0,90  ein Wort faengt mit dem Suchwort an
--      0,80  das Suchwort steckt irgendwo darin
--      darunter  nur aehnlich (Tippfehler), hoechstens 0,79
--    Bei Gleichstand kommt der kuerzere Name zuerst: "Kleber" vor
--    "Kleber fuer Tapeten und Bordueren".
--
-- Signatur und Spalten bleiben gleich, die App merkt nur bessere Treffer.
-- =====================================================================

create or replace function public.inhalt_suchen(p_q text, p_max int default 60)
returns table (
  content_id      uuid,
  inhalt          text,
  menge           int,
  schicht         smallint,
  photo_id        uuid,
  foto_pfad       text,
  box_x0          numeric,
  box_y0          numeric,
  box_x1          numeric,
  box_y1          numeric,
  punkt_x         numeric,
  punkt_y         numeric,
  ausschnitt_pfad text,
  bestaetigt      boolean,
  item_id         uuid,
  item_code       text,
  item_kind       text,
  item_title      text,
  item_status     text,
  project_id      uuid,
  project_name    text,
  room_id         uuid,
  room_name       text,
  room_color      text,
  plan_x          int,
  plan_y          int,
  plan_z          int,
  regal_name      text,
  regal_boden     smallint,
  hoehe_von       int,
  hoehe_bis       int,
  treffer         real
)
language sql stable security invoker set search_path = public, extensions as $fn$
  with q as (select public.such_normal(p_q) as n)
  select
    c.id, c.text, c.qty, c.schicht, c.photo_id, f.path,
    c.box_x0, c.box_y0, c.box_x1, c.box_y1, c.punkt_x, c.punkt_y,
    c.ausschnitt_pfad, c.bestaetigt,
    i.id, i.code, i.kind::text, i.title, i.status::text,
    p.id, p.name,
    t.id, t.name, t.color,
    i.plan_x, i.plan_y, i.plan_z,
    g.name, i.regal_boden,
    h.von, h.von + public.item_hoehe_cm(i.size, i.eigene_hoehe_cm),
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
  left join public.regale g on g.id = i.regal_id
  -- Die Unterkante der Kiste: das Brett oder der Boden, und alles, was
  -- im selben Stapel darunter steht. Ohne Platz bleibt sie leer.
  left join lateral (
    select case when i.plan_x is null then null else
      coalesce(g.boeden_cm[i.regal_boden], 0) + coalesce((
        select sum(public.item_hoehe_cm(u.size, u.eigene_hoehe_cm))::int
          from public.items u
         where u.room_id = i.room_id
           and u.plan_x = i.plan_x and u.plan_y = i.plan_y
           and coalesce(u.regal_boden, 0) = coalesce(i.regal_boden, 0)
           and u.plan_z < i.plan_z
      ), 0)
    end as von
  ) h on true
  where length(q.n) >= 2
  order by 32 desc, length(c.text), c.text
  limit least(greatest(coalesce(p_max, 60), 1), 200)
$fn$;

revoke execute on function public.inhalt_suchen(text, int) from public, anon;
grant  execute on function public.inhalt_suchen(text, int) to authenticated;
