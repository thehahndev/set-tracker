-- Set Tracker: Initial Schema
-- Run: supabase db reset (local) or applied automatically via migrate.yml (production)

-- ─────────────────────────────────────────────
-- Profiles
-- ─────────────────────────────────────────────

CREATE TABLE profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  created_at  timestamptz DEFAULT now() NOT NULL
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─────────────────────────────────────────────
-- Exercises (global, shared across all users)
-- ─────────────────────────────────────────────

CREATE TABLE exercises (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  category    text,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_exercises_name ON exercises (lower(name));

-- ─────────────────────────────────────────────
-- Workout Sessions
-- ─────────────────────────────────────────────

CREATE TABLE workout_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at  timestamptz DEFAULT now() NOT NULL,
  finished_at timestamptz,
  notes       text,
  created_at  timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_workout_sessions_user_started ON workout_sessions (user_id, started_at DESC);

-- ─────────────────────────────────────────────
-- Session Exercises (ordered exercises in a session)
-- ─────────────────────────────────────────────

CREATE TABLE session_exercises (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    uuid NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id   uuid NOT NULL REFERENCES exercises(id),
  display_order integer NOT NULL,
  created_at    timestamptz DEFAULT now() NOT NULL,
  UNIQUE (session_id, display_order)
);

CREATE INDEX idx_session_exercises_session ON session_exercises (session_id, display_order);

-- ─────────────────────────────────────────────
-- Set Entries (the actual logged data)
-- ─────────────────────────────────────────────

CREATE TABLE set_entries (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_exercise_id  uuid NOT NULL REFERENCES session_exercises(id) ON DELETE CASCADE,
  user_id              uuid NOT NULL REFERENCES auth.users(id),
  set_number           integer NOT NULL,
  weight_kg            numeric(6, 2),
  reps                 integer NOT NULL,
  created_at           timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT positive_reps CHECK (reps > 0),
  CONSTRAINT positive_weight CHECK (weight_kg IS NULL OR weight_kg >= 0)
);

CREATE INDEX idx_set_entries_user ON set_entries (user_id, created_at DESC);
CREATE INDEX idx_set_entries_session_exercise ON set_entries (session_exercise_id, set_number);

-- ─────────────────────────────────────────────
-- Workout Templates (user-owned, lightweight)
-- ─────────────────────────────────────────────

CREATE TABLE workout_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  created_at  timestamptz DEFAULT now() NOT NULL,
  updated_at  timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_workout_templates_user ON workout_templates (user_id, created_at DESC);

-- ─────────────────────────────────────────────
-- Workout Template Exercises
-- ─────────────────────────────────────────────

CREATE TABLE workout_template_exercises (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id   uuid NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
  exercise_id   uuid NOT NULL REFERENCES exercises(id),
  display_order integer NOT NULL,
  UNIQUE (template_id, display_order)
);

CREATE INDEX idx_workout_template_exercises_template ON workout_template_exercises (template_id, display_order);

-- ─────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE set_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_template_exercises ENABLE ROW LEVEL SECURITY;

-- Profiles: read all, write own
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Exercises: read all, any authenticated user can create/update/delete
CREATE POLICY "exercises_select" ON exercises FOR SELECT TO authenticated USING (true);
CREATE POLICY "exercises_insert" ON exercises FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "exercises_update" ON exercises FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "exercises_delete" ON exercises FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- Workout sessions: owner only
CREATE POLICY "workout_sessions_all" ON workout_sessions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Session exercises: owner via workout_sessions
CREATE POLICY "session_exercises_all" ON session_exercises FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workout_sessions ws
      WHERE ws.id = session_exercises.session_id
        AND ws.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_sessions ws
      WHERE ws.id = session_exercises.session_id
        AND ws.user_id = auth.uid()
    )
  );

-- Set entries: owner only (user_id denormalized for fast RLS)
CREATE POLICY "set_entries_all" ON set_entries FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Workout templates: owner only
CREATE POLICY "workout_templates_all" ON workout_templates FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Workout template exercises: owner via workout_templates
CREATE POLICY "workout_template_exercises_all" ON workout_template_exercises FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workout_templates wt
      WHERE wt.id = workout_template_exercises.template_id
        AND wt.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_templates wt
      WHERE wt.id = workout_template_exercises.template_id
        AND wt.user_id = auth.uid()
    )
  );
