-- Product licensing: licenses, devices, events, releases.
-- Run in the Supabase SQL editor after prior migrations.

create table if not exists public.license_products (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  max_devices_default integer not null default 2 check (max_devices_default >= 1),
  is_free boolean not null default false,
  download_artifact_key text,
  created_at timestamptz not null default now()
);

create table if not exists public.licenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.license_products (id) on delete restrict,
  license_key_hash text not null unique,
  license_key_hint text not null,
  status text not null default 'active' check (status in ('active', 'expired', 'revoked')),
  max_devices integer not null default 2 check (max_devices >= 1),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists licenses_user_id_idx on public.licenses (user_id);
create index if not exists licenses_product_id_idx on public.licenses (product_id);
create index if not exists licenses_status_idx on public.licenses (status);

create table if not exists public.license_devices (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references public.licenses (id) on delete cascade,
  device_fingerprint_hash text not null,
  device_name text,
  activated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (license_id, device_fingerprint_hash)
);

create index if not exists license_devices_license_id_idx on public.license_devices (license_id);
create index if not exists license_devices_active_idx
  on public.license_devices (license_id)
  where revoked_at is null;

create table if not exists public.license_events (
  id uuid primary key default gen_random_uuid(),
  license_id uuid references public.licenses (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  product_id uuid references public.license_products (id) on delete set null,
  event_type text not null,
  device_fingerprint_hash text,
  ip_address text,
  user_agent text,
  success boolean not null default true,
  error_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists license_events_license_created_idx
  on public.license_events (license_id, created_at desc);
create index if not exists license_events_type_created_idx
  on public.license_events (event_type, created_at desc);

create table if not exists public.license_releases (
  id uuid primary key default gen_random_uuid(),
  product_code text not null references public.license_products (code) on delete cascade,
  version text not null,
  channel text not null check (channel in ('evaluation', 'stable', 'beta')),
  storage_path text not null,
  sha256 text not null,
  min_license text,
  release_notes text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  unique (product_code, version, channel)
);

create index if not exists license_releases_product_channel_idx
  on public.license_releases (product_code, channel, created_at desc);

alter table public.license_products enable row level security;
alter table public.licenses enable row level security;
alter table public.license_devices enable row level security;
alter table public.license_events enable row level security;
alter table public.license_releases enable row level security;

grant select on public.license_products to authenticated, anon;
grant select on public.license_releases to authenticated, anon;
grant select, update on public.licenses to authenticated;
grant select on public.license_devices to authenticated;
grant select on public.license_events to authenticated;

drop policy if exists "license_products_read" on public.license_products;
create policy "license_products_read"
  on public.license_products
  for select
  to authenticated, anon
  using (true);

drop policy if exists "license_releases_read_published" on public.license_releases;
create policy "license_releases_read_published"
  on public.license_releases
  for select
  to authenticated, anon
  using (is_published = true);

drop policy if exists "licenses_select_own" on public.licenses;
create policy "licenses_select_own"
  on public.licenses
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "license_devices_select_own" on public.license_devices;
create policy "license_devices_select_own"
  on public.license_devices
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.licenses l
      where l.id = license_devices.license_id
        and l.user_id = auth.uid()
    )
  );

drop policy if exists "license_events_select_own" on public.license_events;
create policy "license_events_select_own"
  on public.license_events
  for select
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.set_licenses_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists licenses_set_updated_at on public.licenses;
create trigger licenses_set_updated_at
  before update on public.licenses
  for each row
  execute procedure public.set_licenses_updated_at();

-- User may revoke their own active device (not re-activate; server enforces).
create or replace function public.revoke_own_license_device(p_device_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_license_id uuid;
begin
  select d.license_id
  into v_license_id
  from public.license_devices d
  join public.licenses l on l.id = d.license_id
  where d.id = p_device_id
    and d.revoked_at is null
    and l.user_id = auth.uid();

  if v_license_id is null then
    return false;
  end if;

  update public.license_devices
  set revoked_at = now()
  where id = p_device_id;

  insert into public.license_events (
    license_id,
    user_id,
    event_type,
    success,
    metadata
  )
  select
    l.id,
    l.user_id,
    'device_revoked_user',
    true,
    jsonb_build_object('device_id', p_device_id)
  from public.licenses l
  where l.id = v_license_id;

  return true;
end;
$$;

grant execute on function public.revoke_own_license_device(uuid) to authenticated;

insert into public.license_products (code, name, max_devices_default, is_free, download_artifact_key)
values
  ('QV1_EVAL', 'QV1 Evaluation', 1, true, 'qv1/QV1-Setup-Evaluation.exe'),
  ('QV1_PRO', 'QV1 Pro', 2, false, null),
  ('NEYORA_PRO', 'Neyora Pro', 2, false, null)
on conflict (code) do update set
  name = excluded.name,
  max_devices_default = excluded.max_devices_default,
  is_free = excluded.is_free,
  download_artifact_key = coalesce(excluded.download_artifact_key, license_products.download_artifact_key);