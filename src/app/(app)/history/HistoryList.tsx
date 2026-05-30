"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { ChevronRight, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  deleteSession,
  getWorkoutHistory,
  type HistorySummary,
} from "@/lib/actions/workout"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function formatDuration(startedAt: string, finishedAt: string) {
  const mins = Math.round(
    (new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 60000
  )
  return `${mins} min`
}

export function HistoryList({
  initialSessions,
  initialNextCursor,
}: {
  initialSessions: HistorySummary[]
  initialNextCursor: string | null
}) {
  const [sessions, setSessions] = useState(initialSessions)
  const [nextCursor, setNextCursor] = useState(initialNextCursor)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function loadMore() {
    if (!nextCursor) return
    startTransition(async () => {
      const { data, nextCursor: newCursor } = await getWorkoutHistory(nextCursor)
      if (data) {
        setSessions((prev) => [...prev, ...data])
        setNextCursor(newCursor)
      }
    })
  }

  function handleDelete(sessionId: string) {
    setConfirmId(null)
    const removedIndex = sessions.findIndex((s) => s.id === sessionId)
    if (removedIndex === -1) return
    const removedSession = sessions[removedIndex]

    // Optimistic remove with a 4s undo window — the server call is deferred and cancelled on undo
    // so an undo can never race a completed delete (same pattern as the active workout).
    setSessions((prev) => prev.filter((s) => s.id !== sessionId))

    const restore = () => {
      setSessions((prev) => {
        const next = [...prev]
        next.splice(removedIndex, 0, removedSession)
        return next
      })
    }

    let undone = false
    const commit = setTimeout(async () => {
      const result = await deleteSession({ sessionId })
      if (undone) return
      if (result?.error) {
        restore()
        toast.error("Couldn't delete workout")
      }
    }, 4000)

    toast("Workout deleted", {
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

  return (
    <>
      <div className="divide-y rounded-md border">
        {sessions.map((session) => {
          const exerciseCount = session.session_exercises.length
          const setCount = session.session_exercises.reduce(
            (acc, se) => acc + se.set_entries.length,
            0
          )
          const isConfirming = confirmId === session.id
          return (
            <div
              key={session.id}
              className="flex items-center hover:bg-muted/50 transition-colors"
            >
              <Link
                href={`/history/${session.id}`}
                className="flex flex-1 items-center justify-between px-4 py-3 min-w-0"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{formatDate(session.finished_at)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDuration(session.started_at, session.finished_at)}
                    {exerciseCount > 0 && (
                      <>
                        {" · "}
                        {exerciseCount} {exerciseCount === 1 ? "exercise" : "exercises"}
                        {" · "}
                        {setCount} {setCount === 1 ? "set" : "sets"}
                      </>
                    )}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
              {isConfirming ? (
                <div className="flex items-center gap-1 pr-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmId(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(session.id)}
                  >
                    Delete
                  </Button>
                </div>
              ) : (
                <button
                  aria-label="Delete workout"
                  onClick={() => setConfirmId(session.id)}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {nextCursor && (
        <Button
          variant="outline"
          className="w-full"
          onClick={loadMore}
          disabled={isPending}
        >
          {isPending ? "Loading…" : "Load More"}
        </Button>
      )}
    </>
  )
}
