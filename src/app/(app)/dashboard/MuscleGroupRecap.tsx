"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown } from "lucide-react"
import type { CategoryRecap } from "@/lib/actions/workout"

function formatCategory(category: string) {
  return category.charAt(0).toUpperCase() + category.slice(1)
}

function daysAgoLabel(iso: string) {
  // Date boundaries, not raw 24h deltas — a session last night reads "yesterday".
  const then = new Date(iso)
  const now = new Date()
  const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((midnight(now) - midnight(then)) / 86_400_000)
  if (days <= 0) return "today"
  if (days === 1) return "yesterday"
  return `${days} days ago`
}

export function MuscleGroupRecap({ recaps }: { recaps: CategoryRecap[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-muted-foreground">Muscle groups</h2>
      <div className="divide-y rounded-md border">
        {recaps.map((recap) => {
          const key = recap.category ?? "other"
          const isOpen = expanded === key
          return (
            <div key={key}>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`recap-panel-${key}`}
                onClick={() => setExpanded(isOpen ? null : key)}
                className="flex min-h-[44px] w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
              >
                <div className="flex min-w-0 items-baseline gap-2">
                  <span className="text-sm font-medium">{formatCategory(key)}</span>
                  <span className="text-xs text-muted-foreground truncate">
                    {daysAgoLabel(recap.finished_at)}
                  </span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground ml-3 transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {isOpen && (
                <div id={`recap-panel-${key}`} className="px-4 pb-3 space-y-1.5">
                  <ul className="space-y-0.5">
                    {recap.exercise_names.map((name, i) => (
                      <li key={i} className="text-xs text-muted-foreground">
                        {name}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/history/${recap.session_id}`}
                    className="inline-block text-xs font-medium text-primary hover:underline"
                  >
                    View session
                  </Link>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
