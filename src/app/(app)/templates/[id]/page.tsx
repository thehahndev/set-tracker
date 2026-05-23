import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { getTemplateDetail } from "@/lib/actions/templates"
import { TemplateActions } from "./TemplateActions"

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { data: template } = await getTemplateDetail(id)
  if (!template) notFound()

  const exercises = [...template.workout_template_exercises].sort(
    (a, b) => a.display_order - b.display_order
  )

  return (
    <div className="px-4 py-6 space-y-6">
      <div>
        <Link
          href="/templates"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground -ml-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Templates
        </Link>
        <h1 className="mt-1 text-xl font-semibold">{template.name}</h1>
        <p className="text-sm text-muted-foreground">
          {exercises.length} {exercises.length === 1 ? "exercise" : "exercises"}
        </p>
      </div>

      {exercises.length > 0 && (
        <div className="divide-y rounded-md border">
          {exercises.map((te, i) => (
            <div key={te.id} className="flex items-center gap-3 px-4 py-3 text-sm">
              <span className="w-5 text-center text-xs text-muted-foreground">{i + 1}</span>
              <span>{te.exercises?.name ?? "Unknown"}</span>
            </div>
          ))}
        </div>
      )}

      <TemplateActions templateId={template.id} />
    </div>
  )
}
