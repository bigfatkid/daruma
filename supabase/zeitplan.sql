-- Daruma: Zeitplan für die Abend-Erinnerung (Stufe 2b)
-- Ruft alle 5 Minuten die Funktion „push“ auf. Sie verschickt nur, was gerade fällig ist.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'daruma-erinnerung',
  '*/5 * * * *',
  $$ select net.http_post(
       url := 'https://exzvyipaoeqymohagwuc.supabase.co/functions/v1/push',
       body := '{"action":"tick"}'::jsonb,
       headers := '{"Content-Type":"application/json"}'::jsonb
     ) $$
);
