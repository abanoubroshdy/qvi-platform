-- QV1 Evaluation download history.
-- The site inserts a row when it issues a short-lived download URL.
-- Users can read only their own rows. Run this in the Supabase SQL editor.

create table if not exists public.qv1_downloads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  version text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists qv1_downloads_user_created_idx
  on public.qv1_downloads (user_id, created_at desc);

alter table public.qv1_downloads enable row level security;

grant select, insert on public.qv1_downloads to authenticated;

drop policy if exists "qv1_downloads_select_own" on public.qv1_downloads;
create policy "qv1_downloads_select_own"
  on public.qv1_downloads
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "qv1_downloads_insert_own" on public.qv1_downloads;
create policy "qv1_downloads_insert_own"
  on public.qv1_downloads
  for insert
  to authenticated
  with check (auth.uid() = user_id);
