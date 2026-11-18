-- =====================================================================
-- Magazino 0052_nur_admin_legt_lager_an (E103)
--
-- Lager (Projekte) legen nur Admins an. Bisher durfte das jedes freigegebene
-- Konto, auch ueber den direkten Weg (insert in projects). Beides wird
-- geschlossen: die Regel projects_insert verlangt ist_admin(), und
-- create_project ist fuer angemeldete Nutzer nicht mehr aufrufbar. Admins
-- gehen ueber lager_anlegen (0050), das create_project als Funktionsbesitzer
-- aufruft. Einem Lager beitreten (join_project) und Mitglied werden
-- (admin_mitglied_setzen) bleiben wie sie sind.
-- =====================================================================

alter policy projects_insert on public.projects
  with check (owner_id = auth.uid() and public.ist_freigegeben() and public.ist_admin());

revoke execute on function public.create_project(text, text, boolean) from public, anon, authenticated;
