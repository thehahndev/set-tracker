-- Dev-only seed: rich workout history for a single user, for manual/browser testing.
--
-- WHY: the shared dev database had only a few sparse sessions — too thin to exercise
-- the progress charts, PR detection, history, and the per-session set-history UI. This
-- inserts a realistic 4-week, 3-day split (12 sessions, 108 sets), including one
-- exercise (Chin-Up) with mixed weighted and bodyweight sets so the "BW × reps" chip
-- has data to render.
--
-- RUN (targets whatever --db-url points at — must be DEV, never production):
--   npx supabase db query --db-url "$SUPABASE_DB_URL" --file supabase/seeds/dev-workouts.sql
--
-- The whole seed is ONE statement (a DO block), because `supabase db query` sends the
-- file as a single prepared statement and rejects multiple commands. It is NOT wired
-- into `supabase db reset` (config.toml lists only seed.sql), because it needs a real
-- auth user and targets the hosted dev database, not a local reset.
--
-- SAFETY / IDEMPOTENCY: every seeded session is tagged with the marker below in
-- workout_sessions.notes. A re-run deletes only tagged rows (children cascade via FK)
-- before reinserting — so it never touches real, hand-logged data and never duplicates.
-- The DO block is one transaction: any error rolls the whole thing back.
--
-- TARGET USER: change v_email below; it is resolved against auth.users, and the script
-- aborts if no such user exists in the database.

DO $$
DECLARE
  v_email    text := 'thehahndev@gmail.com';
  v_marker   text := '[seed:dev-workouts]';
  v_user     uuid;
  v_session  uuid;
  v_se       uuid;
  v_start    timestamptz;
  v_weight   numeric(6, 2);
  v_setno    int;
  v_day      int;
  v_week     int;
  i          int;
  rec        record;
  v_sessions int := 0;
  v_sets     int := 0;
BEGIN
  SELECT id INTO v_user FROM auth.users WHERE lower(email) = lower(v_email);
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Seed target user % not found in this database', v_email;
  END IF;

  -- Remove any previous seed run for this user (children cascade via FK).
  DELETE FROM workout_sessions WHERE notes = v_marker AND user_id = v_user;

  -- 4 weeks × 3 days (Push / Pull / Legs). Week 0 is the oldest; the last week is today.
  FOR v_week IN 0..3 LOOP
    FOR v_day IN 0..2 LOOP
      v_start := ((CURRENT_DATE - ((4 - v_week) * 7 - v_day * 2)) + TIME '18:00')::timestamptz;

      INSERT INTO workout_sessions (user_id, started_at, finished_at, notes)
      VALUES (v_user, v_start, v_start + INTERVAL '1 hour', v_marker)
      RETURNING id INTO v_session;
      v_sessions := v_sessions + 1;

      -- The program for this day. `base` is the week-0 working weight; it climbs by
      -- `inc` kg each week. `bw_extra` appends pure bodyweight sets (weight_kg = NULL)
      -- after the weighted ones.
      FOR rec IN
        SELECT * FROM (VALUES
          (0, 0, 'Barbell Bench Press',    60.0,  2.5,  3, 5,  NULL::int[]),
          (0, 1, 'Barbell Overhead Press', 40.0,  2.5,  3, 6,  NULL),
          (0, 2, 'Lateral Raise',          10.0,  1.25, 3, 12, NULL),
          (1, 0, 'Deadlift',               100.0, 5.0,  2, 5,  NULL),
          (1, 1, 'Barbell Row',            55.0,  2.5,  3, 8,  NULL),
          (1, 2, 'Chin-Up',                5.0,   2.5,  2, 6,  ARRAY[10, 8]),
          (2, 0, 'Barbell Back Squat',     80.0,  5.0,  3, 5,  NULL),
          (2, 1, 'Leg Press',              140.0, 10.0, 3, 10, NULL),
          (2, 2, 'Leg Curl',               40.0,  2.5,  3, 12, NULL)
        ) AS p(day_index, ex_order, exercise_name, base, inc, n_sets, reps, bw_extra)
        WHERE p.day_index = v_day
        ORDER BY p.ex_order
      LOOP
        v_weight := round((rec.base + rec.inc * v_week) * 2) / 2;

        v_se := NULL;
        INSERT INTO session_exercises (session_id, exercise_id, display_order)
        SELECT v_session, e.id, rec.ex_order
        FROM exercises e
        WHERE e.name = rec.exercise_name
        RETURNING id INTO v_se;
        IF v_se IS NULL THEN
          RAISE EXCEPTION 'Exercise % not found in library', rec.exercise_name;
        END IF;

        -- Weighted working sets.
        FOR v_setno IN 1..rec.n_sets LOOP
          INSERT INTO set_entries (session_exercise_id, user_id, set_number, weight_kg, reps)
          VALUES (v_se, v_user, v_setno, v_weight, rec.reps);
          v_sets := v_sets + 1;
        END LOOP;

        -- Optional bodyweight sets (weight_kg = NULL).
        IF rec.bw_extra IS NOT NULL THEN
          FOR i IN 1..array_length(rec.bw_extra, 1) LOOP
            INSERT INTO set_entries (session_exercise_id, user_id, set_number, weight_kg, reps)
            VALUES (v_se, v_user, rec.n_sets + i, NULL, rec.bw_extra[i]);
            v_sets := v_sets + 1;
          END LOOP;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Seeded % sessions and % sets for %', v_sessions, v_sets, v_email;
END $$;
