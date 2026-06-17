import { cn } from "@/lib/utils"

/**
 * Small "Custom" tag marking a user-created exercise (exercises.created_by != null),
 * as opposed to a seeded/built-in one. Bordered so it reads on any row background.
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
