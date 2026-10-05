alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists avatar_path text;
create unique index if not exists profiles_username_idx on public.profiles (lower(username));
alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format
  check (username is null or username ~ '^[A-Za-z0-9_.]{3,30}$');

grant update (display_name, phone, username, avatar_path) on public.profiles to authenticated;

alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings add constraint bookings_status_check
  check (status in ('requested', 'approved', 'declined', 'quoted', 'quote_accepted', 'invoiced', 'paid', 'in_progress', 'completed', 'cancelled'));

create table if not exists public.saved_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  service text not null,
  project_title text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists saved_items_owner_idx on public.saved_items (owner_id, created_at desc);

alter table public.saved_items enable row level security;
drop policy if exists "Owners manage saved items" on public.saved_items;
create policy "Owners manage saved items" on public.saved_items for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists "Staff read saved items" on public.saved_items;
create policy "Staff read saved items" on public.saved_items for select to authenticated
  using (public.is_staff());
grant select, insert, update, delete on public.saved_items to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 2097152,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Users manage own avatar" on storage.objects;
create policy "Users manage own avatar" on storage.objects for all to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
