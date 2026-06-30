"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Plus, Trash2, TrendingUp, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  addSet,
  deleteSet,
  deleteSession,
  removeExerciseFromSession,
  updateSet,
  type SessionDetail,
} from "@/lib/actions/workout"
import { CustomBadge } from "@/components/CustomBadge"

type Exercise = SessionDetail["session_exercises"][number]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function formatDuration(startedAt: string, finishedAt: string) {
  const mins = Math.round(
    (new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 60000
  )
  return `${mins} min`
}

export function EditableSessionDetail({
  session,
  currentUserId,
}: {
  session: SessionDetail
  currentUserId: string | null
}) {
  const router = useRouter()
  const [exercises, setExercises] = useState<Exercise[]>(
    [...session.session_exercises].sort((a, b) => a.display_order - b.display_order)
  )
  const [addInputs, setAddInputs] = useState<Record<string, { weight: string; reps: string }>>({})
  const [addingSet, setAddingSet] = useState<Set<string>>(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const exerciseCount = exercises.length
  const totalSets = exercises.reduce((acc, ex) => acc + ex.set_entries.length, 0)

  function getAddInput(id: string) {
    return addInputs[id] ?? { weight: "", reps: "" }
  }

  function updateAddInput(id: string, field: "weight" | "reps", value: string) {
    setAddInputs((prev) => ({ ...prev, [id]: { ...getAddInput(id), [field]: value } }))
  }

  // Commit an edited weight/reps value for an existing set. Optimistic with rollback on failure.
  async function handleEditSet(
    exerciseId: string,
    setId: string,
    next: { weight_kg: number | null; reps: number }
  ) {
    if (setId.startsWith("pending-")) return

    const current = exercises
      .find((ex) => ex.id === exerciseId)
      ?.set_entries.find((s) => s.id === setId)
    if (!current) return
    const previous = { weight_kg: current.weight_kg, reps: current.reps }

    if (previous.weight_kg === next.weight_kg && previous.reps === next.reps) {
      return
    }

    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exerciseId
          ? {
              ...ex,
              set_entries: ex.set_entries.map((s) =>
                s.id === setId ? { ...s, weight_kg: next.weight_kg, reps: next.reps } : s
              ),
            }
          : ex
      )
    )

    const result = await updateSet({ setId, weightKg: next.weight_kg, reps: next.reps })
    if (result?.error) {
      setExercises((prev) =>
        prev.map((ex) =>
          ex.id === exerciseId
            ? {
                ...ex,
                set_entries: ex.set_entries.map((s) =>
                  s.id === setId ? { ...s, ...previous } : s
                ),
              }
            : ex
        )
      )
      toast.error("Couldn't save change")
    }
  }

  function handleDeleteSet(exerciseId: string, setId: string) {
    if (setId.startsWith("pending-")) return

    const exercise = exercises.find((ex) => ex.id === exerciseId)
    if (!exercise) return
    const removedIndex = exercise.set_entries.findIndex((s) => s.id === setId)
    if (removedIndex === -1) return
    const removedSet = exercise.set_entries[removedIndex]

    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exerciseId
          ? { ...ex, set_entries: ex.set_entries.filter((s) => s.id !== setId) }
          : ex
      )
    )

    const restore = () => {
      setExercises((prev) =>
        prev.map((ex) => {
          if (ex.id !== exerciseId) return ex
          const nextSets = [...ex.set_entries]
          nextSets.splice(removedIndex, 0, removedSet)
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
    const removedIndex = exercises.findIndex((ex) => ex.id === sessionExerciseId)
    if (removedIndex === -1) return
    const removedExercise = exercises[removedIndex]

    setExercises((prev) => prev.filter((ex) => ex.id !== sessionExerciseId))

    const restore = () => {
      setExercises((prev) => {
        const next = [...prev]
        next.splice(removedIndex, 0, removedExercise)
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

  async function handleAddSet(exercise: Exercise) {
    const input = getAddInput(exercise.id)
    const reps = parseInt(input.reps)
    if (!reps || reps <= 0) return
    const weightKg = input.weight !== "" ? parseFloat(input.weight) : null
    if (weightKg !== null && isNaN(weightKg)) return

    const setNumber =
      exercise.set_entries.reduce((max, s) => Math.max(max, s.set_number), 0) + 1
    const tempId = `pending-${Date.now()}`

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
    setAddInputs((prev) => ({ ...prev, [exercise.id]: { weight: "", reps: "" } }))
    setAddingSet((prev) => new Set(prev).add(exercise.id))

    const result = await addSet({
      sessionExerciseId: exercise.id,
      setNumber,
      weightKg,
      reps,
    })

    setAddingSet((prev) => {
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
      toast.error("Couldn't add set")
      return
    }

    const saved = result.data
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exercise.id
          ? {
              ...ex,
              set_entries: ex.set_entries.map((s) =>
                s.id === tempId
                  ? {
                      id: saved.id,
                      set_number: saved.set_number,
                      weight_kg: saved.weight_kg,
                      reps: saved.reps,
                    }
                  : s
              ),
            }
          : ex
      )
    )
  }

  async function handleDeleteSession() {
    setDeleting(true)
    const result = await deleteSession({ sessionId: session.id })
    if (result?.error) {
      toast.error("Couldn't delete workout")
      setDeleting(false)
      return
    }
    router.push("/history")
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <div className="space-y-1">
        <Link
          href="/history"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground -ml-1"
        >
          <ChevronLeft className="h-4 w-4" />
          History
        </Link>
        <h1 className="text-xl font-semibold">{formatDate(session.finished_at)}</h1>
        <p className="text-sm text-muted-foreground">
          {formatDuration(session.started_at, session.finished_at)}
          {" · "}
          {exerciseCount} {exerciseCount === 1 ? "exercise" : "exercises"}
        </p>
      </div>

      {exercises.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No exercises logged.</p>
      ) : (
        <div className="space-y-6">
          {exercises.map((exercise) => {
            const sets = [...exercise.set_entries].sort((a, b) => a.set_number - b.set_number)
            return (
              <div key={exercise.id} className="space-y-2">
                <div className="flex items-center gap-1">
                  <h2 className="flex min-w-0 flex-1 items-center gap-2 font-medium">
                    <span className="min-w-0 truncate">{exercise.exercises?.name ?? "Unknown"}</span>
                    {exercise.exercises?.created_by != null &&
                      exercise.exercises.created_by === currentUserId && <CustomBadge />}
                  </h2>
                  <Link
                    href={`/exercises/${exercise.exercise_id}`}
                    aria-label={`View progress for ${exercise.exercises?.name ?? "exercise"}`}
                    className="flex min-h-[44px] items-center gap-1 px-2 text-sm text-muted-foreground active:text-foreground"
                  >
                    <TrendingUp className="h-4 w-4" />
                    Progress
                  </Link>
                  <button
                    aria-label="Remove exercise"
                    onClick={() => handleRemoveExercise(exercise.id)}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {sets.length > 0 && (
                  <div className="divide-y rounded-md border text-sm">
                    <div className="grid grid-cols-[2rem_1fr_1fr_2.75rem] gap-2 px-3 py-1.5 text-xs text-muted-foreground">
                      <span>Set</span>
                      <span>Weight</span>
                      <span>Reps</span>
                      <span />
                    </div>
                    {sets.map((set) => {
                      const isPending = set.id.startsWith("pending-")
                      return (
                        <div
                          key={set.id}
                          className={cn(
                            "grid grid-cols-[2rem_1fr_1fr_2.75rem] items-center gap-2 px-3 py-2",
                            isPending && "opacity-60"
                          )}
                        >
                          <span className="text-muted-foreground">{set.set_number}</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            defaultValue={set.weight_kg != null ? String(set.weight_kg) : ""}
                            placeholder="kg"
                            disabled={isPending}
                            onFocus={(e) => e.currentTarget.select()}
                            onBlur={(e) => {
                              const raw = e.currentTarget.value.trim()
                              const weight = raw === "" ? null : parseFloat(raw)
                              if (weight !== null && (isNaN(weight) || weight < 0)) {
                                e.currentTarget.value =
                                  set.weight_kg != null ? String(set.weight_kg) : ""
                                return
                              }
                              handleEditSet(exercise.id, set.id, {
                                weight_kg: weight,
                                reps: set.reps,
                              })
                            }}
                            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                            className="w-full rounded-md border border-input bg-background px-2 py-1 text-center tabular-nums focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                          />
                          <input
                            type="text"
                            inputMode="numeric"
                            defaultValue={String(set.reps)}
                            placeholder="reps"
                            disabled={isPending}
                            onFocus={(e) => e.currentTarget.select()}
                            onBlur={(e) => {
                              const reps = parseInt(e.currentTarget.value.trim())
                              if (!reps || reps <= 0) {
                                e.currentTarget.value = String(set.reps)
                                return
                              }
                              handleEditSet(exercise.id, set.id, {
                                weight_kg: set.weight_kg,
                                reps,
                              })
                            }}
                            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                            className="w-full rounded-md border border-input bg-background px-2 py-1 text-center tabular-nums focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                          />
                          <button
                            aria-label="Delete set"
                            onClick={() => handleDeleteSet(exercise.id, set.id)}
                            disabled={isPending}
                            className="flex min-h-[44px] w-full items-center justify-center text-muted-foreground hover:text-destructive disabled:pointer-events-none"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    enterKeyHint="next"
                    placeholder="kg"
                    value={getAddInput(exercise.id).weight}
                    onChange={(e) => updateAddInput(exercise.id, "weight", e.target.value)}
                    onFocus={(e) => e.currentTarget.select()}
                    className="w-20 rounded-md border border-input bg-background px-2 py-1.5 text-center text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    enterKeyHint="done"
                    placeholder="reps"
                    value={getAddInput(exercise.id).reps}
                    onChange={(e) => updateAddInput(exercise.id, "reps", e.target.value)}
                    onFocus={(e) => e.currentTarget.select()}
                    onKeyDown={(e) => e.key === "Enter" && handleAddSet(exercise)}
                    className="w-20 rounded-md border border-input bg-background px-2 py-1.5 text-center text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddSet(exercise)}
                    disabled={!getAddInput(exercise.id).reps || addingSet.has(exercise.id)}
                  >
                    <Plus className="h-4 w-4" />
                    Add set
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="border-t pt-6">
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full text-center text-sm text-destructive/80 hover:text-destructive"
        >
          Delete this workout
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-end bg-background/80 backdrop-blur-sm">
          <div className="w-full rounded-t-xl border-t bg-background p-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Delete this workout?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  This permanently deletes the session
                  {totalSets > 0 && (
                    <>
                      {" "}and its {totalSets} logged {totalSets === 1 ? "set" : "sets"}
                    </>
                  )}
                  . This can&apos;t be undone.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                >
                  Keep
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleDeleteSession}
                  disabled={deleting}
                >
                  {deleting ? "Deleting…" : "Delete"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
