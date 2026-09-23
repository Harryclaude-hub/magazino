-- =====================================================================
-- Kistly 0023_rahmen_ausschnitte_ohne_dienstschluessel
--
-- Die Bilderkennung liefert ab jetzt je Ding einen Rahmen statt nur eines
-- Punktes, einen Namen auf Deutsch und Arabisch und Suchwoerter. Aus dem
-- Rahmen schneidet der Browser ein kleines Bild des Dings aus; die Suche
-- ueber alle Umzuege zeigt spaeter genau dieses Bild.
--
-- Karam hat am 23.09.2026 entschieden: offenes Modell Qwen3.5-9B bei
-- OVHcloud, aufgerufen aus der Edge Function bild-analyse. Der Schluessel
-- liegt als Function Secret auf dem Server, nie im Browser, nie im Repo.
--
-- 1. Rahmen am Eintrag. box_x0 bis box_y1 in Anteilen des Bildes, 0 ist
--    links und oben, 1 rechts und unten, wie der Punkt aus 0018. Hat ein
--    Eintrag einen Rahmen, ist sein Punkt die Mitte des Rahmens; das setzt
--    die Datenbank, damit Punkt und Rahmen nie auseinanderlaufen.
--
-- 2. suchwoerter: Woerter, unter denen jemand das Ding sucht, in beiden
--    Sprachen, dazu Oberbegriffe (UHU: Kleber, Klebstoff, Leim, ...).
--    ausschnitt_pfad: das ausgeschnittene Bild im Speicher item-photos.
--    sicherheit: die Selbsteinschaetzung des Modells, 0 bis 1.
--
-- 3. Ohne Dienstschluessel. Bisher schrieb die Edge Function mit dem
--    service_role-Schluessel in photo_analyses und bild_lesen_log. Karams
--    Regel sagt: nie. Ab jetzt schreibt sie mit der Anmeldung dessen, der
--    fragt:
--    - photo_analyses: Bearbeiter duerfen Ergebnisse fuer Fotos ihres
--      Umzugs anlegen und ersetzen.
--    - bild_lesen_buchen(): prueft die Kostenbremse und traegt in einem
--      Schritt ins Protokoll ein. Das Protokoll selbst bleibt fuer alle
--      nur lesbar; niemand kann Eintraege loeschen und so die Grenze
--      umgehen.
-- =====================================================================

-- ------------------------------------------------ 1. Rahmen am Eintrag
alter table public.item_contents add column if not exists box_x0 numeric(5,4);
alter table public.item_contents add column if not exists box_y0 numeric(5,4);
alter table public.item_contents add column if not exists box_x1 numeric(5,4);
alter table public.item_contents add column if not exists box_y1 numeric(5,4);
alter table public.item_contents add column if not exists suchwoerter text[] not null default '{}';
alter table public.item_contents add column if not exists ausschnitt_pfad text;
alter table public.item_contents add column if not exists sicherheit numeric(3,2);

do $$ begin
  alter table public.item_contents add constraint item_contents_rahmen_check
    check (
      num_nonnulls(box_x0, box_y0, box_x1, box_y1) in (0, 4)
      and (box_x0 is null or (
        box_x0 >= 0 and box_y0 >= 0 and box_x1 <= 1 and box_y1 <= 1
        and box_x0 < box_x1 and box_y0 < box_y1
      ))
      -- Ein Rahmen ohne Bild zeigt auf nichts, wie der Punkt (0018).
      and (box_x0 is null or photo_id is not null)
    );
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.item_contents add constraint item_contents_suchwoerter_check
    check (cardinality(suchwoerter) <= 30);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.item_contents add constraint item_contents_sicherheit_check
    check (sicherheit is null or (sicherheit >= 0 and sicherheit <= 1));
exception when duplicate_object then null; end $$;

-- Der Punkt ist die Mitte des Rahmens. Eine Fassung, nicht zwei.
create or replace function public.contents_punkt_aus_rahmen()
returns trigger language plpgsql as $fn$
begin
  if new.box_x0 is not null then
    new.punkt_x := round((new.box_x0 + new.box_x1) / 2, 4);
    new.punkt_y := round((new.box_y0 + new.box_y1) / 2, 4);
  end if;
  return new;
end $fn$;

alter function public.contents_punkt_aus_rahmen() set search_path = public;

-- Der Name sorgt dafuer, dass dieser Trigger nach contents_bild laeuft
-- (alphabetisch): erst raeumt contents_bild beim Umhaengen den Ort ab,
-- dann wird aus einem verbliebenen Rahmen der Punkt.
drop trigger if exists contents_punkt on public.item_contents;
create trigger contents_punkt
  before insert or update on public.item_contents
  for each row execute function public.contents_punkt_aus_rahmen();

-- Umhaengen in eine andere Kiste: der Ort bleibt in der alten Kiste, und
-- dazu gehoert jetzt auch der Rahmen (0020 kannte ihn noch nicht). Das
-- Ausschnittbild darf mit: es zeigt das Ding selbst, nicht die alte Kiste.
create or replace function public.contents_bild_pruefen()
returns trigger language plpgsql as $fn$
declare
  v_item uuid;
begin
  if tg_op = 'UPDATE'
     and new.item_id is distinct from old.item_id
     and new.photo_id is not distinct from old.photo_id then
    new.photo_id   := null;
    new.punkt_x    := null;
    new.punkt_y    := null;
    new.box_x0     := null;
    new.box_y0     := null;
    new.box_x1     := null;
    new.box_y1     := null;
    new.schicht    := null;
    new.bestaetigt := null;
  end if;

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

-- Foto weg: Punkt, Rahmen und Antwort weg. Der Text, die Suchwoerter und
-- das Ausschnittbild bleiben: das Ding liegt ja weiter in der Kiste.
create or replace function public.foto_weg_punkte_loeschen()
returns trigger language plpgsql as $fn$
begin
  update public.item_contents
     set photo_id = null, punkt_x = null, punkt_y = null, bestaetigt = null,
         box_x0 = null, box_y0 = null, box_x1 = null, box_y1 = null
   where photo_id = old.id;
  return old;
end $fn$;

alter function public.foto_weg_punkte_loeschen() set search_path = public;

-- ------------------------------ 2. Ergebnisse schreiben ohne Dienstschluessel
drop policy if exists analyses_insert on public.photo_analyses;
create policy analyses_insert on public.photo_analyses for insert to authenticated
  with check (
    public.is_editor(project_id)
    and exists (
      select 1 from public.item_photos p
       where p.id = photo_analyses.photo_id and p.project_id = photo_analyses.project_id
    )
  );

drop policy if exists analyses_update on public.photo_analyses;
create policy analyses_update on public.photo_analyses for update to authenticated
  using (public.is_editor(project_id))
  with check (
    public.is_editor(project_id)
    and exists (
      select 1 from public.item_photos p
       where p.id = photo_analyses.photo_id and p.project_id = photo_analyses.project_id
    )
  );

-- ------------------------------------------ 3. Kostenbremse in einem Schritt
-- Prueft die Grenze und traegt ein, in einem Vorgang und je Umzug
-- nacheinander. Vorher fragte die Funktion erst nach dem Rest und schrieb
-- dann; zwei gleichzeitige Aufrufe konnten dazwischen beide durchrutschen.
-- Ein Treffer aus dem Speicher (p_bezahlt = false) kostet nichts und wird
-- nur mitgezaehlt.
-- Rueckgabe: true heisst "darf fragen", false heisst "Grenze erreicht".
create or replace function public.bild_lesen_buchen(
  p_project uuid,
  p_photo   uuid,
  p_modell  text,
  p_bezahlt boolean
) returns boolean
language plpgsql security definer set search_path = public as $fn$
declare
  v_user uuid := auth.uid();
  v_rest record;
begin
  if v_user is null then
    raise exception 'Nicht angemeldet' using errcode = '42501';
  end if;
  if not public.is_editor(p_project) then
    raise exception 'Nur Bearbeiter dürfen Bilder auswerten lassen' using errcode = '42501';
  end if;
  if not exists (select 1 from public.item_photos where id = p_photo and project_id = p_project) then
    raise exception 'Bild nicht gefunden' using errcode = 'no_data_found';
  end if;

  if p_bezahlt then
    perform pg_advisory_xact_lock(hashtextextended('bild_lesen:' || p_project::text, 0));
    select * into v_rest from public.bild_lesen_rest(p_project, v_user);
    if v_rest.rest_projekt <= 0 or v_rest.rest_nutzer <= 0 then
      return false;
    end if;
  end if;

  insert into public.bild_lesen_log (project_id, user_id, photo_id, modell, bezahlt)
  values (p_project, v_user, p_photo, left(p_modell, 100), p_bezahlt);
  return true;
end $fn$;

revoke execute on function public.bild_lesen_buchen(uuid, uuid, text, boolean) from public, anon;
grant  execute on function public.bild_lesen_buchen(uuid, uuid, text, boolean) to authenticated;
