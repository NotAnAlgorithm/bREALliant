-- Fix username sign-in when public.profiles is missing or empty.
-- Falls back to username stored in auth.users metadata at signup.

create or replace function public.resolve_sign_in_email(login_identifier text)
returns text
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  trimmed text;
  resolved_email text;
begin
  trimmed := trim(login_identifier);
  if trimmed = '' then
    return null;
  end if;

  if position('@' in trimmed) > 0 then
    return lower(trimmed);
  end if;

  if to_regclass('public.profiles') is not null then
    select p.email
    into resolved_email
    from public.profiles as p
    where lower(p.username) = lower(trimmed)
    limit 1;

    if resolved_email is not null then
      return resolved_email;
    end if;
  end if;

  select u.email
  into resolved_email
  from auth.users as u
  where lower(u.raw_user_meta_data->>'username') = lower(trimmed)
  limit 1;

  return resolved_email;
end;
$$;

grant execute on function public.resolve_sign_in_email(text) to anon, authenticated;
