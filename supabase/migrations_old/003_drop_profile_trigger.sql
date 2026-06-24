-- Drop auth.users profile trigger — it fails under default RLS on some Supabase
-- projects ("Database error saving new user"). With "Confirm email" disabled,
-- the client creates the profile immediately after signUp returns a session.

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
