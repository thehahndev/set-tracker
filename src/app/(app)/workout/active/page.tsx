import { redirect } from "next/navigation"
import { getWorkoutSession, getExerciseHistory, getTemplateNameById, type HistorySession } from "@/lib/actions/workout"
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
  const [sourceTemplateName, ...historyResults] = await Promise.all([
    session.source_template_id
      ? getTemplateNameById(session.source_template_id)
      : Promise.resolve(null),
    ...exerciseIds.map(async (id) => {
      const { data } = await getExerciseHistory(id)
      return [id, data] as [string, HistorySession[] | null]
    }),
  ])

  const exerciseHistory = Object.fromEntries(
    (historyResults as [string, HistorySession[] | null][]).filter(([, sessions]) => sessions !== null)
  ) as Record<string, HistorySession[]>

  return (
    <ActiveWorkout
      session={session}
      exerciseHistory={exerciseHistory}
      sourceTemplateName={sourceTemplateName as string | null}
    />
  )
}
