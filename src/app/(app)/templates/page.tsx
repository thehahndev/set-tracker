import Link from "next/link"
import { ChevronRight, Plus } from "lucide-react"
import { getTemplates } from "@/lib/actions/templates"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default async function TemplatesPage() {
  const { data: templates } = await getTemplates()

  return (
    <div className="px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Templates</h1>
        <Link
          href="/templates/new"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          <Plus className="h-4 w-4" />
          New
        </Link>
      </div>

      {!templates || templates.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No templates yet — save one when finishing a workout, or{" "}
          <Link href="/templates/new" className="underline underline-offset-4">
            create one manually
          </Link>
          .
        </p>
      ) : (
        <div className="divide-y rounded-md border">
          {templates.map((template) => {
            const count = template.workout_template_exercises.length
            return (
              <Link
                key={template.id}
                href={`/templates/${template.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{template.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {count} {count === 1 ? "exercise" : "exercises"}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
