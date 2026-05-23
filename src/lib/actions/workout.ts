"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

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
