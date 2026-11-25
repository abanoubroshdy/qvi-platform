-- Store server-side encrypted license plaintext for owner/admin reveal (AES-256-GCM via app).

alter table public.licenses
  add column if not exists license_key_encrypted text;

comment on column public.licenses.license_key_encrypted is
  'Optional AES-256-GCM payload as base64 JSON {v,ct,iv,tag}. Null on legacy rows until regenerate.';