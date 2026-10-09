-- Probelauf 0049 (Mitgliedschaften, Einladungscodes, Eigentuemer).
--
-- NOCH NICHT AUSGEFUEHRT. Karam fuehrt ihn selbst aus, im SQL-Editor des
-- Kistly-Projekts, vor dem Anwenden von 0049.
--
-- Endet IMMER mit ERROR "PROBELAUF 0049 ...". Damit wird alles
-- zurueckgerollt, nichts bleibt stehen: weder die Migration noch der
-- Testumzug noch die voruebergehende Freischaltung der beiden Konten.
-- Der Bericht steht in der Fehlermeldung. Jede Zeile soll mit "ok" enden;
-- steht irgendwo FEHLER: 0049 nicht anwenden.
--
-- Vorbereitung (Muster aus docs/grundriss/BAUPLAN.md, Abschnitt 2):
-- Teil A unten durch den Text von
-- supabase/migrations/0049_mitglieder_und_einladungen_absichern.sql
-- ersetzen, unveraendert. Es werden keine Konten angelegt; der Lauf nimmt
-- das aelteste Konto als Besitzer und ein zweites, das kein Admin ist.
-- Freiwillig: den Text zweimal hintereinander einsetzen. Dann zeigt der
-- Lauf auch, dass ein zweites Einspielen nicht scheitert (create or
-- replace trigger, ab Postgres 14).
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
  -- ===== A. Text von 0049_mitglieder_und_einladungen_absichern.sql hier einfuegen =====

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
