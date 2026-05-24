"use client"

import { useState, useEffect } from "react"
import { X, Search } from "lucide-react"
import { getExercises } from "@/lib/actions/exercises"

type Exercise = { id: string; name: string; category: string | null }

interface Props {
  onSelect: (exerciseId: string, exerciseName: string) => void
  onClose: () => void
}

export function ExercisePicker({ onSelect, onClose }: Props) {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getExercises().then(({ data }) => {
      if (data) setExercises(data)
      setLoading(false)
    })
  }, [])

  const filtered = search.trim()
    ? exercises.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
    : exercises

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
        ) : filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No exercises found</p>
        ) : (
          filtered.map((exercise) => (
            <button
              key={exercise.id}
              onClick={() => onSelect(exercise.id, exercise.name)}
              className="flex min-h-[44px] w-full items-center px-4 py-3 text-left text-sm hover:bg-muted"
            >
              <span className="font-medium">{exercise.name}</span>
              {exercise.category && (
                <span className="ml-2 text-xs capitalize text-muted-foreground">
                  {exercise.category}
                </span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  )
}
