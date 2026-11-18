begin;
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
do $t$
declare v_admin uuid := '5fae3827-33eb-45be-9211-c665b3fad0b8'; v_neu uuid := gen_random_uuid(); b text := ''; r uuid; g uuid; p uuid; blz uuid;
begin
  insert into auth.users (id, email, instance_id, aud, role) values (v_neu, 'probe4@example.invalid', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');
  insert into public.konto_freigaben (user_id, status) values (v_neu, 'frei') on conflict (user_id) do update set status = 'frei';
  select id into p from public.projects order by created_at limit 1;
  insert into public.project_members (project_id, user_id, role) values (p, v_neu, 'editor');
  select id into r from public.raeume where project_id = p limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', v_neu, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin insert into public.objekte (raum_id, project_id, art, name, x, y, breite_cm, tiefe_cm, hoehe_cm, brett_cm, spalten) values (r, p, 'regal', 'Boese', 10, 10, 100, 40, 200, array[0, 50], 1); b := b || 'FEHLER: Bearbeiter zeichnet; ';
  exception when others then b := b || 'Bearbeiter zeichnet: abgelehnt ok; '; end;
  begin delete from public.objekte where project_id = p; b := b || 'Bearbeiter loescht: ' || 'durchgelassen? '; exception when others then b := b || 'Bearbeiter loescht abgelehnt ok; '; end;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.objekte (raum_id, project_id, art, name, x, y, breite_cm, tiefe_cm, hoehe_cm, brett_cm, spalten) values (r, p, 'regal', 'Gut', 10, 10, 100, 40, 200, array[0, 50], 1);
  b := b || 'Admin zeichnet ok; ';
  reset role;
  raise exception 'PROBELAUF 0055: %', b;
end $t$;
rollback;
