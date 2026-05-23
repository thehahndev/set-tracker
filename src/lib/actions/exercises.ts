"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const createExerciseSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.string().max(50).nullable().optional(),
})

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

  if (error) return { error: error.message }
  revalidatePath("/exercises")
  return { data }
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
