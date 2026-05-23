"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

export type TemplateSummary = {
  id: string
  name: string
  created_at: string
  workout_template_exercises: Array<{ id: string }>
}

export type TemplateDetail = {
  id: string
  name: string
  workout_template_exercises: Array<{
    id: string
    display_order: number
    exercise_id: string
    exercises: { name: string } | null
  }>
}

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  exerciseIds: z.array(z.string().uuid()).min(1),
})

export async function getTemplates(): Promise<{
  data: TemplateSummary[] | null
  error?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: "Unauthorized" }

  const { data, error } = await supabase
    .from("workout_templates")
    .select(`id, name, created_at, workout_template_exercises(id)`)
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })

  if (error) return { data: null, error: error.message }
  return { data: data as unknown as TemplateSummary[] }
}

export async function getTemplateDetail(templateId: string): Promise<{
  data: TemplateDetail | null
  error?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: "Unauthorized" }

  const { data, error } = await supabase
    .from("workout_templates")
    .select(
      `id, name,
       workout_template_exercises (
         id, display_order, exercise_id,
         exercises (name)
       )`
    )
    .eq("id", templateId)
    .eq("user_id", user.id)
    .single()

  if (error) return { data: null, error: error.message }
  return { data: data as unknown as TemplateDetail }
}

export async function createTemplate(input: z.infer<typeof createTemplateSchema>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const parsed = createTemplateSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.message }

  const { data: template, error } = await supabase
    .from("workout_templates")
    .insert({ user_id: user.id, name: parsed.data.name })
    .select("id")
    .single()

  if (error) return { error: error.message }

  const { error: teErr } = await supabase.from("workout_template_exercises").insert(
    parsed.data.exerciseIds.map((exerciseId, index) => ({
      template_id: template.id,
      exercise_id: exerciseId,
      display_order: index + 1,
    }))
  )

  if (teErr) return { error: teErr.message }

  revalidatePath("/templates")
  return { data: template }
}

export async function deleteTemplate(templateId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { error } = await supabase
    .from("workout_templates")
    .delete()
    .eq("id", templateId)
    .eq("user_id", user.id)

  if (error) return { error: error.message }
  revalidatePath("/templates")
  return { data: true }
}
