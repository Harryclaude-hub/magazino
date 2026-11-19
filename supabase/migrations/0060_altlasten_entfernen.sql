-- =====================================================================
-- Magazino 0060_altlasten_entfernen (E108)
--
-- Entfernt aus der Datenbank, was nur zum alten Umzugsprogramm (Kistly)
-- gehoerte und im Programm nirgends mehr benutzt wird: Chat, Anrufe,
-- Siedlung, Einladungscodes, die Rasterumrechnung. Die Daten waren leer bis
-- auf eine Siedlung (gesichert in Super Claude, _Sicherungen). Der volle
-- alte Stand bleibt im Repo Harryclaude-hub/kistly mit seinen eigenen
-- Migrationen. Dazu:
--  * die Spalte profiles.avatar3d (Figur in der Wohnung),
--  * die Speicherregeln fuer Chat-Medien und Avatare (die leeren Ordner
--    chat-media und avatars loescht Karam im Dashboard, SQL darf das nicht),
--  * Nicht angemeldete Besucher lesen die Kistengroessen nicht mehr.
-- Ohne CASCADE bei Funktionen: haengt noch etwas Gebrauchtes daran, bricht
-- die Migration ab und nichts bleibt zurueck.
-- =====================================================================

drop table public.message_links;
drop table public.message_reactions;
drop table public.messages;
drop table public.call_participants;
drop table public.calls;
drop table public.siedlung_dinge;
drop table public.siedlung_einladeversuche;
drop table public.siedlung_mitglieder;
drop table public.siedlungen;
drop table public.grundriss_umrechnung;
drop table public.project_invites;

drop type public.call_status;
drop type public.message_kind;

-- Live-Kanal-Regeln der Siedlung (haengen an siedlung_darf).
drop policy if exists siedlung_live_lesen on realtime.messages;
drop policy if exists siedlung_live_senden on realtime.messages;

do $m$
declare r record;
begin
  for r in
    select p.oid::regprocedure as f
      from pg_proc p join pg_namespace s on s.oid = p.pronamespace
     where s.nspname = 'public' and p.prokind = 'f'
       and (p.proname ~ '^(siedlung_|call_project$|join_project$|einladung_|invite_|umrechn|grundriss_umrechn)')
  loop
    execute 'drop function ' || r.f;
  end loop;
end $m$;

alter table public.profiles drop column avatar3d;

drop policy if exists kistly_chat_read on storage.objects;
drop policy if exists kistly_chat_write on storage.objects;
drop policy if exists kistly_chat_delete on storage.objects;
drop policy if exists kistly_avatar_read on storage.objects;
drop policy if exists kistly_avatar_write on storage.objects;
drop policy if exists kistly_avatar_update on storage.objects;
drop policy if exists kistly_avatar_delete on storage.objects;

revoke select on public.kisten_groessen from anon;
