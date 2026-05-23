"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { createWorkoutSession } from "@/lib/actions/workout"
import { deleteTemplate } from "@/lib/actions/templates"

export function TemplateActions({ templateId }: { templateId: string }) {
  const router = useRouter()
  const [starting, setStarting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleStart() {
    setStarting(true)
    setError(null)
    const result = await createWorkoutSession(templateId)
    if (result.error || !result.data) {
      setError(result.error ?? "Failed to start workout")
      setStarting(false)
      return
    }
    localStorage.setItem("activeSessionId", result.data.id)
    router.push(`/workout/active?session=${result.data.id}`)
  }

  async function handleDelete() {
    if (!confirm("Delete this template?")) return
    setDeleting(true)
    await deleteTemplate(templateId)
    router.push("/templates")
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button className="w-full" size="lg" onClick={handleStart} disabled={starting}>
        {starting ? "Starting…" : "Start Workout"}
      </Button>
      <Button
        variant="outline"
        className="w-full text-destructive hover:text-destructive"
        onClick={handleDelete}
        disabled={deleting}
      >
        {deleting ? "Deleting…" : "Delete Template"}
      </Button>
    </div>
  )
}
