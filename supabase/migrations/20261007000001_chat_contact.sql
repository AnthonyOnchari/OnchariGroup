alter table public.chat_logs add column if not exists visitor_name text check (visitor_name is null or char_length(visitor_name) <= 120);
alter table public.chat_logs add column if not exists visitor_contact text check (visitor_contact is null or char_length(visitor_contact) <= 160);

notify pgrst, 'reload schema';
