-- Neyora free trial: licenses.is_trial, product_trial_settings, profile training consent.
-- Run in the Supabase SQL editor after 0013_admin_search_users_full_name.sql.

alter table public.licenses
  add column if not exists is_trial boolean not null default false;

create unique index if not exists licenses_one_trial_per_user_product_idx
  on public.licenses (user_id, product_id)
  where (is_trial = true);

create table if not exists public.product_trial_settings (
  product_code text primary key references public.license_products (code) on delete cascade,
  enabled boolean not null default true,
  duration_days integer not null default 14 check (duration_days between 1 and 365),
  max_devices integer not null default 1 check (max_devices between 1 and 10),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

insert into public.product_trial_settings (product_code, enabled, duration_days, max_devices)
values ('NEYORA_PRO', true, 14, 1)
on conflict (product_code) do nothing;

alter table public.profiles
  add column if not exists training_consent_version text,
  add column if not exists training_metadata_consent boolean,
  add column if not exists training_audio_consent boolean;

alter table public.product_trial_settings enable row level security;

grant select, insert, update, delete on table public.product_trial_settings to service_role;