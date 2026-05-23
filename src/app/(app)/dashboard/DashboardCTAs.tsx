"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createWorkoutSession } from "@/lib/actions/workout"

interface Props {
  activeSessionId: string | null
}

export function DashboardCTAs({ activeSessionId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function startWorkout() {
    setLoading(true)

    const result = await createWorkoutSession()
    if (result.error || !result.data) {
      toast.error(result.error ?? "Failed to start workout")
      setLoading(false)
      return
    }

    const sessionId = result.data.id
    localStorage.setItem("activeSessionId", sessionId)
    router.push(`/workout/active?session=${sessionId}`)
  }

  function continueWorkout() {
    router.push(`/workout/active?session=${activeSessionId}`)
  }

  return (
    <div className="space-y-3">
      {activeSessionId ? (
        <Button className="w-full" size="lg" onClick={continueWorkout}>
          Continue Workout
        </Button>
      ) : (
        <>
          <Button className="w-full" size="lg" onClick={startWorkout} disabled={loading}>
            {loading ? "Starting…" : "Start Workout"}
          </Button>
          <Link
            href="/templates"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}
          >
            Start from Template
          </Link>
        </>
      )}
    </div>
  )
}
