import { getActiveSession, getRecentWorkouts } from "@/lib/actions/workout"
import { DashboardCTAs } from "./DashboardCTAs"
import { RecentWorkouts } from "./RecentWorkouts"

export default async function DashboardPage() {
  const [{ data: activeSession }, recentWorkouts] = await Promise.all([
    getActiveSession(),
    getRecentWorkouts(),
  ])

  return (
    <div className="px-4 py-6 space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <DashboardCTAs activeSessionId={activeSession?.id ?? null} />

      {recentWorkouts.length > 0 && <RecentWorkouts workouts={recentWorkouts} />}
    </div>
  )
}
