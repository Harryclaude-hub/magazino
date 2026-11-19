begin;
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
do $t$
declare a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); sa1 uuid := gen_random_uuid(); sa2 uuid := gen_random_uuid(); sb1 uuid := gen_random_uuid(); r text := ''; n int;
begin
  insert into auth.users (id, email, instance_id, aud, role) values (a, 'a@example.invalid', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'), (b, 'b@example.invalid', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');
  insert into public.konto_freigaben (user_id, status) values (a, 'frei'), (b, 'frei') on conflict (user_id) do update set status='frei';
  insert into auth.sessions (id, user_id, user_agent, ip) values (sa1, a, 'Mozilla/5.0 (Windows NT 10.0) Chrome/120', '203.0.113.5'), (sa2, a, 'Mozilla/5.0 (iPhone) Safari', '198.51.100.7'), (sb1, b, 'Fremdgeraet', '192.0.2.1');
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated', 'session_id', sa1)::text, true);
  set local role authenticated;
  select count(*) into n from public.meine_sitzungen();
  r := r || 'A sieht ' || n || ' Geraete (erwartet 2), aktuell=' || (select count(*) from public.meine_sitzungen() where aktuell) || '; ';
  r := r || 'Fremdes Geraet sichtbar: ' || (select count(*) from public.meine_sitzungen() where geraet = 'Fremdgeraet') || ' (erwartet 0); ';
  perform public.sitzung_beenden(sb1);
  reset role;
  r := r || 'Fremde Sitzung nach Versuch noch da: ' || (select count(*) from auth.sessions where id = sb1) || ' (erwartet 1); ';
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated', 'session_id', sa1)::text, true);
  set local role authenticated;
  n := public.andere_sitzungen_beenden();
  reset role;
  r := r || 'andere beendet ' || n || ' (erwartet 1), eigene aktuelle noch da: ' || (select count(*) from auth.sessions where id = sa1) || ', fremdes Konto unberuehrt: ' || (select count(*) from auth.sessions where user_id = b) || '; ';
  set local role anon;
  begin perform public.meine_sitzungen(); r := r || 'FEHLER anonym'; exception when others then r := r || 'anonym abgelehnt ok'; end;
  reset role;
  raise exception 'PROBELAUF 0063: %', r;
end $t$;
rollback;
