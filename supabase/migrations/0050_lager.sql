-- =====================================================================
-- Magazino 0050_lager (E103, Stufen 3 bis 6)
--
-- Aus dem Umzugsprogramm wird ein Lagerprogramm. Ein Lager ist ein
-- Projekt (projects), seine Mitglieder sind die Leute mit Zugang. Neu:
--
--   lager_kategorien   Bereiche eines Lagers (Basteln, Essen, Sport ...),
--                      je Bereich ein oder kein Zustaendiger
--   bestand            Dinge mit Menge (Verbrauch) oder zum Ausleihen
--   bestand_buchungen  jede Mengenaenderung, wer, wann, wie viel
--   ausleihen          wer hat was bis wann
--   lager_zugang       Eintragen am Tuer-QR, Austragen beim Gehen
--   aktivitaet         was wer wo getan hat (fuer das Admin-Portal)
--
-- Regeln liegen in der Datenbank, nicht in der Oberflaeche: Schreiben geht
-- nur ueber die Funktionen unten (security definer, pruefen Mitgliedschaft,
-- Rolle und Eintragung). Direkt schreiben duerfen nur Bearbeiter in
-- lager_kategorien und bestand (Stammdaten); Mengen aendern nur die
-- Funktionen.
-- =====================================================================

-- ============================================================ 1. Tabellen
create table public.lager_kategorien (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  name         text not null check (length(btrim(name)) between 1 and 40),
  zustaendig_id uuid references auth.users(id) on delete set null,
  sort         int not null default 0,
  created_at   timestamptz not null default now(),
  unique (project_id, name)
);
create index lager_kategorien_projekt_idx on public.lager_kategorien (project_id, sort);

create table public.bestand (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects(id) on delete cascade,
  kategorie_id   uuid references public.lager_kategorien(id) on delete set null,
  name           text not null check (length(btrim(name)) between 1 and 80),
  einheit        text not null default 'Stk' check (length(btrim(einheit)) between 1 and 12),
  menge          numeric(12,2) not null default 0 check (menge >= 0),
  mindestmenge   numeric(12,2) not null default 0 check (mindestmenge >= 0),
  art            text not null default 'verbrauch' check (art in ('verbrauch', 'ausleihe')),
  item_id        uuid references public.items(id) on delete set null,   -- liegt in dieser Kiste
  ort            text check (ort is null or length(ort) <= 80),         -- sonst: freier Ort im Lager
  knapp_seit     timestamptz,     -- gesetzt, sobald die Menge unter die Mindestmenge fiel
  knapp_push_am  timestamptz,     -- wann die Zustaendigen benachrichtigt wurden
  created_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index bestand_projekt_idx on public.bestand (project_id, name);
create index bestand_kategorie_idx on public.bestand (kategorie_id);
create index bestand_knapp_idx on public.bestand (knapp_seit) where knapp_seit is not null;

create table public.ausleihen (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  bestand_id    uuid not null references public.bestand(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  menge         numeric(12,2) not null check (menge > 0),
  faellig_am    timestamptz not null,
  zurueck_am    timestamptz,
  erinnert_am   timestamptz,    -- letzte Erinnerung an den Ausleiher
  eskaliert_am  timestamptz,    -- Zustaendige wurden informiert
  notiz         text check (notiz is null or length(notiz) <= 200),
  created_at    timestamptz not null default now()
);
create index ausleihen_offen_idx on public.ausleihen (project_id, faellig_am) where zurueck_am is null;
create index ausleihen_user_idx on public.ausleihen (user_id, created_at desc);

create table public.bestand_buchungen (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  bestand_id  uuid not null references public.bestand(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete set null,
  art         text not null check (art in ('entnahme', 'zugang', 'korrektur', 'ausleihe', 'rueckgabe')),
  menge       numeric(12,2) not null,
  rest        numeric(12,2) not null,   -- Menge danach
  notiz       text check (notiz is null or length(notiz) <= 200),
  zeit        timestamptz not null default now()
);
create index bestand_buchungen_idx on public.bestand_buchungen (bestand_id, zeit desc);

create table public.lager_zugang (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  rein_am     timestamptz not null default now(),
  raus_am     timestamptz,
  check (raus_am is null or raus_am >= rein_am)
);
-- Hoechstens ein offener Eintrag je Person und Lager.
create unique index lager_zugang_offen_key on public.lager_zugang (project_id, user_id) where raus_am is null;
create index lager_zugang_projekt_idx on public.lager_zugang (project_id, rein_am desc);

create table public.aktivitaet (
  id          bigserial primary key,
  project_id  uuid references public.projects(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete set null,
  art         text not null,          -- betreten, verlassen, entnahme, zugang, ausleihe, rueckgabe, korrektur
  text        text not null default '',
  zeit        timestamptz not null default now()
);
create index aktivitaet_zeit_idx on public.aktivitaet (zeit desc);
create index aktivitaet_user_idx on public.aktivitaet (user_id, zeit desc);

-- ================================================================== 2. RLS
alter table public.lager_kategorien  enable row level security;
alter table public.bestand           enable row level security;
alter table public.ausleihen         enable row level security;
alter table public.bestand_buchungen enable row level security;
alter table public.lager_zugang      enable row level security;
alter table public.aktivitaet        enable row level security;

-- Lesen: alle Mitglieder des Lagers.
create policy lager_kategorien_select on public.lager_kategorien for select to authenticated using (public.is_member(project_id));
create policy bestand_select          on public.bestand          for select to authenticated using (public.is_member(project_id));
create policy ausleihen_select        on public.ausleihen        for select to authenticated using (public.is_member(project_id));
create policy buchungen_select        on public.bestand_buchungen for select to authenticated using (public.is_member(project_id));
create policy zugang_select           on public.lager_zugang     for select to authenticated using (public.is_member(project_id));
-- Aktivitaet: nur Besitzer des Lagers und Admins.
create policy aktivitaet_select       on public.aktivitaet       for select to authenticated using (public.ist_admin() or (project_id is not null and public.is_owner(project_id)));

-- Stammdaten schreiben: Bearbeiter. Mengen nie direkt (Trigger unten).
create policy lager_kategorien_insert on public.lager_kategorien for insert to authenticated with check (public.is_editor(project_id));
create policy lager_kategorien_update on public.lager_kategorien for update to authenticated using (public.is_editor(project_id)) with check (public.is_editor(project_id));
create policy lager_kategorien_delete on public.lager_kategorien for delete to authenticated using (public.is_editor(project_id));
create policy bestand_insert on public.bestand for insert to authenticated with check (public.is_editor(project_id));
create policy bestand_update on public.bestand for update to authenticated using (public.is_editor(project_id)) with check (public.is_editor(project_id));
create policy bestand_delete on public.bestand for delete to authenticated using (public.is_editor(project_id));

revoke insert, update, delete on public.ausleihen, public.bestand_buchungen, public.lager_zugang, public.aktivitaet from public, anon, authenticated;
revoke all on public.lager_kategorien, public.bestand, public.ausleihen, public.bestand_buchungen, public.lager_zugang, public.aktivitaet from anon;
grant select on public.lager_kategorien, public.bestand, public.ausleihen, public.bestand_buchungen, public.lager_zugang, public.aktivitaet to authenticated;
grant insert, update, delete on public.lager_kategorien, public.bestand to authenticated;
grant usage, select on sequence public.aktivitaet_id_seq to authenticated;

-- Die Menge aendern nur die Buchungsfunktionen: der Trigger lehnt jede andere
-- Aenderung der Menge ab (Anlegen mit Startmenge bleibt erlaubt).
create function public.bestand_menge_schuetzen() returns trigger
language plpgsql as $fn$
begin
  if tg_op = 'UPDATE' and new.menge is distinct from old.menge
     and coalesce(current_setting('magazino.buchung', true), '') <> 'ja' then
    raise exception 'Menge nur ueber eine Buchung aendern' using errcode = 'insufficient_privilege', hint = 'kistly:lager.nur_buchung';
  end if;
  new.updated_at := now();
  return new;
end $fn$;
create trigger bestand_menge_schuetzen before update on public.bestand
  for each row execute function public.bestand_menge_schuetzen();

-- Kategorie und Kiste muessen zum selben Lager gehoeren.
create function public.bestand_lager_pruefen() returns trigger
language plpgsql as $fn$
begin
  if new.kategorie_id is not null and not exists (
       select 1 from public.lager_kategorien k where k.id = new.kategorie_id and k.project_id = new.project_id) then
    raise exception 'Kategorie gehoert zu einem anderen Lager' using errcode = 'check_violation', hint = 'kistly:lager.fremde_kategorie';
  end if;
  if new.item_id is not null and not exists (
       select 1 from public.items i where i.id = new.item_id and i.project_id = new.project_id) then
    raise exception 'Kiste gehoert zu einem anderen Lager' using errcode = 'check_violation', hint = 'kistly:lager.fremde_kiste';
  end if;
  return new;
end $fn$;
create trigger bestand_lager_pruefen before insert or update of kategorie_id, item_id, project_id on public.bestand
  for each row execute function public.bestand_lager_pruefen();

create function public.kategorie_zustaendig_pruefen() returns trigger
language plpgsql as $fn$
begin
  if new.zustaendig_id is not null and not exists (
       select 1 from public.project_members m where m.project_id = new.project_id and m.user_id = new.zustaendig_id) then
    raise exception 'Zustaendiger ist kein Mitglied dieses Lagers' using errcode = 'check_violation', hint = 'kistly:lager.zustaendig_kein_mitglied';
  end if;
  return new;
end $fn$;
create trigger kategorie_zustaendig_pruefen before insert or update of zustaendig_id on public.lager_kategorien
  for each row execute function public.kategorie_zustaendig_pruefen();

-- ============================================================ 3. Funktionen

-- Ist die Person gerade am Tuer-QR eingetragen? Admins und Besitzer des
-- Lagers muessen nicht, damit sie jederzeit eingreifen koennen.
create function public.lager_eingetragen(p uuid) returns boolean
language sql stable security definer set search_path = public as $fn$
  select public.ist_admin() or public.is_owner(p) or exists (
    select 1 from public.lager_zugang z where z.project_id = p and z.user_id = auth.uid() and z.raus_am is null)
$fn$;

create function public.aktivitaet_schreiben(p_project uuid, p_art text, p_text text) returns void
language sql security definer set search_path = public as $fn$
  insert into public.aktivitaet (project_id, user_id, art, text) values (p_project, auth.uid(), p_art, left(coalesce(p_text, ''), 300));
$fn$;
revoke execute on function public.aktivitaet_schreiben(uuid, text, text) from public, anon, authenticated;

-- Eintragen am Tuer-QR.
create function public.lager_betreten(p_project uuid) returns public.lager_zugang
language plpgsql security definer set search_path = public as $fn$
declare z public.lager_zugang;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet' using errcode = 'insufficient_privilege'; end if;
  if not public.is_member(p_project) then
    raise exception 'Kein Zugang zu diesem Lager' using errcode = 'insufficient_privilege', hint = 'kistly:lager.kein_zugang';
  end if;
  select * into z from public.lager_zugang where project_id = p_project and user_id = auth.uid() and raus_am is null;
  if z.id is not null then return z; end if;
  insert into public.lager_zugang (project_id, user_id) values (p_project, auth.uid()) returning * into z;
  perform public.aktivitaet_schreiben(p_project, 'betreten', 'hat das Lager betreten');
  return z;
end $fn$;

-- Austragen beim Gehen.
create function public.lager_verlassen(p_project uuid) returns public.lager_zugang
language plpgsql security definer set search_path = public as $fn$
declare z public.lager_zugang;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet' using errcode = 'insufficient_privilege'; end if;
  update public.lager_zugang set raus_am = now()
   where project_id = p_project and user_id = auth.uid() and raus_am is null returning * into z;
  if z.id is null then
    raise exception 'Nicht eingetragen' using errcode = 'no_data_found', hint = 'kistly:lager.nicht_drin';
  end if;
  perform public.aktivitaet_schreiben(p_project, 'verlassen', 'hat das Lager verlassen');
  return z;
end $fn$;

-- Bestand buchen. art: entnahme (weg, kommt nicht zurueck), ausleihe (kommt
-- zurueck, Termin Pflicht), zugang (mehr hineingelegt), korrektur (Zaehlung,
-- setzt die Menge, nur Bearbeiter).
create function public.bestand_buchen(
  p_bestand uuid, p_art text, p_menge numeric, p_notiz text default null, p_faellig timestamptz default null)
returns public.bestand
language plpgsql security definer set search_path = public as $fn$
declare
  b public.bestand;
  v_neu numeric;
  v_name text;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet' using errcode = 'insufficient_privilege'; end if;
  if p_art not in ('entnahme', 'ausleihe', 'zugang', 'korrektur') then
    raise exception 'Unbekannte Buchungsart' using errcode = 'check_violation', hint = 'kistly:lager.art';
  end if;
  select * into b from public.bestand where id = p_bestand for update;
  if b.id is null then raise exception 'Bestand unbekannt' using errcode = 'no_data_found', hint = 'kistly:lager.unbekannt'; end if;
  if not public.is_editor(b.project_id) then
    raise exception 'Keine Berechtigung' using errcode = 'insufficient_privilege', hint = 'kistly:lager.kein_zugang';
  end if;
  if p_art = 'korrektur' then
    if p_menge is null or p_menge < 0 then raise exception 'Menge ungueltig' using errcode = 'check_violation', hint = 'kistly:lager.menge'; end if;
  else
    if p_menge is null or p_menge <= 0 then raise exception 'Menge ungueltig' using errcode = 'check_violation', hint = 'kistly:lager.menge'; end if;
    if not public.lager_eingetragen(b.project_id) then
      raise exception 'Erst am Tuer eintragen' using errcode = 'insufficient_privilege', hint = 'kistly:lager.nicht_eingetragen';
    end if;
  end if;
  if p_art = 'ausleihe' and (p_faellig is null or p_faellig <= now() - interval '1 minute') then
    raise exception 'Rueckgabetermin fehlt' using errcode = 'check_violation', hint = 'kistly:lager.termin';
  end if;

  if p_art in ('entnahme', 'ausleihe') then
    if p_menge > b.menge then
      raise exception 'Nicht genug da' using errcode = 'check_violation', hint = 'kistly:lager.zu_wenig', detail = json_build_object('n', b.menge, 'einheit', b.einheit)::text;
    end if;
    v_neu := b.menge - p_menge;
  elsif p_art = 'zugang' then
    v_neu := b.menge + p_menge;
  else
    v_neu := p_menge;
  end if;

  perform set_config('magazino.buchung', 'ja', true);
  update public.bestand set
    menge = v_neu,
    knapp_seit = case when mindestmenge > 0 and v_neu <= mindestmenge then coalesce(knapp_seit, now()) else null end,
    knapp_push_am = case when mindestmenge > 0 and v_neu <= mindestmenge then knapp_push_am else null end
   where id = b.id returning * into b;
  perform set_config('magazino.buchung', '', true);

  insert into public.bestand_buchungen (project_id, bestand_id, user_id, art, menge, rest, notiz)
  values (b.project_id, b.id, auth.uid(), p_art, p_menge, v_neu, left(p_notiz, 200));
  if p_art = 'ausleihe' then
    insert into public.ausleihen (project_id, bestand_id, user_id, menge, faellig_am, notiz)
    values (b.project_id, b.id, auth.uid(), p_menge, p_faellig, left(p_notiz, 200));
  end if;
  v_name := b.name;
  perform public.aktivitaet_schreiben(b.project_id, p_art,
    p_menge::text || ' ' || b.einheit || ' ' || v_name || case p_art when 'zugang' then ' hinzugefuegt' when 'korrektur' then ' gezaehlt' else '' end);
  return b;
end $fn$;

-- Ausgeliehenes zurueckbringen (der Ausleiher selbst oder ein Bearbeiter).
create function public.ausleihe_zurueck(p_ausleihe uuid) returns public.ausleihen
language plpgsql security definer set search_path = public as $fn$
declare
  a public.ausleihen;
  b public.bestand;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet' using errcode = 'insufficient_privilege'; end if;
  select * into a from public.ausleihen where id = p_ausleihe for update;
  if a.id is null then raise exception 'Ausleihe unbekannt' using errcode = 'no_data_found', hint = 'kistly:lager.unbekannt'; end if;
  if a.user_id <> auth.uid() and not public.is_editor(a.project_id) then
    raise exception 'Keine Berechtigung' using errcode = 'insufficient_privilege', hint = 'kistly:lager.kein_zugang';
  end if;
  if not public.is_member(a.project_id) then
    raise exception 'Keine Berechtigung' using errcode = 'insufficient_privilege', hint = 'kistly:lager.kein_zugang';
  end if;
  if a.zurueck_am is not null then return a; end if;

  update public.ausleihen set zurueck_am = now() where id = a.id returning * into a;
  perform set_config('magazino.buchung', 'ja', true);
  update public.bestand set
    menge = menge + a.menge
   where id = a.bestand_id returning * into b;
  update public.bestand set knapp_seit = null, knapp_push_am = null
   where id = b.id and (mindestmenge = 0 or menge > mindestmenge);
  perform set_config('magazino.buchung', '', true);
  insert into public.bestand_buchungen (project_id, bestand_id, user_id, art, menge, rest)
  values (a.project_id, b.id, auth.uid(), 'rueckgabe', a.menge, b.menge);
  perform public.aktivitaet_schreiben(a.project_id, 'rueckgabe', a.menge::text || ' ' || b.einheit || ' ' || b.name || ' zurueckgebracht');
  return a;
end $fn$;

-- Neues Lager mit Standardkategorien (nur Admins). Ein Lager ist ein Projekt.
create function public.lager_anlegen(p_name text, p_notiz text default null) returns public.projects
language plpgsql security definer set search_path = public as $fn$
declare p public.projects;
begin
  if not public.ist_admin() then
    raise exception 'Nur Admins' using errcode = 'insufficient_privilege', hint = 'kistly:admin.kein_zugriff';
  end if;
  p := public.create_project(p_name, p_notiz, false);
  insert into public.lager_kategorien (project_id, name, sort) values
    (p.id, 'Kreatives und Basteln', 10), (p.id, 'Essen und Snacks', 20), (p.id, 'Verkaufsstand', 30),
    (p.id, 'Sport und Spiel', 40), (p.id, 'Bücher und Papier', 50), (p.id, 'Technik', 60);
  return p;
end $fn$;

-- ===================================================== 4. Admin-Auswertung
create function public.admin_nutzer_aktivitaet() returns table (
  user_id uuid, email text, name text, angelegt_am timestamptz, zuletzt_aktiv timestamptz,
  buchungen bigint, offene_ausleihen bigint, ueberfaellig bigint, drin_in text, ist_admin boolean)
language plpgsql stable security definer set search_path = public as $fn$
begin
  if not public.ist_admin() then
    raise exception 'Nur Admins' using errcode = 'insufficient_privilege', hint = 'kistly:admin.kein_zugriff';
  end if;
  return query
  select u.id, u.email::text, coalesce(p.display_name, '')::text, u.created_at,
         greatest((select max(a.zeit) from public.aktivitaet a where a.user_id = u.id), u.last_sign_in_at),
         (select count(*) from public.bestand_buchungen b where b.user_id = u.id),
         (select count(*) from public.ausleihen l where l.user_id = u.id and l.zurueck_am is null),
         (select count(*) from public.ausleihen l where l.user_id = u.id and l.zurueck_am is null and l.faellig_am < now()),
         (select string_agg(pr.name, ', ') from public.lager_zugang z join public.projects pr on pr.id = z.project_id
           where z.user_id = u.id and z.raus_am is null),
         exists (select 1 from public.app_admins ad where ad.user_id = u.id)
    from auth.users u left join public.profiles p on p.id = u.id
   order by 5 desc nulls last;
end $fn$;

create function public.admin_aktivitaet(p_limit int default 100, p_user uuid default null) returns table (
  zeit timestamptz, user_id uuid, email text, lager text, art text, text text)
language plpgsql stable security definer set search_path = public as $fn$
begin
  if not public.ist_admin() then
    raise exception 'Nur Admins' using errcode = 'insufficient_privilege', hint = 'kistly:admin.kein_zugriff';
  end if;
  return query
  select a.zeit, a.user_id, u.email::text, pr.name, a.art, a.text
    from public.aktivitaet a
    left join auth.users u on u.id = a.user_id
    left join public.projects pr on pr.id = a.project_id
   where p_user is null or a.user_id = p_user
   order by a.zeit desc limit least(greatest(p_limit, 1), 500);
end $fn$;

-- Weitere Admins ernennen oder zuruecknehmen. Der letzte Admin bleibt immer.
create function public.admin_admin_setzen(p_user uuid, p_admin boolean) returns void
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
  else
    if (select count(*) from public.app_admins) <= 1 then
      raise exception 'Der letzte Admin bleibt' using errcode = 'check_violation', hint = 'kistly:admin.letzter';
    end if;
    delete from public.app_admins where user_id = p_user;
  end if;
  perform public.aktivitaet_schreiben(null, 'admin', case when p_admin then 'Admin ernannt' else 'Admin entzogen' end);
end $fn$;

-- ================================================================ 5. Rechte
do $do$
declare f text;
begin
  foreach f in array array[
    'lager_eingetragen(uuid)', 'lager_betreten(uuid)', 'lager_verlassen(uuid)',
    'bestand_buchen(uuid, text, numeric, text, timestamptz)', 'ausleihe_zurueck(uuid)',
    'lager_anlegen(text, text)', 'admin_nutzer_aktivitaet()', 'admin_aktivitaet(int, uuid)',
    'admin_admin_setzen(uuid, boolean)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $do$;
