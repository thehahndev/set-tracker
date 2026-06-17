"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { ChevronRight, Search } from "lucide-react"
import { CustomBadge } from "@/components/CustomBadge"

type Exercise = { id: string; name: string; category: string | null; created_by: string | null }

const CATEGORY_ORDER = ["chest", "back", "shoulders", "biceps", "triceps", "legs", "calves", "core"]

function formatCategory(category: string) {
  return category.charAt(0).toUpperCase() + category.slice(1)
}

export function ExerciseList({ exercises }: { exercises: Exercise[] }) {
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    if (!search.trim()) return exercises
    const q = search.toLowerCase()
    return exercises.filter((e) => e.name.toLowerCase().includes(q))
  }, [exercises, search])

  const grouped = useMemo(() => {
    const map = new Map<string, Exercise[]>()
    for (const exercise of filtered) {
      const cat = exercise.category ?? "other"
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(exercise)
    }
    return [...map.entries()].sort(([a], [b]) => {
      const ai = CATEGORY_ORDER.indexOf(a)
      const bi = CATEGORY_ORDER.indexOf(b)
      if (ai === -1 && bi === -1) return a.localeCompare(b)
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    })
  }, [filtered])

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search exercises…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      {grouped.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No exercises found</p>
      ) : (
        grouped.map(([category, items]) => (
          <div key={category}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {formatCategory(category)}
            </h2>
            <div className="divide-y rounded-md border">
              {items.map((exercise) => (
                <Link
                  key={exercise.id}
                  href={`/exercises/${exercise.id}`}
                  className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm hover:bg-muted/50"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="min-w-0 truncate">{exercise.name}</span>
                    {exercise.created_by && <CustomBadge />}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
