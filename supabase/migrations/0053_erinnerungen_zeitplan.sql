-- =====================================================================
-- Magazino 0053_erinnerungen_zeitplan (E103, Stufe 6)
--
-- Alle 30 Minuten ruft die Datenbank die Server-Funktion "erinnern" auf
-- (pg_cron plus pg_net). Die Funktion schickt Erinnerungen an Ausleiher und
-- Zustaendige. Weil der Zeitplan keinen Nutzer-Token hat, schuetzt ein
-- zufaelliges Zeichen (ERINNERN_TOKEN) den Aufruf. Es entsteht hier, liegt
-- nur in private.config (nicht ueber die Schnittstelle lesbar) und wird nie
-- ausgegeben.
--
-- Mehrfaches Ausfuehren ist ungefaehrlich: Zeichen bleibt, Zeitplan wird
-- neu gesetzt.
-- =====================================================================

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

insert into private.config (key, value, note)
select 'ERINNERN_TOKEN', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
       'Zugangszeichen fuer den Zeitplan der Funktion erinnern (0053)'
 where not exists (select 1 from private.config where key = 'ERINNERN_TOKEN');

select cron.unschedule(jobid) from cron.job where jobname = 'magazino-erinnern';

select cron.schedule('magazino-erinnern', '*/30 * * * *', $job$
  select net.http_post(
    url := 'https://vqpirkgvclfsduklnnzv.supabase.co/functions/v1/erinnern',
    headers := jsonb_build_object('Content-Type', 'application/json',
                                  'x-cron-token', (select value from private.config where key = 'ERINNERN_TOKEN')),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000)
$job$);
