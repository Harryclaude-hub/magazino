-- 0049: Mitgliedschaften, Einladungscodes und Eigentuemer absichern
-- (Befunde KI-02, KI-09, KI-10 aus der Pruefung vom 09.10.2026).
--
-- NOCH NICHT EINGESPIELT. Karam fuehrt sie selbst aus.
--
-- Vorher der Probelauf (Karams stehende Regel):
--   supabase/probelauf/0049_mitglieder_und_einladungen_absichern.sql
-- Er endet immer mit ERROR "PROBELAUF 0049 ...", nichts bleibt stehen.
-- Steht im Bericht eine Zeile mit FEHLER: nicht anwenden.
-- Anwenden: diese Datei im SQL-Editor zwischen begin; und commit;.
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
