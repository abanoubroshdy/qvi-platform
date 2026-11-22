-- Admin dashboard: contact inbox, waitlist handling, stats RPCs.
-- Run in the Supabase SQL editor after 0007_licensing_security.sql.

create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  status text not null default 'new' check (status in ('new', 'handled')),
  created_at timestamptz not null default now(),
  handled_at timestamptz,
  handled_by uuid references auth.users (id) on delete set null
);

create index if not exists contact_submissions_status_created_idx
  on public.contact_submissions (status, created_at desc);

alter table public.contact_submissions enable row level security;

grant select, insert, update on table public.contact_submissions to service_role;

alter table public.waitlist_signups
  add column if not exists status text not null default 'new',
  add column if not exists handled_at timestamptz;

alter table public.waitlist_signups
  drop constraint if exists waitlist_signups_status_check;

alter table public.waitlist_signups
  add constraint waitlist_signups_status_check
  check (status in ('new', 'handled'));

grant select, update on table public.waitlist_signups to service_role;

grant select on table public.profiles to service_role;
grant select on table public.qv1_downloads to service_role;

create or replace function public.admin_dashboard_stats()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_users jsonb;
  v_licenses jsonb;
  v_active_devices integer;
  v_qv1 jsonb;
  v_recent jsonb;
begin
  select jsonb_build_object(
    'total', (select count(*)::integer from auth.users),
    'new_7d', (
      select count(*)::integer
      from auth.users
      where created_at >= now() - interval '7 days'
    ),
    'new_30d', (
      select count(*)::integer
      from auth.users
      where created_at >= now() - interval '30 days'
    )
  )
  into v_users;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'product_code', lp.code,
        'product_name', lp.name,
        'status', l.status,
        'count', l.cnt
      )
      order by lp.code, l.status
    ),
    '[]'::jsonb
  )
  into v_licenses
  from (
    select product_id, status, count(*)::integer as cnt
    from public.licenses
    group by product_id, status
  ) l
  join public.license_products lp on lp.id = l.product_id;

  select count(*)::integer
  into v_active_devices
  from public.license_devices
  where revoked_at is null;

  select jsonb_build_object(
    'total', (select count(*)::integer from public.qv1_downloads),
    'last_30d', (
      select count(*)::integer
      from public.qv1_downloads
      where created_at >= now() - interval '30 days'
    )
  )
  into v_qv1;

  select coalesce(
    jsonb_agg(
      jsonb_build_object('email', u.email, 'created_at', u.created_at)
      order by u.created_at desc
    ),
    '[]'::jsonb
  )
  into v_recent
  from (
    select email, created_at
    from auth.users
  order by created_at desc
    limit 10
  ) u;

  return jsonb_build_object(
    'users', v_users,
    'licenses', v_licenses,
    'active_devices', v_active_devices,
    'qv1_downloads', v_qv1,
    'recent_signups', v_recent
  );
end;
$$;

revoke all on function public.admin_dashboard_stats() from public;
grant execute on function public.admin_dashboard_stats() to service_role;

create or replace function public.admin_search_users(
  p_query text,
  p_limit integer default 25,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 25), 100));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
  v_q text := btrim(coalesce(p_query, ''));
  v_pattern text := '%' || v_q || '%';
begin
  return jsonb_build_object(
    'users', (
      select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      from (
        select
          u.id,
          u.email,
          u.created_at,
          u.last_sign_in_at,
          u.banned_until,
          (u.banned_until is not null and u.banned_until > now()) as is_banned
        from auth.users u
        where v_q = '' or u.email ilike v_pattern
        order by u.created_at desc
        limit v_limit
        offset v_offset
      ) as t
    ),
    'total', (
      select count(*)::integer
      from auth.users u
      where v_q = '' or u.email ilike v_pattern
    )
  );
end;
$$;

revoke all on function public.admin_search_users(text, integer, integer) from public;
grant execute on function public.admin_search_users(text, integer, integer) to service_role;