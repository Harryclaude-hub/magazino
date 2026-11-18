begin;
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
do $t$
declare v_admin uuid := '5fae3827-33eb-45be-9211-c665b3fad0b8'; v_neu uuid := gen_random_uuid(); b text := ''; p public.projects;
begin
  insert into auth.users (id, email, instance_id, aud, role) values (v_neu, 'probe2@example.invalid', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');
  insert into public.konto_freigaben (user_id, status) values (v_neu, 'frei') on conflict (user_id) do update set status='frei';
  perform set_config('request.jwt.claims', json_build_object('sub', v_neu, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin perform public.create_project('Schwarz', null, false); b := b || 'FEHLER: Nutzer legt Lager an; '; exception when others then b := b || 'Nutzer create_project abgelehnt ok; '; end;
  begin insert into public.projects (name, owner_id) values ('Schwarz2', v_neu); b := b || 'FEHLER: direkter Insert; '; exception when others then b := b || 'Nutzer direkter Insert abgelehnt ok; '; end;
  begin perform public.lager_anlegen('X'); b := b || 'FEHLER: lager_anlegen als Nutzer; '; exception when others then b := b || 'Nutzer lager_anlegen abgelehnt ok; '; end;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  set local role authenticated;
  p := public.lager_anlegen('Admin-Lager');
  b := b || 'Admin lager_anlegen ok; ';
  reset role;
  raise exception 'PROBELAUF 0052: %', b;
end $t$;
rollback;
