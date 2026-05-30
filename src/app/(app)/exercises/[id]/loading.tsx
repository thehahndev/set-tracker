export default function ExerciseDetailLoading() {
  return (
    <div className="px-4 py-6 space-y-5">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-md bg-muted animate-pulse" />
        <div className="h-7 w-40 rounded-md bg-muted animate-pulse" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 rounded-md bg-muted animate-pulse" />
        ))}
      </div>
      <div className="h-9 w-full rounded-md bg-muted animate-pulse" />
      <div className="h-40 w-full rounded-md bg-muted animate-pulse" />
      <div className="divide-y rounded-md border">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-3 py-2.5">
            <div className="h-4 w-16 rounded bg-muted animate-pulse" />
            <div className="h-4 w-12 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
