-- =====================================================================
-- Kistly 0018_schichten_und_punkte
--
-- Eine Kiste wird nicht einmal fotografiert, sondern Schicht fuer
-- Schicht: Schicht 1 ist die oberste Lage, Schicht 2 liegt darunter.
-- Dazu kommt, was schon da war: seite haelt fest, aus welchem Winkel
-- das Bild aufgenommen wurde.
--
-- Zweitens bekommt jede Zeile der Inhaltsliste einen Ort: auf welchem
-- Bild der Gegenstand zu sehen ist und an welcher Stelle darauf. Dann
-- kann man in der Liste auf einen Gegenstand tippen, das Bild geht auf,
-- und ein roter Punkt sitzt auf dem gesuchten Ding.
--
-- Drittens bestaetigt: hat ein Mensch hingesehen und gesagt, ja, das ist
-- es? Drei Zustaende, nicht zwei. null heisst "noch niemand hat
-- hingesehen" und ist etwas anderes als "nein, das ist es nicht". Wer
-- beides gleich behandelt, verliert genau die Faelle, die man pruefen
-- wollte.
--
-- Die Punkte kommen aus der Bilderkennung und sind geschaetzt. Darum
-- gibt es das Bestaetigen ueberhaupt.
--
-- ACHTUNG: die Pruefung "ein Punkt braucht ein Bild" beisst sich mit
-- "on delete set null" am Foto. 0019 raeumt das auf. Diese Datei bleibt
-- so, wie sie gelaufen ist: eine Migration haelt fest, was wirklich
-- passiert ist.
-- =====================================================================

-- ------------------------------------------------ 1. Schicht am Foto
alter table public.item_photos add column if not exists schicht smallint;

do $$ begin
  alter table public.item_photos add constraint item_photos_schicht_check
    check (schicht is null or schicht between 1 and 20);
exception when duplicate_object then null; end $$;

-- Die Fotos einer Kiste werden nach Schicht sortiert gezeigt.
create index if not exists item_photos_schicht_idx
  on public.item_photos(item_id, schicht)
  where item_id is not null and schicht is not null;

-- --------------------------------------- 2. Ort und Schicht am Eintrag
alter table public.item_contents add column if not exists photo_id uuid
  references public.item_photos(id) on delete set null;
alter table public.item_contents add column if not exists schicht smallint;
-- 0 ist links und oben, 1 ist rechts und unten. Anteile statt Pixel:
-- dasselbe Bild wird auf jedem Geraet anders gross angezeigt.
alter table public.item_contents add column if not exists punkt_x numeric(5,4);
alter table public.item_contents add column if not exists punkt_y numeric(5,4);
alter table public.item_contents add column if not exists bestaetigt boolean;

do $$ begin
  alter table public.item_contents add constraint item_contents_punkt_check
    check (
      num_nonnulls(punkt_x, punkt_y) in (0, 2)
      and (punkt_x is null or (punkt_x >= 0 and punkt_x <= 1))
      and (punkt_y is null or (punkt_y >= 0 and punkt_y <= 1))
      -- Ein Punkt ohne Bild zeigt auf nichts.
      and (punkt_x is null or photo_id is not null)
    );
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.item_contents add constraint item_contents_schicht_check
    check (schicht is null or schicht between 1 and 20);
exception when duplicate_object then null; end $$;

create index if not exists item_contents_photo_idx
  on public.item_contents(photo_id)
  where photo_id is not null;

-- Das Bild muss zu DIESER Kiste gehoeren. Ein Check-Constraint kann das
-- nicht pruefen, weil es dafuer in eine andere Tabelle sehen muesste.
-- Dasselbe Muster wie beim Deckbild in 0012.
create or replace function public.contents_bild_pruefen()
returns trigger language plpgsql as $fn$
declare
  v_item uuid;
begin
  if new.photo_id is null then
    return new;
  end if;
  select item_id into v_item from public.item_photos where id = new.photo_id;
  if not found then
    raise exception 'Bild nicht gefunden' using errcode = 'no_data_found';
  end if;
  if v_item is distinct from new.item_id then
    raise exception 'Das Bild gehört zu einem anderen Eintrag'
      using errcode = 'check_violation';
  end if;
  return new;
end $fn$;

alter function public.contents_bild_pruefen() set search_path = public;

drop trigger if exists contents_bild on public.item_contents;
create trigger contents_bild
  before insert or update of photo_id, item_id on public.item_contents
  for each row execute function public.contents_bild_pruefen();
