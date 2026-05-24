-- Tracks which template a session was started from, to surface in the finish sheet.
-- (Touched to trigger migrate.yml after workflow was updated to target both dev and prod.)
ALTER TABLE workout_sessions
  ADD COLUMN source_template_id uuid REFERENCES workout_templates(id) ON DELETE SET NULL;
