-- Assisted (counterweight) exercises — direction-aware progress (issue #29, Tier 1).
--
-- Adds exercises.load_type so a row can declare how its logged weight relates to
-- strength:
--   • 'external'  (default) — more weight = stronger. Current behaviour, unchanged.
--   • 'assisted'  — the weight is machine *assistance*, so LESS weight = stronger.
--   • 'bodyweight'— reserved for a future tier; treated as 'external' here.
--
-- This is a read-model change only: weight_kg still stores the entered value. Once an
-- exercise is flagged assisted, its historical sessions recompute correctly because
-- the two aggregation RPCs below branch on load_type. No set-level data migration.

ALTER TABLE exercises
  ADD COLUMN load_type text NOT NULL DEFAULT 'external'
    CHECK (load_type IN ('external', 'assisted', 'bodyweight'));

-- ─────────────────────────────────────────────
-- Per-exercise progress (one row per finished session) + PR flags
-- ─────────────────────────────────────────────
-- For assisted exercises the headline weight metric is the *lowest* assistance used,
-- and its PR flag fires on a new all-time minimum. Estimated 1RM and volume reward
-- using more assistance, so they are not computed for assisted exercises (returned
-- NULL, PR flags false). External exercises are computed exactly as before.

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
  WITH ex AS (
    SELECT load_type FROM exercises WHERE id = p_exercise_id
  ),
  per_session AS (
    SELECT
      ws.id          AS session_id,
      ws.finished_at AS finished_at,
      ex.load_type   AS load_type,
      CASE WHEN ex.load_type = 'assisted'
           THEN min(se.weight_kg)
           ELSE max(se.weight_kg) END                          AS top_weight,
      CASE WHEN ex.load_type = 'assisted'
           THEN NULL
           ELSE max(se.weight_kg * (1 + se.reps / 30.0)) END   AS est_1rm,
      CASE WHEN ex.load_type = 'assisted'
           THEN NULL
           ELSE sum(se.weight_kg * se.reps) END                AS total_volume
    FROM set_entries se
    JOIN session_exercises sx ON sx.id = se.session_exercise_id
    JOIN workout_sessions  ws ON ws.id = sx.session_id
    CROSS JOIN ex
    WHERE sx.exercise_id = p_exercise_id
      AND ws.finished_at IS NOT NULL
      AND se.weight_kg IS NOT NULL
    GROUP BY ws.id, ws.finished_at, ex.load_type
  )
  SELECT
    session_id,
    finished_at,
    top_weight,
    est_1rm,
    total_volume,
    -- First session is always a PR: the frame is empty, so the window aggregate is
    -- NULL and coalesce falls back to a sentinel the current value always beats.
    CASE WHEN load_type = 'assisted'
         THEN top_weight < coalesce(min(top_weight) OVER w, 'Infinity'::numeric)
         ELSE top_weight > coalesce(max(top_weight) OVER w, -1) END AS is_weight_pr,
    CASE WHEN load_type = 'assisted'
         THEN false
         ELSE est_1rm > coalesce(max(est_1rm) OVER w, -1) END AS is_1rm_pr,
    CASE WHEN load_type = 'assisted'
         THEN false
         ELSE total_volume > coalesce(max(total_volume) OVER w, -1) END AS is_volume_pr
  FROM per_session
  WINDOW w AS (ORDER BY finished_at ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING)
  ORDER BY finished_at;
$$;

-- ─────────────────────────────────────────────
-- PRs set in a single (just-finished) session
-- ─────────────────────────────────────────────
-- load_type is per exercise row, so each exercise in the session is judged in its own
-- direction: assisted exercises PR on a new all-time *low* assistance (1RM/volume are
-- not reported); external exercises PR on a new high, exactly as before.

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
      min(se.weight_kg)                        AS low_weight,
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
      min(se.weight_kg)                        AS low_weight,
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
      min(low_weight)   AS low_weight,
      max(top_weight)   AS top_weight,
      max(est_1rm)      AS est_1rm,
      max(total_volume) AS total_volume
    FROM prior_sessions
    GROUP BY exercise_id
  )
  SELECT
    ts.exercise_id,
    e.name AS exercise_name,
    CASE
      WHEN e.load_type = 'assisted' THEN
        CASE WHEN ts.low_weight < coalesce(pb.low_weight, 'Infinity'::numeric)
             THEN ts.low_weight END
      ELSE
        CASE WHEN ts.top_weight > coalesce(pb.top_weight, -1)
             THEN ts.top_weight END
    END AS weight_pr,
    CASE WHEN e.load_type = 'assisted' THEN NULL
         WHEN ts.est_1rm > coalesce(pb.est_1rm, -1) THEN ts.est_1rm END AS est_1rm_pr,
    CASE WHEN e.load_type = 'assisted' THEN NULL
         WHEN ts.total_volume > coalesce(pb.total_volume, -1) THEN ts.total_volume END AS volume_pr
  FROM this_session ts
  JOIN exercises e        ON e.id = ts.exercise_id
  LEFT JOIN prior_best pb ON pb.exercise_id = ts.exercise_id
  WHERE
    CASE
      WHEN e.load_type = 'assisted'
        THEN ts.low_weight < coalesce(pb.low_weight, 'Infinity'::numeric)
      ELSE ts.top_weight   > coalesce(pb.top_weight, -1)
        OR ts.est_1rm      > coalesce(pb.est_1rm, -1)
        OR ts.total_volume > coalesce(pb.total_volume, -1)
    END;
$$;

GRANT EXECUTE ON FUNCTION get_exercise_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_session_prs(uuid)       TO authenticated;
