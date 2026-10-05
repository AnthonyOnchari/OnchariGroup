alter table public.profiles add column if not exists country text;
alter table public.profiles drop constraint if exists profiles_country_format;
alter table public.profiles add constraint profiles_country_format
  check (country is null or country ~ '^[A-Z]{2}$');

grant update (display_name, phone, username, avatar_path, country) on public.profiles to authenticated;
