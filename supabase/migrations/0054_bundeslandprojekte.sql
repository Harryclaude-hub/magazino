-- =====================================================================
-- Magazino 0054_bundeslandprojekte (E104)
--
-- Neue Ebene ueber den Lagern: das Bundeslandprojekt. Ein Bundeslandprojekt
-- (zum Beispiel Oberoesterreich) enthaelt mehrere Lager. Der Admin
-- entscheidet, wer welches Bundeslandprojekt sieht; wer dazugehoert, sieht
-- alle Lager darin.
--
-- Umsetzung ohne die vorhandenen Regeln anzufassen: gesehen wird weiter
-- ueber project_members (Mitgliedschaft im Lager), alle Zeilenregeln
-- bleiben. Der Zugang je Bundeslandprojekt (bl_mitglieder) wird auf die
-- Lager darin uebertragen, bei jeder Aenderung und wenn ein Lager neu
-- entsteht. Es gibt also eine Wahrheit (bl_mitglieder) und eine abgeleitete
-- Folge (project_members).
--
-- Dazu:
--  * Bereich statt Zimmer: jeder Bereich (lager_kategorien) bekommt
--    automatisch ein Kuerzel (tags), damit Kisten ihre Nummer behalten.
--  * Der Verlauf (aktivitaet) ist fuer alle Mitglieder des Lagers lesbar:
--    wer reinkam, ging, nahm oder brachte.
-- =====================================================================

-- ============================================================ 1. Tabellen
create table public.bl_projekte (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(btrim(name)) between 1 and 60),
  created_at timestamptz not null default now()
);
create unique index bl_projekte_name_key on public.bl_projekte (lower(btrim(name)));

create table public.bl_mitglieder (
  bl_projekt_id uuid not null references public.bl_projekte(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  role          public.member_role not null default 'editor',
  created_at    timestamptz not null default now(),
  primary key (bl_projekt_id, user_id)
);
create index bl_mitglieder_user_idx on public.bl_mitglieder (user_id);

alter table public.projects add column bl_projekt_id uuid references public.bl_projekte(id) on delete restrict;
create index projects_bl_idx on public.projects (bl_projekt_id);

-- Bestehende Lager in ein Start-Bundeslandprojekt legen (Demo).
do $mig$
declare v uuid;
begin
  if exists (select 1 from public.projects where bl_projekt_id is null) then
    insert into public.bl_projekte (name) values ('Oberösterreich') returning id into v;
    update public.projects set bl_projekt_id = v where bl_projekt_id is null;
    insert into public.bl_mitglieder (bl_projekt_id, user_id, role)
      select v, m.user_id, m.role from public.project_members m join public.projects p on p.id = m.project_id
       where p.bl_projekt_id = v
    on conflict do nothing;
  end if;
end $mig$;
alter table public.projects alter column bl_projekt_id set not null;

-- Bereich bekommt sein Kuerzel (tags) und behaelt die Verbindung.
alter table public.lager_kategorien add column tag_id uuid references public.tags(id) on delete set null;
update public.lager_kategorien k set tag_id = t.id
  from public.tags t where t.project_id = k.project_id and t.kind = 'room' and t.name = k.name and k.tag_id is null;

-- ================================================================== 2. RLS
-- Bereiche entstehen und verschwinden nur ueber Funktionen (Kuerzel laeuft mit).
drop policy lager_kategorien_insert on public.lager_kategorien;
drop policy lager_kategorien_delete on public.lager_kategorien;
revoke insert, delete on public.lager_kategorien from authenticated;

alter table public.bl_projekte   enable row level security;
alter table public.bl_mitglieder enable row level security;

-- Sehen: Admins und alle, die in einem Lager des Bundeslandprojekts Mitglied sind.
create policy bl_projekte_select on public.bl_projekte for select to authenticated
  using (public.ist_admin() or exists (
    select 1 from public.projects p where p.bl_projekt_id = bl_projekte.id and public.is_member(p.id)));
-- Mitglieder sehen: Admins; jede Person ihre eigene Zeile.
create policy bl_mitglieder_select on public.bl_mitglieder for select to authenticated
  using (public.ist_admin() or user_id = auth.uid());
revoke insert, update, delete on public.bl_projekte, public.bl_mitglieder from public, anon, authenticated;
revoke all on public.bl_projekte, public.bl_mitglieder from anon;
grant select on public.bl_projekte, public.bl_mitglieder to authenticated;

-- Verlauf: alle Mitglieder des Lagers lesen mit (vorher nur Besitzer und Admins).
drop policy aktivitaet_select on public.aktivitaet;
create policy aktivitaet_select on public.aktivitaet for select to authenticated
  using (public.ist_admin() or (project_id is not null and public.is_member(project_id)));

-- ========================================================== 3. Funktionen
create function public.bl_projekt_anlegen(p_name text) returns public.bl_projekte
language plpgsql security definer set search_path = public as $fn$
declare b public.bl_projekte;
begin
  if not public.ist_admin() then
    raise exception 'Nur Admins' using errcode = 'insufficient_privilege', hint = 'kistly:admin.kein_zugriff';
  end if;
  if length(btrim(coalesce(p_name, ''))) = 0 then
    raise exception 'Name fehlt' using errcode = 'check_violation', hint = 'kistly:lager.name';
  end if;
  insert into public.bl_projekte (name) values (btrim(p_name)) returning * into b;
  insert into public.bl_mitglieder (bl_projekt_id, user_id, role)
    select b.id, a.user_id, 'owner' from public.app_admins a on conflict do nothing;
  perform public.aktivitaet_schreiben(null, 'admin', 'Bundeslandprojekt angelegt: ' || b.name);
  return b;
end $fn$;

create function public.bl_projekt_umbenennen(p_bl uuid, p_name text) returns void
language plpgsql security definer set search_path = public as $fn$
begin
  if not public.ist_admin() then
    raise exception 'Nur Admins' using errcode = 'insufficient_privilege', hint = 'kistly:admin.kein_zugriff';
  end if;
  update public.bl_projekte set name = btrim(p_name) where id = p_bl;
end $fn$;

-- Nur ein leeres Bundeslandprojekt (ohne Lager) laesst sich loeschen.
create function public.bl_projekt_loeschen(p_bl uuid) returns void
language plpgsql security definer set search_path = public as $fn$
begin
  if not public.ist_admin() then
    raise exception 'Nur Admins' using errcode = 'insufficient_privilege', hint = 'kistly:admin.kein_zugriff';
  end if;
  if exists (select 1 from public.projects where bl_projekt_id = p_bl) then
    raise exception 'Erst die Lager entfernen' using errcode = 'check_violation', hint = 'kistly:lager.bl_nicht_leer';
  end if;
  delete from public.bl_projekte where id = p_bl;
end $fn$;

-- Zugang einer Person zu einem Bundeslandprojekt setzen oder entziehen
-- (rolle 'keine'). Wirkt auf alle Lager darin.
create function public.bl_mitglied_setzen(p_user uuid, p_bl uuid, p_rolle text) returns void
language plpgsql security definer set search_path = public as $fn$
begin
  if not public.ist_admin() then
    raise exception 'Nur Admins' using errcode = 'insufficient_privilege', hint = 'kistly:admin.kein_zugriff';
  end if;
  if not exists (select 1 from auth.users where id = p_user) or not exists (select 1 from public.bl_projekte where id = p_bl) then
    raise exception 'Konto oder Projekt unbekannt' using errcode = 'no_data_found', hint = 'kistly:lager.unbekannt';
  end if;
  if exists (select 1 from public.app_admins where user_id = p_user) then
    return;   -- Admins sehen ohnehin alles, ihr Zugang wird nicht veraendert
  end if;
  if p_rolle = 'keine' then
    delete from public.bl_mitglieder where bl_projekt_id = p_bl and user_id = p_user;
    delete from public.project_members m using public.projects p
     where m.project_id = p.id and p.bl_projekt_id = p_bl and m.user_id = p_user;
    update public.lager_kategorien k set zustaendig_id = null
      from public.projects p where k.project_id = p.id and p.bl_projekt_id = p_bl and k.zustaendig_id = p_user;
  else
    if p_rolle not in ('editor', 'viewer') then
      raise exception 'Rolle ungueltig' using errcode = 'check_violation', hint = 'kistly:lager.rolle';
    end if;
    insert into public.bl_mitglieder (bl_projekt_id, user_id, role) values (p_bl, p_user, p_rolle::public.member_role)
      on conflict (bl_projekt_id, user_id) do update set role = excluded.role;
    insert into public.project_members (project_id, user_id, role)
      select p.id, p_user, p_rolle::public.member_role from public.projects p where p.bl_projekt_id = p_bl
    on conflict (project_id, user_id) do update set role = excluded.role;
  end if;
  perform public.aktivitaet_schreiben(null, 'admin', 'Zugang Bundeslandprojekt: ' || p_rolle);
end $fn$;

-- Neues Lager in einem Bundeslandprojekt (ersetzt lager_anlegen aus 0050).
drop function public.lager_anlegen(text, text);
create function public.lager_anlegen(p_bl uuid, p_name text, p_notiz text default null) returns public.projects
language plpgsql security definer set search_path = public as $fn$
declare p public.projects;
begin
  if not public.ist_admin() then
    raise exception 'Nur Admins' using errcode = 'insufficient_privilege', hint = 'kistly:admin.kein_zugriff';
  end if;
  if not exists (select 1 from public.bl_projekte where id = p_bl) then
    raise exception 'Bundeslandprojekt unbekannt' using errcode = 'no_data_found', hint = 'kistly:lager.unbekannt';
  end if;
  if length(btrim(coalesce(p_name, ''))) = 0 then
    raise exception 'Name fehlt' using errcode = 'check_violation', hint = 'kistly:lager.name';
  end if;
  insert into public.projects (name, note, owner_id, bl_projekt_id)
    values (btrim(p_name), nullif(btrim(coalesce(p_notiz, '')), ''), auth.uid(), p_bl) returning * into p;
  insert into public.project_members (project_id, user_id, role) values (p.id, auth.uid(), 'owner');
  -- Alle Leute des Bundeslandprojekts bekommen Zugang zum neuen Lager.
  insert into public.project_members (project_id, user_id, role)
    select p.id, m.user_id, m.role from public.bl_mitglieder m where m.bl_projekt_id = p_bl
  on conflict (project_id, user_id) do nothing;
  -- Admins sind Besitzer aller Lager.
  insert into public.project_members (project_id, user_id, role)
    select p.id, a.user_id, 'owner' from public.app_admins a
  on conflict (project_id, user_id) do update set role = 'owner';
  perform public.bereich_anlegen_intern(p.id, 'Kreatives und Basteln', 10);
  perform public.bereich_anlegen_intern(p.id, 'Essen und Snacks', 20);
  perform public.bereich_anlegen_intern(p.id, 'Verkaufsstand', 30);
  perform public.bereich_anlegen_intern(p.id, 'Sport und Spiel', 40);
  perform public.bereich_anlegen_intern(p.id, 'Bücher und Papier', 50);
  perform public.bereich_anlegen_intern(p.id, 'Technik', 60);
  return p;
end $fn$;

-- Ein Bereich bekommt sein Kuerzel selbst (zwei Buchstaben aus dem Namen, bei
-- Doppelung mit Ziffer), damit Kisten ihre Nummer behalten (Kuerzel-Laufnummer).
create function public.bereich_anlegen_intern(p_project uuid, p_name text, p_sort int) returns uuid
language plpgsql security definer set search_path = public as $fn$
declare v_tag uuid; v_kurz text; v_basis text; n int := 1; v_kat uuid;
begin
  v_basis := upper(left(regexp_replace(p_name, '[^A-Za-z]', '', 'g'), 2));
  if length(v_basis) < 1 then v_basis := 'B'; end if;
  v_kurz := v_basis;
  while exists (select 1 from public.tags where project_id = p_project and upper(short) = v_kurz) loop
    n := n + 1; v_kurz := v_basis || n::text;
  end loop;
  insert into public.tags (project_id, kind, name, short, color, sort) values (p_project, 'room', p_name, v_kurz, '#2563EB', p_sort) returning id into v_tag;
  insert into public.lager_kategorien (project_id, name, sort, tag_id) values (p_project, p_name, p_sort, v_tag) returning id into v_kat;
  return v_kat;
end $fn$;

-- Bereich anlegen (Bearbeiter) und umbenennen: Kuerzel und Name laufen mit.
create function public.bereich_anlegen(p_project uuid, p_name text) returns uuid
language plpgsql security definer set search_path = public as $fn$
begin
  if not public.is_editor(p_project) then
    raise exception 'Keine Berechtigung' using errcode = 'insufficient_privilege', hint = 'kistly:lager.kein_zugang';
  end if;
  if length(btrim(coalesce(p_name, ''))) = 0 or length(btrim(p_name)) > 40 then
    raise exception 'Name ungueltig' using errcode = 'check_violation', hint = 'kistly:lager.name';
  end if;
  return public.bereich_anlegen_intern(p_project, btrim(p_name), coalesce((select max(sort) + 10 from public.lager_kategorien where project_id = p_project), 10));
end $fn$;

create function public.bereich_umbenennen(p_bereich uuid, p_name text) returns void
language plpgsql security definer set search_path = public as $fn$
declare k public.lager_kategorien;
begin
  select * into k from public.lager_kategorien where id = p_bereich;
  if k.id is null or not public.is_editor(k.project_id) then
    raise exception 'Keine Berechtigung' using errcode = 'insufficient_privilege', hint = 'kistly:lager.kein_zugang';
  end if;
  update public.lager_kategorien set name = btrim(p_name) where id = k.id;
  if k.tag_id is not null then update public.tags set name = btrim(p_name) where id = k.tag_id; end if;
end $fn$;

-- Ein Bereich verschwindet nur, wenn nichts mehr darin liegt.
create function public.bereich_loeschen(p_bereich uuid) returns void
language plpgsql security definer set search_path = public as $fn$
declare k public.lager_kategorien;
begin
  select * into k from public.lager_kategorien where id = p_bereich;
  if k.id is null or not public.is_editor(k.project_id) then
    raise exception 'Keine Berechtigung' using errcode = 'insufficient_privilege', hint = 'kistly:lager.kein_zugang';
  end if;
  if exists (select 1 from public.bestand where kategorie_id = k.id)
     or (k.tag_id is not null and exists (select 1 from public.items where room_id = k.tag_id)) then
    raise exception 'Bereich ist nicht leer' using errcode = 'check_violation', hint = 'kistly:lager.bereich_nicht_leer';
  end if;
  delete from public.lager_kategorien where id = k.id;
  if k.tag_id is not null then delete from public.tags where id = k.tag_id; end if;
end $fn$;

-- Aufgebrauchtes (Menge 0) entfernen oder leer lassen zum Auffuellen: Loeschen
-- ist erlaubt, solange nichts ausgeliehen ist. Bearbeiter.
create function public.bestand_entfernen(p_bestand uuid) returns void
language plpgsql security definer set search_path = public as $fn$
declare b public.bestand;
begin
  select * into b from public.bestand where id = p_bestand for update;
  if b.id is null or not public.is_editor(b.project_id) then
    raise exception 'Keine Berechtigung' using errcode = 'insufficient_privilege', hint = 'kistly:lager.kein_zugang';
  end if;
  if exists (select 1 from public.ausleihen where bestand_id = b.id and zurueck_am is null) then
    raise exception 'Noch ausgeliehen' using errcode = 'check_violation', hint = 'kistly:lager.noch_ausgeliehen';
  end if;
  perform public.aktivitaet_schreiben(b.project_id, 'entfernt', b.name || ' entfernt');
  delete from public.bestand where id = b.id;
end $fn$;

-- Admin: neue Admins werden auch Mitglied jedes Bundeslandprojekts (sonst
-- saehen sie die Liste nicht); bestehende Funktion wird ergaenzt.
create or replace function public.admin_admin_setzen(p_user uuid, p_admin boolean) returns void
language plpgsql security definer set search_path = public as $fn$
begin
  if not public.ist_admin() then
    raise exception 'Nur Admins' using errcode = 'insufficient_privilege', hint = 'kistly:admin.kein_zugriff';
  end if;
  if not exists (select 1 from auth.users where id = p_user) then
    raise exception 'Konto unbekannt' using errcode = 'no_data_found', hint = 'kistly:lager.unbekannt';
  end if;
  if p_admin then
    insert into public.app_admins (user_id) values (p_user) on conflict do nothing;
    insert into public.konto_freigaben (user_id, status, geaendert_von) values (p_user, 'frei', auth.uid())
      on conflict (user_id) do update set status = 'frei', geaendert_am = now(), geaendert_von = auth.uid();
    insert into public.project_members (project_id, user_id, role)
      select p.id, p_user, 'owner' from public.projects p
    on conflict (project_id, user_id) do update set role = 'owner';
    insert into public.bl_mitglieder (bl_projekt_id, user_id, role)
      select b.id, p_user, 'owner' from public.bl_projekte b
    on conflict (bl_projekt_id, user_id) do update set role = 'owner';
  else
    if (select count(*) from public.app_admins) <= 1 then
      raise exception 'Der letzte Admin bleibt' using errcode = 'check_violation', hint = 'kistly:admin.letzter';
    end if;
    if p_user = auth.uid() then
      raise exception 'Sich selbst nicht entziehen' using errcode = 'check_violation', hint = 'kistly:admin.selbst';
    end if;
    delete from public.app_admins where user_id = p_user;
  end if;
  perform public.aktivitaet_schreiben(null, 'admin', case when p_admin then 'Admin ernannt' else 'Admin entzogen' end);
end $fn$;

-- ================================================================ 4. Rechte
revoke execute on function public.bereich_anlegen_intern(uuid, text, int) from public, anon, authenticated;
do $do$
declare f text;
begin
  foreach f in array array[
    'bl_projekt_anlegen(text)', 'bl_projekt_umbenennen(uuid, text)', 'bl_projekt_loeschen(uuid)',
    'bl_mitglied_setzen(uuid, uuid, text)', 'lager_anlegen(uuid, text, text)',
    'bereich_anlegen(uuid, text)', 'bereich_umbenennen(uuid, text)', 'bereich_loeschen(uuid)',
    'bestand_entfernen(uuid)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $do$;
