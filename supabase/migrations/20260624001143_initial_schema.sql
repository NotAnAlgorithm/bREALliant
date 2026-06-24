-- bREALliant initial schema (consolidated)
-- Profiles, lesson progress/completions, streaks, RLS, and username sign-in helper.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- Profiles (username + email), 1:1 with auth.users.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  email text not null,
  created_at timestamptz not null default now(),
  constraint username_length check (char_length(username) >= 2)
);

-- In-progress lesson state (resume mid-lesson).
create table public.lesson_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id text not null,
  step_id text not null,
  step_index int not null default 0,
  step_state jsonb not null default '{}',
  step_states jsonb not null default '{}',
  step_attempts jsonb not null default '{}',
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- Completed lessons.
create table public.lesson_completions (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id text not null,
  completed_at timestamptz not null default now(),
  tags text[] not null default '{}',
  primary key (user_id, lesson_id)
);

-- Daily streak.
create table public.streaks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  current_streak int not null default 0,
  last_activity_date date
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.lesson_completions enable row level security;
alter table public.streaks enable row level security;

-- profiles: a user can only see and manage their own row.
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- lesson_progress: full ownership.
create policy "lesson_progress_all_own"
  on public.lesson_progress for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- lesson_completions: full ownership.
create policy "lesson_completions_all_own"
  on public.lesson_completions for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- streaks: full ownership.
create policy "streaks_all_own"
  on public.streaks for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Grants (Data API access; rows still gated by RLS above)
-- ---------------------------------------------------------------------------

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.lesson_progress to authenticated;
grant select, insert, update, delete on public.lesson_completions to authenticated;
grant select, insert, update, delete on public.streaks to authenticated;

-- ---------------------------------------------------------------------------
-- updated_at trigger for lesson_progress
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger lesson_progress_updated_at
  before update on public.lesson_progress
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Username-or-email sign-in helper
-- Resolves a login identifier (email or username) to the auth email used by
-- signInWithPassword. SECURITY DEFINER so it can read auth.users; callable by
-- anon because it runs before the user is authenticated.
-- ---------------------------------------------------------------------------

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

  -- Already an email.
  if position('@' in trimmed) > 0 then
    return lower(trimmed);
  end if;

  -- Look up by username in profiles.
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

  -- Fallback: username stored in auth.users metadata at signup.
  select u.email
  into resolved_email
  from auth.users as u
  where lower(u.raw_user_meta_data->>'username') = lower(trimmed)
  limit 1;

  return resolved_email;
end;
$$;

grant execute on function public.resolve_sign_in_email(text) to anon, authenticated;
