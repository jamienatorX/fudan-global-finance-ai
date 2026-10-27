-- Optional trusted-administrator operation, intentionally NOT run by migrations or the app.
-- Apply only to the intended fictional-money database after acceptance and rollout approval.
-- Enable pg_cron using the Supabase dashboard first. Do not grant worker execution to clients.
select cron.schedule(
 'fu-bank-fictional-mandates',
 '* * * * *',
 'select private.bank_jobs_tick();'
);
-- Monitor: select * from cron.job_run_details order by start_time desc limit 20;
-- Stop: select cron.unschedule('fu-bank-fictional-mandates');
-- Pausing the cron does not release reservations; owners can cancel unspent tasks in the app.
