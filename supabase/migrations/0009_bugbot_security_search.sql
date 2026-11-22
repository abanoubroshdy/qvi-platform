-- Bugbot follow-ups: restrict device RPC, allow admin user search by UUID.

revoke execute on function public.register_license_device(uuid, text, text) from anon;
revoke execute on function public.register_license_device(uuid, text, text) from authenticated;

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
        where
          v_q = ''
          or u.email ilike v_pattern
          or (v_uuid is not null and u.id = v_uuid)
        order by u.created_at desc
        limit v_limit
        offset v_offset
      ) as t
    ),
    'total', (
      select count(*)::integer
      from auth.users u
      where
        v_q = ''
        or u.email ilike v_pattern
        or (v_uuid is not null and u.id = v_uuid)
    )
  );
end;
$$;

revoke all on function public.admin_search_users(text, integer, integer) from public;
grant execute on function public.admin_search_users(text, integer, integer) to service_role;