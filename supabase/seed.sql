-- Seed: Common exercise library
-- Applied via: supabase db reset (local)
-- Note: created_by is NULL for seeded exercises (system-provided)

INSERT INTO exercises (name, category) VALUES
  -- Chest
  ('Barbell Bench Press', 'chest'),
  ('Dumbbell Bench Press', 'chest'),
  ('Incline Barbell Bench Press', 'chest'),
  ('Incline Dumbbell Bench Press', 'chest'),
  ('Cable Chest Fly', 'chest'),
  ('Dumbbell Chest Fly', 'chest'),
  ('Chest Dip', 'chest'),
  ('Machine Chest Press', 'chest'),
  -- Back
  ('Deadlift', 'back'),
  ('Barbell Row', 'back'),
  ('Dumbbell Row', 'back'),
  ('Pull-Up', 'back'),
  ('Chin-Up', 'back'),
  ('Lat Pulldown', 'back'),
  ('Cable Row', 'back'),
  ('T-Bar Row', 'back'),
  ('Face Pull', 'back'),
  -- Shoulders
  ('Barbell Overhead Press', 'shoulders'),
  ('Dumbbell Overhead Press', 'shoulders'),
  ('Seated Dumbbell Press', 'shoulders'),
  ('Lateral Raise', 'shoulders'),
  ('Front Raise', 'shoulders'),
  ('Rear Delt Fly', 'shoulders'),
  ('Arnold Press', 'shoulders'),
  ('Machine Shoulder Press', 'shoulders'),
  -- Arms (Biceps)
  ('Barbell Curl', 'biceps'),
  ('Dumbbell Curl', 'biceps'),
  ('Hammer Curl', 'biceps'),
  ('Incline Dumbbell Curl', 'biceps'),
  ('Cable Curl', 'biceps'),
  ('Preacher Curl', 'biceps'),
  -- Arms (Triceps)
  ('Close-Grip Bench Press', 'triceps'),
  ('Tricep Dip', 'triceps'),
  ('Skull Crusher', 'triceps'),
  ('Tricep Pushdown', 'triceps'),
  ('Overhead Tricep Extension', 'triceps'),
  ('Cable Overhead Tricep Extension', 'triceps'),
  -- Legs (Quads/Glutes)
  ('Barbell Back Squat', 'legs'),
  ('Barbell Front Squat', 'legs'),
  ('Goblet Squat', 'legs'),
  ('Leg Press', 'legs'),
  ('Hack Squat', 'legs'),
  ('Leg Extension', 'legs'),
  ('Bulgarian Split Squat', 'legs'),
  ('Lunge', 'legs'),
  -- Legs (Hamstrings/Glutes)
  ('Romanian Deadlift', 'legs'),
  ('Leg Curl', 'legs'),
  ('Good Morning', 'legs'),
  ('Hip Thrust', 'legs'),
  ('Glute Bridge', 'legs'),
  -- Calves
  ('Standing Calf Raise', 'calves'),
  ('Seated Calf Raise', 'calves'),
  -- Core
  ('Plank', 'core'),
  ('Crunch', 'core'),
  ('Cable Crunch', 'core'),
  ('Hanging Leg Raise', 'core'),
  ('Ab Wheel Rollout', 'core')
ON CONFLICT (name) DO NOTHING;

-- Assisted (counterweight) machine variants — the logged weight is assistance, so
-- less weight means more strength. Progress reporting inverts direction for these.
--
-- Dev-only: this file runs on local `supabase db reset` (see config.toml [db.seed]),
-- never in CI/prod, which pushes migrations only. So these rows do NOT reach existing
-- users. In prod, assisted exercises are user-driven — anyone can flag their own
-- machine via the load-type selector on the create/edit exercise forms.
INSERT INTO exercises (name, category, load_type) VALUES
  ('Assisted Pull-Up', 'back', 'assisted'),
  ('Assisted Chin-Up', 'back', 'assisted'),
  ('Assisted Dip', 'chest', 'assisted')
ON CONFLICT (name) DO NOTHING;
