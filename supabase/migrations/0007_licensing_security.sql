-- Security hardening after initial licensing deploy.
-- Run in the Supabase SQL editor after 0006_licensing.sql.

-- 0) PostgREST uses the service_role JWT / sb_secret key; grant table access explicitly.
grant select, insert, update, delete on table public.license_products to service_role;
grant select, insert, update, delete on table public.licenses to service_role;
grant select, insert, update, delete on table public.license_devices to service_role;
grant select, insert, update, delete on table public.license_events to service_role;
grant select, insert, update, delete on table public.license_releases to service_role;

-- 1) Stop exposing paid artifact storage_path via PostgREST (anon/authenticated).
revoke select on public.license_releases from anon;
revoke select on public.license_releases from authenticated;

drop policy if exists "license_releases_read_published" on public.license_releases;

-- Rows remain readable only with the service role (server API / admin).

-- 2) Atomic device registration under max_devices (eliminates activate race).
create or replace function public.register_license_device(
  p_license_id uuid,
  p_fingerprint text,
  p_device_name text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max integer;
  v_active integer;
  v_existing public.license_devices%rowtype;
begin
  if nullif(btrim(p_fingerprint), '') is null then
    return 'invalid_fingerprint';
  end if;

  select max_devices into v_max
  from public.licenses
  where id = p_license_id
  for update;

  if not found then
    return 'invalid_license';
  end if;

  select * into v_existing
  from public.license_devices
  where license_id = p_license_id
    and device_fingerprint_hash = p_fingerprint
  for update;

  if found then
    if v_existing.revoked_at is null then
      update public.license_devices
      set
        last_seen_at = now(),
        device_name = coalesce(nullif(btrim(p_device_name), ''), v_existing.device_name)
      where id = v_existing.id;
      return 'ok';
    end if;

    select count(*)::integer into v_active
    from public.license_devices
    where license_id = p_license_id
      and revoked_at is null;

    if v_active >= v_max then
      return 'device_limit';
    end if;

    update public.license_devices
    set
      revoked_at = null,
      last_seen_at = now(),
      device_name = coalesce(nullif(btrim(p_device_name), ''), v_existing.device_name)
    where id = v_existing.id;
    return 'ok';
  end if;

  select count(*)::integer into v_active
  from public.license_devices
  where license_id = p_license_id
    and revoked_at is null;

  if v_active >= v_max then
    return 'device_limit';
  end if;

  begin
    insert into public.license_devices (license_id, device_fingerprint_hash, device_name)
    values (p_license_id, p_fingerprint, nullif(btrim(p_device_name), ''));
  exception
    when unique_violation then
      select * into v_existing
      from public.license_devices
      where license_id = p_license_id
        and device_fingerprint_hash = p_fingerprint
      for update;

      if v_existing.revoked_at is null then
        return 'ok';
      end if;

      select count(*)::integer into v_active
      from public.license_devices
      where license_id = p_license_id
        and revoked_at is null;

      if v_active >= v_max then
        return 'device_limit';
      end if;

      update public.license_devices
      set revoked_at = null, last_seen_at = now()
      where id = v_existing.id;
  end;

  return 'ok';
end;
$$;

revoke all on function public.register_license_device(uuid, text, text) from public;
grant execute on function public.register_license_device(uuid, text, text) to service_role;