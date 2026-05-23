import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { getWorkoutHistory } from "@/lib/actions/workout"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function formatDuration(startedAt: string, finishedAt: string) {
  const mins = Math.round(
    (new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 60000
  )
  return `${mins} min`
}

export default async function HistoryPage() {
  const { data: sessions } = await getWorkoutHistory()

  return (
    <div className="px-4 py-6 space-y-4">
      <h1 className="text-xl font-semibold">History</h1>

      {!sessions || sessions.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No workouts yet — finish one to see it here.
        </p>
      ) : (
        <div className="divide-y rounded-md border">
          {sessions.map((session) => {
            const exerciseCount = session.session_exercises.length
            const setCount = session.session_exercises.reduce(
              (acc, se) => acc + se.set_entries.length,
              0
            )
            return (
              <Link
                key={session.id}
                href={`/history/${session.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{formatDate(session.finished_at)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDuration(session.started_at, session.finished_at)}
                    {exerciseCount > 0 && (
                      <>
                        {" · "}
                        {exerciseCount} {exerciseCount === 1 ? "exercise" : "exercises"}
                        {" · "}
                        {setCount} {setCount === 1 ? "set" : "sets"}
                      </>
                    )}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
