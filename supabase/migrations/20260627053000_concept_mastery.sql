-- F1.1 Per-concept mastery profile.
-- Continuous, per-tag knowledge state (seen -> practiced -> retained -> fluent)
-- that replaces binary lesson completion as the unit of progress. due_at is
-- reserved for the spaced-review scheduler (F2); null until scheduled.

create table public.concept_mastery (
  user_id uuid not null references auth.users (id) on delete cascade,
  tag text not null,
  strength real not null default 0,
  state text not null default 'seen'
    check (state in ('seen', 'practiced', 'retained', 'fluent')),
  attempts int not null default 0,
  correct int not null default 0,
  last_seen timestamptz not null default now(),
  due_at timestamptz,
  primary key (user_id, tag)
);

alter table public.concept_mastery enable row level security;

-- Full ownership, mirroring the other per-user tables.
create policy "concept_mastery_all_own"
  on public.concept_mastery for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.concept_mastery to authenticated;
