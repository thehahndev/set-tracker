-- Muscle-group recap (dashboard).
--
-- get_last_session_per_category() — one row per exercise category the calling
-- user has trained in a finished session: the most recent finished session that
-- contains at least one exercise of that category WITH at least one logged set,
-- plus the names of that category's exercises within that session.
--
-- "At least one logged set" (the EXISTS on set_entries) is deliberate: a
-- session_exercise with zero sets was added and never used, and shouldn't count
-- as having trained the muscle group. A category with no qualifying finished
-- session produces no row at all.
--
-- category is returned as-is (nullable free text); the client groups NULL as
-- "other", matching the exercise-list convention.
--
-- SECURITY INVOKER (the default): runs as the calling user, so the existing RLS
-- policies on workout_sessions / session_exercises scope every read to that
-- user. exercises is a globally readable shared library, so no leakage there.
-- search_path is pinned so names resolve deterministically.

CREATE OR REPLACE FUNCTION get_last_session_per_category()
RETURNS TABLE (
  category       text,
  session_id     uuid,
  finished_at    timestamptz,
  exercise_names text[]
)
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  WITH per_category_session AS (
    -- One row per (category, finished session), with that category's exercise
    -- names in display order. Only exercises with at least one logged set —
    -- an added-then-unused exercise wasn't trained.
    SELECT
      e.category,
      ws.id          AS session_id,
      ws.finished_at,
      array_agg(e.name ORDER BY sx.display_order) AS exercise_names
    FROM session_exercises sx
    JOIN workout_sessions ws ON ws.id = sx.session_id
    JOIN exercises e         ON e.id = sx.exercise_id
    WHERE ws.finished_at IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM set_entries se WHERE se.session_exercise_id = sx.id
      )
    GROUP BY e.category, ws.id, ws.finished_at
  )
  -- DISTINCT ON keeps the newest session per category (NULLs group together).
  -- session_id breaks ties for equal finished_at deterministically.
  SELECT DISTINCT ON (category)
    category, session_id, finished_at, exercise_names
  FROM per_category_session
  ORDER BY category, finished_at DESC, session_id DESC;
$$;

GRANT EXECUTE ON FUNCTION get_last_session_per_category() TO authenticated;
