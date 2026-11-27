-- Record when Neyora trial training consent was accepted on the web.
-- Run after 0015_neyora_free_trial.sql.

alter table public.profiles
  add column if not exists training_consent_at timestamptz;