begin;
-- =====================================================================
-- Magazino 0064_kalender_abo (E111)
--
-- Kalender-Verbindung: jedes Konto kann einen geheimen Kalender-Link
-- erzeugen. Apple Kalender, Google Kalender und Outlook abonnieren ihn und
-- holen die offenen Rueckgabetermine selbst ab, ohne Anmeldung (der Link ist
-- das Geheimnis). Der Link ist widerrufbar: neu erzeugen oder trennen, dann
-- geht der alte nicht mehr.
--
--   kalender_abo           ein Zeichen je Konto, nur ueber Funktionen erreichbar
--   kalender_link()        eigenes Zeichen holen oder anlegen
--   kalender_erneuern()    neues Zeichen, das alte wird ungueltig
--   kalender_trennen()     Verbindung loeschen
--   kalender_feed(zeichen) offene Rueckgaben des Kontos (nur fuer die Edge
--                          Function "kalender", sie liest mit dem anon-Schluessel)
--
-- Das Zeichen sind zwei Zufalls-UUIDs ohne Striche (64 Zeichen). Der Feed gibt
-- nur Ding, Lager, Menge und Faelligkeit der EIGENEN offenen Ausleihen.
-- =====================================================================

create table public.kalender_abo (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  zeichen    text not null unique check (length(zeichen) = 64),
  created_at timestamptz not null default now()
);
alter table public.kalender_abo enable row level security;
revoke all on public.kalender_abo from public, anon, authenticated;

create function public.kalender_zeichen_neu() returns text
language sql volatile set search_path = public as $fn$
  select replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
$fn$;

create function public.kalender_link() returns text
language plpgsql security definer set search_path = public as $fn$
declare z text;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet' using errcode = 'insufficient_privilege'; end if;
  select zeichen into z from public.kalender_abo where user_id = auth.uid();
  if z is null then
    z := public.kalender_zeichen_neu();
    insert into public.kalender_abo (user_id, zeichen) values (auth.uid(), z);
  end if;
  return z;
end $fn$;

create function public.kalender_erneuern() returns text
language plpgsql security definer set search_path = public as $fn$
declare z text := public.kalender_zeichen_neu();
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet' using errcode = 'insufficient_privilege'; end if;
  insert into public.kalender_abo (user_id, zeichen) values (auth.uid(), z)
    on conflict (user_id) do update set zeichen = excluded.zeichen, created_at = now();
  return z;
end $fn$;

create function public.kalender_trennen() returns void
language plpgsql security definer set search_path = public as $fn$
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet' using errcode = 'insufficient_privilege'; end if;
  delete from public.kalender_abo where user_id = auth.uid();
end $fn$;

create function public.kalender_feed(p_zeichen text) returns table (
  id uuid, ding text, einheit text, menge numeric, lager text, faellig_am timestamptz)
language sql stable security definer set search_path = public as $fn$
  select a.id, b.name, b.einheit, a.menge, p.name, a.faellig_am
    from public.kalender_abo k
    join public.ausleihen a on a.user_id = k.user_id and a.zurueck_am is null
    join public.bestand b on b.id = a.bestand_id
    join public.projects p on p.id = a.project_id
    join public.project_members m on m.project_id = a.project_id and m.user_id = k.user_id
   where length(p_zeichen) = 64 and k.zeichen = p_zeichen
   order by a.faellig_am
   limit 500
$fn$;

revoke execute on function public.kalender_zeichen_neu() from public, anon, authenticated;
revoke execute on function public.kalender_link()      from public, anon;
revoke execute on function public.kalender_erneuern()  from public, anon;
revoke execute on function public.kalender_trennen()   from public, anon;
revoke execute on function public.kalender_feed(text)  from public;
grant  execute on function public.kalender_link()      to authenticated;
grant  execute on function public.kalender_erneuern()  to authenticated;
grant  execute on function public.kalender_trennen()   to authenticated;
grant  execute on function public.kalender_feed(text)  to anon, authenticated;

do $t$
declare a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); bl uuid := gen_random_uuid(); pr uuid := gen_random_uuid(); bd uuid := gen_random_uuid();
        za text; zb text; za2 text; r text := ''; n int;
begin
  insert into auth.users (id, email, instance_id, aud, role) values
    (a, 'a@example.invalid', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
    (b, 'b@example.invalid', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');
  insert into public.bl_projekte (id, name) values (bl, 'Probeland ' || left(bl::text, 6));
  insert into public.projects (id, name, owner_id, bl_projekt_id) values (pr, 'Probelager', a, bl);
  insert into public.project_members (project_id, user_id, role) values (pr, a, 'owner'), (pr, b, 'editor') on conflict do nothing;
  insert into public.bestand (id, project_id, name, einheit, menge, art) values (bd, pr, 'Bohrer', 'Stk', 5, 'ausleihe');
  insert into public.ausleihen (project_id, bestand_id, user_id, menge, faellig_am) values
    (pr, bd, a, 1, now() + interval '1 day'), (pr, bd, b, 1, now() + interval '2 day');
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  za := public.kalender_link();
  r := r || 'Zeichen A Laenge ' || length(za) || ' (erwartet 64), zweiter Aufruf gleich: ' || (public.kalender_link() = za) || '; ';
  begin perform * from public.kalender_abo; r := r || 'FEHLER Tabelle lesbar; ';
  exception when others then r := r || 'Tabelle direkt gesperrt ok; '; end;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  set local role authenticated; zb := public.kalender_link(); reset role;
  r := r || 'A und B verschieden: ' || (za <> zb) || '; ';
  set local role anon;
  select count(*) into n from public.kalender_feed(za);
  r := r || 'Feed A: ' || n || ' Termin (erwartet 1), nur eigener: ' || (select bool_and(ding = 'Bohrer') from public.kalender_feed(za)) || '; ';
  select count(*) into n from public.kalender_feed('x'); r := r || 'falsches Zeichen: ' || n || ' (erwartet 0); ';
  begin perform public.kalender_link(); r := r || 'FEHLER anonym link; ';
  exception when others then r := r || 'anonym link abgelehnt ok; '; end;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated; za2 := public.kalender_erneuern(); reset role;
  set local role anon;
  r := r || 'altes Zeichen nach Erneuern: ' || (select count(*) from public.kalender_feed(za)) || ' (erwartet 0), neues: ' || (select count(*) from public.kalender_feed(za2)) || ' (erwartet 1); ';
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated; perform public.kalender_trennen(); reset role;
  set local role anon; r := r || 'nach Trennen: ' || (select count(*) from public.kalender_feed(za2)) || ' (erwartet 0)'; reset role;
  raise exception 'PROBELAUF 0064: %', r;
end $t$;
rollback;
