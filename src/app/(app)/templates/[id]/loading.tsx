export default function TemplateDetailLoading() {
  return (
    <div className="px-4 py-6 space-y-6">
      <div>
        <div className="h-4 w-20 rounded bg-muted animate-pulse" />
        <div className="mt-1 h-7 w-40 rounded-md bg-muted animate-pulse" />
        <div className="mt-1 h-4 w-24 rounded bg-muted animate-pulse" />
      </div>
      <div className="divide-y rounded-md border">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="h-4 w-4 rounded bg-muted animate-pulse" />
            <div className="h-4 w-32 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <div className="h-10 w-full rounded-md bg-muted animate-pulse" />
        <div className="h-10 w-full rounded-md bg-muted animate-pulse" />
      </div>
    </div>
  )
}
