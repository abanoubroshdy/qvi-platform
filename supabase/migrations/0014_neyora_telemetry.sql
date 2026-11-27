-- Neyora beta training telemetry: opt-in consent on profiles and submission tracking.

-- Two-tier training consent on profiles (revocable at any time via API).
alter table public.profiles
  add column if not exists training_metadata_consent boolean not null default false,
  add column if not exists training_audio_consent boolean not null default false,
  add column if not exists training_consent_version text,
  add column if not exists training_consented_at timestamptz,
  add column if not exists training_consent_updated_at timestamptz;

comment on column public.profiles.training_metadata_consent is
  'Opt-in for lightweight Neyora training metadata (lm, composer, performer).';
comment on column public.profiles.training_audio_consent is
  'Opt-in for Neyora training audio uploads (rmvpe).';

grant update (
  training_metadata_consent,
  training_audio_consent,
  training_consent_version,
  training_consented_at,
  training_consent_updated_at
) on table public.profiles to service_role;

create table if not exists public.neyora_training_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  model_target text not null check (model_target in ('lm', 'composer', 'performer', 'rmvpe')),
  r2_key text not null,
  content_type text not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'rejected')),
  sha256 text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  sample_count integer check (sample_count is null or sample_count >= 0),
  app_version text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists neyora_training_submissions_user_created_idx
  on public.neyora_training_submissions (user_id, created_at desc);

create index if not exists neyora_training_submissions_user_status_idx
  on public.neyora_training_submissions (user_id, status);

create index if not exists neyora_training_submissions_pending_idx
  on public.neyora_training_submissions (created_at)
  where status = 'pending';

alter table public.neyora_training_submissions enable row level security;

grant select, insert, update on table public.neyora_training_submissions to service_role;

-- Per-user contribution aggregates for future rewards/credits (service_role only).
create or replace view public.neyora_training_contribution_stats as
select
  user_id,
  max(email) as email,
  count(*) filter (where status = 'completed')::bigint as completed_submissions_count,
  coalesce(sum(sample_count) filter (where status = 'completed'), 0)::bigint as accepted_samples_count,
  coalesce(sum(size_bytes) filter (where status = 'completed'), 0)::bigint as total_bytes_contributed
from public.neyora_training_submissions
group by user_id;

grant select on public.neyora_training_contribution_stats to service_role;