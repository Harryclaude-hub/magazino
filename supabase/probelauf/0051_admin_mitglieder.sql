begin;
-- =====================================================================
-- Magazino 0051_admin_mitglieder (E103, Stufe 2)
--
-- Admins legen Konten an (Edge Function konto-anlegen, nur sie benutzt den
-- Dienstschluessel, und nur zum Erzeugen des Kontos) und teilen sie danach
-- selbst auf Lager auf. Das Aufteilen laeuft ueber diese Funktion mit dem
-- Token des Admins, nicht ueber den Dienstschluessel: so prueft die
-- Datenbank bei jedem Schritt, dass wirklich ein Admin handelt.
--
-- Neue Admins werden ausserdem Besitzer aller Lager, sonst saehen sie
-- keines (Lager sieht nur, wer Mitglied ist).
-- =====================================================================

create function public.admin_mitglied_setzen(p_user uuid, p_project uuid, p_rolle text) returns void
language plpgsql security definer set search_path = public as $fn$
begin
  if not public.ist_admin() then
    raise exception 'Nur Admins' using errcode = 'insufficient_privilege', hint = 'kistly:admin.kein_zugriff';
  end if;
  if not exists (select 1 from auth.users where id = p_user) or not exists (select 1 from public.projects where id = p_project) then
    raise exception 'Konto oder Lager unbekannt' using errcode = 'no_data_found', hint = 'kistly:lager.unbekannt';
  end if;
  if p_rolle = 'keine' then
    delete from public.project_members where project_id = p_project and user_id = p_user;
    update public.lager_kategorien set zustaendig_id = null where project_id = p_project and zustaendig_id = p_user;
    perform public.aktivitaet_schreiben(p_project, 'admin', 'Zugang entzogen');
    return;
  end if;
  if p_rolle not in ('owner', 'editor', 'viewer') then
    raise exception 'Rolle ungueltig' using errcode = 'check_violation', hint = 'kistly:lager.rolle';
  end if;
  insert into public.project_members (project_id, user_id, role) values (p_project, p_user, p_rolle::public.member_role)
  on conflict (project_id, user_id) do update set role = excluded.role;
  perform public.aktivitaet_schreiben(p_project, 'admin', 'Zugang gesetzt: ' || p_rolle);
end $fn$;

create or replace function public.admin_admin_setzen(p_user uuid, p_admin boolean) returns void
language plpgsql security definer set search_path = public as $fn$
begin
  if not public.ist_admin() then
    raise exception 'Nur Admins' using errcode = 'insufficient_privilege', hint = 'kistly:admin.kein_zugriff';
  end if;
  if not exists (select 1 from auth.users where id = p_user) then
    raise exception 'Konto unbekannt' using errcode = 'no_data_found', hint = 'kistly:lager.unbekannt';
  end if;
  if p_admin then
    insert into public.app_admins (user_id) values (p_user) on conflict do nothing;
    insert into public.konto_freigaben (user_id, status, geaendert_von) values (p_user, 'frei', auth.uid())
      on conflict (user_id) do update set status = 'frei', geaendert_am = now(), geaendert_von = auth.uid();
    insert into public.project_members (project_id, user_id, role)
      select p.id, p_user, 'owner' from public.projects p
    on conflict (project_id, user_id) do update set role = 'owner';
  else
    if (select count(*) from public.app_admins) <= 1 then
      raise exception 'Der letzte Admin bleibt' using errcode = 'check_violation', hint = 'kistly:admin.letzter';
    end if;
    if p_user = auth.uid() then
      raise exception 'Sich selbst nicht entziehen' using errcode = 'check_violation', hint = 'kistly:admin.selbst';
    end if;
    delete from public.app_admins where user_id = p_user;
  end if;
  perform public.aktivitaet_schreiben(null, 'admin', case when p_admin then 'Admin ernannt' else 'Admin entzogen' end);
end $fn$;

revoke execute on function public.admin_mitglied_setzen(uuid, uuid, text) from public, anon;
grant  execute on function public.admin_mitglied_setzen(uuid, uuid, text) to authenticated;
do $t$
declare v_admin uuid := '5fae3827-33eb-45be-9211-c665b3fad0b8'; v_neu uuid := gen_random_uuid(); p uuid; b text := ''; n int;
begin
  insert into auth.users (id, email, instance_id, aud, role) values (v_neu, 'probe@example.invalid', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select id into p from public.projects where owner_id = v_admin limit 1;
  perform public.admin_mitglied_setzen(v_neu, p, 'editor');
  select count(*) into n from public.project_members where project_id = p and user_id = v_neu and role = 'editor';
  b := b || 'mitglied editor ' || n || '; ';
  perform public.admin_mitglied_setzen(v_neu, p, 'keine');
  select count(*) into n from public.project_members where project_id = p and user_id = v_neu;
  b := b || 'entzogen ' || n || '; ';
  perform public.admin_admin_setzen(v_neu, true);
  b := b || 'neuer admin, Lager als owner ' || (select count(*) from public.project_members where user_id = v_neu and role = 'owner') || '; ';
  perform public.admin_admin_setzen(v_neu, false);
  begin perform public.admin_admin_setzen(v_admin, false); b := b || 'FEHLER letzter admin entziehbar; '; exception when others then b := b || 'selbst entziehen abgelehnt ok; '; end;
  reset role;
  raise exception 'PROBELAUF 0051: %', b;
end $t$;
rollback;
