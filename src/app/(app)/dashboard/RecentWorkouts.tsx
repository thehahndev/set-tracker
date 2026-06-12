"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import type { RecentWorkout } from "@/lib/actions/workout"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
}

export function RecentWorkouts({ workouts }: { workouts: RecentWorkout[] }) {
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-muted-foreground">Recent</h2>
      <div className="divide-y rounded-md border">
        {workouts.map((workout) => (
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
  )
}
