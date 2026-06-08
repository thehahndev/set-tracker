import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getExerciseProgress } from "@/lib/actions/workout"
import { getExercise } from "@/lib/actions/exercises"
import { ExerciseDetail } from "./ExerciseDetail"

export default async function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [{ data: progress }, { data: exercise }, supabase] = await Promise.all([
    getExerciseProgress(id),
    getExercise(id),
    createClient(),
  ])
  if (!progress || !exercise) notFound()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isOwner = !!user && exercise.created_by === user.id

  return <ExerciseDetail progress={progress} exercise={exercise} isOwner={isOwner} />
}
