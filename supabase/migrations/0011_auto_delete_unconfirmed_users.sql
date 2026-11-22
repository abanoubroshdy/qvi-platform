-- Auto-delete stale unconfirmed accounts (7+ days) with audit trail.
-- Keep emails listed in protected_admin_emails in sync with ADMIN_EMAILS / LICENSE_ADMIN_EMAILS.

create table if not exists public.protected_admin_emails (
  email text primary key
);

comment on table public.protected_admin_emails is
  'Admin inboxes that must never be auto-deleted. Insert rows to match ADMIN_EMAILS and LICENSE_ADMIN_EMAILS.';

alter table public.protected_admin_emails enable row level security;
grant select, insert, delete on table public.protected_admin_emails to service_role;

create extension if not exists pg_cron with schema extensions;

create or replace function public.auto_delete_unconfirmed_users()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  victim record;
begin
  for victim in
    select u.id, u.email
    from auth.users u
    where u.email_confirmed_at is null
      and u.last_sign_in_at is null
      and u.created_at < now() - interval '7 days'
      and (
        u.email is null
        or not exists (
          select 1
          from public.protected_admin_emails p
          where lower(p.email) = lower(u.email)
        )
      )
  loop
    insert into public.admin_audit_log (
      actor_user_id,
      actor_email,
      action,
      target_user_id,
      target_email,
      metadata
    )
    values (
      null,
      null,
      'auto_delete_unconfirmed',
      victim.id,
      victim.email,
      jsonb_build_object('created_via', 'pg_cron')
    );

    delete from auth.users where id = victim.id;
  end loop;
end;
$$;

revoke all on function public.auto_delete_unconfirmed_users() from public;
grant execute on function public.auto_delete_unconfirmed_users() to service_role;

do $cron$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'auto_delete_unconfirmed_users'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'auto_delete_unconfirmed_users',
    '5 4 * * *',
    $cmd$select public.auto_delete_unconfirmed_users();$cmd$
  );
end;
$cron$;