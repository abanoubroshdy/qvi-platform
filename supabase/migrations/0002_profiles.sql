-- User profile fields collected at registration (name, gender, country, DOB, phone).
-- Columns are nullable so existing auth users can sign in and complete their profile later.
-- New signups persist these values on auth.users.raw_user_meta_data; a trigger copies them here.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  gender text check (gender is null or gender in ('male', 'female', 'prefer_not_to_say')),
  country text check (country is null or country ~ '^[A-Z]{2}$'),
  date_of_birth date,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_country_idx on public.profiles (country);

alter table public.profiles enable row level security;

grant select, insert, update on public.profiles to authenticated;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute procedure public.set_profiles_updated_at();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  dob date;
begin
  begin
    if nullif(meta->>'date_of_birth', '') is not null then
      dob := (meta->>'date_of_birth')::date;
    end if;
  exception
    when others then
      dob := null;
  end;

  insert into public.profiles (id, full_name, gender, country, date_of_birth, phone)
  values (
    new.id,
    nullif(btrim(meta->>'full_name'), ''),
    nullif(meta->>'gender', ''),
    nullif(meta->>'country', ''),
    dob,
    nullif(meta->>'phone', '')
  )
  on conflict (id) do update set
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    gender = coalesce(excluded.gender, public.profiles.gender),
    country = coalesce(excluded.country, public.profiles.country),
    date_of_birth = coalesce(excluded.date_of_birth, public.profiles.date_of_birth),
    phone = coalesce(excluded.phone, public.profiles.phone),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user_profile();

-- Backfill rows for accounts that already exist without a profile.
insert into public.profiles (id, full_name, gender, country, date_of_birth, phone)
select
  u.id,
  nullif(btrim(u.raw_user_meta_data->>'full_name'), ''),
  nullif(u.raw_user_meta_data->>'gender', ''),
  nullif(u.raw_user_meta_data->>'country', ''),
  case
    when coalesce(u.raw_user_meta_data->>'date_of_birth', '') ~ '^\d{4}-\d{2}-\d{2}'
      then (u.raw_user_meta_data->>'date_of_birth')::date
    else null
  end,
  nullif(u.raw_user_meta_data->>'phone', '')
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;
