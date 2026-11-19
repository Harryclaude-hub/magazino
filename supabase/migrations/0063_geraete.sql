-- =====================================================================
-- Magazino 0063_geraete (E109)
--
-- Im Profil sieht jeder, auf welchen Geraeten sein Konto angemeldet ist, und
-- kann einzelne oder alle anderen Geraete abmelden. Gelesen und beendet
-- werden nur die EIGENEN Sitzungen (user_id = auth.uid()); niemand sieht
-- oder beendet die Sitzungen eines anderen Kontos.
--
-- Ein beendetes Geraet kann sich nicht mehr erneuern; sein schon
-- ausgestellter Zugangstoken (hoechstens eine Stunde alt) laeuft noch bis
-- zum Ablauf, danach ist es abgemeldet. Die aktuelle Sitzung erkennt die
-- Funktion am Token (Eintrag session_id).
-- =====================================================================

create function public.meine_sitzungen() returns table (
  id uuid, angemeldet_seit timestamptz, zuletzt_aktiv timestamptz, geraet text, ip text, aktuell boolean)
language sql stable security definer set search_path = public, auth as $fn$
  select s.id, s.created_at, coalesce(s.refreshed_at, s.updated_at, s.created_at), s.user_agent, host(s.ip),
         (s.id::text = coalesce(auth.jwt() ->> 'session_id', ''))
    from auth.sessions s
   where s.user_id = auth.uid() and (s.not_after is null or s.not_after > now())
   order by 6 desc, 3 desc
$fn$;

create function public.sitzung_beenden(p_id uuid) returns void
language plpgsql security definer set search_path = public, auth as $fn$
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet' using errcode = 'insufficient_privilege'; end if;
  delete from auth.sessions where id = p_id and user_id = auth.uid();
  perform public.aktivitaet_schreiben(null, 'sitzung', 'Geraet abgemeldet');
end $fn$;

create function public.andere_sitzungen_beenden() returns int
language plpgsql security definer set search_path = public, auth as $fn$
declare n int;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet' using errcode = 'insufficient_privilege'; end if;
  delete from auth.sessions
   where user_id = auth.uid() and id::text <> coalesce(auth.jwt() ->> 'session_id', '');
  get diagnostics n = row_count;
  perform public.aktivitaet_schreiben(null, 'sitzung', n || ' andere Geraete abgemeldet');
  return n;
end $fn$;

revoke execute on function public.meine_sitzungen() from public, anon;
revoke execute on function public.sitzung_beenden(uuid) from public, anon;
revoke execute on function public.andere_sitzungen_beenden() from public, anon;
grant  execute on function public.meine_sitzungen() to authenticated;
grant  execute on function public.sitzung_beenden(uuid) to authenticated;
grant  execute on function public.andere_sitzungen_beenden() to authenticated;
