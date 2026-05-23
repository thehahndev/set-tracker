"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Plus, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { createTemplate } from "@/lib/actions/templates"
import { ExercisePicker } from "@/app/(app)/workout/active/ExercisePicker"

type SelectedExercise = { id: string; name: string }

export default function NewTemplatePage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [exercises, setExercises] = useState<SelectedExercise[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  function handleSelect(id: string, exerciseName: string) {
    if (!exercises.find((e) => e.id === id)) {
      setExercises((prev) => [...prev, { id, name: exerciseName }])
    }
    setShowPicker(false)
  }

  async function handleSubmit() {
    if (!name.trim() || exercises.length === 0) return
    setSubmitting(true)
    const result = await createTemplate({
      name: name.trim(),
      exerciseIds: exercises.map((e) => e.id),
    })
    if (result.error) {
      toast.error(result.error)
      setSubmitting(false)
      return
    }
    router.push("/templates")
  }

  return (
    <>
      <div className="px-4 py-6 space-y-6">
        <div>
          <Link
            href="/templates"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground -ml-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Templates
          </Link>
          <h1 className="mt-1 text-xl font-semibold">New Template</h1>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Name</label>
          <input
            type="text"
            placeholder="e.g. Push Day A"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Exercises</p>
          {exercises.length > 0 && (
            <div className="divide-y rounded-md border">
              {exercises.map((ex) => (
                <div
                  key={ex.id}
                  className="flex items-center justify-between px-3 py-2.5 text-sm"
                >
                  <span>{ex.name}</span>
                  <button
                    onClick={() => setExercises((prev) => prev.filter((e) => e.id !== ex.id))}
                    className="p-1 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <Button variant="outline" className="w-full" onClick={() => setShowPicker(true)}>
            <Plus className="h-4 w-4" />
            Add Exercise
          </Button>
        </div>

        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={!name.trim() || exercises.length === 0 || submitting}
        >
          {submitting ? "Saving…" : "Save Template"}
        </Button>
      </div>

      {showPicker && (
        <ExercisePicker onSelect={handleSelect} onClose={() => setShowPicker(false)} />
      )}
    </>
  )
}
