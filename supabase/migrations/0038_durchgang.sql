-- 0038: Offener Durchgang als dritte Art einer Oeffnung (E54).
--
-- Ein Durchgang ist eine Oeffnung in der Wand ohne Tuerblatt (etwa zwischen
-- Flur und Wohnkueche). Er schneidet die Wand wie eine Tuer, gezeichnet wird
-- aber kein Blatt und kein Bogen. Fuer die Regeln gilt er wie eine Tuer:
-- er beginnt am Boden (oeffnungen_tuer_boden laesst nur Fenster darueber).

alter table public.oeffnungen drop constraint oeffnungen_art_check;
alter table public.oeffnungen
  add constraint oeffnungen_art_check check (art in ('tuer', 'fenster', 'durchgang'));
