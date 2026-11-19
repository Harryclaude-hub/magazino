-- =====================================================================
-- Magazino 0056_produktbilder (E106)
--
-- Ein Produkt kann ein Foto haben. bild_pfad ist ein Pfad innerhalb der
-- App (public/produkte/<name>.jpg), kein fremder Link: so laedt nichts von
-- Fremdseiten nach und der Pfad kann keine Adresse nach aussen sein. Die
-- Pruefung erlaubt nur klein geschriebene Buchstaben, Ziffern, Punkt,
-- Binde- und Unterstrich und endet auf .jpg, .png oder .webp.
-- Fuer die Demo-Dinge werden die ausgesuchten Fotos zugeordnet.
-- =====================================================================

alter table public.bestand
  add column bild_pfad text
  check (bild_pfad is null or bild_pfad ~ '^produkte/[a-z0-9._-]+\.(jpg|png|webp)$');

update public.bestand set bild_pfad = case
  when name = 'Papierbecher' then 'produkte/papierbecher.jpg'
  when name = 'Papierteller' then 'produkte/papierteller.jpg'
  when name = 'Klebestifte' then 'produkte/klebestift.jpg'
  when name like 'Datteln%' then 'produkte/datteln.jpg'
  when name = 'Fruchtgummi halal' then 'produkte/fruchtgummi.jpg'
  when name like 'Wasserflaschen%' then 'produkte/wasserflasche.jpg'
  when name = 'Teebeutel' then 'produkte/teebeutel.jpg'
  when name = 'Kuchenständer' then 'produkte/kuchenstaender.jpg'
  when name = 'Preisschilder' then 'produkte/preisschilder.jpg'
  when name like 'Fußballtor%' then 'produkte/fussballtor.jpg'
  when name = 'Kinderbücher' then 'produkte/kinderbuecher.jpg'
  when name = 'Koran-Ständer' then 'produkte/koranstaender.jpg'
  when name = 'Beamer' then 'produkte/beamer.jpg'
  when name = 'Verlängerungskabel' then 'produkte/verlaengerungskabel.jpg'
  when name = 'Mikrofone' then 'produkte/mikrofon.jpg'
  else bild_pfad end
 where bild_pfad is null;
