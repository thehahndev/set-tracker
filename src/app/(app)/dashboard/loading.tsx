export default function DashboardLoading() {
  return (
    <div className="px-4 py-6 space-y-6">
      <div className="h-7 w-24 rounded-md bg-muted animate-pulse" />
      <div className="space-y-3">
        <div className="h-11 w-full rounded-md bg-muted animate-pulse" />
        <div className="h-11 w-full rounded-md bg-muted animate-pulse" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-12 rounded bg-muted animate-pulse" />
        <div className="divide-y rounded-md border">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <div className="space-y-1.5">
                <div className="h-4 w-28 rounded bg-muted animate-pulse" />
                <div className="h-3 w-40 rounded bg-muted animate-pulse" />
              </div>
              <div className="h-4 w-4 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
