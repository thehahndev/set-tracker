import { redirect } from "next/navigation"
import { getWorkoutSession } from "@/lib/actions/workout"
import { ActiveWorkout } from "./ActiveWorkout"

interface Props {
  searchParams: Promise<{ session?: string }>
}

export default async function ActiveWorkoutPage({ searchParams }: Props) {
  const { session: sessionId } = await searchParams

  if (!sessionId) redirect("/dashboard")

  const { data: session, error } = await getWorkoutSession(sessionId)
  if (error || !session) redirect("/dashboard")

  return <ActiveWorkout session={session} />
}
