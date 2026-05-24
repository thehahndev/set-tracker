import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { getActiveSession, getRecentWorkouts } from "@/lib/actions/workout"
import { DashboardCTAs } from "./DashboardCTAs"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
}

export default async function DashboardPage() {
  const [{ data: activeSession }, recentWorkouts] = await Promise.all([
    getActiveSession(),
    getRecentWorkouts(),
  ])

  return (
    <div className="px-4 py-6 space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <DashboardCTAs activeSessionId={activeSession?.id ?? null} />

      {recentWorkouts.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Recent</h2>
          <div className="divide-y rounded-md border">
            {recentWorkouts.map((workout) => (
              <Link
                key={workout.id}
                href={`/history/${workout.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <div className="space-y-0.5 min-w-0">
                  <p className="text-sm font-medium">{formatDate(workout.finished_at)}</p>
                  {workout.exercise_names.length > 0 && (
                    <p className="text-xs text-muted-foreground truncate">
                      {workout.exercise_names.join(", ")}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground ml-3" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
