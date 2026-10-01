-- 0041: Verlauf eines Umzugs loeschen (E80).
--
-- Karam will "Zuletzt passiert" leeren koennen. item_events hatte nur
-- Lesen und Anlegen. Loeschen darf nur der Besitzer des Umzugs: der
-- Verlauf gehoert allen Mitgliedern, und Helfer sollen ihn nicht
-- wegwischen koennen. Geloescht wird ueber die App alles eines Umzugs
-- auf einmal (auch der Verlauf der einzelnen Kisten, er steht in
-- derselben Tabelle).

create policy events_delete on public.item_events
  for delete to authenticated
  using (public.is_owner(project_id));
