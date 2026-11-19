begin;
-- =====================================================================
-- Magazino 0059_konto_status (E108)
--
-- Der Admin sieht je Person, wo ihr Konto steht:
--   erstellt        Konto angelegt, noch nie angemeldet
--   passwort_offen  angemeldet, hat das Startpasswort aber noch nicht geaendert
--                   (die Datenbank laesst sie bis dahin nichts nutzen, 0058)
--   aktiv           eigenes Passwort gesetzt, startklar
--   wartet          muss noch freigeschaltet werden (nur Konten ohne Startpasswort)
--   gesperrt        vom Admin gesperrt
-- Admins sind immer aktiv. Erweitert admin_nutzer_aktivitaet um die Spalte
-- konto_status; die Spalten davor bleiben gleich.
-- =====================================================================

drop function public.admin_nutzer_aktivitaet();

create function public.admin_nutzer_aktivitaet() returns table (
  user_id uuid, email text, name text, angelegt_am timestamptz, zuletzt_aktiv timestamptz,
  buchungen bigint, offene_ausleihen bigint, ueberfaellig bigint, drin_in text, ist_admin boolean, konto_status text)
language plpgsql stable security definer set search_path = public, auth as $fn$
begin
  if not public.ist_admin() then
    raise exception 'Nur Admins' using errcode = 'insufficient_privilege', hint = 'kistly:admin.kein_zugriff';
  end if;
  return query
  select u.id, u.email::text, coalesce(p.display_name, '')::text, u.created_at,
         greatest((select max(a.zeit) from public.aktivitaet a where a.user_id = u.id), u.last_sign_in_at),
         (select count(*) from public.bestand_buchungen b where b.user_id = u.id),
         (select count(*) from public.ausleihen l where l.user_id = u.id and l.zurueck_am is null),
         (select count(*) from public.ausleihen l where l.user_id = u.id and l.zurueck_am is null and l.faellig_am < now()),
         (select string_agg(pr.name, ', ') from public.lager_zugang z join public.projects pr on pr.id = z.project_id
           where z.user_id = u.id and z.raus_am is null),
         exists (select 1 from public.app_admins ad where ad.user_id = u.id),
         case
           when exists (select 1 from public.app_admins ad where ad.user_id = u.id) then 'aktiv'
           when f.status = 'gesperrt' then 'gesperrt'
           when f.start_hash is not null and u.encrypted_password = f.start_hash and u.last_sign_in_at is null then 'erstellt'
           when f.start_hash is not null and u.encrypted_password = f.start_hash then 'passwort_offen'
           when f.status is null or f.status = 'wartet' then 'wartet'
           else 'aktiv'
         end
    from auth.users u
    left join public.profiles p on p.id = u.id
    left join public.konto_freigaben f on f.user_id = u.id
   order by 5 desc nulls last;
end $fn$;

revoke execute on function public.admin_nutzer_aktivitaet() from public, anon;
grant  execute on function public.admin_nutzer_aktivitaet() to authenticated;
do $t$
declare v_admin uuid := '5fae3827-33eb-45be-9211-c665b3fad0b8'; v1 uuid := gen_random_uuid(); v2 uuid := gen_random_uuid(); b text := ''; r record;
begin
  insert into auth.users (id, email, instance_id, aud, role, encrypted_password) values
    (v1, 'neu@example.invalid', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'h1'),
    (v2, 'drin@example.invalid', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'h2');
  insert into public.konto_freigaben (user_id, status, start_hash) values (v1, 'frei', 'h1'), (v2, 'frei', 'h2') on conflict (user_id) do update set status = excluded.status, start_hash = excluded.start_hash;
  update auth.users set last_sign_in_at = now() where id = v2;
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  set local role authenticated;
  for r in select email, konto_status from public.admin_nutzer_aktivitaet() loop b := b || r.email || '=' || r.konto_status || '; '; end loop;
  reset role;
  update auth.users set encrypted_password = 'h2-neu' where id = v2;
  set local role authenticated;
  b := b || 'nach Aenderung drin=' || (select konto_status from public.admin_nutzer_aktivitaet() where email = 'drin@example.invalid');
  reset role;
  raise exception 'PROBELAUF 0059: %', b;
end $t$;
rollback;
