-- Stop collecting gender, date of birth, and phone.
-- Those columns stay nullable so existing rows are not wiped.
-- New accounts confirm they are at least 13 instead of entering a date of birth.

alter table public.profiles
  add column if not exists age_confirmed boolean not null default false;

comment on column public.profiles.gender is
  'Legacy. No longer collected at signup. Left in place so existing rows are not wiped.';

comment on column public.profiles.date_of_birth is
  'Legacy. No longer collected at signup. Left in place so existing rows are not wiped.';

comment on column public.profiles.phone is
  'Legacy. No longer collected at signup. Left in place so existing rows are not wiped.';

comment on column public.profiles.age_confirmed is
  'User confirmed they are at least 13 years old. Replaces date-of-birth collection.';

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

  insert into public.profiles (
    id,
    full_name,
    gender,
    country,
    date_of_birth,
    phone,
    privacy_consent,
    marketing_consent,
    age_confirmed
  )
  values (
    new.id,
    nullif(btrim(meta->>'full_name'), ''),
    nullif(meta->>'gender', ''),
    nullif(meta->>'country', ''),
    dob,
    nullif(meta->>'phone', ''),
    coalesce((meta->>'privacy_consent')::boolean, false),
    coalesce((meta->>'marketing_consent')::boolean, false),
    coalesce((meta->>'age_confirmed')::boolean, false)
  )
  on conflict (id) do update set
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    gender = coalesce(excluded.gender, public.profiles.gender),
    country = coalesce(excluded.country, public.profiles.country),
    date_of_birth = coalesce(excluded.date_of_birth, public.profiles.date_of_birth),
    phone = coalesce(excluded.phone, public.profiles.phone),
    privacy_consent = excluded.privacy_consent or public.profiles.privacy_consent,
    marketing_consent = excluded.marketing_consent or public.profiles.marketing_consent,
    age_confirmed = excluded.age_confirmed or public.profiles.age_confirmed,
    updated_at = now();

  return new;
end;
$$;
