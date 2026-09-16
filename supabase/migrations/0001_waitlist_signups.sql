-- QVI waitlist storage
-- Run this in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Authentication (email/password) works out of the box with Supabase Auth and
-- needs no table. This migration only adds durable storage for waitlist signups.

create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  product text not null,
  email text not null,
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (product, email)
);

alter table public.waitlist_signups enable row level security;

-- Anyone (signed in or not) may add themselves to the waitlist.
drop policy if exists "waitlist_insert_anyone" on public.waitlist_signups;
create policy "waitlist_insert_anyone"
  on public.waitlist_signups
  for insert
  to anon, authenticated
  with check (true);

-- No SELECT/UPDATE/DELETE policies are defined, so the collected emails are
-- NOT readable with the public (anon) key. Only the service role and the
-- Supabase dashboard can read them, which keeps signup emails private.
