-- Progress charts & PR detection (issue #4).
--
-- Two read-only aggregation functions so the client never pulls raw set rows:
--   • get_exercise_progress(exercise) — one aggregated row per finished session,
--     with per-metric PR flags, for the exercise-detail chart.
--   • get_session_prs(session)        — which exercises set a new all-time PR in a
--     just-finished session, for the finish-time celebration.
--
-- Both are SECURITY INVOKER (the default): they run as the calling user, so the
-- existing RLS policies on set_entries / workout_sessions scope every read to that
-- user. search_path is pinned so the functions resolve names deterministically.
--
-- Estimated 1RM uses the Epley formula: weight * (1 + reps / 30). Only weighted
-- sets (weight_kg IS NOT NULL) contribute to weight / 1RM / volume, so a purely
-- bodyweight exercise simply returns no rows.

-- ─────────────────────────────────────────────
-- Per-exercise progress (one row per finished session) + PR flags
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_exercise_progress(p_exercise_id uuid)
RETURNS TABLE (
  session_id   uuid,
  finished_at  timestamptz,
  top_weight   numeric,
  est_1rm      numeric,
  total_volume numeric,
  is_weight_pr boolean,
  is_1rm_pr    boolean,
  is_volume_pr boolean
)
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  WITH per_session AS (
    SELECT
      ws.id          AS session_id,
      ws.finished_at AS finished_at,
      max(se.weight_kg)                          AS top_weight,
      max(se.weight_kg * (1 + se.reps / 30.0))   AS est_1rm,
      sum(se.weight_kg * se.reps)                AS total_volume
    FROM set_entries se
    JOIN session_exercises sx ON sx.id = se.session_exercise_id
    JOIN workout_sessions  ws ON ws.id = sx.session_id
    WHERE sx.exercise_id = p_exercise_id
      AND ws.finished_at IS NOT NULL
      AND se.weight_kg IS NOT NULL
    GROUP BY ws.id, ws.finished_at
  )
  SELECT
    session_id,
    finished_at,
    top_weight,
    est_1rm,
    total_volume,
    -- A metric is a PR when it beats every prior session (empty frame on the first
    -- session -> max() is NULL -> coalesce(-1) -> always a PR).
    top_weight   > coalesce(max(top_weight)   OVER w, -1) AS is_weight_pr,
    est_1rm      > coalesce(max(est_1rm)      OVER w, -1) AS is_1rm_pr,
    total_volume > coalesce(max(total_volume) OVER w, -1) AS is_volume_pr
  FROM per_session
  WINDOW w AS (ORDER BY finished_at ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING)
  ORDER BY finished_at;
$$;

-- ─────────────────────────────────────────────
-- PRs set in a single (just-finished) session
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_session_prs(p_session_id uuid)
RETURNS TABLE (
  exercise_id   uuid,
  exercise_name text,
  weight_pr     numeric,
  est_1rm_pr    numeric,
  volume_pr     numeric
)
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  WITH target AS (
    SELECT ws.id, ws.finished_at, ws.user_id
    FROM workout_sessions ws
    WHERE ws.id = p_session_id
  ),
  this_session AS (
    SELECT
      sx.exercise_id,
      max(se.weight_kg)                        AS top_weight,
      max(se.weight_kg * (1 + se.reps / 30.0)) AS est_1rm,
      sum(se.weight_kg * se.reps)              AS total_volume
    FROM set_entries se
    JOIN session_exercises sx ON sx.id = se.session_exercise_id
    JOIN target t             ON t.id = sx.session_id
    WHERE se.weight_kg IS NOT NULL
    GROUP BY sx.exercise_id
  ),
  prior_sessions AS (
    SELECT
      sx.exercise_id,
      ws.id AS session_id,
      max(se.weight_kg)                        AS top_weight,
      max(se.weight_kg * (1 + se.reps / 30.0)) AS est_1rm,
      sum(se.weight_kg * se.reps)              AS total_volume
    FROM set_entries se
    JOIN session_exercises sx ON sx.id = se.session_exercise_id
    JOIN workout_sessions  ws ON ws.id = sx.session_id
    JOIN target t             ON t.user_id = ws.user_id
    WHERE ws.finished_at IS NOT NULL
      AND ws.finished_at < t.finished_at
      AND se.weight_kg IS NOT NULL
    GROUP BY sx.exercise_id, ws.id
  ),
  prior_best AS (
    SELECT
      exercise_id,
      max(top_weight)   AS top_weight,
      max(est_1rm)      AS est_1rm,
      max(total_volume) AS total_volume
    FROM prior_sessions
    GROUP BY exercise_id
  )
  SELECT
    ts.exercise_id,
    e.name AS exercise_name,
    CASE WHEN ts.top_weight   > coalesce(pb.top_weight, -1)   THEN ts.top_weight   END AS weight_pr,
    CASE WHEN ts.est_1rm      > coalesce(pb.est_1rm, -1)      THEN ts.est_1rm      END AS est_1rm_pr,
    CASE WHEN ts.total_volume > coalesce(pb.total_volume, -1) THEN ts.total_volume END AS volume_pr
  FROM this_session ts
  JOIN exercises e        ON e.id = ts.exercise_id
  LEFT JOIN prior_best pb ON pb.exercise_id = ts.exercise_id
  WHERE ts.top_weight   > coalesce(pb.top_weight, -1)
     OR ts.est_1rm      > coalesce(pb.est_1rm, -1)
     OR ts.total_volume > coalesce(pb.total_volume, -1);
$$;

GRANT EXECUTE ON FUNCTION get_exercise_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_session_prs(uuid)       TO authenticated;
