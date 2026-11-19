begin;
-- =====================================================================
-- Magazino 0062_pruefbefunde (E108)
--
-- Behebt die Funde der unabhaengigen Sicherheitspruefung vom 20.11.2026:
--  H1  Ein entzogener Admin verliert auch seine automatischen Besitzerrechte
--      (Lager und Bundeslandprojekte).
--  H2  Das Startpasswort wird serverseitig sofort gemerkt (Funktion nur fuer
--      den Dienstschluessel), nicht mehr durch einen zweiten Aufruf des
--      Browsers. Ein Konto mit unveraendertem Startpasswort wird nicht zum Admin.
--  M1  Bestand loescht man nur ueber bestand_entfernen (prueft Ausleihen).
--  M2/M7  Mengen: kein NaN, auf zwei Stellen gerundet.
--  M3  Push-Adressen nur von den bekannten Push-Diensten (https).
--  M5  knapp wird auch beim Anlegen und beim Aendern der Mindestmenge gesetzt.
--  M6  Eintragen laeuft nach 12 Stunden von selbst ab (pg_cron) und endet,
--      wenn der Zugang entzogen wird.
--  M11 Lager, Bestand und Bereiche koennen nicht in ein anderes Lager oder
--      Bundeslandprojekt umgehaengt werden (Bundeslandprojekt nur der Admin).
--  N5  Doppeltes "Ich bin im Lager" erzeugt keinen Fehler mehr.
-- =====================================================================

-- ---- H2: Startpasswort sofort merken (nur Dienstschluessel) -----------
create function public.startpasswort_merken_dienst(p_user uuid) returns void
language plpgsql security definer set search_path = public, auth as $fn$
begin
  if exists (select 1 from public.app_admins where user_id = p_user) then
    raise exception 'Ein Admin-Konto bleibt unberuehrt' using errcode = 'check_violation';
  end if;
  insert into public.konto_freigaben (user_id, status, start_hash)
    select p_user, 'wartet', u.encrypted_password from auth.users u where u.id = p_user
  on conflict (user_id) do update set start_hash = excluded.start_hash;
end $fn$;
revoke execute on function public.startpasswort_merken_dienst(uuid) from public, anon, authenticated;
grant  execute on function public.startpasswort_merken_dienst(uuid) to service_role;

-- ---- H1 und N7: Admin entziehen, Admin ernennen -----------------------
create or replace function public.admin_admin_setzen(p_user uuid, p_admin boolean) returns void
language plpgsql security definer set search_path = public, auth as $fn$
begin
  if not public.ist_admin() then
    raise exception 'Nur Admins' using errcode = 'insufficient_privilege', hint = 'kistly:admin.kein_zugriff';
  end if;
  if not exists (select 1 from auth.users where id = p_user) then
    raise exception 'Konto unbekannt' using errcode = 'no_data_found', hint = 'kistly:lager.unbekannt';
  end if;
  if p_admin then
    -- Ein Konto mit unveraendertem Startpasswort wird nicht Admin: der ernennende Admin kennt dieses Passwort noch.
    if exists (select 1 from public.konto_freigaben f join auth.users u on u.id = f.user_id
                where f.user_id = p_user and f.start_hash is not null and u.encrypted_password = f.start_hash) then
      raise exception 'Erst ein eigenes Passwort setzen lassen' using errcode = 'check_violation', hint = 'kistly:admin.passwort_offen';
    end if;
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
    -- Die automatischen Besitzerrechte gehen mit: Bearbeiter bleibt er, Besitzer nicht mehr.
    update public.project_members set role = 'editor' where user_id = p_user and role = 'owner';
    update public.bl_mitglieder set role = 'editor' where user_id = p_user and role = 'owner';
  end if;
  perform public.aktivitaet_schreiben(null, 'admin', case when p_admin then 'Admin ernannt' else 'Admin entzogen' end);
end $fn$;

-- ---- M6: Zugang entzogen beendet auch den Eintrag --------------------
create or replace function public.bl_mitglied_setzen(p_user uuid, p_bl uuid, p_rolle text) returns void
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
    update public.lager_zugang z set raus_am = now()
      from public.projects p where z.project_id = p.id and p.bl_projekt_id = p_bl and z.user_id = p_user and z.raus_am is null;
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

-- ---- M1: Bestand nur ueber bestand_entfernen loeschen ----------------
drop policy bestand_delete on public.bestand;
revoke delete on public.bestand from authenticated;

-- ---- M2: keine NaN-Mengen --------------------------------------------
alter table public.bestand add constraint bestand_menge_zahl check (menge <> 'NaN'::numeric and mindestmenge <> 'NaN'::numeric);
alter table public.ausleihen add constraint ausleihen_menge_zahl check (menge <> 'NaN'::numeric);
alter table public.bestand_buchungen add constraint buchungen_menge_zahl check (menge <> 'NaN'::numeric and rest <> 'NaN'::numeric);

-- ---- M3: Push-Adressen nur von bekannten Diensten --------------------
alter table public.push_subscriptions add constraint push_endpoint_bekannt
  check (endpoint ~ '^https://(fcm\.googleapis\.com|android\.googleapis\.com|[a-z0-9.-]+\.push\.services\.mozilla\.com|[a-z0-9.-]+\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)/');

-- ---- M5: knapp auch beim Anlegen und beim Aendern der Mindestmenge ----
create function public.bestand_knapp_setzen() returns trigger
language plpgsql as $fn$
begin
  if new.mindestmenge > 0 and new.menge <= new.mindestmenge then
    new.knapp_seit := coalesce(new.knapp_seit, now());
  else
    new.knapp_seit := null;
    new.knapp_push_am := null;
  end if;
  return new;
end $fn$;
create trigger bestand_knapp_setzen before insert or update of mindestmenge on public.bestand
  for each row execute function public.bestand_knapp_setzen();
-- Bestehende Dinge einmal nachziehen.
update public.bestand set mindestmenge = mindestmenge;

-- ---- M11: Fremdschluessel nicht umhaengen -----------------------------
create function public.fest_halten() returns trigger
language plpgsql security definer set search_path = public as $fn$
begin
  if tg_table_name = 'projects' then
    if new.bl_projekt_id is distinct from old.bl_projekt_id and not public.ist_admin() then
      raise exception 'Das Lager gehoert zu diesem Bundeslandprojekt' using errcode = 'insufficient_privilege', hint = 'kistly:lager.fest';
    end if;
  elsif tg_table_name = 'bestand' then
    if new.project_id is distinct from old.project_id then
      raise exception 'Ein Ding bleibt in seinem Lager' using errcode = 'insufficient_privilege', hint = 'kistly:lager.fest';
    end if;
  elsif tg_table_name = 'lager_kategorien' then
    if new.project_id is distinct from old.project_id or new.tag_id is distinct from old.tag_id then
      raise exception 'Ein Bereich bleibt in seinem Lager' using errcode = 'insufficient_privilege', hint = 'kistly:lager.fest';
    end if;
  end if;
  return new;
end $fn$;
create trigger projects_fest before update on public.projects for each row execute function public.fest_halten();
create trigger bestand_fest before update on public.bestand for each row execute function public.fest_halten();
create trigger kategorien_fest before update on public.lager_kategorien for each row execute function public.fest_halten();

-- ---- N5: lager_betreten ohne Wettlauf ---------------------------------
create or replace function public.lager_betreten(p_project uuid) returns public.lager_zugang
language plpgsql security definer set search_path = public as $fn$
declare z public.lager_zugang; neu boolean := false;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet' using errcode = 'insufficient_privilege'; end if;
  if not public.is_member(p_project) then
    raise exception 'Kein Zugang zu diesem Lager' using errcode = 'insufficient_privilege', hint = 'kistly:lager.kein_zugang';
  end if;
  insert into public.lager_zugang (project_id, user_id) values (p_project, auth.uid())
    on conflict (project_id, user_id) where raus_am is null do nothing returning * into z;
  if z.id is null then
    select * into z from public.lager_zugang where project_id = p_project and user_id = auth.uid() and raus_am is null;
  else
    neu := true;
  end if;
  if neu then perform public.aktivitaet_schreiben(p_project, 'betreten', 'hat das Lager betreten'); end if;
  return z;
end $fn$;

-- ---- M2 und M7: Menge pruefen und runden in der Buchung ---------------
create or replace function public.bestand_buchen(
  p_bestand uuid, p_art text, p_menge numeric, p_notiz text default null, p_faellig timestamptz default null)
returns public.bestand
language plpgsql security definer set search_path = public as $fn$
declare
  b public.bestand;
  v_neu numeric;
  v_name text;
  v_menge numeric;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet' using errcode = 'insufficient_privilege'; end if;
  if p_art not in ('entnahme', 'ausleihe', 'zugang', 'korrektur') then
    raise exception 'Unbekannte Buchungsart' using errcode = 'check_violation', hint = 'kistly:lager.art';
  end if;
  if p_menge is null or p_menge = 'NaN'::numeric or p_menge > 1000000000 then
    raise exception 'Menge ungueltig' using errcode = 'check_violation', hint = 'kistly:lager.menge';
  end if;
  v_menge := round(p_menge, 2);
  select * into b from public.bestand where id = p_bestand for update;
  if b.id is null then raise exception 'Bestand unbekannt' using errcode = 'no_data_found', hint = 'kistly:lager.unbekannt'; end if;
  if not public.is_editor(b.project_id) then
    raise exception 'Keine Berechtigung' using errcode = 'insufficient_privilege', hint = 'kistly:lager.kein_zugang';
  end if;
  if p_art = 'korrektur' then
    if v_menge < 0 then raise exception 'Menge ungueltig' using errcode = 'check_violation', hint = 'kistly:lager.menge'; end if;
  else
    if v_menge <= 0 then raise exception 'Menge ungueltig' using errcode = 'check_violation', hint = 'kistly:lager.menge'; end if;
    if not public.lager_eingetragen(b.project_id) then
      raise exception 'Erst am Tuer eintragen' using errcode = 'insufficient_privilege', hint = 'kistly:lager.nicht_eingetragen';
    end if;
  end if;
  if p_art = 'ausleihe' and (p_faellig is null or p_faellig <= now() - interval '1 minute') then
    raise exception 'Rueckgabetermin fehlt' using errcode = 'check_violation', hint = 'kistly:lager.termin';
  end if;

  if p_art in ('entnahme', 'ausleihe') then
    if v_menge > b.menge then
      raise exception 'Nicht genug da' using errcode = 'check_violation', hint = 'kistly:lager.zu_wenig', detail = json_build_object('n', b.menge, 'einheit', b.einheit)::text;
    end if;
    v_neu := b.menge - v_menge;
  elsif p_art = 'zugang' then
    v_neu := b.menge + v_menge;
  else
    v_neu := v_menge;
  end if;

  perform set_config('magazino.buchung', 'ja', true);
  update public.bestand set
    menge = v_neu,
    knapp_seit = case when mindestmenge > 0 and v_neu <= mindestmenge then coalesce(knapp_seit, now()) else null end,
    knapp_push_am = case when mindestmenge > 0 and v_neu <= mindestmenge then knapp_push_am else null end
   where id = b.id returning * into b;
  perform set_config('magazino.buchung', '', true);

  insert into public.bestand_buchungen (project_id, bestand_id, user_id, art, menge, rest, notiz)
  values (b.project_id, b.id, auth.uid(), p_art, v_menge, v_neu, left(p_notiz, 200));
  if p_art = 'ausleihe' then
    insert into public.ausleihen (project_id, bestand_id, user_id, menge, faellig_am, notiz)
    values (b.project_id, b.id, auth.uid(), v_menge, p_faellig, left(p_notiz, 200));
  end if;
  v_name := b.name;
  perform public.aktivitaet_schreiben(b.project_id, p_art,
    v_menge::text || ' ' || b.einheit || ' ' || v_name || case p_art when 'zugang' then ' hinzugefuegt' when 'korrektur' then ' gezaehlt' else '' end);
  return b;
end $fn$;

-- ---- M6: Eintragen laeuft nach 12 Stunden ab --------------------------
select cron.unschedule(jobid) from cron.job where jobname = 'magazino-austragen';
select cron.schedule('magazino-austragen', '17 * * * *', $job$
  update public.lager_zugang set raus_am = rein_am + interval '12 hours'
   where raus_am is null and rein_am < now() - interval '12 hours'
$job$);
do $t$
declare v_admin uuid := '5fae3827-33eb-45be-9211-c665b3fad0b8'; v_ex uuid := gen_random_uuid(); v_ed uuid := gen_random_uuid(); b text := ''; p uuid; bl uuid; best public.bestand; n int; r text;
begin
  insert into auth.users (id, email, instance_id, aud, role, encrypted_password) values
    (v_ex, 'ex@example.invalid', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'x'),
    (v_ed, 'ed@example.invalid', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'y');
  insert into public.konto_freigaben (user_id, status) values (v_ex, 'frei'), (v_ed, 'frei') on conflict (user_id) do update set status='frei';
  select id, bl_projekt_id into p, bl from public.projects order by created_at limit 1;
  insert into public.project_members (project_id, user_id, role) values (p, v_ed, 'editor');
  -- H1: Admin ernennen, dann entziehen
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.admin_admin_setzen(v_ex, true);
  perform public.admin_admin_setzen(v_ex, false);
  reset role;
  select count(*) into n from public.project_members where user_id = v_ex and role = 'owner';
  b := b || 'H1 Ex-Admin Besitzer-Zeilen ' || n || ' (erwartet 0); ';
  -- N7: Konto mit Startpasswort wird nicht Admin
  update public.konto_freigaben set start_hash = 'y' where user_id = v_ed;
  set local role authenticated;
  begin perform public.admin_admin_setzen(v_ed, true); b := b || 'FEHLER N7; '; exception when others then b := b || 'N7 abgelehnt ok; '; end;
  reset role;
  update public.konto_freigaben set start_hash = null where user_id = v_ed;
  -- als Bearbeiter
  insert into public.lager_zugang (project_id, user_id) values (p, v_ed);
  perform set_config('request.jwt.claims', json_build_object('sub', v_ed, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.bestand (project_id, name, menge, mindestmenge) values (p, 'Pruefding', 10, 20) returning * into best;
  b := b || 'M5 knapp beim Anlegen: ' || (best.knapp_seit is not null) || '; ';
  begin delete from public.bestand where id = best.id; b := b || 'FEHLER M1 direkt geloescht; '; exception when others then b := b || 'M1 direktes Loeschen abgelehnt ok; '; end;
  begin perform public.bestand_buchen(best.id, 'zugang', 'NaN'::numeric); b := b || 'FEHLER NaN; '; exception when others then b := b || 'M2 NaN abgelehnt ok; '; end;
  best := public.bestand_buchen(best.id, 'zugang', 5.004);
  b := b || 'M7 gerundet: ' || best.menge || ' (erwartet 15.00); ';
  update public.bestand set mindestmenge = 5 where id = best.id;
  select * into best from public.bestand where id = best.id;
  b := b || 'M5 knapp nach Senken: ' || (best.knapp_seit is null) || ' (erwartet true); ';
  begin update public.bestand set project_id = project_id where id = best.id; b := b || 'gleiches Lager ok; '; exception when others then b := b || 'FEHLER gleiches Lager; '; end;
  begin update public.projects set bl_projekt_id = gen_random_uuid() where id = p; b := b || 'FEHLER M11 BL umgehaengt; '; exception when others then b := b || 'M11 BL-Wechsel abgelehnt ok; '; end;
  begin perform public.lager_betreten(p); perform public.lager_betreten(p); b := b || 'N5 doppelt ok; '; exception when others then b := b || 'FEHLER N5 ' || sqlerrm || '; '; end;
  begin perform public.startpasswort_merken_dienst(v_ed); b := b || 'FEHLER Dienstfunktion aufrufbar; '; exception when others then b := b || 'Dienstfunktion fuer Nutzer gesperrt ok; '; end;
  reset role;
  begin insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values (v_ed, 'https://intern.example/hook', 'a', 'b'); b := b || 'FEHLER M3; '; exception when others then b := b || 'M3 fremde Push-Adresse abgelehnt ok; '; end;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values (v_ed, 'https://fcm.googleapis.com/fcm/send/abc', 'a', 'b');
  b := b || 'FCM-Adresse ok';
  raise exception 'PROBELAUF 0062: %', b;
end $t$;
rollback;
