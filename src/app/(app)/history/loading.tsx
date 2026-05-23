export default function HistoryLoading() {
  return (
    <div className="px-4 py-6 space-y-4">
      <div className="h-7 w-20 rounded-md bg-muted animate-pulse" />
      <div className="divide-y rounded-md border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3">
            <div className="space-y-1.5">
              <div className="h-4 w-40 rounded bg-muted animate-pulse" />
              <div className="h-3 w-28 rounded bg-muted animate-pulse" />
            </div>
            <div className="h-4 w-4 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
