-- Enforce case-insensitive uniqueness on exercises.name (issue #33).
--
-- Previously exercises.name was UNIQUE case-sensitively, with a separate NON-unique
-- index on lower(name). That let "Bench Press" and "bench press" coexist, fragmenting
-- a user's history across near-duplicate rows. The ExercisePicker already deduped
-- case-insensitively in the UI, but the standalone New Exercise page relied on the DB
-- constraint, which permitted the case variant.
--
-- Pre-flight collision check run against dev and prod (2026-07-12) via the query in
-- issue #33 returned zero rows on both, so no dedupe/repointing step is required
-- before the unique index is created. This is a constraint change only — no columns
-- change, so src/lib/types/database.ts does not need regenerating.

-- 1. Drop the redundant non-unique lower(name) index (superseded by the unique one below).
drop index if exists idx_exercises_name;

-- 2. Drop the case-sensitive column-level UNIQUE on name. It was created inline
--    (name text NOT NULL UNIQUE), so its name is auto-generated; look it up by
--    definition rather than assuming 'exercises_name_key'.
do $$
declare
  c_name text;
begin
  select conname into c_name
  from pg_constraint
  where conrelid = 'exercises'::regclass
    and contype = 'u'
    and pg_get_constraintdef(oid) = 'UNIQUE (name)';
  if c_name is not null then
    execute format('alter table exercises drop constraint %I', c_name);
  end if;
end $$;

-- 3. Case-insensitive uniqueness. The existing 23505 (unique_violation) handler in
--    src/lib/actions/exercises.ts already maps this to the friendly
--    "An exercise with that name already exists" message, so no app change is needed.
create unique index idx_exercises_name_lower on exercises (lower(name));
