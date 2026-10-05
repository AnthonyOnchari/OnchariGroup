create table if not exists public.chat_logs (
  id uuid primary key default gen_random_uuid(),
  session_id text not null check (char_length(session_id) between 8 and 64),
  user_id uuid references auth.users (id) on delete set null,
  sender text not null check (sender in ('visitor', 'assistant')),
  body text not null check (char_length(body) between 1 and 2000),
  page text check (page is null or char_length(page) <= 200),
  created_at timestamptz not null default now()
);
create index if not exists chat_logs_session_idx on public.chat_logs (session_id, created_at);
create index if not exists chat_logs_created_idx on public.chat_logs (created_at desc);

create table if not exists public.chat_followups (
  session_id text primary key,
  status text not null default 'open' check (status in ('open', 'followed_up')),
  note text check (note is null or char_length(note) <= 2000),
  updated_at timestamptz not null default now()
);

alter table public.chat_logs enable row level security;
alter table public.chat_followups enable row level security;

drop policy if exists "Anyone can log chat messages" on public.chat_logs;
create policy "Anyone can log chat messages" on public.chat_logs for insert to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid()));
drop policy if exists "Staff read chat logs" on public.chat_logs;
create policy "Staff read chat logs" on public.chat_logs for select to authenticated
  using (public.is_staff());
drop policy if exists "Staff delete chat logs" on public.chat_logs;
create policy "Staff delete chat logs" on public.chat_logs for delete to authenticated
  using (public.is_staff());
grant insert on public.chat_logs to anon, authenticated;
grant select, delete on public.chat_logs to authenticated;

drop policy if exists "Staff manage chat followups" on public.chat_followups;
create policy "Staff manage chat followups" on public.chat_followups for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
grant select, insert, update, delete on public.chat_followups to authenticated;

notify pgrst, 'reload schema';
