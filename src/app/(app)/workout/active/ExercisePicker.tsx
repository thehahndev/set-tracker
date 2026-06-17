"use client"

import { useState, useEffect } from "react"
import { X, Search, Plus } from "lucide-react"
import { toast } from "sonner"
import { createExercise, getExercises } from "@/lib/actions/exercises"

type Exercise = { id: string; name: string; category: string | null; created_by: string | null }

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

  useEffect(() => {
    getExercises().then(({ data }) => {
      if (data) setExercises(data)
      setLoading(false)
    })
  }, [])

  const trimmedSearch = search.trim()
  const filtered = trimmedSearch
    ? exercises.filter((e) => e.name.toLowerCase().includes(trimmedSearch.toLowerCase()))
    : exercises

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
    const result = await createExercise({ name: trimmedSearch, category: null })
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
            className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
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
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No exercises found
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
