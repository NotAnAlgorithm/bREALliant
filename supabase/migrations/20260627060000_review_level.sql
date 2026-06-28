-- F2 Spaced retrieval: persist each concept's position on the review ladder.
-- review_level indexes into the interval ladder (1d/3d/7d/21d). due_at (added in
-- the concept_mastery migration) holds the next scheduled review time.

alter table public.concept_mastery
  add column review_level int not null default 0;
