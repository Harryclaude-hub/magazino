-- 0035: Admin-Portal (E47).
--
-- Wer Admin ist, steht in app_admins (nur die user_id). Die Tabelle hat
-- Zeilensicherheit ohne jede Regel: niemand liest oder schreibt sie ueber
-- die App, nur die beiden Funktionen unten (security definer). Welche
-- Konten Admin sind, steht bewusst NICHT in diesem oeffentlichen Repo; die
-- Zeile wird von Hand in der Datenbank gesetzt.
--
-- ist_admin(): true fuer Admins, sonst false (fuer den Menuepunkt).
-- admin_uebersicht(): alle Nutzer mit ihren Umzuegen und Zahlen. Fuer
-- alle anderen lehnt sie ab (kistly:admin.kein_zugriff). Nur lesen.

create table public.app_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.app_admins enable row level security;

create function public.ist_admin() returns boolean
language sql stable security definer set search_path = public as $fn$
  select exists (select 1 from public.app_admins a where a.user_id = auth.uid())
$fn$;

create function public.admin_uebersicht() returns jsonb
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

revoke all on table public.app_admins from public, anon, authenticated;
revoke execute on function public.ist_admin() from public, anon;
grant  execute on function public.ist_admin() to authenticated;
revoke execute on function public.admin_uebersicht() from public, anon;
grant  execute on function public.admin_uebersicht() to authenticated;
