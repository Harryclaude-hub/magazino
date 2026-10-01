-- 0042: Wann wurde ein Eintrag zuletzt geaendert, wie alt ist das Foto (E81).
--
-- Karam will bei jedem Ding in der Kiste sehen, wann zuletzt etwas daran
-- gemacht wurde (Menge, Name, andere Kiste) und wie alt das Foto ist, aus
-- dem es stammt. "Fotos ein Jahr alt, Aenderung vor zwei Wochen" muss
-- auseinanderzuhalten sein.
--
-- 1. item_contents.geaendert_at und geaendert_was: setzt nur die
--    Datenbank, bei Menge, Text oder Kiste. Abhaken zaehlt nicht, das ist
--    Auspacken, keine Aenderung am Ding.
-- 2. item_photos.aufgenommen_at: wann das Foto gemacht wurde (aus den
--    Bilddaten des Handys, die App liest es vor dem Verkleinern). null
--    heisst unbekannt; dann gilt created_at (hochgeladen).
-- 3. Verlauf: Menge geaendert und in eine andere Kiste gelegt stehen im
--    Verlauf der Kiste, in der das Ding jetzt liegt.

alter table public.item_contents add column geaendert_at timestamptz;
update public.item_contents set geaendert_at = created_at;
alter table public.item_contents alter column geaendert_at set default now();
alter table public.item_contents alter column geaendert_at set not null;

alter table public.item_contents add column geaendert_was text
  check (geaendert_was in ('menge', 'text', 'kiste'));

alter table public.item_photos add column aufgenommen_at timestamptz
  check (aufgenommen_at is null or aufgenommen_at > timestamptz '1990-01-01');

create or replace function public.contents_geaendert()
returns trigger language plpgsql set search_path = public as $fn$
begin
  -- Was der Client schickt, zaehlt nicht: die Zeit setzt nur die Datenbank.
  new.geaendert_at := old.geaendert_at;
  new.geaendert_was := old.geaendert_was;
  if new.item_id is distinct from old.item_id then
    new.geaendert_at := now();
    new.geaendert_was := 'kiste';
  elsif new.qty is distinct from old.qty then
    new.geaendert_at := now();
    new.geaendert_was := 'menge';
  elsif new.text is distinct from old.text then
    new.geaendert_at := now();
    new.geaendert_was := 'text';
  end if;
  return new;
end $fn$;

create trigger contents_geaendert before update on public.item_contents
  for each row execute function public.contents_geaendert();

-- Beim Anlegen ebenfalls nur die Datenbank.
create or replace function public.contents_neu_zeit()
returns trigger language plpgsql set search_path = public as $fn$
begin
  new.geaendert_at := now();
  new.geaendert_was := null;
  return new;
end $fn$;

create trigger contents_neu_zeit before insert on public.item_contents
  for each row execute function public.contents_neu_zeit();

-- Verlauf. security definer wie items_after_update: der Eintrag im
-- Verlauf entsteht, auch wenn die Zeilen-Regeln das direkte Schreiben
-- anders einschraenken wuerden; geschrieben wird nur, was hier steht.
create or replace function public.contents_verlauf()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare
  v_von text;
  v_nach text;
begin
  if new.item_id is distinct from old.item_id then
    select code into v_von from public.items where id = old.item_id;
    select code into v_nach from public.items where id = new.item_id;
    insert into public.item_events (project_id, item_id, user_id, type, data)
    values (new.project_id, new.item_id, auth.uid(), 'inhalt_kiste',
            jsonb_build_object('text', left(new.text, 80), 'von', v_von, 'nach', v_nach));
  elsif new.qty is distinct from old.qty then
    insert into public.item_events (project_id, item_id, user_id, type, data)
    values (new.project_id, new.item_id, auth.uid(), 'inhalt_menge',
            jsonb_build_object('text', left(new.text, 80), 'von', old.qty, 'nach', new.qty));
  end if;
  return new;
end $fn$;

revoke execute on function public.contents_verlauf() from public, anon, authenticated;

create trigger contents_verlauf after update on public.item_contents
  for each row execute function public.contents_verlauf();
