"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getWorkoutHistory, type HistorySummary } from "@/lib/actions/workout"

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

  return (
    <>
      <div className="divide-y rounded-md border">
        {sessions.map((session) => {
          const exerciseCount = session.session_exercises.length
          const setCount = session.session_exercises.reduce(
            (acc, se) => acc + se.set_entries.length,
            0
          )
          return (
            <Link
              key={session.id}
              href={`/history/${session.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
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
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
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
