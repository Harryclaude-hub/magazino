-- =====================================================================
-- Magazino 0055_plan_nur_admin (E104)
--
-- Den Grundriss zeichnet nur der Admin. Bisher durfte jeder Bearbeiter
-- eines Lagers Raeume, Tueren, Fenster, Regale und Schraenke anlegen,
-- aendern und loeschen (Zeilenregeln 0028, Funktion grundriss_speichern).
-- Jetzt lehnt ein Trigger jede solche Aenderung ab, wenn das aufrufende
-- Konto kein Admin ist, egal ueber welchen Weg sie kommt (direkt oder ueber
-- grundriss_speichern). Kisten in ein Regal stellen (items.platz_*) bleibt
-- allen Bearbeitern erlaubt: das aendert den Plan nicht.
--
-- Ohne angemeldetes Konto (auth.uid() ist leer, zum Beispiel beim Einspielen
-- von Beispieldaten mit Datenbankrechten) greift die Sperre nicht.
-- =====================================================================

create function public.plan_nur_admin() returns trigger
language plpgsql security definer set search_path = public as $fn$
begin
  if auth.uid() is not null and not public.ist_admin() then
    raise exception 'Nur Admins aendern den Grundriss' using errcode = 'insufficient_privilege', hint = 'kistly:grundriss.nur_admin';
  end if;
  return coalesce(new, old);
end $fn$;

create trigger grundrisse_nur_admin before insert or update or delete on public.grundrisse
  for each row execute function public.plan_nur_admin();
create trigger raeume_nur_admin before insert or update or delete on public.raeume
  for each row execute function public.plan_nur_admin();
create trigger oeffnungen_nur_admin before insert or update or delete on public.oeffnungen
  for each row execute function public.plan_nur_admin();
create trigger objekte_nur_admin before insert or update or delete on public.objekte
  for each row execute function public.plan_nur_admin();
