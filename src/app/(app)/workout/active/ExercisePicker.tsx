"use client"

import { useState, useEffect, useMemo } from "react"
import { X, Search, Plus } from "lucide-react"
import { toast } from "sonner"
import { createExercise, getExercises } from "@/lib/actions/exercises"
import { createClient } from "@/lib/supabase/client"
import { CustomBadge } from "@/components/CustomBadge"
import { compareCategories } from "@/lib/categories"
import { cn } from "@/lib/utils"

type Exercise = { id: string; name: string; category: string | null; created_by: string | null }

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex min-h-[44px] shrink-0 items-center rounded-full border px-3.5 text-sm transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input text-muted-foreground hover:bg-muted"
      )}
    >
      {children}
    </button>
  )
}

interface Props {
  onSelect: (exerciseId: string, exerciseName: string, createdBy: string | null) => void
  onClose: () => void
  /** When true, offer inline creation of a new custom exercise from the search term. */
  allowCreate?: boolean
}

export function ExercisePicker({ onSelect, onClose, allowCreate = false }: Props) {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  // Muscle-group filter; null means "All". Deliberately not persisted — the picker unmounts
  // on close, so each open starts unfiltered rather than hiding the library behind a stale chip.
  const [category, setCategory] = useState<string | null>(null)
  // Viewer's id — the Custom badge is shown only for exercises they created (others' customs
  // read as part of the shared library). Fetched here so both picker call sites stay simple.
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    getExercises().then(({ data }) => {
      if (data) setExercises(data)
      setLoading(false)
    })
    createClient()
      .auth.getUser()
      .then(({ data }) => setCurrentUserId(data.user?.id ?? null))
  }, [])

  const trimmedSearch = search.trim()

  // Chips come from the loaded library rather than CATEGORY_ORDER, so custom exercises with
  // an unknown category still get a chip and empty categories don't. Nulls collapse to
  // "other", matching how the exercises list groups them.
  const categories = useMemo(
    () => [...new Set(exercises.map((e) => e.category ?? "other"))].sort(compareCategories),
    [exercises]
  )

  // Muscle group and search term are ANDed: the chip narrows the library, the text box
  // searches names within it. Search stays name-only so the "Create …" row below the list
  // keeps treating the typed text as a name.
  const filtered = useMemo(
    () =>
      exercises.filter((e) => {
        if (category !== null && (e.category ?? "other") !== category) return false
        if (trimmedSearch && !e.name.toLowerCase().includes(trimmedSearch.toLowerCase()))
          return false
        return true
      }),
    [exercises, category, trimmedSearch]
  )

  // Offer inline creation only once the library has loaded (so we can dedupe) and the typed
  // name doesn't already exist — exercises.name is globally UNIQUE, so creating a duplicate
  // would fail at the DB. An exact match should be tapped in the list instead.
  const hasExactMatch = exercises.some(
    (e) => e.name.toLowerCase() === trimmedSearch.toLowerCase()
  )
  const showCreate = allowCreate && !loading && trimmedSearch !== "" && !hasExactMatch

  async function handleCreate() {
    if (!trimmedSearch || creating) return
    setCreating(true)
    // Inherit the active chip, so an exercise created while filtered to "Back" doesn't land
    // uncategorised and vanish from the list the user is looking at. "other" is the bucket
    // for null, so it maps back to null rather than becoming a literal category.
    const result = await createExercise({
      name: trimmedSearch,
      category: category === "other" ? null : category,
    })
    if (result.error || !result.data) {
      toast.error(result.error ?? "Couldn't create exercise")
      setCreating(false)
      return
    }
    // Hand off to the same path as picking an existing exercise; the parent closes the picker
    // and adds the exercise to the session optimistically.
    onSelect(result.data.id, result.data.name, result.data.created_by)
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="font-semibold">Add Exercise</h2>
        <button
          onClick={onClose}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="border-b px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search exercises…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            // The typed text becomes the name when creating via "Create …", so capitalise
            // words to keep inline-created exercises consistent with the seeded library.
            autoCapitalize="words"
            className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {categories.length > 1 && (
          <div
            role="group"
            aria-label="Filter by muscle group"
            // Negative margin lets the row scroll edge-to-edge while the chips keep the
            // container's horizontal padding.
            className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4"
          >
            <FilterChip active={category === null} onClick={() => setCategory(null)}>
              All
            </FilterChip>
            {categories.map((cat) => (
              <FilterChip
                key={cat}
                active={category === cat}
                onClick={() => setCategory(category === cat ? null : cat)}
              >
                <span className="capitalize">{cat}</span>
              </FilterChip>
            ))}
          </div>
        )}
      </div>
      <div className="flex-1 divide-y overflow-y-auto">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="h-4 w-32 rounded bg-muted" />
                <div className="h-3 w-16 rounded bg-muted" />
              </div>
            </div>
          ))
        ) : (
          <>
            {filtered.map((exercise) => (
              <button
                key={exercise.id}
                onClick={() => onSelect(exercise.id, exercise.name, exercise.created_by)}
                className="flex min-h-[44px] w-full items-center px-4 py-3 text-left text-sm hover:bg-muted"
              >
                <span className="font-medium">{exercise.name}</span>
                {exercise.category && (
                  <span className="ml-2 text-xs capitalize text-muted-foreground">
                    {exercise.category}
                  </span>
                )}
                {exercise.created_by != null && exercise.created_by === currentUserId && (
                  <CustomBadge className="ml-2" />
                )}
              </button>
            ))}
            {showCreate && (
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex min-h-[44px] w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-primary hover:bg-muted disabled:opacity-60"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span>{creating ? "Creating…" : `Create “${trimmedSearch}”`}</span>
              </button>
            )}
            {filtered.length === 0 && !showCreate && (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {category !== null ? (
                    <>
                      No <span className="capitalize">{category}</span> exercises
                      {trimmedSearch && " match that search"}
                    </>
                  ) : (
                    "No exercises found"
                  )}
                </p>
                {category !== null && (
                  <button
                    onClick={() => setCategory(null)}
                    className="mt-2 min-h-[44px] text-sm font-medium text-primary hover:underline"
                  >
                    Show all muscle groups
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
