-- =====================================================================
-- Magazino 0058_startpasswort_zwang (E107)
--
-- Ein Konto mit Startpasswort vom Admin muss ein eigenes setzen. Bisher
-- stand das nur als Merker im Profil (user_metadata), den die Person selbst
-- aendern kann: wer wollte, kam daran vorbei, und das Startpasswort, das der
-- Admin kennt, blieb gueltig. Jetzt erzwingt es die Datenbank:
--
--  * Beim Setzen eines Startpassworts merkt sich konto_freigaben den
--    Hash dieses Passworts (start_hash, nur der Hash, nie das Passwort).
--  * Solange der aktuelle Hash des Kontos (auth.users.encrypted_password)
--    GLEICH diesem Start-Hash ist, gilt das Konto als nicht freigegeben:
--    ist_freigegeben() ist falsch, damit liefern is_member, is_editor und
--    alle Zeilenregeln nichts. Nur die Einstellungen (Passwort aendern) gehen.
--  * Setzt die Person ein neues Passwort, aendert sich der Hash (bcrypt
--    nimmt jedes Mal ein neues Salz, selbst bei gleichem Text): die Sperre
--    faellt von selbst, ohne dass die Person etwas "melden" muss.
--
-- meine_freigabe() meldet dafuer den Zustand 'passwort'.
-- =====================================================================

alter table public.konto_freigaben add column start_hash text;

create function public.passwort_muss_neu() returns boolean
language sql stable security definer set search_path = public, auth as $fn$
  select exists (
    select 1 from public.konto_freigaben f join auth.users u on u.id = f.user_id
     where f.user_id = auth.uid() and f.start_hash is not null and u.encrypted_password = f.start_hash)
$fn$;
revoke execute on function public.passwort_muss_neu() from public, anon;
grant  execute on function public.passwort_muss_neu() to authenticated;

create or replace function public.ist_freigegeben() returns boolean
language sql stable security definer set search_path = public as $fn$
  select auth.uid() is not null and (
    exists (select 1 from public.app_admins a where a.user_id = auth.uid())
    or (exists (select 1 from public.konto_freigaben f where f.user_id = auth.uid() and f.status = 'frei')
        and not public.passwort_muss_neu()))
$fn$;

create or replace function public.meine_freigabe() returns text
language sql stable security definer set search_path = public as $fn$
  select case
    when auth.uid() is null then 'wartet'
    when exists (select 1 from public.app_admins a where a.user_id = auth.uid()) then 'frei'
    when public.passwort_muss_neu() then 'passwort'
    else coalesce((select f.status from public.konto_freigaben f where f.user_id = auth.uid()), 'wartet')
  end
$fn$;

-- Nach konto-anlegen und passwort-setzen vom Admin aufgerufen: merkt sich den
-- Hash des gerade gesetzten Startpassworts. Nie fuer Admin-Konten.
create function public.admin_startpasswort_merken(p_user uuid) returns void
language plpgsql security definer set search_path = public, auth as $fn$
begin
  if not public.ist_admin() then
    raise exception 'Nur Admins' using errcode = 'insufficient_privilege', hint = 'kistly:admin.kein_zugriff';
  end if;
  if exists (select 1 from public.app_admins where user_id = p_user) then
    raise exception 'Ein Admin-Konto bleibt unberuehrt' using errcode = 'check_violation', hint = 'kistly:admin.letzter';
  end if;
  insert into public.konto_freigaben (user_id, status, start_hash, geaendert_von)
    select p_user, 'wartet', u.encrypted_password, auth.uid() from auth.users u where u.id = p_user
  on conflict (user_id) do update set start_hash = excluded.start_hash;
end $fn$;
revoke execute on function public.admin_startpasswort_merken(uuid) from public, anon;
grant  execute on function public.admin_startpasswort_merken(uuid) to authenticated;
