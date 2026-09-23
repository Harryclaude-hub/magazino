-- =====================================================================
-- Kistly 0020_raumplan_und_punkte_aufraeumen
--
-- Nachbesserungen zu 0017 bis 0019. Gefunden bei der Vorpruefung vom
-- 23.09.2026, bevor Raumplan und Schichten je in der echten App bedient
-- wurden. Jeder Fund war von zwei Pruefern unabhaengig bestaetigt.
--
-- 1. Wird ein Raumplan geloescht, blieben die Plaetze in den Kisten
--    stehen. Danach wies items_plan_pruefen jede Aenderung an diesen
--    Kisten ab ("Fuer dieses Zimmer gibt es noch keinen Plan"), auch
--    "Angekommen" am Umzugstag. Jetzt leert die Datenbank die Plaetze,
--    bevor der Plan verschwindet.
--
-- 2. items_plan_pruefen prueft den Platz nur noch, wenn sich Platz oder
--    Zimmer wirklich aendern. Ein Statuswechsel, eine Notiz oder ein
--    neues Deckbild scheitern nie mehr an einem Platz, der schon vorher
--    so stand.
--
-- 3. Eine erkannte Zeile in eine andere Kiste umhaengen scheiterte
--    immer: das Foto gehoert der alten Kiste, contents_bild_pruefen warf.
--    Jetzt bleibt der Ort in der alten Kiste: Foto, Punkt, Schicht und
--    Antwort fallen beim Umhaengen weg, der Text wandert mit. Dasselbe
--    Muster wie beim Raumplan: zieht eine Kiste um, faellt ihr Platz weg.
--
-- 4. Die Schicht einer Zeile folgt der Schicht ihres Fotos. Vorher blieb
--    an der Zeile die alte Schicht stehen, wenn man die des Fotos
--    aenderte, und eine spaetere Suche haette in die falsche Lage
--    geschickt.
--
-- 5. Wird ein Foto geloescht, faellt neben dem Punkt auch die Antwort
--    weg. "Ja, das ist es" bezog sich auf einen Punkt in diesem Bild; ohne
--    Bild ist die Antwort ohne Gegenstand.
--
-- Angewandte Migrationen bleiben, wie sie gelaufen sind. Diese Datei
-- ersetzt nur Funktionen und legt Trigger an.
-- =====================================================================

-- ------------------------------------------ 1. Plan weg, Plaetze weg
create or replace function public.room_plans_plaetze_leeren()
returns trigger language plpgsql as $fn$
begin
  update public.items
     set plan_x = null, plan_y = null, plan_z = null
   where room_id = old.tag_id
     and plan_x is not null;
  return old;
end $fn$;

alter function public.room_plans_plaetze_leeren() set search_path = public;

-- Vor dem Loeschen: waehrend die Plaetze geleert werden, gibt es den Plan
-- noch. Die Kisten verlieren ihren Platz, nicht ihr Zimmer.
drop trigger if exists room_plans_plaetze_leeren on public.room_plans;
create trigger room_plans_plaetze_leeren
  before delete on public.room_plans
  for each row execute function public.room_plans_plaetze_leeren();

-- -------------------------- 2. Platz nur pruefen, wenn er sich aendert
create or replace function public.items_plan_pruefen()
returns trigger language plpgsql as $fn$
declare
  p         public.room_plans;
  v_spalten int;
  v_reihen  int;
  v_ebenen  int;
begin
  -- Ohne Zimmer gibt es keinen Platz im Zimmer.
  if new.room_id is null then
    new.plan_x := null; new.plan_y := null; new.plan_z := null;
  end if;

  -- Zieht die Kiste in ein anderes Zimmer, gilt der alte Platz nicht
  -- mehr. Wer gleichzeitig einen neuen Platz mitgibt, behaelt ihn.
  if tg_op = 'UPDATE' and new.room_id is distinct from old.room_id then
    if new.plan_x is not distinct from old.plan_x
       and new.plan_y is not distinct from old.plan_y
       and new.plan_z is not distinct from old.plan_z then
      new.plan_x := null; new.plan_y := null; new.plan_z := null;
    end if;
  end if;

  if new.plan_x is null then
    return new;
  end if;

  -- Neu seit 0020: steht die Kiste da, wo sie schon stand, im selben
  -- Zimmer, gibt es nichts zu pruefen. Sonst scheiterte jede andere
  -- Aenderung an ihr, sobald sich Plan oder Zimmer inzwischen geaendert
  -- haben.
  if tg_op = 'UPDATE'
     and new.room_id is not distinct from old.room_id
     and new.plan_x  is not distinct from old.plan_x
     and new.plan_y  is not distinct from old.plan_y
     and new.plan_z  is not distinct from old.plan_z then
    return new;
  end if;

  select * into p from public.room_plans where tag_id = new.room_id;
  if p.tag_id is null then
    raise exception 'Für dieses Zimmer gibt es noch keinen Plan'
      using errcode = 'no_data_found';
  end if;

  v_spalten := ceil(p.breite_cm::numeric / p.raster_cm);
  v_reihen  := ceil(p.tiefe_cm::numeric  / p.raster_cm);
  -- Eine Lage rechnet mit 40 cm, wie in 0017. Die echte Hoehe je Kiste
  -- kommt mit den Litergroessen.
  v_ebenen  := greatest(1, floor(p.hoehe_cm::numeric / 40));

  if new.plan_x >= v_spalten or new.plan_y >= v_reihen then
    raise exception 'Der Platz liegt außerhalb des Zimmers'
      using errcode = 'check_violation';
  end if;
  if new.plan_z >= v_ebenen then
    raise exception 'So hoch ist das Zimmer nicht' using errcode = 'check_violation';
  end if;
  if p.gesperrt @> jsonb_build_array(jsonb_build_array(new.plan_x, new.plan_y)) then
    raise exception 'Dieser Platz gehört nicht zum Zimmer'
      using errcode = 'check_violation';
  end if;

  return new;
end $fn$;

alter function public.items_plan_pruefen() set search_path = public;

-- ----------------------- 3. Umhaengen nimmt den Ort nicht mit, sondern
--                            laesst ihn in der alten Kiste
create or replace function public.contents_bild_pruefen()
returns trigger language plpgsql as $fn$
declare
  v_item uuid;
begin
  -- Neu seit 0020: wechselt die Zeile die Kiste und bringt kein neues
  -- Foto mit, bleibt der Ort in der alten Kiste. Das Foto gehoert ihr,
  -- also auch Punkt, Schicht und Antwort.
  if tg_op = 'UPDATE'
     and new.item_id is distinct from old.item_id
     and new.photo_id is not distinct from old.photo_id then
    new.photo_id   := null;
    new.punkt_x    := null;
    new.punkt_y    := null;
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

-- ------------------------- 4. Die Schicht der Zeile folgt ihrem Foto
create or replace function public.foto_schicht_weitergeben()
returns trigger language plpgsql as $fn$
begin
  update public.item_contents
     set schicht = new.schicht
   where photo_id = new.id
     and schicht is distinct from new.schicht;
  return new;
end $fn$;

alter function public.foto_schicht_weitergeben() set search_path = public;

drop trigger if exists item_photos_schicht_weiter on public.item_photos;
create trigger item_photos_schicht_weiter
  after update of schicht on public.item_photos
  for each row
  when (new.schicht is distinct from old.schicht)
  execute function public.foto_schicht_weitergeben();

-- --------------------------- 5. Foto weg: Punkt und Antwort weg
create or replace function public.foto_weg_punkte_loeschen()
returns trigger language plpgsql as $fn$
begin
  update public.item_contents
     set photo_id = null, punkt_x = null, punkt_y = null, bestaetigt = null
   where photo_id = old.id;
  return old;
end $fn$;

alter function public.foto_weg_punkte_loeschen() set search_path = public;
