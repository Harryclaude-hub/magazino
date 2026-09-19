-- =====================================================================
-- Kistly 0019_bild_weg_punkt_weg
--
-- Nachbesserung zu 0018. Dort steht zweierlei, das sich beisst:
--   item_contents.photo_id  ... on delete set null
--   check (punkt_x is null or photo_id is not null)
--
-- Wird ein Foto geloescht, setzt die Fremdschluesselregel photo_id auf
-- null, der Punkt bleibt stehen, und die Pruefung schlaegt zu. Ergebnis:
-- das Foto laesst sich gar nicht mehr loeschen, mit einer Meldung ueber
-- eine Pruefung, die mit dem Loeschen nichts zu tun zu haben scheint.
--
-- Gefunden beim Durchspielen gegen die echte Datenbank, nicht im Kopf.
--
-- Loesung: bevor ein Foto verschwindet, verlieren die Zeilen, die darauf
-- zeigen, ihren Ort. Der Text bleibt. Ein Punkt ohne Bild zeigt auf
-- nichts, die Liste bleibt aber vollstaendig.
-- =====================================================================

create or replace function public.foto_weg_punkte_loeschen()
returns trigger language plpgsql as $fn$
begin
  update public.item_contents
     set photo_id = null, punkt_x = null, punkt_y = null
   where photo_id = old.id;
  return old;
end $fn$;

alter function public.foto_weg_punkte_loeschen() set search_path = public;

-- Vor dem Loeschen, damit die Zeilen schon aufgeraeumt sind, wenn die
-- Fremdschluesselregel greift.
drop trigger if exists item_photos_punkte_weg on public.item_photos;
create trigger item_photos_punkte_weg
  before delete on public.item_photos
  for each row execute function public.foto_weg_punkte_loeschen();
