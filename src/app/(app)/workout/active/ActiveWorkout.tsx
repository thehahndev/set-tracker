"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, ChevronUp, Plus, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  addSet,
  cancelWorkout,
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
    const lastSet =
      ex.set_entries.at(-1) ?? history[ex.exercise_id]?.[0]?.sets.at(-1)
    if (!lastSet) continue
    inputs[ex.id] = {
      weight: lastSet.weight_kg != null ? String(lastSet.weight_kg) : "",
      reps: String(lastSet.reps),
    }
  }
  return inputs
}

function formatSetSummary(set: { weight_kg: number | null; reps: number }) {
  return set.weight_kg != null ? `${set.weight_kg}kg×${set.reps}` : `BW×${set.reps}`
}

export function ActiveWorkout({
  session,
  exerciseHistory,
  sourceTemplateName,
}: {
  session: WorkoutSession
  exerciseHistory: Record<string, HistorySession[]>
  sourceTemplateName: string | null
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
  // Exercises with ≥1 logged set start collapsed; newly-added exercises start expanded
  const [collapsedExercises, setCollapsedExercises] = useState<Set<string>>(
    () => new Set(session.session_exercises.filter((ex) => ex.set_entries.length > 0).map((ex) => ex.id))
  )
  const [loggingSet, setLoggingSet] = useState<Set<string>>(new Set())
  const weightInputRefs = useRef<Map<string, HTMLInputElement | null>>(new Map())
  const repsInputRefs = useRef<Map<string, HTMLInputElement | null>>(new Map())
  const removedPendingIds = useRef<Set<string>>(new Set())
  const [elapsed, setElapsed] = useState(0)
  const [showPicker, setShowPicker] = useState(false)
  const [showFinish, setShowFinish] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [finishing, setFinishing] = useState(false)
  const [cancelling, setCancelling] = useState(false)

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

  function toggleCollapse(sessionExerciseId: string) {
    setCollapsedExercises((prev) => {
      const next = new Set(prev)
      if (next.has(sessionExerciseId)) next.delete(sessionExerciseId)
      else next.add(sessionExerciseId)
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
    setSetInputs((prev) => ({ ...prev, [exercise.id]: { weight: input.weight, reps: input.reps } }))
    setLoggingSet((prev) => {
      const next = new Set(prev)
      next.add(exercise.id)
      return next
    })

    const result = await addSet({
      sessionExerciseId: exercise.id,
      setNumber,
      weightKg,
      reps,
    })

    setLoggingSet((prev) => {
      const next = new Set(prev)
      next.delete(exercise.id)
      return next
    })

    if (result.error || !result.data) {
      setExercises((prev) =>
        prev.map((ex) =>
          ex.id === exercise.id
            ? { ...ex, set_entries: ex.set_entries.filter((s) => s.id !== tempId) }
            : ex
        )
      )
      toast.error("Failed to log set — please try again")
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

  function handleDeleteSet(exerciseId: string, setId: string) {
    if (setId.startsWith("pending-")) return

    let removedSet: SessionExercise["set_entries"][number] | undefined
    let removedIndex = -1
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId) return ex
        const idx = ex.set_entries.findIndex((s) => s.id === setId)
        if (idx === -1) return ex
        removedSet = ex.set_entries[idx]
        removedIndex = idx
        return { ...ex, set_entries: ex.set_entries.filter((s) => s.id !== setId) }
      })
    )
    if (!removedSet) return

    const restore = () => {
      const setToRestore = removedSet!
      const idx = removedIndex
      setExercises((prev) =>
        prev.map((ex) => {
          if (ex.id !== exerciseId) return ex
          const nextSets = [...ex.set_entries]
          nextSets.splice(idx, 0, setToRestore)
          return { ...ex, set_entries: nextSets }
        })
      )
    }

    let undone = false
    const commit = setTimeout(async () => {
      const result = await deleteSet(setId)
      if (undone) return
      if (result?.error) {
        restore()
        toast.error("Couldn't delete set")
      }
    }, 4000)

    toast("Set deleted", {
      duration: 4000,
      action: {
        label: "Undo",
        onClick: () => {
          undone = true
          clearTimeout(commit)
          restore()
        },
      },
    })
  }

  function handleRemoveExercise(sessionExerciseId: string) {
    if (sessionExerciseId.startsWith("pending-ex-")) {
      removedPendingIds.current.add(sessionExerciseId)
    }
    let removedExercise: SessionExercise | undefined
    let removedIndex = -1
    setExercises((prev) => {
      const idx = prev.findIndex((ex) => ex.id === sessionExerciseId)
      if (idx === -1) return prev
      removedExercise = prev[idx]
      removedIndex = idx
      return prev.filter((ex) => ex.id !== sessionExerciseId)
    })
    if (!removedExercise) return

    const restore = () => {
      const exToRestore = removedExercise!
      const idx = removedIndex
      setExercises((prev) => {
        const next = [...prev]
        next.splice(idx, 0, exToRestore)
        return next
      })
    }

    let undone = false
    const commit = setTimeout(async () => {
      const result = await removeExerciseFromSession(sessionExerciseId)
      if (undone) return
      if (result?.error) {
        restore()
        toast.error("Couldn't remove exercise")
      }
    }, 4000)

    toast("Exercise removed", {
      duration: 4000,
      action: {
        label: "Undo",
        onClick: () => {
          undone = true
          clearTimeout(commit)
          restore()
        },
      },
    })
  }

  function handleAddExercise(exerciseId: string, exerciseName: string) {
    setShowPicker(false)
    const displayOrder = (exercises[exercises.length - 1]?.display_order ?? 0) + 1
    const tempId = `pending-ex-${Date.now()}`

    setExercises((prev) => [
      ...prev,
      {
        id: tempId,
        exercise_id: exerciseId,
        display_order: displayOrder,
        exercises: { name: exerciseName },
        set_entries: [],
      },
    ])

    ;(async () => {
      const [result, historyResult] = await Promise.all([
        addExerciseToSession(session.id, exerciseId, displayOrder),
        getExerciseHistory(exerciseId),
      ])

      // User removed this exercise while it was pending — honour their intent silently
      if (removedPendingIds.current.has(tempId)) {
        removedPendingIds.current.delete(tempId)
        if (!result.error && result.data) {
          // Add succeeded before the removal; clean up the row that was created
          await removeExerciseFromSession(result.data.id)
        }
        return
      }

      if (result.error || !result.data) {
        setExercises((prev) => prev.filter((ex) => ex.id !== tempId))
        toast.error("Couldn't add exercise")
        return
      }

      const newSessionExerciseId = result.data.id
      setExercises((prev) =>
        prev.map((ex) => (ex.id === tempId ? { ...ex, id: newSessionExerciseId } : ex))
      )

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
    })()
  }

  const totalSets = exercises.reduce((acc, ex) => acc + ex.set_entries.length, 0)

  async function handleFinish() {
    setFinishing(true)
    const confirmedIds = exercises
      .filter((e) => !e.id.startsWith("pending-"))
      .map((e) => e.id)
    const result = await finishWorkout(session.id, templateName || undefined, confirmedIds)
    if (result?.error) {
      toast.error(templateName ? "Couldn't save template — workout not finished" : "Couldn't finish workout")
      setFinishing(false)
      return
    }
    localStorage.removeItem("activeSessionId")
    router.push("/history")
  }

  async function handleCancel() {
    setCancelling(true)
    await cancelWorkout(session.id)
    localStorage.removeItem("activeSessionId")
    router.push("/dashboard")
  }

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-4 py-3">
        <span className="tabular-nums text-sm text-muted-foreground">{formatTime(elapsed)}</span>
        <h1 className="text-base font-semibold">Workout</h1>
        <Button variant="ghost" size="sm" onClick={() => setShowFinish(true)}>
          Finish
        </Button>
      </div>

      <div className="space-y-4 px-4 py-4 pb-20">
        {exercises.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Tap Add Exercise to get started.
          </p>
        )}

        {exercises.map((exercise) => {
          const isCollapsed = collapsedExercises.has(exercise.id)
          const sessions = history[exercise.exercise_id]
          const isHistExpanded = expandedHistory.has(exercise.exercise_id)
          const setCount = exercise.set_entries.length
          const lastSet = exercise.set_entries.at(-1)
          const lastSetSummary = lastSet ? formatSetSummary(lastSet) : null

          const isPendingExercise = exercise.id.startsWith("pending-ex-")

          return (
            <div
              key={exercise.id}
              className={cn("space-y-2", isPendingExercise && "opacity-60")}
            >
              {/* Card header — always visible */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleCollapse(exercise.id)}
                  className="flex min-h-[44px] flex-1 items-center gap-2 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <h2 className="font-medium">{exercise.exercises?.name ?? "Unknown"}</h2>
                    {isCollapsed && setCount > 0 && lastSetSummary && (
                      <p className="text-xs text-muted-foreground">
                        {setCount} {setCount === 1 ? "set" : "sets"} · {lastSetSummary}
                      </p>
                    )}
                  </div>
                  {isCollapsed ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </button>
                <button
                  onClick={() => handleRemoveExercise(exercise.id)}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Expanded content */}
              {!isCollapsed && (
                <>
                  {sessions?.length ? (
                    <div>
                      <button
                        onClick={() => toggleHistory(exercise.exercise_id)}
                        className="flex min-h-[44px] items-center gap-1 text-xs text-muted-foreground"
                      >
                        {isHistExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                        <span className="font-medium">
                          {isHistExpanded ? "History" : "Last session"}
                        </span>
                        {!isHistExpanded && (
                          <span className="ml-1 text-muted-foreground/70">
                            {sessions[0].sets.map((s) => formatSetSummary(s)).join(", ")}
                          </span>
                        )}
                      </button>
                      {isHistExpanded && (
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
                      ref={(el) => { weightInputRefs.current.set(exercise.id, el) }}
                      type="text"
                      inputMode="decimal"
                      enterKeyHint="next"
                      placeholder="kg"
                      value={getInput(exercise.id).weight}
                      onChange={(e) => updateInput(exercise.id, "weight", e.target.value)}
                      onFocus={(e) => e.currentTarget.select()}
                      onKeyDown={(e) => e.key === "Enter" && repsInputRefs.current.get(exercise.id)?.focus()}
                      className="w-20 rounded-md border border-input bg-background px-2 py-1.5 text-center text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <input
                      ref={(el) => { repsInputRefs.current.set(exercise.id, el) }}
                      type="text"
                      inputMode="numeric"
                      enterKeyHint="done"
                      placeholder="reps"
                      value={getInput(exercise.id).reps}
                      onChange={(e) => updateInput(exercise.id, "reps", e.target.value)}
                      onFocus={(e) => e.currentTarget.select()}
                      onKeyDown={(e) => e.key === "Enter" && handleAddSet(exercise)}
                      className="w-20 rounded-md border border-input bg-background px-2 py-1.5 text-center text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddSet(exercise)}
                      disabled={!getInput(exercise.id).reps || loggingSet.has(exercise.id)}
                    >
                      <Plus className="h-4 w-4" />
                      Log
                    </Button>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Fixed bottom action bar — sits above the fixed bottom nav (h-16 = bottom-16) */}
      <div className="fixed bottom-16 left-0 right-0 z-[51] border-t bg-background px-4 py-3">
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
          <div className="w-full rounded-t-xl border-t bg-background p-6">
            {showCancelConfirm ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">Cancel this workout?</h2>
                  {totalSets > 0 && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      This will permanently delete your session and {totalSets} logged{" "}
                      {totalSets === 1 ? "set" : "sets"}.
                    </p>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowCancelConfirm(false)}
                  >
                    Keep Going
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleCancel}
                    disabled={cancelling}
                  >
                    {cancelling ? "Cancelling…" : "Yes, Cancel"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">Finish Workout?</h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {exercises.length} {exercises.length === 1 ? "exercise" : "exercises"} ·{" "}
                    {totalSets} {totalSets === 1 ? "set" : "sets"}
                  </p>
                </div>
                {totalSets === 0 && (
                  <p className="text-sm text-destructive">
                    Log at least one set before finishing.
                  </p>
                )}
                {sourceTemplateName && (
                  <p className="text-sm text-muted-foreground">
                    Started from{" "}
                    <span className="font-medium text-foreground">
                      {sourceTemplateName}
                    </span>
                    {" "}— only save as a new template if you&apos;ve made changes.
                  </p>
                )}
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
                    onClick={() => { setShowFinish(false); setShowCancelConfirm(false) }}
                  >
                    Back
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleFinish}
                    disabled={finishing || totalSets === 0}
                  >
                    {finishing ? "Saving…" : "Finish"}
                  </Button>
                </div>
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="w-full pt-1 text-center text-sm text-destructive/80 hover:text-destructive"
                >
                  Cancel Workout
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
