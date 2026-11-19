-- =====================================================================
-- Magazino 0061_weitere_altlasten (E108)
--
-- Letzte ungenutzte Funktionen des Umzugsprogramms und der Zwischenstaende:
--  avatar3d_gueltig  (Figur, Spalte ist seit 0060 weg)
--  merge_tags, tag_stats  (Zimmer zusammenlegen und zaehlen)
--  create_project    (Lager legt nur noch lager_anlegen an, 0054)
--  admin_mitglied_setzen  (Zugang je Lager; Zugang gibt es nur noch je
--                          Bundeslandprojekt, bl_mitglied_setzen)
-- Ohne CASCADE: haengt noch etwas Gebrauchtes daran, bricht es ab.
-- =====================================================================
drop function public.avatar3d_gueltig(jsonb);
drop function public.merge_tags(uuid, uuid);
drop function public.tag_stats(uuid);
drop function public.create_project(text, text, boolean);
drop function public.admin_mitglied_setzen(uuid, uuid, text);
