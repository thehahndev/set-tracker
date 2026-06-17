"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const exerciseFieldsSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.string().max(50).nullable().optional(),
})

const createExerciseSchema = exerciseFieldsSchema
const updateExerciseSchema = exerciseFieldsSchema.extend({ id: z.string().uuid() })

// exercises.name is globally UNIQUE; surface a friendly message for the Postgres
// unique_violation (23505) instead of leaking the raw DB error to the UI.
const DUPLICATE_NAME_MESSAGE = "An exercise with that name already exists"

export async function createExercise(input: z.infer<typeof createExerciseSchema>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const parsed = createExerciseSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.message }

  const { data, error } = await supabase
    .from("exercises")
    .insert({
      name: parsed.data.name,
      category: parsed.data.category ?? null,
      created_by: user.id,
    })
    .select("id, name, category")
    .single()

  if (error) {
    if (error.code === "23505") return { error: DUPLICATE_NAME_MESSAGE }
    return { error: error.message }
  }
  revalidatePath("/exercises")
  return { data }
}

export async function getExercise(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("exercises")
    .select("id, name, category, created_by")
    .eq("id", id)
    .single()
  if (error) return { error: error.message }
  return { data }
}

export async function updateExercise(input: z.infer<typeof updateExerciseSchema>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const parsed = updateExerciseSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.message }

  const { error } = await supabase
    .from("exercises")
    .update({ name: parsed.data.name, category: parsed.data.category ?? null })
    .eq("id", parsed.data.id)

  if (error) {
    if (error.code === "23505") return { error: DUPLICATE_NAME_MESSAGE }
    return { error: error.message }
  }
  revalidatePath("/exercises")
  revalidatePath(`/exercises/${parsed.data.id}`)
  return {}
}

export async function getExercises(search?: string) {
  const supabase = await createClient()

  let query = supabase.from("exercises").select("id, name, category").order("name")

  if (search) {
    query = query.ilike("name", `%${search}%`)
  }

  const { data, error } = await query
  if (error) return { error: error.message }
  return { data }
}
