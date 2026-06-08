import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getExercise } from "@/lib/actions/exercises"
import { EditExerciseForm } from "./EditExerciseForm"

export default async function EditExercisePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [{ data: exercise }, supabase] = await Promise.all([getExercise(id), createClient()])
  if (!exercise) notFound()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || exercise.created_by !== user.id) redirect(`/exercises/${id}`)

  return <EditExerciseForm exercise={exercise} />
}
