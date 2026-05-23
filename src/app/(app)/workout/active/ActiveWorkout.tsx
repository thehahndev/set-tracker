"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, ChevronUp, Plus, Trash2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  addSet,
  deleteSet,
  addExerciseToSession,
  removeExerciseFromSession,
  finishWorkout,
  getExerciseHistory,
  type WorkoutSession,
  type HistorySession,
} from "@/lib/actions/workout"
import { ExercisePicker } from "./ExercisePicker"

type SessionExercise = WorkoutSession["session_exercises"][number]

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0")
  const s = (seconds % 60).toString().padStart(2, "0")
  return `${m}:${s}`
}

function formatShortDate(isoString: string) {
  return new Date(isoString).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function buildInitialInputs(
  exercises: WorkoutSession["session_exercises"],
  history: Record<string, HistorySession[]>
) {
  const inputs: Record<string, { weight: string; reps: string }> = {}
  for (const ex of exercises) {
    const sessions = history[ex.exercise_id]
    const lastSet = sessions?.[0]?.sets.at(-1)
    if (!lastSet) continue
    inputs[ex.id] = {
      weight: lastSet.weight_kg != null ? String(lastSet.weight_kg) : "",
      reps: String(lastSet.reps),
    }
  }
  return inputs
}

export function ActiveWorkout({
  session,
  exerciseHistory,
}: {
  session: WorkoutSession
  exerciseHistory: Record<string, HistorySession[]>
}) {
  const router = useRouter()
  const [exercises, setExercises] = useState<SessionExercise[]>(
    [...session.session_exercises].sort((a, b) => a.display_order - b.display_order)
  )
  const [setInputs, setSetInputs] = useState<Record<string, { weight: string; reps: string }>>(
    () => buildInitialInputs(session.session_exercises, exerciseHistory)
  )
  const [history, setHistory] = useState<Record<string, HistorySession[]>>(exerciseHistory)
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set())
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

  function toggleHistory(exerciseId: string) {
    setExpandedHistory((prev) => {
      const next = new Set(prev)
      if (next.has(exerciseId)) next.delete(exerciseId)
      else next.add(exerciseId)
      return next
    })
  }

  async function handleAddSet(exercise: SessionExercise) {
    const input = getInput(exercise.id)
    const reps = parseInt(input.reps)
    if (!reps || reps <= 0) return
    const weightKg = input.weight !== "" ? parseFloat(input.weight) : null
    if (weightKg !== null && isNaN(weightKg)) return

    const setNumber = exercise.set_entries.length + 1
    const tempId = `pending-${Date.now()}`

    // Optimistic update — show row immediately, roll back on failure
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exercise.id
          ? {
              ...ex,
              set_entries: [
                ...ex.set_entries,
                { id: tempId, set_number: setNumber, weight_kg: weightKg, reps },
              ],
            }
          : ex
      )
    )
    setSetInputs((prev) => ({ ...prev, [exercise.id]: { weight: input.weight, reps: "" } }))

    const result = await addSet({
      sessionExerciseId: exercise.id,
      setNumber,
      weightKg,
      reps,
    })

    if (result.error || !result.data) {
      setExercises((prev) =>
        prev.map((ex) =>
          ex.id === exercise.id
            ? { ...ex, set_entries: ex.set_entries.filter((s) => s.id !== tempId) }
            : ex
        )
      )
      return
    }

    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exercise.id
          ? {
              ...ex,
              set_entries: ex.set_entries.map((s) => (s.id === tempId ? result.data! : s)),
            }
          : ex
      )
    )
  }

  async function handleDeleteSet(exerciseId: string, setId: string) {
    if (setId.startsWith("pending-")) return
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
    const [result, historyResult] = await Promise.all([
      addExerciseToSession(session.id, exerciseId, displayOrder),
      getExerciseHistory(exerciseId),
    ])
    if (result.error || !result.data) return

    const newSessionExerciseId = result.data!.id
    setExercises((prev) => [
      ...prev,
      {
        id: newSessionExerciseId,
        exercise_id: exerciseId,
        display_order: displayOrder,
        exercises: { name: exerciseName },
        set_entries: [],
      },
    ])

    if (historyResult.data) {
      setHistory((prev) => ({ ...prev, [exerciseId]: historyResult.data! }))
      const lastSet = historyResult.data[0]?.sets.at(-1)
      if (lastSet) {
        setSetInputs((prev) => ({
          ...prev,
          [newSessionExerciseId]: {
            weight: lastSet.weight_kg != null ? String(lastSet.weight_kg) : "",
            reps: String(lastSet.reps),
          },
        }))
      }
    }

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
          className="flex min-h-[44px] min-w-[44px] items-center justify-end text-sm font-medium text-primary"
        >
          Finish
        </button>
      </div>

      <div className="space-y-6 px-4 py-4">
        {exercises.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No exercises yet — add one below.
          </p>
        )}

        {exercises.map((exercise) => {
          const sessions = history[exercise.exercise_id]
          const isExpanded = expandedHistory.has(exercise.exercise_id)
          return (
            <div key={exercise.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="font-medium">{exercise.exercises?.name ?? "Unknown"}</h2>
                <button
                  onClick={() => handleRemoveExercise(exercise.id)}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {sessions?.length ? (
                <div>
                  <button
                    onClick={() => toggleHistory(exercise.exercise_id)}
                    className="flex min-h-[44px] items-center gap-1 text-xs text-muted-foreground"
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                    <span className="font-medium">
                      {isExpanded ? "History" : "Last session"}
                    </span>
                    {!isExpanded && (
                      <span className="ml-1 text-muted-foreground/70">
                        {sessions[0].sets
                          .map((s) =>
                            s.weight_kg != null ? `${s.weight_kg}kg×${s.reps}` : `BW×${s.reps}`
                          )
                          .join(", ")}
                      </span>
                    )}
                  </button>
                  {isExpanded && (
                    <div className="space-y-2 pb-1">
                      {sessions.map((s, i) => (
                        <div key={i}>
                          <p className="mb-1 text-xs font-medium text-muted-foreground">
                            {i === 0 ? "Last session" : formatShortDate(s.finished_at)}
                          </p>
                          <div className="flex flex-wrap gap-x-2 gap-y-1">
                            {s.sets.map((set) => (
                              <span
                                key={set.set_number}
                                className="rounded bg-muted px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground"
                              >
                                {set.weight_kg != null ? `${set.weight_kg}kg` : "BW"}&nbsp;×&nbsp;{set.reps}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {exercise.set_entries.length > 0 && (
                <div className="divide-y rounded-md border text-sm">
                  <div className="grid grid-cols-[2rem_1fr_1fr_2.75rem] gap-2 px-3 py-1.5 text-xs text-muted-foreground">
                    <span>Set</span>
                    <span>Weight</span>
                    <span>Reps</span>
                    <span />
                  </div>
                  {exercise.set_entries.map((set) => (
                    <div
                      key={set.id}
                      className={cn(
                        "grid grid-cols-[2rem_1fr_1fr_2.75rem] items-center gap-2 px-3 py-2",
                        set.id.startsWith("pending-") && "opacity-60"
                      )}
                    >
                      <span className="text-muted-foreground">{set.set_number}</span>
                      <span>{set.weight_kg != null ? `${set.weight_kg} kg` : "—"}</span>
                      <span>{set.reps}</span>
                      <button
                        onClick={() => handleDeleteSet(exercise.id, set.id)}
                        disabled={set.id.startsWith("pending-")}
                        className="flex min-h-[44px] w-full items-center justify-center text-muted-foreground hover:text-destructive disabled:pointer-events-none"
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
                  inputMode="decimal"
                  placeholder="kg"
                  min="0"
                  step="0.5"
                  value={getInput(exercise.id).weight}
                  onChange={(e) => updateInput(exercise.id, "weight", e.target.value)}
                  className="w-20 rounded-md border border-input bg-background px-2 py-1.5 text-center text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  type="number"
                  inputMode="numeric"
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
          )
        })}

        <Button variant="outline" className="w-full" onClick={() => setShowPicker(true)}>
          <Plus className="h-4 w-4" />
          Add Exercise
        </Button>
      </div>

      {showPicker && (
        <ExercisePicker onSelect={handleAddExercise} onClose={() => setShowPicker(false)} />
      )}

      {showFinish && (
        <div className="fixed inset-0 z-[60] flex items-end bg-background/80 backdrop-blur-sm">
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
