import { notFound } from "next/navigation"
import { getExerciseProgress } from "@/lib/actions/workout"
import { ExerciseDetail } from "./ExerciseDetail"

export default async function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { data } = await getExerciseProgress(id)
  if (!data) notFound()

  return <ExerciseDetail progress={data} />
}
