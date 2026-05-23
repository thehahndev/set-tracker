interface Props {
  searchParams: Promise<{ session?: string }>
}

export default async function ActiveWorkoutPage({ searchParams }: Props) {
  const { session: sessionId } = await searchParams

  if (!sessionId) {
    return (
      <div className="px-4 py-6">
        <p className="text-sm text-muted-foreground">No active session.</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">0:00</span>
        <h1 className="text-base font-semibold">Workout</h1>
        <button className="text-sm font-medium">Finish</button>
      </div>
      {/* Phase 9: ActiveWorkout client component */}
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        Active workout — Phase 9
      </div>
    </div>
  )
}
