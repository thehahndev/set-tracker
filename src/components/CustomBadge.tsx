import { cn } from "@/lib/utils"

/**
 * Small "Custom" tag marking an exercise the *current* viewer created
 * (exercises.created_by === current user). Exercises are a shared library, so another
 * user's custom exercise is shown unbadged — indistinguishable from a seeded one — and
 * callers must pass the viewer's id to decide ownership. Bordered so it reads on any row.
 */
export function CustomBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground",
        className
      )}
    >
      Custom
    </span>
  )
}
