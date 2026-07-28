import {
  getActiveSession,
  getLastSessionPerCategory,
  getRecentWorkouts,
} from "@/lib/actions/workout"
import { DashboardCTAs } from "./DashboardCTAs"
import { MuscleGroupRecap } from "./MuscleGroupRecap"
import { RecentWorkouts } from "./RecentWorkouts"

export default async function DashboardPage() {
  const [{ data: activeSession }, recentWorkouts, categoryRecaps] = await Promise.all([
    getActiveSession(),
    getRecentWorkouts(),
    getLastSessionPerCategory(),
  ])

  return (
    <div className="px-4 py-6 space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <DashboardCTAs activeSessionId={activeSession?.id ?? null} />

      {categoryRecaps.length > 0 && <MuscleGroupRecap recaps={categoryRecaps} />}
      {recentWorkouts.length > 0 && <RecentWorkouts workouts={recentWorkouts} />}
    </div>
  )
}
