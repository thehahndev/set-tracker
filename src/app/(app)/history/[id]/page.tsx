export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <div className="px-4 py-6 space-y-4">
      <h1 className="text-xl font-semibold">Workout</h1>
      {/* Phase 12: Session detail view */}
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        Session {id} — Phase 12
      </div>
    </div>
  )
}
