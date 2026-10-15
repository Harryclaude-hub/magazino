-- Probelauf 0049 (Mitgliedschaften, Einladungscodes, Eigentuemer).
--
-- Fertig zum Ausfuehren, nichts mehr einzusetzen. Laeuft erst nach Karams
-- "stell live" im Chat, vom Laptop aus:
--   npx.cmd --yes supabase@2.120.0 db query --linked --project-ref vqpirkgvclfsduklnnzv -f supabase/probelauf/0049_mitglieder_und_einladungen_absichern.sql
-- (oder den ganzen Text in den SQL-Editor des Kistly-Projekts).
--
-- Aufbau: begin; dann die Migration 0049 unveraendert (Teil A), dann der
-- Pruefblock (Teile B bis E), dann rollback;. Der Pruefblock endet IMMER
-- mit ERROR "PROBELAUF 0049 ...": damit ist die ganze Transaktion
-- abgebrochen, nichts bleibt stehen, weder die Migration noch der
-- Testumzug noch die voruebergehende Freischaltung der beiden Konten. Das
-- rollback; am Ende raeumt zusaetzlich auf, falls ein Werkzeug weiterlaeuft.
--
-- Der Bericht steht in der Fehlermeldung. Jede Zeile soll mit "ok" enden;
-- steht irgendwo FEHLER: 0049 nicht anwenden.
--
-- Es werden keine Konten angelegt; der Lauf nimmt das aelteste Konto als
-- Besitzer und ein zweites, das kein Admin ist.
--
-- Teil A muss Wort fuer Wort gleich der Migration sein. Geprueft am
-- 15.10.2026 in PGlite (Postgres 17 im Speicher) mit allen Migrationen 0001
-- bis 0048 und nachgebautem auth/storage/realtime, dazu 0049 zweimal
-- hintereinander. Gegen das echte Projekt noch NICHT gelaufen.

begin;

-- ===== A. Migration 0049, unveraendert =====
-- 0049: Mitgliedschaften, Einladungscodes und Eigentuemer absichern
-- (Befunde KI-02, KI-09, KI-10 aus der Pruefung vom 09.10.2026).
--
-- NOCH NICHT EINGESPIELT. Erst nach Karams "stell live" im Chat.
--
-- Vorher der Probelauf (Karams stehende Regel), er enthaelt diese Datei:
--   npx.cmd --yes supabase@2.120.0 db query --linked --project-ref vqpirkgvclfsduklnnzv -f supabase/probelauf/0049_mitglieder_und_einladungen_absichern.sql
-- Er endet immer mit ERROR "PROBELAUF 0049 ...", nichts bleibt stehen.
-- Steht im Bericht eine Zeile mit FEHLER: nicht anwenden.
-- Anwenden:
--   npx.cmd --yes supabase@2.120.0 db query --linked --project-ref vqpirkgvclfsduklnnzv -f supabase/migrations/0049_mitglieder_und_einladungen_absichern.sql
-- (oder im SQL-Editor zwischen begin; und commit;). Bricht sie mittendrin
-- ab, einfach noch einmal ausfuehren, siehe unten.
--
-- Diese Datei loescht keine Zeile, keine Spalte und keine Regel. Sie legt
-- zwei Trigger und eine Pruefung an und schaerft zwei bestehende Regeln mit
-- alter policy.
--
-- Ein zweiter Lauf schlaegt nicht fehl: Funktionen mit create or replace
-- function, Trigger mit create or replace trigger (ab Postgres 14), Regeln
-- mit alter policy, Rechte mit grant und revoke.
--
-- 1. KI-02: Eine Mitgliedschaft wandert nicht.
--    members_update (0004) laesst jeden seine eigene Zeile aendern, gedacht
--    fuer den Lesestand (last_read_at). Damit liess sich aber auch
--    project_id auf einen fremden Umzug setzen: man war dort Mitglied, ganz
--    ohne Einladung (die Rolle blieb gleich, guard_member_role griff also
--    nicht). Neu: members_guard_keys lehnt jede Aenderung von project_id
--    oder user_id ab, fuer alle (kistly:mitglied.fest). Wer in einen anderen
--    Umzug soll, wird dort neu eingetragen (join_project, members_insert).
--
-- 2. KI-09: Einladungscodes.
--    Bisher sah jedes Mitglied, auch "Nur lesen", alle Codes, und jeder
--    Bearbeiter durfte Codes mit jeder Rolle anlegen oder umstellen, auch
--    'owner': mit einem zweiten Konto eingeloest, war er Besitzer.
--    Neu, ueber die Pruefung einladung_erlaubt(Umzug, Rolle):
--    - ein Besitzer darf Codes jeder Rolle,
--    - ein Bearbeiter nur Codes fuer 'editor' und 'viewer',
--    - "Nur lesen" und Fremde gar nichts.
--    Das gilt fuer Lesen, Anlegen, Aendern und Loeschen, fuer die alte und
--    die neue Zeile. Codes lesen also nur Bearbeiter und Besitzer, und einen
--    Besitzer-Code sieht, legt an oder schaltet ab nur ein Besitzer.
--    join_project (security definer) ist davon nicht betroffen.
--
-- 3. KI-10: projects.owner_id aendert nur ein Besitzer des Umzugs oder ein
--    Admin (ist_admin, 0035). Bisher durfte jeder Bearbeiter
--    (projects_update: is_editor) owner_id auf ein beliebiges Konto setzen.
--    owner_id haengt mit on delete cascade an auth.users: ein an ein
--    Wegwerfkonto gehaengter Umzug verschwaende mit dessen Loeschung.
--    admin_konto_loeschen (0036) laeuft als Admin weiter. Ohne angemeldeten
--    Nutzer (auth.uid() ist null: SQL-Editor, Dienste) greift die Sperre
--    nicht; ueber die API kommt so niemand an projects, deren Regeln gelten
--    nur fuer authenticated.
--
-- Neue Funktionen mit set search_path = '' und voll ausgeschriebenen Namen.
-- Funktionskoerper nur mit $fn$, keine eigenen do-Bloecke, damit der
-- Probelauf diesen Text unveraendert einsetzen kann.

-- --------------------------------------------- 1. Mitgliedschaft bleibt fest

create or replace function public.guard_member_keys()
returns trigger language plpgsql set search_path = '' as $fn$
begin
  if new.project_id is distinct from old.project_id
     or new.user_id is distinct from old.user_id then
    raise exception 'Eine Mitgliedschaft wechselt weder Umzug noch Person'
      using errcode = 'insufficient_privilege', hint = 'kistly:mitglied.fest';
  end if;
  return new;
end $fn$;

create or replace trigger members_guard_keys before update on public.project_members
  for each row execute function public.guard_member_keys();

-- ------------------------------------------------------- 2. Einladungscodes

-- Darf der Angemeldete in Umzug p mit Codes der Rolle r umgehen?
-- security definer wie is_editor: liest project_members ohne deren Regeln
-- (sonst Rekursion). Die Rolle nie ueber der eigenen.
create or replace function public.einladung_erlaubt(p uuid, r public.member_role)
returns boolean language sql stable security definer set search_path = '' as $fn$
  select public.ist_freigegeben() and exists (
    select 1
      from public.project_members m
     where m.project_id = p
       and m.user_id = auth.uid()
       and (m.role = 'owner' or (m.role = 'editor' and r in ('editor', 'viewer')))
  );
$fn$;

-- In Regeln benutzt, darum fuer angemeldete Nutzer ausfuehrbar (0006).
revoke execute on function public.einladung_erlaubt(uuid, public.member_role) from public, anon;
grant  execute on function public.einladung_erlaubt(uuid, public.member_role) to authenticated;

-- Lesen: bisher is_member.
alter policy invites_select on public.project_invites
  using (public.einladung_erlaubt(project_id, role));

-- Anlegen, aendern, loeschen (for all): bisher is_editor.
alter policy invites_write on public.project_invites
  using (public.einladung_erlaubt(project_id, role))
  with check (public.einladung_erlaubt(project_id, role));

-- ----------------------------------------------------- 3. Eigentuemer fest

create or replace function public.guard_project_owner()
returns trigger language plpgsql set search_path = '' as $fn$
begin
  if new.owner_id is distinct from old.owner_id
     and auth.uid() is not null
     and not public.is_owner(old.id)
     and not public.ist_admin() then
    raise exception 'Den Eigentuemer eines Umzugs aendert nur ein Besitzer'
      using errcode = 'insufficient_privilege', hint = 'kistly:umzug.eigentuemer_nur_besitzer';
  end if;
  return new;
end $fn$;

create or replace trigger projects_guard_owner before update on public.projects
  for each row execute function public.guard_project_owner();

-- Trigger-Funktionen brauchen kein EXECUTE (0006).
revoke execute on function public.guard_member_keys() from public, anon, authenticated;
revoke execute on function public.guard_project_owner() from public, anon, authenticated;

-- ===== Ende Teil A =====

do $probe$
declare
  v_bericht text := '';
  v_a uuid;            -- Besitzer des Testumzugs
  v_b uuid;            -- erst Bearbeiter, dann Nur lesen
  v_p uuid;            -- Testumzug
  v_q uuid;            -- zweiter Testumzug, b ist dort nicht Mitglied
  v_code_owner text := 'P49O' || upper(substr(md5(random()::text), 1, 8));
  v_code_editor text := 'P49E' || upper(substr(md5(random()::text), 1, 8));
  v_n int;
  v_hint text;
begin
  -- ===== B. Testdaten als postgres (Zeilen-Sicherheit greift hier nicht) =====
  select id into v_a from auth.users order by created_at limit 1;
  select u.id into v_b
    from auth.users u
   where u.id <> v_a
     and not exists (select 1 from public.app_admins x where x.user_id = u.id)
   order by u.created_at
   limit 1;
  if v_a is null or v_b is null then
    raise exception 'PROBELAUF 0049 abgebrochen: es braucht zwei Konten, das zweite ohne Admin';
  end if;

  -- Beide nur fuer diesen Lauf freischalten (wird zurueckgerollt).
  insert into public.konto_freigaben (user_id, status) values (v_a, 'frei'), (v_b, 'frei')
    on conflict (user_id) do update set status = 'frei';

  insert into public.projects (name, owner_id) values ('Probelauf 0049', v_a) returning id into v_p;
  insert into public.project_members (project_id, user_id, role) values (v_p, v_a, 'owner'), (v_p, v_b, 'editor');
  insert into public.projects (name, owner_id) values ('Probelauf 0049 fremd', v_a) returning id into v_q;
  insert into public.project_members (project_id, user_id, role) values (v_q, v_a, 'owner');
  insert into public.project_invites (project_id, code, role, created_by) values
    (v_p, v_code_owner, 'owner', v_a),
    (v_p, v_code_editor, 'editor', v_a);

  -- ===== C. Als b (Bearbeiter) =====
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  -- KI-02: eigene Mitgliedschaft in einen fremden Umzug schieben
  begin
    update public.project_members set project_id = v_q where project_id = v_p and user_id = v_b;
    v_bericht := v_bericht || E'\nFEHLER KI-02: Mitgliedschaft liess sich in einen fremden Umzug schieben';
  exception when insufficient_privilege then
    get stacked diagnostics v_hint = pg_exception_hint;
    v_bericht := v_bericht || E'\nKI-02 Umzug wechseln abgelehnt (' || coalesce(v_hint, '?') || '): '
      || case when v_hint = 'kistly:mitglied.fest' then 'ok' else 'FEHLER falscher Grund' end;
  end;

  -- Lesestand bleibt erlaubt
  update public.project_members set last_read_at = now() where project_id = v_p and user_id = v_b;
  get diagnostics v_n = row_count;
  v_bericht := v_bericht || E'\nLesestand setzen: ' || case when v_n = 1 then 'ok' else 'FEHLER ' || v_n end;

  -- KI-09: Bearbeiter sieht nur Codes, die er selbst anlegen duerfte
  select count(*) into v_n from public.project_invites where project_id = v_p;
  v_bericht := v_bericht || E'\nKI-09 Bearbeiter sieht Codes: ' || v_n
    || case when v_n = 1 then ' ok' else ' FEHLER: erwartet 1 (kein Besitzer-Code)' end;

  begin
    insert into public.project_invites (project_id, code, role, created_by)
      values (v_p, 'P49X' || upper(substr(md5(random()::text), 1, 8)), 'owner', v_b);
    v_bericht := v_bericht || E'\nFEHLER KI-09: Bearbeiter legte einen Besitzer-Code an';
  exception when insufficient_privilege then
    v_bericht := v_bericht || E'\nKI-09 Besitzer-Code durch Bearbeiter abgelehnt: ok';
  end;

  insert into public.project_invites (project_id, code, role, created_by)
    values (v_p, 'P49Y' || upper(substr(md5(random()::text), 1, 8)), 'viewer', v_b);
  v_bericht := v_bericht || E'\nKI-09 Bearbeiter legt Nur-lesen-Code an: ok';

  update public.project_invites set active = false where code = v_code_owner;
  get diagnostics v_n = row_count;
  v_bericht := v_bericht || E'\nKI-09 Bearbeiter aendert Besitzer-Code: ' || v_n || ' Zeilen'
    || case when v_n = 0 then ' ok' else ' FEHLER' end;

  begin
    update public.project_invites set role = 'owner' where code = v_code_editor;
    get diagnostics v_n = row_count;
    v_bericht := v_bericht || E'\nFEHLER KI-09: Bearbeiter machte aus einem Code einen Besitzer-Code (' || v_n || ')';
  exception when insufficient_privilege then
    v_bericht := v_bericht || E'\nKI-09 Code auf Besitzer hochstufen abgelehnt: ok';
  end;

  -- KI-10: Eigentuemer umsetzen als Bearbeiter
  begin
    update public.projects set owner_id = v_b where id = v_p;
    v_bericht := v_bericht || E'\nFEHLER KI-10: Bearbeiter setzte owner_id';
  exception when insufficient_privilege then
    get stacked diagnostics v_hint = pg_exception_hint;
    v_bericht := v_bericht || E'\nKI-10 owner_id durch Bearbeiter abgelehnt (' || coalesce(v_hint, '?') || '): '
      || case when v_hint = 'kistly:umzug.eigentuemer_nur_besitzer' then 'ok' else 'FEHLER falscher Grund' end;
  end;

  -- Alles andere am Umzug darf der Bearbeiter weiter
  update public.projects set note = 'Probelauf 0049' where id = v_p;
  get diagnostics v_n = row_count;
  v_bericht := v_bericht || E'\nBearbeiter aendert Notiz: ' || case when v_n = 1 then 'ok' else 'FEHLER ' || v_n end;

  -- ===== C2. Als a (Besitzer) =====
  execute 'reset role';
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into v_n from public.project_invites where project_id = v_p;
  v_bericht := v_bericht || E'\nBesitzer sieht Codes: ' || v_n
    || case when v_n = 3 then ' ok' else ' FEHLER: erwartet 3' end;

  insert into public.project_invites (project_id, code, role, created_by)
    values (v_p, 'P49Z' || upper(substr(md5(random()::text), 1, 8)), 'owner', v_a);
  v_bericht := v_bericht || E'\nBesitzer legt Besitzer-Code an: ok';

  update public.projects set owner_id = v_b where id = v_p;
  update public.projects set owner_id = v_a where id = v_p;
  v_bericht := v_bericht || E'\nBesitzer setzt owner_id um und zurueck: ok';

  update public.project_members set role = 'viewer' where project_id = v_p and user_id = v_b;
  v_bericht := v_bericht || E'\nBesitzer stuft b auf Nur lesen: ok';

  -- ===== C3. Als b (Nur lesen) =====
  execute 'reset role';
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into v_n from public.project_invites where project_id = v_p;
  v_bericht := v_bericht || E'\nKI-09 Nur lesen sieht Codes: ' || v_n
    || case when v_n = 0 then ' ok' else ' FEHLER: erwartet 0' end;

  begin
    insert into public.project_invites (project_id, code, role, created_by)
      values (v_p, 'P49V' || upper(substr(md5(random()::text), 1, 8)), 'viewer', v_b);
    v_bericht := v_bericht || E'\nFEHLER KI-09: Nur lesen legte einen Code an';
  exception when insufficient_privilege then
    v_bericht := v_bericht || E'\nKI-09 Code durch Nur lesen abgelehnt: ok';
  end;

  -- ===== D. Ohne Anmeldung (wie der SQL-Editor) =====
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);

  update public.projects set owner_id = v_b where id = v_p;
  update public.projects set owner_id = v_a where id = v_p;
  v_bericht := v_bericht || E'\nKI-10 ohne Anmeldung (Wartung) erlaubt: ok';

  begin
    update public.project_members set project_id = v_q where project_id = v_p and user_id = v_b;
    v_bericht := v_bericht || E'\nFEHLER KI-02: ohne Anmeldung liess sich die Mitgliedschaft verschieben';
  exception when insufficient_privilege then
    v_bericht := v_bericht || E'\nKI-02 gilt auch ohne Anmeldung: ok';
  end;

  -- ===== E. Aufraeumen wie im echten Leben: Umzuege loeschen (prueft die Kaskaden) =====
  delete from public.projects where id in (v_p, v_q);
  get diagnostics v_n = row_count;
  v_bericht := v_bericht || E'\nTestumzuege geloescht: ' || case when v_n = 2 then 'ok' else 'FEHLER ' || v_n end;

  raise exception 'PROBELAUF 0049%', v_bericht;
end $probe$;

rollback;
