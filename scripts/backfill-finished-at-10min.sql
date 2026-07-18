-- ============================================================================
-- Second-pass correction: same fix as scripts/backfill-finished-at.sql, run with
-- a lowered 10-minute threshold to catch forgotten-finish sessions that the first
-- (30-minute) run deliberately skipped.
--
-- Writes into its OWN table, finished_at_backfill_20260718b, so the first run's
-- audit/rollback record (finished_at_backfill_20260718) stays intact and each run
-- is independently reversible.
--
-- The first run's 6 sessions already sit at gap ~0 (finished_at == last set), so
-- the > 10 min filter excludes them automatically — no double-correction, no
-- primary-key clash. At the time this was written the filter matched exactly 2
-- sessions (gaps of 13 and 16 minutes); confirm that in the inspect step below.
--
-- This is NOT a migration. Run it MANUALLY, interactively, so the inspect-then-
-- decide gate is real:
--   psql "<SUPABASE_PROD_DB_URL>"
--   \conninfo              -- confirm you are on the PROD host
--   \i scripts/backfill-finished-at-10min.sql
--   -- inspect the SELECT output, then:
--   COMMIT;   -- if the rows look right (expect 2)
--   ROLLBACK; -- if anything looks off (leaves the DB untouched)
-- ============================================================================

begin;

create table finished_at_backfill_20260718b (
  session_id      uuid primary key references workout_sessions(id) on delete cascade,
  old_finished_at timestamptz not null,
  new_finished_at timestamptz not null,
  gap             interval    not null,
  corrected_at    timestamptz not null default now()
);

with last_set as (
  select se.session_id, max(st.created_at) as last_set_at
  from session_exercises se
  join set_entries st on st.session_exercise_id = se.id
  group by se.session_id
),
targets as (
  select ws.id,
         ws.finished_at as old_finished_at,
         ls.last_set_at as new_finished_at
  from workout_sessions ws
  join last_set ls on ls.session_id = ws.id
  where ws.finished_at is not null                          -- never touch active sessions
    and ls.last_set_at is not null                          -- never null out a zero-set session
    and ws.finished_at - ls.last_set_at > interval '10 minutes'
)
insert into finished_at_backfill_20260718b (session_id, old_finished_at, new_finished_at, gap)
select id, old_finished_at, new_finished_at, old_finished_at - new_finished_at
from targets;

update workout_sessions ws
set finished_at = b.new_finished_at
from finished_at_backfill_20260718b b
where ws.id = b.session_id;

-- ---- INSPECT (still uncommitted) --------------------------------------------
-- Expect 2 sessions, gaps ~13 and ~16 minutes:
select count(*) as sessions_corrected,
       min(gap) as smallest_gap,
       max(gap) as largest_gap
from finished_at_backfill_20260718b;

select session_id, old_finished_at, new_finished_at, gap
from finished_at_backfill_20260718b
order by gap desc;

-- ---- DECIDE -----------------------------------------------------------------
-- Looks right (2 rows):   COMMIT;
-- Anything off:           ROLLBACK;

-- ============================================================================
-- ROLLBACK AFTER COMMIT:
--   update workout_sessions ws set finished_at = b.old_finished_at
--   from finished_at_backfill_20260718b b where ws.id = b.session_id;
-- Once confident and no longer needed:
--   drop table finished_at_backfill_20260718b;
-- ============================================================================
