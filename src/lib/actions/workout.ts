"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

export type WorkoutSession = {
  id: string
  started_at: string
  source_template_id: string | null
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
      `id, started_at, source_template_id,
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

export async function getTemplateNameById(templateId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("workout_templates")
    .select("name")
    .eq("id", templateId)
    .single()
  return data?.name ?? null
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({ user_id: user.id, source_template_id: templateId ?? null } as any)
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

  // Harmless during an active workout (different path); keeps history/dashboard fresh when
  // adding a set to a finished session from the edit screen.
  revalidatePath("/history")
  revalidatePath("/dashboard")
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

  // Keep the history list/detail and dashboard fresh when editing a finished session.
  // These paths differ from /workout/active, so the active-workout client flow is untouched.
  revalidatePath("/history")
  revalidatePath("/dashboard")
  return { data: true }
}

const updateSetSchema = z.object({
  setId: z.string().uuid(),
  weightKg: z.number().nonnegative().nullable(),
  reps: z.number().int().positive(),
})

export async function updateSet(input: z.infer<typeof updateSetSchema>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const parsed = updateSetSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.message }

  const { error } = await supabase
    .from("set_entries")
    .update({ weight_kg: parsed.data.weightKg, reps: parsed.data.reps })
    .eq("id", parsed.data.setId)
    .eq("user_id", user.id)

  if (error) return { error: error.message }

  revalidatePath("/history")
  revalidatePath("/dashboard")
  return { data: true }
}

const deleteSessionSchema = z.object({ sessionId: z.string().uuid() })

export async function deleteSession(input: z.infer<typeof deleteSessionSchema>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const parsed = deleteSessionSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.message }

  // Guard on finished_at so this can only delete a completed session, never an active one
  // (cancelWorkout owns active-session deletion). Children cascade via ON DELETE CASCADE.
  const { error } = await supabase
    .from("workout_sessions")
    .delete()
    .eq("id", parsed.data.sessionId)
    .eq("user_id", user.id)
    .not("finished_at", "is", null)

  if (error) return { error: error.message }

  revalidatePath("/history")
  revalidatePath("/dashboard")
  return { data: true }
}

export async function finishWorkout(
  sessionId: string,
  templateName?: string,
  exerciseIds: string[] = []
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  // Delete exercises the user removed that are still in the DB inside the deferred-delete window.
  // This must run before the template snapshot so the snapshot only includes kept exercises.
  if (exerciseIds.length > 0) {
    const { error: cleanupErr } = await supabase
      .from("session_exercises")
      .delete()
      .eq("session_id", sessionId)
      .not("id", "in", `(${exerciseIds.join(",")})`)
    if (cleanupErr) return { error: cleanupErr.message }
  } else {
    const { error: cleanupErr } = await supabase
      .from("session_exercises")
      .delete()
      .eq("session_id", sessionId)
    if (cleanupErr) return { error: cleanupErr.message }
  }

  // Save template first — if it fails, the session stays active so the user can retry
  if (templateName) {
    const { data: sessionExercises, error: seErr } = await supabase
      .from("session_exercises")
      .select("exercise_id, display_order")
      .eq("session_id", sessionId)
      .order("display_order")

    if (seErr) return { error: seErr.message }

    if (sessionExercises && sessionExercises.length > 0) {
      const { data: template, error: tErr } = await supabase
        .from("workout_templates")
        .insert({ user_id: user.id, name: templateName })
        .select("id")
        .single()

      if (tErr || !template) return { error: tErr?.message ?? "Failed to save template" }

      const { error: teErr } = await supabase.from("workout_template_exercises").insert(
        sessionExercises.map((se) => ({
          template_id: template.id,
          exercise_id: se.exercise_id,
          display_order: se.display_order,
        }))
      )
      if (teErr) {
        await supabase.from("workout_templates").delete().eq("id", template.id)
        return { error: teErr.message }
      }
    }
  }

  const { error } = await supabase
    .from("workout_sessions")
    .update({ finished_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("user_id", user.id)

  if (error) return { error: error.message }

  revalidatePath("/dashboard")
  revalidatePath("/history")
  return { data: true }
}

export async function cancelWorkout(sessionId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { error } = await supabase
    .from("workout_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .is("finished_at", null)

  if (error) return { error: error.message }
  revalidatePath("/dashboard")
  return { data: true }
}

export async function addExerciseToSession(sessionId: string, exerciseId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  // Compute display_order from the DB rather than trusting the client — orphan rows
  // left behind by aborted in-flight adds (e.g. user refresh) would otherwise collide
  // with the client's count and trigger the UNIQUE (session_id, display_order) constraint.
  const { data: maxRow } = await supabase
    .from("session_exercises")
    .select("display_order")
    .eq("session_id", sessionId)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle()

  const displayOrder = (maxRow?.display_order ?? 0) + 1

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

  revalidatePath("/history")
  revalidatePath("/dashboard")
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
      id: string
      set_number: number
      weight_kg: number | null
      reps: number
    }>
  }>
}

export type HistorySet = { set_number: number; weight_kg: number | null; reps: number }
export type HistorySession = { finished_at: string; sets: HistorySet[] }

export async function getExerciseHistory(
  exerciseId: string
): Promise<{ data: HistorySession[] | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null }

  // !inner join with the finished_at filter excludes the active session (finished_at IS NULL).
  // Returns up to 3 most recent finished sessions, newest first.
  const { data } = await supabase
    .from("session_exercises")
    .select(
      `set_entries (set_number, weight_kg, reps),
       workout_sessions!inner (finished_at)`
    )
    .eq("exercise_id", exerciseId)
    .not("workout_sessions.finished_at", "is", null)
    .order("finished_at", { referencedTable: "workout_sessions", ascending: false })
    .limit(3)

  if (!data || data.length === 0) return { data: null }

  type RawRow = { set_entries: HistorySet[]; workout_sessions: { finished_at: string } }
  const sessions: HistorySession[] = (data as unknown as RawRow[])
    .map((row) => ({
      finished_at: row.workout_sessions.finished_at,
      sets: [...row.set_entries].sort((a, b) => a.set_number - b.set_number),
    }))
    .filter((s) => s.sets.length > 0)

  return { data: sessions.length > 0 ? sessions : null }
}

const HISTORY_PAGE_SIZE = 15

export type RecentWorkout = {
  id: string
  finished_at: string
  exercise_names: string[]
}

export async function getRecentWorkouts(): Promise<RecentWorkout[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from("workout_sessions")
    .select(
      `id, finished_at,
       session_exercises (
         display_order,
         exercises (name)
       )`
    )
    .eq("user_id", user.id)
    .not("finished_at", "is", null)
    .order("finished_at", { ascending: false })
    .limit(5)

  if (!data) return []

  type RawRow = {
    id: string
    finished_at: string
    session_exercises: Array<{ display_order: number; exercises: { name: string } | null }>
  }

  return (data as unknown as RawRow[]).map((row) => ({
    id: row.id,
    finished_at: row.finished_at,
    exercise_names: [...row.session_exercises]
      .sort((a, b) => a.display_order - b.display_order)
      .map((se) => se.exercises?.name)
      .filter((n): n is string => !!n),
  }))
}

export async function getWorkoutHistory(cursor?: string): Promise<{
  data: HistorySummary[] | null
  nextCursor: string | null
  error?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, nextCursor: null, error: "Unauthorized" }

  let query = supabase
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
    .limit(HISTORY_PAGE_SIZE + 1)

  if (cursor) query = query.lt("finished_at", cursor)

  const { data, error } = await query
  if (error) return { data: null, nextCursor: null, error: error.message }

  const rows = data as unknown as HistorySummary[]
  const hasMore = rows.length > HISTORY_PAGE_SIZE
  const page = hasMore ? rows.slice(0, HISTORY_PAGE_SIZE) : rows
  const nextCursor = hasMore ? page[page.length - 1].finished_at : null

  return { data: page, nextCursor }
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
         set_entries (id, set_number, weight_kg, reps)
       )`
    )
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .not("finished_at", "is", null)
    .single()

  if (error) return { data: null, error: error.message }
  return { data: data as unknown as SessionDetail }
}
