create or replace function public.create_customer_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.phone,
    case when lower(new.email) = 'info.onchari@gmail.com' then 'staff' else 'customer' end
  )
  on conflict (id) do update
    set display_name = coalesce(public.profiles.display_name, excluded.display_name),
        phone = excluded.phone,
        role = case when lower(new.email) = 'info.onchari@gmail.com' then 'staff' else public.profiles.role end;
  return new;
end;
$$;

update public.profiles p
set role = 'staff'
from auth.users u
where p.id = u.id and lower(u.email) = 'info.onchari@gmail.com';
