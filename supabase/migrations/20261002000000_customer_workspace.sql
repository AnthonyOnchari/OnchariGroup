create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  phone text,
  role text not null default 'customer' check (role in ('customer', 'staff')),
  created_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  reference text not null unique default ('OG-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  service text not null,
  project_title text,
  business text,
  preferred_date date not null,
  preferred_time text not null default 'Flexible',
  project_format text not null default 'To be agreed',
  brief text not null,
  contact_name text not null,
  contact_email text,
  contact_phone text not null,
  status text not null default 'requested' check (status in ('requested', 'quoted', 'quote_accepted', 'invoiced', 'paid', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  doc_number text not null unique,
  doc_type text not null check (doc_type in ('estimate', 'invoice', 'receipt')),
  status text not null default 'issued' check (status in ('issued', 'accepted', 'paid', 'void')),
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'KES' check (currency = 'KES'),
  due_at date,
  file_path text,
  payment_reference text,
  paid_at timestamptz,
  issued_at timestamptz not null default now(),
  accepted_at timestamptz
);

create table if not exists public.booking_messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  sender_role text not null check (sender_role in ('customer', 'staff')),
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);

create table if not exists public.deliverables (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  file_path text not null,
  uploaded_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists bookings_owner_created_idx on public.bookings (owner_id, created_at desc);
create index if not exists documents_booking_issued_idx on public.documents (booking_id, issued_at desc);
create index if not exists messages_booking_created_idx on public.booking_messages (booking_id, created_at);
create index if not exists deliverables_booking_created_idx on public.deliverables (booking_id, created_at desc);
create unique index if not exists documents_one_active_estimate_idx on public.documents (booking_id)
  where doc_type = 'estimate' and status in ('issued', 'accepted');
create unique index if not exists documents_one_invoice_idx on public.documents (booking_id)
  where doc_type = 'invoice' and status in ('issued', 'paid');
create unique index if not exists documents_one_receipt_idx on public.documents (booking_id)
  where doc_type = 'receipt' and status <> 'void';

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'staff'
  );
$$;

create or replace function public.create_customer_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.phone
  )
  on conflict (id) do update
    set display_name = coalesce(public.profiles.display_name, excluded.display_name),
        phone = excluded.phone;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert or update of phone on auth.users
  for each row execute procedure public.create_customer_profile();

create or replace function public.guard_document_sequence()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estimate_amount numeric(12, 2);
begin
  if not exists (
    select 1 from public.bookings b
    where b.id = new.booking_id and b.owner_id = new.owner_id
  ) then
    raise exception 'Document owner must match its booking owner';
  end if;

  if new.doc_type = 'invoice' then
    select d.amount into v_estimate_amount
    from public.documents d
    where d.booking_id = new.booking_id and d.doc_type = 'estimate' and d.status = 'accepted'
    order by d.issued_at desc
    limit 1;

    if v_estimate_amount is null then
      raise exception 'An accepted estimate is required before issuing an invoice';
    end if;

    if new.amount <> v_estimate_amount then
      raise exception 'The invoice amount must match the accepted estimate';
    end if;
  end if;

  if new.doc_type = 'receipt' and not exists (
    select 1 from public.documents d
    where d.booking_id = new.booking_id and d.doc_type = 'invoice' and d.status = 'paid'
  ) then
    raise exception 'A paid invoice is required before issuing a receipt';
  end if;

  return new;
end;
$$;

drop trigger if exists documents_enforce_issue_order on public.documents;
create trigger documents_enforce_issue_order
  before insert on public.documents
  for each row execute procedure public.guard_document_sequence();

create or replace function public.accept_estimate(p_document_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.documents
  set status = 'accepted', accepted_at = now()
  where id = p_document_id
    and owner_id = (select auth.uid())
    and doc_type = 'estimate'
    and status = 'issued';

  if not found then
    raise exception 'Estimate not found or no longer available to accept';
  end if;

  update public.bookings
  set status = 'quote_accepted', updated_at = now()
  where id = (select booking_id from public.documents where id = p_document_id);
end;
$$;

create or replace function public.record_invoice_payment(
  p_invoice_id uuid,
  p_payment_reference text,
  p_paid_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invoice public.documents%rowtype;
  v_receipt_id uuid;
begin
  if not public.is_staff() then
    raise exception 'Only staff can confirm a payment';
  end if;

  if nullif(trim(p_payment_reference), '') is null then
    raise exception 'A payment reference is required';
  end if;

  update public.documents
  set status = 'paid', payment_reference = trim(p_payment_reference), paid_at = p_paid_at
  where id = p_invoice_id and doc_type = 'invoice' and status = 'issued'
  returning * into v_invoice;

  if not found then
    raise exception 'Issued invoice not found';
  end if;

  update public.bookings set status = 'paid', updated_at = now() where id = v_invoice.booking_id;

  insert into public.documents (booking_id, owner_id, doc_number, doc_type, amount, currency, payment_reference, paid_at)
  values (
    v_invoice.booking_id,
    v_invoice.owner_id,
    v_invoice.doc_number || '-R',
    'receipt',
    v_invoice.amount,
    v_invoice.currency,
    trim(p_payment_reference),
    p_paid_at
  )
  returning id into v_receipt_id;

  return v_receipt_id;
end;
$$;

insert into storage.buckets (id, name, public)
values ('customer-documents', 'customer-documents', false), ('customer-deliverables', 'customer-deliverables', false)
on conflict (id) do update set public = false;

alter table public.profiles enable row level security;
alter table public.bookings enable row level security;
alter table public.documents enable row level security;
alter table public.booking_messages enable row level security;
alter table public.deliverables enable row level security;

drop policy if exists "Profiles readable by owner and staff" on public.profiles;
create policy "Profiles readable by owner and staff" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_staff());
drop policy if exists "Customers update own contact details" on public.profiles;
create policy "Customers update own contact details" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke insert, update, delete on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, phone) on public.profiles to authenticated;

drop policy if exists "Customers create own bookings" on public.bookings;
create policy "Customers create own bookings" on public.bookings for insert to authenticated
  with check (owner_id = (select auth.uid()));
drop policy if exists "Owners and staff read bookings" on public.bookings;
create policy "Owners and staff read bookings" on public.bookings for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_staff());
drop policy if exists "Staff manage bookings" on public.bookings;
create policy "Staff manage bookings" on public.bookings for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
grant select, insert, update, delete on public.bookings to authenticated;

drop policy if exists "Owners and staff read documents" on public.documents;
create policy "Owners and staff read documents" on public.documents for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_staff());
drop policy if exists "Staff manage documents" on public.documents;
create policy "Staff manage documents" on public.documents for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
grant select, insert, update, delete on public.documents to authenticated;

drop policy if exists "Booking participants read messages" on public.booking_messages;
create policy "Booking participants read messages" on public.booking_messages for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_staff());
drop policy if exists "Booking participants send messages" on public.booking_messages;
create policy "Booking participants send messages" on public.booking_messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and (
      (sender_role = 'customer' and owner_id = (select auth.uid()) and exists (
        select 1 from public.bookings b where b.id = booking_id and b.owner_id = (select auth.uid())
      ))
      or (sender_role = 'staff' and public.is_staff())
    )
  );
grant select, insert on public.booking_messages to authenticated;

drop policy if exists "Owners and staff read deliverables" on public.deliverables;
create policy "Owners and staff read deliverables" on public.deliverables for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_staff());
drop policy if exists "Staff manage deliverables" on public.deliverables;
create policy "Staff manage deliverables" on public.deliverables for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
grant select, insert, update, delete on public.deliverables to authenticated;

drop policy if exists "Owners read their private documents" on storage.objects;
create policy "Owners read their private documents" on storage.objects for select to authenticated
  using (
    bucket_id = 'customer-documents'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_staff())
  );
drop policy if exists "Staff manage private documents" on storage.objects;
create policy "Staff manage private documents" on storage.objects for all to authenticated
  using (bucket_id = 'customer-documents' and public.is_staff())
  with check (bucket_id = 'customer-documents' and public.is_staff());

drop policy if exists "Owners read their private deliverables" on storage.objects;
create policy "Owners read their private deliverables" on storage.objects for select to authenticated
  using (
    bucket_id = 'customer-deliverables'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_staff())
  );
drop policy if exists "Staff manage private deliverables" on storage.objects;
create policy "Staff manage private deliverables" on storage.objects for all to authenticated
  using (bucket_id = 'customer-deliverables' and public.is_staff())
  with check (bucket_id = 'customer-deliverables' and public.is_staff());

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'booking_messages'
    ) then
    alter publication supabase_realtime add table public.booking_messages;
  end if;
end;
$$;

grant execute on function public.accept_estimate(uuid) to authenticated;
grant execute on function public.record_invoice_payment(uuid, text, timestamptz) to authenticated;