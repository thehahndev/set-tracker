import { redirect } from "next/navigation"
import { getWorkoutSession, getExerciseHistory, type HistorySet } from "@/lib/actions/workout"
import { ActiveWorkout } from "./ActiveWorkout"

interface Props {
  searchParams: Promise<{ session?: string }>
}

export default async function ActiveWorkoutPage({ searchParams }: Props) {
  const { session: sessionId } = await searchParams

  if (!sessionId) redirect("/dashboard")

  const { data: session, error } = await getWorkoutSession(sessionId)
  if (error || !session) redirect("/dashboard")

  const exerciseIds = session.session_exercises.map((se) => se.exercise_id)
  const historyEntries = await Promise.all(
    exerciseIds.map(async (id) => {
      const { data } = await getExerciseHistory(id)
      return [id, data] as [string, HistorySet[] | null]
    })
  )
  const exerciseHistory = Object.fromEntries(
    historyEntries.filter(([, sets]) => sets !== null)
  ) as Record<string, HistorySet[]>

  return <ActiveWorkout session={session} exerciseHistory={exerciseHistory} />
}
