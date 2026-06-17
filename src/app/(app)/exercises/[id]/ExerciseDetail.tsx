"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Pencil, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"
import { ProgressChart } from "./ProgressChart"
import { CustomBadge } from "@/components/CustomBadge"
import type { ExerciseProgress, ProgressPoint } from "@/lib/actions/workout"

type Metric = "weight" | "est_1rm" | "volume"

const METRICS: { key: Metric; label: string }[] = [
  { key: "weight", label: "Top set" },
  { key: "est_1rm", label: "Est. 1RM" },
  { key: "volume", label: "Volume" },
]

function fmt(n: number) {
  return Number.isInteger(n) ? String(n) : (Math.round(n * 10) / 10).toString()
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

type Exercise = { id: string; name: string; category: string | null; created_by: string | null }

export function ExerciseDetail({
  progress,
  exercise,
  isOwner,
}: {
  progress: ExerciseProgress
  exercise: Exercise
  isOwner: boolean
}) {
  const router = useRouter()
  const [metric, setMetric] = useState<Metric>("est_1rm")
  const { exerciseName, points, prs } = progress

  const valueOf = (p: ProgressPoint) =>
    metric === "weight" ? p.top_weight : metric === "est_1rm" ? p.est_1rm : p.total_volume
  const isPrFor = (p: ProgressPoint) =>
    metric === "weight" ? p.is_weight_pr : metric === "est_1rm" ? p.is_1rm_pr : p.is_volume_pr

  const unitSuffix = metric === "volume" ? "" : " kg"

  return (
    <div className="px-4 py-6 space-y-5">
      <div className="flex items-center gap-2">
        <Link
          href="/exercises"
          aria-label="Go back"
          onClick={(e) => {
            // Go back to the actual previous screen (e.g. a history session) when there's
            // in-app history; the href is the fallback for deep links / refresh / new tab,
            // where router.back() would dead-end or leave the app.
            if (window.history.length > 1) {
              e.preventDefault()
              router.back()
            }
          }}
          className="-ml-1.5 flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground active:text-foreground"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="min-w-0 truncate text-xl font-semibold">{exerciseName}</h1>
            {exercise.created_by && <CustomBadge />}
          </div>
          {exercise.category && (
            <p className="text-xs text-muted-foreground capitalize">{exercise.category}</p>
          )}
        </div>
        {isOwner && (
          <Link
            href={`/exercises/${exercise.id}/edit`}
            aria-label="Edit exercise"
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground active:text-foreground"
          >
            <Pencil className="h-4 w-4" />
          </Link>
        )}
      </div>

      {!prs || points.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No weighted sets logged yet. Log weighted sets for this exercise to see weight, 1RM,
          and volume trends.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <PrCard label="Heaviest" value={`${fmt(prs.topWeight)} kg`} />
            <PrCard label="Best 1RM" value={`${fmt(prs.est1rm)} kg`} />
            <PrCard label="Best volume" value={fmt(prs.totalVolume)} />
          </div>

          <div className="flex rounded-md border p-0.5">
            {METRICS.map((m) => (
              <button
                key={m.key}
                onClick={() => setMetric(m.key)}
                className={cn(
                  "flex-1 rounded px-2 py-1.5 text-xs font-medium transition-colors",
                  metric === m.key
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="rounded-md border p-3">
            <ProgressChart
              points={points.map((p) => ({
                date: shortDate(p.finished_at),
                value: valueOf(p),
                isPr: isPrFor(p),
              }))}
            />
          </div>

          <div className="space-y-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Sessions
            </h2>
            <div className="divide-y rounded-md border text-sm">
              {[...points].reverse().map((p) => (
                <div key={p.session_id} className="flex items-center justify-between px-3 py-2.5">
                  <span className="text-muted-foreground">{shortDate(p.finished_at)}</span>
                  <span className="flex items-center gap-1.5 tabular-nums">
                    {isPrFor(p) && (
                      <Trophy className="h-3.5 w-3.5 text-amber-500" aria-label="Personal record" />
                    )}
                    {fmt(valueOf(p))}
                    {unitSuffix}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function PrCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-2.5 text-center">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  )
}
