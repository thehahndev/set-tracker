export default function ExercisesLoading() {
  return (
    <div className="px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-7 w-24 rounded-md bg-muted animate-pulse" />
        <div className="h-8 w-16 rounded-md bg-muted animate-pulse" />
      </div>
      <div className="h-9 w-full rounded-md bg-muted animate-pulse" />
      <div className="divide-y rounded-md border">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="px-4 py-3">
            <div className="h-4 w-32 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
