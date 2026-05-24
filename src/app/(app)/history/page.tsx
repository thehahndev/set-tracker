import { getWorkoutHistory } from "@/lib/actions/workout"
import { HistoryList } from "./HistoryList"

export default async function HistoryPage() {
  const { data: sessions, nextCursor } = await getWorkoutHistory()

  return (
    <div className="px-4 py-6 space-y-4">
      <h1 className="text-xl font-semibold">History</h1>

      {!sessions || sessions.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No workouts yet — finish one to see it here.
        </p>
      ) : (
        <HistoryList
          initialSessions={sessions}
          initialNextCursor={nextCursor}
        />
      )}
    </div>
  )
}
