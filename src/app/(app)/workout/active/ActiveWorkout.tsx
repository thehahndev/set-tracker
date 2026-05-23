"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  addSet,
  deleteSet,
  addExerciseToSession,
  removeExerciseFromSession,
  finishWorkout,
  type WorkoutSession,
} from "@/lib/actions/workout"
import { ExercisePicker } from "./ExercisePicker"

type SessionExercise = WorkoutSession["session_exercises"][number]

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")
  const s = (seconds % 60).toString().padStart(2, "0")
  return `${m}:${s}`
}

export function ActiveWorkout({ session }: { session: WorkoutSession }) {
  const router = useRouter()
  const [exercises, setExercises] = useState<SessionExercise[]>(
    [...session.session_exercises].sort((a, b) => a.display_order - b.display_order)
  )
  const [setInputs, setSetInputs] = useState<Record<string, { weight: string; reps: string }>>({})
  const [elapsed, setElapsed] = useState(0)
  const [showPicker, setShowPicker] = useState(false)
  const [showFinish, setShowFinish] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [finishing, setFinishing] = useState(false)

  useEffect(() => {
    const start = new Date(session.started_at).getTime()
    const update = () => setElapsed(Math.floor((Date.now() - start) / 1000))
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [session.started_at])

  function getInput(id: string) {
    return setInputs[id] ?? { weight: "", reps: "" }
  }

  function updateInput(id: string, field: "weight" | "reps", value: string) {
    setSetInputs((prev) => ({ ...prev, [id]: { ...getInput(id), [field]: value } }))
  }

  async function handleAddSet(exercise: SessionExercise) {
    const input = getInput(exercise.id)
    const reps = parseInt(input.reps)
    if (!reps || reps <= 0) return
    const weightKg = input.weight !== "" ? parseFloat(input.weight) : null
    if (weightKg !== null && isNaN(weightKg)) return

    const result = await addSet({
      sessionExerciseId: exercise.id,
      setNumber: exercise.set_entries.length + 1,
      weightKg,
      reps,
    })
    if (result.error || !result.data) return

    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exercise.id
          ? { ...ex, set_entries: [...ex.set_entries, result.data!] }
          : ex
      )
    )
    setSetInputs((prev) => ({ ...prev, [exercise.id]: { weight: input.weight, reps: "" } }))
  }

  async function handleDeleteSet(exerciseId: string, setId: string) {
    await deleteSet(setId)
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exerciseId
          ? { ...ex, set_entries: ex.set_entries.filter((s) => s.id !== setId) }
          : ex
      )
    )
  }

  async function handleRemoveExercise(sessionExerciseId: string) {
    await removeExerciseFromSession(sessionExerciseId)
    setExercises((prev) => prev.filter((ex) => ex.id !== sessionExerciseId))
  }

  async function handleAddExercise(exerciseId: string, exerciseName: string) {
    const displayOrder = (exercises[exercises.length - 1]?.display_order ?? 0) + 1
    const result = await addExerciseToSession(session.id, exerciseId, displayOrder)
    if (result.error || !result.data) return

    setExercises((prev) => [
      ...prev,
      {
        id: result.data!.id,
        exercise_id: exerciseId,
        display_order: displayOrder,
        exercises: { name: exerciseName },
        set_entries: [],
      },
    ])
    setShowPicker(false)
  }

  async function handleFinish() {
    setFinishing(true)
    await finishWorkout(session.id, templateName || undefined)
    localStorage.removeItem("activeSessionId")
    router.push("/history")
  }

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-4 py-3">
        <span className="tabular-nums text-sm text-muted-foreground">{formatTime(elapsed)}</span>
        <h1 className="text-base font-semibold">Workout</h1>
        <button
          onClick={() => setShowFinish(true)}
          className="text-sm font-medium text-primary"
        >
          Finish
        </button>
      </div>

      <div className="px-4 py-4 space-y-6">
        {exercises.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No exercises yet — add one below.
          </p>
        )}

        {exercises.map((exercise) => (
          <div key={exercise.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">{exercise.exercises?.name ?? "Unknown"}</h2>
              <button
                onClick={() => handleRemoveExercise(exercise.id)}
                className="p-1 text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {exercise.set_entries.length > 0 && (
              <div className="divide-y rounded-md border text-sm">
                <div className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 px-3 py-1.5 text-xs text-muted-foreground">
                  <span>Set</span>
                  <span>Weight</span>
                  <span>Reps</span>
                  <span />
                </div>
                {exercise.set_entries.map((set) => (
                  <div
                    key={set.id}
                    className="grid grid-cols-[2rem_1fr_1fr_2rem] items-center gap-2 px-3 py-2"
                  >
                    <span className="text-muted-foreground">{set.set_number}</span>
                    <span>{set.weight_kg != null ? `${set.weight_kg} kg` : "—"}</span>
                    <span>{set.reps}</span>
                    <button
                      onClick={() => handleDeleteSet(exercise.id, set.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="kg"
                min="0"
                step="0.5"
                value={getInput(exercise.id).weight}
                onChange={(e) => updateInput(exercise.id, "weight", e.target.value)}
                className="w-20 rounded-md border border-input bg-background px-2 py-1.5 text-center text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                type="number"
                placeholder="reps"
                min="1"
                step="1"
                value={getInput(exercise.id).reps}
                onChange={(e) => updateInput(exercise.id, "reps", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddSet(exercise)}
                className="w-20 rounded-md border border-input bg-background px-2 py-1.5 text-center text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAddSet(exercise)}
                disabled={!getInput(exercise.id).reps}
              >
                <Plus className="h-4 w-4" />
                Log
              </Button>
            </div>
          </div>
        ))}

        <Button variant="outline" className="w-full" onClick={() => setShowPicker(true)}>
          <Plus className="h-4 w-4" />
          Add Exercise
        </Button>
      </div>

      {showPicker && (
        <ExercisePicker onSelect={handleAddExercise} onClose={() => setShowPicker(false)} />
      )}

      {showFinish && (
        <div className="fixed inset-0 z-50 flex items-end bg-background/80 backdrop-blur-sm">
          <div className="w-full space-y-4 rounded-t-xl border-t bg-background p-6">
            <h2 className="text-lg font-semibold">Finish Workout?</h2>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Save as template{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Push Day A"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowFinish(false)}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleFinish} disabled={finishing}>
                {finishing ? "Saving…" : "Finish"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
