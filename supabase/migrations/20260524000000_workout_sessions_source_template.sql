ALTER TABLE workout_sessions
  ADD COLUMN source_template_id uuid REFERENCES workout_templates(id) ON DELETE SET NULL;
