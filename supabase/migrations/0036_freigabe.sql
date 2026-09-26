-- 0036: Konten freischalten, sperren, loeschen (E49).
--
-- Jedes neue Konto wartet, bis ein Admin es freischaltet. Bis dahin (und
-- wenn es gesperrt ist) kann es sich anmelden, sieht aber nur die
-- Warte-Seite: die Datenbank selbst laesst es nichts lesen oder schreiben.
-- Erzwungen wird das an den Stellen, ueber die fast alle Regeln laufen
-- (is_member, is_editor, is_owner, shares_project) und beim Anlegen oder
-- Beitreten eines Umzugs. Admins (app_admins, 0035) gelten immer als frei.
--
-- Bestehende Konten gelten beim Einfuehren als frei (sie nutzen die App
-- schon); der Admin kann sie sperren.

create table public.konto_freigaben (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  status       text not null default 'wartet' check (status in ('wartet', 'frei', 'gesperrt')),
  geaendert_am timestamptz not null default now(),
  geaendert_von uuid references auth.users(id) on delete set null
);
alter table public.konto_freigaben enable row level security;
-- Jeder sieht nur seine eigene Zeile; schreiben nur die Funktionen unten.
create policy konto_freigaben_select on public.konto_freigaben
  for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on table public.konto_freigaben from public, anon, authenticated;

insert into public.konto_freigaben (user_id, status)
select id, 'frei' from auth.users
on conflict (user_id) do nothing;

-- ------------------------------------------------------------- Pruefungen

create function public.ist_freigegeben() returns boolean
language sql stable security definer set search_path = public as $fn$
  select auth.uid() is not null and (
    exists (select 1 from public.app_admins a where a.user_id = auth.uid())
    or exists (select 1 from public.konto_freigaben f where f.user_id = auth.uid() and f.status = 'frei'))
$fn$;

-- Fuer die App: 'frei', 'wartet' oder 'gesperrt'.
create function public.meine_freigabe() returns text
language sql stable security definer set search_path = public as $fn$
  select case
    when auth.uid() is null then 'wartet'
    when exists (select 1 from public.app_admins a where a.user_id = auth.uid()) then 'frei'
    else coalesce((select f.status from public.konto_freigaben f where f.user_id = auth.uid()), 'wartet')
  end
$fn$;

create or replace function public.is_member(p uuid) returns boolean
language sql stable security definer set search_path = public as $fn$
  select public.ist_freigegeben() and exists (
    select 1 from public.project_members m
    where m.project_id = p and m.user_id = auth.uid()
  );
$fn$;

create or replace function public.is_editor(p uuid) returns boolean
language sql stable security definer set search_path = public as $fn$
  select public.ist_freigegeben() and exists (
    select 1 from public.project_members m
    where m.project_id = p and m.user_id = auth.uid()
      and m.role in ('owner','editor')
  );
$fn$;

create or replace function public.is_owner(p uuid) returns boolean
language sql stable security definer set search_path = public as $fn$
  select public.ist_freigegeben() and exists (
    select 1 from public.project_members m
    where m.project_id = p and m.user_id = auth.uid() and m.role = 'owner'
  );
$fn$;

create or replace function public.shares_project(u uuid) returns boolean
language sql stable security definer set search_path = public as $fn$
  select public.ist_freigegeben() and exists (
    select 1
    from public.project_members a
    join public.project_members b on a.project_id = b.project_id
    where a.user_id = auth.uid() and b.user_id = u
  );
$fn$;

alter policy projects_insert on public.projects
  with check (owner_id = auth.uid() and public.ist_freigegeben());

create or replace function public.create_project(p_name text, p_note text default null::text, p_with_defaults boolean default true)
returns public.projects language plpgsql security definer set search_path = public as $fn$
declare
  v_project public.projects;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Nicht angemeldet' using errcode = 'insufficient_privilege';
  end if;
  if not public.ist_freigegeben() then
    raise exception 'Konto nicht freigeschaltet' using errcode = 'insufficient_privilege', hint = 'kistly:konto.nicht_frei';
  end if;
  if length(btrim(coalesce(p_name,''))) = 0 then
    raise exception 'Projektname fehlt' using errcode = 'check_violation';
  end if;

  insert into public.projects (name, note, owner_id)
  values (btrim(p_name), nullif(btrim(coalesce(p_note,'')),''), v_uid)
  returning * into v_project;

  insert into public.project_members (project_id, user_id, role)
  values (v_project.id, v_uid, 'owner');

  if p_with_defaults then
    insert into public.tags (project_id, kind, name, short, color, sort) values
      (v_project.id, 'room', 'Wohnzimmer',    'W',  '#2563EB', 10),
      (v_project.id, 'room', 'Küche',        'K',  '#F97316', 20),
      (v_project.id, 'room', 'Schlafzimmer',  'SZ', '#7C3AED', 30),
      (v_project.id, 'room', 'Kinderzimmer',  'KZ', '#0EA5E9', 40),
      (v_project.id, 'room', 'Bad',           'B',  '#14B8A6', 50),
      (v_project.id, 'room', 'Flur',          'FL', '#64748B', 60),
      (v_project.id, 'room', 'Keller',        'KE', '#A16207', 70);
  end if;

  return v_project;
end $fn$;

create or replace function public.join_project(p_code text)
returns public.projects language plpgsql security definer set search_path = public as $fn$
declare
  v_invite public.project_invites;
  v_project public.projects;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Nicht angemeldet' using errcode = 'insufficient_privilege';
  end if;
  if not public.ist_freigegeben() then
    raise exception 'Konto nicht freigeschaltet' using errcode = 'insufficient_privilege', hint = 'kistly:konto.nicht_frei';
  end if;

  select * into v_invite from public.project_invites
  where upper(code) = upper(btrim(p_code)) for update;

  if v_invite.id is null then
    raise exception 'Code unbekannt' using errcode = 'no_data_found';
  end if;
  if not v_invite.active then
    raise exception 'Code ist deaktiviert' using errcode = 'check_violation';
  end if;
  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    raise exception 'Code ist abgelaufen' using errcode = 'check_violation';
  end if;
  if v_invite.max_uses is not null and v_invite.uses >= v_invite.max_uses then
    raise exception 'Code ist aufgebraucht' using errcode = 'check_violation';
  end if;

  insert into public.project_members (project_id, user_id, role)
  values (v_invite.project_id, v_uid, v_invite.role)
  on conflict (project_id, user_id) do nothing;

  if found then
    update public.project_invites set uses = uses + 1 where id = v_invite.id;
  end if;

  select * into v_project from public.projects where id = v_invite.project_id;
  return v_project;
end $fn$;

-- Neue Konten warten.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $fn$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    nullif(btrim(coalesce(new.raw_user_meta_data->>'display_name', '')), ''),
    new.email
  )
  on conflict (id) do nothing;

  insert into public.notification_prefs (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.konto_freigaben (user_id, status)
  values (new.id, 'wartet')
  on conflict (user_id) do nothing;

  return new;
end $fn$;

-- Beim Loeschen eines Kontos setzt der Admin einen neuen Eigentuemer ein.
create or replace function public.guard_member_role() returns trigger
language plpgsql security definer set search_path = public as $fn$
begin
  if new.role is distinct from old.role and not public.is_owner(new.project_id) and not public.ist_admin() then
    raise exception 'Nur der Besitzer darf Rollen ändern' using errcode = 'insufficient_privilege';
  end if;
  return new;
end $fn$;

-- ------------------------------------------------------------------ Admin

create function public.admin_pruefen(p_user uuid) returns void
language plpgsql stable security definer set search_path = public as $fn$
begin
  if not public.ist_admin() then
    raise exception 'Kein Zugriff' using errcode = '42501', hint = 'kistly:admin.kein_zugriff';
  end if;
  if p_user = auth.uid() then
    raise exception 'Nicht bei sich selbst' using errcode = '42501', hint = 'kistly:admin.nicht_selbst';
  end if;
  if exists (select 1 from public.app_admins a where a.user_id = p_user) then
    raise exception 'Nicht bei einem Admin' using errcode = '42501', hint = 'kistly:admin.nicht_admin';
  end if;
  if not exists (select 1 from auth.users u where u.id = p_user) then
    raise exception 'Konto unbekannt' using errcode = 'no_data_found', hint = 'kistly:admin.unbekannt';
  end if;
end $fn$;

-- Freischalten ('frei'), sperren ('gesperrt') oder zuruecksetzen ('wartet').
create function public.admin_freigabe_setzen(p_user uuid, p_status text) returns text
language plpgsql security definer set search_path = public as $fn$
begin
  perform public.admin_pruefen(p_user);
  if p_status not in ('wartet', 'frei', 'gesperrt') then
    raise exception 'Status unbekannt' using errcode = 'check_violation';
  end if;
  insert into public.konto_freigaben (user_id, status, geaendert_am, geaendert_von)
  values (p_user, p_status, now(), auth.uid())
  on conflict (user_id) do update
    set status = excluded.status, geaendert_am = excluded.geaendert_am, geaendert_von = excluded.geaendert_von;
  return p_status;
end $fn$;

-- Konto endgueltig loeschen. Umzuege mit weiteren Mitgliedern bekommen
-- einen neuen Eigentuemer (dienstaeltestes Mitglied, Bearbeiter zuerst);
-- Umzuege, in denen die Person allein war, verschwinden mit allem Inhalt.
-- Gibt zurueck, wie viele Umzuege uebergeben und wie viele geloescht
-- wurden. Fotos im Speicher bleiben liegen (nur die Eintraege gehen).
create function public.admin_konto_loeschen(p_user uuid) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare
  r record;
  v_neu uuid;
  v_uebergeben int := 0;
  v_geloescht int := 0;
begin
  perform public.admin_pruefen(p_user);

  for r in
    select p.id from public.projects p
     where p.owner_id = p_user
        or exists (select 1 from public.project_members m where m.project_id = p.id and m.user_id = p_user and m.role = 'owner')
  loop
    select m.user_id into v_neu
      from public.project_members m
     where m.project_id = r.id and m.user_id <> p_user
     order by case m.role when 'owner' then 0 when 'editor' then 1 else 2 end, m.created_at
     limit 1;
    if v_neu is null then
      delete from public.projects where id = r.id;
      v_geloescht := v_geloescht + 1;
    else
      update public.project_members set role = 'owner' where project_id = r.id and user_id = v_neu and role <> 'owner';
      update public.projects set owner_id = v_neu where id = r.id and owner_id = p_user;
      v_uebergeben := v_uebergeben + 1;
    end if;
  end loop;

  delete from auth.users where id = p_user;
  return jsonb_build_object('uebergeben', v_uebergeben, 'geloescht', v_geloescht);
end $fn$;

-- Wie viele Konten warten? Fuer die Zahl am Menuepunkt; 0 fuer Nicht-Admins.
create function public.admin_wartende() returns int
language sql stable security definer set search_path = public as $fn$
  select case when public.ist_admin() then (
    select count(*)::int from auth.users u
     where not exists (select 1 from public.app_admins a where a.user_id = u.id)
       and coalesce((select f.status from public.konto_freigaben f where f.user_id = u.id), 'wartet') = 'wartet'
  ) else 0 end
$fn$;

-- Die Uebersicht bekommt den Status jedes Kontos dazu.
create or replace function public.admin_uebersicht() returns jsonb
language plpgsql stable security definer set search_path = public as $fn$
begin
  if not public.ist_admin() then
    raise exception 'Kein Zugriff' using errcode = '42501', hint = 'kistly:admin.kein_zugriff';
  end if;
  return jsonb_build_object(
    'nutzer', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', u.id,
               'email', u.email,
               'name', p.display_name,
               'erstellt', u.created_at,
               'zuletzt', u.last_sign_in_at,
               'admin', exists (select 1 from public.app_admins a where a.user_id = u.id),
               'freigabe', case
                 when exists (select 1 from public.app_admins a where a.user_id = u.id) then 'frei'
                 else coalesce((select f.status from public.konto_freigaben f where f.user_id = u.id), 'wartet') end,
               'umzuege', coalesce((
                 select jsonb_agg(jsonb_build_object(
                          'id', pr.id,
                          'name', pr.name,
                          'rolle', m.role,
                          'eigentuemer', pr.owner_id = u.id,
                          'umzugstag', pr.move_date,
                          'archiviert', pr.archived,
                          'erstellt', pr.created_at,
                          'kisten', (select count(*) from public.items i where i.project_id = pr.id),
                          'angekommen', (select count(*) from public.items i where i.project_id = pr.id and i.status = 'arrived'),
                          'grundrisse', (select count(*) from public.grundrisse g where g.project_id = pr.id),
                          'raeume', (select count(*) from public.raeume r where r.project_id = pr.id),
                          'mitglieder', (select count(*) from public.project_members x where x.project_id = pr.id))
                        order by pr.created_at desc)
                   from public.project_members m
                   join public.projects pr on pr.id = m.project_id
                  where m.user_id = u.id), '[]'::jsonb))
             order by u.created_at desc)
        from auth.users u
        left join public.profiles p on p.id = u.id), '[]'::jsonb),
    'umzuege', (select count(*) from public.projects),
    'kisten', (select count(*) from public.items),
    'grundrisse', (select count(*) from public.grundrisse));
end $fn$;

revoke execute on function public.ist_freigegeben() from public, anon;
grant  execute on function public.ist_freigegeben() to authenticated;
revoke execute on function public.meine_freigabe() from public, anon;
grant  execute on function public.meine_freigabe() to authenticated;
revoke execute on function public.admin_pruefen(uuid) from public, anon, authenticated;
revoke execute on function public.admin_freigabe_setzen(uuid, text) from public, anon;
grant  execute on function public.admin_freigabe_setzen(uuid, text) to authenticated;
revoke execute on function public.admin_konto_loeschen(uuid) from public, anon;
grant  execute on function public.admin_konto_loeschen(uuid) to authenticated;
revoke execute on function public.admin_wartende() from public, anon;
grant  execute on function public.admin_wartende() to authenticated;
