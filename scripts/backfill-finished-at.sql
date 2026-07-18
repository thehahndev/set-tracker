-- ============================================================================
-- One-time correction: fix workout_sessions.finished_at for forgotten-finish
-- sessions (where the Finish tap happened long after the last set was logged).
--
-- The true end of a (single, continuous) workout is the last set logged, so we
-- set finished_at = MAX(set_entries.created_at) for sessions whose recorded
-- finished_at is more than THRESHOLD later than that last set.
--
-- This is NOT a migration. It lives outside supabase/migrations/ on purpose so
-- the migrate.yml workflow never runs it unattended. Run it MANUALLY, inside the
-- transaction below, against DEV first — verify — then PROD.
--
-- HOW TO RUN (interactively, so the inspect-then-decide gate is real):
--   psql "$SUPABASE_DEV_DB_URL"        -- dev first
--   \i scripts/backfill-finished-at.sql
--   -- the script stops BEFORE committing; inspect the SELECT output, then:
--   COMMIT;   -- if the numbers look right
--   ROLLBACK; -- if anything looks off (leaves the DB untouched)
--   -- then repeat against "$SUPABASE_PROD_DB_URL"
--
-- Threshold: 30 minutes. Adjust the single interval literal below if the
-- preview shows normal sessions being swept in (lower) or forgotten ones being
-- missed (raise).
-- ============================================================================

begin;

-- Audit + rollback record. A real (not temp) table so it survives COMMIT and
-- lets you reverse the correction later if needed. Transactional DDL means a
-- ROLLBACK also removes this table, so a discarded run leaves no trace.
create table finished_at_backfill_20260718 (
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
    and ws.finished_at - ls.last_set_at > interval '30 minutes'
)
insert into finished_at_backfill_20260718 (session_id, old_finished_at, new_finished_at, gap)
select id, old_finished_at, new_finished_at, old_finished_at - new_finished_at
from targets;

update workout_sessions ws
set finished_at = b.new_finished_at
from finished_at_backfill_20260718 b
where ws.id = b.session_id;

-- ---- INSPECT (still uncommitted) --------------------------------------------
-- How many sessions were corrected, and the spread of corrections:
select count(*)            as sessions_corrected,
       min(gap)            as smallest_gap,
       max(gap)            as largest_gap
from finished_at_backfill_20260718;

-- The individual corrections, biggest first — eyeball these before committing:
select session_id, old_finished_at, new_finished_at, gap
from finished_at_backfill_20260718
order by gap desc
limit 100;

-- ---- DECIDE -----------------------------------------------------------------
-- If the output looks right:   COMMIT;
-- If anything looks off:       ROLLBACK;
-- (Type one of these yourself — the script intentionally does not.)

-- ============================================================================
-- ROLLBACK AFTER COMMIT (if you later find the correction was wrong):
--   update workout_sessions ws set finished_at = b.old_finished_at
--   from finished_at_backfill_20260718 b where ws.id = b.session_id;
-- Once you're confident it's correct and no longer need the audit trail:
--   drop table finished_at_backfill_20260718;
-- ============================================================================
