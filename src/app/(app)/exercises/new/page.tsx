"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { createExercise } from "@/lib/actions/exercises"

const CATEGORIES = ["chest", "back", "shoulders", "biceps", "triceps", "legs", "calves", "core"]

export default function NewExercisePage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const result = await createExercise({ name: name.trim(), category: category || null })

    if (result.error) {
      toast.error(result.error)
      setLoading(false)
      return
    }

    router.push("/exercises")
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-muted-foreground hover:text-foreground"
        >
          ←
        </button>
        <h1 className="text-xl font-semibold">New Exercise</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Name</label>
          <input
            type="text"
            placeholder="e.g. Cable Fly"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Category{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">No category</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Saving…" : "Save Exercise"}
        </Button>
      </form>
    </div>
  )
}
