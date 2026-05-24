export default function SessionDetailLoading() {
  return (
    <div className="px-4 py-6 space-y-6">
      <div className="space-y-1">
        <div className="h-4 w-16 rounded bg-muted animate-pulse" />
        <div className="h-7 w-48 rounded-md bg-muted animate-pulse" />
        <div className="h-4 w-32 rounded bg-muted animate-pulse" />
      </div>
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-5 w-36 rounded bg-muted animate-pulse" />
            <div className="divide-y rounded-md border">
              <div className="grid grid-cols-[2rem_1fr_1fr] gap-2 px-3 py-1.5">
                <div className="h-3 w-6 rounded bg-muted animate-pulse" />
                <div className="h-3 w-12 rounded bg-muted animate-pulse" />
                <div className="h-3 w-8 rounded bg-muted animate-pulse" />
              </div>
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="grid grid-cols-[2rem_1fr_1fr] gap-2 px-3 py-2">
                  <div className="h-4 w-4 rounded bg-muted animate-pulse" />
                  <div className="h-4 w-16 rounded bg-muted animate-pulse" />
                  <div className="h-4 w-8 rounded bg-muted animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
