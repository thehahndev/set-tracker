"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

export type WorkoutSession = {
  id: string
  started_at: string
  session_exercises: Array<{
    id: string
    exercise_id: string
    display_order: number
    exercises: { name: string } | null
    set_entries: Array<{
      id: string
      set_number: number
      weight_kg: number | null
      reps: number
    }>
  }>
}

export async function getWorkoutSession(sessionId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { data, error } = await supabase
    .from("workout_sessions")
    .select(
      `id, started_at,
       session_exercises (
         id, exercise_id, display_order,
         exercises (name),
         set_entries (id, set_number, weight_kg, reps)
       )`
    )
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .is("finished_at", null)
    .single()

  if (error) return { error: error.message }
  return { data: data as unknown as WorkoutSession }
}

export async function getActiveSession() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null }

  const { data, error } = await supabase
    .from("workout_sessions")
    .select("id, started_at")
    .eq("user_id", user.id)
    .is("finished_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return { data: null }
  return { data }
}

export async function createWorkoutSession(templateId?: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { data: session, error } = await supabase
    .from("workout_sessions")
    .insert({ user_id: user.id })
    .select("id")
    .single()

  if (error) return { error: error.message }

  if (templateId) {
    const { data: templateExercises, error: tErr } = await supabase
      .from("workout_template_exercises")
      .select("exercise_id, display_order")
      .eq("template_id", templateId)
      .order("display_order")

    if (tErr) return { error: tErr.message }

    if (templateExercises.length > 0) {
      const { error: seErr } = await supabase.from("session_exercises").insert(
        templateExercises.map((te) => ({
          session_id: session.id,
          exercise_id: te.exercise_id,
          display_order: te.display_order,
        }))
      )
      if (seErr) return { error: seErr.message }
    }
  }

  revalidatePath("/dashboard")
  return { data: session }
}

const addSetSchema = z.object({
  sessionExerciseId: z.string().uuid(),
  setNumber: z.number().int().positive(),
  weightKg: z.number().nonnegative().nullable(),
  reps: z.number().int().positive(),
})

export async function addSet(input: z.infer<typeof addSetSchema>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const parsed = addSetSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.message }

  const { data, error } = await supabase
    .from("set_entries")
    .insert({
      session_exercise_id: parsed.data.sessionExerciseId,
      user_id: user.id,
      set_number: parsed.data.setNumber,
      weight_kg: parsed.data.weightKg,
      reps: parsed.data.reps,
    })
    .select("id, set_number, weight_kg, reps, created_at")
    .single()

  if (error) return { error: error.message }
  return { data }
}

export async function deleteSet(setId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { error } = await supabase
    .from("set_entries")
    .delete()
    .eq("id", setId)
    .eq("user_id", user.id)

  if (error) return { error: error.message }
  return { data: true }
}

export async function finishWorkout(sessionId: string, templateName?: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { error } = await supabase
    .from("workout_sessions")
    .update({ finished_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("user_id", user.id)

  if (error) return { error: error.message }

  if (templateName) {
    const { data: sessionExercises } = await supabase
      .from("session_exercises")
      .select("exercise_id, display_order")
      .eq("session_id", sessionId)
      .order("display_order")

    if (sessionExercises && sessionExercises.length > 0) {
      const { data: template } = await supabase
        .from("workout_templates")
        .insert({ user_id: user.id, name: templateName })
        .select("id")
        .single()

      if (template) {
        await supabase.from("workout_template_exercises").insert(
          sessionExercises.map((se) => ({
            template_id: template.id,
            exercise_id: se.exercise_id,
            display_order: se.display_order,
          }))
        )
      }
    }
  }

  revalidatePath("/dashboard")
  revalidatePath("/history")
  return { data: true }
}

export async function addExerciseToSession(
  sessionId: string,
  exerciseId: string,
  displayOrder: number
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { data, error } = await supabase
    .from("session_exercises")
    .insert({ session_id: sessionId, exercise_id: exerciseId, display_order: displayOrder })
    .select("id, exercise_id, display_order")
    .single()

  if (error) return { error: error.message }
  return { data }
}

export async function removeExerciseFromSession(sessionExerciseId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { error } = await supabase
    .from("session_exercises")
    .delete()
    .eq("id", sessionExerciseId)

  if (error) return { error: error.message }
  return { data: true }
}

export type HistorySummary = {
  id: string
  started_at: string
  finished_at: string
  session_exercises: Array<{
    id: string
    set_entries: Array<{ id: string }>
  }>
}

export type SessionDetail = {
  id: string
  started_at: string
  finished_at: string
  session_exercises: Array<{
    id: string
    display_order: number
    exercises: { name: string } | null
    set_entries: Array<{
      set_number: number
      weight_kg: number | null
      reps: number
    }>
  }>
}

export type HistorySet = { set_number: number; weight_kg: number | null; reps: number }

export async function getExerciseHistory(
  exerciseId: string
): Promise<{ data: HistorySet[] | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null }

  // RLS ensures we only see the current user's sessions.
  // !inner join with the finished_at filter excludes the active session (finished_at IS NULL).
  const { data } = await supabase
    .from("session_exercises")
    .select(
      `set_entries (set_number, weight_kg, reps),
       workout_sessions!inner (finished_at)`
    )
    .eq("exercise_id", exerciseId)
    .not("workout_sessions.finished_at", "is", null)
    .order("finished_at", { referencedTable: "workout_sessions", ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return { data: null }

  const sets = (data.set_entries as unknown as HistorySet[]).sort((a, b) => a.set_number - b.set_number)
  return { data: sets.length > 0 ? sets : null }
}

export async function getWorkoutHistory(): Promise<{
  data: HistorySummary[] | null
  error?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: "Unauthorized" }

  const { data, error } = await supabase
    .from("workout_sessions")
    .select(
      `id, started_at, finished_at,
       session_exercises (
         id,
         set_entries (id)
       )`
    )
    .eq("user_id", user.id)
    .not("finished_at", "is", null)
    .order("finished_at", { ascending: false })

  if (error) return { data: null, error: error.message }
  return { data: data as unknown as HistorySummary[] }
}

export async function getSessionDetail(sessionId: string): Promise<{
  data: SessionDetail | null
  error?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: "Unauthorized" }

  const { data, error } = await supabase
    .from("workout_sessions")
    .select(
      `id, started_at, finished_at,
       session_exercises (
         id, display_order,
         exercises (name),
         set_entries (set_number, weight_kg, reps)
       )`
    )
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .not("finished_at", "is", null)
    .single()

  if (error) return { data: null, error: error.message }
  return { data: data as unknown as SessionDetail }
}
