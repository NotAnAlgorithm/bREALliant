-- bREALliant initial schema
-- Run in Supabase SQL editor or via supabase db push

-- Profiles (username + email)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  email text not null,
  created_at timestamptz not null default now(),
  constraint username_length check (char_length(username) >= 2)
);

-- In-progress lesson state (resume mid-lesson)
create table if not exists public.lesson_progress (
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

-- Completed lessons
create table if not exists public.lesson_completions (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id text not null,
  completed_at timestamptz not null default now(),
  tags text[] not null default '{}',
  primary key (user_id, lesson_id)
);

-- Daily streak
create table if not exists public.streaks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  current_streak int not null default 0,
  last_activity_date date
);

-- RLS
alter table public.profiles enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.lesson_completions enable row level security;
alter table public.streaks enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

create policy "lesson_progress_all_own"
  on public.lesson_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "lesson_completions_all_own"
  on public.lesson_completions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "streaks_all_own"
  on public.streaks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists lesson_progress_updated_at on public.lesson_progress;
create trigger lesson_progress_updated_at
  before update on public.lesson_progress
  for each row execute function public.set_updated_at();
