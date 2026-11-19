-- =====================================================================
-- Magazino 0057_sitzungen_und_hinweise (E107)
--
-- 1. admin_sitzungen_beenden: nach einem neuen Startpasswort werden alle
--    offenen Sitzungen der Person beendet (auth.sessions, die Refresh-Token
--    daran fallen mit). Nur Admins, und nie fuer ein Admin-Konto.
-- 2. meine_hinweise: was fuer MICH offen ist, fuer die Glocke im Header:
--    eigene ueberfaellige und bald faellige Ausleihen, knapper oder leerer
--    Bestand in meinen Lagern. Nur Zahlen je Lager, keine fremden Daten.
-- =====================================================================

create function public.admin_sitzungen_beenden(p_user uuid) returns int
language plpgsql security definer set search_path = public, auth as $fn$
declare n int;
begin
  if not public.ist_admin() then
    raise exception 'Nur Admins' using errcode = 'insufficient_privilege', hint = 'kistly:admin.kein_zugriff';
  end if;
  if exists (select 1 from public.app_admins where user_id = p_user) then
    raise exception 'Ein Admin-Konto bleibt unberuehrt' using errcode = 'check_violation', hint = 'kistly:admin.letzter';
  end if;
  delete from auth.sessions where user_id = p_user;
  get diagnostics n = row_count;
  perform public.aktivitaet_schreiben(null, 'admin', 'Sitzungen beendet (neues Startpasswort)');
  return n;
end $fn$;

create function public.meine_hinweise() returns table (project_id uuid, lager text, art text, anzahl bigint)
language sql stable security definer set search_path = public as $fn$
  select p.id, p.name, 'ueberfaellig'::text, count(*)
    from public.ausleihen a join public.projects p on p.id = a.project_id
   where a.user_id = auth.uid() and a.zurueck_am is null and a.faellig_am < now() and public.is_member(p.id)
   group by p.id, p.name
  union all
  select p.id, p.name, 'bald'::text, count(*)
    from public.ausleihen a join public.projects p on p.id = a.project_id
   where a.user_id = auth.uid() and a.zurueck_am is null and a.faellig_am >= now() and a.faellig_am < now() + interval '24 hours' and public.is_member(p.id)
   group by p.id, p.name
  union all
  select p.id, p.name, 'knapp'::text, count(*)
    from public.bestand b join public.projects p on p.id = b.project_id
   where b.knapp_seit is not null and public.is_member(p.id)
   group by p.id, p.name
$fn$;

revoke execute on function public.admin_sitzungen_beenden(uuid) from public, anon;
grant  execute on function public.admin_sitzungen_beenden(uuid) to authenticated;
revoke execute on function public.meine_hinweise() from public, anon;
grant  execute on function public.meine_hinweise() to authenticated;
