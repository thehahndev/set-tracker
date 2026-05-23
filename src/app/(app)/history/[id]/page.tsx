import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { getSessionDetail } from "@/lib/actions/workout"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function formatDuration(startedAt: string, finishedAt: string) {
  const mins = Math.round(
    (new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 60000
  )
  return `${mins} min`
}

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { data: session } = await getSessionDetail(id)
  if (!session) notFound()

  const exercises = [...session.session_exercises].sort(
    (a, b) => a.display_order - b.display_order
  )

  return (
    <div className="px-4 py-6 space-y-6">
      <div className="space-y-1">
        <Link
          href="/history"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground -ml-1"
        >
          <ChevronLeft className="h-4 w-4" />
          History
        </Link>
        <h1 className="text-xl font-semibold">{formatDate(session.finished_at)}</h1>
        <p className="text-sm text-muted-foreground">
          {formatDuration(session.started_at, session.finished_at)}
          {" · "}
          {exercises.length} {exercises.length === 1 ? "exercise" : "exercises"}
        </p>
      </div>

      {exercises.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No exercises logged.</p>
      ) : (
        <div className="space-y-6">
          {exercises.map((exercise) => {
            const sets = [...exercise.set_entries].sort((a, b) => a.set_number - b.set_number)
            return (
              <div key={exercise.id} className="space-y-2">
                <h2 className="font-medium">{exercise.exercises?.name ?? "Unknown"}</h2>
                {sets.length > 0 ? (
                  <div className="divide-y rounded-md border text-sm">
                    <div className="grid grid-cols-[2rem_1fr_1fr] gap-2 px-3 py-1.5 text-xs text-muted-foreground">
                      <span>Set</span>
                      <span>Weight</span>
                      <span>Reps</span>
                    </div>
                    {sets.map((set) => (
                      <div
                        key={set.set_number}
                        className="grid grid-cols-[2rem_1fr_1fr] gap-2 px-3 py-2"
                      >
                        <span className="text-muted-foreground">{set.set_number}</span>
                        <span>{set.weight_kg != null ? `${set.weight_kg} kg` : "—"}</span>
                        <span>{set.reps}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No sets logged.</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
