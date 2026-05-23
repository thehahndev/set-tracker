export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <div className="px-4 py-6 space-y-4">
      <h1 className="text-xl font-semibold">Template</h1>
      {/* Phase 11: Template detail / edit */}
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        Template {id} — Phase 11
      </div>
    </div>
  )
}
