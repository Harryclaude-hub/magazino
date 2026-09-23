-- =====================================================================
-- Kistly 0024_suche_ueber_alle_umzuege
--
-- Karam sucht "Kleber", "Fahrrad", "Ladekabel" und bekommt, ueber alle
-- Umzuege, in denen er Mitglied ist, das Bild des Dings und wo es steht:
-- Umzug, Zimmer, Kiste, Schicht, Regal und Brett, und in welcher Hoehe.
--
-- 1. such_text: ein bereinigter Suchtext je Inhaltszeile, aus dem Namen
--    und den Suchwoertern (0023). Bereinigt heisst: klein geschrieben,
--    Umlaute ausgeschrieben (ae, oe, ue, ss), und im Arabischen ohne
--    Vokalzeichen und Tatweel, mit einheitlichem Alef, ة als ه und ى als ي.
--    So findet "Buecher" auch "Bücher", und صمغ findet صَمْغ. Dieselbe
--    Bereinigung laeuft ueber die Anfrage, in such_normal, einer Fassung.
--
-- 2. pg_trgm: Aehnlichkeit ueber Dreiergruppen von Buchstaben. Findet
--    Teilwoerter (Kleber in Sekundenkleber) und Tippfehler (Kleeber).
--    Ein GIN-Index macht es schnell.
--
-- 3. inhalt_suchen(): laeuft mit den Rechten dessen, der fragt (security
--    invoker). Die Zeilen-Sicherheit jeder beteiligten Tabelle greift also
--    weiter: niemand findet etwas in einem Umzug, in dem er nicht ist.
--    Die Hoehe wird wie im Raumplan aus den Kisten darunter abgeleitet
--    (0022), nicht gespeichert.
-- =====================================================================

create extension if not exists pg_trgm with schema extensions;

-- ------------------------------------------------ 1. Bereinigter Text
create or replace function public.such_normal(p text)
returns text language sql immutable parallel safe as $fn$
  select btrim(regexp_replace(
    translate(
      regexp_replace(
        replace(replace(replace(replace(lower(coalesce(p, '')),
          'ä', 'ae'), 'ö', 'oe'), 'ü', 'ue'), 'ß', 'ss'),
        -- Arabische Vokalzeichen, Dagger-Alef und Tatweel weg.
        '[ً-ْٰـ]', '', 'g'),
      -- Alef-Formen, Ta marbuta, Alef maqsura, Hamza-Traeger vereinheitlichen.
      'أإآٱةىؤئ',
      'ااااهيوي'),
    '\s+', ' ', 'g'))
$fn$;

alter table public.item_contents add column if not exists such_text text not null default '';

create or replace function public.contents_such_text()
returns trigger language plpgsql as $fn$
begin
  new.such_text := public.such_normal(
    new.text || ' ' || coalesce(array_to_string(new.suchwoerter, ' '), '')
  );
  return new;
end $fn$;

alter function public.contents_such_text() set search_path = public;

drop trigger if exists contents_such on public.item_contents;
create trigger contents_such
  before insert or update of text, suchwoerter on public.item_contents
  for each row execute function public.contents_such_text();

-- Vorhandene Zeilen einmal nachziehen.
update public.item_contents
   set such_text = public.such_normal(text || ' ' || coalesce(array_to_string(suchwoerter, ' '), ''))
 where such_text is distinct from
       public.such_normal(text || ' ' || coalesce(array_to_string(suchwoerter, ' '), ''));

create index if not exists item_contents_such_trgm
  on public.item_contents using gin (such_text extensions.gin_trgm_ops);

-- ------------------------------------------------------------ 2. Suchen
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
    greatest(
      extensions.word_similarity(q.n, c.such_text),
      case when position(q.n in c.such_text) > 0 then 1.0 else 0 end
    )::real
  from q
  join public.item_contents c
    on c.such_text like '%' || q.n || '%'
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
  order by 32 desc, c.text
  limit least(greatest(coalesce(p_max, 60), 1), 200)
$fn$;

-- Nur fuer Angemeldete. Ausdruecklich, weil neue Funktionen sonst fuer
-- alle ausfuehrbar sind (0006 hat nur die damals vorhandenen gesperrt).
revoke execute on function public.inhalt_suchen(text, int) from public, anon;
grant  execute on function public.inhalt_suchen(text, int) to authenticated;
