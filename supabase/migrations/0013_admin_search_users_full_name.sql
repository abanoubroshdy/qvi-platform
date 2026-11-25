-- Admin user search: match display name (profile + auth metadata), order aggregated rows.

create or replace function public.admin_search_users(
  p_query text,
  p_limit integer default 25,
  p_offset integer default 0,
  p_unconfirmed_only boolean default false,
  p_never_signed_in boolean default false,
  p_created_since timestamptz default null,
  p_created_until timestamptz default null
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
  v_uuid uuid := null;
begin
  if v_q ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    begin
      v_uuid := v_q::uuid;
    exception
      when others then
        v_uuid := null;
    end;
  end if;

  return jsonb_build_object(
    'users', (
      select coalesce(jsonb_agg(row_to_json(t) order by t.created_at desc), '[]'::jsonb)
      from (
        select
          u.id,
          u.email,
          coalesce(
            nullif(btrim(p.full_name), ''),
            nullif(btrim(u.raw_user_meta_data->>'full_name'), '')
          ) as full_name,
          u.created_at,
          u.last_sign_in_at,
          u.banned_until,
          (u.banned_until is not null and u.banned_until > now()) as is_banned,
          (u.email_confirmed_at is not null) as email_confirmed
        from auth.users u
        left join public.profiles p on p.id = u.id
        where
          (
            v_q = ''
            or u.email ilike v_pattern
            or (v_uuid is not null and u.id = v_uuid)
            or coalesce(
              nullif(btrim(p.full_name), ''),
              nullif(btrim(u.raw_user_meta_data->>'full_name'), '')
            ) ilike v_pattern
          )
          and (not coalesce(p_unconfirmed_only, false) or u.email_confirmed_at is null)
          and (not coalesce(p_never_signed_in, false) or u.last_sign_in_at is null)
          and (p_created_since is null or u.created_at >= p_created_since)
          and (p_created_until is null or u.created_at <= p_created_until)
        order by u.created_at desc
        limit v_limit
        offset v_offset
      ) as t
    ),
    'total', (
      select count(*)::integer
      from auth.users u
      left join public.profiles p on p.id = u.id
      where
        (
          v_q = ''
          or u.email ilike v_pattern
          or (v_uuid is not null and u.id = v_uuid)
          or coalesce(
            nullif(btrim(p.full_name), ''),
            nullif(btrim(u.raw_user_meta_data->>'full_name'), '')
          ) ilike v_pattern
        )
        and (not coalesce(p_unconfirmed_only, false) or u.email_confirmed_at is null)
        and (not coalesce(p_never_signed_in, false) or u.last_sign_in_at is null)
        and (p_created_since is null or u.created_at >= p_created_since)
        and (p_created_until is null or u.created_at <= p_created_until)
    )
  );
end;
$$;

revoke all on function public.admin_search_users(
  text,
  integer,
  integer,
  boolean,
  boolean,
  timestamptz,
  timestamptz
) from public;
grant execute on function public.admin_search_users(
  text,
  integer,
  integer,
  boolean,
  boolean,
  timestamptz,
  timestamptz
) to service_role;