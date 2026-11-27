-- Release metadata for update checks and public download pages
alter table public.license_releases
  add column if not exists file_size bigint,
  add column if not exists mandatory boolean not null default false,
  add column if not exists min_os_version text;

alter table public.license_releases
  drop constraint if exists license_releases_file_size_nonneg;

alter table public.license_releases
  add constraint license_releases_file_size_nonneg
  check (file_size is null or file_size >= 0);